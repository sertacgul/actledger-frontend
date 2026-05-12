# ERP Erisim Kontrolu & Excel Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kullanici bazli ERP modul yetkilendirmesi + platform genelinde Excel export (sayfa bazli + toplu).

**Architecture:** Backend'de UserModuleAccess tablosu ile kullanici-modul eslesmesi. /auth/me response'una moduleAccess eklenir. Frontend'de AuthContext bu veriyi kullanir. Excel export icin mevcut exportToExcel utility multi-sheet destekleyecek sekilde genisletilir. Header'a toplu export butonu, her ERP tab'a sayfa bazli export butonu eklenir.

**Tech Stack:** Prisma + Express (backend), React + TypeScript + XLSX library (frontend)

---

## File Structure

### Backend (actledger-backend):
- Create: `prisma/migrations/xxx_user_module_access/migration.sql` (via prisma migrate)
- Modify: `prisma/schema.prisma` - UserModuleAccess model
- Create: `src/modules/module-access/module-access.router.ts`
- Create: `src/modules/module-access/module-access.service.ts`
- Modify: `src/modules/auth/auth.service.ts` - moduleAccess in getMe()
- Modify: `src/core/middleware/check-module-access.ts` - user-level check
- Modify: `src/app.ts` - register module-access router

### Frontend (actledger-frontend):
- Modify: `src/types/index.ts` - moduleAccess on User
- Modify: `src/context/AuthContext.tsx` - moduleAccess logic
- Modify: `src/lib/erp-hooks.ts` - module access hooks
- Modify: `src/lib/excelExport.ts` - multi-sheet support
- Modify: `src/components/layout/Header.tsx` - global export button
- Modify: `src/components/layout/Sidebar.tsx` - moduleAccess check
- Modify: `src/pages/SuperAdmin.tsx` - module access management
- Modify: `src/pages/Settings.tsx` - module access tab for KAM
- Create: `src/components/settings/ModuleAccessTab.tsx`
- Modify: `src/components/sales/CustomersTab.tsx` - export button
- Modify: `src/components/sales/OrdersTab.tsx` - export button
- Modify: `src/components/accounting/AccountsTab.tsx` - export button
- Modify: `src/components/accounting/JournalTab.tsx` - export button
- Modify: `src/components/accounting/EInvoiceTab.tsx` - export button
- Modify: `src/components/accounting/ReportsTab.tsx` - export button
- Modify: `src/components/hr/EmployeesTab.tsx` - export button
- Modify: `src/components/hr/LeavesTab.tsx` - export button
- Modify: `src/components/hr/PayrollTab.tsx` - export button

---

### Task 1: Backend - UserModuleAccess Prisma Model

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add UserModuleAccess model to schema**

Add after the CompanyModule model in `prisma/schema.prisma`:

```prisma
model UserModuleAccess {
  id          String     @id @default(cuid())
  userId      String
  companyId   String
  moduleCode  ModuleCode
  grantedById String
  grantedAt   DateTime   @default(now())

  user        User       @relation("userModuleAccess", fields: [userId], references: [id], onDelete: Cascade)
  company     Company    @relation(fields: [companyId], references: [id], onDelete: Cascade)
  grantedBy   User       @relation("grantedModuleAccess", fields: [grantedById], references: [id])

  @@unique([userId, companyId, moduleCode])
  @@index([companyId])
  @@index([userId])
}
```

Add the reverse relations to the User model:

```prisma
// In User model, add:
  moduleAccess        UserModuleAccess[] @relation("userModuleAccess")
  grantedModuleAccess UserModuleAccess[] @relation("grantedModuleAccess")
```

Add the relation to the Company model:

```prisma
// In Company model, add:
  userModuleAccess UserModuleAccess[]
```

- [ ] **Step 2: Run migration**

```bash
cd /c/Users/serta/actledger-backend
npx prisma migrate dev --name user_module_access
```

- [ ] **Step 3: Commit**

```bash
git add prisma/
git commit -m "feat: add UserModuleAccess model for per-user ERP module permissions"
```

---

### Task 2: Backend - Module Access Service

**Files:**
- Create: `src/modules/module-access/module-access.service.ts`

- [ ] **Step 1: Create module access service**

```typescript
// src/modules/module-access/module-access.service.ts
import { prisma } from '../../core/prisma'
import { NotFoundError, ForbiddenError } from '../../core/errors'
import type { ModuleCode } from '@prisma/client'

const MODULE_ACCESS_SELECT = {
  id: true,
  userId: true,
  moduleCode: true,
  grantedAt: true,
  user: { select: { id: true, name: true, email: true, role: true } },
  grantedBy: { select: { id: true, name: true } },
}

export async function listModuleAccess(companyId: string, moduleCode?: string) {
  const where: any = { companyId }
  if (moduleCode) where.moduleCode = moduleCode

  return prisma.userModuleAccess.findMany({
    where,
    select: MODULE_ACCESS_SELECT,
    orderBy: { grantedAt: 'desc' },
  })
}

export async function grantModuleAccess(
  companyId: string,
  userId: string,
  moduleCode: ModuleCode,
  grantedById: string,
) {
  // Verify user belongs to this company
  const user = await prisma.user.findFirst({
    where: { id: userId, companyId },
  })
  if (!user) throw new NotFoundError('Kullanici bu firmada bulunamadi')

  // Verify company has this module licensed
  const companyModule = await prisma.companyModule.findUnique({
    where: { companyId_moduleCode: { companyId, moduleCode } },
  })
  if (!companyModule?.isActive) {
    throw new ForbiddenError(`Firma ${moduleCode} modulune sahip degil`)
  }

  return prisma.userModuleAccess.upsert({
    where: { userId_companyId_moduleCode: { userId, companyId, moduleCode } },
    create: { userId, companyId, moduleCode, grantedById },
    update: { grantedById, grantedAt: new Date() },
    select: MODULE_ACCESS_SELECT,
  })
}

export async function revokeModuleAccess(id: string, companyId: string) {
  const access = await prisma.userModuleAccess.findFirst({
    where: { id, companyId },
  })
  if (!access) throw new NotFoundError('Yetki kaydi bulunamadi')

  await prisma.userModuleAccess.delete({ where: { id } })
}

export async function bulkGrantModuleAccess(
  companyId: string,
  userIds: string[],
  moduleCode: ModuleCode,
  grantedById: string,
) {
  const results = []
  for (const userId of userIds) {
    try {
      const result = await grantModuleAccess(companyId, userId, moduleCode, grantedById)
      results.push(result)
    } catch {
      // Skip users that fail (e.g., not in company)
    }
  }
  return results
}

export async function getUserModuleAccess(userId: string, companyId: string): Promise<string[]> {
  const access = await prisma.userModuleAccess.findMany({
    where: { userId, companyId },
    select: { moduleCode: true },
  })
  return access.map(a => a.moduleCode)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/module-access/
git commit -m "feat: add module access service - grant, revoke, bulk, list"
```

---

### Task 3: Backend - Module Access Router

**Files:**
- Create: `src/modules/module-access/module-access.router.ts`
- Modify: `src/app.ts`

- [ ] **Step 1: Create module access router**

```typescript
// src/modules/module-access/module-access.router.ts
import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../core/middleware/authenticate'
import { requireRole, ROLE_LEVELS } from '../../core/middleware/require-role'
import { validate } from '../../core/middleware/validate'
import {
  listModuleAccess,
  grantModuleAccess,
  revokeModuleAccess,
  bulkGrantModuleAccess,
} from './module-access.service'

const router = Router()

// ── Super Admin endpoints (manage any company) ─────────────────────────────
const superAdminRouter = Router()
superAdminRouter.use(authenticate, requireRole('SUPER_ADMIN'))

superAdminRouter.get('/companies/:companyId/module-access', async (req, res) => {
  const { moduleCode } = req.query
  const data = await listModuleAccess(req.params.companyId, moduleCode as string | undefined)
  res.json({ data })
})

superAdminRouter.post(
  '/companies/:companyId/module-access',
  validate(z.object({
    body: z.object({
      userId: z.string(),
      moduleCode: z.enum(['SALES', 'ACCOUNTING', 'HR']),
    }),
  })),
  async (req, res) => {
    const data = await grantModuleAccess(
      req.params.companyId,
      req.body.userId,
      req.body.moduleCode,
      req.user.id,
    )
    res.status(201).json({ data })
  },
)

superAdminRouter.post(
  '/companies/:companyId/module-access/bulk',
  validate(z.object({
    body: z.object({
      userIds: z.array(z.string()).min(1),
      moduleCode: z.enum(['SALES', 'ACCOUNTING', 'HR']),
    }),
  })),
  async (req, res) => {
    const data = await bulkGrantModuleAccess(
      req.params.companyId,
      req.body.userIds,
      req.body.moduleCode,
      req.user.id,
    )
    res.json({ data })
  },
)

superAdminRouter.delete('/companies/:companyId/module-access/:id', async (req, res) => {
  await revokeModuleAccess(req.params.id, req.params.companyId)
  res.status(204).end()
})

// ── KAM endpoints (manage own company) ──────────────────────────────────────
const kamRouter = Router()
kamRouter.use(authenticate, requireRole('PLATFORM_ADMIN'))

kamRouter.get('/module-access/my-company', async (req, res) => {
  const { moduleCode } = req.query
  const data = await listModuleAccess(req.user.companyId, moduleCode as string | undefined)
  res.json({ data })
})

kamRouter.post(
  '/module-access/my-company',
  validate(z.object({
    body: z.object({
      userId: z.string(),
      moduleCode: z.enum(['SALES', 'ACCOUNTING', 'HR']),
    }),
  })),
  async (req, res) => {
    const data = await grantModuleAccess(
      req.user.companyId,
      req.body.userId,
      req.body.moduleCode,
      req.user.id,
    )
    res.status(201).json({ data })
  },
)

kamRouter.post(
  '/module-access/my-company/bulk',
  validate(z.object({
    body: z.object({
      userIds: z.array(z.string()).min(1),
      moduleCode: z.enum(['SALES', 'ACCOUNTING', 'HR']),
    }),
  })),
  async (req, res) => {
    const data = await bulkGrantModuleAccess(
      req.user.companyId,
      req.body.userIds,
      req.body.moduleCode,
      req.user.id,
    )
    res.json({ data })
  },
)

kamRouter.delete('/module-access/my-company/:id', async (req, res) => {
  await revokeModuleAccess(req.params.id, req.user.companyId)
  res.status(204).end()
})

export { superAdminRouter as moduleAccessSuperAdminRouter, kamRouter as moduleAccessKamRouter }
```

- [ ] **Step 2: Register routers in app.ts**

In `src/app.ts`, add imports and register:

```typescript
import { moduleAccessSuperAdminRouter, moduleAccessKamRouter } from './modules/module-access/module-access.router'

// After existing super-admin routes:
app.use('/api/v1/super-admin', moduleAccessSuperAdminRouter)
// After existing authenticated routes:
app.use('/api/v1', moduleAccessKamRouter)
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/module-access/ src/app.ts
git commit -m "feat: add module access API - super admin + KAM endpoints"
```

---

### Task 4: Backend - Update /auth/me & checkModuleAccess

**Files:**
- Modify: `src/modules/auth/auth.service.ts`
- Modify: `src/core/middleware/check-module-access.ts`

- [ ] **Step 1: Add moduleAccess to /auth/me response**

In `src/modules/auth/auth.service.ts`, in the `getMe()` function, after fetching company modules, also fetch user module access:

```typescript
// After the existing modules query, add:
import { getUserModuleAccess } from '../module-access/module-access.service'

// In getMe(), after:
//   const modules = companyModules.filter(...).map(m => m.moduleCode)
// Add:
const moduleAccess = await getUserModuleAccess(userId, user.companyId)

// Change return to include moduleAccess:
return { ...user, modules, moduleAccess }
```

- [ ] **Step 2: Update checkModuleAccess middleware**

In `src/core/middleware/check-module-access.ts`, after checking company-level access, also check user-level access:

```typescript
// After the existing company module check passes, add user-level check:
// (After "if (!hasAccess)" block, before "next()")

// SUPER_ADMIN and PLATFORM_ADMIN bypass user-level check (they manage modules)
if (req.user.roleLevel < ROLE_LEVELS.PLATFORM_ADMIN) {
  const userAccess = await prisma.userModuleAccess.findUnique({
    where: {
      userId_companyId_moduleCode: {
        userId: req.user.id,
        companyId,
        moduleCode,
      },
    },
  })
  if (!userAccess) {
    return next(new ForbiddenError(`${moduleCode} modulune erisim yetkiniz yok`))
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/auth/auth.service.ts src/core/middleware/check-module-access.ts
git commit -m "feat: add user-level module access check to /auth/me and middleware"
```

---

### Task 5: Frontend - AuthContext moduleAccess

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/context/AuthContext.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Update User type**

In `src/types/index.ts`, the `modules` field already exists. Add `moduleAccess`:

```typescript
// After modules?, add:
  moduleAccess?: string[]
```

- [ ] **Step 2: Update AuthContext**

In `src/context/AuthContext.tsx`, update the session restore and login to capture `moduleAccess`:

```typescript
// In session restore, change the existing block to:
if (!cancelled) {
  const mapped = mapUser(me)
  mapped.modules = me.modules ?? []
  mapped.moduleAccess = me.moduleAccess ?? []
  setUser(mapped)
  if (me.company) syncFromBackend(me.company)
}

// In login(), change the existing /auth/me block to:
try {
  const me = await api.get<any>('/auth/me')
  if (me?.company) syncFromBackend(me.company)
  mapped.modules = me?.modules ?? []
  mapped.moduleAccess = me?.moduleAccess ?? []
  setUser({ ...mapped })
} catch { /* non-critical */ }
```

Update `hasModule()` to check `moduleAccess` instead of `modules`:

```typescript
// PLATFORM_ADMIN and above see all licensed modules, others see only their assigned ones
const hasModule = (code: string) => {
  if (!user) return false
  const role = user.role?.toUpperCase()
  if (role === 'SUPER_ADMIN' || role === 'PLATFORM_ADMIN') {
    return user.modules?.includes(code) ?? false
  }
  return user.moduleAccess?.includes(code) ?? false
}
```

- [ ] **Step 3: Sidebar already uses hasModule - no changes needed**

The Sidebar already calls `hasModule(item.moduleCode)` which now checks `moduleAccess` for regular users.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/context/AuthContext.tsx
git commit -m "feat: frontend module access - AuthContext uses moduleAccess for non-admin users"
```

---

### Task 6: Frontend - Module Access Management UI (KAM)

**Files:**
- Create: `src/components/settings/ModuleAccessTab.tsx`
- Modify: `src/pages/Settings.tsx`
- Modify: `src/lib/erp-hooks.ts`

- [ ] **Step 1: Add module access hooks**

In `src/lib/erp-hooks.ts`, add at the end:

```typescript
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
```

- [ ] **Step 2: Create ModuleAccessTab component**

```typescript
// src/components/settings/ModuleAccessTab.tsx
import { useState, useMemo } from 'react'
import { Plus, Trash2, Search, Users, ShoppingCart, Calculator, UserCog } from 'lucide-react'
import clsx from 'clsx'
import { useModuleAccess, grantModuleAccessKAM, revokeModuleAccessKAM } from '../../lib/erp-hooks'
import { api } from '../../lib/api'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import { useEffect } from 'react'

const MODULES = [
  { code: 'SALES', labelTr: 'Satis', labelEn: 'Sales', icon: ShoppingCart, color: 'text-indigo-500' },
  { code: 'ACCOUNTING', labelTr: 'Muhasebe', labelEn: 'Accounting', icon: Calculator, color: 'text-emerald-500' },
  { code: 'HR', labelTr: 'Insan Kaynaklari', labelEn: 'HR', icon: UserCog, color: 'text-violet-500' },
]

export default function ModuleAccessTab() {
  const { lang } = useLanguage()
  const { user } = useAuth()
  const tr = lang === 'tr'

  const [selectedModule, setSelectedModule] = useState('SALES')
  const { accessList, loading, refetch } = useModuleAccess(selectedModule)

  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<{ id: string; name: string; email: string; role: string }[]>([])
  const [addingUserId, setAddingUserId] = useState('')

  useEffect(() => {
    api.get<any>('/users?pageSize=500').then((res: any) => {
      setUsers((res.data ?? res ?? []).map((u: any) => ({ id: u.id, name: u.name, email: u.email, role: u.role })))
    }).catch(() => {})
  }, [])

  const assignedUserIds = useMemo(() => new Set(accessList.map(a => a.userId)), [accessList])
  const availableUsers = useMemo(() =>
    users.filter(u => !assignedUserIds.has(u.id) && u.id !== user?.id),
  [users, assignedUserIds, user])

  const filteredAccess = useMemo(() => {
    if (!search) return accessList
    const s = search.toLowerCase()
    return accessList.filter(a => a.user.name.toLowerCase().includes(s) || a.user.email.toLowerCase().includes(s))
  }, [accessList, search])

  const handleGrant = async () => {
    if (!addingUserId) return
    try {
      await grantModuleAccessKAM(addingUserId, selectedModule)
      setAddingUserId('')
      refetch()
    } catch (e: any) { alert(e.message) }
  }

  const handleRevoke = async (id: string, userName: string) => {
    if (!confirm(`${userName} kullanicisinin ${selectedModule} modulune erisimini kaldirmak istiyor musunuz?`)) return
    try { await revokeModuleAccessKAM(id); refetch() }
    catch (e: any) { alert(e.message) }
  }

  const currentMod = MODULES.find(m => m.code === selectedModule)!

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--text-3)]">
        {tr ? 'ERP modullerine erisebilecek kullanicilari yonetin.' : 'Manage which users can access ERP modules.'}
      </p>

      {/* Module selector */}
      <div className="flex gap-2">
        {MODULES.map(m => {
          const isLicensed = user?.modules?.includes(m.code)
          return (
            <button
              key={m.code}
              onClick={() => setSelectedModule(m.code)}
              disabled={!isLicensed}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border',
                selectedModule === m.code
                  ? 'bg-[var(--accent)] text-white border-transparent'
                  : isLicensed
                    ? 'border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--surface)]'
                    : 'border-[var(--border)] text-[var(--text-4)] opacity-50 cursor-not-allowed'
              )}
            >
              <m.icon className="w-4 h-4" />
              {tr ? m.labelTr : m.labelEn}
              {!isLicensed && <span className="text-[10px]">(lisans yok)</span>}
            </button>
          )
        })}
      </div>

      {/* Add user */}
      <div className="flex gap-2">
        <select className="select flex-1" value={addingUserId} onChange={e => setAddingUserId(e.target.value)}>
          <option value="">{tr ? 'Kullanici sec...' : 'Select user...'}</option>
          {availableUsers.map(u => (
            <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
          ))}
        </select>
        <button
          onClick={handleGrant}
          disabled={!addingUserId}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          {tr ? 'Yetki Ver' : 'Grant Access'}
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-4)]" />
        <input className="input pl-9 w-full" placeholder={tr ? 'Kullanici ara...' : 'Search users...'} value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Access list */}
      {loading ? (
        <div className="text-center py-8 text-[var(--text-3)]">{tr ? 'Yukleniyor...' : 'Loading...'}</div>
      ) : filteredAccess.length === 0 ? (
        <div className="text-center py-8 text-[var(--text-3)]">
          {tr ? 'Bu module henuz kimse yetkilendirilmemis.' : 'No users have access to this module yet.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Kullanici' : 'User'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Rol' : 'Role'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Yetki Veren' : 'Granted By'}</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Tarih' : 'Date'}</th>
                <th className="text-right px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filteredAccess.map(a => (
                <tr key={a.id} className="border-b border-[var(--border)] hover:bg-[var(--surface)]">
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--text-1)]">{a.user.name}</div>
                    <div className="text-xs text-[var(--text-3)]">{a.user.email}</div>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-2)] text-xs">{a.user.role}</td>
                  <td className="px-4 py-3 text-[var(--text-3)]">{a.grantedBy.name}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-3)]">{new Date(a.grantedAt).toLocaleDateString('tr-TR')}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleRevoke(a.id, a.user.name)} className="p-1.5 rounded-md hover:bg-red-50 text-[var(--text-3)] hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Add ModuleAccessTab to Settings page**

In `src/pages/Settings.tsx`:

1. Add to SettingsTab type:
```typescript
type SettingsTab = 'deployment' | 'company' | 'security' | 'integrations' | 'module-access'
```

2. Add import:
```typescript
import ModuleAccessTab from '../components/settings/ModuleAccessTab'
```

3. Add tab button (visible only for PLATFORM_ADMIN+):
```typescript
// In the tabs array/rendering, add conditionally:
{(user?.role === 'platform_admin' || user?.role === 'super_admin') && (
  <button onClick={() => setTab('module-access')} className={...}>
    ERP Yetkileri
  </button>
)}
```

4. Add tab content:
```typescript
{tab === 'module-access' && <ModuleAccessTab />}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/settings/ModuleAccessTab.tsx src/pages/Settings.tsx src/lib/erp-hooks.ts
git commit -m "feat: add ModuleAccessTab - KAM can manage ERP module permissions"
```

---

### Task 7: Frontend - SuperAdmin Module Access UI

**Files:**
- Modify: `src/pages/SuperAdmin.tsx`
- Modify: `src/lib/erp-hooks.ts`

- [ ] **Step 1: Add super admin module access hooks**

In `src/lib/erp-hooks.ts`, add:

```typescript
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
```

- [ ] **Step 2: Add module access section to SuperAdmin company detail**

In `src/pages/SuperAdmin.tsx`, in the company detail/monitoring view, add a "Modul Yetkileri" section. This should show when a company is selected:

```typescript
// Add a collapsible section within the company detail area that shows:
// 1. Module selector (SALES / ACCOUNTING / HR tabs)
// 2. Company users list with checkboxes
// 3. Grant/Revoke buttons
// Pattern: similar to ModuleAccessTab but using super admin hooks + companyId param
```

The exact integration depends on the SuperAdmin page structure. The key changes:
- Import `useSuperAdminModuleAccess`, `grantModuleAccessSuperAdmin`, `revokeModuleAccessSuperAdmin`
- Add a "Modul Yetkileri" section in the MonitoringTab (where users are listed per company)
- Show SALES/ACCOUNTING/HR toggle buttons
- Next to each user row, show module access checkboxes

- [ ] **Step 3: Commit**

```bash
git add src/pages/SuperAdmin.tsx src/lib/erp-hooks.ts
git commit -m "feat: add module access management to SuperAdmin panel"
```

---

### Task 8: Frontend - Multi-Sheet Excel Export

**Files:**
- Modify: `src/lib/excelExport.ts`

- [ ] **Step 1: Add multi-sheet export function**

In `src/lib/excelExport.ts`, add after the existing `exportToExcel` function:

```typescript
export interface SheetData<T = any> {
  sheetName: string
  columns: ExcelColumn<T>[]
  rows: T[]
}

export function exportMultiSheet(opts: {
  filename: string
  sheets: SheetData[]
}): void {
  const wb = XLSX.utils.book_new()

  for (const sheet of opts.sheets) {
    if (sheet.rows.length === 0) {
      // Create empty sheet with headers only
      const ws = XLSX.utils.aoa_to_sheet([sheet.columns.map(c => c.header)])
      XLSX.utils.book_append_sheet(wb, ws, sheet.sheetName.slice(0, 31))
      continue
    }

    const headers = sheet.columns.map(c => c.header)
    const data = sheet.rows.map(row =>
      sheet.columns.map(c => {
        const val = c.accessor(row)
        if (typeof val === 'boolean') return val ? 'Evet' : 'Hayir'
        return val ?? ''
      })
    )

    const ws = XLSX.utils.aoa_to_sheet([headers, ...data])

    // Set column widths
    ws['!cols'] = sheet.columns.map(c => ({ wch: c.width ?? 16 }))

    // Freeze header row
    ws['!freeze'] = { xSplit: 0, ySplit: 1 }

    XLSX.utils.book_append_sheet(wb, ws, sheet.sheetName.slice(0, 31))
  }

  XLSX.writeFile(wb, opts.filename)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/excelExport.ts
git commit -m "feat: add multi-sheet Excel export utility"
```

---

### Task 9: Frontend - Per-Page Export Buttons

**Files:**
- Modify: All ERP tab components (9 files)

- [ ] **Step 1: Add export button to each ERP tab**

Add to each tab's toolbar area (next to search/filter), a FileSpreadsheet icon button. Pattern for each:

```typescript
// Add import:
import { FileSpreadsheet } from 'lucide-react'
import { exportToExcel } from '../../lib/excelExport'

// Add export handler:
const handleExport = () => {
  exportToExcel({
    filename: `satis_musteriler_${new Date().toISOString().slice(0, 10)}.xlsx`,
    sheetName: 'Musteriler',
    columns: [
      { header: 'Musteri Adi', accessor: (c: SalesCustomer) => c.name, width: 28 },
      { header: 'Tip', accessor: (c: SalesCustomer) => CUSTOMER_TYPE_LABELS[c.customerType], width: 14 },
      { header: 'Telefon', accessor: (c: SalesCustomer) => c.phone ?? '', width: 16 },
      { header: 'E-posta', accessor: (c: SalesCustomer) => c.email ?? '', width: 24 },
      { header: 'Vergi No', accessor: (c: SalesCustomer) => c.taxNumber ?? '', width: 14 },
      { header: 'Bakiye', accessor: (c: SalesCustomer) => Number(c.balance) || 0, width: 14 },
      { header: 'Kayit Tarihi', accessor: (c: SalesCustomer) => c.createdAt?.slice(0, 10) ?? '', width: 14 },
    ],
    rows: customers,
  })
}

// Add button in toolbar:
<button onClick={handleExport} className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface)] text-[var(--text-3)]" title="Excel">
  <FileSpreadsheet className="w-4 h-4" />
</button>
```

Apply the same pattern to:
- **CustomersTab**: Musteri adi, tip, telefon, email, vergi no, bakiye, tarih
- **OrdersTab**: Siparis no, musteri, durum, tutar, tarih
- **AccountsTab**: Hesap kodu, hesap adi, tip
- **JournalTab**: Fis no, tarih, aciklama, durum, borc, alacak
- **EInvoiceTab**: Fatura no, alici, tip, durum, tutar, tarih
- **EmployeesTab**: Ad, sicil no, departman, durum, maas, ise baslama
- **LeavesTab**: Calisan, izin turu, tarihler, gun, durum
- **PayrollTab**: (export bordro detaylari per period - acik olan period'un records'u)

- [ ] **Step 2: Commit**

```bash
git add src/components/sales/ src/components/accounting/ src/components/hr/
git commit -m "feat: add per-page Excel export buttons to all ERP tabs"
```

---

### Task 10: Frontend - Global Export Button in Header

**Files:**
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/lib/erp-hooks.ts`

- [ ] **Step 1: Add global export hooks**

In `src/lib/erp-hooks.ts`, add:

```typescript
// ── Global Export ────────────────────────────────────────────────────────────
export async function fetchAllExportData() {
  const [
    departments, users, tasks, inventory, stockItems, stockMovements,
    customers, orders, accounts, journal, einvoices,
    employees, leaves, payrollPeriods,
  ] = await Promise.all([
    api.get<any>('/departments').then((r: any) => r.data ?? r ?? []).catch(() => []),
    api.get<any>('/users?pageSize=1000').then((r: any) => r.data ?? r ?? []).catch(() => []),
    api.get<any>('/tasks?pageSize=1000').then((r: any) => r.data ?? r ?? []).catch(() => []),
    api.get<any>('/inventory?pageSize=1000').then((r: any) => r.data ?? r ?? []).catch(() => []),
    api.get<any>('/stock?pageSize=1000').then((r: any) => r.data ?? r ?? []).catch(() => []),
    api.get<any>('/stock/movements?pageSize=1000').then((r: any) => r.data ?? r ?? []).catch(() => []),
    api.get<any>('/sales/customers?pageSize=1000').then((r: any) => r.customers ?? r.data ?? []).catch(() => []),
    api.get<any>('/sales/orders?pageSize=1000').then((r: any) => r.orders ?? r.data ?? []).catch(() => []),
    api.get<any>('/accounting/accounts').catch(() => []),
    api.get<any>('/accounting/journal?pageSize=1000').then((r: any) => r.entries ?? r.data ?? []).catch(() => []),
    api.get<any>('/accounting/einvoice?pageSize=1000').then((r: any) => r.invoices ?? r.data ?? []).catch(() => []),
    api.get<any>('/hr/employees?pageSize=1000').then((r: any) => r.employees ?? r.data ?? []).catch(() => []),
    api.get<any>('/hr/leaves?pageSize=1000').then((r: any) => r.leaves ?? r.data ?? []).catch(() => []),
    api.get<any>('/hr/payroll/periods?pageSize=100').then((r: any) => r.periods ?? r.data ?? []).catch(() => []),
  ])

  return {
    departments, users, tasks, inventory, stockItems, stockMovements,
    customers, orders, accounts, journal, einvoices,
    employees, leaves, payrollPeriods,
  }
}
```

- [ ] **Step 2: Add global export button to Header**

In `src/components/layout/Header.tsx`:

```typescript
import { FileSpreadsheet } from 'lucide-react'
import { fetchAllExportData } from '../../lib/erp-hooks'
import { exportMultiSheet } from '../../lib/excelExport'

// Add state:
const [exporting, setExporting] = useState(false)

// Add handler:
const handleGlobalExport = async () => {
  setExporting(true)
  try {
    const data = await fetchAllExportData()
    exportMultiSheet({
      filename: `ActLedger_TumVeriler_${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheets: [
        { sheetName: 'Departmanlar', columns: [
          { header: 'Ad', accessor: (d: any) => d.name, width: 24 },
          { header: 'Kod', accessor: (d: any) => d.code, width: 10 },
        ], rows: data.departments },
        { sheetName: 'Kullanicilar', columns: [
          { header: 'Ad', accessor: (u: any) => u.name, width: 24 },
          { header: 'E-posta', accessor: (u: any) => u.email, width: 28 },
          { header: 'Rol', accessor: (u: any) => u.role, width: 16 },
        ], rows: data.users },
        { sheetName: 'Gorevler', columns: [
          { header: 'Baslik', accessor: (t: any) => t.title, width: 32 },
          { header: 'Durum', accessor: (t: any) => t.status, width: 14 },
          { header: 'Oncelik', accessor: (t: any) => t.priority, width: 12 },
          { header: 'Tarih', accessor: (t: any) => t.createdAt?.slice(0, 10), width: 12 },
        ], rows: data.tasks },
        { sheetName: 'Envanter', columns: [
          { header: 'Ad', accessor: (i: any) => i.name, width: 28 },
          { header: 'Kod', accessor: (i: any) => i.code ?? '', width: 14 },
          { header: 'Tip', accessor: (i: any) => i.type, width: 14 },
          { header: 'Miktar', accessor: (i: any) => i.quantity, width: 10 },
          { header: 'Durum', accessor: (i: any) => i.status, width: 12 },
        ], rows: data.inventory },
        { sheetName: 'Stok Durum', columns: [
          { header: 'Ad', accessor: (s: any) => s.name, width: 28 },
          { header: 'Kod', accessor: (s: any) => s.code ?? '', width: 14 },
          { header: 'Miktar', accessor: (s: any) => s.quantity, width: 10 },
          { header: 'Min', accessor: (s: any) => s.minLevel, width: 8 },
          { header: 'Kritik', accessor: (s: any) => s.criticalLevel, width: 8 },
        ], rows: data.stockItems },
        { sheetName: 'Stok Hareketleri', columns: [
          { header: 'Tip', accessor: (m: any) => m.type, width: 12 },
          { header: 'Miktar', accessor: (m: any) => m.quantity, width: 10 },
          { header: 'Onceki', accessor: (m: any) => m.previousQty, width: 10 },
          { header: 'Sonraki', accessor: (m: any) => m.newQty, width: 10 },
          { header: 'Tarih', accessor: (m: any) => m.createdAt?.slice(0, 10), width: 12 },
        ], rows: data.stockMovements },
        { sheetName: 'Musteriler', columns: [
          { header: 'Ad', accessor: (c: any) => c.name, width: 28 },
          { header: 'Tip', accessor: (c: any) => c.customerType, width: 14 },
          { header: 'Telefon', accessor: (c: any) => c.phone ?? '', width: 16 },
          { header: 'Bakiye', accessor: (c: any) => Number(c.balance) || 0, width: 14 },
        ], rows: data.customers },
        { sheetName: 'Siparisler', columns: [
          { header: 'Siparis No', accessor: (o: any) => o.orderNumber, width: 16 },
          { header: 'Musteri', accessor: (o: any) => o.customer?.name ?? '', width: 24 },
          { header: 'Durum', accessor: (o: any) => o.status, width: 14 },
          { header: 'Tutar', accessor: (o: any) => Number(o.totalAmount) || 0, width: 14 },
        ], rows: data.orders },
        { sheetName: 'Hesap Plani', columns: [
          { header: 'Kod', accessor: (a: any) => a.code, width: 12 },
          { header: 'Ad', accessor: (a: any) => a.name, width: 28 },
          { header: 'Tip', accessor: (a: any) => a.accountType, width: 14 },
        ], rows: data.accounts },
        { sheetName: 'Yevmiye', columns: [
          { header: 'Fis No', accessor: (j: any) => j.entryNumber, width: 16 },
          { header: 'Tarih', accessor: (j: any) => j.date?.slice(0, 10), width: 12 },
          { header: 'Aciklama', accessor: (j: any) => j.description, width: 32 },
          { header: 'Borc', accessor: (j: any) => Number(j.totalDebit) || 0, width: 14 },
          { header: 'Alacak', accessor: (j: any) => Number(j.totalCredit) || 0, width: 14 },
        ], rows: data.journal },
        { sheetName: 'E-Faturalar', columns: [
          { header: 'Fatura No', accessor: (i: any) => i.invoiceNumber, width: 16 },
          { header: 'Alici', accessor: (i: any) => i.receiverName, width: 24 },
          { header: 'Durum', accessor: (i: any) => i.status, width: 14 },
          { header: 'Tutar', accessor: (i: any) => Number(i.totalAmount) || 0, width: 14 },
          { header: 'Tarih', accessor: (i: any) => i.issueDate?.slice(0, 10), width: 12 },
        ], rows: data.einvoices },
        { sheetName: 'Calisanlar', columns: [
          { header: 'Ad', accessor: (e: any) => e.user?.name ?? '', width: 24 },
          { header: 'Sicil No', accessor: (e: any) => e.employeeNumber, width: 12 },
          { header: 'Durum', accessor: (e: any) => e.employmentStatus, width: 12 },
          { header: 'Maas', accessor: (e: any) => Number(e.grossSalary) || 0, width: 14 },
        ], rows: data.employees },
        { sheetName: 'Izinler', columns: [
          { header: 'Calisan', accessor: (l: any) => l.employee?.user?.name ?? '', width: 24 },
          { header: 'Tur', accessor: (l: any) => l.leaveType, width: 14 },
          { header: 'Baslangic', accessor: (l: any) => l.startDate?.slice(0, 10), width: 12 },
          { header: 'Bitis', accessor: (l: any) => l.endDate?.slice(0, 10), width: 12 },
          { header: 'Gun', accessor: (l: any) => l.days, width: 6 },
          { header: 'Durum', accessor: (l: any) => l.status, width: 12 },
        ], rows: data.leaves },
        { sheetName: 'Bordro', columns: [
          { header: 'Donem', accessor: (p: any) => `${p.year}-${String(p.month).padStart(2, '0')}`, width: 10 },
          { header: 'Durum', accessor: (p: any) => p.status, width: 14 },
          { header: 'Brut', accessor: (p: any) => Number(p.totalGross) || 0, width: 14 },
          { header: 'Net', accessor: (p: any) => Number(p.totalNet) || 0, width: 14 },
          { header: 'Calisan Sayisi', accessor: (p: any) => p._count?.records ?? 0, width: 14 },
        ], rows: data.payrollPeriods },
      ],
    })
  } catch (e: any) {
    alert(e.message ?? 'Export basarisiz')
  } finally {
    setExporting(false)
  }
}

// Add button between Print and Notifications (in the right-side controls area):
// Visible for PLATFORM_ADMIN+ only
{['platform_admin', 'super_admin', 'genel_mudur'].includes(user?.role ?? '') && (
  <button
    onClick={handleGlobalExport}
    disabled={exporting}
    className="p-2 rounded-lg hover:bg-[var(--surface)] text-[var(--text-3)] hover:text-emerald-500 transition-colors relative"
    title={lang === 'tr' ? 'Toplu Excel Export' : 'Export All Data'}
  >
    {exporting ? (
      <svg className="animate-spin w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    ) : (
      <FileSpreadsheet className="w-[18px] h-[18px]" />
    )}
  </button>
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Header.tsx src/lib/erp-hooks.ts
git commit -m "feat: add global Excel export button in Header - all platform data"
```

---

## Self-Review

**1. Spec coverage:**
- [x] Kullanici bazli modul yetkilendirme: Tasks 1-5
- [x] Super Admin yetki yonetimi: Task 7
- [x] KAM (PLATFORM_ADMIN) yetki yonetimi: Task 6
- [x] Mevcut kullanicilarin ERP'de gorunmesi: Zaten mevcut (EmployeesTab users fetch, OrdersTab customers list)
- [x] Sayfa bazli Excel export: Task 9
- [x] Toplu Excel export (AssetIQ dahil): Task 10
- [x] Multi-sheet Excel utility: Task 8

**2. Placeholder scan:** No TBDs or TODOs found. Task 7 (SuperAdmin UI) has slightly less detail for the UI integration due to the complex existing page structure - but the hooks and pattern are clear.

**3. Type consistency:** ModuleAccessEntry type defined in Task 6, used consistently in Tasks 6, 7. exportMultiSheet signature in Task 8, used in Task 10.

**Not in this plan (Faz 4):** GIB beyanname export - ayri plan olarak yazilacak.
