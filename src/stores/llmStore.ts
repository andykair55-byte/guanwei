import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface LLMConfig {
  apiKey: string
  baseUrl: string
  model: string
  provider: 'groq' | 'openai' | 'deepseek' | 'custom'
}

export interface SearchConfig {
  provider: 'mock' | 'tavily' | 'serpapi'
  apiKey: string
}

interface LLMStore {
  config: LLMConfig
  setConfig: (config: Partial<LLMConfig>) => void
  testConnection: () => Promise<{ success: boolean; message: string }>
  searchConfig: SearchConfig
  setSearchConfig: (config: Partial<SearchConfig>) => void
  testSearchConnection: () => Promise<{ success: boolean; message: string }>
}

const PROVIDER_DEFAULTS: Record<string, { baseUrl: string; model: string }> = {
  groq: { baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' },
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  deepseek: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  custom: { baseUrl: '', model: '' },
}

export const useLLMStore = create<LLMStore>()(
  persist(
    (set, get) => ({
      config: {
        apiKey: '',
        baseUrl: PROVIDER_DEFAULTS.groq.baseUrl,
        model: PROVIDER_DEFAULTS.groq.model,
        provider: 'groq',
      },

      searchConfig: {
        provider: 'mock' as const,
        apiKey: '',
      },

      setConfig: (partial) => {
        const current = get().config
        const next = { ...current, ...partial }
        // 切换 provider 时自动填充默认值
        if (partial.provider && partial.provider !== current.provider) {
          const defaults = PROVIDER_DEFAULTS[partial.provider]
          next.baseUrl = defaults.baseUrl
          next.model = defaults.model
        }
        set({ config: next })
      },

      testConnection: async () => {
        const { config } = get()
        if (!config.apiKey) return { success: false, message: '请先填写 API Key' }
        if (!config.baseUrl) return { success: false, message: '请填写 API 地址' }
        if (!config.model) return { success: false, message: '请填写模型名称' }

        try {
          const res = await fetch(`${config.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
              model: config.model,
              messages: [{ role: 'user', content: 'Say "OK" in one word.' }],
              max_tokens: 10,
            }),
          })

          if (!res.ok) {
            const err = await res.text()
            let msg = `HTTP ${res.status}`
            try { msg = JSON.parse(err).error?.message || msg } catch { /* ignore */ }
            return { success: false, message: msg }
          }

          const data = await res.json()
          const reply = data.choices?.[0]?.message?.content?.trim() || ''
          return { success: true, message: `连接成功！模型回复: ${reply}` }
        } catch (e) {
          return { success: false, message: `网络错误: ${e instanceof Error ? e.message : String(e)}` }
        }
      },

      setSearchConfig: (partial) => set((state) => ({
        searchConfig: { ...state.searchConfig, ...partial }
      })),

      testSearchConnection: async () => {
        const { searchConfig } = get()
        if (searchConfig.provider === 'mock') {
          return { success: true, message: '使用示例搜索数据，无需API Key' }
        }
        if (!searchConfig.apiKey) {
          return { success: false, message: '请先填写搜索API Key' }
        }
        try {
          if (searchConfig.provider === 'tavily') {
            const res = await fetch('https://api.tavily.com/search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                api_key: searchConfig.apiKey,
                query: 'test',
                max_results: 1,
              }),
            })
            if (!res.ok) return { success: false, message: `Tavily API错误: HTTP ${res.status}` }
            return { success: true, message: 'Tavily连接成功！' }
          }
          if (searchConfig.provider === 'serpapi') {
            const res = await fetch(`https://serpapi.com/search?q=test&api_key=${searchConfig.apiKey}&engine=google`)
            if (!res.ok) return { success: false, message: `SerpAPI错误: HTTP ${res.status}` }
            return { success: true, message: 'SerpAPI连接成功！' }
          }
          return { success: false, message: '未知的搜索provider' }
        } catch (e) {
          return { success: false, message: `网络错误: ${e instanceof Error ? e.message : String(e)}` }
        }
      },
    }),
    { name: 'jianwei-llm-config' }
  )
)

// 统一 LLM 调用函数，所有 service 共用
export async function callLLM(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  const { config } = useLLMStore.getState()
  if (!config.apiKey) throw new Error('未配置 LLM，请在设置中填写 API Key')

  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      max_tokens: options?.maxTokens ?? 2048,
      temperature: options?.temperature ?? 0.7,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    let msg = `LLM 请求失败: HTTP ${res.status}`
    try { msg = JSON.parse(err).error?.message || msg } catch { /* ignore */ }
    throw new Error(msg)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}
