import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, MessageSquare, Shield, LogIn, LogOut, Trophy, Play, Users } from 'lucide-react'
import { useDebateStore } from '../stores/debateStore'
import { useUserStore } from '../stores/userStore'
import DebateStage from '../components/debate/DebateStage'
import SpeechBubble from '../components/debate/SpeechBubble'
import SpeechInput from '../components/debate/SpeechInput'
import PhaseIndicator from '../components/debate/PhaseIndicator'
import JudgmentCard from '../components/debate/JudgmentCard'
import RemovalVoteModal from '../components/debate/RemovalVoteModal'
import SummaryPanel from '../components/debate/SummaryPanel'
import DanmakuOverlay from '../components/DanmakuOverlay'
import { getPhaseLabel } from '../types/debate'
import type { DanmakuQueueItem } from '../services/danmakuService'
import { pickDanmaku, toQueueItems } from '../services/danmakuService'
import { useIsDesktop } from '../hooks/useIsDesktop'



export default function DebateRoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()

  const currentRoom = useDebateStore(s => s.currentRoom)
  const speeches = useDebateStore(s => s.speeches)
  const judgments = useDebateStore(s => s.judgments)
  const summary = useDebateStore(s => s.summary)
  const mySeatIndex = useDebateStore(s => s.mySeatIndex)
  const isOnStage = useDebateStore(s => s.isOnStage)
  const isLoadingRoom = useDebateStore(s => s.isLoadingRoom)
  const hasFetchedRoom = useDebateStore(s => s.hasFetchedRoom)
  const isSpeaking = useDebateStore(s => s.isSpeaking)
  const isJudging = useDebateStore(s => s.isJudging)
  const currentCharLimit = useDebateStore(s => s.currentCharLimit)

  const fetchRoom = useDebateStore(s => s.fetchRoom)
  const joinRoom = useDebateStore(s => s.joinRoom)
  const leaveRoom = useDebateStore(s => s.leaveRoom)
  const submitSpeech = useDebateStore(s => s.submitSpeech)
  const startNewRound = useDebateStore(s => s.startNewRound)
  const castRemovalVote = useDebateStore(s => s.castRemovalVote)
  const requestSummary = useDebateStore(s => s.requestSummary)
  const resetRoom = useDebateStore(s => s.resetRoom)

  const user = useUserStore(s => s.user)
  const isDesktop = useIsDesktop()

  const [showRemovalModal, setShowRemovalModal] = useState(false)
  const [latestJudgment, setLatestJudgment] = useState<string | null>(null)
  const [danmakuEnabled, setDanmakuEnabled] = useState(true)
  const [danmakuQueue, setDanmakuQueue] = useState<DanmakuQueueItem[]>([])
  const speechEndRef = useRef<HTMLDivElement>(null)

  // 加载房间
  useEffect(() => {
    if (roomId && roomId !== 'new') {
      fetchRoom(roomId)
    } else if (roomId === 'new') {
      // 创建房间功能暂未开放，返回大厅
      navigate('/debate-lobby', { replace: true })
    }
  }, [roomId, fetchRoom, navigate])

  // 自动滚动到最新发言
  useEffect(() => {
    speechEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [speeches.length])

  // 新发言触发弹幕（观众模式）
  useEffect(() => {
    if (!isOnStage && danmakuEnabled && speeches.length > 0) {
      const items = pickDanmaku('speech', 2, undefined)
      const queueItems = toQueueItems(items)
      setDanmakuQueue(prev => [...prev, ...queueItems])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speeches.length, isOnStage, danmakuEnabled])

  // 进入辩论房间时触发初始弹幕（观众模式）
  useEffect(() => {
    if (!isOnStage && danmakuEnabled && speeches.length > 0 && danmakuQueue.length === 0) {
      const items = pickDanmaku('highlight', 4, undefined)
      setDanmakuQueue(toQueueItems(items))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 提交发言
  const handleSubmitSpeech = useCallback(async (content: string) => {
    await submitSpeech(content)
  }, [submitSpeech])

  // 开始新一轮
  const handleStartRound = useCallback(async () => {
    const judgment = await startNewRound()
    if (judgment) {
      setLatestJudgment(judgment.round + '-' + Date.now())
      // 触发弹幕
      if (danmakuEnabled) {
        const items = pickDanmaku('highlight', 3)
        setDanmakuQueue(prev => [...prev, ...toQueueItems(items)])
      }
    }
  }, [startNewRound, danmakuEnabled])

  // 请求总结
  const handleRequestSummary = useCallback(async () => {
    await requestSummary()
  }, [requestSummary])

  // 入场
  const handleJoin = useCallback(async () => {
    if (!roomId) return
    const success = await joinRoom(roomId)
    if (!success) {
      alert('积分不足或没有空位')
    }
  }, [roomId, joinRoom])

  // 抬走投票
  const handleRemovalVote = useCallback(async (seatIndex: number) => {
    const removed = await castRemovalVote(seatIndex)
    setShowRemovalModal(false)
    if (removed) {
      // 触发弹幕
      if (danmakuEnabled) {
        const items = pickDanmaku('taunt', 3)
        setDanmakuQueue(prev => [...prev, ...toQueueItems(items)])
      }
    }
  }, [castRemovalVote, danmakuEnabled])

  // 弹幕完成
  const handleDanmakuComplete = useCallback((id: string) => {
    setDanmakuQueue(prev => prev.filter(item => item.id !== id))
  }, [])

  // 房间不存在时自动跳转大厅（仅在 fetchRoom 完成后才触发）
  const [redirectTimer, setRedirectTimer] = useState(2)
  useEffect(() => {
    if (hasFetchedRoom && !currentRoom) {
      const timer = setInterval(() => {
        setRedirectTimer(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            navigate('/debate-lobby', { replace: true })
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [hasFetchedRoom, currentRoom, navigate])

  // Mock 观众头像
  const spectatorAvatars = useMemo(() => {
    if (!currentRoom) return []
    const count = Math.min(currentRoom.spectatorCount, 20)
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      src: `https://picsum.photos/seed/spec-${currentRoom.id}-${i}/40/40`,
    }))
  }, [currentRoom?.id, currentRoom?.spectatorCount])

  // Loading — 正在加载或尚未开始加载
  if (isLoadingRoom || (!hasFetchedRoom && !currentRoom)) {
    return (
      <div className="flex flex-col min-h-screen bg-paper-texture">
        <div className="skeleton h-12" />
        <div className="p-4 space-y-3">
          <div className="skeleton h-32 rounded-xl" />
          <div className="skeleton h-20 rounded-xl" />
          <div className="skeleton h-40 rounded-xl" />
        </div>
      </div>
    )
  }

  // 无房间 — 自动跳转中
  if (hasFetchedRoom && !currentRoom) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-paper-texture">
        <Shield size={36} className="text-ink-faint mb-3" />
        <p className="text-[14px] text-ink-400 mb-2">房间加载失败</p>
        <p className="text-[12px] text-ink-faint">{redirectTimer}s 后自动返回大厅...</p>
        <button onClick={() => navigate('/debate-lobby')} className="mt-4 px-4 py-2 bg-seal text-white rounded-xl text-sm active:scale-95 transition-transform">
          立即返回
        </button>
      </div>
    )
  }

  // 房间已结束
  if (currentRoom && currentRoom.status === 'ended') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-paper-texture">
        <Shield size={36} className="text-ink-faint mb-3" />
        <p className="text-[14px] text-ink-400 mb-2">房间已关闭</p>
        <p className="text-[12px] text-ink-faint">{redirectTimer}s 后自动返回大厅...</p>
        <button onClick={() => navigate('/debate-lobby')} className="mt-4 px-4 py-2 bg-seal text-white rounded-xl text-sm active:scale-95 transition-transform">
          立即返回
        </button>
      </div>
    )
  }

  // 兜底守卫：理论上前面的分支已处理 null 情况，此处保证后续 currentRoom 非空
  if (!currentRoom) return null

  const onStageCount = currentRoom.seats.filter(s => s.status === 'occupied').length
  const removalThreshold = Math.ceil(onStageCount * currentRoom.rules.removalThreshold)
  const isEnded = currentRoom.status === 'ended'
  const isWaiting = currentRoom.status === 'waiting'
  const isDebating = currentRoom.status === 'debating'

  return (
    <div className="flex flex-col min-h-screen bg-paper-texture">
      {/* 弹幕 */}
      <DanmakuOverlay
        items={danmakuQueue}
        enabled={danmakuEnabled}
        onItemComplete={handleDanmakuComplete}
      />

      {/* Header */}
      <div className="sticky top-0 z-20 glass border-b border-line/50">
        <div className={`flex items-center h-12 px-4 ${isDesktop ? '' : 'max-w-[480px] mx-auto'}`}>
          <button onClick={() => { resetRoom(); navigate('/debate-lobby') }} className="flex items-center gap-1 text-ink-700 text-sm active:opacity-60">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 ml-3 min-w-0">
            <p className="text-[13px] font-medium text-ink-900 truncate">{currentRoom.topic}</p>
            {isDebating && (
              <p className="text-[10px] text-ink-400">
                第{currentRoom.currentRound}轮 · {getPhaseLabel(currentRoom.currentPhase)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* 观众数 */}
            <div className="flex items-center gap-1 text-ink-400">
              <Eye size={14} />
              <span className="text-[11px]">{currentRoom.spectatorCount}</span>
            </div>
            {/* 弹幕开关 */}
            {!isOnStage && (
              <button
                onClick={() => setDanmakuEnabled(!danmakuEnabled)}
                className={`p-1.5 rounded-lg transition-colors ${danmakuEnabled ? 'text-seal bg-seal/10' : 'text-ink-400'}`}
              >
                <MessageSquare size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 w-full flex flex-col ${isDesktop ? 'max-w-4xl mx-auto' : 'max-w-[480px] mx-auto'}`}>
        {/* 舞台 */}
        <div className="px-4 pt-3 pb-2">
          <DebateStage
            seats={currentRoom.seats}
            entryCost={currentRoom.currentEntryCost}
            mySeatIndex={mySeatIndex}
            onSeatClick={isOnStage ? (idx) => {
              // 只有台上的人可以发起抬走投票
              if (currentRoom.seats[idx]?.status === 'occupied' && currentRoom.seats[idx]?.userId !== user.id) {
                setShowRemovalModal(true)
              }
            } : undefined}
          />
        </div>

        {/* 阶段指示器 */}
        {isDebating && (
          <div className="px-4 pb-2">
            <PhaseIndicator
              currentRound={currentRoom.currentRound}
              phase={currentRoom.currentPhase}
              charLimit={currentCharLimit}
              totalRounds={6}
            />
          </div>
        )}

        {/* 观众区域 */}
        {(isDebating || isWaiting) && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-3 p-3 bg-surface/60 rounded-xl border border-line/20">
              <div className="flex items-center gap-1.5">
                <Users size={14} className="text-ink-400" />
                <span className="text-[12px] text-ink-500 font-medium">{currentRoom.spectatorCount}人围观</span>
              </div>
              {/* 观众头像堆叠 */}
              <div className="flex -space-x-2">
                {spectatorAvatars.slice(0, 8).map((av) => (
                  <img
                    key={av.id}
                    src={av.src}
                    alt=""
                    className="w-6 h-6 rounded-full border-2 border-surface object-cover"
                    loading="lazy"
                  />
                ))}
                {currentRoom.spectatorCount > 8 && (
                  <div className="w-6 h-6 rounded-full border-2 border-surface bg-ink-200 flex items-center justify-center">
                    <span className="text-[9px] text-ink-500 font-medium">+{currentRoom.spectatorCount - 8}</span>
                  </div>
                )}
              </div>
              {danmakuEnabled && isDebating && (
                <span className="ml-auto flex items-center gap-1 text-[10px] text-bamboo">
                  <span className="w-1.5 h-1.5 rounded-full bg-bamboo animate-pulse" />
                  热议中
                </span>
              )}
            </div>
          </div>
        )}

        {/* 等待状态 */}
        {isWaiting && !isOnStage && (
          <div className="mx-4 p-4 bg-surface rounded-xl border border-line/30 text-center">
            <p className="text-[13px] text-ink-500 mb-3">房间等待辩手中...</p>
            <button
              onClick={handleJoin}
              className="flex items-center justify-center gap-2 mx-auto px-5 py-2.5 bg-seal text-white rounded-xl text-sm font-medium active:scale-95 transition-transform"
            >
              <LogIn size={16} />
              消耗 {currentRoom.currentEntryCost} 积分上场
            </button>
          </div>
        )}

        {/* 等待状态 - 已上场 */}
        {isWaiting && isOnStage && (
          <div className="mx-4 p-4 bg-surface rounded-xl border border-seal/20 text-center">
            <p className="text-[13px] text-seal font-medium mb-2">你已就位，等待房主开始</p>
            <button
              onClick={handleStartRound}
              className="flex items-center justify-center gap-2 mx-auto px-5 py-2.5 bg-seal text-white rounded-xl text-sm font-medium active:scale-95 transition-transform"
            >
              <Play size={16} />
              开始辩论
            </button>
          </div>
        )}

        {/* 发言流 */}
        {(isDebating || isEnded) && (
          <div className="flex-1 px-4 overflow-y-auto">
            {/* 最新评分卡 */}
            {latestJudgment && judgments.length > 0 && (
              <div className="mb-3 animate-fade-in-up">
                <JudgmentCard judgment={judgments[judgments.length - 1]} />
              </div>
            )}

            {/* 发言列表 */}
            <div className="space-y-3">
              {speeches.map(speech => (
                <SpeechBubble key={speech.id} speech={speech} />
              ))}
            </div>
            <div ref={speechEndRef} />

            {/*  judging 状态 */}
            {isJudging && (
              <div className="flex items-center justify-center gap-2 py-4">
                <div className="w-4 h-4 border-2 border-seal/30 border-t-seal rounded-full animate-spin" />
                <span className="text-[12px] text-ink-400">AI裁判评分中...</span>
              </div>
            )}
          </div>
        )}

        {/* 底部操作区 */}
        <div className="sticky bottom-0 bg-paper-texture border-t border-line/30">
          {/* 辩论中 - 台上用户 */}
          {isDebating && isOnStage && (
            <div className="px-4 py-3">
              <SpeechInput
                charLimit={currentCharLimit}
                isSpeaking={isSpeaking}
                onSubmit={handleSubmitSpeech}
              />
            </div>
          )}

          {/* 辩论中 - 观众 */}
          {isDebating && !isOnStage && (
            <div className="px-4 py-3 flex items-center gap-2">
              <button
                onClick={handleJoin}
                className="flex items-center gap-1.5 px-4 py-2 bg-seal text-white rounded-xl text-[12px] font-medium active:scale-95 transition-transform"
              >
                <LogIn size={14} />
                {currentRoom.currentEntryCost}积分上场
              </button>
              <button
                onClick={() => setShowRemovalModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-surface border border-line/50 text-ink-700 rounded-xl text-[12px] font-medium active:scale-95 transition-transform"
              >
                <Shield size={14} />
                抬走投票
              </button>
              <div className="flex-1" />
              <span className="text-[10px] text-ink-faint">
                需要{removalThreshold}票(80%)
              </span>
            </div>
          )}

          {/* 辩论结束 */}
          {isEnded && !summary && (
            <div className="px-4 py-3 text-center">
              <button
                onClick={handleRequestSummary}
                className="flex items-center gap-2 mx-auto px-5 py-2.5 bg-gold text-white rounded-xl text-sm font-medium active:scale-95 transition-transform"
              >
                <Trophy size={16} />
                生成辩论总结
              </button>
            </div>
          )}

          {/* 已结束 - 已上场用户可以离场 */}
          {isEnded && isOnStage && (
            <div className="px-4 pb-3 text-center">
              <button
                onClick={async () => { await leaveRoom(); navigate('/debate-lobby') }}
                className="flex items-center gap-1.5 mx-auto text-[12px] text-ink-400 active:opacity-60"
              >
                <LogOut size={14} />
                离开房间
              </button>
            </div>
          )}

          {/* 新一轮按钮（房主/管理员） */}
          {isDebating && isOnStage && speeches.length > 0 && (
            <div className="px-4 pb-3 text-center">
              <button
                onClick={handleStartRound}
                disabled={isJudging}
                className="text-[12px] text-seal font-medium active:opacity-60 disabled:opacity-40"
              >
                {isJudging ? '评分中...' : '结束本轮 →'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 抬走投票弹窗 */}
      {showRemovalModal && (
        <RemovalVoteModal
          seats={currentRoom.seats.filter(s => s.status === 'occupied').map(s => ({
            index: s.index,
            nickname: s.nickname || '',
            avatar: s.avatar || '',
            side: s.side,
            removalVotes: s.removalVotes,
          }))}
          onStageCount={onStageCount}
          threshold={removalThreshold}
          onVote={handleRemovalVote}
          onClose={() => setShowRemovalModal(false)}
        />
      )}

      {/* 总结面板 */}
      {summary && (
        <SummaryPanel
          summary={summary}
          onClose={() => navigate('/debate-lobby')}
        />
      )}
    </div>
  )
}
