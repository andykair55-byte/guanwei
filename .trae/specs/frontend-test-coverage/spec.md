# spec-16 前端测试补齐

## 背景
前端测试基础设施已就位（vitest + @testing-library/react + jsdom），
但实际测试只有 1 个示例文件 `src/test/example.test.ts`（7 个用例）。
核心组件、store、utils、services 均无测试覆盖。

## 现状
- ✅ vitest.config.ts 配置完整（globals + jsdom + setupFiles）
- ✅ @testing-library/react + @testing-library/jest-dom + @testing-library/user-event 已装
- ✅ src/test/setup.ts 引入 jest-dom
- ✅ example.test.ts 7 个用例全部通过
- ❌ 组件测试：0
- ❌ store 测试：0
- ❌ utils 测试：0
- ❌ services 测试：0

## 任务范围

### 任务 1：utils 测试
- 新建 `src/utils/__tests__/transform.test.ts`
- 测试 `transformUser` 函数：
  - 正常输入：后端 User 格式 → 前端 User 格式
  - 边界：null/undefined 字段
  - 字段映射：`username`、`nickname`、`points`、`rank`、`total_correct`、`total_guesses`
- 先读 `src/utils/transform.ts` 了解实际函数签名

### 任务 2：store 测试
- 新建 `src/stores/__tests__/authStore.test.ts`
- 测试用例（至少 6 个）：
  - `test_initial_state`：初始状态 user=null、token 从 localStorage 读取
  - `test_login_success`：mock api.login 成功，user 和 token 更新
  - `test_login_failure`：mock api.login 抛错，isLoading 回 false，错误向上抛
  - `test_logout`：localStorage 清除，state 重置
  - `test_fetchMe_success`：mock api.getMe 成功，user 更新
  - `test_fetchMe_failure`：mock api.getMe 失败，token 清除
- 用 `vi.mock('../services/api')` mock api 模块
- 用 `vi.stubGlobal('localStorage', ...)` 或 `@vitest/optimistic` mock localStorage

- 新建 `src/stores/__tests__/xiaoWeiStore.test.ts`
- 测试用例（至少 5 个）：
  - `test_canSendMessage_within_limit`：1 分钟内 3 条返回 true
  - `test_canSendMessage_exceed_limit`：第 4 条返回 false
  - `test_addMessage_creates_conversation`：无活跃会话时自动创建
  - `test_addMessage_appends_to_existing`：已有会话时追加
  - `test_newConversation_resets_active`：activeId 置 null

- 新建 `src/stores/__tests__/notificationStore.test.ts`
- 测试用例（至少 4 个）：
  - `test_initial_unread_count`：初始未读数正确
  - `test_mark_all_read`：全部标记已读后未读数为 0
  - `test_mark_one_read`：单条标记已读
  - `test_persistence`：persist 中间件配置正确

### 任务 3：services 测试
- 新建 `src/services/__tests__/api.test.ts`
- 测试用例（至少 6 个）：
  - `test_withFallback_real_success`：realCall 成功，返回真实数据
  - `test_withFallback_real_failure_fallback_mock`：realCall 失败，降级 mock
  - `test_withFallback_backend_unavailable`：backendAvailable=false 直接走 mock
  - `test_request_adds_auth_header`：localStorage 有 token 时请求头含 Authorization
  - `test_request_no_auth_header`：无 token 时请求头无 Authorization
  - `test_request_timeout`：2 秒超时抛错（用 vi.useFakeTimers）
- 用 `vi.fn()` mock fetch
- 用 `vi.stubGlobal('fetch', ...)` 全局 mock

### 任务 4：组件测试（核心组件）
- 新建 `src/components/__tests__/ErrorBoundary.test.tsx`
- 测试用例（至少 4 个）：
  - `test_renders_children_no_error`：无错误时渲染 children
  - `test_renders_error_ui_on_error`：子组件抛错时渲染错误 UI
  - `test_refresh_button_calls_reload`：点击刷新调用 window.location.reload
  - `test_toggle_details`：点击"查看错误详情"展开/收起
- 用一个会抛错的子组件测试错误捕获

- 新建 `src/components/__tests__/RankBadge.test.tsx`
- 测试用例（至少 3 个）：
  - `test_renders_correct_rank_name`：根据 level 显示正确段位名
  - `test_renders_correct_color`：不同段位显示不同颜色
  - `test_level_0_default`：level=0 显示"吃瓜群众"
- 先读 `src/components/RankBadge.tsx` 和 `src/config/ranks.ts` 了解实际接口

- 新建 `src/components/__tests__/TabBar.test.tsx`
- 测试用例（至少 3 个）：
  - `test_renders_5_tabs`：渲染 5 个 tab（社区/瓜田/+/时间线/我的）
  - `test_active_tab_highlighted`：当前 tab 高亮
  - `test_click_tab_navigates`：点击 tab 触发路由跳转
- 用 MemoryRouter 包裹组件

### 任务 5：测试配置完善
- 更新 `src/test/setup.ts`：
  ```typescript
  import '@testing-library/jest-dom/vitest'
  import { afterEach } from 'vitest'
  import { cleanup } from '@testing-library/react'
  
  afterEach(() => {
    cleanup()
    localStorage.clear()
    vi.restoreAllMocks()
  })
  ```
- 更新 `vitest.config.ts` 加 coverage 配置：
  ```typescript
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.*', 'src/test/**', 'src/main.tsx', 'src/**/__tests__/**'],
    },
  }
  ```
- 在 package.json 加 `test:coverage` 脚本：`vitest run --coverage`
- 需要安装 `@vitest/coverage-v8`（加到 devDependencies）

## 不做的事
- 不做 E2E 测试（Playwright/Cypress 不在范围）
- 不测试所有组件（只测核心：ErrorBoundary、RankBadge、TabBar）
- 不测试所有 store（只测 authStore、xiaoWeiStore、notificationStore）
- 不改源代码逻辑（只写测试，发现 bug 报告但不修）
- 不做视觉回归测试

## 验收
- `npm run test` 全部通过（0 failed）
- 新增测试文件至少 7 个
- 新增测试用例至少 30 个
- `npm run test:coverage` 生成覆盖率报告
- 覆盖率目标（参考）：utils > 70%，stores > 50%，components > 30%
- 现有 example.test.ts 7 个用例仍通过
