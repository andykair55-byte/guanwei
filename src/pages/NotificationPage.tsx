import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, MessageCircle, UserPlus, AtSign, Bell, ChevronLeft } from 'lucide-react'

type NotificationType = 'like' | 'comment' | 'follow' | 'mention' | 'system'

interface Notification {
  id: string
  type: NotificationType
  username: string
  avatar: string
  action: string
  content?: string
  targetPreview?: string
  targetImage?: string
  time: string
  read: boolean
}

const TABS = [
  { key: 'all', label: '全部' },
  { key: 'like', label: '赞和收藏' },
  { key: 'comment', label: '评论' },
  { key: 'follow', label: '新增关注' },
] as const

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1', type: 'like', username: '事实猎人', avatar: '事',
    action: '赞了你的笔记', content: '',
    targetPreview: '隔夜水真的致癌吗？专家最新解读', targetImage: 'https://picsum.photos/seed/notif1/100/100',
    time: '5分钟前', read: false,
  },
  {
    id: 'n2', type: 'follow', username: '逻辑怪', avatar: '逻',
    action: '关注了你', content: '',
    time: '15分钟前', read: false,
  },
  {
    id: 'n3', type: 'comment', username: '警惕的大学生', avatar: '警',
    action: '评论了你的笔记', content: '这个分析很到位！我之前差点上当了',
    targetPreview: '兼职刷单诈骗套路解析', targetImage: 'https://picsum.photos/seed/notif2/100/100',
    time: '30分钟前', read: false,
  },
  {
    id: 'n4', type: 'system', username: '观微团队', avatar: '观',
    action: '系统通知', content: '你的等级提升到 Lv.18 啦！继续加油～',
    time: '1小时前', read: true,
  },
  {
    id: 'n5', type: 'mention', username: '保研党', avatar: '保',
    action: '在评论中@了你', content: '@见微侦探 你怎么看这个保研骗局？',
    targetPreview: '5万能买保研名额？揭露内幕', targetImage: 'https://picsum.photos/seed/notif3/100/100',
    time: '2小时前', read: false,
  },
  {
    id: 'n6', type: 'like', username: '理科生求真', avatar: '理',
    action: '收藏了你的笔记', content: '',
    targetPreview: '室温超导事件时间线整理', targetImage: 'https://picsum.photos/seed/notif4/100/100',
    time: '3小时前', read: true,
  },
  {
    id: 'n7', type: 'comment', username: '反思者', avatar: '反',
    action: '回复了你的评论', content: '有道理，闭卷考试确实有它的价值',
    time: '4小时前', read: true,
  },
  {
    id: 'n8', type: 'like', username: '技术宅', avatar: '技',
    action: '赞了你的评论', content: '',
    targetPreview: '校园网提速方案实测', targetImage: 'https://picsum.photos/seed/notif5/100/100',
    time: '昨天', read: true,
  },
]

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
  const [activeTab, setActiveTab] = useState<string>('all')
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS)

  const filtered = activeTab === 'all'
    ? notifications
    : notifications.filter(n => n.type === activeTab)

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  return (
    <div className="h-full flex flex-col bg-white max-w-2xl mx-auto w-full">
      <header className="sticky top-0 z-10 bg-white/98 backdrop-blur-sm border-b border-ink-50">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-paper-100 transition-colors"
          >
            <ChevronLeft size={22} className="text-ink-700" />
          </button>
          <span className="text-[17px] font-semibold text-ink-900">通知</span>
          <button
            onClick={markAllRead}
            className="text-[13px] text-ink-500 hover:text-ink-900 transition-colors"
          >
            全部已读
          </button>
        </div>
        <div className="flex items-center gap-1 px-3 overflow-x-auto scrollbar-none">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative px-4 py-2.5 text-[14px] font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key ? 'text-ink-900' : 'text-ink-400 hover:text-ink-600'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-ink-900 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Bell size={48} className="text-ink-200 mb-3" />
            <p className="text-[14px] text-ink-300">暂无通知</p>
          </div>
        ) : (
          <div>
            {filtered.map(notif => {
              const Icon = TYPE_ICONS[notif.type]
              const iconColor = TYPE_COLORS[notif.type]
              const avatarBg = getAvatarBg(notif.username)
              return (
                <div
                  key={notif.id}
                  className={`flex items-start gap-3 px-5 py-4 border-b border-ink-50 hover:bg-paper-50/50 transition-colors cursor-pointer ${
                    !notif.read ? 'bg-paper-50' : ''
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-[14px] font-bold text-white"
                      style={{ backgroundColor: avatarBg }}
                    >
                      {notif.avatar}
                    </div>
                    <div
                      className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white"
                      style={{ backgroundColor: iconColor }}
                    >
                      <Icon size={10} className="text-white" />
                    </div>
                    {!notif.read && (
                      <span className="absolute -top-0.5 -left-0.5 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] text-ink-800 leading-snug">
                          <span className="font-semibold">{notif.username}</span>
                          <span className="text-ink-500 ml-1">{notif.action}</span>
                        </p>
                        {notif.content && (
                          <p className="text-[13px] text-ink-500 mt-1 line-clamp-2">{notif.content}</p>
                        )}
                      </div>
                      <span className="text-[12px] text-ink-300 flex-shrink-0 mt-0.5">{notif.time}</span>
                    </div>

                    {notif.targetPreview && (
                      <div className="flex items-center gap-3 mt-2 p-2.5 bg-paper-50 rounded-lg">
                        {notif.targetImage && (
                          <img
                            src={notif.targetImage}
                            alt=""
                            className="w-10 h-10 rounded object-cover flex-shrink-0"
                          />
                        )}
                        <p className="text-[13px] text-ink-600 line-clamp-1 flex-1">{notif.targetPreview}</p>
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
