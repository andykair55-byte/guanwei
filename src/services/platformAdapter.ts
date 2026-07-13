import { callLLM } from '../stores/llmStore'
import type { CanonicalDraft } from '../types/canonicalDraft'
import { PLATFORM_TEMPLATES, type PlatformId } from '../config/platformTemplates'

export interface PlatformContent {
  platform: PlatformId
  title: string
  content: string
  wordCount: number
}

// 将Canonical Draft转换为LLM可读的上下文文本
function draftToContext(draft: CanonicalDraft): string {
  const parts: string[] = []

  parts.push(`主题：${draft.topic}`)

  if (draft.facts.length > 0) {
    parts.push('\n## 事实数据')
    draft.facts.forEach((f, i) => {
      parts.push(`${i + 1}. ${f.content}（来源：${f.source}，可信度：${f.credibility}）`)
    })
  }

  if (draft.claims.length > 0) {
    parts.push('\n## 核查结论')
    draft.claims.forEach((c, i) => {
      parts.push(`${i + 1}. [${c.status}] ${c.text}${c.evidence ? `（依据：${c.evidence}）` : ''}`)
    })
  }

  if (draft.viewpoints.length > 0) {
    parts.push('\n## 多角度观点')
    draft.viewpoints.forEach((v, i) => {
      parts.push(`${i + 1}. 【${v.stance}】${v.argument}`)
      if (v.counterArgument) parts.push(`   反驳：${v.counterArgument}`)
    })
  }

  if (draft.structure.length > 0) {
    parts.push('\n## 文章结构')
    draft.structure.forEach((s, i) => {
      parts.push(`${i + 1}. ${s.title}（${s.type}）`)
      if (s.points.length > 0) parts.push(`   要点：${s.points.join('；')}`)
    })
  }

  if (draft.references.length > 0) {
    parts.push('\n## 引用来源')
    draft.references.forEach((r, i) => {
      parts.push(`${i + 1}. ${r.title}（${r.source}）${r.url}`)
    })
  }

  return parts.join('\n')
}

// 适配到指定平台
export async function adaptToPlatform(
  draft: CanonicalDraft,
  platform: PlatformId
): Promise<PlatformContent> {
  const template = PLATFORM_TEMPLATES[platform]
  const context = draftToContext(draft)

  const response = await callLLM([
    {
      role: 'system',
      content: template.promptTemplate
    },
    {
      role: 'user',
      content: `以下是收集和分析的完整数据，请基于这些数据生成适合${template.name}平台的内容。\n\n${context}`
    }
  ], { maxTokens: Math.min(template.maxLength, 4000), temperature: 0.7 })

  // 尝试解析标题（如果LLM返回了JSON格式）
  let title = draft.topic
  let content = response

  // 检查是否是JSON格式
  const trimmed = response.trim()
  if (trimmed.startsWith('{')) {
    try {
      const cleaned = trimmed.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed = JSON.parse(cleaned)
      if (parsed.title) title = parsed.title
      if (parsed.content) content = parsed.content
    } catch {
      // 解析失败，使用原始响应
    }
  } else {
    // 尝试从第一行提取标题
    const firstLine = response.split('\n')[0]
    if (firstLine.startsWith('# ')) {
      title = firstLine.replace(/^#+\s*/, '')
      content = response.split('\n').slice(1).join('\n').trim()
    }
  }

  const wordCount = content.length

  return {
    platform,
    title,
    content,
    wordCount,
  }
}

// 批量适配到所有平台
export async function adaptToAllPlatforms(
  draft: CanonicalDraft,
  platforms?: string[]
): Promise<PlatformContent[]> {
  const targetPlatforms = (platforms as PlatformId[]) || ['guanwei', 'douyin', 'weibo', 'zhihu', 'tieba', 'xiaohongshu']
  const results = await Promise.allSettled(
    targetPlatforms.map(p => adaptToPlatform(draft, p))
  )

  return results
    .filter((r): r is PromiseFulfilledResult<PlatformContent> => r.status === 'fulfilled')
    .map(r => r.value)
}
