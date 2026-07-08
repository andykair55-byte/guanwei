import { useState } from 'react'
import { Star, Newspaper, Globe, MessageCircle, BookOpen, FileText } from 'lucide-react'
import type { EvidenceTimelineItem } from '../types'
import type { LucideIcon } from 'lucide-react'

interface EvidenceTimelineProps {
  items: EvidenceTimelineItem[]
}

const sourceIconMap: Record<string, LucideIcon> = {
  '官方': Newspaper,
  '媒体': Globe,
  '社交': MessageCircle,
  '学术': BookOpen,
}

function getSourceIcon(source: string): LucideIcon {
  for (const [key, Icon] of Object.entries(sourceIconMap)) {
    if (source.includes(key)) return Icon
  }
  return FileText
}

function CredibilityStars({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={10}
          className={i <= level ? 'text-gold fill-gold' : 'text-line'}
        />
      ))}
    </div>
  )
}

// 节点状态色映射：confirmed 绿 / disputed 黄 / unverified 灰
const statusConfig = {
  confirmed: { border: 'border-bamboo', inner: 'bg-bamboo' },
  disputed: { border: 'border-gold', inner: 'bg-gold' },
  unverified: { border: 'border-ink-300', inner: 'bg-ink-300' },
} as const

const COLLAPSE_THRESHOLD = 4

function EvidenceTimeline({ items }: EvidenceTimelineProps) {
  const [expanded, setExpanded] = useState(false)
  if (items.length === 0) return null

  const visibleItems = expanded ? items : items.slice(0, 3)
  const hasMore = items.length > COLLAPSE_THRESHOLD

  return (
    <div className="px-4 py-3">
      <h3 className="text-xs font-medium text-ink-700 mb-3 flex items-center gap-1.5">
        <span className="w-1 h-3.5 rounded-full bg-seal" />
        证据时间线
      </h3>

      <div className="relative ml-2">
        {/* 左侧竖线 */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-line" />

        {visibleItems.map((item, i) => {
          const staggerClass = `stagger-${Math.min(i + 1, 8)}`
          const SourceIcon = getSourceIcon(item.source)
          const sc = statusConfig[item.status ?? 'unverified']
          return (
            <div
              key={i}
              className={`relative pl-7 pb-4 last:pb-0 animate-slide-in-right ${staggerClass}`}
            >
              {/* 时间节点圆点 */}
              <div className={`absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full bg-surface border-2 ${sc.border} flex items-center justify-center transition-colors duration-200 motion-reduce:transition-none`}>
                <div className={`w-1.5 h-1.5 rounded-full ${sc.inner}`} />
              </div>

              {/* 证据卡片 */}
              <div className="bg-surface rounded-lg p-3 shadow-sm border border-line/50">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <SourceIcon size={14} className="text-ink-500" />
                    <span className="text-xs font-medium text-ink-700">{item.source}</span>
                    <span className="text-[10px] text-ink-faint">{item.time}</span>
                  </div>
                  <CredibilityStars level={item.credibility} />
                </div>
                <p className="text-xs text-ink-900 font-medium mb-0.5">{item.title}</p>
                <p className="text-[11px] text-ink-500 leading-relaxed">{item.summary}</p>
              </div>
            </div>
          )
        })}

        {/* 展开收起按钮 */}
        {hasMore && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="ml-7 mt-1 text-[11px] text-seal hover:text-seal/80 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-seal/40 focus-visible:rounded motion-reduce:transition-none"
          >
            {expanded ? '收起' : `展开查看全部 ${items.length} 条`}
          </button>
        )}
      </div>
    </div>
  )
}

export default EvidenceTimeline
