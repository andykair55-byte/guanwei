import { useState, useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Flame, Clock,
  ChevronRight, Inbox,
} from 'lucide-react'
import { api } from '../services/api'
import { transformMelonList } from '../utils/transform'
import type { Melon, MelonCategory } from '../types'

const categories: ('全部' | MelonCategory)[] = [
  '全部', '科技', '社会热点', '生活科普', '财经', '娱乐',
]

/* ------------------------------------------------------------------ */
/*  Mock data — used when API fails or returns empty                    */
/* ------------------------------------------------------------------ */
const MOCK_MELONS: Melon[] = [
  {
    id: 'mock-1',
    title: '苹果将于明年发布折叠屏 iPhone，供应链已确认',
    description: '传闻苹果已向三星订购柔性屏样品，预计 2026 年推出首款折叠屏设备。',
    coverImage: 'https://picsum.photos/seed/melon1/600/400',
    category: '科技',
    difficulty: 2,
    trueCount: 1842,
    falseCount: 3210,
    totalParticipants: 5052,
    revealTime: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    status: 'pending',
    likeCount: 890,
    commentCount: 234,
    evidenceCount: 17,
    isLiked: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mock-2',
    title: '某顶流明星隐婚生子，对象是圈外人士',
    description: '八卦博主爆料某顶流已秘密结婚并育有一子，多方信源交叉印证中。',
    coverImage: 'https://picsum.photos/seed/melon2/600/400',
    category: '娱乐',
    difficulty: 1,
    trueCount: 4521,
    falseCount: 1102,
    totalParticipants: 5623,
    revealTime: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
    status: 'pending',
    likeCount: 3200,
    commentCount: 890,
    evidenceCount: 9,
    isLiked: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mock-3',
    title: '央行将于下月降准 50 个基点，释放万亿流动性',
    description: '多位分析师预测央行将大幅降准，官方尚未回应。',
    coverImage: 'https://picsum.photos/seed/melon3/600/400',
    category: '财经',
    difficulty: 3,
    trueCount: 2300,
    falseCount: 1800,
    totalParticipants: 4100,
    revealTime: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
    status: 'pending',
    likeCount: 1560,
    commentCount: 445,
    evidenceCount: 23,
    isLiked: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mock-4',
    title: '某地发生 5.2 级地震，官方尚未发布伤亡报告',
    description: '社交媒体流传地震视频，但震级和位置说法不一。',
    coverImage: 'https://picsum.photos/seed/melon4/600/400',
    category: '社会热点',
    difficulty: 1,
    trueCount: 6780,
    falseCount: 320,
    totalParticipants: 7100,
    revealTime: new Date(Date.now() + 1 * 3600 * 1000).toISOString(),
    status: 'pending',
    likeCount: 4500,
    commentCount: 1230,
    evidenceCount: 31,
    isLiked: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mock-5',
    title: '每天喝八杯水其实没有科学依据，可能反而有害',
    description: '新研究表明"八杯水"建议源于误读，过量饮水可能导致低钠血症。',
    coverImage: 'https://picsum.photos/seed/melon5/600/400',
    category: '生活科普',
    difficulty: 2,
    trueCount: 3400,
    falseCount: 2900,
    totalParticipants: 6300,
    revealTime: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    status: 'pending',
    likeCount: 2100,
    commentCount: 567,
    evidenceCount: 14,
    isLiked: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mock-6',
    title: 'OpenAI 正在开发能实时视频通话的 GPT-5',
    description: '内部人士透露 GPT-5 将支持多模态实时交互，预计年内发布。',
    coverImage: 'https://picsum.photos/seed/melon6/600/400',
    category: '科技',
    difficulty: 2,
    trueCount: 5100,
    falseCount: 1400,
    totalParticipants: 6500,
    revealTime: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
    status: 'pending',
    likeCount: 3800,
    commentCount: 780,
    evidenceCount: 11,
    isLiked: false,
    createdAt: new Date().toISOString(),
  },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Format remaining time as "Xd" / "Xh" / "Xm" */
function formatCountdown(revealTime: string): string {
  const diff = new Date(revealTime).getTime() - Date.now()
  if (diff <= 0) return '已揭晓'
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  if (hours >= 24) return `${Math.floor(hours / 24)}天${hours % 24}时`
  if (hours > 0) return `${hours}时${minutes}分`
  return `${minutes}分`
}

function formatHeat(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}w`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

function MelonFieldPage() {
  const navigate = useNavigate()

  const [melons, setMelons] = useState<Melon[]>([])
  const [selectedCategory, setSelectedCategory] = useState<typeof categories[number]>('全部')
  const [sortBy, setSortBy] = useState<'latest' | 'hot'>('hot')
  const [loading, setLoading] = useState(true)
  const [, setError] = useState<string | null>(null)

  // voted state: melonId -> 'true' | 'false' | 'neutral'
  const [votes, setVotes] = useState<Record<string, 'true' | 'false' | 'neutral'>>({})

  /* ---------- data fetching (kept intact) ---------- */
  const fetchMelons = useCallback(async (category?: string) => {
    try {
      setLoading(true)
      setError(null)
      const data: any = await api.getMelons(
        category && category !== '全部' ? category : undefined,
      )
      const items = data.items || data || []
      const transformed = transformMelonList(items)
      setMelons(transformed.length > 0 ? transformed : MOCK_MELONS)
    } catch (e) {
      console.error('获取瓜列表失败:', e)
      setError(null) // silently fall back to mock data
      setMelons(MOCK_MELONS)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMelons(selectedCategory)
  }, [selectedCategory, fetchMelons])

  /* ---------- derived data ---------- */
  const filteredMelons = useMemo(() => {
    let list = selectedCategory === '全部'
      ? melons
      : melons.filter((m) => m.category === selectedCategory)
    if (sortBy === 'hot') {
      list = [...list].sort((a, b) =>
        (b.totalParticipants + b.evidenceCount * 5 + b.likeCount * 0.5)
        - (a.totalParticipants + a.evidenceCount * 5 + a.likeCount * 0.5)
      )
    } else {
      list = [...list].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    }
    return list
  }, [melons, selectedCategory, sortBy])

  /* ---------- vote handler (local only) ---------- */
  const handleVote = (melonId: string, choice: 'true' | 'false' | 'neutral') => {
    setVotes((prev) => {
      // toggle off if already voted the same
      if (prev[melonId] === choice) {
        const next = { ...prev }
        delete next[melonId]
        return next
      }
      return { ...prev, [melonId]: choice }
    })
  }

  /* ---------- render ---------- */
  return (
    <div className="flex flex-col min-h-full bg-white">
      {/* ====== Header ====== */}
      <header className="px-6 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-[22px] font-bold text-ink-900 tracking-tight">
              瓜田
            </h1>
            <p className="text-[11px] text-ink-400 mt-0.5">
              不信一家言，只认证据说话
            </p>
          </div>
        </div>

        {/* 排序 Tab：最热 / 最新 */}
        <div className="flex items-center gap-1 mt-3 mb-2.5">
          {(['hot', 'latest'] as const).map((s) => {
            const active = sortBy === s
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSortBy(s)}
                aria-pressed={active}
                className={`px-3 py-1 text-[13px] font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-seal/40 focus-visible:rounded motion-reduce:transition-none ${
                  active ? 'text-seal' : 'text-ink-400 hover:text-ink-600'
                }`}
              >
                {s === 'hot' ? '最热' : '最新'}
                {active && (
                  <span className="block h-0.5 bg-seal rounded-full mt-1 motion-reduce:hidden" />
                )}
              </button>
            )
          })}
        </div>

        {/* Filter bar */}
        <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {categories.map((cat) => {
            const active = selectedCategory === cat
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12px] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-seal/40 motion-reduce:transition-none ${
                  active
                    ? 'bg-ink-900 text-white font-medium'
                    : 'text-ink-400 hover:text-ink-600 font-normal'
                }`}
              >
                {cat}
              </button>
            )
          })}
        </div>
      </header>

      {/* ====== Content ====== */}
      <main className="flex-1 px-5 pb-10">
        {/* Loading skeleton */}
        {loading ? (
          <div className="columns-2 md:columns-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="mb-5 break-inside-avoid rounded-[16px] overflow-hidden bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                <div className="skeleton aspect-[16/10]" />
                <div className="p-3.5 space-y-2.5">
                  <div className="skeleton h-4 w-4/5 rounded" />
                  <div className="space-y-1.5">
                    <div className="skeleton h-7 w-full rounded-xl" />
                    <div className="skeleton h-7 w-full rounded-xl" />
                    <div className="skeleton h-7 w-3/4 rounded-xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : /* Empty state */
        filteredMelons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-14 h-14 rounded-2xl bg-ink-100/50 flex items-center justify-center mb-4">
              <Inbox size={24} className="text-ink-300" />
            </div>
            <p className="text-[13px] text-ink-400 font-medium">暂无该分类的内容</p>
            <p className="text-[11px] text-ink-300 mt-1">看看其他分类吧</p>
          </div>
        ) : (
          /* ====== Masonry Card List ====== */
          <div className="columns-2 md:columns-3 gap-4">
            {filteredMelons.map((melon) => (
              <MelonGameCard
                key={melon.id}
                melon={melon}
                vote={votes[melon.id]}
                onVote={(choice) => handleVote(melon.id, choice)}
                onOpenDetail={() => navigate(`/melon/${melon.id}`)}
                onDebate={() => navigate(`/melon/${melon.id}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

/* ==================================================================== */
/*  MelonGameCard — evidence-based voting card                           */
/* ==================================================================== */

interface Evidence {
  id: string
  content: string
  direction: 'true' | 'false'
  upvotes: number
}

interface MelonGameCardProps {
  melon: Melon
  vote?: 'true' | 'false' | 'neutral'
  onVote: (choice: 'true' | 'false' | 'neutral') => void
  onOpenDetail: () => void
  onDebate: () => void
}

/** Mock evidence per melon — in production this comes from the API */
const MOCK_EVIDENCE: Record<string, Evidence[]> = {
  'mock-1': [
    { id: 'e1', content: '供应链人士透露柔性屏样品已通过测试', direction: 'true', upvotes: 342 },
    { id: 'e2', content: '苹果官方回应「不评论传闻」', direction: 'false', upvotes: 189 },
    { id: 'e3', content: '三星Display已扩建柔性屏产线', direction: 'true', upvotes: 567 },
  ],
  'mock-2': [
    { id: 'e4', content: '狗仔拍到一家三口出行照片', direction: 'true', upvotes: 1203 },
    { id: 'e5', content: '工作室发声明否认', direction: 'false', upvotes: 432 },
    { id: 'e6', content: '知情人透露结婚证照片已流出', direction: 'true', upvotes: 876 },
  ],
  'mock-3': [
    { id: 'e7', content: '央行内部会议纪要泄露', direction: 'true', upvotes: 234 },
    { id: 'e8', content: '官方发言人称「暂无相关信息」', direction: 'false', upvotes: 567 },
    { id: 'e9', content: '多家券商研报预测降准窗口', direction: 'true', upvotes: 345 },
  ],
  'mock-4': [
    { id: 'e10', content: '现场视频显示建筑物有明显损坏', direction: 'true', upvotes: 890 },
    { id: 'e11', content: '地震局称震级仅 3.8', direction: 'false', upvotes: 445 },
    { id: 'e12', content: '当地医院称收治伤员数与 5.2 级吻合', direction: 'true', upvotes: 678 },
  ],
}

function MelonGameCard({ melon, onOpenDetail }: MelonGameCardProps) {
  const countdown = formatCountdown(melon.revealTime)
  const evidence = MOCK_EVIDENCE[melon.id] || [
    { id: `${melon.id}-e1`, content: '多方信源交叉印证中，等待更多证据', direction: 'true' as const, upvotes: 23 },
    { id: `${melon.id}-e2`, content: '官方尚未回应', direction: 'false' as const, upvotes: 45 },
  ]

  const [upvotedId, setUpvotedId] = useState<string | null>(null)

  return (
    <div
      className="group cursor-pointer mb-5 break-inside-avoid"
      onClick={onOpenDetail}
    >
      <div className="bg-white rounded-[16px] overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-shadow duration-300">
        {/* Cover */}
        <div className="relative aspect-[16/10] overflow-hidden">
          <img
            src={melon.coverImage}
            alt={melon.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          {/* Category */}
          <span className="absolute top-3 left-3 px-2 py-[3px] rounded-full text-[9px] font-bold text-white/90 bg-black/40 backdrop-blur-md">
            {melon.category}
          </span>
          {/* Heat + countdown */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <span className="flex items-center gap-1 text-[10px] text-white/80 font-mono">
              <Flame size={11} className="text-orange-300" />
              {formatHeat(melon.totalParticipants)}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-white/80 font-mono bg-black/30 px-2 py-0.5 rounded-full backdrop-blur-sm">
              <Clock size={10} />
              {countdown}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="px-3.5 py-3">
          {/* Title */}
          <h3 className="text-[13px] font-medium text-ink-800 leading-[1.45] line-clamp-2 group-hover:text-seal transition-colors duration-200 mb-3">
            {melon.title}
          </h3>

          {/* Evidence list — 核心交互 */}
          <div className="space-y-1.5">
            {evidence.slice(0, 3).map((ev) => {
              const isUpvoted = upvotedId === ev.id
              return (
                <button
                  key={ev.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    setUpvotedId(isUpvoted ? null : ev.id)
                  }}
                  className={`w-full flex items-start gap-2 px-2.5 py-2 rounded-xl text-left transition-all duration-200 ${
                    isUpvoted
                      ? ev.direction === 'true'
                        ? 'bg-bamboo/8 ring-1 ring-bamboo/20'
                        : 'bg-seal/8 ring-1 ring-seal/20'
                      : 'bg-ink-50/80 hover:bg-ink-100/60'
                  }`}
                >
                  {/* Direction dot */}
                  <span className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                    ev.direction === 'true' ? 'bg-bamboo' : 'bg-seal'
                  }`} />
                  {/* Evidence text */}
                  <span className={`text-[11px] leading-[1.4] flex-1 ${
                    isUpvoted ? 'text-ink-800 font-medium' : 'text-ink-600'
                  } line-clamp-2`}>
                    {ev.content}
                  </span>
                  {/* Upvote count */}
                  <span className={`text-[10px] font-mono shrink-0 mt-0.5 ${
                    isUpvoted
                      ? ev.direction === 'true' ? 'text-bamboo' : 'text-seal'
                      : 'text-ink-300'
                  }`}>
                    {isUpvoted ? ev.upvotes + 1 : ev.upvotes}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Footer stats */}
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-ink-100/30">
            <span className="text-[10px] text-ink-300">
              {melon.evidenceCount} 条佐证 · {formatHeat(melon.totalParticipants)} 人参与
            </span>
            <span className="text-[10px] text-seal font-medium flex items-center gap-0.5">
              查看全部
              <ChevronRight size={12} />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MelonFieldPage
