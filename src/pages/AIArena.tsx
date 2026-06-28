import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, ThumbsUp, ThumbsDown, Play, FastForward,
  Swords, Trophy, Users, RotateCcw, Sparkles, Shield,
  MessageCircle, MessageSquare, BarChart3, Search, Target,
  Lightbulb, BookOpen, RefreshCw, Smile, Brain, Crown,
} from 'lucide-react'
import {
  getTopic, getMockMatch,
  type DebateMatch, type DebateRound, type Highlight, type TauntMoment, type FinalResult, type ThinkingStep,
} from '../services/debateArenaService'
import { type AICharacter } from '../services/characters'
import DanmakuOverlay from '../components/DanmakuOverlay'
import { pickDanmaku, toQueueItems, type DanmakuQueueItem, type DanmakuTrigger } from '../services/danmakuService'
import CharacterIcon from '../components/CharacterIcon'

const THINKING_ICON_MAP: Record<string, React.ElementType> = {
  '📊': BarChart3, '🔍': Search, '⚔️': Swords, '🎯': Target,
  '🛡️': Shield, '💡': Lightbulb, '📖': BookOpen, '🔄': RefreshCw, '😏': Smile, '💭': Search,
}

// ===== Typing animation hook =====

function useTypingAnimation(text: string, speed: number = 25, trigger: boolean = false) {
  const [displayed, setDisplayed] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  useEffect(() => {
    if (!trigger || !text) {
      setDisplayed('')
      return
    }
    setIsTyping(true)
    setDisplayed('')
    let i = 0
    const timer = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) {
        clearInterval(timer)
        setIsTyping(false)
      }
    }, speed)
    return () => clearInterval(timer)
  }, [text, speed, trigger])

  return { displayed, isTyping }
}

// ===== Reveal phase per round =====
// Flow: think-affirm → affirm → think-negate → negate → scored
type Phase = 'think-affirm' | 'affirm' | 'think-negate' | 'negate' | 'scored'

interface RevealedState {
  round: DebateRound
  phase: Phase
}

// ===== Component =====

export default function AIArena() {
  const { topicId } = useParams<{ topicId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const topic = getTopic(topicId || 'college') || getTopic('college')!

  const affirmCharId = searchParams.get('affirm') || 'baize'
  const negateCharId = searchParams.get('negate') || 'xiezhi'
  const roundsParam = parseInt(searchParams.get('rounds') || '5', 10)

  // Use mock match (instant, no API) with selected characters and round count
  const [match, setMatch] = useState<DebateMatch>(() => getMockMatch(topic.id, affirmCharId, negateCharId, roundsParam))
  const affirmChar = match.affirmChar
  const negateChar = match.negateChar

  const [revealed, setRevealed] = useState<RevealedState[]>([])
  const [isAutoPlaying, setIsAutoPlaying] = useState(false)
  const [affirmVotes, setAffirmVotes] = useState(1247 + Math.floor(Math.random() * 500))
  const [negateVotes, setNegateVotes] = useState(1183 + Math.floor(Math.random() * 500))
  const [hasVoted, setHasVoted] = useState<'affirm' | 'negate' | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [showClosing, setShowClosing] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // ===== Danmaku =====
  const [danmakuEnabled, setDanmakuEnabled] = useState(true)
  const [danmakuQueue, setDanmakuQueue] = useState<DanmakuQueueItem[]>([])

  const pushDanmaku = useCallback((trigger: DanmakuTrigger, count: number, characterId?: string) => {
    if (!danmakuEnabled) return
    const templates = pickDanmaku(trigger, count, characterId)
    const items = toQueueItems(templates)
    setDanmakuQueue(prev => [...prev, ...items])
  }, [danmakuEnabled])

  const handleDanmakuComplete = useCallback((id: string) => {
    setDanmakuQueue(prev => prev.filter(d => d.id !== id))
  }, [])

  const totalRounds = match.totalRounds
  const isComplete = revealed.length >= totalRounds && revealed.every(r => r.phase === 'scored')

  // Current typing target
  const lastRevealed = revealed[revealed.length - 1]
  const typingTarget = (() => {
    if (!lastRevealed) return ''
    if (lastRevealed.phase === 'affirm') return lastRevealed.round.affirm.content
    if (lastRevealed.phase === 'negate') return lastRevealed.round.negate.content
    return ''
  })()

  const { displayed, isTyping } = useTypingAnimation(typingTarget, 22, !!typingTarget)

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [revealed.length, displayed])

  // Danmaku triggers on phase changes
  const prevPhaseRef = useRef<string>('')
  useEffect(() => {
    const last = revealed[revealed.length - 1]
    if (!last) return
    const key = `${last.round.round}-${last.phase}`
    if (key === prevPhaseRef.current) return
    prevPhaseRef.current = key

    const charId = last.phase === 'affirm' ? affirmChar.id
      : last.phase === 'negate' ? negateChar.id
      : undefined

    if (last.phase === 'affirm' || last.phase === 'negate') {
      pushDanmaku('speech', 2 + Math.floor(Math.random() * 3), charId)
    } else if (last.phase === 'scored') {
      if (last.round.highlight) {
        pushDanmaku('highlight', 3 + Math.floor(Math.random() * 3), last.round.highlight.characterId)
      }
      if (last.round.taunt) {
        pushDanmaku('taunt', 2 + Math.floor(Math.random() * 2))
      }
      // Score upset: check if lead changed this round
      const prevRounds = revealed.filter(r => r.phase === 'scored' && r.round.round !== last.round.round)
      if (prevRounds.length > 0) {
        const prevDiff = prevRounds.reduce((a, r) => a + (r.round.score.affirmScore - r.round.score.negateScore), 0)
        const currDiff = prevDiff + (last.round.score.affirmScore - last.round.score.negateScore)
        if (prevDiff * currDiff < 0) {
          pushDanmaku('score-upset', 2 + Math.floor(Math.random() * 2))
        }
      }
    }
  }, [revealed, affirmChar.id, negateChar.id, pushDanmaku])

  // Trigger closing danmaku
  useEffect(() => {
    if (showClosing) {
      pushDanmaku('closing', 5 + Math.floor(Math.random() * 4))
    }
  }, [showClosing, pushDanmaku])

  // Advance to next phase
  const advance = useCallback(() => {
    if (revealed.length === 0) {
      // Start: reveal first round's thinking phase (affirm side)
      setRevealed([{ round: match.rounds[0], phase: 'think-affirm' }])
      return
    }

    const last = revealed[revealed.length - 1]
    const roundIdx = match.rounds.indexOf(last.round)

    if (last.phase === 'think-affirm') {
      // Show affirm speech
      setRevealed(prev => [...prev.slice(0, -1), { ...last, phase: 'affirm' }])
    } else if (last.phase === 'affirm') {
      // Show negate thinking
      setRevealed(prev => [...prev.slice(0, -1), { ...last, phase: 'think-negate' }])
    } else if (last.phase === 'think-negate') {
      // Show negate speech
      setRevealed(prev => [...prev.slice(0, -1), { ...last, phase: 'negate' }])
    } else if (last.phase === 'negate') {
      // Show score
      setRevealed(prev => [...prev.slice(0, -1), { ...last, phase: 'scored' }])
    } else {
      // Move to next round
      const nextIdx = roundIdx + 1
      if (nextIdx < match.rounds.length) {
        setRevealed(prev => [...prev, { round: match.rounds[nextIdx], phase: 'think-affirm' }])
      }
    }
  }, [revealed, match])

  // Auto-play
  useEffect(() => {
    if (!isAutoPlaying || isComplete || isTyping) return
    // Thinking phases need more time for steps to animate
    const isThinking = lastRevealed?.phase === 'think-affirm' || lastRevealed?.phase === 'think-negate'
    const delay = isThinking ? 3000 : 800
    const timer = setTimeout(() => advance(), delay)
    return () => clearTimeout(timer)
  }, [isAutoPlaying, isComplete, isTyping, advance, lastRevealed])

  const handleStart = () => {
    setIsAutoPlaying(true)
    if (revealed.length === 0) advance()
  }

  const handleFastForward = () => {
    setIsAutoPlaying(false)
    setRevealed(match.rounds.map(r => ({ round: r, phase: 'scored' as Phase })))
  }

  const handleReset = () => {
    setMatch(getMockMatch(topic.id, affirmCharId, negateCharId, roundsParam))
    setRevealed([])
    setIsAutoPlaying(false)
    setShowResult(false)
    setShowClosing(false)
    setDanmakuQueue([])
    prevPhaseRef.current = ''
  }


  const handleVote = (side: 'affirm' | 'negate') => {
    if (hasVoted) return
    setHasVoted(side)
    if (side === 'affirm') setAffirmVotes(v => v + 1)
    else setNegateVotes(v => v + 1)
  }

  const totalVotes = affirmVotes + negateVotes
  const affirmPercent = totalVotes > 0 ? Math.round((affirmVotes / totalVotes) * 100) : 50

  // Compute cumulative score
  const cumulativeScore = revealed.filter(r => r.phase === 'scored').reduce(
    (acc, r) => ({
      affirm: acc.affirm + r.round.score.affirmScore,
      negate: acc.negate + r.round.score.negateScore,
    }),
    { affirm: 0, negate: 0 },
  )

  const scoredCount = revealed.filter(r => r.phase === 'scored').length
  const momentumPercent = cumulativeScore.affirm + cumulativeScore.negate > 0
    ? Math.round((cumulativeScore.affirm / (cumulativeScore.affirm + cumulativeScore.negate)) * 100)
    : 50

  const currentRoundNum = revealed.length > 0
    ? match.rounds.indexOf(revealed[revealed.length - 1].round) + 1
    : 0

  return (
    <div className="flex flex-col min-h-full bg-paper-texture">
      {/* Danmaku Overlay */}
      <DanmakuOverlay
        items={danmakuQueue}
        enabled={danmakuEnabled}
        onItemComplete={handleDanmakuComplete}
      />

      {/* Header */}
      <div className="px-5 pt-4 pb-2 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 -ml-1.5 rounded-lg hover:bg-paper-dark transition-colors active:scale-95">
          <ArrowLeft size={20} className="text-ink-700" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[15px] font-bold text-ink-900 truncate">{topic.title}</h1>
          <p className="text-[11px] text-ink-400">AI 辩论 · {affirmChar.name} vs {negateChar.name}</p>
        </div>
        <button
          onClick={() => setDanmakuEnabled(v => !v)}
          className={`p-2 rounded-lg transition-colors active:scale-95 ${danmakuEnabled ? 'bg-seal/10 text-seal' : 'bg-surface text-ink-400'}`}
          title={danmakuEnabled ? '关闭弹幕' : '开启弹幕'}
        >
          <MessageSquare size={16} />
        </button>
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-surface shadow-card">
          <Users size={12} className="text-ink-400" />
          <span className="text-[11px] text-ink-500">{totalVotes.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex-1 px-5 pb-4 overflow-y-auto flex flex-col gap-3">
        {/* ===== VS Header with Score ===== */}
        <div className="bg-surface rounded-xl shadow-card p-4">
          <div className="flex items-center gap-3">
            {/* Affirm character */}
            <div className="flex-1 text-center">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${affirmChar.visual.gradientFrom} ${affirmChar.visual.gradientTo} flex items-center justify-center mx-auto mb-1.5 shadow-lg ${affirmChar.visual.glowShadow}`}>
                <CharacterIcon characterId={affirmChar.id} size={20} className="text-white" />
              </div>
              <p className="text-[13px] font-bold text-ink-900">{affirmChar.name}</p>
              <p className="text-[10px] text-ink-400">{topic.affirmLabel}</p>
              {scoredCount > 0 && (
                <p className={`text-[11px] font-bold mt-0.5 ${affirmChar.visual.textColor}`}>{cumulativeScore.affirm}分</p>
              )}
            </div>

            {/* VS + Round */}
            <div className="flex flex-col items-center gap-1">
              <Swords size={20} className="text-ink-300" />
              <span className="text-[10px] text-ink-400 font-medium">
                {currentRoundNum > 0 ? `第 ${currentRoundNum} / ${totalRounds} 局` : '即将开始'}
              </span>
            </div>

            {/* Negate character */}
            <div className="flex-1 text-center">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${negateChar.visual.gradientFrom} ${negateChar.visual.gradientTo} flex items-center justify-center mx-auto mb-1.5 shadow-lg ${negateChar.visual.glowShadow}`}>
                <CharacterIcon characterId={negateChar.id} size={20} className="text-white" />
              </div>
              <p className="text-[13px] font-bold text-ink-900">{negateChar.name}</p>
              <p className="text-[10px] text-ink-400">{topic.negateLabel}</p>
              {scoredCount > 0 && (
                <p className={`text-[11px] font-bold mt-0.5 ${negateChar.visual.textColor}`}>{cumulativeScore.negate}分</p>
              )}
            </div>
          </div>

          {/* Momentum bar (judge score based) */}
          <div className="mt-3">
            <div className="h-3 rounded-full overflow-hidden flex bg-paper-dark">
              <div
                className={`h-full bg-gradient-to-r ${affirmChar.visual.gradientFrom} ${affirmChar.visual.gradientTo} transition-all duration-700`}
                style={{ width: `${momentumPercent}%` }}
              />
              <div
                className={`h-full bg-gradient-to-r ${negateChar.visual.gradientFrom} ${negateChar.visual.gradientTo} transition-all duration-700`}
                style={{ width: `${100 - momentumPercent}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[11px]">
              <span className={`${affirmChar.visual.textColor} font-medium`}>{momentumPercent}%</span>
              <span className={`${negateChar.visual.textColor} font-medium`}>{100 - momentumPercent}%</span>
            </div>
          </div>
        </div>

        {/* ===== Debate Area ===== */}
        <div className="flex-1 space-y-3 min-h-[200px]">
          {revealed.map((item, i) => {
            const round = item.round
            const isLast = i === revealed.length - 1
            const showAffirmThinking = item.phase === 'think-affirm'
            const showAffirmSpeech = item.phase === 'affirm' || item.phase === 'think-negate' || item.phase === 'negate' || item.phase === 'scored'
            const showNegateThinking = item.phase === 'think-negate'
            const showNegateSpeech = item.phase === 'negate' || item.phase === 'scored'
            const showScore = item.phase === 'scored'

            return (
              <div key={i} className="space-y-2">
                {/* Round divider */}
                <div className="flex items-center gap-2 py-1">
                  <div className="flex-1 h-px bg-line/30" />
                  <span className="text-[10px] text-ink-400 font-medium">第 {round.round} 局</span>
                  <div className="flex-1 h-px bg-line/30" />
                </div>

                {/* Affirm thinking process */}
                {showAffirmThinking && round.affirm.thinkingSteps && (
                  <ThinkingProcess
                    char={affirmChar}
                    steps={round.affirm.thinkingSteps}
                    isAnimating={isLast}
                  />
                )}

                {/* Affirm speech */}
                {showAffirmSpeech && (
                  <SpeechBubble
                    char={affirmChar}
                    content={isLast && item.phase === 'affirm' ? displayed : round.affirm.content}
                    isTyping={isLast && item.phase === 'affirm' && isTyping}
                    align="left"
                  />
                )}

                {/* Negate thinking process */}
                {showNegateThinking && round.negate.thinkingSteps && (
                  <ThinkingProcess
                    char={negateChar}
                    steps={round.negate.thinkingSteps}
                    isAnimating={isLast}
                  />
                )}

                {/* Negate speech */}
                {showNegateSpeech && (
                  <SpeechBubble
                    char={negateChar}
                    content={isLast && item.phase === 'negate' ? displayed : round.negate.content}
                    isTyping={isLast && item.phase === 'negate' && isTyping}
                    align="right"
                  />
                )}

                {/* Score card */}
                {showScore && (
                  <ScoreCard
                    score={round.score}
                    affirmName={affirmChar.name}
                    negateName={negateChar.name}
                    affirmColor={affirmChar.visual.textColor}
                    negateColor={negateChar.visual.textColor}
                  />
                )}

                {/* Highlight */}
                {showScore && round.highlight && (
                  <HighlightCard highlight={round.highlight} affirmName={affirmChar.name} negateName={negateChar.name} />
                )}

                {/* Taunt */}
                {showScore && round.taunt && (
                  <TauntCard taunt={round.taunt} affirmChar={affirmChar} negateChar={negateChar} />
                )}
              </div>
            )
          })}
          <div ref={chatEndRef} />
        </div>

        {/* ===== Controls ===== */}
        {!isComplete && (
          <div className="flex gap-2">
            {!isAutoPlaying && revealed.length === 0 && (
              <button
                onClick={handleStart}
                className="flex-1 py-3.5 rounded-xl bg-seal text-white font-semibold text-[14px] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-seal-glow"
              >
                <Play size={16} />
                开始辩论
              </button>
            )}
            {!isAutoPlaying && revealed.length > 0 && (
              <button
                onClick={advance}
                className="flex-1 py-3 rounded-xl bg-surface shadow-card text-[13px] text-ink-700 font-medium active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Play size={14} />
                {lastRevealed?.phase === 'think-affirm' ? `${affirmChar.name}发言` : lastRevealed?.phase === 'affirm' ? `${negateChar.name}思考` : lastRevealed?.phase === 'think-negate' ? `${negateChar.name}发言` : lastRevealed?.phase === 'negate' ? '评委打分' : '下一回合'}
              </button>
            )}
            {!isAutoPlaying && (
              <button
                onClick={handleStart}
                className="py-3 px-4 rounded-xl bg-surface shadow-card text-[13px] text-ink-700 font-medium active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <FastForward size={14} />
                自动播放
              </button>
            )}
            {isAutoPlaying && (
              <button
                onClick={() => setIsAutoPlaying(false)}
                className="flex-1 py-3 rounded-xl bg-surface shadow-card text-[13px] text-ink-700 font-medium active:scale-[0.98] transition-all"
              >
                暂停
              </button>
            )}
            <button
              onClick={handleFastForward}
              className="py-3 px-4 rounded-xl bg-paper-dark text-[12px] text-ink-500 font-medium active:scale-[0.97] transition-transform flex items-center justify-center gap-1.5"
            >
              <FastForward size={12} />
              跳过
            </button>
          </div>
        )}

        {/* ===== Closing Ceremony ===== */}
        {isComplete && !showClosing && match.finalResult && (
          <button
            onClick={() => setShowClosing(true)}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-seal to-cyan-500 text-white font-semibold text-[14px] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            <Trophy size={16} />
            查看最终结果
          </button>
        )}

        {showClosing && match.finalResult && (
          <ClosingCeremony
            result={match.finalResult}
            affirmChar={affirmChar}
            negateChar={negateChar}
            topic={topic}
          />
        )}

        {/* ===== Final Vote ===== */}
        {showClosing && !showResult && (
          <div className="bg-surface rounded-xl shadow-card p-4 animate-fade-in-up space-y-3">
            <div className="text-center mb-2">
              <MessageCircle size={24} className="text-gold mx-auto mb-1" />
              <p className="text-[14px] font-bold text-ink-900">谁说服了你？</p>
              <p className="text-[11px] text-ink-400">投出你的一票</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleVote('affirm')}
                className={`flex-1 py-3.5 rounded-xl font-semibold text-[14px] active:scale-[0.97] transition-all flex items-center justify-center gap-2 ${
                  hasVoted === 'affirm'
                    ? `bg-gradient-to-r ${affirmChar.visual.gradientFrom} ${affirmChar.visual.gradientTo} text-white shadow-lg`
                    : `${affirmChar.visual.bubbleBg} ${affirmChar.visual.textColor} border-2 ${affirmChar.visual.bubbleBorder}`
                }`}
              >
                <ThumbsUp size={16} />
                {affirmChar.name}
              </button>
              <button
                onClick={() => handleVote('negate')}
                className={`flex-1 py-3.5 rounded-xl font-semibold text-[14px] active:scale-[0.97] transition-all flex items-center justify-center gap-2 ${
                  hasVoted === 'negate'
                    ? `bg-gradient-to-r ${negateChar.visual.gradientFrom} ${negateChar.visual.gradientTo} text-white shadow-lg`
                    : `${negateChar.visual.bubbleBg} ${negateChar.visual.textColor} border-2 ${negateChar.visual.bubbleBorder}`
                }`}
              >
                <ThumbsDown size={16} />
                {negateChar.name}
              </button>
            </div>
            <button
              onClick={() => setShowResult(true)}
              className="w-full py-2.5 rounded-xl bg-paper-dark text-[12px] text-ink-500 font-medium active:scale-[0.97] transition-transform"
            >
              {hasVoted ? '查看结果' : '跳过投票，查看结果'}
            </button>
          </div>
        )}

        {/* ===== Vote Result ===== */}
        {showResult && (
          <div className="bg-surface rounded-xl shadow-card p-4 animate-fade-in-up space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy size={16} className="text-gold" />
                <span className="text-[14px] font-bold text-ink-900">观众投票</span>
              </div>
              <span className="text-[12px] text-ink-400">{totalVotes.toLocaleString()} 票</span>
            </div>

            <div className="h-5 rounded-full overflow-hidden flex bg-paper-dark">
              <div
                className={`h-full bg-gradient-to-r ${affirmChar.visual.gradientFrom} ${affirmChar.visual.gradientTo} transition-all duration-700 flex items-center justify-end pr-2`}
                style={{ width: `${affirmPercent}%` }}
              >
                {affirmPercent > 15 && <span className="text-[10px] text-white font-bold">{affirmPercent}%</span>}
              </div>
              <div
                className={`h-full bg-gradient-to-r ${negateChar.visual.gradientFrom} ${negateChar.visual.gradientTo} transition-all duration-700 flex items-center pl-2`}
                style={{ width: `${100 - affirmPercent}%` }}
              >
                {100 - affirmPercent > 15 && <span className="text-[10px] text-white font-bold">{100 - affirmPercent}%</span>}
              </div>
            </div>

            <div className="flex justify-between text-[12px]">
              <div className="text-center">
                <p className={`font-bold ${affirmChar.visual.textColor}`}>{affirmChar.name} · {topic.affirmLabel}</p>
                <p className="text-ink-400">{affirmVotes.toLocaleString()} 票</p>
              </div>
              <div className="text-center">
                <p className={`font-bold ${negateChar.visual.textColor}`}>{negateChar.name} · {topic.negateLabel}</p>
                <p className="text-ink-400">{negateVotes.toLocaleString()} 票</p>
              </div>
            </div>

            {hasVoted && (
              <div className={`p-3 rounded-xl text-center ${
                hasVoted === 'affirm' && affirmPercent > 50 || hasVoted === 'negate' && affirmPercent <= 50
                  ? 'bg-bamboo/10 border border-bamboo/20'
                  : 'bg-paper-dark/50 border border-line/20'
              }`}>
                <p className="text-[12px] text-ink-700">
                  你投给了 <span className="font-bold">{hasVoted === 'affirm' ? affirmChar.name : negateChar.name}</span>
                  {(hasVoted === 'affirm' && affirmPercent > 50 || hasVoted === 'negate' && affirmPercent <= 50)
                    ? ' — 你的选择是多数派！'
                    : ' — 你是少数派，但少数派不一定错'}
                </p>
              </div>
            )}

            <button
              onClick={handleReset}
              className="w-full py-3 rounded-xl bg-seal/10 text-seal text-[13px] font-medium active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            >
              <RotateCcw size={14} />
              再来一场
            </button>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-[9px] text-ink-300 text-center pb-2">
          AI 辩论内容由大语言模型生成，仅供参考和娱乐<br />
          观点不代表平台立场
        </p>
      </div>
    </div>
  )
}

// ===== Sub-components =====

function ThinkingProcess({ char, steps, isAnimating }: {
  char: AICharacter
  steps: ThinkingStep[]
  isAnimating: boolean
}) {
  // Show all steps immediately if not animating (fast-forward)
  const [visibleCount, setVisibleCount] = useState(isAnimating ? 0 : steps.length)

  useEffect(() => {
    if (!isAnimating) {
      setVisibleCount(steps.length)
      return
    }
    setVisibleCount(0)
    const timers: ReturnType<typeof setTimeout>[] = []
    steps.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleCount(i + 1), 500 + i * 800))
    })
    return () => timers.forEach(clearTimeout)
  }, [steps, isAnimating])

  return (
    <div className={`flex gap-2.5 ${isAnimating ? '' : ''}`}>
      {/* Avatar with thinking indicator */}
      <div className="relative flex-shrink-0">
        <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${char.visual.gradientFrom} ${char.visual.gradientTo} flex items-center justify-center shadow-md`}>
          <CharacterIcon characterId={char.id} size={16} className="text-white" />
        </div>
        {visibleCount < steps.length && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-paper border-2 border-surface flex items-center justify-center">
            <Brain size={7} className="text-ink-400 animate-pulse" />
          </div>
        )}
      </div>

      {/* Thinking steps */}
      <div className="flex-1 space-y-1.5">
        <p className={`text-[10px] ${char.visual.textColor} font-medium`}>
          {char.name} 正在思考……
        </p>
        {steps.slice(0, visibleCount).map((step, i) => (
          <div
            key={i}
            className="flex items-start gap-2 animate-fade-in-up"
          >
            {(() => {
              const IconComponent = THINKING_ICON_MAP[step.icon] || Search
              return <IconComponent size={12} className="flex-shrink-0 mt-0.5 text-ink-400" />
            })()}
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-ink-400 font-medium">{step.label}</span>
              <p className="text-[11px] text-ink-600 leading-relaxed">{step.content}</p>
            </div>
          </div>
        ))}
        {/* Loading dots for next step */}
        {visibleCount < steps.length && (
          <div className="flex items-center gap-1.5 pl-5">
            <span className="w-1 h-1 rounded-full bg-ink-300 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1 h-1 rounded-full bg-ink-300 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1 h-1 rounded-full bg-ink-300 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>
    </div>
  )
}

function SpeechBubble({ char, content, isTyping, align }: {
  char: AICharacter
  content: string
  isTyping: boolean
  align: 'left' | 'right'
}) {
  const isLeft = align === 'left'
  return (
    <div className={`flex gap-2.5 animate-fade-in-up ${isLeft ? '' : 'flex-row-reverse'}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${char.visual.gradientFrom} ${char.visual.gradientTo} flex items-center justify-center flex-shrink-0 shadow-md`}>
        <CharacterIcon characterId={char.id} size={16} className="text-white" />
      </div>

      {/* Bubble */}
      <div className={`max-w-[80%] ${isLeft ? '' : 'text-right'}`}>
        <div className={`inline-block px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
          isLeft
            ? `${char.visual.bubbleBg} border ${char.visual.bubbleBorder} text-ink-900 rounded-tl-md`
            : `${char.visual.bubbleBg} border ${char.visual.bubbleBorder} text-ink-900 rounded-tr-md`
        }`}>
          {content}
          {isTyping && (
            <span className="inline-block w-0.5 h-3.5 bg-ink-400 ml-0.5 animate-pulse align-middle" />
          )}
        </div>
        <p className={`text-[10px] text-ink-400 mt-0.5 ${isLeft ? 'text-left' : 'text-right'}`}>
          {char.name} · {char.title}
        </p>
      </div>
    </div>
  )
}

function ScoreCard({ score, affirmName, negateName, affirmColor, negateColor }: {
  score: { affirmScore: number; negateScore: number; winner: string; reason: string }
  affirmName: string
  negateName: string
  affirmColor: string
  negateColor: string
}) {
  return (
    <div className="bg-surface/80 backdrop-blur-sm rounded-xl border border-line/20 p-3 animate-fade-in-up">
      <div className="flex items-center gap-2 mb-2">
        <Shield size={12} className="text-ink-400" />
        <span className="text-[11px] text-ink-500 font-medium">评委打分</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-center flex-1">
          <span className={`text-[18px] font-bold ${affirmColor}`}>{score.affirmScore}</span>
          <p className="text-[10px] text-ink-400">{affirmName}</p>
        </div>
        <div className="px-3 py-1 rounded-lg bg-paper-dark">
          <span className="text-[10px] text-ink-500">
            {score.winner === 'draw' ? '平局' : score.winner === 'affirm' ? `${affirmName}领先` : `${negateName}领先`}
          </span>
        </div>
        <div className="text-center flex-1">
          <span className={`text-[18px] font-bold ${negateColor}`}>{score.negateScore}</span>
          <p className="text-[10px] text-ink-400">{negateName}</p>
        </div>
      </div>
      <p className="text-[11px] text-ink-500 text-center mt-2 italic">"{score.reason}"</p>
    </div>
  )
}

function HighlightCard({ highlight, affirmName, negateName }: {
  highlight: Highlight
  affirmName: string
  negateName: string
}) {
  const charName = highlight.side === 'affirm' ? affirmName : negateName
  return (
    <div className="bg-gradient-to-r from-amber-50 to-cyan-50 rounded-xl border border-amber-200/30 p-3 animate-fade-in-up">
      <div className="flex items-center gap-2 mb-1.5">
        <Sparkles size={14} className="text-amber-500" />
        <span className="text-[12px] font-bold text-ink-800">{highlight.label}</span>
        <span className="text-[10px] text-ink-400">· {charName}</span>
      </div>
      <p className="text-[12px] text-ink-700 italic leading-relaxed">"{highlight.quote}"</p>
    </div>
  )
}

function TauntCard({ taunt, affirmChar, negateChar }: {
  taunt: TauntMoment
  affirmChar: AICharacter
  negateChar: AICharacter
}) {
  const char = taunt.side === 'affirm' ? affirmChar : negateChar
  return (
    <div className={`rounded-xl border ${char.visual.bubbleBorder} ${char.visual.bubbleBg} p-3 animate-fade-in-up`}>
      <div className="flex items-center gap-2 mb-1">
        <CharacterIcon characterId={char.id} size={14} className={char.visual.textColor} />
        <span className={`text-[11px] font-semibold ${char.visual.textColor}`}>{char.name} 不甘示弱：</span>
      </div>
      <p className="text-[12px] text-ink-700 leading-relaxed">{taunt.content}</p>
    </div>
  )
}

function ClosingCeremony({ result, affirmChar, negateChar, topic: _topic }: {
  result: FinalResult
  affirmChar: AICharacter
  negateChar: AICharacter
  topic: { affirmLabel: string; negateLabel: string }
}) {
  const affirmWon = result.winner === 'affirm'
  const isDraw = result.winner === 'draw'

  return (
    <div className="bg-surface rounded-xl shadow-card p-4 animate-fade-in-up space-y-4">
      {/* Winner announcement */}
      <div className="text-center">
        <Trophy size={28} className="text-gold mx-auto mb-2" />
        <p className="text-[16px] font-bold text-ink-900">
          {isDraw ? '势均力敌！' : `${affirmWon ? affirmChar.name : negateChar.name} 获胜！`}
        </p>
        <p className="text-[12px] text-ink-500 mt-1">
          评委打分 {result.affirmTotalScore} : {result.negateTotalScore}
        </p>
      </div>

      {/* Closing words */}
      <div className="space-y-3">
        <ClosingBubble char={affirmChar} text={result.affirmClosing} isWinner={affirmWon || isDraw} />
        <ClosingBubble char={negateChar} text={result.negateClosing} isWinner={!affirmWon || isDraw} />
      </div>

      {/* Respect */}
      <div className="border-t border-line/20 pt-3 space-y-2">
        <p className="text-[11px] text-ink-400 text-center font-medium">互致敬意</p>
        <div className="bg-paper-dark/50 rounded-xl p-3 space-y-2">
          <p className="text-[12px] text-ink-600 leading-relaxed">
            <span className={`font-semibold ${affirmChar.visual.textColor}`}>{affirmChar.name}：</span>
            {result.affirmRespect}
          </p>
          <p className="text-[12px] text-ink-600 leading-relaxed">
            <span className={`font-semibold ${negateChar.visual.textColor}`}>{negateChar.name}：</span>
            {result.negateRespect}
          </p>
        </div>
      </div>
    </div>
  )
}

function ClosingBubble({ char, text, isWinner }: {
  char: AICharacter
  text: string
  isWinner: boolean
}) {
  return (
    <div className={`flex gap-2.5 items-start ${isWinner ? '' : 'opacity-80'}`}>
      <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${char.visual.gradientFrom} ${char.visual.gradientTo} flex items-center justify-center flex-shrink-0`}>
        <CharacterIcon characterId={char.id} size={14} className="text-white" />
      </div>
      <div className="flex-1">
        <p className="text-[10px] text-ink-400 mb-0.5 flex items-center gap-0.5">
          {char.name} {isWinner && <Crown size={10} className="text-gold" />}
        </p>
        <p className="text-[12px] text-ink-700 leading-relaxed">{text}</p>
      </div>
    </div>
  )
}
