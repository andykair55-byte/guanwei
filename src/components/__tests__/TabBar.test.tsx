/**
 * TabBar 组件测试
 * 用 MemoryRouter 包裹组件
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import TabBar from '../TabBar'

function renderWithRouter(initialRoute: string = '/melon') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="*" element={<TabBar />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('TabBar', () => {
  it('test_renders_5_tabs: 渲染 5 个 tab', () => {
    renderWithRouter('/melon')

    // TabBar 有 5 个 tab：瓜田、社区、+、求证、我的
    expect(screen.getByText('瓜田')).toBeInTheDocument()
    expect(screen.getByText('社区')).toBeInTheDocument()
    expect(screen.getByText('求证')).toBeInTheDocument()
    expect(screen.getByText('我的')).toBeInTheDocument()

    // 中间的 + 按钮没有文字标签，但有按钮元素
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(5)
  })

  it('test_active_tab_highlighted: 当前 tab 高亮', () => {
    renderWithRouter('/community')

    // 社区 tab 应该有 active 样式（text-seal）
    const communitySpan = screen.getByText('社区')
    expect(communitySpan.className).toContain('text-seal')
    expect(communitySpan.className).toContain('font-semibold')

    // 瓜田 tab 应该是 inactive 样式（text-ink-400）
    const melonSpan = screen.getByText('瓜田')
    expect(melonSpan.className).toContain('text-ink-400')
  })

  it('test_click_tab_navigates: 点击 tab 触发路由跳转', async () => {
    const user = userEvent.setup()
    renderWithRouter('/melon')

    // 初始：瓜田高亮
    expect(screen.getByText('瓜田').className).toContain('text-seal')

    // 点击社区 tab
    await user.click(screen.getByText('社区'))

    // 跳转后：社区高亮，瓜田不高亮
    expect(screen.getByText('社区').className).toContain('text-seal')
    expect(screen.getByText('瓜田').className).toContain('text-ink-400')
  })

  it('test_default_active_tab: 默认激活瓜田 tab', () => {
    renderWithRouter('/melon')

    const melonSpan = screen.getByText('瓜田')
    expect(melonSpan.className).toContain('text-seal')
    expect(melonSpan.className).toContain('font-semibold')
  })

  it('test_center_button_exists: 中间+按钮存在且可点击', async () => {
    const user = userEvent.setup()
    renderWithRouter('/melon')

    const buttons = screen.getAllByRole('button')
    const centerButton = buttons[2] // 瓜田(0)、社区(1)、+(2)、求证(3)、我的(4)

    await user.click(centerButton)

    // 点击后不崩溃，瓜田仍 active（/publish 不匹配任何非 center tab）
    expect(screen.getByText('瓜田').className).toContain('text-seal')
  })
})
