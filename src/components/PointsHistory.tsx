import { useAuthStore } from '../stores/authStore'
import { Coins, TrendingUp, Award, Gift, ArrowDownLeft, PenLine } from 'lucide-react'
import type { PointsRecord } from '../types'

const TYPE_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  daily_login: { icon: Award, color: 'text-gold', label: '登录奖励' },
  guess_correct: { icon: TrendingUp, color: 'text-bamboo', label: '猜对奖励' },
  invite: { icon: Gift, color: 'text-seal', label: '邀请奖励' },
  content_quality: { icon: Coins, color: 'text-gold', label: '优质内容' },
  exchange: { icon: ArrowDownLeft, color: 'text-ink-faint', label: '积分兑换' },
  creation: { icon: PenLine, color: 'text-purple-600', label: 'AI辅助创作' },
}

// pointsRecords 为空时的兜底 mock 数据（含创作类型，便于演示）
const FALLBACK_RECORDS: PointsRecord[] = [
  {
    id: 'mock-creation-1',
    userId: '',
    amount: 5,
    type: 'creation',
    description: 'AI辅助创作发布奖励',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'mock-creation-2',
    userId: '',
    amount: 5,
    type: 'creation',
    description: 'AI辅助创作质量奖励',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'mock-guess-1',
    userId: '',
    amount: 5,
    type: 'guess_correct',
    description: '猜对「某顶流男星隐婚生子」',
    createdAt: new Date(Date.now() - 10800000).toISOString(),
  },
  {
    id: 'mock-login-1',
    userId: '',
    amount: 5,
    type: 'daily_login',
    description: '每日登录奖励',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
]

export default function PointsHistory() {
  const { pointsRecords } = useAuthStore()
  const records = pointsRecords.length > 0 ? pointsRecords : FALLBACK_RECORDS

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
      {records.map((record) => {
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
