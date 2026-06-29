import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Users, Crown, Plus, Minus, Play,
  Shield, Check, X, RotateCcw, Zap, User,
} from 'lucide-react'
import CharacterIcon from '../components/CharacterIcon'
import {
  createMockRoom, moderateTopic, getSeatDisplayName,
  canStartDebate, ALL_CHARACTERS,
  type DebateRoom,
} from '../services/roundTableService'
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

export default function RoundTable() {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const [room, setRoom] = useState<DebateRoom>(() => createMockRoom())
  const [topicInput, setTopicInput] = useState(room.topic)
  const [topicError, setTopicError] = useState<string | null>(null)
  const [editingSeat, setEditingSeat] = useState<number | null>(null)
  const [debateStarted, setDebateStarted] = useState(false)
  const [currentTurn, setCurrentTurn] = useState(0)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Mock debate turns for the configured room
  const activeDebaters = room.debateSeats.filter(s => s.type !== 'empty')

  const mockDebateTurns = [
    { seat: 0, content: '中科院 2024 年报告显示，日均刷短视频超 2 小时的青少年，持续注意力时长短了 40%。这是数据，不是观点。', action: 'speak' as const },
    { seat: 1, content: '因果关系搞反了吧？注意力下降的原因多了去了——学业压力、睡眠不足。你把锅全甩给短视频？', action: 'speak' as const },
    { seat: 2, content: '', action: 'your-turn' as const },
    { seat: 3, content: '我讲个事。上个月有个大学生跟我说，他以前每天看一本书，现在 3000 字的文章都看不完。他说那句话的时候眼睛是红的。', action: 'speak' as const },
    { seat: 4, content: '每一代人都觉得下一代被新技术毁了。苏格拉底觉得书写毁记忆力，家长觉得电视毁孩子。结果呢？', action: 'speak' as const },
  ]

  const handleTopicChange = (value: string) => {
    setTopicInput(value)
    setTopicError(null)
  }

  const handleTopicSubmit = () => {
    const result = moderateTopic(topicInput)
    if (result.approved) {
      setRoom(prev => ({ ...prev, topic: topicInput, topicStatus: 'approved' }))
      setTopicError(null)
    } else {
      setRoom(prev => ({ ...prev, topicStatus: 'rejected', topicRejectReason: result.reason }))
      setTopicError(result.reason || '辩题不通过')
    }
  }

  const handleSeatConfig = (seatIndex: number, type: 'ai' | 'human' | 'empty', characterId?: string) => {
    setRoom(prev => {
      const newSeats = [...prev.debateSeats]
      newSeats[seatIndex] = {
        index: seatIndex,
        type,
        characterId: type === 'ai' ? characterId : undefined,
        playerName: type === 'human' ? '你' : undefined,
        isOwner: newSeats[seatIndex].isOwner,
      }
      return { ...prev, debateSeats: newSeats }
    })
    setEditingSeat(null)
  }

  const handleStartDebate = () => {
    if (!canStartDebate(room)) return
    setRoom(prev => ({ ...prev, status: 'debating' }))
    setDebateStarted(true)
  }

  const handleReset = () => {
    setDebateStarted(false)
    setCurrentTurn(0)
    setRoom(prev => ({ ...prev, status: 'waiting' }))
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentTurn])

  // ===== Render =====
  return (
    <div className="flex flex-col min-h-full bg-paper-texture">
      {/* Header */}
      <div className={`px-5 pt-4 pb-2 flex items-center gap-3 ${isDesktop ? 'max-w-4xl mx-auto w-full' : ''}`}>
        <button onClick={() => navigate(-1)} className="p-1.5 -ml-1.5 rounded-lg hover:bg-paper-dark transition-colors active:scale-95">
          <ArrowLeft size={20} className="text-ink-700" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className={`${isDesktop ? 'text-lg' : 'text-[15px]'} font-bold text-ink-900`}>圆桌局</h1>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-seal/10 text-seal font-bold">DEMO</span>
          </div>
          <p className="text-[11px] text-ink-400">5 辩席 · 10 观战席 · 人 AI 混搭</p>
        </div>
      </div>

      <div className={`flex-1 px-5 pb-4 overflow-y-auto flex flex-col gap-3 ${isDesktop ? 'max-w-4xl mx-auto w-full' : ''}`}>
        {/* ===== Topic Card ===== */}
        <div className="bg-surface rounded-xl shadow-card p-4">
          <p className="text-[11px] text-ink-400 font-medium mb-2">辩题</p>
          {!debateStarted ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  value={topicInput}
                  onChange={e => handleTopicChange(e.target.value)}
                  placeholder="输入自定义辩题……"
                  className="flex-1 px-3 py-2.5 rounded-xl bg-paper-dark/50 border border-line/20 text-[13px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-seal/20"
                />
                <button
                  onClick={handleTopicSubmit}
                  className="px-3 py-2.5 rounded-xl bg-seal/10 text-seal text-[12px] font-medium active:scale-[0.97] transition-transform"
                >
                  <Shield size={14} />
                </button>
              </div>
              {topicError ? (
                <div className="flex items-center gap-1.5 text-[11px] text-seal">
                  <X size={12} />
                  <span>{topicError}</span>
                </div>
              ) : room.topicStatus === 'approved' && topicInput === room.topic ? (
                <div className="flex items-center gap-1.5 text-[11px] text-bamboo">
                  <Check size={12} />
                  <span>AI 审核通过 · 未触碰话题红线</span>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-[14px] font-bold text-ink-900">{room.topic}</p>
          )}
        </div>

        {/* ===== Debate Seats ===== */}
        <div className="bg-surface rounded-xl shadow-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-ink-500" />
              <span className="text-[12px] text-ink-700 font-semibold">辩席</span>
            </div>
            <span className="text-[10px] text-ink-400">
              {activeDebaters.length} / {room.maxDebaters} · 至少 2 人开局
            </span>
          </div>

          <div className="flex gap-2 justify-between">
            {room.debateSeats.map((seat, i) => {
              const char = seat.type === 'ai' && seat.characterId ? getCharacter(seat.characterId) : null
              const isActive = debateStarted && currentTurn < mockDebateTurns.length && mockDebateTurns[currentTurn].seat === i
              const hasSpoken = debateStarted && mockDebateTurns.slice(0, currentTurn).some(t => t.seat === i)

              return (
                <div key={i} className="flex flex-col items-center gap-1 flex-1">
                  {/* Seat button */}
                  <button
                    onClick={() => !debateStarted && setEditingSeat(editingSeat === i ? null : i)}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      seat.type === 'empty'
                        ? 'bg-paper-dark border-2 border-dashed border-line/30'
                        : seat.type === 'ai' && char
                          ? `bg-gradient-to-br ${char.visual.gradientFrom} ${char.visual.gradientTo} shadow-md ${isActive ? 'scale-110 ring-2 ring-seal ring-offset-2' : ''}`
                          : 'bg-gradient-to-br from-seal to-seal-light shadow-md'
                    } ${hasSpoken ? 'opacity-70' : ''}`}
                  >
                    {seat.type === 'empty' ? (
                      <Plus size={16} className="text-ink-300" />
                    ) : seat.type === 'ai' && char ? (
                      <CharacterIcon characterId={char.id} size={16} className="text-white" />
                    ) : (
                      <User size={14} className="text-white" />
                    )}
                  </button>

                  {/* Name */}
                  <p className={`text-[10px] font-medium ${
                    seat.type === 'ai' && char ? char.visual.textColor :
                    seat.type === 'human' ? 'text-seal' : 'text-ink-300'
                  }`}>
                    {getSeatDisplayName(seat)}
                  </p>

                  {/* Owner badge */}
                  {seat.isOwner && (
                    <Crown size={10} className="text-gold" />
                  )}

                  {/* Type badge */}
                  <span className={`text-[8px] px-1 py-0.5 rounded ${
                    seat.type === 'ai' ? 'bg-violet-50 text-violet-500' :
                    seat.type === 'human' ? 'bg-seal/10 text-seal' : 'bg-paper-dark text-ink-300'
                  }`}>
                    {seat.type === 'ai' ? 'AI' : seat.type === 'human' ? '人类' : '空'}
                  </span>

                  {/* Seat editor dropdown */}
                  {editingSeat === i && !debateStarted && (
                    <div className="absolute z-30 mt-1 bg-surface rounded-xl shadow-card border border-line/20 p-2 space-y-1 min-w-[120px]" style={{ position: 'absolute' }}>
                      <p className="text-[10px] text-ink-400 font-medium px-1 mb-1">分配座位 #{i + 1}</p>
                      <button
                        onClick={() => handleSeatConfig(i, 'human')}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-[11px] text-ink-700 hover:bg-paper-dark transition-colors flex items-center gap-2"
                      >
                        <User size={12} /> 人类玩家
                      </button>
                      {ALL_CHARACTERS.map(char => (
                        <button
                          key={char.id}
                          onClick={() => handleSeatConfig(i, 'ai', char.id)}
                          className="w-full text-left px-2 py-1.5 rounded-lg text-[11px] text-ink-700 hover:bg-paper-dark transition-colors flex items-center gap-2"
                        >
                          <CharacterIcon characterId={char.id} size={12} /> {char.name}
                        </button>
                      ))}
                      <button
                        onClick={() => handleSeatConfig(i, 'empty')}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-[11px] text-ink-400 hover:bg-paper-dark transition-colors flex items-center gap-2"
                      >
                        <Minus size={12} /> 清空
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ===== Spectator Seats ===== */}
        <div className="bg-surface rounded-xl shadow-card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <EyeIcon size={14} className="text-ink-500" />
              <span className="text-[12px] text-ink-700 font-semibold">观战席</span>
            </div>
            <span className="text-[10px] text-ink-400">
              {room.spectatorSeats.length} / {room.maxSpectators}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {room.spectatorSeats.map((spec, i) => (
              <div
                key={i}
                className={`px-2 py-1 rounded-lg text-[10px] ${
                  spec.isUser ? 'bg-seal/10 text-seal font-medium' : 'bg-paper-dark text-ink-500'
                }`}
              >
                {spec.name}{spec.isUser && ' (你)'}
              </div>
            ))}
            {Array.from({ length: room.maxSpectators - room.spectatorSeats.length }).map((_, i) => (
              <div key={`empty-${i}`} className="px-2 py-1 rounded-lg text-[10px] bg-paper-dark/30 text-ink-200 border border-dashed border-line/10">
                空位
              </div>
            ))}
          </div>
        </div>

        {/* ===== Debate Area ===== */}
        {debateStarted && (
          <div className="bg-surface rounded-xl shadow-card p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={14} className="text-seal" />
              <span className="text-[12px] text-ink-700 font-semibold">辩论进行中</span>
              <span className="text-[10px] text-ink-400">· 第 {Math.min(currentTurn + 1, mockDebateTurns.length)} / {mockDebateTurns.length} 发言</span>
            </div>

            <div className="space-y-2.5">
              {mockDebateTurns.slice(0, currentTurn).map((turn, i) => {
                const seat = room.debateSeats[turn.seat]
                const char = seat.type === 'ai' && seat.characterId ? getCharacter(seat.characterId) : null

                if (turn.action === 'your-turn') {
                  return (
                    <div key={i} className="flex gap-2.5 animate-fade-in-up">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-seal to-seal-light flex items-center justify-center flex-shrink-0">
                        <User size={14} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-md bg-seal/5 border border-seal/20 text-[13px] text-ink-400 italic">
                          等待你发言……（Demo 模式跳过）
                        </div>
                        <p className="text-[10px] text-seal mt-0.5 font-medium">你</p>
                      </div>
                    </div>
                  )
                }

                return (
                  <div key={i} className="flex gap-2.5 animate-fade-in-up">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      char ? `bg-gradient-to-br ${char.visual.gradientFrom} ${char.visual.gradientTo}` : 'bg-paper-dark'
                    }`}>
                      {char ? <CharacterIcon characterId={char.id} size={16} className="text-white" /> : <User size={14} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`px-3.5 py-2.5 rounded-2xl rounded-tl-md text-[13px] leading-relaxed ${
                        char ? `${char.visual.bubbleBg} border ${char.visual.bubbleBorder}` : 'bg-paper-dark border border-line/20'
                      } text-ink-900`}>
                        {turn.content}
                      </div>
                      <p className={`text-[10px] mt-0.5 font-medium ${char ? char.visual.textColor : 'text-ink-400'}`}>
                        {getSeatDisplayName(seat)}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Controls */}
            {currentTurn < mockDebateTurns.length && (
              <button
                onClick={() => setCurrentTurn(prev => prev + 1)}
                className="w-full py-3 rounded-xl bg-surface shadow-card text-[13px] text-ink-700 font-medium active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Play size={14} />
                {mockDebateTurns[currentTurn].action === 'your-turn' ? '跳过你的回合' : '下一位发言'}
              </button>
            )}

            {currentTurn >= mockDebateTurns.length && (
              <div className="space-y-2">
                <p className="text-[12px] text-ink-500 text-center">本轮发言结束</p>
                <button
                  onClick={handleReset}
                  className="w-full py-3 rounded-xl bg-seal/10 text-seal text-[13px] font-medium active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                >
                  <RotateCcw size={14} />
                  重新开始
                </button>
              </div>
            )}
          </div>
        )}

        {/* ===== Start Button ===== */}
        {!debateStarted && (
          <button
            onClick={handleStartDebate}
            disabled={!canStartDebate(room)}
            className="w-full py-3.5 rounded-xl bg-seal text-white font-semibold text-[14px] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-seal-glow disabled:opacity-40 disabled:active:scale-100"
          >
            <Play size={16} />
            {canStartDebate(room) ? '开始辩论' : `至少需要 2 位辩手（当前 ${activeDebaters.length} 位）`}
          </button>
        )}

        <p className="text-[9px] text-ink-300 text-center pb-2">
          圆桌局为产品概念 Demo · 实际需后端支持房间/匹配系统
        </p>
      </div>
    </div>
  )
}

// Simple eye icon component
function EyeIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
