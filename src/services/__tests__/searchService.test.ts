/**
 * searchService 测试
 *
 * searchService 依赖 useLLMStore.getState().searchConfig.provider，
 * 通过直接修改 store 状态切换 mock/tavily/serpapi 分支。
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { search, isMockSearch } from '../searchService'
import { useLLMStore } from '../../stores/llmStore'

describe('searchService', () => {
  beforeEach(() => {
    // 重置 searchConfig 为 mock
    useLLMStore.setState({
      config: {
        apiKey: '',
        baseUrl: 'https://api.groq.com/openai/v1',
        model: 'llama-3.3-70b-versatile',
        provider: 'groq',
      },
      searchConfig: {
        provider: 'mock',
        apiKey: '',
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('isMockSearch', () => {
    it('test_isMockSearch_true_when_provider_mock: provider=mock 返回 true', () => {
      useLLMStore.getState().setSearchConfig({ provider: 'mock' })
      expect(isMockSearch()).toBe(true)
    })

    it('test_isMockSearch_false_when_provider_tavily: provider=tavily 返回 false', () => {
      useLLMStore.getState().setSearchConfig({ provider: 'tavily', apiKey: 'k' })
      expect(isMockSearch()).toBe(false)
    })
  })

  describe('search - mock provider', () => {
    it('test_mock_search_returns_results_for_known_query: 已知查询返回精确匹配', async () => {
      // mockSearch 内部使用 setTimeout(500)，用 fake timers 加速
      const results = await search('AI换脸诈骗')
      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBeGreaterThan(0)
      // 每条结果都有必需字段
      for (const r of results) {
        expect(typeof r.title).toBe('string')
        expect(typeof r.snippet).toBe('string')
        expect(typeof r.source).toBe('string')
        expect(typeof r.url).toBe('string')
      }
    })

    it('test_mock_search_unknown_query_returns_generic_result: 未知查询返回通用结果', async () => {
      const results = await search('一个完全不存在的奇怪查询关键词xyz')
      expect(results).toHaveLength(1)
      expect(results[0].source).toBe('Mock Search')
      expect(results[0].title).toContain('一个完全不存在的奇怪查询关键词xyz')
    })

    it('test_mock_search_result_has_correct_shape: 返回结果字段类型正确', async () => {
      const results = await search('AI换脸诈骗')
      const r = results[0]
      expect(r).toHaveProperty('title')
      expect(r).toHaveProperty('snippet')
      expect(r).toHaveProperty('source')
      expect(r).toHaveProperty('url')
      // publishedAt 是可选字段
      expect(r.publishedAt === undefined || typeof r.publishedAt === 'string').toBe(true)
    })
  })

  describe('search - tavily provider', () => {
    it('test_tavily_success: fetch ok 返回解析后的结果', async () => {
      useLLMStore.getState().setSearchConfig({ provider: 'tavily', apiKey: 'tv-key' })
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            { title: 'T1', content: 'C1', url: 'https://example.com/page1', published_date: '2024-01-01' },
            { title: 'T2', content: 'C2', url: 'https://example.com/page2' },
          ],
        }),
      }))

      const results = await search('test query')
      expect(results).toHaveLength(2)
      expect(results[0].title).toBe('T1')
      expect(results[0].snippet).toBe('C1')
      expect(results[0].url).toBe('https://example.com/page1')
      expect(results[0].source).toBe('example.com')
      expect(results[0].publishedAt).toBe('2024-01-01')
      expect(results[1].publishedAt).toBeUndefined()
    })

    it('test_tavily_http_error_throws: fetch !ok 抛错', async () => {
      useLLMStore.getState().setSearchConfig({ provider: 'tavily', apiKey: 'tv-key' })
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))

      await expect(search('q')).rejects.toThrow(/Tavily搜索失败.*401/)
    })
  })

  describe('search - serpapi provider', () => {
    it('test_serpapi_success: fetch ok 返回 organic_results 前 5 条', async () => {
      useLLMStore.getState().setSearchConfig({ provider: 'serpapi', apiKey: 'serp-key' })
      // 构造 8 条数据，验证只取前 5
      const organic = Array.from({ length: 8 }, (_, i) => ({
        title: `T${i}`,
        snippet: `S${i}`,
        source: 'src',
        link: `https://example.com/${i}`,
      }))
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ organic_results: organic }),
      }))

      const results = await search('test')
      expect(results).toHaveLength(5)
      expect(results[0].title).toBe('T0')
      expect(results[4].title).toBe('T4')
      expect(results[0].url).toBe('https://example.com/0')
    })

    it('test_serpapi_http_error_throws: fetch !ok 抛错', async () => {
      useLLMStore.getState().setSearchConfig({ provider: 'serpapi', apiKey: 'serp-key' })
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))

      await expect(search('q')).rejects.toThrow(/SerpAPI搜索失败.*500/)
    })

    it('test_serpapi_empty_organic: 没有 organic_results 返回空数组', async () => {
      useLLMStore.getState().setSearchConfig({ provider: 'serpapi', apiKey: 'serp-key' })
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      }))

      const results = await search('q')
      expect(results).toEqual([])
    })
  })
})
