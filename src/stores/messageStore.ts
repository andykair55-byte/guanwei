import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Message {
  id: string
  content: string
  time: string
  isSelf: boolean
}

export interface Conversation {
  id: string
  name: string
  avatar: string
  avatarBg: string
  lastMessage: string
  time: string
  unread: number
  online: boolean
  messages: Message[]
}

interface MessageStore {
  conversations: Conversation[]
  selectedId: string | null
  searchQuery: string
  inputValue: string
  setSelectedId: (id: string | null) => void
  setSearchQuery: (q: string) => void
  setInputValue: (v: string) => void
  sendMessage: (convId: string, content: string) => void
  receiveMessage: (convId: string, content: string) => void
  markConversationRead: (id: string) => void
  deleteConversation: (id: string) => void
  totalUnread: () => number
}

// 模块级定时器表，避免进入 store state（setTimeout 句柄无法序列化）
const replyTimers: Map<string, ReturnType<typeof setTimeout>> = new Map()

const REPLIES = ['收到！', '好的我看看', '这个想法不错', '有道理', '让我想想...']

const formatNow = () => new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'c1', name: '事实猎人', avatar: '事', avatarBg: '#10b981',
    lastMessage: '那个隔夜菜的求证结果出来了，你看看报告', time: '刚刚',
    unread: 2, online: true,
    messages: [
      { id: 'm1', content: '嗨，隔夜菜那个求证结果出来了吗？', time: '10:20', isSelf: true },
      { id: 'm2', content: '刚收到AI分析报告，结论挺有意思的', time: '10:21', isSelf: false },
      { id: 'm3', content: '核心发现：亚硝酸盐确实会随时间累积，但在正常冷藏条件下24小时内增量远低于安全阈值', time: '10:22', isSelf: false },
      { id: 'm4', content: '所以"隔夜菜致癌"这个说法是夸大的？', time: '10:23', isSelf: true },
      { id: 'm5', content: '对，属于"技术上有一点道理但被严重夸大"。真正风险在于反复加热和不规范储存', time: '10:24', isSelf: false },
      { id: 'm6', content: '那个隔夜菜的求证结果出来了，你看看报告', time: '10:25', isSelf: false },
    ],
  },
  {
    id: 'c2', name: '逻辑怪', avatar: '逻', avatarBg: '#3b82f6',
    lastMessage: '今晚的辩论你准备好了吗？正方论点我整理好了', time: '5分钟前',
    unread: 1, online: true,
    messages: [
      { id: 'm1', content: '辩论准备得怎么样了？', time: '09:15', isSelf: true },
      { id: 'm2', content: '正方三个论点已经梳理完毕', time: '09:18', isSelf: false },
      { id: 'm3', content: '今晚的辩论你准备好了吗？正方论点我整理好了', time: '09:25', isSelf: false },
    ],
  },
  {
    id: 'c3', name: '警惕的大学生', avatar: '警', avatarBg: '#f59e0b',
    lastMessage: '谢谢你帮我分析那条兼职广告！', time: '30分钟前',
    unread: 0, online: false,
    messages: [
      { id: 'm1', content: '你好！看到你发的兼职广告分析帖了，能帮我看一个吗？', time: '08:00', isSelf: false },
      { id: 'm2', content: '当然可以，发过来吧', time: '08:05', isSelf: true },
      { id: 'm3', content: '这个是典型的刷单诈骗套路', time: '08:10', isSelf: true },
      { id: 'm4', content: '谢谢你帮我分析那条兼职广告！', time: '08:12', isSelf: false },
    ],
  },
  {
    id: 'c4', name: '理科生求真', avatar: '理', avatarBg: '#8b5cf6',
    lastMessage: '室温超导那篇论文的撤稿时间线我整理好了', time: '1小时前',
    unread: 3, online: false,
    messages: [
      { id: 'm1', content: '室温超导最新进展：Nature已确认撤稿', time: '昨天', isSelf: false },
      { id: 'm2', content: '终于有定论了', time: '昨天', isSelf: true },
      { id: 'm3', content: '室温超导那篇论文的撤稿时间线我整理好了', time: '昨天', isSelf: false },
    ],
  },
  {
    id: 'c5', name: '保研党', avatar: '保', avatarBg: '#c0392b',
    lastMessage: '那个保研内幕的消息群里好多人都在讨论', time: '2小时前',
    unread: 0, online: true,
    messages: [
      { id: 'm1', content: '保研群里有个人说花5万能买名额，靠谱吗？', time: '昨天', isSelf: false },
      { id: 'm2', content: '100%是骗局，别理他', time: '昨天', isSelf: true },
      { id: 'm3', content: '那个保研内幕的消息群里好多人都在讨论', time: '昨天', isSelf: false },
    ],
  },
  {
    id: 'c6', name: '技术宅', avatar: '技', avatarBg: '#10b981',
    lastMessage: '校园网提速方案实测效果不错', time: '昨天',
    unread: 0, online: false,
    messages: [
      { id: 'm1', content: '试了下你说的校园网提速方案，速度提升很明显', time: '前天', isSelf: false },
      { id: 'm2', content: '校园网提速方案实测效果不错', time: '前天', isSelf: false },
    ],
  },
]

export const useMessageStore = create<MessageStore>()(
  persist(
    (set, get) => ({
      conversations: INITIAL_CONVERSATIONS,
      selectedId: null,
      searchQuery: '',
      inputValue: '',

      setSelectedId: (id) => set({ selectedId: id }),
      setSearchQuery: (q) => set({ searchQuery: q }),
      setInputValue: (v) => set({ inputValue: v }),

      sendMessage: (convId, content) => {
        const trimmed = content.trim()
        if (!trimmed) return

        const newMsg: Message = {
          id: `new-${Date.now()}`,
          content: trimmed,
          time: formatNow(),
          isSelf: true,
        }

        set((state) => ({
          conversations: state.conversations.map(c =>
            c.id === convId
              ? {
                  ...c,
                  messages: [...c.messages, newMsg],
                  lastMessage: newMsg.content,
                  time: '刚刚',
                }
              : c
          ),
        }))

        // 清除旧定时器避免堆积
        const existing = replyTimers.get(convId)
        if (existing) clearTimeout(existing)

        const timer = setTimeout(() => {
          const reply = REPLIES[Math.floor(Math.random() * REPLIES.length)]
          get().receiveMessage(convId, reply)
          replyTimers.delete(convId)
        }, 800 + Math.random() * 1000)

        replyTimers.set(convId, timer)
      },

      receiveMessage: (convId, content) => {
        const newMsg: Message = {
          id: `reply-${Date.now()}`,
          content,
          time: formatNow(),
          isSelf: false,
        }
        set((state) => ({
          conversations: state.conversations.map(c =>
            c.id === convId
              ? {
                  ...c,
                  messages: [...c.messages, newMsg],
                  lastMessage: newMsg.content,
                  time: '刚刚',
                }
              : c
          ),
        }))
      },

      markConversationRead: (id) => set((state) => ({
        conversations: state.conversations.map(c =>
          c.id === id ? { ...c, unread: 0 } : c
        ),
      })),

      deleteConversation: (id) => {
        const existing = replyTimers.get(id)
        if (existing) {
          clearTimeout(existing)
          replyTimers.delete(id)
        }
        set((state) => ({
          conversations: state.conversations.filter(c => c.id !== id),
          selectedId: state.selectedId === id ? null : state.selectedId,
        }))
      },

      totalUnread: () => get().conversations.reduce((sum, c) => sum + c.unread, 0),
    }),
    {
      name: 'guanwei-messages',
      partialize: (state) => ({
        conversations: state.conversations,
      }),
    }
  )
)
