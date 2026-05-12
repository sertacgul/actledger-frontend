# KAM Veri Export Sistemi (Onay Mekanizmali) Tasarimi

## Ozet

Key Account Manager'in firma verilerini tarih araligina gore, departman bazinda, detayli kayitlar halinde Excel export edebilmesi. Genel Mudur onayina tabi, departman mudurlerine bilgilendirme bildirimi gider.

---

## 1. Export Talep Akisi

1. KAM, Ayarlar > "Veri Export" tab'inda tarih araligi secer + departman filtresi (opsiyonel)
2. "Export Talep Et" butonuna basar
3. Backend'de `DataExportRequest` kaydi olusur (status: BEKLIYOR)
4. Genel Mudur'e push + platform bildirimi gider
5. Ilgili departman mudurlerine bilgilendirme bildirimi gider (onay degil, sadece bilgi)
6. Genel Mudur platformdan onaylar veya reddeder
7. Onay sonrasi backend export dosyasini olusturur (multi-sheet Excel, tarih filtreli)
8. KAM'a bildirim gider, dosyayi indirir (sureli link - 24 saat)

## 2. Veri Modeli

```prisma
model DataExportRequest {
  id              String   @id @default(cuid())
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
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  company         Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  requestedBy     User     @relation("exportRequester", fields: [requestedById], references: [id])
  approvedBy      User?    @relation("exportApprover", fields: [approvedById], references: [id])

  @@index([companyId])
  @@index([requestedById])
}

enum DataExportStatus {
  BEKLIYOR
  ONAYLANDI
  REDDEDILDI
  HAZIRLANIYOR
  TAMAMLANDI
  SURESI_DOLDU
}
```

## 3. API Endpoint'leri

### KAM Endpoint'leri
```
POST   /data-export/request              -> Export talebi olustur { dateFrom, dateTo, departmentId? }
GET    /data-export/my-requests           -> Kendi taleplerini listele
GET    /data-export/:id/download          -> Onaylanmis export dosyasini indir
```

### Genel Mudur Endpoint'leri
```
GET    /data-export/pending               -> Onay bekleyen talepler
POST   /data-export/:id/approve           -> Talebi onayla
POST   /data-export/:id/reject            -> Talebi reddet { reason? }
```

## 4. Export Icerik (Multi-Sheet Excel)

Secilen tarih araligina gore filtrelenmis detayli kayitlar. Her modul ayri sheet:

| Sheet | Veri | Tarih Filtre Alani |
|-------|------|-------------------|
| Departmanlar | Departman listesi | createdAt |
| Kullanicilar | Firma kullanicilari | createdAt |
| Gorevler | Tum gorevler | createdAt |
| Envanter | Envanter kalemleri | createdAt |
| Stok Durum | Stok kalemleri | updatedAt |
| Stok Hareketleri | Tum hareketler | createdAt |
| Is Siparisleri | Work order'lar | createdAt |
| Musteriler | Satis musterileri | createdAt |
| Siparisler | Satis siparisleri | createdAt |
| Hesap Plani | Muhasebe hesaplari | createdAt |
| Yevmiye | Yevmiye fisleri | date |
| E-Faturalar | E-fatura listesi | issueDate |
| Calisanlar | HR calisanlar | createdAt |
| Izinler | Izin talepleri | createdAt |
| Bordro | Bordro kayitlari | createdAt |

Departman filtresi secilmisse: departmentId'si olan tablolar filtrelenir, departmansiz tablolar (hesap plani, bordro vb.) tam gelir.

## 5. Guvenlik

- Export dosyasi sureli: 24 saat sonra fileUrl null yapilir, dosya silinir
- Genel Mudur (GENEL_MUDUR rolu) onaylamadan dosya olusturulmaz
- Departman mudurlerine bilgilendirme bildirimi gider (veri hirsizligina karsi farkindalik)
- Her export talebi audit log'a yazilir
- KAM sadece kendi firmasinin verilerini export edebilir (companyId kontrolu)

## 6. Bildirimler

### Export talep edildiginde:
- **Genel Mudur'e**: "KAM [isim] veri export talebi olusturdu. Tarih: [from]-[to]. Onayiniz bekleniyor."
- **Departman Mudurlerine**: "KAM [isim] veri export talebi olusturdu. Bilginize."

### Export onayla/reddet:
- **KAM'a**: "Veri export talebiniz onaylandi/reddedildi."

### Export hazir:
- **KAM'a**: "Export dosyaniz hazir. 24 saat icinde indirin."

## 7. Frontend UI

### Ayarlar > Veri Export Tab'i (KAM + Super Admin)
- Tarih araligi secici (dateFrom - dateTo)
- Departman filtresi (opsiyonel - tum departmanlar veya belirli biri)
- "Export Talep Et" butonu
- Gecmis talepler tablosu: tarih, durum badge, departman, indirme butonu

### Genel Mudur Onay UI
- Platform bildirimlerinden tiklanir
- Veya Ayarlar > Veri Export tab'inda "Onay Bekleyenler" bolumu
- Talep detayi + Onayla/Reddet butonlari
- Red durumunda neden yazma alani

## 8. Dosya Yapisi

### Backend (actledger-backend)
- Create: `src/modules/data-export/data-export.service.ts` - talep CRUD + Excel olusturma
- Create: `src/modules/data-export/data-export.router.ts` - API endpoint'leri
- Modify: `prisma/schema.prisma` - DataExportRequest model
- Migration: DataExportRequest tablosu

### Frontend (actledger-frontend)
- Create: `src/components/settings/DataExportTab.tsx` - talep olusturma + gecmis + onay
- Modify: `src/pages/Settings.tsx` - tab ekleme
