import { useState } from 'react'
import { BookOpen, ChevronDown, ChevronRight, Monitor, Smartphone, Layers, BarChart3, ClipboardList, FileText, Map, MessageSquare, Settings, Users, Package, Cpu, Zap, FolderOpen, Shield, Building2, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'

interface Section {
  icon: typeof Monitor
  title: string
  path?: string
  items: { q: string; a: string }[]
}

const PLATFORM_GUIDE_TR: Section[] = [
  {
    icon: Monitor, title: 'Kokpit & Dashboard', path: '/panel',
    items: [
      { q: 'Dashboard nasil kullanilir?', a: 'Sol menuden "Kokpit" a tiklayarak ana dashboard ekranina ulasin. Suruklenebilir widgetlar ile kendi gorunumunuzu olusturabilirsiniz. Sag ustteki "+" butonu ile yeni dashboard ekleyebilir, widgetlari surukleyerek siralayabilirsiniz.' },
      { q: 'Yeni dashboard nasil eklenir?', a: 'Dashboard basliginin yanindaki dropdown\'dan "Yeni Dashboard" secin. Ad verin, widgetlari secin ve kaydedin. Birden fazla dashboard arasinda gecis yapabilirsiniz.' },
      { q: 'OperIQ ile grafik nasil olusturulur?', a: '"Veri Gorsellestirme" butonuna tiklayin. Dogal dilde ne gormek istediginizi yazin (orn: "Departmanlara gore gorev dagilimi"). OperIQ otomatik grafik yapilandirmasi olusturur.' },
    ],
  },
  {
    icon: ClipboardList, title: 'Gorev Yonetimi', path: '/gorevler',
    items: [
      { q: 'Yeni gorev nasil olusturulur?', a: 'Sol menuden "Gorevler"e gidin, sag ustteki "Yeni Gorev" butonuna basin. Baslik, aciklama, departman, atanan kisi, oncelik ve teslim tarihini girin.' },
      { q: 'Gorev durumu nasil guncellenir?', a: 'Gorev kartina tiklayarak detay penceresini acin. Durum alanini degistirerek (Beklemede, Devam Ediyor, Tamamlandi) guncelleyebilirsiniz.' },
      { q: 'Checklist nasil eklenir?', a: 'Gorev detayinda "Checklist" bolumune yeni maddeler ekleyebilirsiniz. Her maddeyi isaretleyerek ilerlemeyi takip edin.' },
    ],
  },
  {
    icon: FileText, title: 'Saha Raporlari', path: '/raporlar',
    items: [
      { q: 'Rapor nasil olusturulur?', a: 'Sol menuden "Raporlar"a gidin, "Yeni Rapor" butonuna basin. Baslik, aciklama, departman, siddet derecesi ve fotograflar ekleyin.' },
      { q: 'OperIQ rapor analizi nasil calisir?', a: 'Rapor olusturuldugunda OperIQ otomatik olarak analiz eder. Anahtar bulgular, olasi nedenler ve onerilen aksiyonlar rapor detayinda gorunur.' },
    ],
  },
  {
    icon: BarChart3, title: 'KPI Yonetimi', path: '/kpi-panel',
    items: [
      { q: 'KPI nasil tanimlanir?', a: 'Sol menuden "KPI Panel"e gidin. Sektor sablonundan hazir KPI\'lar zaten yuklenmistir. Yeni KPI eklemek icin departman bazinda hedef ve olcum birimi tanimlayabilirsiniz.' },
      { q: 'KPI katmanlari nedir?', a: 'ActLedger 5 katmanli KPI yapisi sunar: Stratejik (ust yonetim), Taktik (orta yonetim), Operasyonel (saha), Bireysel (kisisel), AI (OperIQ uretimi).' },
    ],
  },
  {
    icon: Users, title: 'Kullanici & Departman Yonetimi', path: '/kullanicilar',
    items: [
      { q: 'Yeni kullanici nasil eklenir?', a: '"Kullanicilar" sayfasindan "Yeni Kullanici" butonuna basin. Ad, e-posta, rol ve departman atayarak olusturun. Sifre otomatik uretilir.' },
      { q: 'Rol seviyeleri nedir?', a: '8 seviyeli yetki sistemi: Isci, Teknisyen, Usta, Supervizor, Sef, Mudur, Direktor, Genel Mudur. Her seviye bir ust seviyenin tum yetkilerini icerir.' },
    ],
  },
  {
    icon: Map, title: 'Canli Harita', path: '/harita',
    items: [
      { q: 'Personel konumlari nasil goruntulenir?', a: '"Canli Harita" sayfasinda aktif konum paylasan personelleri harita uzerinde gorun. Departman bazinda filtreleme yapabilirsiniz.' },
      { q: 'Tesis nasil isaretlenir?', a: 'Harita uzerinde sag tiklayarak yeni tesis/fabrika/ofis konumu ekleyebilirsiniz. DMS veya decimal koordinat formatini destekler.' },
    ],
  },
  {
    icon: Building2, title: 'Tesis Haritasi (Live Facility Map)', path: '/harita',
    items: [
      { q: 'Tesis plani nasil yuklenir?', a: '"Canli Operasyon & Tesis Haritalari" sayfasinda "Tesis Haritasi" sekmesine gecin. "Plan Yukle" butonuyla PNG, JPG veya SVG formatindaki kat planinizi yukleyin.' },
      { q: 'Alan ve isaretci nasil eklenir?', a: '"Duzenle" modunu aktif edip plan uzerine tiklayarak alan veya isaretci ekleyin. Tip, katman, renk ve boyut ayarlarini yapin. Departman, IoT cihaz veya stok kalemine baglayabilirsiniz.' },
      { q: 'Katmanlar nasil acilir/kapatilir?', a: 'Haritanin ustundeki katman butonlariyla Departmanlar, IoT, Gorevler, Stok, Acil Durum katmanlarini ayrı ayrı acip kapatabilirsiniz.' },
      { q: 'Sektor sablonu nasil uygulanir?', a: '"Sablon" butonuyla sektorunuze uygun hazir alan yerlesimini secin (Uretim, Lojistik, Saglik, Perakende, Enerji, Egitim). Mevcut alanlara dokunmadan yenileri ekler.' },
      { q: 'Canli veri nasil goruntulenir?', a: 'IoT cihazlarina, departmanlara veya stok kalemlerine baglanan alanlarda canli durum rozetleri gorursunuz. Yesil = normal, sari = uyari, kirmizi = kritik.' },
      { q: 'Acil durum modu nedir?', a: '"Acil Durum" butonuyla haritadaki tehlike bolgeleri ve acil cikislar vurgulanir, diger alanlar soluklaşır. Kritik alanlarda nabiz animasyonu gorursunuz.' },
      { q: 'OperIQ tesis analizi nasil yapilir?', a: '"OperIQ" butonuyla tum tesis icin veya bir alana tiklayip "OperIQ Analiz" ile o alana ozel yapay zeka analizi alin. Problemli alanlar, onerilen aksiyonlar ve risk seviyesi raporlanır.' },
    ],
  },
  {
    icon: Cpu, title: 'IoT Cihaz Yonetimi', path: '/iot',
    items: [
      { q: 'IoT cihaz nasil eklenir?', a: '"Cihazlar" sayfasindan "Yeni Cihaz" butonuyla ekleyin. Cihaz ID, tip, protokol ve alarm esiklerini tanimlayin.' },
      { q: 'Alarm esikleri nasil ayarlanir?', a: 'Cihaz detayinda her sensor degeri icin min/max esik tanimlayin. Esik asildiginda otomatik bildirim olusur.' },
    ],
  },
  {
    icon: Package, title: 'Envanter & Stok', path: '/stok',
    items: [
      { q: 'Envanter nasil yuklenir?', a: 'Excel veya CSV dosyanizi yukleyin. OperIQ sutunlari otomatik eslestirir. Onizleme ekraninda kontrol edip onaylayin.' },
      { q: 'Stok uyarilari nasil calisir?', a: 'Minimum stok seviyesi tanimlayin. Seviye altina dustugunde otomatik uyari olusur.' },
    ],
  },
  {
    icon: FolderOpen, title: 'Dosya Yonetimi', path: '/dosyalar',
    items: [
      { q: 'Dosya nasil yuklenir?', a: 'Klasor icine girdikten sonra "Dosya Yukle" butonuyla yukleyin. Word, Excel, PDF, gorsel ve metin dosyalari desteklenir.' },
      { q: 'Dosya nasil goruntulenirsiniz?', a: 'Dosya adina tiklayarak salt okunur modda acin. Excel tablo, Word dokuman, PDF ve gorseller dogrudan platform icerisinde goruntulenebilir.' },
    ],
  },
  {
    icon: Zap, title: 'Otomasyon & Is Akislari', path: '/otomasyon',
    items: [
      { q: 'Otomasyon kurali nasil olusturulur?', a: '"Otomasyon" sayfasindan adim adim sihirbaz ile tetikleyici (orn: gorev gecikti) ve aksiyon (orn: bildirim gonder) tanimlayin.' },
      { q: 'Is akisi nasil tasarlanir?', a: '"Is Akislari" sayfasindan yeni akis olusturun. Adimlar ekleyerek onay, bildirim, dallanma ve paralel islemler tanimlayin.' },
    ],
  },
  {
    icon: MessageSquare, title: 'Mesajlasma',
    items: [
      { q: 'Mesaj nasil gonderilir?', a: 'Ust menudeki mesaj ikonuna tiklayin veya sol menuden "Mesajlar"a gidin. Kullanici rehberinden alici secip mesaj yazin.' },
    ],
  },
  {
    icon: Shield, title: 'Kisayollar',
    items: [
      { q: 'Klavye kisayollari nelerdir?', a: '"?" tusuna basarak kisayol listesini gorun. g+d: Dashboard, g+t: Gorevler, g+r: Raporlar, g+k: Kullanicilar, g+h: Harita.' },
    ],
  },
]

const MOBILE_GUIDE_TR: Section[] = [
  {
    icon: Smartphone, title: 'Giris & Baslangic',
    items: [
      { q: 'Mobil giris nasil yapilir?', a: 'Admin tarafindan verilen giris kodu (ACT-XXXXXX) ve gecici sifre ile giris yapin. Ilk giriste sifrenizi degistirmeniz istenir.' },
      { q: 'Uygulama ana sayfasinda ne var?', a: 'Alt menude 4 sekme: Gorevler, Formlar, OperIQ Asistan ve Profil. Ust barda senkronizasyon ve bildirim butonlari bulunur.' },
    ],
  },
  {
    icon: ClipboardList, title: 'Gorevler',
    items: [
      { q: 'Gorevlerimi nasil gorurum?', a: '"Gorevler" sekmesinde size atanan tum aktif gorevler listelenir. Duruma gore filtreleyebilirsiniz.' },
      { q: 'Gorev nasil tamamlanir?', a: 'Gorev detayina girin, checklist maddelerini isaretleyin ve durumu "Tamamlandi" olarak guncelleyin.' },
    ],
  },
  {
    icon: FileText, title: 'Formlar',
    items: [
      { q: 'Form nasil doldurulur?', a: '"Formlar" sekmesinden atanan form sablonunu secin. Alanlari doldurun, gerekirse fotograf ekleyin ve gonderin.' },
    ],
  },
  {
    icon: Zap, title: 'OperIQ Mobil Asistan',
    items: [
      { q: 'OperIQ\'ya nasil soru sorarim?', a: 'Alt menudeki OperIQ ikonuna tiklayin. Gorev, departman veya teknik konularda sorularinizi yazin. AI baglama uygun cevap verir.' },
      { q: 'Fotograf analizi nasil yapilir?', a: 'Sohbet icerisinde kamera ikonuyla fotograf cekin veya secin. OperIQ gorseli analiz ederek bulgulari raporlar. Gunluk 5 fotograf limiti vardir.' },
    ],
  },
  {
    icon: Map, title: 'Konum & Senkronizasyon',
    items: [
      { q: 'Konum paylasimi nasil calisir?', a: 'Konum izni verdikten sonra uygulamaniz 60 saniyede bir konumunuzu platforma gonderir. Profilinizde mevcut konumunuzu gorebilirsiniz.' },
      { q: 'Cevrimdisi calisma nasil olur?', a: 'Internet baglantisi kesildiginde veriler cihazda saklanir. Baglanti geri geldiginde otomatik senkronize edilir.' },
    ],
  },
]

export default function UserGuide() {
  const { lang } = useLanguage()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'platform' | 'mobile'>('platform')
  const [openSections, setOpenSections] = useState<Set<number>>(new Set([0]))
  const [navTarget, setNavTarget] = useState<string | null>(null)

  const sections = tab === 'platform' ? PLATFORM_GUIDE_TR : MOBILE_GUIDE_TR

  const toggleSection = (idx: number) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  return (
    <div className="space-y-5">
      <style>{`@keyframes bounceRight { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(6px); } } .animate-bounce-right { animation: bounceRight 0.6s ease-in-out 3; }`}</style>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <BookOpen size={20} className="text-cyan-600" />
            {lang === 'tr' ? 'Kullanim Kilavuzu' : 'User Guide'}
          </h2>
          <p className="text-[12px] text-zinc-400 mt-0.5">
            {lang === 'tr' ? 'ActLedger platformunu ve mobil uygulamayi nasil kullanacaginizi ogrenin' : 'Learn how to use ActLedger platform and mobile app'}
          </p>
        </div>
      </div>

      {/* Tab switch */}
      <div className="flex gap-2">
        <button type="button" onClick={() => { setTab('platform'); setOpenSections(new Set([0])) }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all ${tab === 'platform' ? 'bg-cyan-50 text-cyan-700 border-2 border-cyan-200' : 'bg-white border-2 border-zinc-200 text-zinc-600 hover:border-zinc-300'}`}>
          <Monitor size={16} /> {lang === 'tr' ? 'Platform Kilavuzu' : 'Platform Guide'}
        </button>
        <button type="button" onClick={() => { setTab('mobile'); setOpenSections(new Set([0])) }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all ${tab === 'mobile' ? 'bg-violet-50 text-violet-700 border-2 border-violet-200' : 'bg-white border-2 border-zinc-200 text-zinc-600 hover:border-zinc-300'}`}>
          <Smartphone size={16} /> {lang === 'tr' ? 'Mobil Kilavuz' : 'Mobile Guide'}
        </button>
      </div>

      {/* Sections */}
      <div className="space-y-2">
        {sections.map((section, idx) => {
          const isOpen = openSections.has(idx)
          return (
            <div key={idx} className="card overflow-hidden">
              <button type="button" onClick={() => toggleSection(idx)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-zinc-50 transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${tab === 'platform' ? 'bg-cyan-100' : 'bg-violet-100'}`}>
                  <section.icon size={16} className={tab === 'platform' ? 'text-cyan-600' : 'text-violet-600'} />
                </div>
                <span className="text-[14px] font-bold text-zinc-800 flex-1">{section.title}</span>
                <span className="text-[11px] text-zinc-400 mr-2">{section.items.length} konu</span>
                {isOpen ? <ChevronDown size={16} className="text-zinc-400" /> : <ChevronRight size={16} className="text-zinc-400" />}
              </button>
              {isOpen && (
                <div className="px-5 pb-4 space-y-3 border-t border-zinc-100 pt-3">
                  {section.items.map((item, i) => (
                    <div key={i} className="pl-11">
                      <p className="text-[13px] font-semibold text-zinc-700 mb-1">{item.q}</p>
                      <p className="text-[12px] text-zinc-500 leading-relaxed">{item.a}</p>
                    </div>
                  ))}
                  {section.path && (
                    <div className="pl-11 pt-2">
                      <button type="button"
                        onClick={(e) => { e.stopPropagation(); setNavTarget(section.path!); setTimeout(() => navigate(section.path!), 800) }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-bold transition-all hover:shadow-md"
                        style={{ background: tab === 'platform' ? '#ecfeff' : '#f5f3ff', color: tab === 'platform' ? '#0891b2' : '#7c3aed', border: `1px solid ${tab === 'platform' ? '#a5f3fc' : '#ddd6fe'}` }}>
                        <ArrowRight size={14} className={navTarget === section.path ? 'animate-bounce-right' : ''} />
                        {lang === 'tr' ? 'Bu sayfaya git' : 'Go to this page'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
