# ERP Frontend Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add frontend pages for Sales, Accounting, and HR ERP modules with module-based access control gating.

**Architecture:** Tab-based pages per module (Sales.tsx, Accounting.tsx, HR.tsx) with tab content as separate components in components/sales/, components/accounting/, components/hr/. Module gating via AuthContext - backend /auth/me returns `modules: string[]` which controls sidebar visibility and route access.

**Tech Stack:** React 18 + TypeScript + Tailwind CSS + Lucide icons + DraggableModal + custom useFetch hook + native fetch API wrapper

---

## File Structure

### Create:
- `src/types/erp.ts` - All ERP type definitions and label maps
- `src/lib/erp-hooks.ts` - All ERP hooks and CRUD functions
- `src/pages/Sales.tsx` - Sales module wrapper with tabs
- `src/pages/Accounting.tsx` - Accounting module wrapper with tabs
- `src/pages/HR.tsx` - HR module wrapper with tabs
- `src/components/sales/CustomersTab.tsx` - Customer CRUD
- `src/components/sales/OrdersTab.tsx` - Order management
- `src/components/sales/POSTab.tsx` - POS checkout
- `src/components/accounting/AccountsTab.tsx` - Chart of accounts
- `src/components/accounting/JournalTab.tsx` - Journal entries
- `src/components/accounting/EInvoiceTab.tsx` - E-Invoice management
- `src/components/accounting/ReportsTab.tsx` - Financial reports
- `src/components/hr/EmployeesTab.tsx` - Employee CRUD
- `src/components/hr/LeavesTab.tsx` - Leave management
- `src/components/hr/PayrollTab.tsx` - Payroll periods

### Modify:
- `src/types/index.ts` - Add modules to User interface
- `src/context/AuthContext.tsx` - Store modules, expose hasModule()
- `src/lib/api.ts` - (no changes needed, api.get/post/patch/delete sufficient)
- `src/App.tsx` - Add ERP routes + imports
- `src/components/layout/Sidebar.tsx` - Add ERP section with module gating

---

### Task 1: ERP Type Definitions

**Files:**
- Create: `src/types/erp.ts`

- [ ] **Step 1: Create ERP types file**

```typescript
// src/types/erp.ts

// ── Shared ──────────────────────────────────────────────────────────────────
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
  return new Date(d).toLocaleDateString('tr-TR')
}

export const DATETIME_FMT = (d: string | undefined | null) => {
  if (!d) return '-'
  return new Date(d).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
}

// ── Sales Types ─────────────────────────────────────────────────────────────

export type CustomerType = 'PERAKENDE' | 'TOPTAN' | 'KURUMSAL'

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  PERAKENDE: 'Perakende',
  TOPTAN: 'Toptan',
  KURUMSAL: 'Kurumsal',
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
```

- [ ] **Step 2: Commit**

```bash
git add src/types/erp.ts
git commit -m "feat: add ERP type definitions for Sales, Accounting, HR modules"
```

---

### Task 2: Module Gating Infrastructure

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/context/AuthContext.tsx`
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add modules to User type**

In `src/types/index.ts`, add `modules` field to User interface:

```typescript
// After the existing 'departments?' field in User interface, add:
  modules?: string[]
```

- [ ] **Step 2: Update AuthContext to store and expose modules**

In `src/context/AuthContext.tsx`, add `hasModule` to the context interface:

```typescript
// Add to AuthContextType interface:
  hasModule: (code: string) => boolean
```

In the `AuthProvider` component, after the `setUser(mapUser(me))` call (both in session restore and login), ensure modules are stored. The `mapUser` function already spreads all fields, but modules comes as a top-level field on the `/auth/me` response, not on the user object. Update the session restore block:

```typescript
// In the session restore useEffect, after:
//   const me = await api.get<any>('/auth/me')
// Change setUser line to:
if (!cancelled) {
  const mapped = mapUser(me)
  mapped.modules = me.modules ?? []
  setUser(mapped)
  if (me.company) syncFromBackend(me.company)
}
```

Do the same in the `login` function after the `/auth/me` call.

Add `hasModule` function:

```typescript
const hasModule = (code: string) => user?.modules?.includes(code) ?? false
```

Add `hasModule` to the context value:

```typescript
<AuthContext.Provider value={{ user, loading, error, login, mobileLogin, logout, hasModule }}>
```

- [ ] **Step 3: Add ERP section to Sidebar**

In `src/components/layout/Sidebar.tsx`, add imports and a new ERP nav section.

Add these Lucide imports to the existing import line:

```typescript
import {
  // ... existing imports ...
  ShoppingCart, Calculator, UserCog,
} from 'lucide-react'
```

Add `hasModule` to the destructured auth context:

```typescript
const { user, logout, hasModule } = useAuth()
```

Add a new ERP section to the NAV array, after the existing sections:

```typescript
{
  label: 'ERP',
  items: [
    { to: '/satis',            icon: ShoppingCart, label: lang === 'tr' ? 'Satis' : 'Sales',             desc: lang === 'tr' ? 'Musteri, siparis ve POS yonetimi' : 'Customer, order and POS management', minLevel: 4, moduleCode: 'SALES' },
    { to: '/muhasebe',         icon: Calculator,   label: lang === 'tr' ? 'Muhasebe' : 'Accounting',      desc: lang === 'tr' ? 'Hesap plani, yevmiye, e-fatura' : 'Chart of accounts, journal, e-invoice', minLevel: 4, moduleCode: 'ACCOUNTING' },
    { to: '/insan-kaynaklari', icon: UserCog,      label: lang === 'tr' ? 'Insan Kaynaklari' : 'HR',      desc: lang === 'tr' ? 'Calisan, izin ve bordro yonetimi' : 'Employee, leave and payroll management', minLevel: 4, moduleCode: 'HR' },
  ],
},
```

Update the `NavItem` type to include `moduleCode`:

```typescript
type NavItem = {
  to:        string
  icon:      typeof LayoutDashboard
  label:     string
  desc:      string
  shortcut?: string
  badge?:    string
  operiq?:   boolean
  minLevel?: number
  moduleCode?: string  // Add this
}
```

Update the filter for visible items to also check module access:

```typescript
const visibleItems = section.items.filter(item =>
  (!item.minLevel || userLevel >= item.minLevel) &&
  (!item.moduleCode || hasModule(item.moduleCode))
)
```

- [ ] **Step 4: Add ERP routes to App.tsx**

Add imports at the top of `src/App.tsx`:

```typescript
import Sales from './pages/Sales'
import Accounting from './pages/Accounting'
import HRPage from './pages/HR'
```

Add routes inside the `<Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>` block, after existing routes:

```typescript
<Route path="satis"            element={<Sales />} />
<Route path="muhasebe"         element={<Accounting />} />
<Route path="insan-kaynaklari" element={<HRPage />} />
```

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/context/AuthContext.tsx src/components/layout/Sidebar.tsx src/App.tsx
git commit -m "feat: add module gating infrastructure - AuthContext, Sidebar, routes"
```

---

### Task 3: ERP Hooks

**Files:**
- Create: `src/lib/erp-hooks.ts`

- [ ] **Step 1: Create ERP hooks file with all hooks and CRUD functions**

```typescript
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
  const params = new URLSearchParams({ pageSize: '200' })
  if (filter.search) params.set('search', filter.search)
  if (filter.customerType) params.set('customerType', filter.customerType)
  if (filter.active !== undefined) params.set('active', String(filter.active))

  const { data, loading, error, refetch } = useFetch<{ customers: SalesCustomer[]; total: number }>(
    () => api.get(`/sales/customers?${params}`),
    [filter.search, filter.customerType, filter.active],
  )
  return { customers: data?.customers ?? [], total: data?.total ?? 0, loading, error, refetch }
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

  const { data, loading, error, refetch } = useFetch<{ orders: SalesOrder[]; total: number }>(
    () => api.get(`/sales/orders?${params}`),
    [filter.status, filter.customerId, filter.search],
  )
  return { orders: data?.orders ?? [], total: data?.total ?? 0, loading, error, refetch }
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
  const { data, loading, error, refetch } = useFetch<{ branches: SalesBranch[]; total: number }>(
    () => api.get('/sales/branches?pageSize=100'),
    [],
  )
  return { branches: data?.branches ?? [], total: data?.total ?? 0, loading, error, refetch }
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
    () => api.get(`/sales/tills/branch/${branchId}`),
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
  customerId: string
  branchId: string
  tillId: string
  paymentMethod: string
  items: { stockItemId: string; productName: string; unit: string; quantity: number; unitPrice: number }[]
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

  const { data, loading, error, refetch } = useFetch<{ entries: JournalEntry[]; total: number }>(
    () => api.get(`/accounting/journal?${params}`),
    [filter.status, filter.dateFrom, filter.dateTo, filter.search],
  )
  return { entries: data?.entries ?? [], total: data?.total ?? 0, loading, error, refetch }
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

  const { data, loading, error, refetch } = useFetch<{ invoices: EInvoice[]; total: number }>(
    () => api.get(`/accounting/einvoice?${params}`),
    [filter.status, filter.direction, filter.search],
  )
  return { invoices: data?.invoices ?? [], total: data?.total ?? 0, loading, error, refetch }
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
  const params = new URLSearchParams({ dateFrom, dateTo })
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
  const params = new URLSearchParams({ pageSize: '200' })
  if (filter.status) params.set('status', filter.status)
  if (filter.search) params.set('search', filter.search)

  const { data, loading, error, refetch } = useFetch<{ employees: HREmployee[]; total: number }>(
    () => api.get(`/hr/employees?${params}`),
    [filter.status, filter.search],
  )
  return { employees: data?.employees ?? [], total: data?.total ?? 0, loading, error, refetch }
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

  const { data, loading, error, refetch } = useFetch<{ leaves: HRLeave[]; total: number }>(
    () => api.get(`/hr/leaves?${params}`),
    [filter.status, filter.employeeId],
  )
  return { leaves: data?.leaves ?? [], total: data?.total ?? 0, loading, error, refetch }
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
  const { data, loading, error, refetch } = useFetch<{ periods: PayrollPeriod[]; total: number }>(
    () => api.get('/hr/payroll/periods?pageSize=100'),
    [],
  )
  return { periods: data?.periods ?? [], total: data?.total ?? 0, loading, error, refetch }
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
  const { data, loading, error, refetch } = useFetch<PayrollRecord[]>(
    () => api.get(`/hr/payroll/periods/${periodId}/records`),
    [periodId],
  )
  return { records: data ?? [], loading, error, refetch }
}

// ── Attendance ──────────────────────────────────────────────────────────────
export function useAttendance(filter: { date?: string; employeeId?: string } = {}) {
  const params = new URLSearchParams({ pageSize: '200' })
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/erp-hooks.ts
git commit -m "feat: add ERP hooks - Sales, Accounting, HR CRUD functions"
```

---

### Task 4: Sales Page Wrapper

**Files:**
- Create: `src/pages/Sales.tsx`

- [ ] **Step 1: Create Sales page with tab navigation**

```tsx
// src/pages/Sales.tsx
import { useState } from 'react'
import { ShoppingCart, Users, FileText, Monitor, Store } from 'lucide-react'
import clsx from 'clsx'
import { useLanguage } from '../context/LanguageContext'
import CustomersTab from '../components/sales/CustomersTab'
import OrdersTab from '../components/sales/OrdersTab'
import POSTab from '../components/sales/POSTab'

type SalesTab = 'customers' | 'orders' | 'pos'

const TABS: { id: SalesTab; icon: typeof Users; labelTr: string; labelEn: string }[] = [
  { id: 'customers', icon: Users,    labelTr: 'Musteriler',  labelEn: 'Customers' },
  { id: 'orders',    icon: FileText, labelTr: 'Siparisler',  labelEn: 'Orders' },
  { id: 'pos',       icon: Monitor,  labelTr: 'POS',         labelEn: 'POS' },
]

export default function Sales() {
  const [tab, setTab] = useState<SalesTab>('customers')
  const { lang } = useLanguage()

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
          <ShoppingCart className="w-5 h-5 text-indigo-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--text-1)]">
            {lang === 'tr' ? 'Satis Yonetimi' : 'Sales Management'}
          </h1>
          <p className="text-sm text-[var(--text-3)]">
            {lang === 'tr' ? 'Musteri, siparis ve POS islemleri' : 'Customer, order and POS operations'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
              tab === t.id
                ? 'bg-indigo-500 text-white shadow-sm'
                : 'text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg)]'
            )}
          >
            <t.icon className="w-4 h-4" />
            {lang === 'tr' ? t.labelTr : t.labelEn}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'customers' && <CustomersTab />}
      {tab === 'orders' && <OrdersTab />}
      {tab === 'pos' && <POSTab />}
    </div>
  )
}
```

- [ ] **Step 2: Create component directories**

```bash
mkdir -p src/components/sales src/components/accounting src/components/hr
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/Sales.tsx
git commit -m "feat: add Sales page wrapper with tab navigation"
```

---

### Task 5: CustomersTab Component

**Files:**
- Create: `src/components/sales/CustomersTab.tsx`

- [ ] **Step 1: Create CustomersTab with CRUD**

```tsx
// src/components/sales/CustomersTab.tsx
import { useState } from 'react'
import { Plus, Search, Pencil, Trash2, Phone, Mail, Building2 } from 'lucide-react'
import clsx from 'clsx'
import { useCustomers, createCustomer, updateCustomer, deleteCustomer } from '../../lib/erp-hooks'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import DraggableModal from '../ui/DraggableModal'
import type { SalesCustomer, CustomerType } from '../../types/erp'
import { CUSTOMER_TYPE_LABELS, TRY_FMT, DATE_FMT } from '../../types/erp'

const MANAGER_ROLES = ['PLATFORM_ADMIN', 'SUPER_ADMIN', 'GENEL_MUDUR', 'GM_YARDIMCISI', 'DIREKTOR', 'MUDUR']

const EMPTY_FORM = {
  name: '', taxNumber: '', phone: '', email: '', address: '',
  customerType: 'PERAKENDE' as CustomerType, creditLimit: '', paymentTermDays: '30',
  isEInvoiceCustomer: false, notes: '',
}

export default function CustomersTab() {
  const { user } = useAuth()
  const { lang } = useLanguage()
  const canManage = MANAGER_ROLES.includes(user?.role?.toUpperCase() ?? '')

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const { customers, loading, refetch } = useCustomers({ search: search || undefined, customerType: typeFilter || undefined })

  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<SalesCustomer | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setCreating(true)
  }

  const openEdit = (c: SalesCustomer) => {
    setForm({
      name: c.name,
      taxNumber: c.taxNumber ?? '',
      phone: c.phone ?? '',
      email: c.email ?? '',
      address: c.address ?? '',
      customerType: c.customerType,
      creditLimit: c.creditLimit ? String(c.creditLimit) : '',
      paymentTermDays: String(c.paymentTermDays),
      isEInvoiceCustomer: c.isEInvoiceCustomer,
      notes: c.notes ?? '',
    })
    setEditing(c)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = {
        name: form.name,
        taxNumber: form.taxNumber || null,
        phone: form.phone || null,
        email: form.email || null,
        address: form.address || null,
        customerType: form.customerType,
        creditLimit: form.creditLimit ? Number(form.creditLimit) : null,
        paymentTermDays: Number(form.paymentTermDays) || 30,
        isEInvoiceCustomer: form.isEInvoiceCustomer,
        notes: form.notes || null,
      }
      if (editing) {
        await updateCustomer(editing.id, body)
      } else {
        await createCustomer(body)
      }
      setCreating(false)
      setEditing(null)
      refetch()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (c: SalesCustomer) => {
    if (!confirm(`"${c.name}" musterisini silmek istediginizden emin misiniz?`)) return
    try {
      await deleteCustomer(c.id)
      refetch()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const tr = lang === 'tr'

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-4)]" />
          <input
            className="input pl-9 w-full"
            placeholder={tr ? 'Musteri ara...' : 'Search customers...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">{tr ? 'Tum Tipler' : 'All Types'}</option>
          {Object.entries(CUSTOMER_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        {canManage && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-colors">
            <Plus className="w-4 h-4" />
            {tr ? 'Yeni Musteri' : 'New Customer'}
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-[var(--text-3)]">{tr ? 'Yukleniyor...' : 'Loading...'}</div>
      ) : customers.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-3)]">{tr ? 'Musteri bulunamadi' : 'No customers found'}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Musteri' : 'Customer'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Tip' : 'Type'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Iletisim' : 'Contact'}</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Bakiye' : 'Balance'}</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Kayit' : 'Created'}</th>
                {canManage && <th className="text-right px-4 py-3 font-medium text-[var(--text-2)]" />}
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id} className="border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--text-1)]">{c.name}</div>
                    {c.taxNumber && <div className="text-xs text-[var(--text-3)]">VKN: {c.taxNumber}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge-info text-xs px-2 py-0.5 rounded-full border">{CUSTOMER_TYPE_LABELS[c.customerType]}</span>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-3)]">
                    <div className="flex flex-col gap-0.5">
                      {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                      {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[var(--text-2)]">{TRY_FMT(c.balance)}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-3)]">{DATE_FMT(c.createdAt)}</td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded-md hover:bg-[var(--bg)] text-[var(--text-3)] hover:text-indigo-500 transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(c)} className="p-1.5 rounded-md hover:bg-[var(--bg)] text-[var(--text-3)] hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(creating || editing) && (
        <DraggableModal
          title={editing ? (tr ? 'Musteri Duzenle' : 'Edit Customer') : (tr ? 'Yeni Musteri' : 'New Customer')}
          subtitle={editing ? editing.name : undefined}
          icon={<Building2 className="w-5 h-5 text-indigo-500" />}
          onClose={() => { setCreating(false); setEditing(null) }}
          width={520}
          footer={
            <div className="flex justify-end gap-2">
              <button onClick={() => { setCreating(false); setEditing(null) }} className="px-4 py-2 rounded-lg text-sm text-[var(--text-2)] hover:bg-[var(--surface)] transition-colors">
                {tr ? 'Iptal' : 'Cancel'}
              </button>
              <button onClick={handleSave} disabled={saving || !form.name} className="px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 disabled:opacity-50 transition-colors">
                {saving ? (tr ? 'Kaydediliyor...' : 'Saving...') : (tr ? 'Kaydet' : 'Save')}
              </button>
            </div>
          }
        >
          <div className="space-y-3 p-1">
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Musteri Adi *' : 'Customer Name *'}</label>
              <input className="input w-full" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Vergi No' : 'Tax Number'}</label>
                <input className="input w-full" value={form.taxNumber} onChange={e => setForm({ ...form, taxNumber: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Musteri Tipi' : 'Customer Type'}</label>
                <select className="select w-full" value={form.customerType} onChange={e => setForm({ ...form, customerType: e.target.value as CustomerType })}>
                  {Object.entries(CUSTOMER_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Telefon' : 'Phone'}</label>
                <input className="input w-full" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">E-posta</label>
                <input className="input w-full" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Adres' : 'Address'}</label>
              <textarea className="input w-full h-16" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Kredi Limiti' : 'Credit Limit'}</label>
                <input className="input w-full" type="number" value={form.creditLimit} onChange={e => setForm({ ...form, creditLimit: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Vade (gun)' : 'Payment Terms (days)'}</label>
                <input className="input w-full" type="number" value={form.paymentTermDays} onChange={e => setForm({ ...form, paymentTermDays: e.target.value })} />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isEInvoiceCustomer} onChange={e => setForm({ ...form, isEInvoiceCustomer: e.target.checked })} className="rounded" />
              <span className="text-sm text-[var(--text-2)]">{tr ? 'E-Fatura Mukellifi' : 'E-Invoice Customer'}</span>
            </label>
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Notlar' : 'Notes'}</label>
              <textarea className="input w-full h-16" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
        </DraggableModal>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/sales/CustomersTab.tsx
git commit -m "feat: add CustomersTab - CRUD with table, search, filter, modal"
```

---

### Task 6: OrdersTab Component

**Files:**
- Create: `src/components/sales/OrdersTab.tsx`

- [ ] **Step 1: Create OrdersTab with order management**

```tsx
// src/components/sales/OrdersTab.tsx
import { useState } from 'react'
import { Plus, Search, Eye, Check, X, Package, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import {
  useOrders, useCustomers, createOrder, approveOrder, completeOrder, cancelOrder, createPayment,
} from '../../lib/erp-hooks'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import DraggableModal from '../ui/DraggableModal'
import type { SalesOrder, SalesOrderItem, OrderStatus, PaymentMethod } from '../../types/erp'
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES, PAYMENT_METHOD_LABELS, TRY_FMT, DATE_FMT } from '../../types/erp'

const MANAGER_ROLES = ['PLATFORM_ADMIN', 'SUPER_ADMIN', 'GENEL_MUDUR', 'GM_YARDIMCISI', 'DIREKTOR', 'MUDUR']

interface OrderLineForm {
  productName: string; unit: string; quantity: string; unitPrice: string; discountPercent: string
}

const EMPTY_LINE: OrderLineForm = { productName: '', unit: 'ADET', quantity: '1', unitPrice: '0', discountPercent: '0' }

export default function OrdersTab() {
  const { user } = useAuth()
  const { lang } = useLanguage()
  const canManage = MANAGER_ROLES.includes(user?.role?.toUpperCase() ?? '')
  const tr = lang === 'tr'

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const { orders, loading, refetch } = useOrders({ search: search || undefined, status: statusFilter || undefined })
  const { customers } = useCustomers()

  const [creating, setCreating] = useState(false)
  const [viewing, setViewing] = useState<SalesOrder | null>(null)
  const [payingOrder, setPayingOrder] = useState<SalesOrder | null>(null)

  // Create form
  const [customerId, setCustomerId] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<OrderLineForm[]>([{ ...EMPTY_LINE }])
  const [saving, setSaving] = useState(false)

  // Payment form
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState<PaymentMethod>('NAKIT')
  const [payRef, setPayRef] = useState('')

  const addLine = () => setLines([...lines, { ...EMPTY_LINE }])
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i))
  const updateLine = (i: number, field: keyof OrderLineForm, value: string) => {
    const next = [...lines]
    next[i] = { ...next[i], [field]: value }
    setLines(next)
  }

  const lineTotal = (l: OrderLineForm) => {
    const qty = Number(l.quantity) || 0
    const price = Number(l.unitPrice) || 0
    const disc = Number(l.discountPercent) || 0
    return qty * price * (1 - disc / 100)
  }

  const orderTotal = lines.reduce((sum, l) => sum + lineTotal(l), 0)

  const handleCreate = async () => {
    setSaving(true)
    try {
      await createOrder({
        customerId,
        notes: notes || undefined,
        items: lines.filter(l => l.productName).map(l => ({
          productName: l.productName,
          unit: l.unit,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
          discountPercent: Number(l.discountPercent) || 0,
        })),
      })
      setCreating(false)
      setCustomerId('')
      setNotes('')
      setLines([{ ...EMPTY_LINE }])
      refetch()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleAction = async (order: SalesOrder, action: 'approve' | 'complete' | 'cancel') => {
    const confirmMsg = action === 'cancel' ? 'Siparisi iptal etmek istediginizden emin misiniz?' : undefined
    if (confirmMsg && !confirm(confirmMsg)) return
    try {
      if (action === 'approve') await approveOrder(order.id)
      else if (action === 'complete') await completeOrder(order.id)
      else await cancelOrder(order.id)
      setViewing(null)
      refetch()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handlePay = async () => {
    if (!payingOrder) return
    try {
      await createPayment({
        orderId: payingOrder.id,
        amount: Number(payAmount),
        method: payMethod,
        reference: payRef || undefined,
      })
      setPayingOrder(null)
      setPayAmount('')
      setPayRef('')
      refetch()
    } catch (e: any) {
      alert(e.message)
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-4)]" />
          <input className="input pl-9 w-full" placeholder={tr ? 'Siparis ara...' : 'Search orders...'} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">{tr ? 'Tum Durumlar' : 'All Statuses'}</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {canManage && (
          <button onClick={() => setCreating(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-colors">
            <Plus className="w-4 h-4" />
            {tr ? 'Yeni Siparis' : 'New Order'}
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-[var(--text-3)]">{tr ? 'Yukleniyor...' : 'Loading...'}</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-3)]">{tr ? 'Siparis bulunamadi' : 'No orders found'}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Siparis No' : 'Order #'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Musteri' : 'Customer'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Durum' : 'Status'}</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Tutar' : 'Total'}</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Tarih' : 'Date'}</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--text-2)]" />
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} className="border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors cursor-pointer" onClick={() => setViewing(o)}>
                  <td className="px-4 py-3 font-mono text-[var(--text-1)]">{o.orderNumber}</td>
                  <td className="px-4 py-3 text-[var(--text-2)]">{o.customer?.name ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className={clsx('text-xs px-2 py-0.5 rounded-full border', ORDER_STATUS_STYLES[o.status])}>{ORDER_STATUS_LABELS[o.status]}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[var(--text-1)]">{TRY_FMT(o.totalAmount)}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-3)]">{DATE_FMT(o.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="p-1.5 rounded-md hover:bg-[var(--bg)] text-[var(--text-3)] hover:text-indigo-500">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Order Modal */}
      {creating && (
        <DraggableModal
          title={tr ? 'Yeni Siparis' : 'New Order'}
          icon={<Package className="w-5 h-5 text-indigo-500" />}
          onClose={() => setCreating(false)}
          width={680}
          footer={
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-[var(--text-1)]">{tr ? 'Toplam' : 'Total'}: {TRY_FMT(orderTotal)}</div>
              <div className="flex gap-2">
                <button onClick={() => setCreating(false)} className="px-4 py-2 rounded-lg text-sm text-[var(--text-2)] hover:bg-[var(--surface)]">{tr ? 'Iptal' : 'Cancel'}</button>
                <button onClick={handleCreate} disabled={saving || !customerId || lines.every(l => !l.productName)} className="px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 disabled:opacity-50">
                  {saving ? (tr ? 'Kaydediliyor...' : 'Saving...') : (tr ? 'Olustur' : 'Create')}
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 p-1">
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Musteri *' : 'Customer *'}</label>
              <select className="select w-full" value={customerId} onChange={e => setCustomerId(e.target.value)}>
                <option value="">{tr ? 'Musteri secin...' : 'Select customer...'}</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-[var(--text-2)]">{tr ? 'Kalemler' : 'Line Items'}</label>
                <button onClick={addLine} className="text-xs text-indigo-500 hover:text-indigo-600 font-medium">+ {tr ? 'Kalem Ekle' : 'Add Line'}</button>
              </div>
              <div className="space-y-2">
                {lines.map((l, i) => (
                  <div key={i} className="grid grid-cols-[1fr_80px_80px_80px_80px_32px] gap-2 items-end">
                    <div>
                      {i === 0 && <label className="text-[10px] text-[var(--text-3)] mb-0.5 block">{tr ? 'Urun' : 'Product'}</label>}
                      <input className="input w-full" value={l.productName} onChange={e => updateLine(i, 'productName', e.target.value)} placeholder={tr ? 'Urun adi' : 'Product name'} />
                    </div>
                    <div>
                      {i === 0 && <label className="text-[10px] text-[var(--text-3)] mb-0.5 block">{tr ? 'Birim' : 'Unit'}</label>}
                      <input className="input w-full" value={l.unit} onChange={e => updateLine(i, 'unit', e.target.value)} />
                    </div>
                    <div>
                      {i === 0 && <label className="text-[10px] text-[var(--text-3)] mb-0.5 block">{tr ? 'Miktar' : 'Qty'}</label>}
                      <input className="input w-full" type="number" value={l.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)} />
                    </div>
                    <div>
                      {i === 0 && <label className="text-[10px] text-[var(--text-3)] mb-0.5 block">{tr ? 'Fiyat' : 'Price'}</label>}
                      <input className="input w-full" type="number" value={l.unitPrice} onChange={e => updateLine(i, 'unitPrice', e.target.value)} />
                    </div>
                    <div>
                      {i === 0 && <label className="text-[10px] text-[var(--text-3)] mb-0.5 block">{tr ? 'Isk %' : 'Disc %'}</label>}
                      <input className="input w-full" type="number" value={l.discountPercent} onChange={e => updateLine(i, 'discountPercent', e.target.value)} />
                    </div>
                    <button onClick={() => removeLine(i)} className="p-1.5 rounded-md hover:bg-red-50 text-[var(--text-4)] hover:text-red-500" disabled={lines.length === 1}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Notlar' : 'Notes'}</label>
              <textarea className="input w-full h-16" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>
        </DraggableModal>
      )}

      {/* Order Detail Modal */}
      {viewing && (
        <DraggableModal
          title={viewing.orderNumber}
          subtitle={viewing.customer?.name}
          icon={<Package className="w-5 h-5 text-indigo-500" />}
          onClose={() => setViewing(null)}
          width={640}
          footer={
            <div className="flex gap-2 justify-end">
              {viewing.status === 'TASLAK' && canManage && (
                <>
                  <button onClick={() => handleAction(viewing, 'approve')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-sm hover:bg-blue-600">
                    <Check className="w-3.5 h-3.5" />{tr ? 'Onayla' : 'Approve'}
                  </button>
                  <button onClick={() => handleAction(viewing, 'cancel')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm hover:bg-red-600">
                    <X className="w-3.5 h-3.5" />{tr ? 'Iptal Et' : 'Cancel'}
                  </button>
                </>
              )}
              {viewing.status === 'ONAYLANDI' && canManage && (
                <>
                  <button onClick={() => setPayingOrder(viewing)} className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-sm hover:bg-emerald-600">
                    {tr ? 'Odeme Al' : 'Add Payment'}
                  </button>
                  <button onClick={() => handleAction(viewing, 'complete')} className="px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-sm hover:bg-indigo-600">
                    {tr ? 'Tamamla' : 'Complete'}
                  </button>
                </>
              )}
            </div>
          }
        >
          <div className="space-y-4 p-1">
            <div className="flex items-center gap-3">
              <span className={clsx('text-xs px-2 py-0.5 rounded-full border', ORDER_STATUS_STYLES[viewing.status])}>{ORDER_STATUS_LABELS[viewing.status]}</span>
              <span className="text-sm text-[var(--text-3)]">{DATE_FMT(viewing.createdAt)}</span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
                    <th className="text-left px-3 py-2 text-xs font-medium text-[var(--text-3)]">{tr ? 'Urun' : 'Product'}</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-[var(--text-3)]">{tr ? 'Miktar' : 'Qty'}</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-[var(--text-3)]">{tr ? 'Birim Fiyat' : 'Unit Price'}</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-[var(--text-3)]">{tr ? 'Toplam' : 'Total'}</th>
                  </tr>
                </thead>
                <tbody>
                  {viewing.items.map(item => (
                    <tr key={item.id} className="border-b border-[var(--border)]">
                      <td className="px-3 py-2 text-[var(--text-1)]">{item.productName}</td>
                      <td className="px-3 py-2 text-right text-[var(--text-2)]">{item.quantity} {item.unit}</td>
                      <td className="px-3 py-2 text-right font-mono text-[var(--text-2)]">{TRY_FMT(item.unitPrice)}</td>
                      <td className="px-3 py-2 text-right font-mono text-[var(--text-1)]">{TRY_FMT(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[var(--surface)]">
                    <td colSpan={3} className="px-3 py-2 text-right font-medium text-[var(--text-1)]">{tr ? 'Genel Toplam' : 'Grand Total'}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-[var(--text-1)]">{TRY_FMT(viewing.totalAmount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {viewing.payments.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-[var(--text-2)] mb-2">{tr ? 'Odemeler' : 'Payments'}</h4>
                {viewing.payments.map(p => (
                  <div key={p.id} className="flex justify-between items-center py-1.5 text-sm">
                    <span className="text-[var(--text-2)]">{PAYMENT_METHOD_LABELS[p.method]} - {DATE_FMT(p.paidAt)}</span>
                    <span className="font-mono text-[var(--text-1)]">{TRY_FMT(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {viewing.notes && (
              <div>
                <h4 className="text-xs font-medium text-[var(--text-2)] mb-1">{tr ? 'Notlar' : 'Notes'}</h4>
                <p className="text-sm text-[var(--text-3)]">{viewing.notes}</p>
              </div>
            )}
          </div>
        </DraggableModal>
      )}

      {/* Payment Modal */}
      {payingOrder && (
        <DraggableModal
          title={tr ? 'Odeme Al' : 'Add Payment'}
          subtitle={payingOrder.orderNumber}
          onClose={() => setPayingOrder(null)}
          width={400}
          footer={
            <div className="flex gap-2 justify-end">
              <button onClick={() => setPayingOrder(null)} className="px-4 py-2 rounded-lg text-sm text-[var(--text-2)] hover:bg-[var(--surface)]">{tr ? 'Iptal' : 'Cancel'}</button>
              <button onClick={handlePay} disabled={!payAmount} className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-50">
                {tr ? 'Odemeyi Kaydet' : 'Save Payment'}
              </button>
            </div>
          }
        >
          <div className="space-y-3 p-1">
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Tutar *' : 'Amount *'}</label>
              <input className="input w-full" type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Odeme Yontemi' : 'Payment Method'}</label>
              <select className="select w-full" value={payMethod} onChange={e => setPayMethod(e.target.value as PaymentMethod)}>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Referans' : 'Reference'}</label>
              <input className="input w-full" value={payRef} onChange={e => setPayRef(e.target.value)} />
            </div>
          </div>
        </DraggableModal>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/sales/OrdersTab.tsx
git commit -m "feat: add OrdersTab - order CRUD, line items, payments, status actions"
```

---

### Task 7: POSTab Component

**Files:**
- Create: `src/components/sales/POSTab.tsx`

- [ ] **Step 1: Create POSTab with checkout flow**

```tsx
// src/components/sales/POSTab.tsx
import { useState, useMemo } from 'react'
import { Search, Plus, Minus, ShoppingCart, Trash2, Receipt, CreditCard } from 'lucide-react'
import clsx from 'clsx'
import { usePOSProducts, useCustomers, useBranches, useTills, posCheckout } from '../../lib/erp-hooks'
import { useLanguage } from '../../context/LanguageContext'
import DraggableModal from '../ui/DraggableModal'
import type { POSCartItem, POSProduct, PaymentMethod, POSReceiptData } from '../../types/erp'
import { PAYMENT_METHOD_LABELS, TRY_FMT } from '../../types/erp'

export default function POSTab() {
  const { lang } = useLanguage()
  const tr = lang === 'tr'

  const [productSearch, setProductSearch] = useState('')
  const { products, loading: productsLoading } = usePOSProducts(productSearch || undefined)
  const { customers } = useCustomers()
  const { branches } = useBranches()

  const [branchId, setBranchId] = useState('')
  const [tillId, setTillId] = useState('')
  const { tills } = useTills(branchId)

  const [customerId, setCustomerId] = useState('')
  const [cart, setCart] = useState<POSCartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('NAKIT')
  const [receipt, setReceipt] = useState<POSReceiptData | null>(null)
  const [processing, setProcessing] = useState(false)

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.qty * item.unitPrice, 0), [cart])

  const addToCart = (product: POSProduct) => {
    const existing = cart.find(c => c.product.id === product.id)
    if (existing) {
      setCart(cart.map(c => c.product.id === product.id ? { ...c, qty: c.qty + 1 } : c))
    } else {
      setCart([...cart, { product, qty: 1, unitPrice: Number(product.unitCost) }])
    }
  }

  const updateQty = (productId: string, delta: number) => {
    setCart(cart.map(c => {
      if (c.product.id !== productId) return c
      const newQty = c.qty + delta
      return newQty <= 0 ? c : { ...c, qty: newQty }
    }))
  }

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(c => c.product.id !== productId))
  }

  const handleCheckout = async () => {
    if (!customerId || !branchId || !tillId || cart.length === 0) return
    setProcessing(true)
    try {
      const result = await posCheckout({
        customerId,
        branchId,
        tillId,
        paymentMethod,
        items: cart.map(c => ({
          stockItemId: c.product.id,
          productName: c.product.name,
          unit: c.product.unit,
          quantity: c.qty,
          unitPrice: c.unitPrice,
        })),
      })
      setReceipt(result.receiptData)
      setCart([])
    } catch (e: any) {
      alert(e.message)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
      {/* Product Grid */}
      <div className="space-y-4">
        {/* POS Config Bar */}
        <div className="flex flex-wrap gap-3">
          <select className="select flex-1 min-w-[140px]" value={branchId} onChange={e => { setBranchId(e.target.value); setTillId('') }}>
            <option value="">{tr ? 'Sube secin' : 'Select branch'}</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select className="select flex-1 min-w-[140px]" value={tillId} onChange={e => setTillId(e.target.value)} disabled={!branchId}>
            <option value="">{tr ? 'Kasa secin' : 'Select till'}</option>
            {tills.filter(t => t.status === 'ACIK').map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select className="select flex-1 min-w-[140px]" value={customerId} onChange={e => setCustomerId(e.target.value)}>
            <option value="">{tr ? 'Musteri secin' : 'Select customer'}</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-4)]" />
          <input className="input pl-9 w-full" placeholder={tr ? 'Urun ara...' : 'Search products...'} value={productSearch} onChange={e => setProductSearch(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {productsLoading ? (
            <div className="col-span-full text-center py-8 text-[var(--text-3)]">{tr ? 'Yukleniyor...' : 'Loading...'}</div>
          ) : products.length === 0 ? (
            <div className="col-span-full text-center py-8 text-[var(--text-3)]">{tr ? 'Urun bulunamadi' : 'No products found'}</div>
          ) : (
            products.map(p => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-indigo-300 hover:bg-indigo-50/50 transition-all text-left"
              >
                <div className="text-sm font-medium text-[var(--text-1)] truncate">{p.name}</div>
                <div className="text-xs text-[var(--text-3)] mt-0.5">{p.code} - {p.unit}</div>
                <div className="text-sm font-mono font-semibold text-indigo-600 mt-1">{TRY_FMT(p.unitCost)}</div>
                <div className="text-[10px] text-[var(--text-4)] mt-0.5">{tr ? 'Stok' : 'Stock'}: {p.quantity}</div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Cart Panel */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] flex flex-col h-fit lg:sticky lg:top-4">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
          <ShoppingCart className="w-5 h-5 text-indigo-500" />
          <span className="font-semibold text-[var(--text-1)]">{tr ? 'Sepet' : 'Cart'}</span>
          <span className="ml-auto text-xs text-[var(--text-3)]">{cart.length} {tr ? 'kalem' : 'items'}</span>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[400px] p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="text-center py-8 text-sm text-[var(--text-3)]">{tr ? 'Sepet bos' : 'Cart is empty'}</div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg)]">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--text-1)] truncate">{item.product.name}</div>
                  <div className="text-xs text-[var(--text-3)]">{TRY_FMT(item.unitPrice)} x {item.qty}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateQty(item.product.id, -1)} className="w-6 h-6 rounded-md bg-[var(--surface)] flex items-center justify-center hover:bg-zinc-200 transition-colors">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-8 text-center text-sm font-medium">{item.qty}</span>
                  <button onClick={() => updateQty(item.product.id, 1)} className="w-6 h-6 rounded-md bg-[var(--surface)] flex items-center justify-center hover:bg-zinc-200 transition-colors">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <div className="w-20 text-right text-sm font-mono font-medium text-[var(--text-1)]">{TRY_FMT(item.qty * item.unitPrice)}</div>
                <button onClick={() => removeFromCart(item.product.id)} className="p-1 rounded-md hover:bg-red-50 text-[var(--text-4)] hover:text-red-500">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-[var(--border)] p-4 space-y-3">
          <div className="flex justify-between text-lg font-bold text-[var(--text-1)]">
            <span>{tr ? 'Toplam' : 'Total'}</span>
            <span className="font-mono">{TRY_FMT(cartTotal)}</span>
          </div>

          <select className="select w-full" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}>
            {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>

          <button
            onClick={handleCheckout}
            disabled={processing || cart.length === 0 || !customerId || !branchId || !tillId}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 disabled:opacity-50 transition-colors"
          >
            <CreditCard className="w-5 h-5" />
            {processing ? (tr ? 'Isleniyor...' : 'Processing...') : (tr ? 'Odeme Al' : 'Checkout')}
          </button>
        </div>
      </div>

      {/* Receipt Modal */}
      {receipt && (
        <DraggableModal
          title={tr ? 'Satis Fisi' : 'Receipt'}
          subtitle={receipt.orderNumber}
          icon={<Receipt className="w-5 h-5 text-emerald-500" />}
          onClose={() => setReceipt(null)}
          width={360}
        >
          <div className="p-4 font-mono text-sm space-y-3">
            <div className="text-center">
              <div className="font-bold text-base">{receipt.branchName}</div>
              <div className="text-[var(--text-3)]">{receipt.tillName} - {receipt.cashierName}</div>
              <div className="text-xs text-[var(--text-4)]">{new Date(receipt.date).toLocaleString('tr-TR')}</div>
            </div>
            <div className="border-t border-dashed border-[var(--border)] pt-2">
              {receipt.items.map((item, i) => (
                <div key={i} className="flex justify-between py-0.5">
                  <span>{item.qty}x {item.name}</span>
                  <span>{TRY_FMT(item.total)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-dashed border-[var(--border)] pt-2 font-bold flex justify-between">
              <span>{tr ? 'TOPLAM' : 'TOTAL'}</span>
              <span>{TRY_FMT(receipt.total)}</span>
            </div>
            <div className="text-xs text-[var(--text-3)]">
              <div>{PAYMENT_METHOD_LABELS[receipt.paymentMethod as PaymentMethod]}: {TRY_FMT(receipt.paymentAmount)}</div>
              {receipt.change > 0 && <div>{tr ? 'Para Ustu' : 'Change'}: {TRY_FMT(receipt.change)}</div>}
            </div>
          </div>
        </DraggableModal>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/sales/POSTab.tsx
git commit -m "feat: add POSTab - product grid, cart, checkout flow, receipt"
```

---

### Task 8: Accounting Page Wrapper

**Files:**
- Create: `src/pages/Accounting.tsx`

- [ ] **Step 1: Create Accounting page with tab navigation**

```tsx
// src/pages/Accounting.tsx
import { useState } from 'react'
import { Calculator, List, BookOpen, FileText, BarChart3 } from 'lucide-react'
import clsx from 'clsx'
import { useLanguage } from '../context/LanguageContext'
import AccountsTab from '../components/accounting/AccountsTab'
import JournalTab from '../components/accounting/JournalTab'
import EInvoiceTab from '../components/accounting/EInvoiceTab'
import ReportsTab from '../components/accounting/ReportsTab'

type AccTab = 'accounts' | 'journal' | 'einvoice' | 'reports'

const TABS: { id: AccTab; icon: typeof List; labelTr: string; labelEn: string }[] = [
  { id: 'accounts', icon: List,      labelTr: 'Hesap Plani',  labelEn: 'Chart of Accounts' },
  { id: 'journal',  icon: BookOpen,  labelTr: 'Yevmiye',      labelEn: 'Journal' },
  { id: 'einvoice', icon: FileText,  labelTr: 'E-Fatura',     labelEn: 'E-Invoice' },
  { id: 'reports',  icon: BarChart3, labelTr: 'Raporlar',     labelEn: 'Reports' },
]

export default function Accounting() {
  const [tab, setTab] = useState<AccTab>('accounts')
  const { lang } = useLanguage()

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
          <Calculator className="w-5 h-5 text-emerald-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--text-1)]">
            {lang === 'tr' ? 'Muhasebe' : 'Accounting'}
          </h1>
          <p className="text-sm text-[var(--text-3)]">
            {lang === 'tr' ? 'Hesap plani, yevmiye, e-fatura ve raporlar' : 'Chart of accounts, journal, e-invoice and reports'}
          </p>
        </div>
      </div>

      <div className="flex gap-1 p-1 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
              tab === t.id
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg)]'
            )}
          >
            <t.icon className="w-4 h-4" />
            {lang === 'tr' ? t.labelTr : t.labelEn}
          </button>
        ))}
      </div>

      {tab === 'accounts' && <AccountsTab />}
      {tab === 'journal' && <JournalTab />}
      {tab === 'einvoice' && <EInvoiceTab />}
      {tab === 'reports' && <ReportsTab />}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Accounting.tsx
git commit -m "feat: add Accounting page wrapper with tab navigation"
```

---

### Task 9: AccountsTab Component

**Files:**
- Create: `src/components/accounting/AccountsTab.tsx`

- [ ] **Step 1: Create AccountsTab with chart of accounts**

```tsx
// src/components/accounting/AccountsTab.tsx
import { useState, useMemo } from 'react'
import { Plus, Search, Pencil, Trash2, ChevronRight, ChevronDown, Database } from 'lucide-react'
import clsx from 'clsx'
import { useAccounts, createAccount, updateAccount, deleteAccount, seedDefaultAccounts } from '../../lib/erp-hooks'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import DraggableModal from '../ui/DraggableModal'
import type { AccountingAccount, AccountType } from '../../types/erp'
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_STYLES, TRY_FMT } from '../../types/erp'

const MANAGER_ROLES = ['PLATFORM_ADMIN', 'SUPER_ADMIN', 'GENEL_MUDUR', 'GM_YARDIMCISI', 'DIREKTOR', 'MUDUR']

const EMPTY_FORM = { code: '', name: '', accountType: 'VARLIK' as AccountType, parentCode: '' }

export default function AccountsTab() {
  const { user } = useAuth()
  const { lang } = useLanguage()
  const canManage = MANAGER_ROLES.includes(user?.role?.toUpperCase() ?? '')
  const tr = lang === 'tr'

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const { accounts, loading, refetch } = useAccounts()

  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<AccountingAccount | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    let list = accounts
    if (search) list = list.filter(a => a.code.includes(search) || a.name.toLowerCase().includes(search.toLowerCase()))
    if (typeFilter) list = list.filter(a => a.accountType === typeFilter)
    return list.sort((a, b) => a.code.localeCompare(b.code))
  }, [accounts, search, typeFilter])

  const parentAccounts = useMemo(() => accounts.filter(a => !a.isLeaf), [accounts])

  const toggleExpand = (code: string) => {
    const next = new Set(expanded)
    if (next.has(code)) next.delete(code)
    else next.add(code)
    setExpanded(next)
  }

  const getLevel = (code: string) => {
    const parts = code.split('.')
    return parts.length - 1
  }

  const openCreate = () => { setForm(EMPTY_FORM); setCreating(true) }
  const openEdit = (a: AccountingAccount) => {
    setForm({ code: a.code, name: a.name, accountType: a.accountType, parentCode: a.parentCode ?? '' })
    setEditing(a)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = {
        code: form.code,
        name: form.name,
        accountType: form.accountType,
        parentCode: form.parentCode || undefined,
      }
      if (editing) await updateAccount(editing.code, { name: form.name, accountType: form.accountType })
      else await createAccount(body)
      setCreating(false)
      setEditing(null)
      refetch()
    } catch (e: any) { alert(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (a: AccountingAccount) => {
    if (!confirm(`"${a.code} - ${a.name}" hesabini silmek istediginizden emin misiniz?`)) return
    try { await deleteAccount(a.code); refetch() }
    catch (e: any) { alert(e.message) }
  }

  const handleSeedDefaults = async () => {
    if (!confirm(tr ? 'Varsayilan hesap planini olusturmak istiyor musunuz?' : 'Create default chart of accounts?')) return
    try { await seedDefaultAccounts(); refetch() }
    catch (e: any) { alert(e.message) }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-4)]" />
          <input className="input pl-9 w-full" placeholder={tr ? 'Hesap kodu veya adi...' : 'Account code or name...'} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">{tr ? 'Tum Tipler' : 'All Types'}</option>
          {Object.entries(ACCOUNT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {canManage && (
          <>
            {accounts.length === 0 && (
              <button onClick={handleSeedDefaults} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors">
                <Database className="w-4 h-4" />
                {tr ? 'Varsayilan Plan' : 'Seed Defaults'}
              </button>
            )}
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors">
              <Plus className="w-4 h-4" />
              {tr ? 'Yeni Hesap' : 'New Account'}
            </button>
          </>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--text-3)]">{tr ? 'Yukleniyor...' : 'Loading...'}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-3)]">{tr ? 'Hesap bulunamadi' : 'No accounts found'}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Hesap Kodu' : 'Code'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Hesap Adi' : 'Name'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Tip' : 'Type'}</th>
                {canManage && <th className="text-right px-4 py-3 font-medium text-[var(--text-2)]" />}
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => {
                const level = getLevel(a.code)
                return (
                  <tr key={a.code} className="border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1" style={{ paddingLeft: `${level * 16}px` }}>
                        {!a.isLeaf ? (
                          <button onClick={() => toggleExpand(a.code)} className="p-0.5 rounded hover:bg-[var(--bg)]">
                            {expanded.has(a.code) ? <ChevronDown className="w-3.5 h-3.5 text-[var(--text-3)]" /> : <ChevronRight className="w-3.5 h-3.5 text-[var(--text-3)]" />}
                          </button>
                        ) : <span className="w-4" />}
                        <span className="font-mono font-medium text-[var(--text-1)]">{a.code}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-[var(--text-2)]">{a.name}</td>
                    <td className="px-4 py-2.5">
                      <span className={clsx('text-xs px-2 py-0.5 rounded-full border', ACCOUNT_TYPE_STYLES[a.accountType])}>{ACCOUNT_TYPE_LABELS[a.accountType]}</span>
                    </td>
                    {canManage && (
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(a)} className="p-1.5 rounded-md hover:bg-[var(--bg)] text-[var(--text-3)] hover:text-emerald-500"><Pencil className="w-4 h-4" /></button>
                          {a.isLeaf && <button onClick={() => handleDelete(a)} className="p-1.5 rounded-md hover:bg-[var(--bg)] text-[var(--text-3)] hover:text-red-500"><Trash2 className="w-4 h-4" /></button>}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {(creating || editing) && (
        <DraggableModal
          title={editing ? (tr ? 'Hesap Duzenle' : 'Edit Account') : (tr ? 'Yeni Hesap' : 'New Account')}
          onClose={() => { setCreating(false); setEditing(null) }}
          width={460}
          footer={
            <div className="flex justify-end gap-2">
              <button onClick={() => { setCreating(false); setEditing(null) }} className="px-4 py-2 rounded-lg text-sm text-[var(--text-2)] hover:bg-[var(--surface)]">{tr ? 'Iptal' : 'Cancel'}</button>
              <button onClick={handleSave} disabled={saving || !form.code || !form.name} className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-50">
                {saving ? (tr ? 'Kaydediliyor...' : 'Saving...') : (tr ? 'Kaydet' : 'Save')}
              </button>
            </div>
          }
        >
          <div className="space-y-3 p-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Hesap Kodu *' : 'Account Code *'}</label>
                <input className="input w-full font-mono" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} disabled={!!editing} />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Hesap Tipi' : 'Account Type'}</label>
                <select className="select w-full" value={form.accountType} onChange={e => setForm({ ...form, accountType: e.target.value as AccountType })}>
                  {Object.entries(ACCOUNT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Hesap Adi *' : 'Account Name *'}</label>
              <input className="input w-full" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            {!editing && (
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Ust Hesap' : 'Parent Account'}</label>
                <select className="select w-full" value={form.parentCode} onChange={e => setForm({ ...form, parentCode: e.target.value })}>
                  <option value="">{tr ? 'Yok (Ana Hesap)' : 'None (Root)'}</option>
                  {parentAccounts.map(a => <option key={a.code} value={a.code}>{a.code} - {a.name}</option>)}
                </select>
              </div>
            )}
          </div>
        </DraggableModal>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/accounting/AccountsTab.tsx
git commit -m "feat: add AccountsTab - chart of accounts CRUD with tree view"
```

---

### Task 10: JournalTab Component

**Files:**
- Create: `src/components/accounting/JournalTab.tsx`

- [ ] **Step 1: Create JournalTab with journal entry management**

```tsx
// src/components/accounting/JournalTab.tsx
import { useState } from 'react'
import { Plus, Search, Eye, Check, X, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { useJournalEntries, useAccounts, createJournalEntry, approveJournalEntry, cancelJournalEntry } from '../../lib/erp-hooks'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import DraggableModal from '../ui/DraggableModal'
import type { JournalEntry, JournalStatus } from '../../types/erp'
import { JOURNAL_STATUS_LABELS, JOURNAL_STATUS_STYLES, TRY_FMT, DATE_FMT } from '../../types/erp'

const MANAGER_ROLES = ['PLATFORM_ADMIN', 'SUPER_ADMIN', 'GENEL_MUDUR', 'GM_YARDIMCISI', 'DIREKTOR', 'MUDUR']

interface JournalLineForm { accountCode: string; debit: string; credit: string; description: string }
const EMPTY_LINE: JournalLineForm = { accountCode: '', debit: '0', credit: '0', description: '' }

export default function JournalTab() {
  const { user } = useAuth()
  const { lang } = useLanguage()
  const canManage = MANAGER_ROLES.includes(user?.role?.toUpperCase() ?? '')
  const tr = lang === 'tr'

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const { entries, loading, refetch } = useJournalEntries({ search: search || undefined, status: statusFilter || undefined })
  const { accounts } = useAccounts()
  const leafAccounts = accounts.filter(a => a.isLeaf)

  const [creating, setCreating] = useState(false)
  const [viewing, setViewing] = useState<JournalEntry | null>(null)
  const [saving, setSaving] = useState(false)

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [lines, setLines] = useState<JournalLineForm[]>([{ ...EMPTY_LINE }, { ...EMPTY_LINE }])

  const addLine = () => setLines([...lines, { ...EMPTY_LINE }])
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i))
  const updateLine = (i: number, field: keyof JournalLineForm, value: string) => {
    const next = [...lines]
    next[i] = { ...next[i], [field]: value }
    setLines(next)
  }

  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0)
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0)
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01

  const handleCreate = async () => {
    if (!balanced) { alert(tr ? 'Borc ve alacak toplamlar esit olmali!' : 'Debit and credit totals must be equal!'); return }
    setSaving(true)
    try {
      await createJournalEntry({
        date, description,
        lines: lines.filter(l => l.accountCode).map(l => ({
          accountCode: l.accountCode,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
          description: l.description || undefined,
        })),
      })
      setCreating(false)
      setDescription('')
      setLines([{ ...EMPTY_LINE }, { ...EMPTY_LINE }])
      refetch()
    } catch (e: any) { alert(e.message) }
    finally { setSaving(false) }
  }

  const handleAction = async (entry: JournalEntry, action: 'approve' | 'cancel') => {
    try {
      if (action === 'approve') await approveJournalEntry(entry.id)
      else await cancelJournalEntry(entry.id)
      setViewing(null)
      refetch()
    } catch (e: any) { alert(e.message) }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-4)]" />
          <input className="input pl-9 w-full" placeholder={tr ? 'Yevmiye ara...' : 'Search entries...'} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">{tr ? 'Tum Durumlar' : 'All'}</option>
          {Object.entries(JOURNAL_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {canManage && (
          <button onClick={() => setCreating(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600">
            <Plus className="w-4 h-4" />
            {tr ? 'Yeni Yevmiye' : 'New Entry'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--text-3)]">{tr ? 'Yukleniyor...' : 'Loading...'}</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-3)]">{tr ? 'Kayit bulunamadi' : 'No entries found'}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Fis No' : 'Entry #'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Tarih' : 'Date'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Aciklama' : 'Description'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Durum' : 'Status'}</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Borc' : 'Debit'}</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Alacak' : 'Credit'}</th>
                <th className="text-right px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id} className="border-b border-[var(--border)] hover:bg-[var(--surface)] cursor-pointer" onClick={() => setViewing(e)}>
                  <td className="px-4 py-3 font-mono text-[var(--text-1)]">{e.entryNumber}</td>
                  <td className="px-4 py-3 text-[var(--text-2)]">{DATE_FMT(e.date)}</td>
                  <td className="px-4 py-3 text-[var(--text-2)] max-w-[200px] truncate">{e.description}</td>
                  <td className="px-4 py-3"><span className={clsx('text-xs px-2 py-0.5 rounded-full border', JOURNAL_STATUS_STYLES[e.status])}>{JOURNAL_STATUS_LABELS[e.status]}</span></td>
                  <td className="px-4 py-3 text-right font-mono text-[var(--text-1)]">{TRY_FMT(e.totalDebit)}</td>
                  <td className="px-4 py-3 text-right font-mono text-[var(--text-1)]">{TRY_FMT(e.totalCredit)}</td>
                  <td className="px-4 py-3 text-right"><Eye className="w-4 h-4 text-[var(--text-4)]" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {creating && (
        <DraggableModal
          title={tr ? 'Yeni Yevmiye Fisi' : 'New Journal Entry'}
          onClose={() => setCreating(false)}
          width={720}
          footer={
            <div className="flex items-center justify-between">
              <div className="flex gap-4 text-sm">
                <span className="text-[var(--text-2)]">{tr ? 'Borc' : 'Debit'}: <span className="font-mono font-medium">{TRY_FMT(totalDebit)}</span></span>
                <span className="text-[var(--text-2)]">{tr ? 'Alacak' : 'Credit'}: <span className="font-mono font-medium">{TRY_FMT(totalCredit)}</span></span>
                {!balanced && <span className="text-red-500 text-xs">{tr ? 'Dengesiz!' : 'Unbalanced!'}</span>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setCreating(false)} className="px-4 py-2 rounded-lg text-sm text-[var(--text-2)] hover:bg-[var(--surface)]">{tr ? 'Iptal' : 'Cancel'}</button>
                <button onClick={handleCreate} disabled={saving || !description || !balanced} className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-50">
                  {saving ? (tr ? 'Kaydediliyor...' : 'Saving...') : (tr ? 'Kaydet' : 'Save')}
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 p-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Tarih *' : 'Date *'}</label>
                <input className="input w-full" type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Aciklama *' : 'Description *'}</label>
                <input className="input w-full" value={description} onChange={e => setDescription(e.target.value)} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-[var(--text-2)]">{tr ? 'Satirlar' : 'Lines'}</label>
                <button onClick={addLine} className="text-xs text-emerald-500 hover:text-emerald-600 font-medium">+ {tr ? 'Satir Ekle' : 'Add Line'}</button>
              </div>
              <div className="space-y-2">
                {lines.map((l, i) => (
                  <div key={i} className="grid grid-cols-[1fr_100px_100px_1fr_32px] gap-2 items-end">
                    <div>
                      {i === 0 && <label className="text-[10px] text-[var(--text-3)] mb-0.5 block">{tr ? 'Hesap' : 'Account'}</label>}
                      <select className="select w-full text-xs" value={l.accountCode} onChange={e => updateLine(i, 'accountCode', e.target.value)}>
                        <option value="">{tr ? 'Hesap sec...' : 'Select...'}</option>
                        {leafAccounts.map(a => <option key={a.code} value={a.code}>{a.code} - {a.name}</option>)}
                      </select>
                    </div>
                    <div>
                      {i === 0 && <label className="text-[10px] text-[var(--text-3)] mb-0.5 block">{tr ? 'Borc' : 'Debit'}</label>}
                      <input className="input w-full" type="number" value={l.debit} onChange={e => updateLine(i, 'debit', e.target.value)} />
                    </div>
                    <div>
                      {i === 0 && <label className="text-[10px] text-[var(--text-3)] mb-0.5 block">{tr ? 'Alacak' : 'Credit'}</label>}
                      <input className="input w-full" type="number" value={l.credit} onChange={e => updateLine(i, 'credit', e.target.value)} />
                    </div>
                    <div>
                      {i === 0 && <label className="text-[10px] text-[var(--text-3)] mb-0.5 block">{tr ? 'Aciklama' : 'Note'}</label>}
                      <input className="input w-full" value={l.description} onChange={e => updateLine(i, 'description', e.target.value)} />
                    </div>
                    <button onClick={() => removeLine(i)} className="p-1.5 rounded-md hover:bg-red-50 text-[var(--text-4)] hover:text-red-500" disabled={lines.length <= 2}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DraggableModal>
      )}

      {/* Detail Modal */}
      {viewing && (
        <DraggableModal
          title={viewing.entryNumber}
          subtitle={viewing.description}
          onClose={() => setViewing(null)}
          width={640}
          footer={
            viewing.status === 'TASLAK' && canManage ? (
              <div className="flex gap-2 justify-end">
                <button onClick={() => handleAction(viewing, 'approve')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-sm hover:bg-emerald-600">
                  <Check className="w-3.5 h-3.5" />{tr ? 'Onayla' : 'Approve'}
                </button>
                <button onClick={() => handleAction(viewing, 'cancel')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm hover:bg-red-600">
                  <X className="w-3.5 h-3.5" />{tr ? 'Iptal Et' : 'Cancel'}
                </button>
              </div>
            ) : undefined
          }
        >
          <div className="space-y-3 p-1">
            <div className="flex items-center gap-3 text-sm">
              <span className={clsx('px-2 py-0.5 rounded-full border text-xs', JOURNAL_STATUS_STYLES[viewing.status])}>{JOURNAL_STATUS_LABELS[viewing.status]}</span>
              <span className="text-[var(--text-3)]">{DATE_FMT(viewing.date)}</span>
              {viewing.createdBy && <span className="text-[var(--text-3)]">{viewing.createdBy.name}</span>}
            </div>
            <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
                    <th className="text-left px-3 py-2 text-xs font-medium text-[var(--text-3)]">{tr ? 'Hesap' : 'Account'}</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-[var(--text-3)]">{tr ? 'Borc' : 'Debit'}</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-[var(--text-3)]">{tr ? 'Alacak' : 'Credit'}</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-[var(--text-3)]">{tr ? 'Aciklama' : 'Note'}</th>
                  </tr>
                </thead>
                <tbody>
                  {viewing.lines.map(l => (
                    <tr key={l.id} className="border-b border-[var(--border)]">
                      <td className="px-3 py-2"><span className="font-mono text-xs">{l.accountCode}</span> {l.account?.name}</td>
                      <td className="px-3 py-2 text-right font-mono">{Number(l.debit) > 0 ? TRY_FMT(l.debit) : '-'}</td>
                      <td className="px-3 py-2 text-right font-mono">{Number(l.credit) > 0 ? TRY_FMT(l.credit) : '-'}</td>
                      <td className="px-3 py-2 text-[var(--text-3)]">{l.description ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[var(--surface)] font-medium">
                    <td className="px-3 py-2">{tr ? 'Toplam' : 'Total'}</td>
                    <td className="px-3 py-2 text-right font-mono">{TRY_FMT(viewing.totalDebit)}</td>
                    <td className="px-3 py-2 text-right font-mono">{TRY_FMT(viewing.totalCredit)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </DraggableModal>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/accounting/JournalTab.tsx
git commit -m "feat: add JournalTab - journal entry CRUD with debit/credit balancing"
```

---

### Task 11: EInvoiceTab Component

**Files:**
- Create: `src/components/accounting/EInvoiceTab.tsx`

- [ ] **Step 1: Create EInvoiceTab with e-invoice management**

```tsx
// src/components/accounting/EInvoiceTab.tsx
import { useState } from 'react'
import { Plus, Search, Eye, Check, Send, X, Trash2, Settings } from 'lucide-react'
import clsx from 'clsx'
import {
  useEInvoices, useCustomers, createEInvoice, approveEInvoice, sendEInvoice, cancelEInvoice,
  useEInvoiceConfig, saveEInvoiceConfig,
} from '../../lib/erp-hooks'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import DraggableModal from '../ui/DraggableModal'
import type { EInvoice, EInvoiceType, EInvoiceStatus } from '../../types/erp'
import { EINVOICE_STATUS_LABELS, EINVOICE_STATUS_STYLES, EINVOICE_TYPE_LABELS, TRY_FMT, DATE_FMT } from '../../types/erp'

const MANAGER_ROLES = ['PLATFORM_ADMIN', 'SUPER_ADMIN', 'GENEL_MUDUR', 'GM_YARDIMCISI', 'DIREKTOR', 'MUDUR']

interface InvoiceLineForm { productName: string; unit: string; quantity: string; unitPrice: string; taxRate: string }
const EMPTY_LINE: InvoiceLineForm = { productName: '', unit: 'ADET', quantity: '1', unitPrice: '0', taxRate: '20' }

export default function EInvoiceTab() {
  const { user } = useAuth()
  const { lang } = useLanguage()
  const canManage = MANAGER_ROLES.includes(user?.role?.toUpperCase() ?? '')
  const tr = lang === 'tr'

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const { invoices, loading, refetch } = useEInvoices({ search: search || undefined, status: statusFilter || undefined })
  const { customers } = useCustomers()
  const { config: einvoiceConfig, refetch: refetchConfig } = useEInvoiceConfig()

  const [creating, setCreating] = useState(false)
  const [viewing, setViewing] = useState<EInvoice | null>(null)
  const [configOpen, setConfigOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Create form
  const [invoiceType, setInvoiceType] = useState<EInvoiceType>('SATIS')
  const [customerId, setCustomerId] = useState('')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<InvoiceLineForm[]>([{ ...EMPTY_LINE }])

  // Config form
  const [cfgIntegrator, setCfgIntegrator] = useState('')
  const [cfgApiUrl, setCfgApiUrl] = useState('')
  const [cfgAlias, setCfgAlias] = useState('')
  const [cfgTestMode, setCfgTestMode] = useState(true)

  const addLine = () => setLines([...lines, { ...EMPTY_LINE }])
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i))
  const updateLine = (i: number, field: keyof InvoiceLineForm, value: string) => {
    const next = [...lines]
    next[i] = { ...next[i], [field]: value }
    setLines(next)
  }

  const calcLineTotal = (l: InvoiceLineForm) => {
    const qty = Number(l.quantity) || 0
    const price = Number(l.unitPrice) || 0
    const tax = Number(l.taxRate) || 0
    const subtotal = qty * price
    return subtotal + subtotal * tax / 100
  }

  const handleCreate = async () => {
    setSaving(true)
    try {
      await createEInvoice({
        type: invoiceType,
        customerId,
        issueDate,
        notes: notes || undefined,
        lines: lines.filter(l => l.productName).map(l => ({
          productName: l.productName,
          unit: l.unit,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
          taxRate: Number(l.taxRate),
        })),
      })
      setCreating(false)
      setCustomerId('')
      setNotes('')
      setLines([{ ...EMPTY_LINE }])
      refetch()
    } catch (e: any) { alert(e.message) }
    finally { setSaving(false) }
  }

  const handleAction = async (inv: EInvoice, action: 'approve' | 'send' | 'cancel') => {
    try {
      if (action === 'approve') await approveEInvoice(inv.id)
      else if (action === 'send') await sendEInvoice(inv.id)
      else await cancelEInvoice(inv.id)
      setViewing(null)
      refetch()
    } catch (e: any) { alert(e.message) }
  }

  const openConfig = () => {
    setCfgIntegrator(einvoiceConfig?.integratorType ?? 'FORIBA')
    setCfgApiUrl(einvoiceConfig?.integratorApiUrl ?? '')
    setCfgAlias(einvoiceConfig?.senderAlias ?? '')
    setCfgTestMode(einvoiceConfig?.testMode ?? true)
    setConfigOpen(true)
  }

  const handleSaveConfig = async () => {
    try {
      await saveEInvoiceConfig({
        integratorType: cfgIntegrator,
        integratorApiUrl: cfgApiUrl || null,
        senderAlias: cfgAlias || null,
        testMode: cfgTestMode,
      })
      setConfigOpen(false)
      refetchConfig()
    } catch (e: any) { alert(e.message) }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-4)]" />
          <input className="input pl-9 w-full" placeholder={tr ? 'Fatura ara...' : 'Search invoices...'} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">{tr ? 'Tum Durumlar' : 'All'}</option>
          {Object.entries(EINVOICE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {canManage && (
          <>
            <button onClick={openConfig} className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface)] text-[var(--text-3)]">
              <Settings className="w-4 h-4" />
            </button>
            <button onClick={() => setCreating(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600">
              <Plus className="w-4 h-4" />
              {tr ? 'Yeni E-Fatura' : 'New E-Invoice'}
            </button>
          </>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--text-3)]">{tr ? 'Yukleniyor...' : 'Loading...'}</div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-3)]">{tr ? 'Fatura bulunamadi' : 'No invoices found'}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Fatura No' : 'Invoice #'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Alici' : 'Receiver'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Tip' : 'Type'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Durum' : 'Status'}</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Tutar' : 'Total'}</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Tarih' : 'Date'}</th>
                <th className="text-right px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} className="border-b border-[var(--border)] hover:bg-[var(--surface)] cursor-pointer" onClick={() => setViewing(inv)}>
                  <td className="px-4 py-3 font-mono text-[var(--text-1)]">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3 text-[var(--text-2)]">{inv.receiverName}</td>
                  <td className="px-4 py-3 text-xs text-[var(--text-3)]">{EINVOICE_TYPE_LABELS[inv.type]}</td>
                  <td className="px-4 py-3"><span className={clsx('text-xs px-2 py-0.5 rounded-full border', EINVOICE_STATUS_STYLES[inv.status])}>{EINVOICE_STATUS_LABELS[inv.status]}</span></td>
                  <td className="px-4 py-3 text-right font-mono text-[var(--text-1)]">{TRY_FMT(inv.totalAmount)}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-3)]">{DATE_FMT(inv.issueDate)}</td>
                  <td className="px-4 py-3 text-right"><Eye className="w-4 h-4 text-[var(--text-4)]" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {creating && (
        <DraggableModal
          title={tr ? 'Yeni E-Fatura' : 'New E-Invoice'}
          onClose={() => setCreating(false)}
          width={680}
          footer={
            <div className="flex gap-2 justify-end">
              <button onClick={() => setCreating(false)} className="px-4 py-2 rounded-lg text-sm text-[var(--text-2)] hover:bg-[var(--surface)]">{tr ? 'Iptal' : 'Cancel'}</button>
              <button onClick={handleCreate} disabled={saving || !customerId} className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-50">
                {saving ? (tr ? 'Kaydediliyor...' : 'Saving...') : (tr ? 'Olustur' : 'Create')}
              </button>
            </div>
          }
        >
          <div className="space-y-4 p-1">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Fatura Tipi' : 'Type'}</label>
                <select className="select w-full" value={invoiceType} onChange={e => setInvoiceType(e.target.value as EInvoiceType)}>
                  {Object.entries(EINVOICE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Musteri *' : 'Customer *'}</label>
                <select className="select w-full" value={customerId} onChange={e => setCustomerId(e.target.value)}>
                  <option value="">{tr ? 'Sec...' : 'Select...'}</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Fatura Tarihi' : 'Issue Date'}</label>
                <input className="input w-full" type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-[var(--text-2)]">{tr ? 'Kalemler' : 'Lines'}</label>
                <button onClick={addLine} className="text-xs text-emerald-500 font-medium">+ {tr ? 'Kalem Ekle' : 'Add Line'}</button>
              </div>
              <div className="space-y-2">
                {lines.map((l, i) => (
                  <div key={i} className="grid grid-cols-[1fr_70px_70px_70px_70px_32px] gap-2 items-end">
                    <div>
                      {i === 0 && <label className="text-[10px] text-[var(--text-3)] mb-0.5 block">{tr ? 'Urun' : 'Product'}</label>}
                      <input className="input w-full" value={l.productName} onChange={e => updateLine(i, 'productName', e.target.value)} />
                    </div>
                    <div>
                      {i === 0 && <label className="text-[10px] text-[var(--text-3)] mb-0.5 block">{tr ? 'Birim' : 'Unit'}</label>}
                      <input className="input w-full" value={l.unit} onChange={e => updateLine(i, 'unit', e.target.value)} />
                    </div>
                    <div>
                      {i === 0 && <label className="text-[10px] text-[var(--text-3)] mb-0.5 block">{tr ? 'Adet' : 'Qty'}</label>}
                      <input className="input w-full" type="number" value={l.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)} />
                    </div>
                    <div>
                      {i === 0 && <label className="text-[10px] text-[var(--text-3)] mb-0.5 block">{tr ? 'Fiyat' : 'Price'}</label>}
                      <input className="input w-full" type="number" value={l.unitPrice} onChange={e => updateLine(i, 'unitPrice', e.target.value)} />
                    </div>
                    <div>
                      {i === 0 && <label className="text-[10px] text-[var(--text-3)] mb-0.5 block">KDV %</label>}
                      <input className="input w-full" type="number" value={l.taxRate} onChange={e => updateLine(i, 'taxRate', e.target.value)} />
                    </div>
                    <button onClick={() => removeLine(i)} className="p-1.5 rounded-md hover:bg-red-50 text-[var(--text-4)] hover:text-red-500" disabled={lines.length === 1}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Notlar' : 'Notes'}</label>
              <textarea className="input w-full h-14" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>
        </DraggableModal>
      )}

      {/* Detail Modal */}
      {viewing && (
        <DraggableModal
          title={viewing.invoiceNumber}
          subtitle={viewing.receiverName}
          onClose={() => setViewing(null)}
          width={600}
          footer={
            canManage ? (
              <div className="flex gap-2 justify-end">
                {viewing.status === 'TASLAK' && (
                  <button onClick={() => handleAction(viewing, 'approve')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-sm hover:bg-blue-600">
                    <Check className="w-3.5 h-3.5" />{tr ? 'Onayla' : 'Approve'}
                  </button>
                )}
                {viewing.status === 'ONAYLANDI' && (
                  <button onClick={() => handleAction(viewing, 'send')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-sm hover:bg-indigo-600">
                    <Send className="w-3.5 h-3.5" />{tr ? 'Gonder' : 'Send'}
                  </button>
                )}
                {['TASLAK', 'ONAYLANDI'].includes(viewing.status) && (
                  <button onClick={() => handleAction(viewing, 'cancel')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm hover:bg-red-600">
                    <X className="w-3.5 h-3.5" />{tr ? 'Iptal' : 'Cancel'}
                  </button>
                )}
              </div>
            ) : undefined
          }
        >
          <div className="space-y-3 p-1">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className={clsx('px-2 py-0.5 rounded-full border text-xs', EINVOICE_STATUS_STYLES[viewing.status])}>{EINVOICE_STATUS_LABELS[viewing.status]}</span>
              <span className="text-[var(--text-3)]">{EINVOICE_TYPE_LABELS[viewing.type]}</span>
              <span className="text-[var(--text-3)]">{DATE_FMT(viewing.issueDate)}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-[var(--text-3)]">{tr ? 'Gonderen:' : 'From:'}</span> <span className="text-[var(--text-1)]">{viewing.senderName}</span></div>
              <div><span className="text-[var(--text-3)]">{tr ? 'Alici:' : 'To:'}</span> <span className="text-[var(--text-1)]">{viewing.receiverName}</span></div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
                    <th className="text-left px-3 py-2 text-xs font-medium text-[var(--text-3)]">{tr ? 'Urun' : 'Product'}</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-[var(--text-3)]">{tr ? 'Miktar' : 'Qty'}</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-[var(--text-3)]">{tr ? 'Fiyat' : 'Price'}</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-[var(--text-3)]">KDV</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-[var(--text-3)]">{tr ? 'Toplam' : 'Total'}</th>
                  </tr>
                </thead>
                <tbody>
                  {viewing.lines.map(l => (
                    <tr key={l.id} className="border-b border-[var(--border)]">
                      <td className="px-3 py-2">{l.productName}</td>
                      <td className="px-3 py-2 text-right">{l.quantity} {l.unit}</td>
                      <td className="px-3 py-2 text-right font-mono">{TRY_FMT(l.unitPrice)}</td>
                      <td className="px-3 py-2 text-right">%{l.taxRate}</td>
                      <td className="px-3 py-2 text-right font-mono font-medium">{TRY_FMT(l.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[var(--surface)]">
                    <td colSpan={3} />
                    <td className="px-3 py-1.5 text-right text-xs text-[var(--text-3)]">KDV</td>
                    <td className="px-3 py-1.5 text-right font-mono">{TRY_FMT(viewing.taxAmount)}</td>
                  </tr>
                  <tr className="bg-[var(--surface)] font-bold">
                    <td colSpan={3} />
                    <td className="px-3 py-1.5 text-right text-xs">{tr ? 'TOPLAM' : 'TOTAL'}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{TRY_FMT(viewing.totalAmount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </DraggableModal>
      )}

      {/* Config Modal */}
      {configOpen && (
        <DraggableModal
          title={tr ? 'E-Fatura Ayarlari' : 'E-Invoice Settings'}
          icon={<Settings className="w-5 h-5 text-emerald-500" />}
          onClose={() => setConfigOpen(false)}
          width={460}
          footer={
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfigOpen(false)} className="px-4 py-2 rounded-lg text-sm text-[var(--text-2)] hover:bg-[var(--surface)]">{tr ? 'Iptal' : 'Cancel'}</button>
              <button onClick={handleSaveConfig} className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600">{tr ? 'Kaydet' : 'Save'}</button>
            </div>
          }
        >
          <div className="space-y-3 p-1">
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Entegrator' : 'Integrator'}</label>
              <select className="select w-full" value={cfgIntegrator} onChange={e => setCfgIntegrator(e.target.value)}>
                <option value="FORIBA">Foriba</option>
                <option value="PARABUS">Parabus</option>
                <option value="LOGO">Logo</option>
                <option value="CUSTOM">Ozel</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">API URL</label>
              <input className="input w-full" value={cfgApiUrl} onChange={e => setCfgApiUrl(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Gonderici Alias' : 'Sender Alias'}</label>
              <input className="input w-full" value={cfgAlias} onChange={e => setCfgAlias(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={cfgTestMode} onChange={e => setCfgTestMode(e.target.checked)} className="rounded" />
              <span className="text-sm text-[var(--text-2)]">{tr ? 'Test Modu' : 'Test Mode'}</span>
            </label>
          </div>
        </DraggableModal>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/accounting/EInvoiceTab.tsx
git commit -m "feat: add EInvoiceTab - e-invoice CRUD, status actions, config"
```

---

### Task 12: ReportsTab Component

**Files:**
- Create: `src/components/accounting/ReportsTab.tsx`

- [ ] **Step 1: Create ReportsTab with financial reports**

```tsx
// src/components/accounting/ReportsTab.tsx
import { useState } from 'react'
import { BarChart3, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import clsx from 'clsx'
import { useAccountingReport } from '../../lib/erp-hooks'
import { useLanguage } from '../../context/LanguageContext'
import { TRY_FMT } from '../../types/erp'

type ReportType = 'income-expense' | 'balance-sheet' | 'sales-summary' | 'einvoice-summary' | 'tax-summary' | 'cash-flow'

const REPORT_TYPES: { id: ReportType; labelTr: string; labelEn: string }[] = [
  { id: 'income-expense',    labelTr: 'Gelir-Gider',       labelEn: 'Income/Expense' },
  { id: 'balance-sheet',     labelTr: 'Bilanco',           labelEn: 'Balance Sheet' },
  { id: 'sales-summary',     labelTr: 'Satis Ozeti',       labelEn: 'Sales Summary' },
  { id: 'einvoice-summary',  labelTr: 'E-Fatura Ozeti',    labelEn: 'E-Invoice Summary' },
  { id: 'tax-summary',       labelTr: 'KDV Ozeti',         labelEn: 'Tax Summary' },
  { id: 'cash-flow',         labelTr: 'Nakit Akisi',       labelEn: 'Cash Flow' },
]

export default function ReportsTab() {
  const { lang } = useLanguage()
  const tr = lang === 'tr'

  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const today = now.toISOString().slice(0, 10)

  const [reportType, setReportType] = useState<ReportType>('income-expense')
  const [dateFrom, setDateFrom] = useState(firstOfMonth)
  const [dateTo, setDateTo] = useState(today)

  const { report, loading, error } = useAccountingReport(reportType, dateFrom, dateTo)

  const renderIncomeExpense = (data: any) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <h3 className="font-semibold text-[var(--text-1)]">{tr ? 'Gelirler' : 'Income'}</h3>
          <span className="ml-auto text-lg font-mono font-bold text-emerald-600">{TRY_FMT(data.income?.total)}</span>
        </div>
        {data.income?.accounts?.map((a: any) => (
          <div key={a.code} className="flex justify-between text-sm py-1 border-b border-[var(--border)] last:border-0">
            <span className="text-[var(--text-2)]">{a.code} - {a.name}</span>
            <span className="font-mono text-[var(--text-1)]">{TRY_FMT(a.amount)}</span>
          </div>
        ))}
      </div>
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown className="w-4 h-4 text-red-500" />
          <h3 className="font-semibold text-[var(--text-1)]">{tr ? 'Giderler' : 'Expenses'}</h3>
          <span className="ml-auto text-lg font-mono font-bold text-red-600">{TRY_FMT(data.expense?.total)}</span>
        </div>
        {data.expense?.accounts?.map((a: any) => (
          <div key={a.code} className="flex justify-between text-sm py-1 border-b border-[var(--border)] last:border-0">
            <span className="text-[var(--text-2)]">{a.code} - {a.name}</span>
            <span className="font-mono text-[var(--text-1)]">{TRY_FMT(a.amount)}</span>
          </div>
        ))}
      </div>
      <div className="md:col-span-2 card p-4 flex items-center justify-between">
        <span className="font-semibold text-[var(--text-1)]">{tr ? 'Net Kar/Zarar' : 'Net Profit/Loss'}</span>
        <span className={clsx('text-2xl font-mono font-bold', (data.profit ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600')}>{TRY_FMT(data.profit)}</span>
      </div>
    </div>
  )

  const renderBalanceSheet = (data: any) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {['assets', 'liabilities', 'equity'].map(section => {
        const label = section === 'assets' ? (tr ? 'Varliklar' : 'Assets') : section === 'liabilities' ? (tr ? 'Yukumlulukler' : 'Liabilities') : (tr ? 'Ozkaynaklar' : 'Equity')
        return (
          <div key={section} className="card p-4">
            <h3 className="font-semibold text-[var(--text-1)] mb-3">{label}: <span className="font-mono">{TRY_FMT(data[section]?.total)}</span></h3>
            {data[section]?.accounts?.map((a: any) => (
              <div key={a.code} className="flex justify-between text-sm py-1 border-b border-[var(--border)] last:border-0">
                <span className="text-[var(--text-2)]">{a.name}</span>
                <span className="font-mono text-[var(--text-1)]">{TRY_FMT(a.balance)}</span>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )

  const renderGeneric = (data: any) => (
    <div className="card p-4">
      <pre className="text-sm text-[var(--text-2)] whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select className="select" value={reportType} onChange={e => setReportType(e.target.value as ReportType)}>
          {REPORT_TYPES.map(r => <option key={r.id} value={r.id}>{tr ? r.labelTr : r.labelEn}</option>)}
        </select>
        <input className="input" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <span className="text-[var(--text-3)]">-</span>
        <input className="input" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--text-3)]">{tr ? 'Rapor yukleniyor...' : 'Loading report...'}</div>
      ) : error ? (
        <div className="text-center py-12 text-red-500">{error}</div>
      ) : !report ? (
        <div className="text-center py-12 text-[var(--text-3)]">{tr ? 'Veri bulunamadi' : 'No data'}</div>
      ) : (
        <>
          {reportType === 'income-expense' && renderIncomeExpense(report)}
          {reportType === 'balance-sheet' && renderBalanceSheet(report)}
          {!['income-expense', 'balance-sheet'].includes(reportType) && renderGeneric(report)}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/accounting/ReportsTab.tsx
git commit -m "feat: add ReportsTab - financial reports with date range picker"
```

---

### Task 13: HR Page Wrapper

**Files:**
- Create: `src/pages/HR.tsx`

- [ ] **Step 1: Create HR page with tab navigation**

```tsx
// src/pages/HR.tsx
import { useState } from 'react'
import { UserCog, Users, Calendar, Banknote } from 'lucide-react'
import clsx from 'clsx'
import { useLanguage } from '../context/LanguageContext'
import EmployeesTab from '../components/hr/EmployeesTab'
import LeavesTab from '../components/hr/LeavesTab'
import PayrollTab from '../components/hr/PayrollTab'

type HRTab = 'employees' | 'leaves' | 'payroll'

const TABS: { id: HRTab; icon: typeof Users; labelTr: string; labelEn: string }[] = [
  { id: 'employees', icon: Users,    labelTr: 'Calisanlar',  labelEn: 'Employees' },
  { id: 'leaves',    icon: Calendar, labelTr: 'Izinler',     labelEn: 'Leaves' },
  { id: 'payroll',   icon: Banknote, labelTr: 'Bordro',      labelEn: 'Payroll' },
]

export default function HRPage() {
  const [tab, setTab] = useState<HRTab>('employees')
  const { lang } = useLanguage()

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
          <UserCog className="w-5 h-5 text-violet-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--text-1)]">
            {lang === 'tr' ? 'Insan Kaynaklari' : 'Human Resources'}
          </h1>
          <p className="text-sm text-[var(--text-3)]">
            {lang === 'tr' ? 'Calisan, izin ve bordro yonetimi' : 'Employee, leave and payroll management'}
          </p>
        </div>
      </div>

      <div className="flex gap-1 p-1 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
              tab === t.id
                ? 'bg-violet-500 text-white shadow-sm'
                : 'text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg)]'
            )}
          >
            <t.icon className="w-4 h-4" />
            {lang === 'tr' ? t.labelTr : t.labelEn}
          </button>
        ))}
      </div>

      {tab === 'employees' && <EmployeesTab />}
      {tab === 'leaves' && <LeavesTab />}
      {tab === 'payroll' && <PayrollTab />}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/HR.tsx
git commit -m "feat: add HR page wrapper with tab navigation"
```

---

### Task 14: EmployeesTab Component

**Files:**
- Create: `src/components/hr/EmployeesTab.tsx`

- [ ] **Step 1: Create EmployeesTab with employee management**

```tsx
// src/components/hr/EmployeesTab.tsx
import { useState, useMemo } from 'react'
import { Plus, Search, Pencil, UserX, User } from 'lucide-react'
import clsx from 'clsx'
import { useEmployees, createEmployee, updateEmployee, terminateEmployee } from '../../lib/erp-hooks'
import { useDepartments } from '../../lib/hooks'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import DraggableModal from '../ui/DraggableModal'
import type { HREmployee, EmploymentStatus } from '../../types/erp'
import { EMPLOYMENT_STATUS_LABELS, EMPLOYMENT_STATUS_STYLES, TRY_FMT, DATE_FMT } from '../../types/erp'

const MANAGER_ROLES = ['PLATFORM_ADMIN', 'SUPER_ADMIN', 'GENEL_MUDUR', 'GM_YARDIMCISI', 'DIREKTOR', 'MUDUR']

export default function EmployeesTab() {
  const { user } = useAuth()
  const { lang } = useLanguage()
  const canManage = MANAGER_ROLES.includes(user?.role?.toUpperCase() ?? '')
  const tr = lang === 'tr'

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const { employees, loading, refetch } = useEmployees({ search: search || undefined, status: statusFilter || undefined })
  const { departments } = useDepartments()

  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<HREmployee | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    userId: '', startDate: new Date().toISOString().slice(0, 10), grossSalary: '',
    nationalId: '', sgkNumber: '', bankName: '', iban: '',
    emergencyContact: '', emergencyPhone: '', notes: '',
  })

  // All company users for userId select (reuse the users hook from existing hooks)
  // For simplicity, we'll use a basic fetch here
  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([])
  useState(() => {
    import('../../lib/api').then(({ api }) => {
      api.get<any>('/users?pageSize=500').then((res: any) => {
        setUsers((res.data ?? res ?? []).map((u: any) => ({ id: u.id, name: u.name, email: u.email })))
      }).catch(() => {})
    })
  })

  const openCreate = () => {
    setForm({ userId: '', startDate: new Date().toISOString().slice(0, 10), grossSalary: '', nationalId: '', sgkNumber: '', bankName: '', iban: '', emergencyContact: '', emergencyPhone: '', notes: '' })
    setCreating(true)
  }

  const openEdit = (emp: HREmployee) => {
    setForm({
      userId: emp.userId,
      startDate: emp.startDate?.slice(0, 10) ?? '',
      grossSalary: emp.grossSalary ? String(emp.grossSalary) : '',
      nationalId: emp.nationalId ?? '',
      sgkNumber: emp.sgkNumber ?? '',
      bankName: emp.bankName ?? '',
      iban: emp.iban ?? '',
      emergencyContact: emp.emergencyContact ?? '',
      emergencyPhone: emp.emergencyPhone ?? '',
      notes: emp.notes ?? '',
    })
    setEditing(emp)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = {
        userId: form.userId,
        startDate: form.startDate,
        grossSalary: Number(form.grossSalary) || 0,
        nationalId: form.nationalId || undefined,
        sgkNumber: form.sgkNumber || undefined,
        bankName: form.bankName || undefined,
        iban: form.iban || undefined,
        emergencyContact: form.emergencyContact || undefined,
        emergencyPhone: form.emergencyPhone || undefined,
        notes: form.notes || undefined,
      }
      if (editing) await updateEmployee(editing.id, body)
      else await createEmployee(body)
      setCreating(false)
      setEditing(null)
      refetch()
    } catch (e: any) { alert(e.message) }
    finally { setSaving(false) }
  }

  const handleTerminate = async (emp: HREmployee) => {
    if (!confirm(`${emp.user.name} calisaninin isine son vermek istediginizden emin misiniz?`)) return
    try { await terminateEmployee(emp.id); refetch() }
    catch (e: any) { alert(e.message) }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-4)]" />
          <input className="input pl-9 w-full" placeholder={tr ? 'Calisan ara...' : 'Search employees...'} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">{tr ? 'Tum Durumlar' : 'All'}</option>
          {Object.entries(EMPLOYMENT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {canManage && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500 text-white text-sm font-medium hover:bg-violet-600">
            <Plus className="w-4 h-4" />
            {tr ? 'Yeni Calisan' : 'New Employee'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--text-3)]">{tr ? 'Yukleniyor...' : 'Loading...'}</div>
      ) : employees.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-3)]">{tr ? 'Calisan bulunamadi' : 'No employees found'}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Calisan' : 'Employee'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Sicil No' : 'Employee #'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Departman' : 'Department'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Durum' : 'Status'}</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Brut Maas' : 'Gross Salary'}</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Ise Baslama' : 'Start Date'}</th>
                {canManage && <th className="text-right px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id} className="border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--text-1)]">{emp.user.name}</div>
                    <div className="text-xs text-[var(--text-3)]">{emp.user.email}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-[var(--text-2)]">{emp.employeeNumber}</td>
                  <td className="px-4 py-3 text-[var(--text-2)]">{emp.user.departments?.[0]?.name ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className={clsx('text-xs px-2 py-0.5 rounded-full border', EMPLOYMENT_STATUS_STYLES[emp.employmentStatus])}>
                      {EMPLOYMENT_STATUS_LABELS[emp.employmentStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[var(--text-1)]">{TRY_FMT(emp.grossSalary)}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-3)]">{DATE_FMT(emp.startDate)}</td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(emp)} className="p-1.5 rounded-md hover:bg-[var(--bg)] text-[var(--text-3)] hover:text-violet-500"><Pencil className="w-4 h-4" /></button>
                        {emp.employmentStatus === 'AKTIF' && (
                          <button onClick={() => handleTerminate(emp)} className="p-1.5 rounded-md hover:bg-[var(--bg)] text-[var(--text-3)] hover:text-red-500"><UserX className="w-4 h-4" /></button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(creating || editing) && (
        <DraggableModal
          title={editing ? (tr ? 'Calisan Duzenle' : 'Edit Employee') : (tr ? 'Yeni Calisan' : 'New Employee')}
          icon={<User className="w-5 h-5 text-violet-500" />}
          onClose={() => { setCreating(false); setEditing(null) }}
          width={560}
          footer={
            <div className="flex justify-end gap-2">
              <button onClick={() => { setCreating(false); setEditing(null) }} className="px-4 py-2 rounded-lg text-sm text-[var(--text-2)] hover:bg-[var(--surface)]">{tr ? 'Iptal' : 'Cancel'}</button>
              <button onClick={handleSave} disabled={saving || (!editing && !form.userId)} className="px-4 py-2 rounded-lg bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 disabled:opacity-50">
                {saving ? (tr ? 'Kaydediliyor...' : 'Saving...') : (tr ? 'Kaydet' : 'Save')}
              </button>
            </div>
          }
        >
          <div className="space-y-3 p-1">
            {!editing && (
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Kullanici *' : 'User *'}</label>
                <select className="select w-full" value={form.userId} onChange={e => setForm({ ...form, userId: e.target.value })}>
                  <option value="">{tr ? 'Kullanici secin...' : 'Select user...'}</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Ise Baslama *' : 'Start Date *'}</label>
                <input className="input w-full" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Brut Maas *' : 'Gross Salary *'}</label>
                <input className="input w-full" type="number" value={form.grossSalary} onChange={e => setForm({ ...form, grossSalary: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'TC Kimlik No' : 'National ID'}</label>
                <input className="input w-full" value={form.nationalId} onChange={e => setForm({ ...form, nationalId: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'SGK No' : 'SSI Number'}</label>
                <input className="input w-full" value={form.sgkNumber} onChange={e => setForm({ ...form, sgkNumber: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Banka' : 'Bank'}</label>
                <input className="input w-full" value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">IBAN</label>
                <input className="input w-full" value={form.iban} onChange={e => setForm({ ...form, iban: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Acil Kisi' : 'Emergency Contact'}</label>
                <input className="input w-full" value={form.emergencyContact} onChange={e => setForm({ ...form, emergencyContact: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Acil Telefon' : 'Emergency Phone'}</label>
                <input className="input w-full" value={form.emergencyPhone} onChange={e => setForm({ ...form, emergencyPhone: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Notlar' : 'Notes'}</label>
              <textarea className="input w-full h-16" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
        </DraggableModal>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/hr/EmployeesTab.tsx
git commit -m "feat: add EmployeesTab - employee CRUD with status, salary, contacts"
```

---

### Task 15: LeavesTab Component

**Files:**
- Create: `src/components/hr/LeavesTab.tsx`

- [ ] **Step 1: Create LeavesTab with leave request management**

```tsx
// src/components/hr/LeavesTab.tsx
import { useState } from 'react'
import { Plus, Search, Check, X } from 'lucide-react'
import clsx from 'clsx'
import { useLeaves, useEmployees, requestLeave, approveLeave, rejectLeave, cancelLeave } from '../../lib/erp-hooks'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import DraggableModal from '../ui/DraggableModal'
import type { HRLeave, LeaveType, LeaveStatus } from '../../types/erp'
import { LEAVE_TYPE_LABELS, LEAVE_STATUS_LABELS, LEAVE_STATUS_STYLES, DATE_FMT } from '../../types/erp'

const MANAGER_ROLES = ['PLATFORM_ADMIN', 'SUPER_ADMIN', 'GENEL_MUDUR', 'GM_YARDIMCISI', 'DIREKTOR', 'MUDUR']

export default function LeavesTab() {
  const { user } = useAuth()
  const { lang } = useLanguage()
  const canManage = MANAGER_ROLES.includes(user?.role?.toUpperCase() ?? '')
  const tr = lang === 'tr'

  const [statusFilter, setStatusFilter] = useState('')
  const { leaves, loading, refetch } = useLeaves({ status: statusFilter || undefined })
  const { employees } = useEmployees({ status: 'AKTIF' })

  const [creating, setCreating] = useState(false)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    employeeId: '', leaveType: 'YILLIK' as LeaveType,
    startDate: '', endDate: '', reason: '',
  })

  const handleCreate = async () => {
    setSaving(true)
    try {
      await requestLeave({
        employeeId: form.employeeId,
        leaveType: form.leaveType,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason || undefined,
      })
      setCreating(false)
      setForm({ employeeId: '', leaveType: 'YILLIK', startDate: '', endDate: '', reason: '' })
      refetch()
    } catch (e: any) { alert(e.message) }
    finally { setSaving(false) }
  }

  const handleApprove = async (id: string) => {
    try { await approveLeave(id); refetch() }
    catch (e: any) { alert(e.message) }
  }

  const handleReject = async () => {
    if (!rejectingId) return
    try { await rejectLeave(rejectingId, rejectReason || undefined); setRejectingId(null); setRejectReason(''); refetch() }
    catch (e: any) { alert(e.message) }
  }

  const handleCancel = async (id: string) => {
    if (!confirm(tr ? 'Izin talebini iptal etmek istiyor musunuz?' : 'Cancel this leave request?')) return
    try { await cancelLeave(id); refetch() }
    catch (e: any) { alert(e.message) }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select className="select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">{tr ? 'Tum Durumlar' : 'All'}</option>
          {Object.entries(LEAVE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {canManage && (
          <button onClick={() => setCreating(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500 text-white text-sm font-medium hover:bg-violet-600">
            <Plus className="w-4 h-4" />
            {tr ? 'Izin Talebi' : 'Leave Request'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--text-3)]">{tr ? 'Yukleniyor...' : 'Loading...'}</div>
      ) : leaves.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-3)]">{tr ? 'Izin talebi bulunamadi' : 'No leave requests found'}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Calisan' : 'Employee'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Izin Turu' : 'Leave Type'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Tarih' : 'Dates'}</th>
                <th className="text-center px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Gun' : 'Days'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Durum' : 'Status'}</th>
                {canManage && <th className="text-right px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {leaves.map(l => (
                <tr key={l.id} className="border-b border-[var(--border)] hover:bg-[var(--surface)]">
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--text-1)]">{l.employee?.user.name ?? '-'}</div>
                    <div className="text-xs text-[var(--text-3)]">{l.employee?.employeeNumber}</div>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-2)]">{LEAVE_TYPE_LABELS[l.leaveType]}</td>
                  <td className="px-4 py-3 text-[var(--text-2)]">{DATE_FMT(l.startDate)} - {DATE_FMT(l.endDate)}</td>
                  <td className="px-4 py-3 text-center font-medium text-[var(--text-1)]">{l.days}</td>
                  <td className="px-4 py-3">
                    <span className={clsx('text-xs px-2 py-0.5 rounded-full border', LEAVE_STATUS_STYLES[l.status])}>{LEAVE_STATUS_LABELS[l.status]}</span>
                  </td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      {l.status === 'BEKLIYOR' && (
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleApprove(l.id)} className="p-1.5 rounded-md hover:bg-emerald-50 text-[var(--text-3)] hover:text-emerald-500" title={tr ? 'Onayla' : 'Approve'}>
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setRejectingId(l.id); setRejectReason('') }} className="p-1.5 rounded-md hover:bg-red-50 text-[var(--text-3)] hover:text-red-500" title={tr ? 'Reddet' : 'Reject'}>
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      {['BEKLIYOR', 'ONAYLANDI'].includes(l.status) && (
                        <button onClick={() => handleCancel(l.id)} className="text-xs text-red-500 hover:text-red-600 ml-2">
                          {tr ? 'Iptal' : 'Cancel'}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {creating && (
        <DraggableModal
          title={tr ? 'Izin Talebi' : 'Leave Request'}
          onClose={() => setCreating(false)}
          width={460}
          footer={
            <div className="flex gap-2 justify-end">
              <button onClick={() => setCreating(false)} className="px-4 py-2 rounded-lg text-sm text-[var(--text-2)] hover:bg-[var(--surface)]">{tr ? 'Iptal' : 'Cancel'}</button>
              <button onClick={handleCreate} disabled={saving || !form.employeeId || !form.startDate || !form.endDate} className="px-4 py-2 rounded-lg bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 disabled:opacity-50">
                {saving ? (tr ? 'Gonderiliyor...' : 'Submitting...') : (tr ? 'Talep Olustur' : 'Submit')}
              </button>
            </div>
          }
        >
          <div className="space-y-3 p-1">
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Calisan *' : 'Employee *'}</label>
              <select className="select w-full" value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })}>
                <option value="">{tr ? 'Calisan secin...' : 'Select...'}</option>
                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.user.name} ({emp.employeeNumber})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Izin Turu' : 'Leave Type'}</label>
              <select className="select w-full" value={form.leaveType} onChange={e => setForm({ ...form, leaveType: e.target.value as LeaveType })}>
                {Object.entries(LEAVE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Baslangic *' : 'Start *'}</label>
                <input className="input w-full" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Bitis *' : 'End *'}</label>
                <input className="input w-full" type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Neden' : 'Reason'}</label>
              <textarea className="input w-full h-16" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
            </div>
          </div>
        </DraggableModal>
      )}

      {/* Reject Modal */}
      {rejectingId && (
        <DraggableModal
          title={tr ? 'Izin Reddi' : 'Reject Leave'}
          onClose={() => setRejectingId(null)}
          width={400}
          footer={
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRejectingId(null)} className="px-4 py-2 rounded-lg text-sm text-[var(--text-2)] hover:bg-[var(--surface)]">{tr ? 'Iptal' : 'Cancel'}</button>
              <button onClick={handleReject} className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600">{tr ? 'Reddet' : 'Reject'}</button>
            </div>
          }
        >
          <div className="p-1">
            <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Red Nedeni' : 'Rejection Reason'}</label>
            <textarea className="input w-full h-20" value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder={tr ? 'Opsiyonel...' : 'Optional...'} />
          </div>
        </DraggableModal>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/hr/LeavesTab.tsx
git commit -m "feat: add LeavesTab - leave request, approve, reject, cancel"
```

---

### Task 16: PayrollTab Component

**Files:**
- Create: `src/components/hr/PayrollTab.tsx`

- [ ] **Step 1: Create PayrollTab with payroll period management**

```tsx
// src/components/hr/PayrollTab.tsx
import { useState } from 'react'
import { Plus, Calculator, Check, Eye, ChevronDown, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { usePayrollPeriods, usePayrollRecords, createPayrollPeriod, calculatePayroll, approvePayroll } from '../../lib/erp-hooks'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import DraggableModal from '../ui/DraggableModal'
import type { PayrollPeriod, PayrollRecord } from '../../types/erp'
import { PAYROLL_STATUS_LABELS, PAYROLL_STATUS_STYLES, MONTH_LABELS, TRY_FMT } from '../../types/erp'

const MANAGER_ROLES = ['PLATFORM_ADMIN', 'SUPER_ADMIN', 'GENEL_MUDUR', 'GM_YARDIMCISI', 'DIREKTOR', 'MUDUR']

export default function PayrollTab() {
  const { user } = useAuth()
  const { lang } = useLanguage()
  const canManage = MANAGER_ROLES.includes(user?.role?.toUpperCase() ?? '')
  const tr = lang === 'tr'

  const { periods, loading, refetch } = usePayrollPeriods()
  const [creating, setCreating] = useState(false)
  const [viewingPeriodId, setViewingPeriodId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const now = new Date()
  const [newYear, setNewYear] = useState(now.getFullYear())
  const [newMonth, setNewMonth] = useState(now.getMonth() + 1)

  const handleCreate = async () => {
    setSaving(true)
    try {
      await createPayrollPeriod({ year: newYear, month: newMonth })
      setCreating(false)
      refetch()
    } catch (e: any) { alert(e.message) }
    finally { setSaving(false) }
  }

  const handleCalculate = async (period: PayrollPeriod) => {
    try { await calculatePayroll(period.id); refetch() }
    catch (e: any) { alert(e.message) }
  }

  const handleApprove = async (period: PayrollPeriod) => {
    if (!confirm(tr ? 'Bordroyu onaylamak istiyor musunuz?' : 'Approve this payroll?')) return
    try { await approvePayroll(period.id); refetch() }
    catch (e: any) { alert(e.message) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {canManage && (
          <button onClick={() => setCreating(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500 text-white text-sm font-medium hover:bg-violet-600">
            <Plus className="w-4 h-4" />
            {tr ? 'Yeni Donem' : 'New Period'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--text-3)]">{tr ? 'Yukleniyor...' : 'Loading...'}</div>
      ) : periods.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-3)]">{tr ? 'Bordro donemi bulunamadi' : 'No payroll periods found'}</div>
      ) : (
        <div className="space-y-3">
          {periods.sort((a, b) => b.year - a.year || b.month - a.month).map(period => (
            <div key={period.id} className="card p-4">
              <div className="flex items-center gap-3">
                <button onClick={() => setViewingPeriodId(viewingPeriodId === period.id ? null : period.id)} className="p-1 rounded hover:bg-[var(--surface)]">
                  {viewingPeriodId === period.id ? <ChevronDown className="w-4 h-4 text-[var(--text-3)]" /> : <ChevronRight className="w-4 h-4 text-[var(--text-3)]" />}
                </button>
                <div className="flex-1">
                  <div className="font-semibold text-[var(--text-1)]">{MONTH_LABELS[period.month]} {period.year}</div>
                  <div className="text-xs text-[var(--text-3)]">{period._count?.records ?? 0} {tr ? 'calisan' : 'employees'}</div>
                </div>
                <span className={clsx('text-xs px-2 py-0.5 rounded-full border', PAYROLL_STATUS_STYLES[period.status])}>
                  {PAYROLL_STATUS_LABELS[period.status]}
                </span>
                {period.totalNet && (
                  <span className="text-sm font-mono font-medium text-[var(--text-1)]">{tr ? 'Net' : 'Net'}: {TRY_FMT(period.totalNet)}</span>
                )}
                {canManage && period.status === 'TASLAK' && (
                  <button onClick={() => handleCalculate(period)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs hover:bg-blue-600">
                    <Calculator className="w-3.5 h-3.5" />{tr ? 'Hesapla' : 'Calculate'}
                  </button>
                )}
                {canManage && period.status === 'HESAPLANDI' && (
                  <button onClick={() => handleApprove(period)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs hover:bg-emerald-600">
                    <Check className="w-3.5 h-3.5" />{tr ? 'Onayla' : 'Approve'}
                  </button>
                )}
              </div>

              {/* Summary row */}
              {(period.totalGross || period.totalNet) && (
                <div className="flex gap-6 mt-2 text-xs text-[var(--text-3)]">
                  <span>{tr ? 'Brut' : 'Gross'}: <span className="font-mono text-[var(--text-2)]">{TRY_FMT(period.totalGross)}</span></span>
                  <span>SGK: <span className="font-mono text-[var(--text-2)]">{TRY_FMT(period.totalSgk)}</span></span>
                  <span>{tr ? 'Vergi' : 'Tax'}: <span className="font-mono text-[var(--text-2)]">{TRY_FMT(period.totalTax)}</span></span>
                  <span>{tr ? 'Net' : 'Net'}: <span className="font-mono font-medium text-[var(--text-1)]">{TRY_FMT(period.totalNet)}</span></span>
                </div>
              )}

              {/* Records expansion */}
              {viewingPeriodId === period.id && <PayrollRecordsTable periodId={period.id} />}
            </div>
          ))}
        </div>
      )}

      {/* Create Period Modal */}
      {creating && (
        <DraggableModal
          title={tr ? 'Yeni Bordro Donemi' : 'New Payroll Period'}
          onClose={() => setCreating(false)}
          width={360}
          footer={
            <div className="flex gap-2 justify-end">
              <button onClick={() => setCreating(false)} className="px-4 py-2 rounded-lg text-sm text-[var(--text-2)] hover:bg-[var(--surface)]">{tr ? 'Iptal' : 'Cancel'}</button>
              <button onClick={handleCreate} disabled={saving} className="px-4 py-2 rounded-lg bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 disabled:opacity-50">
                {saving ? (tr ? 'Olusturuluyor...' : 'Creating...') : (tr ? 'Olustur' : 'Create')}
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-2 gap-3 p-1">
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Yil' : 'Year'}</label>
              <input className="input w-full" type="number" value={newYear} onChange={e => setNewYear(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Ay' : 'Month'}</label>
              <select className="select w-full" value={newMonth} onChange={e => setNewMonth(Number(e.target.value))}>
                {Object.entries(MONTH_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
        </DraggableModal>
      )}
    </div>
  )
}

function PayrollRecordsTable({ periodId }: { periodId: string }) {
  const { lang } = useLanguage()
  const tr = lang === 'tr'
  const { records, loading } = usePayrollRecords(periodId)

  if (loading) return <div className="text-center py-4 text-sm text-[var(--text-3)]">{tr ? 'Yukleniyor...' : 'Loading...'}</div>
  if (records.length === 0) return <div className="text-center py-4 text-sm text-[var(--text-3)]">{tr ? 'Kayit yok' : 'No records'}</div>

  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--border)]">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
            <th className="text-left px-3 py-2 font-medium text-[var(--text-3)]">{tr ? 'Calisan' : 'Employee'}</th>
            <th className="text-right px-3 py-2 font-medium text-[var(--text-3)]">{tr ? 'Brut' : 'Gross'}</th>
            <th className="text-right px-3 py-2 font-medium text-[var(--text-3)]">SGK</th>
            <th className="text-right px-3 py-2 font-medium text-[var(--text-3)]">{tr ? 'Gelir V.' : 'Income Tax'}</th>
            <th className="text-right px-3 py-2 font-medium text-[var(--text-3)]">{tr ? 'Damga' : 'Stamp'}</th>
            <th className="text-right px-3 py-2 font-medium text-[var(--text-3)]">{tr ? 'Kesintiler' : 'Deductions'}</th>
            <th className="text-right px-3 py-2 font-medium text-[var(--text-3)]">{tr ? 'Net' : 'Net'}</th>
          </tr>
        </thead>
        <tbody>
          {records.map(r => (
            <tr key={r.id} className="border-b border-[var(--border)]">
              <td className="px-3 py-2 text-[var(--text-1)]">{r.employee?.user.name ?? '-'}</td>
              <td className="px-3 py-2 text-right font-mono">{TRY_FMT(r.grossSalary)}</td>
              <td className="px-3 py-2 text-right font-mono">{TRY_FMT(r.sgkEmployee)}</td>
              <td className="px-3 py-2 text-right font-mono">{TRY_FMT(r.incomeTax)}</td>
              <td className="px-3 py-2 text-right font-mono">{TRY_FMT(r.stampTax)}</td>
              <td className="px-3 py-2 text-right font-mono">{TRY_FMT(r.totalDeductions)}</td>
              <td className="px-3 py-2 text-right font-mono font-medium text-[var(--text-1)]">{TRY_FMT(r.netSalary)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/hr/PayrollTab.tsx
git commit -m "feat: add PayrollTab - payroll periods, calculate, approve, records"
```

---

## Self-Review Checklist

**1. Spec Coverage:**
- [x] Sales: Customers (CRUD), Orders (CRUD + status actions + payments), POS (product search, cart, checkout, receipt)
- [x] Accounting: Chart of Accounts (CRUD + seed defaults), Journal Entries (CRUD + approve/cancel), E-Invoice (CRUD + approve/send/cancel + config), Reports (6 report types with date range)
- [x] HR: Employees (CRUD + terminate), Leaves (request + approve/reject/cancel), Payroll (period CRUD + calculate + approve + records view)
- [x] Module gating: AuthContext hasModule, Sidebar filtering, Route setup

**2. Placeholder Scan:** No TBDs, TODOs, or "similar to Task N" found.

**3. Type Consistency:** All types, hook names, and function signatures are consistent across tasks. Verified imports match exports.

**4. Missing items addressed:**
- Branches/Tills are available through hooks but not given a dedicated tab (POS uses them via selects). This matches the user's request scope.
- Attendance hooks are defined but no dedicated tab (user asked for calisan, izin, bordro only).
