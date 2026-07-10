import { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import MobileLayout from '../layouts/MobileLayout'
import ShareRedirect from '../components/ShareRedirect'
import ErrorBoundary from '../components/ErrorBoundary'
import {
  filterRoutes,
  layoutRoutes,
  standaloneRoutes,
  fallbackPaths,
  type Platform,
  // 页面组件
  MelonFieldPage,
  MelonDetailPage,
  MelonRankPage,
  CommunityPage,
  CommunityDetailPage,
  PublishPage,
  VerifyPage,
  ProfilePage,
  UserProfilePage,
  HotPage,
  HotEventDetailPage,
  NotesPage,
  NoteDetailPage,
  ExifAnalyzer,
  ReverseImageSearch,
  TimelineBuilder,
  PlagiarismChecker,
  MultiSourceVerify,
  EmotionDetector,
  DebateArena,
  AIArena,
  DebatesPage,
  AIBattle,
  RoundTable,
  DebateLobby,
  DebateRoomPage,
  LLMSettingsPage,
  SettingsPage,
  AdminPage,
  AboutPage,
  RankListPage,
  PointsHistoryPage,
} from '../router/routes'

// 路径 → 组件映射表（Mobile 不含 CricketForge）
const pageMap: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
  '/melon': MelonFieldPage,
  '/melon/:id': MelonDetailPage,
  '/melon/rank': MelonRankPage,
  '/community': CommunityPage,
  '/community/:id': CommunityDetailPage,
  '/verify': VerifyPage,
  '/publish': PublishPage,
  '/profile': ProfilePage,
  '/user/:id': UserProfilePage,
  '/profile/ranks': RankListPage,
  '/profile/points': PointsHistoryPage,
  '/hot': HotPage,
  '/hot/:id': HotEventDetailPage,
  '/notes': NotesPage,
  '/notes/:id': NoteDetailPage,
  '/debates': DebatesPage,
  '/debate/:melonId/:title': DebateArena,
  '/debate-lobby': DebateLobby,
  '/debate-room/:roomId': DebateRoomPage,
  '/ai-arena/:topicId': AIArena,
  '/ai-battle': AIBattle,
  '/round-table': RoundTable,
  '/tools/exif': ExifAnalyzer,
  '/tools/emotion': EmotionDetector,
  '/tools/reverse-image': ReverseImageSearch,
  '/tools/timeline': TimelineBuilder,
  '/tools/plagiarism': PlagiarismChecker,
  '/tools/multi-source': MultiSourceVerify,
  '/settings': SettingsPage,
  '/settings/llm': LLMSettingsPage,
  '/admin': AdminPage,
  '/about': AboutPage,
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-6 h-6 border-2 border-seal/30 border-t-seal rounded-full animate-spin" />
    </div>
  )
}

export default function MobileApp() {
  const platform: Platform = 'mobile'
  const myLayoutRoutes = filterRoutes(layoutRoutes, platform)
  const myStandaloneRoutes = filterRoutes(standaloneRoutes, platform)
  const fallback = fallbackPaths[platform]

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* 独立路由（无 Layout） */}
            {myStandaloneRoutes.map(r => (
              <Route key={r.path} path={r.path} element={<ShareRedirect />} />
            ))}

            {/* 布局路由 */}
            <Route element={<MobileLayout />}>
              {myLayoutRoutes.map(r => {
                const Comp = pageMap[r.path]
                if (!Comp) return null
                return <Route key={r.path} path={r.path} element={<Comp />} />
              })}
              <Route path="*" element={<Navigate to={fallback} replace />} />
            </Route>
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  )
}