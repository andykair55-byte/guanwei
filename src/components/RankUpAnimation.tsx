import { useEffect } from 'react'
import { RANK_CONFIG } from '../config/ranks'
import type { Rank } from '../types'

interface RankUpAnimationProps {
  isOpen: boolean
  oldRank: Rank
  newRank: Rank
  onClose: () => void
}

export default function RankUpAnimation({ isOpen, oldRank: _oldRank, newRank, onClose }: RankUpAnimationProps) {
  const newConfig = RANK_CONFIG[newRank]

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-ink-900/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 内容区域 */}
      <div className="relative flex flex-col items-center gap-6 p-8 animate-[rankUp_0.6s_ease-out]">
        {/* 恭喜文案 */}
        <div className="text-paper text-xl font-bold tracking-wider">
          恭喜段位提升！
        </div>
        
        {/* 新段位图标 - 放大动画 */}
        <div className="text-8xl animate-bounce">
          {newConfig.icon}
        </div>
        
        {/* 新段位名称 */}
        <div className="text-3xl font-bold text-gold">
          {newRank}
        </div>
        
        {/* 装饰线 */}
        <div className="w-32 h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent" />
        
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="mt-4 px-8 py-2 bg-seal text-white rounded-full font-medium
                     hover:bg-seal-light transition-colors active:scale-95"
        >
          我知道了
        </button>
      </div>
    </div>
  )
}