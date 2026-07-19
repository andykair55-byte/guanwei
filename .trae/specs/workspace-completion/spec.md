# 工作间补全 Spec

## Why
工作间（AgentWorldPage）已有完善的五件套布局（WorkspaceSidebar + MarkdownEditor + ActivityStream + CommanderInput + VersionBar + OnboardingGuide），creationStore 已实现草稿+skeleton 管理，creationService 已接入 callLLM + 3 个预设模板降级，PublishTargetSelector 已存在。但策划案要求的 ClaimVerifier（声明核查）、DraftAutoSaver（草稿自动保存）、PresetTemplatePicker（预设模板选择器）尚未创建。需要补全这三个组件并接入工作间。

## What Changes
- 新增 `src/components/create/ClaimVerifier.tsx`：编辑器内联声明核查组件
  - 检测文本中的声明性语句（含"是""有""可以""导致"等关键词的句子）
  - 标记⚠️图标
  - 点击核查按钮调用 callLLM 返回结果（支撑/未支撑/有出入）
  - LLM 不可用时降级为 mock 结果
- 新增 `src/components/create/DraftAutoSaver.tsx`：草稿自动保存
  - 每 3 秒防抖自动保存到 creationStore
  - 显示"已保存"/"保存中..."状态
  - 进入工作间时检测是否有未恢复草稿，提示恢复
- 新增 `src/components/create/PresetTemplatePicker.tsx`：预设模板选择器
  - LLM 不可用时展示 3 个预设模板（事件分析/观点论述/对比评测）
  - 复用 creationService 的 PRESET_TEMPLATES
  - 用户选择后生成骨架写入 creationStore
- 将三个组件接入 AgentWorldPage 或 AISkeletonPanel

## Impact
- Affected code:
  - `src/components/create/ClaimVerifier.tsx`（新增）
  - `src/components/create/DraftAutoSaver.tsx`（新增）
  - `src/components/create/PresetTemplatePicker.tsx`（新增）
  - `src/pages/AgentWorldPage.tsx` — 接入 DraftAutoSaver
  - `src/components/create/AISkeletonPanel.tsx` — 接入 PresetTemplatePicker（LLM 失败时）
  - `src/components/create/MarkdownEditor.tsx` — 接入 ClaimVerifier（可选，或集成到编辑器工具栏）

## ADDED Requirements

### Requirement: 声明核查
#### Scenario: 标记声明
- **WHEN** 用户在编辑器中输入包含声明性语句的文本
- **THEN** 声明性语句标记⚠️图标

#### Scenario: 一键核查
- **WHEN** 用户点击核查按钮
- **THEN** 调用 callLLM 返回结果（支撑/未支撑/有出入）
- **AND IF** LLM 不可用
- **THEN** 降级为 mock 结果

### Requirement: 草稿自动保存
#### Scenario: 自动保存
- **WHEN** 用户编辑过程中
- **THEN** 每 3 秒防抖自动保存到 creationStore
- **AND** 显示"已保存"状态

#### Scenario: 恢复草稿
- **WHEN** 用户进入工作间且有未恢复草稿
- **THEN** 提示"检测到未保存的草稿，是否恢复？"

### Requirement: 预设模板选择
#### Scenario: LLM 降级
- **WHEN** LLM 不可用时用户点击"生成骨架"
- **THEN** 展示 3 个预设模板卡片（事件分析/观点论述/对比评测）
- **AND** 用户选择后生成骨架写入 creationStore

## 验收标准
- ClaimVerifier 可标记声明性语句，一键核查返回结果
- DraftAutoSaver 每 3 秒保存，显示状态，进入时提示恢复
- PresetTemplatePicker 在 LLM 失败时展示 3 个模板
- 所有组件 LLM 不可用时有 mock 降级
- build/lint 通过

## 约束
- 纯前端 + mock fallback
- 复用 creationStore 和 creationService
- 不破坏现有 AgentWorldPage 五件套布局
- 所有动画包含 prefers-reduced-motion 回退
- 焦点轮廓用 focus-visible
