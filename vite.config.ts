import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // 仅在 build 时启用，且通过 ANALYZE 环境变量控制
    process.env.ANALYZE === 'true' && visualizer({
      open: true,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    }),
  ].filter(Boolean),
  build: {
    chunkSizeWarningLimit: 500, // 单 chunk 超过 500KB 警告
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          // 先匹配更具体的包，避免被 react-vendor 误吞
          if (id.includes('lucide-react')) return 'ui-vendor'
          if (id.includes('react-markdown') || id.includes('remark-gfm')) return 'markdown-vendor'
          if (id.includes('zustand')) return 'state-vendor'
          if (/[\\/]node_modules[\\/](react|react-dom|react-router-dom)[\\/]/.test(id)) return 'react-vendor'
        },
      },
    },
  },
})
