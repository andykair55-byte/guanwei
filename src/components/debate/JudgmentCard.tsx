import { useState } from 'react'
import { ChevronDown, ChevronUp, Trophy, AlertCircle } from 'lucide-react'

interface SeatScoreData {
  seatIndex: number
  nickname: string
  score: number
  highlights: string[]
  weaknesses: string[]
}

interface FallacyData {
  seatIndex: number
  nickname: string
  fallacyType: string
  quote: string
  explanation: string
}

interface JudgmentCardProps {
  judgment: {
    round: number
    seatScores: SeatScoreData[]
    fallacies: FallacyData[]
    roundWinner: string
    judgeComment: string
  }
}

export default function JudgmentCard({ judgment }: JudgmentCardProps) {
  const [expandedFallacies, setExpandedFallacies] = useState<Set<number>>(new Set())

  const maxScore = Math.max(...judgment.seatScores.map((s) => s.score), 10)

  const toggleFallacy = (idx: number) => {
    setExpandedFallacies((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const winnerLabel =
    judgment.roundWinner === 'affirm'
      ? '正方领先'
      : judgment.roundWinner === 'negate'
        ? '反方领先'
        : '平局'

  return (
    <div className="w-full max-w-[480px] mx-auto animate-slide-in">
      <div className="bg-surface border border-border-line rounded-xl shadow-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-border-line/20">
          <span className="text-sm font-semibold text-text-ink-900">
            第 {judgment.round} 回合评判
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold text-seal">
            <Trophy className="w-3.5 h-3.5" />
            {winnerLabel}
          </span>
        </div>

        {/* Seat scores */}
        <div className="px-4 py-3 space-y-2.5">
          {judgment.seatScores.map((ss) => (
            <div key={ss.seatIndex} className="flex items-center gap-2">
              <span className="text-xs text-text-ink-700 w-16 truncate shrink-0">
                {ss.nickname}
              </span>
              <div className="flex-1 h-3 bg-border-line/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-seal/70 rounded-full transition-all duration-700"
                  style={{ width: `${(ss.score / maxScore) * 100}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-text-ink-700 w-8 text-right">
                {ss.score}
              </span>
            </div>
          ))}
        </div>

        {/* Fallacies */}
        {judgment.fallacies.length > 0 && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-1 mb-2">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-semibold text-text-ink-700">
                逻辑谬误检测
              </span>
            </div>
            <div className="space-y-1.5">
              {judgment.fallacies.map((f, idx) => (
                <div
                  key={idx}
                  className="border border-amber-200/60 rounded-lg bg-amber-50/50 overflow-hidden"
                >
                  <button
                    onClick={() => toggleFallacy(idx)}
                    className="w-full flex items-center justify-between px-3 py-2 text-left"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                        {f.fallacyType}
                      </span>
                      <span className="text-[11px] text-text-ink-500">
                        {f.nickname}
                      </span>
                    </div>
                    {expandedFallacies.has(idx) ? (
                      <ChevronUp className="w-3.5 h-3.5 text-text-ink-400" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-text-ink-400" />
                    )}
                  </button>
                  {expandedFallacies.has(idx) && (
                    <div className="px-3 pb-2 space-y-1">
                      <p className="text-[11px] text-text-ink-500 italic border-l-2 border-amber-300 pl-2">
                        &ldquo;{f.quote}&rdquo;
                      </p>
                      <p className="text-[11px] text-text-ink-700 leading-relaxed">
                        {f.explanation}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Judge comment */}
        <div className="px-4 pb-4">
          <div className="border-t border-border-line/30 pt-3">
            <p className="text-xs text-text-ink-500 italic leading-relaxed">
              &ldquo;{judgment.judgeComment}&rdquo;
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
