import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Workspace, WorkspaceStatus, PlatformContent, WorkspaceSource, WorkspaceTag } from '../types/workspace'
import { createEmptyWorkspace } from '../types/workspace'
import type { CanonicalDraft } from '../types/canonicalDraft'

interface WorkspaceStore {
  workspaces: Workspace[]
  currentId: string | null

  createWorkspace: (params?: {
    topic?: string
    source?: WorkspaceSource
    tags?: WorkspaceTag[]
    platformOrder?: string[]
  }) => Workspace
  deleteWorkspace: (id: string) => void
  switchWorkspace: (id: string) => void
  renameWorkspace: (id: string, title: string) => void
  updateTopic: (id: string, topic: string) => void
  setStatus: (id: string, status: WorkspaceStatus) => void
  toggleFavorite: (id: string) => void
  archive: (id: string) => void
  unarchive: (id: string) => void

  addPlatform: (id: string, platform: string) => void
  removePlatform: (id: string, platform: string) => void
  reorderPlatforms: (id: string, newOrder: string[]) => void

  updateDraft: (partial: Partial<CanonicalDraft>) => void
  updatePlatformContent: (platform: string, content: Partial<PlatformContent>) => void

  getCurrent: () => Workspace | null
  getByStatus: (status: WorkspaceStatus) => Workspace[]
  getRecent: (limit?: number) => Workspace[]
  getFavorites: () => Workspace[]

  onboardingCompleted: boolean
  completeOnboarding: () => void
  resetOnboarding: () => void
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      workspaces: [],
      currentId: null,

      createWorkspace: (params = {}) => {
        const ws = createEmptyWorkspace(
          params.topic,
          params.source,
          params.tags,
          params.platformOrder,
        )
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
          w.id === id
            ? { ...w, topic, title: w.title === '新工作空间' ? topic : w.title, status: w.status === 'draft' ? 'active' as WorkspaceStatus : w.status, updatedAt: new Date().toISOString() }
            : w
        ),
      })),

      setStatus: (id, status) => set((state) => ({
        workspaces: state.workspaces.map(w =>
          w.id === id
            ? { ...w, status, previousStatus: status === 'archived' ? w.status : w.previousStatus, updatedAt: new Date().toISOString() }
            : w
        ),
      })),

      toggleFavorite: (id) => set((state) => ({
        workspaces: state.workspaces.map(w =>
          w.id === id ? { ...w, isFavorite: !w.isFavorite, updatedAt: new Date().toISOString() } : w
        ),
      })),

      archive: (id) => set((state) => ({
        workspaces: state.workspaces.map(w =>
          w.id === id
            ? { ...w, previousStatus: w.status, status: 'archived' as WorkspaceStatus, updatedAt: new Date().toISOString() }
            : w
        ),
      })),

      unarchive: (id) => set((state) => ({
        workspaces: state.workspaces.map(w =>
          w.id === id
            ? { ...w, status: w.previousStatus || 'active', previousStatus: undefined, updatedAt: new Date().toISOString() }
            : w
        ),
      })),

      addPlatform: (id, platform) => set((state) => ({
        workspaces: state.workspaces.map(w =>
          w.id === id && !w.platformOrder.includes(platform)
            ? {
                ...w,
                platformOrder: [...w.platformOrder, platform],
                platformContents: {
                  ...w.platformContents,
                  [platform]: w.platformContents[platform] || { title: '', content: '', generated: false, overridden: false },
                },
                updatedAt: new Date().toISOString(),
              }
            : w
        ),
      })),

      removePlatform: (id, platform) => set((state) => ({
        workspaces: state.workspaces.map(w =>
          w.id === id
            ? { ...w, platformOrder: w.platformOrder.filter(p => p !== platform), updatedAt: new Date().toISOString() }
            : w
        ),
      })),

      reorderPlatforms: (id, newOrder) => set((state) => ({
        workspaces: state.workspaces.map(w =>
          w.id === id ? { ...w, platformOrder: newOrder, updatedAt: new Date().toISOString() } : w
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
              ? {
                  ...w,
                  platformContents: {
                    ...w.platformContents,
                    [platform]: {
                      ...w.platformContents[platform],
                      ...content,
                      overridden: content.content !== undefined ? true : (w.platformContents[platform]?.overridden || false),
                      overriddenAt: content.content !== undefined ? new Date().toISOString() : w.platformContents[platform]?.overriddenAt,
                      generatedAt: content.generated ? new Date().toISOString() : w.platformContents[platform]?.generatedAt,
                    },
                  },
                  updatedAt: new Date().toISOString(),
                }
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

      getFavorites: () => get().workspaces.filter(w => w.isFavorite),

      onboardingCompleted: false,
      completeOnboarding: () => set({ onboardingCompleted: true }),
      resetOnboarding: () => set({ onboardingCompleted: false }),
    }),
    { name: 'guanwei-workspaces' }
  )
)
