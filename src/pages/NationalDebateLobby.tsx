// src/pages/NationalDebateLobby.tsx
// 国赛辩论大厅：4v4 世锦赛赛制

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Users, Swords, Trophy, Zap, Clock, Flame, Gavel, Search } from 'lucide-react'
import { useUserStore } from '../stores/userStore'
import { usePlatform } from '../hooks/usePlatform'
import { NATIONAL_PHASES } from '../types/nationalDebate'
import { NATIONAL_TOPICS } from '../services/nationalDebateService'
import DebateOnboarding from '../components/debate/DebateOnboarding'

/** Mock 国赛房间数据 */
interface NationalLobbyRoom {
  id: string
  topic: string
  affirmLabel: string
  negateLabel: string
  phaseIndex: number
  occupiedSeats: number
  maxSeats: number
  spectatorCount: number
  createdAt: string
}

const MOCK_ROOMS: NationalLobbyRoom[] = [
  {
    id: 'national-demo-1',
    topic: '大学生兼职利大于弊还是弊大于利？',
    affirmLabel: '利大于弊',
    negateLabel: '弊大于利',
    phaseIndex: 0,
    occupiedSeats: 8,
    maxSeats: 8,
    spectatorCount: 47,
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: 'national-demo-2',
    topic: '人工智能的发展对人类文明利大于弊还是弊大于利？',
    affirmLabel: '利大于弊',
    negateLabel: '弊大于利',
    phaseIndex: 3,
    occupiedSeats: 6,
    maxSeats: 8,
    spectatorCount: 128,
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: 'national-demo-3',
    topic: '短视频正在摧毁年轻人的深度思考能力',
    affirmLabel: '是',
    negateLabel: '否',
    phaseIndex: 5,
    occupiedSeats: 8,
    maxSeats: 8,
    spectatorCount: 89,
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
]

const PHASE_LABELS = NATIONAL_PHASES.map(p => p.label)

function NationalRoomCard({ room, onClick }: { room: NationalLobbyRoom; onClick: () => void }) {
  const phaseLabel = PHASE_LABELS[room.phaseIndex] || '已结束'
  const isLive = room.phaseIndex < 5

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-surface border border-line/30 rounded-xl p-4 transition-all hover:shadow-card hover:border-seal/20 active:scale-[0.99]"
    >
      {/* 辩题 + 状态 */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-ink-900 leading-snug line-clamp-2 flex-1">
          {room.topic}
        </p>
        <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${
          isLive ? 'bg-seal/10 text-seal' : 'bg-gold/10 text-gold'
        }`}>
          {isLive ? '进行中' : '评议中'}
        </span>
      </div>

      {/* 正反方标签 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-medium text-seal bg-seal/10 px-1.5 py-0.5 rounded">
          {room.affirmLabel}
        </span>
        <span className="text-[10px] text-ink-400">vs</span>
        <span className="text-[10px] font-medium text-bamboo bg-bamboo/10 px-1.5 py-0.5 rounded">
          {room.negateLabel}
        </span>
        <span className="text-[10px] text-ink-400 ml-1">· {phaseLabel}</span>
      </div>

      {/* 底栏：席位 + 观众 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-ink-400" />
          <span className="text-[10px] text-ink-500 font-medium">{room.occupiedSeats}/{room.maxSeats}</span>
          <span className="text-[10px] text-ink-400">辩手</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[10px] text-ink-400">
            <Swords className="w-3 h-3" />
            {room.spectatorCount}
          </span>
        </div>
      </div>
    </button>
  )
}

export default function NationalDebateLobby() {
  const navigate = useNavigate()
  const userPoints = useUserStore(s => s.user.points)
  const { isWeb } = usePlatform()
  const [activeFilter, setActiveFilter] = useState<'all' | 'live' | 'judging'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // 房间号搜索
  const handleSearch = () => {
    const q = searchQuery.trim()
    if (!q) return
    const roomId = q.startsWith('national-') ? q : /^\d+$/.test(q) ? `national-demo-${q}` : q
    navigate(`/entertainment/debate/national/${roomId}`)
  }

  const filteredRooms = useMemo(() => {
    return MOCK_ROOMS.filter(r => {
      if (activeFilter === 'live') return r.phaseIndex < 5
      if (activeFilter === 'judging') return r.phaseIndex >= 5
      return true
    })
  }, [activeFilter])

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
            <div className="w-8 h-8 rounded-lg bg-ink-900/5 flex items-center justify-center">
              <Gavel size={16} className="text-ink-700" />
            </div>
            <div>
              <h1 className="text-[16px] font-bold text-ink-900 leading-tight">国赛辩论</h1>
              <p className="text-[10px] text-ink-400">4v4 世锦赛赛制 · 评委打分 · 严格流程</p>
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
            onClick={() => navigate('/entertainment/debate/national/new')}
            className="group relative overflow-hidden rounded-2xl bg-ink-900 p-4 text-left text-white active:scale-[0.99] transition-transform"
          >
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Swords size={18} />
                <span className="text-[13px] font-bold">快速匹配</span>
              </div>
              <p className="text-[11px] text-white/70 leading-relaxed">随机辩题 · AI 补位 · 严格赛制</p>
            </div>
            <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-white/5" />
          </button>

          <button
            onClick={() => navigate('/entertainment/debate/national/new')}
            className="group relative overflow-hidden rounded-2xl bg-surface border border-line/40 p-4 text-left active:scale-[0.99] transition-transform"
          >
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Plus size={18} className="text-ink-700" />
                <span className="text-[13px] font-bold text-ink-900">创建房间</span>
              </div>
              <p className="text-[11px] text-ink-500 leading-relaxed">自定义辩题 · 邀请好友 · 观战开放</p>
            </div>
            <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-ink-900/5" />
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
              className="px-3 py-1 rounded-lg bg-ink-900 text-white text-[12px] font-medium active:scale-95 transition-transform disabled:opacity-40"
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
              经典辩题
            </h3>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
            {NATIONAL_TOPICS.map((topic, i) => (
              <button
                key={i}
                onClick={() => navigate('/entertainment/debate/national/new')}
                className="shrink-0 px-3 py-2 rounded-xl bg-surface border border-line/30 text-[12px] text-ink-700 hover:border-seal/30 hover:shadow-card transition-all text-left max-w-[220px] line-clamp-2"
              >
                {topic.topic}
              </button>
            ))}
          </div>
        </div>

        {/* 筛选 */}
        <div className="flex items-center gap-2 mb-3">
          {[
            { key: 'all', label: '全部' },
            { key: 'live', label: '进行中' },
            { key: 'judging', label: '评议中' },
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
        {filteredRooms.length === 0 ? (
          <div className="text-center py-12 bg-surface rounded-2xl border border-line/30">
            <Trophy size={36} className="mx-auto text-ink-faint mb-3" />
            <p className="text-[14px] text-ink-400 mb-1">暂无{activeFilter === 'all' ? '' : activeFilter === 'live' ? '进行中' : '评议中'}房间</p>
            <p className="text-[12px] text-ink-faint">点击快速匹配开始一场国赛辩论</p>
          </div>
        ) : isWeb ? (
          <div className="grid grid-cols-2 gap-4">
            {filteredRooms.map(room => (
              <NationalRoomCard
                key={room.id}
                room={room}
                onClick={() => navigate(`/entertainment/debate/national/${room.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRooms.map(room => (
              <NationalRoomCard
                key={room.id}
                room={room}
                onClick={() => navigate(`/entertainment/debate/national/${room.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 赛制说明 */}
      <div className={`px-4 pb-6 ${isWeb ? 'max-w-4xl mx-auto w-full' : 'max-w-[480px] mx-auto'}`}>
        <div className="p-4 bg-paper-warm rounded-2xl border border-line/20">
          <h3 className="text-[13px] font-bold text-ink-700 mb-3 flex items-center gap-1.5">
            <Clock size={14} className="text-gold" />
            国赛流程 · 华语辩论世锦赛标准
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px] text-ink-600">
            {NATIONAL_PHASES.map((p, i) => (
              <div key={p.phase} className="flex items-center gap-1.5">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  i < 5 ? 'bg-seal/10 text-seal' : 'bg-gold/10 text-gold'
                }`}>
                  {i + 1}
                </span>
                {p.label}
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-line/20 text-[11px] text-ink-500 leading-relaxed">
            评分维度：逻辑 30% · 论据 25% · 反驳 25% · 表达 20%
          </div>
        </div>
      </div>

      <DebateOnboarding mode="national" />
    </div>
  )
}
