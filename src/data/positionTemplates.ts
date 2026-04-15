// Default position (kadro) and title (gorev) templates per sector
// Admin can customize these; stored in localStorage after modification

export interface PositionTemplate {
  positions: string[]   // Kadro options
  titles: string[]      // Gorev/Unvan options
}

// Common positions and titles shared across all sectors
const COMMON_POSITIONS = [
  'Genel Mudur', 'Genel Mudur Yardimcisi', 'Direktor', 'Mudur',
  'Mudur Yardimcisi', 'Sef', 'Uzman', 'Analist', 'Koordinator',
  'Asistan', 'Stajyer',
]

const COMMON_TITLES = [
  'Genel Mudur', 'Operasyon Direktoru', 'Teknik Direktor',
  'Finans Direktoru', 'Insan Kaynaklari Muduru', 'IT Muduru',
  'Kalite Muduru', 'Satin Alma Muduru', 'Lojistik Muduru',
]

// Sector-specific positions and titles
const SECTOR_TEMPLATES: Record<string, PositionTemplate> = {
  manufacturing: {
    positions: [
      ...COMMON_POSITIONS,
      'Uretim Muduru', 'Fabrika Muduru', 'Bakim Muduru', 'Kalite Kontrol Muduru',
      'Planlama Muduru', 'Uretim Sefi', 'Vardiya Amiri', 'Bakim Sefi',
      'Kalite Kontrol Sefi', 'Uretim Muhendisi', 'Proses Muhendisi',
      'Bakim Teknisyeni', 'Kalite Teknisyeni', 'Makine Operatoru',
      'CNC Operatoru', 'Kaynak Teknisyeni', 'Elektrik Teknisyeni',
      'Otomasyon Muhendisi', 'Endustriyel Muhendis', 'Is Guvenligi Uzmani',
      'Depo Sorumlusu', 'Sevkiyat Sorumlusu', 'Laborant',
    ],
    titles: [
      ...COMMON_TITLES,
      'Uretim Muduru', 'Fabrika Muduru', 'Bakim ve Onarim Muduru',
      'Kalite Guvence Muduru', 'Uretim Planlama Muduru', 'Tedarik Zinciri Muduru',
      'Ar-Ge Muduru', 'Muhendislik Muduru', 'ISG Muduru',
      'Depo ve Lojistik Muduru', 'Satin Alma Uzmani', 'Proses Muhendisi',
    ],
  },
  healthcare: {
    positions: [
      ...COMMON_POSITIONS,
      'Bashekim', 'Bashekim Yardimcisi', 'Hastane Muduru',
      'Klinik Sef', 'Servis Sorumlusu', 'Hemsirelik Hizmetleri Muduru',
      'Bash Hemsire', 'Sorumlu Hemsire', 'Hemsire', 'Ebe',
      'Uzman Doktor', 'Pratisyen Hekim', 'Asistan Doktor', 'Stajyer Doktor',
      'Eczaci', 'Klinik Eczaci', 'Biyokimyager', 'Mikrobiyolog',
      'Radyoloji Teknisyeni', 'Laborant', 'Anestezi Teknisyeni',
      'Ameliyathane Hemiresi', 'Yogun Bakim Hemiresi',
      'Fizyoterapist', 'Diyetisyen', 'Psikolog', 'Sosyal Hizmet Uzmani',
      'Tibbi Sekreter', 'Hasta Kabul Memuru', 'Biyomedikal Muhendis',
      'Saglik Fizikci', 'Enfeksiyon Kontrol Hemiresi', 'Acil Tip Teknisyeni',
      'Paramedik', 'Ambulans Soforu', 'Evde Bakim Hemiresi',
    ],
    titles: [
      ...COMMON_TITLES,
      'Bashekim', 'Hastane Muduru', 'Tibbi Direktor',
      'Hemsirelik Hizmetleri Muduru', 'Klinik Sef',
      'Acil Servis Sorumlusu', 'Ameliyathane Sorumlusu',
      'Yogun Bakim Sorumlusu', 'Poliklinik Sorumlusu',
      'Laboratuvar Muduru', 'Eczane Muduru', 'Radyoloji Muduru',
      'Enfeksiyon Kontrol Komitesi Baskani', 'Kalite Muduru',
      'Hasta Deneyimi Muduru', 'Tibbi Sekreterlik Muduru',
      'Biyomedikal Muhendislik Sefi', 'Bilgi Islem Muduru',
    ],
  },
  fmcg: {
    positions: [
      ...COMMON_POSITIONS,
      'Satis Muduru', 'Bolge Satis Muduru', 'Key Account Manager',
      'Saha Satis Temsilcisi', 'Merchandiser', 'Ticari Pazarlama Muduru',
      'Marka Muduru', 'Kategori Yoneticisi', 'Demand Planner',
      'Tedarik Zinciri Muduru', 'Depo Muduru', 'Dagitim Muduru',
      'Uretim Muduru', 'Kalite Kontrol Muduru', 'Ar-Ge Muduru',
      'Saha Operasyon Sefi', 'Rut Planlama Uzmani', 'Trade Marketing Uzmani',
    ],
    titles: [
      ...COMMON_TITLES,
      'Satis Direktoru', 'Pazarlama Direktoru', 'Tedarik Zinciri Direktoru',
      'Bolge Satis Muduru', 'Key Account Manager', 'Marka Muduru',
      'Ticari Pazarlama Muduru', 'Kategori Muduru', 'Dagitim Muduru',
    ],
  },
  horeca: {
    positions: [
      ...COMMON_POSITIONS,
      'Otel Genel Muduru', 'Kat Hizmetleri Muduru', 'On Buro Muduru',
      'Yiyecek Icecek Muduru', 'Mutfak Sefi', 'Sous Chef', 'Chef de Partie',
      'Garson', 'Barmen', 'Resepsiyonist', 'Concierge', 'Bellboy',
      'Housekeeping Supervisor', 'Oda Gorevlisi', 'Banket Muduru',
      'Rezervasyon Muduru', 'Satis ve Pazarlama Muduru', 'Gelir Yonetimi Muduru',
      'Guvenlik Sefi', 'Teknik Servis Sefi', 'Steward', 'Pastaci',
    ],
    titles: [
      ...COMMON_TITLES,
      'Otel Genel Muduru', 'Yiyecek Icecek Direktoru', 'Mutfak Sefi',
      'Kat Hizmetleri Muduru', 'On Buro Muduru', 'Banket Muduru',
      'Gelir Yonetimi Muduru', 'Rezervasyon Muduru',
    ],
  },
  energy: {
    positions: [
      ...COMMON_POSITIONS,
      'Santral Muduru', 'Tesis Muduru', 'Sebeke Operasyon Muduru',
      'Iletim Muhendisi', 'Dagitim Muhendisi', 'Enerji Ticaret Uzmani',
      'SCADA Operatoru', 'Vardiya Muhendisi', 'Saha Teknisyeni',
      'Trafo Bakim Teknisyeni', 'Hat Bakim Ekibi Sefi', 'Sayac Okuma Teknisyeni',
      'Enerji Verimliligi Uzmani', 'Cevre Muhendisi', 'Regulasyon Uzmani',
    ],
    titles: [
      ...COMMON_TITLES,
      'Santral Muduru', 'Sebeke Operasyon Muduru', 'Enerji Ticaret Muduru',
      'Iletim Muduru', 'Dagitim Muduru', 'Bakim Muduru',
    ],
  },
  retail: {
    positions: [
      ...COMMON_POSITIONS,
      'Magaza Muduru', 'Magaza Mudur Yardimcisi', 'Bolge Muduru',
      'Kasacilar', 'Raf Duzenleyici', 'Reyon Sorumlusu', 'Depocu',
      'Guvenlik Gorevlisi', 'Gorsel Duzenleyici', 'Satis Danismani',
      'Musteri Hizmetleri Temsilcisi', 'E-Ticaret Uzmani',
      'Kategori Yoneticisi', 'Satin Alma Uzmani', 'Fiyatlandirma Uzmani',
    ],
    titles: [
      ...COMMON_TITLES,
      'Magaza Muduru', 'Bolge Muduru', 'Satis Muduru',
      'Kategori Muduru', 'E-Ticaret Muduru', 'Pazarlama Muduru',
    ],
  },
  logistics: {
    positions: [
      ...COMMON_POSITIONS,
      'Filo Muduru', 'Operasyon Muduru', 'Depo Muduru', 'Dagitim Muduru',
      'Rota Planlama Uzmani', 'Dispatch Sorumlusu', 'Surucu', 'Kurye',
      'Forklift Operatoru', 'Terminal Sefi', 'Gumruk Muavini',
      'Cross-dock Sorumlusu', 'Saha Ekip Lideri', 'Bakim Teknisyeni',
      'Yakit Yonetim Uzmani', 'Tasima Planlama Uzmani',
    ],
    titles: [
      ...COMMON_TITLES,
      'Filo Muduru', 'Dagitim Muduru', 'Depo Muduru',
      'Operasyon Muduru', 'Terminal Muduru', 'Rota Planlama Muduru',
    ],
  },
  construction: {
    positions: [
      ...COMMON_POSITIONS,
      'Santiye Sefi', 'Proje Muduru', 'Saha Muhendisi', 'Insaat Muhendisi',
      'Mimar', 'Elektrik Muhendisi', 'Mekanik Muhendisi', 'Harita Muhendisi',
      'Kalite Kontrol Muhendisi', 'Is Guvenligi Uzmani', 'Santiye Sefi Yardimcisi',
      'Puantaj Memuru', 'Demir Ustasi', 'Kalipci', 'Beton Ustasi',
      'Vinc Operatoru', 'Ekskavatol Operatoru', 'Tesisatci',
      'BIM Koordinatoru', 'Metrajci', 'Hakedes Uzmani',
    ],
    titles: [
      ...COMMON_TITLES,
      'Proje Muduru', 'Santiye Sefi', 'Teknik Ofis Muduru',
      'Planlama Muduru', 'Maliyet Kontrol Muduru', 'Sozlesme Muduru',
    ],
  },
  municipality: {
    positions: [
      ...COMMON_POSITIONS,
      'Baskan', 'Baskan Yardimcisi', 'Genel Sekreter', 'Mudurluk Muduru',
      'Zabita Muduru', 'Zabita Komiseri', 'Zabita Memuru',
      'Imar Muduru', 'Cevre Muduru', 'Park Bahce Muduru',
      'Sosyal Hizmetler Muduru', 'Mali Hizmetler Muduru',
      'Yazi Isleri Muduru', 'Kultur Muduru', 'Bilgi Islem Muduru',
      'Veteriner', 'Itfaiye Eri', 'Temizlik Iscisi', 'Sofor',
    ],
    titles: [
      ...COMMON_TITLES,
      'Mudurluk Muduru', 'Sef', 'Memur', 'Zabita Komiseri',
    ],
  },
  finance: {
    positions: [
      ...COMMON_POSITIONS,
      'Sube Muduru', 'Sube Mudur Yardimcisi', 'Iliski Yoneticisi',
      'Portfoy Yoneticisi', 'Kredi Analist', 'Risk Analist',
      'Uyum Gorevlisi', 'AML Uzmani', 'Hazine Uzmani', 'Fon Yoneticisi',
      'Musteri Temsilcisi', 'Gise Memuru', 'Operasyon Uzmani',
      'Aktuer', 'Sigortaci', 'Yatirim Danismani', 'Tahsilat Uzmani',
    ],
    titles: [
      ...COMMON_TITLES,
      'Sube Muduru', 'Bolge Muduru', 'Kredi Muduru', 'Risk Muduru',
      'Hazine Muduru', 'Uyum Muduru', 'Operasyon Muduru',
    ],
  },
  commerce: {
    positions: [
      ...COMMON_POSITIONS,
      'Satis Muduru', 'E-Ticaret Muduru', 'Dijital Pazarlama Uzmani',
      'Sosyal Medya Uzmani', 'SEO Uzmani', 'Musteri Iliskileri Uzmani',
      'Siparis Yonetimi Uzmani', 'Depo Sorumlusu', 'Kargo Sorumlusu',
      'Bayi Yoneticisi', 'Kanal Yoneticisi', 'CRM Uzmani',
    ],
    titles: [
      ...COMMON_TITLES,
      'E-Ticaret Direktoru', 'Satis Direktoru', 'Pazarlama Direktoru',
      'Kanal Muduru', 'CRM Muduru', 'Dijital Pazarlama Muduru',
    ],
  },
  media: {
    positions: [
      ...COMMON_POSITIONS,
      'Yayin Yonetmeni', 'Haber Muduru', 'Yapimci', 'Yonetmen',
      'Muhabir', 'Kameraman', 'Kurgucu', 'Grafiker', 'Animator',
      'Ses Muhendisi', 'Isik Muhendisi', 'Stüdyo Sorumlusu',
      'Sosyal Medya Editoru', 'Web Editoru', 'Reklam Satis Muduru',
      'Medya Planlama Uzmani', 'Icerlik Uretici', 'Sunucu',
    ],
    titles: [
      ...COMMON_TITLES,
      'Yayin Yonetmeni', 'Haber Muduru', 'Yapim Muduru',
      'Reklam Satis Muduru', 'Dijital Medya Muduru',
    ],
  },
  transportation: {
    positions: [
      ...COMMON_POSITIONS,
      'Filo Muduru', 'Operasyon Muduru', 'Trafik Muduru',
      'Surucu', 'Makinist', 'Kaptan', 'Hostes', 'Yer Hizmetleri Personeli',
      'Bilet Satis Memuru', 'Terminal Muduru', 'Bakim Teknisyeni',
      'Saha Kontrol Gorevlisi', 'Guvenlik Gorevlisi',
    ],
    titles: [
      ...COMMON_TITLES,
      'Filo Muduru', 'Operasyon Muduru', 'Terminal Muduru',
      'Trafik Kontrol Muduru', 'Yolcu Hizmetleri Muduru',
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
