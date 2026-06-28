import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Upload, ExternalLink, RefreshCw,
  Search, Globe, Eye, Link2, X,
} from 'lucide-react'

interface SearchEngine {
  name: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  color: string
  bg: string
  url: (dataUrl: string, imageUrl: string) => string
  desc: string
}

const SEARCH_ENGINES: SearchEngine[] = [
  {
    name: 'Google 图片',
    icon: Globe,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    desc: '全球最大的图片索引',
    url: (_data, imgUrl) =>
      `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(imgUrl)}`,
  },
  {
    name: '百度图片',
    icon: Search,
    color: 'text-sky-600',
    bg: 'bg-sky-50',
    desc: '中文图片搜索覆盖最广',
    url: (dataUrl, imgUrl) => {
      if (imgUrl) return `https://graph.baidu.com/pcpage/index?tpl_from=pc&carousel=0&pic=${encodeURIComponent(imgUrl)}`
      return `https://graph.baidu.com/pcpage/index?tpl_from=pc&carousel=0&pic=${encodeURIComponent(dataUrl)}`
    },
  },
  {
    name: 'Yandex',
    icon: Eye,
    color: 'text-red-500',
    bg: 'bg-red-50',
    desc: '人脸识别能力最强',
    url: (_data, imgUrl) =>
      `https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(imgUrl)}`,
  },
  {
    name: 'TinEye',
    icon: Link2,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    desc: '专注图片溯源，历史库最大',
    url: (_data, imgUrl) =>
      `https://tineye.com/search?url=${encodeURIComponent(imgUrl)}`,
  },
]

export default function ReverseImageSearch() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [fileSize, setFileSize] = useState(0)
  const [imageUrl, setImageUrl] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [manualUrl, setManualUrl] = useState('')
  const [showUrlInput, setShowUrlInput] = useState(false)

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    setFileName(file.name)
    setFileSize(file.size)
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleUrlSearch = () => {
    const url = manualUrl.trim()
    if (!url) return
    setImageUrl(url)
    setPreview(url)
    setFileName('网络图片')
    setFileSize(0)
  }

  const handleReset = () => {
    setPreview(null)
    setFileName('')
    setFileSize(0)
    setImageUrl('')
    setManualUrl('')
    setShowUrlInput(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getSearchUrl = (engine: SearchEngine) => {
    return engine.url(preview || '', imageUrl)
  }

  return (
    <div className="flex flex-col min-h-full bg-paper-texture">
      {/* 顶部导航 */}
      <div className="px-5 pt-4 pb-2 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 -ml-1.5 rounded-lg hover:bg-paper-dark transition-colors active:scale-95">
          <ArrowLeft size={20} className="text-ink-700" />
        </button>
        <div className="flex-1">
          <h1 className="text-[16px] font-bold text-ink-900">反向搜图</h1>
          <p className="text-[11px] text-ink-400">追溯图片源头，发现原始出处</p>
        </div>
        {preview && (
          <button onClick={handleReset} className="p-1.5 rounded-lg hover:bg-paper-dark transition-colors active:scale-95">
            <RefreshCw size={16} className="text-ink-500" />
          </button>
        )}
      </div>

      <div className="flex-1 px-5 pb-6 overflow-y-auto">
        {!preview ? (
          <div className="animate-fade-in-up space-y-4">
            {/* 上传区域 */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all active:scale-[0.99] ${
                dragOver
                  ? 'border-emerald-400 bg-emerald-50/50'
                  : 'border-line/40 bg-surface hover:border-emerald-300 hover:bg-emerald-50/20'
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleInputChange}
                className="hidden"
              />
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                dragOver ? 'bg-emerald-100' : 'bg-emerald-50'
              }`}>
                <Upload size={24} className={`transition-colors ${dragOver ? 'text-emerald-600' : 'text-emerald-500'}`} />
              </div>
              <div className="text-center">
                <p className="text-[14px] text-ink-700 font-medium">
                  {dragOver ? '松开即可上传' : '拖拽图片到这里，或点击上传'}
                </p>
                <p className="text-[11px] text-ink-400 mt-1">支持 JPG / PNG / WebP / GIF，最大 10MB</p>
              </div>
            </div>

            {/* 分割线 */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-line/30" />
              <span className="text-[11px] text-ink-400">或者</span>
              <div className="flex-1 h-px bg-line/30" />
            </div>

            {/* 输入图片 URL */}
            <div className="bg-surface rounded-2xl shadow-card p-4">
              {!showUrlInput ? (
                <button
                  onClick={() => setShowUrlInput(true)}
                  className="w-full flex items-center gap-3 text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                    <Link2 size={18} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-[13px] text-ink-700 font-medium">粘贴图片链接</p>
                    <p className="text-[11px] text-ink-400">直接输入图片 URL 进行搜索</p>
                  </div>
                </button>
              ) : (
                <div className="space-y-3">
                  <input
                    value={manualUrl}
                    onChange={(e) => setManualUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUrlSearch()}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-4 py-3 bg-paper-dark rounded-xl text-[13px] text-ink-900 placeholder:text-ink-400 outline-none focus:ring-2 focus:ring-emerald-300/50"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleUrlSearch}
                      disabled={!manualUrl.trim()}
                      className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-[13px] font-medium active:scale-[0.98] transition-transform flex items-center justify-center gap-1.5 disabled:opacity-40"
                    >
                      <Search size={14} />
                      搜索
                    </button>
                    <button
                      onClick={() => { setShowUrlInput(false); setManualUrl('') }}
                      className="px-4 py-3 rounded-xl bg-paper-dark text-[13px] text-ink-500 font-medium active:scale-[0.98] transition-transform"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 使用说明 */}
            <div className="bg-surface rounded-2xl shadow-card p-4">
              <p className="text-[12px] text-ink-500 font-semibold mb-3">工作原理</p>
              <div className="space-y-2.5">
                {[
                  { icon: Upload, text: '上传疑似被盗用/篡改的图片' },
                  { icon: Search, text: '在多个搜索引擎中查找相同图片' },
                  { icon: ExternalLink, text: '找到最早出现的网页，确认原始出处' },
                ].map((step, i) => {
                  const StepIcon = step.icon
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        <StepIcon size={13} className="text-emerald-600" />
                      </div>
                      <p className="text-[12px] text-ink-700">{step.text}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          /* ===== 结果页 ===== */
          <div className="animate-fade-in-up space-y-4">
            {/* 图片预览 */}
            <div className="bg-surface rounded-2xl shadow-card p-4">
              <div className="relative rounded-xl overflow-hidden bg-paper-dark mb-3">
                <img
                  src={preview}
                  alt="待搜索图片"
                  className="w-full max-h-[280px] object-contain"
                  crossOrigin="anonymous"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] text-ink-900 font-medium truncate max-w-[200px]">{fileName}</p>
                  {fileSize > 0 && (
                    <p className="text-[11px] text-ink-400">{formatSize(fileSize)}</p>
                  )}
                </div>
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded-lg bg-paper-dark text-[12px] text-ink-500 font-medium active:scale-[0.97] transition-transform"
                >
                  换一张
                </button>
              </div>
            </div>

            {/* 搜索引擎列表 */}
            <div>
              <p className="text-[12px] text-ink-400 font-medium mb-2.5">选择搜索引擎，点击跳转搜索：</p>
              <div className="space-y-2.5">
                {SEARCH_ENGINES.map((engine) => {
                  const Icon = engine.icon
                  return (
                    <a
                      key={engine.name}
                      href={getSearchUrl(engine)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 bg-surface rounded-2xl shadow-card active:scale-[0.98] transition-all hover:shadow-card-hover"
                    >
                      <div className={`w-11 h-11 rounded-xl ${engine.bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon size={20} className={engine.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-ink-900 font-semibold">{engine.name}</p>
                        <p className="text-[11px] text-ink-400">{engine.desc}</p>
                      </div>
                      <ExternalLink size={16} className="text-ink-300 flex-shrink-0" />
                    </a>
                  )
                })}
              </div>
            </div>

            {/* 提示 */}
            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/30">
              <p className="text-[12px] text-emerald-800 font-medium mb-1">搜索技巧</p>
              <ul className="space-y-1.5 text-[11px] text-emerald-700 leading-relaxed">
                <li>• Yandex 的人脸识别能力最强，适合搜人</li>
                <li>• Google 图片索引最大，适合搜场景/物品</li>
                <li>• TinEye 专注图片溯源，能找到最早出现时间</li>
                <li>• 百度对中文互联网图片覆盖最好</li>
              </ul>
            </div>

            <div className="text-center py-3">
              <p className="text-[9px] text-ink-400 leading-relaxed">
                点击搜索引擎将跳转到对应网站<br />
                图片不会上传到观微服务器，搜索由第三方引擎完成
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
