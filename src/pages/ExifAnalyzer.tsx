import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Upload, Camera, MapPin, Clock, Shield, AlertTriangle,
  CheckCircle, XCircle, ChevronDown, ChevronUp,
  Aperture, Eye, RefreshCw, Info,
} from 'lucide-react'
import * as exifr from 'exifr'
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

// ===== 类型定义 =====

interface ExifData {
  // 基本信息
  fileName?: string
  fileSize?: number
  mimeType?: string
  width?: number
  height?: number
  // 相机信息
  Make?: string
  Model?: string
  LensInfo?: string
  LensModel?: string
  // 拍摄参数
  FNumber?: number
  ISO?: number
  ExposureTime?: number
  FocalLength?: number
  ShutterSpeedValue?: number
  ApertureValue?: number
  BrightnessValue?: number
  // 时间
  DateTimeOriginal?: Date
  CreateDate?: Date
  ModifyDate?: Date
  // 软件
  Software?: string
  // GPS
  GPSLatitude?: number
  GPSLongitude?: number
  GPSAltitude?: number
  // 其他
  Orientation?: number
  ColorSpace?: string | number
  Flash?: number | string
  WhiteBalance?: number | string
  DigitalZoomRatio?: number
  // 原始数据（用于高级展示）
  _raw?: Record<string, unknown>
}

interface RiskItem {
  level: 'safe' | 'warning' | 'danger'
  label: string
  detail: string
}

type AnalysisState = 'idle' | 'analyzing' | 'done'

// ===== 辅助函数 =====

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatExposure(seconds: number): string {
  if (seconds >= 1) return `${seconds}s`
  const denominator = Math.round(1 / seconds)
  return `1/${denominator}s`
}

function formatGps(deg: number, isLat: boolean): string {
  const abs = Math.abs(deg)
  const d = Math.floor(abs)
  const m = Math.floor((abs - d) * 60)
  const s = ((abs - d - m / 60) * 3600).toFixed(1)
  const dir = isLat ? (deg >= 0 ? 'N' : 'S') : (deg >= 0 ? 'E' : 'W')
  return `${d}°${m}'${s}"${dir}`
}

// 编辑软件风险关键词
const EDITING_SOFTWARE = [
  'photoshop', 'adobe', 'gimp', 'paint.net', 'lightroom',
  'snapseed', 'picmonkey', 'airbrush', 'facetune', 'meitu',
  '美图', '美颜', 'pitu', 'hypic', 'epik', 'vsco',
]

function isEditingSoftware(software?: string): boolean {
  if (!software) return false
  const lower = software.toLowerCase()
  return EDITING_SOFTWARE.some(kw => lower.includes(kw))
}

// ===== 风险评估引擎 =====

function assessRisks(data: ExifData | null, hasExif: boolean): RiskItem[] {
  const risks: RiskItem[] = []

  if (!hasExif || !data) {
    risks.push({
      level: 'danger',
      label: '元数据完全缺失',
      detail: '图片不包含任何 EXIF 信息，可能经过截图、二次保存或刻意清除元数据。正常拍摄的照片应包含相机参数。',
    })
    return risks
  }

  // 编辑软件检测
  if (data.Software && isEditingSoftware(data.Software)) {
    risks.push({
      level: 'danger',
      label: '检测到编辑软件标记',
      detail: `该图片的 Software 字段为「${data.Software}」，表明图片经过图像编辑软件处理，内容可能已被修改。`,
    })
  } else if (data.Software) {
    risks.push({
      level: 'safe',
      label: '软件标记正常',
      detail: `生成软件：${data.Software}`,
    })
  }

  // 时间一致性
  if (data.DateTimeOriginal && data.ModifyDate) {
    const diff = Math.abs(data.ModifyDate.getTime() - data.DateTimeOriginal.getTime())
    if (diff > 60000) {
      risks.push({
        level: 'warning',
        label: '拍摄与修改时间不一致',
        detail: `原始拍摄时间为 ${data.DateTimeOriginal.toLocaleString('zh-CN')}，但最后修改时间为 ${data.ModifyDate.toLocaleString('zh-CN')}，图片可能经过后期处理。`,
      })
    } else {
      risks.push({
        level: 'safe',
        label: '时间戳一致',
        detail: '拍摄时间与修改时间一致，未发现后期处理痕迹。',
      })
    }
  }

  // GPS 缺失
  if (!data.GPSLatitude || !data.GPSLongitude) {
    risks.push({
      level: 'warning',
      label: 'GPS 信息缺失',
      detail: '图片不包含地理位置信息。部分手机默认关闭 GPS 记录，但也可能是被刻意清除。',
    })
  } else {
    risks.push({
      level: 'safe',
      label: 'GPS 信息完整',
      detail: `拍摄地点：${formatGps(data.GPSLatitude, true)}, ${formatGps(data.GPSLongitude, false)}`,
    })
  }

  // 相机信息缺失
  if (!data.Make || !data.Model) {
    risks.push({
      level: 'warning',
      label: '相机信息缺失',
      detail: '未检测到相机品牌和型号信息，可能不是直接拍摄生成，而是经过转换或裁剪。',
    })
  } else {
    risks.push({
      level: 'safe',
      label: '相机信息完整',
      detail: `${data.Make} ${data.Model}`,
    })
  }

  // 拍摄参数缺失（可能是截图的特征）
  if (!data.FNumber && !data.ISO && !data.ExposureTime) {
    risks.push({
      level: 'warning',
      label: '拍摄参数缺失',
      detail: '光圈、ISO、快门速度等拍摄参数全部缺失，这是截图或经过处理的图片的典型特征。正常照片应包含这些参数。',
    })
  } else if (data.FNumber && data.ISO && data.ExposureTime) {
    risks.push({
      level: 'safe',
      label: '拍摄参数完整',
      detail: `f/${data.FNumber} · ISO ${data.ISO} · ${formatExposure(data.ExposureTime)}`,
    })
  }

  return risks
}

// 计算总体风险分数 (0-100, 越低越安全)
function calcRiskScore(risks: RiskItem[]): number {
  if (risks.length === 0) return 50
  let score = 80 // 有 EXIF 起始分较高
  for (const r of risks) {
    if (r.level === 'danger') score -= 30
    else if (r.level === 'warning') score -= 15
    else score += 5
  }
  return Math.max(0, Math.min(100, score))
}

// ===== 组件 =====

export default function ExifAnalyzer() {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [exifData, setExifData] = useState<ExifData | null>(null)
  const [hasExif, setHasExif] = useState(false)
  const [state, setState] = useState<AnalysisState>('idle')
  const [showRaw, setShowRaw] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    camera: true, capture: true, gps: true, risk: true, time: true,
  })

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const analyzeFile = useCallback(async (file: File) => {
    // 预览
    const url = URL.createObjectURL(file)
    setPreview(url)
    setState('analyzing')
    setExifData(null)
    setHasExif(false)

    try {
      // 解析 EXIF
      const parsed = await exifr.parse(file, {
        gps: true,
        tiff: true,
        ifd0: true,
        ifd1: true,
        exif: true,
        interop: true,
      })

      const basicExif = parsed !== undefined && parsed !== null && Object.keys(parsed || {}).length > 3

      // 获取图片尺寸（作为 fallback）
      let width = parsed?.ExifImageWidth || parsed?.width
      let height = parsed?.ExifImageHeight || parsed?.height
      if (!width || !height) {
        const dims = await new Promise<{ w: number; h: number }>((resolve) => {
          const img = new window.Image()
          img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
          img.onerror = () => resolve({ w: 0, h: 0 })
          img.src = url
        })
        width = dims.w
        height = dims.h
      }

      const data: ExifData = {
        ...parsed,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        width,
        height,
        _raw: parsed || {},
      }

      // 模拟短暂分析延迟（让 UI 动画有时间展示）
      await new Promise(r => setTimeout(r, 800))

      setExifData(data)
      setHasExif(basicExif)
      setState('done')
    } catch {
      // 即使解析失败也展示基本信息
      const dims = await new Promise<{ w: number; h: number }>((resolve) => {
        const img = new window.Image()
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
        img.onerror = () => resolve({ w: 0, h: 0 })
        img.src = url
      })

      setExifData({
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        width: dims.w,
        height: dims.h,
      })
      setHasExif(false)
      setState('done')
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) analyzeFile(file)
  }, [analyzeFile])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) analyzeFile(file)
  }, [analyzeFile])

  const handleReset = () => {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setExifData(null)
    setHasExif(false)
    setState('idle')
    setShowRaw(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const risks = assessRisks(exifData, hasExif)
  const riskScore = calcRiskScore(risks)

  // ===== 渲染 =====

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* 顶部导航栏 */}
      <div className={`px-4 pt-3 pb-2 flex items-center gap-3 ${isDesktop ? 'max-w-3xl mx-auto w-full' : ''}`}>
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 -ml-1.5 rounded-lg hover:bg-paper-dark transition-colors"
        >
          <ArrowLeft size={20} className="text-ink-700" />
        </button>
        <div className="flex-1">
          <h1 className="text-sm font-medium text-ink-900">图片元数据鉴定</h1>
          <p className="text-[10px] text-ink-faint">EXIF 分析 · 纯本地处理 · 不上传任何数据</p>
        </div>
        {state === 'done' && (
          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg hover:bg-paper-dark transition-colors"
          >
            <RefreshCw size={16} className="text-ink-500" />
          </button>
        )}
      </div>

      <div className={`flex-1 px-4 pb-4 overflow-y-auto ${isDesktop ? 'max-w-3xl mx-auto w-full' : ''}`}>
        {/* ===== 上传状态 ===== */}
        {state === 'idle' && (
          <div className="animate-fade-in-up">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 border-2 border-dashed border-line rounded-2xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-seal/40 hover:bg-surface/50 transition-all active:scale-[0.98]"
            >
              <div className="w-16 h-16 rounded-2xl bg-paper-dark flex items-center justify-center">
                <Upload size={28} className="text-seal/60" />
              </div>
              <div className="text-center">
                <p className="text-sm text-ink-700 font-medium">点击或拖拽上传图片</p>
                <p className="text-[11px] text-ink-faint mt-1">支持 JPG / PNG / HEIC / WebP</p>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-ink-faint bg-paper-dark px-3 py-1.5 rounded-full">
                <Shield size={10} />
                <span>所有分析在浏览器本地完成，图片不会上传</span>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* 功能说明 */}
            <div className="mt-6 space-y-3">
              <h3 className="text-xs font-medium text-ink-700">检测项目</h3>
              {[
                { icon: Camera, label: '相机信息', desc: '品牌型号、镜头参数' },
                { icon: Clock, label: '时间戳校验', desc: '拍摄与修改时间一致性' },
                { icon: MapPin, label: 'GPS 定位', desc: '拍摄地理位置（如有）' },
                { icon: AlertTriangle, label: '编辑痕迹', desc: 'Photoshop/美图等软件标记' },
                { icon: Aperture, label: '拍摄参数', desc: '光圈/ISO/快门完整性' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3 p-3 bg-surface rounded-xl border border-line/60">
                  <div className="w-8 h-8 rounded-lg bg-paper-dark flex items-center justify-center">
                    <item.icon size={16} className="text-seal/60" />
                  </div>
                  <div>
                    <p className="text-xs text-ink-900 font-medium">{item.label}</p>
                    <p className="text-[10px] text-ink-faint">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== 分析中状态 ===== */}
        {state === 'analyzing' && preview && (
          <div className="mt-4 animate-fade-in-up">
            <div className="bg-surface rounded-2xl border border-line overflow-hidden">
              <div className="aspect-video max-h-[240px] overflow-hidden bg-ink-900/5 flex items-center justify-center">
                <img src={preview} alt="preview" className="max-w-full max-h-full object-contain opacity-60" />
              </div>
              <div className="p-6 flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-seal/30 border-t-seal animate-spin" />
                <p className="text-sm text-ink-700 font-medium">正在解析元数据...</p>
                <p className="text-[10px] text-ink-faint">读取 EXIF / GPS / 时间戳 / 相机参数</p>
              </div>
            </div>
          </div>
        )}

        {/* ===== 结果状态 ===== */}
        {state === 'done' && exifData && (
          <div className="mt-2 space-y-3 animate-fade-in-up">
            {/* 图片预览 + 风险评分 */}
            <div className="bg-surface rounded-2xl border border-line overflow-hidden">
              {preview && (
                <div className="aspect-video max-h-[200px] overflow-hidden bg-ink-900/5 flex items-center justify-center relative">
                  <img src={preview} alt="preview" className="max-w-full max-h-full object-contain" />
                  <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-ink-900/60 text-white text-[10px] backdrop-blur-sm">
                    {exifData.width} × {exifData.height}
                  </div>
                </div>
              )}

              {/* 风险评分条 */}
              <div className="p-4 border-b border-line/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Eye size={14} className="text-ink-500" />
                    <span className="text-xs text-ink-700 font-medium">元数据完整度</span>
                  </div>
                  <span className={`text-sm font-bold ${
                    riskScore >= 70 ? 'text-bamboo' : riskScore >= 40 ? 'text-gold' : 'text-seal'
                  }`}>
                    {riskScore}%
                  </span>
                </div>
                <div className="h-2 bg-paper-dark rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${
                      riskScore >= 70 ? 'bg-bamboo' : riskScore >= 40 ? 'bg-gold' : 'bg-seal'
                    }`}
                    style={{ width: `${riskScore}%` }}
                  />
                </div>
                <p className={`text-[10px] mt-1.5 ${
                  riskScore >= 70 ? 'text-bamboo' : riskScore >= 40 ? 'text-gold' : 'text-seal'
                }`}>
                  {riskScore >= 70 ? '元数据完整，未发现明显异常' :
                   riskScore >= 40 ? '部分元数据缺失，存在一定疑点' :
                   '元数据严重缺失或存在编辑痕迹，需警惕'}
                </p>
              </div>
            </div>

            {/* 基本信息 */}
            <div className="bg-surface rounded-xl border border-line/60 p-3">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {[
                  { label: '文件名', value: exifData.fileName || '-' },
                  { label: '文件大小', value: exifData.fileSize ? formatFileSize(exifData.fileSize) : '-' },
                  { label: '格式', value: exifData.mimeType || '-' },
                  { label: '分辨率', value: exifData.width && exifData.height ? `${exifData.width} × ${exifData.height}` : '-' },
                ].map(item => (
                  <div key={item.label} className="flex flex-col">
                    <span className="text-[10px] text-ink-faint">{item.label}</span>
                    <span className="text-xs text-ink-900 truncate">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 风险评估 */}
            <SectionCard
              title="风险评估"
              icon={Shield}
              expanded={expandedSections.risk}
              onToggle={() => toggleSection('risk')}
              badge={
                risks.filter(r => r.level === 'danger').length > 0
                  ? { text: `${risks.filter(r => r.level === 'danger').length} 项高风险`, color: 'text-seal bg-seal/10' }
                  : risks.filter(r => r.level === 'warning').length > 0
                  ? { text: `${risks.filter(r => r.level === 'warning').length} 项警告`, color: 'text-gold bg-gold/10' }
                  : { text: '无异常', color: 'text-bamboo bg-bamboo/10' }
              }
            >
              <div className="space-y-2">
                {risks.map((risk, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${
                      risk.level === 'danger' ? 'bg-seal/5 border-seal/20' :
                      risk.level === 'warning' ? 'bg-gold/5 border-gold/20' :
                      'bg-bamboo/5 border-bamboo/20'
                    }`}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {risk.level === 'danger' ? <XCircle size={14} className="text-seal" /> :
                       risk.level === 'warning' ? <AlertTriangle size={14} className="text-gold" /> :
                       <CheckCircle size={14} className="text-bamboo" />}
                    </div>
                    <div>
                      <p className={`text-xs font-medium ${
                        risk.level === 'danger' ? 'text-seal' :
                        risk.level === 'warning' ? 'text-gold' : 'text-bamboo'
                      }`}>{risk.label}</p>
                      <p className="text-[10px] text-ink-500 mt-0.5 leading-relaxed">{risk.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* 相机信息 */}
            {(exifData.Make || exifData.Model || exifData.LensModel || exifData.LensInfo) && (
              <SectionCard
                title="相机信息"
                icon={Camera}
                expanded={expandedSections.camera}
                onToggle={() => toggleSection('camera')}
              >
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                  {exifData.Make && <InfoRow label="品牌" value={exifData.Make} />}
                  {exifData.Model && <InfoRow label="型号" value={exifData.Model} />}
                  {exifData.LensModel && <InfoRow label="镜头" value={exifData.LensModel} />}
                  {exifData.LensInfo && <InfoRow label="镜头信息" value={String(exifData.LensInfo)} />}
                </div>
              </SectionCard>
            )}

            {/* 拍摄参数 */}
            {(exifData.FNumber || exifData.ISO || exifData.ExposureTime || exifData.FocalLength) && (
              <SectionCard
                title="拍摄参数"
                icon={Aperture}
                expanded={expandedSections.capture}
                onToggle={() => toggleSection('capture')}
              >
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                  {exifData.FNumber && <InfoRow label="光圈" value={`f/${exifData.FNumber}`} />}
                  {exifData.ISO && <InfoRow label="ISO" value={String(exifData.ISO)} />}
                  {exifData.ExposureTime && <InfoRow label="快门" value={formatExposure(exifData.ExposureTime)} />}
                  {exifData.FocalLength && <InfoRow label="焦距" value={`${exifData.FocalLength}mm`} />}
                  {exifData.BrightnessValue !== undefined && <InfoRow label="亮度" value={String(Number(exifData.BrightnessValue).toFixed(1))} />}
                  {exifData.Flash !== undefined && <InfoRow label="闪光灯" value={Number(exifData.Flash) === 1 ? '已触发' : '未触发'} />}
                </div>
              </SectionCard>
            )}

            {/* 时间信息 */}
            {(exifData.DateTimeOriginal || exifData.CreateDate || exifData.ModifyDate) && (
              <SectionCard
                title="时间信息"
                icon={Clock}
                expanded={expandedSections.time}
                onToggle={() => toggleSection('time')}
              >
                <div className="space-y-2">
                  {exifData.DateTimeOriginal && (
                    <InfoRow label="拍摄时间" value={exifData.DateTimeOriginal.toLocaleString('zh-CN')} />
                  )}
                  {exifData.CreateDate && exifData.CreateDate !== exifData.DateTimeOriginal && (
                    <InfoRow label="数字化时间" value={exifData.CreateDate.toLocaleString('zh-CN')} />
                  )}
                  {exifData.ModifyDate && (
                    <InfoRow label="修改时间" value={exifData.ModifyDate.toLocaleString('zh-CN')} />
                  )}
                  {exifData.Software && (
                    <InfoRow label="处理软件" value={exifData.Software} />
                  )}
                </div>
              </SectionCard>
            )}

            {/* GPS 信息 */}
            {exifData.GPSLatitude && exifData.GPSLongitude && (
              <SectionCard
                title="地理位置"
                icon={MapPin}
                expanded={expandedSections.gps}
                onToggle={() => toggleSection('gps')}
              >
                <div className="space-y-2">
                  <InfoRow label="纬度" value={formatGps(exifData.GPSLatitude, true)} />
                  <InfoRow label="经度" value={formatGps(exifData.GPSLongitude, false)} />
                  {exifData.GPSAltitude !== undefined && (
                    <InfoRow label="海拔" value={`${Number(exifData.GPSAltitude).toFixed(1)}m`} />
                  )}
                  <a
                    href={`https://www.google.com/maps?q=${exifData.GPSLatitude},${exifData.GPSLongitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[10px] text-seal hover:text-seal-light transition-colors mt-1"
                  >
                    <MapPin size={10} />
                    <span>在地图中查看</span>
                  </a>
                </div>
              </SectionCard>
            )}

            {/* 原始数据（折叠） */}
            {hasExif && exifData._raw && Object.keys(exifData._raw).length > 0 && (
              <div className="bg-surface rounded-xl border border-line/60">
                <button
                  onClick={() => setShowRaw(!showRaw)}
                  className="w-full px-3 py-2.5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-1.5">
                    <Info size={12} className="text-ink-faint" />
                    <span className="text-[10px] text-ink-500">原始 EXIF 数据（{Object.keys(exifData._raw).length} 项）</span>
                  </div>
                  {showRaw ? <ChevronUp size={14} className="text-ink-faint" /> : <ChevronDown size={14} className="text-ink-faint" />}
                </button>
                {showRaw && (
                  <div className="px-3 pb-3 max-h-[300px] overflow-y-auto">
                    <div className="bg-paper-dark rounded-lg p-2.5 font-mono text-[10px] text-ink-700 leading-relaxed whitespace-pre-wrap break-all">
                      {Object.entries(exifData._raw)
                        .filter(([, v]) => v !== undefined && v !== null)
                        .map(([k, v]) => `${k}: ${v instanceof Date ? v.toISOString() : typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
                        .join('\n')}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 免责声明 */}
            <div className="text-center py-3">
              <p className="text-[9px] text-ink-faint leading-relaxed">
                本工具仅分析图片元数据，不能判定图片内容真伪<br />
                分析结果仅供参考，不构成任何证据或建议
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 隐藏的文件输入（结果状态下也可重新选择） */}
      {state !== 'idle' && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      )}
    </div>
  )
}

// ===== 子组件 =====

function SectionCard({
  title, icon: Icon, expanded, onToggle, badge, children,
}: {
  title: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  expanded: boolean
  onToggle: () => void
  badge?: { text: string; color: string }
  children: React.ReactNode
}) {
  return (
    <div className="bg-surface rounded-xl border border-line/60 overflow-hidden">
      <button onClick={onToggle} className="w-full px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon size={14} className="text-ink-500" />
          <span className="text-xs text-ink-700 font-medium">{title}</span>
          {badge && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${badge.color}`}>
              {badge.text}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp size={14} className="text-ink-faint" /> : <ChevronDown size={14} className="text-ink-faint" />}
      </button>
      {expanded && <div className="px-3 pb-3">{children}</div>}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-ink-faint">{label}</span>
      <span className="text-xs text-ink-900 break-all">{value}</span>
    </div>
  )
}
