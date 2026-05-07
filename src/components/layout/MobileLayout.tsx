import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { ClipboardList, FileSpreadsheet, MessageSquare, UserCircle, Bell, RefreshCw, Wifi, WifiOff, Cpu, MapPin, X, ScanLine, Briefcase, ChevronUp, Loader2 } from 'lucide-react'
import { useState, useEffect, useRef, Suspense } from 'react'
import clsx from 'clsx'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import BrandMark from '../ui/BrandMark'
import { startSyncManager, stopSyncManager, syncNow, isSyncing } from '../../lib/sync-manager'
import { api } from '../../lib/api'
import PushBanner, { triggerPushBanner } from '../ui/PushBanner'

export default function MobileLayout() {
  const { t, lang } = useLanguage()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [online, setOnline] = useState(navigator.onLine)

  const [syncing, setSyncing] = useState(false)
  const [unreadMsgCount, setUnreadMsgCount] = useState(0)
  const [unreadNotifCount, setUnreadNotifCount] = useState(0)
  // Show location notice on every login (session-based, not persisted)
  const [locationDismissed, setLocationDismissed] = useState(false)

  useEffect(() => {
    if (authLoading) return // wait for session restore
    if (!user) { navigate('/m/giris', { replace: true }); return }
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)

    // Start offline sync manager
    startSyncManager()

    // Register push notifications
    ;(async () => {
      try {
        // Try Capacitor native push
        const cap = (window as any).Capacitor
        if (cap?.isNativePlatform?.()) {
          try {
            const { PushNotifications } = await import('@capacitor/push-notifications')
            // Add listeners BEFORE register() to avoid race condition
            await PushNotifications.removeAllListeners()
            PushNotifications.addListener('registration', async (token) => {
              const val = token?.value
              if (!val) return
              const platform = cap.getPlatform?.() === 'ios' ? 'apns' : 'fcm'
              const prevToken = localStorage.getItem('actledger_push_token')
              if (val !== prevToken) {
                try {
                  await api.post('/notifications/device-token', { token: val, platform })
                  localStorage.setItem('actledger_push_token', val)
                  console.log('[Push] Token registered (' + platform + ')')
                } catch (e) { console.error('[Push] Registration failed:', e) }
              }
            })
            PushNotifications.addListener('registrationError', (e) => console.error('[Push] Reg error:', e))
            PushNotifications.addListener('pushNotificationReceived', (notification) => {
              triggerPushBanner({
                title: notification.title || 'Bildirim',
                message: notification.body || '',
                link: (notification.data as any)?.link,
              })
            })
            PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
              const data = action.notification.data as any
              if (data?.link) {
                const link = data.link.startsWith('/m/') ? data.link : `/m${data.link}`
                setTimeout(() => navigate(link), 300)
              }
            })
            const perm = await PushNotifications.requestPermissions()
            if (perm.receive === 'granted') {
              await PushNotifications.register()
              console.log('[Push] register() called, waiting for token...')
            } else {
              console.warn('[Push] Permission denied:', perm.receive)
            }
          } catch (e) { console.warn('[Push] Native push init failed:', e) }
          return // skip web push
        }

        // Web Push fallback
        if (!('PushManager' in window)) return
        if (Notification.permission === 'default') await Notification.requestPermission()
        if (Notification.permission !== 'granted') return
        const reg = await navigator.serviceWorker?.ready
        if (!reg) return
        let sub = await reg.pushManager.getSubscription()
        if (!sub) {
          const res = await api.get<any>('/notifications/vapid-public-key')
          const vapidKey = res?.key || (res as any)?.data?.key || res
          if (!vapidKey) return
          const u = (s: string) => { const p='='.repeat((4-s.length%4)%4); const b=(s+p).replace(/-/g,'+').replace(/_/g,'/'); const r=window.atob(b); const o=new Uint8Array(r.length); for(let i=0;i<r.length;++i)o[i]=r.charCodeAt(i); return o }
          sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: u(vapidKey) })
        }
        if (sub) {
          const j = sub.toJSON()
          await api.post('/notifications/push-subscribe', { endpoint: j.endpoint, keys: j.keys, userAgent: navigator.userAgent }).catch(() => {})
        }
      } catch (err) { console.error('[Push] Error:', err) }
    })()

    // Unread message + notification count: fetch on mount + poll every 15s
    const fetchUnread = () => {
      api.get<any>('/messages/unread-count').then((r: any) => {
        setUnreadMsgCount(r?.total ?? r?.data?.total ?? 0)
      }).catch(() => {})
      api.get<any>('/notifications?page=1&pageSize=1').then((r: any) => {
        setUnreadNotifCount(r?.meta?.unreadCount ?? 0)
      }).catch(() => {})
    }
    fetchUnread()
    const unreadInterval = setInterval(fetchUnread, 15000)

    // Immediately refresh badge when notifications are marked as read
    const onNotifRead = () => {
      api.get<any>('/notifications?page=1&pageSize=1').then((r: any) => {
        setUnreadNotifCount(r?.meta?.unreadCount ?? 0)
      }).catch(() => {})
    }
    window.addEventListener('notif:read', onNotifRead)

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
      window.removeEventListener('notif:read', onNotifRead)
      stopSyncManager()
      clearInterval(unreadInterval)
      if (locationInterval) clearInterval(locationInterval)
    }
  }, [user, authLoading, navigate])

  const handleSync = async () => {
    setSyncing(true)
    await syncNow()
    // Refresh unread counts after sync
    api.get<any>('/messages/unread-count').then((r: any) => {
      setUnreadMsgCount(r?.total ?? r?.data?.total ?? 0)
    }).catch(() => {})
    api.get<any>('/notifications?page=1&pageSize=1').then((r: any) => {
      setUnreadNotifCount(r?.meta?.unreadCount ?? 0)
    }).catch(() => {})
    setSyncing(false)
  }

  // Detect if running in standalone PWA mode or native app (Capacitor)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
  const isNativeApp = !!(window as any).Capacitor?.isNativePlatform?.()
  const isPWA = isStandalone || isNativeApp
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)

  // JS fallback: apply dark status bar overlay for standalone PWA
  useEffect(() => {
    if (!isPWA) return
    // Ensure body::before dark overlay exists even if CSS cache is stale
    document.body.classList.add('pwa-standalone')
  }, [isPWA])
  const [showInstallBanner, setShowInstallBanner] = useState(() => {
    if (isStandalone || isNativeApp) return false
    const dismissed = localStorage.getItem('actledger_install_dismissed')
    if (dismissed && Date.now() - Number(dismissed) < 86400000) return false
    return true
  })

  // "İşler" group sub-items
  const workSubItems = [
    { to: '/m/gorevler',        icon: ClipboardList,   label: lang === 'tr' ? 'G\u00f6revler' : 'Tasks' },
    { to: '/m/formlar',         icon: FileSpreadsheet, label: lang === 'tr' ? 'Formlar' : 'Forms' },
    { to: '/m/is-siparisleri',  icon: Briefcase,       label: lang === 'tr' ? '\u0130\u015f Sipari\u015fleri' : 'Work Orders' },
  ]
  const workPaths = workSubItems.map(i => i.to)
  const [workMenuOpen, setWorkMenuOpen] = useState(false)
  const workMenuRef = useRef<HTMLDivElement>(null)

  // Close work menu on outside tap
  useEffect(() => {
    if (!workMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (workMenuRef.current && !workMenuRef.current.contains(e.target as Node)) setWorkMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [workMenuOpen])

  const tabs = [
    { to: '/m/gorevler',  icon: Briefcase,       label: lang === 'tr' ? 'İşler' : 'Work',  group: true },
    { to: '/m/qr-tarama', icon: ScanLine,        label: 'QR',             highlight: false, qr: true },
    { to: '/m/operiq',    icon: Cpu,             label: 'OperIQ',         highlight: true },
    { to: '/m/mesajlar',  icon: MessageSquare,   label: t('m_nav_messages') },
    { to: '/m/profil',    icon: UserCircle,      label: t('m_nav_profile') },
  ]

  // Show splash while restoring session
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-slate-900">
        <div className="text-center">
          <BrandMark size={48} />
          <p className="text-white/50 text-sm mt-4 animate-pulse">{lang === 'tr' ? 'Yükleniyor...' : 'Loading...'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-50 mx-auto w-full max-w-[100vw] tablet:max-w-[768px]" style={{ overflowX: 'hidden', ...(isPWA && { paddingTop: 'max(50px, env(safe-area-inset-top))', boxSizing: 'border-box' }) }}>
      <PushBanner onNavigate={(link) => navigate(link.startsWith('/m/') ? link : `/m${link}`)} />
      {/* Install PWA banner */}
      {showInstallBanner && (
        <div className="bg-cyan-600 text-white text-xs font-medium py-2.5 px-4 flex items-center gap-2">
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
      <header className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white">
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
            {unreadNotifCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">
                {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Location notice - shown every login session */}
      {!locationDismissed && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-3 flex flex-col items-center gap-2">
          <div className="flex items-start gap-2.5 w-full">
            <MapPin size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-[11px] font-semibold text-blue-800">
                {lang === 'tr' ? 'Konum Bilgisi' : 'Location Information'}
              </p>
              <p className="text-[10px] text-blue-700 leading-relaxed mt-0.5">
                {lang === 'tr'
                  ? <>Mesai başlangıcından bitişine kadar konum bilginiz açık olacaktır. <strong>Kimlik bilgileriniz kesinlikle takip edilmemektedir.</strong> Bu uygulama emniyeti ve operasyonel verimliliği artırmak için kullanılmaktadır.</>
                  : <>Your location will be shared during working hours. <strong>Your personal identity is never tracked.</strong> This is used to improve safety and operational efficiency.</>
                }
              </p>
            </div>
          </div>
          <button type="button" onClick={() => setLocationDismissed(true)}
            className="px-6 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-500">
            {lang === 'tr' ? 'Anladım' : 'Got it'}
          </button>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        <Suspense fallback={<div className="flex items-center justify-center h-32"><Loader2 size={20} className="animate-spin text-slate-400" /></div>}>
          <Outlet />
        </Suspense>
      </main>

      {/* Bottom nav */}
      <nav className="flex items-stretch border-t border-slate-200 bg-white relative safe-bottom" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {tabs.map(tab => {
          const isHighlight = (tab as any).highlight
          const isQr = (tab as any).qr
          const isGroup = (tab as any).group
          const isGroupActive = isGroup && workPaths.some(p => location.pathname === p || location.pathname.startsWith(p + '/'))

          if (isGroup) {
            return (
              <div key={tab.to} ref={workMenuRef} className="flex-1 relative">
                {/* Work menu popup */}
                {workMenuOpen && (
                  <div className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 min-w-[160px]">
                    {workSubItems.map(item => {
                      const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/')
                      return (
                        <button
                          key={item.to}
                          type="button"
                          onClick={() => { navigate(item.to); setWorkMenuOpen(false) }}
                          className={clsx(
                            'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                            isActive ? 'bg-cyan-50 text-cyan-700' : 'text-slate-600 active:bg-slate-50'
                          )}
                        >
                          <item.icon size={18} />
                          <span className="text-sm font-medium">{item.label}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setWorkMenuOpen(!workMenuOpen)}
                  className={clsx(
                    'w-full flex flex-col items-center justify-center gap-0.5 transition-colors min-h-[var(--touch-min)] tablet:min-h-[56px] py-2.5',
                    isGroupActive || workMenuOpen ? 'text-cyan-600 bg-cyan-50/50' : 'text-slate-400 active:bg-slate-50'
                  )}
                >
                  <div className="relative">
                    <tab.icon size={22} />
                    <ChevronUp size={10} className={clsx('absolute -top-1 -right-2 transition-transform', workMenuOpen ? '' : 'rotate-180')} />
                  </div>
                  <span className="text-[10px] font-semibold">{tab.label}</span>
                </button>
              </div>
            )
          }

          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              onClick={() => setWorkMenuOpen(false)}
              className={({ isActive }) => clsx(
                'flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors min-h-[var(--touch-min)] tablet:min-h-[56px]',
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
                  <div className="relative">
                    <tab.icon size={22} />
                    {tab.to === '/m/mesajlar' && unreadMsgCount > 0 && (
                      <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                        {unreadMsgCount > 99 ? '99+' : unreadMsgCount}
                      </span>
                    )}
                  </div>
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
