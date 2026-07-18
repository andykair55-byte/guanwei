// Vitest setup file
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import React from 'react'

// 让 .tsx 测试无需显式 import React 即可使用 JSX（automatic runtime 在 vitest 下未自动生效）
;(globalThis as any).React = React

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.clearAllMocks()
})
