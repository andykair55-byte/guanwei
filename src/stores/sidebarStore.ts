import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Leaf, Users, Clock, Briefcase, Gamepad2, Settings, Search, FileText, Image, Calendar, Shield, Info, MessageSquare } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface SidebarNavItem {
  id: string
  path: string
  label: string
  icon: string // icon name, 用字符串存储，在组件中映射
  isDefault: boolean // 是否为默认显示项
}

// 所有可用导航项
export const ALL_NAV_ITEMS: SidebarNavItem[] = [
  { id: 'melon', path: '/melon', label: '瓜田', icon: 'Leaf', isDefault: true },
  { id: 'community', path: '/community', label: '社区', icon: 'Users', isDefault: true },
  { id: 'hot', path: '/hot', label: '时间线', icon: 'Clock', isDefault: true },
  { id: 'agent-world', path: '/agent-world', label: '工作间', icon: 'Briefcase', isDefault: true },
  { id: 'entertainment', path: '/entertainment', label: '娱乐', icon: 'Gamepad2', isDefault: true },
  { id: 'settings', path: '/settings/llm', label: '设置', icon: 'Settings', isDefault: true },
  { id: 'verify', path: '/verify', label: '求证', icon: 'Search', isDefault: true },
  { id: 'debates', path: '/debates', label: '辩论', icon: 'MessageSquare', isDefault: true },
  // 可添加项
  { id: 'tools/exif', path: '/tools/exif', label: 'EXIF分析', icon: 'Image', isDefault: false },
  { id: 'tools/timeline', path: '/tools/timeline', label: '时间线构建', icon: 'Calendar', isDefault: false },
  { id: 'notes', path: '/notes', label: '笔记', icon: 'FileText', isDefault: false },
  { id: 'admin', path: '/admin', label: '管理', icon: 'Shield', isDefault: false },
  { id: 'about', path: '/about', label: '关于', icon: 'Info', isDefault: false },
]

// icon 名称到组件的映射
export const ICON_MAP: Record<string, LucideIcon> = {
  Leaf, Users, Clock, Briefcase, Gamepad2, Settings, Search, FileText, Image, Calendar, Shield, Info, MessageSquare,
}

interface SidebarStore {
  // 用户启用的导航项 id 列表（有序）
  enabledItems: string[]
  // 添加导航项
  addItem: (id: string) => void
  // 移除导航项
  removeItem: (id: string) => void
}

const DEFAULT_ENABLED = ALL_NAV_ITEMS.filter(item => item.isDefault).map(item => item.id)

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set, _get) => ({
      enabledItems: DEFAULT_ENABLED,
      addItem: (id) => set((state) => {
        if (state.enabledItems.includes(id)) return state
        return { enabledItems: [...state.enabledItems, id] }
      }),
      removeItem: (id) => set((state) => {
        const next = state.enabledItems.filter(item => item !== id)
        // 保底：至少保留1个
        if (next.length === 0) return state
        return { enabledItems: next }
      }),
    }),
    { name: 'guanwei-sidebar-config' }
  )
)
