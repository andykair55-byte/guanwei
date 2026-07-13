import { create } from 'zustand'
import type { ActivityEvent, AgentTypeLabel, EventType, EventAction } from '../types/activity'
import { createEvent } from '../types/activity'

const MAX_EVENTS_PER_WORKSPACE = 200

interface ActivityStore {
  eventsByWorkspace: Record<string, ActivityEvent[]>
  filter: 'all' | AgentTypeLabel

  addEvent: (workspaceId: string, event: ActivityEvent) => void
  addEventSimple: (
    workspaceId: string,
    type: EventType,
    agentType: AgentTypeLabel,
    title: string,
    content: string,
    actions?: EventAction[],
    data?: Record<string, unknown>
  ) => ActivityEvent
  clearEvents: (workspaceId: string) => void
  setFilter: (filter: 'all' | AgentTypeLabel) => void
  getEvents: (workspaceId: string) => ActivityEvent[]
  getFilteredEvents: (workspaceId: string) => ActivityEvent[]
}

export const useActivityStore = create<ActivityStore>((set, get) => ({
  eventsByWorkspace: {},
  filter: 'all',

  addEvent: (workspaceId, event) => set((state) => {
    const current = state.eventsByWorkspace[workspaceId] || []
    let updated = [...current, event]
    if (updated.length > MAX_EVENTS_PER_WORKSPACE) {
      updated = updated.slice(updated.length - MAX_EVENTS_PER_WORKSPACE)
    }
    return {
      eventsByWorkspace: {
        ...state.eventsByWorkspace,
        [workspaceId]: updated,
      },
    }
  }),

  addEventSimple: (workspaceId, type, agentType, title, content, actions, data) => {
    const event = createEvent(type, agentType, title, content, actions, data)
    get().addEvent(workspaceId, event)
    return event
  },

  clearEvents: (workspaceId) => set((state) => ({
    eventsByWorkspace: { ...state.eventsByWorkspace, [workspaceId]: [] },
  })),

  setFilter: (filter) => set({ filter }),

  getEvents: (workspaceId) => get().eventsByWorkspace[workspaceId] || [],

  getFilteredEvents: (workspaceId) => {
    const events = get().eventsByWorkspace[workspaceId] || []
    const filter = get().filter
    if (filter === 'all') return events
    return events.filter(e => e.agentType === filter)
  },
}))
