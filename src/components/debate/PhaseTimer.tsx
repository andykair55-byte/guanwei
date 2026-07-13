// src/components/debate/PhaseTimer.tsx
import { useState, useEffect, useRef } from 'react'
import { Clock } from 'lucide-react'

interface Props {
  duration: number        // 总时长（秒）
  onTimeUp: () => void
  autoStart?: boolean
  paused?: boolean
}

export default function PhaseTimer({ duration, onTimeUp, autoStart = true, paused = false }: Props) {
  const [remaining, setRemaining] = useState(duration)
  const onTimeUpRef = useRef(onTimeUp)
  onTimeUpRef.current = onTimeUp

  useEffect(() => {
    if (!autoStart || paused) return
    const interval = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          onTimeUpRef.current()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [autoStart, paused])

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const progress = ((duration - remaining) / duration) * 100
  const isUrgent = remaining <= 10

  return (
    <div className="flex items-center gap-2">
      <Clock size={14} className={isUrgent ? 'text-red-500 animate-pulse' : 'text-ink-400'} />
      <span
        className={`text-[14px] font-mono font-bold tabular-nums ${
          isUrgent ? 'text-red-500' : 'text-ink-600'
        }`}
      >
        {minutes}:{seconds.toString().padStart(2, '0')}
      </span>
      <div className="w-16 h-1 bg-paper-dark rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ease-linear ${
            isUrgent ? 'bg-red-500' : 'bg-seal'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
