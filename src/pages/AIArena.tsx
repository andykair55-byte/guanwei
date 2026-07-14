import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Play, FastForward, Trophy, RotateCcw,
  MessageCircle, Share2, MoreHorizontal, ThumbsUp,
  Swords as SwordsIcon, RefreshCw, Loader2,
  Flame, Sparkles, Send, Radio, Users,
  BookOpen, Zap, Download, Circle, Crown,
  ChevronLeft, Eye, Heart,
} from 'lucide-react'
import {
  getTopic, getMockMatch,
  type DebateMatch, type DebateRound, type Highlight, type TauntMoment, type FinalResult, type ThinkingStep,
} from '../services/debateArenaService'
import { type AICharacter } from '../services/characters'
import { initThemeDebate, runThemeDebate } from '../services/themeDebateService'
import DanmakuOverlay from '../components/DanmakuOverlay'
import { pickDanmaku, toQueueItems, type DanmakuQueueItem, type DanmakuTrigger } from '../services/danmakuService'
import PixelAvatar, { PixelAvatarSmall } from '../components/PixelAvatar'

// ===== 角色立绘图片映射 =====
const CHARACTER_PORTRAITS: Record<string, string> = {
  'zhuge-liang': '/assets/arena/characters/zhuge-liang.jpg',
  'zhuge-liang-2': '/assets/arena/characters/zhuge-liang.jpg',
  'wang-lang': '/assets/arena/characters/wang-lang.jpg',
  'zhou-yu': '/assets/arena/characters/zhou-yu.jpg',
  'doubao': '/assets/arena/characters/doubao.jpg',
  'deepseek': '/assets/arena/characters/deepseek.jpg',
}

// 角色立绘图组件（大图，用于对战舞台）
function CharacterPortraitImg({ characterId, side }: { characterId: string; side: 'left' | 'right' }) {
  const src = CHARACTER_PORTRAITS[characterId]
  if (!src) return <PixelAvatar characterId={characterId} name={characterId} size={160} />
  return (
    <img
      src={src}
      alt={characterId}
      className="w-full h-full object-contain"
      style={{
        imageRendering: 'auto',
        transform: side === 'right' ? 'scaleX(-1)' : undefined,
      }}
      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
    />
  )
}

// 角色立绘图组件（小图，用于聊天气泡/思考过程/嘲讽卡）
function CharacterPortraitSmall({ characterId, size = 28, flip = false }: { characterId: string; size?: number; flip?: boolean }) {
  const src = CHARACTER_PORTRAITS[characterId]
  if (!src) return <PixelAvatarSmall characterId={characterId} name={characterId} size={size} flip={flip} />
  return (
    <div
      className="rounded-lg overflow-hidden flex items-center justify-center"
      style={{
        width: size, height: size,
        background: 'linear-gradient(135deg, #f0f4f8, #e2e8f0)',
      }}
    >
      <img
        src={src}
        alt={characterId}
        className="w-full h-full object-cover"
        style={{
          imageRendering: 'auto',
          transform: flip ? 'scaleX(-1)' : undefined,
        }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
    </div>
  )
}

// ===== 角色阵营/称号映射 =====
export const FACTION_MAP: Record<string, string> = {
  'zhuge-liang': '蜀', 'zhuge-liang-2': '蜀',
  'wang-lang': '魏',
  'mengzi': '儒', 'xunzi': '儒',
  'zhou-yu': '吴',
  'doubao': '字',
  'deepseek': '深',
  'baize': '神', 'xiezhi': '神',
}

// 称号（三国杀武将牌风格）
const TITLE_MAP: Record<string, string> = {
  'zhuge-liang': '军师·智绝天下',
  'zhuge-liang-2': '军师·智绝天下',
  'wang-lang': '名士·口若悬河',
  'mengzi': '亚圣·浩然正气',
  'xunzi': '大儒·礼法并重',
  'zhou-yu': '都督·雄姿英发',
  'doubao': 'AI·活泼亲和',
  'deepseek': 'AI·深度推理',
  'baize': '神兽·博古通今',
  'xiezhi': '法兽·铁面无私',
}

const SKILL_TAGS: Record<string, { name: string; emoji: string }[]> = {
  'zhuge-liang': [{ name: '舌战群儒', emoji: '⚔️' }, { name: '空城计', emoji: '🏯' }],
  'wang-lang': [{ name: '巧言令色', emoji: '💬' }, { name: '偷换概念', emoji: '🎭' }],
  'doubao': [{ name: '玩梗达人', emoji: '😎' }, { name: '接地气', emoji: '🤝' }],
  'deepseek': [{ name: '深度推理', emoji: '🧠' }, { name: '数据制胜', emoji: '📊' }],
  'baize': [{ name: '数据洞察', emoji: '📊' }, { name: '逻辑推演', emoji: '🔍' }],
  'xiezhi': [{ name: '铁面无私', emoji: '⚖️' }, { name: '一击必杀', emoji: '⚔️' }],
}

// 阵营颜色
const FACTION_COLORS: Record<string, { main: string; light: string; bg: string; glow: string; barFrom: string; barTo: string }> = {
  '蜀': { main: '#3b82f6', light: '#dbeafe', bg: '#eff6ff', glow: 'rgba(59,130,246,0.3)', barFrom: '#3b82f6', barTo: '#60a5fa' },
  '魏': { main: '#dc2626', light: '#fee2e2', bg: '#fef2f2', glow: 'rgba(220,38,38,0.3)', barFrom: '#dc2626', barTo: '#f87171' },
  '吴': { main: '#059669', light: '#d1fae5', bg: '#ecfdf5', glow: 'rgba(5,150,105,0.3)', barFrom: '#059669', barTo: '#34d399' },
  '儒': { main: '#7c3aed', light: '#ede9fe', bg: '#f5f3ff', glow: 'rgba(124,58,237,0.3)', barFrom: '#7c3aed', barTo: '#a78bfa' },
  '新': { main: '#ea580c', light: '#ffedd5', bg: '#fff7ed', glow: 'rgba(234,88,12,0.3)', barFrom: '#ea580c', barTo: '#fb923c' },
  '神': { main: '#d97706', light: '#fef3c7', bg: '#fffbeb', glow: 'rgba(217,119,6,0.3)', barFrom: '#d97706', barTo: '#fbbf24' },
  '字': { main: '#3370ff', light: '#dbeafe', bg: '#eff6ff', glow: 'rgba(51,112,255,0.3)', barFrom: '#3370ff', barTo: '#60a5fa' },
  '深': { main: '#1a1a6e', light: '#e0e7ff', bg: '#eef2ff', glow: 'rgba(26,26,110,0.3)', barFrom: '#1a1a6e', barTo: '#4f46e5' },
}

// ===== 打字动画 Hook =====
function useTypingAnimation(text: string, speed: number = 25, trigger: boolean = false) {
  const [displayed, setDisplayed] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  useEffect(() => {
    if (!trigger || !text) { setDisplayed(''); return }
    setIsTyping(true); setDisplayed('')
    let i = 0
    const timer = setInterval(() => {
      i++; setDisplayed(text.slice(0, i))
      if (i >= text.length) { clearInterval(timer); setIsTyping(false) }
    }, speed)
    return () => clearInterval(timer)
  }, [text, speed, trigger])
  return { displayed, isTyping }
}

type Phase = 'think-affirm' | 'affirm' | 'think-negate' | 'negate' | 'scored'
interface RevealedState { round: DebateRound; phase: Phase }

// ===== 弹幕消息类型 =====
interface LiveComment {
  id: number
  user: string
  avatar: string
  text: string
  likes: number
  isHighlight?: boolean
  isHot?: boolean
  time: string
}

// ===== 竖排武将名牌（三国杀风格）=====
function VerticalNameBanner({ name, faction, title, side }: {
  name: string; faction: string; title: string; side: 'left' | 'right'
}) {
  const colors = FACTION_COLORS[faction] || FACTION_COLORS['蜀']
  return (
    <div
      className={`absolute top-3 ${side === 'left' ? 'left-2' : 'right-2'} z-20 flex flex-col items-center`}
      style={{ writingMode: 'vertical-rl' }}
    >
      {/* 主牌 */}
      <div
        className="relative px-1 py-2 min-h-[110px] flex flex-col items-center gap-0.5 rounded"
        style={{
          background: `linear-gradient(180deg, ${colors.main} 0%, ${colors.barTo} 100%)`,
          boxShadow: `0 3px 10px ${colors.glow}, inset 0 1px 0 rgba(255,255,255,0.3)`,
          writingMode: 'vertical-rl',
        }}
      >
        {/* 阵营标记 */}
        <div
          className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
          style={{
            background: 'rgba(255,255,255,0.25)',
            border: '1px solid rgba(255,255,255,0.4)',
            writingMode: 'horizontal-tb',
          }}
        >
          {faction}
        </div>
        {/* 名字 */}
        <span
          className="text-[15px] font-black text-white tracking-wider mt-3"
          style={{
            textShadow: '0 2px 4px rgba(0,0,0,0.4)',
            fontFamily: '"STKaiti", "KaiTi", "SimSun", serif',
            writingMode: 'vertical-rl',
            letterSpacing: '0.15em',
          }}
        >
          {name}
        </span>
        {/* 装饰线 */}
        <div className="w-px h-3 bg-white/40 my-0.5" style={{ writingMode: 'horizontal-tb' }} />
        {/* 称号 */}
        <span
          className="text-[8px] text-white/80 font-medium tracking-wide"
          style={{ writingMode: 'vertical-rl', letterSpacing: '0.1em' }}
        >
          {title}
        </span>
      </div>
    </div>
  )
}

// ===== 武将立绘区域（带渐变背景和装饰）=====
function CharacterPortrait({ char, faction, side, isActive }: {
  char: AICharacter; faction: string; side: 'left' | 'right'; isActive: boolean
}) {
  const colors = FACTION_COLORS[faction] || FACTION_COLORS['蜀']
  return (
    <div className={`relative flex-1 flex ${side === 'right' ? 'justify-end' : 'justify-start'}`}>
      {/* 立绘容器 */}
      <div
        className={`relative ${side === 'right' ? 'mr-0' : 'ml-0'} w-[180px] md:w-[220px] transition-transform duration-500 ${isActive ? 'scale-105' : 'scale-100'}`}
      >
        {/* 竖排名字牌（盖在卡片内部侧边） */}
        <VerticalNameBanner
          name={char.name}
          faction={faction}
          title={TITLE_MAP[char.id] || char.title}
          side={side}
        />
        {/* 背景光晕 */}
        <div
          className="absolute inset-0 rounded-2xl blur-xl opacity-40"
          style={{ background: `radial-gradient(ellipse, ${colors.barTo}40 0%, transparent 70%)` }}
        />

        {/* 角色图框（三国杀卡牌风格边框） */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${colors.light} 0%, white 40%, ${colors.light} 100%)`,
            border: `3px solid ${colors.main}`,
            boxShadow: isActive
              ? `0 0 24px ${colors.glow}, 0 8px 32px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8)`
              : `0 4px 16px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)`,
          }}
        >
          {/* 角装饰 */}
          <div className="absolute top-0 left-0 w-6 h-6 z-10" style={{
            background: `linear-gradient(135deg, ${colors.main} 0%, ${colors.main} 50%, transparent 50%)`,
          }} />
          <div className="absolute top-0 right-0 w-6 h-6 z-10" style={{
            background: `linear-gradient(-135deg, ${colors.main} 0%, ${colors.main} 50%, transparent 50%)`,
          }} />
          <div className="absolute bottom-0 left-0 w-6 h-6 z-10" style={{
            background: `linear-gradient(225deg, ${colors.main} 0%, ${colors.main} 50%, transparent 50%)`,
          }} />
          <div className="absolute bottom-0 right-0 w-6 h-6 z-10" style={{
            background: `linear-gradient(45deg, ${colors.main} 0%, ${colors.main} 50%, transparent 50%)`,
          }} />

          {/* 渐变背景（山水/云纹暗示） */}
          <div className="relative h-[200px] md:h-[240px] overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                background: side === 'left'
                  ? `linear-gradient(180deg, #dbeafe 0%, #bfdbfe 30%, #93c5fd30 60%, #f0f9ff 100%)`
                  : `linear-gradient(180deg, #fee2e2 0%, #fecaca 30%, #fca5a530 60%, #fef2f2 100%)`,
              }}
            />
            {/* 远山装饰（CSS画） */}
            <svg className="absolute bottom-0 left-0 w-full h-16 opacity-30" viewBox="0 0 200 60" preserveAspectRatio="none">
              <path
                d={side === 'left'
                  ? "M0,60 L0,40 Q30,15 60,30 Q90,45 120,20 Q150,0 180,25 Q195,35 200,30 L200,60 Z"
                  : "M0,60 L0,30 Q20,10 50,25 Q80,40 110,15 Q140,0 170,20 Q190,30 200,25 L200,60 Z"
                }
                fill={colors.main}
                opacity="0.15"
              />
            </svg>
            {/* 云纹 */}
            <div className="absolute top-3 left-3 w-8 h-3 rounded-full bg-white/40 blur-sm" />
            <div className="absolute top-6 right-6 w-6 h-2 rounded-full bg-white/30 blur-sm" />

            {/* 角色立绘图 */}
            <div className="absolute inset-0 flex items-end justify-center">
              <div className={`relative w-full h-full ${side === 'right' ? '' : ''}`}>
                <CharacterPortraitImg characterId={char.id} side={side} />
              </div>
            </div>

            {/* 活跃状态光晕 */}
            {isActive && (
              <div
                className="absolute inset-0 animate-pulse"
                style={{
                  background: `radial-gradient(ellipse at center, ${colors.barTo}20 0%, transparent 60%)`,
                  animationDuration: '1.5s',
                }}
              />
            )}
          </div>

          {/* 底部称号条 */}
          <div
            className="px-3 py-1.5 text-center text-[11px] font-bold text-white tracking-wider"
            style={{
              background: `linear-gradient(90deg, ${colors.main} 0%, ${colors.barTo} 50%, ${colors.main} 100%)`,
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
            }}
          >
            {TITLE_MAP[char.id] || char.title}
          </div>
        </div>

        {/* 技能标签 */}
        <div className={`flex gap-1.5 mt-2 ${side === 'right' ? 'justify-end' : 'justify-start'}`}>
          {(SKILL_TAGS[char.id] || []).map((s, i) => (
            <span
              key={i}
              className="px-2 py-0.5 text-[10px] font-semibold rounded-full border flex items-center gap-0.5"
              style={{
                color: colors.main,
                borderColor: colors.main,
                background: `${colors.light}80`,
              }}
            >
              {s.emoji}{s.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ===== 交叉剑 VS 中央 =====
function VSCenter({ roundNum, totalRounds, phase, isThemeMode }: {
  roundNum: number; totalRounds: number; phase: string; isThemeMode: boolean
}) {
  const phaseText = (() => {
    if (roundNum === 0) return '即将开始'
    if (phase === 'think-affirm' || phase === 'think-negate') return '思考中…'
    if (phase === 'affirm' || phase === 'negate') return '正在辩论中'
    if (phase === 'scored') return '回合结束'
    return '即将开始'
  })()

  return (
    <div className="flex flex-col items-center gap-2 md:gap-3 px-2 md:px-4">
      {/* 上方标签 */}
      <div
        className="px-4 py-1 rounded-full text-[11px] font-bold tracking-wider"
        style={{
          background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
          color: '#92400e',
          border: '1px solid #fcd34d',
          boxShadow: '0 2px 8px rgba(251,191,36,0.2)',
        }}
      >
        {isThemeMode ? '⚔️ 历史名战' : '🏟️ AI 对决'}
      </div>

      {/* VS 大字 */}
      <div className="relative">
        <span
          className="text-[40px] md:text-[52px] font-black tracking-tighter"
          style={{
            background: 'linear-gradient(180deg, #fbbf24 0%, #f97316 50%, #dc2626 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: 'none',
            filter: 'drop-shadow(0 2px 8px rgba(249,115,22,0.4))',
          }}
        >
          VS
        </span>
        {/* 交叉剑 */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-2xl md:text-3xl">
          ⚔️
        </div>
      </div>

      {/* 回合指示 */}
      <div
        className="px-3 py-1 rounded-md text-[11px] font-semibold text-amber-800 flex items-center gap-1.5"
        style={{
          background: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
          border: '1px solid #fde68a',
        }}
      >
        <span className="text-amber-500">◆</span>
        <span>{roundNum > 0 ? `第 ${roundNum} 回合` : '准备'} · {phaseText}</span>
        <span className="text-amber-500">◆</span>
      </div>
    </div>
  )
}

// ===== PK 双时钟（直播PK式交替计时）=====
const TURN_TIME = 30 // 每方思考时间（秒）—— 产品版可改为 300（5分钟）

function PKTimer({ phase, affirmName, negateName, affirmColor, negateColor, onTimeout, paused }: {
  phase: string
  affirmName: string
  negateName: string
  affirmColor: string
  negateColor: string
  onTimeout: () => void
  paused: boolean
}) {
  const [affirmTime, setAffirmTime] = useState(TURN_TIME)
  const [negateTime, setNegateTime] = useState(TURN_TIME)
  const timeoutFiredRef = useRef(false)

  // 每次进入思考阶段，重置当前方计时器
  useEffect(() => {
    timeoutFiredRef.current = false
    if (phase === 'think-affirm') setAffirmTime(TURN_TIME)
    if (phase === 'think-negate') setNegateTime(TURN_TIME)
  }, [phase])

  // 倒计时
  useEffect(() => {
    if (paused) return
    if (phase !== 'think-affirm' && phase !== 'think-negate') return

    const interval = setInterval(() => {
      if (phase === 'think-affirm') {
        setAffirmTime(t => {
          if (t <= 1 && !timeoutFiredRef.current) {
            timeoutFiredRef.current = true
            onTimeout()
            return 0
          }
          return Math.max(0, t - 1)
        })
      } else if (phase === 'think-negate') {
        setNegateTime(t => {
          if (t <= 1 && !timeoutFiredRef.current) {
            timeoutFiredRef.current = true
            onTimeout()
            return 0
          }
          return Math.max(0, t - 1)
        })
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [phase, paused, onTimeout])

  if (phase !== 'think-affirm' && phase !== 'think-negate') return null

  const isAffirmActive = phase === 'think-affirm'
  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
  const affirmPct = (affirmTime / TURN_TIME) * 100
  const negatePct = (negateTime / TURN_TIME) * 100

  return (
    <div className="flex items-center gap-1.5 mt-2 w-full max-w-[280px]">
      {/* 正方时钟 */}
      <div className={`flex-1 transition-opacity duration-300 ${isAffirmActive ? 'opacity-100' : 'opacity-35'}`}>
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[10px] font-bold truncate max-w-[60px]" style={{ color: affirmColor }}>{affirmName}</span>
          <span className="font-mono text-[14px] font-black tabular-nums" style={{ color: affirmTime < 10 ? '#ef4444' : affirmColor }}>
            {fmt(affirmTime)}
          </span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-linear ${affirmTime < 10 ? 'animate-pulse' : ''}`}
            style={{ width: `${affirmPct}%`, background: affirmColor }}
          />
        </div>
      </div>

      {/* PK 标识 */}
      <div className="flex-shrink-0 flex flex-col items-center">
        <span className="text-[8px] font-black text-gray-300 leading-none">PK</span>
        <div className="w-px h-4 bg-gray-200 mt-0.5" />
      </div>

      {/* 反方时钟 */}
      <div className={`flex-1 transition-opacity duration-300 ${!isAffirmActive ? 'opacity-100' : 'opacity-35'}`}>
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-mono text-[14px] font-black tabular-nums" style={{ color: negateTime < 10 ? '#ef4444' : negateColor }}>
            {fmt(negateTime)}
          </span>
          <span className="text-[10px] font-bold truncate max-w-[60px]" style={{ color: negateColor }}>{negateName}</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-linear ml-auto ${negateTime < 10 ? 'animate-pulse' : ''}`}
            style={{ width: `${negatePct}%`, background: negateColor, marginLeft: 'auto' }}
          />
        </div>
      </div>
    </div>
  )
}

// ===== 热度火焰组件 =====
function HeatMeter({ heat }: { heat: number }) {
  return (
    <div className="flex items-center gap-2">
      <Flame size={18} className="text-orange-500 animate-pulse" />
      <div className="flex flex-col items-center">
        <span
          className="text-[20px] md:text-[24px] font-black leading-none"
          style={{
            background: 'linear-gradient(180deg, #f97316, #dc2626)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          {heat.toLocaleString()}
        </span>
        <span className="text-[10px] text-orange-600/70 font-medium mt-0.5">辩论热度</span>
      </div>
    </div>
  )
}

// ===== 弹幕单项（带点赞功能）=====
function CommentItem({ comment: c }: { comment: LiveComment }) {
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(c.likes)

  const handleLike = () => {
    if (liked) {
      setLiked(false)
      setLikeCount(n => n - 1)
    } else {
      setLiked(true)
      setLikeCount(n => n + 1)
    }
  }

  return (
    <div
      className={`px-2.5 py-2 rounded-lg transition-all ${
        c.isHighlight
          ? 'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/50'
          : 'bg-gray-50 hover:bg-gray-100'
      }`}
    >
      <div className="flex items-start gap-2">
        {/* 用户头像 */}
        <div
          className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-[11px] font-bold text-white mt-0.5"
          style={{
            background: c.isHighlight
              ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
              : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
          }}
        >
          {c.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[11px] font-bold text-gray-700">{c.user}</span>
            {c.isHot && (
              <span className="text-[8px] px-1 py-px bg-red-100 text-red-600 rounded font-bold">🔥热</span>
            )}
            {c.isHighlight && (
              <span className="text-[8px] px-1 py-px bg-amber-100 text-amber-700 rounded font-bold">⭐名场面</span>
            )}
          </div>
          <p className="text-[12px] text-gray-600 leading-relaxed mt-0.5">{c.text}</p>
        </div>
        {/* 点赞按钮 */}
        <button
          onClick={handleLike}
          className={`flex items-center gap-1 text-[10px] transition-all flex-shrink-0 px-1.5 py-0.5 rounded-md ${
            liked
              ? 'text-red-500 bg-red-50'
              : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
          }`}
        >
          <Heart size={12} fill={liked ? '#ef4444' : 'none'} />
          <span className="font-medium">{likeCount}</span>
        </button>
      </div>
    </div>
  )
}

// ===== 弹幕面板 =====
function LiveCommentPanel({ comments, viewerCount }: { comments: LiveComment[]; viewerCount: number }) {
  const [activeTab, setActiveTab] = useState<'danmaku' | 'highlights' | 'viewers'>('danmaku')
  const [inputText, setInputText] = useState('')

  return (
    <div className="hidden xl:flex flex-col w-[260px] shrink-0 bg-white border-l border-gray-100">
      {/* Tab 头 */}
      <div className="flex items-center border-b border-gray-100 px-2">
        {[
          { key: 'danmaku' as const, label: '实时弹幕', badge: '🔥' },
          { key: 'highlights' as const, label: '精彩瞬间', badge: '⭐' },
          { key: 'viewers' as const, label: '观众榜单', badge: '👑' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-2 py-3 text-[12px] font-semibold transition-colors relative ${
              activeTab === tab.key ? 'text-red-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <span className="mr-0.5">{tab.badge}</span>{tab.label}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                style={{ background: 'linear-gradient(90deg, #f59e0b, #ef4444)' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* 观众数 */}
      <div className="px-3 py-2 flex items-center gap-2 bg-red-50/50 border-b border-red-100/50">
        <Radio size={12} className="text-red-500 animate-pulse" />
        <Users size={12} className="text-red-400" />
        <span className="text-[11px] text-red-600 font-semibold">{viewerCount.toLocaleString()} 人正在围观</span>
      </div>

      {/* 弹幕列表 */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5 scrollbar-thin">
        {activeTab === 'danmaku' && comments.map(c => (
          <CommentItem key={c.id} comment={c} />
        ))}

        {activeTab === 'highlights' && (
          <div className="space-y-2">
            {comments.filter(c => c.isHighlight).map(c => (
              <div key={c.id} className="p-2.5 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/60">
                <div className="flex items-center gap-1 mb-1">
                  <Sparkles size={10} className="text-amber-500" />
                  <span className="text-[10px] font-bold text-amber-700">名场面！</span>
                </div>
                <p className="text-[11px] text-gray-700 leading-relaxed">"{c.text}"</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[9px] text-gray-400">— {c.user}</span>
                  <span className="text-[9px] text-amber-600 font-semibold flex items-center gap-0.5">
                    <Heart size={8} />{c.likes}
                  </span>
                </div>
              </div>
            ))}
            {comments.filter(c => c.isHighlight).length === 0 && (
              <div className="text-center py-8 text-[12px] text-gray-400">
                <Sparkles size={20} className="mx-auto mb-2 opacity-40" />
                精彩瞬间将在辩论中出现
              </div>
            )}
          </div>
        )}

        {activeTab === 'viewers' && (
          <div className="space-y-1">
            {[
              { name: '吃瓜冠军', badge: '👑', color: '#f59e0b' },
              { name: '弹幕王者', badge: '🔥', color: '#ef4444' },
              { name: '前排观众', badge: '⚡', color: '#8b5cf6' },
              { name: '路过的网友', badge: '', color: '#6b7280' },
              { name: '专业评委', badge: '⚖️', color: '#3b82f6' },
            ].map((v, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50">
                <span className="text-[10px] font-bold text-gray-400 w-4">{i + 1}</span>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ background: `linear-gradient(135deg, ${v.color}, ${v.color}cc)` }}
                >
                  {v.name[0]}
                </div>
                <span className="text-[11px] font-medium text-gray-700 flex-1">{v.name}</span>
                {v.badge && <span className="text-[10px]">{v.badge}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 弹幕输入框 */}
      <div className="p-2 border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          <input
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="说点什么…"
            className="flex-1 px-3 py-2 rounded-full bg-gray-50 border border-gray-200 text-[11px] text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-red-300 focus:bg-white transition-all"
          />
          <button className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0 transition-all hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
          >
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ===== 主组件 =====
export default function AIArena() {
  const { topicId } = useParams<{ topicId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const themeId = searchParams.get('theme')
  const debateTopicId = searchParams.get('topic') || topicId  // 优先用 query 参数 topic 选择辩题
  const affirmCharId = searchParams.get('affirm') || 'baize'
  const negateCharId = searchParams.get('negate') || 'xiezhi'
  const roundsParam = parseInt(searchParams.get('rounds') || '5', 10)

  const [match, setMatch] = useState<DebateMatch>(() => {
    if (themeId) {
      const init = initThemeDebate(themeId, debateTopicId || 'college')
      if (init) return { topic: init.topic, affirmChar: init.affirmChar, negateChar: init.negateChar, rounds: [], totalRounds: roundsParam }
    }
    const fallbackTopic = getTopic(topicId || 'college') || getTopic('college')!
    return getMockMatch(fallbackTopic.id, affirmCharId, negateCharId, roundsParam)
  })
  const topic = match.topic
  const affirmChar = match.affirmChar
  const negateChar = match.negateChar

  const [revealed, setRevealed] = useState<RevealedState[]>([])
  const [isAutoPlaying, setIsAutoPlaying] = useState(false)
  const [affirmVotes, setAffirmVotes] = useState(23876)
  const [negateVotes, setNegateVotes] = useState(11248)
  const [hasVoted, setHasVoted] = useState<'affirm' | 'negate' | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [showClosing, setShowClosing] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const isPinnedRef = useRef(true) // 用户是否贴在底部（未上拉）
  const [isLoadingDebate, setIsLoadingDebate] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [danmakuEnabled, setDanmakuEnabled] = useState(true)
  const [danmakuQueue, setDanmakuQueue] = useState<DanmakuQueueItem[]>([])
  const [viewerCount, setViewerCount] = useState(23124)
  const [isRecording, setIsRecording] = useState(false)

  // 模拟实时弹幕
  const [liveComments, setLiveComments] = useState<LiveComment[]>([
    // 植入历史人物评论 —— 制造"历史人物空降"的沉浸效果
    { id: 1, user: '刘禅本禅', avatar: '刘', text: '相父的辩论赛必须打call！朕也来凑个热闹', likes: 9821, time: '20:15', isHighlight: true },
    { id: 2, user: '吃瓜大学生', avatar: '吃', text: '我去，刘禅都来了？？？这评论区什么成分', likes: 6789, time: '20:15', isHot: true },
    { id: 3, user: '司马仲达', avatar: '司', text: '亮子又在辩论了，看看这次又是什么花样。我搬好板凳了', likes: 5634, time: '20:15', isHighlight: true },
    { id: 4, user: '摸鱼冠军', avatar: '摸', text: '司马懿也来了？这评论区人均三国人物是吧', likes: 4521, time: '20:15', isHot: true },
    { id: 5, user: '曹操本操', avatar: '曹', text: '孤来看看这两个后生在吵什么。阿斗？哼，扶不起来的。', likes: 7892, time: '20:15', isHighlight: true },
    { id: 6, user: '正义的吃瓜群众', avatar: '正', text: '曹操说话了！！三国演义在这直播呢？', likes: 3876, time: '20:15', isHot: true },
    { id: 7, user: '赵云路过', avatar: '赵', text: '当年长坂坡我救的阿斗，丞相说我没白忙活，今天我得来帮丞相说话', likes: 5234, time: '20:16' },
    { id: 8, user: 'AI观察员', avatar: 'AI', text: '等等，这个评论区怎么有这么多历史人物？串台了吧', likes: 3456, time: '20:16' },
    { id: 9, user: '围观群众A', avatar: '围', text: '刘禅来给自己的事打call，笑死我了', likes: 2890, time: '20:16' },
    { id: 10, user: '魏延不服', avatar: '魏', text: '凭什么说阿斗是庸才？我反骨魏延第一个不服！他对我挺好的！', likes: 4123, time: '20:16', isHighlight: true },
    { id: 11, user: '不想写论文', avatar: '不', text: '魏延也来了？？？这评论区人均三国角色扮演', likes: 2567, time: '20:17' },
    { id: 12, user: '奶茶三分糖', avatar: '奶', text: '历史人物在线对线，建议拍成综艺', likes: 1987, time: '20:17' },
  ])

  useEffect(() => {
    const t = setInterval(() => setViewerCount(v => v + Math.floor(Math.random() * 7) - 3), 3000)
    return () => clearInterval(t)
  }, [])

  // 模拟新弹幕
  useEffect(() => {
    const mockTexts = [
      '哈哈哈哈哈笑不活了', '这波我站诸葛', '王朗你行不行啊', 'AI都开始玩梗了',
      '前排吃瓜', '这逻辑绝了', '求录像！', '666', '妙啊',
      '老夫以为...不对串台了', '笑死', '这也能辩？', '记录名场面',
      // 历史人物串场台词
      '哈哈哈丞相威武！朕先去玩了', '亮子这次说的是对的', '阿斗啊阿斗，老夫替你惋惜',
      '反骨魏延在线打call', '子龙将军说得对！', '丞相又在为我操心了',
    ]
    const mockUsers = ['路过的', '吃瓜的', '围观的', '打酱油的', '弹幕达人', '前排网友']
    // 偶尔插入历史人物评论（30% 概率）
    const historicGuests = [
      { user: '刘禅本禅', avatar: '刘', text: '相父说得对！朕虽然不聪明，但也不是废物啊' },
      { user: '司马仲达', avatar: '司', text: '精彩！不过亮子这次有点强词夺理了' },
      { user: '曹操本操', avatar: '曹', text: '哼，扶不起的阿斗。孤当年就该把他灭了' },
      { user: '赵云路过', avatar: '赵', text: '我赵子龙当年拼死救他，不是让他被人说庸才的！' },
      { user: '魏延不服', avatar: '魏', text: '丞相我虽然反骨，但这次我站你！' },
      { user: '姜维传人', avatar: '姜', text: '师父说过，后主虽非雄才，但有仁心。请不要侮辱他' },
    ]
    const t = setInterval(() => {
      setLiveComments(prev => {
        const next = [...prev]
        // 30% 概率插入历史人物
        if (Math.random() < 0.3 && historicGuests.length > 0) {
          const guest = historicGuests[Math.floor(Math.random() * historicGuests.length)]
          next.push({
            id: Date.now(),
            user: guest.user,
            avatar: guest.avatar,
            text: guest.text,
            likes: 1000 + Math.floor(Math.random() * 5000),
            time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
            isHot: true,
            isHighlight: true,
          })
        } else {
          const userName = mockUsers[Math.floor(Math.random() * mockUsers.length)] + Math.floor(Math.random() * 999)
          next.push({
            id: Date.now(),
            user: userName,
            avatar: userName[0],
            text: mockTexts[Math.floor(Math.random() * mockTexts.length)],
            likes: Math.floor(Math.random() * 50),
            time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
            isHot: Math.random() > 0.85,
            isHighlight: Math.random() > 0.9,
          })
        }
        return next.slice(-50)
      })
    }, 4000)
    return () => clearInterval(t)
  }, [])

  const debateHeat = 98766 + revealed.length * 1200

  const pushDanmaku = useCallback((trigger: DanmakuTrigger, count: number, characterId?: string) => {
    if (!danmakuEnabled) return
    setDanmakuQueue(prev => [...prev, ...toQueueItems(pickDanmaku(trigger, count, characterId))])
  }, [danmakuEnabled])

  const handleDanmakuComplete = useCallback((id: string) => {
    setDanmakuQueue(prev => prev.filter(d => d.id !== id))
  }, [])

  useEffect(() => {
    if (!themeId || match.rounds.length > 0) return
    let cancelled = false
    const init = initThemeDebate(themeId, debateTopicId || 'college')
    if (!init) return
    setIsLoadingDebate(true); setLoadError(null)
    runThemeDebate(init.topic, init.affirmChar, init.negateChar, roundsParam)
      .then(m => { if (!cancelled) { setMatch(m); setIsLoadingDebate(false) } })
      .catch(err => { if (!cancelled) { setLoadError(err.message || '辩论加载失败'); setIsLoadingDebate(false) } })
    return () => { cancelled = true }
  }, [themeId, debateTopicId, roundsParam, reloadKey])

  const totalRounds = match.totalRounds
  const isComplete = revealed.length >= totalRounds && revealed.every(r => r.phase === 'scored')
  const lastRevealed = revealed[revealed.length - 1]

  const typingTarget = (() => {
    if (!lastRevealed) return ''
    if (lastRevealed.phase === 'affirm') return lastRevealed.round.affirm.content
    if (lastRevealed.phase === 'negate') return lastRevealed.round.negate.content
    return ''
  })()
  const { displayed, isTyping } = useTypingAnimation(typingTarget, 22, !!typingTarget)

  // 新回合/新阶段加入时，仅当用户贴底才跟随滚动
  useEffect(() => {
    if (!isPinnedRef.current) return
    chatEndRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [revealed.length])

  // 打字机输出时，仅当用户贴底才跟随滚动（防止上拉时抖动）
  useEffect(() => {
    if (!isPinnedRef.current) return
    chatEndRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [displayed])

  const prevPhaseRef = useRef<string>('')
  useEffect(() => {
    const last = revealed[revealed.length - 1]; if (!last) return
    const key = `${last.round.round}-${last.phase}`; if (key === prevPhaseRef.current) return
    prevPhaseRef.current = key
    const charId = last.phase === 'affirm' ? affirmChar.id : last.phase === 'negate' ? negateChar.id : undefined
    if (last.phase === 'affirm' || last.phase === 'negate') pushDanmaku('speech', 2 + Math.floor(Math.random() * 3), charId)
    else if (last.phase === 'scored') {
      if (last.round.highlight) pushDanmaku('highlight', 3 + Math.floor(Math.random() * 3), last.round.highlight.characterId)
      if (last.round.taunt) pushDanmaku('taunt', 2 + Math.floor(Math.random() * 2))
    }
  }, [revealed, affirmChar.id, negateChar.id, pushDanmaku])

  useEffect(() => { if (showClosing) pushDanmaku('closing', 5 + Math.floor(Math.random() * 4)) }, [showClosing, pushDanmaku])

  const advance = useCallback(() => {
    if (revealed.length === 0) { setRevealed([{ round: match.rounds[0], phase: 'think-affirm' }]); return }
    const last = revealed[revealed.length - 1]
    if (last.phase === 'think-affirm') setRevealed(p => [...p.slice(0, -1), { ...last, phase: 'affirm' }])
    else if (last.phase === 'affirm') setRevealed(p => [...p.slice(0, -1), { ...last, phase: 'think-negate' }])
    else if (last.phase === 'think-negate') setRevealed(p => [...p.slice(0, -1), { ...last, phase: 'negate' }])
    else if (last.phase === 'negate') setRevealed(p => [...p.slice(0, -1), { ...last, phase: 'scored' }])
    else {
      const nextIdx = match.rounds.indexOf(last.round) + 1
      if (nextIdx < match.rounds.length) setRevealed(p => [...p, { round: match.rounds[nextIdx], phase: 'think-affirm' }])
    }
  }, [revealed, match])

  useEffect(() => {
    if (!isAutoPlaying || isComplete || isTyping) return
    const isThinking = lastRevealed?.phase === 'think-affirm' || lastRevealed?.phase === 'think-negate'
    if (isThinking) return // 思考阶段由 PKTimer 倒计时驱动，到时间自动 advance
    const t = setTimeout(() => advance(), 800)
    return () => clearTimeout(t)
  }, [isAutoPlaying, isComplete, isTyping, advance, lastRevealed])

  const handleStart = () => { setIsAutoPlaying(true); if (revealed.length === 0) advance() }
  const handleFastForward = () => { setIsAutoPlaying(false); setRevealed(match.rounds.map(r => ({ round: r, phase: 'scored' as Phase }))) }
  const handleReset = () => {
    setRevealed([]); setIsAutoPlaying(false); setShowResult(false); setShowClosing(false)
    setDanmakuQueue([]); prevPhaseRef.current = ''
    if (themeId) {
      const init = initThemeDebate(themeId, debateTopicId || 'college')
      if (init) { setMatch({ topic: init.topic, affirmChar: init.affirmChar, negateChar: init.negateChar, rounds: [], totalRounds: roundsParam }); setLoadError(null); setReloadKey(k => k + 1); return }
    }
    setMatch(getMockMatch(topic.id, affirmCharId, negateCharId, roundsParam))
  }

  const handleVote = (side: 'affirm' | 'negate') => {
    if (hasVoted) return; setHasVoted(side)
    if (side === 'affirm') setAffirmVotes(v => v + 1); else setNegateVotes(v => v + 1)
  }

  const totalVotes = affirmVotes + negateVotes
  const affirmPercent = totalVotes > 0 ? Math.round((affirmVotes / totalVotes) * 100) : 50
  const currentRoundNum = revealed.length > 0 ? match.rounds.indexOf(revealed[revealed.length - 1].round) + 1 : 0
  const affirmFaction = FACTION_MAP[affirmChar.id] || '蜀'
  const negateFaction = FACTION_MAP[negateChar.id] || '魏'
  const affirmColors = FACTION_COLORS[affirmFaction] || FACTION_COLORS['蜀']
  const negateColors = FACTION_COLORS[negateFaction] || FACTION_COLORS['魏']
  const isThemeMode = !!themeId
  const currentPhase = lastRevealed?.phase || ''
  const isAffirmActive = currentPhase === 'affirm' || currentPhase === 'think-affirm'
  const isNegateActive = currentPhase === 'negate' || currentPhase === 'think-negate'

  // 操作按钮配置
  const actionBtns = [
    { icon: ThumbsUp, label: `点赞${affirmChar.name}`, count: affirmVotes, color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', onClick: () => handleVote('affirm'), active: hasVoted === 'affirm' },
    { icon: BookOpen, label: '要求举证', count: 12345, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', onClick: () => {} },
    { icon: SwordsIcon, label: '申请反驳', count: 8923, color: '#f97316', bg: 'rgba(249,115,22,0.08)', onClick: () => {} },
    { icon: RefreshCw, label: '换个角度', count: 6789, color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', onClick: () => {} },
    { icon: Share2, label: '分享本场', count: 9876, color: '#10b981', bg: 'rgba(16,185,129,0.08)', onClick: () => {} },
  ]

  return (
    <div className="flex h-full bg-white relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #fffbeb 0%, #fff7ed 80px, #ffffff 300px)',
      }}
    >
      <DanmakuOverlay items={danmakuQueue} enabled={danmakuEnabled} onItemComplete={handleDanmakuComplete} />

      {/* ═══════ 主内容区 ═══════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* ── 顶部 Header ── */}
        <header className="flex-shrink-0 flex items-center justify-between px-4 md:px-6 py-3 border-b border-gray-100 bg-white/90 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/entertainment/arena')}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                  boxShadow: '0 2px 6px rgba(239,68,68,0.25)',
                }}
              >
                <SwordsIcon size={16} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-[15px] font-bold text-gray-900">AI竞技场</h1>
                  <span className="px-1.5 py-px text-[9px] font-bold text-white rounded-sm"
                    style={{
                      background: 'linear-gradient(135deg, #ef4444, #f59e0b)',
                      fontFamily: 'monospace',
                      letterSpacing: '0.5px',
                    }}
                  >BETA</span>
                </div>
                <p className="text-[10px] text-gray-400 -mt-0.5">看AI斗嘴 · 看热闹 · 看乐子</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* LIVE 徽章 */}
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

            {/* 观众数 */}
            <div className="hidden md:flex items-center gap-1.5 text-[12px] text-gray-600">
              <Flame size={14} className="text-orange-500" />
              <span className="font-bold text-gray-800">{viewerCount.toLocaleString()}</span>
              <span className="text-gray-400">人正在围观</span>
            </div>

            {/* 录制/分享 */}
            <button
              onClick={() => setIsRecording(r => !r)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isRecording ? 'bg-red-50 text-red-500' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
            >
              <Circle size={14} fill={isRecording ? '#ef4444' : 'none'} stroke={isRecording ? '#ef4444' : 'currentColor'} />
            </button>
            <button className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
              <Share2 size={15} />
            </button>
            <button className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
              <MoreHorizontal size={16} />
            </button>
          </div>
        </header>

        {/* ── 对战舞台 ── */}
        <div className="flex-shrink-0 px-3 md:px-6 pt-4 pb-2">
          <div
            className="rounded-2xl relative"
            style={{
              background: 'linear-gradient(180deg, #fffbeb 0%, #fff7ed 40%, #fef3c720 100%)',
              boxShadow: '0 2px 12px rgba(251,191,36,0.12), inset 0 1px 0 rgba(255,255,255,0.8)',
              border: '1px solid #fde68a40',
              overflow: 'visible',
            }}
          >
            {/* 内层裁切容器（用于圆角和光效） */}
            <div className="rounded-2xl overflow-hidden relative">
            {/* 装饰光效 */}
            <div className="absolute top-0 left-1/4 w-40 h-40 rounded-full bg-blue-200/20 blur-3xl pointer-events-none" />
            <div className="absolute top-0 right-1/4 w-40 h-40 rounded-full bg-red-200/20 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-16 bg-amber-200/20 blur-2xl pointer-events-none" />

            {/* 角色对战区 */}
            <div className="relative flex items-center justify-between px-4 md:px-8 pt-5 pb-3">
              <CharacterPortrait char={affirmChar} faction={affirmFaction} side="left" isActive={isAffirmActive} />
              <div className="flex flex-col items-center">
                <VSCenter roundNum={currentRoundNum} totalRounds={totalRounds} phase={currentPhase} isThemeMode={isThemeMode} />
                <PKTimer
                  phase={currentPhase}
                  affirmName={affirmChar.name}
                  negateName={negateChar.name}
                  affirmColor={affirmColors.main}
                  negateColor={negateColors.main}
                  onTimeout={advance}
                  paused={!isAutoPlaying}
                />
              </div>
              <CharacterPortrait char={negateChar} faction={negateFaction} side="right" isActive={isNegateActive} />
            </div>

            {/* 辩题 */}
            <div className="px-4 md:px-8 pb-2 text-center">
              <p className="text-[11px] text-amber-700/70 font-medium">辩题</p>
              <p className="text-[14px] md:text-[15px] font-bold text-gray-800 mt-0.5">{topic.title}</p>
            </div>

            {/* 投票/热度条 */}
            <div className="px-3 md:px-6 pb-4 pt-1">
              {/* 投票进度条 */}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95"
                    style={{ background: `${affirmColors.bg}` }}
                    onClick={() => handleVote('affirm')}
                  >
                    <ThumbsUp size={14} style={{ color: affirmColors.main }} />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-[10px] text-gray-400">支持率</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[18px] font-black" style={{ color: affirmColors.main }}>{affirmPercent}%</span>
                      <span className="text-[10px] text-gray-400">{affirmVotes.toLocaleString()}票</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex items-center gap-1">
                  <div className="flex-1 h-5 rounded-full overflow-hidden bg-gray-100 flex items-center">
                    <div
                      className="h-full rounded-l-full transition-all duration-700 flex items-center justify-end pr-1"
                      style={{
                        width: `${affirmPercent}%`,
                        background: `linear-gradient(90deg, ${affirmColors.barFrom}, ${affirmColors.barTo})`,
                        boxShadow: `0 0 8px ${affirmColors.glow}`,
                      }}
                    >
                      {affirmPercent > 20 && (
                        <div className="flex items-center gap-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
                          <span className="w-1 h-1 rounded-full bg-white/40" />
                          <span className="w-0.5 h-0.5 rounded-full bg-white/30" />
                        </div>
                      )}
                    </div>
                    <div
                      className="h-full rounded-r-full transition-all duration-700 flex items-center pl-1"
                      style={{
                        width: `${100 - affirmPercent}%`,
                        background: `linear-gradient(90deg, ${negateColors.barTo}, ${negateColors.barFrom})`,
                        boxShadow: `0 0 8px ${negateColors.glow}`,
                      }}
                    >
                      {100 - affirmPercent > 20 && (
                        <div className="flex items-center gap-0.5">
                          <span className="w-0.5 h-0.5 rounded-full bg-white/30" />
                          <span className="w-1 h-1 rounded-full bg-white/40" />
                          <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0 flex-row-reverse">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95"
                    style={{ background: `${negateColors.bg}` }}
                    onClick={() => handleVote('negate')}
                  >
                    <ThumbsUp size={14} style={{ color: negateColors.main }} className="rotate-180" />
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-gray-400">支持率</span>
                    <div className="flex items-baseline gap-1 flex-row-reverse">
                      <span className="text-[18px] font-black" style={{ color: negateColors.main }}>{100 - affirmPercent}%</span>
                      <span className="text-[10px] text-gray-400">{negateVotes.toLocaleString()}票</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 热度中心 */}
              <div className="flex items-center justify-center">
                <HeatMeter heat={debateHeat} />
              </div>
            </div>
            </div>{/* end inner overflow-hidden */}
          </div>
        </div>

        {/* ── 辩论聊天流 ── */}
        <div
          ref={chatContainerRef}
          onScroll={(e) => {
            const el = e.currentTarget
            // 距离底部 80px 以内视为"贴底"
            isPinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
          }}
          className="flex-1 overflow-y-auto px-3 md:px-6 py-2 scrollbar-thin min-h-0"
        >
          {revealed.length === 0 && !isLoadingDebate && (
            <div className="flex flex-col items-center justify-center py-3 text-center">
              <div className="text-3xl mb-1.5">⚔️</div>
              <p className="text-[13px] font-bold text-gray-700">辩论即将开始</p>
              <p className="text-[11px] text-gray-400 mt-0.5">点击下方「开始辩论」观看 AI 斗嘴</p>
            </div>
          )}

          {isLoadingDebate && (
            <div className="flex flex-col items-center justify-center py-3 text-center">
              <Loader2 size={22} className="text-amber-500 animate-spin mb-2" />
              <p className="text-[12px] text-gray-500">AI 正在准备辩论…</p>
            </div>
          )}

          {revealed.map((item, i) => {
            const round = item.round; const isLast = i === revealed.length - 1
            const showAffirmThinking = item.phase === 'think-affirm'
            const showAffirmSpeech = item.phase === 'affirm' || item.phase === 'think-negate' || item.phase === 'negate' || item.phase === 'scored'
            const showNegateThinking = item.phase === 'think-negate'
            const showNegateSpeech = item.phase === 'negate' || item.phase === 'scored'
            const showScore = item.phase === 'scored'
            return (
              <div key={i} className="mb-2">
                {i > 0 && (
                  <div className="flex items-center justify-center my-3">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/60">
                      <SwordsIcon size={10} className="text-amber-500" />
                      <span className="text-[10px] font-bold text-amber-700">第 {round.round} 回合</span>
                      <SwordsIcon size={10} className="text-amber-500" />
                    </div>
                  </div>
                )}
                {showAffirmThinking && round.affirm.thinkingSteps && <ThinkingProcess char={affirmChar} steps={round.affirm.thinkingSteps} isAnimating={isLast} faction={affirmFaction} />}
                {showAffirmThinking && isLast && <DebaterCommentReply char={affirmChar} comments={liveComments} />}
                {showAffirmSpeech && <ChatBubble char={affirmChar} content={isLast && item.phase === 'affirm' ? displayed : round.affirm.content} isTyping={isLast && item.phase === 'affirm' && isTyping} isRight={false} faction={affirmFaction} />}
                {showNegateThinking && round.negate.thinkingSteps && <ThinkingProcess char={negateChar} steps={round.negate.thinkingSteps} isAnimating={isLast} faction={negateFaction} />}
                {showNegateThinking && isLast && <DebaterCommentReply char={negateChar} comments={liveComments} />}
                {showNegateSpeech && <ChatBubble char={negateChar} content={isLast && item.phase === 'negate' ? displayed : round.negate.content} isTyping={isLast && item.phase === 'negate' && isTyping} isRight={true} faction={negateFaction} />}
                {showScore && <ScoreCard score={round.score} affirmName={affirmChar.name} negateName={negateChar.name} affirmColor={affirmColors.main} negateColor={negateColors.main} />}
                {showScore && round.highlight && <HighlightCard highlight={round.highlight} affirmName={affirmChar.name} negateName={negateChar.name} />}
                {showScore && round.taunt && <TauntCard taunt={round.taunt} affirmChar={affirmChar} negateChar={negateChar} />}
              </div>
            )
          })}
          <div ref={chatEndRef} />
        </div>

        {/* ── 控制按钮 ── */}
        {!isComplete && (
          <div className="flex-shrink-0 px-3 md:px-6 py-2 border-t border-gray-100 bg-white/80 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              {isLoadingDebate && (
                <div className="flex-1 flex items-center justify-center gap-2 py-2 text-[12px] text-amber-600">
                  <Loader2 size={14} className="animate-spin" />AI 正在准备辩论…
                </div>
              )}
              {loadError && !isLoadingDebate && (
                <button onClick={() => setReloadKey(k => k + 1)} className="flex-1 py-2 rounded-xl text-[12px] font-semibold text-red-600 bg-red-50 border border-red-200">{loadError} · 点击重试</button>
              )}
              {!isLoadingDebate && !loadError && match.rounds.length > 0 && (
                <>
                  {!isAutoPlaying && revealed.length === 0 && (
                    <button onClick={handleStart} className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white flex items-center justify-center gap-1.5 shadow-lg hover:shadow-xl active:scale-[0.98] transition-all"
                      style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 4px 14px rgba(239,68,68,0.35)' }}
                    >
                      <Play size={14} fill="white" />开始辩论
                    </button>
                  )}
                  {!isAutoPlaying && revealed.length > 0 && (
                    <button onClick={advance} className="flex-1 py-2 rounded-xl text-[12px] font-semibold text-white flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg active:scale-[0.98] transition-all"
                      style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', boxShadow: '0 3px 10px rgba(249,115,22,0.3)' }}
                    >
                      <Play size={12} fill="white" />
                      {lastRevealed?.phase === 'think-affirm' ? `${affirmChar.name}发言` : lastRevealed?.phase === 'affirm' ? `${negateChar.name}思考` : lastRevealed?.phase === 'think-negate' ? `${negateChar.name}发言` : lastRevealed?.phase === 'negate' ? '评委打分' : '下一回合'}
                    </button>
                  )}
                  {!isAutoPlaying && revealed.length > 0 && (
                    <button onClick={handleStart} className="px-4 py-2 rounded-xl text-[12px] font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center gap-1">
                      <FastForward size={12} />自动
                    </button>
                  )}
                  {isAutoPlaying && (
                    <button onClick={() => setIsAutoPlaying(false)} className="px-4 py-2 rounded-xl text-[12px] font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">暂停</button>
                  )}
                  <button onClick={handleFastForward} className="px-3 py-2 rounded-xl text-[11px] text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-1">
                    <FastForward size={11} />跳过
                  </button>
                </>
              )}
            </div>

            {/* 互动按钮 */}
            <div className="flex items-center gap-1.5">
              {actionBtns.map(btn => (
                <button
                  key={btn.label}
                  onClick={btn.onClick}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl border transition-all active:scale-95 ${
                    btn.active ? 'shadow-md' : 'hover:shadow-sm'
                  }`}
                  style={{
                    background: btn.active ? btn.bg : 'white',
                    borderColor: btn.active ? btn.color + '40' : '#f3f4f6',
                  }}
                >
                  <btn.icon size={16} style={{ color: btn.active ? btn.color : '#9ca3af' }} />
                  <span className="text-[10px] font-medium" style={{ color: btn.active ? btn.color : '#9ca3af' }}>{btn.label}</span>
                  <span className="text-[10px] text-gray-400">{btn.count.toLocaleString()}</span>
                </button>
              ))}
            </div>

            {/* 提示 */}
            <p className="text-center text-[11px] text-gray-400 mt-2 flex items-center justify-center gap-1">
              <Sparkles size={11} className="text-amber-400" />
              <span>小提示：你的互动会影响辩论走向哦！</span>
            </p>

            {/* 观众助攻区 —— 思考阶段时可以提交证据 */}
            {(currentPhase === 'think-affirm' || currentPhase === 'think-negate') && (
              <AudienceAssist
                phase={currentPhase}
                affirmName={affirmChar.name}
                negateName={negateChar.name}
                onAssist={() => {
                  // 用户助攻后，在评论区添加一条特殊弹幕
                  const assistingName = currentPhase === 'think-affirm' ? affirmChar.name : negateChar.name
                  setLiveComments(prev => [...prev, {
                    id: Date.now(),
                    user: '你的助攻',
                    avatar: '你',
                    text: `已向${assistingName}提交了一条证据！`,
                    likes: Math.floor(Math.random() * 200) + 50,
                    time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
                    isHighlight: true,
                  }])
                }}
              />
            )}
          </div>
        )}

        {/* 底部玩法切换 */}
        <div className="flex-shrink-0 px-6 py-2 border-t border-gray-50 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <span className="text-[10px] text-gray-400 flex-shrink-0">更多玩法：</span>
          {[
            { label: '历史名战', active: isThemeMode },
            { label: 'AI新秀赛', active: false },
            { label: '自由辩论', active: false },
            { label: '我的关注', active: false },
          ].map(tab => (
            <button
              key={tab.label}
              className={`px-3 py-1 text-[11px] font-semibold rounded-full flex-shrink-0 transition-all ${
                tab.active ? 'text-white shadow-sm' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
              style={tab.active ? { background: 'linear-gradient(135deg, #f59e0b, #ef4444)' } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════ 右侧弹幕面板 ═══════ */}
      <LiveCommentPanel comments={liveComments} viewerCount={viewerCount} />
    </div>
  )
}

// ===== 观众助攻组件（思考阶段提交证据）=====
function AudienceAssist({ phase, affirmName, negateName, onAssist }: {
  phase: string
  affirmName: string
  negateName: string
  onAssist: () => void
}) {
  const [submitted, setSubmitted] = useState(false)
  const activeName = phase === 'think-affirm' ? affirmName : negateName
  const evidenceOptions = [
    { icon: '📜', label: '提供史料', desc: '分享一条历史文献' },
    { icon: '💡', label: '提供观点', desc: '给出你的分析角度' },
    { icon: '🔗', label: '提供引用', desc: '引用相关典故' },
    { icon: '🔥', label: '加油打气', desc: `给${activeName}鼓劲` },
  ]

  return (
    <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/50">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-5 h-5 rounded-md flex items-center justify-center text-[10px]"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
          <span className="text-white">!</span>
        </div>
        <span className="text-[12px] font-bold text-amber-700">
          {activeName} 正在向你求助！
        </span>
        <span className="text-[11px] text-amber-600/60">选择一种方式助攻</span>
      </div>
      {!submitted ? (
        <div className="grid grid-cols-4 gap-2">
          {evidenceOptions.map(opt => (
            <button
              key={opt.label}
              onClick={() => { setSubmitted(true); onAssist() }}
              className="flex flex-col items-center gap-1 p-2 rounded-lg bg-white border border-amber-100 hover:border-amber-300 hover:bg-amber-50/50 transition-all active:scale-95"
            >
              <span className="text-lg">{opt.icon}</span>
              <span className="text-[11px] font-semibold text-gray-700">{opt.label}</span>
              <span className="text-[9px] text-gray-400 text-center leading-tight">{opt.desc}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 border border-green-200/50">
          <span className="text-[14px]">✅</span>
          <span className="text-[12px] font-medium text-green-700">已提交！{activeName} 正在查阅你的证据…</span>
        </div>
      )}
    </div>
  )
}

// ===== 辩手弹幕回复（思考阶段抓弹幕并角色内回复）=====
const HISTORICAL_REPLIES: Record<string, Record<string, string>> = {
  'zhuge-liang': {
    '刘禅本禅': '阿斗！你来了？为师今日在此为你正名，且坐看为师如何舌战此贼。',
    '司马仲达': '仲达也来观战？当年空城计城头抚琴之谊，仲达可还记得？',
    '曹操本操': '曹公别来无恙？赤壁一把火，烧得可还痛快？',
    '赵云路过': '子龙！当年长坂坡七进七出救回阿斗，今日为师在此为他正名，不枉你当年拼命一场。',
    '魏延不服': '文长！你虽有反骨之名，今日这话说得倒在理。阿斗待你不薄。',
    '姜维传人': '伯约的弟子？好，你师父学到了亮的兵法，今日亮也替阿斗辩护几句。',
    'default': '感谢这位朋友，亮记下了。诸位若有史料佐证，还请不吝赐教。',
  },
  'wang-lang': {
    '刘禅本禅': '后主当面，老夫直言——你说自己不是庸才？那老夫倒想听听你的道理。',
    '司马仲达': '仲达，你我同朝为臣，你说说阿斗是不是庸才？',
    '曹操本操': '曹公高见！扶不起的阿斗，果然英雄所见略同。',
    '赵云路过': '子龙将军勇猛无双，但勇猛救不了阿斗的平庸。',
    '魏延不服': '魏延？你自己的事还管不过来，还有心思替阿斗说话？',
    '姜维传人': '姜维的弟子？你师父九伐中原无功而返，恰恰说明阿斗无能。',
    'default': '这位朋友说得好，老夫深表赞同。',
  },
}

function DebaterCommentReply({ char, comments }: { char: AICharacter; comments: LiveComment[] }) {
  const [showReply, setShowReply] = useState(false)

  // 从评论里找一个历史人物评论
  const historicComment = useMemo(() => {
    const historicNames = Object.keys(HISTORICAL_REPLIES[char.id] || {})
    return comments.find(c => historicNames.includes(c.user))
  }, [char.id, comments])

  // 延迟显示回复（在思考步骤之后）
  useEffect(() => {
    if (!historicComment) return
    const t = setTimeout(() => setShowReply(true), 2500)
    return () => clearTimeout(t)
  }, [historicComment])

  if (!historicComment || !showReply) return null

  const replyMap = HISTORICAL_REPLIES[char.id] || HISTORICAL_REPLIES['default']
  const reply = replyMap[historicComment.user] || replyMap['default']

  return (
    <div className="flex items-start gap-2 mb-2 ml-8 animate-fade-in-up">
      <div className="flex-shrink-0 mt-0.5 opacity-60">
        <CharacterPortraitSmall characterId={char.id} size={20} />
      </div>
      <div className="flex-1">
        {/* 引用的评论 */}
        <div className="px-3 py-2 rounded-lg bg-gray-50 border-l-2 border-gray-200 mb-1">
          <div className="flex items-center gap-1.5">
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}
            >
              {historicComment.avatar}
            </div>
            <span className="text-[10px] font-bold text-gray-500">{historicComment.user}</span>
            <span className="text-[8px] text-gray-300">的弹幕</span>
          </div>
          <p className="text-[12px] text-gray-500 mt-0.5">{historicComment.text}</p>
        </div>
        {/* 辩手回复 */}
        <div
          className="px-3 py-2 rounded-xl"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}
        >
          <div className="flex items-center gap-1 mb-0.5">
            <MessageCircle size={10} className="text-amber-500" />
            <span className="text-[10px] font-bold text-amber-600">{char.name} 回复弹幕</span>
          </div>
          <p className="text-[13px] text-gray-700 leading-relaxed">{reply}</p>
        </div>
      </div>
    </div>
  )
}

// ===== 聊天气泡 =====
function ChatBubble({ char, content, isTyping, isRight, faction }: { char: AICharacter; content: string; isTyping: boolean; isRight: boolean; faction: string }) {
  const colors = FACTION_COLORS[faction] || (isRight ? FACTION_COLORS['魏'] : FACTION_COLORS['蜀'])
  return (
    <div className={`flex items-start gap-2 mb-2 ${isRight ? 'flex-row-reverse' : ''}`}>
      <div className="flex-shrink-0 mt-0.5">
        <CharacterPortraitSmall characterId={char.id} size={28} flip={isRight} />
      </div>
      <div className={`max-w-[75%] ${isRight ? 'items-end' : 'items-start'}`}>
        <div className={`flex items-center gap-1.5 mb-0.5 ${isRight ? 'flex-row-reverse' : ''}`}>
          <span className="text-[11px] font-bold" style={{ color: colors.main }}>{char.name}</span>
          <span
            className="px-1 py-px text-[8px] font-bold text-white rounded-sm"
            style={{ background: colors.main }}
          >
            {faction}
          </span>
        </div>
        <div
          className={`px-3.5 py-2.5 rounded-2xl text-[14px] leading-relaxed text-gray-700 ${
            isRight ? 'rounded-tr-sm' : 'rounded-tl-sm'
          }`}
          style={{
            background: isRight
              ? `linear-gradient(135deg, ${colors.light}, white)`
              : `linear-gradient(135deg, ${colors.light}80, white)`,
            border: `1px solid ${colors.main}20`,
            boxShadow: `0 1px 4px rgba(0,0,0,0.04)`,
          }}
        >
          {content}
          {isTyping && (
            <span className="inline-flex items-center gap-0.5 ml-1 align-middle">
              <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          )}
        </div>
        <div className={`text-[9px] text-gray-300 mt-0.5 ${isRight ? 'text-right' : ''}`}>
          {new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>
    </div>
  )
}

// ===== 思考过程 =====
function ThinkingProcess({ char, steps, isAnimating, faction }: { char: AICharacter; steps: ThinkingStep[]; isAnimating: boolean; faction: string }) {
  const [visibleCount, setVisibleCount] = useState(isAnimating ? 0 : steps.length)
  const colors = FACTION_COLORS[faction] || FACTION_COLORS['蜀']
  useEffect(() => {
    if (!isAnimating) { setVisibleCount(steps.length); return }
    setVisibleCount(0)
    const timers: ReturnType<typeof setTimeout>[] = []
    steps.forEach((_, i) => { timers.push(setTimeout(() => setVisibleCount(i + 1), 500 + i * 800)) })
    return () => timers.forEach(clearTimeout)
  }, [steps, isAnimating])
  return (
    <div className="flex items-start gap-2 mb-2">
      <div className="flex-shrink-0 mt-0.5 opacity-60">
        <CharacterPortraitSmall characterId={char.id} size={24} />
      </div>
      <div className="flex-1 px-3 py-2 rounded-xl bg-gray-50 border border-gray-100">
        <p className="text-[12px] text-gray-400 font-medium flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: colors.main }} />
          {char.name} 正在思考…
        </p>
        {steps.slice(0, visibleCount).map((step, i) => (
          <div key={i} className="flex items-start gap-1.5 mt-1.5 animate-fade-in-up">
            <span className="text-sm mt-[-2px]">{step.icon}</span>
            <div>
              <span className="text-[12px] font-semibold text-gray-600">{step.label}</span>
              <p className="text-[13px] text-gray-500 leading-relaxed">{step.content}</p>
            </div>
          </div>
        ))}
        {visibleCount < steps.length && (
          <div className="flex gap-0.5 mt-1.5 ml-5">
            <span className="w-1 h-1 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1 h-1 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1 h-1 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>
    </div>
  )
}

// ===== 打分卡片 =====
function ScoreCard({ score, affirmName, negateName, affirmColor, negateColor }: {
  score: { affirmScore: number; negateScore: number; winner: string; reason: string }; affirmName: string; negateName: string; affirmColor: string; negateColor: string
}) {
  return (
    <div className="my-3 p-4 rounded-xl bg-gradient-to-r from-amber-50 via-orange-50 to-red-50 border border-amber-200/50">
      <div className="flex items-center justify-center gap-2 mb-2">
        <span>🛡️</span>
        <span className="text-[13px] font-bold text-amber-700">评委打分</span>
      </div>
      <div className="flex items-center justify-center gap-6 mb-2">
        <div className="text-center">
          <span className="text-[24px] font-black" style={{ color: affirmColor }}>{score.affirmScore}</span>
          <p className="text-[12px] text-gray-500">{affirmName}</p>
        </div>
        <div className="text-[12px] text-amber-600 font-semibold px-3 py-1 rounded-full bg-white/60">
          {score.winner === 'draw' ? '势均力敌' : score.winner === 'affirm' ? `${affirmName}领先` : `${negateName}领先`}
        </div>
        <div className="text-center">
          <span className="text-[24px] font-black" style={{ color: negateColor }}>{score.negateScore}</span>
          <p className="text-[12px] text-gray-500">{negateName}</p>
        </div>
      </div>
      <p className="text-[13px] text-amber-800/70 text-center italic">"{score.reason}"</p>
    </div>
  )
}

// ===== 名场面高亮卡片 =====
function HighlightCard({ highlight, affirmName, negateName }: { highlight: Highlight; affirmName: string; negateName: string }) {
  const charName = highlight.side === 'affirm' ? affirmName : negateName
  return (
    <div className="my-2 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-16 h-16 bg-amber-200/30 blur-2xl rounded-full" />
      <div className="relative flex items-center gap-1.5 mb-1">
        <Sparkles size={13} className="text-amber-500" />
        <span className="text-[12px] font-bold text-amber-700">名场面！</span>
        <span className="text-[11px] text-amber-600/70">· {charName}</span>
      </div>
      <p className="text-[14px] text-gray-700 font-medium leading-relaxed">"{highlight.quote}"</p>
    </div>
  )
}

// ===== 嘲讽卡片 =====
function TauntCard({ taunt, affirmChar, negateChar }: { taunt: TauntMoment; affirmChar: AICharacter; negateChar: AICharacter }) {
  const char = taunt.side === 'affirm' ? affirmChar : negateChar
  return (
    <div className="my-2 flex items-start gap-2 px-3.5 py-2.5 rounded-xl bg-red-50/60 border border-red-100/60">
      <CharacterPortraitSmall characterId={char.id} size={24} />
      <div>
        <span className="text-[12px] font-bold text-red-600 flex items-center gap-1">
          <Zap size={11} />{char.name} 不甘示弱：
        </span>
        <p className="text-[13px] text-gray-700 mt-0.5">{taunt.content}</p>
      </div>
    </div>
  )
}
