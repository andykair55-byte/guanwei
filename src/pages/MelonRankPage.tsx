import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flame, Users, MessageSquare, TrendingUp, ChevronRight, ArrowLeft } from 'lucide-react'
import { hotMelons, formatCount } from '../services/mockData'
import { usePlatform } from '../hooks/usePlatform'

type SortKey = 'heat' | 'participants' | 'comments' | 'latest'
type CategoryFilter = '全部' | '科技' | '社会热点' | '生活科普' | '财经' | '娱乐'

const CATEGORIES: CategoryFilter[] = ['全部', '科技', '社会热点', '生活科普', '财经', '娱乐']

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'heat', label: '热度' },
  { key: 'participants', label: '参与' },
  { key: 'comments', label: '讨论' },
  { key: 'latest', label: '最新' },
]

// 排行勋章色
function rankStyle(i: number) {
  if (i === 0) return 'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-amber-200/50'
  if (i === 1) return 'bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-slate-200/50'
  if (i === 2) return 'bg-gradient-to-br from-orange-300 to-orange-400 text-white shadow-orange-200/50'
  return 'bg-paper-dark text-ink-400'
}

// 趋势指示
function TrendBadge({ trending }: { trending?: string }) {
  if (trending === 'up' || trending === 'hot') return <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-red-500"><TrendingUp size={10} />飙升</span>
  if (trending === 'new') return <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-blue-500">新</span>
  if (trending === 'stable') return <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-ink-400">稳</span>
  return null
}

export default function MelonRankPage() {
  const navigate = useNavigate()
  const { isWeb } = usePlatform()
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('全部')
  const [sortBy, setSortBy] = useState<SortKey>('heat')

  const filtered = hotMelons
    .filter(m => activeCategory === '全部' || m.category === activeCategory)
    .sort((a, b) => {
      if (sortBy === 'heat') return b.views - a.views
      if (sortBy === 'participants') return (b.participants || 0) - (a.participants || 0)
      if (sortBy === 'comments') return (b.comments || 0) - (a.comments || 0)
      // latest — id 大的靠前
      return b.id - a.id
    })

  const wrap = isWeb ? 'max-w-3xl mx-auto' : ''

  return (
    <div className="flex flex-col min-h-full bg-paper-texture">
      {/* Header */}
      <header className={`px-5 pt-5 pb-3 ${wrap}`}>
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-paper-dark text-ink-500 hover:bg-ink-100 press-pop transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="font-serif text-[22px] font-bold text-ink-900 tracking-tight">吃瓜榜</h1>
            <p className="text-[11px] text-ink-400 mt-0.5">实时热度，一目了然</p>
          </div>
        </div>

        {/* Category pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12px] transition-all duration-200 ${
                activeCategory === cat
                  ? 'bg-ink-900 text-white font-medium'
                  : 'text-ink-400 hover:text-ink-600 font-normal'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sort bar */}
        <div className="flex items-center gap-1 mt-3 border-b border-line/15 pb-2">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${
                sortBy === opt.key
                  ? 'bg-seal/10 text-seal'
                  : 'text-ink-400 hover:text-ink-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </header>

      {/* Rank list */}
      <main className={`flex-1 px-5 pb-10 ${wrap}`}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-14 h-14 rounded-2xl bg-ink-100/50 flex items-center justify-center mb-4">
              <Flame size={24} className="text-ink-300" />
            </div>
            <p className="text-[13px] text-ink-400 font-medium">该分类暂无榜单数据</p>
          </div>
        ) : (
          <div className="space-y-2 mt-3">
            {filtered.map((melon, i) => (
              <article
                key={melon.id}
                onClick={() => navigate(`/melon/mock-${melon.id}`)}
                className="group flex items-start gap-3.5 p-4 rounded-2xl bg-white border border-line/15 cursor-pointer hover:border-ink-200 hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all duration-200"
              >
                {/* Rank badge */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[13px] font-bold flex-shrink-0 shadow-sm ${rankStyle(i)}`}>
                  {i + 1}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-[14px] font-medium text-ink-900 leading-snug group-hover:text-seal transition-colors line-clamp-2">
                      {melon.title}
                    </h3>
                    <TrendBadge trending={melon.trending} />
                  </div>

                  <div className="flex items-center gap-3 mt-2">
                    {melon.category && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-paper-dark text-ink-500">
                        {melon.category}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-[11px] text-ink-400">
                      <Flame size={11} className="text-orange-400" />
                      {formatCount(melon.views)}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-ink-400">
                      <Users size={11} />
                      {formatCount(melon.participants || 0)}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-ink-400">
                      <MessageSquare size={11} />
                      {formatCount(melon.comments || 0)}
                    </span>
                  </div>

                  {melon.author && (
                    <div className="flex items-center gap-2 mt-2">
                      <img
                        src={melon.author.avatar}
                        alt={melon.author.nickname}
                        className="w-4 h-4 rounded-full object-cover"
                      />
                      <span className="text-[11px] text-ink-500">{melon.author.nickname}</span>
                      <span className="text-[10px] text-ink-300">{melon.author.rank}</span>
                    </div>
                  )}
                </div>

                {/* Arrow */}
                <ChevronRight size={16} className="text-ink-200 group-hover:text-seal transition-colors flex-shrink-0 mt-1" />
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
