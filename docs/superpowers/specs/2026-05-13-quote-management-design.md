# Teklif Yonetimi Tasarimi

## Ozet

Satis modulune teklif olusturma, takip, PDF export ve siparise donusturme ozelligi.

---

## 1. Veri Modeli

```prisma
enum QuoteStatus {
  TASLAK
  GONDERILDI
  ONAYLANDI
  REDDEDILDI
  IPTAL
  SIPARISE_DONUSTU
}

model Quote {
  id           String      @id @default(cuid())
  companyId    String
  quoteNumber  String
  customerId   String
  status       QuoteStatus @default(TASLAK)
  validUntil   DateTime?
  subtotal     Decimal     @default(0) @db.Decimal(14, 2)
  taxAmount    Decimal     @default(0) @db.Decimal(14, 2)
  totalAmount  Decimal     @default(0) @db.Decimal(14, 2)
  currency     String      @default("TRY")
  notes        String?
  orderId      String?
  createdById  String
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  company      Company     @relation(fields: [companyId], references: [id], onDelete: Cascade)
  customer     Customer    @relation(fields: [customerId], references: [id])
  createdBy    User        @relation(fields: [createdById], references: [id])
  lines        QuoteLine[]

  @@index([companyId])
  @@index([customerId])
  @@index([status])
}

model QuoteLine {
  id              String  @id @default(cuid())
  quoteId         String
  lineNumber      Int
  productName     String
  unit            String  @default("adet")
  quantity        Int
  unitPrice       Decimal @db.Decimal(12, 2)
  discountPercent Decimal @default(0) @db.Decimal(5, 2)
  taxRate         Int     @default(20)
  taxAmount       Decimal @default(0) @db.Decimal(14, 2)
  lineTotal       Decimal @db.Decimal(14, 2)

  quote           Quote   @relation(fields: [quoteId], references: [id], onDelete: Cascade)

  @@index([quoteId])
}
```

## 2. API Endpoint'leri

```
GET    /sales/quotes              -> Teklif listesi (status, customerId, search filtresi)
GET    /sales/quotes/:id          -> Teklif detay (lines + customer include)
POST   /sales/quotes              -> Yeni teklif olustur
PATCH  /sales/quotes/:id          -> Teklif guncelle (TASLAK iken)
POST   /sales/quotes/:id/send     -> Durumu GONDERILDI yap
POST   /sales/quotes/:id/approve  -> Durumu ONAYLANDI yap
POST   /sales/quotes/:id/reject   -> Durumu REDDEDILDI yap
POST   /sales/quotes/:id/to-order -> Tekliften siparis olustur, durumu SIPARISE_DONUSTU yap
DELETE /sales/quotes/:id          -> Sil (TASLAK iken)
GET    /sales/quotes/:id/pdf      -> PDF dosyasi indir
```

## 3. Siparise Donusturme

`POST /sales/quotes/:id/to-order` endpoint'i:
- Teklifin status'unu SIPARISE_DONUSTU yapar
- Teklifin kalemlerini yeni SalesOrder'a kopyalar
- SalesOrder.notes'a "Teklif TEK-2026-0001'den olusturuldu" yazar
- Quote.orderId'yi olusturulan siparisle eslestirir
- Olusturulan siparisi dondurur

## 4. PDF Export

Backend'de basit HTML template -> PDF:
- Sirket adi + logo placeholder
- Musteri bilgileri (isim, vergi no, adres)
- Teklif numarasi + tarih + gecerlilik tarihi
- Kalemler tablosu (urun, miktar, birim fiyat, iskonto, KDV, toplam)
- Alt toplam + KDV + genel toplam
- Notlar

PDF olusturma icin `pdfkit` veya basit HTML string + response header (`Content-Type: application/pdf`) kullanilir.

## 5. Frontend

### Satis modulune "Teklifler" tab'i
- Teklif listesi tablosu: numara, musteri, durum badge, toplam tutar, gecerlilik, tarih
- Arama + status filtresi
- "Yeni Teklif" butonu

### Yeni Teklif Formu (DraggableModal)
- Musteri secimi (cari hesaplardan)
- Gecerlilik tarihi
- Kalemler: urun adi, birim, miktar, birim fiyat, iskonto %, KDV %
- Notlar
- Toplam hesaplama (canli)

### Teklif Detay Modal
- Durum badge + musteri bilgileri
- Kalemler tablosu
- Aksiyon butonlari: Gonder / Onayla / Reddet / Siparise Donustur / PDF Indir
- Durum akisi: TASLAK -> GONDERILDI -> ONAYLANDI -> SIPARISE_DONUSTU

## 6. Dosya Yapisi

### Backend
- Modify: `prisma/schema.prisma` - Quote + QuoteLine modelleri
- Create: `prisma/migrations/20260513_quote/migration.sql`
- Create: `src/modules/sales/quote.service.ts` - CRUD + to-order + PDF
- Create: `src/modules/sales/quote.schema.ts` - Zod validasyon
- Modify: `src/modules/sales/sales.router.ts` - quote endpoint'leri ekleme
- Modify: `src/modules/sales/sales.controller.ts` - quote controller fonksiyonlari

### Frontend
- Create: `src/components/sales/QuotesTab.tsx` - tam teklif yonetim UI
- Modify: `src/pages/Sales.tsx` - Teklifler tab'i ekleme
- Modify: `src/lib/erp-hooks.ts` - quote hook'lari
