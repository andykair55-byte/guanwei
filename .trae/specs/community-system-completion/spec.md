# 社区系统完善 Spec

## Why
社区是工作间的下游产出目标之一，也是用户消费内容的核心场景。现有 `CommunityPage`(296行) 和 `CommunityDetailPage`(222行) 需替换 hardcoded 数据为高质量 mock 种子，完善发帖、评论、瓜田联动。社区要让用户看到有真实内容可消费，不能是空壳。

## What Changes
- 10 个官方社区种子数据（科技/娱乐/社会/财经/教育/健康/游戏/体育/旅行/美食）
- 每个社区 5-10 条种子帖子，类型分布：normal 60% / hot 25% / charity 15%
- `CommunityPage` 替换 hardcoded 为 mock 种子数据
- `CommunityDetailPage` 帖子列表 Tab（热门/最新/精华），排序公式：热门 = likes * 0.5 + comments * 0.3 + views * 0.2
- 发帖表单（标题 + 正文 textarea + 图片可选，用 picsum.photos 占位）
- 单层评论（不做嵌套，降低复杂度，支持点赞）
- 瓜田→社区联动：瓜详情页"去社区讨论"按钮跳转 `/community/:melonCommunityId`
- 社区帖子详情用弹窗或页面展示（参考 `unified-post-modal.design/pages/community-post.html` 设计稿，badge 粉色渐变）

## Impact
- Affected code:
  - `src/pages/CommunityPage.tsx` — 替换 hardcoded 为 mock 种子
  - `src/pages/CommunityDetailPage.tsx` — Tab 排序 + 发帖 + 评论
  - `src/services/mockData.ts` — 新增社区种子数据（10 社区 + 50-100 帖子）
  - `src/stores/communityStore.ts`（如不存在则新增）— 社区状态管理
  - `src/components/PostDetailModal.tsx` — 可选扩展支持 community 类型，或 CommunityDetailPage 独立展示
  - `src/components/CommentSection.tsx` — 复用评论组件

## ADDED Requirements

### Requirement: 社区种子内容
系统 SHALL 提供 10 个官方社区，每个社区 5-10 条种子帖子。

#### Scenario: 浏览社区列表
- **WHEN** 用户进入社区页
- **THEN** 显示 10 个社区，每个显示名称/简介/帖子数/成员数
- **AND** 帖子内容质量高，标题贴近真实风格，非明显占位符

### Requirement: 帖子排序
#### Scenario: 切换排序
- **WHEN** 用户在社区详情页切换"热门/最新/精华"Tab
- **THEN** 帖子列表按对应公式重新排序

### Requirement: 发帖
#### Scenario: 发布帖子
- **WHEN** 用户填写标题+正文后点击发布
- **THEN** 帖子出现在列表顶部
- **AND IF** 标题为空
- **THEN** 禁用发布按钮，提示"请输入标题"

#### Scenario: 发帖失败保留
- **WHEN** 发帖失败（网络异常）
- **THEN** 保留输入内容，提示重试

### Requirement: 评论
#### Scenario: 发送评论
- **WHEN** 用户输入评论后点击发送
- **THEN** 评论显示在帖子下方
- **AND** 3 秒内只能发一条（防刷）

### Requirement: 瓜田联动
#### Scenario: 从瓜田进入社区
- **WHEN** 用户在瓜详情页点击"去社区讨论"
- **THEN** 跳转到 `/community/:melonCommunityId`

## 验收标准
- 社区列表展示 10 个社区，数据真实有质感
- 社区详情页三个 Tab 可切换且排序正确
- 发帖后帖子出现在列表顶部
- 评论可发送，有防刷限制
- 瓜详情页"去社区讨论"正确跳转
- 帖子内容质量高，无明显 AI 痕迹或占位符

## 约束
- 纯前端 + mock，不依赖后端
- 帖子详情页响应式宽度，不用 hardcoded max-w-[480px]
- 移动端布局包含底部 padding（pb-[64px]）
- ErrorBoundary 防止全页崩溃
- 骨架屏用于内容加载
- 评论单层，不做嵌套
