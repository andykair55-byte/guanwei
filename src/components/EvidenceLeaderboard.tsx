import { Crown, MessageSquare } from 'lucide-react'
import EvidenceCard from './EvidenceCard'
import { useEvidenceStore } from '../stores/evidenceStore'

interface EvidenceLeaderboardProps {
  melonId: string
  result: boolean | undefined  // 开奖结果
}

export default function EvidenceLeaderboard({
  melonId,
  result,
}: EvidenceLeaderboardProps) {
  const evidenceList = useEvidenceStore((state) => state.getEvidenceList(melonId))
  const upvote = useEvidenceStore((state) => state.upvote)
  const downvote = useEvidenceStore((state) => state.downvote)

  if (evidenceList.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <MessageSquare size={40} className="mx-auto text-ink-faint mb-3" />
        <p className="text-ink-500 text-sm">暂无佐证</p>
        <p className="text-ink-faint text-xs mt-1">成为第一个提供佐证的人吧</p>
      </div>
    )
  }

  // 最佳佐证置顶
  const bestEvidence = evidenceList.find((e) => e.isBest)
  const otherEvidence = evidenceList
    .filter((e) => !e.isBest)
    .sort((a, b) => b.upvotes - b.downvotes - (a.upvotes - a.downvotes))

  return (
    <div className="space-y-4">
      <h3 className="text-ink-900 font-bold text-base flex items-center gap-2">
        <MessageSquare size={18} />
        用户佐证
      </h3>

      {/* 最佳佐证大卡片 */}
      {bestEvidence && (
        <div className="relative">
          <div className="absolute -top-2 -left-2 z-10">
            <div className="bg-gold text-white p-1.5 rounded-full">
              <Crown size={18} />
            </div>
          </div>
          <EvidenceCard
            evidence={bestEvidence}
            onUpvote={() => upvote(bestEvidence.id, melonId)}
            onDownvote={() => downvote(bestEvidence.id, melonId)}
            showResult={result}
          />
        </div>
      )}

      {/* 其他佐证按点赞排序 */}
      <div className="space-y-3">
        {otherEvidence.map((evidence) => (
          <EvidenceCard
            key={evidence.id}
            evidence={evidence}
            onUpvote={() => upvote(evidence.id, melonId)}
            onDownvote={() => downvote(evidence.id, melonId)}
            showResult={result}
          />
        ))}
      </div>
    </div>
  )
}
