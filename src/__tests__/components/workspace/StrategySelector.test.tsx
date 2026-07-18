// src/__tests__/components/workspace/StrategySelector.test.tsx
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import StrategySelector from '../../../components/workspace/StrategySelector'

describe('StrategySelector', () => {
  it('默认显示 DAG', () => {
    render(<StrategySelector value="dag" onChange={vi.fn()} />)
    expect(screen.getByText('DAG 并行')).toBeInTheDocument()
  })

  it('点击应展开选项', () => {
    render(<StrategySelector value="dag" onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('串行管线')).toBeInTheDocument()
  })

  it('选择串行应调用 onChange', () => {
    const onChange = vi.fn()
    render(<StrategySelector value="dag" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('串行管线'))
    expect(onChange).toHaveBeenCalledWith('serial')
  })

  it('dynamic 和 custom 应被禁用', () => {
    render(<StrategySelector value="dag" onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('动态调度').closest('button')).toBeDisabled()
    expect(screen.getByText('自定义').closest('button')).toBeDisabled()
  })
})
