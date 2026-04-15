import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react'

export type ShortcutCategory = 'Gezinme' | 'Eylem' | 'Görünüm' | 'Diğer'

export interface ShortcutDef {
  id: string
  /** Single key like 'c' / '?' or sequence like 'g d' (space-separated) */
  keys: string
  label: string
  category: ShortcutCategory
  handler: () => void
}

interface ShortcutsContextValue {
  register:    (def: ShortcutDef) => () => void
  shortcuts:   ShortcutDef[]
  helpOpen:    boolean
  setHelpOpen: (v: boolean) => void
  /** Currently buffered key (for visual hint) - empty when no sequence in progress */
  pendingKey:  string
}

const ShortcutsContext = createContext<ShortcutsContextValue | null>(null)

const SEQUENCE_TIMEOUT = 1000

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.isContentEditable) return true
  return false
}

export function ShortcutsProvider({ children }: { children: ReactNode }) {
  // Use a ref-backed map for fast lookup; bump a version state when it changes
  const shortcutsRef = useRef<Map<string, ShortcutDef>>(new Map())
  const [version, setVersion] = useState(0)

  const [helpOpen, setHelpOpen] = useState(false)
  const [pendingKey, setPendingKey] = useState('')
  const sequenceRef = useRef<{ key: string; at: number } | null>(null)
  const pendingTimerRef = useRef<number | null>(null)

  const register = useCallback((def: ShortcutDef): (() => void) => {
    shortcutsRef.current.set(def.id, def)
    setVersion(v => v + 1)
    return () => {
      shortcutsRef.current.delete(def.id)
      setVersion(v => v + 1)
    }
  }, [])

  const clearPending = useCallback(() => {
    sequenceRef.current = null
    if (pendingTimerRef.current !== null) {
      window.clearTimeout(pendingTimerRef.current)
      pendingTimerRef.current = null
    }
    setPendingKey('')
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Allow Escape to bubble even when typing - modals handle it
      if (e.key === 'Escape') {
        clearPending()
        return
      }

      // Don't intercept typing in form fields
      if (isTypingTarget(e.target)) return

      // Don't fight browser shortcuts
      if (e.ctrlKey || e.metaKey || e.altKey) return

      // Normalize the pressed key
      let pressed = e.key
      // Keep '?' as-is (already produced by shift+/), normalize letters to lowercase
      if (pressed.length === 1 && pressed !== '?') pressed = pressed.toLowerCase()

      // Skip pure modifier presses
      if (pressed === 'Shift' || pressed === 'Control' || pressed === 'Alt' || pressed === 'Meta') return

      const now = Date.now()
      const list = Array.from(shortcutsRef.current.values())

      // 1. Try sequence (previous key + this key)
      if (sequenceRef.current && now - sequenceRef.current.at < SEQUENCE_TIMEOUT) {
        const sequence = `${sequenceRef.current.key} ${pressed}`
        const seqMatch = list.find(s => s.keys === sequence)
        if (seqMatch) {
          e.preventDefault()
          clearPending()
          seqMatch.handler()
          return
        }
      }

      // 2. Try single-key match
      const singleMatch = list.find(s => s.keys === pressed)
      if (singleMatch) {
        e.preventDefault()
        clearPending()
        singleMatch.handler()
        return
      }

      // 3. No match - could be the start of a sequence; only buffer if there's
      //    at least one registered shortcut beginning with this key.
      const couldBeSequence = list.some(s => s.keys.startsWith(`${pressed} `))
      if (couldBeSequence) {
        sequenceRef.current = { key: pressed, at: now }
        setPendingKey(pressed)
        if (pendingTimerRef.current !== null) window.clearTimeout(pendingTimerRef.current)
        pendingTimerRef.current = window.setTimeout(() => {
          clearPending()
        }, SEQUENCE_TIMEOUT)
      } else {
        clearPending()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [clearPending])

  const value = useMemo<ShortcutsContextValue>(() => ({
    register,
    shortcuts: Array.from(shortcutsRef.current.values()),
    helpOpen,
    setHelpOpen,
    pendingKey,
    // version is used to refresh the shortcuts array when the registry changes
  }), [register, helpOpen, pendingKey, version])

  return (
    <ShortcutsContext.Provider value={value}>
      {children}
      {pendingKey && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 rounded-lg bg-zinc-900/90 text-white text-[11px] font-mono shadow-lg backdrop-blur-sm pointer-events-none">
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 mr-1.5">{pendingKey}</kbd>
          <span className="text-zinc-300">…sıradakini bekliyor</span>
        </div>
      )}
    </ShortcutsContext.Provider>
  )
}

export function useShortcutsContext() {
  const ctx = useContext(ShortcutsContext)
  if (!ctx) throw new Error('useShortcutsContext must be used within ShortcutsProvider')
  return ctx
}

/**
 * Register a keyboard shortcut. Automatically unregisters on unmount.
 * Pass a stable handler or use the ref-backed pattern internally.
 */
export function useShortcut(opts: {
  id?: string
  keys: string
  label: string
  category: ShortcutCategory
  handler: () => void
  /** When false, the shortcut is removed (use to disable based on state) */
  enabled?: boolean
}) {
  const { register } = useShortcutsContext()
  const handlerRef = useRef(opts.handler)
  handlerRef.current = opts.handler

  const id = useMemo(
    () => opts.id ?? `sc_${opts.keys}_${Math.random().toString(36).slice(2, 7)}`,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [opts.id, opts.keys],
  )

  useEffect(() => {
    if (opts.enabled === false) return
    return register({
      id,
      keys: opts.keys,
      label: opts.label,
      category: opts.category,
      handler: () => handlerRef.current(),
    })
  }, [id, opts.keys, opts.label, opts.category, opts.enabled, register])
}
