import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Workspace, WorkspaceStatus, PlatformContent } from '../types/workspace'
import { createEmptyWorkspace } from '../types/workspace'
import type { CanonicalDraft } from '../types/canonicalDraft'

interface WorkspaceStore {
  workspaces: Workspace[]
  currentId: string | null

  createWorkspace: (topic?: string) => Workspace
  deleteWorkspace: (id: string) => void
  switchWorkspace: (id: string) => void
  renameWorkspace: (id: string, title: string) => void
  updateTopic: (id: string, topic: string) => void
  setStatus: (id: string, status: WorkspaceStatus) => void

  updateDraft: (partial: Partial<CanonicalDraft>) => void
  updatePlatformContent: (platform: string, content: Partial<PlatformContent>) => void

  getCurrent: () => Workspace | null
  getByStatus: (status: WorkspaceStatus) => Workspace[]
  getRecent: (limit?: number) => Workspace[]
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      workspaces: [],
      currentId: null,

      createWorkspace: (topic = '') => {
        const ws = createEmptyWorkspace(topic)
        set((state) => ({
          workspaces: [ws, ...state.workspaces],
          currentId: ws.id,
        }))
        return ws
      },

      deleteWorkspace: (id) => set((state) => {
        const remaining = state.workspaces.filter(w => w.id !== id)
        return {
          workspaces: remaining,
          currentId: state.currentId === id ? (remaining[0]?.id || null) : state.currentId,
        }
      }),

      switchWorkspace: (id) => set({ currentId: id }),

      renameWorkspace: (id, title) => set((state) => ({
        workspaces: state.workspaces.map(w =>
          w.id === id ? { ...w, title, updatedAt: new Date().toISOString() } : w
        ),
      })),

      updateTopic: (id, topic) => set((state) => ({
        workspaces: state.workspaces.map(w =>
          w.id === id ? { ...w, topic, title: w.title === '新工作空间' ? topic : w.title, updatedAt: new Date().toISOString() } : w
        ),
      })),

      setStatus: (id, status) => set((state) => ({
        workspaces: state.workspaces.map(w =>
          w.id === id ? { ...w, status, updatedAt: new Date().toISOString() } : w
        ),
      })),

      updateDraft: (partial) => set((state) => {
        if (!state.currentId) return state
        return {
          workspaces: state.workspaces.map(w =>
            w.id === state.currentId
              ? { ...w, draft: { ...w.draft, ...partial, metadata: { ...w.draft.metadata, ...(partial.metadata || {}), updatedAt: new Date().toISOString() } }, updatedAt: new Date().toISOString() }
              : w
          ),
        }
      }),

      updatePlatformContent: (platform, content) => set((state) => {
        if (!state.currentId) return state
        return {
          workspaces: state.workspaces.map(w =>
            w.id === state.currentId
              ? { ...w, platformContents: { ...w.platformContents, [platform]: { ...w.platformContents[platform], ...content } }, updatedAt: new Date().toISOString() }
              : w
          ),
        }
      }),

      getCurrent: () => {
        const { workspaces, currentId } = get()
        return workspaces.find(w => w.id === currentId) || null
      },

      getByStatus: (status) => get().workspaces.filter(w => w.status === status),

      getRecent: (limit = 10) => {
        return [...get().workspaces]
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, limit)
      },
    }),
    { name: 'guanwei-workspaces' }
  )
)
