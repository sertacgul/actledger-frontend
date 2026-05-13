# Dönem Karşılaştırma Widget'ı Tasarımı

## Özet

Dashboard'a iki tarih aralığını karşılaştıran kapsamlı widget. Tüm modüllerdeki verileri (satış, görev, stok, muhasebe, HR) iki dönem arasında karşılaştırır. Rol bazlı departman filtreleme ile yetki kontrolü.

---

## 1. Dashboard Widget

- Kokpit sayfasında yeni "Dönem Karşılaştırma" bölümü
- Üst kısım: İki tarih aralığı seçici (Dönem 1: başlangıç-bitiş, Dönem 2: başlangıç-bitiş)
- Departman filtresi: GM tüm departmanları görür, müdür kendi departmanını görür
- Hazır dönem kısayolları: "Bu ay vs geçen ay", "Bu yıl vs geçen yıl"

## 2. Özet Kartlar (üst kısım)

Her kart: Dönem 1 değeri, Dönem 2 değeri, değişim yüzdesi (yeşil artış / kırmızı azalış ok)

| Metrik Grubu | Metrikler |
|-------------|-----------|
| Satış | Toplam satış tutarı, sipariş sayısı |
| Görevler | Tamamlanan görev sayısı, tamamlanma oranı % |
| Stok | Toplam stok hareketi sayısı, stok değeri |
| Muhasebe | Toplam gelir, toplam gider, net kâr |
| HR | Çalışan sayısı, izin gün sayısı |
| Raporlar | Oluşturulan rapor sayısı |

## 3. Detay Grafik (alt kısım)

- Yan yana çubuk grafik: Dönem 1 (mavi) vs Dönem 2 (yeşil)
- Metrik grubu seçici: Satış / Görevler / Muhasebe / Stok / HR
- Departman bazında kırılım (GM için tüm departmanlar, müdür için kendi departmanı)

## 4. Backend API

```
GET /companies/me/compare
  ?dateFrom1=2025-01-01T00:00:00.000Z
  &dateTo1=2025-12-31T23:59:59.999Z
  &dateFrom2=2026-01-01T00:00:00.000Z
  &dateTo2=2026-12-31T23:59:59.999Z
  &departmentId=xxx (opsiyonel)
```

Response:
```json
{
  "period1": { "from": "...", "to": "..." },
  "period2": { "from": "...", "to": "..." },
  "sales": { "p1_total": 125000, "p2_total": 180000, "p1_count": 45, "p2_count": 62 },
  "tasks": { "p1_completed": 120, "p2_completed": 145, "p1_rate": 78, "p2_rate": 85 },
  "stock": { "p1_movements": 230, "p2_movements": 310, "p1_value": 50000, "p2_value": 65000 },
  "accounting": { "p1_income": 200000, "p2_income": 250000, "p1_expense": 150000, "p2_expense": 170000 },
  "hr": { "p1_employees": 28, "p2_employees": 32, "p1_leaves": 45, "p2_leaves": 38 },
  "reports": { "p1_count": 85, "p2_count": 110 }
}
```

## 5. Yetki Kontrolü

- Süpervizör ve üstü: karşılaştırma yapabilir
- Müdür: kendi departmanı (departmentId otomatik set)
- Direktör ve üstü: tüm departmanlar veya seçili departman
- GM / Platform Admin: firma geneli

## 6. Dosya Yapısı

### Backend
- Create: `src/modules/companies/compare.service.ts` - metrik hesaplama
- Modify: `src/modules/companies/companies.router.ts` - compare endpoint

### Frontend
- Create: `src/components/dashboard/CompareWidget.tsx` - karşılaştırma widget
- Modify: `src/pages/Dashboard.tsx` - widget ekleme
- Modify: `src/lib/hooks.ts` - useCompare hook
