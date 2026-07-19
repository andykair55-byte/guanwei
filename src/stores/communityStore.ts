import { create } from 'zustand'
import {
  getCommunities,
  getCommunityById,
  getCommunitySeedPosts,
  getCommunitySeedPostById,
  getCommunityPostComments,
  getCommunityPostHotScore,
  createCommunitySeedPost,
  type Community,
  type CommunitySeedPost,
  type CommunityComment,
} from '../services/mockData'

// ── 类型定义 ──────────────────────────────────────────

export type CommunityPostTab = 'hot' | 'latest' | 'featured'

interface CommunityStore {
  // 社区列表
  communities: Community[]
  communitiesLoading: boolean
  communitiesError: string | null

  // 帖子缓存：按 communityId 索引
  postsByCommunity: Record<string, CommunitySeedPost[]>
  postsLoading: boolean
  postsError: string | null

  // 评论缓存：按 postId 索引
  commentsByPost: Record<string, CommunityComment[]>
  commentsLoading: boolean
  commentSubmitting: boolean
  commentError: string | null
  lastCommentAt: number // 上次评论时间戳（毫秒），用于 3 秒防刷

  // 帖子详情弹窗
  activePostId: string | null

  // ── Actions ──
  loadCommunities: () => void
  getCommunity: (id: string) => Community | undefined

  loadPosts: (communityId: string) => void
  getPosts: (communityId: string, tab: CommunityPostTab) => CommunitySeedPost[]
  createPost: (data: {
    communityId: string
    title: string
    content: string
    image?: string
  }) => { ok: boolean; error?: string; post?: CommunitySeedPost }

  loadComments: (postId: string) => void
  getComments: (postId: string) => CommunityComment[]
  addComment: (postId: string, content: string) => { ok: boolean; error?: string }
  toggleCommentLike: (postId: string, commentId: string) => void

  setActivePost: (postId: string | null) => void
  togglePostLike: (postId: string) => void
}

// 模拟异步延迟，触发骨架屏
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 评论防刷间隔（毫秒）
const COMMENT_COOLDOWN_MS = 3000

export const useCommunityStore = create<CommunityStore>((set, get) => ({
  communities: [],
  communitiesLoading: false,
  communitiesError: null,

  postsByCommunity: {},
  postsLoading: false,
  postsError: null,

  commentsByPost: {},
  commentsLoading: false,
  commentSubmitting: false,
  commentError: null,
  lastCommentAt: 0,

  activePostId: null,

  // ── 社区列表 ──
  loadCommunities: async () => {
    if (get().communities.length > 0) return
    set({ communitiesLoading: true, communitiesError: null })
    try {
      await delay(280)
      const list = getCommunities()
      set({ communities: list, communitiesLoading: false })
    } catch (e) {
      set({
        communitiesLoading: false,
        communitiesError: (e as Error).message || '加载社区失败',
      })
    }
  },

  getCommunity: (id) => getCommunityById(id),

  // ── 帖子列表 ──
  loadPosts: async (communityId) => {
    if (get().postsByCommunity[communityId]) return
    set({ postsLoading: true, postsError: null })
    try {
      await delay(260)
      const posts = getCommunitySeedPosts(communityId)
      set((state) => ({
        postsByCommunity: { ...state.postsByCommunity, [communityId]: posts },
        postsLoading: false,
      }))
    } catch (e) {
      set({
        postsLoading: false,
        postsError: (e as Error).message || '加载帖子失败',
      })
    }
  },

  getPosts: (communityId, tab) => {
    const posts = get().postsByCommunity[communityId] || []
    if (tab === 'featured') {
      // 精华：只看 hot 类型，按热度排
      return posts
        .filter(p => p.type === 'hot')
        .sort((a, b) => getCommunityPostHotScore(b) - getCommunityPostHotScore(a))
    }
    const sorted = [...posts]
    if (tab === 'hot') {
      sorted.sort((a, b) => getCommunityPostHotScore(b) - getCommunityPostHotScore(a))
    } else if (tab === 'latest') {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }
    return sorted
  },

  createPost: (data) => {
    if (!data.title.trim()) {
      return { ok: false, error: '标题不能为空' }
    }
    if (data.title.trim().length > 80) {
      return { ok: false, error: '标题不能超过 80 字' }
    }
    if (!data.content.trim()) {
      return { ok: false, error: '内容不能为空' }
    }
    try {
      const post = createCommunitySeedPost({
        communityId: data.communityId,
        title: data.title.trim(),
        content: data.content.trim(),
        image: data.image,
      })
      // 新帖子插入到列表顶部
      set((state) => {
        const existing = state.postsByCommunity[data.communityId] || []
        return {
          postsByCommunity: {
            ...state.postsByCommunity,
            [data.communityId]: [post, ...existing],
          },
        }
      })
      return { ok: true, post }
    } catch (e) {
      return { ok: false, error: (e as Error).message || '发布失败' }
    }
  },

  // ── 评论 ──
  loadComments: async (postId) => {
    if (get().commentsByPost[postId]) return
    set({ commentsLoading: true, commentError: null })
    try {
      await delay(150)
      const comments = getCommunityPostComments(postId)
      set((state) => ({
        commentsByPost: { ...state.commentsByPost, [postId]: comments },
        commentsLoading: false,
      }))
    } catch (e) {
      set({
        commentsLoading: false,
        commentError: (e as Error).message || '加载评论失败',
      })
    }
  },

  getComments: (postId) => get().commentsByPost[postId] || [],

  addComment: (postId, content) => {
    const trimmed = content.trim()
    if (!trimmed) {
      return { ok: false, error: '评论内容不能为空' }
    }
    if (trimmed.length > 500) {
      return { ok: false, error: '评论不能超过 500 字' }
    }
    // 3 秒防刷
    const now = Date.now()
    const last = get().lastCommentAt
    if (now - last < COMMENT_COOLDOWN_MS) {
      const remain = Math.ceil((COMMENT_COOLDOWN_MS - (now - last)) / 1000)
      return { ok: false, error: `操作太快，请 ${remain} 秒后再试` }
    }

    const newComment: CommunityComment = {
      id: `cm-new-${postId}-${now}`,
      postId,
      userNickname: '我',
      userAvatar: 'https://picsum.photos/seed/me/80/80',
      content: trimmed,
      likes: 0,
      isLiked: false,
      createdAt: new Date().toISOString(),
    }

    set((state) => {
      const existing = state.commentsByPost[postId] || []
      return {
        commentsByPost: {
          ...state.commentsByPost,
          [postId]: [...existing, newComment],
        },
        lastCommentAt: now,
      }
    })

    // 同步更新帖子的评论数（如果帖子已加载到 store）
    const post = getCommunitySeedPostById(postId)
    if (post) {
      post.comments = (post.comments || 0) + 1
    }

    return { ok: true }
  },

  toggleCommentLike: (postId, commentId) => {
    set((state) => {
      const list = state.commentsByPost[postId] || []
      const updated = list.map(c => {
        if (c.id === commentId) {
          return {
            ...c,
            isLiked: !c.isLiked,
            likes: c.isLiked ? c.likes - 1 : c.likes + 1,
          }
        }
        return c
      })
      return {
        commentsByPost: { ...state.commentsByPost, [postId]: updated },
      }
    })
  },

  setActivePost: (postId) => set({ activePostId: postId }),

  togglePostLike: (postId) => {
    // 帖子点赞直接修改内存对象（mock 行为）
    const post = getCommunitySeedPostById(postId)
    if (post) {
      // 不持久化"我已点赞"状态，仅模拟计数变化由组件本地管理
      // 这里保留接口以便后续扩展
    }
  },
}))
