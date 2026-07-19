import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  MessageSquare,
  ArrowRight,
  Search,
  RefreshCw,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import { useCommunityStore } from '../stores/communityStore'
import type { Community, CommunityCategory } from '../services/mockData'
import { usePlatform } from '../hooks/usePlatform'

// ── 工具函数 ──────────────────────────────────────────

function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

// ── 分类筛选 ──────────────────────────────────────────

const CATEGORIES: Array<{ key: 'all' | CommunityCategory; label: string }> = [
  { key: 'all', label: '全部' },
  { key: '科技', label: '科技' },
  { key: '娱乐', label: '娱乐' },
  { key: '社会', label: '社会' },
  { key: '财经', label: '财经' },
  { key: '教育', label: '教育' },
  { key: '健康', label: '健康' },
  { key: '游戏', label: '游戏' },
  { key: '体育', label: '体育' },
  { key: '旅行', label: '旅行' },
  { key: '美食', label: '美食' },
]

// ── 社区卡片骨架屏 ──────────────────────────────────────────

function CommunityCardSkeleton() {
  return (
    <div className="bg-surface rounded-2xl border border-line/40 overflow-hidden shadow-sm">
      <div className="h-24 skeleton" />
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl skeleton" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-24 skeleton" />
            <div className="h-3 w-16 skeleton" />
          </div>
        </div>
        <div className="h-3 w-full skeleton" />
        <div className="h-3 w-3/4 skeleton" />
        <div className="flex gap-4 pt-2">
          <div className="h-3 w-16 skeleton" />
          <div className="h-3 w-16 skeleton" />
        </div>
      </div>
    </div>
  )
}

// ── 社区卡片 ──────────────────────────────────────────

interface CommunityCardProps {
  community: Community
  index: number
  onClick: (id: string) => void
}

function CommunityCard({ community, index, onClick }: CommunityCardProps) {
  return (
    <button
      onClick={() => onClick(community.id)}
      className="group bg-surface rounded-2xl border border-line/40 overflow-hidden shadow-sm hover:shadow-card-hover hover:border-line transition-all duration-200 text-left press-pop animate-fade-in-up"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      {/* 封面图 */}
      <div className="relative h-24 overflow-hidden bg-paper-100">
        <img
          src={community.coverImage}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {/* 渐变蒙层，确保 icon 可读 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
        {/* 社区图标 */}
        <div className="absolute -bottom-5 left-5 w-12 h-12 rounded-xl bg-surface border-2 border-surface shadow-card flex items-center justify-center text-[22px]">
          {community.icon}
        </div>
        {/* 分类徽章：粉色渐变 */}
        <span
          className="absolute top-3 right-3 px-2 py-0.5 text-[11px] font-bold text-white rounded-md shadow-sm backdrop-blur-sm"
          style={{ background: 'linear-gradient(135deg, #EC4899, #F43F5E)' }}
        >
          {community.category}
        </span>
      </div>

      {/* 内容 */}
      <div className="px-5 pt-7 pb-4">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="text-[16px] font-bold text-ink-900 leading-snug group-hover:text-seal transition-colors line-clamp-1">
            {community.name}
          </h3>
          <ArrowRight
            size={16}
            className="text-ink-300 group-hover:text-seal group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1"
          />
        </div>

        <p className="text-[13px] text-ink-500 leading-relaxed line-clamp-2 mb-3 min-h-[36px]">
          {community.description}
        </p>

        <div className="flex items-center gap-4 text-[12px] text-ink-400">
          <span className="flex items-center gap-1">
            <Users size={13} strokeWidth={1.75} />
            <span className="font-medium text-ink-600">{formatCount(community.memberCount)}</span>
            <span>成员</span>
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare size={13} strokeWidth={1.75} />
            <span className="font-medium text-ink-600">{formatCount(community.postCount)}</span>
            <span>帖子</span>
          </span>
        </div>
      </div>
    </button>
  )
}

// ── 主组件 ──────────────────────────────────────────

export default function CommunityPage() {
  const navigate = useNavigate()
  const { isMobile } = usePlatform()
  const {
    communities,
    communitiesLoading,
    communitiesError,
    loadCommunities,
  } = useCommunityStore()

  const [activeCategory, setActiveCategory] = useState<'all' | CommunityCategory>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadCommunities()
  }, [loadCommunities])

  const filteredCommunities = useMemo(() => {
    let list = communities
    if (activeCategory !== 'all') {
      list = list.filter(c => c.category === activeCategory)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter(
        c =>
          c.name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q),
      )
    }
    return list
  }, [communities, activeCategory, searchQuery])

  const handleEnterCommunity = (id: string) => {
    navigate(`/community/${id}`)
  }

  const handleRetry = () => {
    // 强制重新加载：清空已加载数据
    useCommunityStore.setState({ communities: [], communitiesError: null })
    loadCommunities()
  }

  return (
    <div className={`min-h-full bg-paper-50 ${isMobile ? 'pb-[64px]' : ''}`}>
      {/* ── 顶部 Banner ── */}
      <div
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #FDF2F8 0%, #FAF5FF 35%, #FFF1F2 70%, #FFFFFF 100%)',
        }}
      >
        <div className={`mx-auto ${isMobile ? 'px-5 py-7' : 'max-w-6xl px-8 py-10'}`}>
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={18} className="text-pink-500" strokeWidth={2} />
                <span className="text-[12px] font-bold tracking-wider text-pink-600 uppercase">
                  Community Hub
                </span>
              </div>
              <h1 className="text-[26px] md:text-[32px] font-bold text-ink-900 leading-tight mb-2">
                观微社区
              </h1>
              <p className="text-[14px] md:text-[15px] text-ink-600 leading-relaxed max-w-xl">
                10 个官方社区，覆盖科技、娱乐、社会、财经等领域。
                理性表达，事实优先，让每一次发声都有价值。
              </p>
            </div>

            {!isMobile && (
              <div className="hidden md:flex items-center gap-2 flex-shrink-0">
                <div className="px-4 py-2 bg-white/70 backdrop-blur rounded-xl border border-pink-100">
                  <div className="text-[11px] text-ink-400 font-medium">在线社区</div>
                  <div className="text-[20px] font-bold text-ink-900">{communities.length || 10}</div>
                </div>
              </div>
            )}
          </div>

          {/* 装饰光斑 */}
          <div className="absolute -top-6 right-10 w-32 h-32 rounded-full bg-pink-200/30 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-24 h-24 rounded-full bg-rose-200/30 blur-2xl pointer-events-none" />
        </div>
      </div>

      {/* ── 搜索栏 + 分类筛选 ── */}
      <div className="sticky top-0 z-10 bg-white/85 backdrop-blur-xl border-b border-line/40">
        <div className={`mx-auto ${isMobile ? 'px-4 py-3' : 'max-w-6xl px-8 py-3'}`}>
          {/* 搜索框 */}
          <div className="relative mb-3">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索社区名称、描述或分类"
              className="w-full pl-9 pr-3 py-2 text-[14px] bg-paper-100 rounded-xl border border-transparent focus:bg-surface focus:border-pink-200 transition-all placeholder:text-ink-300 text-ink-800"
            />
          </div>

          {/* 分类 chips */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none -mx-1 px-1">
            {CATEGORIES.map(cat => {
              const isActive = activeCategory === cat.key
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`px-3.5 py-1.5 text-[13px] font-semibold rounded-full transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                    isActive
                      ? 'text-white shadow-sm'
                      : 'text-ink-500 bg-paper-100 hover:text-ink-700 hover:bg-paper-200'
                  }`}
                  style={
                    isActive
                      ? { background: 'linear-gradient(135deg, #EC4899, #F43F5E)' }
                      : undefined
                  }
                >
                  {cat.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── 社区列表 ── */}
      <div className={`mx-auto ${isMobile ? 'px-4 py-4' : 'max-w-6xl px-8 py-6'}`}>
        {/* 错误状态 */}
        {communitiesError && !communitiesLoading && (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <AlertCircle size={26} className="text-red-500" />
            </div>
            <p className="text-[15px] font-semibold text-ink-800 mb-1">加载社区失败</p>
            <p className="text-[13px] text-ink-500 mb-4 text-center max-w-xs">{communitiesError}</p>
            <button
              onClick={handleRetry}
              className="flex items-center gap-1.5 px-4 py-2 bg-seal text-white rounded-xl text-[13px] font-medium hover:bg-seal-600 transition-colors press-pop"
            >
              <RefreshCw size={14} />
              重试
            </button>
          </div>
        )}

        {/* 骨架屏 */}
        {communitiesLoading && (
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'}`}>
            {Array.from({ length: 9 }).map((_, i) => (
              <CommunityCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* 空状态：筛选无结果 */}
        {!communitiesLoading && !communitiesError && filteredCommunities.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-14 h-14 rounded-full bg-paper-200 flex items-center justify-center mb-4">
              <Search size={24} className="text-ink-300" />
            </div>
            <p className="text-[15px] font-semibold text-ink-800 mb-1">没有找到匹配的社区</p>
            <p className="text-[13px] text-ink-500 mb-4">试试换个关键词或分类</p>
            <button
              onClick={() => {
                setSearchQuery('')
                setActiveCategory('all')
              }}
              className="px-4 py-2 bg-paper-200 text-ink-700 rounded-xl text-[13px] font-medium hover:bg-paper-100 transition-colors press-pop"
            >
              清空筛选
            </button>
          </div>
        )}

        {/* 社区网格 */}
        {!communitiesLoading && !communitiesError && filteredCommunities.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[13px] text-ink-500">
                共 <span className="font-semibold text-ink-800">{filteredCommunities.length}</span> 个社区
              </p>
            </div>
            <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'}`}>
              {filteredCommunities.map((community, i) => (
                <CommunityCard
                  key={community.id}
                  community={community}
                  index={i}
                  onClick={handleEnterCommunity}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
