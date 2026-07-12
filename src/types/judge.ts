/** 判官模式 — 类型定义 */

export type JudgeCategory = '外卖' | '电商' | '服务' | '生活' | '娱乐'

export type JudgeVote = 'support' | 'oppose' | 'skip'

export interface JudgeEvidence {
  label: string
  content: string
  type: 'text' | 'image'
}

export interface JudgeCase {
  id: string
  /** 场景标签，如"某外卖平台差评" */
  scenario: string
  /** 标题，如"这份外卖只给了1星，合理吗？" */
  title: string
  /** 投诉方（差评方） */
  plaintiff: string
  /** 被投诉方（商家/服务方） */
  defendant: string
  /** 详细经过 80-150字 */
  detail: string
  /** 证据列表 */
  evidence: JudgeEvidence[]
  /** 分类 */
  category: JudgeCategory
  /** 当前投票结果 */
  votes: {
    support: number
    oppose: number
    skip: number
  }
  /** 当前用户投票 */
  userVoted?: JudgeVote
  /** AI 简短点评（投票后展示） */
  comment?: string
  /** 创建时间 */
  createdAt: string
  /** 热度（参与人数） */
  heat: number
}