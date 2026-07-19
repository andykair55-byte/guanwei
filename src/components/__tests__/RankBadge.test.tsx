/**
 * RankBadge 组件测试
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import RankBadge from '../RankBadge'
import { RANK_CONFIG } from '../../config/ranks'

describe('RankBadge', () => {
  it('test_renders_correct_rank_name: 根据传入 rank 显示正确段位名', () => {
    const { rerender } = render(<RankBadge rank="鉴瓜达人" />)

    expect(screen.getByText('鉴瓜达人')).toBeInTheDocument()

    rerender(<RankBadge rank="见微先知" />)
    expect(screen.getByText('见微先知')).toBeInTheDocument()

    rerender(<RankBadge rank="瓜田新手" />)
    expect(screen.getByText('瓜田新手')).toBeInTheDocument()
  })

  it('test_renders_correct_color: 段位徽章使用 seal 主题色', () => {
    render(<RankBadge rank="鉴瓜达人" />)

    // RankBadge 结构：<span class="outer"><svg/><span>鉴瓜达人</span></span>
    // getByText 返回内层 span，需要 parentElement 获取外层带 class 的 span
    const innerSpan = screen.getByText('鉴瓜达人')
    const badge = innerSpan.parentElement
    expect(badge).not.toBeNull()
    expect(badge?.className).toContain('bg-seal/10')
    expect(badge?.className).toContain('text-seal')
    expect(badge?.className).toContain('rounded-full')
  })

  it('test_level_0_default: rank=吃瓜群众 显示"吃瓜群众"', () => {
    render(<RankBadge rank="吃瓜群众" />)

    expect(screen.getByText('吃瓜群众')).toBeInTheDocument()

    // 验证 RANK_CONFIG 中吃瓜群众的配置
    expect(RANK_CONFIG['吃瓜群众'].level).toBe(1)
    expect(RANK_CONFIG['吃瓜群众'].icon).toBe('Sprout')
  })

  it('test_all_ranks_render_correctly: 所有段位都能正常渲染', () => {
    const ranks = Object.keys(RANK_CONFIG) as Array<keyof typeof RANK_CONFIG>

    for (const rank of ranks) {
      const { unmount } = render(<RankBadge rank={rank} />)
      expect(screen.getByText(rank)).toBeInTheDocument()
      unmount()
    }
  })

  it('test_size_variants: 不同尺寸渲染不同样式', () => {
    const { rerender } = render(<RankBadge rank="鉴瓜达人" size="sm" />)
    let badge = screen.getByText('鉴瓜达人').parentElement
    expect(badge?.className).toContain('text-xs')

    rerender(<RankBadge rank="鉴瓜达人" size="md" />)
    badge = screen.getByText('鉴瓜达人').parentElement
    expect(badge?.className).toContain('text-sm')

    rerender(<RankBadge rank="鉴瓜达人" size="lg" />)
    badge = screen.getByText('鉴瓜达人').parentElement
    expect(badge?.className).toContain('text-base')
  })
})
