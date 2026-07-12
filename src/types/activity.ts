export type EventType =
  | 'search_complete'
  | 'research_complete'
  | 'verify_warning'
  | 'writing_complete'
  | 'commander_question'
  | 'commander_plan'
  | 'commander_welcome'
  | 'user_action'
  | 'error'
  | 'info'

export type AgentTypeLabel = 'orchestrator' | 'search' | 'research' | 'verify' | 'writing' | 'user' | 'system'

export interface EventAction {
  id: string
  label: string
  style?: 'primary' | 'secondary' | 'warning'
}

export interface ActivityEvent {
  id: string
  timestamp: number
  type: EventType
  agentType: AgentTypeLabel
  title: string
  content: string
  actions?: EventAction[]
  data?: Record<string, unknown>
}

export function createEvent(
  type: EventType,
  agentType: AgentTypeLabel,
  title: string,
  content: string,
  actions?: EventAction[],
  data?: Record<string, unknown>
): ActivityEvent {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    type,
    agentType,
    title,
    content,
    actions,
    data,
  }
}
