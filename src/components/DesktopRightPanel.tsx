import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Flame, ChevronRight, Sparkles, Lightbulb } from 'lucide-react'

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

interface DesktopRightPanelProps {
  collapsed?: boolean
}

export default function DesktopRightPanel({ collapsed = false }: DesktopRightPanelProps) {
  const navigate = useNavigate()
  const [tipIndex, setTipIndex] = useState(0)

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
