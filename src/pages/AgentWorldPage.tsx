import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Save,
  Send,
  Sparkles,
  Loader2,
  AlertCircle,
  FileText,
} from 'lucide-react'
import { useCreationStore } from '../stores/creationStore'
import { generateSkeleton, getPresetTemplate, type PresetType } from '../services/creationService'
import AISkeletonPanel from '../components/create/AISkeletonPanel'
import PublishTargetSelector, { type PublishTarget } from '../components/create/PublishTargetSelector'

type Stance = 'affirm' | 'negate' | 'neutral' | ''

const STANCE_OPTIONS: { id: Stance; label: string; desc: string }[] = [
  { id: 'affirm', label: '正方', desc: '支持主题观点' },
  { id: 'negate', label: '反方', desc: '反对主题观点' },
  { id: 'neutral', label: '中立', desc: '客观分析' },
]

const PRESET_OPTIONS: { id: PresetType; label: string }[] = [
  { id: 'event', label: '事件分析' },
  { id: 'opinion', label: '观点论述' },
  { id: 'comparison', label: '对比评测' },
]

export default function AgentWorldPage() {
  const navigate = useNavigate()
  const {
    draft,
    isGenerating,
    generateError,
    setDraft,
    setSkeleton,
    toggleSectionAccepted,
    updateSection,
    removeSection,
    setGenerating,
    setGenerateError,
  } = useCreationStore()

  const [publishOpen, setPublishOpen] = useState(false)
  const [showPresets, setShowPresets] = useState(false)

  const canGenerate = draft.topic.trim().length > 0 && draft.stance !== ''

  // 生成骨架
  const handleGenerate = async () => {
    if (!canGenerate || isGenerating) return
    setGenerating(true)
    setGenerateError(null)
    setShowPresets(false)
    try {
      const result = await generateSkeleton({
        topic: draft.topic.trim(),
        stance: STANCE_OPTIONS.find(o => o.id === draft.stance)?.label || draft.stance,
        targetReader: draft.targetReader.trim(),
      })
      setSkeleton(result.sections)
      if (!draft.title) setDraft({ title: result.title })
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : '生成失败')
      setShowPresets(true)
    } finally {
      setGenerating(false)
    }
  }

  // 使用模板降级
  const handleUsePreset = (type: PresetType) => {
    const result = getPresetTemplate(type, {
      topic: draft.topic.trim(),
      stance: STANCE_OPTIONS.find(o => o.id === draft.stance)?.label || draft.stance,
      targetReader: draft.targetReader.trim(),
    })
    setSkeleton(result.sections)
    if (!draft.title) setDraft({ title: result.title })
    setShowPresets(false)
    setGenerateError(null)
  }

  // 选中文字求证（占位：实际可对接 verify）
  const handleVerifySelection = () => {
    const selection = window.getSelection()?.toString().trim()
    if (!selection) return
    // 直接跳转到求证页（这里仅演示，可扩展传递参数）
    navigate('/verify')
  }

  // 发布目标选择
  const handlePublishTarget = (target: PublishTarget) => {
    setPublishOpen(false)
    if (target === 'melon') navigate('/verify')
    else navigate('/publish')
  }

  return (
    <div className="h-full flex flex-col bg-paper-50">
      {/* 顶部工具栏 */}
      <header className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-ink-100 bg-paper-0">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-[13px] text-ink-500 hover:text-ink-900 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>返回</span>
        </button>

        <h1 className="text-[16px] font-semibold text-ink-900">工作间</h1>

        <div className="flex items-center gap-2">
          <SaveStatus lastSaved={draft.lastSaved} />
          <button
            onClick={() => setPublishOpen(true)}
            disabled={!draft.title && !draft.content}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-seal-600 text-paper-0 text-[13px] font-medium hover:bg-seal-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={14} />
            发布
          </button>
        </div>
      </header>

      {/* 主体 */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="px-5 py-5 space-y-5 max-w-[1100px] mx-auto">
          {/* 选题区 */}
          <section className="bg-paper-0 rounded-xl border border-ink-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={16} className="text-seal-600" />
              <h2 className="text-[14px] font-medium text-ink-900">选题</h2>
            </div>

            <div className="space-y-3">
              <input
                value={draft.topic}
                onChange={(e) => setDraft({ topic: e.target.value })}
                placeholder="输入创作主题，例如：AI是否会取代创作者"
                className="w-full px-4 py-2.5 rounded-xl border border-ink-100 text-[14px] text-ink-900 placeholder:text-ink-300 focus:border-seal-600 transition-colors"
              />

              <div className="flex flex-wrap gap-2">
                {STANCE_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setDraft({ stance: opt.id })}
                    className={`px-3 py-1.5 rounded-xl text-[13px] font-medium transition-colors ${
                      draft.stance === opt.id
                        ? 'bg-ink-900 text-paper-0'
                        : 'bg-paper-100 text-ink-600 hover:bg-ink-100'
                    }`}
                    title={opt.desc}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  value={draft.targetReader}
                  onChange={(e) => setDraft({ targetReader: e.target.value })}
                  placeholder="目标读者（可选，如：科技从业者）"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-ink-100 text-[14px] text-ink-900 placeholder:text-ink-300 focus:border-seal-600 transition-colors"
                />
                <button
                  onClick={handleGenerate}
                  disabled={!canGenerate || isGenerating}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-ink-900 text-paper-0 text-[13px] font-medium hover:bg-ink-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isGenerating ? (
                    <><Loader2 size={14} className="animate-spin" /> 生成中</>
                  ) : (
                    <><Sparkles size={14} /> 生成骨架</>
                  )}
                </button>
              </div>
            </div>
          </section>

          {/* AI 骨架面板 */}
          {isGenerating ? (
            <section className="bg-paper-0 rounded-xl border border-ink-100 p-8">
              <div className="flex flex-col items-center justify-center text-center">
                <Loader2 size={24} className="text-seal-600 animate-spin mb-3" />
                <p className="text-[13px] text-ink-500">正在生成骨架…</p>
              </div>
            </section>
          ) : draft.skeleton && draft.skeleton.length > 0 ? (
            <AISkeletonPanel
              title={draft.title || draft.topic}
              sections={draft.skeleton}
              onToggleAccepted={toggleSectionAccepted}
              onUpdateSection={updateSection}
              onRemoveSection={removeSection}
            />
          ) : (
            <section className="bg-paper-0 rounded-xl border border-ink-100 p-8">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-11 h-11 rounded-full bg-paper-100 flex items-center justify-center mb-3">
                  <FileText size={20} className="text-ink-300" />
                </div>
                <p className="text-[14px] text-ink-500 font-medium">尚未生成骨架</p>
                <p className="mt-1 text-[12px] text-ink-400">输入主题与立场后，点击"生成骨架"</p>
              </div>
            </section>
          )}

          {/* 错误提示 + 模板降级 */}
          {generateError && (
            <section className="bg-seal-50 rounded-xl border border-seal-100 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-seal-600" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-seal-600">生成失败</p>
                  <p className="mt-1 text-[12px] text-ink-600 break-words">{generateError}</p>
                  {!showPresets ? (
                    <button
                      onClick={() => setShowPresets(true)}
                      className="mt-2 text-[12px] font-medium text-seal-600 hover:underline"
                    >
                      使用模板降级 →
                    </button>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {PRESET_OPTIONS.map(p => (
                        <button
                          key={p.id}
                          onClick={() => handleUsePreset(p.id)}
                          className="px-3 py-1 rounded-lg bg-paper-0 border border-ink-100 text-[12px] text-ink-600 hover:border-seal-600 hover:text-seal-600 transition-colors"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* 内容编辑区 */}
          <section className="bg-paper-0 rounded-xl border border-ink-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-ink-500" />
                <h2 className="text-[14px] font-medium text-ink-900">内容编辑</h2>
              </div>
              <button
                onClick={handleVerifySelection}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12px] font-medium text-ink-500 hover:bg-paper-100 hover:text-seal-600 transition-colors"
                title="选中文字后点击"
              >
                <Sparkles size={12} /> 一键求证
              </button>
            </div>

            <input
              value={draft.title}
              onChange={(e) => setDraft({ title: e.target.value })}
              placeholder="标题"
              className="w-full mb-3 px-3 py-2 rounded-xl border border-ink-100 text-[18px] font-semibold text-ink-900 placeholder:text-ink-300 focus:border-seal-600 transition-colors"
            />

            <textarea
              value={draft.content}
              onChange={(e) => setDraft({ content: e.target.value })}
              placeholder="在这里开始创作…"
              className="w-full px-4 py-3 rounded-xl border border-ink-100 text-[14px] text-ink-800 leading-relaxed placeholder:text-ink-300 focus:border-seal-600 transition-colors resize-none min-h-[320px]"
            />
          </section>
        </div>
      </div>

      <PublishTargetSelector
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        onSelect={handlePublishTarget}
      />
    </div>
  )
}

// 草稿保存状态指示器
function SaveStatus({ lastSaved }: { lastSaved: number }) {
  const [label, setLabel] = useState('')

  useEffect(() => {
    if (lastSaved === 0) {
      setLabel('')
      return
    }
    const update = () => {
      const diff = Math.floor((Date.now() - lastSaved) / 1000)
      if (diff < 5) setLabel('已保存')
      else if (diff < 60) setLabel(`${diff}秒前保存`)
      else if (diff < 3600) setLabel(`${Math.floor(diff / 60)}分钟前保存`)
      else setLabel('已保存')
    }
    update()
    // 每3秒刷新保存状态显示（草稿本身由 zustand persist 实时持久化到 localStorage）
    const t = setInterval(update, 3000)
    return () => clearInterval(t)
  }, [lastSaved])

  if (!label) {
    return <Save size={14} className="text-ink-300" />
  }
  return (
    <span className="inline-flex items-center gap-1 text-[12px] text-ink-400">
      <Save size={12} />
      {label}
    </span>
  )
}
