import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Building2, Upload, Plus, Trash2, Eye, EyeOff, Layers, AlertTriangle,
  ChevronDown, X, Loader2, Zap, Activity, Package, ClipboardList,
  Shield, MapPin, Radio, Cpu, Settings2, Maximize2, Minimize2,
  CheckCircle2, XCircle, RefreshCw,
} from 'lucide-react'
import clsx from 'clsx'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { api, API_BASE } from '../lib/api'
import { useDepartments } from '../lib/hooks'
import DraggableModal from '../components/ui/DraggableModal'
import { useToolbarActions } from '../lib/useToolbarActions'

// ── Types ──────────────────────────────────────────────────────────────────

interface FloorPlan {
  id: string
  name: string
  description: string | null
  floor: string | null
  imagePath: string
  originalName: string
  mimeType: string
  imageWidth: number | null
  imageHeight: number | null
  templateId: string | null
  active: boolean
  createdAt: string
  _count?: { zones: number }
  zones?: FacilityZone[]
}

interface FacilityZone {
  id: string
  floorPlanId: string
  type: 'ZONE' | 'MARKER' | 'STOCK_AREA' | 'DEPARTMENT' | 'EMERGENCY_EXIT' | 'HAZARD'
  name: string
  description: string | null
  color: string
  x: number
  y: number
  width: number | null
  height: number | null
  layer: string
  linkedEntityType: string | null
  linkedEntityId: string | null
  metadata: any
  order: number
  liveData?: any
}

interface Template {
  id: string
  name: string
  zoneCount: number
}

// ── Constants ──────────────────────────────────────────────────────────────

const LAYER_CONFIG: Record<string, { label: string; labelEn: string; icon: typeof Building2; color: string }> = {
  departments: { label: 'Departmanlar', labelEn: 'Departments', icon: Building2, color: '#6366f1' },
  iot:         { label: 'IoT Cihazlar', labelEn: 'IoT Devices', icon: Radio, color: '#06b6d4' },
  tasks:       { label: 'Gorevler', labelEn: 'Tasks', icon: ClipboardList, color: '#8b5cf6' },
  stock:       { label: 'Stok Alanlari', labelEn: 'Stock Areas', icon: Package, color: '#ea580c' },
  emergency:   { label: 'Acil Durum', labelEn: 'Emergency', icon: AlertTriangle, color: '#dc2626' },
  general:     { label: 'Genel', labelEn: 'General', icon: MapPin, color: '#64748b' },
}

const ZONE_TYPE_CONFIG: Record<string, { label: string; labelEn: string }> = {
  ZONE:           { label: 'Alan', labelEn: 'Zone' },
  MARKER:         { label: 'Isaretci', labelEn: 'Marker' },
  STOCK_AREA:     { label: 'Stok Alani', labelEn: 'Stock Area' },
  DEPARTMENT:     { label: 'Departman', labelEn: 'Department' },
  EMERGENCY_EXIT: { label: 'Acil Cikis', labelEn: 'Emergency Exit' },
  HAZARD:         { label: 'Tehlike Bolgesi', labelEn: 'Hazard Zone' },
}

const IOT_STATUS_COLORS: Record<string, string> = {
  ONLINE: '#22c55e', OFFLINE: '#94a3b8', WARNING: '#f59e0b', CRITICAL: '#ef4444', MAINTENANCE: '#3b82f6',
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function FacilityMap() {
  const { t, lang } = useLanguage()
  const { user } = useAuth()
  const { departments } = useDepartments()
  const canvasRef = useRef<HTMLDivElement>(null)

  // State
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [zones, setZones] = useState<FacilityZone[]>([])
  const [loading, setLoading] = useState(true)
  const [liveLoading, setLiveLoading] = useState(false)

  // Layers
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set(Object.keys(LAYER_CONFIG)))

  // UI state
  const [selectedZone, setSelectedZone] = useState<FacilityZone | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [emergencyMode, setEmergencyMode] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [showCreateZone, setShowCreateZone] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [operiqResult, setOperiqResult] = useState<any>(null)
  const [operiqLoading, setOperiqLoading] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  // Plan selector dropdown
  const [planDropdown, setPlanDropdown] = useState(false)

  const selectedPlan = floorPlans.find(p => p.id === selectedPlanId)

  // ── Data fetching ──────────────────────────────────────────────────────

  const loadFloorPlans = useCallback(async () => {
    try {
      const data = await api.get<FloorPlan[]>('/facility-map/floor-plans')
      setFloorPlans(data)
      if (data.length > 0 && !selectedPlanId) setSelectedPlanId(data[0].id)
    } catch {} finally { setLoading(false) }
  }, [])

  const loadLiveData = useCallback(async () => {
    if (!selectedPlanId) return
    setLiveLoading(true)
    try {
      const data = await api.get<FacilityZone[]>(`/facility-map/floor-plans/${selectedPlanId}/live`)
      setZones(data)
    } catch {} finally { setLiveLoading(false) }
  }, [selectedPlanId])

  useEffect(() => { loadFloorPlans() }, [loadFloorPlans])
  useEffect(() => { if (selectedPlanId) loadLiveData() }, [selectedPlanId, loadLiveData])

  // Auto-refresh every 30s
  useEffect(() => {
    if (!selectedPlanId) return
    const id = setInterval(loadLiveData, 30000)
    return () => clearInterval(id)
  }, [selectedPlanId, loadLiveData])

  // Load templates
  useEffect(() => {
    api.get<Template[]>('/facility-map/templates').then(setTemplates).catch(() => {})
  }, [])

  useToolbarActions({ onRefresh: loadLiveData, onNew: () => setShowUpload(true) })

  // ── Handlers ───────────────────────────────────────────────────────────

  const toggleLayer = (layer: string) => {
    setActiveLayers(prev => {
      const next = new Set(prev)
      next.has(layer) ? next.delete(layer) : next.add(layer)
      return next
    })
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!editMode || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setShowCreateZone(true)
    setNewZone(prev => ({ ...prev, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }))
  }

  const handleDeletePlan = async () => {
    if (!selectedPlanId) return
    if (!window.confirm(lang === 'tr' ? 'Bu kat planini silmek istediginize emin misiniz?' : 'Delete this floor plan?')) return
    try {
      await api.delete(`/facility-map/floor-plans/${selectedPlanId}`)
      setSelectedPlanId(null)
      loadFloorPlans()
    } catch {}
  }

  const handleDeleteZone = async (id: string) => {
    try {
      await api.delete(`/facility-map/zones/${id}`)
      setSelectedZone(null)
      loadLiveData()
    } catch {}
  }

  const handleApplyTemplate = async (templateId: string) => {
    if (!selectedPlanId) return
    try {
      await api.post(`/facility-map/floor-plans/${selectedPlanId}/apply-template`, { templateId })
      setShowTemplates(false)
      loadLiveData()
    } catch {}
  }

  const handleOperIQ = async (zoneId?: string) => {
    if (!selectedPlanId) return
    setOperiqLoading(true)
    try {
      const data = await api.post<any>(`/facility-map/floor-plans/${selectedPlanId}/operiq`, { zoneId })
      setOperiqResult(data)
    } catch {} finally { setOperiqLoading(false) }
  }

  // ── New zone form state ────────────────────────────────────────────────

  const [newZone, setNewZone] = useState({ name: '', type: 'MARKER' as string, x: 50, y: 50, width: 10, height: 10, color: '#6366f1', layer: 'general', linkedEntityType: '', linkedEntityId: '' })
  const [creatingZone, setCreatingZone] = useState(false)

  const handleCreateZone = async () => {
    if (!selectedPlanId || !newZone.name.trim()) return
    setCreatingZone(true)
    try {
      await api.post(`/facility-map/floor-plans/${selectedPlanId}/zones`, {
        ...newZone,
        width: ['ZONE', 'STOCK_AREA', 'DEPARTMENT', 'HAZARD'].includes(newZone.type) ? newZone.width : undefined,
        height: ['ZONE', 'STOCK_AREA', 'DEPARTMENT', 'HAZARD'].includes(newZone.type) ? newZone.height : undefined,
        linkedEntityType: newZone.linkedEntityType || undefined,
        linkedEntityId: newZone.linkedEntityId || undefined,
      })
      setShowCreateZone(false)
      setNewZone({ name: '', type: 'MARKER', x: 50, y: 50, width: 10, height: 10, color: '#6366f1', layer: 'general', linkedEntityType: '', linkedEntityId: '' })
      loadLiveData()
    } catch {} finally { setCreatingZone(false) }
  }

  // ── Upload form ────────────────────────────────────────────────────────

  const [uploadName, setUploadName] = useState('')
  const [uploadFloor, setUploadFloor] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async () => {
    if (!uploadFile || !uploadName.trim()) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('floorPlan', uploadFile)
      fd.append('name', uploadName.trim())
      if (uploadFloor) fd.append('floor', uploadFloor)

      const token = (await import('../lib/api')).tokenStore.get()
      const res = await fetch(`${API_BASE}/facility-map/floor-plans`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: fd,
      })
      if (!res.ok) throw new Error('Upload basarisiz')
      const body = await res.json()
      setShowUpload(false)
      setUploadName('')
      setUploadFloor('')
      setUploadFile(null)
      await loadFloorPlans()
      setSelectedPlanId(body.data.id)
    } catch {} finally { setUploading(false) }
  }

  // ── Visible zones ──────────────────────────────────────────────────────

  const visibleZones = zones.filter(z => activeLayers.has(z.layer))
  const imageUrl = selectedPlan ? `${API_BASE.replace('/api/v1', '')}/uploads/${selectedPlan.imagePath}` : null

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className={clsx('space-y-4', fullscreen && 'fixed inset-0 z-50 p-4 overflow-auto')} style={fullscreen ? { background: 'var(--bg)' } : undefined}>
      {/* CSS Animations */}
      <style>{`
        @keyframes facilityPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); } 50% { box-shadow: 0 0 0 8px rgba(239,68,68,0); } }
        @keyframes facilityFadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes markerBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        .facility-pulse { animation: facilityPulse 2s ease-in-out infinite; }
        .facility-fade-in { animation: facilityFadeIn 0.6s ease-out; }
        .marker-bounce { animation: markerBounce 2s ease-in-out infinite; }
      `}</style>

      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>
          {lang === 'tr' ? 'Tesis kat planlarinizi yukleyin, alanlar tanimlayin, canli operasyonel veri izleyin.' : 'Upload floor plans, define zones, monitor live operational data.'}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Plan selector */}
          <div className="relative">
            <button type="button" onClick={() => setPlanDropdown(!planDropdown)}
              className="card px-3 py-2 flex items-center gap-2 text-[12px] font-semibold hover:shadow-md transition-all" style={{ color: 'var(--text-1)' }}>
              <Layers size={14} className="text-cyan-600" />
              {selectedPlan?.name ?? (lang === 'tr' ? 'Plan sec...' : 'Select plan...')}
              <ChevronDown size={12} style={{ color: 'var(--text-3)' }} />
            </button>
            {planDropdown && (
              <div className="absolute top-full right-0 mt-1 w-56 rounded-xl shadow-xl z-30 overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                {floorPlans.map(p => (
                  <button key={p.id} type="button" onClick={() => { setSelectedPlanId(p.id); setPlanDropdown(false) }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] text-left transition-colors"
                    style={{ color: selectedPlanId === p.id ? 'var(--accent)' : 'var(--text-1)', fontWeight: selectedPlanId === p.id ? 700 : 400, background: selectedPlanId === p.id ? 'var(--accent-bg)' : '' }}
                    onMouseEnter={e => { if (selectedPlanId !== p.id) e.currentTarget.style.background = 'var(--border-subtle)' }}
                    onMouseLeave={e => { if (selectedPlanId !== p.id) e.currentTarget.style.background = '' }}>
                    <Building2 size={12} /> {p.name} {p.floor && `(${p.floor})`}
                    <span className="ml-auto text-[10px]" style={{ color: 'var(--text-3)' }}>{p._count?.zones ?? 0} alan</span>
                  </button>
                ))}
                {floorPlans.length === 0 && (
                  <p className="px-3 py-4 text-[11px] text-center" style={{ color: 'var(--text-3)' }}>
                    {lang === 'tr' ? 'Henuz plan yok' : 'No plans yet'}
                  </p>
                )}
              </div>
            )}
          </div>

          {selectedPlan && (
            <>
              <button type="button" onClick={() => setShowUpload(true)} className="card px-3 py-2 flex items-center gap-1.5 text-[12px] font-semibold hover:shadow-md transition-all" style={{ color: 'var(--text-1)' }}>
                <Upload size={14} className="text-emerald-600" /> {lang === 'tr' ? 'Yeni Plan' : 'New Plan'}
              </button>
              <button type="button" onClick={() => setShowTemplates(true)} className="card px-3 py-2 flex items-center gap-1.5 text-[12px] font-semibold hover:shadow-md transition-all" style={{ color: 'var(--text-1)' }}>
                <Settings2 size={14} className="text-violet-600" /> {lang === 'tr' ? 'Sablon' : 'Template'}
              </button>
              <button type="button" onClick={() => setEditMode(!editMode)}
                className={clsx('card px-3 py-2 flex items-center gap-1.5 text-[12px] font-semibold transition-all', editMode ? 'ring-2 ring-cyan-400 shadow-lg' : 'hover:shadow-md')}
                style={{ color: editMode ? '#06b6d4' : 'var(--text-1)' }}>
                <Plus size={14} /> {lang === 'tr' ? (editMode ? 'Duzenleme Aktif' : 'Duzenle') : (editMode ? 'Editing' : 'Edit')}
              </button>
              <button type="button" onClick={() => setEmergencyMode(!emergencyMode)}
                className={clsx('card px-3 py-2 flex items-center gap-1.5 text-[12px] font-bold transition-all', emergencyMode ? 'bg-red-600 text-white border-red-600' : 'hover:shadow-md')}
                style={!emergencyMode ? { color: 'var(--text-1)' } : undefined}>
                <AlertTriangle size={14} /> {lang === 'tr' ? 'Acil Durum' : 'Emergency'}
              </button>
              <button type="button" onClick={() => handleOperIQ()} disabled={operiqLoading}
                className="card px-3 py-2 flex items-center gap-1.5 text-[12px] font-semibold hover:shadow-md transition-all" style={{ color: '#14b8a6' }}>
                {operiqLoading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} OperIQ
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Layer toggles ──────────────────────────────────────────────── */}
      {selectedPlan && (
        <div className="flex items-center gap-2 flex-wrap">
          {Object.entries(LAYER_CONFIG).map(([key, cfg]) => {
            const active = activeLayers.has(key)
            const count = zones.filter(z => z.layer === key).length
            return (
              <button key={key} type="button" onClick={() => toggleLayer(key)}
                className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all', active ? 'shadow-sm' : 'opacity-50')}
                style={{ borderColor: active ? cfg.color : 'var(--border)', color: active ? cfg.color : 'var(--text-3)', background: active ? `${cfg.color}10` : 'transparent' }}>
                {active ? <Eye size={12} /> : <EyeOff size={12} />}
                {lang === 'tr' ? cfg.label : cfg.labelEn}
                {count > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{ background: `${cfg.color}20`, color: cfg.color }}>{count}</span>}
              </button>
            )
          })}
          {liveLoading && <Loader2 size={14} className="animate-spin text-cyan-500 ml-2" />}
        </div>
      )}

      {/* ── Main content ───────────────────────────────────────────────── */}
      <div className="flex gap-4">
        {/* Canvas area */}
        <div className="flex-1">
          {loading ? (
            <div className="card flex items-center justify-center" style={{ height: '500px' }}>
              <Loader2 size={32} className="animate-spin" style={{ color: 'var(--text-3)' }} />
            </div>
          ) : !selectedPlan ? (
            <div className="card flex flex-col items-center justify-center gap-4" style={{ height: '500px' }}>
              <Building2 size={48} style={{ color: 'var(--text-3)', opacity: 0.3 }} />
              <p className="text-[14px] font-semibold" style={{ color: 'var(--text-2)' }}>
                {lang === 'tr' ? 'Henuz kat plani yuklenmemis' : 'No floor plan uploaded yet'}
              </p>
              <button type="button" onClick={() => setShowUpload(true)} className="btn-primary">
                <Upload size={14} /> {lang === 'tr' ? 'Plan Yukle' : 'Upload Plan'}
              </button>
            </div>
          ) : (
            <div
              ref={canvasRef}
              className={clsx('card relative overflow-hidden facility-fade-in', editMode && 'cursor-crosshair', emergencyMode && 'ring-2 ring-red-500')}
              style={{ minHeight: '500px', background: emergencyMode ? 'rgba(127,29,29,0.05)' : 'var(--surface)' }}
              onClick={handleCanvasClick}
            >
              {/* Floor plan image */}
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt={selectedPlan.name}
                  className="w-full h-auto block select-none"
                  draggable={false}
                  onContextMenu={e => e.preventDefault()}
                  style={{ opacity: emergencyMode ? 0.4 : 1, transition: 'opacity 0.5s' }}
                />
              )}

              {/* Zone overlays */}
              {visibleZones.map(zone => {
                const isArea = ['ZONE', 'STOCK_AREA', 'DEPARTMENT', 'HAZARD', 'EMERGENCY_EXIT'].includes(zone.type) && zone.width && zone.height
                const isSelected = selectedZone?.id === zone.id
                const isCritical = zone.liveData?.status === 'CRITICAL' || zone.liveData?.level === 'critical' || zone.type === 'HAZARD'
                const isWarning = zone.liveData?.status === 'WARNING' || zone.liveData?.level === 'warning'

                return (
                  <div
                    key={zone.id}
                    className={clsx(
                      'absolute transition-all duration-300 cursor-pointer group',
                      isArea ? 'rounded-lg border-2' : 'rounded-full',
                      isSelected && 'ring-2 ring-offset-1 ring-cyan-400 z-20',
                      emergencyMode && isCritical && 'facility-pulse z-10',
                      emergencyMode && !isCritical && zone.type !== 'EMERGENCY_EXIT' && 'opacity-30',
                    )}
                    style={{
                      left: `${zone.x}%`,
                      top: `${zone.y}%`,
                      width: isArea ? `${zone.width}%` : '28px',
                      height: isArea ? `${zone.height}%` : '28px',
                      transform: isArea ? 'none' : 'translate(-50%, -50%)',
                      borderColor: zone.color,
                      backgroundColor: isArea ? `${zone.color}18` : zone.color,
                      boxShadow: isSelected ? `0 0 20px ${zone.color}40` : isCritical ? `0 0 12px rgba(239,68,68,0.4)` : 'none',
                    }}
                    onClick={e => { e.stopPropagation(); setSelectedZone(zone) }}
                  >
                    {/* Zone name label */}
                    {isArea && (
                      <span className="absolute top-1 left-2 text-[9px] font-bold truncate max-w-[90%] pointer-events-none" style={{ color: zone.color }}>{zone.name}</span>
                    )}

                    {/* Marker icon */}
                    {!isArea && (
                      <div className="w-full h-full flex items-center justify-center marker-bounce">
                        {zone.layer === 'iot' ? <Radio size={12} className="text-white" /> :
                         zone.layer === 'stock' ? <Package size={12} className="text-white" /> :
                         zone.type === 'EMERGENCY_EXIT' ? <AlertTriangle size={12} className="text-white" /> :
                         <MapPin size={12} className="text-white" />}
                      </div>
                    )}

                    {/* Live status badge */}
                    {zone.liveData && (
                      <span
                        className={clsx('absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white', isCritical && 'animate-ping')}
                        style={{ background: isCritical ? '#ef4444' : isWarning ? '#f59e0b' : '#22c55e' }}
                      />
                    )}

                    {/* Task count badge */}
                    {zone.liveData?.type === 'tasks' && zone.liveData.total > 0 && (
                      <span className="absolute -bottom-2 -right-2 px-1.5 py-0.5 rounded-full text-[8px] font-bold text-white" style={{ background: zone.liveData.overdue > 0 ? '#ef4444' : '#6366f1' }}>
                        {zone.liveData.total}
                      </span>
                    )}

                    {/* Stock level bar */}
                    {zone.liveData?.type === 'stock' && isArea && (
                      <div className="absolute bottom-1 left-2 right-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.1)' }}>
                        <div className="h-full rounded-full transition-all" style={{
                          width: `${Math.min(100, (zone.liveData.quantity / Math.max(1, zone.liveData.minLevel)) * 50)}%`,
                          background: zone.liveData.level === 'critical' ? '#ef4444' : zone.liveData.level === 'warning' ? '#f59e0b' : '#22c55e',
                        }} />
                      </div>
                    )}

                    {/* Hover tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30"
                      style={{ background: 'rgba(15,23,42,0.9)', color: '#fff' }}>
                      {zone.name}
                    </div>
                  </div>
                )
              })}

              {/* Edit mode indicator */}
              {editMode && (
                <div className="absolute top-3 left-3 px-3 py-1.5 rounded-lg text-[11px] font-bold z-20"
                  style={{ background: 'rgba(6,182,212,0.9)', color: '#fff' }}>
                  {lang === 'tr' ? 'Duzenleme modu - plana tiklayarak alan ekleyin' : 'Edit mode - click on plan to add zones'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Side panel ─────────────────────────────────────────────── */}
        {selectedZone && (
          <div className="w-80 flex-shrink-0 card p-4 space-y-4 facility-fade-in overflow-y-auto" style={{ maxHeight: '600px' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ background: selectedZone.color }} />
                <h3 className="text-[14px] font-bold" style={{ color: 'var(--text-1)' }}>{selectedZone.name}</h3>
              </div>
              <button type="button" onClick={() => setSelectedZone(null)} className="p-1 rounded hover:bg-zinc-100" style={{ color: 'var(--text-3)' }}>
                <X size={14} />
              </button>
            </div>

            <div className="space-y-2">
              <InfoRow label={lang === 'tr' ? 'Tip' : 'Type'} value={ZONE_TYPE_CONFIG[selectedZone.type]?.[lang === 'tr' ? 'label' : 'labelEn'] ?? selectedZone.type} />
              <InfoRow label={lang === 'tr' ? 'Katman' : 'Layer'} value={LAYER_CONFIG[selectedZone.layer]?.[lang === 'tr' ? 'label' : 'labelEn'] ?? selectedZone.layer} />
              {selectedZone.description && <InfoRow label={lang === 'tr' ? 'Aciklama' : 'Description'} value={selectedZone.description} />}
              <InfoRow label={lang === 'tr' ? 'Konum' : 'Position'} value={`X: ${selectedZone.x.toFixed(1)}% Y: ${selectedZone.y.toFixed(1)}%`} />
            </div>

            {/* Live data */}
            {selectedZone.liveData && (
              <div className="p-3 rounded-lg" style={{ background: 'var(--border-subtle)', border: '1px solid var(--border)' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--accent)' }}>
                  {lang === 'tr' ? 'Canli Veri' : 'Live Data'}
                </p>
                {selectedZone.liveData.type === 'iot' && (
                  <div className="space-y-1.5">
                    <InfoRow label={lang === 'tr' ? 'Cihaz' : 'Device'} value={selectedZone.liveData.name} />
                    <InfoRow label={lang === 'tr' ? 'Durum' : 'Status'} value={selectedZone.liveData.status} />
                    {selectedZone.liveData.lastPayload && Object.entries(selectedZone.liveData.lastPayload as Record<string, number>).map(([k, v]) => (
                      <InfoRow key={k} label={k} value={String(v)} />
                    ))}
                  </div>
                )}
                {selectedZone.liveData.type === 'tasks' && (
                  <div className="space-y-1.5">
                    <InfoRow label={lang === 'tr' ? 'Toplam Gorev' : 'Total Tasks'} value={String(selectedZone.liveData.total)} />
                    <InfoRow label={lang === 'tr' ? 'Kritik' : 'Critical'} value={String(selectedZone.liveData.critical)} />
                    <InfoRow label={lang === 'tr' ? 'Geciken' : 'Overdue'} value={String(selectedZone.liveData.overdue)} />
                  </div>
                )}
                {selectedZone.liveData.type === 'stock' && (
                  <div className="space-y-1.5">
                    <InfoRow label={lang === 'tr' ? 'Urun' : 'Item'} value={selectedZone.liveData.name} />
                    <InfoRow label={lang === 'tr' ? 'Miktar' : 'Quantity'} value={`${selectedZone.liveData.quantity} ${selectedZone.liveData.unit}`} />
                    <InfoRow label={lang === 'tr' ? 'Seviye' : 'Level'} value={selectedZone.liveData.level === 'critical' ? 'Kritik' : selectedZone.liveData.level === 'warning' ? 'Uyari' : 'Normal'} />
                  </div>
                )}
              </div>
            )}

            {/* OperIQ for this zone */}
            <button type="button" onClick={() => handleOperIQ(selectedZone.id)} disabled={operiqLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[12px] font-bold transition-all" style={{ background: '#14b8a6', color: '#fff' }}>
              {operiqLoading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              OperIQ {lang === 'tr' ? 'Analiz' : 'Analyze'}
            </button>

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <button type="button" onClick={() => handleDeleteZone(selectedZone.id)}
                className="flex items-center gap-1 px-3 py-1.5 rounded text-[11px] font-semibold text-red-500 hover:bg-red-50 transition-colors">
                <Trash2 size={12} /> {lang === 'tr' ? 'Sil' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── OperIQ Result ──────────────────────────────────────────── */}
      {operiqResult && (
        <div className="card p-5 space-y-3 facility-fade-in" style={{ borderLeft: `4px solid ${operiqResult.riskSeviyesi === 'kritik' ? '#ef4444' : operiqResult.riskSeviyesi === 'yuksek' ? '#f59e0b' : '#22c55e'}` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-teal-500" />
              <p className="text-[14px] font-bold" style={{ color: 'var(--text-1)' }}>OperIQ {lang === 'tr' ? 'Tesis Analizi' : 'Facility Analysis'}</p>
            </div>
            <button type="button" onClick={() => setOperiqResult(null)} style={{ color: 'var(--text-3)' }}>
              <X size={14} />
            </button>
          </div>
          {operiqResult.ozet && <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-2)' }}>{operiqResult.ozet}</p>}
          {operiqResult.problemliAlanlar?.length > 0 && (
            <div>
              <p className="text-[11px] font-bold mb-1" style={{ color: '#ef4444' }}>{lang === 'tr' ? 'Problemli Alanlar' : 'Problem Areas'}</p>
              <ul className="space-y-1">{operiqResult.problemliAlanlar.map((p: string, i: number) => (
                <li key={i} className="text-[12px] flex items-start gap-1.5" style={{ color: 'var(--text-2)' }}>
                  <XCircle size={12} className="text-red-400 mt-0.5 flex-shrink-0" /> {p}
                </li>
              ))}</ul>
            </div>
          )}
          {operiqResult.onerileriAksiyonlar?.length > 0 && (
            <div>
              <p className="text-[11px] font-bold mb-1" style={{ color: '#22c55e' }}>{lang === 'tr' ? 'Onerilen Aksiyonlar' : 'Recommended Actions'}</p>
              <ul className="space-y-1">{operiqResult.onerileriAksiyonlar.map((a: string, i: number) => (
                <li key={i} className="text-[12px] flex items-start gap-1.5" style={{ color: 'var(--text-2)' }}>
                  <CheckCircle2 size={12} className="text-emerald-400 mt-0.5 flex-shrink-0" /> {a}
                </li>
              ))}</ul>
            </div>
          )}
        </div>
      )}

      {/* ── Upload Modal ───────────────────────────────────────────── */}
      {showUpload && (
        <DraggableModal title={lang === 'tr' ? 'Kat Plani Yukle' : 'Upload Floor Plan'} icon={<Upload size={13} />} onClose={() => setShowUpload(false)} width={480}>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-3)' }}>{lang === 'tr' ? 'Plan Adi' : 'Plan Name'} *</label>
              <input className="input" value={uploadName} onChange={e => setUploadName(e.target.value)} placeholder={lang === 'tr' ? 'Ornek: Ana Fabrika Zemin Kat' : 'e.g. Main Factory Ground Floor'} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-3)' }}>{lang === 'tr' ? 'Kat / Seviye' : 'Floor / Level'}</label>
              <input className="input" value={uploadFloor} onChange={e => setUploadFloor(e.target.value)} placeholder={lang === 'tr' ? 'Ornek: Zemin Kat' : 'e.g. Ground Floor'} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-3)' }}>{lang === 'tr' ? 'Plan Gorseli' : 'Plan Image'} * (PNG, JPG, SVG)</label>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,application/pdf" onChange={e => setUploadFile(e.target.files?.[0] ?? null)} className="input text-[12px]" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowUpload(false)} className="btn-secondary">{lang === 'tr' ? 'Iptal' : 'Cancel'}</button>
              <button type="button" onClick={handleUpload} disabled={uploading || !uploadFile || !uploadName.trim()} className="btn-primary disabled:opacity-40">
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} {lang === 'tr' ? 'Yukle' : 'Upload'}
              </button>
            </div>
          </div>
        </DraggableModal>
      )}

      {/* ── Create Zone Modal ──────────────────────────────────────── */}
      {showCreateZone && (
        <DraggableModal title={lang === 'tr' ? 'Alan / Isaretci Ekle' : 'Add Zone / Marker'} icon={<Plus size={13} />} onClose={() => setShowCreateZone(false)} width={480}>
          <div className="p-5 space-y-3">
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-3)' }}>{lang === 'tr' ? 'Ad' : 'Name'} *</label>
              <input className="input" value={newZone.name} onChange={e => setNewZone({ ...newZone, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-3)' }}>{lang === 'tr' ? 'Tip' : 'Type'}</label>
                <select className="select" value={newZone.type} onChange={e => setNewZone({ ...newZone, type: e.target.value })}>
                  {Object.entries(ZONE_TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{lang === 'tr' ? v.label : v.labelEn}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-3)' }}>{lang === 'tr' ? 'Katman' : 'Layer'}</label>
                <select className="select" value={newZone.layer} onChange={e => setNewZone({ ...newZone, layer: e.target.value })}>
                  {Object.entries(LAYER_CONFIG).map(([k, v]) => <option key={k} value={k}>{lang === 'tr' ? v.label : v.labelEn}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-3)' }}>X %</label>
                <input type="number" className="input" min={0} max={100} step={0.1} value={newZone.x} onChange={e => setNewZone({ ...newZone, x: +e.target.value })} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-3)' }}>Y %</label>
                <input type="number" className="input" min={0} max={100} step={0.1} value={newZone.y} onChange={e => setNewZone({ ...newZone, y: +e.target.value })} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-3)' }}>{lang === 'tr' ? 'Renk' : 'Color'}</label>
                <input type="color" className="w-full h-[38px] rounded border cursor-pointer" style={{ borderColor: 'var(--border)' }} value={newZone.color} onChange={e => setNewZone({ ...newZone, color: e.target.value })} />
              </div>
            </div>
            {['ZONE', 'STOCK_AREA', 'DEPARTMENT', 'HAZARD'].includes(newZone.type) && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-3)' }}>{lang === 'tr' ? 'Genislik %' : 'Width %'}</label>
                  <input type="number" className="input" min={1} max={100} value={newZone.width} onChange={e => setNewZone({ ...newZone, width: +e.target.value })} />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-3)' }}>{lang === 'tr' ? 'Yukseklik %' : 'Height %'}</label>
                  <input type="number" className="input" min={1} max={100} value={newZone.height} onChange={e => setNewZone({ ...newZone, height: +e.target.value })} />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-3)' }}>{lang === 'tr' ? 'Bagli Entity Tipi' : 'Linked Entity Type'}</label>
                <select className="select" value={newZone.linkedEntityType} onChange={e => setNewZone({ ...newZone, linkedEntityType: e.target.value, linkedEntityId: '' })}>
                  <option value="">{lang === 'tr' ? 'Yok' : 'None'}</option>
                  <option value="department">{lang === 'tr' ? 'Departman' : 'Department'}</option>
                  <option value="iotDevice">IoT {lang === 'tr' ? 'Cihaz' : 'Device'}</option>
                  <option value="stockItem">{lang === 'tr' ? 'Stok Kalemi' : 'Stock Item'}</option>
                </select>
              </div>
              {newZone.linkedEntityType === 'department' && (
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-3)' }}>{lang === 'tr' ? 'Departman' : 'Department'}</label>
                  <select className="select" value={newZone.linkedEntityId} onChange={e => setNewZone({ ...newZone, linkedEntityId: e.target.value })}>
                    <option value="">{lang === 'tr' ? 'Sec...' : 'Select...'}</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowCreateZone(false)} className="btn-secondary">{lang === 'tr' ? 'Iptal' : 'Cancel'}</button>
              <button type="button" onClick={handleCreateZone} disabled={creatingZone || !newZone.name.trim()} className="btn-primary disabled:opacity-40">
                {creatingZone ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} {lang === 'tr' ? 'Olustur' : 'Create'}
              </button>
            </div>
          </div>
        </DraggableModal>
      )}

      {/* ── Templates Modal ────────────────────────────────────────── */}
      {showTemplates && (
        <DraggableModal title={lang === 'tr' ? 'Sektor Sablonlari' : 'Sector Templates'} icon={<Settings2 size={13} />} onClose={() => setShowTemplates(false)} width={400}>
          <div className="p-5 space-y-3">
            <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>
              {lang === 'tr' ? 'Hazir sektor sablonunu secin. Mevcut alanlara dokunmaz, yeni alanlar ekler.' : 'Select a sector template. Existing zones are preserved, new ones are added.'}
            </p>
            <div className="space-y-2">
              {templates.map(tmpl => (
                <button key={tmpl.id} type="button" onClick={() => handleApplyTemplate(tmpl.id)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border transition-all hover:shadow-md"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-1)' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#06b6d4')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                  <span className="text-[13px] font-semibold">{tmpl.name}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'var(--border-subtle)', color: 'var(--text-3)' }}>{tmpl.zoneCount} alan</span>
                </button>
              ))}
            </div>
          </div>
        </DraggableModal>
      )}

      {/* ── Plan Actions ───────────────────────────────────────────── */}
      {selectedPlan && (
        <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--text-3)' }}>
          <span>{selectedPlan.originalName}</span>
          <span>-</span>
          <span>{zones.length} {lang === 'tr' ? 'alan' : 'zones'}</span>
          <span>-</span>
          <span>{new Date(selectedPlan.createdAt).toLocaleDateString('tr-TR')}</span>
          <button type="button" onClick={handleDeletePlan} className="ml-auto text-red-400 hover:text-red-600 transition-colors flex items-center gap-1">
            <Trash2 size={11} /> {lang === 'tr' ? 'Plani Sil' : 'Delete Plan'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Helper Components ──────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[10px] font-semibold flex-shrink-0" style={{ color: 'var(--text-3)' }}>{label}</span>
      <span className="text-[12px] font-medium text-right truncate" style={{ color: 'var(--text-1)' }}>{value}</span>
    </div>
  )
}
