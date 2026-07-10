import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface SkeletonSection {
  id: string
  title: string
  points: string[]
  needsVerification: boolean
  accepted: boolean
}

export interface CreationDraft {
  topic: string
  stance: 'affirm' | 'negate' | 'neutral' | ''
  targetReader: string
  title: string
  content: string
  skeleton: SkeletonSection[] | null
  lastSaved: number
}

interface CreationStore {
  draft: CreationDraft
  isGenerating: boolean
  generateError: string | null
  setDraft: (partial: Partial<CreationDraft>) => void
  setSkeleton: (skeleton: SkeletonSection[]) => void
  removeSection: (id: string) => void
  updateSection: (id: string, partial: Partial<SkeletonSection>) => void
  toggleSectionAccepted: (id: string) => void
  setGenerating: (val: boolean) => void
  setGenerateError: (msg: string | null) => void
  reset: () => void
}

const emptyDraft: CreationDraft = {
  topic: '',
  stance: '',
  targetReader: '',
  title: '',
  content: '',
  skeleton: null,
  lastSaved: 0,
}

export const useCreationStore = create<CreationStore>()(
  persist(
    (set) => ({
      draft: emptyDraft,
      isGenerating: false,
      generateError: null,
      setDraft: (partial) => set((state) => ({
        draft: { ...state.draft, ...partial, lastSaved: Date.now() }
      })),
      setSkeleton: (skeleton) => set((state) => ({
        draft: { ...state.draft, skeleton, lastSaved: Date.now() }
      })),
      removeSection: (id) => set((state) => {
        if (!state.draft.skeleton) return state
        return {
          draft: {
            ...state.draft,
            skeleton: state.draft.skeleton.filter(s => s.id !== id),
            lastSaved: Date.now(),
          },
        }
      }),
      updateSection: (id, partial) => set((state) => {
        if (!state.draft.skeleton) return state
        return {
          draft: {
            ...state.draft,
            skeleton: state.draft.skeleton.map(s =>
              s.id === id ? { ...s, ...partial } : s
            ),
            lastSaved: Date.now(),
          },
        }
      }),
      toggleSectionAccepted: (id) => set((state) => {
        if (!state.draft.skeleton) return state
        return {
          draft: {
            ...state.draft,
            skeleton: state.draft.skeleton.map(s =>
              s.id === id ? { ...s, accepted: !s.accepted } : s
            ),
            lastSaved: Date.now(),
          },
        }
      }),
      setGenerating: (val) => set({ isGenerating: val }),
      setGenerateError: (msg) => set({ generateError: msg }),
      reset: () => set({ draft: emptyDraft, isGenerating: false, generateError: null }),
    }),
    { name: 'guanwei-creation-draft' }
  )
)
