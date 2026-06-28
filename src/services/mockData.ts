import type { Melon, MelonCategory, VerificationResult, Evidence, Report } from '../types'

const melonTemplates: { title: string; description: string; category: MelonCategory }[] = [
  // 娱乐 x2
  {
    title: '某顶流男星被曝隐婚生子，孩子已上小学',
    description: '网友爆料称某顶流男星其实早已结婚，孩子已经上小学，并晒出疑似接送孩子放学的模糊照片。',
    category: '娱乐',
  },
  {
    title: '某知名综艺节目被曝剧本造假，冠军早已内定',
    description: '前工作人员匿名爆料称节目组在录制前就已确定冠军人选，选手们的表现都是按剧本走的。',
    category: '娱乐',
  },
  // 科技 x2
  {
    title: '某国产手机品牌宣布自研芯片性能超越高通骁龙8 Gen 4',
    description: '官方发布数据显示，自研芯片在AI算力和能效比上全面超越高通最新旗舰芯片，引发行业震动。',
    category: '科技',
  },
  {
    title: '人类首次实现室温超导？韩国团队论文引发全球热议',
    description: '韩国研究团队发表论文声称在常温常压下实现了超导现象，全球多家实验室正在进行复现验证。',
    category: '科技',
  },
  // 生活科普 x2
  {
    title: '隔夜水和千滚水真的致癌吗？专家最新解读来了',
    description: '关于隔夜水和反复烧开的水会致癌的说法在网上广泛流传，营养学专家对此进行了详细分析。',
    category: '生活科普',
  },
  {
    title: '每天走一万步能减肥？运动科学告诉你真相',
    description: '一万步理论源于日本计步器的营销，但最新研究表明并非步数越多越好，关键在于运动强度。',
    category: '生活科普',
  },
  // 社会热点 x2
  {
    title: '某城市地铁发生乘客集体晕厥事件，官方回应称系空调故障',
    description: '网传某城市地铁车厢内多名乘客突然晕倒，现场视频引发恐慌，官方已发布初步调查说明。',
    category: '社会热点',
  },
  {
    title: '外卖小哥被小区保安殴打，物业公司称系个人冲突',
    description: '一段外卖骑手被保安殴打的视频在网络热传，物业公司回应称是双方个人冲突，与公司无关。',
    category: '社会热点',
  },
  // 历史 x2
  {
    title: '专家称发现了曹操墓的真正位置，与官方认定完全不同',
    description: '民间考古爱好者声称在河南安阳另一处发现了曹操墓的确凿证据，质疑现有安阳高陵的真实性。',
    category: '历史',
  },
  {
    title: '郑和船队是否真的到达过美洲？新证据引发争论',
    description: '有学者声称在北美发现明代瓷器残片，可能是郑和船队远航美洲的证据，历史学界争议不断。',
    category: '历史',
  },
  // 财经 x2
  {
    title: '某知名企业被曝财务造假，审计机构已宣布退出',
    description: '匿名举报称某上市公司存在大规模财务造假，其审计机构突然宣布终止合作，股价应声暴跌。',
    category: '财经',
  },
  {
    title: '楼市新政后房价将大幅反弹？业内专家意见两极分化',
    description: '最新一轮房地产调控政策出台后，有分析认为房价将迎来报复性反弹，而另一方则认为市场基本面不支持。',
    category: '财经',
  },
]

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateRevealTime(): string {
  const hoursFromNow = randomInt(1, 24)
  const date = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000)
  return date.toISOString()
}

export function generateMelons(): Melon[] {
  return melonTemplates.map((tpl, i) => {
    const trueCount = randomInt(100, 5000)
    const falseCount = randomInt(100, 5000)
    const totalParticipants = trueCount + falseCount
    const daysAgo = randomInt(0, 5)
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString()

    return {
      id: `melon-${i + 1}`,
      title: tpl.title,
      description: tpl.description,
      coverImage: `https://picsum.photos/seed/melon${i + 1}/400/200`,
      category: tpl.category,
      difficulty: randomInt(1, 3) as 1 | 2 | 3,
      trueCount,
      falseCount,
      totalParticipants,
      revealTime: generateRevealTime(),
      status: 'pending',
      createdAt,
    }
  })
}

// ===== AI 求证 Mock 数据 =====

const mockVerificationResults: VerificationResult[] = [
  {
    credibilityLevel: 5,
    summary: '该信息经过多方权威信源交叉验证，核心事实确凿，可作为可靠信息采信。',
    keyEvidence: [
      '新华社、人民日报等官方媒体已发布相关报道，内容一致',
      '政府官方渠道发布了正式公告，与信息核心内容吻合',
      '多位领域专家在公开场合确认了该信息的真实性',
      '相关学术论文中的数据与此信息相互印证',
    ],
    tendency: '经核实，该信息内容真实可信，核心事实与多方独立信源一致。',
  },
  {
    credibilityLevel: 4,
    summary: '主要事实基本可信，但部分细节存在夸大或表述不准确的情况，建议参考多方信源。',
    keyEvidence: [
      '主流媒体报道了相关事件，但部分数据存在出入',
      '当事人回应确认了事件主体，但否认了部分细节',
      '第三方机构的调查结果与主流媒体报道基本一致',
    ],
    tendency: '信息主体内容属实，但部分细节描述被夸大，建议以官方通报为准。',
  },
  {
    credibilityLevel: 3,
    summary: '信息真伪混杂，核心事实难以完全确认，需等待更多权威信源披露。',
    keyEvidence: [
      '部分关键信息仅来自单一匿名信源，无法交叉验证',
      '相关方对此事保持沉默，未作出任何回应',
      '网络上存在多种相互矛盾的说法，暂无定论',
    ],
    tendency: '目前证据不足以判断真伪，信息中既有可信成分也有可疑之处，建议保持关注。',
  },
  {
    credibilityLevel: 2,
    summary: '该信息存在多处疑点，与已知事实明显矛盾，可信度较低。',
    keyEvidence: [
      '信息中提到的关键时间节点与官方记录不符',
      '所谓"当事人"已被证实为虚构人物',
      '配图经反向搜索发现为旧闻图片，与事件无关',
      '相关领域专家明确表示该说法在科学上站不住脚',
    ],
    tendency: '该信息基本可以认定为不实信息，存在明显造谣痕迹，请勿传播。',
  },
  {
    credibilityLevel: 1,
    summary: '该信息已被权威机构明确辟谣，纯属虚假信息，请勿相信或传播。',
    keyEvidence: [
      '中国互联网联合辟谣平台已发布辟谣公告',
      '公安机关已对造谣者依法处理，案件通报已公开',
      '信息中引用的"研究"根本不存在，为凭空捏造',
      '多个事实核查平台一致判定该信息为谣言',
    ],
    tendency: '该信息为彻头彻尾的谣言，已被官方辟谣，造谣者已被依法追责。',
  },
]

export async function generateVerificationResult(content: string): Promise<VerificationResult> {
  // 随机延迟 1.5-3 秒模拟 AI 分析
  const delay = 1500 + Math.random() * 1500
  await new Promise((resolve) => setTimeout(resolve, delay))

  // 基于内容的哈希值决定结果，使得同一内容得到一致结果
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) - hash + content.charCodeAt(i)) | 0
  }

  const index = Math.abs(hash) % mockVerificationResults.length
  return { ...mockVerificationResults[index] }
}

// ===== 佐证 Mock 数据 =====

const evidenceUsers = [
  { id: 'u1', nickname: '真相猎人', avatar: 'https://picsum.photos/seed/u1/40/40' },
  { id: 'u2', nickname: '吃瓜达人', avatar: 'https://picsum.photos/seed/u2/40/40' },
  { id: 'u3', nickname: '柯南附体', avatar: 'https://picsum.photos/seed/u3/40/40' },
  { id: 'u4', nickname: '福尔摩斯', avatar: 'https://picsum.photos/seed/u4/40/40' },
  { id: 'u5', nickname: '八卦小子', avatar: 'https://picsum.photos/seed/u5/40/40' },
  { id: 'u6', nickname: '鉴证实录', avatar: 'https://picsum.photos/seed/u6/40/40' },
]

const evidenceContents = [
  '我查到这个明星去年确实领证了，民政局有记录可查',
  '图片是 PS 的，眼镜反光位置和官方图不一致',
  '当事人工作室已经发声明了，说是恶意造谣',
  '我找到了原图出处，这是 3 年前的旧闻重新炒作',
  '有记者拍到两人一起进出酒店，照片很清晰',
  '知名狗仔已经确认消息属实，内部消息',
  '这已经是第二次爆料了，上次被压下去了',
  '我朋友在该剧组工作，确实听到了一些消息',
]

export function generateMockEvidence(melonId: string): Evidence[] {
  // 返回 2-4 条佐证
  const count = randomInt(2, 4)
  const shuffledUsers = [...evidenceUsers].sort(() => Math.random() - 0.5)
  const shuffledContents = [...evidenceContents].sort(() => Math.random() - 0.5)

  return Array.from({ length: count }, (_, i) => {
    const direction = Math.random() > 0.5
    const upvotes = randomInt(5, 88)
    const downvotes = randomInt(0, 15)
    const hoursAgo = randomInt(1, 48)

    return {
      id: `ev_${melonId}_${i + 1}`,
      melonId,
      userId: shuffledUsers[i].id,
      userNickname: shuffledUsers[i].nickname,
      userAvatar: shuffledUsers[i].avatar,
      guessId: `guess_${melonId}_${shuffledUsers[i].id}`,
      direction,
      content: shuffledContents[i],
      upvotes,
      downvotes,
      isBest: false,
      createdAt: new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString(),
    }
  })
}

// ===== 社区帖子 Mock 数据 =====

export type CommunityPostType = 'normal' | 'charity' | 'help' | 'hot'

export interface CommunityPost {
  id: string
  type: CommunityPostType
  title: string
  image: string
  imageHeight: number  // 瀑布流不同高度
  authorName: string
  authorAvatar: string
  likes: number
  tags: string[]
  createdAt: string
}

const communityPosts: CommunityPost[] = [
  { id: 'cp1', type: 'hot', title: '震惊！某顶流明星竟然做出了这种事...', image: 'https://picsum.photos/seed/cp1/400/500', imageHeight: 220, authorName: '娱乐揭秘君', authorAvatar: 'https://picsum.photos/seed/ca1/40/40', likes: 12300, tags: ['娱乐', '热帖'], createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'cp2', type: 'normal', title: '今天地铁上看到的，大家帮忙判断一下真假', image: 'https://picsum.photos/seed/cp2/400/300', imageHeight: 160, authorName: '路人甲', authorAvatar: 'https://picsum.photos/seed/ca2/40/40', likes: 856, tags: ['社会'], createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: 'cp3', type: 'charity', title: '山区小学的孩子们需要过冬的棉衣，求转发', image: 'https://picsum.photos/seed/cp3/400/400', imageHeight: 200, authorName: '暖心公益', authorAvatar: 'https://picsum.photos/seed/ca3/40/40', likes: 3420, tags: ['公益'], createdAt: new Date(Date.now() - 10800000).toISOString() },
  { id: 'cp4', type: 'help', title: '这条朋友圈截图是真的吗？有人能帮忙看看吗', image: 'https://picsum.photos/seed/cp4/400/350', imageHeight: 180, authorName: '求助人', authorAvatar: 'https://picsum.photos/seed/ca4/40/40', likes: 234, tags: ['求助'], createdAt: new Date(Date.now() - 14400000).toISOString() },
  { id: 'cp5', type: 'normal', title: '科普一下：这个网红产品真的安全吗？我查了成分表', image: 'https://picsum.photos/seed/cp5/400/450', imageHeight: 240, authorName: '成分党', authorAvatar: 'https://picsum.photos/seed/ca5/40/40', likes: 5670, tags: ['科技', '科普'], createdAt: new Date(Date.now() - 18000000).toISOString() },
  { id: 'cp6', type: 'hot', title: '某上市公司被曝财务造假，散户血本无归', image: 'https://picsum.photos/seed/cp6/400/300', imageHeight: 150, authorName: '财经观察', authorAvatar: 'https://picsum.photos/seed/ca6/40/40', likes: 8900, tags: ['财经', '热帖'], createdAt: new Date(Date.now() - 21600000).toISOString() },
  { id: 'cp7', type: 'normal', title: '我花了三天时间查证了这个历史传闻，结果出乎意料', image: 'https://picsum.photos/seed/cp7/400/500', imageHeight: 260, authorName: '历史侦探', authorAvatar: 'https://picsum.photos/seed/ca7/40/40', likes: 2340, tags: ['历史'], createdAt: new Date(Date.now() - 25200000).toISOString() },
  { id: 'cp8', type: 'charity', title: '走失老人信息，请帮忙扩散！最后出现在朝阳区', image: 'https://picsum.photos/seed/cp8/400/350', imageHeight: 190, authorName: '寻亲志愿者', authorAvatar: 'https://picsum.photos/seed/ca8/40/40', likes: 15600, tags: ['公益', '寻人'], createdAt: new Date(Date.now() - 28800000).toISOString() },
  { id: 'cp9', type: 'normal', title: '实测：网上流传的这个生活小窍门到底靠不靠谱', image: 'https://picsum.photos/seed/cp9/400/400', imageHeight: 200, authorName: '实验达人', authorAvatar: 'https://picsum.photos/seed/ca9/40/40', likes: 1230, tags: ['生活科普'], createdAt: new Date(Date.now() - 32400000).toISOString() },
  { id: 'cp10', type: 'help', title: '家里老人被忽悠买保健品，怎么劝都不听', image: 'https://picsum.photos/seed/cp10/400/300', imageHeight: 155, authorName: '无奈子女', authorAvatar: 'https://picsum.photos/seed/ca10/40/40', likes: 456, tags: ['求助', '社会'], createdAt: new Date(Date.now() - 36000000).toISOString() },
  { id: 'cp11', type: 'normal', title: '深度分析：这个AI生成的视频到底哪里露馅了', image: 'https://picsum.photos/seed/cp11/400/450', imageHeight: 230, authorName: 'AI鉴别师', authorAvatar: 'https://picsum.photos/seed/ca11/40/40', likes: 7890, tags: ['科技'], createdAt: new Date(Date.now() - 39600000).toISOString() },
  { id: 'cp12', type: 'hot', title: '全网都在传的这段录音，我找到了原始出处', image: 'https://picsum.photos/seed/cp12/400/300', imageHeight: 165, authorName: '真相挖掘', authorAvatar: 'https://picsum.photos/seed/ca12/40/40', likes: 23400, tags: ['娱乐', '热帖'], createdAt: new Date(Date.now() - 43200000).toISOString() },
  { id: 'cp13', type: 'normal', title: '关于最近流感的传言，作为医学生说几句实话', image: 'https://picsum.photos/seed/cp13/400/400', imageHeight: 210, authorName: '医学生小王', authorAvatar: 'https://picsum.photos/seed/ca13/40/40', likes: 4560, tags: ['生活科普'], createdAt: new Date(Date.now() - 46800000).toISOString() },
  { id: 'cp14', type: 'charity', title: '爱心午餐：为留守老人送去一份温暖', image: 'https://picsum.photos/seed/cp14/400/500', imageHeight: 250, authorName: '阳光公益团', authorAvatar: 'https://picsum.photos/seed/ca14/40/40', likes: 6780, tags: ['公益'], createdAt: new Date(Date.now() - 50400000).toISOString() },
  { id: 'cp15', type: 'normal', title: '对比了五家媒体报道，发现这件事的真相被严重歪曲', image: 'https://picsum.photos/seed/cp15/400/350', imageHeight: 185, authorName: '理性吃瓜', authorAvatar: 'https://picsum.photos/seed/ca15/40/40', likes: 3210, tags: ['社会热点'], createdAt: new Date(Date.now() - 54000000).toISOString() },
  { id: 'cp16', type: 'help', title: '这个理财课程是不是骗局？交了好几千学费', image: 'https://picsum.photos/seed/cp16/400/300', imageHeight: 160, authorName: '迷茫小白', authorAvatar: 'https://picsum.photos/seed/ca16/40/40', likes: 789, tags: ['求助', '财经'], createdAt: new Date(Date.now() - 57600000).toISOString() },
  { id: 'cp17', type: 'normal', title: '我用AI工具还原了这张老照片，结果让人意外', image: 'https://picsum.photos/seed/cp17/400/450', imageHeight: 235, authorName: '技术宅', authorAvatar: 'https://picsum.photos/seed/ca17/40/40', likes: 1890, tags: ['科技', '历史'], createdAt: new Date(Date.now() - 61200000).toISOString() },
  { id: 'cp18', type: 'normal', title: '别再转发这条消息了，我帮你查证过了', image: 'https://picsum.photos/seed/cp18/400/300', imageHeight: 150, authorName: '辟谣小助手', authorAvatar: 'https://picsum.photos/seed/ca18/40/40', likes: 9870, tags: ['社会热点'], createdAt: new Date(Date.now() - 64800000).toISOString() },
  { id: 'cp19', type: 'charity', title: '流浪动物救助站急需物资支援，冬天快到了', image: 'https://picsum.photos/seed/cp19/400/400', imageHeight: 205, authorName: '毛孩子之家', authorAvatar: 'https://picsum.photos/seed/ca19/40/40', likes: 4320, tags: ['公益'], createdAt: new Date(Date.now() - 68400000).toISOString() },
  { id: 'cp20', type: 'hot', title: '全网热议的这段视频，逐帧分析后发现了三个疑点', image: 'https://picsum.photos/seed/cp20/400/500', imageHeight: 270, authorName: '视频侦探', authorAvatar: 'https://picsum.photos/seed/ca20/40/40', likes: 31200, tags: ['热帖', '社会'], createdAt: new Date(Date.now() - 72000000).toISOString() },
  { id: 'cp21', type: 'normal', title: '关于转基因食品，这篇科普值得每个人看看', image: 'https://picsum.photos/seed/cp21/400/350', imageHeight: 175, authorName: '科普中国', authorAvatar: 'https://picsum.photos/seed/ca21/40/40', likes: 6540, tags: ['生活科普'], createdAt: new Date(Date.now() - 75600000).toISOString() },
  { id: 'cp22', type: 'help', title: '有人知道这个偏方治咳嗽到底有没有用吗', image: 'https://picsum.photos/seed/cp22/400/300', imageHeight: 155, authorName: '咳嗽一个月', authorAvatar: 'https://picsum.photos/seed/ca22/40/40', likes: 345, tags: ['求助', '生活科普'], createdAt: new Date(Date.now() - 79200000).toISOString() },
]

export function getCommunityPosts(filter?: string): CommunityPost[] {
  if (!filter || filter === '推荐') return communityPosts
  if (filter === '关注') return communityPosts.slice(0, 8)
  if (filter === '公益') return communityPosts.filter(p => p.type === 'charity')
  if (filter === '求助') return communityPosts.filter(p => p.type === 'help')
  if (filter === '热帖') return communityPosts.filter(p => p.type === 'hot')
  return communityPosts
}

// ===== 实锤报告 Mock 数据 =====

export function generateMockReport(melonId: string, result: boolean): Report {
  return {
    id: `report-${melonId}`,
    melonId,
    timeline: [
      { time: '2024-01-15', event: '事件首次曝光', source: '微博热搜' },
      { time: '2024-01-16', event: '当事人回应', source: '工作室声明' },
      { time: '2024-01-18', event: '官方通报', source: '官方媒体' },
    ],
    evidenceChain: [
      {
        description: '官方媒体确认报道',
        source: '新华社',
        sourceUrl: 'https://xinhua.com',
        credibility: 5,
      },
      {
        description: '当事人工作室正式回应',
        source: '当事人微博',
        sourceUrl: 'https://weibo.com',
        credibility: 4,
      },
      {
        description: '第三方媒体跟进报道',
        source: '财经网',
        sourceUrl: 'https://caijing.com',
        credibility: 4,
      },
      {
        description: '相关知情人士确认',
        source: '匿名信源',
        sourceUrl: '',
        credibility: 2,
      },
    ],
    keyDoubts: ['部分细节存疑', '时间线有出入', '当事人未直接回应'],
    tendency: result ? '信息属实' : '信息存在虚假成分',
    tendencyDirection: result,
    disclaimer: 'AI核查仅供参考，不构成任何建议',
    generatedAt: new Date().toISOString(),
  }
}