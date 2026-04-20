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
export type InventoryType   = 'DEMIRBAS' | 'TUKETIM' | 'YEDEK_PARCA'
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

// ── Stock Management ─────────────────────────────────────────────────────────
export type StockCategory = 'DEMIRBAS' | 'SARF' | 'YEDEK_PARCA'
export type StockMovementType = 'GIRIS' | 'CIKIS' | 'TRANSFER' | 'FIRE'
export type StockAlertStatus = 'AKTIF' | 'OKUNDU' | 'COZULDU'

export interface StockItem {
  id:            string
  companyId:     string
  name:          string
  code?:         string | null
  category:      StockCategory
  departmentId?: string | null
  department?:   { id: string; name: string; code: string; color: string } | null
  unit:          string
  locationName?: string | null
  facilityId?:   string | null
  quantity:      number
  minLevel:      number
  maxLevel?:     number | null
  criticalLevel: number
  supplyLeadDays?: number | null
  vendor?:       string | null
  unitCost?:     number | string | null
  description?:  string | null
  notes?:        string | null
  barcode?:      string | null
  createdById:   string
  createdAt:     string
  updatedAt:     string
}

export interface StockMovement {
  id:           string
  stockItemId:  string
  type:         StockMovementType
  quantity:     number
  previousQty:  number
  newQty:       number
  taskId?:      string | null
  userId:       string
  fromLocation?: string | null
  toLocation?:  string | null
  description?: string | null
  createdAt:    string
}

export interface StockAlert {
  id:           string
  stockItemId:  string
  type:         string
  status:       StockAlertStatus
  message:      string
  severity:     string
  metadata?:    any
  resolvedAt?:  string | null
  createdAt:    string
}

export interface StockDashboardSummary {
  totalItems:       number
  totalQuantity:    number
  totalValue:       number
  byCategory:       Record<string, number>
  belowMin:         number
  critical:         number
  overstock:        number
  outOfStock:       number
  activeAlerts:     number
  recentMovements:  number
}

interface StockFilter {
  category?:     StockCategory
  departmentId?: string
  search?:       string
  belowMin?:     boolean
  critical?:     boolean
  pageSize?:     number
}

export function useStockItems(filter: StockFilter = {}) {
  const params = new URLSearchParams({ pageSize: String(filter.pageSize ?? 100) })
  if (filter.category)     params.set('category',     filter.category)
  if (filter.departmentId) params.set('departmentId', filter.departmentId)
  if (filter.search)       params.set('search',       filter.search)
  if (filter.belowMin)     params.set('belowMin',     'true')
  if (filter.critical)     params.set('critical',     'true')

  const { data, loading, error, refetch } = useFetch<PaginatedResult<StockItem>>(
    () => api.get(`/stock-management?${params}`),
    [filter.category, filter.departmentId, filter.search, filter.belowMin, filter.critical],
  )

  return {
    items:   (data?.data ?? []) as StockItem[],
    total:   data?.meta?.total ?? 0,
    loading,
    error,
    refetch,
  }
}

export function useStockDashboard() {
  return useFetch<StockDashboardSummary>(
    () => api.get('/stock-management/dashboard/summary'),
  )
}

export interface StockTrendsData {
  dailyTrend:     { date: string; total: number }[]
  topConsumed:    { name: string; total: number; unit: string; category: string }[]
  byCategory:     Record<string, number>
  totalMovements: number
}

export interface StockLocationDist {
  locationName:  string
  itemCount:     number
  totalQuantity: number
  totalValue:    number
  categories:    Record<string, number>
}

export interface StockHeatmapCell {
  location:    string
  category:    string
  consumption: number
}

export function useStockTrends(days: number = 30) {
  return useFetch<StockTrendsData>(
    () => api.get(`/stock-management/dashboard/trends?days=${days}`),
    [days],
  )
}

export function useStockDistribution() {
  return useFetch<StockLocationDist[]>(
    () => api.get('/stock-management/dashboard/distribution'),
  )
}

export function useStockHeatmap(days: number = 30) {
  return useFetch<StockHeatmapCell[]>(
    () => api.get(`/stock-management/dashboard/heatmap?days=${days}`),
    [days],
  )
}

export async function createStockItem(body: Record<string, unknown>): Promise<StockItem> {
  return api.post<StockItem>('/stock-management', body)
}

export async function updateStockItem(id: string, body: Record<string, unknown>): Promise<StockItem> {
  return api.patch<StockItem>(`/stock-management/${id}`, body)
}

export async function deleteStockItem(id: string): Promise<void> {
  await api.delete(`/stock-management/${id}`)
}

export async function createStockMovement(itemId: string, body: Record<string, unknown>): Promise<StockMovement> {
  return api.post<StockMovement>(`/stock-management/${itemId}/movements`, body)
}

export async function fetchStockMovements(itemId: string): Promise<PaginatedResult<StockMovement>> {
  return api.get(`/stock-management/${itemId}/movements?pageSize=50`)
}

export async function fetchAllStockMovements(): Promise<PaginatedResult<any>> {
  return api.get('/stock-management/movements?pageSize=200')
}

export async function fetchStockAlerts(): Promise<PaginatedResult<StockAlert>> {
  return api.get('/stock-management/alerts?pageSize=50')
}

export async function updateStockAlertStatus(id: string, status: StockAlertStatus): Promise<void> {
  await api.patch(`/stock-management/alerts/${id}`, { status })
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

// ── Automation Engine ─────────────────────────────────────────────────────────

export function useAutomationRules(filter: Record<string, any> = {}) {
  const qs = new URLSearchParams(filter as any).toString()
  return useFetch<PaginatedResult<any>>(() => api.get(`/automations?${qs}`), [qs])
}

export function useAutomationStats() {
  return useFetch<any>(() => api.get('/automations/stats'), [])
}

export function useAutomationLogs(filter: Record<string, any> = {}) {
  const qs = new URLSearchParams(filter as any).toString()
  return useFetch<PaginatedResult<any>>(() => api.get(`/automations/logs?${qs}`), [qs])
}

export async function createAutomationRule(body: any) {
  return api.post<any>('/automations', body)
}

export async function updateAutomationRule(id: string, body: any) {
  return api.patch<any>(`/automations/${id}`, body)
}

export async function toggleAutomationRule(id: string, active: boolean) {
  return api.patch<any>(`/automations/${id}/toggle`, { active })
}

export async function deleteAutomationRule(id: string) {
  return api.delete(`/automations/${id}`)
}

// ── Workflow Builder ──────────────────────────────────────────────────────────

export function useWorkflows(filter: Record<string, any> = {}) {
  const qs = new URLSearchParams(filter as any).toString()
  return useFetch<PaginatedResult<any>>(() => api.get(`/workflows?${qs}`), [qs])
}

export function useWorkflow(id: string) {
  return useFetch<any>(() => id ? api.get(`/workflows/${id}`) : Promise.resolve(null), [id])
}

export function useWorkflowStats() {
  return useFetch<any>(() => api.get('/workflows/stats'), [])
}

export function useWorkflowInstances(filter: Record<string, any> = {}) {
  const qs = new URLSearchParams(filter as any).toString()
  return useFetch<PaginatedResult<any>>(() => api.get(`/workflows/instances?${qs}`), [qs])
}

export function useWorkflowTemplates() {
  return useFetch<any>(() => api.get('/workflows/templates'), [])
}

export async function createWorkflow(body: any) {
  return api.post<any>('/workflows', body)
}

export async function updateWorkflow(id: string, body: any) {
  return api.patch<any>(`/workflows/${id}`, body)
}

export async function updateWorkflowStatus(id: string, status: string) {
  return api.patch<any>(`/workflows/${id}/status`, { status })
}

export async function deleteWorkflow(id: string) {
  return api.delete(`/workflows/${id}`)
}

export async function addWorkflowStep(workflowId: string, body: any) {
  return api.post<any>(`/workflows/${workflowId}/steps`, body)
}

export async function updateWorkflowStep(workflowId: string, stepId: string, body: any) {
  return api.patch<any>(`/workflows/${workflowId}/steps/${stepId}`, body)
}

export async function deleteWorkflowStep(workflowId: string, stepId: string) {
  return api.delete(`/workflows/${workflowId}/steps/${stepId}`)
}

export async function startWorkflowInstance(workflowId: string) {
  return api.post<any>(`/workflows/${workflowId}/start`, {})
}

export async function cancelWorkflowInstance(instanceId: string) {
  return api.patch<any>(`/workflows/instances/${instanceId}/cancel`, {})
}

export async function cloneWorkflowTemplate(templateId: string) {
  return api.post<any>(`/workflows/templates/${templateId}/clone`, {})
}

// ── Inventory Intelligence ───────────────────────────────────────────────────

const II = '/inventory-intelligence'

// QR Entity
export interface QrEntity {
  id: string; code: string; entityType: string; entityId?: string | null
  label?: string | null; description?: string | null; metadata?: any
  active: boolean; createdAt: string
}

export interface QrScanResult {
  qrEntity: QrEntity; entityType: string; entityContext: string
  entityData: any; sectorTemplate: any; availableActions: string[]
}

export function useQrEntities(filter: { entityType?: string; search?: string } = {}) {
  const params = new URLSearchParams({ pageSize: '100' })
  if (filter.entityType) params.set('entityType', filter.entityType)
  if (filter.search) params.set('search', filter.search)
  const { data, loading, error, refetch } = useFetch<PaginatedResult<QrEntity>>(
    () => api.get(`${II}/qr?${params}`), [filter.entityType, filter.search],
  )
  return { items: (data?.data ?? []) as QrEntity[], total: data?.meta?.total ?? 0, loading, error, refetch }
}

export async function createQrEntity(body: Record<string, unknown>) { return api.post<QrEntity>(`${II}/qr`, body) }
export async function deleteQrEntity(id: string) { await api.delete(`${II}/qr/${id}`) }
export async function autoGenerateQr() { return api.post<{ created: number; total: number; alreadyExisted: number }>(`${II}/qr/auto-generate`, {}) }
export async function scanQrCode(body: { code: string; action?: string; latitude?: number; longitude?: number }) {
  return api.post<QrScanResult>(`${II}/qr/scan`, body)
}

// Inventory Location
export interface InventoryLocation {
  id: string; name: string; code?: string | null; category: string
  departmentId?: string | null; department?: { id: string; name: string; code: string } | null
  parentId?: string | null; parent?: { id: string; name: string } | null
  description?: string | null; active: boolean; _count?: { stockItems: number; children: number }
}

export function useInventoryLocations(filter: { category?: string; search?: string; parentId?: string } = {}) {
  const params = new URLSearchParams({ pageSize: '100' })
  if (filter.category) params.set('category', filter.category)
  if (filter.search) params.set('search', filter.search)
  if (filter.parentId) params.set('parentId', filter.parentId)
  const { data, loading, error, refetch } = useFetch<PaginatedResult<InventoryLocation>>(
    () => api.get(`${II}/locations?${params}`), [filter.category, filter.search, filter.parentId],
  )
  return { items: (data?.data ?? []) as InventoryLocation[], total: data?.meta?.total ?? 0, loading, error, refetch }
}

export function useLocationTree() {
  return useFetch<any[]>(() => api.get(`${II}/locations/tree`))
}

export async function createInventoryLocation(body: Record<string, unknown>) { return api.post(`${II}/locations`, body) }
export async function updateInventoryLocation(id: string, body: Record<string, unknown>) { return api.patch(`${II}/locations/${id}`, body) }
export async function deleteInventoryLocation(id: string) { await api.delete(`${II}/locations/${id}`) }

// Inventory Batch
export interface InventoryBatch {
  id: string; stockItemId: string; batchNumber: string; status: string
  quantity: number; unit?: string | null; productionDate?: string | null
  expiryDate?: string | null; supplier?: string | null; locationId?: string | null
  stockItem?: { id: string; name: string; code?: string | null; unit: string } | null
  location?: { id: string; name: string } | null
  createdAt: string
}

export function useInventoryBatches(filter: { stockItemId?: string; status?: string; expiringSoon?: boolean } = {}) {
  const params = new URLSearchParams({ pageSize: '100' })
  if (filter.stockItemId) params.set('stockItemId', filter.stockItemId)
  if (filter.status) params.set('status', filter.status)
  if (filter.expiringSoon) params.set('expiringSoon', 'true')
  const { data, loading, error, refetch } = useFetch<PaginatedResult<InventoryBatch>>(
    () => api.get(`${II}/batches?${params}`), [filter.stockItemId, filter.status, filter.expiringSoon],
  )
  return { items: (data?.data ?? []) as InventoryBatch[], total: data?.meta?.total ?? 0, loading, error, refetch }
}

export async function createInventoryBatch(body: Record<string, unknown>) { return api.post(`${II}/batches`, body) }
export async function updateInventoryBatch(id: string, body: Record<string, unknown>) { return api.patch(`${II}/batches/${id}`, body) }

// Inventory Transaction
export interface InventoryTransaction {
  id: string; stockItemId: string; type: string; quantity: number
  previousQty: number; newQty: number; batchId?: string | null
  taskId?: string | null; userId: string; description?: string | null
  sectorLabel?: string | null; createdAt: string
  stockItem?: { id: string; name: string; code?: string | null; unit: string } | null
  batch?: { id: string; batchNumber: string } | null
  fromLocation?: { id: string; name: string } | null
  toLocation?: { id: string; name: string } | null
}

export function useInventoryTransactions(filter: { stockItemId?: string; type?: string; taskId?: string } = {}) {
  const params = new URLSearchParams({ pageSize: '100' })
  if (filter.stockItemId) params.set('stockItemId', filter.stockItemId)
  if (filter.type) params.set('type', filter.type)
  if (filter.taskId) params.set('taskId', filter.taskId)
  const { data, loading, error, refetch } = useFetch<PaginatedResult<InventoryTransaction>>(
    () => api.get(`${II}/transactions?${params}`), [filter.stockItemId, filter.type, filter.taskId],
  )
  return { items: (data?.data ?? []) as InventoryTransaction[], total: data?.meta?.total ?? 0, loading, error, refetch }
}

export async function createInventoryTransaction(body: Record<string, unknown>) { return api.post(`${II}/transactions`, body) }
export async function quickConsume(body: Record<string, unknown>) { return api.post(`${II}/quick-consume`, body) }
export async function taskConsume(taskId: string, items: { stockItemId: string; quantity: number; batchId?: string }[]) {
  return api.post(`${II}/task-consume/${taskId}`, { items })
}

// Reservations
export interface InventoryReservation {
  id: string; stockItemId: string; status: string; quantity: number
  taskId?: string | null; description?: string | null
  reservedAt: string; expiresAt?: string | null
  stockItem?: { id: string; name: string; quantity: number; unit: string } | null
}

export function useInventoryReservations(filter: { stockItemId?: string; taskId?: string; status?: string } = {}) {
  const params = new URLSearchParams({ pageSize: '100' })
  if (filter.stockItemId) params.set('stockItemId', filter.stockItemId)
  if (filter.taskId) params.set('taskId', filter.taskId)
  if (filter.status) params.set('status', filter.status)
  const { data, loading, error, refetch } = useFetch<PaginatedResult<InventoryReservation>>(
    () => api.get(`${II}/reservations?${params}`), [filter.stockItemId, filter.taskId, filter.status],
  )
  return { items: (data?.data ?? []) as InventoryReservation[], total: data?.meta?.total ?? 0, loading, error, refetch }
}

export async function createReservation(body: Record<string, unknown>) { return api.post(`${II}/reservations`, body) }
export async function cancelReservation(id: string) { return api.patch(`${II}/reservations/${id}/cancel`, {}) }

// IoT Responsible
export interface IoTDeviceResponsible {
  id: string; deviceId: string; userId: string; roleType: string
  notifyOnAlert: boolean; notifyOnCritical: boolean; notifyOnOffline: boolean; notifyRoutine: boolean
  user?: { id: string; name: string; email: string } | null
  device?: { id: string; name: string; deviceId: string; status: string } | null
}

export function useDeviceResponsibles(deviceId: string) {
  return useFetch<IoTDeviceResponsible[]>(() => api.get(`${II}/iot-responsibles/device/${deviceId}`), [deviceId])
}

export function useUserDevices(userId: string) {
  return useFetch<IoTDeviceResponsible[]>(() => api.get(`${II}/iot-responsibles/user/${userId}`), [userId])
}

export async function assignIoTResponsible(body: Record<string, unknown>) { return api.post(`${II}/iot-responsibles`, body) }
export async function updateIoTResponsible(id: string, body: Record<string, unknown>) { return api.patch(`${II}/iot-responsibles/${id}`, body) }
export async function removeIoTResponsible(id: string) { await api.delete(`${II}/iot-responsibles/${id}`) }

// Purchase Responsible
export interface PurchaseResponsible {
  id: string; userId: string; roleType: string; departmentIds: string[]; categories: string[]
  active: boolean; user?: { id: string; name: string; email: string; role: string; title?: string | null } | null
}

export function usePurchaseResponsibles() {
  return useFetch<PurchaseResponsible[]>(() => api.get(`${II}/purchase-responsibles`))
}

export async function createPurchaseResponsible(body: Record<string, unknown>) { return api.post(`${II}/purchase-responsibles`, body) }
export async function updatePurchaseResponsible(id: string, body: Record<string, unknown>) { return api.patch(`${II}/purchase-responsibles/${id}`, body) }
export async function deletePurchaseResponsible(id: string) { await api.delete(`${II}/purchase-responsibles/${id}`) }

// Analytics
export function useInventoryAnalytics(filter: { departmentId?: string; days?: number } = {}) {
  const params = new URLSearchParams()
  if (filter.departmentId) params.set('departmentId', filter.departmentId)
  if (filter.days) params.set('days', String(filter.days))
  return useFetch<any>(() => api.get(`${II}/analytics/dashboard?${params}`), [filter.departmentId, filter.days])
}

export function useInventoryTurnover(days: number = 30) {
  return useFetch<any[]>(() => api.get(`${II}/analytics/turnover?days=${days}`), [days])
}

export function useInventoryHeatmap(type: string = 'consumption', days: number = 30) {
  return useFetch<any[]>(() => api.get(`${II}/analytics/heatmap?type=${type}&days=${days}`), [type, days])
}

export function useTaskConsumptionReport(days: number = 30) {
  return useFetch<any[]>(() => api.get(`${II}/analytics/task-consumption?days=${days}`), [days])
}

// OperIQ Intelligence
export function useInventoryIntelligence() {
  return useFetch<any>(() => api.get(`${II}/operiq/insights`))
}

export async function analyzeInventoryIntelligence() {
  return api.post<any>(`${II}/operiq/analyze`, {})
}

// Sector Templates
export function useSectorTemplates() {
  return useFetch<any[]>(() => api.get(`${II}/sectors`))
}

export function useCurrentSectorTemplate() {
  return useFetch<any>(() => api.get(`${II}/sectors/current`))
}
