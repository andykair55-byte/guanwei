import { create } from 'zustand'
import { api } from '../services/api'
import { transformUser } from '../utils/transform'
import type { User, UserStats, PointsRecord } from '../types'

// 无后端时自动用 demo 账号登录
async function autoLoginMock() {
  try {
    const res: any = await api.login('demo', 'demo')
    localStorage.setItem('token', res.access_token)
    const user = transformUser(res.user)
    useAuthStore.setState({ user, token: res.access_token })
  } catch {
    // 完全失败，保持未登录状态
  }
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
  token: localStorage.getItem('token'),
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
    const token = localStorage.getItem('token')
    if (token) {
      set({ token })
      api.getMe().then((apiUser: any) => {
        const user = transformUser(apiUser)
        set({ user })
      }).catch(() => {
        // Token 无效，用 mock 自动登录
        autoLoginMock()
      })
    } else {
      // 无 token，自动用 demo 账号登录
      autoLoginMock()
    }
  }
}))
