import { useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, ThumbsUp, Sparkles, Send,
  Swords, FileText, Loader2, Check, Shield, AlertTriangle,
  Users, RefreshCw,
} from 'lucide-react'
import {
  polishArgument, generateDisputeReport,
  type Camp, type DebateArgument, type DisputeReport,
} from '../services/debateService'

// ===== Mock data =====

const MOCK_USERS = [
  { name: '逻辑怪', avatar: '' },
  { name: '吃瓜老手', avatar: '' },
  { name: '数据控', avatar: '' },
  { name: '理性派', avatar: '' },
  { name: '较真君', avatar: '' },
  { name: '围观群众', avatar: '' },
]

function getMockArgs(melonTitle: string): DebateArgument[] {
  // Generate plausible debate arguments based on the melon title
  const seed = melonTitle.length
  const trueArgs: DebateArgument[] = [
    {
      id: 't1', camp: 'true', author: MOCK_USERS[0].name, avatar: MOCK_USERS[0].avatar,
      content: '有业内人士爆料，该事件的核心当事人确实在相关场合出现过，多位独立信源可以交叉印证。',
      votes: 42 + (seed % 20), timestamp: '2小时前',
    },
    {
      id: 't2', camp: 'true', author: MOCK_USERS[2].name, avatar: MOCK_USERS[2].avatar,
      content: '从公开的时间线来看，事件发生的时间节点与相关方的行程完全吻合，巧合的概率极低。',
      votes: 35 + (seed % 15), timestamp: '1小时前',
    },
    {
      id: 't3', camp: 'true', author: MOCK_USERS[4].name, avatar: MOCK_USERS[4].avatar,
      content: '之前持否认态度的相关方，其声明措辞含糊，回避了核心问题，这通常是心虚的表现。',
      votes: 28 + (seed % 10), timestamp: '45分钟前',
    },
  ]
  const falseArgs: DebateArgument[] = [
    {
      id: 'f1', camp: 'false', author: MOCK_USERS[1].name, avatar: MOCK_USERS[1].avatar,
      content: '所谓"爆料"全部来自匿名账号，没有任何一手证据（截图、录音、文件），可信度存疑。',
      votes: 38 + (seed % 18), timestamp: '1.5小时前',
    },
    {
      id: 'f2', camp: 'false', author: MOCK_USERS[3].name, avatar: MOCK_USERS[3].avatar,
      content: '仔细分析传播链条，最早发布该消息的账号有造谣前科，且该账号近期流量异常，不排除是蹭热度。',
      votes: 31 + (seed % 12), timestamp: '1小时前',
    },
    {
      id: 'f3', camp: 'false', author: MOCK_USERS[5].name, avatar: MOCK_USERS[5].avatar,
      content: '同类话题在过去半年已经出现过至少三次，每次都是反转再反转，建议大家让子弹飞一会儿。',
      votes: 25 + (seed % 8), timestamp: '30分钟前',
    },
  ]
  return [...trueArgs, ...falseArgs]
}

// ===== Component =====

export default function DebateArena() {
  const { melonId: _melonId } = useParams<{ melonId: string }>()
  const navigate = useNavigate()
  const melonTitle = decodeURIComponent(useParams<{ title: string }>().title || '热门话题')

  const [args, setArgs] = useState<DebateArgument[]>(() => getMockArgs(melonTitle))
  const [activeCamp, setActiveCamp] = useState<Camp>('true')
  const [showForm, setShowForm] = useState(false)
  const [formCamp, setFormCamp] = useState<Camp>('true')
  const [formText, setFormText] = useState('')
  const [isPolishing, setIsPolishing] = useState(false)
  const [polishedText, setPolishedText] = useState<string | null>(null)
  const [votedArgs, setVotedArgs] = useState<Set<string>>(new Set())
  const [report, setReport] = useState<DisputeReport | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showReport, setShowReport] = useState(false)

  const trueArgs = args.filter(a => a.camp === 'true').sort((a, b) => b.votes - a.votes)
  const falseArgs = args.filter(a => a.camp === 'false').sort((a, b) => b.votes - a.votes)
  const trueVotes = trueArgs.reduce((s, a) => s + a.votes, 0)
  const falseVotes = falseArgs.reduce((s, a) => s + a.votes, 0)
  const totalVotes = trueVotes + falseVotes
  const truePercent = totalVotes > 0 ? Math.round((trueVotes / totalVotes) * 100) : 50

  // ---- Vote ----
  const handleVote = (argId: string) => {
    if (votedArgs.has(argId)) return
    setVotedArgs(prev => new Set(prev).add(argId))
    setArgs(prev => prev.map(a => a.id === argId ? { ...a, votes: a.votes + 1 } : a))
  }

  // ---- AI Polish ----
  const handlePolish = useCallback(async () => {
    if (!formText.trim() || isPolishing) return
    setIsPolishing(true)
    setPolishedText(null)
    try {
      const result = await polishArgument(formText.trim())
      setPolishedText(result)
    } catch {
      setPolishedText(formText.trim())
    } finally {
      setIsPolishing(false)
    }
  }, [formText, isPolishing])

  // ---- Submit argument ----
  const handleSubmitArg = () => {
    const finalText = polishedText || formText.trim()
    if (!finalText) return
    const newArg: DebateArgument = {
      id: `user-${Date.now()}`,
      camp: formCamp,
      content: finalText,
      originalContent: polishedText ? formText.trim() : undefined,
      author: '我',
      avatar: '',
      votes: 0,
      isPolished: !!polishedText,
      timestamp: '刚刚',
    }
    setArgs(prev => [...prev, newArg])
    setFormText('')
    setPolishedText(null)
    setShowForm(false)
    setActiveCamp(formCamp)
  }

  // ---- Generate report ----
  const handleGenerateReport = useCallback(async () => {
    if (isGenerating) return
    setIsGenerating(true)
    try {
      const result = await generateDisputeReport(melonTitle, trueArgs, falseArgs)
      setReport(result)
      setShowReport(true)
    } catch {
      // ignore
    } finally {
      setIsGenerating(false)
    }
  }, [melonTitle, trueArgs, falseArgs, isGenerating])

  const currentArgs = activeCamp === 'true' ? trueArgs : falseArgs

  return (
    <div className="flex flex-col min-h-full bg-paper-texture">
      {/* Header */}
      <div className="px-5 pt-4 pb-2 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 -ml-1.5 rounded-lg hover:bg-paper-dark transition-colors active:scale-95">
          <ArrowLeft size={20} className="text-ink-700" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[16px] font-bold text-ink-900 truncate">辩论场</h1>
          <p className="text-[11px] text-ink-400 truncate">{melonTitle}</p>
        </div>
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface shadow-card">
          <Users size={12} className="text-ink-400" />
          <span className="text-[11px] text-ink-500">{totalVotes}</span>
        </div>
      </div>

      <div className="flex-1 px-5 pb-6 overflow-y-auto space-y-4">
        {/* ===== Tug-of-war bar ===== */}
        <div className="bg-surface rounded-2xl shadow-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-bold text-seal">真 {truePercent}%</span>
            <Swords size={16} className="text-ink-300" />
            <span className="text-[13px] font-bold text-bamboo">假 {100 - truePercent}%</span>
          </div>
          <div className="h-4 rounded-full overflow-hidden flex bg-paper-dark">
            <div
              className="h-full bg-gradient-to-r from-seal to-seal-light transition-all duration-700 rounded-l-full"
              style={{ width: `${truePercent}%` }}
            />
            <div
              className="h-full bg-gradient-to-r from-bamboo to-bamboo/80 transition-all duration-700 rounded-r-full"
              style={{ width: `${100 - truePercent}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-[11px] text-ink-400">
            <span>{trueVotes} 票</span>
            <span>{falseVotes} 票</span>
          </div>
        </div>

        {/* ===== Camp tabs ===== */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveCamp('true')}
            className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
              activeCamp === 'true'
                ? 'bg-seal text-white shadow-seal-glow'
                : 'bg-surface text-ink-500 shadow-card'
            }`}
          >
            <Check size={14} />
            真方 ({trueArgs.length})
          </button>
          <button
            onClick={() => setActiveCamp('false')}
            className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
              activeCamp === 'false'
                ? 'bg-bamboo text-white'
                : 'bg-surface text-ink-500 shadow-card'
            }`}
          >
            <AlertTriangle size={14} />
            假方 ({falseArgs.length})
          </button>
        </div>

        {/* ===== Arguments list ===== */}
        <div className="space-y-2.5">
          {currentArgs.map((arg) => {
            const isVoted = votedArgs.has(arg.id)
            const isUser = arg.author === '我'
            return (
              <div
                key={arg.id}
                className={`bg-surface rounded-2xl shadow-card p-4 animate-fade-in-up ${
                  isUser ? 'border-l-3 border-l-gold' : ''
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white ${
                    arg.camp === 'true' ? 'bg-seal/80' : 'bg-bamboo/80'
                  }`}>
                    {arg.author[0]}
                  </div>
                  <span className="text-[12px] text-ink-700 font-semibold">{arg.author}</span>
                  <span className="text-[10px] text-ink-400">{arg.timestamp}</span>
                  {arg.isPolished && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-gold/10 text-gold font-medium">AI 润色</span>
                  )}
                </div>

                <p className="text-[13px] text-ink-900 leading-relaxed mb-3">{arg.content}</p>

                {arg.originalContent && (
                  <details className="mb-3">
                    <summary className="text-[10px] text-ink-400 cursor-pointer hover:text-ink-500">查看原文</summary>
                    <p className="text-[11px] text-ink-400 mt-1 leading-relaxed p-2 bg-paper-dark/50 rounded-lg">{arg.originalContent}</p>
                  </details>
                )}

                <button
                  onClick={() => handleVote(arg.id)}
                  disabled={isVoted}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all active:scale-95 ${
                    isVoted
                      ? 'bg-seal/10 text-seal'
                      : 'bg-paper-dark text-ink-500 hover:bg-seal/5 hover:text-seal'
                  }`}
                >
                  <ThumbsUp size={13} />
                  <span>{arg.votes}{isVoted ? ' 已支持' : ''}</span>
                </button>
              </div>
            )
          })}
        </div>

        {/* ===== Add argument ===== */}
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-4 rounded-2xl bg-surface shadow-card border-2 border-dashed border-line/30 text-[13px] text-ink-500 font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:border-seal/30 hover:text-seal"
          >
            <Send size={14} />
            发表论据
          </button>
        ) : (
          <div className="bg-surface rounded-2xl shadow-card p-4 space-y-3 animate-fade-in-up">
            <p className="text-[13px] text-ink-700 font-semibold">发表你的论据</p>

            {/* Camp selector */}
            <div className="flex gap-2">
              <button
                onClick={() => { setFormCamp('true'); setPolishedText(null) }}
                className={`flex-1 py-2 rounded-xl text-[12px] font-semibold transition-all ${
                  formCamp === 'true' ? 'bg-seal text-white' : 'bg-paper-dark text-ink-500'
                }`}
              >
                支持·真
              </button>
              <button
                onClick={() => { setFormCamp('false'); setPolishedText(null) }}
                className={`flex-1 py-2 rounded-xl text-[12px] font-semibold transition-all ${
                  formCamp === 'false' ? 'bg-bamboo text-white' : 'bg-paper-dark text-ink-500'
                }`}
              >
                支持·假
              </button>
            </div>

            {/* Text input */}
            <textarea
              value={formText}
              onChange={(e) => { setFormText(e.target.value); setPolishedText(null) }}
              placeholder="写下你的论据，可以很随意，AI 帮你润色..."
              rows={3}
              className="w-full text-[13px] text-ink-900 placeholder:text-ink-400 resize-none leading-relaxed bg-paper-dark/50 rounded-xl p-3 outline-none focus:ring-2 focus:ring-seal/20"
            />

            {/* Polished preview */}
            {polishedText && (
              <div className="p-3 bg-gold/5 border border-gold/20 rounded-xl animate-fade-in-up">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Sparkles size={12} className="text-gold" />
                  <span className="text-[11px] text-gold font-medium">AI 润色建议</span>
                </div>
                <p className="text-[12px] text-ink-700 leading-relaxed">{polishedText}</p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setFormText(polishedText)}
                    className="px-3 py-1 rounded-lg bg-gold/10 text-gold text-[11px] font-medium"
                  >
                    采用
                  </button>
                  <button
                    onClick={() => setPolishedText(null)}
                    className="px-3 py-1 rounded-lg bg-paper-dark text-ink-500 text-[11px] font-medium"
                  >
                    不用
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handlePolish}
                disabled={!formText.trim() || isPolishing}
                className="flex-1 py-2.5 rounded-xl bg-gold/10 text-gold text-[12px] font-medium flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-40"
              >
                {isPolishing ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                {isPolishing ? '润色中...' : 'AI 润色'}
              </button>
              <button
                onClick={handleSubmitArg}
                disabled={!formText.trim()}
                className={`flex-1 py-2.5 rounded-xl text-white text-[12px] font-semibold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-40 ${
                  formCamp === 'true' ? 'bg-seal' : 'bg-bamboo'
                }`}
              >
                <Send size={13} />
                提交
              </button>
              <button
                onClick={() => { setShowForm(false); setFormText(''); setPolishedText(null) }}
                className="py-2.5 px-3 rounded-xl bg-paper-dark text-ink-500 text-[12px] font-medium"
              >
                取消
              </button>
            </div>

            <p className="text-[9px] text-ink-300 text-center">
              AI 润色仅优化表达，不会改变你的观点 · 你也可以直接提交原文
            </p>
          </div>
        )}

        {/* ===== AI Dispute Report ===== */}
        {!showReport ? (
          <button
            onClick={handleGenerateReport}
            disabled={isGenerating || args.length < 4}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-seal/5 to-bamboo/5 border border-line/20 text-[13px] text-ink-700 font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:shadow-card disabled:opacity-40"
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="animate-spin text-seal" />
                AI 裁判分析中...
              </>
            ) : (
              <>
                <FileText size={16} className="text-seal" />
                AI 裁判复盘
              </>
            )}
          </button>
        ) : report && (
          <div className="space-y-3 animate-fade-in-up">
            <div className="bg-surface rounded-2xl shadow-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-seal" />
                  <span className="text-[14px] text-ink-900 font-bold">争议报告</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-ink-400">裁判信心</span>
                  <span className={`text-[14px] font-bold ${
                    report.confidence >= 70 ? 'text-seal' : report.confidence >= 50 ? 'text-gold' : 'text-ink-500'
                  }`}>
                    {report.confidence}%
                  </span>
                  <button onClick={() => { setShowReport(false); setReport(null) }} className="p-1 rounded hover:bg-paper-dark">
                    <RefreshCw size={12} className="text-ink-400" />
                  </button>
                </div>
              </div>

              {/* Summary */}
              <div className="p-3 bg-paper-dark/60 rounded-xl mb-3">
                <p className="text-[13px] text-ink-900 leading-relaxed">{report.summary}</p>
              </div>

              {/* Both sides */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="p-3 bg-seal/5 border border-seal/15 rounded-xl">
                  <p className="text-[11px] text-seal font-semibold mb-2">真方要点</p>
                  <div className="space-y-1.5">
                    {report.trueSideStrengths.map((s, i) => (
                      <p key={i} className="text-[11px] text-ink-700 leading-relaxed">· {s}</p>
                    ))}
                  </div>
                </div>
                <div className="p-3 bg-bamboo/5 border border-bamboo/15 rounded-xl">
                  <p className="text-[11px] text-bamboo font-semibold mb-2">假方要点</p>
                  <div className="space-y-1.5">
                    {report.falseSideStrengths.map((s, i) => (
                      <p key={i} className="text-[11px] text-ink-700 leading-relaxed">· {s}</p>
                    ))}
                  </div>
                </div>
              </div>

              {/* Weak points */}
              {report.weakPoints.length > 0 && (
                <div className="p-3 bg-gold/5 border border-gold/15 rounded-xl mb-3">
                  <p className="text-[11px] text-gold font-semibold mb-1.5">双方薄弱点</p>
                  {report.weakPoints.map((w, i) => (
                    <p key={i} className="text-[11px] text-ink-600 leading-relaxed">· {w}</p>
                  ))}
                </div>
              )}

              {/* Verdict */}
              <div className="p-3 bg-paper-dark/80 rounded-xl">
                <p className="text-[12px] text-ink-900 leading-relaxed font-medium">{report.verdict}</p>
              </div>
            </div>

            <div className="text-center py-2">
              <p className="text-[9px] text-ink-400 leading-relaxed">
                AI 裁判基于双方论据质量与社区投票生成报告<br />
                报告仅供参考，不代表事实真相
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
