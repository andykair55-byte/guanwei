import { useNavigate, useLocation } from 'react-router-dom'
import {
  Leaf, Flame, Clock, PenSquare, Briefcase, Settings,
  PanelLeftClose, PanelLeftOpen
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
  { path: '/hot', label: '热点', icon: Flame },
  { path: '/tools/timeline', label: '时间线', icon: Clock },
  { path: '/publish', label: '发布', icon: PenSquare },
  { path: '/agent-world', label: '工作间', icon: Briefcase },
  { path: '/settings/llm', label: '设置', icon: Settings },
]

interface DesktopSidebarProps {
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export default function DesktopSidebar({ collapsed = false, onToggleCollapse }: DesktopSidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore(s => s.user)

  const isNavActive = (path: string) => {
    if (path === '/melon') return location.pathname === '/melon' || location.pathname.startsWith('/melon/')
    if (path === '/agent-world') return location.pathname === '/agent-world' || location.pathname.startsWith('/agent-world')
    return location.pathname.startsWith(path)
  }

  const currentPoints = user?.points ?? 620
  const maxPoints = 1000
  const progressPercent = Math.min((currentPoints / maxPoints) * 100, 100)

  return (
    <aside
      className="h-full flex flex-col flex-shrink-0 overflow-hidden"
      style={{
        width: '100%',
        background: '#fff',
        borderRight: '1px solid #f0f1f3',
      }}
    >
      {/* ── Logo + 折叠按钮（同一行，不重叠） ── */}
      <div className="flex-shrink-0 flex items-center h-[52px] px-3">
        {collapsed ? (
          /* 收起态：只显示一个居中的折叠按钮 */
          <button
            onClick={onToggleCollapse}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-300 hover:text-ink-500 hover:bg-ink-50 transition-colors mx-auto"
            title="展开侧边栏"
          >
            <PanelLeftOpen size={16} strokeWidth={1.5} />
          </button>
        ) : (
          /* 展开态：Logo 文字 + 右侧折叠按钮 */
          <>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
                <circle cx="8" cy="8" r="5.5" stroke="#c0392b" strokeWidth="1.2" fill="none" />
                <circle cx="8" cy="8" r="2" fill="#c0392b" />
              </svg>
              <span className="text-[15px] font-semibold tracking-tight text-ink-800">观微</span>
            </div>
            <button
              onClick={onToggleCollapse}
              className="w-7 h-7 flex items-center justify-center flex-shrink-0 rounded-md text-ink-200 hover:text-ink-400 hover:bg-ink-50 transition-colors"
              title="收起侧边栏"
            >
              <PanelLeftClose size={15} strokeWidth={1.5} />
            </button>
          </>
        )}
      </div>

      {/* ── 导航 ── */}
      <nav className="px-2 flex-shrink-0 space-y-0.5">
        {navItems.map((item) => {
          const isActive = isNavActive(item.path)
          const Icon = item.icon
          return (
            <button
              key={item.path + item.label}
              onClick={() => navigate(item.path)}
              className="relative flex items-center w-full rounded-lg transition-all duration-150"
              style={{
                padding: collapsed ? '9px 0' : '8px 10px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: collapsed ? 0 : 10,
                background: isActive ? '#f5f6f8' : 'transparent',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f8f9fa' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = isActive ? '#f5f6f8' : 'transparent' }}
              title={collapsed ? item.label : undefined}
            >
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full"
                  style={{ width: 3, height: 16, background: '#c0392b' }}
                />
              )}
              <Icon
                size={18}
                strokeWidth={isActive ? 1.8 : 1.5}
                className="flex-shrink-0 transition-colors"
                style={{ color: isActive ? '#c0392b' : '#8b98a5' }}
              />
              {!collapsed && (
                <span
                  className="text-[13px] truncate"
                  style={{ color: isActive ? '#1a2332' : '#6b7a8a', fontWeight: isActive ? 600 : 400 }}
                >
                  {item.label}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* ── 底部用户 ── */}
      <div className="flex-shrink-0 mt-auto px-2 pb-3">
        {user ? (
          <button
            onClick={() => navigate('/profile')}
            className="w-full flex items-center rounded-lg transition-colors"
            style={{
              padding: collapsed ? '8px 0' : '8px 10px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: collapsed ? 0 : 10,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f8f9fa')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            title={collapsed ? user.nickname : undefined}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: '#f5f6f8' }}
            >
              <span className="text-[11px] font-semibold text-ink-500">
                {user.nickname?.charAt(0) || '?'}
              </span>
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0 text-left flex items-center justify-between">
                <span className="text-[12px] font-medium text-ink-700 truncate">{user.nickname}</span>
                <span className="text-[10px] font-mono text-ink-300 flex-shrink-0">{currentPoints}</span>
              </div>
            )}
          </button>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="w-full flex items-center rounded-lg transition-colors"
            style={{
              padding: collapsed ? '8px 0' : '8px 10px',
              justifyContent: collapsed ? 'center' : 'flex-start',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f8f9fa')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: '#f5f6f8' }}
            >
              <span className="text-[11px] text-ink-300">?</span>
            </div>
            {!collapsed && <span className="text-[12px] text-ink-300 ml-2.5">登录</span>}
          </button>
        )}
      </div>
    </aside>
  )
}
