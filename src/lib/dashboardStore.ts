import { useState, useEffect, useCallback } from 'react'

// ── Widget registry ───────────────────────────────────────────────────────────
export interface WidgetMeta {
  id: string
  label: string
  description: string
  /** Grid column span at xl breakpoint: full=3, wide=2, narrow=1 */
  span: 'full' | 'wide' | 'narrow'
  /** Which filter options are meaningful for this widget */
  filterOptions: Array<'status' | 'priority' | 'departmentId' | 'date'>
}

export const WIDGET_REGISTRY: WidgetMeta[] = [
  { id: 'kpi_cards',        label: 'KPI Kartları',          description: 'Toplam / tamamlanan / devam eden / gecikmiş',  span: 'full',   filterOptions: ['departmentId', 'date'] },
  { id: 'production_chart', label: 'Departman Performansı',  description: 'Departman bazlı görev tamamlanma oranı',    span: 'wide',   filterOptions: ['departmentId'] },
  { id: 'task_pie',         label: 'Görev Dağılımı',        description: 'Duruma göre dağılım (donut)',                  span: 'narrow', filterOptions: ['departmentId', 'priority'] },
  { id: 'dept_performance', label: 'Departman Performansı', description: 'Bar grafik + tablo',                           span: 'wide',   filterOptions: ['departmentId'] },
  { id: 'activity_feed',    label: 'Son Aktiviteler',       description: 'Saha raporları aktivite akışı',                span: 'narrow', filterOptions: ['departmentId', 'date'] },
  { id: 'dept_grid',        label: 'Departman Kartları',    description: 'Her departman için kart görünümü',             span: 'full',   filterOptions: ['departmentId'] },
  { id: 'task_map',         label: 'Görev Haritası',        description: 'Konumlu görevler harita üzerinde',             span: 'full',   filterOptions: ['status', 'priority', 'departmentId'] },
  { id: 'attribute_chart',  label: 'Özelliğe Göre Dağılım', description: 'Özel özellik kurallarına göre görev dağılımı', span: 'wide',   filterOptions: ['departmentId'] },
  { id: 'efficiency',       label: 'Verimlilik & Maliyet',  description: 'Demirbaş, sarf ve görev başı maliyet özeti',   span: 'wide',   filterOptions: [] },
  { id: 'operiq',           label: 'OperIQ Analizleri',     description: 'Yapay zeka destekli içgörüler',                span: 'full',   filterOptions: [] },
]

export const DEFAULT_DASHBOARD_ID = 'default'

const DEFAULT_WIDGETS: string[] = [
  'kpi_cards', 'task_pie',
  'dept_performance', 'activity_feed', 'task_map', 'operiq',
]

// ── Widget filter ─────────────────────────────────────────────────────────────
export interface WidgetFilter {
  departmentId?: string
  status?:       string
  priority?:     string
  datePreset?:   'today' | '7d' | '30d' | 'month'
}

// ── Natural-language widget config ────────────────────────────────────────────
export interface NLWidgetConfig {
  id:           string
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
  /** User prompt that produced this widget - for re-edit / display */
  sourcePrompt?: string
  createdAt:    string
}

const LS_NL_WIDGETS = 'actledger_nl_widgets'

function loadNLWidgets(): Record<string, NLWidgetConfig> {
  try {
    const raw = localStorage.getItem(LS_NL_WIDGETS)
    if (raw) return JSON.parse(raw) as Record<string, NLWidgetConfig>
  } catch { /* ignore */ }
  return {}
}

function saveNLWidgets(map: Record<string, NLWidgetConfig>) {
  localStorage.setItem(LS_NL_WIDGETS, JSON.stringify(map))
}

export function getNLWidget(id: string): NLWidgetConfig | undefined {
  return loadNLWidgets()[id]
}

export function listNLWidgets(): NLWidgetConfig[] {
  return Object.values(loadNLWidgets())
}

export function saveNLWidget(config: NLWidgetConfig): void {
  const map = loadNLWidgets()
  map[config.id] = config
  saveNLWidgets(map)
}

export function deleteNLWidget(id: string): void {
  const map = loadNLWidgets()
  delete map[id]
  saveNLWidgets(map)
}

export function newNLWidgetId(): string {
  return `nl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

export function isNLWidgetId(id: string): boolean {
  return id.startsWith('nl_')
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface DashboardConfig {
  id: string
  name: string
  widgets: string[]
  /** Per-widget filter overrides: widgetId → WidgetFilter */
  widgetFilters: Record<string, WidgetFilter>
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const LS_DASHBOARDS = 'actledger_dashboards'
const LS_ACTIVE     = 'actledger_active_dashboard'

function load(): DashboardConfig[] {
  try {
    const raw = localStorage.getItem(LS_DASHBOARDS)
    if (raw) {
      const parsed = JSON.parse(raw) as DashboardConfig[]
      // migrate old configs that lack widgetFilters + rename old dashboard names
      return parsed.map(d => ({
        ...d,
        name: d.name === 'AI Görselleştirmeler' ? 'Dashboard Kişiselleştirme' : d.name,
        widgetFilters: d.widgetFilters ?? {},
      }))
    }
  } catch { /* ignore */ }
  return [{ id: DEFAULT_DASHBOARD_ID, name: 'Ana Ekran', widgets: DEFAULT_WIDGETS, widgetFilters: {} }]
}

function save(dashboards: DashboardConfig[]) {
  localStorage.setItem(LS_DASHBOARDS, JSON.stringify(dashboards))
}

function uid() {
  return `db_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export function resolveWidgetDateFilter(preset?: WidgetFilter['datePreset']): { dateFrom?: string; dateTo?: string } {
  if (!preset) return {}
  const now = new Date()
  const end = new Date(now); end.setHours(23, 59, 59, 999)
  switch (preset) {
    case 'today': {
      const s = new Date(now); s.setHours(0, 0, 0, 0)
      return { dateFrom: s.toISOString(), dateTo: end.toISOString() }
    }
    case '7d': {
      const s = new Date(now); s.setDate(now.getDate() - 7); s.setHours(0, 0, 0, 0)
      return { dateFrom: s.toISOString(), dateTo: end.toISOString() }
    }
    case '30d': {
      const s = new Date(now); s.setDate(now.getDate() - 30); s.setHours(0, 0, 0, 0)
      return { dateFrom: s.toISOString(), dateTo: end.toISOString() }
    }
    case 'month': {
      const s = new Date(now.getFullYear(), now.getMonth(), 1)
      return { dateFrom: s.toISOString(), dateTo: end.toISOString() }
    }
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useDashboardStore() {
  const [dashboards, setDashboards] = useState<DashboardConfig[]>(load)
  const [activeId, setActiveIdState] = useState<string>(
    () => localStorage.getItem(LS_ACTIVE) ?? DEFAULT_DASHBOARD_ID
  )

  useEffect(() => { save(dashboards) }, [dashboards])
  useEffect(() => { localStorage.setItem(LS_ACTIVE, activeId) }, [activeId])

  const setActiveId = useCallback((id: string) => setActiveIdState(id), [])

  const activeDashboard = dashboards.find(d => d.id === activeId) ?? dashboards[0]

  const createDashboard = useCallback((name: string, widgets: string[]) => {
    const newDb: DashboardConfig = { id: uid(), name, widgets, widgetFilters: {} }
    setDashboards(prev => [...prev, newDb])
    setActiveIdState(newDb.id)
    return newDb
  }, [])

  const updateDashboard = useCallback((id: string, patch: Partial<Omit<DashboardConfig, 'id'>>) => {
    setDashboards(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d))
  }, [])

  const setWidgetFilter = useCallback((dashboardId: string, widgetId: string, filter: WidgetFilter | null) => {
    setDashboards(prev => prev.map(d => {
      if (d.id !== dashboardId) return d
      const next = { ...d.widgetFilters }
      if (filter === null) {
        delete next[widgetId]
      } else {
        next[widgetId] = filter
      }
      return { ...d, widgetFilters: next }
    }))
  }, [])

  const deleteDashboard = useCallback((id: string) => {
    if (id === DEFAULT_DASHBOARD_ID) return
    setDashboards(prev => prev.filter(d => d.id !== id))
    setActiveIdState(DEFAULT_DASHBOARD_ID)
  }, [])

  return {
    dashboards,
    activeDashboard,
    activeId,
    setActiveId,
    createDashboard,
    updateDashboard,
    deleteDashboard,
    setWidgetFilter,
  }
}
