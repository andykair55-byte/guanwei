# 观微架构重构 v3 Spec

## Why
观微项目策划案与实际代码存在系统性冲突：AI创作助手（P0）完全缺失、两个P0模块无侧边栏入口、发布页面定位与策划案脱节、通知/私信/工作间为策划案外新增。经过架构审查对话确认了新的模块归属和设计方向，需要同步更新策划案文档并实施P0-P2优先级修复。

## What Changes
- 更新 `docs/plan/` 下全部策划案文档，同步架构审查中确认的设计调整
- 新增"工作间"策划案：AI创作助手为主+LLM求证嵌入+发布到瓜田/社区
- 新增"trae宝"策划案：右下角全局聊天agent（聊天+文本分析+情绪检测+总结+提取关键事实）
- 新增"娱乐大厅"策划案：人机对决+多人辩论+AI斗蛐蛐
- 新增"侧边栏自定义"功能设计
- 更新"用户体系"策划案：保留私信系统，删除"砍掉私信"的描述
- 更新"AI创作助手"策划案：路由从 /create 改为 /agent-world，合并入工作间
- 更新"求证工具集"策划案：情绪检测归入trae宝，反向搜图/洗稿/多源验证砍掉
- 更新"项目模块全景总览"：模块归属表、优先级、路由表全部同步
- 顶部"发布"按钮改为搜索栏，发布入口改为工作间
- 工作间路由从 standalone 改为 layout（需要侧边栏）
- callLLM 统一入口重构：4个hardcode Groq的service改走llmStore.callLLM()
- trae宝全局组件：右下角悬浮+聊天面板+页面上下文注入+会话跨页面保留
- 侧边栏导航重构：新增娱乐入口、实现自定义增删

## Impact
- Affected specs: web-redesign-v2, mvp-core-platform
- Affected code:
  - `src/layouts/WebLayout.tsx` — 顶部搜索栏、trae宝挂载、沉浸式路由调整
  - `src/components/TopNavbar.tsx` — 发布按钮改为搜索
  - `src/components/DesktopSidebar.tsx` — 导航项重构+自定义功能
  - `src/pages/AgentWorldPage.tsx` — 从占位页改为完整工作间
  - `src/components/TraeBot.tsx`（新增）— 全局聊天agent
  - `src/stores/creationStore.ts`（新增）— 创作状态管理
  - `src/services/creationService.ts`（新增）— AI创作调用
  - `src/stores/traeBotStore.ts`（新增）— trae宝会话状态
  - `src/stores/sidebarStore.ts`（新增）— 侧边栏配置持久化
  - `src/router/routes.ts` — 路由调整（工作间改layout、娱乐大厅、工具页清理）
  - `src/entry/WebApp.tsx` — pageMap同步
  - `src/services/aiJudgeService.ts` — callLLM重构
  - `src/services/aiSummaryService.ts` — callLLM重构
  - `src/services/aiTranslatorService.ts` — callLLM重构
  - `src/services/emotionAnalysis.ts` — callLLM重构
  - `docs/plan/` 下全部文档 — 同步更新

## ADDED Requirements

### Requirement: 工作间（AgentWorldPage重构）
系统 SHALL 提供一个以AI创作为主、工具为辅的工作间页面，用户进入后直接看到创作界面，工具嵌入创作流程。

#### Scenario: 用户进入工作间
- **WHEN** 用户点击侧边栏"工作间"
- **THEN** 显示结构化编辑器界面（选题区+骨架展示区+内容填充区）

#### Scenario: AI骨架生成
- **WHEN** 用户输入主题+立场+目标读者后点击"生成骨架"
- **THEN** 调用callLLM生成骨架JSON（标题建议+大纲+待核查标记），渲染到骨架面板
- **AND IF** LLM不可用
- **THEN** 降级为3个预设模板（事件分析/观点论述/对比评测）

#### Scenario: 发布创作内容
- **WHEN** 用户完成创作后点击"发布"
- **THEN** 弹出发布目标选择器，可选择发布到瓜田佐证（弹窗选瓜）或社区帖子（弹窗选社区）

#### Scenario: 草稿持久化
- **WHEN** 用户编辑过程中
- **THEN** 每3秒自动保存草稿到localStorage
- **AND** 重进工作间时恢复草稿

### Requirement: trae宝（全局聊天agent）
系统 SHALL 在所有内容消费页面（瓜田、社区、热点详情）右下角显示trae宝悬浮入口，用户可展开聊天面板与AI对话。

#### Scenario: trae宝展开聊天
- **WHEN** 用户在内容页面点击右下角trae宝图标
- **THEN** 弹出聊天面板，可输入消息
- **AND** trae宝能读取当前页面文章内容作为上下文

#### Scenario: trae宝总结文章
- **WHEN** 用户在瓜详情页点击"总结这篇文章"
- **THEN** trae宝获取页面上下文，调用callLLM生成3-5句话摘要

#### Scenario: trae宝跨页面会话保留
- **WHEN** 用户从瓜详情页导航到社区帖子页
- **THEN** 聊天历史保留，可继续对话

#### Scenario: trae宝限流
- **WHEN** 用户每分钟发送超过3条消息
- **THEN** 提示"trae宝需要休息一下"

#### Scenario: trae宝不在工作间和娱乐大厅显示
- **WHEN** 用户在工作间或娱乐大厅页面
- **THEN** trae宝不显示

### Requirement: 娱乐大厅
系统 SHALL 提供娱乐大厅入口，包含人机对决、多人辩论、AI斗蛐蛐三个模式。

#### Scenario: 用户进入娱乐大厅
- **WHEN** 用户点击侧边栏"娱乐"
- **THEN** 显示三个模式入口卡片

#### Scenario: 多人辩论暂未开放
- **WHEN** 用户点击"多人辩论"
- **THEN** 显示"即将开放"提示

### Requirement: 侧边栏自定义
系统 SHALL 允许用户在设置页增删侧边栏导航项，配置持久化到localStorage。

#### Scenario: 添加导航项
- **WHEN** 用户在设置页勾选一个未添加的模块
- **THEN** 侧边栏立即显示该导航项

#### Scenario: 删除导航项
- **WHEN** 用户取消勾选一个已添加的模块
- **THEN** 侧边栏立即移除该导航项

#### Scenario: 至少保留一个导航项
- **WHEN** 用户尝试删除所有导航项
- **THEN** 提示"至少保留一个导航项"

### Requirement: 顶部搜索栏
系统 SHALL 将顶部导航栏的"发布"按钮替换为搜索框。

#### Scenario: 用户使用搜索
- **WHEN** 用户在搜索框输入关键词
- **THEN** 展示搜索结果（瓜、帖子、热点、用户）

## MODIFIED Requirements

### Requirement: 工作间路由
工作间路由从 standaloneRoutes 移到 layoutRoutes，platform 改为 web。

### Requirement: 发布入口
顶部导航栏"发布"按钮移除，改为搜索框。发布入口改为工作间。PublishPage保留作为快速发布入口。

### Requirement: callLLM统一入口
aiJudgeService、aiSummaryService、aiTranslatorService、emotionAnalysis 四个service全部改用 llmStore.callLLM()，删除hardcode Groq fetch调用。

### Requirement: 右侧面板内容
DesktopRightPanel 的"智能体状态"假数据面板移除，替换为热点摘要/推荐瓜等实际内容，或支持折叠隐藏。

### Requirement: 工具页面清理
- 反向搜图(/tools/reverse-image)、洗稿检测(/tools/plagiarism)、多源验证(/tools/multi-source)路由移除或标记"即将开放"
- 情绪检测(/tools/emotion)独立路由移除，功能归入trae宝
- EXIF分析(/tools/exif)保持独立
- 时间线构建(/tools/timeline)保持独立，关联热点

## REMOVED Requirements

### Requirement: 旧发布按钮
**Reason**: 顶部"发布"按钮改为搜索栏，发布入口移至工作间
**Migration**: 用户通过工作间完成内容发布，PublishPage保留作为快速发布

### Requirement: 旧工作间占位页
**Reason**: 工作间从空占位页变为完整创作界面
**Migration**: AgentWorldPage.tsx 完全重写

### Requirement: 反向搜图/洗稿检测/多源验证独立页面
**Reason**: 需要图片搜索引擎/embedding模型/爬取比对，MVP不可能实现
**Migration**: 路由移除，标记"即将开放"
