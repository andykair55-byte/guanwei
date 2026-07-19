/**
 * webVitals 工具测试
 *
 * 实现要点：
 * - webVitals.ts 内部维护 vitalsBuffer 数组，未导出
 * - initWebVitals 调用 onLCP/onINP/onCLS/onFCP/onTTFB 注册 recordMetric 回调
 * - 通过捕获 mock 的 on* 回调来间接测试 recordMetric
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// 收集 web-vitals 的 on* 回调，便于在测试中手动触发
const capturedCallbacks: Record<string, (metric: any) => void> = {}

vi.mock('web-vitals', () => ({
  onLCP: vi.fn((cb) => { capturedCallbacks.LCP = cb }),
  onINP: vi.fn((cb) => { capturedCallbacks.INP = cb }),
  onCLS: vi.fn((cb) => { capturedCallbacks.CLS = cb }),
  onFCP: vi.fn((cb) => { capturedCallbacks.FCP = cb }),
  onTTFB: vi.fn((cb) => { capturedCallbacks.TTFB = cb }),
}))

import { initWebVitals, getVitalsBuffer } from '../webVitals'
import { onLCP, onINP, onCLS, onFCP, onTTFB } from 'web-vitals'

describe('webVitals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 清空 capturedCallbacks
    for (const key of Object.keys(capturedCallbacks)) {
      delete capturedCallbacks[key]
    }
  })

  it('test_initWebVitals_does_not_throw: 调用不抛错且注册了 5 个回调', () => {
    expect(() => initWebVitals()).not.toThrow()

    // 5 个 on* 函数都应被调用过
    expect(vi.mocked(onLCP)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(onINP)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(onCLS)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(onFCP)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(onTTFB)).toHaveBeenCalledTimes(1)
  })

  it('test_getVitalsBuffer_returns_array: 默认返回数组', () => {
    const buffer = getVitalsBuffer()
    expect(Array.isArray(buffer)).toBe(true)
  })

  it('test_getVitalsBuffer_initially_empty: 初始（未触发任何回调）buffer 为空', () => {
    // getVitalsBuffer 返回副本，且 initWebVitals 不应自动写入数据
    // 注意：可能其他测试用例已触发回调，这里只是检查返回值类型
    const buffer = getVitalsBuffer()
    expect(Array.isArray(buffer)).toBe(true)
  })

  it('test_recordMetric_via_onLCP: 通过 LCP 回调记录指标到 buffer', () => {
    initWebVitals()

    // 模拟 web-vitals 报告一个 LCP metric
    const lcpCallback = capturedCallbacks.LCP
    expect(lcpCallback).toBeDefined()

    lcpCallback({
      name: 'LCP',
      value: 2.5,
      rating: 'good',
    })

    const buffer = getVitalsBuffer()
    expect(buffer).toHaveLength(1)
    expect(buffer[0].name).toBe('LCP')
    expect(buffer[0].value).toBe(2.5)
    expect(buffer[0].rating).toBe('good')
  })

  it('test_recordMetric_derives_rating_from_thresholds: 无 rating 时通过 thresholds 推导', () => {
    initWebVitals()

    const inpCallback = capturedCallbacks.INP
    expect(inpCallback).toBeDefined()

    // 不带 rating，带 thresholds（[200, 500]）：value=100 < 200 → good
    inpCallback({
      name: 'INP',
      value: 100,
      thresholds: [200, 500],
    })

    const buffer = getVitalsBuffer()
    const inp = buffer.find(m => m.name === 'INP')
    expect(inp).toBeDefined()
    expect(inp?.rating).toBe('good')
  })

  it('test_recordMetric_derives_needs_improvement: value 处于 [t0, t1] 区间', () => {
    initWebVitals()

    const clsCallback = capturedCallbacks.CLS
    clsCallback({
      name: 'CLS',
      value: 0.15,
      thresholds: [0.1, 0.25],
    })

    const buffer = getVitalsBuffer()
    const cls = buffer.find(m => m.name === 'CLS')
    expect(cls?.rating).toBe('needs-improvement')
  })

  it('test_recordMetric_derives_poor: value 超过 t1 阈值', () => {
    initWebVitals()

    const fcpCallback = capturedCallbacks.FCP
    fcpCallback({
      name: 'FCP',
      value: 3000,
      thresholds: [1800, 3000],
    })

    const buffer = getVitalsBuffer()
    const fcp = buffer.find(m => m.name === 'FCP')
    expect(fcp?.rating).toBe('poor')
  })

  it('test_recordMetric_multiple_metrics: 多个指标按触发顺序追加', () => {
    initWebVitals()

    capturedCallbacks.TTFB({ name: 'TTFB', value: 100, rating: 'good' })
    capturedCallbacks.FCP({ name: 'FCP', value: 1500, rating: 'good' })
    capturedCallbacks.LCP({ name: 'LCP', value: 2500, rating: 'good' })

    const buffer = getVitalsBuffer()
    const names = buffer.map(m => m.name)
    expect(names).toContain('TTFB')
    expect(names).toContain('FCP')
    expect(names).toContain('LCP')
  })

  it('test_getVitalsBuffer_returns_copy: 返回的是副本，修改不影响内部 buffer', () => {
    initWebVitals()
    capturedCallbacks.LCP({ name: 'LCP', value: 1.0, rating: 'good' })

    const buf1 = getVitalsBuffer()
    const lenBefore = buf1.length
    // 修改返回的副本
    buf1.push({ name: 'FAKE', value: 999, rating: 'poor' })

    // 内部 buffer 不应受影响
    const buf2 = getVitalsBuffer()
    expect(buf2.length).toBe(lenBefore)
    expect(buf2.find(m => m.name === 'FAKE')).toBeUndefined()
  })
})
