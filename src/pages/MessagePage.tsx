import { useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Send, Image, Smile, MoreHorizontal, Phone, Video, ChevronLeft } from 'lucide-react'
import { useMessageStore } from '../stores/messageStore'

export default function MessagePage() {
  const navigate = useNavigate()
  const conversations = useMessageStore(s => s.conversations)
  const selectedId = useMessageStore(s => s.selectedId)
  const searchQuery = useMessageStore(s => s.searchQuery)
  const inputValue = useMessageStore(s => s.inputValue)
  const setSelectedId = useMessageStore(s => s.setSelectedId)
  const setSearchQuery = useMessageStore(s => s.setSearchQuery)
  const setInputValue = useMessageStore(s => s.setInputValue)
  const sendMessage = useMessageStore(s => s.sendMessage)
  const markConversationRead = useMessageStore(s => s.markConversationRead)
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
      markConversationRead(selectedId)
    }
  }, [selectedId, markConversationRead])

  const handleSend = () => {
    if (!inputValue.trim() || !selectedConv) return
    sendMessage(selectedConv.id, inputValue.trim())
    setInputValue('')
  }

  return (
    <div className="h-full flex bg-white">
      <div className={`w-full md:w-[340px] border-r border-[#ececec] flex flex-col flex-shrink-0 ${selectedId ? 'hidden md:flex' : 'flex'}`}>
        <div className="px-4 pt-4 pb-3 flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#f5f5f5] transition-colors -ml-1"
          >
            <ChevronLeft size={22} className="text-[#333]" />
          </button>
          <h1 className="text-[20px] font-bold text-[#111]">私信</h1>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索私信"
              className="w-full pl-9 pr-4 h-9 rounded-xl bg-[#f5f5f5] text-[13px] outline-none placeholder:text-[#999] focus:ring-1 focus:ring-[#ddd] transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConvs.map(conv => (
            <button
              key={conv.id}
              onClick={() => setSelectedId(conv.id)}
              className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-[#fafafa] ${
                selectedId === conv.id ? 'bg-[#f0f0f0]' : ''
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
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[14px] font-semibold text-[#111] truncate">{conv.name}</span>
                  <span className="text-[11px] text-[#999] flex-shrink-0 ml-2">{conv.time}</span>
                </div>
                <p className="text-[13px] text-[#999] truncate">{conv.lastMessage}</p>
              </div>

              {conv.unread > 0 && (
                <span className="flex-shrink-0 min-w-[16px] h-[16px] bg-[#111] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
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
            <header className="h-14 flex items-center gap-3 px-4 border-b border-[#ececec] flex-shrink-0">
              <button
                onClick={() => setSelectedId(null)}
                className="md:hidden p-1 -ml-1 rounded-full hover:bg-[#f5f5f5]"
              >
                <ChevronLeft size={22} className="text-[#555]" />
              </button>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0"
                style={{ backgroundColor: selectedConv.avatarBg }}
              >
                {selectedConv.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[15px] font-semibold text-[#111]">{selectedConv.name}</h2>
                <p className="text-[11px] text-[#999]">{selectedConv.online ? '在线' : '离线'}</p>
              </div>
              <div className="flex items-center gap-1">
                <button className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#f5f5f5] transition-colors">
                  <Phone size={18} className="text-[#555]" />
                </button>
                <button className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#f5f5f5] transition-colors">
                  <Video size={18} className="text-[#555]" />
                </button>
                <button className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#f5f5f5] transition-colors">
                  <MoreHorizontal size={18} className="text-[#555]" />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {selectedConv.messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.isSelf ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${
                      msg.isSelf
                        ? 'bg-[#111] text-white rounded-br-md'
                        : 'bg-[#f5f5f5] text-[#333] rounded-bl-md'
                    }`}
                  >
                    <p className="text-[14px] leading-relaxed">{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${msg.isSelf ? 'text-white/60 text-right' : 'text-[#999]'}`}>
                      {msg.time}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="flex items-center gap-2 px-4 py-3 border-t border-[#ececec] flex-shrink-0">
              <button className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#f5f5f5] transition-colors flex-shrink-0">
                <Image size={20} className="text-[#999]" />
              </button>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="发送消息..."
                  className="w-full h-10 px-4 pr-10 rounded-xl bg-[#f5f5f5] text-[14px] outline-none placeholder:text-[#999] focus:ring-1 focus:ring-[#ddd] transition-all"
                />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center hover:bg-[#e8e8e8] transition-colors">
                  <Smile size={18} className="text-[#999]" />
                </button>
              </div>
              <button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                  inputValue.trim()
                    ? 'bg-[#111] hover:bg-[#333]'
                    : 'bg-[#f5f5f5]'
                }`}
              >
                <Send size={17} className={inputValue.trim() ? 'text-white' : 'text-[#999]'} />
              </button>
            </div>
          </>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-[#f5f5f5] flex items-center justify-center mx-auto mb-4">
                <Send size={32} className="text-[#ddd]" />
              </div>
              <p className="text-[15px] text-[#999]">选择一个对话开始聊天</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
