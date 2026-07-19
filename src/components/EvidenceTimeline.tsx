import { useState, useMemo, useRef, useEffect } from 'react'
import {
  Star, Newspaper, Globe, MessageCircle, BookOpen, FileText,
  ChevronDown, Layers,
} from 'lucide-react'
import type { EvidenceTimelineItem, TimelineNode, TimelineNodeStatus } from '../types'
import type { LucideIcon } from 'lucide-react'

// ── 统一节点结构 ──────────────────────────────────────
// 内部统一数据形状：兼容 EvidenceTimelineItem（旧）与 TimelineNode（新）
interface UnifiedNode {
  id: string
  date: string
  label: string
  detail?: string
  sources?: string[]
  sourceLabel?: string       // 来源展示文本（旧字段：source）
  sourceIcon?: string        // 旧字段：sourceIcon
  credibility?: number       // 旧字段：1-5 星
  status?: TimelineNodeStatus
  multiSource?: boolean
}

interface EvidenceTimelineProps {
  // 旧字段：兼容 VerifyPage 的 EvidenceTimelineItem[]
  items?: EvidenceTimelineItem[]
  // 新字段：通用 TimelineNode[]
  nodes?: TimelineNode[]
  // 可选标题
  title?: string
  // 是否默认全部展开（默认 false，超过阈值时折叠）
  defaultExpanded?: boolean
  // 节点点击是否展开详情卡片
  expandable?: boolean
  // 主题：'default'（墨色）| 'hot'（热点橙红）
  theme?: 'default' | 'hot'
}

const sourceIconMap: Record<string, LucideIcon> = {
  '官方': Newspaper,
  '媒体': Globe,
  '社交': MessageCircle,
  '学术': BookOpen,
}

function getSourceIcon(source?: string): LucideIcon {
  if (!source) return FileText
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
const statusConfig: Record<TimelineNodeStatus, {
  border: string
  inner: string
  label: string
  badge: string
  ring: string
}> = {
  confirmed: {
    border: 'border-bamboo',
    inner: 'bg-bamboo',
    label: '已证实',
    badge: 'bg-bamboo-50 text-bamboo-600',
    ring: 'ring-bamboo/20',
  },
  disputed: {
    border: 'border-gold',
    inner: 'bg-gold',
    label: '有争议',
    badge: 'bg-gold-50 text-gold-600',
    ring: 'ring-gold/20',
  },
  unverified: {
    border: 'border-ink-300',
    inner: 'bg-ink-300',
    label: '未证实',
    badge: 'bg-ink-50 text-ink-500',
    ring: 'ring-ink-200/40',
  },
}

const COLLAPSE_THRESHOLD = 4

// 旧 EvidenceTimelineItem → 统一结构
function normalizeItems(items: EvidenceTimelineItem[] = []): UnifiedNode[] {
  return items.map((it, i) => ({
    id: `ev-${i}`,
    date: it.time,
    label: it.title,
    detail: it.summary,
    sourceLabel: it.source,
    sourceIcon: it.sourceIcon,
    credibility: it.credibility,
    status: it.status,
  }))
}

// TimelineNode → 统一结构
function normalizeNodes(nodes: TimelineNode[] = []): UnifiedNode[] {
  return nodes.map((n, i) => ({
    id: n.id || `tl-${i}`,
    date: n.date,
    label: n.label,
    detail: n.detail,
    sources: n.sources,
    status: n.status,
    multiSource: n.multiSource,
  }))
}

// 平滑展开/收起动画 Hook（含 prefers-reduced-motion 回退）
function useSmoothCollapse(contentRef: React.RefObject<HTMLDivElement | null>, expanded: boolean) {
  const [height, setHeight] = useState<number | 'auto'>(expanded ? 'auto' : 0)

  useEffect(() => {
    const el = contentRef.current
    if (!el) return

    // 检测用户偏好：减少动效时直接跳到目标状态
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      setHeight(expanded ? 'auto' : 0)
      return
    }

    let rafId = 0
    let timer = 0

    if (expanded) {
      // 展开：先测量目标高度 → 从 0 过渡到目标 → 完成后设为 auto
      const targetHeight = el.scrollHeight
      setHeight(0)
      // 双 rAF 确保浏览器先渲染 0 高度
      rafId = requestAnimationFrame(() => {
        rafId = requestAnimationFrame(() => {
          setHeight(targetHeight)
        })
        // 过渡结束后设为 auto，避免内容变化时被裁剪
        timer = window.setTimeout(() => setHeight('auto'), 320)
      })
    } else {
      // 收起：先固定为当前高度 → 下一帧设为 0
      const currentHeight = el.scrollHeight
      setHeight(currentHeight)
      rafId = requestAnimationFrame(() => {
        rafId = requestAnimationFrame(() => {
          setHeight(0)
        })
      })
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      if (timer) window.clearTimeout(timer)
    }
  }, [expanded, contentRef])

  return height
}

// 节点详情展开子组件
function NodeDetailCard({ node }: { node: UnifiedNode }) {
  const contentRef = useRef<HTMLDivElement>(null)
  // 始终展开（节点点击外部触发），此处只负责平滑过渡
  const height = useSmoothCollapse(contentRef, true)

  return (
    <div
      ref={contentRef}
      style={{
        height: height === 'auto' ? 'auto' : `${height}px`,
        overflow: height === 'auto' ? 'visible' : 'hidden',
        transition: 'height 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      className="motion-reduce:transition-none"
    >
      <div className="pt-2.5 mt-2.5 border-t border-line/40 space-y-2">
        {node.detail && (
          <p className="text-[11.5px] text-ink-600 leading-relaxed">{node.detail}</p>
        )}
        {node.sources && node.sources.length > 0 && (
          <div>
            <p className="text-[10px] text-ink-400 mb-1.5 font-medium">信息来源：</p>
            <div className="flex flex-wrap gap-1.5">
              {node.sources.map((src, j) => (
                <span
                  key={j}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-paper-50 text-[10.5px] text-ink-600 border border-line/60"
                >
                  <FileText size={9} className="text-ink-400" />
                  {src}
                </span>
              ))}
            </div>
          </div>
        )}
        {node.credibility !== undefined && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-ink-400">可信度：</span>
            <CredibilityStars level={node.credibility} />
          </div>
        )}
      </div>
    </div>
  )
}

function EvidenceTimeline({
  items,
  nodes,
  title = '证据时间线',
  defaultExpanded = false,
  expandable = true,
  theme = 'default',
}: EvidenceTimelineProps) {
  const [listExpanded, setListExpanded] = useState(defaultExpanded)
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set())

  // 合并去重：items 与 nodes 都可能传入
  const unified = useMemo<UnifiedNode[]>(() => {
    const fromItems = normalizeItems(items || [])
    const fromNodes = normalizeNodes(nodes || [])
    return [...fromItems, ...fromNodes]
  }, [items, nodes])

  if (unified.length === 0) return null

  const visibleItems = listExpanded ? unified : unified.slice(0, 3)
  const hasMore = unified.length > COLLAPSE_THRESHOLD

  const toggleNode = (id: string) => {
    if (!expandable) return
    setExpandedNodeIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // 主题色：default 用 seal（朱砂红）；hot 用橙色渐变（参考设计稿 #F97316 → #EF4444）
  const accentBar = theme === 'hot' ? 'bg-gradient-to-b from-[#F97316] to-[#EF4444]' : 'bg-seal'
  const accentText = theme === 'hot' ? 'text-[#F97316]' : 'text-seal'
  const accentTextHover = theme === 'hot' ? 'hover:text-[#F97316]/80' : 'hover:text-seal/80'
  const accentRing = theme === 'hot' ? 'focus-visible:ring-[#F97316]/40' : 'focus-visible:ring-seal/40'

  return (
    <div className="px-4 py-3">
      <h3 className={`text-xs font-medium text-ink-700 mb-3 flex items-center gap-1.5`}>
        <span className={`w-1 h-3.5 rounded-full ${accentBar}`} />
        {title}
        {unified.length > 0 && (
          <span className="ml-1 text-[10px] text-ink-400">· {unified.length} 节点</span>
        )}
      </h3>

      <div className="relative ml-2">
        {/* 左侧竖线 */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-line" />

        {visibleItems.map((node, i) => {
          const staggerClass = `stagger-${Math.min(i + 1, 8)}`
          const SourceIcon = getSourceIcon(node.sourceLabel)
          const sc = statusConfig[node.status ?? 'unverified']
          const isNodeExpanded = expandedNodeIds.has(node.id)
          const hasDetail = !!(node.detail || (node.sources && node.sources.length > 0) || node.credibility !== undefined)

          return (
            <div
              key={node.id}
              className={`relative pl-7 pb-4 last:pb-0 animate-fade-in-up ${staggerClass}`}
            >
              {/* 时间节点圆点 */}
              <div
                className={`absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full bg-surface border-2 ${sc.border} flex items-center justify-center transition-colors duration-200 motion-reduce:transition-none ring-2 ${sc.ring}`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${sc.inner}`} />
              </div>

              {/* 证据卡片 */}
              <div
                className={`bg-surface rounded-lg p-3 shadow-sm border border-line/50 transition-shadow ${
                  expandable && hasDetail ? 'cursor-pointer hover:shadow-card-hover' : ''
                }`}
                onClick={() => toggleNode(node.id)}
                role={expandable && hasDetail ? 'button' : undefined}
                tabIndex={expandable && hasDetail ? 0 : undefined}
                onKeyDown={(e) => {
                  if (expandable && hasDetail && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    toggleNode(node.id)
                  }
                }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <SourceIcon size={14} className="text-ink-500" />
                    {node.sourceLabel && (
                      <span className="text-xs font-medium text-ink-700">{node.sourceLabel}</span>
                    )}
                    <span className="text-[10px] text-ink-faint font-mono">{node.date}</span>
                    {node.multiSource && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] text-gold-600 bg-gold-50 px-1 py-0.5 rounded font-medium">
                        <Layers size={8} />
                        多源
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {/* 状态徽章 */}
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${sc.badge}`}>
                      {sc.label}
                    </span>
                    {node.credibility !== undefined && (
                      <CredibilityStars level={node.credibility} />
                    )}
                    {expandable && hasDetail && (
                      <ChevronDown
                        size={12}
                        className={`text-ink-400 transition-transform duration-200 motion-reduce:transition-none ${
                          isNodeExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    )}
                  </div>
                </div>
                <p className="text-xs text-ink-900 font-medium mb-0.5 leading-relaxed">{node.label}</p>
                {/* 折叠时不展示 detail（避免重复），展开时由 NodeDetailCard 接管 */}
                {!isNodeExpanded && node.detail && (
                  <p className="text-[11px] text-ink-500 leading-relaxed line-clamp-1">{node.detail}</p>
                )}

                {/* 展开后的详情卡片 */}
                {isNodeExpanded && hasDetail && (
                  <NodeDetailCard node={node} />
                )}
              </div>
            </div>
          )
        })}

        {/* 展开收起按钮 */}
        {hasMore && (
          <button
            type="button"
            onClick={() => setListExpanded((v) => !v)}
            className={`ml-7 mt-1 text-[11px] ${accentText} ${accentTextHover} transition-colors duration-200 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 ${accentRing} focus-visible:rounded inline-flex items-center gap-1`}
          >
            <ChevronDown
              size={11}
              className={`transition-transform duration-200 motion-reduce:transition-none ${listExpanded ? 'rotate-180' : ''}`}
            />
            {listExpanded ? '收起' : `展开查看全部 ${unified.length} 条`}
          </button>
        )}
      </div>
    </div>
  )
}

export default EvidenceTimeline
