import { useState } from 'react'
import { Plus, Check, X, FileSpreadsheet } from 'lucide-react'
import clsx from 'clsx'
import { useLeaves, useEmployees, requestLeave, approveLeave, rejectLeave, cancelLeave } from '../../lib/erp-hooks'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import DraggableModal from '../ui/DraggableModal'
import type { LeaveType } from '../../types/erp'
import { LEAVE_TYPE_LABELS, LEAVE_STATUS_LABELS, LEAVE_STATUS_STYLES, DATE_FMT } from '../../types/erp'
import { exportToExcel } from '../../lib/excelExport'

const MANAGER_ROLES = ['PLATFORM_ADMIN', 'SUPER_ADMIN', 'GENEL_MUDUR', 'GM_YARDIMCISI', 'DIREKTOR', 'MUDUR']

export default function LeavesTab() {
  const { user } = useAuth()
  const { lang } = useLanguage()
  const canManage = MANAGER_ROLES.includes(user?.role?.toUpperCase() ?? '')
  const tr = lang === 'tr'

  const [statusFilter, setStatusFilter] = useState('')
  const { leaves, loading, refetch } = useLeaves({ status: statusFilter || undefined })
  const { employees } = useEmployees({ status: 'AKTIF' })

  const [creating, setCreating] = useState(false)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    employeeId: '', leaveType: 'YILLIK' as LeaveType,
    startDate: '', endDate: '', reason: '',
  })

  const handleCreate = async () => {
    setSaving(true)
    try {
      await requestLeave({
        employeeId: form.employeeId,
        leaveType: form.leaveType,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason || undefined,
      })
      setCreating(false)
      setForm({ employeeId: '', leaveType: 'YILLIK', startDate: '', endDate: '', reason: '' })
      refetch()
    } catch (e: any) { alert(e.message) }
    finally { setSaving(false) }
  }

  const handleApprove = async (id: string) => {
    try { await approveLeave(id); refetch() }
    catch (e: any) { alert(e.message) }
  }

  const handleReject = async () => {
    if (!rejectingId) return
    try { await rejectLeave(rejectingId, rejectReason || undefined); setRejectingId(null); setRejectReason(''); refetch() }
    catch (e: any) { alert(e.message) }
  }

  const handleCancel = async (id: string) => {
    if (!confirm(tr ? 'Izin talebini iptal etmek istiyor musunuz?' : 'Cancel this leave request?')) return
    try { await cancelLeave(id); refetch() }
    catch (e: any) { alert(e.message) }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select className="select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">{tr ? 'Tum Durumlar' : 'All'}</option>
          {Object.entries(LEAVE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={() => exportToExcel({
          filename: `izinler_${new Date().toISOString().slice(0, 10)}.xlsx`,
          sheetName: 'Izinler',
          columns: [
            { header: 'Calisan', accessor: (l: any) => l.employee?.user?.name ?? '', width: 24 },
            { header: 'Izin Turu', accessor: (l: any) => LEAVE_TYPE_LABELS[l.leaveType as keyof typeof LEAVE_TYPE_LABELS] ?? l.leaveType, width: 14 },
            { header: 'Baslangic', accessor: (l: any) => l.startDate?.slice(0, 10) ?? '', width: 12 },
            { header: 'Bitis', accessor: (l: any) => l.endDate?.slice(0, 10) ?? '', width: 12 },
            { header: 'Gun', accessor: (l: any) => l.days, width: 6 },
            { header: 'Durum', accessor: (l: any) => LEAVE_STATUS_LABELS[l.status as keyof typeof LEAVE_STATUS_LABELS] ?? l.status, width: 12 },
          ],
          rows: leaves,
        })} className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface)] text-[var(--text-3)]" title="Excel">
          <FileSpreadsheet className="w-4 h-4" />
        </button>
        {canManage && (
          <button onClick={() => setCreating(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500 text-white text-sm font-medium hover:bg-violet-600">
            <Plus className="w-4 h-4" />
            {tr ? 'Izin Talebi' : 'Leave Request'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--text-3)]">{tr ? 'Yukleniyor...' : 'Loading...'}</div>
      ) : leaves.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-3)]">{tr ? 'Izin talebi bulunamadi' : 'No leave requests found'}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Calisan' : 'Employee'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Izin Turu' : 'Leave Type'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Tarih' : 'Dates'}</th>
                <th className="text-center px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Gun' : 'Days'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Durum' : 'Status'}</th>
                {canManage && <th className="text-right px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {leaves.map(l => (
                <tr key={l.id} className="border-b border-[var(--border)] hover:bg-[var(--surface)]">
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--text-1)]">{l.employee?.user.name ?? '-'}</div>
                    <div className="text-xs text-[var(--text-3)]">{l.employee?.employeeNumber}</div>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-2)]">{LEAVE_TYPE_LABELS[l.leaveType]}</td>
                  <td className="px-4 py-3 text-[var(--text-2)]">{DATE_FMT(l.startDate)} - {DATE_FMT(l.endDate)}</td>
                  <td className="px-4 py-3 text-center font-medium text-[var(--text-1)]">{l.days}</td>
                  <td className="px-4 py-3">
                    <span className={clsx('text-xs px-2 py-0.5 rounded-full border', LEAVE_STATUS_STYLES[l.status])}>{LEAVE_STATUS_LABELS[l.status]}</span>
                  </td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      {l.status === 'BEKLIYOR' && (
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleApprove(l.id)} className="p-1.5 rounded-md hover:bg-emerald-50 text-[var(--text-3)] hover:text-emerald-500" title={tr ? 'Onayla' : 'Approve'}>
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setRejectingId(l.id); setRejectReason('') }} className="p-1.5 rounded-md hover:bg-red-50 text-[var(--text-3)] hover:text-red-500" title={tr ? 'Reddet' : 'Reject'}>
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      {['BEKLIYOR', 'ONAYLANDI'].includes(l.status) && (
                        <button onClick={() => handleCancel(l.id)} className="text-xs text-red-500 hover:text-red-600 ml-2">
                          {tr ? 'Iptal' : 'Cancel'}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <DraggableModal
          title={tr ? 'Izin Talebi' : 'Leave Request'}
          onClose={() => setCreating(false)}
          width={460}
          footer={
            <div className="flex gap-2 justify-end">
              <button onClick={() => setCreating(false)} className="px-4 py-2 rounded-lg text-sm text-[var(--text-2)] hover:bg-[var(--surface)]">{tr ? 'Iptal' : 'Cancel'}</button>
              <button onClick={handleCreate} disabled={saving || !form.employeeId || !form.startDate || !form.endDate} className="px-4 py-2 rounded-lg bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 disabled:opacity-50">
                {saving ? (tr ? 'Gonderiliyor...' : 'Submitting...') : (tr ? 'Talep Olustur' : 'Submit')}
              </button>
            </div>
          }
        >
          <div className="space-y-3 p-1">
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Calisan *' : 'Employee *'}</label>
              <select className="select w-full" value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })}>
                <option value="">{tr ? 'Calisan secin...' : 'Select...'}</option>
                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.user.name} ({emp.employeeNumber})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Izin Turu' : 'Leave Type'}</label>
              <select className="select w-full" value={form.leaveType} onChange={e => setForm({ ...form, leaveType: e.target.value as LeaveType })}>
                {Object.entries(LEAVE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Baslangic *' : 'Start *'}</label>
                <input className="input w-full" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Bitis *' : 'End *'}</label>
                <input className="input w-full" type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Neden' : 'Reason'}</label>
              <textarea className="input w-full h-16" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
            </div>
          </div>
        </DraggableModal>
      )}

      {rejectingId && (
        <DraggableModal
          title={tr ? 'Izin Reddi' : 'Reject Leave'}
          onClose={() => setRejectingId(null)}
          width={400}
          footer={
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRejectingId(null)} className="px-4 py-2 rounded-lg text-sm text-[var(--text-2)] hover:bg-[var(--surface)]">{tr ? 'Iptal' : 'Cancel'}</button>
              <button onClick={handleReject} className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600">{tr ? 'Reddet' : 'Reject'}</button>
            </div>
          }
        >
          <div className="p-1">
            <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Red Nedeni' : 'Rejection Reason'}</label>
            <textarea className="input w-full h-20" value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder={tr ? 'Opsiyonel...' : 'Optional...'} />
          </div>
        </DraggableModal>
      )}
    </div>
  )
}
