import { useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { useAuthStore } from '../../stores/authStore'
import { useSidebarStore, ICON_MAP, ALL_NAV_ITEMS } from '../../stores/sidebarStore'
import { Plus, Leaf } from 'lucide-react'
import type { Workspace, WorkspaceStatus } from '../../types/workspace'

interface WorkspaceSidebarProps {
  onNavigate?: () => void
  className?: string
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return '刚刚'
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  return `${Math.floor(days / 7)}周前`
}

function WorkspaceItem({ ws, active, onClick }: { ws: Workspace; active: boolean; onClick: () => void }) {
  const statusColors: Record<WorkspaceStatus, string> = {
    active: 'bg-emerald-500',
    draft: 'bg-ink-300',
    completed: 'bg-blue-500',
    published: 'bg-emerald-500',
    tracking: 'bg-blue-500',
    archived: 'bg-ink-200',
  }
  const statusLabels: Record<WorkspaceStatus, string> = {
    active: '进行中',
    draft: '草稿',
    completed: '已完成',
    published: '已发布',
    tracking: '跟踪中',
    archived: '归档',
  }

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg transition-colors group ${
        active ? 'bg-seal-50 border-l-2 border-seal-600' : 'hover:bg-paper-100'
      }`}
    >
      <div className="flex items-start gap-2">
        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${statusColors[ws.status]}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className={`text-[13px] font-medium truncate ${active ? 'text-seal-700' : 'text-ink-800'}`}>
              {ws.title}
            </span>
            {ws.status === 'active' && (
              <span className="text-[10px] text-seal-600 shrink-0">{statusLabels[ws.status]}</span>
            )}
          </div>
          <div className="text-[11px] text-ink-400 mt-0.5 truncate">
            {formatRelativeTime(ws.updatedAt)}
          </div>
        </div>
      </div>
    </button>
  )
}

export default function WorkspaceSidebar({ className }: WorkspaceSidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore(s => s.user)
  const workspaces = useWorkspaceStore(s => s.workspaces)
  const currentId = useWorkspaceStore(s => s.currentId)
  const createWorkspace = useWorkspaceStore(s => s.createWorkspace)
  const switchWorkspace = useWorkspaceStore(s => s.switchWorkspace)
  const enabledItems = useSidebarStore(s => s.enabledItems)
  const navItems = enabledItems
    .map(id => ALL_NAV_ITEMS.find(item => item.id === id))
    .filter(Boolean) as typeof ALL_NAV_ITEMS

  const groups = useMemo(() => {
    const active = workspaces.filter(w => w.status === 'active' || w.status === 'draft')
    const completed = workspaces.filter(w => w.status === 'completed' || w.status === 'published')
    const tracking = workspaces.filter(w => w.status === 'tracking')
    const favorites = workspaces.filter(w => w.isFavorite && w.status !== 'archived')
    const archived = workspaces.filter(w => w.status === 'archived')
    return { active, completed, tracking, favorites, archived }
  }, [workspaces])

  const isNavActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const handleCreate = () => {
    const ws = createWorkspace('')
    switchWorkspace(ws.id)
  }

  const handleSwitch = (id: string) => {
    switchWorkspace(id)
  }

  const displayName = user?.nickname || '见微侦探'
  const displayRank = user?.rank || 'Lv.1 新手'
  const avatarChar = displayName.charAt(0)

  return (
    <div className={`flex flex-col h-full bg-paper-0 border-r border-ink-100 w-[220px] shrink-0 ${className || ''}`}>
      <div className="px-3 py-3 border-b border-ink-100">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 bg-ink-900 rounded-lg flex items-center justify-center shadow-sm">
            <Leaf size={16} className="text-seal-600" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-[15px] text-ink-900">观微</span>
        </div>
        <button
          onClick={handleCreate}
          className="w-full flex items-center justify-center gap-1.5 py-2 bg-seal-600 text-white rounded-xl text-[13px] font-medium hover:bg-seal-700 transition-colors"
        >
          <Plus size={15} />
          新建工作空间
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2 space-y-1">
        {/* 收藏组 */}
        {groups.favorites.length > 0 && (
          <div className="mb-2">
            <div className="px-3 py-1 text-[11px] text-ink-300 font-medium">收藏</div>
            {groups.favorites.map(ws => (
              <WorkspaceItem key={ws.id} ws={ws} active={ws.id === currentId} onClick={() => handleSwitch(ws.id)} />
            ))}
          </div>
        )}

        {/* 进行中 */}
        {groups.active.length > 0 && (
          <div className="mb-2">
            <div className="px-3 py-1 text-[11px] text-ink-300 font-medium">进行中</div>
            {groups.active.map(ws => (
              <WorkspaceItem key={ws.id} ws={ws} active={ws.id === currentId} onClick={() => handleSwitch(ws.id)} />
            ))}
          </div>
        )}

        {/* 跟踪中 */}
        {groups.tracking.length > 0 && (
          <div className="mb-2">
            <div className="px-3 py-1 text-[11px] text-ink-300 font-medium">跟踪中</div>
            {groups.tracking.map(ws => (
              <WorkspaceItem key={ws.id} ws={ws} active={ws.id === currentId} onClick={() => handleSwitch(ws.id)} />
            ))}
          </div>
        )}

        {/* 已完成 */}
        {groups.completed.length > 0 && (
          <div className="mb-2">
            <div className="px-3 py-1 text-[11px] text-ink-300 font-medium">已完成</div>
            {groups.completed.map(ws => (
              <WorkspaceItem key={ws.id} ws={ws} active={ws.id === currentId} onClick={() => handleSwitch(ws.id)} />
            ))}
          </div>
        )}

        {/* 已归档 */}
        {groups.archived.length > 0 && (
          <div className="mb-2">
            <div className="px-3 py-1 text-[11px] text-ink-300 font-medium">已归档</div>
            {groups.archived.map(ws => (
              <WorkspaceItem key={ws.id} ws={ws} active={ws.id === currentId} onClick={() => handleSwitch(ws.id)} />
            ))}
          </div>
        )}

        {workspaces.length === 0 && (
          <div className="px-4 py-8 text-center text-ink-300 text-[12px]">
            <p>还没有工作空间</p>
            <p className="mt-1">点击上方按钮创建</p>
          </div>
        )}
      </div>

      <div className="border-t border-ink-100 py-2 px-2">
        <div className="flex flex-wrap items-center justify-start gap-1 mb-2">
          {navItems.map(item => {
            const Icon = ICON_MAP[item.icon]
            const isActive = isNavActive(item.path)
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`p-2 rounded-lg transition-colors ${
                  isActive
                    ? 'text-seal-600 bg-seal-50'
                    : 'text-ink-400 hover:text-ink-600 hover:bg-paper-100'
                }`}
                title={item.label}
              >
                <Icon size={18} strokeWidth={isActive ? 2.25 : 1.75} />
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-paper-100 cursor-pointer">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-seal-500 to-seal-700 flex items-center justify-center text-white text-[12px] font-medium">
            {avatarChar}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-medium text-ink-800 truncate">{displayName}</div>
            <div className="text-[10px] text-ink-400">{displayRank}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
