import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  X, Heart, MessageCircle, Bookmark, Share2, Send,
  Users, Clock, Flame, Eye, ThumbsUp, ThumbsDown,
  Check, Link2, PenLine,
  AlertCircle, ArrowLeft, Star
} from 'lucide-react'
import { api } from '../services/api'
import { transformMelon, transformReport, transformEvidenceList } from '../utils/transform'
import { generateMockEvidence, generateMockReport } from '../services/mockData'
import { usePlatform } from '../hooks/usePlatform'
import { usePageContext } from '../hooks/usePageContext'
import type { Melon, Report, Evidence, Comment } from '../types'

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
  '历史': { bg: 'bg-violet-500', text: 'text-white' },
  '财经': { bg: 'bg-cyan-600', text: 'text-white' },
  '校园': { bg: 'bg-indigo-500', text: 'text-white' },
  '健康': { bg: 'bg-teal-500', text: 'text-white' },
}

const difficultyLabels: Record<number, { label: string; color: string }> = {
  1: { label: '简单', color: 'bg-emerald-500/90' },
  2: { label: '中等', color: 'bg-amber-500/90' },
  3: { label: '困难', color: 'bg-rose-500/90' },
}

// ── Mock 评论数据 ──────────────────────────────────────
const MOCK_COMMENTS: Comment[] = [
  {
    id: 'c1', userId: 'u1', userNickname: '吃瓜第一名', userAvatar: 'https://picsum.photos/seed/cu1/80/80',
    melonId: '1', content: '我觉得是真的，之前就有风声了', parentId: null, replyToUser: '',
    likes: 128, isLiked: false, createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    replies: [
      {
        id: 'c1-1', userId: 'u2', userNickname: '理性分析党', userAvatar: 'https://picsum.photos/seed/cu2/80/80',
        melonId: '1', content: '证据呢？光靠感觉可不行', parentId: 'c1', replyToUser: '吃瓜第一名',
        likes: 45, isLiked: false, createdAt: new Date(Date.now() - 1.5 * 3600 * 1000).toISOString(),
      },
    ],
  },
  {
    id: 'c2', userId: 'u3', userNickname: '福尔摩斯附体', userAvatar: 'https://picsum.photos/seed/cu3/80/80',
    melonId: '1', content: '时间线对不上，明显是假的。建议大家看看第三张图的细节，有PS痕迹。', parentId: null, replyToUser: '',
    likes: 256, isLiked: false, createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
  },
  {
    id: 'c3', userId: 'u4', userNickname: '路过的网友', userAvatar: 'https://picsum.photos/seed/cu4/80/80',
    melonId: '1', content: '蹲一个实锤报告', parentId: null, replyToUser: '',
    likes: 67, isLiked: false, createdAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
  },
]

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
      <div className={`flex gap-2.5 ${depth > 0 ? '' : 'py-3'}`}>
        <img
          src={comment.userAvatar}
          alt={comment.userNickname}
          className="w-8 h-8 rounded-full object-cover flex-shrink-0 bg-paper-100"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[13px] font-medium text-ink-700">{comment.userNickname}</span>
            <span className="text-[11px] text-ink-400">{formatTime(comment.createdAt)}</span>
          </div>
          <p className="text-[14px] text-ink-800 leading-relaxed mb-1.5">
            {comment.replyToUser && (
              <span className="text-seal">@{comment.replyToUser} </span>
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
              <span>{comment.likes > 0 ? comment.likes : ''}</span>
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

// ── 主组件 ────────────────────────────────────────────
export default function MelonDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isWeb } = usePlatform()

  const [melon, setMelon] = useState<Melon | null>(null)
  const [loading, setLoading] = useState(true)
  const [choice, setChoice] = useState<boolean | null>(null)
  const [evidence, setEvidence] = useState('')
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [showCopied, setShowCopied] = useState(false)
  const [report, setReport] = useState<Report | null>(null)
  const [evidences, setEvidences] = useState<Evidence[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [votedEvidence, setVotedEvidence] = useState<Record<string, 'up' | 'down'>>({})
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [liking, setLiking] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [comments, setComments] = useState<Comment[]>(MOCK_COMMENTS)
  const [replyTarget, setReplyTarget] = useState<{ parentId: string; replyToUser: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'desc' | 'evidence'>('desc')

  const melonId = Number(id)

  const fetchMelonDetail = useCallback(async () => {
    if (!melonId) return
    try {
      setLoading(true)
      const apiMelon: any = await api.getMelon(melonId)
      const transformed = transformMelon(apiMelon)
      setMelon(transformed)
      setLiked(transformed.isLiked)
      setLikeCount(transformed.likeCount)

      try {
        const myGuess: any = await api.getMyGuess(melonId)
        if (myGuess?.guess) {
          setChoice(myGuess.guess.choice)
          setHasSubmitted(true)
          if (myGuess.evidence) setEvidence(myGuess.evidence.content || '')
        }
      } catch { /* 未猜过 */ }

      if (transformed.status === 'revealed') {
        try {
          const apiReport: any = await api.getReport(melonId)
          setReport(transformReport(apiReport))
        } catch {
          const mockReport = generateMockReport(String(melonId), transformed.result ?? true)
          setReport(mockReport)
        }
      }

      try {
        const apiEvidences: any = await api.getEvidences(melonId)
        const evidenceList = apiEvidences.list || apiEvidences || []
        if (Array.isArray(evidenceList) && evidenceList.length > 0) {
          setEvidences(transformEvidenceList(evidenceList))
        } else {
          throw new Error('empty')
        }
      } catch {
        const mockEvidences = generateMockEvidence(String(melonId))
        setEvidences(mockEvidences.map((ev, i) => ({
          ...ev,
          id: `ev_mock_${i}`,
        })))
      }
    } catch (e) {
      console.error('获取瓜详情失败:', e)
    } finally {
      setLoading(false)
    }
  }, [melonId])

  useEffect(() => { fetchMelonDetail() }, [fetchMelonDetail])

  usePageContext(
    melon ? { type: 'melon', title: melon.title, content: melon.description } : null
  )

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShowCopied(true)
      setTimeout(() => setShowCopied(false), 2000)
    } catch {
      const input = document.createElement('input')
      input.value = window.location.href
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setShowCopied(true)
      setTimeout(() => setShowCopied(false), 2000)
    }
  }

  const handleSubmit = async () => {
    if (choice === null || submitting) return
    setSubmitting(true)
    try {
      await api.submitGuess(melonId, choice, evidence || undefined)
      setHasSubmitted(true)
    } catch (e: any) {
      alert(e.message || '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleVoteEvidence = async (evId: string, direction: 'up' | 'down') => {
    if (votedEvidence[evId]) return
    setVotedEvidence(prev => ({ ...prev, [evId]: direction }))
    try {
      if (direction === 'up') await api.upvoteEvidence(Number(evId))
      else await api.downvoteEvidence(Number(evId))
    } catch { /* ignore */ }
  }

  const handleLike = async () => {
    if (liking) return
    setLiking(true)
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikeCount(prev => wasLiked ? prev - 1 : prev + 1)
    try {
      await api.likeMelon(melonId)
    } catch {
      setLiked(wasLiked)
      setLikeCount(prev => wasLiked ? prev + 1 : prev - 1)
    } finally {
      setLiking(false)
    }
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
      melonId: String(melonId),
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

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-paper-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-paper-200 border-t-seal rounded-full animate-spin" />
          <p className="text-[13px] text-ink-400">加载中...</p>
        </div>
      </div>
    )
  }

  if (!melon) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-paper-50">
        <div className="w-16 h-16 rounded-2xl bg-paper-100 flex items-center justify-center mb-4">
          <AlertCircle size={28} className="text-ink-300" />
        </div>
        <p className="text-ink-500 text-sm mb-4 font-medium">该瓜不存在或已被删除</p>
        <button
          onClick={() => navigate('/melon')}
          className="px-5 py-2.5 bg-seal text-white rounded-xl text-sm font-medium shadow-seal-glow"
        >
          返回瓜田
        </button>
      </div>
    )
  }

  const truePercent = melon.totalParticipants > 0
    ? Math.round((melon.trueCount / melon.totalParticipants) * 100)
    : 50
  const falsePercent = 100 - truePercent
  const isRevealed = melon.status === 'revealed'
  const catColor = categoryColors[melon.category] || { bg: 'bg-seal', text: 'text-white' }
  const diffConfig = difficultyLabels[melon.difficulty] || difficultyLabels[2]
  const submitter = getSubmitter(melonId)

  // ── Web 端：小红书风格左右分栏大卡片 ─────────────
  if (isWeb) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-paper-50 p-6 overflow-auto">
        <div className="w-full max-w-[1400px] bg-white rounded-2xl shadow-2xl overflow-hidden flex animate-fade-in-up" style={{ height: 'calc(100vh - 100px)', minHeight: '600px' }}>
          {/* 左侧：图片 + 内容区 */}
          <div className="relative w-[60%] flex-shrink-0 bg-ink-900 overflow-hidden">
            {/* 关闭按钮 */}
            <button
              onClick={() => navigate('/melon')}
              className="absolute top-4 left-4 z-20 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
            >
              <X size={18} />
            </button>

            {/* 封面图 */}
            <img
              src={melon.coverImage}
              alt={melon.title}
              className="w-full h-full object-cover"
            />

            {/* 渐变遮罩 */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

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
              <h1 className="text-[26px] font-bold text-white leading-tight mb-3 line-clamp-3">
                {melon.title}
              </h1>
              <div className="flex items-center gap-4 text-white/80 text-[13px]">
                <span className="flex items-center gap-1.5">
                  <Flame size={14} className="text-rose-400" />
                  热度 {formatCount(melon.totalParticipants * 8 + likeCount * 3)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users size={14} />
                  {formatCount(melon.totalParticipants)} 人参与
                </span>
                <span className="flex items-center gap-1.5">
                  <Eye size={14} />
                  {formatCount(melon.totalParticipants * 12 + 580)}
                </span>
              </div>
            </div>
          </div>

          {/* 右侧：信息栏 */}
          <div className="flex-1 flex flex-col min-w-0 border-l border-ink-100">
            {/* 顶部作者区 */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-ink-100 flex-shrink-0">
              <img
                src={submitter.avatar}
                alt={submitter.name}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm cursor-pointer hover:ring-seal/50 transition-all"
                onClick={() => navigate(`/user/${submitter.name}`)}
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
              <button className="px-4 py-1.5 rounded-full bg-seal text-white text-[13px] font-bold hover:bg-seal/90 active:scale-95 transition-all shadow-seal-glow">
                关注
              </button>
            </div>

            {/* Tab 切换 */}
            <div className="flex items-center gap-1 px-5 pt-3 pb-2 border-b border-ink-100 flex-shrink-0">
              <button
                onClick={() => setActiveTab('desc')}
                className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                  activeTab === 'desc' ? 'bg-ink-900 text-white' : 'text-ink-500 hover:bg-paper-100'
                }`}
              >
                详情
              </button>
              <button
                onClick={() => setActiveTab('evidence')}
                className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                  activeTab === 'evidence' ? 'bg-ink-900 text-white' : 'text-ink-500 hover:bg-paper-100'
                }`}
              >
                佐证 {evidences.length > 0 && evidences.length}
              </button>
            </div>

            {/* 中部滚动内容区 */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {activeTab === 'desc' ? (
                <div className="px-5 py-4 space-y-4">
                  {/* 描述 */}
                  <p className="text-[14px] text-ink-700 leading-relaxed">
                    {melon.description}
                  </p>

                  {/* 关键信息标签 */}
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-seal/10 text-seal text-[11px] font-bold">
                      <Flame size={11} />
                      热度 {formatCount(melon.totalParticipants * 8 + likeCount * 3)}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-paper-100 text-ink-500 text-[11px] font-medium">
                      <Eye size={11} />
                      {formatCount(melon.totalParticipants * 12 + 580)}次浏览
                    </span>
                    {!isRevealed && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gold/10 text-gold text-[11px] font-bold">
                        <Clock size={11} />
                        {formatCountdown(melon.revealTime)}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-paper-100 text-ink-500 text-[11px] font-medium">
                      <Star size={11} />
                      难度 {diffConfig.label}
                    </span>
                  </div>

                  {/* 投票区 - 重新设计 */}
                  <div
                    className="relative rounded-2xl p-5 overflow-hidden border border-ink-100"
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
                        <p className="text-[14px] font-bold text-ink-900">
                          {isRevealed ? '最终结果' : '你的判断是什么？'}
                        </p>
                        <span className="text-[11px] text-ink-400 font-mono">
                          {formatCount(melon.totalParticipants)} 人参与
                        </span>
                      </div>

                      {/* 比例条 */}
                      <div className="mb-3.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-seal" />
                            <span className="text-[13px] font-bold text-seal">真 {truePercent}%</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[13px] font-bold text-bamboo">假 {falsePercent}%</span>
                            <div className="w-2 h-2 rounded-full bg-bamboo" />
                          </div>
                        </div>
                        <div className="relative h-3 rounded-full overflow-hidden bg-paper-100 flex">
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
                          <div className="grid grid-cols-2 gap-2.5 mb-3">
                            <button
                              onClick={() => !hasSubmitted && setChoice(true)}
                              className={`relative py-3.5 rounded-xl border-2 font-bold text-[15px] transition-all flex flex-col items-center gap-1 active:scale-[0.97] overflow-hidden ${
                                choice === true
                                  ? 'border-seal bg-seal text-white shadow-md shadow-seal/30'
                                  : 'border-ink-200 bg-white/80 text-ink-700 hover:border-seal/50 hover:bg-seal/5'
                              } ${hasSubmitted ? 'cursor-not-allowed opacity-80' : ''}`}
                            >
                              <ThumbsUp size={18} strokeWidth={2.5} />
                              <span>真</span>
                            </button>
                            <button
                              onClick={() => !hasSubmitted && setChoice(false)}
                              className={`relative py-3.5 rounded-xl border-2 font-bold text-[15px] transition-all flex flex-col items-center gap-1 active:scale-[0.97] overflow-hidden ${
                                choice === false
                                  ? 'border-bamboo bg-bamboo text-white shadow-md shadow-bamboo/30'
                                  : 'border-ink-200 bg-white/80 text-ink-700 hover:border-bamboo/50 hover:bg-bamboo/5'
                              } ${hasSubmitted ? 'cursor-not-allowed opacity-80' : ''}`}
                            >
                              <ThumbsDown size={18} strokeWidth={2.5} />
                              <span>假</span>
                            </button>
                          </div>

                          {choice !== null && !hasSubmitted && (
                            <div className="mb-3">
                              <label className="block text-[12px] text-ink-400 mb-1.5">填写佐证（选填）</label>
                              <textarea
                                value={evidence}
                                onChange={(e) => setEvidence(e.target.value.slice(0, 500))}
                                placeholder="说说你判断的依据..."
                                rows={2}
                                className="w-full px-3 py-2 rounded-xl bg-white/80 text-[13px] text-ink-700 placeholder:text-ink-300 resize-none leading-relaxed border border-ink-200 focus:border-seal/50 focus:bg-white transition-all"
                              />
                              <div className="text-right text-[11px] text-ink-400 mt-0.5">{evidence.length}/500</div>
                            </div>
                          )}

                          {hasSubmitted ? (
                            <div className="flex items-center justify-center gap-2 py-3 bg-bamboo/10 text-bamboo rounded-xl font-semibold text-[14px]">
                              <Check size={16} strokeWidth={2.5} />
                              <span>已提交，等待开奖</span>
                            </div>
                          ) : (
                            <button
                              onClick={handleSubmit}
                              disabled={choice === null || submitting}
                              className="w-full py-3 rounded-xl font-bold text-[14px] text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                              style={{
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                boxShadow: '0 4px 12px -2px rgba(16, 185, 129, 0.4)',
                              }}
                            >
                              {submitting ? '提交中...' : '提交判断'}
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-4">
                          <div
                            className={`inline-flex items-center justify-center w-18 h-18 rounded-2xl text-2xl font-bold ${
                              melon.result === true
                                ? 'bg-seal/10 text-seal shadow-md shadow-seal/20'
                                : 'bg-bamboo/10 text-bamboo shadow-md shadow-bamboo/20'
                            }`}
                            style={{ width: '72px', height: '72px' }}
                          >
                            {melon.result === true ? '真' : '假'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 开奖后的实锤报告 */}
                  {isRevealed && report && (
                    <div className="bg-paper-50 rounded-xl p-4 border border-ink-100">
                      <h3 className="text-[13px] font-semibold text-ink-900 mb-2 flex items-center gap-1.5">
                        <Link2 size={14} className="text-seal" />
                        实锤报告
                      </h3>
                      <p className="text-[13px] text-ink-700 leading-relaxed mb-2">{report.tendency}</p>
                      <p className="text-[11px] text-ink-400">{report.disclaimer}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-5 py-4">
                  {evidences.length > 0 ? (
                    <div className="space-y-3">
                      {[...evidences]
                        .sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes))
                        .map((ev, rank) => {
                          const isTop3 = rank < 3
                          return (
                            <div
                              key={ev.id}
                              className={`p-3 rounded-xl transition-colors ${
                                ev.isBest ? 'bg-seal/5 border border-seal/20' : 'bg-paper-50 border border-ink-100 hover:border-ink-200'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-2">
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
                                  onClick={() => navigate(`/user/${ev.userNickname}`)}
                                />
                                <span className="text-[12px] text-ink-700 font-medium truncate">{ev.userNickname}</span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  ev.direction ? 'bg-seal/10 text-seal' : 'bg-bamboo/10 text-bamboo'
                                }`}>
                                  认为{ev.direction ? '真' : '假'}
                                </span>
                                {ev.isBest && (
                                  <span className="text-[10px] text-gold bg-gold/10 px-1.5 py-0.5 rounded font-medium">最佳</span>
                                )}
                              </div>
                              <p className="text-[13px] text-ink-800 leading-relaxed mb-2">{ev.content}</p>
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => handleVoteEvidence(ev.id, 'up')}
                                  className={`flex items-center gap-1 text-[11px] transition-colors ${
                                    votedEvidence[ev.id] === 'up' ? 'text-seal font-medium' : 'text-ink-400 hover:text-seal'
                                  }`}
                                >
                                  <ThumbsUp size={12} />
                                  <span>{ev.upvotes + (votedEvidence[ev.id] === 'up' ? 1 : 0)}</span>
                                </button>
                                <button
                                  onClick={() => handleVoteEvidence(ev.id, 'down')}
                                  className={`flex items-center gap-1 text-[11px] transition-colors ${
                                    votedEvidence[ev.id] === 'down' ? 'text-bamboo font-medium' : 'text-ink-400 hover:text-bamboo'
                                  }`}
                                >
                                  <ThumbsDown size={12} />
                                  <span>{ev.downvotes}</span>
                                </button>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Link2 size={28} className="mx-auto text-ink-200 mb-2" />
                      <p className="text-[13px] text-ink-400">暂无佐证</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 底部互动 + 评论区 */}
            <div className="border-t border-ink-100 flex-shrink-0">
              {/* 互动按钮行 */}
              <div className="flex items-center justify-around px-5 py-2.5 border-b border-ink-50">
                <button
                  onClick={handleLike}
                  className={`flex items-center gap-1.5 text-[12px] transition-all ${
                    liked ? 'text-seal font-medium' : 'text-ink-500 hover:text-seal'
                  }`}
                >
                  <Heart size={18} className={liked ? 'fill-seal' : ''} />
                  <span>{formatCount(likeCount)}</span>
                </button>
                <button className="flex items-center gap-1.5 text-[12px] text-ink-500 hover:text-ink-700 transition-colors">
                  <MessageCircle size={18} />
                  <span>{melon.commentCount}</span>
                </button>
                <button
                  onClick={() => setBookmarked(!bookmarked)}
                  className={`flex items-center gap-1.5 text-[12px] transition-all ${
                    bookmarked ? 'text-gold font-medium' : 'text-ink-500 hover:text-gold'
                  }`}
                >
                  <Bookmark size={18} className={bookmarked ? 'fill-gold' : ''} />
                  <span>收藏</span>
                </button>
                <button
                  onClick={handleShare}
                  className="flex items-center gap-1.5 text-[12px] text-ink-500 hover:text-ink-700 transition-colors"
                >
                  <Share2 size={18} />
                  {showCopied && <span className="text-seal">已复制</span>}
                </button>
              </div>

              {/* 评论列表（显示3条） */}
              <div className="max-h-48 overflow-y-auto scrollbar-thin px-5 py-1">
                {comments.slice(0, 3).map(comment => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    onLike={handleCommentLike}
                    onReply={handleReply}
                  />
                ))}
                {comments.length > 3 && (
                  <button className="w-full py-2 text-[12px] text-ink-400 hover:text-ink-700 transition-colors text-left">
                    查看全部 {comments.length} 条评论
                  </button>
                )}
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
                    className="w-9 h-9 rounded-full bg-seal text-white flex items-center justify-center disabled:opacity-30 active:scale-90 transition-all flex-shrink-0"
                  >
                    <Send size={15} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Mobile 端：保持简洁的竖向布局 ────────────────
  return (
    <div className="min-h-screen bg-paper-texture pb-8">
      <div className="sticky top-0 z-20 glass border-b border-line/50">
        <div className="flex items-center h-12 px-4 max-w-[480px] mx-auto">
          <button onClick={() => navigate('/melon')} className="flex items-center gap-1 text-ink-700 text-sm active:opacity-60">
            <ArrowLeft size={18} />
            <span>返回</span>
          </button>
          <div className="flex-1" />
          <button onClick={handleShare} className="flex items-center gap-1 text-ink-700 text-sm active:opacity-60">
            <Share2 size={18} />
            {showCopied && <span className="text-seal text-xs font-medium">已复制</span>}
          </button>
        </div>
      </div>

      <div className="max-w-[480px] mx-auto">
        <div className="relative">
          <img src={melon.coverImage} alt={melon.title} className="w-full h-52 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <span className={`absolute top-3 left-3 px-2.5 py-1 text-[11px] font-medium text-white rounded-lg ${catColor.bg} backdrop-blur-sm`}>
            {melon.category}
          </span>
        </div>

        <div className="px-5 pt-4 pb-3">
          <h1 className="text-[18px] font-bold text-ink-900 leading-snug mb-2">{melon.title}</h1>
          <p className="text-[14px] text-ink-500 leading-relaxed">{melon.description}</p>
        </div>
      </div>
    </div>
  )
}
