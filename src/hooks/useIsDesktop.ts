import { useState, useEffect } from 'react'
import { useDeviceFrame } from '../contexts/DeviceFrameContext'

/**
 * 响应式检测当前视口是否为桌面端（>= 768px）。
 *
 * 内置 DeviceFrame 感知：在真机模拟模式下始终返回 false，
 * 确保页面在 PC 模拟手机时渲染移动端布局。
 *
 * 在入口分离完成后，此 hook 将逐步被淘汰——
 * WebApp 中不需要它（永远是桌面），MobileApp 中也不需要（永远是移动端）。
 */
export function useIsDesktop(breakpoint = 768): boolean {
  const { inDeviceFrame } = useDeviceFrame()
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= breakpoint)

  useEffect(() => {
    if (inDeviceFrame) return
    const handler = () => setIsDesktop(window.innerWidth >= breakpoint)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [breakpoint, inDeviceFrame])

  return inDeviceFrame ? false : isDesktop
}