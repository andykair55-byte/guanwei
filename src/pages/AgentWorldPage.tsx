import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Save,
  Send,
  Sparkles,
  Loader2,
  AlertCircle,
  FileText,
  CheckCircle,
  AlertTriangle,
  X,
  Eye,
  ThumbsUp,
  Target,
  Shield,
} from 'lucide-react'
import { useCreationStore } from '../stores/creationStore'
import { generateSkeleton, extractClaims, verifyClaim, getPresetTemplate, type PresetType, type ExtractedClaim } from '../services/creationService'
import AISkeletonPanel from '../components/create/AISkeletonPanel'
import WritingBoard from '../components/create/WritingBoard'
import ReferencePanel, {
  type ContextSource,
  type AISuggestion,
} from '../components/create/ReferencePanel'
import PublishTargetSelector, { type PublishTarget } from '../components/create/PublishTargetSelector'
import { useFragmentStore, type Fragment as StoreFragment } from '../stores/fragmentStore'
import { useUserStore, type UserCreation } from '../stores/userStore'

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

// ===== 测试用例 — 模拟从瓜田进入工作间的完整链路 =====
// 访问 /agent-world?demo=true 可以看到预填数据演示

const MOCK_MELON_CONTEXT = {
  title: '南开大学学生被诈骗220万：谁的责任？',
  description: '近日，南开大学一名学生被电信诈骗220万元的消息登上热搜。据称诈骗分子冒充公检法人员，以"涉嫌洗钱"为由诱导该学生转账。事件引发广泛讨论：有人认为这是学生缺乏防范意识，也有人认为学校和银行应承担更多责任。目前警方已介入调查。',
  existingEvidence: [
    '南开大学保卫处：已开展反诈宣传活动，每月至少一次讲座',
    '有用户指出：220万金额远超普通学生积蓄，资金来源存疑，可能涉及家庭借贷',
    '反诈中心数据：2025年大学生被诈骗案同比下降15%，但单案金额上升',
    '心理学角度：冒充公检法是经典诈骗话术，利用权威恐惧心理，不完全是"傻"',
  ],
}

const DEMO_FRAGMENTS: StoreFragment[] = [
  {
    id: 'demo-frag-1',
    type: 'link',
    content: '公安部2025年反诈报告：电信网络诈骗案件数量同比下降12.3%，但涉案总金额上升8.7%，说明单案金额在变大。大学生群体被骗占比18%，同比下降3个百分点。',
    source: 'https://example.com/mps-2025-report',
    sourceTitle: '公安部2025年反诈工作报告',
  },
  {
    id: 'demo-frag-2',
    type: 'quote',
    content: '南开大学在2025年共举办反诈讲座12场，覆盖新生入学教育。但受访学生中仍有43%表示"听说过但不太了解具体手法"。',
    source: 'https://example.com/nankai-anti-scam',
    sourceTitle: '南开大学反诈教育报道',
  },
  {
    id: 'demo-frag-3',
    type: 'note',
    content: '核心矛盾：学生说"没人教过"，学校说"教过了"。问题可能不是"有没有教"，而是"教的方式有没有用"。讲座式的反诈教育效果有限，需要更贴近真实场景的演练。',
  },
]

export default function AgentWorldPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

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

  // 求证相关
  const [extractingClaims, setExtractingClaims] = useState(false)
  const [claims, setClaims] = useState<ExtractedClaim[]>([])
  const [verifyingClaimId, setVerifyingClaimId] = useState<string | null>(null)
  const [verifiedResults, setVerifiedResults] = useState<Record<string, string>>({})

  // 发布反馈
  const [publishedCreation, setPublishedCreation] = useState<UserCreation | null>(null)

  // textarea ref（用于光标位置插入引用）
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const publishCreation = useUserStore((s) => s.publishCreation)

  const {
    fragments,
    melonContext,
    addFragment,
    addContextFragments,
    setMelonContext,
  } = useFragmentStore()

  // 检测演示模式
  const isDemo = searchParams.get('demo') === 'true'
  const melonId = searchParams.get('melonId') || (isDemo ? 'demo-melon-001' : null)

  const canGenerate = draft.topic.trim().length > 0 && draft.stance !== ''

  // 演示模式：自动填充全部上下文
  useEffect(() => {
    if (!isDemo) return
    setDraft({
      topic: MOCK_MELON_CONTEXT.title,
      stance: 'neutral',
      targetReader: '大学生、教育工作者',
      melonId: 'demo-melon-001',
    })
    addContextFragments(DEMO_FRAGMENTS as StoreFragment[])
    setMelonContext({
      melonId: 'demo-melon-001',
      title: MOCK_MELON_CONTEXT.title,
      description: MOCK_MELON_CONTEXT.description,
      evidenceCount: MOCK_MELON_CONTEXT.existingEvidence.length,
      evidences: MOCK_MELON_CONTEXT.existingEvidence.map((text, i) => ({
        id: `ev-demo-${i}`,
        content: text,
        userNickname: `佐证${i + 1}`,
        direction: i % 2 === 0,
      })),
    })
  }, [isDemo]) // eslint-disable-line react-hooks/exhaustive-deps

  // 构建瓜上下文（从 URL 参数或 sessionStorage 读取真实数据，演示模式用 mock）
  const realMelon = useMemo(() => {
    if (isDemo) return null

    const title = searchParams.get('title')
    const desc = searchParams.get('description')
    if (!title || !desc) return null

    let evidences: Array<{ id: string; content: string; userNickname: string; direction: boolean }> = []
    try {
      const stored = sessionStorage.getItem(`melon-evidence-${melonId}`)
      if (stored) evidences = JSON.parse(stored)
    } catch { /* ignore */ }

    const evidenceCount = Number(searchParams.get('evidenceCount')) || evidences.length

    return { title, description: desc, evidences, evidenceCount }
  }, [melonId, isDemo, searchParams])

  const contextSource = useMemo<ContextSource | null>(() => {
    if (!melonId) return null
    if (realMelon) {
      return {
        id: `melon-${melonId}`,
        type: 'melon',
        title: realMelon.title,
        summary: realMelon.description.slice(0, 80) + '...',
      }
    }
    // 演示模式 fallback
    return {
      id: `melon-${melonId}`,
      type: 'melon',
      title: MOCK_MELON_CONTEXT.title,
      summary: MOCK_MELON_CONTEXT.description.slice(0, 80) + '...',
    }
  }, [melonId, isDemo, realMelon])

  const contextEvidences: ContextSource[] = useMemo(() => {
    if (!melonId) return []
    const list = realMelon?.evidences ?? MOCK_MELON_CONTEXT.existingEvidence.map((text, i) => ({
      id: `ev-${i}`,
      content: text,
      userNickname: `佐证${i + 1}`,
      direction: i % 2 === 0,
    }))
    return list.map((ev, i) => ({
      id: `evidence-${ev.id || i}`,
      type: 'evidence' as const,
      title: `${ev.userNickname}：认为${ev.direction ? '真' : '假'}`,
      summary: ev.content.slice(0, 60) + '...',
    }))
  }, [melonId, isDemo, realMelon])

  // AI 建议
  const suggestions: AISuggestion[] = useMemo(() => {
    const list: AISuggestion[] = []
    if (draft.skeleton && draft.skeleton.length > 0) {
      const pendingVerify = draft.skeleton.filter(s => s.needsVerification && !s.accepted)
      if (pendingVerify.length > 0) {
        list.push({
          id: 'verify',
          type: 'verify',
          label: `${pendingVerify.length} 条声明待核查`,
          description: '骨架中包含需要事实核查的内容',
        })
      }
    }
    if (contextSource && !draft.skeleton) {
      list.push({
        id: 'skeleton',
        type: 'skeleton',
        label: '基于素材生成骨架',
        description: '根据已带入的上下文，AI 可以帮你快速搭建文章结构',
      })
    }
    return list
  }, [draft.skeleton, contextSource])

  // 如果是从瓜田来的，自动填入主题 + melonId
  useEffect(() => {
    if (!melonId) return
    const topicFromUrl = searchParams.get('title') || ''
    if (!draft.topic && topicFromUrl) {
      setDraft({ topic: topicFromUrl, melonId })
    } else if (!draft.melonId) {
      setDraft({ melonId })
    }
  }, [melonId]) // eslint-disable-line react-hooks/exhaustive-deps

  // 从瓜田进入时，将瓜上下文（标题、描述、佐证）写入 fragmentStore
  useEffect(() => {
    if (!melonId || isDemo || !realMelon) return
    // 避免重复写入同一瓜的上下文
    if (melonContext?.melonId === melonId) return

    setMelonContext({
      melonId,
      title: realMelon.title,
      description: realMelon.description,
      evidenceCount: realMelon.evidenceCount,
      evidences: realMelon.evidences,
    })

    // 将关键信息作为碎片写入，方便用户在参考面板引用
    addContextFragments([
      {
        id: `ctx-melon-title-${melonId}`,
        type: 'quote' as const,
        content: realMelon.title,
        sourceTitle: '瓜话题',
      },
      {
        id: `ctx-melon-desc-${melonId}`,
        type: 'note' as const,
        content: realMelon.description,
        sourceTitle: '瓜描述',
      },
      ...realMelon.evidences.slice(0, 3).map((ev, i) => ({
        id: `ctx-evidence-${melonId}-${i}`,
        type: 'quote' as const,
        content: ev.content,
        sourceTitle: `${ev.userNickname}（认为${ev.direction ? '真' : '假'}）`,
      })),
    ])
  }, [melonId, isDemo, realMelon]) // eslint-disable-line react-hooks/exhaustive-deps

  // 生成骨架（传入碎片以实现基于素材的结构建议）
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
        fragments: fragments.length > 0 ? fragments.map(f => ({
          type: f.type,
          content: f.content,
          sourceTitle: f.sourceTitle,
        })) : undefined,
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

  // 引用碎片到写作区（在光标位置插入）
  const handleUseFragment = (id: string) => {
    const fragment = fragments.find(f => f.id === id)
    if (!fragment) return

    const el = textareaRef.current
    const label = fragment.sourceTitle ? fragment.sourceTitle : '引用'
    const insertion = `\n\n> [${label}] ${fragment.content}\n\n`

    if (el) {
      const start = el.selectionStart
      const end = el.selectionEnd
      const before = draft.content.slice(0, start)
      const after = draft.content.slice(end)
      const newContent = before + insertion + after
      setDraft({ content: newContent })
      // 恢复光标到插入内容之后
      requestAnimationFrame(() => {
        const pos = start + insertion.length
        el.selectionStart = el.selectionEnd = pos
        el.focus()
      })
    } else {
      // 没有 ref 时降级为追加
      setDraft({ content: draft.content + insertion })
    }
  }

  // 手动收集碎片
  const handleCollect = (text: string) => {
    const isUrl = text.startsWith('http://') || text.startsWith('https://')
    addFragment({
      type: isUrl ? 'link' : 'note',
      content: text,
      source: isUrl ? text : undefined,
      sourceTitle: isUrl ? text.slice(0, 40) + '...' : undefined,
    })
  }

  // 一键求证：提取声明 + 逐条核查
  const handleExtractClaims = useCallback(async () => {
    if (extractingClaims || !draft.content.trim()) return
    setExtractingClaims(true)
    try {
      const result = await extractClaims(draft.content)
      setClaims(result)
    } catch {
      setClaims([])
    } finally {
      setExtractingClaims(false)
    }
  }, [draft.content, extractingClaims])

  const handleVerifySingleClaim = useCallback(async (claimId: string, text: string) => {
    if (verifyingClaimId) return
    setVerifyingClaimId(claimId)
    try {
      const result = await verifyClaim(text)
      setVerifiedResults(prev => ({ ...prev, [claimId]: result }))
    } catch {
      setVerifiedResults(prev => ({ ...prev, [claimId]: '核查服务暂不可用' }))
    } finally {
      setVerifyingClaimId(null)
    }
  }, [verifyingClaimId])

  // 发布目标选择
  const handlePublishTarget = (target: PublishTarget) => {
    setPublishOpen(false)
    const creation = publishCreation({
      title: draft.title || draft.topic,
      type: target === 'melon' ? 'evidence' : 'post',
      melonId: draft.melonId,
      content: draft.content,
    })
    setPublishedCreation(creation)
  }

  // 关闭发布反馈
  const handleDismissFeedback = () => {
    setPublishedCreation(null)
  }

  // 参考面板
  const referencePanel = (
    <ReferencePanel
      contextSources={
        contextSource
          ? [contextSource, ...contextEvidences]
          : []
      }
      fragments={fragments as StoreFragment[]}
      suggestions={suggestions}
      onUseFragment={handleUseFragment}
      onPasteCollect={handleCollect}
      className="h-full"
    />
  )

  return (
    <div className="h-full flex flex-col bg-paper-50">
      {/* 顶部工具栏 */}
      <header className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-ink-100 bg-paper-0 z-10">
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

      {/* 写作板：左右分栏 */}
      <WritingBoard referencePanel={referencePanel}>
        {/* 选题区 */}
        <section className="bg-paper-0 rounded-xl border border-ink-100 p-5 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-seal-600" />
            <h2 className="text-[14px] font-medium text-ink-900">选题</h2>
            {contextSource && (
              <span className="px-2 py-0.5 rounded-full bg-seal-50 text-seal-600 text-[11px] font-medium">
                来自瓜田
              </span>
            )}
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
          <section className="bg-paper-0 rounded-xl border border-ink-100 p-8 mb-5">
            <div className="flex flex-col items-center justify-center text-center">
              <Loader2 size={24} className="text-seal-600 animate-spin mb-3" />
              <p className="text-[13px] text-ink-500">正在生成骨架…</p>
            </div>
          </section>
        ) : draft.skeleton && draft.skeleton.length > 0 ? (
          <div className="mb-5">
            <AISkeletonPanel
              title={draft.title || draft.topic}
              sections={draft.skeleton}
              onToggleAccepted={toggleSectionAccepted}
              onUpdateSection={updateSection}
              onRemoveSection={removeSection}
            />
          </div>
        ) : null}

        {/* 错误提示 + 模板降级 */}
        {generateError && (
          <section className="bg-seal-50 rounded-xl border border-seal-100 p-4 mb-5">
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
              onClick={handleExtractClaims}
              disabled={extractingClaims || !draft.content.trim()}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12px] font-medium text-ink-500 hover:bg-paper-100 hover:text-seal-600 disabled:opacity-40 transition-colors"
              title="扫描内容中的事实声明并逐条核查"
            >
              {extractingClaims ? (
                <><Loader2 size={12} className="animate-spin" /> 扫描中…</>
              ) : (
                <><Shield size={12} /> 一键求证</>
              )}
            </button>
          </div>

          <input
            value={draft.title}
            onChange={(e) => setDraft({ title: e.target.value })}
            placeholder="标题"
            className="w-full mb-3 px-3 py-2 rounded-xl border border-ink-100 text-[18px] font-semibold text-ink-900 placeholder:text-ink-300 focus:border-seal-600 transition-colors"
          />

          <textarea
            ref={textareaRef}
            value={draft.content}
            onChange={(e) => setDraft({ content: e.target.value })}
            placeholder="在这里开始创作…"
            className="w-full px-4 py-3 rounded-xl border border-ink-100 text-[14px] text-ink-800 leading-relaxed placeholder:text-ink-300 focus:border-seal-600 transition-colors resize-none min-h-[320px]"
          />

          {/* ClaimVerifier 声明核查面板 */}
          {claims.length > 0 && (
            <ClaimPanel
              claims={claims}
              verifyingClaimId={verifyingClaimId}
              verifiedResults={verifiedResults}
              onVerify={handleVerifySingleClaim}
              onDismiss={() => setClaims([])}
            />
          )}
        </section>
      </WritingBoard>

      {/* 发布反馈面板 */}
      {publishedCreation && (
        <PublishFeedback
          creation={publishedCreation}
          melonTitle={draft.topic}
          onDismiss={handleDismissFeedback}
        />
      )}

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

// ===== ClaimVerifier 声明核查面板 =====

const CLAIM_TYPE_LABEL: Record<string, string> = {
  fact: '事实',
  statistic: '数据',
  quote: '引用',
  prediction: '预测',
}

function ClaimPanel({
  claims,
  verifyingClaimId,
  verifiedResults,
  onVerify,
  onDismiss,
}: {
  claims: ExtractedClaim[]
  verifyingClaimId: string | null
  verifiedResults: Record<string, string>
  onVerify: (id: string, text: string) => void
  onDismiss: () => void
}) {
  return (
    <div className="mt-4 rounded-xl border border-seal-100 bg-seal-50/30 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-seal-100/50">
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-seal-600" />
          <span className="text-[13px] font-medium text-ink-900">发现 {claims.length} 条待核查声明</span>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 rounded-lg text-ink-400 hover:text-ink-600 hover:bg-paper-100 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
      <div className="divide-y divide-seal-100/30">
        {claims.map((claim) => {
          const isVerifying = verifyingClaimId === claim.id
          const result = verifiedResults[claim.id]
          return (
            <div key={claim.id} className="px-4 py-3">
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 mt-0.5 px-1.5 py-0.5 rounded bg-ink-100 text-[10px] font-medium text-ink-500">
                  {CLAIM_TYPE_LABEL[claim.type] || claim.type}
                </span>
                <p className="flex-1 text-[13px] text-ink-800 leading-relaxed">{claim.text}</p>
                <button
                  onClick={() => onVerify(claim.id, claim.text)}
                  disabled={isVerifying || !!result}
                  className="flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-seal-600 text-paper-0 hover:bg-seal-500 disabled:opacity-40 transition-colors"
                >
                  {isVerifying ? (
                    <><Loader2 size={11} className="animate-spin inline mr-1" />核查中</>
                  ) : result ? (
                    '已核查'
                  ) : (
                    '核查'
                  )}
                </button>
              </div>
              {result && (
                <div className="mt-2 pl-7 flex items-start gap-1.5">
                  {result.includes('可信') ? (
                    <CheckCircle size={13} className="text-bamboo-600 flex-shrink-0 mt-0.5" />
                  ) : result.includes('存疑') ? (
                    <AlertTriangle size={13} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle size={13} className="text-ink-400 flex-shrink-0 mt-0.5" />
                  )}
                  <p className="text-[12px] text-ink-600 leading-relaxed">{result}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ===== 发布反馈面板 =====

function PublishFeedback({
  creation,
  melonTitle,
  onDismiss,
}: {
  creation: UserCreation
  melonTitle: string
  onDismiss: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 animate-fade-in-up">
      <div className="bg-paper-0 rounded-2xl shadow-xl w-[90%] max-w-sm overflow-hidden">
        <div className="px-5 pt-5 pb-4">
          <div className="w-12 h-12 rounded-xl bg-seal-50 flex items-center justify-center mb-3">
            <CheckCircle size={24} className="text-seal-600" />
          </div>
          <h3 className="text-[16px] font-semibold text-ink-900 mb-1">发布成功</h3>
          <p className="text-[13px] text-ink-500">
            你的{creation.type === 'evidence' ? '佐证' : '帖子'}已提交{creation.type === 'evidence' ? '到瓜田' : '到社区'}
          </p>

          {/* 影响力数据 */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="bg-paper-50 rounded-xl p-3 text-center">
              <Eye size={16} className="text-ink-400 mx-auto mb-1" />
              <div className="text-[18px] font-bold text-ink-900">{creation.views}</div>
              <div className="text-[11px] text-ink-400">阅读</div>
            </div>
            <div className="bg-paper-50 rounded-xl p-3 text-center">
              <ThumbsUp size={16} className="text-ink-400 mx-auto mb-1" />
              <div className="text-[18px] font-bold text-ink-900">{creation.likes}</div>
              <div className="text-[11px] text-ink-400">点赞</div>
            </div>
            <div className="bg-paper-50 rounded-xl p-3 text-center">
              <Target size={16} className="text-seal-600 mx-auto mb-1" />
              <div className="text-[18px] font-bold text-seal-600">{creation.impactCount}</div>
              <div className="text-[11px] text-ink-400">改变判断</div>
            </div>
          </div>

          <p className="mt-3 text-[12px] text-ink-400 leading-relaxed">
            积分 +5。影响力数据会随时间更新，你可以在个人中心查看。
          </p>
        </div>

        <div className="flex border-t border-ink-100">
          <button
            onClick={onDismiss}
            className="flex-1 py-3 text-[13px] font-medium text-ink-600 hover:bg-paper-50 transition-colors"
          >
            继续创作
          </button>
          <div className="w-px bg-ink-100" />
          <button
            onClick={onDismiss}
            className="flex-1 py-3 text-[13px] font-medium text-seal-600 hover:bg-seal-50/50 transition-colors"
          >
            返回瓜田
          </button>
        </div>
      </div>
    </div>
  )
}