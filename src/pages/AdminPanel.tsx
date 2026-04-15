import { useState, useEffect } from 'react'
import {
  Building2, Shield, Layers, Users, Settings as SettingsIcon,
  Save, CheckCircle, Languages, LogOut, ChevronRight, ZoomIn, ZoomOut,
  Plus, Trash2, Eye, EyeOff, ChevronDown, Smartphone, Copy, RefreshCw,
  KeyRound, X,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../context/AuthContext'
import { useCompany } from '../context/CompanyContext'
import { useLanguage } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'
import { SECTORS } from '../data/sectors'
import { useDepartments, useUsers, createUser, deleteUser, createDepartment, deleteDepartment } from '../lib/hooks'
import { api } from '../lib/api'
import { ROLE_LABELS, type UserRole } from '../types'
import { getPositionTemplate, savePositionTemplate } from '../data/positionTemplates'
import SectorApplyModal from '../components/settings/SectorApplyModal'
import BrandMark from '../components/ui/BrandMark'

type AdminTab = 'company' | 'sector' | 'template' | 'departments' | 'positions' | 'users' | 'mobile' | 'system'

const ROLE_OPTIONS: { key: string; label: string; level: number; descTr: string; descEn: string }[] = [
  { key: 'platform_admin', label: 'Seviye 9', level: 9, descTr: 'Tam yetki. Sektor, sablon, kullanici yonetimi.', descEn: 'Full access. Sector, template, user management.' },
  { key: 'genel_mudur', label: 'Seviye 8', level: 8, descTr: 'Tum departman ve verilere erisim. KPI yonetimi.', descEn: 'Access to all departments and data. KPI management.' },
  { key: 'gm_yardimcisi', label: 'Seviye 7', level: 7, descTr: 'Ust yonetim yetkileri. Departmanlar arasi koordinasyon.', descEn: 'Senior management authority. Cross-department coordination.' },
  { key: 'direktor', label: 'Seviye 6', level: 6, descTr: 'Birden fazla departmanin stratejik yonetimi.', descEn: 'Strategic management of multiple departments.' },
  { key: 'mudur', label: 'Seviye 5', level: 5, descTr: 'Departman yonetimi. KPI ekleme/duzenleme/silme yetkisi.', descEn: 'Department management. KPI add/edit/delete authority.' },
  { key: 'supervizor', label: 'Seviye 4', level: 4, descTr: 'Ekip yonetimi. Gorev atama ve takip.', descEn: 'Team management. Task assignment and tracking.' },
  { key: 'muhendis', label: 'Seviye 3', level: 3, descTr: 'Teknik gorevler. Rapor olusturma.', descEn: 'Technical tasks. Report creation.' },
  { key: 'teknisyen', label: 'Seviye 2', level: 2, descTr: 'Saha gorevleri. Rapor ve checklist doldurma.', descEn: 'Field tasks. Report and checklist completion.' },
  { key: 'isci', label: 'Seviye 1', level: 1, descTr: 'Temel gorev goruntuleme ve tamamlama.', descEn: 'Basic task viewing and completion.' },
]

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="surface p-6 space-y-4">
      <div>
        <h3 className="text-[15px] font-bold" style={{ color: 'var(--text-1)' }}>{title}</h3>
        {desc && <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-3)' }}>{desc}</p>}
      </div>
      {children}
    </div>
  )
}

export default function AdminPanel() {
  const { user, logout } = useAuth()
  const { config, sector, updateSector, updateCompanyName } = useCompany()
  const { lang, setLang, t } = useLanguage()
  const { zoom, zoomIn, zoomOut, resetZoom } = useTheme()
  const [tab, setTab] = useState<AdminTab>('company')
  const [companyName, setCompanyName] = useState(config?.companyName ?? '')
  const [saved, setSaved] = useState(false)
  const [applyOpen, setApplyOpen] = useState(false)

  const saveCompanyName = () => {
    updateCompanyName(companyName)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const TABS: { key: AdminTab; icon: typeof Building2; label: string }[] = [
    { key: 'company',  icon: Building2,     label: lang === 'tr' ? 'Firma Kurulumu' : 'Company Setup' },
    { key: 'sector',   icon: Layers,        label: lang === 'tr' ? 'Sektor Secimi' : 'Sector Selection' },
    { key: 'template', icon: SettingsIcon,   label: lang === 'tr' ? 'Sablon Uygulama' : 'Apply Template' },
    { key: 'departments', icon: Building2,  label: lang === 'tr' ? 'Departman Yonetimi' : 'Department Management' },
    { key: 'positions', icon: Shield,       label: lang === 'tr' ? 'Kadro & Gorev' : 'Positions & Titles' },
    { key: 'users',    icon: Users,         label: lang === 'tr' ? 'Kullanici Yonetimi' : 'User Management' },
    { key: 'mobile',   icon: Smartphone,    label: lang === 'tr' ? 'Mobil Kullanicilar' : 'Mobile Users' },
    { key: 'system',   icon: Shield,        label: lang === 'tr' ? 'Sistem Bilgileri' : 'System Info' },
  ]

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header className="border-b px-6 py-3 flex items-center justify-between" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-4">
          <BrandMark />
          <div className="h-6 w-px" style={{ background: 'var(--border)' }} />
          <div>
            <h1 className="text-[14px] font-bold" style={{ color: 'var(--text-1)' }}>Admin Panel</h1>
            <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>
              {lang === 'tr' ? 'Key Account Manager - Kurulum ve Yapilandirma' : 'Key Account Manager - Setup & Configuration'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-medium px-2 py-0.5 rounded-full border" style={{ color: 'var(--text-3)', borderColor: 'var(--border)' }}>
            ATAOL AI Techs tarafindan gelistirildi.
          </span>

          {/* Zoom controls */}
          <div className="flex items-center rounded border" style={{ borderColor: 'var(--border)' }}>
            <button type="button" onClick={zoomOut} disabled={zoom <= 70} className="px-1.5 py-1 hover:bg-zinc-100 disabled:opacity-30 transition-colors" style={{ color: 'var(--text-2)' }}>
              <ZoomOut size={13} />
            </button>
            <button type="button" onClick={resetZoom} className="px-2 text-[10px] font-mono font-medium tabular-nums" style={{ color: 'var(--text-2)', minWidth: '2.5rem', textAlign: 'center' }}>
              {zoom}%
            </button>
            <button type="button" onClick={zoomIn} disabled={zoom >= 200} className="px-1.5 py-1 hover:bg-zinc-100 disabled:opacity-30 transition-colors" style={{ color: 'var(--text-2)' }}>
              <ZoomIn size={13} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setLang(lang === 'tr' ? 'en' : 'tr')}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-bold transition-colors hover:bg-zinc-100"
            style={{ color: 'var(--text-2)' }}
          >
            <span className="text-[14px]">{lang === 'tr' ? '\u{1F1F9}\u{1F1F7}' : '\u{1F1FA}\u{1F1F8}'}</span>
            {lang.toUpperCase()}
          </button>
          {user && (
            <div className="flex items-center gap-2 pl-3 border-l" style={{ borderColor: 'var(--border)' }}>
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">
                  {user.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </span>
              </div>
              <div>
                <p className="text-[11px] font-semibold" style={{ color: 'var(--text-1)' }}>{user.name}</p>
                <p className="text-[9px]" style={{ color: 'var(--text-3)' }}>Platform Admin</p>
              </div>
              <button type="button" onClick={logout} className="ml-2 text-zinc-400 hover:text-red-500 transition-colors">
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-56 min-h-[calc(100vh-57px)] border-r p-3 space-y-1" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={clsx(
                'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[12px] font-medium transition-all text-left',
                tab === t.key
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'hover:bg-zinc-50'
              )}
              style={tab !== t.key ? { color: 'var(--text-2)' } : undefined}
            >
              <t.icon size={15} />
              {t.label}
              {tab === t.key && <ChevronRight size={12} className="ml-auto" />}
            </button>
          ))}
        </aside>

        {/* Content */}
        <main className="flex-1 p-6 space-y-5 max-w-3xl" style={{ zoom: `${zoom}%` }}>
          {tab === 'company' && (
            <>
              <Section title={lang === 'tr' ? 'Firma Bilgileri' : 'Company Information'} desc={lang === 'tr' ? 'Platforma kayitli firma adi ve temel bilgiler' : 'Registered company name and basic information'}>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-3)' }}>
                    {lang === 'tr' ? 'Firma Adi' : 'Company Name'}
                  </label>
                  <div className="flex gap-2">
                    <input className="input flex-1" value={companyName} onChange={e => setCompanyName(e.target.value)} />
                    <button
                      type="button"
                      onClick={saveCompanyName}
                      className={clsx('btn-dark btn-sm whitespace-nowrap', saved && 'bg-emerald-600 border-emerald-700')}
                    >
                      {saved ? <><CheckCircle size={13} /> Kaydedildi</> : <><Save size={13} /> Kaydet</>}
                    </button>
                  </div>
                </div>
              </Section>

              <Section title={lang === 'tr' ? 'Lisans Bilgileri' : 'License Information'} desc={lang === 'tr' ? 'Aktif lisans durumu ve sistem limitleri' : 'Active license status and system limits'}>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: lang === 'tr' ? 'Lisans Tipi' : 'License Type', value: config?.licenseType?.toUpperCase() ?? '-' },
                    { label: lang === 'tr' ? 'Lisans Anahtari' : 'License Key', value: config?.licenseKey ?? '-' },
                    { label: lang === 'tr' ? 'Maks. Kullanici' : 'Max Users', value: config?.maxUsers?.toString() ?? '-' },
                    { label: lang === 'tr' ? 'Maks. Departman' : 'Max Departments', value: config?.maxDepartments?.toString() ?? '-' },
                    { label: lang === 'tr' ? 'Dagitim Modu' : 'Deployment Mode', value: config?.deploymentMode === 'on-premise' ? 'On-Premise' : 'Cloud' },
                    { label: lang === 'tr' ? 'Versiyon' : 'Version', value: `v${config?.appVersion ?? '?'}` },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--border-subtle)' }}>
                      <span className="text-[11px] font-medium" style={{ color: 'var(--text-3)' }}>{item.label}</span>
                      <span className="text-[12px] font-semibold font-mono" style={{ color: 'var(--text-1)' }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </Section>
            </>
          )}

          {tab === 'sector' && (
            <Section title={lang === 'tr' ? 'Sektor Yapilandirmasi' : 'Sector Configuration'} desc={lang === 'tr' ? 'Firmanin faaliyet alani. Bu secim departman sablonlarini, KPI setlerini ve platform terminolojisini belirler.' : 'Company industry. This selection determines department templates, KPI sets and platform terminology.'}>
              <p className="text-[12px] p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 font-medium">
                {lang === 'tr'
                  ? 'Sektor secimi firma kurulumunda bir kez yapilir. Degistirilmesi mevcut departman ve KPI yapisini etkileyebilir.'
                  : 'Sector is selected once during company setup. Changing it may affect existing department and KPI structure.'}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                {SECTORS.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => updateSector(s.id)}
                    className={clsx(
                      'flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all',
                      sector?.id === s.id
                        ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                        : 'border-zinc-200 bg-white hover:border-zinc-300'
                    )}
                  >
                    <span className="text-lg flex-shrink-0 mt-0.5">{s.icon}</span>
                    <div>
                      <p className={clsx('text-[12px] font-semibold', sector?.id === s.id ? 'text-indigo-700' : 'text-zinc-800')}>
                        {s.shortName}
                      </p>
                      <p className="text-[10px] text-zinc-400 mt-0.5 leading-snug">{s.name}</p>
                    </div>
                  </button>
                ))}
              </div>

              {sector && (
                <div className="p-4 rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--border-subtle)' }}>
                  <p className="text-[11px] font-bold mb-2" style={{ color: 'var(--text-2)' }}>{lang === 'tr' ? 'Secili Sektor' : 'Selected Sector'}: {sector.name}</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                    {Object.entries(sector.terminology).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2 text-[11px]">
                        <span className="text-zinc-400 capitalize">{k}:</span>
                        <span className="font-medium" style={{ color: 'var(--text-1)' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] mt-3" style={{ color: 'var(--text-3)' }}>
                    {sector.departmentTemplates.length} {lang === 'tr' ? 'departman sablonu hazir' : 'department templates ready'}
                  </p>
                </div>
              )}
            </Section>
          )}

          {tab === 'template' && (
            <Section title={lang === 'tr' ? 'Departman ve KPI Sablonu Uygulama' : 'Apply Department & KPI Template'} desc={lang === 'tr' ? 'Secili sektorun varsayilan departman ve KPI yapisini firmaya uygulayin.' : 'Apply default department and KPI structure of the selected sector to the company.'}>
              {!sector ? (
                <p className="text-[12px] text-red-600 font-medium">{lang === 'tr' ? "Once 'Sektor Secimi' sekmesinden bir sektor secin." : "First select a sector from the 'Sector Selection' tab."}</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--border-subtle)' }}>
                    <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <Layers size={22} className="text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[14px] font-bold" style={{ color: 'var(--text-1)' }}>{sector.icon} {sector.name}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>{sector.description}</p>
                      <p className="text-[11px] mt-1 font-medium" style={{ color: 'var(--text-2)' }}>
                        {sector.departmentTemplates.length} {lang === 'tr' ? 'departman sablonu' : 'department templates'}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-dark btn-sm whitespace-nowrap"
                      onClick={() => setApplyOpen(true)}
                    >
                      <Layers size={13} /> {lang === 'tr' ? 'Sablonu Uygula' : 'Apply Template'}
                    </button>
                  </div>

                  <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 text-[11px] text-blue-800">
                    {lang === 'tr'
                      ? 'Bu islem mevcut departmanlara dokunmaz; sadece secilenleri ekler. Birden fazla kez calistirilabilir.'
                      : 'This operation does not touch existing departments; it only adds the selected ones. Can be run multiple times.'}
                  </div>
                </div>
              )}
            </Section>
          )}

          {tab === 'departments' && <AdminDepartmentManager lang={lang} />}

          {tab === 'positions' && sector && <AdminPositionManager lang={lang} sectorId={sector.id} />}

          {tab === 'users' && <AdminUserManagement lang={lang} sectorId={sector?.id ?? 'manufacturing'} />}

          {tab === 'mobile' && <AdminMobileUsers lang={lang} />}

          {tab === 'system' && (
            <Section title={lang === 'tr' ? 'Sistem Ozellikleri' : 'System Features'} desc={lang === 'tr' ? 'Lisans kapsamindaki platform ozellikleri' : 'Platform features included in the license'}>
              <div className="space-y-2">
                {Object.entries(config?.features ?? {}).map(([key, enabled]) => {
                  const labels: Record<string, string> = lang === 'tr' ? {
                    geminiAI: 'OperIQ Analiz Motoru',
                    mobileApp: 'Mobil Uygulama',
                    advancedReports: 'Gelismis Raporlama',
                    customForms: 'Ozel Form Olusturucu',
                    messaging: 'Saha Mesajlasma',
                  } : {
                    geminiAI: 'OperIQ Analytics Engine',
                    mobileApp: 'Mobile App',
                    advancedReports: 'Advanced Reporting',
                    customForms: 'Custom Form Builder',
                    messaging: 'Field Messaging',
                  }
                  return (
                    <div key={key} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--border-subtle)' }}>
                      <span className="text-[12px] font-medium" style={{ color: 'var(--text-1)' }}>{labels[key] ?? key}</span>
                      <span className={clsx('text-[11px] font-semibold px-2 py-0.5 rounded-full', enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500')}>
                        {enabled ? (lang === 'tr' ? 'Aktif' : 'Active') : (lang === 'tr' ? 'Pasif' : 'Inactive')}
                      </span>
                    </div>
                  )
                })}
              </div>
            </Section>
          )}
        </main>
      </div>

      {applyOpen && sector && (
        <SectorApplyModal
          sectorId={sector.id}
          onClose={() => setApplyOpen(false)}
          onApplied={() => setApplyOpen(false)}
        />
      )}
    </div>
  )
}

/* ── Admin User Management Component ──────────────────────────────────────── */
function AdminUserManagement({ lang, sectorId }: { lang: 'tr' | 'en'; sectorId: string }) {
  const { departments } = useDepartments()
  const { users, loading, refetch } = useUsers({})
  const [showForm, setShowForm] = useState(false)

  // Detail card expand state
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)
  const [detailData, setDetailData] = useState<Record<string, { lastPassword?: string; loading?: boolean }>>({})

  // Password view popup state
  const [pwPopup, setPwPopup] = useState<{ userId: string; password: string } | null>(null)
  const [pwPopupLoading, setPwPopupLoading] = useState<string | null>(null)

  // Password reset inline state
  const [resetState, setResetState] = useState<{ userId: string; newPassword: string; status?: 'ok' | 'err'; msg?: string } | null>(null)

  const handleDeleteUser = async (id: string, name: string) => {
    const confirmed = window.confirm(
      lang === 'tr'
        ? `"${name}" kullanicisini silmek istediginize emin misiniz? Bu islem geri alinamaz.`
        : `Are you sure you want to delete "${name}"? This action cannot be undone.`
    )
    if (!confirmed) return
    try {
      await deleteUser(id)
      refetch()
    } catch {}
  }

  const handleToggleDetail = async (userId: string) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null)
      return
    }
    setExpandedUserId(userId)
    // Fetch last password for detail card
    if (!detailData[userId]?.lastPassword) {
      setDetailData(prev => ({ ...prev, [userId]: { loading: true } }))
      try {
        const res = await api.get<{ name: string; email: string; loginCode: string; lastPassword: string }>(`/users/${userId}/last-password`)
        setDetailData(prev => ({ ...prev, [userId]: { lastPassword: res.lastPassword, loading: false } }))
      } catch {
        setDetailData(prev => ({ ...prev, [userId]: { lastPassword: '-', loading: false } }))
      }
    }
  }

  const handleViewPassword = async (userId: string) => {
    setPwPopupLoading(userId)
    try {
      const res = await api.get<{ name: string; email: string; loginCode: string; lastPassword: string }>(`/users/${userId}/last-password`)
      setPwPopup({ userId, password: res.lastPassword })
    } catch {
      setPwPopup({ userId, password: 'Hata - alinamadi' })
    } finally {
      setPwPopupLoading(null)
    }
  }

  const handleResetPassword = async (userId: string, newPassword: string) => {
    if (!newPassword || newPassword.length < 6) {
      setResetState({ userId, newPassword, status: 'err', msg: lang === 'tr' ? 'En az 6 karakter' : 'Min 6 characters' })
      return
    }
    try {
      await api.post(`/users/${userId}/reset-password`, { newPassword })
      setResetState({ userId, newPassword: '', status: 'ok', msg: lang === 'tr' ? 'Sifre sifirlandi' : 'Password reset' })
      // Update cached detail data
      setDetailData(prev => ({ ...prev, [userId]: { ...prev[userId], lastPassword: newPassword } }))
      setTimeout(() => setResetState(null), 2000)
    } catch {
      setResetState({ userId, newPassword, status: 'err', msg: lang === 'tr' ? 'Hata olustu' : 'Error occurred' })
    }
  }

  return (
    <div className="space-y-5">
      <Section
        title={lang === 'tr' ? 'Kullanici Yonetimi' : 'User Management'}
        desc={lang === 'tr' ? 'Sisteme yeni kullanici ekleyin, mevcut kullanicilari goruntuleyin veya cikartin' : 'Add new users, view or remove existing users'}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] font-semibold" style={{ color: 'var(--text-1)' }}>
              {loading ? '...' : `${users.length} ${lang === 'tr' ? 'kullanici' : 'users'}`}
            </p>
            <button type="button" className="btn-dark btn-sm" onClick={() => setShowForm(!showForm)}>
              <Plus size={13} /> {lang === 'tr' ? 'Yeni Kullanici' : 'New User'}
            </button>
          </div>

          {showForm && (
            <AdminUserForm
              lang={lang}
              departments={departments}
              sectorId={sectorId}
              onCreated={() => { setShowForm(false); refetch() }}
              onCancel={() => setShowForm(false)}
            />
          )}

          {/* Existing users list */}
          {!loading && users.length > 0 && (
            <div className="space-y-2 mt-4">
              {users.map((u, idx) => {
                const isExpanded = expandedUserId === u.id
                const detail = detailData[u.id]
                const dept = departments.find(d => d.id === u.departmentId)
                const isResetOpen = resetState?.userId === u.id
                const isPwVisible = pwPopup?.userId === u.id

                return (
                  <div key={u.id} className="rounded-lg overflow-hidden" style={{ background: 'var(--border-subtle)', border: '1px solid var(--border)' }}>
                    {/* Main row */}
                    <div className="flex items-center gap-3 p-3">
                      {/* Sequence number */}
                      <span className="text-[11px] font-bold flex-shrink-0 w-5 text-right" style={{ color: 'var(--text-3)' }}>#{idx + 1}</span>

                      {/* Avatar - clickable */}
                      <button type="button" onClick={() => handleToggleDetail(u.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-[11px] font-bold">{u.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-1)' }}>{u.name}</p>
                          <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>{u.email}</p>
                        </div>
                        <ChevronDown size={14} className={clsx('flex-shrink-0 transition-transform', isExpanded && 'rotate-180')} style={{ color: 'var(--text-3)' }} />
                      </button>

                      {/* Role badge */}
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
                        {ROLE_LABELS[u.role]}
                      </span>

                      {/* Active dot */}
                      <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', u.active ? 'bg-emerald-500' : 'bg-zinc-400')} />

                      {/* Password view button */}
                      <div className="relative flex-shrink-0">
                        <button type="button" onClick={() => isPwVisible ? setPwPopup(null) : handleViewPassword(u.id)}
                          className="p-1.5 rounded hover:bg-blue-50 text-zinc-400 hover:text-blue-500 transition-colors"
                          title={lang === 'tr' ? 'Sifre Gor' : 'View Password'}>
                          {pwPopupLoading === u.id ? (
                            <RefreshCw size={13} className="animate-spin" />
                          ) : (
                            <Eye size={13} />
                          )}
                        </button>
                        {/* Password popup tooltip */}
                        {isPwVisible && (
                          <div className="absolute right-0 top-full mt-1 z-20 px-3 py-2 rounded-lg shadow-lg text-[12px] font-mono whitespace-nowrap"
                            style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text-1)' }}>
                            <div className="flex items-center gap-2">
                              <KeyRound size={11} style={{ color: 'var(--text-3)' }} />
                              <span className="font-bold">{pwPopup.password}</span>
                              <button type="button" onClick={() => { navigator.clipboard.writeText(pwPopup.password); }}
                                className="p-0.5 rounded hover:bg-blue-50 text-zinc-400 hover:text-blue-500 transition-colors"
                                title={lang === 'tr' ? 'Kopyala' : 'Copy'}>
                                <Copy size={11} />
                              </button>
                              <button type="button" onClick={() => setPwPopup(null)}
                                className="p-0.5 rounded hover:bg-red-50 text-zinc-400 hover:text-red-400 transition-colors">
                                <X size={11} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Password reset button */}
                      <button type="button" onClick={() => setResetState(isResetOpen ? null : { userId: u.id, newPassword: '' })}
                        className="p-1.5 rounded hover:bg-amber-50 text-zinc-400 hover:text-amber-500 transition-colors"
                        title={lang === 'tr' ? 'Sifre Sifirla' : 'Reset Password'}>
                        <KeyRound size={13} />
                      </button>

                      {/* Delete button */}
                      <button type="button" onClick={() => handleDeleteUser(u.id, u.name)}
                        className="p-1.5 rounded hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Inline password reset input */}
                    {isResetOpen && (
                      <div className="px-3 pb-3 flex items-center gap-2">
                        <span className="text-[11px] font-semibold flex-shrink-0" style={{ color: 'var(--text-3)' }}>
                          {lang === 'tr' ? 'Yeni Sifre:' : 'New Password:'}
                        </span>
                        <input
                          type="text"
                          className="input text-[12px] flex-1"
                          placeholder={lang === 'tr' ? 'En az 6 karakter...' : 'Min 6 characters...'}
                          value={resetState.newPassword}
                          onChange={e => setResetState({ ...resetState, newPassword: e.target.value, status: undefined, msg: undefined })}
                          onKeyDown={e => e.key === 'Enter' && handleResetPassword(u.id, resetState.newPassword)}
                        />
                        <button type="button" onClick={() => handleResetPassword(u.id, resetState.newPassword)}
                          className="text-[11px] font-semibold px-3 py-1.5 rounded bg-amber-500 text-white hover:bg-amber-600 transition-colors">
                          {lang === 'tr' ? 'Sifirla' : 'Reset'}
                        </button>
                        <button type="button" onClick={() => setResetState(null)}
                          className="p-1 rounded hover:bg-red-50 text-zinc-400 hover:text-red-400 transition-colors">
                          <X size={13} />
                        </button>
                        {resetState.msg && (
                          <span className={clsx('text-[11px] font-semibold', resetState.status === 'ok' ? 'text-emerald-500' : 'text-red-500')}>
                            {resetState.msg}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Expanded detail card */}
                    {isExpanded && (
                      <div className="px-3 pb-3">
                        <div className="rounded-lg p-3 space-y-2" style={{ background: 'var(--bg-1)', border: '1px solid var(--border)' }}>
                          {detail?.loading ? (
                            <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                              {lang === 'tr' ? 'Yukleniyor...' : 'Loading...'}
                            </p>
                          ) : (
                            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                              <DetailRow label={lang === 'tr' ? 'Ad Soyad' : 'Name'} value={u.name} />
                              <DetailRow label="Email" value={u.email} />
                              <DetailRow label={lang === 'tr' ? 'Rol' : 'Role'} value={ROLE_LABELS[u.role]} />
                              <DetailRow label={lang === 'tr' ? 'Telefon' : 'Phone'} value={u.phone ?? '-'} />
                              <DetailRow label={lang === 'tr' ? 'Departman' : 'Department'} value={dept?.name ?? '-'} />
                              <DetailRow label={lang === 'tr' ? 'Durum' : 'Status'} value={u.active ? (lang === 'tr' ? 'Aktif' : 'Active') : (lang === 'tr' ? 'Pasif' : 'Inactive')} />
                              <DetailRow label={lang === 'tr' ? 'Olusturma' : 'Created'} value={u.createdAt ? new Date(u.createdAt).toLocaleDateString('tr-TR') : '-'} />
                              <DetailRow label={lang === 'tr' ? 'Son Sifre' : 'Last Password'} value={detail?.lastPassword ?? '-'} mono />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Section>
    </div>
  )
}

/* ── Detail row helper for user card ───────────────────────────────────────── */
function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[10px] font-semibold flex-shrink-0" style={{ color: 'var(--text-3)' }}>{label}:</span>
      <span className={clsx('text-[12px] truncate', mono && 'font-mono font-bold')} style={{ color: 'var(--text-1)' }}>{value}</span>
    </div>
  )
}

/* ── Admin User Creation Form with Department Tree ────────────────────────── */
function AdminUserForm({ lang, departments, sectorId, onCreated, onCancel }: {
  lang: 'tr' | 'en'
  departments: { id: string; name: string; code: string; color: string }[]
  sectorId: string
  onCreated: () => void
  onCancel: () => void
}) {
  const posTemplate = getPositionTemplate(sectorId)
  const [form, setForm] = useState({
    name: '', surname: '', title: '', position: '',
    role: 'teknisyen' as UserRole, email: '', phone: '',
    departmentId: '', notes: '',
  })
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [deptOpen, setDeptOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const selectedDept = departments.find(d => d.id === form.departmentId)

  const handleSubmit = async () => {
    const fullName = `${form.name} ${form.surname}`.trim()
    if (!form.name || !form.surname || !form.email || !password || !form.departmentId) {
      setErr(lang === 'tr' ? 'Tum zorunlu alanlari doldurun' : 'Fill all required fields')
      return
    }
    if (password.length < 8) {
      setErr(lang === 'tr' ? 'Sifre en az 8 karakter olmali' : 'Password must be at least 8 characters')
      return
    }
    setSaving(true); setErr(null)
    try {
      await createUser({
        name: fullName,
        email: form.email,
        password,
        role: form.role,
        departmentId: form.departmentId,
        phone: form.phone || undefined,
      })
      setSuccess(true)
      setTimeout(() => onCreated(), 1500)
    } catch (e: any) {
      setErr(e.message ?? (lang === 'tr' ? 'Kullanici olusturulamadi' : 'Failed to create user'))
    } finally { setSaving(false) }
  }

  if (success) {
    return (
      <div className="p-6 text-center rounded-xl mb-4" style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)' }}>
        <CheckCircle size={32} className="text-emerald-500 mx-auto mb-2" />
        <p className="text-[14px] font-bold" style={{ color: 'var(--text-1)' }}>
          {form.name} {form.surname} {lang === 'tr' ? 'basariyla eklendi' : 'added successfully'}
        </p>
      </div>
    )
  }

  return (
    <div className="p-5 rounded-xl mb-4 space-y-4" style={{ background: 'var(--border-subtle)', border: '1px solid var(--border)' }}>
      <p className="text-[13px] font-bold" style={{ color: 'var(--text-1)' }}>
        {lang === 'tr' ? 'Yeni Kullanici Ekle' : 'Add New User'}
      </p>

      {/* Ad Soyad */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>
            {lang === 'tr' ? 'Ad' : 'First Name'} *
          </label>
          <input className="input text-[13px]" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>
            {lang === 'tr' ? 'Soyad' : 'Last Name'} *
          </label>
          <input className="input text-[13px]" value={form.surname} onChange={e => setForm({ ...form, surname: e.target.value })} />
        </div>
      </div>

      {/* Gorev / Unvan */}
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>
          {lang === 'tr' ? 'Gorev / Unvan' : 'Title / Position'}
        </label>
        <input className="input text-[13px]" list="title-options" placeholder={lang === 'tr' ? 'Secin veya yazin...' : 'Select or type...'} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        <datalist id="title-options">
          {[...new Set([...posTemplate.titles, ...posTemplate.positions])].map(t => <option key={t} value={t} />)}
        </datalist>
      </div>

      {/* Yetki Seviyesi */}
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>
          {lang === 'tr' ? 'Yetki Seviyesi' : 'Authority Level'} *
        </label>
        <select className="select text-[13px]" value={form.role} onChange={e => setForm({ ...form, role: e.target.value as UserRole })}>
          {ROLE_OPTIONS.filter(r => r.key !== 'platform_admin').map(r => (
            <option key={r.key} value={r.key}>{r.label} - {lang === 'tr' ? r.descTr : r.descEn}</option>
          ))}
        </select>
      </div>

      {/* Departman agaci */}
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>
          {lang === 'tr' ? 'Departman' : 'Department'} *
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setDeptOpen(!deptOpen)}
            className="input text-[13px] w-full text-left flex items-center justify-between"
          >
            <span style={{ color: selectedDept ? 'var(--text-1)' : 'var(--text-3)' }}>
              {selectedDept ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded" style={{ background: selectedDept.color }} />
                  {selectedDept.name} ({selectedDept.code})
                </span>
              ) : (lang === 'tr' ? 'Departman secin...' : 'Select department...')}
            </span>
            <ChevronDown size={14} style={{ color: 'var(--text-3)' }} />
          </button>
          {deptOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-xl overflow-y-auto z-20" style={{ background: 'var(--surface)', border: '1px solid var(--border)', maxHeight: '240px' }}>
              {departments.map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => { setForm({ ...form, departmentId: d.id }); setDeptOpen(false) }}
                  className={clsx(
                    'w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[12px] transition-colors',
                    form.departmentId === d.id ? 'font-bold' : ''
                  )}
                  style={{ color: 'var(--text-1)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--border-subtle)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <span className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center text-[8px] font-bold text-white" style={{ background: d.color }}>
                    {d.code.slice(0, 2)}
                  </span>
                  <span>{d.name}</span>
                  <span className="text-[10px] ml-auto" style={{ color: 'var(--text-3)' }}>{d.code}</span>
                  {form.departmentId === d.id && <CheckCircle size={12} className="text-emerald-500 ml-1" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>
          {lang === 'tr' ? 'E-posta Adresi' : 'Email Address'} *
        </label>
        <input className="input text-[13px]" type="email" placeholder="kullanici@sirket.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
      </div>

      {/* Sifre */}
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>
          {lang === 'tr' ? 'Baslangic Sifresi' : 'Initial Password'} * <span className="normal-case font-normal" style={{ color: 'var(--text-3)' }}>(min 8 karakter)</span>
        </label>
        <div className="relative">
          <input className="input text-[13px] pr-10" type={showPass ? 'text' : 'password'} placeholder="En az 8 karakter" value={password} onChange={e => setPassword(e.target.value)} />
          <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }}>
            {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      {/* Telefon */}
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>
          {lang === 'tr' ? 'Telefon' : 'Phone'} <span className="normal-case font-normal">(opsiyonel)</span>
        </label>
        <input className="input text-[13px]" placeholder="+90 5xx xxx xx xx" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
      </div>

      {/* Diger (Notes) */}
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>
          {lang === 'tr' ? 'Diger / Notlar' : 'Other / Notes'} <span className="normal-case font-normal">(opsiyonel)</span>
        </label>
        <textarea
          className="input text-[13px] resize-none min-h-[60px]"
          placeholder={lang === 'tr' ? 'Ek bilgiler, ozel yetkiler, vardiya bilgisi vb.' : 'Additional info, special permissions, shift info etc.'}
          value={form.notes}
          onChange={e => setForm({ ...form, notes: e.target.value })}
          rows={2}
        />
      </div>

      {err && <p className="text-[12px] text-red-600 font-medium">{err}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-default btn-sm" onClick={onCancel}>{lang === 'tr' ? 'Iptal' : 'Cancel'}</button>
        <button type="button" className="btn-dark btn-sm" onClick={handleSubmit} disabled={saving}>
          {saving ? '...' : <><Plus size={12} /> {lang === 'tr' ? 'Kullanici Olustur' : 'Create User'}</>}
        </button>
      </div>
    </div>
  )
}

/* ── Admin Position & Title Manager ───────────────────────────────────────── */
function AdminPositionManager({ lang, sectorId }: { lang: 'tr' | 'en'; sectorId: string }) {
  const [template, setTemplate] = useState(() => getPositionTemplate(sectorId))
  const [newPos, setNewPos] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [saved, setSaved] = useState(false)

  const addPosition = () => {
    if (!newPos.trim() || template.positions.includes(newPos.trim())) return
    const updated = { ...template, positions: [...template.positions, newPos.trim()] }
    setTemplate(updated)
    savePositionTemplate(sectorId, updated)
    setNewPos('')
    flashSaved()
  }

  const removePosition = (pos: string) => {
    const updated = { ...template, positions: template.positions.filter(p => p !== pos) }
    setTemplate(updated)
    savePositionTemplate(sectorId, updated)
    flashSaved()
  }

  const addTitle = () => {
    if (!newTitle.trim() || template.titles.includes(newTitle.trim())) return
    const updated = { ...template, titles: [...template.titles, newTitle.trim()] }
    setTemplate(updated)
    savePositionTemplate(sectorId, updated)
    setNewTitle('')
    flashSaved()
  }

  const removeTitle = (t: string) => {
    const updated = { ...template, titles: template.titles.filter(x => x !== t) }
    setTemplate(updated)
    savePositionTemplate(sectorId, updated)
    flashSaved()
  }

  const flashSaved = () => { setSaved(true); setTimeout(() => setSaved(false), 1500) }

  return (
    <div className="space-y-5">
      {saved && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium" style={{ background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success-border)' }}>
          <CheckCircle size={14} /> {lang === 'tr' ? 'Kaydedildi' : 'Saved'}
        </div>
      )}

      {/* Positions (Kadro) */}
      <Section
        title={lang === 'tr' ? 'Kadrolar' : 'Positions'}
        desc={lang === 'tr' ? 'Bu sektordeki kadro tanimlari. Yeni ekleyebilir veya mevcut olanlari cikarabilirsiniz.' : 'Position definitions for this sector. Add new or remove existing ones.'}
      >
        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <input className="input flex-1 text-[13px]" placeholder={lang === 'tr' ? 'Yeni kadro ekle...' : 'Add new position...'} value={newPos} onChange={e => setNewPos(e.target.value)} onKeyDown={e => e.key === 'Enter' && addPosition()} />
            <button type="button" className="btn-dark btn-sm" onClick={addPosition}><Plus size={12} /></button>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-60 overflow-y-auto">
            {template.positions.map(pos => (
              <span key={pos} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium" style={{ background: 'var(--border-subtle)', border: '1px solid var(--border)', color: 'var(--text-1)' }}>
                {pos}
                <button type="button" onClick={() => removePosition(pos)} className="ml-0.5 hover:text-red-500 transition-colors" style={{ color: 'var(--text-3)' }}>
                  <Trash2 size={10} />
                </button>
              </span>
            ))}
          </div>
          <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>{template.positions.length} {lang === 'tr' ? 'kadro tanimli' : 'positions defined'}</p>
        </div>
      </Section>

      {/* Titles (Gorev/Unvan) */}
      <Section
        title={lang === 'tr' ? 'Gorevler / Unvanlar' : 'Titles'}
        desc={lang === 'tr' ? 'Bu sektordeki gorev/unvan tanimlari.' : 'Title definitions for this sector.'}
      >
        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <input className="input flex-1 text-[13px]" placeholder={lang === 'tr' ? 'Yeni gorev ekle...' : 'Add new title...'} value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTitle()} />
            <button type="button" className="btn-dark btn-sm" onClick={addTitle}><Plus size={12} /></button>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-60 overflow-y-auto">
            {template.titles.map(t => (
              <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium" style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', color: 'var(--accent)' }}>
                {t}
                <button type="button" onClick={() => removeTitle(t)} className="ml-0.5 hover:text-red-500 transition-colors" style={{ color: 'var(--text-3)' }}>
                  <Trash2 size={10} />
                </button>
              </span>
            ))}
          </div>
          <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>{template.titles.length} {lang === 'tr' ? 'gorev tanimli' : 'titles defined'}</p>
        </div>
      </Section>
    </div>
  )
}

// ── Mobile Users Management ─────────────────────────────────────────────────

function AdminMobileUsers({ lang }: { lang: string }) {
  const { departments } = useDepartments()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [createdUser, setCreatedUser] = useState<{ loginCode: string; tempPassword: string; name: string } | null>(null)

  // Form state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [deptId, setDeptId] = useState('')
  const [subUnit, setSubUnit] = useState('')
  const [title, setTitle] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = async () => {
    try {
      const res = await api.get<any>('/users/mobile?pageSize=100')
      const list = Array.isArray(res) ? res : res?.data ?? []
      setUsers(list)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchUsers() }, [])

  const handleCreate = async () => {
    if (!firstName || !lastName || !phone || !deptId) return
    setCreating(true)
    setError(null)
    try {
      const data = await api.post<any>('/users/mobile', {
        firstName, lastName, email: email || undefined,
        phone, departmentIds: [deptId],
        subUnit: subUnit || undefined,
        title: title || undefined,
        jobTitle: jobTitle || undefined,
      })
      setCreatedUser({ loginCode: data.loginCode, tempPassword: data.tempPassword, name: data.name })
      setShowCreate(false)
      // Reset form
      setFirstName(''); setLastName(''); setEmail(''); setPhone('')
      setDeptId(''); setSubUnit(''); setTitle(''); setJobTitle('')
      fetchUsers()
    } catch (e: any) {
      setError(e.message ?? 'Hata olustu')
    } finally { setCreating(false) }
  }

  const handleResetPassword = async (id: string) => {
    try {
      const data = await api.post<any>(`/users/mobile/${id}/reset-password`)
      alert(`${lang === 'tr' ? 'Gecici sifre' : 'Temp password'}: ${data.tempPassword}`)
    } catch {}
  }

  const handleDeleteMobileUser = async (id: string, name: string) => {
    const confirmed = window.confirm(
      lang === 'tr'
        ? `"${name}" mobil kullanicisini silmek istediginize emin misiniz?`
        : `Are you sure you want to delete mobile user "${name}"?`
    )
    if (!confirmed) return
    try {
      await deleteUser(id)
      fetchUsers()
    } catch {}
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  return (
    <div className="space-y-4">
      {/* Created user success modal */}
      {createdUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="surface rounded-xl w-full max-w-sm p-6 space-y-4">
            <div className="text-center">
              <CheckCircle size={36} className="text-green-500 mx-auto mb-2" />
              <p className="text-[14px] font-bold" style={{ color: 'var(--text-1)' }}>
                {lang === 'tr' ? 'Mobil Kullanici Olusturuldu' : 'Mobile User Created'}
              </p>
              <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>{createdUser.name}</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg)' }}>
                <div>
                  <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-3)' }}>
                    {lang === 'tr' ? 'Giris Kodu' : 'Login Code'}
                  </p>
                  <p className="text-[16px] font-mono font-bold tracking-wider" style={{ color: 'var(--text-1)' }}>
                    {createdUser.loginCode}
                  </p>
                </div>
                <button type="button" onClick={() => copyToClipboard(createdUser.loginCode)} className="p-2 rounded hover:bg-white/10" style={{ color: 'var(--text-2)' }}>
                  <Copy size={14} />
                </button>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg)' }}>
                <div>
                  <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-3)' }}>
                    {lang === 'tr' ? 'Gecici Sifre' : 'Temp Password'}
                  </p>
                  <p className="text-[16px] font-mono font-bold tracking-wider" style={{ color: 'var(--text-1)' }}>
                    {createdUser.tempPassword}
                  </p>
                </div>
                <button type="button" onClick={() => copyToClipboard(createdUser.tempPassword)} className="p-2 rounded hover:bg-white/10" style={{ color: 'var(--text-2)' }}>
                  <Copy size={14} />
                </button>
              </div>
              <p className="text-[10px] text-center" style={{ color: 'var(--text-3)' }}>
                {lang === 'tr'
                  ? 'Bu bilgileri kaydedin. Kullanici ilk girisinde sifresini degistirecek.'
                  : 'Save this info. User will change password on first login.'}
              </p>
            </div>
            <button type="button" onClick={() => setCreatedUser(null)}
              className="w-full py-2.5 rounded-lg text-[13px] font-semibold text-white bg-indigo-600 hover:bg-indigo-500">
              {lang === 'tr' ? 'Tamam' : 'OK'}
            </button>
          </div>
        </div>
      )}

      <Section
        title={lang === 'tr' ? 'Mobil Kullanicilar' : 'Mobile Users'}
        desc={lang === 'tr' ? 'Saha personeli icin mobil giris kodlu kullanici yonetimi' : 'Mobile login code user management for field personnel'}
      >
        <button type="button" onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold text-white bg-indigo-600 hover:bg-indigo-500">
          <Plus size={13} /> {lang === 'tr' ? 'Yeni Mobil Kullanici' : 'New Mobile User'}
        </button>

        {/* Create form */}
        {showCreate && (
          <div className="p-4 rounded-lg space-y-3" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--text-3)' }}>{lang === 'tr' ? 'Ad' : 'First Name'} *</label>
                <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                  className="input w-full" placeholder="Mehmet" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--text-3)' }}>{lang === 'tr' ? 'Soyad' : 'Last Name'} *</label>
                <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                  className="input w-full" placeholder="Yilmaz" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--text-3)' }}>{lang === 'tr' ? 'Telefon' : 'Phone'} *</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  className="input w-full" placeholder="0555 123 4567" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--text-3)' }}>E-posta</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="input w-full" placeholder="(opsiyonel)" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--text-3)' }}>{lang === 'tr' ? 'Departman' : 'Department'} *</label>
              <select value={deptId} onChange={e => setDeptId(e.target.value)} className="select w-full">
                <option value="">{lang === 'tr' ? 'Departman secin...' : 'Select department...'}</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--text-3)' }}>{lang === 'tr' ? 'Alt Birim' : 'Sub-unit'}</label>
                <input type="text" value={subUnit} onChange={e => setSubUnit(e.target.value)}
                  className="input w-full" placeholder="A Hatti" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--text-3)' }}>{lang === 'tr' ? 'Kadro' : 'Position'}</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                  className="input w-full" placeholder="Operator" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--text-3)' }}>{lang === 'tr' ? 'Gorev' : 'Job Title'}</label>
                <input type="text" value={jobTitle} onChange={e => setJobTitle(e.target.value)}
                  className="input w-full" placeholder="CNC Operatoru" />
              </div>
            </div>
            {error && <p className="text-[11px] text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowCreate(false)}
                className="btn-default flex-1 justify-center">{lang === 'tr' ? 'Iptal' : 'Cancel'}</button>
              <button type="button" onClick={handleCreate} disabled={creating || !firstName || !lastName || !phone || !deptId}
                className="btn-primary flex-1 justify-center disabled:opacity-40">
                {creating ? <RefreshCw size={12} className="animate-spin" /> : <Smartphone size={12} />}
                {lang === 'tr' ? ' Olustur' : ' Create'}
              </button>
            </div>
          </div>
        )}

        {/* User list */}
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                <th className="text-left py-2 px-2 font-semibold w-10" style={{ color: 'var(--text-3)' }}>No</th>
                <th className="text-left py-2 px-2 font-semibold" style={{ color: 'var(--text-3)' }}>{lang === 'tr' ? 'Kod' : 'Code'}</th>
                <th className="text-left py-2 px-2 font-semibold" style={{ color: 'var(--text-3)' }}>{lang === 'tr' ? 'Ad Soyad' : 'Name'}</th>
                <th className="text-left py-2 px-2 font-semibold" style={{ color: 'var(--text-3)' }}>{lang === 'tr' ? 'Telefon' : 'Phone'}</th>
                <th className="text-left py-2 px-2 font-semibold" style={{ color: 'var(--text-3)' }}>{lang === 'tr' ? 'Departman' : 'Department'}</th>
                <th className="text-left py-2 px-2 font-semibold" style={{ color: 'var(--text-3)' }}>{lang === 'tr' ? 'Durum' : 'Status'}</th>
                <th className="text-right py-2 px-2 font-semibold" style={{ color: 'var(--text-3)' }}>{lang === 'tr' ? 'Islemler' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8" style={{ color: 'var(--text-3)' }}>{lang === 'tr' ? 'Yukleniyor...' : 'Loading...'}</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8" style={{ color: 'var(--text-3)' }}>{lang === 'tr' ? 'Henuz mobil kullanici yok' : 'No mobile users yet'}</td></tr>
              ) : (
                users.map((u: any, idx: number) => (
                  <tr key={u.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
                    <td className="py-2 px-2 font-bold text-[11px]" style={{ color: 'var(--text-3)' }}>#{idx + 1}</td>
                    <td className="py-2 px-2 font-mono font-bold text-[11px]" style={{ color: 'var(--accent)' }}>{u.loginCode}</td>
                    <td className="py-2 px-2" style={{ color: 'var(--text-1)' }}>{u.name}</td>
                    <td className="py-2 px-2" style={{ color: 'var(--text-2)' }}>{u.phone ?? '-'}</td>
                    <td className="py-2 px-2" style={{ color: 'var(--text-2)' }}>{u.departments?.[0]?.name ?? '-'}</td>
                    <td className="py-2 px-2">
                      <span className={clsx('text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                        u.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                        {u.active ? (lang === 'tr' ? 'Aktif' : 'Active') : (lang === 'tr' ? 'Pasif' : 'Inactive')}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right flex items-center justify-end gap-1">
                      <button type="button" onClick={() => handleResetPassword(u.id)}
                        className="text-[10px] font-semibold px-2 py-1 rounded hover:bg-amber-50 text-amber-600">
                        {lang === 'tr' ? 'Sifre Sifirla' : 'Reset Pass'}
                      </button>
                      <button type="button" onClick={() => handleDeleteMobileUser(u.id, u.name)}
                        className="p-1 rounded hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}

// ── Department Management ─────────────────────────────────────────────────

function AdminDepartmentManager({ lang }: { lang: string }) {
  const { departments, loading, refetch } = useDepartments()
  const [newName, setNewName] = useState('')
  const [newCode, setNewCode] = useState('')
  const [newColor, setNewColor] = useState('#6366f1')
  const [creating, setCreating] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!newName.trim() || !newCode.trim()) {
      setErr(lang === 'tr' ? 'Ad ve kod zorunlu' : 'Name and code required')
      return
    }
    setCreating(true)
    setErr(null)
    try {
      await createDepartment({
        name: newName.trim(),
        code: newCode.trim().toUpperCase(),
        color: newColor,
      })
      setNewName('')
      setNewCode('')
      refetch()
    } catch (e: any) {
      setErr(e.message ?? (lang === 'tr' ? 'Departman olusturulamadi' : 'Failed to create department'))
    } finally { setCreating(false) }
  }

  const handleDelete = async (id: string, name: string) => {
    const confirmed = window.confirm(
      lang === 'tr'
        ? `"${name}" departmanini silmek istediginize emin misiniz? Bu departmandaki kullanicilar etkilenebilir.`
        : `Are you sure you want to delete "${name}"? Users in this department may be affected.`
    )
    if (!confirmed) return
    try {
      await deleteDepartment(id)
      refetch()
    } catch (e: any) {
      alert(e.message ?? (lang === 'tr' ? 'Departman silinemedi' : 'Failed to delete department'))
    }
  }

  return (
    <div className="space-y-5">
      <Section
        title={lang === 'tr' ? 'Departman Yonetimi' : 'Department Management'}
        desc={lang === 'tr' ? 'Yeni departman ekleyin veya mevcut departmanlari cikartin' : 'Add new departments or remove existing ones'}
      >
        {/* Create form */}
        <div className="p-4 rounded-lg space-y-3" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
          <p className="text-[12px] font-bold" style={{ color: 'var(--text-1)' }}>
            {lang === 'tr' ? 'Yeni Departman Ekle' : 'Add New Department'}
          </p>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--text-3)' }}>
                {lang === 'tr' ? 'Departman Adi' : 'Name'} *
              </label>
              <input className="input text-[13px]" placeholder={lang === 'tr' ? 'Ornek: Uretim' : 'e.g. Production'}
                value={newName} onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()} />
            </div>
            <div className="w-28">
              <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--text-3)' }}>
                {lang === 'tr' ? 'Kod' : 'Code'} *
              </label>
              <input className="input text-[13px] font-mono uppercase" placeholder="PROD" maxLength={10}
                value={newCode} onChange={e => setNewCode(e.target.value)} />
            </div>
            <div className="w-14">
              <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--text-3)' }}>
                {lang === 'tr' ? 'Renk' : 'Color'}
              </label>
              <input type="color" className="w-full h-[38px] rounded border cursor-pointer" style={{ borderColor: 'var(--border)' }}
                value={newColor} onChange={e => setNewColor(e.target.value)} />
            </div>
            <button type="button" onClick={handleCreate} disabled={creating || !newName.trim() || !newCode.trim()}
              className="btn-dark btn-sm whitespace-nowrap disabled:opacity-40">
              <Plus size={12} /> {lang === 'tr' ? 'Ekle' : 'Add'}
            </button>
          </div>
          {err && <p className="text-[11px] text-red-500">{err}</p>}
        </div>

        {/* Department list */}
        <div className="p-4">
          <p className="text-[12px] font-semibold mb-3" style={{ color: 'var(--text-2)' }}>
            {loading ? '...' : `${departments.length} ${lang === 'tr' ? 'departman' : 'departments'}`}
          </p>
          {!loading && departments.length > 0 && (
            <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
              {departments.map(d => (
                <div key={d.id} className="flex items-center gap-2.5 p-2.5 rounded-lg" style={{ background: 'var(--border-subtle)', border: '1px solid var(--border)' }}>
                  <span className="w-5 h-5 rounded flex-shrink-0" style={{ background: d.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold truncate" style={{ color: 'var(--text-1)' }}>{d.name}</p>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--bg)', color: 'var(--text-3)' }}>
                    {d.code}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                    {d.employeeCount} {lang === 'tr' ? 'kisi' : 'ppl'}
                  </span>
                  <button type="button" onClick={() => handleDelete(d.id, d.name)}
                    className="p-1 rounded hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>
    </div>
  )
}
