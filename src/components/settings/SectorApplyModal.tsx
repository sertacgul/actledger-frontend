import { useEffect, useMemo, useState } from 'react'
import { Layers, Building2, ChevronDown, ChevronRight, AlertTriangle, CheckCircle } from 'lucide-react'
import clsx from 'clsx'
import DraggableModal from '../ui/DraggableModal'
import { useLanguage, useBi } from '../../context/LanguageContext'
import { useSectorTemplate, applySectorTemplate, type SectorTemplate, type SectorTemplateDept } from '../../lib/hooks'
import { KPI_LAYER_LABELS, KPI_LAYER_ORDER, type KpiLayer as TplKpiLayer } from '../../data/sectorTemplates'

interface Props {
  sectorId: string
  onClose: () => void
  /** Called after a successful apply so the parent can refetch its data */
  onApplied?: () => void
}

// Backend layer (UPPERCASE) → frontend layer key
function fromBackendLayer(layer: string): TplKpiLayer {
  return layer.toLowerCase() as TplKpiLayer
}

export default function SectorApplyModal({ sectorId, onClose, onApplied }: Props) {
  const { t } = useLanguage()
  const bi    = useBi()
  const { template, loading, error } = useSectorTemplate(sectorId)

  // Selection state: department code -> Set of excluded KPI codes (empty = all in)
  const [selectedDepts, setSelectedDepts]   = useState<Set<string>>(new Set())
  const [excludedKpis,  setExcludedKpis]    = useState<Set<string>>(new Set())
  const [expanded,      setExpanded]        = useState<Set<string>>(new Set())
  const [applying,      setApplying]        = useState(false)
  const [result,        setResult]          = useState<{ ok: true; n: number; k: number } | { ok: false; msg: string } | null>(null)

  // Initialize: select all departments by default once template loads
  useEffect(() => {
    if (template) {
      setSelectedDepts(new Set(template.departments.map(d => d.code)))
    }
  }, [template])

  const totalSelectedKpis = useMemo(() => {
    if (!template) return 0
    return template.departments
      .filter(d => selectedDepts.has(d.code))
      .reduce((sum, d) => sum + d.kpis.filter(k => !excludedKpis.has(`${d.code}:${k.code}`)).length, 0)
  }, [template, selectedDepts, excludedKpis])

  const toggleDept = (code: string) => {
    setSelectedDepts(prev => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const toggleKpi = (deptCode: string, kpiCode: string) => {
    const key = `${deptCode}:${kpiCode}`
    setExcludedKpis(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleExpand = (code: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const selectAll  = () => template && setSelectedDepts(new Set(template.departments.map(d => d.code)))
  const clearAll   = () => setSelectedDepts(new Set())

  const handleApply = async () => {
    if (!template) return
    setApplying(true)
    setResult(null)
    try {
      const deptCodes = Array.from(selectedDepts)
      // Convert excluded KPI keys (deptCode:kpiCode) to backend's flat list of kpi codes
      // Note: backend currently excludes by KPI code globally, so we only pass codes that
      // belong to selected departments to avoid surprising other applies in the future.
      const excludeKpiCodes = Array.from(excludedKpis)
        .filter(k => deptCodes.some(d => k.startsWith(`${d}:`)))
        .map(k => k.split(':')[1])

      const res = await applySectorTemplate({
        sectorId,
        departmentCodes: deptCodes,
        excludeKpiCodes,
      })
      setResult({ ok: true, n: res.createdDepartments, k: res.createdKpis })
      onApplied?.()
    } catch (e: any) {
      const msg = (e.status === 429 || (e.message && e.message.includes('fazla istek')))
        ? 'Yeni bir şablon uygulamak istiyorsanız ActLedger destek ile görüşünüz.'
        : (e.message ?? t('apply_modal_failure'))
      setResult({ ok: false, msg })
    } finally {
      setApplying(false)
    }
  }

  const icon = (
    <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
      <Layers size={14} className="text-indigo-600" />
    </div>
  )

  const footer = (
    <div className="flex items-center justify-between gap-3 px-5 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
      <div className="text-[11px]" style={{ color: 'var(--text-3)' }}>
        {t('settings_sector_preview', { n: selectedDepts.size, k: totalSelectedKpis })}
      </div>
      <div className="flex items-center gap-2">
        <button type="button" className="btn-default btn-sm" onClick={onClose} disabled={applying}>
          {t('common_cancel')}
        </button>
        <button
          type="button"
          className="btn-dark btn-sm"
          onClick={handleApply}
          disabled={applying || selectedDepts.size === 0}
        >
          {applying
            ? t('apply_modal_applying')
            : t('apply_modal_apply_btn', { n: selectedDepts.size })}
        </button>
      </div>
    </div>
  )

  return (
    <DraggableModal
      title={t('apply_modal_title')}
      subtitle={t('apply_modal_subtitle')}
      icon={icon}
      onClose={onClose}
      width={760}
      maxHeight="86vh"
      footer={footer}
    >
      <div className="p-5">
        {loading && (
          <div className="space-y-2">
            {[1,2,3,4].map(i => <div key={i} className="h-12 skeleton rounded-lg" />)}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-[12px]">
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        {result && (
          <div className={clsx(
            'flex items-center gap-2 px-3 py-2.5 mb-4 rounded-lg text-[12px] font-medium',
            result.ok
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200',
          )}>
            {result.ok
              ? <><CheckCircle size={14} /> {t('apply_modal_success', { n: result.n, k: result.k })}</>
              : <><AlertTriangle size={14} /> {result.msg}</>}
          </div>
        )}

        {template && (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Building2 size={14} className="text-zinc-500" />
                <h3 className="text-[13px] font-semibold text-zinc-800">
                  {t('apply_modal_departments')} ({template.departments.length})
                </h3>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={selectAll}  className="text-[11px] text-blue-600 hover:underline">
                  {t('apply_modal_select_all')}
                </button>
                <span className="text-zinc-300">·</span>
                <button type="button" onClick={clearAll}   className="text-[11px] text-zinc-500 hover:underline">
                  {t('apply_modal_clear_all')}
                </button>
              </div>
            </div>

            <div className="space-y-1.5 max-h-[55vh] overflow-y-auto pr-1">
              {template.departments.map(dept => (
                <DeptRow
                  key={dept.code}
                  dept={dept}
                  selected={selectedDepts.has(dept.code)}
                  expanded={expanded.has(dept.code)}
                  excludedKpis={excludedKpis}
                  onToggleDept={() => toggleDept(dept.code)}
                  onToggleExpand={() => toggleExpand(dept.code)}
                  onToggleKpi={(kpiCode) => toggleKpi(dept.code, kpiCode)}
                  bi={bi}
                />
              ))}
            </div>

            <p className="text-[11px] text-zinc-400 mt-4">{t('apply_modal_warning')}</p>
          </>
        )}
      </div>
    </DraggableModal>
  )
}

interface DeptRowProps {
  dept: SectorTemplateDept
  selected: boolean
  expanded: boolean
  excludedKpis: Set<string>
  onToggleDept: () => void
  onToggleExpand: () => void
  onToggleKpi: (kpiCode: string) => void
  bi: <T,>(value: { tr: T; en: T }) => T
}

function DeptRow({ dept, selected, expanded, excludedKpis, onToggleDept, onToggleExpand, onToggleKpi, bi }: DeptRowProps) {
  const { t } = useLanguage()

  const includedKpis = dept.kpis.filter(k => !excludedKpis.has(`${dept.code}:${k.code}`)).length
  const totalKpis    = dept.kpis.length

  return (
    <div className={clsx(
      'rounded-lg border transition-colors',
      selected ? 'border-zinc-300 bg-white' : 'border-zinc-200 bg-zinc-50/60 opacity-70',
    )}>
      <div className="flex items-center gap-3 px-3 py-2.5">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleDept}
          className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
        />
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
          style={{ background: dept.color }}
        >
          {dept.code}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-zinc-800 truncate">{bi(dept.name)}</p>
          <p className="text-[10px] text-zinc-500">
            {includedKpis}/{totalKpis} KPI · {KPI_LAYER_ORDER.filter(l => dept.kpis.some(k => k.layer.toLowerCase() === l)).length} {t('apply_modal_kpis').toLowerCase()}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleExpand}
          className="btn-ghost btn-sm"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t" style={{ borderColor: 'var(--border-subtle, #e4e4e7)' }}>
          {KPI_LAYER_ORDER.map(layer => {
            const layerKpis = dept.kpis.filter(k => k.layer.toLowerCase() === layer)
            if (layerKpis.length === 0) return null
            return (
              <div key={layer} className="mt-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400 mb-1.5">
                  {bi(KPI_LAYER_LABELS[layer])}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {layerKpis.map(k => {
                    const isExcluded = excludedKpis.has(`${dept.code}:${k.code}`)
                    return (
                      <label
                        key={k.code}
                        className={clsx(
                          'flex items-center gap-2 px-2 py-1.5 rounded text-[11px] cursor-pointer transition-colors',
                          isExcluded ? 'text-zinc-400 line-through' : 'text-zinc-700 hover:bg-zinc-50',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={!isExcluded}
                          onChange={() => onToggleKpi(k.code)}
                          className="h-3.5 w-3.5 rounded border-zinc-300 text-blue-600"
                        />
                        <span className="flex-1 truncate">{bi(k.label)}</span>
                        {k.unit && <span className="text-zinc-400 text-[10px]">{k.unit}</span>}
                      </label>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
