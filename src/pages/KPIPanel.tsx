import { useState, useMemo } from 'react'
import {
  BarChart3, Target, TrendingUp, AlertTriangle, Sparkles,
  Calendar, Filter, ChevronDown, Clock, Activity,
  RefreshCw, Cpu, ChevronRight,
} from 'lucide-react'
import clsx from 'clsx'
import { useKpis, useDepartments, generateInsight, type Kpi, type KpiLayer } from '../lib/hooks'
import { useLanguage, useBi } from '../context/LanguageContext'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function kpiProgress(kpi: Kpi): number {
  if (!kpi.target || kpi.target === 0) return 0
  return Math.min(100, Math.round(((kpi.currentValue ?? 0) / kpi.target) * 100))
}

function progressColor(pct: number): { bar: string; bg: string; text: string; badge: string } {
  if (pct >= 80) return { bar: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', badge: 'border-emerald-200' }
  if (pct >= 50) return { bar: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', badge: 'border-amber-200' }
  return { bar: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700', badge: 'border-red-200' }
}

const LAYER_CONFIG: Record<KpiLayer, {
  icon: typeof BarChart3
  color: string
  bg: string
  border: string
  ring: string
  barColor: string
}> = {
  PERFORMANCE: {
    icon: BarChart3,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    ring: 'ring-blue-200',
    barColor: '#3b82f6',
  },
  QUALITY: {
    icon: Target,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    ring: 'ring-emerald-200',
    barColor: '#10b981',
  },
  TIME: {
    icon: Clock,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    ring: 'ring-indigo-200',
    barColor: '#6366f1',
  },
  RISK: {
    icon: AlertTriangle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    ring: 'ring-red-200',
    barColor: '#ef4444',
  },
  AI_INSIGHT: {
    icon: Sparkles,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    ring: 'ring-purple-200',
    barColor: '#a855f7',
  },
}

const LAYER_LABEL: Record<KpiLayer, { tr: string; en: string }> = {
  PERFORMANCE: { tr: 'Performans', en: 'Performance' },
  QUALITY:     { tr: 'Kalite', en: 'Quality' },
  TIME:        { tr: 'Zaman', en: 'Time' },
  RISK:        { tr: 'Risk', en: 'Risk' },
  AI_INSIGHT:  { tr: 'AI Icgoru', en: 'AI Insight' },
}

type TimeRange = 'week' | 'month' | 'quarter'

function getTimeRange(range: TimeRange): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(now)
  const end = new Date(now)

  if (range === 'week') {
    const day = now.getDay()
    start.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
    end.setDate(start.getDate() + 6)
  } else if (range === 'month') {
    start.setDate(1)
    end.setMonth(end.getMonth() + 1, 0)
  } else {
    const q = Math.floor(now.getMonth() / 3)
    start.setMonth(q * 3, 1)
    end.setMonth(q * 3 + 3, 0)
  }

  start.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

function isInRange(kpi: Kpi, range: { start: Date; end: Date }): boolean {
  if (!kpi.startDate && !kpi.endDate) return true
  const kStart = kpi.startDate ? new Date(kpi.startDate) : null
  const kEnd = kpi.endDate ? new Date(kpi.endDate) : null
  if (kStart && kStart > range.end) return false
  if (kEnd && kEnd < range.start) return false
  return true
}

function formatDate(d: string | null | undefined, lang: string): string {
  if (!d) return '-'
  return new Date(d).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', {
    day: '2-digit',
    month: 'short',
  })
}

// ---------------------------------------------------------------------------
// Mini bar chart (SVG)
// ---------------------------------------------------------------------------
function MiniBarChart({ pct, color }: { pct: number; color: string }) {
  const bars = [
    Math.min(100, pct * 0.3),
    Math.min(100, pct * 0.6),
    Math.min(100, pct * 0.85),
    Math.min(100, pct),
    Math.min(100, pct * 0.7),
  ]
  return (
    <svg width="60" height="32" viewBox="0 0 60 32" className="opacity-80">
      {bars.map((h, i) => (
        <rect
          key={i}
          x={i * 13}
          y={32 - (h / 100) * 28}
          width="10"
          rx="2"
          height={(h / 100) * 28}
          fill={color}
          opacity={0.15 + (i / bars.length) * 0.85}
        />
      ))}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Mini gauge (SVG donut)
// ---------------------------------------------------------------------------
function MiniGauge({ pct, color }: { pct: number; color: string }) {
  const r = 14
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(100, pct) / 100) * circ
  return (
    <svg width="36" height="36" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r={r} fill="none" stroke="#e5e7eb" strokeWidth="4" />
      <circle
        cx="18" cy="18" r={r} fill="none"
        stroke={color} strokeWidth="4"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 18 18)"
      />
      <text x="18" y="19" textAnchor="middle" dominantBaseline="middle"
        fontSize="9" fontWeight="700" fill="#374151"
      >
        {pct}
      </text>
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Mini line (SVG)
// ---------------------------------------------------------------------------
function MiniLine({ pct, color }: { pct: number; color: string }) {
  const points = [
    { x: 0, y: 28 },
    { x: 15, y: 28 - (pct * 0.4 / 100) * 24 },
    { x: 30, y: 28 - (pct * 0.7 / 100) * 24 },
    { x: 45, y: 28 - (pct * 0.85 / 100) * 24 },
    { x: 60, y: 28 - (pct / 100) * 24 },
  ]
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  return (
    <svg width="60" height="32" viewBox="0 0 60 32">
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={color} opacity={0.3 + (i / points.length) * 0.7} />
      ))}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Timeline bar for the agenda
// ---------------------------------------------------------------------------
function TimelineBar({ kpi, range, lang }: { kpi: Kpi; range: { start: Date; end: Date }; lang: string }) {
  const totalMs = range.end.getTime() - range.start.getTime()
  if (totalMs <= 0) return null

  const kStart = kpi.startDate ? new Date(kpi.startDate) : range.start
  const kEnd = kpi.endDate ? new Date(kpi.endDate) : range.end

  const leftPct = Math.max(0, Math.min(100, ((kStart.getTime() - range.start.getTime()) / totalMs) * 100))
  const rightPct = Math.max(0, Math.min(100, ((kEnd.getTime() - range.start.getTime()) / totalMs) * 100))
  const widthPct = Math.max(2, rightPct - leftPct)

  const pct = kpiProgress(kpi)
  const { bar } = progressColor(pct)

  return (
    <div className="relative h-7 w-full bg-zinc-100 rounded overflow-hidden">
      {/* Period bar */}
      <div
        className="absolute top-0 h-full rounded bg-zinc-200"
        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
      />
      {/* Progress fill */}
      <div
        className={clsx('absolute top-0 h-full rounded', bar)}
        style={{
          left: `${leftPct}%`,
          width: `${widthPct * (pct / 100)}%`,
          opacity: 0.7,
        }}
      />
      {/* Label overlay */}
      <div
        className="absolute top-0 h-full flex items-center px-2"
        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
      >
        <span className="text-[10px] font-semibold text-zinc-800 truncate">
          {pct}%
        </span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// KPI Analysis Card
// ---------------------------------------------------------------------------
function KpiAnalysisCard({
  kpi,
  bi,
  lang,
  expanded,
  onToggle,
  analysis,
  analysisLoading,
}: {
  kpi: Kpi
  bi: <T>(v: { tr: T; en: T }) => T
  lang: string
  expanded: boolean
  onToggle: () => void
  analysis: string | null
  analysisLoading: boolean
}) {
  const pct = kpiProgress(kpi)
  const pColor = progressColor(pct)
  const layerCfg = LAYER_CONFIG[kpi.layer]
  const LayerIcon = layerCfg.icon

  const chartEl = (() => {
    switch (kpi.layer) {
      case 'PERFORMANCE': return <MiniBarChart pct={pct} color={layerCfg.barColor} />
      case 'QUALITY':     return <MiniGauge pct={pct} color={layerCfg.barColor} />
      case 'TIME':        return <MiniLine pct={pct} color={layerCfg.barColor} />
      case 'RISK':        return (
        <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
          <AlertTriangle size={18} className="text-red-500" />
        </div>
      )
      case 'AI_INSIGHT':  return (
        <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
          <Sparkles size={18} className="text-purple-500" />
        </div>
      )
      default: return <MiniBarChart pct={pct} color={layerCfg.barColor} />
    }
  })()

  return (
    <div className={clsx(
      'bg-white rounded-xl border shadow-sm hover:shadow-md transition-all overflow-hidden',
      kpi.layer === 'RISK' ? 'border-red-200' : kpi.layer === 'AI_INSIGHT' ? 'border-purple-200' : 'border-zinc-200',
    )}>
      {/* Card header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-4 focus:outline-none"
      >
        <div className="flex items-start gap-3">
          {/* Layer badge + chart */}
          <div className="flex-shrink-0 flex flex-col items-center gap-2">
            <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center', layerCfg.bg, 'border', layerCfg.border)}>
              <LayerIcon size={14} className={layerCfg.color} />
            </div>
            {chartEl}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={clsx('text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border', layerCfg.bg, layerCfg.border, layerCfg.color)}>
                {bi(LAYER_LABEL[kpi.layer])}
              </span>
              {kpi.code && (
                <span className="text-[9px] text-zinc-400 font-mono">{kpi.code}</span>
              )}
            </div>
            <p className="text-[13px] font-semibold text-zinc-900 leading-snug truncate">
              {bi(kpi.label)}
            </p>
            {kpi.description && (
              <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
                {bi(kpi.description)}
              </p>
            )}

            {/* Value + target row */}
            <div className="flex items-baseline gap-3 mt-2">
              <span className="text-[20px] font-extrabold text-zinc-900 leading-none">
                {kpi.currentValue ?? '-'}
              </span>
              {kpi.target != null && (
                <span className="text-[11px] text-zinc-400">
                  / {kpi.target} {kpi.unit ?? ''}
                </span>
              )}
              <span className={clsx('ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full border', pColor.bg, pColor.badge, pColor.text)}>
                {pct}%
              </span>
            </div>

            {/* Progress bar */}
            <div className="mt-2 w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className={clsx('h-full rounded-full transition-all', pColor.bar)}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Expand arrow */}
          <ChevronRight size={14} className={clsx(
            'text-zinc-400 transition-transform mt-1 flex-shrink-0',
            expanded && 'rotate-90',
          )} />
        </div>
      </button>

      {/* Expanded OperIQ analysis */}
      {expanded && (
        <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 rounded bg-teal-50 border border-teal-200 flex items-center justify-center">
              <Cpu size={10} className="text-teal-600" />
            </div>
            <span className="text-[11px] font-semibold text-teal-700">OperIQ</span>
            <span className="text-[9px] text-zinc-400 font-medium">
              {lang === 'tr' ? 'Verimlilik Analizi' : 'Efficiency Analysis'}
            </span>
          </div>
          {analysisLoading ? (
            <div className="flex items-center gap-2 py-4">
              <RefreshCw size={12} className="text-teal-500 animate-spin" />
              <span className="text-[11px] text-zinc-500">
                {lang === 'tr' ? 'Analiz hazirlaniyor...' : 'Preparing analysis...'}
              </span>
            </div>
          ) : analysis ? (
            <div className="text-[12px] text-zinc-600 leading-relaxed whitespace-pre-line">
              {analysis.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
                part.startsWith('**') ? (
                  <strong key={i} className="font-semibold text-zinc-800">{part.slice(2, -2)}</strong>
                ) : (
                  <span key={i}>{part}</span>
                ),
              )}
            </div>
          ) : (
            <p className="text-[11px] text-zinc-400 py-2">
              {lang === 'tr' ? 'Analiz bulunamadi.' : 'No analysis found.'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function KPIPanel() {
  const { lang } = useLanguage()
  const bi = useBi()

  // Filters
  const [deptFilter, setDeptFilter] = useState<string>('')
  const [timeRange, setTimeRange] = useState<TimeRange>('month')
  const [showDeptDropdown, setShowDeptDropdown] = useState(false)

  // Data
  const { departments } = useDepartments()
  const { kpis, loading, refetch } = useKpis(
    deptFilter ? { departmentId: deptFilter } : {},
  )

  // OperIQ analysis state per KPI
  const [expandedKpi, setExpandedKpi] = useState<string | null>(null)
  const [analyses, setAnalyses] = useState<Record<string, string>>({})
  const [analysisLoading, setAnalysisLoading] = useState<string | null>(null)

  const range = useMemo(() => getTimeRange(timeRange), [timeRange])

  const filteredKpis = useMemo(() => {
    return kpis.filter(k => isInRange(k, range))
  }, [kpis, range])

  // Group by layer for analysis section
  const kpisByLayer = useMemo(() => {
    const groups: Partial<Record<KpiLayer, Kpi[]>> = {}
    for (const kpi of filteredKpis) {
      if (!groups[kpi.layer]) groups[kpi.layer] = []
      groups[kpi.layer]!.push(kpi)
    }
    return groups
  }, [filteredKpis])

  const selectedDept = departments.find(d => d.id === deptFilter)

  const handleToggleKpi = async (kpi: Kpi) => {
    if (expandedKpi === kpi.id) {
      setExpandedKpi(null)
      return
    }
    setExpandedKpi(kpi.id)

    // If we already have analysis cached, skip
    if (analyses[kpi.id]) return

    // Generate OperIQ analysis
    setAnalysisLoading(kpi.id)
    try {
      const insight = await generateInsight('VERIMLILIK_ANALIZI', kpi.departmentId)
      setAnalyses(prev => ({ ...prev, [kpi.id]: insight.content }))
    } catch {
      setAnalyses(prev => ({
        ...prev,
        [kpi.id]: lang === 'tr'
          ? 'Analiz oluşturulurken hata olustu. Lutfen tekrar deneyin.'
          : 'Error generating analysis. Please try again.',
      }))
    } finally {
      setAnalysisLoading(null)
    }
  }

  // Summary stats
  const totalKpis = filteredKpis.length
  const avgProgress = totalKpis > 0
    ? Math.round(filteredKpis.reduce((sum, k) => sum + kpiProgress(k), 0) / totalKpis)
    : 0
  const onTrack = filteredKpis.filter(k => kpiProgress(k) >= 80).length
  const atRisk = filteredKpis.filter(k => kpiProgress(k) < 50).length

  const TIME_LABELS: Record<TimeRange, { tr: string; en: string }> = {
    week:    { tr: 'Bu Hafta', en: 'This Week' },
    month:   { tr: 'Bu Ay', en: 'This Month' },
    quarter: { tr: 'Bu Ceyrek', en: 'This Quarter' },
  }

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <Activity size={20} className="text-indigo-500" />
            {lang === 'tr' ? 'KPI Paneli' : 'KPI Panel'}
          </h1>
          <p className="text-[12px] text-zinc-400 mt-0.5">
            {lang === 'tr'
              ? 'Performans gostergelerini takip edin ve OperIQ analizi alin'
              : 'Track performance indicators and get OperIQ analysis'}
          </p>
        </div>
        <button
          type="button"
          onClick={refetch}
          disabled={loading}
          className="btn-default btn-sm self-start"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          {lang === 'tr' ? 'Yenile' : 'Refresh'}
        </button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Department filter */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowDeptDropdown(!showDeptDropdown)}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-zinc-200 rounded-lg text-[12px] font-medium text-zinc-700 hover:border-zinc-300 transition-colors shadow-sm"
          >
            <Filter size={13} className="text-zinc-400" />
            {selectedDept ? selectedDept.name : (lang === 'tr' ? 'Tum Departmanlar' : 'All Departments')}
            <ChevronDown size={13} className="text-zinc-400" />
          </button>
          {showDeptDropdown && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-zinc-200 rounded-lg shadow-lg z-30 py-1 max-h-64 overflow-y-auto">
              <button
                type="button"
                onClick={() => { setDeptFilter(''); setShowDeptDropdown(false) }}
                className={clsx(
                  'w-full text-left px-3 py-2 text-[12px] hover:bg-zinc-50 transition-colors',
                  !deptFilter ? 'font-semibold text-indigo-600 bg-indigo-50' : 'text-zinc-700',
                )}
              >
                {lang === 'tr' ? 'Tum Departmanlar' : 'All Departments'}
              </button>
              {departments.map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => { setDeptFilter(d.id); setShowDeptDropdown(false) }}
                  className={clsx(
                    'w-full text-left px-3 py-2 text-[12px] hover:bg-zinc-50 transition-colors flex items-center gap-2',
                    deptFilter === d.id ? 'font-semibold text-indigo-600 bg-indigo-50' : 'text-zinc-700',
                  )}
                >
                  {d.color && (
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                  )}
                  {d.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Time range selector */}
        <div className="flex gap-0.5 p-1 bg-white border border-zinc-200 rounded-lg shadow-sm">
          {(['week', 'month', 'quarter'] as TimeRange[]).map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setTimeRange(r)}
              className={clsx(
                'px-3 py-1.5 rounded text-[11px] font-medium transition-all',
                timeRange === r
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50',
              )}
            >
              {bi(TIME_LABELS[r])}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            {lang === 'tr' ? 'Toplam KPI' : 'Total KPIs'}
          </p>
          <p className="text-[22px] font-extrabold text-zinc-900 mt-1 leading-none">{totalKpis}</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            {lang === 'tr' ? 'Ort. Ilerleme' : 'Avg. Progress'}
          </p>
          <p className="text-[22px] font-extrabold text-zinc-900 mt-1 leading-none">{avgProgress}%</p>
        </div>
        <div className="bg-white rounded-xl border border-emerald-200 p-4 shadow-sm bg-emerald-50/30">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
            {lang === 'tr' ? 'Hedefe Yakin' : 'On Track'}
          </p>
          <p className="text-[22px] font-extrabold text-emerald-700 mt-1 leading-none">{onTrack}</p>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4 shadow-sm bg-red-50/30">
          <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">
            {lang === 'tr' ? 'Risk Altinda' : 'At Risk'}
          </p>
          <p className="text-[22px] font-extrabold text-red-700 mt-1 leading-none">{atRisk}</p>
        </div>
      </div>

      {/* ================================================================== */}
      {/* SECTION 1: KPI Ajandasi */}
      {/* ================================================================== */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={16} className="text-indigo-500" />
          <h2 className="text-[15px] font-bold text-zinc-900">
            {lang === 'tr' ? 'KPI Ajandasi' : 'KPI Agenda'}
          </h2>
          <span className="text-[10px] text-zinc-400 font-medium ml-1">
            {bi(TIME_LABELS[timeRange])}
          </span>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
          {/* Timeline header */}
          <div className="flex items-center gap-4 px-4 py-2.5 bg-zinc-50 border-b border-zinc-100 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
            <div className="w-[200px] flex-shrink-0">{lang === 'tr' ? 'KPI' : 'KPI'}</div>
            <div className="w-[80px] flex-shrink-0 text-center">{lang === 'tr' ? 'Ilerleme' : 'Progress'}</div>
            <div className="flex-1">{lang === 'tr' ? 'Zaman Dilimi' : 'Timeline'}</div>
            <div className="w-[100px] text-right flex-shrink-0">{lang === 'tr' ? 'Tarih Araligi' : 'Date Range'}</div>
          </div>

          {loading ? (
            [1, 2, 3, 4].map(i => (
              <div key={i} className="px-4 py-3 animate-pulse">
                <div className="h-7 bg-zinc-100 rounded" />
              </div>
            ))
          ) : filteredKpis.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Calendar size={24} className="text-zinc-300 mx-auto mb-2" />
              <p className="text-[12px] text-zinc-400">
                {lang === 'tr' ? 'Bu donemde KPI bulunamadi' : 'No KPIs found for this period'}
              </p>
            </div>
          ) : (
            filteredKpis.map((kpi, idx) => {
              const pct = kpiProgress(kpi)
              const pColor = progressColor(pct)
              const layerCfg = LAYER_CONFIG[kpi.layer]
              const LayerIcon = layerCfg.icon

              return (
                <div
                  key={kpi.id}
                  className={clsx(
                    'flex items-center gap-4 px-4 py-2.5 hover:bg-zinc-50/50 transition-colors',
                    idx < filteredKpis.length - 1 && 'border-b border-zinc-50',
                  )}
                >
                  {/* KPI name */}
                  <div className="w-[200px] flex-shrink-0 flex items-center gap-2 min-w-0">
                    <div className={clsx('w-5 h-5 rounded flex items-center justify-center flex-shrink-0', layerCfg.bg)}>
                      <LayerIcon size={10} className={layerCfg.color} />
                    </div>
                    <span className="text-[12px] font-medium text-zinc-800 truncate">
                      {bi(kpi.label)}
                    </span>
                  </div>

                  {/* Progress badge */}
                  <div className="w-[80px] flex-shrink-0 flex justify-center">
                    <span className={clsx(
                      'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                      pColor.bg, pColor.badge, pColor.text,
                    )}>
                      {pct}%
                    </span>
                  </div>

                  {/* Timeline bar */}
                  <div className="flex-1">
                    <TimelineBar kpi={kpi} range={range} lang={lang} />
                  </div>

                  {/* Date range */}
                  <div className="w-[100px] text-right flex-shrink-0">
                    <span className="text-[10px] text-zinc-400">
                      {formatDate(kpi.startDate, lang)} - {formatDate(kpi.endDate, lang)}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 2: KPI Analizi */}
      {/* ================================================================== */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-indigo-500" />
          <h2 className="text-[15px] font-bold text-zinc-900">
            {lang === 'tr' ? 'KPI Analizi' : 'KPI Analysis'}
          </h2>
          <span className="text-[10px] text-zinc-400 font-medium ml-1">
            {lang === 'tr' ? 'Karta tikla - OperIQ analizi' : 'Click card - OperIQ analysis'}
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-xl border border-zinc-200 h-36 animate-pulse" />
            ))}
          </div>
        ) : filteredKpis.length === 0 ? (
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-10 text-center">
            <BarChart3 size={28} className="text-zinc-300 mx-auto mb-2" />
            <p className="text-[13px] text-zinc-500 font-medium">
              {lang === 'tr' ? 'KPI bulunamadi' : 'No KPIs found'}
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {lang === 'tr' ? 'Filtreleri degistirmeyi deneyin' : 'Try changing the filters'}
            </p>
          </div>
        ) : (
          Object.entries(kpisByLayer).map(([layer, layerKpis]) => {
            const cfg = LAYER_CONFIG[layer as KpiLayer]
            return (
              <div key={layer} className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <cfg.icon size={13} className={cfg.color} />
                  <span className={clsx('text-[11px] font-bold uppercase tracking-wider', cfg.color)}>
                    {bi(LAYER_LABEL[layer as KpiLayer])}
                  </span>
                  <span className="text-[10px] text-zinc-400">({layerKpis!.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {layerKpis!.map(kpi => (
                    <KpiAnalysisCard
                      key={kpi.id}
                      kpi={kpi}
                      bi={bi}
                      lang={lang}
                      expanded={expandedKpi === kpi.id}
                      onToggle={() => handleToggleKpi(kpi)}
                      analysis={analyses[kpi.id] ?? null}
                      analysisLoading={analysisLoading === kpi.id}
                    />
                  ))}
                </div>
              </div>
            )
          })
        )}
      </section>

      {/* Footer */}
      <p className="text-[10px] text-zinc-400 text-center pb-2">
        {lang === 'tr'
          ? 'KPI verileri departman bazinda güncellenmektedir. OperIQ analizleri yapay zeka tarafindan oluşturulur.'
          : 'KPI data is updated per department. OperIQ analyses are generated by AI.'}
      </p>
    </div>
  )
}
