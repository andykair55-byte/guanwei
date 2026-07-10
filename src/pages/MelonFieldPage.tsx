import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, Sparkles, Swords, Network } from 'lucide-react'
import { api } from '../services/api'
import { transformMelonList } from '../utils/transform'
import type { Melon, MelonCategory } from '../types'

const MOCK_MELONS: Melon[] = [
  {
    id: 'mock-1', title: '某知名综艺节目被曝剧本造假，冠军早已内定？',
    description: '多位参赛选手匿名爆料称节目组提前安排赛果，引发广泛讨论。',
    coverImage: 'https://picsum.photos/seed/melon1/400/260', category: '娱乐', difficulty: 2,
    trueCount: 128, falseCount: 356, totalParticipants: 484,
    revealTime: new Date(Date.now() + 2 * 3600 * 1000).toISOString(), status: 'pending',
    likeCount: 128, commentCount: 356, evidenceCount: 17, isLiked: false,
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: 'mock-2', title: '自研芯片超越骁龙8 Gen 4，某国产手机品牌宣布重大突破',
    description: '该品牌在发布会上展示了自研芯片的跑分数据，声称性能领先业界。',
    coverImage: 'https://picsum.photos/seed/melon2/400/260', category: '科技', difficulty: 3,
    trueCount: 89, falseCount: 312, totalParticipants: 401,
    revealTime: new Date(Date.now() + 5 * 3600 * 1000).toISOString(), status: 'pending',
    likeCount: 89, commentCount: 312, evidenceCount: 9, isLiked: false,
    createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
  },
  {
    id: 'mock-3', title: '远程办公比坐班更高效？最新研究颠覆你的认知',
    description: '斯坦福大学最新研究表明远程办公效率提升23%，但团队协作能力下降。',
    coverImage: 'https://picsum.photos/seed/melon3/400/260', category: '社会热点', difficulty: 2,
    trueCount: 64, falseCount: 189, totalParticipants: 253,
    revealTime: new Date(Date.now() + 12 * 3600 * 1000).toISOString(), status: 'pending',
    likeCount: 64, commentCount: 189, evidenceCount: 23, isLiked: false,
    createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
  },
  {
    id: 'mock-4', title: '人类首次发现月球背面存在大量水冰',
    description: '嫦娥六号探测器传回的数据显示月球背面存在大量水冰资源。',
    coverImage: 'https://picsum.photos/seed/melon4/400/260', category: '科技', difficulty: 1,
    trueCount: 72, falseCount: 241, totalParticipants: 313,
    revealTime: new Date(Date.now() + 1 * 3600 * 1000).toISOString(), status: 'pending',
    likeCount: 72, commentCount: 241, evidenceCount: 31, isLiked: false,
    createdAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
  },
  {
    id: 'mock-5', title: '为什么顶尖大学里的学生反而更焦虑？',
    description: '调查显示名校学生的心理健康问题比例远高于普通院校。',
    coverImage: 'https://picsum.photos/seed/melon5/400/260', category: '校园', difficulty: 2,
    trueCount: 55, falseCount: 178, totalParticipants: 233,
    revealTime: new Date(Date.now() + 24 * 3600 * 1000).toISOString(), status: 'pending',
    likeCount: 55, commentCount: 178, evidenceCount: 14, isLiked: false,
    createdAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
  },
  {
    id: 'mock-6', title: '年轻人该不该躺平？一场关于人生选择的辩论',
    description: '社交媒体上"躺平"话题持续发酵，不同代际观点碰撞激烈。',
    coverImage: 'https://picsum.photos/seed/melon6/400/260', category: '社会热点', difficulty: 1,
    trueCount: 91, falseCount: 284, totalParticipants: 375,
    revealTime: new Date(Date.now() + 8 * 3600 * 1000).toISOString(), status: 'pending',
    likeCount: 91, commentCount: 284, evidenceCount: 11, isLiked: false,
    createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
  },
  {
    id: 'mock-7', title: '隔夜水和千滚水真的致癌吗？专家最新解读来了',
    description: '多位食品科学专家对网络流传的"致癌水"说法进行逐一辟谣。',
    coverImage: 'https://picsum.photos/seed/melon7/400/260', category: '生活科普', difficulty: 2,
    trueCount: 48, falseCount: 156, totalParticipants: 204,
    revealTime: new Date(Date.now() + 18 * 3600 * 1000).toISOString(), status: 'pending',
    likeCount: 48, commentCount: 156, evidenceCount: 8, isLiked: false,
    createdAt: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
  },
  {
    id: 'mock-8', title: '网红带货是不是新型传销？监管部门最新回应',
    description: '多地市场监管局对网红带货模式展开调查，部分头部主播被约谈。',
    coverImage: 'https://picsum.photos/seed/melon8/400/260', category: '娱乐', difficulty: 3,
    trueCount: 67, falseCount: 203, totalParticipants: 270,
    revealTime: new Date(Date.now() + 6 * 3600 * 1000).toISOString(), status: 'pending',
    likeCount: 67, commentCount: 203, evidenceCount: 19, isLiked: false,
    createdAt: new Date(Date.now() - 16 * 3600 * 1000).toISOString(),
  },
]

const AUTHORS = [
  { name: '吃瓜群众', time: '2小时前' },
  { name: '科技探索者', time: '4小时前' },
  { name: '社会观察员', time: '6小时前' },
  { name: '星际探索家', time: '8小时前' },
  { name: '学习日记', time: '10小时前' },
  { name: '思辨者', time: '12小时前' },
  { name: '生活研究所', time: '14小时前' },
  { name: '娱乐显微镜', time: '16小时前' },
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
const TIME_LABELS = ['刚刚', '5分钟前', '30分钟前', '1小时前', '3小时前', '6小时前']

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateRandomMelon(index: number): Melon {
  const title = RANDOM_TITLES[index % RANDOM_TITLES.length]
  const category = RANDOM_CATEGORIES[randomInt(0, RANDOM_CATEGORIES.length - 1)]
  return {
    id: `random-${index}-${Date.now()}`, title, description: '',
    coverImage: `https://picsum.photos/seed/melon${index + 10}/400/260`, category,
    difficulty: randomInt(1, 3) as 1 | 2 | 3, trueCount: randomInt(30, 200), falseCount: randomInt(50, 400),
    totalParticipants: randomInt(100, 600),
    revealTime: new Date(Date.now() + randomInt(1, 48) * 3600 * 1000).toISOString(),
    status: 'pending', likeCount: randomInt(20, 300), commentCount: randomInt(30, 500),
    evidenceCount: randomInt(3, 30), isLiked: false,
    createdAt: new Date(Date.now() - randomInt(1, 72) * 3600 * 1000).toISOString(),
  }
}

function MelonCard({ melon, author, index }: { melon: Melon; author: typeof AUTHORS[0]; index: number }) {
  const navigate = useNavigate()
  return (
    <article
      className="group cursor-pointer animate-fade-in-up"
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={() => navigate(`/melon/${melon.id}`)}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-paper-100 mb-3.5 shadow-sm group-hover:shadow-md transition-shadow duration-300">
        <img
          src={melon.coverImage}
          alt={melon.title}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <span className="absolute top-3 left-3 px-2.5 py-1 text-[10px] font-semibold text-white bg-black/70 backdrop-blur-md rounded-md">
          {melon.category}
        </span>
      </div>
      <h3 className="text-[14px] font-semibold text-ink-800 leading-snug line-clamp-2 mb-2.5 group-hover:text-seal-600 transition-colors duration-200">
        {melon.title}
      </h3>
      <div className="flex items-center justify-between text-[12px] text-ink-400">
        <div className="flex items-center gap-2">
          <span className="font-medium text-ink-500">{author.name}</span>
          <span className="text-ink-200">·</span>
          <span>{author.time}</span>
        </div>
        <div className="flex items-center gap-1 text-ink-400">
          <MessageCircle size={12} strokeWidth={2} />
          <span>{melon.commentCount}</span>
        </div>
      </div>
    </article>
  )
}

export default function MelonFieldPage() {
  const navigate = useNavigate()
  const [melons, setMelons] = useState<Melon[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('推荐')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

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

  const tabs = ['推荐', '娱乐', '科技', '社会', '生活', '财经', '校园', '健康']

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-shrink-0 px-6 py-4 border-b border-ink-100/50">
        <div className="flex items-center gap-8 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const isActive = tab === selectedCategory
            return (
              <button
                key={tab}
                onClick={() => setSelectedCategory(tab)}
                className={`pb-3.5 text-[15px] font-semibold transition-colors relative flex-shrink-0 tracking-tight ${
                  isActive ? 'text-ink-900' : 'text-ink-300 hover:text-ink-600'
                }`}
              >
                {tab}
                {isActive && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-ink-900 rounded-full" />}
              </button>
            )
          })}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="px-6 py-6">
          {loading ? (
            <div className="grid grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i}>
                  <div className="aspect-[4/3] rounded-xl bg-paper-100 animate-pulse mb-3.5" />
                  <div className="h-4 bg-paper-100 rounded animate-pulse w-4/5 mb-2.5" />
                  <div className="h-3 bg-paper-100 rounded animate-pulse w-2/5" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-6">
                {melons.map((melon, i) => (
                  <MelonCard
                    key={melon.id}
                    melon={melon}
                    author={{
                      name: i < AUTHORS.length ? AUTHORS[i].name : RANDOM_AUTHORS[i % RANDOM_AUTHORS.length],
                      time: i < AUTHORS.length ? AUTHORS[i].time : TIME_LABELS[i % TIME_LABELS.length],
                    }}
                    index={i}
                  />
                ))}
              </div>

              <div ref={sentinelRef} className="h-12" />
              {loadingMore && (
                <div className="flex justify-center py-6">
                  <div className="w-5 h-5 border-2 border-paper-200 border-t-ink-900 rounded-full animate-spin" />
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <div className="flex-shrink-0 border-t border-ink-100/50 px-6 py-3 bg-white">
        <div className="flex items-center justify-center gap-10">
          <button onClick={() => navigate('/verify')} className="flex items-center gap-2 text-[13px] text-ink-500 hover:text-seal-600 transition-colors font-medium">
            <Sparkles size={16} strokeWidth={2} />
            <span>AI求证</span>
          </button>
          <div className="w-px h-4 bg-ink-100" />
          <button onClick={() => navigate('/debates')} className="flex items-center gap-2 text-[13px] text-ink-500 hover:text-ink-900 transition-colors font-medium">
            <Swords size={16} strokeWidth={2} />
            <span>辩论对决</span>
          </button>
          <div className="w-px h-4 bg-ink-100" />
          <button onClick={() => navigate('/hot')} className="flex items-center gap-2 text-[13px] text-ink-500 hover:text-blue-500 transition-colors font-medium">
            <Network size={16} strokeWidth={2} />
            <span>知识图谱</span>
          </button>
        </div>
      </div>
    </div>
  )
}
