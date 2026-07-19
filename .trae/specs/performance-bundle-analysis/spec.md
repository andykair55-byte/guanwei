# spec-18 性能监控 + Bundle 分析

## 背景
前端目前无性能监控和 bundle 体积分析，
无法量化页面加载性能和包体积优化效果。
需要接入 Core Web Vitals 监控 + bundle 分析工具。

## 现状
- ✅ Vite 8 + React 19（性能基线良好）
- ✅ 代码分割已用 lazy + Suspense（部分页面）
- ❌ 无 Core Web Vitals 监控
- ❌ 无 bundle 体积分析
- ❌ 无构建产物报告

## 任务范围

### 任务 1：Core Web Vitals 监控
- 安装 `web-vitals` 包（轻量，<1KB）
- 新建 `src/utils/webVitals.ts`：
  ```typescript
  import { onLCP, onFID, onCLS, onFCP, onTTFB } from 'web-vitals'
  
  interface VitalMetric {
    name: string
    value: number
    rating: 'good' | 'needs-improvement' | 'poor'
  }
  
  const vitalsBuffer: VitalMetric[] = []
  
  function recordMetric(metric: any) {
    const rating = metric.rating || 
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
    onFID(recordMetric)
    onCLS(recordMetric)
    onFCP(recordMetric)
    onTTFB(recordMetric)
  }
  
  export function getVitalsBuffer() {
    return [...vitalsBuffer]
  }
  ```
- 在 `src/main.tsx` 调用 `initWebVitals()`
- 不做实际上报（阶段 2 接入后端监控）

### 任务 2：Bundle 分析
- 安装 `rollup-plugin-visualizer`（devDependency）
- 修改 `vite.config.ts`：
  ```typescript
  import { visualizer } from 'rollup-plugin-visualizer'
  
  export default defineConfig({
    plugins: [
      react(),
      // 仅在 build 时启用，且通过环境变量控制
      process.env.ANALYZE === 'true' && visualizer({
        open: true,
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
      }),
    ].filter(Boolean),
  })
  ```
- 在 `package.json` 加脚本：
  ```json
  "build:analyze": "ANALYZE=true vite build"
  ```
- 先读现有 `vite.config.ts` 确认现有插件配置，不要覆盖

### 任务 3：代码分割优化
- 检查 `src/router/routes.ts`，确认所有页面级组件是否已用 `lazy()` 懒加载
- 若有未懒加载的页面，改为 lazy：
  ```typescript
  import { lazy } from 'react'
  const MelonFieldPage = lazy(() => import('../pages/MelonFieldPage'))
  ```
- 确认 `src/entry/WebApp.tsx` 和 `MobileApp.tsx` 用 Suspense 包裹 Routes
- 若已有 Suspense，确认 fallback 是否合理（骨架屏 > 纯文字"加载中"）
- 不强制改所有页面，只补全遗漏的

### 任务 4：图片懒加载
- 检查 `src/components/` 下的图片组件（如 PostDetailModal、HotDetailModal、CommentSection）
- 给 `<img>` 标签加 `loading="lazy"` 属性
- 不改用户头像（首屏可见，不需要懒加载）
- 只改内容区图片（可能很多张的列表场景）

### 任务 5：构建产物报告
- 修改 `vite.config.ts` 的 build 配置，加 chunkSizeWarningLimit：
  ```typescript
  build: {
    chunkSizeWarningLimit: 500, // 单 chunk 超过 500KB 警告
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'state-vendor': ['zustand'],
          'ui-vendor': ['lucide-react'],
          'markdown-vendor': ['react-markdown', 'remark-gfm'],
        },
      },
    },
  },
  ```
- 先读现有 vite.config.ts 的 build 配置，合并而非覆盖

## 不做的事
- 不接入 Sentry / Datadog 等第三方监控（阶段 2）
- 不做 Service Worker / PWA
- 不做图片优化（压缩/WebP 转换）
- 不做 CDN 配置
- 不做 SSR / SSG
- 不改后端代码

## 验收
- `npm run build:analyze` 生成 `dist/stats.html` 可视化报告
- `npm run build` 后能看到 chunk 大小分布
- Core Web Vitals 在开发环境控制台打印（LCP/FID/CLS/FCP/TTFB）
- 主要页面已懒加载（bundle 分割合理）
- `npm run build` 通过
- `npm run test` 全部通过
- vendor chunk 分离成功（react-vendor / state-vendor / ui-vendor / markdown-vendor）
