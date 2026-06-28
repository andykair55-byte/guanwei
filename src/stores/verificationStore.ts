import { create } from 'zustand'
import { api } from '../services/api'
import type { VerificationRequest, VerificationResult, EvidenceTimelineItem } from '../types'

type AgentPhase = 'idle' | 'searching' | 'verifying' | 'analyzing' | 'done'

interface ChatMessage {
  id: string
  text: string
  type: 'system' | 'evidence'
}

interface VerificationState {
  dailyFreeUsed: number
  extraPurchased: number
  maxFreePerDay: number
  currentRequest: VerificationRequest | null
  isAnalyzing: boolean
  agentPhase: AgentPhase
  chatMessages: ChatMessage[]
  evidenceTimeline: EvidenceTimelineItem[]
  result: VerificationResult | null

  submitVerification: (content: string, type: 'text' | 'link') => Promise<VerificationResult>
  purchaseExtra: () => Promise<boolean>
  getRemainingFree: () => number
  resetDaily: () => void
  resetState: () => void
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function generateId(): string {
  return `vr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// Mock evidence timeline for visualization
const mockTimelines: EvidenceTimelineItem[][] = [
  [
    { time: '10:23', source: '新华社', sourceIcon: '官方', title: '官方通报发布', summary: '相关部门发布正式通报，确认事件基本情况', credibility: 5 },
    { time: '10:45', source: '当事人微博', sourceIcon: '社交', title: '当事人回应', summary: '当事人通过社交媒体发布声明，回应核心质疑', credibility: 4 },
    { time: '11:02', source: '财经网', sourceIcon: '媒体', title: '媒体跟进报道', summary: '专业媒体进行深度采访，补充关键细节', credibility: 4 },
    { time: '11:30', source: '知乎热榜', sourceIcon: '讨论', title: '网友讨论', summary: '多位领域专家参与讨论，提供专业视角', credibility: 3 },
    { time: '12:15', source: '匿名论坛', sourceIcon: '匿名', title: '知情人士爆料', summary: '自称内部人士提供更多背景信息，待验证', credibility: 2 },
  ],
  [
    { time: '09:15', source: '微博热搜', sourceIcon: '热门', title: '事件首次曝光', summary: '相关话题登上热搜榜，引发广泛关注', credibility: 3 },
    { time: '09:40', source: '澎湃新闻', sourceIcon: '媒体', title: '权威媒体报道', summary: '主流媒体发布初步报道，梳理已知事实', credibility: 5 },
    { time: '10:10', source: '工作室声明', sourceIcon: '官方', title: '方发表声明', summary: '相关方发布正式声明，否认部分指控', credibility: 4 },
    { time: '10:55', source: 'B站UP主', sourceIcon: '视频', title: '深度分析视频', summary: '知名UP主发布逐帧分析，指出多处疑点', credibility: 3 },
  ],
]

const mockChatSequences: Record<AgentPhase, ChatMessage[]> = {
  searching: [
    { id: 's1', text: '正在搜索相关信息...', type: 'system' },
    { id: 's2', text: '已检索到 23 条相关报道', type: 'system' },
    { id: 's3', text: '正在筛选高可信度信源...', type: 'system' },
  ],
  verifying: [
    { id: 'v1', text: '正在交叉验证来源可信度...', type: 'system' },
    { id: 'v2', text: '发现 3 处信息矛盾点', type: 'evidence' },
    { id: 'v3', text: '已分析 12 个独立信息源', type: 'system' },
  ],
  analyzing: [
    { id: 'a1', text: '正在生成求证报告...', type: 'system' },
    { id: 'a2', text: '综合评估信息可信度', type: 'system' },
    { id: 'a3', text: '报告生成完毕', type: 'system' },
  ],
  idle: [],
  done: [],
}

export const useVerificationStore = create<VerificationState>((set, get) => ({
  dailyFreeUsed: 0,
  extraPurchased: 0,
  maxFreePerDay: 3,
  currentRequest: null,
  isAnalyzing: false,
  agentPhase: 'idle',
  chatMessages: [],
  evidenceTimeline: [],
  result: null,

  submitVerification: async (content: string, type: 'text' | 'link') => {
    const { dailyFreeUsed, extraPurchased, maxFreePerDay } = get()

    const remainingFree = maxFreePerDay - dailyFreeUsed
    if (remainingFree <= 0 && extraPurchased <= 0) {
      throw new Error('QUOTA_EXHAUSTED')
    }

    const request: VerificationRequest = {
      id: generateId(),
      userId: 'current',
      content,
      type,
      status: 'analyzing',
      createdAt: new Date().toISOString(),
    }

    // 选择随机 mock 时间线
    const timelineIndex = Math.random() > 0.5 ? 0 : 1
    const timeline = mockTimelines[timelineIndex]

    set({
      currentRequest: request,
      isAnalyzing: true,
      agentPhase: 'searching',
      chatMessages: [],
      evidenceTimeline: [],
      result: null,
    })

    // Phase 1: Searching — 逐步显示聊天消息
    const searchMessages = mockChatSequences.searching
    for (let i = 0; i < searchMessages.length; i++) {
      await new Promise(r => setTimeout(r, 600 + Math.random() * 400))
      set(state => ({
        chatMessages: [...state.chatMessages, searchMessages[i]],
      }))
    }

    // 显示前两条证据时间线
    await new Promise(r => setTimeout(r, 500))
    set({ evidenceTimeline: timeline.slice(0, 2) })

    // Phase 2: Verifying
    set({ agentPhase: 'verifying' })
    const verifyMessages = mockChatSequences.verifying
    for (let i = 0; i < verifyMessages.length; i++) {
      await new Promise(r => setTimeout(r, 700 + Math.random() * 300))
      set(state => ({
        chatMessages: [...state.chatMessages, verifyMessages[i]],
      }))
    }

    // 显示更多证据
    await new Promise(r => setTimeout(r, 400))
    set({ evidenceTimeline: timeline.slice(0, 4) })

    // Phase 3: Analyzing
    set({ agentPhase: 'analyzing' })
    const analyzeMessages = mockChatSequences.analyzing
    for (let i = 0; i < analyzeMessages.length; i++) {
      await new Promise(r => setTimeout(r, 500 + Math.random() * 300))
      set(state => ({
        chatMessages: [...state.chatMessages, analyzeMessages[i]],
      }))
    }

    // 显示完整时间线
    await new Promise(r => setTimeout(r, 300))
    set({ evidenceTimeline: timeline })

    // 调用实际 API 获取结果
    try {
      const response: any = await api.verify(content, type)
      const result: VerificationResult = {
        credibilityLevel: response.result?.credibility_level || response.credibility_level || 3,
        summary: response.result?.summary || response.summary || '',
        keyEvidence: response.result?.key_evidence || response.key_evidence || [],
        tendency: response.result?.tendency || response.tendency || '',
        evidenceTimeline: timeline,
      }

      if (remainingFree > 0) {
        set(state => ({
          dailyFreeUsed: state.dailyFreeUsed + 1,
          result,
          agentPhase: 'done',
          isAnalyzing: false,
        }))
      } else {
        set(state => ({
          extraPurchased: state.extraPurchased - 1,
          result,
          agentPhase: 'done',
          isAnalyzing: false,
        }))
      }

      return result
    } catch (e) {
      // API 失败时使用 mock 结果
      const mockResult: VerificationResult = {
        credibilityLevel: 3,
        summary: '信息真伪混杂，核心事实难以完全确认，需等待更多权威信源披露。',
        keyEvidence: [
          '部分关键信息仅来自单一匿名信源，无法交叉验证',
          '相关方对此事保持沉默，未作出任何回应',
          '网络上存在多种相互矛盾的说法，暂无定论',
        ],
        tendency: '目前证据不足以判断真伪，信息中既有可信成分也有可疑之处，建议保持关注。',
        evidenceTimeline: timeline,
      }

      if (remainingFree > 0) {
        set(state => ({
          dailyFreeUsed: state.dailyFreeUsed + 1,
          result: mockResult,
          agentPhase: 'done',
          isAnalyzing: false,
        }))
      } else {
        set(state => ({
          extraPurchased: state.extraPurchased - 1,
          result: mockResult,
          agentPhase: 'done',
          isAnalyzing: false,
        }))
      }

      return mockResult
    }
  },

  purchaseExtra: async () => {
    try {
      set((state) => ({ extraPurchased: state.extraPurchased + 1 }))
      return true
    } catch {
      return false
    }
  },

  getRemainingFree: () => {
    const { dailyFreeUsed, maxFreePerDay } = get()
    return Math.max(0, maxFreePerDay - dailyFreeUsed)
  },

  resetDaily: () => {
    const today = getTodayKey()
    const storedDate = localStorage.getItem('verify_date_key')
    if (storedDate !== today) {
      localStorage.setItem('verify_date_key', today)
      set({ dailyFreeUsed: 0, extraPurchased: 0 })
    }
  },

  resetState: () => {
    set({
      isAnalyzing: false,
      agentPhase: 'idle',
      chatMessages: [],
      evidenceTimeline: [],
      result: null,
      currentRequest: null,
    })
  },
}))
