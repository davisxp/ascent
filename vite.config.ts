import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Deployment base. GitHub Pages serves the app from /<repo>/, so the deploy
// workflow sets BASE_PATH=/ascent/. Local dev and preview keep "/".
const base = process.env.BASE_PATH ?? '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        navigateFallback: 'index.html',
      },
      includeAssets: ['favicon.svg', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        id: '.',
        name: 'ASCENT',
        short_name: 'ASCENT',
        description: 'Offline-first calisthenics improvement app for home training.',
        theme_color: '#FBF8F3',
        background_color: '#FBF8F3',
        display: 'standalone',
        orientation: 'portrait',
        scope: '.',
        start_url: '.',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('recharts')) return 'charts'
          if (id.includes('framer-motion')) return 'motion'
          if (id.includes('dexie')) return 'dexie'
        },
      },
    },
  },
  server: {
    port: 5173,
  },
})
