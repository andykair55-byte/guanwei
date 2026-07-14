import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MapPin,
  Clock,
  HandHelping,
  X,
  Send,
  TrendingUp,
  Users,
  AlertCircle,
  ChevronRight,
} from 'lucide-react'

// ─── 类型定义 ───────────────────────────────────────────────

interface HelpCategory {
  key: string
  label: string
  emoji: string
  color: string // tailwind 色名：teal / amber / emerald / blue / orange / cyan / violet / rose / slate
}

interface HelpRequest {
  id: string
  category: string
  title: string
  desc: string
  author: { name: string; avatar: string; role: string }
  distance: number // km
  timeAgo: string
  urgent?: boolean
  helped?: boolean
  helperCount?: number
}

// ─── 分类数据 ───────────────────────────────────────────────

const CATEGORIES: HelpCategory[] = [
  { key: 'all',       label: '全部',     emoji: '🤝', color: 'teal' },
  { key: 'carry',     label: '搬运跑腿', emoji: '📦', color: 'amber' },
  { key: 'animal',    label: '认动植物', emoji: '🐱', color: 'emerald' },
  { key: 'digital',   label: '手机数码', emoji: '📱', color: 'blue' },
  { key: 'repair',    label: '简单维修', emoji: '🔧', color: 'orange' },
  { key: 'guide',     label: '指路带路', emoji: '🧭', color: 'cyan' },
  { key: 'knowledge', label: '知识问答', emoji: '💡', color: 'violet' },
  { key: 'accompany', label: '陪伴办事', emoji: '👫', color: 'rose' },
  { key: 'others',    label: '其他琐事', emoji: '📋', color: 'slate' },
]

const CATEGORY_MAP: Record<string, HelpCategory> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c]),
)

// 分类药丸配色（静态完整类名，避免 Tailwind 动态拼接失效）
const CATEGORY_PILL: Record<string, string> = {
  teal:    'bg-teal-50 text-teal-700',
  amber:   'bg-amber-50 text-amber-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  blue:    'bg-blue-50 text-blue-700',
  orange:  'bg-orange-50 text-orange-700',
  cyan:    'bg-cyan-50 text-cyan-700',
  violet:  'bg-violet-50 text-violet-700',
  rose:    'bg-rose-50 text-rose-700',
  slate:   'bg-slate-100 text-slate-600',
}

// ─── 头像配色 ───────────────────────────────────────────────

const AVATAR_PALETTE = [
  'bg-teal-100 text-teal-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
  'bg-cyan-100 text-cyan-700',
  'bg-orange-100 text-orange-700',
  'bg-emerald-100 text-emerald-700',
  'bg-blue-100 text-blue-700',
]

function avatarColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length]
}

// ─── 位置预设 ───────────────────────────────────────────────

const LOCATIONS = ['成都·武侯区', '成都·锦江区', '成都·青羊区', '成都·高新区', '成都·成华区']

// ─── 统计数据 ───────────────────────────────────────────────

const STATS = [
  { icon: HandHelping, value: 28,  label: '今日求助', unit: '条' },
  { icon: Users,       value: 19,  label: '今日已帮', unit: '条' },
  { icon: TrendingUp,  value: 142, label: '本周互助', unit: '次' },
]

// ─── Mock 数据 ──────────────────────────────────────────────

const MOCK_REQUESTS: HelpRequest[] = [
  {
    id: 'r1',
    category: 'others',
    title: '家里厨房进了条蛇，不敢动',
    desc: '一条半米长的灰蛇盘在灶台下面不动，孩子还在客厅看电视，我不敢靠近，谁能来帮忙处理一下',
    author: { name: '冯丽', avatar: '冯丽', role: '全职妈妈' },
    distance: 1.0,
    timeAgo: '2分钟前',
    urgent: true,
  },
  {
    id: 'r2',
    category: 'repair',
    title: '厨房水管接口渗水，滴得有点急',
    desc: '水槽下面的软管接口一直在滴水，下面接着盆已经快满了，老公出差了不知道怎么拧紧',
    author: { name: '赵敏', avatar: '赵敏', role: '全职妈妈' },
    distance: 0.8,
    timeAgo: '8分钟前',
    urgent: true,
  },
  {
    id: 'r3',
    category: 'animal',
    title: '小区花坛有只流浪猫好像腿受伤了',
    desc: '就趴在3栋楼下花坛里，右后腿好像不太能动，谁懂猫或者能帮忙看看的',
    author: { name: '刘建国', avatar: '建国', role: '社区大爷' },
    distance: 0.5,
    timeAgo: '5分钟前',
    urgent: true,
  },
  {
    id: 'r4',
    category: 'carry',
    title: '帮我把一箱书搬到楼下快递点',
    desc: '明天要寄回老家，箱子大概二十斤，六楼没电梯，求一位力气大的朋友搭把手',
    author: { name: '林小满', avatar: '小满', role: '大学生' },
    distance: 1.2,
    timeAgo: '3分钟前',
  },
  {
    id: 'r5',
    category: 'carry',
    title: '超市团购了两袋米，搬不上六楼',
    desc: '孩子还在睡觉不方便下楼，两袋十斤装的大米，有没有住附近能帮忙送上来的邻居',
    author: { name: '赵敏', avatar: '赵敏', role: '全职妈妈' },
    distance: 0.8,
    timeAgo: '12分钟前',
  },
  {
    id: 'r6',
    category: 'digital',
    title: '电脑连不上WiFi，试了好几种方法',
    desc: '其他设备都能连，就这台笔记本不行，驱动重装过了还是不行，求懂电脑的看看',
    author: { name: '吴宇', avatar: '吴宇', role: '高中生' },
    distance: 3.2,
    timeAgo: '18分钟前',
  },
  {
    id: 'r7',
    category: 'accompany',
    title: '明天要去办社保卡，一个人有点怵',
    desc: '社区说要去街道服务中心办，我没去过那边，眼睛不太好怕找不到地方，求一位热心邻居陪同',
    author: { name: '许婷', avatar: '许婷', role: '退休教师' },
    distance: 2.6,
    timeAgo: '20分钟前',
  },
  {
    id: 'r8',
    category: 'knowledge',
    title: '孩子三年级数学应用题不会教',
    desc: '鸡兔同笼那类题，我自己会做但讲不清楚，孩子越听越懵，求懂教法的家长支支招',
    author: { name: '孙悦', avatar: '孙悦', role: '全职妈妈' },
    distance: 2.1,
    timeAgo: '30分钟前',
  },
  {
    id: 'r9',
    category: 'repair',
    title: '防盗门锁有点卡，钥匙拧不动',
    desc: '最近开门要使劲拧才行，怕哪天彻底拧不动被锁外面，有会修锁的朋友看看吗',
    author: { name: '黄磊', avatar: '黄磊', role: '外卖小哥' },
    distance: 1.1,
    timeAgo: '35分钟前',
  },
  {
    id: 'r10',
    category: 'digital',
    title: '新买路由器不会设置，求远程指导',
    desc: '孩子给买的新路由器，说明书看不太懂，手机连上了但电脑上不了网，能微信视频教教我吗',
    author: { name: '钱国华', avatar: '国华', role: '社区大爷' },
    distance: 1.8,
    timeAgo: '40分钟前',
  },
  {
    id: 'r11',
    category: 'repair',
    title: '自行车链条掉了，装不回去',
    desc: '上学路上掉的，自己试着装但卡住了，附近有没有会弄的朋友帮忙看看',
    author: { name: '陈思远', avatar: '思远', role: '高中生' },
    distance: 0.6,
    timeAgo: '50分钟前',
  },
  {
    id: 'r12',
    category: 'animal',
    title: '阳台飞进来一只鸟，赶不走',
    desc: '灰褐色的小鸟，头顶有白毛，不确定是不是保护动物，不敢硬赶怕伤着它',
    author: { name: '张明远', avatar: '明远', role: '退休教师' },
    distance: 1.5,
    timeAgo: '25分钟前',
  },
  {
    id: 'r13',
    category: 'animal',
    title: '这盆栀子花叶子发黄，求懂花的朋友看看',
    desc: '养了半年一直挺好，最近两周叶子从下面开始黄，浇水施肥都没变过，不知道咋回事',
    author: { name: '孙悦', avatar: '孙悦', role: '全职妈妈' },
    distance: 2.1,
    timeAgo: '1小时前',
    helped: true,
    helperCount: 2,
  },
  {
    id: 'r14',
    category: 'guide',
    title: '朋友第一次来成都，想找人带路去锦里',
    desc: '老同学从北方来，对成都完全不熟，我腿脚一般走不远，有没有熟悉锦里一带的年轻人带带路',
    author: { name: '张明远', avatar: '明远', role: '退休教师' },
    distance: 1.5,
    timeAgo: '3小时前',
  },
  {
    id: 'r15',
    category: 'guide',
    title: '去华西医院不知道科室怎么走',
    desc: '明天要去复诊，听说华西门诊楼特别绕，有没有熟悉的邻居能说明一下心血管内科在哪栋',
    author: { name: '钱国华', avatar: '国华', role: '社区大爷' },
    distance: 2.4,
    timeAgo: '1小时前',
    helped: true,
    helperCount: 3,
  },
  {
    id: 'r16',
    category: 'knowledge',
    title: '想学做回锅肉，有会川菜的朋友教教吗',
    desc: '刚搬出来自己住，特别想吃口正宗回锅肉，网上教程看了但总做不出那个味，求手把手教',
    author: { name: '周婷婷', avatar: '婷婷', role: '大学生' },
    distance: 1.4,
    timeAgo: '2小时前',
  },
  {
    id: 'r17',
    category: 'knowledge',
    title: '考研复习有点迷茫，想请教上岸的学长学姐',
    desc: '考新传专硕，专业课不知道怎么搭框架，想请教一下过来人的复习节奏和资料推荐',
    author: { name: '杨静', avatar: '杨静', role: '大学生' },
    distance: 3.8,
    timeAgo: '4小时前',
    helped: true,
    helperCount: 2,
  },
  {
    id: 'r18',
    category: 'digital',
    title: '手机一直弹内存不足，怎么清理',
    desc: '微信占了太多空间，重要的聊天记录又不敢删，有没有安全清理的办法',
    author: { name: '许婷', avatar: '许婷', role: '退休教师' },
    distance: 2.6,
    timeAgo: '2小时前',
    helped: true,
    helperCount: 1,
  },
  {
    id: 'r19',
    category: 'accompany',
    title: '周末想去省图书馆自习，求个搭子',
    desc: '一个人在家总忍不住玩手机，想去图书馆但一个人坐不住，找个一起自习的搭子互相监督',
    author: { name: '何明', avatar: '何明', role: '高中生' },
    distance: 4.5,
    timeAgo: '5小时前',
  },
  {
    id: 'r20',
    category: 'others',
    title: '收了个大件快递，搬不进电梯',
    desc: '买了个书架，快递放驿站了但太大我电瓶车拉不动，就差几十米搬进电梯，搭把手就行',
    author: { name: '罗刚', avatar: '罗刚', role: '外卖小哥' },
    distance: 0.3,
    timeAgo: '15分钟前',
    helped: true,
    helperCount: 1,
  },
]

// ─── 主组件 ─────────────────────────────────────────────────

export default function CityAidPage() {
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [requests, setRequests] = useState<HelpRequest[]>(MOCK_REQUESTS)
  const [helpedIds, setHelpedIds] = useState<Set<string>>(new Set())
  const [showPublish, setShowPublish] = useState(false)
  const [locationIdx, setLocationIdx] = useState(0)

  // 发布表单状态
  const [formCategory, setFormCategory] = useState('carry')
  const [formTitle, setFormTitle] = useState('')
  const [formDesc, setFormDesc] = useState('')

  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const location = LOCATIONS[locationIdx]

  const filtered =
    selectedCategory === 'all'
      ? requests
      : requests.filter((r) => r.category === selectedCategory)

  // 弹窗打开时锁定背景滚动
  useEffect(() => {
    if (!showPublish) return
    const main = document.querySelector('main')
    const prev = main ? (main as HTMLElement).style.overflow : ''
    if (main) (main as HTMLElement).style.overflow = 'hidden'
    return () => {
      if (main) (main as HTMLElement).style.overflow = prev
    }
  }, [showPublish])

  // 选中分类后自动将标签滚动居中
  const handleSelectCategory = useCallback((key: string) => {
    setSelectedCategory(key)
    requestAnimationFrame(() => {
      tabRefs.current[key]?.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      })
    })
  }, [])

  // 点击"我来帮"
  const handleHelp = useCallback((id: string) => {
    setHelpedIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, helped: true, helperCount: (r.helperCount || 0) + 1 }
          : r,
      ),
    )
  }, [])

  // 切换位置
  const cycleLocation = useCallback(() => {
    setLocationIdx((i) => (i + 1) % LOCATIONS.length)
  }, [])

  const resetForm = () => {
    setFormCategory('carry')
    setFormTitle('')
    setFormDesc('')
  }

  const closePublish = () => {
    setShowPublish(false)
    resetForm()
  }

  // 发布新求助：插入列表头部
  const handlePublish = () => {
    if (!formTitle.trim()) return
    const newReq: HelpRequest = {
      id: `new-${Date.now()}`,
      category: formCategory,
      title: formTitle.trim(),
      desc: formDesc.trim() || '（暂无详细描述）',
      author: { name: '微光', avatar: '微光', role: '热心邻居' },
      distance: 0,
      timeAgo: '刚刚',
    }
    setRequests((prev) => [newReq, ...prev])
    resetForm()
    setShowPublish(false)
    // 若当前分类不匹配则切回全部，确保新卡片可见
    if (selectedCategory !== 'all' && selectedCategory !== formCategory) {
      setSelectedCategory('all')
    }
  }

  return (
    <div className="min-h-full bg-paper-0">
      {/* ── 顶部 Banner ── */}
      <div
        className="relative overflow-hidden mx-4 md:mx-6 mt-4 rounded-2xl"
        style={{ background: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 45%, #f0fdfa 100%)' }}
      >
        <div className="px-5 py-5 md:px-7 md:py-6 relative z-10">
          {/* 面包屑 */}
          <button
            onClick={() => navigate('/community')}
            className="flex items-center gap-1 text-[11px] text-teal-700/60 hover:text-teal-700 transition-colors mb-3"
          >
            <span>观微社区</span>
            <ChevronRight size={11} />
            <span className="text-teal-700 font-medium">同城互助</span>
          </button>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-[22px] md:text-[26px] font-bold text-ink-900 leading-tight tracking-tight">
                同城互助
              </h1>
              <p className="text-[12px] md:text-[13px] text-teal-800/60 mt-1.5 font-serif-cn">
                小事见真心 · 君子大隐隐于市
              </p>
            </div>
            {/* 位置标签 */}
            <button
              onClick={cycleLocation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 backdrop-blur-sm border border-teal-200/60 text-[12px] text-ink-700 hover:bg-white transition-colors press-pop"
            >
              <MapPin size={13} className="text-teal-600" />
              <span className="font-medium">{location}</span>
              <ChevronRight size={12} className="text-ink-faint" />
            </button>
          </div>
        </div>
        {/* 装饰光斑 */}
        <div className="absolute -top-8 -right-4 w-32 h-32 rounded-full bg-teal-200/30 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-10 w-28 h-28 rounded-full bg-cyan-200/25 blur-2xl pointer-events-none" />
      </div>

      {/* ── 数据条 ── */}
      <div className="px-4 md:px-6 -mt-3 relative z-20">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100/80 grid grid-cols-3 divide-x divide-gray-100">
          {STATS.map((s) => {
            const Icon = s.icon
            return (
              <div key={s.label} className="flex items-center gap-2.5 px-3 py-3">
                <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0">
                  <Icon size={15} className="text-teal-600" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-[17px] font-bold text-ink-900 leading-none tabular-nums">
                      {s.value}
                    </span>
                    <span className="text-[10px] text-ink-faint">{s.unit}</span>
                  </div>
                  <p className="text-[11px] text-ink-500 mt-0.5">{s.label}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 分类标签栏 ── */}
      <div className="sticky top-0 z-10 bg-paper-0/95 backdrop-blur-sm border-b border-gray-100 mt-3">
        <div className="flex items-center gap-2 px-4 md:px-6 py-2.5 overflow-x-auto scrollbar-none">
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.key
            return (
              <button
                key={cat.key}
                ref={(el) => { tabRefs.current[cat.key] = el }}
                onClick={() => handleSelectCategory(cat.key)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap flex-shrink-0 transition-all ${
                  active
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-gray-100 text-ink-600 hover:bg-gray-200'
                }`}
              >
                <span className="text-[13px] leading-none">{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 求助卡片列表 ── */}
      <div className="px-4 md:px-6 py-4">
        {filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center">
              <HandHelping size={24} className="text-ink-300" />
            </div>
            <p className="text-[13px] text-ink-500">这个分类暂时没有求助信息</p>
            <button
              onClick={() => setShowPublish(true)}
              className="text-[12px] text-teal-600 font-medium hover:underline"
            >
              发布一条试试 →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((req) => {
              const cat = CATEGORY_MAP[req.category] ?? CATEGORIES[CATEGORIES.length - 1]
              const pillClass = CATEGORY_PILL[cat.color] || CATEGORY_PILL.slate
              const isHelped = helpedIds.has(req.id)
              const showHelperBadge = req.helped && (req.helperCount || 0) > 0
              return (
                <article
                  key={req.id}
                  className="relative bg-white rounded-xl p-3 shadow-sm border border-gray-100/80 hover:shadow-md transition-shadow flex flex-col gap-2 overflow-hidden"
                >
                  {/* 紧急卡片左侧红色细边 */}
                  {req.urgent && (
                    <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-rose-400" />
                  )}

                  {/* 顶部：分类药丸 + 紧急 + 已有响应 */}
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium ${pillClass}`}
                    >
                      <span className="leading-none">{cat.emoji}</span>
                      {cat.label}
                    </span>
                    {req.urgent && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse-dot" />
                        急
                      </span>
                    )}
                    {showHelperBadge && (
                      <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-teal-600 text-[10px] font-medium">
                        <Users size={10} />
                        已有 {req.helperCount} 人响应
                      </span>
                    )}
                  </div>

                  {/* 标题（一行截断） */}
                  <h3 className="text-[14px] font-semibold text-ink-900 line-clamp-1 leading-snug">
                    {req.title}
                  </h3>

                  {/* 描述（两行截断） */}
                  <p className="text-[12px] text-ink-500 leading-relaxed line-clamp-2">
                    {req.desc}
                  </p>

                  {/* 发布时间 */}
                  <div className="flex items-center gap-1 text-[11px] text-ink-faint">
                    <Clock size={11} />
                    <span>{req.timeAgo}</span>
                  </div>

                  {/* 分隔线 */}
                  <div className="h-px bg-gray-100" />

                  {/* 底部：求助者 + 距离 + 我来帮 */}
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 ${avatarColor(req.author.name)}`}
                    >
                      {req.author.avatar}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium text-ink-800 truncate leading-tight">
                        {req.author.name}
                      </p>
                      <p className="text-[10px] text-ink-faint leading-tight">
                        {req.author.role}
                      </p>
                    </div>
                    <span className="ml-auto flex items-center gap-0.5 text-[10px] text-ink-faint flex-shrink-0">
                      <MapPin size={10} className="text-teal-500" />
                      {req.distance === 0 ? '身边' : `距你${req.distance}km`}
                    </span>
                    {isHelped ? (
                      <span className="px-3 py-1.5 rounded-full bg-teal-100 text-teal-600 text-[12px] font-semibold flex-shrink-0">
                        已响应
                      </span>
                    ) : (
                      <button
                        onClick={() => handleHelp(req.id)}
                        className="px-3 py-1.5 rounded-full bg-teal-50 text-teal-600 text-[12px] font-semibold hover:bg-teal-100 transition-colors flex-shrink-0"
                      >
                        我来帮
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>

      {/* ── 底部社区公约 ── */}
      <div className="px-4 md:px-6 pb-24">
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-50/50 border border-amber-100">
          <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800/80 leading-relaxed">
            本版块仅限生活琐事互助，禁止任何形式的众筹、募捐、献爱心等金钱相关行为。发现违规内容将立即删除。
          </p>
        </div>
      </div>

      {/* ── 浮动发布按钮 ── */}
      <button
        onClick={() => setShowPublish(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 pl-4 pr-5 py-3 rounded-full bg-teal-600 text-white text-[13px] font-semibold shadow-lg shadow-teal-600/30 hover:bg-teal-700 hover:shadow-xl transition-all press-pop"
      >
        <HandHelping size={17} />
        <span>发布求助</span>
      </button>

      {/* ── 发布求助弹窗 ── */}
      {showPublish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* 半透明遮罩 */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
            onClick={closePublish}
          />
          {/* 弹窗卡片 */}
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-fade-in-up">
            {/* 头部 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-[16px] font-bold text-ink-900">发布求助</h2>
              <button
                onClick={closePublish}
                className="w-7 h-7 rounded-full flex items-center justify-center text-ink-400 hover:bg-gray-100 hover:text-ink-700 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* 表单 */}
            <div className="px-5 py-4 space-y-4 overflow-y-auto">
              {/* 分类选择 */}
              <div>
                <label className="block text-[12px] font-medium text-ink-700 mb-2">
                  选择分类
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.filter((c) => c.key !== 'all').map((cat) => {
                    const active = formCategory === cat.key
                    const pillClass = CATEGORY_PILL[cat.color]
                    return (
                      <button
                        key={cat.key}
                        onClick={() => setFormCategory(cat.key)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                          active
                            ? 'bg-teal-600 text-white shadow-sm'
                            : `${pillClass} hover:opacity-80`
                        }`}
                      >
                        <span className="leading-none">{cat.emoji}</span>
                        {cat.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 标题 */}
              <div>
                <label className="block text-[12px] font-medium text-ink-700 mb-2">
                  标题
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="一句话说清你需要什么帮助"
                  maxLength={30}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] text-ink-900 placeholder:text-ink-faint focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all"
                />
              </div>

              {/* 描述 */}
              <div>
                <label className="block text-[12px] font-medium text-ink-700 mb-2">
                  详细描述
                </label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="补充时间、地点、具体情况等细节，方便邻居帮助你"
                  rows={3}
                  maxLength={200}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] text-ink-900 placeholder:text-ink-faint focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all resize-none"
                />
              </div>

              {/* 位置（默认当前） */}
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-teal-50/60 border border-teal-100">
                <MapPin size={14} className="text-teal-600 flex-shrink-0" />
                <span className="text-[12px] text-ink-700 font-medium">{location}</span>
                <span className="text-[11px] text-ink-faint">· 当前位置</span>
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="flex items-center gap-2 px-5 py-4 border-t border-gray-100">
              <button
                onClick={closePublish}
                className="flex-1 py-2.5 rounded-full border border-gray-200 text-[13px] font-medium text-ink-600 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handlePublish}
                disabled={!formTitle.trim()}
                className="flex-[1.5] flex items-center justify-center gap-1.5 py-2.5 rounded-full bg-teal-600 text-white text-[13px] font-semibold hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={14} />
                发布求助
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
