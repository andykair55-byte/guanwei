// src/stores/debateCollectionStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** 收藏的辩论记录 */
export interface DebateRecord {
  id: string
  roomId: string
  topic: string
  affirmLabel: string
  negateLabel: string
  winner: string
  mvpName: string
  affirmScore: number
  negateScore: number
  highlight: string
  source: 'ai-battle' | 'human-battle' | 'national-4v4' | 'round-table'
  collectedAt: string
}

interface CollectionState {
  records: DebateRecord[]
  addRecord: (record: DebateRecord) => void
  removeRecord: (id: string) => void
  isCollected: (roomId: string) => boolean
  clearAll: () => void
}

export const useDebateCollectionStore = create<CollectionState>()(
  persist(
    (set, get) => ({
      records: [],
      addRecord: (record) => {
        const existing = get().records.find(r => r.roomId === record.roomId)
        if (existing) return
        set(state => ({ records: [record, ...state.records] }))
      },
      removeRecord: (id) => {
        set(state => ({ records: state.records.filter(r => r.id !== id) }))
      },
      isCollected: (roomId) => {
        return get().records.some(r => r.roomId === roomId)
      },
      clearAll: () => set({ records: [] }),
    }),
    { name: 'debate-collection' },
  ),
)
