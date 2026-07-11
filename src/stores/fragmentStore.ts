import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * 碎片 — 工作间的最小信息单元
 * v1 兼容 ReferencePanel 的 Fragment 类型，后续可扩展 entryPoint/contextOrigin 等字段
 */
export interface Fragment {
  id: string
  type: 'link' | 'quote' | 'note'
  content: string
  source?: string
  sourceTitle?: string
}

/** 从瓜田/其他模块带入的上下文信息 */
export interface MelonContext {
  melonId: string
  title: string
  description: string
  evidenceCount: number
  evidences: Array<{
    id: string
    content: string
    userNickname: string
    direction: boolean
  }>
}

interface FragmentStore {
  /** 所有碎片（手动收集 + 上下文带入） */
  fragments: Fragment[]
  /** 当前关联的瓜上下文（从瓜田带入） */
  melonContext: MelonContext | null

  /** 添加碎片（最新的排最前） */
  addFragment: (f: Omit<Fragment, 'id'>) => void
  /** 删除碎片 */
  removeFragment: (id: string) => void
  /** 批量添加上下文碎片（瓜标题、描述、已有佐证等） */
  addContextFragments: (fs: Fragment[]) => void
  /** 设置瓜上下文（标题/描述/佐证列表） */
  setMelonContext: (ctx: MelonContext | null) => void
  /** 清空全部 */
  clear: () => void
}

export const useFragmentStore = create<FragmentStore>()(
  persist(
    (set) => ({
      fragments: [],
      melonContext: null,

      addFragment: (f) =>
        set((s) => ({
          fragments: [{ ...f, id: `frag-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }, ...s.fragments],
        })),

      removeFragment: (id) =>
        set((s) => ({ fragments: s.fragments.filter((f) => f.id !== id) })),

      addContextFragments: (fs) =>
        set((s) => ({ fragments: [...fs, ...s.fragments] })),

      setMelonContext: (ctx) => set({ melonContext: ctx }),

      clear: () => set({ fragments: [], melonContext: null }),
    }),
    { name: 'guanwei-fragments' }
  )
)
