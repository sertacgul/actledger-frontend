import { useState, useEffect } from 'react'
import { Filter, X, ChevronDown, ChevronUp, CalendarDays } from 'lucide-react'
import clsx from 'clsx'
import { useFilter, type DatePreset } from '../../context/FilterContext'
import { useDepartments, useTaskGroups } from '../../lib/hooks'
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '../../types'

export const DASHBOARD_FILTER_TOGGLE_EVENT = 'actledger:toggle-dashboard-filter'

const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'today',  label: 'Bugün'       },
  { key: '7d',     label: 'Son 7 gün'   },
  { key: '30d',    label: 'Son 30 gün'  },
  { key: 'month',  label: 'Bu ay'       },
  { key: 'custom', label: 'Özel'        },
]

export default function DashboardFilter() {
  const { filter, setFilter, reset, activeCount, departmentLocked } = useFilter()
  const { departments } = useDepartments()
  const { groups } = useTaskGroups()
  const [open, setOpen] = useState(false)

  // Allow external toggle (e.g. via keyboard shortcut)
  useEffect(() => {
    const onToggle = () => setOpen(v => !v)
    window.addEventListener(DASHBOARD_FILTER_TOGGLE_EVENT, onToggle)
    return () => window.removeEventListener(DASHBOARD_FILTER_TOGGLE_EVENT, onToggle)
  }, [])

  const hasActive = activeCount > 0

  return (
    <div className="mb-4">
      {/* Toolbar row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Toggle button */}
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12px] font-semibold transition-all',
            open || hasActive
              ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
              : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'
          )}
        >
          <Filter size={12} />
          Filtrele
          {hasActive && (
            <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">
              {activeCount}
            </span>
          )}
          {open ? <ChevronUp size={11} className="text-zinc-400" /> : <ChevronDown size={11} className="text-zinc-400" />}
        </button>

        {/* Active filter chips */}
        {filter.departmentId && (
          <Chip
            label={`Dept: ${departments.find(d => d.id === filter.departmentId)?.name ?? '...'}`}
            onRemove={() => setFilter({ departmentId: '' })}
          />
        )}
        {filter.status && (
          <Chip
            label={`Durum: ${TASK_STATUS_LABELS[filter.status as keyof typeof TASK_STATUS_LABELS] ?? filter.status}`}
            onRemove={() => setFilter({ status: '' })}
          />
        )}
        {filter.priority && (
          <Chip
            label={`Öncelik: ${TASK_PRIORITY_LABELS[filter.priority as keyof typeof TASK_PRIORITY_LABELS] ?? filter.priority}`}
            onRemove={() => setFilter({ priority: '' })}
          />
        )}
        {filter.groupId && (
          <Chip
            label={`Grup: ${groups.find(g => g.id === filter.groupId)?.name ?? '...'}`}
            onRemove={() => setFilter({ groupId: '' })}
          />
        )}
        {filter.datePreset !== '30d' && (
          <Chip
            label={`Tarih: ${DATE_PRESETS.find(p => p.key === filter.datePreset)?.label ?? filter.datePreset}`}
            onRemove={() => setFilter({ datePreset: '30d', dateFrom: '', dateTo: '' })}
          />
        )}
        {hasActive && (
          <button
            type="button"
            onClick={reset}
            className="text-[11px] text-zinc-400 hover:text-red-500 transition-colors flex items-center gap-0.5"
          >
            <X size={11} /> Temizle
          </button>
        )}
      </div>

      {/* Expanded filter panel */}
      {open && (
        <div className="mt-3 p-4 bg-white border border-zinc-200 rounded-xl shadow-sm grid grid-cols-2 xl:grid-cols-4 gap-4">

          {/* Department */}
          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
              Departman
            </label>
            <select
              className="select text-[12px]"
              value={filter.departmentId}
              onChange={e => setFilter({ departmentId: e.target.value })}
              disabled={departmentLocked}
              title={departmentLocked ? 'Yalnızca kendi departmanınızı görebilirsiniz' : undefined}
            >
              {!departmentLocked && <option value="">Tümü</option>}
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
              Görev Durumu
            </label>
            <select
              className="select text-[12px]"
              value={filter.status}
              onChange={e => setFilter({ status: e.target.value })}
            >
              <option value="">Tümü</option>
              {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
              Öncelik
            </label>
            <select
              className="select text-[12px]"
              value={filter.priority}
              onChange={e => setFilter({ priority: e.target.value })}
            >
              <option value="">Tümü</option>
              {Object.entries(TASK_PRIORITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Group */}
          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
              Grup
            </label>
            <select
              className="select text-[12px]"
              value={filter.groupId}
              onChange={e => setFilter({ groupId: e.target.value })}
            >
              <option value="">Tümü</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
              <CalendarDays size={10} className="inline mr-1" />
              Tarih Aralığı
            </label>
            <div className="flex flex-wrap gap-1">
              {DATE_PRESETS.filter(p => p.key !== 'custom').map(p => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setFilter({ datePreset: p.key, dateFrom: '', dateTo: '' })}
                  className={clsx(
                    'px-2 py-1 rounded text-[11px] font-medium transition-colors border',
                    filter.datePreset === p.key
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                  )}
                >
                  {p.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setFilter({ datePreset: 'custom' })}
                className={clsx(
                  'px-2 py-1 rounded text-[11px] font-medium transition-colors border',
                  filter.datePreset === 'custom'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                )}
              >
                Özel
              </button>
            </div>

            {filter.datePreset === 'custom' && (
              <div className="flex gap-1.5 mt-2">
                <input
                  type="date"
                  className="input text-[11px] flex-1"
                  value={filter.dateFrom ? filter.dateFrom.slice(0, 10) : ''}
                  onChange={e => setFilter({ dateFrom: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                />
                <input
                  type="date"
                  className="input text-[11px] flex-1"
                  value={filter.dateTo ? filter.dateTo.slice(0, 10) : ''}
                  onChange={e => setFilter({ dateTo: e.target.value ? new Date(e.target.value + 'T23:59:59').toISOString() : '' })}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-[11px] font-medium text-indigo-700">
      {label}
      <button type="button" onClick={onRemove} className="hover:text-red-500 transition-colors" aria-label="Kaldır">
        <X size={10} />
      </button>
    </span>
  )
}
