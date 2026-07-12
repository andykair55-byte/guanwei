import { Sparkles, ArrowRight } from 'lucide-react'
import { WORK_EXAMPLES, type WorkExample } from './examples'

interface ExampleGalleryProps {
  onSelect: (example: WorkExample) => void
  className?: string
}

export default function ExampleGallery({ onSelect, className = '' }: ExampleGalleryProps) {
  return (
    <div className={`bg-paper-0 rounded-2xl p-6 ${className}`}>
      {/* 标题区 */}
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={16} className="text-seal-600" />
        <h3 className="text-[15px] font-semibold text-ink-900">案例样板</h3>
      </div>
      <p className="text-[13px] text-ink-400 mb-5">看看别人怎么写的，或者直接使用模板开始</p>

      {/* 卡片网格：小屏垂直 / 中屏起三列水平 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {WORK_EXAMPLES.map((example) => (
          <article
            key={example.id}
            className="group flex flex-col rounded-xl border border-ink-100 bg-paper-0 p-4 transition-all duration-200 hover:shadow-card-hover hover:-translate-y-1 hover:border-ink-200"
          >
            {/* 分类标签 */}
            <span className="inline-flex self-start px-2 py-0.5 rounded-md bg-seal-50 text-seal-600 text-[11px] font-medium mb-3">
              {example.category}
            </span>

            {/* 标题（2行截断） */}
            <h4 className="text-[14px] font-semibold text-ink-900 leading-snug line-clamp-2 mb-2">
              {example.title}
            </h4>

            {/* 一句话描述 */}
            <p className="flex-1 text-[12px] text-ink-500 leading-relaxed line-clamp-2 mb-4">
              {example.description}
            </p>

            {/* 使用此模板按钮 */}
            <button
              onClick={() => onSelect(example)}
              className="inline-flex items-center justify-center gap-1 w-full px-3 py-2 rounded-lg bg-paper-100 text-ink-700 text-[12px] font-medium hover:bg-ink-900 hover:text-paper-0 transition-colors"
            >
              使用此模板
              <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          </article>
        ))}
      </div>
    </div>
  )
}
