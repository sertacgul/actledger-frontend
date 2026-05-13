import { useState, useEffect } from 'react'
import { Plus, Search, Pencil, UserX, User, FileSpreadsheet } from 'lucide-react'
import clsx from 'clsx'
import { useEmployees, createEmployee, updateEmployee, terminateEmployee } from '../../lib/erp-hooks'
import { api } from '../../lib/api'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import DraggableModal from '../ui/DraggableModal'
import type { HREmployee, EmploymentStatus } from '../../types/erp'
import { EMPLOYMENT_STATUS_LABELS, EMPLOYMENT_STATUS_STYLES, TRY_FMT, DATE_FMT, toISO } from '../../types/erp'
import { exportToExcel } from '../../lib/excelExport'

const MANAGER_ROLES = ['PLATFORM_ADMIN', 'SUPER_ADMIN', 'GENEL_MUDUR', 'GM_YARDIMCISI', 'DIREKTOR', 'MUDUR']

export default function EmployeesTab() {
  const { user } = useAuth()
  const { lang } = useLanguage()
  const canManage = MANAGER_ROLES.includes(user?.role?.toUpperCase() ?? '')
  const tr = lang === 'tr'

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const { employees, loading, refetch } = useEmployees({ search: search || undefined, status: statusFilter || undefined })

  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<HREmployee | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    userId: '', startDate: new Date().toISOString().slice(0, 10), grossSalary: '',
    nationalId: '', sgkNumber: '', bankName: '', iban: '',
    emergencyContact: '', emergencyPhone: '', notes: '',
  })

  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([])
  useEffect(() => {
    api.get<any>('/users?pageSize=100').then((res: any) => {
      setUsers((res.data ?? res ?? []).map((u: any) => ({ id: u.id, name: u.name, email: u.email })))
    }).catch(() => {})
  }, [])

  const openCreate = () => {
    setForm({ userId: '', startDate: new Date().toISOString().slice(0, 10), grossSalary: '', nationalId: '', sgkNumber: '', bankName: '', iban: '', emergencyContact: '', emergencyPhone: '', notes: '' })
    setCreating(true)
  }

  const openEdit = (emp: HREmployee) => {
    setForm({
      userId: emp.userId,
      startDate: emp.startDate?.slice(0, 10) ?? '',
      grossSalary: emp.grossSalary ? String(emp.grossSalary) : '',
      nationalId: emp.nationalId ?? '',
      sgkNumber: emp.sgkNumber ?? '',
      bankName: emp.bankName ?? '',
      iban: emp.iban ?? '',
      emergencyContact: emp.emergencyContact ?? '',
      emergencyPhone: emp.emergencyPhone ?? '',
      notes: emp.notes ?? '',
    })
    setEditing(emp)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = {
        userId: form.userId,
        startDate: toISO(form.startDate),
        grossSalary: Number(form.grossSalary) || 0,
        nationalId: form.nationalId || undefined,
        sgkNumber: form.sgkNumber || undefined,
        bankName: form.bankName || undefined,
        iban: form.iban || undefined,
        emergencyContact: form.emergencyContact || undefined,
        emergencyPhone: form.emergencyPhone || undefined,
        notes: form.notes || undefined,
      }
      if (editing) await updateEmployee(editing.id, body)
      else await createEmployee(body)
      setCreating(false)
      setEditing(null)
      refetch()
    } catch (e: any) { alert(e.message) }
    finally { setSaving(false) }
  }

  const handleTerminate = async (emp: HREmployee) => {
    if (!confirm(`${emp.user.name} calisaninin isine son vermek istediginizden emin misiniz?`)) return
    try { await terminateEmployee(emp.id); refetch() }
    catch (e: any) { alert(e.message) }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-4)]" />
          <input className="input pl-9 w-full" placeholder={tr ? 'Calisan ara...' : 'Search employees...'} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">{tr ? 'Tum Durumlar' : 'All'}</option>
          {Object.entries(EMPLOYMENT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={() => exportToExcel({
          filename: `calisanlar_${new Date().toISOString().slice(0, 10)}.xlsx`,
          sheetName: 'Calisanlar',
          columns: [
            { header: 'Ad', accessor: (e: any) => e.user?.name ?? '', width: 24 },
            { header: 'Sicil No', accessor: (e: any) => e.employeeNumber, width: 12 },
            { header: 'E-posta', accessor: (e: any) => e.user?.email ?? '', width: 24 },
            { header: 'Departman', accessor: (e: any) => e.user?.departments?.[0]?.name ?? '', width: 18 },
            { header: 'Durum', accessor: (e: any) => EMPLOYMENT_STATUS_LABELS[e.employmentStatus as keyof typeof EMPLOYMENT_STATUS_LABELS] ?? e.employmentStatus, width: 12 },
            { header: 'Brut Maas', accessor: (e: any) => Number(e.grossSalary) || 0, width: 14 },
            { header: 'Ise Baslama', accessor: (e: any) => e.startDate?.slice(0, 10) ?? '', width: 12 },
          ],
          rows: employees,
        })} className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface)] text-[var(--text-3)]" title="Excel">
          <FileSpreadsheet className="w-4 h-4" />
        </button>
        {canManage && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500 text-white text-sm font-medium hover:bg-violet-600">
            <Plus className="w-4 h-4" />
            {tr ? 'Yeni Calisan' : 'New Employee'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--text-3)]">{tr ? 'Yukleniyor...' : 'Loading...'}</div>
      ) : employees.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-3)]">{tr ? 'Calisan bulunamadi' : 'No employees found'}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Calisan' : 'Employee'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Sicil No' : 'Employee #'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Departman' : 'Department'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Durum' : 'Status'}</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Brut Maas' : 'Gross Salary'}</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Ise Baslama' : 'Start Date'}</th>
                {canManage && <th className="text-right px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id} className="border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--text-1)]">{emp.user.name}</div>
                    <div className="text-xs text-[var(--text-3)]">{emp.user.email}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-[var(--text-2)]">{emp.employeeNumber}</td>
                  <td className="px-4 py-3 text-[var(--text-2)]">{emp.user.departments?.[0]?.name ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className={clsx('text-xs px-2 py-0.5 rounded-full border', EMPLOYMENT_STATUS_STYLES[emp.employmentStatus])}>
                      {EMPLOYMENT_STATUS_LABELS[emp.employmentStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[var(--text-1)]">{TRY_FMT(emp.grossSalary)}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-3)]">{DATE_FMT(emp.startDate)}</td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(emp)} className="p-1.5 rounded-md hover:bg-[var(--bg)] text-[var(--text-3)] hover:text-violet-500"><Pencil className="w-4 h-4" /></button>
                        {emp.employmentStatus === 'AKTIF' && (
                          <button onClick={() => handleTerminate(emp)} className="p-1.5 rounded-md hover:bg-[var(--bg)] text-[var(--text-3)] hover:text-red-500"><UserX className="w-4 h-4" /></button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(creating || editing) && (
        <DraggableModal
          title={editing ? (tr ? 'Calisan Duzenle' : 'Edit Employee') : (tr ? 'Yeni Calisan' : 'New Employee')}
          icon={<User className="w-5 h-5 text-violet-500" />}
          onClose={() => { setCreating(false); setEditing(null) }}
          width={560}
          footer={
            <div className="flex justify-end gap-2">
              <button onClick={() => { setCreating(false); setEditing(null) }} className="px-4 py-2 rounded-lg text-sm text-[var(--text-2)] hover:bg-[var(--surface)]">{tr ? 'Iptal' : 'Cancel'}</button>
              <button onClick={handleSave} disabled={saving || (!editing && !form.userId)} className="px-4 py-2 rounded-lg bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 disabled:opacity-50">
                {saving ? (tr ? 'Kaydediliyor...' : 'Saving...') : (tr ? 'Kaydet' : 'Save')}
              </button>
            </div>
          }
        >
          <div className="space-y-3 p-1">
            {!editing && (
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Kullanici *' : 'User *'}</label>
                <select className="select w-full" value={form.userId} onChange={e => setForm({ ...form, userId: e.target.value })}>
                  <option value="">{tr ? 'Kullanici secin...' : 'Select user...'}</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Ise Baslama *' : 'Start Date *'}</label>
                <input className="input w-full" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Brut Maas *' : 'Gross Salary *'}</label>
                <input className="input w-full" type="number" value={form.grossSalary} onChange={e => setForm({ ...form, grossSalary: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'TC Kimlik No' : 'National ID'}</label>
                <input className="input w-full" value={form.nationalId} onChange={e => setForm({ ...form, nationalId: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'SGK No' : 'SSI Number'}</label>
                <input className="input w-full" value={form.sgkNumber} onChange={e => setForm({ ...form, sgkNumber: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Banka' : 'Bank'}</label>
                <input className="input w-full" value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">IBAN</label>
                <input className="input w-full" value={form.iban} onChange={e => setForm({ ...form, iban: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Acil Kisi' : 'Emergency Contact'}</label>
                <input className="input w-full" value={form.emergencyContact} onChange={e => setForm({ ...form, emergencyContact: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Acil Telefon' : 'Emergency Phone'}</label>
                <input className="input w-full" value={form.emergencyPhone} onChange={e => setForm({ ...form, emergencyPhone: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Notlar' : 'Notes'}</label>
              <textarea className="input w-full h-16" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
        </DraggableModal>
      )}
    </div>
  )
}
