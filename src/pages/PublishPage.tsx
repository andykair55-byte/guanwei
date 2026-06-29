import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ImagePlus, MapPin, ChevronDown, Shield, Loader2, Check } from 'lucide-react'
import { api } from '../services/api'
import { localModerate } from '../services/contentFilter'
import { useDeviceFrame } from '../contexts/DeviceFrameContext'

type PostType = '吃瓜爆料' | '公益求助' | '求助求证'

const postTypes: PostType[] = ['吃瓜爆料', '公益求助', '求助求证']

function PublishPage() {
  const navigate = useNavigate()
  const { notchHeight } = useDeviceFrame()
  const [postType, setPostType] = useState<PostType>('吃瓜爆料')
  const [showTypePicker, setShowTypePicker] = useState(false)
  const [coverImage, setCoverImage] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [location, setLocation] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'followers'>('public')
  const [moderateStatus, setModerateStatus] = useState<'idle' | 'checking' | 'pass' | 'warn'>('idle')
  const [moderateMsg, setModerateMsg] = useState('')
  const [publishing, setPublishing] = useState(false)

  const handleAddTag = () => {
    const trimmed = tagInput.trim().replace(/^#/, '')
    if (trimmed && !tags.includes(trimmed) && tags.length < 5) {
      setTags([...tags, trimmed])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }

  const handleModerateCheck = useCallback(async () => {
    if (!content.trim()) return
    setModerateStatus('checking')
    try {
      const res: any = await api.moderate(content)
      if (res.passed || res.safe) {
        setModerateStatus('pass')
        setModerateMsg('内容审核通过')
      } else {
        setModerateStatus('warn')
        setModerateMsg(res.message || '内容可能包含敏感信息，建议修改后发布')
      }
    } catch {
      // 后端不可用时，降级到前端正则检测
      const localResult = localModerate(content)
      if (localResult.passed) {
        setModerateStatus(localResult.flagged ? 'warn' : 'pass')
        setModerateMsg(localResult.reason || '本地审核通过')
      } else {
        setModerateStatus('warn')
        setModerateMsg(localResult.reason || '内容可能包含敏感信息')
      }
    }
  }, [content])

  const handlePublish = async () => {
    if (!content.trim() || publishing) return
    setPublishing(true)
    try {
      await api.createMelon({
        title: content.slice(0, 50),
        description: content,
        category: postType === '吃瓜爆料' ? '社会热点' : postType === '公益求助' ? '生活科普' : '科技',
        cover_image: coverImage || undefined,
      })
      navigate('/melon')
    } catch (e: any) {
      alert(e.message || '发布失败')
    } finally {
      setPublishing(false)
    }
  }

  const headerHeight = notchHeight > 0 ? notchHeight + 56 : 56

  return (
    <div className="fixed inset-0 z-40 bg-paper-texture animate-slide-up">
      <div className="flex flex-col h-full max-w-[480px] mx-auto">
        {/* 顶部栏 */}
        <div
          className="flex items-center justify-between px-5 border-b border-line/50 flex-shrink-0 glass"
          style={{ height: `${headerHeight}px` }}
        >
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center active:bg-paper-dark transition-colors">
            <X size={20} className="text-ink-700" />
          </button>
          <h1 className="text-[15px] font-semibold text-ink-900">发布</h1>
          <div className="w-9" />
        </div>

        {/* 可滚动内容 */}
        <div className="flex-1 overflow-y-auto">
          {/* 类型选择 */}
          <div className="px-5 pt-5">
            <button
              onClick={() => setShowTypePicker(!showTypePicker)}
              className="flex items-center gap-2 px-4 py-2.5 bg-surface rounded-xl shadow-card text-[14px] text-ink-700 font-medium active:scale-[0.98] transition-transform"
            >
              <span>{postType}</span>
              <ChevronDown size={14} className={`text-ink-400 transition-transform ${showTypePicker ? 'rotate-180' : ''}`} />
            </button>
            {showTypePicker && (
              <div className="mt-2 bg-surface rounded-xl shadow-float overflow-hidden">
                {postTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => { setPostType(type); setShowTypePicker(false) }}
                    className={`w-full px-5 py-3 text-left text-[14px] active:bg-paper-dark transition-colors ${
                      postType === type ? 'text-seal font-semibold' : 'text-ink-700'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 封面图 */}
          <div className="px-5 mt-5">
            {coverImage ? (
              <div className="relative rounded-2xl overflow-hidden shadow-card">
                <img src={coverImage} alt="封面" className="w-full h-48 object-cover" />
                <button
                  onClick={() => setCoverImage(null)}
                  className="absolute top-3 right-3 w-8 h-8 bg-black/40 rounded-xl flex items-center justify-center backdrop-blur-sm"
                >
                  <X size={14} className="text-white" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCoverImage(`https://picsum.photos/seed/publish${Date.now()}/400/300`)}
                className="w-full h-40 rounded-2xl border-2 border-dashed border-line flex flex-col items-center justify-center gap-2 text-ink-400 active:border-seal/40 active:text-seal/60 transition-colors"
              >
                <ImagePlus size={28} />
                <span className="text-[13px]">添加封面图</span>
              </button>
            )}
          </div>

          {/* 正文 */}
          <div className="px-5 mt-5">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={() => content.trim() && handleModerateCheck()}
              placeholder="说点什么..."
              rows={6}
              className="w-full text-[15px] text-ink-900 placeholder:text-ink-400 resize-none leading-relaxed bg-transparent"
            />
          </div>

          {/* 话题标签 */}
          <div className="px-5 mt-2">
            <div className="flex flex-wrap items-center gap-2">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-seal/8 text-seal text-[12px] rounded-lg font-medium"
                >
                  #{tag}
                  <button onClick={() => handleRemoveTag(tag)}>
                    <X size={10} />
                  </button>
                </span>
              ))}
              {tags.length < 5 && (
                <input
                  value={tagInput}
                  onChange={(e) => e.target.value.trim() && setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="# 添加话题"
                  className="text-[12px] text-ink-700 placeholder:text-ink-400 bg-transparent w-24"
                />
              )}
            </div>
          </div>

          {/* 附加选项 */}
          <div className="px-5 mt-5 flex items-center gap-4">
            <button
              onClick={() => setLocation(location ? '' : '当前位置')}
              className={`flex items-center gap-1.5 text-[13px] font-medium transition-colors ${
                location ? 'text-seal' : 'text-ink-400'
              }`}
            >
              <MapPin size={14} />
              {location || '选择地点'}
            </button>

            <button
              onClick={() => setVisibility(visibility === 'public' ? 'followers' : 'public')}
              className="flex items-center gap-1.5 text-[13px] text-ink-400 font-medium"
            >
              <Shield size={14} />
              {visibility === 'public' ? '公开' : '仅关注可见'}
            </button>
          </div>

          {/* AI 审核 */}
          {moderateStatus !== 'idle' && (
            <div className="px-5 mt-5">
              <div className={`flex items-center gap-2.5 p-4 rounded-xl text-[13px] font-medium ${
                moderateStatus === 'checking' ? 'bg-surface shadow-card text-ink-500' :
                moderateStatus === 'pass' ? 'bg-bamboo/10 text-bamboo' :
                'bg-gold/10 text-gold'
              }`}>
                {moderateStatus === 'checking' ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : moderateStatus === 'pass' ? (
                  <Check size={15} />
                ) : (
                  <Shield size={15} />
                )}
                <span>{moderateMsg}</span>
              </div>
            </div>
          )}

          <div className="h-28" />
        </div>

        {/* 底部发布按钮 */}
        <div className="flex-shrink-0 px-5 pb-6 pt-3 glass border-t border-line/50">
          <button
            onClick={handlePublish}
            disabled={!content.trim() || publishing}
            className="w-full py-3.5 rounded-xl bg-seal text-white font-semibold text-[15px] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-seal-glow"
          >
            {publishing ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>发布</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PublishPage
