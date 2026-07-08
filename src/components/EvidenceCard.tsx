import { ThumbsUp, ThumbsDown, Crown, CheckCircle, XCircle } from 'lucide-react'
import type { Evidence } from '../types'

interface EvidenceCardProps {
  evidence: Evidence
  onUpvote: () => void
  onDownvote: () => void
  showResult?: boolean  // 是否显示猜对/猜错标签
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
  return `${days}天前`
}

export default function EvidenceCard({
  evidence,
  onUpvote,
  onDownvote,
  showResult = false,
}: EvidenceCardProps) {
  return (
    <div
      className={`bg-white rounded-xl shadow-sm p-4 ${
        evidence.isBest ? 'ring-2 ring-gold' : ''
      }`}
    >
      {/* 最佳佐证标记 */}
      {evidence.isBest && (
        <div className="flex items-center gap-1 text-gold text-xs mb-2">
          <Crown size={14} />
          <span>最佳佐证</span>
        </div>
      )}

      {/* 用户信息 + 方向标签 */}
      <div className="flex items-center gap-2 mb-3">
        <img
          src={evidence.userAvatar}
          alt={evidence.userNickname}
          className="w-8 h-8 rounded-full object-cover"
        />
        <span className="text-sm text-ink-700 font-medium">
          {evidence.userNickname}
        </span>
        <span
          className={`px-2 py-0.5 text-xs rounded ${
            evidence.direction
              ? 'bg-seal/10 text-seal'
              : 'bg-bamboo/10 text-bamboo'
          }`}
        >
          {evidence.direction ? '真' : '假'}
        </span>

        {/* AI 辅助创作标记 */}
        {evidence.aiAssisted && (
          <span className="px-1.5 py-0.5 text-[10px] rounded bg-purple-50 text-purple-600 font-medium">
            AI辅助
          </span>
        )}

        {/* 猜对/猜错标签 */}
        {showResult && (
          <span
            className={`ml-auto flex items-center gap-1 px-2 py-0.5 text-xs rounded ${
              evidence.direction === showResult
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {evidence.direction === showResult ? (
              <>
                <CheckCircle size={12} />
                猜对
              </>
            ) : (
              <>
                <XCircle size={12} />
                猜错
              </>
            )}
          </span>
        )}
      </div>

      {/* 佐证内容 */}
      <p className="text-ink-700 text-sm leading-relaxed mb-3">
        {evidence.content}
      </p>

      {/* 点赞/踩按钮 + 时间 */}
      <div className="flex items-center gap-4">
        <button
          onClick={onUpvote}
          className="flex items-center gap-1 text-ink-500 hover:text-seal transition-colors"
        >
          <ThumbsUp size={16} />
          <span className="text-sm">{evidence.upvotes}</span>
        </button>

        <button
          onClick={onDownvote}
          className="flex items-center gap-1 text-ink-500 hover:text-bamboo transition-colors"
        >
          <ThumbsDown size={16} />
          <span className="text-sm">{evidence.downvotes}</span>
        </button>

        <span className="ml-auto text-ink-faint text-xs">
          {formatTime(evidence.createdAt)}
        </span>
      </div>
    </div>
  )
}
