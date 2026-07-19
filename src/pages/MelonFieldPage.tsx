import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, Users, Sparkles, Swords, TrendingUp, Clock, Award, Flame, PenLine } from 'lucide-react'
import { api } from '../services/api'
import { transformMelonList } from '../utils/transform'
import PostDetailModal from '../components/PostDetailModal'
import type { Melon, MelonCategory } from '../types'

// ── 分类标签颜色配置 ──────────────────────────────────────
const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  '娱乐': { bg: 'bg-violet-500', text: 'text-white' },
  '科技': { bg: 'bg-blue-500', text: 'text-white' },
  '社会': { bg: 'bg-orange-500', text: 'text-white' },
  '生活': { bg: 'bg-emerald-500', text: 'text-white' },
  '财经': { bg: 'bg-amber-500', text: 'text-white' },
  '历史': { bg: 'bg-amber-700', text: 'text-white' },
  '学习': { bg: 'bg-indigo-500', text: 'text-white' },
}

const getCategoryColor = (category: string) => {
  const map: Record<string, string> = {
    '社会热点': '社会',
    '生活科普': '生活',
    '校园': '学习',
    '健康': '生活',
  }
  const key = map[category] || category
  return CATEGORY_COLORS[key] || { bg: 'bg-gray-500', text: 'text-white' }
}

// ── 状态标签配置 ──────────────────────────────────────
type MelonStatus = 'verifying' | 'debated' | 'commented'

const STATUS_CONFIG: Record<MelonStatus, { label: string; bg: string; text: string }> = {
  verifying: { label: '求证中', bg: 'bg-emerald-100', text: 'text-emerald-600' },
  debated: { label: '已辩论', bg: 'bg-red-100', text: 'text-red-600' },
  commented: { label: '已评论', bg: 'bg-gray-100', text: 'text-gray-500' },
}

const getStatusFromMelon = (melon: Melon, index: number): MelonStatus => {
  if (melon.commentCount > 300) return 'debated'
  if (index % 3 === 0) return 'verifying'
  if (index % 3 === 1) return 'debated'
  return 'commented'
}

// ── 像素风西瓜装饰 ──────────────────────────────────────
function PixelWatermelon() {
  // 用 CSS 网格拼一个像素风的半块西瓜
  // 12 x 8 像素网格
  const pixels = [
    // 瓜皮（深绿）
    [0,0,0,0,0,1,1,0,0,0,0,0],
    [0,0,0,1,1,2,2,1,1,0,0,0],
    [0,0,1,2,2,2,2,2,2,1,0,0],
    [0,1,2,2,2,2,2,2,2,2,1,0],
    // 瓜瓤（红）
    [1,3,3,4,3,3,4,3,3,4,3,1],
    [1,3,3,3,3,4,3,3,4,3,3,1],
    [1,3,4,3,3,3,3,4,3,3,4,1],
    [1,1,1,1,1,1,1,1,1,1,1,1], // 底部瓜皮
  ]
  const colorMap: Record<number, string> = {
    0: 'transparent',
    1: '#166534', // 深绿瓜皮外
    2: '#22c55e', // 浅绿瓜皮内
    3: '#ef4444', // 红瓤
    4: '#1f2937', // 瓜籽
  }
  return (
    <div className="relative" style={{ imageRendering: 'pixelated' }}>
      {/* 主西瓜 */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: 'repeat(12, 8px)',
          gridTemplateRows: 'repeat(8, 8px)',
          gap: '1px',
          filter: 'drop-shadow(4px 4px 0 rgba(0,0,0,0.1))',
        }}
      >
        {pixels.flat().map((c, i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              backgroundColor: colorMap[c],
              borderRadius: c === 4 ? '1px' : 0,
            }}
          />
        ))}
      </div>
      {/* 漂浮的小瓜籽 */}
      <div
        className="absolute -top-2 -right-2 w-2 h-3 bg-gray-800 rounded-sm rotate-45 animate-bounce"
        style={{ animationDuration: '2s' }}
      />
      <div
        className="absolute top-4 -right-4 w-1.5 h-2.5 bg-gray-800 rounded-sm -rotate-12 animate-bounce"
        style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}
      />
      <div
        className="absolute -top-4 left-6 w-2 h-2 bg-yellow-300 rotate-45 animate-pulse"
        style={{ boxShadow: '0 0 8px #fde047' }}
      />
    </div>
  )
}

// ── 像素星星 ──────────────────────────────────────────
function PixelStar({ className = '', delay = 0 }: { className?: string; delay?: number }) {
  return (
    <div className={`absolute ${className}`} style={{ animationDelay: `${delay}s` }}>
      <div
        className="w-3 h-3 bg-yellow-300 rotate-45 animate-pulse"
        style={{
          boxShadow: `
            0 -6px 0 #fde047,
            0 6px 0 #fde047,
            -6px 0 0 #fde047,
            6px 0 0 #fde047
          `,
          animationDuration: '2s',
        }}
      />
    </div>
  )
}

// ── Mock 数据 ──────────────────────────────────────
const MOCK_MELONS: Melon[] = [
  {
    id: 'mock-1', title: '某知名综艺节目被曝剧本造假，冠军早已内定？',
    description: '多位参赛选手匿名爆料称节目组提前安排赛果，引发广泛讨论。',
    coverImage: 'https://picsum.photos/seed/melon1/400/300', category: '娱乐', difficulty: 2,
    trueCount: 128, falseCount: 356, totalParticipants: 484,
    revealTime: new Date(Date.now() + 2 * 3600 * 1000).toISOString(), status: 'pending',
    likeCount: 128, commentCount: 356, evidenceCount: 17, isLiked: false,
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    author: { id: 'a1', nickname: '娱乐揭秘君', avatar: 'https://picsum.photos/seed/ca1/80/80', rank: '鉴瓜达人' },
  },
  {
    id: 'mock-2', title: '自研芯片超越骁龙8 Gen 4，某国产手机品牌宣布重大突破',
    description: '该品牌在发布会上展示了自研芯片的跑分数据，声称性能领先业界。',
    coverImage: 'https://picsum.photos/seed/melon2/400/300', category: '科技', difficulty: 3,
    trueCount: 89, falseCount: 312, totalParticipants: 401,
    revealTime: new Date(Date.now() + 5 * 3600 * 1000).toISOString(), status: 'pending',
    likeCount: 89, commentCount: 312, evidenceCount: 9, isLiked: false,
    createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    author: { id: 'a2', nickname: '科技探索者', avatar: 'https://picsum.photos/seed/ca2/80/80', rank: '鉴瓜大师' },
  },
  {
    id: 'mock-3', title: '远程办公比坐班更高效？最新研究颠覆你的认知',
    description: '斯坦福大学最新研究表明远程办公效率提升23%，但团队协作能力下降。',
    coverImage: 'https://picsum.photos/seed/melon3/400/300', category: '社会热点', difficulty: 2,
    trueCount: 64, falseCount: 189, totalParticipants: 253,
    revealTime: new Date(Date.now() + 12 * 3600 * 1000).toISOString(), status: 'pending',
    likeCount: 64, commentCount: 189, evidenceCount: 23, isLiked: false,
    createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    author: { id: 'a3', nickname: '社会观察员', avatar: 'https://picsum.photos/seed/ca3/80/80', rank: '瓜田侦探' },
  },
  {
    id: 'mock-4', title: '人类首次发现月球背面存在大量水冰',
    description: '嫦娥六号探测器传回的数据显示月球背面存在大量水冰资源。',
    coverImage: 'https://picsum.photos/seed/melon4/400/300', category: '科技', difficulty: 1,
    trueCount: 72, falseCount: 241, totalParticipants: 313,
    revealTime: new Date(Date.now() + 1 * 3600 * 1000).toISOString(), status: 'pending',
    likeCount: 72, commentCount: 241, evidenceCount: 31, isLiked: false,
    createdAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    author: { id: 'a4', nickname: '星际探索家', avatar: 'https://picsum.photos/seed/ca4/80/80', rank: '鉴瓜学徒' },
  },
  {
    id: 'mock-5', title: '为什么顶尖大学里的学生反而更焦虑？',
    description: '调查显示名校学生的心理健康问题比例远高于普通院校。',
    coverImage: 'https://picsum.photos/seed/melon5/400/300', category: '校园', difficulty: 2,
    trueCount: 55, falseCount: 178, totalParticipants: 233,
    revealTime: new Date(Date.now() + 24 * 3600 * 1000).toISOString(), status: 'pending',
    likeCount: 55, commentCount: 178, evidenceCount: 14, isLiked: false,
    createdAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    author: { id: 'a5', nickname: '学习日记', avatar: 'https://picsum.photos/seed/ca5/80/80', rank: '鉴瓜达人' },
  },
  {
    id: 'mock-6', title: '年轻人该不该躺平？一场关于人生选择的辩论',
    description: '社交媒体上"躺平"话题持续发酵，不同代际观点碰撞激烈。',
    coverImage: 'https://picsum.photos/seed/melon6/400/300', category: '社会热点', difficulty: 1,
    trueCount: 91, falseCount: 284, totalParticipants: 375,
    revealTime: new Date(Date.now() + 8 * 3600 * 1000).toISOString(), status: 'pending',
    likeCount: 91, commentCount: 284, evidenceCount: 11, isLiked: false,
    createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    author: { id: 'a6', nickname: '思辨者', avatar: 'https://picsum.photos/seed/ca6/80/80', rank: '鉴瓜大师' },
  },
  {
    id: 'mock-7', title: '隔夜水和千滚水真的致癌吗？专家最新解读来了',
    description: '多位食品科学专家对网络流传的"致癌水"说法进行逐一辟谣。',
    coverImage: 'https://picsum.photos/seed/melon7/400/300', category: '生活科普', difficulty: 2,
    trueCount: 48, falseCount: 156, totalParticipants: 204,
    revealTime: new Date(Date.now() + 18 * 3600 * 1000).toISOString(), status: 'pending',
    likeCount: 48, commentCount: 156, evidenceCount: 8, isLiked: false,
    createdAt: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
    author: { id: 'a7', nickname: '生活研究所', avatar: 'https://picsum.photos/seed/ca7/80/80', rank: '瓜田侦探' },
  },
  {
    id: 'mock-8', title: '网红带货是不是新型传销？监管部门最新回应',
    description: '多地市场监管局对网红带货模式展开调查，部分头部主播被约谈。',
    coverImage: 'https://picsum.photos/seed/melon8/400/300', category: '财经', difficulty: 3,
    trueCount: 67, falseCount: 203, totalParticipants: 270,
    revealTime: new Date(Date.now() + 6 * 3600 * 1000).toISOString(), status: 'pending',
    likeCount: 67, commentCount: 203, evidenceCount: 19, isLiked: false,
    createdAt: new Date(Date.now() - 16 * 3600 * 1000).toISOString(),
    author: { id: 'a8', nickname: '财经观察', avatar: 'https://picsum.photos/seed/ca8/80/80', rank: '鉴瓜达人' },
  },
  {
    id: 'mock-9', title: '专家称发现了曹操墓的真正位置，与官方认定完全不同',
    description: '民间考古爱好者声称在河南安阳另一处发现了曹操墓的确凿证据。',
    coverImage: 'https://picsum.photos/seed/melon9/400/300', category: '历史', difficulty: 2,
    trueCount: 42, falseCount: 168, totalParticipants: 210,
    revealTime: new Date(Date.now() + 20 * 3600 * 1000).toISOString(), status: 'pending',
    likeCount: 42, commentCount: 168, evidenceCount: 25, isLiked: false,
    createdAt: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
    author: { id: 'a9', nickname: '历史侦探', avatar: 'https://picsum.photos/seed/ca9/80/80', rank: '鉴瓜学徒' },
  },
  {
    id: 'mock-10', title: '股市将迎来新一轮牛市？分析师观点两极分化',
    description: '多家机构发布年度策略报告，对后市走势判断存在巨大分歧。',
    coverImage: 'https://picsum.photos/seed/melon10/400/300', category: '财经', difficulty: 3,
    trueCount: 156, falseCount: 423, totalParticipants: 579,
    revealTime: new Date(Date.now() + 3 * 3600 * 1000).toISOString(), status: 'pending',
    likeCount: 156, commentCount: 423, evidenceCount: 16, isLiked: false,
    createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    author: { id: 'a10', nickname: '数据猎人', avatar: 'https://picsum.photos/seed/ca10/80/80', rank: '鉴瓜大师' },
  },
  {
    id: 'mock-11', title: '每天走一万步能减肥？运动科学告诉你真相',
    description: '一万步理论源于日本计步器营销，但最新研究表明关键在于运动强度。',
    coverImage: 'https://picsum.photos/seed/melon11/400/300', category: '生活科普', difficulty: 1,
    trueCount: 38, falseCount: 142, totalParticipants: 180,
    revealTime: new Date(Date.now() + 10 * 3600 * 1000).toISOString(), status: 'pending',
    likeCount: 38, commentCount: 142, evidenceCount: 7, isLiked: false,
    createdAt: new Date(Date.now() - 9 * 3600 * 1000).toISOString(),
    author: { id: 'a11', nickname: '健康达人', avatar: 'https://picsum.photos/seed/ca11/80/80', rank: '瓜田新手' },
  },
  {
    id: 'mock-12', title: '敦煌壁画修复被指破坏原貌，引发保护方式争论',
    description: '一组修复前后对比照引发争议，修复团队回应称采用可逆材料。',
    coverImage: 'https://picsum.photos/seed/melon12/400/300', category: '历史', difficulty: 2,
    trueCount: 56, falseCount: 198, totalParticipants: 254,
    revealTime: new Date(Date.now() + 15 * 3600 * 1000).toISOString(), status: 'pending',
    likeCount: 56, commentCount: 198, evidenceCount: 21, isLiked: false,
    createdAt: new Date(Date.now() - 11 * 3600 * 1000).toISOString(),
    author: { id: 'a12', nickname: '文物守护者', avatar: 'https://picsum.photos/seed/ca12/80/80', rank: '鉴瓜达人' },
  },
]

const RANDOM_TITLES = [
  '量子计算能否在十年内突破经典计算极限？',
  '冥想对大脑灰质的影响：科学证据汇总',
  '全球芯片供应链正在加速去中心化',
  'Z世代为何更信任独立创作者而非传统媒体？',
  '深海碳封存技术是救星还是隐患？',
  'AI生成代码的安全漏洞率比人类高37%',
  '城市绿肺计划：垂直森林能否真正改善空气质量？',
  '脑机接口技术突破：瘫痪患者重新行走',
  '社交媒体算法是否加剧了社会极化？',
  '基因编辑婴儿：科学伦理的红线在哪里？',
]

const RANDOM_CATEGORIES: MelonCategory[] = ['科技', '社会热点', '生活科普', '财经', '娱乐', '校园', '健康']
const RANDOM_AUTHORS = ['量子猫', '深空观察', '数据猎人', '真相猎手', '逻辑控', '知识矿工', '理性之声', '质疑者']
const RANDOM_AVATARS = ['ca13', 'ca14', 'ca15', 'ca16', 'ca17', 'ca18', 'ca19', 'ca20']

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateRandomMelon(index: number): Melon {
  const title = RANDOM_TITLES[index % RANDOM_TITLES.length]
  const category = RANDOM_CATEGORIES[randomInt(0, RANDOM_CATEGORIES.length - 1)]
  const authorIdx = index % RANDOM_AUTHORS.length
  return {
    id: `random-${index}-${Date.now()}`, title, description: '',
    coverImage: `https://picsum.photos/seed/melon${index + 20}/400/300`, category,
    difficulty: randomInt(1, 3) as 1 | 2 | 3, trueCount: randomInt(30, 200), falseCount: randomInt(50, 400),
    totalParticipants: randomInt(100, 600),
    revealTime: new Date(Date.now() + randomInt(1, 48) * 3600 * 1000).toISOString(),
    status: 'pending', likeCount: randomInt(20, 300), commentCount: randomInt(30, 500),
    evidenceCount: randomInt(3, 30), isLiked: false,
    createdAt: new Date(Date.now() - randomInt(1, 72) * 3600 * 1000).toISOString(),
    author: {
      id: `ra${authorIdx}`,
      nickname: RANDOM_AUTHORS[authorIdx],
      avatar: `https://picsum.photos/seed/${RANDOM_AVATARS[authorIdx]}/80/80`,
      rank: '鉴瓜学徒',
    },
  }
}

// ── 瓜田卡片组件 ──────────────────────────────────────
function MelonCard({
  melon, index, onClick, cardRef,
}: {
  melon: Melon
  index: number
  onClick: (e: React.MouseEvent) => void
  cardRef: (el: HTMLElement | null) => void
}) {
  const colorConfig = getCategoryColor(melon.category)
  const statusKey = getStatusFromMelon(melon, index)
  const statusConfig = STATUS_CONFIG[statusKey]

  const displayCategory = (() => {
    const map: Record<string, string> = {
      '社会热点': '社会',
      '生活科普': '生活',
      '校园': '学习',
      '健康': '生活',
    }
    return map[melon.category] || melon.category
  })()

  const timeAgo = (() => {
    const diff = Date.now() - new Date(melon.createdAt).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return '刚刚'
    if (hours < 24) return `${hours}小时前`
    return `${Math.floor(hours / 24)}天前`
  })()

  return (
    <article
      ref={cardRef}
      data-melon-id={melon.id}
      className="group cursor-pointer"
      onClick={onClick}
    >
      {/* 封面图 */}
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-paper-100 mb-2.5 shadow-sm group-hover:shadow-md transition-shadow duration-300">
        <img
          src={melon.coverImage}
          alt={melon.title}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          loading="lazy"
        />
        {/* 分类标签 - 左上角彩色胶囊 */}
        <span className={`absolute top-3 left-3 px-2.5 py-1 text-[10px] font-semibold rounded-full ${colorConfig.bg} ${colorConfig.text} shadow-sm`}>
          {displayCategory}
        </span>
      </div>

      {/* 标题 */}
      <h3 className="text-[13px] font-semibold text-gray-800 leading-snug line-clamp-2 mb-2 group-hover:text-emerald-600 transition-colors duration-200">
        {melon.title}
      </h3>

      {/* 作者信息行 */}
      <div className="flex items-center gap-2 mb-3">
        <img
          src={melon.author?.avatar || 'https://picsum.photos/seed/default/40/40'}
          alt={melon.author?.nickname || '作者'}
          className="w-5 h-5 rounded-full object-cover flex-shrink-0"
          loading="lazy"
        />
        <span className="text-[12px] text-gray-600 font-medium truncate">
          {melon.author?.nickname || '匿名用户'}
        </span>
        <span className="text-gray-300 text-[12px]">·</span>
        <span className="text-[12px] text-gray-400 flex-shrink-0">{timeAgo}</span>
      </div>

      {/* 底部数据行 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="flex items-center gap-1">
            <MessageCircle size={13} strokeWidth={2} />
            <span className="text-[12px]">{melon.commentCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users size={13} strokeWidth={2} />
            <span className="text-[12px]">{melon.totalParticipants}</span>
          </div>
        </div>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusConfig.bg} ${statusConfig.text}`}>
          {statusConfig.label}
        </span>
      </div>
    </article>
  )
}

// ── 主组件 ──────────────────────────────────────
export default function MelonFieldPage() {
  const navigate = useNavigate()
  const [melons, setMelons] = useState<Melon[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('推荐')
  const [sortBy, setSortBy] = useState<'latest' | 'hottest'>('latest')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // ── 排序逻辑：热度公式 = guesses * 0.6 + evidences * 0.4 ──
  const sortedMelons = useMemo(() => {
    if (sortBy === 'hottest') {
      return [...melons].sort((a, b) =>
        (b.totalParticipants * 0.6 + b.evidenceCount * 0.4) -
        (a.totalParticipants * 0.6 + a.evidenceCount * 0.4)
      )
    }
    // latest: 按 createdAt 降序
    return [...melons].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [melons, sortBy])

  // 弹窗状态
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedMelon, setSelectedMelon] = useState<Melon | null>(null)
  const [originRect, setOriginRect] = useState<DOMRect | null>(null)
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map())

  const fetchMelons = useCallback(async () => {
    try {
      setLoading(true)
      const data: any = await api.getMelons(selectedCategory !== '推荐' ? selectedCategory : undefined)
      const items = data.items || data || []
      const transformed = transformMelonList(items)
      setMelons(transformed.length > 0 ? transformed : MOCK_MELONS)
    } catch {
      setMelons(MOCK_MELONS)
    } finally {
      setLoading(false)
    }
  }, [selectedCategory])

  useEffect(() => { fetchMelons() }, [fetchMelons])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && melons.length > 0) {
          setLoadingMore(true)
          setTimeout(() => {
            const newMelons = Array.from({ length: 8 }, (_, i) => generateRandomMelon(melons.length + i))
            setMelons(prev => [...prev, ...newMelons])
            setLoadingMore(false)
          }, 500)
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [melons.length, loadingMore])

  // 打开弹窗（和社区一致：不改 URL，仅弹窗展示）
  const openModal = useCallback((melon: Melon, rect: DOMRect) => {
    setSelectedMelon(melon)
    setOriginRect(rect)
    setModalOpen(true)
  }, [])

  // 关闭弹窗
  const closeModal = useCallback(() => {
    setModalOpen(false)
    setSelectedMelon(null)
  }, [])

  // 处理卡片点击
  const handleCardClick = useCallback((melon: Melon) => (e: React.MouseEvent) => {
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    openModal(melon, rect)
  }, [openModal])

  // 卡片 ref 注册
  const setCardRef = useCallback((id: string) => (el: HTMLElement | null) => {
    if (el) {
      cardRefs.current.set(id, el)
    } else {
      cardRefs.current.delete(id)
    }
  }, [])

  const tabs = ['推荐', '娱乐', '科技', '社会', '生活', '财经', '历史', '学习']

  return (
    <div className="flex flex-col h-full relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #F0FDF4 0%, #ffffff 280px)' }}
    >
      {/* ═══════ 顶部 Banner（情绪型·首页级）═══════ */}
      <div className="flex-shrink-0 px-6 pt-5 pb-2 relative">
        <div
          className="rounded-2xl overflow-hidden relative"
          style={{
            background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 35%, #A7F3D0 70%, #6EE7B7 100%)',
            boxShadow: '0 1px 2px rgba(16, 185, 129, 0.08), 0 8px 24px -8px rgba(16, 185, 129, 0.2)',
          }}
        >
          <div className="flex items-center justify-between px-8 py-7 relative">
            {/* 左侧文字 */}
            <div className="flex flex-col gap-3 z-10">
              <div className="flex items-center gap-2">
                <span
                  className="px-2.5 py-0.5 text-[10px] font-bold text-white rounded-full"
                  style={{
                    background: '#059669',
                    boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.15), 0 1px 2px rgba(5, 150, 105, 0.3)',
                    letterSpacing: '0.5px',
                  }}
                >
                  GUAN WEI · 首页
                </span>
              </div>
              <h1 className="text-[30px] font-bold text-emerald-900 leading-tight tracking-tight">
                瓜田里，
                <span className="relative inline-block">
                  见微知著
                  <span
                    className="absolute -bottom-1 left-0 right-0 h-2 rounded-full"
                    style={{ background: 'rgba(16, 185, 129, 0.3)' }}
                  />
                </span>
              </h1>
              <p className="text-[14px] text-emerald-700/80 leading-relaxed max-w-[380px]">
                每条消息都自带证据链，和大家一起吃瓜、求证、辨真假
              </p>
              <div className="flex items-center gap-3 mt-1">
                <button
                  onClick={() => navigate('/verify')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-[13px] font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  }}
                >
                  <Sparkles size={14} />
                  <span>去求证</span>
                </button>
                <button
                  onClick={() => navigate('/publish')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/80 backdrop-blur-sm text-emerald-800 text-[13px] font-semibold border border-emerald-300/60 hover:bg-white hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <PenLine size={14} strokeWidth={2.5} />
                  <span>发帖</span>
                </button>
                <button
                  onClick={() => navigate('/entertainment/arena')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/70 backdrop-blur-sm text-emerald-800 text-[13px] font-semibold border border-emerald-200/50 hover:bg-white hover:shadow-md transition-all"
                >
                  <Swords size={14} />
                  <span>辩论对决</span>
                </button>
              </div>
            </div>

            {/* 右侧像素西瓜 */}
            <div className="hidden md:flex flex-col items-center gap-3 pr-4">
              <div className="relative">
                <PixelWatermelon />
                {/* 像素星星点缀 */}
                <PixelStar className="top-[-12px] left-[-20px]" delay={0} />
                <PixelStar className="top-[-8px] right-[-28px]" delay={0.5} />
                <PixelStar className="bottom-[20px] left-[-30px]" delay={1} />
              </div>
              <div
                className="text-[10px] font-bold text-emerald-700 tracking-widest"
                style={{ fontFamily: 'monospace' }}
              >
                PIXEL · MELON · v1.0
              </div>
            </div>
          </div>

          {/* 装饰光斑 */}
          <div className="absolute top-0 right-16 w-32 h-32 rounded-full bg-yellow-200/30 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-8 w-20 h-20 rounded-full bg-emerald-300/40 blur-xl pointer-events-none" />
        </div>

        {/* ═══════ 数据统计行 ═══════ */}
        <div className="grid grid-cols-4 gap-3 mt-3">
          {[
            { icon: Flame, label: '今日新瓜', value: '128', unit: '条', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
            { icon: Clock, label: '求证中', value: '36', unit: '个', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
            { icon: Award, label: '鉴瓜达人', value: '2.4k', unit: '位', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
            { icon: Users, label: '在线人数', value: '1.2k', unit: '人', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
          ].map((item, i) => (
            <div
              key={i}
              className="rounded-xl bg-white/70 backdrop-blur-sm px-4 py-3 flex items-center gap-3 border border-white/60 shadow-sm hover:shadow-md transition-shadow"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: item.bg }}
              >
                <item.icon size={16} style={{ color: item.color }} strokeWidth={2} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] text-gray-500 leading-tight">{item.label}</span>
                <span className="text-[16px] font-bold text-gray-800 leading-tight flex items-baseline gap-0.5">
                  {item.value}
                  <span className="text-[10px] font-normal text-gray-400">{item.unit}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════ 分类 Tab 栏（胶囊式，社区风格统一）═══════ */}
      <div className="flex-shrink-0 px-6 py-3 border-b border-gray-100/80 bg-white/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const isActive = tab === selectedCategory
            return (
              <button
                key={tab}
                onClick={() => setSelectedCategory(tab)}
                className={`px-4 py-1.5 text-[13px] font-semibold rounded-full transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                  isActive
                    ? 'text-white shadow-md'
                    : 'bg-gray-100/80 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                }`}
                style={isActive ? {
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  boxShadow: '0 2px 8px -2px rgba(16, 185, 129, 0.4)',
                } : {}}
              >
                {tab}
              </button>
            )
          })}
          {/* 排序切换：最新 / 最热 */}
          <div className="ml-auto flex items-center gap-1.5 flex-shrink-0 bg-gray-100/70 rounded-full p-0.5">
            <button
              onClick={() => setSortBy('latest')}
              className={`px-3 py-1 text-[12px] font-semibold rounded-full transition-all duration-200 flex items-center gap-1 ${
                sortBy === 'latest'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              aria-pressed={sortBy === 'latest'}
            >
              <Clock size={11} strokeWidth={2.5} />
              <span>最新</span>
            </button>
            <button
              onClick={() => setSortBy('hottest')}
              className={`px-3 py-1 text-[12px] font-semibold rounded-full transition-all duration-200 flex items-center gap-1 ${
                sortBy === 'hottest'
                  ? 'bg-white text-amber-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              aria-pressed={sortBy === 'hottest'}
              title="热度 = 猜瓜数 × 0.6 + 佐证数 × 0.4"
            >
              <Flame size={11} strokeWidth={2.5} />
              <span>最热</span>
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-gray-400 flex-shrink-0">
            <TrendingUp size={12} />
            <span>{melons.length} 个瓜</span>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="px-6 py-6">
          {loading ? (
            <div className="grid grid-cols-5 gap-5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                <div key={i}>
                  <div className="aspect-[16/10] rounded-xl bg-paper-100 animate-pulse mb-2.5" />
                  <div className="h-4 bg-paper-100 rounded animate-pulse w-4/5 mb-2.5" />
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded-full bg-paper-100 animate-pulse" />
                    <div className="h-3 bg-paper-100 rounded animate-pulse w-20" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-3 bg-paper-100 rounded animate-pulse" />
                      <div className="w-8 h-3 bg-paper-100 rounded animate-pulse" />
                    </div>
                    <div className="w-12 h-4 bg-paper-100 rounded-full animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-5 gap-5">
                {sortedMelons.map((melon, i) => (
                  <MelonCard
                    key={melon.id}
                    melon={melon}
                    index={i}
                    onClick={handleCardClick(melon)}
                    cardRef={setCardRef(melon.id)}
                  />
                ))}
              </div>

              <div ref={sentinelRef} className="h-12" />
              {loadingMore && (
                <div className="flex justify-center py-6">
                  <div className="w-5 h-5 border-2 border-paper-200 border-t-emerald-500 rounded-full animate-spin" />
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* 弹窗详情页 */}
      {selectedMelon && (
        <PostDetailModal
          melon={selectedMelon}
          isOpen={modalOpen}
          originRect={originRect}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
