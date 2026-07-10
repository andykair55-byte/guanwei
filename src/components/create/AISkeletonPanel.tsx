import { useState } from 'react'
import { Check, Edit, Trash2, AlertCircle, Sparkles } from 'lucide-react'
import type { SkeletonSection } from '../../stores/creationStore'

interface AISkeletonPanelProps {
  title: string
  sections: SkeletonSection[]
  onToggleAccepted: (id: string) => void
  onUpdateSection: (id: string, partial: Partial<SkeletonSection>) => void
  onRemoveSection: (id: string) => void
}

export default function AISkeletonPanel({
  title,
  sections,
  onToggleAccepted,
  onUpdateSection,
  onRemoveSection,
}: AISkeletonPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editPoints, setEditPoints] = useState('')

  const startEdit = (section: SkeletonSection) => {
    setEditingId(section.id)
    setEditTitle(section.title)
    setEditPoints(section.points.join('\n'))
  }

  const saveEdit = () => {
    if (!editingId) return
    onUpdateSection(editingId, {
      title: editTitle.trim() || '未命名章节',
      points: editPoints.split('\n').map(p => p.trim()).filter(Boolean),
    })
    setEditingId(null)
    setEditTitle('')
    setEditPoints('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditTitle('')
    setEditPoints('')
  }

  return (
    <div className="bg-paper-0 rounded-xl border border-ink-100 overflow-hidden">
      {/* 头部 */}
      <div className="px-5 py-4 border-b border-ink-100 bg-paper-50">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-seal-600" />
          <span className="text-[13px] text-ink-500">AI 骨架</span>
        </div>
        <h2 className="mt-1 text-[18px] font-semibold text-ink-900 leading-snug">{title}</h2>
      </div>

      {/* 章节 */}
      <div className="divide-y divide-ink-100">
        {sections.length === 0 && (
          <div className="px-5 py-8 text-center text-[13px] text-ink-300">
            所有章节已删除
          </div>
        )}

        {sections.map((section, idx) => {
          const isEditing = editingId === section.id
          return (
            <div key={section.id} className="px-5 py-4">
              {isEditing ? (
                <div className="space-y-3">
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-ink-200 text-[14px] text-ink-900 focus:border-seal-600 transition-colors"
                    placeholder="章节标题"
                  />
                  <textarea
                    value={editPoints}
                    onChange={(e) => setEditPoints(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-ink-200 text-[14px] text-ink-900 focus:border-seal-600 transition-colors resize-none"
                    rows={Math.max(3, editPoints.split('\n').length + 1)}
                    placeholder="每行一个要点"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={saveEdit}
                      className="px-3 py-1.5 rounded-lg bg-ink-900 text-paper-0 text-[13px] hover:bg-ink-800 transition-colors"
                    >
                      保存
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-1.5 rounded-lg border border-ink-200 text-ink-600 text-[13px] hover:bg-paper-100 transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-ink-100 text-ink-600 text-[12px] font-medium flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-[15px] font-medium text-ink-900">{section.title}</h3>
                        {section.accepted && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[11px] font-medium">
                            <Check size={10} /> 已接受
                          </span>
                        )}
                      </div>
                      {section.points.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {section.points.map((point, pIdx) => (
                            <li key={pIdx} className="flex items-start gap-2 text-[14px] text-ink-600 leading-relaxed">
                              <span className="flex-shrink-0 mt-1.5 w-1 h-1 rounded-full bg-ink-300" />
                              <span className="flex-1">{point}</span>
                              {section.needsVerification && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 text-[11px] font-medium flex-shrink-0">
                                  <AlertCircle size={10} /> 待核查
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-1 ml-8">
                    <button
                      onClick={() => onToggleAccepted(section.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12px] font-medium transition-colors ${
                        section.accepted
                          ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          : 'bg-paper-100 text-ink-600 hover:bg-ink-100'
                      }`}
                    >
                      <Check size={12} />
                      {section.accepted ? '已接受' : '接受'}
                    </button>
                    <button
                      onClick={() => startEdit(section)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12px] font-medium bg-paper-100 text-ink-600 hover:bg-ink-100 transition-colors"
                    >
                      <Edit size={12} /> 修改
                    </button>
                    <button
                      onClick={() => onRemoveSection(section.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12px] font-medium text-ink-500 hover:bg-seal-50 hover:text-seal-600 transition-colors"
                    >
                      <Trash2 size={12} /> 删除
                    </button>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
