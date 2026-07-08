/**
 * BetPanel — 辩论下注面板
 *
 * 选边下注（正方/反方）+ 固定赔率 1.8 + 每日上限 200 积分 + L2（瓜田新手）以下锁定。
 * 下注扣积分通过 onBet 回调交由父组件处理（实际写 store）。
 * 每日额度记录在 localStorage，key: `bet-today-${userId}`。
 */
import { useState } from 'react'
import { Coins, Lock } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { RANK_CONFIG } from '../../config/ranks'

interface BetPanelProps {
  affirmLabel: string
  negateLabel: string
  onBet: (side: 'affirm' | 'negate', amount: number) => void
  disabled?: boolean
}

const ODDS = 1.8
const DAILY_LIMIT = 200
/** L2=瓜田新手(level 2) 才可下注 */
const MIN_BET_LEVEL = 2

export default function BetPanel({ affirmLabel, negateLabel, onBet, disabled }: BetPanelProps) {
  const { user } = useAuthStore()
  const [side, setSide] = useState<'affirm' | 'negate' | null>(null)
  const [amount, setAmount] = useState(10)
  const [betted, setBetted] = useState<'affirm' | 'negate' | null>(null)

  const userLevel = user ? RANK_CONFIG[user.rank].level : 0
  const canBet = userLevel >= MIN_BET_LEVEL
  const betKey = `bet-today-${user?.id ?? 'anon'}`
  const todayBet = Number(localStorage.getItem(betKey) || 0)
  const remaining = Math.min(DAILY_LIMIT - todayBet, user?.points ?? 0)

  const handleConfirm = () => {
    if (!side || amount <= 0 || amount > remaining) return
    onBet(side, amount)
    setBetted(side)
    localStorage.setItem(betKey, String(todayBet + amount))
  }

  // L2 以下锁定
  if (!canBet) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-ink-50 text-ink-400 text-[12px]">
        <Lock size={14} />
        达到「瓜田新手」段位后可参与下注
      </div>
    )
  }

  // 已下注
  if (betted) {
    return (
      <div className="px-4 py-3 rounded-xl bg-seal/8 text-seal text-[12px] font-medium">
        已下注 {betted === 'affirm' ? affirmLabel : negateLabel} · {amount} 积分 · 赔率 {ODDS}
      </div>
    )
  }

  const maxAmount = Math.min(remaining, DAILY_LIMIT)
  const sliderMax = Math.max(10, maxAmount)

  return (
    <div className="space-y-3">
      {/* 选边 */}
      <div className="grid grid-cols-2 gap-2">
        {([
          { key: 'affirm', label: affirmLabel, color: 'bamboo' },
          { key: 'negate', label: negateLabel, color: 'seal' },
        ] as const).map(opt => (
          <button
            key={opt.key}
            disabled={disabled}
            onClick={() => setSide(opt.key)}
            className={`px-3 py-2.5 rounded-xl text-[12px] font-medium transition-all active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 disabled:opacity-50 ${
              side === opt.key
                ? opt.color === 'bamboo' ? 'bg-bamboo text-white' : 'bg-seal text-white'
                : 'bg-ink-50 text-ink-600'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 下注额度 */}
      <div className="flex items-center gap-2">
        <Coins size={14} className="text-gold" />
        <input
          type="range" min={10} max={sliderMax} step={10}
          value={amount}
          onChange={e => setAmount(Number(e.target.value))}
          disabled={disabled}
          className="flex-1 accent-seal"
        />
        <span className="text-[13px] font-bold text-ink-900 w-12 text-right">{amount}</span>
      </div>

      {/* 确认 */}
      <button
        onClick={handleConfirm}
        disabled={!side || disabled || amount > remaining}
        className="w-full py-2.5 rounded-xl bg-seal text-white text-[13px] font-semibold disabled:opacity-40 active:scale-95 motion-reduce:active:scale-100 transition-all"
      >
        确认下注 · 赔率 {ODDS} · 可赢 +{Math.round(amount * ODDS)}
      </button>

      <p className="text-[11px] text-ink-400 text-center">今日剩余额度 {remaining} / {DAILY_LIMIT}</p>
    </div>
  )
}
