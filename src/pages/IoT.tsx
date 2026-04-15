import { useState, useEffect, useRef } from 'react'
import {
  Cpu, Wifi, WifiOff, AlertTriangle, Plus, Search, Trash2, Settings2,
  Activity, Thermometer, Droplets, Gauge, Radio, RefreshCw, ChevronDown,
  CheckCircle2, XCircle, Wrench, Signal, MapPin, Clock, Loader2, X,
} from 'lucide-react'
import clsx from 'clsx'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { useDepartments } from '../lib/hooks'
import { useToolbarActions } from '../lib/useToolbarActions'
import DraggableModal from '../components/ui/DraggableModal'

// ── Types ──────────────────────────────────────────────────────────────────

interface IoTDevice {
  id: string
  name: string
  deviceId: string
  type: string
  protocol: string | null
  location: string | null
  status: 'ONLINE' | 'OFFLINE' | 'WARNING' | 'CRITICAL' | 'MAINTENANCE'
  lastPayload: Record<string, number> | null
  lastSeenAt: string | null
  alertRules: Record<string, { min?: number; max?: number }> | null
  metadata: Record<string, any> | null
  departmentId: string | null
  active: boolean
  createdAt: string
}

interface DashboardData {
  totalDevices: number
  onlineCount: number
  warningCount: number
  criticalCount: number
  offlineCount: number
  maintenanceCount: number
  recentAlerts: any[]
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Wifi }> = {
  ONLINE:      { label: 'Aktif',       color: 'text-green-600',  bg: 'bg-green-100',  icon: Wifi },
  OFFLINE:     { label: 'Çevrimdışı',  color: 'text-slate-500',  bg: 'bg-slate-100',  icon: WifiOff },
  WARNING:     { label: 'Uyarı',       color: 'text-amber-600',  bg: 'bg-amber-100',  icon: AlertTriangle },
  CRITICAL:    { label: 'Kritik',      color: 'text-red-600',    bg: 'bg-red-100',    icon: XCircle },
  MAINTENANCE: { label: 'Bakımda',     color: 'text-blue-600',   bg: 'bg-blue-100',   icon: Wrench },
}

const DEVICE_TYPES = ['sensor', 'plc', 'gateway', 'actuator', 'meter', 'camera', 'robot', 'conveyor']
const PROTOCOLS = ['mqtt', 'modbus', 'opcua', 'http', 'tcp', 'ble', 'zigbee', 'lora']

// ── Sensor value icon ──────────────────────────────────────────────────────

function SensorIcon({ field }: { field: string }) {
  const f = field.toLowerCase()
  if (f.includes('temp') || f.includes('sicaklik')) return <Thermometer size={12} className="text-red-400" />
  if (f.includes('humid') || f.includes('nem')) return <Droplets size={12} className="text-blue-400" />
  if (f.includes('press') || f.includes('basinc')) return <Gauge size={12} className="text-purple-400" />
  if (f.includes('vibra') || f.includes('titresim')) return <Activity size={12} className="text-amber-400" />
  return <Radio size={12} className="text-slate-400" />
}

// ── Component ──────────────────────────────────────────────────────────────

export default function IoT() {
  const { t, lang } = useLanguage()
  const { user } = useAuth()
  const { departments } = useDepartments()
  const searchRef = useRef<HTMLInputElement>(null)

  const [devices, setDevices] = useState<IoTDevice[]>([])
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('tumu')
  const [filterType, setFilterType] = useState<string>('tumu')
  const [showCreate, setShowCreate] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = async () => {
    try {
      const [devRes, dashRes] = await Promise.all([
        api.get<any>('/iot?pageSize=100'),
        api.get<any>('/iot/dashboard'),
      ])
      const devs = devRes?.data ?? (Array.isArray(devRes) ? devRes : [])
      setDevices(devs)
      setDashboard(dashRes as DashboardData)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  useToolbarActions({
    onNew: () => setShowCreate(true),
    onSearch: () => searchRef.current?.focus(),
    onRefresh: handleRefresh,
  })

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/iot/${id}`)
      setDevices(prev => prev.filter(d => d.id !== id))
    } catch {}
  }

  // Filters
  const filtered = devices.filter(d => {
    if (search && !d.name.toLowerCase().includes(search.toLowerCase()) && !d.deviceId.toLowerCase().includes(search.toLowerCase())) return false
    if (filterStatus !== 'tumu' && d.status !== filterStatus) return false
    if (filterType !== 'tumu' && d.type !== filterType) return false
    return true
  })

  return (
    <div className="space-y-5">
      {/* Dashboard KPIs */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { label: 'Toplam Cihaz', value: dashboard.totalDevices, icon: Cpu, color: 'text-slate-700' },
            { label: 'Aktif',        value: dashboard.onlineCount,  icon: CheckCircle2, color: 'text-green-600' },
            { label: 'Uyarı',        value: dashboard.warningCount, icon: AlertTriangle, color: 'text-amber-600' },
            { label: 'Kritik',       value: dashboard.criticalCount, icon: XCircle, color: 'text-red-600' },
            { label: 'Çevrimdışı',   value: dashboard.offlineCount, icon: WifiOff, color: 'text-slate-500' },
            { label: 'Bakımda',      value: dashboard.maintenanceCount, icon: Wrench, color: 'text-blue-600' },
          ].map(item => (
            <div key={item.label} className="card p-4 text-center">
              <item.icon size={18} className={clsx(item.color, 'mx-auto mb-1')} />
              <p className="text-2xl font-bold text-slate-900">{item.value}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Recent Alerts */}
      {dashboard && dashboard.recentAlerts.length > 0 && (
        <div className="card p-4">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <AlertTriangle size={13} /> Son Alarmlar
          </p>
          <div className="space-y-2">
            {dashboard.recentAlerts.slice(0, 5).map((alert: any) => (
              <div key={alert.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-red-50 border border-red-200">
                <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-red-800">{alert.device?.name ?? alert.deviceId}</p>
                  <p className="text-[10px] text-red-600">
                    {alert.alertInfo?.field}: {alert.alertInfo?.value} (esik: {alert.alertInfo?.threshold})
                  </p>
                </div>
                <span className="text-[10px] text-red-400 flex-shrink-0">
                  {new Date(alert.timestamp).toLocaleTimeString(lang === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input ref={searchRef} className="input pl-9" placeholder="Cihaz adı veya ID ara..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select aria-label="Durum filtresi" className="select w-36" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="tumu">Tüm Durumlar</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select aria-label="Tip filtresi" className="select w-36" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="tumu">Tüm Tipler</option>
          {DEVICE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
        <button type="button" onClick={handleRefresh} disabled={refreshing} className="btn-secondary">
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Yenile
        </button>
        <button type="button" onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={16} /> Cihaz Ekle
        </button>
      </div>

      {/* Device Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="card h-48 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Cpu size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">
            {devices.length === 0 ? 'Henüz IoT cihaz eklenmemiş' : 'Filtreye uygun cihaz bulunamadı'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(device => {
            const sc = STATUS_CONFIG[device.status] ?? STATUS_CONFIG.OFFLINE
            const dept = departments.find(d => d.id === device.departmentId)
            return (
              <div key={device.id} className="card p-4 hover:shadow-md transition-all">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center', sc.bg)}>
                      <sc.icon size={16} className={sc.color} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 leading-tight">{device.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{device.deviceId}</p>
                    </div>
                  </div>
                  <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-full', sc.bg, sc.color)}>
                    {sc.label}
                  </span>
                </div>

                {/* Meta */}
                <div className="space-y-1.5 text-xs mb-3">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Settings2 size={11} className="text-slate-400" />
                    <span className="capitalize">{device.type}</span>
                    {device.protocol && <span className="text-slate-300">-</span>}
                    {device.protocol && <span className="uppercase text-[10px] font-mono">{device.protocol}</span>}
                  </div>
                  {device.location && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <MapPin size={11} className="text-slate-400" />
                      <span>{device.location}</span>
                    </div>
                  )}
                  {dept && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Signal size={11} className="text-slate-400" />
                      <span>{dept.name}</span>
                    </div>
                  )}
                </div>

                {/* Last payload */}
                {device.lastPayload && Object.keys(device.lastPayload).length > 0 && (
                  <div className="bg-slate-50 rounded-lg p-2.5 mb-3">
                    <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Son Okunan Veriler</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {Object.entries(device.lastPayload).map(([key, val]) => (
                        <div key={key} className="flex items-center gap-1.5">
                          <SensorIcon field={key} />
                          <span className="text-[10px] text-slate-500 capitalize">{key}:</span>
                          <span className="text-[11px] font-bold text-slate-800">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock size={10} />
                    {device.lastSeenAt
                      ? new Date(device.lastSeenAt).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                      : 'Henüz veri yok'}
                  </span>
                  <button type="button" onClick={() => handleDelete(device.id)}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <CreateDeviceModal
          departments={departments}
          lang={lang}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadData() }}
        />
      )}
    </div>
  )
}

// ── Create Device Modal ────────────────────────────────────────────────────

function CreateDeviceModal({
  departments, lang, onClose, onCreated,
}: {
  departments: { id: string; name: string }[]
  lang: string
  onClose: () => void
  onCreated: () => void
}) {
  const [form, setForm] = useState({
    name: '', deviceId: '', type: 'sensor', protocol: 'mqtt',
    location: '', departmentId: '',
  })
  const [alertRules, setAlertRules] = useState<{ field: string; min: string; max: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const addAlertRule = () => setAlertRules(prev => [...prev, { field: '', min: '', max: '' }])
  const removeAlertRule = (i: number) => setAlertRules(prev => prev.filter((_, idx) => idx !== i))

  const handleSubmit = async () => {
    if (!form.name || !form.deviceId) { setErr('Cihaz adı ve ID zorunlu'); return }
    setSaving(true)
    setErr(null)
    try {
      const rules: Record<string, { min?: number; max?: number }> = {}
      alertRules.forEach(r => {
        if (r.field) {
          rules[r.field] = {}
          if (r.min) rules[r.field].min = Number(r.min)
          if (r.max) rules[r.field].max = Number(r.max)
        }
      })

      await api.post('/iot', {
        name: form.name,
        deviceId: form.deviceId,
        type: form.type,
        protocol: form.protocol || undefined,
        location: form.location || undefined,
        departmentId: form.departmentId || undefined,
        alertRules: Object.keys(rules).length > 0 ? rules : undefined,
      })
      onCreated()
    } catch (e: any) {
      setErr(e.message ?? 'Cihaz oluşturulamadı')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DraggableModal title="Yeni IoT Cihaz Ekle" icon={<Plus size={13} />} onClose={onClose} width={520}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary">İptal</button>
          <button type="button" onClick={handleSubmit} disabled={saving || !form.name || !form.deviceId} className="btn-primary">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Cihaz Ekle
          </button>
        </>
      }>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-2)' }}>Cihaz Adı *</label>
            <input className="input" placeholder="Sıcaklık Sensörü A1" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-2)' }}>Cihaz ID *</label>
            <input className="input font-mono" placeholder="TEMP-001" value={form.deviceId} onChange={e => setForm({ ...form, deviceId: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-2)' }}>Tip</label>
            <select className="select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              {DEVICE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-2)' }}>Protokol</label>
            <select className="select" value={form.protocol} onChange={e => setForm({ ...form, protocol: e.target.value })}>
              {PROTOCOLS.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-2)' }}>Departman</label>
            <select className="select" value={form.departmentId} onChange={e => setForm({ ...form, departmentId: e.target.value })}>
              <option value="">Seçilmemiş</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-2)' }}>Konum</label>
          <input className="input" placeholder="Üretim Hattı 1, Bina A" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
        </div>

        {/* Alert rules */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-semibold" style={{ color: 'var(--text-2)' }}>Alarm Eşikleri</label>
            <button type="button" onClick={addAlertRule} className="text-[10px] text-cyan-600 font-semibold flex items-center gap-1">
              <Plus size={11} /> Kural Ekle
            </button>
          </div>
          {alertRules.map((rule, i) => (
            <div key={i} className="flex items-center gap-2 mb-2">
              <input className="input flex-1 text-xs" placeholder="Alan (ör: temperature)" value={rule.field}
                onChange={e => { const r = [...alertRules]; r[i].field = e.target.value; setAlertRules(r) }} />
              <input className="input w-20 text-xs" placeholder="Min" type="number" value={rule.min}
                onChange={e => { const r = [...alertRules]; r[i].min = e.target.value; setAlertRules(r) }} />
              <input className="input w-20 text-xs" placeholder="Max" type="number" value={rule.max}
                onChange={e => { const r = [...alertRules]; r[i].max = e.target.value; setAlertRules(r) }} />
              <button type="button" onClick={() => removeAlertRule(i)} className="text-slate-400 hover:text-red-500">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        {err && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 text-red-500 text-xs border border-red-500/20">
            <AlertTriangle size={13} /> {err}
          </div>
        )}
      </div>
    </DraggableModal>
  )
}
