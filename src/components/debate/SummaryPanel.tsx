import { X, Trophy, Star } from 'lucide-react'

interface KeyArgument {
  side: string
  nickname: string
  argument: string
}

interface SummaryPanelProps {
  summary: {
    topic: string
    winner: string
    mvpNickname: string
    affirmTotalScore: number
    negateTotalScore: number
    keyArguments: KeyArgument[]
    totalRounds: number
  }
  onClose: () => void
}

export default function SummaryPanel({ summary, onClose }: SummaryPanelProps) {
  const totalScore = summary.affirmTotalScore + summary.negateTotalScore
  const affirmPct = totalScore > 0 ? (summary.affirmTotalScore / totalScore) * 100 : 50

  const winnerText =
    summary.winner === 'affirm'
      ? '正方获胜'
      : summary.winner === 'negate'
        ? '反方获胜'
        : '平局'

  const winnerColor =
    summary.winner === 'affirm'
      ? 'text-seal'
      : summary.winner === 'negate'
        ? 'text-bamboo'
        : 'text-text-ink-700'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-[480px] bg-surface rounded-2xl shadow-card overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="relative px-4 py-4 bg-border-line/20 text-center">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1 text-text-ink-400 hover:text-text-ink-700"
          >
            <X className="w-5 h-5" />
          </button>
          <Trophy className="w-8 h-8 text-amber-400 mx-auto mb-1" />
          <h2 className={`text-lg font-bold ${winnerColor}`}>{winnerText}</h2>
          <p className="text-xs text-text-ink-500 mt-1">
            共 {summary.totalRounds} 轮辩论
          </p>
        </div>

        {/* Topic */}
        <div className="px-4 py-3 border-b border-border-line/30">
          <p className="text-xs text-text-ink-400 mb-0.5">辩题</p>
          <p className="text-sm text-text-ink-900 font-medium">{summary.topic}</p>
        </div>

        {/* Score comparison */}
        <div className="px-4 py-3 border-b border-border-line/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-seal">
              正方 {summary.affirmTotalScore}
            </span>
            <span className="text-xs font-semibold text-bamboo">
              反方 {summary.negateTotalScore}
            </span>
          </div>
          <div className="w-full h-3 rounded-full overflow-hidden flex bg-bamboo/30">
            <div
              className="h-full bg-seal/70 transition-all duration-700"
              style={{ width: `${affirmPct}%` }}
            />
          </div>
        </div>

        {/* MVP */}
        <div className="px-4 py-3 border-b border-border-line/30">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-text-ink-500">最佳辩手 (MVP)</span>
            <span className="text-sm font-semibold text-text-ink-900">
              {summary.mvpNickname}
            </span>
          </div>
        </div>

        {/* Key arguments */}
        <div className="px-4 py-3 max-h-[30vh] overflow-y-auto">
          <p className="text-xs font-semibold text-text-ink-700 mb-2">关键论点</p>
          <div className="space-y-2">
            {summary.keyArguments.map((arg, idx) => (
              <div
                key={idx}
                className={`
                  text-xs p-2 rounded-lg border-l-2
                  ${arg.side === 'affirm'
                    ? 'border-seal bg-seal/5'
                    : 'border-bamboo bg-bamboo/5'}
                `}
              >
                <span className="font-medium text-text-ink-700">{arg.nickname}</span>
                <span className="text-text-ink-500 ml-1">
                  {arg.side === 'affirm' ? '[正方]' : '[反方]'}
                </span>
                <p className="text-text-ink-500 mt-0.5 leading-relaxed">{arg.argument}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Close button */}
        <div className="px-4 py-3 border-t border-border-line/30">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-seal text-white text-sm font-semibold hover:bg-seal/90 active:scale-[0.98] transition-all"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}
