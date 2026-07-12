import { useState } from 'react'
import { useSnapshotStore } from '../../stores/snapshotStore'
import { Clock, ChevronRight } from 'lucide-react'

interface VersionBarProps {
  onRestore?: (content: string, topic: string) => void
  className?: string
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  return `${Math.floor(hours / 24)}天前`
}

export default function VersionBar({ onRestore, className }: VersionBarProps) {
  const snapshots = useSnapshotStore(s => s.snapshots)
  const currentId = useSnapshotStore(s => s.currentSnapshotId)
  const restoreSnapshot = useSnapshotStore(s => s.restoreSnapshot)
  const [showAll, setShowAll] = useState(false)

  const recent = [...snapshots].reverse().slice(0, showAll ? undefined : 5)

  if (snapshots.length === 0) {
    return (
      <div className={`flex items-center justify-between px-4 py-2 text-[12px] text-ink-400 border-t border-ink-100 ${className || ''}`}>
        <div className="flex items-center gap-1.5">
          <Clock size={13} />
          <span>版本历史</span>
        </div>
        <div className="flex items-center gap-1 text-emerald-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          自动保存已开启
        </div>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 px-4 py-2 text-[12px] border-t border-ink-100 bg-paper-50/50 ${className || ''}`}>
      <div className="flex items-center gap-1.5 text-ink-500 shrink-0">
        <Clock size={13} />
        <span>版本历史</span>
      </div>
      <div className="flex items-center gap-1 overflow-x-auto flex-1 scrollbar-none">
        {recent.map((snap, idx) => {
          const versionNum = snapshots.length - snapshots.findIndex(s => s.id === snap.id)
          const isCurrent = snap.id === currentId
          return (
            <button
              key={snap.id}
              onClick={() => {
                const restored = restoreSnapshot(snap.id)
                if (restored && onRestore) {
                  onRestore(restored.content, restored.draftTopic)
                }
              }}
              className={`px-2 py-0.5 rounded-md text-[11px] whitespace-nowrap transition-colors ${
                isCurrent
                  ? 'bg-seal-100 text-seal-700 font-medium'
                  : 'bg-paper-0 text-ink-400 hover:bg-paper-100 hover:text-ink-600 border border-ink-100'
              }`}
            >
              V{versionNum} {formatTimeAgo(snap.timestamp)}
              {idx === 0 && isCurrent && ' (自动保存)'}
            </button>
          )
        })}
        {snapshots.length > 5 && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="text-ink-400 hover:text-seal-600 inline-flex items-center gap-0.5 shrink-0"
          >
            查看全部 <ChevronRight size={12} />
          </button>
        )}
      </div>
      <div className="flex items-center gap-1 text-emerald-600 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        自动保存已开启
      </div>
    </div>
  )
}
