import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Crown, Flame, Radio, Eye, Heart,
  Zap, Trophy, Swords, Sparkles,
} from 'lucide-react'
import { getAllThemePacks } from '../services/themePackService'
import { TOPICS } from '../services/debateArenaService'
import { FACTION_MAP } from '../pages/AIArena'

// 角色立绘图片映射（和战斗页一致）
const CHARACTER_PORTRAITS: Record<string, string> = {
  'zhuge-liang': '/assets/arena/characters/zhuge-liang.jpg',
  'zhuge-liang-2': '/assets/arena/characters/zhuge-liang.jpg',
  'wang-lang': '/assets/arena/characters/wang-lang.jpg',
  'zhou-yu': '/assets/arena/characters/zhou-yu.jpg',
  'doubao': '/assets/arena/characters/doubao.jpg',
  'deepseek': '/assets/arena/characters/deepseek.jpg',
}

// 阵营色（和战斗页一致）
const FACTION_COLORS: Record<string, string> = {
  '蜀': '#3b82f6', '魏': '#dc2626', '吴': '#059669',
  '儒': '#7c3aed', '新': '#ea580c', '神': '#d97706',
  '字': '#3370ff', '深': '#4f46e5',
}

// 迷你角色立绘（有立绘图的角色用图片，其他用回退方案）
function MiniPortrait({ characterId, name, faction, side }: { characterId: string; name: string; faction: string; side: 'left' | 'right' }) {
  const color = FACTION_COLORS[faction] || '#6b7280'
  const portraitSrc = CHARACTER_PORTRAITS[characterId]
  return (
    <div className={`relative ${side === 'right' ? 'scale-x-[-1]' : ''}`}>
      <div
        className="w-12 h-14 rounded-lg overflow-hidden relative flex items-end justify-center"
        style={{
          background: `linear-gradient(180deg, ${color}20 0%, ${color}10 100%)`,
          border: `2px solid ${color}`,
          boxShadow: `0 2px 8px ${color}30`,
        }}
      >
        {portraitSrc ? (
          <img
            src={portraitSrc}
            alt={name}
            className="w-full h-full object-cover"
            style={{ imageRendering: 'auto' }}
          />
        ) : (
          <div className="flex flex-col items-center mb-0.5">
            <div
              className="w-6 h-6 rounded-full mb-0.5"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
            >
              <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-white"
                style={{ transform: side === 'right' ? 'scaleX(-1)' : undefined }}
              >
                {name[0]}
              </div>
            </div>
            <div className="w-7 h-4 rounded-t-sm" style={{ background: `${color}80` }} />
          </div>
        )}
        {/* 角装饰 */}
        <div className="absolute top-0 left-0 w-2 h-2" style={{ background: `linear-gradient(135deg, ${color} 0%, ${color} 50%, transparent 50%)` }} />
        <div className="absolute top-0 right-0 w-2 h-2" style={{ background: `linear-gradient(-135deg, ${color} 0%, ${color} 50%, transparent 50%)` }} />
      </div>
    </div>
  )
}

// ── 对战卡片（温暖竞技风格，和战斗页一致） ──
function BattleCard({
  title, subtitle, affirmName, negateName, affirmFaction, negateFaction,
  affirmId, negateId,
  viewerCount, onWatch, hot,
}: {
  title: string; subtitle: string;
  affirmName: string; negateName: string;
  affirmFaction: string; negateFaction: string;
  affirmId: string; negateId: string;
  viewerCount: number; onWatch: () => void;
  hot?: boolean;
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="relative cursor-pointer transition-all duration-200 rounded-2xl bg-white overflow-hidden"
      style={{
        boxShadow: hovered
          ? '0 8px 24px rgba(251,146,60,0.18)'
          : '0 2px 8px rgba(0,0,0,0.06)',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onWatch}
    >
      {/* 顶部彩色渐变条 */}
      <div className="h-1.5 bg-gradient-to-r from-amber-400 to-orange-500" />

      {/* HOT 标签（和战斗页 LIVE 徽章一致的圆角风格） */}
      {hot && (
        <div
          className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full text-white"
          style={{
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            boxShadow: '0 2px 8px rgba(239,68,68,0.35)',
          }}
        >
          <Flame size={10} className="text-white" />
          <span className="text-[9px] font-bold">HOT</span>
        </div>
      )}

      {/* 标题区 */}
      <div className="px-4 pt-3 pb-2 text-center">
        <h4 className="text-[13px] font-bold text-gray-900 mb-0.5">{title}</h4>
        <p className="text-[10px] text-gray-400">{subtitle}</p>
      </div>

      {/* 对决区 */}
      <div className="mx-3 mb-3 rounded-xl bg-gradient-to-r from-gray-50 via-amber-50/30 to-gray-50 flex items-center justify-around py-3 px-2">
        <MiniPortrait characterId={affirmId} name={affirmName} faction={affirmFaction} side="left" />
        {/* VS 装饰（和战斗页同款） */}
        <div className="flex flex-col items-center">
          <span className="text-[20px] font-black" style={{
            background: 'linear-gradient(180deg, #fbbf24, #dc2626)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 1px 2px rgba(249,115,22,0.4))',
          }}>VS</span>
          <div className="text-base -mt-1">⚔️</div>
        </div>
        <MiniPortrait characterId={negateId} name={negateName} faction={negateFaction} side="right" />
      </div>

      {/* 底部信息栏 */}
      <div className="flex items-center justify-between px-4 pb-3">
        {/* 观众数 */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <Eye size={11} className="text-gray-400" />
            <span className="text-[10px] text-gray-400 font-semibold">
              {viewerCount.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            <Heart size={9} className="text-red-400 fill-red-400" />
            <span className="text-[9px] text-gray-400">{Math.floor(viewerCount * 0.3).toLocaleString()}</span>
          </div>
        </div>

        {/* 观战按钮（圆角渐变） */}
        <button
          className="flex items-center gap-1 px-3 py-1 rounded-full text-white text-[10px] font-bold transition-all active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            boxShadow: '0 2px 8px rgba(249,115,22,0.3)',
          }}
        >
          <Radio size={9} className="text-white fill-white animate-pulse" />
          观战
        </button>
      </div>
    </div>
  )
}

// ── 功能入口卡片（温暖竞技风格） ──
function FeatureCard({
  icon, title, desc, btnText, color, badge, onClick,
}: {
  icon: React.ReactNode; title: string; desc: string; btnText: string;
  color: string; badge?: string; onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="relative cursor-pointer transition-all duration-200 rounded-2xl bg-white overflow-hidden"
      style={{
        boxShadow: hovered
          ? '0 8px 24px rgba(251,146,60,0.18)'
          : '0 2px 8px rgba(0,0,0,0.06)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {/* 顶部渐变条 */}
      <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${color}, ${color}cc)` }} />

      <div className="p-3">
        {/* 图标 */}
        <div className="flex items-start gap-3">
          <div
            className="flex items-center justify-center flex-shrink-0 rounded-xl"
            style={{
              width: 42,
              height: 42,
              background: `linear-gradient(135deg, ${color}, ${color}cc)`,
              boxShadow: `0 2px 8px ${color}40`,
            }}
          >
            {icon}
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-[12px] font-bold text-gray-900 mb-0.5">{title}</h4>
            <p className="text-[10px] text-gray-400 leading-relaxed mb-2">{desc}</p>
            <button
              className="flex items-center gap-1 px-3 py-1 rounded-full text-white text-[10px] font-bold transition-all active:scale-95"
              style={{
                background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                boxShadow: `0 2px 6px ${color}30`,
              }}
            >
              {btnText} →
            </button>
          </div>
        </div>
      </div>

      {badge && (
        <div
          className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-white text-[8px] font-bold z-10"
          style={{
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            boxShadow: '0 2px 6px rgba(34,197,94,0.4)',
          }}
        >
          {badge}
        </div>
      )}
    </div>
  )
}

export default function AIArenaLobby() {
  const navigate = useNavigate()
  const themePacks = getAllThemePacks()
  const [totalViewers, setTotalViewers] = useState(12847)

  useEffect(() => {
    const t = setInterval(() => setTotalViewers(v => v + Math.floor(Math.random() * 20) - 8), 2000)
    return () => clearInterval(t)
  }, [])

  const themeCards = themePacks.map((pack, i) => {
    const seed = pack.id.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
    const viewerCount = 800 + (seed % 1500)
    return {
      id: pack.id,
      title: `${pack.affirm.name} vs ${pack.negate.name}`,
      desc: pack.description,
      affirmName: pack.affirm.name,
      negateName: pack.negate.name,
      affirmFaction: FACTION_MAP[pack.affirm.id] || '儒',
      negateFaction: FACTION_MAP[pack.negate.id] || '儒',
      affirmId: pack.affirm.id,
      negateId: pack.negate.id,
      viewerCount,
      hot: i === 0,
      onClick: () => navigate(`/entertainment/arena/ai-battle/${pack.topics[0].id}?theme=${pack.id}&affirm=${pack.affirm.id}&negate=${pack.negate.id}`),
    }
  })

  const featureCards = [
    {
      id: 'human-battle',
      icon: <Swords size={18} className="text-white" strokeWidth={2} />,
      title: '人机对战',
      desc: '选择角色，与诸葛亮聊蜀国、和曹操聊用人',
      btnText: '选角色开战',
      color: '#dc2626',
      badge: 'NEW',
      onClick: () => navigate('/entertainment/arena/character-select'),
    },
    {
      id: 'forge',
      icon: <Zap size={18} className="text-white" strokeWidth={2} />,
      title: '角色工坊',
      desc: '自定义 AI 角色人设与 Prompt',
      btnText: '锻造',
      color: '#7c3aed',
      onClick: () => navigate('/entertainment/arena/forge'),
    },
  ]

  return (
    <div
      className="min-h-full relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #fff7ed 0%, #fffbeb 60px, #ffffff 300px)',
      }}
    >
      {/* 返回按钮（圆角浅色风格） */}
      <div className="px-4 md:px-6 pt-4 flex items-center gap-3 relative z-10">
        <button
          onClick={() => navigate('/entertainment')}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white text-gray-600 text-[11px] font-semibold transition-all hover:bg-gray-50 active:scale-95"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: '1px solid #f3f4f6' }}
        >
          <ArrowLeft size={12} />
          返回大厅
        </button>
      </div>

      <div className="px-4 md:px-6 pb-8 max-w-5xl mx-auto relative z-10">
        {/* ═══════ Banner: 竞技场主标题 ═══════ */}
        <div className="relative mt-4 mb-6">
          <div
            className="relative overflow-hidden rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, #fff7ed, #fed7aa, #fecaca)',
              boxShadow: '0 4px 20px rgba(251,146,60,0.18), inset 0 1px 0 rgba(255,255,255,0.6)',
              border: '1px solid #fed7aa80',
            }}
          >
            {/* 装饰光效 */}
            <div className="absolute top-0 left-1/4 w-40 h-40 rounded-full bg-amber-200/30 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-40 h-40 rounded-full bg-red-200/30 blur-3xl pointer-events-none" />

            <div className="relative px-6 md:px-10 py-6">
              <div className="flex items-center justify-between">
                <div>
                  {/* 主标题 */}
                  <div className="flex items-center gap-3 mb-2">
                    <Crown size={24} className="text-amber-500 fill-amber-400" />
                    <h1 className="text-[26px] font-black text-gray-900 tracking-wide">AI 竞技场</h1>
                  </div>
                  <p className="text-[11px] text-red-900/60 mb-3">⚔️ 史诗对决 · 名人擂台 · 围观 AI 神仙打架</p>

                  {/* 实时数据面板 */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* LIVE 徽章（圆角渐变，和战斗页一致） */}
                    <div
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-[11px] font-bold"
                      style={{
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                        boxShadow: '0 2px 8px rgba(239,68,68,0.35)',
                      }}
                    >
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      LIVE
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Eye size={12} className="text-red-400" />
                      <span className="text-[11px] text-red-900/70">
                        <span className="text-red-600 font-bold">{totalViewers.toLocaleString()}</span> 人围观
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Trophy size={12} className="text-amber-500" />
                      <span className="text-[11px] text-red-900/70">
                        <span className="text-red-600 font-bold">{themePacks.length}</span> 场名战
                      </span>
                    </div>
                  </div>
                </div>

                {/* 右侧装饰：emoji + 火焰光效 */}
                <div className="hidden md:block relative" style={{ width: 100, height: 80 }}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative">
                      <div className="text-5xl">⚔️</div>
                      {/* 火焰光效 */}
                      <div className="absolute -inset-4 rounded-full bg-orange-300/30 blur-2xl animate-pulse" />
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-2xl">🔥</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════ 名人擂台 ═══════ */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div
              className="flex items-center justify-center rounded-lg"
              style={{
                width: 28,
                height: 28,
                background: 'linear-gradient(135deg, #f59e0b, #dc2626)',
                boxShadow: '0 2px 6px rgba(245,158,11,0.3)',
              }}
            >
              <Crown size={14} className="text-white" />
            </div>
            <h3 className="text-[16px] font-bold text-gray-900">名人擂台</h3>
            <span className="text-[10px] text-gray-400">HALL OF FAME</span>
            <div className="ml-auto flex items-center gap-1">
              <Flame size={12} className="text-orange-500" />
              <span className="text-[10px] text-orange-500 font-semibold">火热进行中</span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {themeCards.map(card => (
              <BattleCard key={card.id} {...card} onWatch={card.onClick} />
            ))}
          </div>
        </div>

        {/* ═══════ 自由对战 ═══════ */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div
              className="flex items-center justify-center rounded-lg"
              style={{
                width: 28,
                height: 28,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                boxShadow: '0 2px 6px rgba(99,102,241,0.3)',
              }}
            >
              <Swords size={14} className="text-white" />
            </div>
            <h3 className="text-[16px] font-bold text-gray-900">自由对战</h3>
            <span className="text-[10px] text-gray-400">FREE MODE</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {featureCards.map(card => (
              <FeatureCard key={card.id} {...card} />
            ))}
          </div>
        </div>

        {/* 底部提示（浅色圆角） */}
        <div className="mt-8 text-center">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-100"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
          >
            <Zap size={11} className="text-amber-500" />
            <span className="text-[10px] text-gray-400">
              AI 辩论内容由大语言模型生成，仅供娱乐 · 观点不代表平台立场
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
