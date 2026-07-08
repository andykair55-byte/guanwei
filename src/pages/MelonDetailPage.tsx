import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Share2, Users, Clock, Check, ThumbsUp, ThumbsDown, Swords, AlertCircle, Heart, MessageSquare, FileText, ChevronDown, Flame, Eye, Link2, PenLine } from 'lucide-react'
import { api } from '../services/api'
import { transformMelon, transformReport, transformEvidenceList } from '../utils/transform'
import { generateMockEvidence, generateMockReport } from '../services/mockData'
import CommentSection from '../components/CommentSection'
import VerificationNoteSection from '../components/VerificationNoteSection'
import { usePlatform } from '../hooks/usePlatform'
import type { Melon, Report, Evidence } from '../types'

// 基于 melonId 生成稳定的"投稿人"信息（API 暂未返回 creator 详情）
const SUBMITTERS = [
  { name: '瓜田观察员', avatar: 'https://picsum.photos/seed/sub1/80/80', badge: '资深吃瓜' },
  { name: '真相猎人', avatar: 'https://picsum.photos/seed/sub2/80/80', badge: '鉴瓜达人' },
  { name: '理性派代表', avatar: 'https://picsum.photos/seed/sub3/80/80', badge: '热心用户' },
  { name: '八卦前线', avatar: 'https://picsum.photos/seed/sub4/80/80', badge: '消息灵通' },
]

function getSubmitter(id: number) {
  return SUBMITTERS[(id - 1) % SUBMITTERS.length]
}

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
  const { isWeb } = usePlatform()
  const wrap = isWeb ? 'max-w-3xl mx-auto px-6' : 'max-w-[480px] mx-auto'

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
  const [noteTab, setNoteTab] = useState<'notes' | 'comments'>('notes')
  const [showInteract, setShowInteract] = useState(true)

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
        } catch {
          const mockReport = generateMockReport(String(melonId), transformed.result ?? true)
          setReport(mockReport)
        }
      }

      // 证据始终加载（待开奖时也展示，体现社区已收集的信息）
      try {
        const apiEvidences: any = await api.getEvidences(melonId)
        const evidenceList = apiEvidences.list || apiEvidences || []
        if (Array.isArray(evidenceList) && evidenceList.length > 0) {
          setEvidences(transformEvidenceList(evidenceList))
        } else {
          throw new Error('empty')
        }
      } catch {
        const mockEvidences = generateMockEvidence(String(melonId))
        setEvidences(mockEvidences.map((ev, i) => ({
          ...ev,
          id: `ev_mock_${i}`,
        })))
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
        <div className={`flex items-center h-12 px-4 ${wrap}`}>
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

      <div className={wrap}>
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

          {/* 投稿人信息 */}
          {(() => {
            const submitter = getSubmitter(melonId)
            return (
              <div className="flex items-center gap-3 mt-4 p-3 bg-surface rounded-xl shadow-card border border-line/20">
                <img
                  src={submitter.avatar}
                  alt={submitter.name}
                  className="w-10 h-10 rounded-full bg-paper-dark ring-1 ring-line/40 cursor-pointer hover:ring-seal/50 transition-all"
                  width={40}
                  height={40}
                  onClick={() => navigate(`/user/${submitter.name}`)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[14px] font-semibold text-ink-900 truncate">{submitter.name}</p>
                    <span className="text-[10px] text-gold bg-gold/10 px-1.5 py-0.5 rounded font-medium flex-shrink-0">{submitter.badge}</span>
                  </div>
                  <p className="text-[11px] text-ink-500 mt-0.5">
                    {new Date(melon.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })} 投稿
                  </p>
                </div>
                <button className="px-3.5 py-1.5 rounded-lg bg-seal text-white text-[13px] font-bold press-pop">
                  关注
                </button>
              </div>
            )
          })()}

          {/* 流量指标 */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-seal/10 text-seal text-[11px] font-bold">
              <Flame size={11} />
              热度 {formatCount(melon.totalParticipants * 8 + likeCount * 3)}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-paper-dark text-ink-500 text-[11px] font-medium">
              <Eye size={11} />
              {formatCount(melon.totalParticipants * 12 + 580)}次浏览
            </span>
            {!isRevealed && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gold/10 text-gold text-[11px] font-bold">
                <Clock size={11} />
                {formatCountdown(melon.revealTime)}
              </span>
            )}
          </div>

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
            <div className="flex items-center gap-1.5 text-ink-400 text-[13px] ml-auto">
              <Users size={15} />
              <span>{formatCount(melon.totalParticipants)}人参与</span>
            </div>
          </div>
        </div>

        {/* 文章正文 */}
        <div className="px-5 pb-2">
          <h2 className="text-[16px] font-bold text-ink-900 mb-3 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-seal" />
            事件详情
          </h2>
          <div className="text-[15px] text-ink-800 leading-[1.8] space-y-4">
            <p>{melon.description}</p>
            <p>
              该事件在网上持续发酵，引发了广泛讨论。目前各方说法不一，有网友提供了相关截图和证据，
              也有当事人进行了回应。以下是目前已知的关键信息梳理，供大家参考判断。
            </p>
            <p className="font-semibold text-ink-900">关键争议点：</p>
            <ul className="space-y-2 pl-1">
              <li className="flex items-start gap-2">
                <span className="text-seal font-bold mt-0.5 flex-shrink-0">·</span>
                <span>信息来源是否可靠，原始出处仍有待考证</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-seal font-bold mt-0.5 flex-shrink-0">·</span>
                <span>部分细节存在矛盾，时间线尚未完全对齐</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-seal font-bold mt-0.5 flex-shrink-0">·</span>
                <span>当事人回应与网传信息存在出入，需进一步核实</span>
              </li>
            </ul>
            <div className="bg-paper-dark rounded-xl p-3.5 border border-line/30 mt-4">
              <p className="text-[13px] text-ink-600 leading-relaxed">
                💡 以上信息整理自网络公开资料，仅供参考。欢迎在下方贡献求证笔记，提供更多来源和上下文。
              </p>
            </div>
          </div>
        </div>

        {/* 社区佐证预览（始终可见，类似 Community Notes） */}
        {evidences.length > 0 && (
          <div className="mx-5 mt-4">
            <div className="bg-surface rounded-xl shadow-card border border-line/20 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-line/20">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-seal/10 flex items-center justify-center">
                    <Link2 size={14} className="text-seal" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold text-ink-900">社区佐证</h3>
                    <p className="text-[10px] text-ink-500">来自用户的证据贡献 · 共 {evidences.length} 条</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline text-[11px] text-seal font-medium bg-seal/8 px-2 py-0.5 rounded">
                    Community Notes
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate(`/create?melonId=${melon.id}&title=${encodeURIComponent(melon.title)}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-seal text-white text-[12px] font-medium hover:bg-seal/90 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-seal/40 motion-reduce:transition-none"
                  >
                    <PenLine size={13} />
                    写分析
                  </button>
                </div>
              </div>
              <div className="divide-y divide-line/15">
                {[...evidences]
                  .sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes))
                  .slice(0, 3)
                  .map((ev) => (
                    <div key={ev.id} className="px-4 py-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <img
                          src={ev.userAvatar}
                          alt={ev.userNickname}
                          className="w-5 h-5 rounded-full bg-paper cursor-pointer hover:ring-1 hover:ring-seal/50 transition-all"
                          width={20}
                          height={20}
                          onClick={() => navigate(`/user/${ev.userNickname}`)}
                        />
                        <span className="text-[12px] text-ink-700 font-medium">{ev.userNickname}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          ev.direction ? 'bg-seal/10 text-seal' : 'bg-bamboo/10 text-bamboo'
                        }`}>
                          认为{ev.direction ? '真' : '假'}
                        </span>
                        {ev.isBest && (
                          <span className="text-[10px] text-gold bg-gold/10 px-1.5 py-0.5 rounded font-medium">最佳</span>
                        )}
                        <span className="text-[10px] text-ink-400 ml-auto flex items-center gap-0.5">
                          <ThumbsUp size={10} />
                          {ev.upvotes}
                        </span>
                      </div>
                      <p className="text-[13px] text-ink-800 leading-relaxed">{ev.content}</p>
                    </div>
                  ))}
              </div>
              <button className="w-full py-2.5 text-[12px] text-seal font-medium bg-seal/5 hover:bg-seal/10 transition-colors">
                查看全部 {evidences.length} 条佐证 →
              </button>
            </div>
          </div>
        )}

        {/* 参与互动（折叠区） */}
        <div className="mx-5 mt-4">
          <button
            onClick={() => setShowInteract(!showInteract)}
            className="w-full p-4 bg-surface rounded-xl shadow-card flex items-center gap-3 press-pop hover:shadow-card-hover transition-all"
          >
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[14px] font-bold text-ink-900">参与互动</span>
                {!isRevealed && (
                  <span className="text-[10px] text-seal font-medium bg-seal/10 px-1.5 py-0.5 rounded">{formatCountdown(melon.revealTime)}</span>
                )}
              </div>
              {/* 紧凑比例条 */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-seal">真 {truePercent}%</span>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-paper-dark flex">
                  <div className="h-full bg-seal transition-all duration-500" style={{ width: `${truePercent}%` }} />
                  <div className="h-full bg-bamboo transition-all duration-500" style={{ width: `${falsePercent}%` }} />
                </div>
                <span className="text-[11px] font-semibold text-bamboo">假 {falsePercent}%</span>
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-ink-500">
                <span className="flex items-center gap-1"><Users size={11} />{formatCount(melon.totalParticipants)}人参与</span>
                {hasSubmitted && <span className="text-bamboo font-medium">✓ 已参与</span>}
              </div>
            </div>
            <ChevronDown size={18} className={`text-ink-400 transition-transform flex-shrink-0 ${showInteract ? 'rotate-180' : ''}`} />
          </button>

          {/* 展开后的内容 */}
          {showInteract && (
            <div className="mt-2 space-y-4 animate-fade-in-up">
              {/* 猜测 / 开奖 */}
              {!isRevealed ? (
                <div className="p-4 bg-surface rounded-xl shadow-card border border-line/30">
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
                <div className="space-y-4">
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
                              'bg-amber-400 text-white',
                              'bg-gray-300 text-white',
                              'bg-amber-600 text-white',
                            ]
                            return (
                              <div
                                key={ev.id}
                                className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${
                                  ev.isBest ? 'bg-seal/5 border border-seal/15' : 'bg-paper-dark/40 hover:bg-paper-dark/60'
                                }`}
                              >
                                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                                  isTop3 ? medalColors[rank] : 'bg-line/40 text-ink-400'
                                }`}>
                                  {rank + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <img
                                      src={ev.userAvatar}
                                      alt={ev.userNickname}
                                      className="w-5 h-5 rounded-full bg-paper cursor-pointer hover:ring-1 hover:ring-seal/50 transition-all"
                                      onClick={() => navigate(`/user/${ev.userNickname}`)}
                                    />
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

              {/* 辩论场 — 显示该话题的辩论房间数 */}
              {(() => {
                // 模拟该话题的辩论房间数据
                const seed = (melonId || 0) % 7
                const roomCounts = [2, 1, 3, 0, 1, 2, 2]
                const totalSpectators = [328, 156, 892, 0, 210, 128, 1024]
                const rooms = roomCounts[seed]
                const spectators = totalSpectators[seed]
                const hasDebates = rooms > 0
                return (
                  <div className="p-4 bg-surface rounded-xl shadow-card border border-line/30">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-seal to-bamboo flex items-center justify-center shadow-seal-glow flex-shrink-0">
                        <Swords size={16} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <span className="text-[14px] text-ink-900 font-bold">辩论场</span>
                        <span className="text-[11px] text-ink-500 ml-2">
                          {hasDebates
                            ? `${rooms}个房间 · ${spectators}人在讨论`
                            : '暂未开房'}
                        </span>
                      </div>
                    </div>
                    {hasDebates && (
                      <button
                        onClick={() => navigate(`/debate/${melon.id}/${encodeURIComponent(melon.title)}`)}
                        className="w-full py-2.5 rounded-xl bg-seal text-white text-[13px] font-bold press-pop transition-all flex items-center justify-center gap-2 shadow-seal-glow hover:bg-seal-dark"
                      >
                        <Swords size={15} />
                        加入辩论
                        <span className="text-white/70 text-[11px] font-normal">· 共{spectators}人在线</span>
                      </button>
                    )}
                  </div>
                )
              })()}
            </div>
          )}
        </div>

        {/* 求证笔记 / 讨论区 Tab */}
        <VerificationNoteSection
          melonId={String(melonId)}
          melonTitle={melon.title}
          activeTab={noteTab}
          onTabChange={setNoteTab}
        />
        {noteTab === 'comments' && (
          <div className="mx-5 mt-2 bg-surface rounded-xl border border-line/30">
            <CommentSection melonId={String(melonId)} />
          </div>
        )}
      </div>
    </div>
  )
}
