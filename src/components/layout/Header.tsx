import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { Bell, RefreshCw, LogOut, ChevronDown, Printer, Sun, Moon, ZoomIn, ZoomOut, RotateCcw, Menu, PanelLeftClose, PanelLeftOpen, FileSpreadsheet } from 'lucide-react'
import clsx from 'clsx'
import { io, type Socket } from 'socket.io-client'
import { useAuth } from '../../context/AuthContext'
import { useCompany } from '../../context/CompanyContext'
import { useTheme } from '../../context/ThemeContext'
import { useLanguage } from '../../context/LanguageContext'
import { useNotifications, markAllNotificationsRead, markNotificationRead, usePrintLog } from '../../lib/hooks'
import { fetchAllExportData } from '../../lib/erp-hooks'
import { exportMultiSheet, exportToExcel } from '../../lib/excelExport'
import { tokenStore, SERVER_BASE, api } from '../../lib/api'
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
  const location = useLocation()
  const [globalExporting, setGlobalExporting] = useState(false)

  const handleSmartExport = async () => {
    setGlobalExporting(true)
    const date = new Date().toISOString().slice(0, 10)
    const path = location.pathname.replace(/^\//, '')

    try {
      // Page-specific exports
      const pageExports: Record<string, { endpoint: string; filename: string; sheetName: string; columns: any[] }> = {
        gorevler:          { endpoint: '/tasks?pageSize=100', filename: `gorevler_${date}`, sheetName: 'Gorevler', columns: [
          { header: 'Baslik', accessor: (t: any) => t.title, width: 32 }, { header: 'Durum', accessor: (t: any) => t.status, width: 14 }, { header: 'Oncelik', accessor: (t: any) => t.priority, width: 12 }, { header: 'Tarih', accessor: (t: any) => t.createdAt?.slice(0, 10), width: 12 }] },
        departmanlar:      { endpoint: '/departments', filename: `departmanlar_${date}`, sheetName: 'Departmanlar', columns: [
          { header: 'Ad', accessor: (d: any) => d.name, width: 24 }, { header: 'Kod', accessor: (d: any) => d.code, width: 10 }] },
        kullanicilar:      { endpoint: '/users?pageSize=100', filename: `kullanicilar_${date}`, sheetName: 'Kullanicilar', columns: [
          { header: 'Ad', accessor: (u: any) => u.name, width: 24 }, { header: 'E-posta', accessor: (u: any) => u.email, width: 28 }, { header: 'Rol', accessor: (u: any) => u.role, width: 16 }] },
        envanter:          { endpoint: '/inventory?pageSize=100', filename: `envanter_${date}`, sheetName: 'Envanter', columns: [
          { header: 'Ad', accessor: (i: any) => i.name, width: 28 }, { header: 'Kod', accessor: (i: any) => i.code ?? '', width: 14 }, { header: 'Tip', accessor: (i: any) => i.type, width: 14 }, { header: 'Miktar', accessor: (i: any) => i.quantity, width: 10 }] },
        stok:              { endpoint: '/stock-management?pageSize=100', filename: `stok_${date}`, sheetName: 'Stok', columns: [
          { header: 'Ad', accessor: (s: any) => s.name, width: 28 }, { header: 'Kod', accessor: (s: any) => s.code ?? '', width: 14 }, { header: 'Miktar', accessor: (s: any) => s.quantity, width: 10 }, { header: 'Min', accessor: (s: any) => s.minLevel, width: 8 }] },
        'is-siparisleri':  { endpoint: '/work-orders?pageSize=100', filename: `is_siparisleri_${date}`, sheetName: 'Is Siparisleri', columns: [
          { header: 'Kod', accessor: (w: any) => w.code, width: 14 }, { header: 'Baslik', accessor: (w: any) => w.title, width: 28 }, { header: 'Durum', accessor: (w: any) => w.status, width: 14 }] },
      }

      const pageConfig = pageExports[path]

      if (pageConfig) {
        // Single page export
        const res = await api.get<any>(pageConfig.endpoint).catch(() => null)
        const raw = res?.data ?? res ?? []
        const rows = Array.isArray(raw) ? raw : []
        exportToExcel({ filename: pageConfig.filename + '.xlsx', sheetName: pageConfig.sheetName, columns: pageConfig.columns, rows })
      } else {
        // Kokpit or unknown page -> full platform export
        const data = await fetchAllExportData()
        exportMultiSheet({
          filename: `ActLedger_TumVeriler_${date}.xlsx`,
          sheets: [
            { sheetName: 'Departmanlar', columns: [{ header: 'Ad', accessor: (d: any) => d.name, width: 24 }, { header: 'Kod', accessor: (d: any) => d.code, width: 10 }], rows: data.departments },
            { sheetName: 'Kullanicilar', columns: [{ header: 'Ad', accessor: (u: any) => u.name, width: 24 }, { header: 'E-posta', accessor: (u: any) => u.email, width: 28 }, { header: 'Rol', accessor: (u: any) => u.role, width: 16 }], rows: data.users },
            { sheetName: 'Gorevler', columns: [{ header: 'Baslik', accessor: (t: any) => t.title, width: 32 }, { header: 'Durum', accessor: (t: any) => t.status, width: 14 }, { header: 'Oncelik', accessor: (t: any) => t.priority, width: 12 }], rows: data.tasks },
            { sheetName: 'Envanter', columns: [{ header: 'Ad', accessor: (i: any) => i.name, width: 28 }, { header: 'Tip', accessor: (i: any) => i.type, width: 14 }, { header: 'Miktar', accessor: (i: any) => i.quantity, width: 10 }], rows: data.inventory },
            { sheetName: 'Stok Durum', columns: [{ header: 'Ad', accessor: (s: any) => s.name, width: 28 }, { header: 'Miktar', accessor: (s: any) => s.quantity, width: 10 }, { header: 'Min', accessor: (s: any) => s.minLevel, width: 8 }], rows: data.stockItems },
            { sheetName: 'Stok Hareketleri', columns: [{ header: 'Tip', accessor: (m: any) => m.type, width: 12 }, { header: 'Miktar', accessor: (m: any) => m.quantity, width: 10 }, { header: 'Tarih', accessor: (m: any) => m.createdAt?.slice(0, 10), width: 12 }], rows: data.stockMovements },
            { sheetName: 'Musteriler', columns: [{ header: 'Ad', accessor: (c: any) => c.name, width: 28 }, { header: 'Tip', accessor: (c: any) => c.customerType, width: 14 }, { header: 'Bakiye', accessor: (c: any) => Number(c.balance) || 0, width: 14 }], rows: data.customers },
            { sheetName: 'Siparisler', columns: [{ header: 'Siparis No', accessor: (o: any) => o.orderNumber, width: 16 }, { header: 'Musteri', accessor: (o: any) => o.customer?.name ?? '', width: 24 }, { header: 'Tutar', accessor: (o: any) => Number(o.totalAmount) || 0, width: 14 }], rows: data.orders },
            { sheetName: 'Hesap Plani', columns: [{ header: 'Kod', accessor: (a: any) => a.code, width: 12 }, { header: 'Ad', accessor: (a: any) => a.name, width: 28 }, { header: 'Tip', accessor: (a: any) => a.accountType, width: 14 }], rows: data.accounts },
            { sheetName: 'Yevmiye', columns: [{ header: 'Fis No', accessor: (j: any) => j.entryNumber, width: 16 }, { header: 'Aciklama', accessor: (j: any) => j.description, width: 32 }, { header: 'Borc', accessor: (j: any) => Number(j.totalDebit) || 0, width: 14 }], rows: data.journal },
            { sheetName: 'E-Faturalar', columns: [{ header: 'Fatura No', accessor: (i: any) => i.invoiceNumber, width: 16 }, { header: 'Alici', accessor: (i: any) => i.receiverName, width: 24 }, { header: 'Tutar', accessor: (i: any) => Number(i.totalAmount) || 0, width: 14 }], rows: data.einvoices },
            { sheetName: 'Calisanlar', columns: [{ header: 'Ad', accessor: (e: any) => e.user?.name ?? '', width: 24 }, { header: 'Sicil No', accessor: (e: any) => e.employeeNumber, width: 12 }, { header: 'Maas', accessor: (e: any) => Number(e.grossSalary) || 0, width: 14 }], rows: data.employees },
            { sheetName: 'Izinler', columns: [{ header: 'Calisan', accessor: (l: any) => l.employee?.user?.name ?? '', width: 24 }, { header: 'Tur', accessor: (l: any) => l.leaveType, width: 14 }, { header: 'Gun', accessor: (l: any) => l.days, width: 6 }], rows: data.leaves },
            { sheetName: 'Bordro', columns: [{ header: 'Donem', accessor: (p: any) => `${p.year}-${String(p.month).padStart(2, '0')}`, width: 10 }, { header: 'Durum', accessor: (p: any) => p.status, width: 14 }, { header: 'Net', accessor: (p: any) => Number(p.totalNet) || 0, width: 14 }], rows: data.payrollPeriods },
          ],
        })
      }
    } catch (e: any) {
      alert(e.message ?? 'Export basarisiz')
    } finally {
      setGlobalExporting(false)
    }
  }
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
              )} aria-label="Türkçe">
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

          {/* Smart Excel Export */}
          <button
            type="button"
            onClick={handleSmartExport}
            disabled={globalExporting}
            className="btn-ghost btn-sm"
            title={lang === 'tr' ? 'Excel Export' : 'Excel Export'}
          >
            {globalExporting ? (
              <svg className="animate-spin w-[13px] h-[13px]" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            ) : (
              <FileSpreadsheet size={13} />
            )}
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
