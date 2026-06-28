import type { Rank } from '../types'

export const RANK_CONFIG: Record<Rank, {
  level: number
  icon: string
  minCorrect: number
  minAccuracy: number
  minTotal: number
}> = {
  '吃瓜群众': { level: 1, icon: 'Sprout', minCorrect: 0, minAccuracy: 0, minTotal: 0 },
  '瓜田新手': { level: 2, icon: 'Leaf', minCorrect: 5, minAccuracy: 30, minTotal: 10 },
  '鉴瓜学徒': { level: 3, icon: 'Flower2', minCorrect: 20, minAccuracy: 40, minTotal: 30 },
  '瓜田侦探': { level: 4, icon: 'Award', minCorrect: 50, minAccuracy: 50, minTotal: 80 },
  '鉴瓜达人': { level: 5, icon: 'Star', minCorrect: 100, minAccuracy: 55, minTotal: 150 },
  '鉴瓜大师': { level: 6, icon: 'Trophy', minCorrect: 200, minAccuracy: 60, minTotal: 300 },
  '见微先知': { level: 7, icon: 'Diamond', minCorrect: 500, minAccuracy: 65, minTotal: 600 },
}

export const RANK_ORDER: Rank[] = [
  '吃瓜群众',
  '瓜田新手',
  '鉴瓜学徒',
  '瓜田侦探',
  '鉴瓜达人',
  '鉴瓜大师',
  '见微先知',
]

export function getRankProgress(user: { rank: Rank; correctGuesses: number; totalGuesses: number }) {
  const currentRank = user.rank
  const currentIndex = RANK_ORDER.indexOf(currentRank)
  const nextRank = currentIndex < RANK_ORDER.length - 1 ? RANK_ORDER[currentIndex + 1] : null

  if (!nextRank) {
    return { current: currentRank, next: null, progress: 100, remaining: 0 }
  }

  const currentConfig = RANK_CONFIG[currentRank]
  const nextConfig = RANK_CONFIG[nextRank]

  const minCorrect = currentConfig.minCorrect
  const targetCorrect = nextConfig.minCorrect
  const range = targetCorrect - minCorrect
  const current = user.correctGuesses - minCorrect
  const progress = Math.min(100, Math.max(0, Math.round((current / range) * 100)))
  const remaining = Math.max(0, targetCorrect - user.correctGuesses)

  return {
    current: currentRank,
    next: nextRank,
    progress,
    remaining,
  }
}
