import { lazy, Suspense, useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useSearchParams } from 'react-router-dom'
import TabBar from './components/TabBar'
import DesktopSidebar from './components/DesktopSidebar'
import DesktopRightPanel from './components/DesktopRightPanel'
import DeviceFrame from './components/DeviceFrame'
import { Smartphone, Monitor } from 'lucide-react'

// Route-level code splitting — each page is a separate chunk
const MelonFieldPage = lazy(() => import('./pages/MelonFieldPage'))
const MelonDetailPage = lazy(() => import('./pages/MelonDetailPage'))
const CommunityPage = lazy(() => import('./pages/CommunityPage'))
const PublishPage = lazy(() => import('./pages/PublishPage'))
const VerifyPage = lazy(() => import('./pages/VerifyPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const RankListPage = lazy(() => import('./pages/RankListPage'))
const PointsHistoryPage = lazy(() => import('./pages/PointsHistoryPage'))
const ExifAnalyzer = lazy(() => import('./pages/ExifAnalyzer'))
const ReverseImageSearch = lazy(() => import('./pages/ReverseImageSearch'))
const TimelineBuilder = lazy(() => import('./pages/TimelineBuilder'))
const PlagiarismChecker = lazy(() => import('./pages/PlagiarismChecker'))
const MultiSourceVerify = lazy(() => import('./pages/MultiSourceVerify'))
const EmotionDetector = lazy(() => import('./pages/EmotionDetector'))
const DebateArena = lazy(() => import('./pages/DebateArena'))
const AIArena = lazy(() => import('./pages/AIArena'))
const DebatesPage = lazy(() => import('./pages/DebatesPage'))
const AIBattle = lazy(() => import('./pages/AIBattle'))
const RoundTable = lazy(() => import('./pages/RoundTable'))
const DebateLobby = lazy(() => import('./pages/DebateLobby'))
const DebateRoomPage = lazy(() => import('./pages/DebateRoomPage'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-6 h-6 border-2 border-seal/30 border-t-seal rounded-full animate-spin" />
    </div>
  )
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768)
  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isDesktop
}

function Layout() {
  const isDesktop = useIsDesktop()
  const [showDeviceFrame, setShowDeviceFrame] = useState(false)

  // 移动端：原始布局
  if (!isDesktop) {
    return (
      <div className="flex flex-col h-dvh bg-paper-texture">
        <main className="flex-1 overflow-y-auto overflow-x-hidden mx-auto w-full max-w-[480px]">
          <Outlet />
        </main>
        <TabBar />
      </div>
    )
  }

  // PC 端：Twitter 风格三栏布局
  return (
    <div className="flex h-dvh bg-ink-100/50 overflow-hidden">
      {/* 左侧导航 */}
      <DesktopSidebar />

      {/* 中间内容区 — 填满可用空间，两侧 border 分隔 */}
      <div className="flex-1 flex flex-col min-w-0 border-x border-line/30 bg-paper-texture">
        {/* 顶部工具栏 */}
        <div className="flex items-center justify-between px-6 h-14 border-b border-line/30 bg-surface/80 flex-shrink-0">
          <div className="flex items-center gap-2 text-ink-400">
            <Monitor size={15} />
            <span className="text-[12px]">PC 视图</span>
          </div>
          <button
            onClick={() => setShowDeviceFrame(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ink-900/5 hover:bg-ink-900/10 text-ink-600 text-[12px] font-medium transition-colors border border-line/30"
          >
            <Smartphone size={14} />
            真机模拟
          </button>
        </div>

        {/* 页面内容 — 不设 max-width，填满中间栏 */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      {/* 右侧面板 */}
      <DesktopRightPanel />

      {/* 真机模拟弹窗 */}
      {showDeviceFrame && (
        <DeviceFrame onClose={() => setShowDeviceFrame(false)}>
          <div className="flex flex-col h-full bg-paper-texture">
            <main className="flex-1 overflow-y-auto overflow-x-hidden">
              <Outlet />
            </main>
            <TabBar />
          </div>
        </DeviceFrame>
      )}
    </div>
  )
}

/**
 * Handles Web Share Target API redirects.
 * The manifest routes shares to /share?title=...&text=...&url=...
 * We combine them and redirect to /verify with the text as location state.
 */
function ShareRedirect() {
  const [params] = useSearchParams()
  const title = params.get('title') ?? ''
  const text = params.get('text') ?? ''
  const url = params.get('url') ?? ''

  // Combine shared content into a single string
  const parts = [title, text, url].filter(Boolean)
  const combined = parts.join('\n\n') || ''

  // Navigate to /verify with the shared text
  return <Navigate to="/verify" replace state={{ query: combined, shared: true }} />
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
        <Route path="/melon/:id" element={<MelonDetailPage />} />
        <Route path="/profile/ranks" element={<RankListPage />} />
        <Route path="/profile/points" element={<PointsHistoryPage />} />
        <Route path="/publish" element={<PublishPage />} />
        <Route path="/tools/exif" element={<ExifAnalyzer />} />
        <Route path="/tools/emotion" element={<EmotionDetector />} />
        <Route path="/tools/reverse-image" element={<ReverseImageSearch />} />
        <Route path="/tools/timeline" element={<TimelineBuilder />} />
        <Route path="/tools/plagiarism" element={<PlagiarismChecker />} />
        <Route path="/tools/multi-source" element={<MultiSourceVerify />} />
        <Route path="/share" element={<ShareRedirect />} />
        <Route path="/debate/:melonId/:title" element={<DebateArena />} />
        <Route path="/debates" element={<DebatesPage />} />
        <Route path="/ai-arena/:topicId" element={<AIArena />} />
        <Route path="/ai-battle" element={<AIBattle />} />
        <Route path="/round-table" element={<RoundTable />} />
        <Route path="/debate-lobby" element={<DebateLobby />} />
        <Route path="/debate-room/:roomId" element={<DebateRoomPage />} />
        <Route element={<Layout />}>
          <Route path="/melon" element={<MelonFieldPage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/melon" replace />} />
        </Route>
      </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
