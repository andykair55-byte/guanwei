// src/components/debate/DebateStage4v4.tsx
import { useRef, useEffect } from 'react'
import { Crown, Bot, User } from 'lucide-react'
import {
  NATIONAL_PHASES,
  type NationalDebateRoom, type NationalSpeech, type NationalPhase,
  getPositionLabel, getPhaseLabel,
} from '../../types/nationalDebate'
import PhaseTimer from './PhaseTimer'

interface Props {
  room: NationalDebateRoom
  currentPhaseIndex: number
  currentSpeechIndex: number
  phaseRemaining: number
  onPhaseTimeUp: () => void
  userSeatId: string | null
  userInput: string
  onUserInputChange: (v: string) => void
  onUserSubmit: () => void
  isAIThinking: boolean
}

export default function DebateStage4v4({
  room, currentPhaseIndex, currentSpeechIndex,
  phaseRemaining, onPhaseTimeUp,
  userSeatId, userInput, onUserInputChange, onUserSubmit,
  isAIThinking,
}: Props) {
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [room.speeches.length, isAIThinking])

  const currentPhaseConfig = NATIONAL_PHASES[currentPhaseIndex]
  const currentPhase: NationalPhase = currentPhaseConfig?.phase ?? 'opening'
  const currentPhaseOrder = currentPhaseConfig?.order ?? []
  const currentSeatId = currentPhaseOrder[currentSpeechIndex]
  const isUserTurn = currentSeatId === userSeatId

  return (
    <div className="flex flex-col h-full">
      {/* 环节指示器 */}
      <div className="flex items-center gap-1 px-4 py-2 bg-surface border-b border-line/30">
        {NATIONAL_PHASES.map((p, i) => (
          <div
            key={p.phase}
            className={`flex-1 text-center py-1.5 rounded-lg text-[10px] font-medium transition-all ${
              i === currentPhaseIndex
                ? 'bg-seal text-white'
                : i < currentPhaseIndex
                ? 'bg-seal/10 text-seal'
                : 'bg-paper-dark/30 text-ink-400'
            }`}
          >
            {p.label}
          </div>
        ))}
      </div>

      {/* 计时器 */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface border-b border-line/30">
        <span className="text-[11px] text-ink-500">
          {getPhaseLabel(currentPhase)} · 第 {currentSpeechIndex + 1}/{currentPhaseOrder.length} 发言
        </span>
        <PhaseTimer duration={phaseRemaining} onTimeUp={onPhaseTimeUp} />
      </div>

      {/* 双方辩手布局 */}
      <div className="flex gap-2 px-4 py-3 bg-surface border-b border-line/30">
        {/* 正方 */}
        <div className="flex-1 space-y-1.5">
          <div className="text-[10px] font-bold text-seal text-center mb-1">{room.affirmLabel}</div>
          {room.seats.filter(s => s.side === 'affirm').map(seat => (
            <div
              key={seat.seatId}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] transition-all ${
                seat.seatId === currentSeatId
                  ? 'bg-seal/10 ring-1 ring-seal/30'
                  : 'bg-paper-dark/20'
              }`}
            >
              {seat.status === 'ai' ? <Bot size={10} className="text-ink-400" /> : <User size={10} className="text-seal" />}
              <span className={seat.seatId === currentSeatId ? 'text-seal font-bold' : 'text-ink-500'}>
                {getPositionLabel(seat.position)}
              </span>
              {seat.isOwner && <Crown size={9} className="text-gold" />}
            </div>
          ))}
        </div>
        {/* 反方 */}
        <div className="flex-1 space-y-1.5">
          <div className="text-[10px] font-bold text-ink-600 text-center mb-1">{room.negateLabel}</div>
          {room.seats.filter(s => s.side === 'negate').map(seat => (
            <div
              key={seat.seatId}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] transition-all ${
                seat.seatId === currentSeatId
                  ? 'bg-ink-100 ring-1 ring-ink-300/50'
                  : 'bg-paper-dark/20'
              }`}
            >
              {seat.status === 'ai' ? <Bot size={10} className="text-ink-400" /> : <User size={10} className="text-ink-600" />}
              <span className={seat.seatId === currentSeatId ? 'text-ink-800 font-bold' : 'text-ink-500'}>
                {getPositionLabel(seat.position)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 发言区 */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {room.speeches.map((speech) => (
          <SpeechBubble key={speech.id} speech={speech} room={room} isUser={speech.seatId === userSeatId} />
        ))}
        {isAIThinking && (
          <div className="flex items-center gap-2 text-[11px] text-ink-400 animate-pulse">
            <Bot size={12} />
            <span>AI 辩手正在思考…</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* 用户输入区 */}
      {isUserTurn && (
        <div className="px-4 py-3 bg-surface border-t border-line/30">
          <div className="flex gap-2">
            <input
              value={userInput}
              onChange={e => onUserInputChange(e.target.value)}
              placeholder={`轮到你发言了（${getPositionLabel(room.seats.find(s => s.seatId === userSeatId)?.position || 1)}）…`}
              className="flex-1 px-3 py-2 rounded-xl bg-paper-dark/50 border border-line/20 text-[13px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-seal/20"
              onKeyDown={e => { if (e.key === 'Enter' && userInput.trim()) onUserSubmit() }}
            />
            <button
              onClick={onUserSubmit}
              disabled={!userInput.trim()}
              className="px-4 py-2 rounded-xl bg-seal text-white text-[12px] font-medium disabled:opacity-40 active:scale-95 transition-transform"
            >
              发言
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** 发言气泡 */
function SpeechBubble({ speech, room, isUser }: { speech: NationalSpeech; room: NationalDebateRoom; isUser: boolean }) {
  const isAffirm = speech.side === 'affirm'
  return (
    <div className={`flex ${isAffirm ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[75%] ${isAffirm ? 'items-start' : 'items-end'} flex flex-col gap-1`}>
        <div className="flex items-center gap-1.5 px-1">
          <span className={`text-[10px] font-medium ${isAffirm ? 'text-seal' : 'text-ink-600'}`}>
            {isAffirm ? room.affirmLabel : room.negateLabel} · {getPositionLabel(speech.position)}
          </span>
          {speech.isAI && <Bot size={9} className="text-ink-300" />}
          <span className="text-[9px] text-ink-300">{getPhaseLabel(speech.phase)}</span>
        </div>
        <div
          className={`px-3 py-2 rounded-2xl text-[12px] leading-relaxed ${
            isUser
              ? 'bg-seal text-white rounded-br-sm'
              : isAffirm
              ? 'bg-seal/8 text-ink-800 rounded-bl-sm'
              : 'bg-ink-100 text-ink-800 rounded-br-sm'
          }`}
        >
          {speech.content}
        </div>
      </div>
    </div>
  )
}
