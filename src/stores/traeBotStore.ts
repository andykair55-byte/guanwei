import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface PageContext {
  type: 'melon' | 'community' | 'hot' | null
  title: string
  content: string // 截断到2000字
  url: string
}

interface TraeBotStore {
  messages: ChatMessage[]
  isOpen: boolean
  pageContext: PageContext | null
  isTyping: boolean
  lastMessageTime: number // 用于限流
  messageCount: number // 当前分钟内消息数
  minuteStart: number // 当前分钟开始时间

  // Actions
  toggleOpen: () => void
  setOpen: (val: boolean) => void
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  setTyping: (val: boolean) => void
  setPageContext: (ctx: PageContext | null) => void
  canSendMessage: () => boolean
  resetMessageCount: () => void
  clearMessages: () => void
}

export const useTraeBotStore = create<TraeBotStore>()(
  persist(
    (set, get) => ({
      messages: [],
      isOpen: false,
      pageContext: null,
      isTyping: false,
      lastMessageTime: 0,
      messageCount: 0,
      minuteStart: Date.now(),

      toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
      setOpen: (val) => set({ isOpen: val }),
      addMessage: (msg) => set((state) => ({
        messages: [...state.messages, { ...msg, id: Date.now().toString() + Math.random(), timestamp: Date.now() }],
        lastMessageTime: Date.now(),
        messageCount: state.messageCount + 1,
      })),
      setTyping: (val) => set({ isTyping: val }),
      setPageContext: (ctx) => set({ pageContext: ctx }),
      canSendMessage: () => {
        const state = get()
        const now = Date.now()
        // 如果超过1分钟，重置计数
        if (now - state.minuteStart > 60000) {
          set({ messageCount: 0, minuteStart: now })
          return true
        }
        return state.messageCount < 3
      },
      resetMessageCount: () => set({ messageCount: 0, minuteStart: Date.now() }),
      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: 'guanwei-traebot',
      partialize: (state) => ({ messages: state.messages }), // 只持久化消息历史
    }
  )
)
