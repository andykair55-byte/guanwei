import { Calendar, MessageSquare, GitCompare, Sparkles } from 'lucide-react'
import { PRESET_TEMPLATES, PRESET_TEMPLATE_META, type PresetType, type SkeletonInput } from '../../services/creationService'
import type { SkeletonSection } from '../../stores/creationStore'

interface PresetTemplatePickerProps {
  input: SkeletonInput
  onSelect: (skeleton: { title: string; sections: SkeletonSection[] }) => void
}

const ICON_MAP = {
  event: Calendar,
  opinion: MessageSquare,
  comparison: GitCompare,
} as const

const ICON_COLOR_CLASS: Record<PresetType, string> = {
  event: 'bg-amber-50 text-amber-600 group-hover:bg-amber-100',
  opinion: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100',
  comparison: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100',
}

const PRESET_ORDER: PresetType[] = ['event', 'opinion', 'comparison']

/**
 * 预设模板选择器（LLM 不可用时的降级方案）
 * 复用 creationService 的 PRESET_TEMPLATES 生成骨架。
 */
export default function PresetTemplatePicker({ input, onSelect }: PresetTemplatePickerProps) {
  return (
    <div className="rounded-xl border border-ink-100 bg-paper-0 overflow-hidden">
      {/* 头部 */}
      <div className="px-4 py-3 border-b border-ink-100 bg-paper-50">
        <div className="flex items-center gap-1.5">
          <Sparkles size={14} className="text-seal-600" />
          <span className="text-[13px] font-medium text-ink-800">无法连接 AI，使用预设模板</span>
        </div>
        <p className="mt-1 text-[12px] text-ink-500">选择一个模板生成骨架，可在右侧面板继续编辑</p>
      </div>

      {/* 模板卡片 */}
      <div className="p-3 grid grid-cols-1 gap-2">
        {PRESET_ORDER.map(type => {
          const meta = PRESET_TEMPLATE_META[type]
          const Icon = ICON_MAP[meta.icon]
          const template = PRESET_TEMPLATES[type](input)
          return (
            <button
              key={type}
              onClick={() => onSelect(template)}
              className="group w-full flex items-start gap-3 px-3 py-3 rounded-xl border border-ink-100 hover:border-seal-600 hover:bg-seal-50/30 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-seal-600/40"
            >
              <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${ICON_COLOR_CLASS[type]} transition-colors`}>
                <Icon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-medium text-ink-900">{meta.name}</span>
                  <span className="text-[11px] text-ink-400">{template.sections.length} 节</span>
                </div>
                <p className="mt-0.5 text-[12px] text-ink-500 leading-snug">{meta.description}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {template.sections.slice(0, 4).map((s, i) => (
                    <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded bg-paper-100 text-[10px] text-ink-500">
                      {s.title}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
