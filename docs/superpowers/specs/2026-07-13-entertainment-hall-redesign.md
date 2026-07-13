# 娱乐大厅三馆制重构设计

> 版本：v1.0  
> 状态：待实施  
> 日期：2026-07-13  
> 范围：前端路由、页面结构、玩法归属

---

## 一、设计目标

解决当前娱乐大厅入口混乱、玩法重叠的问题：

1. **收敛“观点对抗”类玩法**：AI 斗蛐蛐、人机对战、圆桌局、真人辩论本质都是辩论对抗，按“用户姿态”重新分馆。
2. **突出 AI 斗蛐蛐传播点**：用“名人主题对战”做内容包装，把 AI 斗蛐蛐从“两个 AI 吵架”升级为“诸葛亮 vs 王朗”等文化 IP 对抗。
3. **把判官模式做成可扩展的争议判定中心**：不仅限于纠纷案件，还包括瓜田真假站队、未来职场/情感判官等。
4. **统一路由结构**：所有娱乐玩法收归 `/entertainment/*`，旧路由做重定向。

---

## 二、总体架构：三馆制

```
娱乐大厅 /entertainment
├── AI 竞技场 /entertainment/arena        # 和 AI 对抗的一切
├── 真人辩论厅 /entertainment/debate      # 真人为主的多人对抗
└── 判官台 /entertainment/judge           # 争议判定 / 站队
```

| 入口 | 用户姿态 | 核心玩法 | 是否进入娱乐大厅 |
|------|---------|---------|----------------|
| AI 竞技场 | 看 AI 打 / 和 AI 打 | AI 斗蛐蛐、人机对战、角色工坊 | 是 |
| 真人辩论厅 | 真人对抗 | 圆桌局、4v4 全真人辩论 | 是 |
| 判官台 | 当裁判 / 站队 | 我是判官、瓜田判官 | 是 |

---

## 三、AI 竞技场 /entertainment/arena

### 3.1 定位

所有“用户 vs AI”或“AI vs AI”的对抗玩法。强调零门槛围观和低门槛参战。

### 3.2 子玩法

| 子玩法 | 说明 | 路由 |
|--------|------|------|
| AI 斗蛐蛐 | AI vs AI 自动对战，支持名人主题包、弹幕、下注 | `/entertainment/arena/ai-battle/:topicId` |
| 人机对战 | 用户 vs AI，单人参战 | `/entertainment/arena/human-battle` |
| 角色工坊 | 自定义 prompt、AI 润色、保存角色 | `/entertainment/arena/forge` |

### 3.3 名人主题对战

把 AI 斗蛐蛐从通用角色对抗升级为文化 IP 对抗。

**首批主题包：**

| 主题 | 正方 | 反方 | 辩题示例 |
|------|------|------|---------|
| 舌战群儒 | 诸葛亮 | 王朗 | “匡扶汉室是否仍有可能？” |
| 儒法之争 | 孟子 | 荀子 | “人性本善还是本恶？” |
| 赤壁之谋 | 诸葛亮 | 周瑜 | “赤壁之战，联吴是否必要？” |
| 古今之辩 | 鲁迅 | 胡适 | “传统文化应该全盘否定吗？” |

**实现方式：**
- 每个名人是一个预设 AI 角色，prompt 包含人物背景、语言风格、立场倾向。
- 主题包以“角色对”形式配置在 `characters.ts` 或独立的 `themePacks.ts`。
- 用户在 AI 竞技场大厅选择“名人擂台”后，直接进入对阵，无需手动选两个角色。
- 支持用户基于一个名人 prompt 做微调，保存为个人角色。

### 3.4 现有页面处理

| 现有页面 | 处理方式 | 说明 |
|---------|---------|------|
| `DebatesPage.tsx` | 重构为 `AIArenaLobby.tsx` | 原页面既做 AI 斗蛐蛐 setup，又做人机/圆桌/真人入口，职责混乱 |
| `AIArena.tsx` | 保留，路由变更 | 实际对战观战页 |
| `AIBattle.tsx` | 保留，路由变更 | 人机对战页 |
| `CricketForge.tsx` | 保留，路由变更 | 角色工坊 |

### 3.5 大厅入口结构

```
┌─────────────────────────────────────────┐
│           AI 竞技场                      │
│                                          │
│  ┌──────────────┐  ┌──────────────┐     │
│  │  名人擂台     │  │  人机对战     │     │
│  │  诸葛亮 vs 王朗│  │  你 vs AI     │     │
│  │  [观战]       │  │  [开战]       │     │
│  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐     │
│  │  自由对战     │  │  角色工坊     │     │
│  │  自选 AI 角色 │  │  自定义 prompt│     │
│  │  [开始]       │  │  [锻造]       │     │
│  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────┘
```

---

## 四、真人辩论厅 /entertainment/debate

### 4.1 定位

真人为主的多人对抗。区分“快速混合局”和“正式房间局”。

### 4.2 子玩法

| 子玩法 | 说明 | 路由 |
|--------|------|------|
| 圆桌局 | 5 人混合（人 + AI），轻量 DEMO | `/entertainment/debate/round-table` |
| 全真人辩论场 | 4v4 国赛机制房间 | `/entertainment/debate/lobby` |
| 辩论房间 | 具体对局页面 | `/entertainment/debate/room/:roomId` |

### 4.3 4v4 国赛辩论机制

采用华语辩论世界杯 / 新国辩简化规则，确保专业感和可玩性平衡。

#### 人员配置

- 正方 4 人：一辩、二辩、三辩、四辩
- 反方 4 人：一辩、二辩、三辩、四辩
- 人数不足时，空位由 AI 按对应辩位自动补位发言

#### 流程与计时

| 环节 | 顺序 | 时长 | 说明 |
|------|------|------|------|
| 开篇立论 | 正方一辩 → 反方一辩 | 各 3 分钟 | 陈述本方核心论点 |
| 攻辩环节 | 反方二辩质询正方一辩 → 正方二辩质询反方一辩 → 反方三辩质询正方二辩 → 正方三辩质询反方二辩 | 各 1.5 分钟 | 质询方提问，被质询方只能回答，不能反问 |
| 攻辩小结 | 反方一辩 → 正方一辩 | 各 1.5 分钟 | 总结攻辩阶段战果 |
| 自由辩论 | 正方先发言，双方交替 | 各 4 分钟，共 8 分钟 | 每次发言限时 30 秒，超时强制切换 |
| 总结陈词 | 反方四辩 → 正方四辩 | 各 3.5 分钟 | 全场总结，反驳对方，升华本方 |

**单局总时长：约 25-30 分钟。**

#### 房间状态机

```
WAITING → PREPARING → DEBATING → SCORING → SUMMARY → ENDED
```

| 状态 | 说明 |
|------|------|
| WAITING | 等待玩家加入，房主可调整辩题和辩位 |
| PREPARING | 锁定辩位，展示对阵，倒计时 10 秒 |
| DEBATING | 按流程进行，当前发言位高亮，计时器显示 |
| SCORING | 辩论结束后 AI 裁判评分 |
| SUMMARY | 展示结果、MVP、精彩发言 |
| ENDED | 房间归档，可查看总结 |

#### 发言规则

- 轮到当前辩位时，输入框解锁，其他用户只能发弹幕。
- 发言字数限制：立论 400 字，攻辩 200 字，自由辩 150 字，结辩 500 字。
- 倒计时结束未发言，AI 自动补位（基于当前辩位角色 prompt）。
- 房主可随时开始辩论；DEBATING 阶段不允许新玩家加入。

#### AI 裁判评分

辩论结束后，AI 根据以下维度为每位辩手评分：

| 维度 | 权重 | 说明 |
|------|------|------|
| 逻辑性 | 30% | 论证结构、因果链完整性 |
| 事实依据 | 25% | 引用数据、来源可信度 |
| 反驳能力 | 25% | 回应对方论点的有效性 |
| 表达力 | 20% | 语言清晰度、感染力 |

输出：每位辩手得分、胜方、MVP、50 字以内点评。

### 4.4 现有页面处理

| 现有页面 | 处理方式 | 说明 |
|---------|---------|------|
| `RoundTable.tsx` | 保留，路由变更 | 圆桌局 |
| `DebateLobby.tsx` | 保留，路由变更 | 4v4 房间大厅 |
| `DebateRoomPage.tsx` | 保留并扩展 | 4v4 流程核心，需支持国赛机制 |

---

## 五、判官台 /entertainment/judge

### 5.1 定位

争议判定中心。用户以“裁判”姿态参与，低门槛、强共鸣、易传播。

### 5.2 子玩法

| 子玩法 | 说明 | 路由 |
|--------|------|------|
| 我是判官 | 纠纷案件投票，参考美团外卖评论判官 | `/entertainment/judge/cases` |
| 瓜田判官 | 对瓜田热点进行真/假/站队判定 | `/entertainment/judge/melon/:id` |

### 5.3 设计原则

1. **一案一判**：每次只展示一个案件/话题，减少认知负担。
2. **投票后立即看结果**：满足即时反馈。
3. **可分享**：奇葩案件、争议结果可生成分享卡片。
4. **可扩展**：未来可加入“职场判官”“情感判官”等垂直主题。

### 5.4 现有页面处理

| 现有页面 | 处理方式 | 说明 |
|---------|---------|------|
| `JudgeFeedPage.tsx` | 保留，路由变更 | 判官案件流 |
| `DebateArena.tsx`（瓜田争议） | 移除娱乐入口 | 瓜田争议从娱乐大厅移除，判官台以“瓜田判官”形式承接 |

---

## 六、路由重构

### 6.1 新路由表

```
/entertainment                       → EntertainmentHallPage
/entertainment/arena                 → AIArenaLobby
/entertainment/arena/ai-battle/:topicId → AIArena
/entertainment/arena/human-battle    → AIBattle
/entertainment/arena/forge           → CricketForge

/entertainment/debate                → DebateHallLobby
/entertainment/debate/round-table    → RoundTable
/entertainment/debate/lobby          → DebateLobby
/entertainment/debate/room/:roomId   → DebateRoomPage

/entertainment/judge                 → JudgeFeedPage
/entertainment/judge/cases           → JudgeFeedPage
/entertainment/judge/melon/:id       → （新增）MelonJudgePage
```

### 6.2 旧路由重定向

| 旧路由 | 重定向目标 |
|--------|-----------|
| `/debates` | `/entertainment/arena` |
| `/ai-arena/:topicId` | `/entertainment/arena/ai-battle/:topicId` |
| `/ai-battle` | `/entertainment/arena/human-battle` |
| `/cricket-forge` | `/entertainment/arena/forge` |
| `/round-table` | `/entertainment/debate/round-table` |
| `/debate-lobby` | `/entertainment/debate/lobby` |
| `/debate-room/:roomId` | `/entertainment/debate/room/:roomId` |
| `/judge` | `/entertainment/judge` |
| `/debate/:melonId/:title` | `/entertainment/judge/melon/:melonId` |

`/debate/:melonId/:title` 从娱乐大厅移除，统一以“瓜田判官”形式在判官台呈现。

---

## 七、页面与组件变更清单

### 7.1 新增

| 文件 | 说明 |
|------|------|
| `src/pages/AIArenaLobby.tsx` | AI 竞技场大厅，替代 `DebatesPage.tsx` 的入口职能 |
| `src/pages/DebateHallLobby.tsx` | 真人辩论厅大厅 |
| `src/pages/MelonJudgePage.tsx` | 瓜田判官页面 |
| `src/config/themePacks.ts` | 名人主题对战配置 |
| `src/services/themePackService.ts` | 名人主题数据服务 |

### 7.2 改造

| 文件 | 改造点 |
|------|--------|
| `src/pages/EntertainmentHallPage.tsx` | 卡片从 6 张改为 3 张，跳转新路由 |
| `src/pages/DebatesPage.tsx` | 移除人机/圆桌/真人入口，改名为 `AIArenaLobby.tsx` |
| `src/pages/DebateRoomPage.tsx` | 支持 4v4 国赛流程、计时器、AI 补位 |
| `src/services/characters.ts` | 增加名人角色 preset |
| `src/router/routes.ts` | 注册新路由 |
| `src/entry/WebApp.tsx` | 更新 `pageMap` |
| `src/entry/MobileApp.tsx` | 同步更新移动端路由映射 |

### 7.3 删除/弃用

| 文件/功能 | 说明 |
|----------|------|
| 娱乐大厅中的“瓜田争议”卡片 | 移到判官台 |
| `/debates` 路由 | 重定向到 `/entertainment/arena` |

---

## 八、交互与视觉约束

1. **桌面端布局**：AI 竞技场大厅、真人辩论厅大厅、判官台均需支持真正的桌面布局，不使用 `max-w-[480px]` 居中单列（参考项目约束）。
2. **动画**：所有新动画需包含 `prefers-reduced-motion` 降级。
3. **对比度**：文字颜色对比度参考 Twitter/X 标准，字体大小不小于现有规范。
4. **毛玻璃**：如需使用，blur ≥ 20px，saturate ≥ 1.5。
5. ** focus**：不全局移除 focus outline，使用 `focus-visible`。
6. **移动端底部**：内容区保留 `pb-[64px]` 防止 TabBar 遮挡。
7. **错误边界**：新页面统一包裹 `ErrorBoundary`。
8. **骨架屏**：内容-heavy 的大厅页需实现骨架屏。

---

## 九、数据与 LLM 调用

### 9.1 名人角色 prompt 模板

每个名人角色包含：

```typescript
interface ThemeCharacter {
  id: string
  name: string
  era: string
  stanceHint: string
  systemPrompt: string
  avatar: string
  tags: string[]
}
```

prompt 必须包含：
1. 身份定义（一句话人设）
2. 核心风格（3-5 条行为准则）
3. 语言特征（常用句式、口头禅）
4. 立场倾向（默认支持什么、反对什么）
5. 底线规则（不人身攻击、尊重对手）
6. 输出格式（80-150 字，不用 markdown）

### 9.2 4v4 国赛 AI 补位

AI 补位发言需传入当前辩位、环节、历史记录：

```typescript
interface AIFillRequest {
  roomId: string
  seat: 'affirm-1' | 'affirm-2' | ... | 'negate-4'
  phase: 'opening' | 'attack' | 'attack-summary' | 'free' | 'closing'
  topic: string
  previousMessages: DebateMessage[]
  characterPrompt?: string
}
```

### 9.3 裁判评分

统一调用 `llmStore.callLLM()`，超时 12 秒降级到 mock 评分。

---

## 十、实施阶段

### Phase 1：路由重构 + 大厅入口（1 天）

- 新增 `/entertainment/arena`、`/entertainment/debate`、`/entertainment/judge` 路由
- 改造 `EntertainmentHallPage` 为 3 张卡片
- 创建 `AIArenaLobby`、`DebateHallLobby`
- 旧路由添加重定向
- 验证所有旧链接可正常跳转

### Phase 2：AI 竞技场改造（2 天）

- 重构 `DebatesPage` → `AIArenaLobby`
- 迁移 `AIArena`、`AIBattle`、`CricketForge` 到新路由
- 设计名人主题对战数据结构和首批主题包
- 在 `AIArenaLobby` 增加“名人擂台”入口

### Phase 3：真人辩论厅改造（2-3 天）

- 迁移 `RoundTable`、`DebateLobby` 到新路由
- 扩展 `DebateRoomPage` 支持 4v4 国赛流程
- 实现计时器、辩位锁定、AI 补位
- 实现 AI 裁判评分

### Phase 4：判官台扩展（1 天）

- 迁移 `JudgeFeedPage` 到新路由
- 新增“瓜田判官”入口
- 实现 `MelonJudgePage`

### Phase 5：验收（1 天）

- 路由映射完整性检查
- 桌面端/移动端布局检查
- 动画降级、对比度、底部 padding 等项目约束检查

**总工期：约 7 个工作日。**

---

## 十一、不做清单

| 不做项 | 原因 |
|--------|------|
| 赔率动态计算 | MVP 阶段固定赔率或不下注 |
| 用户自定义赛制 | 4v4 国赛机制作为默认标准，不做自定义 |
| 角色养成/升级 | 过度设计，MVP 只做 preset + 自定义 prompt |

### 4v4 Demo 模式说明

4v4 全真人辩论场**只做 demo**，不实现 WebSocket 实时同步。核心目标是**视觉冲击力**：

- 用预设的 mock 辩论数据 + AI 补位演示完整国赛流程
- 强调舞台感：辩位布局、计时器动画、发言高亮、弹幕氛围
- 用户可亲自参与某个辩位发言，其余由 AI 驱动
- 即使是 demo，也要让用户感受到"国赛辩论"的仪式感和专业感

### 辩论记录收藏

用户可收藏自己的辩论记录：

- 辩论结束后生成总结卡片，包含辩题、对阵、结果、精彩发言
- 用户可点击"收藏"保存到个人中心
- 收藏记录存入 localStorage（MVP 不做服务端持久化）
- 个人中心增加"我的辩论"入口，查看收藏的辩论记录

---

## 十二、风险与应对

| 风险 | 应对 |
|------|------|
| 旧路由外链/收藏失效 | 全部做 301 重定向 |
| 4v4 流程过长导致用户流失 | demo 模式用加速计时，可跳过环节 |
| AI 补位发言质量不稳定 | 为每个辩位准备独立的 fallback prompt |
| 名人角色 prompt 偏差 | 人工审核首批主题包，用户自定义角色走安全过滤 |
| demo 感太强缺乏沉浸 | 视觉优先：舞台布局、计时动画、发言高亮、弹幕氛围 |

---

> 本设计基于三馆制架构：AI 竞技场、真人辩论厅、判官台。核心变化是把 6 个重叠入口收敛为 3 个清晰入口，AI 斗蛐蛐通过名人主题对战强化传播点，真人辩论厅按国赛 4v4 机制做专业感，判官台作为可扩展的争议判定中心。
