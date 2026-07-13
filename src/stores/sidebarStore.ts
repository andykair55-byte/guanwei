import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Leaf, Users, Clock, Briefcase, Gamepad2, Settings, Search, FileText, Image, Calendar, Shield, Info, MessageSquare } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface SidebarNavItem {
  id: string
  path: string
  label: string
  icon: string
  isDefault: boolean
  group: 1 | 2 | 3 // 分组：1=核心 2=工具 3=休闲
}

// 所有可用导航项 — 按 3-3-2 分组排列
export const ALL_NAV_ITEMS: SidebarNavItem[] = [
  // ── 核心 ──
  { id: 'melon', path: '/melon', label: '瓜田', icon: 'Leaf', isDefault: true, group: 1 },
  { id: 'community', path: '/community', label: '社区', icon: 'Users', isDefault: true, group: 1 },
  { id: 'hot', path: '/hot', label: '时间线', icon: 'Clock', isDefault: true, group: 1 },
  // ── 工具 ──
  { id: 'verify', path: '/verify', label: '求证', icon: 'Search', isDefault: true, group: 2 },
  { id: 'agent-world', path: '/agent-world', label: '工作间', icon: 'Briefcase', isDefault: true, group: 2 },
  { id: 'debates', path: '/entertainment/arena', label: 'AI竞技', icon: 'MessageSquare', isDefault: false, group: 2 },
  // ── 休闲 ──
  { id: 'entertainment', path: '/entertainment', label: '娱乐', icon: 'Gamepad2', isDefault: true, group: 3 },
  { id: 'settings', path: '/settings/llm', label: '设置', icon: 'Settings', isDefault: true, group: 3 },
  // ── 可添加项（归入工具箱） ──
  { id: 'tools/exif', path: '/tools/exif', label: 'EXIF分析', icon: 'Image', isDefault: false, group: 2 },
  { id: 'tools/timeline', path: '/tools/timeline', label: '时间线构建', icon: 'Calendar', isDefault: false, group: 2 },
  { id: 'notes', path: '/notes', label: '笔记', icon: 'FileText', isDefault: false, group: 2 },
  { id: 'admin', path: '/admin', label: '管理', icon: 'Shield', isDefault: false, group: 3 },
  { id: 'about', path: '/about', label: '关于', icon: 'Info', isDefault: false, group: 3 },
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
