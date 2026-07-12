/**
 * JudgeCard — 判官模式案件卡片
 *
 * 展示一个消费纠纷案件，提供投票按钮。
 * 投票前展示案件详情，投票后展示结果。
 */
import { useState } from 'react'
import { ThumbsUp, ThumbsDown, MessageCircle, Scale, ChevronDown, ChevronUp } from 'lucide-react'
import type { JudgeCase, JudgeVote } from '../../types/judge'

interface JudgeCardProps {
  caseData: JudgeCase
  onVote: (caseId: string, vote: JudgeVote) => void
  onNext: () => void
}

const CATEGORY_COLORS: Record<string, string> = {
  '外卖': 'bg-orange-100 text-orange-600',
  '电商': 'bg-blue-100 text-blue-600',
  '服务': 'bg-purple-100 text-purple-600',
  '生活': 'bg-green-100 text-green-600',
  '娱乐': 'bg-pink-100 text-pink-600',
}

export default function JudgeCard({ caseData, onVote }: JudgeCardProps) {
  const [showEvidence, setShowEvidence] = useState(false)
  const [voting, setVoting] = useState<JudgeVote | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [animatingOut, setAnimatingOut] = useState(false)

  const c = caseData
  const totalVotes = c.votes.support + c.votes.oppose + c.votes.skip
  const supportPercent = totalVotes ? Math.round((c.votes.support / totalVotes) * 100) : 0
  const opposePercent = totalVotes ? Math.round((c.votes.oppose / totalVotes) * 100) : 0

  const handleVote = (vote: JudgeVote) => {
    if (c.userVoted) return
    setVoting(vote)
    // 短暂延迟展示结果
    setTimeout(() => {
      setShowResult(true)
      onVote(c.id, vote)
    }, 300)
  }

  const handleNext = () => {
    setAnimatingOut(true)
    setShowResult(false)
    setVoting(null)
    setShowEvidence(false)
    // 延迟以播放动画
    setTimeout(() => {
      onNext()
    }, 300)
  }

  // 已投票模式
  if (c.userVoted && showResult) {
    const isSupport = c.userVoted === 'support'
    const isOppose = c.userVoted === 'oppose'
    const isSkip = c.userVoted === 'skip'
    const userPercent = isSupport ? supportPercent : isOppose ? opposePercent : 100 - supportPercent - opposePercent

    return (
      <div className="bg-surface rounded-2xl shadow-card border border-line/20 overflow-hidden animate-fade-in-up">
        {/* 结果头部 */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[c.category] || 'bg-ink-100 text-ink-500'}`}>
              {c.category}
            </span>
            <span className="text-[10px] text-ink-400">{c.scenario}</span>
          </div>
          <h2 className="text-[15px] font-bold text-ink-900 leading-snug mb-1">{c.title}</h2>
        </div>

        {/* 投票结果可视化 */}
        <div className="px-5 pb-4">
          {/* 赞成/反对条 */}
          <div className="h-10 rounded-xl overflow-hidden flex mb-3 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-seal to-seal-light flex items-center justify-center text-white text-[12px] font-bold transition-all duration-700"
              style={{ width: `${supportPercent}%` }}
            >
              {supportPercent > 8 ? `${supportPercent}%` : ''}
            </div>
            <div
              className="h-full bg-gradient-to-r from-bamboo to-bamboo/80 flex items-center justify-center text-white text-[12px] font-bold transition-all duration-700"
              style={{ width: `${opposePercent}%` }}
            >
              {opposePercent > 8 ? `${opposePercent}%` : ''}
            </div>
          </div>

          {/* 详细数据 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5">
              <ThumbsUp size={14} className="text-seal" />
              <span className="text-[13px] font-bold text-seal">{c.votes.support}</span>
              <span className="text-[10px] text-ink-400">合理</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-ink-400">吃瓜</span>
              <span className="text-[13px] font-bold text-ink-500">{c.votes.skip}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ThumbsDown size={14} className="text-bamboo" />
              <span className="text-[13px] font-bold text-bamboo">{c.votes.oppose}</span>
              <span className="text-[10px] text-ink-400">不合理</span>
            </div>
          </div>

          {/* 用户投票标记 */}
          <div className={`p-3 rounded-xl mb-3 text-center text-[12px] font-medium ${
            isSupport ? 'bg-seal/10 text-seal' : isOppose ? 'bg-bamboo/10 text-bamboo' : 'bg-ink-50 text-ink-500'
          }`}>
            {isSupport ? '👋 你认为合理' : isOppose ? '👎 你认为不合理' : '🍉 你选择了吃瓜'}
          </div>

          {/* AI 点评 */}
          {c.comment && (
            <div className="p-3 bg-gold/5 border border-gold/20 rounded-xl">
              <div className="flex items-center gap-1.5 mb-1">
                <Scale size={12} className="text-gold" />
                <span className="text-[10px] text-gold font-medium">AI 判官点评</span>
              </div>
              <p className="text-[12px] text-ink-700 leading-relaxed">{c.comment}</p>
            </div>
          )}
        </div>

        {/* 下一个 */}
        <button
          onClick={handleNext}
          className="w-full py-3.5 bg-seal text-white text-[13px] font-semibold active:scale-[1] transition-all flex items-center justify-center gap-2"
        >
          <span>下一个案件</span>
          <ChevronDown size={16} />
        </button>
      </div>
    )
  }

  // 投票前模式
  return (
    <div className={`bg-surface rounded-2xl shadow-card border border-line/20 overflow-hidden transition-all duration-300 ${animatingOut ? 'opacity-0 translate-y-8' : 'animate-fade-in-up'}`}>
      {/* 头部 */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[c.category] || 'bg-ink-100 text-ink-500'}`}>
            {c.category}
          </span>
          <span className="text-[10px] text-ink-400">{c.scenario}</span>
          <span className="text-[10px] text-ink-300 ml-auto">{c.heat} 人围观</span>
        </div>

        <h2 className="text-[16px] font-bold text-ink-900 leading-snug mb-2">{c.title}</h2>

        {/* 当事人 */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 p-2.5 bg-paper-dark/60 rounded-xl">
            <p className="text-[9px] text-ink-400 mb-0.5">投诉方</p>
            <p className="text-[12px] font-medium text-ink-800">{c.plaintiff}</p>
          </div>
          <div className="text-[20px] text-ink-300 font-bold">VS</div>
          <div className="flex-1 p-2.5 bg-paper-dark/60 rounded-xl">
            <p className="text-[9px] text-ink-400 mb-0.5">被投诉方</p>
            <p className="text-[12px] font-medium text-ink-800">{c.defendant}</p>
          </div>
        </div>

        {/* 详情 */}
        <p className="text-[13px] text-ink-700 leading-relaxed mb-3">{c.detail}</p>

        {/* 证据（可展开） */}
        {c.evidence.length > 0 && (
          <>
            <button
              onClick={() => setShowEvidence(!showEvidence)}
              className="flex items-center gap-1.5 text-[11px] text-ink-400 hover:text-ink-600 transition-colors mb-2"
            >
              <MessageCircle size={12} />
              <span>查看证据（{c.evidence.length}条）</span>
              {showEvidence ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {showEvidence && (
              <div className="space-y-2 mb-3 animate-fade-in-up">
                {c.evidence.map((ev, i) => (
                  <div key={i} className="p-2.5 bg-paper-dark/60 rounded-lg border border-line/10">
                    <p className="text-[10px] text-ink-400 font-medium mb-0.5">{ev.label}</p>
                    <p className="text-[12px] text-ink-700">{ev.content}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* 投票区 */}
      <div className="px-5 pb-5">
        <p className="text-[11px] text-ink-400 text-center mb-3">你觉得这个差评合理吗？</p>
        <div className="flex gap-3">
          <button
            onClick={() => handleVote('support')}
            className="flex-1 py-3.5 rounded-xl bg-seal/10 text-seal border-2 border-seal/20 font-semibold text-[13px] active:scale-[0.97] transition-all hover:bg-seal/20 flex items-center justify-center gap-2"
          >
            <ThumbsUp size={16} />
            合理
          </button>
          <button
            onClick={() => handleVote('skip')}
            className="py-3.5 px-4 rounded-xl bg-ink-50 text-ink-500 border-2 border-ink-100/50 font-semibold text-[13px] active:scale-[0.97] transition-all hover:bg-ink-100"
          >
            🍉
          </button>
          <button
            onClick={() => handleVote('oppose')}
            className="flex-1 py-3.5 rounded-xl bg-bamboo/10 text-bamboo border-2 border-bamboo/20 font-semibold text-[13px] active:scale-[0.97] transition-all hover:bg-bamboo/20 flex items-center justify-center gap-2"
          >
            <ThumbsDown size={16} />
            不合理
          </button>
        </div>
      </div>
    </div>
  )
}