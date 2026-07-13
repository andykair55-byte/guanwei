# Event-driven Workspace Spec

## Why

当前工作间v2虽然实现了多Agent管线，但交互范式仍是"表单+按钮+Chat窗口"的拼凑。用户需要：选模式→填主题→点生成→看Agent状态卡→采纳/忽略。这本质上还是User→Chat→Agent的思维。

正确的范式是 **Goal → Commander → Agent → Event**：
- 用户只需要表达目标（"帮我分析AI换脸诈骗"）
- Commander负责理解目标、提问补充信息、规划执行、调度Agent
- Agent对用户透明，用户感知到的始终是Commander
- 所有过程沉淀为Workspace的一条连续事件时间线（Activity Stream）

工作空间是持续存在的实体，不是一次性对话。用户可以随时回来继续。

## What Changes

- **新增 Workspace 生命周期管理** — 每个工作空间是一份持续演进的Canonical Draft，有状态（进行中/草稿/已完成/收藏/归档）
- **重写 Commander 交互系统** — 底部输入框是唯一交互入口：用户描述目标→Commander提问补充→Auto执行/Assist规划→事件流持续追加
- **新增 Activity Stream** — 右侧单一时序事件流，替代AgentPanel+Chat。所有事件（搜索完成/发现存疑/Commander提问/用户回复/版本生成）以卡片形式追加
- **重写左侧栏** — 工作间页面内显示Workspace列表（进行中/草稿/收藏/归档），主导航变为最左icon rail
- **底部 Commander 输入框** — 取代独立Chat窗口，是整个工作空间的命令入口
- **Auto模式 = 执行，Assist模式 = 规划** — Assist只规划不执行，展示执行计划等待确认
- **新增 Skill Library 入口** — 专家模式入口，普通用户不可见
- **BREAKING** — 移除trae宝悬浮球（在工作间内），移除独立Chat入口，移除Agent状态卡片列表

## ADDED Requirements

### Requirement: Workspace 生命周期管理
系统 SHALL 支持多个工作空间，每个空间是独立的Canonical Draft+事件流+版本历史。

#### Scenario: 创建新工作空间
- **WHEN** 用户点击"+ 新建工作空间"
- **THEN** 创建新Workspace，状态为"进行中"，自动切换到该空间

#### Scenario: 工作空间状态流转
- **WHEN** 用户完成创作并发布
- **THEN** Workspace状态变为"已完成"
- **WHEN** 用户点击收藏
- **THEN** 状态变为"收藏"
- **WHEN** 用户归档
- **THEN** 状态变为"归档"

#### Scenario: 工作空间持久化
- **WHEN** 用户关闭页面后重新打开
- **THEN** 所有工作空间列表和内容从localStorage恢复

### Requirement: Commander 交互入口
系统 SHALL 提供底部输入框作为Commander的唯一交互入口。用户始终面对Commander，而非直接面对Agent。

#### Scenario: 用户描述目标
- **WHEN** 用户在输入框输入"帮我分析AI换脸诈骗"并发送
- **THEN** Commander分析任务规格，发现缺少信息（目标平台？受众？），在Activity Stream中以提问事件形式向用户追问

#### Scenario: Commander收集完整规格
- **WHEN** Commander判断任务规格足够完整
- **THEN** Assist模式下展示执行计划等待确认；Auto模式下自动开始执行

#### Scenario: 执行中Commander反馈
- **WHEN** Agent执行中发现风险或需要决策
- **THEN** Commander在Activity Stream中以事件形式通知用户，用户可在事件卡片上直接操作（重新核查/采纳/忽略）

### Requirement: Activity Stream 事件流
系统 SHALL 在右侧展示单一时序事件流，所有Agent产出、Commander提问、版本生成都以事件卡片形式追加。

#### Scenario: 事件卡片类型
每种事件类型有不同的视觉样式：
- 🔍 搜索完成 — 绿色"完成"标签，显示结果数量，"引用全部"/"查看结果"按钮
- 💡 观点提炼 — 绿色"完成"标签，显示观点列表，"采纳观点"按钮
- ⚠️ 发现存疑 — 橙色"警告"标签，显示存疑条目，"重新核查"/"查看证据"按钮
- ✍️ 内容生成 — 绿色"完成"标签，显示平台版本按钮
- 🤖 Commander提问 — 蓝色，显示问题+选项/输入区域
- 📋 执行计划 — 蓝色"规划"标签，显示计划步骤+确认/修改按钮
- 👤 用户操作 — 灰色，显示用户执行的操作（采纳/忽略/编辑等）

#### Scenario: 事件筛选
- **WHEN** 用户点击筛选标签（全部/搜索员/研究员/指挥官/写作员/核查员）
- **THEN** 只显示对应Agent类型的事件

#### Scenario: 连续时间线
- 事件按时间倒序排列（最新在下或在上，参考2.png最新在下）
- 所有事件追加到同一条时间线，不切割为多个会话

### Requirement: 三栏布局
工作间页面 SHALL 采用三栏布局（参考2.png）：

#### 左栏（Workspace Sidebar）
- 最顶：Logo + "+ 新建工作空间"按钮
- 进行中：当前活跃的Workspace列表
- 草稿：未完成的草稿
- 已完成：已发布的Workspace
- 收藏夹：长期维护的话题，"查看全部(N)"
- 归档：已归档的Workspace，"查看全部(N)"
- 最底：主导航icon rail（瓜田/社区/时间线/工作间/技能库/设置）+ 用户信息

#### 中栏（Editor）
- 顶部：返回 + 面包屑（工作间/主题名）+ 保存状态 + 撤销/重做 + Assist/Auto切换 + 更多菜单
- 平台tab栏：通用稿(主稿)/知乎/小红书/微博/抖音/B站/+/发布到按钮
- 状态栏：Agent连接数/字数/预计阅读时间
- 编辑区：富文本/Markdown编辑器，选中文字时显示AI操作浮动菜单
- 底部：版本历史条（V5/V4/V3，显示时间，"查看全部"）
- 最底：Commander输入框

#### 右栏（Activity Stream）
- 标题"工作空间活动流" + 筛选 + 设置
- Agent筛选标签（全部/搜索员/研究员/指挥官/写作员/核查员）
- 事件卡片时间线

### Requirement: Auto/Assist 模式重新定义
- **Auto模式**：Commander收集完规格后自动调度Agent执行，不停顿，类似发布任务后自动跑
- **Assist模式（Plan模式）**：Commander只做规划，展示执行计划给用户确认，用户确认后才执行

### Requirement: 版本历史
编辑器底部 SHALL 显示版本历史条，自动保存的版本以V5/V4/V3形式展示，点击可查看历史版本。

## REMOVED Requirements

### Requirement: trae宝在工作间内的悬浮球
**Reason**: Commander输入框+Activity Stream已经覆盖了AI交互能力，悬浮球造成交互冲突
**Migration**: trae宝在其他页面（瓜田/社区等）保留，工作间内由Commander取代

### Requirement: 独立的Agent状态卡片列表
**Reason**: 被Activity Stream的事件卡片取代
**Migration**: Agent状态信息通过事件卡片传达

### Requirement: SnapshotTimeline独立组件
**Reason**: 版本历史合并到编辑器底部条
**Migration**: 快照功能保留但UI变为底部版本条

## Impact

- Affected code:
  - `src/pages/AgentWorldPage.tsx` — 完全重写为三栏布局
  - `src/layouts/WebLayout.tsx` — 工作间页面时sidebar行为调整
  - `src/components/create/AgentPanel.tsx` — 被ActivityStream取代
  - `src/stores/commanderStore.ts` — 扩展Commander交互能力（提问/规划）
  - `src/services/agentService.ts` — 适配事件驱动模式
- New files:
  - `src/stores/workspaceStore.ts` — 工作空间列表+生命周期
  - `src/stores/activityStore.ts` — 事件流管理
  - `src/services/commanderService.ts` — Commander任务规格收集+规划
  - `src/components/workspace/WorkspaceSidebar.tsx` — 左栏工作空间列表
  - `src/components/workspace/ActivityStream.tsx` — 右栏事件流
  - `src/components/workspace/CommanderInput.tsx` — 底部输入框
  - `src/components/workspace/VersionBar.tsx` — 底部版本历史条
  - `src/components/workspace/EventCard.tsx` — 事件卡片组件
  - `src/types/workspace.ts` — Workspace类型定义
  - `src/types/activity.ts` — 事件类型定义
