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

interface RankBadgeProps {
  rank: Rank
  size?: 'sm' | 'md' | 'lg'
}

export default function RankBadge({ rank, size = 'md' }: RankBadgeProps) {
  const config = RANK_CONFIG[rank]
  
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  const iconSize = size === 'sm' ? 12 : size === 'md' ? 14 : 16

  return (
    <span
      className={`inline-flex items-center gap-1 bg-seal/10 text-seal rounded-full font-medium ${sizeClasses[size]}`}
    >
      {getIcon(config.icon, iconSize, 'text-seal')}
      <span>{rank}</span>
    </span>
  )
}
