# Sprint 1 实现计划（Phase 1 Day 1-5）

> **执行方式：** subagent 逐任务执行，每个任务独立 commit。任务间无强依赖，可并行。
> **原则：** 前端界面重构，所有改动用 mock 可演示，不碰后端 API、不碰 LLM 调用逻辑。
> **来源：** `docs/plan/0.迭代开发计划.md` Phase 1 Sprint 1 + 各模块策划案 v3.0

**目标：** 瓜田/AI竞技场/用户体系 三个 P0 模块的 UI 改造完成，每个页面 mock 流程可走通。

**架构：** 在现有 Zustand store + React Router + Tailwind v4 基础上改造，新增组件放 `src/components/{module}/`，复用现有 `usePlatform`/`ErrorBoundary`/骨架屏体系。所有改动保留 mock fallback。

**技术栈：** React 19 + TypeScript 6 + Vite 8 + Tailwind v4 + Zustand 5 + react-router-dom 7 + lucide-react

---

## 全局约束（所有任务必须遵守）

- **测试策略**：项目无单元测试框架，每个任务用 `npx tsc --noEmit` + `npx oxlint` 验证，再手动验收
- **图片 URL**：统一用 `https://picsum.photos/seed/<id>/<w>/<h>`，禁用 pravatar/unsplash/dicebear
- **毛玻璃**：若使用 backdrop-blur，必须 `blur ≥20px` + `saturate ≥1.5`
- **响应式宽度**：详情页禁用 `max-w-[480px]` 硬编码，用响应式前缀（如 `md:max-w-2xl`）
- **移动端底部**：内容区底部留 `pb-[64px]` 防 TabBar 遮挡
- **可访问性**：禁用全局 `outline:none`，用 `focus-visible:` 替代；所有动画加 `motion-reduce:` 回退
- **文字对比度**：参考 Twitter/X 标准，正文 ≥14px，次要文字 ≥11px 且对比度足够
- **错误边界**：新组件无需自己包 ErrorBoundary（WebApp/MobileApp 入口已包）
- **懒加载**：新增页面组件在 `entry/WebApp.tsx` 和 `entry/MobileApp.tsx` 用 `lazy()` 注册
- **commit 规范**：`feat(<scope>): <desc>` / `fix(<scope>): <desc>`，scope 用模块名（melon/arena/user）

---

## 文件结构总览

```
src/
  pages/
    MelonFieldPage.tsx          [改] Day1-2 T1 加排序Tab
    MelonDetailPage.tsx         [改] Day1-2 T3 加"写分析"按钮
    AIBattle.tsx                [改] Day3-4 T7 加状态机可视化
    CricketForge.tsx            [改] Day3-4 T9 修复持久化
    ProfilePage.tsx             [改] Day5 T10 加创作统计
  components/
    EvidenceTimeline.tsx        [改] Day1-2 T2 节点状态色+展开收起
    EvidenceCard.tsx            [改] Day1-2 T4 AI辅助标签
    RefereeDice.tsx             [改] Day3-4 T8 揭晓动画增强
    PointsHistory.tsx           [改] Day5 T12 创作积分类型
    debate/
      BetPanel.tsx              [新] Day3-4 T5 下注面板
      DanmakuInput.tsx          [新] Day3-4 T6 弹幕输入防刷
  config/
    ranks.ts                    [确认] Day5 T11 无需改动
  types/
    index.ts                    [改] 各任务按需扩展类型
```

---

## Section A：瓜田系统改造（Day 1-2）

> 参考策划案：`瓜田系统策划案.md` v3.0 三、技术架构 3.1 / 四、内容供给 4.5 / 六、事件时间线 6.2

### T1：MelonFieldPage 排序 Tab（最新/最热）

**Files:**
- Modify: `src/pages/MelonFieldPage.tsx`
- 参考: `src/types/index.ts` 的 `Melon` 类型

**改造要点：**
- 在分类筛选 chip 行**上方**增加排序 Tab：`最新` | `最热`
- 最热用简化热度公式：`totalParticipants * 1 + evidenceCount * 5 + likeCount * 0.5`
- 最新按 `createdAt` 倒序
- 排序状态用 `useState<'latest' | 'hot'>`，默认 `hot`（与现状一致）
- `filteredMelons` 的 useMemo 增加排序依赖

**Steps:**

- [ ] **Step 1: 读取现状**
  读 `src/pages/MelonFieldPage.tsx` 全文（445行），定位 `filteredMelons` useMemo（约192行）和分类筛选栏（约227行）

- [ ] **Step 2: 增加排序状态和排序逻辑**
  在 `MelonFieldPage` 组件内 `selectedCategory` state 旁增加：
  ```tsx
  const [sortBy, setSortBy] = useState<'latest' | 'hot'>('hot')
  ```
  修改 `filteredMelons` useMemo，在 filter 后追加排序：
  ```tsx
  const filteredMelons = useMemo(() => {
    let list = selectedCategory === '全部'
      ? melons
      : melons.filter((m) => m.category === selectedCategory)
    if (sortBy === 'hot') {
      list = [...list].sort((a, b) =>
        (b.totalParticipants + b.evidenceCount * 5 + b.likeCount * 0.5)
        - (a.totalParticipants + a.evidenceCount * 5 + a.likeCount * 0.5)
      )
    } else {
      list = [...list].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    }
    return list
  }, [melons, selectedCategory, sortBy])
  ```

- [ ] **Step 3: 增加排序 Tab UI**
  在 `<header>` 内分类筛选 chip 行**之前**插入排序 Tab：
  ```tsx
  <div className="flex items-center gap-1 mb-2.5">
    {(['hot', 'latest'] as const).map((s) => {
      const active = sortBy === s
      return (
        <button
          key={s}
          onClick={() => setSortBy(s)}
          className={`px-3 py-1 text-[13px] font-medium transition-colors ${
            active ? 'text-seal' : 'text-ink-400 hover:text-ink-600'
          }`}
        >
          {s === 'hot' ? '最热' : '最新'}
          {active && <span className="block h-0.5 bg-seal rounded-full mt-1" />}
        </button>
      )
    })}
  </div>
  ```

- [ ] **Step 4: 类型检查 + lint**
  Run: `npx tsc --noEmit && npx oxlint`
  Expected: 无错误

- [ ] **Step 5: 手动验证 + commit**
  启动 `npm run dev`，访问 `/melon`，切换"最新/最热"Tab 验证排序变化
  ```bash
  git add src/pages/MelonFieldPage.tsx
  git commit -m "feat(melon): 瓜田列表增加最新/最热排序Tab"
  ```

**验收标准：**
- 瓜田列表顶部有"最热"/"最新"两个 Tab 可切换
- 切换"最新"按创建时间倒序，切换"最热"按热度公式排序
- mock 数据下排序可见

---

### T2：EvidenceTimeline 节点状态颜色 + 展开收起

**Files:**
- Modify: `src/components/EvidenceTimeline.tsx`（85行）
- Modify: `src/types/index.ts` 的 `EvidenceTimelineItem` 类型

**改造要点：**
- 节点状态三色：`confirmed`（绿 bamboo）/ `disputed`（黄 gold）/ `unverified`（灰 ink-300）
- `EvidenceTimelineItem` 增加 `status?: 'confirmed' | 'disputed' | 'unverified'` 字段，默认 `unverified`
- 节点超过 4 个时，默认只显示前 3 个，底部"展开查看全部 N 条"
- 展开收起用 `useState`，动画用 `transition-all`

**Steps:**

- [ ] **Step 1: 读取现状和类型**
  读 `src/components/EvidenceTimeline.tsx` 全文 + 读 `src/types/index.ts` 找 `EvidenceTimelineItem` 定义

- [ ] **Step 2: 扩展类型**
  在 `src/types/index.ts` 的 `EvidenceTimelineItem` 接口增加：
  ```ts
  status?: 'confirmed' | 'disputed' | 'unverified'
  ```

- [ ] **Step 3: 实现节点状态颜色**
  在 `EvidenceTimeline.tsx` 顶部增加状态色映射：
  ```tsx
  const statusConfig = {
    confirmed: { dot: 'bg-bamboo', border: 'border-bamboo', inner: 'bg-bamboo' },
    disputed: { dot: 'bg-gold', border: 'border-gold', inner: 'bg-gold' },
    unverified: { dot: 'bg-ink-300', border: 'border-ink-300', inner: 'bg-ink-300' },
  } as const
  ```
  修改时间线节点圆点（约60行），用 `statusConfig[item.status ?? 'unverified']` 替换原 `border-seal`/`bg-seal`：
  ```tsx
  const sc = statusConfig[item.status ?? 'unverified']
  // 节点外圈
  <div className={`absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full bg-surface border-2 ${sc.border} flex items-center justify-center`}>
    <div className={`w-1.5 h-1.5 rounded-full ${sc.inner}`} />
  </div>
  ```

- [ ] **Step 4: 实现展开收起**
  在 `EvidenceTimeline` 组件内增加状态：
  ```tsx
  const [expanded, setExpanded] = useState(false)
  const COLLAPSE_THRESHOLD = 4
  const visibleItems = expanded ? items : items.slice(0, 3)
  const hasMore = items.length > COLLAPSE_THRESHOLD
  ```
  将 `items.map(...)` 改为 `visibleItems.map(...)`，在列表底部追加：
  ```tsx
  {hasMore && (
    <button
      onClick={() => setExpanded(v => !v)}
      className="ml-7 mt-1 text-[11px] text-seal hover:text-seal/80 transition-colors"
    >
      {expanded ? '收起' : `展开查看全部 ${items.length} 条`}
    </button>
  )}
  ```

- [ ] **Step 5: 类型检查 + lint + commit**
  Run: `npx tsc --noEmit && npx oxlint`
  ```bash
  git add src/components/EvidenceTimeline.tsx src/types/index.ts
  git commit -m "feat(melon): 证据时间线增加状态色和展开收起"
  ```

**验收标准：**
- 时间线节点按 confirmed/disputed/unverified 显示绿/黄/灰
- 超过 4 个节点时默认折叠，底部有"展开查看全部 N 条"按钮

---

### T3：MelonDetailPage 增加"写分析"按钮

**Files:**
- Modify: `src/pages/MelonDetailPage.tsx`（692行）

**改造要点：**
- 在佐证列表顶部增加"写分析"按钮，点击跳转 `/create?melonId=xxx&title=xxx`
- `/create` 路由在 Sprint 2 Day 6-7 才创建，本任务按钮点击暂跳转空白页（用 `navigate('/create?...')`，路由不存在时会被 `*` 兜底到首页，可接受）
- 按钮样式：主色按钮，带 `PenLine` 图标

**Steps:**

- [ ] **Step 1: 读取现状**
  读 `src/pages/MelonDetailPage.tsx`，定位佐证列表区域的标题/容器（搜索"佐证"或"evidence"关键字）

- [ ] **Step 2: 增加"写分析"按钮**
  在佐证列表区域顶部标题旁增加按钮：
  ```tsx
  import { PenLine } from 'lucide-react'
  // 在佐证列表标题行
  <div className="flex items-center justify-between mb-3">
    <h3 className="text-[15px] font-semibold text-ink-900">佐证</h3>
    <button
      onClick={() => navigate(`/create?melonId=${melon.id}&title=${encodeURIComponent(melon.title)}`)}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-seal text-white text-[12px] font-medium hover:bg-seal/90 active:scale-95 transition-all"
    >
      <PenLine size={13} />
      写分析
    </button>
  </div>
  ```
  注：`navigate` 已在文件顶部从 react-router-dom 引入，若无则补 `import { useNavigate } from 'react-router-dom'` 并 `const navigate = useNavigate()`

- [ ] **Step 3: 类型检查 + lint + commit**
  Run: `npx tsc --noEmit && npx oxlint`
  ```bash
  git add src/pages/MelonDetailPage.tsx
  git commit -m "feat(melon): 瓜详情页佐证区增加写分析入口"
  ```

**验收标准：**
- 瓜详情页佐证列表顶部有"写分析"按钮
- 点击按钮跳转到 `/create?melonId=...`（当前路由不存在会兜底，Sprint 2 创建 CreatePage 后生效）

---

### T4：EvidenceCard AI 辅助来源标记

**Files:**
- Modify: `src/components/EvidenceCard.tsx`（120行）
- Modify: `src/types/index.ts` 的 `Evidence` 类型

**改造要点：**
- `Evidence` 类型增加 `aiAssisted?: boolean` 字段
- 当 `aiAssisted === true` 时，在用户昵称旁显示"AI辅助"小标签（紫色 `bg-purple-50 text-purple-600`）

**Steps:**

- [ ] **Step 1: 读取类型定义**
  读 `src/types/index.ts` 找 `Evidence` 接口

- [ ] **Step 2: 扩展类型**
  ```ts
  interface Evidence {
    // ...existing fields
    aiAssisted?: boolean
  }
  ```

- [ ] **Step 3: 增加 AI 辅助标签 UI**
  在 `EvidenceCard.tsx` 的方向标签（`真`/`假`）后面追加：
  ```tsx
  {evidence.aiAssisted && (
    <span className="px-1.5 py-0.5 text-[10px] rounded bg-purple-50 text-purple-600 font-medium">
      AI辅助
    </span>
  )}
  ```

- [ ] **Step 4: mock 数据补充**
  读 `src/services/mockData.ts`，给 2-3 条 mock 佐证加 `aiAssisted: true` 字段以验证显示

- [ ] **Step 5: 类型检查 + lint + commit**
  Run: `npx tsc --noEmit && npx oxlint`
  ```bash
  git add src/components/EvidenceCard.tsx src/types/index.ts src/services/mockData.ts
  git commit -m "feat(melon): 佐证卡片支持AI辅助来源标记"
  ```

**验收标准：**
- `aiAssisted: true` 的佐证显示紫色"AI辅助"标签
- 普通佐证不受影响

---

## Section B：AI竞技场增强（Day 3-4）

> 参考策划案：`AI竞技场策划案.md` v3.0 三、技术架构 3.1 / 四、核心功能 4.1/4.3 / 七、异常场景 7.1

### T5：BetPanel 下注面板组件（新增）

**Files:**
- Create: `src/components/debate/BetPanel.tsx`

**改造要点：**
- 选边下注（正方/反方）+ 固定赔率 1.8
- 每日上限 200 积分，L2（瓜田新手）以下不可下注
- 下注扣积分 → 辩论结束结算（赢则 +下注额×1.8，输则扣除已下注额）
- 积分读写通过 `useAuthStore`（或 `useUserStore`，执行时确认 store 名）

**Steps:**

- [ ] **Step 1: 读取现状**
  读 `src/stores/authStore.ts` 和 `src/stores/userStore.ts`，确认积分字段名（`points`）和扣减方法。读 `src/config/ranks.ts` 确认 L2 = `瓜田新手`（level 2）。读 `src/pages/AIBattle.tsx` 确认 BetPanel 挂载位置和正反方数据来源。

- [ ] **Step 2: 创建 BetPanel 组件**
  ```tsx
  // src/components/debate/BetPanel.tsx
  import { useState } from 'react'
  import { Coins, Lock } from 'lucide-react'
  import { useAuthStore } from '../../stores/authStore'
  import { RANK_CONFIG } from '../../config/ranks'

  interface BetPanelProps {
    affirmLabel: string
    negateLabel: string
    onBet: (side: 'affirm' | 'negate', amount: number) => void
    disabled?: boolean
  }

  const ODDS = 1.8
  const DAILY_LIMIT = 200

  export default function BetPanel({ affirmLabel, negateLabel, onBet, disabled }: BetPanelProps) {
    const { user } = useAuthStore()
    const [side, setSide] = useState<'affirm' | 'negate' | null>(null)
    const [amount, setAmount] = useState(10)
    const [betted, setBetted] = useState<'affirm' | 'negate' | null>(null)

    const userLevel = user ? RANK_CONFIG[user.rank].level : 0
    const canBet = userLevel >= 2
    const todayBet = Number(localStorage.getItem(`bet-today-${user?.id}`) || 0)
    const remaining = Math.min(DAILY_LIMIT - todayBet, user?.points ?? 0)

    const handleConfirm = () => {
      if (!side || amount <= 0 || amount > remaining) return
      onBet(side, amount)
      setBetted(side)
      localStorage.setItem(`bet-today-${user?.id}`, String(todayBet + amount))
    }

    if (!canBet) {
      return (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-ink-50 text-ink-400 text-[12px]">
          <Lock size={14} />
          达到「瓜田新手」段位后可参与下注
        </div>
      )
    }

    if (betted) {
      return (
        <div className="px-4 py-3 rounded-xl bg-seal/8 text-seal text-[12px] font-medium">
          已下注 {betted === 'affirm' ? affirmLabel : negateLabel} · {amount} 积分 · 赔率 {ODDS}
        </div>
      )
    }

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {([
            { key: 'affirm', label: affirmLabel, color: 'bamboo' },
            { key: 'negate', label: negateLabel, color: 'seal' },
          ] as const).map(opt => (
            <button
              key={opt.key}
              disabled={disabled}
              onClick={() => setSide(opt.key)}
              className={`px-3 py-2.5 rounded-xl text-[12px] font-medium transition-all active:scale-95 disabled:opacity-50 ${
                side === opt.key
                  ? opt.color === 'bamboo' ? 'bg-bamboo text-white' : 'bg-seal text-white'
                  : 'bg-ink-50 text-ink-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Coins size={14} className="text-gold" />
          <input
            type="range" min={10} max={Math.min(remaining, 200)} step={10}
            value={amount}
            onChange={e => setAmount(Number(e.target.value))}
            disabled={disabled}
            className="flex-1 accent-seal"
          />
          <span className="text-[13px] font-bold text-ink-900 w-12 text-right">{amount}</span>
        </div>

        <button
          onClick={handleConfirm}
          disabled={!side || disabled || amount > remaining}
          className="w-full py-2.5 rounded-xl bg-seal text-white text-[13px] font-semibold disabled:opacity-40 active:scale-95 transition-all"
        >
          确认下注 · 赔率 {ODDS} · 可赢 +{Math.round(amount * ODDS)}
        </button>

        <p className="text-[10px] text-ink-400 text-center">今日剩余额度 {remaining} / {DAILY_LIMIT}</p>
      </div>
    )
  }
  ```

- [ ] **Step 3: 在 AIBattle.tsx 挂载 BetPanel**
  读 `src/pages/AIBattle.tsx`，在对战详情页合适位置（建议裁判区附近）挂载 `<BetPanel>`，传入正反方 label 和 `onBet` 回调（回调内调 store 扣积分）

- [ ] **Step 4: 类型检查 + lint + commit**
  Run: `npx tsc --noEmit && npx oxlint`
  ```bash
  git add src/components/debate/BetPanel.tsx src/pages/AIBattle.tsx
  git commit -m "feat(arena): 新增下注面板组件BetPanel"
  ```

**验收标准：**
- 对战页有下注面板，可选正反方
- L2 以下用户看到锁定提示
- 下注后积分扣除，显示已下注状态
- 每日额度 200，超限不可下注

---

### T6：DanmakuInput 弹幕输入组件（带防刷）

**Files:**
- Create: `src/components/debate/DanmakuInput.tsx`

**改造要点：**
- 5 条/分钟限流 + 3 秒最小间隔 + 60 秒重复检测
- 防刷规则：3 秒内连续点击提示"发送过快"；60 秒内重复内容提示"请勿刷屏"；超 5 条/分钟提示"休息一下吧"
- 发送记录存 localStorage（`danmaku-history-${userId}`），含时间戳和内容

**Steps:**

- [ ] **Step 1: 读取现状**
  读 `src/components/DanmakuOverlay.tsx` 和 `src/services/danmakuService.ts`，确认现有弹幕数据结构和发送流程

- [ ] **Step 2: 创建 DanmakuInput 组件**
  ```tsx
  // src/components/debate/DanmakuInput.tsx
  import { useState, useRef } from 'react'
  import { Send } from 'lucide-react'
  import { useAuthStore } from '../../stores/authStore'

  interface HistoryItem { ts: number; content: string }

  const MIN_INTERVAL = 3000
  const MAX_PER_MIN = 5
  const DUP_WINDOW = 60000

  export default function DanmakuInput({ onSend }: { onSend: (text: string) => void }) {
    const { user } = useAuthStore()
    const [text, setText] = useState('')
    const [tip, setTip] = useState('')
    const tipTimer = useRef<number | null>(null)

    const getHistory = (): HistoryItem[] => {
      const k = `danmaku-history-${user?.id ?? 'anon'}`
      return JSON.parse(localStorage.getItem(k) || '[]')
    }
    const pushHistory = (content: string) => {
      const k = `danmaku-history-${user?.id ?? 'anon'}`
      const list = getHistory()
      list.push({ ts: Date.now(), content })
      // 只保留最近 60 秒
      const recent = list.filter(i => Date.now() - i.ts < DUP_WINDOW)
      localStorage.setItem(k, JSON.stringify(recent))
    }

    const showTip = (msg: string) => {
      setTip(msg)
      if (tipTimer.current) window.clearTimeout(tipTimer.current)
      tipTimer.current = window.setTimeout(() => setTip(''), 2000)
    }

    const handleSend = () => {
      const content = text.trim()
      if (!content) return

      const now = Date.now()
      const history = getHistory()

      // 3 秒间隔
      if (history.length > 0 && now - history[history.length - 1].ts < MIN_INTERVAL) {
        showTip('发送过快，请稍候')
        return
      }
      // 60 秒重复
      if (history.some(i => i.content === content && now - i.ts < DUP_WINDOW)) {
        showTip('请勿刷屏，60秒内不可重复')
        return
      }
      // 每分钟 5 条
      const lastMin = history.filter(i => now - i.ts < 60000)
      if (lastMin.length >= MAX_PER_MIN) {
        showTip('本分钟发送已达上限，休息一下吧')
        return
      }

      onSend(content)
      pushHistory(content)
      setText('')
    }

    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-white/80 backdrop-blur rounded-full">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder={tip || '发条弹幕…'}
          maxLength={30}
          className="flex-1 bg-transparent text-[13px] text-ink-800 placeholder:text-ink-400 outline-none"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="w-7 h-7 rounded-full bg-seal text-white flex items-center justify-center disabled:opacity-40 active:scale-90 transition-transform"
        >
          <Send size={13} />
        </button>
      </div>
    )
  }
  ```

- [ ] **Step 3: 在 AIBattle.tsx 挂载 DanmakuInput**
  读 `src/pages/AIBattle.tsx`，在弹幕显示区下方挂载 `<DanmakuInput onSend={...} />`，`onSend` 回调调 danmakuService 发送

- [ ] **Step 4: 类型检查 + lint + commit**
  Run: `npx tsc --noEmit && npx oxlint`
  ```bash
  git add src/components/debate/DanmakuInput.tsx src/pages/AIBattle.tsx
  git commit -m "feat(arena): 新增弹幕输入组件带防刷限流"
  ```

**验收标准：**
- 弹幕可发送，显示在辩论页
- 3 秒内连发提示"发送过快"
- 60 秒内重复内容提示"请勿刷屏"
- 每分钟超 5 条提示"已达上限"

---

### T7：AIBattle 对战状态机可视化

**Files:**
- Modify: `src/pages/AIBattle.tsx`（741行）

**改造要点：**
- 增加状态条：`匹配` → `准备` → `辩论中` → `裁判评分` → `结算` → `完成`
- 状态来源于现有 debateStore（执行时确认状态枚举名）
- 当前状态高亮，已完成状态打勾，未到状态置灰
- 用横向步骤条，移动端可横向滚动

**Steps:**

- [ ] **Step 1: 读取现状**
  读 `src/pages/AIBattle.tsx` 和 `src/stores/debateStore.ts`，确认对战状态枚举和当前状态字段名

- [ ] **Step 2: 增加状态条组件**
  在 `AIBattle.tsx` 顶部增加内联状态条（或抽为独立组件 `PhaseIndicator` 若已存在则复用，执行时判断）：
  ```tsx
  const PHASES = ['匹配', '准备', '辩论中', '裁判评分', '结算', '完成'] as const
  // 假设当前状态为 currentPhase（从 store 取）
  const currentIndex = PHASES.indexOf(currentPhase)

  <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
    {PHASES.map((p, i) => {
      const done = i < currentIndex
      const active = i === currentIndex
      return (
        <div key={p} className="flex items-center gap-1 shrink-0">
          {i > 0 && <div className={`w-4 h-px ${done ? 'bg-seal' : 'bg-ink-200'}`} />}
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] ${
            active ? 'bg-seal text-white font-medium' : done ? 'text-seal' : 'text-ink-300'
          }`}>
            {done && <Check size={11} />}
            {p}
          </div>
        </div>
      )
    })}
  </div>
  ```
  注：`Check` 图标从 lucide-react 引入；`currentPhase` 按实际 store 字段映射到 PHASES

- [ ] **Step 3: 类型检查 + lint + commit**
  Run: `npx tsc --noEmit && npx oxlint`
  ```bash
  git add src/pages/AIBattle.tsx
  git commit -m "feat(arena): 对战页增加状态机可视化步骤条"
  ```

**验收标准：**
- 对战页顶部有 6 阶段状态条
- 当前阶段高亮，已完成阶段打勾，未到阶段置灰

---

### T8：RefereeDice 裁判揭晓动画增强

**Files:**
- Modify: `src/components/RefereeDice.tsx`（199行）

**改造要点：**
- 骰子滚动（2 秒）→ 定格（0.3 秒）→ 裁判入场白逐字打出
- 逐字打字效果用 `setInterval` 每 50ms 推进一个字符
- 动画全程加 `motion-reduce:transition-none` 回退

**Steps:**

- [ ] **Step 1: 读取现状**
  读 `src/components/RefereeDice.tsx` 全文，确认现有骰子动画结构和揭晓时机

- [ ] **Step 2: 增加逐字打字效果**
  在揭晓阶段增加 typewriter 效果：
  ```tsx
  const [revealedText, setRevealedText] = useState('')
  const fullText = '本场辩论已结束，裁判正在给出评判…'

  useEffect(() => {
    if (phase !== 'revealing') return
    let i = 0
    const timer = setInterval(() => {
      i++
      setRevealedText(fullText.slice(0, i))
      if (i >= fullText.length) clearInterval(timer)
    }, 50)
    return () => clearInterval(timer)
  }, [phase])

  // 渲染
  <p className="text-[13px] text-ink-700 font-serif">
    {revealedText}
    {revealedText.length < fullText.length && <span className="animate-pulse">▌</span>}
  </p>
  ```

- [ ] **Step 3: 骰子定格过渡**
  确认骰子滚动动画结束后有 0.3 秒定格（用 `setTimeout` 或 CSS animation-delay），再进入打字阶段

- [ ] **Step 4: 类型检查 + lint + commit**
  Run: `npx tsc --noEmit && npx oxlint`
  ```bash
  git add src/components/RefereeDice.tsx
  git commit -m "feat(arena): 裁判揭晓动画增加逐字打字效果"
  ```

**验收标准：**
- 骰子滚动 2 秒后定格
- 定格后裁判入场白逐字打出（约 3 秒打完）
- 开启系统"减少动态效果"时动画跳过

---

### T9：CricketForge 持久化修复

**Files:**
- Modify: `src/pages/CricketForge.tsx`（384行）

**改造要点：**
- 修复 TODO：自定义蛐蛐存入 localStorage，导航到对战页
- 存储结构：`cricket-forges` 数组，每项含 `{ id, name, prompt, avatar, createdAt }`
- 保存成功后 `navigate('/ai-battle?forgeId=xxx')`

**Steps:**

- [ ] **Step 1: 定位 TODO**
  读 `src/pages/CricketForge.tsx`，搜索 `TODO` / `localStorage` / `保存` 关键字，定位未完成的持久化逻辑

- [ ] **Step 2: 实现保存逻辑**
  ```tsx
  const STORAGE_KEY = 'cricket-forges'

  const handleSave = () => {
    const forge = { id: crypto.randomUUID(), name, prompt, avatar, createdAt: Date.now() }
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    list.push(forge)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
    navigate(`/ai-battle?forgeId=${forge.id}`)
  }
  ```

- [ ] **Step 3: 读取已存蛐蛐列表（可选）**
  若 CricketForge 有"我的蛐蛐"列表区，从 localStorage 读取并展示；若无则跳过

- [ ] **Step 4: 类型检查 + lint + commit**
  Run: `npx tsc --noEmit && npx oxlint`
  ```bash
  git add src/pages/CricketForge.tsx
  git commit -m "fix(arena): 修复自定义蛐蛐持久化和跳转对战页"
  ```

**验收标准：**
- 自定义蛐蛐可保存到 localStorage
- 保存后自动跳转到对战页

---

## Section C：用户体系简化（Day 5）

> 参考策划案：`用户体系策划案.md` v3.0 五、积分经济 5.1 / 七、个人主页 7.1

### T10：ProfilePage 增加创作统计行

**Files:**
- Modify: `src/pages/ProfilePage.tsx`（180行）
- Modify: `src/types/index.ts` 的 `User` 类型
- Modify: `src/stores/authStore.ts`（按需）

**改造要点：**
- 数据统计区从 3 列改为 4 列：积分 / 参与次数 / 准确率 / 发布分析数
- `User` 类型增加 `publishedCount?: number` 字段，默认 0
- mock 用户数据补 `publishedCount: 3`

**Steps:**

- [ ] **Step 1: 读取类型和 store**
  读 `src/types/index.ts` 找 `User` 接口；读 `src/stores/authStore.ts` 确认 user 来源和 mock 数据

- [ ] **Step 2: 扩展类型 + mock 数据**
  ```ts
  // types/index.ts User 接口
  publishedCount?: number
  ```
  authStore mock user 补 `publishedCount: 3`

- [ ] **Step 3: 改造统计区**
  读 `src/pages/ProfilePage.tsx` 第 89-106 行（3 列统计区），改为 4 列：
  ```tsx
  <div className="px-5 grid grid-cols-4 gap-2 mb-3">
    {[
      { value: user.points, label: '积分', color: 'text-seal' },
      { value: user.totalGuesses, label: '参与', color: 'text-ink-900' },
      {
        value: user.totalGuesses > 0
          ? `${Math.round((user.correctGuesses / user.totalGuesses) * 100)}%`
          : '0%',
        label: '准确率', color: 'text-bamboo',
      },
      { value: user.publishedCount ?? 0, label: '分析', color: 'text-purple-600' },
    ].map(stat => (
      <div key={stat.label} className="bg-surface rounded-xl shadow-card p-3 text-center">
        <div className={`text-[18px] font-bold ${stat.color}`}>{stat.value}</div>
        <div className="text-[10px] text-ink-400 mt-1">{stat.label}</div>
      </div>
    ))}
  </div>
  ```

- [ ] **Step 4: 类型检查 + lint + commit**
  Run: `npx tsc --noEmit && npx oxlint`
  ```bash
  git add src/pages/ProfilePage.tsx src/types/index.ts src/stores/authStore.ts
  git commit -m "feat(user): 个人主页增加发布分析统计"
  ```

**验收标准：**
- 个人主页统计区显示 4 列
- "分析"列显示发布数（mock 为 3）

---

### T11：段位配置前后端对齐（确认无需改动）

**Files:**
- Confirm: `src/config/ranks.ts`

**改造要点：**
- 策划案明确"前端配置为基准（已确认，无需改动）"
- 本任务仅核对：7 段位 / level / minCorrect / minAccuracy / minTotal 与策划案一致

**Steps:**

- [ ] **Step 1: 核对配置**
  读 `src/config/ranks.ts` 与 `用户体系策划案.md` 四、段位系统 4.4 节比对

- [ ] **Step 2: 记录核对结果**
  若一致则无 commit；若不一致则修正并 commit `fix(user): 段位配置与策划案对齐`

**验收标准：**
- 7 段位配置与策划案 4.4 节一致

---

### T12：PointsHistory 创作积分类型展示

**Files:**
- Modify: `src/components/PointsHistory.tsx`
- Modify: `src/types/index.ts` 的积分记录类型（按需）

**改造要点：**
- 积分明细支持显示"AI辅助创作"类型
- 积分记录类型枚举增加 `'creation'`，展示时用紫色徽章 + `PenLine` 图标
- mock 积分记录补 1-2 条 creation 类型

**Steps:**

- [ ] **Step 1: 读取现状**
  读 `src/components/PointsHistory.tsx` 全文，确认积分记录类型字段和展示逻辑

- [ ] **Step 2: 增加创作类型展示**
  在类型映射表增加：
  ```tsx
  const typeConfig = {
    guess: { label: '猜瓜', color: 'bg-seal/10 text-seal' },
    evidence: { label: '佐证', color: 'bg-bamboo/10 text-bamboo' },
    creation: { label: 'AI辅助创作', color: 'bg-purple-50 text-purple-600' },
    // ...existing types
  }
  ```
  渲染时按 `record.type` 取对应配置

- [ ] **Step 3: 补充 mock 数据**
  在 mock 积分记录中增加 1-2 条 `type: 'creation', amount: 5` 的记录

- [ ] **Step 4: 类型检查 + lint + commit**
  Run: `npx tsc --noEmit && npx oxlint`
  ```bash
  git add src/components/PointsHistory.tsx src/types/index.ts src/services/mockData.ts
  git commit -m "feat(user): 积分明细支持AI辅助创作类型"
  ```

**验收标准：**
- 积分明细中创作类型记录显示紫色"AI辅助创作"标签
- 普通积分记录不受影响

---

## Sprint 1 退出标准（Day 5 末尾验证）

- [ ] **类型检查全通过**：`npx tsc --noEmit` 无错误
- [ ] **Lint 全通过**：`npx oxlint` 无错误
- [ ] **构建成功**：`npm run build` 无错误
- [ ] **PC 端走查**：访问以下路由，mock 流程可走通
  - `/melon` — 排序 Tab 切换、卡片点击进详情
  - `/melon/:id` — 佐证列表、"写分析"按钮、时间线展开收起
  - `/ai-battle` — 状态条、下注面板、弹幕输入、裁判动画
  - `/cricket-forge` — 自定义蛐蛐保存+跳转
  - `/profile` — 4 列统计、积分明细含创作类型
- [ ] **移动端走查**：`?platform=mobile` 访问上述页面，底部不被 TabBar 遮挡
- [ ] **commit 历史清晰**：12 个任务对应 12+ commit，message 符合规范
- [ ] **构建体积**：`npm run build` 后 gzip 体积 < 300KB（用 `vite build --report` 或检查 dist）

---

## 依赖与并行策略

```
T1(瓜田排序) ──┐
T2(时间线)    ──┼── 互不依赖，可并行
T3(写分析按钮)──┤
T4(AI辅助标记)──┘

T5(BetPanel)    ──┐
T6(DanmakuInput)──┼── 互不依赖，可并行；T5/T6 完成后 T7 可挂载
T9(CricketForge)──┤
T8(裁判动画)    ──┘
T7(状态机)      ── 依赖 AIBattle 现状，T5/T6 挂载点确认后做

T10(创作统计) ──┐
T11(段位核对) ──┼── 互不依赖，可并行
T12(积分类型) ──┘
```

**推荐执行顺序**：T1→T2→T3→T4（瓜田模块先完成）→ T9→T8→T5→T6→T7（竞技场）→ T10→T11→T12（用户体系）。或 subagent 并行：3 个 subagent 分别负责 A/B/C 三个 Section。

---

> 计划完成。执行时每个 subagent 只需读本任务块 + 任务涉及的现有文件，无需读全 plan。
