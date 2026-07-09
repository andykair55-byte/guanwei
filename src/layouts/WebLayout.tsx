import { useState, useCallback, useRef, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopRightPanel from '../components/DesktopRightPanel'
import TopNavbar from '../components/TopNavbar'

export default function WebLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [leftWidth, setLeftWidth] = useState(192)
  const [rightWidth, setRightWidth] = useState(220)
  const dragging = useRef<'left' | 'right' | null>(null)
  const startX = useRef(0)
  const startWidth = useRef(0)

  const onMouseDown = useCallback((side: 'left' | 'right', e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = side
    startX.current = e.clientX
    startWidth.current = side === 'left' ? leftWidth : rightWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [leftWidth, rightWidth])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const delta = e.clientX - startX.current
      if (dragging.current === 'left') {
        setLeftWidth(Math.max(140, Math.min(280, startWidth.current + delta)))
      } else {
        setRightWidth(Math.max(180, Math.min(360, startWidth.current - delta)))
      }
    }
    const onUp = () => {
      dragging.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  return (
    <div className="flex h-dvh bg-white overflow-hidden">
      {/* Left sidebar — 手柄放在内部 */}
      <div
        className="hidden md:flex flex-shrink-0 relative"
        style={{ width: collapsed ? 52 : leftWidth }}
      >
        <DesktopSidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(c => !c)}
        />
        {!collapsed && (
          <div
            onMouseDown={(e) => onMouseDown('left', e)}
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize z-30
                       hover:bg-ink-200/40 active:bg-ink-200/60 transition-colors"
          />
        )}
      </div>

      {/* Center + right */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNavbar />

        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Main content */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
            <div className="animate-page-enter">
              <Outlet />
            </div>
          </main>

          {/* Right panel — 手柄放在内部 */}
          {!collapsed && (
            <div
              className="hidden lg:flex flex-shrink-0 relative"
              style={{ width: rightWidth }}
            >
              <div
                onMouseDown={(e) => onMouseDown('right', e)}
                className="absolute top-0 left-0 w-1 h-full cursor-col-resize z-30
                           hover:bg-ink-200/40 active:bg-ink-200/60 transition-colors"
              />
              <DesktopRightPanel width={rightWidth} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
