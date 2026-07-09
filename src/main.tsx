import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { useAuthStore } from './stores/authStore'
import { detectPlatform, PlatformProvider } from './hooks/usePlatform'
import type { Platform } from './hooks/usePlatform'

// ---- 平台检测 ----
// 优先级: URL 参数 > localStorage 覆盖 > UA 检测
let platform: Platform

const urlPlatform = new URLSearchParams(location.search).get('platform')
if (urlPlatform === 'web' || urlPlatform === 'mobile') {
  platform = urlPlatform
} else {
  const stored = localStorage.getItem('forcePlatform')
  if (stored === 'web' || stored === 'mobile') {
    platform = stored
  } else {
    platform = detectPlatform()
  }
}

// ---- 按平台加载对应入口 ----
const AppComponent = platform === 'web'
  ? lazy(() => import('./entry/WebApp'))
  : lazy(() => import('./entry/MobileApp'))

// ---- 初始化 ----
useAuthStore.getState().init()

// ---- 渲染 ----
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PlatformProvider platform={platform}>
      <Suspense fallback={
        <div className="flex items-center justify-center h-dvh">
          <div className="w-6 h-6 border-2 border-seal/30 border-t-seal rounded-full animate-spin" />
        </div>
      }>
        <AppComponent />
      </Suspense>
    </PlatformProvider>
  </StrictMode>,
)