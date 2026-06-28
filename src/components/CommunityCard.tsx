import { useState } from 'react'
import { Heart, Flame, HandHeart, HelpCircle } from 'lucide-react'
import type { CommunityPost } from '../services/mockData'

interface CommunityCardProps {
  post: CommunityPost
  index?: number
  onClick?: () => void
}

const typeTagConfig = {
  hot: { icon: Flame, label: '热帖', bg: 'bg-seal/90', text: 'text-white' },
  charity: { icon: HandHeart, label: '公益', bg: 'bg-bamboo/90', text: 'text-white' },
  help: { icon: HelpCircle, label: '求助', bg: 'bg-gold/90', text: 'text-white' },
  normal: null,
}

function formatLikes(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

function CommunityCard({ post, index = 0, onClick }: CommunityCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [liked, setLiked] = useState(false)
  const tag = typeTagConfig[post.type]
  const TagIcon = tag?.icon
  const staggerClass = `stagger-${Math.min(index + 1, 8)}`

  return (
    <div
      onClick={onClick}
      className={`bg-surface rounded-xl shadow-card overflow-hidden cursor-pointer active:scale-[0.97] transition-all duration-200 animate-fade-in-up ${staggerClass}`}
    >
      {/* 图片 */}
      <div className="relative overflow-hidden bg-paper-dark">
        <img
          src={post.image}
          alt={post.title}
          className={`w-full object-cover transition-all duration-500 ${
            imgLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ height: `${post.imageHeight}px` }}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
        />

        {/* 类型标签 */}
        {tag && TagIcon && (
          <span className={`absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-lg ${tag.bg} ${tag.text} backdrop-blur-sm`}>
            <TagIcon size={10} />
            {tag.label}
          </span>
        )}
      </div>

      {/* 内容区 */}
      <div className="p-3">
        <h3 className="text-[13px] text-ink-900 leading-snug line-clamp-2 mb-2.5 font-medium min-h-[2.4em]">
          {post.title}
        </h3>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <img
              src={post.authorAvatar}
              alt={post.authorName}
              className="w-4 h-4 rounded-full flex-shrink-0 bg-paper-dark"
            />
            <span className="text-[11px] text-ink-400 truncate">{post.authorName}</span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation()
              setLiked(!liked)
            }}
            className={`flex items-center gap-0.5 flex-shrink-0 transition-colors ${
              liked ? 'text-seal' : 'text-ink-400'
            }`}
          >
            <Heart size={12} className={liked ? 'fill-seal' : ''} />
            <span className="text-[11px]">{formatLikes(liked ? post.likes + 1 : post.likes)}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default CommunityCard
