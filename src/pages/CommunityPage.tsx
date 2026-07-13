import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MessageCircle,
  Heart,
  Filter,
  MoreHorizontal,
  PenLine,
  Flame,
  HandHeart,
  HelpCircle,
  Lightbulb,
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

// ─── CommunityCard 组件（瓜田同款卡片网格） ───────────────────

interface CommunityCardProps {
  post: PostDisplayData
  index: number
  onClick: () => void
}

function CommunityCard({ post, index, onClick }: CommunityCardProps) {
  const typeConfig = TYPE_CONFIG[post.type]
  const tag = typeTagConfig[post.type]
  const TagIcon = tag?.icon

  const timeAgo = (() => {
    const diff = Date.now() - new Date(post.createdAt).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return '刚刚'
    if (hours < 24) return `${hours}小时前`
    return `${Math.floor(hours / 24)}天前`
  })()

  return (
    <article
      className="group cursor-pointer animate-fade-in-up"
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={onClick}
    >
      {/* 封面图 */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-100 mb-3 shadow-sm group-hover:shadow-md transition-shadow duration-300">
        <img
          src={post.thumbnail}
          alt={post.title}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          loading="lazy"
        />
        {/* 类型标签 - 左上角 */}
        {tag && TagIcon && (
          <span className={`absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold rounded-full ${tag.bg} ${tag.text} shadow-sm`}>
            <TagIcon size={10} />
            {tag.label}
          </span>
        )}
      </div>

      {/* 标题 */}
      <h3 className="text-[14px] font-semibold text-gray-800 leading-snug line-clamp-2 mb-2.5 group-hover:text-rose-500 transition-colors duration-200">
        {post.title}
      </h3>

      {/* 作者信息行 */}
      <div className="flex items-center gap-2 mb-3">
        <img
          src={post.authorAvatar}
          alt={post.authorName}
          className="w-5 h-5 rounded-full object-cover flex-shrink-0 bg-gray-100"
          loading="lazy"
        />
        <span className="text-[12px] text-gray-600 font-medium truncate">
          {post.authorName}
        </span>
        <span className="text-gray-300 text-[12px]">·</span>
        <span className="text-[12px] text-gray-400 flex-shrink-0">{timeAgo}</span>
      </div>

      {/* 底部数据行 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="flex items-center gap-1">
            <MessageCircle size={13} strokeWidth={2} />
            <span className="text-[12px]">{formatCount(post.comments)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart size={13} strokeWidth={2} />
            <span className="text-[12px]">{formatCount(post.likes)}</span>
          </div>
        </div>
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: typeConfig.bgColor, color: typeConfig.color }}
        >
          {typeConfig.label}
        </span>
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

  // 点击帖子跳转详情页
  const handleCardClick = useCallback((postId: string) => {
    navigate(`/community/${postId}`)
  }, [navigate])

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

      {/* 帖子列表 - 卡片网格 */}
      <div className="px-6 py-6 max-w-[1400px] mx-auto">
        {initialLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i}>
                <div className="aspect-[4/3] rounded-xl bg-gray-100 animate-pulse mb-3" />
                <div className="h-4 bg-gray-100 rounded animate-pulse w-4/5 mb-2.5" />
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded-full bg-gray-100 animate-pulse" />
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-20" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-3 bg-gray-100 rounded animate-pulse" />
                    <div className="w-8 h-3 bg-gray-100 rounded animate-pulse" />
                  </div>
                  <div className="w-12 h-4 bg-gray-100 rounded-full animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {displayPosts.map((post, i) => (
              <CommunityCard
                key={post.id}
                post={post}
                index={i}
                onClick={() => handleCardClick(post.id)}
              />
            ))}
          </div>
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
    </div>
  )
}
