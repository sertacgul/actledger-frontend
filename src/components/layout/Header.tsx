import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, RefreshCw, LogOut, ChevronDown, Printer, Sun, Moon, ZoomIn, ZoomOut, RotateCcw, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import clsx from 'clsx'
import { io, type Socket } from 'socket.io-client'
import { useAuth } from '../../context/AuthContext'
import { useCompany } from '../../context/CompanyContext'
import { useTheme } from '../../context/ThemeContext'
import { useLanguage } from '../../context/LanguageContext'
import { useNotifications, markAllNotificationsRead, markNotificationRead, usePrintLog } from '../../lib/hooks'
import { tokenStore, SERVER_BASE } from '../../lib/api'
import LiveClock from '../ui/LiveClock'
import { FlagTR, FlagUS, FlagRU, FlagDE } from '../ui/Flags'

interface HeaderProps { title: string; subtitle?: string; onMenuClick?: () => void; onToggleCollapse?: () => void; sidebarCollapsed?: boolean }

export default function Header({ title, subtitle, onMenuClick, onToggleCollapse, sidebarCollapsed }: HeaderProps) {
  const { user, logout } = useAuth()
  const { config } = useCompany()
  const { theme, zoom, toggleTheme, zoomIn, zoomOut, resetZoom } = useTheme()
  const { lang, setLang, t } = useLanguage()
  const { notifications, unreadCount, refetch } = useNotifications()
  const { handlePrint } = usePrintLog({ page: title })

  const [notifOpen, setNotifOpen] = useState(false)
  const [menuOpen,  setMenuOpen]  = useState(false)
  const [syncing,   setSyncing]   = useState(false)
  const [bellPulse, setBellPulse] = useState(false)
  const socketRef = useRef<Socket | null>(null)

  // Notification bell sound using Web Audio API
  const playBellSound = useCallback(() => {
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      // Bell-like chime: two quick tones
      osc.frequency.setValueAtTime(880, ctx.currentTime) // A5
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1) // C#6
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.5)
    } catch { /* audio not available */ }
  }, [])

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Socket.io real-time notification listener
  useEffect(() => {
    const token = tokenStore.get()
    if (!token || !user) return

    const showBrowserNotif = (title: string, body: string) => {
      if ('Notification' in window && Notification.permission === 'granted') {
        try { new Notification(title, { body, icon: '/favicon.svg', badge: '/favicon.svg', tag: `actledger-${Date.now()}` }) } catch {}
      }
    }

    const socket = io(SERVER_BASE, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 3000,
    })

    socket.on('notification:new', (data?: { title?: string; body?: string; message?: string }) => {
      refetch()
      playBellSound()
      setBellPulse(true)
      setTimeout(() => setBellPulse(false), 2000)
      showBrowserNotif(data?.title || 'ActLedger', data?.body || data?.message || 'Yeni bildirim')
    })

    socket.on('message:new', (data?: { message?: { senderId?: string; senderName?: string; content?: string; sender?: { id?: string; name?: string } } }) => {
      const msg = data?.message
      const msgSenderId = msg?.senderId || msg?.sender?.id
      // Don't notify the sender
      if (msgSenderId === user?.id) return
      playBellSound()
      const senderLabel = msg?.senderName || msg?.sender?.name || 'Yeni Mesaj'
      showBrowserNotif(senderLabel, msg?.content || 'Yeni bir mesajiniz var')
    })

    socket.on('task:updated', () => {
      refetch()
      // Broadcast to Tasks page for real-time updates
      window.dispatchEvent(new Event('task:updated'))
    })
    socket.on('task:checklist:updated', () => {
      window.dispatchEvent(new Event('task:checklist:updated'))
    })

    socketRef.current = socket

    return () => { socket.disconnect(); socketRef.current = null }
  }, [user?.id])

  const handleSync = () => {
    setSyncing(true)
    setTimeout(() => setSyncing(false), 1200)
  }

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead()
    refetch()
  }

  const handleMarkOneRead = async (id: string, read: boolean) => {
    if (!read) {
      await markNotificationRead(id)
      refetch()
    }
  }

  const closeAll = () => { setNotifOpen(false); setMenuOpen(false) }

  const isDark = theme === 'dark'

  return (
    <>
      <header className="app-header">
        {/* Left */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Hamburger - mobile drawer */}
          {onMenuClick && (
            <button
              type="button"
              onClick={onMenuClick}
              className="lg:hidden btn-ghost btn-sm -ml-1.5 mr-1"
              aria-label={t('header_open_menu')}
            >
              <Menu size={16} />
            </button>
          )}
          {/* Sidebar collapse toggle - desktop only */}
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden lg:flex btn-ghost btn-sm -ml-1.5 mr-1"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[14px] font-semibold leading-none tracking-tight truncate" style={{ color: 'var(--text-1)' }}>
                {title}
              </h1>
              <span className="hidden md:inline text-[9px] font-medium px-2 py-0.5 rounded-full border" style={{ color: 'var(--text-3)', borderColor: 'var(--border)' }}>
                ATAOL AI Techs tarafindan gelistirildi.
              </span>
            </div>
            {subtitle && (
              <p className="text-[11px] mt-0.5 leading-none truncate hidden sm:block" style={{ color: 'var(--text-3)' }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1">

          {/* Live clock */}
          <LiveClock />

          {/* Deployment badge */}
          {config && (
            <div
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded border mr-1"
              style={{ background: 'var(--border-subtle)', borderColor: 'var(--border)' }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-medium" style={{ color: 'var(--text-3)' }}>
                {config.deploymentMode === 'on-premise' ? 'On-Premise' : 'Cloud'}
              </span>
            </div>
          )}

          {/* Zoom controls */}
          <div
            className="hidden sm:flex items-center rounded border"
            style={{ background: 'var(--border-subtle)', borderColor: 'var(--border)' }}
          >
            <button
              type="button"
              onClick={zoomOut}
              disabled={zoom <= 70}
              className="btn-ghost btn-sm px-1.5 rounded-r-none border-r"
              style={{ borderColor: 'var(--border)' }}
              title={t('header_zoom_out')}
            >
              <ZoomOut size={12} />
            </button>
            <button
              type="button"
              onClick={resetZoom}
              className="px-2 text-[10px] font-mono font-medium tabular-nums"
              style={{ color: 'var(--text-2)', minWidth: '2.8rem', textAlign: 'center' }}
              title={t('header_zoom_reset')}
            >
              {zoom}%
            </button>
            <button
              type="button"
              onClick={zoomIn}
              disabled={zoom >= 200}
              className="btn-ghost btn-sm px-1.5 rounded-l-none border-l"
              style={{ borderColor: 'var(--border)' }}
              title={t('header_zoom_in')}
            >
              <ZoomIn size={12} />
            </button>
          </div>

          {/* Language toggle with flags */}
          {/* Language toggle TR / EN */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-md" style={{ background: 'var(--surface-secondary, rgba(0,0,0,0.04))' }}>
            <button type="button" onClick={() => setLang('tr')}
              className={clsx('flex items-center gap-1 px-1.5 py-1 rounded text-[10px] font-bold transition-all',
                lang === 'tr' ? 'bg-white shadow-sm text-slate-900 dark:bg-slate-700 dark:text-white' : 'text-slate-400 hover:text-slate-600'
              )} aria-label="Turkce">
              <FlagTR size={16} /><span>TR</span>
            </button>
            <button type="button" onClick={() => setLang('en')}
              className={clsx('flex items-center gap-1 px-1.5 py-1 rounded text-[10px] font-bold transition-all',
                lang === 'en' ? 'bg-white shadow-sm text-slate-900 dark:bg-slate-700 dark:text-white' : 'text-slate-400 hover:text-slate-600'
              )} aria-label="English">
              <FlagUS size={16} /><span>EN</span>
            </button>
          </div>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="btn-ghost btn-sm"
            title={isDark ? t('header_theme_light') : t('header_theme_dark')}
          >
            {isDark
              ? <Sun  size={13} className="text-amber-400" />
              : <Moon size={13} />
            }
          </button>

          {/* Print */}
          <button
            type="button"
            onClick={handlePrint}
            className="btn-ghost btn-sm"
            title={t('header_print')}
          >
            <Printer size={13} />
            <span className="hidden lg:inline text-[11px]">{t('header_print_short')}</span>
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              type="button"
              aria-label={`${t('header_notifications')}${unreadCount > 0 ? `, ${t('header_notif_unread', { n: unreadCount })}` : ''}`}
              onClick={() => { setMenuOpen(false); setNotifOpen(v => !v) }}
              className="btn-ghost btn-sm relative"
            >
              <Bell size={14} className={bellPulse ? 'animate-bounce' : ''} />
              {unreadCount > 0 && (
                <span className={clsx('absolute top-0.5 right-0.5 min-w-[14px] h-[14px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5', bellPulse && 'animate-ping')}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-[calc(100%+6px)] w-80 surface shadow-xl animate-scale-in overflow-hidden z-30">
                <div
                  className="flex items-center justify-between px-4 py-3 border-b"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <span className="text-[13px] font-semibold" style={{ color: 'var(--text-1)' }}>
                    {t('header_notifications')}
                  </span>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-[11px] text-blue-500 hover:text-blue-400 hover:underline transition-colors"
                    >
                      {t('header_mark_all_read')}
                    </button>
                  )}
                </div>
                <ul className="max-h-72 overflow-y-auto divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                  {notifications.length === 0 ? (
                    <li className="px-4 py-8 text-center text-[12px]" style={{ color: 'var(--text-3)' }}>
                      {t('header_no_notifications')}
                    </li>
                  ) : notifications.map(n => (
                    <li
                      key={n.id}
                      className={clsx(
                        'px-4 py-3 cursor-pointer transition-colors',
                        !n.read ? 'bg-blue-500/5' : 'opacity-60'
                      )}
                      style={{ ':hover': { background: 'var(--border-subtle)' } } as any}
                      onClick={() => handleMarkOneRead(n.id, n.read)}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--border-subtle)')}
                      onMouseLeave={e => (e.currentTarget.style.background = n.read ? '' : '')}
                    >
                      <div className="flex items-start gap-3">
                        <div className={clsx(
                          'w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0',
                          n.read ? 'bg-slate-400' : 'bg-blue-500'
                        )} />
                        <div>
                          <p className="text-[12px] font-semibold" style={{ color: 'var(--text-1)' }}>{n.title}</p>
                          <p className="text-[11px] mt-0.5 leading-snug" style={{ color: 'var(--text-2)' }}>{n.message}</p>
                          <p className="text-[10px] mt-1" style={{ color: 'var(--text-3)' }}>
                            {new Date(n.createdAt).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', {
                              hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short',
                            })}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* User menu */}
          {user && (
            <div className="relative ml-1">
              <button
                type="button"
                onClick={() => { setNotifOpen(false); setMenuOpen(v => !v) }}
                className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded transition-colors"
                style={{
                  ':hover': { background: 'var(--border-subtle)' }
                } as any}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--border-subtle)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 ring-1 ring-slate-600">
                  <span className="text-slate-200 text-[9px] font-bold">
                    {user.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </span>
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-[12px] font-semibold leading-none" style={{ color: 'var(--text-1)' }}>
                    {user.name.split(' ')[0]}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                    {t(`role_${user.role}` as any)}
                  </p>
                </div>
                <ChevronDown size={12} style={{ color: 'var(--text-3)' }} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-[calc(100%+6px)] w-56 surface shadow-xl animate-scale-in overflow-hidden z-30">
                  <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-[12px] font-semibold" style={{ color: 'var(--text-1)' }}>{user.name}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-2)' }}>{user.email}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>{t(`role_${user.role}` as any)}</p>
                  </div>

                  {/* Mobile zoom controls inside menu */}
                  <div className="sm:hidden px-4 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-[10px] font-semibold mb-2" style={{ color: 'var(--text-3)' }}>{t('header_view_size')}</p>
                    <div className="flex items-center gap-2">
                      <button onClick={zoomOut} disabled={zoom <= 70} className="btn-ghost btn-sm px-2">
                        <ZoomOut size={12} />
                      </button>
                      <button onClick={resetZoom} className="flex-1 text-center text-[11px] font-mono" style={{ color: 'var(--text-2)' }}>
                        {zoom}%
                      </button>
                      <button onClick={zoomIn} disabled={zoom >= 200} className="btn-ghost btn-sm px-2">
                        <ZoomIn size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="p-1.5">
                    <button
                      type="button"
                      onClick={() => { logout(); closeAll() }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded text-red-500 hover:bg-red-500/10 transition-colors text-[12px] font-medium"
                    >
                      <LogOut size={13} /> {t('header_logout')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {(notifOpen || menuOpen) && (
        <div className="fixed inset-0 z-20" onClick={closeAll} />
      )}
    </>
  )
}
