import { useState, useCallback, useRef, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { PanelLeftClose, PanelRightClose, PanelLeftOpen, PanelRightOpen } from 'lucide-react'
import DesktopSidebar from '../components/DesktopSidebar'
import DesktopRightPanel from '../components/DesktopRightPanel'
import TopNavbar from '../components/TopNavbar'

const LEFT_WIDTH_EXPANDED = 232
const LEFT_WIDTH_COLLAPSED = 64
const RIGHT_WIDTH_EXPANDED = 300
const RIGHT_WIDTH_COLLAPSED = 52

const IMMERSIVE_ROUTES = ['/publish', '/notifications', '/messages']
const NO_TOPNAV_ROUTES = ['/publish']

export default function WebLayout() {
  const location = useLocation()
  const isImmersive = IMMERSIVE_ROUTES.some(r => location.pathname.startsWith(r))
  const hideTopNav = NO_TOPNAV_ROUTES.some(r => location.pathname.startsWith(r))

  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [leftWidth, setLeftWidth] = useState(LEFT_WIDTH_EXPANDED)
  const [rightWidth, setRightWidth] = useState(RIGHT_WIDTH_EXPANDED)
  const [isDragging, setIsDragging] = useState<'left' | 'right' | null>(null)
  const dragging = useRef<'left' | 'right' | null>(null)
  const startX = useRef(0)
  const startWidth = useRef(0)

  const toggleLeft = useCallback(() => {
    setLeftCollapsed(c => {
      const next = !c
      setLeftWidth(next ? LEFT_WIDTH_COLLAPSED : LEFT_WIDTH_EXPANDED)
      return next
    })
  }, [])

  const toggleRight = useCallback(() => {
    setRightCollapsed(c => {
      const next = !c
      setRightWidth(next ? RIGHT_WIDTH_COLLAPSED : RIGHT_WIDTH_EXPANDED)
      return next
    })
  }, [])

  const onMouseDown = useCallback((side: 'left' | 'right', e: React.MouseEvent) => {
    if ((side === 'left' && leftCollapsed) || (side === 'right' && rightCollapsed)) return
    e.preventDefault()
    dragging.current = side
    setIsDragging(side)
    startX.current = e.clientX
    startWidth.current = side === 'left' ? leftWidth : rightWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [leftWidth, rightWidth, leftCollapsed, rightCollapsed])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const delta = e.clientX - startX.current
      if (dragging.current === 'left') {
        setLeftWidth(Math.max(LEFT_WIDTH_COLLAPSED + 80, Math.min(340, startWidth.current + delta)))
      } else {
        setRightWidth(Math.max(RIGHT_WIDTH_COLLAPSED + 80, Math.min(420, startWidth.current - delta)))
      }
    }
    const onUp = () => {
      dragging.current = null
      setIsDragging(null)
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
    <div className="flex h-dvh bg-paper-50 overflow-hidden select-none">
      {!isImmersive && (
        <div
          className="hidden md:flex flex-shrink-0 relative z-20"
          style={{
            width: leftWidth,
            transition: isDragging ? 'none' : 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <DesktopSidebar collapsed={leftCollapsed} />

          <div
            onMouseDown={(e) => onMouseDown('left', e)}
            className="absolute top-0 right-0 w-3 h-full cursor-col-resize z-30 group"
          >
            <div className={`absolute top-0 right-0 w-px h-full transition-colors duration-200 ${
              isDragging === 'left' ? 'bg-[#c0392b]' : 'bg-[#ececec] group-hover:bg-[#d0d0d0]'
            }`} />
            <div className={`absolute top-1/2 -translate-y-1/2 -right-2 w-4 h-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${
              isDragging === 'left' ? 'opacity-100' : ''
            }`}>
              <button
                onClick={(e) => { e.stopPropagation(); toggleLeft() }}
                className="w-4 h-10 bg-white border border-[#e0e0e0] rounded-r shadow-sm flex items-center justify-center hover:border-[#c0392b] hover:text-[#c0392b] transition-colors"
                title={leftCollapsed ? '展开侧边栏' : '收起侧边栏'}
              >
                <PanelLeftClose size={10} className="text-[#888]" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {!hideTopNav && <TopNavbar />}

        <div className="flex-1 flex min-h-0 overflow-hidden">
          <main className={`flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin ${isImmersive ? 'bg-white' : 'bg-white'}`}>
            <div className="animate-page-enter min-h-full h-full">
              <Outlet />
            </div>
          </main>

          {!isImmersive && (
            <div
              className="hidden lg:flex flex-shrink-0 relative z-20"
              style={{
                width: rightWidth,
                transition: isDragging ? 'none' : 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              <div
                onMouseDown={(e) => onMouseDown('right', e)}
                className="absolute top-0 left-0 w-3 h-full cursor-col-resize z-30 group"
              >
                <div className={`absolute top-0 left-0 w-px h-full transition-colors duration-200 ${
                  isDragging === 'right' ? 'bg-[#c0392b]' : 'bg-[#ececec] group-hover:bg-[#d0d0d0]'
                }`} />
                <div className={`absolute top-1/2 -translate-y-1/2 -left-2 w-4 h-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${
                  isDragging === 'right' ? 'opacity-100' : ''
                }`}>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleRight() }}
                    className="w-4 h-10 bg-white border border-[#e0e0e0] rounded-l shadow-sm flex items-center justify-center hover:border-[#c0392b] hover:text-[#c0392b] transition-colors"
                    title="收起右侧面板"
                  >
                    <PanelRightClose size={10} className="text-[#888]" />
                  </button>
                </div>
              </div>

              <DesktopRightPanel collapsed={rightCollapsed} />
            </div>
          )}
        </div>
      </div>

      {!isImmersive && leftCollapsed && (
        <button
          onClick={toggleLeft}
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 w-5 h-14 bg-white border border-l-0 border-[#e0e0e0] rounded-r-md items-center justify-center hover:border-[#c0392b] hover:text-[#c0392b] z-40 shadow-sm transition-colors"
          title="展开侧边栏"
        >
          <PanelLeftOpen size={12} className="text-[#888]" />
        </button>
      )}

      {!isImmersive && rightCollapsed && (
        <button
          onClick={toggleRight}
          className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 w-5 h-14 bg-white border border-r-0 border-[#e0e0e0] rounded-l-md items-center justify-center hover:border-[#c0392b] hover:text-[#c0392b] z-40 shadow-sm transition-colors"
          title="展开右侧面板"
        >
          <PanelRightOpen size={12} className="text-[#888]" />
        </button>
      )}
    </div>
  )
}
