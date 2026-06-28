import { useState, useCallback, useEffect } from 'react'
import { Heart, MessageSquare, Send, ChevronDown, ChevronUp } from 'lucide-react'
import { api } from '../services/api'
import type { Comment } from '../types'

interface CommentSectionProps {
  melonId: string
}

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  const now = Date.now()
  const diff = now - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

function CommentItem({
  comment,
  onReply,
  depth = 0,
}: {
  comment: Comment
  onReply: (parentId: string, replyToUser: string) => void
  depth?: number
}) {
  const [liked, setLiked] = useState(comment.isLiked)
  const [likes, setLikes] = useState(comment.likes)
  const [showReplies, setShowReplies] = useState(false)
  const [liking, setLiking] = useState(false)

  const handleLike = useCallback(async () => {
    if (liking) return
    setLiking(true)
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikes(prev => wasLiked ? prev - 1 : prev + 1)
    try {
      await api.likeComment(Number(comment.id))
    } catch {
      setLiked(wasLiked)
      setLikes(prev => wasLiked ? prev + 1 : prev - 1)
    } finally {
      setLiking(false)
    }
  }, [liked, liking, comment.id])

  const replies = comment.replies || []
  const hasReplies = replies.length > 0

  return (
    <div className={depth > 0 ? 'ml-8 mt-2' : 'mt-3'}>
      <div className={`flex gap-2.5 ${depth > 0 ? '' : 'py-3'}`}>
        <img
          src={comment.userAvatar}
          alt={comment.userNickname}
          className="w-8 h-8 rounded-full object-cover flex-shrink-0 bg-line/30"
        />
        <div className="flex-1 min-w-0">
          {/* 用户名 + 时间 */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[13px] font-medium text-ink-700">{comment.userNickname}</span>
            <span className="text-[11px] text-ink-faint">{formatTime(comment.createdAt)}</span>
          </div>

          {/* 评论内容 */}
          <p className="text-[14px] text-ink-900 leading-relaxed mb-2">
            {comment.replyToUser && (
              <span className="text-ink-400">@{comment.replyToUser} </span>
            )}
            {comment.content}
          </p>

          {/* 操作栏 */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 text-[12px] transition-colors ${
                liked ? 'text-seal' : 'text-ink-400 hover:text-seal'
              }`}
            >
              <Heart size={13} className={liked ? 'fill-seal' : ''} />
              <span>{likes || ''}</span>
            </button>
            {depth === 0 && (
              <button
                onClick={() => onReply(comment.id, comment.userNickname)}
                className="flex items-center gap-1 text-[12px] text-ink-400 hover:text-ink-700 transition-colors"
              >
                <MessageSquare size={13} />
                <span>回复</span>
              </button>
            )}
          </div>

          {/* 子回复折叠 */}
          {hasReplies && depth === 0 && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="flex items-center gap-1 mt-2 text-[12px] text-ink-400 hover:text-ink-700 transition-colors"
            >
              {showReplies ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              <span>{showReplies ? '收起回复' : `${replies.length}条回复`}</span>
            </button>
          )}
        </div>
      </div>

      {/* 渲染子回复 */}
      {hasReplies && (depth === 0 ? showReplies : true) && (
        <div>
          {replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReply={onReply}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function CommentSection({ melonId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [replyTarget, setReplyTarget] = useState<{ parentId: string; replyToUser: string } | null>(null)

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true)
      const data: any = await api.getComments(Number(melonId))
      const items = data.items || data || []
      // Transform API comments to Comment type
      const transformed: Comment[] = items.map((c: any) => ({
        id: String(c.id),
        userId: String(c.user_id),
        userNickname: c.user_nickname,
        userAvatar: c.user_avatar,
        melonId: String(c.melon_id),
        content: c.content,
        parentId: c.parent_id ? String(c.parent_id) : null,
        replyToUser: c.reply_to_user || '',
        likes: c.likes || 0,
        isLiked: c.is_liked || false,
        createdAt: c.created_at,
        replies: (c.replies || []).map((r: any) => ({
          id: String(r.id),
          userId: String(r.user_id),
          userNickname: r.user_nickname,
          userAvatar: r.user_avatar,
          melonId: String(r.melon_id),
          content: r.content,
          parentId: r.parent_id ? String(r.parent_id) : null,
          replyToUser: r.reply_to_user || '',
          likes: r.likes || 0,
          isLiked: r.is_liked || false,
          createdAt: r.created_at,
        })),
      }))
      setComments(transformed)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [melonId])

  useEffect(() => { fetchComments() }, [fetchComments])

  const handleSubmit = useCallback(async () => {
    const text = commentText.trim()
    if (!text || submitting) return
    setSubmitting(true)
    try {
      const parentId = replyTarget ? Number(replyTarget.parentId) : null
      const replyToUser = replyTarget?.replyToUser || ''
      const result: any = await api.postComment(Number(melonId), text, parentId, replyToUser)
      // Prepend new comment to list
      const newComment: Comment = {
        id: String(result.id),
        userId: String(result.user_id),
        userNickname: result.user_nickname,
        userAvatar: result.user_avatar,
        melonId: String(melonId),
        content: result.content,
        parentId: result.parent_id ? String(result.parent_id) : null,
        replyToUser: result.reply_to_user || '',
        likes: 0,
        isLiked: false,
        createdAt: result.created_at,
        replies: [],
      }
      if (parentId) {
        // Add as reply to existing comment
        setComments(prev => prev.map(c =>
          c.id === String(parentId)
            ? { ...c, replies: [...(c.replies || []), newComment] }
            : c
        ))
      } else {
        setComments(prev => [newComment, ...prev])
      }
      setCommentText('')
      setReplyTarget(null)
    } catch {
      // ignore
    } finally {
      setSubmitting(false)
    }
  }, [commentText, submitting, replyTarget, melonId])

  const handleReply = useCallback((parentId: string, replyToUser: string) => {
    setReplyTarget({ parentId, replyToUser })
  }, [])

  return (
    <div className="px-4 pb-4">
      <h3 className="text-[15px] font-semibold text-ink-900 flex items-center gap-2 pt-2 pb-1">
        <MessageSquare size={16} />
        讨论区
        {comments.length > 0 && (
          <span className="text-[12px] text-ink-400 font-normal">{comments.length}条讨论</span>
        )}
      </h3>

      {/* 评论输入框 */}
      <div className="flex items-end gap-2 mt-3 mb-2">
        <div className="flex-1 relative">
          {replyTarget && (
            <div className="flex items-center gap-1 px-3 py-1 bg-seal/5 rounded-t-lg border-b border-seal/10">
              <span className="text-[11px] text-seal">回复 @{replyTarget.replyToUser}</span>
              <button
                onClick={() => setReplyTarget(null)}
                className="ml-auto text-ink-400 text-[11px] hover:text-ink-700"
              >
                取消
              </button>
            </div>
          )}
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value.slice(0, 300))}
            placeholder={replyTarget ? `回复 @${replyTarget.replyToUser}...` : '说说你的看法...'}
            rows={2}
            className={`w-full px-3 py-2 text-[13px] text-ink-900 placeholder:text-ink-faint bg-surface border border-line/50 resize-none leading-relaxed ${
              replyTarget ? 'rounded-b-lg rounded-t-none' : 'rounded-lg'
            }`}
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={!commentText.trim() || submitting}
          className="flex items-center justify-center w-9 h-9 rounded-lg bg-seal text-white disabled:opacity-30 active:scale-90 transition-all flex-shrink-0"
        >
          <Send size={15} />
        </button>
      </div>

      {/* 评论列表 */}
      {loading ? (
        <div className="space-y-4 py-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-2.5">
              <div className="w-8 h-8 rounded-full skeleton flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3 w-24" />
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare size={28} className="mx-auto text-ink-faint mb-2" />
          <p className="text-[13px] text-ink-400">还没有讨论，来说两句</p>
        </div>
      ) : (
        <div className="divide-y divide-line/30">
          {comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onReply={handleReply}
            />
          ))}
        </div>
      )}
    </div>
  )
}
