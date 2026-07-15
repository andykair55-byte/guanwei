import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Users, Swords, Trophy, Zap, Clock, Flame, Search } from 'lucide-react'
import { useDebateStore } from '../stores/debateStore'
import { useUserStore } from '../stores/userStore'
import LobbyRoomCard from '../components/debate/LobbyRoomCard'
import DebateOnboarding from '../components/debate/DebateOnboarding'
import { usePlatform } from '../hooks/usePlatform'

const quickTopics = [
  '大学生兼职利大于弊还是弊大于利？',
  '人工智能的发展对人类文明利大于弊还是弊大于利？',
  '短视频正在摧毁年轻人的深度思考能力',
  '大学教育应该更加注重通识教育还是专业教育？',
]

export default function DebateLobby() {
  const navigate = useNavigate()
  const lobbyRooms = useDebateStore(s => s.lobbyRooms)
  const isLoadingLobby = useDebateStore(s => s.isLoadingLobby)
  const fetchLobbyRooms = useDebateStore(s => s.fetchLobbyRooms)
  const userPoints = useUserStore(s => s.user.points)
  const { isWeb } = usePlatform()
  const [activeFilter, setActiveFilter] = useState<'all' | 'waiting' | 'debating'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => { fetchLobbyRooms() }, [fetchLobbyRooms])

  const filteredRooms = lobbyRooms.filter(r => {
    if (activeFilter === 'waiting') return r.status === 'waiting'
    if (activeFilter === 'debating') return r.status === 'debating'
    return true
  })

  // 房间号搜索：输入纯数字或 room-xxx 直接跳转
  const handleSearch = () => {
    const q = searchQuery.trim()
    if (!q) return
    // 支持直接输入房间号跳转
    const roomId = q.startsWith('room-') ? q : /^\d+$/.test(q) ? `room-melon-${q}` : q
    navigate(`/entertainment/debate/room/${roomId}`)
  }

  return (
    <div className="flex flex-col min-h-full bg-paper-texture">
      {/* Header */}
      <div className="sticky top-0 z-20 glass border-b border-line/50">
        <div className={`flex items-center h-14 px-4 ${isWeb ? '' : 'max-w-[480px] mx-auto'}`}>
          <button
            onClick={() => navigate('/entertainment')}
            className="flex items-center gap-1 text-ink-700 text-sm active:opacity-60 press-pop"
          >
            <ArrowLeft size={18} />
            <span>返回</span>
          </button>
          <div className="flex items-center gap-2 ml-3">
            <div className="w-8 h-8 rounded-lg bg-seal/10 flex items-center justify-center">
              <Swords size={16} className="text-seal" />
            </div>
            <div>
              <h1 className="text-[16px] font-bold text-ink-900 leading-tight">娱乐辩论</h1>
              <p className="text-[10px] text-ink-400">6人独立麦位 · AI审核排队 · 认可度积分</p>
            </div>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gold/10 rounded-lg">
            <Zap size={14} className="text-gold" />
            <span className="text-[12px] font-bold text-gold">{userPoints}</span>
          </div>
        </div>
      </div>

      <div className={`flex-1 w-full px-4 py-4 ${isWeb ? 'max-w-4xl mx-auto' : 'max-w-[480px] mx-auto'}`}>
        {/* 快速入口 */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            onClick={() => navigate('/entertainment/debate/room/new')}
            className="group relative overflow-hidden rounded-2xl bg-seal p-4 text-left text-white shadow-seal-glow active:scale-[0.99] transition-transform"
          >
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Swords size={18} />
                <span className="text-[13px] font-bold">快速匹配</span>
              </div>
              <p className="text-[11px] text-white/80 leading-relaxed">随机辩题 · AI 自动补位 · 即时开赛</p>
            </div>
            <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
          </button>

          <button
            onClick={() => navigate('/entertainment/debate/room/new')}
            className="group relative overflow-hidden rounded-2xl bg-ink-900 p-4 text-left text-white active:scale-[0.99] transition-transform"
          >
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Plus size={18} />
                <span className="text-[13px] font-bold">创建房间</span>
              </div>
              <p className="text-[11px] text-white/80 leading-relaxed">自定义辩题 · 邀请好友 · 观战开放</p>
            </div>
            <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-white/5" />
          </button>
        </div>

        {/* 房间号搜索 */}
        <div className="mb-5">
          <div className="flex items-center gap-2 px-3 py-2.5 bg-surface rounded-xl border border-line/30">
            <Search size={16} className="text-ink-400 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
              placeholder="输入房间号搜索加入..."
              className="flex-1 bg-transparent text-[13px] text-ink-800 placeholder:text-ink-faint focus:outline-none"
            />
            <button
              onClick={handleSearch}
              disabled={!searchQuery.trim()}
              className="px-3 py-1 rounded-lg bg-seal text-white text-[12px] font-medium active:scale-95 transition-transform disabled:opacity-40"
            >
              进入
            </button>
          </div>
        </div>

        {/* 热门辩题 */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[13px] font-bold text-ink-700 flex items-center gap-1.5">
              <Flame size={14} className="text-seal" />
              热门辩题
            </h3>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
            {quickTopics.map((topic, i) => (
              <button
                key={i}
                onClick={() => navigate('/entertainment/debate/room/new')}
                className="shrink-0 px-3 py-2 rounded-xl bg-surface border border-line/30 text-[12px] text-ink-700 hover:border-seal/30 hover:shadow-card transition-all text-left max-w-[200px] line-clamp-2"
              >
                {topic}
              </button>
            ))}
          </div>
        </div>

        {/* 筛选 */}
        <div className="flex items-center gap-2 mb-3">
          {[
            { key: 'all', label: '全部' },
            { key: 'waiting', label: '等待中' },
            { key: 'debating', label: '激辩中' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key as typeof activeFilter)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                activeFilter === f.key
                  ? 'bg-ink-900 text-white'
                  : 'bg-paper-dark text-ink-500 hover:text-ink-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* 房间列表 */}
        {isLoadingLobby ? (
          <div className={isWeb ? 'grid grid-cols-2 gap-4' : 'space-y-3'}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-surface rounded-xl p-4 border border-line/30">
                <div className="skeleton h-5 w-3/4 mb-3" />
                <div className="skeleton h-4 w-1/2 mb-2" />
                <div className="skeleton h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="text-center py-12 bg-surface rounded-2xl border border-line/30">
            <Trophy size={36} className="mx-auto text-ink-faint mb-3" />
            <p className="text-[14px] text-ink-400 mb-1">暂无{activeFilter === 'all' ? '' : activeFilter === 'waiting' ? '等待中' : '激辩中'}房间</p>
            <p className="text-[12px] text-ink-faint">点击快速匹配或创建房间开始一场娱乐辩论</p>
          </div>
        ) : isWeb ? (
          <div className="grid grid-cols-2 gap-4">
            {filteredRooms.map(room => (
              <LobbyRoomCard
                key={room.id}
                room={room}
                onClick={() => navigate(`/entertainment/debate/room/${room.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRooms.map(room => (
              <LobbyRoomCard
                key={room.id}
                room={room}
                onClick={() => navigate(`/entertainment/debate/room/${room.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 玩法说明 */}
      <div className={`px-4 pb-6 ${isWeb ? 'max-w-4xl mx-auto w-full' : 'max-w-[480px] mx-auto'}`}>
        <div className="p-4 bg-paper-warm rounded-2xl border border-line/20">
          <h3 className="text-[13px] font-bold text-ink-700 mb-3 flex items-center gap-1.5">
            <Clock size={14} className="text-gold" />
            玩法说明
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px] text-ink-600">
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-seal/10 text-seal flex items-center justify-center text-[10px] font-bold">1</span>
              6人独立麦位
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-seal/10 text-seal flex items-center justify-center text-[10px] font-bold">2</span>
              AI审核排队
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-seal/10 text-seal flex items-center justify-center text-[10px] font-bold">3</span>
              人人发言
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-seal/10 text-seal flex items-center justify-center text-[10px] font-bold">4</span>
              计时轮换
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-seal/10 text-seal flex items-center justify-center text-[10px] font-bold">5</span>
              AI认真度评分
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-gold/10 text-gold flex items-center justify-center text-[10px] font-bold">6</span>
              高光发言榜
            </div>
          </div>
        </div>
      </div>

      <DebateOnboarding mode="entertainment" />
    </div>
  )
}
