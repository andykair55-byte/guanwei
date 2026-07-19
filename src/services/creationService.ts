import { callLLM } from '../stores/llmStore'
import type { SkeletonSection } from '../stores/creationStore'

export interface SkeletonInput {
  topic: string
  stance: string
  targetReader: string
  fragments?: Array<{ type: string; content: string; sourceTitle?: string }>
}

export type PresetType = 'event' | 'opinion' | 'comparison'

const SYSTEM_PROMPT = `你是一位专业的内容创作助手。根据用户提供的主题、立场、目标读者和已收集的素材碎片，生成一个结构化的写作骨架。

如果有素材碎片，请优先基于这些碎片组织文章结构，充分利用用户已收集的信息。

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
export const PRESET_TEMPLATES: Record<PresetType, (input: SkeletonInput) => { title: string; sections: SkeletonSection[] }> = {
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

// 预设模板的展示元数据（用于 UI 渲染）
export const PRESET_TEMPLATE_META: Record<PresetType, { name: string; description: string; icon: 'event' | 'opinion' | 'comparison' }> = {
  event: { name: '事件分析', description: '按事件概述—各方反应—深度分析—总结思考结构展开', icon: 'event' },
  opinion: { name: '观点论述', description: '按引入—论据—反面观点—结论结构展开', icon: 'opinion' },
  comparison: { name: '对比评测', description: '按对象介绍—维度对比—优劣分析—推荐建议结构展开', icon: 'comparison' },
}

export function getPresetTemplate(type: PresetType, input: SkeletonInput) {
  return PRESET_TEMPLATES[type](input)
}

export async function generateSkeleton(input: SkeletonInput): Promise<{ title: string; sections: SkeletonSection[] }> {
  let userPrompt = `主题：${input.topic}\n立场：${input.stance}\n目标读者：${input.targetReader || '一般读者'}`

  if (input.fragments && input.fragments.length > 0) {
    const fragSummary = input.fragments
      .map((f, i) => `[${i + 1}] (${f.type}) ${f.content}${f.sourceTitle ? ` — 来源：${f.sourceTitle}` : ''}`)
      .join('\n')
    userPrompt += `\n\n已收集的素材碎片（共${input.fragments.length}条）：\n${fragSummary}\n\n请基于以上素材组织文章结构，充分利用这些信息。`
  }

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

// ===== 声明提取（用于一键求证） =====

export interface ExtractedClaim {
  id: string
  text: string
  type: 'fact' | 'statistic' | 'quote' | 'prediction'
  confidence: number // 0-1, LLM 对该声明的确信度
}

const CLAIM_SYSTEM_PROMPT = `你是一位专业的事实核查助手。从用户提供的文本中提取需要事实核查的声明。

只提取包含具体事实、数据、引用或可验证信息的声明。不要提取观点、感受或修辞。

返回严格的 JSON 格式：
{
  "claims": [
    {
      "text": "原文中的声明句",
      "type": "fact|statistic|quote|prediction",
      "confidence": 0.8
    }
  ]
}

如果文本中没有需要核查的声明，返回 {"claims": []}。最多返回5条最关键的声明。`

export async function extractClaims(content: string): Promise<ExtractedClaim[]> {
  if (!content.trim() || content.trim().length < 20) return []

  const response = await callLLM([
    { role: 'system', content: CLAIM_SYSTEM_PROMPT },
    { role: 'user', content: content.slice(0, 3000) },
  ], { maxTokens: 1024, temperature: 0.3 })

  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return []

  try {
    const parsed = JSON.parse(jsonMatch[0])
    return (parsed.claims || []).map((c: any, i: number) => ({
      id: `claim-${Date.now()}-${i}`,
      text: c.text || '',
      type: c.type || 'fact',
      confidence: c.confidence ?? 0.5,
    }))
  } catch {
    return []
  }
}

/** 核查单条声明，返回结论文本 */
export async function verifyClaim(text: string): Promise<string> {
  const response = await callLLM([
    { role: 'system', content: '你是一位事实核查员。对以下声明进行核查，用一句话给出结论（可信/存疑/无法验证），然后用1-2句话简要说明原因。' },
    { role: 'user', content: `请核查：${text}` },
  ], { maxTokens: 200, temperature: 0.3 })
  return response.trim()
}
