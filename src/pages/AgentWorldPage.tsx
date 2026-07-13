import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Undo2, Redo2, MoreHorizontal, Bell, Plus, Save, Copy, CheckCircle, Loader2 } from 'lucide-react'
import WorkspaceSidebar from '../components/workspace/WorkspaceSidebar'
import ActivityStream from '../components/workspace/ActivityStream'
import CommanderInput from '../components/workspace/CommanderInput'
import VersionBar from '../components/workspace/VersionBar'
import MarkdownEditor from '../components/create/MarkdownEditor'
import { useWorkspaceStore } from '../stores/workspaceStore'
import { useActivityStore } from '../stores/activityStore'
import { useCommanderStore } from '../stores/commanderStore'
import { useCanonicalStore } from '../stores/canonicalStore'
import { useSnapshotStore } from '../stores/snapshotStore'
import { handleUserInput, quickStart, confirmPlan, resetCommander } from '../services/commanderService'
import { PLATFORM_TEMPLATES, type PlatformId } from '../config/platformTemplates'
import { adaptToPlatform } from '../services/platformAdapter'
import type { ActivityEvent } from '../types/activity'

const PLATFORM_SHORT: Record<PlatformId, string> = {
  guanwei: '观', zhihu: '知', xiaohongshu: '红', weibo: '微', douyin: '抖', tieba: '贴'
}

const DEMO_TOPIC = 'AI换脸诈骗频发：技术滥用下的信任危机与治理困境'

export default function AgentWorldPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const currentId = useWorkspaceStore(s => s.currentId)
  const workspaces = useWorkspaceStore(s => s.workspaces)
  const current = useMemo(() => workspaces.find(w => w.id === currentId) || null, [workspaces, currentId])
  const availablePlatforms = useMemo(
    () => (current?.platformOrder || ['guanwei']) as PlatformId[],
    [current?.platformOrder]
  )
  const createWorkspace = useWorkspaceStore(s => s.createWorkspace)
  const switchWorkspace = useWorkspaceStore(s => s.switchWorkspace)
  const updatePlatformContent = useWorkspaceStore(s => s.updatePlatformContent)
  const updateTopic = useWorkspaceStore(s => s.updateTopic)

  const mode = useCommanderStore(s => s.mode)
  const setMode = useCommanderStore(s => s.setMode)
  const pipelineStatus = useCommanderStore(s => s.pipelineStatus)

  const setCanonicalTopic = useCanonicalStore(s => s.setTopic)
  const createSnapshot = useSnapshotStore(s => s.createSnapshot)
  const addEventSimple = useActivityStore(s => s.addEventSimple)

  const [activePlatform, setActivePlatform] = useState<PlatformId>('guanwei')
  const [generatingPlatform, setGeneratingPlatform] = useState<PlatformId | null>(null)
  const [copied, setCopied] = useState(false)
  const [lastSaved, setLastSaved] = useState(Date.now())
  const [showPlatformMenu, setShowPlatformMenu] = useState(false)
  const [publishingPlatforms, setPublishingPlatforms] = useState<Set<string>>(new Set())
  const initRef = useRef(false)

  const [saveLabel, setSaveLabel] = useState('已保存')

  useEffect(() => {
    const update = () => {
      const diff = Math.floor((Date.now() - lastSaved) / 1000)
      if (diff < 5) setSaveLabel('已保存')
      else if (diff < 60) setSaveLabel(`${diff}秒前保存`)
      else if (diff < 3600) setSaveLabel(`${Math.floor(diff / 60)}分钟前保存`)
      else setSaveLabel('已保存')
    }
    update()
    const t = setInterval(update, 3000)
    return () => clearInterval(t)
  }, [lastSaved])

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    const isDemo = searchParams.get('demo') === 'true'
    const titleParam = searchParams.get('title')
    const existingWorkspaces = useWorkspaceStore.getState().workspaces

    // 如果已有 Workspace，切换到最近的
    if (existingWorkspaces.length > 0 && !isDemo && !titleParam) {
      const recent = existingWorkspaces[0]
      switchWorkspace(recent.id)
      return
    }

    const topic = isDemo ? DEMO_TOPIC : (titleParam || '')
    const ws = createWorkspace(topic)
    switchWorkspace(ws.id)

    if (topic) {
      setCanonicalTopic(topic)
      setTimeout(() => {
        quickStart(ws.id, topic, mode)
      }, 300)
    } else {
      // 首次用户引导：发送欢迎消息
      setTimeout(() => {
        const { addEventSimple } = useActivityStore.getState()
        addEventSimple(
          ws.id,
          'commander_welcome',
          'orchestrator',
          '欢迎使用工作间',
          '我可以帮你把一个话题变成多个平台的内容。先告诉我你想写什么？'
        )
      }, 300)
    }

    resetCommander()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const editorContent = current?.platformContents?.[activePlatform]?.content || ''
  const editorTitle = current?.platformContents?.[activePlatform]?.title || current?.title || ''

  const wordCount = editorContent.replace(/\s/g, '').length
  const readTime = Math.max(1, Math.ceil(wordCount / 400))

  const handleSend = useCallback(async (text: string) => {
    if (!currentId) return
    await handleUserInput(currentId, text, mode)
  }, [currentId, mode])

  const handleGeneratePlatform = useCallback(async (platform: PlatformId) => {
    if (!current) return
    setGeneratingPlatform(platform)
    try {
      const result = await adaptToPlatform(current.draft, platform)
      updatePlatformContent(platform, { content: result.content, title: result.title, generated: true })
      addEventSimple(currentId!, 'writing_complete', 'writing',
        `${PLATFORM_TEMPLATES[platform].name}版本已生成`,
        result.content.slice(0, 100) + '...',
        [{ id: `platform-${platform}`, label: '查看', style: 'primary' }]
      )
    } catch (e) {
      addEventSimple(currentId!, 'error', 'system', '生成失败', String(e))
    } finally {
      setGeneratingPlatform(null)
    }
  }, [current, updatePlatformContent, addEventSimple, currentId])

  const handleGenerateAll = useCallback(async () => {
    for (const p of availablePlatforms) {
      if (p !== 'guanwei') {
        await handleGeneratePlatform(p)
      }
    }
  }, [handleGeneratePlatform, availablePlatforms])

  const handleAction = useCallback(async (actionId: string, _event: ActivityEvent) => {
    if (!currentId) return

    if (actionId === 'confirm' || actionId === 'use_all' || actionId === 'adopt_views') {
      confirmPlan(currentId, mode)
    } else if (actionId === 'modify') {
      addEventSimple(currentId, 'commander_question', 'orchestrator', '修改计划', '你想怎么调整？可以告诉我需要修改的地方。')
    } else if (actionId.startsWith('platform-')) {
      const platform = actionId.replace('platform-', '') as PlatformId
      if (availablePlatforms.includes(platform)) {
        setActivePlatform(platform)
      }
    } else if (actionId === 'adapt_all') {
      handleGenerateAll()
    } else if (actionId === 'reverify') {
      addEventSimple(currentId, 'info', 'verify', '重新核查', '正在重新核查存疑信息...')
    }
  }, [currentId, mode, addEventSimple, availablePlatforms, handleGenerateAll])

  const handleQuickReply = useCallback((text: string) => {
    handleSend(text)
  }, [handleSend])

  const handleEditorChange = useCallback((content: string) => {
    if (!currentId) return
    updatePlatformContent(activePlatform, { content })
    setLastSaved(Date.now())
  }, [currentId, activePlatform, updatePlatformContent])

  const handleTitleChange = useCallback((title: string) => {
    if (!currentId) return
    updatePlatformContent(activePlatform, { title })
  }, [currentId, activePlatform, updatePlatformContent])

  const handlePlatformChange = useCallback((platform: PlatformId) => {
    setActivePlatform(platform)
  }, [])

  const handlePublish = useCallback(async (platform: PlatformId) => {
    const content = current?.platformContents?.[platform]?.content || ''
    if (content) {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
    const url = PLATFORM_TEMPLATES[platform].publishUrl
    if (url && url.startsWith('http')) {
      window.open(url, '_blank')
    }
    // 标记为待确认发布
    setPublishingPlatforms(prev => new Set(prev).add(platform))
  }, [current])

  const confirmPublished = useCallback(() => {
    if (!currentId) return
    useWorkspaceStore.getState().setStatus(currentId, 'published')
    setPublishingPlatforms(new Set())
  }, [currentId])

  useEffect(() => {
    if (!currentId || !editorContent.trim()) return
    const t = setTimeout(() => {
      createSnapshot({
        content: editorContent,
        draftTopic: current?.topic || '',
        label: '自动保存',
      })
    }, 3000)
    return () => clearTimeout(t)
  }, [editorContent, currentId, current?.topic, createSnapshot])

  const handleRestore = useCallback((content: string, topic: string) => {
    if (!currentId) return
    updatePlatformContent(activePlatform, { content })
    if (topic) updateTopic(currentId, topic)
  }, [currentId, activePlatform, updatePlatformContent, updateTopic])

  if (!current) {
    return (
      <div className="h-dvh flex items-center justify-center bg-paper-50">
        <Loader2 className="animate-spin text-seal-600" size={24} />
      </div>
    )
  }

  return (
    <div className="h-dvh flex bg-paper-0 overflow-hidden select-text">
      <WorkspaceSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-4 py-2 border-b border-ink-100 bg-paper-0 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 rounded-lg hover:bg-paper-100 text-ink-500 hover:text-ink-900 transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
            <span className="text-[13px] text-ink-400">返回</span>
            <span className="text-[13px] text-ink-300 mx-1">/</span>
            <span className="text-[13px] text-ink-500">工作间</span>
            <span className="text-[13px] text-ink-300 mx-1">/</span>
            <span className="text-[13px] font-medium text-ink-900 truncate max-w-[200px]">{current.title}</span>
            <span className="ml-3 inline-flex items-center gap-1 text-[11px] text-ink-400">
              <Save size={11} /> 最后保存 {saveLabel}
            </span>
            <div className="flex items-center gap-0.5 ml-1">
              <button className="p-1.5 rounded-lg hover:bg-paper-100 text-ink-400" title="撤销">
                <Undo2 size={14} />
              </button>
              <button className="p-1.5 rounded-lg hover:bg-paper-100 text-ink-400" title="重做">
                <Redo2 size={14} />
              </button>
              <button className="p-1.5 rounded-lg hover:bg-paper-100 text-ink-400">
                <MoreHorizontal size={14} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-paper-100 rounded-lg p-0.5">
              <button
                onClick={() => setMode('assist')}
                className={`px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors ${
                  mode === 'assist' ? 'bg-paper-0 text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700'
                }`}
              >
                Assist
              </button>
              <button
                onClick={() => setMode('auto')}
                className={`px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors ${
                  mode === 'auto' ? 'bg-paper-0 text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700'
                }`}
              >
                Auto
              </button>
            </div>
            <button className="p-1.5 rounded-lg hover:bg-paper-100 text-ink-400 relative">
              <Bell size={16} />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-seal-500 rounded-full" />
            </button>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-seal-500 to-seal-700 flex items-center justify-center text-white text-[11px] font-medium">
              见
            </div>
          </div>
        </header>

        <div className="flex items-center gap-1 px-4 py-2 border-b border-ink-100 bg-paper-0 shrink-0 overflow-x-auto">
          <button
            onClick={() => handlePlatformChange('guanwei')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors shrink-0 ${
              activePlatform === 'guanwei'
                ? 'bg-paper-100 text-ink-900 border border-ink-200'
                : 'text-ink-500 hover:bg-paper-50 border border-transparent'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            通用稿（主稿）
          </button>
          {availablePlatforms.filter(p => p !== 'guanwei').map(p => (
            <button
              key={p}
              onClick={() => handlePlatformChange(p)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors shrink-0 flex items-center gap-1 ${
                activePlatform === p
                  ? 'bg-paper-100 text-ink-900 border border-ink-200'
                  : 'text-ink-500 hover:bg-paper-50 border border-transparent'
              }`}
            >
              <span className="text-[11px]">{PLATFORM_SHORT[p]}</span>
              {PLATFORM_TEMPLATES[p].name}
              {current.platformContents[p]?.generated && (
                <CheckCircle size={11} className="text-emerald-500" />
              )}
            </button>
          ))}
          <div className="relative">
            <button
              onClick={() => setShowPlatformMenu(!showPlatformMenu)}
              className="w-7 h-7 rounded-full border-2 border-dashed border-ink-200 flex items-center justify-center text-ink-300 hover:text-ink-500 hover:border-ink-300 shrink-0"
            >
              <Plus size={13} />
            </button>
            {showPlatformMenu && (
              <div className="absolute top-full left-0 mt-1 bg-paper-0 border border-ink-100 rounded-lg shadow-lg z-50 min-w-[120px]">
                {(['zhihu', 'xiaohongshu', 'weibo', 'douyin', 'tieba'] as PlatformId[])
                  .filter(p => !availablePlatforms.includes(p))
                  .map(p => (
                    <button
                      key={p}
                      onClick={() => {
                        if (currentId) {
                          useWorkspaceStore.getState().addPlatform(currentId, p)
                        }
                        setShowPlatformMenu(false)
                      }}
                      className="w-full text-left px-3 py-1.5 text-[12px] text-ink-700 hover:bg-paper-50"
                    >
                      {PLATFORM_TEMPLATES[p].name}
                    </button>
                  ))}
              </div>
            )}
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            <span className="text-[12px] text-ink-400 mr-1">发布到</span>
            {availablePlatforms.map(p => (
              <button
                key={p}
                onClick={() => handlePublish(p)}
                className={`w-7 h-7 rounded-lg border flex items-center justify-center text-[10px] font-medium transition-colors shrink-0 ${
                  publishingPlatforms.has(p)
                    ? 'border-emerald-500 text-emerald-600 bg-emerald-50'
                    : 'border-ink-200 text-ink-600 hover:border-seal-400 hover:text-seal-600'
                }`}
                title={`发布到${PLATFORM_TEMPLATES[p].name}${copied ? '（已复制）' : ''}`}
              >
                {PLATFORM_SHORT[p]}
              </button>
            ))}
            {publishingPlatforms.size > 0 && (
              <button
                onClick={confirmPublished}
                className="ml-1 px-3 py-1 rounded-lg bg-emerald-500 text-white text-[12px] font-medium"
              >
                已完成发布 ({publishingPlatforms.size})
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 px-4 py-1.5 border-b border-ink-100 bg-paper-50 shrink-0 text-[12px] text-ink-500">
          <span className="inline-flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${pipelineStatus === 'running' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
            {pipelineStatus === 'running' ? 'Agent运行中' : `已连接 5/5 Agent`}
          </span>
          <span>字数 {wordCount}</span>
          <span>预计阅读 {readTime} 分钟</span>
          <div className="flex-1" />
          {copied && (
            <span className="text-emerald-600 inline-flex items-center gap-1">
              <Copy size={12} /> 已复制
            </span>
          )}
          {generatingPlatform && (
            <span className="text-seal-600 inline-flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" /> 生成{PLATFORM_TEMPLATES[generatingPlatform].name}中
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto bg-paper-0">
          <div className="max-w-[720px] mx-auto px-6 py-6">
            <input
              value={editorTitle}
              onChange={e => handleTitleChange(e.target.value)}
              placeholder="输入标题"
              className="w-full text-[24px] font-bold text-ink-900 placeholder:text-ink-200 outline-none mb-4 bg-transparent"
            />
            <MarkdownEditor
              value={editorContent}
              onChange={handleEditorChange}
              textareaRef={textareaRef}
              placeholder="开始创作，或在下方输入框告诉Commander你想做什么…"
            />
          </div>
        </div>

        <VersionBar onRestore={handleRestore} />

        <CommanderInput onSend={handleSend} />
      </div>

      <ActivityStream
        className="w-[340px] shrink-0 hidden lg:flex"
        onAction={handleAction}
        onQuickReply={handleQuickReply}
      />
    </div>
  )
}
