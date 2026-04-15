import { useEffect } from 'react'
import { TOOLBAR_EVENTS } from '../components/layout/ToolsBar'

/**
 * Subscribe a page to the global ToolsBar action events.
 *
 * Each handler is optional. The hook re-subscribes whenever any handler
 * reference changes, so callers can pass arrow functions safely.
 *
 * Usage:
 *   useToolbarActions({
 *     onNew:     () => setShowCreate(true),
 *     onSearch:  () => searchRef.current?.focus(),
 *     onRefresh: refetch,
 *     onExport:  handleExportExcel,
 *   })
 */
export function useToolbarActions(handlers: {
  onNew?:     () => void
  onSearch?:  () => void
  onRefresh?: () => void
  onExport?:  () => void
  onFilter?:  () => void
}) {
  useEffect(() => {
    const map: [string, (() => void) | undefined][] = [
      [TOOLBAR_EVENTS.newRecord,    handlers.onNew],
      [TOOLBAR_EVENTS.search,       handlers.onSearch],
      [TOOLBAR_EVENTS.refresh,      handlers.onRefresh],
      [TOOLBAR_EVENTS.exportExcel,  handlers.onExport],
      [TOOLBAR_EVENTS.toggleFilter, handlers.onFilter],
    ]

    const cleaners: Array<() => void> = []
    for (const [event, handler] of map) {
      if (!handler) continue
      const wrapped = () => handler()
      window.addEventListener(event, wrapped)
      cleaners.push(() => window.removeEventListener(event, wrapped))
    }
    return () => cleaners.forEach(c => c())
  }, [handlers.onNew, handlers.onSearch, handlers.onRefresh, handlers.onExport, handlers.onFilter])
}
