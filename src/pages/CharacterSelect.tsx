// src/pages/CharacterSelect.tsx
// 角色选择页：选择对手角色进入人机对战

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, Sparkles, User, Plus } from 'lucide-react'
import { ALL_CHARACTERS, type AICharacter } from '../services/characters'
import { getAllThemeCharacters } from '../services/themePackService'
import type { ThemeCharacter } from '../types/themePack'
import { usePlatform } from '../hooks/usePlatform'

/** 自创蛐蛐类型（与 CricketForge 一致） */
interface ForgeCharacter {
  id: string
  name: string
  prompt: string
  avatar: string  // tailwind 渐变 class
  createdAt: number
}

const FORGE_STORAGE_KEY = 'cricket-forges'

/** 从 localStorage 读取自创角色 */
function getForgeCharacters(): ForgeCharacter[] {
  try {
    return JSON.parse(localStorage.getItem(FORGE_STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

/** Tab 分类 */
type TabKey = 'builtin' | 'celebrity' | 'custom'

export default function CharacterSelect() {
  const navigate = useNavigate()
  const { isWeb } = usePlatform()
  const [activeTab, setActiveTab] = useState<TabKey>('celebrity')
  const [searchQuery, setSearchQuery] = useState('')
  const [forgeList, setForgeList] = useState<ForgeCharacter[]>([])

  useEffect(() => {
    setForgeList(getForgeCharacters())
  }, [])

  // 名人角色
  const themeChars = useMemo(() => getAllThemeCharacters(), [])

  // 搜索过滤
  const filteredBuiltin = ALL_CHARACTERS.filter(c =>
    c.name.includes(searchQuery) || c.title.includes(searchQuery) || c.personality.includes(searchQuery),
  )
  const filteredCelebrity = themeChars.filter(c =>
    c.name.includes(searchQuery) || c.era.includes(searchQuery) || c.stanceHint.includes(searchQuery),
  )
  const filteredCustom = forgeList.filter(c =>
    c.name.includes(searchQuery) || c.prompt.includes(searchQuery),
  )

  // 选择角色 → 跳转人机对战
  const handleSelectBuiltin = (char: AICharacter) => {
    navigate(`/entertainment/arena/human-battle?negate=${char.id}`)
  }

  const handleSelectCelebrity = (char: ThemeCharacter) => {
    navigate(`/entertainment/arena/human-battle?negate=${char.id}&themeChar=1`)
  }

  const handleSelectCustom = (char: ForgeCharacter) => {
    navigate(`/entertainment/arena/human-battle?forgeId=${char.id}`)
  }

  // 角色卡片颜色（从 visual 提取）
  const getBuiltinColors = (char: AICharacter) => {
    return {
      from: char.visual.gradientFrom,
      to: char.visual.gradientTo,
      text: char.visual.textColor,
    }
  }

  return (
    <div className="flex flex-col min-h-full bg-paper-texture">
      {/* Header */}
      <div className="sticky top-0 z-20 glass border-b border-line/50">
        <div className={`flex items-center h-14 px-4 ${isWeb ? '' : 'max-w-[480px] mx-auto'}`}>
          <button
            onClick={() => navigate('/entertainment/arena')}
            className="flex items-center gap-1 text-ink-700 text-sm active:opacity-60"
          >
            <ArrowLeft size={18} />
            <span>返回</span>
          </button>
          <div className="flex items-center gap-2 ml-3">
            <div className="w-8 h-8 rounded-lg bg-seal/10 flex items-center justify-center">
              <User size={16} className="text-seal" />
            </div>
            <div>
              <h1 className="text-[16px] font-bold text-ink-900 leading-tight">选择对手</h1>
              <p className="text-[10px] text-ink-400">和历史人物、AI辩手或自创角色对话</p>
            </div>
          </div>
        </div>
      </div>

      <div className={`flex-1 w-full px-4 py-4 ${isWeb ? 'max-w-4xl mx-auto' : 'max-w-[480px] mx-auto'}`}>
        {/* 搜索框 */}
        <div className="mb-4">
          <div className="flex items-center gap-2 px-3 py-2.5 bg-surface rounded-xl border border-line/30">
            <Search size={16} className="text-ink-400 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索角色名、时代、人设..."
              className="flex-1 bg-transparent text-[13px] text-ink-800 placeholder:text-ink-faint focus:outline-none"
            />
          </div>
        </div>

        {/* Tab 切换 */}
        <div className="flex items-center gap-2 mb-4">
          {[
            { key: 'celebrity', label: '历史名人', count: themeChars.length },
            { key: 'builtin', label: 'AI辩手', count: ALL_CHARACTERS.length },
            { key: 'custom', label: '我的角色', count: forgeList.length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabKey)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors flex items-center gap-1 ${
                activeTab === tab.key
                  ? 'bg-ink-900 text-white'
                  : 'bg-paper-dark text-ink-500 hover:text-ink-700'
              }`}
            >
              {tab.label}
              <span className={`text-[10px] ${activeTab === tab.key ? 'text-white/60' : 'text-ink-faint'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* 角色列表 */}
        {activeTab === 'builtin' && (
          <div className={`grid gap-3 ${isWeb ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {filteredBuiltin.map(char => {
              const colors = getBuiltinColors(char)
              return (
                <button
                  key={char.id}
                  onClick={() => handleSelectBuiltin(char)}
                  className="flex items-start gap-3 p-4 bg-surface rounded-xl border border-line/30 hover:border-seal/30 hover:shadow-card transition-all text-left active:scale-[0.99]"
                >
                  {/* 头像 */}
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors.from} ${colors.to} flex items-center justify-center text-white font-bold text-[16px] flex-shrink-0`}
                  >
                    {char.name[0]}
                  </div>
                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[14px] font-bold text-ink-900">{char.name}</span>
                      <span className={`text-[10px] ${colors.text}`}>{char.title}</span>
                    </div>
                    <p className="text-[12px] text-ink-500 leading-relaxed line-clamp-2">{char.personality}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-ink-faint">
                      <span>胜率 {char.stats.winRate}</span>
                      <span>{char.stats.favoriteTactic}</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {activeTab === 'celebrity' && (
          <div className={`grid gap-3 ${isWeb ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {filteredCelebrity.map(char => (
              <button
                key={char.id}
                onClick={() => handleSelectCelebrity(char)}
                className="flex items-start gap-3 p-4 bg-surface rounded-xl border border-line/30 hover:border-seal/30 hover:shadow-card transition-all text-left active:scale-[0.99]"
              >
                {/* 头像 */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white font-bold text-[16px] flex-shrink-0">
                  {char.name[0]}
                </div>
                {/* 信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[14px] font-bold text-ink-900">{char.name}</span>
                    <span className="text-[10px] text-amber-600 font-medium">{char.era}</span>
                  </div>
                  <p className="text-[12px] text-ink-500 leading-relaxed line-clamp-2">{char.stanceHint}</p>
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    {char.tags.map(tag => (
                      <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-paper-dark text-ink-400">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {activeTab === 'custom' && (
          <>
            {/* 创建入口 */}
            <button
              onClick={() => navigate('/entertainment/arena/forge')}
              className="w-full mb-3 flex items-center justify-center gap-2 p-4 bg-surface rounded-xl border-2 border-dashed border-line/40 hover:border-seal/30 text-ink-400 hover:text-seal transition-all"
            >
              <Plus size={18} />
              <span className="text-[13px] font-medium">创建新角色</span>
            </button>

            {filteredCustom.length === 0 ? (
              <div className="text-center py-12 bg-surface rounded-2xl border border-line/30">
                <Sparkles size={36} className="mx-auto text-ink-faint mb-3" />
                <p className="text-[14px] text-ink-400 mb-1">还没有自创角色</p>
                <p className="text-[12px] text-ink-faint">去角色工坊创建一个属于你的 AI 对手</p>
              </div>
            ) : (
              <div className={`grid gap-3 ${isWeb ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {filteredCustom.map(char => (
                  <button
                    key={char.id}
                    onClick={() => handleSelectCustom(char)}
                    className="flex items-start gap-3 p-4 bg-surface rounded-xl border border-line/30 hover:border-seal/30 hover:shadow-card transition-all text-left active:scale-[0.99]"
                  >
                    {/* 头像 */}
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${char.avatar} flex items-center justify-center text-white font-bold text-[16px] flex-shrink-0`}>
                      {char.name[0]}
                    </div>
                    {/* 信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[14px] font-bold text-ink-900">{char.name}</span>
                        <span className="text-[10px] text-violet-500 font-medium">自创</span>
                      </div>
                      <p className="text-[12px] text-ink-500 leading-relaxed line-clamp-2">{char.prompt.slice(0, 60)}...</p>
                      <p className="text-[10px] text-ink-faint mt-1.5">
                        创建于 {new Date(char.createdAt).toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
