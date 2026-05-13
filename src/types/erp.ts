// src/types/erp.ts

// ── Shared ──────────────────────────────────────────────────────────────────

/** Convert plain date (2026-05-12) to ISO datetime for backend z.string().datetime() */
export const toISO = (d: string) => d ? new Date(d + 'T00:00:00.000Z').toISOString() : ''
export const toISOEnd = (d: string) => d ? new Date(d + 'T23:59:59.999Z').toISOString() : ''

export const TRY_FMT = (n: number | string | undefined | null) => {
  if (n === undefined || n === null) return '-'
  const v = typeof n === 'string' ? Number(n) : n
  if (Number.isNaN(v)) return '-'
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(v)
}

export const NUM_FMT = (n: number | string | undefined | null) => {
  if (n === undefined || n === null) return '-'
  const v = typeof n === 'string' ? Number(n) : n
  if (Number.isNaN(v)) return '-'
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(v)
}

export const DATE_FMT = (d: string | undefined | null) => {
  if (!d) return '-'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return '-'
  return dt.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** For Excel export - DD.MM.YYYY */
export const DATE_CELL = (d: string | undefined | null) => {
  if (!d) return ''
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return ''
  return dt.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export const DATETIME_FMT = (d: string | undefined | null) => {
  if (!d) return '-'
  return new Date(d).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
}

// ── Sales Types ─────────────────────────────────────────────────────────────

export type CustomerType = 'PERAKENDE' | 'TOPTAN' | 'KURUMSAL' | 'TEDARIKCI' | 'HER_IKISI'

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  PERAKENDE: 'Perakende',
  TOPTAN: 'Toptan',
  KURUMSAL: 'Kurumsal',
  TEDARIKCI: 'Tedarikci',
  HER_IKISI: 'Musteri & Tedarikci',
}

export interface SalesCustomer {
  id: string
  companyId: string
  name: string
  taxNumber: string | null
  phone: string | null
  email: string | null
  address: string | null
  customerType: CustomerType
  creditLimit: number | string | null
  paymentTermDays: number
  isEInvoiceCustomer: boolean
  balance: number | string
  notes: string | null
  active: boolean
  createdAt: string
  updatedAt: string
  orders?: { id: string; orderNumber: string; status: OrderStatus; totalAmount: number | string; createdAt: string }[]
}

export type OrderStatus = 'TASLAK' | 'ONAYLANDI' | 'HAZIRLANIYOR' | 'TAMAMLANDI' | 'IPTAL'

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  TASLAK: 'Taslak',
  ONAYLANDI: 'Onaylandi',
  HAZIRLANIYOR: 'Hazirlaniyor',
  TAMAMLANDI: 'Tamamlandi',
  IPTAL: 'Iptal',
}

export const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  TASLAK: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  ONAYLANDI: 'bg-blue-50 text-blue-700 border-blue-200',
  HAZIRLANIYOR: 'bg-amber-50 text-amber-700 border-amber-200',
  TAMAMLANDI: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  IPTAL: 'bg-red-50 text-red-700 border-red-200',
}

export type PaymentMethod = 'NAKIT' | 'KREDI_KARTI' | 'CEK' | 'HAVALE'

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  NAKIT: 'Nakit',
  KREDI_KARTI: 'Kredi Karti',
  CEK: 'Cek',
  HAVALE: 'Havale/EFT',
}

export interface SalesOrderItem {
  id: string
  orderId: string
  stockItemId: string | null
  productName: string
  unit: string
  quantity: number
  unitPrice: number | string
  discountPercent: number | string
  lineTotal: number | string
  createdAt: string
}

export interface SalesPayment {
  id: string
  companyId: string
  orderId: string
  amount: number | string
  method: PaymentMethod
  reference: string | null
  notes: string | null
  paidAt: string
  createdAt: string
}

export interface SalesOrder {
  id: string
  companyId: string
  customerId: string
  orderNumber: string
  status: OrderStatus
  subtotal: number | string
  discountAmount: number | string
  taxAmount: number | string
  totalAmount: number | string
  notes: string | null
  salesRepId: string | null
  branchId: string | null
  tillSessionId: string | null
  completedAt: string | null
  cancelledAt: string | null
  createdAt: string
  updatedAt: string
  customer?: { id: string; name: string; taxNumber?: string; customerType: CustomerType }
  salesRep?: { id: string; name: string }
  items: SalesOrderItem[]
  payments: SalesPayment[]
}

export type TillStatus = 'ACIK' | 'KAPALI'

export interface SalesBranch {
  id: string
  companyId: string
  name: string
  code: string
  address: string | null
  phone: string | null
  managerId: string | null
  active: boolean
  createdAt: string
  updatedAt: string
  manager?: { id: string; name: string }
  _count?: { tills: number; orders: number }
}

export interface TillSession {
  id: string
  tillId: string
  openedById: string
  openingBalance: number | string
  openedAt: string
  closedById: string | null
  closedAt: string | null
  closingBalance: number | string | null
  expectedBalance: number | string | null
  difference: number | string | null
  notes: string | null
  totalSales: number | string
  totalTransactions: number
  openedBy?: { id: string; name: string }
  closedBy?: { id: string; name: string }
}

export interface SalesTill {
  id: string
  branchId: string
  companyId: string
  name: string
  status: TillStatus
  currentSessionId: string | null
  active: boolean
  createdAt: string
  updatedAt: string
  currentSession?: {
    id: string
    openedAt: string
    totalSales: number | string
    totalTransactions: number
    openedBy?: { id: string; name: string }
  }
}

export interface POSProduct {
  id: string
  code: string
  name: string
  unit: string
  quantity: number
  unitCost: number | string
}

export interface POSCartItem {
  product: POSProduct
  qty: number
  unitPrice: number
}

export interface POSReceiptData {
  orderNumber: string
  branchName: string
  tillName: string
  cashierName: string
  items: { name: string; qty: number; price: number; total: number }[]
  subtotal: number
  total: number
  paymentMethod: PaymentMethod
  paymentAmount: number
  change: number
  date: string
}

// ── Accounting Types ────────────────────────────────────────────────────────

export type AccountType = 'VARLIK' | 'YUKUMLULUK' | 'OZKAYNAK' | 'GELIR' | 'GIDER'

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  VARLIK: 'Varlik',
  YUKUMLULUK: 'Yukumluluk',
  OZKAYNAK: 'Ozkaynak',
  GELIR: 'Gelir',
  GIDER: 'Gider',
}

export const ACCOUNT_TYPE_STYLES: Record<AccountType, string> = {
  VARLIK: 'bg-blue-50 text-blue-700 border-blue-200',
  YUKUMLULUK: 'bg-red-50 text-red-700 border-red-200',
  OZKAYNAK: 'bg-purple-50 text-purple-700 border-purple-200',
  GELIR: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  GIDER: 'bg-amber-50 text-amber-700 border-amber-200',
}

export interface AccountingAccount {
  id: string
  companyId: string
  code: string
  name: string
  accountType: AccountType
  parentCode: string | null
  isLeaf: boolean
  active: boolean
  createdAt: string
  updatedAt: string
  totalDebit?: number
  totalCredit?: number
  balance?: number
}

export type JournalStatus = 'TASLAK' | 'ONAYLANDI' | 'IPTAL'

export const JOURNAL_STATUS_LABELS: Record<JournalStatus, string> = {
  TASLAK: 'Taslak',
  ONAYLANDI: 'Onaylandi',
  IPTAL: 'Iptal',
}

export const JOURNAL_STATUS_STYLES: Record<JournalStatus, string> = {
  TASLAK: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  ONAYLANDI: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  IPTAL: 'bg-red-50 text-red-700 border-red-200',
}

export interface JournalLine {
  id: string
  entryId: string
  accountId: string
  accountCode: string
  debit: number | string
  credit: number | string
  description: string | null
  createdAt: string
  account?: { code: string; name: string; accountType: AccountType }
}

export interface JournalEntry {
  id: string
  companyId: string
  entryNumber: string
  date: string
  description: string
  status: JournalStatus
  sourceType: string | null
  sourceId: string | null
  totalDebit: number | string
  totalCredit: number | string
  approvedAt: string | null
  cancelledAt: string | null
  createdAt: string
  updatedAt: string
  lines: JournalLine[]
  createdBy?: { id: string; name: string }
  approvedBy?: { id: string; name: string }
}

export type EInvoiceDirection = 'GIDEN' | 'GELEN'
export type EInvoiceType = 'SATIS' | 'IADE' | 'ISTISNA' | 'TEVKIFAT'
export type EInvoiceStatus = 'TASLAK' | 'ONAY_BEKLIYOR' | 'ONAYLANDI' | 'GONDERILDI' | 'TESLIM_EDILDI' | 'REDDEDILDI' | 'IPTAL'

export const EINVOICE_STATUS_LABELS: Record<EInvoiceStatus, string> = {
  TASLAK: 'Taslak',
  ONAY_BEKLIYOR: 'Onay Bekliyor',
  ONAYLANDI: 'Onaylandi',
  GONDERILDI: 'Gonderildi',
  TESLIM_EDILDI: 'Teslim Edildi',
  REDDEDILDI: 'Reddedildi',
  IPTAL: 'Iptal',
}

export const EINVOICE_STATUS_STYLES: Record<EInvoiceStatus, string> = {
  TASLAK: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  ONAY_BEKLIYOR: 'bg-amber-50 text-amber-700 border-amber-200',
  ONAYLANDI: 'bg-blue-50 text-blue-700 border-blue-200',
  GONDERILDI: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  TESLIM_EDILDI: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REDDEDILDI: 'bg-red-50 text-red-700 border-red-200',
  IPTAL: 'bg-red-50 text-red-500 border-red-200',
}

export const EINVOICE_TYPE_LABELS: Record<EInvoiceType, string> = {
  SATIS: 'Satis',
  IADE: 'Iade',
  ISTISNA: 'Istisna',
  TEVKIFAT: 'Tevkifat',
}

export interface EInvoiceLine {
  id: string
  invoiceId: string
  lineNumber: number
  productName: string
  unit: string
  quantity: number
  unitPrice: number | string
  taxRate: number
  taxAmount: number | string
  lineTotal: number | string
}

export interface EInvoice {
  id: string
  companyId: string
  invoiceNumber: string
  direction: EInvoiceDirection
  type: EInvoiceType
  status: EInvoiceStatus
  orderId: string | null
  customerId: string | null
  senderTaxNumber: string
  senderName: string
  receiverTaxNumber: string
  receiverName: string
  issueDate: string
  dueDate: string | null
  subtotal: number | string
  taxAmount: number | string
  totalAmount: number | string
  currency: string
  notes: string | null
  xmlContent: string | null
  sentAt: string | null
  deliveredAt: string | null
  cancelledAt: string | null
  createdAt: string
  updatedAt: string
  lines: EInvoiceLine[]
  customer?: { id: string; name: string; taxNumber: string }
  order?: { id: string; orderNumber: string }
  createdBy?: { id: string; name: string }
}

export interface EInvoiceConfig {
  companyId: string
  integratorType: string
  integratorApiUrl: string | null
  integratorApiKey: string | null
  integratorApiSecret: string | null
  senderAlias: string | null
  testMode: boolean
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface TrialBalanceRow {
  accountCode: string
  accountName: string
  accountType: AccountType
  totalDebit: number
  totalCredit: number
  balance: number
}

// ── HR Types ────────────────────────────────────────────────────────────────

export type EmploymentStatus = 'AKTIF' | 'IZINLI' | 'ASKIDA' | 'AYRILDI'

export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, string> = {
  AKTIF: 'Aktif',
  IZINLI: 'Izinli',
  ASKIDA: 'Askida',
  AYRILDI: 'Ayrildi',
}

export const EMPLOYMENT_STATUS_STYLES: Record<EmploymentStatus, string> = {
  AKTIF: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  IZINLI: 'bg-amber-50 text-amber-700 border-amber-200',
  ASKIDA: 'bg-zinc-100 text-zinc-500 border-zinc-200',
  AYRILDI: 'bg-red-50 text-red-700 border-red-200',
}

export interface HREmployee {
  id: string
  companyId: string
  userId: string
  employeeNumber: string
  employmentStatus: EmploymentStatus
  startDate: string
  endDate: string | null
  grossSalary: number | string
  nationalId: string | null
  sgkNumber: string | null
  bankName: string | null
  iban: string | null
  emergencyContact: string | null
  emergencyPhone: string | null
  bloodType: string | null
  militaryStatus: string | null
  educationLevel: string | null
  maritalStatus: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string
    email: string
    role: string
    departments?: { id: string; name: string }[]
  }
  documents?: HRDocument[]
  leaveBalances?: LeaveBalance[]
}

export type DocumentType = 'KIMLIK' | 'DIPLOMA' | 'SERTIFIKA' | 'SAGLIK' | 'DIGER'

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  KIMLIK: 'Kimlik',
  DIPLOMA: 'Diploma',
  SERTIFIKA: 'Sertifika',
  SAGLIK: 'Saglik',
  DIGER: 'Diger',
}

export interface HRDocument {
  id: string
  employeeId: string
  name: string
  documentType: DocumentType
  fileUrl: string | null
  expiresAt: string | null
  notes: string | null
  createdAt: string
}

export type LeaveType = 'YILLIK' | 'HASTALIK' | 'DOGUM' | 'OLUM' | 'EVLILIK' | 'UCRETSIZ' | 'DIGER'

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  YILLIK: 'Yillik Izin',
  HASTALIK: 'Hastalik',
  DOGUM: 'Dogum',
  OLUM: 'Vefat',
  EVLILIK: 'Evlilik',
  UCRETSIZ: 'Ucretsiz',
  DIGER: 'Diger',
}

export type LeaveStatus = 'BEKLIYOR' | 'ONAYLANDI' | 'REDDEDILDI' | 'IPTAL'

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  BEKLIYOR: 'Bekliyor',
  ONAYLANDI: 'Onaylandi',
  REDDEDILDI: 'Reddedildi',
  IPTAL: 'Iptal',
}

export const LEAVE_STATUS_STYLES: Record<LeaveStatus, string> = {
  BEKLIYOR: 'bg-amber-50 text-amber-700 border-amber-200',
  ONAYLANDI: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REDDEDILDI: 'bg-red-50 text-red-700 border-red-200',
  IPTAL: 'bg-zinc-100 text-zinc-500 border-zinc-200',
}

export interface LeaveBalance {
  id: string
  employeeId: string
  year: number
  leaveType: LeaveType
  entitlement: number
  used: number
  remaining: number
}

export interface HRLeave {
  id: string
  companyId: string
  employeeId: string
  leaveType: LeaveType
  status: LeaveStatus
  startDate: string
  endDate: string
  days: number
  reason: string | null
  approvedById: string | null
  approvedAt: string | null
  rejectedReason: string | null
  createdAt: string
  updatedAt: string
  employee?: {
    id: string
    employeeNumber: string
    user: { id: string; name: string; email: string }
  }
  approvedBy?: { id: string; name: string }
}

export type PayrollStatus = 'TASLAK' | 'HESAPLANDI' | 'ONAYLANDI' | 'ODENDI'

export const PAYROLL_STATUS_LABELS: Record<PayrollStatus, string> = {
  TASLAK: 'Taslak',
  HESAPLANDI: 'Hesaplandi',
  ONAYLANDI: 'Onaylandi',
  ODENDI: 'Odendi',
}

export const PAYROLL_STATUS_STYLES: Record<PayrollStatus, string> = {
  TASLAK: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  HESAPLANDI: 'bg-blue-50 text-blue-700 border-blue-200',
  ONAYLANDI: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ODENDI: 'bg-indigo-50 text-indigo-700 border-indigo-200',
}

export interface PayrollPeriod {
  id: string
  companyId: string
  year: number
  month: number
  status: PayrollStatus
  totalGross: number | string | null
  totalNet: number | string | null
  totalSgk: number | string | null
  totalTax: number | string | null
  processedAt: string | null
  approvedById: string | null
  approvedAt: string | null
  createdAt: string
  updatedAt: string
  _count?: { records: number }
}

export interface PayrollRecord {
  id: string
  periodId: string
  employeeId: string
  grossSalary: number | string
  sgkEmployee: number | string
  sgkEmployer: number | string
  incomeTax: number | string
  stampTax: number | string
  totalDeductions: number | string
  netSalary: number | string
  createdAt: string
  updatedAt: string
  employee?: {
    id: string
    employeeNumber: string
    grossSalary: number | string
    user: { id: string; name: string; email: string }
  }
}

export const MONTH_LABELS: Record<number, string> = {
  1: 'Ocak', 2: 'Subat', 3: 'Mart', 4: 'Nisan',
  5: 'Mayis', 6: 'Haziran', 7: 'Temmuz', 8: 'Agustos',
  9: 'Eylul', 10: 'Ekim', 11: 'Kasim', 12: 'Aralik',
}
