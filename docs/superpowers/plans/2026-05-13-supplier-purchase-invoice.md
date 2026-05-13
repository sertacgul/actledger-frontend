# Tedarikci + Alis Faturasi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Customer entity'ye tedarikci destegi eklemek, gelen fatura (alis faturasi) yonetimi ve opsiyonel stok girisi entegrasyonu.

**Architecture:** Mevcut CustomerType enum'una TEDARIKCI/HER_IKISI eklenir. EInvoice tablosu direction:GELEN ile gelen fatura destekler (backend zaten hazir). EInvoiceLine'a stockItemId eklenerek stok eslesmesi saglanir. Gelen fatura onayinda opsiyonel stok girisi yapilir.

**Tech Stack:** Prisma + Express (backend), React + TypeScript (frontend)

---

## File Structure

### Backend:
- Modify: `prisma/schema.prisma` - CustomerType enum + EInvoiceLine.stockItemId
- Create: `prisma/migrations/20260513_supplier_type/migration.sql`
- Create: `src/modules/accounting/einvoice-stock.service.ts` - stok girisi
- Modify: `src/modules/accounting/einvoice.service.ts` - gelen fatura olusturma + stok girisi
- Modify: `src/modules/accounting/einvoice.schema.ts` - direction field + stockItemId

### Frontend:
- Modify: `src/types/erp.ts` - CustomerType enum guncelleme
- Modify: `src/components/sales/CustomersTab.tsx` - Cari Hesaplar + tip filtresi
- Modify: `src/components/accounting/EInvoiceTab.tsx` - Gelen/Giden filtresi + gelen fatura formu

---

### Task 1: Backend - Prisma Schema + Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260513_supplier_type/migration.sql`

- [ ] **Step 1: Add TEDARIKCI and HER_IKISI to CustomerType enum**

In `prisma/schema.prisma`, update the CustomerType enum:

```prisma
enum CustomerType {
  PERAKENDE
  TOPTAN
  KURUMSAL
  TEDARIKCI
  HER_IKISI
}
```

Add `stockItemId` to EInvoiceLine model:

```prisma
// In EInvoiceLine model, after quantity field add:
  stockItemId String?
```

- [ ] **Step 2: Create migration SQL**

```sql
-- Add new values to CustomerType enum
ALTER TYPE "CustomerType" ADD VALUE 'TEDARIKCI';
ALTER TYPE "CustomerType" ADD VALUE 'HER_IKISI';

-- Add stockItemId to EInvoiceLine
ALTER TABLE "EInvoiceLine" ADD COLUMN "stockItemId" TEXT;
```

- [ ] **Step 3: Commit**

```bash
git add prisma/
git commit -m "feat: add TEDARIKCI/HER_IKISI to CustomerType + stockItemId to EInvoiceLine"
```

---

### Task 2: Backend - Gelen Fatura Olusturma + Stok Girisi

**Files:**
- Create: `src/modules/accounting/einvoice-stock.service.ts`
- Modify: `src/modules/accounting/einvoice.service.ts`
- Modify: `src/modules/accounting/einvoice.schema.ts`

- [ ] **Step 1: Create einvoice-stock service**

```typescript
// src/modules/accounting/einvoice-stock.service.ts
import prisma from '../../core/prisma/prisma.client'

export async function increaseStockForInvoice(invoiceId: string, companyId: string, userId: string) {
  const invoice = await prisma.eInvoice.findUnique({
    where: { id: invoiceId },
    include: { lines: true },
  })
  if (!invoice || invoice.direction !== 'GELEN') return

  const linesWithStock = invoice.lines.filter(l => l.stockItemId)
  if (linesWithStock.length === 0) return

  for (const line of linesWithStock) {
    const stockItem = await prisma.stockItem.findUnique({ where: { id: line.stockItemId! } })
    if (!stockItem) continue

    const previousQty = stockItem.quantity
    const newQty = previousQty + line.quantity

    await prisma.stockItem.update({
      where: { id: stockItem.id },
      data: { quantity: newQty },
    })

    await prisma.stockMovement.create({
      data: {
        companyId,
        stockItemId: stockItem.id,
        type: 'GIRIS',
        quantity: line.quantity,
        previousQty,
        newQty,
        userId,
        description: `Alis faturasi: ${invoice.invoiceNumber}`,
      },
    })
  }
}
```

- [ ] **Step 2: Update einvoice schema to support direction + stockItemId in lines**

In `src/modules/accounting/einvoice.schema.ts`, update the create schema to accept `direction` and `stockItemId`:

```typescript
// Add to createEInvoiceSchema:
  direction: z.enum(['GIDEN', 'GELEN']).default('GIDEN'),

// Add to the lines item schema:
  stockItemId: z.string().optional(),
```

- [ ] **Step 3: Update einvoice service - createInvoice to support GELEN direction**

In `src/modules/accounting/einvoice.service.ts`, modify `createInvoice`:

```typescript
// Change line 121 from:
//   direction: 'GIDEN',
// To:
    direction: dto.direction || 'GIDEN',

// For GELEN invoices, swap sender/receiver:
    senderTaxNumber: dto.direction === 'GELEN' ? customer.taxNumber : (company.phone || ''),
    senderName: dto.direction === 'GELEN' ? customer.name : company.name,
    receiverTaxNumber: dto.direction === 'GELEN' ? (company.phone || '') : customer.taxNumber,
    receiverName: dto.direction === 'GELEN' ? company.name : customer.name,

// Add stockItemId to line creation:
    lines: { create: lines.map((l, i) => ({ ...l, lineNumber: i + 1, stockItemId: dto.lines[i]?.stockItemId })) },
```

- [ ] **Step 4: Call increaseStockForInvoice on GELEN invoice approval**

In `src/modules/accounting/einvoice.service.ts`, in the `approveInvoice` function, after status update:

```typescript
import { increaseStockForInvoice } from './einvoice-stock.service'

// After approval, if GELEN, increase stock
if (invoice.direction === 'GELEN') {
  await increaseStockForInvoice(id, companyId, userId).catch(console.error)
}
```

- [ ] **Step 5: Commit**

```bash
git add src/modules/accounting/ prisma/
git commit -m "feat: support GELEN invoices with optional stock increase on approval"
```

---

### Task 3: Frontend - Cari Hesaplar (CustomerType Guncelleme)

**Files:**
- Modify: `src/types/erp.ts`
- Modify: `src/components/sales/CustomersTab.tsx`

- [ ] **Step 1: Update CustomerType in erp.ts**

```typescript
// Replace existing CustomerType:
export type CustomerType = 'PERAKENDE' | 'TOPTAN' | 'KURUMSAL' | 'TEDARIKCI' | 'HER_IKISI'

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  PERAKENDE: 'Perakende',
  TOPTAN: 'Toptan',
  KURUMSAL: 'Kurumsal',
  TEDARIKCI: 'Tedarikci',
  HER_IKISI: 'Musteri & Tedarikci',
}
```

- [ ] **Step 2: Update CustomersTab - rename to Cari Hesaplar + add type filter**

In Sales.tsx, rename the tab:
```typescript
{ id: 'customers', icon: Users, labelTr: 'Cari Hesaplar', labelEn: 'Accounts' },
```

In CustomersTab.tsx, update the filter select to include new types:
```typescript
// The existing typeFilter select already uses CUSTOMER_TYPE_LABELS
// which now includes TEDARIKCI and HER_IKISI - no code change needed
```

Update the "Yeni Musteri" button text:
```typescript
{tr ? 'Yeni Cari Hesap' : 'New Account'}
```

Update form's customerType default to keep PERAKENDE but show all options in select.

- [ ] **Step 3: Commit**

```bash
git add src/types/erp.ts src/components/sales/CustomersTab.tsx src/pages/Sales.tsx
git commit -m "feat: rename Musteriler to Cari Hesaplar, add TEDARIKCI/HER_IKISI types"
```

---

### Task 4: Frontend - EInvoiceTab Gelen/Giden Filtresi + Gelen Fatura Formu

**Files:**
- Modify: `src/components/accounting/EInvoiceTab.tsx`
- Modify: `src/lib/erp-hooks.ts`

- [ ] **Step 1: Update useEInvoices hook to pass direction filter**

In `src/lib/erp-hooks.ts`, the existing `useEInvoices` already supports `direction` filter - no change needed.

- [ ] **Step 2: Update EInvoiceTab - add direction filter buttons + gelen fatura form**

Add direction filter state:
```typescript
const [directionFilter, setDirectionFilter] = useState<'GIDEN' | 'GELEN' | ''>('')
```

Pass to hook:
```typescript
const { invoices, loading, refetch } = useEInvoices({
  search: search || undefined,
  status: statusFilter || undefined,
  direction: directionFilter || undefined,
})
```

Add direction filter buttons before the status filter:
```typescript
<div className="flex gap-1 p-0.5 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
  <button onClick={() => setDirectionFilter('')} className={clsx('px-3 py-1.5 rounded-md text-xs font-medium', !directionFilter ? 'bg-emerald-500 text-white' : 'text-[var(--text-3)]')}>
    {tr ? 'Tumu' : 'All'}
  </button>
  <button onClick={() => setDirectionFilter('GIDEN')} className={clsx('px-3 py-1.5 rounded-md text-xs font-medium', directionFilter === 'GIDEN' ? 'bg-blue-500 text-white' : 'text-[var(--text-3)]')}>
    {tr ? 'Giden (Satis)' : 'Outgoing'}
  </button>
  <button onClick={() => setDirectionFilter('GELEN')} className={clsx('px-3 py-1.5 rounded-md text-xs font-medium', directionFilter === 'GELEN' ? 'bg-amber-500 text-white' : 'text-[var(--text-3)]')}>
    {tr ? 'Gelen (Alis)' : 'Incoming'}
  </button>
</div>
```

Add "Yeni Gelen Fatura" button next to existing "Yeni E-Fatura":
```typescript
<button onClick={() => { setCreating(true); setInvoiceDirection('GELEN') }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600">
  <Plus className="w-4 h-4" />
  {tr ? 'Gelen Fatura' : 'Purchase Invoice'}
</button>
```

Add direction state to create form:
```typescript
const [invoiceDirection, setInvoiceDirection] = useState<'GIDEN' | 'GELEN'>('GIDEN')
```

In create form, filter customers to show only TEDARIKCI/HER_IKISI when direction is GELEN:
```typescript
const filteredCustomers = invoiceDirection === 'GELEN'
  ? customers.filter(c => ['TEDARIKCI', 'HER_IKISI'].includes(c.customerType))
  : customers
```

Add "Stoklara Ekle" checkbox (only for GELEN):
```typescript
{invoiceDirection === 'GELEN' && (
  <label className="flex items-center gap-2 cursor-pointer">
    <input type="checkbox" checked={addToStock} onChange={e => setAddToStock(e.target.checked)} className="rounded" />
    <span className="text-sm text-[var(--text-2)]">{tr ? 'Stoklara Ekle' : 'Add to Stock'}</span>
  </label>
)}
```

When addToStock is true, show stockItem select per line item.

Update handleCreate to pass direction and stockItemId:
```typescript
await createEInvoice({
  type: invoiceType,
  direction: invoiceDirection,
  customerId,
  issueDate: toISO(issueDate),
  notes: notes || undefined,
  lines: lines.filter(l => l.productName).map(l => ({
    productName: l.productName,
    unit: l.unit,
    quantity: Number(l.quantity),
    unitPrice: Number(l.unitPrice),
    taxRate: Number(l.taxRate),
    stockItemId: addToStock ? l.stockItemId : undefined,
  })),
})
```

- [ ] **Step 3: Update createEInvoice hook to pass direction**

In `src/lib/erp-hooks.ts`:
```typescript
export async function createEInvoice(body: {
  type: string; direction?: string; customerId: string; issueDate: string; currency?: string; notes?: string
  lines: { productName: string; unit: string; quantity: number; unitPrice: number; taxRate: number; stockItemId?: string }[]
}): Promise<EInvoice> {
  return api.post<EInvoice>('/accounting/einvoice', body)
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/accounting/EInvoiceTab.tsx src/lib/erp-hooks.ts
git commit -m "feat: add Gelen/Giden filter + purchase invoice form with stock option"
```

---

## Self-Review

**1. Spec coverage:**
- [x] CustomerType enum genisletme: Task 1 (backend) + Task 3 (frontend)
- [x] Cari Hesaplar yeniden adlandirma: Task 3
- [x] Gelen fatura olusturma: Task 2 (backend) + Task 4 (frontend)
- [x] Gelen/Giden filtresi: Task 4
- [x] Stok girisi (opsiyonel checkbox): Task 2 (backend service) + Task 4 (frontend checkbox)
- [x] Yevmiye fisi otomasyonu: Backend zaten mevcut (approveInvoice icinde)
- [x] EInvoiceLine.stockItemId: Task 1

**2. Placeholder scan:** No TBDs. All code complete.

**3. Type consistency:** CustomerType enum values consistent across backend and frontend. createEInvoice hook signature matches backend schema.
