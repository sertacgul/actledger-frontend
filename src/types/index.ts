export type UserRole =
  | 'super_admin'
  | 'platform_admin'
  | 'genel_mudur'
  | 'gm_yardimcisi'
  | 'direktor'
  | 'mudur'
  | 'supervizor'
  | 'muhendis'
  | 'teknisyen'
  | 'isci'

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  platform_admin: 'Platform Admin',
  genel_mudur: 'Genel Mudur',
  gm_yardimcisi: 'Genel Mudur Yardimcisi',
  direktor: 'Direktor',
  mudur: 'Mudur',
  supervizor: 'Supervizon',
  muhendis: 'Muhendis',
  teknisyen: 'Teknisyen',
  isci: 'Isci',
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 10,
  platform_admin: 9,
  genel_mudur: 8,
  gm_yardimcisi: 7,
  direktor: 6,
  mudur: 5,
  supervizor: 4,
  muhendis: 3,
  teknisyen: 2,
  isci: 1,
}

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  departmentId: string
  avatar?: string
  phone?: string
  active: boolean
  createdAt: string
  isOnline?: boolean
  lastSyncAt?: string | null
  isMobileUser?: boolean
  mobileAppVersion?: string | null
  title?: string
  subUnit?: string
  jobTitle?: string
  departments?: { id: string; name: string; code: string; color: string }[]
}

export interface Department {
  id: string
  name: string
  code: string
  managerId: string
  parentId?: string
  color: string
  employeeCount: number
  activeTaskCount: number
  completionRate: number
}

export type TaskStatus = 'beklemede' | 'devam_ediyor' | 'tamamlandi' | 'iptal' | 'gecikti'
export type TaskPriority = 'dusuk' | 'normal' | 'yuksek' | 'kritik'
export type TaskType = 'standart' | 'ozel' | 'acil' | 'periyodik'

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  beklemede: 'Beklemede',
  devam_ediyor: 'Devam Ediyor',
  tamamlandi: 'Tamamlandı',
  iptal: 'İptal',
  gecikti: 'Gecikti',
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  dusuk: 'Düşük',
  normal: 'Normal',
  yuksek: 'Yüksek',
  kritik: 'Kritik',
}

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  standart: 'Standart',
  ozel: 'Özel',
  acil: 'Acil',
  periyodik: 'Periyodik',
}

export interface TaskGroup {
  id: string
  name: string
  color: string
  description?: string
  taskCount: number
  createdAt: string
}

// ── Custom Attributes (rule-based derived labels for tasks) ──────────────────
export type AttributeField =
  | 'status'
  | 'priority'
  | 'type'
  | 'departmentId'
  | 'assigneeId'
  | 'overdue'        // boolean - true if dueDate < now and not tamamlandi
  | 'ageDays'        // number - days since createdAt
  | 'dueInDays'      // number - days until dueDate
  | 'tagContains'    // string - checks if any tag contains the value

export type AttributeOperator = 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte'

export interface AttributeCondition {
  id: string
  field: AttributeField
  operator: AttributeOperator
  value: string   // serialized; converted to number/bool when needed
}

export interface AttributeRule {
  id: string
  conditions: AttributeCondition[]   // joined with AND
  outputLabel: string
  outputColor: string
}

export interface CustomAttribute {
  id: string
  name: string
  description?: string
  rules: AttributeRule[]              // first-match wins, evaluated top-to-bottom
  defaultLabel: string                // when no rule matches
  defaultColor: string
  createdAt: string
}

export interface ChecklistItem {
  id: string
  text: string
  completed: boolean
  completedBy?: string
  completedAt?: string
  note?: string
}

export interface Task {
  id: string
  title: string
  description: string
  departmentId: string
  assigneeId: string
  createdBy: string
  status: TaskStatus
  priority: TaskPriority
  type: TaskType
  checklist: ChecklistItem[]
  dueDate: string
  createdAt: string
  updatedAt: string
  tags: string[]
  latitude?: number | null
  longitude?: number | null
  groups?: { id: string; name: string; color: string }[]
  department?: { id: string; name: string; code: string; color: string }
  assignee?: { id: string; name: string; role?: string; avatarUrl?: string }
}

export type ReportStatus = 'taslak' | 'gonderildi' | 'onaylandi' | 'reddedildi'

export interface ReportPhoto {
  id: string
  url: string
  caption: string
}

export interface ReportVideo {
  id: string
  url: string
  caption: string
  durationSec: number
}

/** Max 5 photos and 1 video (max 20 seconds) per field report */
export const FIELD_REPORT_LIMITS = {
  maxPhotos: 5,
  maxVideos: 1,
  maxVideoDurationSec: 20,
} as const

export interface FieldReportAIAnalysis {
  ozet:                string
  anahtarBulgular:     string[]
  olasiNedenler:       string[]
  onerilenAksiyonlar:  string[]
  aciliyetSeviyesi:    'dusuk' | 'orta' | 'yuksek' | 'kritik'
  fotografAnalizi?:    string[]
  videoAnalizi?:       string[]
}

export interface FieldReport {
  id: string
  taskId: string
  reporterId: string
  authorName?: string
  departmentId: string
  title: string
  content: string
  status: ReportStatus
  completedItems: number
  totalItems: number
  issues: string[]
  photos: ReportPhoto[]
  videos?: ReportVideo[]
  createdAt: string
  syncedAt?: string
  offlineCreated: boolean
  aiAnalysis?: FieldReportAIAnalysis | null
  aiAnalyzedAt?: string | null
}

export interface ProductionData {
  date: string
  hedef: number
  gerceklesen: number
  departmentId: string
}

export interface GeminiInsight {
  id: string
  title: string
  content: string
  type: 'oneri' | 'uyari' | 'bilgi' | 'risk'
  departmentId?: string
  createdAt: string
  priority: 'dusuk' | 'orta' | 'yuksek'
}

export interface Notification {
  id: string
  title: string
  message: string
  type: 'gorev' | 'rapor' | 'sistem' | 'yapay_zeka'
  read: boolean
  createdAt: string
  link?: string
}
