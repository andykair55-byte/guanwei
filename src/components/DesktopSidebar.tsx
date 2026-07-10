import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Leaf, Users, Clock, PenSquare, Briefcase, Settings,
  ChevronDown,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

interface NavItem {
  path: string
  label: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { path: '/melon', label: '瓜田', icon: Leaf },
  { path: '/community', label: '社区', icon: Users },
  { path: '/hot', label: '时间线', icon: Clock },
  { path: '/publish', label: '发布', icon: PenSquare },
  { path: '/agent-world', label: '工作间', icon: Briefcase },
  { path: '/settings/llm', label: '设置', icon: Settings },
]

interface DesktopSidebarProps {
  collapsed?: boolean
}

export default function DesktopSidebar({ collapsed = false }: DesktopSidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore(s => s.user)

  const isNavActive = (path: string) => {
    if (path === '/melon') return location.pathname === '/melon' || location.pathname.startsWith('/melon/')
    if (path === '/community') return location.pathname === '/community' || location.pathname.startsWith('/community/')
    if (path === '/hot') return location.pathname === '/hot' || location.pathname.startsWith('/hot/')
    if (path === '/agent-world') return location.pathname === '/agent-world' || location.pathname.startsWith('/agent-world')
    return location.pathname.startsWith(path)
  }

  const currentPoints = user?.points ?? 620
  const maxPoints = 1000
  const progressPercent = Math.min((currentPoints / maxPoints) * 100, 100)

  if (collapsed) {
    return (
      <aside className="w-full h-full flex flex-col bg-white border-r border-ink-100/50 items-center py-5">
        <div className="w-10 h-10 rounded-xl bg-ink-900 flex items-center justify-center mb-8 flex-shrink-0 shadow-sm">
          <Leaf size={18} className="text-seal-600" strokeWidth={2.5} />
        </div>

        <nav className="flex flex-col gap-1 flex-shrink-0">
          {navItems.map((item) => {
            const isActive = isNavActive(item.path)
            const Icon = item.icon
            return (
              <button
                key={item.path + item.label}
                onClick={() => navigate(item.path)}
                title={item.label}
                className={`relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-seal-50 text-seal-600 shadow-sm'
                    : 'text-ink-400 hover:bg-paper-100 hover:text-ink-700'
                }`}
              >
                <Icon size={18} strokeWidth={isActive ? 2.25 : 1.75} />
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-seal-600 rounded-r-full" />
                )}
              </button>
            )
          })}
        </nav>

        <div className="mt-auto flex flex-col items-center gap-3 flex-shrink-0 pb-2">
          <button
            onClick={() => navigate('/profile')}
            title={user?.nickname || '个人中心'}
            className="w-10 h-10 rounded-full bg-ink-900 flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-ink-200 transition-all"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" fill="#fafafa" />
              <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" fill="#fafafa" opacity="0.7" />
              <circle cx="10" cy="7.5" r="0.7" fill="#111" />
              <circle cx="14" cy="7.5" r="0.7" fill="#111" />
            </svg>
          </button>
        </div>
      </aside>
    )
  }

  return (
    <aside className="w-full h-full flex flex-col bg-white border-r border-ink-100/50">
      <div className="px-5 pt-6 pb-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ink-900 flex items-center justify-center shadow-sm">
            <Leaf size={20} className="text-seal-600" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[18px] font-bold text-ink-900 tracking-tight">观微</span>
            <span className="text-[9px] text-ink-300 tracking-[0.25em] font-semibold uppercase">GUANWEI</span>
          </div>
        </div>
      </div>

      <nav className="px-3 flex-shrink-0">
        {navItems.map((item) => {
          const isActive = isNavActive(item.path)
          const Icon = item.icon
          return (
            <button
              key={item.path + item.label}
              onClick={() => navigate(item.path)}
              className={`relative flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-[14px] transition-all duration-200 mb-0.5 ${
                isActive
                  ? 'bg-seal-50 text-seal-600 font-medium shadow-sm'
                  : 'text-ink-500 hover:bg-paper-50 hover:text-ink-900 font-normal'
              }`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.25 : 1.75} />
              <span>{item.label}</span>
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-seal-600 rounded-r-full" />
              )}
            </button>
          )
        })}
      </nav>

      <div className="px-3 pb-5 pt-4 flex-shrink-0 border-t border-ink-100/50 mt-auto">
        {user ? (
          <button
            onClick={() => navigate('/profile')}
            className="w-full group"
          >
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-paper-50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-ink-900 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="4" fill="#fafafa" />
                  <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" fill="#fafafa" opacity="0.7" />
                  <circle cx="10" cy="7.5" r="0.7" fill="#111" />
                  <circle cx="14" cy="7.5" r="0.7" fill="#111" />
                </svg>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-1.5">
                  <p className="text-[13px] font-semibold text-ink-800 truncate leading-tight">
                    {user.nickname || '学习者'}
                  </p>
                  <span className="text-[10px] text-ink-400 font-bold flex-shrink-0 bg-paper-100 px-1.5 py-0.5 rounded-md">
                    Lv.18
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 h-1 bg-paper-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-ink-900 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-ink-400 font-mono flex-shrink-0 font-medium">
                    {currentPoints}
                  </span>
                </div>
              </div>
              <ChevronDown size={14} className="text-ink-200 flex-shrink-0 group-hover:text-ink-400 transition-colors" />
            </div>
          </button>
        ) : (
          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="w-10 h-10 rounded-full bg-paper-100 flex items-center justify-center flex-shrink-0">
              <span className="text-[12px] text-ink-300 font-medium">?</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-ink-300">未登录</p>
              <div className="mt-1.5 h-1 bg-paper-100 rounded-full" />
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
