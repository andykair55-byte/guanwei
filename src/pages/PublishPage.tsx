import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X,
  Image as ImageIcon,
  ChevronRight,
  Send,
  Eye,
  User,
  MessageCircle,
  AlertCircle,
  Sparkles,
  Hash,
} from 'lucide-react'
import { usePlatform } from '../hooks/usePlatform'

type PostCategory = 'hot' | 'normal' | 'help' | 'charity'

const CATEGORIES: { key: PostCategory; label: string; color: string; bgColor: string; desc: string }[] = [
  { key: 'hot', label: '热帖', color: '#EF4444', bgColor: '#FEE2E2', desc: '引发广泛讨论的热点话题' },
  { key: 'normal', label: '讨论', color: '#6366F1', bgColor: '#EEF2FF', desc: '自由表达观点和想法' },
  { key: 'help', label: '求助', color: '#F59E0B', bgColor: '#FEF3C7', desc: '寻求帮助或求证真伪' },
  { key: 'charity', label: '公益', color: '#10B981', bgColor: '#D1FAE5', desc: '公益活动和爱心传递' },
]

const HOT_TAGS = ['观微观察', '热点求证', '生活科普', '娱乐八卦', '科技前沿', '社会热点', '校园生活']

export default function PublishPage() {
  const navigate = useNavigate()
  const { isWeb } = usePlatform()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<PostCategory>('normal')
  const [images, setImages] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [allowComments, setAllowComments] = useState(true)
  const [isAnonymous, setIsAnonymous] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const canPublish = title.trim().length > 0 && content.trim().length > 0

  const handleAddImage = () => {
    if (images.length >= 9) return
    const newImage = `https://picsum.photos/seed/publish${Date.now()}_${images.length}/600/600`
    setImages(prev => [...prev, newImage])
  }

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleAddTag = (tag: string) => {
    const t = tag.trim()
    if (t && !tags.includes(t) && tags.length < 5) {
      setTags(prev => [...prev, t])
    }
    setTagInput('')
  }

  const handleRemoveTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag))
  }

  const handleTagInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleAddTag(tagInput)
    }
  }

  const handlePublish = () => {
    if (!canPublish) return
    // 模拟发布成功，返回社区页
    alert('发布成功！')
    navigate('/community')
  }

  const categoryConfig = CATEGORIES.find(c => c.key === selectedCategory)!

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-6 h-14 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <X size={20} className="text-gray-600" />
          </button>
          <div className="h-5 w-px bg-gray-200" />
          <h1 className="text-[17px] font-bold text-gray-900">发布新观点</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="px-4 h-9 rounded-full text-[14px] font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            存草稿
          </button>
          <button
            onClick={handlePublish}
            disabled={!canPublish}
            className={`px-6 h-9 rounded-full text-[14px] font-semibold transition-all flex items-center gap-1.5 ${
              canPublish
                ? 'bg-gradient-to-r from-rose-400 to-pink-500 text-white hover:shadow-lg hover:shadow-rose-200/50 hover:scale-[1.02] active:scale-[0.98]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Send size={15} />
            <span>发布</span>
          </button>
        </div>
      </header>

      {/* 主体内容区 */}
      <div className="flex-1 overflow-y-auto">
        <div className={`${isWeb ? 'max-w-5xl' : 'max-w-2xl'} mx-auto w-full px-6 py-6`}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左侧：编辑区（占2列） */}
            <div className="lg:col-span-2 space-y-5">
              {/* 标题输入 */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 rounded-full" style={{ backgroundColor: categoryConfig.color }} />
                  <span className="text-[14px] font-semibold text-gray-800">标题</span>
                  <span className="text-[12px] text-gray-400 ml-auto">{title.length}/50</span>
                </div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, 50))}
                  placeholder="一个吸引人的标题，让更多人看到你的观点..."
                  className="w-full text-[20px] font-bold text-gray-900 placeholder:text-gray-300 bg-transparent outline-none"
                />
              </div>

              {/* 正文编辑器 */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 rounded-full" style={{ backgroundColor: categoryConfig.color }} />
                  <span className="text-[14px] font-semibold text-gray-800">正文</span>
                  <span className="text-[12px] text-gray-400 ml-auto">{content.length}/2000</span>
                </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value.slice(0, 2000))}
                  placeholder="分享你的观点、故事或发现...

支持分段书写，清晰表达你的想法。
可以结合图片，让内容更有说服力。"
                  rows={12}
                  className="w-full text-[15px] text-gray-800 placeholder:text-gray-300 bg-transparent outline-none resize-none leading-relaxed"
                />

                {/* 工具栏 */}
                <div className="flex items-center gap-1 mt-4 pt-4 border-t border-gray-50">
                  <button
                    onClick={handleAddImage}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
                  >
                    <ImageIcon size={18} />
                    <span>图片</span>
                  </button>
                  <button
                    onClick={() => {}}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
                  >
                    <Sparkles size={18} />
                    <span>AI 润色</span>
                  </button>
                </div>
              </div>

              {/* 图片上传区 */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 rounded-full" style={{ backgroundColor: categoryConfig.color }} />
                  <span className="text-[14px] font-semibold text-gray-800">图片</span>
                  <span className="text-[12px] text-gray-400 ml-auto">{images.length}/9</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group shadow-sm">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                      >
                        <X size={14} className="text-white" />
                      </button>
                      <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/40 text-white text-[10px]">
                        {idx + 1}
                      </div>
                    </div>
                  ))}
                  {images.length < 9 && (
                    <button
                      onClick={handleAddImage}
                      className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1.5 hover:border-rose-300 hover:bg-rose-50/30 transition-all group"
                    >
                      <ImageIcon size={24} className="text-gray-300 group-hover:text-rose-400 transition-colors" />
                      <span className="text-[12px] text-gray-400 group-hover:text-rose-400 transition-colors">添加图片</span>
                    </button>
                  )}
                </div>
                <p className="text-[12px] text-gray-400 mt-3 flex items-center gap-1">
                  <AlertCircle size={12} />
                  支持 JPG、PNG 格式，单张不超过 5MB
                </p>
              </div>
            </div>

            {/* 右侧：设置区（占1列） */}
            <div className="space-y-5">
              {/* 分类选择 */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 rounded-full bg-rose-400" />
                  <span className="text-[14px] font-semibold text-gray-800">选择分类</span>
                </div>
                <div className="space-y-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => setSelectedCategory(cat.key)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                        selectedCategory === cat.key
                          ? 'bg-gray-50 ring-1 ring-gray-200'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-bold"
                        style={{ backgroundColor: cat.bgColor, color: cat.color }}
                      >
                        {cat.label.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-semibold text-gray-800">{cat.label}</span>
                          {selectedCategory === cat.key && (
                            <span
                              className="text-[10px] font-bold px-1.5 py-px rounded-md"
                              style={{ backgroundColor: cat.bgColor, color: cat.color }}
                            >
                              已选
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-gray-400 truncate">{cat.desc}</p>
                      </div>
                      <ChevronRight size={16} className={`text-gray-300 transition-transform ${selectedCategory === cat.key ? 'rotate-90' : ''}`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* 话题标签 */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 rounded-full bg-rose-400" />
                  <span className="text-[14px] font-semibold text-gray-800">话题标签</span>
                  <span className="text-[12px] text-gray-400 ml-auto">{tags.length}/5</span>
                </div>

                {/* 已选标签 */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {tags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[13px] font-medium bg-rose-50 text-rose-500"
                      >
                        <Hash size={12} />
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-0.5 hover:bg-rose-100 rounded-full p-0.5 -mr-1 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* 标签输入 */}
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 focus-within:border-rose-200 focus-within:bg-rose-50/30 transition-all">
                  <Hash size={16} className="text-gray-400" />
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagInputKey}
                    placeholder="输入标签，回车添加"
                    className="flex-1 text-[13px] text-gray-700 placeholder:text-gray-400 bg-transparent outline-none"
                  />
                </div>

                {/* 热门标签 */}
                <div className="mt-3">
                  <p className="text-[12px] text-gray-400 mb-2">热门话题</p>
                  <div className="flex flex-wrap gap-1.5">
                    {HOT_TAGS.map(tag => (
                      <button
                        key={tag}
                        onClick={() => handleAddTag(tag)}
                        disabled={tags.includes(tag) || tags.length >= 5}
                        className={`px-2.5 py-1 rounded-md text-[12px] transition-all ${
                          tags.includes(tag)
                            ? 'bg-rose-100 text-rose-500 font-medium'
                            : tags.length >= 5
                              ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                              : 'bg-gray-50 text-gray-500 hover:bg-rose-50 hover:text-rose-500'
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 其他设置 */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 rounded-full bg-rose-400" />
                  <span className="text-[14px] font-semibold text-gray-800">其他设置</span>
                </div>
                <div className="space-y-1">
                  <button
                    onClick={() => setAllowComments(!allowComments)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                      <MessageCircle size={18} className="text-blue-500" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-[14px] font-medium text-gray-800">允许评论</p>
                      <p className="text-[12px] text-gray-400">开启后其他用户可以评论你的帖子</p>
                    </div>
                    <div
                      className={`w-11 h-6 rounded-full transition-colors relative ${
                        allowComments ? 'bg-rose-500' : 'bg-gray-200'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${
                          allowComments ? 'left-5' : 'left-0.5'
                        }`}
                      />
                    </div>
                  </button>

                  <button
                    onClick={() => setIsAnonymous(!isAnonymous)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                      <User size={18} className="text-amber-500" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-[14px] font-medium text-gray-800">匿名发布</p>
                      <p className="text-[12px] text-gray-400">隐藏你的身份，以匿名方式发布</p>
                    </div>
                    <div
                      className={`w-11 h-6 rounded-full transition-colors relative ${
                        isAnonymous ? 'bg-rose-500' : 'bg-gray-200'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${
                          isAnonymous ? 'left-5' : 'left-0.5'
                        }`}
                      />
                    </div>
                  </button>
                </div>
              </div>

              {/* 预览按钮（移动端） */}
              {!isWeb && (
                <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 text-[14px] font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  <Eye size={16} />
                  <span>预览效果</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 底部发布栏（移动端） */}
      {!isWeb && (
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-5 py-3">
          <button
            onClick={handlePublish}
            disabled={!canPublish}
            className={`w-full h-12 rounded-full text-[15px] font-semibold transition-all flex items-center justify-center gap-2 ${
              canPublish
                ? 'bg-gradient-to-r from-rose-400 to-pink-500 text-white shadow-lg shadow-rose-200/50'
                : 'bg-gray-200 text-gray-400'
            }`}
          >
            <Send size={18} />
            <span>发布新观点</span>
          </button>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" />
    </div>
  )
}
