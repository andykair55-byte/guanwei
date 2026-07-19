// src/pages/NationalDebateRoomPage.tsx
// 真实 4v4 国赛辩论房间：华语辩论世锦赛标准赛制

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Trophy, Users, Clock, RotateCcw } from 'lucide-react'
import NationalDebateStage from '../components/debate/NationalDebateStage'
import DebateSummaryCard from '../components/debate/DebateSummaryCard'
import {
  createNationalRoom, NATIONAL_TOPICS, generateAISpeech, generateFinalResult, getDemoDuration,
} from '../services/nationalDebateService'
import {
  NATIONAL_PHASES, type NationalDebateRoom, type NationalSpeech,
} from '../types/nationalDebate'
import { usePlatform } from '../hooks/usePlatform'

export default function NationalDebateRoomPage() {
  const navigate = useNavigate()
  const { roomId } = useParams<{ roomId: string }>()
  const { isWeb } = usePlatform()

  const [room, setRoom] = useState<NationalDebateRoom | null>(null)
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0)
  const [currentSpeechIndex, setCurrentSpeechIndex] = useState(0)
  const [phaseRemaining, setPhaseRemaining] = useState(0)
  const [isAIThinking, setIsAIThinking] = useState(false)
  const [userInput, setUserInput] = useState('')
  const [showSummary, setShowSummary] = useState(false)
  const [isJudging, setIsJudging] = useState(false)
  const [activeTab, setActiveTab] = useState<'stage' | 'judges' | 'spectators'>('stage')

  // 初始化国赛房间：new 则随机辩题，否则可扩展为加载已有房间
  useEffect(() => {
    const topic = NATIONAL_TOPICS[Math.floor(Math.random() * NATIONAL_TOPICS.length)]
    const newRoom = createNationalRoom(topic.topic, topic.affirmLabel, topic.negateLabel)
    setRoom(newRoom)
    const firstPhase = NATIONAL_PHASES[0]
    setPhaseRemaining(getDemoDuration(firstPhase.duration))
  }, [roomId])

  // 辩论结束 → 评委评议
  const finishDebate = useCallback(async () => {
    if (!room) return
    setIsJudging(true)
    setRoom(prev => prev ? { ...prev, status: 'judging' } : null)

    const result = await generateFinalResult(room)
    setRoom(prev => prev ? {
      ...prev,
      status: 'ended',
      judgeScores: result.judgeScores,
      finalScores: result.finalScores,
      winner: result.winner,
      mvpSeatId: result.mvpSeatId,
    } : null)

    setIsJudging(false)
    setShowSummary(true)
  }, [room])

  // 进入下一发言或环节
  const nextSpeech = useCallback(() => {
    const phase = NATIONAL_PHASES[currentPhaseIndex]
    if (!phase) return

    if (currentSpeechIndex + 1 < phase.order.length) {
      setCurrentSpeechIndex(prev => prev + 1)
      setPhaseRemaining(getDemoDuration(phase.duration))
    } else {
      if (currentPhaseIndex + 1 < NATIONAL_PHASES.length) {
        const nextIdx = currentPhaseIndex + 1
        setCurrentPhaseIndex(nextIdx)
        setCurrentSpeechIndex(0)
        setPhaseRemaining(getDemoDuration(NATIONAL_PHASES[nextIdx].duration))
      } else {
        finishDebate()
      }
    }
  }, [currentPhaseIndex, currentSpeechIndex, finishDebate])

  // 驱动 AI 发言
  const advanceSpeech = useCallback(async () => {
    if (!room) return
    const phase = NATIONAL_PHASES[currentPhaseIndex]
    if (!phase) return
    const seatId = phase.order[currentSpeechIndex]
    if (!seatId) return

    const seat = room.seats.find(s => s.seatId === seatId)
    if (!seat) return
    if (seat.status === 'human') return

    setIsAIThinking(true)
    try {
      const content = await generateAISpeech(room, seatId, phase.phase)
      const speech: NationalSpeech = {
        id: `speech-${Date.now()}`,
        seatId,
        side: seat.side,
        position: seat.position,
        nickname: seat.nickname || 'AI辩手',
        avatar: seat.avatar || '',
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
      nickname: seat.nickname || '你',
      avatar: seat.avatar || '',
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
    if (!room || showSummary || isAIThinking || isJudging) return
    const phase = NATIONAL_PHASES[currentPhaseIndex]
    if (!phase) return
    const seatId = phase.order[currentSpeechIndex]
    if (!seatId) return
    const seat = room.seats.find(s => s.seatId === seatId)
    if (seat && seat.status === 'ai') {
      const timer = setTimeout(() => advanceSpeech(), 500)
      return () => clearTimeout(timer)
    }
  }, [room, currentPhaseIndex, currentSpeechIndex, showSummary, isAIThinking, isJudging, advanceSpeech])

  const handleReset = () => {
    const topic = NATIONAL_TOPICS[Math.floor(Math.random() * NATIONAL_TOPICS.length)]
    const newRoom = createNationalRoom(topic.topic, topic.affirmLabel, topic.negateLabel)
    setRoom(newRoom)
    setCurrentPhaseIndex(0)
    setCurrentSpeechIndex(0)
    setPhaseRemaining(getDemoDuration(NATIONAL_PHASES[0].duration))
    setShowSummary(false)
    setIsJudging(false)
    setActiveTab('stage')
  }

  if (!room) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-6 h-6 border-2 border-seal/30 border-t-seal rounded-full animate-spin" />
      </div>
    )
  }

  const userSeat = room.seats.find(s => s.isOwner)
  const affirmTotal = room.finalScores.filter(s => s.side === 'affirm').reduce((sum, s) => sum + s.totalScore, 0)
  const negateTotal = room.finalScores.filter(s => s.side === 'negate').reduce((sum, s) => sum + s.totalScore, 0)
  const phaseConfig = NATIONAL_PHASES[currentPhaseIndex]

  return (
    <div className="flex flex-col h-full bg-paper-texture">
      {/* Header */}
      <div className={`px-4 py-2.5 flex items-center gap-3 bg-surface border-b border-line/30 ${isWeb ? 'max-w-5xl mx-auto w-full' : ''}`}>
        <button onClick={() => navigate('/entertainment/debate/national')} className="p-1.5 rounded-lg hover:bg-paper-dark active:scale-95 transition-all">
          <ArrowLeft size={18} className="text-ink-700" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[14px] font-bold text-ink-900 truncate">{room.topic}</h1>
          <p className="text-[10px] text-ink-400">华语辩论世锦赛 · 4v4 国赛机制</p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-ink-500 flex-shrink-0">
          <span className="flex items-center gap-1">
            <Users size={12} aria-hidden="true" />
            {room.spectators}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} aria-hidden="true" />
            {phaseConfig?.label || '已结束'}
          </span>
        </div>
      </div>

      {/* 标签页 */}
      {!showSummary && (
        <div className={`flex items-center gap-1 px-4 py-2 bg-surface border-b border-line/20 ${isWeb ? 'max-w-5xl mx-auto w-full' : ''}`}>
          {[
            { key: 'stage', label: '比赛现场' },
            { key: 'judges', label: '评委席' },
            { key: 'spectators', label: `观战席 ${room.spectators}` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-seal text-white'
                  : 'text-ink-500 hover:bg-paper-dark'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* 主体 */}
      <div className={`flex-1 flex flex-col ${isWeb ? 'max-w-5xl mx-auto w-full' : ''}`}>
        {showSummary ? (
          <div className="flex-1 px-4 py-5 overflow-y-auto">
            <DebateSummaryCard
              roomId={room.id}
              topic={room.topic}
              affirmLabel={room.affirmLabel}
              negateLabel={room.negateLabel}
              winner={room.winner === 'affirm' ? room.affirmLabel : room.winner === 'negate' ? room.negateLabel : '平局'}
              mvpName={room.finalScores.find(s => s.seatId === room.mvpSeatId)?.nickname || '—'}
              affirmScore={affirmTotal}
              negateScore={negateTotal}
              highlight={room.speeches[0]?.content?.slice(0, 80) || ''}
              source="national-4v4"
            />

            {/* 三位评委的详细评分 */}
            <div className="mt-4 space-y-3">
              <h3 className="text-[13px] font-bold text-ink-700 flex items-center gap-1.5">
                <Trophy size={14} className="text-gold" />
                评委评分详情
              </h3>
              {room.finalScores.map(score => (
                <div key={score.seatId} className="bg-surface rounded-xl p-3 border border-line/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] font-medium text-ink-700">
                      {score.side === 'affirm' ? room.affirmLabel : room.negateLabel} · {['一','二','三','四'][score.position-1]}辩 · {score.nickname}
                    </span>
                    <span className="text-[16px] font-bold text-seal">{score.totalScore}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {Object.entries(score.avgScores).map(([k, v]) => (
                      <div key={k} className="bg-paper-dark/50 rounded-lg p-1.5 text-center">
                        <p className="text-[10px] text-ink-400">
                          {k === 'logic' ? '逻辑' : k === 'evidence' ? '论据' : k === 'rebuttal' ? '反驳' : '表达'}
                        </p>
                        <p className="text-[13px] font-bold text-ink-700">{v}</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1">
                    {score.judgeComments.map((c, i) => (
                      <p key={i} className="text-[11px] text-ink-500 leading-relaxed">
                        <span className="text-seal font-medium">{c.judgeName}：</span>{c.comment}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleReset}
              className="w-full mt-5 py-3 rounded-xl bg-seal text-white text-[14px] font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} />
              再来一局
            </button>
          </div>
        ) : (
          <NationalDebateStage
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
            isJudging={isJudging}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        )}
      </div>
    </div>
  )
}
