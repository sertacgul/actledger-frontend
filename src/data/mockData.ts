import type {
  User, Department, Task, FieldReport,
  ProductionData, GeminiInsight, Notification
} from '../types'

export const DEPARTMENTS: Department[] = [
  { id: 'd1', name: 'Üretim', code: 'URE', managerId: 'u3', color: '#3b82f6', employeeCount: 42, activeTaskCount: 18, completionRate: 76 },
  { id: 'd2', name: 'Kalite Kontrol', code: 'KAL', managerId: 'u5', color: '#22c55e', employeeCount: 14, activeTaskCount: 9, completionRate: 88 },
  { id: 'd3', name: 'Bakım & Onarım', code: 'BAK', managerId: 'u7', color: '#f59e0b', employeeCount: 18, activeTaskCount: 12, completionRate: 61 },
  { id: 'd4', name: 'Lojistik', code: 'LOJ', managerId: 'u9', color: '#8b5cf6', employeeCount: 22, activeTaskCount: 7, completionRate: 92 },
  { id: 'd5', name: 'Planlama', code: 'PLA', managerId: 'u11', color: '#ec4899', employeeCount: 8, activeTaskCount: 5, completionRate: 95 },
  { id: 'd6', name: 'Satın Alma', code: 'SAT', managerId: 'u13', color: '#14b8a6', employeeCount: 10, activeTaskCount: 4, completionRate: 83 },
  { id: 'd7', name: 'İnsan Kaynakları', code: 'IK', managerId: 'u15', color: '#f97316', employeeCount: 6, activeTaskCount: 3, completionRate: 90 },
  { id: 'd8', name: 'Bilgi İşlem', code: 'BIL', managerId: 'u17', color: '#6366f1', employeeCount: 9, activeTaskCount: 6, completionRate: 78 },
]

export const USERS: User[] = [
  { id: 'u1', name: 'Ahmet Yılmaz', email: 'ahmet.yilmaz@ornek.com.tr', role: 'genel_mudur', departmentId: 'd1', active: true, createdAt: '2023-01-15' },
  { id: 'u2', name: 'Mehmet Kara', email: 'mehmet.kara@ornek.com.tr', role: 'gm_yardimcisi', departmentId: 'd1', active: true, createdAt: '2023-02-01' },
  { id: 'u3', name: 'Fatma Demir', email: 'fatma.demir@ornek.com.tr', role: 'mudur', departmentId: 'd1', active: true, createdAt: '2023-01-20', phone: '+90 532 111 22 33' },
  { id: 'u4', name: 'Ali Çelik', email: 'ali.celik@ornek.com.tr', role: 'supervizor', departmentId: 'd1', active: true, createdAt: '2023-03-10' },
  { id: 'u5', name: 'Zeynep Arslan', email: 'zeynep.arslan@ornek.com.tr', role: 'mudur', departmentId: 'd2', active: true, createdAt: '2023-01-20' },
  { id: 'u6', name: 'Mustafa Şahin', email: 'mustafa.sahin@ornek.com.tr', role: 'muhendis', departmentId: 'd1', active: true, createdAt: '2023-04-01' },
  { id: 'u7', name: 'Hasan Koç', email: 'hasan.koc@ornek.com.tr', role: 'mudur', departmentId: 'd3', active: true, createdAt: '2023-01-25' },
  { id: 'u8', name: 'Elif Yıldız', email: 'elif.yildiz@ornek.com.tr', role: 'teknisyen', departmentId: 'd3', active: true, createdAt: '2023-05-15' },
  { id: 'u9', name: 'İbrahim Aydın', email: 'ibrahim.aydin@ornek.com.tr', role: 'mudur', departmentId: 'd4', active: true, createdAt: '2023-02-10' },
  { id: 'u10', name: 'Ayşe Öztürk', email: 'ayse.ozturk@ornek.com.tr', role: 'supervizor', departmentId: 'd2', active: true, createdAt: '2023-06-01' },
  { id: 'u11', name: 'Serkan Polat', email: 'serkan.polat@ornek.com.tr', role: 'mudur', departmentId: 'd5', active: true, createdAt: '2023-01-30' },
  { id: 'u12', name: 'Deniz Güneş', email: 'deniz.gunes@ornek.com.tr', role: 'muhendis', departmentId: 'd1', active: true, createdAt: '2023-07-01' },
  { id: 'u13', name: 'Caner Bulut', email: 'caner.bulut@ornek.com.tr', role: 'mudur', departmentId: 'd6', active: true, createdAt: '2023-02-20' },
  { id: 'u14', name: 'Seda Kılıç', email: 'seda.kilic@ornek.com.tr', role: 'isci', departmentId: 'd1', active: true, createdAt: '2023-08-01' },
  { id: 'u15', name: 'Tuncay Erdoğan', email: 'tuncay.erdogan@ornek.com.tr', role: 'mudur', departmentId: 'd7', active: true, createdAt: '2023-03-01' },
  { id: 'u16', name: 'Gülşen Tan', email: 'gulsen.tan@ornek.com.tr', role: 'isci', departmentId: 'd1', active: false, createdAt: '2023-09-01' },
  { id: 'u17', name: 'Burak Doğan', email: 'burak.dogan@ornek.com.tr', role: 'mudur', departmentId: 'd8', active: true, createdAt: '2023-04-15' },
]

export const TASKS: Task[] = [
  {
    id: 't1',
    title: 'Hat 1 Günlük Üretim Hedefi',
    description: 'Üretim Hattı 1\'de günlük 100 birim üretim hedefinin gerçekleştirilmesi',
    departmentId: 'd1',
    assigneeId: 'u4',
    createdBy: 'u3',
    status: 'devam_ediyor',
    priority: 'yuksek',
    type: 'periyodik',
    checklist: [
      { id: 'c1', text: 'Hat açılış kontrolü yapıldı', completed: true, completedBy: 'u4', completedAt: '2026-04-06T07:30:00' },
      { id: 'c2', text: 'Malzeme hazırlığı tamamlandı', completed: true, completedBy: 'u4', completedAt: '2026-04-06T08:00:00' },
      { id: 'c3', text: 'Makine 1 çalışır durumda', completed: true, completedBy: 'u6', completedAt: '2026-04-06T08:15:00' },
      { id: 'c4', text: 'Makine 3 bakım kontrolü yapıldı', completed: false, note: 'Makine 3 arızalı, bakım ekibi çağrıldı' },
      { id: 'c5', text: 'Günlük üretim raporu hazırlandı', completed: false },
    ],
    dueDate: '2026-04-06T17:00:00',
    createdAt: '2026-04-06T06:00:00',
    updatedAt: '2026-04-06T10:30:00',
    tags: ['üretim', 'hat-1', 'günlük'],
  },
  {
    id: 't2',
    title: 'Kalite Kontrol - Parti 2026-A45',
    description: 'Üretilen parti için tam kalite kontrol muayenesi',
    departmentId: 'd2',
    assigneeId: 'u10',
    createdBy: 'u5',
    status: 'tamamlandi',
    priority: 'kritik',
    type: 'ozel',
    checklist: [
      { id: 'c6', text: 'Görsel muayene tamamlandı', completed: true, completedBy: 'u10' },
      { id: 'c7', text: 'Boyutsal kontrol yapıldı', completed: true, completedBy: 'u10' },
      { id: 'c8', text: 'Fonksiyonel test gerçekleştirildi', completed: true, completedBy: 'u10' },
      { id: 'c9', text: 'Kalite raporu hazırlandı', completed: true, completedBy: 'u10' },
    ],
    dueDate: '2026-04-05T16:00:00',
    createdAt: '2026-04-05T08:00:00',
    updatedAt: '2026-04-05T15:45:00',
    tags: ['kalite', 'muayene', 'kritik'],
  },
  {
    id: 't3',
    title: 'Makine 3 Arıza Giderimi',
    description: 'Üretim Hattı 1\'deki Makine 3\'ün arızasının tespiti ve giderilmesi',
    departmentId: 'd3',
    assigneeId: 'u8',
    createdBy: 'u7',
    status: 'devam_ediyor',
    priority: 'kritik',
    type: 'acil',
    checklist: [
      { id: 'c10', text: 'Arıza tespiti yapıldı', completed: true, completedBy: 'u8', completedAt: '2026-04-06T09:00:00' },
      { id: 'c11', text: 'Yedek parça temin edildi', completed: false },
      { id: 'c12', text: 'Onarım işlemi gerçekleştirildi', completed: false },
      { id: 'c13', text: 'Test çalışması yapıldı', completed: false },
      { id: 'c14', text: 'Bakım kayıtları güncellendi', completed: false },
    ],
    dueDate: '2026-04-06T14:00:00',
    createdAt: '2026-04-06T09:15:00',
    updatedAt: '2026-04-06T11:00:00',
    tags: ['bakım', 'acil', 'makine-3'],
  },
  {
    id: 't4',
    title: 'Aylık Güvenlik Denetimi',
    description: 'Tüm üretim alanlarının aylık güvenlik denetiminin gerçekleştirilmesi',
    departmentId: 'd1',
    assigneeId: 'u6',
    createdBy: 'u3',
    status: 'beklemede',
    priority: 'yuksek',
    type: 'periyodik',
    checklist: [
      { id: 'c15', text: 'Yangın söndürücüler kontrol edildi', completed: false },
      { id: 'c16', text: 'Acil çıkış yolları incelendi', completed: false },
      { id: 'c17', text: 'Elektrik panoları kontrol edildi', completed: false },
      { id: 'c18', text: 'KKD stokları sayıldı', completed: false },
      { id: 'c19', text: 'Güvenlik raporu hazırlandı', completed: false },
    ],
    dueDate: '2026-04-10T17:00:00',
    createdAt: '2026-04-01T08:00:00',
    updatedAt: '2026-04-01T08:00:00',
    tags: ['güvenlik', 'aylık', 'denetim'],
  },
  {
    id: 't5',
    title: 'Ham Madde Envanter Sayımı',
    description: 'Depodaki ham madde stoklarının sayımı ve kayıt güncellenmesi',
    departmentId: 'd4',
    assigneeId: 'u9',
    createdBy: 'u9',
    status: 'gecikti',
    priority: 'normal',
    type: 'periyodik',
    checklist: [
      { id: 'c20', text: 'A deposu sayıldı', completed: true, completedBy: 'u9' },
      { id: 'c21', text: 'B deposu sayıldı', completed: false },
      { id: 'c22', text: 'C deposu sayıldı', completed: false },
      { id: 'c23', text: 'Sistem kayıtları güncellendi', completed: false },
    ],
    dueDate: '2026-04-04T17:00:00',
    createdAt: '2026-04-01T08:00:00',
    updatedAt: '2026-04-05T09:00:00',
    tags: ['envanter', 'depo', 'lojistik'],
  },
  {
    id: 't6',
    title: 'Hat 2 Kapasite Artışı Analizi',
    description: 'Üretim Hattı 2\'nin kapasite artışına yönelik fizibilite analizi',
    departmentId: 'd5',
    assigneeId: 'u11',
    createdBy: 'u2',
    status: 'devam_ediyor',
    priority: 'yuksek',
    type: 'ozel',
    checklist: [
      { id: 'c24', text: 'Mevcut kapasite analizi', completed: true, completedBy: 'u11' },
      { id: 'c25', text: 'Makine ihtiyaç listesi hazırlandı', completed: true, completedBy: 'u11' },
      { id: 'c26', text: 'Maliyet tahmini yapıldı', completed: false },
      { id: 'c27', text: 'Fizibilite raporu hazırlandı', completed: false },
    ],
    dueDate: '2026-04-15T17:00:00',
    createdAt: '2026-03-25T08:00:00',
    updatedAt: '2026-04-06T09:30:00',
    tags: ['kapasite', 'analiz', 'yatırım'],
  },
]

export const REPORTS: FieldReport[] = [
  {
    id: 'r1',
    taskId: 't1',
    reporterId: 'u4',
    departmentId: 'd1',
    title: 'Hat 1 Günlük Durum Raporu - 06.04.2026',
    content: 'Üretim Hattı 1\'de bugün 100 birim hedeflenmiş ancak Makine 3\'ün arızası nedeniyle şu an itibarıyla yalnızca 70 birim üretilebilmiştir. Makine 3\'ün tahrik motoru arızalanmış olup bakım ekibi müdahale etmektedir. Hedefin gerçekleştirilmesi için mesai uzatması planlanmaktadır.',
    status: 'gonderildi',
    completedItems: 3,
    totalItems: 5,
    issues: [
      'Makine 3 tahrik motoru arızası - üretim %30 düştü',
      'Yedek parça stoğunda ilgili motor bulunmuyor, dışarıdan temin gerekiyor',
    ],
    photos: [
      { id: 'p1', url: 'https://placehold.co/400x300?text=Makine+3+Arıza', caption: 'Makine 3 arıza görüntüsü' },
    ],
    createdAt: '2026-04-06T10:45:00',
    syncedAt: '2026-04-06T10:46:00',
    offlineCreated: false,
  },
  {
    id: 'r2',
    taskId: 't3',
    reporterId: 'u8',
    departmentId: 'd3',
    title: 'Makine 3 Arıza Tespit Raporu',
    content: 'Makine 3\'te tahrik motoru arızası tespit edilmiştir. Motor sargılarında yanma izi gözlemlenmiş, motor tamamen değiştirilmesi gerekmektedir. Satın alma departmanına yedek parça talebi iletilmiştir. Tahmini onarım süresi: 4-6 saat (parça temin edilmesi halinde).',
    status: 'onaylandi',
    completedItems: 1,
    totalItems: 5,
    issues: [
      'Motor sargıları tamamen yanmış, tamir mümkün değil',
      'Stokta uygun yedek parça yok',
    ],
    photos: [
      { id: 'p2', url: 'https://placehold.co/400x300?text=Motor+Arıza', caption: 'Yanmış motor sargıları' },
      { id: 'p3', url: 'https://placehold.co/400x300?text=Arıza+Detay', caption: 'Arıza detay görüntüsü' },
    ],
    createdAt: '2026-04-06T09:30:00',
    syncedAt: '2026-04-06T09:31:00',
    offlineCreated: false,
  },
  {
    id: 'r3',
    taskId: 't2',
    reporterId: 'u10',
    departmentId: 'd2',
    title: 'Parti 2026-A45 Kalite Kontrol Raporu',
    content: 'Parti 2026-A45 için kalite kontrol muayenesi başarıyla tamamlanmıştır. 500 birimlik partiден 498 birim kalite standartlarını karşılamıştır. 2 birim boyutsal sapma nedeniyle reddedilmiştir (%99.6 kabul oranı).',
    status: 'onaylandi',
    completedItems: 4,
    totalItems: 4,
    issues: [],
    photos: [],
    createdAt: '2026-04-05T15:30:00',
    syncedAt: '2026-04-05T15:31:00',
    offlineCreated: false,
  },
  {
    id: 'r4',
    taskId: 't5',
    reporterId: 'u9',
    departmentId: 'd4',
    title: 'Ham Madde Sayım Ara Raporu',
    content: 'A deposu sayımı tamamlanmıştır. Sistem kaydıyla %2.3 sapma tespit edilmiştir. B ve C deposu sayımı devam etmektedir. Gecikme nedeni: B deposunda yeniden istifleme çalışmasının devam etmesi.',
    status: 'gonderildi',
    completedItems: 1,
    totalItems: 4,
    issues: [
      'A deposunda %2.3 stok sapması tespit edildi',
      'B deposu istifleme nedeniyle erişilemiyor',
    ],
    photos: [
      { id: 'p4', url: 'https://placehold.co/400x300?text=Depo+A', caption: 'A deposu sayım görüntüsü' },
    ],
    createdAt: '2026-04-05T14:00:00',
    offlineCreated: true,
  },
]

// Static fallback (kept for compatibility) - prefer generateProductionData(from, to)
export const PRODUCTION_DATA: ProductionData[] = [
  { date: '31 Mar', hedef: 100, gerceklesen: 98, departmentId: 'd1' },
  { date: '1 Nis', hedef: 100, gerceklesen: 102, departmentId: 'd1' },
  { date: '2 Nis', hedef: 100, gerceklesen: 97, departmentId: 'd1' },
  { date: '3 Nis', hedef: 100, gerceklesen: 105, departmentId: 'd1' },
  { date: '4 Nis', hedef: 100, gerceklesen: 99, departmentId: 'd1' },
  { date: '5 Nis', hedef: 100, gerceklesen: 94, departmentId: 'd1' },
  { date: '6 Nis', hedef: 100, gerceklesen: 70, departmentId: 'd1' },
]

const TR_MONTHS_SHORT = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara']

// Deterministic pseudo-random so the same date range always produces the same numbers
function seedRandom(seed: number) {
  return () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
}

/**
 * Generate production target/actual data points for a given date range.
 * Each day in the range gets one entry. Up to 60 days are returned (downsampled).
 */
export function generateProductionData(fromIso?: string, toIso?: string): ProductionData[] {
  const to   = toIso   ? new Date(toIso)   : new Date()
  const from = fromIso ? new Date(fromIso) : new Date(to.getTime() - 7 * 86400000)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return PRODUCTION_DATA

  const daysSpan  = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000))
  const stepDays  = daysSpan > 60 ? Math.ceil(daysSpan / 60) : 1
  const rand      = seedRandom(from.getTime() % 100000 + daysSpan)

  const out: ProductionData[] = []
  for (let i = 0; i <= daysSpan; i += stepDays) {
    const d = new Date(from.getTime() + i * 86400000)
    if (d.getTime() > to.getTime()) break
    const variation = (rand() - 0.5) * 30
    const target    = 100
    const actual    = Math.max(50, Math.min(120, Math.round(target + variation)))
    out.push({
      date:         `${d.getDate()} ${TR_MONTHS_SHORT[d.getMonth()]}`,
      hedef:        target,
      gerceklesen:  actual,
      departmentId: 'd1',
    })
  }
  return out.length > 0 ? out : PRODUCTION_DATA
}

export const GEMINI_INSIGHTS: GeminiInsight[] = [
  {
    id: 'g1',
    title: 'Kritik: Üretim Hattı 1 Kapasitesi Tehlikede',
    content: 'Makine 3 arızası nedeniyle Üretim Hattı 1\'in günlük kapasitesi %30 düşerek 70 birime gerilemiştir. Mevcut hızla devam edilirse bu haftaki toplam hedefin yaklaşık %22\'si eksik kalacaktır. **Önerilen Aksiyon:** Hat 2\'deki mevcut kapasiteyi geçici olarak Hat 1 ürünlerine yönlendirin ve acil yedek parça temin sürecini hızlandırın.',
    type: 'risk',
    departmentId: 'd1',
    createdAt: '2026-04-06T11:00:00',
    priority: 'yuksek',
  },
  {
    id: 'g2',
    title: 'Bakım Periyodikliği Analizi',
    content: 'Son 90 günde Makine 3 üç farklı arıza kaydı oluşturmuştur. Bu sıklık, planlı bakım aralıklarının yeniden değerlendirilmesi gerektiğine işaret etmektedir. Reaktif bakım maliyeti, proaktif bakım maliyetinin yaklaşık 3.2 katıdır. **Önerilen Aksiyon:** Makine 3 için aylık yerine 2 haftada bir bakım programı oluşturun.',
    type: 'oneri',
    departmentId: 'd3',
    createdAt: '2026-04-06T10:00:00',
    priority: 'yuksek',
  },
  {
    id: 'g3',
    title: 'Kalite Kontrol Performansı Mükemmel',
    content: 'Kalite Kontrol Departmanı son 30 günde %99.4 ortalama kabul oranı ile sektör ortalamasının (%97.8) üzerinde bir performans sergilemektedir. Bu başarı, son 3 ayda uygulanan yeni kontrol prosedürü revizyonuyla doğrudan ilişkilendirilmektedir.',
    type: 'bilgi',
    departmentId: 'd2',
    createdAt: '2026-04-06T09:00:00',
    priority: 'dusuk',
  },
  {
    id: 'g4',
    title: 'Depo Stok Sapması İzlenmeli',
    content: 'A deposunda tespit edilen %2.3 stok sapması, geçen ayki %0.8 sapmanın yaklaşık 3 katıdır. Bu artış trendi devam ederse aylık kayıp maliyetinin önemli seviyelere ulaşabileceği tahmin edilmektedir. **Önerilen Aksiyon:** Depo giriş-çıkış prosedürlerini gözden geçirin ve barkod okuyucu kullanımını zorunlu hale getirin.',
    type: 'uyari',
    departmentId: 'd4',
    createdAt: '2026-04-06T08:30:00',
    priority: 'orta',
  },
]

export const NOTIFICATIONS: Notification[] = [
  { id: 'n1', title: 'Kritik Görev Gecikmesi', message: 'Makine 3 Arıza Giderimi görevi son teslim tarihine 3 saat kaldı', type: 'gorev', read: false, createdAt: '2026-04-06T11:00:00' },
  { id: 'n2', title: 'Yeni Rapor', message: 'Ali Çelik yeni bir saha raporu gönderdi', type: 'rapor', read: false, createdAt: '2026-04-06T10:46:00' },
  { id: 'n3', title: 'OperIQ Analizi Hazır', message: 'Üretim verileri için yeni yapay zeka analizi oluşturuldu', type: 'yapay_zeka', read: false, createdAt: '2026-04-06T10:00:00' },
  { id: 'n4', title: 'Görev Tamamlandı', message: 'Kalite Kontrol - Parti 2026-A45 görevi tamamlandı', type: 'gorev', read: true, createdAt: '2026-04-05T15:45:00' },
  { id: 'n5', title: 'Sistem Güncellemesi', message: 'ActLedger v0.9.1 başarıyla güncellendi', type: 'sistem', read: true, createdAt: '2026-04-05T08:00:00' },
]

export const DEMO_USERS = [
  { id: 'u1', name: 'Ahmet Yılmaz', role: 'genel_mudur' as const, label: 'Genel Müdür' },
  { id: 'u3', name: 'Fatma Demir', role: 'mudur' as const, label: 'Üretim Müdürü' },
  { id: 'u4', name: 'Ali Çelik', role: 'supervizor' as const, label: 'Süpervizör' },
  { id: 'u6', name: 'Mustafa Şahin', role: 'muhendis' as const, label: 'Mühendis' },
]
