import { CheckCircle, XCircle, Star, FileText } from 'lucide-react'
import type { Melon, Guess } from '../types'
import EvidenceLeaderboard from './EvidenceLeaderboard'

interface GuessResultProps {
  melon: Melon
  guess: Guess | null
}

function formatCountdown(revealTime: string): string {
  const now = Date.now()
  const target = new Date(revealTime).getTime()
  const diff = target - now

  if (diff <= 0) return '已开奖'

  const totalMinutes = Math.floor(diff / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours > 0) {
    return `${hours}小时${minutes > 0 ? `${minutes}分` : ''}后开奖`
  }
  if (minutes > 0) {
    return `${minutes}分钟后开奖`
  }
  return '即将开奖'
}

export default function GuessResult({ melon, guess }: GuessResultProps) {
  const isCorrect = guess?.isCorrect
  const pointsEarned = guess?.pointsEarned || 0
  const expGained = Math.floor(pointsEarned / 2)

  return (
    <div className="min-h-screen bg-paper pb-safe">
      {/* 顶部 - 开奖结果 */}
      <div
        className={`p-4 text-center ${
          isCorrect ? 'bg-seal/10' : 'bg-bamboo/10'
        }`}
      >
        {isCorrect ? (
          <div className="space-y-2">
            <CheckCircle size={48} className="mx-auto text-seal" />
            <h2 className="text-seal font-bold text-lg">结果揭晓：真</h2>
            <p className="text-seal/80 text-sm">恭喜你猜对了！</p>
            <div className="flex justify-center gap-4 mt-3">
              <div className="bg-white rounded-lg px-3 py-1.5">
                <span className="text-gold text-sm">+{pointsEarned} 积分</span>
              </div>
              <div className="bg-white rounded-lg px-3 py-1.5">
                <span className="text-ink-700 text-sm">+{expGained} 经验</span>
              </div>
            </div>
          </div>
        ) : isCorrect === false ? (
          <div className="space-y-2">
            <XCircle size={48} className="mx-auto text-bamboo" />
            <h2 className="text-bamboo font-bold text-lg">结果揭晓：假</h2>
            <p className="text-bamboo/80 text-sm">很遗憾，你猜错了</p>
            <div className="bg-white rounded-lg px-3 py-1.5 inline-block mt-2">
              <span className="text-ink-500 text-sm">下次再接再厉</span>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <FileText size={48} className="mx-auto text-ink-500" />
            <h2 className="text-ink-700 font-bold text-lg">等待开奖</h2>
            <p className="text-ink-500 text-sm">{formatCountdown(melon.revealTime)}</p>
          </div>
        )}
      </div>

      {/* 中部 - 实锤报告摘要 */}
      {melon.report && (
        <div className="p-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="text-ink-900 font-bold text-base flex items-center gap-2 mb-3">
              <FileText size={18} />
              实锤报告摘要
            </h3>

            {/* 倾向性判断 */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`px-2 py-0.5 text-xs rounded ${
                    melon.report.tendencyDirection
                      ? 'bg-seal/10 text-seal'
                      : 'bg-bamboo/10 text-bamboo'
                  }`}
                >
                  {melon.report.tendencyDirection ? '倾向为真' : '倾向为假'}
                </span>
                <span className="text-ink-500 text-xs">{melon.report.tendency}</span>
              </div>
            </div>

            {/* 关键疑点 */}
            {melon.report.keyDoubts.length > 0 && (
              <div className="mb-4">
                <p className="text-ink-700 text-sm font-medium mb-2">关键疑点</p>
                <ul className="space-y-1">
                  {melon.report.keyDoubts.map((doubt, i) => (
                    <li key={i} className="text-ink-500 text-sm flex items-start gap-2">
                      <span className="text-seal">•</span>
                      <span>{doubt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 可信度星级 */}
            <div className="flex items-center gap-2">
              <span className="text-ink-500 text-sm">可信度：</span>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className={
                      i < (melon.report?.evidenceChain.length || 0)
                        ? 'text-gold fill-gold'
                        : 'text-line'
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 底部 - 佐证排行榜 */}
      <div className="p-4">
        <EvidenceLeaderboard melonId={melon.id} result={melon.result} />
      </div>
    </div>
  )
}
