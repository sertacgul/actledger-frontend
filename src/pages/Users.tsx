import { useState, useRef } from 'react'
import { Search, Plus, UserCheck, UserX, Shield, Mail, Phone, Building2, AlertCircle, Eye, EyeOff, Upload } from 'lucide-react'
import clsx from 'clsx'
import { useUsers, useDepartments, createUser } from '../lib/hooks'
import type { User, UserRole, Department } from '../types'
import { ROLE_LABELS, ROLE_HIERARCHY } from '../types'
import DraggableModal from '../components/ui/DraggableModal'
import BulkImportModal, { type ColumnMapping } from '../components/ui/BulkImportModal'
import { exportToExcel } from '../lib/excelExport'
import { useToolbarActions } from '../lib/useToolbarActions'
import { useAuth } from '../context/AuthContext'

const ROLE_COLORS: Record<UserRole, string> = {
  super_admin:    'bg-rose-100 text-rose-800',
  platform_admin: 'bg-red-100 text-red-700',
  genel_mudur:    'bg-purple-100 text-purple-700',
  gm_yardimcisi:  'bg-blue-100 text-blue-700',
  direktor:       'bg-blue-100 text-blue-700',
  mudur:          'bg-sky-100 text-sky-700',
  supervizor:     'bg-teal-100 text-teal-700',
  muhendis:       'bg-green-100 text-green-700',
  teknisyen:      'bg-amber-100 text-amber-700',
  isci:           'bg-slate-100 text-slate-600',
}

function UserCard({ user, departments }: { user: User; departments: Department[] }) {
  const dept     = departments.find(d => d.id === user.departmentId)
  const initials = user.name.split(' ').map(n => n[0]).slice(0, 2).join('')

  return (
    <div className="card p-4 hover:shadow-md transition-all">
      <div className="flex items-start gap-3 mb-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-semibold">{initials}</span>
          </div>
          <div className={clsx(
            'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white',
            user.active ? 'bg-green-500' : 'bg-slate-300'
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
          <span className={clsx('badge text-[10px]', ROLE_COLORS[user.role])}>
            {ROLE_LABELS[user.role]}
          </span>
        </div>
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex items-center gap-2 text-slate-500">
          <Mail size={12} className="flex-shrink-0 text-slate-400" />
          <span className="truncate">{user.email}</span>
        </div>
        {user.phone && (
          <div className="flex items-center gap-2 text-slate-500">
            <Phone size={12} className="flex-shrink-0 text-slate-400" />
            <span>{user.phone}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-slate-500">
          <Building2 size={12} className="flex-shrink-0 text-slate-400" />
          <span>{dept?.name ?? '-'}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
        <span className={clsx(
          'text-[10px] font-medium flex items-center gap-1',
          user.active ? 'text-green-600' : 'text-slate-400'
        )}>
          {user.active ? <UserCheck size={11} /> : <UserX size={11} />}
          {user.active ? 'Aktif' : 'Pasif'}
        </span>
        <span className="text-[10px] text-slate-400">
          Katılım: {new Date(user.createdAt).toLocaleDateString('tr-TR')}
        </span>
      </div>
    </div>
  )
}

function InviteModal({
  departments, onClose, onCreated,
}: {
  departments: Department[]
  onClose: () => void
  onCreated: () => void
}) {
  const [form, setForm] = useState({
    name: '', surname: '', email: '', role: 'isci' as UserRole,
    departmentId: departments[0]?.id ?? '', phone: '',
    title: '', position: '',
  })
  const [password,   setPassword]   = useState('')
  const [showPass,   setShowPass]   = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [err,        setErr]        = useState<string | null>(null)
  const [created,    setCreated]    = useState(false)

  const handleSubmit = async () => {
    const fullName = `${form.name} ${form.surname}`.trim()
    if (!form.name || !form.surname || !form.email || !password) return
    setSaving(true)
    setErr(null)
    try {
      await createUser({
        name:         fullName,
        email:        form.email,
        password,
        role:         form.role,
        departmentId: form.departmentId,
        phone:        form.phone || undefined,
      })
      setCreated(true)
      onCreated()
    } catch (e: any) {
      setErr(e.message ?? 'Kullanıcı oluşturulamadı')
    } finally {
      setSaving(false)
    }
  }

  if (created) {
    return (
      <DraggableModal title="Kullanıcı Oluşturuldu" icon={<UserCheck size={13} />} onClose={onClose} width={420}
        footer={<button type="button" onClick={onClose} className="btn-primary">Kapat</button>}>
        <div className="p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mx-auto mb-4">
            <UserCheck size={24} className="text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-base font-bold mb-1" style={{ color: 'var(--text-1)' }}>Kullanıcı Oluşturuldu</h2>
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>{form.name} sisteme eklendi.</p>
        </div>
      </DraggableModal>
    )
  }

  return (
    <DraggableModal
      title="Yeni Kullanıcı Ekle"
      icon={<Plus size={13} />}
      onClose={onClose}
      width={480}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary">İptal</button>
          <button type="button" onClick={handleSubmit} className="btn-primary"
            disabled={saving || !form.name || !form.surname || !form.email || password.length < 8}>
            <Plus size={15} /> {saving ? 'Oluşturuluyor...' : 'Kullanıcı Oluştur'}
          </button>
        </>
      }
    >
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="inv-name" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>Ad *</label>
            <input id="inv-name" className="input" placeholder="Ad" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label htmlFor="inv-surname" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>Soyad *</label>
            <input id="inv-surname" className="input" placeholder="Soyad" value={form.surname}
              onChange={e => setForm({ ...form, surname: e.target.value })} />
          </div>
        </div>
        <div>
          <label htmlFor="inv-email" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>E-posta *</label>
          <input id="inv-email" className="input" type="email" placeholder="email@sirket.com.tr" value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label htmlFor="inv-pass" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>Geçici Şifre *</label>
          <div className="relative">
            <input id="inv-pass" className="input pr-10" type={showPass ? 'text' : 'password'}
              placeholder="En az 8 karakter" value={password}
              onChange={e => setPassword(e.target.value)} />
            <button type="button" onClick={() => setShowPass(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--text-3)' }}>
              {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="inv-role" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>Rol</label>
            <select id="inv-role" className="select" value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value as UserRole })}>
              {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="inv-dept" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>Departman</label>
            <select id="inv-dept" className="select" value={form.departmentId}
              onChange={e => setForm({ ...form, departmentId: e.target.value })}>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="inv-title" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>Gorev / Unvan</label>
            <input id="inv-title" className="input" placeholder="Uretim Muduru" value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label htmlFor="inv-position" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>Kadro</label>
            <input id="inv-position" className="input" placeholder="Uretim Birim Sefi" value={form.position}
              onChange={e => setForm({ ...form, position: e.target.value })} />
          </div>
        </div>
        <div>
          <label htmlFor="inv-phone" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>Telefon</label>
          <input id="inv-phone" className="input" placeholder="+90 5xx xxx xx xx" value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })} />
        </div>
        {err && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 text-red-500 text-xs border border-red-500/20">
            <AlertCircle size={13} /> {err}
          </div>
        )}
      </div>
    </DraggableModal>
  )
}

export default function Users() {
  const [search,       setSearch]       = useState('')
  const [filterRole,   setFilterRole]   = useState<string>('tumu')
  const [filterDept,   setFilterDept]   = useState<string>('tumu')
  const [filterActive, setFilterActive] = useState<string>('aktif')
  const [showInvite,   setShowInvite]   = useState(false)
  const [showImport,   setShowImport]   = useState(false)
  const { user: currentUser } = useAuth()
  const isAdmin = currentUser?.role === 'platform_admin'

  const { users, loading, total, refetch } = useUsers({ search, role: filterRole, departmentId: filterDept, active: filterActive })
  const { departments, loading: deptsLoading    } = useDepartments()
  const searchRef = useRef<HTMLInputElement>(null)

  const handleExportExcel = () => {
    const deptMap = Object.fromEntries(departments.map(d => [d.id, d.name]))
    exportToExcel({
      filename:  `kullanicilar_${new Date().toISOString().slice(0,10)}.xlsx`,
      sheetName: 'Kullanıcılar',
      columns: [
        { header: 'Ad Soyad',  accessor: u => u.name,                                  width: 28 },
        { header: 'E-posta',   accessor: u => u.email,                                 width: 32 },
        { header: 'Rol',       accessor: u => ROLE_LABELS[u.role],                     width: 22 },
        { header: 'Departman', accessor: u => deptMap[u.departmentId] ?? '-',          width: 22 },
        { header: 'Telefon',   accessor: u => u.phone ?? '-',                          width: 16 },
        { header: 'Aktif',     accessor: u => u.active,                                width: 8  },
        { header: 'Kayıt',     accessor: u => new Date(u.createdAt).toLocaleDateString('tr-TR'), width: 12 },
      ],
      rows: users,
    })
  }

  useToolbarActions({
    onNew:     () => setShowInvite(true),
    onSearch:  () => searchRef.current?.focus(),
    onRefresh: () => refetch(),
    onExport:  () => handleExportExcel(),
  })

  const activeCount  = users.filter(u =>  u.active).length
  const passiveCount = users.filter(u => !u.active).length

  const roleGroups = Object.keys(ROLE_LABELS)
    .sort((a, b) => ROLE_HIERARCHY[b as UserRole] - ROLE_HIERARCHY[a as UserRole])
    .map(role => ({
      role:  role as UserRole,
      count: users.filter(u => u.role === role).length,
    }))
    .filter(g => g.count > 0)

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Toplam Kullanıcı', value: total         },
          { label: 'Aktif',            value: activeCount   },
          { label: 'Pasif',            value: passiveCount  },
          { label: 'Departman',        value: departments.length },
        ].map(item => (
          <div key={item.label} className="card p-4 text-center">
            {loading || deptsLoading ? (
              <div className="h-8 w-12 mx-auto animate-pulse bg-slate-100 rounded mb-1" />
            ) : (
              <p className="text-2xl font-bold text-slate-900">{item.value}</p>
            )}
            <p className="text-xs text-slate-500 mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Role Distribution */}
      {roleGroups.length > 0 && (
        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Rol Dağılımı</p>
          <div className="flex flex-wrap gap-2">
            {roleGroups.map(({ role, count }) => (
              <button
                key={role}
                type="button"
                onClick={() => setFilterRole(filterRole === role ? 'tumu' : role)}
                className={clsx(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
                  filterRole === role
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
                )}
              >
                <Shield size={11} />
                {ROLE_LABELS[role]}
                <span className={clsx(
                  'text-[10px] px-1.5 py-0.5 rounded-full font-semibold',
                  filterRole === role ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                )}>
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters & Actions */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={searchRef}
            className="input pl-9"
            placeholder="İsim veya e-posta ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          aria-label="Departman filtresi"
          className="select w-44"
          value={filterDept}
          onChange={e => setFilterDept(e.target.value)}
        >
          <option value="tumu">Tüm Departmanlar</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select
          aria-label="Aktiflik filtresi"
          className="select w-32"
          value={filterActive}
          onChange={e => setFilterActive(e.target.value)}
        >
          <option value="tumu">Tümü</option>
          <option value="aktif">Aktif</option>
          <option value="pasif">Pasif</option>
        </select>
        {isAdmin && (
          <>
            <button type="button" onClick={() => setShowImport(true)} className="btn-secondary">
              <Upload size={14} /> Toplu Aktar
            </button>
            <button type="button" onClick={() => setShowInvite(true)} className="btn-primary">
              <Plus size={16} /> Kullanici Ekle
            </button>
          </>
        )}
      </div>

      {/* User Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="card h-36 animate-pulse" />)}
        </div>
      ) : users.length === 0 ? (
        <div className="card p-12 text-center">
          <UserX size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Kullanıcı bulunamadı</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {users.map(user => (
            <UserCard key={user.id} user={user} departments={departments} />
          ))}
        </div>
      )}

      {showInvite && (
        <InviteModal
          departments={departments}
          onClose={() => setShowInvite(false)}
          onCreated={refetch}
        />
      )}

      {showImport && (
        <BulkImportModal
          title="Toplu Kullanici Aktarimi"
          columns={USER_IMPORT_COLUMNS}
          onImport={async (rows) => {
            let success = 0, failed = 0
            for (const row of rows) {
              try {
                const deptId = departments.find(d =>
                  d.name.toLowerCase() === (row.department ?? '').toLowerCase() ||
                  d.code.toLowerCase() === (row.department ?? '').toLowerCase()
                )?.id ?? departments[0]?.id ?? ''
                await createUser({
                  name: row.name || 'Isimsiz',
                  email: row.email || `user${Date.now()}@temp.com`,
                  password: row.password || 'Actledger2024!',
                  role: row.role || 'teknisyen',
                  departmentId: deptId,
                  phone: row.phone || undefined,
                })
                success++
              } catch { failed++ }
            }
            refetch()
            return { success, failed }
          }}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  )
}

const USER_IMPORT_COLUMNS: ColumnMapping[] = [
  { field: 'name',       label: 'Ad Soyad',    required: true },
  { field: 'email',      label: 'E-posta',     required: true },
  { field: 'role',       label: 'Rol' },
  { field: 'department', label: 'Departman' },
  { field: 'phone',      label: 'Telefon' },
  { field: 'password',   label: 'Sifre' },
]
