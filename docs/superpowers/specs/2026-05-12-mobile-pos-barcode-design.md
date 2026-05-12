# Mobil POS & Barkod Entegrasyonu Tasarimi

## Ozet

Mobil PWA'ya POS satis sayfasi eklenmesi. Barkod tarama (kamera + harici okuyucu) ile urun bulma, sepet yonetimi, odeme alma ve otomatik stok dusme.

---

## 1. Mobil POS Sayfasi (`/m/satis`)

- Mobil PWA'da yeni "Satis" tab'i (MobileLayout alt tab bar'ina eklenir)
- Ilk giris: sube + kasa secimi yapilir, cihaza kaydedilir (localStorage)
- Sonraki girislerde kaydedilmis sube/kasa otomatik kullanilir, degistirmek icin ayar ikonu
- Ana ekran: ust kisimda barkod tarama butonu + urun arama input, alt kisimda sepet + toplam + odeme

## 2. Barkod Tarama (Cift Mod)

### Kamera Modu
- Mevcut QR scanner altyapisi genisletilir
- EAN-13, Code128, QR kod destegi (html5-qrcode library bunu zaten destekliyor)
- Tarama butonu -> kamera acilir -> barkod okunur -> kamera kapanir

### Harici Okuyucu Modu
- Sayfada gorunmez bir text input'a auto-focus
- Harici USB/Bluetooth barkod okuyucu cihaz okutulan barkodu bu input'a yazar
- 300ms debounce ile otomatik urun arama tetiklenir
- Enter tusuna basinca (okuyucular genelde Enter gonderir) arama yapilir

### Barkod Esleme Akisi
1. Barkod taranir
2. `GET /stock-management?barcode=XXX` ile stok item aranir
3. **Esleme varsa**: Urun bilgileri gosterilir, sepete eklenir (`stockItemId` ile)
4. **Esleme yoksa**: Urun arama ekrani acilir, kullanici stoktan manuel secer
5. Secilen urune barkod otomatik kaydedilir (`PATCH /stock-management/:id { barcode }`)
6. Sonraki taramalarda ayni barkod otomatik eslesir

## 3. Satis Akisi

1. Barkod tara veya manuel urun ara
2. Sepete ekle (miktar artir/azalt, kaldir)
3. Musteri sec (opsiyonel - varsayilan walk-in musteri)
4. Odeme yontemi sec (Nakit / Kredi Karti / Havale)
5. "Satis Yap" butonuna bas
6. Backend `POST /sales/pos/checkout` cagirilir
7. Backend otomatik olarak:
   - SalesOrder olusturur (status: TAMAMLANDI)
   - Payment kaydeder
   - `decreaseStockForOrder()` ile stok dusurur
   - StockMovement (type: SATIS) olusturur
   - Stok min seviye altindaysa bildirim gonderir
8. Fis ekrani gosterilir (siparis no, kalemler, toplam, odeme)

## 4. Sube/Kasa Yonetimi

- Ilk giriste sube ve kasa secim ekrani gosterilir
- Secim `localStorage`'a kaydedilir: `actledger_pos_branchId`, `actledger_pos_tillId`
- Kaydedilmis kasa acik degilse (KAPALI) uyari gosterilir
- Sag ustte ayar ikonu ile sube/kasa degistirilebilir

## 5. Backend Degisiklikleri

### Stok arama endpoint guncelleme
Mevcut `GET /stock-management` endpoint'ine `barcode` filter eklenir:
- `?barcode=XXX` -> tam esleme ile stok item dondurur
- Mevcut `search` parametresi zaten isim/kod ile arama yapiyor

### Barkod kaydetme
Mevcut `PATCH /stock-management/:id` endpoint'i `barcode` alanini zaten guncelleyebilir (StockItem modelinde `barcode` field'i var).

Yeni endpoint gerekmez.

## 6. Dosya Yapisi

### Frontend
- Create: `src/pages/mobile/MobilePOS.tsx` - Tam mobil POS sayfasi
- Modify: `src/components/layout/MobileLayout.tsx` - Alt tab bar'a Satis ikonu ekleme
- Modify: `src/App.tsx` - `/m/satis` route ekleme
- Modify: `src/lib/erp-hooks.ts` - `useStockByBarcode()` hook ekleme

### Backend
- Modify: `src/modules/stock-management/stock-management.service.ts` - barcode filter ekleme
