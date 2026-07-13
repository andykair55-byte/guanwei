import { create } from 'zustand'

// Agent 类型
export type AgentType = 'orchestrator' | 'search' | 'research' | 'verify' | 'writing'

// Agent 状态
export type AgentStatus = 'idle' | 'thinking' | 'running' | 'done' | 'error'

// 单个Agent的运行时状态
export interface AgentState {
  type: AgentType
  status: AgentStatus
  startedAt?: number
  completedAt?: number
  error?: string
  // 产出（泛型，具体由各Agent定义）
  output?: unknown
  // 进度描述（展示给用户）
  progressMessage?: string
}

// 任务模式
export type PipelineMode = 'assist' | 'auto'

// 管线整体状态
export type PipelineStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error'

// 事件日志条目
export interface LogEntry {
  id: string
  timestamp: number
  agentType: AgentType
  message: string
  level: 'info' | 'success' | 'warning' | 'error'
}

// 追问卡片状态
export type QuestionCardStatus = 'pending' | 'answered' | 'superseded'

// 追问卡片
export interface QuestionCard {
  id: string
  question: string
  status: QuestionCardStatus
  createdAt: number
}

// 依赖图定义
const DEPENDENCIES: Record<AgentType, AgentType[]> = {
  orchestrator: [],           // 主Agent无依赖
  search: ['orchestrator'],   // Search依赖主Agent生成关键词
  research: ['search'],       // Research依赖Search结果
  verify: ['search'],          // Verify依赖Search结果
  writing: ['research', 'verify'],  // Writing依赖Research和Verify
}

// Agent 显示信息
const AGENT_INFO: Record<AgentType, { name: string; description: string }> = {
  orchestrator: { name: '指挥官', description: '分析主题，制定搜索策略' },
  search: { name: '搜索员', description: '全网搜集相关信息' },
  research: { name: '研究员', description: '提炼多角度观点' },
  verify: { name: '核查员', description: '验证事实声明' },
  writing: { name: '撰稿人', description: '组织结构，生成内容' },
}

interface CommanderStore {
  // 状态
  mode: PipelineMode
  pipelineStatus: PipelineStatus
  agents: Record<AgentType, AgentState>
  logs: LogEntry[]
  currentAgent: AgentType | null

  // 模式切换
  setMode: (mode: PipelineMode) => void

  // 管线控制
  startPipeline: () => void
  pausePipeline: () => void
  resetPipeline: () => void

  // Agent状态管理
  setAgentStatus: (type: AgentType, status: AgentStatus, message?: string) => void
  setAgentOutput: (type: AgentType, output: unknown) => void
  setAgentError: (type: AgentType, error: string) => void
  getAgentState: (type: AgentType) => AgentState

  // 依赖检查
  canStart: (type: AgentType) => boolean
  getNextAgent: () => AgentType | null

  // 日志
  addLog: (agentType: AgentType, message: string, level?: LogEntry['level']) => void
  clearLogs: () => void

  // 追问卡片
  questionCards: QuestionCard[]
  addQuestionCard: (card: QuestionCard) => void
  answerQuestionCard: (id: string) => void
  supersedeQuestionCard: (id: string) => void
  clearQuestionCards: () => void

  // 回调注册（供 agentService 使用）
  onAgentComplete?: (type: AgentType, output: unknown) => void
  setOnAgentComplete: (cb: (type: AgentType, output: unknown) => void) => void
}

// 初始 Agent 状态
function createInitialAgents(): Record<AgentType, AgentState> {
  return {
    orchestrator: { type: 'orchestrator', status: 'idle' },
    search: { type: 'search', status: 'idle' },
    research: { type: 'research', status: 'idle' },
    verify: { type: 'verify', status: 'idle' },
    writing: { type: 'writing', status: 'idle' },
  }
}

let logIdCounter = 0

export const useCommanderStore = create<CommanderStore>((set, get) => ({
  mode: 'assist',
  pipelineStatus: 'idle',
  agents: createInitialAgents(),
  logs: [],
  currentAgent: null,
  onAgentComplete: undefined,
  questionCards: [],

  setMode: (mode) => set({ mode }),

  startPipeline: () => {
    set({
      pipelineStatus: 'running',
      agents: createInitialAgents(),
      currentAgent: 'orchestrator',
    })
    get().addLog('orchestrator', '管线启动', 'info')
  },

  pausePipeline: () => {
    set({ pipelineStatus: 'paused' })
    get().addLog('orchestrator', '管线已暂停', 'warning')
  },

  resetPipeline: () => {
    set({
      pipelineStatus: 'idle',
      agents: createInitialAgents(),
      currentAgent: null,
      logs: [],
      questionCards: [],
    })
  },

  setAgentStatus: (type, status, message) => set((state) => ({
    agents: {
      ...state.agents,
      [type]: {
        ...state.agents[type],
        type,
        status,
        progressMessage: message,
        startedAt: status === 'running' ? Date.now() : state.agents[type].startedAt,
        completedAt: status === 'done' || status === 'error' ? Date.now() : state.agents[type].completedAt,
      },
    },
    currentAgent: status === 'running' ? type : state.currentAgent,
  })),

  setAgentOutput: (type, output) => set((state) => ({
    agents: {
      ...state.agents,
      [type]: { ...state.agents[type], output },
    },
  })),

  setAgentError: (type, error) => set((state) => ({
    agents: {
      ...state.agents,
      [type]: { ...state.agents[type], status: 'error', error, completedAt: Date.now() },
    },
  })),

  getAgentState: (type) => get().agents[type],

  canStart: (type) => {
    const agents = get().agents
    const deps = DEPENDENCIES[type]
    return deps.every(dep => agents[dep].status === 'done')
  },

  getNextAgent: () => {
    const agents = get().agents
    const order: AgentType[] = ['orchestrator', 'search', 'research', 'verify', 'writing']
    for (const type of order) {
      if (agents[type].status === 'idle' && get().canStart(type)) {
        return type
      }
    }
    return null
  },

  addLog: (agentType, message, level = 'info') => set((state) => ({
    logs: [...state.logs, {
      id: `log-${++logIdCounter}`,
      timestamp: Date.now(),
      agentType,
      message,
      level,
    }],
  })),

  clearLogs: () => set({ logs: [] }),

  addQuestionCard: (card) => set((state) => ({
    questionCards: [...state.questionCards, card],
  })),

  answerQuestionCard: (id) => set((state) => ({
    questionCards: state.questionCards.map(c =>
      c.id === id ? { ...c, status: 'answered' as QuestionCardStatus } : c
    ),
  })),

  supersedeQuestionCard: (id) => set((state) => ({
    questionCards: state.questionCards.map(c =>
      c.id === id ? { ...c, status: 'superseded' as QuestionCardStatus } : c
    ),
  })),

  clearQuestionCards: () => set({ questionCards: [] }),

  setOnAgentComplete: (cb) => set({ onAgentComplete: cb }),
}))

// 导出依赖图和显示信息供其他模块使用
export { DEPENDENCIES, AGENT_INFO }
