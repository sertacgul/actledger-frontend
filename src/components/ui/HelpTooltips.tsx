import { useEffect, useState, useRef } from 'react'

/**
 * Global hover-tooltip system.
 *
 * Mount once at the app root. It listens for `mouseover` events on elements
 * that have a `data-help="..."` attribute and displays a contextual help box
 * after the cursor has been hovering for HOLD_MS milliseconds.
 *
 * Usage anywhere in the app:
 *   <button data-help="Bu görevi tamamlandı olarak işaretler">
 */

const HOLD_MS = 3000

interface TooltipState {
  visible: boolean
  text:    string
  x:       number
  y:       number
}

export default function HelpTooltips() {
  const [state, setState] = useState<TooltipState>({ visible: false, text: '', x: 0, y: 0 })
  const timerRef   = useRef<number | null>(null)
  const currentRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const cancel = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
      currentRef.current = null
      setState(s => s.visible ? { ...s, visible: false } : s)
    }

    const handleOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      const help = target.closest<HTMLElement>('[data-help]')
      if (!help) {
        cancel()
        return
      }
      const text = help.getAttribute('data-help')
      if (!text) {
        cancel()
        return
      }
      // If we're already tracking the same element, don't reset the timer
      if (currentRef.current === help) return

      cancel()
      currentRef.current = help

      timerRef.current = window.setTimeout(() => {
        if (currentRef.current !== help) return
        const rect = help.getBoundingClientRect()
        // Prefer below the element; if no room, place above
        const placeBelow = rect.bottom + 60 < window.innerHeight
        const x = Math.min(window.innerWidth - 280, Math.max(8, rect.left + rect.width / 2 - 140))
        const y = placeBelow ? rect.bottom + 8 : rect.top - 8
        setState({
          visible: true,
          text,
          x,
          y: placeBelow ? y : y, // anchored to top edge always - we use translateY for above
        })
        // Re-measure with placement direction info
        setState(prev => ({
          ...prev,
          y: placeBelow ? rect.bottom + 8 : rect.top - 8,
        }))
      }, HOLD_MS)
    }

    const handleOut = (e: MouseEvent) => {
      const related = e.relatedTarget as HTMLElement | null
      if (related?.closest('[data-help]') === currentRef.current && currentRef.current) return
      cancel()
    }

    const handleScroll = () => cancel()
    const handleClick  = () => cancel()
    const handleKey    = () => cancel()

    document.addEventListener('mouseover', handleOver, true)
    document.addEventListener('mouseout',  handleOut,  true)
    window.addEventListener('scroll',      handleScroll, true)
    window.addEventListener('click',       handleClick, true)
    window.addEventListener('keydown',     handleKey)

    return () => {
      cancel()
      document.removeEventListener('mouseover', handleOver, true)
      document.removeEventListener('mouseout',  handleOut,  true)
      window.removeEventListener('scroll',      handleScroll, true)
      window.removeEventListener('click',       handleClick, true)
      window.removeEventListener('keydown',     handleKey)
    }
  }, [])

  if (!state.visible) return null

  // Determine if tooltip should render above or below the trigger
  const placeAbove = state.y < 80
  const transform  = placeAbove ? 'translateY(-100%)' : 'translateY(0)'

  return (
    <div
      role="tooltip"
      className="fixed z-[100] pointer-events-none"
      style={{
        left:      state.x,
        top:       state.y,
        transform,
        maxWidth:  280,
        width:     'max-content',
        animation: 'help-fade-in 0.18s ease-out',
      }}
    >
      <div className="px-3 py-2 rounded-lg shadow-lg border bg-zinc-900 border-zinc-700 text-white">
        <p className="text-[11px] leading-snug font-medium">
          {state.text}
        </p>
      </div>
      {/* Animation keyframes registered globally in index.css */}
    </div>
  )
}
