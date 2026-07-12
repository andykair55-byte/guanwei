import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MessageCircle,
  Heart,
  Bookmark,
  Share2,
  Filter,
  Lightbulb,
  MoreHorizontal,
  PenLine,
  X,
  MessageSquare,
  Flame,
  HandHeart,
  HelpCircle,
} from 'lucide-react'
import {
  getCommunityPosts,
  getFeaturedPosts,
  getFeaturedPostContent,
  type CommunityPost,
  type CommunityPostType,
} from '../services/mockData'
import CommentSection from '../components/CommentSection'

const TYPE_CONFIG: Record<CommunityPostType, { label: string; color: string; bgColor: string }> = {
  hot: { label: '热帖', color: '#EF4444', bgColor: '#FEE2E2' },
  normal: { label: '讨论', color: '#6366F1', bgColor: '#EEF2FF' },
  charity: { label: '公益', color: '#10B981', bgColor: '#D1FAE5' },
  help: { label: '求助', color: '#F59E0B', bgColor: '#FEF3C7' },
}

const typeTagConfig = {
  hot: { icon: Flame, label: '热帖', bg: 'bg-red-500/90', text: 'text-white' },
  charity: { icon: HandHeart, label: '公益', bg: 'bg-green-500/90', text: 'text-white' },
  help: { icon: HelpCircle, label: '求助', bg: 'bg-amber-500/90', text: 'text-white' },
  normal: null,
}

const MAIN_TABS = [
  { key: 'all', label: '推荐', filter: undefined },
  { key: 'hot', label: '热帖', filter: '热帖' },
  { key: 'help', label: '求助', filter: '求助' },
  { key: 'announce', label: '公告', filter: undefined },
]

const SUB_TABS = [
  { key: 'all', label: '全部' },
  { key: 'latest', label: '最新' },
  { key: 'popular', label: '热门' },
]

function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
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

interface PostDisplayData {
  id: string
  type: CommunityPostType
  authorName: string
  authorAvatar: string
  title: string
  summary: string
  thumbnail: string
  comments: number
  likes: number
  collects: number
  createdAt: string
  content: string
}

// ─── PostItem 组件 ───────────────────────────────────────────

interface PostItemProps {
  post: PostDisplayData
  index: number
  onOpen: (postId: string, element: HTMLElement) => void
  itemRef: (el: HTMLElement | null) => void
}

function PostItem({ post, index, onOpen, itemRef }: PostItemProps) {
  const [liked, setLiked] = useState(false)
  const [collected, setCollected] = useState(false)
  const [likeCount, setLikeCount] = useState(post.likes)
  const [collectCount, setCollectCount] = useState(post.collects)
  const typeConfig = TYPE_CONFIG[post.type]

  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    const target = e.currentTarget
    onOpen(post.id, target)
  }

  return (
    <article
      ref={itemRef}
      className="px-8 py-5 hover:bg-gray-50/70 transition-colors cursor-pointer border-b border-gray-100/70 animate-fade-in-up group"
      style={{ animationDelay: `${index * 30}ms` }}
      onClick={handleClick}
    >
      <div className="flex gap-4">
        {/* 左侧头像 */}
        <img
          src={post.authorAvatar}
          alt={post.authorName}
          className="w-11 h-11 rounded-full flex-shrink-0 object-cover bg-gray-100 mt-0.5 ring-1 ring-gray-100"
        />

        {/* 中间内容区 */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* 作者行 */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[15px] font-semibold text-gray-800">{post.authorName}</span>
            <span
              className="text-[11px] font-medium px-2 py-0.5 rounded-md"
              style={{ backgroundColor: typeConfig.bgColor, color: typeConfig.color }}
            >
              {typeConfig.label}
            </span>
            <span className="text-[12px] text-gray-400">{formatTime(post.createdAt)}</span>
          </div>

          {/* 标题 */}
          <h3 className="text-[17px] font-semibold text-gray-900 leading-snug mb-1.5 line-clamp-1 group-hover:text-red-600 transition-colors">
            {post.title}
          </h3>

          {/* 摘要 */}
          <p className="text-[14px] text-gray-500 leading-relaxed mb-3 line-clamp-2">
            {post.summary}
          </p>

          {/* 互动栏 */}
          <div className="flex items-center gap-7 text-[13px] text-gray-400 mt-auto">
            <button
              onClick={(e) => { e.stopPropagation() }}
              className="flex items-center gap-1.5 hover:text-gray-600 transition-colors"
            >
              <MessageCircle size={16} strokeWidth={1.75} />
              <span>{formatCount(post.comments)}</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setLiked(!liked)
                setLikeCount(liked ? likeCount - 1 : likeCount + 1)
              }}
              className={`flex items-center gap-1.5 transition-colors ${liked ? 'text-red-500' : 'hover:text-red-500'}`}
            >
              <Heart size={16} strokeWidth={1.75} className={liked ? 'fill-current' : ''} />
              <span>{formatCount(likeCount)}</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setCollected(!collected)
                setCollectCount(collected ? collectCount - 1 : collectCount + 1)
              }}
              className={`flex items-center gap-1.5 transition-colors ${collected ? 'text-amber-500' : 'hover:text-amber-500'}`}
            >
              <Bookmark size={16} strokeWidth={1.75} className={collected ? 'fill-current' : ''} />
              <span>{formatCount(collectCount)}</span>
            </button>
            <button
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 hover:text-gray-600 transition-colors"
            >
              <Share2 size={16} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* 右侧缩略图 */}
        <div className="flex-shrink-0 w-[140px] h-[100px] rounded-xl overflow-hidden bg-gray-100 mt-0.5 shadow-sm">
          <img
            src={post.thumbnail}
            alt=""
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      </div>
    </article>
  )
}

// ─── Banner 组件 ─────────────────────────────────────────────

function BannerIllustration() {
  return (
    <div className="relative w-52 h-36 flex items-center justify-center">
      {/* 底部卡片 */}
      <div className="absolute bottom-2 right-0 w-44 h-12 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm flex items-center px-3.5 gap-2.5">
        <div className="w-4 h-4 rounded-full bg-indigo-400/60" />
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="w-2/3 h-full bg-pink-300/70 rounded-full" />
        </div>
        <div className="w-2 h-3.5 rounded-sm bg-violet-300/60" />
      </div>
      {/* 左侧大对话气泡 */}
      <div className="absolute left-0 top-6 w-20 h-14 bg-gradient-to-br from-indigo-300/80 to-purple-300/80 rounded-2xl flex items-center justify-center shadow-md">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-white/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-white/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-white/70" />
        </div>
      </div>
      {/* 右侧小对话气泡 */}
      <div className="absolute right-2 top-2 w-14 h-11 bg-gradient-to-br from-violet-400/70 to-purple-400/70 rounded-2xl flex items-center justify-center shadow-md">
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-white/70" />
          <div className="w-2 h-2 rounded-full bg-white/70" />
          <div className="w-2 h-2 rounded-full bg-white/70" />
        </div>
      </div>
      {/* 中间灯泡 */}
      <div className="relative z-10 w-20 h-20 rounded-full bg-gradient-to-br from-rose-400 to-red-400 flex items-center justify-center shadow-lg shadow-rose-200/60">
        <Lightbulb size={34} className="text-white" strokeWidth={1.8} fill="white" fillOpacity={0.1} />
      </div>
      {/* 灯泡光晕 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full bg-rose-200/40 blur-xl pointer-events-none" />
      {/* 背景装饰光斑 */}
      <div className="absolute -top-2 -right-2 w-14 h-14 rounded-full bg-violet-200/50 blur-lg pointer-events-none" />
    </div>
  )
}

// ─── PostDetailModal（FLIP 放大动画） ────────────────────────

interface PostDetailModalProps {
  post: PostDisplayData | null
  sourceRect: DOMRect | null
  onClose: () => void
}

function PostDetailModal({ post, sourceRect, onClose }: PostDetailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<'initial' | 'animate' | 'final'>('initial')
  const [liked, setLiked] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)

  // 重置状态并启动 FLIP 动画
  useEffect(() => {
    if (!post || !sourceRect) return
    setPhase('initial')
    setLiked(false)
    setBookmarked(false)
    setLikeCount(post.likes)

    // 强制浏览器渲染初始状态，然后触发动画
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        setPhase('animate')
        // 动画结束后设置为 final 状态（用于交互优化）
        setTimeout(() => setPhase('final'), 320)
      })
      return () => cancelAnimationFrame(raf2)
    })
    return () => cancelAnimationFrame(raf1)
  }, [post, sourceRect])

  // ESC 关闭
  useEffect(() => {
    if (!post) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [post])

  const handleClose = useCallback(() => {
    setPhase('initial')
    setTimeout(() => {
      onClose()
    }, 300)
  }, [onClose])

  if (!post || !sourceRect) return null

  const tag = typeTagConfig[post.type]
  const TagIcon = tag?.icon
  const showVerificationNote = post.type === 'help'

  // 计算最终位置：居中，宽度约65%视口宽度
  const finalWidth = Math.min(720, window.innerWidth * 0.65)
  const finalLeft = (window.innerWidth - finalWidth) / 2
  const finalTop = 40
  const finalHeight = window.innerHeight - 80

  // 初始样式（First）
  const initialStyle: React.CSSProperties = {
    left: sourceRect.left,
    top: sourceRect.top,
    width: sourceRect.width,
    height: sourceRect.height,
    borderRadius: '0px',
    opacity: 1,
  }

  // 最终样式（Last）
  const animateStyle: React.CSSProperties = {
    left: finalLeft,
    top: finalTop,
    width: finalWidth,
    height: finalHeight,
    borderRadius: '16px',
    opacity: 1,
  }

  const currentStyle = phase === 'initial' ? initialStyle : animateStyle
  const showContent = phase !== 'initial'

  return (
    <div
      className="fixed inset-0 z-50"
      style={{ pointerEvents: 'auto' }}
    >
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        style={{
          opacity: phase === 'initial' ? 0 : 1,
          transition: 'opacity 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onClick={handleClose}
      />

      {/* 放大的帖子卡片（FLIP 动画主体） */}
      <div
        ref={modalRef}
        className="absolute overflow-hidden bg-white shadow-2xl"
        style={{
          ...currentStyle,
          transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          transformOrigin: 'top left',
        }}
      >
        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-all backdrop-blur-sm"
          style={{ opacity: showContent ? 1 : 0, transition: 'opacity 200ms ease 100ms' }}
        >
          <X size={18} />
        </button>

        {/* 详情内容 */}
        <div
          className="w-full h-full overflow-y-auto"
          style={{ opacity: showContent ? 1 : 0, transition: 'opacity 200ms ease 50ms' }}
        >
          {/* 帖子图片 */}
          <div className="relative w-full h-64 overflow-hidden bg-gray-100 flex-shrink-0">
            <img
              src={post.thumbnail}
              alt={post.title}
              className="w-full h-full object-cover"
            />
            {tag && TagIcon && (
              <span className={`absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold rounded-lg ${tag.bg} ${tag.text} backdrop-blur-md`}>
                <TagIcon size={14} />
                {tag.label}
              </span>
            )}
          </div>

          <div className="px-6 py-5">
            {/* 标题 */}
            <h1 className="text-[22px] font-bold text-gray-900 leading-snug mb-4">
              {post.title}
            </h1>

            {/* 作者信息 */}
            <div className="flex items-center gap-3 mb-5">
              <img
                src={post.authorAvatar}
                alt={post.authorName}
                className="w-11 h-11 rounded-full bg-gray-100 ring-1 ring-gray-200"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-gray-900 truncate">{post.authorName}</p>
                <p className="text-[12px] text-gray-400">{formatTime(post.createdAt)}</p>
              </div>
              <button className="px-4 py-2 rounded-full bg-red-500 text-white text-[13px] font-semibold hover:bg-red-600 transition-colors">
                关注
              </button>
            </div>

            {/* 正文 */}
            <div className="text-[15px] text-gray-700 leading-[1.8] space-y-3 mb-5 whitespace-pre-line">
              {post.content}
            </div>

            {/* 话题标签 */}
            <div className="flex flex-wrap gap-2 mb-5">
              <span className="text-[13px] text-red-500 bg-red-50 px-3 py-1 rounded-lg font-medium">
                #{TYPE_CONFIG[post.type].label}
              </span>
            </div>

            {/* 互动栏 */}
            <div className="py-4 border-t border-gray-100 flex items-center gap-6">
              <button
                onClick={() => {
                  setLiked(!liked)
                  setLikeCount(prev => liked ? prev - 1 : prev + 1)
                }}
                className={`flex items-center gap-2 text-[14px] font-semibold transition-all ${
                  liked ? 'text-red-500' : 'text-gray-600 hover:text-red-500'
                }`}
              >
                <Heart size={20} className={liked ? 'fill-current' : ''} />
                {formatCount(likeCount)}
              </button>
              <button className="flex items-center gap-2 text-[14px] font-semibold text-gray-600 hover:text-gray-900 transition-colors">
                <MessageSquare size={20} />
                {formatCount(post.comments)}
              </button>
              <button
                onClick={() => setBookmarked(!bookmarked)}
                className={`flex items-center gap-2 text-[14px] font-semibold transition-all ml-auto ${
                  bookmarked ? 'text-amber-500' : 'text-gray-600 hover:text-amber-500'
                }`}
              >
                <Bookmark size={20} className={bookmarked ? 'fill-current' : ''} />
                收藏
              </button>
            </div>

            {/* 评论区 */}
            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare size={18} className="text-gray-500" />
                <h2 className="text-[15px] font-bold text-gray-900">评论区</h2>
                <span className="text-[13px] text-gray-400">共 {formatCount(post.comments)} 条</span>
              </div>
              <div className="bg-gray-50 rounded-xl border border-gray-100">
                <CommentSection melonId={post.id} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── 主组件 ─────────────────────────────────────────────────

export default function CommunityPage() {
  const navigate = useNavigate()
  const [selectedMainTab, setSelectedMainTab] = useState('all')
  const [selectedSubTab, setSelectedSubTab] = useState('all')
  const [page, setPage] = useState(0)
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [initialLoading, setInitialLoading] = useState(true)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const postRefs = useRef<Map<string, HTMLElement>>(new Map())

  // FLIP 弹窗状态
  const [modalPost, setModalPost] = useState<PostDisplayData | null>(null)
  const [sourceRect, setSourceRect] = useState<DOMRect | null>(null)

  // 初始化加载
  useEffect(() => {
    setInitialLoading(true)
    setPage(0)
    setHasMore(true)
    // 模拟加载延迟
    const timer = setTimeout(() => {
      const result = getCommunityPosts(undefined, 0, 12)
      setPosts(result.posts)
      setHasMore(result.hasMore)
      setInitialLoading(false)
    }, 200)
    return () => clearTimeout(timer)
  }, [selectedMainTab])

  // 计算展示数据
  const displayPosts: PostDisplayData[] = useMemo(() => {
    let source: CommunityPost[] = []

    if (selectedMainTab === 'all') {
      // 推荐 tab：前3条是硬编码的设计图内容，后面是 mock 数据
      const featured = getFeaturedPosts()
      const featuredContents = featured.map(p => {
        const content = getFeaturedPostContent(p.id)
        return {
          id: p.id,
          type: p.type,
          authorName: p.authorName,
          authorAvatar: p.authorAvatar,
          title: p.title,
          summary: p.title.length > 0 ? `${p.title.slice(0, 50)}...` : '',
          thumbnail: p.image,
          comments: content?.comments || Math.floor(p.likes * 0.3),
          likes: p.likes,
          collects: content?.collects || Math.floor(p.likes * 0.6),
          createdAt: p.createdAt,
          content: content?.content || p.title,
        }
      })

      // 从 mock 数据中补充（跳过前3条避免重复）
      const rest = posts.slice(3).map(post => ({
        id: post.id,
        type: post.type,
        authorName: post.authorName,
        authorAvatar: post.authorAvatar,
        title: post.title,
        summary: `${post.title.slice(0, 60)}...`,
        thumbnail: post.image,
        comments: Math.floor(post.likes * 0.3),
        likes: post.likes,
        collects: Math.floor(post.likes * 0.6),
        createdAt: post.createdAt,
        content: post.title + '\n\n' + '欢迎在下方评论区分享你的看法和经历，一起参与讨论。',
      }))

      source = [...featuredContents, ...rest] as PostDisplayData[]
    } else {
      // 其他 tab 使用过滤后的数据
      const tab = MAIN_TABS.find(t => t.key === selectedMainTab)
      let filtered = posts

      if (tab && tab.filter) {
        const typeMap: Record<string, CommunityPostType> = { '热帖': 'hot', '求助': 'help' }
        const targetType = typeMap[tab.filter]
        if (targetType) {
          filtered = posts.filter(p => p.type === targetType)
        }
      }

      // 公告 tab 特殊处理
      if (selectedMainTab === 'announce') {
        filtered = posts.filter(p => p.type === 'hot').slice(0, 5)
      }

      // 子 tab 排序
      const sorted = [...filtered]
      if (selectedSubTab === 'latest') {
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      } else if (selectedSubTab === 'popular') {
        sorted.sort((a, b) => b.likes - a.likes)
      }

      source = sorted.map(post => ({
        id: post.id,
        type: post.type,
        authorName: post.authorName,
        authorAvatar: post.authorAvatar,
        title: post.title,
        summary: `${post.title.slice(0, 60)}...`,
        thumbnail: post.image,
        comments: Math.floor(post.likes * 0.3),
        likes: post.likes,
        collects: Math.floor(post.likes * 0.6),
        createdAt: post.createdAt,
        content: post.title + '\n\n' + '欢迎在下方评论区分享你的看法和经历，一起参与讨论。',
      }))
    }

    return source
  }, [posts, selectedMainTab, selectedSubTab])

  // 加载更多
  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore || initialLoading) return

    setLoadingMore(true)
    setTimeout(() => {
      const nextPage = page + 1
      const result = getCommunityPosts(undefined, nextPage, 8)
      if (result.posts.length === 0) {
        setHasMore(false)
      } else {
        setPosts(prev => [...prev, ...result.posts])
        setPage(nextPage)
        setHasMore(result.hasMore)
      }
      setLoadingMore(false)
    }, 500)
  }, [page, loadingMore, hasMore, initialLoading])

  // IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore || initialLoading) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMore()
        }
      },
      { rootMargin: '300px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [handleLoadMore, hasMore, initialLoading])

  // 打开帖子详情（FLIP 动画）
  const handleOpenPost = useCallback((postId: string, element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    const post = displayPosts.find(p => p.id === postId)
    if (post) {
      setSourceRect(rect)
      setModalPost(post)
      // 禁止背景滚动
      document.body.style.overflow = 'hidden'
    }
  }, [displayPosts])

  // 关闭帖子详情
  const handleClosePost = useCallback(() => {
    setModalPost(null)
    setSourceRect(null)
    document.body.style.overflow = ''
  }, [])

  // 存储帖子 DOM 引用
  const setPostRef = useCallback((id: string) => (el: HTMLElement | null) => {
    if (el) {
      postRefs.current.set(id, el)
    } else {
      postRefs.current.delete(id)
    }
  }, [])

  return (
    <div className="min-h-full bg-white">
      {/* 顶部 Banner */}
      <div className="mx-6 mt-5 mb-4 rounded-2xl overflow-hidden relative"
        style={{
          background: 'linear-gradient(135deg, #FDF2F8 0%, #FAF5FF 30%, #F5F3FF 60%, #EEF2FF 100%)',
        }}
      >
        <div className="flex items-center justify-between px-8 py-6">
          {/* 左侧文字 */}
          <div className="flex flex-col gap-3">
            <h1 className="text-[26px] font-bold text-gray-900 leading-tight">
              连接观点·启迪思考
            </h1>
            <p className="text-[15px] text-gray-500 leading-relaxed">
              在观微社区，发现多元视角，探索深度思考
            </p>
            <button
              onClick={() => navigate('/publish')}
              className="mt-1 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-rose-400 to-pink-500 text-white text-[14px] font-medium shadow-sm shadow-rose-200/50 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all w-fit"
            >
              <PenLine size={16} strokeWidth={2} />
              <span>发布新观点</span>
            </button>
          </div>

          {/* 右侧插画 */}
          <BannerIllustration />
        </div>

        {/* 装饰性光斑 */}
        <div className="absolute -top-6 right-8 w-24 h-24 rounded-full bg-violet-200/30 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-20 h-20 rounded-full bg-pink-200/30 blur-xl pointer-events-none" />
      </div>

      {/* 主 Tab 导航 */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-md z-10 border-b border-gray-100">
        <div className="flex items-center gap-2 px-8 py-3 overflow-x-auto scrollbar-none">
          {MAIN_TABS.map((tab) => {
            const isActive = selectedMainTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setSelectedMainTab(tab.key)
                  setSelectedSubTab('all')
                }}
                className={`px-5 py-2 text-[14px] font-semibold rounded-full transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                  isActive
                    ? 'text-white shadow-md'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                style={isActive ? {
                  background: 'linear-gradient(135deg, #f472b6 0%, #a78bfa 100%)',
                  boxShadow: '0 2px 10px -2px rgba(167, 139, 250, 0.5)',
                } : {}}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* 子 Tab 筛选栏 */}
      <div className="flex items-center justify-between px-8 py-3 border-b border-gray-50">
        <div className="flex items-center gap-2">
          {SUB_TABS.map((tab) => {
            const isActive = selectedSubTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setSelectedSubTab(tab.key)}
                className={`px-3.5 py-1.5 text-[12px] font-semibold rounded-full transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                  isActive
                    ? 'text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                style={isActive ? {
                  background: 'linear-gradient(135deg, #fda4af 0%, #f472b6 100%)',
                  boxShadow: '0 1px 6px -1px rgba(244, 114, 182, 0.4)',
                } : {}}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <button className="flex items-center gap-1.5 text-[14px] text-gray-400 hover:text-gray-600 transition-colors">
          <Filter size={16} strokeWidth={1.5} />
          <span>筛选</span>
          <MoreHorizontal size={14} strokeWidth={1.5} />
        </button>
      </div>

      {/* 帖子列表 */}
      <div>
        {initialLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-7 h-7 border-2 border-gray-100 border-t-gray-400 rounded-full animate-spin" />
            <span className="text-[13px] text-gray-400">加载中...</span>
          </div>
        ) : (
          <>
            {displayPosts.map((post, i) => (
              <PostItem
                key={post.id}
                post={post}
                index={i}
                onOpen={handleOpenPost}
                itemRef={setPostRef(post.id)}
              />
            ))}
          </>
        )}

        {/* 加载更多 sentinel */}
        <div
          ref={sentinelRef}
          className="h-20 flex items-center justify-center"
        >
          {!initialLoading && (
            loadingMore ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-gray-100 border-t-gray-400 rounded-full animate-spin" />
                <span className="text-[13px] text-gray-400">加载中...</span>
              </div>
            ) : hasMore ? (
              <span className="text-[13px] text-gray-300">下拉加载更多</span>
            ) : (
              <span className="text-[13px] text-gray-300">— 已经到底了 —</span>
            )
          )}
        </div>
      </div>

      {/* FLIP 放大动画弹窗 */}
      <PostDetailModal
        post={modalPost}
        sourceRect={sourceRect}
        onClose={handleClosePost}
      />
    </div>
  )
}
