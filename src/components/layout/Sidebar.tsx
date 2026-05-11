import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, CheckSquare, FileText, Building2,
  Users, Smartphone, Settings, LogOut, Cpu, FolderOpen, Package, Radio, MapPin,
  ZoomIn, ZoomOut, RotateCcw, Target, Boxes, Zap, GitBranch, ScanLine, MessageSquare,
  ClipboardList, ShoppingCart, Calculator, UserCog,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../../context/AuthContext'
import { useCompany } from '../../context/CompanyContext'
import { useLanguage } from '../../context/LanguageContext'
import { useTheme } from '../../context/ThemeContext'
import BrandMark from '../ui/BrandMark'
import { ROLE_HIERARCHY } from '../../types'
import type { UserRole } from '../../types'
import type { TranslationKey } from '../../i18n/translations'

interface SidebarProps {
  open?:      boolean
  collapsed?: boolean
  onClose?:   () => void
}

export default function Sidebar({ open = false, collapsed = false, onClose }: SidebarProps) {
  const { user, logout, hasModule } = useAuth()
  const { config, sector } = useCompany()
  const { t, lang } = useLanguage()
  const { sidebarFontScale, setSidebarFontScale } = useTheme()

  type NavItem = {
    to:        string
    icon:      typeof LayoutDashboard
    label:     string
    desc:      string
    shortcut?: string
    badge?:    string
    operiq?:   boolean
    minLevel?: number  // Minimum role level to see this menu item
    moduleCode?: string // ERP module code - only show if company has this module
  }

  const userLevel = user ? ROLE_HIERARCHY[user.role as UserRole] ?? 1 : 1

  const NAV: { label: string; items: NavItem[] }[] = [
    {
      label: t('sidebar_section_ops'),
      items: [
        { to: '/panel',    icon: LayoutDashboard, label: t('nav_dashboard'), desc: t('tooltip_dashboard' as TranslationKey), shortcut: 'g d' },
        { to: '/gorevler',  icon: CheckSquare,     label: t('nav_tasks'),     desc: t('tooltip_tasks' as TranslationKey),     shortcut: 'g t' },
        { to: '/is-siparisleri', icon: ClipboardList, label: lang === 'tr' ? '\u0130\u015f Sipari\u015fleri' : 'Work Orders', desc: lang === 'tr' ? 'Departmanlar aras\u0131 i\u015f sipari\u015fleri' : 'Cross-department work orders', minLevel: 4 },
        { to: '/raporlar',  icon: FileText,        label: t('nav_reports'),   desc: t('tooltip_reports' as TranslationKey),   shortcut: 'g r' },
        { to: '/harita',    icon: MapPin,          label: lang === 'tr' ? 'Operasyon & Tesis' : 'Operations & Facility', desc: lang === 'tr' ? 'Canl\u0131 harita ve tesis kat planlar\u0131' : 'Live map and facility floor plans',    shortcut: 'g h', minLevel: 4 },
      ],
    },
    {
      label: t('sidebar_section_org'),
      items: [
        { to: '/departmanlar', icon: Building2,  label: t('nav_departments'), desc: t('tooltip_departments' as TranslationKey), shortcut: 'g p', minLevel: 5 },
        { to: '/kullanicilar', icon: Users,      label: t('nav_users'),       desc: t('tooltip_users' as TranslationKey),       shortcut: 'g u', minLevel: 5 },
        { to: '/dosyalar',     icon: FolderOpen, label: t('nav_files'),       desc: t('tooltip_files' as TranslationKey),       shortcut: 'g f' },
        { to: '/envanter',     icon: Package,    label: t('nav_inventory'),   desc: t('tooltip_inventory' as TranslationKey),   shortcut: 'g e', minLevel: 4 },
        { to: '/stok',         icon: Boxes,      label: t('nav_stock' as TranslationKey), desc: t('tooltip_stock' as TranslationKey), shortcut: 'g q', minLevel: 4 },
        { to: '/iot',          icon: Radio,      label: 'IoT',                desc: 'IoT cihaz ve sens\u00f6r y\u00f6netimi',              shortcut: 'g o', minLevel: 5 },
        { to: '/envanter-zeka', icon: ScanLine,  label: 'AssetIQ', desc: 'AssetIQ', shortcut: 'g z', minLevel: 4 },
      ],
    },
    {
      label: t('sidebar_section_plat'),
      items: [
        { to: '/mobil',     icon: Smartphone, label: t('nav_mobile'),   desc: t('tooltip_mobile' as TranslationKey),   shortcut: 'g m', minLevel: 5 },
        { to: '/kpi-panel', icon: Target,     label: 'KPI',             desc: 'KPI Ajandas\u0131 ve Analizi',                shortcut: 'g k' },
        { to: '/otomasyon',   icon: Zap,       label: t('nav_automation' as TranslationKey), desc: t('tooltip_automation' as TranslationKey), shortcut: 'g a', minLevel: 6 },
        { to: '/is-akislari', icon: GitBranch, label: t('nav_workflows' as TranslationKey),  desc: t('tooltip_workflows' as TranslationKey),  shortcut: 'g w', minLevel: 6 },
        { to: '/analizler', icon: Cpu,        label: 'OperIQ',          desc: t('tooltip_insights' as TranslationKey), shortcut: 'g i', operiq: true, minLevel: 5 },
        { to: '/ayarlar',   icon: Settings,   label: t('nav_settings'), desc: t('tooltip_settings' as TranslationKey), shortcut: 'g s' },
      ],
    },
    {
      label: 'ERP',
      items: [
        { to: '/satis',            icon: ShoppingCart, label: lang === 'tr' ? 'Satis' : 'Sales',             desc: lang === 'tr' ? 'Musteri, siparis ve POS yonetimi' : 'Customer, order and POS management', minLevel: 4, moduleCode: 'SALES' },
        { to: '/muhasebe',         icon: Calculator,   label: lang === 'tr' ? 'Muhasebe' : 'Accounting',      desc: lang === 'tr' ? 'Hesap plani, yevmiye, e-fatura' : 'Chart of accounts, journal, e-invoice', minLevel: 4, moduleCode: 'ACCOUNTING' },
        { to: '/insan-kaynaklari', icon: UserCog,      label: lang === 'tr' ? 'Insan Kaynaklari' : 'HR',      desc: lang === 'tr' ? 'Calisan, izin ve bordro yonetimi' : 'Employee, leave and payroll management', minLevel: 4, moduleCode: 'HR' },
      ],
    },
  ]

  return (
    <aside className={clsx('sidebar', open && 'is-open', collapsed && 'is-collapsed')}>
      {/* Logo */}
      <div className="sidebar-logo">
        <BrandMark version={config?.appVersion} />
      </div>

      {/* Company Badge */}
      {config && (
        <div className="px-3 pt-3 pb-1.5">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-white/[0.06] border border-white/[0.08]">
            <div className="w-7 h-7 rounded-md bg-white/[0.08] flex items-center justify-center text-[14px] flex-shrink-0 border border-white/[0.05]">
              {sector?.icon ?? '🏢'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-white truncate leading-tight">
                {config.companyName}
              </p>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-none font-medium">
                {sector?.shortName ?? t('common_general')} · {config.deploymentMode === 'on-premise' ? 'On-Premise' : 'Cloud'}
              </p>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.6)]" title={t('common_active')} />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-1 scrollbar-hide">
        {NAV.map(section => {
          const visibleItems = section.items.filter(item =>
            (!item.minLevel || userLevel >= item.minLevel) &&
            (!item.moduleCode || hasModule(item.moduleCode))
          )
          if (visibleItems.length === 0) return null
          return (
          <div key={section.label} className="sidebar-section">
            <p className="sidebar-section-label">{section.label}</p>
            {visibleItems.map(item => (
              <div key={item.to} className="nav-item-wrap">
                <NavLink
                  to={item.to}
                  onClick={() => onClose?.()}
                  className={({ isActive }) =>
                    clsx('nav-item', isActive && 'active', item.operiq && 'nav-operiq')
                  }
                >
                  <item.icon className="nav-item-icon" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.operiq && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide bg-teal-500/20 text-teal-400 border border-teal-500/20">
                      AI
                    </span>
                  )}
                  {item.badge && !item.operiq && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide bg-blue-600/25 text-blue-300">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
                {/* Tooltip */}
                <div className="nav-item-tooltip">
                  <div className="nav-item-tooltip-title">{item.label}</div>
                  <div className="nav-item-tooltip-desc">{item.desc}</div>
                  {item.shortcut && (
                    <div className="nav-item-tooltip-shortcut">
                      {item.shortcut.split(' ').map((k, i) => (
                        <kbd key={i}>{k}</kbd>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )})}
      </nav>

      {/* Sidebar font zoom */}
      <div className="border-t border-white/[0.08] px-4 py-2 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setSidebarFontScale(sidebarFontScale - 10)}
          disabled={sidebarFontScale <= 50}
          className="p-1.5 rounded hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors disabled:opacity-30"
        >
          <ZoomOut size={13} />
        </button>
        <button
          type="button"
          onClick={() => setSidebarFontScale(100)}
          className="flex-1 text-center text-[10px] font-mono font-medium text-slate-400 hover:text-white transition-colors"
        >
          {sidebarFontScale}%
        </button>
        <button
          type="button"
          onClick={() => setSidebarFontScale(sidebarFontScale + 10)}
          disabled={sidebarFontScale >= 200}
          className="p-1.5 rounded hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors disabled:opacity-30"
        >
          <ZoomIn size={13} />
        </button>
      </div>

      {/* User */}
      {user && (
        <div className="border-t border-white/[0.08] p-3">
          <div className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg hover:bg-white/[0.06] transition-colors group">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 ring-2 ring-white/[0.1]">
              <span className="text-white text-[12px] font-bold">
                {user.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-white truncate leading-tight">{user.name}</p>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-none font-medium">{t(`role_${user.role}` as any)}</p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="opacity-60 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-400 p-1.5 rounded hover:bg-white/[0.08]"
              title={t('header_logout')}
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
