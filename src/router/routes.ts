import { lazy } from 'react'

// ============================================================
// 统一路由表 — 唯一数据源
// 所有 entry（WebApp / MobileApp）从此文件读取路由，
// 不再各自定义 inline 路由表
// ============================================================

export type Platform = 'web' | 'mobile'

export interface RouteConfig {
  path: string
  /** 该路由在哪些平台可用 */
  platform: Platform | 'both'
}

// ---------- 页面组件懒加载 ----------

// 核心页面
export const MelonFieldPage = lazy(() => import('../pages/MelonFieldPage'))
export const MelonDetailPage = lazy(() => import('../pages/MelonDetailPage'))
export const MelonRankPage = lazy(() => import('../pages/MelonRankPage'))
export const CommunityPage = lazy(() => import('../pages/CommunityPage'))
export const CommunityDetailPage = lazy(() => import('../pages/CommunityDetailPage'))
export const PublishPage = lazy(() => import('../pages/PublishPage'))
export const VerifyPage = lazy(() => import('../pages/VerifyPage'))
export const ProfilePage = lazy(() => import('../pages/ProfilePage'))
export const UserProfilePage = lazy(() => import('../pages/UserProfilePage'))

// 热点
export const HotPage = lazy(() => import('../pages/HotPage'))
export const HotEventDetailPage = lazy(() => import('../pages/HotEventDetailPage'))

// 笔记
export const NotesPage = lazy(() => import('../pages/NotesPage'))
export const NoteDetailPage = lazy(() => import('../pages/NotesPage').then(
  module => ({ default: (module as any).NoteDetailPage })
))

// 工具
export const ExifAnalyzer = lazy(() => import('../pages/ExifAnalyzer'))
export const ReverseImageSearch = lazy(() => import('../pages/ReverseImageSearch'))
export const TimelineBuilder = lazy(() => import('../pages/TimelineBuilder'))
export const PlagiarismChecker = lazy(() => import('../pages/PlagiarismChecker'))
export const MultiSourceVerify = lazy(() => import('../pages/MultiSourceVerify'))
export const EmotionDetector = lazy(() => import('../pages/EmotionDetector'))

// 辩论 / AI
export const DebateArena = lazy(() => import('../pages/DebateArena'))
export const AIArena = lazy(() => import('../pages/AIArena'))
export const DebatesPage = lazy(() => import('../pages/DebatesPage'))
export const AIBattle = lazy(() => import('../pages/AIBattle'))
export const RoundTable = lazy(() => import('../pages/RoundTable'))
export const DebateLobby = lazy(() => import('../pages/DebateLobby'))
export const DebateRoomPage = lazy(() => import('../pages/DebateRoomPage'))
export const AICreationPage = lazy(() => import('../pages/AICreationPage'))

// 其他
export const LLMSettingsPage = lazy(() => import('../pages/LLMSettingsPage'))
export const SettingsPage = lazy(() => import('../pages/SettingsPage'))
export const AdminPage = lazy(() => import('../pages/AdminPage'))
export const AboutPage = lazy(() => import('../pages/AboutPage'))
export const CricketForge = lazy(() => import('../pages/CricketForge'))
export const AgentWorldPage = lazy(() => import('../pages/AgentWorldPage'))
export const EntertainmentHallPage = lazy(() => import('../pages/EntertainmentHallPage'))

// 排行 / 积分
export const RankListPage = lazy(() => import('../pages/RankListPage'))
export const PointsHistoryPage = lazy(() => import('../pages/PointsHistoryPage'))

// 消息 / 通知
export const NotificationPage = lazy(() => import('../pages/NotificationPage'))
export const MessagePage = lazy(() => import('../pages/MessagePage'))

// ============================================================
// 路由表 — 所有路由集中定义
// ============================================================

/** 布局内的路由（带导航栏/侧栏/标签栏） */
export const layoutRoutes: RouteConfig[] = [
  // 核心导航
  { path: '/melon',            platform: 'both' },
  { path: '/melon/:id',        platform: 'both' },
  { path: '/melon/rank',       platform: 'both' },
  { path: '/community',        platform: 'both' },
  { path: '/community/:id',    platform: 'both' },
  { path: '/verify',           platform: 'both' },
  { path: '/publish',          platform: 'both' },
  { path: '/profile',          platform: 'both' },
  { path: '/user/:id',         platform: 'both' },
  { path: '/profile/ranks',    platform: 'both' },
  { path: '/profile/points',   platform: 'both' },

  // 热点
  { path: '/hot',              platform: 'both' },
  { path: '/hot/:id',          platform: 'both' },

  // 笔记
  { path: '/notes',            platform: 'both' },
  { path: '/notes/:id',        platform: 'both' },

  // 辩论
  { path: '/debates',          platform: 'both' },
  { path: '/debate/:melonId/:title', platform: 'both' },
  { path: '/debate-lobby',     platform: 'both' },
  { path: '/debate-room/:roomId', platform: 'both' },

  // AI
  { path: '/ai-arena/:topicId', platform: 'both' },
  { path: '/ai-battle',        platform: 'both' },
  { path: '/round-table',      platform: 'both' },
  { path: '/ai-creation',      platform: 'both' },
  { path: '/agent-world',      platform: 'web' },
  { path: '/entertainment',    platform: 'web' },

  // 工具
  { path: '/tools/exif',           platform: 'both' },
  { path: '/tools/reverse-image',  platform: 'both' },
  { path: '/tools/timeline',       platform: 'both' },
  { path: '/tools/plagiarism',     platform: 'both' },
  { path: '/tools/multi-source',   platform: 'both' },
  { path: '/tools/emotion',        platform: 'both' },

  // 消息 / 通知
  { path: '/notifications',    platform: 'web'  },
  { path: '/messages',         platform: 'web'  },

  // 设置/其他
  { path: '/settings',         platform: 'both' },
  { path: '/settings/llm',     platform: 'both' },
  { path: '/admin',            platform: 'both' },
  { path: '/about',            platform: 'both' },
  { path: '/cricket-forge',    platform: 'web'  },
]

/** 布局外的独立路由（如 /share 不需要 Layout） */
export const standaloneRoutes: RouteConfig[] = [
  { path: '/share', platform: 'both' },
]

/** 各平台默认跳转路径 */
export const fallbackPaths: Record<Platform, string> = {
  web: '/melon',
  mobile: '/hot',
}

/** 过滤出指定平台的路由 */
export function filterRoutes(routes: RouteConfig[], platform: Platform): RouteConfig[] {
  return routes.filter(r => r.platform === 'both' || r.platform === platform)
}