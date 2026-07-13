import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Swords, Users, Play, Zap } from 'lucide-react'
import { useIsDesktop } from '../hooks/useIsDesktop'

interface DebateMode {
  id: string
  icon: typeof Swords
  title: string
  desc: string
  btnText: string
  gradient: string
  badge?: string
  badgeColor?: string
  players?: string
  onClick: () => void
}

export default function DebateHallLobby() {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()

  const modes: DebateMode[] = [
    {
      id: 'round-table',
      icon: Zap,
      title: '圆桌局',
      desc: '5 人混合（人 + AI）· 自定义辩题 · 轻量快速',
      btnText: '进入',
      gradient: 'from-violet-500 to-rose-500',
      badge: 'DEMO',
      badgeColor: '#8b5cf6',
      players: '128 人在玩',
      onClick: () => navigate('/entertainment/debate/round-table'),
    },
    {
      id: 'national-4v4',
      icon: Swords,
      title: '4v4 国赛辩论',
      desc: '开篇立论 → 攻辩 → 自由辩论 → 总结陈词',
      btnText: '匹配',
      gradient: 'from-emerald-400 to-teal-600',
      badge: 'HOT',
      badgeColor: '#ef4444',
      players: '432 人在线',
      onClick: () => navigate('/entertainment/debate/lobby'),
    },
  ]

  const renderCard = (mode: DebateMode) => {
    const Icon = mode.icon
    return (
      <div
        key={mode.id}
        className="group relative bg-white rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}
        onClick={() => mode.onClick()}
      >
        <div className={`h-1.5 bg-gradient-to-r ${mode.gradient}`} />
        <div className="p-5 flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <div
              className={`w-16 h-16 rounded-xl bg-gradient-to-br ${mode.gradient} flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110`}
            >
              <Icon size={28} className="text-white" strokeWidth={2} />
            </div>
            {mode.badge && (
              <div
                className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 text-[9px] font-bold text-white rounded"
                style={{ background: mode.badgeColor }}
              >
                {mode.badge}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-[16px] font-bold text-ink-900 leading-tight mb-1">{mode.title}</h4>
            <p className="text-[12px] text-ink-400 leading-relaxed mb-3 line-clamp-2">{mode.desc}</p>
            <div className="flex items-center justify-between">
              {mode.players && (
                <div className="flex items-center gap-1 text-[11px] text-ink-400">
                  <Users size={12} />
                  <span>{mode.players}</span>
                </div>
              )}
              <button
                className={`flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-white text-[12px] font-semibold bg-gradient-to-r ${mode.gradient} transition-all duration-300 group-hover:shadow-md group-hover:scale-105`}
              >
                <Play size={12} fill="white" />
                {mode.btnText}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full bg-paper-texture">
      <div className={`px-5 pt-4 pb-3 flex items-center gap-3 ${isDesktop ? 'max-w-5xl mx-auto w-full' : ''}`}>
        <button onClick={() => navigate('/entertainment')} className="p-1.5 -ml-1.5 rounded-lg hover:bg-paper-dark transition-colors">
          <ArrowLeft size={20} className="text-ink-700" />
        </button>
        <div className="flex-1">
          <h1 className="text-[18px] font-bold text-ink-900">真人辩论厅</h1>
          <p className="text-[11px] text-ink-400">圆桌局 · 4v4 国赛机制</p>
        </div>
      </div>

      <div className={`flex-1 px-5 pb-8 ${isDesktop ? 'max-w-5xl mx-auto w-full' : ''}`}>
        <div className={`grid gap-4 ${isDesktop ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {modes.map(renderCard)}
        </div>

        {/* 规则说明 */}
        <div className="mt-6 p-4 bg-surface rounded-xl border border-line/30">
          <h3 className="text-[13px] font-bold text-ink-700 mb-2">4v4 国赛流程</h3>
          <div className="text-[11px] text-ink-500 leading-relaxed space-y-1">
            <p>1. 开篇立论：正反方一辩各 3 分钟</p>
            <p>2. 攻辩环节：二辩三辩交叉质询，各 1.5 分钟</p>
            <p>3. 攻辩小结：一辩总结，各 1.5 分钟</p>
            <p>4. 自由辩论：双方交替，各 4 分钟</p>
            <p>5. 总结陈词：四辩结辩，各 3.5 分钟</p>
            <p className="text-ink-400 mt-2">人数不足时 AI 自动补位 · 辩论结束后 AI 裁判评分</p>
          </div>
        </div>
      </div>
    </div>
  )
}
