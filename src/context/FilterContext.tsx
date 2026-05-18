import { createContext, useContext, useState, useMemo, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { getDepartmentScope, type DepartmentScope } from '../lib/dept-scope'

export type DatePreset = 'today' | '7d' | '30d' | 'month' | 'custom'

export interface DashboardFilterState {
  departmentId: string   // '' = tümü (scoped to user's allowed depts)
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
  /** Three-tier department scope based on user role */
  departmentScope: DepartmentScope
  /** Backward compat — true when mode is 'single' */
  departmentLocked: boolean
  /** Department IDs the user is allowed to see (empty = all) */
  allowedDepartmentIds: string[]
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
  const { user } = useAuth()
  const scope = getDepartmentScope(user)

  // For 'single' mode, lock to the one dept; for 'multi', start with '' (all assigned); for 'all', start with ''
  const initialDeptId = scope.mode === 'single' ? (scope.deptIds[0] ?? '') : ''

  const [filter, setFilterState] = useState<DashboardFilterState>({
    ...DEFAULT,
    departmentId: initialDeptId,
  })

  const setFilter = (patch: Partial<DashboardFilterState>) =>
    setFilterState(prev => {
      const next = { ...prev, ...patch }
      // Enforce scope
      if (scope.mode === 'single') {
        next.departmentId = scope.deptIds[0] ?? ''
      } else if (scope.mode === 'multi' && next.departmentId !== '') {
        // Validate selected dept is within allowed list
        if (!scope.deptIds.includes(next.departmentId)) {
          next.departmentId = ''
        }
      }
      return next
    })

  const reset = () => setFilterState({ ...DEFAULT, departmentId: initialDeptId })

  // Effective filter
  const effectiveFilter = useMemo(() => {
    const f = { ...filter }
    if (scope.mode === 'single') f.departmentId = scope.deptIds[0] ?? ''
    if (scope.mode === 'multi' && f.departmentId !== '' && !scope.deptIds.includes(f.departmentId)) {
      f.departmentId = ''
    }
    return f
  }, [filter, scope])

  const departmentLocked = scope.mode === 'single'

  const activeCount = [
    effectiveFilter.departmentId !== '' && !departmentLocked,
    effectiveFilter.status       !== '',
    effectiveFilter.priority     !== '',
    effectiveFilter.groupId      !== '',
    effectiveFilter.datePreset   !== '30d',
  ].filter(Boolean).length

  const { from, to } = resolvePreset(effectiveFilter.datePreset, { from: effectiveFilter.dateFrom, to: effectiveFilter.dateTo })

  return (
    <FilterContext.Provider value={{
      filter: effectiveFilter, setFilter, reset, activeCount,
      resolvedDateFrom: from,
      resolvedDateTo:   to,
      departmentScope: scope,
      departmentLocked,
      allowedDepartmentIds: scope.deptIds,
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
