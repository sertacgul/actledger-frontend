import { useState } from 'react'
import { TrendingUp, TrendingDown, Minus, BarChart3, ShoppingCart, CheckSquare, Package, Calculator, Users, FileText } from 'lucide-react'
import clsx from 'clsx'
import { useCompare } from '../../lib/erp-hooks'
import { useDepartments } from '../../lib/hooks'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import { TRY_FMT } from '../../types/erp'
import { ROLE_HIERARCHY } from '../../types'

const now = new Date()
const thisYearStart = `${now.getFullYear()}-01-01T00:00:00.000Z`
const thisYearEnd = now.toISOString()
const lastYearStart = `${now.getFullYear() - 1}-01-01T00:00:00.000Z`
const lastYearEnd = `${now.getFullYear() - 1}-12-31T23:59:59.999Z`

type MetricGroup = 'sales' | 'tasks' | 'stock' | 'accounting' | 'hr' | 'reports'

const PRESETS = [
  { labelTr: 'Bu ay vs Geçen ay', labelEn: 'This month vs Last month', get: () => {
    const d1 = new Date(now.getFullYear(), now.getMonth(), 1)
    const d2 = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const d2e = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    return { f1: d1.toISOString(), t1: now.toISOString(), f2: d2.toISOString(), t2: d2e.toISOString() }
  }},
  { labelTr: 'Bu yıl vs Geçen yıl', labelEn: 'This year vs Last year', get: () => {
    return { f1: thisYearStart, t1: thisYearEnd, f2: lastYearStart, t2: lastYearEnd }
  }},
]

function pctChange(p1: number, p2: number): { pct: number; dir: 'up' | 'down' | 'same' } {
  if (p1 === 0 && p2 === 0) return { pct: 0, dir: 'same' }
  if (p1 === 0) return { pct: 100, dir: 'up' }
  const pct = Math.round(((p2 - p1) / p1) * 100)
  return { pct: Math.abs(pct), dir: pct > 0 ? 'up' : pct < 0 ? 'down' : 'same' }
}

function MetricCard({ label, p1, p2, isCurrency }: { label: string; p1: number; p2: number; isCurrency?: boolean }) {
  const { pct, dir } = pctChange(p1, p2)
  const fmt = isCurrency ? TRY_FMT : (n: number) => n.toLocaleString('tr-TR')
  return (
    <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
      <div className="text-xs text-[var(--text-3)] mb-2">{label}</div>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs text-[var(--text-4)]">Dönem 1</div>
          <div className="text-sm font-mono font-medium text-[var(--text-2)]">{fmt(p1)}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-[var(--text-4)]">Dönem 2</div>
          <div className="text-sm font-mono font-bold text-[var(--text-1)]">{fmt(p2)}</div>
        </div>
      </div>
      <div className={clsx('flex items-center gap-1 mt-2 text-xs font-medium',
        dir === 'up' ? 'text-emerald-600' : dir === 'down' ? 'text-red-600' : 'text-zinc-400'
      )}>
        {dir === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : dir === 'down' ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
        {pct > 0 ? `${dir === 'up' ? '+' : '-'}${pct}%` : 'Değişim yok'}
      </div>
    </div>
  )
}

export default function CompareWidget() {
  const { lang } = useLanguage()
  const { user } = useAuth()
  const tr = lang === 'tr'

  const userLevel = user ? (ROLE_HIERARCHY[user.role] ?? 1) : 1
  const canSeeDepts = userLevel >= 6 // Direktor+

  const { departments } = useDepartments()
  const [departmentId, setDepartmentId] = useState('')

  const [dateFrom1, setDateFrom1] = useState(lastYearStart)
  const [dateTo1, setDateTo1] = useState(lastYearEnd)
  const [dateFrom2, setDateFrom2] = useState(thisYearStart)
  const [dateTo2, setDateTo2] = useState(thisYearEnd)

  const [activeGroup, setActiveGroup] = useState<MetricGroup>('sales')

  const { compare, loading } = useCompare(dateFrom1, dateTo1, dateFrom2, dateTo2, departmentId || undefined)

  const applyPreset = (idx: number) => {
    const p = PRESETS[idx].get()
    setDateFrom1(p.f2); setDateTo1(p.t2) // Dönem 1 = eski
    setDateFrom2(p.f1); setDateTo2(p.t1) // Dönem 2 = yeni
  }

  const GROUPS: { id: MetricGroup; icon: typeof ShoppingCart; labelTr: string; labelEn: string }[] = [
    { id: 'sales', icon: ShoppingCart, labelTr: 'Satış', labelEn: 'Sales' },
    { id: 'tasks', icon: CheckSquare, labelTr: 'Görevler', labelEn: 'Tasks' },
    { id: 'stock', icon: Package, labelTr: 'Stok', labelEn: 'Stock' },
    { id: 'accounting', icon: Calculator, labelTr: 'Muhasebe', labelEn: 'Accounting' },
    { id: 'hr', icon: Users, labelTr: 'İK', labelEn: 'HR' },
    { id: 'reports', icon: FileText, labelTr: 'Raporlar', labelEn: 'Reports' },
  ]

  return (
    <div className="space-y-4">
      {/* Header + filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-500" />
          <h3 className="font-semibold text-[var(--text-1)]">{tr ? 'Dönem Karşılaştırma' : 'Period Comparison'}</h3>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          {PRESETS.map((p, i) => (
            <button key={i} onClick={() => applyPreset(i)} className="px-3 py-1 rounded-lg text-xs font-medium border border-[var(--border)] hover:bg-[var(--surface)] text-[var(--text-3)]">
              {tr ? p.labelTr : p.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* Date pickers */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-[10px] font-medium text-[var(--text-3)] mb-0.5 block">{tr ? 'Dönem 1 Başlangıç' : 'Period 1 From'}</label>
          <input className="input text-xs" type="date" value={dateFrom1.slice(0, 10)} onChange={e => setDateFrom1(e.target.value + 'T00:00:00.000Z')} />
        </div>
        <div>
          <label className="text-[10px] font-medium text-[var(--text-3)] mb-0.5 block">{tr ? 'Dönem 1 Bitiş' : 'Period 1 To'}</label>
          <input className="input text-xs" type="date" value={dateTo1.slice(0, 10)} onChange={e => setDateTo1(e.target.value + 'T23:59:59.999Z')} />
        </div>
        <span className="text-[var(--text-4)] text-xs font-bold px-1">vs</span>
        <div>
          <label className="text-[10px] font-medium text-[var(--text-3)] mb-0.5 block">{tr ? 'Dönem 2 Başlangıç' : 'Period 2 From'}</label>
          <input className="input text-xs" type="date" value={dateFrom2.slice(0, 10)} onChange={e => setDateFrom2(e.target.value + 'T00:00:00.000Z')} />
        </div>
        <div>
          <label className="text-[10px] font-medium text-[var(--text-3)] mb-0.5 block">{tr ? 'Dönem 2 Bitiş' : 'Period 2 To'}</label>
          <input className="input text-xs" type="date" value={dateTo2.slice(0, 10)} onChange={e => setDateTo2(e.target.value + 'T23:59:59.999Z')} />
        </div>
        {canSeeDepts && (
          <div>
            <label className="text-[10px] font-medium text-[var(--text-3)] mb-0.5 block">{tr ? 'Departman' : 'Department'}</label>
            <select className="select text-xs" value={departmentId} onChange={e => setDepartmentId(e.target.value)}>
              <option value="">{tr ? 'Tümü' : 'All'}</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8 text-[var(--text-3)] text-sm">{tr ? 'Hesaplanıyor...' : 'Calculating...'}</div>
      ) : !compare ? (
        <div className="text-center py-8 text-[var(--text-3)] text-sm">{tr ? 'Tarih aralığı seçin' : 'Select date ranges'}</div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricCard label={tr ? 'Satış Tutarı' : 'Sales Total'} p1={compare.sales?.p1_total ?? 0} p2={compare.sales?.p2_total ?? 0} isCurrency />
            <MetricCard label={tr ? 'Sipariş Sayısı' : 'Order Count'} p1={compare.sales?.p1_count ?? 0} p2={compare.sales?.p2_count ?? 0} />
            <MetricCard label={tr ? 'Tamamlanan Görev' : 'Tasks Done'} p1={compare.tasks?.p1_completed ?? 0} p2={compare.tasks?.p2_completed ?? 0} />
            <MetricCard label={tr ? 'Gelir' : 'Income'} p1={compare.accounting?.p1_income ?? 0} p2={compare.accounting?.p2_income ?? 0} isCurrency />
            <MetricCard label={tr ? 'Net Kâr' : 'Net Profit'} p1={compare.accounting?.p1_profit ?? 0} p2={compare.accounting?.p2_profit ?? 0} isCurrency />
            <MetricCard label={tr ? 'Rapor Sayısı' : 'Reports'} p1={compare.reports?.p1_count ?? 0} p2={compare.reports?.p2_count ?? 0} />
          </div>

          {/* Detail section with group selector */}
          <div className="flex gap-1 p-0.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] w-fit">
            {GROUPS.map(g => (
              <button key={g.id} onClick={() => setActiveGroup(g.id)}
                className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                  activeGroup === g.id ? 'bg-indigo-500 text-white' : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
                )}>
                <g.icon className="w-3.5 h-3.5" />
                {tr ? g.labelTr : g.labelEn}
              </button>
            ))}
          </div>

          {/* Detail cards for selected group */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {activeGroup === 'sales' && <>
              <MetricCard label={tr ? 'Satış Tutarı' : 'Sales Total'} p1={compare.sales?.p1_total ?? 0} p2={compare.sales?.p2_total ?? 0} isCurrency />
              <MetricCard label={tr ? 'Sipariş Sayısı' : 'Orders'} p1={compare.sales?.p1_count ?? 0} p2={compare.sales?.p2_count ?? 0} />
            </>}
            {activeGroup === 'tasks' && <>
              <MetricCard label={tr ? 'Tamamlanan' : 'Completed'} p1={compare.tasks?.p1_completed ?? 0} p2={compare.tasks?.p2_completed ?? 0} />
              <MetricCard label={tr ? 'Toplam Görev' : 'Total Tasks'} p1={compare.tasks?.p1_total ?? 0} p2={compare.tasks?.p2_total ?? 0} />
              <MetricCard label={tr ? 'Tamamlanma %' : 'Completion %'} p1={compare.tasks?.p1_rate ?? 0} p2={compare.tasks?.p2_rate ?? 0} />
            </>}
            {activeGroup === 'stock' && <>
              <MetricCard label={tr ? 'Stok Hareketi' : 'Stock Movements'} p1={compare.stock?.p1_movements ?? 0} p2={compare.stock?.p2_movements ?? 0} />
            </>}
            {activeGroup === 'accounting' && <>
              <MetricCard label={tr ? 'Gelir' : 'Income'} p1={compare.accounting?.p1_income ?? 0} p2={compare.accounting?.p2_income ?? 0} isCurrency />
              <MetricCard label={tr ? 'Gider' : 'Expense'} p1={compare.accounting?.p1_expense ?? 0} p2={compare.accounting?.p2_expense ?? 0} isCurrency />
              <MetricCard label={tr ? 'Net Kâr' : 'Net Profit'} p1={compare.accounting?.p1_profit ?? 0} p2={compare.accounting?.p2_profit ?? 0} isCurrency />
            </>}
            {activeGroup === 'hr' && <>
              <MetricCard label={tr ? 'Çalışan Sayısı' : 'Employees'} p1={compare.hr?.p1_employees ?? 0} p2={compare.hr?.p2_employees ?? 0} />
              <MetricCard label={tr ? 'İzin Günleri' : 'Leave Days'} p1={compare.hr?.p1_leaves ?? 0} p2={compare.hr?.p2_leaves ?? 0} />
            </>}
            {activeGroup === 'reports' && <>
              <MetricCard label={tr ? 'Rapor Sayısı' : 'Reports'} p1={compare.reports?.p1_count ?? 0} p2={compare.reports?.p2_count ?? 0} />
            </>}
          </div>
        </>
      )}
    </div>
  )
}
