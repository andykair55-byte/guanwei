import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── 类型定义 ──────────────────────────────────────────

export type NotificationType = 'like' | 'comment' | 'follow' | 'mention' | 'system'

export interface Notification {
  id: string
  type: NotificationType
  username: string
  avatar: string
  action: string
  content?: string
  targetPreview?: string
  targetImage?: string
  time: string
  read: boolean
}

// ── 初始 mock 数据 ──────────────────────────────────────

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1', type: 'like', username: '事实猎人', avatar: '事',
    action: '赞了你的笔记', content: '',
    targetPreview: '隔夜水真的致癌吗？专家最新解读', targetImage: 'https://picsum.photos/seed/notif1/100/100',
    time: '5分钟前', read: false,
  },
  {
    id: 'n2', type: 'follow', username: '逻辑怪', avatar: '逻',
    action: '关注了你', content: '',
    time: '15分钟前', read: false,
  },
  {
    id: 'n3', type: 'comment', username: '警惕的大学生', avatar: '警',
    action: '评论了你的笔记', content: '这个分析很到位！我之前差点上当了',
    targetPreview: '兼职刷单诈骗套路解析', targetImage: 'https://picsum.photos/seed/notif2/100/100',
    time: '30分钟前', read: false,
  },
  {
    id: 'n4', type: 'system', username: '观微团队', avatar: '观',
    action: '系统通知', content: '你的等级提升到 Lv.18 啦！继续加油～',
    time: '1小时前', read: true,
  },
  {
    id: 'n5', type: 'mention', username: '保研党', avatar: '保',
    action: '在评论中@了你', content: '@见微侦探 你怎么看这个保研骗局？',
    targetPreview: '5万能买保研名额？揭露内幕', targetImage: 'https://picsum.photos/seed/notif3/100/100',
    time: '2小时前', read: false,
  },
  {
    id: 'n6', type: 'like', username: '理科生求真', avatar: '理',
    action: '收藏了你的笔记', content: '',
    targetPreview: '室温超导事件时间线整理', targetImage: 'https://picsum.photos/seed/notif4/100/100',
    time: '3小时前', read: true,
  },
  {
    id: 'n7', type: 'comment', username: '反思者', avatar: '反',
    action: '回复了你的评论', content: '有道理，闭卷考试确实有它的价值',
    time: '4小时前', read: true,
  },
  {
    id: 'n8', type: 'like', username: '技术宅', avatar: '技',
    action: '赞了你的评论', content: '',
    targetPreview: '校园网提速方案实测', targetImage: 'https://picsum.photos/seed/notif5/100/100',
    time: '昨天', read: true,
  },
]

// ── Store 定义 ──────────────────────────────────────────

export type NotificationTab = 'all' | NotificationType

interface NotificationStore {
  notifications: Notification[]
  activeTab: NotificationTab
  // Actions
  setActiveTab: (tab: NotificationTab) => void
  markAllRead: () => void
  markRead: (id: string) => void
  markUnread: (id: string) => void
  deleteNotification: (id: string) => void
  addNotification: (n: Notification) => void
  clearAll: () => void
  unreadCount: () => number
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      notifications: MOCK_NOTIFICATIONS,
      activeTab: 'all',

      setActiveTab: (tab) => set({ activeTab: tab }),

      markAllRead: () => set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, read: true })),
      })),

      markRead: (id) => set((state) => ({
        notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n),
      })),

      markUnread: (id) => set((state) => ({
        notifications: state.notifications.map(n => n.id === id ? { ...n, read: false } : n),
      })),

      deleteNotification: (id) => set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id),
      })),

      addNotification: (n) => set((state) => ({
        notifications: [n, ...state.notifications],
      })),

      clearAll: () => set({ notifications: [] }),

      unreadCount: () => {
        const state = get()
        return state.notifications.filter(n => !n.read).length
      },
    }),
    {
      name: 'guanwei-notifications',
      partialize: (state) => ({ notifications: state.notifications }),
    }
  )
)
