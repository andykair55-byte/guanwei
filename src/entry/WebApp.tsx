import { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom'
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
  CityAidPage,
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
  AIArena,
  AIBattle,
  DebateLobby,
  EntertainmentRoomPage,
  NationalDebateLobby,
  NationalDebateRoomPage,
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
  JudgeFeedPage,
  AIArenaLobby,
  CharacterSelect,
  MelonJudgePage,
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
  '/community/aid': CityAidPage,
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
  '/entertainment': EntertainmentHallPage,
  '/entertainment/arena': AIArenaLobby,
  '/entertainment/arena/ai-battle/:topicId': AIArena,
  '/entertainment/arena/character-select': CharacterSelect,
  '/entertainment/arena/human-battle': AIBattle,
  '/entertainment/arena/forge': CricketForge,
  '/entertainment/debate': DebateLobby,
  '/entertainment/debate/lobby': DebateLobby,
  '/entertainment/debate/room/:roomId': EntertainmentRoomPage,
  '/entertainment/debate/national': NationalDebateLobby,
  '/entertainment/debate/national/:roomId': NationalDebateRoomPage,
  '/entertainment/judge': JudgeFeedPage,
  '/entertainment/judge/cases': JudgeFeedPage,
  '/entertainment/judge/melon/:id': MelonJudgePage,
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
  '/notifications': NotificationPage,
  '/messages': MessagePage,
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

/** 保留路径参数的旧路由重定向 */
function OldRouteRedirect({ to }: { to: string }) {
  const params = useParams()
  const location = useLocation()
  const paramValues = Object.values(params).filter(Boolean)
  const target = paramValues.length > 0
    ? `${to}/${paramValues[0]}`
    : to
  return <Navigate to={target + location.search} replace />
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
            {/* 旧路由重定向 */}
            <Route path="/debates" element={<Navigate to="/entertainment/arena" replace />} />
            <Route path="/ai-arena/:topicId" element={<OldRouteRedirect to="/entertainment/arena/ai-battle" />} />
            <Route path="/ai-battle" element={<Navigate to="/entertainment/arena/human-battle" replace />} />
            <Route path="/cricket-forge" element={<Navigate to="/entertainment/arena/forge" replace />} />
            <Route path="/round-table" element={<Navigate to="/entertainment/debate/round-table" replace />} />
            <Route path="/debate-lobby" element={<Navigate to="/entertainment/debate/lobby" replace />} />
            <Route path="/debate-room/:roomId" element={<OldRouteRedirect to="/entertainment/debate/room" />} />
            <Route path="/judge" element={<Navigate to="/entertainment/judge" replace />} />
            <Route path="/debate/:melonId/:title" element={<OldRouteRedirect to="/entertainment/judge/melon" />} />

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