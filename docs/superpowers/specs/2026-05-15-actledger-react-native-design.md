# ActLedger React Native Mobile App — Design Spec

**Tarih:** 2026-05-15
**Durum:** Onaylandı
**Kapsam:** Mevcut Capacitor hybrid uygulamayı tamamen yeni bir React Native (Expo) uygulaması ile değiştirmek

---

## 1. Motivasyon

Mevcut mobil uygulama Capacitor 7 üzerinde çalışan bir WebView hybrid app. İki temel sorun:

1. **Performans** — Sayfa geçişleri yavaş, scroll kasıyor, animasyonlar pürüzsüz değil
2. **Native his eksikliği** — Uygulama "web sitesi gibi" hissettiriyor, iOS/Android native uygulaması gibi değil

Bu sorunlar WebView'ün yapısal limitleri — Capacitor'da kalarak çözülemezler.

## 2. Kısıtlar (Dokunulmaz Kurallar)

- Mevcut `actledger-frontend/` dizinine **sıfır değişiklik**
- Mevcut `actledger-backend/` dizinine **sıfır değişiklik**
- Canlıdaki App Store uygulamasına dokunulmaz
- Canlıdaki Play Store uygulamasına dokunulmaz
- Canlıdaki PWA (telefondan ana ekrana eklenen) uygulamaya dokunulmaz
- Backend API'ye sıfır değişiklik — yeni app aynı endpoint'lere bağlanır
- Tek geliştirici + AI destekli geliştirme

## 3. Proje Yapısı

```
C:\Users\serta\actledger-native\       ← tamamen yeni, bağımsız proje
├── app/                                ← Expo Router sayfa dizini
├── components/                         ← paylaşılan UI bileşenleri
├── lib/                                ← API client, socket, storage, auth
├── hooks/                              ← custom hooks
├── assets/                             ← font, ikon, splash, app icon
├── constants/                          ← tema, renkler, spacing
├── app.json                            ← Expo config
├── eas.json                            ← EAS Build config (mağaza deploy)
└── package.json
```

## 4. Teknoloji Yığını

| Katman | Seçim | Neden |
|--------|-------|-------|
| Framework | Expo SDK 53 (managed) | Tek komutla iOS + Android build, OTA update |
| Navigation | Expo Router v4 | Dosya-tabanlı routing, otomatik deep link |
| Animasyon | React Native Reanimated 3 | 60fps native thread animasyonlar |
| Gesture | React Native Gesture Handler | Native gesture tanıma |
| State | Zustand | Hafif, TypeScript-friendly |
| API | Axios + custom interceptor | Mevcut api.ts mantığını port |
| Real-time | socket.io-client | Mevcut backend Socket.io ile uyumlu |
| Offline DB | expo-sqlite | IndexedDB sync mantığının native karşılığı |
| Push | expo-notifications + FCM/APNs | Expo native push |
| Harita | react-native-maps | Google Maps (Android) + Apple Maps (iOS) |
| Grafik | Victory Native | Skia rendering |
| PDF | react-native-pdf | Native PDF viewer |
| QR/Barkod | expo-camera | Dahili barkod/QR tarama |
| Spreadsheet | xlsx | RN'de de çalışır |
| Stil | Nativewind v4 | Tailwind for RN — mevcut bilgi transfer olur |
| Liste | FlashList (Shopify) | FlatList'ten 5-10x hızlı |
| Bottom Sheet | @gorhom/bottom-sheet | Native gesture-driven |
| UI Kit | React Native Paper (Material 3) | Platform-adaptive temel bileşenler |

## 5. Sayfa Yapısı ve Navigasyon

### Dosya Ağacı

```
app/
├── _layout.tsx                    ← Root layout (auth check, font, splash)
├── (auth)/
│   ├── _layout.tsx
│   ├── login.tsx                  ← Login kodu (ACT-XXXXXX) + şifre
│   └── force-password-change.tsx  ← İlk girişte şifre değiştirme
├── (app)/
│   ├── _layout.tsx                ← Bottom Tab Navigator
│   ├── (home)/
│   │   ├── _layout.tsx            ← Stack navigator
│   │   └── index.tsx              ← Dashboard
│   ├── (tasks)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx              ← Görev listesi
│   │   ├── [id].tsx               ← Görev detay
│   │   ├── work-orders/
│   │   │   ├── index.tsx          ← İş emirleri listesi
│   │   │   └── [id].tsx           ← İş emri detay
│   │   └── forms/
│   │       ├── index.tsx          ← Form listesi
│   │       └── [id].tsx           ← Form doldurma
│   ├── (sales)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx              ← Satış ana sayfa (günlük özet)
│   │   ├── pos.tsx                ← POS (barkod tarama, sepet, ödeme)
│   │   ├── customers/
│   │   │   ├── index.tsx          ← Müşteri listesi + arama
│   │   │   └── [id].tsx           ← Müşteri detay
│   │   ├── orders/
│   │   │   ├── index.tsx          ← Sipariş listesi
│   │   │   └── [id].tsx           ← Sipariş detay
│   │   ├── quotes/
│   │   │   ├── index.tsx          ← Teklif listesi
│   │   │   ├── [id].tsx           ← Teklif detay
│   │   │   └── new.tsx            ← Yeni teklif oluştur
│   │   └── till.tsx               ← Kasa aç/kapat, gün sonu özeti
│   ├── (messages)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx              ← Mesaj listesi
│   │   └── [id].tsx               ← Sohbet
│   ├── notifications.tsx          ← Bildirimler
│   ├── qr-scanner.tsx             ← QR okuyucu
│   ├── operiq.tsx                 ← AI sohbet (Claude)
│   └── profile.tsx                ← Profil / ayarlar
└── +not-found.tsx
```

### Bottom Tab (5 tab)

| Tab | İkon | İçerik |
|-----|------|--------|
| Ana Sayfa | home | Dashboard, hızlı aksiyonlar, günlük özet |
| Görevler | clipboard-list | Görevler + iş emirleri + formlar (nested) |
| Satış | banknote | POS + müşteriler + siparişler + teklifler + kasa |
| Mesajlar | message-circle | Real-time sohbet, badge sayacı |
| Profil | user | Ayarlar, bildirimler, QR, OperIQ, çıkış |

### Toplam: 25 Route

| Alan | Sayfa | Adet |
|------|-------|------|
| Auth | login, force-password-change | 2 |
| Ana Sayfa | dashboard | 1 |
| Görevler | liste, detay, iş emirleri (liste+detay), formlar (liste+doldur) | 6 |
| Satış | ana, pos, müşteriler (liste+detay), siparişler (liste+detay), teklifler (liste+detay+yeni), kasa | 10 |
| Mesajlar | liste, sohbet | 2 |
| Diğer | bildirimler, qr-scanner, profil, operiq | 4 |

## 6. Barkod Tarama

Paylaşılan `<BarcodeScanner>` bileşeni — `expo-camera` ile native frame processing:

```
components/
└── BarcodeScanner.tsx    ← modal olarak açılır, callback: (barcode: string) => void
```

Kullanım yüzeyleri:

| Yüzey | Davranış |
|-------|----------|
| POS | Ürün tarama → sepete ekle |
| Sipariş oluşturma | Ürün tarama → kalem ekle |
| Teklif oluşturma | Ürün tarama → kalem ekle |
| Müşteri detay | Barkod tarama → hızlı sipariş başlat |
| Stok kontrol | Barkod tarama → stok bilgisi görüntüle |

Mevcut "dinamik barkod atama" özelliği korunur (sistemde olmayan barkod → ürüne bağla).

## 7. Platform↔Mobil↔Mobil Akışları

| Akış | Mekanizma |
|------|-----------|
| Platform → Mobil | Push notification + deep link → doğru sayfaya düş |
| Mobil → Platform | API + Socket.io → platform anında güncellenir |
| Mobil → Mobil | Socket.io room'ları — aynı görevdeki kullanıcılar real-time senkron |
| Offline → Sync | SQLite queue → bağlantı gelince otomatik push → server-wins çakışma çözümü |

### Deep Link Şeması

```
actledger://                    → Ana sayfa
actledger://tasks               → Görev listesi
actledger://tasks/123           → Görev detay
actledger://orders/456          → Sipariş detay
actledger://messages/789        → Sohbet
actledger://pos                 → POS
actledger://qr                  → QR tarayıcı
```

## 8. Tasarım Dili — Platform-Native UI

### Felsefe

Tek codebase, iki farklı his. iOS'ta iOS, Android'de Android hissiyatı.

### Platform Farklılaşma

| Öğe | iOS | Android |
|-----|-----|---------|
| Navigasyon | Large title → scroll'da küçülür, edge swipe | Material top bar, geri ok |
| Tab bar | Blur arka plan, ince çizgi | Material bottom nav, ink ripple |
| Liste | Grouped inset, chevron | Edge-to-edge, ripple feedback |
| Aksiyonlar | Action sheet (alttan) | Bottom sheet / dropdown |
| Alert | Native iOS alert | Material dialog |
| Tarih seçici | iOS spinning wheel | Material date picker |
| Toggle | iOS switch | Material switch |
| Tipografi | SF Pro (sistem) | Roboto (sistem) |
| Geçişler | Sağdan sola slide + parallax | Fade + slight slide up |

### Renk Sistemi

```
Marka (her iki platform):
  primary:    #3b82f6  (ActLedger mavi)
  secondary:  #6366f1  (mor vurgu)
  success:    #22c55e
  warning:    #f59e0b
  danger:     #ef4444

Yüzey (koyu tema — mevcut ActLedger):
  background: #0f172a
  surface:    #1e293b
  surfaceAlt: #334155
  border:     #475569
  text:       #f8fafc
  textMuted:  #94a3b8
```

Açık/koyu tema: `useColorScheme()` ile sistem ayarına otomatik uyum.

### Animasyon Standardı

Tüm animasyonlar Reanimated 3 (native thread, 60fps):

- Sayfa geçişi: 300ms ease-out
- Liste item giriş: 200ms stagger (50ms arayla)
- Buton press: iOS opacity 0.7 / Android ripple
- Modal: iOS slide-up / Android fade+scale
- Swipe aksiyon: Spring physics (damping: 15, stiffness: 150)

### Erişilebilirlik

- Tüm dokunulabilir öğeler: `accessibilityLabel` + `accessibilityRole`
- Minimum kontrast: 4.5:1 (WCAG AA)
- Dinamik font scaling (`allowFontScaling`)
- VoiceOver + TalkBack uyumu
- `prefers-reduced-motion` desteği
- Minimum dokunma hedefi: 44x44pt

## 9. API Katmanı

### Yapı

```
lib/
├── api.ts              ← Axios instance + interceptor
├── auth.ts             ← Login, token refresh, auto-login
├── socket.ts           ← Socket.io bağlantı yönetimi
├── offline/
│   ├── db.ts           ← expo-sqlite şema + CRUD
│   ├── queue.ts        ← Offline aksiyon kuyruğu
│   └── sync.ts         ← Otomatik push (bağlantı gelince)
└── hooks/
    ├── useApi.ts        ← GET (cache + loading + error)
    ├── useMutation.ts   ← POST/PATCH/DELETE (optimistic update)
    └── useSocket.ts     ← Socket.io event subscription
```

### Backend Bağlantı

- Production API: `https://api.actledger.com/api/v1`
- WebSocket: `wss://api.actledger.com`
- Mobil login: `POST /mobile-auth/login` (ACT-XXXXXX + şifre)
- Token: `Authorization: Bearer <accessToken>`
- Refresh: `POST /auth/refresh` (401 gelince otomatik)
- Token saklama: `expo-secure-store` (Keychain / Android Keystore)

### Socket.io Event'ler (mevcut, değişiklik yok)

- `task:updated` → görev listesi/detay güncelle
- `task:assigned` → push notification + liste güncelle
- `message:new` → mesaj listesi güncelle + badge artır
- `order:updated` → sipariş durumu güncelle
- `notification:new` → bildirim göster
- `sync:push` → offline kuyruk tetikle

## 10. Offline-First

### SQLite Şeması

```sql
-- Yerel cache
tasks, work_orders, forms, messages,
customers, orders, products
  → (id, data JSON, updated_at, synced)

-- Offline aksiyon kuyruğu
pending_actions
  → (id, endpoint, method, body, created_at, retry_count, status)
```

### Kurallar

- Online: API first, SQLite cache güncelle
- Offline: SQLite'dan oku, aksiyonları kuyruğa at
- Reconnect: Kuyruk FIFO sırayla gönderilir
- Çakışma: Server-wins (backend timestamp)
- Başarısız: 3 retry sonrası `failed` — kullanıcıya bildir
- İlk açılış: Incremental sync (son 7 gün), sonra delta

## 11. Push Notification

Expo Push Service üzerinden:

```
Backend event → Expo Push Service → APNs (iOS) / FCM (Android) → Cihaz
  → OS notification göster
  → Tap → deep link (actledger://tasks/123)
  → Doğru sayfaya düş
```

Backend değişikliği yok — mevcut FCM/APNs token endpoint'ine Expo Push Token kaydedilir.

## 12. Güvenlik

| Katman | Önlem |
|--------|-------|
| Token saklama | `expo-secure-store` (Keychain / Android Keystore) |
| SSL Pinning | `expo-certificate-transparency` |
| Biometric | Opsiyonel FaceID / TouchID / parmak izi ile uygulama kilidi |
| Auto-lock | 5dk inaktivite → login ekranına dön |
| Ekran görüntüsü | Hassas ekranlarda FLAG_SECURE (Android) + blur (iOS) |
| Root/Jailbreak | Tespit + uyarı |
| Network | HTTPS only, cleartext kapalı |
| Veri | SQLite WAL mode, app sandbox, OS şifreleme |

## 13. Performans Hedefleri

| Metrik | Hedef | Nasıl |
|--------|-------|-------|
| Cold start | < 2s | Minimal bundle + Hermes bytecode |
| Liste scroll | 60fps | FlashList + recycler |
| Sayfa geçişi | < 300ms | Native stack + Reanimated |
| API yanıt hissiyatı | < 200ms | Optimistic UI + cache-first |
| Barkod tarama | < 500ms | expo-camera native processing |
| Bundle size | < 15MB APK | Tree shaking + Hermes |
| RAM | < 150MB | Lazy loading + image cache |

## 14. Mağaza Deploy

### EAS Build

```
eas build --platform all          ← Expo bulutunda build
  ├── iOS .ipa → TestFlight → App Store
  └── Android .aab → Internal test → Play Store
```

### App ID (aynı kalır)

```
com.ataolaitech.actledger
```

Mevcut signing sertifikaları ve keystore yeniden kullanılır. Kullanıcılar mağazada "güncelleme" olarak alır.

### OTA Güncellemeler

```
eas update --branch production
```

JS/asset değişiklikleri mağaza onayı beklemeden dakikalar içinde tüm kullanıcılara ulaşır.

### Versiyon

Capacitor app: v1.4.0 → React Native app: v2.0.0

### CI/CD

```yaml
push/PR:  TypeScript check → ESLint → Jest testler
tag v2.x: eas build --production → eas submit
```

## 15. Test Stratejisi

| Seviye | Araç | Kapsam |
|--------|------|--------|
| Unit | Jest + RNTL | Hook'lar, util, API client |
| Component | RNTL | Her ekran render + interaction |
| Integration | Detox | Uçtan uca akışlar |
| Platform | Gerçek cihaz | iPhone SE, iPhone 15, Galaxy A14, Pixel 8 |
