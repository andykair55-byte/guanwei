import type { ActivityEvent, AgentTypeLabel, EventAction } from '../../types/activity'

interface EventCardProps {
  event: ActivityEvent
  onAction?: (actionId: string, event: ActivityEvent) => void
  /** true 时禁用所有 action 按钮（如运行中防止重复触发） */
  disabledActions?: boolean
}

const AGENT_ICON_CLASS: Record<AgentTypeLabel, string> = {
  orchestrator: 'orchestrator',
  search: 'search',
  research: 'research',
  writing: 'writing',
  verify: 'verify',
  user: 'commander',
  system: 'commander',
}

// 精简 Agent 名称，只保留中文
const AGENT_NAMES: Record<AgentTypeLabel, string> = {
  orchestrator: '指挥官',
  search: '搜索员',
  research: '研究员',
  writing: '写作员',
  verify: '核查员',
  user: '用户',
  system: '系统',
}

const STATUS_MAP: Record<string, string> = {
  agent_started: 'running',
  search_complete: 'done',
  research_complete: 'done',
  writing_complete: 'done',
  platform_complete: 'done',
  verify_warning: 'warn',
  error: 'warn',
  commander_question: 'running',
  commander_plan: 'done',
  commander_welcome: 'done',
  info: 'done',
  task_running: 'running',
}

const STATUS_LABEL: Record<string, string> = {
  done: '完成',
  warn: '存疑',
  running: '执行中',
}

function formatTime(timestamp: number) {
  const date = new Date(timestamp)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

export default function EventCard({ event, onAction, disabledActions }: EventCardProps) {
  const iconClass = AGENT_ICON_CLASS[event.agentType] || 'commander'
  const statusClass = STATUS_MAP[event.type] || 'done'
  const isStarted = event.type === 'agent_started'

  return (
    <div className={`ws-activity-event${isStarted ? ' started' : ''}`}>
      <div className="ws-activity-event-header">
        <div className="ws-activity-agent">
          <span className={`ws-activity-agent-icon ${iconClass}`}>
            {event.agentType === 'orchestrator' && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            )}
            {event.agentType === 'search' && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            )}
            {event.agentType === 'research' && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
            )}
            {event.agentType === 'verify' && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            )}
            {event.agentType === 'writing' && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 19l7-7 3 3-7 7-3-3z" />
                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                <path d="M2 2l7.586 7.586" />
                <circle cx="11" cy="11" r="2" />
              </svg>
            )}
            {(event.agentType === 'user' || event.agentType === 'system') && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            )}
          </span>
          <span className="ws-activity-agent-name">{AGENT_NAMES[event.agentType] || event.agentType}</span>
        </div>
        <div className="ws-activity-meta">
          <span className={`ws-activity-status ${statusClass}`}>{STATUS_LABEL[statusClass]}</span>
          <span className="ws-activity-time">{formatTime(event.timestamp)}</span>
        </div>
      </div>

      {/* agent_started 事件只显示简短描述，不显示 content */}
      {isStarted ? (
        <div className="ws-activity-desc-light">{event.title}</div>
      ) : (
        <>
          <div className="ws-activity-desc">{event.title}</div>
          {event.content && (
            <div className="ws-activity-content">
              {event.content.length > 120 ? event.content.slice(0, 120) + '…' : event.content}
            </div>
          )}
        </>
      )}

      {event.actions && event.actions.length > 0 && !isStarted && (
        <div className="ws-activity-actions">
          {event.actions.map((action: EventAction) => (
            <button
              key={action.id}
              className={`ws-activity-action-btn${action.style === 'primary' ? ' primary' : ''} disabled:opacity-50 disabled:cursor-not-allowed`}
              onClick={() => onAction?.(action.id, event)}
              disabled={disabledActions}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
