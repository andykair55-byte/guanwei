# 瓜田系统完善 Spec

## Why
瓜田是消费侧核心，用户进来的第一件事。现有 `MelonFieldPage`(445行) 和 `MelonDetailPage`(692行) 已有基础版，`PostDetailModal`(894行) 已实现瓜田详情弹窗。但缺少排序 Tab、时间线增强、AI 辅助入口、开奖闭环、管理后台开奖面板。需要完善为可演示的完整闭环。

## What Changes
- 瓜田列表增加排序 Tab（最新/最热，热度公式 = `guesses * 0.6 + evidences * 0.4`）
- `EvidenceTimeline` 增强：节点状态色（confirmed 绿/disputed 黄/unverified 灰）+ 展开收起
- 瓜详情页佐证区顶部增加"AI 辅助写佐证"入口（跳转 `/agent-world?melonId=xxx`，工作间未就绪前用 toast 提示"即将开放"）
- 管理后台 `AdminPage` 增加 MelonManager 子面板：pending 瓜列表 + 一键开奖
- 确认 `PostDetailModal` 开奖闭环：开奖后展示结果 + 实锤报告
- 确认种子内容质量（`mockData.ts` 已有 50+ 条，需确认"已揭晓"状态和结果）

## Impact
- Affected code:
  - `src/pages/MelonFieldPage.tsx` — 排序 Tab
  - `src/pages/MelonDetailPage.tsx` — AI 辅助入口
  - `src/components/PostDetailModal.tsx` — 开奖闭环确认
  - `src/components/EvidenceTimeline.tsx` — 节点状态色 + 展开收起
  - `src/pages/AdminPage.tsx` — 开奖面板
  - `src/stores/verificationStore.ts` — 开奖 action
  - `src/services/mockData.ts` — 确认种子数据"已揭晓"状态

## ADDED Requirements

### Requirement: 瓜田列表排序
系统 SHALL 提供最新/最热两种排序方式，默认按最新排序。

#### Scenario: 切换排序
- **WHEN** 用户点击"最热"Tab
- **THEN** 瓜列表按热度公式重新排序（热度 = guesses * 0.6 + evidences * 0.4）

### Requirement: 时间线节点状态色
系统 SHALL 为时间线节点提供状态色区分。

#### Scenario: 节点状态展示
- **WHEN** 时间线渲染时
- **THEN** confirmed 节点显示绿色，disputed 节点显示黄色，unverified 节点显示灰色
- **AND** 节点可展开收起查看详情

### Requirement: 管理后台开奖
系统 SHALL 提供管理后台开奖面板，管理员可一键开奖。

#### Scenario: 管理员开奖
- **WHEN** 管理员在后台点击"开奖"
- **THEN** 瓜状态变为"已开奖"，展示结果
- **AND** 前端状态同步更新
- **AND IF** 重复开奖
- **THEN** 提示"该瓜已开奖"，不重复操作

### Requirement: 并发安全与幂等
#### Scenario: 重复猜瓜
- **WHEN** 用户对同一瓜重复点击"提交判断"
- **THEN** 第二次提示"已猜过"，localStorage 记录 `guessedMelonIds`

#### Scenario: 佐证幂等
- **WHEN** 用户快速双击提交佐证
- **THEN** 只提交一次，用 `requestId` 去重

## 验收标准
- 瓜田列表 ≥10 条，排序 Tab 可切换且顺序正确
- 时间线节点有颜色区分，可展开收起
- 管理后台开奖面板可用，开奖后前端状态同步
- mock 模式下完整走通"猜瓜→写佐证→等开奖→看结果→积分变化"
- 并发猜瓜和佐证幂等正确

## 约束
- 纯前端 + mock，不依赖后端
- 保留 mock fallback，任何一层挂了不影响用户体验
- 移动端布局包含底部 padding（pb-[64px]）防止 TabBar 遮挡
- ErrorBoundary 防止全页崩溃
- 骨架屏用于内容加载
