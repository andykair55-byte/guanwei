import { useNavigate, useLocation } from 'react-router-dom'
import { Wheat, Users, Plus, Search, User } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Tab {
  path: string
  label: string
  icon: LucideIcon
  isCenter?: boolean
}

const tabs: Tab[] = [
  { path: '/melon', label: '瓜田', icon: Wheat },
  { path: '/community', label: '社区', icon: Users },
  { path: '/publish', label: '', icon: Plus, isCenter: true },
  { path: '/verify', label: '求证', icon: Search },
  { path: '/profile', label: '我的', icon: User },
]

function TabBar() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav className="flex-shrink-0 glass border-t border-line/50 pb-safe">
      <div className="mx-auto flex max-w-[480px] items-end h-[56px]">
        {tabs.map((tab) => {
          const isActive = location.pathname.startsWith(tab.path) && tab.path !== '/publish'
          const Icon = tab.icon

          if (tab.isCenter) {
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className="flex flex-col items-center justify-center flex-1 h-full"
              >
                <div className="w-11 h-11 rounded-[14px] bg-seal flex items-center justify-center shadow-seal-glow active:scale-[0.88] transition-transform duration-200">
                  <Icon size={22} className="text-white" strokeWidth={2.5} />
                </div>
              </button>
            )
          }

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center justify-center gap-[3px] flex-1 h-full transition-colors relative"
            >
              <div className="relative">
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.2 : 1.6}
                  className={`transition-all duration-200 ${isActive ? 'text-seal scale-105' : 'text-ink-400'}`}
                />
              </div>
              <span
                className={`text-[10px] leading-none tracking-wide transition-all duration-200 ${
                  isActive ? 'text-seal font-semibold' : 'text-ink-400 font-normal'
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute top-0 w-4 h-[2px] rounded-full bg-seal/70" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default TabBar
