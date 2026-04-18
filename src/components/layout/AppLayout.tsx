import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import Watermark from './Watermark'
import ToolsBar from './ToolsBar'
import { useTheme } from '../../context/ThemeContext'
import { useLanguage } from '../../context/LanguageContext'
import type { TranslationKey } from '../../i18n/translations'

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
  '/ayarlar':       { title: 'page_settings_title',       subtitle: 'page_settings_subtitle'     },
}

export default function AppLayout() {
  const { pathname } = useLocation()
  const { zoom } = useTheme()
  const { t } = useLanguage()
  const raw = PAGE_META[pathname]
  const meta = raw ? { title: t(raw.title), subtitle: t(raw.subtitle) } : { title: 'ActLedger' }

  const [drawerOpen, setDrawerOpen] = useState(false)

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
      <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div
        className={`sidebar-backdrop ${drawerOpen ? 'is-visible' : ''}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />
      <div className="app-content">
        <Header
          title={meta.title}
          subtitle={meta.subtitle}
          onMenuClick={() => setDrawerOpen(true)}
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
