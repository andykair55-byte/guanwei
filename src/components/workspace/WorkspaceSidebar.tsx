import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { useAuthStore } from '../../stores/authStore'
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

const STATUS_LABELS: Record<WorkspaceStatus, string> = {
  active: '进行中',
  draft: '草稿',
  completed: '已完成',
  published: '已发布',
  tracking: '跟踪中',
  archived: '已归档',
}

const TAG_LABELS: Record<string, string> = {
  hotspot: '热点',
  science: '科技',
  opinion: '观点',
  debunk: '辟谣',
  meme: '梗',
}

const GROUP_ORDER = [
  { key: 'favorites', label: '收藏' },
  { key: 'active', label: '进行中' },
  { key: 'tracking', label: '跟踪中' },
  { key: 'completed', label: '已完成' },
  { key: 'archived', label: '已归档' },
]

const DEFAULT_COLLAPSED = new Set<string>(['tracking', 'completed', 'archived'])

export default function WorkspaceSidebar({ className }: WorkspaceSidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore(s => s.user)
  const workspaces = useWorkspaceStore(s => s.workspaces)
  const currentId = useWorkspaceStore(s => s.currentId)
  const createWorkspace = useWorkspaceStore(s => s.createWorkspace)
  const switchWorkspace = useWorkspaceStore(s => s.switchWorkspace)
  const toggleFavorite = useWorkspaceStore(s => s.toggleFavorite)
  const archiveWorkspace = useWorkspaceStore(s => s.archive)
  const unarchiveWorkspace = useWorkspaceStore(s => s.unarchive)
  const deleteWorkspace = useWorkspaceStore(s => s.deleteWorkspace)

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set(DEFAULT_COLLAPSED))
  const [searchQuery, setSearchQuery] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [sidebarWidth, setSidebarWidth] = useState<number>(280)
  const isDragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(280)

  const MIN_WIDTH = 220
  const MAX_WIDTH = 400

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    startX.current = e.clientX
    startWidth.current = sidebarWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [sidebarWidth])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      const diff = e.clientX - startX.current
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + diff))
      setSidebarWidth(newWidth)
      document.documentElement.style.setProperty('--sidebar-w', `${newWidth}px`)
    }

    const handleMouseUp = () => {
      if (!isDragging.current) return
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const filteredWorkspaces = useMemo(() => {
    if (!searchQuery.trim()) return workspaces
    const q = searchQuery.toLowerCase()
    return workspaces.filter(w => w.title.toLowerCase().includes(q) || w.topic.toLowerCase().includes(q))
  }, [workspaces, searchQuery])

  const groups = useMemo(() => {
    const favorites = filteredWorkspaces.filter(w => w.isFavorite && w.status !== 'archived')
    const active = filteredWorkspaces.filter(w => (w.status === 'active' || w.status === 'draft') && !w.isFavorite)
    const tracking = filteredWorkspaces.filter(w => w.status === 'tracking')
    const completed = filteredWorkspaces.filter(w => (w.status === 'completed' || w.status === 'published') && !w.isFavorite)
    const archived = filteredWorkspaces.filter(w => w.status === 'archived')
    return { favorites, active, tracking, completed, archived }
  }, [filteredWorkspaces])

  const isNavActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const handleCreate = () => {
    const ws = createWorkspace({})
    switchWorkspace(ws.id)
  }

  const handleSwitch = (id: string) => {
    switchWorkspace(id)
  }

  const displayName = user?.nickname || '见微侦探'
  const avatarChar = displayName.charAt(0)

  return (
    <aside className={`ws-sidebar ${className || ''}`}>
      {/* Resize Handle */}
      <div className="ws-resize-handle" onMouseDown={handleResizeStart} />
      {/* Header */}
      <div className="ws-sidebar-header">
        <div className="ws-sidebar-brand">
          <div className="ws-sidebar-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-4.78 10-10 10Z" />
              <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
            </svg>
          </div>
          <div>
            <div className="ws-sidebar-brand-text">观微</div>
            <div className="ws-sidebar-brand-sub">GuanWei</div>
          </div>
        </div>
        <button className="ws-btn-create" onClick={handleCreate}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          新建工作空间
        </button>
      </div>

      {/* Search */}
      <div className="ws-sidebar-search">
        <div className="ws-search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索工作空间…"
          />
        </div>
      </div>

      {/* Workspace List */}
      <div className="ws-sidebar-list">
        {filteredWorkspaces.length === 0 ? (
          <div className="ws-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <div>{searchQuery ? '没有找到匹配的工作空间' : '还没有工作空间'}</div>
            {searchQuery && <div style={{ marginTop: 4, fontSize: 11 }}>尝试其他关键词</div>}
          </div>
        ) : (
          GROUP_ORDER.map(g => {
            const items = groups[g.key as keyof typeof groups] as Workspace[]
            if (items.length === 0) return null
            const isCollapsed = collapsedGroups.has(g.key)

            return (
              <div className="ws-group" key={g.key}>
                <div className="ws-group-header" onClick={() => toggleGroup(g.key)}>
                  <svg
                    className={`ws-group-chevron${isCollapsed ? ' collapsed' : ''}`}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                  <span className="ws-group-label">{g.label}</span>
                  <span className="ws-group-count">{items.length}</span>
                </div>
                <div
                  className={`ws-group-items${isCollapsed ? ' collapsed' : ''}`}
                  style={{ maxHeight: isCollapsed ? 0 : items.length * 48 + 'px' }}
                >
                  {items.map(ws => {
                    const isActive = ws.id === currentId
                    return (
                      <div
                        key={ws.id}
                        className={`ws-item${isActive ? ' active' : ''}`}
                        onClick={() => handleSwitch(ws.id)}
                      >
                        <span className={`ws-status-dot ${ws.status}`} />
                        <div className="ws-item-content">
                          <div className="ws-item-title">{ws.title}</div>
                          <div className="ws-item-meta">
                            <span>{formatRelativeTime(ws.updatedAt)}</span>
                            {ws.tags?.[0] && (
                              <span className={`ws-item-tag ${ws.tags[0]}`}>
                                {TAG_LABELS[ws.tags[0]] || ws.tags[0]}
                              </span>
                            )}
                            {ws.status === 'active' && <span style={{color:'var(--primary)',fontSize:10}}>{STATUS_LABELS[ws.status]}</span>}
                            {ws.status === 'draft' && <span style={{color:'var(--fg-muted)',fontSize:10}}>{STATUS_LABELS[ws.status]}</span>}
                          </div>
                        </div>

                        <div style={{display:'flex',alignItems:'center',gap:2,flexShrink:0,marginLeft:'auto',paddingLeft:4,alignSelf:'center'}}>
                          <button
                            className="ws-action-btn"
                            onClick={(e) => { e.stopPropagation(); toggleFavorite(ws.id) }}
                            title={ws.isFavorite ? '取消收藏' : '收藏'}
                          >
                            <svg viewBox="0 0 24 24" fill={ws.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                          </button>
                          {ws.status !== 'archived' ? (
                            <button
                              className="ws-action-btn"
                              onClick={(e) => { e.stopPropagation(); archiveWorkspace(ws.id) }}
                              title="归档"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <rect width="20" height="5" x="2" y="3" rx="1" />
                                <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
                                <path d="M10 12h4" />
                              </svg>
                            </button>
                          ) : (
                            <button
                              className="ws-action-btn"
                              onClick={(e) => { e.stopPropagation(); unarchiveWorkspace(ws.id) }}
                              title="取消归档"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <rect width="20" height="5" x="2" y="3" rx="1" />
                                <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
                                <path d="m10 14 2-2 2 2" />
                              </svg>
                            </button>
                          )}
                          <button
                            style={{color:'var(--danger)',width:20,height:20,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:4,transition:'color 0.12s,background 0.12s'}}
                            onClick={(e) => { e.stopPropagation(); setDeletingId(ws.id) }}
                            title="删除"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Bottom Nav */}
      <div className="ws-sidebar-bottom">
        <nav className="ws-bottom-nav">
          <button
            className={`ws-nav-btn${isNavActive('/melon') ? ' active' : ''}`}
            onClick={() => navigate('/melon')}
            title="瓜田"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-4.78 10-10 10Z" />
              <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
            </svg>
            <span className="ws-nav-btn-label">瓜田</span>
          </button>
          <button
            className={`ws-nav-btn${isNavActive('/agent-world') ? ' active' : ''}`}
            onClick={() => navigate('/agent-world')}
            title="工作间"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
            <span className="ws-nav-btn-label">工作间</span>
            <span className="ws-nav-badge" />
          </button>
          <button
            className={`ws-nav-btn${isNavActive('/verify') ? ' active' : ''}`}
            onClick={() => navigate('/verify')}
            title="求证"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <span className="ws-nav-btn-label">求证</span>
          </button>
          <button
            className={`ws-nav-btn${isNavActive('/settings') ? ' active' : ''}`}
            onClick={() => navigate('/settings')}
            title="设置"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span className="ws-nav-btn-label">设置</span>
          </button>
        </nav>

        {/* User Card */}
        <div className="ws-user-card">
          {user?.avatar ? (
            <img src={user.avatar} alt={displayName} className="w-7 h-7 rounded-full object-cover flex-shrink-0" style={{ width: 28, height: 28 }} />
          ) : (
            <div className="ws-user-avatar">{avatarChar}</div>
          )}
          <div className="ws-user-info">
            <div className="ws-user-name">{displayName}</div>
            <div className="ws-user-rank">Lv.4 洞察者 · 1280/2000</div>
            <div className="ws-user-rank-bar"><div className="ws-user-rank-fill" /></div>
          </div>
        </div>
      </div>

      {/* ── 删除确认弹窗 ── */}
      {deletingId && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.35)',
          }}
          onClick={() => setDeletingId(null)}
        >
          <div
            style={{
              background: 'var(--bg)', borderRadius: 'var(--radius-lg)',
              padding: '20px 24px', width: 280,
              boxShadow: '0 8px 32px var(--shadow-toast)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 8 }}>
              确认删除
            </div>
            <div style={{ fontSize: 13, color: 'var(--fg-secondary)', marginBottom: 4 }}>
              确定要删除「{workspaces.find(w => w.id === deletingId)?.title}」吗？
            </div>
            <div style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              此操作不可逆
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                style={{
                  flex: 1, padding: '7px 0', borderRadius: 'var(--radius-sm)',
                  fontSize: 13, fontWeight: 500, border: '1px solid var(--border)',
                  color: 'var(--fg-secondary)', background: 'var(--bg)',
                }}
                onClick={() => setDeletingId(null)}
              >
                取消
              </button>
              <button
                style={{
                  flex: 1, padding: '7px 0', borderRadius: 'var(--radius-sm)',
                  fontSize: 13, fontWeight: 500, border: 'none',
                  color: 'var(--white)', background: 'var(--danger)',
                }}
                onClick={() => {
                  deleteWorkspace(deletingId)
                  setDeletingId(null)
                }}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}