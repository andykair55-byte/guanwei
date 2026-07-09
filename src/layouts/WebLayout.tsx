import { useState, useCallback, useRef, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopRightPanel from '../components/DesktopRightPanel'
import TopNavbar from '../components/TopNavbar'

export default function WebLayout() {
  // 左右栏联动：collapsed 控制两侧同时收起/展开
  const [collapsed, setCollapsed] = useState(false)
  const [leftWidth, setLeftWidth] = useState(200)
  const [rightWidth, setRightWidth] = useState(260)
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
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const delta = e.clientX - startX.current
      if (dragging.current === 'left') {
        setLeftWidth(Math.max(160, Math.min(300, startWidth.current + delta)))
      } else {
        setRightWidth(Math.max(200, Math.min(380, startWidth.current - delta)))
      }
    }
    const onMouseUp = () => {
      dragging.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  return (
    <div className="flex h-dvh bg-white overflow-hidden">
      {/* 左侧导航栏 */}
      <div className="hidden md:flex flex-shrink-0 relative">
        <div style={{ width: collapsed ? 64 : leftWidth }} className="transition-[width] duration-200 h-full">
          <DesktopSidebar
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed(c => !c)}
          />
        </div>
        {/* 拖拽手柄 */}
        {!collapsed && (
          <div
            onMouseDown={(e) => onMouseDown('left', e)}
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize z-30
                       hover:bg-ink-200/50 active:bg-seal/30 transition-colors"
          />
        )}
      </div>

      {/* 中间区域 */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNavbar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
          <div className="animate-page-enter">
            <Outlet />
          </div>
        </main>
      </div>

      {/* 右侧面板 — 随左侧一起收起 */}
      <div className="hidden lg:flex flex-shrink-0 relative">
        {!collapsed && (
          <>
            {/* 拖拽手柄 */}
            <div
              onMouseDown={(e) => onMouseDown('right', e)}
              className="absolute top-0 left-0 w-1 h-full cursor-col-resize z-30
                         hover:bg-ink-200/50 active:bg-seal/30 transition-colors"
            />
            <DesktopRightPanel
              onCollapse={() => setCollapsed(true)}
              width={rightWidth}
            />
          </>
        )}
      </div>
    </div>
  )
}
