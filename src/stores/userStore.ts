import { create } from 'zustand'
import type { User, Badge, PointsRecord } from '../types'

export interface UserCreation {
  id: string
  title: string
  type: 'evidence' | 'post'
  publishedAt: number
  views: number
  likes: number
  impactCount: number
  melonId?: string
  content: string
}

interface UserState {
  user: User
  pointsRecords: PointsRecord[]
  creations: UserCreation[]

  // 添加积分
  addPoints: (amount: number, type: PointsRecord['type'], description: string) => void
  // 发布创作（记录 + 加积分）
  publishCreation: (c: { title: string; type: 'evidence' | 'post'; melonId?: string; content: string }) => UserCreation
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
  creations: [],

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

  publishCreation: (c) => {
    const creation: UserCreation = {
      ...c,
      id: `creation-${Date.now()}`,
      publishedAt: Date.now(),
      views: 0,
      likes: 0,
      impactCount: 0,
    }
    set((state) => ({
      creations: [creation, ...state.creations],
      user: { ...state.user, publishedCount: (state.user.publishedCount || 0) + 1 },
    }))
    // 发布佐证奖励 +5 积分
    get().addPoints(5, 'creation', `发布${c.type === 'evidence' ? '佐证' : '帖子'}：${c.title}`)
    return creation
  },
}))
