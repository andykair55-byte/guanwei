import { useState } from 'react'
import { X, Smartphone, ChevronLeft, ChevronRight } from 'lucide-react'
import { DeviceFrameProvider } from '../contexts/DeviceFrameContext'

interface DevicePreset {
  name: string
  width: number
  height: number
  borderRadius: number
  notchWidth: number
  notchHeight: number
  bezel: number
}

const DEVICES: DevicePreset[] = [
  { name: 'iPhone 15 Pro', width: 393, height: 852, borderRadius: 48, notchWidth: 120, notchHeight: 34, bezel: 12 },
  { name: 'iPhone SE', width: 375, height: 667, borderRadius: 32, notchWidth: 0, notchHeight: 0, bezel: 18 },
  { name: 'Pixel 8', width: 412, height: 915, borderRadius: 42, notchWidth: 0, notchHeight: 0, bezel: 10 },
  { name: '小米 14', width: 393, height: 852, borderRadius: 46, notchWidth: 0, notchHeight: 0, bezel: 11 },
]

interface DeviceFrameProps {
  children: React.ReactNode
  onClose: () => void
}

export default function DeviceFrame({ children, onClose }: DeviceFrameProps) {
  const [deviceIndex, setDeviceIndex] = useState(0)
  const device = DEVICES[deviceIndex]

  // 手机外壳原始尺寸
  const phoneW = device.width + device.bezel * 2
  const phoneH = device.height + device.bezel * 2

  // 可用空间：扣除控制栏(~48px)+间距(~80px)后的高度，以及视口宽度的 35%
  const availH = window.innerHeight - 140
  const availW = Math.max(300, window.innerWidth * 0.35)

  // 等比缩放，不超过可用空间
  const scale = Math.min(availH / phoneH, availW / phoneW, 1)

  // 缩放后的布局尺寸（用于撑开父容器）
  const scaledW = Math.round(phoneW * scale)
  const scaledH = Math.round(phoneH * scale)

  const prevDevice = () => setDeviceIndex(i => (i - 1 + DEVICES.length) % DEVICES.length)
  const nextDevice = () => setDeviceIndex(i => (i + 1) % DEVICES.length)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* 半透明遮罩 */}
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-[2px]" />

      {/* 居中面板 */}
      <div
        className="relative flex flex-col items-center gap-3"
        onClick={e => e.stopPropagation()}
      >
        {/* 顶部控制栏 */}
        <div className="flex items-center gap-3 px-4 py-2 bg-ink-900/80 backdrop-blur-md rounded-xl shadow-xl">
          <button onClick={prevDevice} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
            <ChevronLeft size={16} className="text-white/60" />
          </button>
          <div className="flex items-center gap-1.5 min-w-[100px] justify-center">
            <Smartphone size={14} className="text-white/60" />
            <span className="text-[12px] text-white/80 font-medium">{device.name}</span>
          </div>
          <button onClick={nextDevice} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
            <ChevronRight size={16} className="text-white/60" />
          </button>
          <div className="w-px h-4 bg-white/15 mx-1" />
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X size={14} className="text-white/70" />
          </button>
        </div>

        {/* 缩放容器 — 用显式尺寸撑开布局，内部手机壳用 absolute + scale */}
        <div style={{ width: scaledW, height: scaledH }} className="relative">
          <div
            style={{
              width: phoneW,
              height: phoneH,
              borderRadius: device.borderRadius + device.bezel,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
            className="absolute top-0 left-0 bg-ink-900 shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
          >
            {/* 侧边按钮 */}
            <div className="absolute -right-[3px] top-[120px] w-[3px] h-[40px] bg-ink-700 rounded-r-sm" />
            <div className="absolute -right-[3px] top-[180px] w-[3px] h-[40px] bg-ink-700 rounded-r-sm" />
            <div className="absolute -left-[3px] top-[150px] w-[3px] h-[60px] bg-ink-700 rounded-l-sm" />

            {/* 屏幕 */}
            <div
              style={{
                top: device.bezel,
                left: device.bezel,
                width: device.width,
                height: device.height,
                borderRadius: device.borderRadius,
              }}
              className="absolute overflow-hidden bg-paper-texture"
            >
              {/* 刘海 */}
              {device.notchWidth > 0 && (
                <div
                  style={{ width: device.notchWidth, height: device.notchHeight }}
                  className="absolute top-0 left-1/2 -translate-x-1/2 bg-ink-900 rounded-b-[16px] z-30"
                />
              )}
              {device.name === 'Pixel 8' && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-ink-900 z-30" />
              )}
              {device.name === '小米 14' && (
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-ink-800 z-30" />
              )}

              {/* App 内容 */}
              <div className="w-full h-full overflow-hidden">
                <DeviceFrameProvider notchHeight={device.notchHeight}>
                  {children}
                </DeviceFrameProvider>
              </div>
            </div>
          </div>
        </div>

        {/* 底部提示 */}
        <span className="text-[11px] text-white/40">点击外部区域关闭</span>
      </div>
    </div>
  )
}
