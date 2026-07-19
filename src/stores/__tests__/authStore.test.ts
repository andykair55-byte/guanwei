/**
 * authStore 测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock api 模块（含 getToken 导出）
vi.mock('../../services/api', () => ({
  api: {
    login: vi.fn(),
    register: vi.fn(),
    getMe: vi.fn(),
    getMyStats: vi.fn(),
    getMyPoints: vi.fn(),
    dailyLogin: vi.fn(),
  },
  getToken: vi.fn(() => localStorage.getItem('token')),
}))

import { useAuthStore } from '../authStore'
import { api, getToken } from '../../services/api'

const mockApiUser = {
  id: 1,
  username: 'demo',
  nickname: '见微侦探',
  avatar: 'https://picsum.photos/seed/demo/80/80',
  points: 1280,
  rank: '鉴瓜达人',
  total_guesses: 47,
  correct_guesses: 31,
  created_at: '2024-01-01T00:00:00Z',
}

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(getToken).mockImplementation(() => localStorage.getItem('token'))
    useAuthStore.setState({
      user: null,
      token: null,
      isLoading: false,
      stats: null,
      pointsRecords: [],
    })
    vi.clearAllMocks()
    vi.mocked(getToken).mockImplementation(() => localStorage.getItem('token'))
  })

  it('test_initial_state: 初始状态 user=null, token=null, isLoading=false', () => {
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
    expect(state.isLoading).toBe(false)
    expect(state.stats).toBeNull()
    expect(state.pointsRecords).toEqual([])
  })

  it('test_initial_state_reads_token_from_localStorage', async () => {
    localStorage.setItem('token', 'stored-jwt-token')
    vi.mocked(getToken).mockImplementation(() => localStorage.getItem('token'))
    vi.resetModules()
    const { useAuthStore: freshStore } = await import('../authStore')
    expect(freshStore.getState().token).toBe('stored-jwt-token')
    expect(freshStore.getState().user).toBeNull()
  })

  it('test_login_success: mock api.login 成功，user 和 token 更新', async () => {
    vi.mocked(api.login).mockResolvedValue({
      access_token: 'new-jwt-token',
      user: mockApiUser,
    })

    await useAuthStore.getState().login('demo', 'demo')

    const state = useAuthStore.getState()
    expect(state.token).toBe('new-jwt-token')
    expect(state.user).not.toBeNull()
    expect(state.user?.id).toBe('1')
    expect(state.user?.nickname).toBe('见微侦探')
    expect(state.isLoading).toBe(false)
    expect(localStorage.getItem('token')).toBe('new-jwt-token')
  })

  it('test_login_failure: mock api.login 抛错，isLoading 回 false，错误向上抛', async () => {
    vi.mocked(api.login).mockRejectedValue(new Error('密码错误'))

    await expect(
      useAuthStore.getState().login('wrong', 'wrong')
    ).rejects.toThrow('密码错误')

    const state = useAuthStore.getState()
    expect(state.isLoading).toBe(false)
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
  })

  it('test_logout: localStorage 清除，state 重置', () => {
    localStorage.setItem('token', 'some-token')
    useAuthStore.setState({
      user: {
        id: '1', nickname: '测试', avatar: '', rank: '吃瓜群众',
        points: 100, totalGuesses: 10, correctGuesses: 5, badges: [],
        createdAt: '2024-01-01',
      },
      token: 'some-token',
      stats: { rank: '吃瓜群众', points: 100, total_guesses: 10, correct_guesses: 5, accuracy: 50 },
      pointsRecords: [{ id: '1', userId: '1', amount: 10, type: 'daily_login', description: '签到', createdAt: '2024-01-01' }],
    })

    useAuthStore.getState().logout()

    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
    expect(state.stats).toBeNull()
    expect(state.pointsRecords).toEqual([])
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('test_fetchMe_success: mock api.getMe 成功，user 更新', async () => {
    vi.mocked(api.getMe).mockResolvedValue(mockApiUser)

    await useAuthStore.getState().fetchMe()

    const state = useAuthStore.getState()
    expect(state.user).not.toBeNull()
    expect(state.user?.id).toBe('1')
    expect(state.user?.nickname).toBe('见微侦探')
    expect(state.user?.rank).toBe('鉴瓜达人')
  })

  it('test_fetchMe_failure: mock api.getMe 失败，token 清除', async () => {
    localStorage.setItem('token', 'old-token')
    useAuthStore.setState({
      token: 'old-token',
      user: {
        id: '1', nickname: '旧用户', avatar: '', rank: '吃瓜群众',
        points: 0, totalGuesses: 0, correctGuesses: 0, badges: [],
        createdAt: '2024-01-01',
      },
    })

    vi.mocked(api.getMe).mockRejectedValue(new Error('Token 过期'))

    await useAuthStore.getState().fetchMe()

    const state = useAuthStore.getState()
    expect(state.token).toBeNull()
    expect(state.user).toBeNull()
    expect(state.stats).toBeNull()
    expect(state.pointsRecords).toEqual([])
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('test_fetchStats_success: mock api.getMyStats 成功，stats 和 user 更新', async () => {
    useAuthStore.setState({
      user: {
        id: '1', nickname: '测试', avatar: '', rank: '吃瓜群众',
        points: 0, totalGuesses: 0, correctGuesses: 0, badges: [],
        createdAt: '2024-01-01',
      },
    })

    vi.mocked(api.getMyStats).mockResolvedValue({
      rank: '瓜田新手',
      points: 200,
      total_guesses: 15,
      correct_guesses: 8,
      accuracy: 53,
    })

    await useAuthStore.getState().fetchStats()

    const state = useAuthStore.getState()
    expect(state.stats).not.toBeNull()
    expect(state.stats?.rank).toBe('瓜田新手')
    expect(state.user?.rank).toBe('瓜田新手')
    expect(state.user?.points).toBe(200)
    expect(state.user?.totalGuesses).toBe(15)
  })

  it('test_fetchPoints_success: 积分记录正确存储', async () => {
    vi.mocked(api.getMyPoints).mockResolvedValue([
      { id: 1, amount: 20, type: 'daily_login', description: '每日登录', created_at: '2024-06-01' },
      { id: 2, amount: 30, type: 'guess_correct', description: '猜对奖励', created_at: '2024-06-02' },
    ])

    await useAuthStore.getState().fetchPoints(0, 20)

    const state = useAuthStore.getState()
    expect(state.pointsRecords).toHaveLength(2)
    expect(state.pointsRecords[0].id).toBe('1')
    expect(state.pointsRecords[0].amount).toBe(20)
    expect(state.pointsRecords[1].type).toBe('guess_correct')
  })

  it('test_register_success: 注册成功后 isLoading 回 false', async () => {
    vi.mocked(api.register).mockResolvedValue({} as any)

    await useAuthStore.getState().register('newuser', '新用户', 'password123')

    expect(api.register).toHaveBeenCalledWith('newuser', '新用户', 'password123')
    expect(useAuthStore.getState().isLoading).toBe(false)
  })

  it('test_register_failure: 注册失败时 isLoading 回 false 并向上抛错', async () => {
    vi.mocked(api.register).mockRejectedValue(new Error('用户名已存在'))

    await expect(
      useAuthStore.getState().register('dup', 'dup', 'pwd')
    ).rejects.toThrow('用户名已存在')

    expect(useAuthStore.getState().isLoading).toBe(false)
  })

  it('test_fetchStats_failure_silent: getMyStats 失败时静默不抛错，state 保持原状', async () => {
    useAuthStore.setState({
      user: {
        id: '1', nickname: '测试', avatar: '', rank: '吃瓜群众',
        points: 100, totalGuesses: 5, correctGuesses: 2, badges: [],
        createdAt: '2024-01-01',
      },
      stats: null,
    })

    vi.mocked(api.getMyStats).mockRejectedValue(new Error('stats network error'))

    await expect(useAuthStore.getState().fetchStats()).resolves.not.toThrow()

    // state 保持原状
    const state = useAuthStore.getState()
    expect(state.stats).toBeNull()
    expect(state.user?.points).toBe(100)
  })

  it('test_fetchStats_failure_with_no_user: user=null 时 catch 中不修改 user', async () => {
    useAuthStore.setState({ user: null, stats: null })
    vi.mocked(api.getMyStats).mockRejectedValue(new Error('fail'))

    await useAuthStore.getState().fetchStats()

    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().stats).toBeNull()
  })

  it('test_fetchPoints_failure_silent: getMyPoints 失败时静默不抛错', async () => {
    vi.mocked(api.getMyPoints).mockRejectedValue(new Error('points error'))

    await expect(useAuthStore.getState().fetchPoints(0, 20)).resolves.not.toThrow()
    expect(useAuthStore.getState().pointsRecords).toEqual([])
  })

  it('test_fetchPoints_pagination: skip>0 时新记录追加到现有列表后', async () => {
    // 先放一条已有记录
    useAuthStore.setState({
      pointsRecords: [
        { id: 'old-1', userId: '1', amount: 5, type: 'daily_login', description: '旧记录', createdAt: '2024-01-01' },
      ],
    })

    vi.mocked(api.getMyPoints).mockResolvedValue([
      { id: 100, amount: 10, type: 'guess_correct', description: '新记录', created_at: '2024-06-10' },
    ])

    await useAuthStore.getState().fetchPoints(1, 20)

    const records = useAuthStore.getState().pointsRecords
    expect(records).toHaveLength(2)
    // 旧记录在前，新记录追加在后
    expect(records[0].id).toBe('old-1')
    expect(records[1].id).toBe('100')
    expect(records[1].description).toBe('新记录')
  })

  it('test_fetchPoints_with_items_wrapper: 返回 { items: [...] } 时正确解包', async () => {
    vi.mocked(api.getMyPoints).mockResolvedValue({
      items: [
        { id: 5, amount: 15, type: 'creation', description: '发布佐证', created_at: '2024-07-01' },
      ],
    } as any)

    await useAuthStore.getState().fetchPoints(0, 20)

    const records = useAuthStore.getState().pointsRecords
    expect(records).toHaveLength(1)
    expect(records[0].id).toBe('5')
    expect(records[0].amount).toBe(15)
    expect(records[0].type).toBe('creation')
  })

  it('test_init_with_token_getMe_success: 有 token 且 getMe 成功，设置 user', async () => {
    localStorage.setItem('token', 'valid-token')
    vi.mocked(getToken).mockImplementation(() => localStorage.getItem('token'))
    vi.mocked(api.getMe).mockResolvedValue(mockApiUser)

    useAuthStore.getState().init()

    // init 内部是异步链，等待 microtask
    await vi.waitFor(() => {
      expect(useAuthStore.getState().user).not.toBeNull()
    })

    const state = useAuthStore.getState()
    expect(state.token).toBe('valid-token')
    expect(state.user?.id).toBe('1')
    expect(state.user?.nickname).toBe('见微侦探')
  })

  it('test_init_with_token_getMe_failure_triggers_autoLogin: token 无效时降级到 admin 登录', async () => {
    localStorage.setItem('token', 'expired-token')
    vi.mocked(getToken).mockImplementation(() => localStorage.getItem('token'))
    // getMe 失败
    vi.mocked(api.getMe).mockRejectedValue(new Error('401'))
    // autoLoginMock 顺序：admin/123 → test/123456，admin 成功即返回
    vi.mocked(api.login).mockResolvedValue({
      access_token: 'admin-token',
      user: mockApiUser,
    } as any)

    useAuthStore.getState().init()

    await vi.waitFor(() => {
      expect(useAuthStore.getState().user).not.toBeNull()
    })

    const state = useAuthStore.getState()
    expect(state.token).toBe('admin-token')
    expect(localStorage.getItem('token')).toBe('admin-token')
    expect(state.user?.id).toBe('1')
    expect(api.login).toHaveBeenCalledWith('admin', '123')
  })

  it('test_init_without_token_triggers_autoLogin: 无 token 时直接用 admin 登录', async () => {
    // 无 token
    vi.mocked(getToken).mockImplementation(() => null)
    vi.mocked(api.login).mockResolvedValue({
      access_token: 'admin-token-2',
      user: mockApiUser,
    } as any)

    useAuthStore.getState().init()

    await vi.waitFor(() => {
      expect(useAuthStore.getState().user).not.toBeNull()
    })

    const state = useAuthStore.getState()
    expect(state.token).toBe('admin-token-2')
    expect(state.user?.id).toBe('1')
    expect(api.login).toHaveBeenCalledWith('admin', '123')
  })

  it('test_init_autoLogin_failure_stays_logged_out: 所有候选账号都失败时保持未登录', async () => {
    vi.mocked(getToken).mockImplementation(() => null)
    // admin 和 test 都失败
    vi.mocked(api.login).mockRejectedValue(new Error('login failed'))

    useAuthStore.getState().init()

    // 等待所有 promise 完成（autoLoginMock 会串行尝试 admin → test，需更长等待）
    await vi.waitFor(() => {
      // 至少调用了 login 两次（admin + test）
      expect(api.login).toHaveBeenCalledTimes(2)
    })
    // 多等一个 microtask 确保 catch 执行完
    await new Promise(resolve => setTimeout(resolve, 50))

    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
  })
})
