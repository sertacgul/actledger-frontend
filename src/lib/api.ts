// ── API Base URL ──────────────────────────────────────────────────────────────
export const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3001/api/v1'

// Socket / asset base (without /api/v1)
export const SERVER_BASE = API_BASE.replace(/\/api\/v1$/, '')

// ── Token store (in-memory; refresh token lives in httpOnly cookie) ───────────
let _token: string | null = null

export const tokenStore = {
  get: () => _token,
  set: (t: string | null) => { _token = t },
}

// ── Error class ───────────────────────────────────────────────────────────────
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// ── Token refresh ─────────────────────────────────────────────────────────────
async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    if (!res.ok) return false
    const body = await res.json()
    tokenStore.set(body.data.accessToken)
    return true
  } catch {
    return false
  }
}

// ── Core request ──────────────────────────────────────────────────────────────
async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers as Record<string, string>),
  }

  if (_token) headers['Authorization'] = `Bearer ${_token}`

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  }).catch(() => null)

  if (!res) {
    throw new ApiError(0, 'Istek gonderilemedi. Lutfen tekrar deneyin.')
  }

  // Auto-refresh on 401
  if (res.status === 401 && retry && path !== '/auth/login') {
    const ok = await tryRefresh()
    if (ok) return request<T>(path, options, false)
    tokenStore.set(null)
    throw new ApiError(401, 'Oturum süresi doldu - lütfen tekrar giriş yapın')
  }

  if (res.status === 204) return undefined as T

  const body = await res.json().catch(() => ({}))

  if (!res.ok) {
    const statusMessages: Record<number, string> = {
      400: body.message || 'Gecersiz istek - lutfen alanlari kontrol edin',
      403: 'Bu islem icin yetkiniz bulunmuyor veya limit asildi',
      404: 'Aranan kayit bulunamadi',
      409: 'Bu kayit zaten mevcut',
      422: 'Girilen veriler uygun degil - lutfen kontrol edin',
      429: 'Cok fazla istek gonderildi - lutfen bekleyin',
      500: 'Beklenmeyen bir hata olustu - lutfen tekrar deneyin',
    }
    const fallback = statusMessages[res.status] ?? 'Islem gerceklestirilemedi'
    // Include field-level errors from Zod validation
    let detail = body.message ?? fallback
    if (body.fields) {
      const fieldErrors = Object.entries(body.fields).map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`).join('; ')
      if (fieldErrors) detail += ` (${fieldErrors})`
    }
    throw new ApiError(res.status, detail, body.code)
  }

  // Paginated response → return { data, meta }
  if (body.meta) return { data: body.data, meta: body.meta } as T

  return body.data as T
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────
export const api = {
  get:    <T>(path: string)                   => request<T>(path, { method: 'GET' }),
  post:   <T>(path: string, body?: unknown)   => request<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  patch:  <T>(path: string, body?: unknown)   => request<T>(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: <T>(path: string)                   => request<T>(path, { method: 'DELETE' }),
}

// ── Enum mappers (backend uppercase → frontend lowercase) ─────────────────────
const lower = (s: string) => s.toLowerCase()

// ── Type helpers ──────────────────────────────────────────────────────────────
export interface PaginatedResult<T> {
  data: T[]
  meta: { page: number; pageSize: number; total: number; totalPages: number }
}

// ── Backend → Frontend mappers ────────────────────────────────────────────────
import type { User, Department, Task, ChecklistItem, FieldReport, Notification } from '../types'

export function mapUser(u: any): User {
  return {
    id:           u.id,
    name:         u.name,
    email:        u.email,
    role:         lower(u.role) as User['role'],
    departmentId: u.departments?.[0]?.id ?? u.departmentId ?? '',
    phone:        u.phone ?? undefined,
    avatar:       u.avatarUrl ?? undefined,
    active:       u.active,
    createdAt:    u.createdAt,
    isOnline:     u.isOnline ?? false,
    lastSyncAt:   u.lastSyncAt ?? null,
    isMobileUser: u.isMobileUser ?? false,
    mobileAppVersion: u.mobileAppVersion ?? null,
    title:        u.title ?? undefined,
    subUnit:      u.subUnit ?? undefined,
    jobTitle:     u.jobTitle ?? undefined,
    departments:  u.departments ?? undefined,
  }
}

export function mapDepartment(d: any): Department {
  return {
    id:              d.id,
    name:            d.name,
    code:            d.code,
    managerId:       d.managerId ?? d.manager?.id ?? '',
    parentId:        d.parentId ?? undefined,
    color:           d.color,
    employeeCount:   d.employeeCount   ?? d._count?.members   ?? 0,
    activeTaskCount: d.activeTaskCount ?? d._count?.tasks     ?? 0,
    completionRate:  d.completionRate  ?? 0,
  }
}

export function mapChecklist(c: any): ChecklistItem {
  return {
    id:          c.id,
    text:        c.text,
    completed:   c.completed,
    completedBy: c.completedById ?? undefined,
    completedAt: c.completedAt   ?? undefined,
    note:        c.note          ?? undefined,
  }
}

export function mapTask(t: any): Task {
  return {
    id:           t.id,
    title:        t.title,
    description:  t.description  ?? '',
    departmentId: t.departmentId ?? t.department?.id ?? '',
    assigneeId:   t.assigneeId   ?? t.assignee?.id  ?? '',
    createdBy:    t.createdById  ?? t.createdBy?.id ?? '',
    status:       lower(t.status)   as Task['status'],
    priority:     lower(t.priority) as Task['priority'],
    type:         (lower(t.type) in { standart:1, ozel:1, acil:1, periyodik:1 }
                    ? lower(t.type)
                    : 'standart') as Task['type'],
    checklist:    (t.checklist ?? []).map(mapChecklist),
    dueDate:      t.dueDate,
    createdAt:    t.createdAt,
    updatedAt:    t.updatedAt,
    tags:         t.tags ?? [],
    latitude:     t.latitude  ?? null,
    longitude:    t.longitude ?? null,
    groups:       (t.groups ?? []).map((g: any) => ({ id: g.id, name: g.name, color: g.color })),
  }
}

export function mapTaskGroup(g: any): import('../types').TaskGroup {
  return {
    id:          g.id,
    name:        g.name,
    color:       g.color,
    description: g.description ?? undefined,
    taskCount:   g._count?.tasks ?? 0,
    createdAt:   g.createdAt,
  }
}

export function mapReport(r: any): FieldReport {
  return {
    id:             r.id,
    taskId:         r.taskId        ?? '',
    reporterId:     r.authorId      ?? r.author?.id ?? '',
    authorName:     r.author?.name  ?? undefined,
    departmentId:   r.departmentId  ?? r.department?.id ?? '',
    title:          r.title,
    content:        r.description   ?? '',
    status:         mapReportStatus(r.status),
    completedItems: 0,
    totalItems:     0,
    issues:         [],
    photos:         (r.photos ?? []).map((p: any) => ({
      id:      p.id,
      url:     p.url?.startsWith('http') ? p.url : `${SERVER_BASE}${p.url}`,
      caption: p.caption ?? '',
    })),
    createdAt:      r.createdAt,
    syncedAt:       r.updatedAt,
    offlineCreated: false,
    aiAnalysis:     r.aiAnalysis    ?? null,
    aiAnalyzedAt:   r.aiAnalyzedAt  ?? null,
  }
}

function mapReportStatus(s: string): FieldReport['status'] {
  const m: Record<string, FieldReport['status']> = {
    BEKLEMEDE:   'taslak',
    INCELENIYOR: 'gonderildi',
    ONAYLANDI:   'onaylandi',
    REDDEDILDI:  'reddedildi',
  }
  return m[s] ?? 'taslak'
}

export function mapNotification(n: any): Notification {
  return {
    id:        n.id,
    title:     n.title,
    message:   n.message,
    type:      lower(n.type) as Notification['type'],
    read:      !!n.readAt,
    createdAt: n.createdAt,
    link:      n.link ?? undefined,
  }
}

// ── Gemini Insight mapper ─────────────────────────────────────────────────────
import type { GeminiInsight } from '../types'

const INSIGHT_TYPE_MAP: Record<string, GeminiInsight['type']> = {
  GENEL_OZET:             'bilgi',
  VERIMLILIK_ANALIZI:     'oneri',
  RISK_DEGERLENDIRMESI:   'risk',
  GOREV_ONCELIKLENDIRME:  'oneri',
  DEPARTMAN_PERFORMANSI:  'bilgi',
  ANORMALLIK_TESPITI:     'uyari',
  INVENTORY_INTELLIGENCE: 'oneri',
  STOCK_ANALYSIS:         'oneri',
}

const INSIGHT_PRIORITY_MAP: Record<string, GeminiInsight['priority']> = {
  GENEL_OZET:             'orta',
  VERIMLILIK_ANALIZI:     'orta',
  RISK_DEGERLENDIRMESI:   'yuksek',
  GOREV_ONCELIKLENDIRME:  'orta',
  DEPARTMAN_PERFORMANSI:  'dusuk',
  ANORMALLIK_TESPITI:     'yuksek',
}

function formatInsightContent(data: any): string {
  if (!data || typeof data !== 'object') return String(data ?? '-')
  if (data.raw) return data.raw

  // Handle INVENTORY_INTELLIGENCE / STOCK_ANALYSIS format
  if (data.summary) {
    const parts: string[] = [data.summary]
    if (Array.isArray(data.insights)) {
      for (const ins of data.insights) {
        const severity = ins.severity ? `[${ins.severity}]` : ''
        parts.push(`${severity} ${ins.title || ''}\n${ins.message || ''}\n${ins.recommendation ? '> ' + ins.recommendation : ''}`)
      }
    }
    return parts.join('\n\n')
  }

  const parts: string[] = []
  if (data.ozet) parts.push(data.ozet)

  const listFields: Record<string, string> = {
    bulgular:          'Bulgular',
    oncelikler:        'Öncelikler',
    darbogazlar:       'Darboğazlar',
    onerier:           'Öneriler',
    kritikRiskler:     'Kritik Riskler',
    ortaRiskler:       'Orta Riskler',
    onlemler:          'Önlemler',
    acilGorevler:      'Acil Görevler',
    tavsiyeler:        'Tavsiyeler',
    enIyiDepartmanlar: 'En İyi Departmanlar',
    destekGereken:     'Destek Gereken',
    dengeleme:         'Dengeleme Önerileri',
    anormallikler:     'Anormallikler',
    olasiNedenler:     'Olası Nedenler',
    izlenmesiGereken:  'İzlenmesi Gereken',
  }

  for (const [key, label] of Object.entries(listFields)) {
    const val = data[key]
    if (Array.isArray(val) && val.length > 0) {
      parts.push(`**${label}:** ${val.join(' · ')}`)
    }
  }

  return parts.join('\n\n') || JSON.stringify(data)
}

export function mapGeminiInsight(g: any): GeminiInsight {
  const contentData = typeof g.content === 'string' ? JSON.parse(g.content) : g.content
  return {
    id:           g.id,
    title:        contentData?.baslik ?? (g.type === 'INVENTORY_INTELLIGENCE' ? 'AssetIQ Envanter Analizi' : g.type === 'STOCK_ANALYSIS' ? 'Stok Analizi' : g.type),
    content:      formatInsightContent(contentData),
    type:         INSIGHT_TYPE_MAP[g.type] ?? 'bilgi',
    departmentId: g.departmentId ?? undefined,
    createdAt:    g.createdAt,
    priority:     INSIGHT_PRIORITY_MAP[g.type] ?? 'dusuk',
  }
}
