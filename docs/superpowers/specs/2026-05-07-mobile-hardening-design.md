# Mobile Hardening - Design Spec

**Tarih:** 2026-05-07
**Amac:** Mevcut Capacitor hybrid yapiyi koruyarak UI uyumlulugu, performansi ve push bildirim guvenilirligini iyilestirmek.
**Kisitlama:** Desktop `/panel/*` rotalari, backend API'leri ve mevcut Apple Store / PlayStore / Web build pipeline'i degistirilmez.

---

## Kapsam

3 katmanli iyilestirme:

| Katman | Hedef | Etki Alani |
|--------|-------|------------|
| 1. UI/Responsive | Ekran tasmalari, cihaz uyumu | CSS/layout, MobileLayout, tum mobil sayfalar |
| 2. Performans | Yavaslik, kasma | Render optimizasyonu, bundle splitting, lazy loading |
| 3. Push/Native | Bildirim guvenilmezligi | Token yonetimi, foreground handling, deep link |

---

## Katman 1: Adaptive Layout Sistemi

### Sorun
- `maxWidth: 480px` sabit kodlu - kucuk telefonlarda tasiyor, buyuk telefonlarda bosluk, tablet/kiosk'ta kucuk kutu
- Safe-area inset'ler (notch, dynamic island, alt bar) bazi cihazlarda yanlis hesaplaniyor
- Font boyutlari cihaz buyuklugune gore olceklenmiyor

### Cihaz Siniflari

```
phone-small:  < 375px   (iPhone SE, eski Android)
phone:        375-430px (standart telefonlar)
phone-large:  430-600px (buyuk telefonlar, phablet)
tablet:       600-1024px (iPad Mini, Android tablet, kiosk)
tablet-large: > 1024px  (iPad Pro, buyuk kiosk)
```

### Degisiklikler

**1. MobileLayout.tsx**
- `maxWidth: 480px` kaldirilir, `max-width: 100%` yapilir
- Tailwind breakpoint'ler eklenir: `xs` (375px), `sm` (430px), `md` (600px), `lg` (1024px)
- Safe-area: `env(safe-area-inset-top/bottom/left/right)` tum kenarlar icin uygulanir
- Bottom nav yuksekligi: telefonda 56px, tablette 64px

**2. Dinamik font scaling**
- CSS `clamp()` ile min-ideal-max: `clamp(12px, 3.2vw, 16px)` gibi
- Heading, body, caption icin 3 olcek tanimlanir
- `index.css`'e CSS custom property'ler eklenir

**3. Liste/kart layout**
- Telefonda tek sutun
- Tablette (600px+) 2 sutun grid
- Kart boyutlari yuzde bazli (sabit px yerine)

**4. Dokunma hedefleri**
- Minimum 44x44px (Apple HIG standardi)
- Buton ve tiklanabilir alanlarda `min-h-[44px] min-w-[44px]` zorlanir

### Etkilenen Dosyalar
- `src/components/layout/MobileLayout.tsx` - Ana layout
- `src/index.css` - CSS custom property'ler, clamp degerler
- `tailwind.config.js` - Ek breakpoint'ler
- `src/pages/mobile/*.tsx` - 13 mobil sayfa (layout siniflari guncellenir)
- `capacitor.config.ts` - viewport ayarlari

### Dokunulmayacaklar
- Desktop `/panel/*` rotalari
- Component state/logic mantiklari
- API cagrilari

---

## Katman 2: Performans Iyilestirmeleri

### Sorun
- Tum liste ogeleri bir seferde render ediliyor (50+ ogede yavaslik)
- Polling her 4 saniyede state guncelliyor, gereksiz re-render
- 4.6MB tek JS bundle, ilk acilista agir
- Resimler optimize edilmeden yukleniyor

### Degisiklikler

**1. Sanal Liste (Virtualized List)**
- Uzun listeler icin hafif bir virtual scroll componenti eklenir (kendi yazdimiz, harici kutuphane degil)
- Sadece gorunen ogeler + buffer (ust/alt 5 oge) render edilir
- Uygulanacak sayfalar: MobileMessages (sohbet listesi + mesajlar), MobileTasks (gorev listesi), MobileNotifications, MobileWorkOrders

**2. React.memo ile Re-render Onleme**
- Liste ogesi componentleri `React.memo()` ile sarilir
- Polling sonuclari referans karsilastirmasi (useMemo/useCallback) ile kontrol edilir
- Sadece veri degistiginde re-render tetiklenir

**3. Route-Bazli Code Splitting**
- `React.lazy()` + `Suspense` ile her mobil sayfa ayri chunk olur
- Ornek: `const MobileMessages = lazy(() => import('./pages/mobile/MobileMessages'))`
- Ilk acilista sadece login + gorevler sayfasi yuklenir, diger sayfalar ihtiyac halinde

**4. Lazy Image Loading**
- Resim/avatar componentine `loading="lazy"` + IntersectionObserver
- Placeholder (gri kutu veya initials) gosterilir, gorunen alana yaklasinca yuklenir
- Avatar boyutlari: kucuk (32px), orta (40px), buyuk (48px) - gereksiz buyuk resim cekilmez

### Etkilenen Dosyalar
- `src/App.tsx` - lazy import'lar
- `src/pages/mobile/MobileMessages.tsx` - sanal liste, memo
- `src/pages/mobile/MobileTasks.tsx` - sanal liste, memo
- `src/pages/mobile/MobileNotifications.tsx` - sanal liste
- `src/pages/mobile/MobileWorkOrders.tsx` - sanal liste
- Yeni: `src/components/ui/VirtualList.tsx` - virtual scroll componenti
- Yeni: `src/components/ui/LazyImage.tsx` - lazy image componenti

### Dokunulmayacaklar
- Backend API'ler
- Mevcut API cagrisi mantiklari (sadece render katmani optimize edilir)
- Desktop sayfalari

---

## Katman 3: Push Bildirim Guvenilirligi

### Sorun
- Token sadece ilk acilista kaydediliyor, yenilenmezse gecersiz oluyor
- Foreground'da push sessizce yutuluyor
- Bildirime tiklaninca spesifik sayfaya gitmiyor
- Eski/gecersiz subscription'lar veritabaninda birikiyor

### Degisiklikler

**1. Token Lifecycle Yonetimi**
- Her uygulama acilisinda `PushNotifications.register()` cagrilir
- Token localStorage'da saklanir (`actledger_push_token`)
- Yeni token eski token'dan farkliysa backend'e gonderilir, eski subscription silinir
- Token karsilastirmasi: `if (newToken !== localStorage.getItem('actledger_push_token'))`

**2. Foreground In-App Banner**
- `pushNotificationReceived` listener'inda toast banner gosterilir
- Banner: ust kisimda 4 saniye gorunen kaydirilamaz bildirim
- Icerik: baslik + kisa mesaj + tikla icin CTA
- Tiklandiginda ilgili sayfaya navigate

**3. Deep Link - Bildirime Tiklaninca Dogru Sayfa**
- Backend: her bildirimde `data` payload eklenir (type + entityId)
- Frontend: `pushNotificationActionPerformed` listener'inda data parse edilir
- Yonlendirme kurallari:
  - `type: GOREV` -> `/m/gorev/{entityId}`
  - `type: MESAJ, partnerId: X` -> `/m/mesajlar?partnerId={X}`
  - `type: WORK_ORDER` -> `/m/is-siparisleri?id={entityId}`
  - `type: RAPOR` -> `/m/rapor/{entityId}`
  - Diger -> `/m/bildirimler`

**4. Stale Subscription Temizligi**
- OneSignal 410/404/400 hatalarinda subscription veritabanindan silinir
- Kullanici logout yaptiginda: `DELETE /notifications/push-unsubscribe` cagrisi
- Backend: logout endpoint'inde kullanicinin tum push subscription'larini sil

**5. Backend Bildirim Data Payload**
- `createAndPush()` fonksiyonuna `data` parametresi eklenir
- OneSignal request'ine `data: { type, entityId, link }` eklenir
- Web push payload'una ayni data eklenir

### Etkilenen Dosyalar
- `src/components/layout/MobileLayout.tsx` - Token lifecycle, foreground banner, deep link
- Yeni: `src/components/ui/PushBanner.tsx` - Foreground bildirim banneri
- Backend: `src/modules/notifications/notifications.service.ts` - data payload
- Backend: `src/modules/notifications/notifications.router.ts` - unsubscribe endpoint
- Backend: `src/modules/auth/auth.controller.ts` - logout'ta subscription temizligi
- Backend: `src/modules/mobile-auth/mobile-auth.controller.ts` - ayni

### Dokunulmayacaklar
- OneSignal provider'i (degistirilmeyecek)
- Web push VAPID mantigi
- Mevcut notification DB modeli

---

## Test Stratejisi

Her katman icin:

| Test | Yontem |
|------|--------|
| Kucuk telefon (iPhone SE boyutu) | Chrome DevTools device emulator 320px |
| Standart telefon | Gercek cihaz (Android + iOS) |
| Buyuk telefon | Chrome DevTools 430px+ |
| Tablet | iPad veya Chrome DevTools 768px |
| PWA | Chrome'dan "Ana ekrana ekle" ile test |
| Push (iOS) | TestFlight build |
| Push (Android) | PlayStore internal/closed test |
| Performans | Chrome Lighthouse + React DevTools Profiler |

---

## Sirket/Kapsam Notu

- Bu spec sadece `actledger-frontend` ve `actledger-backend` projelerini kapsar
- Degisiklikler geriye uyumlu - mevcut kullanicilar guncelleme almadan da uygulamayi kullanmaya devam eder
- Her katman bagimsiz deploy edilebilir
