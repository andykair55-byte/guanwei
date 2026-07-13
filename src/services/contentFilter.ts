// MVP: 关键词黑名单 + 敏感词检测
const BLOCKED_KEYWORDS = [
  '黄网', '色情', '赌博', '毒品', '枪支',
  '炸弹制作', '杀人方法', '自杀方法',
]

const SENSITIVE_PREFIXES = [
  'system:', 'ignore previous', '忘记之前的指令',
  '你现在是', '扮演', 'jailbreak',
]

export interface FilterResult {
  passed: boolean
  reason?: string
  matchedKeyword?: string
}

export function filterUserInput(input: string): FilterResult {
  const lower = input.toLowerCase()

  for (const kw of BLOCKED_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) {
      return { passed: false, reason: '内容包含违规关键词', matchedKeyword: kw }
    }
  }

  for (const prefix of SENSITIVE_PREFIXES) {
    if (lower.includes(prefix.toLowerCase())) {
      return { passed: false, reason: '检测到可能的 prompt 注入', matchedKeyword: prefix }
    }
  }

  return { passed: true }
}
