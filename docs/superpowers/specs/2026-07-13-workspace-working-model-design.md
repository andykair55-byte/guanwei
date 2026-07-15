# 工作间 Working Model & 交互范式设计

> 版本：v1.1
> 日期：2026-07-13
> 状态：待评审
> 适用范围：AgentWorldPage / 工作间模块

---

## 一、核心定位

工作间是观微的 **多 Agent 协同创作工作台**，面向互联网造梗群体（大学生/高中生）。它不只服务热点运营，也支持科普、造梗、观点输出、辟谣等多种创作类型。

### 1.1 与 ChatGPT 网页版的本质区别

| 维度 | ChatGPT / 通用对话框 | 观微工作间 |
|---|---|---|
| 输出形态 | 一段对话结果 | 一份 Canonical Draft + 多平台派生版本 |
| 多平台分发 | 无 | 一份主稿自动适配知乎/小红书/微博/抖音/贴吧/观微 |
| 任务启动 | 用户自己写 prompt | Commander 判断信息完整度，主动追问并自动规划执行 |
| 事实核查 | 依赖用户自行判断 | Verify Agent 主动标记存疑，用户决策 |
| 资产沉淀 | 聊天历史 | 可持续演进的 Workspace + 快照 + 平台版本 |

**核心卖点：用户只负责决策（主题、平台、采纳），Agent 负责执行（搜索、整理、核查、写作、多平台适配）。**

### 1.2 最高原则

**用户负责决策，Agent 负责执行。**

---

## 二、设计原则

1. **Workspace 是唯一核心对象**：所有创作围绕 Workspace 展开，不区分文档/热点/任务。
2. **Commander 是唯一交互入口**：用户始终面对 Commander，不直接操作 Agent。
3. **Agent 产出必须经用户确认**：Agent 不直接写入 Draft，只以"待采纳"事件进入 Activity Stream，用户确认后才写入 Draft。
4. **Canonical Draft 是唯一事实来源**：平台版本从 Draft 派生，用户可覆盖但不可反向污染 Draft。
5. **平台完全自定义**：每个 Workspace 独立选择、排序、增减目标平台。
6. **发布是可选动作**：不强制反哺社区，用户自主选择发布到哪些平台。
7. **工具先行，社区后置**：先把工作间做好用，回流社区是自然结果。

---

## 三、页面范式

### 3.1 桌面端：三栏 + 底部 Commander

```
┌──────────────┬──────────────────────────────┬────────────────┐
│              │                              │                │
│   Workspace  │      Editor（Canonical       │   Activity     │
│   Sidebar    │       Draft + 平台 tab）      │   Stream       │
│              │                              │                │
├──────────────┤                              ├────────────────┤
│   主导航      │                              │   Agent 筛选   │
│   icon rail  │                              │                │
├──────────────┤                              ├────────────────┤
│   用户信息    │                              │   事件卡片时间线 │
└──────────────┴──────────────────────────────┴────────────────┘
          └────────── Commander 输入框 ──────────┘
```

| 区域 | 职责 | 禁止做的事 |
|---|---|---|
| 左侧 Sidebar | Workspace 智能分组列表 + 全局导航 | 不展示具体功能控件 |
| 中间 Editor | Canonical Draft 主稿编辑器 + 平台版本 tab | 不直接展示 Agent 状态 |
| 右侧 Activity Stream | 纯系统事件流 | 不做聊天窗口 |
| 底部 Commander | 唯一命令/对话入口 | 不替代编辑器操作 |

左右侧边栏支持折叠（与现有 `sidebarStore` 一致），折叠后中间编辑区获得更大空间。

### 3.2 移动端：单栏 + 底部 Tab 切换

移动端不做三栏堆叠，改为底部 Tab 切换三个视图：

```
┌──────────────────────────┐
│                          │
│   当前视图内容（全屏）     │
│                          │
│                          │
├──────────────────────────┤
│  Commander 输入框         │
├──────────┬──────┬────────┤
│  Workspace│ Editor│Activity│
└──────────┴──────┴────────┘
```

- 三个 Tab：Workspace 列表 / 编辑器 / 活动流
- Commander 输入框在 Tab 栏上方常驻
- 默认展示 Editor Tab

---

## 四、Workspace 模型

### 4.1 数据结构

```typescript
interface Workspace {
  id: string
  title: string
  topic: string
  status: WorkspaceStatus
  isFavorite: boolean              // 收藏，与 status 独立
  tags: WorkspaceTag[]
  source: WorkspaceSource
  platformOrder: string[]
  draft: CanonicalDraft
  platformContents: Record<string, PlatformContent>
  snapshots: Snapshot[]
  createdAt: string
  updatedAt: string
}

type WorkspaceStatus =
  | 'draft'           // 刚创建，未开始推进
  | 'active'          // 进行中
  | 'completed'       // 创作完成，未发布
  | 'published'       // 已发布到至少一个平台
  | 'tracking'        // 热点类，持续跟踪中
  | 'archived'        // 已归档

type WorkspaceTag = 'hotspot' | 'science' | 'meme' | 'opinion' | 'debunk' | string

type WorkspaceSource =
  | { type: 'manual' }
  | { type: 'melon'; id: string }
  | { type: 'community'; id: string }
  | { type: 'template'; templateId: string }
  | { type: 'copy'; workspaceId: string }
```

### 4.2 生命周期流转

```
                ┌─────────────┐
                │    draft    │
                └──────┬──────┘
                       │ 用户开始推进 / Agent 执行首次任务
                       ▼
                ┌─────────────┐
    ┌───────────│    active   │───────────┐
    │           └──────┬──────┘           │
    │                  │                  │
    ▼                  ▼                  ▼
┌─────────┐     ┌──────────┐       ┌──────────┐
│tracking │     │completed │       │ published│
│(热点类) │     │(未发布)  │       │(已发布)  │
└────┬────┘     └────┬─────┘       └────┬─────┘
     │               │                  │
     │   重新编辑     │   发布           │ 重新编辑
     └──────►active◄──┘                  │
              ▲                          │
              └───────────────────────────┘
                       │ 归档
                       ▼
                  ┌───────────┐
                  │  archived │─── 取消归档 ──►恢复原 status
                  └───────────┘
```

**状态转换规则：**

| 从 | 到 | 触发条件 |
|---|---|---|
| draft | active | 用户首次执行 Agent 任务或手动编辑 |
| active | completed | 用户标记"创作完成" |
| active / completed | published | 用户确认已发布到至少一个平台 |
| active | tracking | 用户手动切换为"跟踪"（仅 hotspot 标签可用） |
| tracking | active | 用户取消跟踪 |
| published | active | 用户重新编辑已发布内容 |
| 任意 | archived | 用户归档 |
| archived | 原状态 | 用户取消归档，恢复归档前状态 |

- `isFavorite` 是独立布尔字段，与 `status` 并存，不参与状态流转。
- 用户可硬删除 Workspace（从列表彻底移除），需二次确认。

### 4.3 创建入口

1. **手动输入主题**：用户输入任意主题/梗/话题。
2. **从瓜田/社区导入**：`?source=melon&id=xxx` 自动带入 topic + facts + references。
3. **从模板创建**：选择热点分析/科普/造梗/辟谣模板，预填 structure。
4. **复制已有 Workspace**：复制 draft + platformOrder + tags，不复制 platformContents 和 snapshots。

创建时统一流程：

```text
输入主题 → 选择类型标签 → 选择/调整平台 → 进入编辑器
```

### 4.4 平台自定义

- 每个 Workspace 独立维护 `platformOrder`。
- 平台池：知乎、小红书、微博、抖音、贴吧、观微，未来可扩展。
- 用户可随时添加、删除、排序平台。
- 未选中的平台不在顶部 tab 显示。
- 全局设置保留"默认平台"，新建 Workspace 时自动预填。
- 删除平台时，该平台已有的 `platformContents` 保留在数据中但不在 UI 显示；重新添加时恢复。

---

## 五、主数据与派生数据

### 5.1 Canonical Draft（主数据）

唯一事实来源。与现有代码 `src/types/canonicalDraft.ts` 对齐：

```typescript
interface CanonicalDraft {
  topic: string
  facts: FactNode[]
  claims: ClaimNode[]
  viewpoints: ViewpointNode[]
  structure: SectionNode[]
  references: ReferenceNode[]
  metadata: DraftMetadata
}

interface DraftMetadata {
  createdAt: string
  updatedAt: string
  agents: string[]          // 参与过的 Agent 列表
  searchQueries: string[]   // 使用过的搜索关键词
  mode: 'assist' | 'auto'   // 当前执行模式
}
```

**支撑类型（已在代码中定义）：**

- `FactNode`：事实节点（content / source / url / credibility / verified / collectedAt）
- `ClaimNode`：声明节点（text / type / status / evidence / sourceFactId）
- `ViewpointNode`：观点节点（stance / argument / supportingFactIds / counterArgument）
- `SectionNode`：章节节点（title / type / points / content / accepted）
- `ReferenceNode`：引用来源（title / source / url / type / publishedAt）

### 5.2 Platform Contents（派生数据）

```typescript
interface PlatformContent {
  title: string
  content: string
  generated: boolean      // 是否由 Adapter 生成过
  overridden: boolean     // 用户是否手动覆盖
  generatedAt?: string
  overriddenAt?: string
}
```

### 5.3 更新规则

1. **Agent 产出不直接写入 Draft 或 Platform Contents**，先进入 Activity Stream 等待用户确认。
2. 用户确认后，Agent 产出写入 Draft。
3. Platform Adapter 从 Draft 生成平台版本。
4. 用户可覆盖平台版本，但覆盖不反向污染 Draft。
5. 主稿更新时，用户可选择：
   - **重新生成所有平台版本**（丢弃未锁定覆盖）
   - **仅重新生成未覆盖的平台版本**
   - **保留所有现有平台版本**
6. **MVP 简化**：主稿更新后，被覆盖的平台版本保持不动，未覆盖的版本自动重新生成。

```typescript
function adaptPlatforms(draft: CanonicalDraft, platforms: string[]) {
  return platforms.map(p => {
    const existing = workspace.platformContents[p]
    if (existing?.overridden) return existing
    return platformAdapter(draft, p)
  })
}
```

---

## 六、Activity Stream 事件模型

### 6.1 定位

右侧 Activity Stream 是**纯系统事件流**，不是聊天窗口。它记录 Agent 执行状态、用户决策结果、系统状态变化。

### 6.2 事件数据结构

与现有代码 `src/types/activity.ts` 对齐：

```typescript
interface ActivityEvent {
  id: string
  timestamp: number
  type: EventType
  agentType: AgentTypeLabel
  title: string
  content: string
  actions?: EventAction[]
  data?: Record<string, unknown>
}

type EventType =
  | 'agent_started'          // Agent 开始执行
  | 'search_complete'       // 搜索完成
  | 'research_complete'     // 研究完成
  | 'verify_warning'        // 核查发现存疑
  | 'writing_complete'      // 主稿生成完成
  | 'platform_complete'     // 平台版本生成完成
  | 'commander_question'    // Commander 追问
  | 'commander_plan'        // 执行计划生成
  | 'commander_welcome'     // 首次欢迎消息
  | 'user_action'           // 用户操作（采纳/忽略/编辑）
  | 'error'                 // 错误
  | 'info'                  // 系统信息

type AgentTypeLabel = 'orchestrator' | 'search' | 'research' | 'verify' | 'writing' | 'user' | 'system'

interface EventAction {
  id: string
  label: string
  style?: 'primary' | 'secondary' | 'warning'
}
```

### 6.3 事件类型与操作

| 事件类型 | 来源 Agent | 说明 | 用户可执行操作 |
|---|---|---|---|
| `agent_started` | 各 Agent | Agent 开始执行 | - |
| `search_complete` | search | 搜索完成，返回素材 | 引用全部 / 查看结果 |
| `research_complete` | research | 整理出事实与观点 | 采纳观点 / 忽略 |
| `verify_warning` | verify | 发现存疑声明 | 删除声明 / 保留标注 / 补充证据 |
| `writing_complete` | writing | 主稿生成 | 采纳 / 编辑 / 忽略 |
| `platform_complete` | writing | 平台版本生成 | 查看 / 重新生成 |
| `commander_plan` | orchestrator | 执行计划生成 | 确认 / 修改 / 取消 |
| `commander_question` | orchestrator | Commander 追问 | 回答（在 Commander 输入区） |
| `commander_welcome` | orchestrator | 首次欢迎 | 选择示例 |
| `user_action` | user | 用户执行了采纳/忽略/编辑 | - |
| `error` | system | Agent 执行失败 | 重跑 |
| `info` | system | 降级提示、状态变更等 | 查看详情 |

### 6.4 事件卡片

每张事件卡片包含：

- Agent 来源图标与名称
- 状态标签：`running` / `completed` / `failed` / `warning`
- 事件摘要
- 可执行操作按钮
- 时间戳
- 展开后的详细内容

### 6.5 筛选与排序

- 支持按 Agent 类型筛选：全部 / Search / Research / Verify / Writing / Orchestrator。
- 最新事件在下，保持时间连续性。
- 事件按 Workspace 隔离，切换 Workspace 时只显示当前 Workspace 的事件。

### 6.6 事件保留策略

- 单个 Workspace 最多保留 200 条事件。
- 超出后淘汰最旧的事件（锁定的事件不受限制）。
- 用户可手动清除当前 Workspace 的事件历史（需二次确认）。

### 6.7 关键规则

**Agent 产出必须先进入 Activity Stream 等待用户确认，确认后才写入 Draft。**

这是解决并发写冲突和贯彻"用户决策/Agent 执行"原则的硬规则。

---

## 七、Commander 交互模型

### 7.1 唯一入口

底部固定输入框是用户与 Commander 的唯一交互入口。

### 7.2 信息完整度判断（MVP 简化版）

不实现通用分类器，采用明确规则：

```text
不完整条件（满足任一即追问）：
1. 主题为空或过于模糊（少于 4 个字符）
2. 目标平台为空
3. 用户明确要求 Commander 先问清楚

完整后行为：
- Assist 模式：生成执行计划卡片，等待用户确认
- Auto 模式：直接开始执行
```

如果用户在初始消息中已包含主题和平台（如"帮我分析 AI 换脸诈骗，写知乎和小红书"），Commander 跳过追问直接进入执行。

追问示例：

```
用户：帮我写个东西
Commander：你想写什么主题？目标发在哪个平台？
```

### 7.3 追问卡片状态

- 追问卡片显示在 Commander 输入框上方。
- 用户回答后，追问卡片标记为 `answered` 并保留在输入区上方（不进入 Activity Stream）。
- 用户改问新问题时，旧追问卡片标记为 `superseded`，不再阻塞。
- 用户离开 Workspace 时，未回答的追问卡片保留，回来时仍可见。

### 7.4 执行流程

```text
用户输入目标
    ↓
Commander 判断信息完整度
    ↓
不完整 → 显示追问卡片
    ↓
完整 → Assist 生成计划 / Auto 开始执行
    ↓
Agent 执行 → 事件进入 Activity Stream
    ↓
需要用户决策时，Commander 通过事件卡片通知
    ↓
用户在事件卡片上操作
```

### 7.5 Assist / Auto 切换

- 用户可在任意时刻切换 Assist / Auto 模式。
- 从 Auto 切换到 Assist：当前正在执行的 Agent 完成后暂停，等待用户下一条命令。
- 从 Assist 切换到 Auto：Commander 从当前进度开始自动推进剩余管线。
- 模式切换不丢失已有产出。

---

## 八、Agent 调度与 Assist / Auto

### 8.1 Agent 管线与数据流

```
Search Agent
  输入: topic + searchQueries
  输出: ReferenceNode[] + FactNode[]
    ↓
Research Agent
  输入: search 结果
  输出: ViewpointNode[] + SectionNode[] (结构)
    ↓
Verify Agent  ←可与 Research 并行（基于 Search 产出）
  输入: ClaimNode[] (从 Research 提取)
  输出: 核查结果（更新 ClaimNode.status）
    ↓
Writing Agent
  输入: facts + claims + viewpoints + structure
  输出: CanonicalDraft.content + SectionNode[].content
    ↓
Platform Adapters
  输入: 完整 CanonicalDraft
  输出: 各平台 PlatformContent
```

- **Search**：收集链接、截图、引文、数据等素材。
- **Research**：提炼事实、观点、内容结构。
- **Verify**：核查关键声明，标记存疑（可与 Research 并行，基于 Search 产出）。
- **Writing**：生成 Canonical Draft 主稿正文。
- **Platform Adapters**：基于 Draft 生成各平台版本。

### 8.2 Assist 模式

用户通过 Commander 逐条发令，Agent 按命令执行。

```text
用户：先搜索资料
Commander：仅执行 Search Agent

用户：这个观点有问题，重新核查
Commander：仅执行 Verify Agent
```

### 8.3 Auto 模式

Commander 自动推进完整管线，用户可随时接管。

```text
用户：帮我分析 AI 换脸诈骗，写知乎和小红书
Commander：确认主题和平台 → 自动执行 Search→Research→Verify→Writing→Platform
```

### 8.4 重跑策略

- **重跑粒度**：只重跑失败或需要重跑的单一步骤，不重跑整个管线。
- **重跑前处理**：撤回该步骤产生的待采纳事件，避免旧结果与新结果混淆。
- **并发去重**：同一 Agent 同一 Workspace 同时只能有一个运行中任务。新的重跑请求取消旧任务并开始新任务。
- **失败保留**：失败事件保留在 Activity Stream 中，标记为 `failed`，用户可点击重跑。

### 8.5 Agent 超时与失败

- 单个 Agent 执行超时阈值：30 秒。
- 超时后标记为 `failed`，不自动重试。
- 用户可在 Activity Stream 中手动重跑。

### 8.6 Verify Agent 失败分支

核查不通过**不阻断**流程：

1. Verify Agent 标记该声明为 `disputed`。
2. Activity Stream 生成 `verify_warning` 事件。
3. 用户选择：
   - 删除该声明
   - 保留但标注"待核实"
   - 补充证据后重新核查
4. Writing Agent 生成主稿时遵守用户选择。

### 8.7 Auto 模式下 Search 无结果

- Search 返回空结果时，Commander 在 Activity Stream 生成 `info` 事件提示用户。
- Auto 模式暂停管线，等待用户补充搜索关键词或手动提供素材。
- 用户可选择跳过 Search，直接进入 Research（基于已有素材）。

---

## 九、平台发布

### 9.1 发布动作

发布是可选动作，用户选择发布到哪些平台。

```text
发布流程：
1. 用户点击"发布"按钮
2. 选择目标平台（可多选）
3. 系统逐个复制对应平台文案到剪贴板
4. 在新标签页打开目标平台发布页
5. 显示 toast："文案已复制，请在打开页面中粘贴发布"
6. 用户发布完成后返回观微，手动点击"已完成发布"
7. Workspace 状态变为 published
```

### 9.2 状态收口

- 如果用户未点击"已完成发布"，Workspace 保持原状态（`completed` 或 `active`）。
- 提供"跳过发布，仅保存"选项。
- 支持发布到观微社区/瓜田（可选）。
- 已发布的 Workspace 可重新编辑（`published → active`），重新发布后更新发布时间。

### 9.3 平台 Adapter

- 每个平台有独立 prompt/template。
- 从 Canonical Draft 读取 facts/claims/viewpoints/structure/references。
- 输出标题 + 正文。
- 新增平台时只需新增一个 Adapter，无需重写管线。
- 平台模板统一管理在 `src/config/platformTemplates.ts`。

---

## 十、版本与快照

### 10.1 触发条件

以下情况自动创建快照：

- 用户采纳 Agent 产出
- 用户手动保存
- 用户发布
- 用户覆盖平台版本

### 10.2 数据结构

```typescript
interface Snapshot {
  id: string
  workspaceId: string
  draft: CanonicalDraft
  platformContents: Record<string, PlatformContent>
  description: string        // 自动生成或用户命名
  createdAt: string
  locked: boolean
}
```

### 10.3 版本条

- 编辑器底部显示版本条：`V5 / V4 / V3 / ...`
- 点击可回退到对应快照。
- 回退后当前状态保存为新快照，可再次回退。

### 10.4 快照锁定

- 用户可手动锁定重要快照。
- 锁定快照不受"最多 50 个"限制，不会被自动淘汰。
- 未锁定快照按时间淘汰最旧。

### 10.5 存储策略

- Workspace + 事件 + 快照统一存储在 localStorage（`guanwei-workspaces` key）。
- 快照内 Draft 和 PlatformContents 为深拷贝，互不影响。
- 如果 localStorage 接近上限（>4MB），提示用户清理旧快照或归档旧 Workspace。
- 未来可扩展到 IndexedDB 以突破 localStorage 5MB 限制。

---

## 十一、错误处理与降级

### 11.1 LLM 不可用

- 触发条件：调用超时（12s）、API key 无效、格式错误重试 1 次仍失败。
- 降级行为：使用预设模板（事件分析 / 观点论述 / 对比评测）。
- UI 提示：Activity Stream 顶部显示醒目横幅"当前使用本地模板，结果可能受限"。
- 降级内容在事件卡片中明确标注"降级产出"，防止用户误当真实结果。

### 11.2 搜索 API 未配置

- 降级行为：使用 Mock Search。
- UI 提示：搜索完成事件卡片标注"示例搜索数据"。

### 11.3 Agent 失败

- 失败 Agent 在 Activity Stream 标记为 `failed`。
- 不影响其他 Agent 执行。
- 用户可点击"重跑"。

### 11.4 全局降级状态

```typescript
interface DegradationState {
  llm: boolean
  search: boolean
  message: string
}
```

当任意降级激活时，在 Activity Stream 顶部显示常驻横幅，直到恢复。

### 11.5 持续失败策略

- LLM 连续失败 3 次自动切 mock，并在 Activity Stream 顶部用醒目样式提示当前处于降级状态。
- 不无限重试，避免用户等待。

---

## 十二、安全与成本

### 12.1 内容策略过滤

- Commander 层对用户输入进行内容策略过滤。
- 过滤目标：恶意 prompt injection、违规内容请求、敏感话题。
- MVP 实现方式：关键词黑名单 + 敏感词检测，不依赖 LLM 分类。
- 过滤不通过时，Commander 拒绝执行并提示用户。
- 不过度依赖 Agent 自身的安全对齐，系统层再做一次兜底。

### 12.2 成本限流

- Auto 模式下，单个用户同时只能有 1 个运行中任务。
- 超出限制时提示"当前已有 Auto 任务在运行，请等待完成或切换到 Assist 模式"。
- 架构层面预留调用额度统计接口，未来可接入配额系统。

### 12.3 滥用场景

- 限制单次 Workspace 的 Agent 重跑次数（如每步骤最多 10 次）。
- 对高频创建 Workspace 做 gentle 提示，不强制阻断。

---

## 十三、首次用户引导

当用户 Workspace 列表为空时：

1. Commander 主动发送一条欢迎消息：
   > "我可以帮你把一个话题变成多个平台的内容。先告诉我你想写什么？"
2. 提供 3 个快速示例按钮：
   - "分析一个热点"
   - "写篇科普"
   - "造个梗"
3. 用户选择后，Commander 自动填入主示例主题，并展示完整执行计划。
4. 用户首次进入非空 Workspace 时不再触发引导。

---

## 十四、测试策略

### 14.1 单元测试

- Workspace store 状态流转（含所有状态转换路径）
- Agent 调度逻辑（依赖图、并行执行、超时）
- Platform Adapter 输出
- Commander 信息完整度判断
- 快照锁定与淘汰逻辑
- 事件保留策略

### 14.2 集成测试

- 完整 Auto 管线：创建 Workspace → 搜索 → 研究 → 核查 → 写作 → 平台适配
- Assist 模式单步命令
- 快照回退
- Agent 失败后重跑
- Assist/Auto 模式切换

### 14.3 E2E 测试

- 创建 Workspace → 生成内容 → 复制发布 → 状态变更
- 首次用户引导流程
- 移动端 Tab 切换

---

## 十五、MVP 边界

### 15.1 本次必须实现

- Workspace 生命周期（六态 + 收藏 + 硬删除）
- 平台完全自定义（增删排序）
- 桌面三栏 + 移动端 Tab 切换
- Commander 输入框 + 信息完整度判断（简化规则）
- Activity Stream 事件流（含 agent_started 事件）
- Agent 产出必须先确认再写入 Draft
- Search / Research / Writing / Platform Adapter 基础管线
- Verify Agent 基础版（关键词级提示，非深度核查）
- 快照与版本回退（含锁定）
- 降级提示

### 15.2 可降级到后续迭代

- Verify Agent 的深层核查
- 智能分组算法（先用时间+状态分组）
- 平台版本智能 diff（MVP 用全量覆盖/保留策略）
- 额度与配额系统（先预留接口）
- IndexedDB 存储迁移
- 移动端手势优化

---

## 十六、关键决策清单

| 决策 | 选择 | 理由 |
|---|---|---|
| 核心对象 | Workspace | 通用容器，支持多种创作类型 |
| 页面范式 | 桌面三栏 + 移动 Tab 切换 | 职责分离，适配多端 |
| 平台配置 | 每个 Workspace 完全自定义 | 高度自主，避免开发者视角堆砌 |
| Activity Stream | 纯系统事件，非聊天 | 记录 Agent 执行状态 |
| Agent 可见性 | 完全透明 | 用户需要知道系统正在做什么 |
| Assist/Auto | 用户主动驱动 / Commander 自动推进 | 兼顾控制与效率 |
| 模式切换 | 任意时刻可切换，不丢失产出 | 灵活性 |
| 主数据 | Canonical Draft | 单一事实来源 |
| 平台版本 | 从 Draft 派生，可覆盖 | 多平台分发的核心能力 |
| Agent 写入规则 | 必须经用户确认 | 避免并发冲突，贯彻用户决策原则 |
| 发布 | 可选，不强制反哺 | 避免年轻用户反感 |
| Agent 并行 | Research 与 Verify 可并行 | 基于 Search 产出，提高效率 |
| 快照锁定 | 支持手动锁定 | 防止关键版本被淘汰 |

---

## 十七、与现有代码的对齐

| Spec 概念 | 现有代码文件 | 对齐方式 |
|---|---|---|
| Workspace | `src/types/workspace.ts` | 扩展 status 枚举 + isFavorite + source + tags |
| CanonicalDraft | `src/types/canonicalDraft.ts` | 已对齐，无需改动 |
| ActivityEvent | `src/types/activity.ts` | 扩展 EventType（新增 agent_started / platform_complete） |
| workspaceStore | `src/stores/workspaceStore.ts` | 扩展状态流转 + isFavorite + 硬删除 |
| activityStore | `src/stores/activityStore.ts` | 扩展事件保留策略 + 按 Workspace 隔离 |
| commanderStore | `src/stores/commanderStore.ts` | 扩展追问卡片状态 + 模式切换 |
| commanderService | `src/services/commanderService.ts` | 新增信息完整度判断 + 内容策略过滤 |
| agentService | `src/services/agentService.ts` | 适配 Agent 数据流 + 超时 + 并行 |
| platformAdapter | `src/services/platformAdapter.ts` | 保持现有，增加 overridden 逻辑 |
| AgentWorldPage | `src/pages/AgentWorldPage.tsx` | 重写为三栏布局 |
| WorkspaceSidebar | `src/components/workspace/WorkspaceSidebar.tsx` | 智能分组 + 平台自定义 |
| ActivityStream | `src/components/workspace/ActivityStream.tsx` | 纯事件流 + Agent 筛选 |
| CommanderInput | `src/components/workspace/CommanderInput.tsx` | 追问卡片 + 模式切换 |
| VersionBar | `src/components/workspace/VersionBar.tsx` | 快照锁定 + 回退 |
| EventCard | `src/components/workspace/EventCard.tsx` | 事件操作按钮 |

---

> 下一环节：由 `writing-plans` skill 根据本设计生成详细实施计划。
