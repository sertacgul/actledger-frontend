import { useState, useEffect, useCallback } from 'react'
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  MapPin, Users, Building2, Plus, Trash2, RefreshCw, AlertTriangle,
  Navigation, Clock, X, Loader2, Target, Crosshair, Send,
  User, Truck, Wrench,
} from 'lucide-react'
import clsx from 'clsx'
import { api } from '../lib/api'
import { useDepartments } from '../lib/hooks'
import { useLanguage } from '../context/LanguageContext'
import DraggableModal from '../components/ui/DraggableModal'
import FacilityMap from './FacilityMap'

// Fix leaflet icons
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl })

// ── Types ──────────────────────────────────────────────────────────────────

interface ActiveTask { id: string; title: string; type: string; priority: string }

interface LiveUser {
  id: string
  name: string
  role: string
  jobTitle: string | null
  liveLatitude: number
  liveLongitude: number
  locationUpdatedAt: string
  activeTrackingTaskId: string | null
  isMobileUser: boolean
  departments: { id: string; name: string; color: string }[]
  assignedTasks: ActiveTask[]
}

interface NearbyUser extends LiveUser {
  distanceKm: number
}

interface Facility {
  id: string; name: string; type: string; address: string | null
  latitude: number; longitude: number; color: string; description: string | null
}

const FACILITY_TYPES = [
  { value: 'fabrika', label: 'Fabrika', icon: '🏭' },
  { value: 'merkez_ofis', label: 'Merkez Ofis', icon: '🏢' },
  { value: 'depo', label: 'Depo', icon: '📦' },
  { value: 'saha', label: 'Saha/Santiye', icon: '🏗️' },
  { value: 'sube', label: 'Sube', icon: '🏬' },
  { value: 'diger', label: 'Diger', icon: '📍' },
]

const PRIORITY_COLORS: Record<string, string> = {
  KRITIK: '#dc2626', YUKSEK: '#f97316', NORMAL: '#2563eb', DUSUK: '#22c55e',
}

// ── Helpers ────────────────────────────────────────────────────────────────

function parseDMS(input: string): { lat: number; lng: number } | null {
  const re = /(\d+)[°N]?\s*(\d+)['\u2032]?\s*([\d.]+)["\u2033]?\s*([NSEW])?/gi
  const matches = [...input.matchAll(re)]
  if (matches.length < 2) return null
  const parse = (m: RegExpMatchArray) => {
    let val = parseFloat(m[1]) + parseFloat(m[2]) / 60 + parseFloat(m[3]) / 3600
    if ((m[4] ?? '').toUpperCase() === 'S' || (m[4] ?? '').toUpperCase() === 'W') val = -val
    return val
  }
  const lat = parse(matches[0]), lng = parse(matches[1])
  return isNaN(lat) || isNaN(lng) ? null : { lat, lng }
}

function timeAgo(d: string) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (diff < 1) return 'Az once'
  if (diff < 60) return `${diff} dk`
  if (diff < 1440) return `${Math.floor(diff / 60)} sa`
  return `${Math.floor(diff / 1440)} gun`
}

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  useEffect(() => { map.setView(center, zoom) }, [center, zoom, map])
  return null
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) { onMapClick(e.latlng.lat, e.latlng.lng) },
  })
  return null
}

function createFacilityIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;border-radius:6px;background:${color};border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    </div>`,
    iconSize: [28, 28], iconAnchor: [14, 14],
  })
}

// ── Component ──────────────────────────────────────────────────────────────

export default function LiveMap() {
  const { lang } = useLanguage()
  const { departments } = useDepartments()
  const [activeTab, setActiveTab] = useState<'outdoor' | 'indoor'>('outdoor')

  const [liveUsers, setLiveUsers] = useState<LiveUser[]>([])
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [mapEntities, setMapEntities] = useState<{ personnel: any[]; vehicle: any[]; equipment: any[] }>({ personnel: [], vehicle: [], equipment: [] })
  const [loading, setLoading] = useState(true)
  const [filterDept, setFilterDept] = useState<string>('tumu')
  const [showFacilities, setShowFacilities] = useState(true)
  const [showPersonnel, setShowPersonnel] = useState(true)
  const [showVehicles, setShowVehicles] = useState(true)
  const [showEquipment, setShowEquipment] = useState(true)
  const [showCreateFacility, setShowCreateFacility] = useState(false)
  const [showAddPersonnel, setShowAddPersonnel] = useState(false)
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [showAddEquipment, setShowAddEquipment] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [dmsInput, setDmsInput] = useState('')
  const [dmsResult, setDmsResult] = useState<{ lat: number; lng: number } | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>([39.0, 35.0])
  const [mapZoom, setMapZoom] = useState(6)

  // Map click mode: null = normal, 'nearby' | 'personnel' | 'vehicle' | 'equipment' | 'facility'
  const [mapClickMode, setMapClickMode] = useState<string | null>(null)
  const [clickedPoint, setClickedPoint] = useState<{ lat: number; lng: number } | null>(null)

  // Nearby search
  const [nearbyMode, setNearbyMode] = useState(false)
  const [nearbyPoint, setNearbyPoint] = useState<{ lat: number; lng: number } | null>(null)
  const [nearbyResults, setNearbyResults] = useState<NearbyUser[]>([])
  const [nearbyLoading, setNearbyLoading] = useState(false)

  // Assign task modal
  const [assignTarget, setAssignTarget] = useState<NearbyUser | null>(null)
  const [assignForm, setAssignForm] = useState({ title: '', description: '', priority: 'YUKSEK' })
  const [assigning, setAssigning] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const deptParam = filterDept !== 'tumu' ? `?departmentId=${filterDept}` : ''
      const [usersRes, facsRes, persRes, vehRes, eqRes] = await Promise.all([
        api.get<any>(`/locations/live${deptParam}`),
        api.get<any>('/locations/facilities'),
        api.get<any>('/map?type=personnel').catch(() => ({ data: [] })),
        api.get<any>('/map?type=vehicle').catch(() => ({ data: [] })),
        api.get<any>('/map?type=equipment').catch(() => ({ data: [] })),
      ])
      setLiveUsers(Array.isArray(usersRes) ? usersRes : usersRes?.data ?? [])
      setFacilities(Array.isArray(facsRes) ? facsRes : facsRes?.data ?? [])
      const toArr = (r: any) => Array.isArray(r) ? r : r?.data ?? []
      setMapEntities({ personnel: toArr(persRes), vehicle: toArr(vehRes), equipment: toArr(eqRes) })
    } catch {}
    setLoading(false)
  }, [filterDept])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => { const iv = setInterval(loadData, 30000); return () => clearInterval(iv) }, [loadData])

  const handleRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false) }

  // ── DMS parse ──────────────────────────────────────────────────────────

  const handleDMSParse = () => {
    // Try DMS first, then decimal
    let result = parseDMS(dmsInput)
    if (!result) {
      const parts = dmsInput.split(/[,\s]+/).map(Number)
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) result = { lat: parts[0], lng: parts[1] }
    }
    if (result) { setDmsResult(result); setMapCenter([result.lat, result.lng]); setMapZoom(15) }
  }

  // ── Nearby search ──────────────────────────────────────────────────────

  const handleNearbySearch = async (lat: number, lng: number) => {
    setNearbyPoint({ lat, lng })
    setNearbyLoading(true)
    try {
      const res = await api.get<any>(`/locations/nearby?latitude=${lat}&longitude=${lng}&radiusKm=10`)
      setNearbyResults(Array.isArray(res) ? res : res?.data ?? [])
    } catch { setNearbyResults([]) }
    setNearbyLoading(false)
  }

  const activateNearbyMode = () => {
    setNearbyMode(true)
    setMapClickMode('nearby')
    // Use center of current map view or DMS result
    if (dmsResult) {
      handleNearbySearch(dmsResult.lat, dmsResult.lng)
    }
  }

  const handleMapClick = (lat: number, lng: number) => {
    const point = { lat, lng }
    setClickedPoint(point)

    if (mapClickMode === 'nearby') {
      handleNearbySearch(lat, lng)
    } else if (mapClickMode === 'personnel') {
      setShowAddPersonnel(true)
      setMapClickMode(null)
    } else if (mapClickMode === 'vehicle') {
      setShowAddVehicle(true)
      setMapClickMode(null)
    } else if (mapClickMode === 'equipment') {
      setShowAddEquipment(true)
      setMapClickMode(null)
    } else if (mapClickMode === 'facility') {
      setShowCreateFacility(true)
      setMapClickMode(null)
    }
  }

  // ── Assign task to nearest person ──────────────────────────────────────

  const handleAssignTask = async () => {
    if (!assignTarget || !assignForm.title) return
    setAssigning(true)
    try {
      // Use target's department, or fetch first available
      let deptId = assignTarget.departments[0]?.id
      if (!deptId && departments.length > 0) deptId = departments[0].id
      if (!deptId) { setAssigning(false); return }

      await api.post('/tasks', {
        title: assignForm.title,
        description: assignForm.description || `Acil mudahale gorevi.${assignTarget.distanceKm != null ? ` En yakin personele atandi (${assignTarget.distanceKm.toFixed(1)} km).` : ''}`,
        priority: assignForm.priority,
        type: 'ACIL',
        assigneeId: assignTarget.id,
        departmentId: deptId,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        checklist: [],
        tags: ['acil', 'harita-atama'],
        latitude: assignTarget.liveLatitude ?? null,
        longitude: assignTarget.liveLongitude ?? null,
      })
      setAssignTarget(null)
      setAssignForm({ title: '', description: '', priority: 'YUKSEK' })
      loadData()
    } catch (e: any) {
      alert(e.message ?? 'Gorev atanamadi')
    }
    setAssigning(false)
  }

  const handleDeleteFacility = async (id: string) => {
    if (!confirm('Bu tesisi silmek istediginize emin misiniz?')) return
    try { await api.delete(`/locations/facilities/${id}`); setFacilities(prev => prev.filter(f => f.id !== id)) } catch {}
  }

  const handleDeleteEntity = async (id: string, type: string) => {
    if (!confirm('Bu kaydi silmek istediginize emin misiniz?')) return
    try { await api.delete(`/map/${id}`); loadData() } catch {}
  }

  const handleEditEntity = async (id: string, field: string, currentValue: string) => {
    const newValue = prompt(`Yeni deger (${field}):`, currentValue)
    if (!newValue || newValue === currentValue) return
    try { await api.patch(`/map/${id}`, { [field]: newValue }); loadData() } catch {}
  }

  return (
    <div className="space-y-4">
      <style>{`
        @keyframes onlinePulse { 0%, 100% { filter: drop-shadow(0 0 0 rgba(34,197,94,0.6)); } 50% { filter: drop-shadow(0 0 6px rgba(34,197,94,0.8)); } }
        .online-signal { animation: onlinePulse 1.5s ease-in-out infinite; }
      `}</style>
      {/* Page title + Tab switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
            <MapPin size={20} className="text-cyan-600" />
            {lang === 'tr' ? 'Canlı Operasyon & Tesis Haritalari' : 'Live Operations & Facility Maps'}
          </h2>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setActiveTab('outdoor')}
            className={clsx('flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold transition-all', activeTab === 'outdoor' ? 'bg-cyan-50 text-cyan-700 border-2 border-cyan-200' : 'bg-white border-2 border-zinc-200 text-zinc-600 hover:border-zinc-300')}>
            <MapPin size={16} /> {lang === 'tr' ? 'Canlı Harita' : 'Live Map'}
          </button>
          <button type="button" onClick={() => setActiveTab('indoor')}
            className={clsx('flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold transition-all', activeTab === 'indoor' ? 'bg-violet-50 text-violet-700 border-2 border-violet-200' : 'bg-white border-2 border-zinc-200 text-zinc-600 hover:border-zinc-300')}>
            <Building2 size={16} /> {lang === 'tr' ? 'Tesis Haritasi' : 'Facility Map'}
          </button>
        </div>
      </div>

      {/* Indoor tab - FacilityMap */}
      {activeTab === 'indoor' && <FacilityMap />}

      {/* Outdoor tab - existing LiveMap content */}
      {activeTab === 'outdoor' && <>
      {/* Controls */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-indigo-500" />
          <h2 className="text-sm font-bold text-slate-900">{lang === 'tr' ? 'Canlı Konum Takibi' : 'Live Location Tracking'}</h2>
        </div>
        <select className="select w-44 text-xs" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
          <option value="tumu">Tum Departmanlar</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <input type="checkbox" checked={showFacilities} onChange={e => setShowFacilities(e.target.checked)} className="accent-indigo-600" />
          <Building2 size={12} /> Tesisler ({facilities.length})
        </label>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <input type="checkbox" checked={showPersonnel} onChange={e => setShowPersonnel(e.target.checked)} className="accent-blue-600" />
          <User size={12} /> Personel ({mapEntities.personnel.length + liveUsers.length})
        </label>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <input type="checkbox" checked={showVehicles} onChange={e => setShowVehicles(e.target.checked)} className="accent-green-600" />
          <Truck size={12} /> Araclar ({mapEntities.vehicle.length})
        </label>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <input type="checkbox" checked={showEquipment} onChange={e => setShowEquipment(e.target.checked)} className="accent-amber-600" />
          <Wrench size={12} /> Ekipmanlar ({mapEntities.equipment.length})
        </label>

        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={activateNearbyMode}
            className={clsx('btn-secondary text-xs', mapClickMode === 'nearby' && 'ring-2 ring-red-300 bg-red-50 text-red-700')}>
            <Crosshair size={12} /> En Yakin Personel
          </button>
          <button type="button" onClick={handleRefresh} disabled={refreshing} className="btn-secondary text-xs">
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /> Yenile
          </button>
          <button type="button" onClick={() => setMapClickMode(mapClickMode === 'personnel' ? null : 'personnel')}
            className={clsx('btn-secondary text-xs', mapClickMode === 'personnel' && 'ring-2 ring-blue-300 bg-blue-50 text-blue-700')}>
            <User size={12} /> {mapClickMode === 'personnel' ? 'Haritadan Sec...' : 'Personel Ekle'}
          </button>
          <button type="button" onClick={() => setMapClickMode(mapClickMode === 'vehicle' ? null : 'vehicle')}
            className={clsx('btn-secondary text-xs', mapClickMode === 'vehicle' && 'ring-2 ring-green-300 bg-green-50 text-green-700')}>
            <Truck size={12} /> {mapClickMode === 'vehicle' ? 'Haritadan Sec...' : 'Arac Ekle'}
          </button>
          <button type="button" onClick={() => setMapClickMode(mapClickMode === 'equipment' ? null : 'equipment')}
            className={clsx('btn-secondary text-xs', mapClickMode === 'equipment' && 'ring-2 ring-amber-300 bg-amber-50 text-amber-700')}>
            <Wrench size={12} /> {mapClickMode === 'equipment' ? 'Haritadan Sec...' : 'Ekipman Ekle'}
          </button>
          <button type="button" onClick={() => setMapClickMode(mapClickMode === 'facility' ? null : 'facility')}
            className={clsx('btn-primary text-xs', mapClickMode === 'facility' && 'ring-2 ring-indigo-300')}>
            <Plus size={12} /> {mapClickMode === 'facility' ? 'Haritadan Sec...' : 'Tesis Ekle'}
          </button>
          {mapClickMode && (
            <button type="button" onClick={() => { setMapClickMode(null); setClickedPoint(null) }} className="btn-secondary text-xs text-red-600">
              <X size={12} /> Iptal
            </button>
          )}
        </div>
      </div>

      {/* DMS input */}
      <div className="card p-3">
        <div className="flex items-center gap-2">
          <Target size={14} className="text-slate-500" />
          <input className="input flex-1 text-xs font-mono"
            placeholder="Koordinat: 42N14'3 26E24'6 veya 39.9208, 32.8541"
            value={dmsInput} onChange={e => setDmsInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleDMSParse()} />
          <button type="button" onClick={handleDMSParse} className="btn-secondary text-xs"><Navigation size={12} /> Git</button>
          {nearbyMode && dmsResult && (
            <button type="button" onClick={() => handleNearbySearch(dmsResult.lat, dmsResult.lng)}
              className="btn-primary text-xs"><Crosshair size={12} /> Bu Noktada Ara</button>
          )}
        </div>
      </div>

      {/* Nearby results panel */}
      {nearbyMode && nearbyResults.length > 0 && (
        <div className="card p-4 border-l-4 border-red-400">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-red-700 flex items-center gap-1.5">
              <Crosshair size={13} /> Yakin Personel ({nearbyResults.length} kisi, 10km içinde)
            </p>
            <button type="button" onClick={() => { setNearbyMode(false); setNearbyResults([]) }} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
          </div>
          <div className="space-y-2">
            {nearbyResults.map(u => {
              const task = u.assignedTasks[0]
              return (
                <div key={u.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white border border-slate-200">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800">
                      {task?.title ?? 'Gorevde'} <span className="text-slate-400 font-normal">- {u.jobTitle ?? u.role}</span>
                    </p>
                    <p className="text-[10px] text-slate-500">{u.departments[0]?.name ?? '-'} - {u.distanceKm.toFixed(1)} km</p>
                  </div>
                  {task && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: PRIORITY_COLORS[task.priority] ?? '#64748b' }}>
                      {task.priority}
                    </span>
                  )}
                  <button type="button" onClick={() => { setAssignTarget(u); setMapCenter([u.liveLatitude, u.liveLongitude]); setMapZoom(15) }}
                    className="text-[10px] font-semibold text-cyan-600 hover:text-cyan-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-cyan-50">
                    <Send size={10} /> Gorev Ata
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Map */}
      <div className="card" style={{ height: 520, position: 'relative', zIndex: 1 }}>
        {loading ? (
          <div className="h-full flex items-center justify-center"><Loader2 size={24} className="text-indigo-500 animate-spin" /></div>
        ) : (
          <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
            <MapController center={mapCenter} zoom={mapZoom} />
            <MapClickHandler onMapClick={handleMapClick} />
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {/* Personnel: live (online) markers — always green */}
            {showPersonnel && liveUsers.map(u => {
              const task = u.assignedTasks[0]
              return (
                <CircleMarker key={u.id} center={[u.liveLatitude, u.liveLongitude]} radius={9}
                  pathOptions={{ fillColor: '#22c55e', fillOpacity: 0.85, color: '#ffffff', weight: 2, className: 'online-signal' }}>
                  <Popup>
                    <div className="text-xs min-w-[200px]">
                      <p className="font-bold text-sm text-slate-800 mb-1">{task?.title ?? 'Aktif Gorev'}</p>
                      {task && (
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white" style={{ background: PRIORITY_COLORS[task.priority] ?? '#2563eb' }}>{task.priority}</span>
                          <span className="text-slate-500 capitalize">{task.type.toLowerCase()}</span>
                        </div>
                      )}
                      <div className="border-t border-slate-100 pt-1.5 mt-1.5">
                        <p className="text-slate-500">{u.jobTitle ?? u.role}</p>
                        <p className="text-slate-500">{u.departments[0]?.name ?? '-'}</p>
                        <p className="text-slate-400 flex items-center gap-1 mt-1"><Clock size={10} /> {timeAgo(u.locationUpdatedAt)}</p>
                      </div>
                      <button type="button" onClick={() => setAssignTarget(u as any)}
                        className="mt-2 w-full text-center text-[10px] font-bold text-white bg-cyan-600 hover:bg-cyan-700 rounded py-1.5 flex items-center justify-center gap-1">
                        <Send size={10} /> Yeni Gorev Ata
                      </button>
                    </div>
                  </Popup>
                </CircleMarker>
              )
            })}

            {/* Personnel: static (offline) map entities — grey */}
            {showPersonnel && mapEntities.personnel.map(e => (
              <CircleMarker key={`p-${e.id}`} center={[e.latitude, e.longitude]} radius={7}
                pathOptions={{ fillColor: '#94a3b8', fillOpacity: 0.75, color: '#ffffff', weight: 2 }}>
                <Popup>
                  <div className="text-xs min-w-[160px]">
                    <p className="font-bold text-sm text-slate-800">{e.name}</p>
                    {e.metadata?.role && <p className="text-slate-500">{e.metadata.role}</p>}
                    {e.metadata?.phone && <p className="text-slate-400">{e.metadata.phone}</p>}
                    <p className="text-[10px] text-slate-400 font-mono mt-1">{e.latitude.toFixed(4)}, {e.longitude.toFixed(4)}</p>
                    <div className="flex gap-2 mt-1.5 pt-1.5 border-t border-slate-100">
                      <button type="button" onClick={() => handleEditEntity(e.id, 'name', e.name)} className="text-blue-500 text-[10px] font-semibold hover:underline">Duzenle</button>
                      <button type="button" onClick={() => handleDeleteEntity(e.id, 'personnel')} className="text-red-500 text-[10px] font-semibold hover:underline">Sil</button>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

            {/* Vehicle markers */}
            {showVehicles && mapEntities.vehicle.map(e => (
              <Marker key={`v-${e.id}`} position={[e.latitude, e.longitude]}
                icon={L.divIcon({
                  className: '',
                  html: `<div style="width:30px;height:30px;border-radius:8px;background:#16a34a;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                  </div>`,
                  iconSize: [30, 30], iconAnchor: [15, 15],
                })}>
                <Popup>
                  <div className="text-xs min-w-[160px]">
                    <p className="font-bold text-sm text-slate-800">{e.name}</p>
                    {e.metadata?.vehicleType && <p className="text-slate-500">{e.metadata.vehicleType}</p>}
                    {e.metadata?.driver && <p className="text-slate-400">Sofor: {e.metadata.driver}</p>}
                    <p className="text-[10px] text-slate-400 font-mono mt-1">{e.latitude.toFixed(4)}, {e.longitude.toFixed(4)}</p>
                    <div className="flex gap-2 mt-1.5 pt-1.5 border-t border-slate-100">
                      <button type="button" onClick={() => handleEditEntity(e.id, 'name', e.name)} className="text-blue-500 text-[10px] font-semibold hover:underline">Duzenle</button>
                      <button type="button" onClick={() => handleDeleteEntity(e.id, 'vehicle')} className="text-red-500 text-[10px] font-semibold hover:underline">Sil</button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Equipment markers */}
            {showEquipment && mapEntities.equipment.map(e => (
              <Marker key={`e-${e.id}`} position={[e.latitude, e.longitude]}
                icon={L.divIcon({
                  className: '',
                  html: `<div style="width:26px;height:26px;border-radius:6px;background:#d97706;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
                  </div>`,
                  iconSize: [26, 26], iconAnchor: [13, 13],
                })}>
                <Popup>
                  <div className="text-xs min-w-[160px]">
                    <p className="font-bold text-sm text-slate-800">{e.name}</p>
                    {e.metadata?.equipmentType && <p className="text-slate-500">{e.metadata.equipmentType}</p>}
                    {e.metadata?.serial && <p className="text-slate-400">SN: {e.metadata.serial}</p>}
                    <p className="text-[10px] text-slate-400 font-mono mt-1">{e.latitude.toFixed(4)}, {e.longitude.toFixed(4)}</p>
                    <div className="flex gap-2 mt-1.5 pt-1.5 border-t border-slate-100">
                      <button type="button" onClick={() => handleEditEntity(e.id, 'name', e.name)} className="text-blue-500 text-[10px] font-semibold hover:underline">Duzenle</button>
                      <button type="button" onClick={() => handleDeleteEntity(e.id, 'equipment')} className="text-red-500 text-[10px] font-semibold hover:underline">Sil</button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Facility markers */}
            {showFacilities && facilities.map(f => (
              <Marker key={f.id} position={[f.latitude, f.longitude]} icon={createFacilityIcon(f.color)}>
                <Popup>
                  <div className="text-xs min-w-[180px]">
                    <p className="font-bold text-sm text-slate-800">{f.name}</p>
                    <p className="text-slate-500 capitalize">{FACILITY_TYPES.find(t => t.value === f.type)?.label ?? f.type}</p>
                    {f.address && <p className="text-slate-500 mt-0.5">{f.address}</p>}
                    <p className="text-[10px] text-slate-400 font-mono mt-1">{f.latitude.toFixed(4)}, {f.longitude.toFixed(4)}</p>
                    <div className="flex gap-2 mt-1.5 pt-1.5 border-t border-slate-100">
                      <button type="button" onClick={() => { const n = prompt('Yeni tesis adi:', f.name); if (n && n !== f.name) api.patch(`/locations/facilities/${f.id}`, { name: n }).then(() => loadData()).catch(() => {}) }}
                        className="text-blue-500 text-[10px] font-semibold hover:underline">Duzenle</button>
                      <button type="button" onClick={() => handleDeleteFacility(f.id)}
                        className="text-red-500 text-[10px] font-semibold hover:underline">Sil</button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Nearby search point */}
            {nearbyPoint && (
              <CircleMarker center={[nearbyPoint.lat, nearbyPoint.lng]} radius={12}
                pathOptions={{ fillColor: '#dc2626', fillOpacity: 0.3, color: '#dc2626', weight: 2, dashArray: '5,5' }}>
                <Popup><p className="text-xs font-bold text-red-700">Arama Noktasi</p></Popup>
              </CircleMarker>
            )}

            {/* DMS target */}
            {dmsResult && !nearbyPoint && (
              <CircleMarker center={[dmsResult.lat, dmsResult.lng]} radius={10}
                pathOptions={{ fillColor: '#dc2626', fillOpacity: 0.8, color: '#ffffff', weight: 3 }}>
                <Popup><p className="text-xs font-mono">{dmsResult.lat.toFixed(6)}, {dmsResult.lng.toFixed(6)}</p></Popup>
              </CircleMarker>
            )}
          </MapContainer>
        )}
      </div>

      {/* Active task-tracking personnel list */}
      {liveUsers.length > 0 && (
        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
            <Users size={13} /> Gorevde Aktif Personel ({liveUsers.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {liveUsers.map(u => {
              const task = u.assignedTasks[0]
              return (
                <div key={u.id} className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100">
                  <button type="button" onClick={() => { setMapCenter([u.liveLatitude, u.liveLongitude]); setMapZoom(16) }}
                    className="flex items-center gap-2.5 flex-1 min-w-0 text-left">
                    <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ background: '#22c55e' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-slate-800 truncate">{task?.title ?? 'Aktif Gorev'}</p>
                      <p className="text-[10px] text-slate-500 truncate">{u.jobTitle ?? u.role} - {u.departments[0]?.name ?? '-'}</p>
                    </div>
                    <span className="text-[9px] text-green-600 font-mono flex-shrink-0">{timeAgo(u.locationUpdatedAt)}</span>
                  </button>
                  <button type="button" onClick={() => setAssignTarget(u as any)}
                    className="text-[9px] font-semibold text-cyan-600 hover:text-cyan-800 px-2 py-1.5 rounded hover:bg-cyan-50 flex items-center gap-1 flex-shrink-0">
                    <Send size={9} /> Ata
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Assign Task Modal - fixed overlay above everything */}
      {assignTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                  <AlertTriangle size={16} className="text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Acil Gorev Ata</p>
                  <p className="text-[10px] text-slate-500">Gorev ACIL olarak oluşturulacak</p>
                </div>
              </div>
              <button type="button" onClick={() => setAssignTarget(null)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X size={16} className="text-slate-400" />
              </button>
            </div>
            <div className="px-5 pb-5 space-y-3">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Atanacak Personel</p>
                <p className="text-sm font-bold text-slate-800">{assignTarget.name}</p>
                <p className="text-xs text-slate-500">
                  {assignTarget.departments[0]?.name ?? '-'}
                  {assignTarget.distanceKm != null ? ` - ${assignTarget.distanceKm.toFixed(1)} km` : ''}
                </p>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Gorev Basligi *</label>
                <input className="input" placeholder="Acil mudahale - Makine 3 ariza" value={assignForm.title}
                  onChange={e => setAssignForm({ ...assignForm, title: e.target.value })}
                  autoFocus />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Aciklama</label>
                <textarea className="input resize-none" rows={2} placeholder="Detaylar..." value={assignForm.description}
                  onChange={e => setAssignForm({ ...assignForm, description: e.target.value })} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Oncelik</label>
                <select className="select" value={assignForm.priority} onChange={e => setAssignForm({ ...assignForm, priority: e.target.value })}>
                  <option value="KRITIK">Kritik</option>
                  <option value="YUKSEK">Yuksek</option>
                  <option value="NORMAL">Normal</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setAssignTarget(null)} className="btn-secondary flex-1 justify-center">Iptal</button>
                <button type="button" onClick={handleAssignTask} disabled={assigning || !assignForm.title}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 transition-colors">
                  {assigning ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Gorevi Ata
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Facility Modal */}
      {showCreateFacility && (
        <CreateFacilityModal lang={lang} onClose={() => setShowCreateFacility(false)} onCreated={() => { setShowCreateFacility(false); loadData() }} />
      )}

      {showAddPersonnel && (
        <AddMapEntityModal
          title="Personel Ekle"
          icon={<User size={13} />}
          defaultCoords={clickedPoint}
          fields={[
            { key: 'name', label: 'Ad Soyad *', placeholder: 'Ahmet Yilmaz' },
            { key: 'role', label: 'Gorev / Pozisyon', placeholder: 'Teknisyen' },
            { key: 'phone', label: 'Telefon', placeholder: '0532 xxx xx xx' },
          ]}
          onClose={() => { setShowAddPersonnel(false); setClickedPoint(null) }}
          onSave={async (data) => {
            const lat = parseFloat(data.latitude), lng = parseFloat(data.longitude)
            if (!data.name || isNaN(lat) || isNaN(lng)) throw new Error('Ad ve koordinat zorunlu')
            await api.post('/map', { type: 'personnel', name: data.name, role: data.role, phone: data.phone, latitude: lat, longitude: lng })
            loadData()
          }}
        />
      )}

      {showAddVehicle && (
        <AddMapEntityModal
          title="Arac Ekle"
          icon={<Truck size={13} />}
          defaultCoords={clickedPoint}
          fields={[
            { key: 'name', label: 'Arac Adi / Plaka *', placeholder: '34 ABC 123' },
            { key: 'vehicleType', label: 'Arac Tipi', placeholder: 'Kamyon, Binek, Pikap...' },
            { key: 'driver', label: 'Sofor', placeholder: 'Mehmet Demir' },
          ]}
          onClose={() => { setShowAddVehicle(false); setClickedPoint(null) }}
          onSave={async (data) => {
            const lat = parseFloat(data.latitude), lng = parseFloat(data.longitude)
            if (!data.name || isNaN(lat) || isNaN(lng)) throw new Error('Araç adı ve koordinat zorunlu')
            await api.post('/map', { type: 'vehicle', name: data.name, vehicleType: data.vehicleType, driver: data.driver, latitude: lat, longitude: lng })
            loadData()
          }}
        />
      )}

      {showAddEquipment && (
        <AddMapEntityModal
          title="Ekipman Ekle"
          icon={<Wrench size={13} />}
          defaultCoords={clickedPoint}
          fields={[
            { key: 'name', label: 'Ekipman Adi *', placeholder: 'Jenerator #3' },
            { key: 'equipmentType', label: 'Tip', placeholder: 'Jenerator, Valf, Pompa...' },
            { key: 'serial', label: 'Seri No', placeholder: 'SN-2024-001' },
          ]}
          onClose={() => { setShowAddEquipment(false); setClickedPoint(null) }}
          onSave={async (data) => {
            const lat = parseFloat(data.latitude), lng = parseFloat(data.longitude)
            if (!data.name || isNaN(lat) || isNaN(lng)) throw new Error('Ekipman adı ve koordinat zorunlu')
            await api.post('/map', { type: 'equipment', name: data.name, equipmentType: data.equipmentType, serial: data.serial, latitude: lat, longitude: lng })
            loadData()
          }}
        />
      )}
      </>}
    </div>
  )
}

// ── Create Facility Modal ──────────────────────────────────────────────────

function CreateFacilityModal({ lang, onClose, onCreated }: { lang: string; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', type: 'fabrika', latitude: '', longitude: '', address: '', color: '#6366f1', description: '' })
  const [dmsCoord, setDmsCoord] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const handleDMSFill = () => {
    const result = parseDMS(dmsCoord)
    if (result) setForm(prev => ({ ...prev, latitude: result.lat.toString(), longitude: result.lng.toString() }))
    else setErr('Gecersiz koordinat formati')
  }

  const handleSubmit = async () => {
    const lat = parseFloat(form.latitude), lng = parseFloat(form.longitude)
    if (!form.name || isNaN(lat) || isNaN(lng)) { setErr('Ad ve koordinat zorunlu'); return }
    setSaving(true); setErr(null)
    try {
      await api.post('/locations/facilities', { name: form.name, type: form.type, latitude: lat, longitude: lng, address: form.address || undefined, color: form.color, description: form.description || undefined })
      onCreated()
    } catch (e: any) { setErr(e.message ?? 'Hata') } finally { setSaving(false) }
  }

  return (
    <DraggableModal title="Yeni Tesis Ekle" icon={<Building2 size={13} />} onClose={onClose} width={480}
      footer={<>
        <button type="button" onClick={onClose} className="btn-secondary">Iptal</button>
        <button type="button" onClick={handleSubmit} disabled={saving} className="btn-primary">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Ekle
        </button>
      </>}>
      <div className="p-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-2)' }}>Tesis Adi *</label>
            <input className="input" placeholder="Merkez Fabrika" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-2)' }}>Tip</label>
            <select className="select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              {FACILITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-2)' }}>DMS Koordinat</label>
          <div className="flex gap-2">
            <input className="input flex-1 font-mono text-xs" placeholder="42N14'3 26E24'6" value={dmsCoord} onChange={e => setDmsCoord(e.target.value)} />
            <button type="button" onClick={handleDMSFill} className="btn-secondary text-xs">Donustur</button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-2)' }}>Enlem *</label>
            <input className="input font-mono" type="number" step="any" placeholder="39.9208" value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-2)' }}>Boylam *</label>
            <input className="input font-mono" type="number" step="any" placeholder="32.8541" value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div className="col-span-3">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-2)' }}>Adres</label>
            <input className="input" placeholder="Istanbul, Tuzla OSB" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-2)' }}>Renk</label>
            <input type="color" className="w-full h-[38px] rounded border cursor-pointer" style={{ borderColor: 'var(--border)' }} value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} />
          </div>
        </div>
        {err && <p className="text-[11px] text-red-500 flex items-center gap-1"><AlertTriangle size={11} /> {err}</p>}
      </div>
    </DraggableModal>
  )
}

// ── Generic Add Map Entity Modal ──────────────────────────────────────────

function AddMapEntityModal({
  title, icon, fields, onClose, onSave, defaultCoords,
}: {
  title: string
  icon: React.ReactNode
  fields: { key: string; label: string; placeholder: string }[]
  onClose: () => void
  onSave: (data: Record<string, string>) => Promise<void>
  defaultCoords?: { lat: number; lng: number } | null
}) {
  const [form, setForm] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {
      latitude: defaultCoords?.lat?.toString() ?? '',
      longitude: defaultCoords?.lng?.toString() ?? '',
    }
    fields.forEach(f => { init[f.key] = '' })
    return init
  })
  const [dmsCoord, setDmsCoord] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const handleDMSFill = () => {
    const result = parseDMS(dmsCoord)
    if (result) setForm(prev => ({ ...prev, latitude: result.lat.toString(), longitude: result.lng.toString() }))
    else setErr('Gecersiz koordinat formati')
  }

  const handleSubmit = async () => {
    setSaving(true); setErr(null)
    try { await onSave(form); onClose() }
    catch (e: any) { setErr(e.message ?? 'Hata') }
    finally { setSaving(false) }
  }

  return (
    <DraggableModal title={title} icon={icon} onClose={onClose} width={480}
      footer={<>
        <button type="button" onClick={onClose} className="btn-secondary">Iptal</button>
        <button type="button" onClick={handleSubmit} disabled={saving} className="btn-primary">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Ekle
        </button>
      </>}>
      <div className="p-5 space-y-3">
        {fields.map(f => (
          <div key={f.key}>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-2)' }}>{f.label}</label>
            <input className="input" placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
          </div>
        ))}
        <div>
          <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-2)' }}>DMS Koordinat</label>
          <div className="flex gap-2">
            <input className="input flex-1 font-mono text-xs" placeholder="42N14'3 26E24'6" value={dmsCoord} onChange={e => setDmsCoord(e.target.value)} />
            <button type="button" onClick={handleDMSFill} className="btn-secondary text-xs">Donustur</button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-2)' }}>Enlem *</label>
            <input className="input font-mono" type="number" step="any" placeholder="39.9208" value={form.latitude} onChange={e => setForm(prev => ({ ...prev, latitude: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-2)' }}>Boylam *</label>
            <input className="input font-mono" type="number" step="any" placeholder="32.8541" value={form.longitude} onChange={e => setForm(prev => ({ ...prev, longitude: e.target.value }))} />
          </div>
        </div>
        {err && <p className="text-[11px] text-red-500 flex items-center gap-1"><AlertTriangle size={11} /> {err}</p>}
      </div>
    </DraggableModal>
  )
}
