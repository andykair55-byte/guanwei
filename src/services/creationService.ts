import { callLLM } from '../stores/llmStore'
import type { SkeletonSection } from '../stores/creationStore'

export interface SkeletonInput {
  topic: string
  stance: string
  targetReader: string
}

export type PresetType = 'event' | 'opinion' | 'comparison'

const SYSTEM_PROMPT = `你是一位专业的内容创作助手。根据用户提供的主题、立场和目标读者，生成一个结构化的写作骨架。

返回严格的 JSON 格式（不要 markdown 代码块）：
{
  "title": "建议的标题",
  "sections": [
    {
      "title": "第一节标题",
      "points": ["要点1", "要点2"],
      "needsVerification": true
    }
  ]
}

needsVerification 为 true 表示该节包含需要事实核查的声明。`

// 3个预设模板（LLM不可用时的降级方案）
const PRESET_TEMPLATES: Record<PresetType, (input: SkeletonInput) => { title: string; sections: SkeletonSection[] }> = {
  event: (input) => ({
    title: `关于"${input.topic}"的事件分析`,
    sections: [
      { id: '1', title: '事件概述', points: ['时间、地点、人物', '事件起因'], needsVerification: true, accepted: false },
      { id: '2', title: '各方反应', points: ['官方回应', '网友讨论'], needsVerification: false, accepted: false },
      { id: '3', title: '深度分析', points: ['背景因素', '潜在影响'], needsVerification: true, accepted: false },
      { id: '4', title: '总结思考', points: ['个人观点', '启示'], needsVerification: false, accepted: false },
    ],
  }),
  opinion: (input) => ({
    title: `关于"${input.topic}"的观点论述`,
    sections: [
      { id: '1', title: '观点引入', points: ['话题背景', '明确立场'], needsVerification: false, accepted: false },
      { id: '2', title: '论据支撑', points: ['事实论据', '逻辑推理'], needsVerification: true, accepted: false },
      { id: '3', title: '反面观点', points: ['常见反对意见', '驳斥'], needsVerification: true, accepted: false },
      { id: '4', title: '结论', points: ['总结观点', '行动建议'], needsVerification: false, accepted: false },
    ],
  }),
  comparison: (input) => ({
    title: `关于"${input.topic}"的对比评测`,
    sections: [
      { id: '1', title: '对比对象介绍', points: ['A方特点', 'B方特点'], needsVerification: false, accepted: false },
      { id: '2', title: '维度对比', points: ['维度1对比', '维度2对比'], needsVerification: true, accepted: false },
      { id: '3', title: '优劣分析', points: ['A方优势/劣势', 'B方优势/劣势'], needsVerification: false, accepted: false },
      { id: '4', title: '推荐建议', points: ['适用场景', '最终推荐'], needsVerification: false, accepted: false },
    ],
  }),
}

export function getPresetTemplate(type: PresetType, input: SkeletonInput) {
  return PRESET_TEMPLATES[type](input)
}

export async function generateSkeleton(input: SkeletonInput): Promise<{ title: string; sections: SkeletonSection[] }> {
  const userPrompt = `主题：${input.topic}\n立场：${input.stance}\n目标读者：${input.targetReader || '一般读者'}`

  const response = await callLLM([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ], { maxTokens: 2048, temperature: 0.7 })

  // 提取JSON（兼容LLM可能返回markdown包裹的情况）
  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('LLM返回格式错误')

  const parsed = JSON.parse(jsonMatch[0])
  return {
    title: parsed.title || input.topic,
    sections: (parsed.sections || []).map((s: any, i: number) => ({
      id: String(i + 1),
      title: s.title || `第${i + 1}节`,
      points: s.points || [],
      needsVerification: s.needsVerification || false,
      accepted: false,
    })),
  }
}
