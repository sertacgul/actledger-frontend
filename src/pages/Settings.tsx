import { useState, useEffect } from 'react'
import {
  Server, Building2, Globe, Shield,
  HardDrive, Wifi, CheckCircle, AlertTriangle,
  Save, RefreshCw, ExternalLink, Layers, Languages, Type, Loader2,
} from 'lucide-react'
import clsx from 'clsx'
import { useCompany } from '../context/CompanyContext'
import { useLanguage } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import DataExportTab from '../components/settings/DataExportTab'

type SettingsTab = 'deployment' | 'company' | 'security' | 'integrations' | 'data-export'

function Section({ title, description, children }: {
  title: string; description?: string; children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-4">
        <h3 className="text-[14px] font-semibold text-zinc-900">{title}</h3>
        {description && <p className="text-[12px] text-zinc-400 mt-0.5">{description}</p>}
      </div>
      <div className="surface divide-y divide-zinc-100">
        {children}
      </div>
    </div>
  )
}

function SettingRow({ label, description, children }: {
  label: string; description?: string; children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-6 px-4 py-3.5">
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-zinc-800">{label}</p>
        {description && <p className="text-[11px] text-zinc-400 mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

/* ── Deployment Tab ── */
function DeploymentSettings() {
  const { config } = useCompany()
  const [serverUrl, setServerUrl] = useState(config?.serverUrl ?? '')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null)

  const testConnection = () => {
    setTesting(true)
    setTestResult(null)
    setTimeout(() => {
      setTesting(false)
      setTestResult('ok')
    }, 1500)
  }

  return (
    <div className="space-y-6">
      <Section title="Dağıtım Bilgileri" description="Kurulum tipi ve bağlantı yapılandırması">
        <SettingRow label="Dağıtım Modu" description="Bu instance nasıl deploy edilmiş">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-[12px] font-semibold">
            <HardDrive size={13} />
            {config?.deploymentMode === 'on-premise' ? 'On-Premise' : 'Cloud'}
          </div>
        </SettingRow>

        <SettingRow label="Uygulama Versiyonu" description="Şu an çalışan sürüm">
          <span className="text-[13px] font-mono text-zinc-600">v{config?.appVersion}</span>
        </SettingRow>

        <SettingRow label="Lisans Tipi" description="Aktif lisans planı">
          <span className="badge-info capitalize">{config?.licenseType}</span>
        </SettingRow>

        <SettingRow label="Lisans Anahtarı" description="Enterprise lisans kodu">
          <div className="flex items-center gap-2">
            <code className="text-[12px] font-mono bg-zinc-100 px-2 py-1 rounded text-zinc-700">
              {config?.licenseKey}
            </code>
            <CheckCircle size={14} className="text-emerald-500" />
          </div>
        </SettingRow>

        <SettingRow label="Maks. Kullanıcı" description="Lisans kapsamındaki kullanıcı limiti">
          <span className="text-[13px] font-semibold text-zinc-700">{config?.maxUsers}</span>
        </SettingRow>
      </Section>

      <Section title="API Sunucusu" description="Backend API bağlantı adresi">
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
              Sunucu URL
            </label>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                value={serverUrl}
                onChange={e => setServerUrl(e.target.value)}
                placeholder="http://localhost:3001/api"
              />
              <button
                type="button"
                onClick={testConnection}
                disabled={testing}
                className="btn-default btn-sm whitespace-nowrap"
              >
                <Wifi size={13} className={testing ? 'animate-pulse' : ''} />
                {testing ? 'Test ediliyor...' : 'Bağlantı Test Et'}
              </button>
            </div>
          </div>

          {testResult && (
            <div className={clsx(
              'flex items-center gap-2 px-3 py-2.5 rounded-lg text-[12px] font-medium',
              testResult === 'ok'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            )}>
              {testResult === 'ok'
                ? <><CheckCircle size={14} /> Bağlantı başarılı - API erişilebilir durumda</>
                : <><AlertTriangle size={14} /> Bağlantı başarısız - Sunucu adresi kontrol edin</>
              }
            </div>
          )}

          <div className="flex justify-end">
            <button type="button" className="btn-dark btn-sm">
              <Save size={13} /> Kaydet
            </button>
          </div>
        </div>
      </Section>

      <Section title="Özellikler" description="Lisans kapsamındaki platform özellikleri">
        {Object.entries(config?.features ?? {}).map(([key, enabled]) => {
          const labels: Record<string, string> = {
            geminiAI: 'OperIQ Analiz Motoru',
            mobileApp: 'Mobil Uygulama',
            advancedReports: 'Gelişmiş Raporlama',
            customForms: 'Özel Form Oluşturucu',
            messaging: 'Saha Mesajlaşma',
          }
          return (
            <SettingRow key={key} label={labels[key] ?? key}>
              <span className={clsx('badge', enabled ? 'badge-success' : 'badge-neutral')}>
                {enabled ? 'Aktif' : 'Pasif'}
              </span>
            </SettingRow>
          )
        })}
      </Section>
    </div>
  )
}

/* ── Company Tab (user-facing: language + appearance only) ── */
function CompanySettings() {
  const { config, sector } = useCompany()
  const { lang, setLang, t } = useLanguage()
  const { sidebarFontScale, setSidebarFontScale } = useTheme()

  return (
    <div className="space-y-6">
      <Section title={t('settings_language')} description={t('settings_language_desc')}>
        <div className="p-4">
          <div className="inline-flex rounded-lg border border-zinc-200 overflow-hidden">
            {(['tr', 'en'] as const).map(code => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 text-[12px] font-medium transition-colors',
                  lang === code
                    ? 'bg-zinc-900 text-white'
                    : 'bg-white text-zinc-600 hover:bg-zinc-50',
                )}
              >
                <Languages size={13} />
                <span className="text-[14px]">{code === 'tr' ? '\u{1F1F9}\u{1F1F7}' : '\u{1F1FA}\u{1F1F8}'}</span>
                {t(code === 'tr' ? 'settings_language_tr' : 'settings_language_en')}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title={t('sidebar_font_scale')} description={t('sidebar_font_scale_desc')}>
        <div className="p-4">
          <div className="flex items-center gap-4">
            <Type size={16} className="text-zinc-400 flex-shrink-0" />
            <input
              type="range"
              min={50}
              max={200}
              step={10}
              value={sidebarFontScale}
              onChange={e => setSidebarFontScale(Number(e.target.value))}
              className="flex-1 accent-blue-600"
            />
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[13px] font-mono font-semibold text-zinc-700 tabular-nums w-12 text-right">
                {sidebarFontScale}%
              </span>
              <button
                type="button"
                onClick={() => setSidebarFontScale(100)}
                className="btn-default btn-sm text-[11px] px-2"
              >
                {t('header_zoom_reset')}
              </button>
            </div>
          </div>
        </div>
      </Section>

      {/* Read-only sector info */}
      {sector && (
        <Section title="Aktif Sektor" description="Sektor yapılandirmasi Admin Panel üzerinden yonetilir">
          <div className="p-4">
            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--border-subtle)' }}>
              <span className="text-2xl">{sector.icon}</span>
              <div>
                <p className="text-[13px] font-bold" style={{ color: 'var(--text-1)' }}>{sector.name}</p>
                <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>{sector.description}</p>
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* Read-only company info */}
      {config && (
        <Section title="Firma" description="Firma bilgileri Admin Panel üzerinden yonetilir">
          <div className="p-4 grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg" style={{ background: 'var(--border-subtle)' }}>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Firma</p>
              <p className="text-[13px] font-semibold" style={{ color: 'var(--text-1)' }}>{config.companyName}</p>
            </div>
            <div className="p-3 rounded-lg" style={{ background: 'var(--border-subtle)' }}>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Lisans</p>
              <p className="text-[13px] font-semibold" style={{ color: 'var(--text-1)' }}>{config.licenseType}</p>
            </div>
          </div>
        </Section>
      )}
    </div>
  )
}


/* ── Security Tab ── */
function SecuritySettings() {
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwResult, setPwResult] = useState<'ok' | 'err' | null>(null)
  const [pwErr, setPwErr] = useState('')

  const handleChangePassword = async () => {
    if (newPw !== confirmPw) { setPwErr('Yeni sifreler eslesmiyol'); setPwResult('err'); return }
    if (newPw.length < 8) { setPwErr('Sifre en az 8 karakter olmali'); setPwResult('err'); return }
    setPwSaving(true); setPwResult(null); setPwErr('')
    try {
      const { changePassword } = await import('../lib/hooks')
      await changePassword(currentPw, newPw)
      setPwResult('ok')
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
    } catch (e: any) {
      setPwErr(e.message ?? 'Sifre degistirilemedi')
      setPwResult('err')
    } finally { setPwSaving(false) }
  }

  return (
    <div className="space-y-6">
      <Section title="Sifre Degistir" description="Mevcut sifrenizi degistirin">
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Mevcut Sifre</label>
            <input className="input" type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="Mevcut sifreniz" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Yeni Sifre</label>
              <input className="input" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="En az 8 karakter" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Yeni Sifre (Tekrar)</label>
              <input className="input" type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Tekrar girin" />
            </div>
          </div>
          {pwResult === 'ok' && <p className="text-[12px] text-emerald-600 font-medium">Sifre basariyla degistirildi.</p>}
          {pwResult === 'err' && <p className="text-[12px] text-red-600 font-medium">{pwErr}</p>}
          <div className="flex justify-end">
            <button type="button" className="btn-dark btn-sm" onClick={handleChangePassword} disabled={pwSaving || !currentPw || !newPw || !confirmPw}>
              {pwSaving ? 'Kaydediliyor...' : 'Sifreyi Degistir'}
            </button>
          </div>
        </div>
      </Section>

      <Section title="Kimlik Dogrulama" description="Oturum ve erişim guvenligi">
        <SettingRow label="Oturum Süresi" description="Otomatik oturum kapatma süresi">
          <select className="select w-36">
            <option>4 saat</option>
            <option>8 saat</option>
            <option>24 saat</option>
          </select>
        </SettingRow>
        <SettingRow label="IP Kısıtlaması (Opsiyonel)" description="Etkinleştirildiğinde yalnızca belirtilen IP aralığından erişime izin verir">
          <div className="flex items-center gap-2">
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" className="sr-only peer" />
              <div className="h-5 w-9 rounded-full bg-zinc-200 peer-checked:bg-blue-600 transition-colors
                after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white
                after:transition-all peer-checked:after:translate-x-4" />
            </label>
            <button type="button" className="btn-default btn-sm">Yapılandır</button>
          </div>
        </SettingRow>
      </Section>

      <Section title="Denetim Günlüğü" description="Kullanıcı ve sistem aktivite kayıtları">
        <SettingRow label="Etkinlik Kaydı" description="Tüm kullanıcı işlemlerini logla">
          <label className="relative inline-flex cursor-pointer items-center">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="h-5 w-9 rounded-full bg-zinc-200 peer-checked:bg-blue-600 transition-colors
              after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white
              after:transition-all peer-checked:after:translate-x-4" />
          </label>
        </SettingRow>
        <SettingRow label="Log Saklama Süresi" description="Logların disk üzerinde tutulma süresi">
          <select className="select w-36">
            <option>90 gün</option>
            <option>180 gün</option>
            <option>1 yıl</option>
          </select>
        </SettingRow>
      </Section>
    </div>
  )
}

/* ── Integrations Tab ── */
function IntegrationsSettings() {
  const integrations = [
    { name: 'OperIQ', desc: 'Operasyonel içgörüler ve öneriler', status: 'connected', icon: '✦' },
    { name: 'E-posta (SMTP)', desc: 'Bildirim ve davet e-postaları', status: 'connected', icon: '✉' },
    { name: 'Active Directory', desc: 'Kurumsal kimlik doğrulama', status: 'coming_soon', icon: '⊞' },
    { name: 'ERP Sistemi', desc: 'SAP, Oracle vb. veri entegrasyonu', status: 'coming_soon', icon: '⧫' },
    { name: 'Webhook', desc: 'Dış sistemlere olay bildirimi', status: 'coming_soon', icon: '↗' },
  ]

  return (
    <div className="space-y-4">
      <div className="surface divide-y divide-zinc-100">
        {integrations.map(int => (
          <div key={int.name} className="flex items-center gap-4 px-4 py-3.5">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center text-base flex-shrink-0">
              {int.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-zinc-900">{int.name}</p>
              <p className="text-[11px] text-zinc-400">{int.desc}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={clsx('badge', int.status === 'connected' ? 'badge-success' : int.status === 'coming_soon' ? 'badge-warning' : 'badge-neutral')}>
                {int.status === 'connected' ? 'Bağlı' : int.status === 'coming_soon' ? 'Yakında' : 'Bağlı Değil'}
              </span>
              {int.status !== 'coming_soon' && (
                <button type="button" className="btn-default btn-sm">
                  {int.status === 'connected' ? 'Yapılandır' : 'Bağla'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Main ── */
export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('deployment')

  const { user } = useAuth()
  const isGM = ['genel_mudur', 'super_admin', 'gm_yardimcisi', 'direktor'].includes(user?.role ?? '')

  const TABS: { key: SettingsTab; icon: typeof Server; label: string }[] = [
    { key: 'deployment',    icon: Server,    label: 'Dağıtım'      },
    { key: 'company',       icon: Building2, label: 'Tercihler' },
    { key: 'security',      icon: Shield,    label: 'Güvenlik'     },
    { key: 'integrations',  icon: Globe,     label: 'Entegrasyonlar' },
    { key: 'data-export' as SettingsTab, icon: Shield, label: isGM ? 'Veri Export Onay' : 'Veri Export' },
  ]

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Tabs */}
      <div className="flex gap-1 p-1 surface w-fit rounded-xl">
        {TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium transition-all',
              activeTab === tab.key
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'
            )}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="animate-fade-up">
        {activeTab === 'deployment'   && <DeploymentSettings />}
        {activeTab === 'company'      && <CompanySettings />}
        {activeTab === 'security'     && <SecuritySettings />}
        {activeTab === 'integrations' && <IntegrationsSettings />}
        {activeTab === 'data-export' && <DataExportTab />}
      </div>
    </div>
  )
}
