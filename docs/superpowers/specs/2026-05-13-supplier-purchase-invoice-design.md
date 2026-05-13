# Tedarikci Yonetimi + Alis Faturasi Tasarimi

## Ozet

Mevcut Customer entity'sini tedarikci destegi ile genisletme (Cari Hesap), gelen fatura (alis faturasi) yonetimi ve opsiyonel stok girisi entegrasyonu.

---

## 1. Cari Hesap (Customer Genisletme)

### Veri Modeli Degisikligi
Mevcut `CustomerType` enum'una yeni degerler eklenir:
- Mevcut: `PERAKENDE`, `TOPTAN`, `KURUMSAL`
- Yeni: `TEDARIKCI`, `HER_IKISI`

### Frontend
- Satis > "Musteriler" tab'i -> "Cari Hesaplar" olarak yeniden adlandirilir
- Tip filtresi guncellenir: Tumu / Musteri (Perakende+Toptan+Kurumsal) / Tedarikci / Her Ikisi
- Ayni form kullanilir (isim, vergi no, telefon, adres, kredi limiti)
- Tedarikci secildiginde `balance` negatif olabilir (borclu oldugunuz tutar)

## 2. Alis Faturasi (Gelen Fatura)

### Backend
- Mevcut `EInvoice` tablosu kullanilir, `direction: GELEN` ile
- Mevcut `POST /accounting/einvoice` endpoint'i zaten `direction` field'i destekliyor
- Gelen fatura olusturulunca otomatik yevmiye fisi olusur:
  - Borc: Gider hesabi (veya stok hesabi, stoklara ekleniyorsa)
  - Alacak: Tedarikci cari hesabi (borc kaydedilir)

### Frontend
- Muhasebe > E-Fatura tab'inda "Giden" / "Gelen" filtre butonlari eklenir
- "Yeni Gelen Fatura" butonu - tedarikci secer (customerType TEDARIKCI veya HER_IKISI olanlar), kalemler girer
- Gelen fatura listesi ayri gorunur (direction filtresi ile)
- Fatura detayinda "Gonderen" ve "Alici" rolleri ters gosterilir

## 3. Stok Entegrasyonu (Opsiyonel)

### Gelen fatura formunda:
- "Stoklara Ekle" checkbox'i (varsayilan: isaretsiz)
- Isaretlendiginde: her fatura kalemi icin stok urunu esleme alani gorunur (stockItemId select)
- Fatura onaylandiginda:
  - Her eslenmis kalem icin `StockMovement` (type: GIRIS) olusturulur
  - StockItem.quantity artar
  - Stok min seviye kontrolu yapilmaz (giris oldugu icin)

### Backend
- Yeni fonksiyon: `increaseStockForInvoice(invoiceId, companyId, userId)`
- Gelen fatura onay endpoint'inde (`POST /accounting/einvoice/:id/approve`) bu fonksiyon cagirilir
- Sadece `direction: GELEN` ve kalemlerinde `stockItemId` olan faturalar icin calisir

## 4. Dosya Yapisi

### Backend (actledger-backend)
- Modify: `prisma/schema.prisma` - CustomerType enum'una TEDARIKCI, HER_IKISI eklenir
- Create: `prisma/migrations/20260513_supplier_type/migration.sql`
- Modify: `src/modules/accounting/einvoice.service.ts` - gelen fatura onayinda stok girisi
- Create: `src/modules/accounting/einvoice-stock.service.ts` - increaseStockForInvoice fonksiyonu

### Frontend (actledger-frontend)
- Modify: `src/types/erp.ts` - CustomerType'a TEDARIKCI, HER_IKISI eklenir
- Modify: `src/components/sales/CustomersTab.tsx` - "Cari Hesaplar" olarak guncelleme, tip filtresi
- Modify: `src/components/accounting/EInvoiceTab.tsx` - Giden/Gelen filtresi, gelen fatura olusturma
- Modify: `src/lib/erp-hooks.ts` - gelen fatura hook'lari, tedarikci filtresi
