export type PlatformId = 'guanwei' | 'douyin' | 'weibo' | 'zhihu' | 'tieba' | 'xiaohongshu'

export interface PlatformTemplate {
  id: PlatformId
  name: string           // 平台名称
  icon: string           // emoji图标（用于UI展示）
  maxLength: number      // 字数限制
  description: string    // 格式说明
  promptTemplate: string // LLM prompt模板
  publishUrl: string     // 发布页面URL
}

export const PLATFORM_TEMPLATES: Record<PlatformId, PlatformTemplate> = {
  guanwei: {
    id: 'guanwei',
    name: '观微',
    icon: '🍈',
    maxLength: 5000,
    description: 'Markdown长文 + 佐证引用',
    promptTemplate: `你是一个观微平台的内容创作者。基于提供的Canonical Draft数据，生成一篇适合观微平台的深度分析文章。

要求：
- 使用Markdown格式
- 包含 ## 二级标题分节
- 引用来源使用 > [来源名] 内容 格式
- 正文800-2000字
- 保持客观分析风格，有数据支撑
- 关键信息加粗`,
    publishUrl: '/publish',
  },
  douyin: {
    id: 'douyin',
    name: '抖音',
    icon: '🎵',
    maxLength: 500,
    description: '短视频脚本（口播+画面提示）',
    promptTemplate: `你是一个抖音短视频脚本创作者。基于提供的Canonical Draft数据，生成一个60-90秒的短视频脚本。

要求：
- 使用 [画面] 描述视觉内容，[口播] 描述旁白的格式
- 开头3秒必须有强钩子（悬念/数字/争议）
- 口播文字口语化，短句为主，每句不超过15字
- 总字数300-500字
- 结尾有互动引导（关注/评论/转发）
- 适合竖屏拍摄的画面描述`,
    publishUrl: 'https://creator.douyin.com/creator-micro/content/upload',
  },
  weibo: {
    id: 'weibo',
    name: '微博',
    icon: '🐦',
    maxLength: 2000,
    description: '短文 + 话题标签',
    promptTemplate: `你是一个微博博主。基于提供的Canonical Draft数据，生成一条微博内容。

要求：
- 正文200-500字，精炼有信息量
- 开头用一句话点出核心观点
- 关键数据用【】标注
- 结尾加2-3个相关话题标签，格式：#话题#
- 情绪适中，可以有观点但不过激
- 适合传播的写作风格`,
    publishUrl: 'https://weibo.com/compose/index',
  },
  zhihu: {
    id: 'zhihu',
    name: '知乎',
    icon: '📚',
    maxLength: 10000,
    description: '专业长文 + 引用 + 数据',
    promptTemplate: `你是一个知乎答主。基于提供的Canonical Draft数据，生成一篇专业的知乎回答/文章。

要求：
- 使用Markdown格式
- 1000-3000字深度分析
- 有理有据，引用数据时标注来源
- 使用 ## 分节，逻辑清晰
- 适当使用加粗、列表增强可读性
- 专业但不晦涩，面向大学生读者
- 结尾有个人观点总结`,
    publishUrl: 'https://zhuanlan.zhihu.com/write',
  },
  tieba: {
    id: 'tieba',
    name: '贴吧',
    icon: '💬',
    maxLength: 3000,
    description: '社区帖子，随性风格',
    promptTemplate: `你是一个贴吧老哥。基于提供的Canonical Draft数据，生成一个贴吧帖子。

要求：
- 纯文本格式，不用Markdown
- 300-800字
- 语言随性，可以用网络用语但不要过度
- 像跟人聊天一样分享信息
- 适当分段，不要太长篇大论
- 结尾可以问一句引导讨论`,
    publishUrl: 'https://tieba.baidu.com/',
  },
  xiaohongshu: {
    id: 'xiaohongshu',
    name: '小红书',
    icon: '📕',
    maxLength: 2000,
    description: '图文 + 标题党 + emoji',
    promptTemplate: `你是一个小红书博主。基于提供的Canonical Draft数据，生成一篇小红书笔记。

要求：
- 标题吸引眼球，15-20字，可以适当标题党
- 正文300-800字
- 适当使用emoji表情（不要过度）
- 分段短小，每段2-3句
- 重点信息用emoji前缀
- 结尾加3-5个标签，格式：#标签#
- 语气亲切，像跟闺蜜分享
- 适合配图阅读的内容`,
    publishUrl: 'https://creator.xiaohongshu.com/publish/publish',
  },
}

export const PLATFORM_LIST = Object.values(PLATFORM_TEMPLATES)

// 默认选中的平台（新建 Workspace 时预填）
export const DEFAULT_PLATFORMS: PlatformId[] = ['guanwei', 'zhihu', 'xiaohongshu']

// 全局存储的默认平台 key
const DEFAULT_PLATFORMS_KEY = 'guanwei-default-platforms'

export function getDefaultPlatforms(): PlatformId[] {
  try {
    const stored = localStorage.getItem(DEFAULT_PLATFORMS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    // ignore
  }
  return DEFAULT_PLATFORMS
}

export function setDefaultPlatforms(platforms: PlatformId[]): void {
  localStorage.setItem(DEFAULT_PLATFORMS_KEY, JSON.stringify(platforms))
}
