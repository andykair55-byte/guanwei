import { mockApi } from './mockApi'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

/**
 * 读取 token 并做 JWT 过期检查（spec-19 任务 2）
 *
 * - 解析 JWT payload 第二段，检查 exp 字段
 * - 过期则清除 localStorage 并返回 null（不再用过期 token 请求后端）
 * - 非 JWT 格式（如 mock 模式下的占位 token）保持兼容，原样返回
 *
 * 注意：localStorage 仍可被 XSS 读取，本方案仅降低过期 token 被滥用的风险；
 * 真正的 XSS 防护依赖任务 3 的 rehype-sanitize。
 */
export function getToken(): string | null {
  const token = localStorage.getItem('token')
  if (!token) return null
  try {
    // JWT 格式：header.payload.signature，取 payload 解析 exp
    const parts = token.split('.')
    if (parts.length !== 3) return token // 非 JWT 格式，保持兼容
    const payload = JSON.parse(atob(parts[1]))
    if (payload?.exp && Date.now() >= payload.exp * 1000) {
      localStorage.removeItem('token')
      return null
    }
    return token
  } catch {
    // 解析失败（非 JWT 或 base64 损坏），保持兼容返回原 token
    return token
  }
}

// 后端是否可用：未配置 API 地址时直接走 mock，不做探测
let backendAvailable: boolean | null = import.meta.env.VITE_API_BASE_URL ? null : false

// ---------- 全局 loading 事件 ----------
type LoadingListener = (isLoading: boolean) => void
const loadingListeners: Set<LoadingListener> = new Set()

export function onLoadingChange(listener: LoadingListener) {
  loadingListeners.add(listener)
  return () => loadingListeners.delete(listener)
}

function setLoading(isLoading: boolean) {
  loadingListeners.forEach(l => l(isLoading))
}

// 统一错误响应格式
interface ApiError {
  code: number
  message: string
  details?: string
}

// 自定义 API 错误类
export class ApiErrorClass extends Error {
  code: number
  details?: string

  constructor(error: ApiError) {
    super(error.message)
    this.code = error.code
    this.details = error.details
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, options: RequestInit = {}, timeout = 2000): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }

  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  setLoading(true)
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
      signal: AbortSignal.timeout(timeout),
    })

    if (!response.ok) {
      // 处理统一错误格式
      const error: ApiError = await response.json().catch(() => ({
        code: response.status,
        message: `请求失败: ${response.status}`,
      }))
      throw new ApiErrorClass(error)
    }

    return response.json()
  } finally {
    setLoading(false)
  }
}

/**
 * 带 mock fallback 的请求包装器
 * 先尝试真实后端，网络失败时自动切换到 mock
 * - 业务错误（4xx 除 401/429）不降级，直接抛出
 * - 网络错误 / 5xx / 401（未授权） / 429（限流）降级到 mock
 */
async function withFallback<T>(
  realCall: () => Promise<T>,
  mockCall: () => Promise<T>,
): Promise<T> {
  // 已确认后端可用，直接走真实请求
  if (backendAvailable === true) {
    try {
      return await realCall()
    } catch (e) {
      // 业务错误（4xx 除 401/429）不降级，直接抛
      if (e instanceof ApiErrorClass && e.code >= 400 && e.code < 500 && e.code !== 401 && e.code !== 429) {
        throw e
      }
      // 网络错误 / 5xx / 401 / 429 降级到 mock
      backendAvailable = false
      return mockCall()
    }
  }

  // 已确认后端不可用，直接走 mock
  if (backendAvailable === false) {
    return mockCall()
  }

  // 首次探测（仅在配置了 VITE_API_BASE_URL 时发生）
  try {
    const result = await realCall()
    backendAvailable = true
    return result
  } catch (e) {
    // 业务错误不降级，直接抛（首次探测也保持业务错误可见）
    if (e instanceof ApiErrorClass && e.code >= 400 && e.code < 500 && e.code !== 401 && e.code !== 429) {
      throw e
    }
    backendAvailable = false
    return mockCall()
  }
}

export const api = {
  login: (username: string, password: string) =>
    withFallback(
      () => request('/users/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      }),
      () => mockApi.login(username, password),
    ),

  register: (username: string, nickname: string, password: string) =>
    withFallback(
      () => request('/users/register', {
        method: 'POST',
        body: JSON.stringify({ username, nickname, password })
      }),
      () => mockApi.register(username, nickname, password),
    ),

  getMe: () =>
    withFallback(
      () => request('/users/me'),
      () => mockApi.getMe(),
    ),

  getMyStats: () =>
    withFallback(
      () => request('/users/me/stats'),
      () => mockApi.getMyStats(),
    ),

  getMyPoints: (skip = 0, limit = 20) =>
    withFallback(
      () => request(`/users/me/points?skip=${skip}&limit=${limit}`),
      () => mockApi.getMyPoints(),
    ),

  dailyLogin: () =>
    withFallback(
      () => request('/users/me/daily-login', { method: 'POST' }),
      () => mockApi.dailyLogin(),
    ),

  getMelons: (category?: string, status?: string, skip = 0, limit = 20) => {
    const params = new URLSearchParams()
    if (category && category !== '全部') params.set('category', category)
    if (status) params.set('status', status)
    params.set('skip', String(skip))
    params.set('limit', String(limit))
    return withFallback(
      () => request(`/melons?${params.toString()}`),
      () => mockApi.getMelons(category, status, skip, limit),
    )
  },

  getMelon: (id: number) =>
    withFallback(
      () => request(`/melons/${id}`),
      () => mockApi.getMelon(id),
    ),

  submitGuess: (melonId: number, choice: boolean, evidenceContent?: string, requestId?: string) =>
    withFallback(
      () => request(`/melons/${melonId}/guess`, {
        method: 'POST',
        body: JSON.stringify({ melon_id: melonId, choice, evidence_content: evidenceContent, request_id: requestId })
      }),
      () => mockApi.submitGuess(melonId, choice, evidenceContent, requestId),
    ),

  revealMelon: (melonId: number, result: boolean) =>
    withFallback(
      () => request(`/admin/melons/${melonId}/reveal`, {
        method: 'PUT',
        body: JSON.stringify({ result })
      }),
      () => mockApi.revealMelon(melonId, result),
    ),

  getMyGuess: (melonId: number) =>
    withFallback(
      () => request(`/melons/${melonId}/my-guess`),
      () => mockApi.getMyGuess(melonId),
    ),

  getEvidences: (melonId: number) =>
    withFallback(
      () => request(`/melons/${melonId}/evidences`),
      () => mockApi.getEvidences(melonId),
    ),

  upvoteEvidence: (evidenceId: number) =>
    withFallback(
      () => request(`/melons/evidences/${evidenceId}/upvote`, { method: 'POST' }),
      () => mockApi.upvoteEvidence(evidenceId),
    ),

  downvoteEvidence: (evidenceId: number) =>
    withFallback(
      () => request(`/melons/evidences/${evidenceId}/downvote`, { method: 'POST' }),
      () => mockApi.downvoteEvidence(evidenceId),
    ),

  getReport: (melonId: number) =>
    withFallback(
      () => request(`/melons/${melonId}/report`),
      () => mockApi.getReport(melonId),
    ),

  createMelon: (data: { title: string; description: string; category: string; cover_image?: string }) =>
    withFallback(
      () => request('/melons', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
      () => mockApi.createMelon(data),
    ),

  verify: (content: string, type = 'text') =>
    withFallback(
      () => request('/verify', {
        method: 'POST',
        body: JSON.stringify({ content, type })
      }, 15000),
      () => mockApi.verify(content, type),
    ),

  moderate: (text: string) =>
    withFallback(
      () => request('/moderate', {
        method: 'POST',
        body: JSON.stringify({ text })
      }, 15000),
      () => mockApi.moderate(text),
    ),

  getProviders: () =>
    withFallback(
      () => request('/models/providers', {}, 15000),
      () => mockApi.getProviders(),
    ),

  setProvider: (provider: string) =>
    withFallback(
      () => request('/models/set-provider', {
        method: 'POST',
        body: JSON.stringify({ provider })
      }, 15000),
      () => mockApi.setProvider(provider),
    ),

  likeMelon: (melonId: number) =>
    withFallback(
      () => request(`/melons/${melonId}/like`, { method: 'POST' }),
      () => mockApi.likeMelon(melonId),
    ),

  getComments: (melonId: number, skip = 0, limit = 20) =>
    withFallback(
      () => request(`/melons/${melonId}/comments?skip=${skip}&limit=${limit}`),
      () => mockApi.getComments(melonId, skip, limit),
    ),

  postComment: (melonId: number, content: string, parentId: number | null = null, replyToUser = '') =>
    withFallback(
      () => request(`/melons/${melonId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content, parent_id: parentId, reply_to_user: replyToUser })
      }),
      () => mockApi.postComment(melonId, content, parentId, replyToUser),
    ),

  likeComment: (commentId: number) =>
    withFallback(
      () => request(`/comments/${commentId}/like`, { method: 'POST' }),
      () => mockApi.likeComment(commentId),
    ),

  // spec-19: LLM 连接测试走后端代理，避免浏览器直接 fetch 第三方 API 触发 CORS。
  // 不走 withFallback —— 测试连接需要看到真实错误，mock 没有意义。
  testLLMConnection: (payload: {
    provider: string
    api_key: string
    base_url?: string
    model?: string
  }) =>
    request<{ success: boolean; model?: string; error?: string }>(
      '/admin/llm/test-connection',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      15000, // LLM 测试可能慢，15 秒超时（后端 httpx 10s + 网络/排队余量）
    ),
}
