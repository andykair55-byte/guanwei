import { useNavigate } from 'react-router-dom'
import { Heart, MessageCircle, UserPlus, AtSign, Bell, ChevronLeft, CheckCheck } from 'lucide-react'
import { useNotificationStore, type NotificationType } from '../stores/notificationStore'

const TABS = [
  { key: 'all', label: '全部' },
  { key: 'like', label: '赞和收藏' },
  { key: 'comment', label: '评论' },
  { key: 'follow', label: '新增关注' },
] as const

const TYPE_ICONS: Record<NotificationType, typeof Heart> = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  mention: AtSign,
  system: Bell,
}

const TYPE_COLORS: Record<NotificationType, string> = {
  like: '#ef4444',
  comment: '#3b82f6',
  follow: '#10b981',
  mention: '#f59e0b',
  system: '#6b7280',
}

const AVATAR_BG = ['#111', '#c0392b', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']

function getAvatarBg(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_BG[Math.abs(hash) % AVATAR_BG.length]
}

export default function NotificationPage() {
  const navigate = useNavigate()
  const activeTab = useNotificationStore(s => s.activeTab)
  const notifications = useNotificationStore(s => s.notifications)
  const setActiveTab = useNotificationStore(s => s.setActiveTab)
  const markAllRead = useNotificationStore(s => s.markAllRead)

  const filtered = activeTab === 'all'
    ? notifications
    : notifications.filter(n => n.type === activeTab)

  const hasUnread = notifications.some(n => !n.read)

  return (
    <div className="h-full flex flex-col bg-white w-full">
      {/* ── 头部 ── */}
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 h-12 max-w-4xl mx-auto w-full">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#f5f5f5] transition-colors"
          >
            <ChevronLeft size={20} className="text-[#333]" />
          </button>
          <span className="text-[15px] font-bold tracking-tight text-[#111]">通知</span>
          <button
            onClick={markAllRead}
            className={`flex items-center gap-1 text-[12px] transition-colors ${
              hasUnread ? 'text-[#999] hover:text-[#555]' : 'text-[#ccc]'
            }`}
          >
            <CheckCheck size={13} />
            <span>全部已读</span>
          </button>
        </div>

        {/* ── 胶囊式 Tab 栏 ── */}
        <div className="flex items-center gap-2 px-6 pb-3 overflow-x-auto scrollbar-none max-w-4xl mx-auto w-full">
          {TABS.map(tab => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-1.5 text-[13px] font-semibold rounded-full transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                  isActive
                    ? 'text-white shadow-md'
                    : 'bg-[#f5f5f5] text-[#999] hover:bg-[#eee] hover:text-[#555]'
                }`}
                style={isActive ? {
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  boxShadow: '0 2px 8px -2px rgba(16, 185, 129, 0.4)',
                } : {}}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </header>

      {/* ── 内容区 ── */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 max-w-4xl mx-auto w-full">
            <div className="w-12 h-12 rounded-full bg-[#f5f5f5] flex items-center justify-center mb-3">
              <Bell size={22} className="text-[#ccc]" />
            </div>
            <p className="text-[14px] text-[#999]">暂无通知</p>
          </div>
        ) : (
          <div className="space-y-0">
            {filtered.map(notif => {
              const Icon = TYPE_ICONS[notif.type]
              const iconColor = TYPE_COLORS[notif.type]
              const avatarBg = getAvatarBg(notif.username)
              return (
                <div
                  key={notif.id}
                  className="flex items-start gap-3 px-6 py-3.5 border-b border-[#f0f0f0] hover:bg-[#fafafa] transition-colors cursor-pointer max-w-4xl mx-auto w-full"
                >
                  {/* 头像区域 */}
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold text-white ring-1 ring-black/5"
                      style={{ backgroundColor: avatarBg }}
                    >
                      {notif.avatar}
                    </div>
                    <div
                      className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 rounded-full flex items-center justify-center border-[1.5px] border-white"
                      style={{ backgroundColor: iconColor, width: 18, height: 18 }}
                    >
                      <Icon size={9} className="text-white" />
                    </div>
                    {/* 未读小圆点 */}
                    {!notif.read && (
                      <span className="absolute -top-0.5 -left-0.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white" />
                    )}
                  </div>

                  {/* 内容区域 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] text-[#333] leading-snug">
                          <span className="font-semibold text-[#111]">{notif.username}</span>
                          <span className="text-[#999] ml-1">{notif.action}</span>
                        </p>
                        {notif.content && (
                          <p className="text-[13px] text-[#555] mt-1 line-clamp-2">{notif.content}</p>
                        )}
                      </div>
                      <span className="text-[11px] text-[#ccc] flex-shrink-0 mt-0.5">{notif.time}</span>
                    </div>

                    {/* 目标预览卡片 */}
                    {notif.targetPreview && (
                      <div className="flex items-center gap-2.5 mt-2 p-2.5 rounded-xl border border-gray-100 bg-[#fafafa]">
                        {notif.targetImage && (
                          <img
                            src={notif.targetImage}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                          />
                        )}
                        <p className="text-[13px] text-[#555] line-clamp-1 flex-1">{notif.targetPreview}</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
