import { useNavigate } from 'react-router-dom'
import { Swords, Eye, Flame, TrendingUp } from 'lucide-react'

// Mock 热门辩论数据
const hotDebates = [
  { id: 'room-melon-1', topic: '大学学历在AI时代还有价值吗？', spectators: 328, round: 3 },
  { id: 'room-melon-2', topic: '短视频正在摧毁深度思考能力', spectators: 892, round: 5 },
  { id: 'room-melon-3', topic: '远程办公比坐班更高效', spectators: 156, round: 2 },
  { id: 'room-melon-6', topic: '网红带货是不是新型传销', spectators: 445, round: 4 },
  { id: 'room-melon-7', topic: '年轻人该不该躺平', spectators: 610, round: 3 },
]

const trendingTopics = [
  '某顶流男星隐婚生子',
  '自研芯片超越骁龙8 Gen 4',
  '室温超导复现争议',
  '隔夜水致癌真相',
]

interface DesktopRightPanelProps {
  onCollapse?: () => void
  width?: number
}

export default function DesktopRightPanel(_props: DesktopRightPanelProps = {}) {
  const navigate = useNavigate()

  return (
    <aside className="w-[280px] flex-shrink-0 h-full overflow-y-auto panel-right border-l border-line/30">
      {/* 热门辩论 */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg bg-seal/[0.07] flex items-center justify-center">
            <Flame size={14} className="text-seal" />
          </div>
          <h3 className="text-[15px] font-semibold text-ink-900">正在激辩</h3>
          <span className="ml-auto text-[11px] text-ink-400 bg-ink-100/50 px-2 py-0.5 rounded-full">{hotDebates.length} 场</span>
        </div>
        <div className="space-y-1.5">
          {hotDebates.map((debate, i) => (
            <button
              key={debate.id}
              onClick={() => navigate(`/debate-room/${debate.id}`)}
              className="w-full text-left p-3 rounded-xl bg-[#f8f9fa] border border-line/15 hover:border-seal/15 hover:bg-white transition-all duration-150 group"
            >
              <div className="flex items-start gap-2.5">
                <span className={`text-sm font-bold mt-0.5 w-4 text-center ${i < 3 ? 'text-seal' : 'text-ink-400/60'}`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] text-ink-700 font-medium line-clamp-2 leading-snug group-hover:text-seal transition-colors duration-200">
                    {debate.topic}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="flex items-center gap-1 text-[12px] text-ink-400">
                      <Eye size={12} strokeWidth={1.5} />
                      {debate.spectators}
                    </span>
                    <span className="flex items-center gap-1 text-[12px] text-bamboo">
                      <span className="w-1.5 h-1.5 rounded-full bg-bamboo animate-glow-pulse" />
                      第{debate.round}轮
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 分隔线 */}
      <div className="mx-4 border-t border-line/15" />

      {/* 热搜话题 */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg bg-gold/[0.07] flex items-center justify-center">
            <TrendingUp size={14} className="text-gold" />
          </div>
          <h3 className="text-[15px] font-semibold text-ink-900">热搜话题</h3>
        </div>
        <div className="space-y-0.5">
          {trendingTopics.map((topic, i) => (
            <button
              key={topic}
              onClick={() => navigate('/verify', { state: { query: topic } })}
              className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-left hover:bg-ink-100/40 transition-colors duration-200 group"
            >
              <span className={`text-[13px] font-bold w-4 text-center ${i < 3 ? 'text-seal' : 'text-ink-400/60'}`}>
                {i + 1}
              </span>
              <span className="text-[14px] text-ink-600 line-clamp-1 group-hover:text-ink-900 transition-colors">{topic}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 进入辩论大厅 */}
      <div className="px-4 pb-5">
        <button
          onClick={() => navigate('/debate-lobby')}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-seal/[0.05] text-seal text-[14px] font-medium hover:bg-seal/[0.1] transition-colors duration-200 border border-seal/[0.08]"
        >
          <Swords size={16} strokeWidth={1.6} />
          进入辩论大厅
        </button>
      </div>
    </aside>
  )
}
