import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { ClipboardList, FileSpreadsheet, MessageSquare, UserCircle, Bell, RefreshCw, Wifi, WifiOff, Cpu, MapPin, X, ScanLine } from 'lucide-react'
import { useState, useEffect } from 'react'
import clsx from 'clsx'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import BrandMark from '../ui/BrandMark'
import { startSyncManager, stopSyncManager, syncNow, isSyncing } from '../../lib/sync-manager'
import { api } from '../../lib/api'

export default function MobileLayout() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [online, setOnline] = useState(navigator.onLine)

  const [syncing, setSyncing] = useState(false)
  // Show location notice on every login (session-based, not persisted)
  const [locationDismissed, setLocationDismissed] = useState(false)

  useEffect(() => {
    if (!user) { navigate('/m/giris', { replace: true }); return }
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)

    // Start offline sync manager
    startSyncManager()

    // Register push notifications (Capacitor native or Web Push fallback)
    ;(async () => {
      try {
        // Try Capacitor native push first (iOS/Android app)
        const { Capacitor } = await import('@capacitor/core').catch(() => ({ Capacitor: null }))
        if (Capacitor?.isNativePlatform?.()) {
          console.log('[Push] Native platform detected, using Capacitor PushNotifications')
          const { PushNotifications } = await import('@capacitor/push-notifications')
          const permResult = await PushNotifications.requestPermissions()
          console.log('[Push] Permission:', permResult.receive)
          if (permResult.receive === 'granted') {
            await PushNotifications.register()
            PushNotifications.addListener('registration', (token) => {
              console.log('[Push] Native token:', token.value.substring(0, 20) + '...')
              const platform = Capacitor.getPlatform() === 'ios' ? 'apns' : 'fcm'
              api.post('/notifications/device-token', { token: token.value, platform }).catch(() => {})
            })
            PushNotifications.addListener('registrationError', (err) => {
              console.error('[Push] Registration error:', err.error)
            })
            PushNotifications.addListener('pushNotificationReceived', (notification) => {
              console.log('[Push] Received:', notification.title)
            })
            PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
              console.log('[Push] Action:', action.notification.title)
            })
          }
          return
        }

        // Web Push fallback (PWA in browser)
        console.log('[Push] Web platform, trying Web Push...')
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) { console.log('[Push] No Web Push support'); return }
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return
        const reg = await navigator.serviceWorker.ready
        let sub = await reg.pushManager.getSubscription()
        if (!sub) {
          const res = await api.get<any>('/notifications/vapid-public-key')
          const vapidKey = res?.key || (res as any)?.data?.key || res
          if (!vapidKey) return
          const urlBase64ToUint8Array = (base64String: string) => {
            const padding = '='.repeat((4 - base64String.length % 4) % 4)
            const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
            const rawData = window.atob(base64)
            const outputArray = new Uint8Array(rawData.length)
            for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
            return outputArray
          }
          sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) })
        }
        if (sub) {
          const subJson = sub.toJSON()
          await api.post('/notifications/push-subscribe', { endpoint: subJson.endpoint, keys: subJson.keys, userAgent: navigator.userAgent }).catch(() => {})
        }
      } catch (err) { console.error('[Push] Error:', err) }
    })()

    // Location: send every 60s - mobile users always share location
    let locationInterval: ReturnType<typeof setInterval> | null = null
    const sendLocation = () => {
      try {
      if (!navigator.geolocation || !navigator.onLine) return
      navigator.geolocation.getCurrentPosition(
        pos => {
          const trackingTaskId = localStorage.getItem('actledger_tracking_task')
          api.post('/locations/me', {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            ...(trackingTaskId && { taskId: trackingTaskId }),
          }).catch(() => {})
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      )
      } catch { /* ignore */ }
    }
    sendLocation() // Send immediately on mount
    locationInterval = setInterval(sendLocation, 60000)

    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
      stopSyncManager()
      if (locationInterval) clearInterval(locationInterval)
    }
  }, [user, navigate])

  const handleSync = async () => {
    setSyncing(true)
    await syncNow()
    setSyncing(false)
  }

  // Detect if running in standalone PWA mode
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
  const [showInstallBanner, setShowInstallBanner] = useState(() => {
    if (isStandalone) return false
    const dismissed = localStorage.getItem('actledger_install_dismissed')
    if (dismissed && Date.now() - Number(dismissed) < 86400000) return false // 24h cooldown
    return true
  })

  const tabs = [
    { to: '/m/gorevler',  icon: ClipboardList,   label: t('m_nav_tasks') },
    { to: '/m/formlar',   icon: FileSpreadsheet, label: 'Formlar' },
    { to: '/m/qr-tarama', icon: ScanLine,        label: 'QR',             highlight: false, qr: true },
    { to: '/m/operiq',    icon: Cpu,             label: 'OperIQ',         highlight: true },
    { to: '/m/mesajlar',  icon: MessageSquare,   label: t('m_nav_messages') },
    { to: '/m/profil',    icon: UserCircle,      label: t('m_nav_profile') },
  ]

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-50" style={{ maxWidth: 480, margin: '0 auto' }}>
      {/* Install PWA banner */}
      {showInstallBanner && (
        <div className="bg-cyan-600 text-white text-xs font-medium py-2.5 px-4 flex items-center gap-2 safe-area-top">
          <div className="flex-1">
            {isIOS
              ? 'Bildirim almak icin uygulamayi ana ekrana ekleyin: Paylas > Ana Ekrana Ekle'
              : 'Bildirim almak icin uygulamayi ana ekrana ekleyin'}
          </div>
          <button type="button" onClick={() => { setShowInstallBanner(false); localStorage.setItem('actledger_install_dismissed', String(Date.now())) }}
            className="text-white/80 font-bold text-lg leading-none px-1">x</button>
        </div>
      )}

      {/* Offline banner */}
      {!online && (
        <div className="bg-amber-500 text-white text-center text-xs font-semibold py-1.5 px-3">
          <WifiOff size={12} className="inline mr-1.5" />
          {t('m_offline_banner')}
        </div>
      )}

      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white safe-area-top">
        <div className="flex items-center gap-2">
          <BrandMark size={24} iconOnly />
          <span className="text-sm font-bold tracking-tight">{t('m_brand')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing || !online}
            className="p-1.5 disabled:opacity-30"
          >
            <RefreshCw size={15} className={clsx('text-white/60', syncing && 'animate-spin')} />
          </button>
          {online
            ? <Wifi size={14} className="text-green-400" />
            : <WifiOff size={14} className="text-amber-400" />
          }
          <button
            type="button"
            onClick={() => navigate('/m/bildirimler')}
            className="relative p-1.5"
          >
            <Bell size={18} className="text-white/80" />
          </button>
        </div>
      </header>

      {/* Location notice - shown every login session */}
      {!locationDismissed && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-3 flex flex-col items-center gap-2">
          <div className="flex items-start gap-2.5 w-full">
            <MapPin size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-[11px] font-semibold text-blue-800">Konum Bilgisi</p>
              <p className="text-[10px] text-blue-700 leading-relaxed mt-0.5">
                {'Mesai ba\u015flang\u0131c\u0131ndan biti\u015fine kadar konum bilginiz a\u00e7\u0131k olacakt\u0131r.'} <strong>{'Kimlik bilgileriniz kesinlikle takip edilmemektedir.'}</strong> {'Bu uygulama emniyeti ve operasyonel verimlili\u011fi art\u0131rmak i\u00e7in kullan\u0131lmaktad\u0131r.'}
              </p>
            </div>
          </div>
          <button type="button" onClick={() => setLocationDismissed(true)}
            className="px-6 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-500">
            {'Anlad\u0131m'}
          </button>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav className="flex items-stretch border-t border-slate-200 bg-white safe-area-bottom relative">
        {tabs.map(tab => {
          const isHighlight = (tab as any).highlight
          const isQr = (tab as any).qr
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) => clsx(
                'flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors min-h-[56px]',
                isHighlight
                  ? 'relative -mt-3'
                  : isQr
                    ? 'relative -mt-2'
                    : clsx(
                        'py-2.5',
                        isActive
                          ? 'text-cyan-600 bg-cyan-50/50'
                          : 'text-slate-400 active:bg-slate-50'
                      )
              )}
            >
              {isHighlight ? (
                <>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/30" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #134e4a 60%, #115e59 100%)' }}>
                    <tab.icon size={20} className="text-teal-300" />
                  </div>
                  <span className="text-[9px] font-bold text-teal-600 mt-0.5">{tab.label}</span>
                </>
              ) : isQr ? (
                <>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md border-2 border-cyan-200 bg-white">
                    <tab.icon size={20} className="text-cyan-600" />
                  </div>
                  <span className="text-[9px] font-bold text-cyan-600 mt-0.5">{tab.label}</span>
                </>
              ) : (
                <>
                  <tab.icon size={22} />
                  <span className="text-[10px] font-semibold">{tab.label}</span>
                </>
              )}
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
