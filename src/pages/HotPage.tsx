import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Users, Clock, ChevronRight, Activity, Eye,
  Bookmark, BookmarkCheck, Flame, TrendingUp, Radio, Zap
} from 'lucide-react'
import HotDetailModal, { EVENTS_DATA, type HotEvent } from '../components/HotDetailModal'

// ── 类型定义 ──────────────────────────────────────────
type EventStatus = 'developing' | 'resolved' | 'tracking'
type EventCategory = '科技' | '社会热点' | '生活科普' | '财经' | '校园' | '娱乐' | '健康'

interface TimelineNode {
  date: string
  event: string
}

interface HotEventCard {
  id: number
  title: string
  summary: string
  category: EventCategory
  status: EventStatus
  followers: number
  lastUpdate: string
  nodes: TimelineNode[]
  totalNodes: number
  viewCount: number
  date: string
  coverImage: string
  discussionCount: number
  mediaCoverage: number
}

// ── 配置 ──────────────────────────────────────────────
const STATUS_CONFIG: Record<EventStatus, { label: string; dotColor: string; bgColor: string; textColor: string }> = {
  developing: { label: '发酵中', dotColor: '#d64535', bgColor: '#fef2f0', textColor: '#d64535' },
  resolved: { label: '已解决', dotColor: '#27ae60', bgColor: '#f0fdf4', textColor: '#27ae60' },
  tracking: { label: '持续追踪', dotColor: '#f1c40f', bgColor: '#fffdf0', textColor: '#d4a017' },
}

const CATEGORY_COLORS: Record<EventCategory, { bg: string; text: string }> = {
  '科技': { bg: 'bg-blue-500', text: 'text-white' },
  '社会热点': { bg: 'bg-rose-500', text: 'text-white' },
  '生活科普': { bg: 'bg-emerald-500', text: 'text-white' },
  '财经': { bg: 'bg-amber-500', text: 'text-white' },
  '校园': { bg: 'bg-indigo-500', text: 'text-white' },
  '娱乐': { bg: 'bg-pink-500', text: 'text-white' },
  '健康': { bg: 'bg-teal-500', text: 'text-white' },
}

const CATEGORY_SOLID: Record<EventCategory, string> = {
  '科技': '#3b82f6',
  '社会热点': '#f43f5e',
  '生活科普': '#10b981',
  '财经': '#f59e0b',
  '校园': '#6366f1',
  '娱乐': '#ec4899',
  '健康': '#14b8a6',
}

// 状态映射：从卡片状态映射到详情页状态
const STATUS_MAP: Record<EventStatus, '发酵中' | '已解决' | '持续追踪'> = {
  developing: '发酵中',
  resolved: '已解决',
  tracking: '持续追踪',
}

// ── Mock 数据 ─────────────────────────────────────────
const BASE_EVENTS: HotEventCard[] = [
  {
    id: 1, title: '新能源车续航虚标事件',
    summary: '多位车主实测发现某品牌旗舰车型实际续航仅为官方标称的60%，引发大规模维权。工信部已介入调查，第三方检测机构正在进行全面测试。',
    category: '科技', status: 'developing', followers: 128400, lastUpdate: '2 小时前',
    nodes: [{ date: '03-12', event: '首批车主爆料' }, { date: '03-18', event: '品牌方回应' }, { date: '03-25', event: '工信部介入' }, { date: '04-02', event: '第三方检测' }],
    totalNodes: 12, viewCount: 892000, date: '2025-03-12',
    coverImage: 'https://picsum.photos/seed/hot1/400/300',
    discussionCount: 89234, mediaCoverage: 156,
  },
  {
    id: 2, title: '985高校保研名额争议',
    summary: '某985高校被曝保研名额向特定生源倾斜，往届学生质疑公平性，教育部回应将开展专项核查，校方已成立独立调查组。',
    category: '校园', status: 'developing', followers: 96200, lastUpdate: '45 分钟前',
    nodes: [{ date: '04-01', event: '长文首发' }, { date: '04-05', event: '校方声明' }, { date: '04-10', event: '教育部回应' }],
    totalNodes: 8, viewCount: 1240000, date: '2025-04-01',
    coverImage: 'https://picsum.photos/seed/hot2/400/300',
    discussionCount: 156789, mediaCoverage: 89,
  },
  {
    id: 3, title: '网红餐厅预制菜事件',
    summary: '知名连锁品牌被曝全线使用预制菜却以"现炒"为卖点。市场监管总局发布预制菜标识新规征求意见稿，行业迎来规范化发展。',
    category: '生活科普', status: 'resolved', followers: 73500, lastUpdate: '1 天前',
    nodes: [{ date: '01-20', event: '暗访视频曝光' }, { date: '02-03', event: '品牌道歉' }, { date: '02-18', event: '行业自查' }, { date: '03-10', event: '新规出台' }],
    totalNodes: 15, viewCount: 2100000, date: '2025-01-20',
    coverImage: 'https://picsum.photos/seed/hot3/400/300',
    discussionCount: 234567, mediaCoverage: 234,
  },
  {
    id: 4, title: '室温超导材料争议',
    summary: '国内某实验室宣称实现近常压室温超导，多个团队尝试复现结果不一。论文已启动撤稿审查，学界对此争议持续。',
    category: '科技', status: 'tracking', followers: 54300, lastUpdate: '6 小时前',
    nodes: [{ date: '02-14', event: '论文预印本' }, { date: '03-01', event: '复现失败' }, { date: '03-22', event: '撤稿审查' }],
    totalNodes: 6, viewCount: 670000, date: '2025-02-14',
    coverImage: 'https://picsum.photos/seed/hot4/400/300',
    discussionCount: 45678, mediaCoverage: 78,
  },
  {
    id: 5, title: '某地暴雨救援时间线',
    summary: '连续暴雨导致城市内涝，救援力量调配、物资发放、灾后重建各阶段时间线梳理，记录了这场自然灾害中的关键节点。',
    category: '社会热点', status: 'resolved', followers: 210000, lastUpdate: '3 天前',
    nodes: [{ date: '06-15', event: '暴雨预警' }, { date: '06-16', event: '紧急救援' }, { date: '06-18', event: '物资到位' }, { date: '06-22', event: '积水退去' }],
    totalNodes: 12, viewCount: 3400000, date: '2025-06-15',
    coverImage: 'https://picsum.photos/seed/hot5/400/300',
    discussionCount: 345678, mediaCoverage: 456,
  },
  {
    id: 6, title: 'AI生成内容版权诉讼',
    summary: '国内首例AI绘画版权案开庭，原告指控某平台生成图片侵犯其原创作品风格。判决结果将对AI产业发展产生深远影响。',
    category: '科技', status: 'developing', followers: 41800, lastUpdate: '30 分钟前',
    nodes: [{ date: '03-28', event: '原告起诉' }, { date: '04-08', event: '法院受理' }, { date: '04-15', event: '首次开庭' }],
    totalNodes: 6, viewCount: 530000, date: '2025-03-28',
    coverImage: 'https://picsum.photos/seed/hot6/400/300',
    discussionCount: 89012, mediaCoverage: 67,
  },
]

const TABS = ['全部', '科技', '社会热点', '生活科普', '财经', '校园', '娱乐', '健康']

// ── 像素风时间轴装饰 ──────────────────────────────────
function PixelTimelineArt() {
  // 像素风格的雷达/信号塔 + 时间节点
  return (
    <div className="relative" style={{ imageRendering: 'pixelated' }}>
      {/* 主雷达圆盘 */}
      <div
        className="relative w-28 h-28 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(254,226,226,0.8) 0%, rgba(254,202,202,0.4) 50%, transparent 70%)',
          border: '3px solid #dc2626',
          boxShadow: `
            0 0 0 3px rgba(220, 38, 38, 0.2),
            0 4px 0 rgba(153, 27, 27, 0.3),
            inset 0 2px 4px rgba(255,255,255,0.5)
          `,
        }}
      >
        {/* 雷达扫描线 */}
        <div
          className="absolute top-1/2 left-1/2 w-1/2 h-[2px] origin-left"
          style={{
            background: 'linear-gradient(90deg, #dc2626 0%, transparent 100%)',
            animation: 'spin 3s linear infinite',
          }}
        />
        {/* 中心点 */}
        <div
          className="absolute top-1/2 left-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full"
          style={{ boxShadow: '0 0 8px #dc2626, inset 0 -1px 0 rgba(0,0,0,0.3)' }}
        />
        {/* 像素节点点缀 */}
        <div className="absolute top-3 right-4 w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
        <div className="absolute bottom-5 left-3 w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-8 left-5 w-1 h-1 bg-violet-400 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* 时间轴节点（横向） */}
      <div className="absolute -bottom-2 left-0 right-0 flex items-center justify-between px-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center">
            <div
              className="w-3 h-3 rotate-45"
              style={{
                background: i <= 2 ? '#ef4444' : '#fca5a5',
                boxShadow: i <= 2 ? '0 0 6px rgba(239, 68, 68, 0.6)' : 'none',
              }}
            />
            {i < 3 && (
              <div
                className="absolute top-[22px] w-full h-[2px]"
                style={{
                  left: `${i * 33 + 8}%`,
                  width: '25%',
                  background: i < 2 ? '#f87171' : '#fecaca',
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* 漂浮信号波 */}
      <div className="absolute -top-2 -right-2">
        <div className="w-4 h-4 border-2 border-amber-400 rounded-full animate-ping opacity-60" style={{ animationDuration: '2s' }} />
      </div>
      <div className="absolute top-1 -left-3">
        <div className="w-3 h-3 border-2 border-cyan-400 rounded-full animate-ping opacity-50" style={{ animationDuration: '2.5s', animationDelay: '0.8s' }} />
      </div>

      {/* 底部标签 */}
      <div
        className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[9px] font-bold text-red-700 tracking-widest whitespace-nowrap"
        style={{ fontFamily: 'monospace' }}
      >
        TIMELINE · TRACKING
      </div>
    </div>
  )
}

// ── 辅助函数 ──────────────────────────────────────────
function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + '万'
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
}

// ── 迷你时间线组件 ────────────────────────────────────
function MiniTimeline({ nodes, totalNodes, color }: { nodes: TimelineNode[]; totalNodes: number; color: string }) {
  const extraCount = totalNodes - nodes.length
  return (
    <div className="mt-4 pt-3 border-t border-ink-100/60">
      <div className="flex items-start">
        {nodes.map((node, i) => (
          <div key={i} className="flex-1 relative">
            <div className="relative flex items-center">
              <div
                className="w-2.5 h-2.5 rounded-full z-10 flex-shrink-0 transition-all"
                style={{
                  backgroundColor: i === nodes.length - 1 ? color : '#d4d4d4',
                  boxShadow: i === nodes.length - 1 ? `0 0 0 4px ${color}20` : 'none'
                }}
              />
              {i < nodes.length - 1 && (
                <div className="flex-1 h-px bg-ink-200 -ml-1" />
              )}
            </div>
            <div className="mt-2 pr-3">
              <div className="text-[10px] font-mono text-ink-400 font-semibold">{node.date}</div>
              <div className="text-[11px] text-ink-600 mt-0.5 font-medium line-clamp-1">{node.event}</div>
            </div>
          </div>
        ))}
        {extraCount > 0 && (
          <div className="flex-shrink-0 pl-2">
            <span className="text-[10px] font-mono text-ink-400 bg-paper-100 px-2 py-0.5 rounded-md font-bold">+{extraCount}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 事件卡片组件 ──────────────────────────────────────
function EventCard({
  event, isBookmarked, onToggleBookmark, index, onClick, cardRef,
}: {
  event: HotEventCard
  isBookmarked: boolean
  onToggleBookmark: () => void
  index: number
  onClick: (e: React.MouseEvent) => void
  cardRef: (el: HTMLElement | null) => void
}) {
  const statusCfg = STATUS_CONFIG[event.status]
  const catColor = CATEGORY_COLORS[event.category]
  const catSolid = CATEGORY_SOLID[event.category]

  return (
    <article
      ref={cardRef}
      data-event-id={event.id}
      className="group cursor-pointer animate-fade-in-up bg-white rounded-2xl border border-ink-100/80 overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-ink-200 hover:-translate-y-0.5"
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={onClick}
    >
      {/* 封面图 */}
      <div className="relative aspect-[16/9] overflow-hidden bg-paper-50">
        <img
          src={event.coverImage}
          alt={event.title}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          loading="lazy"
        />
        {/* 渐变遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* 左上角标签组 */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${catColor.bg} ${catColor.text} shadow-md`}>
            {event.category}
          </span>
        </div>

        {/* 右上角状态 */}
        <div className="absolute top-3 right-3">
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-full shadow-md"
            style={{ backgroundColor: statusCfg.bgColor, color: statusCfg.textColor }}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${event.status === 'tracking' ? 'animate-pulse-dot' : ''}`}
              style={{ backgroundColor: statusCfg.dotColor }}
            />
            {statusCfg.label}
          </span>
        </div>

        {/* 底部热度数据 */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white/90">
          <div className="flex items-center gap-1.5">
            <Flame size={12} className="text-rose-400" />
            <span className="text-[11px] font-semibold">{formatNum(event.viewCount)}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[11px]">
              <Users size={11} />
              {formatNum(event.followers)}
            </span>
          </div>
        </div>
      </div>

      {/* 内容区 */}
      <div className="p-4">
        {/* 标题 */}
        <h3 className="text-[15px] font-bold text-ink-900 leading-snug mb-2 line-clamp-2 group-hover:text-seal transition-colors duration-200">
          {event.title}
        </h3>

        {/* 摘要 */}
        <p className="text-[12px] text-ink-500 leading-relaxed mb-3 line-clamp-2">
          {event.summary}
        </p>

        {/* 数据指标行 */}
        <div className="flex items-center gap-3 text-[11px] text-ink-400">
          <span className="flex items-center gap-1 font-medium">
            <Eye size={11} />
            {formatNum(event.viewCount)}
          </span>
          <span className="flex items-center gap-1 font-medium">
            <Activity size={11} />
            {event.totalNodes} 节点
          </span>
          <span className="flex items-center gap-1 font-medium">
            <Clock size={11} />
            {event.lastUpdate}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleBookmark() }}
            className={`ml-auto p-1 rounded-lg transition-all ${
              isBookmarked ? 'text-seal' : 'text-ink-300 hover:text-ink-500 hover:bg-paper-50'
            }`}
          >
            {isBookmarked ? <BookmarkCheck size={14} className="fill-seal" /> : <Bookmark size={14} />}
          </button>
        </div>

        {/* 迷你时间线 */}
        <MiniTimeline nodes={event.nodes} totalNodes={event.totalNodes} color={catSolid} />

        {/* 底部操作条 */}
        <div className="mt-3 pt-3 border-t border-ink-100/60 flex items-center justify-between">
          <div className="flex items-center gap-3 text-[11px] text-ink-400">
            <span className="flex items-center gap-1">
              <Radio size={11} />
              {event.mediaCoverage} 家媒体
            </span>
            <span className="flex items-center gap-1">
              {formatNum(event.discussionCount)} 讨论
            </span>
          </div>
          <span className="flex items-center gap-0.5 text-[12px] font-bold text-ink-900 group-hover:text-seal group-hover:gap-1 transition-all">
            查看详情
            <ChevronRight size={13} strokeWidth={2.5} />
          </span>
        </div>
      </div>
    </article>
  )
}

// ── 将卡片数据转换为详情页数据格式 ─────────────────────
function cardToDetailEvent(card: HotEventCard): HotEvent {
  // 优先从 EVENTS_DATA 中查找完整数据
  const fullEvent = EVENTS_DATA[card.id]
  if (fullEvent) return fullEvent

  // 否则从卡片数据构造
  return {
    id: card.id,
    title: card.title,
    summary: card.summary,
    fullDescription: card.summary,
    category: card.category,
    status: STATUS_MAP[card.status],
    followers: card.followers,
    lastUpdate: card.lastUpdate,
    nodes: card.nodes.map(n => ({ date: n.date, label: n.event })),
    viewCount: card.viewCount,
    tags: [card.category],
    relatedEvents: [],
    keyFigures: [],
    mediaCoverage: card.mediaCoverage,
    discussionCount: card.discussionCount,
    coverImage: card.coverImage.replace('/400/300', '/800/600'),
  }
}

// ── 主组件 ────────────────────────────────────────────
export default function HotPage() {
  const navigate = useNavigate()
  const { id: urlEventId } = useParams<{ id: string }>()
  const [selectedTab, setSelectedTab] = useState('全部')
  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>([])
  const [displayedEvents, setDisplayedEvents] = useState<HotEventCard[]>(BASE_EVENTS)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // 弹窗状态
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<HotEvent | null>(null)
  const [originRect, setOriginRect] = useState<DOMRect | null>(null)
  const cardRefs = useRef<Map<number, HTMLElement>>(new Map())

  useEffect(() => {
    const saved = localStorage.getItem('hotBookmarks')
    if (saved) setBookmarkedIds(JSON.parse(saved))
  }, [])

  useEffect(() => {
    localStorage.setItem('hotBookmarks', JSON.stringify(bookmarkedIds))
  }, [bookmarkedIds])

  const toggleBookmark = (id: number) =>
    setBookmarkedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])

  const filtered = displayedEvents.filter(e =>
    selectedTab === '全部' || e.category === selectedTab
  )

  const generatePage = useCallback((pageNum: number): HotEventCard[] => {
    return BASE_EVENTS.map(e => ({
      ...e,
      id: pageNum * BASE_EVENTS.length + e.id,
      followers: e.followers + Math.floor(Math.random() * 1000) * pageNum,
      viewCount: e.viewCount + Math.floor(Math.random() * 5000) * pageNum,
      coverImage: `https://picsum.photos/seed/hot${pageNum * 10 + e.id}/400/300`,
    }))
  }, [])

  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayedEvents.length < 30) {
          setDisplayedEvents(prev => [
            ...prev,
            ...generatePage(Math.floor(prev.length / BASE_EVENTS.length))
          ])
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [displayedEvents.length, generatePage])

  // 打开弹窗
  const openModal = useCallback((event: HotEvent, rect: DOMRect) => {
    setSelectedEvent(event)
    setOriginRect(rect)
    setModalOpen(true)
    navigate(`/hot/${event.id}`, { replace: false })
  }, [navigate])

  // 关闭弹窗
  const closeModal = useCallback(() => {
    setModalOpen(false)
    setSelectedEvent(null)
    navigate('/hot', { replace: true })
  }, [navigate])

  // 处理卡片点击
  const handleCardClick = useCallback((card: HotEventCard) => (e: React.MouseEvent) => {
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    const detailEvent = cardToDetailEvent(card)
    openModal(detailEvent, rect)
  }, [openModal])

  // 卡片 ref 注册
  const setCardRef = useCallback((id: number) => (el: HTMLElement | null) => {
    if (el) {
      cardRefs.current.set(id, el)
    } else {
      cardRefs.current.delete(id)
    }
  }, [])

  // 初始状态：如果 URL 中有 id，自动打开对应弹窗
  useEffect(() => {
    if (urlEventId && !modalOpen && displayedEvents.length > 0) {
      const id = Number(urlEventId)
      const card = displayedEvents.find(e => e.id === id)
      if (card) {
        const cardEl = cardRefs.current.get(id)
        const detailEvent = cardToDetailEvent(card)
        if (cardEl) {
          const rect = cardEl.getBoundingClientRect()
          setSelectedEvent(detailEvent)
          setOriginRect(rect)
          setModalOpen(true)
        } else {
          const defaultRect: DOMRect = {
            left: window.innerWidth / 2 - 150,
            top: window.innerHeight / 2 - 100,
            width: 300,
            height: 200,
            right: window.innerWidth / 2 + 150,
            bottom: window.innerHeight / 2 + 100,
            x: window.innerWidth / 2 - 150,
            y: window.innerHeight / 2 - 100,
            toJSON: () => '',
          }
          setSelectedEvent(detailEvent)
          setOriginRect(defaultRect)
          setModalOpen(true)
        }
      }
    }
  }, [urlEventId, modalOpen, displayedEvents])

  // 浏览器前进后退同步
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname
      const match = path.match(/^\/hot\/(\d+)$/)
      if (match) {
        const id = Number(match[1])
        const card = displayedEvents.find(e => e.id === id)
        if (card && !modalOpen) {
          const cardEl = cardRefs.current.get(id)
          const detailEvent = cardToDetailEvent(card)
          const rect = cardEl
            ? cardEl.getBoundingClientRect()
            : {
                left: window.innerWidth / 2 - 150,
                top: window.innerHeight / 2 - 100,
                width: 300,
                height: 200,
                right: window.innerWidth / 2 + 150,
                bottom: window.innerHeight / 2 + 100,
                x: window.innerWidth / 2 - 150,
                y: window.innerHeight / 2 - 100,
                toJSON: () => '',
              } as DOMRect
          setSelectedEvent(detailEvent)
          setOriginRect(rect)
          setModalOpen(true)
        }
      } else if (path === '/hot' && modalOpen) {
        setModalOpen(false)
        setSelectedEvent(null)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [displayedEvents, modalOpen])

  return (
    <div className="flex flex-col h-full relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #FEF2F2 0%, #ffffff 260px)' }}
    >
      {/* ═══════ 顶部 Banner（功能型·专业力量感）═══════ */}
      <div className="flex-shrink-0 px-6 pt-5 pb-2 relative">
        <div
          className="rounded-2xl overflow-hidden relative"
          style={{
            background: 'linear-gradient(135deg, #FEF2F2 0%, #FED7AA 40%, #FECACA 75%, #FCA5A5 100%)',
            boxShadow: '0 1px 2px rgba(239, 68, 68, 0.08), 0 10px 28px -10px rgba(239, 68, 68, 0.25)',
          }}
        >
          <div className="flex items-center justify-between px-8 py-6 relative">
            {/* 左侧文字 */}
            <div className="flex flex-col gap-2.5 z-10">
              <div className="flex items-center gap-2">
                <span
                  className="px-2.5 py-0.5 text-[10px] font-bold text-white rounded-full flex items-center gap-1.5"
                  style={{
                    background: '#dc2626',
                    boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.2), 0 2px 6px rgba(220, 38, 38, 0.3)',
                    fontFamily: 'monospace',
                    letterSpacing: '1px',
                  }}
                >
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  LIVE · 实时追踪
                </span>
              </div>
              <h1 className="text-[28px] font-bold text-red-900 leading-tight tracking-tight">
                热点时间线
                <span className="relative inline-block ml-2">
                  <span className="relative z-10">全过程</span>
                  <span
                    className="absolute bottom-0.5 left-0 right-0 h-2.5 rounded-full"
                    style={{ background: 'rgba(239, 68, 68, 0.25)' }}
                  />
                </span>
              </h1>
              <p className="text-[13px] text-red-800/70 leading-relaxed max-w-[380px]">
                从发酵到落幕，全景式追踪每一个热点事件的时间脉络
              </p>
              <div className="flex items-center gap-3 mt-1">
                <button
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-[13px] font-semibold shadow-lg shadow-red-500/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  }}
                >
                  <Flame size={14} />
                  <span>最热榜单</span>
                </button>
                <button
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/60 backdrop-blur-sm text-red-800 text-[13px] font-semibold border border-red-200/50 hover:bg-white hover:shadow-md transition-all"
                >
                  <Radio size={14} />
                  <span>订阅推送</span>
                </button>
              </div>
            </div>

            {/* 右侧像素时间轴装饰 */}
            <div className="hidden md:block pr-6 pt-2">
              <PixelTimelineArt />
            </div>
          </div>

          {/* 装饰光斑 */}
          <div className="absolute -top-4 right-20 w-32 h-32 rounded-full bg-orange-300/30 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-12 w-24 h-24 rounded-full bg-red-300/30 blur-xl pointer-events-none" />
        </div>

        {/* ═══════ 数据统计行 ═══════ */}
        <div className="grid grid-cols-4 gap-3 mt-3">
          {[
            { icon: Flame, label: '发酵中', value: '23', unit: '个', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
            { icon: Clock, label: '已解决', value: '156', unit: '件', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
            { icon: Eye, label: '总关注', value: '342万', unit: '次', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
            { icon: TrendingUp, label: '持续追踪', value: '47', unit: '个', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
          ].map((item, i) => (
            <div
              key={i}
              className="rounded-xl bg-white/70 backdrop-blur-sm px-4 py-3 flex items-center gap-3 border border-white/60 shadow-sm hover:shadow-md transition-shadow"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: item.bg }}
              >
                <item.icon size={16} style={{ color: item.color }} strokeWidth={2} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] text-gray-500 leading-tight">{item.label}</span>
                <span className="text-[16px] font-bold text-gray-800 leading-tight flex items-baseline gap-0.5">
                  {item.value}
                  <span className="text-[10px] font-normal text-gray-400">{item.unit}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════ 分类 Tab 栏（胶囊式，社区风格统一）═══════ */}
      <div className="flex-shrink-0 px-6 py-3 border-b border-gray-100/80 bg-white/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          {TABS.map(tab => {
            const isActive = tab === selectedTab
            return (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`px-4 py-1.5 text-[12px] font-semibold rounded-full transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                  isActive
                    ? 'text-white shadow-md'
                    : 'bg-gray-100/80 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                }`}
                style={isActive ? {
                  background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
                  boxShadow: '0 2px 8px -2px rgba(239, 68, 68, 0.35)',
                } : {}}
              >
                {tab}
              </button>
            )
          })}
          <div className="ml-auto flex items-center gap-2 text-[12px] text-gray-400 flex-shrink-0">
            <Radio size={11} className="text-red-500 animate-pulse" />
            <span>{displayedEvents.length} 个事件</span>
          </div>
        </div>
      </div>

      {/* 主内容区 - 卡片网格 */}
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="px-6 py-5 max-w-[1400px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((event, i) => (
              <EventCard
                key={event.id}
                event={event}
                isBookmarked={bookmarkedIds.includes(event.id)}
                onToggleBookmark={() => toggleBookmark(event.id)}
                index={i}
                onClick={handleCardClick(event)}
                cardRef={setCardRef(event.id)}
              />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-paper-100 flex items-center justify-center mx-auto mb-3">
                <TrendingUp size={24} className="text-ink-300" />
              </div>
              <p className="text-[14px] text-ink-400">暂无相关热点事件</p>
            </div>
          )}

          <div ref={sentinelRef} className="h-12" />
          {displayedEvents.length < 30 && filtered.length > 0 && (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-paper-200 border-t-seal rounded-full animate-spin" />
            </div>
          )}
          {displayedEvents.length >= 30 && (
            <div className="text-center py-6">
              <span className="text-[12px] text-ink-300 font-medium">已加载全部热点</span>
            </div>
          )}
        </div>
      </main>

      {/* 弹窗详情页 */}
      {selectedEvent && (
        <HotDetailModal
          event={selectedEvent}
          isOpen={modalOpen}
          originRect={originRect}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
