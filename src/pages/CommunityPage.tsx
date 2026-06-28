import { useState, useMemo } from 'react'
import { Search, Inbox } from 'lucide-react'
import CommunityCard from '../components/CommunityCard'
import { getCommunityPosts } from '../services/mockData'

const tabs = ['推荐', '关注', '公益', '求助', '热帖']

function CommunityPage() {
  const [selectedTab, setSelectedTab] = useState('推荐')
  const [searchFocused, setSearchFocused] = useState(false)

  const posts = useMemo(() => getCommunityPosts(selectedTab), [selectedTab])

  // 分成两列做瀑布流
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

  return (
    <div className="flex flex-col min-h-full bg-paper-texture">
      {/* 顶部 */}
      <div className="sticky top-0 z-20 glass-subtle">
        <div className="px-5 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-ink-900 tracking-tight">社区</h1>
          </div>

          {/* 搜索栏 */}
          <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all duration-200 ${
            searchFocused
              ? 'bg-surface shadow-card ring-1 ring-seal/20'
              : 'bg-surface/70'
          }`}>
            <Search size={16} className={`flex-shrink-0 transition-colors ${searchFocused ? 'text-seal' : 'text-ink-400'}`} />
            <input
              type="text"
              placeholder="搜索帖子、话题、用户"
              className="flex-1 bg-transparent text-[14px] text-ink-900 placeholder:text-ink-400"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </div>
        </div>

        {/* Tab 标签 */}
        <div className="flex px-5 gap-1 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const isActive = selectedTab === tab
            return (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`shrink-0 px-3 py-2 text-[13px] transition-all whitespace-nowrap relative ${
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
      <div className="flex-1 px-3 pb-6">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-16 h-16 rounded-xl bg-paper-dark flex items-center justify-center mb-4">
              <Inbox size={28} className="text-ink-400" />
            </div>
            <p className="text-ink-500 text-sm font-medium">暂无内容</p>
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
