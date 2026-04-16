import { useState, useRef, useMemo } from 'react'
import {
  Wrench, Package, Plus, Search, Trash2, Pencil, AlertTriangle, ShieldAlert,
  Building2, FileSpreadsheet, X, Check, TrendingUp, Activity, DollarSign, Upload, Cog,
} from 'lucide-react'
import clsx from 'clsx'
import {
  useInventory, useEfficiencySummary, useDepartments,
  createInventoryItem, updateInventoryItem, deleteInventoryItem,
  type InventoryItem, type InventoryType, type InventoryStatus,
} from '../lib/hooks'
import { useAuth } from '../context/AuthContext'
import DraggableModal from '../components/ui/DraggableModal'
import SmartImportModal from '../components/ui/SmartImportModal'
import { exportToExcel } from '../lib/excelExport'
import { useToolbarActions } from '../lib/useToolbarActions'

// Mudur ve ustu roller
const MANAGER_ROLES = ['PLATFORM_ADMIN', 'SUPER_ADMIN', 'GENEL_MUDUR', 'GM_YARDIMCISI', 'DIREKTOR', 'MUDUR']

const TYPE_LABELS: Record<InventoryType, string> = {
  DEMIRBAS:    'Demirbaş',
  TUKETIM:     'Tüketim Malzemesi',
  YEDEK_PARCA: 'Yedek Parça',
}

const STATUS_LABELS: Record<InventoryStatus, string> = {
  AKTIF:    'Aktif',
  BAKIMDA:  'Bakımda',
  ARIZALI:  'Arızalı',
  HURDA:    'Hurda',
  STOK:     'Stokta',
  KRITIK:   'Kritik',
  TUKENMIS: 'Tükenmiş',
}

const STATUS_STYLES: Record<InventoryStatus, string> = {
  AKTIF:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  BAKIMDA:  'bg-amber-50 text-amber-700 border-amber-200',
  ARIZALI:  'bg-red-50 text-red-700 border-red-200',
  HURDA:    'bg-zinc-100 text-zinc-500 border-zinc-200',
  STOK:     'bg-blue-50 text-blue-700 border-blue-200',
  KRITIK:   'bg-amber-50 text-amber-700 border-amber-200',
  TUKENMIS: 'bg-red-50 text-red-700 border-red-200',
}

const TRY = (n: number | string | undefined) => {
  if (n === undefined || n === null) return '-'
  const v = typeof n === 'string' ? Number(n) : n
  if (Number.isNaN(v)) return '-'
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v)
}

export default function Inventory() {
  const { user } = useAuth()
  const canManage = MANAGER_ROLES.includes(user?.role?.toUpperCase() ?? '')
  const [activeTab,  setActiveTab]  = useState<InventoryType>('DEMIRBAS')
  const [search,     setSearch]     = useState('')
  const [editing,    setEditing]    = useState<InventoryItem | null>(null)
  const [creating,   setCreating]   = useState(false)
  const [importing,  setImporting]  = useState(false)
  const [permPopup,  setPermPopup]  = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const requireManager = (action: () => void) => {
    if (canManage) { action() } else { setPermPopup(true) }
  }

  const handleImportSuccess = () => { refetch(); refetchSummary() }

  const { items,   loading,  refetch } = useInventory({ type: activeTab, search: search || undefined })
  const { summary, refetch: refetchSummary } = useEfficiencySummary()
  const { departments } = useDepartments()

  const deptMap = useMemo(() =>
    Object.fromEntries(departments.map(d => [d.id, d.name])),
  [departments])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" kaydını silmek istediğinizden emin misiniz?`)) return
    await deleteInventoryItem(id)
    refetch()
    refetchSummary()
  }

  const handleExportExcel = () => {
    exportToExcel({
      filename:  `${activeTab === 'DEMIRBAS' ? 'demirbas' : activeTab === 'YEDEK_PARCA' ? 'yedek_parca' : 'tuketim'}_${new Date().toISOString().slice(0,10)}.xlsx`,
      sheetName: TYPE_LABELS[activeTab],
      columns: [
        { header: 'Ad',          accessor: i => i.name,                        width: 32 },
        { header: 'Kod',         accessor: i => i.code ?? '-',                 width: 16 },
        { header: 'Kategori',    accessor: i => i.category ?? '-',             width: 18 },
        { header: 'Departman',   accessor: i => deptMap[i.departmentId ?? ''] ?? '-', width: 22 },
        { header: 'Konum',       accessor: i => i.location ?? '-',             width: 22 },
        { header: 'Tedarikçi',   accessor: i => i.vendor ?? '-',               width: 22 },
        { header: 'Miktar',      accessor: i => i.quantity,                    width: 10 },
        { header: 'Birim',       accessor: i => i.unit ?? '-',                 width: 8  },
        { header: 'Birim Maliyet', accessor: i => i.unitCost ? Number(i.unitCost) : '', width: 14 },
        { header: 'Toplam Maliyet',accessor: i => i.totalCost ? Number(i.totalCost) : '', width: 14 },
        { header: 'Durum',       accessor: i => STATUS_LABELS[i.status],       width: 12 },
        { header: 'Seri No',     accessor: i => i.serialNumber ?? '-',         width: 18 },
      ],
      rows: items,
    })
  }

  useToolbarActions({
    onNew:     () => requireManager(() => setCreating(true)),
    onSearch:  () => searchRef.current?.focus(),
    onRefresh: () => { refetch(); refetchSummary() },
    onExport:  () => handleExportExcel(),
  })

  return (
    <div className="space-y-5">
      {/* ── Efficiency summary cards ────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard
            label="Toplam Yatırım"
            value={TRY(summary.totalSpend)}
            icon={DollarSign}
            accent="emerald"
            sub={`Demirbaş: ${TRY(summary.totalCapex)} · Sarf: ${TRY(summary.totalOpex)}`}
          />
          <SummaryCard
            label="Görev Başına Maliyet"
            value={TRY(summary.costPerTask)}
            icon={TrendingUp}
            accent="indigo"
            sub={`${summary.completedTasks} / ${summary.totalTasks} görev`}
          />
          <SummaryCard
            label="Demirbaş Sağlığı"
            value={`%${summary.healthRate}`}
            icon={Activity}
            accent={summary.healthRate >= 80 ? 'emerald' : summary.healthRate >= 60 ? 'amber' : 'red'}
            sub={`${summary.activeAssets} / ${summary.totalAssets} aktif`}
          />
          <SummaryCard
            label="Kritik Stok"
            value={summary.criticalStockCount}
            icon={AlertTriangle}
            accent={summary.criticalStockCount > 0 ? 'red' : 'emerald'}
            sub={`${summary.consumablesCount} sarf kalemi`}
          />
        </div>
      )}

      {/* ── Header + tabs ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex gap-1 p-1 surface w-fit rounded-xl">
          <TabButton active={activeTab === 'DEMIRBAS'} onClick={() => setActiveTab('DEMIRBAS')} icon={<Wrench size={14} />}>
            Demirbaş
          </TabButton>
          <TabButton active={activeTab === 'TUKETIM'} onClick={() => setActiveTab('TUKETIM')} icon={<Package size={14} />}>
            Tüketim Malzemesi
          </TabButton>
          <TabButton active={activeTab === 'YEDEK_PARCA'} onClick={() => setActiveTab('YEDEK_PARCA')} icon={<Cog size={14} />}>
            Yedek Parça
          </TabButton>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => requireManager(() => setImporting(true))} className="btn-secondary" data-help="Excel veya SQL ile toplu aktarim">
            <Upload size={14} /> Toplu Aktar
          </button>
          <button onClick={handleExportExcel} className="btn-secondary" data-help="Listeyi Excel olarak indir">
            <FileSpreadsheet size={14} /> Excel
          </button>
          <button onClick={() => requireManager(() => setCreating(true))} className="btn-primary" data-help="Yeni envanter kalemi oluştur">
            <Plus size={16} /> Yeni {TYPE_LABELS[activeTab]}
          </button>
        </div>
      </div>

      {/* ── Search ──────────────────────────────────────────── */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          ref={searchRef}
          className="input pl-9"
          placeholder={`${TYPE_LABELS[activeTab]} ara... ( / )`}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* ── Table ───────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4].map(i => <div key={i} className="h-14 surface animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="surface p-12 text-center">
          {activeTab === 'DEMIRBAS' ? <Wrench size={36} className="text-zinc-300 mx-auto mb-3" /> : activeTab === 'YEDEK_PARCA' ? <Cog size={36} className="text-zinc-300 mx-auto mb-3" /> : <Package size={36} className="text-zinc-300 mx-auto mb-3" />}
          <p className="text-[14px] font-medium text-zinc-500">Henüz {TYPE_LABELS[activeTab].toLowerCase()} kaydı yok</p>
          <p className="text-[12px] text-zinc-400 mt-1">Yukarıdaki "Yeni" butonu ile oluşturmaya başlayın</p>
        </div>
      ) : (
        <div className="surface overflow-x-auto">
          <table className="data-table min-w-[900px] w-full">
            <thead>
              <tr>
                <th>Ad / Kod</th>
                <th>Kategori</th>
                <th>Departman</th>
                <th>Konum</th>
                <th className="text-right">Miktar</th>
                <th className="text-right">Toplam Maliyet</th>
                <th>Durum</th>
                <th className="text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="group">
                  <td>
                    <p className="font-semibold text-zinc-900">{item.name}</p>
                    {item.code && <p className="text-[10px] font-mono text-zinc-400">{item.code}</p>}
                  </td>
                  <td className="text-zinc-600">{item.category ?? '-'}</td>
                  <td className="text-zinc-600">{deptMap[item.departmentId ?? ''] ?? '-'}</td>
                  <td className="text-zinc-600">{item.location ?? '-'}</td>
                  <td className="text-right tabular-nums font-semibold">
                    {item.quantity} {item.unit ?? ''}
                  </td>
                  <td className="text-right tabular-nums">{TRY(item.totalCost)}</td>
                  <td>
                    <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-md border', STATUS_STYLES[item.status])}>
                      {STATUS_LABELS[item.status]}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button type="button" onClick={() => requireManager(() => setEditing(item))}
                        className="w-7 h-7 rounded flex items-center justify-center text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50">
                        <Pencil size={12} />
                      </button>
                      <button type="button" onClick={() => requireManager(() => handleDelete(item.id, item.name))}
                        className="w-7 h-7 rounded flex items-center justify-center text-zinc-400 hover:text-red-600 hover:bg-red-50">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create / edit modal ─────────────────────────────── */}
      {(creating || editing) && (
        <InventoryFormModal
          type={editing?.type ?? activeTab}
          initial={editing}
          departments={departments}
          onClose={() => { setCreating(false); setEditing(null) }}
          onSaved={() => { setCreating(false); setEditing(null); refetch(); refetchSummary() }}
        />
      )}

      {/* ── Smart import modal ──────────────────────────────── */}
      {importing && (
        <SmartImportModal
          title={`Akilli ${TYPE_LABELS[activeTab]} Yukleme`}
          target="inventory"
          defaultType={activeTab}
          onClose={() => setImporting(false)}
          onSuccess={handleImportSuccess}
        />
      )}

      {/* ── Permission popup ───────────────────────────────────── */}
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

/* ── Subcomponents ─────────────────────────────────────────────────────── */
function TabButton({
  active, onClick, icon, children,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold transition-all',
        active ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'
      )}
    >
      {icon}
      {children}
    </button>
  )
}

function SummaryCard({
  label, value, icon: Icon, sub, accent,
}: {
  label: string
  value: string | number
  icon: any
  sub?: string
  accent: 'emerald' | 'indigo' | 'amber' | 'red'
}) {
  const tones: Record<typeof accent, { bg: string; text: string }> = {
    emerald: { bg: 'bg-emerald-50',  text: 'text-emerald-600'  },
    indigo:  { bg: 'bg-indigo-50',   text: 'text-indigo-600'   },
    amber:   { bg: 'bg-amber-50',    text: 'text-amber-600'    },
    red:     { bg: 'bg-red-50',      text: 'text-red-600'      },
  } as any
  const tone = tones[accent]
  return (
    <div className="surface p-5">
      <div className="flex items-start justify-between mb-2">
        <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">{label}</p>
        <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center', tone.bg)}>
          <Icon size={16} className={tone.text} />
        </div>
      </div>
      <p className="text-[24px] font-extrabold tracking-tight text-zinc-900 leading-none">{value}</p>
      {sub && <p className="text-[11px] text-zinc-400 mt-1.5">{sub}</p>}
    </div>
  )
}

/* ── Create / edit modal ──────────────────────────────────────────────── */
function InventoryFormModal({
  type, initial, departments, onClose, onSaved,
}: {
  type:        InventoryType
  initial:     InventoryItem | null
  departments: { id: string; name: string }[]
  onClose:     () => void
  onSaved:     () => void
}) {
  const isAsset = type === 'DEMIRBAS'
  const isConsumable = type === 'TUKETIM' || type === 'YEDEK_PARCA'

  const [form, setForm] = useState({
    name:          initial?.name          ?? '',
    code:          initial?.code          ?? '',
    category:      initial?.category      ?? '',
    description:   initial?.description   ?? '',
    departmentId:  initial?.departmentId  ?? '',
    location:      initial?.location      ?? '',
    vendor:        initial?.vendor        ?? '',
    quantity:      initial?.quantity      ?? 1,
    unit:          initial?.unit          ?? (isConsumable ? 'adet' : ''),
    reorderLevel:  initial?.reorderLevel  ?? 0,
    unitCost:      initial?.unitCost ? Number(initial.unitCost) : 0,
    serialNumber:  initial?.serialNumber  ?? '',
    purchaseDate:  initial?.purchaseDate  ? initial.purchaseDate.slice(0,10)  : '',
    warrantyEnd:   initial?.warrantyEnd   ? initial.warrantyEnd.slice(0,10)   : '',
    nextServiceAt: initial?.nextServiceAt ? initial.nextServiceAt.slice(0,10) : '',
    usageHours:    initial?.usageHours    ?? 0,
    notes:         initial?.notes         ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState<string | null>(null)
  const canSave = form.name.trim().length > 0

  const handleSave = async () => {
    setSaving(true); setErr(null)
    try {
      const body: any = {
        type,
        name:         form.name.trim(),
        code:         form.code.trim()         || undefined,
        category:     form.category.trim()     || undefined,
        description:  form.description.trim()  || undefined,
        departmentId: form.departmentId        || undefined,
        location:     form.location.trim()     || undefined,
        vendor:       form.vendor.trim()       || undefined,
        quantity:     Number(form.quantity)    || (isAsset ? 1 : 0),
        unit:         form.unit.trim()         || undefined,
        reorderLevel: form.reorderLevel ? Number(form.reorderLevel) : undefined,
        unitCost:     form.unitCost     ? Number(form.unitCost)     : undefined,
        notes:        form.notes.trim()        || undefined,
      }
      if (isAsset) {
        body.serialNumber  = form.serialNumber.trim() || undefined
        if (form.purchaseDate)  body.purchaseDate  = new Date(form.purchaseDate).toISOString()
        if (form.warrantyEnd)   body.warrantyEnd   = new Date(form.warrantyEnd).toISOString()
        if (form.nextServiceAt) body.nextServiceAt = new Date(form.nextServiceAt).toISOString()
        body.usageHours = Number(form.usageHours) || 0
      }

      if (initial) {
        // type is omitted on update
        const { type: _t, ...rest } = body
        await updateInventoryItem(initial.id, rest)
      } else {
        await createInventoryItem(body)
      }
      onSaved()
    } catch (e: any) {
      setErr(e.message ?? 'Kaydetme başarısız')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DraggableModal
      title={`${initial ? 'Düzenle' : 'Yeni'} - ${TYPE_LABELS[type]}`}
      icon={isAsset ? <Wrench size={13} /> : type === 'YEDEK_PARCA' ? <Cog size={13} /> : <Package size={13} />}
      onClose={onClose}
      width={620}
    >
      <div className="p-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Ad *</Label>
            <input className="input" placeholder={isAsset ? 'ör. CNC Makinesi #3' : 'ör. M8 Cıvata 50mm'}
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Kod / SKU</Label>
            <input className="input" placeholder="opsiyonel" value={form.code}
              onChange={e => setForm({ ...form, code: e.target.value })} />
          </div>
          <div>
            <Label>Kategori</Label>
            <input className="input" placeholder={isAsset ? 'Makine, Araç, Cihaz...' : 'Sarf, Yedek Parça...'}
              value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
          </div>
          <div>
            <Label>Departman</Label>
            <select className="select" value={form.departmentId}
              onChange={e => setForm({ ...form, departmentId: e.target.value })}>
              <option value="">- yok -</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Konum</Label>
            <input className="input" placeholder="Hat 1, Depo A, Raf 3..."
              value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
          </div>
          <div>
            <Label>Tedarikçi</Label>
            <input className="input" placeholder="opsiyonel" value={form.vendor}
              onChange={e => setForm({ ...form, vendor: e.target.value })} />
          </div>
          <div>
            <Label>{isAsset ? 'Adet' : 'Stok Miktarı'}</Label>
            <input type="number" className="input" min={0} value={form.quantity}
              onChange={e => setForm({ ...form, quantity: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Birim</Label>
            <input className="input" placeholder="adet, kg, lt, m..."
              value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} />
          </div>
          {isConsumable && (
            <div>
              <Label>Kritik Stok Eşiği</Label>
              <input type="number" className="input" min={0} value={form.reorderLevel}
                onChange={e => setForm({ ...form, reorderLevel: Number(e.target.value) })} />
            </div>
          )}
          <div>
            <Label>Birim Maliyet (TRY)</Label>
            <input type="number" className="input" min={0} step="0.01" value={form.unitCost}
              onChange={e => setForm({ ...form, unitCost: Number(e.target.value) })} />
          </div>

          {isAsset && (
            <>
              <div>
                <Label>Seri Numarası</Label>
                <input className="input" value={form.serialNumber}
                  onChange={e => setForm({ ...form, serialNumber: e.target.value })} />
              </div>
              <div>
                <Label>Çalışma Saati</Label>
                <input type="number" className="input" min={0} value={form.usageHours}
                  onChange={e => setForm({ ...form, usageHours: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Satın Alma Tarihi</Label>
                <input type="date" className="input" value={form.purchaseDate}
                  onChange={e => setForm({ ...form, purchaseDate: e.target.value })} />
              </div>
              <div>
                <Label>Garanti Bitişi</Label>
                <input type="date" className="input" value={form.warrantyEnd}
                  onChange={e => setForm({ ...form, warrantyEnd: e.target.value })} />
              </div>
              <div>
                <Label>Sonraki Servis</Label>
                <input type="date" className="input" value={form.nextServiceAt}
                  onChange={e => setForm({ ...form, nextServiceAt: e.target.value })} />
              </div>
            </>
          )}

          <div className="col-span-2">
            <Label>Notlar</Label>
            <textarea className="input resize-none" rows={2} value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>

        {err && (
          <div className="px-3 py-2 rounded border border-red-200 bg-red-50 text-[11px] text-red-700">{err}</div>
        )}

        <div className="flex gap-2 pt-2 border-t border-zinc-100">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center text-[12px]">
            <X size={12} /> İptal
          </button>
          <button type="button" disabled={!canSave || saving} onClick={handleSave}
            className="btn-primary flex-1 justify-center text-[12px]">
            <Check size={12} /> {saving ? 'Kaydediliyor...' : (initial ? 'Güncelle' : 'Oluştur')}
          </button>
        </div>
      </div>
    </DraggableModal>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">{children}</label>
  )
}
