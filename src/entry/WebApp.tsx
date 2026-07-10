import { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import WebLayout from '../layouts/WebLayout'
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
  CricketForge,
  RankListPage,
  PointsHistoryPage,
  AgentWorldPage,
  NotificationPage,
  MessagePage,
  EntertainmentHallPage,
  AICreationPage,
  EmotionDetector,
} from '../router/routes'

// 独立路由 → 组件映射
const standaloneMap: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
  '/share': ShareRedirect as any,
}
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
  '/agent-world': AgentWorldPage,
  '/tools/exif': ExifAnalyzer,
  '/tools/reverse-image': ReverseImageSearch,
  '/tools/timeline': TimelineBuilder,
  '/tools/plagiarism': PlagiarismChecker,
  '/tools/multi-source': MultiSourceVerify,
  '/settings': SettingsPage,
  '/settings/llm': LLMSettingsPage,
  '/admin': AdminPage,
  '/about': AboutPage,
  '/cricket-forge': CricketForge,
  '/notifications': NotificationPage,
  '/messages': MessagePage,
  '/entertainment': EntertainmentHallPage,
  '/ai-creation': AICreationPage,
  '/tools/emotion': EmotionDetector,
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-6 h-6 border-2 border-seal/30 border-t-seal rounded-full animate-spin" />
    </div>
  )
}

export default function WebApp() {
  const platform: Platform = 'web'
  const myLayoutRoutes = filterRoutes(layoutRoutes, platform)
  const myStandaloneRoutes = filterRoutes(standaloneRoutes, platform)
  const fallback = fallbackPaths[platform]

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* 独立路由（无 Layout） */}
            {myStandaloneRoutes.map(r => {
              const Comp = standaloneMap[r.path]
              if (!Comp) return null
              return <Route key={r.path} path={r.path} element={<Comp />} />
            })}

            {/* 布局路由 */}
            <Route element={<WebLayout />}>
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