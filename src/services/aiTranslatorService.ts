import { callLLM } from '../stores/llmStore'

/**
 * AI 方言翻译助手
 * 辩论 arena 专用：将辩手发言中的方言/俚语/网络用语转换为标准中文
 * 双模式：LLM API（需配置 API Key）/ 本地规则替换 fallback
 */

// ===== LLM API 翻译 =====

const SYSTEM_PROMPT = `你是一位方言/口语翻译助手。将用户发言中的方言、俚语、网络用语转换为标准中文。
规则：
1. 保留原意，不改变论点
2. 只输出翻译结果，不要解释
3. 如果原文已经是标准中文，直接输出原文
4. 简洁，不要加任何前缀标记`

async function translateWithLLM(content: string): Promise<string> {
  const translated = (await callLLM(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content },
    ],
    { maxTokens: 2000, temperature: 0.2 }
  )).trim()

  if (!translated) throw new Error('Empty response from LLM')

  return translated
}

// ===== 本地规则替换 fallback =====

const DIALECT_PATTERNS: [RegExp, string][] = [
  [/整/g, '做/搞'],
  [/咋/g, '怎么'],
  [/唠/g, '说/聊'],
  [/得劲/g, '舒服/满意'],
  [/老铁/g, '朋友'],
  [/666/g, '很厉害'],
  [/yyds/g, '最好的'],
  [/绝绝子/g, '非常好'],
]

function translateLocally(content: string): string | null {
  let result = content
  let matched = false

  for (const [pattern, replacement] of DIALECT_PATTERNS) {
    if (pattern.test(result)) {
      result = result.replace(pattern, replacement)
      matched = true
    }
  }

  return matched ? result : null
}

// ===== 统一入口 =====

/**
 * 将辩手发言中的方言/俚语/网络用语翻译为标准中文。
 * @returns 翻译后的文本（如果需要翻译），null 表示原文已是标准中文无需翻译
 */
export async function translateSpeech(content: string): Promise<string | null> {
  if (!content || !content.trim()) return null

  // 优先尝试 LLM API
  try {
    const translated = await translateWithLLM(content)
    // API 返回与原文相同，视为无需翻译
    if (translated === content.trim()) return null
    return translated
  } catch (e) {
    console.warn('LLM 翻译失败，降级到本地规则替换:', e)
  }

  // Fallback 到本地规则替换
  return translateLocally(content)
}
