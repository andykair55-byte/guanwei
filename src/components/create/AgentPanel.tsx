import { useState } from 'react'
import {
  Brain,
  Search as SearchIcon,
  Lightbulb,
  ShieldCheck,
  PenLine,
  Circle,
  LoaderCircle,
  CircleCheck,
  CircleX,
  ChevronDown,
  ChevronRight,
  ScrollText,
  Play,
  Check,
  Bot,
  type LucideIcon,
} from 'lucide-react'
import {
  useCommanderStore,
  AGENT_INFO,
  type AgentType,
  type AgentStatus,
  type LogEntry,
  type PipelineMode,
} from '../../stores/commanderStore'
import { useCreationStore } from '../../stores/creationStore'

// ===== Types =====

interface AgentPanelProps {
  onAdopt?: (content: string, agentType: AgentType) => void
  className?: string
}

// ===== Constants =====

const PIPELINE_ORDER: AgentType[] = [
  'orchestrator',
  'search',
  'research',
  'verify',
  'writing',
]

const AGENT_ICON: Record<AgentType, LucideIcon> = {
  orchestrator: Brain,
  search: SearchIcon,
  research: Lightbulb,
  verify: ShieldCheck,
  writing: PenLine,
}

interface StatusConfig {
  label: string
  Icon: LucideIcon
  iconClass: string
  badgeClass: string
}

const STATUS_CONFIG: Record<AgentStatus, StatusConfig> = {
  idle: {
    label: '等待中',
    Icon: Circle,
    iconClass: 'text-ink-300',
    badgeClass: 'bg-paper-100 text-ink-500',
  },
  thinking: {
    label: '思考中',
    Icon: LoaderCircle,
    iconClass: 'text-blue-500 animate-pulse',
    badgeClass: 'bg-blue-50 text-blue-600',
  },
  running: {
    label: '执行中',
    Icon: LoaderCircle,
    iconClass: 'text-blue-500 animate-spin',
    badgeClass: 'bg-blue-50 text-blue-600',
  },
  done: {
    label: '完成',
    Icon: CircleCheck,
    iconClass: 'text-emerald-600',
    badgeClass: 'bg-emerald-50 text-emerald-600',
  },
  error: {
    label: '失败',
    Icon: CircleX,
    iconClass: 'text-seal-600',
    badgeClass: 'bg-seal-50 text-seal-600',
  },
}

const LOG_LEVEL_CLASS: Record<LogEntry['level'], string> = {
  info: 'text-ink-400',
  success: 'text-emerald-600',
  warning: 'text-amber-600',
  error: 'text-seal-600',
}

// ===== Helpers =====

function formatTime(ts: number): string {
  const d = new Date(ts)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

function formatOutput(output: unknown): string {
  if (output == null) return '无产出'
  if (typeof output === 'string') return output
  if (typeof output === 'number' || typeof output === 'boolean') return String(output)
  if (Array.isArray(output)) {
    const head = JSON.stringify(output.slice(0, 3), null, 2)
    return `共 ${output.length} 项\n${head}${output.length > 3 ? '\n...' : ''}`
  }
  if (typeof output === 'object') {
    try {
      const json = JSON.stringify(output, null, 2)
      return json.length > 500 ? json.slice(0, 500) + '\n...' : json
    } catch {
      return '[object]'
    }
  }
  return String(output)
}

// ===== Agent Card =====

function AgentCard({
  agentType,
  onAdopt,
}: {
  agentType: AgentType
  onAdopt?: (content: string, agentType: AgentType) => void
}) {
  // 细粒度订阅：仅当该 agent 自身状态对象引用变化时才重渲染
  const agent = useCommanderStore((s) => s.agents[agentType])
  const [showOutput, setShowOutput] = useState(false)

  const info = AGENT_INFO[agentType]
  const AgentIcon = AGENT_ICON[agentType]
  const statusConfig = STATUS_CONFIG[agent.status]
  const StatusIcon = statusConfig.Icon
  const hasOutput = agent.output != null
  const canAdopt = agent.status === 'done' && hasOutput && !!onAdopt

  const handleAdopt = () => {
    if (agent.output == null || !onAdopt) return
    onAdopt(formatOutput(agent.output), agentType)
  }

  return (
    <div className="rounded-xl border border-ink-100 bg-paper-0 p-3 transition-colors hover:border-ink-200">
      {/* 顶部：图标 + 名称 + 状态徽章 */}
      <div className="flex items-center gap-2">
        <AgentIcon size={16} className="text-ink-600 flex-shrink-0" />
        <span className="flex-1 text-[13px] font-medium text-ink-800">{info.name}</span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusConfig.badgeClass}`}
        >
          <StatusIcon size={12} className={statusConfig.iconClass} />
          {statusConfig.label}
        </span>
      </div>

      {/* 描述 */}
      <p className="mt-1 ml-6 text-[11px] text-ink-400">{info.description}</p>

      {/* 进度消息 */}
      {agent.progressMessage && (
        <p className="mt-1 ml-6 text-[12px] text-ink-600 leading-snug">{agent.progressMessage}</p>
      )}

      {/* 错误信息 */}
      {agent.error && (
        <p className="mt-1 ml-6 text-[11px] text-seal-600 leading-snug">{agent.error}</p>
      )}

      {/* 操作区（右对齐） */}
      <div className="mt-2 ml-6 flex items-center justify-end gap-1.5">
        {hasOutput ? (
          <>
            <button
              onClick={() => setShowOutput((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-ink-500 hover:bg-paper-100 hover:text-ink-700 transition-colors"
            >
              {showOutput ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              {showOutput ? '收起产出' : '查看产出'}
            </button>
            {canAdopt && (
              <button
                onClick={handleAdopt}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-seal-600 hover:bg-seal-50 transition-colors"
              >
                <Check size={12} />
                采纳
              </button>
            )}
          </>
        ) : (
          <span className="text-[11px] text-ink-300">等待中</span>
        )}
      </div>

      {/* 产出预览（折叠） */}
      {hasOutput && showOutput && (
        <pre className="mt-2 ml-6 max-h-48 overflow-y-auto whitespace-pre-wrap break-all rounded-lg border border-ink-100 bg-paper-50 p-2.5 font-mono text-[11px] leading-relaxed text-ink-600 scrollbar-thin">
          {formatOutput(agent.output)}
        </pre>
      )}
    </div>
  )
}

// ===== Mode Toggle =====

function ModeToggle({
  mode,
  onChange,
}: {
  mode: PipelineMode
  onChange: (mode: PipelineMode) => void
}) {
  const tabs: { key: PipelineMode; label: string }[] = [
    { key: 'auto', label: 'Auto' },
    { key: 'assist', label: 'Assist' },
  ]
  return (
    <div className="flex items-center gap-1 rounded-lg bg-paper-100 p-0.5">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`flex-1 rounded-md px-3 py-1 text-[12px] font-medium transition-colors ${
            mode === tab.key
              ? 'bg-paper-0 text-ink-900 shadow-sm'
              : 'text-ink-500 hover:text-ink-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// ===== Log List =====

function LogList({ logs }: { logs: LogEntry[] }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-ink-100 bg-paper-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-paper-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ScrollText size={14} className="text-ink-500" />
          <span className="text-[13px] font-medium text-ink-700">执行日志</span>
          {logs.length > 0 && (
            <span className="rounded-full bg-paper-100 px-1.5 py-0.5 text-[11px] text-ink-500">
              {logs.length}
            </span>
          )}
        </div>
        <ChevronDown
          size={14}
          className={`text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="max-h-48 overflow-y-auto border-t border-ink-100 scrollbar-thin">
          {logs.length === 0 ? (
            <p className="px-3 py-3 text-center text-[12px] text-ink-300">暂无日志</p>
          ) : (
            <ul className="divide-y divide-ink-50">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="flex items-start gap-2 px-3 py-1.5 text-[11px] leading-relaxed"
                >
                  <span className="flex-shrink-0 font-mono text-ink-300">
                    {formatTime(log.timestamp)}
                  </span>
                  <span className="flex-shrink-0 text-ink-500">
                    {AGENT_INFO[log.agentType].name}
                  </span>
                  <span className={`flex-1 ${LOG_LEVEL_CLASS[log.level]}`}>{log.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// ===== Main AgentPanel =====

export default function AgentPanel({ onAdopt, className = '' }: AgentPanelProps) {
  // 细粒度 selector 订阅，避免全量重渲染
  const mode = useCommanderStore((s) => s.mode)
  const pipelineStatus = useCommanderStore((s) => s.pipelineStatus)
  const logs = useCommanderStore((s) => s.logs)
  const setMode = useCommanderStore((s) => s.setMode)
  const startPipeline = useCommanderStore((s) => s.startPipeline)
  const topic = useCreationStore((s) => s.draft.topic)

  const topicEmpty = !topic.trim()
  const isRunning = pipelineStatus === 'running'

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* 面板标题 */}
      <div className="flex items-center gap-2 px-1">
        <Bot size={16} className="text-ink-700" />
        <h2 className="text-[13px] font-medium text-ink-700">Agent 工作面板</h2>
      </div>

      {/* 模式切换 */}
      <ModeToggle mode={mode} onChange={setMode} />

      {/* Auto 模式：自动生成按钮 */}
      {mode === 'auto' && (
        <button
          onClick={startPipeline}
          disabled={topicEmpty || isRunning}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-ink-900 px-3 py-2 text-[13px] font-medium text-paper-0 transition-colors hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Play size={14} />
          {isRunning ? '执行中...' : topicEmpty ? '请先输入主题' : '自动生成'}
        </button>
      )}

      {/* Agent 状态卡片列表 */}
      <div className="flex flex-col gap-2">
        {PIPELINE_ORDER.map((agentType) => (
          <AgentCard key={agentType} agentType={agentType} onAdopt={onAdopt} />
        ))}
      </div>

      {/* 执行日志 */}
      <LogList logs={logs} />
    </div>
  )
}
