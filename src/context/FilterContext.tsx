import { createContext, useContext, useState, type ReactNode } from 'react'

export type DatePreset = 'today' | '7d' | '30d' | 'month' | 'custom'

export interface DashboardFilterState {
  departmentId: string   // '' = tümü
  status:       string   // '' = tümü
  priority:     string   // '' = tümü
  groupId:      string   // '' = tümü
  datePreset:   DatePreset
  dateFrom:     string   // ISO datetime string, '' if not set
  dateTo:       string   // ISO datetime string, '' if not set
}

const DEFAULT: DashboardFilterState = {
  departmentId: '',
  status:       '',
  priority:     '',
  groupId:      '',
  datePreset:   '30d',
  dateFrom:     '',
  dateTo:       '',
}

interface FilterContextValue {
  filter:    DashboardFilterState
  setFilter: (patch: Partial<DashboardFilterState>) => void
  reset:     () => void
  activeCount: number
  /** Resolved ISO dateFrom based on preset (or custom value) */
  resolvedDateFrom: string
  resolvedDateTo:   string
}

const FilterContext = createContext<FilterContextValue | null>(null)

function resolvePreset(preset: DatePreset, custom: { from: string; to: string }) {
  const now  = new Date()
  const end  = new Date(now); end.setHours(23, 59, 59, 999)

  switch (preset) {
    case 'today': {
      const start = new Date(now); start.setHours(0, 0, 0, 0)
      return { from: start.toISOString(), to: end.toISOString() }
    }
    case '7d': {
      const start = new Date(now); start.setDate(now.getDate() - 7); start.setHours(0, 0, 0, 0)
      return { from: start.toISOString(), to: end.toISOString() }
    }
    case '30d': {
      const start = new Date(now); start.setDate(now.getDate() - 30); start.setHours(0, 0, 0, 0)
      return { from: start.toISOString(), to: end.toISOString() }
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      return { from: start.toISOString(), to: end.toISOString() }
    }
    case 'custom':
      return { from: custom.from, to: custom.to }
  }
}

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filter, setFilterState] = useState<DashboardFilterState>(DEFAULT)

  const setFilter = (patch: Partial<DashboardFilterState>) =>
    setFilterState(prev => ({ ...prev, ...patch }))

  const reset = () => setFilterState(DEFAULT)

  const activeCount = [
    filter.departmentId !== '',
    filter.status       !== '',
    filter.priority     !== '',
    filter.groupId      !== '',
    filter.datePreset   !== '30d',
  ].filter(Boolean).length

  const { from, to } = resolvePreset(filter.datePreset, { from: filter.dateFrom, to: filter.dateTo })

  return (
    <FilterContext.Provider value={{
      filter, setFilter, reset, activeCount,
      resolvedDateFrom: from,
      resolvedDateTo:   to,
    }}>
      {children}
    </FilterContext.Provider>
  )
}

export function useFilter() {
  const ctx = useContext(FilterContext)
  if (!ctx) throw new Error('useFilter must be used within FilterProvider')
  return ctx
}
