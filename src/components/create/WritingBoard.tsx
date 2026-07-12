import { type ReactNode, useState } from 'react'
import { PanelRightClose, PanelRightOpen } from 'lucide-react'

interface WritingBoardProps {
  /** 左侧写作区 */
  children: ReactNode
  /** 右侧参考面板 */
  referencePanel?: ReactNode
}

export default function WritingBoard({ children, referencePanel }: WritingBoardProps) {
  const [panelOpen, setPanelOpen] = useState(true)

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* 左侧：写作区 */}
      <div className="flex-1 overflow-y-auto scrollbar-thin min-w-0">
        <div className="px-5 py-5 max-w-[720px] mx-auto">
          {children}
        </div>
      </div>

      {/* 右侧：参考面板 */}
      {referencePanel && (
        <>
          {/* 桌面端：固定面板 */}
          <div className="hidden md:block w-[300px] flex-shrink-0">
            {referencePanel}
          </div>

          {/* 移动端：浮动切换按钮 + 抽屉 */}
          <div className="md:hidden">
            <button
              onClick={() => setPanelOpen(!panelOpen)}
              className="fixed bottom-4 right-4 z-40 w-10 h-10 rounded-full bg-ink-900 text-paper-0 shadow-lg flex items-center justify-center"
            >
              {panelOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
            </button>

            {panelOpen && (
              <>
                <div
                  className="fixed inset-0 z-30 bg-ink-900/20 md:hidden"
                  onClick={() => setPanelOpen(false)}
                />
                <div className="fixed right-0 top-0 bottom-0 z-30 w-[300px] max-w-[85vw] bg-paper-0 shadow-xl md:hidden">
                  {referencePanel}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}