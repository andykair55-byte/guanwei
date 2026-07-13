import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Play, FastForward, Trophy, RotateCcw,
  MessageCircle, Share2, MoreHorizontal, ThumbsUp,
  BookOpen, Swords as SwordsIcon, RefreshCw, Loader2,
  Flame, Sparkles,
} from 'lucide-react'
import {
  getTopic, getMockMatch,
  type DebateMatch, type DebateRound, type Highlight, type TauntMoment, type FinalResult, type ThinkingStep,
} from '../services/debateArenaService'
import { type AICharacter } from '../services/characters'
import { initThemeDebate, runThemeDebate } from '../services/themeDebateService'
import DanmakuOverlay from '../components/DanmakuOverlay'
import { pickDanmaku, toQueueItems, type DanmakuQueueItem, type DanmakuTrigger } from '../services/danmakuService'
import PixelAvatar, { PixelAvatarSmall } from '../components/PixelAvatar'

// ===== Faction / Skill data =====
const FACTION_MAP: Record<string, string> = {
  'zhuge-liang': '蜀', 'zhuge-liang-2': '蜀',
  'wang-lang': '魏',
  'mengzi': '儒', 'xunzi': '儒',
  'zhou-yu': '吴',
  'lu-xun': '新', 'hu-shi': '新',
  'baize': '神', 'xiezhi': '神',
}

const SKILL_TAGS: Record<string, { name: string; icon: string }[]> = {
  'zhuge-liang': [{ name: '舌战群儒', icon: '⚔️' }, { name: '空城计', icon: '' }],
  'wang-lang': [{ name: '巧言令色', icon: '' }, { name: '偷换概念', icon: '🎭' }],
  'baize': [{ name: '数据洞察', icon: '📊' }, { name: '逻辑推演', icon: '🔍' }],
  'xiezhi': [{ name: '铁面无私', icon: '⚖️' }, { name: '一击必杀', icon: '⚔️' }],
}

// ===== Typing animation hook =====
function useTypingAnimation(text: string, speed: number = 25, trigger: boolean = false) {
  const [displayed, setDisplayed] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  useEffect(() => {
    if (!trigger || !text) { setDisplayed(''); return }
    setIsTyping(true); setDisplayed('')
    let i = 0
    const timer = setInterval(() => {
      i++; setDisplayed(text.slice(0, i))
      if (i >= text.length) { clearInterval(timer); setIsTyping(false) }
    }, speed)
    return () => clearInterval(timer)
  }, [text, speed, trigger])
  return { displayed, isTyping }
}

type Phase = 'think-affirm' | 'affirm' | 'think-negate' | 'negate' | 'scored'
interface RevealedState { round: DebateRound; phase: Phase }

// ===== Main Component =====
export default function AIArena() {
  const { topicId } = useParams<{ topicId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const themeId = searchParams.get('theme')
  const affirmCharId = searchParams.get('affirm') || 'baize'
  const negateCharId = searchParams.get('negate') || 'xiezhi'
  const roundsParam = parseInt(searchParams.get('rounds') || '5', 10)

  const [match, setMatch] = useState<DebateMatch>(() => {
    if (themeId) {
      const init = initThemeDebate(themeId, topicId || 'college')
      if (init) return { topic: init.topic, affirmChar: init.affirmChar, negateChar: init.negateChar, rounds: [], totalRounds: roundsParam }
    }
    const fallbackTopic = getTopic(topicId || 'college') || getTopic('college')!
    return getMockMatch(fallbackTopic.id, affirmCharId, negateCharId, roundsParam)
  })
  const topic = match.topic
  const affirmChar = match.affirmChar
  const negateChar = match.negateChar

  const [revealed, setRevealed] = useState<RevealedState[]>([])
  const [isAutoPlaying, setIsAutoPlaying] = useState(false)
  const [affirmVotes, setAffirmVotes] = useState(23876)
  const [negateVotes, setNegateVotes] = useState(11248)
  const [hasVoted, setHasVoted] = useState<'affirm' | 'negate' | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [showClosing, setShowClosing] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [isLoadingDebate, setIsLoadingDebate] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [danmakuEnabled, setDanmakuEnabled] = useState(true)
  const [danmakuQueue, setDanmakuQueue] = useState<DanmakuQueueItem[]>([])
  const [viewerCount, setViewerCount] = useState(23124)

  useEffect(() => {
    const t = setInterval(() => setViewerCount(v => v + Math.floor(Math.random() * 7) - 3), 3000)
    return () => clearInterval(t)
  }, [])

  const debateHeat = 98766 + revealed.length * 1200

  const pushDanmaku = useCallback((trigger: DanmakuTrigger, count: number, characterId?: string) => {
    if (!danmakuEnabled) return
    setDanmakuQueue(prev => [...prev, ...toQueueItems(pickDanmaku(trigger, count, characterId))])
  }, [danmakuEnabled])

  const handleDanmakuComplete = useCallback((id: string) => {
    setDanmakuQueue(prev => prev.filter(d => d.id !== id))
  }, [])

  useEffect(() => {
    if (!themeId || match.rounds.length > 0) return
    let cancelled = false
    const init = initThemeDebate(themeId, topicId || 'college')
    if (!init) return
    setIsLoadingDebate(true); setLoadError(null)
    runThemeDebate(init.topic, init.affirmChar, init.negateChar, roundsParam)
      .then(m => { if (!cancelled) { setMatch(m); setIsLoadingDebate(false) } })
      .catch(err => { if (!cancelled) { setLoadError(err.message || '辩论加载失败'); setIsLoadingDebate(false) } })
    return () => { cancelled = true }
  }, [themeId, topicId, roundsParam, reloadKey])

  const totalRounds = match.totalRounds
  const isComplete = revealed.length >= totalRounds && revealed.every(r => r.phase === 'scored')
  const lastRevealed = revealed[revealed.length - 1]

  const typingTarget = (() => {
    if (!lastRevealed) return ''
    if (lastRevealed.phase === 'affirm') return lastRevealed.round.affirm.content
    if (lastRevealed.phase === 'negate') return lastRevealed.round.negate.content
    return ''
  })()
  const { displayed, isTyping } = useTypingAnimation(typingTarget, 22, !!typingTarget)

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [revealed.length, displayed])

  const prevPhaseRef = useRef<string>('')
  useEffect(() => {
    const last = revealed[revealed.length - 1]; if (!last) return
    const key = `${last.round.round}-${last.phase}`; if (key === prevPhaseRef.current) return
    prevPhaseRef.current = key
    const charId = last.phase === 'affirm' ? affirmChar.id : last.phase === 'negate' ? negateChar.id : undefined
    if (last.phase === 'affirm' || last.phase === 'negate') pushDanmaku('speech', 2 + Math.floor(Math.random() * 3), charId)
    else if (last.phase === 'scored') {
      if (last.round.highlight) pushDanmaku('highlight', 3 + Math.floor(Math.random() * 3), last.round.highlight.characterId)
      if (last.round.taunt) pushDanmaku('taunt', 2 + Math.floor(Math.random() * 2))
    }
  }, [revealed, affirmChar.id, negateChar.id, pushDanmaku])

  useEffect(() => { if (showClosing) pushDanmaku('closing', 5 + Math.floor(Math.random() * 4)) }, [showClosing, pushDanmaku])

  const advance = useCallback(() => {
    if (revealed.length === 0) { setRevealed([{ round: match.rounds[0], phase: 'think-affirm' }]); return }
    const last = revealed[revealed.length - 1]
    if (last.phase === 'think-affirm') setRevealed(p => [...p.slice(0, -1), { ...last, phase: 'affirm' }])
    else if (last.phase === 'affirm') setRevealed(p => [...p.slice(0, -1), { ...last, phase: 'think-negate' }])
    else if (last.phase === 'think-negate') setRevealed(p => [...p.slice(0, -1), { ...last, phase: 'negate' }])
    else if (last.phase === 'negate') setRevealed(p => [...p.slice(0, -1), { ...last, phase: 'scored' }])
    else {
      const nextIdx = match.rounds.indexOf(last.round) + 1
      if (nextIdx < match.rounds.length) setRevealed(p => [...p, { round: match.rounds[nextIdx], phase: 'think-affirm' }])
    }
  }, [revealed, match])

  useEffect(() => {
    if (!isAutoPlaying || isComplete || isTyping) return
    const isThinking = lastRevealed?.phase === 'think-affirm' || lastRevealed?.phase === 'think-negate'
    const t = setTimeout(() => advance(), isThinking ? 3000 : 800)
    return () => clearTimeout(t)
  }, [isAutoPlaying, isComplete, isTyping, advance, lastRevealed])

  const handleStart = () => { setIsAutoPlaying(true); if (revealed.length === 0) advance() }
  const handleFastForward = () => { setIsAutoPlaying(false); setRevealed(match.rounds.map(r => ({ round: r, phase: 'scored' as Phase }))) }
  const handleReset = () => {
    setRevealed([]); setIsAutoPlaying(false); setShowResult(false); setShowClosing(false)
    setDanmakuQueue([]); prevPhaseRef.current = ''
    if (themeId) {
      const init = initThemeDebate(themeId, topicId || 'college')
      if (init) { setMatch({ topic: init.topic, affirmChar: init.affirmChar, negateChar: init.negateChar, rounds: [], totalRounds: roundsParam }); setLoadError(null); setReloadKey(k => k + 1); return }
    }
    setMatch(getMockMatch(topic.id, affirmCharId, negateCharId, roundsParam))
  }

  const handleVote = (side: 'affirm' | 'negate') => {
    if (hasVoted) return; setHasVoted(side)
    if (side === 'affirm') setAffirmVotes(v => v + 1); else setNegateVotes(v => v + 1)
  }

  const totalVotes = affirmVotes + negateVotes
  const affirmPercent = totalVotes > 0 ? Math.round((affirmVotes / totalVotes) * 100) : 50
  const currentRoundNum = revealed.length > 0 ? match.rounds.indexOf(revealed[revealed.length - 1].round) + 1 : 0
  const affirmFaction = FACTION_MAP[affirmChar.id] || ''
  const negateFaction = FACTION_MAP[negateChar.id] || ''
  const affirmSkills = SKILL_TAGS[affirmChar.id] || []
  const negateSkills = SKILL_TAGS[negateChar.id] || []
  const isThemeMode = !!themeId
  const battleTitle = isThemeMode ? '历史名战' : 'AI 对决'

  return (
    <div className="arena-page">
      <DanmakuOverlay items={danmakuQueue} enabled={danmakuEnabled} onItemComplete={handleDanmakuComplete} />

      {/* ===== HEADER ===== */}
      <header className="arena-header">
        <div className="arena-header-left">
          <div className="arena-logo">
            <span className="arena-logo-icon">🦊</span>
            <div>
              <h1 className="arena-logo-title">AI竞技场 <span className="arena-beta-tag">BETA</span></h1>
              <p className="arena-logo-subtitle">看AI斗嘴 · 看热闹 · 看乐子</p>
            </div>
          </div>
        </div>
        <div className="arena-header-center">
          <div className="arena-live-badge"><span className="arena-live-dot" /><span>LIVE</span></div>
          <div className="arena-viewer-count">
            <Flame size={16} className="arena-fire-icon" />
            <span>{viewerCount.toLocaleString()}</span>
            <span className="arena-viewer-label">人正在围观</span>
          </div>
        </div>
        <div className="arena-header-right">
          <button className="arena-header-btn"><Share2 size={16} /><span>分享</span></button>
          <button className="arena-header-btn arena-header-btn-icon"><MoreHorizontal size={18} /></button>
        </div>
      </header>

      {/* ===== BATTLE ARENA ===== */}
      <div className="arena-battle">
        <div className="arena-battle-title-bar"><span className="arena-battle-title-label">{battleTitle}</span></div>

        <div className="arena-vs-display">
          {/* Affirm Character */}
          <div className="arena-character">
            <div className="arena-char-info">
              <span className="arena-char-name">{affirmChar.name}</span>
              <span className="arena-char-era">{affirmChar.title}</span>
              {affirmFaction && <span className="arena-faction-badge arena-faction-affirm">{affirmFaction}</span>}
            </div>
            <PixelAvatar characterId={affirmChar.id} name={affirmChar.name} size={180} />
            <div className="arena-character-tags">
              {affirmSkills.map((s, i) => <span key={i} className="arena-skill-tag">{s.icon}{s.name}</span>)}
            </div>
          </div>

          {/* VS Center */}
          <div className="arena-vs-center">
            <div className="arena-vs-text">
              <span className="arena-vs-name">{affirmChar.name}</span>
              <span className="arena-vs-vs">VS</span>
              <span className="arena-vs-name">{negateChar.name}</span>
            </div>
            <div className="arena-round-badge">
              <span className="arena-round-diamond">◆</span>
              <span>{currentRoundNum > 0 ? `第 ${currentRoundNum} 回合 · 正在辩论中` : isLoadingDebate ? 'AI 准备中…' : '即将开始'}</span>
              <span className="arena-round-diamond">◆</span>
            </div>
            <div className="arena-vs-swords">⚔️</div>
          </div>

          {/* Negate Character */}
          <div className="arena-character">
            <div className="arena-char-info">
              {negateFaction && <span className="arena-faction-badge arena-faction-negate">{negateFaction}</span>}
              <span className="arena-char-era">{negateChar.title}</span>
              <span className="arena-char-name">{negateChar.name}</span>
            </div>
            <PixelAvatar characterId={negateChar.id} name={negateChar.name} size={180} flip />
            <div className="arena-character-tags">
              {negateSkills.map((s, i) => <span key={i} className="arena-skill-tag">{s.icon}{s.name}</span>)}
            </div>
          </div>
        </div>

        {/* Voting Bar */}
        <div className="arena-voting-bar">
          <div className="arena-vote-side">
            <ThumbsUp size={28} className="arena-vote-thumb-up" />
            <div>
              <span className="arena-vote-label">支持率</span>
              <div className="arena-vote-number">
                <span className="arena-vote-percent">{affirmPercent}%</span>
                <span className="arena-vote-count">{affirmVotes.toLocaleString()} 票</span>
              </div>
            </div>
          </div>
          <div className="arena-heat-center">
            <div className="arena-heat-label">辩论热度</div>
            <div className="arena-heat-number"><Flame size={20} className="arena-fire-icon" /><span>{debateHeat.toLocaleString()}</span></div>
          </div>
          <div className="arena-vote-side arena-vote-side-right">
            <div className="arena-vote-info-right">
              <span className="arena-vote-label">支持率</span>
              <div className="arena-vote-number">
                <span className="arena-vote-count">{negateVotes.toLocaleString()} 票</span>
                <span className="arena-vote-percent">{100 - affirmPercent}%</span>
              </div>
            </div>
            <ThumbsUp size={28} className="arena-vote-thumb-down" />
          </div>
        </div>

        {/* Progress bar */}
        <div className="arena-progress-bar">
          <div className="arena-progress-fill-left" style={{ width: `${affirmPercent}%` }} />
          <div className="arena-progress-fill-right" style={{ width: `${100 - affirmPercent}%` }} />
        </div>
      </div>

      {/* ===== DEBATE CHAT ===== */}
      <div className="arena-chat">
        {revealed.map((item, i) => {
          const round = item.round; const isLast = i === revealed.length - 1
          const showAffirmThinking = item.phase === 'think-affirm'
          const showAffirmSpeech = item.phase === 'affirm' || item.phase === 'think-negate' || item.phase === 'negate' || item.phase === 'scored'
          const showNegateThinking = item.phase === 'think-negate'
          const showNegateSpeech = item.phase === 'negate' || item.phase === 'scored'
          const showScore = item.phase === 'scored'
          return (
            <div key={i} className="arena-chat-round">
              {i > 0 && <div className="arena-round-divider"><span>第 {round.round} 回合</span></div>}
              {showAffirmThinking && round.affirm.thinkingSteps && <ThinkingProcess char={affirmChar} steps={round.affirm.thinkingSteps} isAnimating={isLast} />}
              {showAffirmSpeech && <ChatBubble char={affirmChar} content={isLast && item.phase === 'affirm' ? displayed : round.affirm.content} isTyping={isLast && item.phase === 'affirm' && isTyping} isRight={false} faction={affirmFaction} />}
              {showNegateThinking && round.negate.thinkingSteps && <ThinkingProcess char={negateChar} steps={round.negate.thinkingSteps} isAnimating={isLast} />}
              {showNegateSpeech && <ChatBubble char={negateChar} content={isLast && item.phase === 'negate' ? displayed : round.negate.content} isTyping={isLast && item.phase === 'negate' && isTyping} isRight={true} faction={negateFaction} />}
              {showScore && <ScoreCard score={round.score} affirmName={affirmChar.name} negateName={negateChar.name} />}
              {showScore && round.highlight && <HighlightCard highlight={round.highlight} affirmName={affirmChar.name} negateName={negateChar.name} />}
              {showScore && round.taunt && <TauntCard taunt={round.taunt} affirmChar={affirmChar} negateChar={negateChar} />}
            </div>
          )
        })}
        <div ref={chatEndRef} />
      </div>

      {/* ===== CONTROLS ===== */}
      {!isComplete && (
        <div className="arena-controls">
          {(isLoadingDebate || (themeId && match.rounds.length === 0 && !loadError)) && (
            <div className="arena-ctrl-loading"><Loader2 size={16} className="animate-spin" />AI 正在准备辩论…</div>
          )}
          {loadError && !isLoadingDebate && <button onClick={() => setReloadKey(k => k + 1)} className="arena-ctrl-btn arena-ctrl-error">{loadError} · 点击重试</button>}
          {!isLoadingDebate && !loadError && match.rounds.length > 0 && (
            <>
              {!isAutoPlaying && revealed.length === 0 && <button onClick={handleStart} className="arena-ctrl-btn arena-ctrl-primary"><Play size={16} />开始辩论</button>}
              {!isAutoPlaying && revealed.length > 0 && (
                <button onClick={advance} className="arena-ctrl-btn arena-ctrl-secondary">
                  <Play size={14} />
                  {lastRevealed?.phase === 'think-affirm' ? `${affirmChar.name}发言` : lastRevealed?.phase === 'affirm' ? `${negateChar.name}思考` : lastRevealed?.phase === 'think-negate' ? `${negateChar.name}发言` : lastRevealed?.phase === 'negate' ? '评委打分' : '下一回合'}
                </button>
              )}
              {!isAutoPlaying && <button onClick={handleStart} className="arena-ctrl-btn arena-ctrl-secondary"><FastForward size={14} />自动播放</button>}
              {isAutoPlaying && <button onClick={() => setIsAutoPlaying(false)} className="arena-ctrl-btn arena-ctrl-secondary">暂停</button>}
              <button onClick={handleFastForward} className="arena-ctrl-btn arena-ctrl-ghost"><FastForward size={12} />跳过</button>
            </>
          )}
        </div>
      )}

      {/* ===== ACTION BUTTONS ===== */}
      <div className="arena-actions">
        <button className={`arena-action-btn ${hasVoted === 'affirm' ? 'arena-action-active' : ''}`} onClick={() => handleVote('affirm')} disabled={!!hasVoted}>
          <ThumbsUp size={20} /><div><span>点赞{affirmChar.name}</span><small>{affirmVotes.toLocaleString()}</small></div>
        </button>
        <button className="arena-action-btn"><BookOpen size={20} /><div><span>要求举证</span><small>12,345</small></div></button>
        <button className="arena-action-btn"><SwordsIcon size={20} /><div><span>申请反驳</span><small>8,923</small></div></button>
        <button className="arena-action-btn"><RefreshCw size={20} /><div><span>换个角度</span><small>6,789</small></div></button>
        <button className="arena-action-btn"><Share2 size={20} /><div><span>分享本场</span><small>9,876</small></div></button>
      </div>

      <div className="arena-tip"><span></span><span>小提示：你的互动会影响辩论走向哦！</span><span className="arena-tip-help">?</span></div>

      {/* Closing / Result */}
      {isComplete && !showClosing && match.finalResult && (
        <button onClick={() => setShowClosing(true)} className="arena-ctrl-btn arena-ctrl-primary arena-ctrl-gold"><Trophy size={16} />查看最终结果</button>
      )}
      {showClosing && match.finalResult && <ClosingCeremony result={match.finalResult} affirmChar={affirmChar} negateChar={negateChar} />}
      {showClosing && !showResult && (
        <div className="arena-vote-panel">
          <div className="arena-vote-panel-header"><MessageCircle size={20} /><p>谁说服了你？</p><small>投出你的一票</small></div>
          <div className="arena-vote-panel-btns">
            <button onClick={() => handleVote('affirm')} className={`arena-vote-panel-btn ${hasVoted === 'affirm' ? 'arena-vote-panel-btn-active' : ''}`}><ThumbsUp size={16} />{affirmChar.name}</button>
            <button onClick={() => handleVote('negate')} className={`arena-vote-panel-btn ${hasVoted === 'negate' ? 'arena-vote-panel-btn-active' : ''}`}><ThumbsUp size={16} />{negateChar.name}</button>
          </div>
          <button onClick={() => setShowResult(true)} className="arena-vote-panel-skip">{hasVoted ? '查看结果' : '跳过投票，查看结果'}</button>
        </div>
      )}
      {showResult && (
        <div className="arena-result-panel">
          <div className="arena-result-header"><Trophy size={16} /><span>观众投票</span><small>{totalVotes.toLocaleString()} 票</small></div>
          <div className="arena-result-bar">
            <div className="arena-result-bar-left" style={{ width: `${affirmPercent}%` }}>{affirmPercent > 15 && <span>{affirmPercent}%</span>}</div>
            <div className="arena-result-bar-right" style={{ width: `${100 - affirmPercent}%` }}>{100 - affirmPercent > 15 && <span>{100 - affirmPercent}%</span>}</div>
          </div>
          <div className="arena-result-info">
            <div><strong>{affirmChar.name}</strong><br /><small>{affirmVotes.toLocaleString()} 票</small></div>
            <div><strong>{negateChar.name}</strong><br /><small>{negateVotes.toLocaleString()} 票</small></div>
          </div>
          <button onClick={handleReset} className="arena-ctrl-btn arena-ctrl-secondary" style={{ width: '100%' }}><RotateCcw size={14} />再来一场</button>
        </div>
      )}

      {/* Bottom Nav */}
      <div className="arena-bottom-nav">
        <span className="arena-bottom-nav-label">更多玩法：</span>
        <button className={`arena-bottom-nav-item ${isThemeMode ? 'arena-bottom-nav-active' : ''}`} onClick={() => navigate('/entertainment/arena/ai-battle/shelian?theme=shelian')}>历史名战</button>
        <button className="arena-bottom-nav-item">AI新秀赛</button>
        <button className="arena-bottom-nav-item" onClick={() => navigate('/entertainment/arena/human-battle')}>自由辩论</button>
        <button className="arena-bottom-nav-item">我的关注</button>
      </div>

      <p className="arena-disclaimer">AI 辩论内容由大语言模型生成，仅供参考和娱乐 · 观点不代表平台立场</p>

      {/* Mascot */}
      <div className="arena-mascot">
        <div className="arena-mascot-bubble">做个快乐的围观群众~</div>
        <div className="arena-mascot-avatar" />
      </div>
    </div>
  )
}

// ===== Chat Bubble =====
function ChatBubble({ char, content, isTyping, isRight, faction }: { char: AICharacter; content: string; isTyping: boolean; isRight: boolean; faction: string }) {
  return (
    <div className={`arena-bubble ${isRight ? 'arena-bubble-right' : ''}`}>
      <PixelAvatarSmall characterId={char.id} name={char.name} size={36} flip={isRight} />
      <div className={`arena-bubble-content ${isRight ? 'arena-bubble-content-right' : ''}`}>
        <div className="arena-bubble-header">
          <span className="arena-bubble-name">{char.name}</span>
          {faction && <span className="arena-bubble-faction">{faction}</span>}
        </div>
        <div className="arena-bubble-text">{content}{isTyping && <span className="arena-bubble-cursor" />}</div>
        <div className="arena-bubble-time">{new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
      </div>
    </div>
  )
}

// ===== Thinking Process =====
function ThinkingProcess({ char, steps, isAnimating }: { char: AICharacter; steps: ThinkingStep[]; isAnimating: boolean }) {
  const [visibleCount, setVisibleCount] = useState(isAnimating ? 0 : steps.length)
  useEffect(() => {
    if (!isAnimating) { setVisibleCount(steps.length); return }
    setVisibleCount(0)
    const timers: ReturnType<typeof setTimeout>[] = []
    steps.forEach((_, i) => { timers.push(setTimeout(() => setVisibleCount(i + 1), 500 + i * 800)) })
    return () => timers.forEach(clearTimeout)
  }, [steps, isAnimating])
  return (
    <div className="arena-thinking">
      <PixelAvatarSmall characterId={char.id} name={char.name} size={28} />
      <div className="arena-thinking-content">
        <p className="arena-thinking-label">{char.name} 正在思考……</p>
        {steps.slice(0, visibleCount).map((step, i) => (
          <div key={i} className="arena-thinking-step animate-fade-in-up">
            <span className="arena-thinking-step-icon">{step.icon}</span>
            <div><span className="arena-thinking-step-label">{step.label}</span><p className="arena-thinking-step-text">{step.content}</p></div>
          </div>
        ))}
        {visibleCount < steps.length && (
          <div className="arena-thinking-dots">
            <span className="arena-thinking-dot" style={{ animationDelay: '0ms' }} />
            <span className="arena-thinking-dot" style={{ animationDelay: '150ms' }} />
            <span className="arena-thinking-dot" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>
    </div>
  )
}

// ===== Score Card =====
function ScoreCard({ score, affirmName, negateName }: { score: { affirmScore: number; negateScore: number; winner: string; reason: string }; affirmName: string; negateName: string }) {
  return (
    <div className="arena-score-card animate-fade-in-up">
      <div className="arena-score-header"><span>🛡️</span><span>评委打分</span></div>
      <div className="arena-score-body">
        <div className="arena-score-side"><span className="arena-score-num arena-score-affirm">{score.affirmScore}</span><small>{affirmName}</small></div>
        <div className="arena-score-vs">{score.winner === 'draw' ? '平局' : score.winner === 'affirm' ? `${affirmName}领先` : `${negateName}领先`}</div>
        <div className="arena-score-side"><span className="arena-score-num arena-score-negate">{score.negateScore}</span><small>{negateName}</small></div>
      </div>
      <p className="arena-score-reason">"{score.reason}"</p>
    </div>
  )
}

// ===== Highlight Card =====
function HighlightCard({ highlight, affirmName, negateName }: { highlight: Highlight; affirmName: string; negateName: string }) {
  const charName = highlight.side === 'affirm' ? affirmName : negateName
  return (
    <div className="arena-highlight-card animate-fade-in-up">
      <div className="arena-highlight-card-header"><Sparkles size={14} /><span className="arena-highlight-card-label">{highlight.label}</span><span className="arena-highlight-card-name">· {charName}</span></div>
      <p className="arena-highlight-card-quote">"{highlight.quote}"</p>
    </div>
  )
}

// ===== Taunt Card =====
function TauntCard({ taunt, affirmChar, negateChar }: { taunt: TauntMoment; affirmChar: AICharacter; negateChar: AICharacter }) {
  const char = taunt.side === 'affirm' ? affirmChar : negateChar
  return (
    <div className="arena-taunt-card animate-fade-in-up">
      <div className="arena-taunt-header"><PixelAvatarSmall characterId={char.id} name={char.name} size={18} /><span className="arena-taunt-name">{char.name} 不甘示弱：</span></div>
      <p className="arena-taunt-text">{taunt.content}</p>
    </div>
  )
}

// ===== Closing Ceremony =====
function ClosingCeremony({ result, affirmChar, negateChar }: { result: FinalResult; affirmChar: AICharacter; negateChar: AICharacter }) {
  const affirmWon = result.winner === 'affirm'; const isDraw = result.winner === 'draw'
  return (
    <div className="arena-closing animate-fade-in-up">
      <div className="arena-closing-header">
        <Trophy size={28} className="arena-closing-trophy" />
        <p className="arena-closing-title">{isDraw ? '势均力敌！' : `${affirmWon ? affirmChar.name : negateChar.name} 获胜！`}</p>
        <p className="arena-closing-score">评委打分 {result.affirmTotalScore} : {result.negateTotalScore}</p>
      </div>
      <div className="arena-closing-words">
        <div className="arena-closing-bubble">
          <PixelAvatarSmall characterId={affirmChar.id} name={affirmChar.name} size={24} />
          <div><p className="arena-closing-bubble-name">{affirmChar.name} {affirmWon && ''}</p><p>{result.affirmClosing}</p></div>
        </div>
        <div className="arena-closing-bubble">
          <PixelAvatarSmall characterId={negateChar.id} name={negateChar.name} size={24} />
          <div><p className="arena-closing-bubble-name">{negateChar.name} {!affirmWon && '👑'}</p><p>{result.negateClosing}</p></div>
        </div>
      </div>
      <div className="arena-closing-respect">
        <p className="arena-closing-respect-title">互致敬意</p>
        <div className="arena-closing-respect-body">
          <p><strong>{affirmChar.name}：</strong>{result.affirmRespect}</p>
          <p><strong>{negateChar.name}：</strong>{result.negateRespect}</p>
        </div>
      </div>
    </div>
  )
}
