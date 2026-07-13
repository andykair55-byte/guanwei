import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Snapshot {
  id: string
  timestamp: number
  label: string
  content: string
  draftTopic: string
  agentType?: string
  locked: boolean
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
    locked?: boolean
  }) => void

  restoreSnapshot: (id: string) => Snapshot | null

  toggleLock: (id: string) => void

  listSnapshots: () => Snapshot[]

  clearAll: () => void

  canUndo: () => boolean

  undo: () => Snapshot | null
}

let snapshotIdCounter = 0

function evictSnapshots(snapshots: Snapshot[]): Snapshot[] {
  if (snapshots.length <= MAX_SNAPSHOTS) return snapshots
  const unlocked = snapshots.filter(s => !s.locked)
  const locked = snapshots.filter(s => s.locked)
  const toRemove = unlocked.length - (MAX_SNAPSHOTS - locked.length)
  if (toRemove <= 0) return snapshots
  return [...unlocked.slice(toRemove), ...locked]
}

export const useSnapshotStore = create<SnapshotStore>()(
  persist(
    (set, get) => ({
      snapshots: [],
      currentSnapshotId: null,

      createSnapshot: ({ content, draftTopic, label, agentType, locked = false }) => {
        const snapshot: Snapshot = {
          id: `snap-${Date.now()}-${++snapshotIdCounter}`,
          timestamp: Date.now(),
          label,
          content,
          draftTopic,
          agentType,
          locked,
        }
        set((state) => {
          const newSnapshots = evictSnapshots([...state.snapshots, snapshot])
          return {
            snapshots: newSnapshots,
            currentSnapshotId: snapshot.id,
          }
        })
      },

      restoreSnapshot: (id) => {
        const snapshot = get().snapshots.find(s => s.id === id)
        if (!snapshot) return null

        const current = get().snapshots.find(s => s.id === get().currentSnapshotId)
        if (current && current.id !== id) {
          const restorePoint: Snapshot = {
            id: `snap-${Date.now()}-${++snapshotIdCounter}`,
            timestamp: Date.now(),
            label: '回退前的状态',
            content: current.content,
            draftTopic: current.draftTopic,
            locked: false,
          }
          set((state) => ({
            snapshots: evictSnapshots([...state.snapshots, restorePoint]),
            currentSnapshotId: id,
          }))
        } else {
          set({ currentSnapshotId: id })
        }

        return snapshot
      },

      toggleLock: (id) => set((state) => ({
        snapshots: state.snapshots.map(s =>
          s.id === id ? { ...s, locked: !s.locked } : s
        ),
      })),

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
