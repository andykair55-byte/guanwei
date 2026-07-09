import { Outlet } from 'react-router-dom'
import TabBar from '../components/TabBar'

export default function MobileLayout() {
  return (
    <div className="flex flex-col h-dvh bg-paper-texture">
      <main className="flex-1 overflow-y-auto overflow-x-hidden mx-auto w-full max-w-[480px] pb-[64px]">
        <div className="animate-page-enter">
          <Outlet />
        </div>
      </main>
      <TabBar />
    </div>
  )
}