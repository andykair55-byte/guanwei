import { AlertTriangle } from 'lucide-react'

interface SeatCardProps {
  seat: {
    index: number
    side: 'affirm' | 'negate'
    status: 'occupied' | 'vacant' | 'locked'
    nickname?: string
    avatar?: string
    roundScore: number
    removalVotes: number
  }
  entryCost?: number
  isMe?: boolean
  onClick?: () => void
}

export default function SeatCard({ seat, entryCost, isMe, onClick }: SeatCardProps) {
  const borderColor = seat.side === 'affirm' ? 'border-seal' : 'border-bamboo'
  const ringClass = isMe ? 'ring-2 ring-offset-1 ring-sky-400' : ''

  if (seat.status === 'vacant') {
    return (
      <button
        onClick={onClick}
        className={`
          flex flex-col items-center justify-center gap-1
          w-[80px] h-[96px] rounded-xl
          border-2 border-dashed border-line
          bg-surface/50 text-text-ink-400
          transition-all hover:border-bamboo hover:bg-bamboo/5
          ${ringClass}
        `}
      >
        <span className="text-xs text-text-ink-400">空位</span>
        {entryCost != null && (
          <span className="text-[10px] text-text-ink-400 flex items-center gap-0.5">
            <CoinsIcon />
            {entryCost}
          </span>
        )}
      </button>
    )
  }

  if (seat.status === 'locked') {
    return (
      <div
        className={`
          flex flex-col items-center justify-center gap-1
          w-[80px] h-[96px] rounded-xl
          border border-line/30 bg-surface/30
          text-text-ink-400
        `}
      >
        <span className="text-lg opacity-40">🔒</span>
        <span className="text-[10px]">已锁定</span>
      </div>
    )
  }

  // occupied
  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col items-center justify-center gap-1
        w-[80px] h-[96px] rounded-xl
        border ${borderColor} bg-surface
        shadow-card transition-all hover:scale-[1.03]
        ${ringClass}
      `}
    >
      {/* Removal vote warning */}
      {seat.removalVotes > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold">
          {seat.removalVotes}
          <AlertTriangle className="w-2.5 h-2.5 inline -mt-0.5" />
        </span>
      )}

      {/* Avatar */}
      <div
        className={`
          w-9 h-9 rounded-full border-2 flex items-center justify-center
          overflow-hidden bg-surface
          ${seat.side === 'affirm' ? 'border-seal' : 'border-bamboo'}
        `}
      >
        {seat.avatar ? (
          <img src={seat.avatar} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs text-text-ink-500">
            {seat.nickname?.charAt(0) ?? '?'}
          </span>
        )}
      </div>

      {/* Nickname */}
      <span className="text-[11px] text-text-ink-700 truncate w-full text-center px-1 leading-tight">
        {seat.nickname}
      </span>

      {/* Score badge */}
      <span
        className={`
          text-[10px] font-semibold px-1.5 py-0.5 rounded-full
          ${seat.side === 'affirm'
            ? 'bg-seal/10 text-seal'
            : 'bg-bamboo/10 text-bamboo'}
        `}
      >
        {seat.roundScore}分
      </span>
    </button>
  )
}

/** Tiny inline coin icon for entry cost */
function CoinsIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="w-3 h-3"
    >
      <circle cx="6" cy="8" r="5" opacity="0.3" />
      <circle cx="10" cy="8" r="5" opacity="0.5" />
    </svg>
  )
}
