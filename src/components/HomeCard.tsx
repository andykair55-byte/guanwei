import { useState, useCallback } from 'react'
import { Heart } from 'lucide-react'

interface HomeCardProps {
  id: string | number
  coverImage: string
  title: string
  category: string
  status: 'hot' | 'verified' | 'verifying' | 'debating'
  timeAgo: string
  author: { avatar?: string; nickname: string }
  likeCount: number
  isLiked?: boolean
  onClick?: () => void
  onAvatarClick?: () => void
  index?: number
}

function getCategoryStyle(category: string): { bg: string; text: string } {
  switch (category) {
    case '娱乐吃瓜':
      return { bg: 'bg-pink-50', text: 'text-pink-500' }
    case '社会热点':
      return { bg: 'bg-orange-50', text: 'text-orange-500' }
    case '校园趣事':
      return { bg: 'bg-teal-50', text: 'text-teal-500' }
    case '科技数码':
      return { bg: 'bg-sky-50', text: 'text-sky-500' }
    case '生活分享':
      return { bg: 'bg-violet-50', text: 'text-violet-500' }
    case '科普知识':
      return { bg: 'bg-emerald-50', text: 'text-emerald-500' }
    case '校园话题':
      return { bg: 'bg-cyan-50', text: 'text-cyan-500' }
    default:
      return { bg: 'bg-gray-50', text: 'text-gray-500' }
  }
}

function getStatusBadge(status: string): { bg: string; label: string } | null {
  switch (status) {
    case 'hot':
      return { bg: 'bg-gradient-to-r from-red-500 to-orange-400', label: '热门' }
    case 'verified':
      return { bg: 'bg-[#2d8f5e]', label: '已求证' }
    case 'verifying':
      return { bg: 'bg-[#c78c20]', label: '求证中' }
    case 'debating':
      return { bg: 'bg-purple-500', label: '辩论中' }
    default:
      return null
  }
}

function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

export default function HomeCard({
  coverImage,
  title,
  category,
  status,
  timeAgo,
  author,
  likeCount,
  isLiked = false,
  onClick,
  onAvatarClick,
  index = 0
}: HomeCardProps) {
  const [liked, setLiked] = useState(isLiked)
  const [currentLikeCount, setCurrentLikeCount] = useState(likeCount)
  const [showHeartBurst, setShowHeartBurst] = useState(false)

  const handleLike = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const wasLiked = liked
    setLiked(!wasLiked)
    setCurrentLikeCount(prev => wasLiked ? prev - 1 : prev + 1)
    if (!wasLiked) {
      setShowHeartBurst(true)
      setTimeout(() => setShowHeartBurst(false), 600)
    }
  }, [liked])

  const badge = getStatusBadge(status)
  const cat = getCategoryStyle(category)

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-gray-200 hover:shadow-md cursor-pointer transition-all duration-200 animate-fade-in-up stagger-${Math.min(index + 1, 8)}`}
    >
      {/* 封面图 — 整张卡片圆角 */}
      <div className="relative w-full aspect-[4/3] overflow-hidden">
        <img
          src={coverImage}
          alt={title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        />
        {/* 状态标签 */}
        {badge && (
          <span className={`absolute top-2 left-2 px-1.5 py-[2px] rounded text-[9px] font-semibold text-white leading-tight ${badge.bg}`}>
            {badge.label}
          </span>
        )}
        {/* 时间标签 */}
        <span className="absolute top-2 right-2 px-1.5 py-[2px] rounded text-[9px] text-white/90 bg-black/30 backdrop-blur-sm">
          {timeAgo}
        </span>
      </div>

      {/* 内容区 */}
      <div className="px-2.5 pt-2 pb-2.5">
        <h3 className="text-[13px] font-medium text-gray-800 line-clamp-2 leading-[1.4] mb-2">
          {title}
        </h3>

        {/* 标签 + 作者行 */}
        <div className="flex items-center justify-between gap-1">
          <span className={`shrink-0 px-1.5 py-[1px] rounded text-[10px] font-medium ${cat.bg} ${cat.text}`}>
            {category}
          </span>

          <div className="flex items-center gap-1 min-w-0 flex-1 justify-end">
            {author.avatar ? (
              <img
                src={author.avatar}
                alt={author.nickname}
                className="w-3.5 h-3.5 rounded-full object-cover flex-shrink-0 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  onAvatarClick?.()
                }}
              />
            ) : (
              <div
                className="w-3.5 h-3.5 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  onAvatarClick?.()
                }}
              >
                <span className="text-[7px] text-gray-500 font-medium">{author.nickname.charAt(0)}</span>
              </div>
            )}
            <span className="text-[10px] text-gray-400 truncate">{author.nickname}</span>

            <button
              onClick={handleLike}
              className={`relative shrink-0 flex items-center gap-0.5 ml-0.5 transition-all ${
                liked ? 'text-red-500' : 'text-gray-300 hover:text-red-400'
              }`}
            >
              <Heart size={11} className={`transition-transform ${liked ? 'fill-red-500 text-red-500 animate-like' : ''}`} />
              <span className="text-[9px]">{formatCount(currentLikeCount)}</span>
              {showHeartBurst && (
                <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Heart size={16} className="text-red-500 animate-like-glow" />
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
