interface PhaseIndicatorProps {
  currentRound: number
  phase: 'early' | 'middle' | 'late' | 'final'
  charLimit: number
  totalRounds?: number
}

const PHASE_LABELS: Record<string, string> = {
  early: '开局',
  middle: '中期',
  late: '白热化',
  final: '最终回合',
}

const PHASE_COLORS: Record<string, string> = {
  early: 'bg-bamboo',
  middle: 'bg-amber-400',
  late: 'bg-orange-500',
  final: 'bg-seal',
}

export default function PhaseIndicator({
  currentRound,
  phase,
  charLimit,
  totalRounds = 6,
}: PhaseIndicatorProps) {
  const progress = Math.min(currentRound / totalRounds, 1)

  return (
    <div className="w-full max-w-[480px] mx-auto px-3 py-2">
      {/* Top row: label + round + char limit */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full text-white ${PHASE_COLORS[phase]}`}>
            {PHASE_LABELS[phase]}
          </span>
          <span className="text-xs text-text-ink-500">
            第 {currentRound} / {totalRounds} 轮
          </span>
        </div>
        <span className="text-[10px] text-text-ink-400 bg-border-line/30 px-1.5 py-0.5 rounded">
          限{charLimit}字
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-border-line/30 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${PHASE_COLORS[phase]}`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  )
}
