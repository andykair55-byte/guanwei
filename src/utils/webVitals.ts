import { onLCP, onINP, onCLS, onFCP, onTTFB } from 'web-vitals'

interface VitalMetric {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
}

const vitalsBuffer: VitalMetric[] = []

function recordMetric(metric: any) {
  const rating: VitalMetric['rating'] = metric.rating ||
    (metric.value < metric.thresholds?.[0] ? 'good' :
     metric.value < metric.thresholds?.[1] ? 'needs-improvement' : 'poor')

  vitalsBuffer.push({
    name: metric.name,
    value: metric.value,
    rating,
  })

  // 开发环境打印到控制台
  if (import.meta.env.DEV) {
    console.log(`[Web Vitals] ${metric.name}: ${metric.value.toFixed(2)} (${rating})`)
  }

  // 生产环境可上报（阶段 2 接入真实后端）
  if (import.meta.env.PROD) {
    // TODO: 上报到后端 /api/v1/metrics/web-vitals
    // 当前只缓存，不做实际上报
  }
}

export function initWebVitals() {
  onLCP(recordMetric)
  onINP(recordMetric)
  onCLS(recordMetric)
  onFCP(recordMetric)
  onTTFB(recordMetric)
}

export function getVitalsBuffer() {
  return [...vitalsBuffer]
}
