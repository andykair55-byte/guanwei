import { useState } from 'react'
import { useSnapshotStore } from '../../stores/snapshotStore'

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
      <div className={`ws-version-bar ${className || ''}`}>
        <div className="ws-version-bar-label">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          版本历史
        </div>
        <div className="ws-version-autosave">
          <span className="dot" />
          自动保存已开启
        </div>
      </div>
    )
  }

  return (
    <div className={`ws-version-bar ${className || ''}`}>
      <div className="ws-version-bar-label">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        版本历史
      </div>
      <div className="ws-version-list">
        {recent.map((snap, idx) => {
          const versionNum = snapshots.length - snapshots.findIndex(s => s.id === snap.id)
          const isCurrent = snap.id === currentId
          return (
            <div key={snap.id} className="ws-version-item">
              <button
                className={`ws-version-btn${isCurrent ? ' current' : ''}`}
                onClick={() => {
                  const restored = restoreSnapshot(snap.id)
                  if (restored && onRestore) {
                    onRestore(restored.content, restored.draftTopic)
                  }
                }}
              >
                V{versionNum} {formatTimeAgo(snap.timestamp)}{idx === 0 && isCurrent ? ' (自动保存)' : ''}
              </button>
              <button
                className={`ws-version-lock-btn ${snap.locked ? 'locked' : 'unlocked'}`}
                onClick={() => {
                  useSnapshotStore.getState().toggleLock(snap.id)
                }}
                title={snap.locked ? '已锁定' : '锁定'}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {snap.locked ? (
                    <>
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                    </>
                  ) : (
                    <>
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          )
        })}
        {snapshots.length > 5 && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="ws-version-btn"
            style={{ border: 'none', color: 'var(--fg-muted)' }}
          >
            查看全部 →
          </button>
        )}
      </div>
      <div className="ws-version-autosave">
        <span className="dot" />
        自动保存已开启
      </div>
    </div>
  )
}