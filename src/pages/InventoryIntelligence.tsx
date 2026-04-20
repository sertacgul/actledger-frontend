import { useState, useEffect } from 'react'
import {
  QrCode, MapPin, Layers, ArrowRightLeft, BookmarkCheck, Activity,
  Cpu, Settings2, Plus, Trash2, Search, RefreshCw, AlertTriangle,
  Package, ScanLine, Zap, BarChart3, Timer, ShieldAlert, UserCheck,
  ChevronRight, X, Check, Clock, TrendingUp, TrendingDown, Download,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { useCompany } from '../context/CompanyContext'
import DraggableModal from '../components/ui/DraggableModal'
import { QRCodeSVG } from 'qrcode.react'
import {
  useQrEntities, createQrEntity, deleteQrEntity, scanQrCode, autoGenerateQr,
  useInventoryLocations, createInventoryLocation, updateInventoryLocation, deleteInventoryLocation,
  useInventoryBatches, createInventoryBatch,
  useInventoryTransactions, createInventoryTransaction, quickConsume,
  useInventoryReservations, createReservation, cancelReservation,
  usePurchaseResponsibles, createPurchaseResponsible, deletePurchaseResponsible,
  useInventoryAnalytics, useInventoryIntelligence, analyzeInventoryIntelligence,
  useCurrentSectorTemplate,
  useStockItems, useDepartments, useUsers,
  type QrEntity, type InventoryLocation, type InventoryBatch,
  type InventoryTransaction, type InventoryReservation, type PurchaseResponsible,
} from '../lib/hooks'

const MANAGER_ROLES = ['platform_admin', 'super_admin', 'genel_mudur', 'gm_yardimcisi', 'direktor', 'mudur']

type Tab = 'dashboard' | 'qr' | 'locations' | 'batches' | 'transactions' | 'reservations' | 'purchase' | 'operiq'

const TABS: { key: Tab; label: string; labelEn: string; icon: typeof QrCode }[] = [
  { key: 'dashboard',    label: 'Dashboard',       labelEn: 'Dashboard',       icon: BarChart3 },
  { key: 'qr',           label: 'QR Yonetimi',     labelEn: 'QR Management',   icon: QrCode },
  { key: 'locations',    label: 'Lokasyonlar',      labelEn: 'Locations',       icon: MapPin },
  { key: 'batches',      label: 'Parti / Lot',      labelEn: 'Batch / Lot',     icon: Layers },
  { key: 'transactions', label: 'Hareketler',       labelEn: 'Transactions',    icon: ArrowRightLeft },
  { key: 'reservations', label: 'Rezervasyonlar',   labelEn: 'Reservations',    icon: BookmarkCheck },
  { key: 'purchase',     label: 'Satin Alma',       labelEn: 'Purchase',        icon: UserCheck },
  { key: 'operiq',       label: 'OperIQ Zeka',      labelEn: 'OperIQ Intel',    icon: Cpu },
]

const ENTITY_TYPES = [
  { value: 'STOCK_ITEM', label: 'Stok Kalemi' },
  { value: 'INVENTORY_LOCATION', label: 'Stok Lokasyonu' },
  { value: 'EQUIPMENT', label: 'Ekipman' },
  { value: 'IOT_DEVICE', label: 'IoT Cihaz' },
  { value: 'FACILITY_ZONE', label: 'Tesis Alani' },
  { value: 'CUSTOM', label: 'Ozel' },
]

const LOCATION_CATEGORIES = [
  { value: 'WAREHOUSE', label: 'Ana Depo' },
  { value: 'SHELF', label: 'Raf' },
  { value: 'PRODUCTION_LINE', label: 'Uretim Hatti' },
  { value: 'COLD_STORAGE', label: 'Soguk Depo' },
  { value: 'MAINTENANCE', label: 'Bakim Deposu' },
  { value: 'VEHICLE', label: 'Arac' },
  { value: 'DISTRIBUTION', label: 'Dagitim Noktasi' },
  { value: 'SERVICE_AREA', label: 'Servis Alani' },
  { value: 'LAB', label: 'Laboratuvar' },
  { value: 'OTHER', label: 'Diger' },
]

const TX_TYPES = [
  { value: 'GIRIS', label: 'Stok Girisi', color: 'text-emerald-400' },
  { value: 'CIKIS', label: 'Stok Cikisi', color: 'text-red-400' },
  { value: 'KULLANIM', label: 'Tuketim', color: 'text-orange-400' },
  { value: 'FIRE', label: 'Fire / Kayip', color: 'text-rose-500' },
  { value: 'TRANSFER', label: 'Transfer', color: 'text-blue-400' },
  { value: 'SAYIM', label: 'Sayim', color: 'text-violet-400' },
  { value: 'REZERVASYON', label: 'Rezervasyon', color: 'text-amber-400' },
]

const BATCH_STATUSES: Record<string, { label: string; color: string }> = {
  AKTIF: { label: 'Aktif', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  TUKENMIS: { label: 'Tukenmis', color: 'bg-zinc-100 text-zinc-600' },
  SON_KULLANMA_YAKIN: { label: 'SKT Yakin', color: 'bg-amber-50 text-amber-700 border border-amber-200' },
  SON_KULLANMA_GECMIS: { label: 'SKT Gecmis', color: 'bg-red-50 text-red-700 border border-red-200' },
  KARANTINA: { label: 'Karantina', color: 'bg-orange-50 text-orange-700' },
  IMHA: { label: 'Imha', color: 'bg-rose-50 text-rose-700' },
}

export default function InventoryIntelligence() {
  const { user } = useAuth()
  const { lang } = useLanguage()
  const { sector } = useCompany()
  const isManager = MANAGER_ROLES.includes(user?.role ?? '')

  const [tab, setTab] = useState<Tab>('dashboard')
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState<string | null>(null) // modal type

  // Data hooks
  const { items: qrEntities, refetch: refetchQr } = useQrEntities({ search: tab === 'qr' ? search : undefined })
  const { items: locations, refetch: refetchLoc } = useInventoryLocations({ search: tab === 'locations' ? search : undefined })
  const { items: batches, refetch: refetchBatch } = useInventoryBatches({})
  const { items: transactions, refetch: refetchTx } = useInventoryTransactions({})
  const { items: reservations, refetch: refetchRes } = useInventoryReservations({})
  const { data: purchaseResps, refetch: refetchPR } = usePurchaseResponsibles()
  const { data: analytics, loading: analyticsLoading, error: analyticsError, refetch: refetchAnalytics } = useInventoryAnalytics({})
  const { data: intelligence, loading: intelLoading, refetch: refetchIntel } = useInventoryIntelligence()
  const { data: sectorTemplate } = useCurrentSectorTemplate()
  const { items: stockItems } = useStockItems({})
  const { departments } = useDepartments()
  const { users } = useUsers()

  // QR Scan state
  const [scanCode, setScanCode] = useState('')
  const [scanResult, setScanResult] = useState<any>(null)
  const [scanLoading, setScanLoading] = useState(false)

  // Auto-generate QR
  const [generating, setGenerating] = useState(false)

  // QR download preview
  const [qrPreview, setQrPreview] = useState<QrEntity | null>(null)

  // OperIQ
  const [analyzing, setAnalyzing] = useState(false)

  const handleScan = async () => {
    if (!scanCode.trim()) return
    setScanLoading(true)
    try {
      const result = await scanQrCode({ code: scanCode.trim() })
      setScanResult(result)
    } catch (e: any) {
      alert(e.message || 'QR kodu bulunamadi')
    } finally {
      setScanLoading(false)
    }
  }

  const handleAutoGenerate = async () => {
    setGenerating(true)
    try {
      const result = await autoGenerateQr()
      alert(`${result.created} yeni QR kodu olusturuldu (toplam: ${result.total}, mevcut: ${result.alreadyExisted})`)
      refetchQr()
    } catch (e: any) {
      alert(e.message || 'QR olusturma hatasi')
    } finally {
      setGenerating(false)
    }
  }

  const downloadQrSvg = (qr: QrEntity) => {
    const svgEl = document.getElementById(`qr-svg-${qr.id}`)
    if (!svgEl) return
    const svgData = new XMLSerializer().serializeToString(svgEl)
    const blob = new Blob([svgData], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${qr.code}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadAllQrCodes = () => {
    // Create combined SVG with all QR codes (grid layout)
    const size = 200
    const padding = 20
    const labelHeight = 30
    const cols = 4
    const rows = Math.ceil(qrEntities.length / cols)
    const totalW = cols * (size + padding) + padding
    const totalH = rows * (size + labelHeight + padding) + padding

    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">`
    svgContent += `<rect width="100%" height="100%" fill="white"/>`

    qrEntities.forEach((qr, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = padding + col * (size + padding)
      const y = padding + row * (size + labelHeight + padding)

      // Placeholder rect for QR
      svgContent += `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="#f4f4f5" stroke="#e4e4e7" rx="8"/>`
      svgContent += `<text x="${x + size/2}" y="${y + size/2}" text-anchor="middle" dominant-baseline="middle" font-family="monospace" font-size="10" fill="#71717a">${qr.code}</text>`
      // Label below
      svgContent += `<text x="${x + size/2}" y="${y + size + 18}" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#3f3f46">${qr.label || qr.code}</text>`
    })

    svgContent += '</svg>'
    const blob = new Blob([svgContent], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'actledger-qr-codes.svg'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleAnalyze = async () => {
    setAnalyzing(true)
    try {
      await analyzeInventoryIntelligence()
      refetchIntel()
    } catch (e: any) {
      alert(e.message || 'Analiz hatasi')
    } finally {
      setAnalyzing(false)
    }
  }

  const sLabel = (key: string, field: string) => {
    if (!sectorTemplate) return key
    const map = sectorTemplate[field] as Record<string, { tr: string; en: string }> | undefined
    if (!map || !map[key]) return key
    return lang === 'tr' ? map[key].tr : map[key].en
  }

  return (
    <div className="space-y-6">
      {/* Sector badge */}
      {sectorTemplate && (
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Settings2 size={12} />
          <span>{lang === 'tr' ? sectorTemplate.name?.tr : sectorTemplate.name?.en} - AssetIQ</span>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1.5 pb-2 border-b border-zinc-200">
        {TABS.map(t => {
          const Icon = t.icon
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setSearch('') }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                active
                  ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                  : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              <Icon size={14} />
              {lang === 'tr' ? t.label : t.labelEn}
              {t.key === 'operiq' && (
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide bg-teal-50 text-teal-700 border border-teal-200">AI</span>
              )}
            </button>
          )
        })}
      </div>

      {/* ─── Dashboard Tab ──────────────────────────────────────────── */}
      {tab === 'dashboard' && (
        <div className="space-y-6">
          {/* Loading / Error */}
          {analyticsLoading && (
            <div className="flex items-center justify-center py-12 text-zinc-400 text-sm gap-2">
              <RefreshCw size={14} className="animate-spin" /> Veriler yukleniyor...
            </div>
          )}
          {analyticsError && (
            <div className="card p-4 text-center space-y-2">
              <p className="text-sm text-red-400">{analyticsError}</p>
              <button className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-zinc-200 hover:bg-zinc-50 transition-colors flex items-center gap-1 text-xs" onClick={refetchAnalytics}><RefreshCw size={12} /> Tekrar dene</button>
            </div>
          )}

          {/* Summary cards */}
          {!analyticsLoading && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {[
                { label: 'Toplam Kalem', value: analytics?.summary?.totalItems ?? 0, icon: Package, color: 'text-blue-400' },
                { label: 'Kritik Stok', value: analytics?.summary?.criticalCount ?? 0, icon: AlertTriangle, color: 'text-red-400' },
                { label: 'Min Alti', value: analytics?.summary?.belowMinCount ?? 0, icon: TrendingDown, color: 'text-amber-400' },
                { label: 'Devir Hizi', value: analytics?.summary?.turnoverRate ?? 0, icon: TrendingUp, color: 'text-emerald-400' },
                { label: 'Aktif Rezervasyon', value: analytics?.summary?.activeReservations ?? 0, icon: BookmarkCheck, color: 'text-violet-400' },
                { label: 'Fire Adedi', value: analytics?.fireStats?.totalFired ?? 0, icon: ShieldAlert, color: 'text-rose-400' },
              ].map((c, i) => (
                <div key={i} className="bg-white rounded-xl border border-zinc-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <c.icon size={14} className={c.color} />
                    <span className="text-xs text-zinc-500">{c.label}</span>
                  </div>
                  <div className="text-xl font-bold text-zinc-900">{typeof c.value === 'number' ? c.value.toLocaleString('tr-TR') : c.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Critical items */}
          {analytics?.criticalItems?.length > 0 && (
            <div className="bg-white rounded-xl border border-zinc-200 p-4">
              <h3 className="text-sm font-semibold text-zinc-800 mb-3 flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-400" />
                Kritik Stok Kalemleri
              </h3>
              <div className="space-y-2">
                {analytics.criticalItems.slice(0, 10).map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between py-1.5 px-3 rounded bg-red-50/50 border border-red-100">
                    <span className="text-sm text-zinc-700">{item.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-red-400 font-mono">{item.quantity} / {item.criticalLevel} {item.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expiring batches */}
          {analytics?.expiringBatches?.length > 0 && (
            <div className="bg-white rounded-xl border border-zinc-200 p-4">
              <h3 className="text-sm font-semibold text-zinc-800 mb-3 flex items-center gap-2">
                <Timer size={14} className="text-amber-400" />
                Son Kullanma Tarihi Yaklasan Partiler
              </h3>
              <div className="space-y-2">
                {analytics.expiringBatches.slice(0, 8).map((b: any) => (
                  <div key={b.id} className="flex items-center justify-between py-1.5 px-3 rounded bg-amber-50/50 border border-amber-100">
                    <span className="text-sm text-zinc-700">{b.stockItem?.name} - {b.batchNumber}</span>
                    <span className="text-xs text-amber-400">{b.expiryDate ? new Date(b.expiryDate).toLocaleDateString('tr-TR') : '-'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daily trend */}
          {analytics?.dailyTrend?.length > 0 && (
            <div className="bg-white rounded-xl border border-zinc-200 p-4">
              <h3 className="text-sm font-semibold text-zinc-800 mb-3 flex items-center gap-2">
                <Activity size={14} className="text-indigo-400" />
                Gunluk Hareket Trendi
              </h3>
              <div className="overflow-x-auto">
                <div className="flex gap-1 min-w-[600px]">
                  {analytics.dailyTrend.slice(-30).map((d: any, i: number) => {
                    const total = (d.giris || 0) + (d.cikis || 0) + (d.kullanim || 0) + (d.fire || 0)
                    const maxH = 60
                    const h = Math.max(4, Math.min(maxH, total * 2))
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${d.date}: G${d.giris} C${d.cikis} K${d.kullanim} F${d.fire}`}>
                        <div className="w-full bg-indigo-400 rounded-t" style={{ height: h }} />
                        <span className="text-[9px] text-zinc-400 -rotate-45">{d.date?.slice(5)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── QR Management Tab ──────────────────────────────────────── */}
      {tab === 'qr' && (
        <div className="space-y-4">
          {/* QR Scan area */}
          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <h3 className="text-sm font-semibold text-zinc-800 mb-3 flex items-center gap-2">
              <ScanLine size={14} className="text-indigo-400" />
              QR Tara
            </h3>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="QR kodu girin veya okutun..."
                value={scanCode}
                onChange={e => setScanCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleScan()}
              />
              <button className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1.5" onClick={handleScan} disabled={scanLoading}>
                {scanLoading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                Tara
              </button>
            </div>

            {/* Scan result */}
            {scanResult && (
              <div className="mt-4 p-4 rounded-lg bg-zinc-50 border border-zinc-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QrCode size={16} className="text-indigo-400" />
                    <span className="text-sm font-semibold text-zinc-800">{scanResult.qrEntity.code}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                      {scanResult.entityType}
                    </span>
                  </div>
                  <button onClick={() => setScanResult(null)} className="text-zinc-400 hover:text-zinc-800"><X size={14} /></button>
                </div>
                {scanResult.entityData && (
                  <div className="text-xs text-zinc-600 space-y-1">
                    {scanResult.entityData.name && <div><strong>Ad:</strong> {scanResult.entityData.name}</div>}
                    {scanResult.entityData.quantity !== undefined && <div><strong>Miktar:</strong> {scanResult.entityData.quantity} {scanResult.entityData.unit}</div>}
                    {scanResult.entityData.status && <div><strong>Durum:</strong> {scanResult.entityData.status}</div>}
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {scanResult.availableActions?.map((a: string) => (
                    <span key={a} className="text-[10px] px-2 py-1 rounded bg-zinc-50 text-zinc-500 border border-zinc-200">{a}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* QR list */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <input
              className="input w-64"
              placeholder="QR ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="flex items-center gap-2">
              {isManager && (
                <button className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-zinc-200 hover:bg-zinc-50 transition-colors flex items-center gap-1 text-xs" onClick={handleAutoGenerate} disabled={generating}>
                  {generating ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} />}
                  {lang === 'tr' ? 'Tum Stoklar Icin QR Olustur' : 'Generate QR for All Stock'}
                </button>
              )}
              {qrEntities.length > 0 && (
                <button className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-zinc-200 hover:bg-zinc-50 transition-colors flex items-center gap-1 text-xs" onClick={downloadAllQrCodes}>
                  <Download size={13} /> {lang === 'tr' ? 'Toplu Indir' : 'Download All'}
                </button>
              )}
              {isManager && (
                <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 transition-colors flex items-center gap-1 text-xs" onClick={() => setCreating('qr')}>
                  <Plus size={13} /> {lang === 'tr' ? 'Yeni QR' : 'New QR'}
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            {qrEntities.map(qr => (
              <div key={qr.id} className="bg-white rounded-xl border border-zinc-200 p-3 flex items-center justify-between hover:bg-zinc-50/80 transition">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 cursor-pointer" onClick={() => setQrPreview(qrPreview?.id === qr.id ? null : qr)}>
                    <QRCodeSVG id={`qr-svg-${qr.id}`} value={qr.code} size={40} level="M" />
                  </div>
                  <div>
                    <div className="text-sm text-zinc-800 font-mono">{qr.code}</div>
                    <div className="text-xs text-zinc-400">{qr.label || ENTITY_TYPES.find(t => t.value === qr.entityType)?.label || qr.entityType}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="text-zinc-400 hover:text-indigo-600 transition p-1"
                    onClick={() => downloadQrSvg(qr)}
                    title="QR kodu indir"
                  ><Download size={14} /></button>
                  <span className={`text-[10px] px-2 py-0.5 rounded ${qr.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-zinc-100 text-zinc-600'}`}>
                    {qr.active ? 'Aktif' : 'Pasif'}
                  </span>
                  {isManager && (
                    <button
                      className="text-zinc-300 hover:text-red-600 transition"
                      onClick={async () => { if (confirm('QR kodu silinsin mi?')) { await deleteQrEntity(qr.id); refetchQr() } }}
                    ><Trash2 size={14} /></button>
                  )}
                </div>
              </div>
            ))}
            {qrEntities.length === 0 && (
              <div className="text-center py-8 space-y-3">
                <QrCode size={32} className="mx-auto text-zinc-300" />
                <p className="text-sm text-zinc-400">Henuz QR kodu yok</p>
                {isManager && (
                  <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 transition-colors flex items-center gap-1 text-xs mx-auto" onClick={handleAutoGenerate} disabled={generating}>
                    <Zap size={13} /> Tum Stoklar Icin QR Olustur
                  </button>
                )}
              </div>
            )}
          </div>

          {/* QR Preview Modal */}
          {qrPreview && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => setQrPreview(null)}>
              <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full mx-4 text-center" onClick={e => e.stopPropagation()}>
                <QRCodeSVG id={`qr-preview-${qrPreview.id}`} value={qrPreview.code} size={240} level="H" includeMargin />
                <p className="text-lg font-mono font-bold text-zinc-800 mt-4">{qrPreview.code}</p>
                {qrPreview.label && <p className="text-sm text-zinc-500 mt-1">{qrPreview.label}</p>}
                <div className="flex gap-2 justify-center mt-6">
                  <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 transition-colors flex items-center gap-1 text-xs" onClick={() => downloadQrSvg(qrPreview)}>
                    <Download size={13} /> SVG Indir
                  </button>
                  <button className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-zinc-200 hover:bg-zinc-50 transition-colors flex items-center gap-1 text-xs" onClick={() => setQrPreview(null)}>Kapat</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Locations Tab ──────────────────────────────────────────── */}
      {tab === 'locations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <input className="input w-64" placeholder="Lokasyon ara..." value={search} onChange={e => setSearch(e.target.value)} />
            {isManager && (
              <button className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1.5 text-xs" onClick={() => setCreating('location')}>
                <Plus size={14} /> Yeni Lokasyon
              </button>
            )}
          </div>
          <div className="grid gap-2">
            {locations.map(loc => (
              <div key={loc.id} className="bg-white rounded-xl border border-zinc-200 p-3 flex items-center justify-between hover:bg-zinc-50/80 transition">
                <div className="flex items-center gap-3">
                  <MapPin size={16} className="text-blue-400" />
                  <div>
                    <div className="text-sm text-zinc-800">{loc.name} {loc.code && <span className="text-zinc-400 text-xs">({loc.code})</span>}</div>
                    <div className="text-xs text-zinc-400 flex items-center gap-2">
                      <span>{sLabel(loc.category, 'locationTypes')}</span>
                      {loc.department && <><span className="text-zinc-300">-</span><span>{loc.department.name}</span></>}
                      {loc.parent && <><span className="text-zinc-300">-</span><span>{loc.parent.name}</span></>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-400">
                  <span>{loc._count?.stockItems ?? 0} kalem</span>
                  {loc._count?.children ? <span>{loc._count.children} alt</span> : null}
                </div>
              </div>
            ))}
            {locations.length === 0 && <div className="text-center text-zinc-400 py-8 text-sm">Henuz lokasyon yok</div>}
          </div>
        </div>
      )}

      {/* ─── Batches Tab ────────────────────────────────────────────── */}
      {tab === 'batches' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-zinc-400">Toplam {batches.length} parti/lot</div>
            {isManager && (
              <button className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1.5 text-xs" onClick={() => setCreating('batch')}>
                <Plus size={14} /> Yeni Parti
              </button>
            )}
          </div>
          <div className="grid gap-2">
            {batches.map(b => {
              const st = BATCH_STATUSES[b.status] || { label: b.status, color: 'bg-zinc-100 text-zinc-600' }
              return (
                <div key={b.id} className="bg-white rounded-xl border border-zinc-200 p-3 flex items-center justify-between hover:bg-zinc-50/80 transition">
                  <div className="flex items-center gap-3">
                    <Layers size={16} className="text-violet-400" />
                    <div>
                      <div className="text-sm text-zinc-800">{b.stockItem?.name} - <span className="font-mono">{b.batchNumber}</span></div>
                      <div className="text-xs text-zinc-400 flex items-center gap-2">
                        {b.supplier && <span>{b.supplier}</span>}
                        {b.expiryDate && <span>SKT: {new Date(b.expiryDate).toLocaleDateString('tr-TR')}</span>}
                        {b.location && <span>{b.location.name}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-zinc-600">{b.quantity} {b.unit || b.stockItem?.unit}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded ${st.color}`}>{st.label}</span>
                  </div>
                </div>
              )
            })}
            {batches.length === 0 && <div className="text-center text-zinc-400 py-8 text-sm">Henuz parti/lot yok</div>}
          </div>
        </div>
      )}

      {/* ─── Transactions Tab ───────────────────────────────────────── */}
      {tab === 'transactions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-zinc-400">Son {transactions.length} hareket</div>
            {isManager && (
              <button className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1.5 text-xs" onClick={() => setCreating('transaction')}>
                <Plus size={14} /> Yeni Hareket
              </button>
            )}
          </div>
          <div className="grid gap-2">
            {transactions.map(tx => {
              const txType = TX_TYPES.find(t => t.value === tx.type) || { label: tx.type, color: 'text-zinc-400' }
              return (
                <div key={tx.id} className="bg-white rounded-xl border border-zinc-200 p-3 flex items-center justify-between hover:bg-zinc-50/80 transition">
                  <div className="flex items-center gap-3">
                    <ArrowRightLeft size={16} className={txType.color} />
                    <div>
                      <div className="text-sm text-zinc-800">
                        <span className={txType.color}>{tx.sectorLabel || txType.label}</span>
                        <span className="text-zinc-400 mx-1">-</span>
                        {tx.stockItem?.name}
                      </div>
                      <div className="text-xs text-zinc-400 flex items-center gap-2">
                        {tx.batch && <span>Parti: {tx.batch.batchNumber}</span>}
                        {tx.fromLocation && <span>{tx.fromLocation.name} &rarr;</span>}
                        {tx.toLocation && <span>{tx.toLocation.name}</span>}
                        {tx.description && <span>{tx.description}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-mono text-zinc-600">{tx.previousQty} &rarr; {tx.newQty}</span>
                    <span className={`font-mono font-bold ${tx.type === 'GIRIS' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tx.type === 'GIRIS' ? '+' : '-'}{tx.quantity}
                    </span>
                    <span className="text-zinc-400">{new Date(tx.createdAt).toLocaleDateString('tr-TR')}</span>
                  </div>
                </div>
              )
            })}
            {transactions.length === 0 && <div className="text-center text-zinc-400 py-8 text-sm">Henuz hareket yok</div>}
          </div>
        </div>
      )}

      {/* ─── Reservations Tab ───────────────────────────────────────── */}
      {tab === 'reservations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-zinc-400">{reservations.length} rezervasyon</div>
            {isManager && (
              <button className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1.5 text-xs" onClick={() => setCreating('reservation')}>
                <Plus size={14} /> Yeni Rezervasyon
              </button>
            )}
          </div>
          <div className="grid gap-2">
            {reservations.map(r => (
              <div key={r.id} className="bg-white rounded-xl border border-zinc-200 p-3 flex items-center justify-between hover:bg-zinc-50/80 transition">
                <div className="flex items-center gap-3">
                  <BookmarkCheck size={16} className="text-amber-400" />
                  <div>
                    <div className="text-sm text-zinc-800">{r.stockItem?.name}</div>
                    <div className="text-xs text-zinc-400">
                      {r.description || 'Gorev rezervasyonu'}
                      {r.expiresAt && <span className="ml-2">Son: {new Date(r.expiresAt).toLocaleDateString('tr-TR')}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-zinc-600">{r.quantity} {r.stockItem?.unit}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded ${
                    r.status === 'AKTIF' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    r.status === 'KULLANILDI' ? 'bg-blue-50 text-blue-700' :
                    r.status === 'IPTAL' ? 'bg-zinc-100 text-zinc-600' :
                    'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>{r.status}</span>
                  {r.status === 'AKTIF' && (
                    <button
                      className="text-zinc-300 hover:text-red-600 transition text-xs"
                      onClick={async () => { await cancelReservation(r.id); refetchRes() }}
                    >Iptal</button>
                  )}
                </div>
              </div>
            ))}
            {reservations.length === 0 && <div className="text-center text-zinc-400 py-8 text-sm">Henuz rezervasyon yok</div>}
          </div>
        </div>
      )}

      {/* ─── Purchase Responsible Tab ───────────────────────────────── */}
      {tab === 'purchase' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-800">Satin Alma Sorumlusu Yonetimi</h3>
              <p className="text-xs text-zinc-400 mt-1">Kritik ve risk gosteren stok uyarilarinda bildirim alacak kisiler</p>
            </div>
            {isManager && (
              <button className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1.5 text-xs" onClick={() => setCreating('purchaseResp')}>
                <Plus size={14} /> Sorumlu Ekle
              </button>
            )}
          </div>
          <div className="grid gap-2">
            {(purchaseResps as PurchaseResponsible[] || []).map(pr => (
              <div key={pr.id} className="card p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserCheck size={16} className="text-indigo-400" />
                  <div>
                    <div className="text-sm text-zinc-800">{pr.user?.name}</div>
                    <div className="text-xs text-zinc-400 flex items-center gap-2">
                      <span>{pr.user?.email}</span>
                      <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">{pr.roleType}</span>
                      {pr.departmentIds.length > 0 && (
                        <span>{pr.departmentIds.length} departman</span>
                      )}
                      {pr.departmentIds.length === 0 && (
                        <span className="text-emerald-400">Tum sirket</span>
                      )}
                    </div>
                  </div>
                </div>
                {isManager && (
                  <button
                    className="text-zinc-300 hover:text-red-600 transition"
                    onClick={async () => { if (confirm('Sorumlu kaldirilsin mi?')) { await deletePurchaseResponsible(pr.id); refetchPR() } }}
                  ><Trash2 size={14} /></button>
                )}
              </div>
            ))}
            {(!purchaseResps || (purchaseResps as any[]).length === 0) && (
              <div className="text-center text-zinc-400 py-8 text-sm">
                Henuz satin alma sorumlusu tanimlanmamis.<br />
                <span className="text-zinc-300">Kritik stok bildirimlerinin dogru kisilere ulasmasi icin sorumlu ekleyin.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── OperIQ Intelligence Tab ────────────────────────────────── */}
      {tab === 'operiq' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
                <Cpu size={14} className="text-teal-600" />
                AssetIQ - OperIQ Stok Zekasi
              </h3>
              {intelligence?.analyzedAt && (
                <p className="text-xs text-zinc-400 mt-1">
                  Son analiz: {new Date(intelligence.analyzedAt).toLocaleString('tr-TR')}
                  {intelligence.isStale && <span className="ml-2 text-amber-400">(Eski - yeniden analiz oneriliyor)</span>}
                </p>
              )}
            </div>
            {isManager && (
              <button className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1.5 text-xs" onClick={handleAnalyze} disabled={analyzing}>
                {analyzing ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
                Analiz Et
              </button>
            )}
          </div>

          {intelligence?.summary && (
            <div className="card p-4 bg-indigo-50 border-indigo-200">
              <p className="text-sm text-zinc-600">{intelligence.summary}</p>
            </div>
          )}

          <div className="space-y-3">
            {(intelligence?.insights || []).map((insight: any, i: number) => (
              <div key={i} className={`card p-4 border-l-2 ${
                insight.severity === 'KRITIK' ? 'border-l-red-500 bg-red-50/50' :
                insight.severity === 'YUKSEK' ? 'border-l-amber-500 bg-amber-50/50' :
                insight.severity === 'ORTA' ? 'border-l-blue-500 bg-blue-50/50' :
                'border-l-zinc-400 bg-zinc-50'
              }`}>
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-semibold text-zinc-800">{insight.title}</h4>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded ${
                      insight.severity === 'KRITIK' ? 'bg-red-50 text-red-700 border border-red-200' :
                      insight.severity === 'YUKSEK' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      insight.severity === 'ORTA' ? 'bg-blue-50 text-blue-700' :
                      'bg-zinc-100 text-zinc-600'
                    }`}>{insight.severity}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-50 text-zinc-400">{insight.type}</span>
                  </div>
                </div>
                <p className="text-xs text-zinc-600 mb-2">{insight.message}</p>
                {insight.recommendation && (
                  <div className="flex items-start gap-2 text-xs text-indigo-300 bg-indigo-50 rounded p-2">
                    <ChevronRight size={12} className="mt-0.5 flex-shrink-0" />
                    {insight.recommendation}
                  </div>
                )}
                {insight.sectorContext && (
                  <p className="text-[10px] text-zinc-400 mt-2 italic">{insight.sectorContext}</p>
                )}
              </div>
            ))}
            {(!intelligence?.insights || intelligence.insights.length === 0) && !analyzing && (
              <div className="text-center text-zinc-400 py-8 text-sm">
                Henuz analiz yapilmamis. "Analiz Et" butonuna tiklayin.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Create Modals ──────────────────────────────────────────── */}
      {creating === 'qr' && (
        <CreateQrModal
          stockItems={stockItems}
          onClose={() => setCreating(null)}
          onCreated={() => { setCreating(null); refetchQr() }}
        />
      )}
      {creating === 'location' && (
        <CreateLocationModal
          departments={departments}
          locations={locations}
          onClose={() => setCreating(null)}
          onCreated={() => { setCreating(null); refetchLoc() }}
        />
      )}
      {creating === 'batch' && (
        <CreateBatchModal
          stockItems={stockItems}
          locations={locations}
          onClose={() => setCreating(null)}
          onCreated={() => { setCreating(null); refetchBatch() }}
        />
      )}
      {creating === 'transaction' && (
        <CreateTransactionModal
          stockItems={stockItems}
          locations={locations}
          onClose={() => setCreating(null)}
          onCreated={() => { setCreating(null); refetchTx() }}
        />
      )}
      {creating === 'reservation' && (
        <CreateReservationModal
          stockItems={stockItems}
          onClose={() => setCreating(null)}
          onCreated={() => { setCreating(null); refetchRes() }}
        />
      )}
      {creating === 'purchaseResp' && (
        <CreatePurchaseRespModal
          users={users}
          departments={departments}
          onClose={() => setCreating(null)}
          onCreated={() => { setCreating(null); refetchPR() }}
        />
      )}
    </div>
  )
}

// ─── Create Modals ──────────────────────────────────────────────────────────

function CreateQrModal({ stockItems, onClose, onCreated }: { stockItems: any[]; onClose: () => void; onCreated: () => void }) {
  const [entityType, setEntityType] = useState('STOCK_ITEM')
  const [entityId, setEntityId] = useState('')
  const [label, setLabel] = useState('')
  const [saving, setSaving] = useState(false)
  return (
    <DraggableModal title="Yeni QR Kodu" onClose={onClose}>
      <div className="space-y-3 p-4">
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Varlik Tipi</label>
          <select className="input w-full" value={entityType} onChange={e => setEntityType(e.target.value)}>
            {ENTITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        {entityType === 'STOCK_ITEM' && (
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Stok Kalemi</label>
            <select className="input w-full" value={entityId} onChange={e => setEntityId(e.target.value)}>
              <option value="">Secin...</option>
              {stockItems.map(i => <option key={i.id} value={i.id}>{i.name} ({i.code || '-'})</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Etiket (opsiyonel)</label>
          <input className="input w-full" value={label} onChange={e => setLabel(e.target.value)} placeholder="QR etiketi..." />
        </div>
        <button className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1.5 w-full" disabled={saving} onClick={async () => {
          setSaving(true)
          try { await createQrEntity({ entityType, entityId: entityId || undefined, label: label || undefined }); onCreated() }
          catch (e: any) { alert(e.message) }
          finally { setSaving(false) }
        }}>
          {saving ? 'Olusturuluyor...' : 'QR Olustur'}
        </button>
      </div>
    </DraggableModal>
  )
}

function CreateLocationModal({ departments, locations, onClose, onCreated }: { departments: any[]; locations: any[]; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', code: '', category: 'WAREHOUSE', departmentId: '', parentId: '', description: '' })
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  return (
    <DraggableModal title="Yeni Lokasyon" onClose={onClose}>
      <div className="space-y-3 p-4">
        <div><label className="block text-xs font-medium text-zinc-600 mb-1">Ad *</label><input className="input w-full" value={form.name} onChange={e => set('name', e.target.value)} /></div>
        <div><label className="block text-xs font-medium text-zinc-600 mb-1">Kod</label><input className="input w-full" value={form.code} onChange={e => set('code', e.target.value)} /></div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Kategori</label>
          <select className="input w-full" value={form.category} onChange={e => set('category', e.target.value)}>
            {LOCATION_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Departman</label>
          <select className="input w-full" value={form.departmentId} onChange={e => set('departmentId', e.target.value)}>
            <option value="">Secin...</option>
            {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Ust Lokasyon</label>
          <select className="input w-full" value={form.parentId} onChange={e => set('parentId', e.target.value)}>
            <option value="">Yok (Kok)</option>
            {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div><label className="block text-xs font-medium text-zinc-600 mb-1">Aciklama</label><input className="input w-full" value={form.description} onChange={e => set('description', e.target.value)} /></div>
        <button className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1.5 w-full" disabled={saving} onClick={async () => {
          if (!form.name.trim()) return alert('Ad zorunlu')
          setSaving(true)
          try {
            await createInventoryLocation({ ...form, departmentId: form.departmentId || undefined, parentId: form.parentId || undefined, code: form.code || undefined, description: form.description || undefined })
            onCreated()
          } catch (e: any) { alert(e.message) }
          finally { setSaving(false) }
        }}>
          {saving ? 'Kaydediliyor...' : 'Lokasyon Olustur'}
        </button>
      </div>
    </DraggableModal>
  )
}

function CreateBatchModal({ stockItems, locations, onClose, onCreated }: { stockItems: any[]; locations: any[]; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ stockItemId: '', locationId: '', batchNumber: '', quantity: '0', expiryDate: '', supplier: '' })
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  return (
    <DraggableModal title="Yeni Parti / Lot" onClose={onClose}>
      <div className="space-y-3 p-4">
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Stok Kalemi *</label>
          <select className="input w-full" value={form.stockItemId} onChange={e => set('stockItemId', e.target.value)}>
            <option value="">Secin...</option>
            {stockItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </div>
        <div><label className="block text-xs font-medium text-zinc-600 mb-1">Parti No *</label><input className="input w-full" value={form.batchNumber} onChange={e => set('batchNumber', e.target.value)} placeholder="orn: LOT-2026-001" /></div>
        <div><label className="block text-xs font-medium text-zinc-600 mb-1">Miktar</label><input className="input w-full" type="number" value={form.quantity} onChange={e => set('quantity', e.target.value)} /></div>
        <div><label className="block text-xs font-medium text-zinc-600 mb-1">Son Kullanma Tarihi</label><input className="input w-full" type="date" value={form.expiryDate} onChange={e => set('expiryDate', e.target.value)} /></div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Lokasyon</label>
          <select className="input w-full" value={form.locationId} onChange={e => set('locationId', e.target.value)}>
            <option value="">Secin...</option>
            {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div><label className="block text-xs font-medium text-zinc-600 mb-1">Tedarikci</label><input className="input w-full" value={form.supplier} onChange={e => set('supplier', e.target.value)} /></div>
        <button className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1.5 w-full" disabled={saving} onClick={async () => {
          if (!form.stockItemId || !form.batchNumber.trim()) return alert('Stok kalemi ve parti numarasi zorunlu')
          setSaving(true)
          try {
            await createInventoryBatch({
              stockItemId: form.stockItemId, batchNumber: form.batchNumber, quantity: Number(form.quantity),
              locationId: form.locationId || undefined, supplier: form.supplier || undefined,
              expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : undefined,
            })
            onCreated()
          } catch (e: any) { alert(e.message) }
          finally { setSaving(false) }
        }}>
          {saving ? 'Kaydediliyor...' : 'Parti Olustur'}
        </button>
      </div>
    </DraggableModal>
  )
}

function CreateTransactionModal({ stockItems, locations, onClose, onCreated }: { stockItems: any[]; locations: any[]; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ stockItemId: '', type: 'GIRIS', quantity: '1', fromLocationId: '', toLocationId: '', description: '' })
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  return (
    <DraggableModal title="Yeni Stok Hareketi" onClose={onClose}>
      <div className="space-y-3 p-4">
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Stok Kalemi *</label>
          <select className="input w-full" value={form.stockItemId} onChange={e => set('stockItemId', e.target.value)}>
            <option value="">Secin...</option>
            {stockItems.map(i => <option key={i.id} value={i.id}>{i.name} (Mevcut: {i.quantity})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Hareket Tipi *</label>
          <select className="input w-full" value={form.type} onChange={e => set('type', e.target.value)}>
            {TX_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div><label className="block text-xs font-medium text-zinc-600 mb-1">Miktar *</label><input className="input w-full" type="number" min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} /></div>
        {form.type === 'TRANSFER' && (
          <>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Kaynak Lokasyon</label>
              <select className="input w-full" value={form.fromLocationId} onChange={e => set('fromLocationId', e.target.value)}>
                <option value="">Secin...</option>
                {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Hedef Lokasyon</label>
              <select className="input w-full" value={form.toLocationId} onChange={e => set('toLocationId', e.target.value)}>
                <option value="">Secin...</option>
                {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </>
        )}
        <div><label className="block text-xs font-medium text-zinc-600 mb-1">Aciklama</label><input className="input w-full" value={form.description} onChange={e => set('description', e.target.value)} /></div>
        <button className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1.5 w-full" disabled={saving} onClick={async () => {
          if (!form.stockItemId || !form.quantity) return alert('Stok kalemi ve miktar zorunlu')
          setSaving(true)
          try {
            await createInventoryTransaction({
              stockItemId: form.stockItemId, type: form.type, quantity: Number(form.quantity),
              fromLocationId: form.fromLocationId || undefined, toLocationId: form.toLocationId || undefined,
              description: form.description || undefined,
            })
            onCreated()
          } catch (e: any) { alert(e.message) }
          finally { setSaving(false) }
        }}>
          {saving ? 'Kaydediliyor...' : 'Hareket Kaydet'}
        </button>
      </div>
    </DraggableModal>
  )
}

function CreateReservationModal({ stockItems, onClose, onCreated }: { stockItems: any[]; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ stockItemId: '', quantity: '1', description: '', expiresAt: '' })
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  return (
    <DraggableModal title="Yeni Rezervasyon" onClose={onClose}>
      <div className="space-y-3 p-4">
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Stok Kalemi *</label>
          <select className="input w-full" value={form.stockItemId} onChange={e => set('stockItemId', e.target.value)}>
            <option value="">Secin...</option>
            {stockItems.map(i => <option key={i.id} value={i.id}>{i.name} (Mevcut: {i.quantity})</option>)}
          </select>
        </div>
        <div><label className="block text-xs font-medium text-zinc-600 mb-1">Miktar *</label><input className="input w-full" type="number" min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} /></div>
        <div><label className="block text-xs font-medium text-zinc-600 mb-1">Aciklama</label><input className="input w-full" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Hangi gorev icin..." /></div>
        <div><label className="block text-xs font-medium text-zinc-600 mb-1">Son Gecerlilik</label><input className="input w-full" type="date" value={form.expiresAt} onChange={e => set('expiresAt', e.target.value)} /></div>
        <button className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1.5 w-full" disabled={saving} onClick={async () => {
          if (!form.stockItemId || !form.quantity) return alert('Stok kalemi ve miktar zorunlu')
          setSaving(true)
          try {
            await createReservation({
              stockItemId: form.stockItemId, quantity: Number(form.quantity),
              description: form.description || undefined,
              expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
            })
            onCreated()
          } catch (e: any) { alert(e.message) }
          finally { setSaving(false) }
        }}>
          {saving ? 'Kaydediliyor...' : 'Rezervasyon Olustur'}
        </button>
      </div>
    </DraggableModal>
  )
}

function CreatePurchaseRespModal({ users, departments, onClose, onCreated }: { users: any[]; departments: any[]; onClose: () => void; onCreated: () => void }) {
  const [userId, setUserId] = useState('')
  const [roleType, setRoleType] = useState('PRIMARY')
  const [selectedDepts, setSelectedDepts] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  return (
    <DraggableModal title="Satin Alma Sorumlusu Ekle" onClose={onClose}>
      <div className="space-y-3 p-4">
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Kullanici *</label>
          <select className="input w-full" value={userId} onChange={e => setUserId(e.target.value)}>
            <option value="">Secin...</option>
            {users.map((u: any) => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Sorumluluk Tipi</label>
          <select className="input w-full" value={roleType} onChange={e => setRoleType(e.target.value)}>
            <option value="PRIMARY">Ana Satin Alma Sorumlusu</option>
            <option value="BACKUP">Yedek Sorumlu</option>
            <option value="KEY_ACCOUNT">Key Account Manager</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Sorumlu Departmanlar (bos = tum sirket)</label>
          <div className="max-h-32 overflow-y-auto space-y-1 border border-zinc-200 rounded p-2">
            {departments.map((d: any) => (
              <label key={d.id} className="flex items-center gap-2 text-xs text-zinc-600 cursor-pointer hover:text-zinc-700">
                <input
                  type="checkbox"
                  checked={selectedDepts.includes(d.id)}
                  onChange={e => {
                    if (e.target.checked) setSelectedDepts(p => [...p, d.id])
                    else setSelectedDepts(p => p.filter(x => x !== d.id))
                  }}
                />
                {d.name}
              </label>
            ))}
          </div>
        </div>
        <button className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1.5 w-full" disabled={saving} onClick={async () => {
          if (!userId) return alert('Kullanici secin')
          setSaving(true)
          try {
            await createPurchaseResponsible({ userId, roleType, departmentIds: selectedDepts })
            onCreated()
          } catch (e: any) { alert(e.message) }
          finally { setSaving(false) }
        }}>
          {saving ? 'Kaydediliyor...' : 'Sorumlu Ekle'}
        </button>
      </div>
    </DraggableModal>
  )
}
