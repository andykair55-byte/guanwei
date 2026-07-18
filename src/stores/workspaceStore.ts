import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Workspace, WorkspaceStatus, PlatformContent, WorkspaceSource, WorkspaceTag } from '../types/workspace'
import { createEmptyWorkspace } from '../types/workspace'
import type { CanonicalDraft } from '../types/canonicalDraft'
import { createEmptyDraft } from '../types/canonicalDraft'
import { workspaceApi, type WorkspaceDTO } from '../services/workspaceApi'

function dtoToWorkspace(dto: WorkspaceDTO, base?: Partial<Workspace>): Workspace {
  const platformContents: Record<string, PlatformContent> = {}
  for (const [k, v] of Object.entries(dto.platform_contents || {})) {
    platformContents[k] = {
      title: v?.title || '',
      content: v?.content || '',
      generated: !!v?.generated,
      overridden: false,
    }
  }
  return {
    id: dto.workspace_id,
    title: dto.title || dto.topic || '新工作空间',
    topic: dto.topic || '',
    status: (dto.status as WorkspaceStatus) || 'draft',
    isFavorite: base?.isFavorite ?? false,
    tags: base?.tags ?? [],
    source: base?.source ?? { type: 'manual' },
    platformOrder: dto.platform_order || [],
    draft: createEmptyDraft(dto.topic || ''),
    platformContents,
    snapshots: [],
    strategy: dto.strategy,
    createdAt: dto.created_at || new Date().toISOString(),
    updatedAt: dto.updated_at || new Date().toISOString(),
  }
}

interface WorkspaceStore {
  workspaces: Workspace[]
  currentId: string | null

  createWorkspace: (params?: {
    topic?: string
    source?: WorkspaceSource
    tags?: WorkspaceTag[]
    platformOrder?: string[]
  }) => Workspace
  fetchWorkspaces: () => Promise<void>
  runWorkspace: (id: string, params?: { strategy?: string; customDag?: Record<string, unknown> }) => Promise<void>
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
        // 本地立即创建（保留 localStorage 兜底逻辑）
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

        // API 优先：同步触发后端创建，成功后用后端 ID/时间戳回写本地
        workspaceApi
          .create({
            topic: params.topic || '',
            platform_order: params.platformOrder,
            title: params.topic,
          })
          .then((dto) => {
            set((state) => ({
              workspaces: state.workspaces.map((w) =>
                w.id === ws.id
                  ? {
                      ...w,
                      id: dto.workspace_id,
                      strategy: dto.strategy || w.strategy,
                      createdAt: dto.created_at || w.createdAt,
                      updatedAt: dto.updated_at || w.updatedAt,
                    }
                  : w,
              ),
              currentId: state.currentId === ws.id ? dto.workspace_id : state.currentId,
            }))
          })
          .catch((e) => {
            console.error('[workspaceStore] createWorkspace API 失败，降级到 localStorage:', e)
            // 降级：本地 workspace 已创建，localStorage 由 persist 自动同步
          })
        return ws
      },

      fetchWorkspaces: async () => {
        try {
          const dtos = await workspaceApi.list()
          const workspaces = dtos.map((dto) => dtoToWorkspace(dto))
          set({ workspaces })
        } catch (e) {
          console.error('[workspaceStore] fetchWorkspaces API 失败，降级到 localStorage:', e)
          // 降级：保留 persist 从 localStorage 加载的现有 state
        }
      },

      runWorkspace: async (id, params = {}) => {
        // 本地先标记 running
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === id
              ? { ...w, status: 'running' as WorkspaceStatus, updatedAt: new Date().toISOString() }
              : w,
          ),
        }))
        try {
          const result = await workspaceApi.run(id, {
            strategy: params.strategy,
            custom_dag: params.customDag,
          })
          set((state) => ({
            workspaces: state.workspaces.map((w) =>
              w.id === id
                ? {
                    ...w,
                    status: (result.status as WorkspaceStatus) || w.status,
                    updatedAt: new Date().toISOString(),
                  }
                : w,
            ),
          }))
        } catch (e) {
          console.error('[workspaceStore] runWorkspace API 失败，降级到 localStorage:', e)
          // 降级：本地状态已设为 running，依赖后续本地逻辑
        }
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
