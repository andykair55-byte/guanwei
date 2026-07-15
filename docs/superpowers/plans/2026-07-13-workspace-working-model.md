# 工作间 Working Model 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将工作间从功能堆叠的 AI 编辑器改造为以 Workspace 为核心对象的多 Agent 协同创作工作台，支持平台自定义、事件驱动 Activity Stream、Commander 追问机制、快照锁定等。

**Architecture:** 在现有 workspaceStore / activityStore / commanderStore / agentService 基础上扩展，不推翻已有代码。数据层先行，服务层跟进，UI 层最后。每个任务产出可独立验证的变更。

**Tech Stack:** React 19, Zustand 5, TypeScript 6, Tailwind 4, Vite 8, Vitest (待安装)

**Spec:** `docs/superpowers/specs/2026-07-13-workspace-working-model-design.md`

---

## File Structure

### Modify
| File | Responsibility |
|---|---|
| `src/types/workspace.ts` | Workspace 类型定义（扩展 status / isFavorite / source / tags / platformOrder） |
| `src/types/activity.ts` | Activity 事件类型（新增 agent_started / platform_complete） |
| `src/stores/workspaceStore.ts` | Workspace 状态管理（状态流转 / 硬删除 / 收藏 / 平台排序） |
| `src/stores/activityStore.ts` | 事件流管理（保留策略 / 清除） |
| `src/stores/snapshotStore.ts` | 快照管理（锁定 / 淘汰策略） |
| `src/stores/commanderStore.ts` | Commander 状态（追问卡片 / 模式切换） |
| `src/services/commanderService.ts` | Commander 逻辑（信息完整度 / 内容过滤） |
| `src/services/agentService.ts` | Agent 管线（超时 / 去重 / started 事件） |
| `src/services/platformAdapter.ts` | 平台适配（overridden 追踪） |
| `src/pages/AgentWorldPage.tsx` | 主页面（平台自定义 / 移动端 / 发布收口） |
| `src/components/workspace/WorkspaceSidebar.tsx` | 侧边栏（智能分组 / 平台管理） |
| `src/components/workspace/ActivityStream.tsx` | 活动流（降级横幅 / Agent 筛选） |
| `src/components/workspace/CommanderInput.tsx` | Commander 输入（追问卡片 / 模式切换） |
| `src/components/workspace/VersionBar.tsx` | 版本条（锁定 / 回退） |
| `src/config/platformTemplates.ts` | 平台模板（默认平台配置） |

### Create
| File | Responsibility |
|---|---|
| `src/services/contentFilter.ts` | 内容策略过滤（关键词黑名单） |
| `src/types/degradation.ts` | 降级状态类型定义 |

---

## Task 1: 安装 Vitest 并配置测试环境

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Modify: `tsconfig.app.json` (if needed)

- [ ] **Step 1: 安装 vitest 和测试库**

Run:
```bash
npm install -D vitest@^3 @testing-library/react@^16 @testing-library/jest-dom@^6 jsdom@^25 @testing-library/user-event@^14
```

- [ ] **Step 2: 创建 vitest 配置**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
```

- [ ] **Step 3: 添加 test 脚本到 package.json**

在 `package.json` 的 `scripts` 中添加:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: 验证测试环境**

Run:
```bash
npx vitest run src/test/example.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json vitest.config.ts
git commit -m "chore(test): 安装 vitest 并配置测试环境"
```

---

## Task 2: 扩展 Workspace 类型定义

**Files:**
- Modify: `src/types/workspace.ts`

**Spec reference:** §四 Workspace 模型

- [ ] **Step 1: 重写 workspace.ts 类型定义**

Replace entire content of `src/types/workspace.ts`:

```typescript
import type { CanonicalDraft } from './canonicalDraft'
import { createEmptyDraft } from './canonicalDraft'

export type WorkspaceStatus =
  | 'draft'
  | 'active'
  | 'completed'
  | 'published'
  | 'tracking'
  | 'archived'

export type WorkspaceTag = 'hotspot' | 'science' | 'meme' | 'opinion' | 'debunk' | string

export type WorkspaceSource =
  | { type: 'manual' }
  | { type: 'melon'; id: string }
  | { type: 'community'; id: string }
  | { type: 'template'; templateId: string }
  | { type: 'copy'; workspaceId: string }

export interface PlatformContent {
  title: string
  content: string
  generated: boolean
  overridden: boolean
  generatedAt?: string
  overriddenAt?: string
}

export interface Workspace {
  id: string
  title: string
  topic: string
  status: WorkspaceStatus
  isFavorite: boolean
  tags: WorkspaceTag[]
  source: WorkspaceSource
  platformOrder: string[]
  draft: CanonicalDraft
  platformContents: Record<string, PlatformContent>
  snapshots: WorkspaceSnapshot[]
  previousStatus?: WorkspaceStatus  // 归档前的状态，用于取消归档恢复
  createdAt: string
  updatedAt: string
}

export interface WorkspaceSnapshot {
  id: string
  draft: CanonicalDraft
  platformContents: Record<string, PlatformContent>
  description: string
  createdAt: string
  locked: boolean
}

const DEFAULT_PLATFORMS = ['guanwei', 'zhihu', 'xiaohongshu']

export function createEmptyWorkspace(
  topic: string = '',
  source: WorkspaceSource = { type: 'manual' },
  tags: WorkspaceTag[] = [],
  platformOrder: string[] = DEFAULT_PLATFORMS,
): Workspace {
  const now = new Date().toISOString()
  const platformContents: Record<string, PlatformContent> = {}
  for (const p of platformOrder) {
    platformContents[p] = { title: '', content: '', generated: false, overridden: false }
  }
  return {
    id: `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: topic || '新工作空间',
    topic,
    status: 'draft',
    isFavorite: false,
    tags,
    source,
    platformOrder,
    draft: createEmptyDraft(topic),
    platformContents,
    snapshots: [],
    createdAt: now,
    updatedAt: now,
  }
}

export const ALL_PLATFORMS = ['guanwei', 'zhihu', 'xiaohongshu', 'weibo', 'douyin', 'tieba'] as const
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors (or only errors from files referencing old types, which will be fixed in subsequent tasks)

- [ ] **Step 3: Commit**

```bash
git add src/types/workspace.ts
git commit -m "refactor(types): 扩展 Workspace 类型定义"
```

---

## Task 3: 扩展 workspaceStore 状态管理

**Files:**
- Modify: `src/stores/workspaceStore.ts`

**Spec reference:** §四.2 生命周期流转, §四.4 平台自定义

- [ ] **Step 1: 重写 workspaceStore**

Replace entire content of `src/stores/workspaceStore.ts`:

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Workspace, WorkspaceStatus, PlatformContent, WorkspaceSource, WorkspaceTag } from '../types/workspace'
import { createEmptyWorkspace, ALL_PLATFORMS } from '../types/workspace'
import type { CanonicalDraft } from '../types/canonicalDraft'

interface WorkspaceStore {
  workspaces: Workspace[]
  currentId: string | null

  createWorkspace: (params?: {
    topic?: string
    source?: WorkspaceSource
    tags?: WorkspaceTag[]
    platformOrder?: string[]
  }) => Workspace
  deleteWorkspace: (id: string) => void
  switchWorkspace: (id: string) => void
  renameWorkspace: (id: string, title: string) => void
  updateTopic: (id: string, topic: string) => void
  setStatus: (id: string, status: WorkspaceStatus) => void
  toggleFavorite: (id: string) => void
  archive: (id: string) => void
  unarchive: (id: string) => void

  addPlatform: (id: string, platform: string) => void
  removePlatform: (id: string, platform: string) => void
  reorderPlatforms: (id: string, newOrder: string[]) => void

  updateDraft: (partial: Partial<CanonicalDraft>) => void
  updatePlatformContent: (platform: string, content: Partial<PlatformContent>) => void

  getCurrent: () => Workspace | null
  getByStatus: (status: WorkspaceStatus) => Workspace[]
  getRecent: (limit?: number) => Workspace[]
  getFavorites: () => Workspace[]
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      workspaces: [],
      currentId: null,

      createWorkspace: (params = {}) => {
        const ws = createEmptyWorkspace(
          params.topic,
          params.source,
          params.tags,
          params.platformOrder,
        )
        set((state) => ({
          workspaces: [ws, ...state.workspaces],
          currentId: ws.id,
        }))
        return ws
      },

      deleteWorkspace: (id) => set((state) => {
        const remaining = state.workspaces.filter(w => w.id !== id)
        return {
          workspaces: remaining,
          currentId: state.currentId === id ? (remaining[0]?.id || null) : state.currentId,
        }
      }),

      switchWorkspace: (id) => set({ currentId: id }),

      renameWorkspace: (id, title) => set((state) => ({
        workspaces: state.workspaces.map(w =>
          w.id === id ? { ...w, title, updatedAt: new Date().toISOString() } : w
        ),
      })),

      updateTopic: (id, topic) => set((state) => ({
        workspaces: state.workspaces.map(w =>
          w.id === id
            ? { ...w, topic, title: w.title === '新工作空间' ? topic : w.title, status: w.status === 'draft' ? 'active' as WorkspaceStatus : w.status, updatedAt: new Date().toISOString() }
            : w
        ),
      })),

      setStatus: (id, status) => set((state) => ({
        workspaces: state.workspaces.map(w =>
          w.id === id
            ? { ...w, status, previousStatus: status === 'archived' ? w.status : w.previousStatus, updatedAt: new Date().toISOString() }
            : w
        ),
      })),

      toggleFavorite: (id) => set((state) => ({
        workspaces: state.workspaces.map(w =>
          w.id === id ? { ...w, isFavorite: !w.isFavorite, updatedAt: new Date().toISOString() } : w
        ),
      })),

      archive: (id) => set((state) => ({
        workspaces: state.workspaces.map(w =>
          w.id === id
            ? { ...w, previousStatus: w.status, status: 'archived' as WorkspaceStatus, updatedAt: new Date().toISOString() }
            : w
        ),
      })),

      unarchive: (id) => set((state) => ({
        workspaces: state.workspaces.map(w =>
          w.id === id
            ? { ...w, status: w.previousStatus || 'active', previousStatus: undefined, updatedAt: new Date().toISOString() }
            : w
        ),
      })),

      addPlatform: (id, platform) => set((state) => ({
        workspaces: state.workspaces.map(w =>
          w.id === id && !w.platformOrder.includes(platform)
            ? {
                ...w,
                platformOrder: [...w.platformOrder, platform],
                platformContents: {
                  ...w.platformContents,
                  [platform]: w.platformContents[platform] || { title: '', content: '', generated: false, overridden: false },
                },
                updatedAt: new Date().toISOString(),
              }
            : w
        ),
      })),

      removePlatform: (id, platform) => set((state) => ({
        workspaces: state.workspaces.map(w =>
          w.id === id
            ? { ...w, platformOrder: w.platformOrder.filter(p => p !== platform), updatedAt: new Date().toISOString() }
            : w
        ),
      })),

      reorderPlatforms: (id, newOrder) => set((state) => ({
        workspaces: state.workspaces.map(w =>
          w.id === id ? { ...w, platformOrder: newOrder, updatedAt: new Date().toISOString() } : w
        ),
      })),

      updateDraft: (partial) => set((state) => {
        if (!state.currentId) return state
        return {
          workspaces: state.workspaces.map(w =>
            w.id === state.currentId
              ? { ...w, draft: { ...w.draft, ...partial, metadata: { ...w.draft.metadata, ...(partial.metadata || {}), updatedAt: new Date().toISOString() } }, updatedAt: new Date().toISOString() }
              : w
          ),
        }
      }),

      updatePlatformContent: (platform, content) => set((state) => {
        if (!state.currentId) return state
        return {
          workspaces: state.workspaces.map(w =>
            w.id === state.currentId
              ? {
                  ...w,
                  platformContents: {
                    ...w.platformContents,
                    [platform]: {
                      ...w.platformContents[platform],
                      ...content,
                      overridden: content.content !== undefined ? true : (w.platformContents[platform]?.overridden || false),
                      overriddenAt: content.content !== undefined ? new Date().toISOString() : w.platformContents[platform]?.overriddenAt,
                      generatedAt: content.generated ? new Date().toISOString() : w.platformContents[platform]?.generatedAt,
                    },
                  },
                  updatedAt: new Date().toISOString(),
                }
              : w
          ),
        }
      }),

      getCurrent: () => {
        const { workspaces, currentId } = get()
        return workspaces.find(w => w.id === currentId) || null
      },

      getByStatus: (status) => get().workspaces.filter(w => w.status === status),

      getRecent: (limit = 10) => {
        return [...get().workspaces]
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, limit)
      },

      getFavorites: () => get().workspaces.filter(w => w.isFavorite),
    }),
    { name: 'guanwei-workspaces' }
  )
)
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run:
```bash
npx tsc --noEmit
```

Expected: Fewer errors than before (remaining errors from components that will be updated later)

- [ ] **Step 3: Commit**

```bash
git add src/stores/workspaceStore.ts
git commit -m "refactor(store): 扩展 workspaceStore 状态管理"
```

---

## Task 4: 扩展 Activity 事件类型

**Files:**
- Modify: `src/types/activity.ts`

**Spec reference:** §六 Activity Stream 事件模型

- [ ] **Step 1: 更新 EventType 枚举**

Replace `src/types/activity.ts`:

```typescript
export type EventType =
  | 'agent_started'
  | 'search_complete'
  | 'research_complete'
  | 'verify_warning'
  | 'writing_complete'
  | 'platform_complete'
  | 'commander_question'
  | 'commander_plan'
  | 'commander_welcome'
  | 'user_action'
  | 'error'
  | 'info'

export type AgentTypeLabel = 'orchestrator' | 'search' | 'research' | 'verify' | 'writing' | 'user' | 'system'

export interface EventAction {
  id: string
  label: string
  style?: 'primary' | 'secondary' | 'warning'
}

export interface ActivityEvent {
  id: string
  timestamp: number
  type: EventType
  agentType: AgentTypeLabel
  title: string
  content: string
  actions?: EventAction[]
  data?: Record<string, unknown>
}

export function createEvent(
  type: EventType,
  agentType: AgentTypeLabel,
  title: string,
  content: string,
  actions?: EventAction[],
  data?: Record<string, unknown>
): ActivityEvent {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    type,
    agentType,
    title,
    content,
    actions,
    data,
  }
}
```

- [ ] **Step 2: 验证编译**

Run:
```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/types/activity.ts
git commit -m "refactor(types): 扩展 Activity 事件类型"
```

---

## Task 5: 扩展 activityStore 事件保留策略

**Files:**
- Modify: `src/stores/activityStore.ts`

**Spec reference:** §六.6 事件保留策略

- [ ] **Step 1: 重写 activityStore**

Replace `src/stores/activityStore.ts`:

```typescript
import { create } from 'zustand'
import type { ActivityEvent, AgentTypeLabel, EventType, EventAction } from '../types/activity'
import { createEvent } from '../types/activity'

const MAX_EVENTS_PER_WORKSPACE = 200

interface ActivityStore {
  eventsByWorkspace: Record<string, ActivityEvent[]>
  filter: 'all' | AgentTypeLabel

  addEvent: (workspaceId: string, event: ActivityEvent) => void
  addEventSimple: (
    workspaceId: string,
    type: EventType,
    agentType: AgentTypeLabel,
    title: string,
    content: string,
    actions?: EventAction[],
    data?: Record<string, unknown>
  ) => ActivityEvent
  clearEvents: (workspaceId: string) => void
  setFilter: (filter: 'all' | AgentTypeLabel) => void
  getEvents: (workspaceId: string) => ActivityEvent[]
  getFilteredEvents: (workspaceId: string) => ActivityEvent[]
}

export const useActivityStore = create<ActivityStore>((set, get) => ({
  eventsByWorkspace: {},
  filter: 'all',

  addEvent: (workspaceId, event) => set((state) => {
    const current = state.eventsByWorkspace[workspaceId] || []
    let updated = [...current, event]
    // 超出上限淘汰最旧
    if (updated.length > MAX_EVENTS_PER_WORKSPACE) {
      updated = updated.slice(updated.length - MAX_EVENTS_PER_WORKSPACE)
    }
    return {
      eventsByWorkspace: {
        ...state.eventsByWorkspace,
        [workspaceId]: updated,
      },
    }
  }),

  addEventSimple: (workspaceId, type, agentType, title, content, actions, data) => {
    const event = createEvent(type, agentType, title, content, actions, data)
    get().addEvent(workspaceId, event)
    return event
  },

  clearEvents: (workspaceId) => set((state) => ({
    eventsByWorkspace: { ...state.eventsByWorkspace, [workspaceId]: [] },
  })),

  setFilter: (filter) => set({ filter }),

  getEvents: (workspaceId) => get().eventsByWorkspace[workspaceId] || [],

  getFilteredEvents: (workspaceId) => {
    const events = get().eventsByWorkspace[workspaceId] || []
    const filter = get().filter
    if (filter === 'all') return events
    return events.filter(e => e.agentType === filter)
  },
}))
```

- [ ] **Step 2: 验证编译**

Run:
```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/stores/activityStore.ts
git commit -m "refactor(store): activityStore 事件保留策略"
```

---

## Task 6: 扩展 snapshotStore 快照锁定

**Files:**
- Modify: `src/stores/snapshotStore.ts`

**Spec reference:** §十 版本与快照

- [ ] **Step 1: 重写 snapshotStore**

Replace `src/stores/snapshotStore.ts`:

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Snapshot {
  id: string
  timestamp: number
  label: string
  content: string
  draftTopic: string
  agentType?: string
  locked: boolean
}

const MAX_SNAPSHOTS = 50

interface SnapshotStore {
  snapshots: Snapshot[]
  currentSnapshotId: string | null

  createSnapshot: (params: {
    content: string
    draftTopic: string
    label: string
    agentType?: string
    locked?: boolean
  }) => void

  restoreSnapshot: (id: string) => Snapshot | null

  toggleLock: (id: string) => void

  listSnapshots: () => Snapshot[]

  clearAll: () => void

  canUndo: () => boolean

  undo: () => Snapshot | null
}

let snapshotIdCounter = 0

function evictSnapshots(snapshots: Snapshot[]): Snapshot[] {
  if (snapshots.length <= MAX_SNAPSHOTS) return snapshots
  // 只淘汰未锁定的最旧快照
  const unlocked = snapshots.filter(s => !s.locked)
  const locked = snapshots.filter(s => s.locked)
  const toRemove = unlocked.length - (MAX_SNAPSHOTS - locked.length)
  if (toRemove <= 0) return snapshots
  return [...unlocked.slice(toRemove), ...locked]
}

export const useSnapshotStore = create<SnapshotStore>()(
  persist(
    (set, get) => ({
      snapshots: [],
      currentSnapshotId: null,

      createSnapshot: ({ content, draftTopic, label, agentType, locked = false }) => {
        const snapshot: Snapshot = {
          id: `snap-${Date.now()}-${++snapshotIdCounter}`,
          timestamp: Date.now(),
          label,
          content,
          draftTopic,
          agentType,
          locked,
        }
        set((state) => {
          const newSnapshots = evictSnapshots([...state.snapshots, snapshot])
          return {
            snapshots: newSnapshots,
            currentSnapshotId: snapshot.id,
          }
        })
      },

      restoreSnapshot: (id) => {
        const snapshot = get().snapshots.find(s => s.id === id)
        if (!snapshot) return null

        const current = get().snapshots.find(s => s.id === get().currentSnapshotId)
        if (current && current.id !== id) {
          const restorePoint: Snapshot = {
            id: `snap-${Date.now()}-${++snapshotIdCounter}`,
            timestamp: Date.now(),
            label: '回退前的状态',
            content: current.content,
            draftTopic: current.draftTopic,
            locked: false,
          }
          set((state) => ({
            snapshots: evictSnapshots([...state.snapshots, restorePoint]),
            currentSnapshotId: id,
          }))
        } else {
          set({ currentSnapshotId: id })
        }

        return snapshot
      },

      toggleLock: (id) => set((state) => ({
        snapshots: state.snapshots.map(s =>
          s.id === id ? { ...s, locked: !s.locked } : s
        ),
      })),

      listSnapshots: () => get().snapshots,

      clearAll: () => set({ snapshots: [], currentSnapshotId: null }),

      canUndo: () => {
        const snaps = get().snapshots
        const currentIdx = snaps.findIndex(s => s.id === get().currentSnapshotId)
        return currentIdx > 0
      },

      undo: () => {
        const snaps = get().snapshots
        const currentIdx = snaps.findIndex(s => s.id === get().currentSnapshotId)
        if (currentIdx <= 0) return null

        const prevSnapshot = snaps[currentIdx - 1]
        set({ currentSnapshotId: prevSnapshot.id })
        return prevSnapshot
      },
    }),
    { name: 'guanwei-snapshots' }
  )
)
```

- [ ] **Step 2: 验证编译**

Run:
```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/stores/snapshotStore.ts
git commit -m "refactor(store): snapshotStore 快照锁定与淘汰策略"
```

---

## Task 7: 创建降级状态类型

**Files:**
- Create: `src/types/degradation.ts`

**Spec reference:** §十一.4 全局降级状态

- [ ] **Step 1: 创建 degradation 类型**

Create `src/types/degradation.ts`:

```typescript
export interface DegradationState {
  llm: boolean
  search: boolean
  message: string
}

export function createDefaultDegradation(): DegradationState {
  return {
    llm: false,
    search: false,
    message: '',
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/degradation.ts
git commit -m "feat(types): 降级状态类型定义"
```

---

## Task 8: 创建内容策略过滤服务

**Files:**
- Create: `src/services/contentFilter.ts`

**Spec reference:** §十二.1 内容策略过滤

- [ ] **Step 1: 创建 contentFilter 服务**

Create `src/services/contentFilter.ts`:

```typescript
// MVP: 关键词黑名单 + 敏感词检测
const BLOCKED_KEYWORDS = [
  '黄网', '色情', '赌博', '毒品', '枪支',
  '炸弹制作', '杀人方法', '自杀方法',
]

const SENSITIVE_PREFIXES = [
  'system:', 'ignore previous', '忘记之前的指令',
  '你现在是', '扮演', 'jailbreak',
]

export interface FilterResult {
  passed: boolean
  reason?: string
  matchedKeyword?: string
}

export function filterUserInput(input: string): FilterResult {
  const lower = input.toLowerCase()

  for (const kw of BLOCKED_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) {
      return { passed: false, reason: '内容包含违规关键词', matchedKeyword: kw }
    }
  }

  for (const prefix of SENSITIVE_PREFIXES) {
    if (lower.includes(prefix.toLowerCase())) {
      return { passed: false, reason: '检测到可能的 prompt 注入', matchedKeyword: prefix }
    }
  }

  return { passed: true }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/contentFilter.ts
git commit -m "feat(service): 内容策略过滤服务"
```

---

## Task 9: 扩展 commanderService 信息完整度判断

**Files:**
- Modify: `src/services/commanderService.ts`

**Spec reference:** §七 Commander 交互模型

- [ ] **Step 1: 添加信息完整度判断函数和追问卡片状态**

在 `src/services/commanderService.ts` 的 `TaskSpec` 接口之前添加：

```typescript
import { filterUserInput } from './contentFilter'

// ===== 信息完整度判断（MVP 简化版） =====

export interface CompletenessResult {
  isComplete: boolean
  missing: string[]
  question?: string
}

const PLATFORM_KEYWORDS: Record<string, string[]> = {
  zhihu: ['知乎', 'zhihu'],
  xiaohongshu: ['小红书', '红书', 'xiaohongshu'],
  weibo: ['微博', 'weibo'],
  douyin: ['抖音', 'douyin'],
  tieba: ['贴吧', 'tieba'],
  guanwei: ['观微', 'guanwei'],
}

export function checkCompleteness(input: string): CompletenessResult {
  const missing: string[] = []

  // 主题检查：少于 4 个字符视为模糊
  if (!input || input.trim().length < 4) {
    missing.push('topic')
  }

  // 平台检查
  const lower = input.toLowerCase()
  const hasPlatform = Object.values(PLATFORM_KEYWORDS).some(keywords =>
    keywords.some(kw => lower.includes(kw.toLowerCase()))
  )
  if (!hasPlatform) {
    missing.push('platform')
  }

  if (missing.length > 0) {
    const questions: string[] = []
    if (missing.includes('topic')) questions.push('你想写什么主题？')
    if (missing.includes('platform')) questions.push('目标发布在哪个平台？')
    return {
      isComplete: false,
      missing,
      question: questions.join(' '),
    }
  }

  return { isComplete: true, missing: [] }
}
```

- [ ] **Step 2: 在 handleUserInput 中集成内容过滤和完整度检查**

修改 `handleUserInput` 函数，在 `addEvent(workspaceId, 'user_action', ...)` 之后添加：

```typescript
export async function handleUserInput(workspaceId: string, input: string, mode: 'assist' | 'auto'): Promise<void> {
  // 内容策略过滤
  const filterResult = filterUserInput(input)
  if (!filterResult.passed) {
    addEvent(workspaceId, 'error', 'system', '内容被拦截', filterResult.reason || '输入内容不合规')
    return
  }

  addEvent(workspaceId, 'user_action', 'user', '你', input, undefined, { input })

  const current = useWorkspaceStore.getState().getCurrent()
  if (!current) return

  if (!current.topic) {
    useWorkspaceStore.getState().updateTopic(workspaceId, input)
  }

  switch (state.phase) {
    case 'idle':
      // 使用简化版完整度判断
      if (input.trim().length >= 4) {
        await parseGoal(workspaceId, input)
      } else {
        addEvent(workspaceId, 'commander_question', 'orchestrator', '需要更多信息', '你想写什么主题？请描述详细一些。')
        state.phase = 'collecting'
      }
      break
    case 'collecting':
      await processAnswer(workspaceId, input)
      break
    case 'awaiting_confirmation':
      if (input.includes('确认') || input.includes('开始') || input.includes('执行') || input === '好' || input === '是' || input === 'yes') {
        await executePlan(workspaceId, mode)
      } else {
        await parseGoal(workspaceId, input)
      }
      break
    case 'executing':
      addEvent(workspaceId, 'info', 'system', '指令已接收', '正在执行中，完成后会处理你的补充要求。')
      break
    case 'done':
      resetCommander()
      await parseGoal(workspaceId, input)
      break
  }
}
```

- [ ] **Step 3: 在 executePlan 中添加 agent_started 事件**

在 `executePlan` 函数的每个 Agent 执行之前添加 `agent_started` 事件。例如在搜索之前：

```typescript
// 在 "if (state.plan[state.currentStep]?.agent === 'search')" 块内，runOrchestrator 之前添加：
addEvent(workspaceId, 'agent_started', 'orchestrator', '指挥官启动', '正在分析主题，生成搜索策略...')
addEvent(workspaceId, 'agent_started', 'search', '搜索员启动', '正在搜集相关信息...')
```

- [ ] **Step 4: 验证编译**

Run:
```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/services/commanderService.ts
git commit -m "feat(service): Commander 信息完整度判断与内容过滤"
```

---

## Task 10: 扩展 agentService 超时与去重

**Files:**
- Modify: `src/services/agentService.ts`

**Spec reference:** §八.4 重跑策略, §八.5 Agent 超时

- [ ] **Step 1: 添加超时工具函数和去重机制**

在 `src/services/agentService.ts` 顶部（genId 函数之后）添加：

```typescript
// ===== 超时与去重 =====

const AGENT_TIMEOUT_MS = 30_000

function withTimeout<T>(promise: Promise<T>, agentType: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${agentType} Agent 执行超时（${AGENT_TIMEOUT_MS / 1000}s）`)), AGENT_TIMEOUT_MS)
    ),
  ])
}

// 去重：同一 Agent 同一 Workspace 只能有一个运行中任务
const runningAgents = new Map<string, AbortController>()

function startAgent(workspaceId: string, agentType: string): AbortController | null {
  const key = `${workspaceId}:${agentType}`
  const existing = runningAgents.get(key)
  if (existing) {
    existing.abort() // 取消旧任务
  }
  const controller = new AbortController()
  runningAgents.set(key, controller)
  return controller
}

function endAgent(workspaceId: string, agentType: string): void {
  const key = `${workspaceId}:${agentType}`
  runningAgents.delete(key)
}
```

- [ ] **Step 2: 在各 Agent 执行函数中集成超时**

修改 `runOrchestrator` 函数，将 `const response = await callLLM(...)` 改为：

```typescript
const response = await withTimeout(callLLM([...], { maxTokens: 500, temperature: 0.3 }), 'orchestrator')
```

对 `runResearchAgent`、`runVerifyAgent`、`runWritingAgent` 中的 `callLLM` 调用做同样修改。

- [ ] **Step 3: 在 runAutoPipeline 中添加去重**

修改 `runAutoPipeline` 函数，在 `startPipeline()` 之后添加：

```typescript
// 去重：如果已有管线在跑，先取消
// (通过 commanderStore 的 pipelineStatus 判断，已在 startPipeline 中处理)
```

并在管线完成后添加：

```typescript
// 管线完成后清理 runningAgents
runningAgents.clear()
```

- [ ] **Step 4: 验证编译**

Run:
```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/services/agentService.ts
git commit -m "feat(service): Agent 超时与去重机制"
```

---

## Task 11: 扩展 platformAdapter overridden 追踪

**Files:**
- Modify: `src/services/platformAdapter.ts`

**Spec reference:** §五.3 更新规则

- [ ] **Step 1: 在 adaptToPlatform 中返回 overridden 标记**

修改 `adaptToPlatform` 函数返回类型，在返回的 `PlatformContent` 中不需要改动，因为 `overridden` 由 `workspaceStore.updatePlatformContent` 管理。

但需要修改 `adaptToAllPlatforms` 使其只适配指定的平台：

```typescript
export async function adaptToAllPlatforms(
  draft: CanonicalDraft,
  platforms?: string[]
): Promise<PlatformContent[]> {
  const targetPlatforms = (platforms as PlatformId[]) || ['guanwei', 'douyin', 'weibo', 'zhihu', 'tieba', 'xiaohongshu']
  const results = await Promise.allSettled(
    targetPlatforms.map(p => adaptToPlatform(draft, p))
  )

  return results
    .filter((r): r is PromiseFulfilledResult<PlatformContent> => r.status === 'fulfilled')
    .map(r => r.value)
}
```

- [ ] **Step 2: 验证编译**

Run:
```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/services/platformAdapter.ts
git commit -m "refactor(service): platformAdapter 支持指定平台列表"
```

---

## Task 12: 更新 AgentWorldPage 平台自定义

**Files:**
- Modify: `src/pages/AgentWorldPage.tsx`

**Spec reference:** §四.4 平台自定义, §九 平台发布

- [ ] **Step 1: 修改平台 tab 渲染逻辑，使用 platformOrder**

在 `AgentWorldPage.tsx` 中，找到 `PLATFORM_IDS` 常量和平台 tab 渲染部分，改为从 current workspace 的 `platformOrder` 读取：

```typescript
// 替换 const PLATFORM_IDS: PlatformId[] = [...] 
// 替换为从 workspace 读取
const platformOrder = current?.platformOrder || ['guanwei']
const availablePlatforms = platformOrder as PlatformId[]
```

修改平台 tab 渲染：

```typescript
{availablePlatforms.filter(p => p !== 'guanwei').map(p => (
  <button key={p} ...>
    ...
  </button>
))}
```

- [ ] **Step 2: 添加平台添加按钮的下拉菜单**

替换现有的 "+" 按钮为一个简单的下拉菜单：

```typescript
const [showPlatformMenu, setShowPlatformMenu] = useState(false)

// 在平台 tab 栏的 + 按钮处：
<div className="relative">
  <button
    onClick={() => setShowPlatformMenu(!showPlatformMenu)}
    className="w-7 h-7 rounded-full border-2 border-dashed border-ink-200 flex items-center justify-center text-ink-300 hover:text-ink-500 hover:border-ink-300 shrink-0"
  >
    <Plus size={13} />
  </button>
  {showPlatformMenu && (
    <div className="absolute top-full left-0 mt-1 bg-paper-0 border border-ink-100 rounded-lg shadow-lg z-50 min-w-[120px]">
      {(['zhihu', 'xiaohongshu', 'weibo', 'douyin', 'tieba'] as PlatformId[])
        .filter(p => !platformOrder.includes(p))
        .map(p => (
          <button
            key={p}
            onClick={() => {
              if (currentId) {
                useWorkspaceStore.getState().addPlatform(currentId, p)
              }
              setShowPlatformMenu(false)
            }}
            className="w-full text-left px-3 py-1.5 text-[12px] text-ink-700 hover:bg-paper-50"
          >
            {PLATFORM_TEMPLATES[p].name}
          </button>
        ))}
    </div>
  )}
</div>
```

- [ ] **Step 3: 更新发布按钮区域，只显示已选平台**

```typescript
{availablePlatforms.map(p => (
  <button
    key={p}
    onClick={() => handlePublish(p)}
    ...
  >
    {PLATFORM_SHORT[p]}
  </button>
))}
```

- [ ] **Step 4: 在 handleEditorChange 中标记 overridden**

修改 `handleEditorChange`：

```typescript
const handleEditorChange = useCallback((content: string) => {
  if (!currentId) return
  // updatePlatformContent 已在 store 中自动标记 overridden
  updatePlatformContent(activePlatform, { content })
  setLastSaved(Date.now())
}, [currentId, activePlatform, updatePlatformContent])
```

- [ ] **Step 5: 添加发布确认状态收口**

在组件中添加发布确认状态：

```typescript
const [publishingPlatforms, setPublishingPlatforms] = useState<Set<string>>(new Set())

const handlePublish = useCallback(async (platform: PlatformId) => {
  const content = current?.platformContents?.[platform]?.content || ''
  if (content) {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  const url = PLATFORM_TEMPLATES[platform].publishUrl
  if (url && url.startsWith('http')) {
    window.open(url, '_blank')
  }
  // 标记为待确认发布
  setPublishingPlatforms(prev => new Set(prev).add(platform))
}, [current])

const confirmPublished = useCallback(() => {
  if (!currentId) return
  useWorkspaceStore.getState().setStatus(currentId, 'published')
  setPublishingPlatforms(new Set())
}, [currentId])
```

在渲染中添加发布确认按钮（当 `publishingPlatforms` 不为空时）：

```typescript
{publishingPlatforms.size > 0 && (
  <button
    onClick={confirmPublished}
    className="px-3 py-1 rounded-lg bg-emerald-500 text-white text-[12px] font-medium"
  >
    已完成发布 ({publishingPlatforms.size})
  </button>
)}
```

- [ ] **Step 6: 验证编译**

Run:
```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add src/pages/AgentWorldPage.tsx
git commit -m "feat(workspace): 平台自定义与发布状态收口"
```

---

## Task 13: 更新 ActivityStream 降级横幅

**Files:**
- Modify: `src/components/workspace/ActivityStream.tsx`

**Spec reference:** §十一.4 全局降级状态

- [ ] **Step 1: 读取当前 ActivityStream 组件**

Read `src/components/workspace/ActivityStream.tsx` to understand current structure.

- [ ] **Step 2: 添加降级横幅**

在 ActivityStream 组件的顶部（Agent 筛选标签上方）添加降级横幅：

```typescript
import { AlertTriangle } from 'lucide-react'
import { useActivityStore } from '../../stores/activityStore'

// 在组件渲染中，筛选标签上方：
const hasDegradedEvents = events.some(e => e.type === 'info' && e.content.includes('降级'))

{hasDegradedEvents && (
  <div className="px-3 py-2 bg-amber-50 border-b border-amber-200 flex items-center gap-2 text-[12px] text-amber-700">
    <AlertTriangle size={14} className="shrink-0" />
    <span>当前使用降级模式，结果可能受限</span>
  </div>
)}
```

- [ ] **Step 3: 验证编译**

Run:
```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/workspace/ActivityStream.tsx
git commit -m "feat(workspace): Activity Stream 降级横幅"
```

---

## Task 14: 更新 VersionBar 快照锁定

**Files:**
- Modify: `src/components/workspace/VersionBar.tsx`

**Spec reference:** §十.4 快照锁定

- [ ] **Step 1: 读取当前 VersionBar 组件**

Read `src/components/workspace/VersionBar.tsx`.

- [ ] **Step 2: 添加锁定按钮**

在 VersionBar 的每个快照节点上添加锁定/解锁按钮：

```typescript
import { Lock, Unlock } from 'lucide-react'
import { useSnapshotStore } from '../../stores/snapshotStore'

// 在每个快照节点渲染中添加：
<button
  onClick={(e) => {
    e.stopPropagation()
    useSnapshotStore.getState().toggleLock(snapshot.id)
  }}
  className="p-0.5 hover:bg-paper-100 rounded"
  title={snapshot.locked ? '解锁' : '锁定'}
>
  {snapshot.locked ? <Lock size={10} className="text-amber-500" /> : <Unlock size={10} className="text-ink-300" />}
</button>
```

- [ ] **Step 3: 验证编译**

Run:
```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/workspace/VersionBar.tsx
git commit -m "feat(workspace): VersionBar 快照锁定"
```

---

## Task 15: 更新 commanderStore 追问卡片状态

**Files:**
- Modify: `src/stores/commanderStore.ts`

**Spec reference:** §七.3 追问卡片状态

- [ ] **Step 1: 添加追问卡片状态到 commanderStore**

在 `commanderStore.ts` 的 `CommanderStore` 接口中添加：

```typescript
// 追问卡片状态
questionCards: QuestionCard[]
addQuestionCard: (card: QuestionCard) => void
answerQuestionCard: (id: string) => void
supersedeQuestionCard: (id: string) => void
clearQuestionCards: () => void
```

添加类型定义：

```typescript
export type QuestionCardStatus = 'pending' | 'answered' | 'superseded'

export interface QuestionCard {
  id: string
  question: string
  status: QuestionCardStatus
  createdAt: number
}
```

在 store 实现中添加：

```typescript
questionCards: [],

addQuestionCard: (card) => set((state) => ({
  questionCards: [...state.questionCards, card],
})),

answerQuestionCard: (id) => set((state) => ({
  questionCards: state.questionCards.map(c =>
    c.id === id ? { ...c, status: 'answered' as QuestionCardStatus } : c
  ),
})),

supersedeQuestionCard: (id) => set((state) => ({
  questionCards: state.questionCards.map(c =>
    c.id === id ? { ...c, status: 'superseded' as QuestionCardStatus } : c
  ),
})),

clearQuestionCards: () => set({ questionCards: [] }),
```

在 `resetPipeline` 中也清理追问卡片：

```typescript
resetPipeline: () => {
  set({
    pipelineStatus: 'idle',
    agents: createInitialAgents(),
    currentAgent: null,
    logs: [],
    questionCards: [],
  })
},
```

- [ ] **Step 2: 验证编译**

Run:
```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/stores/commanderStore.ts
git commit -m "feat(store): Commander 追问卡片状态管理"
```

---

## Task 16: 更新 WorkspaceSidebar 智能分组

**Files:**
- Modify: `src/components/workspace/WorkspaceSidebar.tsx`

**Spec reference:** §三 页面范式

- [ ] **Step 1: 读取当前 WorkspaceSidebar 组件**

Read `src/components/workspace/WorkspaceSidebar.tsx`.

- [ ] **Step 2: 按 status 分组展示**

修改 WorkspaceSidebar 的列表渲染，按状态分组：

```typescript
const workspaces = useWorkspaceStore(s => s.workspaces)
const currentId = useWorkspaceStore(s => s.currentId)

const groups = useMemo(() => {
  const active = workspaces.filter(w => w.status === 'active' || w.status === 'draft')
  const completed = workspaces.filter(w => w.status === 'completed' || w.status === 'published')
  const tracking = workspaces.filter(w => w.status === 'tracking')
  const favorites = workspaces.filter(w => w.isFavorite)
  const archived = workspaces.filter(w => w.status === 'archived')
  return { active, completed, tracking, favorites, archived }
}, [workspaces])
```

渲染时按分组展示，每组有标题和折叠功能。

- [ ] **Step 3: 验证编译**

Run:
```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/workspace/WorkspaceSidebar.tsx
git commit -m "feat(workspace): 侧边栏智能分组"
```

---

## Task 17: 添加首次用户引导

**Files:**
- Modify: `src/pages/AgentWorldPage.tsx`

**Spec reference:** §十三 首次用户引导

- [ ] **Step 1: 修改初始化逻辑**

在 `AgentWorldPage.tsx` 的 `useEffect` 初始化中，当 Workspace 列表为空时触发欢迎消息：

```typescript
useEffect(() => {
  if (initRef.current) return
  initRef.current = true

  const isDemo = searchParams.get('demo') === 'true'
  const titleParam = searchParams.get('title')
  const existingWorkspaces = useWorkspaceStore.getState().workspaces

  // 如果已有 Workspace，切换到最近的
  if (existingWorkspaces.length > 0 && !isDemo && !titleParam) {
    const recent = existingWorkspaces[0]
    switchWorkspace(recent.id)
    return
  }

  const topic = isDemo ? DEMO_TOPIC : (titleParam || '')
  const ws = createWorkspace(topic)
  switchWorkspace(ws.id)

  if (topic) {
    setCanonicalTopic(topic)
    setTimeout(() => {
      quickStart(ws.id, topic, mode)
    }, 300)
  } else {
    setTimeout(() => {
      sendWelcome(ws.id)
    }, 300)
  }

  resetCommander()
}, []) // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 2: 验证编译**

Run:
```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/AgentWorldPage.tsx
git commit -m "feat(workspace): 首次用户引导"
```

---

## Task 18: 集成平台默认配置

**Files:**
- Modify: `src/config/platformTemplates.ts`

**Spec reference:** §四.4 平台自定义

- [ ] **Step 1: 添加默认平台配置**

在 `platformTemplates.ts` 底部添加：

```typescript
// 默认选中的平台（新建 Workspace 时预填）
export const DEFAULT_PLATFORMS: PlatformId[] = ['guanwei', 'zhihu', 'xiaohongshu']

// 全局存储的默认平台 key
const DEFAULT_PLATFORMS_KEY = 'guanwei-default-platforms'

export function getDefaultPlatforms(): PlatformId[] {
  try {
    const stored = localStorage.getItem(DEFAULT_PLATFORMS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    // ignore
  }
  return DEFAULT_PLATFORMS
}

export function setDefaultPlatforms(platforms: PlatformId[]): void {
  localStorage.setItem(DEFAULT_PLATFORMS_KEY, JSON.stringify(platforms))
}
```

- [ ] **Step 2: 更新 createEmptyWorkspace 使用默认平台**

在 `src/types/workspace.ts` 中修改 `createEmptyWorkspace` 的 `platformOrder` 默认值：

```typescript
import { getDefaultPlatforms } from '../config/platformTemplates'

// 在 createEmptyWorkspace 函数中：
export function createEmptyWorkspace(
  topic: string = '',
  source: WorkspaceSource = { type: 'manual' },
  tags: WorkspaceTag[] = [],
  platformOrder?: string[],
): Workspace {
  const resolvedPlatformOrder = platformOrder || getDefaultPlatforms()
  // ... 其余不变
}
```

- [ ] **Step 3: 验证编译**

Run:
```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/config/platformTemplates.ts src/types/workspace.ts
git commit -m "feat(config): 平台默认配置"
```

---

## Task 19: 最终编译验证与 lint

- [ ] **Step 1: 完整 TypeScript 编译**

Run:
```bash
npx tsc --noEmit
```

Expected: 无错误

- [ ] **Step 2: Lint 检查**

Run:
```bash
npx oxlint
```

Expected: 无严重错误

- [ ] **Step 3: 运行测试**

Run:
```bash
npx vitest run
```

Expected: 所有测试通过

- [ ] **Step 4: 开发服务器启动验证**

Run:
```bash
npm run dev
```

手动验证：
1. 进入工作间页面，能看到三栏布局
2. 创建新 Workspace 时默认平台只有 3 个（观微/知乎/小红书）
3. 平台 tab 栏有 "+" 按钮可以添加更多平台
4. 删除平台后 tab 消失
5. Activity Stream 只显示当前 Workspace 的事件
6. Commander 输入框在底部
7. 快照有锁定按钮

- [ ] **Step 5: 最终 Commit**

```bash
git add -A
git commit -m "feat(workspace): 工作间 Working Model 完整实现"
```

---

## Spec Coverage Check

| Spec 章节 | 对应 Task |
|---|---|
| §一 核心定位 | 无需代码（设计原则已融入实现） |
| §二 设计原则 | 贯穿所有 Task |
| §三 页面范式 | Task 12, 16 |
| §四 Workspace 模型 | Task 2, 3, 18 |
| §五 主数据与派生数据 | Task 2, 11, 12 |
| §六 Activity Stream | Task 4, 5, 13 |
| §七 Commander 交互 | Task 9, 15 |
| §八 Agent 调度 | Task 10 |
| §九 平台发布 | Task 12 |
| §十 版本与快照 | Task 6, 14 |
| §十一 错误处理与降级 | Task 7, 13 |
| §十二 安全与成本 | Task 8, 9 |
| §十三 首次用户引导 | Task 17 |
| §十四 测试策略 | Task 1 + 各 Task 的验证步骤 |
| §十五 MVP 边界 | 全覆盖 |
