import { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'

interface RemovalTarget {
  index: number
  nickname: string
  avatar: string
  side: 'affirm' | 'negate'
  removalVotes: number
}

interface RemovalVoteModalProps {
  seats: RemovalTarget[]
  onStageCount: number
  threshold: number
  onVote: (seatIndex: number) => void
  onClose: () => void
}

export default function RemovalVoteModal({
  seats,
  onStageCount,
  threshold,
  onVote,
  onClose,
}: RemovalVoteModalProps) {
  const [confirmIndex, setConfirmIndex] = useState<number | null>(null)

  const thresholdVotes = Math.ceil(onStageCount * threshold)

  const handleVote = (seatIndex: number) => {
    if (confirmIndex === seatIndex) {
      onVote(seatIndex)
      setConfirmIndex(null)
    } else {
      setConfirmIndex(seatIndex)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div className="w-full max-w-[480px] bg-surface rounded-t-2xl shadow-card animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-line/30">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold text-text-ink-900">
              抬走投票
            </span>
          </div>
          <button onClick={onClose} className="p-1 text-text-ink-400 hover:text-text-ink-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info */}
        <div className="px-4 py-2 text-[11px] text-text-ink-500">
          场上 {onStageCount} 人，抬走需 {thresholdVotes} 票（{Math.round(threshold * 100)}%）
        </div>

        {/* Targets list */}
        <div className="px-4 pb-6 space-y-2 max-h-[50vh] overflow-y-auto">
          {seats.map((seat) => {
            const pct = onStageCount > 0 ? (seat.removalVotes / onStageCount) * 100 : 0
            const thresholdPct = threshold * 100
            const isConfirming = confirmIndex === seat.index

            return (
              <div
                key={seat.index}
                className="flex items-center gap-3 p-2.5 rounded-xl border border-border-line/30 bg-surface"
              >
                {/* Avatar */}
                <div
                  className={`
                    w-8 h-8 rounded-full border-2 flex items-center justify-center overflow-hidden shrink-0
                    ${seat.side === 'affirm' ? 'border-seal' : 'border-bamboo'}
                  `}
                >
                  {seat.avatar ? (
                    <img src={seat.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-text-ink-500">
                      {seat.nickname.charAt(0)}
                    </span>
                  )}
                </div>

                {/* Info + progress */}
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-text-ink-700 truncate block">
                    {seat.nickname}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-border-line/30 rounded-full overflow-hidden relative">
                      <div
                        className="h-full bg-red-400 rounded-full transition-all"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                      {/* Threshold line */}
                      <div
                        className="absolute top-0 bottom-0 w-px bg-red-600"
                        style={{ left: `${thresholdPct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-text-ink-400 whitespace-nowrap">
                      {seat.removalVotes}/{thresholdVotes}票 ({Math.round(pct)}%)
                    </span>
                  </div>
                </div>

                {/* Vote button */}
                <button
                  onClick={() => handleVote(seat.index)}
                  className={`
                    shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors
                    ${isConfirming
                      ? 'bg-red-500 text-white'
                      : 'bg-red-50 text-red-500 hover:bg-red-100'}
                  `}
                >
                  {isConfirming ? '确认投出' : '投票'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
