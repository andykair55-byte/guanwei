import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Clock, RefreshCw, GitBranch, ChevronDown, ChevronUp,
  Calendar, Hash, AlertCircle, CheckCircle,
} from 'lucide-react'
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

// ===== 类型 =====

interface TimelineEvent {
  id: string
  date: string          // 原始日期文本
  sortKey: number       // 用于排序的时间戳
  event: string         // 事件描述
  source: string        // 来源句子
}

type AnalysisState = 'idle' | 'analyzing' | 'done'

// ===== 示例 =====

const EXAMPLE_TEXTS = [
  `2024年1月10日，有网友在微博爆料称某上市公司财务造假。1月12日，该公司发布声明否认所有指控。1月15日，证监会宣布已关注此事并展开调查。2月1日，公安机关介入调查。2月20日，公司CEO被带走调查。3月5日，证监会正式立案，对公司处以罚款5000万元。3月15日，公司宣布退市。`,
  `2023年8月初，多地居民反映自来水出现异味。8月5日，当地环保部门介入检测。8月8日，检测结果显示部分指标超标。8月12日，市政府召开新闻发布会通报情况。8月20日，涉事企业被责令停产整顿。9月1日，新的供水方案启用。`,
  `3天前，某明星工作室发布声明称已起诉造谣者。昨天，有媒体曝光了法院传票。今天凌晨，该明星本人首次公开回应，表示将追究到底。`,
]

// ===== 日期提取 =====

interface DateMatch {
  raw: string
  sortKey: number
  index: number
}

function extractDates(text: string): DateMatch[] {
  const results: DateMatch[] = []
  const now = Date.now()

  const patterns: Array<{ regex: RegExp; parser: (m: RegExpMatchArray) => number | null }> = [
    // YYYY年MM月DD日 / YYYY年MM月 / YYYY年
    {
      regex: /(\d{4})年(?:(\d{1,2})月(?:(\d{1,2})[日号])?)?/g,
      parser: (m) => {
        const y = parseInt(m[1]), mo = parseInt(m[2] || '1'), d = parseInt(m[3] || '1')
        if (y < 1900 || y > 2100) return null
        return new Date(y, mo - 1, d).getTime()
      },
    },
    // YYYY-MM-DD / YYYY/MM/DD / YYYY.MM.DD
    {
      regex: /(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/g,
      parser: (m) => {
        const y = parseInt(m[1]), mo = parseInt(m[2]), d = parseInt(m[3])
        if (y < 1900 || mo < 1 || mo > 12 || d < 1 || d > 31) return null
        return new Date(y, mo - 1, d).getTime()
      },
    },
    // MM月DD日 (当年)
    {
      regex: /(\d{1,2})月(\d{1,2})[日号]/g,
      parser: (m) => {
        const mo = parseInt(m[1]), d = parseInt(m[2])
        if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
        const year = new Date().getFullYear()
        return new Date(year, mo - 1, d).getTime()
      },
    },
    // X天前 / X小时前 / X分钟前
    {
      regex: /(\d+)(天|小时|分钟|分)前/g,
      parser: (m) => {
        const n = parseInt(m[1])
        const unit = m[2]
        if (unit === '天') return now - n * 86400000
        if (unit === '小时') return now - n * 3600000
        return now - n * 60000
      },
    },
    // 今天 / 昨天 / 前天 / 昨天凌晨 / 今天凌晨
    {
      regex: /(今天|昨天|前天)/g,
      parser: (m) => {
        const day = new Date()
        day.setHours(0, 0, 0, 0)
        if (m[1] === '昨天') day.setDate(day.getDate() - 1)
        if (m[1] === '前天') day.setDate(day.getDate() - 2)
        return day.getTime()
      },
    },
    // 本月初 / 本月底 / 月初 / 月底
    {
      regex: /(本月初|本月底|月初|月底|上月初|上月底)/g,
      parser: (m) => {
        const now = new Date()
        const y = now.getFullYear(), mo = now.getMonth()
        if (m[1].includes('初')) return new Date(y, m[1].includes('上月') ? mo - 1 : mo, 1).getTime()
        return new Date(y, m[1].includes('上月') ? mo - 1 : mo, 28).getTime()
      },
    },
  ]

  for (const { regex, parser } of patterns) {
    let m: RegExpExecArray | null
    regex.lastIndex = 0
    while ((m = regex.exec(text)) !== null) {
      const sortKey = parser(m)
      if (sortKey !== null) {
        results.push({ raw: m[0], sortKey, index: m.index })
      }
    }
  }

  // 去重（同一位置可能有多个 pattern 命中）
  const seen = new Set<number>()
  return results.filter(r => {
    if (seen.has(r.index)) return false
    seen.add(r.index)
    return true
  })
}

function buildTimeline(text: string): TimelineEvent[] {
  const dates = extractDates(text)
  if (dates.length === 0) return []

  // 按日期在文本中的位置排序
  dates.sort((a, b) => a.index - b.index)

  // 把文本按句子拆分，匹配每个句子是否有日期
  const sentences = text.split(/(?<=[。！？；\n])/).filter(s => s.trim())
  const events: TimelineEvent[] = []

  for (const sentence of sentences) {
    const trimmed = sentence.trim()
    if (!trimmed) continue

    // 在这个句子里找日期
    const sentenceDates = dates.filter(d =>
      trimmed.includes(d.raw)
    )

    if (sentenceDates.length > 0) {
      const dateMatch = sentenceDates[0]
      // 事件描述 = 去掉日期部分后的文本
      const eventText = trimmed.replace(dateMatch.raw, '').replace(/^[，,、\s]+/, '').trim()
      if (eventText.length > 2) {
        events.push({
          id: `ev-${dateMatch.index}`,
          date: dateMatch.raw,
          sortKey: dateMatch.sortKey,
          event: eventText,
          source: trimmed,
        })
      }
    }
  }

  // 按时间排序
  events.sort((a, b) => a.sortKey - b.sortKey)

  return events
}

function formatDate(sortKey: number): string {
  const d = new Date(sortKey)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - sortKey) / 86400000)

  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  if (diffDays === 2) return '前天'
  if (diffDays < 0 && diffDays > -7) return `${Math.abs(diffDays)}天后`
  if (diffDays > 0 && diffDays < 30) return `${diffDays}天前`

  const y = d.getFullYear()
  const mo = d.getMonth() + 1
  const day = d.getDate()
  if (y === now.getFullYear()) return `${mo}月${day}日`
  return `${y}年${mo}月${day}日`
}

// ===== 组件 =====

export default function TimelineBuilder() {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const [input, setInput] = useState('')
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [state, setState] = useState<AnalysisState>('idle')
  const [expandedAll, setExpandedAll] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const handleAnalyze = useCallback(() => {
    if (!input.trim() || state === 'analyzing') return
    setState('analyzing')

    // 模拟分析延迟
    setTimeout(() => {
      const result = buildTimeline(input)
      setEvents(result)
      setState('done')
    }, 800)
  }, [input, state])

  const handleReset = () => {
    setInput('')
    setEvents([])
    setState('idle')
    setExpandedAll(false)
    setExpandedItems(new Set())
  }

  const toggleItem = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (expandedAll) {
      setExpandedItems(new Set())
    } else {
      setExpandedItems(new Set(events.map(e => e.id)))
    }
    setExpandedAll(!expandedAll)
  }

  return (
    <div className="flex flex-col min-h-full bg-paper-texture">
      {/* 顶部导航 */}
      <div className={`px-5 pt-4 pb-2 flex items-center gap-3 ${isDesktop ? 'max-w-3xl mx-auto w-full' : ''}`}>
        <button onClick={() => navigate(-1)} className="p-1.5 -ml-1.5 rounded-lg hover:bg-paper-dark transition-colors active:scale-95">
          <ArrowLeft size={20} className="text-ink-700" />
        </button>
        <div className="flex-1">
          <h1 className={`${isDesktop ? 'text-xl' : 'text-[16px]'} font-bold text-ink-900`}>时间线重建</h1>
          <p className="text-[11px] text-ink-400">从混乱信息中提取事件脉络</p>
        </div>
        {state === 'done' && (
          <button onClick={handleReset} className="p-1.5 rounded-lg hover:bg-paper-dark transition-colors active:scale-95">
            <RefreshCw size={16} className="text-ink-500" />
          </button>
        )}
      </div>

      <div className={`flex-1 px-5 pb-6 overflow-y-auto ${isDesktop ? 'max-w-3xl mx-auto w-full' : ''}`}>
        {/* ===== 输入状态 ===== */}
        {state === 'idle' && (
          <div className="animate-fade-in-up space-y-4">
            <div className="bg-surface rounded-2xl shadow-card p-4">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="粘贴一段新闻、事件描述或聊天记录...&#10;&#10;工具会自动提取其中的时间节点，按时间顺序排列成事件脉络。&#10;&#10;支持格式：2024年1月15日、2024-01-15、3天前、昨天..."
                rows={8}
                className="w-full text-[14px] text-ink-900 placeholder:text-ink-400 resize-none leading-relaxed"
              />
              <button
                onClick={handleAnalyze}
                disabled={!input.trim()}
                className="w-full py-3.5 rounded-xl bg-amber-600 text-white font-semibold text-[14px] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed mt-2"
              >
                <GitBranch size={16} />
                重建时间线
              </button>
            </div>

            {/* 示例 */}
            <div>
              <p className="text-[12px] text-ink-400 font-medium mb-2">试试这些例子：</p>
              <div className="space-y-2">
                {EXAMPLE_TEXTS.map((text, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(text)}
                    className="w-full text-left p-3 bg-surface rounded-xl shadow-card text-[12px] text-ink-500 leading-relaxed line-clamp-2 hover:shadow-card-hover transition-shadow active:scale-[0.99]"
                  >
                    {text.slice(0, 80)}...
                  </button>
                ))}
              </div>
            </div>

            {/* 说明 */}
            <div className="bg-surface rounded-2xl shadow-card p-4">
              <p className="text-[12px] text-ink-500 font-semibold mb-3">工作原理</p>
              <div className="space-y-2.5">
                {[
                  { icon: Hash, text: '自动识别文本中的各种日期格式' },
                  { icon: Calendar, text: '按时间先后排序，重建事件脉络' },
                  { icon: GitBranch, text: '可视化时间线，一目了然事件发展' },
                ].map((step, i) => {
                  const StepIcon = step.icon
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                        <StepIcon size={13} className="text-amber-600" />
                      </div>
                      <p className="text-[12px] text-ink-700">{step.text}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ===== 分析中 ===== */}
        {state === 'analyzing' && (
          <div className="animate-fade-in-up">
            <div className="bg-surface rounded-2xl shadow-card p-6 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 rounded-full border-2 border-amber-300/30 border-t-amber-600 animate-spin" />
              <div className="text-center">
                <p className="text-[14px] text-ink-700 font-medium">正在提取时间节点...</p>
                <p className="text-[11px] text-ink-400 mt-1">识别日期 · 解析事件 · 排序重组</p>
              </div>
            </div>
          </div>
        )}

        {/* ===== 结果 ===== */}
        {state === 'done' && (
          <div className="animate-fade-in-up space-y-4">
            {events.length === 0 ? (
              <div className="bg-surface rounded-2xl shadow-card p-8 flex flex-col items-center gap-3">
                <AlertCircle size={32} className="text-ink-300" />
                <p className="text-[14px] text-ink-500 font-medium">未检测到时间节点</p>
                <p className="text-[12px] text-ink-400 text-center">
                  文本中没有找到可识别的日期格式。<br />
                  请确保包含具体日期，如"2024年1月15日"或"3天前"。
                </p>
                <button
                  onClick={handleReset}
                  className="mt-2 px-4 py-2 rounded-xl bg-paper-dark text-[12px] text-ink-500 font-medium active:scale-[0.97] transition-transform"
                >
                  重新输入
                </button>
              </div>
            ) : (
              <>
                {/* 统计 */}
                <div className="bg-surface rounded-2xl shadow-card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-amber-600" />
                    <span className="text-[13px] text-ink-700 font-semibold">时间线</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[12px] text-ink-400">{events.length} 个节点</span>
                    <button
                      onClick={toggleAll}
                      className="text-[11px] text-amber-600 font-medium"
                    >
                      {expandedAll ? '全部收起' : '全部展开'}
                    </button>
                  </div>
                </div>

                {/* 时间线 */}
                <div className="relative">
                  {/* 连接线 */}
                  <div className="absolute left-[19px] top-4 bottom-4 w-px bg-amber-200/60" />

                  <div className="space-y-3">
                    {events.map((ev, i) => {
                      const isExpanded = expandedItems.has(ev.id)
                      const isFirst = i === 0
                      const isLast = i === events.length - 1

                      return (
                        <div key={ev.id} className="relative flex gap-4">
                          {/* 时间轴节点 */}
                          <div className="relative z-10 flex flex-col items-center flex-shrink-0">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                              isFirst
                                ? 'bg-amber-600 border-amber-600 text-white'
                                : 'bg-surface border-amber-300 text-amber-600'
                            }`}>
                              {isFirst ? <CheckCircle size={16} /> : <span className="text-[11px] font-bold">{i + 1}</span>}
                            </div>
                          </div>

                          {/* 事件卡片 */}
                          <div
                            className={`flex-1 bg-surface rounded-2xl shadow-card overflow-hidden transition-all ${
                              isLast ? 'mb-0' : ''
                            }`}
                          >
                            <button
                              onClick={() => toggleItem(ev.id)}
                              className="w-full px-4 py-3 flex items-start gap-3 text-left"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                                    isFirst ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700'
                                  }`}>
                                    {formatDate(ev.sortKey)}
                                  </span>
                                  <span className="text-[10px] text-ink-400">{ev.date}</span>
                                </div>
                                <p className="text-[13px] text-ink-900 leading-relaxed">{ev.event}</p>
                              </div>
                              {isExpanded
                                ? <ChevronUp size={14} className="text-ink-400 mt-1 flex-shrink-0" />
                                : <ChevronDown size={14} className="text-ink-400 mt-1 flex-shrink-0" />
                              }
                            </button>

                            {isExpanded && (
                              <div className="px-4 pb-3 border-t border-line/20">
                                <p className="text-[11px] text-ink-400 mt-2 leading-relaxed">
                                  <span className="font-medium text-ink-500">原文：</span>{ev.source}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* 时间跨度 */}
                {events.length >= 2 && (
                  <div className="bg-amber-50/50 border border-amber-200/30 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[12px] text-amber-800 font-medium">时间跨度</p>
                      <p className="text-[11px] text-amber-600 mt-0.5">
                        {formatDate(events[0].sortKey)} → {formatDate(events[events.length - 1].sortKey)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[18px] font-bold text-amber-700">
                        {Math.max(1, Math.round((events[events.length - 1].sortKey - events[0].sortKey) / 86400000))}
                      </p>
                      <p className="text-[10px] text-amber-500">天</p>
                    </div>
                  </div>
                )}

                <div className="text-center py-3">
                  <p className="text-[9px] text-ink-400 leading-relaxed">
                    时间线基于文本中的日期信息自动提取<br />
                    实际事件顺序可能与提取结果存在偏差
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
