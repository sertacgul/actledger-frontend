import type { User } from '../types'
import { ROLE_HIERARCHY } from '../types'

export type ScopeMode = 'all' | 'multi' | 'single'

export interface DepartmentScope {
  mode: ScopeMode
  deptIds: string[]
}

export function getDepartmentScope(user: User | null): DepartmentScope {
  if (!user) return { mode: 'single', deptIds: [] }
  const level = ROLE_HIERARCHY[user.role] ?? 1
  if (level >= 8) return { mode: 'all', deptIds: [] }
  if (level >= 6) return { mode: 'multi', deptIds: user.departments?.map(d => d.id) ?? [user.departmentId] }
  return { mode: 'single', deptIds: [user.departmentId] }
}
