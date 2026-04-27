import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import './index.css'

// PWA service worker registration with auto-update
const updateSW = registerSW({
  onNeedRefresh() {
    // New version available - reload automatically
    // Show a brief notification before reloading
    const banner = document.createElement('div')
    banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#0f172a;color:white;padding:12px 16px;text-align:center;font-size:14px;font-family:system-ui;display:flex;align-items:center;justify-content:center;gap:8px;'
    banner.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9"/></svg> Yeni surum mevcut, guncelleniyor...'
    document.body.appendChild(banner)
    // Auto-reload after a brief delay
    setTimeout(() => {
      updateSW(true) // activate new SW
      window.location.reload()
    }, 1500)
  },
  onOfflineReady() {
    console.log('[PWA] Offline ready')
  },
  // Check for updates every 60 seconds
  onRegisteredSW(swUrl, registration) {
    if (registration) {
      setInterval(() => {
        registration.update()
      }, 60 * 1000)
    }
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
