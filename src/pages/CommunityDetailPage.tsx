import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Users,
  MessageSquare,
  Flame,
  Clock,
  Sparkles,
  Heart,
  Eye,
  PenLine,
  Image as ImageIcon,
  Send,
  X,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useCommunityStore, type CommunityPostTab } from '../stores/communityStore'
import { getCommunityPostHotScore, type CommunitySeedPost, type CommunityComment } from '../services/mockData'
import { usePlatform } from '../hooks/usePlatform'
import { usePageContext } from '../hooks/usePageContext'

// ── 工具函数 ──────────────────────────────────────────

function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}天前`
  return new Date(iso).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

// ── 类型标签配置 ──────────────────────────────────────────

const TYPE_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  hot: { label: '热帖', bg: 'bg-red-50', text: 'text-red-600' },
  normal: { label: '讨论', bg: 'bg-blue-50', text: 'text-blue-600' },
  charity: { label: '公益', bg: 'bg-emerald-50', text: 'text-emerald-600' },
  help: { label: '求助', bg: 'bg-amber-50', text: 'text-amber-600' },
}

// ── 帖子 Tabs ──────────────────────────────────────────

const POST_TABS: Array<{ key: CommunityPostTab; label: string; icon: typeof Flame }> = [
  { key: 'hot', label: '热门', icon: Flame },
  { key: 'latest', label: '最新', icon: Clock },
  { key: 'featured', label: '精华', icon: Sparkles },
]

// ── 帖子卡片 ──────────────────────────────────────────

interface PostCardProps {
  post: CommunitySeedPost
  index: number
  onOpen: (postId: string) => void
}

function PostCard({ post, index, onOpen }: PostCardProps) {
  const badge = TYPE_BADGE[post.type] || TYPE_BADGE.normal
  return (
    <button
      onClick={() => onOpen(post.id)}
      className="group w-full bg-surface rounded-2xl border border-line/40 p-4 hover:border-line hover:shadow-card-hover transition-all duration-200 text-left press-pop animate-fade-in-up"
      style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
    >
      {/* 作者行 */}
      <div className="flex items-center gap-2.5 mb-2.5">
        <img
          src={post.authorAvatar}
          alt={post.authorName}
          loading="lazy"
          className="w-8 h-8 rounded-full bg-paper-100 ring-1 ring-line/30"
        />
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-semibold text-ink-800 truncate block">{post.authorName}</span>
          <span className="text-[11px] text-ink-400">{formatTime(post.createdAt)}</span>
        </div>
        <span className={`px-2 py-0.5 text-[11px] font-bold rounded-md ${badge.bg} ${badge.text}`}>
          {badge.label}
        </span>
      </div>

      {/* 标题 */}
      <h3 className="text-[15px] font-bold text-ink-900 leading-snug mb-1.5 line-clamp-2 group-hover:text-seal transition-colors">
        {post.title}
      </h3>

      {/* 摘要 */}
      <p className="text-[13px] text-ink-500 leading-relaxed line-clamp-2 mb-2.5">
        {post.content}
      </p>

      {/* 图片预览 */}
      {post.image && (
        <div className="mb-2.5 rounded-xl overflow-hidden bg-paper-100 h-32">
          <img
            src={post.image}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      )}

      {/* 互动栏 */}
      <div className="flex items-center gap-4 text-[12px] text-ink-400">
        <span className="flex items-center gap-1">
          <Heart size={13} strokeWidth={1.75} />
          {formatCount(post.likes)}
        </span>
        <span className="flex items-center gap-1">
          <MessageSquare size={13} strokeWidth={1.75} />
          {formatCount(post.comments)}
        </span>
        <span className="flex items-center gap-1">
          <Eye size={13} strokeWidth={1.75} />
          {formatCount(post.views)}
        </span>
      </div>
    </button>
  )
}

// ── 帖子卡片骨架屏 ──────────────────────────────────────────

function PostCardSkeleton() {
  return (
    <div className="bg-surface rounded-2xl border border-line/40 p-4">
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="w-8 h-8 rounded-full skeleton" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-20 skeleton" />
          <div className="h-2.5 w-12 skeleton" />
        </div>
        <div className="h-4 w-10 skeleton" />
      </div>
      <div className="h-4 w-3/4 skeleton mb-2" />
      <div className="h-3 w-full skeleton mb-1.5" />
      <div className="h-3 w-2/3 skeleton mb-2.5" />
      <div className="flex gap-4">
        <div className="h-3 w-10 skeleton" />
        <div className="h-3 w-10 skeleton" />
        <div className="h-3 w-10 skeleton" />
      </div>
    </div>
  )
}

// ── 发帖表单 ──────────────────────────────────────────

interface PostFormProps {
  communityId: string
  onSubmit: (data: { title: string; content: string; image?: string }) => { ok: boolean; error?: string }
}

function PostForm({ communityId: _communityId, onSubmit }: PostFormProps) {
  const [expanded, setExpanded] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [image, setImage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleToggle = () => {
    setExpanded(!expanded)
    if (!expanded) setError(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const result = onSubmit({
      title,
      content,
      image: image.trim() || undefined,
    })

    setSubmitting(false)

    if (result.ok) {
      // 成功：清空表单并收起
      setTitle('')
      setContent('')
      setImage('')
      setError(null)
      setExpanded(false)
    } else {
      // 失败：保留输入，显示错误
      setError(result.error || '发布失败，请稍后重试')
    }
  }

  return (
    <div className="bg-surface rounded-2xl border border-line/40 overflow-hidden">
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-paper-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #EC4899, #F43F5E)' }}
          >
            <PenLine size={15} className="text-white" />
          </div>
          <span className="text-[14px] font-semibold text-ink-800">
            {expanded ? '收起发帖' : '发布新帖'}
          </span>
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-ink-400" />
        ) : (
          <ChevronDown size={16} className="text-ink-400" />
        )}
      </button>

      {expanded && (
        <form onSubmit={handleSubmit} className="px-4 pb-4 space-y-3 animate-fade-in-up">
          {/* 标题 */}
          <div>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="标题（必填，最多 80 字）"
              maxLength={80}
              className="w-full px-3 py-2 text-[14px] bg-paper-50 rounded-xl border border-line/40 focus:bg-surface focus:border-pink-200 transition-all placeholder:text-ink-300 text-ink-800"
            />
            <div className="text-right text-[11px] text-ink-300 mt-1">{title.length}/80</div>
          </div>

          {/* 内容 */}
          <div>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="分享你的观点、经历或信息（必填）"
              rows={4}
              className="w-full px-3 py-2 text-[14px] bg-paper-50 rounded-xl border border-line/40 focus:bg-surface focus:border-pink-200 transition-all placeholder:text-ink-300 text-ink-800 resize-none"
            />
          </div>

          {/* 图片 URL */}
          <div>
            <div className="relative">
              <ImageIcon
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300 pointer-events-none"
              />
              <input
                type="text"
                value={image}
                onChange={e => setImage(e.target.value)}
                placeholder="图片 URL（可选，留空将自动生成）"
                className="w-full pl-9 pr-3 py-2 text-[13px] bg-paper-50 rounded-xl border border-line/40 focus:bg-surface focus:border-pink-200 transition-all placeholder:text-ink-300 text-ink-800"
              />
            </div>
            <p className="text-[11px] text-ink-300 mt-1">留空将自动使用 picsum 占位图</p>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-xl">
              <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
              <span className="text-[12px] text-red-700">{error}</span>
            </div>
          )}

          {/* 提交按钮 */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !title.trim() || !content.trim()}
              className="px-5 py-2 text-[13px] font-semibold text-white rounded-xl shadow-sm transition-all press-pop disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #EC4899, #F43F5E)' }}
            >
              {submitting ? '发布中…' : '发布'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

// ── 单层评论 ──────────────────────────────────────────

interface CommentItemProps {
  comment: CommunityComment
  postId: string
  onLike: (postId: string, commentId: string) => void
}

function CommentItem({ comment, postId, onLike }: CommentItemProps) {
  return (
    <div className="flex gap-3 py-3">
      <img
        src={comment.userAvatar}
        alt={comment.userNickname}
        loading="lazy"
        className="w-8 h-8 rounded-full bg-paper-100 ring-1 ring-line/30 flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[13px] font-semibold text-ink-800">{comment.userNickname}</span>
          <span className="text-[11px] text-ink-400">{formatTime(comment.createdAt)}</span>
        </div>
        <p className="text-[14px] text-ink-700 leading-relaxed mb-1.5 whitespace-pre-line break-words">
          {comment.content}
        </p>
        <button
          onClick={() => onLike(postId, comment.id)}
          className={`flex items-center gap-1 text-[12px] font-medium transition-colors ${
            comment.isLiked
              ? 'text-seal'
              : 'text-ink-400 hover:text-seal'
          }`}
        >
          <Heart size={12} className={comment.isLiked ? 'fill-seal' : ''} strokeWidth={1.75} />
          {formatCount(comment.likes)}
        </button>
      </div>
    </div>
  )
}

interface CommentListProps {
  postId: string
}

function CommentList({ postId }: CommentListProps) {
  const {
    commentsByPost,
    commentsLoading,
    loadComments,
    addComment,
    toggleCommentLike,
  } = useCommunityStore()

  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    loadComments(postId)
  }, [postId, loadComments])

  const comments = commentsByPost[postId] || []

  const handleSubmit = () => {
    setError(null)
    const result = addComment(postId, input)
    if (result.ok) {
      setInput('')
      inputRef.current?.focus()
    } else {
      setError(result.error || '评论失败')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div>
      {/* 评论列表 */}
      {commentsLoading ? (
        <div className="space-y-3 py-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3 py-2">
              <div className="w-8 h-8 rounded-full skeleton flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-20 skeleton" />
                <div className="h-3 w-full skeleton" />
                <div className="h-3 w-2/3 skeleton" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="py-8 text-center">
          <MessageSquare size={28} className="text-ink-200 mx-auto mb-2" />
          <p className="text-[13px] text-ink-400">还没有评论，来说点什么吧</p>
        </div>
      ) : (
        <div className="divide-y divide-line/30">
          {comments.map(c => (
            <CommentItem
              key={c.id}
              comment={c}
              postId={postId}
              onLike={toggleCommentLike}
            />
          ))}
        </div>
      )}

      {/* 评论输入 */}
      <div className="mt-4 pt-4 border-t border-line/30">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="说点什么…（Ctrl/⌘ + Enter 发送）"
            rows={2}
            maxLength={500}
            className="w-full px-3 py-2 pr-12 text-[14px] bg-paper-50 rounded-xl border border-line/40 focus:bg-surface focus:border-pink-200 transition-all placeholder:text-ink-300 text-ink-800 resize-none"
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim()}
            className="absolute right-2 bottom-2 w-8 h-8 rounded-lg flex items-center justify-center text-white transition-all press-pop disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #EC4899, #F43F5E)' }}
          >
            <Send size={14} />
          </button>
        </div>
        {error && (
          <div className="flex items-center gap-1.5 mt-2 text-[12px] text-red-600">
            <AlertCircle size={12} />
            {error}
          </div>
        )}
        <div className="text-right text-[11px] text-ink-300 mt-1">{input.length}/500</div>
      </div>
    </div>
  )
}

// ── 帖子详情弹窗 ──────────────────────────────────────────

interface PostDetailModalProps {
  post: CommunitySeedPost | null
  onClose: () => void
}

function PostDetailModal({ post, onClose }: PostDetailModalProps) {
  const [visible, setVisible] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (post) {
      setLiked(false)
      setLikeCount(post.likes)
      setVisible(false)
      scrollRef.current?.scrollTo(0, 0)
      const raf = requestAnimationFrame(() => setVisible(true))
      document.documentElement.style.overflow = 'hidden'
      return () => {
        cancelAnimationFrame(raf)
        document.documentElement.style.overflow = ''
      }
    }
  }, [post])

  const handleClose = useCallback(() => {
    setVisible(false)
    setTimeout(() => onClose(), 200)
  }, [onClose])

  useEffect(() => {
    if (!post) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [post, handleClose])

  if (!post) return null

  const badge = TYPE_BADGE[post.type] || TYPE_BADGE.normal

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 transition-all duration-200 ease-out"
        style={{
          background: visible ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0)',
          backdropFilter: visible ? 'blur(6px)' : 'blur(0px)',
          WebkitBackdropFilter: visible ? 'blur(6px)' : 'blur(0px)',
        }}
        onClick={handleClose}
      />

      {/* 弹窗卡片 */}
      <div
        className="relative bg-surface shadow-2xl flex flex-col overflow-hidden"
        style={{
          width: 'min(680px, 100%)',
          maxHeight: 'calc(100vh - 32px)',
          borderRadius: '16px',
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(8px)',
          transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 1,
        }}
      >
        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-all backdrop-blur-sm"
          style={{ opacity: visible ? 1 : 0, transition: 'opacity 200ms ease 100ms' }}
        >
          <X size={16} />
        </button>

        {/* 可滚动内容 */}
        <div ref={scrollRef} className="overflow-y-auto">
          {/* 帖子图片 */}
          {post.image && (
            <div className="relative w-full h-56 overflow-hidden bg-paper-100 flex-shrink-0">
              <img
                src={post.image}
                alt={post.title}
                className="w-full h-full object-cover"
              />
              <span className={`absolute top-3 left-3 px-2.5 py-1 text-[11px] font-bold rounded-md ${badge.bg} ${badge.text} backdrop-blur-md`}>
                {badge.label}
              </span>
            </div>
          )}

          <div className="px-5 py-4">
            {/* 标题 */}
            <h1 className="text-[20px] font-bold text-ink-900 leading-snug mb-3 pr-8">
              {post.title}
            </h1>

            {/* 作者信息 */}
            <div className="flex items-center gap-3 mb-4">
              <img
                src={post.authorAvatar}
                alt={post.authorName}
                className="w-9 h-9 rounded-full bg-paper-100 ring-1 ring-line/40"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-ink-900 truncate">{post.authorName}</p>
                <p className="text-[11px] text-ink-400">{formatTime(post.createdAt)}</p>
              </div>
              {!post.image && (
                <span className={`px-2 py-0.5 text-[11px] font-bold rounded-md ${badge.bg} ${badge.text}`}>
                  {badge.label}
                </span>
              )}
            </div>

            {/* 正文 */}
            <div className="text-[15px] text-ink-800 leading-[1.75] space-y-3 mb-4 whitespace-pre-line break-words">
              {post.content}
            </div>

            {/* 标签 */}
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {post.tags.map(t => (
                  <span
                    key={t}
                    className="text-[12px] text-pink-600 bg-pink-50 px-2 py-0.5 rounded-md font-medium"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {/* 互动栏 */}
            <div className="flex items-center gap-5 py-3 border-t border-line/30 text-[13px]">
              <button
                onClick={() => {
                  setLiked(!liked)
                  setLikeCount(prev => liked ? prev - 1 : prev + 1)
                }}
                className={`flex items-center gap-1.5 font-semibold transition-all press-pop ${
                  liked ? 'text-seal' : 'text-ink-500 hover:text-seal'
                }`}
              >
                <Heart size={17} className={liked ? 'fill-seal' : ''} />
                {formatCount(likeCount)}
              </button>
              <span className="flex items-center gap-1.5 text-ink-500 font-semibold">
                <MessageSquare size={17} />
                {formatCount(post.comments)}
              </span>
              <span className="flex items-center gap-1.5 text-ink-500 font-semibold">
                <Eye size={17} />
                {formatCount(post.views)}
              </span>
            </div>

            {/* 评论区 */}
            <div className="pt-3 border-t border-line/30">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare size={16} className="text-ink-500" />
                <h2 className="text-[14px] font-bold text-ink-900">评论</h2>
                <span className="text-[12px] text-ink-400">单层 · 3 秒防刷</span>
              </div>
              <CommentList postId={post.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}

// ── 主组件 ──────────────────────────────────────────

export default function CommunityDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isMobile } = usePlatform()

  const {
    getCommunity,
    postsLoading,
    postsError,
    loadPosts,
    createPost,
  } = useCommunityStore()

  // 订阅当前社区的帖子列表（响应式更新）
  const rawPosts = useCommunityStore(s => (id ? s.postsByCommunity[id] : undefined) || [])

  const [activeTab, setActiveTab] = useState<CommunityPostTab>('hot')
  const [activePostId, setActivePostId] = useState<string | null>(null)

  useEffect(() => {
    if (id) loadPosts(id)
  }, [id, loadPosts])

  // 滚动到顶部
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id])

  const community = useMemo(() => {
    if (!id) return undefined
    return getCommunity(id)
  }, [id, getCommunity])

  // 按 Tab 排序帖子
  const posts = useMemo(() => {
    if (activeTab === 'featured') {
      return rawPosts
        .filter(p => p.type === 'hot')
        .sort((a, b) => getCommunityPostHotScore(b) - getCommunityPostHotScore(a))
    }
    const sorted = [...rawPosts]
    if (activeTab === 'hot') {
      sorted.sort((a, b) => getCommunityPostHotScore(b) - getCommunityPostHotScore(a))
    } else if (activeTab === 'latest') {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }
    return sorted
  }, [rawPosts, activeTab])

  const activePost = useMemo(() => {
    if (!activePostId) return null
    return posts.find(p => p.id === activePostId) || null
  }, [activePostId, posts])

  // 注入页面上下文给小薇：优先用打开的帖子，否则回退到社区信息
  usePageContext(
    activePost
      ? { type: 'community', title: activePost.title, content: activePost.content }
      : community
        ? { type: 'community', title: community.name, content: community.description }
        : null
  )

  if (!id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-paper-50">
        <AlertCircle size={32} className="text-ink-300 mb-3" />
        <p className="text-[14px] text-ink-500 mb-4">无效的社区链接</p>
        <button
          onClick={() => navigate('/community')}
          className="px-4 py-2 bg-seal text-white rounded-xl text-[13px] font-medium press-pop"
        >
          返回社区列表
        </button>
      </div>
    )
  }

  if (!community) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-paper-50">
        <div className="w-14 h-14 rounded-xl bg-paper-100 flex items-center justify-center mb-4">
          <MessageSquare size={26} className="text-ink-400" />
        </div>
        <p className="text-[14px] text-ink-500 mb-4 font-medium">社区不存在或已被删除</p>
        <button
          onClick={() => navigate('/community')}
          className="px-4 py-2 bg-seal text-white rounded-xl text-[13px] font-medium shadow-seal-glow press-pop"
        >
          返回社区列表
        </button>
      </div>
    )
  }

  const handleOpenPost = (postId: string) => {
    setActivePostId(postId)
  }

  const handleClosePost = () => {
    setActivePostId(null)
  }

  const handleCreatePost = (data: { title: string; content: string; image?: string }) => {
    return createPost({
      communityId: id,
      title: data.title,
      content: data.content,
      image: data.image,
    })
  }

  const handleRetryLoad = () => {
    useCommunityStore.setState((state) => {
      const next = { ...state.postsByCommunity }
      delete next[id]
      return { postsByCommunity: next, postsError: null }
    })
    loadPosts(id)
  }

  // 帖子列表内容
  const renderPostList = () => {
    if (postsLoading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <PostCardSkeleton key={i} />
          ))}
        </div>
      )
    }

    if (postsError) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-6">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
            <AlertCircle size={22} className="text-red-500" />
          </div>
          <p className="text-[14px] font-semibold text-ink-800 mb-1">加载帖子失败</p>
          <p className="text-[12px] text-ink-500 mb-3 text-center">{postsError}</p>
          <button
            onClick={handleRetryLoad}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-seal text-white rounded-lg text-[12px] font-medium press-pop"
          >
            <RefreshCw size={13} />
            重试
          </button>
        </div>
      )
    }

    if (posts.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-6">
          <div className="w-12 h-12 rounded-full bg-paper-100 flex items-center justify-center mb-3">
            <MessageSquare size={22} className="text-ink-300" />
          </div>
          <p className="text-[14px] font-semibold text-ink-800 mb-1">
            {activeTab === 'featured' ? '该社区暂无精华帖' : '该社区暂无帖子'}
          </p>
          <p className="text-[12px] text-ink-500">试试发布第一篇帖子吧</p>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {posts.map((post, i) => (
          <PostCard
            key={post.id}
            post={post}
            index={i}
            onOpen={handleOpenPost}
          />
        ))}
      </div>
    )
  }

  return (
    <div className={`min-h-full bg-paper-50 ${isMobile ? 'pb-[64px]' : ''}`}>
      {/* ── 顶部导航 ── */}
      <div className="sticky top-0 z-10 glass border-b border-line/40">
        <div className={`mx-auto ${isMobile ? 'px-4 h-12' : 'max-w-3xl px-6 h-14'} flex items-center`}>
          <button
            onClick={() => navigate('/community')}
            className="flex items-center gap-1.5 text-ink-700 text-[14px] font-medium hover:text-seal transition-colors press-pop"
          >
            <ArrowLeft size={18} />
            <span>社区</span>
          </button>
          <div className="flex-1 text-center">
            <span className="text-[14px] font-semibold text-ink-800 truncate inline-block max-w-[200px] align-middle">
              {community.name}
            </span>
          </div>
          <div className="w-[60px]" />
        </div>
      </div>

      {/* ── 社区信息卡片 ── */}
      <div className={`mx-auto ${isMobile ? 'px-4 pt-4' : 'max-w-3xl px-6 pt-6'}`}>
        <div
          className="relative rounded-2xl overflow-hidden border border-line/40 bg-surface shadow-sm"
        >
          {/* 封面 */}
          <div className="relative h-20 bg-paper-100">
            <img
              src={community.coverImage}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
            <span
              className="absolute top-3 right-3 px-2.5 py-1 text-[11px] font-bold text-white rounded-md backdrop-blur-sm"
              style={{ background: 'linear-gradient(135deg, #EC4899, #F43F5E)' }}
            >
              {community.category}
            </span>
          </div>

          {/* 内容 */}
          <div className="px-5 pb-4">
            <div className="flex items-end gap-3 -mt-7 mb-2">
              <div className="w-14 h-14 rounded-2xl bg-surface border-2 border-surface shadow-card flex items-center justify-center text-[28px]">
                {community.icon}
              </div>
              <div className="flex-1 min-w-0 pb-1">
                <h1 className="text-[20px] font-bold text-ink-900 leading-tight">{community.name}</h1>
              </div>
            </div>

            <p className="text-[13px] text-ink-600 leading-relaxed mb-3">
              {community.description}
            </p>

            <div className="flex items-center gap-4 text-[12px]">
              <span className="flex items-center gap-1 text-ink-500">
                <Users size={13} strokeWidth={1.75} />
                <span className="font-semibold text-ink-800">{formatCount(community.memberCount)}</span>
                成员
              </span>
              <span className="flex items-center gap-1 text-ink-500">
                <MessageSquare size={13} strokeWidth={1.75} />
                <span className="font-semibold text-ink-800">{formatCount(community.postCount)}</span>
                帖子
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 发帖表单 ── */}
      <div className={`mx-auto ${isMobile ? 'px-4 mt-3' : 'max-w-3xl px-6 mt-3'}`}>
        <PostForm communityId={id} onSubmit={handleCreatePost} />
      </div>

      {/* ── Tabs ── */}
      <div className={`mx-auto ${isMobile ? 'px-4 mt-4' : 'max-w-3xl px-6 mt-4'}`}>
        <div className="flex items-center gap-2 border-b border-line/40">
          {POST_TABS.map(tab => {
            const isActive = activeTab === tab.key
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex items-center gap-1.5 px-3 py-2.5 text-[14px] font-semibold transition-colors ${
                  isActive
                    ? 'text-ink-900'
                    : 'text-ink-400 hover:text-ink-600'
                }`}
              >
                <Icon size={15} strokeWidth={isActive ? 2.25 : 1.75} />
                {tab.label}
                {isActive && (
                  <span
                    className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full"
                    style={{ background: 'linear-gradient(135deg, #EC4899, #F43F5E)' }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 帖子列表 ── */}
      <div className={`mx-auto ${isMobile ? 'px-4 mt-3' : 'max-w-3xl px-6 mt-3'}`}>
        {renderPostList()}
      </div>

      {/* ── 帖子详情弹窗 ── */}
      <PostDetailModal
        key={activePostId || 'closed'}
        post={activePost}
        onClose={handleClosePost}
      />
    </div>
  )
}
