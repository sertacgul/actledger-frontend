# Banka Hesabi Yonetimi Tasarimi

## Ozet

Muhasebe modulune banka hesabi tanimlama, hareket girisi, Excel import ve muhasebe eslestirme ozelligi.

---

## 1. Veri Modeli

```prisma
model BankAccount {
  id            String            @id @default(cuid())
  companyId     String
  name          String
  bankName      String
  accountNumber String?
  iban          String?
  currency      String            @default("TRY")
  balance       Decimal           @default(0) @db.Decimal(14, 2)
  accountCode   String?
  isActive      Boolean           @default(true)
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt

  company       Company           @relation(fields: [companyId], references: [id], onDelete: Cascade)
  transactions  BankTransaction[]

  @@index([companyId])
}

model BankTransaction {
  id              String       @id @default(cuid())
  bankAccountId   String
  companyId       String
  type            String       // GIRIS, CIKIS
  amount          Decimal      @db.Decimal(14, 2)
  date            DateTime
  description     String
  reference       String?
  category        String       @default("DIGER") // SATIS, ALIS, MAAS, VERGI, KIRA, DIGER
  customerId      String?
  reconciled      Boolean      @default(false)
  journalEntryId  String?
  createdAt       DateTime     @default(now())

  bankAccount     BankAccount  @relation(fields: [bankAccountId], references: [id], onDelete: Cascade)
  company         Company      @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@index([bankAccountId])
  @@index([companyId])
}
```

## 2. API Endpoint'leri

```
GET    /accounting/bank-accounts                      -> Hesap listesi
POST   /accounting/bank-accounts                      -> Yeni hesap
PATCH  /accounting/bank-accounts/:id                  -> Hesap guncelle
DELETE /accounting/bank-accounts/:id                  -> Hesap sil
GET    /accounting/bank-accounts/:id/transactions     -> Hesap hareketleri
POST   /accounting/bank-accounts/:id/transactions     -> Hareket ekle
POST   /accounting/bank-accounts/:id/transactions/import -> Excel import
POST   /accounting/bank-transactions/:id/reconcile    -> Muhasebe eslestir (yevmiye olustur)
```

## 3. Muhasebe Eslestirme

Hareket eslestirildiginde otomatik yevmiye fisi olusur:
- GIRIS: Borc banka hesabi, Alacak gelir/cari hesap
- CIKIS: Borc gider/cari hesap, Alacak banka hesabi
- `reconciled: true` ve `journalEntryId` set edilir

## 4. Frontend

### Muhasebe > Banka tab'i
- Ust kisim: banka hesaplari kartlari (isim, banka, bakiye, IBAN)
- "Yeni Hesap" butonu
- Hesap secildiginde: hareket listesi tablosu
- "Hareket Ekle" butonu: tutar, tarih, tip (GIRIS/CIKIS), aciklama, kategori, cari esleme
- Excel import butonu
- Her satirda "Esle" butonu (reconcile)

## 5. Dosya Yapisi

### Backend
- Modify: `prisma/schema.prisma` - BankAccount + BankTransaction
- Create: `prisma/migrations/20260513_bank_accounts/migration.sql`
- Create: `src/modules/accounting/bank.service.ts`
- Create: `src/modules/accounting/bank.schema.ts`
- Modify: `src/modules/accounting/accounting.router.ts` - bank endpoint'leri

### Frontend
- Create: `src/components/accounting/BankTab.tsx`
- Modify: `src/pages/Accounting.tsx` - Banka tab'i
- Modify: `src/lib/erp-hooks.ts` - bank hook'lari
