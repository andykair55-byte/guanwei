import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bot, Swords, Users, Gamepad2, Scale,
  Shield, Sparkles,
  Star, Trophy, Play,
} from 'lucide-react'
import { useIsDesktop } from '../hooks/useIsDesktop'

/* ═══════════════════════════════════════════════════════
   像素风工具函数 & 样式
   ═══════════════════════════════════════════════════════ */

// 像素化边框（通过多层 box-shadow 模拟）
const pixelBorderStyle: React.CSSProperties = {
  boxShadow: `
    0 -3px 0 0 #1a1a2e,
    0 3px 0 0 #1a1a2e,
    -3px 0 0 0 #1a1a2e,
    3px 0 0 0 #1a1a2e,
    -3px -3px 0 0 #1a1a2e,
    3px -3px 0 0 #1a1a2e,
    -3px 3px 0 0 #1a1a2e,
    3px 3px 0 0 #1a1a2e
  `,
  borderRadius: '2px',
  imageRendering: 'pixelated',
}

interface GameCard {
  id: string
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>
  title: string
  desc: string
  btnText: string
  onClick?: () => void
  gradient: string
  badge?: string
  badgeColor?: string
  pixelColor: string
  players?: string
}

interface Category {
  id: string
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>
  label: string
  gradient: string
  description: string
  cards: GameCard[]
}

export default function EntertainmentHallPage() {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all')

  const categories: Category[] = [
    // ── 🤖 AI 竞技场 ──
    {
      id: 'arena',
      icon: Bot,
      label: 'AI 竞技场',
      gradient: 'from-amber-400 via-orange-500 to-red-500',
      description: '看 AI 神仙打架，亲自上阵单挑',
      cards: [
        {
          id: 'ai-battle',
          icon: Bot,
          title: 'AI 斗蛐蛐',
          desc: '诸葛亮 vs 王朗 · 名人擂台 · 自由对战',
          btnText: '观战',
          gradient: 'from-amber-400 to-orange-500',
          pixelColor: '#f59e0b',
          badge: 'HOT',
          badgeColor: '#ef4444',
          players: '2,341 人在看',
          onClick: () => navigate('/entertainment/arena'),
        },
      ],
    },
    // ── 👥 真人辩论厅 ──
    {
      id: 'debate',
      icon: Users,
      label: '真人辩论厅',
      gradient: 'from-emerald-400 via-teal-500 to-cyan-600',
      description: '娱乐辩论 · 专业国赛',
      cards: [
        {
          id: 'debate-lobby',
          icon: Swords,
          title: '娱乐辩论',
          desc: '6人独立麦位 · AI审核排队 · 认可度积分',
          btnText: '进入',
          gradient: 'from-emerald-400 to-teal-600',
          pixelColor: '#10b981',
          players: '432 人在线',
          onClick: () => navigate('/entertainment/debate'),
        },
        {
          id: 'debate-national',
          icon: Scale,
          title: '国赛辩论',
          desc: '4v4 世锦赛赛制 · 评委打分 · 严格流程',
          btnText: '进入',
          gradient: 'from-teal-500 to-cyan-600',
          pixelColor: '#06b6d4',
          badge: 'NEW',
          badgeColor: '#22c55e',
          players: '128 人在赛',
          onClick: () => navigate('/entertainment/debate/national'),
        },
      ],
    },
    // ── ⚖️ 判官台 ──
    {
      id: 'judge',
      icon: Scale,
      label: '判官台',
      gradient: 'from-amber-500 via-orange-500 to-red-500',
      description: '看纠纷 · 当判官 · 断是非',
      cards: [
        {
          id: 'judge-mode',
          icon: Shield,
          title: '我是判官',
          desc: '审理纠纷案件 · 瓜田真假站队',
          btnText: '开审',
          gradient: 'from-yellow-400 via-amber-500 to-orange-600',
          pixelColor: '#f59e0b',
          badge: 'NEW',
          badgeColor: '#22c55e',
          players: '678 人在审',
          onClick: () => navigate('/entertainment/judge'),
        },
      ],
    },
  ]

  // ── 像素星星装饰 ──
  const PixelStars = ({ count = 8 }: { count?: number }) => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="absolute animate-pulse"
          style={{
            left: `${(i * 13 + 7) % 90 + 5}%`,
            top: `${(i * 23 + 15) % 70 + 10}%`,
            width: '4px',
            height: '4px',
            background: 'white',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.3)',
            animationDelay: `${i * 0.3}s`,
            animationDuration: '2s',
            imageRendering: 'pixelated',
          }}
        />
      ))}
    </div>
  )

  return (
    <div className="flex flex-col min-h-full" style={{ background: 'linear-gradient(180deg, #F5F3FF 0%, #ffffff 320px)' }}>
      {/* ═══════ 顶部 Banner（社区风格）═══════ */}
      <div
        className="mx-6 mt-5 mb-5 rounded-2xl overflow-hidden relative"
        style={{
          background: 'linear-gradient(135deg, #FDF2F8 0%, #FAF5FF 30%, #F5F3FF 60%, #EEF2FF 100%)',
        }}
      >
        <PixelStars count={12} />

        <div className="flex items-center justify-between px-8 py-7 relative z-10">
          {/* 左侧文字 */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white rounded"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                  imageRendering: 'pixelated',
                  letterSpacing: '0.05em',
                }}
              >
                <Gamepad2 size={12} />
                ARCADE
              </span>
            </div>
            <h1 className="text-[28px] font-bold text-gray-900 leading-tight tracking-tight">
              娱乐大厅
              <span className="text-[14px] font-medium text-gray-400 ml-3 font-mono">v1.0</span>
            </h1>
            <p className="text-[15px] text-gray-500 leading-relaxed max-w-md">
              三馆制娱乐：AI 竞技场看神仙打架，真人辩论厅亲自上阵，判官台断是非
            </p>
            <div className="flex items-center gap-4 mt-1">
              <div className="flex items-center gap-1.5 text-[12px] text-gray-400">
                <Users size={14} />
                <span>当前 <span className="font-semibold text-gray-600">8,521</span> 人在线</span>
              </div>
              <div className="flex items-center gap-1.5 text-[12px] text-gray-400">
                <Trophy size={14} className="text-amber-500" />
                <span>本周 <span className="font-semibold text-gray-600">1,234</span> 场对局</span>
              </div>
            </div>
          </div>

          {/* 右侧像素风游戏机装饰 */}
          <div className="hidden md:block relative w-40 h-32">
            {/* 游戏机主体 */}
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-24"
              style={{
                background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
                borderRadius: '4px',
                boxShadow: `
                  0 4px 0 0 #0f0f1a,
                  inset 0 2px 0 0 rgba(255,255,255,0.1)
                `,
              }}
            >
              {/* 屏幕 */}
              <div
                className="absolute top-3 left-3 right-3 h-12"
                style={{
                  background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
                  borderRadius: '2px',
                  boxShadow: 'inset 0 0 20px rgba(99, 102, 241, 0.2)',
                }}
              >
                {/* 像素文字 */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex gap-0.5">
                    {['G', 'O', '!'].map((char, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-bold"
                        style={{
                          color: i === 2 ? '#fbbf24' : '#22d3ee',
                          textShadow: '1px 1px 0 #0f172a',
                          fontFamily: 'monospace',
                          animation: `pixelBlink 1s steps(2) infinite`,
                          animationDelay: `${i * 0.2}s`,
                        }}
                      >
                        {char}
                      </span>
                    ))}
                  </div>
                </div>
                {/* 扫描线效果 */}
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
                  }}
                />
              </div>
              {/* 按钮 */}
              <div className="absolute bottom-2 left-4 w-4 h-4 rounded-full bg-red-500 shadow-inner" />
              <div className="absolute bottom-2 right-4 flex gap-1">
                <div className="w-3 h-3 rounded-full bg-blue-400 shadow-inner" />
                <div className="w-3 h-3 rounded-full bg-green-400 shadow-inner" />
              </div>
            </div>
            {/* 顶部装饰 */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 flex gap-2">
              <Star size={16} className="text-amber-400 fill-amber-400 animate-pulse" />
              <Sparkles size={20} className="text-pink-400 fill-pink-400/50" />
              <Star size={14} className="text-cyan-400 fill-cyan-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
          </div>
        </div>

        {/* 装饰性光斑 */}
        <div className="absolute -top-6 right-8 w-24 h-24 rounded-full bg-violet-200/30 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-20 h-20 rounded-full bg-pink-200/30 blur-xl pointer-events-none" />
      </div>

      {/* ═══════ 分类 Tab 栏（社区风格）═══════ */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-md z-10 border-b border-gray-100">
        <div className="flex items-center gap-2 px-6 py-3 overflow-x-auto scrollbar-none">
          <button
            className={`px-4 py-2 text-[13px] font-semibold rounded-full transition-all duration-200 whitespace-nowrap flex-shrink-0 flex items-center gap-1.5 ${
              activeCategoryId === 'all'
                ? 'text-white shadow-md'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
            style={activeCategoryId === 'all' ? {
              background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
              boxShadow: '0 2px 10px -2px rgba(168, 85, 247, 0.5)',
            } : {}}
            onClick={() => setActiveCategoryId('all')}
          >
            <Gamepad2 size={14} strokeWidth={2} />
            全部
          </button>
          {categories.map((cat) => {
            const isActive = activeCategoryId === cat.id
            return (
              <button
                key={cat.id}
                className={`px-4 py-2 text-[13px] font-semibold rounded-full transition-all duration-200 whitespace-nowrap flex-shrink-0 flex items-center gap-1.5 ${
                  isActive
                    ? 'text-white shadow-md'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                style={isActive ? {
                  background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
                  boxShadow: '0 2px 10px -2px rgba(168, 85, 247, 0.5)',
                } : {}}
                onClick={() => setActiveCategoryId(cat.id)}
              >
                <cat.icon size={14} strokeWidth={2} />
                {cat.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ═══════ 游戏卡片区 ═══════ */}
      <div className="flex-1 px-6 py-6 pb-10">
        {categories
          .filter(cat => activeCategoryId === 'all' || cat.id === activeCategoryId)
          .map((cat, ci) => (
          <div key={cat.id} className="mb-8 last:mb-0">
            {/* 分类标题 */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md"
                  style={{
                    background: `linear-gradient(135deg, ${
                      cat.gradient.includes('fuchsia') ? '#d946ef' :
                      cat.gradient.includes('cyan') ? '#06b6d4' :
                      cat.gradient.includes('amber') ? '#f59e0b' : '#6b7280'
                    }, ${
                      cat.gradient.includes('indigo') ? '#6366f1' :
                      cat.gradient.includes('red') ? '#ef4444' : '#525252'
                    })`,
                  }}
                >
                  <cat.icon size={18} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-[17px] font-bold text-gray-900">{cat.label}</h3>
                  <p className="text-[12px] text-gray-400">{cat.description}</p>
                </div>
              </div>
              <span className="text-[12px] text-gray-400 font-mono">
                {cat.cards.length} 款游戏
              </span>
            </div>

            {/* 卡片网格 */}
            <div className={`grid gap-4 ${isDesktop ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {cat.cards.map((card, i) => {
                const Icon = card.icon
                return (
                  <div
                    key={card.id}
                    className="group relative bg-white rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 animate-fade-in-up"
                    style={{
                      animationDelay: `${ci * 80 + i * 60}ms`,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
                    }}
                    onClick={() => card.onClick?.()}
                  >
                    {/* 顶部渐变条 */}
                    <div
                      className={`h-1.5 bg-gradient-to-r ${card.gradient}`}
                    />

                    <div className="p-5 flex items-center gap-4">
                      {/* 像素风图标容器 */}
                      <div className="relative flex-shrink-0">
                        <div
                          className={`w-16 h-16 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110`}
                          style={{
                            boxShadow: `
                              0 4px 12px ${card.pixelColor}30,
                              inset 0 2px 0 rgba(255,255,255,0.3),
                              inset 0 -2px 0 rgba(0,0,0,0.1)
                            `,
                          }}
                        >
                          <Icon size={28} className="text-white" strokeWidth={2} />
                        </div>
                        {/* 像素角标 */}
                        {card.badge && (
                          <div
                            className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 text-[9px] font-bold text-white font-mono"
                            style={{
                              background: card.badgeColor,
                              borderRadius: '2px',
                              boxShadow: '1px 1px 0 rgba(0,0,0,0.2)',
                              letterSpacing: '0.05em',
                            }}
                          >
                            {card.badge}
                          </div>
                        )}
                      </div>

                      {/* 文字区 */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[16px] font-bold text-gray-900 leading-tight mb-1">
                          {card.title}
                        </h4>
                        <p className="text-[12px] text-gray-400 leading-relaxed mb-3 line-clamp-2">
                          {card.desc}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-[11px] text-gray-400">
                            <Users size={12} />
                            <span>{card.players}</span>
                          </div>
                          <button
                            className={`flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-white text-[12px] font-semibold bg-gradient-to-r ${card.gradient} transition-all duration-300 group-hover:shadow-md group-hover:scale-105`}
                          >
                            <Play size={12} fill="white" />
                            {card.btnText}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 像素装饰点 */}
                    <div className="absolute bottom-3 right-3 flex gap-0.5 opacity-30">
                      {[0, 1, 2].map(dot => (
                        <div
                          key={dot}
                          className="w-1.5 h-1.5 rounded-sm"
                          style={{
                            background: card.pixelColor,
                            opacity: 1 - dot * 0.3,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* 底部信息 */}
        <div className="mt-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-50 text-[12px] text-gray-400">
            <Sparkles size={12} className="text-amber-400" />
            <span>更多趣味玩法即将上线，敬请期待</span>
          </div>
        </div>
      </div>

      {/* 全局像素动画 keyframes */}
      <style>{`
        @keyframes pixelBlink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
