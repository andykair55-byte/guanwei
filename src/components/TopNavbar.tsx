import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Bell, Feather, User, Settings, LogOut, Heart, MessageSquare, AtSign, ChevronRight, Sparkles } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

interface Notification {
  id: number
  type: 'like' | 'comment' | 'mention' | 'system'
  content: string
  time: string
  read: boolean
}

const mockNotifications: Notification[] = [
  { id: 1, type: 'like', content: '逻辑怪 赞了你的评论 "我觉得这个数据有问题..."', time: '2分钟前', read: false },
  { id: 2, type: 'comment', content: '陈默深 回复了你的帖子："这个角度很有意思，补充一下..."', time: '15分钟前', read: false },
  { id: 3, type: 'mention', content: '苏小碗 在帖子中@了你："@你来看看这个瓜"', time: '1小时前', read: false },
  { id: 4, type: 'like', content: '喵喵研究所 等3人赞了你的求证笔记', time: '3小时前', read: true },
  { id: 5, type: 'system', content: '你的账号已通过实名认证，解锁全部功能', time: '昨天', read: true },
  { id: 6, type: 'comment', content: '真相观察员 回复了你的评论："同意，补充一个来源..."', time: '昨天', read: true },
]

function notifIcon(type: Notification['type']) {
  if (type === 'like') return <Heart size={14} className="text-red-500" />
  if (type === 'comment') return <MessageSquare size={14} className="text-blue-500" />
  if (type === 'mention') return <AtSign size={14} className="text-amber-500" />
  return <Sparkles size={14} className="text-seal" />
}

export default function TopNavbar() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [searchFocused, setSearchFocused] = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [notifs, setNotifs] = useState(mockNotifications)
  const notifRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifs.filter(n => !n.read).length

  const getInitial = (nickname: string) => {
    return nickname ? nickname.charAt(0) : '?'
  }

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const toggleNotifs = () => {
    setShowNotifs(s => !s)
    setShowUserMenu(false)
  }

  const toggleUserMenu = () => {
    setShowUserMenu(s => !s)
    setShowNotifs(false)
  }

  const markAllRead = () => {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
  }

  const handleLogout = () => {
    logout()
    setShowUserMenu(false)
    navigate('/login')
  }

  return (
    <header className="h-[56px] flex items-center bg-white border-b border-line/15 flex-shrink-0 z-50 px-6">
      <div className="flex-1 max-w-xl">
        <div
          className={`flex items-center gap-2.5 px-4 py-[7px] rounded-full transition-all duration-200 ${
            searchFocused
              ? 'ring-2 ring-seal/20 bg-white shadow-sm'
              : 'bg-paper-dark hover:bg-paper-deep/60'
          }`}
        >
          <Search size={16} className="text-ink-300 flex-shrink-0" />
          <input
            type="text"
            placeholder="搜索帖子、话题、用户..."
            className="flex-1 bg-transparent outline-none text-[13px] text-ink-900 placeholder:text-ink-400"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => navigate('/publish')}
          aria-label="发布内容"
          className="flex items-center gap-1.5 px-4 py-[7px] bg-ink-900 text-white rounded-full text-[13px] font-medium hover:bg-ink-800 press-pop transition-colors mr-2"
        >
          <Feather size={14} />
          <span>发布</span>
        </button>

        <div className="relative" ref={notifRef}>
          <button
            onClick={toggleNotifs}
            aria-label="通知"
            className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-paper-dark text-ink-500 hover:text-ink-700 press-pop transition-colors"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-medium flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-[340px] bg-white rounded-xl border border-line/20 shadow-lg overflow-hidden animate-fade-in-up z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-line/10">
                <span className="text-[14px] font-semibold text-ink-900">通知</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[11px] text-seal hover:text-seal/80 font-medium"
                  >
                    全部已读
                  </button>
                )}
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {notifs.map(n => (
                  <button
                    key={n.id}
                    className="w-full text-left px-4 py-3 hover:bg-paper-dark/60 transition-colors flex items-start gap-3 border-b border-line/5 last:border-b-0"
                  >
                    <div className="w-8 h-8 rounded-full bg-paper-dark flex items-center justify-center flex-shrink-0 mt-0.5">
                      {notifIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[12px] leading-relaxed ${n.read ? 'text-ink-500' : 'text-ink-800'}`}>
                        {n.content}
                      </p>
                      <p className="text-[10px] text-ink-400 mt-1">{n.time}</p>
                    </div>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-seal flex-shrink-0 mt-2" />
                    )}
                  </button>
                ))}
              </div>
              <button
                onClick={() => { setShowNotifs(false); navigate('/profile/notifications') }}
                className="w-full px-4 py-2.5 text-[12px] text-ink-500 hover:text-ink-700 hover:bg-paper-dark/40 transition-colors flex items-center justify-center gap-1 border-t border-line/10"
              >
                查看全部通知
                <ChevronRight size={12} />
              </button>
            </div>
          )}
        </div>

        <div className="relative" ref={userMenuRef}>
          <button
            onClick={toggleUserMenu}
            aria-label="个人中心"
            className="w-8 h-8 rounded-full overflow-hidden border border-line/20 hover:shadow-sm press-pop transition-all"
          >
            {user ? (
              <div className="w-full h-full bg-ink-800 text-white flex items-center justify-center text-[12px] font-medium">
                {getInitial(user.nickname)}
              </div>
            ) : (
              <div className="w-full h-full bg-paper-dark text-ink-500 flex items-center justify-center text-[12px]">
                ?
              </div>
            )}
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-[240px] bg-white rounded-xl border border-line/20 shadow-lg overflow-hidden animate-fade-in-up z-50">
              {user && (
                <div className="px-4 py-3 border-b border-line/10">
                  <p className="text-[14px] font-semibold text-ink-900 truncate">{user.nickname}</p>
                  <p className="text-[11px] text-ink-400 mt-0.5 truncate">@{user.username || 'guanwei'}</p>
                </div>
              )}

              <div className="py-1">
                <button
                  onClick={() => { setShowUserMenu(false); navigate('/profile') }}
                  className="w-full px-4 py-2.5 text-left text-[13px] text-ink-700 hover:bg-paper-dark/60 transition-colors flex items-center gap-2.5"
                >
                  <User size={15} className="text-ink-400" />
                  个人主页
                </button>
                <button
                  onClick={() => { setShowUserMenu(false); navigate('/settings/llm') }}
                  className="w-full px-4 py-2.5 text-left text-[13px] text-ink-700 hover:bg-paper-dark/60 transition-colors flex items-center gap-2.5"
                >
                  <Settings size={15} className="text-ink-400" />
                  设置
                </button>
              </div>

              {user && (
                <div className="border-t border-line/10 py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2.5 text-left text-[13px] text-red-500 hover:bg-red-50/50 transition-colors flex items-center gap-2.5"
                  >
                    <LogOut size={15} />
                    退出登录
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
