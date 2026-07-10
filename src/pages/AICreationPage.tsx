import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Sparkles, 
  Image as ImageIcon, 
  Video, 
  TrendingUp,
  Palette,
  FileText,
  Send
} from 'lucide-react'

type Platform = 'xiaohongshu' | 'douyin' | 'bilibili' | 'weibo'
type CreationType = 'image-text' | 'video'
type Style = 'professional' | 'casual' | 'humorous' | 'educational'

interface CreationData {
  platform: Platform | null
  topic: string
  type: CreationType | null
  style: Style | null
}

const PLATFORMS = [
  { id: 'xiaohongshu' as Platform, name: '小红书', icon: '📕', color: 'bg-red-50 text-red-600' },
  { id: 'douyin' as Platform, name: '抖音', icon: '🎵', color: 'bg-gray-900 text-white' },
  { id: 'bilibili' as Platform, name: 'B站', icon: '📺', color: 'bg-pink-50 text-pink-600' },
  { id: 'weibo' as Platform, name: '微博', icon: '🔥', color: 'bg-orange-50 text-orange-600' },
]

const CREATION_TYPES = [
  { id: 'image-text' as CreationType, name: '图文', icon: ImageIcon, desc: '适合小红书、微博' },
  { id: 'video' as CreationType, name: '视频', icon: Video, desc: '适合抖音、B站' },
]

const STYLES = [
  { id: 'professional' as Style, name: '专业严谨', desc: '适合科普、教育类内容' },
  { id: 'casual' as Style, name: '轻松日常', desc: '适合生活分享、日常记录' },
  { id: 'humorous' as Style, name: '幽默风趣', desc: '适合娱乐、搞笑类内容' },
  { id: 'educational' as Style, name: '知识教育', desc: '适合教程、知识分享' },
]

const STEPS = [
  { num: 1, title: '选择平台', icon: TrendingUp },
  { num: 2, title: '输入主题', icon: FileText },
  { num: 3, title: '选择类型', icon: ImageIcon },
  { num: 4, title: '选择风格', icon: Palette },
  { num: 5, title: '生成预览', icon: Sparkles },
  { num: 6, title: '发布', icon: Send },
]

export default function AICreationPage() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [data, setData] = useState<CreationData>({
    platform: null,
    topic: '',
    type: null,
    style: null,
  })
  const [generated, setGenerated] = useState(false)

  const updateData = (updates: Partial<CreationData>) => {
    setData(prev => ({ ...prev, ...updates }))
  }

  const nextStep = () => {
    if (currentStep < 6) setCurrentStep(prev => prev + 1)
  }

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1)
  }

  const handleGenerate = () => {
    setGenerated(true)
    nextStep()
  }

  const handlePublish = () => {
    alert('内容已发布！')
    navigate('/melon')
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1: return data.platform !== null
      case 2: return data.topic.trim().length > 0
      case 3: return data.type !== null
      case 4: return data.style !== null
      case 5: return generated
      default: return true
    }
  }

  return (
    <div className="min-h-full bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="text-sm font-medium">返回</span>
            </button>
            <h1 className="text-lg font-bold text-gray-900">AI创作助手</h1>
            <div className="w-16" />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, idx) => {
              const Icon = step.icon
              const isActive = currentStep === step.num
              const isCompleted = currentStep > step.num
              
              return (
                <div key={step.num} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : isActive
                          ? 'bg-blue-500 text-white ring-4 ring-blue-100'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {isCompleted ? <Check size={20} /> : <Icon size={20} />}
                    </div>
                    <span
                      className={`mt-2 text-xs font-medium ${
                        isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 ${
                        currentStep > step.num ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-gray-50 rounded-2xl p-8 min-h-[400px]">
          {/* Step 1: 选择平台 */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">选择目标平台</h2>
                <p className="text-gray-600">选择你要发布内容的平台</p>
              </div>
              <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                {PLATFORMS.map(platform => (
                  <button
                    key={platform.id}
                    onClick={() => updateData({ platform: platform.id })}
                    className={`p-6 rounded-xl border-2 transition-all ${
                      data.platform === platform.id
                        ? 'border-blue-500 bg-blue-50 shadow-lg scale-105'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                    }`}
                  >
                    <div className="text-4xl mb-3">{platform.icon}</div>
                    <div className="text-lg font-semibold text-gray-900">{platform.name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: 输入主题 */}
          {currentStep === 2 && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">输入创作主题</h2>
                <p className="text-gray-600">描述你想要创作的内容主题</p>
              </div>
              <div className="space-y-4">
                <textarea
                  value={data.topic}
                  onChange={(e) => updateData({ topic: e.target.value })}
                  placeholder="例如：如何在家做出餐厅级别的牛排..."
                  className="w-full h-40 p-4 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none text-gray-900 placeholder:text-gray-400"
                />
                <div className="text-sm text-gray-500 text-right">
                  {data.topic.length} / 500
                </div>
              </div>
            </div>
          )}

          {/* Step 3: 选择类型 */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">选择创作类型</h2>
                <p className="text-gray-600">选择内容呈现形式</p>
              </div>
              <div className="grid grid-cols-2 gap-6 max-w-2xl mx-auto">
                {CREATION_TYPES.map(type => {
                  const Icon = type.icon
                  return (
                    <button
                      key={type.id}
                      onClick={() => updateData({ type: type.id })}
                      className={`p-8 rounded-xl border-2 transition-all ${
                        data.type === type.id
                          ? 'border-blue-500 bg-blue-50 shadow-lg scale-105'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                      }`}
                    >
                      <Icon size={48} className="mx-auto mb-4 text-blue-500" />
                      <div className="text-xl font-semibold text-gray-900 mb-2">{type.name}</div>
                      <div className="text-sm text-gray-600">{type.desc}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 4: 选择风格 */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">选择内容风格</h2>
                <p className="text-gray-600">选择内容的表达风格</p>
              </div>
              <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                {STYLES.map(style => (
                  <button
                    key={style.id}
                    onClick={() => updateData({ style: style.id })}
                    className={`p-6 rounded-xl border-2 transition-all text-left ${
                      data.style === style.id
                        ? 'border-blue-500 bg-blue-50 shadow-lg scale-105'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                    }`}
                  >
                    <div className="text-lg font-semibold text-gray-900 mb-2">{style.name}</div>
                    <div className="text-sm text-gray-600">{style.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: 生成预览 */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">生成内容预览</h2>
                <p className="text-gray-600">AI正在为你生成内容</p>
              </div>
              
              {!generated ? (
                <div className="text-center py-12">
                  <button
                    onClick={handleGenerate}
                    className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center gap-3 mx-auto"
                  >
                    <Sparkles size={24} />
                    开始生成
                  </button>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="bg-white rounded-xl p-6 shadow-md">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="text-2xl">
                        {PLATFORMS.find(p => p.id === data.platform)?.icon}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">
                          {PLATFORMS.find(p => p.id === data.platform)?.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {CREATION_TYPES.find(t => t.id === data.type)?.name} · {STYLES.find(s => s.id === data.style)?.name}
                        </div>
                      </div>
                    </div>
                    
                    <div className="prose prose-sm max-w-none">
                      <h3 className="text-xl font-bold text-gray-900 mb-3">
                        {data.topic.slice(0, 30)}{data.topic.length > 30 ? '...' : ''}
                      </h3>
                      <div className="bg-gray-100 rounded-lg aspect-video mb-4 flex items-center justify-center">
                        <ImageIcon size={48} className="text-gray-400" />
                      </div>
                      <p className="text-gray-700 leading-relaxed">
                        {data.topic}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm">#美食</span>
                        <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm">#教程</span>
                        <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm">#生活</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => setGenerated(false)}
                      className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                    >
                      重新生成
                    </button>
                    <button
                      onClick={nextStep}
                      className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                    >
                      确认发布
                      <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 6: 发布 */}
          {currentStep === 6 && (
            <div className="space-y-6 text-center py-12">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={40} className="text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">准备发布</h2>
              <p className="text-gray-600 mb-8">内容已准备就绪，确认发布到{PLATFORMS.find(p => p.id === data.platform)?.name}</p>
              
              <div className="max-w-md mx-auto bg-white rounded-xl p-6 shadow-md text-left mb-6">
                <div className="text-sm text-gray-500 mb-2">主题</div>
                <div className="text-gray-900 font-medium mb-4">{data.topic}</div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">平台</span>
                  <span className="text-gray-900 font-medium">
                    {PLATFORMS.find(p => p.id === data.platform)?.icon} {PLATFORMS.find(p => p.id === data.platform)?.name}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-500">类型</span>
                  <span className="text-gray-900 font-medium">
                    {CREATION_TYPES.find(t => t.id === data.type)?.name}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-500">风格</span>
                  <span className="text-gray-900 font-medium">
                    {STYLES.find(s => s.id === data.style)?.name}
                  </span>
                </div>
              </div>

              <button
                onClick={handlePublish}
                className="px-12 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center gap-3 mx-auto"
              >
                <Send size={24} />
                立即发布
              </button>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        {currentStep < 6 && (
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              上一步
            </button>
            
            {currentStep < 5 && (
              <button
                onClick={nextStep}
                disabled={!canProceed()}
                className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                下一步
                <ArrowRight size={18} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
