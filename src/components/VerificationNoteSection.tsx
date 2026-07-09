import { useState, useCallback, useEffect } from 'react'
import {
  FileCheck, ThumbsUp, ThumbsDown, ExternalLink, Sparkles,
  ChevronDown, ChevronUp, Plus, Shield, Loader2, Check, AlertTriangle, Link2,
} from 'lucide-react'

// ===== 类型 =====
interface VerificationNote {
  id: string
  content: string
  sources: NoteSource[]
  contributorName: string
  contributorAvatar: string
  contributorBadge: string
  helpfulCount: number
  notHelpfulCount: number
  isHelpful: boolean | null  // null=未投票
  status: 'published' | 'disputed' | 'pending'
  createdAt: string
}

interface NoteSource {
  title: string
  url: string
  type: 'official' | 'media' | 'social'  // 官方/媒体/社媒
  credibility: 1 | 2 | 3 | 4 | 5
}

interface AIDraft {
  content: string
  sources: NoteSource[]
  flaggedPoints: string[]
}

// ===== Mock 数据（MVP 阶段，后端接入后替换） =====
const MOCK_NOTES: VerificationNote[] = [
  {
    id: 'n1',
    content: '经核查，该消息源自2023年的旧闻翻炒。新华社已于2023年6月发布官方辟谣，确认相关说法不实。建议查看原文获取完整上下文。',
    sources: [
      { title: '新华社官方辟谣', url: 'https://www.xinhuanet.com/example', type: 'official', credibility: 5 },
      { title: '央视新闻报道', url: 'https://news.cctv.com/example', type: 'media', credibility: 5 },
    ],
    contributorName: '鉴瓜达人·小明',
    contributorAvatar: 'https://picsum.photos/seed/avatar12/60/60',
    contributorBadge: '鉴瓜达人',
    helpfulCount: 47,
    notHelpfulCount: 3,
    isHelpful: null,
    status: 'published',
    createdAt: '2024-03-15T10:30:00',
  },
  {
    id: 'n2',
    content: '该信息部分属实，但关键细节存在夸大。原始研究仅在小样本（n=30）中进行，结论不能推广到一般人群。论文原文已标注"需要进一步验证"。',
    sources: [
      { title: '原始论文（PubMed）', url: 'https://pubmed.ncbi.nlm.nih.gov/example', type: 'media', credibility: 4 },
    ],
    contributorName: '见微先知·博士',
    contributorAvatar: 'https://picsum.photos/seed/avatar33/60/60',
    contributorBadge: '见微先知',
    helpfulCount: 23,
    notHelpfulCount: 1,
    isHelpful: null,
    status: 'disputed',
    createdAt: '2024-03-15T11:00:00',
  },
]

const MOCK_AI_DRAFT: AIDraft = {
  content: '经AI初步检索，该信息的可信度存疑。以下是自动整理的上下文，请审阅后修改提交。',
  sources: [
    { title: '相关官方通报（待确认）', url: 'https://gov.cn/example', type: 'official', credibility: 5 },
    { title: '媒体报道（待确认）', url: 'https://news.example.com', type: 'media', credibility: 4 },
  ],
  flaggedPoints: [
    '原文中的数据"80%"未标注来源',
    '时间线存在矛盾：事件发生于2023年，但配图水印为2024年',
  ],
}

// ===== 工具函数 =====
function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  return new Date(iso).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

const sourceTypeConfig = {
  official: { label: '官方', color: 'text-blue-600', bg: 'bg-blue-50' },
  media: { label: '媒体', color: 'text-violet-600', bg: 'bg-violet-50' },
  social: { label: '社媒', color: 'text-ink-500', bg: 'bg-paper-dark' },
}

const statusConfig = {
  published: { label: '已采纳', icon: Check, color: 'text-bamboo', bg: 'bg-bamboo/10' },
  disputed: { label: '有争议', icon: AlertTriangle, color: 'text-gold', bg: 'bg-gold/10' },
  pending: { label: '审核中', icon: Loader2, color: 'text-ink-500', bg: 'bg-paper-dark' },
}

// ===== 笔记卡片 =====
function NoteCard({
  note,
  onVote,
}: {
  note: VerificationNote
  onVote: (id: string, vote: 'up' | 'down') => void
}) {
  const sConfig = statusConfig[note.status]
  const StatusIcon = sConfig.icon

  return (
    <div className={`rounded-xl border p-4 transition-all ${
      note.status === 'disputed' ? 'bg-amber-50/60 border-amber-200/50' : 'bg-[#fffef5] border-amber-100/60'
    }`}>
      {/* 贡献者信息 */}
      <div className="flex items-center gap-2 mb-3">
        <img src={note.contributorAvatar} alt="" className="w-6 h-6 rounded-full bg-paper-dark flex-shrink-0" />
        <span className="text-[13px] font-semibold text-ink-800">{note.contributorName}</span>
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${sConfig.bg} ${sConfig.color} flex items-center gap-1`}>
          <StatusIcon size={10} className={note.status === 'pending' ? 'animate-spin' : ''} />
          {sConfig.label}
        </span>
        <span className="text-[11px] text-ink-500 ml-auto">{formatTime(note.createdAt)}</span>
      </div>

      {/* 笔记正文 */}
      <p className="text-[14px] text-ink-900 leading-relaxed mb-3">{note.content}</p>

      {/* 来源链接 */}
      <div className="space-y-1.5 mb-3">
        {note.sources.map((src, i) => {
          const tConfig = sourceTypeConfig[src.type]
          return (
            <a
              key={i}
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 rounded-lg bg-surface/80 border border-line hover:border-seal/30 transition-all group"
            >
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${tConfig.bg} ${tConfig.color} flex-shrink-0`}>
                {tConfig.label}
              </span>
              <span className="text-[12px] text-ink-700 group-hover:text-seal truncate flex-1 font-medium">{src.title}</span>
              <ExternalLink size={11} className="text-ink-400 flex-shrink-0" />
            </a>
          )
        })}
      </div>

      {/* 投票栏 */}
      <div className="flex items-center gap-4 pt-2 border-t border-line/30">
        <button
          onClick={() => onVote(note.id, 'up')}
          className={`flex items-center gap-1.5 text-[12px] font-semibold transition-all press-pop ${
            note.isHelpful === true ? 'text-bamboo' : 'text-ink-500 hover:text-bamboo'
          }`}
        >
          <ThumbsUp size={13} className={note.isHelpful === true ? 'fill-bamboo' : ''} />
          有用 {note.helpfulCount}
        </button>
        <button
          onClick={() => onVote(note.id, 'down')}
          className={`flex items-center gap-1.5 text-[12px] font-semibold transition-all press-pop ${
            note.isHelpful === false ? 'text-seal' : 'text-ink-500 hover:text-seal'
          }`}
        >
          <ThumbsDown size={13} className={note.isHelpful === false ? 'fill-seal' : ''} />
          无用 {note.notHelpfulCount}
        </button>
      </div>
    </div>
  )
}

// ===== AI 草稿编辑器 =====
function AIDraftEditor({
  onSubmit,
  onCancel,
}: {
  onSubmit: (content: string, sources: NoteSource[]) => void
  onCancel: () => void
}) {
  const [phase, setPhase] = useState<'loading' | 'editing'>('loading')
  const [draft, setDraft] = useState<AIDraft | null>(null)
  const [content, setContent] = useState('')
  const [customSource, setCustomSource] = useState('')

  // 模拟 AI 检索来源 + 起草
  useEffect(() => {
    const timer = setTimeout(() => {
      setDraft(MOCK_AI_DRAFT)
      setContent(MOCK_AI_DRAFT.content)
      setPhase('editing')
    }, 1800)
    return () => clearTimeout(timer)
  }, [])

  const handleSubmit = () => {
    if (!content.trim() || !draft) return
    onSubmit(content.trim(), draft.sources)
  }

  const addSource = () => {
    if (!customSource.trim() || !draft) return
    const newSource: NoteSource = {
      title: customSource.trim(),
      url: customSource.trim().startsWith('http') ? customSource.trim() : `https://${customSource.trim()}`,
      type: 'social',
      credibility: 3,
    }
    setDraft({ ...draft, sources: [...draft.sources, newSource] })
    setCustomSource('')
  }

  if (phase === 'loading') {
    return (
      <div className="rounded-xl bg-[#fffef5] border border-amber-100/60 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-seal/10 flex items-center justify-center">
            <Sparkles size={14} className="text-seal" />
          </div>
          <span className="text-[14px] font-bold text-ink-900">AI 正在检索来源并起草笔记...</span>
        </div>
        <div className="space-y-2.5">
          {['检索权威信源...', '提取关键事实...', '标记争议点...', '生成草稿...'].map((step, i) => (
            <div key={i} className="flex items-center gap-2.5" style={{ animationDelay: `${i * 300}ms` }}>
              <Loader2 size={13} className="text-seal animate-spin" />
              <span className="text-[13px] text-ink-600 font-medium">{step}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-[#fffef5] border border-amber-100/60 p-4 space-y-4">
      {/* 标题 */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-seal/10 flex items-center justify-center">
          <Sparkles size={14} className="text-seal" />
        </div>
        <span className="text-[14px] font-bold text-ink-900">审阅 AI 草稿</span>
        <span className="text-[11px] text-ink-500 ml-auto">AI 起草，你把关</span>
      </div>

      {/* AI 标记的争议点 */}
      {draft && draft.flaggedPoints.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200/40 p-3">
          <p className="text-[12px] font-bold text-amber-800 mb-2 flex items-center gap-1.5">
            <AlertTriangle size={12} />
            AI 发现 {draft.flaggedPoints.length} 个可疑点
          </p>
          <div className="space-y-1.5">
            {draft.flaggedPoints.map((point, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[11px] text-amber-600 font-bold mt-0.5">·</span>
                <p className="text-[12px] text-amber-800 leading-relaxed">{point}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 编辑区 */}
      <div>
        <label className="text-[13px] font-semibold text-ink-700 block mb-2">笔记内容（可直接编辑）</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          maxLength={500}
          className="w-full px-3.5 py-3 rounded-xl bg-surface border border-line text-[14px] text-ink-900 resize-none leading-relaxed outline-none focus:border-seal/40"
        />
        <div className="text-right text-[11px] text-ink-500 mt-1">{content.length}/500</div>
      </div>

      {/* 来源列表 */}
      <div>
        <label className="text-[13px] font-semibold text-ink-700 block mb-2">
          来源（{draft?.sources.length || 0} 条）
        </label>
        <div className="space-y-1.5 mb-2">
          {draft?.sources.map((src, i) => {
            const tConfig = sourceTypeConfig[src.type]
            return (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-surface border border-line">
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${tConfig.bg} ${tConfig.color} flex-shrink-0`}>
                  {tConfig.label}
                </span>
                <span className="text-[12px] text-ink-700 truncate flex-1 font-medium">{src.title}</span>
                <button
                  onClick={() => setDraft(draft ? { ...draft, sources: draft.sources.filter((_, j) => j !== i) } : null)}
                  className="text-ink-400 hover:text-seal text-[11px] flex-shrink-0"
                >
                  删除
                </button>
              </div>
            )
          })}
        </div>
        {/* 添加自定义来源 */}
        <div className="flex gap-2">
          <input
            value={customSource}
            onChange={(e) => setCustomSource(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSource()}
            placeholder="粘贴来源链接..."
            className="flex-1 px-3 py-2 rounded-lg bg-surface border border-line text-[13px] text-ink-900 placeholder:text-ink-500 outline-none focus:border-seal/40"
          />
          <button
            onClick={addSource}
            disabled={!customSource.trim()}
            className="px-3 py-2 rounded-lg bg-paper-dark text-[13px] text-ink-700 font-medium press-pop disabled:opacity-40 flex items-center gap-1"
          >
            <Link2 size={13} />
            添加
          </button>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl bg-paper-dark text-[14px] text-ink-600 font-semibold press-pop"
        >
          取消
        </button>
        <button
          onClick={handleSubmit}
          disabled={!content.trim()}
          className="flex-1 py-3 rounded-xl bg-seal text-white text-[14px] font-bold press-pop disabled:opacity-40 shadow-seal-glow flex items-center justify-center gap-1.5"
        >
          <Shield size={15} />
          提交笔记
        </button>
      </div>
    </div>
  )
}

// ===== 主组件 =====
interface VerificationNoteSectionProps {
  melonId: string
  melonTitle: string
  activeTab: 'notes' | 'comments'
  onTabChange: (tab: 'notes' | 'comments') => void
}

export default function VerificationNoteSection({ melonId: _melonId, melonTitle: _melonTitle, activeTab, onTabChange }: VerificationNoteSectionProps) {
  const [notes, setNotes] = useState<VerificationNote[]>(MOCK_NOTES)
  const [showDraftEditor, setShowDraftEditor] = useState(false)
  const [showAllNotes, setShowAllNotes] = useState(false)
  const [submittedAnim, setSubmittedAnim] = useState(false)

  const handleVote = useCallback((id: string, vote: 'up' | 'down') => {
    setNotes(prev => prev.map(n => {
      if (n.id !== id) return n
      // 切换投票
      const wasUp = n.isHelpful === true
      const wasDown = n.isHelpful === false
      let helpfulCount = n.helpfulCount
      let notHelpfulCount = n.notHelpfulCount
      let isHelpful: boolean | null = null

      if (vote === 'up') {
        if (wasUp) { helpfulCount-- } else { helpfulCount++; if (wasDown) notHelpfulCount-- }
        isHelpful = wasUp ? null : true
      } else {
        if (wasDown) { notHelpfulCount-- } else { notHelpfulCount++; if (wasUp) helpfulCount-- }
        isHelpful = wasDown ? null : false
      }
      return { ...n, helpfulCount, notHelpfulCount, isHelpful }
    }))
  }, [])

  const handleSubmitNote = useCallback((content: string, sources: NoteSource[]) => {
    const newNote: VerificationNote = {
      id: `n_${Date.now()}`,
      content,
      sources,
      contributorName: '你',
      contributorAvatar: 'https://picsum.photos/seed/avatar1/60/60',
      contributorBadge: '鉴瓜学徒',
      helpfulCount: 0,
      notHelpfulCount: 0,
      isHelpful: null,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    setNotes(prev => [newNote, ...prev])
    setShowDraftEditor(false)
    setSubmittedAnim(true)
    setTimeout(() => setSubmittedAnim(false), 2500)
  }, [])

  const visibleNotes = showAllNotes ? notes : notes.slice(0, 2)
  const pendingCount = notes.filter(n => n.status === 'pending').length

  return (
    <div className="mx-5 mt-4">
      {/* Tab 切换 */}
      <div className="flex items-center gap-1 mb-3 border-b border-line">
        <button
          onClick={() => onTabChange('notes')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-[14px] font-bold transition-all relative ${
            activeTab === 'notes' ? 'text-seal' : 'text-ink-500'
          }`}
        >
          <FileCheck size={15} />
          求证笔记
          {notes.length > 0 && (
            <span className={`text-[11px] px-1.5 py-0.5 rounded-md font-medium ${
              activeTab === 'notes' ? 'bg-seal/10 text-seal' : 'bg-paper-dark text-ink-500'
            }`}>
              {notes.length}
            </span>
          )}
          {activeTab === 'notes' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-seal" />}
        </button>
        <button
          onClick={() => onTabChange('comments')}
          className={`px-4 py-2.5 text-[14px] font-bold transition-all relative ${
            activeTab === 'comments' ? 'text-ink-900' : 'text-ink-500'
          }`}
        >
          讨论
          {activeTab === 'comments' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ink-900" />}
        </button>
      </div>

      {/* 求证笔记内容 */}
      {activeTab === 'notes' && (
        <div className="space-y-3 animate-fade-in-up">
          {/* 提交成功动画 */}
          {submittedAnim && (
            <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
              <div className="bg-surface rounded-2xl shadow-float px-6 py-5 flex items-center gap-3 animate-fade-in-up border border-bamboo/30">
                <div className="w-10 h-10 rounded-full bg-bamboo/10 flex items-center justify-center">
                  <Check size={20} className="text-bamboo" />
                </div>
                <div>
                  <p className="text-[15px] font-bold text-ink-900">笔记已提交</p>
                  <p className="text-[12px] text-ink-500">+10 积分 · 审核通过后显示</p>
                </div>
              </div>
            </div>
          )}

          {/* 贡献笔记入口 */}
          {!showDraftEditor && (
            <button
              onClick={() => setShowDraftEditor(true)}
              className="w-full p-3.5 rounded-xl border-2 border-dashed border-seal/30 bg-seal/5 flex items-center gap-3 press-pop hover:border-seal/50 hover:bg-seal/8 transition-all"
            >
              <div className="w-9 h-9 rounded-xl bg-seal/10 flex items-center justify-center flex-shrink-0">
                <Plus size={18} className="text-seal" />
              </div>
              <div className="text-left flex-1">
                <p className="text-[14px] font-bold text-ink-900">贡献求证笔记</p>
                <p className="text-[12px] text-ink-600">AI 起草，你审阅，30秒完成</p>
              </div>
              <Sparkles size={16} className="text-seal flex-shrink-0" />
            </button>
          )}

          {/* AI 草稿编辑器 */}
          {showDraftEditor && (
            <AIDraftEditor
              onSubmit={handleSubmitNote}
              onCancel={() => setShowDraftEditor(false)}
            />
          )}

          {/* 笔记列表 */}
          {visibleNotes.length > 0 ? (
            <>
              <div className="flex items-center justify-between px-1">
                <p className="text-[12px] text-ink-600 font-semibold">
                  {pendingCount > 0 ? `${pendingCount} 条审核中 · ` : ''}共 {notes.length} 条笔记
                </p>
              </div>
              {visibleNotes.map(note => (
                <NoteCard key={note.id} note={note} onVote={handleVote} />
              ))}
              {notes.length > 2 && (
                <button
                  onClick={() => setShowAllNotes(!showAllNotes)}
                  className="w-full py-2.5 text-[13px] text-ink-600 font-medium flex items-center justify-center gap-1 press-pop"
                >
                  {showAllNotes ? '收起' : `查看全部 ${notes.length} 条`}
                  {showAllNotes ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              )}
            </>
          ) : (
            !showDraftEditor && (
              <div className="text-center py-6 px-4 rounded-xl bg-paper-dark/50 border border-line/30">
                <FileCheck size={28} className="mx-auto text-ink-400 mb-2" />
                <p className="text-[13px] text-ink-600 font-medium">还没有求证笔记</p>
                <p className="text-[12px] text-ink-500 mt-0.5">贡献第一条，帮大家看清真相</p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}
