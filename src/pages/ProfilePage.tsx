import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Settings, Trophy, Coins, ChevronRight, Award, Loader2, Sprout, Leaf, Flower2, Star, Diamond } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { RANK_CONFIG, getRankProgress } from '../config/ranks'
import RankBadge from '../components/RankBadge'
import RankProgress from '../components/RankProgress'
import { useDeviceFrame } from '../contexts/DeviceFrameContext'
import type { LucideIcon } from 'lucide-react'

const rankIconMap: Record<string, LucideIcon> = {
  Sprout, Leaf, Flower2, Award, Star, Trophy, Diamond,
}

const badgeIconMap: Record<string, LucideIcon> = {
  b1: Sprout,
  b2: Star,
}

export default function ProfilePage() {
  const { user, fetchStats, fetchPoints } = useAuthStore()
  const { notchHeight } = useDeviceFrame()

  useEffect(() => {
    fetchStats()
    fetchPoints(0, 20)
  }, [fetchStats, fetchPoints])

  if (!user) {
    return (
      <div className="flex items-center justify-center py-24 bg-paper-texture">
        <div className="text-center">
          <div className="w-16 h-16 rounded-xl bg-paper-dark flex items-center justify-center mx-auto mb-4">
            <Loader2 size={28} className="text-ink-400 animate-spin" />
          </div>
          <p className="text-ink-500 text-sm font-medium">正在加载...</p>
        </div>
      </div>
    )
  }

  const progress = getRankProgress(user)

  const notchPadding = notchHeight > 0 ? `${notchHeight + 8}px` : undefined

  return (
    <div className="min-h-full bg-paper-texture pb-6">
      {/* 用户信息卡 */}
      <div
        className="px-5 pb-4"
        style={{ paddingTop: notchPadding || '20px' }}
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={user.avatar}
              alt={user.nickname}
              className="w-16 h-16 rounded-xl shadow-card"
            />
            <div className="absolute -bottom-1 -right-1 bg-surface rounded-lg p-0.5 shadow-card">
              {(() => {
                const iconName = RANK_CONFIG[user.rank].icon
                const Icon = rankIconMap[iconName] || Sprout
                return <Icon size={14} className="text-seal" />
              })()}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-[18px] font-bold text-ink-900 truncate">{user.nickname}</h2>
            <div className="flex items-center gap-2 mt-1">
              <RankBadge rank={user.rank} size="sm" />
              <span className="text-[12px] text-ink-400">Lv.{RANK_CONFIG[user.rank].level}</span>
            </div>
          </div>

          <button className="w-9 h-9 rounded-xl bg-surface shadow-card flex items-center justify-center active:scale-95 transition-transform">
            <Settings size={16} className="text-ink-400" />
          </button>
        </div>
      </div>

      {/* 段位进度 */}
      <div className="px-5 mb-3">
        <div className="bg-surface rounded-xl shadow-card p-4">
          <h3 className="text-[12px] font-semibold text-ink-400 mb-3">段位进度</h3>
          <RankProgress
            current={progress.current}
            next={progress.next}
            progress={progress.progress}
            remaining={progress.remaining}
          />
        </div>
      </div>

      {/* 数据统计 */}
      <div className="px-5 grid grid-cols-3 gap-2.5 mb-3">
        {[
          { value: user.points, label: '积分', color: 'text-seal' },
          { value: user.totalGuesses, label: '参与次数', color: 'text-ink-900' },
          {
            value: user.totalGuesses > 0
              ? `${Math.round((user.correctGuesses / user.totalGuesses) * 100)}%`
              : '0%',
            label: '准确率',
            color: 'text-bamboo',
          },
        ].map(stat => (
          <div key={stat.label} className="bg-surface rounded-xl shadow-card p-4 text-center">
            <div className={`text-[22px] font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-[11px] text-ink-400 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* 成就徽章 */}
      <div className="px-5 mb-3">
        <div className="bg-surface rounded-xl shadow-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] font-semibold text-ink-900">成就徽章</h3>
            <span className="text-[11px] text-ink-400">{user.badges.length} 个</span>
          </div>

          {user.badges.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {user.badges.map(badge => {
                const BadgeIcon = badgeIconMap[badge.id] || Star
                return (
                  <div key={badge.id} className="flex flex-col items-center gap-1 p-2.5 bg-paper-dark/60 rounded-xl">
                    <BadgeIcon size={24} className="text-seal" />
                    <span className="text-[11px] text-ink-700 font-medium">{badge.name}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-5">
              <Trophy size={28} className="mx-auto mb-2 text-ink-faint" />
              <p className="text-[13px] text-ink-400">完成猜瓜任务解锁成就</p>
            </div>
          )}
        </div>
      </div>

      {/* 功能入口 */}
      <div className="px-5 space-y-2">
        <Link
          to="/profile/points"
          className="flex items-center justify-between bg-surface rounded-xl shadow-card p-4 active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gold/10 flex items-center justify-center">
              <Coins size={16} className="text-gold" />
            </div>
            <span className="text-[14px] text-ink-900 font-medium">积分明细</span>
          </div>
          <ChevronRight size={16} className="text-ink-400" />
        </Link>

        <Link
          to="/profile/ranks"
          className="flex items-center justify-between bg-surface rounded-xl shadow-card p-4 active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-seal/8 flex items-center justify-center">
              <Award size={16} className="text-seal" />
            </div>
            <span className="text-[14px] text-ink-900 font-medium">段位说明</span>
          </div>
          <ChevronRight size={16} className="text-ink-400" />
        </Link>
      </div>
    </div>
  )
}
