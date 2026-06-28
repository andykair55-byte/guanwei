// ===== 审核结果类型 =====
export interface FilterResult {
  passed: boolean;   // true = 通过，false = 拦截
  reason?: string;   // 拦截原因
  flagged: boolean;  // true = 不确定，需要人工审核
}

// ===== ContentFilterAlert 组件 Props 类型 =====
export interface ContentFilterAlertProps {
  result: FilterResult;
  onDismiss?: () => void;
}

// ===== 敏感关键词库（按类别分组） =====

/** 政治敏感：涉及国家领导人、政治事件、分裂言论等 */
export const political: string[] = []