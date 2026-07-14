import { create } from 'zustand'
import type { ActivityEvent, AgentTypeLabel, EventType, EventAction } from '../types/activity'
import { createEvent } from '../types/activity'

const MAX_EVENTS_PER_WORKSPACE = 200

// Demo 指挥调度历史：给评委/新用户展示完整工作流
const DEMO_EVENTS: Omit<ActivityEvent, 'id' | 'timestamp'>[] = [
  {
    type: 'commander_welcome',
    agentType: 'orchestrator',
    title: '你好！我是你的创作指挥官',
    content: '告诉我你想创作什么内容，我会帮你搜集信息、核查事实、提炼观点，最终生成适合各平台发布的内容。',
  },
  {
    type: 'user_action',
    agentType: 'user',
    title: '你',
    content: '帮我分析 AI 换脸诈骗频发这个话题，要发全平台',
  },
  {
    type: 'commander_plan',
    agentType: 'orchestrator',
    title: '执行计划',
    content: '目标：AI 换脸诈骗频发\n平台：全平台\n\n我将按以下步骤执行：\n1. 联网搜集相关信息和报道\n2. 提炼多角度观点和核心争议\n3. 核查关键事实声明\n4. 组织结构，生成标准稿\n5. 适配 6 个平台版本',
    actions: [
      { id: 'confirm', label: '开始执行', style: 'primary' },
      { id: 'modify', label: '修改计划', style: 'secondary' },
    ],
  },
  {
    type: 'agent_started',
    agentType: 'search',
    title: '搜索员启动',
    content: '正在搜集相关信息…',
  },
  {
    type: 'search_complete',
    agentType: 'search',
    title: '搜索完成',
    content: '找到 8 篇相关报道和 12 个数据来源，覆盖公安部、工信部、学术论文及主流媒体报道',
    actions: [
      { id: 'use_all', label: '引用全部', style: 'primary' },
      { id: 'view_results', label: '查看结果', style: 'secondary' },
    ],
  },
  {
    type: 'agent_started',
    agentType: 'research',
    title: '研究员启动',
    content: '正在整理资料与观点…',
  },
  {
    type: 'research_complete',
    agentType: 'research',
    title: '观点提炼完成',
    content: '提炼出 4 个核心观点和 2 个争议点：\n• 技术滥用门槛降低\n• 监管存在滞后性\n• 平台责任边界模糊\n• 公众防范意识不足',
    actions: [
      { id: 'adopt_views', label: '采纳观点', style: 'primary' },
    ],
  },
  {
    type: 'agent_started',
    agentType: 'verify',
    title: '核查员启动',
    content: '正在核查关键声明…',
  },
  {
    type: 'verify_warning',
    agentType: 'verify',
    title: '发现 2 条信息存疑',
    content: '• [unverifiable] 某平台用户量数据无法验证\n• [disputed] 案件破获率数据存在差异',
    actions: [
      { id: 'reverify', label: '重新核查', style: 'warning' },
    ],
  },
  {
    type: 'agent_started',
    agentType: 'writing',
    title: '写作员启动',
    content: '正在生成主稿…',
  },
  {
    type: 'writing_complete',
    agentType: 'writing',
    title: '平台版本已生成',
    content: '已生成 5 个平台版本，可切换查看和编辑。',
    actions: [
      { id: 'platform-zhihu', label: '知', style: 'primary' },
      { id: 'platform-xiaohongshu', label: '红', style: 'secondary' },
      { id: 'platform-weibo', label: '微', style: 'secondary' },
      { id: 'platform-douyin', label: '抖', style: 'secondary' },
      { id: 'platform-tieba', label: '贴', style: 'secondary' },
    ],
  },
  {
    type: 'info',
    agentType: 'orchestrator',
    title: '任务完成',
    content: '所有步骤已执行完毕，你可以在编辑器中查看和修改内容，或切换平台版本。',
  },
]

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
  loadDemoEvents: (workspaceId: string) => void
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

  loadDemoEvents: (workspaceId) => {
    const existing = get().eventsByWorkspace[workspaceId] || []
    if (existing.length > 0) return
    const now = Date.now()
    const demoEvents: ActivityEvent[] = DEMO_EVENTS.map((evt, i) => ({
      ...evt,
      id: `demo-evt-${i}`,
      timestamp: now - (DEMO_EVENTS.length - i) * 60000,
    }))
    set((state) => ({
      eventsByWorkspace: {
        ...state.eventsByWorkspace,
        [workspaceId]: demoEvents,
      },
    }))
  },
}))
