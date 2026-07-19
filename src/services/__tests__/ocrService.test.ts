/**
 * ocrService 测试
 *
 * ocrService 内部通过 import('tesseract.js') 动态加载，
 * 我们 mock 整个 tesseract.js 模块，验证 recognizeText / terminateOcr 的行为。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// mock tesseract.js：createWorker 返回带 recognize / setLogger / terminate 的对象
const mockRecognize = vi.fn()
const mockSetLogger = vi.fn()
const mockTerminate = vi.fn()

vi.mock('tesseract.js', () => ({
  createWorker: vi.fn(async () => ({
    recognize: mockRecognize,
    setLogger: mockSetLogger,
    terminate: mockTerminate,
  })),
}))

import { recognizeText, terminateOcr } from '../ocrService'

describe('ocrService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(async () => {
    // 每个测试后清理缓存的 worker
    try {
      await terminateOcr()
    } catch {
      // ignore
    }
  })

  it('test_recognizeText_returns_text_and_confidence: 正常识别返回 text + confidence', async () => {
    mockRecognize.mockResolvedValue({
      data: { text: '  hello world  ', confidence: 95.5 },
    })

    const result = await recognizeText('data:image/png;base64,xxx')
    expect(result.text).toBe('hello world')
    expect(result.confidence).toBe(95.5)
    expect(mockRecognize).toHaveBeenCalledTimes(1)
    expect(mockRecognize).toHaveBeenCalledWith('data:image/png;base64,xxx')
  })

  it('test_recognizeText_default_confidence_zero: confidence 缺失时回退为 0', async () => {
    mockRecognize.mockResolvedValue({
      data: { text: 'some text' },
    })

    const result = await recognizeText('fake-image-source')
    expect(result.text).toBe('some text')
    expect(result.confidence).toBe(0)
  })

  it('test_recognizeText_empty_text: text 缺失返回空字符串', async () => {
    mockRecognize.mockResolvedValue({
      data: {},
    })

    const result = await recognizeText('source')
    expect(result.text).toBe('')
    expect(result.confidence).toBe(0)
  })

  it('test_recognizeText_with_progress_callback: 传入 onProgress 时调用 setLogger', async () => {
    mockRecognize.mockResolvedValue({
      data: { text: 'text', confidence: 90 },
    })

    const onProgress = vi.fn()
    await recognizeText('source', onProgress)

    // onProgress 传入时应该调用 worker.setLogger
    expect(mockSetLogger).toHaveBeenCalledTimes(1)
    expect(onProgress).not.toHaveBeenCalled() // 没有触发 recognizing text 事件
  })

  it('test_recognizeText_no_progress_callback: 不传 onProgress 时不调用 setLogger', async () => {
    mockRecognize.mockResolvedValue({
      data: { text: 'text', confidence: 90 },
    })

    await recognizeText('source')

    expect(mockSetLogger).not.toHaveBeenCalled()
  })

  it('test_recognizeText_progress_callback_triggered: onProgress 在 recognizing text 时被调用', async () => {
    mockRecognize.mockResolvedValue({
      data: { text: 'text', confidence: 90 },
    })

    const onProgress = vi.fn()
    await recognizeText('source', onProgress)

    // 模拟 worker 通过 setLogger 回调报告进度
    // setLogger 的参数是一个回调函数，调用它以模拟 web-vitals 报告
    expect(mockSetLogger).toHaveBeenCalledTimes(1)
    const loggerFn = mockSetLogger.mock.calls[0][0]
    // 模拟进度 50%
    loggerFn({ status: 'recognizing text', progress: 0.5 })
    expect(onProgress).toHaveBeenCalledWith(50)

    // 非 recognizing text 状态不触发
    loggerFn({ status: 'loading', progress: 0.2 })
    expect(onProgress).toHaveBeenCalledTimes(1)
  })

  it('test_terminateOcr_terminates_worker: 终止 worker 并清理缓存', async () => {
    // 先触发一次创建 worker
    mockRecognize.mockResolvedValue({ data: { text: 'x', confidence: 1 } })
    await recognizeText('src')

    await terminateOcr()
    expect(mockTerminate).toHaveBeenCalledTimes(1)
  })

  it('test_terminateOcr_no_worker_safe: 未创建 worker 时不抛错', async () => {
    // 上面 afterEach 已调用 terminateOcr 清理过，再调用应该安全
    await expect(terminateOcr()).resolves.not.toThrow()
    expect(mockTerminate).not.toHaveBeenCalled()
  })

  it('test_worker_reused_across_calls: 多次 recognize 复用同一个 worker', async () => {
    mockRecognize.mockResolvedValue({ data: { text: 'a', confidence: 1 } })

    await recognizeText('src1')
    await recognizeText('src2')
    await recognizeText('src3')

    // createWorker 只应被调用一次（worker 复用）
    const { createWorker } = await import('tesseract.js')
    expect(vi.mocked(createWorker)).toHaveBeenCalledTimes(1)
    // recognize 调用 3 次
    expect(mockRecognize).toHaveBeenCalledTimes(3)
  })
})
