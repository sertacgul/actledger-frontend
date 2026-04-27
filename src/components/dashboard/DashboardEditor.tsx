import { useState, useEffect } from 'react'
import { X, GripVertical, Check, LayoutDashboard } from 'lucide-react'
import clsx from 'clsx'
import { WIDGET_REGISTRY, DEFAULT_DASHBOARD_ID, type DashboardConfig } from '../../lib/dashboardStore'

interface Props {
  /** null = create mode, DashboardConfig = edit mode */
  dashboard: DashboardConfig | null
  onSave: (name: string, widgets: string[]) => void
  onClose: () => void
}

const SPAN_LABEL = { full: 'Tam genişlik', wide: 'Geniş', narrow: 'Dar' }
const SPAN_COLOR = { full: 'bg-indigo-50 text-indigo-600 border-indigo-200', wide: 'bg-blue-50 text-blue-600 border-blue-200', narrow: 'bg-zinc-100 text-zinc-500 border-zinc-200' }

export default function DashboardEditor({ dashboard, onSave, onClose }: Props) {
  const isEdit = dashboard !== null
  const isDefault = dashboard?.id === DEFAULT_DASHBOARD_ID

  const [name, setName] = useState(dashboard?.name ?? '')
  const [selected, setSelected] = useState<string[]>(
    dashboard?.widgets ?? WIDGET_REGISTRY.map(w => w.id)
  )
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [nameErr, setNameErr] = useState('')

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    setName(dashboard?.name ?? '')
    setSelected(dashboard?.widgets ?? WIDGET_REGISTRY.map(w => w.id))
  }, [dashboard])

  const toggle = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const moveUp = (id: string) => {
    setSelected(prev => {
      const idx = prev.indexOf(id)
      if (idx <= 0) return prev
      const next = [...prev]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      return next
    })
  }

  const moveDown = (id: string) => {
    setSelected(prev => {
      const idx = prev.indexOf(id)
      if (idx === -1 || idx === prev.length - 1) return prev
      const next = [...prev]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      return next
    })
  }

  // Drag & drop reorder
  const onDragStart = (id: string) => setDragging(id)
  const onDragEnd   = () => { setDragging(null); setDragOver(null) }
  const onDrop      = (targetId: string) => {
    if (!dragging || dragging === targetId) return
    setSelected(prev => {
      const next = prev.filter(x => x !== dragging)
      const targetIdx = next.indexOf(targetId)
      next.splice(targetIdx, 0, dragging)
      return next
    })
    setDragging(null)
    setDragOver(null)
  }

  const handleSave = () => {
    if (!name.trim()) { setNameErr('İsim gereklidir'); return }
    if (selected.length === 0) { setNameErr('En az 1 widget seçin'); return }
    onSave(name.trim(), selected)
  }

  // Ordered list: selected widgets in order, then unselected below
  const orderedSelected = selected.filter(id => WIDGET_REGISTRY.find(w => w.id === id))
  const unselected = WIDGET_REGISTRY.filter(w => !selected.includes(w.id))

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-indigo-50 border border-indigo-200 flex items-center justify-center">
              <LayoutDashboard size={13} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-zinc-900">
                {isEdit ? 'Dashboard Düzenle' : 'Yeni Dashboard'}
              </p>
              <p className="text-[10px] text-zinc-400">Widget seçin ve sıralayın</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* Name */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-600 uppercase tracking-wider mb-1.5">
              Dashboard Adı
            </label>
            <input
              className="input"
              placeholder="ör. Haftalık Özet, Saha Operasyonu..."
              value={name}
              disabled={isDefault}
              onChange={e => { setName(e.target.value); setNameErr('') }}
            />
            {isDefault && (
              <p className="text-[10px] text-zinc-400 mt-1">Ana Ekran adı değiştirilemez</p>
            )}
          </div>

          {/* Selected widgets - ordered, draggable */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">
              Aktif Widgetlar <span className="text-zinc-400 font-normal normal-case">- sürükle veya ok ile sırala</span>
            </label>

            {orderedSelected.length === 0 ? (
              <p className="text-[12px] text-zinc-400 py-4 text-center border border-dashed border-zinc-200 rounded-lg">
                Hiç widget seçilmedi
              </p>
            ) : (
              <div className="space-y-1.5">
                {orderedSelected.map((id, idx) => {
                  const meta = WIDGET_REGISTRY.find(w => w.id === id)!
                  return (
                    <div
                      key={id}
                      draggable
                      onDragStart={() => onDragStart(id)}
                      onDragEnd={onDragEnd}
                      onDragOver={e => { e.preventDefault(); setDragOver(id) }}
                      onDrop={() => onDrop(id)}
                      className={clsx(
                        'flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all cursor-grab active:cursor-grabbing',
                        dragging === id   ? 'opacity-40 border-indigo-300 bg-indigo-50' :
                        dragOver === id   ? 'border-indigo-400 bg-indigo-50/70 scale-[1.01]' :
                                            'border-zinc-200 bg-white hover:border-zinc-300'
                      )}
                    >
                      <GripVertical size={13} className="text-zinc-300 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-zinc-800">{meta.label}</p>
                        <p className="text-[10px] text-zinc-400 truncate">{meta.description}</p>
                      </div>
                      <span className={clsx('text-[9px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wide flex-shrink-0', SPAN_COLOR[meta.span])}>
                        {SPAN_LABEL[meta.span]}
                      </span>
                      <div className="flex flex-col gap-0.5 flex-shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveUp(id)}
                          className="w-5 h-5 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 disabled:opacity-20 transition-colors"
                          aria-label="Yukarı taşı"
                        >
                          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 2L9 7H1L5 2Z" fill="currentColor"/></svg>
                        </button>
                        <button
                          type="button"
                          disabled={idx === orderedSelected.length - 1}
                          onClick={() => moveDown(id)}
                          className="w-5 h-5 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 disabled:opacity-20 transition-colors"
                          aria-label="Aşağı taşı"
                        >
                          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 8L1 3H9L5 8Z" fill="currentColor"/></svg>
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggle(id)}
                        className="w-6 h-6 rounded flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                        aria-label="Kaldır"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Unselected widgets */}
          {unselected.length > 0 && (
            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">
                Eklenebilir Widgetlar
              </label>
              <div className="space-y-1.5">
                {unselected.map(meta => (
                  <button
                    key={meta.id}
                    type="button"
                    onClick={() => toggle(meta.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-dashed border-zinc-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all text-left group"
                  >
                    <div className="w-5 h-5 rounded border-2 border-zinc-200 group-hover:border-indigo-400 flex items-center justify-center transition-colors flex-shrink-0">
                      <Check size={10} className="text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-zinc-500 group-hover:text-zinc-800 transition-colors">{meta.label}</p>
                      <p className="text-[10px] text-zinc-400 truncate">{meta.description}</p>
                    </div>
                    <span className={clsx('text-[9px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wide flex-shrink-0', SPAN_COLOR[meta.span])}>
                      {SPAN_LABEL[meta.span]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {nameErr && (
            <p className="text-[11px] text-red-600 bg-red-50 px-3 py-2 rounded border border-red-200">{nameErr}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-zinc-100 flex-shrink-0">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">İptal</button>
          <button type="button" onClick={handleSave} className="btn-primary flex-1 justify-center">
            <Check size={13} /> {isEdit ? 'Kaydet' : 'Oluştur'}
          </button>
        </div>
      </div>
    </div>
  )
}
