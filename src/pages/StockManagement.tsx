import { useState, useRef, useMemo } from 'react'
import {
  Package, Plus, Search, Trash2, Pencil, AlertTriangle, X, ShieldAlert,
  ArrowDownCircle, ArrowUpCircle, ArrowRightLeft, Flame,
  TrendingDown, Bell, BarChart3, Loader2, Check, RefreshCw,
  Boxes, AlertCircle, PackageX, PackagePlus,
} from 'lucide-react'
import clsx from 'clsx'
import {
  useStockItems, useStockDashboard, useDepartments,
  createStockItem, updateStockItem, deleteStockItem,
  createStockMovement, fetchStockMovements, fetchAllStockMovements, fetchStockAlerts, updateStockAlertStatus,
  type StockItem, type StockCategory, type StockMovement, type StockAlert, type StockAlertStatus,
} from '../lib/hooks'
import { useToolbarActions } from '../lib/useToolbarActions'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'

const MANAGER_ROLES = ['PLATFORM_ADMIN', 'SUPER_ADMIN', 'GENEL_MUDUR', 'GM_YARDIMCISI', 'DIREKTOR', 'MUDUR']
import DraggableModal from '../components/ui/DraggableModal'
import StockDashboardCharts from '../components/stock/StockDashboardCharts'

// ── Labels & Styles ───────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<StockCategory, string> = {
  DEMIRBAS:    'Demirbas',
  SARF:        'Sarf Malzemesi',
  YEDEK_PARCA: 'Yedek Parca',
}

const CATEGORY_STYLES: Record<StockCategory, string> = {
  DEMIRBAS:    'bg-blue-50 text-blue-700 border-blue-200',
  SARF:        'bg-emerald-50 text-emerald-700 border-emerald-200',
  YEDEK_PARCA: 'bg-purple-50 text-purple-700 border-purple-200',
}

const MOVEMENT_CONFIG: Record<string, { label: string; icon: typeof ArrowDownCircle; color: string }> = {
  GIRIS:    { label: 'Giris',    icon: ArrowDownCircle, color: 'text-emerald-600' },
  CIKIS:    { label: 'Cikis',    icon: ArrowUpCircle,   color: 'text-red-500' },
  TRANSFER: { label: 'Transfer', icon: ArrowRightLeft,  color: 'text-blue-500' },
  FIRE:     { label: 'Fire',     icon: Flame,           color: 'text-orange-500' },
}

const SEVERITY_STYLES: Record<string, string> = {
  KRITIK: 'bg-red-50 text-red-700 border-red-200',
  YUKSEK: 'bg-orange-50 text-orange-700 border-orange-200',
  ORTA:   'bg-amber-50 text-amber-700 border-amber-200',
  DUSUK:  'bg-slate-50 text-slate-600 border-slate-200',
}

const TRY = (n: number | string | undefined | null) => {
  if (n === undefined || n === null) return '-'
  const v = typeof n === 'string' ? Number(n) : n
  if (Number.isNaN(v)) return '-'
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v)
}

type Tab = 'dashboard' | 'items' | 'movements' | 'alerts'

// ── Stock level bar ───────────────────────────────────────────────────────

function StockBar({ item }: { item: StockItem }) {
  const max = item.maxLevel ?? Math.max(item.quantity, item.minLevel * 2, 100)
  const pct = max > 0 ? Math.min((item.quantity / max) * 100, 100) : 0
  const isCritical = item.criticalLevel > 0 && item.quantity <= item.criticalLevel
  const isBelowMin = item.quantity < item.minLevel

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2 rounded-full bg-zinc-100 overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all', {
            'bg-red-500':     isCritical,
            'bg-amber-500':   !isCritical && isBelowMin,
            'bg-emerald-500': !isCritical && !isBelowMin,
          })}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={clsx('text-xs font-semibold tabular-nums min-w-[36px] text-right', {
        'text-red-600':     isCritical,
        'text-amber-600':   !isCritical && isBelowMin,
        'text-zinc-700':    !isCritical && !isBelowMin,
      })}>
        {item.quantity}
      </span>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────

export default function StockManagement() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const canManage = MANAGER_ROLES.includes(user?.role?.toUpperCase() ?? '')
  const [tab, setTab] = useState<Tab>('dashboard')
  const [category, setCategory] = useState<StockCategory | ''>('')
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<StockItem | null>(null)
  const [movementItem, setMovementItem] = useState<StockItem | null>(null)
  const [movementHistory, setMovementHistory] = useState<{ item: StockItem; movements: StockMovement[] } | null>(null)
  const [alerts, setAlerts] = useState<StockAlert[]>([])
  const [alertsLoading, setAlertsLoading] = useState(false)
  const [permPopup, setPermPopup] = useState(false)
  const [allMovements, setAllMovements] = useState<any[]>([])
  const [allMovementsLoading, setAllMovementsLoading] = useState(false)

  const loadAllMovements = async () => {
    setAllMovementsLoading(true)
    try {
      const res = await fetchAllStockMovements()
      setAllMovements(res.data ?? [])
    } catch {} finally { setAllMovementsLoading(false) }
  }

  const requireManager = (action: () => void) => {
    if (canManage) { action() } else { setPermPopup(true) }
  }
  const searchRef = useRef<HTMLInputElement>(null)

  const { items, total, loading, refetch } = useStockItems({
    category: category || undefined,
    search: search || undefined,
  })
  const { data: dashboard, loading: dashLoading, refetch: refetchDash } = useStockDashboard()
  const { departments } = useDepartments()

  // Toolbar
  useToolbarActions({
    onNew:     () => setCreating(true),
    onSearch:  () => { setTab('items'); searchRef.current?.focus() },
    onRefresh: () => { refetch(); refetchDash() },
  })

  // Load alerts
  const loadAlerts = async () => {
    setAlertsLoading(true)
    try {
      const res = await fetchStockAlerts()
      setAlerts(res.data ?? [])
    } catch { /* ignore */ }
    setAlertsLoading(false)
  }

  // ── CRUD handlers ──────────────────────────────────────────────────────

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const body: Record<string, unknown> = {
      name:          fd.get('name'),
      code:          fd.get('code') || undefined,
      category:      fd.get('category'),
      unit:          fd.get('unit'),
      departmentId:  fd.get('departmentId') || undefined,
      locationName:  fd.get('locationName') || undefined,
      quantity:      Number(fd.get('quantity')) || 0,
      minLevel:      Number(fd.get('minLevel')) || 0,
      maxLevel:      Number(fd.get('maxLevel')) || undefined,
      criticalLevel: Number(fd.get('criticalLevel')) || 0,
      vendor:        fd.get('vendor') || undefined,
      unitCost:      Number(fd.get('unitCost')) || undefined,
      barcode:       fd.get('barcode') || undefined,
      description:   fd.get('description') || undefined,
    }
    await createStockItem(body)
    setCreating(false)
    refetch()
    refetchDash()
  }

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    if (!editing) return
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const body: Record<string, unknown> = {
      name:          fd.get('name'),
      code:          fd.get('code') || undefined,
      category:      fd.get('category'),
      unit:          fd.get('unit'),
      departmentId:  fd.get('departmentId') || undefined,
      locationName:  fd.get('locationName') || undefined,
      quantity:      Number(fd.get('quantity')),
      minLevel:      Number(fd.get('minLevel')) || 0,
      maxLevel:      Number(fd.get('maxLevel')) || undefined,
      criticalLevel: Number(fd.get('criticalLevel')) || 0,
      vendor:        fd.get('vendor') || undefined,
      unitCost:      Number(fd.get('unitCost')) || undefined,
      barcode:       fd.get('barcode') || undefined,
      description:   fd.get('description') || undefined,
    }
    await updateStockItem(editing.id, body)
    setEditing(null)
    refetch()
    refetchDash()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu stok kalemini silmek istediginize emin misiniz? Bu islem geri alinamaz.')) return
    await deleteStockItem(id)
    refetch()
    refetchDash()
  }

  const handleMovement = async (e: React.FormEvent<HTMLFormElement>) => {
    if (!movementItem) return
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const reason = fd.get('reason') as string
    const desc = fd.get('description') as string
    const fullDesc = [reason, desc].filter(Boolean).join(' - ')
    await createStockMovement(movementItem.id, {
      type:         fd.get('type'),
      quantity:     Number(fd.get('quantity')),
      fromLocation: fd.get('fromLocation') || undefined,
      toLocation:   fd.get('toLocation') || undefined,
      description:  fullDesc || undefined,
    })
    setMovementItem(null)
    refetch()
    refetchDash()
  }

  const openHistory = async (item: StockItem) => {
    const res = await fetchStockMovements(item.id)
    setMovementHistory({ item, movements: res.data ?? [] })
  }

  const handleAlertResolve = async (id: string) => {
    await updateStockAlertStatus(id, 'COZULDU')
    loadAlerts()
  }

  // Filtered items for dashboard critical view
  const criticalItems = useMemo(
    () => items.filter(i => (i.criticalLevel > 0 && i.quantity <= i.criticalLevel) || i.quantity < i.minLevel),
    [items],
  )

  // ── TAB: Dashboard ─────────────────────────────────────────────────────

  const renderDashboard = () => {
    const d = dashboard
    return (
      <div className="space-y-6">
        {/* Info: sync from inventory */}
        {d && d.totalItems === 0 && !dashLoading && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200">
            <Boxes size={18} className="text-blue-600 flex-shrink-0" />
            <p className="text-xs text-blue-800">
              <span className="font-semibold">Stok verileri Envanter modulunden otomatik senkronize edilir.</span>{' '}
              Toplu veri yuklemek icin Envanter sayfasindaki "Toplu Aktar" butonunu kullanin.
            </p>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard icon={Boxes} label="Toplam Kalem" value={d?.totalItems ?? 0} color="text-blue-600" bg="bg-blue-50" />
          <SummaryCard icon={Package} label="Toplam Miktar" value={d?.totalQuantity ?? 0} color="text-emerald-600" bg="bg-emerald-50" />
          <SummaryCard icon={AlertTriangle} label="Min Altinda" value={d?.belowMin ?? 0} color="text-amber-600" bg="bg-amber-50" alert={!!d?.belowMin} />
          <SummaryCard icon={AlertCircle} label="Kritik" value={d?.critical ?? 0} color="text-red-600" bg="bg-red-50" alert={!!d?.critical} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard icon={PackageX} label="Stokta Yok" value={d?.outOfStock ?? 0} color="text-red-500" bg="bg-red-50" />
          <SummaryCard icon={PackagePlus} label="Fazla Stok" value={d?.overstock ?? 0} color="text-purple-600" bg="bg-purple-50" />
          <SummaryCard icon={Bell} label="Aktif Uyari" value={d?.activeAlerts ?? 0} color="text-orange-600" bg="bg-orange-50" />
          <SummaryCard icon={BarChart3} label="Son Hareketler" value={d?.recentMovements ?? 0} color="text-indigo-600" bg="bg-indigo-50" />
        </div>

        {/* Category breakdown */}
        {d?.byCategory && (
          <div className="bg-white rounded-xl border border-zinc-200 p-5">
            <h3 className="text-sm font-semibold text-zinc-800 mb-4">Kategori Dagilimi</h3>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center gap-3">
                  <div className={clsx('px-2.5 py-1 rounded-md text-xs font-semibold border', CATEGORY_STYLES[key as StockCategory])}>
                    {label}
                  </div>
                  <span className="text-lg font-bold text-zinc-900">{d.byCategory[key] ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Critical items */}
        {criticalItems.length > 0 && (
          <div className="bg-white rounded-xl border border-red-200 p-5">
            <h3 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
              <AlertTriangle size={16} /> Kritik Stok Kalemleri ({criticalItems.length})
            </h3>
            <div className="space-y-2">
              {criticalItems.slice(0, 10).map(item => (
                <div key={item.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-red-50/50 border border-red-100">
                  <span className="text-sm font-medium text-zinc-800 flex-1 truncate">{item.name}</span>
                  <span className={clsx('text-xs px-2 py-0.5 rounded border', CATEGORY_STYLES[item.category])}>
                    {CATEGORY_LABELS[item.category]}
                  </span>
                  <StockBar item={item} />
                  <span className="text-xs text-zinc-500">min: {item.minLevel}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Charts Section */}
        <StockDashboardCharts />

        {dashLoading && !dashboard && (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-zinc-400" size={24} />
          </div>
        )}
      </div>
    )
  }

  // ── TAB: Items ─────────────────────────────────────────────────────────

  const renderItems = () => (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Stok ara..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
        <div className="flex gap-1.5">
          {(['', 'DEMIRBAS', 'SARF', 'YEDEK_PARCA'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat as StockCategory | '')}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                category === cat
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50',
              )}
            >
              {cat === '' ? 'Tumu' : CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
        <button
          onClick={() => requireManager(() => setCreating(true))}
          className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> Yeni Kalem
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-zinc-400" size={24} /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-zinc-400 text-sm">Stok kalemi bulunamadi</div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="text-left px-4 py-3 font-semibold text-zinc-600">Ad</th>
                  <th className="text-left px-4 py-3 font-semibold text-zinc-600">Kod</th>
                  <th className="text-left px-4 py-3 font-semibold text-zinc-600">Kategori</th>
                  <th className="text-left px-4 py-3 font-semibold text-zinc-600">Departman</th>
                  <th className="text-left px-4 py-3 font-semibold text-zinc-600">Lokasyon</th>
                  <th className="text-left px-4 py-3 font-semibold text-zinc-600">Stok Durumu</th>
                  <th className="text-right px-4 py-3 font-semibold text-zinc-600">Birim Maliyet</th>
                  <th className="text-right px-4 py-3 font-semibold text-zinc-600">Islemler</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <button onClick={() => openHistory(item)} className="font-medium text-zinc-900 hover:text-blue-600 transition-colors text-left">
                        {item.name}
                      </button>
                      {item.vendor && <p className="text-xs text-zinc-400 mt-0.5">{item.vendor}</p>}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 font-mono text-xs">{item.code ?? '-'}</td>
                    <td className="px-4 py-3">
                      <span className={clsx('px-2 py-0.5 rounded text-xs font-semibold border', CATEGORY_STYLES[item.category])}>
                        {CATEGORY_LABELS[item.category]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 text-xs">{item.department?.name ?? '-'}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">{item.locationName ?? '-'}</td>
                    <td className="px-4 py-3"><StockBar item={item} /></td>
                    <td className="px-4 py-3 text-right text-zinc-600">{TRY(item.unitCost)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => requireManager(() => setMovementItem(item))}
                          title="Hareket Ekle"
                          className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600 transition-colors"
                        >
                          <ArrowDownCircle size={15} />
                        </button>
                        <button
                          onClick={() => requireManager(() => setEditing(item))}
                          title="Duzenle"
                          className="p-1.5 rounded hover:bg-blue-50 text-blue-600 transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => requireManager(() => handleDelete(item.id))}
                          title="Sil"
                          className="p-1.5 rounded hover:bg-red-50 text-red-500 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-zinc-100 text-xs text-zinc-400">
            Toplam {total} kalem
          </div>
        </div>
      )}
    </div>
  )

  // ── TAB: Movements (global) ────────────────────────────────────────────

  const renderMovementRow = (m: any, idx: number, unit?: string, itemName?: string) => {
    const cfg = MOVEMENT_CONFIG[m.type] ?? MOVEMENT_CONFIG.GIRIS
    return (
      <div key={m.id} className="rounded-lg border border-zinc-100 hover:bg-zinc-50 p-3">
        <div className="flex items-center gap-3 mb-1.5">
          <span className="text-[11px] font-bold text-zinc-400 w-6 text-right flex-shrink-0">#{idx + 1}</span>
          <cfg.icon size={16} className={cfg.color} />
          <span className={clsx('text-xs font-bold', cfg.color)}>{cfg.label}</span>
          {itemName && <span className="text-[11px] font-semibold text-zinc-700">{itemName}</span>}
          <span className="text-sm font-bold text-zinc-800">{m.quantity} {unit ?? ''}</span>
          <span className="text-[11px] text-zinc-400 font-mono">{m.previousQty} &rarr; {m.newQty}</span>
          <span className="ml-auto text-[11px] font-semibold" style={{ color: 'var(--text-2)' }}>{m.userName ?? '-'}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-zinc-500 pl-9">
          <span>{new Date(m.createdAt).toLocaleString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          {m.fromLocation && <span>Kaynak: <strong>{m.fromLocation}</strong></span>}
          {m.toLocation && <span>Hedef: <strong>{m.toLocation}</strong></span>}
        </div>
        {m.description && (
          <p className="text-[11px] text-zinc-600 pl-9 mt-1">{m.description}</p>
        )}
      </div>
    )
  }

  const renderMovements = () => (
    <div className="space-y-4">
      {/* Global movement log */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-zinc-800">Tum Stok Hareketleri</h3>
          <button onClick={loadAllMovements} className="text-xs text-cyan-600 hover:text-cyan-800 font-semibold flex items-center gap-1">
            <RefreshCw size={12} /> Yenile
          </button>
        </div>
        {allMovementsLoading ? (
          <p className="text-sm text-zinc-400 text-center py-8">Yukleniyor...</p>
        ) : allMovements.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-8">Henuz hareket kaydedilmemis</p>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {allMovements.map((m: any, idx: number) => renderMovementRow(m, idx, m.stockItem?.unit, m.stockItem?.name))}
          </div>
        )}
      </div>

      {/* Per-item history (when clicked from items tab) */}
      {movementHistory && (
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-zinc-800">
              {movementHistory.item.name} - Kalem Gecmisi
            </h3>
            <button onClick={() => setMovementHistory(null)} className="p-1 rounded hover:bg-zinc-100">
              <X size={16} />
            </button>
          </div>
          {movementHistory.movements.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-8">Hareket kaydedilmemis</p>
          ) : (
            <div className="space-y-2">
              {movementHistory.movements.map((m: any, idx: number) => renderMovementRow(m, idx, movementHistory.item.unit))}
            </div>
          )}
        </div>
      )}
    </div>
  )

  // ── TAB: Alerts ────────────────────────────────────────────────────────

  const renderAlerts = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500">Otomatik stok uyarilari</p>
          <button onClick={loadAlerts} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-zinc-200 hover:bg-zinc-50 transition-colors">
            Yenile
          </button>
        </div>
        {alertsLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-zinc-400" size={24} /></div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-16 text-zinc-400 text-sm">Aktif uyari yok</div>
        ) : (
          <div className="space-y-2">
            {alerts.map(a => (
              <div key={a.id} className={clsx('flex items-start gap-3 px-4 py-3 rounded-xl border', SEVERITY_STYLES[a.severity] ?? SEVERITY_STYLES.ORTA)}>
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{a.message}</p>
                  <p className="text-xs mt-1 opacity-70">{a.type.replace(/_/g, ' ')} - {new Date(a.createdAt).toLocaleDateString('tr-TR')}</p>
                </div>
                <span className="text-xs font-bold uppercase px-2 py-0.5 rounded">{a.severity}</span>
                {a.status === 'AKTIF' && (
                  <button
                    onClick={() => handleAlertResolve(a.id)}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-white/80 hover:bg-white border border-current/20 transition-colors"
                  >
                    <Check size={12} /> Cozuldu
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Stock Item Form (shared between create/edit) ───────────────────────

  const renderForm = (onSubmit: (e: React.FormEvent<HTMLFormElement>) => void, defaults?: StockItem | null) => (
    <form onSubmit={onSubmit} className="space-y-4 px-4 py-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-zinc-600 mb-1">Ad *</label>
          <input name="name" defaultValue={defaults?.name} required className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-600 mb-1">Kod</label>
          <input name="code" defaultValue={defaults?.code ?? ''} className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-zinc-600 mb-1">Kategori *</label>
          <select name="category" defaultValue={defaults?.category ?? 'SARF'} required className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-600 mb-1">Birim *</label>
          <input name="unit" defaultValue={defaults?.unit ?? 'adet'} required className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-zinc-600 mb-1">Departman</label>
          <select name="departmentId" defaultValue={defaults?.departmentId ?? ''} className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="">Secilmedi</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-600 mb-1">Lokasyon</label>
          <input name="locationName" defaultValue={defaults?.locationName ?? ''} className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-semibold text-zinc-600 mb-1">Miktar</label>
          <input name="quantity" type="number" min="0" defaultValue={defaults?.quantity ?? 0} className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-600 mb-1">Min Seviye</label>
          <input name="minLevel" type="number" min="0" defaultValue={defaults?.minLevel ?? 0} className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-600 mb-1">Max Seviye</label>
          <input name="maxLevel" type="number" min="0" defaultValue={defaults?.maxLevel ?? ''} className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-600 mb-1">Kritik Seviye</label>
          <input name="criticalLevel" type="number" min="0" defaultValue={defaults?.criticalLevel ?? 0} className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-zinc-600 mb-1">Tedarikci</label>
          <input name="vendor" defaultValue={defaults?.vendor ?? ''} className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-600 mb-1">Birim Maliyet (TRY)</label>
          <input name="unitCost" type="number" step="0.01" min="0" defaultValue={defaults?.unitCost ?? ''} className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-600 mb-1">Barkod</label>
          <input name="barcode" defaultValue={defaults?.barcode ?? ''} className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-zinc-600 mb-1">Aciklama</label>
        <textarea name="description" rows={2} defaultValue={defaults?.description ?? ''} className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={() => { setCreating(false); setEditing(null) }} className="px-4 py-2 rounded-lg text-sm font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors">
          Iptal
        </button>
        <button type="submit" className="px-5 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors">
          {defaults ? 'Guncelle' : 'Olustur'}
        </button>
      </div>
    </form>
  )

  // ── Render ──────────────────────────────────────────────────────────────

  const TABS: { key: Tab; label: string; icon: typeof Package }[] = [
    { key: 'dashboard',  label: 'Ozet',       icon: BarChart3 },
    { key: 'items',      label: 'Stok Listesi', icon: Package },
    { key: 'movements',  label: 'Hareketler', icon: ArrowRightLeft },
    { key: 'alerts',     label: 'Uyarilar',   icon: Bell },
  ]

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex items-center gap-1 bg-zinc-100 rounded-xl p-1">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); if (t.key === 'alerts') loadAlerts(); if (t.key === 'movements') loadAllMovements() }}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
              tab === t.key
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700',
            )}
          >
            <t.icon size={16} />
            {t.label}
            {t.key === 'alerts' && dashboard?.activeAlerts ? (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600">{dashboard.activeAlerts}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'dashboard'  && renderDashboard()}
      {tab === 'items'      && renderItems()}
      {tab === 'movements'  && renderMovements()}
      {tab === 'alerts'     && renderAlerts()}

      {/* Create modal */}
      {creating && (
        <DraggableModal title="Yeni Stok Kalemi" onClose={() => setCreating(false)} width={640}>
          {renderForm(handleCreate)}
        </DraggableModal>
      )}

      {/* Edit modal */}
      {editing && (
        <DraggableModal title="Stok Kalemi Duzenle" onClose={() => setEditing(null)} width={640}>
          {renderForm(handleUpdate, editing)}
        </DraggableModal>
      )}

      {/* Movement modal */}
      {movementItem && (
        <DraggableModal title={`Hareket: ${movementItem.name}`} onClose={() => setMovementItem(null)} width={500}>
          <form onSubmit={handleMovement} className="space-y-3 px-4 py-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1">Hareket Tipi *</label>
                <select name="type" required className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm">
                  {Object.entries(MOVEMENT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1">Miktar * ({movementItem.unit})</label>
                <input name="quantity" type="number" min="1" required className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1">Nereden (kaynak)</label>
                <input name="fromLocation" defaultValue={movementItem.locationName ?? ''} className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm" placeholder={movementItem.locationName ?? 'Mevcut konum'} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1">Nereye (hedef)</label>
                <input name="toLocation" className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm" placeholder="Hedef lokasyon" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">Neden / Aciklama *</label>
              <select name="reason" className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm mb-1.5">
                <option value="">Neden secin veya asagiya yazin...</option>
                <option value="Uretim icin kullanim">Uretim icin kullanim</option>
                <option value="Bakim/Onarim icin kullanim">Bakim/Onarim icin kullanim</option>
                <option value="Yeni tedarik / satin alma">Yeni tedarik / satin alma</option>
                <option value="Iade / geri donus">Iade / geri donus</option>
                <option value="Sayim farki duzeltmesi">Sayim farki duzeltmesi</option>
                <option value="Hurda / fire">Hurda / fire</option>
                <option value="Transfer">Transfer</option>
                <option value="Proje icin ayirma">Proje icin ayirma</option>
                <option value="Diger">Diger</option>
              </select>
              <input name="description" className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm" placeholder="Ek aciklama yazin..." />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
              <span className="text-xs text-zinc-400">Mevcut: <strong>{movementItem.quantity} {movementItem.unit}</strong> | Konum: {movementItem.locationName ?? '-'}</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setMovementItem(null)} className="px-4 py-2 rounded-lg text-sm font-semibold text-zinc-600 hover:bg-zinc-100">Iptal</button>
                <button type="submit" className="px-5 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700">Kaydet</button>
              </div>
            </div>
          </form>
        </DraggableModal>
      )}

      {/* Permission popup */}
      {permPopup && (
        <DraggableModal title="Yetki Gerekli" onClose={() => setPermPopup(false)} width={420}>
          <div className="px-5 py-6 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center">
              <ShieldAlert size={28} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-800">Yetkiniz bulunmuyor</p>
              <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                Yeni envanter yuklemesi yapmak veya mevcut envanterde ekleme, cikarma yapmak icin yoneticinize basvurun.
              </p>
            </div>
            <button
              onClick={() => setPermPopup(false)}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-zinc-900 text-white hover:bg-zinc-800 transition-colors"
            >
              Tamam
            </button>
          </div>
        </DraggableModal>
      )}
    </div>
  )
}

// ── Summary Card ──────────────────────────────────────────────────────────

function SummaryCard({ icon: Icon, label, value, color, bg, alert: isAlert }: {
  icon: typeof Package; label: string; value: number; color: string; bg: string; alert?: boolean
}) {
  return (
    <div className={clsx('rounded-xl border p-4 transition-all', isAlert ? 'border-red-200 bg-red-50/30' : 'border-zinc-200 bg-white')}>
      <div className="flex items-center gap-3">
        <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center', bg)}>
          <Icon size={20} className={color} />
        </div>
        <div>
          <p className="text-2xl font-bold text-zinc-900">{value.toLocaleString('tr-TR')}</p>
          <p className="text-xs text-zinc-500 font-medium">{label}</p>
        </div>
      </div>
    </div>
  )
}
