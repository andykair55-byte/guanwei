import { X, Send, FileText } from 'lucide-react'
import { useEffect } from 'react'

export type PublishTarget = 'melon' | 'community'

interface PublishTargetSelectorProps {
  open: boolean
  onClose: () => void
  onSelect: (target: PublishTarget) => void
}

export default function PublishTargetSelector({ open, onClose, onSelect }: PublishTargetSelectorProps) {
  // ESC 关闭
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 animate-fade-in-up"
      onClick={onClose}
    >
      <div
        className="bg-paper-0 rounded-2xl shadow-xl w-[90%] max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100">
          <h3 className="text-[16px] font-semibold text-ink-900">选择发布目标</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-400 hover:bg-paper-100 hover:text-ink-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* 选项 */}
        <div className="p-4 space-y-2">
          <button
            onClick={() => onSelect('melon')}
            className="w-full flex items-start gap-3 px-4 py-3 rounded-xl border border-ink-100 hover:border-seal-600 hover:bg-seal-50/30 transition-colors text-left group"
          >
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-seal-50 text-seal-600 flex items-center justify-center group-hover:bg-seal-100">
              <Send size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-medium text-ink-900">发布到瓜田佐证</div>
              <div className="text-[12px] text-ink-500 mt-0.5">作为佐证提交到瓜田，需通过求证审核</div>
            </div>
          </button>

          <button
            onClick={() => onSelect('community')}
            className="w-full flex items-start gap-3 px-4 py-3 rounded-xl border border-ink-100 hover:border-seal-600 hover:bg-seal-50/30 transition-colors text-left group"
          >
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-paper-100 text-ink-600 flex items-center justify-center group-hover:bg-ink-100">
              <FileText size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-medium text-ink-900">发布到社区帖子</div>
              <div className="text-[12px] text-ink-500 mt-0.5">直接作为社区帖子发布，参与讨论</div>
            </div>
          </button>
        </div>

        <div className="px-5 py-3 bg-paper-50 border-t border-ink-100 text-[12px] text-ink-400 text-center">
          选择后将跳转到对应发布页
        </div>
      </div>
    </div>
  )
}
