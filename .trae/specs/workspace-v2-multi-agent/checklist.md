# Checklist

## P0 — 核心管线

### Canonical Draft 数据模型
- [ ] `src/types/canonicalDraft.ts` 定义了 CanonicalDraft/FactNode/ClaimNode/ViewpointNode/SectionNode/ReferenceNode 接口
- [ ] `src/stores/canonicalStore.ts` 提供 setDraft/updateFacts/updateClaims/updateViewpoints/updateStructure/getDraft 方法
- [ ] canonicalStore 使用 Zustand+persist，刷新页面数据不丢失

### 搜索API配置+Mock Search
- [ ] `src/stores/llmStore.ts` 新增 searchConfig 字段（provider/apiKey），persist 到 localStorage
- [ ] `src/services/searchService.ts` 提供 search() 入口，根据 provider 分发到 mock/tavily/serpapi
- [ ] `src/config/mockSearchResults.ts` 覆盖3个演示主题，每个返回5-8条结构化结果
- [ ] LLMSettingsPage 新增搜索API配置区域（provider下拉/API Key输入/测试连接按钮）
- [ ] 未配置搜索API时使用Mock Search，Agent面板提示"使用示例搜索数据"
- [ ] 配置Tavily API后Search Agent调用真实Tavily API

### Commander 状态机
- [ ] `src/stores/commanderStore.ts` 定义了 AgentStatus/AgentTask/AgentType 类型
- [ ] 任务队列管理（enqueue/dequeue/retry）可用
- [ ] Agent依赖图实现：Search→Research+Verify→Writing→Adapters
- [ ] 状态广播（subscribe机制）可用，AgentPanel能订阅状态变化
- [ ] Auto模式按依赖图自动调度全管线，连续执行不停顿
- [ ] Assist模式Agent后台运行，产出增量推送到面板
- [ ] Agent失败时标记error状态，已完成结果保留

### 5个 Agent
- [ ] `src/services/agentService.ts` 定义了 Agent 接口（execute/status/onProgress）
- [ ] 主Agent分析主题→生成3-5个搜索关键词
- [ ] Search Agent调用searchService返回结构化结果
- [ ] Research Agent基于搜索结果提炼多角度观点
- [ ] Verify Agent提取事实声明并逐条核查
- [ ] Writing Agent汇总产出生成Canonical Draft（结构化JSON）
- [ ] 所有Agent的LLM调用走callLLM()统一入口，无硬编码provider

### 6个平台 Adapter
- [ ] `src/config/platformTemplates.ts` 定义6个平台模板配置
- [ ] `src/services/platformAdapter.ts` 提供 adaptToPlatform(draft, platform) 函数
- [ ] 观微/知乎输出Markdown长文
- [ ] 抖音输出短视频脚本（[画面]+[口播]格式）
- [ ] 微博输出短文+话题标签
- [ ] 贴吧/小红书输出对应格式
- [ ] 平台Adapter不重复调用搜索和推理，只读取Canonical Draft

### Agent 可视化面板
- [ ] `src/components/create/AgentPanel.tsx` 展示Agent状态卡片列表
- [ ] 状态卡片显示图标+名称+状态+进度指示器
- [ ] 100ms内状态变更合并为一次渲染
- [ ] Agent返回结果时展示产出预览卡片
- [ ] "采纳"按钮将内容插入到MarkdownEditor光标位置
- [ ] "忽略"按钮不采纳结果
- [ ] "替换"按钮替换当前编辑器内容

## P1 — 体验闭环

### 快照回退
- [ ] `src/stores/snapshotStore.ts` 实现 createSnapshot/restoreSnapshot/listSnapshots
- [ ] 快照在用户采纳Agent结果或Auto模式自动修改时创建
- [ ] 快照数量超过50个时淘汰最旧的
- [ ] `src/components/create/SnapshotTimeline.tsx` 展示快照时间线
- [ ] 点击历史节点可回退到该状态

### 平台版本切换器
- [ ] `src/components/create/PlatformSwitcher.tsx` 顶部tab栏展示6个平台
- [ ] 切换平台时从Canonical Draft生成对应版本
- [ ] 每个平台版本独立可编辑
- [ ] "复制+发布"按钮复制内容到剪贴板并打开平台发布页

### 工作间页面
- [ ] AgentWorldPage集成AgentPanel+PlatformSwitcher+MarkdownEditor+SnapshotTimeline
- [ ] 空状态展示ExampleGallery
- [ ] 顶部工具有Assist/Auto模式切换
- [ ] 演示模式(?demo=true)保留可用
- [ ] 瓜田进入(?melonId=xxx)保留可用
- [ ] 草稿持久化保留
- [ ] 发布流程(PublishTargetSelector+PublishFeedback)保留

## P2 — 完善性

- [ ] mockSearchResults覆盖更多热门主题
- [ ] Agent失败后用户可见错误提示+手动重试按钮
- [ ] LLM未配置时禁用Auto模式入口
- [ ] 快照时间线使用虚拟列表
