import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, Heart, Shield, HelpCircle, MessageSquare, Repeat2, Share } from 'lucide-react'

type PostType = 'help' | 'verify' | 'campus' | 'share' | 'debate'

interface CommunityPost {
  id: string
  type: PostType
  title: string
  content: string
  image?: string
  author: { name: string; level: number; avatar?: string }
  category: string
  likes: number
  comments: number
  reposts: number
  hot?: boolean
  verified?: boolean
  time: string
}

const TYPE_CONFIG: Record<PostType, { label: string; color: string }> = {
  help: { label: '求助', color: '#f59e0b' },
  verify: { label: '求证', color: '#c0392b' },
  campus: { label: '校园', color: '#3b82f6' },
  share: { label: '分享', color: '#10b981' },
  debate: { label: '讨论', color: '#8b5cf6' },
}

const TABS = [
  { key: 'recommend', label: '推荐' },
  { key: 'verify', label: '求证', type: 'verify' as PostType },
  { key: 'help', label: '求助', type: 'help' as PostType },
  { key: 'campus', label: '校园', type: 'campus' as PostType },
  { key: 'debate', label: '讨论', type: 'debate' as PostType },
  { key: 'share', label: '分享', type: 'share' as PostType },
]

const AVATAR_COLORS = ['#111', '#c0392b', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']

const MOCK_POSTS: CommunityPost[] = [
  {
    id: 'c1', type: 'help', title: '',
    content: '毕业季找房，中介给的合同有好多条款看不懂，有没有懂法律的同学帮忙看看这个租房合同有没有坑？',
    image: 'https://picsum.photos/seed/house/600/400',
    author: { name: '应届生小白', level: 3 }, category: '租房避坑',
    likes: 67, comments: 31, reposts: 12, time: '10分钟前',
  },
  {
    id: 'c2', type: 'verify', title: '',
    content: '在学校群里收到一个兼职链接，说是抖音点赞就能日入500，需要先交198元培训费…这个兼职广告是真是假？',
    image: 'https://picsum.photos/seed/parttime/600/400',
    author: { name: '警惕的大学生', level: 12 }, category: '兼职防骗',
    likes: 234, comments: 89, reposts: 156, verified: true, time: '30分钟前', hot: true,
  },
  {
    id: 'c3', type: 'campus', title: '',
    content: '同学转发的通知说因天气原因全部转为线上授课，但教务处官网没看到公告…是真的吗？',
    image: 'https://picsum.photos/seed/campus/600/400',
    author: { name: '求证小队长', level: 8 }, category: '校园通知',
    likes: 156, comments: 43, reposts: 28, time: '1小时前',
  },
  {
    id: 'c4', type: 'debate', title: '',
    content: '在互联网公司实习三个月，发现AI确实能写很多代码，但架构决策还是人来做…AI会不会取代程序员？',
    image: 'https://picsum.photos/seed/code/600/400',
    author: { name: '准程序员', level: 14 }, category: 'AI与就业',
    likes: 356, comments: 287, reposts: 89, time: '2小时前', hot: true,
  },
  {
    id: 'c5', type: 'share', title: '',
    content: '最近一个月用观微AI求证功能验证了30多条常见谣言，发现几个类型特别容易骗人：1. 健康养生类 2. 社会新闻类…',
    image: 'https://picsum.photos/seed/rumor/600/400',
    author: { name: '事实猎人', level: 22 }, category: '求证经验',
    likes: 512, comments: 156, reposts: 234, verified: true, time: '3小时前', hot: true,
  },
  {
    id: 'c6', type: 'verify', title: '',
    content: '我妈天天说隔夜菜有亚硝酸盐会致癌，但我查了几个论文说法不一，到底有没有科学依据？',
    author: { name: '理科生求真', level: 15 }, category: '健康辟谣',
    likes: 89, comments: 67, reposts: 45, time: '4小时前',
  },
  {
    id: 'c7', type: 'help', title: '',
    content: '大二了，和室友关系越来越僵，生活习惯差异太大，但又不想换宿舍…有没有过来人的经验分享？',
    image: 'https://picsum.photos/seed/roommate/600/400',
    author: { name: '迷茫的鱼', level: 5 }, category: '人际关系',
    likes: 178, comments: 95, reposts: 23, time: '5小时前',
  },
  {
    id: 'c8', type: 'campus', title: '',
    content: '有人在群里说花5万可以买到保研名额，还展示了所谓"成功案例"，这肯定是骗局吧？大家一定要警惕！',
    image: 'https://picsum.photos/seed/grad/600/400',
    author: { name: '保研党', level: 6 }, category: '校园防骗',
    likes: 312, comments: 145, reposts: 189, verified: true, time: '6小时前',
  },
]

const RANDOM_CONTENTS = [
  '室友推荐的"内部价"手机比官网便宜2000块，能买吗？',
  '朋友圈疯传某品牌食品检出有害物质，官方还没回应，有人知道内情吗？',
  '有人说喝柠檬水能治感冒美白排毒，有科学依据吗？',
  '收到"学校教务处"发的短信链接要更新学籍信息，是不是钓鱼？',
  '网传某地出台新规限制大学生兼职，真的假的？',
  'AI生成的论文能通过查重吗？实测结果分享…',
  '毕业季租房：中介不会告诉你的5个坑，血的教训！',
]

const RANDOM_IMAGES = [
  'https://picsum.photos/seed/r1/600/400',
  'https://picsum.photos/seed/r2/600/400',
  'https://picsum.photos/seed/r3/600/400',
  'https://picsum.photos/seed/r4/600/400',
  'https://picsum.photos/seed/r5/600/400',
  'https://picsum.photos/seed/r6/600/400',
  'https://picsum.photos/seed/r7/600/400',
]

const RANDOM_AUTHORS = ['量子猫', '深空观察', '数据猎人', '真相猎手', '逻辑控', '知识矿工', '理性之声', '质疑者', '学霸君', '职场新人']
const TIME_LABELS = ['刚刚', '5分钟前', '15分钟前', '30分钟前', '1小时前', '3小时前', '6小时前', '今天']
const CATEGORIES = ['职场经验', '网络谣言', '生活科普', '校园生活', '情感求助', '防骗指南', '学习方法']

function generateRandomPost(index: number): CommunityPost {
  const types: PostType[] = ['help', 'verify', 'campus', 'debate', 'share']
  const type = types[index % types.length]
  return {
    id: `random-${index}-${Date.now()}`,
    type,
    title: '',
    content: RANDOM_CONTENTS[index % RANDOM_CONTENTS.length],
    image: Math.random() > 0.3 ? RANDOM_IMAGES[index % RANDOM_IMAGES.length] : undefined,
    author: { name: RANDOM_AUTHORS[index % RANDOM_AUTHORS.length], level: Math.floor(Math.random() * 25) + 1 },
    category: CATEGORIES[index % CATEGORIES.length],
    likes: Math.floor(Math.random() * 300) + 10,
    comments: Math.floor(Math.random() * 100) + 5,
    reposts: Math.floor(Math.random() * 50),
    time: TIME_LABELS[index % TIME_LABELS.length],
    verified: Math.random() > 0.8,
    hot: Math.random() > 0.85,
  }
}

function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

function PostItem({ post, index }: { post: CommunityPost; index: number }) {
  const navigate = useNavigate()
  const [liked, setLiked] = useState(false)
  const [reposted, setReposted] = useState(false)
  const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length]
  const typeConfig = TYPE_CONFIG[post.type]

  return (
    <article
      className="px-6 py-5 hover:bg-paper-50 transition-colors cursor-pointer border-b border-ink-100/50 animate-fade-in-up"
      style={{ animationDelay: `${index * 30}ms` }}
      onClick={() => navigate(`/community/${post.id}`)}
    >
      <div className="flex gap-4">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm"
          style={{ backgroundColor: avatarColor }}
        >
          <span className="text-[13px] font-bold text-white">{post.author.name[0]}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span className="text-[15px] font-bold text-ink-900 hover:underline">{post.author.name}</span>
            {post.verified && <Shield size={13} className="text-seal-600" fill="#c0392b" fillOpacity={0.15} />}
            {post.hot && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-md font-bold"
                style={{ backgroundColor: `${typeConfig.color}15`, color: typeConfig.color }}
              >
                热门
              </span>
            )}
            <span className="text-[13px] text-ink-400 ml-1">
              Lv.{post.author.level}
            </span>
            <span className="text-[13px] text-ink-200">·</span>
            <span className="text-[13px] text-ink-400">{post.time}</span>
          </div>

          <div className="mb-2">
            <span
              className="inline-block text-[12px] font-bold px-2 py-0.5 rounded-md mr-2"
              style={{ backgroundColor: `${typeConfig.color}12`, color: typeConfig.color }}
            >
              {typeConfig.label}
            </span>
            <span className="text-[12px] text-ink-300">{post.category}</span>
          </div>

          <p className="text-[15px] text-ink-800 leading-relaxed mb-3 tracking-[0.01em]">
            {post.content}
          </p>

          {post.image && (
            <div className="mb-4 rounded-xl overflow-hidden bg-ink-50">
              <img
                src={post.image}
                alt=""
                className="w-full max-w-[500px] aspect-[3/2] object-cover"
              />
            </div>
          )}

          <div className="flex items-center gap-8 text-[13px]">
            <button
              onClick={(e) => { e.stopPropagation() }}
              className="flex items-center gap-1.5 text-ink-400 hover:text-blue-500 transition-colors group"
            >
              <MessageCircle size={16} strokeWidth={1.75} className="group-hover:scale-110 transition-transform" />
              <span>{formatCount(post.comments)}</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setReposted(!reposted) }}
              className={`flex items-center gap-1.5 transition-colors group ${
                reposted ? 'text-emerald-500' : 'text-ink-400 hover:text-emerald-500'
              }`}
            >
              <Repeat2 size={16} strokeWidth={1.75} className="group-hover:scale-110 transition-transform" />
              <span>{formatCount(reposted ? post.reposts + 1 : post.reposts)}</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setLiked(!liked) }}
              className={`flex items-center gap-1.5 transition-colors group ${
                liked ? 'text-seal-600' : 'text-ink-400 hover:text-seal-600'
              }`}
            >
              <Heart
                size={16}
                strokeWidth={1.75}
                className={`group-hover:scale-110 transition-transform ${liked ? 'fill-current' : ''}`}
              />
              <span>{formatCount(liked ? post.likes + 1 : post.likes)}</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation() }}
              className="flex items-center gap-1.5 text-ink-400 hover:text-ink-900 transition-colors group"
            >
              <Share size={16} strokeWidth={1.75} className="group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

export default function CommunityPage() {
  const navigate = useNavigate()
  const [selectedTab, setSelectedTab] = useState('recommend')
  const [posts, setPosts] = useState<CommunityPost[]>(MOCK_POSTS)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const filteredPosts = useMemo(() => {
    if (selectedTab === 'recommend') return posts
    const tab = TABS.find(t => t.key === selectedTab)
    if (!tab?.type) return posts
    return posts.filter(p => p.type === tab.type)
  }, [posts, selectedTab])

  const handleLoadMore = useCallback(() => {
    if (loadingMore) return
    setLoadingMore(true)
    setTimeout(() => {
      const newPosts = Array.from({ length: 5 }, (_, i) => generateRandomPost(posts.length + i))
      setPosts(prev => [...prev, ...newPosts])
      setLoadingMore(false)
    }, 600)
  }, [posts.length, loadingMore])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) handleLoadMore() },
      { rootMargin: '200px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [handleLoadMore])

  return (
    <div className="min-h-full bg-white">
      <div className="sticky top-0 bg-white/95 backdrop-blur-md z-10 border-b border-ink-100/50">
        <div className="flex items-center gap-1 px-4 overflow-x-auto scrollbar-none">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key)}
              className={`px-4 py-3.5 text-[15px] font-semibold transition-colors relative whitespace-nowrap ${
                selectedTab === tab.key
                  ? 'text-ink-900'
                  : 'text-ink-400 hover:text-ink-600'
              }`}
            >
              {tab.label}
              {selectedTab === tab.key && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-ink-900 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 px-6 py-3 border-b border-ink-50 bg-paper-50">
        <button
          onClick={() => navigate('/community/help/new')}
          className="flex items-center gap-2 text-[14px] text-ink-500 hover:text-ink-900 transition-colors font-medium"
        >
          <HelpCircle size={17} strokeWidth={1.75} />
          <span>发起求助</span>
        </button>
        <div className="w-px h-5 bg-ink-100" />
        <button
          onClick={() => navigate('/verify')}
          className="flex items-center gap-2 text-[14px] text-ink-500 hover:text-seal-600 transition-colors font-medium"
        >
          <Shield size={17} strokeWidth={1.75} />
          <span>真假求证</span>
        </button>
        <div className="w-px h-5 bg-ink-100" />
        <button
          className="flex items-center gap-2 text-[14px] text-ink-500 hover:text-violet-500 transition-colors font-medium"
        >
          <MessageSquare size={17} strokeWidth={1.75} />
          <span>发起讨论</span>
        </button>
      </div>

      <div>
        {filteredPosts.map((post, i) => (
          <PostItem key={post.id} post={post} index={i} />
        ))}

        <div ref={sentinelRef} className="h-20 flex items-center justify-center">
          {loadingMore ? (
            <div className="w-5 h-5 border-2 border-ink-100 border-t-ink-900 rounded-full animate-spin" />
          ) : (
            <span className="text-[13px] text-ink-200">下拉加载更多</span>
          )}
        </div>
      </div>
    </div>
  )
}
