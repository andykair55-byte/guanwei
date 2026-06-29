// ===== 审核结果类型 =====
export interface FilterResult {
  passed: boolean;   // true = 通过，false = 拦截
  reason?: string;   // 拦截原因
  flagged: boolean;  // true = 不确定，需要人工审核
}

// ===== 敏感关键词库（按类别分组） =====

const SENSITIVE_PATTERNS: Array<{ regex: RegExp; label: string; level: 'block' | 'flag' }> = [
  // 政治敏感
  { regex: /颠覆|分裂国家|恐怖主义|邪教/gi, label: '政治敏感内容', level: 'block' },
  // 暴力血腥
  { regex: /杀人|自杀|自残|割腕|跳楼/gi, label: '暴力或自伤内容', level: 'block' },
  // 色情
  { regex: /色情|裸体|性爱|约炮|援交/gi, label: '色情低俗内容', level: 'block' },
  // 诈骗
  { regex: /传销|诈骗|洗钱|赌博平台|刷单返利/gi, label: '疑似诈骗信息', level: 'block' },
  // 虚假信息标志
  { regex: /不转不是中国人|转发可领|速看马上删|内部消息/gi, label: '疑似虚假传播话术', level: 'flag' },
  // 食品安全谣言
  { regex: /致癌|有毒|不能吃|千万别/gi, label: '可能涉及健康谣言', level: 'flag' },
]

/**
 * 前端正则内容审核（本地执行，无需后端）
 * 用于 api.moderate 失败时的 fallback
 */
export function localModerate(content: string): FilterResult {
  if (!content.trim()) {
    return { passed: true, flagged: false }
  }

  const blockedReasons: string[] = []
  const flaggedReasons: string[] = []

  for (const { regex, label, level } of SENSITIVE_PATTERNS) {
    regex.lastIndex = 0
    if (regex.test(content)) {
      if (level === 'block') blockedReasons.push(label)
      else flaggedReasons.push(label)
    }
  }

  if (blockedReasons.length > 0) {
    return {
      passed: false,
      reason: `检测到敏感内容：${blockedReasons.join('、')}`,
      flagged: false,
    }
  }

  if (flaggedReasons.length > 0) {
    return {
      passed: true,
      reason: `内容包含疑似敏感表述：${flaggedReasons.join('、')}，建议修改`,
      flagged: true,
    }
  }

  return { passed: true, flagged: false }
}
