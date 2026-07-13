import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Bot, Mic, Swords, Wrench, Users, Play,
  Sparkles,
} from 'lucide-react'
import { useIsDesktop } from '../hooks/useIsDesktop'
import { getAllThemePacks } from '../services/themePackService'
import { TOPICS } from '../services/debateArenaService'

interface ArenaCard {
  id: string
  icon: typeof Bot
  title: string
  desc: string
  btnText: string
  gradient: string
  badge?: string
  badgeColor?: string
  players?: string
  onClick: () => void
}

export default function AIArenaLobby() {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const themePacks = getAllThemePacks()

  // 名人擂台卡片
  const themeCards: ArenaCard[] = themePacks.map((pack, i) => {
    // 用 pack.id 字符串 hash 生成稳定的"在看人数"，避免每次渲染跳变
    const seed = pack.id.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
    const viewerCount = 500 + (seed % 2000)
    return {
      id: pack.id,
      icon: Swords,
      title: `${pack.affirm.name} vs ${pack.negate.name}`,
      desc: pack.description,
      btnText: '观战',
      gradient: i % 2 === 0 ? 'from-amber-400 to-orange-500' : 'from-rose-400 to-pink-600',
      badge: pack.title,
      badgeColor: '#6366f1',
      players: `${viewerCount} 人在看`,
      onClick: () => navigate(`/entertainment/arena/ai-battle/${pack.topics[0].id}?theme=${pack.id}&affirm=${pack.affirm.id}&negate=${pack.negate.id}`),
    }
  })

  // 功能入口卡片
  const featureCards: ArenaCard[] = [
    {
      id: 'human-battle',
      icon: Mic,
      title: '人机对战',
      desc: '你 vs AI 辩手，谁才是辩论之王',
      btnText: '开战',
      gradient: 'from-red-500 to-rose-600',
      badge: 'NEW',
      badgeColor: '#22c55e',
      players: '856 人在玩',
      onClick: () => navigate('/entertainment/arena/human-battle'),
    },
    {
      id: 'free-battle',
      icon: Bot,
      title: '自由对战',
      desc: '自选 AI 角色，自定义辩题对战',
      btnText: '开始',
      gradient: 'from-cyan-400 to-blue-600',
      players: '1,208 人在玩',
      onClick: () => navigate(`/entertainment/arena/ai-battle/${TOPICS[0].id}`),
    },
    {
      id: 'forge',
      icon: Wrench,
      title: '角色工坊',
      desc: '自定义 AI 角色Prompt，AI 润色',
      btnText: '锻造',
      gradient: 'from-violet-400 to-purple-600',
      players: '124 人在线',
      onClick: () => navigate('/entertainment/arena/forge'),
    },
  ]

  const renderCard = (card: ArenaCard) => {
    const Icon = card.icon
    return (
      <div
        key={card.id}
        className="group relative bg-white rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}
        onClick={() => card.onClick()}
      >
        <div className={`h-1.5 bg-gradient-to-r ${card.gradient}`} />
        <div className="p-5 flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <div
              className={`w-16 h-16 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110`}
            >
              <Icon size={28} className="text-white" strokeWidth={2} />
            </div>
            {card.badge && (
              <div
                className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 text-[9px] font-bold text-white rounded"
                style={{ background: card.badgeColor }}
              >
                {card.badge}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-[16px] font-bold text-ink-900 leading-tight mb-1">{card.title}</h4>
            <p className="text-[12px] text-ink-400 leading-relaxed mb-3 line-clamp-2">{card.desc}</p>
            <div className="flex items-center justify-between">
              {card.players && (
                <div className="flex items-center gap-1 text-[11px] text-ink-400">
                  <Users size={12} />
                  <span>{card.players}</span>
                </div>
              )}
              <button
                className={`flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-white text-[12px] font-semibold bg-gradient-to-r ${card.gradient} transition-all duration-300 group-hover:shadow-md group-hover:scale-105`}
              >
                <Play size={12} fill="white" />
                {card.btnText}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full bg-paper-texture">
      {/* Header */}
      <div className={`px-5 pt-4 pb-3 flex items-center gap-3 ${isDesktop ? 'max-w-5xl mx-auto w-full' : ''}`}>
        <button onClick={() => navigate('/entertainment')} className="p-1.5 -ml-1.5 rounded-lg hover:bg-paper-dark transition-colors">
          <ArrowLeft size={20} className="text-ink-700" />
        </button>
        <div className="flex-1">
          <h1 className="text-[18px] font-bold text-ink-900">AI 竞技场</h1>
          <p className="text-[11px] text-ink-400">名人擂台 · 人机对战 · 角色工坊</p>
        </div>
      </div>

      <div className={`flex-1 px-5 pb-8 ${isDesktop ? 'max-w-5xl mx-auto w-full' : ''}`}>
        {/* 名人擂台区 */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-amber-500" />
            <h3 className="text-[15px] font-bold text-ink-900">名人擂台</h3>
            <span className="text-[11px] text-ink-400">历史名人对决，看谁更胜一筹</span>
          </div>
          <div className={`grid gap-4 ${isDesktop ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {themeCards.map(renderCard)}
          </div>
        </div>

        {/* 功能入口区 */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Bot size={16} className="text-seal" />
            <h3 className="text-[15px] font-bold text-ink-900">自由对战</h3>
            <span className="text-[11px] text-ink-400">自选角色，亲自上阵</span>
          </div>
          <div className={`grid gap-4 ${isDesktop ? 'grid-cols-3' : 'grid-cols-1'}`}>
            {featureCards.map(renderCard)}
          </div>
        </div>
      </div>
    </div>
  )
}
