import { useState, useEffect, useRef, type ElementType } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, Send, Swords, Trophy, RotateCcw,
  Shield, BarChart3, Search, Target, Lightbulb, BookOpen, RefreshCw, Smile, Brain,
} from 'lucide-react'
import CharacterIcon from '../components/CharacterIcon'
import { getTopic, TOPICS, type ThinkingStep, type RoundScore } from '../services/debateArenaService'
import { getCharacter } from '../services/characters'
import { useDeviceFrame } from '../contexts/DeviceFrameContext'

function useIsDesktop() {
  const { inDeviceFrame } = useDeviceFrame()
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768)
  useEffect(() => {
    if (inDeviceFrame) return
    const handler = () => setIsDesktop(window.innerWidth >= 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [inDeviceFrame])
  return inDeviceFrame ? false : isDesktop
}

// ===== Types =====

interface BattleRound {
  round: number
  userContent: string
  aiThinking?: ThinkingStep[]
  aiContent: string
  score?: RoundScore
}

// ===== Icon Map =====

const THINKING_ICON_MAP: Record<string, ElementType> = {
  '📊': BarChart3, '🔍': Search, '⚔️': Swords, '🎯': Target,
  '💡': Lightbulb, '📖': BookOpen, '🔄': RefreshCw, '😏': Smile, '💭': Brain,
}

// ===== Component =====

export default function AIBattle() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const opponentId = searchParams.get('negate') || 'xiezhi'
  const topicId = searchParams.get('topic') || 'college'
  const topic = getTopic(topicId) || TOPICS[0]
  const opponent = getCharacter(opponentId)

  // User is affirm, AI is negate

  const [rounds, setRounds] = useState<BattleRound[]>([])
  const [currentInput, setCurrentInput] = useState('')
  const [isAiThinking, setIsAiThinking] = useState(false)
  const [aiThinkingSteps, setAiThinkingSteps] = useState<ThinkingStep[]>([])
  const [roundNumber, setRoundNumber] = useState(1)
  const [battleStarted, setBattleStarted] = useState(false)
  const [battleEnded, setBattleEnded] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [hasVoted, setHasVoted] = useState<'user' | 'ai' | null>(null)
  const [userVotes, setUserVotes] = useState(834 + Math.floor(Math.random() * 300))
  const [aiVotes, setAiVotes] = useState(912 + Math.floor(Math.random() * 300))

  const chatEndRef = useRef<HTMLDivElement>(null)
  const TOTAL_ROUNDS = 4

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [rounds, isAiThinking, aiThinkingSteps])

  // Generate AI thinking steps based on character personality
  const generateThinkingSteps = (_round: number): ThinkingStep[] => {
    const styles: Record<string, ThinkingStep[][]> = {
      baize: [
        [
          { icon: '📊', label: '调取数据', content: '搜索相关统计数据和研究报告……' },
          { icon: '🔍', label: '分析论点', content: '用户的论证有一个有趣的切入点，但数据支撑不足' },
          { icon: '⚔️', label: '制定策略', content: '用更完整的数据链来回应，同时肯定对方的合理部分' },
        ],
      ],
      xiezhi: [
        [
          { icon: '🔍', label: '扫描论证', content: '逐句分析用户的逻辑链条……' },
          { icon: '💡', label: '发现漏洞', content: '这里有个逻辑跳跃——前提和结论之间缺了一环' },
          { icon: '⚔️', label: '准备反击', content: '用归谬法揭示这个逻辑漏洞的荒谬之处' },
        ],
      ],
      zhulong: [
        [
          { icon: '📖', label: '搜索案例', content: '寻找与辩题相关的真实故事和案例……' },
          { icon: '💭', label: '共情分析', content: '用户的论点有道理，但缺少对人的关怀' },
          { icon: '⚔️', label: '构思故事', content: '用一个普通人的故事来回应，比数据更有说服力' },
        ],
      ],
      qiongqi: [
        [
          { icon: '🔄', label: '翻转视角', content: '从完全相反的角度重新审视用户的论点……' },
          { icon: '😏', label: '发现盲点', content: '用户的论证基于一个未经检验的假设' },
          { icon: '⚔️', label: '设置陷阱', content: '先假装同意，然后推导出荒谬结论' },
        ],
      ],
    }
    const charStyles = styles[opponent.id] || styles.xiezhi!
    return charStyles[0]
  }

  // Call Groq API for AI response
  const generateAiResponse = async (userArgument: string, round: number): Promise<string> => {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY
    if (!apiKey) {
      return getMockResponse(round)
    }

    const historyText = rounds.map(r =>
      `用户（第${r.round}轮）：${r.userContent}\n${opponent.name}（第${r.round}轮）：${r.aiContent}`
    ).join('\n')

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: opponent.systemPrompt },
            {
              role: 'user',
              content: `辩题：${topic.title}\n你的立场：${topic.negateLabel}\n\n${rounds.length > 0 ? `辩论记录：\n${historyText}\n` : ''}用户刚刚说：${userArgument}\n\n请反驳用户的论点。保持你的人设风格，80-150字，纯文本。`,
            },
          ],
          temperature: opponent.temperature,
          max_tokens: 250,
        }),
        signal: AbortSignal.timeout(12000),
      })

      if (!res.ok) return getMockResponse(round)
      const data = await res.json()
      return data.choices?.[0]?.message?.content?.trim() || getMockResponse(round)
    } catch {
      return getMockResponse(round)
    }
  }

  const getMockResponse = (round: number): string => {
    const responses: Record<string, string[]> = {
      college: [
        '你说的这些我都理解，但你忽略了一个关键事实——不是每个人都有条件上大学。你把大学描述成必经之路，但对于经济困难的家庭来说，四年的机会成本可能比学费本身更沉重。',
        '这个数据确实有说服力，但你有没有想过，收入差距不等于教育价值？那些高薪岗位的高收入，可能来自行业红利而非大学教育本身。',
        '你提到了思维方式的重要性，我同意。但思维方式真的只能通过四年大学培养吗？很多自学成才的人同样具备出色的批判性思维能力。',
        '你的论点建立在"大学是唯一选择"的假设上。但现实中，职业教育、在线课程、学徒制等替代路径正在变得越来越成熟。',
      ],
    }
    const topicResponses = responses[topic.id] || responses.college!
    return topicResponses[(round - 1) % topicResponses.length] || `${opponent.name}的反驳。`
  }

  const handleSubmit = async () => {
    if (!currentInput.trim() || isAiThinking) return

    const round = roundNumber
    const userContent = currentInput.trim()
    setCurrentInput('')
    setIsAiThinking(true)

    // Generate thinking steps with delay
    const thinkingSteps = generateThinkingSteps(round)
    setAiThinkingSteps([])

    // Show thinking steps one by one
    for (let i = 0; i < thinkingSteps.length; i++) {
      await new Promise(r => setTimeout(r, 800))
      setAiThinkingSteps(prev => [...prev, thinkingSteps[i]])
    }

    // Generate AI response
    await new Promise(r => setTimeout(r, 1000))
    const aiContent = await generateAiResponse(userContent, round)

    // Generate round score
    const userScore = Math.floor(Math.random() * 3) + 6  // 6-8
    const aiScore = Math.floor(Math.random() * 3) + 6
    const score: RoundScore = {
      affirmScore: userScore,
      negateScore: aiScore,
      winner: userScore > aiScore ? 'affirm' : aiScore > userScore ? 'negate' : 'draw',
      reason: userScore > aiScore ? '你的论点更有说服力' : aiScore > userScore ? `${opponent.name}的反驳更到位` : '双方势均力敌',
    }

    setRounds(prev => [...prev, { round, userContent, aiThinking: thinkingSteps, aiContent, score }])
    setAiThinkingSteps([])
    setIsAiThinking(false)
    setRoundNumber(prev => prev + 1)

    if (round >= TOTAL_ROUNDS) {
      setBattleEnded(true)
    }
  }

  const handleReset = () => {
    setRounds([])
    setCurrentInput('')
    setRoundNumber(1)
    setBattleStarted(false)
    setBattleEnded(false)
    setShowResult(false)
    setHasVoted(null)
  }

  const totalUserScore = rounds.reduce((sum, r) => sum + (r.score?.affirmScore || 0), 0)
  const totalAiScore = rounds.reduce((sum, r) => sum + (r.score?.negateScore || 0), 0)
  const totalVotes = userVotes + aiVotes
  const userPercent = totalVotes > 0 ? Math.round((userVotes / totalVotes) * 100) : 50

  return (
    <div className="flex flex-col min-h-full bg-paper-texture">
      {/* Header */}
      <div className={`px-5 pt-4 pb-2 flex items-center gap-3 ${isDesktop ? 'max-w-4xl mx-auto w-full' : ''}`}>
        <button onClick={() => navigate(-1)} className="p-1.5 -ml-1.5 rounded-lg hover:bg-paper-dark transition-colors active:scale-95">
          <ArrowLeft size={20} className="text-ink-700" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className={`${isDesktop ? 'text-lg' : 'text-[15px]'} font-bold text-ink-900 truncate`}>{topic.title}</h1>
          <p className="text-[11px] text-ink-400">人机对决 · 你 vs {opponent.name}</p>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-surface shadow-card">
          <span className="text-[10px] text-ink-500">第 {Math.min(roundNumber, TOTAL_ROUNDS)} / {TOTAL_ROUNDS} 回合</span>
        </div>
      </div>

      <div className={`flex-1 px-5 pb-4 overflow-y-auto flex flex-col gap-3 ${isDesktop ? 'max-w-4xl mx-auto w-full' : ''}`}>
        {/* ===== VS Header ===== */}
        <div className="bg-surface rounded-xl shadow-card p-4">
          <div className="flex items-center gap-3">
            {/* User */}
            <div className="flex-1 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-seal to-seal-light flex items-center justify-center mx-auto mb-1.5 shadow-lg shadow-seal/20">
                <span className="text-white text-lg font-bold">我</span>
              </div>
              <p className="text-[13px] font-bold text-ink-900">你</p>
              <p className="text-[10px] text-ink-400">{topic.affirmLabel}</p>
              {rounds.length > 0 && (
                <p className="text-[11px] font-bold mt-0.5 text-seal">{totalUserScore}分</p>
              )}
            </div>

            {/* VS */}
            <div className="flex flex-col items-center gap-1">
              <Swords size={20} className="text-ink-300" />
            </div>

            {/* AI opponent */}
            <div className="flex-1 text-center">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${opponent.visual.gradientFrom} ${opponent.visual.gradientTo} flex items-center justify-center mx-auto mb-1.5 shadow-lg ${opponent.visual.glowShadow}`}>
                <CharacterIcon characterId={opponent.id} size={20} className="text-white" />
              </div>
              <p className="text-[13px] font-bold text-ink-900">{opponent.name}</p>
              <p className="text-[10px] text-ink-400">{topic.negateLabel}</p>
              {rounds.length > 0 && (
                <p className={`text-[11px] font-bold mt-0.5 ${opponent.visual.textColor}`}>{totalAiScore}分</p>
              )}
            </div>
          </div>

          {/* Score bar */}
          {rounds.length > 0 && (
            <div className="mt-3">
              <div className="h-3 rounded-full overflow-hidden flex bg-paper-dark">
                <div
                  className="h-full bg-gradient-to-r from-seal to-seal-light transition-all duration-700"
                  style={{ width: `${totalUserScore + totalAiScore > 0 ? (totalUserScore / (totalUserScore + totalAiScore)) * 100 : 50}%` }}
                />
                <div
                  className={`h-full bg-gradient-to-r ${opponent.visual.gradientFrom} ${opponent.visual.gradientTo} transition-all duration-700`}
                  style={{ width: `${totalUserScore + totalAiScore > 0 ? (totalAiScore / (totalUserScore + totalAiScore)) * 100 : 50}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ===== Battle Area ===== */}
        {!battleStarted ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
            <div className="bg-surface rounded-xl shadow-card p-6 max-w-sm space-y-4">
              <Swords size={32} className="text-ink-300 mx-auto" />
              <h2 className="text-[16px] font-bold text-ink-900">准备好了吗？</h2>
              <p className="text-[12px] text-ink-500 leading-relaxed">
                你将作为<span className="font-semibold text-seal">「{topic.affirmLabel}」</span>方，
                与 <span className={`font-semibold ${opponent.visual.textColor}`}>{opponent.name}</span>
                展开 {TOTAL_ROUNDS} 回合辩论。评委逐轮打分，最终由观众投票决定胜负。
              </p>
              <div className="bg-paper-dark/50 rounded-xl p-3 text-left">
                <p className="text-[11px] text-ink-500 mb-1">你的对手：{opponent.name}</p>
                <p className="text-[11px] text-ink-400">{opponent.personality}</p>
                <p className="text-[10px] text-ink-400 mt-1">擅长：{opponent.stats.favoriteTactic} · 胜率 {opponent.stats.winRate}</p>
              </div>
              <button
                onClick={() => setBattleStarted(true)}
                className="w-full py-3.5 rounded-xl bg-seal text-white font-semibold text-[14px] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-seal-glow"
              >
                <Send size={16} />
                开始辩论
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 space-y-3">
            {rounds.map((r, i) => (
              <div key={i} className="space-y-2">
                {/* Round divider */}
                <div className="flex items-center gap-2 py-1">
                  <div className="flex-1 h-px bg-line/30" />
                  <span className="text-[10px] text-ink-400 font-medium">第 {r.round} 回合</span>
                  <div className="flex-1 h-px bg-line/30" />
                </div>

                {/* User speech */}
                <div className="flex gap-2.5 animate-fade-in-up">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-seal to-seal-light flex items-center justify-center flex-shrink-0 shadow-md">
                    <span className="text-white text-[11px] font-bold">我</span>
                  </div>
                  <div className="max-w-[80%]">
                    <div className="inline-block px-3.5 py-2.5 rounded-2xl rounded-tl-md text-[13px] leading-relaxed bg-seal/5 border border-seal/20 text-ink-900">
                      {r.userContent}
                    </div>
                    <p className="text-[10px] text-ink-400 mt-0.5">你 · {topic.affirmLabel}</p>
                  </div>
                </div>

                {/* AI thinking */}
                {r.aiThinking && (
                  <div className="flex gap-2.5">
                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${opponent.visual.gradientFrom} ${opponent.visual.gradientTo} flex items-center justify-center flex-shrink-0 shadow-md`}>
                      <CharacterIcon characterId={opponent.id} size={16} className="text-white" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className={`text-[10px] ${opponent.visual.textColor} font-medium`}>{opponent.name} 的思考</p>
                      {r.aiThinking.map((step, j) => (
                        <div key={j} className="flex items-start gap-2">
                          {(() => { const Icon = THINKING_ICON_MAP[step.icon] || Brain; return <Icon size={12} className="text-ink-400 flex-shrink-0 mt-0.5" /> })()}
                          <div>
                            <span className="text-[10px] text-ink-400">{step.label}</span>
                            <p className="text-[11px] text-ink-600">{step.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI speech */}
                <div className="flex gap-2.5 flex-row-reverse animate-fade-in-up">
                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${opponent.visual.gradientFrom} ${opponent.visual.gradientTo} flex items-center justify-center flex-shrink-0 shadow-md`}>
                    <CharacterIcon characterId={opponent.id} size={16} className="text-white" />
                  </div>
                  <div className="max-w-[80%] text-right">
                    <div className={`inline-block px-3.5 py-2.5 rounded-2xl rounded-tr-md text-[13px] leading-relaxed ${opponent.visual.bubbleBg} border ${opponent.visual.bubbleBorder} text-ink-900`}>
                      {r.aiContent}
                    </div>
                    <p className="text-[10px] text-ink-400 mt-0.5">{opponent.name} · {topic.negateLabel}</p>
                  </div>
                </div>

                {/* Score */}
                {r.score && (
                  <div className="bg-surface/80 rounded-xl border border-line/20 p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Shield size={12} className="text-ink-400" />
                      <span className="text-[11px] text-ink-500 font-medium">评委打分</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[16px] font-bold text-seal">{r.score.affirmScore}</span>
                      <span className="text-[10px] text-ink-500">{r.score.reason}</span>
                      <span className={`text-[16px] font-bold ${opponent.visual.textColor}`}>{r.score.negateScore}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* AI thinking animation */}
            {isAiThinking && (
              <div className="flex gap-2.5 animate-fade-in-up">
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${opponent.visual.gradientFrom} ${opponent.visual.gradientTo} flex items-center justify-center flex-shrink-0 shadow-md relative`}>
                  <CharacterIcon characterId={opponent.id} size={16} className="text-white" />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-paper border-2 border-surface flex items-center justify-center">
                    <Brain size={7} className="animate-pulse text-ink-400" />
                  </div>
                </div>
                <div className="flex-1 space-y-1.5">
                  <p className={`text-[10px] ${opponent.visual.textColor} font-medium`}>{opponent.name} 正在思考……</p>
                  {aiThinkingSteps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2 animate-fade-in-up">
                      {(() => { const Icon = THINKING_ICON_MAP[step.icon] || Brain; return <Icon size={12} className="text-ink-400 flex-shrink-0 mt-0.5" /> })()}
                      <div>
                        <span className="text-[10px] text-ink-400">{step.label}</span>
                        <p className="text-[11px] text-ink-600">{step.content}</p>
                      </div>
                    </div>
                  ))}
                  {aiThinkingSteps.length < 3 && (
                    <div className="flex items-center gap-1.5 pl-5">
                      <span className="w-1 h-1 rounded-full bg-ink-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 h-1 rounded-full bg-ink-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-1 rounded-full bg-ink-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        )}

        {/* ===== Input Area ===== */}
        {battleStarted && !battleEnded && (
          <div className="sticky bottom-0 bg-paper-texture pt-2 pb-2">
            <div className="flex gap-2">
              <textarea
                value={currentInput}
                onChange={e => setCurrentInput(e.target.value)}
                placeholder={`阐述你的论点（${topic.affirmLabel}）……`}
                className="flex-1 px-4 py-3 rounded-xl bg-surface border border-line/30 text-[13px] text-ink-900 placeholder:text-ink-300 resize-none focus:outline-none focus:ring-2 focus:ring-seal/30 min-h-[44px] max-h-[120px]"
                rows={1}
                disabled={isAiThinking}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit()
                  }
                }}
              />
              <button
                onClick={handleSubmit}
                disabled={!currentInput.trim() || isAiThinking}
                className="w-11 h-11 rounded-xl bg-seal text-white flex items-center justify-center active:scale-[0.95] transition-all disabled:opacity-40 disabled:active:scale-100 self-end shadow-seal-glow"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-[9px] text-ink-300 text-center mt-1">
              Enter 发送 · Shift+Enter 换行
            </p>
          </div>
        )}

        {/* ===== Battle End ===== */}
        {battleEnded && !showResult && (
          <div className="space-y-3">
            <button
              onClick={() => setShowResult(true)}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-seal to-gold text-white font-semibold text-[14px] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              <Trophy size={16} />
              查看结果
            </button>
          </div>
        )}

        {showResult && (
          <div className="bg-surface rounded-xl shadow-card p-4 animate-fade-in-up space-y-3">
            <div className="text-center">
              <Trophy size={28} className="text-gold mx-auto mb-2" />
              <p className="text-[16px] font-bold text-ink-900">
                {totalUserScore > totalAiScore ? '你赢了！' : totalUserScore < totalAiScore ? `${opponent.name}获胜` : '势均力敌！'}
              </p>
              <p className="text-[12px] text-ink-500 mt-1">评委打分 {totalUserScore} : {totalAiScore}</p>
            </div>

            {/* Audience vote */}
            <div className="space-y-2">
              <p className="text-[12px] text-ink-500 font-medium text-center">观众投票</p>
              <div className="flex gap-3">
                <button
                  onClick={() => { if (!hasVoted) { setHasVoted('user'); setUserVotes(v => v + 1) } }}
                  className={`flex-1 py-3 rounded-xl font-semibold text-[13px] active:scale-[0.97] transition-all ${
                    hasVoted === 'user' ? 'bg-seal text-white shadow-lg' : 'bg-seal/10 text-seal border-2 border-seal/20'
                  }`}
                >
                  你
                </button>
                <button
                  onClick={() => { if (!hasVoted) { setHasVoted('ai'); setAiVotes(v => v + 1) } }}
                  className={`flex-1 py-3 rounded-xl font-semibold text-[13px] active:scale-[0.97] transition-all ${
                    hasVoted === 'ai' ? `bg-gradient-to-r ${opponent.visual.gradientFrom} ${opponent.visual.gradientTo} text-white shadow-lg` : `${opponent.visual.bubbleBg} ${opponent.visual.textColor} border-2 ${opponent.visual.bubbleBorder}`
                  }`}
                >
                  {opponent.name}
                </button>
              </div>

              {hasVoted && (
                <div className="h-4 rounded-full overflow-hidden flex bg-paper-dark">
                  <div className="h-full bg-seal transition-all duration-700" style={{ width: `${userPercent}%` }} />
                  <div className={`h-full bg-gradient-to-r ${opponent.visual.gradientFrom} ${opponent.visual.gradientTo} transition-all duration-700`} style={{ width: `${100 - userPercent}%` }} />
                </div>
              )}
            </div>

            <button
              onClick={handleReset}
              className="w-full py-3 rounded-xl bg-seal/10 text-seal text-[13px] font-medium active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            >
              <RotateCcw size={14} />
              再来一场
            </button>
          </div>
        )}

        <p className="text-[9px] text-ink-300 text-center pb-2">
          AI 回复由大语言模型生成 · 观点不代表平台立场
        </p>
      </div>
    </div>
  )
}
