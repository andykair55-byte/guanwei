import { useAuthStore } from '../stores/authStore'
import { Coins, TrendingUp, Award, Gift, ArrowDownLeft } from 'lucide-react'

const TYPE_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  daily_login: { icon: Award, color: 'text-gold', label: '登录奖励' },
  guess_correct: { icon: TrendingUp, color: 'text-bamboo', label: '猜对奖励' },
  invite: { icon: Gift, color: 'text-seal', label: '邀请奖励' },
  content_quality: { icon: Coins, color: 'text-gold', label: '优质内容' },
  exchange: { icon: ArrowDownLeft, color: 'text-ink-faint', label: '积分兑换' },
}

export default function PointsHistory() {
  const { pointsRecords } = useAuthStore()

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${month}月${day}日 ${hours}:${minutes}`
  }

  return (
    <div className="divide-y divide-line">
      {pointsRecords.map((record) => {
        const config = TYPE_CONFIG[record.type]
        const Icon = config.icon
        
        return (
          <div key={record.id} className="py-3 flex items-start gap-3">
            <div className={`p-2 rounded-full bg-paper ${config.color}`}>
              <Icon size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-ink">{record.description}</div>
              <div className="text-xs text-ink-faint mt-0.5">
                {formatDate(record.createdAt)}
              </div>
            </div>
            <div className={`text-sm font-medium ${record.amount > 0 ? 'text-bamboo' : 'text-ink-faint'}`}>
              {record.amount > 0 ? '+' : ''}{record.amount}
            </div>
          </div>
        )
      })}
    </div>
  )
}
