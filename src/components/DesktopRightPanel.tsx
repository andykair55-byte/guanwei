import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Flame, ChevronRight, BarChart3, Zap } from 'lucide-react'

const hotDebates = [
  { id: 'debate-1', topic: '大学学历在AI时代还有价值吗？', proCount: 328, conCount: 284 },
  { id: 'debate-2', topic: '短视频正在摧毁深度思考能力', proCount: 892, conCount: 756 },
  { id: 'debate-3', topic: '远程办公比坐班更高效', proCount: 156, conCount: 132 },
]

const platformStats = {
  todayNewUsers: 1328,
  pendingContent: 156,
  todayDebates: 2847,
}

const agentStatuses = [
  { name: '研究员', status: '搜索资料中', progress: 72 },
  { name: '记忆管理员', status: '整理记忆中', progress: 66 },
  { name: '教师', status: '生成讲解中', progress: 58 },
  { name: '审阅员', status: '检查内容中', progress: 20 },
]

interface DesktopRightPanelProps {
  collapsed?: boolean
}

export default function DesktopRightPanel({ collapsed = false }: DesktopRightPanelProps) {
  const navigate = useNavigate()
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 3000)
    return () => clearInterval(id)
  }, [])

  const formatNumber = (num: number) => num.toLocaleString()

  if (collapsed) {
    return (
      <aside className="w-full h-full flex flex-col bg-white border-l border-[#ececec] items-center py-5 gap-2">
        <button
          onClick={() => navigate('/debate-lobby')}
          title="热点辩论"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[#888] hover:bg-[#fef7f6] hover:text-[#c0392b] transition-all"
        >
          <Flame size={17} strokeWidth={1.75} />
        </button>
        <button
          title="平台数据"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[#888] hover:bg-[#f5f5f5] hover:text-[#333] transition-all"
        >
          <BarChart3 size={17} strokeWidth={1.75} />
        </button>
        <button
          title="智能体状态"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[#888] hover:bg-[#f5f5f5] hover:text-[#333] transition-all"
        >
          <Zap size={17} strokeWidth={1.75} />
        </button>
      </aside>
    )
  }

  return (
    <aside className="w-full flex-shrink-0 h-full overflow-y-auto scrollbar-thin border-l border-[#ececec] px-5 py-6 space-y-7 bg-white">
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame size={16} className="text-[#c0392b]" strokeWidth={2} />
            <h3 className="text-[13px] font-bold text-[#111] tracking-tight">热点辩论</h3>
          </div>
          <button
            onClick={() => navigate('/debate-lobby')}
            className="flex items-center gap-0.5 text-[12px] text-[#999] hover:text-[#333] transition-colors"
          >
            更多 <ChevronRight size={12} />
          </button>
        </div>

        <div className="space-y-1">
          {hotDebates.map((debate) => (
            <button
              key={debate.id}
              onClick={() => navigate(`/debate-room/${debate.id}`)}
              className="w-full text-left group p-3.5 rounded-xl hover:bg-[#fafafa] transition-colors"
            >
              <p className="text-[13px] text-[#333] leading-snug group-hover:text-[#111] transition-colors line-clamp-2 mb-2.5 font-medium">
                {debate.topic}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#fef7f6] text-[#c0392b]">
                  正方 {debate.proCount}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#f5f5f5] text-[#666]">
                  反方 {debate.conCount}
                </span>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={() => navigate('/debate-lobby')}
          className="w-full mt-5 py-2.5 text-white text-[13px] font-semibold rounded-xl bg-[#111] hover:bg-[#333] transition-colors shadow-sm"
        >
          参与辩论
        </button>
      </section>

      <div className="h-px bg-[#f0f0f0]" />

      <section>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={16} className="text-[#555]" strokeWidth={1.75} />
          <h3 className="text-[13px] font-bold text-[#111] tracking-tight">平台数据</h3>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-[#fafafa] p-3.5 rounded-xl">
            <p className="text-[10px] text-[#999] mb-1 font-medium">今日求证</p>
            <p className="text-[20px] font-bold text-[#111] font-mono tracking-tight">{formatNumber(platformStats.todayNewUsers)}</p>
          </div>
          <div className="bg-[#fafafa] p-3.5 rounded-xl">
            <p className="text-[10px] text-[#999] mb-1 font-medium">今日辩论</p>
            <p className="text-[20px] font-bold text-[#111] font-mono tracking-tight">{formatNumber(platformStats.todayDebates)}</p>
          </div>
          <div className="col-span-2 bg-[#fafafa] p-3.5 rounded-xl">
            <p className="text-[10px] text-[#999] mb-1 font-medium">待验证内容</p>
            <p className="text-[20px] font-bold text-[#111] font-mono tracking-tight">{formatNumber(platformStats.pendingContent)}</p>
          </div>
        </div>
      </section>

      <div className="h-px bg-[#f0f0f0]" />

      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-[#555]" strokeWidth={1.75} />
            <h3 className="text-[13px] font-bold text-[#111] tracking-tight">智能体状态</h3>
          </div>
        </div>

        <div className="space-y-1">
          {agentStatuses.map((agent) => {
            const jitter = tick % 2 === 0 ? 0 : Math.random() * 4 - 2
            const displayProgress = agent.progress > 0 ? Math.min(100, Math.max(0, agent.progress + jitter)) : 0
            return (
              <div key={agent.name} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#fafafa] transition-colors">
                <div className="w-8 h-8 rounded-lg bg-[#111] flex items-center justify-center flex-shrink-0 shadow-sm">
                  <span className="text-[9px] font-bold text-white">{agent.name[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-[12px] font-semibold text-[#222] truncate">{agent.name}</p>
                    <span className="text-[10px] font-mono text-[#999] flex-shrink-0 ml-2 font-medium">
                      {Math.round(displayProgress)}%
                    </span>
                  </div>
                  <p className="text-[10px] text-[#999] truncate mb-1.5">{agent.status}</p>
                  <div className="h-1 bg-[#f0f0f0] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#111] rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${displayProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </aside>
  )
}
