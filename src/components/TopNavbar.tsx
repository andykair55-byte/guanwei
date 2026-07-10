import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Search, Bell, Mail, PenSquare } from 'lucide-react'

export default function TopNavbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchFocused, setSearchFocused] = useState(false)

  const unreadNotifications = 15
  const unreadMessages = 3

  return (
    <header className="h-[56px] flex items-center bg-white/98 backdrop-blur-md border-b border-ink-100/50 flex-shrink-0 z-50 px-7">
      <div className="flex-1 max-w-xl">
        <div
          className={`flex items-center gap-2.5 px-4 py-2 rounded-xl transition-all duration-200 ${
            searchFocused
              ? 'bg-white ring-1 ring-ink-200 shadow-sm'
              : 'bg-paper-100 hover:bg-white hover:ring-1 hover:ring-ink-100'
          }`}
        >
          <Search size={15} className="text-ink-400 flex-shrink-0" strokeWidth={2} />
          <input
            type="text"
            placeholder="搜索热点、求证、辩论..."
            className="flex-1 bg-transparent outline-none text-[13px] text-ink-800 placeholder:text-ink-400"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            autoComplete="off"
          />
        </div>
      </div>

      <div className="flex items-center gap-1 ml-6">
        <button
          onClick={() => navigate('/publish')}
          className="flex items-center gap-1.5 px-4 py-2 bg-ink-900 text-white rounded-xl text-[13px] font-semibold hover:bg-ink-700 transition-colors shadow-sm"
        >
          <PenSquare size={14} strokeWidth={2} />
          <span>发布</span>
        </button>

        <div className="w-px h-5 bg-ink-100 mx-2.5" />

        <button
          onClick={() => navigate('/notifications')}
          className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
            location.pathname === '/notifications' ? 'bg-paper-100 text-ink-900' : 'text-ink-500 hover:bg-paper-100'
          }`}
        >
          <Bell size={18} strokeWidth={1.75} />
          {unreadNotifications > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-[16px] rounded-full bg-seal-600 text-white text-[9px] font-bold flex items-center justify-center px-0.5">
              {unreadNotifications > 99 ? '99+' : unreadNotifications}
            </span>
          )}
        </button>

        <button
          onClick={() => navigate('/messages')}
          className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
            location.pathname === '/messages' ? 'bg-paper-100 text-ink-900' : 'text-ink-500 hover:bg-paper-100'
          }`}
        >
          <Mail size={18} strokeWidth={1.75} />
          {unreadMessages > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-seal-600" />
          )}
        </button>
      </div>
    </header>
  )
}
