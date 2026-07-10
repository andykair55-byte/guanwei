import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, Heart, Shield, HelpCircle, MessageSquare, Repeat2, Share } from 'lucide-react'
import { getCommunityPosts, type CommunityPost, type CommunityPostType } from '../services/mockData'

const TYPE_CONFIG: Record<CommunityPostType, { label: string; color: string }> = {
  hot: { label: '热帖', color: '#c0392b' },
  charity: { label: '公益', color: '#10b981' },
  help: { label: '求助', color: '#f59e0b' },
  normal: { label: '讨论', color: '#6366f1' },
}

const TABS = [
  { key: 'all', label: '推荐', filter: undefined },
  { key: 'hot', label: '热帖', filter: '热帖' },
  { key: 'help', label: '求助', filter: '求助' },
  { key: 'charity', label: '公益', filter: '公益' },
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

function PostItem({ post, index }: { post: CommunityPost; index: number }) {
  const navigate = useNavigate()
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(post.likes)
  const typeConfig = TYPE_CONFIG[post.type]

  return (
    <article
      className="px-6 py-5 hover:bg-paper-50 transition-colors cursor-pointer border-b border-ink-100/50 animate-fade-in-up"
      style={{ animationDelay: `${index * 30}ms` }}
      onClick={() => navigate(`/community/${post.id}`)}
    >
      <div className="flex gap-4">
        <img
          src={post.authorAvatar}
          alt={post.authorName}
          className="w-11 h-11 rounded-full flex-shrink-0 object-cover bg-ink-100"
        />

        <div className="flex-1 min-w-0">
          {/* 作者行 */}
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span className="text-[15px] font-bold text-ink-900">{post.authorName}</span>
            {post.type === 'hot' && <Shield size={13} className="text-seal-600" fill="#c0392b" fillOpacity={0.15} />}
            <span className="text-[13px] text-ink-400">{formatTime(post.createdAt)}</span>
          </div>

          {/* 标签行 */}
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            <span
              className="text-[11px] font-bold px-1.5 py-0.5 rounded-md"
              style={{ backgroundColor: `${typeConfig.color}12`, color: typeConfig.color }}
            >
              {typeConfig.label}
            </span>
            {post.tags.map(tag => (
              <span key={tag} className="text-[12px] text-ink-400">#{tag}</span>
            ))}
          </div>

          {/* 标题 */}
          <p className="text-[15px] text-ink-800 leading-relaxed mb-3 tracking-[0.01em] font-medium">
            {post.title}
          </p>

          {/* 图片 — 小缩略图，不占满宽 */}
          {post.image && (
            <img
              src={post.image}
              alt=""
              className="w-[120px] h-[80px] rounded-lg object-cover mb-3 flex-shrink-0"
              loading="lazy"
            />
          )}

          {/* 互动栏 */}
          <div className="flex items-center gap-8 text-[13px]">
            <button
              onClick={(e) => { e.stopPropagation() }}
              className="flex items-center gap-1.5 text-ink-400 hover:text-blue-500 transition-colors group"
            >
              <MessageCircle size={16} strokeWidth={1.75} className="group-hover:scale-110 transition-transform" />
              <span>{formatCount(Math.floor(post.likes * 0.3))}</span>
            </button>
            <button
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 text-ink-400 hover:text-emerald-500 transition-colors group"
            >
              <Repeat2 size={16} strokeWidth={1.75} className="group-hover:scale-110 transition-transform" />
              <span>{formatCount(Math.floor(post.likes * 0.15))}</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setLiked(!liked); setLikeCount(liked ? likeCount - 1 : likeCount + 1) }}
              className={`flex items-center gap-1.5 transition-colors group ${liked ? 'text-seal-600' : 'text-ink-400 hover:text-seal-600'}`}
            >
              <Heart size={16} strokeWidth={1.75} className={`group-hover:scale-110 transition-transform ${liked ? 'fill-current' : ''}`} />
              <span>{formatCount(likeCount)}</span>
            </button>
            <button
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 text-ink-400 hover:text-ink-900 transition-colors group"
            >
              <Share size={16} strokeWidth={1.75} className="group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

export default function CommunityPage() {
  const navigate = useNavigate()
  const [selectedTab, setSelectedTab] = useState('all')
  const [page, setPage] = useState(0)
  const [posts, setPosts] = useState<CommunityPost[]>(() => getCommunityPosts(undefined, 0, 12).posts)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const filteredPosts = useMemo(() => {
    const tab = TABS.find(t => t.key === selectedTab)
    if (!tab || !tab.filter) return posts
    // 本地过滤：只保留对应类型
    const typeMap: Record<string, CommunityPostType> = { '热帖': 'hot', '求助': 'help', '公益': 'charity' }
    const targetType = typeMap[tab.filter]
    return posts.filter(p => p.type === targetType)
  }, [posts, selectedTab])

  const handleLoadMore = useCallback(() => {
    if (loadingMore) return
    setLoadingMore(true)
    setTimeout(() => {
      const nextPage = page + 1
      const newBatch = getCommunityPosts(undefined, nextPage, 8).posts
      setPosts(prev => [...prev, ...newBatch])
      setPage(nextPage)
      setLoadingMore(false)
    }, 400)
  }, [page, loadingMore])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) handleLoadMore() },
      { rootMargin: '200px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [handleLoadMore])

  return (
    <div className="min-h-full bg-white">
      {/* Tab 栏 */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-md z-10 border-b border-ink-100/50">
        <div className="flex items-center gap-1 px-4 overflow-x-auto scrollbar-none">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key)}
              className={`px-4 py-3.5 text-[15px] font-semibold transition-colors relative whitespace-nowrap ${
                selectedTab === tab.key ? 'text-ink-900' : 'text-ink-400 hover:text-ink-600'
              }`}
            >
              {tab.label}
              {selectedTab === tab.key && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-ink-900 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 快捷操作栏 */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-ink-50 bg-paper-50">
        <button
          onClick={() => navigate('/verify')}
          className="flex items-center gap-2 text-[14px] text-ink-500 hover:text-seal-600 transition-colors font-medium"
        >
          <Shield size={17} strokeWidth={1.75} />
          <span>真假求证</span>
        </button>
        <div className="w-px h-5 bg-ink-100" />
        <button className="flex items-center gap-2 text-[14px] text-ink-500 hover:text-ink-900 transition-colors font-medium">
          <HelpCircle size={17} strokeWidth={1.75} />
          <span>发起求助</span>
        </button>
        <div className="w-px h-5 bg-ink-100" />
        <button className="flex items-center gap-2 text-[14px] text-ink-500 hover:text-violet-500 transition-colors font-medium">
          <MessageSquare size={17} strokeWidth={1.75} />
          <span>发起讨论</span>
        </button>
      </div>

      {/* 帖子列表 */}
      <div>
        {filteredPosts.map((post, i) => (
          <PostItem key={post.id} post={post} index={i} />
        ))}
        <div ref={sentinelRef} className="h-20 flex items-center justify-center">
          {loadingMore ? (
            <div className="w-5 h-5 border-2 border-ink-100 border-t-ink-900 rounded-full animate-spin" />
          ) : (
            <span className="text-[13px] text-ink-200">下拉加载更多</span>
          )}
        </div>
      </div>
    </div>
  )
}
