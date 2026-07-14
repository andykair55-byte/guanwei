import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, RefreshCw, Search, Upload, ImageIcon, Clock,
  Globe, Shield, Calendar,
} from 'lucide-react'
import { useIsDesktop } from '../hooks/useIsDesktop'



// ===== 类型定义 =====

type AnalysisState = 'idle' | 'analyzing' | 'done'

interface SearchResult {
  thumbColor: string  // 缩略图渐变色
  source: string       // 来源域名
  firstSeen: string    // 首次出现时间 YYYY-MM-DD
  similarity: number   // 相似度 %
  isEarliest?: boolean // 是否为最早来源（可能原图源头）
}

interface PresetImage {
  id: string
  label: string
  bg: string
  fg: string
  icon: string
  results: SearchResult[]
}

// ===== mock 预设图片 =====

const PRESET_IMAGES: PresetImage[] = [
  {
    id: 'cityscape',
    label: '城市夜景',
    bg: '#1e3a8a',
    fg: '#3b82f6',
    icon: '🌃',
    results: [
      { thumbColor: '#1e40af', source: '500px.com', firstSeen: '2023-12-08', similarity: 65, isEarliest: true },
      { thumbColor: '#1e3a8a', source: 'zhihu.com', firstSeen: '2024-02-20', similarity: 76 },
      { thumbColor: '#2563eb', source: 'weibo.com', firstSeen: '2024-03-15', similarity: 98 },
      { thumbColor: '#3b82f6', source: 'xiaohongshu.com', firstSeen: '2024-04-02', similarity: 89 },
      { thumbColor: '#1d4ed8', source: 'image.baidu.com', firstSeen: '2024-05-10', similarity: 71 },
      { thumbColor: '#1e40af', source: 'tuchong.com', firstSeen: '2024-06-18', similarity: 68 },
    ],
  },
  {
    id: 'mountain',
    label: '山川风景',
    bg: '#065f46',
    fg: '#10b981',
    icon: '🏔️',
    results: [
      { thumbColor: '#047857', source: 'tuchong.com', firstSeen: '2024-04-15', similarity: 92, isEarliest: true },
      { thumbColor: '#065f46', source: 'mafengwo.cn', firstSeen: '2024-05-20', similarity: 88 },
      { thumbColor: '#059669', source: 'zhihu.com', firstSeen: '2024-06-01', similarity: 95 },
      { thumbColor: '#10b981', source: 'weibo.com', firstSeen: '2024-06-22', similarity: 73 },
      { thumbColor: '#047857', source: '8264.com', firstSeen: '2024-07-01', similarity: 78 },
    ],
  },
  {
    id: 'cat',
    label: '网红猫咪',
    bg: '#c2410c',
    fg: '#f97316',
    icon: '🐱',
    results: [
      { thumbColor: '#9a3412', source: 'weibo.com', firstSeen: '2024-01-08', similarity: 96, isEarliest: true },
      { thumbColor: '#c2410c', source: 'douban.com', firstSeen: '2024-01-10', similarity: 99 },
      { thumbColor: '#ea580c', source: 'xiaohongshu.com', firstSeen: '2024-01-12', similarity: 82 },
      { thumbColor: '#f97316', source: 'bilibili.com', firstSeen: '2024-01-15', similarity: 87 },
      { thumbColor: '#fb923c', source: 'zhihu.com', firstSeen: '2024-02-01', similarity: 70 },
    ],
  },
]

// ===== 辅助函数 =====

// 生成 SVG 占位图 data URL（避免网络依赖）
function makeImage(bg: string, fg: string, icon: string, w = 400, h = 300): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>
    <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0' stop-color='${bg}'/>
      <stop offset='1' stop-color='${fg}'/>
    </linearGradient></defs>
    <rect width='${w}' height='${h}' fill='url(#g)'/>
    <text x='50%' y='46%' font-size='72' text-anchor='middle' dominant-baseline='central'>${icon}</text>
    <text x='50%' y='76%' font-family='sans-serif' font-size='18' fill='white' text-anchor='middle' opacity='0.7'>PREVIEW</text>
  </svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

// 缩略图（结果项用，纯色块 + 序号）
function makeThumb(color: string, label: string, w = 120, h = 120): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>
    <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0' stop-color='${color}'/>
      <stop offset='1' stop-color='${color}' stop-opacity='0.6'/>
    </linearGradient></defs>
    <rect width='${w}' height='${h}' fill='url(#g)'/>
    <text x='50%' y='50%' font-family='sans-serif' font-size='14' fill='white' text-anchor='middle' dominant-baseline='central' opacity='0.5'>${label}</text>
  </svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

function getSimilarityColor(p: number): string {
  if (p >= 85) return 'text-seal'
  if (p >= 60) return 'text-gold'
  return 'text-bamboo'
}

function getSimilarityBg(p: number): string {
  if (p >= 85) return 'bg-seal'
  if (p >= 60) return 'bg-gold'
  return 'bg-bamboo'
}

// 时间线位置计算
function timelinePositions(results: SearchResult[]): { result: SearchResult; left: number }[] {
  const dates = results.map(r => new Date(r.firstSeen).getTime())
  const min = Math.min(...dates)
  const max = Math.max(...dates)
  const span = max - min
  return results.map(r => {
    const t = new Date(r.firstSeen).getTime()
    const left = span === 0 ? 50 : ((t - min) / span) * 100
    return { result: r, left }
  })
}

// ===== 组件 =====

export default function ReverseImageSearch() {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedPreset, setSelectedPreset] = useState<PresetImage | null>(null)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
  const [uploadedName, setUploadedName] = useState<string>('')
  const [state, setState] = useState<AnalysisState>('idle')
  const [resultPreset, setResultPreset] = useState<PresetImage | null>(null)

  const hasImage = !!selectedPreset || !!uploadedUrl

  const handleSearch = useCallback(async () => {
    if (!hasImage || state === 'analyzing') return
    setState('analyzing')
    setResultPreset(null)
    // demo：上传图片默认用"城市夜景"的结果集，预设图用自己的结果集
    const preset = selectedPreset || PRESET_IMAGES[0]
    await new Promise(r => setTimeout(r, 2000))
    setResultPreset(preset)
    setState('done')
  }, [hasImage, selectedPreset, state])

  const handleReset = () => {
    if (uploadedUrl) URL.revokeObjectURL(uploadedUrl)
    setSelectedPreset(null)
    setUploadedUrl(null)
    setUploadedName('')
    setResultPreset(null)
    setState('idle')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handlePresetSelect = (p: PresetImage) => {
    if (uploadedUrl) {
      URL.revokeObjectURL(uploadedUrl)
      setUploadedUrl(null)
      setUploadedName('')
    }
    setSelectedPreset(p)
    setResultPreset(null)
    setState('idle')
  }

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    if (selectedPreset) setSelectedPreset(null)
    const url = URL.createObjectURL(file)
    setUploadedUrl(url)
    setUploadedName(file.name)
    setResultPreset(null)
    setState('idle')
  }, [selectedPreset])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    if (selectedPreset) setSelectedPreset(null)
    const url = URL.createObjectURL(file)
    setUploadedUrl(url)
    setUploadedName(file.name)
    setResultPreset(null)
    setState('idle')
  }, [selectedPreset])

  // 当前预览图
  const previewUrl = selectedPreset
    ? makeImage(selectedPreset.bg, selectedPreset.fg, selectedPreset.icon)
    : uploadedUrl
  const previewLabel = selectedPreset ? selectedPreset.label : (uploadedName || '上传图片')

  // ===== 渲染 =====

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-paper-texture">
      {/* 顶部导航 */}
      <div className={`px-5 pt-4 pb-2 flex items-center gap-3 ${isDesktop ? 'max-w-3xl mx-auto w-full' : ''}`}>
        <button onClick={() => navigate(-1)} className="p-1.5 -ml-1.5 rounded-lg hover:bg-paper-dark transition-colors active:scale-95">
          <ArrowLeft size={20} className="text-ink-700" />
        </button>
        <div className="flex-1">
          <h1 className={`${isDesktop ? 'text-xl' : 'text-[16px]'} font-bold text-ink-900`}>反向搜图</h1>
          <p className="text-[11px] text-ink-400">追溯图片源头，发现原始出处</p>
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
            {/* 上传区 */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-seal/40 hover:bg-surface/50 transition-all active:scale-[0.99] ${
                uploadedUrl ? 'border-seal/40 bg-seal/5' : 'border-line'
              }`}
            >
              {uploadedUrl ? (
                <>
                  <div className="w-24 h-24 rounded-xl overflow-hidden border border-line">
                    <img src={uploadedUrl} alt="upload" className="w-full h-full object-cover" />
                  </div>
                  <p className="text-[12px] text-ink-700 font-medium">{uploadedName}</p>
                  <p className="text-[10px] text-ink-faint">点击重新选择 · 或选用下方预设图</p>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-paper-dark flex items-center justify-center">
                    <Upload size={24} className="text-seal/60" />
                  </div>
                  <div className="text-center">
                    <p className="text-[13px] text-ink-700 font-medium">点击或拖拽上传图片</p>
                    <p className="text-[10px] text-ink-faint mt-1">演示版本：上传后仍使用 mock 结果</p>
                  </div>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* 分隔 */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-line/60" />
              <span className="text-[10px] text-ink-faint">或选择预设图片</span>
              <div className="flex-1 h-px bg-line/60" />
            </div>

            {/* 预设图片 */}
            <div className="grid grid-cols-3 gap-3">
              {PRESET_IMAGES.map(p => {
                const isActive = selectedPreset?.id === p.id
                return (
                  <button
                    key={p.id}
                    onClick={() => handlePresetSelect(p)}
                    className={`rounded-xl overflow-hidden border-2 transition-all active:scale-[0.97] ${
                      isActive ? 'border-seal ring-2 ring-seal/20' : 'border-line/60 hover:border-seal/30'
                    }`}
                  >
                    <div className="aspect-[4/3] relative">
                      <img src={makeImage(p.bg, p.fg, p.icon)} alt={p.label} className="w-full h-full object-cover" />
                      {isActive && (
                        <div className="absolute inset-0 bg-seal/20 flex items-center justify-center">
                          <div className="w-7 h-7 rounded-full bg-seal flex items-center justify-center">
                            <Search size={14} className="text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="px-2 py-1.5 bg-surface">
                      <p className="text-[11px] text-ink-900 font-medium text-center">{p.label}</p>
                      <p className="text-[9px] text-ink-faint text-center mt-0.5">{p.results.length} 个结果</p>
                    </div>
                  </button>
                )
              })}
            </div>

            <button
              onClick={handleSearch}
              disabled={!hasImage}
              className="w-full py-2.5 rounded-xl bg-seal text-white text-[13px] font-medium flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-seal-light transition-colors active:scale-[0.98]"
            >
              <Search size={14} />
              开始搜索
            </button>

            <div className="bg-paper-dark/40 rounded-xl p-3 border border-line/40">
              <p className="text-[11px] text-ink-500 leading-relaxed flex items-start gap-1.5">
                <Shield size={12} className="text-seal/60 flex-shrink-0 mt-0.5" />
                <span>反向搜图通过图片特征指纹在网络图库中匹配相似图片，定位首次出现时间与可能源头。<br/><span className="text-ink-faint">（演示版本：使用硬编码 mock 数据，不进行真实网络请求）</span></span>
              </p>
            </div>
          </div>
        )}

        {/* ===== 分析中状态 ===== */}
        {state === 'analyzing' && previewUrl && (
          <div className="mt-4 animate-fade-in-up">
            <div className="bg-surface rounded-2xl border border-line overflow-hidden">
              <div className="aspect-video max-h-[200px] overflow-hidden bg-ink-900/5 flex items-center justify-center">
                <img src={previewUrl} alt="query" className="max-w-full max-h-full object-cover opacity-70" />
              </div>
              <div className="p-6 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full border-2 border-seal/30 border-t-seal animate-spin" />
                <p className="text-sm text-ink-700 font-medium">正在反向搜索图片...</p>
                <p className="text-[10px] text-ink-faint">提取特征指纹 → 索引网络图库 → 比对相似度</p>
              </div>
            </div>
          </div>
        )}

        {/* ===== 结果状态 ===== */}
        {state === 'done' && resultPreset && previewUrl && (
          <div className="mt-2 space-y-3 animate-fade-in-up">
            {/* 原图卡片 + 概览 */}
            <div className="bg-surface rounded-2xl border border-line overflow-hidden">
              <div className="flex gap-3 p-3">
                {/* 原图 */}
                <div className="w-24 h-24 rounded-xl overflow-hidden border border-line flex-shrink-0 bg-ink-900/5">
                  <img src={previewUrl} alt="origin" className="w-full h-full object-cover" />
                </div>
                {/* 信息 */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
                    <p className="text-[11px] text-ink-faint">查询图片</p>
                    <p className="text-[13px] text-ink-900 font-medium truncate">{previewLabel}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-paper-dark/40 rounded-lg px-2 py-1.5">
                      <p className="text-[14px] font-bold text-seal">{resultPreset.results.length}</p>
                      <p className="text-[9px] text-ink-faint">匹配结果</p>
                    </div>
                    <div className="bg-paper-dark/40 rounded-lg px-2 py-1.5">
                      <p className="text-[14px] font-bold text-bamboo">
                        {resultPreset.results.find(r => r.isEarliest)?.source || '-'}
                      </p>
                      <p className="text-[9px] text-ink-faint">可能源头</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 搜索结果网格 */}
            <div>
              <h3 className="text-xs text-ink-700 font-medium flex items-center gap-1.5 px-1 mb-2">
                <ImageIcon size={12} className="text-seal/70" />
                搜索结果（{resultPreset.results.length}）
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                {[...resultPreset.results]
                  .sort((a, b) => b.similarity - a.similarity)
                  .map((res, i) => (
                    <div
                      key={i}
                      className={`bg-surface rounded-xl border overflow-hidden ${
                        res.isEarliest ? 'border-bamboo/40' : 'border-line/60'
                      }`}
                    >
                      {/* 缩略图 */}
                      <div className="aspect-[4/3] relative bg-ink-900/5">
                        <img
                          src={makeThumb(res.thumbColor, `${res.similarity}%`)}
                          alt="result"
                          className="w-full h-full object-cover"
                        />
                        {/* 相似度角标 */}
                        <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-ink-900/70 backdrop-blur-sm">
                          <span className={`text-[10px] font-bold ${getSimilarityColor(res.similarity)}`}>
                            {res.similarity}%
                          </span>
                        </div>
                        {/* 最早来源标记 */}
                        {res.isEarliest && (
                          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-bamboo/90 backdrop-blur-sm">
                            <span className="text-[9px] text-white font-medium">最早</span>
                          </div>
                        )}
                      </div>
                      {/* 信息 */}
                      <div className="p-2 space-y-1">
                        <div className="flex items-center gap-1 min-w-0">
                          <Globe size={10} className="text-ink-faint flex-shrink-0" />
                          <span className="text-[11px] text-ink-900 font-medium truncate">{res.source}</span>
                        </div>
                        <div className="flex items-center gap-1 text-ink-faint">
                          <Calendar size={10} />
                          <span className="text-[10px]">首次出现 {res.firstSeen}</span>
                        </div>
                        {/* 相似度条 */}
                        <div className="h-1 bg-paper-dark rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${getSimilarityBg(res.similarity)}`}
                            style={{ width: `${res.similarity}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* 时间分布轴 */}
            <div className="bg-surface rounded-xl border border-line/60 p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs text-ink-700 font-medium flex items-center gap-1.5">
                  <Clock size={12} className="text-seal/70" />
                  首次出现时间分布
                </h3>
                <span className="text-[9px] text-ink-faint">从最早 → 最新</span>
              </div>
              {(() => {
                const positions = timelinePositions(resultPreset.results)
                const earliest = positions.find(p => p.result.isEarliest)
                const dates = resultPreset.results.map(r => new Date(r.firstSeen).getTime())
                const minDate = new Date(Math.min(...dates))
                const maxDate = new Date(Math.max(...dates))
                return (
                  <div>
                    {/* 轴 */}
                    <div className="relative h-12 mb-2">
                      {/* 基线 */}
                      <div className="absolute top-1/2 left-0 right-0 h-px bg-line -translate-y-1/2" />
                      {/* 节点 */}
                      {positions.map((p, i) => (
                        <div
                          key={i}
                          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center"
                          style={{ left: `${p.left}%` }}
                        >
                          <div className={`w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${
                            p.result.isEarliest ? 'bg-bamboo' : getSimilarityBg(p.result.similarity)
                          }`} />
                          <div className="mt-1 px-1 py-0.5 bg-paper-dark/60 rounded text-center min-w-[48px]">
                            <p className="text-[8px] text-ink-700 font-medium leading-tight">{p.result.source}</p>
                            <p className="text-[7px] text-ink-faint leading-tight">{p.result.firstSeen.slice(5)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* 端点标签 */}
                    <div className="flex items-center justify-between text-[9px] text-ink-faint px-1">
                      <span>最早：{minDate.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
                      <span>最新：{maxDate.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
                    </div>
                    {earliest && (
                      <div className="mt-2 px-2 py-1.5 bg-bamboo/5 border border-bamboo/20 rounded-lg flex items-center gap-1.5">
                        <Globe size={11} className="text-bamboo flex-shrink-0" />
                        <p className="text-[10px] text-bamboo leading-relaxed">
                          图片首次出现于 <span className="font-bold">{earliest.result.source}</span>（{earliest.result.firstSeen}），可能是原始出处或最早传播节点
                        </p>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* 免责声明 */}
            <div className="text-center py-3">
              <p className="text-[9px] text-ink-faint leading-relaxed">
                演示版本使用硬编码 mock 数据，缩略图为 SVG 占位图<br />
                来源域名、时间与相似度均为预设值，不代表真实搜索结果
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
