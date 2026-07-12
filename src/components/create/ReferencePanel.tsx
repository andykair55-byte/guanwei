import { useState, type ReactNode } from 'react'
import { Package, ClipboardList, Sparkles, Link, Plus, FileText, MessageSquare, Trash2 } from 'lucide-react'

// ===== Types =====

export interface ContextSource {
  id: string
  type: 'melon' | 'evidence' | 'post'
  title: string
  summary: string
}

export interface Fragment {
  id: string
  type: 'link' | 'quote' | 'note'
  content: string
  source?: string
  sourceTitle?: string
}

export interface AISuggestion {
  id: string
  type: 'skeleton' | 'verify' | 'insight'
  label: string
  description: string
  action?: () => void
}

// ===== Panel Section =====

function PanelSection({
  icon,
  title,
  count,
  defaultOpen = true,
  children,
}: {
  icon: ReactNode
  title: string
  count?: number
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-ink-100 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-[13px] font-medium text-ink-700 hover:bg-paper-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-ink-400">{icon}</span>
          <span>{title}</span>
          {count !== undefined && (
            <span className="px-1.5 py-0.5 rounded-full bg-paper-200 text-[11px] text-ink-500 font-normal">
              {count}
            </span>
          )}
        </div>
        <svg
          className={`w-3.5 h-3.5 text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  )
}

// ===== Context Material Card =====

function ContextCard({ source, onUse }: { source: ContextSource; onUse?: (source: ContextSource) => void }) {
  const iconMap = {
    melon: <Package size={14} className="text-seal-600" />,
    evidence: <FileText size={14} className="text-bamboo-600" />,
    post: <MessageSquare size={14} className="text-gold-600" />,
  }

  return (
    <div className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-paper-50 border border-ink-100 text-left w-full group hover:border-ink-200 transition-colors cursor-pointer">
      <span className="flex-shrink-0 mt-0.5">{iconMap[source.type]}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-medium text-ink-800 truncate">{source.title}</div>
        <div className="text-[11px] text-ink-400 line-clamp-2 mt-0.5">{source.summary}</div>
      </div>
      <button
        onClick={() => onUse?.(source)}
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-paper-200 text-ink-400 hover:text-seal-600 transition-all"
        title="引用到写作区"
      >
        <Plus size={14} />
      </button>
    </div>
  )
}

// ===== Fragment Card =====

function FragmentCard({ fragment, onUse, onDelete }: { fragment: Fragment; onUse?: (id: string) => void; onDelete?: (id: string) => void }) {
  const typeIcon = {
    link: <Link size={14} className="text-ink-400" />,
    quote: <MessageSquare size={14} className="text-ink-400" />,
    note: <FileText size={14} className="text-ink-400" />,
  }

  return (
    <div className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-paper-0 border border-ink-100 text-left w-full group hover:border-ink-300 transition-colors cursor-pointer">
      <span className="flex-shrink-0 mt-0.5">{typeIcon[fragment.type]}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] text-ink-700 line-clamp-2">{fragment.content}</div>
        {fragment.sourceTitle && (
          <div className="text-[11px] text-ink-400 truncate mt-0.5">来源：{fragment.sourceTitle}</div>
        )}
      </div>
      <div className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onUse?.(fragment.id)}
          className="p-1 rounded hover:bg-paper-100 text-ink-400 hover:text-seal-600 transition-colors"
          title="引用到写作区"
        >
          <Plus size={14} />
        </button>
        <button
          onClick={() => onDelete?.(fragment.id)}
          className="p-1 rounded hover:bg-paper-100 text-ink-400 hover:text-seal-600 transition-colors"
          title="删除碎片"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ===== AI Suggestion Card =====

function SuggestionCard({ suggestion }: { suggestion: AISuggestion }) {
  const iconMap = {
    skeleton: <Sparkles size={14} className="text-seal-600" />,
    verify: <ClipboardList size={14} className="text-amber-600" />,
    insight: <Sparkles size={14} className="text-bamboo-600" />,
  }

  return (
    <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-gradient-to-r from-seal-50/50 to-amber-50/30 border border-seal-100/50 text-left w-full">
      <span className="flex-shrink-0 mt-0.5">{iconMap[suggestion.type]}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-medium text-ink-800">{suggestion.label}</div>
        <div className="text-[11px] text-ink-500 mt-0.5">{suggestion.description}</div>
        {suggestion.action && (
          <button
            onClick={suggestion.action}
            className="mt-1.5 text-[11px] font-medium text-seal-600 hover:underline"
          >
            查看 →
          </button>
        )}
      </div>
    </div>
  )
}

// ===== Main ReferencePanel =====

interface ReferencePanelProps {
  contextSources?: ContextSource[]
  fragments?: Fragment[]
  suggestions?: AISuggestion[]
  onUseFragment?: (id: string) => void
  onDeleteFragment?: (id: string) => void
  onUseContextSource?: (source: ContextSource) => void
  onPasteCollect?: (text: string) => void
  className?: string
}

export default function ReferencePanel({
  contextSources = [],
  fragments = [],
  suggestions = [],
  onUseFragment,
  onDeleteFragment,
  onUseContextSource,
  onPasteCollect,
  className = '',
}: ReferencePanelProps) {
  const [collectInput, setCollectInput] = useState('')

  const handleCollect = () => {
    if (!collectInput.trim()) return
    onPasteCollect?.(collectInput.trim())
    setCollectInput('')
  }

  return (
    <div className={`flex flex-col bg-paper-50 border-l border-ink-100 overflow-y-auto ${className}`}>
      {/* 面板标题 */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-ink-100">
        <h2 className="text-[13px] font-medium text-ink-500">参考面板</h2>
      </div>

      {/* 上下文素材 */}
      {contextSources.length > 0 && (
        <PanelSection icon={<Package size={14} />} title="上下文素材" count={contextSources.length}>
          <div className="space-y-1.5">
            {contextSources.map(s => (
              <ContextCard key={s.id} source={s} onUse={onUseContextSource} />
            ))}
          </div>
        </PanelSection>
      )}

      {/* 手动收集 */}
      <PanelSection icon={<ClipboardList size={14} />} title="手动收集" count={fragments.length}>
        {/* 收集输入框 */}
        <div className="flex gap-1.5 mb-2.5">
          <input
            value={collectInput}
            onChange={(e) => setCollectInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCollect()}
            placeholder="粘贴链接或文本..."
            className="flex-1 px-2.5 py-1.5 rounded-lg border border-ink-100 text-[12px] text-ink-800 placeholder:text-ink-300 focus:border-seal-400 transition-colors outline-none"
          />
          <button
            onClick={handleCollect}
            disabled={!collectInput.trim()}
            className="px-2 py-1.5 rounded-lg bg-ink-900 text-paper-0 text-[12px] font-medium hover:bg-ink-800 disabled:opacity-40 transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* 碎片列表 */}
        {fragments.length > 0 ? (
          <div className="space-y-1.5">
            {fragments.map(f => (
              <FragmentCard key={f.id} fragment={f} onUse={onUseFragment} onDelete={onDeleteFragment} />
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-ink-400 text-center py-2">
            粘贴链接或文本到上方输入框，收集的素材会出现在这里
          </p>
        )}
      </PanelSection>

      {/* AI 建议 */}
      <PanelSection icon={<Sparkles size={14} />} title="AI 建议" count={suggestions.length} defaultOpen={false}>
        <div className="space-y-2">
          {suggestions.length > 0 ? (
            suggestions.map(s => (
              <SuggestionCard key={s.id} suggestion={s} />
            ))
          ) : (
            <p className="text-[11px] text-ink-400 text-center py-2">
              收集更多素材后，AI 会提供建议
            </p>
          )}
        </div>
      </PanelSection>
    </div>
  )
}