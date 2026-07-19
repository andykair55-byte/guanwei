# spec-17 ErrorBoundary 全局包裹 + api.ts 超时优化

## 背景
1. **ErrorBoundary 已实现但未全局包裹**：`src/components/ErrorBoundary.tsx` 已完整实现，但仅在部分页面使用，未在路由层全局包裹，导致某些页面级崩溃仍会白屏
2. **api.ts 超时太短**：`src/services/api.ts:44` 的 `AbortSignal.timeout(2000)` 只有 2 秒，LLM 相关接口（/verify、/moderate）需要 10-15 秒，2 秒超时导致正常请求被误判为失败

## 现状
- ✅ ErrorBoundary 组件完整（刷新/返回首页/错误详情）
- ✅ api.ts withFallback 机制完整
- ❌ ErrorBoundary 未在路由层全局包裹
- ❌ api.ts 所有请求统一 2 秒超时（不区分接口类型）

## 任务范围

### 任务 1：ErrorBoundary 全局包裹
- 先读 `src/entry/WebApp.tsx` 和 `src/entry/MobileApp.tsx` 了解路由结构
- 先读 `src/router/routes.ts` 了解路由配置
- 在 WebApp.tsx 和 MobileApp.tsx 的 `<BrowserRouter>` 内层包裹 `<ErrorBoundary>`
  ```tsx
  <BrowserRouter>
    <ErrorBoundary>
      <Routes>...</Routes>
    </ErrorBoundary>
  </BrowserRouter>
  ```
- 额外在关键页面级组件外层也包裹 ErrorBoundary（避免单页崩溃带垮整个应用）：
  - 修改 `routes.ts`，用 lazy + Suspense + ErrorBoundary 包裹页面组件
  - 或在 WebApp/MobileApp 的 Routes 渲染处用 ErrorBoundary 包裹每个 Route element
  - 推荐方案：新建 `src/components/PageWrapper.tsx`：
    ```tsx
    import { Suspense } from 'react'
    import ErrorBoundary from './ErrorBoundary'
    
    export function PageWrapper({ children }: { children: React.ReactNode }) {
      return (
        <ErrorBoundary>
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center">
            <div className="animate-pulse text-ink-400">加载中...</div>
          </div>}>
            {children}
          </Suspense>
        </ErrorBoundary>
      )
    }
    ```
  - 在 routes.ts 的每个 pageMap 元素外层用 PageWrapper 包裹

### 任务 2：api.ts 超时分级
- 修改 `src/services/api.ts` 的 `request` 函数：
  - 新增 `timeout` 参数（默认 2000ms）：
    ```typescript
    async function request<T>(path: string, options: RequestInit = {}, timeout = 2000): Promise<T> {
      // ...
      const response = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers,
        signal: AbortSignal.timeout(timeout),
      })
      // ...
    }
    ```
  - LLM 相关接口（/verify、/moderate、/models/*）超时改为 15000ms
  - 其他接口保持 2000ms
- 修改 `api` 对象中调用 LLM 接口的地方：
  - `verify`: `request('/verify', {...}, 15000)`
  - `moderate`: `request('/moderate', {...}, 15000)`
  - `getModels` / `setProvider`: `request('/models/...', {...}, 15000)`
  - 先读 api.ts 完整内容找出所有 LLM 相关接口

### 任务 3：api.ts 错误处理增强
- `withFallback` 函数增强：
  - 区分网络错误（降级 mock）和业务错误（422/403 等不降级，直接抛错）
  - 当前实现：realCall 失败就降级 mock，但 422（参数错误）不应该降级
  - 改为：
    ```typescript
    async function withFallback<T>(
      realCall: () => Promise<T>,
      mockCall: () => Promise<T>,
    ): Promise<T> {
      if (backendAvailable === true) {
        try {
          return await realCall()
        } catch (e) {
          // 业务错误（4xx）不降级，直接抛
          if (e instanceof ApiErrorClass && e.code >= 400 && e.code < 500 && e.code !== 401 && e.code !== 429) {
            throw e
          }
          // 网络错误/5xx/401/429 降级到 mock
          backendAvailable = false
          return mockCall()
        }
      }
      // ...
    }
    ```
  - 401（未授权）降级到 mock（因为 mock 模式不需要认证）
  - 429（限流）降级到 mock（避免阻塞用户）
  - 422/403/404 等业务错误直接抛（让前端处理）

### 任务 4：全局 loading 状态
- 在 `src/services/api.ts` 新增简单的全局 loading 事件：
  ```typescript
  type LoadingListener = (isLoading: boolean) => void
  const loadingListeners: Set<LoadingListener> = new Set()
  
  export function onLoadingChange(listener: LoadingListener) {
    loadingListeners.add(listener)
    return () => loadingListeners.delete(listener)
  }
  
  function setLoading(isLoading: boolean) {
    loadingListeners.forEach(l => l(isLoading))
  }
  ```
- 在 `request` 函数开始时 `setLoading(true)`，结束时 `setLoading(false)`
- 不强制要求 UI 接入（阶段 2 可在 TopNavbar 加全局进度条），只提供事件机制

## 不做的事
- 不改 ErrorBoundary 组件本身的实现（已完整）
- 不改 mock 数据
- 不加全局进度条 UI（只提供事件机制）
- 不改后端代码
- 不做请求重试机制（阶段 2 预留）
- 不做请求缓存（阶段 2 预留）

## 验收
- 所有页面级组件被 ErrorBoundary 包裹（手动制造错误不会白屏）
- `/verify` 接口超时改为 15 秒（LLM 调用不再被误判超时）
- 422 业务错误不再降级到 mock（前端能收到真实错误）
- 401/429 仍降级到 mock（保持现有行为）
- `npm run build` 通过
- `npm run test` 全部通过
- `npm run lint` 无新增 error
