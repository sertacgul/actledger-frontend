# Mobile Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mevcut Capacitor hybrid yapiyi bozmadan UI uyumlulugunu, performansi ve push bildirim guvenilirligini iyilestirmek.

**Architecture:** 3 bagimsiz katman - her biri ayri deploy edilebilir. Katman 1 CSS/layout, Katman 2 React render optimizasyonu, Katman 3 push notification guvenilirligi. Mevcut desktop `/panel/*` rotalari ve backend API'leri degistirilmez.

**Tech Stack:** React 18, TypeScript, Tailwind CSS 3, Capacitor 7, Vite 5, OneSignal

---

## Dosya Haritasi

**Yeni dosyalar:**
- `src/components/ui/VirtualList.tsx` - Sanal liste componenti
- `src/components/ui/LazyImage.tsx` - Lazy image componenti
- `src/components/ui/PushBanner.tsx` - Foreground push banner

**Degistirilecek dosyalar:**
- `tailwind.config.js` - Ek breakpoint'ler
- `src/index.css` - Responsive CSS custom property'ler, clamp font scaling
- `src/components/layout/MobileLayout.tsx` - Adaptive layout, push lifecycle
- `src/App.tsx` - Lazy import'lar
- `src/pages/mobile/MobileTasks.tsx` - VirtualList, memo
- `src/pages/mobile/MobileMessages.tsx` - VirtualList, memo, maxWidth fix
- `src/pages/mobile/MobileNotifications.tsx` - VirtualList, memo
- `src/pages/mobile/MobileWorkOrders.tsx` - VirtualList, memo
- Backend: `src/modules/notifications/notifications.service.ts` - data payload
- Backend: `src/modules/notifications/notifications.router.ts` - unsubscribe endpoint
- Backend: `src/modules/mobile-auth/mobile-auth.controller.ts` - logout cleanup

---

## KATMAN 1: Adaptive Layout

### Task 1: Tailwind breakpoint'ler ve CSS responsive token'lar

**Files:**
- Modify: `tailwind.config.js`
- Modify: `src/index.css:1-45`

- [ ] **Step 1: Tailwind'e mobil breakpoint'ler ekle**

`tailwind.config.js` - `theme.extend` icine `screens` ekle:

```js
screens: {
  'xs': '375px',
  'phone': '430px',
  'tablet': '600px',
},
```

- [ ] **Step 2: CSS'e responsive font token'lar ekle**

`src/index.css` - `:root` blogunun icine, `--radius-lg` satirindan sonra ekle:

```css
  /* Responsive typography */
  --text-xs:    clamp(10px, 2.6vw, 12px);
  --text-sm:    clamp(12px, 3.0vw, 14px);
  --text-base:  clamp(13px, 3.2vw, 16px);
  --text-lg:    clamp(16px, 4.0vw, 20px);
  --text-xl:    clamp(20px, 5.0vw, 28px);

  /* Responsive spacing */
  --space-page: clamp(12px, 3vw, 24px);
  --touch-min:  44px;
```

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.js src/index.css
git commit -m "feat: add responsive breakpoints and CSS clamp tokens"
```

---

### Task 2: MobileLayout adaptive container

**Files:**
- Modify: `src/components/layout/MobileLayout.tsx:216`

- [ ] **Step 1: maxWidth:480 kaldirip adaptive yap**

`MobileLayout.tsx` satir 216'daki `style` attribute'unu degistir:

Eski:
```tsx
<div className="flex flex-col h-[100dvh] bg-slate-50" style={{ maxWidth: 480, margin: '0 auto', overflowX: 'hidden', ...(isPWA && { paddingTop: 50, boxSizing: 'border-box' }) }}>
```

Yeni:
```tsx
<div className="flex flex-col h-[100dvh] bg-slate-50 mx-auto w-full max-w-[100vw] tablet:max-w-[768px]" style={{ overflowX: 'hidden', ...(isPWA && { paddingTop: 'max(50px, env(safe-area-inset-top))', boxSizing: 'border-box' }) }}>
```

- [ ] **Step 2: MobileMessages conversation view'daki sabit maxWidth'i kaldor**

`MobileMessages.tsx` satir 311'deki `style` attribute'unu degistir:

Eski:
```tsx
<div className="fixed inset-0 z-50 flex flex-col bg-slate-50" style={{ maxWidth: 480, margin: '0 auto' }}>
```

Yeni:
```tsx
<div className="fixed inset-0 z-50 flex flex-col bg-slate-50 mx-auto w-full max-w-[100vw] tablet:max-w-[768px]">
```

- [ ] **Step 3: Safe-area padding eklentileri**

`src/index.css` - dosyanin sonuna ekle:

```css
/* ---- Safe Area for all devices ---- */
@supports (padding: env(safe-area-inset-top)) {
  .safe-top    { padding-top:    env(safe-area-inset-top) !important; }
  .safe-bottom { padding-bottom: env(safe-area-inset-bottom) !important; }
  .safe-left   { padding-left:   env(safe-area-inset-left) !important; }
  .safe-right  { padding-right:  env(safe-area-inset-right) !important; }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/MobileLayout.tsx src/pages/mobile/MobileMessages.tsx src/index.css
git commit -m "feat: adaptive layout - remove 480px cap, add safe-area support"
```

---

### Task 3: Bottom nav responsive uyumu

**Files:**
- Modify: `src/components/layout/MobileLayout.tsx:325-410`

- [ ] **Step 1: Nav bar'a responsive class'lar ekle**

Satir 325'teki `<nav>` elemanini degistir:

Eski:
```tsx
<nav className="flex items-stretch border-t border-slate-200 bg-white relative">
```

Yeni:
```tsx
<nav className="flex items-stretch border-t border-slate-200 bg-white relative safe-bottom" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
```

- [ ] **Step 2: Min-height'i responsive yap**

Satir 357 ve 377'deki `min-h-[56px]`'leri degistir:

Eski: `min-h-[56px]`
Yeni: `min-h-[var(--touch-min)] tablet:min-h-[56px]`

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/MobileLayout.tsx
git commit -m "feat: responsive bottom nav with safe-area bottom padding"
```

---

### Task 4: Mobil sayfalarda dokunma hedefi ve layout fix

**Files:**
- Modify: `src/pages/mobile/MobileTasks.tsx`
- Modify: `src/pages/mobile/MobileWorkOrders.tsx`
- Modify: `src/pages/mobile/MobileNotifications.tsx`

- [ ] **Step 1: MobileTasks - liste ogelerini responsive yap**

Her gorev satir tiklanabilir ogesi icin `min-h-[var(--touch-min)]` ekle. Sayfa container padding'i `p-4` yerine `p-[var(--space-page)]` yap.

- [ ] **Step 2: MobileWorkOrders - ayni pattern**

Ayni degisiklikler: touch hedefi + responsive padding.

- [ ] **Step 3: MobileNotifications - ayni pattern**

Satir 88'deki `p-4` padding'ini `p-[var(--space-page)]` yap. Bildirim butonlarina `min-h-[var(--touch-min)]` ekle.

- [ ] **Step 4: Commit**

```bash
git add src/pages/mobile/MobileTasks.tsx src/pages/mobile/MobileWorkOrders.tsx src/pages/mobile/MobileNotifications.tsx
git commit -m "feat: responsive touch targets and spacing on mobile pages"
```

---

## KATMAN 2: Performans

### Task 5: VirtualList componenti

**Files:**
- Create: `src/components/ui/VirtualList.tsx`

- [ ] **Step 1: VirtualList componentini olustur**

```tsx
import { useRef, useState, useEffect, useCallback, type ReactNode } from 'react'

interface VirtualListProps<T> {
  items: T[]
  itemHeight: number
  overscan?: number
  renderItem: (item: T, index: number) => ReactNode
  className?: string
}

export default function VirtualList<T>({ items, itemHeight, overscan = 5, renderItem, className }: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(entries => {
      setContainerHeight(entries[0].contentRect.height)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const onScroll = useCallback(() => {
    if (containerRef.current) setScrollTop(containerRef.current.scrollTop)
  }, [])

  const totalHeight = items.length * itemHeight
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(items.length, Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan)
  const offsetY = startIndex * itemHeight

  return (
    <div ref={containerRef} onScroll={onScroll} className={className} style={{ overflow: 'auto', position: 'relative' }}>
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ position: 'absolute', top: offsetY, left: 0, right: 0 }}>
          {items.slice(startIndex, endIndex).map((item, i) => (
            <div key={startIndex + i} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + i)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/VirtualList.tsx
git commit -m "feat: add VirtualList component for performant long lists"
```

---

### Task 6: LazyImage componenti

**Files:**
- Create: `src/components/ui/LazyImage.tsx`

- [ ] **Step 1: LazyImage componentini olustur**

```tsx
import { useRef, useState, useEffect } from 'react'

interface LazyImageProps {
  src: string
  alt?: string
  fallback?: string
  className?: string
  width?: number
  height?: number
}

export default function LazyImage({ src, alt = '', fallback, className, width, height }: LazyImageProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = imgRef.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); observer.disconnect() }
    }, { rootMargin: '200px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <img
      ref={imgRef}
      src={inView ? src : undefined}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.2s', background: loaded ? undefined : '#e2e8f0' }}
      onLoad={() => setLoaded(true)}
      onError={e => { if (fallback) (e.target as HTMLImageElement).src = fallback }}
    />
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/LazyImage.tsx
git commit -m "feat: add LazyImage component with IntersectionObserver"
```

---

### Task 7: Route-bazli code splitting

**Files:**
- Modify: `src/App.tsx:1-30` (import'lar) ve `src/App.tsx:179-194` (mobile route'lar)

- [ ] **Step 1: Mobil sayfa import'larini lazy yap**

`App.tsx` dosyasinin basindaki direct import'lari lazy import'a cevir. Mevcut direct import satirlarini bul ve degistir:

Eski (dosyanin basindaki import'lar arasinda):
```tsx
import MobileTasks from './pages/mobile/MobileTasks'
import MobileTaskDetail from './pages/mobile/MobileTaskDetail'
import MobileForms from './pages/mobile/MobileForms'
import MobileFormFill from './pages/mobile/MobileFormFill'
import MobileReportAction from './pages/mobile/MobileReportAction'
import MobileMessages from './pages/mobile/MobileMessages'
import MobileNotifications from './pages/mobile/MobileNotifications'
import MobileProfile from './pages/mobile/MobileProfile'
import MobileOperIQ from './pages/mobile/MobileOperIQ'
import MobileQRScanner from './pages/mobile/MobileQRScanner'
import MobileWorkOrders from './pages/mobile/MobileWorkOrders'
```

Yeni:
```tsx
import { lazy, Suspense } from 'react'

const MobileTasks = lazy(() => import('./pages/mobile/MobileTasks'))
const MobileTaskDetail = lazy(() => import('./pages/mobile/MobileTaskDetail'))
const MobileForms = lazy(() => import('./pages/mobile/MobileForms'))
const MobileFormFill = lazy(() => import('./pages/mobile/MobileFormFill'))
const MobileReportAction = lazy(() => import('./pages/mobile/MobileReportAction'))
const MobileMessages = lazy(() => import('./pages/mobile/MobileMessages'))
const MobileNotifications = lazy(() => import('./pages/mobile/MobileNotifications'))
const MobileProfile = lazy(() => import('./pages/mobile/MobileProfile'))
const MobileOperIQ = lazy(() => import('./pages/mobile/MobileOperIQ'))
const MobileQRScanner = lazy(() => import('./pages/mobile/MobileQRScanner'))
const MobileWorkOrders = lazy(() => import('./pages/mobile/MobileWorkOrders'))
```

NOT: `MobileLogin` ve `MobileForcePasswordChange` lazy YAPMA - bunlar ilk acilis icin gerekli.

- [ ] **Step 2: MobileLayout Outlet'ini Suspense ile sar**

`MobileLayout.tsx` satir 320'deki `<Outlet />`'i Suspense ile sar:

Eski:
```tsx
<main className="flex-1 overflow-y-auto overscroll-contain">
  <Outlet />
</main>
```

Yeni:
```tsx
<main className="flex-1 overflow-y-auto overscroll-contain">
  <Suspense fallback={<div className="flex items-center justify-center h-32"><Loader2 size={20} className="animate-spin text-slate-400" /></div>}>
    <Outlet />
  </Suspense>
</main>
```

`Suspense` ve `Loader2` import'larini kontrol et - `Suspense` React'ten, `Loader2` zaten import edilmis olmali.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx src/components/layout/MobileLayout.tsx
git commit -m "feat: lazy load mobile pages for smaller initial bundle"
```

---

### Task 8: MobileTasks ve MobileNotifications'a memo ekle

**Files:**
- Modify: `src/pages/mobile/MobileTasks.tsx`
- Modify: `src/pages/mobile/MobileNotifications.tsx`

- [ ] **Step 1: MobileTasks - liste ogesi icin memo'd component**

`MobileTasks.tsx` dosyasina, `export default function MobileTasks` oncesine ekle:

```tsx
const TaskRow = React.memo(function TaskRow({ task, onClick, lang }: { task: Task; onClick: () => void; lang: string }) {
  const tr = lang === 'tr'
  const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.beklemede
  const priCfg = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.normal
  return (
    <button type="button" onClick={onClick}
      className={clsx('w-full text-left rounded-xl border p-3.5 transition-colors active:scale-[0.98]', cfg.bg, cfg.border)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[var(--text-sm)] font-semibold text-slate-800 flex-1 leading-snug">{task.title}</p>
        <span className={clsx('px-2 py-0.5 rounded-full text-[var(--text-xs)] font-medium', priCfg)}>{task.priority}</span>
      </div>
      {task.departmentName && <p className="text-[var(--text-xs)] text-slate-500 mt-1">{task.departmentName}</p>}
      <div className="flex items-center gap-2 mt-2">
        <span className={clsx('text-[var(--text-xs)] font-medium', cfg.color)}>{task.status.replace('_', ' ')}</span>
        {task.dueDate && (
          <span className="text-[var(--text-xs)] text-slate-400 flex items-center gap-1">
            <Clock size={10} />{new Date(task.dueDate).toLocaleDateString(tr ? 'tr-TR' : 'en-US')}
          </span>
        )}
      </div>
    </button>
  )
})
```

Dosyanin basina `import React from 'react'` ekle (zaten yoksa).

Sonra mevcut gorev listesi render'inda bu componenti kullan.

- [ ] **Step 2: MobileNotifications - bildirim ogesi icin memo'd component**

Benzer sekilde `NotificationRow` componenti olustur ve memo ile sar.

- [ ] **Step 3: Commit**

```bash
git add src/pages/mobile/MobileTasks.tsx src/pages/mobile/MobileNotifications.tsx
git commit -m "feat: memo task and notification rows to prevent unnecessary re-renders"
```

---

## KATMAN 3: Push Bildirim Guvenilirligi

### Task 9: PushBanner componenti (foreground bildirim)

**Files:**
- Create: `src/components/ui/PushBanner.tsx`

- [ ] **Step 1: PushBanner componentini olustur**

```tsx
import { useState, useEffect } from 'react'
import { X, Bell } from 'lucide-react'

interface PushBannerData {
  title: string
  message: string
  link?: string
}

let _showBanner: ((data: PushBannerData) => void) | null = null

export function triggerPushBanner(data: PushBannerData) {
  _showBanner?.(data)
}

export default function PushBanner({ onNavigate }: { onNavigate: (link: string) => void }) {
  const [banner, setBanner] = useState<PushBannerData | null>(null)

  useEffect(() => {
    _showBanner = (data) => {
      setBanner(data)
      setTimeout(() => setBanner(null), 4000)
    }
    return () => { _showBanner = null }
  }, [])

  if (!banner) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] mx-auto animate-slide-up"
      style={{ maxWidth: 'inherit', paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <button
        type="button"
        onClick={() => { if (banner.link) onNavigate(banner.link); setBanner(null) }}
        className="w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-lg px-4 py-3 flex items-start gap-3 text-left"
      >
        <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bell size={14} className="text-cyan-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-slate-800 truncate">{banner.title}</p>
          <p className="text-[12px] text-slate-500 truncate">{banner.message}</p>
        </div>
        <button type="button" onClick={e => { e.stopPropagation(); setBanner(null) }} className="p-1 text-slate-400">
          <X size={14} />
        </button>
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/PushBanner.tsx
git commit -m "feat: add PushBanner component for foreground notifications"
```

---

### Task 10: Token lifecycle ve foreground handling

**Files:**
- Modify: `src/components/layout/MobileLayout.tsx:36-60`

- [ ] **Step 1: Token lifecycle - degisen token'i kaydet**

MobileLayout'un push registration bolumunu (satir 36-60) guncelle. `PushNotifications.addListener('registration', ...)` icinde token karsilastirmasi ekle:

Mevcut `registration` listener'ini su sekilde guncelle:

```tsx
PushNotifications.addListener('registration', async (token) => {
  const val = token?.value
  if (!val) return
  const platform = cap.getPlatform?.() === 'ios' ? 'apns' : 'fcm'
  const prevToken = localStorage.getItem('actledger_push_token')
  // Only register if token changed or first time
  if (val !== prevToken) {
    try {
      await api.post('/notifications/device-token', { token: val, platform })
      localStorage.setItem('actledger_push_token', val)
      console.log('[Push] Token registered (' + platform + ')')
    } catch (e) { console.error('[Push] Registration failed:', e) }
  }
})
```

- [ ] **Step 2: Foreground push banner entegrasyonu**

Ayni dosyada, `pushNotificationReceived` listener'ini guncelle:

```tsx
PushNotifications.addListener('pushNotificationReceived', (notification) => {
  // Show in-app banner when push arrives while app is in foreground
  triggerPushBanner({
    title: notification.title || 'Bildirim',
    message: notification.body || '',
    link: (notification.data as any)?.link,
  })
})
```

Dosyanin basina import ekle: `import { triggerPushBanner } from '../ui/PushBanner'`

- [ ] **Step 3: PushBanner'i MobileLayout return JSX'ine ekle**

Satir 216'daki ana div'in icinde, en basa ekle:

```tsx
<PushBanner onNavigate={(link) => navigate(link.startsWith('/m/') ? link : `/m${link}`)} />
```

Import ekle: `import PushBanner from '../ui/PushBanner'`

- [ ] **Step 4: Deep link - pushNotificationActionPerformed handler**

Mevcut `pushNotificationActionPerformed` listener'ini guncelle:

```tsx
PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
  const data = action.notification.data as any
  if (data?.link) {
    const link = data.link.startsWith('/m/') ? data.link : `/m${data.link}`
    // Small delay to ensure app is ready
    setTimeout(() => navigate(link), 300)
  }
})
```

`navigate` zaten `useNavigate()`'den geliyor olmali - yoksa import ekle.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/MobileLayout.tsx
git commit -m "feat: push token lifecycle, foreground banner, deep link navigation"
```

---

### Task 11: Backend - bildirim data payload ve unsubscribe

**Files:**
- Modify: `actledger-backend/src/modules/notifications/notifications.service.ts:47-56`
- Modify: `actledger-backend/src/modules/notifications/notifications.router.ts`
- Modify: `actledger-backend/src/modules/mobile-auth/mobile-auth.controller.ts:43-50`

- [ ] **Step 1: createAndPush'a data payload ekle**

`notifications.service.ts` - `createAndPush` fonksiyonunun parametre tipine `data` ekle:

```tsx
export async function createAndPush(params: {
  companyId: string
  userId: string
  title: string
  message: string
  type?: string
  link?: string
  data?: Record<string, string>  // <-- yeni
}) {
```

OneSignal request body'sine `data` ekle (satir ~47-56 arasindaki `JSON.stringify` icinde):

```tsx
const body = JSON.stringify({
  app_id: appId,
  include_player_ids: subIds,
  headings: { en: params.title },
  contents: { en: params.message },
  ios_sound: 'default',
  android_sound: 'default',
  data: { link: params.link || '/', ...params.data },
})
```

Web push payload'una da ayni data'yi ekle (satir ~79):

```tsx
const payload = JSON.stringify({
  title: params.title,
  body: params.message,
  url: params.link || '/',
  data: params.data,
})
```

- [ ] **Step 2: Unsubscribe endpoint ekle**

`notifications.router.ts` - mevcut route'lardan sonra ekle:

```tsx
router.delete('/push-unsubscribe', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.pushSubscription.deleteMany({ where: { userId: req.user.sub } })
    res.json({ success: true })
  } catch (e) { next(e) }
})
```

- [ ] **Step 3: Logout'ta push subscription temizligi**

`mobile-auth.controller.ts` - logout fonksiyonunda `clearCookie`'den once ekle:

```tsx
export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawToken = req.cookies[COOKIE_REFRESH_TOKEN] as string | undefined
    await svc.logout(req.user.sub, rawToken)
    // Clean up push subscriptions
    await prisma.pushSubscription.deleteMany({ where: { userId: req.user.sub } }).catch(() => {})
    res.clearCookie(COOKIE_REFRESH_TOKEN, { path: '/api/v1' })
    ok(res, null, 'Cikis yapildi')
  } catch (err) { next(err) }
}
```

`prisma` import'unu dosyanin basina ekle: `import prisma from '../../core/prisma/prisma.client'`

- [ ] **Step 4: Commit**

```bash
git add src/modules/notifications/notifications.service.ts src/modules/notifications/notifications.router.ts src/modules/mobile-auth/mobile-auth.controller.ts
git commit -m "feat: push data payload, unsubscribe endpoint, logout cleanup"
```

---

### Task 12: Build, deploy ve test

**Files:** Hicbir dosya degistirilmez - sadece build ve deploy.

- [ ] **Step 1: Frontend build ve Cloudflare deploy**

```bash
cd actledger-frontend
npm run build
npx wrangler pages deploy dist --project-name=actledger-landing --branch=main --commit-dirty=true
```

- [ ] **Step 2: Backend deploy (Railway)**

```bash
cd actledger-backend
railway up
```

- [ ] **Step 3: Capacitor sync ve PlayStore build**

```bash
cd actledger-frontend
npx cap sync android
# versionCode artir (build.gradle'da)
git add -A && git commit -m "chore: bump versionCode for PlayStore"
git push origin main
gh workflow run "Android Build & Play Store" --ref main
```

- [ ] **Step 4: Test**

Cihaz bazli test kontrol listesi:
- [ ] Kucuk telefon (320px) - ekran tasmasi yok
- [ ] Standart telefon (375px) - normal gorunum
- [ ] Buyuk telefon (430px+) - genis kullanim
- [ ] iPad/tablet (768px) - 2 sutun layout (varsa)
- [ ] PWA (ana ekrana ekle) - safe-area dogru
- [ ] Push bildirimi - foreground banner gorunuyor
- [ ] Push tiklanma - dogru sayfaya gidiyor
- [ ] Uzun liste scroll - kasma yok
- [ ] Sayfa gecisleri - hizli yukleniyor

- [ ] **Step 5: Final commit ve tag**

```bash
git tag v1.4.0
git push origin v1.4.0
```
