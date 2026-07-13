// src/pages/DebateRoom4v4Demo.tsx
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import DebateStage4v4 from '../components/debate/DebateStage4v4'
import DebateSummaryCard from '../components/debate/DebateSummaryCard'
import {
  createDemoRoom, generateAISpeech, generateScores, getDemoDuration,
} from '../services/nationalDebateService'
import {
  NATIONAL_PHASES,
  type NationalDebateRoom, type NationalSpeech, type DebaterScore, type DebateSide,
} from '../types/nationalDebate'
import { useIsDesktop } from '../hooks/useIsDesktop'

export default function DebateRoom4v4Demo() {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()

  const [room, setRoom] = useState<NationalDebateRoom | null>(null)
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0)
  const [currentSpeechIndex, setCurrentSpeechIndex] = useState(0)
  const [phaseRemaining, setPhaseRemaining] = useState(0)
  const [isAIThinking, setIsAIThinking] = useState(false)
  const [userInput, setUserInput] = useState('')
  const [showSummary, setShowSummary] = useState(false)
  const [scores, setScores] = useState<DebaterScore[]>([])

  // 初始化 demo 房间
  useEffect(() => {
    const demoRoom = createDemoRoom(
      '大学生兼职利大于弊还是弊大于利？',
      '利大于弊',
      '弊大于利',
    )
    setRoom(demoRoom)
    const firstPhase = NATIONAL_PHASES[0]
    setPhaseRemaining(getDemoDuration(firstPhase.duration))
  }, [])

  // 下一个发言或环节
  const nextSpeech = useCallback(() => {
    const phase = NATIONAL_PHASES[currentPhaseIndex]
    if (!phase) return

    if (currentSpeechIndex + 1 < phase.order.length) {
      setCurrentSpeechIndex(prev => prev + 1)
      setPhaseRemaining(getDemoDuration(phase.duration))
    } else {
      // 进入下一环节
      if (currentPhaseIndex + 1 < NATIONAL_PHASES.length) {
        const nextIdx = currentPhaseIndex + 1
        setCurrentPhaseIndex(nextIdx)
        setCurrentSpeechIndex(0)
        setPhaseRemaining(getDemoDuration(NATIONAL_PHASES[nextIdx].duration))
      } else {
        // 辩论结束，评分
        finishDebate()
      }
    }
  }, [currentPhaseIndex, currentSpeechIndex])

  // 辩论结束
  const finishDebate = async () => {
    if (!room) return
    setShowSummary(true)
    const result = await generateScores(room)
    setScores(result)
    const affirmTotal = result.filter(s => s.side === 'affirm').reduce((sum, s) => sum + s.totalScore, 0)
    const negateTotal = result.filter(s => s.side === 'negate').reduce((sum, s) => sum + s.totalScore, 0)
    const winner: DebateSide | 'draw' = affirmTotal > negateTotal ? 'affirm' : negateTotal > affirmTotal ? 'negate' : 'draw'
    const mvp = result.reduce((max, s) => s.totalScore > max.totalScore ? s : max, result[0])
    setRoom(prev => prev ? {
      ...prev,
      status: 'ended',
      scores: result,
      winner,
      mvpSeatId: mvp?.seatId || null,
    } : null)
  }

  // 驱动 AI 发言
  const advanceSpeech = useCallback(async () => {
    if (!room) return
    const phase = NATIONAL_PHASES[currentPhaseIndex]
    if (!phase) return
    const seatId = phase.order[currentSpeechIndex]
    if (!seatId) return

    const seat = room.seats.find(s => s.seatId === seatId)
    if (!seat) return

    // 用户席位等待用户输入
    if (seat.status === 'human') return

    // AI 发言
    setIsAIThinking(true)
    try {
      const content = await generateAISpeech(room, seatId, phase.phase)
      const speech: NationalSpeech = {
        id: `speech-${Date.now()}`,
        seatId,
        side: seat.side,
        position: seat.position,
        nickname: seat.nickname || 'AI',
        avatar: '',
        phase: phase.phase,
        content,
        charLimit: phase.charLimit,
        duration: 0,
        isAI: true,
        createdAt: new Date().toISOString(),
      }
      setRoom(prev => prev ? { ...prev, speeches: [...prev.speeches, speech] } : null)
    } finally {
      setIsAIThinking(false)
    }

    nextSpeech()
  }, [room, currentPhaseIndex, currentSpeechIndex, nextSpeech])

  const handlePhaseTimeUp = () => {
    nextSpeech()
  }

  const handleUserSubmit = () => {
    if (!room || !userInput.trim()) return
    const phase = NATIONAL_PHASES[currentPhaseIndex]
    if (!phase) return
    const seatId = phase.order[currentSpeechIndex]
    const seat = room.seats.find(s => s.seatId === seatId)
    if (!seat) return

    const speech: NationalSpeech = {
      id: `speech-${Date.now()}`,
      seatId,
      side: seat.side,
      position: seat.position,
      nickname: '你',
      avatar: '',
      phase: phase.phase,
      content: userInput.trim(),
      charLimit: phase.charLimit,
      duration: 0,
      isAI: false,
      createdAt: new Date().toISOString(),
    }
    setRoom(prev => prev ? { ...prev, speeches: [...prev.speeches, speech] } : null)
    setUserInput('')
    nextSpeech()
  }

  // 自动驱动 AI 发言
  useEffect(() => {
    if (!room || showSummary || isAIThinking) return
    const phase = NATIONAL_PHASES[currentPhaseIndex]
    if (!phase) return
    const seatId = phase.order[currentSpeechIndex]
    if (!seatId) return
    const seat = room.seats.find(s => s.seatId === seatId)
    if (seat && seat.status === 'ai') {
      const timer = setTimeout(() => advanceSpeech(), 500)
      return () => clearTimeout(timer)
    }
  }, [room, currentPhaseIndex, currentSpeechIndex, showSummary, isAIThinking, advanceSpeech])

  if (!room) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-6 h-6 border-2 border-seal/30 border-t-seal rounded-full animate-spin" />
      </div>
    )
  }

  const userSeat = room.seats.find(s => s.isOwner)
  const affirmTotal = scores.filter(s => s.side === 'affirm').reduce((sum, s) => sum + s.totalScore, 0)
  const negateTotal = scores.filter(s => s.side === 'negate').reduce((sum, s) => sum + s.totalScore, 0)

  return (
    <div className="flex flex-col h-full bg-paper-texture">
      {/* Header */}
      <div className={`px-4 py-2 flex items-center gap-3 bg-surface border-b border-line/30 ${isDesktop ? 'max-w-5xl mx-auto w-full' : ''}`}>
        <button onClick={() => navigate('/entertainment/debate/lobby')} className="p-1 rounded-lg hover:bg-paper-dark">
          <ArrowLeft size={18} className="text-ink-700" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[14px] font-bold text-ink-900 truncate">{room.topic}</h1>
          <p className="text-[10px] text-ink-400">4v4 国赛 · DEMO 模式</p>
        </div>
      </div>

      {/* 舞台 */}
      <div className={`flex-1 flex flex-col ${isDesktop ? 'max-w-5xl mx-auto w-full' : ''}`}>
        {showSummary ? (
          <div className="flex-1 px-4 py-6 overflow-y-auto">
            <DebateSummaryCard
              roomId={room.id}
              topic={room.topic}
              affirmLabel={room.affirmLabel}
              negateLabel={room.negateLabel}
              winner={room.winner === 'affirm' ? room.affirmLabel : room.winner === 'negate' ? room.negateLabel : '平局'}
              mvpName={scores.find(s => s.seatId === room.mvpSeatId)?.nickname || '—'}
              affirmScore={affirmTotal}
              negateScore={negateTotal}
              highlight={room.speeches[0]?.content?.slice(0, 80) || ''}
              source="national-4v4"
            />
            <div className="mt-4 space-y-2">
              {scores.map(s => (
                <div key={s.seatId} className="flex items-center justify-between px-4 py-2 bg-surface rounded-xl">
                  <span className="text-[12px] text-ink-700">
                    {s.side === 'affirm' ? room.affirmLabel : room.negateLabel} · {['一','二','三','四'][s.position-1]}辩 · {s.nickname}
                  </span>
                  <span className="text-[14px] font-bold text-seal">{s.totalScore}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <DebateStage4v4
            room={room}
            currentPhaseIndex={currentPhaseIndex}
            currentSpeechIndex={currentSpeechIndex}
            phaseRemaining={phaseRemaining}
            onPhaseTimeUp={handlePhaseTimeUp}
            userSeatId={userSeat?.seatId || null}
            userInput={userInput}
            onUserInputChange={setUserInput}
            onUserSubmit={handleUserSubmit}
            isAIThinking={isAIThinking}
          />
        )}
      </div>
    </div>
  )
}
