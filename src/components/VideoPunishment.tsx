import { useState, useEffect } from 'react'
import { Play, X } from 'lucide-react'
import type { MelonCategory } from '../types'

interface VideoPunishmentProps {
  isOpen: boolean
  category: MelonCategory
  onClose: () => void
}

const categoryVideos: Record<MelonCategory, { title: string; tips: string[] }> = {
  '娱乐': {
    title: '娱乐谣言识别指南',
    tips: [
      '谣言往往使用模糊的时间地点，如"据说""知情人士透露"',
      '注意检查图片是否被 PS，可以通过图片反向搜索验证',
      '明星工作室声明是最权威的来源',
    ],
  },
  '科技': {
    title: '科技谣言粉碎手册',
    tips: [
      '查证权威科技媒体和专业机构的官方发布',
      '注意论文是否经过同行评审',
      '警惕"重大突破""颠覆性"等夸张用词',
    ],
  },
  '生活科普': {
    title: '生活防骗小知识',
    tips: [
      '官方媒体和权威机构发布的信息更可信',
      '注意查看消息来源和引用数据',
      '很多"专家说"其实是伪专家',
    ],
  },
  '社会热点': {
    title: '社会热点防骗技巧',
    tips: [
      '关注官方通报和权威媒体跟进报道',
      '警惕情绪化的表述和煽动性语言',
      '多方信源交叉验证很重要',
    ],
  },
  '历史': {
    title: '历史谣言辨别法',
    tips: [
      '查阅正规史料和学术论文',
      '注意历史事件的时空背景',
      '警惕"惊人发现"类未经验证的消息',
    ],
  },
  '财经': {
    title: '财经防骗必读',
    tips: [
      '关注证监会、央行等官方发布',
      '警惕内幕消息和小道消息',
      '查证上市公司公告和财报数据',
    ],
  },
  '校园': {
    title: '校园防骗指南',
    tips: [
      '警惕"校园贷""培训贷"等非法借贷',
      '核实奖学金、助学金信息的官方来源',
      '不轻信陌生人提供的兼职和实习机会',
    ],
  },
  '健康': {
    title: '健康谣言粉碎机',
    tips: [
      '查证国家卫健委和权威医疗机构发布',
      '警惕"包治百病""祖传秘方"等夸张宣传',
      '药品和保健品需认准国药准字批号',
    ],
  },
}

const COUNTDOWN_SECONDS = 60

export default function VideoPunishment({ isOpen, category, onClose }: VideoPunishmentProps) {
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)
  const videoInfo = categoryVideos[category] || categoryVideos['生活科普']

  useEffect(() => {
    if (isOpen) {
      setCountdown(COUNTDOWN_SECONDS)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || countdown <= 0) return

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [isOpen, countdown])

  if (!isOpen) return null

  const canClose = countdown <= 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-ink-900/60 backdrop-blur-sm" onClick={() => {}} />

      {/* 弹窗内容 */}
      <div className="relative bg-paper rounded-xl shadow-lg w-[90%] max-w-sm overflow-hidden">
        {/* 标题栏 */}
        <div className="bg-seal text-white px-4 py-3 flex items-center justify-between">
          <h3 className="font-bold text-sm">{videoInfo.title}</h3>
          {canClose && (
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded">
              <X size={18} />
            </button>
          )}
        </div>

        {/* 视频播放器占位 */}
        <div className="aspect-video bg-ink-900 flex items-center justify-center relative">
          <div className="text-white/50 flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <Play size={32} className="text-white ml-1" />
            </div>
            <span className="text-sm text-white/60">模拟视频播放器</span>
          </div>
        </div>

        {/* 防骗小知识 */}
        <div className="p-4">
          <p className="text-ink-700 text-sm font-medium mb-2">防骗小知识</p>
          <ul className="space-y-2">
            {videoInfo.tips.map((tip, i) => (
              <li key={i} className="text-ink-500 text-xs flex items-start gap-2">
                <span className="text-seal font-bold">{i + 1}.</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 倒计时 */}
        <div className="px-4 pb-4">
          <div className="bg-white rounded-lg p-3 text-center">
            {canClose ? (
              <button
                onClick={onClose}
                className="w-full py-2 bg-seal text-white rounded-lg text-sm font-medium hover:bg-seal-light transition-colors"
              >
                我已知晓，关闭
              </button>
            ) : (
              <p className="text-seal text-sm font-medium">
                {countdown} 秒后可关闭
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
