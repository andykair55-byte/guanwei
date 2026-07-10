import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Clock, ChevronRight, Activity, Eye, Bookmark, BookmarkCheck } from 'lucide-react'

type EventStatus = 'developing' | 'resolved' | 'tracking'
type EventCategory = '科技' | '社会热点' | '生活科普' | '财经' | '校园' | '娱乐' | '健康'

interface TimelineNode {
  date: string
  event: string
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
  totalNodes: number
  viewCount: number
  date: string
}

const STATUS_CONFIG: Record<EventStatus, { label: string; dotColor: string; bgColor: string }> = {
  developing: { label: '发酵中', dotColor: '#111111', bgColor: '#f5f5f5' },
  resolved: { label: '已解决', dotColor: '#10b981', bgColor: '#f0fdf4' },
  tracking: { label: '持续追踪', dotColor: '#c0392b', bgColor: '#fef2f2' },
}

const CATEGORY_COLORS: Record<EventCategory, string> = {
  '科技': '#3b82f6',
  '社会热点': '#c0392b',
  '生活科普': '#10b981',
  '财经': '#f59e0b',
  '校园': '#8b5cf6',
  '娱乐': '#ec4899',
  '健康': '#06b6d4',
}

const BASE_EVENTS: HotEvent[] = [
  {
    id: 1, title: '新能源车续航虚标事件', summary: '多位车主实测发现某品牌旗舰车型实际续航仅为官方标称的60%，引发大规模维权。工信部已介入调查，第三方检测机构正在进行全面测试。', category: '科技', status: 'developing', followers: 128400, lastUpdate: '2 小时前',
    nodes: [{ date: '03-12', event: '首批车主爆料' }, { date: '03-18', event: '品牌方回应' }, { date: '03-25', event: '工信部介入' }, { date: '04-02', event: '第三方检测' }],
    totalNodes: 12, viewCount: 892000, date: '2025-03-12',
  },
  {
    id: 2, title: '985高校保研名额争议', summary: '某985高校被曝保研名额向特定生源倾斜，往届学生质疑公平性，教育部回应将开展专项核查，校方已成立独立调查组。', category: '校园', status: 'developing', followers: 96200, lastUpdate: '45 分钟前',
    nodes: [{ date: '04-01', event: '长文首发' }, { date: '04-05', event: '校方声明' }, { date: '04-10', event: '教育部回应' }],
    totalNodes: 8, viewCount: 1240000, date: '2025-04-01',
  },
  {
    id: 3, title: '网红餐厅预制菜事件', summary: '知名连锁品牌被曝全线使用预制菜却以"现炒"为卖点。市场监管总局发布预制菜标识新规征求意见稿，行业迎来规范化发展。', category: '生活科普', status: 'resolved', followers: 73500, lastUpdate: '1 天前',
    nodes: [{ date: '01-20', event: '暗访视频曝光' }, { date: '02-03', event: '品牌道歉' }, { date: '02-18', event: '行业自查' }, { date: '03-10', event: '新规出台' }],
    totalNodes: 15, viewCount: 2100000, date: '2025-01-20',
  },
  {
    id: 4, title: '室温超导材料争议', summary: '国内某实验室宣称实现近常压室温超导，多个团队尝试复现结果不一。论文已启动撤稿审查，学界对此争议持续。', category: '科技', status: 'tracking', followers: 54300, lastUpdate: '6 小时前',
    nodes: [{ date: '02-14', event: '论文预印本' }, { date: '03-01', event: '复现失败' }, { date: '03-22', event: '撤稿审查' }],
    totalNodes: 6, viewCount: 670000, date: '2025-02-14',
  },
  {
    id: 5, title: '某地暴雨救援时间线', summary: '连续暴雨导致城市内涝，救援力量调配、物资发放、灾后重建各阶段时间线梳理，记录了这场自然灾害中的关键节点。', category: '社会热点', status: 'resolved', followers: 210000, lastUpdate: '3 天前',
    nodes: [{ date: '06-15', event: '暴雨预警' }, { date: '06-16', event: '紧急救援' }, { date: '06-18', event: '物资到位' }, { date: '06-22', event: '积水退去' }],
    totalNodes: 12, viewCount: 3400000, date: '2025-06-15',
  },
  {
    id: 6, title: 'AI生成内容版权诉讼', summary: '国内首例AI绘画版权案开庭，原告指控某平台生成图片侵犯其原创作品风格。判决结果将对AI产业发展产生深远影响。', category: '科技', status: 'developing', followers: 41800, lastUpdate: '30 分钟前',
    nodes: [{ date: '03-28', event: '原告起诉' }, { date: '04-08', event: '法院受理' }, { date: '04-15', event: '首次开庭' }],
    totalNodes: 6, viewCount: 530000, date: '2025-03-28',
  },
]

const TABS = ['全部', '科技', '社会热点', '生活科普', '财经', '校园', '娱乐', '健康']

function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + '万'
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
}

function MiniTimeline({ nodes, totalNodes, color }: { nodes: TimelineNode[]; totalNodes: number; color: string }) {
  const extraCount = totalNodes - nodes.length
  return (
    <div className="mt-5 pt-4 border-t border-ink-100/50">
      <div className="flex items-start">
        {nodes.map((node, i) => (
          <div key={i} className="flex-1 relative">
            <div className="relative flex items-center">
              <div
                className="w-2.5 h-2.5 rounded-full z-10 flex-shrink-0"
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
              <div className="text-[11px] text-ink-600 mt-0.5 font-medium">{node.event}</div>
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

function EventCard({ event, isBookmarked, onToggleBookmark, index }: {
  event: HotEvent
  isBookmarked: boolean
  onToggleBookmark: () => void
  index: number
}) {
  const navigate = useNavigate()
  const cfg = STATUS_CONFIG[event.status]
  const categoryColor = CATEGORY_COLORS[event.category]

  return (
    <article
      className="group cursor-pointer animate-fade-in-up px-6 py-7 border-b border-ink-100/50 transition-colors hover:bg-paper-50"
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={() => navigate(`/hot/${event.id}`)}
    >
      <div className="flex gap-5">
        <div className="flex flex-col items-center flex-shrink-0 pt-1 w-10">
          <div
            className={`w-3.5 h-3.5 rounded-full shadow-sm ${event.status === 'tracking' ? 'animate-pulse-dot' : ''}`}
            style={{ backgroundColor: cfg.dotColor }}
          />
          <div className="w-px flex-1 bg-gradient-to-b from-ink-200 to-transparent mt-2" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-[11px] font-mono text-ink-400 font-bold">{event.date}</span>
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-md"
                style={{ backgroundColor: `${categoryColor}12`, color: categoryColor }}
              >
                {event.category}
              </span>
              <span
                className="text-[11px] font-bold flex items-center gap-1 px-2 py-0.5 rounded-md"
                style={{ backgroundColor: cfg.bgColor, color: cfg.dotColor }}
              >
                <span className="w-1 h-1 rounded-full" style={{ backgroundColor: cfg.dotColor }} />
                {cfg.label}
              </span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleBookmark() }}
              className={`p-1.5 rounded-lg transition-colors ${
                isBookmarked ? 'text-seal-600' : 'text-ink-300 hover:text-ink-500 hover:bg-paper-100'
              }`}
            >
              {isBookmarked ? <BookmarkCheck size={16} fill="#c0392b" /> : <Bookmark size={16} />}
            </button>
          </div>

          <h3 className="text-[19px] font-bold text-ink-900 leading-snug mb-2.5 group-hover:text-seal-600 transition-colors tracking-tight">
            {event.title}
          </h3>

          <p className="text-[14px] text-ink-500 leading-relaxed mb-4 line-clamp-2">
            {event.summary}
          </p>

          <div className="flex items-center gap-5 text-[12px] text-ink-400">
            <span className="flex items-center gap-1 font-medium"><Users size={13} strokeWidth={2} />{formatNum(event.followers)} 关注</span>
            <span className="flex items-center gap-1 font-medium"><Eye size={13} strokeWidth={2} />{formatNum(event.viewCount)}</span>
            <span className="flex items-center gap-1 font-medium"><Activity size={13} strokeWidth={2} />{event.totalNodes} 节点</span>
            <span className="flex items-center gap-1 font-medium"><Clock size={13} strokeWidth={2} />{event.lastUpdate}</span>
            <span className="flex items-center gap-0.5 text-ink-900 ml-auto font-bold text-[13px] group-hover:gap-1.5 transition-all group-hover:text-seal-600">
              查看时间线 <ChevronRight size={14} strokeWidth={2.5} />
            </span>
          </div>

          <MiniTimeline nodes={event.nodes} totalNodes={event.totalNodes} color={categoryColor} />
        </div>
      </div>
    </article>
  )
}

export default function HotPage() {
  const [selectedTab, setSelectedTab] = useState('全部')
  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>([])
  const [displayedEvents, setDisplayedEvents] = useState<HotEvent[]>(BASE_EVENTS)
  const sentinelRef = useRef<HTMLDivElement>(null)

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

  const generatePage = useCallback((pageNum: number): HotEvent[] => {
    return BASE_EVENTS.map(e => ({
      ...e,
      id: pageNum * BASE_EVENTS.length + e.id,
      followers: e.followers + Math.floor(Math.random() * 1000) * pageNum,
      viewCount: e.viewCount + Math.floor(Math.random() * 5000) * pageNum,
    }))
  }, [])

  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayedEvents.length < 40) {
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

  return (
    <div className="min-h-full bg-white">
      <div className="sticky top-0 bg-white/95 backdrop-blur-md z-10 border-b border-ink-100/50">
        <div className="flex items-center gap-1 px-5 py-2 overflow-x-auto scrollbar-none">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`px-4 py-2 text-[13px] font-bold rounded-full transition-all duration-200 whitespace-nowrap ${
                selectedTab === tab
                  ? 'bg-ink-900 text-white shadow-sm'
                  : 'text-ink-400 hover:text-ink-700 hover:bg-paper-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="pb-8">
        {filtered.map((event, i) => (
          <EventCard
            key={event.id}
            event={event}
            isBookmarked={bookmarkedIds.includes(event.id)}
            onToggleBookmark={() => toggleBookmark(event.id)}
            index={i}
          />
        ))}

        <div ref={sentinelRef} className="h-20 flex items-center justify-center">
          <span className="text-[13px] text-ink-300 font-medium">
            {displayedEvents.length >= 40 ? '已加载全部' : '加载中...'}
          </span>
        </div>
      </div>
    </div>
  )
}
