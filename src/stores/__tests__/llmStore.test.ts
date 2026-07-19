/**
 * llmStore 测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock api 模块（llmStore.testConnection 调 api.testLLMConnection）
vi.mock('../../services/api', () => ({
  api: {
    testLLMConnection: vi.fn(),
  },
}))

import { useLLMStore, callLLM } from '../llmStore'
import { api } from '../../services/api'

describe('llmStore', () => {
  beforeEach(() => {
    localStorage.clear()
    // 重置为初始 state
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
    vi.clearAllMocks()
  })

  it('test_initial_state: 初始 config 默认 groq provider', () => {
    const { config, searchConfig } = useLLMStore.getState()
    expect(config.provider).toBe('groq')
    expect(config.apiKey).toBe('')
    expect(config.baseUrl).toBe('https://api.groq.com/openai/v1')
    expect(config.model).toBe('llama-3.3-70b-versatile')
    expect(searchConfig.provider).toBe('mock')
    expect(searchConfig.apiKey).toBe('')
  })

  it('test_setConfig_merges_partial: 只传 apiKey 时其他字段保持', () => {
    useLLMStore.getState().setConfig({ apiKey: 'sk-test-key' })
    const { config } = useLLMStore.getState()
    expect(config.apiKey).toBe('sk-test-key')
    // 其他字段保持
    expect(config.provider).toBe('groq')
    expect(config.baseUrl).toBe('https://api.groq.com/openai/v1')
  })

  it('test_setConfig_switch_provider_fills_defaults: 切换到 openai 自动填充默认值', () => {
    useLLMStore.getState().setConfig({ provider: 'openai' })
    const { config } = useLLMStore.getState()
    expect(config.provider).toBe('openai')
    expect(config.baseUrl).toBe('https://api.openai.com/v1')
    expect(config.model).toBe('gpt-4o-mini')
  })

  it('test_setConfig_switch_to_deepseek: 切换到 deepseek 填充默认值', () => {
    useLLMStore.getState().setConfig({ provider: 'deepseek' })
    const { config } = useLLMStore.getState()
    expect(config.provider).toBe('deepseek')
    expect(config.baseUrl).toBe('https://api.deepseek.com/v1')
    expect(config.model).toBe('deepseek-chat')
  })

  it('test_setConfig_switch_to_custom: custom provider 默认空字符串', () => {
    useLLMStore.getState().setConfig({ provider: 'custom' })
    const { config } = useLLMStore.getState()
    expect(config.provider).toBe('custom')
    expect(config.baseUrl).toBe('')
    expect(config.model).toBe('')
  })

  it('test_testConnection_no_apiKey: 缺 apiKey 返回失败', async () => {
    const result = await useLLMStore.getState().testConnection()
    expect(result.success).toBe(false)
    expect(result.message).toContain('API Key')
    // api.testLLMConnection 不应被调用
    expect(api.testLLMConnection).not.toHaveBeenCalled()
  })

  it('test_testConnection_success: api 返回 success=true 时透传成功消息', async () => {
    useLLMStore.getState().setConfig({ apiKey: 'sk-valid' })
    vi.mocked(api.testLLMConnection).mockResolvedValue({
      success: true,
      model: 'gpt-4o-mini',
    })

    const result = await useLLMStore.getState().testConnection()

    expect(api.testLLMConnection).toHaveBeenCalledWith({
      provider: 'groq',
      api_key: 'sk-valid',
      base_url: 'https://api.groq.com/openai/v1',
      model: 'llama-3.3-70b-versatile',
    })
    expect(result.success).toBe(true)
    expect(result.message).toContain('gpt-4o-mini')
  })

  it('test_testConnection_api_returns_failure: api 返回 success=false 时透传错误', async () => {
    useLLMStore.getState().setConfig({ apiKey: 'sk-bad' })
    vi.mocked(api.testLLMConnection).mockResolvedValue({
      success: false,
      error: 'Invalid API Key',
    })

    const result = await useLLMStore.getState().testConnection()
    expect(result.success).toBe(false)
    expect(result.message).toBe('Invalid API Key')
  })

  it('test_testConnection_api_throws: api 抛错时返回请求失败消息', async () => {
    useLLMStore.getState().setConfig({ apiKey: 'sk-err' })
    vi.mocked(api.testLLMConnection).mockRejectedValue(new Error('Network timeout'))

    const result = await useLLMStore.getState().testConnection()
    expect(result.success).toBe(false)
    expect(result.message).toContain('Network timeout')
  })

  it('test_setSearchConfig_merges_partial: 合并 searchConfig', () => {
    useLLMStore.getState().setSearchConfig({ apiKey: 'tavily-key' })
    expect(useLLMStore.getState().searchConfig.apiKey).toBe('tavily-key')
    expect(useLLMStore.getState().searchConfig.provider).toBe('mock')
  })

  it('test_testSearchConnection_mock_provider: mock 直接成功', async () => {
    const result = await useLLMStore.getState().testSearchConnection()
    expect(result.success).toBe(true)
    expect(result.message).toContain('示例')
  })

  it('test_testSearchConnection_non_mock_no_key: 缺 apiKey 返回失败', async () => {
    useLLMStore.getState().setSearchConfig({ provider: 'tavily' })
    const result = await useLLMStore.getState().testSearchConnection()
    expect(result.success).toBe(false)
    expect(result.message).toContain('API Key')
  })

  it('test_testSearchConnection_tavily_success: tavily 返回 200 时成功', async () => {
    useLLMStore.getState().setSearchConfig({ provider: 'tavily', apiKey: 'tv-key' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }))

    const result = await useLLMStore.getState().testSearchConnection()
    expect(result.success).toBe(true)
    expect(result.message).toContain('Tavily')

    vi.unstubAllGlobals()
  })

  it('test_testSearchConnection_serpapi_failure: serpapi 返回非 200 时失败', async () => {
    useLLMStore.getState().setSearchConfig({ provider: 'serpapi', apiKey: 'serp-key' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))

    const result = await useLLMStore.getState().testSearchConnection()
    expect(result.success).toBe(false)
    expect(result.message).toContain('401')

    vi.unstubAllGlobals()
  })

  it('test_callLLM_no_apiKey_throws: 未配置 apiKey 抛错', async () => {
    await expect(callLLM([{ role: 'user', content: 'hi' }])).rejects.toThrow('未配置 LLM')
  })

  it('test_callLLM_success: 正常请求返回内容', async () => {
    useLLMStore.getState().setConfig({ apiKey: 'sk-call' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'LLM reply' } }] }),
    }))

    const result = await callLLM([{ role: 'user', content: 'hi' }], { maxTokens: 100, temperature: 0.5 })
    expect(result).toBe('LLM reply')

    // 验证 fetch 调用参数
    const fetchCall = vi.mocked(fetch).mock.calls[0]
    expect(fetchCall[1]?.method).toBe('POST')
    const body = JSON.parse(fetchCall[1]?.body as string)
    expect(body.max_tokens).toBe(100)
    expect(body.temperature).toBe(0.5)
    expect(body.messages[0].content).toBe('hi')

    vi.unstubAllGlobals()
  })

  it('test_callLLM_http_error: 非 200 抛错并尝试解析错误消息', async () => {
    useLLMStore.getState().setConfig({ apiKey: 'sk-err' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ error: { message: 'Unauthorized' } }),
    }))

    await expect(callLLM([{ role: 'user', content: 'hi' }])).rejects.toThrow('Unauthorized')

    vi.unstubAllGlobals()
  })
})
