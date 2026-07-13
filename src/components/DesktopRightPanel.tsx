import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Flame, ChevronRight, Sparkles, Lightbulb, ArrowUp, ArrowDown, Bot } from 'lucide-react'

// ── 通用数据 ──────────────────────────────────────
const hotEvents = [
  { id: 'hot-1', title: '某地暴雨引发城市内涝', heat: 8923 },
  { id: 'hot-2', title: 'AI生成内容版权归属引争议', heat: 7256 },
  { id: 'hot-3', title: '某明星直播翻车全程录屏', heat: 5834 },
  { id: 'hot-4', title: '高考作文题引发全网讨论', heat: 4521 },
]

const recommendedMelons = [
  { id: 'm-1', title: '网友称某品牌奶茶使用过期原料', guess: 'fake' as const },
  { id: 'm-2', title: '某地高考状元放弃清北选择职校', guess: 'real' as const },
  { id: 'm-3', title: '某网红捐款百万被质疑作秀', guess: 'pending' as const },
  { id: 'm-4', title: '网传某地将取消限购政策', guess: 'pending' as const },
]

const creativeTips = [
  '从不同角度审视事件，寻找被忽略的细节',
  '交叉验证多个信源，提升内容可信度',
  '用时间线梳理事件脉络，让逻辑更清晰',
  '关注当事人回应，第一手信息更有价值',
  '善用反向搜图，追踪图片真实来源',
]

const guessConfig = {
  real: { label: '疑似真', color: 'text-bamboo', bg: 'bg-bamboo/10' },
  fake: { label: '疑似假', color: 'text-seal', bg: 'bg-seal/10' },
  pending: { label: '待判定', color: 'text-gold', bg: 'bg-gold/10' },
}

const formatHeat = (num: number) => {
  if (num >= 10000) return `${(num / 10000).toFixed(1)}万`
  return num.toLocaleString()
}

// ── 瓜田专属数据 ──────────────────────────────────────
const melonDebates = [
  { id: 1, title: '大学学历在AI时代还有价值吗？', pro: 328, con: 284, status: '进行中' },
  { id: 2, title: '短视频正在摧毁深度思考能力', pro: 892, con: 756, status: '进行中' },
  { id: 3, title: '远程办公比坐班更高效', pro: 156, con: 132, status: '进行中' },
]

const platformStats = [
  { label: '今日新增求证', value: '1,328' },
  { label: '今日辩论参与', value: '2,847' },
  { label: '待验证内容', value: '156' },
]

const agentStatusList = [
  { id: 1, name: '研究员Agent', status: '搜索资料中...', progress: 72, color: 'from-emerald-400 to-emerald-600' },
  { id: 2, name: '记忆管理员Agent', status: '整理记忆中...', progress: 66, color: 'from-emerald-400 to-teal-500' },
  { id: 3, name: '教师Agent', status: '生成讲解中...', progress: 58, color: 'from-teal-400 to-emerald-500' },
  { id: 4, name: '审阅员Agent', status: '检查内容中...', progress: 20, color: 'from-emerald-300 to-emerald-500' },
]

interface DesktopRightPanelProps {
  collapsed?: boolean
}

// ── 瓜田专属右侧边栏 ──────────────────────────────────────
function MelonRightPanel() {
  const navigate = useNavigate()

  return (
    <aside className="w-full flex-shrink-0 h-full overflow-y-auto scrollbar-thin border-l border-[#ececec] px-5 py-6 space-y-6 bg-white">
      {/* 热点辩论 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-base">🔥</span>
            <h3 className="text-[15px] font-bold text-[#111] tracking-tight">热点辩论</h3>
          </div>
          <button
            onClick={() => navigate('/entertainment/arena')}
            className="flex items-center gap-0.5 text-[12px] text-[#999] hover:text-emerald-500 transition-colors"
          >
            更多 <ChevronRight size={12} />
          </button>
        </div>

        <div className="space-y-3">
          {melonDebates.map((debate) => (
            <button
              key={debate.id}
              onClick={() => navigate('/entertainment/arena')}
              className="w-full text-left group p-3 rounded-xl hover:bg-emerald-50/50 transition-colors border border-transparent hover:border-emerald-100"
            >
              <p className="text-[13px] text-[#333] leading-snug group-hover:text-[#111] transition-colors line-clamp-2 font-medium mb-2">
                {debate.title}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5 text-emerald-500">
                    <ArrowUp size={11} strokeWidth={2.5} />
                    <span className="text-[11px] font-semibold">{debate.pro}</span>
                  </div>
                  <div className="flex items-center gap-0.5 text-red-500">
                    <ArrowDown size={11} strokeWidth={2.5} />
                    <span className="text-[11px] font-semibold">{debate.con}</span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-500">
                  {debate.status}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* 参与辩论按钮 */}
        <button
          onClick={() => navigate('/entertainment/debate/lobby')}
          className="w-full mt-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-[13px] font-semibold rounded-xl transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
        >
          参与辩论
        </button>
      </section>

      <div className="h-px bg-[#f0f0f0]" />

      {/* 平台数据 */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-base">📊</span>
          <h3 className="text-[15px] font-bold text-[#111] tracking-tight">平台数据</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {platformStats.map((stat, idx) => (
            <div
              key={stat.label}
              className={`p-3 rounded-xl bg-gradient-to-br ${
                idx === 0 ? 'from-emerald-50 to-white' :
                idx === 1 ? 'from-teal-50 to-white' :
                'col-span-2 from-gray-50 to-white'
              } border border-gray-100`}
            >
              <div className="text-[18px] font-bold text-gray-800 mb-1">{stat.value}</div>
              <div className="text-[11px] text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="h-px bg-[#f0f0f0]" />

      {/* 智能体状态 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-base">🤖</span>
            <h3 className="text-[15px] font-bold text-[#111] tracking-tight">智能体状态</h3>
          </div>
          <button
            onClick={() => navigate('/agent-world')}
            className="flex items-center gap-0.5 text-[12px] text-[#999] hover:text-emerald-500 transition-colors"
          >
            查看全部 <ChevronRight size={12} />
          </button>
        </div>

        <div className="space-y-3">
          {agentStatusList.map((agent) => (
            <div
              key={agent.id}
              className="p-3 rounded-xl bg-gray-50/50 border border-gray-100"
            >
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center flex-shrink-0">
                  <Bot size={14} className="text-emerald-600" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-gray-800 truncate">{agent.name}</div>
                  <div className="text-[10px] text-gray-500 truncate">{agent.status}</div>
                </div>
              </div>
              {/* 进度条 */}
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${agent.color} rounded-full transition-all duration-500`}
                  style={{ width: `${agent.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </aside>
  )
}

// ── 主组件 ──────────────────────────────────────
export default function DesktopRightPanel({ collapsed = false }: DesktopRightPanelProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [tipIndex, setTipIndex] = useState(0)

  // 判断是否在瓜田页面（仅 /melon 列表页，不含详情页）
  const isMelonPage = location.pathname === '/melon'

  useEffect(() => {
    const id = setInterval(() => {
      setTipIndex(i => (i + 1) % creativeTips.length)
    }, 5000)
    return () => clearInterval(id)
  }, [])

  if (collapsed) {
    return (
      <aside className="w-full h-full flex flex-col bg-white border-l border-[#ececec] items-center py-5 gap-2">
        <button
          onClick={() => navigate('/hot')}
          title="热点摘要"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[#888] hover:bg-[#fef7f6] hover:text-[#c0392b] transition-all"
        >
          <Flame size={17} strokeWidth={1.75} />
        </button>
        <button
          onClick={() => navigate('/melon')}
          title="推荐瓜"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[#888] hover:bg-[#f5f5f5] hover:text-[#333] transition-all"
        >
          <Sparkles size={17} strokeWidth={1.75} />
        </button>
        <button
          title="创作提示"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[#888] hover:bg-[#f5f5f5] hover:text-[#333] transition-all"
        >
          <Lightbulb size={17} strokeWidth={1.75} />
        </button>
      </aside>
    )
  }

  // 瓜田页面显示专属内容
  if (isMelonPage) {
    return <MelonRightPanel />
  }

  return (
    <aside className="w-full flex-shrink-0 h-full overflow-y-auto scrollbar-thin border-l border-[#ececec] px-5 py-6 space-y-8 bg-white">
      {/* 热点摘要 */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Flame size={17} className="text-[#c0392b]" strokeWidth={2} />
            <h3 className="text-[15px] font-bold text-[#111] tracking-tight">热点摘要</h3>
          </div>
          <button
            onClick={() => navigate('/hot')}
            className="flex items-center gap-0.5 text-[12px] text-[#999] hover:text-[#333] transition-colors"
          >
            更多 <ChevronRight size={12} />
          </button>
        </div>

        <div className="space-y-0.5">
          {hotEvents.map((event, idx) => (
            <button
              key={event.id}
              onClick={() => navigate(`/hot/${event.id}`)}
              className="w-full text-left group p-4 rounded-xl hover:bg-[#fafafa] transition-colors"
            >
              <div className="flex items-start gap-2.5">
                <span className="text-[12px] font-bold text-[#ccc] group-hover:text-[#c0392b] transition-colors mt-0.5 flex-shrink-0 w-4">
                  {idx + 1}
                </span>
                <p className="text-[14px] text-[#333] leading-snug group-hover:text-[#111] transition-colors line-clamp-2 font-medium flex-1">
                  {event.title}
                </p>
              </div>
              <div className="flex items-center gap-1.5 mt-2 pl-6">
                <Flame size={11} className="text-[#c0392b]" />
                <span className="text-[11px] text-[#999] font-medium">{formatHeat(event.heat)}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="h-px bg-[#f0f0f0]" />

      {/* 推荐瓜 */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Sparkles size={17} className="text-[#c0392b]" strokeWidth={1.75} />
            <h3 className="text-[15px] font-bold text-[#111] tracking-tight">推荐瓜</h3>
          </div>
          <button
            onClick={() => navigate('/melon')}
            className="flex items-center gap-0.5 text-[12px] text-[#999] hover:text-[#333] transition-colors"
          >
            更多 <ChevronRight size={12} />
          </button>
        </div>

        <div className="space-y-0.5">
          {recommendedMelons.map((melon) => {
            const config = guessConfig[melon.guess]
            return (
              <button
                key={melon.id}
                onClick={() => navigate(`/melon/${melon.id}`)}
                className="w-full text-left group p-4 rounded-xl hover:bg-[#fafafa] transition-colors"
              >
                <p className="text-[14px] text-[#333] leading-snug group-hover:text-[#111] transition-colors line-clamp-2 mb-2 font-medium">
                  {melon.title}
                </p>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${config.bg} ${config.color}`}>
                  {config.label}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <div className="h-px bg-[#f0f0f0]" />

      {/* 创作提示 */}
      <section>
        <div className="flex items-center gap-2 mb-5">
          <Lightbulb size={17} className="text-[#c0392b]" strokeWidth={1.75} />
          <h3 className="text-[15px] font-bold text-[#111] tracking-tight">创作提示</h3>
        </div>

        <div className="bg-[#fafafa] rounded-xl p-5">
          <p key={tipIndex} className="text-[13px] text-[#555] leading-relaxed animate-fade-in-up">
            {creativeTips[tipIndex]}
          </p>
          <div className="flex items-center gap-1.5 mt-4">
            {creativeTips.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === tipIndex ? 'w-4 bg-[#c0392b]' : 'w-1 bg-[#e0e0e0]'
                }`}
              />
            ))}
          </div>
        </div>
      </section>
    </aside>
  )
}
