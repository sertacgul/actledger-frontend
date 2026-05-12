import { useState, useEffect, useCallback } from 'react'
import {
  Building2, Users, Shield, Settings, Plus, RefreshCw,
  ChevronRight, Trash2, Edit3, X, Loader2, Activity,
  Search, Filter, Check, AlertTriangle,
  Smartphone, ClipboardList, LogOut, Lock, ChevronDown, Key,
  ShoppingCart, Calculator, UserCog,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { tokenStore, API_BASE } from '../lib/api'
import { SECTORS } from '../data/sectors'

// ── Types ────────────────────────────────────────────────────────────────────

interface CompanyItem {
  id: string
  name: string
  sector: string
  licenseType: string
  licenseKey: string
  licenseExpiresAt: string | null
  maxUsers: number
  maxDepartments: number
  maxMobileUsers: number
  active: boolean
  deploymentMode: string
  createdAt: string
  userCount: number
  departmentCount: number
  taskCount: number
  mobileUserCount: number
}

interface DashboardStats {
  companyCount: number
  totalUsers: number
  totalTasks: number
  activeMobile: number
}

interface TreeDepartment {
  id: string
  name: string
  code: string
  color: string
  parentId: string | null
  managerId: string | null
  manager: { id: string; name: string; role: string } | null
  _count: { members: number; tasks: number }
}

interface CompanyUser {
  id: string
  name: string
  email: string
  role: string
  active: boolean
  isMobileUser: boolean
  loginCode: string | null
  jobTitle: string | null
  subUnit: string | null
  lastSyncAt: string | null
  createdAt: string
  departments: { id: string; name: string }[]
}

interface AuditLog {
  id: string
  action: string
  entity: string
  entityId: string | null
  detail: string | null
  ip: string | null
  createdAt: string
  user: { id: string; name: string; role: string } | null
}

// ── Tab type ─────────────────────────────────────────────────────────────────

type SuperAdminTab = 'companies' | 'monitoring' | 'logs' | 'module-access' | 'settings'

const TABS: { key: SuperAdminTab; icon: typeof Building2; label: string }[] = [
  { key: 'companies',     icon: Building2,     label: 'Sirketler' },
  { key: 'monitoring',    icon: Activity,      label: 'Izleme' },
  { key: 'logs',          icon: ClipboardList, label: 'Loglar' },
  { key: 'module-access', icon: Key,           label: 'ERP Yetkileri' },
  { key: 'settings',      icon: Settings,      label: 'Ayarlar' },
]

// ── Helper: fetch with auth ──────────────────────────────────────────────────

async function saFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = tokenStore.get()
  const headers: Record<string, string> = {
    ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...(options?.headers as Record<string, string>) },
    credentials: 'include',
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message ?? `Hata: ${res.status}`)
  }

  if (res.status === 204) return undefined as T
  const body = await res.json()
  return body.data as T
}

// ── Sector label helper ──────────────────────────────────────────────────────

function getSectorLabel(sectorId: string): string {
  const s = SECTORS.find(x => x.id === sectorId)
  return s ? `${s.icon} ${s.shortName}` : sectorId
}

function getSectorIcon(sectorId: string): string {
  const s = SECTORS.find(x => x.id === sectorId)
  return s?.icon ?? '🏢'
}

// ── Role label helper ────────────────────────────────────────────────────────

const ROLE_MAP: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  PLATFORM_ADMIN: 'Platform Admin',
  GENEL_MUDUR: 'Genel Mudur',
  GM_YARDIMCISI: 'GM Yardimcisi',
  DIREKTOR: 'Direktor',
  MUDUR: 'Mudur',
  SUPERVIZON: 'Supervizon',
  MUHENDIS: 'Muhendis',
  TEKNISYEN: 'Teknisyen',
  ISCI: 'Isci',
  super_admin: 'Super Admin',
  platform_admin: 'Platform Admin',
  genel_mudur: 'Genel Mudur',
  gm_yardimcisi: 'GM Yardimcisi',
  direktor: 'Direktor',
  mudur: 'Mudur',
  supervizor: 'Supervizon',
  muhendis: 'Muhendis',
  teknisyen: 'Teknisyen',
  isci: 'Isci',
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function SuperAdmin() {
  const { user, logout } = useAuth()
  const [tab, setTab] = useState<SuperAdminTab>('companies')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-[14px] font-bold text-white tracking-tight">ActLedger Super Admin</h1>
            <p className="text-[10px] text-slate-400">Platform Yönetim Konsolu</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-medium px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            SUPER ADMIN
          </span>
          {user && (
            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-700">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">
                  {user.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </span>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-white">{user.name}</p>
                <p className="text-[9px] text-slate-400">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={logout}
                className="ml-2 p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Cikis Yap"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-56 min-h-[calc(100vh-57px)] border-r border-slate-800 bg-slate-900/50 p-3 space-y-1">
          {TABS.map(t => {
            const active = tab === t.key
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[12px] font-medium transition-all text-left ${
                  active
                    ? 'bg-cyan-500/10 text-cyan-400 font-semibold border border-cyan-500/20'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
                }`}
              >
                <t.icon size={15} />
                {t.label}
                {active && <ChevronRight size={12} className="ml-auto text-cyan-500" />}
              </button>
            )
          })}

          <div className="pt-4 mt-4 border-t border-slate-800">
            <div className="px-3 py-2">
              <p className="text-[9px] uppercase tracking-wider text-slate-600 font-semibold">Platform</p>
              <PlatformMiniStats />
            </div>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 57px)' }}>
          {tab === 'companies' && <CompaniesTab />}
          {tab === 'monitoring' && <MonitoringTab />}
          {tab === 'logs' && <LogsTab />}
          {tab === 'module-access' && <ModuleAccessAdminTab />}
          {tab === 'settings' && <SettingsTab />}
        </main>
      </div>
    </div>
  )
}

// ── Platform Mini Stats (sidebar) ────────────────────────────────────────────

function PlatformMiniStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null)

  useEffect(() => {
    saFetch<DashboardStats>('/super-admin/dashboard').then(setStats).catch(() => {})
  }, [])

  if (!stats) return null

  return (
    <div className="mt-2 space-y-1.5">
      {[
        { label: 'Sirket', value: stats.companyCount, icon: Building2 },
        { label: 'Kullanici', value: stats.totalUsers, icon: Users },
        { label: 'Gorev', value: stats.totalTasks, icon: ClipboardList },
        { label: 'Mobil', value: stats.activeMobile, icon: Smartphone },
      ].map(item => (
        <div key={item.label} className="flex items-center gap-2 text-[10px]">
          <item.icon size={11} className="text-slate-600" />
          <span className="text-slate-500">{item.label}</span>
          <span className="ml-auto font-semibold text-slate-300 tabular-nums">{item.value.toLocaleString('tr-TR')}</span>
        </div>
      ))}
    </div>
  )
}

// ── Companies Tab ────────────────────────────────────────────────────────────

function CompaniesTab() {
  const [companies, setCompanies] = useState<CompanyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const fetchCompanies = useCallback(async () => {
    setLoading(true)
    try {
      const data = await saFetch<CompanyItem[]>('/super-admin/companies')
      setCompanies(data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchCompanies() }, [fetchCompanies])

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-white">Sirketler</h2>
          <p className="text-[12px] text-slate-400 mt-0.5">
            Platforma kayitli tum sirketleri yonetme
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchCompanies}
            className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Yenile"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold bg-cyan-600 text-white hover:bg-cyan-500 transition-colors"
          >
            <Plus size={14} /> Yeni Sirket
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showCreate && (
        <CreateCompanyForm
          onCreated={() => { setShowCreate(false); fetchCompanies() }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Company Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-cyan-500" />
        </div>
      ) : companies.length === 0 ? (
        <div className="text-center py-16">
          <Building2 size={40} className="mx-auto text-slate-700 mb-3" />
          <p className="text-[14px] text-slate-400">Henuz sirket yok</p>
          <p className="text-[11px] text-slate-500 mt-1">Ilk sirketi oluşturmak için "Yeni Sirket" butonunu kullanin</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {companies.map(c => (
            <CompanyCard
              key={c.id}
              company={c}
              isEditing={editingId === c.id}
              onEdit={() => setEditingId(editingId === c.id ? null : c.id)}
              onUpdated={() => { setEditingId(null); fetchCompanies() }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Company Card ─────────────────────────────────────────────────────────────

function CompanyCard({ company: c, isEditing, onEdit, onUpdated }: {
  company: CompanyItem
  isEditing: boolean
  onEdit: () => void
  onUpdated: () => void
}) {
  const [editForm, setEditForm] = useState({
    maxDepartments: c.maxDepartments,
    maxMobileUsers: c.maxMobileUsers,
    maxUsers: c.maxUsers,
  })
  const [saving, setSaving] = useState(false)
  const [deactivating, setDeactivating] = useState(false)

  const handleSaveLimits = async () => {
    setSaving(true)
    try {
      await saFetch(`/super-admin/companies/${c.id}`, {
        method: 'PATCH',
        body: JSON.stringify(editForm),
      })
      onUpdated()
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  const handleDeactivate = async () => {
    if (!window.confirm(`"${c.name}" sirketini deaktive etmek istediginize emin misiniz?`)) return
    setDeactivating(true)
    try {
      await saFetch(`/super-admin/companies/${c.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !c.active }),
      })
      onUpdated()
    } catch { /* ignore */ }
    finally { setDeactivating(false) }
  }

  return (
    <div className={`rounded-xl border p-5 transition-all ${
      c.active
        ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
        : 'bg-slate-900/30 border-slate-800/50 opacity-60'
    }`}>
      {/* Card Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-lg">
            {getSectorIcon(c.sector)}
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-white">{c.name}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">{getSectorLabel(c.sector)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
            c.active
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            {c.active ? 'Aktif' : 'Pasif'}
          </span>
          <button
            type="button"
            onClick={onEdit}
            className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
          >
            <Edit3 size={13} />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {[
          { label: 'Kullanici', value: c.userCount, max: c.maxUsers, icon: Users },
          { label: 'Departman', value: c.departmentCount, max: c.maxDepartments, icon: Building2 },
          { label: 'Gorev', value: c.taskCount, max: null, icon: ClipboardList },
          { label: 'Mobil', value: c.mobileUserCount, max: c.maxMobileUsers, icon: Smartphone },
        ].map(item => (
          <div key={item.label} className="bg-slate-800/50 rounded-lg p-2.5 text-center">
            <item.icon size={12} className="mx-auto text-slate-500 mb-1" />
            <p className="text-[14px] font-bold text-white tabular-nums">{item.value}</p>
            <p className="text-[9px] text-slate-500">
              {item.label}
              {item.max != null && <span className="text-slate-600"> / {item.max}</span>}
            </p>
          </div>
        ))}
      </div>

      {/* License */}
      <div className="flex items-center gap-2 text-[10px] text-slate-500">
        <span className="font-mono bg-slate-800/60 px-1.5 py-0.5 rounded text-slate-400">{c.licenseKey}</span>
        <span>-</span>
        <span>{new Date(c.createdAt).toLocaleDateString('tr-TR')}</span>
      </div>

      {/* Edit Form */}
      {isEditing && (
        <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
          <p className="text-[11px] font-semibold text-cyan-400 mb-2">Limitleri Düzenle</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[9px] uppercase tracking-wider text-slate-500 mb-1">Maks Kullanici</label>
              <input
                type="number"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-[12px] text-white focus:outline-none focus:border-cyan-500 transition-colors"
                value={editForm.maxUsers}
                onChange={e => setEditForm({ ...editForm, maxUsers: +e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[9px] uppercase tracking-wider text-slate-500 mb-1">Maks Departman</label>
              <input
                type="number"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-[12px] text-white focus:outline-none focus:border-cyan-500 transition-colors"
                value={editForm.maxDepartments}
                onChange={e => setEditForm({ ...editForm, maxDepartments: +e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[9px] uppercase tracking-wider text-slate-500 mb-1">Maks Mobil</label>
              <input
                type="number"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-[12px] text-white focus:outline-none focus:border-cyan-500 transition-colors"
                value={editForm.maxMobileUsers}
                onChange={e => setEditForm({ ...editForm, maxMobileUsers: +e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-between items-center pt-1">
            <button
              type="button"
              onClick={handleDeactivate}
              disabled={deactivating}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                c.active
                  ? 'text-red-400 hover:bg-red-500/10 border border-red-500/20'
                  : 'text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20'
              }`}
            >
              {deactivating ? <Loader2 size={11} className="animate-spin" /> : c.active ? <Trash2 size={11} /> : <Check size={11} />}
              {c.active ? 'Deaktive Et' : 'Aktive Et'}
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onEdit}
                className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-slate-400 hover:bg-slate-800 border border-slate-700 transition-colors"
              >
                Iptal
              </button>
              <button
                type="button"
                onClick={handleSaveLimits}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-cyan-600 text-white hover:bg-cyan-500 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Create Company Form ──────────────────────────────────────────────────────

function CreateCompanyForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    name: '',
    sector: 'manufacturing',
    maxDepartments: 56,
    maxMobileUsers: 150,
    maxUsers: 50,
    kamName: '',
    kamEmail: '',
    kamPassword: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ company: any; kam: any } | null>(null)

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.kamName.trim() || !form.kamEmail.trim() || !form.kamPassword.trim()) {
      setError('Tum zorunlu alanlari doldurun.')
      return
    }
    if (form.kamPassword.length < 6) {
      setError('KAM sifresi en az 6 karakter olmali.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const result = await saFetch<{ company: any; kam: any }>('/super-admin/companies', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          sector: form.sector,
          maxDepartments: form.maxDepartments,
          maxMobileUsers: form.maxMobileUsers,
          maxUsers: form.maxUsers,
          kam: {
            name: form.kamName,
            email: form.kamEmail,
            password: form.kamPassword,
          },
        }),
      })
      setSuccess(result)
      setTimeout(() => onCreated(), 3000)
    } catch (e: any) {
      setError(e.message ?? 'Sirket oluşturulamadi')
    } finally { setSaving(false) }
  }

  if (success) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
          <Check size={24} className="text-emerald-400" />
        </div>
        <div>
          <p className="text-[15px] font-bold text-white">{success.company.name} oluşturuldu</p>
          <p className="text-[11px] text-slate-400 mt-1">KAM: {success.kam.name} ({success.kam.email})</p>
          <p className="text-[10px] text-slate-500 mt-2 font-mono">Lisans: {success.company.licenseKey}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-bold text-white">Yeni Sirket Oluştur</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Sirket bilgileri ve KAM (Key Account Manager) hesabi</p>
        </div>
        <button type="button" onClick={onCancel} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Company Info */}
      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-wider text-cyan-400 font-semibold">Sirket Bilgileri</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Sirket Adi *</label>
            <input
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-[13px] text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
              placeholder="Ornek: ABC Uretim A.S."
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Sektor *</label>
            <select
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-[13px] text-white focus:outline-none focus:border-cyan-500 transition-colors"
              value={form.sector}
              onChange={e => setForm({ ...form, sector: e.target.value })}
            >
              {SECTORS.map(s => (
                <option key={s.id} value={s.id}>{s.icon} {s.shortName} - {s.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[9px] uppercase tracking-wider text-slate-500 mb-1">Maks Dept</label>
              <input
                type="number"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-2.5 text-[12px] text-white focus:outline-none focus:border-cyan-500 transition-colors"
                value={form.maxDepartments}
                onChange={e => setForm({ ...form, maxDepartments: +e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[9px] uppercase tracking-wider text-slate-500 mb-1">Maks Mobil</label>
              <input
                type="number"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-2.5 text-[12px] text-white focus:outline-none focus:border-cyan-500 transition-colors"
                value={form.maxMobileUsers}
                onChange={e => setForm({ ...form, maxMobileUsers: +e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[9px] uppercase tracking-wider text-slate-500 mb-1">Maks User</label>
              <input
                type="number"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-2.5 text-[12px] text-white focus:outline-none focus:border-cyan-500 transition-colors"
                value={form.maxUsers}
                onChange={e => setForm({ ...form, maxUsers: +e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* KAM Info */}
      <div className="space-y-3 pt-2 border-t border-slate-800">
        <p className="text-[10px] uppercase tracking-wider text-cyan-400 font-semibold">KAM Hesabi (Platform Admin)</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Ad Soyad *</label>
            <input
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-[13px] text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
              placeholder="Ahmet Yilmaz"
              value={form.kamName}
              onChange={e => setForm({ ...form, kamName: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">E-posta *</label>
            <input
              type="email"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-[13px] text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
              placeholder="admin@sirket.com"
              value={form.kamEmail}
              onChange={e => setForm({ ...form, kamEmail: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Sifre * <span className="normal-case text-slate-600">(min 6 karakter)</span></label>
            <input
              type="password"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-[13px] text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
              placeholder="Guclu bir sifre girin"
              value={form.kamPassword}
              onChange={e => setForm({ ...form, kamPassword: e.target.value })}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertTriangle size={13} className="text-red-400 flex-shrink-0" />
          <p className="text-[11px] text-red-400">{error}</p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-[12px] font-medium text-slate-400 hover:bg-slate-800 border border-slate-700 transition-colors"
        >
          Iptal
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold bg-cyan-600 text-white hover:bg-cyan-500 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          Sirket + KAM Oluştur
        </button>
      </div>
    </div>
  )
}

// ── Monitoring Tab ───────────────────────────────────────────────────────────

function MonitoringTab() {
  const [companies, setCompanies] = useState<CompanyItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loadingCompanies, setLoadingCompanies] = useState(true)

  useEffect(() => {
    saFetch<CompanyItem[]>('/super-admin/companies')
      .then(data => { setCompanies(data); if (data.length > 0 && !selectedId) setSelectedId(data[0].id) })
      .catch(() => {})
      .finally(() => setLoadingCompanies(false))
  }, [])

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h2 className="text-[18px] font-bold text-white">Izleme</h2>
        <p className="text-[12px] text-slate-400 mt-0.5">Sirket organizasyon yapisi ve kullanici detaylari</p>
      </div>

      {/* Company Selector */}
      <div className="flex items-center gap-3">
        <label className="text-[11px] font-semibold text-slate-400">Sirket:</label>
        {loadingCompanies ? (
          <Loader2 size={14} className="animate-spin text-slate-500" />
        ) : (
          <select
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-[12px] text-white focus:outline-none focus:border-cyan-500 transition-colors min-w-[250px]"
            value={selectedId ?? ''}
            onChange={e => setSelectedId(e.target.value)}
          >
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name} - {getSectorLabel(c.sector)}</option>
            ))}
          </select>
        )}
      </div>

      {selectedId && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <OrgTree companyId={selectedId} />
          <CompanyUserList companyId={selectedId} />
        </div>
      )}
    </div>
  )
}

// ── Org Tree ─────────────────────────────────────────────────────────────────

function OrgTree({ companyId }: { companyId: string }) {
  const [tree, setTree] = useState<{ company: any; departments: TreeDepartment[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    saFetch<{ company: any; departments: TreeDepartment[] }>(`/super-admin/companies/${companyId}/tree`)
      .then(setTree)
      .catch(() => setTree(null))
      .finally(() => setLoading(false))
  }, [companyId])

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 size={20} className="animate-spin text-cyan-500" />
        </div>
      </div>
    )
  }

  if (!tree) return null

  const rootDepts = tree.departments.filter(d => !d.parentId)
  const childDepts = (parentId: string) => tree.departments.filter(d => d.parentId === parentId)

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Building2 size={15} className="text-cyan-400" />
        <h3 className="text-[13px] font-bold text-white">Organizasyon Agaci</h3>
        <span className="text-[10px] text-slate-500 ml-auto">{tree.departments.length} departman</span>
      </div>

      <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
        {rootDepts.length === 0 && tree.departments.length > 0 ? (
          // No hierarchy - show flat list
          tree.departments.map(d => (
            <DeptRow key={d.id} dept={d} level={0} childDepts={childDepts} />
          ))
        ) : (
          rootDepts.map(d => (
            <DeptRow key={d.id} dept={d} level={0} childDepts={childDepts} />
          ))
        )}
        {tree.departments.length === 0 && (
          <p className="text-[11px] text-slate-500 text-center py-4">Henuz departman yok</p>
        )}
      </div>
    </div>
  )
}

function DeptRow({ dept, level, childDepts }: { dept: TreeDepartment; level: number; childDepts: (id: string) => TreeDepartment[] }) {
  const [expanded, setExpanded] = useState(level < 2)
  const children = childDepts(dept.id)

  return (
    <div>
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer"
        style={{ paddingLeft: `${12 + level * 20}px` }}
        onClick={() => setExpanded(!expanded)}
      >
        {children.length > 0 ? (
          <ChevronDown size={12} className={`text-slate-500 transition-transform ${expanded ? '' : '-rotate-90'}`} />
        ) : (
          <span className="w-3" />
        )}
        <span className="w-3 h-3 rounded flex-shrink-0" style={{ background: dept.color || '#6366f1' }} />
        <span className="text-[12px] font-medium text-white flex-1 truncate">{dept.name}</span>
        <span className="text-[10px] text-slate-500 tabular-nums">{dept._count.members} kisi</span>
        <span className="text-[10px] text-slate-600 tabular-nums">{dept._count.tasks} gorev</span>
      </div>
      {expanded && children.map(child => (
        <DeptRow key={child.id} dept={child} level={level + 1} childDepts={childDepts} />
      ))}
    </div>
  )
}

// ── Company User List ────────────────────────────────────────────────────────

function CompanyUserList({ companyId }: { companyId: string }) {
  const [users, setUsers] = useState<CompanyUser[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 20

  useEffect(() => {
    setLoading(true)
    setPage(1)
    fetchPage(1)
  }, [companyId])

  const fetchPage = (p: number) => {
    setLoading(true)
    fetch(`${API_BASE}/super-admin/companies/${companyId}/users?page=${p}&pageSize=${pageSize}`, {
      headers: { 'Authorization': `Bearer ${tokenStore.get()}` },
      credentials: 'include',
    })
      .then(r => r.json())
      .then(body => {
        setUsers(body.data ?? [])
        setTotal(body.meta?.total ?? 0)
        setPage(p)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Users size={15} className="text-cyan-400" />
        <h3 className="text-[13px] font-bold text-white">Kullanicilar</h3>
        <span className="text-[10px] text-slate-500 ml-auto">{total} toplam</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={20} className="animate-spin text-cyan-500" />
        </div>
      ) : users.length === 0 ? (
        <p className="text-[11px] text-slate-500 text-center py-4">Bu sirkette henuz kullanici yok</p>
      ) : (
        <div className="space-y-1.5 max-h-[450px] overflow-y-auto pr-1">
          {users.map(u => (
            <div key={u.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-slate-800/40 hover:bg-slate-800/60 transition-colors">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                u.isMobileUser
                  ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                  : 'bg-gradient-to-br from-cyan-500 to-blue-600'
              }`}>
                <span className="text-white text-[9px] font-bold">
                  {u.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[12px] font-semibold text-white truncate">{u.name}</p>
                  {u.isMobileUser && (
                    <Smartphone size={10} className="text-amber-400 flex-shrink-0" />
                  )}
                </div>
                <p className="text-[10px] text-slate-500 truncate">{u.email}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-700/60 text-slate-300">
                  {ROLE_MAP[u.role] ?? u.role}
                </span>
                <div className="flex items-center gap-1 justify-end mt-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${u.active ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                  <span className="text-[9px] text-slate-500">{u.active ? 'Aktif' : 'Pasif'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <p className="text-[10px] text-slate-500">
            Sayfa {page} / {totalPages}
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => fetchPage(page - 1)}
              className="px-2.5 py-1 rounded text-[10px] font-medium text-slate-400 hover:bg-slate-800 disabled:opacity-30 transition-colors"
            >
              Onceki
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => fetchPage(page + 1)}
              className="px-2.5 py-1 rounded text-[10px] font-medium text-slate-400 hover:bg-slate-800 disabled:opacity-30 transition-colors"
            >
              Sonraki
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Logs Tab ─────────────────────────────────────────────────────────────────

function LogsTab() {
  const [companies, setCompanies] = useState<CompanyItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [actionFilter, setActionFilter] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const pageSize = 25

  useEffect(() => {
    saFetch<CompanyItem[]>('/super-admin/companies')
      .then(data => {
        setCompanies(data)
        if (data.length > 0) setSelectedId(data[0].id)
      })
      .catch(() => {})
      .finally(() => setLoadingCompanies(false))
  }, [])

  const fetchLogs = useCallback((companyId: string, p: number) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p), pageSize: String(pageSize) })
    if (actionFilter) params.set('action', actionFilter)
    if (entityFilter) params.set('entity', entityFilter)

    fetch(`${API_BASE}/super-admin/companies/${companyId}/audit-logs?${params}`, {
      headers: { 'Authorization': `Bearer ${tokenStore.get()}` },
      credentials: 'include',
    })
      .then(r => r.json())
      .then(body => {
        setLogs(body.data ?? [])
        setTotal(body.meta?.total ?? 0)
        setPage(p)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [actionFilter, entityFilter])

  useEffect(() => {
    if (selectedId) fetchLogs(selectedId, 1)
  }, [selectedId, fetchLogs])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h2 className="text-[18px] font-bold text-white">Audit Loglar</h2>
        <p className="text-[12px] text-slate-400 mt-0.5">Sirket bazinda denetim kayitlari</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-semibold text-slate-400">Sirket:</label>
          {loadingCompanies ? (
            <Loader2 size={14} className="animate-spin text-slate-500" />
          ) : (
            <select
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-[12px] text-white focus:outline-none focus:border-cyan-500 transition-colors min-w-[200px]"
              value={selectedId ?? ''}
              onChange={e => setSelectedId(e.target.value)}
            >
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Filter size={12} className="text-slate-500" />
          <input
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-[11px] text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors w-32"
            placeholder="Action filtre"
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
          />
          <input
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-[11px] text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors w-32"
            placeholder="Entity filtre"
            value={entityFilter}
            onChange={e => setEntityFilter(e.target.value)}
          />
          <button
            type="button"
            onClick={() => selectedId && fetchLogs(selectedId, 1)}
            className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Filtrele"
          >
            <Search size={13} />
          </button>
        </div>
      </div>

      {/* Log Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/40">
                <th className="text-left py-3 px-4 font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Tarih</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Kullanici</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Aksiyon</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Varlik</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Detay</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-400 uppercase tracking-wider text-[9px]">IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <Loader2 size={18} className="animate-spin text-cyan-500 mx-auto" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    {selectedId ? 'Bu sirket için log bulunamadi' : 'Bir sirket secin'}
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap tabular-nums">
                      {new Date(log.createdAt).toLocaleString('tr-TR', {
                        day: '2-digit', month: '2-digit', year: '2-digit',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 px-4 text-white font-medium">{log.user?.name ?? '-'}</td>
                    <td className="py-2.5 px-4">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        log.action.includes('CREATE') || log.action.includes('create')
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : log.action.includes('DELETE') || log.action.includes('delete')
                          ? 'bg-red-500/10 text-red-400'
                          : log.action.includes('UPDATE') || log.action.includes('update')
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-slate-700/60 text-slate-300'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-300 font-mono text-[10px]">{log.entity}</td>
                    <td className="py-2.5 px-4 text-slate-500 max-w-[200px] truncate">{log.detail ?? '-'}</td>
                    <td className="py-2.5 px-4 text-slate-600 font-mono text-[10px]">{log.ip ?? '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
            <p className="text-[10px] text-slate-500">
              {total} kayittan {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} arasi
            </p>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => selectedId && fetchLogs(selectedId, page - 1)}
                className="px-2.5 py-1 rounded text-[10px] font-medium text-slate-400 hover:bg-slate-800 disabled:opacity-30 transition-colors"
              >
                Onceki
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page + i - 2
                if (p < 1 || p > totalPages) return null
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => selectedId && fetchLogs(selectedId, p)}
                    className={`w-7 h-7 rounded text-[10px] font-medium transition-colors ${
                      p === page
                        ? 'bg-cyan-600 text-white'
                        : 'text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {p}
                  </button>
                )
              })}
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => selectedId && fetchLogs(selectedId, page + 1)}
                className="px-2.5 py-1 rounded text-[10px] font-medium text-slate-400 hover:bg-slate-800 disabled:opacity-30 transition-colors"
              >
                Sonraki
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab() {
  const { user } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleChangePassword = async () => {
    setError(null)
    setSuccess(false)

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Tum alanlari doldurun.')
      return
    }
    if (newPassword.length < 6) {
      setError('Yeni sifre en az 6 karakter olmali.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Yeni sifreler eslesmedi.')
      return
    }

    setSaving(true)
    try {
      await saFetch('/auth/me/password', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (e: any) {
      setError(e.message ?? 'Sifre degistirilemedi')
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-5 max-w-lg">
      <div>
        <h2 className="text-[18px] font-bold text-white">Ayarlar</h2>
        <p className="text-[12px] text-slate-400 mt-0.5">Super Admin hesap ayarlari</p>
      </div>

      {/* Account Info */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Shield size={15} className="text-cyan-400" />
          <h3 className="text-[13px] font-bold text-white">Hesap Bilgileri</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800/50 rounded-lg p-3">
            <p className="text-[9px] uppercase tracking-wider text-slate-500 mb-1">Ad Soyad</p>
            <p className="text-[13px] font-semibold text-white">{user?.name ?? '-'}</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <p className="text-[9px] uppercase tracking-wider text-slate-500 mb-1">E-posta</p>
            <p className="text-[13px] font-semibold text-white">{user?.email ?? '-'}</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <p className="text-[9px] uppercase tracking-wider text-slate-500 mb-1">Rol</p>
            <p className="text-[13px] font-semibold text-cyan-400">Super Admin</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <p className="text-[9px] uppercase tracking-wider text-slate-500 mb-1">Yetki Seviyesi</p>
            <p className="text-[13px] font-semibold text-white">10 (Maksimum)</p>
          </div>
        </div>
      </div>

      {/* Password Change */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Lock size={15} className="text-cyan-400" />
          <h3 className="text-[13px] font-bold text-white">Sifre Degistir</h3>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Mevcut Sifre *</label>
            <input
              type="password"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-[13px] text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
              placeholder="Mevcut sifrenizi girin"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Yeni Sifre * <span className="normal-case text-slate-600">(min 6 karakter)</span></label>
            <input
              type="password"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-[13px] text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
              placeholder="Yeni sifrenizi girin"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Yeni Sifre (Tekrar) *</label>
            <input
              type="password"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-[13px] text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
              placeholder="Yeni sifrenizi tekrar girin"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertTriangle size={13} className="text-red-400 flex-shrink-0" />
            <p className="text-[11px] text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <Check size={13} className="text-emerald-400 flex-shrink-0" />
            <p className="text-[11px] text-emerald-400">Sifre basariyla degistirildi.</p>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={handleChangePassword}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold bg-cyan-600 text-white hover:bg-cyan-500 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Lock size={13} />}
            Sifre Degistir
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Module Access Admin Tab ─────────────────────────────────────────────────
const MODULES_LIST = [
  { code: 'SALES', label: 'Satis', icon: ShoppingCart, color: 'text-indigo-500 bg-indigo-50' },
  { code: 'ACCOUNTING', label: 'Muhasebe', icon: Calculator, color: 'text-emerald-500 bg-emerald-50' },
  { code: 'HR', label: 'Insan Kaynaklari', icon: UserCog, color: 'text-violet-500 bg-violet-50' },
]

function ModuleAccessAdminTab() {
  const [companies, setCompanies] = useState<CompanyItem[]>([])
  const [selectedCompany, setSelectedCompany] = useState('')
  const [selectedModule, setSelectedModule] = useState('SALES')
  const [companyUsers, setCompanyUsers] = useState<{ id: string; name: string; email: string; role: string }[]>([])
  const [accessList, setAccessList] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  // Fetch companies
  useEffect(() => {
    saFetch<any>('/super-admin/companies').then(data => {
      setCompanies((data.data ?? data ?? []).sort((a: any, b: any) => a.name.localeCompare(b.name)))
    }).catch(() => {})
  }, [])

  // Fetch company users + access when company or module changes
  useEffect(() => {
    if (!selectedCompany) { setCompanyUsers([]); setAccessList([]); return }
    setLoading(true)
    Promise.all([
      saFetch<any>(`/super-admin/companies/${selectedCompany}/users?pageSize=500`),
      saFetch<any>(`/super-admin/companies/${selectedCompany}/module-access?moduleCode=${selectedModule}`),
    ]).then(([usersRes, accessRes]) => {
      setCompanyUsers((usersRes.data ?? usersRes ?? []).map((u: any) => ({ id: u.id, name: u.name, email: u.email, role: u.role })))
      setAccessList(accessRes.data ?? accessRes ?? [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [selectedCompany, selectedModule])

  const assignedIds = new Set(accessList.map((a: any) => a.userId))

  const handleGrant = async (userId: string) => {
    try {
      await saFetch(`/super-admin/companies/${selectedCompany}/module-access`, {
        method: 'POST',
        body: JSON.stringify({ userId, moduleCode: selectedModule }),
      })
      // Refresh
      const res = await saFetch<any>(`/super-admin/companies/${selectedCompany}/module-access?moduleCode=${selectedModule}`)
      setAccessList(res.data ?? res ?? [])
    } catch (e: any) { alert(e.message) }
  }

  const handleRevoke = async (accessId: string) => {
    try {
      await saFetch(`/super-admin/companies/${selectedCompany}/module-access/${accessId}`, { method: 'DELETE' })
      setAccessList(accessList.filter((a: any) => a.id !== accessId))
    } catch (e: any) { alert(e.message) }
  }

  const handleBulkGrant = async () => {
    if (!confirm(`Tum firma kullanicilarina ${selectedModule} yetkisi verilsin mi?`)) return
    try {
      const userIds = companyUsers.map(u => u.id)
      await saFetch(`/super-admin/companies/${selectedCompany}/module-access/bulk`, {
        method: 'POST',
        body: JSON.stringify({ userIds, moduleCode: selectedModule }),
      })
      const res = await saFetch<any>(`/super-admin/companies/${selectedCompany}/module-access?moduleCode=${selectedModule}`)
      setAccessList(res.data ?? res ?? [])
    } catch (e: any) { alert(e.message) }
  }

  const filteredUsers = companyUsers.filter(u => {
    if (!search) return true
    const s = search.toLowerCase()
    return u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s)
  })

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white">ERP Modul Yetkileri</h2>
      <p className="text-sm text-zinc-400">Firma secin, modul secin, kullanicilara yetki verin.</p>

      {/* Company selector */}
      <select
        className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm"
        value={selectedCompany}
        onChange={e => setSelectedCompany(e.target.value)}
      >
        <option value="">Firma secin...</option>
        {companies.map(c => (
          <option key={c.id} value={c.id}>{c.name} ({c.userCount} kullanici)</option>
        ))}
      </select>

      {selectedCompany && (
        <>
          {/* Module selector */}
          <div className="flex gap-2">
            {MODULES_LIST.map(m => (
              <button
                key={m.code}
                onClick={() => setSelectedModule(m.code)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                  selectedModule === m.code
                    ? 'bg-cyan-600 text-white border-cyan-500'
                    : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <m.icon className="w-4 h-4" />
                {m.label}
              </button>
            ))}
          </div>

          {/* Bulk grant + search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500"
                placeholder="Kullanici ara..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button
              onClick={handleBulkGrant}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 transition-colors"
            >
              Tum Kullanicilara Ver
            </button>
          </div>

          {/* Users list */}
          {loading ? (
            <div className="text-center py-8 text-zinc-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
          ) : (
            <div className="rounded-xl border border-zinc-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-800/50 border-b border-zinc-700">
                    <th className="text-left px-4 py-2.5 text-zinc-400 font-medium">Kullanici</th>
                    <th className="text-left px-4 py-2.5 text-zinc-400 font-medium">Rol</th>
                    <th className="text-center px-4 py-2.5 text-zinc-400 font-medium">{selectedModule}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => {
                    const access = accessList.find((a: any) => a.userId === u.id)
                    const hasAccess = !!access
                    return (
                      <tr key={u.id} className="border-b border-zinc-800 hover:bg-zinc-800/30">
                        <td className="px-4 py-2.5">
                          <div className="text-white font-medium">{u.name}</div>
                          <div className="text-xs text-zinc-500">{u.email}</div>
                        </td>
                        <td className="px-4 py-2.5 text-zinc-400 text-xs">{u.role}</td>
                        <td className="px-4 py-2.5 text-center">
                          {hasAccess ? (
                            <button
                              onClick={() => handleRevoke(access.id)}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium hover:bg-red-500/20 hover:text-red-400 transition-colors"
                            >
                              <Check className="w-3 h-3" /> Yetkili
                            </button>
                          ) : (
                            <button
                              onClick={() => handleGrant(u.id)}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-zinc-700 text-zinc-400 text-xs font-medium hover:bg-cyan-600 hover:text-white transition-colors"
                            >
                              <Plus className="w-3 h-3" /> Yetki Ver
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="text-xs text-zinc-500">
            {accessList.length} / {companyUsers.length} kullanici {selectedModule} modulune yetkili
          </div>
        </>
      )}
    </div>
  )
}
