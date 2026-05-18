import { createContext, useContext, useState, useMemo, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { ROLE_HIERARCHY } from '../types'

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
  /** True when the user's role is too low to see other departments */
  departmentLocked: boolean
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
  const userLevel = user ? (ROLE_HIERARCHY[user.role] ?? 1) : 1
  // Only GM+ (level >= 8) can see all departments; everyone else is locked to their own
  const departmentLocked = userLevel < 8
  const lockedDeptId = departmentLocked ? (user?.departmentId ?? '') : ''

  const [filter, setFilterState] = useState<DashboardFilterState>({
    ...DEFAULT,
    departmentId: lockedDeptId,
  })

  const setFilter = (patch: Partial<DashboardFilterState>) =>
    setFilterState(prev => ({
      ...prev,
      ...patch,
      // Enforce department lock for low-level users
      ...(departmentLocked ? { departmentId: lockedDeptId } : {}),
    }))

  const reset = () => setFilterState({ ...DEFAULT, departmentId: lockedDeptId })

  // Effective filter: always apply department lock
  const effectiveFilter = useMemo(() => ({
    ...filter,
    departmentId: departmentLocked ? lockedDeptId : filter.departmentId,
  }), [filter, departmentLocked, lockedDeptId])

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
      departmentLocked,
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
