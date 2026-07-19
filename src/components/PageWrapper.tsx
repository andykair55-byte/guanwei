import { Suspense, type ReactNode } from 'react'
import ErrorBoundary from './ErrorBoundary'

/**
 * 页面级包裹：Suspense + ErrorBoundary
 * - Suspense 处理 lazy 组件加载态
 * - ErrorBoundary 隔离单页崩溃，避免带垮整个应用
 */
export function PageWrapper({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-pulse text-ink-400">加载中...</div>
          </div>
        }
      >
        {children}
      </Suspense>
    </ErrorBoundary>
  )
}

export default PageWrapper
