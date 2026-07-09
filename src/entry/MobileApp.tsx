import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import MobileLayout from '../layouts/MobileLayout'
import ShareRedirect from '../components/ShareRedirect'
import ErrorBoundary from '../components/ErrorBoundary'

// Route-level code splitting — each page is a separate chunk
const MelonFieldPage = lazy(() => import('../pages/MelonFieldPage'))
const MelonDetailPage = lazy(() => import('../pages/MelonDetailPage'))
const MelonRankPage = lazy(() => import('../pages/MelonRankPage'))
const CommunityPage = lazy(() => import('../pages/CommunityPage'))
const CommunityDetailPage = lazy(() => import('../pages/CommunityDetailPage'))
const PublishPage = lazy(() => import('../pages/PublishPage'))
const VerifyPage = lazy(() => import('../pages/VerifyPage'))
const ProfilePage = lazy(() => import('../pages/ProfilePage'))
const UserProfilePage = lazy(() => import('../pages/UserProfilePage'))
const HotPage = lazy(() => import('../pages/HotPage'))
const HotEventDetailPage = lazy(() => import('../pages/HotEventDetailPage'))
const NotesPage = lazy(() => import('../pages/NotesPage'))
const NoteDetailPage = lazy(() => import('../pages/NotesPage').then(module => ({ default: module.NoteDetailPage })))
const RankListPage = lazy(() => import('../pages/RankListPage'))
const PointsHistoryPage = lazy(() => import('../pages/PointsHistoryPage'))
const ExifAnalyzer = lazy(() => import('../pages/ExifAnalyzer'))
const ReverseImageSearch = lazy(() => import('../pages/ReverseImageSearch'))
const TimelineBuilder = lazy(() => import('../pages/TimelineBuilder'))
const PlagiarismChecker = lazy(() => import('../pages/PlagiarismChecker'))
const MultiSourceVerify = lazy(() => import('../pages/MultiSourceVerify'))
const EmotionDetector = lazy(() => import('../pages/EmotionDetector'))
const DebateArena = lazy(() => import('../pages/DebateArena'))
const AIArena = lazy(() => import('../pages/AIArena'))
const DebatesPage = lazy(() => import('../pages/DebatesPage'))
const AIBattle = lazy(() => import('../pages/AIBattle'))
const RoundTable = lazy(() => import('../pages/RoundTable'))
const DebateLobby = lazy(() => import('../pages/DebateLobby'))
const DebateRoomPage = lazy(() => import('../pages/DebateRoomPage'))
const LLMSettingsPage = lazy(() => import('../pages/LLMSettingsPage'))
const AboutPage = lazy(() => import('../pages/AboutPage'))
const AdminPage = lazy(() => import('../pages/AdminPage'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-6 h-6 border-2 border-seal/30 border-t-seal rounded-full animate-spin" />
    </div>
  )
}

export default function MobileApp() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/share" element={<ShareRedirect />} />
            <Route element={<MobileLayout />}>
              <Route path="/hot" element={<HotPage />} />
              <Route path="/hot/:id" element={<HotEventDetailPage />} />
              <Route path="/community" element={<CommunityPage />} />
              <Route path="/community/:id" element={<CommunityDetailPage />} />
              <Route path="/melon" element={<MelonFieldPage />} />
              <Route path="/melon/rank" element={<MelonRankPage />} />
              <Route path="/melon/:id" element={<MelonDetailPage />} />
              <Route path="/notes" element={<NotesPage />} />
            <Route path="/notes/:id" element={<NoteDetailPage />} />
            <Route path="/debates" element={<DebatesPage />} />
              <Route path="/verify" element={<VerifyPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/user/:id" element={<UserProfilePage />} />
              <Route path="/profile/ranks" element={<RankListPage />} />
              <Route path="/profile/points" element={<PointsHistoryPage />} />
              <Route path="/publish" element={<PublishPage />} />
              <Route path="/tools/exif" element={<ExifAnalyzer />} />
              <Route path="/tools/emotion" element={<EmotionDetector />} />
              <Route path="/tools/reverse-image" element={<ReverseImageSearch />} />
              <Route path="/tools/timeline" element={<TimelineBuilder />} />
              <Route path="/tools/plagiarism" element={<PlagiarismChecker />} />
              <Route path="/tools/multi-source" element={<MultiSourceVerify />} />
              <Route path="/debate/:melonId/:title" element={<DebateArena />} />
              <Route path="/ai-arena/:topicId" element={<AIArena />} />
              <Route path="/ai-battle" element={<AIBattle />} />
              <Route path="/round-table" element={<RoundTable />} />
              <Route path="/debate-lobby" element={<DebateLobby />} />
              <Route path="/debate-room/:roomId" element={<DebateRoomPage />} />
              <Route path="/settings/llm" element={<LLMSettingsPage />} />
              <Route path="/about" element={<AboutPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<Navigate to="/hot" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  )
}