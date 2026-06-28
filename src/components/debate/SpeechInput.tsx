import { useState } from 'react'
import { Send, Mic } from 'lucide-react'

interface SpeechInputProps {
  charLimit: number
  isSpeaking: boolean
  onSubmit: (content: string) => void
  disabled?: boolean
}

export default function SpeechInput({
  charLimit,
  isSpeaking,
  onSubmit,
  disabled = false,
}: SpeechInputProps) {
  const [text, setText] = useState('')
  const charCount = text.length
  const ratio = charLimit > 0 ? charCount / charLimit : 0

  const counterColor =
    ratio > 0.9
      ? 'text-red-500'
      : ratio > 0.7
        ? 'text-amber-500'
        : 'text-bamboo'

  const isOverLimit = charCount > charLimit
  const canSubmit = !disabled && !isSpeaking && charCount > 0 && !isOverLimit

  const handleSubmit = () => {
    if (!canSubmit) return
    onSubmit(text.trim())
    setText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="w-full max-w-[480px] mx-auto px-3 pb-2">
      <div className="flex items-end gap-2 bg-surface border border-border-line rounded-xl p-2 shadow-card">
        {/* Textarea */}
        <div className="flex-1 flex flex-col">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || isSpeaking}
            placeholder={isSpeaking ? '等待发言完成...' : '输入你的论点...'}
            rows={2}
            className="
              w-full resize-none bg-transparent outline-none
              text-sm text-text-ink-900 placeholder:text-text-ink-400
              leading-relaxed
            "
          />
          {/* Counter */}
          <div className="flex items-center justify-between mt-1">
            <span className={`text-[11px] font-medium ${counterColor}`}>
              {charCount}/{charLimit}
            </span>
            {isOverLimit && (
              <span className="text-[10px] text-red-500">超出限制</span>
            )}
          </div>
        </div>

        {/* Voice button (placeholder) */}
        <div className="relative group shrink-0">
          <button
            type="button"
            disabled
            className="
              w-9 h-9 flex items-center justify-center rounded-full
              bg-surface border border-border-line/50
              text-text-ink-400 cursor-not-allowed
            "
          >
            <Mic className="w-4 h-4" />
          </button>
          {/* Tooltip */}
          <span className="
            absolute bottom-full left-1/2 -translate-x-1/2 mb-1
            px-2 py-0.5 rounded bg-text-ink-700 text-white text-[10px]
            whitespace-nowrap opacity-0 group-hover:opacity-100
            transition-opacity pointer-events-none
          ">
            即将开放
          </span>
        </div>

        {/* Submit button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`
            shrink-0 w-9 h-9 flex items-center justify-center rounded-full
            transition-colors
            ${canSubmit
              ? 'bg-seal text-white hover:bg-seal/90 active:scale-95'
              : 'bg-border-line/30 text-text-ink-400 cursor-not-allowed'}
          `}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
