import { useState, useCallback } from 'react'
import { Search, Heart, MessageSquare, FileText, Eye } from 'lucide-react'
import { api } from '../services/api'
import type { Melon } from '../types'
import type { MelonDebateInfo } from './MelonCard'

interface MelonCardCompactProps {
  melon: Melon
  index?: number
  onClick?: () => void
  onVerify?: () => void
  debateInfo?: MelonDebateInfo
}

function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

const categoryColors: Record<string, string> = {
  '娱乐': 'bg-rose-500/90',
  '科技': 'bg-blue-500/90',
  '生活科普': 'bg-emerald-500/90',
  '社会热点': 'bg-amber-600/90',
  '历史': 'bg-violet-500/90',
  '财经': 'bg-cyan-600/90',
}

function MelonCardCompact({ melon, index = 0, onClick, onVerify, debateInfo }: MelonCardCompactProps) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [liked, setLiked] = useState(melon.isLiked)
  const [likeCount, setLikeCount] = useState(melon.likeCount)
  const [liking, setLiking] = useState(false)
  const staggerClass = `stagger-${Math.min(index + 1, 8)}`
  const catColor = categoryColors[melon.category] || 'bg-seal/90'

  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (liking) return
    setLiking(true)

    const wasLiked = liked
    setLiked(!wasLiked)
    setLikeCount(prev => wasLiked ? prev - 1 : prev + 1)

    try {
      await api.likeMelon(Number(melon.id))
    } catch {
      setLiked(wasLiked)
      setLikeCount(prev => wasLiked ? prev + 1 : prev - 1)
    } finally {
      setLiking(false)
    }
  }, [liked, liking, melon.id])

  return (
    <div
      onClick={onClick}
      className={`group relative cursor-pointer rounded-xl overflow-hidden border border-line/20 bg-surface hover:shadow-card-hover hover:border-line/40 transition-all duration-200 animate-fade-in-up ${staggerClass}`}
    >
      {/* 封面图 */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={melon.coverImage}
          alt={melon.title}
          className={`w-full h-full object-cover transition-all duration-700 ${
            imgLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
          } group-hover:scale-[1.03]`}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
        />

        {/* 渐变遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* 分类标签 */}
        <span className={`absolute top-2 left-2 px-2 py-0.5 text-xs font-medium text-white rounded-md ${catColor} backdrop-blur-sm`}>
          {melon.category}
        </span>

        {/* 状态标签 */}
        {melon.status === 'revealed' && (
          <span className={`absolute top-2 right-2 px-1.5 py-0.5 text-[11px] font-medium text-white rounded backdrop-blur-sm ${
            melon.result ? 'bg-bamboo/80' : 'bg-seal/80'
          }`}>
            {melon.result ? '已证实' : '已辟谣'}
          </span>
        )}

        {/* 标题 */}
        <div className="absolute bottom-0 left-0 right-0 p-3 pt-6">
          <h3 className="text-white text-sm font-bold leading-snug line-clamp-2 drop-shadow-md">
            {melon.title}
          </h3>
        </div>
      </div>

      {/* 互动数据 */}
      <div className="px-3 py-2 space-y-2">
        {/* 辩论状态 */}
        {debateInfo && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-semibold ${
              debateInfo.status === 'debating'
                ? 'bg-bamboo/15 text-bamboo'
                : debateInfo.status === 'waiting'
                ? 'bg-ink-400/10 text-ink-500'
                : 'bg-ink-300/10 text-ink-400'
            }`}>
              {debateInfo.status === 'debating' && (
                <span className="w-1 h-1 rounded-full bg-bamboo animate-pulse" />
              )}
              {debateInfo.status === 'debating' ? '激辩中' : debateInfo.status === 'waiting' ? '等待' : '已结束'}
            </span>
            <span className="flex items-center gap-0.5 text-ink-400">
              <Eye size={11} />
              {formatCount(debateInfo.spectatorCount)}
            </span>
          </div>
        )}

        {/* 底部数据 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-ink-400">
            <span className="flex items-center gap-0.5 text-xs">
              <FileText size={12} />
              {melon.evidenceCount}
            </span>
            <span className="flex items-center gap-0.5 text-xs">
              <MessageSquare size={12} />
              {melon.commentCount}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleLike}
              className={`relative flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium transition-all active:scale-90 ${
                liked
                  ? 'text-seal bg-seal/10'
                  : 'text-ink-400 hover:text-seal hover:bg-seal/5'
              }`}
            >
              <Heart
                size={13}
                className={`transition-all duration-200 ${liked ? 'fill-seal text-seal' : ''}`}
              />
              <span>{formatCount(likeCount)}</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation()
                onVerify?.()
              }}
              className="flex items-center gap-0.5 px-2 py-1 text-xs text-seal bg-seal/8 rounded hover:bg-seal/15 active:bg-seal/20 transition-colors font-medium"
            >
              <Search size={11} />
              求证
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MelonCardCompact
