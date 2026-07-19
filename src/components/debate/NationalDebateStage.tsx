// src/components/debate/NationalDebateStage.tsx
// 真实 4v4 国赛舞台：双方辩席 + 环节进度 + 发言区 + 评委席 + 观战席

import { useRef, useEffect } from 'react'
import { Crown, Bot, User, Gavel, Eye, Users, MessageCircle, Play } from 'lucide-react'
import {
  NATIONAL_PHASES, type NationalDebateRoom, type NationalSpeech,
  getPositionLabel, getPhaseLabel, DEFAULT_JUDGES,
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
  isJudging: boolean
  activeTab: 'stage' | 'judges' | 'spectators'
  onTabChange: (tab: 'stage' | 'judges' | 'spectators') => void
}

export default function NationalDebateStage({
  room, currentPhaseIndex, currentSpeechIndex,
  phaseRemaining, onPhaseTimeUp,
  userSeatId, userInput, onUserInputChange, onUserSubmit,
  isAIThinking, isJudging, activeTab,
}: Props) {
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [room.speeches.length, isAIThinking])

  const currentPhaseConfig = NATIONAL_PHASES[currentPhaseIndex]
  const currentPhaseOrder = currentPhaseConfig?.order ?? []
  const currentSeatId = currentPhaseOrder[currentSpeechIndex]
  const isUserTurn = currentSeatId === userSeatId

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 环节进度条 */}
      <div className="px-4 py-2.5 bg-surface border-b border-line/30">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[12px] font-bold text-ink-700">{currentPhaseConfig?.label}</span>
          <span className="text-[10px] text-ink-400">
            {currentPhaseConfig?.description}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {NATIONAL_PHASES.map((p, i) => (
            <div key={p.phase} className="flex-1 flex items-center gap-1">
              <div
                className={`flex-1 h-1.5 rounded-full transition-all ${
                  i === currentPhaseIndex
                    ? 'bg-seal'
                    : i < currentPhaseIndex
                    ? 'bg-seal/40'
                    : 'bg-line/30'
                }`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 计时器 + 当前发言提示 */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface border-b border-line/20">
        <span className="text-[11px] text-ink-500">
          {currentSeatId ? (
            <>
              当前发言：
              <span className="font-medium text-ink-900">
                {room.seats.find(s => s.seatId === currentSeatId)?.nickname}
              </span>
              <span className="text-ink-400 ml-1">
                ({room.seats.find(s => s.seatId === currentSeatId)?.side === 'affirm' ? room.affirmLabel : room.negateLabel} ·
                {getPositionLabel(room.seats.find(s => s.seatId === currentSeatId)?.position || 1)})
              </span>
            </>
          ) : (
            '准备进入下一环节'
          )}
        </span>
        <PhaseTimer duration={phaseRemaining} onTimeUp={onPhaseTimeUp} />
      </div>

      {/* Tab 内容区 */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'stage' && (
          <div className="flex flex-col h-full">
            {/* 双方辩席 */}
            <div className="flex gap-3 px-4 py-3 bg-surface border-b border-line/20">
              <SidePanel
                room={room}
                side="affirm"
                currentSeatId={currentSeatId}
                label={room.affirmLabel}
                color="seal"
              />
              <div className="w-[1px] bg-line/30 self-stretch" />
              <SidePanel
                room={room}
                side="negate"
                currentSeatId={currentSeatId}
                label={room.negateLabel}
                color="ink"
              />
            </div>

            {/* 发言区 */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-paper-texture">
              {room.speeches.length === 0 && !isAIThinking && (
                <div className="flex flex-col items-center justify-center h-full text-ink-400">
                  <MessageCircle size={28} className="mb-2 opacity-40" />
                  <p className="text-[13px]">比赛即将开始</p>
                  <p className="text-[11px]">{currentPhaseConfig?.rules}</p>
                </div>
              )}

              {room.speeches.map((speech) => (
                <SpeechBubble key={speech.id} speech={speech} room={room} isUser={speech.seatId === userSeatId} />
              ))}

              {isAIThinking && (
                <div className="flex items-center gap-2 text-[11px] text-ink-400 animate-pulse px-1">
                  <Bot size={12} />
                  <span>AI 辩手正在组织语言…</span>
                </div>
              )}

              {isJudging && (
                <div className="flex flex-col items-center justify-center py-8 text-ink-500">
                  <Gavel size={28} className="mb-2 text-gold" />
                  <p className="text-[14px] font-medium">评委正在评议</p>
                  <p className="text-[11px]">三位评委独立打分中，请稍候…</p>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          </div>
        )}

        {activeTab === 'judges' && (
          <div className="px-4 py-4 space-y-3">
            <p className="text-[12px] text-ink-500 mb-2">三位评委将在比赛结束后独立打分，评分维度：逻辑 30%、论据 25%、反驳 25%、表达 20%</p>
            {DEFAULT_JUDGES.map(judge => (
              <div key={judge.id} className="bg-surface rounded-xl p-3 border border-line/30 flex items-start gap-3">
                <img
                  src={judge.avatar}
                  alt={judge.name}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover bg-paper-dark flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[14px] font-bold text-ink-900">{judge.name}</span>
                    <Gavel size={12} className="text-gold" />
                  </div>
                  <p className="text-[11px] text-ink-500 mb-1">{judge.title}</p>
                  <p className="text-[12px] text-ink-600 leading-relaxed">{judge.bio}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'spectators' && (
          <div className="px-4 py-4">
            <div className="flex items-center gap-2 mb-3">
              <Eye size={14} className="text-ink-400" />
              <span className="text-[13px] font-medium text-ink-700">{room.spectators} 人在线观战</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: Math.min(room.spectators, 24) }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-full bg-paper-dark flex items-center justify-center text-[12px] text-ink-400">
                    观
                  </div>
                  <span className="text-[9px] text-ink-400 truncate w-full text-center">观众{i + 1}</span>
                </div>
              ))}
            </div>
            {room.waitingPlayers > 0 && (
              <div className="mt-4 p-3 bg-paper-dark/50 rounded-xl">
                <div className="flex items-center gap-2 text-[12px] text-ink-600">
                  <Users size={14} />
                  <span>{room.waitingPlayers} 位玩家正在排队，下局可优先入场</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 用户输入区 */}
      {isUserTurn && activeTab === 'stage' && (
        <div className="px-4 py-3 bg-surface border-t border-line/30">
          <div className="flex gap-2">
            <input
              value={userInput}
              onChange={e => onUserInputChange(e.target.value)}
              placeholder={`轮到你发言了（${getPositionLabel(room.seats.find(s => s.seatId === userSeatId)?.position || 1)}）…`}
              className="flex-1 px-3 py-2.5 rounded-xl bg-paper-dark/50 border border-line/20 text-[13px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-seal/20"
              onKeyDown={e => { if (e.key === 'Enter' && userInput.trim()) onUserSubmit() }}
            />
            <button
              onClick={onUserSubmit}
              disabled={!userInput.trim()}
              className="px-4 py-2 rounded-xl bg-seal text-white text-[12px] font-medium disabled:opacity-40 active:scale-95 transition-transform flex items-center gap-1"
            >
              <Play size={12} fill="white" />
              发言
            </button>
          </div>
          <p className="text-[10px] text-ink-400 mt-1.5">
            字数限制：{currentPhaseConfig?.charLimit} 字 · 请紧扣{currentPhaseConfig?.label}规则
          </p>
        </div>
      )}
    </div>
  )
}

/** 单方辩席面板 */
function SidePanel({
  room,
  side,
  currentSeatId,
  label,
  color,
}: {
  room: NationalDebateRoom
  side: 'affirm' | 'negate'
  currentSeatId: string | undefined
  label: string
  color: 'seal' | 'ink'
}) {
  const isSeal = color === 'seal'
  return (
    <div className="flex-1 min-w-0">
      <div className={`text-[11px] font-bold text-center mb-2 ${isSeal ? 'text-seal' : 'text-ink-700'}`}>
        {label}方
      </div>
      <div className="space-y-1.5">
        {room.seats
          .filter(s => s.side === side)
          .sort((a, b) => a.position - b.position)
          .map(seat => {
            const isCurrent = seat.seatId === currentSeatId
            const hasSpoken = room.speeches.some(s => s.seatId === seat.seatId)
            return (
              <div
                key={seat.seatId}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] transition-all ${
                  isCurrent
                    ? isSeal
                      ? 'bg-seal/10 ring-1 ring-seal/40'
                      : 'bg-ink-100 ring-1 ring-ink-300/50'
                    : 'bg-paper-dark/40'
                } ${hasSpoken ? '' : 'opacity-90'}`}
              >
                {seat.status === 'ai' ? (
                  <Bot size={12} className="text-ink-400 flex-shrink-0" />
                ) : (
                  <User size={12} className={`${isSeal ? 'text-seal' : 'text-ink-600'} flex-shrink-0`} />
                )}
                <span className={`truncate ${isCurrent ? (isSeal ? 'text-seal font-bold' : 'text-ink-800 font-bold') : 'text-ink-600'}`}>
                  {getPositionLabel(seat.position)}
                </span>
                {seat.isOwner && <Crown size={9} className="text-gold flex-shrink-0" />}
              </div>
            )
          })}
      </div>
    </div>
  )
}

/** 发言气泡 */
function SpeechBubble({ speech, room, isUser }: { speech: NationalSpeech; room: NationalDebateRoom; isUser: boolean }) {
  const isAffirm = speech.side === 'affirm'
  return (
    <div className={`flex ${isAffirm ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[80%] ${isAffirm ? 'items-start' : 'items-end'} flex flex-col gap-1`}>
        <div className="flex items-center gap-1.5 px-1">
          <span className={`text-[10px] font-medium ${isAffirm ? 'text-seal' : 'text-ink-600'}`}>
            {isAffirm ? room.affirmLabel : room.negateLabel} · {getPositionLabel(speech.position)} · {speech.nickname}
          </span>
          {speech.isAI && <Bot size={9} className="text-ink-300" />}
        </div>
        <div
          className={`px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
            isUser
              ? 'bg-seal text-white rounded-br-sm'
              : isAffirm
              ? 'bg-seal/8 text-ink-800 rounded-bl-sm'
              : 'bg-ink-100 text-ink-800 rounded-br-sm'
          }`}
        >
          {speech.content}
        </div>
        <span className="text-[9px] text-ink-300">{getPhaseLabel(speech.phase)}</span>
      </div>
    </div>
  )
}
