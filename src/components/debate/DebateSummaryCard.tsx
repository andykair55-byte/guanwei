// src/components/debate/DebateSummaryCard.tsx
import { useState } from 'react'
import { Trophy, Star, Bookmark, BookmarkCheck, Share2 } from 'lucide-react'
import { useDebateCollectionStore, type DebateRecord } from '../../stores/debateCollectionStore'

interface Props {
  roomId: string
  topic: string
  affirmLabel: string
  negateLabel: string
  winner: string
  mvpName: string
  affirmScore: number
  negateScore: number
  highlight: string
  source: DebateRecord['source']
}

export default function DebateSummaryCard({
  roomId, topic, affirmLabel, negateLabel,
  winner, mvpName, affirmScore, negateScore,
  highlight, source,
}: Props) {
  const [copied, setCopied] = useState(false)
  const addRecord = useDebateCollectionStore(s => s.addRecord)
  const removeRecord = useDebateCollectionStore(s => s.removeRecord)
  const isCollected = useDebateCollectionStore(s => s.records.some(r => r.roomId === roomId))

  const handleToggleCollect = () => {
    if (isCollected) {
      removeRecord(roomId)
    } else {
      addRecord({
        id: `record-${Date.now()}`,
        roomId,
        topic,
        affirmLabel,
        negateLabel,
        winner,
        mvpName,
        affirmScore,
        negateScore,
        highlight,
        source,
        collectedAt: new Date().toISOString(),
      })
    }
  }

  const handleShare = () => {
    const text = `【${topic}】\n${affirmLabel} ${affirmScore} vs ${negateScore} ${negateLabel}\n胜方：${winner}\nMVP：${mvpName}\n精彩发言：${highlight}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-surface rounded-2xl shadow-card overflow-hidden">
      {/* 顶部 */}
      <div className="bg-gradient-to-r from-seal/10 to-gold/10 px-5 py-4">
        <div className="flex items-center gap-2 mb-1">
          <Trophy size={16} className="text-gold" />
          <span className="text-[12px] font-bold text-ink-700">辩论结束</span>
        </div>
        <h3 className="text-[15px] font-bold text-ink-900">{topic}</h3>
      </div>

      {/* 比分 */}
      <div className="px-5 py-4">
        <div className="flex items-center justify-center gap-6 mb-4">
          <div className="text-center">
            <p className="text-[11px] text-ink-400 mb-1">{affirmLabel}</p>
            <p className={`text-[28px] font-bold ${winner === affirmLabel ? 'text-seal' : 'text-ink-500'}`}>
              {affirmScore}
            </p>
          </div>
          <span className="text-[14px] text-ink-300 font-mono">VS</span>
          <div className="text-center">
            <p className="text-[11px] text-ink-400 mb-1">{negateLabel}</p>
            <p className={`text-[28px] font-bold ${winner === negateLabel ? 'text-seal' : 'text-ink-500'}`}>
              {negateScore}
            </p>
          </div>
        </div>

        <div className="text-center mb-4">
          <p className="text-[13px] text-ink-700">
            获胜方：<span className="font-bold text-seal">{winner}</span>
          </p>
          <p className="text-[12px] text-ink-500 mt-1">
            MVP：<span className="font-medium">{mvpName}</span>
          </p>
        </div>

        {/* 精彩发言 */}
        <div className="p-3 bg-paper-dark/30 rounded-xl mb-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Star size={12} className="text-gold" />
            <span className="text-[11px] font-medium text-ink-600">精彩发言</span>
          </div>
          <p className="text-[12px] text-ink-500 leading-relaxed line-clamp-3">{highlight}</p>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleCollect}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all flex-1 ${
              isCollected
                ? 'bg-gold/10 text-gold border border-gold/20'
                : 'bg-paper-dark/50 text-ink-600 border border-line/20'
            }`}
          >
            {isCollected ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
            {isCollected ? '已收藏' : '收藏'}
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium bg-paper-dark/50 text-ink-600 border border-line/20 transition-all flex-1"
          >
            <Share2 size={14} />
            {copied ? '已复制' : '分享'}
          </button>
        </div>
      </div>
    </div>
  )
}
