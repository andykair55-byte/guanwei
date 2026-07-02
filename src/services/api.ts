import { mockApi } from './mockApi'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const getToken = (): string | null => localStorage.getItem('token')

// 后端是否可用：未配置 API 地址时直接走 mock，不做探测
let backendAvailable: boolean | null = import.meta.env.VITE_API_BASE_URL ? null : false

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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }

  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    signal: AbortSignal.timeout(2000), // 2秒超时
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
}

/**
 * 带 mock fallback 的请求包装器
 * 先尝试真实后端，网络失败时自动切换到 mock
 */
async function withFallback<T>(
  realCall: () => Promise<T>,
  mockCall: () => Promise<T>,
): Promise<T> {
  // 已确认后端可用，直接走真实请求
  if (backendAvailable === true) {
    try {
      return await realCall()
    } catch {
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
  } catch {
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

  submitGuess: (melonId: number, choice: boolean, evidenceContent?: string) =>
    withFallback(
      () => request(`/melons/${melonId}/guess`, {
        method: 'POST',
        body: JSON.stringify({ melon_id: melonId, choice, evidence_content: evidenceContent })
      }),
      () => mockApi.submitGuess(melonId, choice, evidenceContent),
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
      }),
      () => mockApi.verify(content, type),
    ),

  moderate: (text: string) =>
    withFallback(
      () => request('/moderate', {
        method: 'POST',
        body: JSON.stringify({ text })
      }),
      () => mockApi.moderate(text),
    ),

  getProviders: () =>
    withFallback(
      () => request('/models/providers'),
      () => mockApi.getProviders(),
    ),

  setProvider: (provider: string) =>
    withFallback(
      () => request('/models/set-provider', {
        method: 'POST',
        body: JSON.stringify({ provider })
      }),
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
}
