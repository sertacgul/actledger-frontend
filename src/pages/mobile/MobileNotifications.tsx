import { ArrowLeft, Bell, Loader2, AlertTriangle, CheckCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../../context/LanguageContext'
import { useNotifications, markNotificationRead, markAllNotificationsRead } from '../../lib/hooks'
import clsx from 'clsx'

export default function MobileNotifications() {
  const { t, lang } = useLanguage()
  const navigate = useNavigate()
  const { notifications, unreadCount, loading, refetch } = useNotifications()

  /** Convert desktop notification links to mobile routes */
  const toMobileLink = (link: string): string | null => {
    // Already a mobile path
    if (link.startsWith('/m/')) return link
    // /gorevler/xxx -> /m/gorev/xxx
    const taskMatch = link.match(/^\/gorevler\/(.+)/)
    if (taskMatch) return `/m/gorev/${taskMatch[1]}`
    // /gorevler -> /m/gorevler
    if (link === '/gorevler') return '/m/gorevler'
    // /mesajlar?partnerId=xxx -> /m/mesajlar?partnerId=xxx
    if (link.startsWith('/mesajlar')) return `/m${link}`
    // /raporlar/xxx -> /m/rapor/xxx
    const reportMatch = link.match(/^\/raporlar\/(.+)/)
    if (reportMatch) return `/m/rapor/${reportMatch[1]}`
    // /formlar -> /m/formlar
    if (link.startsWith('/formlar')) return '/m/formlar'
    return null
  }

  const handleTap = async (id: string, link?: string) => {
    try {
      await markNotificationRead(id)
      window.dispatchEvent(new CustomEvent('notif:read'))
      refetch()
    } catch {}
    if (link) {
      const mobilePath = toMobileLink(link)
      if (mobilePath) navigate(mobilePath)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead()
      window.dispatchEvent(new CustomEvent('notif:read'))
      refetch()
    } catch {}
  }

  return (
    <div className="pb-4">
      <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="p-1 -ml-1">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <p className="text-sm font-bold text-slate-900">{t('m_notif_title')}</p>
        </div>
        {unreadCount > 0 && (
          <button type="button" onClick={handleMarkAllRead} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-50 border border-cyan-200 active:bg-cyan-100">
            <CheckCheck size={14} className="text-cyan-600" />
            <span className="text-[11px] font-semibold text-cyan-700">{lang === 'tr' ? 'Tumunu oku' : 'Read all'}</span>
          </button>
        )}
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="text-cyan-500 animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <Bell size={36} className="text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">{t('m_notif_empty')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => {
              const isUrgent = n.title.includes('ACIL') || n.message.includes('ACIL')
              return (
              <button
                key={n.id}
                type="button"
                onClick={() => { handleTap(n.id, n.link) }}
                className={clsx(
                  'w-full text-left rounded-xl border p-4 transition-colors active:scale-[0.98]',
                  isUrgent && !n.read
                    ? 'bg-red-50 border-red-300 ring-2 ring-red-200'
                    : n.read
                      ? 'bg-white border-slate-200'
                      : 'bg-cyan-50 border-cyan-200'
                )}
              >
                {isUrgent && (
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <AlertTriangle size={13} className="text-red-500" />
                    <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Acil Mudahale Gerekli</span>
                  </div>
                )}
                <p className={clsx('text-sm font-semibold', isUrgent ? 'text-red-800' : 'text-slate-900')}>{n.title}</p>
                <p className={clsx('text-xs mt-0.5', isUrgent ? 'text-red-600' : 'text-slate-500')}>{n.message}</p>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  {new Date(n.createdAt).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
