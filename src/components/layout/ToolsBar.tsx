import { useLocation, useNavigate } from 'react-router-dom'
import {
  FilePlus2, Search, Printer, RefreshCw, FileSpreadsheet,
  ChevronLeft, ChevronRight, Home, HelpCircle, FolderOpen, MapPin, BookOpen,
  BarChart3, Settings,
} from 'lucide-react'
import { useShortcutsContext } from '../../context/ShortcutsContext'
import { useLanguage } from '../../context/LanguageContext'

/**
 * SAP Business One inspired persistent tools bar.
 *
 * Sits between the header and the page content. Provides quick-access icons
 * for the most common actions: navigate, new, save, search, print, refresh,
 * export, filter - plus a help button that opens the keyboard shortcuts modal.
 *
 * Some buttons dispatch a CustomEvent that the active page can listen to,
 * so the toolbar stays decoupled from the page implementations.
 */

export const TOOLBAR_EVENTS = {
  newRecord:    'actledger:toolbar:new',
  search:       'actledger:toolbar:search',
  refresh:      'actledger:toolbar:refresh',
  exportExcel:  'actledger:toolbar:export',
  toggleFilter: 'actledger:toolbar:filter',
} as const

function dispatch(name: string) {
  window.dispatchEvent(new CustomEvent(name))
}

interface ToolButtonProps {
  icon: React.ReactNode
  label: string
  shortLabel?: string
  onClick: () => void
  disabled?: boolean
  variant?: 'default' | 'primary' | 'danger'
}

function ToolButton({ icon, label, shortLabel, onClick, disabled, variant = 'default' }: ToolButtonProps) {
  const tone =
    variant === 'primary' ? 'text-indigo-700 hover:bg-indigo-100 hover:text-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-200'
    : variant === 'danger' ? 'text-red-600 hover:bg-red-50 hover:text-red-800 dark:text-red-400 dark:hover:bg-red-900/30'
    : 'text-zinc-700 hover:bg-zinc-100 hover:text-indigo-700 dark:text-zinc-100 dark:hover:bg-white/10 dark:hover:text-indigo-300'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-help={label}
      title={label}
      aria-label={label}
      className={`flex items-center gap-1.5 h-8 px-2 rounded-md font-semibold text-[13px] transition-colors disabled:opacity-30 disabled:hover:bg-transparent ${tone}`}
    >
      {icon}
      <span className="hidden lg:inline text-[11px]">{shortLabel ?? label}</span>
    </button>
  )
}

function Divider() {
  return <div className="w-px h-6 mx-1.5" style={{ background: 'var(--border)' }} />
}

export default function ToolsBar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { setHelpOpen } = useShortcutsContext()
  const { t, lang } = useLanguage()

  const handlePrint   = () => window.print()
  const handleHome    = () => navigate('/panel')
  const handleBack    = () => navigate(-1)
  const handleForward = () => navigate(1)

  // Page-aware action labels
  const newLabel = pathname.startsWith('/gorevler')      ? t('toolbar_new_task')
                 : pathname.startsWith('/raporlar')      ? t('toolbar_new_report')
                 : pathname.startsWith('/kullanicilar')  ? t('toolbar_new_user')
                 : pathname.startsWith('/departmanlar')  ? t('toolbar_new_department')
                 : pathname.startsWith('/dosyalar')      ? t('toolbar_new_folder')
                 : pathname.startsWith('/envanter')      ? t('toolbar_new_inventory')
                 : pathname.startsWith('/mobil')         ? t('toolbar_new_broadcast')
                 : t('toolbar_new_record')

  // Detect which buttons make sense on the current page
  const isPanelPage  = pathname.startsWith('/panel')
  const isFilterable = isPanelPage
                    || pathname.startsWith('/gorevler')
                    || pathname.startsWith('/raporlar')
                    || pathname.startsWith('/kullanicilar')
                    || pathname.startsWith('/envanter')

  return (
    <div
      className="flex items-center gap-0.5 px-3 py-1 border-b print:hidden overflow-x-auto scrollbar-hide"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 25,
      }}
    >
      {/* Navigation cluster */}
      <ToolButton icon={<Home         size={16} />} label={t('toolbar_home')} shortLabel={t('toolbar_home_short')} onClick={handleHome} />
      <ToolButton icon={<ChevronLeft  size={16} />} label={t('toolbar_back')}    onClick={handleBack} />
      <ToolButton icon={<ChevronRight size={16} />} label={t('toolbar_forward')} onClick={handleForward} />

      <Divider />

      {/* Data ops */}
      <ToolButton icon={<Search       size={16} />} label={t('toolbar_search')} shortLabel={t('toolbar_search_short')} onClick={() => dispatch(TOOLBAR_EVENTS.search)} />
      <ToolButton icon={<RefreshCw      size={16} />} label={t('toolbar_refresh')}                                        onClick={() => dispatch(TOOLBAR_EVENTS.refresh)} />
      <ToolButton icon={<FileSpreadsheet size={16}/>} label={t('toolbar_export')} shortLabel={t('toolbar_export_short')}   onClick={() => dispatch(TOOLBAR_EVENTS.exportExcel)} />
      <ToolButton icon={<Printer        size={16} />} label={t('toolbar_print')}                                           onClick={handlePrint} />

      <Divider />

      {/* Utility */}
      <ToolButton icon={<FolderOpen     size={16} />} label={t('toolbar_files')}                                           onClick={() => navigate('/dosyalar')} />
      <ToolButton icon={<BookOpen       size={16} />} label={lang === 'tr' ? 'Kullanım Kılavuzu' : 'User Guide'}          onClick={() => navigate('/manuel')} />
      <ToolButton icon={<HelpCircle     size={16} />} label={t('toolbar_shortcuts')} shortLabel={t('toolbar_help')}        onClick={() => setHelpOpen(true)} />

      {/* Right side - current path breadcrumb */}
      <div className="flex-1" />
      <div className="hidden md:flex items-center gap-1.5 text-[11px] font-mono pr-1 flex-shrink-0" style={{ color: 'var(--text-3)' }}>
        <MapPin size={11} />
        <span className="font-semibold">{pathname}</span>
      </div>
    </div>
  )
}
