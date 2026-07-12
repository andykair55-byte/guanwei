import { useState } from 'react'
import type { ActivityEvent, AgentTypeLabel, EventAction } from '../../types/activity'
import {
  Search,
  BookOpen,
  Crown,
  PenTool,
  ShieldCheck,
  User,
  Settings,
  AlertTriangle,
  CheckCircle,
  Info,
  MessageCircle,
  Clock,
} from 'lucide-react'

interface EventCardProps {
  event: ActivityEvent
  onAction?: (actionId: string, event: ActivityEvent) => void
  onQuickReply?: (text: string) => void
}

const AGENT_CONFIG: Record<AgentTypeLabel, { label: string; color: string; bg: string; icon: typeof Search }> = {
  orchestrator: { label: '指挥官', color: 'text-seal-600', bg: 'bg-seal-100', icon: Crown },
  search: { label: '搜索员', color: 'text-blue-600', bg: 'bg-blue-50', icon: Search },
  research: { label: '研究员', color: 'text-bamboo-600', bg: 'bg-bamboo-50', icon: BookOpen },
  writing: { label: '写作员', color: 'text-purple-600', bg: 'bg-purple-50', icon: PenTool },
  verify: { label: '核查员', color: 'text-gold-600', bg: 'bg-gold-50', icon: ShieldCheck },
  user: { label: '用户', color: 'text-ink-600', bg: 'bg-ink-50', icon: User },
  system: { label: '系统', color: 'text-ink-500', bg: 'bg-paper-100', icon: Settings },
}

const QUICK_REPLIES = ['继续', '详细说明', '暂停', '重新执行']

function formatTime(timestamp: number) {
  const date = new Date(timestamp)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

function getEventIcon(type: string) {
  switch (type) {
    case 'search_complete':
    case 'research_complete':
    case 'writing_complete':
      return <CheckCircle size={14} className="text-bamboo-600" />
    case 'verify_warning':
    case 'error':
      return <AlertTriangle size={14} className="text-gold-600" />
    case 'commander_question':
      return <MessageCircle size={14} className="text-seal-600" />
    default:
      return <Info size={14} className="text-ink-400" />
  }
}

export default function EventCard({ event, onAction, onQuickReply }: EventCardProps) {
  const [showReplies, setShowReplies] = useState(false)
  const config = AGENT_CONFIG[event.agentType]
  const Icon = config.icon

  return (
    <div className="animate-fade-in-up rounded-xl border border-ink-100 bg-paper-0 p-3 hover:border-ink-200 transition-colors">
      <div className="flex items-start gap-2.5">
        <div className={`flex-shrink-0 w-7 h-7 rounded-full ${config.bg} flex items-center justify-center`}>
          <Icon size={14} className={config.color} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[12px] font-medium ${config.color}`}>{config.label}</span>
            {getEventIcon(event.type)}
            <span className="text-[11px] text-ink-300 flex items-center gap-0.5 ml-auto">
              <Clock size={10} />
              {formatTime(event.timestamp)}
            </span>
          </div>

          <p className="text-[13px] font-medium text-ink-800 mb-1">{event.title}</p>
          <p className="text-[12px] text-ink-500 leading-relaxed whitespace-pre-wrap">{event.content}</p>

          {event.actions && event.actions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {event.actions.map((action: EventAction) => (
                <button
                  key={action.id}
                  onClick={() => onAction?.(action.id, event)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors ${
                    action.style === 'primary'
                      ? 'bg-seal-600 text-white hover:bg-seal-700'
                      : action.style === 'warning'
                      ? 'bg-gold-100 text-gold-600 hover:bg-gold-200'
                      : 'bg-paper-100 text-ink-600 hover:bg-paper-200'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {onQuickReply && (
            <div className="mt-2">
              {showReplies ? (
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_REPLIES.map(reply => (
                    <button
                      key={reply}
                      onClick={() => {
                        onQuickReply(reply)
                        setShowReplies(false)
                      }}
                      className="px-2 py-1 text-[11px] rounded-lg border border-ink-200 text-ink-500 hover:border-seal-600 hover:text-seal-600 transition-colors"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  onClick={() => setShowReplies(true)}
                  className="text-[11px] text-ink-400 hover:text-seal-600 transition-colors"
                >
                  快捷回复
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
