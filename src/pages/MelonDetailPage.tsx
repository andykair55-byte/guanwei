import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Share2, Users, Clock, Check, ThumbsUp, ThumbsDown, Swords, AlertCircle, Heart, MessageSquare, FileText } from 'lucide-react'
import { api } from '../services/api'
import { transformMelon, transformReport, transformEvidenceList } from '../utils/transform'
import CommentSection from '../components/CommentSection'
import type { Melon, Report, Evidence } from '../types'

function formatCountdown(revealTime: string): string {
  const now = Date.now()
  const target = new Date(revealTime).getTime()
  const diff = target - now
  if (diff <= 0) return '已开奖'
  const totalMinutes = Math.floor(diff / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0) return `${hours}小时${minutes > 0 ? `${minutes}分` : ''}后开奖`
  if (minutes > 0) return `${minutes}分钟后开奖`
  return '即将开奖'
}

function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

const categoryColors: Record<string, string> = {
  '娱乐': 'bg-rose-500/90',
  '科技': 'bg-blue-500/90',
  '生活科普': 'bg-emerald-500/90',
  '社会热点': 'bg-amber-600/90',
  '历史': 'bg-violet-500/90',
  '财经': 'bg-cyan-600/90',
}

export default function MelonDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [melon, setMelon] = useState<Melon | null>(null)
  const [loading, setLoading] = useState(true)
  const [choice, setChoice] = useState<boolean | null>(null)
  const [evidence, setEvidence] = useState('')
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [showCopied, setShowCopied] = useState(false)
  const [report, setReport] = useState<Report | null>(null)
  const [evidences, setEvidences] = useState<Evidence[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [votedEvidence, setVotedEvidence] = useState<Record<string, 'up' | 'down'>>({})
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [liking, setLiking] = useState(false)

  const melonId = Number(id)

  const fetchMelonDetail = useCallback(async () => {
    if (!melonId) return
    try {
      setLoading(true)
      const apiMelon: any = await api.getMelon(melonId)
      const transformed = transformMelon(apiMelon)
      setMelon(transformed)
      setLiked(transformed.isLiked)
      setLikeCount(transformed.likeCount)

      try {
        const myGuess: any = await api.getMyGuess(melonId)
        if (myGuess?.guess) {
          setChoice(myGuess.guess.choice)
          setHasSubmitted(true)
          if (myGuess.evidence) setEvidence(myGuess.evidence.content || '')
        }
      } catch { /* 未猜过 */ }

      if (transformed.status === 'revealed') {
        try {
          const apiReport: any = await api.getReport(melonId)
          setReport(transformReport(apiReport))
        } catch { /* 报告获取失败 */ }

        try {
          const apiEvidences: any = await api.getEvidences(melonId)
          const evidenceList = apiEvidences.list || apiEvidences || []
          setEvidences(transformEvidenceList(evidenceList))
        } catch { /* 佐证获取失败 */ }
      }
    } catch (e) {
      console.error('获取瓜详情失败:', e)
    } finally {
      setLoading(false)
    }
  }, [melonId])

  useEffect(() => { fetchMelonDetail() }, [fetchMelonDetail])

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShowCopied(true)
      setTimeout(() => setShowCopied(false), 2000)
    } catch {
      const input = document.createElement('input')
      input.value = window.location.href
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setShowCopied(true)
      setTimeout(() => setShowCopied(false), 2000)
    }
  }

  const handleSubmit = async () => {
    if (choice === null || submitting) return
    setSubmitting(true)
    try {
      await api.submitGuess(melonId, choice, evidence || undefined)
      setHasSubmitted(true)
    } catch (e: any) {
      alert(e.message || '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleVote = async (evId: string, direction: 'up' | 'down') => {
    if (votedEvidence[evId]) return
    setVotedEvidence(prev => ({ ...prev, [evId]: direction }))
    try {
      if (direction === 'up') await api.upvoteEvidence(Number(evId))
      else await api.downvoteEvidence(Number(evId))
    } catch { /* ignore */ }
  }

  const handleLike = async () => {
    if (liking) return
    setLiking(true)
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikeCount(prev => wasLiked ? prev - 1 : prev + 1)
    try {
      await api.likeMelon(melonId)
    } catch {
      setLiked(wasLiked)
      setLikeCount(prev => wasLiked ? prev + 1 : prev - 1)
    } finally {
      setLiking(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-paper-texture">
        <div className="skeleton h-[200px] rounded-none" />
        <div className="p-5 space-y-3">
          <div className="skeleton h-6 w-3/4" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-2/3" />
        </div>
      </div>
    )
  }

  if (!melon) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-paper-texture">
        <div className="w-16 h-16 rounded-xl bg-paper-dark flex items-center justify-center mb-4">
          <AlertCircle size={28} className="text-ink-400" />
        </div>
        <p className="text-ink-500 text-sm mb-4 font-medium">该瓜不存在或已被删除</p>
        <button
          onClick={() => navigate('/melon')}
          className="px-5 py-2.5 bg-seal text-white rounded-xl text-sm font-medium shadow-seal-glow"
        >
          返回瓜田
        </button>
      </div>
    )
  }

  const truePercent = melon.totalParticipants > 0
    ? Math.round((melon.trueCount / melon.totalParticipants) * 100)
    : 50
  const falsePercent = 100 - truePercent
  const isRevealed = melon.status === 'revealed'
  const catColor = categoryColors[melon.category] || 'bg-seal/90'

  return (
    <div className="min-h-screen bg-paper-texture pb-8">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-20 glass border-b border-line/50">
        <div className="flex items-center h-12 px-4 max-w-[480px] mx-auto">
          <button onClick={() => navigate('/melon')} className="flex items-center gap-1 text-ink-700 text-sm active:opacity-60">
            <ArrowLeft size={18} />
            <span>返回</span>
          </button>
          <div className="flex-1" />
          <button onClick={handleShare} className="flex items-center gap-1 text-ink-700 text-sm active:opacity-60">
            <Share2 size={18} />
            {showCopied && <span className="text-seal text-xs font-medium">已复制</span>}
          </button>
        </div>
      </div>

      <div className="max-w-[480px] mx-auto">
        {/* 封面 */}
        <div className="relative">
          <img src={melon.coverImage} alt={melon.title} className="w-full h-52 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <span className={`absolute top-3 left-3 px-2.5 py-1 text-[11px] font-medium text-white rounded-lg ${catColor} backdrop-blur-sm`}>
            {melon.category}
          </span>
        </div>

        {/* 标题 & 描述 */}
        <div className="px-5 pt-4 pb-3">
          <h1 className="text-[18px] font-bold text-ink-900 leading-snug mb-2">{melon.title}</h1>
          <p className="text-[14px] text-ink-500 leading-relaxed">{melon.description}</p>

          {/* 互动数据 */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-line/30">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 text-[13px] transition-all active:scale-90 ${
                liked ? 'text-seal font-medium' : 'text-ink-400'
              }`}
            >
              <Heart size={16} className={liked ? 'fill-seal' : ''} />
              <span>{formatCount(likeCount)}</span>
            </button>
            <div className="flex items-center gap-1.5 text-ink-400 text-[13px]">
              <FileText size={15} />
              <span>{melon.evidenceCount}条佐证</span>
            </div>
            <div className="flex items-center gap-1.5 text-ink-400 text-[13px]">
              <MessageSquare size={15} />
              <span>{melon.commentCount}条讨论</span>
            </div>
          </div>
        </div>

        {/* 参与情况 */}
        <div className="mx-5 p-4 bg-surface rounded-xl shadow-card">
          <h2 className="text-[13px] font-semibold text-ink-500 mb-3">参与情况</h2>

          <div className="flex gap-4 mb-3">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[13px] font-semibold text-seal">真 {truePercent}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden bg-paper-dark">
                <div className="h-full bg-seal rounded-full transition-all duration-500" style={{ width: `${truePercent}%` }} />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[13px] font-semibold text-bamboo">假 {falsePercent}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden bg-paper-dark">
                <div className="h-full bg-bamboo rounded-full transition-all duration-500" style={{ width: `${falsePercent}%` }} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[12px] text-ink-400">
            <div className="flex items-center gap-1">
              <Users size={13} />
              <span>{formatCount(melon.totalParticipants)}人参与</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={13} />
              <span>{formatCountdown(melon.revealTime)}</span>
            </div>
          </div>
        </div>

        {/* 辩论场入口 */}
        <div className="mx-5 mt-4">
          <button
            onClick={() => navigate(`/debate/${melon.id}/${encodeURIComponent(melon.title)}`)}
            className="w-full p-4 bg-surface rounded-xl shadow-card active:scale-[0.98] transition-all flex items-center gap-3 hover:shadow-card-hover group"
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-seal to-bamboo flex items-center justify-center shadow-seal-glow">
              <Swords size={20} className="text-white" />
            </div>
            <div className="flex-1 text-left">
              <span className="text-[13px] text-ink-900 font-semibold block">进入辩论场</span>
              <span className="text-[11px] text-ink-400">真方 vs 假方，用论据说话</span>
            </div>
            <span className="text-[10px] text-seal font-medium bg-seal/8 px-2 py-1 rounded-lg">HOT</span>
          </button>
        </div>

        {/* 猜测 / 开奖 */}
        {!isRevealed ? (
          <div className="mx-5 mt-4 p-4 bg-surface rounded-xl shadow-card">
            <h2 className="text-[14px] font-semibold text-ink-700 mb-4">你的判断是什么？</h2>

            <div className="flex gap-3 mb-4">
              <button
                onClick={() => !hasSubmitted && setChoice(true)}
                className={`flex-1 py-3.5 rounded-xl border-2 font-semibold text-[15px] transition-all flex items-center justify-center gap-2 active:scale-[0.97] ${
                  choice === true
                    ? 'bg-seal border-seal text-white shadow-seal-glow'
                    : 'bg-transparent border-line text-ink-700'
                } ${hasSubmitted ? 'cursor-not-allowed opacity-80' : ''}`}
              >
                {choice === true && <Check size={18} />}
                真
              </button>
              <button
                onClick={() => !hasSubmitted && setChoice(false)}
                className={`flex-1 py-3.5 rounded-xl border-2 font-semibold text-[15px] transition-all flex items-center justify-center gap-2 active:scale-[0.97] ${
                  choice === false
                    ? 'bg-bamboo border-bamboo text-white'
                    : 'bg-transparent border-line text-ink-700'
                } ${hasSubmitted ? 'cursor-not-allowed opacity-80' : ''}`}
              >
                {choice === false && <Check size={18} />}
                假
              </button>
            </div>

            {choice !== null && !hasSubmitted && (
              <div className="mb-4">
                <label className="block text-[12px] text-ink-400 mb-1.5">填写佐证（选填）</label>
                <textarea
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value.slice(0, 500))}
                  placeholder="说说你判断的依据..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-paper-dark text-[13px] text-ink-700 placeholder:text-ink-400 resize-none leading-relaxed"
                />
                <div className="text-right text-[11px] text-ink-400 mt-1">{evidence.length}/500</div>
              </div>
            )}

            {hasSubmitted ? (
              <div className="flex items-center justify-center gap-2 py-3.5 bg-bamboo/10 text-bamboo rounded-xl font-medium text-[13px]">
                <Check size={16} />
                <span>已提交，等待开奖</span>
              </div>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={choice === null || submitting}
                className="w-full py-3.5 rounded-xl font-semibold text-[14px] text-white bg-seal active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-seal-glow"
              >
                {submitting ? '提交中...' : '提交判断'}
              </button>
            )}
          </div>
        ) : (
          <div className="mx-5 mt-4 space-y-4">
            {/* 开奖结果 */}
            <div className="p-5 bg-surface rounded-xl shadow-card text-center">
              <p className="text-[12px] text-ink-400 mb-2 font-medium">开奖结果</p>
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-xl text-2xl font-bold ${
                melon.result === true ? 'bg-seal/10 text-seal' : 'bg-bamboo/10 text-bamboo'
              }`}>
                {melon.result === true ? '真' : '假'}
              </div>
            </div>

            {/* 实锤报告 */}
            {report && (
              <div className="p-4 bg-surface rounded-xl shadow-card">
                <h3 className="text-[14px] font-semibold text-ink-700 mb-3">实锤报告</h3>
                <div className="p-4 bg-paper-dark/80 rounded-xl">
                  <p className="text-[13px] text-ink-900 leading-relaxed mb-2">{report.tendency}</p>
                  <p className="text-[11px] text-ink-400">{report.disclaimer}</p>
                </div>

                {/* 证据链 */}
                {report.evidenceChain.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-[12px] font-semibold text-ink-500 mb-2">证据链</h4>
                    <div className="space-y-2">
                      {report.evidenceChain.map((ev, i) => (
                        <div key={i} className="flex items-start gap-2.5 p-2.5 bg-paper-dark/60 rounded-lg">
                          <div className="w-5 h-5 rounded-full bg-seal/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-[10px] text-seal font-bold">{i + 1}</span>
                          </div>
                          <div>
                            <p className="text-[12px] text-ink-900 font-medium">{ev.description}</p>
                            <p className="text-[10px] text-ink-400 mt-0.5">来源：{ev.source}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 佐证排行榜 */}
            {evidences.length > 0 && (
              <div className="p-4 bg-surface rounded-xl shadow-card">
                <h3 className="text-[14px] font-semibold text-ink-700 mb-3 flex items-center gap-2">
                  佐证排行
                  <span className="text-[11px] text-ink-400 font-normal">{evidences.length}条佐证</span>
                </h3>
                <div className="flex flex-col gap-2">
                  {[...evidences]
                    .sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes))
                    .slice(0, 8)
                    .map((ev, rank) => {
                      const netScore = ev.upvotes - ev.downvotes + (votedEvidence[ev.id] === 'up' ? 1 : 0) - (votedEvidence[ev.id] === 'down' ? 1 : 0)
                      const isTop3 = rank < 3
                      const medalColors = [
                        'bg-amber-400 text-white',      // 金
                        'bg-gray-300 text-white',        // 银
                        'bg-amber-600 text-white',       // 铜
                      ]
                      return (
                        <div
                          key={ev.id}
                          className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${
                            ev.isBest ? 'bg-seal/5 border border-seal/15' : 'bg-paper-dark/40 hover:bg-paper-dark/60'
                          }`}
                        >
                          {/* 排名 */}
                          <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                            isTop3 ? medalColors[rank] : 'bg-line/40 text-ink-400'
                          }`}>
                            {rank + 1}
                          </div>

                          {/* 内容 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <img src={ev.userAvatar} alt={ev.userNickname} className="w-5 h-5 rounded-full bg-paper" />
                              <span className="text-[12px] text-ink-700 font-medium truncate">{ev.userNickname}</span>
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                ev.direction ? 'bg-seal/10 text-seal' : 'bg-bamboo/10 text-bamboo'
                              }`}>
                                {ev.direction ? '真' : '假'}
                              </span>
                              {ev.isBest && (
                                <span className="text-[10px] font-medium text-gold">最佳</span>
                              )}
                            </div>
                            <p className="text-[13px] text-ink-900 leading-relaxed mb-2">{ev.content}</p>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleVote(ev.id, 'up')}
                                className={`flex items-center gap-1 text-[11px] transition-colors ${
                                  votedEvidence[ev.id] === 'up' ? 'text-seal font-medium' : 'text-ink-400'
                                }`}
                              >
                                <ThumbsUp size={12} />
                                <span>{ev.upvotes + (votedEvidence[ev.id] === 'up' ? 1 : 0)}</span>
                              </button>
                              <button
                                onClick={() => handleVote(ev.id, 'down')}
                                className={`flex items-center gap-1 text-[11px] transition-colors ${
                                  votedEvidence[ev.id] === 'down' ? 'text-bamboo font-medium' : 'text-ink-400'
                                }`}
                              >
                                <ThumbsDown size={12} />
                                <span>{ev.downvotes}</span>
                              </button>
                              <span className="text-[10px] text-ink-faint ml-auto">得分 {netScore}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 讨论区 */}
        <div className="mx-5 mt-4 bg-surface rounded-xl border border-line/30">
          <CommentSection melonId={String(melonId)} />
        </div>
      </div>
    </div>
  )
}
