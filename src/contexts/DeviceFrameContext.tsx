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

export function useDeviceFrame() {
  return useContext(DeviceFrameContext)
}
