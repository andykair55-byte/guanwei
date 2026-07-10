import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Image as ImageIcon, Tag, MapPin, ChevronRight } from 'lucide-react'

const CATEGORIES = ['娱乐', '科技', '社会', '生活', '财经', '校园', '健康']

export default function PublishPage() {
  const navigate = useNavigate()
  const [content, setContent] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [images, setImages] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAddImage = () => {
    if (images.length >= 9) return
    const newImage = `https://picsum.photos/seed/publish${Date.now()}/400/400`
    setImages(prev => [...prev, newImage])
  }

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const canPublish = content.trim().length > 0

  return (
    <div className="h-full flex flex-col bg-white max-w-2xl mx-auto w-full">
      <header className="sticky top-0 z-20 flex items-center justify-between px-5 h-12 border-b border-ink-50 bg-white/98 backdrop-blur-sm">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-paper-100 transition-colors"
        >
          <X size={20} className="text-ink-700" />
        </button>
        <span className="text-[16px] font-semibold text-ink-900">发布笔记</span>
        <button
          disabled={!canPublish}
          className={`px-5 h-8 rounded-full text-[14px] font-semibold transition-all ${
            canPublish
              ? 'bg-seal-600 text-white hover:bg-seal-500'
              : 'bg-ink-100 text-ink-300'
          }`}
        >
          发布
        </button>
      </header>

      {/* AI辅助创作引导 */}
      <div className="px-5 py-2.5 bg-seal-50/40 border-b border-ink-50 flex items-center justify-between">
        <span className="text-[13px] text-ink-500">需要AI辅助创作？</span>
        <button
          onClick={() => navigate('/agent-world')}
          className="flex items-center gap-1 text-[13px] font-medium text-seal-600 hover:text-seal-500 transition-colors"
        >
          去工作间
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto w-full">
          <div className="p-5">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="分享新鲜事..."
              rows={8}
              className="w-full text-[16px] text-ink-800 placeholder:text-ink-300 bg-transparent outline-none resize-none leading-relaxed"
              autoFocus
            />
          </div>

          <div className="px-5 pb-6">
            <div className="grid grid-cols-3 gap-2">
              {images.map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-paper-100 group">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={14} className="text-white" />
                  </button>
                </div>
              ))}
              {images.length < 9 && (
                <button
                  onClick={handleAddImage}
                  className="aspect-square rounded-lg border-2 border-dashed border-ink-200 flex flex-col items-center justify-center gap-1 hover:border-seal-600/50 hover:bg-seal-50/30 transition-colors"
                >
                  <ImageIcon size={24} className="text-ink-300" />
                  <span className="text-[11px] text-ink-300">{images.length}/9</span>
                </button>
              )}
            </div>
          </div>

          <div className="border-t border-ink-50">
            <button className="w-full flex items-center gap-3 px-5 py-4 hover:bg-paper-50 transition-colors">
              <Tag size={20} className="text-ink-400" />
              <span className="flex-1 text-left text-[15px] text-ink-700">添加话题</span>
              <span className="text-[13px] text-ink-300">#话题</span>
              <ChevronRight size={18} className="text-ink-200" />
            </button>

            <button className="w-full flex items-center gap-3 px-5 py-4 hover:bg-paper-50 transition-colors border-t border-ink-50">
              <MapPin size={20} className="text-ink-400" />
              <span className="flex-1 text-left text-[15px] text-ink-700">添加位置</span>
              <ChevronRight size={18} className="text-ink-200" />
            </button>
          </div>

          <div className="px-5 py-4 border-t border-ink-50">
            <p className="text-[13px] text-ink-400 mb-3">选择分类</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
                  className={`px-4 h-8 rounded-full text-[13px] font-medium transition-all ${
                    selectedCategory === cat
                      ? 'bg-ink-900 text-white'
                      : 'bg-paper-100 text-ink-500 hover:bg-paper-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" />
    </div>
  )
}
