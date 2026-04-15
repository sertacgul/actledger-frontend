import { useEffect, useMemo } from 'react'
import { Keyboard, X } from 'lucide-react'
import { useShortcutsContext, type ShortcutCategory, type ShortcutDef } from '../../context/ShortcutsContext'

const CATEGORY_ORDER: ShortcutCategory[] = ['Gezinme', 'Eylem', 'Görünüm', 'Diğer']

function KeyChip({ k }: { k: string }) {
  // Render space-separated keys as individual chips
  const parts = k.split(' ')
  return (
    <span className="inline-flex items-center gap-1">
      {parts.map((p, i) => (
        <kbd key={i} className="px-1.5 py-0.5 rounded border border-zinc-200 bg-zinc-50 text-[10px] font-mono font-semibold text-zinc-700 shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.05)]">
          {p === '?' ? '?' : p.toUpperCase()}
        </kbd>
      ))}
    </span>
  )
}

export default function ShortcutsHelpModal() {
  const { helpOpen, setHelpOpen, shortcuts } = useShortcutsContext()

  // Close on Escape (capture-level so it works regardless of focus)
  useEffect(() => {
    if (!helpOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setHelpOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [helpOpen, setHelpOpen])

  const grouped = useMemo(() => {
    const map: Record<string, ShortcutDef[]> = {}
    for (const s of shortcuts) {
      if (!map[s.category]) map[s.category] = []
      map[s.category].push(s)
    }
    // Sort within each category by keys length then alphabetically
    for (const cat of Object.keys(map)) {
      map[cat].sort((a, b) => {
        const aLen = a.keys.split(' ').length
        const bLen = b.keys.split(' ').length
        if (aLen !== bLen) return aLen - bLen
        return a.keys.localeCompare(b.keys)
      })
    }
    return map
  }, [shortcuts])

  if (!helpOpen) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={() => setHelpOpen(false)}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Keyboard size={15} className="text-indigo-600" />
            </div>
            <div>
              <p id="shortcuts-title" className="text-[14px] font-semibold text-zinc-900">Klavye Kısayolları</p>
              <p className="text-[11px] text-zinc-400">Hızlı gezinme ve eylem tuşları</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setHelpOpen(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 transition-colors"
            aria-label="Kapat"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {shortcuts.length === 0 ? (
            <p className="text-[12px] text-zinc-400 text-center py-8">Henüz kısayol kayıtlı değil</p>
          ) : (
            CATEGORY_ORDER.filter(cat => grouped[cat]?.length).map(cat => (
              <div key={cat}>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">{cat}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                  {grouped[cat].map(s => (
                    <div key={s.id} className="flex items-center justify-between py-1.5 border-b border-zinc-50">
                      <span className="text-[12px] text-zinc-700">{s.label}</span>
                      <KeyChip k={s.keys} />
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
          <p className="text-[11px] text-zinc-500">
            <KeyChip k="?" /> ile bu pencereyi her an açabilirsiniz
          </p>
          <p className="text-[11px] text-zinc-400">
            <KeyChip k="Esc" /> ile kapat
          </p>
        </div>
      </div>
    </div>
  )
}
