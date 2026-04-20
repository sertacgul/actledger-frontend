import { useState, useMemo, useRef, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Plus, X, Loader2, ChevronDown, Calendar } from 'lucide-react'
import clsx from 'clsx'
import {
  useStockDashboard, useStockTrends, useStockDistribution, useStockHeatmap,
  type StockDashboardSummary, type StockTrendsData,
  type StockLocationDist, type StockHeatmapCell,
} from '../../lib/hooks'

// -- Constants ----------------------------------------------------------------

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

const RANGE_PRESETS = [
  { days: 7,   label: '7 gun'   },
  { days: 30,  label: '30 gun'  },
  { days: 90,  label: '90 gun'  },
  { days: 365, label: '365 gun' },
]

type ChartType = 'bar' | 'line' | 'pie' | 'waterfall' | 'harvey'
type DataSource = 'trend' | 'category' | 'location' | 'topConsumed' | 'heatmap'

const CHART_TYPE_OPTIONS: { value: ChartType; label: string }[] = [
  { value: 'bar',       label: 'Cubuk Grafik'   },
  { value: 'line',      label: 'Cizgi Grafik'   },
  { value: 'pie',       label: 'Pasta Grafik'   },
  { value: 'waterfall', label: 'Selale Grafik'  },
  { value: 'harvey',    label: 'Harvey Ball'    },
]

const DATA_SOURCE_OPTIONS: { value: DataSource; label: string }[] = [
  { value: 'trend',       label: 'Tuketim Trendi'     },
  { value: 'category',    label: 'Kategori Dagilimi'  },
  { value: 'location',    label: 'Lokasyon Dagilimi'  },
  { value: 'topConsumed', label: 'En Cok Tuketilen'   },
  { value: 'heatmap',     label: 'Isi Haritasi'       },
]

interface DynamicChartConfig {
  id: string
  title: string
  type: ChartType
  dataSource: DataSource
}

// -- Utility ------------------------------------------------------------------

function formatTRY(n: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(n)
}

function shortDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}`
}

// -- Loading Skeleton ---------------------------------------------------------

function ChartSkeleton() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-zinc-300" size={28} />
    </div>
  )
}

// -- Chart Card Wrapper -------------------------------------------------------

function ChartCard({
  title,
  dateLabel,
  children,
  loading,
  onRemove,
}: {
  title: string
  dateLabel?: string
  children: React.ReactNode
  loading?: boolean
  onRemove?: () => void
}) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5 relative">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-800">{title}</h3>
          {dateLabel && <p className="text-[11px] text-zinc-400 mt-0.5">{dateLabel}</p>}
        </div>
        {onRemove && (
          <button
            onClick={onRemove}
            className="p-1 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
            title="Kaldir"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {loading ? <ChartSkeleton /> : children}
    </div>
  )
}

// -- Harvey Ball (custom SVG) -------------------------------------------------

function HarveyBall({
  dashboard,
}: {
  dashboard: StockDashboardSummary
}) {
  const total = dashboard.totalItems || 1
  const belowMinPct = (dashboard.belowMin / total) * 100
  const criticalPct = (dashboard.critical / total) * 100
  const overstockPct = (dashboard.overstock / total) * 100
  const outOfStockPct = (dashboard.outOfStock / total) * 100
  const healthyPct = Math.max(0, 100 - belowMinPct - criticalPct - overstockPct - outOfStockPct)

  // Quadrant-based approach: divide circle into 4 quadrants
  // Q1 (top-right): healthy indicator
  // Q2 (bottom-right): below min
  // Q3 (bottom-left): critical
  // Q4 (top-left): overstock + out of stock

  const segments = [
    { label: 'Saglikli',     pct: healthyPct,    color: '#10b981' },
    { label: 'Min Altinda',  pct: belowMinPct,   color: '#f59e0b' },
    { label: 'Kritik',       pct: criticalPct,   color: '#ef4444' },
    { label: 'Fazla Stok',   pct: overstockPct,  color: '#8b5cf6' },
    { label: 'Stokta Yok',   pct: outOfStockPct, color: '#64748b' },
  ].filter(s => s.pct > 0)

  const cx = 80
  const cy = 80
  const r = 65

  // Build arc paths
  let cumAngle = -90 // start from top
  const arcs = segments.map(seg => {
    const startAngle = cumAngle
    const sweep = (seg.pct / 100) * 360
    cumAngle += sweep
    const endAngle = cumAngle

    const startRad = (startAngle * Math.PI) / 180
    const endRad = (endAngle * Math.PI) / 180

    const x1 = cx + r * Math.cos(startRad)
    const y1 = cy + r * Math.sin(startRad)
    const x2 = cx + r * Math.cos(endRad)
    const y2 = cy + r * Math.sin(endRad)

    const largeArc = sweep > 180 ? 1 : 0

    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`

    return { ...seg, path }
  })

  // Overall health score (0-100)
  const healthScore = Math.round(healthyPct)

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <svg width={160} height={160} viewBox="0 0 160 160">
          {/* Background circle */}
          <circle cx={cx} cy={cy} r={r} fill="#f4f4f5" />
          {/* Segments */}
          {arcs.map((arc, i) => (
            <path key={i} d={arc.path} fill={arc.color} opacity={0.85} />
          ))}
          {/* Inner circle for score */}
          <circle cx={cx} cy={cy} r={30} fill="white" />
          <text
            x={cx}
            y={cy - 4}
            textAnchor="middle"
            className="text-lg font-bold"
            fill="#18181b"
            fontSize={22}
          >
            {healthScore}
          </text>
          <text
            x={cx}
            y={cy + 14}
            textAnchor="middle"
            fill="#71717a"
            fontSize={10}
          >
            puan
          </text>
        </svg>
      </div>
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-xs text-zinc-600">{seg.label}</span>
            <span className="text-xs font-semibold text-zinc-800">{seg.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// -- Consumption Heatmap ------------------------------------------------------

function ConsumptionHeatmap({ data }: { data: StockHeatmapCell[] }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-zinc-400 text-center py-8">Veri bulunamadi</p>
  }

  // Extract unique locations and categories
  const locations = [...new Set(data.map(d => d.location))]
  const categories = [...new Set(data.map(d => d.category))]

  // Build lookup map
  const cellMap = new Map<string, number>()
  let maxVal = 0
  data.forEach(cell => {
    const key = `${cell.location}::${cell.category}`
    cellMap.set(key, cell.consumption)
    if (cell.consumption > maxVal) maxVal = cell.consumption
  })

  // Intensity color function
  const getColor = (val: number): string => {
    if (maxVal === 0) return '#f4f4f5'
    const intensity = val / maxVal
    if (intensity === 0) return '#f4f4f5'
    if (intensity < 0.2) return '#dbeafe'
    if (intensity < 0.4) return '#93c5fd'
    if (intensity < 0.6) return '#60a5fa'
    if (intensity < 0.8) return '#3b82f6'
    return '#1d4ed8'
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        {/* Header row */}
        <div
          className="grid gap-px"
          style={{
            gridTemplateColumns: `120px repeat(${categories.length}, minmax(70px, 1fr))`,
          }}
        >
          <div className="h-8" />
          {categories.map(cat => (
            <div key={cat} className="h-8 flex items-center justify-center px-1">
              <span className="text-[10px] font-semibold text-zinc-500 truncate">{cat}</span>
            </div>
          ))}
        </div>
        {/* Data rows */}
        {locations.map(loc => (
          <div
            key={loc}
            className="grid gap-px"
            style={{
              gridTemplateColumns: `120px repeat(${categories.length}, minmax(70px, 1fr))`,
            }}
          >
            <div className="h-10 flex items-center pr-2">
              <span className="text-xs text-zinc-600 truncate font-medium">{loc}</span>
            </div>
            {categories.map(cat => {
              const key = `${loc}::${cat}`
              const val = cellMap.get(key) ?? 0
              return (
                <div
                  key={key}
                  className="h-10 rounded flex items-center justify-center transition-colors"
                  style={{ backgroundColor: getColor(val) }}
                  title={`${loc} / ${cat}: ${val}`}
                >
                  <span
                    className={clsx(
                      'text-[11px] font-semibold',
                      val / (maxVal || 1) > 0.5 ? 'text-white' : 'text-zinc-600',
                    )}
                  >
                    {val > 0 ? val : ''}
                  </span>
                </div>
              )
            })}
          </div>
        ))}
      </div>
      {/* Color legend */}
      <div className="flex items-center gap-2 mt-3 justify-end">
        <span className="text-[10px] text-zinc-400">Dusuk</span>
        {['#f4f4f5', '#dbeafe', '#93c5fd', '#60a5fa', '#3b82f6', '#1d4ed8'].map(c => (
          <div key={c} className="w-5 h-3 rounded-sm" style={{ backgroundColor: c }} />
        ))}
        <span className="text-[10px] text-zinc-400">Yuksek</span>
      </div>
    </div>
  )
}

// -- Waterfall Chart ----------------------------------------------------------

function WaterfallChart({ distribution }: { distribution: StockLocationDist[] }) {
  if (!distribution || distribution.length === 0) {
    return <p className="text-sm text-zinc-400 text-center py-8">Veri bulunamadi</p>
  }

  // Build cumulative waterfall data
  let cumulative = 0
  const waterfallData = distribution.map(loc => {
    const start = cumulative
    cumulative += loc.totalValue
    return {
      name: loc.locationName,
      invisible: start,
      value: loc.totalValue,
      total: cumulative,
    }
  })

  // Add total bar
  waterfallData.push({
    name: 'Toplam',
    invisible: 0,
    value: cumulative,
    total: cumulative,
  })

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={waterfallData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: '#71717a' }}
          tickLine={false}
          axisLine={{ stroke: '#e4e4e7' }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#71717a' }}
          tickLine={false}
          axisLine={{ stroke: '#e4e4e7' }}
          tickFormatter={(v: number) => formatTRY(v)}
        />
        <Tooltip
          formatter={(value: number, name: string) => {
            if (name === 'invisible') return [null, null]
            return [formatTRY(value), 'Deger']
          }}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e4e4e7' }}
        />
        <Bar dataKey="invisible" stackId="stack" fill="transparent" />
        <Bar dataKey="value" stackId="stack" radius={[4, 4, 0, 0]}>
          {waterfallData.map((entry, idx) => (
            <Cell
              key={idx}
              fill={entry.name === 'Toplam' ? '#3b82f6' : COLORS[idx % COLORS.length]}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// -- Dynamic Chart Renderer ---------------------------------------------------

function DynamicChart({
  config,
  trends,
  dashboard,
  distribution,
  heatmap,
}: {
  config: DynamicChartConfig
  trends: StockTrendsData | null
  dashboard: StockDashboardSummary | null
  distribution: StockLocationDist[] | null
  heatmap: StockHeatmapCell[] | null
}) {
  const { type, dataSource } = config

  // Prepare data arrays based on source
  const categoryData = useMemo(() => {
    const src = dataSource === 'category' ? dashboard?.byCategory : trends?.byCategory
    if (!src) return []
    return Object.entries(src).map(([name, value]) => ({ name, value }))
  }, [dataSource, dashboard, trends])

  const trendData = useMemo(() => {
    if (!trends?.dailyTrend) return []
    return trends.dailyTrend.map(d => ({ name: shortDate(d.date), value: d.total }))
  }, [trends])

  const topConsumedData = useMemo(() => {
    if (!trends?.topConsumed) return []
    return trends.topConsumed.slice(0, 10).map(d => ({ name: d.name, value: d.total }))
  }, [trends])

  const locationData = useMemo(() => {
    if (!distribution) return []
    return distribution.map(d => ({ name: d.locationName, value: d.totalValue }))
  }, [distribution])

  // Pick the data based on source
  let chartData: { name: string; value: number }[] = []
  if (dataSource === 'trend') chartData = trendData
  else if (dataSource === 'category') chartData = categoryData
  else if (dataSource === 'location') chartData = locationData
  else if (dataSource === 'topConsumed') chartData = topConsumedData

  if (dataSource === 'heatmap' && type !== 'harvey') {
    return <ConsumptionHeatmap data={heatmap ?? []} />
  }

  if (type === 'harvey' && dashboard) {
    return <HarveyBall dashboard={dashboard} />
  }

  if (chartData.length === 0) {
    return <p className="text-sm text-zinc-400 text-center py-8">Veri bulunamadi</p>
  }

  // Render based on chart type
  switch (type) {
    case 'line':
      return (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#71717a' }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#71717a' }} tickLine={false} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e4e4e7' }} />
            <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )

    case 'bar':
      return (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#71717a' }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#71717a' }} tickLine={false} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e4e4e7' }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chartData.map((_, idx) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )

    case 'pie':
      return (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              nameKey="name"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {chartData.map((_, idx) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e4e4e7' }} />
          </PieChart>
        </ResponsiveContainer>
      )

    case 'waterfall': {
      let cum = 0
      const wfData = chartData.map(d => {
        const start = cum
        cum += d.value
        return { name: d.name, invisible: start, value: d.value, total: cum }
      })
      wfData.push({ name: 'Toplam', invisible: 0, value: cum, total: cum })
      return (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={wfData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#71717a' }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#71717a' }} tickLine={false} />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === 'invisible') return [null, null]
                return [value.toLocaleString('tr-TR'), 'Deger']
              }}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e4e4e7' }}
            />
            <Bar dataKey="invisible" stackId="s" fill="transparent" />
            <Bar dataKey="value" stackId="s" radius={[4, 4, 0, 0]}>
              {wfData.map((entry, idx) => (
                <Cell
                  key={idx}
                  fill={entry.name === 'Toplam' ? '#3b82f6' : COLORS[idx % COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )
    }

    default:
      return <p className="text-sm text-zinc-400 text-center py-8">Desteklenmeyen grafik tipi</p>
  }
}

// -- Add Chart Modal ----------------------------------------------------------

function AddChartModal({
  onAdd,
  onClose,
  initialType,
}: {
  onAdd: (config: Omit<DynamicChartConfig, 'id'>) => void
  onClose: () => void
  initialType?: ChartType | null
}) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<ChartType>(initialType ?? 'bar')
  const [dataSource, setDataSource] = useState<DataSource>('trend')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onAdd({ title: title.trim(), type, dataSource })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl border border-zinc-200 w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <h3 className="text-sm font-semibold text-zinc-800">Yeni Grafik Ekle</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-zinc-100 text-zinc-400">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-600 mb-1">Başlık *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              placeholder="Grafik basligi"
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-600 mb-1">Grafik Tipi *</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as ChartType)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            >
              {CHART_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-600 mb-1">Veri Kaynagi *</label>
            <select
              value={dataSource}
              onChange={e => setDataSource(e.target.value as DataSource)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            >
              {DATA_SOURCE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors"
            >
              Iptal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Ekle
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// -- Date Range Picker --------------------------------------------------------

function DateRangePicker({
  days,
  onDaysChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
}: {
  days: number
  onDaysChange: (d: number) => void
  customFrom: string
  customTo: string
  onCustomFromChange: (v: string) => void
  onCustomToChange: (v: string) => void
}) {
  const [showCustom, setShowCustom] = useState(false)
  const isCustom = !RANGE_PRESETS.some(p => p.days === days)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Calendar size={14} className="text-zinc-400" />
      <div className="flex gap-1">
        {RANGE_PRESETS.map(p => (
          <button
            key={p.days}
            onClick={() => { onDaysChange(p.days); setShowCustom(false) }}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
              days === p.days && !isCustom
                ? 'bg-zinc-900 text-white border-zinc-900'
                : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50',
            )}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setShowCustom(!showCustom)}
          className={clsx(
            'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
            showCustom || isCustom
              ? 'bg-zinc-900 text-white border-zinc-900'
              : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50',
          )}
        >
          Ozel
        </button>
      </div>
      {showCustom && (
        <div className="flex items-center gap-2 ml-2">
          <input
            type="date"
            value={customFrom}
            onChange={e => onCustomFromChange(e.target.value)}
            className="px-2 py-1.5 rounded-lg border border-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
          <span className="text-xs text-zinc-400">-</span>
          <input
            type="date"
            value={customTo}
            onChange={e => onCustomToChange(e.target.value)}
            className="px-2 py-1.5 rounded-lg border border-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
          <button
            onClick={() => {
              if (customFrom && customTo) {
                const diffMs = new Date(customTo).getTime() - new Date(customFrom).getTime()
                const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)))
                onDaysChange(diffDays)
              }
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Uygula
          </button>
        </div>
      )}
    </div>
  )
}

// -- Main Component -----------------------------------------------------------

export default function StockDashboardCharts() {
  const [days, setDays] = useState(30)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [dynamicCharts, setDynamicCharts] = useState<DynamicChartConfig[]>([])
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedAddType, setSelectedAddType] = useState<ChartType | null>(null)
  const addBtnRef = useRef<HTMLDivElement>(null)

  // Data hooks
  const { data: dashboard, loading: dashLoading } = useStockDashboard()
  const { data: trends, loading: trendsLoading } = useStockTrends(days)
  const { data: distribution, loading: distLoading } = useStockDistribution()
  const { data: heatmap, loading: heatmapLoading } = useStockHeatmap(days)

  // Close add menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (addBtnRef.current && !addBtnRef.current.contains(e.target as Node)) {
        setShowAddMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Date label helper
  const dateLabel = useMemo(() => {
    const preset = RANGE_PRESETS.find(p => p.days === days)
    return preset ? `Son ${preset.label}` : `Son ${days} gun`
  }, [days])

  // Category pie data
  const categoryPieData = useMemo(() => {
    if (!dashboard?.byCategory) return []
    return Object.entries(dashboard.byCategory).map(([name, value]) => ({ name, value }))
  }, [dashboard])

  // Top consumed bar data (horizontal)
  const topConsumedData = useMemo(() => {
    if (!trends?.topConsumed) return []
    return trends.topConsumed.slice(0, 10).map(d => ({
      name: d.name,
      miktar: d.total,
      unit: d.unit,
    }))
  }, [trends])

  // Trend line data
  const trendLineData = useMemo(() => {
    if (!trends?.dailyTrend) return []
    return trends.dailyTrend.map(d => ({
      date: shortDate(d.date),
      tuketim: d.total,
    }))
  }, [trends])

  // Dynamic chart handlers
  const handleAddChart = (config: Omit<DynamicChartConfig, 'id'>) => {
    setDynamicCharts(prev => [
      ...prev,
      { ...config, id: `dyn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` },
    ])
    setShowAddModal(false)
    setSelectedAddType(null)
  }

  const handleRemoveChart = (id: string) => {
    setDynamicCharts(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Date range picker + add chart button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DateRangePicker
          days={days}
          onDaysChange={setDays}
          customFrom={customFrom}
          customTo={customTo}
          onCustomFromChange={setCustomFrom}
          onCustomToChange={setCustomTo}
        />

        <div className="relative" ref={addBtnRef}>
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Grafik Ekle
            <ChevronDown size={14} className={clsx('transition-transform', showAddMenu && 'rotate-180')} />
          </button>

          {/* Add chart type dropdown */}
          {showAddMenu && (
            <div className="absolute right-0 top-full mt-1 bg-white rounded-xl border border-zinc-200 shadow-lg py-1 z-40 min-w-[180px]">
              {CHART_TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setSelectedAddType(opt.value)
                    setShowAddMenu(false)
                    setShowAddModal(true)
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Built-in charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 1. Consumption Trend Line Chart */}
        <ChartCard title="Tuketim Trendi" dateLabel={dateLabel} loading={trendsLoading}>
          {trendLineData.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-8">Veri bulunamadi</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendLineData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#71717a' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e4e4e7' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#71717a' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e4e4e7' }}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e4e4e7' }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="tuketim"
                  name="Tuketim"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#3b82f6' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 2. Category Distribution Pie Chart */}
        <ChartCard title="Kategori Dagilimi" loading={dashLoading}>
          {categoryPieData.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-8">Veri bulunamadi</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={categoryPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) =>
                    `${name} (${(percent * 100).toFixed(0)}%)`
                  }
                  labelLine={{ stroke: '#a1a1aa', strokeWidth: 1 }}
                >
                  {categoryPieData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e4e4e7' }}
                  formatter={(value: number) => [value.toLocaleString('tr-TR'), 'Adet']}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 3. Top 10 Consumed Items - Horizontal Bar Chart */}
        <ChartCard title="En Cok Tuketilen 10 Kalem" dateLabel={dateLabel} loading={trendsLoading}>
          {topConsumedData.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-8">Veri bulunamadi</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(280, topConsumedData.length * 36)}>
              <BarChart
                data={topConsumedData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#71717a' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e4e4e7' }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#71717a' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e4e4e7' }}
                  width={120}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e4e4e7' }}
                  formatter={(value: number, _name: string, props: any) =>
                    [`${value.toLocaleString('tr-TR')} ${props.payload.unit ?? ''}`, 'Tuketim']
                  }
                />
                <Bar dataKey="miktar" name="Miktar" radius={[0, 4, 4, 0]}>
                  {topConsumedData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 4. Location Value Waterfall Chart */}
        <ChartCard title="Lokasyon Deger Dagilimi (Selale)" loading={distLoading}>
          <WaterfallChart distribution={distribution ?? []} />
        </ChartCard>

        {/* 5. Stock Health Harvey Ball */}
        <ChartCard title="Stok Saglik Durumu" loading={dashLoading}>
          {dashboard ? (
            <HarveyBall dashboard={dashboard} />
          ) : (
            <p className="text-sm text-zinc-400 text-center py-8">Veri bulunamadi</p>
          )}
        </ChartCard>

        {/* 6. Consumption Heatmap */}
        <ChartCard title="Tuketim Isi Haritasi" dateLabel={dateLabel} loading={heatmapLoading}>
          <ConsumptionHeatmap data={heatmap ?? []} />
        </ChartCard>

        {/* Dynamic (user-added) charts */}
        {dynamicCharts.map(cfg => (
          <ChartCard
            key={cfg.id}
            title={cfg.title}
            dateLabel={dateLabel}
            loading={trendsLoading || dashLoading || distLoading || heatmapLoading}
            onRemove={() => handleRemoveChart(cfg.id)}
          >
            <DynamicChart
              config={cfg}
              trends={trends}
              dashboard={dashboard}
              distribution={distribution}
              heatmap={heatmap}
            />
          </ChartCard>
        ))}
      </div>

      {/* Add chart modal */}
      {showAddModal && (
        <AddChartModal
          onAdd={handleAddChart}
          onClose={() => { setShowAddModal(false); setSelectedAddType(null) }}
          initialType={selectedAddType}
        />
      )}
    </div>
  )
}
