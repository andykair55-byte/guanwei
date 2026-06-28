/**
 * AI 方言翻译助手
 * 辩论 arena 专用：将辩手发言中的方言/俚语/网络用语转换为标准中文
 * 双模式：Groq API（需 VITE_GROQ_API_KEY）/ 本地规则替换 fallback
 */

// ===== Groq API 翻译 =====

const SYSTEM_PROMPT = `你是一位方言/口语翻译助手。将用户发言中的方言、俚语、网络用语转换为标准中文。
规则：
1. 保留原意，不改变论点
2. 只输出翻译结果，不要解释
3. 如果原文已经是标准中文，直接输出原文
4. 简洁，不要加任何前缀标记`

async function translateWithGroq(content: string): Promise<string> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY as string
  if (!apiKey) throw new Error('No Groq API key')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content },
        ],
        temperature: 0.2,
        max_tokens: 2000,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Groq API error: ${err}`)
    }

    const data = await response.json()
    const translated = data.choices?.[0]?.message?.content?.trim()
    if (!translated) throw new Error('Empty response from Groq')

    return translated
  } finally {
    clearTimeout(timeout)
  }
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

  // 优先尝试 Groq API
  const hasGroqKey = !!import.meta.env.VITE_GROQ_API_KEY
  if (hasGroqKey) {
    try {
      const translated = await translateWithGroq(content)
      // API 返回与原文相同，视为无需翻译
      if (translated === content.trim()) return null
      return translated
    } catch (e) {
      console.warn('Groq 翻译 API 失败，降级到本地规则替换:', e)
    }
  }

  // Fallback 到本地规则替换
  return translateLocally(content)
}
