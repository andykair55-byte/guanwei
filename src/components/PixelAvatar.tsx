/**
 * PixelAvatar — 像素风格角色头像
 * 使用 SVG 渲染像素画，image-rendering: pixelated 保证 crisp edges
 * 每个角色通过 pixelGrid 定义，支持自定义尺寸
 */

import { useMemo } from 'react'

/** 像素色板 */
const PALETTE: Record<string, string> = {
  '.': 'transparent',
  // 皮肤
  's': '#f5c6a0',  // 浅肤色
  'S': '#e8ad82',  // 深肤色（阴影）
  // 黑色（头发、眼睛）
  'k': '#1a1a1a',
  'K': '#333333',  // 深灰
  // 白色
  'w': '#ffffff',
  'W': '#f0f0f0',  // 灰白
  // 蓝色（诸葛亮冠帽）
  'b': '#4a90d9',
  'B': '#2c5f8a',  // 深蓝
  // 金色（装饰）
  'g': '#f1c40f',
  'G': '#d4a017',  // 深金
  // 红色（王朗官服）
  'r': '#c0392b',
  'R': '#962d22',  // 深红
  // 紫色
  'p': '#7b68ae',
  'P': '#5b4a8a',  // 深紫
  // 灰色（胡须）
  'h': '#d0d0d0',
  'H': '#a0a0a0',  // 深灰胡须
  // 棕色
  'n': '#8B6914',
  'N': '#6B4F12',  // 深棕
}

/** 诸葛亮像素画 (16x20) */
const ZHUGE_GRID = [
  '....kkkkkk....',
  '..kkBBBBBBkk..',
  '.kBgwwwwwwgBk.',
  '.kBwwwwwwwwBk.',
  '.kBgwwwwwwgBk.',
  '..kkBBBBBBkk..',
  '...kBBBBBBk...',
  '...kssssssk...',
  '..kssssssssk..',
  '..ksKssKsssk..',
  '..kssssssssk..',
  '...kssssssk...',
  '....kssssk....',
  '...kssssssk...',
  '..kssssssssk..',
  '.kwwwwwwwwwwk.',
  '.kWwwwwwwwwwk.',
  '.kwwwwwwwwwwk.',
  '..kwwwwwwwwk..',
  '...kkkkkkkk...',
]

/** 王朗像素画 (16x20) */
const WANGLANG_GRID = [
  '....kkkkkk....',
  '..kkPPPPPPkk..',
  '.kPggggggggPk.',
  '.kPggggggggPk.',
  '.kPggggggggPk.',
  '..kkPPPPPPkk..',
  '...kPPPPPPk...',
  '...kssssssk...',
  '..kssssssssk..',
  '..ksKssKsssk..',
  '..kssssssssk..',
  '...kssssssk...',
  '...kshhhhs k..',
  '..kshhhhhhsk..',
  '.kshhhhhhhhsk.',
  '.krrrrrrrrrrk.',
  '.kRrrrrrrrrRk.',
  '.krrrrrrrrrrk.',
  '..krrrrrrrrk..',
  '...kkkkkkkk...',
]

/** 白泽像素画 (16x20) */
const BAIZE_GRID = [
  '....kkkkkk....',
  '..kkAAAAAAAAkk',
  '.kAwwwwwwwwAk.',
  '.kAwwwwwwwwAk.',
  '.kAwwwwwwwwAk.',
  '..kkAAAAAAkk..',
  '...kAAAAAAk...',
  '...kssssssk...',
  '..kssssssssk..',
  '..ksKssKsssk..',
  '..kssssssssk..',
  '...kssssssk...',
  '....kssssk....',
  '...kssssssk...',
  '..kssssssssk..',
  '.kwwwwwwwwwwk.',
  '.kWwwwwwwwwwk.',
  '.kwwwwwwwwwwk.',
  '..kwwwwwwwwk..',
  '...kkkkkkkk...',
]

/** 豸像素画 (16x20) */
const XIEZHI_GRID = [
  '....kkkkkk....',
  '..kkCCCCCCCkk.',
  '.kCwwwwwwwwCk.',
  '.kCwwwwwwwwCk.',
  '.kCwwwwwwwwCk.',
  '..kkCCCCCCkk..',
  '...kCCCCCCk...',
  '...kssssssk...',
  '..kssssssssk..',
  '..ksKssKsssk..',
  '..kssssssssk..',
  '...kssssssk...',
  '....kssssk....',
  '...kssssssk...',
  '..kssssssssk..',
  '.kwwwwwwwwwwk.',
  '.kWwwwwwwwwwk.',
  '.kwwwwwwwwwwk.',
  '..kwwwwwwwwk..',
  '...kkkkkkkk...',
]

const CHARACTER_GRIDS: Record<string, string[]> = {
  'zhuge-liang': ZHUGE_GRID,
  'zhuge-liang-2': ZHUGE_GRID,
  'wang-lang': WANGLANG_GRID,
  'baize': BAIZE_GRID,
  'xiezhi': XIEZHI_GRID,
}

/** 默认角色色（用于 fallback） */
const DEFAULT_COLORS: Record<string, string> = {
  'zhuge-liang': '#4a90d9',
  'zhuge-liang-2': '#4a90d9',
  'wang-lang': '#c0392b',
  'baize': '#f1c40f',
  'xiezhi': '#27ae60',
  'mengzi': '#d4a017',
  'xunzi': '#7b68ae',
  'zhou-yu': '#e74c3c',
  'lu-xun': '#2c3e50',
  'hu-shi': '#2980b9',
}

interface PixelAvatarProps {
  characterId: string
  name?: string
  size?: number
  /** 是否翻转（反方角色面向左） */
  flip?: boolean
  /** 是否显示名字标签 */
  showLabel?: boolean
  /** 阵营标签（蜀/魏等） */
  factionTag?: string
  /** 额外 class */
  className?: string
}

export default function PixelAvatar({
  characterId,
  name,
  size = 120,
  flip = false,
  showLabel = false,
  factionTag,
  className = '',
}: PixelAvatarProps) {
  const grid = CHARACTER_GRIDS[characterId]

  const pixelSize = useMemo(() => {
    if (!grid) return 1
    const rows = grid.length
    const cols = grid[0]?.length || 16
    return Math.floor(size / Math.max(rows, cols))
  }, [grid, size])

  const svgWidth = grid ? grid[0].length * pixelSize : size
  const svgHeight = grid ? grid.length * pixelSize : size

  const defaultColor = DEFAULT_COLORS[characterId] || '#888'

  return (
    <div className={`pixel-avatar-wrapper ${className}`} style={{ position: 'relative' }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{
          imageRendering: 'pixelated',
          transform: flip ? 'scaleX(-1)' : undefined,
        }}
      >
        {grid ? (
          grid.map((row, y) =>
            row.split('').map((char, x) => {
              const color = PALETTE[char]
              if (!color || color === 'transparent') return null
              return (
                <rect
                  key={`${y}-${x}`}
                  x={x * pixelSize}
                  y={y * pixelSize}
                  width={pixelSize}
                  height={pixelSize}
                  fill={color}
                />
              )
            })
          )
        ) : (
          /* Fallback: 纯色方块 + 首字 */
          <>
            <rect width={svgWidth} height={svgHeight} fill={defaultColor} rx={pixelSize} />
            <text
              x={svgWidth / 2}
              y={svgHeight / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fill="white"
              fontSize={svgWidth * 0.5}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {name?.[0] || '?'}
            </text>
          </>
        )}
      </svg>

      {/* 阵营标签 */}
      {factionTag && (
        <div
          className="pixel-faction-tag"
          style={{
            position: 'absolute',
            bottom: -4,
            [flip ? 'left' : 'right']: -4,
            background: factionTag === '蜀' ? '#4a90d9' : factionTag === '魏' ? '#c0392b' : defaultColor,
            color: 'white',
            fontSize: 10,
            fontWeight: 'bold',
            padding: '2px 6px',
            borderRadius: 3,
            fontFamily: 'monospace',
            letterSpacing: 1,
          }}
        >
          {factionTag}
        </div>
      )}

      {/* 名字标签 */}
      {showLabel && name && (
        <div
          className="pixel-name-label"
          style={{
            position: 'absolute',
            bottom: -22,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 12,
            fontWeight: 'bold',
            color: '#1a1a1a',
            whiteSpace: 'nowrap',
            fontFamily: '"Noto Serif SC", serif',
          }}
        >
          {name}
        </div>
      )}
    </div>
  )
}

/** 小尺寸像素头像（用于聊天气泡等场景） */
export function PixelAvatarSmall({
  characterId,
  name,
  size = 32,
  flip = false,
  className = '',
}: {
  characterId: string
  name?: string
  size?: number
  flip?: boolean
  className?: string
}) {
  const grid = CHARACTER_GRIDS[characterId]
  const pixelSize = grid ? Math.max(1, Math.floor(size / Math.max(grid.length, grid[0]?.length || 16))) : 1
  const svgWidth = grid ? grid[0].length * pixelSize : size
  const svgHeight = grid ? grid.length * pixelSize : size
  const defaultColor = DEFAULT_COLORS[characterId] || '#888'

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className={className}
      style={{
        imageRendering: 'pixelated',
        transform: flip ? 'scaleX(-1)' : undefined,
      }}
    >
      {grid ? (
        grid.map((row, y) =>
          row.split('').map((char, x) => {
            const color = PALETTE[char]
            if (!color || color === 'transparent') return null
            return (
              <rect
                key={`${y}-${x}`}
                x={x * pixelSize}
                y={y * pixelSize}
                width={pixelSize}
                height={pixelSize}
                fill={color}
              />
            )
          })
        )
      ) : (
        <>
          <rect width={svgWidth} height={svgHeight} fill={defaultColor} rx={pixelSize} />
          <text
            x={svgWidth / 2}
            y={svgHeight / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
            fontSize={svgWidth * 0.5}
            fontFamily="monospace"
            fontWeight="bold"
          >
            {name?.[0] || '?'}
          </text>
        </>
      )}
    </svg>
  )
}
