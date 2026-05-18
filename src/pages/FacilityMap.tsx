import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Building2, Upload, Plus, Trash2, Eye, EyeOff, Layers, AlertTriangle,
  ChevronDown, X, Loader2, Zap, Activity, Package, ClipboardList,
  Shield, MapPin, Radio, Cpu, Settings2, Maximize2, Minimize2,
  CheckCircle2, XCircle, RefreshCw, Box, User, Wrench, Move,
  ZoomIn, ZoomOut, RotateCcw, RotateCw, ChevronUp, GripVertical, Scan,
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

interface LiveEntity {
  id: string
  name: string
  type: 'personnel' | 'equipment'
  x: number
  y: number
  z?: number
  status?: string
  department?: string
  lastSeen?: string
}

interface FacilityDimensions3D {
  xWidth: number   // meters
  yDepth: number   // meters
  zHeight: number  // meters
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

  // Live entities (personnel + equipment)
  const [liveEntities, setLiveEntities] = useState<LiveEntity[]>([])

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

  // 3D view state
  const [view3D, setView3D] = useState(false)
  const [facilityDimensions, setFacilityDimensions] = useState<FacilityDimensions3D>({ xWidth: 100, yDepth: 50, zHeight: 10 })

  // Pan/zoom state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 })

  // Rotation state (2D: rotateZ only, 3D: rotateX + rotateY + rotateZ)
  const [rotation, setRotation] = useState({ x: 45, y: 0, z: -15 })
  const [isRotating, setIsRotating] = useState(false)
  const rotateStart = useRef({ mx: 0, my: 0, rx: 0, ry: 0, rz: 0 })

  // Resize state
  const [canvasHeight, setCanvasHeight] = useState(500)
  const [isResizing, setIsResizing] = useState(false)
  const resizeStart = useRef({ y: 0, h: 0 })

  // OperIQ dimension detection
  const [operiqDimLoading, setOperiqDimLoading] = useState(false)

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

  const loadLiveEntities = useCallback(async () => {
    try {
      const [personnel, equipment] = await Promise.all([
        api.get<any[]>('/locations/live').catch(() => []),
        api.get<any[]>('/map?type=equipment').catch(() => []),
      ])
      const mapped: LiveEntity[] = [
        ...(Array.isArray(personnel) ? personnel : []).map((p: any) => ({
          id: p.id || p.userId || String(Math.random()),
          name: p.name || p.fullName || 'Personel',
          type: 'personnel' as const,
          x: p.x ?? p.longitude ?? p.lng ?? 0,
          y: p.y ?? p.latitude ?? p.lat ?? 0,
          z: p.z ?? p.altitude ?? undefined,
          status: p.status,
          department: p.department ?? p.departmentName,
          lastSeen: p.lastSeen ?? p.updatedAt,
        })),
        ...(Array.isArray(equipment) ? equipment : []).map((e: any) => ({
          id: e.id || String(Math.random()),
          name: e.name || e.label || 'Ekipman',
          type: 'equipment' as const,
          x: e.x ?? e.longitude ?? e.lng ?? 0,
          y: e.y ?? e.latitude ?? e.lat ?? 0,
          z: e.z ?? e.altitude ?? undefined,
          status: e.status,
          lastSeen: e.lastSeen ?? e.updatedAt,
        })),
      ]
      setLiveEntities(mapped)
    } catch {}
  }, [])

  useEffect(() => { loadFloorPlans() }, [loadFloorPlans])
  useEffect(() => { if (selectedPlanId) { loadLiveData(); loadLiveEntities() } }, [selectedPlanId, loadLiveData, loadLiveEntities])

  // Auto-refresh every 30s
  useEffect(() => {
    if (!selectedPlanId) return
    const id = setInterval(() => { loadLiveData(); loadLiveEntities() }, 30000)
    return () => clearInterval(id)
  }, [selectedPlanId, loadLiveData, loadLiveEntities])

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
    // Find the actual image element to get its dimensions
    const img = canvasRef.current.querySelector('img')
    if (!img) return
    const imgRect = img.getBoundingClientRect()
    // Calculate click position relative to the image (accounting for pan/zoom)
    const x = ((e.clientX - imgRect.left) / imgRect.width) * 100
    const y = ((e.clientY - imgRect.top) / imgRect.height) * 100
    // Only accept clicks within the image bounds
    if (x < 0 || x > 100 || y < 0 || y > 100) return
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

  // ── Pan/Zoom handlers ──────────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (editMode) return
    // Right click or Alt+click = rotate mode
    if (e.button === 2 || (e.button === 0 && e.altKey)) {
      e.preventDefault()
      setIsRotating(true)
      rotateStart.current = { mx: e.clientX, my: e.clientY, rx: rotation.x, ry: rotation.y, rz: rotation.z }
      return
    }
    if (e.button !== 0) return
    setIsDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y }
    e.preventDefault()
  }, [editMode, transform.x, transform.y, rotation])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isRotating) {
      const dx = e.clientX - rotateStart.current.mx
      const dy = e.clientY - rotateStart.current.my
      if (view3D) {
        setRotation({
          x: Math.max(-90, Math.min(90, rotateStart.current.rx - dy * 0.5)),
          y: rotateStart.current.ry + dx * 0.5,
          z: rotateStart.current.rz,
        })
      } else {
        setRotation(prev => ({
          ...prev,
          z: rotateStart.current.rz + dx * 0.5,
        }))
      }
      return
    }
    if (!isDragging) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    setTransform(prev => ({ ...prev, x: dragStart.current.tx + dx, y: dragStart.current.ty + dy }))
  }, [isDragging, isRotating, view3D])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsRotating(false)
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setTransform(prev => ({
      ...prev,
      scale: Math.max(0.25, Math.min(5, prev.scale + delta)),
    }))
  }, [])

  // Attach non-passive wheel listener to allow preventDefault
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const handler = (e: WheelEvent) => { e.preventDefault() }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [selectedPlanId])

  const resetTransform = useCallback(() => {
    setTransform({ x: 0, y: 0, scale: 1 })
    setRotation(view3D ? { x: 45, y: 0, z: -15 } : { x: 0, y: 0, z: 0 })
  }, [view3D])

  // ── Resize handlers ───────────────────────────────────────────────────

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    resizeStart.current = { y: e.clientY, h: canvasHeight }

    const handleResizeMove = (ev: MouseEvent) => {
      const dy = ev.clientY - resizeStart.current.y
      setCanvasHeight(Math.max(300, Math.min(1200, resizeStart.current.h + dy)))
    }
    const handleResizeUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleResizeMove)
      document.removeEventListener('mouseup', handleResizeUp)
    }
    document.addEventListener('mousemove', handleResizeMove)
    document.addEventListener('mouseup', handleResizeUp)
  }, [canvasHeight])

  // ── OperIQ Dimension Detection ────────────────────────────────────────

  const handleOperIQDimension = async () => {
    if (!selectedPlanId) return
    setOperiqDimLoading(true)
    try {
      const data = await api.post<any>(`/facility-map/floor-plans/${selectedPlanId}/operiq`, {
        analysisType: 'dimension_detection',
      })
      if (data?.dimensions) {
        setFacilityDimensions({
          xWidth: data.dimensions.width ?? 100,
          yDepth: data.dimensions.depth ?? 50,
          zHeight: data.dimensions.height ?? 10,
        })
      }
      setOperiqResult(data)
    } catch {} finally { setOperiqDimLoading(false) }
  }

  // ── Visible live entities (within 0-100 bounds) ───────────────────────

  const visibleEntities = useMemo(() => {
    return liveEntities.filter(e => e.x >= 0 && e.x <= 100 && e.y >= 0 && e.y <= 100)
  }, [liveEntities])

  // ── New zone form state ────────────────────────────────────────────────

  const [newZone, setNewZone] = useState({ name: '', type: 'MARKER' as string, x: 50, y: 50, z: 0, width: 10, height: 10, color: '#6366f1', layer: 'general', linkedEntityType: '', linkedEntityId: '' })
  const [creatingZone, setCreatingZone] = useState(false)

  const [zoneError, setZoneError] = useState<string | null>(null)
  const [zoneSuccess, setZoneSuccess] = useState(false)

  const handleCreateZone = async () => {
    if (!selectedPlanId || !newZone.name.trim()) return
    setCreatingZone(true)
    setZoneError(null)
    try {
      const isArea = ['ZONE', 'STOCK_AREA', 'DEPARTMENT', 'HAZARD'].includes(newZone.type)
      const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
      const body: Record<string, unknown> = {
        type: newZone.type,
        name: newZone.name.trim(),
        x: clamp(Number(newZone.x) || 50, 0, 100),
        y: clamp(Number(newZone.y) || 50, 0, 100),
        color: newZone.color || '#6366f1',
        layer: newZone.layer || 'general',
      }
      if (isArea) {
        body.width = clamp(Number(newZone.width) || 10, 0, 100)
        body.height = clamp(Number(newZone.height) || 10, 0, 100)
      }
      if (newZone.linkedEntityType && newZone.linkedEntityId) {
        body.linkedEntityType = newZone.linkedEntityType
        body.linkedEntityId = newZone.linkedEntityId
      }

      await api.post(`/facility-map/floor-plans/${selectedPlanId}/zones`, body)
      setShowCreateZone(false)
      setNewZone({ name: '', type: 'MARKER', x: 50, y: 50, z: 0, width: 10, height: 10, color: '#6366f1', layer: 'general', linkedEntityType: '', linkedEntityId: '' })
      setZoneSuccess(true)
      setTimeout(() => setZoneSuccess(false), 3000)
      loadLiveData()
    } catch (e: any) {
      setZoneError(e.message ?? 'Alan olusturulamadi')
    } finally { setCreatingZone(false) }
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
      const body = await res.json()
      if (!res.ok) throw new Error(body.message || 'Y\u00fckleme ba\u015far\u0131s\u0131z')
      setShowUpload(false)
      setUploadName('')
      setUploadFloor('')
      setUploadFile(null)
      await loadFloorPlans()
      setSelectedPlanId(body.data.id)
    } catch (e: any) { alert(e.message || 'Dosya y\u00fcklenemedi') } finally { setUploading(false) }
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
        @keyframes entityPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.6); } 50% { box-shadow: 0 0 0 6px rgba(34,197,94,0); } }
        .facility-pulse { animation: facilityPulse 2s ease-in-out infinite; }
        .facility-fade-in { animation: facilityFadeIn 0.6s ease-out; }
        .marker-bounce { animation: markerBounce 2s ease-in-out infinite; }
        .entity-pulse { animation: entityPulse 1.5s ease-in-out infinite; }
        .map-canvas-3d {
          transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1), perspective 0.8s ease;
        }
        .map-canvas-2d {
          transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1), perspective 0.8s ease;
        }
        .elevation-indicator {
          position: absolute;
          right: -24px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 8px;
          font-weight: 700;
          color: #64748b;
          white-space: nowrap;
        }
        .resize-handle {
          cursor: ns-resize;
          user-select: none;
          touch-action: none;
        }
        .resize-handle:hover {
          background: var(--accent-bg) !important;
        }
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
                <Plus size={14} /> {lang === 'tr' ? (editMode ? 'Düzenleme Aktif' : 'Düzenle') : (editMode ? 'Editing' : 'Edit')}
              </button>
              {zoneSuccess && (
                <div className="card px-3 py-2 flex items-center gap-1.5 text-[12px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse">
                  <CheckCircle2 size={14} /> {lang === 'tr' ? 'Alan oluşturuldu!' : 'Zone created!'}
                </div>
              )}
              <button type="button" onClick={() => setEmergencyMode(!emergencyMode)}
                className={clsx('card px-3 py-2 flex items-center gap-1.5 text-[12px] font-bold transition-all', emergencyMode ? 'bg-red-600 text-white border-red-600' : 'hover:shadow-md')}
                style={!emergencyMode ? { color: 'var(--text-1)' } : undefined}>
                <AlertTriangle size={14} /> {lang === 'tr' ? 'Acil Durum' : 'Emergency'}
              </button>
              <button type="button" onClick={() => handleOperIQ()} disabled={operiqLoading}
                className="card px-3 py-2 flex items-center gap-1.5 text-[12px] font-semibold hover:shadow-md transition-all" style={{ color: '#14b8a6' }}>
                {operiqLoading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} OperIQ
              </button>
              <button type="button" onClick={() => setView3D(!view3D)}
                className={clsx('card px-3 py-2 flex items-center gap-1.5 text-[12px] font-semibold transition-all', view3D ? 'ring-2 ring-violet-400 shadow-lg' : 'hover:shadow-md')}
                style={{ color: view3D ? '#8b5cf6' : 'var(--text-1)' }}>
                <Box size={14} /> {lang === 'tr' ? (view3D ? '3D Aktif' : '3D Goruntule') : (view3D ? '3D Active' : '3D View')}
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
            <div className="card flex items-center justify-center" style={{ height: `${canvasHeight}px` }}>
              <Loader2 size={32} className="animate-spin" style={{ color: 'var(--text-3)' }} />
            </div>
          ) : !selectedPlan ? (
            <div className="card flex flex-col items-center justify-center gap-4" style={{ height: `${canvasHeight}px` }}>
              <Building2 size={48} style={{ color: 'var(--text-3)', opacity: 0.3 }} />
              <p className="text-[14px] font-semibold" style={{ color: 'var(--text-2)' }}>
                {lang === 'tr' ? 'Henuz kat plani yuklenmemis' : 'No floor plan uploaded yet'}
              </p>
              <button type="button" onClick={() => setShowUpload(true)} className="btn-primary">
                <Upload size={14} /> {lang === 'tr' ? 'Plan Yukle' : 'Upload Plan'}
              </button>
            </div>
          ) : (
            <div className="relative">
              {/* Zoom controls */}
              <div className="absolute top-3 right-3 z-30 flex flex-col gap-1">
                <button type="button" onClick={() => setTransform(p => ({ ...p, scale: Math.min(5, p.scale + 0.25) }))}
                  className="card w-8 h-8 flex items-center justify-center hover:shadow-md transition-all" title={lang === 'tr' ? 'Yaklas' : 'Zoom in'}>
                  <ZoomIn size={14} style={{ color: 'var(--text-2)' }} />
                </button>
                <button type="button" onClick={() => setTransform(p => ({ ...p, scale: Math.max(0.25, p.scale - 0.25) }))}
                  className="card w-8 h-8 flex items-center justify-center hover:shadow-md transition-all" title={lang === 'tr' ? 'Uzaklas' : 'Zoom out'}>
                  <ZoomOut size={14} style={{ color: 'var(--text-2)' }} />
                </button>
                <button type="button" onClick={resetTransform}
                  className="card w-8 h-8 flex items-center justify-center hover:shadow-md transition-all" title={lang === 'tr' ? 'Sifirla' : 'Reset'}>
                  <RotateCcw size={14} style={{ color: 'var(--text-2)' }} />
                </button>
                <div className="card px-1 py-1 text-[9px] font-bold text-center" style={{ color: 'var(--text-3)' }}>
                  {Math.round(transform.scale * 100)}%
                </div>
              </div>

              {/* Rotation controls */}
              <div className="absolute top-3 right-14 z-30 flex flex-col gap-1">
                <button type="button" onClick={() => setRotation(p => ({ ...p, z: p.z - 15 }))}
                  className="card w-8 h-8 flex items-center justify-center hover:shadow-md transition-all" title={lang === 'tr' ? 'Sola d\u00f6nd\u00fcr' : 'Rotate left'}>
                  <RotateCcw size={12} style={{ color: 'var(--text-2)' }} />
                </button>
                <button type="button" onClick={() => setRotation(p => ({ ...p, z: p.z + 15 }))}
                  className="card w-8 h-8 flex items-center justify-center hover:shadow-md transition-all" title={lang === 'tr' ? 'Sa\u011fa d\u00f6nd\u00fcr' : 'Rotate right'}>
                  <RotateCw size={12} style={{ color: 'var(--text-2)' }} />
                </button>
                {view3D && (
                  <>
                    <button type="button" onClick={() => setRotation(p => ({ ...p, x: Math.min(90, p.x + 15) }))}
                      className="card w-8 h-8 flex items-center justify-center hover:shadow-md transition-all text-[10px] font-bold" style={{ color: 'var(--text-2)' }} title="Tilt up">
                      <ChevronUp size={14} />
                    </button>
                    <button type="button" onClick={() => setRotation(p => ({ ...p, x: Math.max(-90, p.x - 15) }))}
                      className="card w-8 h-8 flex items-center justify-center hover:shadow-md transition-all text-[10px] font-bold" style={{ color: 'var(--text-2)' }} title="Tilt down">
                      <ChevronDown size={14} />
                    </button>
                  </>
                )}
                <button type="button" onClick={() => setRotation(view3D ? { x: 45, y: 0, z: -15 } : { x: 0, y: 0, z: 0 })}
                  className="card w-8 h-8 flex items-center justify-center hover:shadow-md transition-all text-[9px] font-bold" style={{ color: 'var(--text-3)' }} title="Reset rotation">
                  0&deg;
                </button>
                <div className="card px-1 py-1 text-[8px] font-bold text-center leading-tight" style={{ color: 'var(--text-3)' }}>
                  {Math.round(rotation.z)}&deg;
                </div>
              </div>

              {/* 3D mode indicator */}
              {view3D && (
                <div className="absolute top-3 left-14 px-3 py-1.5 rounded-lg text-[11px] font-bold z-20"
                  style={{ background: 'rgba(139,92,246,0.9)', color: '#fff' }}>
                  3D {lang === 'tr' ? 'G\u00f6r\u00fcn\u00fcm' : 'View'} - {facilityDimensions.xWidth}x{facilityDimensions.yDepth}x{facilityDimensions.zHeight}m
                </div>
              )}

              <div
                ref={canvasRef}
                className={clsx(
                  'card relative overflow-hidden facility-fade-in',
                  editMode && 'cursor-crosshair',
                  emergencyMode && 'ring-2 ring-red-500',
                  !editMode && !isDragging && !isRotating && 'cursor-grab',
                  isDragging && 'cursor-grabbing',
                  isRotating && 'cursor-move',
                  view3D ? 'map-canvas-3d' : 'map-canvas-2d',
                )}
                style={{
                  height: `${canvasHeight}px`,
                  background: emergencyMode ? 'rgba(127,29,29,0.05)' : 'var(--surface)',
                  perspective: view3D ? '1200px' : 'none',
                }}
                onClick={handleCanvasClick}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                onContextMenu={e => e.preventDefault()}
              >
                {/* Transformable inner container */}
                <div
                  className={view3D ? 'map-canvas-3d' : 'map-canvas-2d'}
                  style={{
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                    transformOrigin: 'center center',
                    transform: view3D
                      ? `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale}) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(${rotation.z}deg)`
                      : `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale}) rotateZ(${rotation.z}deg)`,
                    transformStyle: view3D ? 'preserve-3d' : 'flat',
                  }}
                >
                  {/* Floor plan image + zone overlays (same wrapper so % coordinates match image) */}
                  <div className="relative w-full" style={{ display: 'inline-block' }}>
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

                  {/* Zone overlays - positioned relative to image */}
                  {visibleZones.map(zone => {
                    const isArea = ['ZONE', 'STOCK_AREA', 'DEPARTMENT', 'HAZARD', 'EMERGENCY_EXIT'].includes(zone.type) && zone.width && zone.height
                    const isSelected = selectedZone?.id === zone.id
                    const isCritical = zone.liveData?.status === 'CRITICAL' || zone.liveData?.level === 'critical' || zone.type === 'HAZARD'
                    const isWarning = zone.liveData?.status === 'WARNING' || zone.liveData?.level === 'warning'
                    const zoneZ = zone.metadata?.z ?? 0

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
                          transform: view3D && zoneZ
                            ? `${isArea ? 'none' : 'translate(-50%, -50%)'} translateZ(${zoneZ * 4}px)`
                            : isArea ? 'none' : 'translate(-50%, -50%)',
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

                        {/* Elevation indicator (3D mode) */}
                        {view3D && zoneZ > 0 && (
                          <span className="elevation-indicator">Z:{zoneZ}m</span>
                        )}

                        {/* Hover tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30"
                          style={{ background: 'rgba(15,23,42,0.9)', color: '#fff' }}>
                          {zone.name}{view3D && zoneZ ? ` (Z: ${zoneZ}m)` : ''}
                        </div>
                      </div>
                    )
                  })}

                  {/* Live personnel markers — green (online <5min), grey (offline) */}
                  {visibleEntities.filter(e => e.type === 'personnel').map(entity => {
                    const msSince = entity.lastSeen ? Date.now() - new Date(entity.lastSeen).getTime() : Infinity
                    const isOnline = msSince < 5 * 60 * 1000
                    const pColor = isOnline ? '#22c55e' : '#94a3b8'
                    const pRgba = isOnline ? 'rgba(34,197,94,0.4)' : 'rgba(148,163,184,0.3)'
                    const tooltipBg = isOnline ? 'rgba(34,197,94,0.95)' : 'rgba(100,116,139,0.9)'
                    return (
                    <div
                      key={`person-${entity.id}`}
                      className={`absolute cursor-pointer group ${isOnline ? 'entity-pulse' : ''}`}
                      style={{
                        left: `${entity.x}%`,
                        top: `${entity.y}%`,
                        width: '24px',
                        height: '24px',
                        transform: view3D && entity.z
                          ? `translate(-50%, -50%) translateZ(${(entity.z ?? 0) * 4}px)`
                          : 'translate(-50%, -50%)',
                        borderRadius: '50%',
                        background: pColor,
                        border: '2px solid #fff',
                        boxShadow: `0 2px 8px ${pRgba}`,
                        zIndex: 25,
                      }}
                    >
                      <div className="w-full h-full flex items-center justify-center">
                        <User size={10} className="text-white" />
                      </div>
                      {/* Name tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-md text-[9px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30"
                        style={{ background: tooltipBg, color: '#fff' }}>
                        {entity.name}{entity.department ? ` - ${entity.department}` : ''}
                      </div>
                    </div>
                    )
                  })}

                  {/* Live equipment markers */}
                  {visibleEntities.filter(e => e.type === 'equipment').map(entity => (
                    <div
                      key={`equip-${entity.id}`}
                      className="absolute cursor-pointer group"
                      style={{
                        left: `${entity.x}%`,
                        top: `${entity.y}%`,
                        width: '22px',
                        height: '22px',
                        transform: view3D && entity.z
                          ? `translate(-50%, -50%) translateZ(${(entity.z ?? 0) * 4}px)`
                          : 'translate(-50%, -50%)',
                        borderRadius: '4px',
                        background: '#f59e0b',
                        border: '2px solid #fff',
                        boxShadow: '0 2px 8px rgba(245,158,11,0.4)',
                        zIndex: 24,
                      }}
                    >
                      <div className="w-full h-full flex items-center justify-center">
                        <Wrench size={10} className="text-white" />
                      </div>
                      {/* Name tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-md text-[9px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30"
                        style={{ background: 'rgba(245,158,11,0.95)', color: '#fff' }}>
                        {entity.name}{entity.status ? ` (${entity.status})` : ''}
                      </div>
                    </div>
                  ))}
                  </div>{/* end image+zones wrapper */}
                </div>

                {/* Edit mode indicator */}
                {editMode && (
                  <div className="absolute top-3 left-3 px-3 py-1.5 rounded-lg text-[11px] font-bold z-20"
                    style={{ background: 'rgba(6,182,212,0.9)', color: '#fff' }}>
                    {lang === 'tr' ? 'Düzenleme modu - plana tıklayarak alan ekleyin' : 'Edit mode - click on plan to add zones'}
                  </div>
                )}

                {/* Live entities legend */}
                {visibleEntities.length > 0 && (
                  <div className="absolute bottom-3 left-3 z-20 flex items-center gap-3 px-3 py-1.5 rounded-lg"
                    style={{ background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(4px)' }}>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full" style={{ background: '#3b82f6', border: '1.5px solid #fff' }} />
                      <span className="text-[9px] font-semibold text-white">
                        {visibleEntities.filter(e => e.type === 'personnel').length} {lang === 'tr' ? 'Personel' : 'Personnel'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded" style={{ background: '#f59e0b', border: '1.5px solid #fff' }} />
                      <span className="text-[9px] font-semibold text-white">
                        {visibleEntities.filter(e => e.type === 'equipment').length} {lang === 'tr' ? 'Ekipman' : 'Equipment'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Resize handle */}
              <div
                className="resize-handle flex items-center justify-center py-1 rounded-b-lg"
                style={{ background: 'var(--border-subtle)', border: '1px solid var(--border)', borderTop: 'none' }}
                onMouseDown={handleResizeMouseDown}
              >
                <GripVertical size={14} style={{ color: 'var(--text-3)', transform: 'rotate(90deg)' }} />
              </div>
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
              <InfoRow label={lang === 'tr' ? 'Konum' : 'Position'} value={`X: ${selectedZone.x.toFixed(1)}% Y: ${selectedZone.y.toFixed(1)}%${selectedZone.metadata?.z ? ` Z: ${selectedZone.metadata.z}m` : ''}`} />
            </div>

            {/* Live data */}
            {selectedZone.liveData && (
              <div className="p-3 rounded-lg" style={{ background: 'var(--border-subtle)', border: '1px solid var(--border)' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--accent)' }}>
                  {lang === 'tr' ? 'Canlı Veri' : 'Live Data'}
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
            {/* 3D Facility Dimensions (optional) */}
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-3)' }}>
                {lang === 'tr' ? '3D Boyutlar (istege bagli)' : '3D Dimensions (optional)'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[9px] mb-0.5" style={{ color: 'var(--text-3)' }}>X ({lang === 'tr' ? 'Genislik' : 'Width'}) m</label>
                  <input type="number" className="input" min={1} step={1} value={facilityDimensions.xWidth}
                    onChange={e => setFacilityDimensions(p => ({ ...p, xWidth: +e.target.value }))} />
                </div>
                <div>
                  <label className="block text-[9px] mb-0.5" style={{ color: 'var(--text-3)' }}>Y ({lang === 'tr' ? 'Derinlik' : 'Depth'}) m</label>
                  <input type="number" className="input" min={1} step={1} value={facilityDimensions.yDepth}
                    onChange={e => setFacilityDimensions(p => ({ ...p, yDepth: +e.target.value }))} />
                </div>
                <div>
                  <label className="block text-[9px] mb-0.5" style={{ color: 'var(--text-3)' }}>Z ({lang === 'tr' ? 'Yukseklik' : 'Height'}) m</label>
                  <input type="number" className="input" min={1} step={1} value={facilityDimensions.zHeight}
                    onChange={e => setFacilityDimensions(p => ({ ...p, zHeight: +e.target.value }))} />
                </div>
              </div>
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
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-3)' }}>X %</label>
                <input type="number" className="input" min={0} max={100} step={0.1} value={newZone.x} onChange={e => setNewZone({ ...newZone, x: +e.target.value })} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-3)' }}>Y %</label>
                <input type="number" className="input" min={0} max={100} step={0.1} value={newZone.y} onChange={e => setNewZone({ ...newZone, y: +e.target.value })} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-3)' }}>Z (m)</label>
                <input type="number" className="input" min={0} max={200} step={0.5} value={newZone.z} onChange={e => setNewZone({ ...newZone, z: +e.target.value })} placeholder="0" />
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
            {zoneError && (
              <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[11px] font-medium">{zoneError}</div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowCreateZone(false)} className="btn-secondary">{lang === 'tr' ? 'Iptal' : 'Cancel'}</button>
              <button type="button" onClick={handleCreateZone} disabled={creatingZone || !newZone.name.trim()} className="btn-primary disabled:opacity-40">
                {creatingZone ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} {lang === 'tr' ? 'Oluştur' : 'Create'}
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
          {visibleEntities.length > 0 && (
            <>
              <span>-</span>
              <span className="flex items-center gap-1">
                <User size={10} className="text-blue-500" /> {visibleEntities.filter(e => e.type === 'personnel').length}
                <Wrench size={10} className="text-amber-500 ml-1" /> {visibleEntities.filter(e => e.type === 'equipment').length}
              </span>
            </>
          )}
          <button type="button" onClick={handleOperIQDimension} disabled={operiqDimLoading}
            className="flex items-center gap-1 text-teal-500 hover:text-teal-600 transition-colors"
            title={lang === 'tr' ? 'OperIQ ile boyut tanima' : 'OperIQ dimension detection'}>
            {operiqDimLoading ? <Loader2 size={11} className="animate-spin" /> : <Scan size={11} />}
            {lang === 'tr' ? 'OperIQ ile Boyut Tanima' : 'OperIQ Dimension Detection'}
          </button>
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
