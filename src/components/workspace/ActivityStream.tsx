import { useEffect, useRef, useState, useMemo } from 'react'
import EventCard from './EventCard'
import { useActivityStore } from '../../stores/activityStore'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import type { ActivityEvent, AgentTypeLabel } from '../../types/activity'
import { Filter, Settings } from 'lucide-react'

interface ActivityStreamProps {
  onAction?: (actionId: string, event: ActivityEvent) => void
  onQuickReply?: (text: string) => void
  className?: string
}

const FILTERS: { key: 'all' | AgentTypeLabel; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'search', label: '搜索员' },
  { key: 'research', label: '研究员' },
  { key: 'orchestrator', label: '指挥官' },
  { key: 'writing', label: '写作员' },
  { key: 'verify', label: '核查员' },
]

export default function ActivityStream({ onAction, onQuickReply, className }: ActivityStreamProps) {
  const currentId = useWorkspaceStore(s => s.currentId)
  const eventsByWorkspace = useActivityStore(s => s.eventsByWorkspace)
  const filter = useActivityStore(s => s.filter)
  const setFilter = useActivityStore(s => s.setFilter)
  const containerRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  const events = useMemo(() => {
    if (!currentId) return []
    const all = eventsByWorkspace[currentId] || []
    if (filter === 'all') return all
    return all.filter(e => e.agentType === filter)
  }, [eventsByWorkspace, currentId, filter])

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [events, autoScroll])

  const handleScroll = () => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
    setAutoScroll(isAtBottom)
  }

  return (
    <div className={`flex flex-col h-full bg-paper-0 border-l border-ink-100 ${className || ''}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-ink-100">
        <h3 className="text-[14px] font-semibold text-ink-900">工作空间活动流</h3>
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded-lg hover:bg-paper-100 text-ink-400 hover:text-ink-600 transition-colors">
            <Filter size={15} />
          </button>
          <button className="p-1.5 rounded-lg hover:bg-paper-100 text-ink-400 hover:text-ink-600 transition-colors">
            <Settings size={15} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 px-3 py-2 border-b border-ink-100 overflow-x-auto scrollbar-none">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-2.5 py-1 rounded-full text-[12px] font-medium whitespace-nowrap transition-colors ${
              filter === f.key
                ? 'bg-seal-600 text-white'
                : 'bg-paper-100 text-ink-500 hover:bg-paper-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin"
      >
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-ink-300 text-[13px]">
            <p>开始创作后，这里会显示Agent的工作动态</p>
          </div>
        ) : (
          <>
            {events.map(event => (
              <EventCard
                key={event.id}
                event={event}
                onAction={onAction}
                onQuickReply={onQuickReply}
              />
            ))}

            {!autoScroll && (
              <button
                onClick={() => {
                  setAutoScroll(true)
                  if (containerRef.current) {
                    containerRef.current.scrollTop = containerRef.current.scrollHeight
                  }
                }}
                className="sticky bottom-2 mx-auto block px-3 py-1.5 bg-seal-600 text-white text-[12px] rounded-full shadow-lg hover:bg-seal-700 transition-colors"
              >
                ↓ 查看最新
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
