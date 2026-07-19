/**
 * api.ts 服务层测试
 * 测试 withFallback 三种情况 + request 的 auth header + timeout
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('api service', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    localStorage.clear()
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('test_withFallback_backend_unavailable: 无 BASE_URL 时直接走 mock', async () => {
    // 显式置空 VITE_API_BASE_URL → backendAvailable = false → 直接走 mockApi
    vi.stubEnv('VITE_API_BASE_URL', '')

    const { api } = await import('../api')
    const result = await api.getMe()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(result).toBeDefined()
    expect(result.id).toBe(1)
    expect(result.nickname).toBe('见微侦探')
  })

  it('test_withFallback_real_success: realCall 成功，返回真实数据', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://test-api')

    const realUserData = {
      id: 42,
      username: 'testuser',
      nickname: '真实用户',
      avatar: 'https://example.com/avatar.png',
      points: 500,
      rank: '鉴瓜学徒',
      total_guesses: 20,
      correct_guesses: 8,
      created_at: '2024-06-01T00:00:00Z',
    }

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => realUserData,
    })

    const { api } = await import('../api')
    const result = await api.getMe()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      'http://test-api/users/me',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    )
    expect(result).toEqual(realUserData)
  })

  it('test_withFallback_real_failure_fallback_mock: realCall 失败，降级 mock', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://test-api')

    fetchMock.mockRejectedValue(new Error('Network error'))

    const { api } = await import('../api')
    const result = await api.getMe()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result).toBeDefined()
    expect(result.id).toBe(1)
    expect(result.nickname).toBe('见微侦探')
  })

  it('test_withFallback_backend_unavailable_uses_mock_for_login', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')

    const { api } = await import('../api')
    const result = await api.login('demo', 'demo')

    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.access_token).toBeDefined()
    expect(result.user).toBeDefined()
    expect(result.user.id).toBe(1)
  })

  it('test_request_adds_auth_header: localStorage 有 token 时请求头含 Authorization', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://test-api')
    localStorage.setItem('token', 'my-auth-token-123')

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1 }),
    })

    const { api } = await import('../api')
    await api.getMe()

    expect(fetchMock).toHaveBeenCalledWith(
      'http://test-api/users/me',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer my-auth-token-123',
          'Content-Type': 'application/json',
        }),
      })
    )
  })

  it('test_request_no_auth_header: 无 token 时请求头无 Authorization', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://test-api')

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1 }),
    })

    const { api } = await import('../api')
    await api.getMe()

    const callArgs = fetchMock.mock.calls[0]
    const headers = callArgs[1].headers
    expect(headers.Authorization).toBeUndefined()
    expect(headers['Content-Type']).toBe('application/json')
  })

  it('test_request_timeout: 2 秒超时后降级 mock', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://test-api')

    // 模拟 AbortSignal.timeout 返回已 abort 的 signal
    const controller = new AbortController()
    controller.abort()
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal)

    // fetch mock：signal 已 abort 时立即 reject
    fetchMock.mockImplementation((_url: string, options: RequestInit) => {
      return new Promise((_resolve, reject) => {
        const signal = options.signal
        if (signal?.aborted) {
          reject(new DOMException('The operation was aborted', 'AbortError'))
        } else if (signal) {
          signal.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted', 'AbortError'))
          })
        }
      })
    })

    const { api } = await import('../api')
    const result = await api.getMe()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result).toBeDefined()
    expect(result.id).toBe(1)
  }, 10000)

  it('test_request_http_error_throws: 非 ok 响应抛出 ApiErrorClass 后降级', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://test-api')

    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ code: 401, message: '未授权' }),
    })

    const { api, ApiErrorClass } = await import('../api')

    const result = await api.getMe()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.id).toBe(1)
    expect(ApiErrorClass).toBeDefined()
  })

  // ===== withFallback 分支补全：backendAvailable=true 时的各种错误码 =====

  it('test_withFallback_backend_ok_then_422_throws: 后端可用时 422 业务错误不降级直接抛', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://test-api')

    // 第一次成功 → backendAvailable = true
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 42, username: 'u', nickname: 'n', avatar: 'a', points: 0, rank: 'r', total_guesses: 0, correct_guesses: 0, created_at: '2024-01-01' }),
    })
    // 第二次 422 业务错误
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ code: 422, message: '参数校验失败' }),
    })

    const { api, ApiErrorClass } = await import('../api')
    await api.getMe()  // 第一次成功

    // 第二次应抛 ApiErrorClass（422 是业务错误，不降级）
    await expect(api.getMe()).rejects.toThrow()
    try {
      await api.getMe()
    } catch (e) {
      expect(e).toBeInstanceOf(ApiErrorClass)
      expect((e as any).code).toBe(422)
    }
  })

  it('test_withFallback_backend_ok_then_401_fallback: 后端可用时 401 降级到 mock', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://test-api')

    // 第一次成功
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 42, username: 'u', nickname: 'n', avatar: 'a', points: 0, rank: 'r', total_guesses: 0, correct_guesses: 0, created_at: '2024-01-01' }),
    })
    // 第二次 401
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ code: 401, message: '未授权' }),
    })

    const { api } = await import('../api')
    await api.getMe()

    // 第二次 401 应降级到 mock（返回 mock 数据）
    const result = await api.getMe()
    expect(result.id).toBe(1)
    expect(result.nickname).toBe('见微侦探')
  })

  it('test_withFallback_backend_ok_then_429_fallback: 后端可用时 429 限流降级到 mock', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://test-api')

    // 第一次成功
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 42, username: 'u', nickname: 'n', avatar: 'a', points: 0, rank: 'r', total_guesses: 0, correct_guesses: 0, created_at: '2024-01-01' }),
    })
    // 第二次 429
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ code: 429, message: '请求过于频繁' }),
    })

    const { api } = await import('../api')
    await api.getMe()

    const result = await api.getMe()
    expect(result.id).toBe(1)  // mock 数据
  })

  it('test_withFallback_backend_ok_then_500_fallback: 后端可用时 5xx 服务器错误降级到 mock', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://test-api')

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 42, username: 'u', nickname: 'n', avatar: 'a', points: 0, rank: 'r', total_guesses: 0, correct_guesses: 0, created_at: '2024-01-01' }),
    })
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ code: 500, message: '服务器内部错误' }),
    })

    const { api } = await import('../api')
    await api.getMe()

    const result = await api.getMe()
    expect(result.id).toBe(1)
  })

  it('test_withFallback_backend_ok_then_network_error_fallback: 后端可用时网络错误降级到 mock', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://test-api')

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 42, username: 'u', nickname: 'n', avatar: 'a', points: 0, rank: 'r', total_guesses: 0, correct_guesses: 0, created_at: '2024-01-01' }),
    })
    fetchMock.mockRejectedValueOnce(new Error('Network down'))

    const { api } = await import('../api')
    await api.getMe()

    const result = await api.getMe()
    expect(result.id).toBe(1)
  })

  // ===== withFallback 首次探测分支（backendAvailable=null）=====

  it('test_withFallback_first_probe_422_throws: 首次探测 422 业务错误不降级直接抛', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://test-api')

    fetchMock.mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ code: 422, message: '参数错误' }),
    })

    const { api, ApiErrorClass } = await import('../api')

    // 首次探测 422 应抛错（不降级）
    await expect(api.getMe()).rejects.toThrow()
    try {
      await api.getMe()
    } catch (e) {
      expect(e).toBeInstanceOf(ApiErrorClass)
      expect((e as any).code).toBe(422)
    }
    // fetch 被调用过，未走 mock
    expect(fetchMock).toHaveBeenCalled()
  })

  it('test_withFallback_first_probe_401_fallback: 首次探测 401 降级到 mock', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://test-api')

    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ code: 401, message: '未授权' }),
    })

    const { api } = await import('../api')

    const result = await api.getMe()
    expect(result.id).toBe(1)  // mock 数据
  })

  it('test_withFallback_first_probe_429_fallback: 首次探测 429 降级到 mock', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://test-api')

    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ code: 429, message: '限流' }),
    })

    const { api } = await import('../api')

    const result = await api.getMe()
    expect(result.id).toBe(1)
  })

  it('test_withFallback_first_probe_500_fallback: 首次探测 5xx 降级到 mock', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://test-api')

    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ code: 503, message: '服务不可用' }),
    })

    const { api } = await import('../api')

    const result = await api.getMe()
    expect(result.id).toBe(1)
  })

  it('test_withFallback_first_probe_success_sets_backend_available: 首次探测成功后 backendAvailable=true', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://test-api')

    // 首次成功
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 99, username: 'u', nickname: '成功用户', avatar: 'a', points: 0, rank: 'r', total_guesses: 0, correct_guesses: 0, created_at: '2024-01-01' }),
    })
    // 第二次也成功（验证 backendAvailable 已为 true，直接走真实请求）
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 100, username: 'u2', nickname: '第二次', avatar: 'a', points: 0, rank: 'r', total_guesses: 0, correct_guesses: 0, created_at: '2024-01-01' }),
    })

    const { api } = await import('../api')
    const r1 = await api.getMe()
    expect(r1.id).toBe(99)

    const r2 = await api.getMe()
    expect(r2.id).toBe(100)

    // 两次都走真实 fetch
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  // ===== getToken JWT 过期检查 =====

  it('test_getToken_expired_jwt_returns_null: 过期 JWT 返回 null 并清除 localStorage', async () => {
    // 构造过期的 JWT：payload.exp = 1（1970 年）
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const payload = btoa(JSON.stringify({ exp: 1 }))
    const signature = 'fake-sig'
    const expiredToken = `${header}.${payload}.${signature}`

    localStorage.setItem('token', expiredToken)

    const { getToken } = await import('../api')
    const token = getToken()

    expect(token).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('test_getToken_valid_jwt_returns_token: 未过期 JWT 返回原 token', async () => {
    // 构造未过期的 JWT：payload.exp = 当前时间 + 1 小时
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))
    const signature = 'fake-sig'
    const validToken = `${header}.${payload}.${signature}`

    localStorage.setItem('token', validToken)

    const { getToken } = await import('../api')
    const token = getToken()

    expect(token).toBe(validToken)
    expect(localStorage.getItem('token')).toBe(validToken)
  })

  it('test_getToken_non_jwt_returns_as_is: 非 JWT 格式 token 原样返回', async () => {
    // mock 模式下的占位 token（无两个点）
    localStorage.setItem('token', 'mock-token-xyz')

    const { getToken } = await import('../api')
    const token = getToken()

    expect(token).toBe('mock-token-xyz')
  })

  it('test_getToken_no_token_returns_null: 无 token 返回 null', async () => {
    localStorage.removeItem('token')

    const { getToken } = await import('../api')
    const token = getToken()

    expect(token).toBeNull()
  })

  it('test_getToken_invalid_jwt_returns_as_is: JWT 格式损坏（base64 解析失败）原样返回', async () => {
    // 三个部分但 base64 损坏
    localStorage.setItem('token', 'aaa.bbb.ccc')

    const { getToken } = await import('../api')
    const token = getToken()

    // 解析失败时保持兼容返回原 token
    expect(token).toBe('aaa.bbb.ccc')
  })

  // ===== onLoadingChange 加载状态 =====

  it('test_onLoadingChange_callback_called: 请求时触发 loading 状态回调', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://test-api')

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1, username: 'u', nickname: 'n', avatar: 'a', points: 0, rank: 'r', total_guesses: 0, correct_guesses: 0, created_at: '2024-01-01' }),
    })

    const { api, onLoadingChange } = await import('../api')
    const listener = vi.fn()
    const unsubscribe = onLoadingChange(listener)

    await api.getMe()

    expect(listener).toHaveBeenCalledWith(true)  // 开始加载
    expect(listener).toHaveBeenCalledWith(false) // 加载完成

    unsubscribe()
  })
})
