/**
 * RefereeDice — 裁判骰子动画组件
 *
 * 点击后随机摇出一个裁判，带 3D 翻转动画。
 * 动画流程：点击 → 快速翻滚(2s) → 减速 → 定格(0.3s) → 裁判登场台词逐字打出(50ms/字)。
 */
import { useState, useCallback, useRef, useEffect } from 'react'
import { RefreshCcw } from 'lucide-react'
import { ALL_REFEREE, type Referee } from '../services/refereeService'

interface RefereeDiceProps {
  /** 摇出裁判后的回调 */
  onRefereeSelected?: (referee: Referee) => void
  /** 是否禁用（辩论开始后不可再摇） */
  disabled?: boolean
  /** 外部控制是否开始摇 */
  triggerRoll?: boolean
  /** 摇完回调 */
  onRollComplete?: () => void
}

// 每个裁判面的高度（px）
const FACE_HEIGHT = 100

export default function RefereeDice({
  onRefereeSelected,
  disabled = false,
  triggerRoll = false,
  onRollComplete,
}: RefereeDiceProps) {
  const [isRolling, setIsRolling] = useState(false)
  const [selectedReferee, setSelectedReferee] = useState<Referee | null>(null)
  const [showEntrance, setShowEntrance] = useState(false)
  const [offsetY, setOffsetY] = useState(0)
  const [revealedText, setRevealedText] = useState('')
  const animFrameRef = useRef<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // 系统级「减少动态效果」偏好：开启时跳过逐字打字，直接展示完整台词
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // 构建循环列表：把裁判列表重复 4 次，确保翻滚有足够的视觉长度
  const loopedReferees = [
    ...ALL_REFEREE,
    ...ALL_REFEREE,
    ...ALL_REFEREE,
    ...ALL_REFEREE,
  ]

  const roll = useCallback(() => {
    if (isRolling || disabled) return

    setIsRolling(true)
    setSelectedReferee(null)
    setShowEntrance(false)
    setRevealedText('')

    // 随机选择目标裁判
    const targetIndex = Math.floor(Math.random() * ALL_REFEREE.length)
    // 目标位置：第 3 轮循环中的目标裁判（确保有足够的翻滚距离）
    const targetOffset = (2 * ALL_REFEREE.length + targetIndex) * FACE_HEIGHT

    // 动画参数
    const duration = 2000 // 总时长 2s
    const startTime = performance.now()
    const startOffset = offsetY % (ALL_REFEREE.length * FACE_HEIGHT * 4)

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      // easeOutExpo: 快速启动 → 指数减速 → 精准停止
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      const currentOffset = startOffset + (targetOffset - startOffset) * eased

      setOffsetY(currentOffset)

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate)
      } else {
        // 动画结束
        const referee = ALL_REFEREE[targetIndex]
        setSelectedReferee(referee)
        setIsRolling(false)

        // 延迟显示登场台词
        setTimeout(() => {
          setShowEntrance(true)
          onRefereeSelected?.(referee)
          onRollComplete?.()
        }, 300)
      }
    }

    animFrameRef.current = requestAnimationFrame(animate)
  }, [isRolling, disabled, offsetY, onRefereeSelected, onRollComplete])

  // 外部触发
  useEffect(() => {
    if (triggerRoll) roll()
  }, [triggerRoll, roll])

  // 清理动画帧
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  // 裁判登场台词逐字打出（50ms/字），开启「减少动态效果」时直接显示完整文本
  useEffect(() => {
    if (!showEntrance || !selectedReferee) return
    const fullText = selectedReferee.entranceLine

    if (prefersReducedMotion) {
      setRevealedText(fullText)
      return
    }

    setRevealedText('')
    let i = 0
    const timer = window.setInterval(() => {
      i += 1
      setRevealedText(fullText.slice(0, i))
      if (i >= fullText.length) window.clearInterval(timer)
    }, 50)
    return () => window.clearInterval(timer)
  }, [showEntrance, selectedReferee, prefersReducedMotion])

  // 当前可见的裁判面索引（用于渲染优化）
  const visibleStart = Math.max(0, Math.floor(offsetY / FACE_HEIGHT) - 2)
  const visibleEnd = Math.min(loopedReferees.length, visibleStart + 6)

  return (
    <div className="flex flex-col items-center gap-4">
      {/* 骰子容器 */}
      <div
        ref={containerRef}
        className={`relative w-[280px] h-[${FACE_HEIGHT}px] overflow-hidden rounded-2xl border-2 transition-all duration-300 motion-reduce:transition-none ${
          isRolling
            ? 'border-gold/60 shadow-[0_0_30px_rgba(218,165,32,0.3)]'
            : selectedReferee
              ? `border-line/40 shadow-card`
              : 'border-line/30 shadow-card hover:border-line/50 hover:shadow-lg'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        style={{ height: FACE_HEIGHT }}
        onClick={() => { if (!disabled && !isRolling) roll() }}
      >
        {/* 渐变遮罩（上下边缘渐隐） */}
        <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-paper to-transparent z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-paper to-transparent z-10 pointer-events-none" />

        {/* 中心指示线 */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-gold/30 z-10 pointer-events-none -translate-y-px" />

        {/* 滚动列表 */}
        <div
          className="absolute left-0 right-0 transition-none"
          style={{ transform: `translateY(-${offsetY}px)` }}
        >
          {loopedReferees.slice(visibleStart, visibleEnd).map((ref, i) => {
            const actualIndex = visibleStart + i
            return (
              <div
                key={`${ref.id}-${actualIndex}`}
                className={`flex items-center gap-3 px-4 transition-opacity duration-100 motion-reduce:transition-none`}
                style={{ height: FACE_HEIGHT }}
              >
                {/* 裁判头像占位 */}
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${ref.visual.faceFrom} ${ref.visual.faceTo} flex items-center justify-center flex-shrink-0 shadow-md`}>
                  <span className="text-white text-lg font-bold">
                    {ref.name.charAt(0)}
                  </span>
                </div>
                {/* 裁判信息 */}
                <div className="flex-1 min-w-0">
                  <p className={`text-[14px] font-bold ${ref.visual.textColor} truncate`}>
                    {ref.name}
                  </p>
                  <p className="text-[11px] text-ink-400 truncate">{ref.title}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* 未开始时的提示 */}
        {!isRolling && !selectedReferee && (
          <div className="absolute inset-0 flex items-center justify-center bg-paper/80 z-20">
            <div className="text-center">
              <p className="text-[13px] text-ink-500 font-medium">点击摇出裁判</p>
              <p className="text-[10px] text-ink-300 mt-1">随机决定本场裁判风格</p>
            </div>
          </div>
        )}
      </div>

      {/* 裁判登场台词（逐字打出） */}
      {showEntrance && selectedReferee && (
        <div className="animate-fade-in-up motion-reduce:animate-none text-center max-w-[280px]">
          <div className={`inline-block px-4 py-2.5 rounded-xl ${selectedReferee.visual.bubbleBg} border ${selectedReferee.visual.bubbleBorder}`}>
            <p className={`text-[13px] ${selectedReferee.visual.textColor} font-medium leading-relaxed`}>
              「{revealedText}
              {revealedText.length < selectedReferee.entranceLine.length && (
                <span className="animate-pulse motion-reduce:animate-none">▌</span>
              )}
              {revealedText.length >= selectedReferee.entranceLine.length && '」'}
            </p>
          </div>
          <p className="text-[10px] text-ink-300 mt-2">
            — {selectedReferee.name} · {selectedReferee.title}
          </p>
        </div>
      )}

      {/* 重新摇 */}
      {selectedReferee && !disabled && (
        <button
          onClick={(e) => { e.stopPropagation(); roll() }}
          className="text-[11px] text-ink-400 hover:text-ink-600 transition-colors flex items-center gap-1"
        >
          <RefreshCcw size={12} />
          换一个裁判
        </button>
      )}
    </div>
  )
}
