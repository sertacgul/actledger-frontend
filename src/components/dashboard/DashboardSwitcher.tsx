import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Plus, Pencil, Trash2, LayoutDashboard, Check } from 'lucide-react'
import clsx from 'clsx'
import { DEFAULT_DASHBOARD_ID, type DashboardConfig } from '../../lib/dashboardStore'

interface Props {
  dashboards: DashboardConfig[]
  activeId: string
  onSelect: (id: string) => void
  onNew: () => void
  onEdit: (db: DashboardConfig) => void
  onDelete: (id: string) => void
}

export default function DashboardSwitcher({
  dashboards, activeId, onSelect, onNew, onEdit, onDelete,
}: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const active = dashboards.find(d => d.id === activeId) ?? dashboards[0]

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative inline-block">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={clsx(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[12px] font-semibold transition-all',
          open
            ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
            : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50'
        )}
      >
        <LayoutDashboard size={13} className="text-indigo-500 flex-shrink-0" />
        <span className="max-w-[140px] truncate">{active.name}</span>
        <ChevronDown size={12} className={clsx('transition-transform text-zinc-400', open && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-72 bg-white rounded-xl border border-zinc-200 shadow-xl z-40 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Dashboard list */}
          <div className="py-1.5">
            {dashboards.map(db => (
              <div
                key={db.id}
                className={clsx(
                  'flex items-center gap-2 px-3 py-2 group transition-colors',
                  activeId === db.id ? 'bg-indigo-50' : 'hover:bg-zinc-50'
                )}
              >
                <button
                  type="button"
                  className="flex-1 flex items-center gap-2 text-left min-w-0"
                  onClick={() => { onSelect(db.id); setOpen(false) }}
                >
                  <div className={clsx(
                    'w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors',
                    activeId === db.id ? 'bg-indigo-600' : 'border border-zinc-300 group-hover:border-zinc-400'
                  )}>
                    {activeId === db.id && <Check size={9} className="text-white" />}
                  </div>
                  <span className={clsx(
                    'text-[12px] font-medium truncate',
                    activeId === db.id ? 'text-indigo-700' : 'text-zinc-700'
                  )}>
                    {db.name}
                  </span>
                  <span className="text-[10px] text-zinc-400 flex-shrink-0">
                    {db.widgets.length} widget
                  </span>
                </button>

                {/* Actions */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => { onEdit(db); setOpen(false) }}
                    className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    aria-label="Düzenle"
                  >
                    <Pencil size={11} />
                  </button>
                  {db.id !== DEFAULT_DASHBOARD_ID && (
                    <button
                      type="button"
                      onClick={() => { onDelete(db.id); setOpen(false) }}
                      className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      aria-label="Sil"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add new */}
          <div className="border-t border-zinc-100 p-2">
            <button
              type="button"
              onClick={() => { onNew(); setOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <Plus size={13} />
              Yeni Dashboard Ekle
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
