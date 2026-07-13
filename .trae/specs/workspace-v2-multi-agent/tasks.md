# Tasks

## P0 — 核心管线

- [x] Task 1: 定义 Canonical Draft 数据模型
  - [x] SubTask 1.1: 创建 `src/types/canonicalDraft.ts` — 定义 CanonicalDraft/FactNode/ClaimNode/ViewpointNode/SectionNode/ReferenceNode 接口
  - [x] SubTask 1.2: 创建 `src/stores/canonicalStore.ts` — Zustand+persist 管理 Canonical Draft，提供 setDraft/updateFacts/updateClaims/updateViewpoints/updateStructure/getDraft 方法

- [x] Task 2: 搜索API配置+Mock Search
  - [x] SubTask 2.1: 扩展 `src/stores/llmStore.ts` — 新增 searchConfig 字段（provider: 'mock'|'tavily'|'serpapi', apiKey: string），persist 到 localStorage
  - [x] SubTask 2.2: 创建 `src/services/searchService.ts` — 统一 search() 入口，根据 searchConfig.provider 分发到 mock/tavily/serpapi；Mock Search 返回预建结构化数据（标题+摘要+来源+URL）；Tavily 调用 https://api.tavily.com/search；SerpAPI 调用 https://serpapi.com/search
  - [x] SubTask 2.3: 创建 `src/config/mockSearchResults.ts` — 预建搜索结果库，覆盖3个演示主题（AI换脸诈骗/大学专业裁撤/国产AI对比），每个主题返回5-8条结构化搜索结果
  - [x] SubTask 2.4: 修改 `src/pages/LLMSettingsPage.tsx` — 新增搜索API配置区域：provider下拉选择（Mock/Tavily/SerpAPI）、API Key输入框、测试连接按钮

- [x] Task 3: 搭建 Commander 状态机
  - [x] SubTask 3.1: 创建 `src/stores/commanderStore.ts` — 定义 AgentStatus/AgentTask/AgentType 类型；任务队列管理（enqueue/dequeue/retry）；Agent依赖图（Search→Research+Verify→Writing→Adapters）；状态广播（subscribe机制）；错误恢复（retry/fallback/skip）
  - [x] SubTask 3.2: 实现 Auto 模式管线调度 — 按依赖图自动调度5个Agent，连续执行不停顿，状态实时广播
  - [x] SubTask 3.3: 实现 Assist 模式增量推送 — Agent后台运行，产出推送到面板，用户选择采纳/忽略

- [x] Task 4: 实现 5个 Agent
  - [x] SubTask 4.1: 创建 `src/services/agentService.ts` — 定义 Agent 接口（execute/status/onProgress）；主Agent(Orchestrator)：分析主题→生成3-5个搜索关键词+任务计划
  - [x] SubTask 4.2: 实现 Search Agent — 调用 searchService.search()，返回结构化搜索结果列表
  - [x] SubTask 4.3: 实现 Research Agent — 基于搜索结果，用 callLLM 提炼多角度观点和核心争议
  - [x] SubTask 4.4: 实现 Verify Agent — 从搜索结果提取事实声明，用 callLLM 逐条核查（可信/存疑/无法验证）
  - [x] SubTask 4.5: 实现 Writing Agent — 汇总上游产出，用 callLLM 生成 Canonical Draft（结构化JSON）

- [x] Task 5: 实现 6个平台 Adapter
  - [x] SubTask 5.1: 创建 `src/config/platformTemplates.ts` — 定义6个平台的模板配置（名称/图标/字数限制/prompt模板/输出格式说明）
  - [x] SubTask 5.2: 创建 `src/services/platformAdapter.ts` — adaptToPlatform(draft, platform) 函数，读取Canonical Draft，根据平台模板调用 callLLM 生成平台特定内容
  - [x] SubTask 5.3: 实现观微/知乎 adapter — Markdown长文格式
  - [x] SubTask 5.4: 实现抖音 adapter — 短视频脚本格式（[画面]+[口播]）
  - [x] SubTask 5.5: 实现微博 adapter — 短文+话题标签格式
  - [x] SubTask 5.6: 实现贴吧/小红书 adapter — 社区帖/图文种草格式

- [x] Task 6: Agent 可视化面板
  - [x] SubTask 6.1: 创建 `src/components/create/AgentPanel.tsx` — Agent状态卡片列表（每个Agent一个卡片：图标+名称+状态+进度指示器+产出预览）；100ms批量渲染优化
  - [x] SubTask 6.2: 实现增量产出卡片 — Agent返回结果时展示产出预览卡片，"采纳/忽略/替换"按钮
  - [x] SubTask 6.3: 采纳操作连接编辑器 — 采纳时将内容插入到MarkdownEditor光标位置

## P1 — 体验闭环

- [x] Task 7: 快照回退系统
  - [x] SubTask 7.1: 创建 `src/stores/snapshotStore.ts` — 事件驱动快照（createSnapshot/restoreSnapshot/listSnapshots），50个上限淘汰最旧
  - [x] SubTask 7.2: 创建 `src/components/create/SnapshotTimeline.tsx` — 时间线UI，展示快照列表，点击回退

- [x] Task 8: 平台版本切换器
  - [x] SubTask 8.1: 创建 `src/components/create/PlatformSwitcher.tsx` — 顶部tab栏（观微/抖音/微博/知乎/贴吧/小红书），切换时从Canonical Draft生成对应版本，每个版本独立可编辑
  - [x] SubTask 8.2: 实现"复制+发布"按钮 — clipboard API复制内容 + window.open打开平台发布页

- [x] Task 9: 重写工作间页面
  - [x] SubTask 9.1: 重写 `src/pages/AgentWorldPage.tsx` — 集成AgentPanel+PlatformSwitcher+MarkdownEditor+SnapshotTimeline；空状态展示ExampleGallery；顶部工具栏（返回/保存状态/Assist|Auto切换/求证/发布）；右侧面板（Agent可视化+参考素材合并）
  - [x] SubTask 9.2: 保留现有入口 — 演示模式(?demo=true)、瓜田进入(?melonId=xxx)、草稿持久化、发布流程(PublishTargetSelector+PublishFeedback)
  - [x] SubTask 9.3: 保留案例样板 — ExampleGallery 的 onSelect 填充 Canonical Draft 而非 creationStore

## P2 — 完善性

- [x] Task 10: Mock Search 数据完善
  - [x] SubTask 10.1: 扩展 mockSearchResults.ts — 覆盖更多热门主题关键词，确保搜索结果足够真实（标题+摘要+来源+URL+时间）

- [x] Task 11: Agent错误恢复完善
  - [x] SubTask 11.1: 实现单个Agent失败后的重试/降级/跳过策略 — 用户可见的错误提示+手动重试按钮
  - [x] SubTask 11.2: LLM未配置时禁用Auto模式入口，提示"请先配置AI模型"

- [x] Task 12: 渲染性能优化
  - [x] SubTask 12.1: Agent状态批量更新 — 100ms内状态变更合并为一次渲染（Zustand细粒度selector已实现）
  - [x] SubTask 12.2: 快照时间线虚拟列表（max-h+overflow-y-auto已实现）

# Task Dependencies
- Task 2 depends on Task 1 (Canonical Draft 类型定义)
- Task 3 depends on Task 1 (Commander 需要引用 Canonical Draft 类型)
- Task 4 depends on Task 2 (Agent 需要调用 searchService) and Task 3 (Agent 被 Commander 调度)
- Task 5 depends on Task 1 (Adapter 读取 Canonical Draft) and Task 4 (Writing Agent 产出 Draft)
- Task 6 depends on Task 3 (AgentPanel 订阅 Commander 状态)
- Task 7 depends on Task 1 (快照内容包含 Canonical Draft)
- Task 8 depends on Task 5 (PlatformSwitcher 切换时调用 platformAdapter)
- Task 9 depends on Task 6, Task 7, Task 8 (页面集成所有组件)
- Task 10 depends on Task 2 (扩展 mockSearchResults)
- Task 11 depends on Task 3, Task 4 (错误恢复需要 Commander 和 Agent 支持)
- Task 12 depends on Task 6, Task 7 (性能优化针对 AgentPanel 和 SnapshotTimeline)
