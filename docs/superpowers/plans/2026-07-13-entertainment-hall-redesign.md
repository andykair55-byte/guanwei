# 娱乐大厅三馆制重构 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将娱乐大厅从 6 个重叠入口收敛为三馆制（AI 竞技场 / 真人辩论厅 / 判官台），统一路由结构，新增名人主题对战和 4v4 国赛 demo。

**Architecture:** 前端路由全部收归 `/entertainment/*`，旧路由做 Navigate 重定向。三个子大厅页面各自管理子玩法入口。4v4 辩论用 mock 数据 + AI 补位做 demo，强调视觉冲击力。辩论记录收藏存 localStorage。

**Tech Stack:** React 19 + TypeScript + React Router 7 + Zustand + TailwindCSS 4

**Spec:** `docs/superpowers/specs/2026-07-13-entertainment-hall-redesign.md`

---

## 文件结构总览

### 新增文件

| 文件 | 职责 |
|------|------|
| `src/pages/AIArenaLobby.tsx` | AI 竞技场大厅（替代 DebatesPage 的入口职能） |
| `src/pages/DebateHallLobby.tsx` | 真人辩论厅大厅 |
| `src/pages/MelonJudgePage.tsx` | 瓜田判官页面 |
| `src/config/themePacks.ts` | 名人主题对战配置数据 |
| `src/services/themePackService.ts` | 名人主题数据服务 |
| `src/types/themePack.ts` | 名人主题类型定义 |
| `src/stores/debateCollectionStore.ts` | 辩论记录收藏 store（localStorage） |
| `src/services/nationalDebateService.ts` | 4v4 国赛流程服务（mock + AI 补位） |
| `src/types/nationalDebate.ts` | 4v4 国赛类型定义 |
| `src/components/debate/DebateStage4v4.tsx` | 4v4 辩论舞台组件 |
| `src/components/debate/PhaseTimer.tsx` | 环节计时器组件 |
| `src/components/debate/DebateSummaryCard.tsx` | 辩论总结卡片（含收藏按钮） |

### 改造文件

| 文件 | 改造点 |
|------|--------|
| `src/router/routes.ts` | 注册新路由，移除旧路由 |
| `src/entry/WebApp.tsx` | 更新 pageMap + 重定向路由 |
| `src/entry/MobileApp.tsx` | 同步更新移动端 pageMap |
| `src/pages/EntertainmentHallPage.tsx` | 6 卡片 → 3 卡片 |
| `src/pages/DebateRoomPage.tsx` | 支持 4v4 国赛流程 |
| `src/pages/DebateLobby.tsx` | 文案从 3v3 改为 4v4，路由更新 |
| `src/pages/RoundTable.tsx` | 路由更新 |
| `src/pages/JudgeFeedPage.tsx` | 路由更新，增加瓜田判官入口 |
| `src/components/DesktopSidebar.tsx` | 娱乐相关导航项更新 |

---

## Task 1: 路由表重构

**Files:**
- Modify: `src/router/routes.ts`

- [ ] **Step 1: 更新 routes.ts 路由表**

将旧娱乐路由替换为三馆制新路由。在 `src/router/routes.ts` 中，找到 `layoutRoutes` 数组的 `// 辩论` 和 `// AI` 注释区块，替换为：

```typescript
  // 娱乐大厅（三馆制）
  { path: '/entertainment',                          platform: 'both' },
  { path: '/entertainment/arena',                    platform: 'both' },
  { path: '/entertainment/arena/ai-battle/:topicId', platform: 'both' },
  { path: '/entertainment/arena/human-battle',       platform: 'both' },
  { path: '/entertainment/arena/forge',              platform: 'web' },
  { path: '/entertainment/debate',                   platform: 'both' },
  { path: '/entertainment/debate/round-table',       platform: 'both' },
  { path: '/entertainment/debate/lobby',             platform: 'both' },
  { path: '/entertainment/debate/room/:roomId',      platform: 'both' },
  { path: '/entertainment/judge',                    platform: 'both' },
  { path: '/entertainment/judge/cases',              platform: 'both' },
  { path: '/entertainment/judge/melon/:id',          platform: 'both' },
```

同时删除以下旧路由行：
- `{ path: '/debates', ... }`
- `{ path: '/debate/:melonId/:title', ... }`
- `{ path: '/debate-lobby', ... }`
- `{ path: '/debate-room/:roomId', ... }`
- `{ path: '/ai-arena/:topicId', ... }`
- `{ path: '/ai-battle', ... }`
- `{ path: '/round-table', ... }`
- `{ path: '/judge', ... }`
- `{ path: '/cricket-forge', ... }`

在文件底部的 lazy import 区新增：

```typescript
export const AIArenaLobby = lazy(() => import('../pages/AIArenaLobby'))
export const DebateHallLobby = lazy(() => import('../pages/DebateHallLobby'))
export const MelonJudgePage = lazy(() => import('../pages/MelonJudgePage'))
```

- [ ] **Step 2: 验证 tsc**

Run: `npx tsc --noEmit`
Expected: 会有错误（因为新页面文件还不存在），暂忽略，确认路由表本身无语法错误。

- [ ] **Step 3: Commit**

```bash
git add src/router/routes.ts
git commit -m "refactor(routes): 三馆制路由表重构"
```

---

## Task 2: WebApp 路由映射 + 重定向

**Files:**
- Modify: `src/entry/WebApp.tsx`

- [ ] **Step 1: 更新 pageMap 和 import**

在 `src/entry/WebApp.tsx` 中，import 区添加：

```typescript
  AIArenaLobby,
  DebateHallLobby,
  MelonJudgePage,
```

将 `pageMap` 中的旧路由映射替换为新路由：

```typescript
const pageMap: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
  // ... 核心导航不变 ...
  '/hot': HotPage,
  '/hot/:id': HotEventDetailPage,
  '/notes': NotesPage,
  '/notes/:id': NoteDetailPage,

  // 娱乐大厅 — 三馆制
  '/entertainment': EntertainmentHallPage,
  '/entertainment/arena': AIArenaLobby,
  '/entertainment/arena/ai-battle/:topicId': AIArena,
  '/entertainment/arena/human-battle': AIBattle,
  '/entertainment/arena/forge': CricketForge,
  '/entertainment/debate': DebateHallLobby,
  '/entertainment/debate/round-table': RoundTable,
  '/entertainment/debate/lobby': DebateLobby,
  '/entertainment/debate/room/:roomId': DebateRoomPage,
  '/entertainment/judge': JudgeFeedPage,
  '/entertainment/judge/cases': JudgeFeedPage,
  '/entertainment/judge/melon/:id': MelonJudgePage,

  // ... 工具、设置等不变 ...
}
```

删除 pageMap 中以下旧键：
- `'/debates'`
- `'/debate/:melonId/:title'`
- `'/debate-lobby'`
- `'/debate-room/:roomId'`
- `'/ai-arena/:topicId'`
- `'/ai-battle'`
- `'/round-table'`
- `'/judge'`
- `'/cricket-forge'`

- [ ] **Step 2: 添加旧路由重定向**

在 `<Routes>` 内，`standaloneRoutes` map 之前，添加重定向 Route：

```tsx
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
```

在 `WebApp` 组件上方添加辅助组件：

```tsx
/** 保留路径参数的旧路由重定向 */
function OldRouteRedirect({ to }: { to: string }) {
  const params = useParams()
  const location = useLocation()
  // 取第一个 param 值追加到目标路径
  const paramValues = Object.values(params).filter(Boolean)
  const target = paramValues.length > 0
    ? `${to}/${paramValues[0]}`
    : to
  return <Navigate to={target + location.search} replace />
}
```

确保 import 中包含 `useParams`、`useLocation`、`Navigate`。

- [ ] **Step 3: 验证 tsc**

Run: `npx tsc --noEmit`
Expected: 仍有错误（新页面文件未创建），但 WebApp 本身无语法错误。

- [ ] **Step 4: Commit**

```bash
git add src/entry/WebApp.tsx
git commit -m "refactor(webapp): 三馆制路由映射 + 旧路由重定向"
```

---

## Task 3: MobileApp 路由同步

**Files:**
- Modify: `src/entry/MobileApp.tsx`

- [ ] **Step 1: 更新 import 和 pageMap**

在 `src/entry/MobileApp.tsx` 的 import 中添加 `AIArenaLobby`、`DebateHallLobby`、`MelonJudgePage`（从 `../router/routes` 导入）。

将 `pageMap` 中的旧路由映射替换为新路由（与 WebApp 一致，但不含 `forge` 路由）：

```typescript
const pageMap: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
  // ... 核心导航不变 ...
  '/hot': HotPage,
  '/hot/:id': HotEventDetailPage,
  '/notes': NotesPage,
  '/notes/:id': NoteDetailPage,

  // 娱乐大厅 — 三馆制
  '/entertainment': EntertainmentHallPage,
  '/entertainment/arena': AIArenaLobby,
  '/entertainment/arena/ai-battle/:topicId': AIArena,
  '/entertainment/arena/human-battle': AIBattle,
  '/entertainment/debate': DebateHallLobby,
  '/entertainment/debate/round-table': RoundTable,
  '/entertainment/debate/lobby': DebateLobby,
  '/entertainment/debate/room/:roomId': DebateRoomPage,
  '/entertainment/judge': JudgeFeedPage,
  '/entertainment/judge/cases': JudgeFeedPage,
  '/entertainment/judge/melon/:id': MelonJudgePage,

  // ... 工具、设置不变 ...
}
```

删除 pageMap 中旧键：`'/debates'`、`'/debate/:melonId/:title'`、`'/debate-lobby'`、`'/debate-room/:roomId'`、`'/ai-arena/:topicId'`、`'/ai-battle'`、`'/round-table'`。

同时 import `EntertainmentHallPage`、`JudgeFeedPage`（从 routes 导入）。

- [ ] **Step 2: Commit**

```bash
git add src/entry/MobileApp.tsx
git commit -m "refactor(mobile): 同步三馆制路由映射"
```

---

## Task 4: 创建占位页面（确保 tsc 通过）

**Files:**
- Create: `src/pages/AIArenaLobby.tsx`
- Create: `src/pages/DebateHallLobby.tsx`
- Create: `src/pages/MelonJudgePage.tsx`

- [ ] **Step 1: 创建 AIArenaLobby 占位**

```tsx
// src/pages/AIArenaLobby.tsx
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Bot, Mic, Swords, Wrench } from 'lucide-react'
import { useIsDesktop } from '../hooks/useIsDesktop'

export default function AIArenaLobby() {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()

  return (
    <div className="flex flex-col min-h-full bg-paper-texture">
      <div className={`px-5 pt-4 pb-3 flex items-center gap-3 ${isDesktop ? 'max-w-5xl mx-auto w-full' : ''}`}>
        <button onClick={() => navigate('/entertainment')} className="p-1.5 -ml-1.5 rounded-lg hover:bg-paper-dark transition-colors">
          <ArrowLeft size={20} className="text-ink-700" />
        </button>
        <div className="flex-1">
          <h1 className="text-[18px] font-bold text-ink-900">AI 竞技场</h1>
          <p className="text-[11px] text-ink-400">名人擂台 · 人机对战 · 角色工坊</p>
        </div>
      </div>
      <div className={`flex-1 px-5 pb-8 ${isDesktop ? 'max-w-5xl mx-auto w-full' : ''}`}>
        <p className="text-[14px] text-ink-400 text-center py-20">AI 竞技场建设中…</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 创建 DebateHallLobby 占位**

```tsx
// src/pages/DebateHallLobby.tsx
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, Swords } from 'lucide-react'
import { useIsDesktop } from '../hooks/useIsDesktop'

export default function DebateHallLobby() {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()

  return (
    <div className="flex flex-col min-h-full bg-paper-texture">
      <div className={`px-5 pt-4 pb-3 flex items-center gap-3 ${isDesktop ? 'max-w-5xl mx-auto w-full' : ''}`}>
        <button onClick={() => navigate('/entertainment')} className="p-1.5 -ml-1.5 rounded-lg hover:bg-paper-dark transition-colors">
          <ArrowLeft size={20} className="text-ink-700" />
        </button>
        <div className="flex-1">
          <h1 className="text-[18px] font-bold text-ink-900">真人辩论厅</h1>
          <p className="text-[11px] text-ink-400">圆桌局 · 4v4 国赛</p>
        </div>
      </div>
      <div className={`flex-1 px-5 pb-8 ${isDesktop ? 'max-w-5xl mx-auto w-full' : ''}`}>
        <p className="text-[14px] text-ink-400 text-center py-20">真人辩论厅建设中…</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 创建 MelonJudgePage 占位**

```tsx
// src/pages/MelonJudgePage.tsx
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useIsDesktop } from '../hooks/useIsDesktop'

export default function MelonJudgePage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isDesktop = useIsDesktop()

  return (
    <div className="flex flex-col min-h-full bg-paper-texture">
      <div className={`px-5 pt-4 pb-3 flex items-center gap-3 ${isDesktop ? 'max-w-3xl mx-auto w-full' : ''}`}>
        <button onClick={() => navigate('/entertainment/judge')} className="p-1.5 -ml-1.5 rounded-lg hover:bg-paper-dark transition-colors">
          <ArrowLeft size={20} className="text-ink-700" />
        </button>
        <div className="flex-1">
          <h1 className="text-[18px] font-bold text-ink-900">瓜田判官</h1>
          <p className="text-[11px] text-ink-400">瓜 ID: {id}</p>
        </div>
      </div>
      <div className={`flex-1 px-5 pb-8 ${isDesktop ? 'max-w-3xl mx-auto w-full' : ''}`}>
        <p className="text-[14px] text-ink-400 text-center py-20">瓜田判官建设中…</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 验证 tsc 通过**

Run: `npx tsc --noEmit`
Expected: PASS（零错误）

- [ ] **Step 5: Commit**

```bash
git add src/pages/AIArenaLobby.tsx src/pages/DebateHallLobby.tsx src/pages/MelonJudgePage.tsx
git commit -m "feat: 三馆制占位页面"
```

---

## Task 5: 改造 EntertainmentHallPage 为三馆入口

**Files:**
- Modify: `src/pages/EntertainmentHallPage.tsx`

- [ ] **Step 1: 重写 categories 为 3 张卡片**

将 `EntertainmentHallPage.tsx` 中的 `categories` 数组替换为：

```typescript
  const categories: Category[] = [
    {
      id: 'arena',
      icon: Bot,
      label: 'AI 竞技场',
      gradient: 'from-amber-400 via-orange-500 to-red-500',
      description: '看 AI 神仙打架，亲自上阵单挑',
      cards: [
        {
          id: 'ai-battle',
          icon: Bot,
          title: 'AI 斗蛐蛐',
          desc: '诸葛亮 vs 王朗 · 名人擂台 · 自由对战',
          btnText: '观战',
          gradient: 'from-amber-400 to-orange-500',
          pixelColor: '#f59e0b',
          badge: 'HOT',
          badgeColor: '#ef4444',
          players: '2,341 人在看',
          onClick: () => navigate('/entertainment/arena'),
        },
      ],
    },
    {
      id: 'debate',
      icon: Users,
      label: '真人辩论厅',
      gradient: 'from-emerald-400 via-teal-500 to-cyan-600',
      description: '圆桌混战 · 4v4 国赛机制',
      cards: [
        {
          id: 'round-table',
          icon: Swords,
          title: '真人辩论',
          desc: '圆桌局 · 4v4 国赛 · AI 补位',
          btnText: '进入',
          gradient: 'from-emerald-400 to-teal-600',
          pixelColor: '#10b981',
          players: '432 人在线',
          onClick: () => navigate('/entertainment/debate'),
        },
      ],
    },
    {
      id: 'judge',
      icon: Scale,
      label: '判官台',
      gradient: 'from-amber-500 via-orange-500 to-red-500',
      description: '看纠纷 · 当判官 · 断是非',
      cards: [
        {
          id: 'judge-mode',
          icon: Shield,
          title: '我是判官',
          desc: '审理纠纷案件 · 瓜田真假站队',
          btnText: '开审',
          gradient: 'from-yellow-400 via-amber-500 to-orange-600',
          pixelColor: '#f59e0b',
          badge: 'NEW',
          badgeColor: '#22c55e',
          players: '678 人在审',
          onClick: () => navigate('/entertainment/judge'),
        },
      ],
    },
  ]
```

- [ ] **Step 2: 更新 banner 文案**

将 banner 区域的 `<p>` 描述改为：

```tsx
<p className="text-[15px] text-gray-500 leading-relaxed max-w-md">
  三馆制娱乐：AI 竞技场看神仙打架，真人辩论厅亲自上阵，判官台断是非
</p>
```

- [ ] **Step 3: 验证 tsc**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/pages/EntertainmentHallPage.tsx
git commit -m "feat(entertainment): 三馆制入口，6 卡片收敛为 3 卡片"
```

---

## Task 6: 名人主题对战 — 类型与数据

**Files:**
- Create: `src/types/themePack.ts`
- Create: `src/config/themePacks.ts`
- Create: `src/services/themePackService.ts`

- [ ] **Step 1: 创建类型定义**

```typescript
// src/types/themePack.ts

/** 名人主题角色 */
export interface ThemeCharacter {
  id: string
  name: string
  era: string
  stanceHint: string
  systemPrompt: string
  avatar: string
  tags: string[]
}

/** 名人主题包（角色对 + 辩题） */
export interface ThemePack {
  id: string
  title: string
  description: string
  affirm: ThemeCharacter
  negate: ThemeCharacter
  topics: ThemeTopic[]
}

/** 主题辩题 */
export interface ThemeTopic {
  id: string
  title: string
  affirmLabel: string
  negateLabel: string
}
```

- [ ] **Step 2: 创建首批 4 个主题包**

```typescript
// src/config/themePacks.ts
import type { ThemePack } from '../types/themePack'

export const THEME_PACKS: ThemePack[] = [
  {
    id: 'shelian',
    title: '舌战群儒',
    description: '蜀汉丞相 vs 曹魏老臣，匡扶汉室之辩',
    affirm: {
      id: 'zhuge-liang',
      name: '诸葛亮',
      era: '三国·蜀汉',
      stanceHint: '匡扶汉室，联吴抗曹',
      systemPrompt: `你是「诸葛亮」，字孔明，蜀汉丞相。

【身份定义】你是运筹帷幄的卧龙先生，舌战群儒时从容不迫，每句话都暗藏锋机。

【核心风格】
- 从大局出发论证，善用历史类比
- 语言儒雅但暗藏机锋，以理服人
- 承认对方合理处后巧妙转折
- 引用《春秋》《孙子》等经典

【语言特征】常用"亮以为""恕亮直言""公且看"，语气谦和但立场坚定

【立场倾向】支持匡扶汉室、联吴抗曹、王道正统

【底线规则】不人身攻击，尊重对手，不用现代口语

【输出格式】80-150字，纯文本，不用markdown`,
      avatar: '',
      tags: ['三国', '蜀汉', '丞相'],
    },
    negate: {
      id: 'wang-lang',
      name: '王朗',
      era: '三国·曹魏',
      stanceHint: '顺应天命，归附曹魏',
      systemPrompt: `你是「王朗」，字景兴，曹魏大司空。

【身份定义】你是饱读诗书的曹魏老臣，坚信天数已变，汉室气数已尽。

【核心风格】
- 以天命、民心论证政权合法性
- 引经据典，措辞华丽
- 善于用"顺天应人"框架压人
- 被驳斥时容易激动

【语言特征】常用"老夫以为""天数如此""顺天者昌"，语气庄严但略带傲慢

【立场倾向】支持曹魏正统、顺天应人、反对复汉

【底线规则】不人身攻击，尊重对手，不用现代口语

【输出格式】80-150字，纯文本，不用markdown`,
      avatar: '',
      tags: ['三国', '曹魏', '司空'],
    },
    topics: [
      { id: 'han-restore', title: '匡扶汉室是否仍有可能？', affirmLabel: '有可能', negateLabel: '无可能' },
      { id: 'tian-ming', title: '政权更替应顺天命还是守旧统？', affirmLabel: '守旧统', negateLabel: '顺天命' },
    ],
  },
  {
    id: 'ru-fa',
    title: '儒法之争',
    description: '性善 vs 性恶，千年学术之辩',
    affirm: {
      id: 'mengzi',
      name: '孟子',
      era: '战国·儒家',
      stanceHint: '人性本善，仁政为王',
      systemPrompt: `你是「孟子」，邹国人，儒家亚圣。

【身份定义】你是周游列国的孟轲，坚信人性本善，主张仁政王道。

【核心风格】
- 善用比喻（水之就下、牛山之木）
- 气势充沛，好辩但不失风度
- 引《诗》《书》为证
- 直指君王之心

【语言特征】常用"臣以为""人有是四端也""无恻隐之心非人也"，语气铿锵有力

【立场倾向】性善论、仁政、民贵君轻

【底线规则】不人身攻击，尊重对手，不用现代口语

【输出格式】80-150字，纯文本，不用markdown`,
      avatar: '',
      tags: ['战国', '儒家', '亚圣'],
    },
    negate: {
      id: 'xunzi',
      name: '荀子',
      era: '战国·儒家（法源）',
      stanceHint: '人性本恶，化性起伪',
      systemPrompt: `你是「荀子」，名况，赵国人。

【身份定义】你是讲学于兰陵的荀卿，主张人性本恶，强调后天教化。

【核心风格】
- 逻辑严密，层层推演
- 善用类比和反证
- 强调"伪"（人为）的重要性
- 语言冷静理性

【语言特征】常用"人之性恶明矣""化性起伪""不可学不可事而在人者谓之性"，语气沉稳

【立场倾向】性恶论、隆礼重法、后王之道

【底线规则】不人身攻击，尊重对手，不用现代口语

【输出格式】80-150字，纯文本，不用markdown`,
      avatar: '',
      tags: ['战国', '儒家', '法源'],
    },
    topics: [
      { id: 'human-nature', title: '人性本善还是本恶？', affirmLabel: '本善', negateLabel: '本恶' },
      { id: 'renzheng', title: '治国应以德服人还是以法规范？', affirmLabel: '以德服人', negateLabel: '以法规范' },
    ],
  },
  {
    id: 'chibi',
    title: '赤壁之谋',
    description: '诸葛亮 vs 周瑜，联吴抗曹之辩',
    affirm: {
      id: 'zhuge-liang-2',
      name: '诸葛亮',
      era: '三国·蜀汉',
      stanceHint: '联吴抗曹是唯一出路',
      systemPrompt: `你是「诸葛亮」，此时正在赤壁之战前游说东吴。

【身份定义】你是孤身入东吴的卧龙，必须说服孙权联刘抗曹。

【核心风格】
- 用曹操实力分析威慑，再给出对策
- 善用激将法
- 引用当时局势数据
- 从双方共同利益出发

【语言特征】常用"亮有一言""将军且听""此诚危急存亡之秋也"，语气诚恳而有紧迫感

【立场倾向】必须联吴抗曹，曹操不可降

【底线规则】不人身攻击，尊重对手，不用现代口语

【输出格式】80-150字，纯文本，不用markdown`,
      avatar: '',
      tags: ['三国', '蜀汉', '赤壁'],
    },
    negate: {
      id: 'zhou-yu',
      name: '周瑜',
      era: '三国·东吴',
      stanceHint: '东吴可独立抗曹，无需联刘',
      systemPrompt: `你是「周瑜」，字公瑾，东吴大都督。

【身份定义】你是意气风发的美周郎，对刘备心存戒备，认为东吴可独立抗曹。

【核心风格】
- 从军事角度分析，自信满满
- 指出联刘的隐患（刘备非池中物）
- 用兵力、地形数据论证
- 语气骄傲但不失风度

【语言特征】常用"瑜以为""公瑾不才""刘备枭雄之姿"，语气自信而锋利

【立场倾向】东吴独立抗曹，对联盟持保留态度

【底线规则】不人身攻击，尊重对手，不用现代口语

【输出格式】80-150字，纯文本，不用markdown`,
      avatar: '',
      tags: ['三国', '东吴', '都督'],
    },
    topics: [
      { id: 'lian-wu', title: '赤壁之战，联吴是否必要？', affirmLabel: '必要', negateLabel: '不必要' },
      { id: 'liu-bei', title: '刘备是可靠的盟友吗？', affirmLabel: '可靠', negateLabel: '不可靠' },
    ],
  },
  {
    id: 'gu-jin',
    title: '古今之辩',
    description: '鲁迅 vs 胡适，传统文化之辩',
    affirm: {
      id: 'lu-xun',
      name: '鲁迅',
      era: '近代',
      stanceHint: '批判传统文化劣根性',
      systemPrompt: `你是「鲁迅」，原名周树人。

【身份定义】你是以笔为刀的鲁迅先生，批判国民劣根性，主张深刻反思传统文化。

【核心风格】
- 冷峻犀利，一针见血
- 善用反讽和黑色幽默
- 引用具体社会现象
- 语言冷硬但有温度

【语言特征】常用"我以为""其实""不过是"，语气冷峻，偶尔辛辣

【立场倾向】批判传统文化中的奴性、虚伪，但不全盘否定

【底线规则】不人身攻击，尊重对手，不用网络用语

【输出格式】80-150字，纯文本，不用markdown`,
      avatar: '',
      tags: ['近代', '文学', '批判'],
    },
    negate: {
      id: 'hu-shi',
      name: '胡适',
      era: '近代',
      stanceHint: '渐进改良，整理国故',
      systemPrompt: `你是「胡适」，字适之。

【身份定义】你是主张渐进改良和整理国故的胡适先生，反对全盘否定传统。

【核心风格】
- 温和理性，强调实证
- 主张"大胆假设，小心求证"
- 承认传统弊病但反对激进
- 引用具体学术观点

【语言特征】常用"适以为""我们要""一点点地"，语气温和但有定力

【立场倾向】渐进改良、整理国故、反对激进

【底线规则】不人身攻击，尊重对手，不用网络用语

【输出格式】80-150字，纯文本，不用markdown`,
      avatar: '',
      tags: ['近代', '学术', '改良'],
    },
    topics: [
      { id: 'tradition', title: '传统文化应该全盘否定吗？', affirmLabel: '应该否定', negateLabel: '不应否定' },
      { id: 'reform', title: '社会变革应激进革命还是渐进改良？', affirmLabel: '激进革命', negateLabel: '渐进改良' },
    ],
  },
]
```

- [ ] **Step 3: 创建服务层**

```typescript
// src/services/themePackService.ts
import { THEME_PACKS } from '../config/themePacks'
import type { ThemePack, ThemeCharacter } from '../types/themePack'

/** 获取所有主题包 */
export function getAllThemePacks(): ThemePack[] {
  return THEME_PACKS
}

/** 根据 ID 获取主题包 */
export function getThemePack(id: string): ThemePack | undefined {
  return THEME_PACKS.find(p => p.id === id)
}

/** 获取所有名人角色（去重） */
export function getAllThemeCharacters(): ThemeCharacter[] {
  const seen = new Set<string>()
  const chars: ThemeCharacter[] = []
  for (const pack of THEME_PACKS) {
    if (!seen.has(pack.affirm.id)) {
      seen.add(pack.affirm.id)
      chars.push(pack.affirm)
    }
    if (!seen.has(pack.negate.id)) {
      seen.add(pack.negate.id)
      chars.push(pack.negate)
    }
  }
  return chars
}
```

- [ ] **Step 4: 验证 tsc**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/types/themePack.ts src/config/themePacks.ts src/services/themePackService.ts
git commit -m "feat: 名人主题对战类型与首批 4 个主题包"
```

---

## Task 7: AIArenaLobby 大厅实现

**Files:**
- Modify: `src/pages/AIArenaLobby.tsx`

- [ ] **Step 1: 实现完整的 AI 竞技场大厅**

将占位内容替换为完整实现，包含名人擂台、人机对战、自由对战、角色工坊四个入口：

```tsx
// src/pages/AIArenaLobby.tsx
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Bot, Mic, Swords, Wrench, Users, Play,
  ChevronRight, Sparkles,
} from 'lucide-react'
import { useIsDesktop } from '../hooks/useIsDesktop'
import { getAllThemePacks } from '../services/themePackService'
import { TOPICS } from '../services/debateArenaService'

interface ArenaCard {
  id: string
  icon: typeof Bot
  title: string
  desc: string
  btnText: string
  gradient: string
  badge?: string
  badgeColor?: string
  players?: string
  onClick: () => void
}

export default function AIArenaLobby() {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const themePacks = getAllThemePacks()

  // 名人擂台卡片
  const themeCards: ArenaCard[] = themePacks.map((pack, i) => ({
    id: pack.id,
    icon: Swords,
    title: `${pack.affirm.name} vs ${pack.negate.name}`,
    desc: pack.description,
    btnText: '观战',
    gradient: i % 2 === 0 ? 'from-amber-400 to-orange-500' : 'from-rose-400 to-pink-600',
    badge: pack.title,
    badgeColor: '#6366f1',
    players: `${Math.floor(Math.random() * 2000 + 500)} 人在看`,
    onClick: () => navigate(`/entertainment/arena/ai-battle/${pack.topics[0].id}?theme=${pack.id}&affirm=${pack.affirm.id}&negate=${pack.negate.id}`),
  }))

  // 功能入口卡片
  const featureCards: ArenaCard[] = [
    {
      id: 'human-battle',
      icon: Mic,
      title: '人机对战',
      desc: '你 vs AI 辩手，谁才是辩论之王',
      btnText: '开战',
      gradient: 'from-red-500 to-rose-600',
      badge: 'NEW',
      badgeColor: '#22c55e',
      players: '856 人在玩',
      onClick: () => navigate('/entertainment/arena/human-battle'),
    },
    {
      id: 'free-battle',
      icon: Bot,
      title: '自由对战',
      desc: '自选 AI 角色，自定义辩题对战',
      btnText: '开始',
      gradient: 'from-cyan-400 to-blue-600',
      players: '1,208 人在玩',
      onClick: () => navigate(`/entertainment/arena/ai-battle/${TOPICS[0].id}`),
    },
    {
      id: 'forge',
      icon: Wrench,
      title: '角色工坊',
      desc: '自定义 AI 角色Prompt，AI 润色',
      btnText: '锻造',
      gradient: 'from-violet-400 to-purple-600',
      players: '124 人在线',
      onClick: () => navigate('/entertainment/arena/forge'),
    },
  ]

  const renderCard = (card: ArenaCard) => {
    const Icon = card.icon
    return (
      <div
        key={card.id}
        className="group relative bg-white rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}
        onClick={() => card.onClick()}
      >
        <div className={`h-1.5 bg-gradient-to-r ${card.gradient}`} />
        <div className="p-5 flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <div
              className={`w-16 h-16 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110`}
            >
              <Icon size={28} className="text-white" strokeWidth={2} />
            </div>
            {card.badge && (
              <div
                className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 text-[9px] font-bold text-white rounded"
                style={{ background: card.badgeColor }}
              >
                {card.badge}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-[16px] font-bold text-ink-900 leading-tight mb-1">{card.title}</h4>
            <p className="text-[12px] text-ink-400 leading-relaxed mb-3 line-clamp-2">{card.desc}</p>
            <div className="flex items-center justify-between">
              {card.players && (
                <div className="flex items-center gap-1 text-[11px] text-ink-400">
                  <Users size={12} />
                  <span>{card.players}</span>
                </div>
              )}
              <button
                className={`flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-white text-[12px] font-semibold bg-gradient-to-r ${card.gradient} transition-all duration-300 group-hover:shadow-md group-hover:scale-105`}
              >
                <Play size={12} fill="white" />
                {card.btnText}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full bg-paper-texture">
      {/* Header */}
      <div className={`px-5 pt-4 pb-3 flex items-center gap-3 ${isDesktop ? 'max-w-5xl mx-auto w-full' : ''}`}>
        <button onClick={() => navigate('/entertainment')} className="p-1.5 -ml-1.5 rounded-lg hover:bg-paper-dark transition-colors">
          <ArrowLeft size={20} className="text-ink-700" />
        </button>
        <div className="flex-1">
          <h1 className="text-[18px] font-bold text-ink-900">AI 竞技场</h1>
          <p className="text-[11px] text-ink-400">名人擂台 · 人机对战 · 角色工坊</p>
        </div>
      </div>

      <div className={`flex-1 px-5 pb-8 ${isDesktop ? 'max-w-5xl mx-auto w-full' : ''}`}>
        {/* 名人擂台区 */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-amber-500" />
            <h3 className="text-[15px] font-bold text-ink-900">名人擂台</h3>
            <span className="text-[11px] text-ink-400">历史名人对决，看谁更胜一筹</span>
          </div>
          <div className={`grid gap-4 ${isDesktop ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {themeCards.map(renderCard)}
          </div>
        </div>

        {/* 功能入口区 */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Bot size={16} className="text-seal" />
            <h3 className="text-[15px] font-bold text-ink-900">自由对战</h3>
            <span className="text-[11px] text-ink-400">自选角色，亲自上阵</span>
          </div>
          <div className={`grid gap-4 ${isDesktop ? 'grid-cols-3' : 'grid-cols-1'}`}>
            {featureCards.map(renderCard)}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 验证 tsc**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/pages/AIArenaLobby.tsx
git commit -m "feat(arena): AI 竞技场大厅，名人擂台 + 自由对战入口"
```

---

## Task 8: AIArena 支持名人主题参数

**Files:**
- Modify: `src/pages/AIArena.tsx`

- [ ] **Step 1: 读取 theme 参数并使用名人角色 prompt**

在 `AIArena.tsx` 中，找到 `const affirmCharId = searchParams.get('affirm')` 附近，添加 theme 参数读取：

```typescript
import { getThemePack } from '../services/themePackService'
```

在组件内，`affirmCharId` 定义之后添加：

```typescript
  const themeId = searchParams.get('theme')
  const themePack = themeId ? getThemePack(themeId) : undefined
```

在 `const affirmChar` 和 `const negateChar` 的获取逻辑中，增加主题包覆盖：

```typescript
  // 如果有主题包，使用名人角色 prompt 覆盖
  const affirmChar = themePack
    ? { ...match.affirmChar, id: themePack.affirm.id, name: themePack.affirm.name, systemPrompt: themePack.affirm.systemPrompt, personality: themePack.affirm.stanceHint }
    : match.affirmChar
  const negateChar = themePack
    ? { ...match.negateChar, id: themePack.negate.id, name: themePack.negate.name, systemPrompt: themePack.negate.systemPrompt, personality: themePack.negate.stanceHint }
    : match.negateChar
```

- [ ] **Step 2: 更新页面标题显示主题名称**

在 header 区域，如果有 themePack，显示主题标题：

```tsx
<h1 className="text-[18px] font-bold text-ink-900">
  {themePack ? `${themePack.affirm.name} vs ${themePack.negate.name}` : 'AI 斗蛐蛐'}
</h1>
<p className="text-[11px] text-ink-400">
  {themePack ? `${themePack.title} · ${topic.title}` : 'AI 自动辩论'}
</p>
```

- [ ] **Step 3: 验证 tsc**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/pages/AIArena.tsx
git commit -m "feat(arena): AIArena 支持名人主题包参数"
```

---

## Task 9: 真人辩论厅大厅实现

**Files:**
- Modify: `src/pages/DebateHallLobby.tsx`

- [ ] **Step 1: 实现 DebateHallLobby**

```tsx
// src/pages/DebateHallLobby.tsx
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Swords, Users, Play, Zap } from 'lucide-react'
import { useIsDesktop } from '../hooks/useIsDesktop'

interface DebateMode {
  id: string
  icon: typeof Swords
  title: string
  desc: string
  btnText: string
  gradient: string
  badge?: string
  badgeColor?: string
  players?: string
  onClick: () => void
}

export default function DebateHallLobby() {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()

  const modes: DebateMode[] = [
    {
      id: 'round-table',
      icon: Zap,
      title: '圆桌局',
      desc: '5 人混合（人 + AI）· 自定义辩题 · 轻量快速',
      btnText: '进入',
      gradient: 'from-violet-500 to-rose-500',
      badge: 'DEMO',
      badgeColor: '#8b5cf6',
      players: '128 人在玩',
      onClick: () => navigate('/entertainment/debate/round-table'),
    },
    {
      id: 'national-4v4',
      icon: Swords,
      title: '4v4 国赛辩论',
      desc: '开篇立论 → 攻辩 → 自由辩论 → 总结陈词',
      btnText: '匹配',
      gradient: 'from-emerald-400 to-teal-600',
      badge: 'HOT',
      badgeColor: '#ef4444',
      players: '432 人在线',
      onClick: () => navigate('/entertainment/debate/lobby'),
    },
  ]

  const renderCard = (mode: DebateMode) => {
    const Icon = mode.icon
    return (
      <div
        key={mode.id}
        className="group relative bg-white rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}
        onClick={() => mode.onClick()}
      >
        <div className={`h-1.5 bg-gradient-to-r ${mode.gradient}`} />
        <div className="p-5 flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <div
              className={`w-16 h-16 rounded-xl bg-gradient-to-br ${mode.gradient} flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110`}
            >
              <Icon size={28} className="text-white" strokeWidth={2} />
            </div>
            {mode.badge && (
              <div
                className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 text-[9px] font-bold text-white rounded"
                style={{ background: mode.badgeColor }}
              >
                {mode.badge}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-[16px] font-bold text-ink-900 leading-tight mb-1">{mode.title}</h4>
            <p className="text-[12px] text-ink-400 leading-relaxed mb-3 line-clamp-2">{mode.desc}</p>
            <div className="flex items-center justify-between">
              {mode.players && (
                <div className="flex items-center gap-1 text-[11px] text-ink-400">
                  <Users size={12} />
                  <span>{mode.players}</span>
                </div>
              )}
              <button
                className={`flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-white text-[12px] font-semibold bg-gradient-to-r ${mode.gradient} transition-all duration-300 group-hover:shadow-md group-hover:scale-105`}
              >
                <Play size={12} fill="white" />
                {mode.btnText}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full bg-paper-texture">
      <div className={`px-5 pt-4 pb-3 flex items-center gap-3 ${isDesktop ? 'max-w-5xl mx-auto w-full' : ''}`}>
        <button onClick={() => navigate('/entertainment')} className="p-1.5 -ml-1.5 rounded-lg hover:bg-paper-dark transition-colors">
          <ArrowLeft size={20} className="text-ink-700" />
        </button>
        <div className="flex-1">
          <h1 className="text-[18px] font-bold text-ink-900">真人辩论厅</h1>
          <p className="text-[11px] text-ink-400">圆桌局 · 4v4 国赛机制</p>
        </div>
      </div>

      <div className={`flex-1 px-5 pb-8 ${isDesktop ? 'max-w-5xl mx-auto w-full' : ''}`}>
        <div className={`grid gap-4 ${isDesktop ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {modes.map(renderCard)}
        </div>

        {/* 规则说明 */}
        <div className="mt-6 p-4 bg-surface rounded-xl border border-line/30">
          <h3 className="text-[13px] font-bold text-ink-700 mb-2">4v4 国赛流程</h3>
          <div className="text-[11px] text-ink-500 leading-relaxed space-y-1">
            <p>1. 开篇立论：正反方一辩各 3 分钟</p>
            <p>2. 攻辩环节：二辩三辩交叉质询，各 1.5 分钟</p>
            <p>3. 攻辩小结：一辩总结，各 1.5 分钟</p>
            <p>4. 自由辩论：双方交替，各 4 分钟</p>
            <p>5. 总结陈词：四辩结辩，各 3.5 分钟</p>
            <p className="text-ink-400 mt-2">人数不足时 AI 自动补位 · 辩论结束后 AI 裁判评分</p>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 验证 tsc**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/pages/DebateHallLobby.tsx
git commit -m "feat(debate): 真人辩论厅大厅，圆桌局 + 4v4 国赛入口"
```

---

## Task 10: 4v4 国赛类型定义

**Files:**
- Create: `src/types/nationalDebate.ts`

- [ ] **Step 1: 创建国赛类型**

```typescript
// src/types/nationalDebate.ts

/** 国赛环节 */
export type NationalPhase =
  | 'opening'          // 开篇立论
  | 'attack'           // 攻辩环节
  | 'attack-summary'   // 攻辩小结
  | 'free'             // 自由辩论
  | 'closing'          // 总结陈词
  | 'scoring'          // 评分中
  | 'summary'          // 总结展示
  | 'ended'            // 已结束

/** 辩位 */
export type DebatePosition = 1 | 2 | 3 | 4

/** 辩论方 */
export type DebateSide = 'affirm' | 'negate'

/** 席位标识 */
export type SeatId = `${DebateSide}-${DebatePosition}`

/** 席位状态 */
export type SeatStatus = 'human' | 'ai' | 'empty'

/** 国赛席位 */
export interface NationalSeat {
  seatId: SeatId
  side: DebateSide
  position: DebatePosition
  status: SeatStatus
  userId?: string
  nickname?: string
  avatar?: string
  isOwner?: boolean
}

/** 国赛发言 */
export interface NationalSpeech {
  id: string
  seatId: SeatId
  side: DebateSide
  position: DebatePosition
  nickname: string
  avatar: string
  phase: NationalPhase
  content: string
  charLimit: number
  duration: number    // 实际用时（秒）
  isAI: boolean
  createdAt: string
}

/** 评分维度 */
export interface ScoreDimension {
  logic: number       // 逻辑性 30%
  evidence: number    // 事实依据 25%
  rebuttal: number    // 反驳能力 25%
  expression: number  // 表达力 20%
}

/** 辩手评分 */
export interface DebaterScore {
  seatId: SeatId
  nickname: string
  position: DebatePosition
  side: DebateSide
  scores: ScoreDimension
  totalScore: number
  comment: string
}

/** 国赛房间 */
export interface NationalDebateRoom {
  id: string
  topic: string
  affirmLabel: string
  negateLabel: string
  status: NationalPhase
  seats: NationalSeat[]
  speeches: NationalSpeech[]
  scores: DebaterScore[]
  winner: DebateSide | 'draw' | null
  mvpSeatId: SeatId | null
  createdAt: string
}

/** 环节配置 */
export interface PhaseConfig {
  phase: NationalPhase
  label: string
  duration: number       // 秒
  charLimit: number
  order: SeatId[]        // 发言顺序
  description: string
}

/** 国赛流程配置 */
export const NATIONAL_PHASES: PhaseConfig[] = [
  {
    phase: 'opening',
    label: '开篇立论',
    duration: 180,
    charLimit: 400,
    order: ['affirm-1', 'negate-1'],
    description: '正方一辩 → 反方一辩，各 3 分钟',
  },
  {
    phase: 'attack',
    label: '攻辩环节',
    duration: 90,
    charLimit: 200,
    order: ['negate-2', 'affirm-2', 'negate-3', 'affirm-3'],
    description: '反方二辩质询正方一辩 → 正方二辩质询反方一辩 → 反方三辩质询正方二辩 → 正方三辩质询反方二辩',
  },
  {
    phase: 'attack-summary',
    label: '攻辩小结',
    duration: 90,
    charLimit: 200,
    order: ['negate-1', 'affirm-1'],
    description: '反方一辩 → 正方一辩，各 1.5 分钟',
  },
  {
    phase: 'free',
    label: '自由辩论',
    duration: 240,
    charLimit: 150,
    order: ['affirm-1', 'negate-1', 'affirm-2', 'negate-2', 'affirm-3', 'negate-3', 'affirm-4', 'negate-4'],
    description: '正方先发言，双方交替，各 4 分钟',
  },
  {
    phase: 'closing',
    label: '总结陈词',
    duration: 210,
    charLimit: 500,
    order: ['negate-4', 'affirm-4'],
    description: '反方四辩 → 正方四辩，各 3.5 分钟',
  },
]

/** Demo 模式加速倍率 */
export const DEMO_SPEED_MULTIPLIER = 0.15 // 3分钟→27秒

/** 获取环节中文名 */
export function getPhaseLabel(phase: NationalPhase): string {
  const map: Record<NationalPhase, string> = {
    'opening': '开篇立论',
    'attack': '攻辩环节',
    'attack-summary': '攻辩小结',
    'free': '自由辩论',
    'closing': '总结陈词',
    'scoring': '评分中',
    'summary': '总结展示',
    'ended': '已结束',
  }
  return map[phase]
}

/** 获取辩位中文名 */
export function getPositionLabel(position: DebatePosition): string {
  return `${['一', '二', '三', '四'][position - 1]}辩`
}

/** 计算总分 */
export function calculateTotalScore(scores: ScoreDimension): number {
  return Math.round(
    scores.logic * 0.3 +
    scores.evidence * 0.25 +
    scores.rebuttal * 0.25 +
    scores.expression * 0.2
  )
}
```

- [ ] **Step 2: 验证 tsc**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/types/nationalDebate.ts
git commit -m "feat(debate): 4v4 国赛类型定义与流程配置"
```

---

## Task 11: 4v4 国赛服务层（Mock + AI 补位）

**Files:**
- Create: `src/services/nationalDebateService.ts`

- [ ] **Step 1: 创建国赛服务**

```typescript
// src/services/nationalDebateService.ts
import { callLLM } from '../stores/llmStore'
import {
  NATIONAL_PHASES, DEMO_SPEED_MULTIPLIER, calculateTotalScore,
  type NationalDebateRoom, type NationalSeat, type NationalSpeech,
  type DebaterScore, type SeatId, type NationalPhase, type ScoreDimension,
} from '../types/nationalDebate'

/** 创建默认 demo 房间 */
export function createDemoRoom(topic: string, affirmLabel: string, negateLabel: string): NationalDebateRoom {
  const seats: NationalSeat[] = []
  const sides: ('affirm' | 'negate')[] = ['affirm', 'negate']
  for (const side of sides) {
    for (let pos = 1 as 1 | 2 | 3 | 4; pos <= 4; pos++) {
      const seatId = `${side}-${pos}` as SeatId
      // 用户默认在 affirm-1（正方一辩），其余 AI 补位
      seats.push({
        seatId,
        side,
        position: pos as 1 | 2 | 3 | 4,
        status: seatId === 'affirm-1' ? 'human' : 'ai',
        nickname: seatId === 'affirm-1' ? '你' : getAINickname(seatId),
        avatar: '',
        isOwner: seatId === 'affirm-1',
      })
    }
  }

  return {
    id: `demo-${Date.now()}`,
    topic,
    affirmLabel,
    negateLabel,
    status: 'opening',
    seats,
    speeches: [],
    scores: [],
    winner: null,
    mvpSeatId: null,
    createdAt: new Date().toISOString(),
  }
}

/** AI 辩位昵称 */
function getAINickname(seatId: SeatId): string {
  const names: Record<string, string> = {
    'affirm-1': '正方一辩', 'affirm-2': '正方二辩', 'affirm-3': '正方三辩', 'affirm-4': '正方四辩',
    'negate-1': '反方一辩', 'negate-2': '反方二辩', 'negate-3': '反方三辩', 'negate-4': '反方四辩',
  }
  return names[seatId] || 'AI辩手'
}

/** Mock 发言数据 */
const MOCK_SPEECHES: Record<string, string> = {
  'opening-affirm-1': '我方认为，大学生兼职利大于弊。首先，兼职能培养独立性和责任感，这是课堂教育无法替代的。其次，据统计，78%的雇主更倾向于招聘有兼职经验的毕业生。最后，适度的经济独立能让学生更珍惜学习机会。',
  'opening-negate-1': '对方辩友忽略了核心问题：大学生的首要任务是学习。兼职分散精力，导致学业成绩下滑。教育部数据显示，每周兼职超过15小时的学生，挂科率高出42%。我们不应为短期收益牺牲长远发展。',
  'attack-negate-2': '请问对方一辩，您提到的78%雇主数据来源何处？是否区分了与专业相关的实习和无关的兼职？',
  'attack-affirm-2': '反方一辩的数据是否考虑了兼职类型？娱乐业兼职和助教兼职的影响截然不同，您能说明吗？',
  'attack-negate-3': '正方二辩回避了我方问题。请问，如果兼职如此有益，为何顶尖高校普遍不建议大一新生兼职？',
  'attack-affirm-3': '反方二辩的质询恰恰说明：不是兼职本身有问题，而是兼职类型的选择问题。这正需要学校引导而非禁止。',
  'attack-summary-negate-1': '攻辩阶段，对方始终无法回应"兼职影响学业"的核心问题。所谓78%数据来源不明，说明对方的论据缺乏说服力。',
  'attack-summary-affirm-1': '我方已明确：合理兼职有益成长。反方将"过度兼职"等同于"兼职"，是以偏概全。关键在于合理安排而非因噎废食。',
  'free-affirm-1': '反方始终回避一个事实：很多学生因经济原因必须兼职。禁止兼职等于剥夺他们的生存权利。',
  'free-negate-1': '经济困难应通过助学金和奖学金解决，而非让学生牺牲学习时间。这是制度问题，不是兼职合理性的论据。',
  'free-affirm-2': '反方的助学金方案覆盖面不足40%，剩下的学生怎么办？空谈制度完善不如让学生自力更生。',
  'free-negate-2': '对方逻辑有误：制度不完善应该推动制度改革，而非让学生用学业去填补制度漏洞。',
  'free-affirm-3': '兼职不仅是经济问题，更是能力培养。简历上只有成绩没有实践，毕业即失业。',
  'free-negate-3': '实习和科研也是实践，且不影响学业。对方将"兼职"等同于"实践"，偷换了概念。',
  'free-affirm-4': '反方始终在理想层面讨论，但现实中多数学生没有好的实习机会，兼职是他们唯一的实践途径。',
  'free-negate-4': '正方将"无奈之举"美化成"最优选择"，这是典型的合理化谬误。我们应该争取更好的，而非接受次优。',
  'closing-negate-4': '综上所述，对方辩友的论据存在三大问题：数据来源不明、混淆兼职与实践、将无奈美化成选择。大学四年转瞬即逝，把时间投资在学习上，回报远超任何兼职。我方坚决认为，大学生兼职弊大于利。',
  'closing-affirm-4': '反方描绘了一幅理想图景：充足助学金、优质实习、专注学习。但现实是：助学金不够、实习门槛高、学费在涨。兼职不是无奈，而是成长。78%的雇主数据来自智联招聘2024年报告。我方坚持，大学生兼职利大于弊。',
}

/** 生成 AI 发言 */
export async function generateAISpeech(
  room: NationalDebateRoom,
  seatId: SeatId,
  phase: NationalPhase,
): Promise<string> {
  // 优先使用 mock 数据
  const mockKey = `${phase}-${seatId}`
  if (MOCK_SPEECHES[mockKey]) {
    // 模拟延迟
    await new Promise(r => setTimeout(r, 800 + Math.random() * 1200))
    return MOCK_SPEECHES[mockKey]
  }

  // 调用 LLM 生成
  const seat = room.seats.find(s => s.seatId === seatId)
  const phaseConfig = NATIONAL_PHASES.find(p => p.phase === phase)
  const sideLabel = seat?.side === 'affirm' ? room.affirmLabel : room.negateLabel
  const positionLabel = ['一', '二', '三', '四'][seat ? seat.position - 1 : 0]

  const prompt = `你是一场辩论赛的${sideLabel}方${positionLabel}辩手。

辩题：${room.topic}
${room.affirmLabel}方观点：支持
${room.negateLabel}方观点：反对

当前环节：${phaseConfig?.label || phase}
发言字数限制：${phaseConfig?.charLimit || 200}字

之前的发言记录：
${room.speeches.map(s => `${s.side === 'affirm' ? room.affirmLabel : room.negateLabel}方${['一','二','三','四'][s.position-1]}辩：${s.content}`).join('\n')}

请给出你的发言，要求：
- 紧扣辩题，回应对方观点
- 语言有力，逻辑清晰
- 不超过${phaseConfig?.charLimit || 200}字
直接输出发言内容，不要加任何前缀。`

  try {
    const result = await callLLM(prompt, { temperature: 0.7 })
    if (result && result.trim().length > 10) {
      return result.trim().slice(0, phaseConfig?.charLimit || 200)
    }
  } catch {
    // 降级到 mock
  }

  // 降级 mock
  return '（AI正在思考中…）让我方来回应这个问题。从实际情况来看，我方的立场是有充分依据的，我们需要从多个角度来审视这个问题。'
}

/** 生成评分 */
export async function generateScores(room: NationalDebateRoom): Promise<DebaterScore[]> {
  // Mock 评分
  await new Promise(r => setTimeout(r, 1500))

  const scores: DebaterScore[] = room.seats.map(seat => {
    const mockScores: ScoreDimension = {
      logic: 6 + Math.floor(Math.random() * 4),
      evidence: 5 + Math.floor(Math.random() * 4),
      rebuttal: 6 + Math.floor(Math.random() * 4),
      expression: 7 + Math.floor(Math.random() * 3),
    }
    return {
      seatId: seat.seatId,
      nickname: seat.nickname || 'AI辩手',
      position: seat.position,
      side: seat.side,
      scores: mockScores,
      totalScore: calculateTotalScore(mockScores),
      comment: '论证完整，表达清晰，有较好的临场应变能力。',
    }
  })

  return scores
}

/** 获取 demo 加速后的时长 */
export function getDemoDuration(originalDuration: number): number {
  return Math.round(originalDuration * DEMO_SPEED_MULTIPLIER)
}
```

- [ ] **Step 2: 验证 tsc**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/services/nationalDebateService.ts
git commit -m "feat(debate): 4v4 国赛服务层，mock 发言 + AI 补位"
```

---

## Task 12: 辩论记录收藏 Store

**Files:**
- Create: `src/stores/debateCollectionStore.ts`

- [ ] **Step 1: 创建收藏 store**

```typescript
// src/stores/debateCollectionStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** 收藏的辩论记录 */
export interface DebateRecord {
  id: string
  roomId: string
  topic: string
  affirmLabel: string
  negateLabel: string
  winner: string
  mvpName: string
  affirmScore: number
  negateScore: number
  highlight: string        // 精彩发言摘要
  source: 'ai-battle' | 'human-battle' | 'national-4v4' | 'round-table'
  collectedAt: string
}

interface CollectionState {
  records: DebateRecord[]
  addRecord: (record: DebateRecord) => void
  removeRecord: (id: string) => void
  isCollected: (roomId: string) => boolean
  clearAll: () => void
}

export const useDebateCollectionStore = create<CollectionState>()(
  persist(
    (set, get) => ({
      records: [],
      addRecord: (record) => {
        // 去重：同一 roomId 只保存一条
        const existing = get().records.find(r => r.roomId === record.roomId)
        if (existing) return
        set(state => ({ records: [record, ...state.records] }))
      },
      removeRecord: (id) => {
        set(state => ({ records: state.records.filter(r => r.id !== id) }))
      },
      isCollected: (roomId) => {
        return get().records.some(r => r.roomId === roomId)
      },
      clearAll: () => set({ records: [] }),
    }),
    { name: 'debate-collection' },
  ),
)
```

- [ ] **Step 2: 验证 tsc**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/stores/debateCollectionStore.ts
git commit -m "feat(debate): 辩论记录收藏 store（localStorage 持久化）"
```

---

## Task 13: 辩论总结卡片组件（含收藏）

**Files:**
- Create: `src/components/debate/DebateSummaryCard.tsx`

- [ ] **Step 1: 创建总结卡片组件**

```tsx
// src/components/debate/DebateSummaryCard.tsx
import { useState } from 'react'
import { Trophy, Star, Bookmark, BookmarkCheck, Share2 } from 'lucide-react'
import { useDebateCollectionStore, type DebateRecord } from '../../stores/debateCollectionStore'

interface Props {
  roomId: string
  topic: string
  affirmLabel: string
  negateLabel: string
  winner: string
  mvpName: string
  affirmScore: number
  negateScore: number
  highlight: string
  source: DebateRecord['source']
}

export default function DebateSummaryCard({
  roomId, topic, affirmLabel, negateLabel,
  winner, mvpName, affirmScore, negateScore,
  highlight, source,
}: Props) {
  const [copied, setCopied] = useState(false)
  const addRecord = useDebateCollectionStore(s => s.addRecord)
  const removeRecord = useDebateCollectionStore(s => s.removeRecord)
  const isCollected = useDebateCollectionStore(s => s.isCollected(roomId))

  const handleToggleCollect = () => {
    if (isCollected) {
      removeRecord(roomId)
    } else {
      addRecord({
        id: `record-${Date.now()}`,
        roomId,
        topic,
        affirmLabel,
        negateLabel,
        winner,
        mvpName,
        affirmScore,
        negateScore,
        highlight,
        source,
        collectedAt: new Date().toISOString(),
      })
    }
  }

  const handleShare = () => {
    const text = `【${topic}】\n${affirmLabel} ${affirmScore} vs ${negateScore} ${negateLabel}\n胜方：${winner}\nMVP：${mvpName}\n精彩发言：${highlight}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-surface rounded-2xl shadow-card overflow-hidden">
      {/* 顶部 */}
      <div className="bg-gradient-to-r from-seal/10 to-gold/10 px-5 py-4">
        <div className="flex items-center gap-2 mb-1">
          <Trophy size={16} className="text-gold" />
          <span className="text-[12px] font-bold text-ink-700">辩论结束</span>
        </div>
        <h3 className="text-[15px] font-bold text-ink-900">{topic}</h3>
      </div>

      {/* 比分 */}
      <div className="px-5 py-4">
        <div className="flex items-center justify-center gap-6 mb-4">
          <div className="text-center">
            <p className="text-[11px] text-ink-400 mb-1">{affirmLabel}</p>
            <p className={`text-[28px] font-bold ${winner === affirmLabel ? 'text-seal' : 'text-ink-500'}`}>
              {affirmScore}
            </p>
          </div>
          <span className="text-[14px] text-ink-300 font-mono">VS</span>
          <div className="text-center">
            <p className="text-[11px] text-ink-400 mb-1">{negateLabel}</p>
            <p className={`text-[28px] font-bold ${winner === negateLabel ? 'text-seal' : 'text-ink-500'}`}>
              {negateScore}
            </p>
          </div>
        </div>

        <div className="text-center mb-4">
          <p className="text-[13px] text-ink-700">
            获胜方：<span className="font-bold text-seal">{winner}</span>
          </p>
          <p className="text-[12px] text-ink-500 mt-1">
            MVP：<span className="font-medium">{mvpName}</span>
          </p>
        </div>

        {/* 精彩发言 */}
        <div className="p-3 bg-paper-dark/30 rounded-xl mb-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Star size={12} className="text-gold" />
            <span className="text-[11px] font-medium text-ink-600">精彩发言</span>
          </div>
          <p className="text-[12px] text-ink-500 leading-relaxed line-clamp-3">{highlight}</p>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleCollect}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all flex-1 ${
              isCollected
                ? 'bg-gold/10 text-gold border border-gold/20'
                : 'bg-paper-dark/50 text-ink-600 border border-line/20'
            }`}
          >
            {isCollected ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
            {isCollected ? '已收藏' : '收藏'}
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium bg-paper-dark/50 text-ink-600 border border-line/20 transition-all flex-1"
          >
            <Share2 size={14} />
            {copied ? '已复制' : '分享'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 验证 tsc**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/debate/DebateSummaryCard.tsx
git commit -m "feat(debate): 辩论总结卡片组件，含收藏和分享"
```

---

## Task 14: 4v4 国赛舞台组件

**Files:**
- Create: `src/components/debate/DebateStage4v4.tsx`
- Create: `src/components/debate/PhaseTimer.tsx`

- [ ] **Step 1: 创建计时器组件**

```tsx
// src/components/debate/PhaseTimer.tsx
import { useState, useEffect, useRef } from 'react'
import { Clock } from 'lucide-react'

interface Props {
  duration: number        // 总时长（秒）
  onTimeUp: () => void
  autoStart?: boolean
  paused?: boolean
}

export default function PhaseTimer({ duration, onTimeUp, autoStart = true, paused = false }: Props) {
  const [remaining, setRemaining] = useState(duration)
  const onTimeUpRef = useRef(onTimeUp)
  onTimeUpRef.current = onTimeUp

  useEffect(() => {
    if (!autoStart || paused) return
    const interval = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          onTimeUpRef.current()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [autoStart, paused])

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const progress = ((duration - remaining) / duration) * 100
  const isUrgent = remaining <= 10

  return (
    <div className="flex items-center gap-2">
      <Clock size={14} className={isUrgent ? 'text-red-500 animate-pulse' : 'text-ink-400'} />
      <span
        className={`text-[14px] font-mono font-bold tabular-nums ${
          isUrgent ? 'text-red-500' : 'text-ink-600'
        }`}
      >
        {minutes}:{seconds.toString().padStart(2, '0')}
      </span>
      <div className="w-16 h-1 bg-paper-dark rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ease-linear ${
            isUrgent ? 'bg-red-500' : 'bg-seal'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 创建 4v4 舞台组件**

```tsx
// src/components/debate/DebateStage4v4.tsx
import { useRef, useEffect } from 'react'
import { Crown, Bot, User } from 'lucide-react'
import {
  type NationalDebateRoom, type NationalSpeech,
  getPositionLabel, getPhaseLabel,
} from '../../types/nationalDebate'
import PhaseTimer from './PhaseTimer'

interface Props {
  room: NationalDebateRoom
  currentPhaseIndex: number
  currentSpeechIndex: number    // 当前环节内的发言序号
  phaseRemaining: number        // 当前环节剩余秒数
  onPhaseTimeUp: () => void
  onSpeechComplete: () => void
  userSeatId: string | null     // 用户所在席位
  userInput: string
  onUserInputChange: (v: string) => void
  onUserSubmit: () => void
  isAIThinking: boolean
}

export default function DebateStage4v4({
  room, currentPhaseIndex, currentSpeechIndex,
  phaseRemaining, onPhaseTimeUp, onSpeechComplete,
  userSeatId, userInput, onUserInputChange, onUserSubmit,
  isAIThinking,
}: Props) {
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [room.speeches.length, isAIThinking])

  const phases = ['opening', 'attack', 'attack-summary', 'free', 'closing']
  const currentPhase = phases[currentPhaseIndex]
  const phaseConfig = [
    { label: '开篇立论', order: ['正方一辩', '反方一辩'] },
    { label: '攻辩环节', order: ['反方二辩→正方一辩', '正方二辩→反方一辩', '反方三辩→正方二辩', '正方三辩→反方二辩'] },
    { label: '攻辩小结', order: ['反方一辩', '正方一辩'] },
    { label: '自由辩论', order: ['正方', '反方', '交替'] },
    { label: '总结陈词', order: ['反方四辩', '正方四辩'] },
  ]

  // 当前发言席位
  const currentPhaseOrder = getPhaseOrder(currentPhase)
  const currentSeatId = currentPhaseOrder[currentSpeechIndex]
  const isUserTurn = currentSeatId === userSeatId

  return (
    <div className="flex flex-col h-full">
      {/* 环节指示器 */}
      <div className="flex items-center gap-1 px-4 py-2 bg-surface border-b border-line/30">
        {phases.map((p, i) => (
          <div
            key={p}
            className={`flex-1 text-center py-1.5 rounded-lg text-[10px] font-medium transition-all ${
              i === currentPhaseIndex
                ? 'bg-seal text-white'
                : i < currentPhaseIndex
                ? 'bg-seal/10 text-seal'
                : 'bg-paper-dark/30 text-ink-400'
            }`}
          >
            {getPhaseLabel(p as any)}
          </div>
        ))}
      </div>

      {/* 计时器 */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface border-b border-line/30">
        <span className="text-[11px] text-ink-500">
          {getPhaseLabel(currentPhase as any)} · 第 {currentSpeechIndex + 1}/{currentPhaseOrder.length} 发言
        </span>
        <PhaseTimer duration={phaseRemaining} onTimeUp={onPhaseTimeUp} />
      </div>

      {/* 双方辩手布局 */}
      <div className="flex gap-2 px-4 py-3 bg-surface border-b border-line/30">
        {/* 正方 */}
        <div className="flex-1 space-y-1.5">
          <div className="text-[10px] font-bold text-seal text-center mb-1">{room.affirmLabel}</div>
          {room.seats.filter(s => s.side === 'affirm').map(seat => (
            <div
              key={seat.seatId}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] transition-all ${
                seat.seatId === currentSeatId
                  ? 'bg-seal/10 ring-1 ring-seal/30'
                  : 'bg-paper-dark/20'
              }`}
            >
              {seat.status === 'ai' ? <Bot size={10} className="text-ink-400" /> : <User size={10} className="text-seal" />}
              <span className={seat.seatId === currentSeatId ? 'text-seal font-bold' : 'text-ink-500'}>
                {getPositionLabel(seat.position)}
              </span>
              {seat.isOwner && <Crown size={9} className="text-gold" />}
            </div>
          ))}
        </div>
        {/* 反方 */}
        <div className="flex-1 space-y-1.5">
          <div className="text-[10px] font-bold text-ink-600 text-center mb-1">{room.negateLabel}</div>
          {room.seats.filter(s => s.side === 'negate').map(seat => (
            <div
              key={seat.seatId}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] transition-all ${
                seat.seatId === currentSeatId
                  ? 'bg-ink-100 ring-1 ring-ink-300/50'
                  : 'bg-paper-dark/20'
              }`}
            >
              {seat.status === 'ai' ? <Bot size={10} className="text-ink-400" /> : <User size={10} className="text-ink-600" />}
              <span className={seat.seatId === currentSeatId ? 'text-ink-800 font-bold' : 'text-ink-500'}>
                {getPositionLabel(seat.position)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 发言区 */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {room.speeches.map((speech) => (
          <SpeechBubble key={speech.id} speech={speech} room={room} isUser={speech.seatId === userSeatId} />
        ))}
        {isAIThinking && (
          <div className="flex items-center gap-2 text-[11px] text-ink-400 animate-pulse">
            <Bot size={12} />
            <span>AI 辩手正在思考…</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* 用户输入区 */}
      {isUserTurn && (
        <div className="px-4 py-3 bg-surface border-t border-line/30">
          <div className="flex gap-2">
            <input
              value={userInput}
              onChange={e => onUserInputChange(e.target.value)}
              placeholder={`轮到你发言了（${getPositionLabel(room.seats.find(s => s.seatId === userSeatId)?.position || 1)}）…`}
              className="flex-1 px-3 py-2 rounded-xl bg-paper-dark/50 border border-line/20 text-[13px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-seal/20"
              onKeyDown={e => { if (e.key === 'Enter' && userInput.trim()) onUserSubmit() }}
            />
            <button
              onClick={onUserSubmit}
              disabled={!userInput.trim()}
              className="px-4 py-2 rounded-xl bg-seal text-white text-[12px] font-medium disabled:opacity-40 active:scale-95 transition-transform"
            >
              发言
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** 发言气泡 */
function SpeechBubble({ speech, room, isUser }: { speech: NationalSpeech; room: NationalDebateRoom; isUser: boolean }) {
  const isAffirm = speech.side === 'affirm'
  return (
    <div className={`flex ${isAffirm ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[75%] ${isAffirm ? 'items-start' : 'items-end'} flex flex-col gap-1`}>
        <div className="flex items-center gap-1.5 px-1">
          <span className={`text-[10px] font-medium ${isAffirm ? 'text-seal' : 'text-ink-600'}`}>
            {isAffirm ? room.affirmLabel : room.negateLabel} · {getPositionLabel(speech.position)}
          </span>
          {speech.isAI && <Bot size={9} className="text-ink-300" />}
          <span className="text-[9px] text-ink-300">{getPhaseLabel(speech.phase)}</span>
        </div>
        <div
          className={`px-3 py-2 rounded-2xl text-[12px] leading-relaxed ${
            isUser
              ? 'bg-seal text-white rounded-br-sm'
              : isAffirm
              ? 'bg-seal/8 text-ink-800 rounded-bl-sm'
              : 'bg-ink-100 text-ink-800 rounded-br-sm'
          }`}
        >
          {speech.content}
        </div>
      </div>
    </div>
  )
}

/** 获取环节发言顺序 */
function getPhaseOrder(phase: string): string[] {
  const orders: Record<string, string[]> = {
    'opening': ['affirm-1', 'negate-1'],
    'attack': ['negate-2', 'affirm-2', 'negate-3', 'affirm-3'],
    'attack-summary': ['negate-1', 'affirm-1'],
    'free': ['affirm-1', 'negate-1', 'affirm-2', 'negate-2', 'affirm-3', 'negate-3', 'affirm-4', 'negate-4'],
    'closing': ['negate-4', 'affirm-4'],
  }
  return orders[phase] || []
}
```

- [ ] **Step 3: 验证 tsc**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/debate/DebateStage4v4.tsx src/components/debate/PhaseTimer.tsx
git commit -m "feat(debate): 4v4 国赛舞台组件 + 计时器"
```

---

## Task 15: DebateRoomPage 接入 4v4 国赛流程

**Files:**
- Modify: `src/pages/DebateRoomPage.tsx`

- [ ] **Step 1: 读取当前 DebateRoomPage**

先读取 `src/pages/DebateRoomPage.tsx` 全文，理解现有结构。

- [ ] **Step 2: 在 DebateRoomPage 中增加 4v4 demo 模式**

在 `DebateRoomPage` 中，检测 roomId 是否为 `new` 或 `demo-*`。如果是，渲染 `DebateStage4v4` 组件，使用 `createDemoRoom` 初始化，用 `generateAISpeech` 驱动 AI 发言，用 `generateScores` 在结束后评分。

核心逻辑：

```tsx
import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BarChart3 } from 'lucide-react'
import DebateStage4v4 from '../components/debate/DebateStage4v4'
import DebateSummaryCard from '../components/debate/DebateSummaryCard'
import {
  createDemoRoom, generateAISpeech, generateScores, getDemoDuration,
} from '../services/nationalDebateService'
import {
  NATIONAL_PHASES,
  type NationalDebateRoom, type NationalSpeech, type DebaterScore,
} from '../types/nationalDebate'
import { useIsDesktop } from '../hooks/useIsDesktop'

export default function DebateRoomPage() {
  const navigate = useNavigate()
  const { roomId } = useParams()
  const isDesktop = useIsDesktop()

  const [room, setRoom] = useState<NationalDebateRoom | null>(null)
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0)
  const [currentSpeechIndex, setCurrentSpeechIndex] = useState(0)
  const [phaseRemaining, setPhaseRemaining] = useState(0)
  const [isAIThinking, setIsAIThinking] = useState(false)
  const [userInput, setUserInput] = useState('')
  const [showSummary, setShowSummary] = useState(false)
  const [scores, setScores] = useState<DebaterScore[]>([])

  // 初始化 demo 房间
  useEffect(() => {
    if (!roomId) return
    const demoRoom = createDemoRoom(
      '大学生兼职利大于弊还是弊大于利？',
      '利大于弊',
      '弊大于利',
    )
    setRoom(demoRoom)
    const firstPhase = NATIONAL_PHASES[0]
    setPhaseRemaining(getDemoDuration(firstPhase.duration))
  }, [roomId])

  // 驱动当前发言
  const advanceSpeech = useCallback(async () => {
    if (!room) return
    const phase = NATIONAL_PHASES[currentPhaseIndex]
    if (!phase) return
    const seatId = phase.order[currentSpeechIndex]
    if (!seatId) return

    const seat = room.seats.find(s => s.seatId === seatId)
    if (!seat) return

    // 用户席位等待用户输入
    if (seat.status === 'human') return

    // AI 发言
    setIsAIThinking(true)
    try {
      const content = await generateAISpeech(room, seatId, phase.phase)
      const speech: NationalSpeech = {
        id: `speech-${Date.now()}`,
        seatId,
        side: seat.side,
        position: seat.position,
        nickname: seat.nickname || 'AI',
        avatar: '',
        phase: phase.phase,
        content,
        charLimit: phase.charLimit,
        duration: 0,
        isAI: true,
        createdAt: new Date().toISOString(),
      }
      setRoom(prev => prev ? { ...prev, speeches: [...prev.speeches, speech] } : null)
    } finally {
      setIsAIThinking(false)
    }

    // 下一个发言
    nextSpeech()
  }, [room, currentPhaseIndex, currentSpeechIndex])

  const nextSpeech = useCallback(() => {
    const phase = NATIONAL_PHASES[currentPhaseIndex]
    if (!phase) return

    if (currentSpeechIndex + 1 < phase.order.length) {
      setCurrentSpeechIndex(prev => prev + 1)
      setPhaseRemaining(getDemoDuration(phase.duration))
    } else {
      // 进入下一环节
      if (currentPhaseIndex + 1 < NATIONAL_PHASES.length) {
        setCurrentPhaseIndex(prev => prev + 1)
        setCurrentSpeechIndex(0)
        const nextPhase = NATIONAL_PHASES[currentPhaseIndex + 1]
        setPhaseRemaining(getDemoDuration(nextPhase.duration))
      } else {
        // 辩论结束，评分
        finishDebate()
      }
    }
  }, [currentPhaseIndex, currentSpeechIndex])

  const finishDebate = async () => {
    if (!room) return
    setShowSummary(true)
    const result = await generateScores(room)
    setScores(result)
    // 计算获胜方
    const affirmTotal = result.filter(s => s.side === 'affirm').reduce((sum, s) => sum + s.totalScore, 0)
    const negateTotal = result.filter(s => s.side === 'negate').reduce((sum, s) => sum + s.totalScore, 0)
    const winner = affirmTotal > negateTotal ? room.affirmLabel : negateTotal > affirmTotal ? room.negateLabel : '平局'
    const mvp = result.reduce((max, s) => s.totalScore > max.totalScore ? s : max, result[0])
    setRoom(prev => prev ? {
      ...prev,
      status: 'ended',
      scores: result,
      winner,
      mvpSeatId: mvp?.seatId || null,
    } : null)
  }

  const handlePhaseTimeUp = () => {
    nextSpeech()
  }

  const handleUserSubmit = () => {
    if (!room || !userInput.trim()) return
    const phase = NATIONAL_PHASES[currentPhaseIndex]
    const seatId = phase.order[currentSpeechIndex]
    const seat = room.seats.find(s => s.seatId === seatId)
    if (!seat) return

    const speech: NationalSpeech = {
      id: `speech-${Date.now()}`,
      seatId,
      side: seat.side,
      position: seat.position,
      nickname: '你',
      avatar: '',
      phase: phase.phase,
      content: userInput.trim(),
      charLimit: phase.charLimit,
      duration: 0,
      isAI: false,
      createdAt: new Date().toISOString(),
    }
    setRoom(prev => prev ? { ...prev, speeches: [...prev.speeches, speech] } : null)
    setUserInput('')
    nextSpeech()
  }

  // 自动驱动 AI 发言
  useEffect(() => {
    if (!room || showSummary || isAIThinking) return
    const phase = NATIONAL_PHASES[currentPhaseIndex]
    if (!phase) return
    const seatId = phase.order[currentSpeechIndex]
    if (!seatId) return
    const seat = room.seats.find(s => s.seatId === seatId)
    if (seat && seat.status === 'ai') {
      const timer = setTimeout(() => advanceSpeech(), 500)
      return () => clearTimeout(timer)
    }
  }, [room, currentPhaseIndex, currentSpeechIndex, showSummary, isAIThinking, advanceSpeech])

  if (!room) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-6 h-6 border-2 border-seal/30 border-t-seal rounded-full animate-spin" />
      </div>
    )
  }

  const userSeat = room.seats.find(s => s.isOwner)

  return (
    <div className="flex flex-col h-full bg-paper-texture">
      {/* Header */}
      <div className={`px-4 py-2 flex items-center gap-3 bg-surface border-b border-line/30 ${isDesktop ? 'max-w-5xl mx-auto w-full' : ''}`}>
        <button onClick={() => navigate('/entertainment/debate/lobby')} className="p-1 rounded-lg hover:bg-paper-dark">
          <ArrowLeft size={18} className="text-ink-700" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[14px] font-bold text-ink-900 truncate">{room.topic}</h1>
          <p className="text-[10px] text-ink-400">4v4 国赛 · DEMO 模式</p>
        </div>
      </div>

      {/* 舞台 */}
      <div className={`flex-1 flex flex-col ${isDesktop ? 'max-w-5xl mx-auto w-full' : ''}`}>
        {showSummary ? (
          <div className="flex-1 px-4 py-6 overflow-y-auto">
            <DebateSummaryCard
              roomId={room.id}
              topic={room.topic}
              affirmLabel={room.affirmLabel}
              negateLabel={room.negateLabel}
              winner={room.winner || '平局'}
              mvpName={scores.find(s => s.seatId === room.mvpSeatId)?.nickname || '—'}
              affirmScore={scores.filter(s => s.side === 'affirm').reduce((sum, s) => sum + s.totalScore, 0)}
              negateScore={scores.filter(s => s.side === 'negate').reduce((sum, s) => sum + s.totalScore, 0)}
              highlight={room.speeches[0]?.content?.slice(0, 80) || ''}
              source="national-4v4"
            />
            <div className="mt-4 space-y-2">
              {scores.map(s => (
                <div key={s.seatId} className="flex items-center justify-between px-4 py-2 bg-surface rounded-xl">
                  <span className="text-[12px] text-ink-700">
                    {s.side === 'affirm' ? room.affirmLabel : room.negateLabel} · {['一','二','三','四'][s.position-1]}辩 · {s.nickname}
                  </span>
                  <span className="text-[14px] font-bold text-seal">{s.totalScore}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <DebateStage4v4
            room={room}
            currentPhaseIndex={currentPhaseIndex}
            currentSpeechIndex={currentSpeechIndex}
            phaseRemaining={phaseRemaining}
            onPhaseTimeUp={handlePhaseTimeUp}
            onSpeechComplete={nextSpeech}
            userSeatId={userSeat?.seatId || null}
            userInput={userInput}
            onUserInputChange={setUserInput}
            onUserSubmit={handleUserSubmit}
            isAIThinking={isAIThinking}
          />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 验证 tsc**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/pages/DebateRoomPage.tsx
git commit -m "feat(debate): DebateRoomPage 接入 4v4 国赛 demo 流程"
```

---

## Task 16: 更新 DebateLobby 文案

**Files:**
- Modify: `src/pages/DebateLobby.tsx`

- [ ] **Step 1: 更新文案从 3v3 到 4v4**

在 `src/pages/DebateLobby.tsx` 中：

1. 将 "全真人辩论场" 标题改为 "4v4 国赛辩论"
2. 将说明文案改为：

```tsx
<p className="text-[12px] text-ink-500 leading-relaxed">
  4v4 国赛机制。开篇立论 → 攻辩 → 自由辩论 → 总结陈词。人数不足时 AI 自动补位，AI 裁判评分。可收藏辩论记录。
</p>
```

3. 将返回按钮的 navigate 目标从 `'/melon'` 改为 `'/entertainment/debate'`
4. 将创建房间按钮的 navigate 目标从 `'/debate-room/new'` 改为 `'/entertainment/debate/room/new'`
5. 将房间卡片的 onClick 从 `navigate('/debate-room/${room.id}')` 改为 `navigate('/entertainment/debate/room/${room.id}')`

- [ ] **Step 2: 验证 tsc**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/pages/DebateLobby.tsx
git commit -m "refactor(debate): DebateLobby 文案更新为 4v4 国赛 + 路由修正"
```

---

## Task 17: 更新 RoundTable 路由

**Files:**
- Modify: `src/pages/RoundTable.tsx`

- [ ] **Step 1: 更新返回路由**

在 `src/pages/RoundTable.tsx` 中，找到所有 `navigate(-1)` 或 `navigate('/entertainment')` 调用，确保返回到 `/entertainment/debate`。

将 header 返回按钮改为：

```tsx
<button onClick={() => navigate('/entertainment/debate')} ...>
```

- [ ] **Step 2: 验证 tsc**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/pages/RoundTable.tsx
git commit -m "refactor(round-table): 返回路由修正"
```

---

## Task 18: 判官台路由更新

**Files:**
- Modify: `src/pages/JudgeFeedPage.tsx`

- [ ] **Step 1: 更新返回路由和增加瓜田判官入口**

在 `src/pages/JudgeFeedPage.tsx` 中：

1. 将返回按钮的 navigate 目标从 `'/entertainment'` 或 `'/melon'` 改为 `'/entertainment'`（判官台的上级就是娱乐大厅）。

2. 在 header 下方增加"瓜田判官"入口卡片：

```tsx
{/* 瓜田判官入口 */}
<div className={`px-5 mb-3 ${isDesktop ? 'max-w-2xl mx-auto w-full' : ''}`}>
  <button
    onClick={() => navigate('/entertainment/judge/melon/mock-1')}
    className="w-full p-3 bg-gradient-to-r from-pink-400/10 to-rose-500/10 border border-pink-200/20 rounded-xl flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
  >
    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center flex-shrink-0">
      <Flame size={18} className="text-white" />
    </div>
    <div className="flex-1">
      <p className="text-[13px] font-bold text-ink-900">瓜田判官</p>
      <p className="text-[11px] text-ink-400">热点真假站队 · 吃瓜断是非</p>
    </div>
    <ChevronRight size={16} className="text-ink-300" />
  </button>
</div>
```

确保 import 中包含 `Flame` 和 `ChevronRight`。

- [ ] **Step 2: 验证 tsc**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/pages/JudgeFeedPage.tsx
git commit -m "feat(judge): 判官台增加瓜田判官入口"
```

---

## Task 19: MelonJudgePage 基础实现

**Files:**
- Modify: `src/pages/MelonJudgePage.tsx`

- [ ] **Step 1: 实现瓜田判官页面**

```tsx
// src/pages/MelonJudgePage.tsx
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Scale, Users, ThumbsUp, ThumbsDown, RotateCcw } from 'lucide-react'
import { useIsDesktop } from '../hooks/useIsDesktop'

interface MelonCase {
  id: string
  title: string
  description: string
  affirmLabel: string
  negateLabel: string
  affirmCount: number
  negateCount: number
}

const MOCK_MELON_CASES: MelonCase[] = [
  {
    id: 'mock-1',
    title: '某知名综艺被曝剧本造假，冠军早已内定？',
    description: '多位参赛选手匿名爆料称节目组提前安排赛果，引发广泛讨论。节目组已发声明否认。',
    affirmLabel: '真的',
    negateLabel: '假的',
    affirmCount: 356,
    negateCount: 128,
  },
  {
    id: 'mock-2',
    title: '自研芯片超越骁龙8 Gen 4？',
    description: '某国产手机品牌在发布会上展示了自研芯片跑分数据，声称性能领先业界。',
    affirmLabel: '吹的',
    negateLabel: '真的',
    affirmCount: 312,
    negateCount: 89,
  },
]

export default function MelonJudgePage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isDesktop = useIsDesktop()
  const [hasVoted, setHasVoted] = useState<'affirm' | 'negate' | null>(null)

  const currentCase = MOCK_MELON_CASES.find(c => c.id === id) || MOCK_MELON_CASES[0]
  const totalVotes = currentCase.affirmCount + currentCase.negateCount

  const handleVote = (vote: 'affirm' | 'negate') => {
    setHasVoted(vote)
  }

  const affirmPercent = Math.round((currentCase.affirmCount / totalVotes) * 100)
  const negatePercent = 100 - affirmPercent

  return (
    <div className="flex flex-col min-h-full bg-paper-texture">
      <div className={`px-5 pt-4 pb-3 flex items-center gap-3 ${isDesktop ? 'max-w-3xl mx-auto w-full' : ''}`}>
        <button onClick={() => navigate('/entertainment/judge')} className="p-1.5 -ml-1.5 rounded-lg hover:bg-paper-dark transition-colors">
          <ArrowLeft size={20} className="text-ink-700" />
        </button>
        <div className="flex-1">
          <h1 className="text-[18px] font-bold text-ink-900">瓜田判官</h1>
          <p className="text-[11px] text-ink-400">看瓜 · 站队 · 断真假</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-surface shadow-card">
          <Scale size={12} className="text-gold" />
          <span className="text-[11px] text-ink-500 font-medium">{totalVotes}</span>
        </div>
      </div>

      <div className={`flex-1 px-5 pb-8 ${isDesktop ? 'max-w-3xl mx-auto w-full' : ''}`}>
        {/* 案件卡片 */}
        <div className="bg-surface rounded-2xl shadow-card overflow-hidden">
          <div className="p-5">
            <h2 className="text-[16px] font-bold text-ink-900 mb-2">{currentCase.title}</h2>
            <p className="text-[13px] text-ink-500 leading-relaxed mb-4">{currentCase.description}</p>

            {!hasVoted ? (
              <>
                <p className="text-[12px] text-ink-400 mb-3 text-center">你觉得这个瓜是…</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleVote('affirm')}
                    className="flex-1 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-[14px] font-bold active:scale-95 transition-transform"
                  >
                    {currentCase.affirmLabel}
                  </button>
                  <button
                    onClick={() => handleVote('negate')}
                    className="flex-1 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 text-[14px] font-bold active:scale-95 transition-transform"
                  >
                    {currentCase.negateLabel}
                  </button>
                </div>
              </>
            ) : (
              <div className="animate-fade-in-up">
                {/* 投票结果 */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-red-600 font-medium">{currentCase.affirmLabel}</span>
                    <span className="text-ink-400">{currentCase.affirmCount} 票 · {affirmPercent}%</span>
                  </div>
                  <div className="h-2 bg-paper-dark rounded-full overflow-hidden flex">
                    <div className="h-full bg-red-400" style={{ width: `${affirmPercent}%` }} />
                    <div className="h-full bg-emerald-400" style={{ width: `${negatePercent}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-emerald-600 font-medium">{currentCase.negateLabel}</span>
                    <span className="text-ink-400">{currentCase.negateCount} 票 · {negatePercent}%</span>
                  </div>
                </div>

                <div className={`p-3 rounded-xl text-center mb-3 ${
                  hasVoted === 'affirm' ? 'bg-red-50' : 'bg-emerald-50'
                }`}>
                  <p className="text-[12px] text-ink-600">
                    你判定为「{hasVoted === 'affirm' ? currentCase.affirmLabel : currentCase.negateLabel}」
                  </p>
                  <p className="text-[11px] text-ink-400 mt-1">
                    {hasVoted === 'affirm' ? '和大多数人的判断一致' : '少数派观点，等待开奖验证'}
                  </p>
                </div>

                <button
                  onClick={() => setHasVoted(null)}
                  className="w-full py-2.5 rounded-xl bg-paper-dark/50 text-ink-500 text-[12px] font-medium flex items-center justify-center gap-1.5"
                >
                  <RotateCcw size={12} />
                  重新判定
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 参与人数 */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-ink-400">
          <Users size={12} />
          <span>{totalVotes} 人参与判定</span>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 验证 tsc**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/pages/MelonJudgePage.tsx
git commit -m "feat(judge): 瓜田判官页面实现"
```

---

## Task 20: 更新 AIBattle 路由引用

**Files:**
- Modify: `src/pages/AIBattle.tsx`
- Modify: `src/pages/AIArena.tsx`

- [ ] **Step 1: 更新 AIBattle 中的 navigate 路由**

在 `src/pages/AIBattle.tsx` 中，搜索所有 `navigate('/debates')` 或 `navigate('/ai-arena` 调用，替换为新路由：

- `navigate('/debates')` → `navigate('/entertainment/arena')`
- `navigate('/ai-arena/` → `navigate('/entertainment/arena/ai-battle/`

- [ ] **Step 2: 更新 AIArena 中的 navigate 路由**

在 `src/pages/AIArena.tsx` 中，搜索所有旧路由 navigate 调用，替换为新路由：

- `navigate('/debates')` → `navigate('/entertainment/arena')`
- `navigate('/ai-battle` → `navigate('/entertainment/arena/human-battle`

- [ ] **Step 3: 更新 CricketForge 中的 navigate 路由**

在 `src/pages/CricketForge.tsx` 中，搜索旧路由：

- `navigate('/debates')` → `navigate('/entertainment/arena')`
- `navigate('/ai-arena/` → `navigate('/entertainment/arena/ai-battle/`

- [ ] **Step 4: 验证 tsc**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/AIBattle.tsx src/pages/AIArena.tsx src/pages/CricketForge.tsx
git commit -m "refactor: AI 竞技场页面路由引用更新"
```

---

## Task 21: 更新 DesktopSidebar 导航

**Files:**
- Modify: `src/components/DesktopSidebar.tsx`

- [ ] **Step 1: 检查并更新侧边栏娱乐相关导航项**

搜索 `DesktopSidebar.tsx` 中所有旧路由引用（`/debates`、`/judge`、`/round-table`、`/debate-lobby`、`/ai-battle`），替换为新路由：

- `/debates` → `/entertainment/arena`
- `/judge` → `/entertainment/judge`
- `/round-table` → `/entertainment/debate/round-table`
- `/debate-lobby` → `/entertainment/debate/lobby`
- `/ai-battle` → `/entertainment/arena/human-battle`

- [ ] **Step 2: 验证 tsc**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/DesktopSidebar.tsx
git commit -m "refactor(sidebar): 侧边栏娱乐导航路由更新"
```

---

## Task 22: 全局路由引用扫描

**Files:**
- All `src/**/*.tsx` and `src/**/*.ts` files

- [ ] **Step 1: 搜索所有旧路由字符串**

使用 Grep 搜索以下旧路由字符串，确认无遗漏：

```
/debates
/debate-lobby
/debate-room/
/ai-arena/
/ai-battle
/round-table
/judge
/cricket-forge
/debate/.*:.*title
```

排除 `src/router/routes.ts`（已处理）和 `src/entry/*`（已处理）。

- [ ] **Step 2: 修复所有遗漏的旧路由引用**

对每个搜索结果，替换为新路由。

- [ ] **Step 3: 验证 tsc**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: 全局旧路由引用清理"
```

---

## Task 23: 最终验收

**Files:**
- All files

- [ ] **Step 1: tsc 零错误**

Run: `npx tsc --noEmit`
Expected: PASS（零错误）

- [ ] **Step 2: 构建验证**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 3: 路由完整性检查**

在浏览器中验证以下路由可访问：
- `/entertainment` → 三张卡片
- `/entertainment/arena` → AI 竞技场大厅（名人擂台 + 自由对战）
- `/entertainment/arena/ai-battle/college` → AI 对战观战页
- `/entertainment/arena/human-battle` → 人机对战
- `/entertainment/arena/forge` → 角色工坊
- `/entertainment/debate` → 真人辩论厅大厅
- `/entertainment/debate/round-table` → 圆桌局
- `/entertainment/debate/lobby` → 4v4 房间大厅
- `/entertainment/debate/room/new` → 4v4 demo 房间
- `/entertainment/judge` → 判官台
- `/entertainment/judge/melon/mock-1` → 瓜田判官

- [ ] **Step 4: 旧路由重定向验证**

验证以下旧 URL 自动重定向：
- `/debates` → `/entertainment/arena`
- `/ai-battle` → `/entertainment/arena/human-battle`
- `/judge` → `/entertainment/judge`
- `/round-table` → `/entertainment/debate/round-table`

- [ ] **Step 5: 视觉约束检查**

- 确认桌面端布局未使用 `max-w-[480px]`
- 确认移动端底部有 `pb-[64px]` 或等价 padding
- 确认 `prefers-reduced-motion` 降级存在
- 确认 `focus-visible` 替代全局 focus 移除

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: 三馆制重构验收通过"
```

---

## 总结

| Phase | Task 范围 | 内容 |
|-------|----------|------|
| Phase 1 | Task 1-4 | 路由重构 + 占位页面 + tsc 通过 |
| Phase 2 | Task 5-8 | 娱乐大厅入口 + AI 竞技场 + 名人主题 |
| Phase 3 | Task 9-15 | 真人辩论厅 + 4v4 国赛 demo + 收藏 |
| Phase 4 | Task 16-19 | 路由更新 + 判官台 + 瓜田判官 |
| Phase 5 | Task 20-23 | 全局清理 + 验收 |
