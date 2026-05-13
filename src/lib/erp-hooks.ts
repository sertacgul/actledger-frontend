// src/lib/erp-hooks.ts
import { useState, useEffect, useCallback, useRef } from 'react'
import { api, type PaginatedResult } from './api'
import type {
  SalesCustomer, SalesOrder, SalesPayment, SalesBranch, SalesTill, TillSession, POSProduct,
  AccountingAccount, JournalEntry, EInvoice, EInvoiceConfig, TrialBalanceRow,
  HREmployee, HRLeave, LeaveBalance, PayrollPeriod, PayrollRecord,
} from '../types/erp'

// ── Generic fetch (same pattern as hooks.ts) ────────────────────────────────
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

// ═══════════════════════════════════════════════════════════════════════════
// SALES HOOKS
// ═══════════════════════════════════════════════════════════════════════════

// ── Customers ───────────────────────────────────────────────────────────────
interface CustomerFilter { search?: string; customerType?: string; active?: boolean }

export function useCustomers(filter: CustomerFilter = {}) {
  const params = new URLSearchParams({ pageSize: '100' })
  if (filter.search) params.set('search', filter.search)
  if (filter.customerType) params.set('customerType', filter.customerType)
  if (filter.active !== undefined) params.set('active', String(filter.active))

  const { data, loading, error, refetch } = useFetch<any>(
    () => api.get(`/sales/customers?${params}`),
    [filter.search, filter.customerType, filter.active],
  )
  return { customers: (data?.data ?? data ?? []) as SalesCustomer[], total: data?.total ?? 0, loading, error, refetch }
}

export function useCustomer(id: string) {
  const { data, loading, error, refetch } = useFetch<SalesCustomer>(
    () => api.get(`/sales/customers/${id}`),
    [id],
  )
  return { customer: data, loading, error, refetch }
}

export async function createCustomer(body: Partial<SalesCustomer> & { name: string }): Promise<SalesCustomer> {
  return api.post<SalesCustomer>('/sales/customers', body)
}

export async function updateCustomer(id: string, body: Partial<SalesCustomer>): Promise<SalesCustomer> {
  return api.patch<SalesCustomer>(`/sales/customers/${id}`, body)
}

export async function deleteCustomer(id: string): Promise<void> {
  await api.delete(`/sales/customers/${id}`)
}

// ── Orders ──────────────────────────────────────────────────────────────────
interface OrderFilter { status?: string; customerId?: string; search?: string }

export function useOrders(filter: OrderFilter = {}) {
  const params = new URLSearchParams({ pageSize: '100' })
  if (filter.status) params.set('status', filter.status)
  if (filter.customerId) params.set('customerId', filter.customerId)
  if (filter.search) params.set('search', filter.search)

  const { data, loading, error, refetch } = useFetch<any>(
    () => api.get(`/sales/orders?${params}`),
    [filter.status, filter.customerId, filter.search],
  )
  return { orders: (data?.data ?? data ?? []) as SalesOrder[], total: data?.total ?? 0, loading, error, refetch }
}

export async function createOrder(body: {
  customerId: string
  notes?: string
  branchId?: string
  items: { stockItemId?: string; productName: string; unit: string; quantity: number; unitPrice: number; discountPercent?: number }[]
}): Promise<SalesOrder> {
  return api.post<SalesOrder>('/sales/orders', body)
}

export async function updateOrder(id: string, body: Partial<SalesOrder>): Promise<SalesOrder> {
  return api.patch<SalesOrder>(`/sales/orders/${id}`, body)
}

export async function approveOrder(id: string): Promise<SalesOrder> {
  return api.post<SalesOrder>(`/sales/orders/${id}/approve`)
}

export async function completeOrder(id: string): Promise<SalesOrder> {
  return api.post<SalesOrder>(`/sales/orders/${id}/complete`)
}

export async function cancelOrder(id: string): Promise<SalesOrder> {
  return api.post<SalesOrder>(`/sales/orders/${id}/cancel`)
}

// ── Payments ────────────────────────────────────────────────────────────────
export function useOrderPayments(orderId: string) {
  const { data, loading, error, refetch } = useFetch<SalesPayment[]>(
    () => api.get(`/sales/payments/order/${orderId}`),
    [orderId],
  )
  return { payments: data ?? [], loading, error, refetch }
}

export async function createPayment(body: {
  orderId: string; amount: number; method: string; reference?: string; notes?: string
}): Promise<SalesPayment> {
  return api.post<SalesPayment>('/sales/payments', body)
}

// ── Branches ────────────────────────────────────────────────────────────────
export function useBranches() {
  const { data, loading, error, refetch } = useFetch<any>(
    () => api.get('/sales/branches?pageSize=100'),
    [],
  )
  return { branches: (data?.data ?? data ?? []) as SalesBranch[], total: data?.total ?? 0, loading, error, refetch }
}

export async function createBranch(body: { name: string; code: string; address?: string; phone?: string; managerId?: string }): Promise<SalesBranch> {
  return api.post<SalesBranch>('/sales/branches', body)
}

export async function updateBranch(id: string, body: Partial<SalesBranch>): Promise<SalesBranch> {
  return api.patch<SalesBranch>(`/sales/branches/${id}`, body)
}

export async function deleteBranch(id: string): Promise<void> {
  await api.delete(`/sales/branches/${id}`)
}

// ── Tills ────────────────────────────────────────────────────────────────────
export function useTills(branchId: string) {
  const { data, loading, error, refetch } = useFetch<SalesTill[]>(
    () => branchId ? api.get(`/sales/tills/branch/${branchId}`) : Promise.resolve([]),
    [branchId],
  )
  return { tills: data ?? [], loading, error, refetch }
}

export async function createTill(body: { branchId: string; name: string }): Promise<SalesTill> {
  return api.post<SalesTill>('/sales/tills', body)
}

export async function openTill(id: string, openingBalance: number): Promise<TillSession> {
  return api.post<TillSession>(`/sales/tills/${id}/open`, { openingBalance })
}

export async function closeTill(id: string, body: { closingBalance: number; notes?: string }): Promise<TillSession> {
  return api.post<TillSession>(`/sales/tills/${id}/close`, body)
}

export function useTillSession(tillId: string) {
  const { data, loading, error, refetch } = useFetch<any>(
    () => api.get(`/sales/tills/${tillId}/session`),
    [tillId],
  )
  return { session: data, loading, error, refetch }
}

// ── POS ─────────────────────────────────────────────────────────────────────
export function usePOSProducts(search?: string) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  const { data, loading, error, refetch } = useFetch<POSProduct[]>(
    () => api.get(`/sales/pos/products${params.toString() ? `?${params}` : ''}`),
    [search],
  )
  return { products: data ?? [], loading, error, refetch }
}

export async function posCheckout(body: {
  tillSessionId: string
  customerId?: string
  customerName?: string
  paymentMethod: string
  paymentAmount: number
  items: { stockItemId?: string; productName: string; quantity: number; unitPrice: number; discountPercent?: number }[]
}): Promise<{ order: SalesOrder; receiptData: any }> {
  return api.post('/sales/pos/checkout', body)
}

// ═══════════════════════════════════════════════════════════════════════════
// ACCOUNTING HOOKS
// ═══════════════════════════════════════════════════════════════════════════

// ── Accounts ────────────────────────────────────────────────────────────────
export function useAccounts() {
  const { data, loading, error, refetch } = useFetch<AccountingAccount[]>(
    () => api.get('/accounting/accounts'),
    [],
  )
  return { accounts: data ?? [], loading, error, refetch }
}

export async function createAccount(body: { code: string; name: string; accountType: string; parentCode?: string }): Promise<AccountingAccount> {
  return api.post<AccountingAccount>('/accounting/accounts', body)
}

export async function updateAccount(code: string, body: Partial<AccountingAccount>): Promise<AccountingAccount> {
  return api.patch<AccountingAccount>(`/accounting/accounts/${code}`, body)
}

export async function deleteAccount(code: string): Promise<void> {
  await api.delete(`/accounting/accounts/${code}`)
}

export async function seedDefaultAccounts(): Promise<any> {
  return api.post('/accounting/accounts/seed-defaults')
}

// ── Journal ─────────────────────────────────────────────────────────────────
interface JournalFilter { status?: string; dateFrom?: string; dateTo?: string; search?: string }

export function useJournalEntries(filter: JournalFilter = {}) {
  const params = new URLSearchParams({ pageSize: '100' })
  if (filter.status) params.set('status', filter.status)
  if (filter.dateFrom) params.set('dateFrom', filter.dateFrom)
  if (filter.dateTo) params.set('dateTo', filter.dateTo)
  if (filter.search) params.set('search', filter.search)

  const { data, loading, error, refetch } = useFetch<any>(
    () => api.get(`/accounting/journal?${params}`),
    [filter.status, filter.dateFrom, filter.dateTo, filter.search],
  )
  return { entries: (data?.data ?? data ?? []) as JournalEntry[], total: data?.total ?? 0, loading, error, refetch }
}

export async function createJournalEntry(body: {
  date: string; description: string
  lines: { accountCode: string; debit: number; credit: number; description?: string }[]
}): Promise<JournalEntry> {
  return api.post<JournalEntry>('/accounting/journal', body)
}

export async function approveJournalEntry(id: string): Promise<JournalEntry> {
  return api.post<JournalEntry>(`/accounting/journal/${id}/approve`)
}

export async function cancelJournalEntry(id: string): Promise<JournalEntry> {
  return api.post<JournalEntry>(`/accounting/journal/${id}/cancel`)
}

// ── Balance ─────────────────────────────────────────────────────────────────
export function useTrialBalance() {
  const { data, loading, error, refetch } = useFetch<{ rows: TrialBalanceRow[]; grandTotalDebit: number; grandTotalCredit: number }>(
    () => api.get('/accounting/balance/trial-balance'),
    [],
  )
  return { trialBalance: data, loading, error, refetch }
}

// ── E-Invoice ───────────────────────────────────────────────────────────────
interface EInvoiceFilter { status?: string; direction?: string; search?: string }

export function useEInvoices(filter: EInvoiceFilter = {}) {
  const params = new URLSearchParams({ pageSize: '100' })
  if (filter.status) params.set('status', filter.status)
  if (filter.direction) params.set('direction', filter.direction)
  if (filter.search) params.set('search', filter.search)

  const { data, loading, error, refetch } = useFetch<any>(
    () => api.get(`/accounting/einvoice?${params}`),
    [filter.status, filter.direction, filter.search],
  )
  return { invoices: (data?.data ?? data ?? []) as EInvoice[], total: data?.total ?? 0, loading, error, refetch }
}

export async function createEInvoice(body: {
  type: string; customerId: string; issueDate: string; currency?: string; notes?: string
  lines: { productName: string; unit: string; quantity: number; unitPrice: number; taxRate: number }[]
}): Promise<EInvoice> {
  return api.post<EInvoice>('/accounting/einvoice', body)
}

export async function createEInvoiceFromOrder(orderId: string): Promise<EInvoice> {
  return api.post<EInvoice>(`/accounting/einvoice/from-order/${orderId}`)
}

export async function approveEInvoice(id: string): Promise<EInvoice> {
  return api.post<EInvoice>(`/accounting/einvoice/${id}/approve`)
}

export async function sendEInvoice(id: string): Promise<EInvoice> {
  return api.post<EInvoice>(`/accounting/einvoice/${id}/send`)
}

export async function cancelEInvoice(id: string): Promise<EInvoice> {
  return api.post<EInvoice>(`/accounting/einvoice/${id}/cancel`)
}

export function useEInvoiceConfig() {
  const { data, loading, error, refetch } = useFetch<EInvoiceConfig>(
    () => api.get('/accounting/einvoice/config'),
    [],
  )
  return { config: data, loading, error, refetch }
}

export async function saveEInvoiceConfig(body: Partial<EInvoiceConfig>): Promise<EInvoiceConfig> {
  return api.post<EInvoiceConfig>('/accounting/einvoice/config', body)
}

// ── Reports ─────────────────────────────────────────────────────────────────
type ReportType = 'income-expense' | 'balance-sheet' | 'sales-summary' | 'einvoice-summary' | 'tax-summary' | 'cash-flow'

export function useAccountingReport(type: ReportType, dateFrom: string, dateTo: string) {
  // Backend expects ISO datetime (z.string().datetime()), not plain date
  const isoFrom = dateFrom ? new Date(dateFrom + 'T00:00:00.000Z').toISOString() : ''
  const isoTo = dateTo ? new Date(dateTo + 'T23:59:59.999Z').toISOString() : ''
  const params = new URLSearchParams()
  if (isoFrom) params.set('dateFrom', isoFrom)
  if (isoTo) params.set('dateTo', isoTo)
  const { data, loading, error, refetch } = useFetch<any>(
    () => api.get(`/accounting/reports/${type}?${params}`),
    [type, dateFrom, dateTo],
  )
  return { report: data, loading, error, refetch }
}

// ═══════════════════════════════════════════════════════════════════════════
// HR HOOKS
// ═══════════════════════════════════════════════════════════════════════════

// ── Employees ───────────────────────────────────────────────────────────────
interface EmployeeFilter { status?: string; search?: string }

export function useEmployees(filter: EmployeeFilter = {}) {
  const params = new URLSearchParams({ pageSize: '100' })
  if (filter.status) params.set('status', filter.status)
  if (filter.search) params.set('search', filter.search)

  const { data, loading, error, refetch } = useFetch<any>(
    () => api.get(`/hr/employees?${params}`),
    [filter.status, filter.search],
  )
  return { employees: (data?.data ?? data ?? []) as HREmployee[], total: data?.total ?? 0, loading, error, refetch }
}

export async function createEmployee(body: {
  userId: string; startDate: string; grossSalary: number
  nationalId?: string; sgkNumber?: string; bankName?: string; iban?: string
  emergencyContact?: string; emergencyPhone?: string
}): Promise<HREmployee> {
  return api.post<HREmployee>('/hr/employees', body)
}

export async function updateEmployee(id: string, body: Partial<HREmployee>): Promise<HREmployee> {
  return api.patch<HREmployee>(`/hr/employees/${id}`, body)
}

export async function terminateEmployee(id: string): Promise<HREmployee> {
  return api.post<HREmployee>(`/hr/employees/${id}/terminate`)
}

// ── Leaves ──────────────────────────────────────────────────────────────────
interface LeaveFilter { status?: string; employeeId?: string }

export function useLeaves(filter: LeaveFilter = {}) {
  const params = new URLSearchParams({ pageSize: '100' })
  if (filter.status) params.set('status', filter.status)
  if (filter.employeeId) params.set('employeeId', filter.employeeId)

  const { data, loading, error, refetch } = useFetch<any>(
    () => api.get(`/hr/leaves?${params}`),
    [filter.status, filter.employeeId],
  )
  return { leaves: (data?.data ?? data ?? []) as HRLeave[], total: data?.total ?? 0, loading, error, refetch }
}

export function useLeaveBalance(employeeId: string) {
  const { data, loading, error, refetch } = useFetch<LeaveBalance[]>(
    () => api.get(`/hr/leaves/balance/${employeeId}`),
    [employeeId],
  )
  return { balances: data ?? [], loading, error, refetch }
}

export async function requestLeave(body: {
  employeeId: string; leaveType: string; startDate: string; endDate: string; reason?: string
}): Promise<HRLeave> {
  return api.post<HRLeave>('/hr/leaves/request', body)
}

export async function approveLeave(id: string): Promise<HRLeave> {
  return api.post<HRLeave>(`/hr/leaves/${id}/approve`)
}

export async function rejectLeave(id: string, reason?: string): Promise<HRLeave> {
  return api.post<HRLeave>(`/hr/leaves/${id}/reject`, { reason })
}

export async function cancelLeave(id: string): Promise<HRLeave> {
  return api.post<HRLeave>(`/hr/leaves/${id}/cancel`)
}

export async function initLeaveBalances(): Promise<any> {
  return api.post('/hr/leaves/init-balances')
}

// ── Payroll ─────────────────────────────────────────────────────────────────
export function usePayrollPeriods() {
  const { data, loading, error, refetch } = useFetch<any>(
    () => api.get('/hr/payroll/periods?pageSize=100'),
    [],
  )
  return { periods: (data?.data ?? data ?? []) as PayrollPeriod[], total: data?.total ?? 0, loading, error, refetch }
}

export async function createPayrollPeriod(body: { year: number; month: number }): Promise<PayrollPeriod> {
  return api.post<PayrollPeriod>('/hr/payroll/periods', body)
}

export async function calculatePayroll(periodId: string): Promise<PayrollPeriod> {
  return api.post<PayrollPeriod>(`/hr/payroll/periods/${periodId}/calculate`)
}

export async function approvePayroll(periodId: string): Promise<PayrollPeriod> {
  return api.post<PayrollPeriod>(`/hr/payroll/periods/${periodId}/approve`)
}

export function usePayrollRecords(periodId: string) {
  const { data, loading, error, refetch } = useFetch<any>(
    () => periodId ? api.get(`/hr/payroll/periods/${periodId}/records`) : Promise.resolve([]),
    [periodId],
  )
  const records = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []
  return { records: records as PayrollRecord[], loading, error, refetch }
}

// ── Attendance ──────────────────────────────────────────────────────────────
export function useAttendance(filter: { date?: string; employeeId?: string } = {}) {
  const params = new URLSearchParams({ pageSize: '100' })
  if (filter.date) params.set('date', filter.date)
  if (filter.employeeId) params.set('employeeId', filter.employeeId)

  const { data, loading, error, refetch } = useFetch<{ records: any[]; total: number }>(
    () => api.get(`/hr/attendance?${params}`),
    [filter.date, filter.employeeId],
  )
  return { records: data?.records ?? [], total: data?.total ?? 0, loading, error, refetch }
}

export async function checkIn(): Promise<any> {
  return api.post('/hr/attendance/check-in')
}

export async function checkOut(): Promise<any> {
  return api.post('/hr/attendance/check-out')
}

// ── Barcode Search ──────────────────────────────────────────────────────────
export async function searchStockByBarcode(barcode: string): Promise<any | null> {
  try {
    const res = await api.get<any>(`/stock-management?barcode=${encodeURIComponent(barcode)}&pageSize=1`)
    const items = res?.data ?? res ?? []
    const list = Array.isArray(items) ? items : []
    return list.length > 0 ? list[0] : null
  } catch {
    return null
  }
}

export async function assignBarcodeToStockItem(stockItemId: string, barcode: string): Promise<void> {
  await api.patch(`/stock-management/${stockItemId}`, { barcode })
}

// ═══════════════════════════════════════════════════════════════════════════
// MODULE ACCESS HOOKS
// ═══════════════════════════════════════════════════════════════════════════

export interface ModuleAccessEntry {
  id: string
  userId: string
  moduleCode: string
  grantedAt: string
  user: { id: string; name: string; email: string; role: string }
  grantedBy: { id: string; name: string }
}

export function useModuleAccess(moduleCode?: string) {
  const params = new URLSearchParams()
  if (moduleCode) params.set('moduleCode', moduleCode)
  const { data, loading, error, refetch } = useFetch<ModuleAccessEntry[]>(
    () => api.get(`/module-access/my-company${params.toString() ? `?${params}` : ''}`).then((r: any) => r.data ?? r),
    [moduleCode],
  )
  return { accessList: data ?? [], loading, error, refetch }
}

export async function grantModuleAccessKAM(userId: string, moduleCode: string): Promise<ModuleAccessEntry> {
  const res = await api.post<any>('/module-access/my-company', { userId, moduleCode })
  return res.data ?? res
}

export async function revokeModuleAccessKAM(id: string): Promise<void> {
  await api.delete(`/module-access/my-company/${id}`)
}

export async function bulkGrantModuleAccessKAM(userIds: string[], moduleCode: string): Promise<ModuleAccessEntry[]> {
  const res = await api.post<any>('/module-access/my-company/bulk', { userIds, moduleCode })
  return res.data ?? res
}

// ── Super Admin Module Access ───────────────────────────────────────────────
export function useSuperAdminModuleAccess(companyId: string, moduleCode?: string) {
  const params = new URLSearchParams()
  if (moduleCode) params.set('moduleCode', moduleCode)
  const { data, loading, error, refetch } = useFetch<ModuleAccessEntry[]>(
    () => companyId ? api.get(`/super-admin/companies/${companyId}/module-access${params.toString() ? `?${params}` : ''}`).then((r: any) => r.data ?? r) : Promise.resolve([]),
    [companyId, moduleCode],
  )
  return { accessList: data ?? [], loading, error, refetch }
}

export async function grantModuleAccessSuperAdmin(companyId: string, userId: string, moduleCode: string): Promise<ModuleAccessEntry> {
  const res = await api.post<any>(`/super-admin/companies/${companyId}/module-access`, { userId, moduleCode })
  return res.data ?? res
}

export async function revokeModuleAccessSuperAdmin(companyId: string, id: string): Promise<void> {
  await api.delete(`/super-admin/companies/${companyId}/module-access/${id}`)
}

// ── Global Export ────────────────────────────────────────────────────────────
function toArray(r: any): any[] {
  if (Array.isArray(r)) return r
  if (r?.data && Array.isArray(r.data)) return r.data
  return []
}

export async function fetchAllExportData() {
  const results = await Promise.allSettled([
    api.get<any>('/departments'),
    api.get<any>('/users?pageSize=100'),
    api.get<any>('/tasks?pageSize=100'),
    api.get<any>('/inventory?pageSize=100'),
    api.get<any>('/stock-management?pageSize=100'),
    api.get<any>('/stock-management/movements?pageSize=100'),
    api.get<any>('/sales/customers?pageSize=100'),
    api.get<any>('/sales/orders?pageSize=100'),
    api.get<any>('/accounting/accounts'),
    api.get<any>('/accounting/journal?pageSize=100'),
    api.get<any>('/accounting/einvoice?pageSize=100'),
    api.get<any>('/hr/employees?pageSize=100'),
    api.get<any>('/hr/leaves?pageSize=100'),
    api.get<any>('/hr/payroll/periods?pageSize=100'),
  ])

  const extract = (i: number) => {
    const r = results[i]
    if (r.status === 'rejected') return []
    return toArray(r.value)
  }

  return {
    departments:    extract(0),
    users:          extract(1),
    tasks:          extract(2),
    inventory:      extract(3),
    stockItems:     extract(4),
    stockMovements: extract(5),
    customers:      extract(6),
    orders:         extract(7),
    accounts:       extract(8),
    journal:        extract(9),
    einvoices:      extract(10),
    employees:      extract(11),
    leaves:         extract(12),
    payrollPeriods: extract(13),
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DATA EXPORT HOOKS
// ═══════════════════════════════════════════════════════════════════════════

export interface DataExportRequest {
  id: string
  companyId: string
  status: 'BEKLIYOR' | 'ONAYLANDI' | 'REDDEDILDI' | 'HAZIRLANIYOR' | 'TAMAMLANDI' | 'SURESI_DOLDU'
  dateFrom: string
  dateTo: string
  departmentId: string | null
  fileUrl: string | null
  expiresAt: string | null
  rejectedReason: string | null
  createdAt: string
  requestedBy: { id: string; name: string; email: string }
  approvedBy: { id: string; name: string } | null
}

export function useMyExportRequests() {
  const { data, loading, error, refetch } = useFetch<DataExportRequest[]>(
    () => api.get<any>('/data-export/my-requests').then((r: any) => r.data ?? r ?? []),
    [],
  )
  return { requests: data ?? [], loading, error, refetch }
}

export function usePendingExportRequests() {
  const { data, loading, error, refetch } = useFetch<DataExportRequest[]>(
    () => api.get<any>('/data-export/pending').then((r: any) => r.data ?? r ?? []),
    [],
  )
  return { requests: data ?? [], loading, error, refetch }
}

export async function requestDataExport(body: { dateFrom: string; dateTo: string; departmentId?: string }): Promise<DataExportRequest> {
  const res = await api.post<any>('/data-export/request', body)
  return res.data ?? res
}

export async function approveExportRequest(id: string): Promise<DataExportRequest> {
  const res = await api.post<any>(`/data-export/${id}/approve`)
  return res.data ?? res
}

export async function rejectExportRequest(id: string, reason?: string): Promise<DataExportRequest> {
  const res = await api.post<any>(`/data-export/${id}/reject`, { reason })
  return res.data ?? res
}

export async function getExportDownloadUrl(id: string): Promise<string> {
  const res = await api.get<any>(`/data-export/${id}/download`)
  return (res.data ?? res).fileUrl
}
