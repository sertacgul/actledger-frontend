import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import './index.css'

// PWA service worker registration with auto-update
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSW(true)
    window.location.reload()
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
