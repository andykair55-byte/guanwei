/**
 * DanmakuInput — 弹幕输入（带防刷限流）
 *
 * 规则：3 秒最小间隔 + 60 秒重复检测 + 5 条/分钟。
 * 发送记录存 localStorage（`danmaku-history-${userId}`），仅保留最近 60 秒。
 */
import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

interface HistoryItem { ts: number; content: string }

const MIN_INTERVAL = 3000   // 3 秒最小间隔
const MAX_PER_MIN = 5       // 每分钟最多 5 条
const DUP_WINDOW = 60000    // 60 秒重复检测窗口

export default function DanmakuInput({ onSend }: { onSend: (text: string) => void }) {
  const { user } = useAuthStore()
  const [text, setText] = useState('')
  const [tip, setTip] = useState('')
  const tipTimer = useRef<number | null>(null)

  const historyKey = `danmaku-history-${user?.id ?? 'anon'}`

  // 清理 tip 定时器
  useEffect(() => {
    return () => {
      if (tipTimer.current) window.clearTimeout(tipTimer.current)
    }
  }, [])

  const getHistory = (): HistoryItem[] => {
    try {
      return JSON.parse(localStorage.getItem(historyKey) || '[]') as HistoryItem[]
    } catch {
      return []
    }
  }

  const pushHistory = (content: string) => {
    const list = getHistory()
    list.push({ ts: Date.now(), content })
    // 只保留最近 60 秒
    const recent = list.filter(i => Date.now() - i.ts < DUP_WINDOW)
    try {
      localStorage.setItem(historyKey, JSON.stringify(recent))
    } catch {
      // localStorage 不可用时忽略
    }
  }

  const showTip = (msg: string) => {
    setTip(msg)
    if (tipTimer.current) window.clearTimeout(tipTimer.current)
    tipTimer.current = window.setTimeout(() => setTip(''), 2000)
  }

  const handleSend = () => {
    const content = text.trim()
    if (!content) return

    const now = Date.now()
    const history = getHistory()

    // 3 秒间隔
    if (history.length > 0 && now - history[history.length - 1].ts < MIN_INTERVAL) {
      showTip('发送过快，请稍候')
      return
    }
    // 60 秒重复
    if (history.some(i => i.content === content && now - i.ts < DUP_WINDOW)) {
      showTip('请勿刷屏，60秒内不可重复')
      return
    }
    // 每分钟 5 条
    const lastMin = history.filter(i => now - i.ts < 60000)
    if (lastMin.length >= MAX_PER_MIN) {
      showTip('本分钟发送已达上限，休息一下吧')
      return
    }

    onSend(content)
    pushHistory(content)
    setText('')
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white/80 backdrop-blur-[20px] backdrop-saturate-[1.5] rounded-full">
      <input
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSend()}
        placeholder={tip || '发条弹幕…'}
        maxLength={30}
        aria-label="发送弹幕"
        className="flex-1 bg-transparent text-[14px] text-ink-800 placeholder:text-ink-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-seal/30 rounded-full px-2"
      />
      <button
        onClick={handleSend}
        disabled={!text.trim()}
        aria-label="发送弹幕"
        className="w-7 h-7 rounded-full bg-seal text-white flex items-center justify-center disabled:opacity-40 active:scale-90 motion-reduce:active:scale-100 transition-transform shrink-0"
      >
        <Send size={13} />
      </button>
    </div>
  )
}
