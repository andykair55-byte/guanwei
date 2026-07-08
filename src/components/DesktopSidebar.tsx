import { useNavigate, useLocation } from 'react-router-dom'
import {
  Wheat, Users, Plus, Search, User, Swords,
  Fingerprint, HeartPulse, Image, Clock, Cpu,
  Trophy, ChevronDown
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

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
  { path: '/tools/exif', label: 'EXIF 鉴定', icon: Fingerprint },
  { path: '/tools/emotion', label: '情绪检测', icon: HeartPulse },
  { path: '/tools/reverse-image', label: '反向搜图', icon: Image },
  { path: '/tools/timeline', label: '时间线', icon: Clock },
  { path: '/settings/llm', label: 'LLM 设置', icon: Cpu },
]

interface DesktopSidebarProps {
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export default function DesktopSidebar(_props: DesktopSidebarProps = {}) {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore(s => s.user)

  return (
    <aside className="w-[240px] flex-shrink-0 h-full flex flex-col panel-sidebar border-r border-line/30">
      {/* Logo */}
      <div className="px-5 pt-5 pb-3 flex-shrink-0">
        <h1 className="text-[20px] font-medium text-ink-900 tracking-tight leading-tight">观微</h1>
        <p className="text-[12px] text-ink-500 mt-0.5 tracking-wide">不信一家之言</p>
      </div>

      {/* 主导航 */}
      <nav className="px-2 mt-1 flex-shrink-0">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path) && item.path !== '/publish'
          const Icon = item.icon
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`nav-item-active flex items-center gap-3 w-full px-3 py-[10px] rounded-r-full text-[15px] transition-colors duration-150 ${
                isActive
                  ? 'active bg-seal/[0.06] text-seal font-medium'
                  : 'text-ink-600 hover:bg-[#f8f9fa] font-normal'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2 : 1.6} />
              <span>{item.label}</span>
              {item.path === '/publish' && (
                <span className="ml-auto w-7 h-7 rounded-full bg-seal flex items-center justify-center">
                  <Plus size={15} className="text-white" strokeWidth={2.5} />
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* 分隔线 */}
      <div className="mx-4 my-2 border-t border-line/20 flex-shrink-0" />

      {/* 工具箱 */}
      <div className="px-2 flex-shrink-0">
        <p className="px-3 mb-1 text-[11px] text-ink-400 font-medium tracking-wider">工具箱</p>
        {toolItems.map(item => {
          const Icon = item.icon
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex items-center gap-3 w-full px-3 py-[9px] rounded-r-full text-[14px] text-ink-500 hover:bg-[#f8f9fa] hover:text-ink-700 transition-colors duration-150"
            >
              <Icon size={18} strokeWidth={1.5} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>

      {/* 底部 */}
      <div className="mt-auto px-2.5 pb-3 flex-shrink-0">
        {/* Google 风格用户切换器 */}
        {user && (
          <button
            onClick={() => navigate('/profile')}
            className="user-switcher"
          >
            <div className="user-switcher-avatar bg-seal/[0.08] text-seal">
              {user.nickname?.charAt(0) || '?'}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[14px] font-medium text-ink-900 truncate leading-tight">{user.nickname}</p>
              <p className="text-[12px] text-ink-500 leading-tight mt-0.5">{user.rank}</p>
            </div>
            <ChevronDown size={18} className="text-ink-400 flex-shrink-0" />
          </button>
        )}

        {/* 参赛标签 */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 mx-1 mt-1">
          <Trophy size={13} className="text-gold flex-shrink-0" />
          <span className="text-[11px] text-ink-400">TRAE AI 创造力大赛</span>
        </div>
      </div>
    </aside>
  )
}
