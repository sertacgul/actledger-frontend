# KAM Veri Export (Onay Mekanizmali) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** KAM'in tarih araligina gore firma verilerini Excel export talep etmesi, Genel Mudur onayiyla dosyanin olusturulmasi.

**Architecture:** Backend'de DataExportRequest tablosu ile talep-onay akisi. Export onayla diginda backend multi-sheet Excel dosyasini olusturur, uploads/ dizinine kaydeder, sureli link ile KAM'a sunar. Bildirimler mevcut createAndPush fonksiyonu ile gonderilir.

**Tech Stack:** Prisma + Express + xlsx (backend), React + TypeScript (frontend)

---

## File Structure

### Backend (actledger-backend):
- Modify: `prisma/schema.prisma` - DataExportRequest model
- Create: `prisma/migrations/20260512_data_export_request/migration.sql`
- Create: `src/modules/data-export/data-export.service.ts`
- Create: `src/modules/data-export/data-export.router.ts`
- Modify: `src/app.ts` - register router

### Frontend (actledger-frontend):
- Create: `src/components/settings/DataExportTab.tsx`
- Modify: `src/pages/AdminPanel.tsx` - tab ekleme
- Modify: `src/lib/erp-hooks.ts` - export hooks

---

### Task 1: Backend - Prisma Model + Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260512_data_export_request/migration.sql`

- [ ] **Step 1: Add DataExportRequest model and enum to schema.prisma**

After the UserModuleAccess model, add:

```prisma
enum DataExportStatus {
  BEKLIYOR
  ONAYLANDI
  REDDEDILDI
  HAZIRLANIYOR
  TAMAMLANDI
  SURESI_DOLDU
}

model DataExportRequest {
  id              String           @id @default(cuid())
  companyId       String
  requestedById   String
  status          DataExportStatus @default(BEKLIYOR)
  dateFrom        DateTime
  dateTo          DateTime
  departmentId    String?
  approvedById    String?
  approvedAt      DateTime?
  rejectedReason  String?
  fileUrl         String?
  expiresAt       DateTime?
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  company         Company          @relation(fields: [companyId], references: [id], onDelete: Cascade)
  requestedBy     User             @relation("exportRequester", fields: [requestedById], references: [id])
  approvedBy      User?            @relation("exportApprover", fields: [approvedById], references: [id])

  @@index([companyId])
  @@index([requestedById])
  @@index([status])
}
```

Add reverse relations to User model:

```prisma
  exportRequests         DataExportRequest[] @relation("exportRequester")
  exportApprovals        DataExportRequest[] @relation("exportApprover")
```

Add relation to Company model:

```prisma
  dataExportRequests     DataExportRequest[]
```

- [ ] **Step 2: Create migration SQL**

```sql
-- CreateEnum
CREATE TYPE "DataExportStatus" AS ENUM ('BEKLIYOR', 'ONAYLANDI', 'REDDEDILDI', 'HAZIRLANIYOR', 'TAMAMLANDI', 'SURESI_DOLDU');

-- CreateTable
CREATE TABLE "DataExportRequest" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "status" "DataExportStatus" NOT NULL DEFAULT 'BEKLIYOR',
    "dateFrom" TIMESTAMP(3) NOT NULL,
    "dateTo" TIMESTAMP(3) NOT NULL,
    "departmentId" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "fileUrl" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataExportRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DataExportRequest_companyId_idx" ON "DataExportRequest"("companyId");
CREATE INDEX "DataExportRequest_requestedById_idx" ON "DataExportRequest"("requestedById");
CREATE INDEX "DataExportRequest_status_idx" ON "DataExportRequest"("status");

-- AddForeignKey
ALTER TABLE "DataExportRequest" ADD CONSTRAINT "DataExportRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DataExportRequest" ADD CONSTRAINT "DataExportRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DataExportRequest" ADD CONSTRAINT "DataExportRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

- [ ] **Step 3: Commit**

```bash
git add prisma/
git commit -m "feat: add DataExportRequest model for KAM export with GM approval"
```

---

### Task 2: Backend - Data Export Service

**Files:**
- Create: `src/modules/data-export/data-export.service.ts`

- [ ] **Step 1: Create data export service**

```typescript
import prisma from '../../core/prisma/prisma.client'
import { NotFoundError, ForbiddenError } from '../../utils/errors'
import { createAndPush } from '../notifications/notifications.service'
import * as XLSX from 'xlsx'
import fs from 'fs'
import path from 'path'

const EXPORT_SELECT = {
  id: true, companyId: true, status: true,
  dateFrom: true, dateTo: true, departmentId: true,
  fileUrl: true, expiresAt: true, rejectedReason: true,
  createdAt: true, updatedAt: true,
  requestedBy: { select: { id: true, name: true, email: true } },
  approvedBy: { select: { id: true, name: true } },
}

export async function createExportRequest(companyId: string, requestedById: string, dto: {
  dateFrom: string; dateTo: string; departmentId?: string
}) {
  const request = await prisma.dataExportRequest.create({
    data: {
      companyId,
      requestedById,
      dateFrom: new Date(dto.dateFrom),
      dateTo: new Date(dto.dateTo),
      departmentId: dto.departmentId || null,
    },
    select: EXPORT_SELECT,
  })

  // Notify Genel Mudur(s)
  const gms = await prisma.user.findMany({
    where: { companyId, role: 'GENEL_MUDUR', active: true },
    select: { id: true },
  })
  const requester = await prisma.user.findUnique({ where: { id: requestedById }, select: { name: true } })
  for (const gm of gms) {
    await createAndPush({
      companyId, userId: gm.id,
      title: 'Veri Export Talebi',
      message: `${requester?.name ?? 'KAM'} veri export talebi olusturdu. Onayiniz bekleniyor.`,
      type: 'SISTEM',
      link: '/admin',
    }).catch(() => {})
  }

  // Notify department managers (info only)
  const managers = await prisma.user.findMany({
    where: { companyId, role: 'MUDUR', active: true },
    select: { id: true },
  })
  for (const mgr of managers) {
    await createAndPush({
      companyId, userId: mgr.id,
      title: 'Veri Export Bildirimi',
      message: `${requester?.name ?? 'KAM'} veri export talebi olusturdu. Bilginize.`,
      type: 'SISTEM',
    }).catch(() => {})
  }

  return request
}

export async function listMyRequests(companyId: string, requestedById: string) {
  return prisma.dataExportRequest.findMany({
    where: { companyId, requestedById },
    select: EXPORT_SELECT,
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
}

export async function listPendingRequests(companyId: string) {
  return prisma.dataExportRequest.findMany({
    where: { companyId, status: 'BEKLIYOR' },
    select: EXPORT_SELECT,
    orderBy: { createdAt: 'desc' },
  })
}

export async function approveRequest(companyId: string, id: string, approvedById: string) {
  const req = await prisma.dataExportRequest.findFirst({ where: { id, companyId, status: 'BEKLIYOR' } })
  if (!req) throw new NotFoundError('Export talebi')

  // Mark as approved then building
  await prisma.dataExportRequest.update({
    where: { id },
    data: { status: 'ONAYLANDI', approvedById, approvedAt: new Date() },
  })

  // Generate export file async
  generateExportFile(id, companyId, req.dateFrom, req.dateTo, req.departmentId, req.requestedById).catch(console.error)

  return prisma.dataExportRequest.findUnique({ where: { id }, select: EXPORT_SELECT })
}

export async function rejectRequest(companyId: string, id: string, approvedById: string, reason?: string) {
  const req = await prisma.dataExportRequest.findFirst({ where: { id, companyId, status: 'BEKLIYOR' } })
  if (!req) throw new NotFoundError('Export talebi')

  const updated = await prisma.dataExportRequest.update({
    where: { id },
    data: { status: 'REDDEDILDI', approvedById, approvedAt: new Date(), rejectedReason: reason || null },
    select: EXPORT_SELECT,
  })

  // Notify requester
  await createAndPush({
    companyId, userId: req.requestedById,
    title: 'Export Talebi Reddedildi',
    message: reason ? `Talebiniz reddedildi: ${reason}` : 'Veri export talebiniz reddedildi.',
    type: 'SISTEM', link: '/admin',
  }).catch(() => {})

  return updated
}

async function generateExportFile(
  requestId: string, companyId: string,
  dateFrom: Date, dateTo: Date,
  departmentId: string | null, requestedById: string,
) {
  await prisma.dataExportRequest.update({ where: { id: requestId }, data: { status: 'HAZIRLANIYOR' } })

  try {
    const dateFilter = { gte: dateFrom, lte: dateTo }
    const deptFilter = departmentId ? { departmentId } : {}

    // Fetch all data
    const [departments, users, tasks, inventory, stockItems, stockMovements,
      workOrders, customers, orders, accounts, journal, einvoices,
      employees, leaves, payrollPeriods] = await Promise.all([
      prisma.department.findMany({ where: { companyId, createdAt: dateFilter } }),
      prisma.user.findMany({ where: { companyId, createdAt: dateFilter }, select: { id: true, name: true, email: true, role: true, createdAt: true } }),
      prisma.task.findMany({ where: { companyId, createdAt: dateFilter, ...deptFilter } }),
      prisma.inventoryItem.findMany({ where: { companyId, createdAt: dateFilter, ...deptFilter } }),
      prisma.stockItem.findMany({ where: { companyId, updatedAt: dateFilter, ...deptFilter } }),
      prisma.stockMovement.findMany({ where: { companyId, createdAt: dateFilter } }),
      prisma.workOrder.findMany({ where: { companyId, createdAt: dateFilter } }),
      prisma.customer.findMany({ where: { companyId, createdAt: dateFilter } }).catch(() => []),
      prisma.salesOrder.findMany({ where: { companyId, createdAt: dateFilter }, include: { customer: { select: { name: true } } } }).catch(() => []),
      prisma.account.findMany({ where: { companyId } }).catch(() => []),
      prisma.journalEntry.findMany({ where: { companyId, date: dateFilter } }).catch(() => []),
      prisma.eInvoice.findMany({ where: { companyId, issueDate: dateFilter } }).catch(() => []),
      prisma.employee.findMany({ where: { companyId, createdAt: dateFilter }, include: { user: { select: { name: true, email: true } } } }).catch(() => []),
      prisma.leaveRequest.findMany({ where: { companyId, createdAt: dateFilter }, include: { employee: { include: { user: { select: { name: true } } } } } }).catch(() => []),
      prisma.payrollPeriod.findMany({ where: { companyId, createdAt: dateFilter } }).catch(() => []),
    ])

    // Build workbook
    const wb = XLSX.utils.book_new()

    const addSheet = (name: string, data: any[], cols: { h: string; k: string }[]) => {
      const rows = data.map(r => cols.map(c => {
        const keys = c.k.split('.')
        let val: any = r
        for (const key of keys) val = val?.[key]
        return val ?? ''
      }))
      const ws = XLSX.utils.aoa_to_sheet([cols.map(c => c.h), ...rows])
      XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31))
    }

    addSheet('Departmanlar', departments, [{ h: 'Ad', k: 'name' }, { h: 'Kod', k: 'code' }])
    addSheet('Kullanicilar', users, [{ h: 'Ad', k: 'name' }, { h: 'E-posta', k: 'email' }, { h: 'Rol', k: 'role' }])
    addSheet('Gorevler', tasks, [{ h: 'Baslik', k: 'title' }, { h: 'Durum', k: 'status' }, { h: 'Oncelik', k: 'priority' }])
    addSheet('Envanter', inventory, [{ h: 'Ad', k: 'name' }, { h: 'Tip', k: 'type' }, { h: 'Miktar', k: 'quantity' }])
    addSheet('Stok', stockItems, [{ h: 'Ad', k: 'name' }, { h: 'Miktar', k: 'quantity' }, { h: 'Min', k: 'minLevel' }])
    addSheet('Stok Hareketleri', stockMovements, [{ h: 'Tip', k: 'type' }, { h: 'Miktar', k: 'quantity' }])
    addSheet('Is Siparisleri', workOrders, [{ h: 'Kod', k: 'code' }, { h: 'Baslik', k: 'title' }, { h: 'Durum', k: 'status' }])
    addSheet('Musteriler', customers, [{ h: 'Ad', k: 'name' }, { h: 'Tip', k: 'customerType' }])
    addSheet('Siparisler', orders, [{ h: 'Siparis No', k: 'orderNumber' }, { h: 'Musteri', k: 'customer.name' }, { h: 'Tutar', k: 'totalAmount' }])
    addSheet('Hesap Plani', accounts, [{ h: 'Kod', k: 'code' }, { h: 'Ad', k: 'name' }, { h: 'Tip', k: 'accountType' }])
    addSheet('Yevmiye', journal, [{ h: 'Fis No', k: 'entryNumber' }, { h: 'Aciklama', k: 'description' }, { h: 'Borc', k: 'totalDebit' }])
    addSheet('E-Faturalar', einvoices, [{ h: 'Fatura No', k: 'invoiceNumber' }, { h: 'Alici', k: 'receiverName' }, { h: 'Tutar', k: 'totalAmount' }])
    addSheet('Calisanlar', employees, [{ h: 'Ad', k: 'user.name' }, { h: 'Sicil', k: 'employeeNumber' }, { h: 'Maas', k: 'grossSalary' }])
    addSheet('Izinler', leaves, [{ h: 'Calisan', k: 'employee.user.name' }, { h: 'Tur', k: 'leaveType' }, { h: 'Gun', k: 'days' }])
    addSheet('Bordro', payrollPeriods, [{ h: 'Yil', k: 'year' }, { h: 'Ay', k: 'month' }, { h: 'Durum', k: 'status' }, { h: 'Net', k: 'totalNet' }])

    // Save to uploads dir
    const uploadsDir = path.join(process.cwd(), 'uploads', 'exports')
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

    const filename = `export_${requestId}_${Date.now()}.xlsx`
    const filePath = path.join(uploadsDir, filename)
    XLSX.writeFile(wb, filePath)

    const fileUrl = `/uploads/exports/${filename}`
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    await prisma.dataExportRequest.update({
      where: { id: requestId },
      data: { status: 'TAMAMLANDI', fileUrl, expiresAt },
    })

    // Notify requester
    await createAndPush({
      companyId, userId: requestedById,
      title: 'Export Dosyaniz Hazir',
      message: 'Veri export dosyaniz hazir. 24 saat icinde indirin.',
      type: 'SISTEM', link: '/admin',
    }).catch(() => {})

  } catch (err) {
    console.error('[DataExport] Failed to generate file:', err)
    await prisma.dataExportRequest.update({ where: { id: requestId }, data: { status: 'REDDEDILDI', rejectedReason: 'Dosya olusturulurken hata olustu' } })
  }
}

export async function getExportFile(companyId: string, id: string, userId: string) {
  const req = await prisma.dataExportRequest.findFirst({
    where: { id, companyId, requestedById: userId, status: 'TAMAMLANDI' },
  })
  if (!req) throw new NotFoundError('Export dosyasi')
  if (req.expiresAt && req.expiresAt < new Date()) throw new ForbiddenError('Export dosyasinin suresi dolmus')
  if (!req.fileUrl) throw new NotFoundError('Export dosyasi')
  return req.fileUrl
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/data-export/
git commit -m "feat: add data export service - request, approve, reject, generate Excel"
```

---

### Task 3: Backend - Data Export Router

**Files:**
- Create: `src/modules/data-export/data-export.router.ts`
- Modify: `src/app.ts`

- [ ] **Step 1: Create router**

```typescript
import { Router } from 'express'
import { authenticate } from '../../core/middleware/authenticate'
import { authorize } from '../../core/middleware/authorize'
import { ROLE_LEVELS } from '../../config/constants'
import {
  createExportRequest, listMyRequests, listPendingRequests,
  approveRequest, rejectRequest, getExportFile,
} from './data-export.service'

const router = Router()
router.use(authenticate)

// KAM (PLATFORM_ADMIN) - create request + list own
router.post('/data-export/request', authorize(ROLE_LEVELS.PLATFORM_ADMIN), async (req, res, next) => {
  try {
    const data = await createExportRequest(req.user.companyId, req.user.sub, req.body)
    res.status(201).json({ data })
  } catch (err) { next(err) }
})

router.get('/data-export/my-requests', authorize(ROLE_LEVELS.PLATFORM_ADMIN), async (req, res, next) => {
  try {
    const data = await listMyRequests(req.user.companyId, req.user.sub)
    res.json({ data })
  } catch (err) { next(err) }
})

router.get('/data-export/:id/download', authorize(ROLE_LEVELS.PLATFORM_ADMIN), async (req, res, next) => {
  try {
    const fileUrl = await getExportFile(req.user.companyId, req.params.id, req.user.sub)
    res.json({ data: { fileUrl } })
  } catch (err) { next(err) }
})

// GM (GENEL_MUDUR) - list pending + approve/reject
router.get('/data-export/pending', authorize(ROLE_LEVELS.GENEL_MUDUR), async (req, res, next) => {
  try {
    const data = await listPendingRequests(req.user.companyId)
    res.json({ data })
  } catch (err) { next(err) }
})

router.post('/data-export/:id/approve', authorize(ROLE_LEVELS.GENEL_MUDUR), async (req, res, next) => {
  try {
    const data = await approveRequest(req.user.companyId, req.params.id, req.user.sub)
    res.json({ data })
  } catch (err) { next(err) }
})

router.post('/data-export/:id/reject', authorize(ROLE_LEVELS.GENEL_MUDUR), async (req, res, next) => {
  try {
    const data = await rejectRequest(req.user.companyId, req.params.id, req.user.sub, req.body.reason)
    res.json({ data })
  } catch (err) { next(err) }
})

export default router
```

- [ ] **Step 2: Register in app.ts**

After `moduleAccessRouter` line:

```typescript
import dataExportRouter from './modules/data-export/data-export.router'
// ...
app.use(`${API}`, dataExportRouter)
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/data-export/ src/app.ts
git commit -m "feat: add data export API - request, approve, reject, download"
```

---

### Task 4: Frontend - Export Hooks

**Files:**
- Modify: `src/lib/erp-hooks.ts`

- [ ] **Step 1: Add data export hooks**

At the end of erp-hooks.ts, before the closing of the file:

```typescript
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

export async function createExportRequest(body: { dateFrom: string; dateTo: string; departmentId?: string }): Promise<DataExportRequest> {
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/erp-hooks.ts
git commit -m "feat: add data export hooks - request, approve, reject, download"
```

---

### Task 5: Frontend - DataExportTab Component

**Files:**
- Create: `src/components/settings/DataExportTab.tsx`

- [ ] **Step 1: Create DataExportTab**

```tsx
import { useState } from 'react'
import { Download, Clock, Check, X, FileSpreadsheet, Send } from 'lucide-react'
import clsx from 'clsx'
import {
  useMyExportRequests, usePendingExportRequests,
  createExportRequest, approveExportRequest, rejectExportRequest, getExportDownloadUrl,
} from '../../lib/erp-hooks'
import { useDepartments } from '../../lib/hooks'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import { SERVER_BASE } from '../../lib/api'
import DraggableModal from '../ui/DraggableModal'

const STATUS_LABELS: Record<string, string> = {
  BEKLIYOR: 'Onay Bekliyor', ONAYLANDI: 'Onaylandi', REDDEDILDI: 'Reddedildi',
  HAZIRLANIYOR: 'Hazirlaniyor', TAMAMLANDI: 'Hazir', SURESI_DOLDU: 'Suresi Doldu',
}
const STATUS_STYLES: Record<string, string> = {
  BEKLIYOR: 'bg-amber-100 text-amber-700', ONAYLANDI: 'bg-blue-100 text-blue-700',
  REDDEDILDI: 'bg-red-100 text-red-700', HAZIRLANIYOR: 'bg-indigo-100 text-indigo-700',
  TAMAMLANDI: 'bg-emerald-100 text-emerald-700', SURESI_DOLDU: 'bg-zinc-100 text-zinc-500',
}

export default function DataExportTab() {
  const { lang } = useLanguage()
  const { user } = useAuth()
  const tr = lang === 'tr'
  const isGM = user?.role === 'genel_mudur'
  const isKAM = user?.role === 'platform_admin'

  const { departments } = useDepartments()
  const { requests: myRequests, refetch: refetchMy } = useMyExportRequests()
  const { requests: pendingRequests, refetch: refetchPending } = usePendingExportRequests()

  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const today = now.toISOString().slice(0, 10)

  const [dateFrom, setDateFrom] = useState(firstOfMonth)
  const [dateTo, setDateTo] = useState(today)
  const [departmentId, setDepartmentId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const handleRequest = async () => {
    setSubmitting(true)
    try {
      await createExportRequest({
        dateFrom: new Date(dateFrom + 'T00:00:00.000Z').toISOString(),
        dateTo: new Date(dateTo + 'T23:59:59.999Z').toISOString(),
        departmentId: departmentId || undefined,
      })
      refetchMy()
      alert(tr ? 'Export talebi olusturuldu. Genel Mudur onayladiktan sonra dosya hazirlanacak.' : 'Export request created. File will be generated after GM approval.')
    } catch (e: any) { alert(e.message) }
    finally { setSubmitting(false) }
  }

  const handleApprove = async (id: string) => {
    try { await approveExportRequest(id); refetchPending(); refetchMy() }
    catch (e: any) { alert(e.message) }
  }

  const handleReject = async () => {
    if (!rejectingId) return
    try { await rejectExportRequest(rejectingId, rejectReason || undefined); setRejectingId(null); setRejectReason(''); refetchPending(); refetchMy() }
    catch (e: any) { alert(e.message) }
  }

  const handleDownload = async (id: string) => {
    try {
      const url = await getExportDownloadUrl(id)
      window.open(`${SERVER_BASE}${url}`, '_blank')
    } catch (e: any) { alert(e.message) }
  }

  const allRequests = [...myRequests, ...pendingRequests.filter(p => !myRequests.some(m => m.id === p.id))]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <div className="space-y-5">
      {/* New Request Form (KAM only) */}
      {isKAM && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{tr ? 'Yeni Export Talebi' : 'New Export Request'}</h4>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Baslangic' : 'From'}</label>
              <input className="input" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Bitis' : 'To'}</label>
              <input className="input" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Departman' : 'Department'}</label>
              <select className="select" value={departmentId} onChange={e => setDepartmentId(e.target.value)}>
                <option value="">{tr ? 'Tum Departmanlar' : 'All'}</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <button onClick={handleRequest} disabled={submitting} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-500 disabled:opacity-50">
              <Send className="w-4 h-4" />
              {submitting ? (tr ? 'Gonderiliyor...' : 'Submitting...') : (tr ? 'Export Talep Et' : 'Request Export')}
            </button>
          </div>
        </div>
      )}

      {/* Pending Approvals (GM only) */}
      {isGM && pendingRequests.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{tr ? 'Onay Bekleyenler' : 'Pending Approvals'}</h4>
          {pendingRequests.map(r => (
            <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50">
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-800">{r.requestedBy.name}</div>
                <div className="text-xs text-slate-500">
                  {new Date(r.dateFrom).toLocaleDateString('tr-TR')} - {new Date(r.dateTo).toLocaleDateString('tr-TR')}
                </div>
              </div>
              <button onClick={() => handleApprove(r.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600">
                <Check className="w-3.5 h-3.5" />{tr ? 'Onayla' : 'Approve'}
              </button>
              <button onClick={() => { setRejectingId(r.id); setRejectReason('') }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600">
                <X className="w-3.5 h-3.5" />{tr ? 'Reddet' : 'Reject'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Request History */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{tr ? 'Gecmis Talepler' : 'Request History'}</h4>
        {allRequests.length === 0 ? (
          <div className="text-center py-6 text-sm" style={{ color: 'var(--text-3)' }}>{tr ? 'Henuz export talebi yok' : 'No export requests yet'}</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                  <th className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--text-2)' }}>{tr ? 'Talep Eden' : 'Requested By'}</th>
                  <th className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--text-2)' }}>{tr ? 'Tarih Araligi' : 'Date Range'}</th>
                  <th className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--text-2)' }}>{tr ? 'Durum' : 'Status'}</th>
                  <th className="text-right px-4 py-2.5 font-medium" style={{ color: 'var(--text-2)' }} />
                </tr>
              </thead>
              <tbody>
                {allRequests.map(r => (
                  <tr key={r.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-4 py-2.5" style={{ color: 'var(--text-1)' }}>{r.requestedBy.name}</td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--text-3)' }}>
                      {new Date(r.dateFrom).toLocaleDateString('tr-TR')} - {new Date(r.dateTo).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_STYLES[r.status])}>
                        {STATUS_LABELS[r.status]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {r.status === 'TAMAMLANDI' && (
                        <button onClick={() => handleDownload(r.id)} className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-medium hover:bg-emerald-200">
                          <Download className="w-3.5 h-3.5" />{tr ? 'Indir' : 'Download'}
                        </button>
                      )}
                      {r.status === 'REDDEDILDI' && r.rejectedReason && (
                        <span className="text-xs text-red-500">{r.rejectedReason}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectingId && (
        <DraggableModal title={tr ? 'Export Talebi Reddet' : 'Reject Export'} onClose={() => setRejectingId(null)} width={400}
          footer={
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRejectingId(null)} className="px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--text-2)' }}>{tr ? 'Iptal' : 'Cancel'}</button>
              <button onClick={handleReject} className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600">{tr ? 'Reddet' : 'Reject'}</button>
            </div>
          }
        >
          <div className="p-1">
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>{tr ? 'Red Nedeni' : 'Reason'}</label>
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
git add src/components/settings/DataExportTab.tsx
git commit -m "feat: add DataExportTab - request, approve/reject, download, history"
```

---

### Task 6: Frontend - Add Tab to AdminPanel

**Files:**
- Modify: `src/pages/AdminPanel.tsx`

- [ ] **Step 1: Add DataExportTab to AdminPanel**

Import:
```typescript
import DataExportTab from '../components/settings/DataExportTab'
```

Add to AdminTab type:
```typescript
type AdminTab = '...' | 'data-export' | '...'
```

Add to TABS array (after erp-access):
```typescript
{ key: 'data-export', icon: Download, label: lang === 'tr' ? 'Veri Export' : 'Data Export' },
```

Add `Download` to lucide imports.

Add tab content (after erp-access content):
```typescript
{tab === 'data-export' && (
  <Section title={lang === 'tr' ? 'Veri Export' : 'Data Export'} desc={lang === 'tr' ? 'Firma verilerini tarih araligina gore export edin. Genel Mudur onayi gereklidir.' : 'Export company data by date range. Requires GM approval.'}>
    <DataExportTab />
  </Section>
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/AdminPanel.tsx
git commit -m "feat: add Veri Export tab to AdminPanel for KAM + GM"
```

---

## Self-Review

**1. Spec coverage:**
- [x] KAM export talebi: Task 2 (createExportRequest) + Task 5 (form)
- [x] GM onay/red: Task 2 (approve/reject) + Task 5 (pending approvals UI)
- [x] Bildirimler (GM + dept managers): Task 2 (createAndPush calls)
- [x] Multi-sheet Excel: Task 2 (generateExportFile with 15 sheets)
- [x] Tarih filtresi: Task 2 (dateFilter)
- [x] Departman filtresi: Task 2 (deptFilter)
- [x] Sureli link (24 saat): Task 2 (expiresAt)
- [x] Gecmis talepler: Task 5 (history table)
- [x] Download: Task 5 (handleDownload)

**2. Placeholder scan:** No TBDs. All code complete.

**3. Type consistency:** DataExportRequest type in Task 4 matches backend select fields. Status enum values consistent.
