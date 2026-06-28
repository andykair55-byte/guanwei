import { Sprout, Leaf, Flower2, Award, Star, Trophy, Diamond } from 'lucide-react'
import { RANK_CONFIG } from '../config/ranks'
import type { Rank } from '../types'
import type { LucideIcon } from 'lucide-react'

const iconMap: Record<string, LucideIcon> = {
  Sprout, Leaf, Flower2, Award, Star, Trophy, Diamond,
}

function getIcon(iconName: string, size: number, className?: string) {
  const Icon = iconMap[iconName]
  if (!Icon) return null
  return <Icon size={size} className={className} />
}

interface RankProgressProps {
  current: Rank
  next: Rank | null
  progress: number
  remaining: number
}

export default function RankProgress({ current, next, progress, remaining }: RankProgressProps) {
  if (!next) {
    return (
      <div className="text-center py-4">
        <div className="mb-2">{getIcon(RANK_CONFIG[current].icon, 32, 'text-seal mx-auto')}</div>
        <div className="text-lg font-bold text-ink">{current}</div>
        <div className="text-sm text-ink-faint mt-1">已达成最高段位</div>
      </div>
    )
  }

  const currentConfig = RANK_CONFIG[current]
  const nextConfig = RANK_CONFIG[next]

  return (
    <div>
      {/* 当前/目标段位 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getIcon(currentConfig.icon, 20, 'text-seal')}
          <span className="text-sm font-medium text-ink">{current}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-ink-faint">{next}</span>
          {getIcon(nextConfig.icon, 20, 'text-ink-400')}
        </div>
      </div>

      {/* 进度条 */}
      <div className="relative h-3 bg-paper-dark rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-seal to-seal-light rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 进度文字 */}
      <div className="flex justify-between mt-2">
        <span className="text-xs text-ink-faint">
          再猜对 <span className="text-seal font-medium">{remaining}</span> 次可升级
        </span>
        <span className="text-xs text-ink-faint">{progress}%</span>
      </div>
    </div>
  )
}
