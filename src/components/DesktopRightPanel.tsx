import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Flame, ChevronRight, Sparkles, Lightbulb, ArrowUp, ArrowDown, Bot, MessageCircle, TrendingUp } from 'lucide-react'

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

// ── 社区专属数据 ──────────────────────────────────────
const communityDiscussions = [
  { id: 1, title: '如何看待AI替代人类创造力？', replies: 234, views: 1892, hot: true },
  { id: 2, title: '大学生兼职避坑指南', replies: 156, views: 3241, hot: true },
  { id: 3, title: '最近读了一本改变认知的书', replies: 89, views: 987, hot: false },
]

const communityStats = [
  { label: '今日新帖', value: '2,156' },
  { label: '活跃用户', value: '8,423' },
  { label: '待回复求助', value: '47' },
]

const communityAgentStatus = [
  { id: 1, name: '观点分析师', status: '运行中', progress: 85, pixel: 'analyst' as const },
  { id: 2, name: '事实核查员', status: '运行中', progress: 62, pixel: 'checker' as const },
  { id: 3, name: '内容推荐官', status: '待命', progress: 100, pixel: 'recommender' as const },
  { id: 4, name: '社区守护者', status: '运行中', progress: 34, pixel: 'guardian' as const },
]

const communityTips = [
  '分享独特视角，你的观点可能启发他人',
  '理性讨论胜过情绪输出，用事实说话',
  '发现好内容别忘了点赞，鼓励创作者',
  '深度思考 > 快速站队，让子弹飞一会儿',
  '交叉验证信息来源，做理性判断者',
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

// ── 像素风 Agent 状态头像 ──────────────────────────────────
function PixelAgentAvatar({ type, active }: { type: 'analyst' | 'checker' | 'recommender' | 'guardian'; active: boolean }) {
  // 每种 Agent 类型用不同的像素图案
  const patterns: Record<string, string[]> = {
    analyst: [
      '01010',
      '11111',
      '01010',
      '01110',
      '10001',
    ],
    checker: [
      '10101',
      '01010',
      '10101',
      '01010',
      '10101',
    ],
    recommender: [
      '01110',
      '11111',
      '11111',
      '01110',
      '00100',
    ],
    guardian: [
      '11111',
      '10001',
      '10001',
      '10001',
      '11111',
    ],
  }

  const colorMap: Record<string, string> = {
    analyst: '#8b5cf6',
    checker: '#3b82f6',
    recommender: '#10b981',
    guardian: '#f59e0b',
  }

  const pattern = patterns[type]
  const color = colorMap[type]

  return (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 relative"
      style={{
        background: active ? `${color}15` : '#f5f5f5',
        border: `2px solid ${active ? color : '#e0e0e0'}`,
        imageRendering: 'pixelated',
      }}
    >
      {/* 像素网格 */}
      <div className="grid grid-cols-5 gap-px" style={{ imageRendering: 'pixelated' }}>
        {pattern.join('').split('').map((cell, i) => (
          <div
            key={i}
            className="w-[3px] h-[3px]"
            style={{
              backgroundColor: cell === '1' ? color : 'transparent',
            }}
          />
        ))}
      </div>
      {/* 运行指示灯 */}
      {active && (
        <div
          className="absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse"
          style={{
            backgroundColor: color,
            boxShadow: `0 0 4px ${color}`,
          }}
        />
      )}
    </div>
  )
}

// ── 像素风 Agent 状态图（社区专属） ──────────────────────────
function PixelAgentStatusChart() {
  return (
    <div className="relative p-4 rounded-xl bg-gray-900 overflow-hidden" style={{ imageRendering: 'pixelated' }}>
      {/* 像素网格背景 */}
      <div className="absolute inset-0 opacity-10">
        {Array.from({ length: 8 }).map((_, row) => (
          <div key={row} className="flex">
            {Array.from({ length: 12 }).map((_, col) => (
              <div
                key={col}
                className="w-3 h-3 border border-gray-700"
                style={{
                  backgroundColor: (row + col) % 3 === 0 ? '#1a1a2e' : 'transparent',
                }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* 状态栏标题 */}
      <div className="relative flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            <div className="w-1.5 h-1.5 bg-green-400" />
            <div className="w-1.5 h-1.5 bg-green-400" />
            <div className="w-1.5 h-1.5 bg-yellow-400 animate-pulse" />
          </div>
          <span className="text-[9px] font-mono text-green-400 tracking-wider">SYS.STATUS</span>
        </div>
        <span className="text-[8px] font-mono text-gray-500">v2.4.1</span>
      </div>

      {/* Agent 状态行 */}
      <div className="relative space-y-2.5">
        {communityAgentStatus.map((agent) => {
          const isActive = agent.status === '运行中'
          const colorMap: Record<string, string> = {
            analyst: '#8b5cf6',
            checker: '#3b82f6',
            recommender: '#10b981',
            guardian: '#f59e0b',
          }
          const color = colorMap[agent.pixel]

          return (
            <div key={agent.id} className="flex items-center gap-2">
              <PixelAgentAvatar type={agent.pixel} active={isActive} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-gray-300 truncate">{agent.name}</span>
                  <span
                    className="text-[8px] font-mono px-1.5 py-0.5 rounded-sm"
                    style={{
                      color: isActive ? color : '#6b7280',
                      backgroundColor: isActive ? `${color}20` : '#1f2937',
                      border: `1px solid ${isActive ? color : '#374151'}`,
                    }}
                  >
                    {agent.status}
                  </span>
                </div>
                {/* 像素进度条 */}
                <div className="flex gap-px h-2">
                  {Array.from({ length: 10 }).map((_, i) => {
                    const filled = i < Math.round(agent.progress / 10)
                    return (
                      <div
                        key={i}
                        className="flex-1"
                        style={{
                          backgroundColor: filled ? color : '#1f2937',
                          boxShadow: filled ? `0 0 2px ${color}40` : 'none',
                        }}
                      />
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 底部信号指示 */}
      <div className="relative mt-3 pt-2 border-t border-gray-700/50 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          <span className="text-[8px] font-mono text-gray-500">3/4 ACTIVE</span>
        </div>
        <span className="text-[8px] font-mono text-gray-600">PING: 12ms</span>
      </div>
    </div>
  )
}

// ── 社区专属右侧边栏 ──────────────────────────────────────
function CommunityRightPanel() {
  const navigate = useNavigate()
  const [tipIndex, setTipIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setTipIndex(i => (i + 1) % communityTips.length)
    }, 5000)
    return () => clearInterval(id)
  }, [])

  return (
    <aside className="w-full flex-shrink-0 h-full overflow-y-auto scrollbar-thin border-l border-[#ececec] px-5 py-6 space-y-6 bg-white">
      {/* 创作提示（顶部） */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb size={17} className="text-rose-500" strokeWidth={1.75} />
          <h3 className="text-[15px] font-bold text-[#111] tracking-tight">创作提示</h3>
        </div>

        <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-4 border border-rose-100/50">
          <p key={tipIndex} className="text-[13px] text-rose-800/80 leading-relaxed animate-fade-in-up">
            {communityTips[tipIndex]}
          </p>
          <div className="flex items-center gap-1.5 mt-3">
            {communityTips.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === tipIndex ? 'w-4 bg-rose-400' : 'w-1 bg-rose-200'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      <div className="h-px bg-[#f0f0f0]" />

      {/* 热点讨论 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-base">💬</span>
            <h3 className="text-[15px] font-bold text-[#111] tracking-tight">热点讨论</h3>
          </div>
          <button
            onClick={() => navigate('/community')}
            className="flex items-center gap-0.5 text-[12px] text-[#999] hover:text-rose-500 transition-colors"
          >
            更多 <ChevronRight size={12} />
          </button>
        </div>

        <div className="space-y-3">
          {communityDiscussions.map((disc) => (
            <button
              key={disc.id}
              onClick={() => navigate('/community')}
              className="w-full text-left group p-3 rounded-xl hover:bg-rose-50/50 transition-colors border border-transparent hover:border-rose-100"
            >
              <div className="flex items-start gap-2 mb-2">
                {disc.hot && (
                  <Flame size={12} className="text-rose-500 flex-shrink-0 mt-0.5" />
                )}
                <p className="text-[13px] text-[#333] leading-snug group-hover:text-[#111] transition-colors line-clamp-2 font-medium">
                  {disc.title}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-gray-400">
                  <MessageCircle size={11} />
                  <span className="text-[11px] font-medium">{disc.replies}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  <TrendingUp size={11} />
                  <span className="text-[11px] font-medium">{disc.views}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="h-px bg-[#f0f0f0]" />

      {/* 平台数据 */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-base">📊</span>
          <h3 className="text-[15px] font-bold text-[#111] tracking-tight">社区数据</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {communityStats.map((stat, idx) => (
            <div
              key={stat.label}
              className={`p-3 rounded-xl bg-gradient-to-br ${
                idx === 0 ? 'from-rose-50 to-white' :
                idx === 1 ? 'from-pink-50 to-white' :
                'col-span-2 from-violet-50 to-white'
              } border border-gray-100`}
            >
              <div className="text-[18px] font-bold text-gray-800 mb-1">{stat.value}</div>
              <div className="text-[11px] text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="h-px bg-[#f0f0f0]" />

      {/* 智能体状态（像素风） */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-base">🤖</span>
            <h3 className="text-[15px] font-bold text-[#111] tracking-tight">智能体状态</h3>
          </div>
          <button
            onClick={() => navigate('/agent-world')}
            className="flex items-center gap-0.5 text-[12px] text-[#999] hover:text-rose-500 transition-colors"
          >
            查看全部 <ChevronRight size={12} />
          </button>
        </div>

        <PixelAgentStatusChart />
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
  const isCommunityPage = location.pathname === '/community'

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

  // 社区页面显示专属内容
  if (isCommunityPage) {
    return <CommunityRightPanel />
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
