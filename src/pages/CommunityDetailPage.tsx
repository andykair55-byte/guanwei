import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Share2, Heart, MessageSquare, Bookmark, Flame, HandHeart, HelpCircle, MoreHorizontal, Send } from 'lucide-react'
import { getCommunityPostById, getFeaturedPostContent } from '../services/mockData'
import CommentSection from '../components/CommentSection'
import VerificationNoteSection from '../components/VerificationNoteSection'
import { usePlatform } from '../hooks/usePlatform'

const typeTagConfig = {
  hot: { icon: Flame, label: '热帖', bg: 'bg-red-500', text: 'text-white' },
  charity: { icon: HandHeart, label: '公益', bg: 'bg-green-500', text: 'text-white' },
  help: { icon: HelpCircle, label: '求助', bg: 'bg-amber-500', text: 'text-white' },
  normal: null,
}

function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}天前`
  return new Date(iso).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

export default function CommunityDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isWeb } = usePlatform()

  const [liked, setLiked] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [showCopied, setShowCopied] = useState(false)
  const [noteTab, setNoteTab] = useState<'notes' | 'comments'>('notes')

  const post = useMemo(() => {
    if (!id) return undefined
    return getCommunityPostById(id)
  }, [id])

  const postContent = useMemo(() => {
    if (!id) return null
    const featured = getFeaturedPostContent(id)
    if (featured) return featured
    if (post) {
      return {
        content: post.title + '\n\n欢迎在下方评论区分享你的看法和经历，一起参与讨论。',
        comments: Math.floor(post.likes * 0.3),
        collects: Math.floor(post.likes * 0.6),
      }
    }
    return null
  }, [id, post])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id])

  if (!post || !postContent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-paper-texture">
        <div className="w-16 h-16 rounded-xl bg-paper-dark flex items-center justify-center mb-4">
          <MessageSquare size={28} className="text-ink-400" />
        </div>
        <p className="text-ink-500 text-sm mb-4 font-medium">帖子不存在或已被删除</p>
        <button onClick={() => navigate('/community')} className="px-5 py-2.5 bg-seal text-white rounded-xl text-sm font-medium shadow-seal-glow">
          返回社区
        </button>
      </div>
    )
  }

  const tag = typeTagConfig[post.type]
  const TagIcon = tag?.icon
  const showVerificationNote = post.type === 'help'

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShowCopied(true)
      setTimeout(() => setShowCopied(false), 2000)
    } catch { /* ignore */ }
  }

  const handleLike = () => {
    setLiked(!liked)
    setLikeCount(prev => liked ? prev - 1 : prev + 1)
  }

  // ── Web 端：微博/即刻式动态卡片 ──
  if (isWeb) {
    return (
      <div className="min-h-screen bg-paper-50">
        {/* 顶部固定导航 */}
        <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-xl border-b border-line/40">
          <div className="max-w-2xl mx-auto px-5 h-14 flex items-center">
            <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-ink-700 text-sm font-medium hover:text-seal transition-colors">
              <ArrowLeft size={18} />
              <span>返回</span>
            </button>
            <div className="flex-1 text-center">
              <span className="text-[14px] font-semibold text-ink-800">帖子详情</span>
            </div>
            <button onClick={handleShare} className="flex items-center gap-1.5 text-ink-600 text-sm hover:text-seal transition-colors">
              <Share2 size={16} />
              {showCopied && <span className="text-seal text-xs font-medium">已复制</span>}
            </button>
          </div>
        </header>

        {/* 动态卡片主体 */}
        <div className="max-w-2xl mx-auto px-5 py-6">
          <div className="bg-white rounded-2xl border border-line/30 overflow-hidden shadow-sm">
            {/* 作者行 */}
            <div className="flex items-center gap-3 px-5 pt-5 pb-3">
              <img
                src={post.authorAvatar}
                alt={post.authorName}
                className="w-11 h-11 rounded-full bg-paper-dark ring-1 ring-line/40 cursor-pointer hover:ring-seal/50 transition-all"
                onClick={() => navigate(`/user/${post.authorName}`)}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[15px] font-semibold text-ink-900">{post.authorName}</p>
                  {tag && TagIcon && (
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded ${tag.bg} ${tag.text}`}>
                      <TagIcon size={9} />
                      {tag.label}
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-ink-500 mt-0.5">{formatTime(post.createdAt)}</p>
              </div>
              <button className="px-3 py-1 rounded-md bg-seal/8 text-seal text-[12px] font-bold hover:bg-seal/12 transition-colors">
                + 关注
              </button>
              <button className="p-1.5 rounded-md text-ink-400 hover:bg-paper-100 hover:text-ink-600 transition-colors">
                <MoreHorizontal size={18} />
              </button>
            </div>

            {/* 正文 */}
            <div className="px-5 pb-4">
              <p className="text-[16px] text-ink-900 leading-[1.75] whitespace-pre-line font-normal">
                {postContent.content}
              </p>
            </div>

            {/* 图片 */}
            {post.image && (
              <div className="px-5 pb-4">
                <div className="rounded-xl overflow-hidden border border-line/20">
                  <img src={post.image} alt={post.title} className="w-full max-h-[500px] object-cover" />
                </div>
              </div>
            )}

            {/* 话题标签 */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 px-5 pb-4">
                {post.tags.map(t => (
                  <span key={t} className="text-[13px] text-seal bg-seal/6 px-2.5 py-0.5 rounded-md font-medium hover:bg-seal/10 transition-colors cursor-pointer">
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {/* 底部互动栏 */}
            <div className="flex items-center justify-around px-5 py-3 border-t border-line/20 bg-paper-50/50">
              <button
                onClick={handleLike}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[14px] font-medium transition-all ${
                  liked
                    ? 'text-seal bg-seal/8'
                    : 'text-ink-500 hover:bg-paper-100 hover:text-seal'
                }`}
              >
                <Heart size={18} className={liked ? 'fill-seal' : ''} />
                {formatCount(likeCount || post.likes)}
              </button>
              <button className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[14px] font-medium text-ink-500 hover:bg-paper-100 hover:text-ink-700 transition-colors">
                <MessageSquare size={18} />
                {formatCount(postContent.comments)}
              </button>
              <button
                onClick={() => setBookmarked(!bookmarked)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[14px] font-medium transition-all ${
                  bookmarked
                    ? 'text-gold bg-gold/8'
                    : 'text-ink-500 hover:bg-paper-100 hover:text-gold'
                }`}
              >
                <Bookmark size={18} className={bookmarked ? 'fill-gold' : ''} />
                {formatCount(postContent.collects)}
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[14px] font-medium text-ink-500 hover:bg-paper-100 hover:text-seal transition-colors"
              >
                <Send size={18} />
                分享
              </button>
            </div>
          </div>

          {/* 评论区 */}
          <div className="mt-4 bg-white rounded-2xl border border-line/30 overflow-hidden">
            {showVerificationNote ? (
              <>
                <VerificationNoteSection
                  melonId={post.id}
                  melonTitle={post.title}
                  activeTab={noteTab}
                  onTabChange={setNoteTab}
                />
                {noteTab === 'comments' && (
                  <div className="border-t border-line/20">
                    <CommentSection melonId={post.id} />
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="px-5 py-4 flex items-center gap-2 border-b border-line/20">
                  <MessageSquare size={18} className="text-ink-500" />
                  <h2 className="text-[15px] font-bold text-ink-900">评论</h2>
                  <span className="text-[13px] text-ink-400">{formatCount(postContent.comments)} 条</span>
                </div>
                <CommentSection melonId={post.id} />
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── 移动端：保持原有布局 ──
  const wrap = 'max-w-[480px] mx-auto'
  return (
    <div className="min-h-screen bg-paper-texture pb-8">
      <div className="sticky top-0 z-20 glass border-b border-line/50">
        <div className={`flex items-center h-12 px-4 ${wrap}`}>
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-ink-700 text-sm active:opacity-60">
            <ArrowLeft size={18} />
            <span>返回</span>
          </button>
          <div className="flex-1" />
          <button onClick={handleShare} className="flex items-center gap-1 text-ink-700 text-sm active:opacity-60">
            <Share2 size={18} />
            {showCopied && <span className="text-seal text-xs font-medium">已复制</span>}
          </button>
        </div>
      </div>

      <div className={wrap}>
        <div className="relative">
          <img src={post.image} alt={post.title} className="w-full h-64 object-cover" />
          {tag && TagIcon && (
            <span className={`absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg ${tag.bg} ${tag.text} backdrop-blur-md`}>
              <TagIcon size={11} />
              {tag.label}
            </span>
          )}
        </div>

        <div className="px-5 pt-4 pb-3">
          <h1 className="text-[18px] font-bold text-ink-900 leading-snug mb-3">{post.title}</h1>
          <div className="flex items-center gap-3">
            <img
              src={post.authorAvatar}
              alt={post.authorName}
              className="w-9 h-9 rounded-full bg-paper-dark ring-1 ring-line/40 cursor-pointer hover:ring-seal/50 transition-all"
              onClick={() => navigate(`/user/${post.authorName}`)}
            />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-ink-900 truncate">{post.authorName}</p>
              <p className="text-[12px] text-ink-500">{formatTime(post.createdAt)}</p>
            </div>
            <button className="px-3.5 py-1.5 rounded-lg bg-seal text-white text-[13px] font-bold press-pop">
              关注
            </button>
          </div>
        </div>

        <div className="px-5 pb-3">
          <div className="text-[15px] text-ink-800 leading-[1.8] space-y-4 whitespace-pre-line">
            {postContent.content}
          </div>
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {post.tags.map(t => (
                <span key={t} className="text-[13px] text-seal bg-seal/8 px-2.5 py-1 rounded-lg font-medium">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-line/30 flex items-center gap-6">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 text-[14px] font-semibold transition-all press-pop ${
              liked ? 'text-seal' : 'text-ink-600 hover:text-seal'
            }`}
          >
            <Heart size={18} className={liked ? 'fill-seal' : ''} />
            {formatCount(likeCount || post.likes)}
          </button>
          <button className="flex items-center gap-1.5 text-[14px] font-semibold text-ink-600 hover:text-ink-900 transition-colors">
            <MessageSquare size={18} />
            {formatCount(postContent.comments)}
          </button>
          <button
            onClick={() => setBookmarked(!bookmarked)}
            className={`flex items-center gap-1.5 text-[14px] font-semibold transition-all press-pop ml-auto ${
              bookmarked ? 'text-gold' : 'text-ink-600 hover:text-gold'
            }`}
          >
            <Bookmark size={18} className={bookmarked ? 'fill-gold' : ''} />
            {formatCount(postContent.collects)}
          </button>
        </div>

        {showVerificationNote ? (
          <>
            <VerificationNoteSection
              melonId={post.id}
              melonTitle={post.title}
              activeTab={noteTab}
              onTabChange={setNoteTab}
            />
            {noteTab === 'comments' && (
              <div className="mx-5 mt-2 bg-surface rounded-xl border border-line/30">
                <CommentSection melonId={post.id} />
              </div>
            )}
          </>
        ) : (
          <div className="mt-2">
            <div className="px-5 py-3 flex items-center gap-2">
              <MessageSquare size={16} className="text-ink-500" />
              <h2 className="text-[14px] font-bold text-ink-900">讨论区</h2>
            </div>
            <div className="mx-5 bg-surface rounded-xl border border-line/30">
              <CommentSection melonId={post.id} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
