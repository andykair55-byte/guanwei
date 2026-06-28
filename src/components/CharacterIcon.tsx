/**
 * CharacterIcon — 4个神兽角色的简约线条SVG图标
 * 24x24 viewBox, 2px stroke, 无填充, 圆头端点
 * 颜色由父级 currentColor 控制
 */

interface CharacterIconProps {
  characterId: string
  size?: number
  className?: string
}

export default function CharacterIcon({ characterId, size = 24, className }: CharacterIconProps) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
  }

  switch (characterId) {
    case 'baize':
      // 白泽 — 龙角：一对分叉鹿角
      return (
        <svg {...props}>
          {/* 左角 */}
          <path d="M8 18 L8 10 L5 6" />
          <path d="M8 13 L5.5 10" />
          {/* 右角 */}
          <path d="M16 18 L16 10 L19 6" />
          <path d="M16 13 L18.5 10" />
          {/* 底座连线 */}
          <path d="M6 18 L18 18" />
        </svg>
      )

    case 'xiezhi':
      // 獬豸 — 独角：正面独角轮廓 + 双眼
      return (
        <svg {...props}>
          {/* 独角 */}
          <path d="M12 3 L12 10" />
          <path d="M10 7 L12 3 L14 7" />
          {/* 头部轮廓 */}
          <path d="M7 12 Q7 10 12 10 Q17 10 17 12" />
          <path d="M7 12 L7 17 Q7 20 12 20 Q17 20 17 17 L17 12" />
          {/* 双眼 */}
          <circle cx="10" cy="15" r="1" fill="currentColor" stroke="none" />
          <circle cx="14" cy="15" r="1" fill="currentColor" stroke="none" />
        </svg>
      )

    case 'zhulong':
      // 烛龙 — 竖瞳：蛇眼 + 竖瞳
      return (
        <svg {...props}>
          {/* 眼形轮廓 */}
          <path d="M2 12 Q7 5 12 5 Q17 5 22 12 Q17 19 12 19 Q7 19 2 12" />
          {/* 虹膜 */}
          <circle cx="12" cy="12" r="4" />
          {/* 竖瞳 */}
          <path d="M12 8.5 L12 15.5" strokeWidth={2.2} />
        </svg>
      )

    case 'qiongqi':
      // 穷奇 — 翼翅：展开的翅膀
      return (
        <svg {...props}>
          {/* 左翼 */}
          <path d="M12 14 L4 6 L2 8" />
          <path d="M12 14 L5 10 L3 13" />
          <path d="M12 14 L7 14" />
          {/* 右翼 */}
          <path d="M12 14 L20 6 L22 8" />
          <path d="M12 14 L19 10 L21 13" />
          <path d="M12 14 L17 14" />
          {/* 身体 */}
          <path d="M12 14 L12 20" />
        </svg>
      )

    default:
      // 默认：问号圆圈
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9.5 Q9.5 7 12 7 Q14.5 7 14.5 9.5 Q14.5 11 12 12 L12 14" />
          <circle cx="12" cy="17" r="0.8" fill="currentColor" stroke="none" />
        </svg>
      )
  }
}
