# 侧边栏自定义 UI 补全 Spec

## Why
`sidebarStore.ts` 已完整实现（ALL_NAV_ITEMS、enabledItems、addItem、removeItem、保底逻辑、localStorage 持久化），`DesktopSidebar` 已消费 store。但 `SettingsPage` 的"自定义导航"行是占位 UI（`onClick={() => {}}`，value 硬编码"6 个已启用"），未连接 store。需要补全 UI 让用户能真正增删导航项。

## What Changes
- `SettingsPage` 的 `case 'sidebar'` 分支：
  - "自定义导航"行点击后展开导航项管理面板（inline 展开或 Modal）
  - 动态显示已启用数量（读取 `sidebarStore.enabledItems.length`）
  - 列出 `ALL_NAV_ITEMS` 所有可用导航项，按 group 分组展示
  - 每项有开关 toggle，启用→addItem，禁用→removeItem
  - 保底逻辑：至少保留 1 个，最后一个不可禁用
- 视觉规格参考已有 SettingGroup/SettingRow 风格

## Impact
- Affected code:
  - `src/pages/SettingsPage.tsx` — sidebar case 补全 UI

## ADDED Requirements

### Requirement: 导航项管理 UI
#### Scenario: 展开导航项管理
- **WHEN** 用户点击"自定义导航"行
- **THEN** 展开面板显示所有可用导航项，按 group 分组（核心/求证/发现）
- **AND** 每项有 toggle，已启用为绿色

#### Scenario: 切换导航项
- **WHEN** 用户开启某导航项 toggle
- **THEN** 调用 addItem(id)，侧边栏实时更新
- **AND IF** 关闭某项后剩余 0 个
- **THEN** 不允许关闭，提示"至少保留 1 个导航项"

#### Scenario: 动态数量
- **WHEN** 页面渲染时
- **THEN** "自定义导航"行显示动态已启用数量（如"6 个已启用"）

## 验收标准
- 点击"自定义导航"展开面板
- toggle 切换实时生效，侧边栏同步更新
- 最后一个导航项不可禁用
- 数量动态显示
- 刷新页面配置持久化

## 约束
- 只修改 SettingsPage.tsx
- 复用现有 sidebarStore，不改 store
- 复用现有 SettingGroup/SettingRow 组件风格
- 焦点轮廓用 focus-visible
