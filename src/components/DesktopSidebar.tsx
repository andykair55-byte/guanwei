import { useNavigate, useLocation } from 'react-router-dom'
import { Leaf, ChevronDown, SlidersHorizontal } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useSidebarStore, ICON_MAP, ALL_NAV_ITEMS } from '../stores/sidebarStore'

interface DesktopSidebarProps {
  collapsed?: boolean
}

export default function DesktopSidebar({ collapsed = false }: DesktopSidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore(s => s.user)
  const enabledItems = useSidebarStore(s => s.enabledItems)
  const navItems = enabledItems
    .map(id => ALL_NAV_ITEMS.find(item => item.id === id))
    .filter(Boolean) as typeof ALL_NAV_ITEMS

  const isNavActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
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
            const Icon = ICON_MAP[item.icon]
            return (
              <button
                key={item.id}
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
        {(() => {
          let lastGroup: number | null = null
          return navItems.map((item) => {
            const isActive = isNavActive(item.path)
            const Icon = ICON_MAP[item.icon]
            const showDivider = lastGroup !== null && item.group !== lastGroup
            lastGroup = item.group
            return (
              <div key={item.id}>
                {showDivider && <div className="h-px bg-ink-100/60 mx-3.5 my-2" />}
                <button
                  onClick={() => navigate(item.path)}
                  className={`relative flex items-center gap-3 w-full px-3.5 py-3 rounded-xl text-[15px] transition-all duration-200 ${
                    isActive
                      ? 'bg-seal-50 text-seal-600 font-medium shadow-sm'
                      : 'text-ink-500 hover:bg-paper-50 hover:text-ink-900 font-normal'
                  }`}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.25 : 1.75} />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-seal-600 rounded-r-full" />
                  )}
                </button>
              </div>
            )
          })
        })()}
      </nav>

      <div className="px-3 pb-5 pt-3 flex-shrink-0 border-t border-ink-100/50 mt-auto">
        <button
          className="flex items-center gap-2 w-full px-3.5 py-2 mb-2 rounded-xl text-[13px] text-ink-300 hover:text-ink-500 hover:bg-paper-50 transition-all duration-200"
          title="自定义导航项"
        >
          <SlidersHorizontal size={15} strokeWidth={1.75} />
          <span>编辑导航</span>
        </button>
        {user ? (
          <button
            onClick={() => navigate('/profile')}
            className="w-full group"
          >
            <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-paper-50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-ink-900 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="4" fill="#fafafa" />
                  <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" fill="#fafafa" opacity="0.7" />
                  <circle cx="10" cy="7.5" r="0.7" fill="#111" />
                  <circle cx="14" cy="7.5" r="0.7" fill="#111" />
                </svg>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[14px] font-semibold text-ink-800 truncate leading-tight">
                  {user.nickname || '学习者'}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-paper-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-ink-900 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-ink-400 font-mono flex-shrink-0 font-medium">
                    {currentPoints}
                  </span>
                </div>
              </div>
              <ChevronDown size={15} className="text-ink-200 flex-shrink-0 group-hover:text-ink-400 transition-colors" />
            </div>
          </button>
        ) : (
          <div className="flex items-center gap-3 px-3 py-3">
            <div className="w-10 h-10 rounded-full bg-paper-100 flex items-center justify-center flex-shrink-0">
              <span className="text-[13px] text-ink-300 font-medium">?</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-medium text-ink-300">未登录</p>
              <div className="mt-2 h-1.5 bg-paper-100 rounded-full" />
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
