import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Share2, Heart, MessageSquare, Bookmark, Flame, HandHeart, HelpCircle } from 'lucide-react'
import { getCommunityPostById, getFeaturedPostContent } from '../services/mockData'
import CommentSection from '../components/CommentSection'
import VerificationNoteSection from '../components/VerificationNoteSection'
import { usePlatform } from '../hooks/usePlatform'

const typeTagConfig = {
  hot: { icon: Flame, label: '热帖', bg: 'bg-red-500/90', text: 'text-white' },
  charity: { icon: HandHeart, label: '公益', bg: 'bg-green-500/90', text: 'text-white' },
  help: { icon: HelpCircle, label: '求助', bg: 'bg-amber-500/90', text: 'text-white' },
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
  const wrap = isWeb ? 'max-w-3xl mx-auto px-6' : 'max-w-[480px] mx-auto'

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

  // 滚动到顶部
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

  // ── Web 端：知乎式阅读布局 ──
  if (isWeb) {
    return (
      <div className="min-h-screen bg-paper-50">
        {/* 顶部固定导航 */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-line/40">
          <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-ink-700 text-sm font-medium hover:text-seal transition-colors">
              <ArrowLeft size={18} />
              <span>返回社区</span>
            </button>
            <div className="flex-1" />
            <button onClick={handleShare} className="flex items-center gap-1.5 text-ink-600 text-sm hover:text-seal transition-colors">
              <Share2 size={16} />
              {showCopied && <span className="text-seal text-xs font-medium">已复制</span>}
            </button>
          </div>
        </header>

        {/* 主体：左浮动互动栏 + 居中正文 */}
        <div className="max-w-3xl mx-auto px-6 py-8 flex gap-12">
          {/* 左侧浮动互动栏 */}
          <aside className="sticky top-24 self-start flex flex-col items-center gap-4 w-12 flex-shrink-0">
            <button
              onClick={handleLike}
              className={`flex flex-col items-center gap-1 w-12 h-12 rounded-full border transition-all ${
                liked
                  ? 'border-seal/30 bg-seal/8 text-seal'
                  : 'border-line/40 bg-white text-ink-500 hover:border-seal/40 hover:text-seal'
              }`}
            >
              <Heart size={20} className={liked ? 'fill-seal' : ''} />
            </button>
            <span className="text-[11px] font-semibold text-ink-500 -mt-2">{formatCount(likeCount || post.likes)}</span>

            <button className="flex flex-col items-center gap-1 w-12 h-12 rounded-full border border-line/40 bg-white text-ink-500 hover:border-ink-300 hover:text-ink-700 transition-all">
              <MessageSquare size={20} />
            </button>
            <span className="text-[11px] font-semibold text-ink-500 -mt-2">{formatCount(postContent.comments)}</span>

            <button
              onClick={() => setBookmarked(!bookmarked)}
              className={`flex flex-col items-center gap-1 w-12 h-12 rounded-full border transition-all ${
                bookmarked
                  ? 'border-gold/30 bg-gold/8 text-gold'
                  : 'border-line/40 bg-white text-ink-500 hover:border-gold/40 hover:text-gold'
              }`}
            >
              <Bookmark size={20} className={bookmarked ? 'fill-gold' : ''} />
            </button>
            <span className="text-[11px] font-semibold text-ink-500 -mt-2">{formatCount(postContent.collects)}</span>
          </aside>

          {/* 正文区域 */}
          <article className="flex-1 min-w-0">
            {/* 类型标签 */}
            {tag && TagIcon && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-md ${tag.bg} ${tag.text} mb-4`}>
                <TagIcon size={11} />
                {tag.label}
              </span>
            )}

            {/* 标题 */}
            <h1 className="text-[26px] font-bold text-ink-900 leading-tight mb-5 tracking-tight">
              {post.title}
            </h1>

            {/* 作者信息 */}
            <div className="flex items-center gap-3 pb-5 mb-6 border-b border-line/30">
              <img
                src={post.authorAvatar}
                alt={post.authorName}
                className="w-10 h-10 rounded-full bg-paper-dark ring-1 ring-line/40 cursor-pointer hover:ring-seal/50 transition-all"
                onClick={() => navigate(`/user/${post.authorName}`)}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-ink-900">{post.authorName}</p>
                <p className="text-[12px] text-ink-500">{formatTime(post.createdAt)}</p>
              </div>
              <button className="px-4 py-1.5 rounded-lg bg-seal text-white text-[13px] font-bold press-pop hover:bg-seal/90 transition-colors">
                关注
              </button>
            </div>

            {/* 正文内容 */}
            <div className="text-[16px] text-ink-800 leading-[1.85] space-y-5 whitespace-pre-line mb-6">
              {postContent.content}
            </div>

            {/* 帖子图片（如有） */}
            {post.image && (
              <div className="mb-6 rounded-xl overflow-hidden border border-line/20">
                <img src={post.image} alt={post.title} className="w-full max-h-96 object-cover" />
              </div>
            )}

            {/* 话题标签 */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8 pb-6 border-b border-line/30">
                {post.tags.map(t => (
                  <span key={t} className="text-[13px] text-seal bg-seal/8 px-3 py-1 rounded-lg font-medium hover:bg-seal/12 transition-colors cursor-pointer">
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {/* 求证笔记 / 讨论区 */}
            {showVerificationNote ? (
              <div className="mt-2">
                <VerificationNoteSection
                  melonId={post.id}
                  melonTitle={post.title}
                  activeTab={noteTab}
                  onTabChange={setNoteTab}
                />
                {noteTab === 'comments' && (
                  <div className="mt-3 bg-white rounded-xl border border-line/30">
                    <CommentSection melonId={post.id} />
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-2">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare size={18} className="text-ink-500" />
                  <h2 className="text-[16px] font-bold text-ink-900">讨论区</h2>
                  <span className="text-[13px] text-ink-400">{formatCount(postContent.comments)} 条评论</span>
                </div>
                <div className="bg-white rounded-xl border border-line/30">
                  <CommentSection melonId={post.id} />
                </div>
              </div>
            )}
          </article>
        </div>
      </div>
    )
  }

  // ── 移动端：保持原有布局 ──
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
