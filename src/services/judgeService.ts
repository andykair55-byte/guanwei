/**
 * 判官模式 — 模拟数据 + 服务
 *
 * 模拟美团/电商平台消费纠纷案件，用户投票当判官。
 */

import type { JudgeCase } from '../types/judge'

// ===== Mock Data =====

const MOCK_CASES: JudgeCase[] = [
  // ── 外卖类 ──
  {
    id: 'j-001',
    scenario: '某外卖平台差评',
    title: '这份麻辣烫只给了3星，合理吗？',
    plaintiff: '顾客 · 王女士',
    defendant: '商家 · 张记麻辣烫',
    detail: '王女士点了一份麻辣烫（总价32元），备注"不要香菜"。收到后发现碗里有香菜，给了3星差评并留言"备注了不要香菜还放，体验差"。商家回复"生意太忙没注意，下次补送饮料"。',
    evidence: [
      { label: '订单截图', content: '麻辣烫 32元 · 备注：不要香菜 · 已送达', type: 'text' },
      { label: '商家回复', content: '亲，实在抱歉，当时太忙了没注意备注，下次您下单我们送您一瓶饮料补偿', type: 'text' },
    ],
    category: '外卖',
    votes: { support: 234, oppose: 567, skip: 89 },
    comment: '差评虽有依据，但商家态度诚恳且有补偿意愿。3星处罚偏重，建议先沟通。',
    createdAt: '2小时前',
    heat: 890,
  },
  {
    id: 'j-002',
    scenario: '某外卖平台差评',
    title: '炸鸡翅里面还有血丝，1星差评过分吗？',
    plaintiff: '顾客 · 李先生',
    defendant: '商家 · 啃得起炸鸡',
    detail: '李先生在外卖平台点了炸鸡翅套餐（48元），吃到一半发现鸡翅根部有血丝，拍照后给了1星差评并申请退款。商家表示"鸡翅骨头附近有血丝是正常的，不是没熟"，拒绝退款。',
    evidence: [
      { label: '顾客照片描述', content: '鸡翅根部发红，有明显血丝', type: 'text' },
      { label: '商家辩解', content: '冷冻鸡翅解冻后骨头附近会有血水残留，高温油炸后也会呈现红色，并非没熟', type: 'text' },
    ],
    category: '外卖',
    votes: { support: 678, oppose: 123, skip: 45 },
    comment: '鸡翅骨头发红确实是烹饪中常见现象，但商家应在说明中提前告知。1星略严，3星更合理。',
    createdAt: '4小时前',
    heat: 1204,
  },
  {
    id: 'j-003',
    scenario: '某外卖平台差评',
    title: '外卖超时50分钟，顾客给了差评被商家辱骂',
    plaintiff: '顾客 · 小陈',
    defendant: '商家 · 老王炒饭',
    detail: '小陈下班后点了份炒饭（22元），预计30分钟送达，实际等了50分钟。收到时饭已经温了，小陈给了2星差评写道"超时太久了，饭都凉了"。商家在评价区回复"高峰期谁不等？就差你那几块钱？爱吃不吃"。',
    evidence: [
      { label: '顾客评价', content: '超时50分钟，饭都凉了，体验很差', type: 'text' },
      { label: '商家回复', content: '高峰期催什么催？就差你那点钱？爱吃不吃！', type: 'text' },
    ],
    category: '外卖',
    votes: { support: 891, oppose: 34, skip: 789 },
    comment: '超时确实影响体验，差评可以理解。但商家辱骂回复是红线行为，平台应介入处理。',
    createdAt: '1小时前',
    heat: 1567,
  },
  // ── 电商类 ──
  {
    id: 'j-004',
    scenario: '某电商平台退货纠纷',
    title: '衣服穿了一周缩水退货被拒，该给差评吗？',
    plaintiff: '顾客 · 周小姐',
    defendant: '商家 · 简约风尚服装店',
    detail: '周小姐买了一件棉质T恤（89元），洗了一次后缩水明显（从M码缩到S码）。申请退货被商家以"已穿着清洗"为由拒绝。周女士给了1星差评，称"质量有问题还不让退"。',
    evidence: [
      { label: '顾客描述', content: '按照洗标正常洗涤，晾干后缩水至少一个码', type: 'text' },
      { label: '商家回应', content: '棉质面料首次洗涤有3-5%缩水属于正常范围，已穿着影响二次销售无法退换', type: 'text' },
    ],
    category: '电商',
    votes: { support: 445, oppose: 312, skip: 78 },
    comment: '棉质缩水有行业标准，若缩水超过5%属于质量问题。建议双方提供具体测量数据。',
    createdAt: '6小时前',
    heat: 835,
  },
  {
    id: 'j-005',
    scenario: '某电商争议',
    title: '买的"真皮"皮带两个月脱皮，是假货吗？',
    plaintiff: '顾客 · 张先生',
    defendant: '商家 · 品质男装店',
    detail: '张先生花198元购买了一条标注"头层牛皮"的皮带，使用两个月后皮带边缘出现脱皮现象，露出内层织物。张先生质疑是假货要求退一赔三，商家坚称是真皮，脱皮是"使用不当造成的正常磨损"。',
    evidence: [
      { label: '商品描述', content: '头层牛皮自动扣皮带 · 198元 · 月销3000+', type: 'text' },
      { label: '顾客照片', content: '皮带边缘脱皮处可看到底层织物纹理', type: 'text' },
    ],
    category: '电商',
    votes: { support: 723, oppose: 89, skip: 34 },
    comment: '真皮不会两个月就脱皮露出织物层，所谓"头层牛皮"疑为覆膜革。差评合理。',
    createdAt: '1天前',
    heat: 2134,
  },
  // ── 服务类 ──
  {
    id: 'j-006',
    scenario: '美发店服务纠纷',
    title: 'Tony老师剪坏了我的头发，该给差评吗？',
    plaintiff: '顾客 · 林小姐',
    defendant: '商家 · 时尚造型沙龙',
    detail: '林小姐拿着参考图去剪发（团购价128元），要求剪到锁骨位置。结果Tony老师剪到了肩膀以上，且层次打得太碎。林小姐当场表示不满，店长提出免费重修或退50%，林小姐拒绝并给了差评。',
    evidence: [
      { label: '顾客描述', content: '剪短了至少5cm，层次碎得像狗啃，完全不是我想要的效果', type: 'text' },
      { label: '店长回应', content: '已提出免费重修或退50%，顾客不接受直接给差评', type: 'text' },
    ],
    category: '服务',
    votes: { support: 567, oppose: 234, skip: 56 },
    comment: '发型没达到预期属于主观体验，但店方提供了补救方案。差评可以，但建议先接受协商。',
    createdAt: '3小时前',
    heat: 957,
  },
  {
    id: 'j-007',
    scenario: '网约车服务纠纷',
    title: '司机绕路多收了20块，乘客差评+投诉过分吗？',
    plaintiff: '乘客 · 刘先生',
    defendant: '司机 · 滴滴司机赵师傅',
    detail: '刘先生下班打网约车回家（平时约25元），当天司机走了高架桥，最后收费47元。刘先生质问时司机说"高架更快"，但实际只快了5分钟。刘先生给了1星并投诉绕路。',
    evidence: [
      { label: '乘客描述', content: '平时25元的路走了47元，快5分钟但贵了22块', type: 'text' },
      { label: '司机辩解', content: '高峰期地面堵车，走高架虽然远但时间更可控，我没错', type: 'text' },
    ],
    category: '服务',
    votes: { support: 456, oppose: 345, skip: 67 },
    comment: '绕路前应征得乘客同意，司机擅自决定不合理。差评投诉都是正当权利。',
    createdAt: '5小时前',
    heat: 768,
  },
  // ── 生活类 ──
  {
    id: 'j-008',
    scenario: '民宿住宿纠纷',
    title: '民宿实物与照片严重不符，退房被拒怎么办？',
    plaintiff: '住客 · 杨先生',
    defendant: '商家 · 山间小筑民宿',
    detail: '杨先生预订了一间"山景大床房"（468元/晚），照片显示房间有大落地窗正对山景。到店后发现所谓的山景房窗户对着隔壁楼墙壁，要侧头才能看到一点山。杨先生要求退房退款被拒，店家说"山景就是能看到山"。',
    evidence: [
      { label: '平台照片', content: '大落地窗，正对青山，采光极好', type: 'text' },
      { label: '顾客实拍', content: '小窗户对着隔壁墙，需要探头才能看到山', type: 'text' },
    ],
    category: '生活',
    votes: { support: 789, oppose: 56, skip: 23 },
    comment: '实物与照片严重不符属于虚假宣传，要求退款合理。平台应介入处理。',
    createdAt: '1天前',
    heat: 1456,
  },
  {
    id: 'j-009',
    scenario: '小区邻里纠纷',
    title: '楼下嫌楼上小孩跑动太吵，在业主群公开指责过分吗？',
    plaintiff: '楼下住户 · 赵先生',
    defendant: '楼上住户 · 陈女士',
    detail: '赵先生在家办公，楼上陈女士家5岁小孩每天下午4-6点跑动跳闹，赵先生多次上门沟通未果。某天赵先生在500人业主群发了小孩跑动的录音，并说"楼上家长能不能管管自己的孩子？没教养"。陈女士认为公开羞辱太过分。',
    evidence: [
      { label: '赵先生说法', content: '上门沟通过3次，每次都只能好两天，忍了两个月忍无可忍', type: 'text' },
      { label: '陈女士回应', content: '小孩才5岁不可能完全安静，我也有在管教，但公开说没教养太过分了', type: 'text' },
    ],
    category: '生活',
    votes: { support: 345, oppose: 456, skip: 89 },
    comment: '长期噪音确实影响生活，但公开群指责"没教养"容易激化矛盾。建议物业介入调解。',
    createdAt: '2天前',
    heat: 1123,
  },
  // ── 娱乐类 ──
  {
    id: 'j-010',
    scenario: '演唱会退票纠纷',
    title: '歌手演唱会全程跑调，观众要求退票合理吗？',
    plaintiff: '观众 · 粉丝代表',
    defendant: '主办方 · 星耀文化传媒',
    detail: '某歌手演唱会（票价388-1288元）被观众录到大量走音跑调片段，现场体验极差。观众在社交媒体发起退票维权，认为演出质量不达标。主办方回应"演唱会存在不确定性，不接受退票"。',
    evidence: [
      { label: '观众评价', content: '10首歌有6首跑调，高音全破，这是我这辈子看过最差的演唱会', type: 'text' },
      { label: '主办方声明', content: '演唱会属于现场艺术，受歌手状态、设备等多种因素影响，不接受退票', type: 'text' },
    ],
    category: '娱乐',
    votes: { support: 567, oppose: 234, skip: 123 },
    comment: '演出质量严重不达标确实损害消费者权益，但演唱会退票缺乏明确法律依据。建议主办方部分补偿。',
    createdAt: '3天前',
    heat: 3456,
  },
]

// ===== Service =====

let votedCases = new Set<string>()

export function getCases(): JudgeCase[] {
  return MOCK_CASES
}

export function getCaseById(id: string): JudgeCase | undefined {
  return MOCK_CASES.find(c => c.id === id)
}

export function getRemainingCases(excludeIds: string[]): JudgeCase[] {
  return MOCK_CASES.filter(c => !excludeIds.includes(c.id))
}

/** 获取新案件（排除已看过的） */
export function getNextCase(seenIds: string[]): JudgeCase | null {
  const remaining = MOCK_CASES.filter(c => !seenIds.includes(c.id))
  if (remaining.length === 0) return null
  return remaining[Math.floor(Math.random() * remaining.length)]
}

/** 提交投票 */
export function submitVote(caseId: string, vote: 'support' | 'oppose' | 'skip'): JudgeCase | null {
  const c = MOCK_CASES.find(c => c.id === caseId)
  if (!c || votedCases.has(caseId)) return null
  votedCases.add(caseId)
  c.votes[vote]++
  c.userVoted = vote
  return c
}

/** 重置投票记录（用于重新开始） */
export function resetVotes() {
  votedCases = new Set<string>()
  MOCK_CASES.forEach(c => {
    c.userVoted = undefined
  })
}

/** 获取统计数据 */
export function getStats() {
  const total = MOCK_CASES.length
  const voted = votedCases.size
  const totalVotes = MOCK_CASES.reduce((s, c) => s + c.votes.support + c.votes.oppose + c.votes.skip, 0)
  return { total, voted, totalVotes }
}