import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  X, Heart, MessageCircle, Bookmark, Share2, Send,
  Users, Clock, Flame, Eye, ThumbsUp, ThumbsDown,
  Check, Link2, Star
} from 'lucide-react'
import type { Melon, Comment, Evidence, Report } from '../types'

// ── 辅助函数 ──────────────────────────────────────────

const SUBMITTERS = [
  { name: '瓜田观察员', avatar: 'https://picsum.photos/seed/sub1/80/80', badge: '资深吃瓜' },
  { name: '真相猎人', avatar: 'https://picsum.photos/seed/sub2/80/80', badge: '鉴瓜达人' },
  { name: '理性派代表', avatar: 'https://picsum.photos/seed/sub3/80/80', badge: '热心用户' },
  { name: '八卦前线', avatar: 'https://picsum.photos/seed/sub4/80/80', badge: '消息灵通' },
]

function getSubmitter(id: number) {
  return SUBMITTERS[(id - 1) % SUBMITTERS.length]
}

function formatCountdown(revealTime: string): string {
  const now = Date.now()
  const target = new Date(revealTime).getTime()
  const diff = target - now
  if (diff <= 0) return '已开奖'
  const totalMinutes = Math.floor(diff / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0) return `${hours}小时${minutes > 0 ? `${minutes}分` : ''}后开奖`
  if (minutes > 0) return `${minutes}分钟后开奖`
  return '即将开奖'
}

function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
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

const categoryColors: Record<string, { bg: string; text: string }> = {
  '娱乐': { bg: 'bg-rose-500', text: 'text-white' },
  '科技': { bg: 'bg-blue-500', text: 'text-white' },
  '生活科普': { bg: 'bg-emerald-500', text: 'text-white' },
  '社会热点': { bg: 'bg-amber-600', text: 'text-white' },
  '社会': { bg: 'bg-amber-600', text: 'text-white' },
  '历史': { bg: 'bg-violet-500', text: 'text-white' },
  '财经': { bg: 'bg-cyan-600', text: 'text-white' },
  '校园': { bg: 'bg-indigo-500', text: 'text-white' },
  '学习': { bg: 'bg-indigo-500', text: 'text-white' },
  '健康': { bg: 'bg-teal-500', text: 'text-white' },
  '生活': { bg: 'bg-emerald-500', text: 'text-white' },
}

const difficultyLabels: Record<number, { label: string; color: string }> = {
  1: { label: '简单', color: 'bg-emerald-500/90' },
  2: { label: '中等', color: 'bg-amber-500/90' },
  3: { label: '困难', color: 'bg-rose-500/90' },
}

// ── Mock 评论数据生成 ──────────────────────────────────
function generateMockComments(melonId: string): Comment[] {
  const baseComments: Comment[] = [
    {
      id: `c-${melonId}-1`, userId: 'u1', userNickname: '吃瓜第一名', userAvatar: 'https://picsum.photos/seed/cu1/80/80',
      melonId, content: '我觉得是真的，之前就有风声了，圈内人都在传。这种事情一般不会空穴来风，大家耐心等等看后续发展吧。', parentId: null, replyToUser: '',
      likes: 128, isLiked: false, createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      replies: [
        {
          id: `c-${melonId}-1-1`, userId: 'u2', userNickname: '理性分析党', userAvatar: 'https://picsum.photos/seed/cu2/80/80',
          melonId, content: '证据呢？光靠感觉可不行，要有实锤才能下结论。', parentId: `c-${melonId}-1`, replyToUser: '吃瓜第一名',
          likes: 45, isLiked: false, createdAt: new Date(Date.now() - 1.5 * 3600 * 1000).toISOString(),
        },
        {
          id: `c-${melonId}-1-2`, userId: 'u3', userNickname: '福尔摩斯附体', userAvatar: 'https://picsum.photos/seed/cu3/80/80',
          melonId, content: '同意，第三张图的细节明显有问题', parentId: `c-${melonId}-1`, replyToUser: '理性分析党',
          likes: 23, isLiked: false, createdAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
        },
      ],
    },
    {
      id: `c-${melonId}-2`, userId: 'u4', userNickname: '福尔摩斯附体', userAvatar: 'https://picsum.photos/seed/cu3/80/80',
      melonId, content: '时间线对不上，明显是假的。建议大家看看第三张图的细节，有PS痕迹。而且爆料人的账号是新注册的，可信度存疑。', parentId: null, replyToUser: '',
      likes: 256, isLiked: false, createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    },
    {
      id: `c-${melonId}-3`, userId: 'u5', userNickname: '路过的网友', userAvatar: 'https://picsum.photos/seed/cu4/80/80',
      melonId, content: '蹲一个实锤报告，坐等开奖', parentId: null, replyToUser: '',
      likes: 67, isLiked: false, createdAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
      replies: [
        {
          id: `c-${melonId}-3-1`, userId: 'u6', userNickname: '瓜田侦探', userAvatar: 'https://picsum.photos/seed/cu5/80/80',
          melonId, content: '+1，我也在蹲', parentId: `c-${melonId}-3`, replyToUser: '路过的网友',
          likes: 12, isLiked: false, createdAt: new Date(Date.now() - 7 * 3600 * 1000).toISOString(),
        },
      ],
    },
    {
      id: `c-${melonId}-4`, userId: 'u7', userNickname: '资深瓜农', userAvatar: 'https://picsum.photos/seed/cu6/80/80',
      melonId, content: '根据我的经验，这种爆料十有八九是真的。但是证据链还不够完整，需要更多佐证才能下定论。建议大家理性吃瓜，不要被带节奏。', parentId: null, replyToUser: '',
      likes: 189, isLiked: false, createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    },
    {
      id: `c-${melonId}-5`, userId: 'u8', userNickname: '数据控', userAvatar: 'https://picsum.photos/seed/cu7/80/80',
      melonId, content: '投票比例来看，认为是假的人更多，但这不代表真相就是假的。群体智慧有时候也会出错，还是等实锤报告吧。', parentId: null, replyToUser: '',
      likes: 78, isLiked: false, createdAt: new Date(Date.now() - 15 * 3600 * 1000).toISOString(),
    },
    {
      id: `c-${melonId}-6`, userId: 'u9', userNickname: '深夜吃瓜人', userAvatar: 'https://picsum.photos/seed/cu8/80/80',
      melonId, content: '凌晨三点还在蹲这个瓜，我也是服了我自己了 🤣', parentId: null, replyToUser: '',
      likes: 45, isLiked: false, createdAt: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
    },
    {
      id: `c-${melonId}-7`, userId: 'u10', userNickname: '科技博主', userAvatar: 'https://picsum.photos/seed/cu9/80/80',
      melonId, content: '从技术角度分析一下，这个参数确实有点夸张了。如果是真的那确实是重大突破，但目前存疑。', parentId: null, replyToUser: '',
      likes: 156, isLiked: false, createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    },
  ]
  return baseComments
}

// ── Mock 佐证 ──────────────────────────────────
function generateMockEvidence(melonId: string): Evidence[] {
  return [
    {
      id: `ev-${melonId}-1`, userId: 'e1', userNickname: '真相猎人', userAvatar: 'https://picsum.photos/seed/ev1/80/80',
      melonId, guessId: 'g1', direction: true,
      content: '我找到了官方发布的参数对比表，从数据来看确实存在不一致的地方。建议大家关注第三方检测机构的报告。',
      upvotes: 128, downvotes: 12, isBest: true, createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    },
    {
      id: `ev-${melonId}-2`, userId: 'e2', userNickname: '理性派', userAvatar: 'https://picsum.photos/seed/ev2/80/80',
      melonId, guessId: 'g2', direction: false,
      content: '时间线分析：爆料账号注册时间很短，发布内容高度相似，疑似有组织的抹黑行为。',
      upvotes: 95, downvotes: 23, isBest: false, createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    },
    {
      id: `ev-${melonId}-3`, userId: 'e3', userNickname: '业内人士', userAvatar: 'https://picsum.photos/seed/ev3/80/80',
      melonId, guessId: 'g3', direction: true,
      content: '朋友在相关公司工作，私下确认了部分信息。具体细节不方便透露，但大方向是对的。',
      upvotes: 67, downvotes: 45, isBest: false, createdAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    },
    {
      id: `ev-${melonId}-4`, userId: 'e4', userNickname: '数据分析师', userAvatar: 'https://picsum.photos/seed/ev4/80/80',
      melonId, guessId: 'g4', direction: false,
      content: '对比了多个来源的数据，发现关键参数存在矛盾。如果真的达到那个水平，应该会有更多公开信息。',
      upvotes: 54, downvotes: 18, isBest: false, createdAt: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
    },
  ]
}

// ── 评论项组件 ────────────────────────────────────────
function CommentItem({
  comment, onLike, onReply, depth = 0,
}: {
  comment: Comment
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
export interface PostDetailModalProps {
  melon: Melon
  isOpen: boolean
  originRect: DOMRect | null
  onClose: () => void
}

// ── 主组件 ────────────────────────────────────────────
export default function PostDetailModal({ melon, isOpen, originRect, onClose }: PostDetailModalProps) {
  const navigate = useNavigate()
  const modalRef = useRef<HTMLDivElement>(null)

  const [choice, setChoice] = useState<boolean | null>(null)
  const [evidence, setEvidence] = useState('')
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [votedEvidence, setVotedEvidence] = useState<Record<string, 'up' | 'down'>>({})
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [bookmarked, setBookmarked] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [comments, setComments] = useState<Comment[]>([])
  const [replyTarget, setReplyTarget] = useState<{ parentId: string; replyToUser: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'desc' | 'evidence'>('desc')
  const [showCopied, setShowCopied] = useState(false)
  const [evidences, setEvidences] = useState<Evidence[]>([])
  const [report] = useState<Report | null>(null)

  // 初始化数据
  useEffect(() => {
    if (isOpen) {
      setLiked(melon.isLiked)
      setLikeCount(melon.likeCount)
      setComments(generateMockComments(melon.id))
      setEvidences(generateMockEvidence(melon.id))
      setChoice(null)
      setEvidence('')
      setHasSubmitted(false)
      setActiveTab('desc')
      setReplyTarget(null)
      setCommentText('')
    }
  }, [melon.id, isOpen, melon.isLiked, melon.likeCount])

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

  const handleLike = () => {
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikeCount(prev => wasLiked ? prev - 1 : prev + 1)
  }

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
    const newComment: Comment = {
      id: `new-${Date.now()}`,
      userId: 'me',
      userNickname: '我',
      userAvatar: 'https://picsum.photos/seed/me/80/80',
      melonId: melon.id,
      content: text,
      parentId: replyTarget?.parentId || null,
      replyToUser: replyTarget?.replyToUser || '',
      likes: 0,
      isLiked: false,
      createdAt: new Date().toISOString(),
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

  const handleVoteEvidence = (evId: string, direction: 'up' | 'down') => {
    if (votedEvidence[evId]) return
    setVotedEvidence(prev => ({ ...prev, [evId]: direction }))
  }

  const handleSubmitGuess = () => {
    if (choice === null || hasSubmitted) return
    setHasSubmitted(true)
  }

  if (!isOpen) return null

  const truePercent = melon.totalParticipants > 0
    ? Math.round((melon.trueCount / melon.totalParticipants) * 100)
    : 50
  const falsePercent = 100 - truePercent
  const isRevealed = melon.status === 'revealed'
  const catColor = categoryColors[melon.category] || { bg: 'bg-seal', text: 'text-white' }
  const diffConfig = difficultyLabels[melon.difficulty] || difficultyLabels[2]
  const submitterIdx = parseInt(melon.id.replace(/\D/g, '')) || 1
  const submitter = getSubmitter(submitterIdx)

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

        {/* 左侧：图片 + 内容区 - 统一 420px 宽 */}
        <div className="relative flex-shrink-0 bg-ink-900 overflow-hidden" style={{ width: '420px' }}>
          {/* 封面图 */}
          <div className="absolute inset-0">
            <img
              src={melon.coverImage}
              alt={melon.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
          </div>

          {/* 左上角标签组 */}
          <div className="absolute top-4 left-16 z-10 flex items-center gap-2">
            <span className={`px-3 py-1 text-[12px] font-semibold rounded-full ${catColor.bg} ${catColor.text} shadow-lg`}>
              {melon.category}
            </span>
            <span className={`px-3 py-1 text-[12px] font-semibold rounded-full ${diffConfig.color} text-white shadow-lg`}>
              {diffConfig.label}
            </span>
          </div>

          {/* 右上角状态 */}
          <div className="absolute top-4 right-4 z-10">
            {!isRevealed ? (
              <span className="px-3 py-1 text-[12px] font-semibold rounded-full bg-gold/90 text-white shadow-lg flex items-center gap-1.5">
                <Clock size={12} />
                {formatCountdown(melon.revealTime)}
              </span>
            ) : (
              <span className={`px-3 py-1 text-[12px] font-semibold rounded-full shadow-lg ${
                melon.result === true ? 'bg-seal/90' : 'bg-bamboo/90'
              } text-white flex items-center gap-1.5`}>
                <Check size={12} />
                {melon.result === true ? '结果为真' : '结果为假'}
              </span>
            )}
          </div>

          {/* 底部标题区 */}
          <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
            <h1 className="text-[24px] font-bold text-white leading-tight mb-3 line-clamp-3">
              {melon.title}
            </h1>
            <div className="flex items-center gap-4 text-white/80 text-[12.5px]">
              <span className="flex items-center gap-1.5">
                <Flame size={13} className="text-rose-400" />
                热度 {formatCount(melon.totalParticipants * 8 + likeCount * 3)}
              </span>
              <span className="flex items-center gap-1.5">
                <Users size={13} />
                {formatCount(melon.totalParticipants)} 人参与
              </span>
              <span className="flex items-center gap-1.5">
                <Eye size={13} />
                {formatCount(melon.totalParticipants * 12 + 580)}
              </span>
            </div>
          </div>
        </div>

        {/* 右侧：信息栏 */}
        <div className="flex-1 flex flex-col min-w-0 border-l border-ink-100 bg-white">
          {/* 顶部作者区 */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-ink-100 flex-shrink-0">
            <img
              src={submitter.avatar}
              alt={submitter.name}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm cursor-pointer hover:ring-seal/50 transition-all flex-shrink-0"
              onClick={() => { handleClose(); navigate(`/user/${submitter.name}`) }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[14px] font-semibold text-ink-900 truncate">{submitter.name}</p>
                <span className="text-[10px] text-gold bg-gold/10 px-1.5 py-0.5 rounded font-medium flex-shrink-0">{submitter.badge}</span>
              </div>
              <p className="text-[11px] text-ink-400 mt-0.5">
                {new Date(melon.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })} 投稿
              </p>
            </div>
            <button className="px-4 py-1.5 rounded-full bg-seal text-white text-[13px] font-bold hover:bg-seal/90 active:scale-95 transition-all shadow-seal-glow flex-shrink-0">
              关注
            </button>
          </div>

          {/* Tab 切换 */}
          <div className="flex items-center gap-1 px-5 pt-2.5 pb-2 border-b border-ink-100 flex-shrink-0">
            <button
              onClick={() => setActiveTab('desc')}
              className={`px-3 py-1.5 rounded-full text-[12.5px] font-medium transition-all ${
                activeTab === 'desc' ? 'bg-ink-900 text-white' : 'text-ink-500 hover:bg-paper-100'
              }`}
            >
              详情
            </button>
            <button
              onClick={() => setActiveTab('evidence')}
              className={`px-3 py-1.5 rounded-full text-[12.5px] font-medium transition-all ${
                activeTab === 'evidence' ? 'bg-ink-900 text-white' : 'text-ink-500 hover:bg-paper-100'
              }`}
            >
              佐证 {evidences.length > 0 && evidences.length}
            </button>
          </div>

          {/* 中部：内容 + 评论区（flex 让评论区占大比例） */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* 内容区（较小高度，可滚动） */}
            <div className="overflow-y-auto scrollbar-thin px-5 py-3 border-b border-ink-50" style={{ maxHeight: '38%', flexShrink: 0 }}>
              {activeTab === 'desc' ? (
                <div className="space-y-3">
                  {/* 描述 */}
                  <p className="text-[13.5px] text-ink-700 leading-relaxed">
                    {melon.description}
                  </p>

                  {/* 关键信息标签 */}
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-seal/10 text-seal text-[11px] font-bold">
                      <Flame size={10} />
                      热度 {formatCount(melon.totalParticipants * 8 + likeCount * 3)}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-paper-100 text-ink-500 text-[11px] font-medium">
                      <Eye size={10} />
                      {formatCount(melon.totalParticipants * 12 + 580)}次浏览
                    </span>
                    {!isRevealed && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold/10 text-gold text-[11px] font-bold">
                        <Clock size={10} />
                        {formatCountdown(melon.revealTime)}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-paper-100 text-ink-500 text-[11px] font-medium">
                      <Star size={10} />
                      难度 {diffConfig.label}
                    </span>
                  </div>

                  {/* 投票区 - 重新设计 */}
                  <div
                    className="relative rounded-2xl p-4 overflow-hidden border border-ink-100"
                    style={{
                      background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 50%, #fef2f2 100%)',
                    }}
                  >
                    {/* 背景纹理 */}
                    <div
                      className="absolute inset-0 opacity-[0.04] pointer-events-none"
                      style={{
                        backgroundImage:
                          'radial-gradient(circle at 20% 50%, #10b981 1px, transparent 1px), radial-gradient(circle at 80% 50%, #f43f5e 1px, transparent 1px)',
                        backgroundSize: '24px 24px',
                      }}
                    />

                    <div className="relative">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[13px] font-bold text-ink-900">
                          {isRevealed ? '最终结果' : '你的判断是什么？'}
                        </p>
                        <span className="text-[10px] text-ink-400 font-mono">
                          {formatCount(melon.totalParticipants)} 人参与
                        </span>
                      </div>

                      {/* 比例条 */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-seal" />
                            <span className="text-[12px] font-bold text-seal">真 {truePercent}%</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12px] font-bold text-bamboo">假 {falsePercent}%</span>
                            <div className="w-2 h-2 rounded-full bg-bamboo" />
                          </div>
                        </div>
                        <div className="relative h-2.5 rounded-full overflow-hidden bg-paper-100 flex">
                          <div
                            className="h-full transition-all duration-700 ease-out"
                            style={{
                              width: `${truePercent}%`,
                              background: 'linear-gradient(to right, #10b981, #059669)',
                            }}
                          />
                          <div
                            className="h-full transition-all duration-700 ease-out"
                            style={{
                              width: `${falsePercent}%`,
                              background: 'linear-gradient(to right, #f43f5e, #e11d48)',
                            }}
                          />
                        </div>
                      </div>

                      {!isRevealed ? (
                        <>
                          {/* 真假选择卡片 */}
                          <div className="grid grid-cols-2 gap-2 mb-2.5">
                            <button
                              onClick={() => !hasSubmitted && setChoice(true)}
                              className={`relative py-3 rounded-xl border-2 font-bold text-[14px] transition-all flex flex-col items-center gap-1 active:scale-[0.97] overflow-hidden ${
                                choice === true
                                  ? 'border-seal bg-seal text-white shadow-md shadow-seal/30'
                                  : 'border-ink-200 bg-white/80 text-ink-700 hover:border-seal/50 hover:bg-seal/5'
                              } ${hasSubmitted ? 'cursor-not-allowed opacity-80' : ''}`}
                            >
                              <ThumbsUp size={16} strokeWidth={2.5} />
                              <span>真</span>
                            </button>
                            <button
                              onClick={() => !hasSubmitted && setChoice(false)}
                              className={`relative py-3 rounded-xl border-2 font-bold text-[14px] transition-all flex flex-col items-center gap-1 active:scale-[0.97] overflow-hidden ${
                                choice === false
                                  ? 'border-bamboo bg-bamboo text-white shadow-md shadow-bamboo/30'
                                  : 'border-ink-200 bg-white/80 text-ink-700 hover:border-bamboo/50 hover:bg-bamboo/5'
                              } ${hasSubmitted ? 'cursor-not-allowed opacity-80' : ''}`}
                            >
                              <ThumbsDown size={16} strokeWidth={2.5} />
                              <span>假</span>
                            </button>
                          </div>

                          {choice !== null && !hasSubmitted && (
                            <div className="mb-2.5">
                              <label className="block text-[11px] text-ink-400 mb-1">填写佐证（选填）</label>
                              <textarea
                                value={evidence}
                                onChange={(e) => setEvidence(e.target.value.slice(0, 500))}
                                placeholder="说说你判断的依据..."
                                rows={2}
                                className="w-full px-3 py-2 rounded-xl bg-white/80 text-[12.5px] text-ink-700 placeholder:text-ink-300 resize-none leading-relaxed border border-ink-200 focus:border-seal/50 focus:bg-white transition-all"
                              />
                              <div className="text-right text-[10px] text-ink-400 mt-0.5">{evidence.length}/500</div>
                            </div>
                          )}

                          {hasSubmitted ? (
                            <div className="flex items-center justify-center gap-2 py-2.5 bg-bamboo/10 text-bamboo rounded-xl font-semibold text-[13px]">
                              <Check size={14} strokeWidth={2.5} />
                              <span>已提交，等待开奖</span>
                            </div>
                          ) : (
                            <button
                              onClick={handleSubmitGuess}
                              disabled={choice === null}
                              className="w-full py-2.5 rounded-xl font-bold text-[13px] text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                              style={{
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                boxShadow: '0 4px 12px -2px rgba(16, 185, 129, 0.4)',
                              }}
                            >
                              提交判断
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-3">
                          <div
                            className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl text-2xl font-bold ${
                              melon.result === true
                                ? 'bg-seal/10 text-seal shadow-md shadow-seal/20'
                                : 'bg-bamboo/10 text-bamboo shadow-md shadow-bamboo/20'
                            }`}
                          >
                            {melon.result === true ? '真' : '假'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 开奖后的实锤报告 */}
                  {isRevealed && report && (
                    <div className="bg-paper-50 rounded-xl p-3 border border-ink-100">
                      <h3 className="text-[12.5px] font-semibold text-ink-900 mb-1.5 flex items-center gap-1.5">
                        <Link2 size={13} className="text-seal" />
                        实锤报告
                      </h3>
                      <p className="text-[12.5px] text-ink-700 leading-relaxed mb-1">{report.tendency}</p>
                      <p className="text-[10.5px] text-ink-400">{report.disclaimer}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {evidences.length > 0 ? (
                    <div className="space-y-2.5">
                      {[...evidences]
                        .sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes))
                        .map((ev, rank) => {
                          const isTop3 = rank < 3
                          return (
                            <div
                              key={ev.id}
                              className={`p-2.5 rounded-xl transition-colors ${
                                ev.isBest ? 'bg-seal/5 border border-seal/20' : 'bg-paper-50 border border-ink-100 hover:border-ink-200'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1.5">
                                {isTop3 && (
                                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                                    rank === 0 ? 'bg-amber-400' : rank === 1 ? 'bg-gray-400' : 'bg-amber-600'
                                  }`}>
                                    {rank + 1}
                                  </div>
                                )}
                                <img
                                  src={ev.userAvatar}
                                  alt={ev.userNickname}
                                  className="w-5 h-5 rounded-full bg-paper cursor-pointer"
                                />
                                <span className="text-[11.5px] text-ink-700 font-medium truncate">{ev.userNickname}</span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  ev.direction ? 'bg-seal/10 text-seal' : 'bg-bamboo/10 text-bamboo'
                                }`}>
                                  认为{ev.direction ? '真' : '假'}
                                </span>
                                {ev.isBest && (
                                  <span className="text-[10px] text-gold bg-gold/10 px-1.5 py-0.5 rounded font-medium">最佳</span>
                                )}
                              </div>
                              <p className="text-[12.5px] text-ink-800 leading-relaxed mb-1.5">{ev.content}</p>
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => handleVoteEvidence(ev.id, 'up')}
                                  className={`flex items-center gap-1 text-[11px] transition-colors ${
                                    votedEvidence[ev.id] === 'up' ? 'text-seal font-medium' : 'text-ink-400 hover:text-seal'
                                  }`}
                                >
                                  <ThumbsUp size={11} />
                                  <span>{ev.upvotes + (votedEvidence[ev.id] === 'up' ? 1 : 0)}</span>
                                </button>
                                <button
                                  onClick={() => handleVoteEvidence(ev.id, 'down')}
                                  className={`flex items-center gap-1 text-[11px] transition-colors ${
                                    votedEvidence[ev.id] === 'down' ? 'text-bamboo font-medium' : 'text-ink-400 hover:text-bamboo'
                                  }`}
                                >
                                  <ThumbsDown size={11} />
                                  <span>{ev.downvotes}</span>
                                </button>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Link2 size={24} className="mx-auto text-ink-200 mb-2" />
                      <p className="text-[12.5px] text-ink-400">暂无佐证</p>
                    </div>
                  )}
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
              <button
                onClick={handleLike}
                className={`flex items-center gap-1.5 text-[12px] transition-all ${
                  liked ? 'text-seal font-medium' : 'text-ink-500 hover:text-seal'
                }`}
              >
                <Heart size={17} className={liked ? 'fill-seal' : ''} />
                <span>{formatCount(likeCount)}</span>
              </button>
              <button className="flex items-center gap-1.5 text-[12px] text-ink-500 hover:text-ink-700 transition-colors">
                <MessageCircle size={17} />
                <span>{comments.length}</span>
              </button>
              <button
                onClick={() => setBookmarked(!bookmarked)}
                className={`flex items-center gap-1.5 text-[12px] transition-all ${
                  bookmarked ? 'text-gold font-medium' : 'text-ink-500 hover:text-gold'
                }`}
              >
                <Bookmark size={17} className={bookmarked ? 'fill-gold' : ''} />
                <span>收藏</span>
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
