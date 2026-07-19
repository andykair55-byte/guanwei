import { useState, useRef, useEffect, useCallback } from 'react'
import { Sparkles, X, Send, FileText, ListChecks, Brain, History, Plus, Trash2, MessageCircle, ChevronLeft } from 'lucide-react'
import { useXiaoWeiStore } from '../stores/xiaoWeiStore'
import { callLLM } from '../stores/llmStore'
import { analyzeEmotion } from '../services/emotionAnalysis'

function withTimeout<T>(promise: Promise<T>, ms = 12000): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer)) as Promise<T>
}

/** Demo 数据 —— 当 LLM 不可用或无上下文时的 fallback */
const DEMO_SUMMARY = '这篇文章主要讲述了信息甄别与批判性思维的核心内容，涉及媒体素养和逻辑推理方面的分析，结论是在信息过载的时代，培养独立思考和验证能力至关重要。'

const DEMO_FACTS = `· 事实1：批判性思维的核心在于对信息来源、论证方式和结论进行系统性审视
· 事实2：媒体素养包含识别事实报道与观点评论的能力，以及对数据引用的核查
· 事实3：逻辑谬误（如诉诸情感、稻草人论证）常被用于操控公众认知
· 事实4：培养信息验证习惯可以有效降低被误导的风险`

const DEMO_EMOTION_RESULT = {
  score: 42,
  level: 'medium',
  techniques: [
    { name: '情感化用词', count: 3 },
    { name: '绝对化表述', count: 1 },
  ],
  objectiveSummary: '该文本在描述问题时使用了一些带有情感色彩的词汇，存在一定的引导倾向，但整体论述较为客观。',
}

const DEMO_TEXT = '这项政策毫无疑问是最伟大的改革，所有人都应该热烈拥护。那些反对者不是愚蠢就是别有用心，他们的观点根本不值一驳。我们必须立刻、马上支持这一决定，否则国家将走向深渊。'

export default function TraeBot() {
  const isOpen = useXiaoWeiStore(s => s.isOpen)
  const isTyping = useXiaoWeiStore(s => s.isTyping)
  const showHistory = useXiaoWeiStore(s => s.showHistory)
  const conversations = useXiaoWeiStore(s => s.conversations)
  const activeId = useXiaoWeiStore(s => s.activeId)
  const pageContext = useXiaoWeiStore(s => s.pageContext)
  const toggleOpen = useXiaoWeiStore(s => s.toggleOpen)
  const setOpen = useXiaoWeiStore(s => s.setOpen)
  const toggleHistory = useXiaoWeiStore(s => s.toggleHistory)
  const addMessage = useXiaoWeiStore(s => s.addMessage)
  const setTyping = useXiaoWeiStore(s => s.setTyping)
  const canSendMessage = useXiaoWeiStore(s => s.canSendMessage)
  const newConversation = useXiaoWeiStore(s => s.newConversation)
  const switchConversation = useXiaoWeiStore(s => s.switchConversation)
  const deleteConversation = useXiaoWeiStore(s => s.deleteConversation)
  const getActive = useXiaoWeiStore(s => s.getActive)

  const activeConv = getActive()
  const messages = activeConv?.messages ?? []
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const selectedTextRef = useRef('')
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
  const [showIntro, setShowIntro] = useState(false)
  const [collapsedPos, setCollapsedPos] = useState<{ x: number; y: number } | null>(null)
  const collapsedDragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
  const wasDraggedRef = useRef(false)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('guanwei-xiaowei-introduced')) {
      setShowIntro(true)
      const timer = setTimeout(() => {
        setShowIntro(false)
        localStorage.setItem('guanwei-xiaowei-introduced', '1')
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, isTyping])

  useEffect(() => {
    if (!isOpen) { setPos(null) }
  }, [isOpen])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 96) + 'px'
  }

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isTyping) return

    if (!canSendMessage()) {
      addMessage({ role: 'assistant', content: '小薇需要休息一下（每分钟限3条消息），稍后再试~' })
      return
    }

    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    addMessage({ role: 'user', content: text })
    setTyping(true)

    try {
      const systemPrompt = pageContext
        ? `你是小薇，一个陪伴用户看文章的AI助手。用户正在阅读：《${pageContext.title}》\n\n文章内容：\n${pageContext.content}`
        : '你是小薇，一个陪伴用户看文章的AI助手。回答简洁友好，用中文。'

      const recentMessages = messagesRef.current.slice(-20)
      const response = await withTimeout(
        callLLM(
          [
            { role: 'system', content: systemPrompt },
            ...recentMessages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: text },
          ],
          { maxTokens: 1024, temperature: 0.7 }
        )
      )
      addMessage({ role: 'assistant', content: response || '（小薇没听清，再说一次？）' })
    } catch {
      addMessage({ role: 'assistant', content: '小薇走神了，重试一下？' })
    } finally {
      setTyping(false)
    }
  }, [input, isTyping, canSendMessage, addMessage, setTyping, pageContext])

  const handleSummarize = useCallback(async () => {
    if (isTyping) return
    if (!canSendMessage()) { addMessage({ role: 'assistant', content: '小薇需要休息一下，稍后再试~' }); return }
    if (!pageContext) {
      addMessage({ role: 'assistant', content: `文章总结（演示）\n\n${DEMO_SUMMARY}` })
      return
    }
    setTyping(true)
    try {
      const summary = await withTimeout(callLLM([{ role: 'system', content: '请用3-5句话总结以下文章的核心内容。' }, { role: 'user', content: pageContext.content }], { maxTokens: 512, temperature: 0.3 }))
      addMessage({ role: 'assistant', content: `文章总结\n\n${summary}` })
    } catch {
      addMessage({ role: 'assistant', content: `文章总结（演示）\n\n${DEMO_SUMMARY}` })
    }
    finally { setTyping(false) }
  }, [pageContext, isTyping, canSendMessage, addMessage, setTyping])

  const handleExtractFacts = useCallback(async () => {
    if (isTyping) return
    if (!canSendMessage()) { addMessage({ role: 'assistant', content: '小薇需要休息一下，稍后再试~' }); return }
    if (!pageContext) {
      addMessage({ role: 'assistant', content: `关键事实（演示）\n\n${DEMO_FACTS}` })
      return
    }
    setTyping(true)
    try {
      const facts = await withTimeout(callLLM([{ role: 'system', content: '从以下文章中提取关键事实，以列表形式返回。每行一个事实，用「·」开头。' }, { role: 'user', content: pageContext.content }], { maxTokens: 512, temperature: 0.2 }))
      addMessage({ role: 'assistant', content: `关键事实\n\n${facts}` })
    } catch {
      addMessage({ role: 'assistant', content: `关键事实（演示）\n\n${DEMO_FACTS}` })
    }
    finally { setTyping(false) }
  }, [pageContext, isTyping, canSendMessage, addMessage, setTyping])

  const handleEmotionMouseDown = useCallback(() => {
    selectedTextRef.current = window.getSelection()?.toString().trim() || ''
  }, [])

  const handleEmotionAnalysis = useCallback(async () => {
    if (isTyping) return
    const selectedText = selectedTextRef.current || window.getSelection()?.toString().trim() || ''
    selectedTextRef.current = ''
    if (!canSendMessage()) { addMessage({ role: 'assistant', content: '小薇需要休息一下，稍后再试~' }); return }

    const textToAnalyze = selectedText || DEMO_TEXT
    const isDemo = !selectedText
    setTyping(true)
    try {
      const result = await withTimeout(analyzeEmotion(textToAnalyze), 12000)
      const levelText = result.level === 'high' ? '操控性较强' : result.level === 'medium' ? '有一定操控倾向' : '基本客观'
      const techniquesText = result.techniques.length > 0 ? result.techniques.map(t => `· ${t.name}（${t.count}次）`).join('\n') : '未检测到明显操控手法'
      const prefix = isDemo ? `情绪操控检测（使用演示文本）` : `情绪操控检测`
      addMessage({ role: 'assistant', content: `${prefix}\n\n操控指数：${result.score}/100（${levelText}）\n\n检测到的手法：\n${techniquesText}\n\n客观重述：\n${result.objectiveSummary}` })
    } catch {
      // LLM 分析失败时使用预设 demo 结果
      const result = DEMO_EMOTION_RESULT
      const levelText = result.level === 'high' ? '操控性较强' : result.level === 'medium' ? '有一定操控倾向' : '基本客观'
      const techniquesText = result.techniques.map(t => `· ${t.name}（${t.count}次）`).join('\n')
      addMessage({ role: 'assistant', content: `情绪操控检测（演示）\n\n操控指数：${result.score}/100（${levelText}）\n\n检测到的手法：\n${techniquesText}\n\n客观重述：\n${result.objectiveSummary}` })
    }
    finally { setTyping(false) }
  }, [isTyping, canSendMessage, addMessage, setTyping])

  // 拖拽面板
  const onTitleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    const panel = panelRef.current
    if (!panel) return
    e.preventDefault()
    const rect = panel.getBoundingClientRect()
    setIsDragging(true)
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: rect.left, origY: rect.top }
    setPos({ x: rect.left, y: rect.top })
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const newX = dragRef.current.origX + (ev.clientX - dragRef.current.startX)
      const newY = dragRef.current.origY + (ev.clientY - dragRef.current.startY)
      setPos({ x: Math.max(0, Math.min(window.innerWidth - 360, newX)), y: Math.max(0, Math.min(window.innerHeight - 100, newY)) })
    }
    const onUp = () => { dragRef.current = null; setIsDragging(false); document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); document.body.style.cursor = ''; document.body.style.userSelect = '' }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.body.style.cursor = 'move'
    document.body.style.userSelect = 'none'
  }, [])

  // 拖拽收起状态的悬浮按钮
  const onCollapsedMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const btn = e.currentTarget as HTMLElement
    const rect = btn.getBoundingClientRect()
    wasDraggedRef.current = false
    setIsDragging(true)
    collapsedDragRef.current = { startX: e.clientX, startY: e.clientY, origX: rect.left, origY: rect.top }
    setCollapsedPos({ x: rect.left, y: rect.top })
    const onMove = (ev: MouseEvent) => {
      if (!collapsedDragRef.current) return
      const dx = ev.clientX - collapsedDragRef.current.startX
      const dy = ev.clientY - collapsedDragRef.current.startY
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) wasDraggedRef.current = true
      const newX = collapsedDragRef.current.origX + dx
      const newY = collapsedDragRef.current.origY + dy
      setCollapsedPos({
        x: Math.max(0, Math.min(window.innerWidth - 48, newX)),
        y: Math.max(0, Math.min(window.innerHeight - 48, newY)),
      })
    }
    const onUp = () => {
      collapsedDragRef.current = null
      setIsDragging(false)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.body.style.cursor = 'move'
    document.body.style.userSelect = 'none'
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    const now = new Date()
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  // 收起状态：悬浮按钮（可拖拽）
  if (!isOpen) {
    return (
      <div
        className={`fixed z-[100] ${collapsedPos ? '' : 'right-6 bottom-6'}`}
        style={collapsedPos ? { left: collapsedPos.x, top: collapsedPos.y } : undefined}
      >
        {showIntro && !collapsedPos && (
          <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 whitespace-nowrap bg-ink-900 text-white text-[13px] px-4 py-2.5 rounded-2xl rounded-br-md shadow-xl animate-fade-in-up">
            你好！我是小薇，有问题可以随时问我~
            <span className="absolute right-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-ink-900 rotate-45" />
          </div>
        )}
        <button
          onMouseDown={onCollapsedMouseDown}
          onClick={() => { if (wasDraggedRef.current) { wasDraggedRef.current = false; return } toggleOpen() }}
          className={`relative w-12 h-12 rounded-full bg-seal-600 text-white shadow-2xl flex items-center justify-center ${isDragging ? '' : 'hover:-translate-y-1 hover:shadow-lg transition-all duration-300'} active:scale-95 group cursor-move`}
          title="和小薇聊聊（可拖拽）"
        >
          <Sparkles size={22} className="group-hover:scale-110 transition-transform" />
          {conversations.length > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-ink-900 text-white text-[9px] font-bold flex items-center justify-center">
              {conversations.length}
            </span>
          )}
        </button>
      </div>
    )
  }

  // 展开状态
  return (
    <div
      ref={panelRef}
      className={`fixed z-[100] w-[360px] h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-ink-100 ${pos ? '' : 'right-6 bottom-6'} ${isDragging ? '!transition-none' : ''}`}
      style={pos ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' } : undefined}
    >
      {/* 标题栏 */}
      <div
        onMouseDown={onTitleMouseDown}
        className="flex items-center justify-between px-4 py-3 bg-seal-600 text-white cursor-move select-none flex-shrink-0"
      >
        <div className="flex items-center gap-2 min-w-0">
          {showHistory ? (
            <>
              <button onClick={toggleHistory} className="p-0.5 rounded hover:bg-white/20 transition-colors">
                <ChevronLeft size={16} />
              </button>
              <span className="text-[14px] font-bold">历史对话</span>
            </>
          ) : (
            <>
              <Sparkles size={16} className="flex-shrink-0" />
              <span className="text-[14px] font-bold flex-shrink-0">小薇</span>
              {pageContext && (
                <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full truncate max-w-[140px]">
                  {pageContext.title}
                </span>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!showHistory && (
            <button onClick={toggleHistory} className="p-1 rounded-lg hover:bg-white/20 transition-colors" title="历史对话">
              <History size={15} />
            </button>
          )}
          <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white/20 transition-colors" title="收起">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* 历史对话列表 */}
      {showHistory ? (
        <div className="flex-1 overflow-y-auto scrollbar-thin bg-paper-50">
          <div className="p-3">
            <button
              onClick={newConversation}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-ink-100 hover:border-seal-600 hover:bg-seal-50 transition-all text-left mb-2"
            >
              <div className="w-8 h-8 rounded-full bg-seal-600 flex items-center justify-center flex-shrink-0">
                <Plus size={16} className="text-white" />
              </div>
              <div>
                <p className="text-[14px] font-medium text-ink-800">新对话</p>
                <p className="text-[11px] text-ink-400">开始一段新的聊天</p>
              </div>
            </button>

            {conversations.length === 0 ? (
              <div className="text-center py-10">
                <MessageCircle size={32} className="text-ink-200 mx-auto mb-2" />
                <p className="text-[13px] text-ink-400">暂无历史对话</p>
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map(conv => (
                  <div
                    key={conv.id}
                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                      conv.id === activeId ? 'bg-seal-50 border border-seal-600/20' : 'hover:bg-white'
                    }`}
                  >
                    <button onClick={() => switchConversation(conv.id)} className="flex-1 min-w-0 text-left flex items-center gap-3">
                      <MessageCircle size={15} className={conv.id === activeId ? 'text-seal-600 flex-shrink-0' : 'text-ink-300 flex-shrink-0'} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-ink-800 truncate font-medium">{conv.title}</p>
                        <p className="text-[11px] text-ink-400">{conv.messages.length} 条消息 · {formatTime(conv.updatedAt)}</p>
                      </div>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id) }}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-seal-100 transition-all"
                      title="删除"
                    >
                      <Trash2 size={13} className="text-ink-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3 space-y-2.5 bg-paper-50">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <div className="w-12 h-12 rounded-full bg-seal-600/10 flex items-center justify-center mb-3">
                  <Sparkles size={24} className="text-seal-600" />
                </div>
                <p className="text-[13px] text-ink-600 leading-relaxed">
                  你好，我是小薇！
                  <br />
                  可以陪你聊文章、总结内容、检测情绪操控。
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap break-words ${
                  msg.role === 'user'
                    ? 'bg-seal-600 text-white rounded-2xl rounded-br-md'
                    : 'bg-paper-100 text-ink-800 rounded-2xl rounded-bl-md'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-paper-100 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-ink-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-ink-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-ink-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 快捷功能 */}
          <div className="flex items-center gap-1.5 px-3 py-2 border-t border-ink-100 bg-white flex-shrink-0">
            <button onClick={handleSummarize} disabled={isTyping} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-paper-100 text-ink-600 text-[11px] font-medium hover:bg-paper-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <FileText size={12} />总结文章
            </button>
            <button onClick={handleExtractFacts} disabled={isTyping} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-paper-100 text-ink-600 text-[11px] font-medium hover:bg-paper-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <ListChecks size={12} />提取事实
            </button>
            <button onMouseDown={handleEmotionMouseDown} onClick={handleEmotionAnalysis} disabled={isTyping} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-paper-100 text-ink-600 text-[11px] font-medium hover:bg-paper-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <Brain size={12} />情绪检测
            </button>
          </div>

          {/* 输入框 */}
          <div className="flex items-end gap-2 p-3 border-t border-ink-100 bg-white flex-shrink-0">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="和小薇聊聊..."
              rows={1}
              className="flex-1 px-3 py-2 rounded-xl bg-paper-50 text-[13px] text-ink-900 placeholder:text-ink-300 resize-none border border-ink-100 focus:border-seal-600 transition-colors max-h-24 overflow-y-auto scrollbar-thin"
              style={{ minHeight: '36px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="w-9 h-9 rounded-xl bg-seal-600 text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-seal-500 transition-colors flex-shrink-0"
            >
              <Send size={15} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
