import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PointsHistory from '../components/PointsHistory'

export default function PointsHistoryPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-paper pb-20">
      {/* 头部 */}
      <div className="sticky top-0 bg-paper border-b border-line z-10">
        <div className="flex items-center h-14 px-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-ink-900">
            <ChevronLeft size={24} />
          </button>
          <h1 className="flex-1 text-center font-bold text-ink-900">积分明细</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* 积分记录列表 */}
      <div className="px-4 py-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <PointsHistory />
        </div>
      </div>
    </div>
  )
}
