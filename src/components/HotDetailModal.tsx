import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  X, Heart, MessageCircle, Bookmark, BookmarkCheck, Share2, Send,
  Users, TrendingUp, Radio, ChevronRight,
  Bell, Link2, User, Activity, Flame
} from 'lucide-react'

// ── 类型定义 ──────────────────────────────────────────
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
  keyFigures: { name: string; role: string; avatar: string }[]
  mediaCoverage: number
  discussionCount: number
  coverImage: string
}

interface CommentItem {
  id: string
  userId: string
  userNickname: string
  userAvatar: string
  content: string
  likes: number
  isLiked: boolean
  createdAt: string
  replyToUser?: string
  replies?: CommentItem[]
}

// ── Mock 数据 ─────────────────────────────────────────
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
      { name: '车评人', role: '事件爆料者', avatar: 'https://picsum.photos/seed/kf1/80/80' },
      { name: '工信部', role: '监管机构', avatar: 'https://picsum.photos/seed/kf2/80/80' },
      { name: '品牌方', role: '涉事企业', avatar: 'https://picsum.photos/seed/kf3/80/80' },
    ],
    mediaCoverage: 156,
    discussionCount: 89234,
    coverImage: 'https://picsum.photos/seed/hot1/800/600',
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
      { name: '爆料学生', role: '事件发起者', avatar: 'https://picsum.photos/seed/kf4/80/80' },
      { name: '校方', role: '涉事机构', avatar: 'https://picsum.photos/seed/kf5/80/80' },
      { name: '教育部', role: '监管机构', avatar: 'https://picsum.photos/seed/kf6/80/80' },
    ],
    mediaCoverage: 89,
    discussionCount: 156789,
    coverImage: 'https://picsum.photos/seed/hot2/800/600',
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
      { name: '暗访记者', role: '事件爆料者', avatar: 'https://picsum.photos/seed/kf7/80/80' },
      { name: '品牌方', role: '涉事企业', avatar: 'https://picsum.photos/seed/kf8/80/80' },
      { name: '市场监管总局', role: '监管机构', avatar: 'https://picsum.photos/seed/kf9/80/80' },
    ],
    mediaCoverage: 234,
    discussionCount: 234567,
    coverImage: 'https://picsum.photos/seed/hot3/800/600',
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
      { name: '原告插画师', role: '版权主张者', avatar: 'https://picsum.photos/seed/kf10/80/80' },
      { name: 'AI平台', role: '被告方', avatar: 'https://picsum.photos/seed/kf11/80/80' },
      { name: '知识产权专家', role: '意见提供者', avatar: 'https://picsum.photos/seed/kf12/80/80' },
    ],
    mediaCoverage: 67,
    discussionCount: 89012,
    coverImage: 'https://picsum.photos/seed/hot6/800/600',
  },
}

// ── 配置 ──────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { dot: string; text: string; bg: string; label: string }> = {
  '发酵中': { dot: 'bg-white', text: 'text-white', bg: 'bg-seal', label: '发酵中' },
  '已解决': { dot: 'bg-white', text: 'text-white', bg: 'bg-bamboo', label: '已解决' },
  '持续追踪': { dot: 'bg-white', text: 'text-white', bg: 'bg-gold', label: '持续追踪' },
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  '科技': { bg: 'bg-blue-500', text: 'text-white' },
  '社会热点': { bg: 'bg-rose-500', text: 'text-white' },
  '生活科普': { bg: 'bg-emerald-500', text: 'text-white' },
  '财经': { bg: 'bg-amber-500', text: 'text-white' },
  '校园': { bg: 'bg-indigo-500', text: 'text-white' },
  '娱乐': { bg: 'bg-pink-500', text: 'text-white' },
  '健康': { bg: 'bg-teal-500', text: 'text-white' },
}

// ── 辅助函数 ──────────────────────────────────────────
function formatCount(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + ' 万'
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
}

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  const now = Date.now()
  const diff = now - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

// ── Mock 评论 ─────────────────────────────────────────
function generateMockComments(eventId: number): CommentItem[] {
  return [
    {
      id: `hc-${eventId}-1`, userId: 'u1', userNickname: '深度观察者', userAvatar: 'https://picsum.photos/seed/hcu1/80/80',
      content: '这个事件影响太大了，希望监管部门能给出明确结论。涉及的不只是一个品牌，而是整个行业的信任问题。',
      likes: 234, isLiked: false, createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      replies: [
        {
          id: `hc-${eventId}-1-1`, userId: 'u2', userNickname: '理性吃瓜', userAvatar: 'https://picsum.photos/seed/hcu2/80/80',
          content: '同意，关键是要有明确的标准和处罚机制，不然企业犯错成本太低了',
          likes: 56, isLiked: false, createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
          replyToUser: '深度观察者',
        },
        {
          id: `hc-${eventId}-1-2`, userId: 'u3', userNickname: '法律爱好者', userAvatar: 'https://picsum.photos/seed/hcu3/80/80',
          content: '从法律角度看，举证责任在消费者这边，维权难度很大',
          likes: 34, isLiked: false, createdAt: new Date(Date.now() - 1.5 * 3600 * 1000).toISOString(),
          replyToUser: '理性吃瓜',
        },
      ],
    },
    {
      id: `hc-${eventId}-2`, userId: 'u4', userNickname: '业内人士', userAvatar: 'https://picsum.photos/seed/hcu4/80/80',
      content: '作为从业者说一句，这里面水很深。很多东西不是表面看起来那样的。等更多信息出来再下结论吧。',
      likes: 445, isLiked: false, createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    },
    {
      id: `hc-${eventId}-3`, userId: 'u5', userNickname: '数据控', userAvatar: 'https://picsum.photos/seed/hcu5/80/80',
      content: '有没有人整理一下时间线？信息太散了，看了半天也没搞清楚来龙去脉',
      likes: 89, isLiked: false, createdAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
      replies: [
        {
          id: `hc-${eventId}-3-1`, userId: 'u6', userNickname: '热心网友', userAvatar: 'https://picsum.photos/seed/hcu6/80/80',
          content: '左边时间线就是整理好的啊，可以看看',
          likes: 15, isLiked: false, createdAt: new Date(Date.now() - 9 * 3600 * 1000).toISOString(),
          replyToUser: '数据控',
        },
      ],
    },
    {
      id: `hc-${eventId}-4`, userId: 'u7', userNickname: '时事评论员', userAvatar: 'https://picsum.photos/seed/hcu7/80/80',
      content: '这个事件的核心问题是信息不对称。企业掌握全部信息，消费者只能被动接受。什么时候能做到真正的透明化？',
      likes: 167, isLiked: false, createdAt: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
    },
    {
      id: `hc-${eventId}-5`, userId: 'u8', userNickname: '吃瓜群众甲', userAvatar: 'https://picsum.photos/seed/hcu8/80/80',
      content: '蹲一个后续，感觉这事还没完',
      likes: 78, isLiked: false, createdAt: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
    },
    {
      id: `hc-${eventId}-6`, userId: 'u9', userNickname: '媒体从业者', userAvatar: 'https://picsum.photos/seed/hcu9/80/80',
      content: '我们团队也在跟进这个事件，目前已经联系到了三位当事人。有新进展会及时更新。',
      likes: 203, isLiked: false, createdAt: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
    },
  ]
}

// ── 评论项组件 ────────────────────────────────────────
function CommentItem({
  comment, onLike, onReply, depth = 0,
}: {
  comment: CommentItem
  onLike: (id: string) => void
  onReply: (parentId: string, replyToUser: string) => void
  depth?: number
}) {
  const [showReplies, setShowReplies] = useState(false)
  const replies = comment.replies || []
  const hasReplies = replies.length > 0

  return (
    <div className={depth > 0 ? 'ml-9 mt-2' : ''}>
      <div className={`flex gap-2.5 ${depth > 0 ? '' : 'py-3 border-b border-ink-50 last:border-b-0'}`}>
        <img
          src={comment.userAvatar}
          alt={comment.userNickname}
          className="w-8 h-8 rounded-full object-cover flex-shrink-0 bg-paper-100"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[13px] font-semibold text-ink-800">{comment.userNickname}</span>
            <span className="text-[11px] text-ink-400">{formatTime(comment.createdAt)}</span>
          </div>
          <p className="text-[13.5px] text-ink-700 leading-relaxed mb-1.5">
            {comment.replyToUser && (
              <span className="text-seal font-medium">@{comment.replyToUser} </span>
            )}
            {comment.content}
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => onLike(comment.id)}
              className={`flex items-center gap-1 text-[12px] transition-colors ${
                comment.isLiked ? 'text-seal font-medium' : 'text-ink-400 hover:text-seal'
              }`}
            >
              <Heart size={13} className={comment.isLiked ? 'fill-seal' : ''} />
              <span>{comment.likes > 0 ? comment.likes : '赞'}</span>
            </button>
            {depth === 0 && (
              <button
                onClick={() => onReply(comment.id, comment.userNickname)}
                className="text-[12px] text-ink-400 hover:text-ink-700 transition-colors"
              >
                回复
              </button>
            )}
          </div>
          {hasReplies && depth === 0 && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="mt-2 text-[12px] text-seal font-medium hover:underline"
            >
              {showReplies ? '收起回复' : `查看 ${replies.length} 条回复`}
            </button>
          )}
        </div>
      </div>
      {hasReplies && (depth === 0 ? showReplies : true) && (
        <div>
          {replies.map(reply => (
            <CommentItem key={reply.id} comment={reply} onLike={onLike} onReply={onReply} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Props ────────────────────────────────────────────
export interface HotDetailModalProps {
  event: HotEvent
  isOpen: boolean
  originRect: DOMRect | null
  onClose: () => void
}

// ── 主组件 ────────────────────────────────────────────
export default function HotDetailModal({ event, isOpen, originRect, onClose }: HotDetailModalProps) {
  const navigate = useNavigate()
  const modalRef = useRef<HTMLDivElement>(null)

  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [expandedNode, setExpandedNode] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'detail' | 'figures'>('detail')
  const [commentText, setCommentText] = useState('')
  const [comments, setComments] = useState<CommentItem[]>([])
  const [replyTarget, setReplyTarget] = useState<{ parentId: string; replyToUser: string } | null>(null)
  const [showCopied, setShowCopied] = useState(false)

  // 初始化数据
  useEffect(() => {
    if (isOpen) {
      setComments(generateMockComments(event.id))
      setActiveTab('detail')
      setExpandedNode(null)
      setReplyTarget(null)
      setCommentText('')

      const bookmarks = JSON.parse(localStorage.getItem('hotBookmarks') || '[]')
      setIsBookmarked(bookmarks.includes(event.id))
      const subs = JSON.parse(localStorage.getItem('hotSubscriptions') || '[]')
      setIsSubscribed(subs.includes(event.id))
    }
  }, [event.id, isOpen])

  // 保存收藏/订阅状态
  useEffect(() => {
    if (!isOpen) return
    const bookmarks = JSON.parse(localStorage.getItem('hotBookmarks') || '[]')
    if (isBookmarked && !bookmarks.includes(event.id)) {
      bookmarks.push(event.id)
    } else if (!isBookmarked) {
      const idx = bookmarks.indexOf(event.id)
      if (idx > -1) bookmarks.splice(idx, 1)
    }
    localStorage.setItem('hotBookmarks', JSON.stringify(bookmarks))
  }, [isBookmarked, event.id, isOpen])

  useEffect(() => {
    if (!isOpen) return
    const subs = JSON.parse(localStorage.getItem('hotSubscriptions') || '[]')
    if (isSubscribed && !subs.includes(event.id)) {
      subs.push(event.id)
    } else if (!isSubscribed) {
      const idx = subs.indexOf(event.id)
      if (idx > -1) subs.splice(idx, 1)
    }
    localStorage.setItem('hotSubscriptions', JSON.stringify(subs))
  }, [isSubscribed, event.id, isOpen])

  // 直接关闭
  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  // ESC 关闭
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, handleClose])

  // 锁定滚动
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prevOverflow
      }
    }
  }, [isOpen])

  const handleCommentLike = (commentId: string) => {
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        const newLiked = !c.isLiked
        return { ...c, isLiked: newLiked, likes: newLiked ? c.likes + 1 : c.likes - 1 }
      }
      if (c.replies) {
        return {
          ...c,
          replies: c.replies.map(r =>
            r.id === commentId
              ? { ...r, isLiked: !r.isLiked, likes: !r.isLiked ? r.likes + 1 : r.likes - 1 }
              : r
          ),
        }
      }
      return c
    }))
  }

  const handleCommentSubmit = () => {
    const text = commentText.trim()
    if (!text) return
    const newComment: CommentItem = {
      id: `new-${Date.now()}`,
      userId: 'me',
      userNickname: '我',
      userAvatar: 'https://picsum.photos/seed/me/80/80',
      content: text,
      likes: 0,
      isLiked: false,
      createdAt: new Date().toISOString(),
      replyToUser: replyTarget?.replyToUser,
      replies: [],
    }
    if (replyTarget) {
      setComments(prev => prev.map(c =>
        c.id === replyTarget.parentId
          ? { ...c, replies: [...(c.replies || []), newComment] }
          : c
      ))
    } else {
      setComments(prev => [newComment, ...prev])
    }
    setCommentText('')
    setReplyTarget(null)
  }

  const handleReply = (parentId: string, replyToUser: string) => {
    setReplyTarget({ parentId, replyToUser })
  }

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShowCopied(true)
      setTimeout(() => setShowCopied(false), 2000)
    } catch {
      setShowCopied(true)
      setTimeout(() => setShowCopied(false), 2000)
    }
  }

  if (!isOpen) return null

  const statusCfg = STATUS_CONFIG[event.status] || STATUS_CONFIG['发酵中']
  const catColor = CATEGORY_COLORS[event.category] || { bg: 'bg-seal', text: 'text-white' }

  const modal = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* 弹窗主体 - 统一规格：960px 宽，88vh 最大高度 */}
      <div
        ref={modalRef}
        className="relative bg-white rounded-2xl shadow-2xl overflow-hidden flex"
        style={{
          width: '960px',
          maxWidth: '92vw',
          height: 'min(88vh, 720px)',
        }}
      >
        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          className="absolute top-4 left-4 z-30 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
        >
          <X size={18} />
        </button>

        {/* 左侧：封面 + 时间线区 - 统一 420px 宽 */}
        <div className="relative flex-shrink-0 flex flex-col bg-gray-50 overflow-hidden" style={{ width: '420px' }}>
          {/* 封面图区域 */}
          <div className="relative h-[38%] flex-shrink-0 overflow-hidden">
            <img
              src={event.coverImage}
              alt={event.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

            {/* 左上角标签 */}
            <div className="absolute top-4 left-16 z-10 flex items-center gap-2">
              <span className={`px-3 py-1 text-[12px] font-semibold rounded-full ${catColor.bg} ${catColor.text} shadow-lg`}>
                {event.category}
              </span>
              <span className={`px-3 py-1 text-[12px] font-semibold rounded-full ${statusCfg.bg} ${statusCfg.text} shadow-lg flex items-center gap-1.5`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                {statusCfg.label}
              </span>
            </div>

            {/* 底部标题 */}
            <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
              <h1 className="text-[20px] font-bold text-white leading-tight mb-2 line-clamp-2">
                {event.title}
              </h1>
              <div className="flex items-center gap-3 text-white/80 text-[11.5px]">
                <span className="flex items-center gap-1.5">
                  <Flame size={12} className="text-rose-400" />
                  热度 {formatCount(event.viewCount)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users size={12} />
                  {formatCount(event.followers)} 关注
                </span>
                <span className="flex items-center gap-1.5">
                  <Activity size={12} />
                  {event.nodes.length} 个节点
                </span>
              </div>
            </div>
          </div>

          {/* 时间线区域 */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-seal/10 flex items-center justify-center">
                <Activity size={13} className="text-seal" />
              </div>
              <h2 className="text-[14px] font-bold text-ink-900">事件时间线</h2>
              <span className="text-[11px] text-ink-400">{event.nodes.length} 个关键节点</span>
            </div>

            <div className="relative pl-5">
              {/* 竖向时间线 */}
              <div className="absolute left-1.5 top-2 bottom-2 w-px bg-ink-200" />

              <div className="space-y-1">
                {event.nodes.map((node, i) => {
                  const isLatest = i === event.nodes.length - 1
                  const isExpanded = expandedNode === i
                  return (
                    <div key={i} className="relative">
                      {/* 节点圆点 */}
                      <div
                        className={`absolute -left-5 top-3 w-3 h-3 rounded-full border-2 border-white z-10 ${
                          isLatest ? 'bg-seal ring-4 ring-seal/20' : 'bg-ink-300'
                        }`}
                      />

                      <div
                        className={`bg-white rounded-lg border transition-all cursor-pointer ${
                          isExpanded ? 'border-seal/30 shadow-sm' : 'border-ink-100 hover:border-ink-200'
                        }`}
                        onClick={() => setExpandedNode(isExpanded ? null : i)}
                      >
                        <div className="p-2.5">
                          <div className="flex items-start gap-2.5">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[10.5px] font-mono text-ink-400 font-bold">{node.date}</span>
                                {isLatest && (
                                  <span className="text-[9.5px] text-seal bg-seal/10 px-1.5 py-0.5 rounded font-medium">
                                    最新
                                  </span>
                                )}
                              </div>
                              <p className="text-[12.5px] font-semibold text-ink-900">{node.label}</p>
                              {node.detail && (
                                <p className={`text-[11.5px] text-ink-500 mt-0.5 leading-relaxed ${
                                  !isExpanded ? 'line-clamp-1' : ''
                                }`}>
                                  {node.detail}
                                </p>
                              )}
                            </div>
                            <ChevronRight
                              size={15}
                              className={`text-ink-300 flex-shrink-0 mt-0.5 transition-transform ${
                                isExpanded ? 'rotate-90' : ''
                              }`}
                            />
                          </div>
                        </div>

                        {/* 展开的来源 */}
                        {isExpanded && node.sources && node.sources.length > 0 && (
                          <div className="px-2.5 pb-2.5 pt-0">
                            <div className="pt-2 border-t border-ink-50">
                              <p className="text-[10.5px] text-ink-400 mb-1.5">信息来源：</p>
                              <div className="flex flex-wrap gap-1">
                                {node.sources.map((src, j) => (
                                  <span
                                    key={j}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-paper-50 text-[10.5px] text-ink-600 border border-ink-100"
                                  >
                                    <Link2 size={9} />
                                    {src}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 节点间距 */}
                      {i < event.nodes.length - 1 && <div className="h-2" />}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：信息栏 */}
        <div className="flex-1 flex flex-col min-w-0 border-l border-ink-100 bg-white">
          {/* 顶部作者/来源区 */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-ink-100 flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-seal to-gold flex items-center justify-center text-white shadow-md flex-shrink-0">
              <Radio size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-ink-900 truncate">观微热点追踪</p>
              <p className="text-[11px] text-ink-400 mt-0.5">
                {event.lastUpdate}更新 · {event.mediaCoverage} 家媒体报道
              </p>
            </div>
            <button
              onClick={() => setIsSubscribed(!isSubscribed)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-bold active:scale-95 transition-all flex-shrink-0 ${
                isSubscribed
                  ? 'bg-paper-100 text-ink-600 border border-ink-200'
                  : 'bg-seal text-white shadow-seal-glow hover:bg-seal/90'
              }`}
            >
              {isSubscribed ? '已订阅' : '订阅'}
            </button>
          </div>

          {/* Tab 切换 */}
          <div className="flex items-center gap-1 px-5 pt-2.5 pb-2 border-b border-ink-100 flex-shrink-0">
            <button
              onClick={() => setActiveTab('detail')}
              className={`px-3 py-1.5 rounded-full text-[12.5px] font-medium transition-all ${
                activeTab === 'detail' ? 'bg-ink-900 text-white' : 'text-ink-500 hover:bg-paper-100'
              }`}
            >
              详情
            </button>
            <button
              onClick={() => setActiveTab('figures')}
              className={`px-3 py-1.5 rounded-full text-[12.5px] font-medium transition-all ${
                activeTab === 'figures' ? 'bg-ink-900 text-white' : 'text-ink-500 hover:bg-paper-100'
              }`}
            >
              关键人物
            </button>
          </div>

          {/* 中部：内容 + 评论区 */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* 内容区（较小高度，可滚动） */}
            <div className="overflow-y-auto scrollbar-thin px-5 py-3 border-b border-ink-50" style={{ maxHeight: '35%', flexShrink: 0 }}>
              {activeTab === 'detail' ? (
                <div className="space-y-3">
                  {/* 事件描述 */}
                  <p className="text-[13.5px] text-ink-700 leading-relaxed">
                    {event.fullDescription}
                  </p>

                  {/* 数据指标卡片 */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-paper-50 rounded-xl p-3 text-center border border-ink-100">
                      <p className="text-[17px] font-bold text-seal">{formatCount(event.followers)}</p>
                      <p className="text-[11px] text-ink-400 mt-0.5">关注人数</p>
                    </div>
                    <div className="bg-paper-50 rounded-xl p-3 text-center border border-ink-100">
                      <p className="text-[17px] font-bold text-ink-900">{formatCount(event.viewCount)}</p>
                      <p className="text-[11px] text-ink-400 mt-0.5">阅读量</p>
                    </div>
                    <div className="bg-paper-50 rounded-xl p-3 text-center border border-ink-100">
                      <p className="text-[17px] font-bold text-bamboo">{formatCount(event.discussionCount)}</p>
                      <p className="text-[11px] text-ink-400 mt-0.5">讨论数</p>
                    </div>
                  </div>

                  {/* 标签 */}
                  <div className="flex flex-wrap gap-1.5">
                    {event.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-full text-[11px] bg-paper-100 text-ink-500 font-medium cursor-pointer hover:bg-seal/10 hover:text-seal transition-colors"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* 相关事件 */}
                  {event.relatedEvents.length > 0 && (
                    <div className="bg-paper-50 rounded-xl p-3 border border-ink-100">
                      <div className="flex items-center gap-2 mb-2.5">
                        <TrendingUp size={13} className="text-gold" />
                        <h3 className="text-[12.5px] font-semibold text-ink-900">相关事件</h3>
                      </div>
                      <div className="space-y-2">
                        {event.relatedEvents.map(relId => {
                          const relEvent = EVENTS_DATA[relId]
                          if (!relEvent) return null
                          return (
                            <button
                              key={relId}
                              onClick={() => {
                                // 切换到相关事件（同弹窗内切换）
                                // 简化处理：跳转到详情页
                                handleClose()
                                navigate(`/hot/${relId}`)
                              }}
                              className="w-full flex items-center justify-between p-2.5 bg-white rounded-lg border border-ink-100 hover:border-seal/30 hover:shadow-sm transition-all text-left group"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-[12.5px] font-medium text-ink-800 truncate">{relEvent.title}</p>
                                <p className="text-[11px] text-ink-400 mt-0.5">
                                  {relEvent.status} · {formatCount(relEvent.followers)} 关注
                                </p>
                              </div>
                              <ChevronRight size={13} className="text-ink-300 group-hover:text-seal transition-colors flex-shrink-0" />
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <User size={13} className="text-indigo-500" />
                    <h3 className="text-[12.5px] font-semibold text-ink-900">关键人物</h3>
                  </div>
                  <div className="space-y-2">
                    {event.keyFigures.map((figure, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 bg-paper-50 rounded-xl border border-ink-100 hover:border-ink-200 transition-colors cursor-pointer"
                      >
                        <img
                          src={figure.avatar}
                          alt={figure.name}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0 bg-white ring-2 ring-white shadow-sm"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13.5px] font-semibold text-ink-900 truncate">{figure.name}</p>
                          <p className="text-[11px] text-ink-500 mt-0.5">{figure.role}</p>
                        </div>
                        <ChevronRight size={13} className="text-ink-300" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 评论区标题 */}
            <div className="px-5 py-2 border-b border-ink-50 flex items-center justify-between flex-shrink-0">
              <h3 className="text-[13px] font-bold text-ink-900 flex items-center gap-1.5">
                <MessageCircle size={14} className="text-seal" />
                全部评论
                <span className="text-ink-400 font-normal text-[12px]">({comments.length})</span>
              </h3>
            </div>

            {/* 评论列表（占据剩余最大空间，独立滚动） */}
            <div className="flex-1 overflow-y-auto scrollbar-thin px-5">
              {comments.map(comment => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onLike={handleCommentLike}
                  onReply={handleReply}
                />
              ))}
              {comments.length === 0 && (
                <div className="text-center py-8">
                  <MessageCircle size={28} className="mx-auto text-ink-200 mb-2" />
                  <p className="text-[12.5px] text-ink-400">暂无评论，快来抢沙发</p>
                </div>
              )}
            </div>
          </div>

          {/* 底部互动 + 评论输入 */}
          <div className="border-t border-ink-100 flex-shrink-0 bg-white">
            {/* 互动按钮行 */}
            <div className="flex items-center justify-around px-5 py-2 border-b border-ink-50">
              <button className="flex items-center gap-1.5 text-[12px] text-ink-500 hover:text-seal transition-colors">
                <Heart size={17} />
                <span>{formatCount(event.discussionCount)}</span>
              </button>
              <button className="flex items-center gap-1.5 text-[12px] text-ink-500 hover:text-ink-700 transition-colors">
                <Bell size={17} />
                <span>{event.mediaCoverage}</span>
              </button>
              <button
                onClick={() => setIsBookmarked(!isBookmarked)}
                className={`flex items-center gap-1.5 text-[12px] transition-all ${
                  isBookmarked ? 'text-seal font-medium' : 'text-ink-500 hover:text-seal'
                }`}
              >
                {isBookmarked ? <BookmarkCheck size={17} className="fill-seal" /> : <Bookmark size={17} />}
                <span>{isBookmarked ? '已收藏' : '收藏'}</span>
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 text-[12px] text-ink-500 hover:text-ink-700 transition-colors"
              >
                <Share2 size={17} />
                {showCopied && <span className="text-seal">已复制</span>}
                {!showCopied && <span>分享</span>}
              </button>
            </div>

            {/* 评论输入框 */}
            <div className="px-5 py-3 bg-white">
              {replyTarget && (
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-[11px] text-seal">回复 @{replyTarget.replyToUser}</span>
                  <button
                    onClick={() => setReplyTarget(null)}
                    className="ml-auto text-ink-400 text-[11px] hover:text-ink-700"
                  >
                    取消
                  </button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <img
                  src="https://picsum.photos/seed/me/80/80"
                  alt="我"
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value.slice(0, 200))}
                  placeholder={replyTarget ? `回复 @${replyTarget.replyToUser}...` : '说点什么...'}
                  onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit()}
                  className="flex-1 px-3.5 py-2 rounded-full bg-paper-100 text-[13px] text-ink-700 placeholder:text-ink-300 focus:bg-paper-50 focus:ring-2 focus:ring-seal/20 transition-all"
                />
                <button
                  onClick={handleCommentSubmit}
                  disabled={!commentText.trim()}
                  className="px-4 py-2 rounded-full bg-seal text-white text-[12.5px] font-semibold flex items-center justify-center gap-1.5 disabled:opacity-30 active:scale-95 transition-all flex-shrink-0"
                >
                  <Send size={14} />
                  发送
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}

// 导出事件数据类型和数据，供 HotPage 使用
export type { HotEvent, TimelineNode }
export { EVENTS_DATA }
