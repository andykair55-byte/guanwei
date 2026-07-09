import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MessageSquare, ChevronRight, MapPin, Calendar, Shield, Flame, Eye, Heart } from 'lucide-react'
import { usePlatform } from '../hooks/usePlatform'

// Mock user profiles for demo
const mockUserProfiles: Record<string, {
  id: string
  nickname: string
  avatar: string
  bio: string
  rank: string
  level: number
  points: number
  totalGuesses: number
  correctGuesses: number
  badges: { name: string; icon: string }[]
  recentMelons: { id: string; title: string; category: string; result?: boolean; participants: number; timeAgo: string }[]
  joinedAt: string
  location: string
  verified: boolean
}> = {
  'u1': {
    id: 'u1', nickname: '真相猎人', avatar: 'https://picsum.photos/seed/u1/120/120',
    bio: '求证达人 | 不信一家之言，只认证据说话',
    rank: '鉴瓜达人', level: 5, points: 12580, totalGuesses: 342, correctGuesses: 278,
    badges: [{ name: '火眼金睛', icon: 'eye' }, { name: '百晓生', icon: 'book' }],
    recentMelons: [
      { id: 'melon-1', title: '某顶流男星被曝隐婚生子', category: '娱乐', result: undefined, participants: 856, timeAgo: '2小时前' },
      { id: 'melon-5', title: '隔夜水和千滚水真的致癌吗', category: '生活科普', result: false, participants: 2341, timeAgo: '5小时前' },
    ],
    joinedAt: '2024-03-15', location: '北京', verified: true,
  },
  'u2': {
    id: 'u2', nickname: '吃瓜达人', avatar: 'https://picsum.photos/seed/u2/120/120',
    bio: '科技数码爱好者 | 专注科技辟谣',
    rank: '瓜田侦探', level: 4, points: 8920, totalGuesses: 215, correctGuesses: 178,
    badges: [{ name: '科技先锋', icon: 'cpu' }],
    recentMelons: [
      { id: 'melon-3', title: '国产手机自研芯片超越高通', category: '科技', result: undefined, participants: 1245, timeAgo: '1小时前' },
    ],
    joinedAt: '2024-05-20', location: '上海', verified: true,
  },
  'u3': {
    id: 'u3', nickname: '柯南附体', avatar: 'https://picsum.photos/seed/u3/120/120',
    bio: '用逻辑拆解每一条信息',
    rank: '鉴瓜学徒', level: 3, points: 5670, totalGuesses: 156, correctGuesses: 112,
    badges: [{ name: '逻辑之眼', icon: 'search' }],
    recentMelons: [
      { id: 'melon-8', title: '某城市地铁乘客集体晕厥', category: '社会热点', result: true, participants: 3456, timeAgo: '3小时前' },
    ],
    joinedAt: '2024-06-10', location: '广州', verified: false,
  },
  'u4': {
    id: 'u4', nickname: '福尔摩斯', avatar: 'https://picsum.photos/seed/u4/120/120',
    bio: '真相只有一个',
    rank: '鉴瓜大师', level: 6, points: 18900, totalGuesses: 523, correctGuesses: 456,
    badges: [{ name: '鉴瓜宗师', icon: 'trophy' }, { name: '百战百胜', icon: 'star' }],
    recentMelons: [
      { id: 'melon-10', title: '某知名企业被曝财务造假', category: '财经', result: true, participants: 5678, timeAgo: '6小时前' },
    ],
    joinedAt: '2024-01-08', location: '深圳', verified: true,
  },
  'u5': {
    id: 'u5', nickname: '八卦小子', avatar: 'https://picsum.photos/seed/u5/120/120',
    bio: '吃瓜前线记者',
    rank: '瓜田新手', level: 2, points: 2340, totalGuesses: 67, correctGuesses: 45,
    badges: [],
    recentMelons: [
      { id: 'melon-12', title: '全网热议的这段视频', category: '娱乐', result: undefined, participants: 890, timeAgo: '1天前' },
    ],
    joinedAt: '2024-08-01', location: '成都', verified: false,
  },
  'u6': {
    id: 'u6', nickname: '鉴证实录', avatar: 'https://picsum.photos/seed/u6/120/120',
    bio: '证据链才是王道',
    rank: '见微先知', level: 7, points: 32100, totalGuesses: 892, correctGuesses: 789,
    badges: [{ name: '终极鉴瓜', icon: 'diamond' }, { name: '全知全能', icon: 'award' }],
    recentMelons: [
      { id: 'melon-15', title: '关于最近流感的传言', category: '生活科普', result: false, participants: 4567, timeAgo: '12小时前' },
    ],
    joinedAt: '2023-11-20', location: '杭州', verified: true,
  },
  // Also add profile entries for author names used in community posts
  '娱乐揭秘君': {
    id: '娱乐揭秘君', nickname: '娱乐揭秘君', avatar: 'https://picsum.photos/seed/ca1/120/120',
    bio: '娱乐圈资深观察者',
    rank: '瓜田侦探', level: 4, points: 7800, totalGuesses: 189, correctGuesses: 145,
    badges: [{ name: '八卦之王', icon: 'flame' }],
    recentMelons: [], joinedAt: '2024-04-10', location: '北京', verified: true,
  },
  '路人甲': {
    id: '路人甲', nickname: '路人甲', avatar: 'https://picsum.photos/seed/ca2/120/120',
    bio: '一个路过的吃瓜群众',
    rank: '吃瓜群众', level: 1, points: 560, totalGuesses: 23, correctGuesses: 15,
    badges: [], recentMelons: [], joinedAt: '2024-09-01', location: '武汉', verified: false,
  },
  '暖心公益': {
    id: '暖心公益', nickname: '暖心公益', avatar: 'https://picsum.photos/seed/ca3/120/120',
    bio: '公益让世界更美好',
    rank: '鉴瓜达人', level: 5, points: 11200, totalGuesses: 298, correctGuesses: 245,
    badges: [{ name: '热心市民', icon: 'heart' }],
    recentMelons: [], joinedAt: '2024-02-14', location: '南京', verified: true,
  },
  '求助人': {
    id: '求助人', nickname: '求助人', avatar: 'https://picsum.photos/seed/ca4/120/120',
    bio: '希望大家帮帮忙',
    rank: '吃瓜群众', level: 1, points: 120, totalGuesses: 5, correctGuesses: 2,
    badges: [], recentMelons: [], joinedAt: '2024-10-01', location: '重庆', verified: false,
  },
  '成分党': {
    id: '成分党', nickname: '成分党', avatar: 'https://picsum.photos/seed/ca5/120/120',
    bio: '用数据说话',
    rank: '瓜田侦探', level: 4, points: 9500, totalGuesses: 267, correctGuesses: 212,
    badges: [{ name: '成分大师', icon: 'search' }],
    recentMelons: [], joinedAt: '2024-03-20', location: '杭州', verified: true,
  },
  '财经观察': {
    id: '财经观察', nickname: '财经观察', avatar: 'https://picsum.photos/seed/ca6/120/120',
    bio: '财经新闻一手掌握',
    rank: '鉴瓜达人', level: 5, points: 13400, totalGuesses: 356, correctGuesses: 298,
    badges: [{ name: '财经达人', icon: 'trending' }],
    recentMelons: [], joinedAt: '2024-01-25', location: '上海', verified: true,
  },
  '历史侦探': {
    id: '历史侦探', nickname: '历史侦探', avatar: 'https://picsum.photos/seed/ca7/120/120',
    bio: '以史为鉴，可以知兴替',
    rank: '鉴瓜大师', level: 6, points: 21000, totalGuesses: 567, correctGuesses: 489,
    badges: [{ name: '历史通', icon: 'book' }],
    recentMelons: [], joinedAt: '2023-12-01', location: '西安', verified: true,
  },
  '寻亲志愿者': {
    id: '寻亲志愿者', nickname: '寻亲志愿者', avatar: 'https://picsum.photos/seed/ca8/120/120',
    bio: '让每一个走失的人都能找到回家的路',
    rank: '鉴瓜达人', level: 5, points: 10800, totalGuesses: 312, correctGuesses: 256,
    badges: [{ name: '爱心使者', icon: 'heart' }],
    recentMelons: [], joinedAt: '2024-02-28', location: '郑州', verified: true,
  },
  '实验达人': {
    id: '实验达人', nickname: '实验达人', avatar: 'https://picsum.photos/seed/ca9/120/120',
    bio: '科学实验出真知',
    rank: '瓜田侦探', level: 4, points: 7200, totalGuesses: 198, correctGuesses: 156,
    badges: [], recentMelons: [], joinedAt: '2024-05-15', location: '长沙', verified: true,
  },
  '无奈子女': {
    id: '无奈子女', nickname: '无奈子女', avatar: 'https://picsum.photos/seed/ca10/120/120',
    bio: '希望大家能帮帮忙',
    rank: '吃瓜群众', level: 1, points: 80, totalGuesses: 3, correctGuesses: 1,
    badges: [], recentMelons: [], joinedAt: '2024-10-05', location: '济南', verified: false,
  },
  'AI鉴别师': {
    id: 'AI鉴别师', nickname: 'AI鉴别师', avatar: 'https://picsum.photos/seed/ca11/120/120',
    bio: '用AI技术辨别真伪',
    rank: '鉴瓜大师', level: 6, points: 19800, totalGuesses: 478, correctGuesses: 412,
    badges: [{ name: 'AI先锋', icon: 'cpu' }],
    recentMelons: [], joinedAt: '2024-02-01', location: '深圳', verified: true,
  },
  '真相挖掘': {
    id: '真相挖掘', nickname: '真相挖掘', avatar: 'https://picsum.photos/seed/ca12/120/120',
    bio: '深挖每一个真相',
    rank: '鉴瓜达人', level: 5, points: 14500, totalGuesses: 389, correctGuesses: 312,
    badges: [{ name: '真相猎人', icon: 'search' }],
    recentMelons: [], joinedAt: '2024-03-10', location: '广州', verified: true,
  },
  '医学生小王': {
    id: '医学生小王', nickname: '医学生小王', avatar: 'https://picsum.photos/seed/ca13/120/120',
    bio: '用专业知识辟谣',
    rank: '瓜田侦探', level: 4, points: 6800, totalGuesses: 178, correctGuesses: 145,
    badges: [], recentMelons: [], joinedAt: '2024-06-01', location: '成都', verified: true,
  },
  '阳光公益团': {
    id: '阳光公益团', nickname: '阳光公益团', avatar: 'https://picsum.photos/seed/ca14/120/120',
    bio: '传递温暖，传递爱',
    rank: '鉴瓜达人', level: 5, points: 11600, totalGuesses: 334, correctGuesses: 278,
    badges: [{ name: '公益先锋', icon: 'heart' }],
    recentMelons: [], joinedAt: '2024-01-15', location: '南京', verified: true,
  },
  '理性吃瓜': {
    id: '理性吃瓜', nickname: '理性吃瓜', avatar: 'https://picsum.photos/seed/ca15/120/120',
    bio: '理性分析，不跟风',
    rank: '鉴瓜大师', level: 6, points: 22500, totalGuesses: 589, correctGuesses: 512,
    badges: [{ name: '理性之光', icon: 'star' }],
    recentMelons: [], joinedAt: '2023-12-10', location: '北京', verified: true,
  },
  '迷茫小白': {
    id: '迷茫小白', nickname: '迷茫小白', avatar: 'https://picsum.photos/seed/ca16/120/120',
    bio: '刚来，求指教',
    rank: '吃瓜群众', level: 1, points: 150, totalGuesses: 8, correctGuesses: 4,
    badges: [], recentMelons: [], joinedAt: '2024-10-10', location: '沈阳', verified: false,
  },
  '技术宅': {
    id: '技术宅', nickname: '技术宅', avatar: 'https://picsum.photos/seed/ca17/120/120',
    bio: '代码改变世界',
    rank: '瓜田侦探', level: 4, points: 8200, totalGuesses: 234, correctGuesses: 189,
    badges: [], recentMelons: [], joinedAt: '2024-04-20', location: '杭州', verified: true,
  },
  '辟谣小助手': {
    id: '辟谣小助手', nickname: '辟谣小助手', avatar: 'https://picsum.photos/seed/ca18/120/120',
    bio: '专业辟谣100年',
    rank: '鉴瓜大师', level: 6, points: 25600, totalGuesses: 678, correctGuesses: 589,
    badges: [{ name: '辟谣专家', icon: 'shield' }],
    recentMelons: [], joinedAt: '2023-11-01', location: '上海', verified: true,
  },
  '毛孩子之家': {
    id: '毛孩子之家', nickname: '毛孩子之家', avatar: 'https://picsum.photos/seed/ca19/120/120',
    bio: '每一个生命都值得被爱',
    rank: '鉴瓜达人', level: 5, points: 9800, totalGuesses: 267, correctGuesses: 218,
    badges: [{ name: '爱心救助', icon: 'heart' }],
    recentMelons: [], joinedAt: '2024-03-01', location: '厦门', verified: true,
  },
  '视频侦探': {
    id: '视频侦探', nickname: '视频侦探', avatar: 'https://picsum.photos/seed/ca20/120/120',
    bio: '逐帧分析，还原真相',
    rank: '鉴瓜大师', level: 6, points: 28900, totalGuesses: 756, correctGuesses: 656,
    badges: [{ name: '视频分析大师', icon: 'eye' }],
    recentMelons: [], joinedAt: '2024-01-05', location: '广州', verified: true,
  },
  '科普中国': {
    id: '科普中国', nickname: '科普中国', avatar: 'https://picsum.photos/seed/ca21/120/120',
    bio: '科学普及，人人有责',
    rank: '见微先知', level: 7, points: 35600, totalGuesses: 923, correctGuesses: 812,
    badges: [{ name: '科普大使', icon: 'award' }],
    recentMelons: [], joinedAt: '2023-10-15', location: '北京', verified: true,
  },
  '真相观察员': {
    id: '真相观察员', nickname: '真相观察员', avatar: 'https://picsum.photos/seed/profile1/80/80',
    bio: '求证达人',
    rank: '鉴瓜达人', level: 5, points: 12580, totalGuesses: 342, correctGuesses: 278,
    badges: [{ name: '火眼金睛', icon: 'eye' }],
    recentMelons: [], joinedAt: '2024-02-20', location: '北京', verified: true,
  },
  '思辨者': {
    id: '思辨者', nickname: '思辨者', avatar: 'https://picsum.photos/seed/profile2/80/80',
    bio: '辩论高手',
    rank: '瓜田侦探', level: 4, points: 8920, totalGuesses: 215, correctGuesses: 178,
    badges: [{ name: '辩论之星', icon: 'flame' }],
    recentMelons: [], joinedAt: '2024-04-01', location: '上海', verified: true,
  },
  '喵喵研究所': {
    id: '喵喵研究所', nickname: '喵喵研究所', avatar: 'https://picsum.photos/seed/profile3/80/80',
    bio: '科学科普博主',
    rank: '瓜田侦探', level: 4, points: 7200, totalGuesses: 198, correctGuesses: 156,
    badges: [{ name: '科普达人', icon: 'star' }],
    recentMelons: [], joinedAt: '2024-05-10', location: '成都', verified: true,
  },
}

const rankColors: Record<string, { bg: string; text: string }> = {
  '吃瓜群众': { bg: 'bg-gray-100', text: 'text-gray-600' },
  '瓜田新手': { bg: 'bg-green-50', text: 'text-green-600' },
  '鉴瓜学徒': { bg: 'bg-blue-50', text: 'text-blue-600' },
  '瓜田侦探': { bg: 'bg-purple-50', text: 'text-purple-600' },
  '鉴瓜达人': { bg: 'bg-amber-50', text: 'text-amber-600' },
  '鉴瓜大师': { bg: 'bg-red-50', text: 'text-red-600' },
  '见微先知': { bg: 'bg-gradient-to-r from-amber-50 to-red-50', text: 'text-amber-700' },
}

function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

function timeSince(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const months = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth())
  if (months >= 12) return `${Math.floor(months / 12)}年`
  if (months > 0) return `${months}个月`
  const days = Math.floor((now.getTime() - date.getTime()) / 86400000)
  return `${days}天`
}

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isWeb } = usePlatform()
  const [isFollowing, setIsFollowing] = useState(false)

  const profile = useMemo(() => {
    if (!id) return null
    return mockUserProfiles[id] || null
  }, [id])

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-paper-texture">
        <div className="w-16 h-16 rounded-xl bg-paper-dark flex items-center justify-center mb-4">
          <MessageSquare size={28} className="text-ink-400" />
        </div>
        <p className="text-ink-500 text-sm font-medium mb-1">用户不存在</p>
        <p className="text-ink-400 text-xs mb-4">该用户可能已被注销</p>
        <button
          onClick={() => navigate(-1)}
          className="px-5 py-2.5 bg-seal text-white rounded-xl text-sm font-medium shadow-seal-glow active:scale-95 transition-transform"
        >
          返回
        </button>
      </div>
    )
  }

  const accuracy = profile.totalGuesses > 0
    ? Math.round((profile.correctGuesses / profile.totalGuesses) * 100)
    : 0

  const rc = rankColors[profile.rank] || rankColors['吃瓜群众']

  return (
    <div className="min-h-full bg-paper-texture pb-6">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-20 glass border-b border-line/50">
        <div className={`flex items-center h-12 px-4 ${isWeb ? 'max-w-3xl mx-auto' : 'max-w-[480px] mx-auto'}`}>
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-ink-700 text-sm active:opacity-60">
            <ArrowLeft size={18} />
            <span>返回</span>
          </button>
          <div className="flex-1 text-center text-[15px] font-semibold text-ink-900">
            用户主页
          </div>
          <div className="w-[60px]" />
        </div>
      </div>

      <div className={`${isWeb ? 'max-w-3xl mx-auto px-6' : 'max-w-[480px] mx-auto px-5'}`}>
        {/* 用户信息卡 */}
        <div className="pt-5 pb-4">
          <div className="flex items-start gap-4">
            <div className="relative">
              <img
                src={profile.avatar}
                alt={profile.nickname}
                className="w-18 h-18 rounded-2xl shadow-card object-cover"
              />
              {profile.verified && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-seal rounded-full flex items-center justify-center">
                  <Shield size={10} className="text-white" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 pt-1">
              <h2 className="text-[20px] font-bold text-ink-900 truncate">{profile.nickname}</h2>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${rc.bg} ${rc.text}`}>
                  {profile.rank}
                </span>
                <span className="text-[12px] text-ink-400">Lv.{profile.level}</span>
              </div>
              <p className="text-[13px] text-ink-600 mt-2 line-clamp-2">{profile.bio}</p>
            </div>

            <button
              onClick={() => setIsFollowing(!isFollowing)}
              className={`shrink-0 px-5 py-2 rounded-xl text-[13px] font-semibold transition-all active:scale-95 ${
                isFollowing
                  ? 'bg-paper-dark text-ink-600 border border-line/30'
                  : 'bg-seal text-white shadow-seal-glow'
              }`}
            >
              {isFollowing ? '已关注' : '+ 关注'}
            </button>
          </div>

          {/* 数据统计 */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { value: formatCount(profile.points), label: '积分', color: 'text-seal' },
              { value: profile.totalGuesses, label: '参与次数', color: 'text-ink-900' },
              { value: `${accuracy}%`, label: '准确率', color: 'text-bamboo' },
            ].map(stat => (
              <div key={stat.label} className="bg-surface rounded-xl p-3 text-center">
                <div className={`text-[20px] font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-[11px] text-ink-400 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* 成就徽章 */}
          {profile.badges.length > 0 && (
            <div className="mt-3">
              <div className="flex flex-wrap gap-2">
                {profile.badges.map((badge, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-seal/8 rounded-lg text-[11px] font-medium text-seal">
                    <Flame size={10} />
                    {badge.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 用户信息 */}
        <div className="bg-surface rounded-xl p-4 mb-3">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-[13px]">
              <MapPin size={13} className="text-ink-400" />
              <span className="text-ink-500">位置</span>
              <span className="text-ink-700 ml-auto">{profile.location}</span>
            </div>
            <div className="flex items-center gap-2 text-[13px]">
              <Calendar size={13} className="text-ink-400" />
              <span className="text-ink-500">加入</span>
              <span className="text-ink-700 ml-auto">{timeSince(profile.joinedAt)}前</span>
            </div>
          </div>
        </div>

        {/* 最近参与的瓜 */}
        <div className="bg-surface rounded-xl p-4">
          <h3 className="text-[14px] font-semibold text-ink-900 mb-3">最近参与</h3>
          {profile.recentMelons.length > 0 ? (
            <div className="space-y-0">
              {profile.recentMelons.map(melon => (
                <button
                  key={melon.id}
                  onClick={() => navigate(`/melon/${melon.id}`)}
                  className="w-full text-left py-2.5 flex items-center gap-3 group border-b border-line/8 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-ink-800 font-medium leading-[1.4] group-hover:text-seal transition-colors line-clamp-1">
                      {melon.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-ink-100/50 text-ink-500">{melon.category}</span>
                      {melon.result !== undefined && (
                        <span className={`text-[11px] font-medium ${melon.result ? 'text-bamboo' : 'text-red-500'}`}>
                          {melon.result ? '已证实' : '已辟谣'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-ink-400">
                    <Eye size={11} />
                    <span className="text-[11px]">{formatCount(melon.participants)}</span>
                  </div>
                  <ChevronRight size={14} className="text-ink-300 group-hover:text-seal transition-colors" />
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Heart size={24} className="mx-auto mb-2 text-ink-faint" />
              <p className="text-[13px] text-ink-400">暂无参与记录</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
