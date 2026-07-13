/**
 * MelonJudgePage — 瓜田判官
 *
 * 对一个瓜进行真假站队，投票后看比例，下一个瓜继续判。
 * 参考 JudgeFeedPage 的刷刷刷模式，但数据源是 Melon。
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Scale, Check, X, ChevronRight, Flame } from 'lucide-react'
import { generateMelons } from '../services/mockData'
import { useIsDesktop } from '../hooks/useIsDesktop'

type Vote = 'true' | 'false' | null

export default function MelonJudgePage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isDesktop = useIsDesktop()

  // 瓜列表（mock，稳定 id）
  const allMelons = useMemo(() => generateMelons(), [])

  // 找到当前瓜
  const currentMelon = useMemo(() => {
    if (id) {
      const found = allMelons.find(m => m.id === id)
      if (found) return found
    }
    return allMelons[0] ?? null
  }, [id, allMelons])

  const [vote, setVote] = useState<Vote>(null)
  const [votedCount, setVotedCount] = useState(0)

  // 切换瓜时重置投票
  useEffect(() => {
    setVote(null)
  }, [id])

  const handleVote = useCallback((v: Vote) => {
    if (vote !== null) return
    setVote(v)
    setVotedCount(prev => prev + 1)
  }, [vote])

  const handleNext = useCallback(() => {
    if (!currentMelon) return
    // 随机选一个不同的瓜
    const others = allMelons.filter(m => m.id !== currentMelon.id)
    if (others.length === 0) return
    const next = others[Math.floor(Math.random() * others.length)]
    navigate(`/entertainment/judge/melon/${next.id}`, { replace: true })
  }, [currentMelon, allMelons, navigate])

  if (!currentMelon) {
    return (
      <div className="flex flex-col min-h-full bg-paper-texture">
        <div className={`px-5 pt-4 pb-3 flex items-center gap-3 ${isDesktop ? 'max-w-2xl mx-auto w-full' : ''}`}>
          <button onClick={() => navigate('/entertainment/judge')} className="p-1.5 -ml-1.5 rounded-lg hover:bg-paper-dark transition-colors">
            <ArrowLeft size={20} className="text-ink-700" />
          </button>
          <h1 className="text-[18px] font-bold text-ink-900">瓜田判官</h1>
        </div>
        <div className={`flex-1 px-5 ${isDesktop ? 'max-w-2xl mx-auto w-full' : ''}`}>
          <p className="text-[14px] text-ink-400 text-center py-20">暂无瓜可判</p>
        </div>
      </div>
    )
  }

  // 用户投票后加入自己的一票
  const displayTrueCount = currentMelon.trueCount + (vote === 'true' ? 1 : 0)
  const displayFalseCount = currentMelon.falseCount + (vote === 'false' ? 1 : 0)
  const displayTotal = displayTrueCount + displayFalseCount
  const displayTruePercent = displayTotal > 0 ? Math.round((displayTrueCount / displayTotal) * 100) : 50
  const displayFalsePercent = 100 - displayTruePercent

  return (
    <div className="flex flex-col min-h-full bg-paper-texture">
      {/* Header */}
      <div className={`px-5 pt-4 pb-2 flex items-center gap-3 ${isDesktop ? 'max-w-2xl mx-auto w-full' : ''}`}>
        <button
          onClick={() => navigate('/entertainment/judge')}
          className="p-1.5 -ml-1.5 rounded-lg hover:bg-paper-dark transition-colors active:scale-95"
        >
          <ArrowLeft size={20} className="text-ink-700" />
        </button>
        <div className="flex-1">
          <h1 className="text-[17px] font-bold text-ink-900">瓜田判官</h1>
          <p className="text-[11px] text-ink-400">看瓜 · 站队 · 判真假</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-surface shadow-card">
          <Scale size={12} className="text-gold" />
          <span className="text-[11px] text-ink-500 font-medium">已判 {votedCount}</span>
        </div>
      </div>

      {/* 内容区 */}
      <div className={`flex-1 px-5 pb-8 ${isDesktop ? 'max-w-2xl mx-auto w-full' : ''}`}>
        {/* 瓜卡片 */}
        <div className="bg-surface rounded-2xl shadow-card overflow-hidden animate-fade-in-up" key={currentMelon.id}>
          {/* 封面 */}
          <div className="relative h-32 overflow-hidden">
            <img
              src={currentMelon.coverImage}
              alt={currentMelon.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white bg-black/40 backdrop-blur">
                {currentMelon.category}
              </span>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-white bg-black/40 backdrop-blur">
                <Flame size={10} />
                {currentMelon.totalParticipants.toLocaleString()} 人参与
              </div>
            </div>
          </div>

          {/* 内容 */}
          <div className="p-4">
            <h2 className="text-[16px] font-bold text-ink-900 leading-snug mb-2">{currentMelon.title}</h2>
            <p className="text-[13px] text-ink-500 leading-relaxed line-clamp-4 mb-4">
              {currentMelon.description}
            </p>

            {/* 投票区 */}
            {vote === null ? (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleVote('true')}
                  className="flex flex-col items-center gap-1 py-4 rounded-xl bg-seal/5 border-2 border-seal/20 active:scale-95 transition-all"
                >
                  <Check size={24} className="text-seal" strokeWidth={3} />
                  <span className="text-[13px] font-bold text-seal">真</span>
                  <span className="text-[10px] text-ink-400">我站真</span>
                </button>
                <button
                  onClick={() => handleVote('false')}
                  className="flex flex-col items-center gap-1 py-4 rounded-xl bg-red-50 border-2 border-red-200 active:scale-95 transition-all"
                >
                  <X size={24} className="text-red-500" strokeWidth={3} />
                  <span className="text-[13px] font-bold text-red-500">假</span>
                  <span className="text-[10px] text-ink-400">我站假</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3 animate-fade-in-up">
                {/* 投票结果 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1 text-seal font-medium">
                      <Check size={12} strokeWidth={3} />
                      真 {displayTruePercent}%
                    </span>
                    <span className="flex items-center gap-1 text-red-500 font-medium">
                      <X size={12} strokeWidth={3} />
                      假 {displayFalsePercent}%
                    </span>
                  </div>
                  {/* 比例条 */}
                  <div className="flex h-3 rounded-full overflow-hidden bg-paper-dark">
                    <div
                      className="bg-seal transition-all duration-700 ease-out"
                      style={{ width: `${displayTruePercent}%` }}
                    />
                    <div
                      className="bg-red-400 transition-all duration-700 ease-out"
                      style={{ width: `${displayFalsePercent}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-ink-400 text-center">
                    共 {displayTotal.toLocaleString()} 人投票
                    {vote === 'true' && <span className="text-seal ml-1">· 你站了真</span>}
                    {vote === 'false' && <span className="text-red-500 ml-1">· 你站了假</span>}
                  </p>
                </div>

                {/* 你的选择 vs 真相 */}
                {currentMelon.status === 'revealed' && currentMelon.result !== undefined ? (
                  <div className={`p-3 rounded-xl text-center ${vote === (currentMelon.result ? 'true' : 'false') ? 'bg-seal/5' : 'bg-red-50'}`}>
                    <p className="text-[12px] font-bold text-ink-700">
                      {vote === (currentMelon.result ? 'true' : 'false') ? '判对了！' : '判错了！'}
                    </p>
                    <p className="text-[11px] text-ink-400 mt-0.5">
                      真相：{currentMelon.result ? '真' : '假'}
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-ink-400 text-center">
                    开奖时间：{new Date(currentMelon.revealTime).toLocaleDateString('zh-CN')}
                  </p>
                )}

                {/* 下一个 */}
                <button
                  onClick={handleNext}
                  className="w-full py-3 rounded-xl bg-seal text-white font-semibold text-[13px] active:scale-[0.97] transition-all flex items-center justify-center gap-2"
                >
                  下一个瓜
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 底部说明 */}
        <p className="text-[11px] text-ink-400 text-center mt-4">
          瓜田判官 · 理性吃瓜，站队有理
        </p>
      </div>
    </div>
  )
}
