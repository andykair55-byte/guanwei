import { createContext, useContext } from 'react'

export type Platform = 'web' | 'mobile'

/**
 * Detect platform at app root.
 * Priority:
 *   1. URL query param `?platform=mobile` (Android WebView sets this)
 *   2. UA detection — Android without Chrome/Safari signals WebView
 *   3. Default to 'web' (desktop browser or iOS/other mobile browser)
 *
 * This runs ONCE at mount. Platform is immutable for the session.
 */
export function detectPlatform(): Platform {
  const params = new URLSearchParams(window.location.search)
  if (params.get('platform') === 'mobile') return 'mobile'

  const ua = navigator.userAgent.toLowerCase()
  const isAndroidWebView = /android/.test(ua) && !/chrome|safari/.test(ua)
  if (isAndroidWebView) return 'mobile'

  return 'web'
}

interface PlatformContextValue {
  platform: Platform
  isWeb: boolean
  isMobile: boolean
}

const PlatformContext = createContext<PlatformContextValue>({
  platform: 'web',
  isWeb: true,
  isMobile: false,
})

export function PlatformProvider({
  platform,
  children,
}: {
  platform: Platform
  children: React.ReactNode
}) {
  return (
    <PlatformContext.Provider value={{ platform, isWeb: platform === 'web', isMobile: platform === 'mobile' }}>
      {children}
    </PlatformContext.Provider>
  )
}

export function usePlatform(): PlatformContextValue {
  return useContext(PlatformContext)
}