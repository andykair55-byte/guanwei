import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, SlidersHorizontal, Inbox, PenSquare } from 'lucide-react'
import { api } from '../services/api'
import { transformMelonList } from '../utils/transform'
import MelonCard from '../components/MelonCard'
import type { MelonDebateInfo } from '../components/MelonCard'
import type { Melon, MelonCategory } from '../types'

const categories: ('全部' | MelonCategory)[] = [
  '全部', '娱乐', '科技', '生活科普', '社会热点', '历史', '财经',
]

function MelonFieldPage() {
  const navigate = useNavigate()
  const [melons, setMelons] = useState<Melon[]>([])
  const [selectedCategory, setSelectedCategory] = useState<typeof categories[number]>('全部')
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pullDistance, setPullDistance] = useState(0)
  const [searchFocused, setSearchFocused] = useState(false)
  const touchStartY = useRef(0)
  const isPulling = useRef(false)

  const fetchMelons = useCallback(async (category?: string) => {
    try {
      setLoading(true)
      const data: any = await api.getMelons(category && category !== '全部' ? category : undefined)
      const items = data.items || data || []
      setMelons(transformMelonList(items))
    } catch (e) {
      console.error('获取瓜列表失败:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMelons(selectedCategory)
  }, [selectedCategory, fetchMelons])

  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    setPullDistance(0)
    api.getMelons(selectedCategory && selectedCategory !== '全部' ? selectedCategory : undefined)
      .then((data: any) => {
        const items = data.items || data || []
        setMelons(transformMelonList(items))
      })
      .catch(() => {})
      .finally(() => setRefreshing(false))
  }, [selectedCategory])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    isPulling.current = true
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current || refreshing) return
    const currentY = e.touches[0].clientY
    const diff = currentY - touchStartY.current
    if (diff > 0) setPullDistance(Math.min(diff * 0.4, 70))
  }, [refreshing])

  const handleTouchEnd = useCallback(() => {
    if (!isPulling.current) return
    isPulling.current = false
    if (pullDistance >= 50 && !refreshing) handleRefresh()
    else setPullDistance(0)
  }, [pullDistance, refreshing, handleRefresh])

  const handleVerify = (title: string) => {
    navigate('/verify', { state: { query: title } })
  }

  // Generate deterministic mock debate info per melon
  const getDebateInfo = useCallback((melon: Melon): MelonDebateInfo => {
    const seed = Number(melon.id) % 7
    const statuses: MelonDebateInfo['status'][] = ['debating', 'debating', 'debating', 'waiting', 'waiting', 'ended', 'debating']
    const status = statuses[seed]
    const totalSeats = 6
    const vacantMap = [1, 2, 0, 6, 3, 6, 1]
    const vacantSeats = vacantMap[seed]
    const spectatorBases = [328, 156, 892, 45, 210, 0, 1024]
    const spectatorCount = spectatorBases[seed] + (Number(melon.id) % 100)
    const entryCost = 30
    const currentRound = status === 'ended' ? 8 : status === 'debating' ? (seed % 3) + 2 : 0
    return { status, spectatorCount, vacantSeats, totalSeats, entryCost, currentRound }
  }, [])

  return (
    <div className="flex flex-col min-h-full bg-paper-texture">
      {/* 顶部区域 */}
      <div className="sticky top-0 z-20 glass-subtle">
        {/* 品牌标题 + 搜索 */}
        <div className="px-5 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-ink-900 tracking-tight">瓜田</h1>
              <p className="text-[11px] text-ink-400 mt-0.5">不信一家之言，只认证据说话</p>
            </div>
            <button className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center shadow-card active:scale-95 transition-transform">
              <SlidersHorizontal size={16} className="text-ink-500" />
            </button>
          </div>

          {/* 搜索栏 */}
          <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all duration-200 ${
            searchFocused
              ? 'bg-surface shadow-card ring-1 ring-seal/20'
              : 'bg-surface/70'
          }`}>
            <Search size={16} className={`flex-shrink-0 transition-colors ${searchFocused ? 'text-seal' : 'text-ink-400'}`} />
            <input
              type="text"
              placeholder="搜索你想求证的内容"
              className="flex-1 bg-transparent text-[14px] text-ink-900 placeholder:text-ink-400"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </div>
        </div>

        {/* 分类标签 - 下划线风格 */}
        <div className="flex px-5 gap-1 overflow-x-auto scrollbar-none">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 px-3 py-2 text-[13px] transition-all whitespace-nowrap relative ${
                  isActive
                    ? 'text-seal font-semibold'
                    : 'text-ink-400 font-normal'
                }`}
              >
                {cat}
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-[2.5px] rounded-full bg-seal" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 下拉刷新指示 */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all"
        style={{ height: `${pullDistance}px`, opacity: pullDistance / 50 }}
      >
        <span className="text-ink-400 text-xs">
          {pullDistance >= 50 ? '松开刷新' : '下拉刷新'}
        </span>
      </div>

      {/* 卡片列表 */}
      <div
        className="flex-1 px-4 pb-6"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {refreshing && (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-seal/30 border-t-seal rounded-full animate-spin" />
          </div>
        )}

        {loading && !refreshing ? (
          <div className="flex flex-col divide-y divide-line/30">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="py-4">
                <div className="skeleton h-[180px] rounded-xl" />
                <div className="mt-3 space-y-2">
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : melons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-16 h-16 rounded-xl bg-paper-dark flex items-center justify-center mb-4">
              <Inbox size={28} className="text-ink-400" />
            </div>
            <p className="text-ink-500 text-sm font-medium">暂无该分类的内容</p>
            <p className="text-ink-400 text-xs mt-1">看看其他分类吧</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-line/30">
            {melons.map((melon, i) => (
              <MelonCard
                key={melon.id}
                melon={melon}
                index={i}
                debateInfo={getDebateInfo(melon)}
                onClick={() => navigate(`/debate-room/room-${melon.id}`)}
                onVerify={() => handleVerify(melon.title)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 快捷发帖 FAB */}
      <button
        onClick={() => navigate('/publish')}
        className="fixed bottom-20 right-4 z-30 w-12 h-12 rounded-full bg-seal text-white shadow-lg flex items-center justify-center active:scale-90 transition-transform"
      >
        <PenSquare size={20} />
      </button>
    </div>
  )
}

export default MelonFieldPage
