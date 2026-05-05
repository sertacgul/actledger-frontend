// Default position (kadro) and title (gorev) templates per sector
// Admin can customize these; stored in localStorage after modification

export interface PositionTemplate {
  positions: string[]   // Kadro options
  titles: string[]      // Gorev/Unvan options
}

// Common positions and titles shared across all sectors
const COMMON_POSITIONS = [
  'Genel Müdür', 'Genel Müdür Yardımcısı', 'Direktör', 'Müdür',
  'Müdür Yardımcısı', 'Şef', 'Uzman', 'Analist', 'Koordinatör',
  'Asistan', 'Stajyer',
]

const COMMON_TITLES = [
  'Genel Müdür', 'Operasyon Direktörü', 'Teknik Direktor',
  'Finans Direktörü', 'İnsan Kaynakları Müdürü', 'IT Müdürü',
  'Kalite Müdürü', 'Satın Alma Müdürü', 'Lojistik Müdürü',
]

// Sector-specific positions and titles
const SECTOR_TEMPLATES: Record<string, PositionTemplate> = {
  manufacturing: {
    positions: [
      ...COMMON_POSITIONS,
      'Üretim Müdürü', 'Fabrika Müdürü', 'Bakım Müdürü', 'Kalite Kontrol Müdürü',
      'Planlama Müdürü', 'Üretim Şefi', 'Vardiya Amiri', 'Bakım Şefi',
      'Kalite Kontrol Şefi', 'Üretim Mühendisi', 'Proses Mühendisi',
      'Bakım Teknisyeni', 'Kalite Teknisyeni', 'Makine Operatörü',
      'CNC Operatörü', 'Kaynak Teknisyeni', 'Elektrik Teknisyeni',
      'Otomasyon Mühendisi', 'Endüstriyel Mühendis', 'İş Güvenliği Uzmanı',
      'Depo Sorumlusu', 'Sevkiyat Sorumlusu', 'Laborant',
    ],
    titles: [
      ...COMMON_TITLES,
      'Üretim Müdürü', 'Fabrika Müdürü', 'Bakım ve Onarım Müdürü',
      'Kalite Güvence Müdürü', 'Üretim Planlama Müdürü', 'Tedarik Zinciri Müdürü',
      'Ar-Ge Müdürü', 'Mühendislik Müdürü', 'İSG Müdürü',
      'Depo ve Lojistik Müdürü', 'Satın Alma Uzmanı', 'Proses Mühendisi',
    ],
  },
  healthcare: {
    positions: [
      ...COMMON_POSITIONS,
      'Başhekim', 'Başhekim Yardımcısı', 'Hastane Müdürü',
      'Klinik Sef', 'Servis Sorumlusu', 'Hemşirelik Hizmetleri Müdürü',
      'Bash Hemşire', 'Sorumlu Hemşire', 'Hemşire', 'Ebe',
      'Uzman Doktor', 'Pratisyen Hekim', 'Asistan Doktor', 'Stajyer Doktor',
      'Eczaci', 'Klinik Eczaci', 'Biyokimyager', 'Mikrobiyolog',
      'Radyoloji Teknisyeni', 'Laborant', 'Anestezi Teknisyeni',
      'Ameliyathane Hemşiresi', 'Yoğun Bakım Hemşiresi',
      'Fizyoterapist', 'Diyetisyen', 'Psikolog', 'Sosyal Hizmet Uzmanı',
      'Tibbi Sekreter', 'Hasta Kabul Memuru', 'Biyomedikal Mühendis',
      'Sağlık Fizikci', 'Enfeksiyon Kontrol Hemşiresi', 'Acil Tip Teknisyeni',
      'Paramedik', 'Ambulans Şoförü', 'Evde Bakım Hemşiresi',
    ],
    titles: [
      ...COMMON_TITLES,
      'Başhekim', 'Hastane Müdürü', 'Tibbi Direktor',
      'Hemşirelik Hizmetleri Müdürü', 'Klinik Sef',
      'Acil Servis Sorumlusu', 'Ameliyathane Sorumlusu',
      'Yoğun Bakım Sorumlusu', 'Poliklinik Sorumlusu',
      'Laboratuvar Müdürü', 'Eczane Müdürü', 'Radyoloji Müdürü',
      'Enfeksiyon Kontrol Komitesi Başkanı', 'Kalite Müdürü',
      'Hasta Deneyimi Müdürü', 'Tibbi Sekreterlik Müdürü',
      'Biyomedikal Mühendislik Şefi', 'Bilgi İşlem Müdürü',
    ],
  },
  fmcg: {
    positions: [
      ...COMMON_POSITIONS,
      'Satış Müdürü', 'Bölge Satış Müdürü', 'Key Account Manager',
      'Saha Satış Temsilcisi', 'Merchandiser', 'Ticari Pazarlama Müdürü',
      'Marka Müdürü', 'Kategori Yöneticisi', 'Demand Planner',
      'Tedarik Zinciri Müdürü', 'Depo Müdürü', 'Dağıtım Müdürü',
      'Üretim Müdürü', 'Kalite Kontrol Müdürü', 'Ar-Ge Müdürü',
      'Saha Operasyon Şefi', 'Rut Planlama Uzmanı', 'Trade Marketing Uzmanı',
    ],
    titles: [
      ...COMMON_TITLES,
      'Satış Direktörü', 'Pazarlama Direktörü', 'Tedarik Zinciri Direktörü',
      'Bölge Satış Müdürü', 'Key Account Manager', 'Marka Müdürü',
      'Ticari Pazarlama Müdürü', 'Kategori Müdürü', 'Dağıtım Müdürü',
    ],
  },
  horeca: {
    positions: [
      ...COMMON_POSITIONS,
      'Otel Genel Müdürü', 'Kat Hizmetleri Müdürü', 'Ön Büro Müdürü',
      'Yiyecek İçecek Müdürü', 'Mutfak Şefi', 'Sous Chef', 'Chef de Partie',
      'Garson', 'Barmen', 'Resepsiyonist', 'Concierge', 'Bellboy',
      'Housekeeping Supervisor', 'Oda Görevlisi', 'Banket Müdürü',
      'Rezervasyon Müdürü', 'Satış ve Pazarlama Müdürü', 'Gelir Yönetimi Müdürü',
      'Güvenlik Şefi', 'Teknik Servis Şefi', 'Steward', 'Pastacı',
    ],
    titles: [
      ...COMMON_TITLES,
      'Otel Genel Müdürü', 'Yiyecek İçecek Direktörü', 'Mutfak Şefi',
      'Kat Hizmetleri Müdürü', 'Ön Büro Müdürü', 'Banket Müdürü',
      'Gelir Yönetimi Müdürü', 'Rezervasyon Müdürü',
    ],
  },
  energy: {
    positions: [
      ...COMMON_POSITIONS,
      'Santral Müdürü', 'Tesis Müdürü', 'Şebeke Operasyon Müdürü',
      'İletim Mühendisi', 'Dağıtım Mühendisi', 'Enerji Ticaret Uzmanı',
      'SCADA Operatörü', 'Vardiya Mühendisi', 'Saha Teknisyeni',
      'Trafo Bakım Teknisyeni', 'Hat Bakım Ekibi Şefi', 'Sayac Okuma Teknisyeni',
      'Enerji Verimliliği Uzmanı', 'Çevre Mühendisi', 'Regulasyon Uzmanı',
    ],
    titles: [
      ...COMMON_TITLES,
      'Santral Müdürü', 'Şebeke Operasyon Müdürü', 'Enerji Ticaret Müdürü',
      'İletim Müdürü', 'Dağıtım Müdürü', 'Bakım Müdürü',
    ],
  },
  retail: {
    positions: [
      ...COMMON_POSITIONS,
      'Mağaza Müdürü', 'Mağaza Müdür Yardımcısı', 'Bölge Müdürü',
      'Kasacılar', 'Raf Düzenleyici', 'Reyon Sorumlusu', 'Depocu',
      'Güvenlik Görevlisi', 'Gorsel Düzenleyici', 'Satış Danışmanı',
      'Müşteri Hizmetleri Temsilcisi', 'E-Ticaret Uzmanı',
      'Kategori Yöneticisi', 'Satın Alma Uzmanı', 'Fiyatlandırma Uzmanı',
    ],
    titles: [
      ...COMMON_TITLES,
      'Mağaza Müdürü', 'Bölge Müdürü', 'Satış Müdürü',
      'Kategori Müdürü', 'E-Ticaret Müdürü', 'Pazarlama Müdürü',
    ],
  },
  logistics: {
    positions: [
      ...COMMON_POSITIONS,
      'Filo Müdürü', 'Operasyon Müdürü', 'Depo Müdürü', 'Dağıtım Müdürü',
      'Rota Planlama Uzmanı', 'Dispatch Sorumlusu', 'Sürücü', 'Kurye',
      'Forklift Operatörü', 'Terminal Şefi', 'Gümrük Müavini',
      'Cross-dock Sorumlusu', 'Saha Ekip Lideri', 'Bakım Teknisyeni',
      'Yakıt Yonetim Uzmanı', 'Taşıma Planlama Uzmanı',
    ],
    titles: [
      ...COMMON_TITLES,
      'Filo Müdürü', 'Dağıtım Müdürü', 'Depo Müdürü',
      'Operasyon Müdürü', 'Terminal Müdürü', 'Rota Planlama Müdürü',
    ],
  },
  construction: {
    positions: [
      ...COMMON_POSITIONS,
      'Şantiye Şefi', 'Proje Müdürü', 'Saha Mühendisi', 'İnşaat Mühendisi',
      'Mimar', 'Elektrik Mühendisi', 'Mekanik Mühendisi', 'Harita Mühendisi',
      'Kalite Kontrol Mühendisi', 'İş Güvenliği Uzmanı', 'Şantiye Şefi Yardımcısı',
      'Puantaj Memuru', 'Demir Ustası', 'Kalıpçı', 'Beton Ustası',
      'Vinç Operatörü', 'Ekskavatör Operatörü', 'Tesisatçı',
      'BIM Koordinatörü', 'Metrajcı', 'Hakediş Uzmanı',
    ],
    titles: [
      ...COMMON_TITLES,
      'Proje Müdürü', 'Şantiye Şefi', 'Teknik Ofis Müdürü',
      'Planlama Müdürü', 'Maliyet Kontrol Müdürü', 'Sözleşme Müdürü',
    ],
  },
  municipality: {
    positions: [
      ...COMMON_POSITIONS,
      'Başkan', 'Başkan Yardımcısı', 'Genel Sekreter', 'Müdürluk Müdürü',
      'Zabita Müdürü', 'Zabita Komiseri', 'Zabita Memuru',
      'İmar Müdürü', 'Çevre Müdürü', 'Park Bahce Müdürü',
      'Sosyal Hizmetler Müdürü', 'Mali Hizmetler Müdürü',
      'Yazi İşleri Müdürü', 'Kültür Müdürü', 'Bilgi İşlem Müdürü',
      'Veteriner', 'İtfaiye Eri', 'Temizlik İşçisi', 'Şoför',
    ],
    titles: [
      ...COMMON_TITLES,
      'Müdürluk Müdürü', 'Şef', 'Memur', 'Zabita Komiseri',
    ],
  },
  finance: {
    positions: [
      ...COMMON_POSITIONS,
      'Şube Müdürü', 'Şube Müdür Yardımcısı', 'İlişki Yöneticisi',
      'Portföy Yöneticisi', 'Kredi Analist', 'Risk Analist',
      'Uyum Görevlisi', 'AML Uzmanı', 'Hazine Uzmanı', 'Fon Yöneticisi',
      'Müşteri Temsilcisi', 'Gise Memuru', 'Operasyon Uzmanı',
      'Aktuer', 'Sigortacı', 'Yatırım Danışmanı', 'Tahsilat Uzmanı',
    ],
    titles: [
      ...COMMON_TITLES,
      'Şube Müdürü', 'Bölge Müdürü', 'Kredi Müdürü', 'Risk Müdürü',
      'Hazine Müdürü', 'Uyum Müdürü', 'Operasyon Müdürü',
    ],
  },
  commerce: {
    positions: [
      ...COMMON_POSITIONS,
      'Satış Müdürü', 'E-Ticaret Müdürü', 'Dijital Pazarlama Uzmanı',
      'Sosyal Medya Uzmanı', 'SEO Uzmanı', 'Müşteri İlişkileri Uzmanı',
      'Sipariş Yönetimi Uzmanı', 'Depo Sorumlusu', 'Kargo Sorumlusu',
      'Bayi Yöneticisi', 'Kanal Yöneticisi', 'CRM Uzmanı',
    ],
    titles: [
      ...COMMON_TITLES,
      'E-Ticaret Direktörü', 'Satış Direktörü', 'Pazarlama Direktörü',
      'Kanal Müdürü', 'CRM Müdürü', 'Dijital Pazarlama Müdürü',
    ],
  },
  media: {
    positions: [
      ...COMMON_POSITIONS,
      'Yayin Yönetmeni', 'Haber Müdürü', 'Yapımcı', 'Yönetmen',
      'Muhabir', 'Kameraman', 'Kurgucu', 'Grafiker', 'Animator',
      'Ses Mühendisi', 'Işık Mühendisi', 'Stüdyo Sorumlusu',
      'Sosyal Medya Editörü', 'Web Editörü', 'Reklam Satış Müdürü',
      'Medya Planlama Uzmanı', 'İçerik Üretici', 'Sunucu',
    ],
    titles: [
      ...COMMON_TITLES,
      'Yayin Yönetmeni', 'Haber Müdürü', 'Yapım Müdürü',
      'Reklam Satış Müdürü', 'Dijital Medya Müdürü',
    ],
  },
  transportation: {
    positions: [
      ...COMMON_POSITIONS,
      'Filo Müdürü', 'Operasyon Müdürü', 'Trafik Müdürü',
      'Sürücü', 'Makinist', 'Kaptan', 'Hostes', 'Yer Hizmetleri Personeli',
      'Bilet Satış Memuru', 'Terminal Müdürü', 'Bakım Teknisyeni',
      'Saha Kontrol Görevlisi', 'Güvenlik Görevlisi',
    ],
    titles: [
      ...COMMON_TITLES,
      'Filo Müdürü', 'Operasyon Müdürü', 'Terminal Müdürü',
      'Trafik Kontrol Müdürü', 'Yolcu Hizmetleri Müdürü',
    ],
  },
  it: {
    positions: [
      ...COMMON_POSITIONS,
      'CTO', 'VP of Engineering', 'Engineering Manager',
      'Senior Developer', 'Developer', 'Junior Developer',
      'DevOps Engineer', 'SRE Engineer', 'QA Engineer', 'Test Engineer',
      'Product Manager', 'Product Owner', 'Scrum Master', 'Agile Coach',
      'UI/UX Designer', 'UX Researcher', 'Data Engineer', 'Data Scientist',
      'ML Engineer', 'Security Engineer', 'Cloud Architect',
      'Solutions Architect', 'Technical Writer', 'Support Engineer',
      'System Administrator', 'Network Engineer', 'DBA',
    ],
    titles: [
      ...COMMON_TITLES,
      'CTO', 'VP of Engineering', 'Head of Product',
      'Engineering Manager', 'Tech Lead', 'Product Manager',
      'Design Lead', 'QA Lead', 'DevOps Lead', 'Data Lead',
    ],
  },
  startup: {
    positions: [
      ...COMMON_POSITIONS,
      'CEO', 'CTO', 'COO', 'CFO', 'CPO', 'CMO',
      'Co-founder', 'VP of Engineering', 'VP of Product', 'VP of Sales',
      'Head of Growth', 'Head of Design', 'Head of People',
      'Full-stack Developer', 'Frontend Developer', 'Backend Developer',
      'Growth Hacker', 'Content Creator', 'Community Manager',
      'Customer Success Manager', 'SDR', 'AE',
    ],
    titles: [
      ...COMMON_TITLES,
      'CEO', 'CTO', 'COO', 'CPO',
      'Head of Growth', 'Head of Product', 'Head of Engineering',
    ],
  },
}

// Fallback for sectors not explicitly defined
const DEFAULT_TEMPLATE: PositionTemplate = {
  positions: COMMON_POSITIONS,
  titles: COMMON_TITLES,
}

const STORAGE_KEY = 'actledger_position_templates'

export function getPositionTemplate(sectorId: string): PositionTemplate {
  // Check localStorage for admin customizations first
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const customs = JSON.parse(stored) as Record<string, PositionTemplate>
      if (customs[sectorId]) return customs[sectorId]
    }
  } catch { /* ignore */ }
  return SECTOR_TEMPLATES[sectorId] ?? DEFAULT_TEMPLATE
}

export function savePositionTemplate(sectorId: string, template: PositionTemplate): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const customs = stored ? JSON.parse(stored) as Record<string, PositionTemplate> : {}
    customs[sectorId] = template
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customs))
  } catch { /* ignore */ }
}
