import { create } from 'zustand'
import type { Evidence } from '../types'

interface EvidenceState {
  // 佐证列表（按 melonId 分组）
  evidenceByMelon: Record<string, Evidence[]>

  // 当前用户的佐证
  userEvidence: Record<string, Evidence>  // melonId -> evidence

  // 添加佐证
  addEvidence: (melonId: string, evidence: Evidence) => void

  // 点赞/踩
  upvote: (evidenceId: string, melonId: string) => void
  downvote: (evidenceId: string, melonId: string) => void

  // 获取某瓜的佐证列表
  getEvidenceList: (melonId: string) => Evidence[]

  // 判定最佳佐证
  selectBestEvidence: (melonId: string) => void

  // 加载 Mock 佐证数据
  loadMockEvidence: (melonId: string) => void
}

export const useEvidenceStore = create<EvidenceState>((set, get) => ({
  evidenceByMelon: {},
  userEvidence: {},

  addEvidence: (melonId: string, evidence: Evidence) => {
    set((state) => ({
      evidenceByMelon: {
        ...state.evidenceByMelon,
        [melonId]: [...(state.evidenceByMelon[melonId] || []), evidence],
      },
      userEvidence: {
        ...state.userEvidence,
        [melonId]: evidence,
      },
    }))
  },

  upvote: (evidenceId: string, melonId: string) => {
    set((state) => {
      const list = state.evidenceByMelon[melonId] || []
      return {
        evidenceByMelon: {
          ...state.evidenceByMelon,
          [melonId]: list.map((e) =>
            e.id === evidenceId ? { ...e, upvotes: e.upvotes + 1 } : e
          ),
        },
      }
    })
  },

  downvote: (evidenceId: string, melonId: string) => {
    set((state) => {
      const list = state.evidenceByMelon[melonId] || []
      return {
        evidenceByMelon: {
          ...state.evidenceByMelon,
          [melonId]: list.map((e) =>
            e.id === evidenceId ? { ...e, downvotes: e.downvotes + 1 } : e
          ),
        },
      }
    })
  },

  getEvidenceList: (melonId: string) => {
    return get().evidenceByMelon[melonId] || []
  },

  selectBestEvidence: (melonId: string) => {
    set((state) => {
      const list = state.evidenceByMelon[melonId] || []
      if (list.length === 0) return state

      // 清除所有 best 标记
      const clearedList = list.map((e) => ({ ...e, isBest: false }))

      // 找出点赞最高的
      const best = clearedList.reduce((prev, curr) =>
        curr.upvotes - curr.downvotes > prev.upvotes - prev.downvotes ? curr : prev
      )

      // 设置最佳佐证
      return {
        evidenceByMelon: {
          ...state.evidenceByMelon,
          [melonId]: clearedList.map((e) =>
            e.id === best.id ? { ...e, isBest: true } : e
          ),
        },
      }
    })
  },

  loadMockEvidence: (melonId: string) => {
    // 动态导入 mock 数据
    import('../services/mockData').then(({ generateMockEvidence }) => {
      const mockData = generateMockEvidence(melonId)
      set((state) => ({
        evidenceByMelon: {
          ...state.evidenceByMelon,
          [melonId]: mockData,
        },
      }))
      // 自动评选最佳佐证
      get().selectBestEvidence(melonId)
    })
  },
}))
