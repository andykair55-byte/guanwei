import { createContext, useContext } from 'react'

interface DeviceFrameContextValue {
  inDeviceFrame: boolean
  notchHeight: number
}

const DeviceFrameContext = createContext<DeviceFrameContextValue>({
  inDeviceFrame: false,
  notchHeight: 0,
})

export function DeviceFrameProvider({ notchHeight, children }: { notchHeight: number; children: React.ReactNode }) {
  return (
    <DeviceFrameContext.Provider value={{ inDeviceFrame: true, notchHeight }}>
      {children}
    </DeviceFrameContext.Provider>
  )
}

// eslint-disable-next-line react/only-export-components -- 标准 Context 模式：Provider + Hook 同文件
export function useDeviceFrame() {
  return useContext(DeviceFrameContext)
}
