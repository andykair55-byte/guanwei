import { useState, type RefObject } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize' // spec-19: XSS 防护，清理 markdown 中的恶意 HTML
import {
  Bold,
  Italic,
  Heading2,
  Quote,
  List,
  Link as LinkIcon,
  Minus,
  Eye,
  Pencil,
} from 'lucide-react'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  textareaRef?: RefObject<HTMLTextAreaElement | null>
  className?: string
}

type Mode = 'edit' | 'preview'

const TOOLBAR = [
  { icon: Bold, before: '**', after: '**', placeholder: '粗体文字', label: '粗体' },
  { icon: Italic, before: '*', after: '*', placeholder: '斜体文字', label: '斜体' },
  { icon: Heading2, before: '## ', after: '', placeholder: '标题', label: '标题' },
  { icon: Quote, before: '> ', after: '', placeholder: '引用内容', label: '引用' },
  { icon: List, before: '- ', after: '', placeholder: '列表项', label: '列表' },
  { icon: LinkIcon, before: '[', after: '](url)', placeholder: '链接文字', label: '链接' },
  { icon: Minus, before: '\n---\n', after: '', placeholder: '', label: '分割线' },
] as const

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = '在这里开始创作…',
  textareaRef,
  className = '',
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<Mode>('edit')

  const insertMarkdown = (before: string, after: string, defaultText: string) => {
    const el = textareaRef?.current
    if (!el) {
      onChange(value + before + defaultText + after)
      return
    }
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = value.slice(start, end) || defaultText
    const newText = value.slice(0, start) + before + selected + after + value.slice(end)
    onChange(newText)
    requestAnimationFrame(() => {
      el.focus()
      el.selectionStart = start + before.length
      el.selectionEnd = start + before.length + selected.length
    })
  }

  return (
    <div className={`rounded-xl border border-ink-100 overflow-hidden bg-paper-0 ${className}`}>
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-ink-100 bg-paper-50">
        {/* 格式化按钮 */}
        <div className="flex items-center gap-0.5">
          {TOOLBAR.map((tool) => {
            const Icon = tool.icon
            return (
              <button
                key={tool.label}
                onClick={() => insertMarkdown(tool.before, tool.after, tool.placeholder)}
                title={tool.label}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-400 hover:bg-paper-100 hover:text-ink-700 transition-colors"
              >
                <Icon size={14} />
              </button>
            )
          })}
        </div>

        {/* 编辑/预览切换 */}
        <div className="flex items-center gap-1 bg-paper-100 rounded-lg p-0.5">
          <button
            onClick={() => setMode('edit')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors ${
              mode === 'edit' ? 'bg-paper-0 text-ink-900 shadow-sm' : 'text-ink-400 hover:text-ink-600'
            }`}
          >
            <Pencil size={12} />
            编辑
          </button>
          <button
            onClick={() => setMode('preview')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors ${
              mode === 'preview' ? 'bg-paper-0 text-ink-900 shadow-sm' : 'text-ink-400 hover:text-ink-600'
            }`}
          >
            <Eye size={12} />
            预览
          </button>
        </div>
      </div>

      {/* 编辑区 / 预览区 */}
      {mode === 'edit' ? (
        <textarea
          ref={textareaRef as React.RefObject<HTMLTextAreaElement>}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3 text-[14px] text-ink-800 leading-[1.8] placeholder:text-ink-300 focus:outline-none resize-none min-h-[400px] bg-transparent"
          style={{ height: 'auto' }}
          onInput={(e) => {
            const el = e.currentTarget
            el.style.height = 'auto'
            el.style.height = Math.max(400, el.scrollHeight) + 'px'
          }}
        />
      ) : (
        <div className="px-4 py-4 overflow-y-auto min-h-[400px] max-h-[600px]">
          {value.trim() ? (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSanitize]}
                components={{
                  h1: ({ children }) => <h1 className="text-[22px] font-bold text-ink-900 mt-4 mb-3">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-[18px] font-bold text-ink-900 mt-5 mb-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-[16px] font-semibold text-ink-900 mt-4 mb-2">{children}</h3>,
                  p: ({ children }) => <p className="text-[14px] leading-[1.8] text-ink-700 mb-4">{children}</p>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-[3px] border-seal-600 bg-seal-50/30 px-4 py-2 rounded-r-lg mb-4 text-ink-600">
                      {children}
                    </blockquote>
                  ),
                  ul: ({ children }) => <ul className="text-[14px] text-ink-700 pl-6 mb-4 list-disc marker:text-seal-600">{children}</ul>,
                  ol: ({ children }) => <ol className="text-[14px] text-ink-700 pl-6 mb-4 list-decimal marker:text-seal-600">{children}</ol>,
                  li: ({ children }) => <li className="leading-[1.7] mb-1">{children}</li>,
                  code: ({ className, children, ...props }) => {
                    const isBlock = className?.includes('language-')
                    if (isBlock) {
                      return <pre className="bg-ink-900 text-paper-0 p-4 rounded-xl overflow-x-auto mb-4 text-[13px] font-mono"><code {...props}>{children}</code></pre>
                    }
                    return <code className="bg-ink-100 px-1.5 py-0.5 rounded text-[13px] font-mono text-ink-800">{children}</code>
                  },
                  pre: ({ children }) => <>{children}</>,
                  a: ({ children, href }) => <a href={href} className="text-seal-600 underline hover:text-seal-500 transition-colors">{children}</a>,
                  hr: () => <hr className="border-ink-100 my-6" />,
                  strong: ({ children }) => <strong className="font-semibold text-ink-900">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                  table: ({ children }) => <table className="w-full border-collapse text-[13px] mb-4">{children}</table>,
                  th: ({ children }) => <th className="border border-ink-100 px-3 py-2 bg-paper-50 font-medium text-ink-900 text-left">{children}</th>,
                  td: ({ children }) => <td className="border border-ink-100 px-3 py-2 text-ink-700">{children}</td>,
                }}
              >
                {value}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-[14px] text-ink-300 text-center py-12">还没有内容，切回编辑模式开始写作</p>
          )}
        </div>
      )}
    </div>
  )
}
