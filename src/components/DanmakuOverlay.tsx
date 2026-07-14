/**
 * DanmakuOverlay — 弹幕渲染层
 * fixed 定位覆盖全屏，pointer-events-none 不阻挡交互
 * 4 条水平轨道，弹幕从右向左飞过
 */

import { useEffect, useRef } from 'react'
import type { DanmakuQueueItem } from '../services/danmakuService'

interface DanmakuOverlayProps {
  items: DanmakuQueueItem[]
  enabled: boolean
  onItemComplete: (id: string) => void
}

/** 轨道高度占比（从上到下 4 等分，留顶部安全区） */
const TRACK_HEIGHT_PCT = 15   // 每条轨道占 15% 高度
const TOP_OFFSET_PCT = 15     // 顶部留 15% 安全区，避开 Header

export default function DanmakuOverlay({ items, enabled, onItemComplete }: DanmakuOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!enabled || !containerRef.current) return

    const container = containerRef.current

    for (const item of items) {
      if (activeRef.current.has(item.id)) continue
      activeRef.current.add(item.id)

      // 延迟发射
      const timer = setTimeout(() => {
        const el = document.createElement('div')
        el.className = 'danmaku-item'
        el.dataset.track = String(item.track)
        el.style.animationDuration = `${item.duration}s`
        el.style.top = `${TOP_OFFSET_PCT + item.track * TRACK_HEIGHT_PCT}%`

        // 颜色按倾向
        if (item.side === 'affirm') {
          el.classList.add('danmaku-affirm')
        } else if (item.side === 'negate') {
          el.classList.add('danmaku-negate')
        }

        // 强度影响字号
        if (item.intensity === 3) {
          el.classList.add('danmaku-intense')
        }

        el.textContent = item.emoji ? `${item.emoji} ${item.text}` : item.text

        el.addEventListener('animationend', () => {
          el.remove()
          activeRef.current.delete(item.id)
          onItemComplete(item.id)
        })

        container.appendChild(el)
      }, item.delay)

      // 存到 item 上以便批量清理
      ;(item as DanmakuQueueItem & { _timer?: ReturnType<typeof setTimeout> })._timer = timer
    }

    return () => {
      for (const item of items) {
        const t = (item as DanmakuQueueItem & { _timer?: ReturnType<typeof setTimeout> })._timer
        if (t) clearTimeout(t)
      }
    }
  }, [items, enabled, onItemComplete])

  if (!enabled) return null

  return (
    <div
      ref={containerRef}
      className="fixed pointer-events-none overflow-hidden z-30"
      style={{ top: '60px', left: 0, right: 0, bottom: 0 }}
      aria-hidden="true"
    />
  )
}
