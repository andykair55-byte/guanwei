import { Copy, ExternalLink, LoaderCircle, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { PLATFORM_LIST, PLATFORM_TEMPLATES, type PlatformId } from '../../config/platformTemplates'

interface PlatformSwitcherProps {
  activePlatform: PlatformId
  onPlatformChange: (platform: PlatformId) => void
  // 每个平台的内容缓存（由父组件管理）
  platformContents: Record<PlatformId, string>
  onContentChange: (platform: PlatformId, content: string) => void
  // 生成指定平台版本
  onGenerate: (platform: PlatformId) => void
  // 正在生成的平台
  generatingPlatform: PlatformId | null
  className?: string
}

export default function PlatformSwitcher({
  activePlatform,
  onPlatformChange,
  platformContents,
  onGenerate,
  generatingPlatform,
  className,
}: PlatformSwitcherProps) {
  const [copied, setCopied] = useState(false)
  const isGenerating = generatingPlatform !== null
  const activeTemplate = PLATFORM_TEMPLATES[activePlatform]
  const activeContent = platformContents[activePlatform] ?? ''
  const wordCount = activeContent.length

  const handleCopy = async () => {
    if (!activeContent) return
    try {
      await navigator.clipboard.writeText(activeContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // 剪贴板不可用时静默失败
    }
  }

  const handleOpenPublish = () => {
    window.open(activeTemplate.publishUrl, '_blank')
  }

  const handleGenerateAll = () => {
    PLATFORM_LIST.forEach((p) => onGenerate(p.id))
  }

  return (
    <div className={className}>
      {/* Tab 栏 */}
      <div className="flex items-center gap-1 px-1 py-1 border-b border-ink-100">
        <span className="flex items-center gap-1 px-2 text-[13px] text-ink-500 font-medium shrink-0">
          📂 发布到：
        </span>
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {PLATFORM_LIST.map((p) => {
            const isActive = p.id === activePlatform
            const isLoading = generatingPlatform === p.id
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onPlatformChange(p.id)}
                className={[
                  'flex items-center gap-1 px-3 py-1.5 rounded-t-lg text-[13px] font-medium transition-colors',
                  isActive
                    ? 'text-ink-900 border-b-2 border-seal-600'
                    : 'text-ink-400 hover:text-ink-600 hover:bg-paper-50',
                ].join(' ')}
              >
                <span>{p.icon}</span>
                <span>{p.name}</span>
                {isLoading && (
                  <LoaderCircle size={12} className="animate-spin text-seal-600" />
                )}
              </button>
            )
          })}
        </div>
        <button
          type="button"
          onClick={handleGenerateAll}
          disabled={isGenerating}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[13px] font-medium text-seal-600 border border-seal-600/40 hover:bg-seal-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 ml-1"
        >
          {isGenerating ? (
            <LoaderCircle size={13} className="animate-spin" />
          ) : (
            <Sparkles size={13} />
          )}
          全部生成
        </button>
      </div>

      {/* 状态栏 */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-paper-50 text-[12px]">
        <div className="flex items-center gap-2 text-ink-600 min-w-0">
          <span className="flex items-center gap-1 shrink-0">
            当前：{activeTemplate.icon} {activeTemplate.name}
          </span>
          <span className="text-ink-300">|</span>
          <span className="shrink-0">字数：{wordCount.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            disabled={activeContent.length === 0}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-ink-500 hover:text-ink-900 hover:bg-paper-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Copy size={12} />
            {copied ? '已复制' : '复制内容'}
          </button>
          <button
            type="button"
            onClick={handleOpenPublish}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-ink-500 hover:text-ink-900 hover:bg-paper-100 transition-colors"
          >
            <ExternalLink size={12} />
            打开发布页
          </button>
        </div>
      </div>
    </div>
  )
}
