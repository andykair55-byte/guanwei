// src/components/debate/EntertainmentStage.tsx
// 娱乐辩论：6麦位独立舞台，无阵营对抗

import { Mic, Star, Plus } from 'lucide-react'
import type { MicSeat } from '../../types/entertainmentDebate'

interface EntertainmentStageProps {
  seats: MicSeat[]
  currentSpeakerIndex: number | null
  speakTimer: number
  totalDuration: number
  isUserSpeaking: boolean
}

export default function EntertainmentStage({
  seats,
  currentSpeakerIndex,
  speakTimer,
  totalDuration,
  isUserSpeaking,
}: EntertainmentStageProps) {
  return (
    <div className="bg-surface rounded-2xl border border-line/30 p-4">
      <div className="grid grid-cols-3 gap-3">
        {seats.map((seat) => {
          const isCurrentSpeaker = currentSpeakerIndex === seat.index
          return (
            <SeatView
              key={seat.index}
              seat={seat}
              isCurrentSpeaker={isCurrentSpeaker}
              isUserSeat={isUserSpeaking && isCurrentSpeaker}
              speakTimer={speakTimer}
              totalDuration={totalDuration}
            />
          )
        })}
      </div>
    </div>
  )
}

function SeatView({
  seat,
  isCurrentSpeaker,
  isUserSeat,
  speakTimer,
  totalDuration,
}: {
  seat: MicSeat
  isCurrentSpeaker: boolean
  isUserSeat: boolean
  speakTimer: number
  totalDuration: number
}) {
  // 空位：虚线边框 + 占位文案
  if (seat.status === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center gap-1 min-h-[116px] rounded-xl border-2 border-dashed border-line bg-surface/50 text-ink-300">
        <Plus className="w-4 h-4" />
        <span className="text-[11px]">空位</span>
      </div>
    )
  }

  const isSpeaking = seat.status === 'speaking' || isCurrentSpeaker
  const progressPercent =
    totalDuration > 0
      ? Math.max(0, Math.min(100, (speakTimer / totalDuration) * 100))
      : 0

  return (
    <div
      className={`relative flex flex-col items-center gap-1.5 px-2 py-3 min-h-[116px] rounded-xl bg-surface overflow-hidden transition-all ${
        isSpeaking ? 'border-2 border-seal animate-pulse' : 'border border-ink-200'
      } ${isUserSeat ? 'ring-2 ring-gold/60 ring-offset-1' : ''}`}
    >
      {/* 头像：发言中叠加发光效果 + 麦克风指示 */}
      <div className="relative">
        <div
          className={`w-12 h-12 rounded-full overflow-hidden flex items-center justify-center bg-paper-dark ${
            isSpeaking ? 'shadow-seal-glow ring-2 ring-seal/40' : 'ring-1 ring-line'
          }`}
        >
          {seat.avatar ? (
            <img
              src={seat.avatar}
              alt={seat.nickname ?? ''}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-[14px] font-medium text-ink-500">
              {seat.nickname?.charAt(0) ?? '?'}
            </span>
          )}
        </div>
        {isSpeaking && (
          <span className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-seal text-white">
            <Mic className="w-2.5 h-2.5" />
          </span>
        )}
      </div>

      {/* 昵称 + AI 标签 */}
      <div className="flex items-center gap-1 max-w-full">
        <span className="text-[12px] text-ink-700 truncate max-w-[68px]">
          {seat.nickname ?? '匿名'}
        </span>
        {seat.isAI && (
          <span className="text-[9px] bg-ink-100 text-ink-500 px-1 py-0.5 rounded leading-none">
            AI
          </span>
        )}
      </div>

      {/* 认可度积分 */}
      <div className="flex items-center gap-0.5 text-[10px] text-gold">
        <Star className="w-2.5 h-2.5" fill="currentColor" />
        <span className="font-medium">{seat.score}</span>
      </div>

      {/* 发言计时进度条：从满到空，width = speakTimer / totalDuration */}
      {isSpeaking && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-line/30">
          <div
            className="h-full bg-seal transition-[width] duration-200 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </div>
  )
}
