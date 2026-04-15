import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import './index.css'

// PWA service worker registration
registerSW({
  onNeedRefresh() { /* silent auto-update */ },
  onOfflineReady() { console.log('[PWA] Offline ready') },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
