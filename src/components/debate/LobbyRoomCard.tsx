import { Eye, Coins, Users } from 'lucide-react'

interface LobbyRoomCardProps {
  room: {
    id: string
    topic: string
    status: string
    currentRound: number
    currentPhase: string
    occupiedSeats: number
    maxSeats: number
    spectatorCount: number
    entryCost: number
    affirmLabel: string
    negateLabel: string
  }
  onClick: () => void
}

const STATUS_STYLES: Record<string, string> = {
  waiting: 'bg-bamboo/10 text-bamboo',
  debating: 'bg-seal/10 text-seal',
  paused: 'bg-amber-100 text-amber-600',
  ended: 'bg-border-line/30 text-text-ink-400',
}

const STATUS_LABELS: Record<string, string> = {
  waiting: '等待中',
  debating: '激辩中',
  paused: '暂停',
  ended: '已结束',
}

export default function LobbyRoomCard({ room, onClick }: LobbyRoomCardProps) {
  const seatDots = Array.from({ length: room.maxSeats }, (_, i) => (
    <span
      key={i}
      className={`
        w-2 h-2 rounded-full
        ${i < room.occupiedSeats ? 'bg-text-ink-700' : 'bg-border-line/50'}
      `}
    />
  ))

  return (
    <button
      onClick={onClick}
      className="
        w-full text-left bg-surface border border-border-line rounded-xl
        shadow-card p-4 transition-all hover:shadow-lg active:scale-[0.99]
      "
    >
      {/* Topic + status */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-text-ink-900 leading-snug line-clamp-2 flex-1">
          {room.topic}
        </p>
        <span
          className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[room.status] ?? STATUS_STYLES.waiting}`}
        >
          {STATUS_LABELS[room.status] ?? room.status}
        </span>
      </div>

      {/* Labels */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-medium text-seal bg-seal/10 px-1.5 py-0.5 rounded">
          {room.affirmLabel}
        </span>
        <span className="text-[10px] text-text-ink-400">vs</span>
        <span className="text-[10px] font-medium text-bamboo bg-bamboo/10 px-1.5 py-0.5 rounded">
          {room.negateLabel}
        </span>
      </div>

      {/* Bottom row: seats + spectators + cost */}
      <div className="flex items-center justify-between">
        {/* Seat dots */}
        <div className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5 text-text-ink-400" />
          <div className="flex items-center gap-0.5">{seatDots}</div>
          <span className="text-[10px] text-text-ink-400 ml-1">
            {room.occupiedSeats}/{room.maxSeats}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Spectators */}
          <span className="flex items-center gap-1 text-[10px] text-text-ink-400">
            <Eye className="w-3 h-3" />
            {room.spectatorCount}
          </span>

          {/* Entry cost */}
          <span className="flex items-center gap-1 text-[10px] text-text-ink-400">
            <Coins className="w-3 h-3" />
            {room.entryCost}
          </span>
        </div>
      </div>
    </button>
  )
}
