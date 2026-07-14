// 用户
export interface User {
  id: string;
  username?: string;
  nickname: string;
  avatar: string;
  rank: Rank;
  points: number;
  totalGuesses: number;
  correctGuesses: number;
  badges: Badge[];
  publishedCount?: number;  // 发布分析数（AI辅助创作统计）
  createdAt: string;
}

// 瓜（待求证内容）
export interface Melon {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  category: MelonCategory;
  difficulty: 1 | 2 | 3;
  trueCount: number;      // 选真的人数
  falseCount: number;     // 选假的人数
  totalParticipants: number;
  revealTime: string;     // 开奖时间 ISO
  status: 'pending' | 'revealed';
  result?: boolean;       // 开奖后：true=真, false=假
  trueProbability?: number; // 真实概率（0-100，用于猜真假参考）
  report?: Report;        // 开奖后的实锤报告
  likeCount: number;      // 点赞数
  commentCount: number;   // 评论数
  evidenceCount: number;  // 佐证数
  isLiked: boolean;       // 当前用户是否点赞
  createdAt: string;
  author?: {
    id: string;
    nickname: string;
    avatar: string;
    rank?: string;
  };
}

export type MelonCategory = '娱乐' | '科技' | '生活科普' | '社会热点' | '历史' | '财经' | '校园' | '健康';

// 佐证
export interface Evidence {
  id: string;
  userId: string;
  userNickname: string;
  userAvatar: string;
  melonId: string;
  guessId: string;
  direction: boolean;  // true=真, false=假
  content: string;
  upvotes: number;      // 点赞数
  downvotes: number;    // 踩数
  isBest: boolean;      // 是否最佳佐证
  aiAssisted?: boolean; // AI辅助创作标记
  createdAt: string;
}

// 评论
export interface Comment {
  id: string;
  userId: string;
  userNickname: string;
  userAvatar: string;
  melonId: string;
  content: string;
  parentId: string | null;  // 回复的评论ID，null=顶级评论
  replyToUser: string;      // 回复目标用户名
  likes: number;
  isLiked: boolean;
  createdAt: string;
  replies?: Comment[];      // 子回复
}

// 用户判断记录
export interface Guess {
  id: string;
  userId: string;
  melonId: string;
  choice: boolean;        // true=真, false=假
  evidence?: Evidence;    // 佐证（可选）
  guessedAt: string;
  isCorrect?: boolean;
  pointsEarned?: number;
}

// 实锤报告
export interface Report {
  id: string;
  melonId: string;
  timeline: TimelineItem[];
  evidenceChain: EvidenceItem[];
  keyDoubts: string[];
  tendency: string;           // 倾向性判断
  tendencyDirection: boolean; // 倾向真/假
  disclaimer: string;
  generatedAt: string;
}

export interface TimelineItem {
  time: string;
  event: string;
  source: string;
}

export interface EvidenceItem {
  description: string;
  source: string;
  sourceUrl: string;
  credibility: 1 | 2 | 3 | 4 | 5; // 来源可信度 ⭐1-5
}

// 积分变动记录
export interface PointsRecord {
  id: string;
  userId: string;
  amount: number;
  type: 'daily_login' | 'guess_correct' | 'invite' | 'content_quality' | 'exchange' | 'debate_entry' | 'debate_substitute' | 'debate_win' | 'debate_mvp' | 'creation';
  description: string;
  createdAt: string;
}

// 段位
export type Rank = '吃瓜群众' | '瓜田新手' | '鉴瓜学徒' | '瓜田侦探' | '鉴瓜达人' | '鉴瓜大师' | '见微先知';

export interface RankInfo {
  name: Rank;
  level: number;        // 1-7
  icon: string;         // 段位图标名称
  minCorrect: number;   // 最低猜对次数要求
  minAccuracy: number;  // 最低准确率要求
  minTotal: number;     // 最低参与次数要求
}

// 成就徽章
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

// 求证记录
export interface VerificationRequest {
  id: string;
  userId: string;
  content: string;
  type: 'text' | 'link';
  result?: VerificationResult;
  status: 'pending' | 'analyzing' | 'completed';
  createdAt: string;
}

export interface VerificationResult {
  credibilityLevel: 1 | 2 | 3 | 4 | 5;
  summary: string;
  keyEvidence: string[];
  tendency: string;
  evidenceTimeline?: EvidenceTimelineItem[];
}

export interface EvidenceTimelineItem {
  time: string;
  source: string;
  sourceIcon: string;
  title: string;
  summary: string;
  credibility: 1 | 2 | 3 | 4 | 5;
  status?: 'confirmed' | 'disputed' | 'unverified';  // 节点状态：已证实/有争议/未证实
}

// 每日状态
export interface DailyState {
  date: string;
  loginBonusClaimed: boolean;
  freeVerificationUsed: number;
  guessPointsEarned: number;
  extraVerificationPurchased: number;
}

// ========== 后端 API 响应类型 ==========

// 用户 - 后端响应格式
export interface ApiUser {
  id: number;
  username: string;
  nickname: string;
  avatar: string;
  points: number;
  rank: string;
  total_guesses: number;
  correct_guesses: number;
  created_at: string;
}

// 用户统计
export interface UserStats {
  rank: string;
  points: number;
  total_guesses: number;
  correct_guesses: number;
  accuracy: number;
}

// 瓜 - 后端响应格式
export interface ApiMelon {
  id: number;
  title: string;
  description: string;
  category: string;
  cover_image: string;
  creator_id: number;
  creator_nickname?: string;
  creator_avatar?: string;
  creator_rank?: string;
  result: boolean | null;
  status: string;
  reveal_time: string | null;
  participant_count: number;
  true_count: number;
  false_count: number;
  like_count: number;
  comment_count: number;
  evidence_count: number;
  is_liked: boolean;
  created_at: string;
}

// 瓜列表响应
export interface MelonListResponse {
  total: number;
  items: ApiMelon[];
}

// 猜瓜响应
export interface ApiGuess {
  id: number;
  melon_id: number;
  choice: boolean;
  is_correct: boolean | null;
  points_earned: number;
  guessed_at: string;
}

// 我的猜瓜响应
export interface MyGuessResponse {
  guess: ApiGuess | null;
  evidence: ApiEvidence | null;
}

// 佐证 - 后端响应格式
export interface ApiEvidence {
  id: number;
  user_id: number;
  user_nickname: string;
  user_avatar: string;
  melon_id: number;
  content: string;
  upvotes: number;
  downvotes: number;
  is_best: boolean;
  direction: boolean;
  created_at: string;
}

// 佐证列表响应
export interface EvidenceListResponse {
  best: ApiEvidence | null;
  list: ApiEvidence[];
}

// 积分记录 - 后端响应格式
export interface ApiPointsRecord {
  id: number;
  amount: number;
  type: string;
  description: string;
  created_at: string;
}

// 实锤报告 - 后端响应格式
export interface ApiReport {
  melon_id: number;
  timeline: { time: string; event: string; source: string }[];
  evidence_chain: { description: string; source: string; credibility: number }[];
  key_doubts: string[];
  tendency: string;
  tendency_direction: boolean;
  disclaimer: string;
}

// 求证响应
export interface VerifyResponse {
  success: boolean;
  result?: VerificationResult;
  error?: string;
}

// 评论 - 后端响应格式
export interface ApiComment {
  id: number;
  user_id: number;
  user_nickname: string;
  user_avatar: string;
  melon_id: number;
  content: string;
  parent_id: number | null;
  reply_to_user: string;
  likes: number;
  is_liked: boolean;
  created_at: string;
}

// 评论列表响应
export interface CommentListResponse {
  total: number;
  items: ApiComment[];
}