import { useState, useRef, useEffect, useCallback } from 'react'
import { Sparkles, X, Send, FileText, ListChecks, Brain } from 'lucide-react'
import { useTraeBotStore } from '../stores/traeBotStore'
import { callLLM } from '../stores/llmStore'
import { analyzeEmotion } from '../services/emotionAnalysis'

// 带超时的 Promise 包装（12秒超时）
function withTimeout<T>(promise: Promise<T>, ms = 12000): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer)) as Promise<T>
}

export default function TraeBot() {
  const isOpen = useTraeBotStore(s => s.isOpen)
  const isTyping = useTraeBotStore(s => s.isTyping)
  const messages = useTraeBotStore(s => s.messages)
  const pageContext = useTraeBotStore(s => s.pageContext)
  const toggleOpen = useTraeBotStore(s => s.toggleOpen)
  const setOpen = useTraeBotStore(s => s.setOpen)
  const addMessage = useTraeBotStore(s => s.addMessage)
  const setTyping = useTraeBotStore(s => s.setTyping)
  const canSendMessage = useTraeBotStore(s => s.canSendMessage)

  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const selectedTextRef = useRef('')
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
  const [showIntro, setShowIntro] = useState(false)

  // 首次出现引导气泡（localStorage 记忆，仅显示一次）
  useEffect(() => {
    if (!localStorage.getItem('guanwei-traebot-introduced')) {
      setShowIntro(true)
      const timer = setTimeout(() => {
        setShowIntro(false)
        localStorage.setItem('guanwei-traebot-introduced', '1')
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [])

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // 关闭时重置拖拽位置
  useEffect(() => {
    if (!isOpen) setPos(null)
  }, [isOpen])

  // 输入框自适应高度
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 96) + 'px'
  }

  // 发送消息
  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isTyping) return

    if (!canSendMessage()) {
      addMessage({ role: 'assistant', content: 'trae宝需要休息一下（每分钟限3条消息），稍后再试~' })
      return
    }

    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    addMessage({ role: 'user', content: text })
    setTyping(true)

    try {
      const systemPrompt = pageContext
        ? `你是trae宝，一个陪伴用户看文章的AI助手。用户正在阅读：《${pageContext.title}》\n\n文章内容：\n${pageContext.content}`
        : '你是trae宝，一个陪伴用户看文章的AI助手。'

      const recentMessages = messages.slice(-20)
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
      addMessage({ role: 'assistant', content: response || '（trae宝没听清，再说一次？）' })
    } catch {
      addMessage({ role: 'assistant', content: 'trae宝走神了，重试一下？' })
    } finally {
      setTyping(false)
    }
  }, [input, isTyping, canSendMessage, addMessage, setTyping, pageContext, messages])

  // 总结文章
  const handleSummarize = useCallback(async () => {
    if (!pageContext) {
      addMessage({ role: 'assistant', content: '当前页面不支持总结，请在文章详情页使用~' })
      return
    }
    if (isTyping) return
    if (!canSendMessage()) {
      addMessage({ role: 'assistant', content: 'trae宝需要休息一下，稍后再试~' })
      return
    }

    setTyping(true)
    try {
      const summary = await withTimeout(
        callLLM(
          [
            { role: 'system', content: '请用3-5句话总结以下文章的核心内容。' },
            { role: 'user', content: pageContext.content },
          ],
          { maxTokens: 512, temperature: 0.3 }
        )
      )
      addMessage({ role: 'assistant', content: `📝 文章总结\n\n${summary}` })
    } catch {
      addMessage({ role: 'assistant', content: 'trae宝走神了，重试一下？' })
    } finally {
      setTyping(false)
    }
  }, [pageContext, isTyping, canSendMessage, addMessage, setTyping])

  // 提取关键事实
  const handleExtractFacts = useCallback(async () => {
    if (!pageContext) {
      addMessage({ role: 'assistant', content: '当前页面不支持提取事实，请在文章详情页使用~' })
      return
    }
    if (isTyping) return
    if (!canSendMessage()) {
      addMessage({ role: 'assistant', content: 'trae宝需要休息一下，稍后再试~' })
      return
    }

    setTyping(true)
    try {
      const facts = await withTimeout(
        callLLM(
          [
            { role: 'system', content: '从以下文章中提取关键事实，以列表形式返回。每行一个事实，用「·」开头。' },
            { role: 'user', content: pageContext.content },
          ],
          { maxTokens: 512, temperature: 0.2 }
        )
      )
      addMessage({ role: 'assistant', content: `📋 关键事实\n\n${facts}` })
    } catch {
      addMessage({ role: 'assistant', content: 'trae宝走神了，重试一下？' })
    } finally {
      setTyping(false)
    }
  }, [pageContext, isTyping, canSendMessage, addMessage, setTyping])

  // 鼠标按下时捕获选中文本（点击按钮前保存，防止选择丢失）
  const handleEmotionMouseDown = useCallback(() => {
    selectedTextRef.current = window.getSelection()?.toString().trim() || ''
  }, [])

  // 情绪检测
  const handleEmotionAnalysis = useCallback(async () => {
    if (isTyping) return

    const selectedText = selectedTextRef.current || window.getSelection()?.toString().trim() || ''
    selectedTextRef.current = ''

    if (!selectedText) {
      addMessage({ role: 'assistant', content: '请先选中要分析的文本，再点击情绪检测~' })
      return
    }
    if (!canSendMessage()) {
      addMessage({ role: 'assistant', content: 'trae宝需要休息一下，稍后再试~' })
      return
    }

    setTyping(true)
    try {
      const result = await withTimeout(analyzeEmotion(selectedText), 12000)
      const levelText = result.level === 'high'
        ? '⚠️ 操控性较强'
        : result.level === 'medium'
          ? '有一定操控倾向'
          : '✓ 基本客观'
      const techniquesText = result.techniques.length > 0
        ? result.techniques.map(t => `· ${t.name}（${t.count}次）`).join('\n')
        : '未检测到明显操控手法'

      addMessage({
        role: 'assistant',
        content: `🔍 情绪操控检测\n\n📊 操控指数：${result.score}/100（${levelText}）\n\n🎯 检测到的手法：\n${techniquesText}\n\n📝 客观重述：\n${result.objectiveSummary}`,
      })
    } catch {
      addMessage({ role: 'assistant', content: 'trae宝走神了，重试一下？' })
    } finally {
      setTyping(false)
    }
  }, [isTyping, canSendMessage, addMessage, setTyping])

  // 拖拽面板
  const onTitleMouseDown = useCallback((e: React.MouseEvent) => {
    const panel = panelRef.current
    if (!panel) return
    e.preventDefault()
    const rect = panel.getBoundingClientRect()
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: rect.left,
      origY: rect.top,
    }
    setPos({ x: rect.left, y: rect.top })

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const dx = ev.clientX - dragRef.current.startX
      const dy = ev.clientY - dragRef.current.startY
      const newX = dragRef.current.origX + dx
      const newY = dragRef.current.origY + dy
      // 限制在视口内
      const maxX = window.innerWidth - 360
      const maxY = window.innerHeight - 100
      setPos({
        x: Math.max(0, Math.min(maxX, newX)),
        y: Math.max(0, Math.min(maxY, newY)),
      })
    }
    const onUp = () => {
      dragRef.current = null
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 收起状态：悬浮按钮
  if (!isOpen) {
    return (
      <div className="fixed right-6 bottom-6 z-[100]">
        {showIntro && (
          <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 whitespace-nowrap bg-ink-900 text-white text-[13px] px-4 py-2.5 rounded-2xl rounded-br-md shadow-xl animate-fade-in-up">
            你好！我是trae宝，有问题可以随时问我～
            <span className="absolute right-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-ink-900 rotate-45" />
          </div>
        )}
        <button
          onClick={toggleOpen}
          className="relative w-12 h-12 rounded-full bg-seal-600 text-white shadow-2xl flex items-center justify-center hover:-translate-y-1 hover:shadow-lg transition-all duration-300 active:scale-95 group"
          title="和trae宝聊聊"
        >
          <Sparkles size={22} className="group-hover:scale-110 transition-transform" />
          {messages.length > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-ink-900 text-white text-[9px] font-bold flex items-center justify-center">
              {messages.length > 9 ? '9+' : messages.length}
            </span>
          )}
        </button>
      </div>
    )
  }

  // 展开状态：聊天面板
  return (
    <div
      ref={panelRef}
      className={`fixed z-[100] w-[360px] h-[480px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-ink-100 ${
        pos ? '' : 'right-6 bottom-6'
      }`}
      style={pos ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' } : undefined}
    >
      {/* 标题栏 - 可拖拽 */}
      <div
        onMouseDown={onTitleMouseDown}
        className="flex items-center justify-between px-4 py-3 bg-seal-600 text-white cursor-move select-none flex-shrink-0"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles size={16} className="flex-shrink-0" />
          <span className="text-[14px] font-bold flex-shrink-0">trae宝</span>
          {pageContext && (
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full truncate max-w-[140px]">
              {pageContext.title}
            </span>
          )}
        </div>
        <button
          onClick={() => setOpen(false)}
          className="p-1 rounded-lg hover:bg-white/20 transition-colors flex-shrink-0"
          title="收起"
        >
          <X size={16} />
        </button>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3 space-y-2.5 bg-paper-50">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-12 h-12 rounded-full bg-seal-600/10 flex items-center justify-center mb-3">
              <Sparkles size={24} className="text-seal-600" />
            </div>
            <p className="text-[13px] text-ink-600 leading-relaxed">
              👋 你好，我是trae宝！
              <br />
              可以陪你聊文章、总结内容、检测情绪操控。
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap break-words ${
                msg.role === 'user'
                  ? 'bg-seal-600 text-white rounded-2xl rounded-br-md'
                  : 'bg-paper-100 text-ink-800 rounded-2xl rounded-bl-md'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Typing 动画 */}
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

      {/* 快捷功能按钮 */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-t border-ink-100 bg-white flex-shrink-0">
        <button
          onClick={handleSummarize}
          disabled={isTyping}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-paper-100 text-ink-600 text-[11px] font-medium hover:bg-paper-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FileText size={12} />
          总结文章
        </button>
        <button
          onClick={handleExtractFacts}
          disabled={isTyping}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-paper-100 text-ink-600 text-[11px] font-medium hover:bg-paper-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ListChecks size={12} />
          提取事实
        </button>
        <button
          onMouseDown={handleEmotionMouseDown}
          onClick={handleEmotionAnalysis}
          disabled={isTyping}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-paper-100 text-ink-600 text-[11px] font-medium hover:bg-paper-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Brain size={12} />
          情绪检测
        </button>
      </div>

      {/* 输入框 */}
      <div className="flex items-end gap-2 p-3 border-t border-ink-100 bg-white flex-shrink-0">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="和trae宝聊聊..."
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
    </div>
  )
}
