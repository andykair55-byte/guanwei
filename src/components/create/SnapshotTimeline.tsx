import { useState } from 'react'
import { Clock, History, ChevronDown } from 'lucide-react'
import { useSnapshotStore, type Snapshot } from '../../stores/snapshotStore'

interface SnapshotTimelineProps {
  onRestore: (snapshot: Snapshot) => void // 回退到某个快照
  className?: string
}

/** 格式化为 HH:MM:SS */
function formatTime(ts: number): string {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

/**
 * 快照时间线 —— 折叠式面板，展示历史快照，点击节点回退。
 * 默认收起，展开后显示时间线节点，当前快照高亮。
 */
export default function SnapshotTimeline({ onRestore, className = '' }: SnapshotTimelineProps) {
  const [open, setOpen] = useState(false)
  const snapshots = useSnapshotStore((s) => s.snapshots)
  const currentSnapshotId = useSnapshotStore((s) => s.currentSnapshotId)

  const count = snapshots.length

  return (
    <div
      className={`rounded-xl border border-ink-100 bg-paper-0 overflow-hidden ${className}`}
    >
      {/* 标题栏 */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 bg-paper-50 cursor-pointer hover:bg-paper-100 transition-colors"
      >
        <div className="flex items-center gap-2 text-[13px] font-medium text-ink-700">
          <Clock className="w-3.5 h-3.5 text-ink-400" />
          <span>历史记录</span>
          {count > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-paper-200 text-[11px] text-ink-500 font-normal">
              {count}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-ink-400 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* 时间线 */}
      {open && (
        <div className="px-3 py-2 space-y-1 max-h-[200px] overflow-y-auto">
          {count === 0 ? (
            <div className="flex items-center justify-center gap-2 py-6 text-[12px] text-ink-400">
              <History className="w-3.5 h-3.5" />
              <span>暂无历史记录</span>
            </div>
          ) : (
            snapshots.map((snap, idx) => {
              const isCurrent = snap.id === currentSnapshotId
              const isLast = idx === snapshots.length - 1
              return (
                <div key={snap.id} className="relative">
                  {/* 连接竖线：从当前节点底部延伸到下一节点圆点顶部 */}
                  {!isLast && (
                    <span
                      className="absolute left-[15px] top-4 -bottom-2.5 w-px bg-ink-100"
                      aria-hidden
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => onRestore(snap)}
                    className={`relative w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-paper-50 cursor-pointer text-[12px] border-l-2 ${
                      isCurrent
                        ? 'bg-seal-50/30 border-seal-600'
                        : 'border-transparent'
                    }`}
                  >
                    {/* 节点圆点 */}
                    <span
                      className={`relative z-10 w-2.5 h-2.5 rounded-full shrink-0 ${
                        isCurrent ? 'bg-seal-600' : 'bg-ink-300'
                      }`}
                    />
                    {/* 时间戳 */}
                    <span className="text-ink-400 font-mono tabular-nums shrink-0 text-[11px]">
                      {formatTime(snap.timestamp)}
                    </span>
                    {/* 操作描述 */}
                    <span className="text-ink-700 truncate flex-1 text-left">
                      {snap.label}
                    </span>
                  </button>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
