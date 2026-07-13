/**
 * JudgeFeedPage — 判官模式主页
 *
 * 刷刷刷！案件一个一个刷，投票看结果，停不下来。
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Scale, BarChart3, RotateCcw, ChevronRight, Sprout } from 'lucide-react'
import JudgeCard from '../components/judge/JudgeCard'
import { getNextCase, submitVote, getStats, resetVotes } from '../services/judgeService'
import type { JudgeCase, JudgeVote } from '../types/judge'
import { useIsDesktop } from '../hooks/useIsDesktop'

export default function JudgeFeedPage() {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const [currentCase, setCurrentCase] = useState<JudgeCase | null>(null)
  const [seenIds, setSeenIds] = useState<string[]>([])
  const [stats, setStats] = useState(() => getStats())
  const [finished, setFinished] = useState(false)
  const [key, setKey] = useState(0) // force remount to reset animation

  // 加载下一个案件
  const loadNext = useCallback(() => {
    const next = getNextCase(seenIds)
    if (!next) {
      setFinished(true)
      setCurrentCase(null)
      return
    }
    setCurrentCase(next)
    setKey(prev => prev + 1)
  }, [seenIds])

  // 初始化
  useEffect(() => {
    setSeenIds([])
    loadNext()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleVote = (caseId: string, vote: JudgeVote) => {
    const updated = submitVote(caseId, vote)
    if (updated) {
      setCurrentCase(updated)
      setSeenIds(prev => [...prev, caseId])
      setStats(getStats())
    }
  }

  const handleNext = () => {
    loadNext()
  }

  const handleReset = () => {
    resetVotes()
    setSeenIds([])
    setFinished(false)
    setStats(getStats())
    const first = getNextCase([])
    setCurrentCase(first)
    setKey(prev => prev + 1)
  }

  return (
    <div className="flex flex-col min-h-full bg-paper-texture">
      {/* Header */}
      <div className={`px-5 pt-4 pb-2 flex items-center gap-3 ${isDesktop ? 'max-w-2xl mx-auto w-full' : ''}`}>
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 -ml-1.5 rounded-lg hover:bg-paper-dark transition-colors active:scale-95"
        >
          <ArrowLeft size={20} className="text-ink-700" />
        </button>
        <div className="flex-1">
          <h1 className="text-[17px] font-bold text-ink-900">判官模式</h1>
          <p className="text-[11px] text-ink-400">看纠纷 · 当判官 · 断是非</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-surface shadow-card">
          <Scale size={12} className="text-gold" />
          <span className="text-[11px] text-ink-500 font-medium">{stats.voted}/{stats.total}</span>
        </div>
      </div>

      {/* 进度条 */}
      <div className={`px-5 mb-3 ${isDesktop ? 'max-w-2xl mx-auto w-full' : ''}`}>
        <div className="h-1.5 bg-paper-dark rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-seal to-gold rounded-full transition-all duration-500"
            style={{ width: `${stats.total > 0 ? (stats.voted / stats.total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* 瓜田判官入口 */}
      <div className={`px-5 mb-3 ${isDesktop ? 'max-w-2xl mx-auto w-full' : ''}`}>
        <button
          onClick={() => navigate('/entertainment/judge/melon/melon-1')}
          className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/50 active:scale-[0.98] transition-transform"
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0">
            <Sprout size={18} className="text-white" />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-[13px] font-bold text-ink-900">瓜田判官</p>
            <p className="text-[11px] text-ink-400">看瓜站队，判真假</p>
          </div>
          <ChevronRight size={16} className="text-ink-300" />
        </button>
      </div>

      {/* 内容区 */}
      <div className={`flex-1 px-5 pb-8 ${isDesktop ? 'max-w-2xl mx-auto w-full' : ''}`}>
        {/* 统计卡片（已完成） */}
        {finished ? (
          <div className="space-y-4 animate-fade-in-up">
            <div className="bg-surface rounded-2xl shadow-card p-6 text-center">
              <BarChart3 size={32} className="text-ink-300 mx-auto mb-3" />
              <h2 className="text-[18px] font-bold text-ink-900 mb-1">今日判案完成！</h2>
              <p className="text-[13px] text-ink-500 mb-4">你已经审判了 {stats.total} 个案件</p>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="p-3 rounded-xl bg-seal/5 border border-seal/15">
                  <p className="text-[20px] font-bold text-seal">{stats.voted}</p>
                  <p className="text-[10px] text-seal/70">已判</p>
                </div>
                <div className="p-3 rounded-xl bg-gold/5 border border-gold/15">
                  <p className="text-[20px] font-bold text-gold">{stats.totalVotes.toLocaleString()}</p>
                  <p className="text-[10px] text-gold/70">总票数</p>
                </div>
                <div className="p-3 rounded-xl bg-ink-50 border border-ink-100/50">
                  <p className="text-[20px] font-bold text-ink-500">{stats.total}</p>
                  <p className="text-[10px] text-ink-400">案件数</p>
                </div>
              </div>

              <button
                onClick={handleReset}
                className="w-full py-3 rounded-xl bg-seal text-white font-semibold text-[13px] active:scale-[0.97] transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw size={14} />
                重新审判
              </button>

              <button
                onClick={() => navigate('/entertainment')}
                className="w-full py-3 mt-2 rounded-xl bg-paper-dark text-ink-500 font-medium text-[13px] active:scale-[0.97] transition-all"
              >
                返回娱乐大厅
              </button>
            </div>
          </div>
        ) : currentCase ? (
          <div key={key}>
            <JudgeCard caseData={currentCase} onVote={handleVote} onNext={handleNext} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-48">
            <p className="text-[13px] text-ink-400">加载中...</p>
          </div>
        )}
      </div>
    </div>
  )
}