import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Plus, Search, Clock, MoreHorizontal,
  Sparkles, FileText, Zap,
  ChevronRight, Send, CheckCircle2, Loader2,
  Database, FlaskConical, PenLine, ShieldCheck, AlertTriangle,
  Bookmark, RotateCcw,
} from 'lucide-react'

interface Workspace {
  id: number
  title: string
  description: string
  icon: string
  materialCount: number
  noteCount: number
  lastEdited: string
  collaborators: { name: string; avatar: string }[]
  aiStatus: 'analyzing' | 'done' | 'idle'
  tags: string[]
}

const mockWorkspaces: Workspace[] = [
  {
    id: 1,
    title: '新能源续航虚标调查',
    description: '收集车主反馈、工信部数据、品牌声明，追踪事件进展',
    icon: '🔋',
    materialCount: 23,
    noteCount: 5,
    lastEdited: '2 小时前',
    collaborators: [
      { name: '陈默深', avatar: 'https://picsum.photos/seed/avatar11/40/40' },
      { name: '逻辑怪', avatar: 'https://picsum.photos/seed/avatar33/40/40' },
    ],
    aiStatus: 'analyzing',
    tags: ['科技', '消费者权益'],
  },
  {
    id: 2,
    title: '预制菜事件全记录',
    description: '暗访视频、供应商合同、菜单价格对比、监管动态',
    icon: '🍜',
    materialCount: 15,
    noteCount: 3,
    lastEdited: '1 天前',
    collaborators: [
      { name: '苏小碗', avatar: 'https://picsum.photos/seed/avatar44/40/40' },
    ],
    aiStatus: 'done',
    tags: ['生活科普', '食品安全'],
  },
  {
    id: 3,
    title: '室温超导争议追踪',
    description: '论文原文、复现实验结果、学术界回应、撤稿时间线',
    icon: '❄️',
    materialCount: 8,
    noteCount: 2,
    lastEdited: '3 天前',
    collaborators: [],
    aiStatus: 'idle',
    tags: ['科技', '学术'],
  },
]

const aiStatusConfig = {
  analyzing: { label: 'AI 分析中', color: 'text-amber-500', bg: 'bg-amber-50' },
  done: { label: '分析完成', color: 'text-bamboo', bg: 'bg-bamboo/8' },
  idle: { label: '待分析', color: 'text-ink-300', bg: 'bg-ink-50' },
}

type AgentId = 'collector' | 'analyst' | 'summarizer' | 'factchecker'
type AgentStatus = 'idle' | 'working' | 'done'

interface AgentDef {
  id: AgentId
  name: string
  role: string
  color: string
  bg: string
  icon: typeof Database
  workingMessage: string
  doneMessage: string
}

const agentDefs: AgentDef[] = [
  {
    id: 'collector',
    name: 'Collector',
    role: '素材收集',
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.10)',
    icon: Database,
    workingMessage: '正在搜索相关报道...',
    doneMessage: '已收集 6 条相关素材',
  },
  {
    id: 'analyst',
    name: 'Analyst',
    role: '信源分析',
    color: '#2d8f5e',
    bg: 'rgba(45, 143, 94, 0.10)',
    icon: FlaskConical,
    workingMessage: '正在分析信源可信度...',
    doneMessage: '已完成 3 条分析结论',
  },
  {
    id: 'summarizer',
    name: 'Summarizer',
    role: '摘要生成',
    color: '#c78c20',
    bg: 'rgba(199, 140, 32, 0.10)',
    icon: PenLine,
    workingMessage: '正在整理事件脉络...',
    doneMessage: '已生成事件摘要与时间线',
  },
  {
    id: 'factchecker',
    name: 'FactChecker',
    role: '事实核查',
    color: '#c0392b',
    bg: 'rgba(192, 57, 43, 0.10)',
    icon: ShieldCheck,
    workingMessage: '正在交叉验证关键事实...',
    doneMessage: '已完成 2 条事实核查',
  },
]

const mockMaterials = [
  { id: 1, title: '车主论坛：冬季续航实测数据汇总——北方23城280位车主反馈', source: '汽车之家', time: '2小时前', credibility: 78 },
  { id: 2, title: '工信部回应新能源续航虚标：已启动专项调查', source: '新华社', time: '5小时前', credibility: 95 },
  { id: 3, title: '第三方检测报告：低温环境下电池衰减率达40%', source: '中汽中心', time: '1天前', credibility: 90 },
  { id: 4, title: '品牌方官方声明：续航数据均基于NEDC标准工况测试', source: '品牌官网', time: '1天前', credibility: 60 },
  { id: 5, title: '深度解读：NEDC、WLTC、CLTC三种续航测试标准差异', source: '知乎专栏', time: '2天前', credibility: 82 },
  { id: 6, title: '历史复盘：2019年某品牌续航争议事件全过程', source: '36氪', time: '3天前', credibility: 80 },
]

const mockAnalysis = [
  '官方宣传续航700km与车主冬季实测420km之间存在280km差距，差值达40%，已超出合理误差范围。',
  '第三方检测机构（中汽中心）数据与车主实测高度吻合，佐证了续航虚标的客观存在。',
  '品牌方声明引用NEDC工况测试数据，但NEDC测试条件与实际使用存在系统性偏差，构成"技术性真实但体验性虚标"。',
]

const mockSummary = '本次调查围绕"新能源续航虚标"事件展开，共采集6条素材。核心矛盾聚焦于品牌方宣传续航700km与车主冬季实测420km之间的显著差距。中汽中心第三方检测证实低温环境下电池衰减率达40%，与车主反馈一致。品牌方声明援引NEDC标准工况数据，但该测试条件与实际使用场景存在系统性偏差。工信部已启动专项调查。综合判断：续航数据存在"技术性真实、体验性虚标"问题，建议推动CLTC标准落地与低温续航强制标注。'

const mockTimeline = [
  { id: 1, time: '2024.10', event: '北方车主集中反馈冬季续航严重缩水，社交媒体发酵' },
  { id: 2, time: '2024.11', event: '多家媒体报道跟进，品牌方首次回应称"符合NEDC标准"' },
  { id: 3, time: '2024.12', event: '工信部介入，委托中汽中心启动第三方检测' },
  { id: 4, time: '2025.01', event: '检测报告公布，证实低温衰减40%，争议持续升级' },
]

const mockFactChecks = [
  { id: 1, claim: '宣传续航700km', status: 'disputed' as const, detail: '该数据基于NEDC实验室工况，实际使用场景下无法达成，存在误导性' },
  { id: 2, claim: '工信部已介入调查', status: 'verified' as const, detail: '新华社、人民日报等多家权威媒体证实，工信部已启动专项调查程序' },
]

function credibilityColor(score: number) {
  if (score >= 90) return 'bg-green-100 text-green-700'
  if (score >= 80) return 'bg-lime-100 text-lime-700'
  if (score >= 70) return 'bg-amber-100 text-amber-700'
  if (score >= 60) return 'bg-orange-100 text-orange-700'
  return 'bg-red-100 text-red-700'
}

function WorkspaceCard({ ws, onClick }: { ws: Workspace; onClick: () => void }) {
  const status = aiStatusConfig[ws.aiStatus]

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer bg-white rounded-2xl border border-ink-100/40 hover:border-ink-200/60 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all duration-300 p-5"
    >
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl">{ws.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold text-ink-900 group-hover:text-seal transition-colors truncate">
            {ws.title}
          </h3>
          <p className="text-[12px] text-ink-400 mt-0.5 line-clamp-1">{ws.description}</p>
        </div>
        <button
          onClick={(e) => e.stopPropagation()}
          className="p-1 rounded-lg text-ink-300 hover:text-ink-500 hover:bg-ink-50 opacity-0 group-hover:opacity-100 transition-all"
        >
          <MoreHorizontal size={16} />
        </button>
      </div>

      <div className="flex items-center gap-1.5 mb-3">
        {ws.tags.map(tag => (
          <span key={tag} className="px-2 py-[2px] rounded-md bg-ink-50 text-[10px] text-ink-400">{tag}</span>
        ))}
      </div>

      <div className="flex items-center gap-4 text-[11px] text-ink-400 mb-3">
        <span className="flex items-center gap-1">
          <FileText size={12} />
          {ws.materialCount} 素材
        </span>
        <span className="flex items-center gap-1">
          <Zap size={12} />
          {ws.noteCount} 笔记
        </span>
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {ws.lastEdited}
        </span>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-ink-100/30">
        <div className="flex items-center gap-1.5">
          {ws.collaborators.length > 0 ? (
            <div className="flex -space-x-1.5">
              {ws.collaborators.map((c, i) => (
                <img
                  key={i}
                  src={c.avatar}
                  alt={c.name}
                  className="w-5 h-5 rounded-full border-2 border-white object-cover"
                  title={c.name}
                />
              ))}
            </div>
          ) : (
            <span className="text-[10px] text-ink-300">暂无协作者</span>
          )}
          <button
            onClick={(e) => e.stopPropagation()}
            className="w-5 h-5 rounded-full border border-dashed border-ink-200 flex items-center justify-center text-ink-300 hover:border-ink-400 hover:text-ink-500 transition-colors"
          >
            <Plus size={10} />
          </button>
        </div>

        <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
          {ws.aiStatus === 'analyzing' && <Sparkles size={10} className="animate-pulse" />}
          {status.label}
        </span>
      </div>
    </div>
  )
}

function StatusDot({ status }: { status: AgentStatus }) {
  if (status === 'idle') return <span className="w-2.5 h-2.5 rounded-full bg-ink-300" />
  if (status === 'working') return <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
  return <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
}

function AgentRow({ agent, status }: { agent: AgentDef; status: AgentStatus }) {
  const Icon = agent.icon
  const isIdle = status === 'idle'

  return (
    <div className={`flex items-start gap-3 transition-all duration-500 ${isIdle ? 'opacity-40' : 'opacity-100'}`}>
      <div className="relative flex-shrink-0">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: agent.bg, color: agent.color }}
        >
          <Icon size={18} />
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center">
          <StatusDot status={status} />
        </div>
      </div>
      <div
        className="flex-1 rounded-2xl rounded-tl-sm px-3.5 py-2.5"
        style={{ backgroundColor: isIdle ? 'transparent' : agent.bg }}
      >
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[12px] font-semibold" style={{ color: agent.color }}>{agent.name}</span>
          <span className="text-[9px] text-ink-300 px-1.5 py-0.5 rounded bg-ink-50/60">{agent.role}</span>
        </div>
        {isIdle ? (
          <p className="text-[11px] text-ink-300">等待启动...</p>
        ) : status === 'working' ? (
          <div className="flex items-center gap-1.5">
            <Loader2 size={11} className="animate-spin" style={{ color: agent.color }} />
            <span className="text-[11px] text-ink-500">{agent.workingMessage}</span>
            <span className="flex gap-0.5 ml-0.5">
              <span className="w-1 h-1 rounded-full animate-bounce" style={{ backgroundColor: agent.color, animationDelay: '0ms' }} />
              <span className="w-1 h-1 rounded-full animate-bounce" style={{ backgroundColor: agent.color, animationDelay: '150ms' }} />
              <span className="w-1 h-1 rounded-full animate-bounce" style={{ backgroundColor: agent.color, animationDelay: '300ms' }} />
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={11} style={{ color: agent.color }} />
            <span className="text-[11px] text-ink-600">{agent.doneMessage}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export function NoteDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const ws = mockWorkspaces.find(w => w.id === Number(id))

  const [topic, setTopic] = useState('')
  const [started, setStarted] = useState(false)
  const [statuses, setStatuses] = useState<Record<AgentId, AgentStatus>>({
    collector: 'idle',
    analyst: 'idle',
    summarizer: 'idle',
    factchecker: 'idle',
  })
  const [showMaterials, setShowMaterials] = useState(false)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [showTimeline, setShowTimeline] = useState(false)
  const [showFactChecks, setShowFactChecks] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }

  useEffect(() => () => clearTimers(), [])

  const allDone = Object.values(statuses).every(s => s === 'done')
  const isRunning = started && !allDone
  const doneCount = Object.values(statuses).filter(s => s === 'done').length

  const reset = () => {
    clearTimers()
    setStarted(false)
    setStatuses({ collector: 'idle', analyst: 'idle', summarizer: 'idle', factchecker: 'idle' })
    setShowMaterials(false)
    setShowAnalysis(false)
    setShowSummary(false)
    setShowTimeline(false)
    setShowFactChecks(false)
    setShowReport(false)
  }

  const startInvestigation = () => {
    if (!topic.trim() || isRunning) return
    clearTimers()
    setStarted(true)
    setStatuses({ collector: 'idle', analyst: 'idle', summarizer: 'idle', factchecker: 'idle' })
    setShowMaterials(false)
    setShowAnalysis(false)
    setShowSummary(false)
    setShowTimeline(false)
    setShowFactChecks(false)
    setShowReport(false)

    const steps: { time: number; fn: () => void }[] = [
      { time: 300, fn: () => setStatuses(p => ({ ...p, collector: 'working' })) },
      { time: 3000, fn: () => { setStatuses(p => ({ ...p, collector: 'done', analyst: 'working' })); setShowMaterials(true) } },
      { time: 6000, fn: () => { setStatuses(p => ({ ...p, analyst: 'done', summarizer: 'working' })); setShowAnalysis(true) } },
      { time: 9000, fn: () => { setStatuses(p => ({ ...p, summarizer: 'done', factchecker: 'working' })); setShowSummary(true); setShowTimeline(true) } },
      { time: 12000, fn: () => { setStatuses(p => ({ ...p, factchecker: 'done' })); setShowFactChecks(true) } },
      { time: 13500, fn: () => setShowReport(true) },
    ]

    steps.forEach(({ time, fn }) => {
      const id = setTimeout(fn, time)
      timersRef.current.push(id)
    })
  }

  if (!ws) {
    return (
      <div className="min-h-screen bg-ink-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h2 className="text-lg font-semibold text-ink-800 mb-2">工作间不存在</h2>
          <p className="text-sm text-ink-400 mb-4">该工作间可能已被删除或链接无效</p>
          <button
            onClick={() => navigate('/notes')}
            className="px-4 py-2 rounded-xl bg-seal text-white text-sm font-medium hover:bg-seal/90 transition-colors"
          >
            返回工作间列表
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ink-50/30">
      <div className="px-8 pt-6 pb-4 border-b border-ink-100/40 bg-white">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg text-ink-400 hover:text-ink-600 hover:bg-ink-50 transition-colors">
            <ChevronRight size={16} className="rotate-180" />
          </button>
          <span className="text-2xl">{ws.icon}</span>
          <h1 className="text-[20px] font-bold text-ink-900 font-serif">{ws.title}</h1>
          <span className="ml-2 flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
            <Sparkles size={10} />
            Multi-Agent 协作模式
          </span>
        </div>
        <p className="text-[12px] text-ink-400 ml-10">{ws.description}</p>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Left: Agent Work Area (60%) */}
          <div className="lg:col-span-3 space-y-4">
            {/* Input */}
            <div className="bg-white rounded-2xl border border-ink-100/40 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={14} className="text-amber-500" />
                <span className="text-[13px] font-semibold text-ink-800">Multi-Agent 调查引擎</span>
                {started && (
                  <span className="ml-auto text-[11px] text-ink-400">
                    {doneCount}/4 Agent 完成
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-ink-100/60 bg-ink-50/30 focus-within:border-ink-200 focus-within:bg-white transition-all">
                  <Search size={14} className="text-ink-300" />
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && startInvestigation()}
                    placeholder="输入要调查的事件..."
                    disabled={isRunning}
                    className="flex-1 text-[13px] text-ink-700 placeholder:text-ink-300 bg-transparent outline-none disabled:cursor-not-allowed"
                  />
                </div>
                <button
                  onClick={allDone ? reset : startInvestigation}
                  disabled={isRunning || (!topic.trim() && !allDone)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[12px] font-semibold shadow-sm transition-all ${
                    allDone
                      ? 'bg-ink-100 text-ink-600 hover:bg-ink-200 active:scale-[0.97]'
                      : isRunning
                      ? 'bg-ink-100 text-ink-400 cursor-not-allowed'
                      : 'bg-seal text-white hover:bg-seal/90 active:scale-[0.97]'
                  }`}
                >
                  {allDone ? (
                    <>
                      <RotateCcw size={13} />
                      重新调查
                    </>
                  ) : isRunning ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      调查中...
                    </>
                  ) : (
                    <>
                      <Send size={13} />
                      开始调查
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Agent List */}
            <div className="bg-white rounded-2xl border border-ink-100/40 p-4 space-y-3">
              {agentDefs.map(agent => (
                <div key={agent.id}>
                  <AgentRow agent={agent} status={statuses[agent.id]} />
                  {agent.id === 'analyst' && showAnalysis && (
                    <div className="ml-14 mt-2 space-y-1.5">
                      {mockAnalysis.map((a, i) => (
                        <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-green-50/50 border border-green-100/60">
                          <span className="text-[10px] font-bold text-green-600 mt-0.5">{i + 1}</span>
                          <p className="text-[11px] text-ink-600 leading-relaxed">{a}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Final Report */}
            {showReport && (
              <div className="bg-gradient-to-br from-ink-900 to-ink-800 rounded-2xl p-5 text-white">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={16} className="text-green-400" />
                  <span className="text-[14px] font-semibold">调查报告已生成</span>
                  <span className="ml-auto text-[10px] text-white/60">4 Agent 协作完成</span>
                </div>
                <p className="text-[12px] text-white/80 leading-relaxed mb-3">{mockSummary}</p>
                <div className="flex items-center gap-3 pt-3 border-t border-white/10">
                  <div className="flex items-center gap-1.5">
                    <Database size={12} className="text-white/60" />
                    <span className="text-[10px] text-white/60">6 条素材</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FlaskConical size={12} className="text-white/60" />
                    <span className="text-[10px] text-white/60">3 条结论</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck size={12} className="text-white/60" />
                    <span className="text-[10px] text-white/60">2 条核查</span>
                  </div>
                  <button className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-medium transition-colors">
                    <Bookmark size={11} />
                    保存到笔记
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Results Area (40%) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Empty state */}
            {!started && (
              <div className="bg-white rounded-2xl border border-ink-100/40 p-8 text-center">
                <div className="w-12 h-12 rounded-xl bg-ink-50 flex items-center justify-center mx-auto mb-3">
                  <Sparkles size={20} className="text-ink-300" />
                </div>
                <p className="text-[13px] text-ink-400 font-medium">输入调查主题后</p>
                <p className="text-[13px] text-ink-400 font-medium">4 个 AI Agent 将协同工作</p>
                <div className="flex items-center justify-center gap-2 mt-4">
                  {agentDefs.map(a => {
                    const Icon = a.icon
                    return (
                      <div key={a.id} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: a.bg, color: a.color }}>
                        <Icon size={13} />
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4 pt-4 border-t border-ink-100/30 space-y-1.5">
                  {agentDefs.map(a => (
                    <div key={a.id} className="flex items-center gap-2 text-left">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: a.color }} />
                      <span className="text-[11px] font-medium text-ink-500" style={{ color: a.color }}>{a.name}</span>
                      <span className="text-[10px] text-ink-300">{a.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Materials */}
            {showMaterials && (
              <div className="bg-white rounded-2xl border border-ink-100/40 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[13px] font-semibold text-ink-800 flex items-center gap-1.5">
                    <Database size={13} style={{ color: '#3b82f6' }} />
                    素材
                    <span className="text-[10px] text-ink-300 font-normal">({mockMaterials.length})</span>
                  </h3>
                </div>
                <div className="space-y-2">
                  {mockMaterials.map(m => (
                    <div key={m.id} className="p-2.5 rounded-xl bg-ink-50/40 hover:bg-ink-50/80 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-[11px] text-ink-700 leading-snug flex-1">{m.title}</p>
                        <span className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${credibilityColor(m.credibility)}`}>
                          {m.credibility}
                        </span>
                      </div>
                      <p className="text-[10px] text-ink-300">{m.source} · {m.time}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            {showSummary && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-2xl border border-amber-200/40 p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <PenLine size={13} style={{ color: '#c78c20' }} />
                  <span className="text-[13px] font-semibold text-amber-800">事件摘要</span>
                </div>
                <p className="text-[11px] text-ink-600 leading-relaxed">{mockSummary}</p>
              </div>
            )}

            {/* Timeline */}
            {showTimeline && (
              <div className="bg-white rounded-2xl border border-ink-100/40 p-4">
                <h3 className="text-[13px] font-semibold text-ink-800 flex items-center gap-1.5 mb-3">
                  <Clock size={13} className="text-ink-400" />
                  事件时间线
                </h3>
                <div className="relative pl-4">
                  <div className="absolute left-1 top-1 bottom-1 w-px bg-ink-100" />
                  {mockTimeline.map((t, i) => (
                    <div key={t.id} className="relative pb-4 last:pb-0">
                      <div className={`absolute -left-3 w-2.5 h-2.5 rounded-full border-2 border-white ${i === mockTimeline.length - 1 ? 'bg-seal' : 'bg-ink-300'}`} />
                      <p className="text-[11px] font-semibold text-ink-700">{t.time}</p>
                      <p className="text-[11px] text-ink-400 mt-0.5">{t.event}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fact Checks */}
            {showFactChecks && (
              <div className="bg-white rounded-2xl border border-ink-100/40 p-4">
                <h3 className="text-[13px] font-semibold text-ink-800 flex items-center gap-1.5 mb-3">
                  <ShieldCheck size={13} style={{ color: '#c0392b' }} />
                  事实核查
                </h3>
                <div className="space-y-2">
                  {mockFactChecks.map(f => (
                    <div key={f.id} className={`p-2.5 rounded-xl border ${f.status === 'verified' ? 'bg-green-50/50 border-green-100/60' : 'bg-red-50/50 border-red-100/60'}`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        {f.status === 'verified' ? (
                          <CheckCircle2 size={12} className="text-green-600" />
                        ) : (
                          <AlertTriangle size={12} className="text-red-600" />
                        )}
                        <span className="text-[11px] font-semibold text-ink-700">"{f.claim}"</span>
                        <span className={`ml-auto text-[9px] font-medium px-1.5 py-0.5 rounded-full ${f.status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {f.status === 'verified' ? '已验证' : '有争议'}
                        </span>
                      </div>
                      <p className="text-[10px] text-ink-400 leading-relaxed">{f.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function NotesPage() {
  const navigate = useNavigate()

  const openWorkspace = (ws: Workspace) => {
    navigate(`/notes/${ws.id}`)
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="px-8 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-[22px] font-bold text-ink-900 tracking-tight">
              工作间
            </h1>
            <p className="text-[11px] text-ink-400 mt-0.5">AI 辅助收集，多人协作，围绕事件深度调查</p>
          </div>
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-seal text-white text-[12px] font-semibold shadow-sm hover:bg-seal/90 active:scale-[0.97] transition-all">
            <Plus size={13} />
            新建工作间
          </button>
        </div>
      </div>

      <div className="px-8 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockWorkspaces.map(ws => (
            <WorkspaceCard key={ws.id} ws={ws} onClick={() => openWorkspace(ws)} />
          ))}

          <button
            onClick={() => {}}
            className="flex flex-col items-center justify-center gap-3 min-h-[200px] rounded-2xl border-2 border-dashed border-ink-100/60 hover:border-ink-200 hover:bg-ink-50/30 transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-ink-50 flex items-center justify-center group-hover:bg-ink-100 transition-colors">
              <Plus size={18} className="text-ink-300 group-hover:text-ink-500" />
            </div>
            <span className="text-[12px] text-ink-300 group-hover:text-ink-500">新建工作间</span>
          </button>
        </div>
      </div>
    </div>
  )
}
