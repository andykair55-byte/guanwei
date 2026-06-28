import { useState, useCallback } from 'react'
import { Search, Clock, ChevronRight, Heart, MessageSquare, FileText, Eye, Swords, Users } from 'lucide-react'
import { api } from '../services/api'
import type { Melon } from '../types'

export interface MelonDebateInfo {
  status: 'waiting' | 'debating' | 'ended'
  spectatorCount: number
  vacantSeats: number
  totalSeats: number
  entryCost: number
  currentRound: number
}

interface MelonCardProps {
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

function MelonCard({ melon, index = 0, onClick, onVerify, debateInfo }: MelonCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [liked, setLiked] = useState(melon.isLiked)
  const [likeCount, setLikeCount] = useState(melon.likeCount)
  const [liking, setLiking] = useState(false)
  const [showHeartBurst, setShowHeartBurst] = useState(false)
  const staggerClass = `stagger-${Math.min(index + 1, 8)}`
  const catColor = categoryColors[melon.category] || 'bg-seal/90'

  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (liking) return
    setLiking(true)

    const wasLiked = liked
    setLiked(!wasLiked)
    setLikeCount(prev => wasLiked ? prev - 1 : prev + 1)

    if (!wasLiked) {
      setShowHeartBurst(true)
      setTimeout(() => setShowHeartBurst(false), 600)
    }

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
      className={`group relative py-4 cursor-pointer active:bg-ink-100/50 transition-colors duration-150 animate-fade-in-up ${staggerClass}`}
    >
      {/* 封面图 */}
      <div className="relative -mx-4 w-[calc(100%+2rem)] aspect-[16/10] overflow-hidden">
        <img
          src={melon.coverImage}
          alt={melon.title}
          className={`w-full h-full object-cover transition-all duration-700 ${
            imgLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
          } group-hover:scale-[1.02]`}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
        />

        {/* 渐变遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />

        {/* 分类标签 */}
        <span className={`absolute top-3 left-3 px-2.5 py-1 text-[11px] font-medium text-white rounded-lg ${catColor} backdrop-blur-sm`}>
          {melon.category}
        </span>

        {/* 状态标签 */}
        {melon.status === 'revealed' && (
          <span className={`absolute top-3 right-3 px-2 py-0.5 text-[10px] font-medium text-white rounded-md backdrop-blur-sm ${
            melon.result ? 'bg-bamboo/80' : 'bg-seal/80'
          }`}>
            {melon.result ? '已证实' : '已辟谣'}
          </span>
        )}

        {/* 标题 */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pt-8">
          <h3 className="text-white text-[16px] font-bold leading-snug line-clamp-2 drop-shadow-md">
            {melon.title}
          </h3>
        </div>
      </div>

      {/* 互动数据栏 */}
      <div className="flex items-center gap-1 px-3 py-2.5 border-b border-line/30">
        <div className="flex items-center gap-1 text-ink-400">
          <Clock size={12} />
          <span className="text-[11px]">
            {new Date(melon.revealTime).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
          </span>
        </div>
        <span className="text-ink-faint text-[10px]">|</span>
        <div className="flex items-center gap-1 text-ink-400">
          <FileText size={12} />
          <span className="text-[11px]">{melon.evidenceCount}条佐证</span>
        </div>
        <span className="text-ink-faint text-[10px]">|</span>
        <div className="flex items-center gap-1 text-ink-400">
          <MessageSquare size={12} />
          <span className="text-[11px]">{melon.commentCount}条讨论</span>
        </div>
      </div>

      {/* 辩论状态条 */}
      {debateInfo && (
        <div className="flex items-center gap-2 px-3 py-2 bg-ink-900/[0.03] border-b border-line/20">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${
            debateInfo.status === 'debating'
              ? 'bg-bamboo/15 text-bamboo'
              : debateInfo.status === 'waiting'
              ? 'bg-ink-400/10 text-ink-500'
              : 'bg-ink-300/10 text-ink-400'
          }`}>
            {debateInfo.status === 'debating' && (
              <span className="w-1.5 h-1.5 rounded-full bg-bamboo animate-pulse" />
            )}
            {debateInfo.status === 'debating' ? '激辩中' : debateInfo.status === 'waiting' ? '等待开局' : '已结束'}
          </span>
          <div className="flex items-center gap-1 text-ink-400">
            <Eye size={11} />
            <span className="text-[10px]">{formatCount(debateInfo.spectatorCount)}</span>
          </div>
          <span className="text-ink-faint text-[10px]">|</span>
          <div className="flex items-center gap-1 text-ink-400">
            <Users size={11} />
            <span className="text-[10px]">{debateInfo.totalSeats - debateInfo.vacantSeats}/{debateInfo.totalSeats}座</span>
          </div>
          {debateInfo.status !== 'ended' && (
            <>
              <span className="text-ink-faint text-[10px]">|</span>
              <div className="flex items-center gap-1 text-ink-400">
                <Swords size={11} />
                <span className="text-[10px]">{debateInfo.entryCost}积分</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* 底部操作栏 */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2 text-ink-400">
          <div className="flex items-center gap-1">
            <span className="text-[11px]">{formatCount(melon.totalParticipants)}人参与</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 点赞按钮 */}
          <button
            onClick={handleLike}
            className={`relative flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12px] font-medium transition-all active:scale-90 ${
              liked
                ? 'text-seal bg-seal/10'
                : 'text-ink-400 hover:text-seal hover:bg-seal/5'
            }`}
          >
            <Heart
              size={14}
              className={`transition-all duration-200 ${liked ? 'fill-seal text-seal scale-110' : ''}`}
            />
            <span>{formatCount(likeCount)}</span>
            {/* 心跳爆发效果 */}
            {showHeartBurst && (
              <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Heart size={24} className="text-seal animate-ping" />
              </span>
            )}
          </button>

          {/* 求证按钮 */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onVerify?.()
            }}
            className="flex items-center gap-1 px-3 py-1.5 text-[12px] text-seal bg-seal/8 rounded-lg hover:bg-seal/15 active:bg-seal/20 transition-colors font-medium"
          >
            <Search size={12} />
            求证
            <ChevronRight size={12} className="-ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default MelonCard
