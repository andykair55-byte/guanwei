import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Bot, Swords, Bug, ChevronRight } from 'lucide-react'
import { useIsDesktop } from '../hooks/useIsDesktop'

interface ModeCard {
  id: string
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>
  title: string
  desc: string
  btnText: string
  disabled?: boolean
  onClick?: () => void
  iconBg: string
  iconColor: string
}

export default function EntertainmentHallPage() {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()

  const cards: ModeCard[] = [
    {
      id: 'ai-duel',
      icon: Bot,
      title: '人机对决',
      desc: '你 vs AI',
      btnText: '开始',
      iconBg: 'bg-seal/10',
      iconColor: 'text-seal',
      onClick: () => navigate('/debate-lobby'),
    },
    {
      id: 'multi-debate',
      icon: Swords,
      title: '多人辩论',
      desc: '即将开放',
      btnText: '期待',
      disabled: true,
      iconBg: 'bg-ink-100',
      iconColor: 'text-ink-400',
    },
    {
      id: 'ai-battle',
      icon: Bug,
      title: 'AI斗蛐蛐',
      desc: 'AI vs AI',
      btnText: '开始',
      iconBg: 'bg-bamboo/10',
      iconColor: 'text-bamboo',
      onClick: () => navigate('/ai-battle'),
    },
  ]

  return (
    <div className="flex flex-col min-h-full bg-paper-texture">
      {/* 顶部导航 */}
      <div className={`px-5 pt-4 pb-2 flex items-center gap-3 ${isDesktop ? 'max-w-5xl mx-auto w-full' : ''}`}>
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 -ml-1.5 rounded-lg hover:bg-paper-dark transition-colors active:scale-95"
        >
          <ArrowLeft size={20} className="text-ink-700" />
        </button>
        <div className="flex-1">
          <h1 className={`${isDesktop ? 'text-xl' : 'text-[16px]'} font-bold text-ink-900`}>娱乐大厅</h1>
          <p className="text-[11px] text-ink-400">选择一个模式开始享受</p>
        </div>
      </div>

      {/* 卡片区 */}
      <div className={`flex-1 px-5 pb-8 ${isDesktop ? 'max-w-5xl mx-auto w-full' : ''}`}>
        <div className={`grid gap-4 ${isDesktop ? 'grid-cols-3' : 'grid-cols-1'}`}>
          {cards.map((card, idx) => {
            const Icon = card.icon
            return (
              <div
                key={card.id}
                className={`group bg-surface rounded-2xl shadow-card border border-line/20 p-6 flex flex-col items-center text-center transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 animate-fade-in-up ${
                  card.disabled ? 'opacity-70' : 'cursor-pointer'
                }`}
                style={{ animationDelay: `${idx * 60}ms` }}
                onClick={() => !card.disabled && card.onClick?.()}
              >
                {/* 图标 */}
                <div className={`w-16 h-16 rounded-2xl ${card.iconBg} flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110`}>
                  <Icon size={28} className={card.iconColor} strokeWidth={1.75} />
                </div>

                {/* 标题 */}
                <h2 className="text-[16px] font-bold text-ink-900 mb-1">{card.title}</h2>

                {/* 描述 */}
                <p className="text-[12px] text-ink-400 mb-5">{card.desc}</p>

                {/* 按钮 */}
                <button
                  disabled={card.disabled}
                  className={`w-full py-2.5 rounded-xl text-[13px] font-semibold transition-all flex items-center justify-center gap-1 ${
                    card.disabled
                      ? 'bg-ink-100 text-ink-400 cursor-not-allowed'
                      : 'bg-ink-900 text-white active:scale-[0.97] group-hover:bg-seal'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!card.disabled) card.onClick?.()
                  }}
                >
                  {card.btnText}
                  {!card.disabled && <ChevronRight size={14} />}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
