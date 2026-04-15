import { useState, useEffect, useCallback, useRef } from 'react'
import { api, mapTask, mapDepartment, mapReport, mapUser, mapNotification, mapGeminiInsight, mapTaskGroup, type PaginatedResult } from './api'
import type { Task, Department, FieldReport, User, Notification, GeminiInsight, TaskGroup } from '../types'

// ── Generic fetch hook ────────────────────────────────────────────────────────
function useFetch<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData]     = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)
  const mounted = useRef(true)

  const run = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      if (mounted.current) setData(result)
    } catch (e: any) {
      if (mounted.current) setError(e.message ?? 'Hata')
    } finally {
      if (mounted.current) setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    mounted.current = true
    run()
    return () => { mounted.current = false }
  }, [run])

  return { data, loading, error, refetch: run }
}

// ── Company stats ─────────────────────────────────────────────────────────────
export interface CompanyStats {
  users:       { total: number; activeIn30d: number }
  departments: { total: number }
  tasks: {
    total: number; completed: number; overdue: number
    completionRate: number
    byStatus: Record<string, number>
  }
  reports: { total: number; byStatus: Record<string, number> }
}

export interface StatsFilter {
  departmentId?: string
  dateFrom?:     string
  dateTo?:       string
}

export function useCompanyStats(filter: StatsFilter = {}) {
  const params = new URLSearchParams()
  if (filter.departmentId) params.set('departmentId', filter.departmentId)
  if (filter.dateFrom)     params.set('dateFrom',     filter.dateFrom)
  if (filter.dateTo)       params.set('dateTo',       filter.dateTo)
  const qs = params.toString()
  return useFetch<CompanyStats>(
    () => api.get(`/companies/me/stats${qs ? `?${qs}` : ''}`),
    [filter.departmentId, filter.dateFrom, filter.dateTo],
  )
}

// ── Tasks ─────────────────────────────────────────────────────────────────────
interface TaskFilter {
  status?: string
  priority?: string
  departmentId?: string
  search?: string
  pageSize?: number
  groupId?: string
}

export function useTasks(filter: TaskFilter = {}) {
  const params = new URLSearchParams({ pageSize: String(filter.pageSize ?? 100) })
  if (filter.status       && filter.status !== 'tumu')       params.set('status',       filter.status.toUpperCase())
  if (filter.priority     && filter.priority !== 'tumu')     params.set('priority',     filter.priority.toUpperCase())
  if (filter.departmentId && filter.departmentId !== 'tumu') params.set('departmentId', filter.departmentId)
  if (filter.search)                                         params.set('search',       filter.search)
  if (filter.groupId)                                        params.set('groupId',      filter.groupId)

  const { data, loading, error, refetch } = useFetch<PaginatedResult<any>>(
    () => api.get(`/tasks?${params}`),
    [filter.status, filter.priority, filter.departmentId, filter.search, filter.groupId],
  )

  return {
    tasks:   (data?.data ?? []).map(mapTask) as Task[],
    total:   data?.meta?.total ?? 0,
    loading,
    error,
    refetch,
  }
}

export async function createTask(body: {
  title: string; description?: string; departmentId: string
  assigneeId: string; priority: string; type: string
  dueDate: string; tags?: string[]
  checklist?: { text: string; order: number }[]
  latitude?: number | null; longitude?: number | null
}): Promise<Task> {
  const result = await api.post<any>('/tasks', {
    ...body,
    priority: body.priority.toUpperCase(),
    type:     body.type.toUpperCase(),
  })
  return mapTask(result)
}

export async function updateTaskStatus(id: string, status: string): Promise<Task> {
  const result = await api.patch<any>(`/tasks/${id}/status`, {
    status: status.toUpperCase(),
  })
  return mapTask(result)
}

export async function updateChecklistItem(
  taskId: string, itemId: string, completed: boolean, note?: string,
): Promise<void> {
  await api.patch(`/tasks/${taskId}/checklist/${itemId}`, { completed, note })
}

// ── Departments ───────────────────────────────────────────────────────────────
export function useDepartments() {
  const { data, loading, error, refetch } = useFetch<any[]>(
    () => api.get('/departments'),
  )
  return {
    departments: (data ?? []).map(mapDepartment) as Department[],
    loading,
    error,
    refetch,
  }
}

export async function createDepartment(body: {
  name: string; code: string; color?: string; managerId?: string; parentId?: string
}): Promise<Department> {
  const result = await api.post<any>('/departments', body)
  return mapDepartment(result)
}

export async function updateDepartment(id: string, body: {
  name?: string; code?: string; color?: string; managerId?: string
}): Promise<Department> {
  const result = await api.patch<any>(`/departments/${id}`, body)
  return mapDepartment(result)
}

export async function deleteDepartment(id: string): Promise<void> {
  await api.delete(`/departments/${id}`)
}

// ── Reports ───────────────────────────────────────────────────────────────────
interface ReportFilter {
  status?: string
  departmentId?: string
  search?: string
  dateFrom?: string
  dateTo?: string
}

export function useReports(filter: ReportFilter = {}) {
  const params = new URLSearchParams({ pageSize: '100' })
  if (filter.status       && filter.status !== 'tumu')       params.set('status',       mapReportStatusToBackend(filter.status))
  if (filter.departmentId && filter.departmentId !== 'tumu') params.set('departmentId', filter.departmentId)
  if (filter.search)                                          params.set('search',       filter.search)
  if (filter.dateFrom)                                        params.set('dateFrom',     filter.dateFrom)
  if (filter.dateTo)                                          params.set('dateTo',       filter.dateTo)

  const { data, loading, error, refetch } = useFetch<PaginatedResult<any>>(
    () => api.get(`/field-reports?${params}`),
    [filter.status, filter.departmentId, filter.search, filter.dateFrom, filter.dateTo],
  )

  return {
    reports: (data?.data ?? []).map(mapReport) as FieldReport[],
    total:   data?.meta?.total ?? 0,
    loading,
    error,
    refetch,
  }
}

function mapReportStatusToBackend(s: string): string {
  const m: Record<string, string> = {
    taslak:      'BEKLEMEDE',
    gonderildi:  'INCELENIYOR',
    onaylandi:   'ONAYLANDI',
    reddedildi:  'REDDEDILDI',
  }
  return m[s] ?? s.toUpperCase()
}

export async function updateReportStatus(
  id: string, status: 'onaylandi' | 'reddedildi', note?: string,
): Promise<void> {
  await api.patch(`/field-reports/${id}/status`, {
    status: mapReportStatusToBackend(status),
    note,
  })
}

import type { FieldReportAIAnalysis } from '../types'

export async function analyzeReport(id: string): Promise<FieldReportAIAnalysis> {
  return api.post<FieldReportAIAnalysis>(`/field-reports/${id}/analyze`)
}

// ── KPIs ────────────────────────────────────────────────────────────────────
export type KpiLayer = 'PERFORMANCE' | 'QUALITY' | 'TIME' | 'RISK' | 'AI_INSIGHT'

export interface BiText { tr: string; en: string }

export interface Kpi {
  id:           string
  companyId:    string
  departmentId: string
  code:         string
  layer:        KpiLayer
  label:        BiText
  description?: BiText | null
  unit?:        string | null
  target?:      number | null
  currentValue?: number | null
  startDate?:   string | null
  endDate?:     string | null
  fromTemplate: boolean
  order:        number
  createdAt:    string
  updatedAt:    string
}

export function useKpis(filter: { departmentId?: string; layer?: KpiLayer } = {}) {
  const params = new URLSearchParams()
  if (filter.departmentId) params.set('departmentId', filter.departmentId)
  if (filter.layer)        params.set('layer', filter.layer)
  const qs = params.toString()

  const { data, loading, error, refetch } = useFetch<Kpi[]>(
    () => api.get(`/kpis${qs ? `?${qs}` : ''}`),
    [filter.departmentId, filter.layer],
  )

  return { kpis: data ?? [], loading, error, refetch }
}

export async function createKpi(body: {
  departmentId: string; code: string; layer: KpiLayer
  label: BiText; description?: BiText
  unit?: string; target?: number; currentValue?: number
  startDate?: string; endDate?: string; order?: number
}): Promise<Kpi> {
  return api.post<Kpi>('/kpis', body)
}

export async function updateKpi(id: string, body: Partial<Omit<Kpi, 'id' | 'companyId' | 'departmentId' | 'createdAt' | 'updatedAt' | 'fromTemplate'>>): Promise<Kpi> {
  return api.patch<Kpi>(`/kpis/${id}`, body)
}

export async function deleteKpi(id: string): Promise<void> {
  await api.delete(`/kpis/${id}`)
}

// ── Sector templates ────────────────────────────────────────────────────────
export interface SectorTemplateDept {
  code:  string
  name:  BiText
  color: string
  description?: BiText
  kpis: {
    code:  string
    layer: KpiLayer
    label: BiText
    description?: BiText
    unit?: string
  }[]
}

export interface SectorTemplate {
  id:          string
  name:        BiText
  icon:        string
  description: BiText
  departments: SectorTemplateDept[]
}

export function useSectorTemplate(sectorId: string) {
  const { data, loading, error, refetch } = useFetch<SectorTemplate>(
    () => api.get(`/kpis/sector-templates/${sectorId}`),
    [sectorId],
  )
  return { template: data, loading, error, refetch }
}

export interface ApplyTemplateResult {
  sectorId:           string
  createdDepartments: number
  createdKpis:        number
  departments: { departmentId: string; code: string; created: boolean; kpisAdded: number }[]
}

export async function applySectorTemplate(body: {
  sectorId: string
  departmentCodes?: string[]
  excludeKpiCodes?: string[]
}): Promise<ApplyTemplateResult> {
  return api.post<ApplyTemplateResult>('/kpis/sector-templates/apply', body)
}

// ── Inventory ────────────────────────────────────────────────────────────────
export type InventoryType   = 'DEMIRBAS' | 'TUKETIM'
export type InventoryStatus = 'AKTIF' | 'BAKIMDA' | 'ARIZALI' | 'HURDA' | 'STOK' | 'KRITIK' | 'TUKENMIS'

export interface InventoryItem {
  id:            string
  type:          InventoryType
  status:        InventoryStatus
  name:          string
  code?:         string
  category?:     string
  description?:  string
  departmentId?: string
  location?:     string
  vendor?:       string
  quantity:      number
  unit?:         string
  reorderLevel?: number
  unitCost?:     number | string
  totalCost?:    number | string
  serialNumber?: string
  purchaseDate?: string
  warrantyEnd?:  string
  nextServiceAt?: string
  usageHours:    number
  notes?:        string
  createdAt:     string
}

interface InventoryFilter {
  type?:         InventoryType
  status?:       InventoryStatus
  departmentId?: string
  search?:       string
  pageSize?:     number
}

export function useInventory(filter: InventoryFilter = {}) {
  const params = new URLSearchParams({ pageSize: String(filter.pageSize ?? 200) })
  if (filter.type)         params.set('type',         filter.type)
  if (filter.status)       params.set('status',       filter.status)
  if (filter.departmentId) params.set('departmentId', filter.departmentId)
  if (filter.search)       params.set('search',       filter.search)

  const { data, loading, error, refetch } = useFetch<PaginatedResult<InventoryItem>>(
    () => api.get(`/inventory?${params}`),
    [filter.type, filter.status, filter.departmentId, filter.search],
  )

  return {
    items:   (data?.data ?? []) as InventoryItem[],
    total:   data?.meta?.total ?? 0,
    loading,
    error,
    refetch,
  }
}

export async function createInventoryItem(body: Partial<InventoryItem> & { type: InventoryType; name: string }): Promise<InventoryItem> {
  return api.post<InventoryItem>('/inventory', body)
}

export async function updateInventoryItem(id: string, body: Partial<InventoryItem>): Promise<InventoryItem> {
  return api.patch<InventoryItem>(`/inventory/${id}`, body)
}

export async function deleteInventoryItem(id: string): Promise<void> {
  await api.delete(`/inventory/${id}`)
}

export interface EfficiencySummary {
  totalCapex:        number
  totalOpex:         number
  totalSpend:        number
  completedTasks:    number
  totalTasks:        number
  costPerTask:       number
  avgUtilization:    number
  activeAssets:      number
  totalAssets:       number
  consumablesCount:  number
  criticalStockCount: number
  healthRate:        number
}

export function useEfficiencySummary() {
  const { data, loading, error, refetch } = useFetch<EfficiencySummary>(
    () => api.get('/inventory/efficiency'),
  )
  return { summary: data, loading, error, refetch }
}

// ── Users ─────────────────────────────────────────────────────────────────────
interface UserFilter {
  departmentId?: string
  role?: string
  active?: string
  search?: string
}

export function useUsers(filter: UserFilter = {}) {
  const params = new URLSearchParams({ pageSize: '100' })
  if (filter.departmentId && filter.departmentId !== 'tumu') params.set('departmentId', filter.departmentId)
  if (filter.role         && filter.role !== 'tumu')         params.set('role',         filter.role.toUpperCase())
  if (filter.active === 'aktif')  params.set('active', 'true')
  if (filter.active === 'pasif')  params.set('active', 'false')
  if (filter.search)              params.set('search', filter.search)

  const { data, loading, error, refetch } = useFetch<PaginatedResult<any>>(
    () => api.get(`/users?${params}`),
    [filter.departmentId, filter.role, filter.active, filter.search],
  )

  return {
    users:   (data?.data ?? []).map(mapUser) as User[],
    total:   data?.meta?.total ?? 0,
    loading,
    error,
    refetch,
  }
}

export async function createUser(body: {
  name: string; email: string; password: string
  role: string; departmentId: string; phone?: string
}): Promise<User> {
  const result = await api.post<any>('/users', {
    name:          body.name,
    email:         body.email,
    password:      body.password,
    role:          body.role.toUpperCase(),
    departmentIds: body.departmentId ? [body.departmentId] : [],
    phone:         body.phone || undefined,
  })
  return mapUser(result)
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/users/${id}`)
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.patch('/auth/me/password', { currentPassword, newPassword })
}

// ── Notifications ─────────────────────────────────────────────────────────────
export function useNotifications() {
  const { data, loading, error, refetch } = useFetch<PaginatedResult<any>>(
    () => api.get('/notifications?pageSize=20'),
  )

  return {
    notifications: (data?.data ?? []).map(mapNotification) as Notification[],
    unreadCount:   (data?.meta as any)?.unreadCount ?? (data?.data ?? []).filter((n: any) => !n.readAt).length,
    loading,
    error,
    refetch,
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`/notifications/${id}/read`)
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.patch('/notifications/read-all')
}

// ── Gemini Insights ───────────────────────────────────────────────────────────
export type InsightAnalysisType =
  | 'GENEL_OZET'
  | 'VERIMLILIK_ANALIZI'
  | 'RISK_DEGERLENDIRMESI'
  | 'GOREV_ONCELIKLENDIRME'
  | 'DEPARTMAN_PERFORMANSI'
  | 'ANORMALLIK_TESPITI'

export function useGeminiInsights(type?: InsightAnalysisType) {
  const params = new URLSearchParams({ pageSize: '20' })
  if (type) params.set('type', type)

  const { data, loading, error, refetch } = useFetch<PaginatedResult<any>>(
    () => api.get(`/gemini?${params}`),
    [type],
  )

  return {
    insights: (data?.data ?? []).map(mapGeminiInsight) as GeminiInsight[],
    total:    data?.meta?.total ?? 0,
    loading,
    error,
    refetch,
  }
}

export async function generateInsight(
  type: InsightAnalysisType,
  departmentId?: string,
): Promise<GeminiInsight> {
  const result = await api.post<any>('/gemini', { type, departmentId })
  return mapGeminiInsight(result)
}

// ── Natural language → visualization config ──────────────────────────────────
export interface VisualizationResponse {
  title:        string
  description?: string
  chartType:    'bar' | 'pie' | 'line' | 'kpi' | 'table'
  dataSource:   'tasks' | 'reports' | 'departments'
  filters: {
    status?:       string
    priority?:     string
    type?:         string
    departmentId?: string
    datePreset?:   'today' | '7d' | '30d' | 'month' | 'all'
  }
  groupBy?: 'status' | 'priority' | 'type' | 'departmentId' | 'createdDay' | 'dueDay' | 'overdue'
  metric:   'count'
  sortBy?:  'value_desc' | 'value_asc' | 'name_asc'
  limit?:   number
}

export async function generateVisualization(prompt: string): Promise<VisualizationResponse> {
  return api.post<VisualizationResponse>('/gemini/visualize', { prompt })
}

// ── Print / Export logging ────────────────────────────────────────────────────
export interface PrintLogOptions {
  /** Human-readable page name, e.g. "Görevler" */
  page?: string
  /** Backend entity name, e.g. "Task" */
  entity?: string
  /** Specific record ID if printing a single record */
  entityId?: string
}

/**
 * Logs the print action to the audit log then calls window.print().
 * Returns true if the log request succeeded (print still happens either way).
 */
export async function logAndPrint(options: PrintLogOptions = {}): Promise<void> {
  try {
    await api.post('/audit-logs/print', {
      page:     options.page     ?? document.title,
      entity:   options.entity   ?? 'Page',
      entityId: options.entityId,
    })
  } catch {
    // Log failure should not block printing
  }
  window.print()
}

/**
 * React hook: returns a print handler bound to the current page.
 * Usage: const { handlePrint } = usePrintLog({ page: 'Görevler' })
 */
export function usePrintLog(options: PrintLogOptions = {}) {
  const handlePrint = () => logAndPrint(options)
  return { handlePrint }
}

// ── Task Groups ───────────────────────────────────────────────────────────────
export function useTaskGroups() {
  const { data, loading, error, refetch } = useFetch<any[]>(
    () => api.get('/task-groups'),
    [],
  )
  return {
    groups:  (data ?? []).map(mapTaskGroup) as TaskGroup[],
    loading,
    error,
    refetch,
  }
}

export async function createTaskGroup(body: { name: string; color: string; description?: string }): Promise<TaskGroup> {
  return mapTaskGroup(await api.post<any>('/task-groups', body))
}

export async function updateTaskGroup(id: string, body: { name?: string; color?: string; description?: string | null }): Promise<TaskGroup> {
  return mapTaskGroup(await api.patch<any>(`/task-groups/${id}`, body))
}

export async function deleteTaskGroup(id: string): Promise<void> {
  await api.delete(`/task-groups/${id}`)
}

export async function addTasksToGroup(groupId: string, taskIds: string[]): Promise<TaskGroup> {
  return mapTaskGroup(await api.post<any>(`/task-groups/${groupId}/tasks`, { taskIds }))
}

export async function removeTaskFromGroup(groupId: string, taskId: string): Promise<TaskGroup> {
  return mapTaskGroup(await api.delete<any>(`/task-groups/${groupId}/tasks/${taskId}`))
}
