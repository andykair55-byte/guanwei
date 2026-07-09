import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Flame, ChevronRight, BarChart3, Search, Database, BookOpen, ClipboardCheck, FileText, Zap } from 'lucide-react'

const hotDebates = [
  {
    id: 'debate-1',
    topic: '大学学历在AI时代还有价值吗？',
    proCount: 328,
    conCount: 284,
    status: '进行中',
  },
  {
    id: 'debate-2',
    topic: '短视频正在摧毁深度思考能力',
    proCount: 892,
    conCount: 756,
    status: '进行中',
  },
  {
    id: 'debate-3',
    topic: '远程办公比坐班更高效',
    proCount: 156,
    conCount: 132,
    status: '进行中',
  },
]

const platformStats = {
  todayNewUsers: 1328,
  pendingContent: 156,
  todayDebates: 2847,
}

const agentStatuses = [
  { name: '研究员', status: '搜索资料中', progress: 72, icon: Search },
  { name: '记忆管家', status: '记忆检索中', progress: 66, icon: Database },
  { name: '教师', status: '整理资料中', progress: 58, icon: BookOpen },
  { name: '审阅员', status: '检查中', progress: 20, icon: ClipboardCheck },
  { name: '总结员', status: '待命中', progress: 0, icon: FileText },
]

interface DesktopRightPanelProps {
  onCollapse?: () => void
  width?: number
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-[3px] rounded-full overflow-hidden" style={{ background: '#f0f1f3' }}>
      <div
        className="h-full rounded-full transition-all duration-500 ease-out"
        style={{ width: `${value}%`, background: '#d4dae0' }}
      />
    </div>
  )
}

export default function DesktopRightPanel({ width = 220 }: DesktopRightPanelProps = {}) {
  const navigate = useNavigate()
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 3000)
    return () => clearInterval(id)
  }, [])

  const formatNumber = (num: number) => num.toLocaleString()

  return (
    <aside
      className="flex-shrink-0 h-full overflow-y-auto scrollbar-none p-4 space-y-4"
      style={{ width, background: '#fff', borderLeft: '1px solid #f0f1f3' }}
    >
      {/* Hot debates */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Flame size={12} className="text-ink-300" strokeWidth={1.5} />
            <h3 className="text-[11px] font-medium text-ink-400">热点辩论</h3>
          </div>
          <button
            onClick={() => navigate('/debate-lobby')}
            className="flex items-center gap-0.5 text-[10px] text-ink-300 hover:text-ink-500 transition-colors"
          >
            更多 <ChevronRight size={10} />
          </button>
        </div>

        <div className="space-y-2">
          {hotDebates.slice(0, 2).map((debate, i) => {
            const total = debate.proCount + debate.conCount
            const proPercent = total > 0 ? (debate.proCount / total) * 100 : 50
            return (
              <button
                key={debate.id}
                onClick={() => navigate(`/debate-room/${debate.id}`)}
                className="w-full text-left group rounded-xl p-3 transition-colors hover:bg-white"
              >
                <div className="flex items-start gap-2">
                  <span className="text-[11px] font-medium text-ink-200 w-4 flex-shrink-0 mt-0.5 font-mono">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-ink-600 font-medium line-clamp-2 leading-relaxed group-hover:text-ink-800 transition-colors">
                      {debate.topic}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-[9px] text-ink-300 font-mono">
                        {formatNumber(debate.proCount)}
                      </span>
                      <div className="flex-1">
                        <ProgressBar value={proPercent} />
                      </div>
                      <span className="text-[9px] text-ink-300 font-mono">
                        {formatNumber(debate.conCount)}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <button
          onClick={() => navigate('/debate-lobby')}
          className="w-full mt-2 py-2 text-[11px] font-medium rounded-xl transition-all hover:bg-white text-ink-500"
          style={{ border: '1px solid #f0f1f3' }}
        >
          参与辩论
        </button>
      </section>

      {/* Platform stats */}
      <section>
        <div className="flex items-center gap-1.5 mb-3">
          <BarChart3 size={12} className="text-ink-300" strokeWidth={1.5} />
          <h3 className="text-[11px] font-medium text-ink-400">今日数据</h3>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="text-center p-3 rounded-xl bg-white">
            <p className="text-[9px] text-ink-300">新增用户</p>
            <p className="text-[15px] font-semibold text-ink-700 mt-1 font-mono">{formatNumber(platformStats.todayNewUsers)}</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-white">
            <p className="text-[9px] text-ink-300">待验证</p>
            <p className="text-[15px] font-semibold text-ink-700 mt-1 font-mono">{formatNumber(platformStats.pendingContent)}</p>
          </div>
        </div>
        <div className="text-center p-3 rounded-xl bg-white mt-2">
          <p className="text-[9px] text-ink-300">辩论参与</p>
          <p className="text-[15px] font-semibold text-ink-700 mt-1 font-mono">{formatNumber(platformStats.todayDebates)}</p>
        </div>
      </section>

      {/* Agent status */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Zap size={12} className="text-ink-300" strokeWidth={1.5} />
            <h3 className="text-[11px] font-medium text-ink-400">智能体</h3>
          </div>
          <span className="text-[9px] font-mono text-ink-200">
            {agentStatuses.filter(a => a.progress > 0).length}/{agentStatuses.length}
          </span>
        </div>

        <div className="space-y-2.5">
          {agentStatuses.map((agent) => {
            const Icon = agent.icon
            const jitter = tick % 2 === 0 ? 0 : Math.random() * 4 - 2
            const displayProgress = agent.progress > 0 ? Math.min(100, Math.max(0, agent.progress + jitter)) : 0
            return (
              <div key={agent.name} className="flex items-center gap-2.5">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: '#f0f1f3' }}
                >
                  <Icon size={12} className="text-ink-400" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-medium text-ink-500 truncate">{agent.name}</p>
                    {agent.progress > 0 && (
                      <span className="text-[9px] font-mono text-ink-300">
                        {Math.round(displayProgress)}%
                      </span>
                    )}
                  </div>
                  <ProgressBar value={displayProgress} />
                </div>
              </div>
            )
          })}
        </div>

        <button
          onClick={() => navigate('/agent-world')}
          className="w-full mt-3 py-2 text-[11px] font-medium rounded-xl transition-all hover:bg-white text-ink-400 flex items-center justify-center gap-1"
          style={{ border: '1px solid #f0f1f3' }}
        >
          Agent 世界
        </button>
      </section>
    </aside>
  )
}
