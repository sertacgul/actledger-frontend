import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'ActLedger Mobil',
        short_name: 'ActLedger',
        description: 'ActLedger Saha Operasyon Mobil Uygulamasi',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/m/gorevler',
        icons: [
          { src: '/images/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/images/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
          { src: '/images/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\/v1\/sync\/pull/,
            handler: 'NetworkFirst',
            options: { cacheName: 'sync-pull', expiration: { maxEntries: 10, maxAgeSeconds: 86400 } },
          },
          {
            urlPattern: /^https?:\/\/.*\/api\/v1\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache', expiration: { maxEntries: 50, maxAgeSeconds: 3600 } },
          },
          {
            urlPattern: /^https?:\/\/.*\/uploads\//,
            handler: 'CacheFirst',
            options: { cacheName: 'uploads-cache', expiration: { maxEntries: 100, maxAgeSeconds: 604800 } },
          },
        ],
        navigateFallback: '/index.html',
      },
    }),
  ],
  server: {
    port: 5175,
    strictPort: true,
  },
})
