import type { DebateSeat } from '../../types/debate'
import SeatCard from './SeatCard'

interface DebateStageProps {
  seats: DebateSeat[]
  entryCost?: number
  mySeatIndex?: number | null
  onSeatClick?: (seatIndex: number) => void
}

export default function DebateStage({
  seats,
  entryCost,
  mySeatIndex,
  onSeatClick,
}: DebateStageProps) {
  const affirmSeats = seats.filter((s) => s.side === 'affirm').sort((a, b) => a.index - b.index)
  const negateSeats = seats.filter((s) => s.side === 'negate').sort((a, b) => a.index - b.index)

  return (
    <div className="flex flex-col gap-3 w-full max-w-[480px] mx-auto px-2">
      {/* Affirm row */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-seal whitespace-nowrap w-8 text-center shrink-0">
          正方
        </span>
        <div className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-seal/5 px-3 py-3">
          {affirmSeats.map((seat) => (
            <SeatCard
              key={seat.index}
              seat={seat}
              entryCost={entryCost}
              isMe={mySeatIndex === seat.index}
              onClick={() => onSeatClick?.(seat.index)}
            />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-2 px-10">
        <div className="flex-1 h-px bg-border-line/30" />
        <span className="text-[10px] text-text-ink-400 font-medium">VS</span>
        <div className="flex-1 h-px bg-border-line/30" />
      </div>

      {/* Negate row */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-bamboo whitespace-nowrap w-8 text-center shrink-0">
          反方
        </span>
        <div className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-bamboo/5 px-3 py-3">
          {negateSeats.map((seat) => (
            <SeatCard
              key={seat.index}
              seat={seat}
              entryCost={entryCost}
              isMe={mySeatIndex === seat.index}
              onClick={() => onSeatClick?.(seat.index)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
