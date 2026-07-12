import { useNavigate, useLocation } from 'react-router-dom'
import { Leaf, ChevronDown, Sparkles } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useSidebarStore, ICON_MAP, ALL_NAV_ITEMS } from '../stores/sidebarStore'

interface DesktopSidebarProps {
  collapsed?: boolean
}

// 分组标题配置
const GROUP_LABELS: Record<number, { label: string; hint?: string }> = {
  1: { label: '核心' },
  2: { label: '求证' },
  3: { label: '发现' },
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
  const rankLabel = currentPoints >= 800 ? '洞察者' : currentPoints >= 500 ? '求索者' : '观微者'

  // ── 折叠态 ──
  if (collapsed) {
    return (
      <aside className="w-full h-full flex flex-col bg-paper-0 border-r border-ink-100/60 items-center py-5">
        {/* Logo */}
        <button
          onClick={() => navigate('/melon')}
          className="w-10 h-10 rounded-xl bg-gradient-to-br from-ink-900 to-ink-700 flex items-center justify-center mb-7 flex-shrink-0 shadow-sm hover:shadow-md transition-shadow group"
          title="观微"
        >
          <Leaf size={18} className="text-seal-500 group-hover:text-seal-400 transition-colors" strokeWidth={2.5} />
        </button>

        {/* 导航 */}
        <nav className="flex flex-col gap-0.5 flex-shrink-0">
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
                    ? 'bg-seal-50 text-seal-600'
                    : 'text-ink-400 hover:bg-paper-100 hover:text-ink-700'
                }`}
              >
                <Icon size={18} strokeWidth={isActive ? 2.25 : 1.75} />
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-seal-500 rounded-r-full" />
                )}
              </button>
            )
          })}
        </nav>

        {/* 底部用户 */}
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

  // ── 展开态 ──
  return (
    <aside className="w-full h-full flex flex-col bg-paper-0 border-r border-ink-100/60">
      {/* Logo 区 */}
      <div className="px-5 pt-6 pb-5 flex-shrink-0">
        <button
          onClick={() => navigate('/melon')}
          className="flex items-center gap-3 group w-full text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ink-900 to-ink-700 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
            <Leaf size={20} className="text-seal-500" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[18px] font-bold text-ink-900 tracking-tight font-serif-cn">观微</span>
            <span className="text-[9px] text-ink-300 tracking-[0.25em] font-semibold uppercase">GUANWEI</span>
          </div>
        </button>
      </div>

      {/* 导航 */}
      <nav className="px-3 flex-shrink-0 flex-1 overflow-y-auto scrollbar-thin pb-3">
        {(() => {
          let lastGroup: number | null = null
          return navItems.map((item) => {
            const isActive = isNavActive(item.path)
            const Icon = ICON_MAP[item.icon]
            const showGroupHeader = lastGroup === null || item.group !== lastGroup
            const groupInfo = GROUP_LABELS[item.group]
            lastGroup = item.group

            // 一级重点页面（娱乐、求证、设置）使用特殊样式标记
            const isPrimary = ['verify', 'entertainment', 'settings'].includes(item.id)

            return (
              <div key={item.id} className={showGroupHeader ? 'mt-4 first:mt-0' : ''}>
                {showGroupHeader && groupInfo && (
                  <div className="flex items-center gap-2 px-3.5 mb-1.5">
                    <span className="text-[10px] font-semibold text-ink-300 tracking-[0.15em] uppercase">
                      {groupInfo.label}
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-r from-ink-100/60 to-transparent" />
                  </div>
                )}
                <button
                  onClick={() => navigate(item.path)}
                  className={`relative flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-[14px] transition-all duration-200 group ${
                    isActive
                      ? 'bg-seal-50 text-seal-600 font-medium'
                      : 'text-ink-500 hover:bg-paper-50 hover:text-ink-900 font-normal'
                  }`}
                >
                  {/* 图标容器 */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                    isActive
                      ? 'bg-seal-100/60'
                      : 'bg-paper-100/50 group-hover:bg-paper-100'
                  }`}>
                    <Icon size={17} strokeWidth={isActive ? 2.25 : 1.75} />
                  </div>

                  {/* 文字 */}
                  <span className="flex-1 text-left">{item.label}</span>

                  {/* 一级页面标记 */}
                  {isPrimary && !isActive && (
                    <Sparkles size={12} className="text-gold opacity-60" />
                  )}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-seal-500 rounded-r-full" />
                  )}
                </button>
              </div>
            )
          })
        })()}
      </nav>

      {/* 底部用户卡片 */}
      <div className="px-3 pb-4 pt-3 flex-shrink-0 border-t border-ink-100/50">
        {user ? (
          <button
            onClick={() => navigate('/profile')}
            className="w-full group"
          >
            <div className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl hover:bg-paper-50 transition-colors">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-ink-900 to-ink-700 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="8" r="4" fill="#fafafa" />
                    <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" fill="#fafafa" opacity="0.7" />
                    <circle cx="10" cy="7.5" r="0.7" fill="#111" />
                    <circle cx="14" cy="7.5" r="0.7" fill="#111" />
                  </svg>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-bamboo border-2 border-paper-0" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[13px] font-semibold text-ink-800 truncate leading-tight">
                  {user.nickname || '学习者'}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 h-1 bg-paper-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-seal-500 to-gold rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-ink-400 font-mono flex-shrink-0 font-medium">
                    {rankLabel}
                  </span>
                </div>
              </div>
              <ChevronDown size={15} className="text-ink-200 flex-shrink-0 group-hover:text-ink-400 transition-colors" />
            </div>
          </button>
        ) : (
          <div className="flex items-center gap-3 px-2.5 py-2.5">
            <div className="w-10 h-10 rounded-full bg-paper-100 flex items-center justify-center flex-shrink-0">
              <span className="text-[13px] text-ink-300 font-medium">?</span>
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
