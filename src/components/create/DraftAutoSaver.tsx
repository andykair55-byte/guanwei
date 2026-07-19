import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, AlertCircle, RotateCcw } from 'lucide-react'
import { useCreationStore } from '../../stores/creationStore'

interface DraftAutoSaverProps {
  content: string
  topic: string
  onRestore?: () => void
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'unsaved'

const DEBOUNCE_MS = 3000

/**
 * 草稿自动保存组件：
 * - 监听 content 变化，3 秒防抖写入 creationStore.setDraft
 * - 显示 "已保存" / "保存中..." / "未保存" 状态
 * - 进入工作间时若 draft.lastSaved > 0 且 content 非空，提示恢复
 *
 * 注意：本组件仅负责 creationStore 的 draft 同步，不影响 AgentWorldPage 自身的 platform content 状态。
 */
export default function DraftAutoSaver({ content, topic, onRestore }: DraftAutoSaverProps) {
  const setDraft = useCreationStore(s => s.setDraft)
  const lastSaved = useCreationStore(s => s.draft.lastSaved)
  const savedTopic = useCreationStore(s => s.draft.topic)
  const savedContent = useCreationStore(s => s.draft.content)

  const [status, setStatus] = useState<SaveStatus>('idle')
  const [showRecoverPrompt, setShowRecoverPrompt] = useState(false)
  const recoverCheckedRef = useRef(false)
  const lastSavedContentRef = useRef(content)

  // 进入工作间时检测未恢复的草稿
  useEffect(() => {
    if (recoverCheckedRef.current) return
    recoverCheckedRef.current = true
    if (lastSaved > 0 && savedContent && savedContent.trim().length > 0 && savedContent !== content) {
      setShowRecoverPrompt(true)
    }
  }, [lastSaved, savedContent, content])

  // 3 秒防抖自动保存
  useEffect(() => {
    if (content === lastSavedContentRef.current) return
    setStatus('saving')
    const t = setTimeout(() => {
      setDraft({ content, topic })
      lastSavedContentRef.current = content
      setStatus('saved')
    }, DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [content, topic, setDraft])

  const handleRecover = () => {
    const savedContent = useCreationStore.getState().draft.content
    onRestore?.()
    // 标记为已保存，避免恢复后的内容变化触发一次"保存中"
    lastSavedContentRef.current = savedContent
    setStatus('saved')
    setShowRecoverPrompt(false)
  }

  const handleDismiss = () => {
    setShowRecoverPrompt(false)
    // 用当前内容覆盖旧草稿，避免重复提示
    setDraft({ content, topic })
    lastSavedContentRef.current = content
  }

  const statusLabel = (() => {
    switch (status) {
      case 'saving': return '保存中...'
      case 'saved': return '已保存'
      case 'unsaved': return '未保存'
      default: return lastSaved > 0 ? '已保存' : '未保存'
    }
  })()

  const statusIcon = (() => {
    switch (status) {
      case 'saving': return <Loader2 size={12} className="animate-spin text-blue-500" />
      case 'unsaved': return <AlertCircle size={12} className="text-amber-500" />
      default: return <Check size={12} className="text-emerald-500" />
    }
  })()

  return (
    <div className="flex items-center justify-between px-3 py-1.5 rounded-lg border border-ink-100 bg-paper-50/60 text-[12px]">
      <div className="flex items-center gap-1.5 text-ink-500">
        {statusIcon}
        <span>{statusLabel}</span>
        {lastSaved > 0 && status !== 'saving' && (
          <span className="text-ink-300">·{new Date(lastSaved).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
        )}
      </div>

      {showRecoverPrompt && (
        <div className="flex items-center gap-2 text-ink-600">
          <span>检测到未保存的草稿，是否恢复？</span>
          <button
            onClick={handleRecover}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-seal-600 text-paper-0 text-[11px] font-medium hover:bg-seal-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-seal-600/40"
          >
            <RotateCcw size={10} />
            恢复
          </button>
          <button
            onClick={handleDismiss}
            className="px-2 py-0.5 rounded-md text-[11px] text-ink-500 hover:bg-paper-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-300/40"
          >
            忽略
          </button>
        </div>
      )}

      {!showRecoverPrompt && savedTopic && savedTopic !== topic && (
        <span className="text-ink-400">已保存主题：{savedTopic}</span>
      )}
    </div>
  )
}
