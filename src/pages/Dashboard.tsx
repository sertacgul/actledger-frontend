import { useState, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, TrendingDown, AlertTriangle, ArrowUpRight,
  Activity, LayoutDashboard, MapPin, Sparkles, Building2, X, Wand2, Palette,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../context/AuthContext'
import { useCompany } from '../context/CompanyContext'
import { ROLE_LABELS } from '../types'
import { generateProductionData } from '../data/mockData'
import { useCompanyStats, useDepartments, useReports, useTasks, useEfficiencySummary } from '../lib/hooks'
import { useDashboardStore, DEFAULT_DASHBOARD_ID, WIDGET_REGISTRY, resolveWidgetDateFilter, getNLWidget, isNLWidgetId, deleteNLWidget } from '../lib/dashboardStore'
import type { DashboardConfig, WidgetFilter, NLWidgetConfig } from '../lib/dashboardStore'
import { listAttributes, evaluateAttribute } from '../lib/attributesStore'
import type { Task as TaskType, CustomAttribute, FieldReport, Department } from '../types'
import { FilterProvider, useFilter } from '../context/FilterContext'
import { useShortcut } from '../context/ShortcutsContext'
import { useToolbarActions } from '../lib/useToolbarActions'
import OperIQInsights from '../components/dashboard/GeminiInsights'
import TaskMap from '../components/dashboard/TaskMap'
import DashboardSwitcher from '../components/dashboard/DashboardSwitcher'
import DashboardEditor from '../components/dashboard/DashboardEditor'
import DashboardFilter, { DASHBOARD_FILTER_TOGGLE_EVENT } from '../components/dashboard/DashboardFilter'
import WidgetWrapper from '../components/dashboard/WidgetWrapper'
import NLWidgetGenerator from '../components/dashboard/NLWidgetGenerator'
import DossierFormatEditor from '../components/dashboard/DossierFormatEditor'
import CompareWidget from '../components/dashboard/CompareWidget'
import { resolveFormat } from '../lib/dossierFormat'
import type { DossierFormat } from '../lib/dossierFormat'

/* ── Chapter / Page config (default dashboard only) ─────────────────────────*/
const CHAPTERS = [
  { id: 'genel',        label: 'Genel Görünüm',  icon: LayoutDashboard, pages: ['Özet', 'Performans']         },
  { id: 'harita',       label: 'Saha Haritası',  icon: MapPin,          pages: ['Görev Haritası']             },
  { id: 'departmanlar', label: 'Departmanlar',   icon: Building2,       pages: ['Tablo', 'Aktiviteler']       },
  { id: 'analizler',    label: 'OperIQ',         icon: Sparkles,        pages: ['Öneriler']                    },
] as const
type ChapterId = typeof CHAPTERS[number]['id']

/* ── Helpers ─────────────────────────────────────────────────────────────────*/
const STATUS_COLORS: Record<string, string> = {
  tamamlandi: '#16a34a', devam_ediyor: '#2563eb',
  beklemede: '#94a3b8',  gecikti: '#dc2626',      iptal: '#cbd5e1',
}
const STATUS_TR: Record<string, string> = {
  tamamlandi: 'Tamamlandı', devam_ediyor: 'Devam Ediyor',
  beklemede:  'Beklemede',  gecikti:      'Gecikti',       iptal: 'İptal',
}
const normalizeKey = (k: string) => k.toLowerCase()

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="surface px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-zinc-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="flex items-center gap-2">
          <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true"><circle cx="4" cy="4" r="4" fill={p.color} /></svg>
          <span className="text-zinc-500">{p.name === 'hedef' ? 'Hedef' : 'Gerçekleşen'}:</span>
          <span className="font-semibold text-zinc-800">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

/* ── Mini efficiency tile (used inside the efficiency widget) ───────────────*/
function EffMini({ label, value, sub, tone }: {
  label: string
  value: string | number
  sub?: string
  tone: 'emerald' | 'indigo' | 'amber' | 'red'
}) {
  const tones = {
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    indigo:  'text-indigo-600 bg-indigo-50 border-indigo-200',
    amber:   'text-amber-600 bg-amber-50 border-amber-200',
    red:     'text-red-600 bg-red-50 border-red-200',
  } as const
  return (
    <div className={`rounded-lg border p-3 ${tones[tone]}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</p>
      <p className="text-[20px] font-extrabold mt-1 leading-none text-zinc-900">{value}</p>
      {sub && <p className="text-[10px] text-zinc-500 mt-1">{sub}</p>}
    </div>
  )
}

/* ── KPI Card ────────────────────────────────────────────────────────────────*/
function KpiCard({ label, value, delta, deltaUp, sub, progress, loading }: {
  label: string; value: string | number
  delta?: string; deltaUp?: boolean; sub?: string
  progress?: number; loading?: boolean
}) {
  if (loading) return <div className="surface p-5 animate-pulse h-24" />
  return (
    <div className="surface p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider truncate">{label}</p>
        {delta && (
          <span className={clsx('flex items-center gap-0.5 text-[11px] font-semibold whitespace-nowrap shrink-0',
            deltaUp ? 'text-emerald-600' : 'text-red-500')}>
            {deltaUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {delta}
          </span>
        )}
      </div>
      <p className="kpi-value mt-2">{value}</p>
      {sub && <p className="kpi-label">{sub}</p>}
      {progress !== undefined && (
        <div className="mt-3 w-full h-0.5 bg-zinc-100 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full kpi-progress" data-progress={progress} />
        </div>
      )}
    </div>
  )
}

/* ── Attribute chart widget ──────────────────────────────────────────────────*/
function AttributeChartWidget({ tasks }: { tasks: TaskType[] }) {
  const [attrs, setAttrs] = useState<CustomAttribute[]>(() => listAttributes())
  const [selectedId, setSelectedId] = useState<string>('')

  // Refresh on mount + when storage changes (cross-tab) - keeps it in sync after edits
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'actledger:attributes') setAttrs(listAttributes())
    }
    window.addEventListener('storage', onStorage)
    setAttrs(listAttributes())
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    if (!selectedId && attrs.length > 0) setSelectedId(attrs[0].id)
  }, [attrs, selectedId])

  const attr = attrs.find(a => a.id === selectedId)

  if (attrs.length === 0) {
    return (
      <div className="surface p-5">
        <p className="text-[13px] font-semibold text-zinc-900 mb-1">Özelliğe Göre Dağılım</p>
        <p className="text-[11px] text-zinc-400 mb-4">Özel kural-tabanlı görev etiketleme</p>
        <div className="text-center py-10">
          <Sparkles size={24} className="text-zinc-300 mx-auto mb-2" />
          <p className="text-[12px] text-zinc-500">Henüz özellik tanımlanmamış</p>
          <p className="text-[10px] text-zinc-400 mt-1">Görevler sayfasından "Özellikler" üzerinden ekleyin</p>
        </div>
      </div>
    )
  }

  const buckets: Record<string, { value: number; color: string }> = {}
  if (attr) {
    for (const t of tasks) {
      const ev = evaluateAttribute(attr, t)
      if (!buckets[ev.label]) buckets[ev.label] = { value: 0, color: ev.color }
      buckets[ev.label].value += 1
    }
  }
  const data = Object.entries(buckets)
    .map(([name, b]) => ({ name, value: b.value, color: b.color }))
    .sort((a, b) => b.value - a.value)

  return (
    <div className="surface p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[13px] font-semibold text-zinc-900">Özelliğe Göre Dağılım</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">{attr?.name ?? 'Özellik seçin'}</p>
        </div>
        <select
          className="select text-[11px] py-1 max-w-[160px]"
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
        >
          {attrs.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      {data.length === 0 ? (
        <p className="text-[12px] text-zinc-400 text-center py-8">Görev bulunamadı</p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip formatter={(v) => [v, 'Görev']} />
            <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={48}>
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

/* ── NL widget renderer (dynamic config-driven) ─────────────────────────────*/
const NL_PALETTE = ['#6366f1', '#0891b2', '#059669', '#ca8a04', '#ea580c', '#dc2626', '#9333ea', '#64748b']

function resolveNLDateRange(preset?: string): { from: number; to: number } | null {
  if (!preset || preset === 'all') return null
  const now = Date.now()
  const end = new Date(); end.setHours(23, 59, 59, 999)
  switch (preset) {
    case 'today': {
      const s = new Date(); s.setHours(0, 0, 0, 0)
      return { from: s.getTime(), to: end.getTime() }
    }
    case '7d':    return { from: now - 7 * 86400000,  to: end.getTime() }
    case '30d':   return { from: now - 30 * 86400000, to: end.getTime() }
    case 'month': {
      const s = new Date(); s.setDate(1); s.setHours(0, 0, 0, 0)
      return { from: s.getTime(), to: end.getTime() }
    }
    default: return null
  }
}

const REPORT_STATUS_TR: Record<string, string> = {
  taslak:     'Taslak',
  gonderildi: 'Gönderildi',
  onaylandi:  'Onaylandı',
  reddedildi: 'Reddedildi',
}

function NLWidgetRenderer({ config, data, departments, onDelete }: {
  config: NLWidgetConfig
  data: SharedData
  departments: Department[]
  onDelete: () => void
}) {
  const { tasks, reports } = data
  const range = resolveNLDateRange(config.filters.datePreset)

  // Build the underlying row set per dataSource
  let rows: Array<{ key: string; group: string; createdAt?: string }> = []

  if (config.dataSource === 'tasks') {
    let filtered = tasks
    if (config.filters.status)       filtered = filtered.filter(t => t.status   === config.filters.status)
    if (config.filters.priority)     filtered = filtered.filter(t => t.priority === config.filters.priority)
    if (config.filters.type)         filtered = filtered.filter(t => t.type     === config.filters.type)
    if (config.filters.departmentId) filtered = filtered.filter(t => t.departmentId === config.filters.departmentId)
    if (range) filtered = filtered.filter(t => {
      const ts = new Date(t.createdAt).getTime()
      return ts >= range.from && ts <= range.to
    })

    rows = filtered.map(t => {
      let group = 'Tümü'
      switch (config.groupBy) {
        case 'status':       group = STATUS_TR[t.status] ?? t.status; break
        case 'priority':     group = t.priority; break
        case 'type':         group = t.type; break
        case 'departmentId': group = departments.find(d => d.id === t.departmentId)?.name ?? '-'; break
        case 'overdue':      group = (t.status !== 'tamamlandi' && t.dueDate && new Date(t.dueDate).getTime() < Date.now()) ? 'Geciken' : 'Zamanında'; break
        case 'createdDay':   group = new Date(t.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }); break
        case 'dueDay':       group = t.dueDate ? new Date(t.dueDate).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }) : '-'; break
      }
      return { key: t.id, group, createdAt: t.createdAt }
    })
  } else if (config.dataSource === 'reports') {
    let filtered: FieldReport[] = reports
    if (config.filters.status)       filtered = filtered.filter(r => r.status === config.filters.status)
    if (config.filters.departmentId) filtered = filtered.filter(r => r.departmentId === config.filters.departmentId)
    if (range) filtered = filtered.filter(r => {
      const ts = new Date(r.createdAt).getTime()
      return ts >= range.from && ts <= range.to
    })

    rows = filtered.map(r => {
      let group = 'Tümü'
      switch (config.groupBy) {
        case 'status':       group = REPORT_STATUS_TR[r.status] ?? r.status; break
        case 'departmentId': group = departments.find(d => d.id === r.departmentId)?.name ?? '-'; break
        case 'createdDay':   group = new Date(r.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }); break
      }
      return { key: r.id, group, createdAt: r.createdAt }
    })
  } else if (config.dataSource === 'departments') {
    let filtered: Department[] = departments
    if (config.filters.departmentId) filtered = filtered.filter(d => d.id === config.filters.departmentId)
    rows = filtered.map(d => ({ key: d.id, group: d.name }))
  }

  // KPI: just total count
  const total = rows.length

  // Aggregate by group
  const buckets: Record<string, number> = {}
  for (const r of rows) buckets[r.group] = (buckets[r.group] ?? 0) + 1
  let aggregated = Object.entries(buckets).map(([name, value], i) => ({
    name, value, color: NL_PALETTE[i % NL_PALETTE.length],
  }))

  if (config.sortBy === 'value_asc')  aggregated.sort((a, b) => a.value - b.value)
  else if (config.sortBy === 'name_asc') aggregated.sort((a, b) => a.name.localeCompare(b.name))
  else aggregated.sort((a, b) => b.value - a.value)

  if (config.limit && aggregated.length > config.limit) aggregated = aggregated.slice(0, config.limit)

  return (
    <div className="surface p-5 group/nl relative">
      {/* Delete button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); if (confirm('Bu görselleştirmeyi silmek istiyor musunuz?')) onDelete() }}
        className="absolute top-3 right-3 w-6 h-6 rounded flex items-center justify-center text-zinc-300 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover/nl:opacity-100 transition-all"
        title="Sil"
      >
        <X size={12} />
      </button>

      <div className="flex items-start gap-2 mb-4">
        <div className="w-6 h-6 rounded bg-indigo-50 flex items-center justify-center flex-shrink-0">
          <Sparkles size={11} className="text-indigo-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-zinc-900 truncate">{config.title}</p>
          {config.description && <p className="text-[10px] text-zinc-400 truncate">{config.description}</p>}
        </div>
      </div>

      {config.chartType === 'kpi' && (
        <div className="text-center py-4">
          <p className="text-[36px] font-bold text-zinc-900 leading-none">{total}</p>
          <p className="text-[11px] text-zinc-400 mt-1">{config.dataSource === 'tasks' ? 'görev' : config.dataSource === 'reports' ? 'rapor' : 'departman'}</p>
        </div>
      )}

      {config.chartType === 'pie' && (
        aggregated.length === 0 ? <p className="text-[12px] text-zinc-400 text-center py-6">Veri yok</p>
        : (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={aggregated} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value" strokeWidth={0}>
                {aggregated.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [v, n]} />
            </PieChart>
          </ResponsiveContainer>
        )
      )}

      {config.chartType === 'bar' && (
        aggregated.length === 0 ? <p className="text-[12px] text-zinc-400 text-center py-6">Veri yok</p>
        : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={aggregated} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={48}>
                {aggregated.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )
      )}

      {config.chartType === 'line' && (
        aggregated.length === 0 ? <p className="text-[12px] text-zinc-400 text-center py-6">Veri yok</p>
        : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={aggregated} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )
      )}

      {config.chartType === 'table' && (
        aggregated.length === 0 ? <p className="text-[12px] text-zinc-400 text-center py-6">Veri yok</p>
        : (
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-zinc-400 border-b border-zinc-100">
                <th className="text-left font-semibold py-2">Kategori</th>
                <th className="text-right font-semibold py-2">Adet</th>
              </tr>
            </thead>
            <tbody>
              {aggregated.map(row => (
                <tr key={row.name} className="border-b border-zinc-50">
                  <td className="py-1.5 text-zinc-700">
                    <span className="inline-block w-2 h-2 rounded-full mr-2 align-middle" style={{ background: row.color }} />
                    {row.name}
                  </td>
                  <td className="py-1.5 text-right font-semibold text-zinc-900">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}
    </div>
  )
}

/* ── Widget renderers ────────────────────────────────────────────────────────*/
function useSharedData() {
  const { filter, resolvedDateFrom, resolvedDateTo } = useFilter()

  const statsFilter = {
    departmentId: filter.departmentId || undefined,
    dateFrom:     resolvedDateFrom    || undefined,
    dateTo:       resolvedDateTo      || undefined,
  }
  const taskFilter = {
    pageSize:     100,
    status:       filter.status       || undefined,
    priority:     filter.priority     || undefined,
    departmentId: filter.departmentId || undefined,
    groupId:      filter.groupId      || undefined,
  }
  const reportFilter = {
    departmentId: filter.departmentId || undefined,
    dateFrom:     resolvedDateFrom    || undefined,
    dateTo:       resolvedDateTo      || undefined,
  }

  const { data: stats, loading: statsLoading } = useCompanyStats(statsFilter)
  const { departments, loading: deptsLoading }  = useDepartments()
  const { reports,     loading: reportsLoading } = useReports(reportFilter)
  const { tasks }                                = useTasks(taskFilter)
  const { summary: efficiency }                  = useEfficiencySummary()
  // Production performance respects the active date range
  const productionData = generateProductionData(resolvedDateFrom || undefined, resolvedDateTo || undefined)
  return { stats, statsLoading, departments, deptsLoading, reports, reportsLoading, tasks, productionData, efficiency }
}

type SharedData = ReturnType<typeof useSharedData>

function renderWidget(
  id: string,
  data: SharedData,
  deptTermLabel: string,
  taskTermLabel: string,
  widgetFilter: WidgetFilter = {},
) {
  const { stats, statsLoading, departments, deptsLoading, reports, reportsLoading, tasks } = data

  // Apply widget-level client-side filter on tasks/reports
  const { dateFrom: wDateFrom, dateTo: wDateTo } = resolveWidgetDateFilter(widgetFilter.datePreset)
  const filteredTasks = tasks.filter(t => {
    if (widgetFilter.status       && t.status   !== widgetFilter.status)       return false
    if (widgetFilter.priority     && t.priority !== widgetFilter.priority)     return false
    if (widgetFilter.departmentId && t.departmentId !== widgetFilter.departmentId) return false
    if (wDateFrom && new Date(t.createdAt) < new Date(wDateFrom)) return false
    if (wDateTo   && new Date(t.createdAt) > new Date(wDateTo))   return false
    return true
  })
  const filteredReports = reports.filter(r => {
    if (widgetFilter.departmentId && r.departmentId !== widgetFilter.departmentId) return false
    if (wDateFrom && new Date(r.createdAt) < new Date(wDateFrom)) return false
    if (wDateTo   && new Date(r.createdAt) > new Date(wDateTo))   return false
    return true
  })
  const filteredDepts = widgetFilter.departmentId
    ? departments.filter(d => d.id === widgetFilter.departmentId)
    : departments

  const total     = stats?.tasks.total     ?? 0
  const completed = stats?.tasks.completed ?? 0
  const overdue   = stats?.tasks.overdue   ?? 0
  const rate      = Math.round(stats?.tasks.completionRate ?? 0)
  const byStatus  = stats?.tasks.byStatus  ?? {}
  const inProg    = Object.entries(byStatus).find(([k]) => normalizeKey(k) === 'devam_ediyor')?.[1] ?? 0

  // For task_pie: use filteredTasks to re-compute distribution
  const pieByStatus: Record<string, number> = {}
  filteredTasks.forEach(t => { pieByStatus[t.status] = (pieByStatus[t.status] ?? 0) + 1 })
  const taskPieData = Object.entries(pieByStatus)
    .map(([s, v]) => ({ name: STATUS_TR[s] ?? s, value: v, color: STATUS_COLORS[s] ?? '#a1a1aa' }))
    .filter(d => d.value > 0)

  const deptBarData = filteredDepts.slice(0, 6).map(d => ({ name: d.name, tamamlanma: d.completionRate }))

  switch (id) {
    case 'kpi_cards':
      return (
        <div key="kpi_cards" className="col-span-3 grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard loading={statsLoading} label={`Toplam ${taskTermLabel}`} value={total} sub={`${deptTermLabel} geneli`} progress={rate} />
          <KpiCard loading={statsLoading} label="Tamamlanan" value={completed} delta={`%${rate}`} deltaUp sub="Başarı oranı" />
          <KpiCard loading={statsLoading} label="Devam Eden" value={inProg as number} sub="Aktif işlemler" />
          <KpiCard loading={statsLoading} label="Geciken" value={overdue} delta={overdue > 0 ? 'Dikkat' : undefined} deltaUp={false} sub={`${stats?.users.activeIn30d ?? 0} aktif personel`} />
        </div>
      )

    case 'production_chart':
      return (
        <div key="production_chart" className="xl:col-span-2 surface p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[13px] font-semibold text-zinc-900">{deptTermLabel} Performansı</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">Görev tamamlanma oranları</p>
            </div>
            {filteredDepts.length > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-emerald-200 bg-emerald-50">
                <span className="text-[11px] font-semibold text-emerald-700">
                  Ort: %{Math.round(filteredDepts.reduce((s, d) => s + d.completionRate, 0) / filteredDepts.length)}
                </span>
              </div>
            )}
          </div>
          {deptsLoading ? (
            <div className="h-[200px] animate-pulse bg-zinc-100 rounded-lg" />
          ) : filteredDepts.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-[13px] text-zinc-400">Henüz departman verisi yok</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={deptBarData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip formatter={(v) => [`%${v}`, 'Tamamlanma']} />
                <Bar dataKey="tamamlanma" radius={[4, 4, 0, 0]} maxBarSize={36}>
                  {deptBarData.map((d, i) => (
                    <Cell key={i} fill={d.tamamlanma >= 80 ? '#10b981' : d.tamamlanma >= 50 ? '#f59e0b' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )

    case 'task_pie':
      return (
        <div key="task_pie" className="xl:col-span-1 surface p-5">
          <p className="text-[13px] font-semibold text-zinc-900 mb-1">Görev Dağılımı</p>
          <p className="text-[11px] text-zinc-400 mb-4">Duruma göre</p>
          {statsLoading ? (
            <div className="h-[140px] animate-pulse bg-zinc-100 rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={taskPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={62} paddingAngle={2} dataKey="value" strokeWidth={0}>
                  {taskPieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <ul className="space-y-2 mt-3">
            {taskPieData.map(item => (
              <li key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true"><circle cx="4" cy="4" r="4" fill={item.color} /></svg>
                  <span className="text-[11px] text-zinc-500">{item.name}</span>
                </div>
                <span className="text-[12px] font-semibold text-zinc-800">{item.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )

    case 'dept_performance':
      return (
        <div key="dept_performance" className="xl:col-span-2 surface">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
            <div>
              <p className="text-[13px] font-semibold text-zinc-900">{deptTermLabel} Performansı</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">Görev tamamlanma oranları</p>
            </div>
          </div>
          {deptsLoading ? (
            <div className="p-5 space-y-3">{[1,2,3].map(i => <div key={i} className="h-8 animate-pulse bg-zinc-100 rounded" />)}</div>
          ) : (
            <>
              <div className="px-5 py-4 border-b border-zinc-50">
                <ResponsiveContainer width="100%" height={100}>
                  <BarChart data={deptBarData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip formatter={(v) => [`%${v}`, 'Tamamlanma']} />
                    <Bar dataKey="tamamlanma" fill="#2563eb" radius={[3, 3, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table min-w-[480px]">
                  <thead>
                    <tr>
                      <th>{deptTermLabel.slice(0, -2)}</th>
                      <th className="text-right">Personel</th>
                      <th className="text-right">Aktif Görev</th>
                      <th className="text-right">Tamamlanma</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDepts.map(d => (
                      <tr key={d.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <svg width="8" height="8" viewBox="0 0 8 8" className="flex-shrink-0" aria-hidden="true"><circle cx="4" cy="4" r="4" fill={d.color} /></svg>
                            <span className="font-medium text-zinc-800">{d.name}</span>
                          </div>
                        </td>
                        <td className="text-right">{d.employeeCount}</td>
                        <td className="text-right">{d.activeTaskCount}</td>
                        <td className="text-right">
                          <span className={clsx('font-semibold text-[12px]',
                            d.completionRate >= 85 ? 'text-emerald-600' :
                            d.completionRate >= 70 ? 'text-amber-600' : 'text-red-500')}>
                            %{d.completionRate}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )

    case 'activity_feed':
      return (
        <div key="activity_feed" className="xl:col-span-1 surface">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
            <p className="text-[13px] font-semibold text-zinc-900">Son Aktiviteler</p>
            <button type="button" className="text-[11px] text-indigo-600 flex items-center gap-0.5 hover:underline">
              Tümü <ArrowUpRight size={11} />
            </button>
          </div>
          {reportsLoading ? (
            <div className="p-4 space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-10 animate-pulse bg-zinc-100 rounded" />)}</div>
          ) : filteredReports.length === 0 ? (
            <p className="text-[12px] text-zinc-400 text-center py-8">Henüz aktivite yok</p>
          ) : (
            <ul className="divide-y divide-zinc-50">
              {filteredReports.slice(0, 8).map(r => (
                <li key={r.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-zinc-50/60 transition-colors">
                  <div className={clsx('w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                    r.status === 'onaylandi' ? 'bg-emerald-100' :
                    r.status === 'gonderildi' ? 'bg-indigo-100' : 'bg-amber-100')}>
                    <Activity size={11} className={
                      r.status === 'onaylandi' ? 'text-emerald-600' :
                      r.status === 'gonderildi' ? 'text-indigo-600' : 'text-amber-600'} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-zinc-800 leading-snug truncate">{r.title}</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      {new Date(r.createdAt).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                      {r.offlineCreated && <span className="ml-1.5 text-amber-500">· Çevrimdışı</span>}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )

    case 'dept_grid':
      return (
        <div key="dept_grid" className="col-span-3 grid grid-cols-2 xl:grid-cols-4 gap-4">
          {deptsLoading
            ? [1,2,3,4].map(i => <div key={i} className="surface p-5 animate-pulse h-24" />)
            : filteredDepts.map(d => (
              <div key={d.id} className="surface p-5">
                <div className="flex items-center gap-2 mb-3">
                  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><circle cx="5" cy="5" r="5" fill={d.color} /></svg>
                  <p className="text-[12px] font-semibold text-zinc-800 truncate">{d.name}</p>
                </div>
                <p className="kpi-value">{d.completionRate}<span className="text-[14px] font-normal text-zinc-400">%</span></p>
                <p className="kpi-label">tamamlanma</p>
                <div className="mt-3 w-full h-1 bg-zinc-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${d.completionRate}%`, background: d.color }} />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-zinc-400">{d.employeeCount} personel</span>
                  <span className="text-[10px] text-zinc-400">{d.activeTaskCount} aktif görev</span>
                </div>
              </div>
            ))
          }
        </div>
      )

    case 'task_map':
      return (
        <div key="task_map" className="col-span-3">
          <TaskMap />
        </div>
      )

    case 'attribute_chart':
      return (
        <div key="attribute_chart" className="xl:col-span-2">
          <AttributeChartWidget tasks={filteredTasks} />
        </div>
      )

    case 'efficiency':
      return (
        <div key="efficiency" className="xl:col-span-2 surface p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[13px] font-semibold text-zinc-900">Verimlilik & Maliyet Etkinliği</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">Demirbaş + tüketim + görev başı maliyet</p>
            </div>
            <a href="/envanter" className="text-[11px] font-semibold text-indigo-600 hover:underline">Detay →</a>
          </div>
          {!data.efficiency ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1,2,3,4].map(i => <div key={i} className="h-20 bg-zinc-50 rounded-lg animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <EffMini label="Toplam Yatırım"  value={`₺${data.efficiency.totalSpend.toLocaleString('tr-TR')}`} sub={`Sarf: ₺${data.efficiency.totalOpex.toLocaleString('tr-TR')}`} tone="emerald" />
              <EffMini label="Görev Başı Maliyet" value={`₺${data.efficiency.costPerTask.toLocaleString('tr-TR')}`} sub={`${data.efficiency.completedTasks}/${data.efficiency.totalTasks} görev`} tone="indigo" />
              <EffMini label="Demirbaş Sağlığı" value={`%${data.efficiency.healthRate}`} sub={`${data.efficiency.activeAssets}/${data.efficiency.totalAssets} aktif`} tone={data.efficiency.healthRate >= 80 ? 'emerald' : 'amber'} />
              <EffMini label="Kritik Stok"      value={data.efficiency.criticalStockCount} sub={`${data.efficiency.consumablesCount} sarf`} tone={data.efficiency.criticalStockCount > 0 ? 'red' : 'emerald'} />
            </div>
          )}
        </div>
      )

    case 'operiq':
      return (
        <div key="operiq" className="col-span-3">
          <OperIQInsights />
        </div>
      )

    default:
      return null
  }
}

/* ── Default dashboard - chapter/page navigation ────────────────────────────*/
function DefaultDashboard({ data, deptTermLabel, taskTermLabel }: {
  data: SharedData; deptTermLabel: string; taskTermLabel: string
}) {
  const [activeChapter, setActiveChapter] = useState<ChapterId>('genel')
  const [activePages, setActivePages] = useState<Record<ChapterId, number>>({
    genel: 0, harita: 0, departmanlar: 0, analizler: 0,
  })

  const chapter    = CHAPTERS.find(c => c.id === activeChapter)!
  const activePage = activePages[activeChapter]

  const handleChapter = (id: ChapterId) => setActiveChapter(id)
  const handlePage    = (idx: number)   => setActivePages(prev => ({ ...prev, [activeChapter]: idx }))

  const { stats, statsLoading, departments, deptsLoading, reports, reportsLoading, tasks } = data
  const total     = stats?.tasks.total     ?? 0
  const completed = stats?.tasks.completed ?? 0
  const overdue   = stats?.tasks.overdue   ?? 0
  const rate      = Math.round(stats?.tasks.completionRate ?? 0)
  const byStatus  = stats?.tasks.byStatus  ?? {}
  const inProg    = Object.entries(byStatus).find(([k]) => normalizeKey(k) === 'devam_ediyor')?.[1] ?? 0
  const taskPieData = Object.entries(byStatus).map(([s, v]) => {
    const key = normalizeKey(s)
    return { name: STATUS_TR[key] ?? s, value: v as number, color: STATUS_COLORS[key] ?? '#a1a1aa' }
  }).filter(d => d.value > 0)
  const deptBarData = departments.slice(0, 6).map(d => ({ name: d.name, tamamlanma: d.completionRate }))

  const renderContent = () => {
    if (activeChapter === 'genel') {
      if (activePage === 0) return (
        <div className="space-y-5">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard loading={statsLoading} label={`Toplam ${taskTermLabel}`} value={total} sub={`${deptTermLabel} geneli`} progress={rate} />
            <KpiCard loading={statsLoading} label="Tamamlanan" value={completed} delta={`%${rate}`} deltaUp sub="Başarı oranı" />
            <KpiCard loading={statsLoading} label="Devam Eden" value={inProg as number} sub="Aktif işlemler" />
            <KpiCard loading={statsLoading} label="Geciken" value={overdue} delta={overdue > 0 ? 'Dikkat' : undefined} deltaUp={false} sub={`${stats?.users.activeIn30d ?? 0} aktif personel`} />
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="surface p-5 xl:col-span-2">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[13px] font-semibold text-zinc-900">{deptTermLabel} Performansı</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Görev tamamlanma oranları</p>
                </div>
                {departments.length > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-emerald-200 bg-emerald-50">
                    <span className="text-[11px] font-semibold text-emerald-700">
                      Ort: %{Math.round(departments.reduce((s, d) => s + d.completionRate, 0) / departments.length)}
                    </span>
                  </div>
                )}
              </div>
              {deptsLoading ? (
                <div className="h-[200px] animate-pulse bg-zinc-100 rounded-lg" />
              ) : departments.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-[13px] text-zinc-400">Henüz departman verisi yok</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={deptBarData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip formatter={(v) => [`%${v}`, 'Tamamlanma']} />
                    <Bar dataKey="tamamlanma" radius={[4, 4, 0, 0]} maxBarSize={36}>
                      {deptBarData.map((d, i) => (
                        <Cell key={i} fill={d.tamamlanma >= 80 ? '#10b981' : d.tamamlanma >= 50 ? '#f59e0b' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="surface p-5">
              <p className="text-[13px] font-semibold text-zinc-900 mb-1">Görev Dağılımı</p>
              <p className="text-[11px] text-zinc-400 mb-4">Duruma göre</p>
              {statsLoading ? <div className="h-[140px] animate-pulse bg-zinc-100 rounded-lg" /> : (
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={taskPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={62} paddingAngle={2} dataKey="value" strokeWidth={0}>
                      {taskPieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <ul className="space-y-2 mt-3">
                {taskPieData.map(item => (
                  <li key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true"><circle cx="4" cy="4" r="4" fill={item.color} /></svg>
                      <span className="text-[11px] text-zinc-500">{item.name}</span>
                    </div>
                    <span className="text-[12px] font-semibold text-zinc-800">{item.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )
      if (activePage === 1) return (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {deptsLoading
            ? [1,2,3,4].map(i => <div key={i} className="surface p-5 animate-pulse h-24" />)
            : departments.map(d => (
              <div key={d.id} className="surface p-5">
                <div className="flex items-center gap-2 mb-3">
                  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><circle cx="5" cy="5" r="5" fill={d.color} /></svg>
                  <p className="text-[12px] font-semibold text-zinc-800 truncate">{d.name}</p>
                </div>
                <p className="kpi-value">{d.completionRate}<span className="text-[14px] font-normal text-zinc-400">%</span></p>
                <p className="kpi-label">tamamlanma</p>
                <div className="mt-3 w-full h-1 bg-zinc-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${d.completionRate}%`, background: d.color }} />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-zinc-400">{d.employeeCount} personel</span>
                  <span className="text-[10px] text-zinc-400">{d.activeTaskCount} aktif görev</span>
                </div>
              </div>
            ))
          }
        </div>
      )
    }
    if (activeChapter === 'harita') return <TaskMap />
    if (activeChapter === 'departmanlar') {
      if (activePage === 0) return (
        <div className="surface">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
            <div>
              <p className="text-[13px] font-semibold text-zinc-900">{deptTermLabel} Performansı</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">Görev tamamlanma oranları</p>
            </div>
          </div>
          {deptsLoading ? (
            <div className="p-5 space-y-3">{[1,2,3].map(i => <div key={i} className="h-8 animate-pulse bg-zinc-100 rounded" />)}</div>
          ) : (
            <>
              <div className="px-5 py-4 border-b border-zinc-50">
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={deptBarData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip formatter={(v) => [`%${v}`, 'Tamamlanma']} />
                    <Bar dataKey="tamamlanma" fill="#2563eb" radius={[3, 3, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table min-w-[480px]">
                  <thead><tr><th>{deptTermLabel.slice(0, -2)}</th><th className="text-right">Personel</th><th className="text-right">Aktif Görev</th><th className="text-right">Tamamlanma</th></tr></thead>
                  <tbody>
                    {departments.map(d => (
                      <tr key={d.id}>
                        <td><div className="flex items-center gap-2"><svg width="8" height="8" viewBox="0 0 8 8" className="flex-shrink-0" aria-hidden="true"><circle cx="4" cy="4" r="4" fill={d.color} /></svg><span className="font-medium text-zinc-800">{d.name}</span></div></td>
                        <td className="text-right">{d.employeeCount}</td>
                        <td className="text-right">{d.activeTaskCount}</td>
                        <td className="text-right"><span className={clsx('font-semibold text-[12px]', d.completionRate >= 85 ? 'text-emerald-600' : d.completionRate >= 70 ? 'text-amber-600' : 'text-red-500')}>%{d.completionRate}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )
      if (activePage === 1) return (
        <div className="surface">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
            <p className="text-[13px] font-semibold text-zinc-900">Son Aktiviteler</p>
            <button type="button" className="text-[11px] text-indigo-600 flex items-center gap-0.5 hover:underline">Tümü <ArrowUpRight size={11} /></button>
          </div>
          {reportsLoading ? (
            <div className="p-4 space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-10 animate-pulse bg-zinc-100 rounded" />)}</div>
          ) : reports.length === 0 ? (
            <p className="text-[12px] text-zinc-400 text-center py-8">Henüz aktivite yok</p>
          ) : (
            <ul className="divide-y divide-zinc-50">
              {reports.slice(0, 15).map(r => (
                <li key={r.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-zinc-50/60 transition-colors">
                  <div className={clsx('w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                    r.status === 'onaylandi' ? 'bg-emerald-100' : r.status === 'gonderildi' ? 'bg-indigo-100' : 'bg-amber-100')}>
                    <Activity size={11} className={r.status === 'onaylandi' ? 'text-emerald-600' : r.status === 'gonderildi' ? 'text-indigo-600' : 'text-amber-600'} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-zinc-800 leading-snug truncate">{r.title}</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      {new Date(r.createdAt).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                      {r.offlineCreated && <span className="ml-1.5 text-amber-500">· Çevrimdışı</span>}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )
    }
    if (activeChapter === 'analizler') return <OperIQInsights />
    return null
  }

  return (
    <>
      {/* Chapter tabs - horizontal scroll on mobile */}
      <div className="border-b border-zinc-200 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex items-end gap-1 min-w-max">
          {CHAPTERS.map(ch => {
            const Icon = ch.icon
            const active = activeChapter === ch.id
            return (
              <button key={ch.id} type="button" onClick={() => handleChapter(ch.id)}
                className={clsx('flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-semibold border-b-2 transition-colors whitespace-nowrap',
                  active ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-zinc-500 hover:text-zinc-800 hover:border-zinc-300')}>
                <Icon size={13} />{ch.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Page tabs */}
      {chapter.pages.length > 1 && (
        <div className="flex items-center gap-1 px-1 pt-3 pb-2 overflow-x-auto scrollbar-hide">
          {chapter.pages.map((page, idx) => (
            <button key={page} type="button" onClick={() => handlePage(idx)}
              className={clsx('px-3 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap flex-shrink-0',
                activePage === idx ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700')}>
              {page}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className={clsx(chapter.pages.length > 1 ? 'pt-1' : 'pt-4')}>
        {renderContent()}
      </div>
    </>
  )
}

/* ── Custom dashboard - widget grid ─────────────────────────────────────────*/
function CustomDashboard({ config, data, deptTermLabel, taskTermLabel, onWidgetFilterChange, onNLDelete, onReorder }: {
  config: DashboardConfig; data: SharedData
  deptTermLabel: string; taskTermLabel: string
  onWidgetFilterChange: (widgetId: string, filter: WidgetFilter | null) => void
  onNLDelete: (widgetId: string) => void
  onReorder: (widgets: string[]) => void
}) {
  const knownIds = new Set(WIDGET_REGISTRY.map(w => w.id))
  const widgets  = config.widgets.filter(id => knownIds.has(id) || isNLWidgetId(id))

  // ── Drag-and-drop state ──────────────────────────────────────────────────
  const [dragId,  setDragId]  = useState<string | null>(null)
  const [overId,  setOverId]  = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (id !== overId) setOverId(id)
  }
  const handleDragLeave = (id: string) => {
    if (overId === id) setOverId(null)
  }
  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!dragId || dragId === targetId) {
      setDragId(null)
      setOverId(null)
      return
    }
    const next = [...widgets]
    const fromIdx = next.indexOf(dragId)
    const toIdx   = next.indexOf(targetId)
    if (fromIdx < 0 || toIdx < 0) return
    next.splice(fromIdx, 1)
    next.splice(toIdx, 0, dragId)
    onReorder(next)
    setDragId(null)
    setOverId(null)
  }
  const handleDragEnd = () => {
    setDragId(null)
    setOverId(null)
  }

  if (widgets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
        <LayoutDashboard size={32} className="text-zinc-300 mb-3" />
        <p className="text-[13px] font-medium">Bu dashboard'da widget yok</p>
        <p className="text-[11px] mt-1">Düzenle butonuna tıklayarak widget ekleyin</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 pt-4">
      {widgets.map(id => {
        const isDraggingMe = dragId === id
        const isOverMe     = overId === id && dragId && dragId !== id
        const dragClass    = clsx(
          'cursor-grab active:cursor-grabbing transition-all',
          isDraggingMe && 'opacity-40 scale-[0.98]',
          isOverMe     && 'ring-2 ring-indigo-400 ring-offset-2 rounded-xl',
        )
        const dragProps = {
          draggable: true,
          onDragStart: (e: React.DragEvent) => handleDragStart(e, id),
          onDragOver:  (e: React.DragEvent) => handleDragOver(e, id),
          onDragLeave: () => handleDragLeave(id),
          onDrop:      (e: React.DragEvent) => handleDrop(e, id),
          onDragEnd:   handleDragEnd,
        }

        // NL widget - render dynamic config
        if (isNLWidgetId(id)) {
          const nlConfig = getNLWidget(id)
          if (!nlConfig) return null
          const colClass = nlConfig.chartType === 'kpi' || nlConfig.chartType === 'pie'
            ? 'xl:col-span-1'
            : nlConfig.chartType === 'table'
              ? 'col-span-3'
              : 'xl:col-span-2'
          return (
            <div key={id} className={clsx(colClass, dragClass)} {...dragProps}>
              <NLWidgetRenderer
                config={nlConfig}
                data={data}
                departments={data.departments}
                onDelete={() => onNLDelete(id)}
              />
            </div>
          )
        }

        const meta         = WIDGET_REGISTRY.find(w => w.id === id)!
        const widgetFilter = config.widgetFilters[id] ?? {}
        const colClass     = meta.span === 'full' ? 'col-span-3' : meta.span === 'wide' ? 'xl:col-span-2' : 'xl:col-span-1'
        const content      = renderWidget(id, data, deptTermLabel, taskTermLabel, widgetFilter)
        if (!content) return null
        return (
          <div key={id} className={clsx(colClass, dragClass)} {...dragProps}>
            <WidgetWrapper
              meta={meta}
              filter={widgetFilter}
              onFilterChange={f => onWidgetFilterChange(id, f)}
              className=""
            >
              {/* Strip the outer col-span div from renderWidget since WidgetWrapper handles it */}
              <div className="h-full">
                {content}
              </div>
            </WidgetWrapper>
          </div>
        )
      })}
    </div>
  )
}

/* ── Main ────────────────────────────────────────────────────────────────────*/
export default function Dashboard() {
  return (
    <FilterProvider>
      <DashboardInner />
    </FilterProvider>
  )
}

function DashboardInner() {
  const { user }         = useAuth()
  const { config, sector } = useCompany()

  const store = useDashboardStore()

  const [editorOpen, setEditorOpen]   = useState(false)
  const [editTarget, setEditTarget]   = useState<DashboardConfig | null>(null)
  const [nlOpen,     setNlOpen]       = useState(false)
  const [formatOpen, setFormatOpen]   = useState(false)
  const [format,     setFormat]       = useState<DossierFormat>(() => resolveFormat(store.activeId))

  // Re-resolve format when active dashboard changes
  useEffect(() => {
    setFormat(resolveFormat(store.activeId))
  }, [store.activeId])

  const data            = useSharedData()
  const deptTermLabel   = sector?.terminology.departments ?? 'Departmanlar'
  const taskTermLabel   = sector?.terminology.tasks       ?? 'Görevler'
  const overdue         = data.stats?.tasks.overdue ?? 0

  const handleEditorSave = (name: string, widgets: string[]) => {
    if (editTarget) {
      store.updateDashboard(editTarget.id, { name, widgets })
    } else {
      store.createDashboard(name, widgets)
    }
    setEditorOpen(false)
    setEditTarget(null)
  }

  const openEdit = (db: DashboardConfig) => {
    setEditTarget(db)
    setEditorOpen(true)
  }

  const openNew = () => {
    setEditTarget(null)
    setEditorOpen(true)
  }

  const isDefault = store.activeDashboard.id === DEFAULT_DASHBOARD_ID

  // When an NL widget is generated, attach it to a dashboard.
  // Default dashboard is read-only, so create or reuse an "Dashboard Kişiselleştirme" dashboard.
  const handleNLCreated = (widgetId: string) => {
    if (isDefault) {
      const existing = store.dashboards.find(d => d.name === 'Dashboard Kişiselleştirme')
      if (existing) {
        store.updateDashboard(existing.id, { widgets: [...existing.widgets, widgetId] })
        store.setActiveId(existing.id)
      } else {
        store.createDashboard('Dashboard Kişiselleştirme', [widgetId])
      }
    } else {
      store.updateDashboard(store.activeDashboard.id, {
        widgets: [...store.activeDashboard.widgets, widgetId],
      })
    }
    setNlOpen(false)
  }

  const handleNLDelete = (widgetId: string) => {
    store.updateDashboard(store.activeDashboard.id, {
      widgets: store.activeDashboard.widgets.filter(w => w !== widgetId),
    })
    deleteNLWidget(widgetId)
  }

  // Page-specific shortcuts
  useShortcut({ keys: 'f', label: 'Filtre panelini aç/kapat', category: 'Görünüm', handler: () => window.dispatchEvent(new Event(DASHBOARD_FILTER_TOGGLE_EVENT)) })
  useShortcut({ keys: 'n', label: 'Yeni gösterge paneli',     category: 'Eylem',   handler: openNew })
  useShortcut({ keys: 'w', label: 'Veri görselleştirme oluştur', category: 'Eylem', handler: () => setNlOpen(true) })
  useShortcut({ keys: 't', label: 'Format editörü',           category: 'Görünüm', handler: () => setFormatOpen(true) })

  // Toolbar buttons mapped to dashboard actions
  useToolbarActions({
    onNew:    openNew,
    onFilter: () => window.dispatchEvent(new Event(DASHBOARD_FILTER_TOGGLE_EVENT)),
  })
  useShortcut({
    keys: 'e', label: 'Aktif paneli düzenle', category: 'Eylem',
    enabled: !isDefault,
    handler: () => openEdit(store.activeDashboard),
  })

  return (
    <div
      className="dossier-root space-y-0"
      data-density={format.density}
      data-radius={format.radius}
      data-shadow={format.shadow}
      data-bg={format.bg}
      data-font={format.font}
      data-accent={format.accent}
    >

      {/* ── Kokpit özet satırı ── */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-5 gap-4">
        <div className="min-w-0">
          <h2 className="text-[18px] font-bold text-zinc-900 tracking-tight flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Sistem Aktif
            </span>
            Hoş geldin, {user?.name.split(' ')[0]}
          </h2>
          <p className="text-[12px] text-zinc-400 mt-0.5 truncate">
            {config?.companyName} · {sector?.name ?? 'Genel'} ·{' '}
            {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
            {' · '}{ROLE_LABELS[user?.role ?? 'mudur']}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap lg:flex-shrink-0">
          {overdue > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700">
              <AlertTriangle size={14} />
              <span className="text-[12px] font-semibold">{overdue} görev gecikti</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setNlOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 hover:from-indigo-100 hover:to-purple-100 transition-all"
            title="Doğal dil tarif ile görselleştirme oluştur (W)"
            data-help="Doğal dilde tarif ederek yeni bir grafik / KPI / tablo widget'ı oluştur"
          >
            <Wand2 size={13} />
            <span className="text-[12px] font-semibold">OperIQ Dogal Dil ile Gorsellestirme</span>
          </button>
          <button
            type="button"
            onClick={() => setFormatOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 transition-all"
            title="Format editörü (T)"
          >
            <Palette size={13} />
            <span className="text-[12px] font-semibold">Format</span>
          </button>
          <DashboardSwitcher
            dashboards={store.dashboards}
            activeId={store.activeId}
            onSelect={store.setActiveId}
            onNew={openNew}
            onEdit={openEdit}
            onDelete={store.deleteDashboard}
          />
        </div>
      </div>

      {/* ── Filter bar ── */}
      <DashboardFilter />

      {/* ── Dashboard content ── */}
      {isDefault
        ? <DefaultDashboard data={data} deptTermLabel={deptTermLabel} taskTermLabel={taskTermLabel} />
        : <CustomDashboard
            config={store.activeDashboard}
            data={data}
            deptTermLabel={deptTermLabel}
            taskTermLabel={taskTermLabel}
            onWidgetFilterChange={(widgetId, filter) =>
              store.setWidgetFilter(store.activeId, widgetId, filter)
            }
            onNLDelete={handleNLDelete}
            onReorder={(widgets) => store.updateDashboard(store.activeId, { widgets })}
          />
      }

      {/* ── Editor modal ── */}
      {editorOpen && (
        <DashboardEditor
          dashboard={editTarget}
          onSave={handleEditorSave}
          onClose={() => { setEditorOpen(false); setEditTarget(null) }}
        />
      )}

      {/* ── NL Generator modal ── */}
      {nlOpen && (
        <NLWidgetGenerator
          onClose={() => setNlOpen(false)}
          onCreated={handleNLCreated}
        />
      )}

      {/* ── Format Editor modal ── */}
      {/* ── Dönem Karşılaştırma — dept-scoped, ERP tabs gated inside ── */}
      <div className="mt-6">
        <CompareWidget />
      </div>

      {formatOpen && (
        <DossierFormatEditor
          dashboardId={store.activeId}
          dashboardName={store.activeDashboard.name}
          onClose={() => setFormatOpen(false)}
          onChange={() => setFormat(resolveFormat(store.activeId))}
        />
      )}
    </div>
  )
}
