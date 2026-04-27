import { useState, useRef } from 'react'
import { Search, FileText, CheckCircle, AlertCircle, Clock, Camera, WifiOff, FileSpreadsheet, Sparkles, Loader2, Plus, X, Send, Users } from 'lucide-react'
import clsx from 'clsx'
import { useReports, useDepartments, useUsers, updateReportStatus, analyzeReport, createReport, submitReport, broadcastReport } from '../lib/hooks'
import type { FieldReport, ReportStatus, Department, FieldReportAIAnalysis } from '../types'
import DraggableModal from '../components/ui/DraggableModal'
import { exportToExcel } from '../lib/excelExport'
import { useToolbarActions } from '../lib/useToolbarActions'
import { useLanguage } from '../context/LanguageContext'
import { SECTOR_TEMPLATES } from '../data/sectorTemplates'

// Build department code -> bilingual name map from sector templates
const DEPT_NAME_MAP: Record<string, { tr: string; en: string }> = {}
for (const sector of Object.values(SECTOR_TEMPLATES)) {
  for (const dept of sector.departments) {
    DEPT_NAME_MAP[dept.code] = dept.name
  }
}
function deptName(d: Department, tr: boolean): string {
  const bilingual = DEPT_NAME_MAP[d.code]
  return bilingual ? (tr ? bilingual.tr : bilingual.en) : d.name
}

const STATUS_LABELS: Record<ReportStatus, { tr: string; en: string }> = {
  taslak:      { tr: 'Taslak',     en: 'Draft'    },
  gonderildi:  { tr: 'Gonderildi', en: 'Submitted' },
  onaylandi:   { tr: 'Onaylandi',  en: 'Approved'  },
  reddedildi:  { tr: 'Reddedildi', en: 'Rejected'  },
}

const STATUS_CONFIG: Record<ReportStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  taslak:      { label: 'Taslak',     color: 'badge-neutral', icon: Clock       },
  gonderildi:  { label: 'Gonderildi', color: 'badge-info',    icon: FileText    },
  onaylandi:   { label: 'Onaylandi',  color: 'badge-success', icon: CheckCircle },
  reddedildi:  { label: 'Reddedildi', color: 'badge-danger',  icon: AlertCircle },
}

function ReportCard({
  report,
  departments,
  tr = true,
  onSelect,
}: {
  report: FieldReport
  departments: Department[]
  tr?: boolean
  onSelect: (r: FieldReport) => void
}) {
  const dept   = departments.find(d => d.id === report.departmentId)
  const config = STATUS_CONFIG[report.status]
  const statusLabel = STATUS_LABELS[report.status] ? (tr ? STATUS_LABELS[report.status].tr : STATUS_LABELS[report.status].en) : config.label
  const StatusIcon = config.icon
  const progress = report.totalItems > 0
    ? Math.round((report.completedItems / report.totalItems) * 100)
    : 0

  return (
    <div
      onClick={() => onSelect(report)}
      className="card p-5 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={config.color}>{statusLabel}</span>
            {report.offlineCreated && (
              <span className="badge bg-amber-100 text-amber-700 gap-1">
                <WifiOff size={10} /> {tr ? 'Cevrimdisi' : 'Offline'}
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-slate-900 leading-snug">{report.title}</h3>
        </div>
        <StatusIcon size={18} className={
          report.status === 'onaylandi'  ? 'text-green-500' :
          report.status === 'gonderildi' ? 'text-blue-500'  :
          report.status === 'reddedildi' ? 'text-red-500'   : 'text-slate-400'
        } />
      </div>

      <p className="text-xs text-slate-500 line-clamp-2 mb-3">{report.content}</p>

      {report.issues.length > 0 && (
        <div className="mb-3 space-y-1">
          {report.issues.slice(0, 2).map((issue, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5">
              <AlertCircle size={11} className="flex-shrink-0 mt-0.5" />
              <span className="line-clamp-1">{issue}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mb-3">
        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
          <span>Kontrol listesi</span>
          <span>{report.completedItems}/{report.totalItems}</span>
        </div>
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={clsx('h-full rounded-full', progress === 100 ? 'bg-green-500' : 'bg-blue-500')}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400">
        <div className="flex items-center gap-3">
          {report.authorName && (
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                <span className="text-white text-[8px]">{report.authorName[0]}</span>
              </div>
              <span>{report.authorName.split(' ')[0]}</span>
            </div>
          )}
          {dept && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: dept.color }} />
              <span>{deptName(dept, tr)}</span>
            </div>
          )}
          {report.photos.length > 0 && (
            <span className="flex items-center gap-1">
              <Camera size={10} /> {report.photos.length}
            </span>
          )}
        </div>
        <span>{new Date(report.createdAt).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  )
}

function ReportDetailModal({
  report,
  departments,
  tr = true,
  onClose,
  onStatusChange,
}: {
  report: FieldReport
  departments: Department[]
  tr?: boolean
  onClose: () => void
  onStatusChange: () => void
}) {
  const dept   = departments.find(d => d.id === report.departmentId)
  const config = STATUS_CONFIG[report.status]
  const statusLabel = STATUS_LABELS[report.status] ? (tr ? STATUS_LABELS[report.status].tr : STATUS_LABELS[report.status].en) : config.label
  const [acting,    setActing]    = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis,  setAnalysis]  = useState<FieldReportAIAnalysis | null>(report.aiAnalysis ?? null)
  const [analyzeErr, setAnalyzeErr] = useState<string | null>(null)

  const [showBroadcast, setShowBroadcast] = useState(false)

  const handleAction = async (action: 'onaylandi' | 'reddedildi') => {
    setActing(true)
    try {
      await updateReportStatus(report.id, action)
      onStatusChange()
      onClose()
    } catch {
      setActing(false)
    }
  }

  const handleSubmit = async () => {
    setActing(true)
    try {
      await submitReport(report.id)
      onStatusChange()
      onClose()
    } catch { setActing(false) }
  }

  const handleAnalyze = async () => {
    setAnalyzing(true)
    setAnalyzeErr(null)
    try {
      const result = await analyzeReport(report.id)
      setAnalysis(result)
    } catch (e: any) {
      setAnalyzeErr(e.message ?? 'OperIQ analizi başarısız')
    } finally {
      setAnalyzing(false)
    }
  }

  const URGENCY_STYLES: Record<string, string> = {
    dusuk:  'bg-zinc-100 text-zinc-700 border-zinc-300',
    orta:   'bg-blue-50 text-blue-700 border-blue-300',
    yuksek: 'bg-amber-50 text-amber-700 border-amber-300',
    kritik: 'bg-red-50 text-red-700 border-red-300',
  }
  const URGENCY_LABEL: Record<string, string> = {
    dusuk: 'Düşük', orta: 'Orta', yuksek: 'Yüksek', kritik: 'Kritik',
  }

  return (
    <DraggableModal
      title={report.title}
      subtitle={statusLabel}
      icon={<FileText size={13} />}
      onClose={onClose}
      width={640}
      maxHeight="90vh"
      footer={
        report.status === 'taslak' ? (
          <>
            <button type="button" disabled={acting} onClick={handleSubmit}
              className="btn-primary disabled:opacity-50">
              <Send size={14} /> {tr ? 'Gonder' : 'Submit'}
            </button>
            <button type="button" onClick={() => setShowBroadcast(true)}
              className="btn-default">
              <Users size={14} /> {tr ? 'Ilet' : 'Broadcast'}
            </button>
          </>
        ) : report.status === 'gonderildi' ? (
          <>
            <button type="button" disabled={acting} onClick={() => handleAction('onaylandi')}
              className="btn-primary disabled:opacity-50">
              <CheckCircle size={15} /> {tr ? 'Onayla' : 'Approve'}
            </button>
            <button type="button" disabled={acting} onClick={() => handleAction('reddedildi')}
              className="btn-danger disabled:opacity-50">
              {tr ? 'Reddet' : 'Reject'}
            </button>
            <button type="button" onClick={() => setShowBroadcast(true)}
              className="btn-default">
              <Users size={14} /> {tr ? 'Ilet' : 'Broadcast'}
            </button>
          </>
        ) : undefined
      }
    >
      <div className="p-6 space-y-5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={config.color}>{statusLabel}</span>
          {report.offlineCreated && (
            <span className="badge bg-amber-100 text-amber-700 gap-1">
              <WifiOff size={10} /> {tr ? 'Cevrimdisi' : 'Offline'}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          {[
            { label: 'Raporlayan',  value: report.authorName ?? '-' },
            { label: tr ? 'Departman' : 'Department',   value: dept ? deptName(dept, tr) : '-'        },
            { label: 'Oluşturulma', value: new Date(report.createdAt).toLocaleString('tr-TR') },
          ].map(item => (
            <div key={item.label} className="rounded-lg p-3" style={{ background: 'var(--border-subtle)', border: '1px solid var(--border)' }}>
              <p className="mb-0.5" style={{ color: 'var(--text-3)' }}>{item.label}</p>
              <p className="font-medium" style={{ color: 'var(--text-1)' }}>{item.value}</p>
            </div>
          ))}
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-1)' }}>Rapor İçeriği</h3>
          <div className="rounded-xl p-4 text-sm leading-relaxed" style={{ background: 'var(--border-subtle)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
            {report.content || '-'}
          </div>
        </div>

        {report.issues.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-1)' }}>
              <AlertCircle size={14} className="text-amber-500" /> Tespit Edilen Sorunlar
            </h3>
            <ul className="space-y-2">
              {report.issues.map((issue, i) => (
                <li key={i} className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 rounded-lg px-3 py-2.5">
                  <AlertCircle size={14} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-amber-800 dark:text-amber-300">{issue}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {report.photos.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-1)' }}>
              <Camera size={14} /> Fotograflar ({report.photos.length}/5)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {report.photos.map(photo => (
                <div key={photo.id} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  <img src={photo.url} alt={photo.caption} className="w-full h-32 object-cover" style={{ background: 'var(--border-subtle)' }} />
                  <p className="text-xs p-2" style={{ color: 'var(--text-3)' }}>{photo.caption}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {(report as any).videos?.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-1)' }}>
              <Camera size={14} /> Video ({(report as any).videos.length}/1 - maks. 20sn)
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {(report as any).videos.map((video: any) => (
                <div key={video.id} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  <video
                    src={video.url}
                    controls
                    className="w-full max-h-48"
                    style={{ background: '#000' }}
                  />
                  <div className="flex items-center justify-between p-2" style={{ background: 'var(--border-subtle)' }}>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>{video.caption}</p>
                    <span className="text-[10px] font-mono" style={{ color: 'var(--text-3)' }}>{video.durationSec}sn</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* OperIQ AI Analysis */}
        <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/60 to-cyan-50/60 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold flex items-center gap-2 text-indigo-900">
              <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center border border-indigo-200">
                <Sparkles size={13} className="text-indigo-600" />
              </div>
              OperIQ Analizi
            </h3>
            {!analysis && (
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={analyzing}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 flex items-center gap-1.5"
                data-help="Bu raporu OperIQ ile analiz et"
              >
                {analyzing ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                {analyzing ? 'Analiz ediliyor...' : 'Analiz Et'}
              </button>
            )}
          </div>

          {analyzeErr && (
            <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5 mb-3">
              {analyzeErr}
            </div>
          )}

          {!analysis && !analyzing && (
            <p className="text-[11px] text-zinc-500 italic">
              Henüz analiz yapılmadı. Yeni raporlar otomatik analiz edilir, bu raporu manuel analiz için yukarıdaki butona tıklayın.
            </p>
          )}

          {analysis && (
            <div className="space-y-3">
              {/* Aciliyet seviyesi */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Aciliyet:</span>
                <span className={clsx(
                  'text-[11px] font-bold px-2 py-0.5 rounded-md border',
                  URGENCY_STYLES[analysis.aciliyetSeviyesi] ?? URGENCY_STYLES.orta
                )}>
                  {URGENCY_LABEL[analysis.aciliyetSeviyesi] ?? analysis.aciliyetSeviyesi}
                </span>
              </div>

              {/* Özet */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Yönetici Özeti</p>
                <p className="text-[12px] text-zinc-800 leading-relaxed">{analysis.ozet}</p>
              </div>

              {/* Anahtar bulgular */}
              {analysis.anahtarBulgular?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Anahtar Bulgular</p>
                  <ul className="space-y-1">
                    {analysis.anahtarBulgular.map((b, i) => (
                      <li key={i} className="text-[11px] text-zinc-700 flex gap-2">
                        <span className="text-indigo-500 font-bold">•</span> {b}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Olası nedenler */}
              {analysis.olasiNedenler?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Olası Nedenler</p>
                  <ul className="space-y-1">
                    {analysis.olasiNedenler.map((n, i) => (
                      <li key={i} className="text-[11px] text-zinc-700 flex gap-2">
                        <span className="text-amber-500 font-bold">•</span> {n}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Önerilen aksiyonlar */}
              {analysis.onerilenAksiyonlar?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Önerilen Aksiyonlar</p>
                  <ul className="space-y-1">
                    {analysis.onerilenAksiyonlar.map((a, i) => (
                      <li key={i} className="text-[11px] text-zinc-700 flex gap-2">
                        <span className="text-emerald-500 font-bold">→</span> {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {report.aiAnalyzedAt && (
                <p className="text-[9px] text-zinc-400 pt-2 border-t border-indigo-200/50">
                  Son analiz: {new Date(report.aiAnalyzedAt).toLocaleString('tr-TR')}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      {showBroadcast && (
        <BroadcastReportModal
          reportId={report.id}
          tr={tr}
          onClose={() => setShowBroadcast(false)}
          onDone={() => { setShowBroadcast(false); onStatusChange(); onClose() }}
        />
      )}
    </DraggableModal>
  )
}

/* ── Broadcast Report Modal ── */
function BroadcastReportModal({ reportId, tr, onClose, onDone }: {
  reportId: string; tr: boolean; onClose: () => void; onDone: () => void
}) {
  const { users } = useUsers({ includeMobile: true })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)

  const MOBILE_ROLES = ['isci', 'teknisyen', 'muhendis', 'supervizor']
  const mobileUsers = users.filter(u => u.active && MOBILE_ROLES.includes(u.role))
  const platformUsers = users.filter(u => u.active && !MOBILE_ROLES.includes(u.role))

  const toggle = (id: string) => setSelectedIds(prev => {
    const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s
  })
  const selectAll = () => setSelectedIds(new Set(users.filter(u => u.active).map(u => u.id)))
  const clearAll = () => setSelectedIds(new Set())

  const handleSend = async () => {
    if (selectedIds.size === 0) return
    setSending(true)
    try {
      await broadcastReport(reportId, [...selectedIds])
      onDone()
    } catch { setSending(false) }
  }

  return (
    <DraggableModal title={tr ? 'Raporu Ilet' : 'Broadcast Report'} icon={<Users size={13} />} onClose={onClose} width={420}>
      <div className="p-4 space-y-3">
        <div className="flex gap-2 mb-2">
          <button type="button" onClick={selectAll} className="text-[11px] text-indigo-600 font-semibold hover:underline">
            {tr ? 'Hepsini Sec' : 'Select All'}
          </button>
          <span className="text-zinc-300">|</span>
          <button type="button" onClick={clearAll} className="text-[11px] text-zinc-500 font-semibold hover:underline">
            {tr ? 'Temizle' : 'Clear'}
          </button>
          <span className="ml-auto text-[11px] text-zinc-500">{selectedIds.size} {tr ? 'kisi' : 'selected'}</span>
        </div>
        <div className="border border-zinc-200 rounded-xl max-h-[300px] overflow-y-auto">
          {mobileUsers.length > 0 && (
            <>
              <div className="flex items-center justify-between px-3 py-1.5 bg-cyan-50 border-b border-zinc-100 sticky top-0">
                <span className="text-[10px] font-bold text-cyan-700">{tr ? 'Mobil Kullanicilar' : 'Mobile Users'} ({mobileUsers.length})</span>
                <button type="button" onClick={() => setSelectedIds(prev => { const s = new Set(prev); mobileUsers.forEach(u => s.add(u.id)); return s })}
                  className="text-[9px] text-cyan-600 font-semibold hover:underline">{tr ? 'Tumunu Sec' : 'All'}</button>
              </div>
              {mobileUsers.map(u => (
                <label key={u.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-50 cursor-pointer">
                  <input type="checkbox" checked={selectedIds.has(u.id)} onChange={() => toggle(u.id)} className="rounded border-zinc-300 text-cyan-600" />
                  <span className="text-[11px] text-zinc-700 truncate flex-1">{u.name}</span>
                  <span className="text-[9px] text-zinc-400">{u.role}</span>
                </label>
              ))}
            </>
          )}
          {platformUsers.length > 0 && (
            <>
              <div className="flex items-center justify-between px-3 py-1.5 bg-indigo-50 border-b border-zinc-100 sticky top-0">
                <span className="text-[10px] font-bold text-indigo-700">{tr ? 'Platform Kullanicilari' : 'Platform Users'} ({platformUsers.length})</span>
                <button type="button" onClick={() => setSelectedIds(prev => { const s = new Set(prev); platformUsers.forEach(u => s.add(u.id)); return s })}
                  className="text-[9px] text-indigo-600 font-semibold hover:underline">{tr ? 'Tumunu Sec' : 'All'}</button>
              </div>
              {platformUsers.map(u => (
                <label key={u.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-50 cursor-pointer">
                  <input type="checkbox" checked={selectedIds.has(u.id)} onChange={() => toggle(u.id)} className="rounded border-zinc-300 text-indigo-600" />
                  <span className="text-[11px] text-zinc-700 truncate flex-1">{u.name}</span>
                  <span className="text-[9px] text-zinc-400">{u.role}</span>
                </label>
              ))}
            </>
          )}
        </div>
        <div className="flex gap-2 pt-2 border-t border-zinc-100">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center text-[12px]">{tr ? 'Iptal' : 'Cancel'}</button>
          <button type="button" onClick={handleSend} disabled={sending || selectedIds.size === 0}
            className="btn-primary flex-1 justify-center text-[12px] disabled:opacity-50">
            {sending ? <Loader2 size={14} className="animate-spin" /> : <><Send size={12} /> {tr ? 'Ilet' : 'Send'}</>}
          </button>
        </div>
      </div>
    </DraggableModal>
  )
}

export default function Reports() {
  const { lang } = useLanguage()
  const tr = lang === 'tr'
  const [search,        setSearch]        = useState('')
  const [filterStatus,  setFilterStatus]  = useState<string>('tumu')
  const [filterDept,    setFilterDept]    = useState<string>('tumu')
  const [selectedReport, setSelectedReport] = useState<FieldReport | null>(null)
  const [showCreate,    setShowCreate]    = useState(false)

  const { reports, loading, refetch } = useReports({
    status:       filterStatus,
    departmentId: filterDept,
    search,
  })
  const { departments } = useDepartments()
  const searchRef = useRef<HTMLInputElement>(null)

  const handleExportExcel = () => {
    const deptMap = Object.fromEntries(departments.map(d => [d.id, deptName(d, tr)]))
    exportToExcel({
      filename:  `raporlar_${new Date().toISOString().slice(0,10)}.xlsx`,
      sheetName: 'Raporlar',
      columns: [
        { header: 'Başlık',     accessor: r => r.title,                                          width: 36 },
        { header: 'İçerik',     accessor: r => r.content,                                        width: 50 },
        { header: 'Departman',  accessor: r => deptMap[r.departmentId] ?? '-',                   width: 22 },
        { header: 'Yazar',      accessor: r => r.authorName ?? '-',                              width: 22 },
        { header: tr ? 'Durum' : 'Status', accessor: r => { const s = STATUS_LABELS[r.status]; return s ? (tr ? s.tr : s.en) : r.status },  width: 14 },
        { header: 'Fotoğraf',   accessor: r => r.photos?.length ?? 0,                            width: 10 },
        { header: 'Oluşturma',  accessor: r => new Date(r.createdAt).toLocaleString('tr-TR'),    width: 18 },
      ],
      rows: reports,
    })
  }

  useToolbarActions({
    onSearch:  () => searchRef.current?.focus(),
    onRefresh: () => refetch(),
    onExport:  () => handleExportExcel(),
  })

  const statusCounts = reports.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: tr ? 'Toplam Rapor' : 'Total Reports',      value: reports.length,                          color: 'text-slate-700', bg: 'bg-slate-50' },
          { label: tr ? 'Onay Bekleyen' : 'Pending',         value: statusCounts['gonderildi']  || 0,         color: 'text-blue-700',  bg: 'bg-blue-50'  },
          { label: tr ? 'Onaylanan' : 'Approved',            value: statusCounts['onaylandi']   || 0,         color: 'text-green-700', bg: 'bg-green-50' },
          { label: tr ? 'Sorunlu Raporlar' : 'With Issues', value: reports.filter(r => r.issues.length > 0).length, color: 'text-amber-700', bg: 'bg-amber-50' },
        ].map(item => (
          <div key={item.label} className={clsx('card p-4', item.bg)}>
            <p className="text-xs text-slate-500 mb-1">{item.label}</p>
            <p className={clsx('text-2xl font-bold', item.color)}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={searchRef}
            className="input pl-9"
            placeholder={tr ? 'Rapor ara...' : 'Search reports...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          aria-label="Durum filtresi"
          className="select w-44"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="tumu">{tr ? 'Tum Durumlar' : 'All Statuses'}</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{tr ? v.tr : v.en}</option>)}
        </select>
        <select
          aria-label="Departman filtresi"
          className="select w-44"
          value={filterDept}
          onChange={e => setFilterDept(e.target.value)}
        >
          <option value="tumu">{tr ? 'Tum Departmanlar' : 'All Departments'}</option>
          {departments.map(d => <option key={d.id} value={d.id}>{deptName(d, tr)}</option>)}
        </select>
        <button type="button" className="btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={14} /> {tr ? 'Yeni Rapor Olustur' : 'Create Report'}
        </button>
      </div>

      {showCreate && <CreateReportModal departments={departments} tr={tr} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); refetch() }} />}

      {/* Report Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="card h-40 animate-pulse" />)}
        </div>
      ) : reports.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">{tr ? 'Rapor bulunamadi' : 'No reports found'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {reports.map(report => (
            <ReportCard
              key={report.id}
              report={report}
              departments={departments}
              tr={tr}
              onSelect={setSelectedReport}
            />
          ))}
        </div>
      )}

      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          departments={departments}
          tr={tr}
          onClose={() => setSelectedReport(null)}
          onStatusChange={refetch}
        />
      )}
    </div>
  )
}

/* ── Create Report Modal ── */
function CreateReportModal({ departments, tr, onClose, onCreated }: {
  departments: Department[]
  tr: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [deptId, setDeptId] = useState('')
  const [severity, setSeverity] = useState('ORTA')
  const [tags, setTags] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!title.trim() || !deptId) { setError(tr ? 'Baslik ve departman zorunludur' : 'Title and department are required'); return }
    setSaving(true)
    setError('')
    try {
      await createReport({
        title: title.trim(),
        content: content.trim() || undefined,
        departmentId: deptId,
        severity,
        tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      })
      onCreated()
    } catch (e) {
      setError((e as any)?.message || (tr ? 'Rapor olusturulamadi' : 'Failed to create report'))
    } finally { setSaving(false) }
  }

  return (
    <DraggableModal title={tr ? 'Yeni Rapor Olustur' : 'Create Report'} icon={<FileText size={13} />} onClose={onClose} width={480}>
      <div className="p-5 space-y-4">
        <div>
          <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">{tr ? 'Baslik' : 'Title'} *</label>
          <input className="input" placeholder={tr ? 'Gunluk Saha Raporu' : 'Daily Field Report'} value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">{tr ? 'Aciklama' : 'Description'}</label>
          <textarea className="input min-h-[80px]" placeholder={tr ? 'Rapor icerigi...' : 'Report content...'} value={content} onChange={e => setContent(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">{tr ? 'Departman' : 'Department'} *</label>
            <select className="select" value={deptId} onChange={e => setDeptId(e.target.value)}>
              <option value="">{tr ? 'Seciniz' : 'Select'}</option>
              {departments.map(d => <option key={d.id} value={d.id}>{deptName(d, tr)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">{tr ? 'Oncelik' : 'Priority'}</label>
            <select className="select" value={severity} onChange={e => setSeverity(e.target.value)}>
              <option value="DUSUK">{tr ? 'Dusuk' : 'Low'}</option>
              <option value="ORTA">{tr ? 'Orta' : 'Medium'}</option>
              <option value="YUKSEK">{tr ? 'Yuksek' : 'High'}</option>
              <option value="KRITIK">{tr ? 'Kritik' : 'Critical'}</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">{tr ? 'Etiketler' : 'Tags'}</label>
          <input className="input" placeholder={tr ? 'virgul ile ayirin: bakim, acil, saha' : 'comma separated: maintenance, urgent'} value={tags} onChange={e => setTags(e.target.value)} />
        </div>
        {error && <p className="text-[12px] text-red-600">{error}</p>}
        <div className="flex gap-2 pt-2 border-t border-zinc-100">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center text-[12px]">{tr ? 'Iptal' : 'Cancel'}</button>
          <button type="button" onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center text-[12px]">
            {saving ? <Loader2 size={14} className="animate-spin" /> : (tr ? 'Olustur' : 'Create')}
          </button>
        </div>
      </div>
    </DraggableModal>
  )
}
