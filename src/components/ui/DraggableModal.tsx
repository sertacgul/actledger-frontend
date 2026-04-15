import { useRef, useState, useEffect, type ReactNode, type MouseEvent } from 'react'
import { X, Minus, Maximize2, Minimize2 } from 'lucide-react'

interface Props {
  title:      string
  subtitle?:  string
  icon?:      ReactNode
  onClose:    () => void
  children:   ReactNode
  footer?:    ReactNode
  /** px width. Default 560 */
  width?:     number
  maxHeight?: string
}

const MOBILE_BREAKPOINT = 768

type WindowState = 'normal' | 'minimized' | 'maximized'

export default function DraggableModal({
  title, subtitle, icon, onClose, children, footer,
  width = 560, maxHeight = '88vh',
}: Props) {
  // Track viewport - use mobile sheet layout below MOBILE_BREAKPOINT
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BREAKPOINT)
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const [windowState, setWindowState] = useState<WindowState>('normal')

  const [pos, setPos] = useState<{ x: number; y: number }>(() => ({
    x: Math.max(16, (window.innerWidth  - width) / 2),
    y: Math.max(16, (window.innerHeight - 540)   / 2),
  }))
  const [dragging, setDragging] = useState(false)
  const dragRef  = useRef<{ mx: number; my: number; px: number; py: number } | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  /* ── Escape → close ── */
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  /* ── Drag events (desktop + normal state only) ── */
  const onTitleMouseDown = (e: MouseEvent) => {
    if (isMobile || windowState !== 'normal') return
    if ((e.target as HTMLElement).closest('button')) return
    e.preventDefault()
    dragRef.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y }
    setDragging(true)
  }

  useEffect(() => {
    if (!dragging) return

    const onMove = (e: globalThis.MouseEvent) => {
      if (!dragRef.current) return
      const dx   = e.clientX - dragRef.current.mx
      const dy   = e.clientY - dragRef.current.my
      const mw   = modalRef.current?.offsetWidth  ?? width
      const mh   = modalRef.current?.offsetHeight ?? 400
      const maxX = Math.max(0, window.innerWidth  - mw)
      const maxY = Math.max(0, window.innerHeight - mh)
      setPos({
        x: Math.min(maxX, Math.max(0, dragRef.current.px + dx)),
        y: Math.min(maxY, Math.max(0, dragRef.current.py + dy)),
      })
    }
    const onUp = () => { setDragging(false); dragRef.current = null }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }
  }, [dragging, width])

  const handleMinimize = (e: MouseEvent) => {
    e.stopPropagation()
    setWindowState(s => s === 'minimized' ? 'normal' : 'minimized')
  }

  const handleMaximize = (e: MouseEvent) => {
    e.stopPropagation()
    setWindowState(s => s === 'maximized' ? 'normal' : 'maximized')
  }

  const isMaximized = !isMobile && windowState === 'maximized'
  const isMinimized = !isMobile && windowState === 'minimized'

  // ── Layout calculation per state ────────────────────────────────────────────
  const windowStyle: React.CSSProperties = (() => {
    if (isMobile) {
      return {
        left: 0, top: 0, right: 0, bottom: 0,
        width: '100%', height: '100%', maxHeight: '100%',
        borderRadius: 0, border: 'none', boxShadow: 'none',
      }
    }
    if (isMaximized) {
      return {
        left: 8, top: 8, right: 8, bottom: 8,
        width: 'auto', height: 'auto', maxHeight: 'calc(100vh - 16px)',
      }
    }
    if (isMinimized) {
      // Dock to bottom-right as a minimized title bar
      return {
        left: 'auto', right: 16, bottom: 16, top: 'auto',
        width: 280, height: 'auto', maxHeight: 'auto',
      }
    }
    // Normal - draggable
    return {
      left:  pos.x,
      top:   pos.y,
      width: Math.min(width, window.innerWidth - 32),
      height: 'auto',
      maxHeight,
    }
  })()

  return (
    <div className="fixed inset-0 z-50" style={{ pointerEvents: 'none' }}>

      {/* Backdrop - hidden when minimized */}
      {!isMinimized && (
        <div
          className="absolute inset-0 animate-backdrop-in"
          style={{
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
            pointerEvents: 'auto',
          }}
          onClick={onClose}
        />
      )}

      {/* Window */}
      <div
        ref={modalRef}
        className="absolute flex flex-col animate-window-in"
        style={{
          ...windowStyle,
          background:    'var(--surface)',
          border:        isMobile ? 'none' : '1px solid var(--border)',
          borderRadius:  isMobile ? 0 : 'var(--radius-lg)',
          boxShadow:     isMobile ? 'none' : '0 32px 80px rgba(0,0,0,0.28), 0 8px 24px rgba(0,0,0,0.16), 0 0 0 0.5px rgba(0,0,0,0.08)',
          pointerEvents: 'auto',
          cursor:        dragging ? 'grabbing' : 'default',
          overflow:      'hidden',
          transition:    dragging ? 'none' : 'left 0.18s, top 0.18s, right 0.18s, bottom 0.18s, width 0.18s, height 0.18s',
        }}
      >

        {/* ── Title bar ── */}
        <div
          className="flex items-center gap-3 px-4 py-3 select-none flex-shrink-0"
          style={{
            borderBottom: `1px solid var(--border)`,
            cursor: (isMobile || windowState !== 'normal') ? 'default' : (dragging ? 'grabbing' : 'grab'),
            background: 'var(--surface)',
          }}
          onMouseDown={onTitleMouseDown}
          onDoubleClick={(e) => { if (!isMobile) handleMaximize(e) }}
        >
          {/* Traffic lights */}
          <div className="flex items-center gap-[6px] flex-shrink-0">
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onClose() }}
              className="traffic-light traffic-light-red group"
              title="Kapat"
              aria-label="Kapat"
            >
              <X size={7} className="opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={3} />
            </button>
            <button
              type="button"
              onClick={handleMinimize}
              className="traffic-light traffic-light-amber group"
              title={isMinimized ? 'Geri Yükle' : 'Simge Durumuna Küçült'}
              aria-label="Simge durumuna küçült"
            >
              <Minus size={7} className="opacity-0 group-hover:opacity-100 transition-opacity text-amber-900" strokeWidth={3} />
            </button>
            <button
              type="button"
              onClick={handleMaximize}
              className="traffic-light traffic-light-green group"
              title={isMaximized ? 'Önceki Boyuta Dön' : 'Tam Ekran'}
              aria-label="Tam ekran"
            >
              {isMaximized
                ? <Minimize2 size={6} className="opacity-0 group-hover:opacity-100 transition-opacity text-green-900" strokeWidth={3} />
                : <Maximize2 size={6} className="opacity-0 group-hover:opacity-100 transition-opacity text-green-900" strokeWidth={3} />
              }
            </button>
          </div>

          {/* Centered title */}
          <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
            {icon && (
              <span className="flex-shrink-0" style={{ color: 'var(--text-3)' }}>{icon}</span>
            )}
            <span
              className="text-[12px] font-semibold truncate"
              style={{ color: 'var(--text-1)' }}
            >
              {title}
            </span>
            {subtitle && (
              <span
                className="text-[11px] truncate hidden sm:block"
                style={{ color: 'var(--text-3)' }}
              >
                · {subtitle}
              </span>
            )}
          </div>

          {/* Right spacer (balances traffic lights) */}
          <div style={{ width: 52 }} className="flex-shrink-0" />
        </div>

        {/* ── Scrollable content - hidden when minimized ── */}
        {!isMinimized && (
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {children}
          </div>
        )}

        {/* ── Footer - hidden when minimized ── */}
        {footer && !isMinimized && (
          <div
            className="flex items-center justify-end gap-2 px-6 py-4 flex-shrink-0"
            style={{ borderTop: `1px solid var(--border)`, background: 'var(--surface)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
