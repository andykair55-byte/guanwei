# 娱乐大厅验证与补全 Spec

## Why
娱乐大厅（EntertainmentHallPage）已有分类卡片布局（AI竞技场/真人辩论厅等），AIBattle 和 CricketForge 已有基础实现。需要验证三个模式（AI斗蛐蛐/人机对决/多人辩论占位）是否完整可演示，补全缺失功能。

## What Changes
- 验证 `/entertainment` 大厅入口展示三个模式卡片
- 验证 AI 斗蛐蛐完整流程：选角色→自动辩论→裁判评分→弹幕→下注
- 验证人机对决可玩：用户 vs AI 辩手
- 补全多人辩论占位页（显示"即将开放"）
- 补全下注积分结算（BetPanel 已存在，确认结算逻辑）
- 补全弹幕防刷（DanmakuInput 已存在，确认限流）

## Impact
- Affected code:
  - `src/pages/EntertainmentHallPage.tsx` — 确认三模式卡片
  - `src/pages/AIBattle.tsx` — 确认完整流程
  - `src/components/debate/BetPanel.tsx` — 确认结算
  - `src/components/debate/DanmakuInput.tsx` — 确认限流
  - 可能需要新增 `src/pages/MultiplayerDebatePlaceholder.tsx`（如不存在）

## ADDED Requirements

### Requirement: 三模式入口
#### Scenario: 大厅入口
- **WHEN** 用户进入 `/entertainment`
- **THEN** 展示三个模式卡片（AI斗蛐蛐/人机对决/多人辩论）

### Requirement: AI 斗蛐蛐完整流程
#### Scenario: 完整流程
- **WHEN** 用户选择 AI 斗蛐蛐
- **THEN** 可选角色→自动辩论→裁判评分→弹幕→下注

### Requirement: 多人辩论占位
#### Scenario: 占位提示
- **WHEN** 用户点击多人辩论
- **THEN** 显示"即将开放"占位

## 验收标准
- `/entertainment` 三模式卡片可点击
- AI 斗蛐蛐完整流程可走通
- 人机对决可玩
- 多人辩论显示"即将开放"
- 下注结算正确
- 弹幕有防刷

## 约束
- 优先验证现有功能，补全缺失
- 不大幅重构现有代码
- LLM 调用走 callLLM，有降级
- 所有动画包含 prefers-reduced-motion 回退
