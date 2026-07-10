import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Construction } from 'lucide-react'
import { useIsDesktop } from '../hooks/useIsDesktop'

export default function ReverseImageSearch() {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()

  return (
    <div className="flex flex-col min-h-full bg-paper-texture">
      {/* 顶部导航 */}
      <div className={`px-5 pt-4 pb-2 flex items-center gap-3 ${isDesktop ? 'max-w-3xl mx-auto w-full' : ''}`}>
        <button onClick={() => navigate(-1)} className="p-1.5 -ml-1.5 rounded-lg hover:bg-paper-dark transition-colors active:scale-95">
          <ArrowLeft size={20} className="text-ink-700" />
        </button>
        <div className="flex-1">
          <h1 className={`${isDesktop ? 'text-xl' : 'text-[16px]'} font-bold text-ink-900`}>反向搜图</h1>
          <p className="text-[11px] text-ink-400">追溯图片源头，发现原始出处</p>
        </div>
      </div>

      {/* 即将开放占位 */}
      <div className={`flex-1 flex flex-col items-center justify-center px-5 ${isDesktop ? 'max-w-3xl mx-auto w-full' : ''}`}>
        <div className="flex flex-col items-center text-center animate-fade-in-up">
          <div className="w-20 h-20 rounded-3xl bg-seal/10 flex items-center justify-center mb-6">
            <Construction size={36} className="text-seal" strokeWidth={1.5} />
          </div>
          <h2 className="text-[20px] font-bold text-ink-900 mb-2">即将开放</h2>
          <p className="text-[13px] text-ink-400 leading-relaxed max-w-xs">
            该功能正在开发中，敬请期待
          </p>
        </div>
      </div>
    </div>
  )
}
