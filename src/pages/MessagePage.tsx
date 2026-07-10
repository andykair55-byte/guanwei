import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Send, Image, Smile, MoreHorizontal, Phone, Video, ChevronLeft } from 'lucide-react'

interface Message {
  id: string
  content: string
  time: string
  isSelf: boolean
}

interface Conversation {
  id: string
  name: string
  avatar: string
  avatarBg: string
  lastMessage: string
  time: string
  unread: number
  online: boolean
  messages: Message[]
}

const AVATAR_BG = ['#111', '#c0392b', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']

function getAvatarBg(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_BG[Math.abs(hash) % AVATAR_BG.length]
}

const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'c1', name: '事实猎人', avatar: '事', avatarBg: '#10b981',
    lastMessage: '那个隔夜菜的求证结果出来了，你看看报告', time: '刚刚',
    unread: 2, online: true,
    messages: [
      { id: 'm1', content: '嗨，隔夜菜那个求证结果出来了吗？', time: '10:20', isSelf: true },
      { id: 'm2', content: '刚收到AI分析报告，结论挺有意思的', time: '10:21', isSelf: false },
      { id: 'm3', content: '核心发现：亚硝酸盐确实会随时间累积，但在正常冷藏条件下24小时内增量远低于安全阈值', time: '10:22', isSelf: false },
      { id: 'm4', content: '所以"隔夜菜致癌"这个说法是夸大的？', time: '10:23', isSelf: true },
      { id: 'm5', content: '对，属于"技术上有一点道理但被严重夸大"。真正风险在于反复加热和不规范储存', time: '10:24', isSelf: false },
      { id: 'm6', content: '那个隔夜菜的求证结果出来了，你看看报告', time: '10:25', isSelf: false },
    ],
  },
  {
    id: 'c2', name: '逻辑怪', avatar: '逻', avatarBg: '#3b82f6',
    lastMessage: '今晚的辩论你准备好了吗？正方论点我整理好了', time: '5分钟前',
    unread: 1, online: true,
    messages: [
      { id: 'm1', content: '辩论准备得怎么样了？', time: '09:15', isSelf: true },
      { id: 'm2', content: '正方三个论点已经梳理完毕', time: '09:18', isSelf: false },
      { id: 'm3', content: '今晚的辩论你准备好了吗？正方论点我整理好了', time: '09:25', isSelf: false },
    ],
  },
  {
    id: 'c3', name: '警惕的大学生', avatar: '警', avatarBg: '#f59e0b',
    lastMessage: '谢谢你帮我分析那条兼职广告！', time: '30分钟前',
    unread: 0, online: false,
    messages: [
      { id: 'm1', content: '你好！看到你发的兼职广告分析帖了，能帮我看一个吗？', time: '08:00', isSelf: false },
      { id: 'm2', content: '当然可以，发过来吧', time: '08:05', isSelf: true },
      { id: 'm3', content: '这个是典型的刷单诈骗套路', time: '08:10', isSelf: true },
      { id: 'm4', content: '谢谢你帮我分析那条兼职广告！', time: '08:12', isSelf: false },
    ],
  },
  {
    id: 'c4', name: '理科生求真', avatar: '理', avatarBg: '#8b5cf6',
    lastMessage: '室温超导那篇论文的撤稿时间线我整理好了', time: '1小时前',
    unread: 3, online: false,
    messages: [
      { id: 'm1', content: '室温超导最新进展：Nature已确认撤稿', time: '昨天', isSelf: false },
      { id: 'm2', content: '终于有定论了', time: '昨天', isSelf: true },
      { id: 'm3', content: '室温超导那篇论文的撤稿时间线我整理好了', time: '昨天', isSelf: false },
    ],
  },
  {
    id: 'c5', name: '保研党', avatar: '保', avatarBg: '#c0392b',
    lastMessage: '那个保研内幕的消息群里好多人都在讨论', time: '2小时前',
    unread: 0, online: true,
    messages: [
      { id: 'm1', content: '保研群里有个人说花5万能买名额，靠谱吗？', time: '昨天', isSelf: false },
      { id: 'm2', content: '100%是骗局，别理他', time: '昨天', isSelf: true },
      { id: 'm3', content: '那个保研内幕的消息群里好多人都在讨论', time: '昨天', isSelf: false },
    ],
  },
  {
    id: 'c6', name: '技术宅', avatar: '技', avatarBg: '#10b981',
    lastMessage: '校园网提速方案实测效果不错', time: '昨天',
    unread: 0, online: false,
    messages: [
      { id: 'm1', content: '试了下你说的校园网提速方案，速度提升很明显', time: '前天', isSelf: false },
      { id: 'm2', content: '校园网提速方案实测效果不错', time: '前天', isSelf: false },
    ],
  },
]

export default function MessagePage() {
  const navigate = useNavigate()
  const [conversations, setConversations] = useState(INITIAL_CONVERSATIONS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const selectedConv = conversations.find(c => c.id === selectedId)

  const filteredConvs = searchQuery.trim()
    ? conversations.filter(c => c.name.includes(searchQuery.trim()))
    : conversations

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [selectedConv?.messages.length])

  useEffect(() => {
    if (selectedId) {
      setConversations(prev => prev.map(c =>
        c.id === selectedId ? { ...c, unread: 0 } : c
      ))
    }
  }, [selectedId])

  const handleSend = () => {
    if (!inputValue.trim() || !selectedConv) return
    const newMsg: Message = {
      id: `new-${Date.now()}`,
      content: inputValue.trim(),
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      isSelf: true,
    }
    setConversations(prev => prev.map(c =>
      c.id === selectedConv.id
        ? {
            ...c,
            messages: [...c.messages, newMsg],
            lastMessage: newMsg.content,
            time: '刚刚',
          }
        : c
    ))
    setInputValue('')

    setTimeout(() => {
      const replies = ['收到！', '好的我看看', '这个想法不错', '有道理', '让我想想...']
      const reply: Message = {
        id: `reply-${Date.now()}`,
        content: replies[Math.floor(Math.random() * replies.length)],
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        isSelf: false,
      }
      setConversations(prev => prev.map(c =>
        c.id === selectedConv.id
          ? { ...c, messages: [...c.messages, reply], lastMessage: reply.content, time: '刚刚' }
          : c
      ))
    }, 800 + Math.random() * 1000)
  }

  return (
    <div className="h-full flex bg-white">
      <div className={`w-full md:w-[340px] border-r border-ink-50 flex flex-col flex-shrink-0 ${selectedId ? 'hidden md:flex' : 'flex'}`}>
        <div className="px-4 pt-4 pb-3 flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-paper-100 transition-colors -ml-1"
          >
            <ChevronLeft size={22} className="text-ink-700" />
          </button>
          <h1 className="text-[20px] font-bold text-ink-900">私信</h1>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索私信"
              className="w-full pl-9 pr-4 h-9 rounded-full bg-paper-100 text-[13px] outline-none placeholder:text-ink-300 focus:ring-1 focus:ring-ink-200 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConvs.map(conv => (
            <button
              key={conv.id}
              onClick={() => setSelectedId(conv.id)}
              className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-paper-50 ${
                selectedId === conv.id ? 'bg-paper-100' : ''
              }`}
            >
              <div className="relative flex-shrink-0">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-[15px] font-bold text-white"
                  style={{ backgroundColor: conv.avatarBg }}
                >
                  {conv.avatar}
                </div>
                {conv.online && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[14px] font-semibold text-ink-800 truncate">{conv.name}</span>
                  <span className="text-[11px] text-ink-300 flex-shrink-0 ml-2">{conv.time}</span>
                </div>
                <p className="text-[13px] text-ink-400 truncate">{conv.lastMessage}</p>
              </div>

              {conv.unread > 0 && (
                <span className="flex-shrink-0 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {conv.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className={`flex-1 flex flex-col min-w-0 ${selectedId ? 'flex' : 'hidden md:flex'}`}>
        {selectedConv ? (
          <>
            <header className="h-14 flex items-center gap-3 px-4 border-b border-ink-50 flex-shrink-0">
              <button
                onClick={() => setSelectedId(null)}
                className="md:hidden p-1 -ml-1 rounded-full hover:bg-paper-100"
              >
                <ChevronLeft size={22} className="text-ink-600" />
              </button>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0"
                style={{ backgroundColor: selectedConv.avatarBg }}
              >
                {selectedConv.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[15px] font-semibold text-ink-900">{selectedConv.name}</h2>
                <p className="text-[11px] text-ink-400">{selectedConv.online ? '在线' : '离线'}</p>
              </div>
              <div className="flex items-center gap-1">
                <button className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-paper-100 transition-colors">
                  <Phone size={18} className="text-ink-500" />
                </button>
                <button className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-paper-100 transition-colors">
                  <Video size={18} className="text-ink-500" />
                </button>
                <button className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-paper-100 transition-colors">
                  <MoreHorizontal size={18} className="text-ink-500" />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {selectedConv.messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.isSelf ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${
                      msg.isSelf
                        ? 'bg-seal-600 text-white rounded-br-md'
                        : 'bg-paper-100 text-ink-800 rounded-bl-md'
                    }`}
                  >
                    <p className="text-[14px] leading-relaxed">{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${msg.isSelf ? 'text-white/60 text-right' : 'text-ink-300'}`}>
                      {msg.time}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="flex items-center gap-2 px-4 py-3 border-t border-ink-50 flex-shrink-0">
              <button className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-paper-100 transition-colors flex-shrink-0">
                <Image size={20} className="text-ink-400" />
              </button>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="发送消息..."
                  className="w-full h-10 px-4 pr-10 rounded-full bg-paper-100 text-[14px] outline-none placeholder:text-ink-300 focus:ring-1 focus:ring-ink-200 transition-all"
                />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center hover:bg-paper-200 transition-colors">
                  <Smile size={18} className="text-ink-400" />
                </button>
              </div>
              <button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                  inputValue.trim()
                    ? 'bg-seal-600 hover:bg-seal-500'
                    : 'bg-paper-100'
                }`}
              >
                <Send size={17} className={inputValue.trim() ? 'text-white' : 'text-ink-300'} />
              </button>
            </div>
          </>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-paper-100 flex items-center justify-center mx-auto mb-4">
                <Send size={32} className="text-ink-200" />
              </div>
              <p className="text-[15px] text-ink-400">选择一个对话开始聊天</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
