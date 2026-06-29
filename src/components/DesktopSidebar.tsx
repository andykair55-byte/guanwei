import { useNavigate, useLocation } from 'react-router-dom'
import { Wheat, Users, Plus, Search, User, Swords, Wrench, Trophy, Cpu } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface NavItem {
  path: string
  label: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { path: '/melon', label: '瓜田', icon: Wheat },
  { path: '/community', label: '社区', icon: Users },
  { path: '/publish', label: '发帖', icon: Plus },
  { path: '/verify', label: '求证', icon: Search },
  { path: '/debate-lobby', label: '辩论场', icon: Swords },
  { path: '/profile', label: '我的', icon: User },
]

const toolItems: NavItem[] = [
  { path: '/tools/exif', label: 'EXIF鉴定', icon: Search },
  { path: '/tools/emotion', label: '情绪检测', icon: Search },
  { path: '/tools/reverse-image', label: '反向搜图', icon: Search },
  { path: '/tools/timeline', label: '时间线', icon: Search },
  { path: '/settings/llm', label: 'LLM 设置', icon: Cpu },
]

export default function DesktopSidebar() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <aside className="w-[240px] flex-shrink-0 h-full overflow-y-auto border-r border-line/30 bg-surface/50">
      {/* Logo */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-xl font-bold text-ink-900 tracking-tight">观微</h1>
        <p className="text-sm text-ink-400 mt-0.5">不信一家之言</p>
      </div>

      {/* 主导航 */}
      <nav className="px-3 space-y-1">
        {navItems.map(item => {
          const isActive = location.pathname.startsWith(item.path) && item.path !== '/publish'
          const Icon = item.icon
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-base transition-all ${
                isActive
                  ? 'bg-seal/8 text-seal font-semibold'
                  : 'text-ink-500 hover:bg-ink-100/50 hover:text-ink-700 font-normal'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.2 : 1.6} />
              <span>{item.label}</span>
              {item.path === '/publish' && (
                <span className="ml-auto w-6 h-6 rounded-lg bg-seal flex items-center justify-center">
                  <Plus size={14} className="text-white" />
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* 分隔线 */}
      <div className="mx-5 my-3 border-t border-line/20" />

      {/* 工具箱 */}
      <div className="px-3">
        <p className="px-3 mb-1 text-sm text-ink-400 font-medium uppercase tracking-wider">工具箱</p>
        {toolItems.map(item => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-base text-ink-400 hover:bg-ink-100/50 hover:text-ink-600 transition-all"
          >
            <Wrench size={18} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* 底部信息 */}
      <div className="mx-5 mt-auto pt-4 pb-6">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gold/5 border border-gold/10">
          <Trophy size={16} className="text-gold" />
          <span className="text-sm text-ink-500">TRAE AI 创造力大赛</span>
        </div>
      </div>
    </aside>
  )
}
