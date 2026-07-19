import { create } from 'zustand'
import { api, getToken } from '../services/api'
import { transformUser } from '../utils/transform'
import type { User, UserStats, PointsRecord } from '../types'

// 无后端或 token 失效时自动用兜底账号登录
// 顺序：admin/123（后端 seed.py 一定有）→ test/123456 → 放弃
async function autoLoginMock() {
  const candidates: Array<[string, string]> = [
    ['admin', '123'],
    ['test', '123456'],
  ]
  for (const [username, password] of candidates) {
    try {
      const res: any = await api.login(username, password)
      localStorage.setItem('token', res.access_token)
      const user = transformUser(res.user)
      useAuthStore.setState({ user, token: res.access_token })
      return
    } catch {
      // 清除可能残留的无效 token，继续尝试下一个候选账号
      localStorage.removeItem('token')
    }
  }
  // 所有候选账号都失败，保持未登录状态
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  stats: UserStats | null
  pointsRecords: PointsRecord[]

  login: (username: string, password: string) => Promise<void>
  register: (username: string, nickname: string, password: string) => Promise<void>
  logout: () => void
  fetchMe: () => Promise<void>
  fetchStats: () => Promise<void>
  fetchPoints: (skip?: number, limit?: number) => Promise<void>
  init: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  // spec-19: 用 getToken 而非直接 localStorage.getItem，自动过滤过期 JWT
  token: getToken(),
  isLoading: false,
  stats: null,
  pointsRecords: [],

  login: async (username, password) => {
    set({ isLoading: true })
    try {
      const res: any = await api.login(username, password)
      localStorage.setItem('token', res.access_token)
      const user = transformUser(res.user)
      set({ user, token: res.access_token, isLoading: false })
    } catch (e) {
      set({ isLoading: false })
      throw e
    }
  },

  register: async (username, nickname, password) => {
    set({ isLoading: true })
    try {
      await api.register(username, nickname, password)
      set({ isLoading: false })
    } catch (e) {
      set({ isLoading: false })
      throw e
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null, stats: null, pointsRecords: [] })
  },

  fetchMe: async () => {
    try {
      const apiUser: any = await api.getMe()
      const user = transformUser(apiUser)
      set({ user })
    } catch {
      localStorage.removeItem('token')
      set({ token: null, user: null, stats: null, pointsRecords: [] })
    }
  },

  fetchStats: async () => {
    try {
      const stats: any = await api.getMyStats()
      set({ stats })
      set((state) => {
        if (!state.user) return state
        return {
          user: {
            ...state.user,
            rank: stats.rank,
            points: stats.points,
            totalGuesses: stats.total_guesses,
            correctGuesses: stats.correct_guesses,
          }
        }
      })
    } catch {
      // 静默失败
    }
  },

  fetchPoints: async (skip = 0, limit = 20) => {
    try {
      const data: any = await api.getMyPoints(skip, limit)
      const records: PointsRecord[] = (data.items || data || []).map((item: any) => ({
        id: String(item.id),
        userId: '',
        amount: item.amount,
        type: item.type as PointsRecord['type'],
        description: item.description,
        createdAt: item.created_at,
      }))
      set((state) => ({
        pointsRecords: skip === 0 ? records : [...state.pointsRecords, ...records],
      }))
    } catch {
      // 静默失败
    }
  },

  init: () => {
    // spec-19: 用 getToken 而非直接 localStorage.getItem，过期 JWT 会被自动清除
    const token = getToken()
    if (token) {
      set({ token })
      api.getMe().then((apiUser: any) => {
        const user = transformUser(apiUser)
        set({ user })
      }).catch(() => {
        // Token 无效（401/签名失效等），先清掉旧 token 再用兜底账号登录
        localStorage.removeItem('token')
        autoLoginMock()
      })
    } else {
      // 无 token（或已过期被 getToken 清除），自动用兜底账号登录
      autoLoginMock()
    }
  }
}))
