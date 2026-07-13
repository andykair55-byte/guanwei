import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Coins, Swords } from 'lucide-react'
import { useDebateStore } from '../stores/debateStore'
import { useUserStore } from '../stores/userStore'
import LobbyRoomCard from '../components/debate/LobbyRoomCard'
import { useIsDesktop } from '../hooks/useIsDesktop'



export default function DebateLobby() {
  const navigate = useNavigate()
  const lobbyRooms = useDebateStore(s => s.lobbyRooms)
  const isLoadingLobby = useDebateStore(s => s.isLoadingLobby)
  const fetchLobbyRooms = useDebateStore(s => s.fetchLobbyRooms)
  const userPoints = useUserStore(s => s.user.points)
  const isDesktop = useIsDesktop()

  useEffect(() => { fetchLobbyRooms() }, [fetchLobbyRooms])

  return (
    <div className="flex flex-col min-h-screen bg-paper-texture">
      {/* Header */}
      <div className="sticky top-0 z-20 glass border-b border-line/50">
        <div className={`flex items-center h-12 px-4 ${isDesktop ? '' : 'max-w-[480px] mx-auto'}`}>
          <button onClick={() => navigate('/entertainment/debate')} className="flex items-center gap-1 text-ink-700 text-sm active:opacity-60">
            <ArrowLeft size={18} />
            <span>返回</span>
          </button>
          <div className="flex items-center gap-2 ml-3">
            <Swords size={18} className="text-seal" />
            <span className="text-[15px] font-semibold text-ink-900">4v4 国赛辩论</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1 px-2.5 py-1 bg-gold/10 rounded-lg">
            <Coins size={14} className="text-gold" />
            <span className="text-[12px] font-medium text-gold">{userPoints}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={`flex-1 w-full px-4 py-4 ${isDesktop ? 'max-w-4xl mx-auto' : 'max-w-[480px] mx-auto'}`}>
        {/* 说明 */}
        <div className="p-3 bg-surface rounded-xl border border-line/30 mb-4">
          <p className="text-[12px] text-ink-500 leading-relaxed">
            4v4 国赛机制辩论。开篇立论 → 攻辩 → 攻辩小结 → 自由辩论 → 总结陈词，5 环节标准流程。人数不足时 AI 自动补位，辩论结束后 AI 裁判多维度评分。
          </p>
        </div>

        {/* 房间列表 */}
        {isLoadingLobby ? (
          <div className={isDesktop ? 'grid grid-cols-2 gap-4' : 'space-y-3'}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-surface rounded-xl p-4 border border-line/30">
                <div className="skeleton h-5 w-3/4 mb-3" />
                <div className="skeleton h-4 w-1/2 mb-2" />
                <div className="skeleton h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : lobbyRooms.length === 0 ? (
          <div className="text-center py-12">
            <Swords size={36} className="mx-auto text-ink-faint mb-3" />
            <p className="text-[14px] text-ink-400 mb-1">暂无辩论房间</p>
            <p className="text-[12px] text-ink-faint">创建第一个房间开始辩论</p>
          </div>
        ) : isDesktop ? (
          <div className="grid grid-cols-2 gap-4">
            {lobbyRooms.map(room => (
              <LobbyRoomCard
                key={room.id}
                room={room}
                onClick={() => navigate(`/entertainment/debate/room/${room.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {lobbyRooms.map(room => (
              <LobbyRoomCard
                key={room.id}
                room={room}
                onClick={() => navigate(`/entertainment/debate/room/${room.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAB: 创建房间 */}
      <button
        onClick={() => navigate('/entertainment/debate/room/new')}
        className="fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full bg-seal text-white shadow-seal-glow flex items-center justify-center active:scale-90 transition-transform"
      >
        <Plus size={24} />
      </button>
    </div>
  )
}
