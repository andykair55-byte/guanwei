/**
 * Lightweight URL content fetcher.
 * Attempts to retrieve readable text from a URL.
 *
 * Strategy:
 *  1. Try direct fetch (works for CORS-enabled APIs / same-origin).
 *  2. If CORS blocks, try a public CORS proxy (AllOrigins).
 *  3. Extract visible text from HTML via DOMParser.
 *
 * All processing is client-side — no backend required.
 */

export interface FetchResult {
  title: string
  text: string
  source: string          // 'direct' | 'proxy' | 'failed'
  errorMessage?: string
}

/**
 * Extract visible text from an HTML document.
 */
function extractText(html: string): { title: string; text: string } {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  // Title
  const title = doc.querySelector('title')?.textContent?.trim() ?? ''

  // Remove script / style / noscript
  doc.querySelectorAll('script, style, noscript, svg, meta, link').forEach(el => el.remove())

  // Try article / main / [role=main] first for better signal-to-noise
  const main =
    doc.querySelector('article') ??
    doc.querySelector('main') ??
    doc.querySelector('[role="main"]') ??
    doc.body

  const text = (main?.textContent ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000) // cap to avoid huge payloads

  return { title, text }
}

/**
 * Fetch readable content from a URL.
 */
export async function fetchUrlContent(url: string): Promise<FetchResult> {
  // 1. Direct fetch
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      headers: { Accept: 'text/html,application/json,*/*' },
    })
    if (res.ok) {
      const ct = res.headers.get('content-type') ?? ''
      if (ct.includes('json')) {
        const json = await res.json()
        return { title: url, text: JSON.stringify(json, null, 2).slice(0, 8000), source: 'direct' }
      }
      const html = await res.text()
      const { title, text } = extractText(html)
      if (text.length > 50) return { title: title || url, text, source: 'direct' }
    }
  } catch {
    // fall through to proxy
  }

  // 2. CORS proxy (AllOrigins — free, no key)
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) })
    if (res.ok) {
      const html = await res.text()
      const { title, text } = extractText(html)
      if (text.length > 50) return { title: title || url, text, source: 'proxy' }
    }
  } catch {
    // fall through
  }

  return {
    title: '',
    text: '',
    source: 'failed',
    errorMessage: '无法抓取该页面内容（可能被 CORS 策略阻止）。请手动复制页面文字粘贴到输入框。',
  }
}

/**
 * Quick check whether a string looks like a URL.
 */
export function isUrl(text: string): boolean {
  return /^https?:\/\/\S+/i.test(text.trim())
}
