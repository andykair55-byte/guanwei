import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Swords, Users, Zap, Flame, Clock, Star, ChevronRight,
} from 'lucide-react'
import { TOPICS } from '../services/debateArenaService'
import { ALL_CHARACTERS } from '../services/characters'
import CharacterIcon from '../components/CharacterIcon'

export default function DebatesPage() {
  const navigate = useNavigate()
  const [selectedAffirm, setSelectedAffirm] = useState<string>('baize')
  const [selectedNegate, setSelectedNegate] = useState<string>('xiezhi')
  const [selectingSide, setSelectingSide] = useState<'affirm' | 'negate' | null>(null)
  const [selectedRounds, setSelectedRounds] = useState(5)

  const affirmChar = ALL_CHARACTERS.find(c => c.id === selectedAffirm)!
  const negateChar = ALL_CHARACTERS.find(c => c.id === selectedNegate)!

  const handleCharSelect = (charId: string) => {
    if (!selectingSide) return
    if (selectingSide === 'affirm') {
      if (charId === selectedNegate) return
      setSelectedAffirm(charId)
    } else {
      if (charId === selectedAffirm) return
      setSelectedNegate(charId)
    }
    setSelectingSide(null)
  }

  const navigateToArena = (topicId: string) => {
    navigate(`/ai-arena/${topicId}?affirm=${selectedAffirm}&negate=${selectedNegate}&rounds=${selectedRounds}`)
  }

  return (
    <div className="flex flex-col min-h-full bg-paper-texture">
      {/* Header */}
      <div className="sticky top-0 z-20 glass border-b border-line/50">
        <div className="px-5 pt-4 pb-3 flex items-center gap-3">
          <button onClick={() => navigate('/melon')} className="p-1.5 -ml-1.5 rounded-lg hover:bg-paper-dark transition-colors active:scale-95">
            <ArrowLeft size={20} className="text-ink-700" />
          </button>
          <div className="flex-1">
            <h1 className="text-[18px] font-bold text-ink-900 tracking-tight">AI 斗蛐蛐</h1>
            <p className="text-[11px] text-ink-400">选角色 · 挑话题 · 看 AI 神仙打架</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-5 pt-4 pb-6 space-y-4">
        {/* ===== Matchup Bar ===== */}
        <div className="bg-surface rounded-xl shadow-card p-4">
          <div className="flex items-center gap-3">
            {/* Affirm slot */}
            <button
              onClick={() => setSelectingSide(selectingSide === 'affirm' ? null : 'affirm')}
              className={`flex-1 text-center transition-all ${selectingSide === 'affirm' ? 'scale-105' : ''}`}
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${affirmChar.visual.gradientFrom} ${affirmChar.visual.gradientTo} flex items-center justify-center mx-auto mb-1.5 shadow-lg ${affirmChar.visual.glowShadow} ${selectingSide === 'affirm' ? 'ring-2 ring-seal ring-offset-2' : ''}`}>
                <CharacterIcon characterId={affirmChar.id} size={22} className="text-white" />
              </div>
              <p className="text-[13px] font-bold text-ink-900">{affirmChar.name}</p>
              <p className={`text-[10px] ${affirmChar.visual.textColor}`}>{affirmChar.stats.winRate} 胜率</p>
            </button>

            {/* VS */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <Swords size={22} className="text-ink-300" />
              <span className="text-[9px] text-ink-400 font-medium">VS</span>
            </div>

            {/* Negate slot */}
            <button
              onClick={() => setSelectingSide(selectingSide === 'negate' ? null : 'negate')}
              className={`flex-1 text-center transition-all ${selectingSide === 'negate' ? 'scale-105' : ''}`}
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${negateChar.visual.gradientFrom} ${negateChar.visual.gradientTo} flex items-center justify-center mx-auto mb-1.5 shadow-lg ${negateChar.visual.glowShadow} ${selectingSide === 'negate' ? 'ring-2 ring-seal ring-offset-2' : ''}`}>
                <CharacterIcon characterId={negateChar.id} size={22} className="text-white" />
              </div>
              <p className="text-[13px] font-bold text-ink-900">{negateChar.name}</p>
              <p className={`text-[10px] ${negateChar.visual.textColor}`}>{negateChar.stats.winRate} 胜率</p>
            </button>
          </div>

          {/* Character selection hint */}
          {selectingSide && (
            <p className="text-[11px] text-center text-seal font-medium mt-2 animate-pulse">
              点击下方角色卡选择{selectingSide === 'affirm' ? '正方' : '反方'}
            </p>
          )}

          {/* Human vs AI button */}
          <button
            onClick={() => navigate(`/ai-battle?negate=${selectedNegate}`)}
            className="w-full mt-3 py-3 rounded-xl bg-gradient-to-r from-seal/10 to-gold/10 border border-seal/15 text-[13px] text-ink-700 font-medium active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Zap size={14} className="text-seal" />
            亲自上场 · 人机对决
          </button>

          {/* 全真人辩论场入口 */}
          <button
            onClick={() => navigate('/debate-lobby')}
            className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-bamboo/10 to-seal/10 border border-bamboo/15 text-[13px] text-ink-700 font-medium active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Users size={14} className="text-bamboo" />
            全真人辩论场 · 3v3 对抗
            <ChevronRight size={14} className="-ml-0.5" />
          </button>

          {/* Round Table button */}
          <button
            onClick={() => navigate('/round-table')}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500/10 to-rose-500/10 border border-violet-200/20 text-[13px] text-ink-700 font-medium active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Users size={14} className="text-violet-500" />
            圆桌局 · 四神混战
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-seal/10 text-seal font-bold">DEMO</span>
            <ChevronRight size={14} className="text-ink-400" />
          </button>
        </div>

        {/* ===== Round Selector ===== */}
        <div className="bg-surface rounded-xl shadow-card p-3.5">
          <div className="flex items-center gap-2 mb-2.5">
            <Clock size={14} className="text-ink-500" />
            <span className="text-[13px] font-semibold text-ink-700">赛制</span>
          </div>
          <div className="flex gap-2">
            {[3, 5, 7, 9].map(n => (
              <button
                key={n}
                onClick={() => setSelectedRounds(n)}
                className={`flex-1 py-2 rounded-xl text-[13px] font-medium transition-all active:scale-95 ${
                  selectedRounds === n
                    ? 'bg-ink-900 text-paper shadow-md'
                    : 'bg-paper-dark text-ink-500 hover:text-ink-700'
                }`}
              >
                {n}局
                <span className="block text-[9px] mt-0.5 opacity-60">
                  {n <= 3 ? '快节奏' : n <= 5 ? '标准' : n <= 7 ? '激烈' : '史诗'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ===== Character Grid (selectable) ===== */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Star size={14} className="text-gold" />
            <span className="text-[14px] font-semibold text-ink-700">选择角色</span>
            <span className="text-[11px] text-ink-400">点击头像更换对阵</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {ALL_CHARACTERS.map(char => {
              const isSelected = char.id === selectedAffirm || char.id === selectedNegate
              const isAffirm = char.id === selectedAffirm
              const isNegate = char.id === selectedNegate
              return (
                <button
                  key={char.id}
                  onClick={() => {
                    if (selectingSide) {
                      handleCharSelect(char.id)
                    } else {
                      // Default: assign to the side that's not this character
                      if (char.id === selectedAffirm) {
                        setSelectingSide('affirm')
                      } else if (char.id === selectedNegate) {
                        setSelectingSide('negate')
                      } else {
                        // Not currently selected - assign to negate by default
                        setSelectingSide('negate')
                        setSelectedNegate(char.id)
                      }
                    }
                  }}
                  className={`bg-surface rounded-xl shadow-card p-3.5 border text-left active:scale-[0.98] transition-all ${
                    isSelected
                      ? isAffirm
                        ? `border-amber-400 ring-1 ring-amber-200`
                        : `border-cyan-400 ring-1 ring-cyan-200`
                      : `${char.visual.bubbleBorder}`
                  }`}
                >
                  {/* Avatar + Name */}
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${char.visual.gradientFrom} ${char.visual.gradientTo} flex items-center justify-center shadow-md ${char.visual.glowShadow}`}>
                      <CharacterIcon characterId={char.id} size={18} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[13px] font-bold text-ink-900">{char.name}</p>
                        {isAffirm && <span className="text-[8px] px-1 py-0.5 rounded bg-amber-100 text-amber-600 font-bold">正方</span>}
                        {isNegate && <span className="text-[8px] px-1 py-0.5 rounded bg-cyan-100 text-cyan-600 font-bold">反方</span>}
                      </div>
                      <p className={`text-[10px] ${char.visual.textColor}`}>{char.title}</p>
                    </div>
                  </div>

                  {/* Personality */}
                  <p className="text-[11px] text-ink-500 leading-relaxed mb-2 line-clamp-2">
                    {char.personality}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1">
                      <span className="text-ink-400">胜率</span>
                      <span className={`font-bold ${char.visual.textColor}`}>{char.stats.winRate}</span>
                    </div>
                    <span className="text-ink-400">{char.stats.totalDebates}场</span>
                  </div>

                  {/* Favorite tactic badge */}
                  <div className="mt-1.5">
                    <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded-md ${char.visual.bubbleBg} ${char.visual.textColor} font-medium`}>
                      {char.stats.favoriteTactic}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ===== Live debates ===== */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Flame size={14} className="text-seal" />
            <span className="text-[14px] font-semibold text-ink-700">热门辩题</span>
          </div>
          <div className="space-y-2.5">
            {TOPICS.filter(t => t.status === 'live').map(topic => (
              <button
                key={topic.id}
                onClick={() => navigateToArena(topic.id)}
                className="w-full p-4 bg-surface rounded-xl shadow-card active:scale-[0.98] transition-all hover:shadow-card-hover text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] text-ink-900 font-semibold leading-snug">{topic.title}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-lg ${affirmChar.visual.bubbleBg} ${affirmChar.visual.textColor}`}>
                        {topic.affirmLabel}
                      </span>
                      <Swords size={12} className="text-ink-300" />
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-lg ${negateChar.visual.bubbleBg} ${negateChar.visual.textColor}`}>
                        {topic.negateLabel}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="px-2 py-0.5 rounded-lg bg-seal/10 text-seal text-[10px] font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-seal animate-pulse" />
                      LIVE
                    </span>
                    <span className="text-[10px] text-ink-400 flex items-center gap-1">
                      <Users size={10} />
                      {topic.heat.toLocaleString()}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Upcoming */}
        {TOPICS.some(t => t.status === 'upcoming') && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={14} className="text-ink-400" />
              <span className="text-[14px] font-semibold text-ink-700">即将开始</span>
            </div>
            <div className="space-y-2.5">
              {TOPICS.filter(t => t.status === 'upcoming').map(topic => (
                <div
                  key={topic.id}
                  className="w-full p-4 bg-surface rounded-xl shadow-card opacity-60"
                >
                  <p className="text-[14px] text-ink-900 font-semibold leading-snug">{topic.title}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[11px] text-ink-400 font-medium bg-paper-dark px-2 py-0.5 rounded-lg">
                      {topic.affirmLabel}
                    </span>
                    <Swords size={12} className="text-ink-300" />
                    <span className="text-[11px] text-ink-400 font-medium bg-paper-dark px-2 py-0.5 rounded-lg">
                      {topic.negateLabel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-[9px] text-ink-300 text-center">
          AI 辩论内容仅供娱乐和学习 · 观点不代表平台立场
        </p>
      </div>
    </div>
  )
}
