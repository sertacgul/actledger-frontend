import { useState, useRef, useEffect } from 'react'
import { SlidersHorizontal, X, Check } from 'lucide-react'
import clsx from 'clsx'
import type { WidgetFilter, WidgetMeta } from '../../lib/dashboardStore'
import { useDepartments } from '../../lib/hooks'
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '../../types'

const DATE_OPTIONS: { key: NonNullable<WidgetFilter['datePreset']>; label: string }[] = [
  { key: 'today', label: 'Bugün'      },
  { key: '7d',    label: 'Son 7 gün'  },
  { key: '30d',   label: 'Son 30 gün' },
  { key: 'month', label: 'Bu ay'      },
]

interface Props {
  meta: WidgetMeta
  filter: WidgetFilter
  onFilterChange: (f: WidgetFilter | null) => void
  children: React.ReactNode
  /** Extra class names for the outer div (e.g. col-span) */
  className?: string
}

export default function WidgetWrapper({ meta, filter, onFilterChange, children, className }: Props) {
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [draft, setDraft] = useState<WidgetFilter>(filter)
  const ref = useRef<HTMLDivElement>(null)

  const hasFilter = Object.keys(filter).length > 0
  const noOptions = meta.filterOptions.length === 0

  // sync draft when filter changes externally
  useEffect(() => { setDraft(filter) }, [filter])

  // close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setPopoverOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleApply = () => {
    const cleaned: WidgetFilter = {}
    if (draft.departmentId) cleaned.departmentId = draft.departmentId
    if (draft.status)       cleaned.status       = draft.status
    if (draft.priority)     cleaned.priority     = draft.priority
    if (draft.datePreset)   cleaned.datePreset   = draft.datePreset
    onFilterChange(Object.keys(cleaned).length > 0 ? cleaned : null)
    setPopoverOpen(false)
  }

  const handleReset = () => {
    setDraft({})
    onFilterChange(null)
    setPopoverOpen(false)
  }

  const { departments } = useDepartments()

  return (
    <div ref={ref} className={clsx('relative group', className)}>
      {children}

      {/* Filter button - visible on hover or when filter is active */}
      {!noOptions && (
        <button
          type="button"
          onClick={() => { setDraft(filter); setPopoverOpen(v => !v) }}
          aria-label="Widget filtresi"
          className={clsx(
            'absolute top-3 right-3 w-6 h-6 rounded flex items-center justify-center transition-all z-10',
            'border text-[11px]',
            hasFilter
              ? 'bg-indigo-600 border-indigo-600 text-white opacity-100'
              : 'bg-white border-zinc-200 text-zinc-400 opacity-0 group-hover:opacity-100 hover:border-indigo-300 hover:text-indigo-600',
            popoverOpen && 'opacity-100',
          )}
        >
          <SlidersHorizontal size={11} />
          {hasFilter && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-indigo-400 border border-white" />
          )}
        </button>
      )}

      {/* Popover */}
      {popoverOpen && (
        <div className="absolute top-10 right-0 z-30 w-64 bg-white rounded-xl border border-zinc-200 shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-100 bg-zinc-50">
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal size={11} className="text-indigo-500" />
              <span className="text-[11px] font-semibold text-zinc-700">{meta.label} Filtresi</span>
            </div>
            <button type="button" onClick={() => setPopoverOpen(false)} className="text-zinc-400 hover:text-zinc-600">
              <X size={13} />
            </button>
          </div>

          <div className="p-3 space-y-3">
            {/* Department */}
            {meta.filterOptions.includes('departmentId') && (
              <div>
                <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Departman</label>
                <select
                  className="select text-[11px]"
                  value={draft.departmentId ?? ''}
                  onChange={e => setDraft(p => ({ ...p, departmentId: e.target.value || undefined }))}
                >
                  <option value="">Tümü</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}

            {/* Status */}
            {meta.filterOptions.includes('status') && (
              <div>
                <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Durum</label>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setDraft(p => ({ ...p, status: p.status === k ? undefined : k }))}
                      className={clsx(
                        'px-2 py-0.5 rounded border text-[10px] font-medium transition-colors',
                        draft.status === k
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Priority */}
            {meta.filterOptions.includes('priority') && (
              <div>
                <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Öncelik</label>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(TASK_PRIORITY_LABELS).map(([k, v]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setDraft(p => ({ ...p, priority: p.priority === k ? undefined : k }))}
                      className={clsx(
                        'px-2 py-0.5 rounded border text-[10px] font-medium transition-colors',
                        draft.priority === k
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Date */}
            {meta.filterOptions.includes('date') && (
              <div>
                <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Tarih</label>
                <div className="flex flex-wrap gap-1">
                  {DATE_OPTIONS.map(o => (
                    <button
                      key={o.key}
                      type="button"
                      onClick={() => setDraft(p => ({ ...p, datePreset: p.datePreset === o.key ? undefined : o.key }))}
                      className={clsx(
                        'px-2 py-0.5 rounded border text-[10px] font-medium transition-colors',
                        draft.datePreset === o.key
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-2 px-3 pb-3">
            <button type="button" onClick={handleReset} className="flex-1 py-1.5 text-[11px] font-medium text-zinc-500 hover:text-red-500 border border-zinc-200 rounded-lg transition-colors">
              Temizle
            </button>
            <button type="button" onClick={handleApply} className="flex-1 py-1.5 text-[11px] font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1">
              <Check size={11} /> Uygula
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
