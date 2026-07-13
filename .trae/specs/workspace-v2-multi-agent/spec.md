# 工作间 v2 — 多Agent协同创作平台 Spec

## Why

工作间 v1 是观微社区附属的创作工具，高度绑定社区，流程重、体验差。v2 将工作间升级为通用热点内容创作平台：多Agent协同收集信息、核查事实、提炼观点，生成统一 Canonical Draft，再通过平台 Adapter 适配 6 个平台格式。工具先行获取用户，社区后置沉淀价值。

## What Changes

- **新增 Commander 前端状态机** — 调度多Agent任务队列、依赖图、状态广播、错误恢复
- **新增 5个 Agent** — 主Agent(Orchestrator) / Search / Research / Verify / Writing，全自动调度，用户无需理解多Agent
- **新增 Canonical Draft 数据模型** — 主题/事实/声明/观点/结构/引用的结构化数据，作为所有平台Adapter的唯一事实来源
- **新增 6个平台 Adapter** — 观微/抖音/微博/知乎/贴吧/小红书，从Canonical Draft生成平台特定内容
- **新增 Agent 可视化面板** — 自建UI，展示Agent实时状态+产出预览+采纳/忽略操作
- **新增 Assist/Auto 双模式** — Assist后台运行增量推送，Auto全自动管线一键执行
- **新增快照回退系统** — 事件驱动快照，支持回退到任意历史状态
- **新增 Mock Search** — 预建搜索结果库，管线架构不变，后续替换真实API
- **新增搜索API配置** — 设置页新增Tavily/SerpAPI配置，填写后获得真实搜索体验
- **重写工作间页面** — 从多步表单变为即开即写的编辑器+Agent面板+平台切换
- **BREAKING** — 工作间从社区附属工具变为独立创作平台，发布目标从"瓜田佐证/社区帖子"扩展为"6个平台+观微"

## Impact

- Affected specs: architecture-overhaul-v3 (工作间策划案需更新), trae宝策划案 (工作间不再是trae宝的排除页面)
- Affected code:
  - `src/pages/AgentWorldPage.tsx` — 重写
  - `src/stores/` — 新增 commanderStore.ts, snapshotStore.ts, searchStore.ts
  - `src/services/` — 新增 agentService.ts, searchService.ts, platformAdapter.ts
  - `src/components/create/` — 新增 AgentPanel.tsx, PlatformSwitcher.tsx, SnapshotTimeline.tsx
  - `src/types/` — 新增 canonicalDraft.ts
  - `src/config/` — 新增 platformTemplates.ts, mockSearchResults.ts
  - `src/pages/LLMSettingsPage.tsx` — 新增搜索API配置区
  - `src/stores/llmStore.ts` — 新增 searchConfig 字段

## ADDED Requirements

### Requirement: Commander 前端状态机
系统 SHALL 提供一个前端 Commander 状态机，管理多Agent任务队列、依赖关系、状态流转和错误恢复。

#### Scenario: Auto模式启动管线
- **WHEN** 用户输入主题并点击"自动生成"
- **THEN** Commander解析主题→生成搜索关键词→按依赖图调度Agent（Search→Research+Verify并行→Writing→PlatformAdapters）→每步状态广播到可视化面板

#### Scenario: Agent失败降级
- **WHEN** 某个Agent执行失败（LLM超时/格式错误）
- **THEN** Commander标记该Agent为error状态，已完成的Agent结果保留，用户可手动重试失败的部分，不影响其他已完成的产出

#### Scenario: 页面关闭后重连
- **WHEN** 用户在Agent管线执行期间关闭页面
- **THEN** 管线丢失（前端限制），但草稿和Canonical Draft已persist到localStorage，重连后恢复已有内容

### Requirement: Canonical Draft 数据模型
系统 SHALL 定义结构化的 Canonical Draft 作为Agent管线的唯一事实来源，所有平台Adapter基于此生成内容。

#### Scenario: Canonical Draft 生成
- **WHEN** Writing Agent汇总所有上游产出
- **THEN** 生成包含 topic/facts/claims/viewpoints/structure/references/metadata 的结构化数据，persist到localStorage

#### Scenario: 平台Adapter读取
- **WHEN** 用户切换平台tab
- **THEN** 平台Adapter从Canonical Draft读取数据，根据平台模板生成对应格式内容，不重复调用搜索和推理

### Requirement: Agent 可视化面板
系统 SHALL 提供自建的Agent可视化面板，展示实时状态和产出，与底层Agent框架解耦。

#### Scenario: 实时状态展示
- **WHEN** Agent状态变化
- **THEN** 面板内对应的状态卡片更新为"思考中/执行中/完成/失败"，100ms内的状态变更合并为一次渲染

#### Scenario: 增量产出采纳
- **WHEN** Agent返回新结果
- **THEN** 面板展示产出预览卡片，用户可选择"采纳"（插入到编辑器）、"忽略"（不采纳）或"替换"（替换当前内容）

### Requirement: 平台 Adapter
系统 SHALL 提供6个平台Adapter，从Canonical Draft生成平台特定格式内容。

#### Scenario: 生成平台版本
- **WHEN** 用户选择"知乎"平台
- **THEN** Adapter读取Canonical Draft，使用知乎模板LLM prompt生成专业论证长文，输出Markdown格式

#### Scenario: 一键复制+跳转
- **WHEN** 用户点击"复制+发布"按钮
- **THEN** 内容复制到剪贴板，打开目标平台发布页面

### Requirement: 搜索API配置
系统 SHALL 在设置页面提供搜索API配置，用户填写Tavily或SerpAPI密钥后获得真实搜索体验。

#### Scenario: 未配置搜索API
- **WHEN** 用户未填写搜索API密钥
- **THEN** Agent管线正常执行，Search Agent使用Mock Search返回预建数据，面板提示"使用示例搜索数据"

#### Scenario: 已配置搜索API
- **WHEN** 用户在设置页填写Tavily API密钥并保存
- **THEN** Search Agent调用真实Tavily API搜索，返回真实搜索结果

### Requirement: 快照回退
系统 SHALL 提供事件驱动的快照机制，记录用户采纳Agent结果或执行自动修改时的编辑状态。

#### Scenario: 创建快照
- **WHEN** 用户采纳Agent产出或Auto模式自动修改内容
- **THEN** 创建快照节点（内容快照+时间戳+操作描述），存入快照列表

#### Scenario: 回退到历史状态
- **WHEN** 用户在快照时间线选择某个历史节点
- **THEN** 编辑器内容恢复到该快照状态，当前内容创建为新快照（可再次回退）

#### Scenario: 快照数量上限
- **WHEN** 快照数量超过50个
- **THEN** 淘汰最旧的快照

### Requirement: Assist/Auto 双模式
系统 SHALL 提供两种Agent执行模式。

#### Scenario: Assist模式
- **WHEN** 用户选择Assist模式
- **THEN** Agent在后台运行，用户可继续编辑，Agent结果增量推送到面板，用户决定是否采纳

#### Scenario: Auto模式
- **WHEN** 用户选择Auto模式并点击"自动生成"
- **THEN** Commander自动调度完整管线（搜索→核查→观点→结构→平台适配），连续执行不停顿，用户只看可视化过程

## MODIFIED Requirements

### Requirement: 工作间页面
工作间从社区附属创作工具升级为通用热点内容创作平台。页面结构：顶部工具栏（返回/保存状态/模式切换/求证/发布）+ 左侧编辑区（选题行+MarkdownEditor+骨架面板+核查面板）+ 右侧面板（Agent可视化+参考素材+平台版本切换）。

### Requirement: 设置页面
设置页面新增搜索API配置区域，包含provider选择（Tavily/SerpAPI）、API Key输入、测试连接按钮。

## REMOVED Requirements

### Requirement: 旧版骨架生成流程
**Reason**: v1的"选题→生成骨架→逐段填充"多步流程被Auto/Assist模式的自动化管线取代
**Migration**: 骨架生成作为Writing Agent的一部分保留，但不再是用户必须手动操作的步骤
