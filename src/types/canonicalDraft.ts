// 事实节点
export interface FactNode {
  id: string
  content: string           // 事实描述
  source: string            // 来源（如"央视新闻"、"人民日报"）
  url?: string              // 原始链接
  credibility: 'high' | 'medium' | 'low'  // 可信度
  verified: boolean         // 是否已核查
  collectedAt: string       // 收集时间 ISO string
}

// 声明节点
export interface ClaimNode {
  id: string
  text: string              // 声明文本
  type: 'fact' | 'data' | 'quote' | 'prediction'  // 声明类型
  status: 'verified' | 'disputed' | 'unverifiable'  // 核查状态
  evidence?: string         // 核查证据
  sourceFactId?: string    // 关联的事实ID
}

// 观点节点
export interface ViewpointNode {
  id: string
  stance: string            // 立场（如"支持方"、"反对方"、"中立"）
  argument: string          // 论点
  supportingFactIds: string[]  // 支撑事实ID列表
  counterArgument?: string // 反驳
}

// 章节节点
export interface SectionNode {
  id: string
  title: string             // 节标题
  type: 'intro' | 'background' | 'analysis' | 'argument' | 'conclusion'
  points: string[]          // 要点列表
  content?: string          // 已展开的内容（Markdown）
  accepted?: boolean        // 用户是否已接受
}

// 引用来源节点
export interface ReferenceNode {
  id: string
  title: string
  source: string
  url: string
  type: 'news' | 'report' | 'social' | 'official'
  publishedAt?: string
}

// Canonical Draft 元数据
export interface DraftMetadata {
  createdAt: string
  updatedAt: string
  agents: string[]          // 参与的agent列表
  searchQueries: string[]  // 使用的搜索关键词
  mode: 'assist' | 'auto'  // 执行模式
}

// Canonical Draft 主体
export interface CanonicalDraft {
  topic: string
  facts: FactNode[]
  claims: ClaimNode[]
  viewpoints: ViewpointNode[]
  structure: SectionNode[]
  references: ReferenceNode[]
  metadata: DraftMetadata
}

// 空草稿工厂函数
export function createEmptyDraft(topic: string = '', mode: 'assist' | 'auto' = 'assist'): CanonicalDraft {
  const now = new Date().toISOString()
  return {
    topic,
    facts: [],
    claims: [],
    viewpoints: [],
    structure: [],
    references: [],
    metadata: {
      createdAt: now,
      updatedAt: now,
      agents: [],
      searchQueries: [],
      mode,
    },
  }
}
