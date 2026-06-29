import { useAuthStore } from '../stores/authStore'
import { RANK_CONFIG, RANK_ORDER } from '../config/ranks'
import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useDeviceFrame } from '../contexts/DeviceFrameContext'

export default function RankListPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { notchHeight } = useDeviceFrame()

  const headerHeight = notchHeight > 0 ? notchHeight + 56 : 56

  return (
    <div className="min-h-screen bg-paper pb-20">
      {/* 头部 */}
      <div className="sticky top-0 bg-paper border-b border-line z-10">
        <div
          className="flex items-center px-4"
          style={{ height: `${headerHeight}px` }}
        >
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-ink-900">
            <ChevronLeft size={24} />
          </button>
          <h1 className="flex-1 text-center font-bold text-ink-900">段位说明</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* 段位列表 */}
      <div className="px-4 py-4 space-y-3">
        {RANK_ORDER.map((rank) => {
          const config = RANK_CONFIG[rank]
          const isCurrentRank = rank === user.rank
          const isUnlocked = config.level <= RANK_CONFIG[user.rank].level

          return (
            <div
              key={rank}
              className={`bg-white rounded-xl p-4 shadow-sm ${
                isCurrentRank ? 'ring-2 ring-seal' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                {/* 段位图标 */}
                <div className={`text-3xl ${isUnlocked ? '' : 'grayscale opacity-50'}`}>
                  {config.icon}
                </div>

                {/* 段位信息 */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-bold ${isUnlocked ? 'text-ink-900' : 'text-ink-faint'}`}>
                      {rank}
                    </h3>
                    {isCurrentRank && (
                      <span className="text-xs bg-seal text-white px-1.5 py-0.5 rounded">
                        当前
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-faint mt-0.5">Lv.{config.level}</p>

                  {/* 要求 */}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${isUnlocked ? 'bg-bamboo/10 text-bamboo' : 'bg-paper text-ink-faint'}`}>
                      猜对 {config.minCorrect} 次
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${isUnlocked ? 'bg-gold/10 text-gold' : 'bg-paper text-ink-faint'}`}>
                      准确率 {config.minAccuracy}%
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${isUnlocked ? 'bg-seal/10 text-seal' : 'bg-paper text-ink-faint'}`}>
                      参与 {config.minTotal} 次
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 底部说明 */}
      <div className="px-4 py-4 text-center">
        <p className="text-xs text-ink-faint">
          段位根据猜对次数、准确率和参与次数综合评定
        </p>
      </div>
    </div>
  )
}
