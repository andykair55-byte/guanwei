import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CanonicalDraft, FactNode, ClaimNode, ViewpointNode, SectionNode } from '../types/canonicalDraft'
import { createEmptyDraft } from '../types/canonicalDraft'

interface CanonicalStore {
  draft: CanonicalDraft
  setDraft: (draft: CanonicalDraft) => void
  setTopic: (topic: string) => void
  updateFacts: (facts: FactNode[]) => void
  addFacts: (facts: FactNode[]) => void
  updateClaims: (claims: ClaimNode[]) => void
  addClaims: (claims: ClaimNode[]) => void
  updateViewpoints: (viewpoints: ViewpointNode[]) => void
  updateStructure: (structure: SectionNode[]) => void
  addReference: (ref: CanonicalDraft['references'][0]) => void
  updateMetadata: (partial: Partial<CanonicalDraft['metadata']>) => void
  reset: () => void
  getDraft: () => CanonicalDraft
}

export const useCanonicalStore = create<CanonicalStore>()(
  persist(
    (set, get) => ({
      draft: createEmptyDraft(),

      setDraft: (draft) => set({ draft: { ...draft, metadata: { ...draft.metadata, updatedAt: new Date().toISOString() } } }),

      setTopic: (topic) => set((state) => ({
        draft: { ...state.draft, topic, metadata: { ...state.draft.metadata, updatedAt: new Date().toISOString() } }
      })),

      updateFacts: (facts) => set((state) => ({
        draft: { ...state.draft, facts, metadata: { ...state.draft.metadata, updatedAt: new Date().toISOString() } }
      })),

      addFacts: (newFacts) => set((state) => ({
        draft: {
          ...state.draft,
          facts: [...state.draft.facts, ...newFacts],
          metadata: { ...state.draft.metadata, updatedAt: new Date().toISOString() }
        }
      })),

      updateClaims: (claims) => set((state) => ({
        draft: { ...state.draft, claims, metadata: { ...state.draft.metadata, updatedAt: new Date().toISOString() } }
      })),

      addClaims: (newClaims) => set((state) => ({
        draft: {
          ...state.draft,
          claims: [...state.draft.claims, ...newClaims],
          metadata: { ...state.draft.metadata, updatedAt: new Date().toISOString() }
        }
      })),

      updateViewpoints: (viewpoints) => set((state) => ({
        draft: { ...state.draft, viewpoints, metadata: { ...state.draft.metadata, updatedAt: new Date().toISOString() } }
      })),

      updateStructure: (structure) => set((state) => ({
        draft: { ...state.draft, structure, metadata: { ...state.draft.metadata, updatedAt: new Date().toISOString() } }
      })),

      addReference: (ref) => set((state) => ({
        draft: {
          ...state.draft,
          references: [...state.draft.references, ref],
          metadata: { ...state.draft.metadata, updatedAt: new Date().toISOString() }
        }
      })),

      updateMetadata: (partial) => set((state) => ({
        draft: {
          ...state.draft,
          metadata: { ...state.draft.metadata, ...partial, updatedAt: new Date().toISOString() }
        }
      })),

      reset: () => set({ draft: createEmptyDraft() }),

      getDraft: () => get().draft,
    }),
    { name: 'guanwei-canonical-draft' }
  )
)
