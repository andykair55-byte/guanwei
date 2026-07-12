import { useNavigate } from 'react-router-dom'
import { Bot, Swords, Users, Gamepad2, Scale, MessageSquare, ChevronRight, Zap, Crown, Shield, Mic } from 'lucide-react'
import { useIsDesktop } from '../hooks/useIsDesktop'

interface GameCard {
  id: string
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>
  title: string
  desc: string
  btnText: string
  onClick?: () => void
  iconBg: string
  iconColor: string
  badge?: string
  disabled?: boolean
}

interface Category {
  id: string
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>
  label: string
  iconBg: string
  iconColor: string
  cards: GameCard[]
}

export default function EntertainmentHallPage() {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()

  const categories: Category[] = [
    // ── 🎭 表演类 ──
    {
      id: 'show',
      icon: Crown,
      label: '表演类',
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
      cards: [
        {
          id: 'ai-arena',
          icon: Bot,
          title: 'AI斗蛐蛐',
          desc: 'AI vs AI · 观战吃瓜',
          btnText: '观战',
          iconBg: 'bg-amber-100',
          iconColor: 'text-amber-600',
          badge: 'HOT',
          onClick: () => navigate('/debates'),
        },
        {
          id: 'round-table',
          icon: Swords,
          title: '圆桌局',
          desc: '舌战群儒 · 四神混战',
          btnText: '进入',
          iconBg: 'bg-rose-100',
          iconColor: 'text-rose-600',
          onClick: () => navigate('/round-table'),
        },
      ],
    },
    // ── 🎮 活动类 ──
    {
      id: 'interactive',
      icon: Zap,
      label: '活动类',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      cards: [
        {
          id: 'ai-battle',
          icon: Mic,
          title: '人机互动',
          desc: '亲自上阵 vs AI',
          btnText: '开战',
          iconBg: 'bg-seal/10',
          iconColor: 'text-seal',
          badge: 'NEW',
          onClick: () => navigate('/ai-battle'),
        },
      ],
    },
    // ── 🏟️ 真人辩论 ──
    {
      id: 'real-debate',
      icon: Users,
      label: '真人辩论',
      iconBg: 'bg-bamboo/10',
      iconColor: 'text-bamboo',
      cards: [
        {
          id: 'debate-lobby',
          icon: MessageSquare,
          title: '真实辩论',
          desc: '国赛4v4 · 进入房间列表',
          btnText: '进入',
          iconBg: 'bg-cyan-100',
          iconColor: 'text-cyan-600',
          onClick: () => navigate('/debate-lobby'),
        },
      ],
    },
    // ── ⚖️ 判官模式 ──
    {
      id: 'judge',
      icon: Scale,
      label: '判官模式',
      iconBg: 'bg-gold/10',
      iconColor: 'text-gold',
      cards: [
        {
          id: 'judge-mode',
          icon: Shield,
          title: '判官模式',
          desc: '看纠纷 · 当判官 · 断是非',
          btnText: '开审',
          iconBg: 'bg-gold/10',
          iconColor: 'text-gold',
          badge: 'NEW',
          onClick: () => navigate('/judge'),
        },
      ],
    },
    // ── 📦 其他类 ──
    {
      id: 'other',
      icon: Gamepad2,
      label: '其他类',
      iconBg: 'bg-ink-100',
      iconColor: 'text-ink-500',
      cards: [
        {
          id: 'melon-debate',
          icon: MessageSquare,
          title: '瓜田争议',
          desc: '真/假投票 · 吃瓜站队',
          btnText: '投票',
          iconBg: 'bg-pink-100',
          iconColor: 'text-pink-600',
          onClick: () => navigate('/debate/mock-1/热门话题'),
        },
      ],
    },
  ]

  return (
    <div className="flex flex-col min-h-full bg-paper-texture">
      {/* 标题区 */}
      <div className={`px-5 pt-3 pb-1 ${isDesktop ? 'max-w-5xl mx-auto w-full' : ''}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center shadow-sm">
            <Gamepad2 size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-[17px] font-bold text-ink-900 leading-tight">娱乐大厅</h1>
            <p className="text-[10px] text-ink-400">选个玩法，放松一下</p>
          </div>
        </div>
      </div>

      {/* 分类卡片区 */}
      <div className={`flex-1 px-5 pb-6 space-y-5 ${isDesktop ? 'max-w-5xl mx-auto w-full' : ''}`}>
        {categories.map((cat) => (
          <div key={cat.id}>
            {/* 分类标题 */}
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-6 h-6 rounded-lg ${cat.iconBg} flex items-center justify-center`}>
                <cat.icon size={13} className={cat.iconColor} strokeWidth={2} />
              </div>
              <span className="text-[13px] font-bold text-ink-800">{cat.label}</span>
            </div>

            {/* 卡片网格 */}
            <div className={`grid gap-2.5 ${isDesktop ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {cat.cards.map((card) => {
                const Icon = card.icon
                return (
                  <div
                    key={card.id}
                    className={`group bg-surface rounded-xl shadow-card border border-line/15 p-4 flex flex-col items-center text-center transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5 animate-fade-in-up ${
                      card.disabled ? 'opacity-60' : 'cursor-pointer'
                    }`}
                    onClick={() => !card.disabled && card.onClick?.()}
                  >
                    {/* 图标 */}
                    <div className={`relative w-12 h-12 rounded-2xl ${card.iconBg} flex items-center justify-center mb-2.5 transition-transform duration-300 group-hover:scale-110`}>
                      <Icon size={22} className={card.iconColor} strokeWidth={1.75} />
                      {card.badge && (
                        <span className={`absolute -top-1 -right-1 text-[7px] px-1.5 py-0.5 rounded-full font-bold ${
                          card.badge === 'HOT' ? 'bg-seal text-white' : 'bg-gold text-white'
                        }`}>
                          {card.badge}
                        </span>
                      )}
                    </div>

                    {/* 标题 */}
                    <h3 className="text-[14px] font-bold text-ink-900 mb-0.5">{card.title}</h3>

                    {/* 描述 */}
                    <p className="text-[10px] text-ink-400 mb-3">{card.desc}</p>

                    {/* 按钮 */}
                    <button
                      disabled={card.disabled}
                      className={`w-full py-2 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${
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
                      {!card.disabled && <ChevronRight size={11} />}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* 底部信息 */}
        <p className="text-[8px] text-ink-300 text-center pt-1">
          更多趣味活动即将上线，敬请期待
        </p>
      </div>
    </div>
  )
}