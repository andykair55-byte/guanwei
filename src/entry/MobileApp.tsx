import { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import MobileLayout from '../layouts/MobileLayout'
import ShareRedirect from '../components/ShareRedirect'
import ErrorBoundary from '../components/ErrorBoundary'
import { PageWrapper } from '../components/PageWrapper'
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
  RankListPage,
  PointsHistoryPage,
  EmotionDetector,
  AIArenaLobby,
  CharacterSelect,
  MelonJudgePage,
  EntertainmentHallPage,
  MultiplayerDebatePlaceholder,
  JudgeFeedPage,
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
  '/entertainment': EntertainmentHallPage,
  '/entertainment/arena': AIArenaLobby,
  '/entertainment/arena/ai-battle/:topicId': AIArena,
  '/entertainment/arena/character-select': CharacterSelect,
  '/entertainment/arena/human-battle': AIBattle,
  '/entertainment/debate': DebateLobby,
  '/entertainment/debate/lobby': DebateLobby,
  '/entertainment/debate/multiplayer': MultiplayerDebatePlaceholder,
  '/entertainment/debate/room/:roomId': EntertainmentRoomPage,
  '/entertainment/debate/national': NationalDebateLobby,
  '/entertainment/debate/national/:roomId': NationalDebateRoomPage,
  '/entertainment/judge': JudgeFeedPage,
  '/entertainment/judge/cases': JudgeFeedPage,
  '/entertainment/judge/melon/:id': MelonJudgePage,
  '/tools/exif': ExifAnalyzer,
  '/tools/reverse-image': ReverseImageSearch,
  '/tools/timeline': TimelineBuilder,
  '/tools/plagiarism': PlagiarismChecker,
  '/tools/multi-source': MultiSourceVerify,
  '/settings': SettingsPage,
  '/settings/llm': LLMSettingsPage,
  '/admin': AdminPage,
  '/about': AboutPage,
  '/tools/emotion': EmotionDetector,
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
                return <Route key={r.path} path={r.path} element={<PageWrapper><Comp /></PageWrapper>} />
              })}
              <Route path="*" element={<Navigate to={fallback} replace />} />
            </Route>
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  )
}