import { useLLMStore } from '../stores/llmStore'
import { MOCK_SEARCH_RESULTS } from '../config/mockSearchResults'

export interface SearchResult {
  title: string
  snippet: string
  source: string
  url: string
  publishedAt?: string
}

export async function search(query: string): Promise<SearchResult[]> {
  const { searchConfig } = useLLMStore.getState()

  switch (searchConfig.provider) {
    case 'mock':
      return mockSearch(query)
    case 'tavily':
      return tavilySearch(query, searchConfig.apiKey)
    case 'serpapi':
      return serpapiSearch(query, searchConfig.apiKey)
    default:
      return mockSearch(query)
  }
}

export function isMockSearch(): boolean {
  return useLLMStore.getState().searchConfig.provider === 'mock'
}

async function mockSearch(query: string): Promise<SearchResult[]> {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 500))

  const results = MOCK_SEARCH_RESULTS[query]
  if (results) {
    return results.map(r => ({
      title: r.title,
      snippet: r.snippet,
      source: r.source,
      url: r.url,
      publishedAt: r.publishedAt,
    }))
  }

  // 如果没有精确匹配，尝试模糊匹配
  const allResults = Object.values(MOCK_SEARCH_RESULTS).flat()
  const fuzzy = allResults
    .filter(r => r.title.includes(query) || r.snippet.includes(query) || query.includes(r.title))
    .slice(0, 5)

  if (fuzzy.length > 0) {
    return fuzzy.map(r => ({
      title: r.title,
      snippet: r.snippet,
      source: r.source,
      url: r.url,
      publishedAt: r.publishedAt,
    }))
  }

  // 完全没有匹配，返回通用结果
  return [
    {
      title: `关于"${query}"的搜索结果`,
      snippet: `这是模拟搜索结果。配置Tavily或SerpAPI API Key后可获取真实搜索数据。`,
      source: 'Mock Search',
      url: 'https://example.com',
    },
  ]
}

async function tavilySearch(query: string, apiKey: string): Promise<SearchResult[]> {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: 5,
      include_answer: false,
    }),
  })
  if (!res.ok) throw new Error(`Tavily搜索失败: HTTP ${res.status}`)
  const data = await res.json()
  return (data.results || []).map((r: any) => ({
    title: r.title || '',
    snippet: r.content || '',
    source: new URL(r.url || '').hostname || 'unknown',
    url: r.url || '',
    publishedAt: r.published_date,
  }))
}

async function serpapiSearch(query: string, apiKey: string): Promise<SearchResult[]> {
  const res = await fetch(`https://serpapi.com/search?q=${encodeURIComponent(query)}&api_key=${apiKey}&engine=google`)
  if (!res.ok) throw new Error(`SerpAPI搜索失败: HTTP ${res.status}`)
  const data = await res.json()
  const organic = data.organic_results || []
  return organic.slice(0, 5).map((r: any) => ({
    title: r.title || '',
    snippet: r.snippet || '',
    source: r.source || 'unknown',
    url: r.link || '',
  }))
}
