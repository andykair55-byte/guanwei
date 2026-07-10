import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, RefreshCw, FileText, BarChart3, AlertTriangle,
  CheckCircle, ChevronDown, ChevronUp, Copy, ArrowRight,
} from 'lucide-react'
import { useIsDesktop } from '../hooks/useIsDesktop'



// ===== 类型 =====

interface SentenceMatch {
  sentence: string
  bestMatch: string | null
  similarity: number    // 0-1
  level: 'high' | 'medium' | 'low' | 'none'
}

interface PlagiarismResult {
  overallScore: number       // 0-100
  level: 'high' | 'medium' | 'low'
  sentenceMatches: SentenceMatch[]
  matchedSentences: number
  totalSentences: number
  wordOverlap: number        // 词汇重叠率
  structureSimilarity: number // 结构相似度
  summary: string
}

type AnalysisState = 'idle' | 'analyzing' | 'done'

// ===== 示例 =====

const EXAMPLE_PAIRS = [
  {
    label: '示例：新闻洗稿',
    original: '据央视新闻报道，2024年3月15日，国务院发布了一项关于数字经济发展的新政策。该政策明确提出要在五年内将数字经济占GDP的比重提升至50%以上。业内专家表示，这一目标体现了国家对数字经济的高度重视，也将为相关产业链带来巨大的发展机遇。',
    suspected: '最新消息，国务院近日出台了数字经济发展规划。根据这份文件，未来五年内数字经济在国民经济中的占比要超过一半。分析人士认为，这充分说明高层对数字经济的重视程度前所未有，相关领域将迎来黄金发展期。',
  },
  {
    label: '示例：论文改写',
    original: '本研究采用定量分析方法，通过对500名大学生进行问卷调查，探讨了社交媒体使用时长与学业成绩之间的关系。研究结果表明，每日使用社交媒体超过3小时的学生，其平均绩点显著低于使用时长在1小时以内的学生群体。',
    suspected: '本文以500名高校学生为样本，运用量化研究手段，考察了社交平台使用时间与学习成绩之间的关联性。数据显示，每天刷社交媒体超过三个小时的同学，GPA明显低于每天使用不超过一小时的同学。',
  },
]

// ===== 分析算法 =====

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[。！？；\n.!?;])/)
    .map(s => s.trim())
    .filter(s => s.length > 2)
}

function getNgrams(text: string, n: number): Set<string> {
  const ngrams = new Set<string>()
  const cleaned = text.replace(/\s+/g, '')
  for (let i = 0; i <= cleaned.length - n; i++) {
    ngrams.add(cleaned.slice(i, i + n))
  }
  return ngrams
}

function jaccardSimilarity(a: string, b: string): number {
  if (!a || !b) return 0
  const ngramsA = getNgrams(a, 2)
  const ngramsB = getNgrams(b, 2)
  if (ngramsA.size === 0 || ngramsB.size === 0) return 0

  let intersection = 0
  for (const ng of ngramsA) {
    if (ngramsB.has(ng)) intersection++
  }
  const union = ngramsA.size + ngramsB.size - intersection
  return union === 0 ? 0 : intersection / union
}

function wordOverlap(a: string, b: string): number {
  const wordsA = new Set(a.replace(/[^\u4e00-\u9fa5a-zA-Z]/g, '').split('').filter(w => w))
  const wordsB = new Set(b.replace(/[^\u4e00-\u9fa5a-zA-Z]/g, '').split('').filter(w => w))
  if (wordsA.size === 0 || wordsB.size === 0) return 0

  let intersection = 0
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++
  }
  return intersection / Math.min(wordsA.size, wordsB.size)
}

function analyzePlagiarism(original: string, suspected: string): PlagiarismResult {
  const sentencesA = splitSentences(original)
  const sentencesB = splitSentences(suspected)

  if (sentencesB.length === 0) {
    return {
      overallScore: 0,
      level: 'low',
      sentenceMatches: [],
      matchedSentences: 0,
      totalSentences: 0,
      wordOverlap: 0,
      structureSimilarity: 0,
      summary: '未检测到有效句子',
    }
  }

  // 逐句匹配
  const sentenceMatches: SentenceMatch[] = sentencesB.map(sentence => {
    let bestScore = 0
    let bestMatch: string | null = null

    for (const sentA of sentencesA) {
      const charSim = jaccardSimilarity(sentence, sentA)
      const wSim = wordOverlap(sentence, sentA)
      const combined = charSim * 0.6 + wSim * 0.4
      if (combined > bestScore) {
        bestScore = combined
        bestMatch = sentA
      }
    }

    const level: SentenceMatch['level'] =
      bestScore >= 0.7 ? 'high' :
      bestScore >= 0.4 ? 'medium' :
      bestScore >= 0.2 ? 'low' : 'none'

    return { sentence, bestMatch, similarity: bestScore, level }
  })

  // 统计
  const matchedSentences = sentenceMatches.filter(s => s.level !== 'none').length
  const avgSimilarity = sentenceMatches.reduce((sum, s) => sum + s.similarity, 0) / sentenceMatches.length

  // 全文词汇重叠
  const fullWordOverlap = wordOverlap(original, suspected)

  // 结构相似度（句子数量比例 + 平均句长相似度）
  const lenRatio = Math.min(sentencesA.length, sentencesB.length) / Math.max(sentencesA.length, sentencesB.length)
  const avgLenA = original.length / Math.max(sentencesA.length, 1)
  const avgLenB = suspected.length / Math.max(sentencesB.length, 1)
  const lenSim = 1 - Math.abs(avgLenA - avgLenB) / Math.max(avgLenA, avgLenB)
  const structureSim = (lenRatio + lenSim) / 2

  // 综合评分
  const overallScore = Math.round(
    avgSimilarity * 50 +
    fullWordOverlap * 30 +
    structureSim * 20
  )

  const level: PlagiarismResult['level'] =
    overallScore >= 60 ? 'high' :
    overallScore >= 35 ? 'medium' : 'low'

  const summary =
    level === 'high'
      ? '两篇文本高度相似，存在明显的洗稿/抄袭嫌疑。句式结构、用词和论述逻辑高度重合。'
      : level === 'medium'
      ? '两篇文本存在一定程度的相似性，部分内容有改写痕迹，建议进一步比对。'
      : '两篇文本相似度较低，未发现明显的洗稿痕迹。'

  return {
    overallScore,
    level,
    sentenceMatches,
    matchedSentences,
    totalSentences: sentencesB.length,
    wordOverlap: Math.round(fullWordOverlap * 100),
    structureSimilarity: Math.round(structureSim * 100),
    summary,
  }
}

// ===== 颜色映射 =====

const levelColors = {
  high: { bg: 'bg-seal/10', text: 'text-seal', border: 'border-seal/25', label: '高度相似' },
  medium: { bg: 'bg-gold/10', text: 'text-gold', border: 'border-gold/25', label: '部分相似' },
  low: { bg: 'bg-bamboo/10', text: 'text-bamboo', border: 'border-bamboo/25', label: '低相似' },
  none: { bg: 'bg-paper-dark/50', text: 'text-ink-400', border: 'border-line/20', label: '无匹配' },
}

// ===== 组件 =====

export default function PlagiarismChecker() {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const [original, setOriginal] = useState('')
  const [suspected, setSuspected] = useState('')
  const [result, setResult] = useState<PlagiarismResult | null>(null)
  const [state, setState] = useState<AnalysisState>('idle')
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ detail: true, stats: true })

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleAnalyze = useCallback(() => {
    if (!original.trim() || !suspected.trim() || state === 'analyzing') return
    setState('analyzing')
    setResult(null)

    setTimeout(() => {
      const res = analyzePlagiarism(original, suspected)
      setResult(res)
      setState('done')
    }, 600)
  }, [original, suspected, state])

  const handleReset = () => {
    setOriginal('')
    setSuspected('')
    setResult(null)
    setState('idle')
  }

  const loadExample = (pair: typeof EXAMPLE_PAIRS[0]) => {
    setOriginal(pair.original)
    setSuspected(pair.suspected)
  }

  return (
    <div className="flex flex-col min-h-full bg-paper-texture">
      {/* 顶部导航 */}
      <div className={`px-5 pt-4 pb-2 flex items-center gap-3 ${isDesktop ? 'max-w-3xl mx-auto w-full' : ''}`}>
        <button onClick={() => navigate(-1)} className="p-1.5 -ml-1.5 rounded-lg hover:bg-paper-dark transition-colors active:scale-95">
          <ArrowLeft size={20} className="text-ink-700" />
        </button>
        <div className="flex-1">
          <h1 className={`${isDesktop ? 'text-xl' : 'text-[16px]'} font-bold text-ink-900`}>洗稿检测</h1>
          <p className="text-[11px] text-ink-400">语义相似度比对，识别改写痕迹</p>
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
            {/* 原文 */}
            <div className="bg-surface rounded-2xl shadow-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-bamboo/10 flex items-center justify-center">
                  <FileText size={12} className="text-bamboo" />
                </div>
                <span className="text-[12px] text-ink-700 font-semibold">原文</span>
              </div>
              <textarea
                value={original}
                onChange={(e) => setOriginal(e.target.value)}
                placeholder="粘贴原始文章内容..."
                rows={5}
                className="w-full text-[13px] text-ink-900 placeholder:text-ink-400 resize-none leading-relaxed"
              />
            </div>

            {/* 箭头 */}
            <div className="flex justify-center">
              <div className="w-8 h-8 rounded-full bg-violet-50 flex items-center justify-center">
                <ArrowRight size={14} className="text-violet-500 rotate-90" />
              </div>
            </div>

            {/* 疑似洗稿 */}
            <div className="bg-surface rounded-2xl shadow-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-seal/10 flex items-center justify-center">
                  <Copy size={12} className="text-seal" />
                </div>
                <span className="text-[12px] text-ink-700 font-semibold">疑似洗稿</span>
              </div>
              <textarea
                value={suspected}
                onChange={(e) => setSuspected(e.target.value)}
                placeholder="粘贴疑似抄袭/改写的文章..."
                rows={5}
                className="w-full text-[13px] text-ink-900 placeholder:text-ink-400 resize-none leading-relaxed"
              />
            </div>

            {/* 检测按钮 */}
            <button
              onClick={handleAnalyze}
              disabled={!original.trim() || !suspected.trim()}
              className="w-full py-3.5 rounded-xl bg-violet-600 text-white font-semibold text-[14px] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <BarChart3 size={16} />
              开始比对
            </button>

            {/* 示例 */}
            <div>
              <p className="text-[12px] text-ink-400 font-medium mb-2">试试这些例子：</p>
              <div className="space-y-2">
                {EXAMPLE_PAIRS.map((pair, i) => (
                  <button
                    key={i}
                    onClick={() => loadExample(pair)}
                    className="w-full text-left p-3 bg-surface rounded-xl shadow-card text-[12px] text-ink-500 hover:shadow-card-hover transition-shadow active:scale-[0.99]"
                  >
                    {pair.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== 分析中 ===== */}
        {state === 'analyzing' && (
          <div className="animate-fade-in-up">
            <div className="bg-surface rounded-2xl shadow-card p-6 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 rounded-full border-2 border-violet-300/30 border-t-violet-600 animate-spin" />
              <div className="text-center">
                <p className="text-[14px] text-ink-700 font-medium">正在比对文本...</p>
                <p className="text-[11px] text-ink-400 mt-1">逐句匹配 · 语义分析 · 结构对比</p>
              </div>
            </div>
          </div>
        )}

        {/* ===== 结果 ===== */}
        {state === 'done' && result && (
          <div className="space-y-3 animate-fade-in-up">
            {/* 总分 */}
            <div className="bg-surface rounded-2xl shadow-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} className="text-ink-500" />
                  <span className="text-[13px] text-ink-700 font-semibold">相似度</span>
                </div>
                <span className={`text-[20px] font-bold ${
                  result.level === 'high' ? 'text-seal' : result.level === 'medium' ? 'text-gold' : 'text-bamboo'
                }`}>
                  {result.overallScore}%
                </span>
              </div>
              <div className="h-2.5 bg-paper-dark rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    result.level === 'high' ? 'bg-seal' : result.level === 'medium' ? 'bg-gold' : 'bg-bamboo'
                  }`}
                  style={{ width: `${result.overallScore}%` }}
                />
              </div>
              <p className={`text-[11px] ${
                result.level === 'high' ? 'text-seal' : result.level === 'medium' ? 'text-gold' : 'text-bamboo'
              }`}>
                {result.summary}
              </p>
            </div>

            {/* 统计指标 */}
            <div className="bg-surface rounded-2xl shadow-card overflow-hidden">
              <button
                onClick={() => toggleSection('stats')}
                className="w-full px-4 py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <BarChart3 size={14} className="text-ink-500" />
                  <span className="text-[13px] text-ink-700 font-semibold">统计指标</span>
                </div>
                {expandedSections.stats
                  ? <ChevronUp size={14} className="text-ink-400" />
                  : <ChevronDown size={14} className="text-ink-400" />
                }
              </button>
              {expandedSections.stats && (
                <div className="px-4 pb-4 grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-paper-dark/60 rounded-xl">
                    <p className={`text-[18px] font-bold ${
                      result.level === 'high' ? 'text-seal' : result.level === 'medium' ? 'text-gold' : 'text-bamboo'
                    }`}>
                      {result.wordOverlap}%
                    </p>
                    <p className="text-[10px] text-ink-400 mt-1">词汇重叠</p>
                  </div>
                  <div className="text-center p-3 bg-paper-dark/60 rounded-xl">
                    <p className="text-[18px] font-bold text-violet-600">{result.structureSimilarity}%</p>
                    <p className="text-[10px] text-ink-400 mt-1">结构相似</p>
                  </div>
                  <div className="text-center p-3 bg-paper-dark/60 rounded-xl">
                    <p className="text-[18px] font-bold text-ink-700">
                      {result.matchedSentences}/{result.totalSentences}
                    </p>
                    <p className="text-[10px] text-ink-400 mt-1">匹配句数</p>
                  </div>
                </div>
              )}
            </div>

            {/* 逐句比对 */}
            <div className="bg-surface rounded-2xl shadow-card overflow-hidden">
              <button
                onClick={() => toggleSection('detail')}
                className="w-full px-4 py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-ink-500" />
                  <span className="text-[13px] text-ink-700 font-semibold">逐句比对</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                    result.matchedSentences > result.totalSentences / 2
                      ? 'text-seal bg-seal/10' : 'text-bamboo bg-bamboo/10'
                  }`}>
                    {result.matchedSentences} 句相似
                  </span>
                </div>
                {expandedSections.detail
                  ? <ChevronUp size={14} className="text-ink-400" />
                  : <ChevronDown size={14} className="text-ink-400" />
                }
              </button>
              {expandedSections.detail && (
                <div className="px-4 pb-4 space-y-3">
                  {result.sentenceMatches.map((match, i) => {
                    const colors = levelColors[match.level]
                    return (
                      <div key={i} className={`p-3 rounded-xl border ${colors.bg} ${colors.border}`}>
                        <div className="flex items-start gap-2 mb-2">
                          <div className="mt-0.5 flex-shrink-0">
                            {match.level === 'high' ? <AlertTriangle size={13} className={colors.text} /> :
                             match.level === 'medium' ? <AlertTriangle size={13} className={colors.text} /> :
                             match.level === 'low' ? <CheckCircle size={13} className={colors.text} /> :
                             <CheckCircle size={13} className={colors.text} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] text-ink-900 leading-relaxed">{match.sentence}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${colors.bg} ${colors.text}`}>
                                {colors.label}
                              </span>
                              <span className="text-[10px] text-ink-400">
                                {Math.round(match.similarity * 100)}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {match.bestMatch && match.level !== 'none' && (
                          <div className="ml-5 pl-3 border-l-2 border-ink-200/50">
                            <p className="text-[10px] text-ink-400 font-medium mb-0.5">对应原文：</p>
                            <p className="text-[11px] text-ink-500 leading-relaxed">{match.bestMatch}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 免责声明 */}
            <div className="text-center py-3">
              <p className="text-[9px] text-ink-400 leading-relaxed">
                本工具基于字符 n-gram 和词汇重叠进行相似度计算<br />
                结果仅供参考，不构成抄袭判定依据
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
