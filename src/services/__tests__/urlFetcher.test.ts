/**
 * urlFetcher 测试
 *
 * 测试 isUrl 纯函数 + fetchUrlContent（mock fetch + DOMParser）
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { fetchUrlContent, isUrl } from '../urlFetcher'

describe('urlFetcher - isUrl', () => {
  it('test_isUrl_http: http:// 开头是 URL', () => {
    expect(isUrl('http://example.com')).toBe(true)
  })

  it('test_isUrl_https: https:// 开头是 URL', () => {
    expect(isUrl('https://example.com/path?q=1')).toBe(true)
  })

  it('test_isUrl_uppercase_protocol: 大写 HTTP 也识别', () => {
    expect(isUrl('HTTP://example.com')).toBe(true)
    expect(isUrl('HTTPS://example.com')).toBe(true)
  })

  it('test_isUrl_no_protocol: 无协议不是 URL', () => {
    expect(isUrl('example.com')).toBe(false)
    expect(isUrl('just text')).toBe(false)
  })

  it('test_isUrl_empty: 空字符串不是 URL', () => {
    expect(isUrl('')).toBe(false)
  })

  it('test_isUrl_with_whitespace: 前后有空格也能识别（trim）', () => {
    expect(isUrl('  https://example.com  ')).toBe(true)
  })

  it('test_isUrl_protocol_only: 只有协议没有内容不是 URL', () => {
    expect(isUrl('http://')).toBe(false)
    expect(isUrl('https://')).toBe(false)
  })
})

describe('urlFetcher - fetchUrlContent', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('test_fetch_direct_html_success: 直接 fetch HTML 成功，提取 title + 文本', async () => {
    const html = `
      <html><head><title>测试页面</title></head>
      <body>
        <script>var x = 1;</script>
        <article>这是一段足够长的文章正文内容用于通过 50 字符门槛，确保能够被正确提取返回给调用方使用，再多写一些内容确保长度足够</article>
      </body></html>
    `
    fetchMock.mockResolvedValue({
      ok: true,
      headers: { get: () => 'text/html' },
      text: async () => html,
    })

    const result = await fetchUrlContent('https://example.com/page')
    expect(result.source).toBe('direct')
    expect(result.title).toBe('测试页面')
    expect(result.text).toContain('文章正文内容')
    // script 应被移除
    expect(result.text).not.toContain('var x = 1')
  })

  it('test_fetch_direct_json_success: 直接 fetch JSON 返回序列化字符串', async () => {
    const jsonData = { foo: 'bar', count: 42 }
    fetchMock.mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => jsonData,
    })

    const result = await fetchUrlContent('https://api.example.com/data')
    expect(result.source).toBe('direct')
    expect(result.title).toBe('https://api.example.com/data')
    expect(result.text).toContain('"foo": "bar"')
    expect(result.text).toContain('"count": 42')
  })

  it('test_fetch_direct_too_short_falls_to_proxy: 直接 fetch 文本太短降级到 proxy', async () => {
    // 第一次 direct fetch：文本太短（< 50）
    // 第二次 proxy fetch：成功
    const shortHtml = '<html><body><p>短</p></body></html>'
    const longHtml = '<html><head><title>代理页面</title></head><body><article>这是通过代理获取的足够长的页面正文内容，用于通过 50 字符门槛，确保能够被正确提取返回给调用方使用，再多写一些内容确保长度足够</article></body></html>'

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'text/html' },
        text: async () => shortHtml,
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'text/html' },
        text: async () => longHtml,
      })

    const result = await fetchUrlContent('https://example.com/short')
    expect(result.source).toBe('proxy')
    expect(result.title).toBe('代理页面')
    expect(result.text).toContain('代理获取')
  })

  it('test_fetch_direct_failure_falls_to_proxy: direct fetch 抛错降级到 proxy', async () => {
    const longHtml = '<html><head><title>代理页</title></head><body><article>代理获取的足够长正文内容用于通过长度门槛测试，确保能够被正确提取使用，再多写一些内容确保长度足够通过门槛</article></body></html>'

    fetchMock
      .mockRejectedValueOnce(new Error('CORS blocked'))
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'text/html' },
        text: async () => longHtml,
      })

    const result = await fetchUrlContent('https://example.com/cors')
    expect(result.source).toBe('proxy')
    expect(result.title).toBe('代理页')
  })

  it('test_fetch_all_fail_returns_failed: direct 和 proxy 都失败返回 failed', async () => {
    fetchMock.mockRejectedValue(new Error('Network error'))

    const result = await fetchUrlContent('https://example.com/unreachable')
    expect(result.source).toBe('failed')
    expect(result.title).toBe('')
    expect(result.text).toBe('')
    expect(result.errorMessage).toContain('CORS')
  })

  it('test_fetch_direct_not_ok_falls_to_proxy: direct 返回非 ok 降级到 proxy', async () => {
    const longHtml = '<html><head><title>代理</title></head><body><article>代理获取的足够长正文内容用于通过长度门槛测试，确保能够被正确提取使用，再多写一些内容确保长度足够通过门槛</article></body></html>'

    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: { get: () => 'text/html' },
        text: async () => 'not found',
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'text/html' },
        text: async () => longHtml,
      })

    const result = await fetchUrlContent('https://example.com/missing')
    expect(result.source).toBe('proxy')
  })

  it('test_fetch_proxy_not_ok_returns_failed: direct 失败 + proxy 也非 ok 返回 failed', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('direct fail'))
      .mockResolvedValueOnce({ ok: false, status: 502, headers: { get: () => '' }, text: async () => '' })

    const result = await fetchUrlContent('https://example.com/both-fail')
    expect(result.source).toBe('failed')
    expect(result.errorMessage).toBeDefined()
  })

  it('test_fetch_html_extract_prefers_article: 优先从 article 元素提取正文', async () => {
    const html = `
      <html><head><title>测试</title></head>
      <body>
        <div>这是 body 里的导航条内容不应该被提取，因为它不在 article 里，导航条文本不应该出现在最终结果中</div>
        <article>这是 article 里的正文，足够长以通过 50 字符门槛测试，应被优先提取使用，而不是 body 的内容，文章正文应该被正确提取出来返回给调用方</article>
      </body></html>
    `
    fetchMock.mockResolvedValue({
      ok: true,
      headers: { get: () => 'text/html' },
      text: async () => html,
    })

    const result = await fetchUrlContent('https://example.com/article')
    expect(result.source).toBe('direct')
    expect(result.text).toContain('article 里的正文')
    expect(result.text).not.toContain('body 里的导航条')
  })

  it('test_fetch_html_extracts_from_main_when_no_article: 无 article 时从 main 提取', async () => {
    const html = `
      <html><head><title>测试</title></head>
      <body>
        <div>页脚内容不应该被提取，因为页脚不在 main 元素里面，应该被排除掉不出现在最终的结果中</div>
        <main>main 元素里的正文内容，足够长以通过 50 字符门槛，应该被优先提取使用，main 元素是 HTML5 语义化标签</main>
      </body></html>
    `
    fetchMock.mockResolvedValue({
      ok: true,
      headers: { get: () => 'text/html' },
      text: async () => html,
    })

    const result = await fetchUrlContent('https://example.com/main')
    expect(result.text).toContain('main 元素里的正文')
    expect(result.text).not.toContain('页脚内容')
  })

  it('test_fetch_text_truncated_to_8000: 长文本被截断到 8000 字符以内', async () => {
    // 构造 > 8000 字符的正文
    const longText = 'A'.repeat(9000)
    const html = `<html><head><title>长文</title></head><body><article>${longText}</article></body></html>`

    fetchMock.mockResolvedValue({
      ok: true,
      headers: { get: () => 'text/html' },
      text: async () => html,
    })

    const result = await fetchUrlContent('https://example.com/long')
    expect(result.text.length).toBeLessThanOrEqual(8000)
  })
})
