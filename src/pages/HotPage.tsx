import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Flame,
  Users,
  Clock,
  ChevronRight,
  Circle,
  GitBranch,
  Eye,
  Radio,
  Bookmark,
  BookmarkCheck,
  Bell,
  Search,
  X,
  Plus,
  Calendar,
  ChevronLeft,
} from 'lucide-react'
import { usePlatform } from '../hooks/usePlatform'

/* ── 类型 ── */
type EventStatus = '发酵中' | '已解决' | '持续追踪'
type EventCategory = '科技' | '社会热点' | '生活科普' | '财经' | '校园' | '娱乐' | '健康'

interface TimelineNode {
  date: string
  label: string
}

interface HotEvent {
  id: number
  title: string
  summary: string
  category: EventCategory
  status: EventStatus
  followers: number
  lastUpdate: string
  nodes: TimelineNode[]
  viewCount: number
  tags: string[]
  relatedEvents: number[]
  date: string
}

/* ── 所有可用话题维度 ── */
const ALL_TOPICS: EventCategory[] = ['科技', '社会热点', '生活科普', '财经', '校园', '娱乐', '健康']

const STATUS_FILTERS = ['全部状态', '发酵中', '已解决', '持续追踪'] as const

const STATUS_CONFIG: Record<EventStatus, { dot: string; text: string }> = {
  发酵中: { dot: 'bg-seal', text: 'text-seal' },
  已解决: { dot: 'bg-bamboo', text: 'text-bamboo' },
  持续追踪: { dot: 'bg-gold', text: 'text-gold' },
}

const CATEGORY_STYLE: Record<EventCategory, string> = {
  科技: 'bg-indigo-50 text-indigo-600',
  社会热点: 'bg-seal/8 text-seal',
  生活科普: 'bg-bamboo/8 text-bamboo',
  财经: 'bg-gold/10 text-gold',
  校园: 'bg-violet-50 text-violet-600',
  娱乐: 'bg-pink-50 text-pink-600',
  健康: 'bg-emerald-50 text-emerald-600',
}

/* ── 模拟数据池 — 供无限滚动使用 ── */
const BASE_EVENTS: HotEvent[] = [
  {
    id: 1, title: '新能源车续航虚标事件', summary: '多位车主实测发现某品牌旗舰车型实际续航仅为官方标称的60%，引发大规模维权。工信部已介入调查。', category: '科技', status: '发酵中', followers: 128400, lastUpdate: '2 小时前',
    nodes: [{ date: '03-12', label: '首批车主爆料' }, { date: '03-18', label: '品牌方回应' }, { date: '03-25', label: '工信部介入' }, { date: '04-02', label: '第三方检测' }],
    viewCount: 892000, tags: ['新能源汽车', '消费者权益', '工信部'], relatedEvents: [3], date: '2025-03-12',
  },
  {
    id: 2, title: '985高校保研名额争议', summary: '某985高校被曝保研名额向特定生源倾斜，往届学生质疑公平性，教育部回应将开展专项核查。', category: '校园', status: '发酵中', followers: 96200, lastUpdate: '45 分钟前',
    nodes: [{ date: '04-01', label: '长文首发' }, { date: '04-05', label: '校方声明' }, { date: '04-10', label: '教育部回应' }],
    viewCount: 1240000, tags: ['教育公平', '保研', '985高校'], relatedEvents: [], date: '2025-04-01',
  },
  {
    id: 3, title: '网红餐厅预制菜事件', summary: '知名连锁品牌被曝全线使用预制菜却以"现炒"为卖点。市场监管总局发布预制菜标识新规征求意见稿。', category: '生活科普', status: '已解决', followers: 73500, lastUpdate: '1 天前',
    nodes: [{ date: '01-20', label: '暗访视频曝光' }, { date: '02-03', label: '品牌道歉' }, { date: '02-18', label: '行业自查' }, { date: '03-10', label: '新规出台' }],
    viewCount: 2100000, tags: ['预制菜', '食品安全', '消费者权益'], relatedEvents: [1], date: '2025-01-20',
  },
  {
    id: 4, title: '室温超导材料争议', summary: '国内某实验室宣称实现近常压室温超导，多个团队尝试复现结果不一。论文已启动撤稿审查。', category: '科技', status: '持续追踪', followers: 54300, lastUpdate: '6 小时前',
    nodes: [{ date: '02-14', label: '论文预印本发布' }, { date: '03-01', label: '复现失败报告' }, { date: '03-22', label: '撤稿审查启动' }],
    viewCount: 670000, tags: ['超导', '学术诚信', '科研'], relatedEvents: [], date: '2025-02-14',
  },
  {
    id: 5, title: '某地暴雨救援时间线', summary: '连续暴雨导致城市内涝，救援力量调配、物资发放、灾后重建各阶段时间线梳理。', category: '社会热点', status: '已解决', followers: 210000, lastUpdate: '3 天前',
    nodes: [{ date: '06-15', label: '暴雨预警' }, { date: '06-16', label: '紧急救援' }, { date: '06-18', label: '物资到位' }, { date: '06-22', label: '积水退去' }, { date: '07-05', label: '灾后重建' }],
    viewCount: 3400000, tags: ['暴雨', '救援', '灾后重建'], relatedEvents: [], date: '2025-06-15',
  },
  {
    id: 6, title: 'AI生成内容版权诉讼', summary: '国内首例AI绘画版权案开庭，原告指控某平台生成图片侵犯其原创作品风格。判决结果将对AI产业产生深远影响。', category: '科技', status: '发酵中', followers: 41800, lastUpdate: '30 分钟前',
    nodes: [{ date: '03-28', label: '原告起诉' }, { date: '04-08', label: '法院受理' }, { date: '04-15', label: '首次开庭' }],
    viewCount: 530000, tags: ['AI版权', '法律', '创作者权益'], relatedEvents: [], date: '2025-03-28',
  },
  {
    id: 7, title: '大学生网贷陷阱调查', summary: '多家网贷平台以"校园贷"名义向大学生发放高息贷款，实际年化利率远超法定上限。银保监会已介入。', category: '校园', status: '发酵中', followers: 67800, lastUpdate: '1 小时前',
    nodes: [{ date: '05-02', label: '受害者曝光' }, { date: '05-10', label: '媒体跟进' }, { date: '05-18', label: '银保监会介入' }],
    viewCount: 890000, tags: ['校园贷', '金融监管', '大学生'], relatedEvents: [], date: '2025-05-02',
  },
  {
    id: 8, title: '国产手机品牌芯片造假风波', summary: '某国产手机品牌旗舰芯片被拆解发现与宣传参数严重不符，实际为上一代芯片马甲。消协已立案。', category: '科技', status: '发酵中', followers: 156000, lastUpdate: '20 分钟前',
    nodes: [{ date: '06-01', label: '拆解视频流出' }, { date: '06-03', label: '品牌回应' }, { date: '06-05', label: '消协立案' }],
    viewCount: 2800000, tags: ['芯片造假', '消费者权益', '科技'], relatedEvents: [1], date: '2025-06-01',
  },
  {
    id: 9, title: '社区团购食品安全隐患', summary: '多地社区团购平台被曝销售过期、变质食品，冷链运输形同虚设。市场监管局开展专项整治。', category: '生活科普', status: '已解决', followers: 45200, lastUpdate: '5 天前',
    nodes: [{ date: '04-15', label: '用户投诉' }, { date: '04-22', label: '媒体暗访' }, { date: '05-01', label: '专项整治' }, { date: '05-15', label: '平台整改' }],
    viewCount: 670000, tags: ['社区团购', '食品安全', '监管'], relatedEvents: [], date: '2025-04-15',
  },
  {
    id: 10, title: '应届生薪资造假产业链', summary: '职业社交平台出现大量虚构薪资贴，背后是培训机构包装就业数据的灰色产业链。', category: '社会热点', status: '持续追踪', followers: 88900, lastUpdate: '3 小时前',
    nodes: [{ date: '05-10', label: '数据异常发现' }, { date: '05-20', label: '媒体调查' }, { date: '06-01', label: '平台整改' }],
    viewCount: 1100000, tags: ['就业', '薪资造假', '培训机构'], relatedEvents: [], date: '2025-05-10',
  },
  {
    id: 11, title: '股市熔断机制争议', summary: 'A股连续触发熔断机制，市场恐慌情绪蔓延。专家对现行熔断阈值设置提出质疑。', category: '财经', status: '持续追踪', followers: 234000, lastUpdate: '4 小时前',
    nodes: [{ date: '06-20', label: '首次熔断' }, { date: '06-21', label: '二次熔断' }, { date: '06-22', label: '专家发声' }],
    viewCount: 4500000, tags: ['A股', '熔断', '金融监管'], relatedEvents: [], date: '2025-06-20',
  },
  {
    id: 12, title: '流行病学专家解读新型流感', summary: '新型流感病毒变异株引发关注，多位流行病学专家联合发布科普解读，提醒公众科学防护。', category: '健康', status: '已解决', followers: 178000, lastUpdate: '2 天前',
    nodes: [{ date: '03-05', label: '变异株发现' }, { date: '03-15', label: '专家联合解读' }, { date: '04-01', label: '防护指南发布' }],
    viewCount: 3200000, tags: ['流感', '公共卫生', '科学防护'], relatedEvents: [], date: '2025-03-05',
  },
]

function formatCount(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + ' 万'
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
}

/* ── 子组件 ── */

function StatusBadge({ status }: { status: EventStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative flex h-2 w-2">
        <span className={`absolute inline-flex h-full w-full rounded-full ${cfg.dot} opacity-60 animate-ping`} />
        <span className={`relative inline-flex h-2 w-2 rounded-full ${cfg.dot}`} />
      </span>
      <span className={`text-[11px] font-medium ${cfg.text}`}>{status}</span>
    </span>
  )
}

function MiniTimeline({ nodes }: { nodes: TimelineNode[] }) {
  return (
    <div className="relative flex items-start gap-0 py-3 overflow-x-auto scrollbar-none">
      {nodes.map((node, i) => (
        <div key={i} className="flex items-center flex-shrink-0">
          <div className="flex flex-col items-center" style={{ minWidth: 56 }}>
            <span className="text-[10px] font-mono text-ink-400 mb-1">{node.date}</span>
            <span className={`h-2 w-2 rounded-full border-2 ${i === nodes.length - 1 ? 'border-seal bg-seal/20' : 'border-ink-300 bg-paper'}`} />
            <span className="text-[10px] text-ink-500 mt-1 text-center leading-tight max-w-[56px]">{node.label}</span>
          </div>
          {i < nodes.length - 1 && <div className="h-px w-5 bg-ink-200 flex-shrink-0 -mt-4" />}
        </div>
      ))}
    </div>
  )
}

function EventCard({ event, index, isBookmarked, onToggleBookmark, onToggleNotify }: {
  event: HotEvent; index: number; isBookmarked: boolean; onToggleBookmark: () => void; onToggleNotify: () => void
}) {
  const navigate = useNavigate()
  return (
    <article
      className={`group relative bg-paper rounded-2xl border border-line p-5 transition-all duration-300 ease-out hover:border-ink-300 hover:shadow-[0_2px_6px_rgba(0,0,0,0.10),0_8px_24px_rgba(0,0,0,0.10)] hover:-translate-y-0.5 animate-fade-in-up`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="absolute top-3 right-3 z-10">
        <button
          onClick={onToggleBookmark}
          aria-label={isBookmarked ? '取消收藏' : '收藏'}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all press-pop ${isBookmarked ? 'bg-seal/10 text-seal' : 'bg-paper-dark text-ink-400 hover:bg-ink-100 hover:text-ink-600'}`}
        >
          {isBookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
        </button>
      </div>

      <div className="flex items-center justify-between mb-3">
        <StatusBadge status={event.status} />
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${CATEGORY_STYLE[event.category]}`}>{event.category}</span>
      </div>

      <div className="flex items-center gap-3 text-[11px] text-ink-400 mb-2.5">
        <span className="inline-flex items-center gap-1">
          <Users size={12} className="text-ink-300" />
          <span className="font-mono">{formatCount(event.followers)}</span> 关注
        </span>
        <span className="w-px h-3 bg-ink-100" />
        <span className="inline-flex items-center gap-1">
          <Clock size={12} className="text-ink-300" />
          {event.lastUpdate}
        </span>
      </div>

      <h3 className="font-serif font-bold text-[17px] leading-snug text-ink-900 mb-1.5 group-hover:text-seal transition-colors duration-200 cursor-pointer" onClick={() => navigate(`/hot/${event.id}`)}>
        {event.title}
      </h3>

      <p className="text-[13px] text-ink-600 leading-relaxed line-clamp-2 mb-3">{event.summary}</p>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {event.tags.map(tag => (
          <span key={tag} className="px-2 py-0.5 rounded-md text-[10px] bg-paper-dark text-ink-500">{tag}</span>
        ))}
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-ink-100 to-transparent mb-1" />
      <MiniTimeline nodes={event.nodes} />

      <div className="flex items-center justify-between pt-3 border-t border-paper-deep">
        <div className="flex items-center gap-3 text-[11px] text-ink-400">
          <span className="inline-flex items-center gap-1"><GitBranch size={12} /><span className="font-mono">{event.nodes.length}</span> 节点</span>
          <span className="inline-flex items-center gap-1"><Eye size={12} /><span className="font-mono">{formatCount(event.viewCount)}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onToggleNotify} aria-label="订阅更新" className="w-7 h-7 rounded-full flex items-center justify-center bg-paper-dark text-ink-400 hover:bg-ink-100 hover:text-ink-600 transition-all press-pop">
            <Bell size={14} />
          </button>
          <button onClick={() => navigate(`/hot/${event.id}`)} className="inline-flex items-center gap-0.5 text-[12px] font-medium text-seal hover:text-seal-dark transition-colors group/btn">
            查看全貌 <ChevronRight size={14} className="transition-transform duration-200 group-hover/btn:translate-x-0.5" />
          </button>
        </div>
      </div>
    </article>
  )
}

/* ── 日历月份导航 ── */
function MonthPicker({ year, month, onChange }: { year: number; month: number; onChange: (y: number, m: number) => void }) {
  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
  const prev = () => { if (month === 1) onChange(year - 1, 12); else onChange(year, month - 1) }
  const next = () => { if (month === 12) onChange(year + 1, 1); else onChange(year, month + 1) }

  return (
    <div className="flex items-center gap-1">
      <button onClick={prev} className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-400 hover:bg-ink-100 transition-colors press-pop">
        <ChevronLeft size={14} />
      </button>
      <span className="text-[12px] font-medium text-ink-700 min-w-[80px] text-center">
        {year}年{monthNames[month - 1]}
      </span>
      <button onClick={next} className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-400 hover:bg-ink-100 transition-colors press-pop">
        <ChevronRight size={14} />
      </button>
    </div>
  )
}

/* ── 话题维度管理器 ── */
function TopicManager({ activeTopics, onToggle, onAdd, onRemove, showAll, setShowAll }: {
  activeTopics: EventCategory[]
  onToggle: (t: EventCategory) => void
  onAdd: (t: EventCategory) => void
  onRemove: (t: EventCategory) => void
  showAll: boolean
  setShowAll: (v: boolean) => void
}) {
  const inactiveTopics = ALL_TOPICS.filter(t => !activeTopics.includes(t))

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <button
        onClick={() => setShowAll(!showAll)}
        className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-200 ${showAll ? 'bg-ink-900 text-paper shadow-sm' : 'bg-paper-dark text-ink-500 hover:bg-paper-deep'}`}
      >
        全部
      </button>
      {activeTopics.map(topic => (
        <button
          key={topic}
          onClick={() => showAll ? onToggle(topic) : onRemove(topic)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-200 flex items-center gap-1 ${showAll ? 'bg-ink-900 text-paper shadow-sm' : 'bg-seal/10 text-seal hover:bg-seal/20'}`}
        >
          {topic}
          {!showAll && <X size={10} className="opacity-60 hover:opacity-100" />}
        </button>
      ))}
      {inactiveTopics.length > 0 && (
        <div className="relative">
          <button
            onClick={() => onAdd(inactiveTopics[0])}
            className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-paper-dark text-ink-400 hover:bg-seal/10 hover:text-seal transition-all press-pop"
          >
            <Plus size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════
   主页面
   ══════════════════════════════════════════════ */
export default function HotPage() {
  const { isWeb } = usePlatform()

  // 话题维度
  const [activeTopics, setActiveTopics] = useState<EventCategory[]>(['科技', '社会热点', '生活科普'])
  const [showAllTopics, setShowAllTopics] = useState(true)

  // 筛选状态
  const [activeStatus, setActiveStatus] = useState<string>('全部状态')
  const [showMyBookmarks, setShowMyBookmarks] = useState(false)

  // 收藏 / 订阅
  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>([])
  const [subscribedIds, setSubscribedIds] = useState<number[]>([])

  // 搜索
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  // 日历
  const now = new Date()
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1)
  const [useCalFilter, setUseCalFilter] = useState(false)

  // 无限滚动
  const [, setPage] = useState(0)
  const [allLoaded, setAllLoaded] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // 生成无限滚动数据 — 循环 BASE_EVENTS 并变换 id
  const generatePage = useCallback((pageNum: number): HotEvent[] => {
    return BASE_EVENTS.map(e => ({
      ...e,
      id: pageNum * BASE_EVENTS.length + e.id,
      followers: e.followers + Math.floor(Math.random() * 1000) * pageNum,
      viewCount: e.viewCount + Math.floor(Math.random() * 5000) * pageNum,
    }))
  }, [])

  const [displayedEvents, setDisplayedEvents] = useState<HotEvent[]>(() => generatePage(0))

  // 持久化
  useEffect(() => {
    const saved = localStorage.getItem('hotBookmarks')
    if (saved) setBookmarkedIds(JSON.parse(saved))
    const savedSubs = localStorage.getItem('hotSubscriptions')
    if (savedSubs) setSubscribedIds(JSON.parse(savedSubs))
    const savedTopics = localStorage.getItem('hotActiveTopics')
    if (savedTopics) setActiveTopics(JSON.parse(savedTopics))
  }, [])

  useEffect(() => { localStorage.setItem('hotBookmarks', JSON.stringify(bookmarkedIds)) }, [bookmarkedIds])
  useEffect(() => { localStorage.setItem('hotSubscriptions', JSON.stringify(subscribedIds)) }, [subscribedIds])
  useEffect(() => { localStorage.setItem('hotActiveTopics', JSON.stringify(activeTopics)) }, [activeTopics])

  const toggleBookmark = (id: number) => setBookmarkedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  const toggleSubscribe = (id: number) => setSubscribedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])

  const handleToggleTopic = () => setShowAllTopics(false)
  const handleAddTopic = (topic: EventCategory) => {
    setActiveTopics(prev => [...prev, topic])
    setShowAllTopics(false)
  }
  const handleRemoveTopic = (topic: EventCategory) => {
    setActiveTopics(prev => prev.filter(t => t !== topic))
  }

  // 筛选
  const filtered = displayedEvents.filter(e => {
    if (showMyBookmarks && !bookmarkedIds.includes(e.id)) return false
    if (!showAllTopics && !activeTopics.includes(e.category)) return false
    if (activeStatus !== '全部状态' && e.status !== activeStatus) return false
    if (searchQuery && !e.title.toLowerCase().includes(searchQuery.toLowerCase()) && !e.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))) return false
    if (useCalFilter) {
      const d = new Date(e.date)
      if (d.getFullYear() !== calYear || d.getMonth() + 1 !== calMonth) return false
    }
    return true
  })

  // 无限滚动 — IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !allLoaded) {
          setPage(prev => {
            const next = prev + 1
            setDisplayedEvents(prevEvents => [...prevEvents, ...generatePage(next)])
            if (next >= 5) setAllLoaded(true)
            return next
          })
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [allLoaded, generatePage])

  const bookmarkedCount = bookmarkedIds.length
  const subscribedCount = subscribedIds.length
  const wrap = isWeb ? 'max-w-4xl mx-auto' : ''

  return (
    <div className="flex flex-col min-h-full bg-paper-texture">
      {/* Header */}
      <header className={`px-5 pt-5 pb-3 ${wrap}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-seal/8 flex items-center justify-center">
              <Radio size={16} className="text-seal" />
            </div>
            <div>
              <h1 className="font-serif text-[22px] font-bold text-ink-900 leading-none tracking-tight">历史热点</h1>
              <p className="text-[12px] text-ink-400 mt-0.5">事件全貌，自动追踪</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSearch(s => !s)} aria-label="搜索" className="w-8 h-8 rounded-full flex items-center justify-center bg-paper-dark text-ink-500 hover:bg-ink-100 transition-all press-pop">
              {showSearch ? <X size={16} /> : <Search size={16} />}
            </button>
            <button onClick={() => setShowMyBookmarks(s => !s)} aria-label="我的收藏" className={`w-8 h-8 rounded-full flex items-center justify-center transition-all press-pop ${showMyBookmarks ? 'bg-seal/10 text-seal' : 'bg-paper-dark text-ink-500 hover:bg-ink-100'}`}>
              <BookmarkCheck size={16} />
            </button>
          </div>
        </div>

        {/* 搜索 */}
        {showSearch && (
          <div className="mt-2 animate-fade-in-up">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-paper-dark border border-line/30 focus-within:border-seal/30 transition-all">
              <Search size={14} className="text-ink-400" />
              <input
                type="text"
                placeholder="搜索热点标题或标签..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent outline-none text-[13px] text-ink-900 placeholder:text-ink-400"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-ink-400 hover:text-ink-600"><X size={14} /></button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* 话题维度管理 */}
      <nav className={`px-5 pb-3 ${wrap}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] text-ink-400 flex-shrink-0">关注维度</span>
          <div className="h-px flex-1 bg-ink-100" />
        </div>
        <TopicManager
          activeTopics={activeTopics}
          onToggle={handleToggleTopic}
          onAdd={handleAddTopic}
          onRemove={handleRemoveTopic}
          showAll={showAllTopics}
          setShowAll={setShowAllTopics}
        />

        {/* 状态 + 日历行 */}
        <div className="flex items-center justify-between mt-3 gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {STATUS_FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setActiveStatus(f)}
                className={`shrink-0 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-200 ${activeStatus === f ? 'bg-ink-800 text-paper' : 'bg-paper-dark/60 text-ink-400 hover:bg-paper-dark'}`}
              >
                {f}
              </button>
            ))}
            <div className="w-px h-4 bg-ink-100 flex-shrink-0" />
            <button
              onClick={() => setShowMyBookmarks(s => !s)}
              className={`shrink-0 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-200 flex items-center gap-1 ${showMyBookmarks ? 'bg-seal text-white' : 'bg-paper-dark/60 text-ink-400 hover:bg-paper-dark'}`}
            >
              <BookmarkCheck size={11} />
              收藏{bookmarkedCount > 0 ? ` ${bookmarkedCount}` : ''}
            </button>
          </div>

          {/* 日历筛选 */}
          <button
            onClick={() => setUseCalFilter(v => !v)}
            className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-200 ${useCalFilter ? 'bg-seal/10 text-seal' : 'bg-paper-dark/60 text-ink-400 hover:bg-paper-dark'}`}
          >
            <Calendar size={11} />
            按月
          </button>
        </div>

        {/* 日历导航 — 仅在按月筛选时显示 */}
        {useCalFilter && (
          <div className="flex items-center justify-between mt-2 p-2.5 rounded-xl bg-paper-dark/60 border border-line/10 animate-fade-in-up">
            <MonthPicker year={calYear} month={calMonth} onChange={(y, m) => { setCalYear(y); setCalMonth(m) }} />
            <span className="text-[11px] text-ink-400">{filtered.length} 个事件</span>
          </div>
        )}
      </nav>

      {/* 统计条 */}
      <div className={`px-5 pb-3 ${wrap}`}>
        <div className="flex items-center gap-4 text-[11px] text-ink-400">
          <span className="inline-flex items-center gap-1">
            <Flame size={13} className="text-seal" />
            <span className="font-mono font-medium text-ink-600">{filtered.length}</span>
            {showMyBookmarks ? '个收藏' : '个事件'}
          </span>
          {subscribedCount > 0 && (
            <>
              <span className="w-px h-3 bg-ink-100" />
              <span className="inline-flex items-center gap-1">
                <Bell size={12} className="text-gold" />
                <span className="font-mono font-medium text-ink-600">{subscribedCount}</span> 已订阅
              </span>
            </>
          )}
        </div>
      </div>

      <div className={`px-5 ${wrap}`}><div className="brush-divider" /></div>

      {/* 内容区 — Web端两列瀑布流 */}
      <main className={`flex-1 px-5 py-4 ${wrap}`}>
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-paper-dark flex items-center justify-center mx-auto mb-3">
              {showMyBookmarks ? <Bookmark size={24} className="text-ink-200" /> : <Circle size={24} className="text-ink-200" />}
            </div>
            <p className="text-[14px] text-ink-400 font-medium">
              {showMyBookmarks ? '还没有收藏任何热点' : useCalFilter ? '该月份暂无热点事件' : '暂无该筛选条件下的热点事件'}
            </p>
            <p className="text-[12px] text-ink-300 mt-1">
              {showMyBookmarks ? '点击卡片右上角的收藏按钮，保存感兴趣的热点' : '试试其他筛选条件'}
            </p>
          </div>
        ) : isWeb ? (
          /* Web端两列瀑布流 */
          <div className="columns-2 gap-4">
            {filtered.map((event, i) => (
              <EventCard
                key={event.id}
                event={event}
                index={i}
                isBookmarked={bookmarkedIds.includes(event.id)}
                onToggleBookmark={() => toggleBookmark(event.id)}
                onToggleNotify={() => toggleSubscribe(event.id)}
              />
            ))}
          </div>
        ) : (
          /* 移动端单列 */
          <div className="space-y-4">
            {filtered.map((event, i) => (
              <EventCard
                key={event.id}
                event={event}
                index={i}
                isBookmarked={bookmarkedIds.includes(event.id)}
                onToggleBookmark={() => toggleBookmark(event.id)}
                onToggleNotify={() => toggleSubscribe(event.id)}
              />
            ))}
          </div>
        )}

        {/* 无限滚动哨兵 */}
        <div ref={sentinelRef} className="h-8 flex items-center justify-center mt-4">
          {allLoaded ? (
            <span className="text-[11px] text-ink-300">已加载全部</span>
          ) : (
            <span className="text-[11px] text-ink-400 animate-pulse">加载更多...</span>
          )}
        </div>
      </main>

      <div className="pb-safe" />
    </div>
  )
}
