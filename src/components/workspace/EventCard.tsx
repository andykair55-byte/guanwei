import type { ActivityEvent, AgentTypeLabel, EventAction } from '../../types/activity'

interface EventCardProps {
  event: ActivityEvent
  onAction?: (actionId: string, event: ActivityEvent) => void
  onQuickReply?: (text: string) => void
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

const AGENT_NAMES: Record<AgentTypeLabel, string> = {
  orchestrator: '指挥官 Commander',
  search: '搜索员 Search Agent',
  research: '研究员 Research Agent',
  writing: '写作员 Writing Agent',
  verify: '核查员 Evidence Agent',
  user: '用户',
  system: '系统',
}

const STATUS_MAP: Record<string, string> = {
  search_complete: 'done',
  research_complete: 'done',
  writing_complete: 'done',
  verify_warning: 'warn',
  error: 'warn',
  commander_question: 'running',
  commander_welcome: 'done',
  info: 'done',
  task_running: 'running',
}

const STATUS_LABEL: Record<string, string> = {
  done: '完成',
  warn: '警告',
  running: '进行中',
}

function formatTime(timestamp: number) {
  const date = new Date(timestamp)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

const QUICK_REPLIES = ['继续', '详细说明', '暂停', '重新执行']

export default function EventCard({ event, onAction, onQuickReply }: EventCardProps) {
  const iconClass = AGENT_ICON_CLASS[event.agentType] || 'commander'
  const statusClass = STATUS_MAP[event.type] || 'done'

  return (
    <div className="ws-activity-event">
      <div className="ws-activity-event-header">
        <div className="ws-activity-agent">
          <span className={`ws-activity-agent-icon ${iconClass}`}>
            {event.agentType === 'orchestrator' && (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            )}
            {event.agentType === 'search' && (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            )}
            {event.agentType === 'research' && (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
            )}
            {event.agentType === 'verify' && (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            )}
            {event.agentType === 'writing' && (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 19l7-7 3 3-7 7-3-3z" />
                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                <path d="M2 2l7.586 7.586" />
                <circle cx="11" cy="11" r="2" />
              </svg>
            )}
            {(event.agentType === 'user' || event.agentType === 'system' || (!['orchestrator', 'search', 'research', 'verify', 'writing'].includes(event.agentType))) && (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            )}
          </span>
          {AGENT_NAMES[event.agentType] || event.agentType}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="ws-activity-time">{formatTime(event.timestamp)}</span>
          <span className={`ws-activity-status ${statusClass}`}>{STATUS_LABEL[statusClass] || event.type}</span>
        </div>
      </div>

      <div className="ws-activity-desc">{event.title}</div>

      {event.content && (
        <div className="ws-activity-content">
          {event.content.length > 200 ? event.content.slice(0, 200) + '...' : event.content}
        </div>
      )}

      {event.actions && event.actions.length > 0 && (
        <div className="ws-activity-actions">
          {event.actions.map((action: EventAction) => (
            <button
              key={action.id}
              className={`ws-activity-action-btn${action.style === 'primary' ? ' primary' : ''}`}
              onClick={() => onAction?.(action.id, event)}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* 模板仅在搜索员和指挥官事件显示快速回复 */}
      {onQuickReply && (event.agentType === 'search' || event.agentType === 'orchestrator') && (
        <div className="ws-quick-replies">
          {QUICK_REPLIES.map(reply => (
            <button
              key={reply}
              className="ws-quick-reply-btn"
              onClick={() => onQuickReply(reply)}
            >
              {reply}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}