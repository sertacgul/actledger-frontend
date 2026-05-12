# ERP Modul Erisim Kontrolu, Excel Export & GIB Beyanname Tasarimi

## Ozet

ActLedger ERP modullerine (Satis, Muhasebe, HR) kullanici bazli yetkilendirme, platform genelinde Excel export ve GIB beyanname export ozellikleri eklenmesi.

---

## 1. Modul Erisim Kontrolu

### Problem
Mevcut sistemde ERP modulleri firma lisansina gore sidebar'da gorunuyor (hasModule). Ancak firma icindeki tum kullanicilar modulleri gorebiliyor - bu yanlis. Sadece yetkili kullanicilar gormelidir.

### Cozum
Kullanici bazli modul yetkilendirme sistemi. Her kullaniciya hangi ERP modullerine erisebilecegi tek tek atanir.

### Veri Modeli

Backend'de yeni tablo:

```
UserModuleAccess {
  id          String
  userId      String
  companyId   String
  moduleCode  String   // "SALES" | "ACCOUNTING" | "HR"
  grantedById String   // Yetkiyi veren kisi
  grantedAt   DateTime
}
```

- Unique constraint: (userId, companyId, moduleCode)
- Super Admin ve Key Account Manager (firma admin yetkisi olan kullanici) yetki verebilir
- Bir kullaniciya birden fazla modul atanabilir

### API Endpoint'leri

```
GET    /companies/:id/module-access          -> Firma icin tum modul yetkileri
GET    /companies/:id/module-access/:module   -> Belirli modul icin yetkili kullanicilar
POST   /companies/:id/module-access          -> Yetki ata { userId, moduleCode }
DELETE /companies/:id/module-access/:id       -> Yetki kaldir
```

Key Account Manager icin (firma icinden):
```
GET    /module-access/my-company              -> Kendi firmasinin modul yetkileri
POST   /module-access/my-company              -> Yetki ata
DELETE /module-access/my-company/:id           -> Yetki kaldir
```

### /auth/me Response Degisikligi

Mevcut: `modules: ["SALES", "ACCOUNTING", "HR"]` - firma bazinda
Yeni: `moduleAccess: ["SALES", "HR"]` - kullanici bazinda (sadece o kullanicinin eristigi moduller)

`modules` array'i firma lisansini gostermeye devam eder (Super Admin icin).
`moduleAccess` array'i kullanicinin kisisel erisimini gosterir.

### Frontend Degisiklikleri

- `AuthContext.hasModule()` -> `moduleAccess` array'ini kontrol eder (modules yerine)
- Sidebar filtreleme ayni kalir, sadece veri kaynagi degisir
- Route'larda ekstra guard gerekmez (sidebar'da gorunmuyorsa zaten gidemez)

### Yetki Yonetim UI'lari

**Super Admin Paneli (`/super-admin`):**
- Mevcut firma detay sayfasinda "Modul Yetkileri" bolumu
- Firma kullanicilari listelenir, her birinin yaninda SALES/ACCOUNTING/HR checkbox'lari
- Toplu atama: "Tum Satis departmanina SALES ver" butonu (kolaylik)

**Ayarlar Sayfasi (`/ayarlar`):**
- Key Account Manager rolu icin gorunur yeni tab: "ERP Modul Yetkileri"
- Ayni UI: kullanici listesi + modul checkbox'lari
- Sadece kendi firmasinin kullanicilarini gorur

---

## 2. Mevcut Kullanicilarin ERP Modullerde Gozukmesi

### Problem
HR, Satis ve Muhasebe modullerinde firma kullanicilari otomatik gelmeli.

### Cozum
- EmployeesTab: Firma kullanicilari `/users` endpoint'inden cekilir, yeni calisan eklerken kullanici select'inde gosterilir (zaten mevcut)
- CustomersTab: Musteriler ayri entity - firma kullanicilariyla karistirilmaz (dogru davranis)
- OrdersTab: Siparis olusturulurken "Satis Temsilcisi" alani icin firma kullanicilari listelenir
- JournalTab/EInvoiceTab: Olusturan kisi otomatik set edilir (backend yapar)

Frontend'de ek degisiklik:
- EmployeesTab'daki kullanici fetch'i duzeltilir (useState yerine useEffect + api.get pattern'i)
- OrdersTab'a salesRep secimi icin kullanici listesi eklenir

---

## 3. Excel Export

### 3.1 Sayfa Bazli Export

Her ERP sayfa component'ine export butonu eklenir. Mevcut `exportToExcel()` utility'si kullanilir.

**Eklenecek export butonlari:**
- CustomersTab: Tum musteriler
- OrdersTab: Tum siparisler + kalemleri
- POSTab: (export yok - anlik islem)
- AccountsTab: Hesap plani
- JournalTab: Yevmiye fissleri
- EInvoiceTab: E-faturalar
- ReportsTab: Aktif raporun verileri
- EmployeesTab: Calisan listesi
- LeavesTab: Izin talepleri
- PayrollTab: Bordro kayitlari

Her tab'a toolbar'a `FileSpreadsheet` icon'lu "Excel" butonu eklenir.

### 3.2 Toplu Export (Global)

Header component'ine "Toplu Export" butonu eklenir.

**Gorunurluk:** Key Account Manager (firma admini) ve ustu roller

**Sheet'ler:**
| Sheet Adi | Veri Kaynagi | Endpoint |
|-----------|-------------|----------|
| Departmanlar | Departman listesi | /departments |
| Kullanicilar | Firma kullanicilari | /users |
| Gorevler | Tum gorevler | /tasks |
| Envanter | Envanter kalemleri | /inventory |
| Stok Durumu | Stok kalemleri | /stock |
| Stok Hareketleri | Son hareketler | /stock/movements |
| Stok Alarmlari | Aktif alarmlar | /stock/alerts |
| Is Siparisleri | Work order'lar | /work-orders |
| Musteriler | Satis musterileri | /sales/customers |
| Siparisler | Satis siparisleri | /sales/orders |
| Hesap Plani | Muhasebe hesaplari | /accounting/accounts |
| Yevmiye | Yevmiye fisleri | /accounting/journal |
| E-Faturalar | E-fatura listesi | /accounting/einvoice |
| Calisanlar | HR calisanlar | /hr/employees |
| Izinler | Izin talepleri | /hr/leaves |
| Bordro | Bordro kayitlari | /hr/payroll/periods |

**Teknik:**
- Tum endpoint'lere paralel istek atilir (Promise.all)
- Her response ayri sheet olarak yazilir
- Mevcut `exportToExcel()` fonksiyonu multi-sheet destekleyecek sekilde genisletilir
- Dosya adi: `ActLedger_TumVeriler_YYYY-MM-DD.xlsx`
- Loading indicator gosterilir (buyuk veri seti olabilir)

---

## 4. GIB Beyanname & E-Fatura Export

### 4.1 Beyanname Export

Muhasebe modulunde ReportsTab'a "Beyanname Export" bolumu eklenir.

**Export Tipleri:**

**KDV Beyannamesi (Aylik):**
- Donem secimi (yil + ay)
- Hesaplanan KDV (tahsil edilen - odenen)
- GIB KDV-1 beyanname formatinda XML ciktisi
- Alternatif: Excel formatinda ozet (GIB portalina manuel giris icin)

**Muhtasar Beyanname (Aylik):**
- Bordro verilerinden otomatik hesaplama
- Gelir vergisi + damga vergisi + SGK
- Excel formatinda ozet

**E-Defter (Aylik):**
- Yevmiye fisleri XBRL formatinda
- Kebir defteri XBRL formatinda
- GIB e-defter sartnamelerine uygun

**Cikti Formatlari:**
- XML: GIB portalina yuklenebilir format
- Excel: Manuel giris icin kolay referans
- PDF: Arsiv ve inceleme icin

### 4.2 Entegrator Hazirlik

Mevcut backend'deki e-fatura altyapisi (EInvoiceConfig, test mode) korunur. Ek olarak:

**Frontend'de:**
- EInvoiceTab'daki config modal'i genisletilir
- API Key, API Secret alanlari eklenir (mevcut)
- "Baglanti Test Et" butonu (mevcut /config/test endpoint'i)
- Entegrator durumu gostergesi (bagli/bagli degil)

**Entegrator aktif oldugunda:**
- E-fatura "Gonder" butonu gercekten entegratora gonderir
- Gelen faturalar (inbox) otomatik cekilir
- Fatura durumu (teslim edildi/reddedildi) otomatik guncellenir

**Simdilik (entegrator anlasmasi olmadan):**
- Test modunda calisir
- Beyanname export'lari tam calisir (entegrator gerektirmez)
- E-fatura XML olusturma calisir (UBL-TR formati)
- Gonderme devre disi (config'de test mode uyarisi)

### 4.3 Muhasebe ReportsTab Genisletme

Mevcut 6 rapor tipine ek olarak:
- `declaration` tipi eklenir: KDV Beyannamesi, Muhtasar, E-Defter
- Her biri icin donem secici + export butonlari (XML, Excel, PDF)

---

## 5. Dosya Yapisi Degisiklikleri

### Backend (actledger-backend)
```
src/modules/
  module-access/
    module-access.router.ts    -> API endpoint'leri
    module-access.service.ts   -> Yetki CRUD islemleri
  auth/
    auth.service.ts            -> /auth/me'ye moduleAccess eklenir
  accounting/
    reports.service.ts         -> Beyanname hesaplama fonksiyonlari
    declaration.service.ts     -> XML/XBRL export fonksiyonlari (yeni)
```

### Frontend (actledger-frontend)
```
src/
  lib/
    erp-hooks.ts               -> moduleAccess hook'lari eklenir
    excelExport.ts             -> Multi-sheet export destegi
  context/
    AuthContext.tsx             -> moduleAccess kullanimi
  components/
    layout/
      Header.tsx               -> Toplu export butonu
    settings/
      ModuleAccessTab.tsx      -> Key Account Manager yetki yonetimi (yeni)
    accounting/
      ReportsTab.tsx           -> Beyanname export bolumu
      DeclarationExport.tsx    -> KDV/Muhtasar/E-Defter export UI (yeni)
    sales/
      CustomersTab.tsx         -> Excel export butonu
      OrdersTab.tsx            -> Excel export butonu + salesRep
    hr/
      EmployeesTab.tsx         -> Excel export butonu
      LeavesTab.tsx            -> Excel export butonu
      PayrollTab.tsx           -> Excel export butonu
  pages/
    SuperAdmin.tsx             -> Modul yetki yonetimi bolumu
    Settings.tsx               -> ModuleAccessTab eklenir
```

---

## 6. Uygulama Sirasi

1. **Faz 1:** Backend - UserModuleAccess tablosu + API + /auth/me degisikligi
2. **Faz 2:** Frontend - Erisim kontrolu (AuthContext + Sidebar + Yetki UI'lari)
3. **Faz 3:** Frontend - Excel export (sayfa bazli + toplu)
4. **Faz 4:** Backend + Frontend - Beyanname export (KDV, Muhtasar, E-Defter)
5. **Faz 5:** Entegrator baglantisi (Foriba/Parabus anlasmasi sonrasi)
