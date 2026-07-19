// src/pages/EntertainmentRoomPage.tsx
// 娱乐辩论房间页：6人独立麦位 Demo

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Send, Heart, Mic, Star, Users, Flame, MessageCircle, RotateCcw } from 'lucide-react'
import EntertainmentStage from '../components/debate/EntertainmentStage'
import {
  createEntRoom, generateAISpeech, reviewOpinion, scoreSpeech,
  generateAIQueueEntry, createSpeech,
} from '../services/entertainmentDebateService'
import {
  DEMO_SPEAK_DURATION,
  type EntRoom, type EntSpeech, type QueueEntry,
} from '../types/entertainmentDebate'
import { usePlatform } from '../hooks/usePlatform'

type Phase = 'idle' | 'reviewing' | 'queued' | 'speaking' | 'scored'

export default function EntertainmentRoomPage() {
  const navigate = useNavigate()
  const { roomId } = useParams<{ roomId: string }>()
  const { isWeb } = usePlatform()

  const [room, setRoom] = useState<EntRoom | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [opinionInput, setOpinionInput] = useState('')
  const [speechInput, setSpeechInput] = useState('')
  const [isAIThinking, setIsAIThinking] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [latestSpeech, setLatestSpeech] = useState<EntSpeech | null>(null)
  const [likedSpeeches, setLikedSpeeches] = useState<Set<string>>(new Set())

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const speechEndRef = useRef<HTMLDivElement>(null)

  // 初始化房间
  useEffect(() => {
    setRoom(createEntRoom())
  }, [roomId])

  // 计时器：每秒递减
  useEffect(() => {
    if (!room || room.currentSpeakerIndex === null) return
    if (timerRef.current) clearInterval(timerRef.current)

    timerRef.current = setInterval(() => {
      setRoom(prev => {
        if (!prev || prev.currentSpeakerIndex === null) return prev
        const newTimer = prev.speakTimer - 1
        if (newTimer <= 0) {
          // 时间到，切换到下一个发言者
          return { ...prev, speakTimer: 0 }
        }
        return { ...prev, speakTimer: newTimer }
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [room?.currentSpeakerIndex]) // eslint-disable-line react-hooks/exhaustive-deps -- 故意只用原始值依赖，避免每次 setRoom 都重启 interval

  // 时间到 → 处理发言结束
  useEffect(() => {
    if (!room || room.speakTimer > 0) return
    handleSpeakTimeUp()
  }, [room?.speakTimer]) // eslint-disable-line react-hooks/exhaustive-deps -- 故意只用原始值依赖，handleSpeakTimeUp 通过闭包引用

  // 自动滚动到最新发言
  useEffect(() => {
    speechEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [room?.speeches.length])

  // 获取当前发言者
  const currentSpeaker = room && room.currentSpeakerIndex !== null
    ? room.seats[room.currentSpeakerIndex]
    : null

  // 检查是否轮到用户
  const isUserTurn = currentSpeaker?.userId === 'me'

  // AI 自动发言
  useEffect(() => {
    if (!room || room.currentSpeakerIndex === null) return
    if (room.speakTimer !== DEMO_SPEAK_DURATION) return // 只在计时器重置时触发

    const speaker = room.seats[room.currentSpeakerIndex]
    if (!speaker || !speaker.isAI) return

    setIsAIThinking(true)
    let aiContent = ''
    generateAISpeech().then(content => {
      aiContent = content
      setIsAIThinking(false)
      // AI 评分
      return scoreSpeech(content)
    }).then(score => {
      const speech = createSpeech(
        speaker.index, speaker.nickname!, speaker.avatar!, aiContent, score, true,
      )
      setRoom(prev => {
        if (!prev) return prev
        const newSeats = [...prev.seats]
        newSeats[speaker.index] = {
          ...speaker,
          score: speaker.score + score.total,
          speakCount: speaker.speakCount + 1,
          totalLikes: speaker.totalLikes + Math.floor(Math.random() * 5),
        }
        const highlights = speech.isHighlight ? [...prev.highlights, speech] : prev.highlights
        return {
          ...prev,
          seats: newSeats,
          speeches: [...prev.speeches, speech],
          highlights,
        }
      })
      setLatestSpeech(speech)
    })
  }, [room?.currentSpeakerIndex, room?.speakTimer]) // eslint-disable-line react-hooks/exhaustive-deps -- 故意只用原始值依赖，避免 room 变化时重复触发 AI 发言

  // 切换到下一个发言者
  const advanceToNextSpeaker = useCallback(() => {
    setRoom(prev => {
      if (!prev) return prev

      // 找下一个有人的麦位
      const occupiedSeats = prev.seats
        .filter(s => s.status !== 'empty')
        .map(s => s.index)
      if (occupiedSeats.length === 0) return prev

      // 检查队列：如果队列有人，优先让队列第一个上麦
      let newSeats = [...prev.seats]
      let nextSpeakerIndex: number

      // 当前发言者回 idle
      if (prev.currentSpeakerIndex !== null) {
        newSeats[prev.currentSpeakerIndex] = {
          ...newSeats[prev.currentSpeakerIndex],
          status: 'idle',
        }
      }

      // 简单轮转：找下一个 occupied seat
      const currentIdx = prev.currentSpeakerIndex ?? -1
      const nextIdx = occupiedSeats.find(i => i > currentIdx)
      nextSpeakerIndex = nextIdx ?? occupiedSeats[0]

      newSeats[nextSpeakerIndex] = {
        ...newSeats[nextSpeakerIndex],
        status: 'speaking',
      }

      return {
        ...prev,
        seats: newSeats,
        currentSpeakerIndex: nextSpeakerIndex,
        speakTimer: DEMO_SPEAK_DURATION,
      }
    })
  }, [])

  // 用户提交发言
  const submitUserSpeech = useCallback(async () => {
    if (!room || room.currentSpeakerIndex === null) return
    if (!speechInput.trim()) return

    const content = speechInput.trim()
    setSpeechInput('')
    const score = await scoreSpeech(content)
    const speaker = room.seats[room.currentSpeakerIndex]

    const speech = createSpeech(
      speaker.index, '你', '', content, score, false,
    )

    setRoom(prev => {
      if (!prev) return prev
      const newSeats = [...prev.seats]
      newSeats[speaker.index] = {
        ...speaker,
        score: speaker.score + score.total,
        speakCount: speaker.speakCount + 1,
      }
      const highlights = speech.isHighlight ? [...prev.highlights, speech] : prev.highlights
      return {
        ...prev,
        seats: newSeats,
        speeches: [...prev.speeches, speech],
        highlights,
      }
    })
    setLatestSpeech(speech)
    setPhase('scored')

    // 2秒后自动切换
    setTimeout(() => {
      setPhase('idle')
      advanceToNextSpeaker()
    }, 2000)
  }, [room, speechInput, advanceToNextSpeaker])

  // 发言时间到
  const handleSpeakTimeUp = useCallback(() => {
    if (!room || room.currentSpeakerIndex === null) return
    if (timerRef.current) clearInterval(timerRef.current)

    const speaker = room.seats[room.currentSpeakerIndex]

    // 如果是AI发言，评分后切换
    if (speaker?.isAI) {
      // AI发言已经在上面处理了，这里检查是否有队列
      advanceToNextSpeaker()
    } else if (speaker?.userId === 'me') {
      // 用户发言时间到，如果没提交则自动提交
      if (speechInput.trim()) {
        submitUserSpeech()
      } else {
        // 没发言，直接换人
        advanceToNextSpeaker()
      }
    }
  }, [room, speechInput, submitUserSpeech, advanceToNextSpeaker])

  // 用户提交观点排队
  const handleSubmitOpinion = useCallback(async () => {
    if (!opinionInput.trim()) return
    setReviewError('')
    setPhase('reviewing')

    const result = await reviewOpinion(opinionInput)
    if (!result.passed) {
      setReviewError(result.reason || '审核未通过')
      setPhase('idle')
      return
    }

    // 加入队列
    const entry: QueueEntry = {
      id: `me-${Date.now()}`,
      userId: 'me',
      nickname: '你',
      avatar: '',
      opinion: opinionInput.trim(),
      queuedAt: new Date().toISOString(),
      isAI: false,
    }
    setRoom(prev => prev ? { ...prev, queue: [...prev.queue, entry] } : prev)
    setOpinionInput('')
    setPhase('queued')

    // 模拟AI也加入队列
    setTimeout(() => {
      setRoom(prev => prev ? { ...prev, queue: [...prev.queue, generateAIQueueEntry()] } : prev)
    }, 1500)
  }, [opinionInput])

  // 送花
  const handleLike = useCallback((speechId: string) => {
    if (likedSpeeches.has(speechId)) return
    setLikedSpeeches(prev => new Set(prev).add(speechId))
    setRoom(prev => {
      if (!prev) return prev
      return {
        ...prev,
        speeches: prev.speeches.map(s =>
          s.id === speechId ? { ...s, likes: s.likes + 1 } : s,
        ),
      }
    })
  }, [likedSpeeches])

  // 重新开始
  const handleReset = useCallback(() => {
    setRoom(createEntRoom())
    setPhase('idle')
    setOpinionInput('')
    setSpeechInput('')
    setLatestSpeech(null)
    setLikedSpeeches(new Set())
    setReviewError('')
  }, [])

  if (!room) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-6 h-6 border-2 border-seal/30 border-t-seal rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full bg-paper-texture">
      {/* Header */}
      <div className="sticky top-0 z-20 glass border-b border-line/50">
        <div className={`flex items-center h-14 px-4 ${isWeb ? '' : 'max-w-[480px] mx-auto'}`}>
          <button
            onClick={() => navigate('/entertainment/debate')}
            className="flex items-center gap-1 text-ink-700 text-sm active:opacity-60"
          >
            <ArrowLeft size={18} />
            <span>返回</span>
          </button>
          <div className="flex-1 ml-3 min-w-0">
            <p className="text-[14px] font-bold text-ink-900 truncate">{room.topic}</p>
            <p className="text-[10px] text-ink-400">6人独立麦位 · 人人发言 · AI审核排队</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[11px] text-ink-400">
              <Users size={14} />
              {room.spectators}
            </span>
            <button
              onClick={handleReset}
              className="p-1.5 rounded-lg hover:bg-paper-dark text-ink-400 transition-colors"
              title="重新开始"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className={`flex-1 w-full ${isWeb ? 'max-w-4xl mx-auto px-4' : 'max-w-[480px] mx-auto px-3'} py-4`}>
        {/* 舞台 */}
        <div className="mb-4">
          <EntertainmentStage
            seats={room.seats}
            currentSpeakerIndex={room.currentSpeakerIndex}
            speakTimer={room.speakTimer}
            totalDuration={DEMO_SPEAK_DURATION}
            isUserSpeaking={isUserTurn}
          />
        </div>

        {/* 当前发言状态 */}
        {currentSpeaker && (
          <div className="mb-4 p-3 bg-surface rounded-xl border border-line/30">
            <div className="flex items-center gap-2 mb-2">
              <Mic size={14} className={isAIThinking ? 'text-seal animate-pulse' : 'text-ink-400'} />
              <span className="text-[12px] font-medium text-ink-700">
                {isAIThinking ? `${currentSpeaker.nickname} 思考中...` : `${currentSpeaker.nickname} 发言中`}
              </span>
              <span className="ml-auto text-[12px] font-bold text-seal tabular-nums">
                {room.speakTimer}s
              </span>
            </div>
            {/* 计时进度条 */}
            <div className="h-1.5 bg-paper-dark rounded-full overflow-hidden">
              <div
                className="h-full bg-seal rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${(room.speakTimer / DEMO_SPEAK_DURATION) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* 两栏布局：发言流 + 排队区 */}
        <div className={`grid gap-4 ${isWeb ? 'grid-cols-3' : 'grid-cols-1'}`}>
          {/* 发言流（占2列） */}
          <div className={isWeb ? 'col-span-2' : ''}>
            <h3 className="text-[13px] font-bold text-ink-700 mb-2 flex items-center gap-1.5">
              <MessageCircle size={14} className="text-seal" />
              发言流
              <span className="text-[10px] text-ink-400 font-normal">({room.speeches.length})</span>
            </h3>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {room.speeches.length === 0 ? (
                <div className="text-center py-8 text-[12px] text-ink-faint">
                  还没有人发言，等待第一位辩手...
                </div>
              ) : (
                room.speeches.map(speech => (
                  <div
                    key={speech.id}
                    className={`p-3 rounded-xl border transition-all ${
                      speech.isHighlight
                        ? 'bg-gold/5 border-gold/30'
                        : 'bg-surface border-line/30'
                    }`}
                  >
                    {/* 发言头部 */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-full bg-seal/10 flex items-center justify-center text-[11px] font-bold text-seal">
                        {speech.nickname[0]}
                      </div>
                      <span className="text-[12px] font-medium text-ink-700">{speech.nickname}</span>
                      {speech.isAI && (
                        <span className="text-[9px] bg-ink-100 text-ink-500 px-1 rounded">AI</span>
                      )}
                      {speech.isHighlight && (
                        <span className="text-[9px] bg-gold/15 text-gold px-1 rounded flex items-center gap-0.5">
                          <Star size={8} fill="currentColor" />
                          高光
                        </span>
                      )}
                      <span className="ml-auto text-[10px] text-ink-faint">
                        {new Date(speech.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* 发言内容 */}
                    <p className="text-[13px] text-ink-800 leading-relaxed mb-2">
                      {speech.content}
                    </p>

                    {/* AI 评分 + 点赞 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="text-ink-400">认真度</span>
                        <span className="font-bold text-seal">{speech.score.seriousness}</span>
                        <span className="text-ink-400">信息量</span>
                        <span className="font-bold text-seal">{speech.score.information}</span>
                        <span className="text-ink-faint ml-1">{speech.score.comment}</span>
                      </div>
                      <button
                        onClick={() => handleLike(speech.id)}
                        disabled={likedSpeeches.has(speech.id)}
                        className={`flex items-center gap-1 text-[11px] transition-colors ${
                          likedSpeeches.has(speech.id)
                            ? 'text-seal'
                            : 'text-ink-400 hover:text-seal'
                        }`}
                      >
                        <Heart size={12} fill={likedSpeeches.has(speech.id) ? 'currentColor' : 'none'} />
                        {speech.likes}
                      </button>
                    </div>
                  </div>
                ))
              )}
              <div ref={speechEndRef} />
            </div>
          </div>

          {/* 右栏：排队区 + 高光榜 */}
          <div className="space-y-4">
            {/* 排队区 */}
            <div>
              <h3 className="text-[13px] font-bold text-ink-700 mb-2 flex items-center gap-1.5">
                <Users size={14} className="text-bamboo" />
                排队区
                <span className="text-[10px] text-ink-400 font-normal">({room.queue.length})</span>
              </h3>

              {phase === 'idle' && (
                <div className="mb-2">
                  <textarea
                    value={opinionInput}
                    onChange={e => setOpinionInput(e.target.value)}
                    placeholder="输入你的观点，AI审核通过后进入排队..."
                    maxLength={100}
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl border border-line/30 bg-surface text-[12px] text-ink-800 placeholder:text-ink-faint resize-none focus:outline-none focus:border-seal/40"
                  />
                  {reviewError && (
                    <p className="text-[10px] text-red-500 mt-1">{reviewError}</p>
                  )}
                  <button
                    onClick={handleSubmitOpinion}
                    disabled={!opinionInput.trim()}
                    className="w-full mt-2 py-2 rounded-xl bg-bamboo text-white text-[12px] font-medium active:scale-[0.98] transition-transform disabled:opacity-40"
                  >
                    提交观点排队
                  </button>
                </div>
              )}

              {phase === 'reviewing' && (
                <div className="flex items-center justify-center gap-2 py-3 text-[12px] text-ink-400">
                  <div className="w-4 h-4 border-2 border-bamboo/30 border-t-bamboo rounded-full animate-spin" />
                  AI审核中...
                </div>
              )}

              {phase === 'queued' && (
                <div className="p-2 bg-bamboo/8 rounded-xl text-[11px] text-bamboo text-center mb-2">
                  已加入队列，等待上麦...
                </div>
              )}

              {/* 队列列表 */}
              <div className="space-y-1.5">
                {room.queue.map((entry, i) => (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-2 p-2 rounded-lg ${
                      entry.userId === 'me' ? 'bg-bamboo/8 border border-bamboo/20' : 'bg-surface border border-line/20'
                    }`}
                  >
                    <span className="text-[10px] font-bold text-ink-400 w-4">{i + 1}</span>
                    <div className="w-6 h-6 rounded-full bg-seal/10 flex items-center justify-center text-[10px] font-bold text-seal">
                      {entry.nickname[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-ink-700">
                        {entry.nickname}
                        {entry.isAI && <span className="text-[9px] text-ink-400 ml-1">AI</span>}
                      </p>
                      <p className="text-[10px] text-ink-faint truncate">{entry.opinion}</p>
                    </div>
                  </div>
                ))}
                {room.queue.length === 0 && phase !== 'reviewing' && (
                  <p className="text-[10px] text-ink-faint text-center py-2">暂无排队</p>
                )}
              </div>
            </div>

            {/* 高光发言榜 */}
            <div>
              <h3 className="text-[13px] font-bold text-ink-700 mb-2 flex items-center gap-1.5">
                <Flame size={14} className="text-gold" />
                高光时刻
              </h3>
              {room.highlights.length === 0 ? (
                <p className="text-[10px] text-ink-faint text-center py-2">还没有高光发言</p>
              ) : (
                <div className="space-y-2">
                  {room.highlights.slice(-3).reverse().map(speech => (
                    <div key={speech.id} className="p-2 bg-gold/5 rounded-lg border border-gold/20">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Star size={10} className="text-gold" fill="currentColor" />
                        <span className="text-[11px] font-medium text-ink-700">{speech.nickname}</span>
                        <span className="text-[10px] text-gold font-bold ml-auto">{speech.score.total}分</span>
                      </div>
                      <p className="text-[11px] text-ink-600 line-clamp-2 leading-relaxed">
                        {speech.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 底部：用户发言输入（轮到用户时显示） */}
        {isUserTurn && phase !== 'scored' && !isAIThinking && (
          <div className="sticky bottom-0 mt-4 px-4 py-3 bg-surface border-t border-line/30">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-seal animate-pulse" />
              <span className="text-[12px] font-bold text-seal">轮到你发言了！</span>
              <span className="ml-auto text-[12px] font-bold text-seal tabular-nums">{room.speakTimer}s</span>
            </div>
            <div className="flex items-end gap-2">
              <textarea
                value={speechInput}
                onChange={e => setSpeechInput(e.target.value)}
                placeholder="输入你的发言..."
                maxLength={300}
                rows={2}
                className="flex-1 px-3 py-2 rounded-xl border border-seal/30 bg-white text-[13px] text-ink-800 placeholder:text-ink-faint resize-none focus:outline-none focus:border-seal"
                autoFocus
              />
              <button
                onClick={submitUserSpeech}
                disabled={!speechInput.trim()}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-seal text-white text-[13px] font-medium active:scale-95 transition-transform disabled:opacity-40 flex-shrink-0"
              >
                <Send size={14} />
                发言
              </button>
            </div>
          </div>
        )}

        {/* 评分反馈 */}
        {phase === 'scored' && latestSpeech && (
          <div className="sticky bottom-0 mt-4 px-4 py-3 bg-gold/5 border-t border-gold/30">
            <div className="flex items-center gap-2 mb-1">
              <Star size={14} className="text-gold" fill="currentColor" />
              <span className="text-[12px] font-bold text-gold">
                你的发言得分：{latestSpeech.score.total}分
              </span>
              {latestSpeech.isHighlight && (
                <span className="text-[10px] bg-gold/20 text-gold px-1.5 py-0.5 rounded">高光发言！获得续麦权</span>
              )}
            </div>
            <p className="text-[11px] text-ink-500">
              认真度 {latestSpeech.score.seriousness} · 信息量 {latestSpeech.score.information} · {latestSpeech.score.comment}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
