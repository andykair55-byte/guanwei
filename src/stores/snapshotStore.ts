import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Snapshot {
  id: string
  timestamp: number
  label: string           // 操作描述（如"采纳搜索结果"、"自动生成完成"）
  content: string         // 编辑器内容快照
  draftTopic: string      // 主题快照
  agentType?: string      // 触发快照的Agent
}

const MAX_SNAPSHOTS = 50

interface SnapshotStore {
  snapshots: Snapshot[]
  currentSnapshotId: string | null

  createSnapshot: (params: {
    content: string
    draftTopic: string
    label: string
    agentType?: string
  }) => void

  restoreSnapshot: (id: string) => Snapshot | null

  listSnapshots: () => Snapshot[]

  clearAll: () => void

  canUndo: () => boolean
  undo: () => Snapshot | null
}

let snapshotIdCounter = 0

export const useSnapshotStore = create<SnapshotStore>()(
  persist(
    (set, get) => ({
      snapshots: [],
      currentSnapshotId: null,

      createSnapshot: ({ content, draftTopic, label, agentType }) => {
        const snapshot: Snapshot = {
          id: `snap-${Date.now()}-${++snapshotIdCounter}`,
          timestamp: Date.now(),
          label,
          content,
          draftTopic,
          agentType,
        }
        set((state) => {
          const newSnapshots = [...state.snapshots, snapshot]
          // 超过上限淘汰最旧的
          if (newSnapshots.length > MAX_SNAPSHOTS) {
            newSnapshots.shift()
          }
          return {
            snapshots: newSnapshots,
            currentSnapshotId: snapshot.id,
          }
        })
      },

      restoreSnapshot: (id) => {
        const snapshot = get().snapshots.find(s => s.id === id)
        if (!snapshot) return null

        // 创建当前状态的快照（以便再次回退）
        const current = get().snapshots.find(s => s.id === get().currentSnapshotId)
        if (current && current.id !== id) {
          const restorePoint: Snapshot = {
            id: `snap-${Date.now()}-${++snapshotIdCounter}`,
            timestamp: Date.now(),
            label: `回退前的状态`,
            content: current.content,
            draftTopic: current.draftTopic,
          }
          set((state) => ({
            snapshots: [...state.snapshots, restorePoint].slice(-MAX_SNAPSHOTS),
            currentSnapshotId: id,
          }))
        } else {
          set({ currentSnapshotId: id })
        }

        return snapshot
      },

      listSnapshots: () => get().snapshots,

      clearAll: () => set({ snapshots: [], currentSnapshotId: null }),

      canUndo: () => {
        const snaps = get().snapshots
        const currentIdx = snaps.findIndex(s => s.id === get().currentSnapshotId)
        return currentIdx > 0
      },

      undo: () => {
        const snaps = get().snapshots
        const currentIdx = snaps.findIndex(s => s.id === get().currentSnapshotId)
        if (currentIdx <= 0) return null

        const prevSnapshot = snaps[currentIdx - 1]
        set({ currentSnapshotId: prevSnapshot.id })
        return prevSnapshot
      },
    }),
    { name: 'guanwei-snapshots' }
  )
)
