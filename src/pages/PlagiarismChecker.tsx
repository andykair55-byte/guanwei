import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, RefreshCw, Search, FileText, Copy, Sparkles,
  CheckCircle, AlertTriangle, XCircle, Layers,
} from 'lucide-react'
import { useIsDesktop } from '../hooks/useIsDesktop'



// ===== 类型定义 =====

type AnalysisState = 'idle' | 'analyzing' | 'done'

interface Segment {
  text: string
  highlight: boolean
}

interface PresetSample {
  id: string
  label: string
  desc: string
  original: string
  check: string
  similarity: number
  // 将 original / check 按段切分，标记命中段
  originalSegments: Segment[]
  checkSegments: Segment[]
  hits: { originalFragment: string; checkFragment: string; similarity: number }[]
}

// ===== mock 预设样本 =====

const PRESETS: PresetSample[] = [
  {
    id: 'obvious',
    label: '明显洗稿',
    desc: '同义词替换 + 句式保留',
    similarity: 87,
    original:
      '这款新发布的折叠屏手机采用了航天级钛合金铰链，经过30万次折叠测试依然稳固耐用。屏幕分辨率为2560×1080，支持120Hz高刷新率，显示效果细腻流畅。内置5000mAh大电池，搭配65W快充技术，30分钟即可充满80%电量。',
    check:
      '全新推出的折叠屏设备使用了航天级钛金属铰链，历经30万次折叠验证依然结实耐久。屏幕分辨率达2560×1080，兼容120Hz高刷新率，画面呈现细腻顺滑。内置5000mAh大容量电池，配合65W快充方案，半小时就能充满80%电量。',
    originalSegments: [
      { text: '这款新发布的折叠屏手机采用了航天级钛合金铰链，经过30万次折叠测试依然稳固耐用。', highlight: true },
      { text: '屏幕分辨率为2560×1080，支持120Hz高刷新率，显示效果细腻流畅。', highlight: true },
      { text: '内置5000mAh大电池，搭配65W快充技术，30分钟即可充满80%电量。', highlight: true },
    ],
    checkSegments: [
      { text: '全新推出的折叠屏设备使用了航天级钛金属铰链，历经30万次折叠验证依然结实耐久。', highlight: true },
      { text: '屏幕分辨率达2560×1080，兼容120Hz高刷新率，画面呈现细腻顺滑。', highlight: true },
      { text: '内置5000mAh大容量电池，配合65W快充方案，半小时就能充满80%电量。', highlight: true },
    ],
    hits: [
      { originalFragment: '采用了航天级钛合金铰链，经过30万次折叠测试依然稳固耐用', checkFragment: '使用了航天级钛金属铰链，历经30万次折叠验证依然结实耐久', similarity: 92 },
      { originalFragment: '屏幕分辨率为2560×1080，支持120Hz高刷新率', checkFragment: '屏幕分辨率达2560×1080，兼容120Hz高刷新率', similarity: 95 },
      { originalFragment: '内置5000mAh大电池，搭配65W快充技术', checkFragment: '内置5000mAh大容量电池，配合65W快充方案', similarity: 88 },
      { originalFragment: '30分钟即可充满80%电量', checkFragment: '半小时就能充满80%电量', similarity: 81 },
    ],
  },
  {
    id: 'refined',
    label: '精修洗稿',
    desc: '重组结构 + 借用核心数据',
    similarity: 58,
    original:
      '近年来，城市露营文化在年轻人中悄然兴起。每到周末，城郊的营地便搭满了各式帐篷。这种"逃离城市"的微度假方式，让疲惫的打工人得以短暂放松。据统计，今年五一期间，全国露营地预订量同比增长210%。',
    check:
      '周末的城郊，一顶顶帐篷在草地上依次排开——这是当下年轻人钟爱的"微度假"方式。远离写字楼、回归自然，城市露营正成为新一代打工人的解压选择。数据显示，今年五一全国露营地订单同比翻了两倍多。',
    originalSegments: [
      { text: '近年来，城市露营文化在年轻人中悄然兴起。', highlight: false },
      { text: '每到周末，城郊的营地便搭满了各式帐篷。', highlight: true },
      { text: '这种"逃离城市"的微度假方式，让疲惫的打工人得以短暂放松。', highlight: true },
      { text: '据统计，今年五一期间，全国露营地预订量同比增长210%。', highlight: true },
    ],
    checkSegments: [
      { text: '周末的城郊，一顶顶帐篷在草地上依次排开——', highlight: true },
      { text: '这是当下年轻人钟爱的"微度假"方式。', highlight: true },
      { text: '远离写字楼、回归自然，城市露营正成为新一代打工人的解压选择。', highlight: true },
      { text: '数据显示，今年五一全国露营地订单同比翻了两倍多。', highlight: true },
    ],
    hits: [
      { originalFragment: '城郊的营地便搭满了各式帐篷', checkFragment: '城郊，一顶顶帐篷在草地上依次排开', similarity: 68 },
      { originalFragment: '"逃离城市"的微度假方式，让疲惫的打工人得以短暂放松', checkFragment: '城市露营正成为新一代打工人的解压选择', similarity: 61 },
      { originalFragment: '今年五一期间，全国露营地预订量同比增长210%', checkFragment: '今年五一全国露营地订单同比翻了两倍多', similarity: 74 },
    ],
  },
  {
    id: 'original',
    label: '原创',
    desc: '主题完全不同',
    similarity: 12,
    original:
      '这款新发布的折叠屏手机采用了航天级钛合金铰链，经过30万次折叠测试依然稳固耐用。屏幕分辨率为2560×1080，支持120Hz高刷新率，显示效果细腻流畅。',
    check:
      '今年的梅雨季节格外漫长，江南地区持续阴雨近一个月。农技专家提醒，水稻正处于分蘖期，长期寡照容易导致徒长，需及时排水晒田。部分低洼田块已出现轻度渍害，建议农户疏通沟渠，加强田间管理。',
    originalSegments: [
      { text: '这款新发布的折叠屏手机采用了航天级钛合金铰链，经过30万次折叠测试依然稳固耐用。', highlight: false },
      { text: '屏幕分辨率为2560×1080，支持120Hz高刷新率，显示效果细腻流畅。', highlight: false },
    ],
    checkSegments: [
      { text: '今年的梅雨季节格外漫长，江南地区持续阴雨近一个月。', highlight: false },
      { text: '农技专家提醒，水稻正处于分蘖期，长期寡照容易导致徒长，需及时排水晒田。', highlight: false },
      { text: '部分低洼田块已出现轻度渍害，建议农户疏通沟渠，加强田间管理。', highlight: false },
    ],
    hits: [
      { originalFragment: '30万次', checkFragment: '近一个月', similarity: 18 },
    ],
  },
]

// ===== 辅助函数 =====

function getSimilarityLevel(p: number): { color: string; bg: string; label: string; icon: React.ComponentType<{ size?: number; className?: string }> } {
  if (p >= 70) return { color: 'text-seal', bg: 'bg-seal', label: '高度疑似洗稿', icon: XCircle }
  if (p >= 40) return { color: 'text-gold', bg: 'bg-gold', label: '存在洗稿嫌疑', icon: AlertTriangle }
  return { color: 'text-bamboo', bg: 'bg-bamboo', label: '基本原创', icon: CheckCircle }
}

// SVG 环形进度
function RingProgress({ percent, size = 120, stroke = 9 }: { percent: number; size?: number; stroke?: number }) {
  const radius = (size - stroke) / 2
  const circ = 2 * Math.PI * radius
  const offset = circ * (1 - percent / 100)
  const level = getSimilarityLevel(percent)
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-paper-dark"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className={level.color}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-[22px] font-bold ${level.color}`}>{percent}<span className="text-[11px] text-ink-faint font-normal">%</span></span>
        <span className="text-[9px] text-ink-faint mt-0.5">相似度</span>
      </div>
    </div>
  )
}

// ===== 组件 =====

export default function PlagiarismChecker() {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const [original, setOriginal] = useState('')
  const [check, setCheck] = useState('')
  const [state, setState] = useState<AnalysisState>('idle')
  const [result, setResult] = useState<PresetSample | null>(null)

  const handleDetect = useCallback(async () => {
    if ((!original.trim() || !check.trim()) || state === 'analyzing') return
    setState('analyzing')
    setResult(null)
    // demo：根据文本长度比值在三个预设里"猜"一个，让用户每次点不同预设得到对应结果
    let matched: PresetSample = PRESETS[0]
    for (const p of PRESETS) {
      if (p.original === original.trim() && p.check === check.trim()) {
        matched = p
        break
      }
    }
    await new Promise(r => setTimeout(r, 2000))
    setResult(matched)
    setState('done')
  }, [original, check, state])

  const handleReset = () => {
    setOriginal('')
    setCheck('')
    setResult(null)
    setState('idle')
  }

  const handlePreset = (p: PresetSample) => {
    setOriginal(p.original)
    setCheck(p.check)
    setResult(null)
    setState('idle')
  }

  const canDetect = original.trim().length > 0 && check.trim().length > 0

  // ===== 渲染 =====

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-paper-texture">
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
          <div className="animate-fade-in-up space-y-4 mt-2">
            {/* 预设样本 */}
            <div>
              <p className="text-[12px] text-ink-400 font-medium mb-2 flex items-center gap-1.5">
                <Sparkles size={12} className="text-seal/70" />
                快速试用预设样本
              </p>
              <div className="grid grid-cols-3 gap-2">
                {PRESETS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handlePreset(p)}
                    className={`p-2.5 rounded-xl border text-center transition-all active:scale-[0.97] ${
                      original === p.original && check === p.check
                        ? 'border-seal bg-seal/5'
                        : 'border-line/60 bg-surface hover:border-seal/30 hover:bg-paper-dark/30'
                    }`}
                  >
                    <p className="text-[12px] text-ink-900 font-medium">{p.label}</p>
                    <p className="text-[9px] text-ink-faint mt-0.5 leading-tight">{p.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 双输入框 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-surface rounded-2xl border border-line/60 p-3 space-y-2">
                <label className="text-[11px] text-ink-700 font-medium flex items-center gap-1.5">
                  <FileText size={11} className="text-bamboo" />
                  原文文本
                </label>
                <textarea
                  value={original}
                  onChange={e => setOriginal(e.target.value)}
                  placeholder="粘贴原文..."
                  rows={6}
                  className="w-full bg-paper-dark/40 rounded-xl p-2.5 text-[12px] text-ink-900 placeholder:text-ink-faint outline-none border border-line/40 focus:border-seal/40 focus:bg-paper-dark/20 resize-none transition-all leading-relaxed"
                />
                <p className="text-[9px] text-ink-faint text-right">{original.length} 字</p>
              </div>
              <div className="bg-surface rounded-2xl border border-line/60 p-3 space-y-2">
                <label className="text-[11px] text-ink-700 font-medium flex items-center gap-1.5">
                  <Copy size={11} className="text-seal" />
                  待检测文本
                </label>
                <textarea
                  value={check}
                  onChange={e => setCheck(e.target.value)}
                  placeholder="粘贴待检测文本..."
                  rows={6}
                  className="w-full bg-paper-dark/40 rounded-xl p-2.5 text-[12px] text-ink-900 placeholder:text-ink-faint outline-none border border-line/40 focus:border-seal/40 focus:bg-paper-dark/20 resize-none transition-all leading-relaxed"
                />
                <p className="text-[9px] text-ink-faint text-right">{check.length} 字</p>
              </div>
            </div>

            <button
              onClick={handleDetect}
              disabled={!canDetect}
              className="w-full py-2.5 rounded-xl bg-seal text-white text-[13px] font-medium flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-seal-light transition-colors active:scale-[0.98]"
            >
              <Search size={14} />
              开始检测
            </button>

            <div className="bg-paper-dark/40 rounded-xl p-3 border border-line/40">
              <p className="text-[11px] text-ink-500 leading-relaxed flex items-start gap-1.5">
                <Layers size={12} className="text-seal/60 flex-shrink-0 mt-0.5" />
                <span>本工具对两段文本进行语义比对，识别同义改写、句式重构等洗稿手法，输出相似度评分与命中段落。<br/><span className="text-ink-faint">（演示版本：使用硬编码 mock 数据，建议点击预设样本体验）</span></span>
              </p>
            </div>
          </div>
        )}

        {/* ===== 分析中状态 ===== */}
        {state === 'analyzing' && (
          <div className="mt-4 animate-fade-in-up">
            <div className="bg-surface rounded-2xl border border-line p-6 flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full border-2 border-seal/30 border-t-seal animate-spin" />
              <p className="text-sm text-ink-700 font-medium">正在比对文本语义...</p>
              <p className="text-[10px] text-ink-faint">分词 → 向量化 → 段落对齐 → 相似度计算</p>
            </div>
          </div>
        )}

        {/* ===== 结果状态 ===== */}
        {state === 'done' && result && (
          <div className="mt-2 space-y-3 animate-fade-in-up">
            {/* 相似度仪表盘 */}
            <div className="bg-surface rounded-2xl border border-line p-4 flex flex-col items-center gap-3">
              <RingProgress percent={result.similarity} />
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${getSimilarityLevel(result.similarity).color} bg-white/50`}>
                {(() => {
                  const lvl = getSimilarityLevel(result.similarity)
                  const Icon = lvl.icon
                  return <Icon size={12} />
                })()}
                <span className="text-[11px] font-medium">{getSimilarityLevel(result.similarity).label}</span>
              </div>
              <div className="w-full grid grid-cols-3 gap-2 text-center pt-1 border-t border-line/40">
                <div>
                  <p className="text-[14px] font-bold text-ink-900">{result.hits.length}</p>
                  <p className="text-[9px] text-ink-faint">命中段落</p>
                </div>
                <div>
                  <p className="text-[14px] font-bold text-ink-900">{original.length}</p>
                  <p className="text-[9px] text-ink-faint">原文字数</p>
                </div>
                <div>
                  <p className="text-[14px] font-bold text-ink-900">{check.length}</p>
                  <p className="text-[9px] text-ink-faint">检测字数</p>
                </div>
              </div>
            </div>

            {/* 高亮对比视图 */}
            <div>
              <h3 className="text-xs text-ink-700 font-medium flex items-center gap-1.5 px-1 mb-2">
                <Layers size={12} className="text-seal/70" />
                高亮对比视图
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 原文栏 */}
                <div className="bg-surface rounded-xl border border-line/60 overflow-hidden">
                  <div className="px-3 py-2 border-b border-line/40 flex items-center gap-1.5 bg-paper-dark/30">
                    <FileText size={11} className="text-bamboo" />
                    <span className="text-[10px] text-ink-700 font-medium">原文</span>
                  </div>
                  <div className="p-3 text-[11px] text-ink-700 leading-relaxed space-y-1.5">
                    {result.originalSegments.map((seg, i) => (
                      <span
                        key={i}
                        className={`inline ${seg.highlight ? 'bg-gold/25 rounded px-0.5' : ''}`}
                      >
                        {seg.text}
                      </span>
                    ))}
                  </div>
                </div>
                {/* 待检测栏 */}
                <div className="bg-surface rounded-xl border border-line/60 overflow-hidden">
                  <div className="px-3 py-2 border-b border-line/40 flex items-center gap-1.5 bg-paper-dark/30">
                    <Copy size={11} className="text-seal" />
                    <span className="text-[10px] text-ink-700 font-medium">待检测</span>
                  </div>
                  <div className="p-3 text-[11px] text-ink-700 leading-relaxed space-y-1.5">
                    {result.checkSegments.map((seg, i) => (
                      <span
                        key={i}
                        className={`inline ${seg.highlight ? 'bg-gold/25 rounded px-0.5' : ''}`}
                      >
                        {seg.text}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-gold/25" />
                  <span className="text-[9px] text-ink-faint">相似段落标记</span>
                </div>
              </div>
            </div>

            {/* 命中段落列表 */}
            <div className="bg-surface rounded-xl border border-line/60 overflow-hidden">
              <div className="px-3 py-2.5 border-b border-line/40 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Copy size={13} className="text-seal/70" />
                  <span className="text-xs text-ink-700 font-medium">命中段落列表</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium text-seal bg-seal/10">
                  {result.hits.length} 处
                </span>
              </div>
              {result.hits.length === 0 ? (
                <div className="px-3 py-6 flex flex-col items-center gap-1.5">
                  <CheckCircle size={20} className="text-bamboo/60" />
                  <p className="text-[11px] text-ink-faint">未发现明显相似段落</p>
                </div>
              ) : (
                <div className="px-3 py-3 space-y-2.5">
                  {result.hits.map((hit, i) => {
                    const lvl = getSimilarityLevel(hit.similarity)
                    return (
                      <div key={i} className="bg-paper-dark/30 rounded-lg p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-ink-faint font-medium">命中 #{i + 1}</span>
                          <span className={`text-[10px] font-bold ${lvl.color}`}>{hit.similarity}%</span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-start gap-1.5">
                            <span className="text-[9px] text-bamboo font-medium mt-0.5 flex-shrink-0">原</span>
                            <p className="text-[11px] text-ink-700 leading-relaxed bg-gold/15 rounded px-1.5 py-0.5">{hit.originalFragment}</p>
                          </div>
                          <div className="flex items-start gap-1.5">
                            <span className="text-[9px] text-seal font-medium mt-0.5 flex-shrink-0">检</span>
                            <p className="text-[11px] text-ink-700 leading-relaxed bg-gold/15 rounded px-1.5 py-0.5">{hit.checkFragment}</p>
                          </div>
                        </div>
                        {/* 相似度条 */}
                        <div className="h-1 bg-paper-dark rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${lvl.bg}`}
                            style={{ width: `${hit.similarity}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 免责声明 */}
            <div className="text-center py-3">
              <p className="text-[9px] text-ink-faint leading-relaxed">
                演示版本使用硬编码 mock 数据，相似度与命中段落为预设值<br />
                检测结果仅供参考，不构成法律意义上的洗稿认定
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
