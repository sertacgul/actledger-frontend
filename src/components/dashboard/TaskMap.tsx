import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import { MapPin, Clock, Flame, Cpu, AlertTriangle, TrendingDown, Loader2 } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import clsx from 'clsx'
import { api } from '../../lib/api'

// Import leaflet.heat - adds L.heatLayer
import 'leaflet.heat'

// Fix leaflet icons
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl })

// ── Types ──────────────────────────────────────────────────────────────────

interface HeatmapData {
  personnel: {
    points: [number, number, number][]
    totalLogs: number
    uniqueUsers: number
    liveCount: number
  }
  iot: {
    points: [number, number, number][]
    totalAlerts: number
    totalMaintenanceTasks: number
    totalEmergencyTasks: number
    topDevices: { name: string; location: string | null; count: number }[]
  }
  bottleneck: {
    points: [number, number, number][]
    summary: {
      totalTasks: number; overdueTasks: number; completedTasks: number; activeTasks: number
      completionRate: number; overdueRate: number; iotAlerts: number; problemDevices: number
    }
    deptBottlenecks: { id: string; name: string; color: string; total: number; overdue: number; critical: number; overdueRate: number; score: number }[]
  }
}

type Layer = 'personnel' | 'iot' | 'bottleneck'
type TimeRange = '24h' | '7d' | '30d'

const LAYER_CONFIG: Record<Layer, { label: string; icon: typeof Flame; color: string; gradient: { [key: string]: string } }> = {
  personnel:  { label: 'Personel Yogunlugu', icon: Flame,          color: '#dc2626', gradient: { '0.2': '#22c55e', '0.5': '#eab308', '0.8': '#f97316', '1.0': '#dc2626' } },
  iot:        { label: 'IoT + Ariza',        icon: Cpu,            color: '#7c3aed', gradient: { '0.2': '#a78bfa', '0.5': '#7c3aed', '0.8': '#6d28d9', '1.0': '#4c1d95' } },
  bottleneck: { label: 'Darbogazlar',        icon: AlertTriangle,  color: '#dc2626', gradient: { '0.2': '#fde047', '0.5': '#f97316', '0.8': '#dc2626', '1.0': '#991b1b' } },
}

// ── Heat layer component ───────────────────────────────────────────────────

function HeatLayer({ points, gradient }: { points: [number, number, number][]; gradient: { [key: string]: string } }) {
  const map = useMap()
  const layerRef = useRef<any>(null)

  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current)
    }

    if (points.length === 0) return

    const heat = (L as any).heatLayer(points, {
      radius: 35,
      blur: 25,
      maxZoom: 15,
      max: 1.0,
      gradient,
    })
    heat.addTo(map)
    layerRef.current = heat

    // Fit bounds
    const lats = points.map(p => p[0])
    const lngs = points.map(p => p[1])
    if (lats.length > 0) {
      const bounds = L.latLngBounds(
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)]
      )
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 })
    }

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current)
        layerRef.current = null
      }
    }
  }, [points, gradient, map])

  return null
}

// ── Component ──────────────────────────────────────────────────────────────

export default function TaskMap() {
  const [data, setData] = useState<HeatmapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeLayer, setActiveLayer] = useState<Layer>('personnel')
  const [timeRange, setTimeRange] = useState<TimeRange>('7d')

  useEffect(() => {
    setLoading(true)
    api.get<any>(`/locations/heatmap?range=${timeRange}`)
      .then(res => setData(res as HeatmapData))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [timeRange])

  const layerCfg = LAYER_CONFIG[activeLayer]
  const points = data ? (activeLayer === 'personnel' ? data.personnel.points : activeLayer === 'iot' ? data.iot.points : data.bottleneck.points) : []

  return (
    <div className="surface p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[13px] font-semibold text-zinc-900 flex items-center gap-1.5">
            <Flame size={14} className="text-red-500" />
            Saha Isi Haritasi
          </p>
          <p className="text-[11px] text-zinc-400 mt-0.5">Personel, IoT ve darbogazlarin isil analizi</p>
        </div>
        {/* Time range selector */}
        <div className="flex items-center gap-1 bg-zinc-100 rounded-lg p-0.5">
          {(['24h', '7d', '30d'] as TimeRange[]).map(r => (
            <button key={r} type="button" onClick={() => setTimeRange(r)}
              className={clsx('px-3 py-1.5 rounded-md text-[10px] font-semibold transition-all',
                timeRange === r ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700')}>
              {r === '24h' ? 'Son 24 Saat' : r === '7d' ? 'Son 7 Gun' : 'Son 30 Gun'}
            </button>
          ))}
        </div>
      </div>

      {/* Layer selector */}
      <div className="flex gap-2 mb-4">
        {(Object.entries(LAYER_CONFIG) as [Layer, typeof LAYER_CONFIG[Layer]][]).map(([key, cfg]) => (
          <button key={key} type="button" onClick={() => setActiveLayer(key)}
            className={clsx('flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold border transition-all',
              activeLayer === key
                ? 'text-white border-transparent shadow-sm'
                : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
            )}
            style={activeLayer === key ? { background: cfg.color } : undefined}>
            <cfg.icon size={13} />
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Map */}
      {loading ? (
        <div className="h-[420px] flex items-center justify-center bg-zinc-50 rounded-lg">
          <Loader2 size={24} className="text-indigo-500 animate-spin" />
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden border border-zinc-100" style={{ height: 420 }}>
          <MapContainer center={[39.0, 35.0]} zoom={6} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <HeatLayer points={points} gradient={layerCfg.gradient} />
          </MapContainer>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3">
        {activeLayer === 'personnel' && (
          <>
            <div className="flex items-center gap-1.5 text-[10px]">
              <div className="w-10 h-2 rounded-full" style={{ background: 'linear-gradient(to right, #22c55e, #eab308, #f97316, #dc2626)' }} />
              <span className="text-zinc-500">Dusuk &rarr; Yuksek yogunluk</span>
            </div>
            {data && <span className="text-[10px] text-zinc-400">{data.personnel.uniqueUsers} calisan, {data.personnel.liveCount} canli konum</span>}
          </>
        )}
        {activeLayer === 'iot' && (
          <>
            <div className="flex items-center gap-1.5 text-[10px]">
              <div className="w-10 h-2 rounded-full" style={{ background: 'linear-gradient(to right, #a78bfa, #7c3aed, #4c1d95)' }} />
              <span className="text-zinc-500">Az &rarr; Cok ariza/bakim</span>
            </div>
            {data && <span className="text-[10px] text-zinc-400">{data.iot.totalAlerts} alarm, {data.iot.totalMaintenanceTasks} bakim gorevi</span>}
          </>
        )}
        {activeLayer === 'bottleneck' && (
          <>
            <div className="flex items-center gap-1.5 text-[10px]">
              <div className="w-10 h-2 rounded-full" style={{ background: 'linear-gradient(to right, #fde047, #f97316, #dc2626, #991b1b)' }} />
              <span className="text-zinc-500">Dusuk &rarr; Kritik darbogaz</span>
            </div>
            {data && <span className="text-[10px] text-zinc-400">%{data.bottleneck.summary.overdueRate} gecikme, %{data.bottleneck.summary.completionRate} tamamlanma</span>}
          </>
        )}
      </div>

      {/* Insight panels */}
      {data && (
        <div className="mt-4 space-y-3">
          {/* Personnel insights */}
          {activeLayer === 'personnel' && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-[11px] font-bold text-amber-800 mb-1 flex items-center gap-1"><Flame size={12} /> Personel Yogunluk Analizi</p>
              <p className="text-[11px] text-amber-700">
                {data.personnel.uniqueUsers} benzersiz calisan {timeRange === '24h' ? 'son 24 saatte' : timeRange === '7d' ? 'son 7 gunde' : 'son 30 gunde'} sahada gorev yapti.
                {data.personnel.liveCount > 0 ? ` Su anda ${data.personnel.liveCount} kisi aktif konumda.` : ''}
                {data.personnel.totalLogs > 50 ? ' Yogun bolgelerde ekip dagitimi gozden gecirilmeli - bazi alanlar asiri yuk altinda olabilir.' : ''}
              </p>
            </div>
          )}

          {/* IoT insights */}
          {activeLayer === 'iot' && (
            <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
              <p className="text-[11px] font-bold text-purple-800 mb-1 flex items-center gap-1"><Cpu size={12} /> IoT + Ariza Korelasyonu</p>
              {data.iot.topDevices.length > 0 ? (
                <div className="space-y-1">
                  {data.iot.topDevices.slice(0, 5).map((d, i) => (
                    <p key={i} className="text-[11px] text-purple-700">
                      <strong>{d.name}</strong>{d.location ? ` (${d.location})` : ''}: {d.count} alarm
                      {d.count > 3 ? ' - surekli ariza, hat kontrolu gerekli' : ''}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-purple-700">Bu donemde IoT alarmi kaydedilmedi. Sistem stabil.</p>
              )}
            </div>
          )}

          {/* Bottleneck insights */}
          {activeLayer === 'bottleneck' && data.bottleneck.deptBottlenecks.length > 0 && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-[11px] font-bold text-red-800 mb-2 flex items-center gap-1"><TrendingDown size={12} /> Darbogaz Tespiti</p>
              <div className="space-y-1.5">
                {data.bottleneck.deptBottlenecks.slice(0, 5).map(d => (
                  <div key={d.id} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-[11px] text-red-800 font-medium flex-1">{d.name}</span>
                    <span className="text-[10px] text-red-600">{d.total} gorev, %{d.overdueRate} gecikme, {d.critical} kritik</span>
                    <div className="w-16 h-1.5 rounded-full bg-red-200 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(d.score, 100)}%`, background: d.score > 60 ? '#dc2626' : d.score > 30 ? '#f97316' : '#eab308' }} />
                    </div>
                  </div>
                ))}
              </div>
              {data.bottleneck.summary.problemDevices > 0 && (
                <p className="text-[10px] text-red-600 mt-2 border-t border-red-200 pt-2">
                  {data.bottleneck.summary.problemDevices} IoT cihaz sorunlu + %{data.bottleneck.summary.overdueRate} gorev gecikme = operasyonel darbogaz riski
                </p>
              )}
            </div>
          )}

          {/* Summary KPIs */}
          {activeLayer === 'bottleneck' && (
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Toplam Gorev', value: data.bottleneck.summary.totalTasks, color: 'text-zinc-700' },
                { label: 'Tamamlanma', value: `%${data.bottleneck.summary.completionRate}`, color: 'text-green-600' },
                { label: 'Gecikme', value: `%${data.bottleneck.summary.overdueRate}`, color: data.bottleneck.summary.overdueRate > 20 ? 'text-red-600' : 'text-amber-600' },
                { label: 'IoT Alarm', value: data.bottleneck.summary.iotAlerts, color: data.bottleneck.summary.iotAlerts > 0 ? 'text-purple-600' : 'text-zinc-500' },
              ].map(k => (
                <div key={k.label} className="text-center p-2 rounded-lg bg-zinc-50">
                  <p className={clsx('text-lg font-bold', k.color)}>{k.value}</p>
                  <p className="text-[9px] text-zinc-400">{k.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
