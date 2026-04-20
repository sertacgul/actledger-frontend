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

  const tabs = [
    { to: '/m/gorevler',  icon: ClipboardList,  label: t('m_nav_tasks') },
    { to: '/m/qr-tarama', icon: ScanLine,        label: 'QR',             highlight: false, qr: true },
    { to: '/m/operiq',    icon: Cpu,             label: 'OperIQ',         highlight: true },
    { to: '/m/mesajlar',  icon: MessageSquare,   label: t('m_nav_messages') },
    { to: '/m/profil',    icon: UserCircle,      label: t('m_nav_profile') },
  ]

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-50" style={{ maxWidth: 480, margin: '0 auto' }}>
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
