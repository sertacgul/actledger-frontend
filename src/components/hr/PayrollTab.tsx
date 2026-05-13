import { useState } from 'react'
import { Plus, Calculator, Check, ChevronDown, ChevronRight, FileSpreadsheet } from 'lucide-react'
import clsx from 'clsx'
import { usePayrollPeriods, usePayrollRecords, createPayrollPeriod, calculatePayroll, approvePayroll } from '../../lib/erp-hooks'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import DraggableModal from '../ui/DraggableModal'
import type { PayrollPeriod } from '../../types/erp'
import { PAYROLL_STATUS_LABELS, PAYROLL_STATUS_STYLES, MONTH_LABELS, TRY_FMT } from '../../types/erp'
import { exportToExcel } from '../../lib/excelExport'

const MANAGER_ROLES = ['PLATFORM_ADMIN', 'SUPER_ADMIN', 'GENEL_MUDUR', 'GM_YARDIMCISI', 'DIREKTOR', 'MUDUR']

export default function PayrollTab() {
  const { user } = useAuth()
  const { lang } = useLanguage()
  const canManage = MANAGER_ROLES.includes(user?.role?.toUpperCase() ?? '')
  const tr = lang === 'tr'

  const { periods, loading, refetch } = usePayrollPeriods()
  const [creating, setCreating] = useState(false)
  const [viewingPeriodId, setViewingPeriodId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const now = new Date()
  const [newYear, setNewYear] = useState(now.getFullYear())
  const [newMonth, setNewMonth] = useState(now.getMonth() + 1)

  const handleCreate = async () => {
    setSaving(true)
    try {
      await createPayrollPeriod({ year: newYear, month: newMonth })
      setCreating(false)
      refetch()
    } catch (e: any) { alert(e.message) }
    finally { setSaving(false) }
  }

  const handleCalculate = async (period: PayrollPeriod) => {
    try { await calculatePayroll(period.id); refetch() }
    catch (e: any) { alert(e.message) }
  }

  const handleApprove = async (period: PayrollPeriod) => {
    if (!confirm(tr ? 'Bordroyu onaylamak istiyor musunuz?' : 'Approve this payroll?')) return
    try { await approvePayroll(period.id); refetch() }
    catch (e: any) { alert(e.message) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {canManage && (
          <button onClick={() => setCreating(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500 text-white text-sm font-medium hover:bg-violet-600">
            <Plus className="w-4 h-4" />
            {tr ? 'Yeni Donem' : 'New Period'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--text-3)]">{tr ? 'Yukleniyor...' : 'Loading...'}</div>
      ) : periods.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-3)]">{tr ? 'Bordro donemi bulunamadi' : 'No payroll periods found'}</div>
      ) : (
        <div className="space-y-3">
          {periods.sort((a, b) => b.year - a.year || b.month - a.month).map(period => (
            <div key={period.id} className="card p-4">
              <div className="flex items-center gap-3">
                <button onClick={() => setViewingPeriodId(viewingPeriodId === period.id ? null : period.id)} className="p-1 rounded hover:bg-[var(--surface)]">
                  {viewingPeriodId === period.id ? <ChevronDown className="w-4 h-4 text-[var(--text-3)]" /> : <ChevronRight className="w-4 h-4 text-[var(--text-3)]" />}
                </button>
                <div className="flex-1">
                  <div className="font-semibold text-[var(--text-1)]">{MONTH_LABELS[period.month]} {period.year}</div>
                  <div className="text-xs text-[var(--text-3)]">{period._count?.records ?? 0} {tr ? 'calisan' : 'employees'}</div>
                </div>
                <span className={clsx('text-xs px-2 py-0.5 rounded-full border', PAYROLL_STATUS_STYLES[period.status])}>
                  {PAYROLL_STATUS_LABELS[period.status]}
                </span>
                {period.totalNet && (
                  <span className="text-sm font-mono font-medium text-[var(--text-1)]">{tr ? 'Net' : 'Net'}: {TRY_FMT(period.totalNet)}</span>
                )}
                {canManage && period.status === 'TASLAK' && (
                  <button onClick={() => handleCalculate(period)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs hover:bg-blue-600">
                    <Calculator className="w-3.5 h-3.5" />{tr ? 'Hesapla' : 'Calculate'}
                  </button>
                )}
                {canManage && period.status === 'HESAPLANDI' && (
                  <button onClick={() => handleApprove(period)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs hover:bg-emerald-600">
                    <Check className="w-3.5 h-3.5" />{tr ? 'Onayla' : 'Approve'}
                  </button>
                )}
              </div>

              {(period.totalGross || period.totalNet) && (
                <div className="flex gap-6 mt-2 text-xs text-[var(--text-3)]">
                  <span>{tr ? 'Brut' : 'Gross'}: <span className="font-mono text-[var(--text-2)]">{TRY_FMT(period.totalGross)}</span></span>
                  <span>SGK: <span className="font-mono text-[var(--text-2)]">{TRY_FMT(period.totalSgk)}</span></span>
                  <span>{tr ? 'Vergi' : 'Tax'}: <span className="font-mono text-[var(--text-2)]">{TRY_FMT(period.totalTax)}</span></span>
                  <span>{tr ? 'Net' : 'Net'}: <span className="font-mono font-medium text-[var(--text-1)]">{TRY_FMT(period.totalNet)}</span></span>
                </div>
              )}

              {viewingPeriodId === period.id && <PayrollRecordsTable periodId={period.id} />}
            </div>
          ))}
        </div>
      )}

      {creating && (
        <DraggableModal
          title={tr ? 'Yeni Bordro Donemi' : 'New Payroll Period'}
          onClose={() => setCreating(false)}
          width={360}
          footer={
            <div className="flex gap-2 justify-end">
              <button onClick={() => setCreating(false)} className="px-4 py-2 rounded-lg text-sm text-[var(--text-2)] hover:bg-[var(--surface)]">{tr ? 'Iptal' : 'Cancel'}</button>
              <button onClick={handleCreate} disabled={saving} className="px-4 py-2 rounded-lg bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 disabled:opacity-50">
                {saving ? (tr ? 'Olusturuluyor...' : 'Creating...') : (tr ? 'Olustur' : 'Create')}
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-2 gap-3 p-1">
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Yil' : 'Year'}</label>
              <input className="input w-full" type="number" value={newYear} onChange={e => setNewYear(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Ay' : 'Month'}</label>
              <select className="select w-full" value={newMonth} onChange={e => setNewMonth(Number(e.target.value))}>
                {Object.entries(MONTH_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
        </DraggableModal>
      )}
    </div>
  )
}

function PayrollRecordsTable({ periodId }: { periodId: string }) {
  const { lang } = useLanguage()
  const tr = lang === 'tr'
  const { records, loading } = usePayrollRecords(periodId)

  const handleExport = () => {
    exportToExcel({
      filename: `bordro_${periodId}_${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'Bordro',
      columns: [
        { header: 'Calisan', accessor: (r: any) => r.employee?.user?.name ?? '', width: 24 },
        { header: 'Brut Maas', accessor: (r: any) => Number(r.grossSalary) || 0, width: 14 },
        { header: 'SGK Isci', accessor: (r: any) => Number(r.sgkEmployee) || 0, width: 12 },
        { header: 'SGK Isveren', accessor: (r: any) => Number(r.sgkEmployer) || 0, width: 12 },
        { header: 'Gelir Vergisi', accessor: (r: any) => Number(r.incomeTax) || 0, width: 12 },
        { header: 'Damga Vergisi', accessor: (r: any) => Number(r.stampTax) || 0, width: 12 },
        { header: 'Toplam Kesinti', accessor: (r: any) => Number(r.totalDeductions) || 0, width: 14 },
        { header: 'Net Maas', accessor: (r: any) => Number(r.netSalary) || 0, width: 14 },
      ],
      rows: records,
    })
  }

  if (loading) return <div className="text-center py-4 text-sm text-[var(--text-3)]">{tr ? 'Yukleniyor...' : 'Loading...'}</div>
  if (records.length === 0) return <div className="text-center py-4 text-sm text-[var(--text-3)]">{tr ? 'Kayit yok - once bordroyu hesaplayin' : 'No records - calculate payroll first'}</div>

  return (
    <div className="mt-3 space-y-2">
      <div className="flex justify-end">
        <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface)] text-[var(--text-3)] text-xs">
          <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
            <th className="text-left px-3 py-2 font-medium text-[var(--text-3)]">{tr ? 'Calisan' : 'Employee'}</th>
            <th className="text-right px-3 py-2 font-medium text-[var(--text-3)]">{tr ? 'Brut' : 'Gross'}</th>
            <th className="text-right px-3 py-2 font-medium text-[var(--text-3)]">SGK</th>
            <th className="text-right px-3 py-2 font-medium text-[var(--text-3)]">{tr ? 'Gelir V.' : 'Income Tax'}</th>
            <th className="text-right px-3 py-2 font-medium text-[var(--text-3)]">{tr ? 'Damga' : 'Stamp'}</th>
            <th className="text-right px-3 py-2 font-medium text-[var(--text-3)]">{tr ? 'Kesintiler' : 'Deductions'}</th>
            <th className="text-right px-3 py-2 font-medium text-[var(--text-3)]">{tr ? 'Net' : 'Net'}</th>
          </tr>
        </thead>
        <tbody>
          {records.map(r => (
            <tr key={r.id} className="border-b border-[var(--border)]">
              <td className="px-3 py-2 text-[var(--text-1)]">{r.employee?.user.name ?? '-'}</td>
              <td className="px-3 py-2 text-right font-mono">{TRY_FMT(r.grossSalary)}</td>
              <td className="px-3 py-2 text-right font-mono">{TRY_FMT(r.sgkEmployee)}</td>
              <td className="px-3 py-2 text-right font-mono">{TRY_FMT(r.incomeTax)}</td>
              <td className="px-3 py-2 text-right font-mono">{TRY_FMT(r.stampTax)}</td>
              <td className="px-3 py-2 text-right font-mono">{TRY_FMT(r.totalDeductions)}</td>
              <td className="px-3 py-2 text-right font-mono font-medium text-[var(--text-1)]">{TRY_FMT(r.netSalary)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  )
}
