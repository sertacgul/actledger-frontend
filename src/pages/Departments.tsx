import { useState, useRef, useEffect } from 'react'
import { Building2, Users, CheckSquare, TrendingUp, ChevronRight, Search, Target, Plus, Trash2, Pencil, Save, X, FileText, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import {
  useDepartments, useUsers, useTasks, useKpis,
  deleteKpi as deleteKpiApi, createKpi as createKpiApi, updateKpi as updateKpiApi,
  createDepartment as createDeptApi, updateDepartment as updateDeptApi, deleteDepartment as deleteDeptApi,
  type Kpi, type KpiLayer,
} from '../lib/hooks'
import { api } from '../lib/api'
import type { Department } from '../types'
import { ROLE_HIERARCHY } from '../types'
import DraggableModal from '../components/ui/DraggableModal'
import { exportToExcel } from '../lib/excelExport'
import { useToolbarActions } from '../lib/useToolbarActions'
import { useLanguage, useBi } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { useCompany } from '../context/CompanyContext'
import { KPI_LAYER_LABELS, KPI_LAYER_ORDER, type KpiLayer as TplKpiLayer } from '../data/sectorTemplates'

function DepartmentCard({ dept, onSelect }: { dept: Department; onSelect: (d: Department) => void }) {
  const { t } = useLanguage()
  return (
    <div
      onClick={() => onSelect(dept)}
      className="card p-5 hover:shadow-md transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
            style={{ background: dept.color }}
          >
            {dept.code}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">{dept.name}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{dept.employeeCount} {t('dept_total_employees').toLowerCase().split(' ').pop()}</p>
          </div>
        </div>
        <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors mt-1" />
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 bg-slate-50 rounded-lg">
          <p className="text-lg font-bold text-slate-900">{dept.employeeCount}</p>
          <p className="text-[10px] text-slate-400">{t('dept_total_employees').split(' ').pop()}</p>
        </div>
        <div className="text-center p-2 bg-slate-50 rounded-lg">
          <p className="text-lg font-bold text-slate-900">{dept.activeTaskCount}</p>
          <p className="text-[10px] text-slate-400">{t('dept_active_tasks').split(' ').pop()}</p>
        </div>
        <div className="text-center p-2 bg-slate-50 rounded-lg">
          <p className={clsx(
            'text-lg font-bold',
            dept.completionRate >= 85 ? 'text-green-600' :
            dept.completionRate >= 70 ? 'text-amber-600' : 'text-red-600'
          )}>
            %{dept.completionRate}
          </p>
          <p className="text-[10px] text-slate-400">{t('dept_avg_completion')}</p>
        </div>
      </div>

      <div className="mb-3">
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${dept.completionRate}%`,
              background: dept.completionRate >= 85 ? '#22c55e' :
                          dept.completionRate >= 70 ? '#f59e0b' : '#ef4444',
            }}
          />
        </div>
      </div>
    </div>
  )
}

// ── Department Documents (OperIQ) ──────────────────────────────────────────────
function DepartmentDocuments({ departmentId, canManage }: { departmentId: string; canManage: boolean }) {
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.get<any>(`/operiq-chat/department-manuals/${departmentId}`)
      .then(data => setDocs(Array.isArray(data) ? data : data?.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [departmentId])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploading(true)
    setUploadErr(null)
    try {
      // Extract PDF text: send as base64 for server-side AI extraction
      let extractedText = ''
      try {
        const reader = new FileReader()
        const b64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1] || '')
          reader.readAsDataURL(file)
        })
        if (b64) extractedText = `[BASE64_PDF]${b64.slice(0, 200000)}`
      } catch {}

      const fd = new FormData()
      fd.append('manual', file)
      fd.append('name', file.name.replace(/\.pdf$/i, ''))
      if (extractedText) fd.append('textContent', extractedText)
      const token = (await import('../lib/api')).tokenStore.get()
      const apiBase = (await import('../lib/api')).API_BASE
      const res = await fetch(`${apiBase}/operiq-chat/department-manuals/${departmentId}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
        body: fd,
      })
      if (res.ok) {
        const body = await res.json()
        setDocs(prev => [body.data, ...prev])
      } else {
        const errBody = await res.json().catch(() => ({}))
        setUploadErr(errBody.message || `Yuklenemedi (${res.status})`)
      }
    } catch (err: any) {
      setUploadErr(err.message || 'Yuklenemedi')
    } finally { setUploading(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu dokumani silmek istediginize emin misiniz?')) return
    try {
      await api.delete(`/operiq-chat/manuals/${id}`)
      setDocs(prev => prev.filter(d => d.id !== id))
    } catch {}
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-1)' }}>
          <FileText size={14} /> Teknik Dokumanlar (OperIQ)
        </h3>
        {canManage && (
          <>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="btn-default btn-sm text-xs">
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              PDF Yukle
            </button>
            <input ref={fileRef} type="file" accept="application/pdf" onChange={handleUpload} className="hidden" />
          </>
        )}
      </div>
      {uploadErr && (
        <div className="mb-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[11px]">{uploadErr}</div>
      )}
      {loading ? (
        <div className="h-12 skeleton rounded-lg" />
      ) : docs.length === 0 ? (
        <p className="text-xs text-center py-4 rounded-lg" style={{ color: 'var(--text-3)', background: 'var(--border-subtle)', border: '1px solid var(--border)' }}>
          {canManage ? 'Henuz dokuman yuklenmedi. PDF yukleyerek departman calisanlarinin OperIQ uzerinden dokumana erisimini saglayin.' : 'Bu departmana ait teknik dokuman bulunmuyor.'}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {docs.map(d => (
            <li key={d.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--border-subtle)', border: '1px solid var(--border)' }}>
              <FileText size={14} className="text-cyan-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>{d.name}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>{(d.size / 1024).toFixed(0)} KB {d.textContent ? '- Dokuman devreye alindi' : '- Isleniyor...'}</p>
              </div>
              {canManage && (
                <button type="button" onClick={() => handleDelete(d.id)} className="text-red-400 hover:text-red-600 transition-colors">
                  <Trash2 size={13} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── KPI Section ────────────────────────────────────────────────────────────────
function DepartmentKpiSection({
  departmentId, kpis, loading, onChange, canManage = false,
}: {
  departmentId: string
  kpis: Kpi[]
  loading: boolean
  onChange: () => void
  canManage?: boolean
}) {
  const { t } = useLanguage()
  const bi    = useBi()
  const [adding, setAdding]     = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm(t('common_delete') + '?')) return
    try { await deleteKpiApi(id); onChange() } catch (e: any) { alert(e.message ?? 'Error') }
  }

  const grouped: Record<TplKpiLayer, Kpi[]> = { performance: [], quality: [], time: [], risk: [], ai_insight: [] }
  for (const k of kpis) {
    const key = k.layer.toLowerCase() as TplKpiLayer
    if (grouped[key]) grouped[key].push(k)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-1)' }}>
          <Target size={14} /> {t('dept_kpi_set')} ({loading ? '...' : kpis.length})
        </h3>
        {canManage && (
          <button type="button" onClick={() => setAdding(true)} className="btn-default btn-sm">
            <Plus size={12} /> {t('dept_kpi_add')}
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 skeleton rounded-lg" />)}</div>
      ) : kpis.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-[12px]"
             style={{ borderColor: 'var(--border)', color: 'var(--text-3)' }}>
          {t('dept_kpi_empty')}
        </div>
      ) : (
        <div className="space-y-3">
          {KPI_LAYER_ORDER.map(layer => {
            const list = grouped[layer]
            if (list.length === 0) return null
            return (
              <div key={layer}>
                <p className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-3)' }}>
                  {bi(KPI_LAYER_LABELS[layer])} - {list.length}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {list.map(k => (
                    editingId === k.id ? (
                      <KpiInlineEditor key={k.id} kpi={k} onClose={() => setEditingId(null)} onSaved={() => { setEditingId(null); onChange() }} />
                    ) : (
                      <div
                        key={k.id}
                        className={clsx('group flex items-center gap-2 px-3 py-2 rounded-lg border text-[11.5px]', canManage && 'cursor-pointer')}
                        style={{ borderColor: 'var(--border)', background: 'var(--border-subtle)' }}
                        onClick={() => canManage && setEditingId(k.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate" style={{ color: 'var(--text-1)' }}>
                            {bi((k.label as any) ?? { tr: k.code, en: k.code })}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap text-[10px]" style={{ color: 'var(--text-3)' }}>
                            {k.target != null && <span>{t('kpi_form_target')}: {k.target}{k.unit ? ` ${k.unit}` : ''}</span>}
                            {k.currentValue != null && <span>| {t('common_active')}: {k.currentValue}{k.unit ? ` ${k.unit}` : ''}</span>}
                            {k.unit && !k.target && !k.currentValue && <span>{k.unit}</span>}
                            {(k.startDate || k.endDate) && (
                              <span>| {k.startDate?.slice(0, 10) ?? '...'} - {k.endDate?.slice(0, 10) ?? '...'}</span>
                            )}
                          </div>
                        </div>
                        {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); setEditingId(k.id) }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ color: 'var(--text-3)' }}
                          >
                            <Pencil size={11} />
                          </button>
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); handleDelete(k.id) }}
                            className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity"
                          >
                            <Trash2 size={11} />
                          </button>
                        </>
                      )}
                      </div>
                    )
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {adding && (
        <KpiAddForm departmentId={departmentId} onClose={() => setAdding(false)} onCreated={() => { setAdding(false); onChange() }} />
      )}
    </div>
  )
}

// ── Inline KPI editor (target, currentValue, description) ──────────────────────
function KpiInlineEditor({ kpi, onClose, onSaved }: { kpi: Kpi; onClose: () => void; onSaved: () => void }) {
  const { t } = useLanguage()
  const bi = useBi()
  const [target, setTarget] = useState(kpi.target?.toString() ?? '')
  const [currentValue, setCurrentValue] = useState(kpi.currentValue?.toString() ?? '')
  const [unit, setUnit] = useState(kpi.unit ?? '')
  const [startDate, setStartDate] = useState(kpi.startDate?.slice(0, 10) ?? '')
  const [endDate, setEndDate] = useState(kpi.endDate?.slice(0, 10) ?? '')
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)
    try {
      await updateKpiApi(kpi.id, {
        target: target ? Number(target) : undefined,
        currentValue: currentValue ? Number(currentValue) : undefined,
        unit: unit.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      } as any)
      onSaved()
    } catch (e: any) { alert(e.message ?? 'Error') }
    finally { setBusy(false) }
  }

  return (
    <div className="col-span-1 sm:col-span-2 p-3 rounded-lg border space-y-2"
         style={{ borderColor: 'var(--accent-border)', background: 'var(--accent-bg)' }}>
      <p className="text-[11px] font-semibold" style={{ color: 'var(--text-1)' }}>
        {bi((kpi.label as any) ?? { tr: kpi.code, en: kpi.code })}
      </p>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-[9px] font-bold uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-3)' }}>{t('kpi_form_target')}</label>
          <input className="input text-[11px]" type="number" value={target} onChange={e => setTarget(e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className="block text-[9px] font-bold uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-3)' }}>{t('common_active')}</label>
          <input className="input text-[11px]" type="number" value={currentValue} onChange={e => setCurrentValue(e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className="block text-[9px] font-bold uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-3)' }}>{t('kpi_form_unit')}</label>
          <input className="input text-[11px]" value={unit} onChange={e => setUnit(e.target.value)} placeholder="%, ₺, adet" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[9px] font-bold uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-3)' }}>Baslangic</label>
          <input className="input text-[11px]" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-[9px] font-bold uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-3)' }}>Bitis</label>
          <input className="input text-[11px]" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-1.5">
        <button type="button" className="btn-default btn-sm text-[10px]" onClick={onClose} disabled={busy}><X size={10} /> {t('common_cancel')}</button>
        <button type="button" className="btn-dark btn-sm text-[10px]" onClick={save} disabled={busy}><Save size={10} /> {busy ? '...' : t('common_save')}</button>
      </div>
    </div>
  )
}

// ── KPI Add Form ───────────────────────────────────────────────────────────────
function KpiAddForm({ departmentId, onClose, onCreated }: { departmentId: string; onClose: () => void; onCreated: () => void }) {
  const { t } = useLanguage()
  const [code, setCode] = useState('')
  const [labelTr, setLabelTr] = useState('')
  const [labelEn, setLabelEn] = useState('')
  const [layer, setLayer] = useState<KpiLayer>('PERFORMANCE')
  const [unit, setUnit] = useState('')
  const [target, setTarget] = useState('')
  const [currentValue, setCurrentValue] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async () => {
    setErr(null)
    if (!code.trim() || !labelTr.trim() || !labelEn.trim()) { setErr(t('common_cancel')); return }
    setBusy(true)
    try {
      await createKpiApi({
        departmentId,
        code: code.trim().toLowerCase(),
        layer,
        label: { tr: labelTr.trim(), en: labelEn.trim() },
        unit: unit.trim() || undefined,
        target: target ? Number(target) : undefined,
        currentValue: currentValue ? Number(currentValue) : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      })
      onCreated()
    } catch (e: any) { setErr(e.message ?? 'Error') }
    finally { setBusy(false) }
  }

  return (
    <div className="mt-4 p-3 rounded-lg border space-y-2.5" style={{ borderColor: 'var(--border)', background: 'var(--border-subtle)' }}>
      <p className="text-[11px] font-semibold" style={{ color: 'var(--text-2)' }}>{t('dept_kpi_add')}</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-3)' }}>{t('kpi_form_code')}</label>
          <input className="input text-[12px]" placeholder="production_output" value={code} onChange={e => setCode(e.target.value)} />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-3)' }}>{t('kpi_form_layer')}</label>
          <select className="select text-[12px]" value={layer} onChange={e => setLayer(e.target.value as KpiLayer)}>
            <option value="PERFORMANCE">Performance</option>
            <option value="QUALITY">Quality</option>
            <option value="TIME">Time</option>
            <option value="RISK">Risk</option>
            <option value="AI_INSIGHT">AI Insight</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-3)' }}>{t('kpi_form_label')} (TR)</label>
          <input className="input text-[12px]" value={labelTr} onChange={e => setLabelTr(e.target.value)} />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-3)' }}>{t('kpi_form_label')} (EN)</label>
          <input className="input text-[12px]" value={labelEn} onChange={e => setLabelEn(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-3)' }}>{t('kpi_form_unit')}</label>
          <input className="input text-[12px]" value={unit} onChange={e => setUnit(e.target.value)} placeholder="%, ₺" />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-3)' }}>{t('kpi_form_target')}</label>
          <input className="input text-[12px]" type="number" value={target} onChange={e => setTarget(e.target.value)} />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-3)' }}>{t('common_active')}</label>
          <input className="input text-[12px]" type="number" value={currentValue} onChange={e => setCurrentValue(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-3)' }}>Baslangic</label>
          <input className="input text-[12px]" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-3)' }}>Bitis</label>
          <input className="input text-[12px]" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>
      {err && <p className="text-[11px] text-red-600">{err}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className="btn-default btn-sm" onClick={onClose} disabled={busy}>{t('common_cancel')}</button>
        <button type="button" className="btn-dark btn-sm" onClick={submit} disabled={busy}>{busy ? t('common_loading') : t('common_save')}</button>
      </div>
    </div>
  )
}

// ── Create Department Modal ────────────────────────────────────────────────────
function CreateDeptModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { t } = useLanguage()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [color, setColor] = useState('#6366f1')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async () => {
    setErr(null)
    if (!name.trim() || !code.trim()) { setErr('Ad ve kod zorunlu'); return }
    setBusy(true)
    try {
      await createDeptApi({ name: name.trim(), code: code.trim().toUpperCase(), color })
      onCreated()
    } catch (e: any) {
      const msg = e.message ?? ''
      if (msg.includes('limit') || msg.includes('Limit') || e.status === 403) {
        setErr('Departman limitine ulasildi. Yeni departman eklemek icin ActLedger yetkilisi ile iletisime gecin.')
      } else {
        setErr(msg || 'Departman olusturulamadi')
      }
    } finally { setBusy(false) }
  }

  return (
    <DraggableModal title={t('toolbar_new_department')} onClose={onClose} width={420}>
      <div className="p-5 space-y-3">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-3)' }}>{t('nav_departments')} {t('kpi_form_label')}</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Üretim" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-3)' }}>{t('kpi_form_code')}</label>
            <input className="input" value={code} onChange={e => setCode(e.target.value)} placeholder="PROD" maxLength={10} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-3)' }}>Renk</label>
            <div className="flex items-center gap-2">
              <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-9 h-9 rounded cursor-pointer border-0" />
              <span className="text-[12px] font-mono" style={{ color: 'var(--text-2)' }}>{color}</span>
            </div>
          </div>
        </div>
        {err && <p className="text-[11px] text-red-600">{err}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-default btn-sm" onClick={onClose} disabled={busy}>{t('common_cancel')}</button>
          <button type="button" className="btn-dark btn-sm" onClick={submit} disabled={busy}>{busy ? t('common_loading') : t('common_save')}</button>
        </div>
      </div>
    </DraggableModal>
  )
}

// ── Department Detail Modal (with rename + delete) ─────────────────────────────
function DepartmentDetailModal({ dept, onClose, onChanged, canEditDept = false, canManageKpi = false }: { dept: Department; onClose: () => void; onChanged: () => void; canEditDept?: boolean; canManageKpi?: boolean }) {
  const { t } = useLanguage()
  const { users, loading: usersLoading } = useUsers({ departmentId: dept.id })
  const { tasks, loading: tasksLoading } = useTasks({ departmentId: dept.id })
  const { kpis, loading: kpisLoading, refetch: refetchKpis } = useKpis({ departmentId: dept.id })

  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState(dept.name)
  const [renaming, setRenaming] = useState(false)

  const completedCount = tasks.filter(t => t.status === 'tamamlandi').length
  const overdueCount = tasks.filter(t => t.status === 'gecikti').length

  const handleRename = async () => {
    if (!newName.trim() || newName === dept.name) { setEditingName(false); return }
    setRenaming(true)
    try {
      await updateDeptApi(dept.id, { name: newName.trim() })
      setEditingName(false)
      onChanged()
    } catch (e: any) { alert(e.message ?? 'Error') }
    finally { setRenaming(false) }
  }

  const handleDelete = async () => {
    if (!confirm(`"${dept.name}" ${t('common_delete').toLowerCase()}?`)) return
    try {
      await deleteDeptApi(dept.id)
      onChanged()
      onClose()
    } catch (e: any) { alert(e.message ?? 'Error') }
  }

  const icon = (
    <div className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold" style={{ background: dept.color }}>
      {dept.code}
    </div>
  )

  return (
    <DraggableModal
      title={editingName ? '' : dept.name}
      subtitle={`${dept.employeeCount} personel`}
      icon={icon}
      onClose={onClose}
      width={580}
      maxHeight="88vh"
    >
      <div className="p-6 space-y-5">
        {/* Rename + Delete bar (admin only) */}
        {canEditDept && (
          <div className="flex items-center gap-2">
            {editingName ? (
              <>
                <input className="input flex-1 text-[13px]" value={newName} onChange={e => setNewName(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && handleRename()} />
                <button type="button" className="btn-dark btn-sm" onClick={handleRename} disabled={renaming}>
                  <Save size={12} /> {renaming ? '...' : t('common_save')}
                </button>
                <button type="button" className="btn-default btn-sm" onClick={() => { setEditingName(false); setNewName(dept.name) }}>
                  <X size={12} />
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn-default btn-sm" onClick={() => setEditingName(true)}>
                  <Pencil size={12} /> {t('common_edit')}
                </button>
                <div className="flex-1" />
                <button type="button" className="btn-default btn-sm text-red-600 hover:bg-red-50" onClick={handleDelete}>
                  <Trash2 size={12} /> {t('common_delete')}
                </button>
              </>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: t('dept_active_tasks'), value: tasks.length, accent: '#2563eb', bg: 'var(--accent-bg)', border: 'var(--accent-border)' },
            { label: t('status_tamamlandi'), value: completedCount, accent: '#16a34a', bg: 'var(--success-bg)', border: 'var(--success-border)' },
            { label: t('status_gecikti'), value: overdueCount, accent: '#dc2626', bg: 'var(--danger-bg)', border: 'var(--danger-border)' },
          ].map(kpi => (
            <div key={kpi.label} className="rounded-xl p-4 text-center" style={{ background: kpi.bg, border: `1px solid ${kpi.border}` }}>
              {tasksLoading
                ? <div className="h-8 w-8 mx-auto skeleton rounded mb-1" />
                : <p className="text-2xl font-bold" style={{ color: kpi.accent }}>{kpi.value}</p>
              }
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{kpi.label}</p>
            </div>
          ))}
        </div>

        <DepartmentKpiSection departmentId={dept.id} kpis={kpis} loading={kpisLoading} onChange={refetchKpis} canManage={canManageKpi} />

        {/* Personnel */}
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-1)' }}>
            <Users size={14} /> {t('dept_total_employees')} ({usersLoading ? '...' : users.length})
          </h3>
          {usersLoading
            ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 skeleton rounded-lg" />)}</div>
            : (
              <ul className="space-y-1.5">
                {users.map(u => (
                  <li key={u.id} className="flex items-center gap-3 p-3 rounded-lg transition-colors"
                    style={{ border: '1px solid var(--border)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--border-subtle)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-semibold">{u.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{u.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-3)' }}>{t(`role_${u.role}` as any)}</p>
                    </div>
                    {u.id === dept.managerId && <span className="badge badge-info text-[10px]">{t('role_mudur')}</span>}
                    <span className={clsx('w-2 h-2 rounded-full', u.active ? 'bg-green-500' : 'bg-slate-400')} />
                  </li>
                ))}
              </ul>
            )
          }
        </div>

        {/* Technical Documents (OperIQ) */}
        <DepartmentDocuments departmentId={dept.id} canManage={canEditDept || canManageKpi} />

        {/* Tasks */}
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-1)' }}>
            <CheckSquare size={14} /> {t('nav_tasks')} ({tasksLoading ? '...' : tasks.length})
          </h3>
          {tasksLoading
            ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 skeleton rounded-lg" />)}</div>
            : (
              <ul className="space-y-1.5">
                {tasks.slice(0, 5).map(t => (
                  <li key={t.id} className="flex items-center gap-3 p-3 rounded-lg"
                    style={{ background: 'var(--border-subtle)', border: '1px solid var(--border)' }}>
                    <div className={clsx('w-2 h-2 rounded-full flex-shrink-0',
                      t.status === 'tamamlandi' ? 'bg-green-500' :
                      t.status === 'gecikti' ? 'bg-red-500' :
                      t.status === 'devam_ediyor' ? 'bg-blue-500' : 'bg-slate-400'
                    )} />
                    <span className="text-sm flex-1 truncate" style={{ color: 'var(--text-2)' }}>{t.title}</span>
                  </li>
                ))}
              </ul>
            )
          }
        </div>
      </div>
    </DraggableModal>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function Departments() {
  const { t } = useLanguage()
  const { user: currentUser } = useAuth()
  const isAdmin = currentUser?.role === 'platform_admin'
  const canManageKpi = currentUser ? ROLE_HIERARCHY[currentUser.role] >= ROLE_HIERARCHY.mudur : false
  const [search, setSearch] = useState('')
  const [selectedDept, setSelectedDept] = useState<Department | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const { config } = useCompany()
  const { departments, loading, refetch } = useDepartments()
  const atLimit = departments.length >= (config?.maxDepartments ?? Infinity)

  const handleExportExcel = () => {
    exportToExcel({
      filename: `departmanlar_${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'Departmanlar',
      columns: [
        { header: t('nav_departments'), accessor: (d: Department) => d.name, width: 28 },
        { header: t('kpi_form_code'), accessor: (d: Department) => d.code, width: 12 },
        { header: t('dept_total_employees'), accessor: (d: Department) => d.employeeCount, width: 12 },
        { header: t('dept_active_tasks'), accessor: (d: Department) => d.activeTaskCount, width: 14 },
        { header: t('dept_avg_completion'), accessor: (d: Department) => d.completionRate, width: 14 },
      ],
      rows: departments,
    })
  }

  useToolbarActions({
    onSearch: () => searchRef.current?.focus(),
    onRefresh: () => refetch(),
    onExport: () => handleExportExcel(),
    onNew: () => setShowCreate(true),
  })

  const filtered = departments.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.code.toLowerCase().includes(search.toLowerCase())
  )

  const totalEmployees = departments.reduce((s, d) => s + d.employeeCount, 0)
  const totalActiveTasks = departments.reduce((s, d) => s + d.activeTaskCount, 0)
  const avgCompletion = departments.length
    ? Math.round(departments.reduce((s, d) => s + d.completionRate, 0) / departments.length)
    : 0

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('dept_total'), value: departments.length, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: t('dept_total_employees'), value: totalEmployees, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: t('dept_active_tasks'), value: totalActiveTasks, icon: CheckSquare, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: t('dept_avg_completion'), value: `%${avgCompletion}`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
        ].map(item => (
          <div key={item.label} className="card p-4">
            <div className="flex items-center gap-3">
              <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', item.bg)}>
                <item.icon size={18} className={item.color} />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">{item.value}</p>
                <p className="text-xs text-slate-500">{item.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Add */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={searchRef}
            className="input pl-9"
            placeholder={t('dept_search_placeholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {isAdmin && (
          <button type="button" className={clsx('btn-dark btn-sm', atLimit && 'opacity-50 cursor-not-allowed')} onClick={() => !atLimit && setShowCreate(true)} disabled={atLimit}
            title={atLimit ? `Departman limiti: ${config?.maxDepartments}` : ''}>
            <Plus size={14} /> {t('toolbar_new_department')} {config?.maxDepartments ? `(${departments.length}/${config.maxDepartments})` : ''}
          </button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="card h-44 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Building2 size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">{t('dept_no_results')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filtered.map(dept => (
            <DepartmentCard key={dept.id} dept={dept} onSelect={setSelectedDept} />
          ))}
        </div>
      )}

      {selectedDept && (
        <DepartmentDetailModal
          dept={selectedDept}
          onClose={() => setSelectedDept(null)}
          onChanged={() => { refetch(); setSelectedDept(null) }}
          canEditDept={isAdmin}
          canManageKpi={canManageKpi}
        />
      )}

      {showCreate && (
        <CreateDeptModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); refetch() }}
        />
      )}
    </div>
  )
}
