import { create } from 'zustand'
import type { User, Rank, Badge, PointsRecord } from '../types'

// 段位配置：7 级段位
export const RANK_CONFIG: Record<Rank, {
  level: number
  icon: string
  minCorrect: number
  minAccuracy: number
  minTotal: number
}> = {
  '吃瓜群众': { level: 1, icon: 'Sprout', minCorrect: 0, minAccuracy: 0, minTotal: 0 },
  '瓜田新手': { level: 2, icon: 'Leaf', minCorrect: 5, minAccuracy: 30, minTotal: 10 },
  '鉴瓜学徒': { level: 3, icon: 'Flower2', minCorrect: 20, minAccuracy: 40, minTotal: 30 },
  '瓜田侦探': { level: 4, icon: 'Award', minCorrect: 50, minAccuracy: 50, minTotal: 80 },
  '鉴瓜达人': { level: 5, icon: 'Star', minCorrect: 100, minAccuracy: 55, minTotal: 150 },
  '鉴瓜大师': { level: 6, icon: 'Trophy', minCorrect: 200, minAccuracy: 60, minTotal: 300 },
  '见微先知': { level: 7, icon: 'Diamond', minCorrect: 500, minAccuracy: 65, minTotal: 600 },
}

// 所有段位列表（用于排行榜展示）
export const RANK_ORDER: Rank[] = [
  '吃瓜群众',
  '瓜田新手',
  '鉴瓜学徒',
  '瓜田侦探',
  '鉴瓜达人',
  '鉴瓜大师',
  '见微先知',
]

interface UserState {
  user: User
  pointsRecords: PointsRecord[]

  // 获取当前段位进度
  getRankProgress: () => {
    current: Rank
    next: Rank | null
    progress: number
    remaining: number
  }

  // 获取下一个段位
  getNextRank: () => Rank | null

  // 添加积分
  addPoints: (amount: number, type: PointsRecord['type'], description: string) => void

  // 更新用户猜瓜结果
  updateGuessResult: (correct: boolean) => void
}

const mockBadges: Badge[] = [
  { id: 'b1', name: '初出茅庐', description: '完成首次猜瓜', icon: 'Sprout' },
  { id: 'b2', name: '连胜之星', description: '连续猜对 5 次', icon: 'Star' },
]

const mockPointsRecords: PointsRecord[] = [
  { id: 'p1', userId: 'u1', amount: 10, type: 'daily_login', description: '每日登录奖励', createdAt: '2024-01-15T08:00:00Z' },
  { id: 'p2', userId: 'u1', amount: 5, type: 'guess_correct', description: '猜对瓜「某某事件」', createdAt: '2024-01-14T20:30:00Z' },
  { id: 'p3', userId: 'u1', amount: 8, type: 'content_quality', description: '佐证被选为最佳', createdAt: '2024-01-14T18:00:00Z' },
  { id: 'p4', userId: 'u1', amount: -5, type: 'exchange', description: '积分兑换神秘礼包', createdAt: '2024-01-13T15:00:00Z' },
]

const mockUser: User = {
  id: 'u1',
  nickname: '小明同学',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1',
  rank: '瓜田侦探',
  points: 2850,
  totalGuesses: 120,
  correctGuesses: 72,
  badges: mockBadges,
  createdAt: '2024-01-01T00:00:00Z',
}

export const useUserStore = create<UserState>((set, get) => ({
  user: mockUser,
  pointsRecords: mockPointsRecords,

  getRankProgress: () => {
    const { user } = get()
    const currentRank = user.rank
    const currentIndex = RANK_ORDER.indexOf(currentRank)
    const nextRank = currentIndex < RANK_ORDER.length - 1 ? RANK_ORDER[currentIndex + 1] : null

    if (!nextRank) {
      return { current: currentRank, next: null, progress: 100, remaining: 0 }
    }

    const currentConfig = RANK_CONFIG[currentRank]
    const nextConfig = RANK_CONFIG[nextRank]

    // 计算进度（基于猜对次数）
    const minCorrect = currentConfig.minCorrect
    const targetCorrect = nextConfig.minCorrect
    const range = targetCorrect - minCorrect
    const current = user.correctGuesses - minCorrect
    const progress = Math.min(100, Math.max(0, Math.round((current / range) * 100)))
    const remaining = Math.max(0, targetCorrect - user.correctGuesses)

    return {
      current: currentRank,
      next: nextRank,
      progress,
      remaining,
    }
  },

  getNextRank: () => {
    const { user } = get()
    const currentIndex = RANK_ORDER.indexOf(user.rank)
    if (currentIndex < RANK_ORDER.length - 1) {
      return RANK_ORDER[currentIndex + 1]
    }
    return null
  },

  addPoints: (amount: number, type: PointsRecord['type'], description: string) => {
    const newRecord: PointsRecord = {
      id: `p${Date.now()}`,
      userId: get().user.id,
      amount,
      type,
      description,
      createdAt: new Date().toISOString(),
    }
    set((state) => ({
      user: { ...state.user, points: state.user.points + amount },
      pointsRecords: [newRecord, ...state.pointsRecords],
    }))
  },

  updateGuessResult: (correct: boolean) => {
    set((state) => {
      const newCorrectGuesses = correct ? state.user.correctGuesses + 1 : state.user.correctGuesses
      const newTotalGuesses = state.user.totalGuesses + 1

      // 计算新段位
      let newRank = state.user.rank
      for (const rank of RANK_ORDER) {
        const config = RANK_CONFIG[rank]
        if (newCorrectGuesses >= config.minCorrect && newTotalGuesses >= config.minTotal) {
          const accuracy = Math.round((newCorrectGuesses / newTotalGuesses) * 100)
          if (accuracy >= config.minAccuracy) {
            newRank = rank
          }
        }
      }

      return {
        user: {
          ...state.user,
          correctGuesses: newCorrectGuesses,
          totalGuesses: newTotalGuesses,
          rank: newRank,
        },
      }
    })
  },
}))
