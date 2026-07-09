import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Users,
  Clock,
  GitBranch,
  Eye,
  Bookmark,
  BookmarkCheck,
  Bell,
  BellOff,
  Share2,
  Link2,
  MessageSquare,
  ChevronRight,
  ExternalLink,
  TrendingUp,
  Radio,
  Circle,
} from 'lucide-react'
import { usePlatform } from '../hooks/usePlatform'

interface TimelineNode {
  date: string
  label: string
  detail?: string
  sources?: string[]
}

interface HotEvent {
  id: number
  title: string
  summary: string
  fullDescription: string
  category: string
  status: '发酵中' | '已解决' | '持续追踪'
  followers: number
  lastUpdate: string
  nodes: TimelineNode[]
  viewCount: number
  tags: string[]
  relatedEvents: number[]
  keyFigures: { name: string; role: string }[]
  mediaCoverage: number
  discussionCount: number
}

const EVENTS_DATA: Record<number, HotEvent> = {
  1: {
    id: 1,
    title: '新能源车续航虚标事件',
    summary: '多位车主实测发现某品牌旗舰车型实际续航仅为官方标称的60%，引发大规模维权。',
    fullDescription: '2024年3月，多位某品牌新能源旗舰车型的车主在社交平台爆料，实际日常驾驶续航仅为官方宣传的60%左右。官方宣称续航700km，但多位车主实测冬季仅能跑420km。事件引发大规模维权，工信部介入调查，第三方检测机构出具报告显示低温环境下电池衰减率达40%。品牌方回应称"测试工况与真实路况存在差异"，但未给出实质性解决方案。',
    category: '科技',
    status: '发酵中',
    followers: 128400,
    lastUpdate: '2 小时前',
    nodes: [
      { date: '03-12', label: '首批车主爆料', detail: '微博用户@车评人发布实测视频，对比官方续航数据', sources: ['微博@车评人', '抖音实测视频'] },
      { date: '03-18', label: '品牌方回应', detail: '发布声明称"测试工况为理想条件，实际续航受多因素影响"', sources: ['官方声明', '新闻发布会'] },
      { date: '03-25', label: '工信部介入', detail: '宣布启动专项调查，要求企业提供完整测试数据', sources: ['工信部公告'] },
      { date: '04-02', label: '第三方检测', detail: '国家级检测机构出具初步报告，确认低温衰减问题', sources: ['检测报告摘要'] },
      { date: '04-10', label: '维权诉讼', detail: '首批车主集体向法院提起诉讼', sources: ['法院受理公告'] },
    ],
    viewCount: 892000,
    tags: ['新能源汽车', '消费者权益', '工信部', '续航', '维权'],
    relatedEvents: [3],
    keyFigures: [
      { name: '车评人', role: '事件爆料者' },
      { name: '工信部', role: '监管机构' },
      { name: '品牌方', role: '涉事企业' },
    ],
    mediaCoverage: 156,
    discussionCount: 89234,
  },
  2: {
    id: 2,
    title: '985高校保研名额争议',
    summary: '某985高校被曝保研名额向特定生源倾斜，教育部回应将开展专项核查。',
    fullDescription: '2024年4月，某985高校被曝保研名额分配存在明显倾斜，特定生源地区的学生获得名额比例远高于其他地区。往届学生在社交平台发布长文质疑公平性，引发广泛讨论。校方发布声明否认存在违规行为，教育部回应将开展专项核查。事件涉及教育公平、招生透明度等核心议题。',
    category: '社会热点',
    status: '发酵中',
    followers: 96200,
    lastUpdate: '45 分钟前',
    nodes: [
      { date: '04-01', label: '长文首发', detail: '知乎用户发布万字长文，详细分析名额分配数据', sources: ['知乎原文', '数据截图'] },
      { date: '04-05', label: '校方声明', detail: '发布声明称"名额分配符合规定，不存在违规"', sources: ['校方公告'] },
      { date: '04-10', label: '教育部回应', detail: '宣布将开展专项核查，确保招生公平', sources: ['教育部公告'] },
      { date: '04-15', label: '学生联名', detail: '超500名学生联名要求信息公开', sources: ['联名信截图'] },
    ],
    viewCount: 1240000,
    tags: ['教育公平', '保研', '985高校', '招生'],
    relatedEvents: [],
    keyFigures: [
      { name: '爆料学生', role: '事件发起者' },
      { name: '校方', role: '涉事机构' },
      { name: '教育部', role: '监管机构' },
    ],
    mediaCoverage: 89,
    discussionCount: 156789,
  },
  3: {
    id: 3,
    title: '网红餐厅预制菜事件',
    summary: '知名连锁品牌被曝全线使用预制菜却以"现炒"为卖点。',
    fullDescription: '2024年1月，暗访视频曝光某知名连锁餐厅全线使用预制菜，却长期以"现炒""厨师手艺"为营销卖点。消费者发现后要求透明标注，引发行业震动。品牌方道歉并承诺整改，市场监管总局发布预制菜标识新规征求意见稿，要求餐厅明确标注是否使用预制菜。',
    category: '生活科普',
    status: '已解决',
    followers: 73500,
    lastUpdate: '1 天前',
    nodes: [
      { date: '01-20', label: '暗访视频曝光', detail: '自媒体发布暗访视频，揭示后厨真相', sources: ['暗访视频', '媒体报道'] },
      { date: '02-03', label: '品牌道歉', detail: '发布道歉声明，承诺整改并透明标注', sources: ['道歉声明'] },
      { date: '02-18', label: '行业自查', detail: '多家连锁品牌主动公布预制菜使用情况', sources: ['行业公告'] },
      { date: '03-10', label: '新规出台', detail: '市场监管总局发布预制菜标识新规', sources: ['新规全文'] },
    ],
    viewCount: 2100000,
    tags: ['预制菜', '食品安全', '消费者权益', '餐饮'],
    relatedEvents: [1],
    keyFigures: [
      { name: '暗访记者', role: '事件爆料者' },
      { name: '品牌方', role: '涉事企业' },
      { name: '市场监管总局', role: '监管机构' },
    ],
    mediaCoverage: 234,
    discussionCount: 234567,
  },
  6: {
    id: 6,
    title: 'AI生成内容版权诉讼',
    summary: '国内首例AI绘画版权案开庭，判决结果将对AI产业产生深远影响。',
    fullDescription: '2024年3月，国内首例AI绘画版权案正式开庭。原告为知名插画师，指控某AI绘画平台生成的图片侵犯了其原创作品的风格与构图。平台辩称AI生成内容为"独立创作"，不构成侵权。案件引发业界广泛关注，判决结果将对AI产业发展产生深远影响，涉及创作者权益、AI伦理、知识产权等多重议题。',
    category: '科技',
    status: '发酵中',
    followers: 41800,
    lastUpdate: '30 分钟前',
    nodes: [
      { date: '03-28', label: '原告起诉', detail: '插画师向法院提起版权侵权诉讼', sources: ['起诉书摘要'] },
      { date: '04-08', label: '法院受理', detail: '法院正式受理案件，定于4月15日开庭', sources: ['法院公告'] },
      { date: '04-15', label: '首次开庭', detail: '庭审进行，双方激烈辩论', sources: ['庭审报道'] },
      { date: '04-20', label: '专家意见', detail: '知识产权专家发表观点文章', sources: ['专家文章'] },
    ],
    viewCount: 530000,
    tags: ['AI版权', '法律', '创作者权益', '知识产权'],
    relatedEvents: [],
    keyFigures: [
      { name: '原告插画师', role: '版权主张者' },
      { name: 'AI平台', role: '被告方' },
      { name: '知识产权专家', role: '意见提供者' },
    ],
    mediaCoverage: 67,
    discussionCount: 89012,
  },
}

const STATUS_CONFIG = {
  发酵中: { dot: 'bg-seal', text: 'text-seal', bg: 'bg-seal/10' },
  已解决: { dot: 'bg-bamboo', text: 'text-bamboo', bg: 'bg-bamboo/10' },
  持续追踪: { dot: 'bg-gold', text: 'text-gold', bg: 'bg-gold/10' },
}

function formatCount(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + ' 万'
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
}

export default function HotEventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isWeb } = usePlatform()
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [expandedNode, setExpandedNode] = useState<number | null>(null)

  const event = EVENTS_DATA[Number(id)]

  useEffect(() => {
    if (event) {
      const bookmarks = JSON.parse(localStorage.getItem('hotBookmarks') || '[]')
      setIsBookmarked(bookmarks.includes(event.id))
      const subs = JSON.parse(localStorage.getItem('hotSubscriptions') || '[]')
      setIsSubscribed(subs.includes(event.id))
    }
  }, [event])

  useEffect(() => {
    if (event) {
      const bookmarks = JSON.parse(localStorage.getItem('hotBookmarks') || '[]')
      if (isBookmarked && !bookmarks.includes(event.id)) {
        bookmarks.push(event.id)
      } else if (!isBookmarked) {
        const idx = bookmarks.indexOf(event.id)
        if (idx > -1) bookmarks.splice(idx, 1)
      }
      localStorage.setItem('hotBookmarks', JSON.stringify(bookmarks))
    }
  }, [isBookmarked, event])

  useEffect(() => {
    if (event) {
      const subs = JSON.parse(localStorage.getItem('hotSubscriptions') || '[]')
      if (isSubscribed && !subs.includes(event.id)) {
        subs.push(event.id)
      } else if (!isSubscribed) {
        const idx = subs.indexOf(event.id)
        if (idx > -1) subs.splice(idx, 1)
      }
      localStorage.setItem('hotSubscriptions', JSON.stringify(subs))
    }
  }, [isSubscribed, event])

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-5">
        <div className="w-16 h-16 rounded-2xl bg-paper-dark flex items-center justify-center mb-4">
          <Circle size={32} className="text-ink-200" />
        </div>
        <p className="text-[16px] font-medium text-ink-600 mb-2">热点事件不存在</p>
        <p className="text-[13px] text-ink-400 mb-4">该事件可能已下线或ID无效</p>
        <button onClick={() => navigate(-1)} className="px-4 py-2 rounded-lg bg-ink-900 text-white text-[14px] font-medium press-pop">
          返回列表
        </button>
      </div>
    )
  }

  const statusCfg = STATUS_CONFIG[event.status]

  return (
    <div className="flex flex-col min-h-full bg-paper-texture">
      <header className={`sticky top-0 z-20 glass border-b border-line/50 ${isWeb ? 'max-w-3xl mx-auto' : ''}`}>
        <div className="flex items-center justify-between h-14 px-5">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-ink-700 text-[14px] press-pop">
            <ArrowLeft size={16} />
            <span>返回</span>
          </button>
          <span className="font-serif text-[14px] font-bold text-ink-900">事件全貌</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsBookmarked(s => !s)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all press-pop ${isBookmarked ? 'bg-seal/10 text-seal' : 'bg-paper-dark text-ink-500'}`}
            >
              {isBookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
            </button>
            <button
              onClick={() => setIsSubscribed(s => !s)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all press-pop ${isSubscribed ? 'bg-gold/10 text-gold' : 'bg-paper-dark text-ink-500'}`}
            >
              {isSubscribed ? <Bell size={16} /> : <BellOff size={16} />}
            </button>
            <button className="w-8 h-8 rounded-full flex items-center justify-center bg-paper-dark text-ink-500 hover:bg-ink-100 transition-all press-pop">
              <Share2 size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className={`flex-1 px-5 py-5 ${isWeb ? 'max-w-3xl mx-auto' : ''}`}>
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium ${statusCfg.bg} ${statusCfg.text}`}>
              <span className={`w-2 h-2 rounded-full ${statusCfg.dot}`} />
              {event.status}
            </span>
            <span className="px-2 py-0.5 rounded-md text-[11px] bg-paper-dark text-ink-500">{event.category}</span>
          </div>

          <h1 className="font-serif text-[24px] font-bold text-ink-900 leading-snug mb-3">{event.title}</h1>

          <div className="flex items-center gap-4 text-[12px] text-ink-400 mb-4">
            <span className="inline-flex items-center gap-1">
              <Users size={14} />
              <span className="font-mono font-medium text-ink-600">{formatCount(event.followers)}</span>
              关注
            </span>
            <span className="inline-flex items-center gap-1">
              <Eye size={14} />
              <span className="font-mono">{formatCount(event.viewCount)}</span>
              阅读
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageSquare size={14} />
              <span className="font-mono">{formatCount(event.discussionCount)}</span>
              讨论
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock size={14} />
              {event.lastUpdate}更新
            </span>
          </div>

          <p className="text-[14px] text-ink-600 leading-relaxed">{event.fullDescription}</p>

          <div className="flex flex-wrap gap-1.5 mt-4">
            {event.tags.map(tag => (
              <span key={tag} className="px-2.5 py-1 rounded-md text-[11px] bg-paper-dark text-ink-500">{tag}</span>
            ))}
          </div>
        </div>

        <div className="brush-divider mb-6" />

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-lg bg-seal/8 flex items-center justify-center">
              <GitBranch size={14} className="text-seal" />
            </div>
            <h2 className="font-serif text-[18px] font-bold text-ink-900">事件时间线</h2>
            <span className="text-[12px] text-ink-400 font-mono">{event.nodes.length} 节点</span>
          </div>

          <div className="space-y-3">
            {event.nodes.map((node, i) => (
              <div
                key={i}
                className={`relative bg-paper rounded-xl border border-line/30 p-4 transition-all ${expandedNode === i ? 'border-seal/30 bg-paper' : 'hover:border-ink-200'}`}
              >
                <button
                  onClick={() => setExpandedNode(expandedNode === i ? null : i)}
                  className="w-full text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <span className="text-[12px] font-mono text-ink-400">{node.date}</span>
                      <span className={`w-3 h-3 rounded-full mt-2 ${i === event.nodes.length - 1 ? 'bg-seal' : 'bg-ink-300'}`} />
                      {i < event.nodes.length - 1 && <div className="w-px h-4 bg-ink-200 mt-1" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-[14px] font-medium text-ink-800">{node.label}</p>
                      {node.detail && (
                        <p className={`text-[13px] text-ink-500 mt-1 leading-relaxed ${expandedNode !== i ? 'line-clamp-1' : ''}`}>
                          {node.detail}
                        </p>
                      )}
                    </div>
                    <ChevronRight size={16} className={`text-ink-400 transition-transform ${expandedNode === i ? 'rotate-90' : ''}`} />
                  </div>
                </button>

                {expandedNode === i && node.sources && (
                  <div className="mt-3 pt-3 border-t border-line/20 animate-fade-in-up">
                    <p className="text-[11px] text-ink-400 mb-2">相关来源：</p>
                    <div className="flex flex-wrap gap-2">
                      {node.sources.map((src, j) => (
                        <button key={j} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-paper-dark text-[11px] text-ink-600 hover:bg-ink-100 transition-all press-pop">
                          <Link2 size={12} />
                          {src}
                          <ExternalLink size={10} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="brush-divider mb-6" />

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Users size={14} className="text-indigo-500" />
            </div>
            <h2 className="font-serif text-[18px] font-bold text-ink-900">关键人物</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {event.keyFigures.map((figure, i) => (
              <div key={i} className="bg-paper rounded-xl border border-line/30 p-3">
                <p className="text-[14px] font-medium text-ink-800">{figure.name}</p>
                <p className="text-[12px] text-ink-500 mt-0.5">{figure.role}</p>
              </div>
            ))}
          </div>
        </div>

        {event.relatedEvents.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-lg bg-gold/10 flex items-center justify-center">
                <TrendingUp size={14} className="text-gold" />
              </div>
              <h2 className="font-serif text-[18px] font-bold text-ink-900">相关事件</h2>
            </div>

            <div className="space-y-2">
              {event.relatedEvents.map(relId => {
                const relEvent = EVENTS_DATA[relId]
                if (!relEvent) return null
                return (
                  <button
                    key={relId}
                    onClick={() => navigate(`/hot/${relId}`)}
                    className="w-full flex items-center justify-between p-3 bg-paper rounded-xl border border-line/30 hover:border-seal/30 transition-all press-pop"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-ink-800 truncate">{relEvent.title}</p>
                      <p className="text-[11px] text-ink-400 mt-0.5">{relEvent.status} · {formatCount(relEvent.followers)} 关注</p>
                    </div>
                    <ChevronRight size={16} className="text-ink-400" />
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-paper-dark border border-line/30">
          <Radio size={16} className="text-seal" />
          <p className="text-[12px] text-ink-500">
            <span className="font-mono font-medium text-ink-600">{event.mediaCoverage}</span> 家媒体报道 · 
            <span className="font-mono font-medium text-ink-600">{formatCount(event.discussionCount)}</span> 条讨论
          </p>
        </div>
      </main>

      <div className={`sticky bottom-0 z-20 glass border-t border-line/50 px-5 py-4 ${isWeb ? 'max-w-3xl mx-auto' : ''}`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsBookmarked(s => !s)}
            className={`flex-1 py-2.5 rounded-xl text-[14px] font-medium transition-all press-pop flex items-center justify-center gap-2 ${isBookmarked ? 'bg-seal/10 text-seal border border-seal/30' : 'bg-paper-dark text-ink-600 border border-line/30'}`}
          >
            {isBookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
            {isBookmarked ? '已收藏' : '收藏'}
          </button>
          <button
            onClick={() => setIsSubscribed(s => !s)}
            className={`flex-1 py-2.5 rounded-xl text-[14px] font-medium transition-all press-pop flex items-center justify-center gap-2 ${isSubscribed ? 'bg-gold/10 text-gold border border-gold/30' : 'bg-paper-dark text-ink-600 border border-line/30'}`}
          >
            <Bell size={16} />
            {isSubscribed ? '已订阅更新' : '订阅更新'}
          </button>
        </div>
      </div>
    </div>
  )
}