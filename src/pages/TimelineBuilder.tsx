import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Clock, RefreshCw, GitBranch,
  Hash, AlertCircle, Sparkles, Send,
  AlertTriangle, Wand2,
} from 'lucide-react'
import { useIsDesktop } from '../hooks/useIsDesktop'
import EvidenceTimeline from '../components/EvidenceTimeline'
import { callLLM, useLLMStore } from '../stores/llmStore'
import {
  TIMELINE_TEMPLATES, matchTimelineTemplate,
  type TimelineTemplate,
} from '../services/mockData'
import type { TimelineNode, TimelineNodeStatus } from '../types'

// ===== 类型 =====

type AnalysisState = 'idle' | 'analyzing' | 'done'
type GenerationMethod = 'llm' | 'regex' | 'template' | null

interface BuildResult {
  nodes: TimelineNode[]
  method: GenerationMethod
  templateType?: TimelineTemplate['type']
  warning?: string
}

// ===== 示例 =====

const EXAMPLE_TEXTS = [
  `2024年1月10日，有网友在微博爆料称某上市公司财务造假。1月12日，该公司发布声明否认所有指控。1月15日，证监会宣布已关注此事并展开调查。2月1日，公安机关介入调查。2月20日，公司CEO被带走调查。3月5日，证监会正式立案，对公司处以罚款5000万元。3月15日，公司宣布退市。`,
  `2023年8月初，多地居民反映自来水出现异味。8月5日，当地环保部门介入检测。8月8日，检测结果显示部分指标超标。8月12日，市政府召开新闻发布会通报情况。8月20日，涉事企业被责令停产整顿。9月1日，新的供水方案启用。`,
  `3天前，某明星工作室发布声明称已起诉造谣者。昨天，有媒体曝光了法院传票。今天凌晨，该明星本人首次公开回应，表示将追究到底。`,
]

// ===== 日期提取（保留原有 regex 实现，作为 LLM 不可用时的 fallback） =====

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
    // 今天 / 昨天 / 前天
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

// 从原文按 regex 提取 → 转换为 TimelineNode[]
function buildFromRegex(text: string): TimelineNode[] {
  const dates = extractDates(text)
  if (dates.length === 0) return []

  dates.sort((a, b) => a.index - b.index)

  const sentences = text.split(/(?<=[。！？；\n])/).filter(s => s.trim())
  const nodes: TimelineNode[] = []

  for (const sentence of sentences) {
    const trimmed = sentence.trim()
    if (!trimmed) continue

    const sentenceDates = dates.filter(d => trimmed.includes(d.raw))
    if (sentenceDates.length === 0) continue

    const dateMatch = sentenceDates[0]
    const eventText = trimmed.replace(dateMatch.raw, '').replace(/^[，,、\s]+/, '').trim()
    if (eventText.length > 2) {
      nodes.push({
        id: `ev-${dateMatch.index}`,
        date: dateMatch.raw,
        sortKey: dateMatch.sortKey,
        label: eventText,
        detail: trimmed,
        sources: ['用户输入文本'],
        status: 'unverified',
      })
    }
  }

  nodes.sort((a, b) => (a.sortKey || 0) - (b.sortKey || 0))
  return nodes
}

// LLM 调用：解析 LLM 返回的 JSON 节点
function parseLLMResponse(raw: string): TimelineNode[] {
  // 容忍 ```json 包裹 / 前后多余文字
  let cleaned = raw.trim()
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) cleaned = fenceMatch[1].trim()

  // 找到第一个 [ 到最后一个 ]
  const start = cleaned.indexOf('[')
  const end = cleaned.lastIndexOf(']')
  if (start === -1 || end === -1 || end <= start) return []
  const jsonStr = cleaned.slice(start, end + 1)

  try {
    const parsed = JSON.parse(jsonStr)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((n: unknown): n is Record<string, unknown> => !!n && typeof n === 'object')
      .map((n, i) => {
        const status = (n.status as string) as TimelineNodeStatus
        const validStatus: TimelineNodeStatus =
          status === 'confirmed' || status === 'disputed' || status === 'unverified'
            ? status
            : 'unverified'
        const sources = Array.isArray(n.sources) ? n.sources.map(String) : undefined
        return {
          id: `llm-${i}`,
          date: String(n.date ?? ''),
          label: String(n.label ?? n.title ?? ''),
          detail: n.detail ? String(n.detail) : n.summary ? String(n.summary) : undefined,
          sources,
          status: validStatus,
        } as TimelineNode
      })
      .filter(n => n.date && n.label)
  } catch {
    return []
  }
}

// 调用 LLM 生成时间线
async function generateWithLLM(text: string): Promise<TimelineNode[]> {
  const systemPrompt = `你是一个时间线分析助手。从用户提供的文本中提取关键时间节点，按时间先后顺序输出。
要求：
1. 输出 JSON 数组，每个元素包含字段：date(日期文本)、label(事件标题，10-20字)、detail(详情，30-80字)、sources(信息来源数组)、status(节点状态："confirmed"已证实/"disputed"有争议/"unverified"未证实)
2. 仅输出 JSON，不要任何额外文字、不要 markdown 代码块
3. 若文本无明显时间节点，输出空数组 []`

  const userPrompt = `请提取以下文本的时间线节点：\n\n${text}`
  const reply = await callLLM(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { maxTokens: 2048, temperature: 0.3 }
  )
  return parseLLMResponse(reply)
}

// 将任意来源的节点合并去重（多源合并展示）
function mergeMultiSource(nodes: TimelineNode[]): TimelineNode[] {
  if (nodes.length < 2) return nodes
  const merged: TimelineNode[] = []
  const used = new Set<number>()
  for (let i = 0; i < nodes.length; i++) {
    if (used.has(i)) continue
    const cur = { ...nodes[i] }
    for (let j = i + 1; j < nodes.length; j++) {
      if (used.has(j)) continue
      const other = nodes[j]
      // 同日期同标签视作多源
      if (cur.date === other.date && cur.label === other.label) {
        cur.multiSource = true
        const curSrc = cur.sources || []
        const otherSrc = other.sources || []
        const allSrc = Array.from(new Set([...curSrc, ...otherSrc]))
        cur.sources = allSrc.length > 0 ? allSrc : cur.sources
        used.add(j)
      }
    }
    merged.push(cur)
  }
  return merged
}

// 生成时间线快照（用于发布到社区）
function buildSnapshotText(nodes: TimelineNode[], source: string): string {
  if (nodes.length === 0) return source
  const lines = nodes.map((n, i) => {
    const statusLabel =
      n.status === 'confirmed' ? '[已证实]'
      : n.status === 'disputed' ? '[有争议]'
      : '[未证实]'
    const multiTag = n.multiSource ? ' [多源]' : ''
    const detail = n.detail ? `\n  ${n.detail}` : ''
    const sources = n.sources && n.sources.length > 0 ? `\n  来源：${n.sources.join('、')}` : ''
    return `${i + 1}. ${n.date} ${statusLabel}${multiTag} ${n.label}${detail}${sources}`
  })
  return `【时间线快照】\n${lines.join('\n\n')}\n\n原文摘录：${source.slice(0, 200)}`
}

// ===== 组件 =====

export default function TimelineBuilder() {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const llmConfig = useLLMStore(s => s.config)
  const hasLLM = !!llmConfig.apiKey

  const [input, setInput] = useState('')
  const [state, setState] = useState<AnalysisState>('idle')
  const [result, setResult] = useState<BuildResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<TimelineTemplate['type'] | null>(null)

  const canGenerate = input.trim().length > 0 && state !== 'analyzing'

  const handleAnalyze = useCallback(async () => {
    if (!input.trim() || state === 'analyzing') return
    setState('analyzing')
    setError(null)
    setResult(null)

    // 优先尝试 LLM
    if (hasLLM) {
      try {
        const llmNodes = await generateWithLLM(input)
        if (llmNodes.length > 0) {
          const merged = mergeMultiSource(llmNodes)
          setResult({ nodes: merged, method: 'llm' })
          setState('done')
          return
        }
        // LLM 返回空 → 降级到 regex
      } catch (e) {
        // LLM 失败 → 降级到 regex，记录错误
        setError(e instanceof Error ? e.message : String(e))
      }
    }

    // 模拟分析延迟（让用户看到 loading）
    await new Promise(r => setTimeout(r, 600))

    // 尝试 regex 提取
    const regexNodes = buildFromRegex(input)
    if (regexNodes.length > 0) {
      const merged = mergeMultiSource(regexNodes)
      const warning = hasLLM
        ? 'LLM 暂不可用，已使用本地正则提取'
        : '未配置 LLM，已使用本地正则提取'
      setResult({ nodes: merged, method: 'regex', warning })
      setState('done')
      return
    }

    // regex 也找不到 → 用模板匹配
    const tpl = matchTimelineTemplate(input)
    const warning = hasLLM
      ? `文本未识别到具体日期，已使用「${tpl.label}」模板`
      : `未配置 LLM 且文本未识别到日期，已使用「${tpl.label}」模板`
    setResult({
      nodes: tpl.nodes,
      method: 'template',
      templateType: tpl.type,
      warning,
    })
    setSelectedTemplate(tpl.type)
    setState('done')
  }, [input, state, hasLLM])

  // 手动选择模板
  const handleSelectTemplate = useCallback((tpl: TimelineTemplate) => {
    setState('analyzing')
    setError(null)
    setTimeout(() => {
      setResult({
        nodes: tpl.nodes,
        method: 'template',
        templateType: tpl.type,
        warning: `已套用「${tpl.label}」模板`,
      })
      setSelectedTemplate(tpl.type)
      setState('done')
    }, 400)
  }, [])

  const handleReset = () => {
    setInput('')
    setResult(null)
    setState('idle')
    setError(null)
    setSelectedTemplate(null)
  }

  const handlePublishToCommunity = () => {
    if (!result || result.nodes.length === 0) return
    const snapshot = buildSnapshotText(result.nodes, input)
    const title = input.trim().slice(0, 30) || '时间线讨论'
    navigate('/publish', {
      state: {
        prefillTitle: `【时间线】${title}`,
        prefillContent: snapshot,
        prefillTags: ['时间线', '观微观察'],
        prefillCategory: 'hot',
      },
    })
  }

  const containerClass = isDesktop ? 'max-w-3xl mx-auto w-full' : ''

  const methodLabel = useMemo(() => {
    if (!result) return null
    if (result.method === 'llm') return { text: 'LLM 生成', icon: Sparkles, color: 'text-bamboo' }
    if (result.method === 'regex') return { text: '本地正则', icon: Hash, color: 'text-seal' }
    if (result.method === 'template') return { text: '模板套用', icon: Wand2, color: 'text-gold-600' }
    return null
  }, [result])

  return (
    <div className="flex flex-col min-h-full bg-paper-texture">
      {/* 顶部导航 */}
      <div className={`px-5 pt-4 pb-2 flex items-center gap-3 ${containerClass}`}>
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 -ml-1.5 rounded-lg hover:bg-paper-dark transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-seal/40"
          aria-label="返回"
        >
          <ArrowLeft size={20} className="text-ink-700" />
        </button>
        <div className="flex-1">
          <h1 className={`${isDesktop ? 'text-xl' : 'text-[16px]'} font-bold text-ink-900`}>时间线重建</h1>
          <p className="text-[11px] text-ink-400">从混乱信息中提取事件脉络</p>
        </div>
        {state === 'done' && (
          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg hover:bg-paper-dark transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-seal/40"
            aria-label="重置"
          >
            <RefreshCw size={16} className="text-ink-500" />
          </button>
        )}
      </div>

      <div className={`flex-1 px-5 pb-6 overflow-y-auto ${containerClass}`}>
        {/* ===== 输入状态 ===== */}
        {state === 'idle' && (
          <div className="animate-fade-in-up space-y-4">
            <div className="bg-surface rounded-2xl shadow-card p-4">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="粘贴一段新闻、事件描述或聊天记录...&#10;&#10;工具会自动提取其中的时间节点，按时间顺序排列成事件脉络。&#10;&#10;支持格式：2024年1月15日、2024-01-15、3天前、昨天..."
                rows={6}
                className="w-full text-[14px] text-ink-900 placeholder:text-ink-400 resize-none leading-relaxed focus:outline-none"
                aria-label="时间线文本输入"
              />
              <button
                onClick={handleAnalyze}
                disabled={!canGenerate}
                className="w-full py-3.5 rounded-xl bg-amber-600 text-white font-semibold text-[14px] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed mt-2 hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 motion-reduce:transition-none"
              >
                <GitBranch size={16} />
                {hasLLM ? 'LLM 重建时间线' : '重建时间线'}
                {hasLLM && <Sparkles size={12} className="opacity-80" />}
              </button>
              {/* 空输入防护提示 */}
              {!input.trim() && (
                <p className="text-[11px] text-ink-400 mt-2 text-center">
                  请输入事件描述后再生成时间线
                </p>
              )}
            </div>

            {/* 快速选择模板 */}
            <div>
              <p className="text-[12px] text-ink-400 font-medium mb-2 flex items-center gap-1.5">
                <Wand2 size={12} />
                或直接套用模板：
              </p>
              <div className="space-y-2">
                {TIMELINE_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.type}
                    onClick={() => handleSelectTemplate(tpl)}
                    className="w-full text-left p-3 bg-surface rounded-xl shadow-card text-[12px] hover:shadow-card-hover transition-shadow active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-ink-800">{tpl.label}</span>
                      <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                        {tpl.nodes.length} 节点
                      </span>
                    </div>
                    <p className="text-[11px] text-ink-500">{tpl.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 示例 */}
            <div>
              <p className="text-[12px] text-ink-400 font-medium mb-2">试试这些例子：</p>
              <div className="space-y-2">
                {EXAMPLE_TEXTS.map((text, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(text)}
                    className="w-full text-left p-3 bg-surface rounded-xl shadow-card text-[12px] text-ink-500 leading-relaxed line-clamp-2 hover:shadow-card-hover transition-shadow active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40"
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
                  { icon: Sparkles, text: hasLLM ? '已配置 LLM，优先调用大模型提取节点' : 'LLM 未配置，将使用本地正则 + 模板降级', highlight: hasLLM },
                  { icon: Hash, text: '本地正则识别多种日期格式（年月日/相对时间）' },
                  { icon: Wand2, text: '无日期时套用预设模板（产品/人物/争议）' },
                  { icon: GitBranch, text: '可视化时间线，节点可展开查看详情' },
                ].map((step, i) => {
                  const StepIcon = step.icon
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${step.highlight ? 'bg-bamboo-50' : 'bg-amber-50'}`}>
                        <StepIcon size={13} className={step.highlight ? 'text-bamboo' : 'text-amber-600'} />
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
              <div className="w-12 h-12 rounded-full border-2 border-amber-300/30 border-t-amber-600 animate-spin motion-reduce:animate-none" />
              <div className="text-center">
                <p className="text-[14px] text-ink-700 font-medium">正在提取时间节点...</p>
                <p className="text-[11px] text-ink-400 mt-1">
                  {hasLLM ? 'LLM 分析中 · 解析事件 · 排序重组' : '识别日期 · 解析事件 · 排序重组'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ===== 结果 ===== */}
        {state === 'done' && result && (
          <div className="animate-fade-in-up space-y-4">
            {result.nodes.length === 0 ? (
              <div className="bg-surface rounded-2xl shadow-card p-8 flex flex-col items-center gap-3">
                <AlertCircle size={32} className="text-ink-300" />
                <p className="text-[14px] text-ink-500 font-medium">未检测到时间节点</p>
                <p className="text-[12px] text-ink-400 text-center">
                  文本中没有找到可识别的日期格式。<br />
                  请确保包含具体日期，或直接套用上方模板。
                </p>
                <button
                  onClick={handleReset}
                  className="mt-2 px-4 py-2 rounded-xl bg-paper-dark text-[12px] text-ink-500 font-medium active:scale-[0.97] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-seal/40"
                >
                  重新输入
                </button>
              </div>
            ) : (
              <>
                {/* 统计与状态 */}
                <div className="bg-surface rounded-2xl shadow-card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-amber-600" />
                    <span className="text-[13px] text-ink-700 font-semibold">时间线</span>
                    {methodLabel && (
                      <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium bg-paper-dark ${methodLabel.color}`}>
                        <methodLabel.icon size={10} />
                        {methodLabel.text}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[12px] text-ink-400">{result.nodes.length} 个节点</span>
                  </div>
                </div>

                {/* 降级提示 */}
                {result.warning && (
                  <div className="bg-amber-50/60 border border-amber-200/50 rounded-xl p-3 flex items-start gap-2">
                    <AlertTriangle size={13} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-[11.5px] text-amber-800 leading-relaxed">{result.warning}</p>
                  </div>
                )}

                {/* LLM 错误提示 */}
                {error && (
                  <div className="bg-seal-50 border border-seal/20 rounded-xl p-3 flex items-start gap-2">
                    <AlertCircle size={13} className="text-seal flex-shrink-0 mt-0.5" />
                    <p className="text-[11.5px] text-seal leading-relaxed">
                      LLM 调用失败：{error}。已自动降级到本地模式。
                    </p>
                  </div>
                )}

                {/* 时间线可视化（复用 EvidenceTimeline） */}
                <div className="bg-surface rounded-2xl shadow-card overflow-hidden">
                  <EvidenceTimeline
                    nodes={result.nodes}
                    title="事件时间线"
                    defaultExpanded={true}
                    expandable={true}
                    theme="hot"
                  />
                </div>

                {/* 模板切换器（仅 template 模式显示） */}
                {result.method === 'template' && (
                  <div className="bg-surface rounded-2xl shadow-card p-3">
                    <p className="text-[11px] text-ink-400 font-medium mb-2 flex items-center gap-1.5">
                      <Wand2 size={11} />
                      切换模板
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {TIMELINE_TEMPLATES.map((tpl) => {
                        const active = selectedTemplate === tpl.type
                        return (
                          <button
                            key={tpl.type}
                            onClick={() => handleSelectTemplate(tpl)}
                            className={`p-2 rounded-lg text-[11px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40 ${
                              active
                                ? 'bg-amber-600 text-white shadow-sm'
                                : 'bg-paper-dark text-ink-600 hover:bg-paper-200'
                            }`}
                          >
                            {tpl.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 时间跨度（仅当节点带 sortKey 时显示） */}
                {result.nodes.length >= 2 && result.nodes[0].sortKey && result.nodes[result.nodes.length - 1].sortKey && (
                  <div className="bg-amber-50/50 border border-amber-200/30 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[12px] text-amber-800 font-medium">时间跨度</p>
                      <p className="text-[11px] text-amber-600 mt-0.5">
                        {formatDate(result.nodes[0].sortKey!)} → {formatDate(result.nodes[result.nodes.length - 1].sortKey!)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[18px] font-bold text-amber-700">
                        {Math.max(1, Math.round((result.nodes[result.nodes.length - 1].sortKey! - result.nodes[0].sortKey!) / 86400000))}
                      </p>
                      <p className="text-[10px] text-amber-500">天</p>
                    </div>
                  </div>
                )}

                {/* 发布为热点讨论 */}
                <button
                  onClick={handlePublishToCommunity}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#F97316] to-[#EF4444] text-white font-semibold text-[14px] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/50 motion-reduce:transition-none"
                >
                  <Send size={15} />
                  发布为热点讨论
                </button>

                <div className="text-center py-3">
                  <p className="text-[9px] text-ink-400 leading-relaxed">
                    时间线基于{result.method === 'llm' ? '大模型分析' : result.method === 'regex' ? '文本中的日期信息' : '预设模板'}自动生成<br />
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
