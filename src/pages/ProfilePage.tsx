import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Settings, Trophy, Coins, ChevronRight, Award, Loader2,
  Sprout, Leaf, Flower2, Star, Diamond, Cpu, Bell,
  Shield, Bookmark, History, Zap, Sparkles, Gamepad2,
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { RANK_CONFIG, getRankProgress } from '../config/ranks'
import RankBadge from '../components/RankBadge'
import RankProgress from '../components/RankProgress'
import type { LucideIcon } from 'lucide-react'

const rankIconMap: Record<string, LucideIcon> = {
  Sprout, Leaf, Flower2, Award, Star, Trophy, Diamond,
}

const badgeIconMap: Record<string, LucideIcon> = {
  b1: Sprout,
  b2: Star,
}

// ── 像素角色装饰 ──────────────────────────────────────
function PixelAvatarDecor() {
  return (
    <div className="hidden md:block relative" style={{ imageRendering: 'pixelated' }}>
      {/* 像素风格的皇冠/光环 */}
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex gap-0.5">
        {[0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="bg-yellow-300 animate-pulse"
            style={{
              width: 6,
              height: i === 2 ? 12 : 8,
              borderRadius: '1px',
              animationDelay: `${i * 0.15}s`,
              boxShadow: '0 0 4px rgba(253, 224, 71, 0.6)',
            }}
          />
        ))}
      </div>
      {/* 漂浮的像素星星 */}
      <div className="absolute top-2 -left-6 w-2 h-2 bg-pink-400 rotate-45 animate-bounce" style={{ animationDuration: '2s' }} />
      <div className="absolute top-6 -right-5 w-2 h-2 bg-violet-400 rotate-45 animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
      <div className="absolute bottom-0 -left-4 w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
      <div className="absolute -bottom-2 right-0 w-1.5 h-1.5 bg-amber-400 rotate-45 animate-pulse" style={{ animationDelay: '0.8s' }} />
    </div>
  )
}

export default function ProfilePage() {
  const { user, fetchStats, fetchPoints } = useAuthStore()

  useEffect(() => {
    fetchStats()
    fetchPoints(0, 20)
  }, [fetchStats, fetchPoints])

  if (!user) {
    return (
      <div className="flex items-center justify-center py-24"
        style={{ background: 'linear-gradient(180deg, #FAF5FF 0%, #ffffff 200px)' }}
      >
        <div className="text-center">
          <div className="w-16 h-16 rounded-xl bg-purple-100 flex items-center justify-center mx-auto mb-4">
            <Loader2 size={28} className="text-purple-400 animate-spin" />
          </div>
          <p className="text-gray-500 text-sm font-medium">正在加载...</p>
        </div>
      </div>
    )
  }

  const progress = getRankProgress(user)

  const menuItems = [
    { icon: Coins, label: '积分明细', desc: '查看积分获取记录', to: '/profile/points', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
    { icon: Award, label: '段位说明', desc: '了解段位晋升规则', to: '/profile/ranks', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
    { icon: Bell, label: '消息通知', desc: '管理通知偏好', to: '/notifications', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
    { icon: Bookmark, label: '我的收藏', desc: '收藏的帖子和瓜', to: '/settings', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
    { icon: History, label: '浏览历史', desc: '最近浏览的内容', to: '/settings', color: '#f97316', bg: 'rgba(249, 115, 22, 0.1)' },
    { icon: Shield, label: '账号安全', desc: '密码、绑定与隐私', to: '/settings', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
    { icon: Settings, label: '设置', desc: '外观、语言、偏好等', to: '/settings', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)' },
    { icon: Cpu, label: 'LLM 设置', desc: 'AI 模型与接口配置', to: '/settings/llm', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)' },
  ]

  return (
    <div className="min-h-full pb-6 relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #FAF5FF 0%, #ffffff 240px)' }}
    >
      {/* ═══════ 顶部 Banner（个人主题·紫粉渐变）═══════ */}
      <div className="px-6 pt-5 pb-2 relative">
        <div
          className="rounded-2xl overflow-hidden relative"
          style={{
            background: 'linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 35%, #FCE7F3 70%, #FBCFE8 100%)',
            boxShadow: '0 1px 2px rgba(139, 92, 246, 0.08), 0 10px 28px -10px rgba(139, 92, 246, 0.2)',
          }}
        >
          <div className="px-8 py-6 relative z-10">
            {/* 用户信息 */}
            <div className="flex items-start gap-5">
              <div className="relative">
                <img
                  src={user.avatar}
                  alt={user.nickname}
                  className="w-20 h-20 rounded-2xl shadow-lg object-cover border-4 border-white"
                />
                {/* 段位角标 */}
                <div className="absolute -bottom-2 -right-2 bg-white rounded-xl p-1 shadow-md">
                  {(() => {
                    const iconName = RANK_CONFIG[user.rank].icon
                    const Icon = rankIconMap[iconName] || Sprout
                    return <Icon size={16} className="text-violet-500" />
                  })()}
                </div>
                <PixelAvatarDecor />
              </div>

              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-[22px] font-bold text-gray-900 truncate tracking-tight">
                    {user.nickname}
                  </h2>
                  <RankBadge rank={user.rank} size="sm" />
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[12px] text-gray-500">
                    Lv.{RANK_CONFIG[user.rank].level}
                  </span>
                  <span className="text-gray-300 text-[12px]">·</span>
                  <span className="text-[12px] text-gray-500">
                    还差 {progress.remaining} 积分升级
                  </span>
                </div>
                <p className="text-[13px] text-gray-600 mt-2.5 line-clamp-2 max-w-md">
                  {user.bio || '这个人很懒，什么都没写~'}
                </p>
              </div>

              {/* 设置按钮 */}
              <Link
                to="/settings"
                className="shrink-0 w-10 h-10 rounded-xl bg-white/70 backdrop-blur-sm border border-white/60 shadow-sm flex items-center justify-center hover:bg-white hover:shadow-md transition-all active:scale-95"
              >
                <Settings size={18} className="text-gray-500" />
              </Link>
            </div>
          </div>

          {/* 装饰光斑 */}
          <div className="absolute -top-6 right-20 w-32 h-32 rounded-full bg-pink-200/40 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-16 w-24 h-24 rounded-full bg-violet-200/40 blur-xl pointer-events-none" />
          {/* 像素装饰点 */}
          <div className="absolute top-4 right-6 flex gap-0.5 opacity-40">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-1.5 h-1.5 bg-violet-400 rounded-sm" />
            ))}
          </div>
          <div className="absolute bottom-4 right-12 flex gap-0.5 opacity-30">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="w-1 h-1 bg-pink-400 rounded-full" />
            ))}
          </div>
        </div>

        {/* ═══════ 数据统计行 ═══════ */}
        <div className="grid grid-cols-4 gap-3 mt-3">
          {[
            { value: user.points, label: '积分', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', icon: Coins },
            { value: user.totalGuesses, label: '参与', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', icon: Gamepad2 },
            {
              value: user.totalGuesses > 0
                ? `${Math.round((user.correctGuesses / user.totalGuesses) * 100)}%`
                : '0%',
              label: '准确率',
              color: '#10b981',
              bg: 'rgba(16, 185, 129, 0.1)',
              icon: Zap,
            },
            { value: user.publishedCount ?? 0, label: '分析', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', icon: Sparkles },
          ].map(stat => (
            <div
              key={stat.label}
              className="rounded-xl bg-white/70 backdrop-blur-sm p-3 text-center border border-white/60 shadow-sm hover:shadow-md transition-shadow"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-1.5"
                style={{ background: stat.bg }}
              >
                <stat.icon size={14} style={{ color: stat.color }} strokeWidth={2} />
              </div>
              <div className="text-[18px] font-bold text-gray-800 leading-tight">{stat.value}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════ 段位进度 ═══════ */}
      <div className="px-6 mb-3">
        <div
          className="rounded-2xl p-4 bg-white shadow-sm border border-gray-100/60"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-bold text-gray-800 flex items-center gap-2">
              <Trophy size={14} className="text-amber-500" />
              段位进度
            </h3>
            <Link
              to="/profile/ranks"
              className="text-[11px] text-violet-500 font-medium flex items-center gap-0.5 hover:text-violet-600 transition-colors"
            >
              段位说明
              <ChevronRight size={12} />
            </Link>
          </div>
          <RankProgress
            current={progress.current}
            next={progress.next}
            progress={progress.progress}
            remaining={progress.remaining}
          />
        </div>
      </div>

      {/* ═══════ 成就徽章 ═══════ */}
      <div className="px-6 mb-3">
        <div className="rounded-2xl p-4 bg-white shadow-sm border border-gray-100/60">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-bold text-gray-800 flex items-center gap-2">
              <Star size={14} className="text-amber-400 fill-amber-400" />
              成就徽章
            </h3>
            <span className="text-[11px] text-gray-400 font-medium">
              {user.badges.length} 个
            </span>
          </div>

          {user.badges.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {user.badges.map(badge => {
                const BadgeIcon = badgeIconMap[badge.id] || Star
                return (
                  <div
                    key={badge.id}
                    className="flex flex-col items-center gap-1 px-3 py-2.5 bg-gradient-to-b from-violet-50 to-pink-50 rounded-xl border border-violet-100/50"
                  >
                    <BadgeIcon size={22} className="text-violet-500" />
                    <span className="text-[10px] text-gray-600 font-medium">{badge.name}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-4">
              <Trophy size={26} className="mx-auto mb-2 text-gray-300" />
              <p className="text-[12px] text-gray-400">完成猜瓜任务解锁成就</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══════ 功能入口 ═══════ */}
      <div className="px-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-bold text-gray-800 flex items-center gap-2">
            <Sparkles size={14} className="text-violet-500" />
            功能菜单
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {menuItems.map(item => (
            <Link
              key={item.label}
              to={item.to}
              className="flex items-center gap-3 bg-white rounded-xl p-3.5 shadow-sm border border-gray-100/60 active:scale-[0.98] hover:shadow-md hover:border-gray-200/60 transition-all"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: item.bg }}
              >
                <item.icon size={16} style={{ color: item.color }} strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-gray-800 truncate">{item.label}</div>
                <div className="text-[10px] text-gray-400 mt-0.5 truncate">{item.desc}</div>
              </div>
              <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
