import { useEffect, useRef, useState, useMemo } from 'react'
import EventCard from './EventCard'
import { useActivityStore } from '../../stores/activityStore'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import type { ActivityEvent, AgentTypeLabel } from '../../types/activity'

interface ActivityStreamProps {
  onAction?: (actionId: string, event: ActivityEvent) => void
  className?: string
}

// 管线阶段定义：搜索 → 研究 → 核查 → 写作 → 平台
const PIPELINE_PHASES = [
  { key: 'search', label: '搜索', icon: 'S' },
  { key: 'research', label: '研究', icon: 'R' },
  { key: 'verify', label: '核查', icon: 'V' },
  { key: 'writing', label: '写作', icon: 'W' },
  { key: 'platform', label: '平台', icon: 'P' },
] as const

type PhaseKey = 'search' | 'research' | 'verify' | 'writing' | 'platform' | 'commander' | 'other'

function classifyPhase(agentType: AgentTypeLabel): PhaseKey {
  if (agentType === 'search') return 'search'
  if (agentType === 'research') return 'research'
  if (agentType === 'verify') return 'verify'
  if (agentType === 'writing') return 'writing'
  if (agentType === 'orchestrator') return 'commander'
  if (agentType === 'user' || agentType === 'system') return 'other'
  return 'other'
}

// 判断阶段状态：done / running / pending
function getPhaseStatus(events: ActivityEvent[], phaseKey: string): 'done' | 'running' | 'pending' {
  const hasStarted = events.some(e => e.agentType === phaseKey && e.type === 'agent_started')
  const hasComplete = events.some(e => {
    if (phaseKey === 'search') return e.type === 'search_complete'
    if (phaseKey === 'research') return e.type === 'research_complete'
    if (phaseKey === 'verify') return e.type === 'verify_warning' || e.type === 'info'
    if (phaseKey === 'writing') return e.type === 'writing_complete' || e.type === 'platform_complete'
    return false
  })
  if (hasComplete) return 'done'
  if (hasStarted) return 'running'
  return 'pending'
}

const FILTERS: { key: 'all' | AgentTypeLabel; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'orchestrator', label: '指挥官' },
  { key: 'search', label: '搜索' },
  { key: 'research', label: '研究' },
  { key: 'verify', label: '核查' },
  { key: 'writing', label: '写作' },
]

export default function ActivityStream({ onAction, className }: ActivityStreamProps) {
  const currentId = useWorkspaceStore(s => s.currentId)
  const eventsByWorkspace = useActivityStore(s => s.eventsByWorkspace)
  const filter = useActivityStore(s => s.filter)
  const setFilter = useActivityStore(s => s.setFilter)
  const containerRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  const allEvents = useMemo(() => {
    if (!currentId) return []
    return eventsByWorkspace[currentId] || []
  }, [eventsByWorkspace, currentId])

  const events = useMemo(() => {
    if (filter === 'all') return allEvents
    return allEvents.filter(e => e.agentType === filter)
  }, [allEvents, filter])

  // 管线阶段状态
  const phaseStatuses = useMemo(() => {
    return PIPELINE_PHASES.map(p => ({
      ...p,
      status: getPhaseStatus(allEvents, p.key),
    }))
  }, [allEvents])

  // 按阶段分组事件（仅"全部"筛选时分组）
  const groupedEvents = useMemo(() => {
    if (filter !== 'all') return null

    const groups: { phase: PhaseKey; label: string; events: ActivityEvent[] }[] = []
    const phaseOrder: PhaseKey[] = ['commander', 'search', 'research', 'verify', 'writing', 'other']
    const phaseLabels: Record<PhaseKey, string> = {
      commander: '指挥调度',
      search: '资料搜集',
      research: '观点提炼',
      verify: '事实核查',
      writing: '内容生成',
      platform: '平台适配',
      other: '其他',
    }

    for (const phase of phaseOrder) {
      const phaseEvents = allEvents.filter(e => classifyPhase(e.agentType) === phase)
      if (phaseEvents.length > 0) {
        groups.push({ phase, label: phaseLabels[phase], events: phaseEvents })
      }
    }
    return groups
  }, [allEvents, filter])

  const hasDegradedEvents = allEvents.some(e => e.type === 'info' && (e.content.includes('降级') || e.content.includes('degraded')))
  const isDemoHistory = allEvents.length > 0 && allEvents.every(e => e.id.startsWith('demo-evt-'))

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
    <aside className={`ws-activity ${className || ''}`}>
      <div className="ws-activity-header">
        <span className="ws-activity-title">管线状态</span>
      </div>

      {/* 管线进度条 */}
      <div className="ws-pipeline-bar">
        {phaseStatuses.map((phase, i) => (
          <div key={phase.key} className="ws-pipeline-phase">
            <div className={`ws-pipeline-node ${phase.status}`}>
              <span className="ws-pipeline-icon">{phase.icon}</span>
            </div>
            {i < phaseStatuses.length - 1 && (
              <div className={`ws-pipeline-line ${phase.status === 'done' ? 'done' : ''}`} />
            )}
            <span className={`ws-pipeline-label ${phase.status}`}>{phase.label}</span>
          </div>
        ))}
      </div>

      {/* Agent 筛选 */}
      <div className="ws-activity-filters">
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`ws-activity-filter${filter === f.key ? ' active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Demo 历史提示：评委/新用户首次进入时展示示例流程 */}
      {isDemoHistory && (
        <div className="ws-demo-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          <span>示例数据：这是 AI 指挥调度的完整流程，开始创作后将替换为你的实际操作记录</span>
        </div>
      )}

      {/* 降级横幅 */}
      {hasDegradedEvents && (
        <div className="ws-degrade-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>当前使用降级模式，结果可能受限</span>
        </div>
      )}

      {/* 事件列表 */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="ws-activity-list"
      >
        {events.length === 0 ? (
          <div className="ws-activity-empty">
            开始创作后，这里会显示 Agent 的工作动态
          </div>
        ) : groupedEvents ? (
          // 分组模式
          <>
            {groupedEvents.map(group => (
              <div key={group.phase} className="ws-activity-group">
                <div className="ws-activity-group-label">{group.label}</div>
                {group.events.map(event => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onAction={onAction}
                  />
                ))}
              </div>
            ))}
          </>
        ) : (
          // 扁平模式（筛选后）
          <>
            {events.map(event => (
              <EventCard
                key={event.id}
                event={event}
                onAction={onAction}
              />
            ))}
          </>
        )}

        {!autoScroll && events.length > 0 && (
          <button
            className="ws-scroll-bottom-btn"
            onClick={() => { setAutoScroll(true); if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight; }}
          >
            ↓ 最新
          </button>
        )}
      </div>
    </aside>
  )
}
