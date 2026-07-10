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
  content: string
  url: string
}

export interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

interface XiaoWeiStore {
  conversations: Conversation[]
  activeId: string | null
  isOpen: boolean
  showHistory: boolean
  pageContext: PageContext | null
  isTyping: boolean
  lastMessageTime: number
  messageCount: number
  minuteStart: number

  // Actions
  toggleOpen: () => void
  setOpen: (val: boolean) => void
  toggleHistory: () => void
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  setTyping: (val: boolean) => void
  setPageContext: (ctx: PageContext | null) => void
  canSendMessage: () => boolean
  resetMessageCount: () => void
  newConversation: () => void
  switchConversation: (id: string) => void
  deleteConversation: (id: string) => void
  getActive: () => Conversation | null
}

const makeId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

export const useXiaoWeiStore = create<XiaoWeiStore>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeId: null,
      isOpen: false,
      showHistory: false,
      pageContext: null,
      isTyping: false,
      lastMessageTime: 0,
      messageCount: 0,
      minuteStart: Date.now(),

      toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
      setOpen: (val) => set({ isOpen: val }),
      toggleHistory: () => set((state) => ({ showHistory: !state.showHistory })),

      addMessage: (msg) => set((state) => {
        let activeId = state.activeId
        let conversations = state.conversations

        // 如果没有活跃会话，自动创建一个
        if (!activeId) {
          const newConv: Conversation = {
            id: makeId(),
            title: msg.content.slice(0, 20) + (msg.content.length > 20 ? '...' : ''),
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }
          activeId = newConv.id
          conversations = [newConv, ...conversations]
        }

        const newMsg: ChatMessage = { ...msg, id: makeId(), timestamp: Date.now() }

        conversations = conversations.map(c => {
          if (c.id !== activeId) return c
          const updated = { ...c, messages: [...c.messages, newMsg], updatedAt: Date.now() }
          // 用第一条用户消息作为标题
          if (c.messages.length === 0 && msg.role === 'user') {
            updated.title = msg.content.slice(0, 20) + (msg.content.length > 20 ? '...' : '')
          }
          return updated
        })

        return {
          conversations,
          activeId,
          lastMessageTime: Date.now(),
          messageCount: state.messageCount + 1,
        }
      }),

      setTyping: (val) => set({ isTyping: val }),
      setPageContext: (ctx) => set({ pageContext: ctx }),

      canSendMessage: () => {
        const state = get()
        const now = Date.now()
        if (now - state.minuteStart > 60000) {
          set({ messageCount: 0, minuteStart: now })
          return true
        }
        return state.messageCount < 3
      },

      resetMessageCount: () => set({ messageCount: 0, minuteStart: Date.now() }),

      newConversation: () => set({ activeId: null, showHistory: false }),

      switchConversation: (id) => set({ activeId: id, showHistory: false }),

      deleteConversation: (id) => set((state) => {
        const conversations = state.conversations.filter(c => c.id !== id)
        const activeId = state.activeId === id ? null : state.activeId
        return { conversations, activeId }
      }),

      getActive: () => {
        const state = get()
        if (!state.activeId) return null
        return state.conversations.find(c => c.id === state.activeId) || null
      },
    }),
    {
      name: 'guanwei-xiaowei',
      partialize: (state) => ({
        conversations: state.conversations,
        activeId: state.activeId,
      }),
    }
  )
)
