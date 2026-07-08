import { useState, useMemo, useEffect } from 'react'
import { Search, Inbox } from 'lucide-react'
import CommunityCard from '../components/CommunityCard'
import { getCommunityPosts } from '../services/mockData'
import { useDeviceFrame } from '../contexts/DeviceFrameContext'

const tabs = ['推荐', '关注', '公益', '求助', '热帖']

function useIsDesktop() {
  const { inDeviceFrame } = useDeviceFrame()
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768)
  useEffect(() => {
    if (inDeviceFrame) return
    const handler = () => setIsDesktop(window.innerWidth >= 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [inDeviceFrame])
  return inDeviceFrame ? false : isDesktop
}

function CommunityPage() {
  const [selectedTab, setSelectedTab] = useState('推荐')
  const [searchFocused, setSearchFocused] = useState(false)
  const { notchHeight } = useDeviceFrame()
  const isDesktop = useIsDesktop()

  const postsData = useMemo(() => getCommunityPosts(selectedTab), [selectedTab])
  const posts = postsData.posts

  // 移动端两列瀑布流
  const { leftCol, rightCol } = useMemo(() => {
    const left: typeof posts = []
    const right: typeof posts = []
    let leftH = 0
    let rightH = 0
    for (const post of posts) {
      if (leftH <= rightH) {
        left.push(post)
        leftH += post.imageHeight + 80
      } else {
        right.push(post)
        rightH += post.imageHeight + 80
      }
    }
    return { leftCol: left, rightCol: right }
  }, [posts])

  const notchPadding = notchHeight > 0 ? `${notchHeight + 8}px` : undefined

  return (
    <div className="flex flex-col min-h-full bg-paper-texture">
      {/* 顶部 */}
      <div className={`sticky top-0 z-20 glass-subtle ${isDesktop ? 'border-b border-line/30' : ''}`}>
        <div
          className={`${isDesktop ? 'px-6 pb-3' : 'px-5 pb-3'}`}
          style={{ paddingTop: notchPadding || (isDesktop ? '20px' : '16px') }}
        >
          <div className="flex items-center justify-between mb-3">
            <h1 className={`${isDesktop ? 'text-3xl' : 'text-xl'} font-bold text-ink-900 tracking-tight`}>社区</h1>
          </div>

          {/* 搜索栏 */}
          <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all duration-200 ${
            searchFocused
              ? 'bg-surface shadow-card ring-1 ring-seal/20'
              : 'bg-surface/70'
          }`}>
            <Search size={18} className={`flex-shrink-0 transition-colors ${searchFocused ? 'text-seal' : 'text-ink-400'}`} />
            <input
              type="text"
              placeholder="搜索帖子、话题、用户"
              className={`flex-1 bg-transparent ${isDesktop ? 'text-base' : 'text-[14px]'} text-ink-900 placeholder:text-ink-400`}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </div>
        </div>

        {/* Tab 标签 */}
        <div className={`flex ${isDesktop ? 'px-6' : 'px-5'} gap-1 overflow-x-auto scrollbar-none`}>
          {tabs.map((tab) => {
            const isActive = selectedTab === tab
            return (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`shrink-0 px-3 py-2 ${isDesktop ? 'text-base' : 'text-[13px]'} transition-all whitespace-nowrap relative ${
                  isActive ? 'text-seal font-semibold' : 'text-ink-400 font-normal'
                }`}
              >
                {tab}
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-[2.5px] rounded-full bg-seal" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 瀑布流 */}
      <div className={`flex-1 ${isDesktop ? 'px-6 py-4' : 'px-3 pb-6'}`}>
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-16 h-16 rounded-xl bg-paper-dark flex items-center justify-center mb-4">
              <Inbox size={28} className="text-ink-400" />
            </div>
            <p className="text-ink-500 text-sm font-medium mb-1">暂无{selectedTab === '推荐' ? '' : selectedTab}内容</p>
            <p className="text-ink-400 text-xs">换个分类看看，或发布第一篇帖子</p>
          </div>
        ) : isDesktop ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map((post, i) => (
              <CommunityCard key={post.id} post={post} index={i} />
            ))}
          </div>
        ) : (
          <div className="flex gap-2.5">
            <div className="flex-1 flex flex-col gap-2.5">
              {leftCol.map((post, i) => (
                <CommunityCard key={post.id} post={post} index={i} />
              ))}
            </div>
            <div className="flex-1 flex flex-col gap-2.5">
              {rightCol.map((post, i) => (
                <CommunityCard key={post.id} post={post} index={i + leftCol.length} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CommunityPage
