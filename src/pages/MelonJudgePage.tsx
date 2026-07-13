import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useIsDesktop } from '../hooks/useIsDesktop'

export default function MelonJudgePage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isDesktop = useIsDesktop()

  return (
    <div className="flex flex-col min-h-full bg-paper-texture">
      <div className={`px-5 pt-4 pb-3 flex items-center gap-3 ${isDesktop ? 'max-w-3xl mx-auto w-full' : ''}`}>
        <button onClick={() => navigate('/entertainment/judge')} className="p-1.5 -ml-1.5 rounded-lg hover:bg-paper-dark transition-colors">
          <ArrowLeft size={20} className="text-ink-700" />
        </button>
        <div className="flex-1">
          <h1 className="text-[18px] font-bold text-ink-900">瓜田判官</h1>
          <p className="text-[11px] text-ink-400">瓜 ID: {id}</p>
        </div>
      </div>
      <div className={`flex-1 px-5 pb-8 ${isDesktop ? 'max-w-3xl mx-auto w-full' : ''}`}>
        <p className="text-[14px] text-ink-400 text-center py-20">瓜田判官建设中…</p>
      </div>
    </div>
  )
}
