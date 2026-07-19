# 时间线系统完善 Spec

## Why
时间线是求证工具集精简后保留的两个独立工具之一（EXIF + 时间线），关联热点系统。现有 `TimelineBuilder` 和 `EvidenceTimeline`(85行) 需整合增强，提供可视化时间线构建能力，并关联热点事件。

## What Changes
- `TimelineBuilder` 工具页 `/tools/timeline` 增强：
  - 输入区：事件描述/新闻文本
  - 生成区：LLM 提取关键时间节点（mock 阶段用预设 3 个模板：产品发布事件/人物履历/争议事件演变）
  - 可视化区：纵向时间线 + 节点状态色 + 展开收起
- `EvidenceTimeline` 组件增强：复用于瓜田和热点页
  - 节点状态色（confirmed 绿/disputed 黄/unverified 灰）
  - 展开收起动画
  - 节点详情卡片
- 热点系统关联：
  - `HotPage` 替换 hardcoded 为 10 个热点种子数据
  - `HotEventDetailPage` 复用 `EvidenceTimeline` 展示事件演变
  - 每个热点关联 1-2 个瓜
- 时间线发布：构建完成的时间线可"发布为热点讨论"（跳转社区发帖，带时间线快照）
- 时间线帖子详情参考 `unified-post-modal.design/pages/timeline-post.html` 设计稿（badge 橙色渐变）

## Impact
- Affected code:
  - `src/pages/TimelineBuilder.tsx` — 工具页增强
  - `src/components/EvidenceTimeline.tsx` — 节点状态色 + 展开收起
  - `src/pages/HotPage.tsx` — 替换 hardcoded 为 mock 种子
  - `src/pages/HotEventDetailPage.tsx` — 复用 EvidenceTimeline
  - `src/services/mockData.ts` — 新增 10 个热点种子数据
  - `src/stores/evidenceStore.ts` — 时间线节点状态管理

## ADDED Requirements

### Requirement: 时间线构建工具
系统 SHALL 提供时间线构建工具页，用户输入事件描述后生成可视化时间线。

#### Scenario: 生成时间线
- **WHEN** 用户输入事件描述后点击"生成时间线"
- **THEN** 调用 LLM 提取关键时间节点并渲染为纵向时间线
- **AND IF** LLM 不可用
- **THEN** 降级为 3 个预设模板（产品发布事件/人物履历/争议事件演变），用户选择最近匹配

#### Scenario: 空输入防护
- **WHEN** 输入框为空
- **THEN** 禁用生成按钮

### Requirement: 时间线节点状态
#### Scenario: 节点状态展示
- **WHEN** 时间线渲染时
- **THEN** confirmed 节点绿色，disputed 节点黄色，unverified 节点灰色
- **AND** 节点可展开查看详情

### Requirement: 热点种子内容
系统 SHALL 提供 10 个热点事件种子数据，每个关联 1-2 个瓜。

#### Scenario: 浏览热点
- **WHEN** 用户进入热点页
- **THEN** 显示 10 个热点事件
- **AND** 每个热点可点击查看详情，关联瓜可跳转

### Requirement: 时间线发布
#### Scenario: 发布为热点讨论
- **WHEN** 用户点击"发布为热点讨论"
- **THEN** 跳转社区发帖页，带时间线快照内容

## 验收标准
- `/tools/timeline` 可访问，输入文本后生成时间线（mock 或 LLM）
- 时间线节点有状态色，可展开查看详情
- 热点页有 10 条可展示的热点事件
- 热点详情页时间线展示正确
- 关联瓜可跳转到瓜详情
- 时间线可发布为社区帖子
- LLM 不可用时降级为 3 个预设模板

## 约束
- 纯前端 + mock，LLM 可选增强（走 callLLM 但不阻塞）
- 时间线节点冲突时合并展示，标注"多源"
- 热点详情路由 `/hot/:id` 已存在
- 热点页支持 localStorage 持久化收藏功能
- 移动端布局包含底部 padding（pb-[64px]）
- ErrorBoundary 防止全页崩溃
- 骨架屏用于内容加载
