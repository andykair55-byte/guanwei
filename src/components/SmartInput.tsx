import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Clipboard, Camera, Link2, Loader2, X, Sparkles,
} from 'lucide-react'
import { recognizeText } from '../services/ocrService'
import { fetchUrlContent, isUrl } from '../services/urlFetcher'

interface SmartInputProps {
  value: string
  onChange: (v: string) => void
  onSubmit?: () => void
  submitLabel?: string
  submitIcon?: React.ComponentType<{ size?: number; className?: string }>
  placeholder?: string
  rows?: number
  disabled?: boolean
  /** Accent colour for buttons — Tailwind class e.g. 'bg-seal' */
  accentBg?: string
  /** Show the submit button (some parents handle submit externally) */
  showSubmit?: boolean
}

type InputMode = 'text' | 'ocr' | 'url'

export default function SmartInput({
  value,
  onChange,
  onSubmit,
  submitLabel = '提交',
  submitIcon: SubmitIcon,
  placeholder = '粘贴文字、链接，或上传截图...',
  rows = 4,
  disabled = false,
  accentBg = 'bg-seal',
  showSubmit = true,
}: SmartInputProps) {
  const [mode, setMode] = useState<InputMode>('text')
  const [ocrProgress, setOcrProgress] = useState<number | null>(null)
  const [fetching, setFetching] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [pasteMsg, setPasteMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Clean up object URLs on unmount
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  // ---- Image OCR ----
  const handleImageFile = useCallback(async (file: File) => {
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setMode('ocr')
    setOcrProgress(0)
    try {
      const result = await recognizeText(file, (pct) => setOcrProgress(pct))
      if (result.text) {
        onChange(result.text)
      } else {
        onChange('')
      }
    } catch (e) {
      console.error('OCR failed:', e)
    } finally {
      setOcrProgress(null)
    }
  }, [onChange])

  // ---- Clipboard paste (explicit user action) ----
  const handlePaste = useCallback(async () => {
    try {
      // Check for image in clipboard first
      const items = await navigator.clipboard.read()
      for (const item of items) {
        const imageType = item.types.find(t => t.startsWith('image/'))
        if (imageType) {
          const blob = await item.getType(imageType)
          handleImageFile(new File([blob], 'clipboard.png', { type: imageType }))
          return
        }
      }
      // No image — read text
      const text = await navigator.clipboard.readText()
      if (text) {
        onChange(text)
        // Auto-detect URL
        if (isUrl(text)) {
          setMode('url')
        }
        setPasteMsg('已粘贴')
        setTimeout(() => setPasteMsg(''), 1500)
      }
    } catch {
      setPasteMsg('剪贴板不可用，请手动粘贴')
      setTimeout(() => setPasteMsg(''), 2000)
    }
  }, [onChange, handleImageFile])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleImageFile(file)
  }

  // ---- URL fetch ----
  const handleUrlFetch = useCallback(async () => {
    if (!isUrl(value)) return
    setFetching(true)
    try {
      const result = await fetchUrlContent(value.trim())
      if (result.text) {
        const header = result.title ? `[${result.title}]\n\n` : ''
        onChange(header + result.text)
        setMode('text')
      } else {
        // Show error in textarea temporarily
        onChange(value + '\n\n[错误] ' + (result.errorMessage || '抓取失败'))
      }
    } catch {
      onChange(value + '\n\n[错误] 抓取失败，请手动复制内容粘贴')
    } finally {
      setFetching(false)
    }
  }, [value, onChange])

  // Detect URL when value changes
  useEffect(() => {
    if (isUrl(value) && mode === 'text') {
      setMode('url')
    } else if (!isUrl(value) && mode === 'url') {
      setMode('text')
    }
  }, [value, mode])

  const showUrlBar = mode === 'url' && isUrl(value)

  return (
    <div className="bg-surface rounded-2xl shadow-card p-4 space-y-3">
      {/* Textarea */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className="w-full text-[14px] text-ink-900 placeholder:text-ink-400 resize-none leading-relaxed disabled:opacity-50 bg-transparent outline-none"
      />

      {/* OCR progress */}
      {ocrProgress !== null && (
        <div className="flex items-center gap-3 px-1">
          <Loader2 size={16} className="animate-spin text-seal" />
          <div className="flex-1 h-2 bg-paper-dark rounded-full overflow-hidden">
            <div
              className="h-full bg-seal rounded-full transition-all duration-300"
              style={{ width: `${ocrProgress}%` }}
            />
          </div>
          <span className="text-[11px] text-ink-500">{ocrProgress}%</span>
        </div>
      )}

      {/* Image preview */}
      {previewUrl && ocrProgress === null && (
        <div className="relative inline-block">
          <img src={previewUrl} alt="上传的截图" className="max-h-32 rounded-lg border border-line/30" />
          <button
            onClick={() => { setPreviewUrl(null); onChange('') }}
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-ink-700 text-white flex items-center justify-center"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* URL fetch bar */}
      {showUrlBar && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200/50 rounded-xl animate-fade-in-up">
          <Link2 size={14} className="text-blue-500 flex-shrink-0" />
          <span className="text-[12px] text-blue-700 flex-1 truncate">检测到链接，可自动抓取内容</span>
          <button
            onClick={handleUrlFetch}
            disabled={fetching}
            className="px-3 py-1 rounded-lg bg-blue-500 text-white text-[11px] font-medium active:scale-95 transition-transform disabled:opacity-50 flex items-center gap-1"
          >
            {fetching ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
            {fetching ? '抓取中...' : '抓取'}
          </button>
        </div>
      )}

      {/* Action buttons row */}
      <div className="flex gap-2">
        {/* Paste */}
        <button
          onClick={handlePaste}
          disabled={disabled}
          className="flex-1 py-2.5 rounded-xl bg-paper-dark text-[12px] text-ink-500 font-medium active:scale-[0.97] transition-transform flex items-center justify-center gap-1.5 disabled:opacity-40 relative"
        >
          <Clipboard size={13} />
          粘贴
          {pasteMsg && (
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-ink-800 text-white text-[10px] rounded-md whitespace-nowrap animate-fade-in-up">
              {pasteMsg}
            </span>
          )}
        </button>

        {/* Screenshot OCR */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          className="flex-1 py-2.5 rounded-xl bg-paper-dark text-[12px] text-ink-500 font-medium active:scale-[0.97] transition-transform flex items-center justify-center gap-1.5 disabled:opacity-40"
        >
          <Camera size={13} />
          截图识别
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFileInput}
          className="hidden"
        />

        {/* Clear */}
        <button
          onClick={() => { onChange(''); setPreviewUrl(null); setMode('text') }}
          disabled={disabled}
          className="py-2.5 px-4 rounded-xl bg-paper-dark text-[12px] text-ink-500 font-medium active:scale-[0.97] transition-transform flex items-center justify-center gap-1.5 disabled:opacity-40"
        >
          <X size={13} />
        </button>
      </div>

      {/* Submit */}
      {showSubmit && onSubmit && (
        <button
          onClick={onSubmit}
          disabled={!value.trim() || disabled}
          className={`w-full py-3.5 rounded-xl ${accentBg} text-white font-semibold text-[14px] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-seal-glow`}
        >
          {SubmitIcon && <SubmitIcon size={16} />}
          {submitLabel}
        </button>
      )}
    </div>
  )
}
