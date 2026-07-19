/**
 * ErrorBoundary 组件测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import ErrorBoundary from '../ErrorBoundary'

// 会抛错的子组件
function ThrowOnError({ message = '测试错误' }: { message?: string }) {
  throw new Error(message)
}

function NormalChild() {
  return <div data-testid="normal-child">正常内容</div>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('test_renders_children_no_error: 无错误时渲染 children', () => {
    render(
      <ErrorBoundary>
        <NormalChild />
      </ErrorBoundary>
    )

    expect(screen.getByTestId('normal-child')).toBeInTheDocument()
    expect(screen.getByText('正常内容')).toBeInTheDocument()
  })

  it('test_renders_error_ui_on_error: 子组件抛错时渲染错误 UI', () => {
    render(
      <ErrorBoundary>
        <ThrowOnError message="渲染爆炸了" />
      </ErrorBoundary>
    )

    expect(screen.getByText('出了点小问题')).toBeInTheDocument()
    expect(screen.getByText('页面渲染时遇到了错误，别担心，试试刷新')).toBeInTheDocument()
    expect(screen.getByText('刷新页面')).toBeInTheDocument()
    expect(screen.getByText('返回首页')).toBeInTheDocument()
  })

  it('test_refresh_button_calls_reload: 点击刷新调用 window.location.reload', async () => {
    const reloadMock = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...window.location,
        reload: reloadMock,
        href: '',
      },
    })

    const user = userEvent.setup()

    render(
      <ErrorBoundary>
        <ThrowOnError />
      </ErrorBoundary>
    )

    const refreshButton = screen.getByText('刷新页面')
    await user.click(refreshButton)

    expect(reloadMock).toHaveBeenCalledTimes(1)
  })

  it('test_toggle_details: 点击查看错误详情展开/收起', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <ErrorBoundary>
        <ThrowOnError message="自定义错误消息" />
      </ErrorBoundary>
    )

    // 初始状态：错误详情未展开
    expect(screen.getByText('查看错误详情')).toBeInTheDocument()
    expect(screen.queryByText('收起错误详情')).not.toBeInTheDocument()

    // 点击展开
    await user.click(screen.getByText('查看错误详情'))

    // 展开后显示收起按钮
    expect(screen.getByText('收起错误详情')).toBeInTheDocument()

    // 错误详情在 <pre> 元素中，检查其内容包含错误消息
    const preElement = container.querySelector('pre')
    expect(preElement).not.toBeNull()
    expect(preElement?.textContent).toContain('自定义错误消息')

    // 点击收起
    await user.click(screen.getByText('收起错误详情'))

    expect(screen.getByText('查看错误详情')).toBeInTheDocument()
    expect(screen.queryByText('收起错误详情')).not.toBeInTheDocument()
  })
})
