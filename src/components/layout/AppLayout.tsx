import { useState, useEffect } from 'react'
import { Outlet, useLocation, Link } from 'react-router-dom'
import { Monitor, Smartphone } from 'lucide-react'
import Sidebar from './Sidebar'
import Header from './Header'
import Watermark from './Watermark'
import ToolsBar from './ToolsBar'
import { useTheme } from '../../context/ThemeContext'
import { useLanguage } from '../../context/LanguageContext'
import BrandMark from '../ui/BrandMark'
import type { TranslationKey } from '../../i18n/translations'

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  // Detect mobile/tablet/kiosk - anything that is NOT a desktop OS
  const mobilePattern = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet|Kindle|Silk/i
  // Also check screen size as fallback (tablets, kiosks with small screens)
  const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 1024
  // Check for touch-only device (no mouse)
  const isTouchOnly = typeof window !== 'undefined' && 'ontouchstart' in window && navigator.maxTouchPoints > 0 && !window.matchMedia('(pointer: fine)').matches
  return mobilePattern.test(ua) || (isSmallScreen && isTouchOnly)
}

const PAGE_META: Record<string, { title: TranslationKey; subtitle: TranslationKey }> = {
  '/panel':         { title: 'page_dashboard_title',      subtitle: 'page_dashboard_subtitle'    },
  '/gorevler':      { title: 'page_tasks_title',          subtitle: 'page_tasks_subtitle'        },
  '/raporlar':      { title: 'page_reports_title',        subtitle: 'page_reports_subtitle'      },
  '/departmanlar':  { title: 'page_departments_title',    subtitle: 'page_departments_subtitle'  },
  '/kullanicilar':  { title: 'page_users_title',          subtitle: 'page_users_subtitle'        },
  '/mobil':         { title: 'page_mobile_title',         subtitle: 'page_mobile_subtitle'       },
  '/analizler':     { title: 'page_insights_title',       subtitle: 'page_insights_subtitle'     },
  '/dosyalar':      { title: 'page_files_title',          subtitle: 'page_files_subtitle'        },
  '/envanter':      { title: 'page_inventory_title',      subtitle: 'page_inventory_subtitle'    },
  '/stok':          { title: 'page_stock_title' as TranslationKey, subtitle: 'page_stock_subtitle' as TranslationKey },
  '/envanter-zeka': { title: 'page_inventory_intelligence_title' as TranslationKey, subtitle: 'page_inventory_intelligence_subtitle' as TranslationKey },
  '/ayarlar':       { title: 'page_settings_title',       subtitle: 'page_settings_subtitle'     },
}

export default function AppLayout() {
  const { pathname } = useLocation()
  const { zoom } = useTheme()
  const { t, lang } = useLanguage()
  const raw = PAGE_META[pathname]
  const meta = raw ? { title: t(raw.title), subtitle: t(raw.subtitle) } : { title: 'ActLedger' }

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('actledger_sidebar_collapsed') === 'true')

  // Block mobile/tablet/kiosk devices from accessing platform
  if (isMobileDevice()) {
    const tr = lang === 'tr'
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#0f172a' }}>
        <div className="max-w-md w-full text-center space-y-6">
          <BrandMark size={48} />
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <Smartphone size={28} className="text-red-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white mb-2">
              {tr ? 'Mobil Cihazdan Erisim Engellendi' : 'Mobile Device Access Blocked'}
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              {tr
                ? 'ActLedger platformuna yalnizca masaustu veya laptop bilgisayarlardan (Windows, macOS, Linux) erisebilirsiniz. Telefon, tablet veya kiosk cihazlarindan platforma giris yapilamaz.'
                : 'ActLedger platform can only be accessed from desktop or laptop computers (Windows, macOS, Linux). Access from phones, tablets, or kiosk devices is not permitted.'}
            </p>
          </div>
          <div className="flex items-center gap-3 justify-center text-slate-500">
            <Monitor size={20} />
            <span className="text-xs font-medium">
              {tr ? 'Masaustu / Laptop bilgisayar gereklidir' : 'Desktop / Laptop computer required'}
            </span>
          </div>
          <div className="pt-4 border-t border-slate-800">
            <p className="text-xs text-slate-500 mb-3">
              {tr ? 'Mobil saha uygulamasini kullanmak icin:' : 'To use the mobile field app:'}
            </p>
            <Link to="/m/giris" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-600 text-white text-sm font-semibold hover:bg-cyan-500 transition-colors">
              <Smartphone size={14} /> {tr ? 'Mobil Girise Git' : 'Go to Mobile Login'}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Auto-close drawer on route change
  useEffect(() => { setDrawerOpen(false) }, [pathname])

  // Lock body scroll while drawer is open on mobile
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [drawerOpen])

  return (
    <div className="app-bg">
      <Watermark />
      <Sidebar open={drawerOpen} collapsed={collapsed} onClose={() => setDrawerOpen(false)} />
      <div
        className={`sidebar-backdrop ${drawerOpen ? 'is-visible' : ''}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />
      <div className={`app-content ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <Header
          title={meta.title}
          subtitle={meta.subtitle}
          onMenuClick={() => setDrawerOpen(true)}
          onToggleCollapse={() => { const next = !collapsed; setCollapsed(next); localStorage.setItem('actledger_sidebar_collapsed', String(next)) }}
          sidebarCollapsed={collapsed}
        />
        <main className="app-main">
          <ToolsBar />
          {/* zoom is applied only to the scrollable content area, not the fixed sidebar/header */}
          <div
            className="p-6"
            style={{ zoom: pathname.startsWith('/harita') ? undefined : `${zoom}%` }}
            // re-mount animation on route change via key
            key={pathname}
          >
            <div className="animate-fade-up">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
