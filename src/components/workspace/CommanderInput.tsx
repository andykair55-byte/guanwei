import { useState, useRef, useEffect } from 'react'
import { ArrowUp, Paperclip, AtSign, Sparkles } from 'lucide-react'

interface CommanderInputProps {
  onSend: (text: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

export default function CommanderInput({ onSend, disabled, placeholder = '输入/触发技能，或 @Agent', className }: CommanderInputProps) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [text])

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className={`px-4 pb-3 ${className || ''}`}>
      <div className="flex items-end gap-2 bg-paper-0 border border-ink-200 rounded-2xl px-3 py-2 focus-within:border-seal-500 focus-within:ring-2 focus-within:ring-seal-100 transition-all">
        <div className="flex items-center gap-1 pb-1">
          <button className="p-1 rounded-md text-ink-300 hover:text-ink-500 hover:bg-paper-100 transition-colors" title="附件">
            <Paperclip size={16} />
          </button>
          <button className="p-1 rounded-md text-ink-300 hover:text-ink-500 hover:bg-paper-100 transition-colors" title="@Agent">
            <AtSign size={16} />
          </button>
          <button className="p-1 rounded-md text-ink-300 hover:text-ink-500 hover:bg-paper-100 transition-colors" title="技能">
            <Sparkles size={16} />
          </button>
        </div>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-transparent text-[14px] text-ink-800 placeholder-ink-300 outline-none py-1 min-h-[24px] max-h-[120px]"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          className={`p-2 rounded-xl transition-colors ${
            text.trim() && !disabled
              ? 'bg-seal-600 text-white hover:bg-seal-500'
              : 'bg-paper-100 text-ink-300'
          }`}
        >
          <ArrowUp size={16} />
        </button>
      </div>
    </div>
  )
}
