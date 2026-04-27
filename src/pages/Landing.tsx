import { useEffect, useRef, useState, useCallback } from 'react'
import { API_BASE } from '../lib/api'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight, Shield, Zap, BarChart3, Users, Layers, Activity,
  CheckCircle2, Globe, Phone, Mail, MapPin, Linkedin, ExternalLink,
  Cookie, Smartphone, Monitor, ClipboardList, Camera, MessageSquare,
  Upload, Building2, Lock, Languages, FileSpreadsheet, Eye, EyeOff, X, Loader2,
  Map, Flame, Cpu, Package, Send, MinusCircle,
  Workflow, FolderOpen, Radio, ListChecks, Boxes, GitBranch, ScanLine,
} from 'lucide-react'
import BrandMark from '../components/ui/BrandMark'
import { SECTORS } from '../data/sectors'
import { SECTOR_TEMPLATES } from '../data/sectorTemplates'
import { useAuth } from '../context/AuthContext'
import { FlagTR, FlagUS, FlagRU, FlagDE } from '../components/ui/Flags'

/* --------------------------------------------------------------------------
   TRANSLATIONS
   -------------------------------------------------------------------------- */
const T = {
  tr: {
    navPlatform: 'Platform',
    navSectors: 'Sekt\u00f6rler',
    navFeatures: '\u00d6zellikler',
    navContact: '\u0130leti\u015fim',
    signIn: 'Giri\u015f Yap',
    mobileLogin: 'Mobil Giri\u015f',
    heroTitle: 'Operasyonel M\u00fckemmellik \u0130\u00e7in D\u00fcnyada Bir \u0130lk Olarak Tasarland\u0131',
    heroSubtitle: 'Kurumsal operasyon y\u00f6netim platformu. Sekt\u00f6r\u00fcn\u00fcze \u00f6zel KPI \u015fablonlar\u0131, yapay zeka destekli analitik ve ger\u00e7ek zamanl\u0131 saha takibi.',
    heroDemo: 'Demo Talep Et',
    heroSignIn: 'Giri\u015f Yap',
    statSectors: 'Sekt\u00f6r',
    statDepts: 'Departman',
    statKpis: 'KPI',
    statLayers: 'AI Katman\u0131',
    platformTitle: 'ActLedger Nedir?',
    platformSubtitle: 'ActLedger, kurumsal operasyonlar\u0131n\u0131z\u0131 tek bir merkezden y\u00f6netmenizi sa\u011flayan end-to-end platformdur.',
    feat1Title: 'Ger\u00e7ek Zamanl\u0131 Operasyonlar',
    feat1Body: 'Saha verileri anl\u0131k olarak toplan\u0131r, i\u015flenir ve kokpit ekran\u0131na yans\u0131t\u0131l\u0131r. Gecikme s\u0131f\u0131r, g\u00f6r\u00fcnt\u00fc tam.',
    feat2Title: 'OperIQ - AI Destekli \u0130\u00e7g\u00f6r\u00fcler',
    feat2Body: 'Yapay zeka motorumuz sahadan gelen her veriyi analiz eder, risk ve f\u0131rsat sinyalleri \u00fcretir, aksiyon \u00f6nerir.',
    feat3Title: 'Kurumsal KPI Motoru',
    feat3Body: '7800+ haz\u0131r KPI \u015fablonu, 5 katmanl\u0131 \u00f6l\u00e7\u00fcm yap\u0131s\u0131. Sekt\u00f6r\u00fcn\u00fcze \u00f6zel metrikler tek t\u0131kla aktif.',
    sectorsTitle: 'Sekt\u00f6r \u015eablonlar\u0131',
    sectorsSubtitle: '15+ sekt\u00f6re \u00f6zel haz\u0131r yap\u0131land\u0131rma. Terminoloji, departmanlar ve KPI setleri sekt\u00f6r\u00fcn\u00fcz\u00fcn dilinde.',
    featuresTitle: '\u00d6zellikler',
    featuresSubtitle: 'Her ihtiyaca cevap veren kapsaml\u0131 \u00f6zellik seti.',
    f1Title: '\u00c7oklu Sekt\u00f6r KPI \u015eablonlar\u0131',
    f1Body: 'Her sekt\u00f6re \u00f6zel haz\u0131r KPI setleri. Tek t\u0131kla aktif edin, hemen \u00f6l\u00e7meye ba\u015flay\u0131n.',
    f2Title: 'Saha Operasyonlar\u0131',
    f2Body: 'Mobil uyumlu g\u00f6rev y\u00f6netimi, konum bazl\u0131 takip, \u00e7evrimd\u0131\u015f\u0131 \u00e7al\u0131\u015fma deste\u011fi.',
    f3Title: 'OperIQ AI Analitik',
    f3Body: 'Do\u011fal dilden grafik \u00fcretimi, anomali tespiti, risk skorlama ve aksiyon \u00f6nerisi.',
    f4Title: 'Excel/SQL Aktar\u0131m',
    f4Body: 'Mevcut verilerinizi sorunsuz aktar\u0131n. Excel, CSV ve SQL veritaban\u0131 entegrasyonu.',
    f5Title: 'Rol Bazl\u0131 Eri\u015fim',
    f5Body: '8 seviyeli yetki hiyerar\u015fisi, departman bazl\u0131 veri izolasyonu, denetim izi.',
    f6Title: 'Ger\u00e7ek Zamanl\u0131 Dashboard',
    f6Body: 'S\u00fcr\u00fcklenebilir widgetlar, canl\u0131 grafikler, departman bazl\u0131 g\u00f6r\u00fcn\u00fcmler.',
    howTitle: 'Nas\u0131l \u00c7al\u0131\u015f\u0131r?',
    step1Title: 'Yap\u0131land\u0131rma',
    step1Body: 'Admin sekt\u00f6r\u00fc ve departmanlar\u0131 se\u00e7er, organizasyon a\u011fac\u0131n\u0131 kurar.',
    step2Title: 'KPI Da\u011f\u0131t\u0131m\u0131',
    step2Body: 'KPI \u015fablonlar\u0131 otomatik da\u011f\u0131t\u0131l\u0131r, ekipler hemen \u00e7al\u0131\u015fmaya ba\u015flar.',
    step3Title: 'AI \u0130\u00e7g\u00f6r\u00fcler',
    step3Body: 'OperIQ aksiyona d\u00f6n\u00fc\u015ft\u00fcr\u00fclebilir i\u00e7g\u00f6r\u00fcler \u00fcretir, y\u00f6neticiler karar verir.',
    step4Title: 'Saha & Envanter',
    step4Body: 'Mobil QR tarama ile stok i\u015flemleri, hiyerar\u015fik onay ak\u0131\u015f\u0131, canl\u0131 tesis haritas\u0131 ve IoT izleme.',
    guideTitle: 'Platform Rehberi',
    guideSubtitle: 'Platformun temel mod\u00fcllerini ke\u015ffet.',
    guide1Title: 'Kokpit & Dashboard',
    guide1Body: 'T\u00fcm operasyonel verilerin tek ekranda g\u00f6r\u00fcnt\u00fclenmesi, canl\u0131 widgetlar ve \u00f6zetler.',
    guide2Title: 'G\u00f6rev Y\u00f6netimi',
    guide2Body: 'G\u00f6rev olu\u015fturma, atama, takip ve raporlama. Saha personelinden merkeze ak\u0131\u015f.',
    guide3Title: 'KPI Takibi',
    guide3Body: 'Departman bazl\u0131 hedef belirleme, ger\u00e7ek zamanl\u0131 ilerleme izleme, sapma uyar\u0131lar\u0131.',
    guide4Title: 'OperIQ Asistan\u0131',
    guide4Body: 'AI destekli analiz, do\u011fal dil sorgusu, otomatik rapor \u00fcretimi.',
    guide5Title: 'AssetIQ & Envanter Zekas\u0131',
    guide5Body: 'QR kod ile anl\u0131k stok hareketi, parti/lot takibi, hiyerar\u015fik onay ak\u0131\u015f\u0131, sat\u0131n alma bildirimi.',
    guide6Title: 'Canl\u0131 Harita & Tesis',
    guide6Body: 'GPS takip, 2D/3D tesis plan\u0131, d\u00f6nd\u00fcrme, IoT cihaz yerlestirme, acil durum y\u00f6netimi.',
    quoteText: '\u201cActLedger, 23 departman\u0131m\u0131z\u0131n operasyonel verisini tek ekranda birle\u015ftirdi. Karar alma s\u00fcrecimiz %40 h\u0131zland\u0131.\u201d',
    quoteName: 'Mehmet Kaya',
    quoteRole: 'Operasyon Direkt\u00f6r\u00fc, Y\u0131ld\u0131z Metal A.\u015e.',
    ctaTitle: 'Operasyonlar\u0131n\u0131z\u0131 D\u00f6n\u00fc\u015ft\u00fcr\u00fcn',
    ctaSubtitle: 'ActLedger ile kurumsal operasyonlar\u0131n\u0131z\u0131 bir \u00fcst seviyeye ta\u015f\u0131y\u0131n.',
    ctaDemo: 'Demo Talep Et',
    ctaSignIn: 'Giri\u015f Yap',
    cookieText: 'Bu site \u00e7erezleri kullan\u0131r. Devam ederek \u00e7erez politikam\u0131z\u0131 kabul etmi\u015f olursunuz.',
    cookieAccept: 'T\u00fcm\u00fcn\u00fc Kabul Et',
    cookieAcceptSelected: 'Se\u00e7ilenleri Kabul Et',
    cookieDecline: 'Reddet',
    cookieNecessaryTitle: 'Zorunlu \u00c7erezler',
    cookieNecessaryDesc: 'Site\u2019nin d\u00fczg\u00fcn \u00e7al\u0131\u015fmas\u0131 i\u00e7in gereklidir. Oturum y\u00f6netimi, g\u00fcvenlik ve temel i\u015flevler bu \u00e7erezlere ba\u011fl\u0131d\u0131r. Devre d\u0131\u015f\u0131 b\u0131rak\u0131lamaz.',
    cookieOptionalTitle: '\u0130ste\u011fe Ba\u011fl\u0131 \u00c7erezler',
    cookieOptionalDesc: 'Kullan\u0131c\u0131 deneyimini iyile\u015ftirmek, site kullan\u0131m istatistiklerini toplamak ve ki\u015fiselle\u015ftirilmi\u015f i\u00e7erik sunmak amac\u0131yla kullan\u0131l\u0131r.',
    cookiePolicyDetail: '\u00c7erez politikam\u0131z hakk\u0131nda detayl\u0131 bilgi i\u00e7in Gizlilik Politikas\u0131 sayfam\u0131z\u0131 inceleyebilirsiniz. \u00c7erez tercihlerinizi istedi\u011finiz zaman de\u011fi\u015ftirebilirsiniz.',
    cookieAlwaysOn: 'Her zaman a\u00e7\u0131k',
    footerDev: 'ATAOL AI Techs\'e aittir.',
    footerRights: 'T\u00fcm haklar\u0131',
    footerPrivacy: 'Gizlilik Politikas\u0131',
    footerTerms: 'Kullan\u0131m \u015eartlar\u0131',
    deptCount: 'departman',
    platformFeaturesTitle: 'Platform Yetenekleri',
    platformFeaturesSubtitle: 'ActLedger\'in sundu\u011fu t\u00fcm \u00f6zellikleri ke\u015ffedin.',
    pf1Title: 'Mobil Saha Uygulamas\u0131',
    pf1Body: 'Saha personeli mobil uygulama ile veri toplar, g\u00f6rev al\u0131r, foto\u011fraf y\u00fckler. \u00c7evrimd\u0131\u015f\u0131 \u00e7al\u0131\u015fma deste\u011fi ile her ko\u015fulda \u00e7al\u0131\u015f\u0131r.',
    pf1Benefit: 'Saha verimlili\u011fini %60 art\u0131r\u0131n',
    pf2Title: 'Ger\u00e7ek Zamanl\u0131 Dashboard & Kokpit',
    pf2Body: 'T\u00fcm operasyonel verileriniz tek bir ekranda. S\u00fcr\u00fcklenebilir widgetlar, canl\u0131 grafikler ve departman bazl\u0131 g\u00f6r\u00fcn\u00fcmler. Do\u011fal dille tarif edin, saniyeler i\u00e7inde veri g\u00f6rselle\u015ftirme olu\u015fsun.',
    pf2Benefit: 'Anl\u0131k karar alma kapasitesi',
    pf3Title: 'G\u00f6rev Atama & Takip',
    pf3Body: 'G\u00f6rev olu\u015fturun, ekip \u00fcyelerine atay\u0131n, ilerlemeyi takip edin. Otomatik hat\u0131rlatmalar ve eskalasyon kurallar\u0131 sa\u011flar.',
    pf3Benefit: 'G\u00f6rev tamamlanma oran\u0131n\u0131 %45 art\u0131r\u0131n',
    pf4Title: 'Foto\u011fraf ile Saha Raporlar\u0131',
    pf4Body: 'Saha g\u00f6rselleri ile zenginle\u015ftirilmi\u015f raporlar. Konum ve zaman damgas\u0131 ile do\u011frulanm\u0131\u015f veriler sa\u011flar.',
    pf4Benefit: 'Raporlama s\u00fcresini %70 k\u0131salt\u0131n',
    pf5Title: 'OperIQ AI Analitik & \u0130\u00e7g\u00f6r\u00fcler',
    pf5Body: 'Yapay zeka motorumuz t\u00fcm saha verilerini analiz eder, anomalileri tespit eder, risk skorlar\u0131 \u00fcretir ve aksiyon \u00f6nerir.',
    pf5Benefit: 'Proaktif karar alma ile maliyetleri %30 d\u00fc\u015f\u00fcr\u00fcn',
    pf6Title: 'Mesajla\u015fma & \u0130leti\u015fim',
    pf6Body: 'Platform i\u00e7i, mobil-mobil ve platform-mobil aras\u0131 mesajla\u015fma, bildirimler ve duyurular. Ekipler aras\u0131 koordinasyonu g\u00fc\u00e7lendirin.',
    pf6Benefit: '\u0130leti\u015fim s\u00fcresini %50 azalt\u0131n',
    pf7Title: 'KPI Y\u00f6netimi (5 Katmanl\u0131)',
    pf7Body: '7800+ haz\u0131r KPI \u015fablonu. Stratejik, taktik, operasyonel, bireysel ve AI katmanlar\u0131 ile kapsaml\u0131 \u00f6l\u00e7\u00fcm.',
    pf7Benefit: 'Performans g\u00f6r\u00fcn\u00fcrl\u00fc\u011f\u00fcn\u00fc %100 art\u0131r\u0131n',
    pf8Title: 'Verimlilik ve Emniyet',
    pf8Body: 'Acil durumlara anl\u0131k m\u00fcdahale ile operasyonun, \u00e7al\u0131\u015fanlar\u0131n, bina, ekipman ve tesislerin emniyetine katk\u0131 sa\u011flar. Proaktif uyar\u0131 sistemi riskleri \u00f6nceden tespit ederek verimlili\u011fi art\u0131r\u0131r.',
    pf8Benefit: 'Operasyonel emniyet seviyesini en \u00fcst d\u00fczeye \u00e7\u0131kar\u0131n',
    pf9Title: 'Departman & Kullan\u0131c\u0131 Y\u00f6netimi',
    pf9Body: 'Organizasyon a\u011fac\u0131n\u0131z\u0131 olu\u015fturun, departmanlar\u0131 yap\u0131land\u0131r\u0131n, kullan\u0131c\u0131lar\u0131 y\u00f6netin.',
    pf9Benefit: 'Kurumsal yap\u0131n\u0131z\u0131 dijitalle\u015ftirin',
    pf10Title: 'Rol Bazl\u0131 Eri\u015fim Kontrol\u00fc',
    pf10Body: '8 seviyeli yetki hiyerar\u015fisi, departman bazl\u0131 veri izolasyonu ve tam denetim izi.',
    pf10Benefit: 'Veri g\u00fcvenli\u011fini en \u00fcst d\u00fczeye \u00e7\u0131kar\u0131n',
    pf11Title: '\u00c7ok Dilli Destek (TR/EN)',
    pf11Body: 'Platform tamam\u0131yla T\u00fcrk\u00e7e ve \u0130ngilizce destekler. Kullan\u0131c\u0131lar kendi dil tercihlerini se\u00e7ebilir.',
    pf11Benefit: 'Global ekipler i\u00e7in haz\u0131r',
    pf12Title: 'Sekt\u00f6re \u00d6zel \u015eablonlar (15 Sekt\u00f6r)',
    pf12Body: '\u00dcretimden sa\u011fl\u0131\u011fa, in\u015faattan perakendeye 15+ sekt\u00f6r i\u00e7in haz\u0131r yap\u0131land\u0131rma, terminoloji ve KPI setleri.',
    pf12Benefit: 'Hemen ba\u015flay\u0131n, s\u0131f\u0131rdan kurmay\u0131n',
    // New features
    nf1Title: 'Canl\u0131 Operasyon & Tesis Haritas\u0131',
    nf1Body: 'D\u0131\u015f mekan GPS takibi ve i\u00e7 mekan tesis kat planlar\u0131 tek panelde. Personel konumunu canl\u0131 izleyin, tesis planlar\u0131n\u0131z\u0131 y\u00fckleyin, departman alanlar\u0131 ve IoT cihazlar\u0131 plan \u00fczerine yerle\u015ftirin. Acil durumlarda en yak\u0131n personele an\u0131nda g\u00f6rev atay\u0131n.',
    nf1Benefit: 'Operasyonunuzu d\u0131\u015far\u0131dan de\u011fil, i\u00e7eriden y\u00f6netin',
    nf2Title: 'Is\u0131 Haritas\u0131 Analiti\u011fi',
    nf2Body: 'Personel yo\u011funlu\u011fu, IoT ar\u0131za korelasyonu ve darbo\u011faz tespiti. \u00dc\u00e7 katmanl\u0131 \u0131s\u0131l analiz ile operasyonunuzdaki k\u00f6r alanlar\u0131 ortadan kald\u0131r\u0131n.',
    nf2Benefit: 'Darbo\u011faz tespiti ile verimlili\u011fi %35 art\u0131r\u0131n',
    nf3Title: 'OperIQ Mobil Asistan',
    nf3Body: 'Saha personeline g\u00f6rev bazl\u0131 rehberlik, foto\u011fraf analizi, ad\u0131m ad\u0131m checklist ve teknik dok\u00fcman referans\u0131. Guided AI ile her ad\u0131mda y\u00f6nlendirme.',
    nf3Benefit: 'Saha hatalar\u0131n\u0131 %60 azalt\u0131n',
    nf4Title: 'Stok ve Envanter Y\u00f6netimi',
    nf4Body: 'Depo, raf ve lokasyon bazl\u0131 envanter takibi. QR kod ile anl\u0131k stok hareketi, parti/lot y\u00f6netimi ve son kullanma takibi. Minimum stok uyar\u0131lar\u0131 departman m\u00fcd\u00fcr\u00fc ve sat\u0131n alma sorumlusuna otomatik bildirilir. G\u00f6rev bazl\u0131 stok rezervasyonu, h\u0131zl\u0131 t\u00fcketim modu ve OperIQ destekli t\u00fckenme tahmini ile operasyonlar\u0131n\u0131z hi\u00e7 durmas\u0131n. 15+ sekt\u00f6re uyarlanabilir terminoloji, IoT entegrasyonu ve Excel/CSV/SQL ile toplu veri y\u00fckleme deste\u011fi.',
    nf4Benefit: 'Stok maliyetlerini %40 d\u00fc\u015f\u00fcr\u00fcn, duraklamalar\u0131 s\u0131f\u0131rlay\u0131n',
    nf5Title: 'Otomasyon Motoru',
    nf5Body: 'Tekrarl\u0131 s\u00fcre\u00e7lerinizi otomatikle\u015ftirin. Tetikleyici-ko\u015ful-aksiyon yap\u0131s\u0131 ile g\u00f6rev atama, bildirim g\u00f6nderme, KPI g\u00fcncelleme ve e-posta tetikleme gibi i\u015flemleri insan m\u00fcdahalesi olmadan \u00e7al\u0131\u015ft\u0131r\u0131n.',
    nf5Benefit: 'Manuel i\u015f y\u00fck\u00fcn\u00fc %75 azalt\u0131n',
    nf6Title: '\u0130\u015f Ak\u0131\u015f\u0131 Olu\u015fturucu',
    nf6Body: 'G\u00f6rsel s\u00fcr\u00fckle-b\u0131rak tasar\u0131mc\u0131 ile \u00e7ok ad\u0131ml\u0131 i\u015f ak\u0131\u015flar\u0131 olu\u015fturun. Onay, bildirim, dallanma ve paralel g\u00f6rev zincirleri tan\u0131mlay\u0131n. S\u00fcre\u00e7lerinizi kodlamadan dijitalle\u015ftirin.',
    nf6Benefit: 'S\u00fcre\u00e7 onay s\u00fcrelerini %65 k\u0131salt\u0131n',
    nf7Title: 'Dosya Y\u00f6netimi',
    nf7Body: 'Departman ve rol bazl\u0131 eri\u015fim kontroll\u00fc dosya deposu. Word, Excel, PDF ve g\u00f6rselleri do\u011frudan platform i\u00e7inde salt okunur a\u00e7\u0131n. Klas\u00f6r hiyerar\u015fisi ve yetki y\u00f6netimi ile kurumsal dok\u00fcmanlar\u0131n\u0131z g\u00fcvende.',
    nf7Benefit: 'Dok\u00fcman eri\u015fim s\u00fcresini %80 k\u0131salt\u0131n',
    nf8Title: 'Mobil Merkez & G\u00f6rev Yay\u0131n\u0131',
    nf8Body: 'Saha ekiplerine anl\u0131k g\u00f6rev yay\u0131nlay\u0131n, cihaz senkronizasyonunu izleyin ve mobil mesajla\u015fma ile koordinasyonu sa\u011flay\u0131n. Tek ekrandan t\u00fcm mobil operasyonlar\u0131 y\u00f6netin.',
    nf8Benefit: 'Saha koordinasyon s\u00fcresini %55 k\u0131salt\u0131n',
    nf9Title: '\u00c7ok Tipli Form \u015eablonlar\u0131',
    nf9Body: 'Kontrol listesi, soru-cevap, denetim/muayene, say\u0131sal veri giri\u015fi ve \u00e7oktan se\u00e7meli form tipleri. 11+ haz\u0131r \u015fablon ile an\u0131nda ba\u015flay\u0131n veya s\u0131f\u0131rdan \u00f6zelle\u015ftirin.',
    nf9Benefit: 'Form olu\u015fturma s\u00fcresini %90 k\u0131salt\u0131n',
    nf10Title: 'AssetIQ - Envanter Zekas\u0131',
    nf10Body: 'QR kod ile anl\u0131k stok hareketi, parti/lot y\u00f6netimi, son kullanma takibi. Hiyerar\u015fik onay ak\u0131\u015f\u0131 ile saha \u00e7al\u0131\u015fan\u0131ndan departman m\u00fcd\u00fcr\u00fcne stok i\u015flem onay\u0131. 10 sekt\u00f6re uyarlanabilir terminoloji ve OperIQ destekli t\u00fckenme tahmini.',
    nf10Benefit: 'Stok kay\u0131plar\u0131n\u0131 %50 azalt\u0131n, onay s\u00fcresini %70 k\u0131salt\u0131n',
    nf11Title: 'Mobil QR Tarama & Onay',
    nf11Body: 'Saha personeli kamera ile QR okutarak stok bilgisine ula\u015f\u0131r, ekleme/\u00e7\u0131karma/transfer i\u015flemi ba\u015flat\u0131r. \u0130\u015flem hiyerar\u015fik onay zincirine g\u00f6nderilir ve onayland\u0131\u011f\u0131nda otomatik uygulan\u0131r.',
    nf11Benefit: 'Saha stok i\u015flem s\u00fcresini %80 k\u0131salt\u0131n',
    nf12Title: 'IoT Cihaz Sorumlusu & Bildirim',
    nf12Body: 'Her IoT cihaz\u0131na sorumlu personel atay\u0131n. Alarm, kritik durum ve \u00e7evrimd\u0131\u015f\u0131 bildirimleri otomatik g\u00f6nderilir. G\u00fcnde 2 kere rutin durum raporu ile proaktif takip.',
    nf12Benefit: 'Cihaz ar\u0131za tepki s\u00fcresini %60 k\u0131salt\u0131n',
    tryFree: 'ActLedger Platformu ve ActLedger Mobil\'i \u00dccretsiz Deneyin',
    platformVideoTitle: 'Platformu Ke\u015ffedin',
    platformVideoSubtitle: 'ActLedger\'in g\u00fcc\u00fcn\u00fc tek bir ekranda deneyimleyin.',
    benchmarkSupra: 'ERP\'den Fazlas\u0131: Operasyonun Ger\u00e7ek Zamanl\u0131 Y\u00f6netimi',
    benchmarkTitle: 'ActLedger vs Geleneksel Sistemler',
    benchmarkSubtitle: 'Operasyonunuzu y\u00f6netmek i\u00e7in tek bir platform yeterli.',
    benchmarkDesc: 'ActLedger; g\u00f6rev, saha, IoT, KPI ve OperIQ yapay zekas\u0131n\u0131 tek platformda birle\u015ftirerek i\u015fletmenize ger\u00e7ek zamanl\u0131 kontrol sa\u011flar.',
    benchmarkCta: 'Birka\u00e7 saat i\u00e7inde kurun, an\u0131nda de\u011fer \u00fcretmeye ba\u015flay\u0131n.',
    benchmarkCol1: 'ActLedger',
    benchmarkCol2: 'Geleneksel Sistemler',
    mobileVideoTitle: 'Mobil Deneyim',
    mobileVideoSubtitle: 'Sahan\u0131n g\u00fcc\u00fc avucunuzda. Her yerden, her zaman.',
    contactTitle: '\u00dccretsiz Deneme Talebi',
    contactName: 'Ad Soyad',
    contactEmail: '\u015eirket E-Posta Adresi',
    contactCompany: '\u015eirket \u0130smi',
    contactSector: 'Sekt\u00f6r',
    contactInterest: '\u0130lgi Alan\u0131n\u0131z',
    contactMessage: 'Mesaj',
    contactSend: 'G\u00f6nder',
    contactSuccess: 'Mesaj\u0131n\u0131z ba\u015far\u0131yla g\u00f6nderildi!',
    contactError: 'G\u00f6nderim s\u0131ras\u0131nda hata olu\u015ftu.',
    navInsights: '\u0130\u00e7 G\u00f6r\u00fcler',
    insightsTitle: 'OperIQ Insights',
    insightsSubtitle: 'Operasyonel verilerinizi anlamland\u0131r\u0131n, do\u011fru kararlar\u0131 zaman\u0131nda al\u0131n.',
  },
  en: {
    navPlatform: 'Platform',
    navSectors: 'Sectors',
    navFeatures: 'Features',
    navContact: 'Contact',
    signIn: 'Sign In',
    mobileLogin: 'Mobile Login',
    heroTitle: 'A World First, Engineered for Operational Excellence',
    heroSubtitle: 'Enterprise operations management platform. Sector-specific KPI templates, AI-powered analytics, and real-time field tracking.',
    heroDemo: 'Request Demo',
    heroSignIn: 'Sign In',
    heroTitle2: 'Engineered for Operational Excellence',
    statSectors: 'Sectors',
    statDepts: 'Departments',
    statKpis: 'KPIs',
    statLayers: 'AI Layers',
    platformTitle: 'What is ActLedger?',
    platformSubtitle: 'ActLedger is an end-to-end platform that lets you manage enterprise operations from a single hub.',
    feat1Title: 'Real-time Operations',
    feat1Body: 'Field data is collected, processed, and reflected on the cockpit instantly. Zero delay, full visibility.',
    feat2Title: 'OperIQ - AI-Powered Insights',
    feat2Body: 'Our AI engine analyzes every piece of field data, generates risk and opportunity signals, and suggests actions.',
    feat3Title: 'Enterprise KPI Engine',
    feat3Body: '7800+ ready KPI templates, 5-layer measurement structure. Sector-specific metrics activated in one click.',
    sectorsTitle: 'Sector Templates',
    sectorsSubtitle: '15+ sector-specific configurations. Terminology, departments, and KPI sets in your industry language.',
    featuresTitle: 'Features',
    featuresSubtitle: 'A comprehensive feature set that meets every need.',
    f1Title: 'Multi-Sector KPI Templates',
    f1Body: 'Ready-made KPI sets for each sector. Activate with one click, start measuring immediately.',
    f2Title: 'Field Operations',
    f2Body: 'Mobile-friendly task management, location-based tracking, offline work support.',
    f3Title: 'OperIQ AI Analytics',
    f3Body: 'Natural language chart generation, anomaly detection, risk scoring, and action suggestions.',
    f4Title: 'Excel/SQL Import',
    f4Body: 'Import your existing data seamlessly. Excel, CSV, and SQL database integration.',
    f5Title: 'Role-based Access',
    f5Body: '8-level permission hierarchy, department-based data isolation, audit trail.',
    f6Title: 'Real-time Dashboard',
    f6Body: 'Draggable widgets, live charts, department-specific views.',
    howTitle: 'How It Works',
    step1Title: 'Configuration',
    step1Body: 'Admin selects sector and departments, sets up the organization tree.',
    step2Title: 'KPI Deployment',
    step2Body: 'KPI templates are auto-deployed, teams start working immediately.',
    step3Title: 'AI Insights',
    step3Body: 'OperIQ generates actionable insights, managers make informed decisions.',
    step4Title: 'Field & Inventory',
    step4Body: 'Mobile QR scanning for stock actions, hierarchical approval flow, live facility map and IoT monitoring.',
    guideTitle: 'Platform Guide',
    guideSubtitle: 'Discover the core modules of the platform.',
    guide1Title: 'Cockpit & Dashboard',
    guide1Body: 'All operational data displayed on a single screen, live widgets and summaries.',
    guide2Title: 'Task Management',
    guide2Body: 'Task creation, assignment, tracking, and reporting. Flow from field personnel to HQ.',
    guide3Title: 'KPI Tracking',
    guide3Body: 'Department-level goal setting, real-time progress monitoring, deviation alerts.',
    guide4Title: 'OperIQ Assistant',
    guide4Body: 'AI-powered analysis, natural language queries, automatic report generation.',
    guide5Title: 'AssetIQ & Inventory Intelligence',
    guide5Body: 'QR code instant stock actions, batch/lot tracking, hierarchical approval flow, purchase alerts.',
    guide6Title: 'Live Map & Facility',
    guide6Body: 'GPS tracking, 2D/3D facility plans with rotate, IoT device placement, emergency management.',
    quoteText: '"ActLedger unified operational data from our 23 departments into a single screen. Our decision-making process accelerated by 40%."',
    quoteName: 'Mehmet Kaya',
    quoteRole: 'Operations Director, Yildiz Metal Inc.',
    ctaTitle: 'Transform Your Operations',
    ctaSubtitle: 'Take your enterprise operations to the next level with ActLedger.',
    ctaDemo: 'Request Demo',
    ctaSignIn: 'Sign In',
    cookieText: 'This site uses cookies. By continuing, you accept our cookie policy.',
    cookieAccept: 'Accept All',
    cookieAcceptSelected: 'Accept Selected',
    cookieDecline: 'Decline',
    cookieNecessaryTitle: 'Necessary Cookies',
    cookieNecessaryDesc: 'Required for the site to function properly. Session management, security, and core features depend on these cookies. Cannot be disabled.',
    cookieOptionalTitle: 'Optional Cookies',
    cookieOptionalDesc: 'Used to improve user experience, collect site usage statistics, and deliver personalized content.',
    cookiePolicyDetail: 'For detailed information about our cookie policy, please visit our Privacy Policy page. You can change your cookie preferences at any time.',
    cookieAlwaysOn: 'Always on',
    footerDev: 'Belongs to ATAOL AI Techs.',
    footerRights: 'All rights',
    footerPrivacy: 'Privacy Policy',
    footerTerms: 'Terms of Use',
    deptCount: 'departments',
    platformFeaturesTitle: 'Platform Capabilities',
    platformFeaturesSubtitle: 'Discover everything ActLedger has to offer.',
    pf1Title: 'Mobile Field App',
    pf1Body: 'Field personnel collect data, receive tasks, and upload photos via mobile app. Offline support ensures it works in any condition.',
    pf1Benefit: 'Boost field efficiency by 60%',
    pf2Title: 'Real-time Dashboard & Cockpit',
    pf2Body: 'All your operational data on a single screen. Draggable widgets, live charts, and department-specific views. Describe what you need in plain language, get instant data visualizations.',
    pf2Benefit: 'Instant decision-making capacity',
    pf3Title: 'Task Assignment & Tracking',
    pf3Body: 'Create tasks, assign to team members, track progress. Automatic reminders and escalation rules.',
    pf3Benefit: 'Increase task completion rate by 45%',
    pf4Title: 'Field Reports with Photo',
    pf4Body: 'Reports enriched with field visuals. Verified data with location and time stamps.',
    pf4Benefit: 'Cut reporting time by 70%',
    pf5Title: 'OperIQ AI Analytics & Insights',
    pf5Body: 'Our AI engine analyzes all field data, detects anomalies, produces risk scores, and suggests actions.',
    pf5Benefit: 'Reduce costs by 30% with proactive decisions',
    pf6Title: 'Messaging & Communication',
    pf6Body: 'In-platform messaging, notifications, and announcements. Strengthen coordination across teams.',
    pf6Benefit: 'Reduce communication lag by 50%',
    pf7Title: 'KPI Management (5-Layer)',
    pf7Body: '7800+ ready KPI templates. Comprehensive measurement across strategic, tactical, operational, individual, and AI layers.',
    pf7Benefit: 'Increase performance visibility by 100%',
    pf8Title: 'Efficiency & Safety',
    pf8Body: 'Instant response to emergencies protects operations, personnel, buildings, equipment, and facilities. Proactive alert system detects risks before they escalate.',
    pf8Benefit: 'Maximize operational safety levels',
    pf9Title: 'Department & User Management',
    pf9Body: 'Build your organization tree, configure departments, manage users with ease.',
    pf9Benefit: 'Digitize your corporate structure',
    pf10Title: 'Role-based Access Control',
    pf10Body: '8-level permission hierarchy, department-based data isolation, and full audit trail.',
    pf10Benefit: 'Maximize data security',
    pf11Title: 'Multi-language Support (TR/EN)',
    pf11Body: 'Platform fully supports Turkish and English. Users can select their language preference.',
    pf11Benefit: 'Ready for global teams',
    pf12Title: 'Sector-specific Templates (15 Sectors)',
    pf12Body: 'From manufacturing to healthcare, construction to retail - ready configurations, terminology, and KPI sets for 15+ sectors.',
    pf12Benefit: 'Start immediately, no setup from scratch',
    // New features
    newFeaturesTitle: 'Next-Gen Operational Capabilities',
    newFeaturesSubtitle: 'Transform your operations with live maps, heatmaps, mobile AI, and smart inventory.',
    nf1Title: 'Live Operations & Facility Map',
    nf1Body: 'Outdoor GPS tracking and indoor facility floor plans in one panel. Monitor personnel live, upload floor plans, place department zones and IoT devices on plans. Instantly assign tasks to nearest personnel in emergencies.',
    nf1Benefit: 'Manage operations from inside, not outside',
    nf2Title: 'Heatmap Analytics',
    nf2Body: 'Personnel density, IoT fault correlation, and bottleneck detection. Three-layer thermal analysis eliminates operational blind spots.',
    nf2Benefit: 'Improve efficiency by 35% with bottleneck detection',
    nf3Title: 'OperIQ Mobile Assistant',
    nf3Body: 'Task-based guidance for field personnel, photo analysis, step-by-step checklists, and technical document references. Guided AI at every step.',
    nf3Benefit: 'Reduce field errors by 60%',
    nf4Title: 'Stock & Inventory Management',
    nf4Body: 'Warehouse, shelf, and location-based inventory tracking. QR code instant stock movement, batch/lot management and expiry tracking. Minimum stock alerts are automatically sent to department managers and purchasing officers. Task-based stock reservation, quick consumption mode and OperIQ-powered depletion forecasting keep your operations running. Adaptable terminology for 15+ sectors, IoT integration and bulk data import via Excel, CSV, or SQL.',
    nf4Benefit: 'Cut stock costs by 40%, eliminate downtime',
    nf5Title: 'Automation Engine',
    nf5Body: 'Automate your repetitive processes. Trigger-condition-action structure runs task assignments, notifications, KPI updates, and email triggers without human intervention.',
    nf5Benefit: 'Reduce manual workload by 75%',
    nf6Title: 'Workflow Builder',
    nf6Body: 'Create multi-step workflows with a visual drag-and-drop designer. Define approvals, notifications, branching, and parallel task chains. Digitize your processes without coding.',
    nf6Benefit: 'Cut process approval times by 65%',
    nf7Title: 'File Management',
    nf7Body: 'File repository with department and role-based access control. Open Word, Excel, PDF, and images directly in the platform in read-only mode. Folder hierarchy and permission management keeps your documents secure.',
    nf7Benefit: 'Cut document access time by 80%',
    nf8Title: 'Mobile Hub & Task Broadcast',
    nf8Body: 'Broadcast tasks to field teams instantly, monitor device synchronization, and coordinate via mobile messaging. Manage all mobile operations from a single screen.',
    nf8Benefit: 'Cut field coordination time by 55%',
    nf9Title: 'Multi-type Form Templates',
    nf9Body: 'Checklist, Q&A, inspection, numeric data entry, and multiple-choice form types. Start instantly with 11+ ready templates or customize from scratch.',
    nf9Benefit: 'Cut form creation time by 90%',
    nf10Title: 'AssetIQ - Inventory Intelligence',
    nf10Body: 'QR code instant stock actions, batch/lot management, expiry tracking. Hierarchical approval from field worker to department manager. Adaptable terminology for 10 sectors and OperIQ-powered depletion forecasting.',
    nf10Benefit: 'Reduce stock losses by 50%, cut approval time by 70%',
    nf11Title: 'Mobile QR Scan & Approval',
    nf11Body: 'Field personnel scan QR with camera to access stock info, initiate add/remove/transfer actions. Actions are sent through hierarchical approval chain and auto-applied when approved.',
    nf11Benefit: 'Cut field stock operation time by 80%',
    nf12Title: 'IoT Device Responsible & Alerts',
    nf12Body: 'Assign responsible personnel to each IoT device. Alert, critical, and offline notifications sent automatically. Twice-daily routine status reports for proactive monitoring.',
    nf12Benefit: 'Cut device failure response time by 60%',
    tryFree: 'Try ActLedger Platform & ActLedger Mobile for Free',
    platformVideoTitle: 'Explore the Platform',
    platformVideoSubtitle: 'Experience the power of ActLedger on a single screen.',
    benchmarkSupra: 'Beyond ERP: Real-Time Operations Management',
    benchmarkTitle: 'ActLedger vs Traditional Systems',
    benchmarkSubtitle: 'One platform is all you need to manage your operations.',
    benchmarkDesc: 'ActLedger combines tasks, field ops, IoT, KPIs, and OperIQ AI in one platform - giving your business real-time control.',
    benchmarkCta: 'Set up in a few hours, start delivering value instantly.',
    benchmarkCol1: 'ActLedger',
    benchmarkCol2: 'Traditional Systems',
    mobileVideoTitle: 'Mobile Experience',
    mobileVideoSubtitle: 'The power of the field in your hands. Anywhere, anytime.',
    contactTitle: 'Free Trial Request',
    contactName: 'Full Name',
    contactEmail: 'Company Email',
    contactCompany: 'Company Name',
    contactSector: 'Sector',
    contactInterest: 'Area of Interest',
    contactMessage: 'Message',
    contactSend: 'Send',
    contactSuccess: 'Your message has been sent successfully!',
    contactError: 'An error occurred while sending.',
    navInsights: 'Insights',
    insightsTitle: 'OperIQ Insights',
    insightsSubtitle: 'Make sense of your operational data, make the right decisions on time.',
  },
}

/* --------------------------------------------------------------------------
   SCROLL-GROW VIDEO COMPONENT
   -------------------------------------------------------------------------- */
function ScrollGrowVideo({ src }: { src: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onScroll = () => {
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight
      // Phase 1: entering viewport -> grow (top of element reaches bottom of viewport to center)
      const enterProgress = Math.max(0, Math.min(1, 1 - rect.top / vh))
      // Phase 2: leaving viewport -> shrink back (bottom of element approaches top of viewport)
      const exitProgress = Math.max(0, Math.min(1, rect.bottom / vh))
      setProgress(Math.min(enterProgress, exitProgress))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const baseScale = isMobile ? 0.95 : 0.55
  const baseWidth = isMobile ? 98 : 60
  const scale = baseScale + progress * (1 - baseScale)
  const radius = Math.max(0, (isMobile ? 8 : 16) - progress * (isMobile ? 8 : 16))

  return (
    <div ref={ref} className="relative w-full flex justify-center" style={{ minHeight: isMobile ? 'auto' : '60vh' }}>
      <div
        className="relative overflow-hidden"
        style={{
          width: `${baseWidth + progress * (100 - baseWidth)}%`,
          maxWidth: progress > 0.95 ? '100vw' : '1400px',
          transform: `scale(${scale})`,
          transition: 'transform 0.12s ease-out, width 0.12s ease-out, border-radius 0.12s ease-out',
          borderRadius: `${radius}px`,
          boxShadow: progress > 0.9
            ? '0 0 0 rgba(0,0,0,0)'
            : `0 ${20 + scale * 30}px ${40 + scale * 60}px rgba(6,182,212,${0.05 + scale * 0.15}), 0 ${10 + scale * 20}px ${30 + scale * 40}px rgba(0,0,0,${0.1 + scale * 0.2})`,
          border: progress > 0.9 ? 'none' : '1px solid rgba(6,182,212,0.15)',
        }}
      >
        <video autoPlay muted loop playsInline src={src} className="w-full block" />
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(to top, rgba(15,23,42,${0.15 * (1 - progress)}) 0%, transparent 20%, transparent 80%, rgba(15,23,42,${0.08 * (1 - progress)}) 100%)`,
          }} />
      </div>
    </div>
  )
}

/* --------------------------------------------------------------------------
   SCROLL-GROW IPHONE COMPONENT
   -------------------------------------------------------------------------- */
function ScrollGrowIphone({ src }: { src: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const [iphoneScreen, setIphoneScreen] = useState(0) // 0-4 arasi ekran gecisi

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onScroll = () => {
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight
      const p = Math.max(0, Math.min(1, 1 - rect.top / (vh * 0.8)))
      setProgress(p)
      // iPhone ekran gecisi: her %20'de yeni ekran
      setIphoneScreen(Math.min(4, Math.floor(p * 5)))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Video: scroll ile buyur, hover glow artar
  const videoScale = 0.85 + progress * 0.15 // 0.85 -> 1.0
  const videoOpacity = 0.6 + progress * 0.4  // 0.6 -> 1.0
  const glowIntensity = progress * 0.35       // 0 -> 0.35

  // iPhone ekran içerikleri
  const screens = [
    // 0: Splash
    { bg: 'linear-gradient(160deg, #0a1628 0%, #0f2b3d 40%, #134e5e 100%)', content: 'splash' },
    // 1: Gorevler
    { bg: 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)', content: 'tasks' },
    // 2: Dashboard
    { bg: 'linear-gradient(160deg, #0f172a 0%, #1a2e3b 100%)', content: 'dashboard' },
    // 3: Mesajlar
    { bg: 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)', content: 'messages' },
    // 4: Profil
    { bg: 'linear-gradient(160deg, #0a1628 0%, #134e5e 100%)', content: 'profile' },
  ]

  const currentScreen = screens[iphoneScreen] || screens[0]

  const renderIphoneContent = () => {
    switch (currentScreen.content) {
      case 'splash':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px' }}>
            {/* ActLedger kurumsal sembol - BrandMark SVG */}
            <div style={{ animation: 'pulse 2.5s ease-in-out infinite', filter: 'drop-shadow(0 8px 32px rgba(6,182,212,0.5))' }}>
              <svg viewBox="0 0 48 48" width={64} height={64} fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M 7 38 L 19 8 L 24 22" stroke="#ffffff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 19 8 L 31 38 L 41 28" stroke="#22d3ee" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 13.5 26 L 26 26" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" opacity="0.9" />
                <circle cx="42" cy="14" r="3.2" fill="#22d3ee" />
              </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '22px', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
                <span>Act</span><span style={{ color: '#22d3ee' }}>Ledger</span>
              </p>
              <p style={{ fontSize: '12px', fontWeight: 700, color: '#22d3ee', letterSpacing: '4px', textTransform: 'uppercase', marginTop: '4px' }}>Mobile</p>
            </div>
            <p style={{ fontSize: '8px', color: 'rgba(148,163,184,0.5)', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '8px' }}>{'Operasyonel M\u00fckemmellik'}</p>
          </div>
        )
      case 'tasks':
        return (
          <div style={{ padding: '32px 14px 14px', height: '100%' }}>
            <p style={{ fontSize: '13px', fontWeight: 800, color: '#fff', marginBottom: '10px' }}>Gorevlerim</p>
            {['Uretim hatti kontrol', 'Bakim raporu yaz', 'Stok sayimi'].map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', marginBottom: '6px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: i === 0 ? '#f59e0b' : i === 1 ? '#06b6d4' : '#10b981' }} />
                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{t}</span>
              </div>
            ))}
            <div style={{ marginTop: '12px', padding: '10px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(20,184,166,0.1))', border: '1px solid rgba(6,182,212,0.2)' }}>
              <p style={{ fontSize: '8px', color: '#22d3ee', fontWeight: 700, marginBottom: '4px' }}>OperIQ Onerisi</p>
              <p style={{ fontSize: '7px', color: 'rgba(148,163,184,0.7)', lineHeight: 1.4 }}>Bakim raporu gecikmeye yakin. Oncelik arttirilmali.</p>
            </div>
          </div>
        )
      case 'dashboard':
        return (
          <div style={{ padding: '32px 14px 14px', height: '100%' }}>
            <p style={{ fontSize: '13px', fontWeight: 800, color: '#fff', marginBottom: '10px' }}>Kokpit</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '10px' }}>
              {[{ v: '24', l: 'Aktif Gorev', c: '#06b6d4' }, { v: '%87', l: 'Verimlilik', c: '#10b981' }, { v: '3', l: 'Uyari', c: '#f59e0b' }, { v: '156', l: 'Personel', c: '#8b5cf6' }].map((d, i) => (
                <div key={i} style={{ padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                  <p style={{ fontSize: '14px', fontWeight: 800, color: d.c }}>{d.v}</p>
                  <p style={{ fontSize: '6px', color: 'rgba(148,163,184,0.6)', fontWeight: 600, marginTop: '2px' }}>{d.l}</p>
                </div>
              ))}
            </div>
            <div style={{ height: '40px', borderRadius: '8px', background: 'linear-gradient(90deg, rgba(6,182,212,0.2), rgba(16,185,129,0.15))', display: 'flex', alignItems: 'flex-end', padding: '0 4px 4px', gap: '3px' }}>
              {[40, 65, 50, 80, 70, 90, 55, 75].map((h, i) => (
                <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: '3px 3px 0 0', background: `linear-gradient(180deg, #06b6d4, rgba(6,182,212,0.3))`, opacity: 0.7 + i * 0.03 }} />
              ))}
            </div>
          </div>
        )
      case 'messages':
        return (
          <div style={{ padding: '32px 14px 14px', height: '100%' }}>
            <p style={{ fontSize: '13px', fontWeight: 800, color: '#fff', marginBottom: '10px' }}>Mesajlar</p>
            {['Ahmet Y. - Bakim tamamlandi', 'Sistem - Stok uyarisi', 'Elif K. - Rapor hazirlandi'].map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', marginBottom: '6px', borderRadius: '10px', background: i === 0 ? 'rgba(6,182,212,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${i === 0 ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.06)'}` }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: i === 0 ? 'linear-gradient(135deg, #06b6d4, #0891b2)' : i === 1 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: '#fff', fontSize: '7px', fontWeight: 800 }}>{m[0]}</span>
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.8)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m}</p>
                  <p style={{ fontSize: '6px', color: 'rgba(148,163,184,0.5)', marginTop: '1px' }}>{i === 0 ? '2 dk once' : i === 1 ? '15 dk once' : '1 saat once'}</p>
                </div>
                {i === 0 && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#06b6d4', flexShrink: 0 }} />}
              </div>
            ))}
          </div>
        )
      case 'profile':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '10px', padding: '32px 14px 14px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(6,182,212,0.3)' }}>
              <span style={{ color: '#fff', fontSize: '16px', fontWeight: 800 }}>SG</span>
            </div>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>Saha Gorevlisi</p>
            <p style={{ fontSize: '8px', color: 'rgba(148,163,184,0.6)' }}>Uretim Departmani</p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              {[{ v: '12', l: 'Gorev' }, { v: '98%', l: 'Basari' }, { v: '4.8', l: 'Puan' }].map((s, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '13px', fontWeight: 800, color: '#22d3ee' }}>{s.v}</p>
                  <p style={{ fontSize: '6px', color: 'rgba(148,163,184,0.5)' }}>{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div ref={ref} className="w-full" style={{ minHeight: '100vh', padding: '0 24px' }}>
      <div className="flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-20" style={{ minHeight: '90vh' }}>
        {/* iPhone - animated screen transitions */}
        <div className="flex-shrink-0" style={{ transform: `translateY(${(1 - progress) * 30}px)`, opacity: 0.7 + progress * 0.3, transition: 'transform 0.3s ease-out, opacity 0.3s ease-out' }}>
          <div className="iphone-frame" style={{ transformOrigin: 'center center' }}>
            <div className="iphone-dynamic-island" />
            <div className="iphone-action-btn" />
            <div className="iphone-side-btn" />
            <div className="iphone-vol-up" />
            <div className="iphone-vol-down" />
            <div className="iphone-screen" style={{ overflow: 'hidden' }}>
              {/* Screen transition wrapper */}
              <div style={{
                width: '100%',
                height: '100%',
                background: currentScreen.bg,
                transition: 'background 0.6s ease-in-out',
                position: 'relative',
              }}>
                {/* iOS-style page transition animation */}
                <div key={iphoneScreen} style={{
                  position: 'absolute',
                  inset: 0,
                  animation: 'iphoneSlideIn 0.5s ease-out',
                }}>
                  {renderIphoneContent()}
                </div>
              </div>
            </div>
            <div className="iphone-home-bar" />
          </div>
        </div>

        {/* Video - iPhone ile ayni yukseklikte, hover/scroll efektleri */}
        <div
          className="flex-1 w-full"
          style={{
            maxWidth: '860px',
            aspectRatio: '16/9',
            transform: `scale(${videoScale}) translateY(${(1 - progress) * 20}px)`,
            opacity: videoOpacity,
            transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
          }}
        >
          <div
            className="group relative h-full"
            style={{
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: `0 30px 80px rgba(0,0,0,0.5), 0 0 ${60 + glowIntensity * 100}px rgba(6,182,212,${glowIntensity})`,
              border: '1px solid rgba(6,182,212,0.25)',
              transition: 'box-shadow 0.5s ease-out',
            }}
          >
            {/* Hover glow overlay */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-10"
              style={{ background: 'radial-gradient(circle at 50% 50%, rgba(6,182,212,0.08) 0%, transparent 70%)' }} />
            {/* Top shine on hover */}
            <div className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.5), transparent)' }} />
            <video
              autoPlay
              muted
              loop
              playsInline
              src={src}
              className="group-hover:scale-[1.02] transition-transform duration-700 ease-out"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            {/* Bottom gradient fade */}
            <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
              style={{ background: 'linear-gradient(transparent, rgba(10,22,40,0.6))' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

/* --------------------------------------------------------------------------
   REVEAL ON SCROLL
   -------------------------------------------------------------------------- */
function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect() }
    }, { threshold: 0.12 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`transition-all duration-[900ms] ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

/* --------------------------------------------------------------------------
   ANIMATED COUNTER
   -------------------------------------------------------------------------- */
function Counter({ to, suffix = '', duration = 800 }: { to: number; suffix?: string; duration?: number }) {
  const [n, setN] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true
        const start = performance.now()
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration)
          const eased = 1 - Math.pow(1 - t, 3)
          setN(Math.round(to * eased))
          if (t < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }
    }, { threshold: 0.3 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [to, duration])

  return <span ref={ref}>{n.toLocaleString()}{suffix}</span>
}

/* --------------------------------------------------------------------------
   DASHBOARD MOCKUP (hero right side)
   -------------------------------------------------------------------------- */
function DashboardMockup() {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 2400)
    return () => clearInterval(id)
  }, [])

  const bars = [62, 84, 71, 95, 58, 78, 88, 65, 92]
  const offset = (tick * 3) % bars.length
  const animatedBars = [...bars.slice(offset), ...bars.slice(0, offset)]

  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* Glow background */}
      <div className="absolute inset-0 -z-10 blur-3xl opacity-40">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full" style={{ background: 'rgba(6,182,212,0.4)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full" style={{ background: 'rgba(20,184,166,0.3)' }} />
      </div>

      {/* Main card */}
      <div
        className="relative rounded-2xl border p-6 transform hover:scale-[1.02] transition-all duration-700"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(240,250,250,0.98))',
          borderColor: 'rgba(6,182,212,0.25)',
          boxShadow: '0 30px 80px -20px rgba(6,182,212,0.15), 0 4px 20px rgba(0,0,0,0.06)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b" style={{ borderColor: 'rgba(6,182,212,0.15)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #06b6d4, #14b8a6)' }}>
              <Activity size={14} className="text-white" />
            </div>
            <div>
              <p className="text-base font-bold" style={{ color: '#0f2b3d' }}>Operations Cockpit</p>
              <p className="text-[15px]" style={{ color: 'rgba(6,182,212,0.7)' }}>Manufacturing Sector</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md" style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#22d3ee' }} />
            <span className="text-[15px] font-bold" style={{ color: '#22d3ee' }}>LIVE</span>
          </div>
        </div>

        {/* Mini stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "Active KPI's", value: '248', color: '#22d3ee' },
            { label: 'Completed', value: '186', color: '#14b8a6' },
            { label: 'Alerts', value: '12', color: '#f43f5e' },
          ].map(k => (
            <div key={k.label} className="rounded-lg p-3" style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)' }}>
              <p className="text-[14px] font-bold tracking-wider" style={{ color: 'rgba(15,43,61,0.55)' }}>{k.label}</p>
              <p className="text-2xl font-extrabold leading-none mt-1" style={{ color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Chart bars */}
        <div className="mb-4">
          <div className="flex items-end gap-1.5 h-24">
            {animatedBars.slice(0, 7).map((h, i) => (
              <div
                key={`${tick}-${i}`}
                className="flex-1 rounded-t transition-all duration-700 ease-out"
                style={{
                  height: `${h}%`,
                  background: `linear-gradient(to top, #0891b2, #22d3ee)`,
                  opacity: 0.8 + (i * 0.03),
                }}
              />
            ))}
          </div>
        </div>

        {/* AI insight */}
        <div className="rounded-lg p-3" style={{ background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.2)' }}>
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(20,184,166,0.2)' }}>
              <Zap size={10} style={{ color: '#14b8a6' }} />
            </div>
            <div>
              <p className="text-[14px] font-bold tracking-wider" style={{ color: '#14b8a6' }}>OperIQ Insights</p>
              <p className="text-[17px] mt-0.5 leading-snug" style={{ color: 'rgba(15,43,61,0.7)' }}>
                Line 2 spare capacity redirected to Line 1 increases daily output by 18%.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating card top-right */}
      <div
        className="absolute -top-4 -right-4 rounded-xl px-4 py-3 flex items-center gap-2"
        style={{
          background: 'rgba(10,22,40,0.95)',
          border: '1px solid rgba(6,182,212,0.3)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          animation: 'floatUp 3s ease-in-out infinite',
        }}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.15)' }}>
          <Activity size={14} style={{ color: '#22d3ee' }} />
        </div>
        <div>
          <p className="text-[14px] font-bold" style={{ color: '#ffffff' }}>Efficiency</p>
          <p className="text-lg font-extrabold leading-none" style={{ color: '#22d3ee' }}>+12.4%</p>
        </div>
      </div>

      {/* Floating card bottom-left */}
      <div
        className="absolute -bottom-4 -left-4 rounded-xl px-4 py-3 flex items-center gap-2"
        style={{
          background: 'rgba(10,22,40,0.95)',
          border: '1px solid rgba(20,184,166,0.3)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          animation: 'floatUp 3s ease-in-out infinite 1.5s',
        }}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(20,184,166,0.15)' }}>
          <BarChart3 size={14} style={{ color: '#14b8a6' }} />
        </div>
        <div>
          <p className="text-[14px] font-bold" style={{ color: '#ffffff' }}>KPI's Active</p>
          <p className="text-lg font-extrabold leading-none" style={{ color: '#14b8a6' }}>576+</p>
        </div>
      </div>
    </div>
  )
}

/* --------------------------------------------------------------------------
   ANIMATED GANTT CHART SVG
   -------------------------------------------------------------------------- */
function AnimatedGantt() {
  const tasks = [
    { label: 'Foundation', w: 110, color: '#6366f1', start: 5 },
    { label: 'Structural', w: 80, color: '#8b5cf6', start: 40 },
    { label: 'MEP Systems', w: 140, color: '#0d9488', start: 20 },
    { label: 'Quality Check', w: 55, color: '#06b6d4', start: 100 },
    { label: 'Interior', w: 95, color: '#14b8a6', start: 60 },
    { label: 'Commissioning', w: 70, color: '#6366f1', start: 90 },
    { label: 'Handover', w: 45, color: '#8b5cf6', start: 130 },
  ]
  return (
    <svg viewBox="0 0 220 170" fill="none" className="w-full h-full">
      {/* Grid lines */}
      {[0,1,2,3,4].map(i => (
        <line key={i} x1={45 + i * 44} y1="4" x2={45 + i * 44} y2="165" stroke="rgba(100,116,139,0.12)" strokeWidth="0.5" strokeDasharray="3 3" />
      ))}
      {/* Header */}
      {['W1','W2','W3','W4','W5'].map((w, i) => (
        <text key={i} x={45 + i * 44} y="12" textAnchor="middle" fill="rgba(15,43,61,0.35)" fontSize="7" fontWeight="600">{w}</text>
      ))}
      {/* Task bars */}
      {tasks.map((task, i) => (
        <g key={i}>
          <text x="3" y={30 + i * 20} fill="rgba(15,43,61,0.5)" fontSize="6.5" fontWeight="600" dominantBaseline="middle">{task.label}</text>
          <rect x={task.start * 0.9 + 10} y={24 + i * 20} width={task.w * 0.9} height="11" rx="3" fill={task.color} opacity="0.85">
            <animate attributeName="width" from="0" to={task.w * 0.9} dur="1s" begin={`${i * 0.12}s`} fill="freeze" />
            <animate attributeName="opacity" from="0" to="0.85" dur="0.6s" begin={`${i * 0.12}s`} fill="freeze" />
          </rect>
          {/* Progress indicator */}
          <rect x={task.start * 0.9 + 10} y={24 + i * 20} width={task.w * 0.9 * (0.5 + Math.random() * 0.4)} height="11" rx="3" fill={task.color} opacity="0.35">
            <animate attributeName="width" from="0" to={task.w * 0.9 * (0.5 + i * 0.07)} dur="1.2s" begin={`${i * 0.12 + 0.3}s`} fill="freeze" />
          </rect>
        </g>
      ))}
      {/* Today marker */}
      <line x1="120" y1="16" x2="120" y2="165" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.6">
        <animate attributeName="opacity" from="0" to="0.6" dur="0.8s" begin="1s" fill="freeze" />
      </line>
      <text x="120" y="170" textAnchor="middle" fill="#ef4444" fontSize="6" fontWeight="700" opacity="0.7">TODAY</text>
    </svg>
  )
}

/* --------------------------------------------------------------------------
   ANIMATED DONUT CHART SVG
   -------------------------------------------------------------------------- */
function AnimatedDonut() {
  const r = 44
  const c = 2 * Math.PI * r
  const segments = [
    { pct: 0.38, color: '#6366f1', offset: 0, label: 'Completed' },
    { pct: 0.25, color: '#0d9488', offset: 0.38, label: 'In Progress' },
    { pct: 0.22, color: '#8b5cf6', offset: 0.63, label: 'Pending' },
    { pct: 0.15, color: '#f59e0b', offset: 0.85, label: 'Overdue' },
  ]

  return (
    <svg viewBox="0 0 160 160" fill="none" className="w-full h-full">
      {/* Background ring */}
      <circle cx="80" cy="80" r={r} stroke="rgba(200,200,220,0.12)" strokeWidth="18" fill="none" />
      {/* Segments */}
      {segments.map((seg, i) => (
        <circle
          key={i}
          cx="80"
          cy="80"
          r={r}
          stroke={seg.color}
          strokeWidth="18"
          fill="none"
          strokeDasharray={`${seg.pct * c} ${c}`}
          strokeDashoffset={-seg.offset * c}
          strokeLinecap="round"
          transform="rotate(-90 80 80)"
          opacity="0.9"
        >
          <animate attributeName="stroke-dasharray" from={`0 ${c}`} to={`${seg.pct * c} ${c}`} dur="1.2s" begin={`${i * 0.2}s`} fill="freeze" />
          <animate attributeName="opacity" from="0" to="0.9" dur="0.6s" begin={`${i * 0.2}s`} fill="freeze" />
        </circle>
      ))}
      {/* Center text */}
      <text x="80" y="72" textAnchor="middle" fill="#0f2b3d" fontSize="18" fontWeight="800">92%</text>
      <text x="80" y="90" textAnchor="middle" fill="rgba(15,43,61,0.45)" fontSize="6.8" fontWeight="600">Task Completion</text>
      {/* Legend */}
      {segments.map((seg, i) => (
        <g key={i}>
          <circle cx={30 + i * 32} cy="148" r="3" fill={seg.color} />
          <text x={30 + i * 32} y="156" textAnchor="middle" fill="rgba(15,43,61,0.4)" fontSize="5">{Math.round(seg.pct * 100)}%</text>
        </g>
      ))}
    </svg>
  )
}

/* --------------------------------------------------------------------------
   OPERIQ SYMBOL - 2 squares in center, 2 bars on each side
   -------------------------------------------------------------------------- */
function OperIQSymbol({ size = 28, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Left bars */}
      <rect x="2" y="10" width="5" height="3" rx="1" fill={color} opacity="0.9" />
      <rect x="2" y="19" width="5" height="3" rx="1" fill={color} opacity="0.9" />
      {/* Right bars */}
      <rect x="25" y="10" width="5" height="3" rx="1" fill={color} opacity="0.9" />
      <rect x="25" y="19" width="5" height="3" rx="1" fill={color} opacity="0.9" />
      {/* Top bars */}
      <rect x="10" y="2" width="3" height="5" rx="1" fill={color} opacity="0.9" />
      <rect x="19" y="2" width="3" height="5" rx="1" fill={color} opacity="0.9" />
      {/* Bottom bars */}
      <rect x="10" y="25" width="3" height="5" rx="1" fill={color} opacity="0.9" />
      <rect x="19" y="25" width="3" height="5" rx="1" fill={color} opacity="0.9" />
      {/* Outer square */}
      <rect x="8" y="8" width="16" height="16" rx="3" stroke={color} strokeWidth="2" fill="none" opacity="0.85" />
      {/* Inner square */}
      <rect x="12" y="12" width="8" height="8" rx="1.5" fill={color} opacity="0.7" />
    </svg>
  )
}

/* --------------------------------------------------------------------------
   OPERIQ LANDING CHATBOT (draggable, branded)
   -------------------------------------------------------------------------- */
const CHAT_GREETINGS = {
  tr: 'Merhaba! Ben OperIQ Asistan. ActLedger hakkinda size nasil yardimci olabilirim? Platform özellikleri, sektorler, fiyatlandirma veya demo hakkinda sorularinizi yanitlayabilirim.',
  en: 'Hello! I am OperIQ Assistant. How can I help you with ActLedger? I can answer questions about platform features, sectors, pricing, or demos.',
}

function OperIQChatbot({ lang }: { lang: 'tr' | 'en' }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<{ role: 'assistant' | 'user'; text: string }[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Drag state
  const [posX, setPosX] = useState<number | null>(null) // null = default right:24px
  const dragRef = useRef<{ dragging: boolean; startX: number; startPosX: number }>({ dragging: false, startX: 0, startPosX: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Get effective X position (from right edge)
  const effectiveRight = posX !== null ? posX : 24

  // Mouse drag handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragRef.current = { dragging: true, startX: e.clientX, startPosX: effectiveRight }
    const onMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current.dragging) return
      const dx = ev.clientX - dragRef.current.startX
      const newRight = Math.max(0, Math.min(window.innerWidth - 100, dragRef.current.startPosX - dx))
      setPosX(newRight)
    }
    const onMouseUp = () => {
      dragRef.current.dragging = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [effectiveRight])

  // Show greeting when first opened
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: 'assistant', text: CHAT_GREETINGS[lang] }])
    }
  }, [open, lang])

  // Update greeting language when lang changes - reset conversation
  useEffect(() => {
    setMessages([{ role: 'assistant', text: CHAT_GREETINGS[lang] }])
  }, [lang])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300)
  }, [open])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const userMsg = { role: 'user' as const, text }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/landing-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          lang,
          history: [...messages, userMsg].slice(-6).map(m => ({ role: m.role, text: m.text })),
        }),
      })
      const data = await res.json()
      if (data.success && data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', text: data.reply }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: lang === 'tr' ? 'Bir hata olustu. Lutfen tekrar deneyin.' : 'An error occurred. Please try again.' }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: lang === 'tr' ? 'Baglanti hatasi. Lutfen tekrar deneyin.' : 'Connection error. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={containerRef} className="fixed z-[55]" style={{ bottom: '24px', right: `${effectiveRight}px` }}>
      {/* OperIQ label + drag handle above button */}
      <div
        className="flex flex-col items-center mb-3 select-none cursor-grab active:cursor-grabbing"
        onMouseDown={onMouseDown}
      >
        <span
          className="text-sm font-extrabold tracking-[0.12em] px-4 py-1.5 rounded-full relative"
          style={{
            color: '#22d3ee',
            background: 'rgba(6,182,212,0.12)',
            border: '1px solid rgba(6,182,212,0.3)',
            textShadow: '0 0 16px rgba(6,182,212,0.6)',
            backdropFilter: 'blur(8px)',
            zIndex: 2,
          }}
        >
          {/* Gold fog around badge */}
          <span className="absolute inset-0 rounded-full" style={{
            boxShadow: '0 0 25px rgba(234,179,8,0.35), 0 0 50px rgba(234,179,8,0.15), 0 0 80px rgba(234,179,8,0.08)',
            animation: 'operiqGlow 2s ease-in-out infinite',
            zIndex: -1,
          }} />
          OperIQ Asistan
        </span>
      </div>

      {/* Floating button with OperIQ symbol */}
      <div className="relative flex items-center justify-center" style={{ margin: '0 auto', width: '56px', height: '56px' }}>
        {/* Gold heartbeat wave 1 */}
        <div
          className="absolute rounded-full hidden md:block"
          style={{
            inset: '-20px',
            background: 'radial-gradient(circle, rgba(234,179,8,0.15) 0%, rgba(234,179,8,0) 70%)',
            animation: 'operiqHeartbeat 2s ease-in-out infinite',
          }}
        />
        {/* Gold heartbeat wave 2 */}
        <div
          className="absolute rounded-full hidden md:block"
          style={{
            inset: '-35px',
            background: 'radial-gradient(circle, rgba(234,179,8,0.08) 0%, rgba(234,179,8,0) 70%)',
            animation: 'operiqHeartbeat 2s ease-in-out infinite 0.5s',
          }}
        />
        {/* Gold heartbeat wave 3 - fog effect */}
        <div
          className="absolute rounded-full hidden md:block"
          style={{
            inset: '-55px',
            background: 'radial-gradient(circle, rgba(251,191,36,0.06) 0%, transparent 60%)',
            animation: 'operiqFog 3s ease-in-out infinite',
            filter: 'blur(8px)',
          }}
        />
        {/* Gold pulsing ring */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            boxShadow: '0 0 20px rgba(234,179,8,0.4), 0 0 40px rgba(234,179,8,0.2), 0 0 60px rgba(234,179,8,0.1)',
            animation: 'operiqGlow 2s ease-in-out infinite',
          }}
        />
        {/* Outer ring */}
        <div
          className="absolute rounded-full"
          style={{
            inset: '-4px',
            border: '2px solid rgba(234,179,8,0.4)',
            borderRadius: '50%',
            animation: 'operiqHeartbeat 2s ease-in-out infinite',
          }}
        />
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="relative flex items-center justify-center transition-all duration-500 hover:scale-110"
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #06b6d4, #0891b2, #0e7490)',
            boxShadow: '0 8px 40px rgba(6,182,212,0.4), 0 0 40px rgba(234,179,8,0.2), 0 0 80px rgba(234,179,8,0.1), inset 0 1px 0 rgba(255,255,255,0.2)',
          }}
        >
          {open ? (
            <X size={28} className="text-white" />
          ) : (
            <OperIQSymbol size={32} color="#ffffff" />
          )}
        </button>
      </div>

      {/* Chat panel */}
      <div
        className="flex flex-col transition-all duration-500"
        style={{
          position: 'absolute',
          bottom: '120px',
          right: '0px',
          width: '380px',
          maxHeight: '520px',
          borderRadius: '20px',
          background: 'linear-gradient(180deg, #0f172a 0%, #1a2e3b 100%)',
          border: '1px solid rgba(6,182,212,0.3)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 0 60px rgba(6,182,212,0.15)',
          opacity: open ? 1 : 0,
          transform: open ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.9)',
          pointerEvents: open ? 'auto' : 'none',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid rgba(6,182,212,0.2)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #06b6d4, #14b8a6)' }}>
            <OperIQSymbol size={20} color="#ffffff" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: '#22d3ee' }}>OperIQ {lang === 'tr' ? 'Asistan' : 'Assistant'}</p>
            <p className="text-[10px]" style={{ color: 'rgba(148,163,184,0.5)' }}>ATAOL AI Techs tarafindan gelistirilmistir.</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="p-1.5 rounded-lg transition-all hover:bg-white/10">
            <X size={16} style={{ color: '#94a3b8' }} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ maxHeight: '360px', minHeight: '200px' }}>
          {messages.map((msg, i) => (
            <div
              key={i}
              className="flex"
              style={{
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                animation: 'tableSlideIn 0.3s ease forwards',
              }}
            >
              <div
                className="max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed"
                style={{
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, #06b6d4, #0891b2)'
                    : 'rgba(255,255,255,0.08)',
                  color: msg.role === 'user' ? '#fff' : '#e2e8f0',
                  border: msg.role === 'user' ? 'none' : '1px solid rgba(6,182,212,0.15)',
                  borderBottomRightRadius: msg.role === 'user' ? '6px' : '16px',
                  borderBottomLeftRadius: msg.role === 'user' ? '16px' : '6px',
                }}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(6,182,212,0.15)' }}>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#22d3ee', animationDelay: '0s' }} />
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#22d3ee', animationDelay: '0.2s' }} />
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#22d3ee', animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 pb-4 pt-2" style={{ borderTop: '1px solid rgba(6,182,212,0.15)' }}>
          <div className="flex items-end gap-2 rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(6,182,212,0.2)' }}>
            <textarea
              ref={inputRef as any}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder={lang === 'tr' ? '\u00d6rne\u011fin: ATAOL AI Techs ad\u0131nda, 200 ki\u015finin \u00e7al\u0131\u015ft\u0131\u011f\u0131, 10 departman\u0131 olan bir yapay zek\u00e2 firmas\u0131y\u0131z. Bize hangi kapsamda, nas\u0131l bir destek sa\u011flayabilirsiniz?' : 'For example: We are an AI company called ATAOL AI Techs with 200 employees and 10 departments. In what scope and how can you support us?'}
              className="flex-1 bg-transparent outline-none text-sm resize-none"
              style={{ color: '#e2e8f0', minHeight: '60px', maxHeight: '80px' }}
              rows={3}
              maxLength={500}
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="p-2 rounded-lg transition-all duration-200 hover:scale-110 disabled:opacity-30 flex-shrink-0 mb-1"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}
            >
              <Send size={14} className="text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* --------------------------------------------------------------------------
   MAIN LANDING COMPONENT
   -------------------------------------------------------------------------- */
export default function Landing() {
  const navigate = useNavigate()
  const { user, login } = useAuth()
  const [lang, setLang] = useState<'tr' | 'en'>('tr')
  const [scrolled, setScrolled] = useState(false)
  const [cookieConsent, setCookieConsent] = useState<boolean | null>(() => {
    const stored = localStorage.getItem('actledger_cookies')
    return stored !== null ? stored === 'true' : null
  })

  const t = T[lang]

  useEffect(() => {
    if (user) navigate(user.role === 'super_admin' ? '/super-admin' : '/panel', { replace: true })
  }, [user, navigate])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const [optionalCookies, setOptionalCookies] = useState(true)

  const handleCookie = useCallback((accepted: boolean, optionalAccepted = true) => {
    localStorage.setItem('actledger_cookies', String(accepted))
    if (accepted) localStorage.setItem('actledger_cookies_optional', String(optionalAccepted))
    setCookieConsent(accepted)
  }, [])

  // Login modal state
  const [loginOpen, setLoginOpen] = useState(false)
  const [loginEmail, setLoginEmail] = useState(() => localStorage.getItem('actledger_remember_email') ?? '')
  const [loginPass, setLoginPass] = useState('')
  const [loginShowPass, setLoginShowPass] = useState(false)
  const [loginRemember, setLoginRemember] = useState(() => !!localStorage.getItem('actledger_remember_email'))
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [login2fa, setLogin2fa] = useState(false)
  const [login2faCode, setLogin2faCode] = useState('')
  const [login2faSent, setLogin2faSent] = useState(false)

  // Contact form state
  const [contactOpen, setContactOpen] = useState(false)
  const [contactForm, setContactForm] = useState({ name: '', email: '', company: '', sector: '', interest: '', message: '' })
  const [contactLoading, setContactLoading] = useState(false)
  const [contactResult, setContactResult] = useState<'success' | 'error' | null>(null)

  const handleContact = async () => {
    if (!contactForm.name || !contactForm.email) return
    setContactLoading(true)
    setContactResult(null)
    try {
      const res = await fetch(`${API_BASE}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      })
      if (res.ok) {
        setContactResult('success')
        setContactForm({ name: '', email: '', company: '', sector: '', interest: '', message: '' })
      } else {
        setContactResult('error')
      }
    } catch {
      setContactResult('error')
    } finally {
      setContactLoading(false)
    }
  }

  const handleLogin = async () => {
    if (!loginEmail || !loginPass) { setLoginError(lang === 'tr' ? 'E-posta ve sifre zorunludur' : 'Email and password are required'); return }
    setLoginLoading(true); setLoginError(null)
    try {
      // 2FA flow: first login attempt triggers code send
      if (login2fa && !login2faSent) {
        // Simulate sending 2FA code via email
        setLogin2faSent(true)
        setLoginLoading(false)
        return
      }
      if (loginRemember) localStorage.setItem('actledger_remember_email', loginEmail)
      else localStorage.removeItem('actledger_remember_email')
      const u = await login(loginEmail, loginPass)
      setLoginOpen(false)
      navigate(u?.role === 'super_admin' ? '/super-admin' : u?.role === 'platform_admin' ? '/admin' : '/panel')
    } catch (e: any) {
      setLoginError(e.message ?? (lang === 'tr' ? 'Giris basarisiz' : 'Login failed'))
    } finally { setLoginLoading(false) }
  }

  /* All 14 images for scrolling banners */
  const allImages = [
    '/images/factory.PNG', '/images/team.PNG', '/images/warehouse.PNG',
    '/images/hospital.PNG', '/images/construction.PNG', '/images/HoReCa.PNG',
    '/images/fmcg.PNG', '/images/retail.PNG', '/images/public_sector.PNG',
    '/images/energy.PNG', '/images/finance.PNG', '/images/information_technolgy.PNG',
    '/images/media.PNG', '/images/transportation.PNG',
  ]

  return (
    <div className="min-h-screen antialiased relative overflow-x-auto overflow-y-hidden" style={{ background: 'linear-gradient(180deg, #f0fafa 0%, #e8f5f0 20%, #f5f0e8 40%, #edf7f7 60%, #f8f4ec 80%, #e6f3f0 100%)', color: '#1a2e3b' }}>

      {/* -- CSS Animations ------------------------------------------------ */}
      <style>{`
        @keyframes floatUp {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes gridPulse {
          0%, 100% { opacity: 0.06; }
          50% { opacity: 0.1; }
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes iphoneSlideIn {
          0% { opacity: 0; transform: translateX(40px) scale(0.95); }
          100% { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes pulsingBorder {
          0%, 100% { border-color: rgba(6,182,212,0.4); box-shadow: 0 0 20px rgba(6,182,212,0.15); }
          50% { border-color: rgba(6,182,212,0.7); box-shadow: 0 0 40px rgba(6,182,212,0.25); }
        }
        @keyframes operiqHeartbeat {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          25% { transform: scale(1.15); opacity: 1; }
          40% { transform: scale(1.05); opacity: 0.8; }
          55% { transform: scale(1.12); opacity: 0.9; }
          70% { transform: scale(1); opacity: 0.6; }
        }
        @keyframes operiqFog {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.2); }
        }
        @keyframes operiqGlow {
          0%, 100% { box-shadow: 0 0 15px rgba(234,179,8,0.3), 0 0 30px rgba(234,179,8,0.15); }
          30% { box-shadow: 0 0 25px rgba(234,179,8,0.5), 0 0 50px rgba(234,179,8,0.25), 0 0 80px rgba(234,179,8,0.1); }
          60% { box-shadow: 0 0 18px rgba(234,179,8,0.35), 0 0 35px rgba(234,179,8,0.18); }
        }
        @keyframes testimonialScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes dashDraw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes borderGlow {
          0%, 100% { border-color: rgba(99,102,241,0.2); }
          50% { border-color: rgba(99,102,241,0.5); }
        }
        .animate-float { animation: floatUp 3s ease-in-out infinite; }
        .animate-gradient { animation: gradientShift 4s ease infinite; background-size: 200% 200%; }
        .animate-pulsing-border { animation: pulsingBorder 2.5s ease-in-out infinite; }
        .animate-testimonial-scroll { animation: testimonialScroll 40s linear infinite; }
        .animate-testimonial-scroll:hover { animation-play-state: paused; }
        .guide-card { transition: all 0.4s ease; }
        .guide-card:hover { border-color: rgba(99,102,241,0.4) !important; box-shadow: 0 12px 40px rgba(99,102,241,0.1); transform: translateY(-4px); }

        /* iPhone 17 Pro Max - Cyan Titanium (%20 buyuk) */
        .iphone-frame {
          position: relative;
          width: 281px;
          height: 607px;
          border-radius: 55px;
          background: linear-gradient(160deg, #134e5e 0%, #0c6980 20%, #0e7490 40%, #0891b2 60%, #06b6d4 80%, #22d3ee 100%);
          box-shadow:
            inset 0 0 0 1px rgba(255,255,255,0.3),
            inset 0 0 0 2.5px rgba(8,145,178,0.5),
            0 0 0 0.5px rgba(14,116,144,0.8),
            0 0 0 2px #0c6980,
            0 0 0 3px rgba(6,182,212,0.15),
            0 20px 60px rgba(0,0,0,0.45),
            0 0 80px rgba(6,182,212,0.1);
          padding: 5px;
          overflow: hidden;
          transition: all 0.15s ease-out;
        }
        /* Dynamic Island */
        .iphone-dynamic-island {
          position: absolute;
          top: 14px;
          left: 50%;
          transform: translateX(-50%);
          width: 100px;
          height: 26px;
          background: #000;
          border-radius: 13px;
          z-index: 20;
          box-shadow: 0 0 0 0.5px rgba(255,255,255,0.06);
        }
        .iphone-dynamic-island::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 16px;
          transform: translateY(-50%);
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(34,211,238,0.35) 20%, #0d1117 70%);
          box-shadow: 0 0 3px rgba(34,211,238,0.15);
        }
        .iphone-dynamic-island::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 16px;
          transform: translateY(-50%);
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: radial-gradient(circle, transparent 40%, rgba(255,255,255,0.04) 100%);
        }
        .iphone-screen {
          width: 100%;
          height: 100%;
          border-radius: 50px;
          overflow: hidden;
          position: relative;
          background: #000;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .iphone-screen video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .iphone-home-bar {
          position: absolute;
          bottom: 7px;
          left: 50%;
          transform: translateX(-50%);
          width: 86px;
          height: 3.5px;
          border-radius: 2px;
          background: rgba(255,255,255,0.3);
          z-index: 20;
        }
        /* Action button (top-left) */
        .iphone-action-btn {
          position: absolute;
          left: -2px;
          top: 58px;
          width: 2px;
          height: 22px;
          border-radius: 2px 0 0 2px;
          background: linear-gradient(180deg, #22d3ee, #0891b2);
        }
        /* Power button (right) */
        .iphone-side-btn {
          position: absolute;
          right: -2px;
          top: 105px;
          width: 2px;
          height: 46px;
          border-radius: 0 2px 2px 0;
          background: linear-gradient(180deg, #22d3ee, #0891b2, #0e7490);
        }
        /* Volume up */
        .iphone-vol-up {
          position: absolute;
          left: -2px;
          top: 92px;
          width: 2px;
          height: 30px;
          border-radius: 2px 0 0 2px;
          background: linear-gradient(180deg, #22d3ee, #0891b2);
        }
        /* Volume down */
        .iphone-vol-down {
          position: absolute;
          left: -2px;
          top: 128px;
          width: 2px;
          height: 30px;
          border-radius: 2px 0 0 2px;
          background: linear-gradient(180deg, #22d3ee, #0891b2);
        }

        /* Benchmark table */
        .benchmark-row {
          transition: all 0.3s ease;
        }
        .benchmark-row:hover {
          background: rgba(6,182,212,0.04) !important;
          transform: scale(1.005);
        }
        @keyframes tableSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .benchmark-animate {
          animation: tableSlideIn 0.5s ease forwards;
          opacity: 0;
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(6,182,212,0.1); }
          50% { box-shadow: 0 0 40px rgba(6,182,212,0.2); }
        }
        .glow-pulse { animation: glowPulse 3s ease-in-out infinite; }

        @media (max-width: 768px) {
          .iphone-frame { width: 196px; height: 424px; border-radius: 40px; padding: 4px; }
          .iphone-screen { border-radius: 36px; }
          .iphone-dynamic-island { width: 70px; height: 18px; border-radius: 9px; top: 10px; }
        }
      `}</style>

      {/* -- Soft pattern background --------------------------------------- */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(6,182,212,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.06) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
          animation: 'gridPulse 4s ease-in-out infinite',
        }} />
        <div className="absolute top-0 left-1/4 w-[700px] h-[700px] rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.1), transparent 70%)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.08), transparent 70%)' }} />
      </div>

      {/* ================================================================
          1. NAVBAR
          ================================================================ */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          background: scrolled ? 'rgba(5,10,20,0.95)' : 'rgba(5,10,20,0.85)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(6,182,212,0.2)',
        }}
      >
        <div className="w-full px-4 sm:px-6 lg:px-12 py-4 flex items-center justify-between overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="[&>div]:gap-1 lg:[&>div]:gap-2.5"><BrandMark size={36} variant="dark" /></div>
            <span className="hidden xl:block text-[13px] font-bold whitespace-nowrap" style={{ color: '#ffffff' }}>
              ATAOL AI Techs taraf{'\u0131'}ndan geli{'\u015f'}tirildi.
            </span>
          </div>

          <div className="hidden md:flex items-center gap-4 lg:gap-6 xl:gap-8 text-base lg:text-lg font-bold flex-nowrap whitespace-nowrap" style={{ color: '#ffffff' }}>
            <a href="#platform" className="hover:text-cyan-300 transition-colors duration-300">{t.navPlatform}</a>
            <a href="#sectors" className="hover:text-cyan-300 transition-colors duration-300">{t.navSectors}</a>
            <a href="#features" className="hover:text-cyan-300 transition-colors duration-300">{t.navFeatures}</a>
            <button type="button" onClick={() => setContactOpen(true)} className="bg-clip-text text-transparent animate-gradient-text font-bold transition-all duration-300 hover:scale-105"
              style={{ backgroundImage: 'linear-gradient(90deg, #06b6d4, #14b8a6, #a78bfa, #22d3ee, #06b6d4)', backgroundSize: '400% 100%' }}>
              {t.tryFree}
            </button>
            <a href="#insights" className="hover:text-cyan-300 transition-colors duration-300">{t.navInsights}</a>
            <a href="#contact" className="hover:text-cyan-300 transition-colors duration-300">{t.navContact}</a>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
            <div className="flex items-center gap-1 px-1 py-0.5 rounded-lg flex-shrink-0" style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)' }}>
              <button
                type="button"
                onClick={() => setLang('tr')}
                className="flex items-center gap-1 px-2 py-1.5 rounded-md transition-all duration-300"
                style={{
                  background: lang === 'tr' ? 'rgba(6,182,212,0.25)' : 'transparent',
                  boxShadow: lang === 'tr' ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
                }}
              >
                <FlagTR size={20} />
                <span className="text-sm font-bold" style={{ color: lang === 'tr' ? '#22d3ee' : 'rgba(255,255,255,0.4)' }}>TR</span>
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className="flex items-center gap-1 px-2 py-1.5 rounded-md transition-all duration-300"
                style={{
                  background: lang === 'en' ? 'rgba(6,182,212,0.25)' : 'transparent',
                  boxShadow: lang === 'en' ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
                }}
              >
                <FlagUS size={20} />
                <span className="text-sm font-bold" style={{ color: lang === 'en' ? '#22d3ee' : 'rgba(255,255,255,0.4)' }}>EN</span>
              </button>
            </div>
            <Link
              to="/m/giris"
              className="md:hidden flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300 hover:scale-105"
              style={{
                background: 'rgba(6,182,212,0.15)',
                color: '#22d3ee',
                border: '1px solid rgba(6,182,212,0.3)',
              }}
            >
              <Smartphone size={14} /> {t.mobileLogin}
            </Link>
            <button
              type="button"
              onClick={() => setLoginOpen(true)}
              className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                color: '#ffffff',
                boxShadow: '0 4px 20px rgba(6,182,212,0.4)',
              }}
            >
              {t.signIn} <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </nav>

      {/* ================================================================
          2. HERO
          ================================================================ */}
      <section className="relative z-10 w-full min-h-screen flex items-start lg:items-center pt-24 sm:pt-28 lg:pt-20">
        <div className="w-full px-6 lg:px-12 xl:px-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-20 items-center">
            {/* Left: Text */}
            <div>
              <Reveal>
                {/* ActLedger logo with dark background */}
                <div className="inline-flex items-center justify-center mt-8 sm:mt-12 lg:mt-0 mb-5 px-4 py-2.5 rounded-xl" style={{ background: '#0f172a' }}>
                  <BrandMark size={48} />
                </div>
                <h1
                  className="font-extrabold leading-[1.05] tracking-tight"
                  style={{ fontSize: 'clamp(32px, 5vw, 96px)' }}
                >
                  <span style={{ color: '#0f2b3d' }}>{t.heroTitle.split(' ').slice(0, 2).join(' ')}</span>
                  <br />
                  <span
                    style={{
                      background: 'linear-gradient(135deg, #0891b2, #06b6d4, #0d9488)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {t.heroTitle.split(' ').slice(2).join(' ')}
                  </span>
                </h1>
              </Reveal>

              <Reveal delay={200}>
                <p className="text-xl mt-6 leading-relaxed max-w-xl" style={{ color: 'rgba(15,43,61,0.65)', fontSize: '18px' }}>
                  {t.heroSubtitle}
                </p>
              </Reveal>

              <Reveal delay={400}>
                <div className="flex flex-wrap items-center gap-4 mt-10">
                  <button
                    type="button"
                    onClick={() => setContactOpen(true)}
                    className="flex items-center gap-2 px-7 py-4 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-105"
                    style={{
                      background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                      color: '#0f2b3d',
                      boxShadow: '0 10px 40px rgba(6,182,212,0.3)',
                    }}
                  >
                    {t.heroDemo} <ArrowRight size={16} />
                  </button>
                </div>
              </Reveal>
            </div>

            {/* Right: Dashboard mockup + floating chart SVGs */}
            <Reveal delay={300}>
              <div className="relative">
                <DashboardMockup />
                {/* Floating Gantt + Donut stacked - top right */}
                <div
                  className="absolute flex-col gap-3 hidden lg:flex"
                  style={{
                    top: '-60px',
                    right: '-40px',
                    zIndex: 10,
                  }}
                >
                  <div
                    className="rounded-2xl overflow-hidden shadow-2xl animate-float"
                    style={{
                      width: '220px',
                      height: '180px',
                      animationDelay: '0.5s',
                      background: 'rgba(255,255,255,0.95)',
                      border: '2px solid rgba(99,102,241,0.25)',
                      backdropFilter: 'blur(12px)',
                      padding: '12px',
                    }}
                  >
                    <p className="text-[10px] font-bold tracking-wider mb-1" style={{ color: '#6366f1' }}>Timeline</p>
                    <AnimatedGantt />
                  </div>
                  <div
                    className="rounded-2xl overflow-hidden shadow-2xl animate-float"
                    style={{
                      width: '220px',
                      height: '180px',
                      animationDelay: '1.5s',
                      background: 'rgba(255,255,255,0.95)',
                      border: '2px solid rgba(13,148,136,0.25)',
                      backdropFilter: 'blur(12px)',
                      padding: '12px',
                    }}
                  >
                    <p className="text-[10px] font-bold tracking-wider mb-1" style={{ color: '#0d9488' }}>Task Status</p>
                    <AnimatedDonut />
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ================================================================
          3. STATS BAR
          ================================================================ */}
      <section className="relative z-10 w-full py-16" style={{ borderTop: '1px solid rgba(6,182,212,0.1)', borderBottom: '1px solid rgba(6,182,212,0.1)', background: 'rgba(6,182,212,0.02)' }}>
        <div className="w-full px-6 lg:px-12 xl:px-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: 15, suffix: '+', label: t.statSectors },
              { value: 576, suffix: '+', label: t.statDepts },
              { value: 7800, suffix: '+', label: t.statKpis },
              { value: 5, suffix: '', label: t.statLayers },
            ].map((stat, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="text-center">
                  <p className="font-extrabold tracking-tight" style={{ fontSize: '48px', color: '#22d3ee' }}>
                    <Counter to={stat.value} suffix={stat.suffix} />
                  </p>
                  <p className="text-lg font-semibold mt-2" style={{ color: 'rgba(15,43,61,0.55)' }}>{stat.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          3.5 PLATFORM VIDEO - scroll grow effect
          ================================================================ */}
      <section className="relative z-10 w-full py-20 overflow-hidden">
        <div className="w-full px-6 lg:px-12 xl:px-20">
          <Reveal>
            <div className="text-center mb-12">
              <h2 className="font-extrabold tracking-tight" style={{ fontSize: 'clamp(36px, 4.5vw, 56px)', color: '#0f2b3d' }}>
                {t.platformVideoTitle}
              </h2>
              <p className="text-xl mt-4 max-w-2xl mx-auto" style={{ color: 'rgba(15,43,61,0.55)' }}>
                {t.platformVideoSubtitle}
              </p>
            </div>
          </Reveal>
          <ScrollGrowVideo src="/images/Platformu_kesfedin.mov" />
        </div>
      </section>

      {/* ================================================================
          4. PLATFORM OVERVIEW - unique card visuals per card
          ================================================================ */}
      <section id="platform" className="relative z-10 w-full py-24">
        <div className="w-full px-6 lg:px-12 xl:px-20">
          <Reveal>
            <div className="text-center mb-16">
              <h2 className="font-extrabold tracking-tight" style={{ fontSize: 'clamp(42px, 5vw, 60px)', color: '#0f2b3d' }}>
                {t.platformTitle}
              </h2>
              <p className="text-xl mt-4 max-w-2xl mx-auto" style={{ color: 'rgba(15,43,61,0.55)' }}>
                {t.platformSubtitle}
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1: Real-time Operations - INDIGO - timeline visual */}
            <Reveal delay={0}>
              <div
                className="group relative rounded-2xl p-8 transition-all duration-500 hover:-translate-y-2"
                style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#6366f155'; (e.currentTarget as HTMLElement).style.boxShadow = '0 20px 60px rgba(99,102,241,0.12)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.15)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
              >
                <div className="relative h-36 mb-6 rounded-xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(99,102,241,0.04))', border: '1px solid rgba(99,102,241,0.15)' }}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    {/* Timeline / stream visual */}
                    <svg viewBox="0 0 200 80" fill="none" className="w-4/5 h-4/5 opacity-70 group-hover:opacity-90 transition-opacity duration-700">
                      <line x1="20" y1="40" x2="180" y2="40" stroke="#6366f1" strokeWidth="2" strokeDasharray="4 4" opacity="0.3" />
                      {[30, 65, 100, 135, 170].map((cx, idx) => (
                        <g key={idx}>
                          <circle cx={cx} cy="40" r="8" fill="#6366f1" opacity={0.15 + idx * 0.12}>
                            <animate attributeName="r" values="6;10;6" dur="2s" begin={`${idx * 0.3}s`} repeatCount="indefinite" />
                          </circle>
                          <circle cx={cx} cy="40" r="4" fill="#6366f1" opacity={0.6 + idx * 0.08} />
                        </g>
                      ))}
                      <polyline fill="none" stroke="#6366f1" strokeWidth="1.5" opacity="0.5" points="30,55 65,30 100,48 135,22 170,35">
                        <animate attributeName="stroke-dashoffset" from="200" to="0" dur="2s" fill="freeze" />
                      </polyline>
                    </svg>
                  </div>
                </div>
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-5" style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}>
                  <Activity size={28} style={{ color: '#6366f1' }} />
                </div>
                <h3 className="text-2xl font-bold mb-3" style={{ color: '#0f2b3d' }}>{t.feat1Title}</h3>
                <p className="text-xl leading-relaxed" style={{ color: 'rgba(15,43,61,0.6)' }}>{t.feat1Body}</p>
              </div>
            </Reveal>

            {/* Card 2: OperIQ AI - VIOLET - brain/neural visual */}
            <Reveal delay={150}>
              <div
                className="group relative rounded-2xl p-8 transition-all duration-500 hover:-translate-y-2"
                style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#8b5cf655'; (e.currentTarget as HTMLElement).style.boxShadow = '0 20px 60px rgba(139,92,246,0.12)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.15)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
              >
                <div className="relative h-36 mb-6 rounded-xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(139,92,246,0.04))', border: '1px solid rgba(139,92,246,0.15)' }}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    {/* Neural network / brain visual */}
                    <svg viewBox="0 0 200 100" fill="none" className="w-4/5 h-4/5 opacity-70 group-hover:opacity-90 transition-opacity duration-700">
                      {/* Connection lines */}
                      {[[40,25,100,50],[40,75,100,50],[160,25,100,50],[160,75,100,50],[40,25,40,75],[160,25,160,75],[40,25,160,75],[40,75,160,25]].map(([x1,y1,x2,y2], idx) => (
                        <line key={idx} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#8b5cf6" strokeWidth="1" opacity="0.2">
                          <animate attributeName="opacity" values="0.1;0.35;0.1" dur="2.5s" begin={`${idx * 0.2}s`} repeatCount="indefinite" />
                        </line>
                      ))}
                      {/* Nodes */}
                      {[[100,50,12],[40,25,8],[40,75,8],[160,25,8],[160,75,8]].map(([cx,cy,r], idx) => (
                        <g key={idx}>
                          <circle cx={cx} cy={cy} r={r} fill="#8b5cf6" opacity={idx === 0 ? 0.3 : 0.15}>
                            <animate attributeName="r" values={`${r-2};${r+2};${r-2}`} dur="3s" begin={`${idx * 0.4}s`} repeatCount="indefinite" />
                          </circle>
                          <circle cx={cx} cy={cy} r={r * 0.5} fill="#8b5cf6" opacity={idx === 0 ? 0.8 : 0.5} />
                        </g>
                      ))}
                      {/* Pulse rings on center */}
                      <circle cx="100" cy="50" r="18" stroke="#8b5cf6" strokeWidth="1" fill="none" opacity="0.2">
                        <animate attributeName="r" values="14;24;14" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
                      </circle>
                    </svg>
                  </div>
                </div>
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-5" style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)' }}>
                  <Zap size={28} style={{ color: '#8b5cf6' }} />
                </div>
                <h3 className="text-2xl font-bold mb-3" style={{ color: '#0f2b3d' }}>{t.feat2Title}</h3>
                <p className="text-xl leading-relaxed" style={{ color: 'rgba(15,43,61,0.6)' }}>{t.feat2Body}</p>
              </div>
            </Reveal>

            {/* Card 3: KPI Engine - TEAL - dashboard/gauge visual */}
            <Reveal delay={300}>
              <div
                className="group relative rounded-2xl p-8 transition-all duration-500 hover:-translate-y-2"
                style={{ background: 'rgba(13,148,136,0.05)', border: '1px solid rgba(13,148,136,0.15)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#0d948855'; (e.currentTarget as HTMLElement).style.boxShadow = '0 20px 60px rgba(13,148,136,0.12)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(13,148,136,0.15)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
              >
                <div className="relative h-36 mb-6 rounded-xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(13,148,136,0.1), rgba(13,148,136,0.04))', border: '1px solid rgba(13,148,136,0.15)' }}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    {/* KPI Dashboard visual */}
                    <svg viewBox="0 0 200 110" fill="none" className="w-4/5 h-4/5 opacity-70 group-hover:opacity-90 transition-opacity duration-700">
                      {/* Center value */}
                      <text x="100" y="46" textAnchor="middle" fill="#0d9488" fontSize="18" fontWeight="800">7,800+</text>
                      <text x="100" y="62" textAnchor="middle" fill="rgba(13,148,136,0.5)" fontSize="8" fontWeight="600">KPIs</text>
                      {/* Mini bars */}
                      {[55, 75, 90, 65, 82, 70, 88].map((h, j) => (
                        <rect key={j} x={42 + j * 18} y={100 - h * 0.2} width="11" height={h * 0.2} rx="2.5" fill="#0d9488" opacity="0">
                          <animate attributeName="opacity" from="0" to={`${0.25 + j * 0.08}`} dur="0.6s" begin={`${0.5 + j * 0.08}s`} fill="freeze" />
                          <animate attributeName="height" from="0" to={`${h * 0.2}`} dur="0.6s" begin={`${0.5 + j * 0.08}s`} fill="freeze" />
                          <animate attributeName="y" from="100" to={`${100 - h * 0.2}`} dur="0.6s" begin={`${0.5 + j * 0.08}s`} fill="freeze" />
                        </rect>
                      ))}
                    </svg>
                  </div>
                </div>
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-5" style={{ background: 'rgba(13,148,136,0.12)', border: '1px solid rgba(13,148,136,0.25)' }}>
                  <BarChart3 size={28} style={{ color: '#0d9488' }} />
                </div>
                <h3 className="text-2xl font-bold mb-3" style={{ color: '#0f2b3d' }}>{t.feat3Title}</h3>
                <p className="text-xl leading-relaxed" style={{ color: 'rgba(15,43,61,0.6)' }}>{t.feat3Body}</p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ================================================================
          7. PLATFORM FEATURES - comprehensive capabilities section
          ================================================================ */}
      <section className="relative z-10 w-full py-24" style={{ background: 'rgba(99,102,241,0.02)' }}>
        <div className="w-full px-6 lg:px-12 xl:px-20">
          <Reveal>
            <div className="text-center mb-20">
              <h2 className="font-extrabold tracking-tight" style={{ fontSize: 'clamp(42px, 5vw, 60px)', color: '#0f2b3d' }}>
                {t.platformFeaturesTitle}
              </h2>
              <p className="text-xl mt-4 max-w-2xl mx-auto" style={{ color: 'rgba(15,43,61,0.55)' }}>
                {t.platformFeaturesSubtitle}
              </p>
            </div>
          </Reveal>

          {/* Alternating feature blocks */}
          {[
            /* Temel operasyonel özellikler */
            { title: t.pf2Title, body: t.pf2Body, benefit: t.pf2Benefit, img: '/images/Dashboard.jpg',      icon: Monitor,       color: '#0d9488' },
            { title: t.pf5Title, body: t.pf5Body, benefit: t.pf5Benefit, img: '/images/OperIQ.jpg',         icon: Zap,           color: '#14b8a6' },
            { title: t.pf7Title, body: t.pf7Body, benefit: t.pf7Benefit, img: '/images/KPI.jpg',            icon: BarChart3,     color: '#6366f1' },
            { title: t.pf3Title, body: t.pf3Body, benefit: t.pf3Benefit, img: '/images/Gorev.jpg',          icon: ClipboardList, color: '#8b5cf6' },
            /* Otomasyon & is akisi */
            { title: t.nf5Title, body: t.nf5Body, benefit: t.nf5Benefit, img: '/images/Automation.jpg',     icon: GitBranch,     color: '#ea580c' },
            { title: t.nf6Title, body: t.nf6Body, benefit: t.nf6Benefit, img: '/images/Workflow.jpg',       icon: Workflow,      color: '#9333ea' },
            /* Saha & mobil */
            { title: t.pf1Title, body: t.pf1Body, benefit: t.pf1Benefit, img: '/images/Mobil_saha.jpg',     icon: Smartphone,    color: '#6366f1' },
            { title: t.nf8Title, body: t.nf8Body, benefit: t.nf8Benefit, img: '/images/Mobil.jpg',          icon: Radio,         color: '#0891b2' },
            { title: t.nf1Title, body: t.nf1Body, benefit: t.nf1Benefit, img: '/images/Canliharita.jpg',    icon: Map,           color: '#2563eb' },
            { title: t.pf4Title, body: t.pf4Body, benefit: t.pf4Benefit, img: '/images/Fotograf.jpg',       icon: Camera,        color: '#06b6d4' },
            { title: t.nf3Title, body: t.nf3Body, benefit: t.nf3Benefit, img: '/images/OperIQ_mobil.jpg',   icon: Cpu,           color: '#0d9488' },
            /* Stok, dosya, form */
            { title: t.nf4Title, body: t.nf4Body, benefit: t.nf4Benefit, img: '/images/Envanter.jpg',       icon: Boxes,         color: '#7c3aed' },
            { title: t.nf7Title, body: t.nf7Body, benefit: t.nf7Benefit, img: '/images/File_management.jpg', icon: FolderOpen,   color: '#0369a1' },
            { title: t.nf9Title, body: t.nf9Body, benefit: t.nf9Benefit, img: '/images/Form.PNG',           icon: ListChecks,    color: '#c026d3' },
            /* AssetIQ, Mobil QR, IoT Sorumlu */
            { title: t.nf10Title, body: t.nf10Body, benefit: t.nf10Benefit, img: '/images/Depolama.PNG',       icon: ScanLine,      color: '#059669' },
            { title: t.nf11Title, body: t.nf11Body, benefit: t.nf11Benefit, img: '/images/Act_mobil.jpg',      icon: Camera,        color: '#0d9488' },
            { title: t.nf12Title, body: t.nf12Body, benefit: t.nf12Benefit, img: '/images/OperIQ.jpg',         icon: Radio,         color: '#dc2626' },
            /* Iletisim & analitik */
            { title: t.pf6Title, body: t.pf6Body, benefit: t.pf6Benefit, img: '/images/Mesajlasma.jpg',     icon: MessageSquare, color: '#0891b2' },
            { title: t.nf2Title, body: t.nf2Body, benefit: t.nf2Benefit, img: '/images/Heatmap.jpg',        icon: Flame,         color: '#dc2626' },
            /* Guvenlik & yönetim */
            { title: t.pf8Title, body: t.pf8Body, benefit: t.pf8Benefit, img: '/images/Emniyet.jpg',        icon: Shield,        color: '#0d9488' },
            { title: t.pf9Title, body: t.pf9Body, benefit: t.pf9Benefit, img: '/images/Departman.jpg',      icon: Building2,     color: '#8b5cf6' },
            { title: t.pf10Title, body: t.pf10Body, benefit: t.pf10Benefit, img: '/images/Rol.jpg',         icon: Lock,          color: '#06b6d4' },
            /* Sektorel & dil */
            { title: t.pf12Title, body: t.pf12Body, benefit: t.pf12Benefit, img: '/images/Sector.jpg',      icon: FileSpreadsheet, color: '#0891b2' },
            { title: t.pf11Title, body: t.pf11Body, benefit: t.pf11Benefit, img: '/images/Language.jpg',    icon: Languages,     color: '#14b8a6' },
          ].map((feat, i) => {
            const imgLeft = i % 2 === 0
            return (
              <Reveal key={i} delay={100}>
                <div className={`flex flex-col ${imgLeft ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-8 mb-16 last:mb-0`}>
                  {/* Image side */}
                  <div className="w-full md:w-1/2">
                    <div className="relative rounded-2xl overflow-hidden shadow-lg group" style={{ border: `1px solid ${feat.color}25` }}>
                      <img
                        src={feat.img}
                        alt={feat.title}
                        className="w-full h-64 md:h-72 object-cover transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                      <div className="absolute top-4 left-4 w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${feat.color}dd` }}>
                        <feat.icon size={20} className="text-white" />
                      </div>
                    </div>
                  </div>
                  {/* Text side */}
                  <div className="w-full md:w-1/2">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${feat.color}12`, border: `1px solid ${feat.color}30` }}>
                        <feat.icon size={22} style={{ color: feat.color }} />
                      </div>
                      <h3 className="text-2xl font-bold" style={{ color: '#0f2b3d' }}>{feat.title}</h3>
                    </div>
                    <p className="text-lg leading-relaxed mb-4" style={{ color: 'rgba(15,43,61,0.6)' }}>{feat.body}</p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: `${feat.color}10`, border: `1px solid ${feat.color}25` }}>
                      <CheckCircle2 size={16} style={{ color: feat.color }} />
                      <span className="text-base font-semibold" style={{ color: feat.color }}>{feat.benefit}</span>
                    </div>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </section>

      {/* ================================================================
          5. SECTORS
          ================================================================ */}
      <section id="sectors" className="relative z-10 w-full py-24">
        <div className="w-full px-6 lg:px-12 xl:px-20">
          <Reveal>
            <div className="text-center mb-16">
              <h2 className="font-extrabold tracking-tight" style={{ fontSize: 'clamp(42px, 5vw, 60px)', color: '#0f2b3d' }}>
                {t.sectorsTitle}
              </h2>
              <p className="text-xl mt-4 max-w-2xl mx-auto" style={{ color: 'rgba(15,43,61,0.55)' }}>
                {t.sectorsSubtitle}
              </p>
            </div>
          </Reveal>

          <div className="flex flex-wrap justify-center gap-4">
            {SECTORS.map((sector, i) => (
              <Reveal key={sector.id} delay={i * 60} className="w-[calc(50%-8px)] sm:w-[calc(33.333%-11px)] lg:w-[calc(20%-13px)]">
                <div
                  className="group relative rounded-xl p-5 cursor-default transition-all duration-400 hover:scale-105 h-full"
                  style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = sector.accentColor
                    ;(e.currentTarget as HTMLElement).style.boxShadow = `0 0 30px ${sector.accentColor}30, inset 0 0 20px ${sector.accentColor}08`
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(6,182,212,0.2)'
                    ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                  }}
                >
                  <div className="relative h-28 mb-4 rounded-lg overflow-hidden" style={{ background: `linear-gradient(135deg, ${sector.accentColor}18, ${sector.accentColor}08)` }}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-6xl opacity-40 group-hover:opacity-60 transition-opacity duration-500">{sector.icon}</span>
                    </div>
                    <div className="absolute top-2 right-2 w-10 h-10 rounded-full opacity-10" style={{ background: sector.accentColor }} />
                    <div className="absolute bottom-2 left-3 w-14 h-3 rounded-full opacity-10" style={{ background: sector.accentColor }} />
                    <div className="absolute top-4 left-2 w-6 h-6 rounded opacity-8 rotate-45" style={{ background: sector.accentColor }} />
                    <svg className="absolute bottom-0 left-0 w-full h-10 opacity-20" viewBox="0 0 200 40" preserveAspectRatio="none">
                      <polyline fill="none" stroke={sector.accentColor} strokeWidth="2" points="0,35 30,28 60,32 90,18 120,24 150,12 180,20 200,8" />
                    </svg>
                  </div>
                  <p className="text-base sm:text-xl font-bold min-h-[3rem] flex items-center" style={{ color: '#0f2b3d' }}>{sector.name}</p>
                  <p className="text-lg mt-1" style={{ color: 'rgba(15,43,61,0.55)' }}>
                    {sector.id === 'manufacturing' ? 56 : (SECTOR_TEMPLATES[sector.id]?.departments?.length ?? sector.departmentTemplates.length)} {t.deptCount}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          6. FEATURES GRID
          ================================================================ */}
      <section id="features" className="relative z-10 w-full py-24">
        <div className="w-full px-6 lg:px-12 xl:px-20">
          <Reveal>
            <div className="text-center mb-16">
              <h2 className="font-extrabold tracking-tight" style={{ fontSize: 'clamp(42px, 5vw, 60px)', color: '#0f2b3d' }}>
                {t.featuresTitle}
              </h2>
              <p className="text-xl mt-4 max-w-2xl mx-auto" style={{ color: 'rgba(15,43,61,0.55)' }}>
                {t.featuresSubtitle}
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Layers, title: t.f1Title, body: t.f1Body, color: '#06b6d4' },
              { icon: Globe, title: t.f2Title, body: t.f2Body, color: '#14b8a6' },
              { icon: Zap, title: t.f3Title, body: t.f3Body, color: '#22d3ee' },
              { icon: BarChart3, title: t.f4Title, body: t.f4Body, color: '#0891b2' },
              { icon: Shield, title: t.f5Title, body: t.f5Body, color: '#06b6d4' },
              { icon: Activity, title: t.f6Title, body: t.f6Body, color: '#14b8a6' },
            ].map((feat, i) => (
              <Reveal key={i} delay={i * 100} className="h-full">
                <div
                  className="group relative rounded-2xl p-7 transition-all duration-500 hover:-translate-y-1 h-full"
                  style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = `${feat.color}55`
                    ;(e.currentTarget as HTMLElement).style.boxShadow = `0 15px 40px ${feat.color}12`
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(6,182,212,0.2)'
                    ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                  }}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: `${feat.color}12`, border: `1px solid ${feat.color}30` }}>
                    <feat.icon size={20} style={{ color: feat.color }} />
                  </div>
                  <h3 className="text-xl font-bold mb-2" style={{ color: '#0f2b3d' }}>{feat.title}</h3>
                  <p className="text-lg leading-relaxed" style={{ color: 'rgba(15,43,61,0.55)' }}>{feat.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          INDUSTRY SCENES - Real photo gallery with animations
          ================================================================ */}
      <section className="relative z-10 w-full py-20">
        <div className="w-full px-6 lg:px-12 xl:px-20">
          <Reveal>
            <div className="text-center mb-14">
              <h2 className="font-extrabold tracking-tight" style={{ fontSize: 'clamp(42px, 5vw, 60px)', color: '#0f2b3d' }}>
                {lang === 'tr' ? 'Her Sekt\u00f6rde, Her Sahada' : 'Every Sector, Every Field'}
              </h2>
              <p className="text-xl mt-4 mx-auto whitespace-nowrap" style={{ color: 'rgba(15,43,61,0.6)' }}>
                {lang === 'tr' ? 'Fabrikadan sahaya, hastaneden \u015fantiyeye - operasyonlar\u0131n\u0131z\u0131 tek platformda y\u00f6netin.' : 'From factory floor to field, hospital to construction site - manage operations on a single platform.'}
              </p>
            </div>
          </Reveal>

          {/* Main photo grid - large cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {[
              { img: '/images/factory.PNG', label: lang === 'tr' ? '\u00dcretim & \u0130malat' : 'Manufacturing', sub: lang === 'tr' ? 'Fabrika hatlar\u0131, OEE, kalite kontrol' : 'Production lines, OEE, quality control', color: '#06b6d4' },
              { img: '/images/team.PNG', label: lang === 'tr' ? 'Saha Ekipleri' : 'Field Teams', sub: lang === 'tr' ? 'Mobil operasyon, ger\u00e7ek zamanl\u0131 takip' : 'Mobile operations, real-time tracking', color: '#14b8a6' },
              { img: '/images/warehouse.PNG', label: lang === 'tr' ? 'Depo & Tedarik Zinciri' : 'Warehouse & Supply Chain', sub: lang === 'tr' ? 'Stok y\u00f6netimi, sevkiyat, OTIF' : 'Inventory management, shipping, OTIF', color: '#0891b2' },
              { img: '/images/hospital.PNG', label: lang === 'tr' ? 'Sa\u011fl\u0131k & Hastane' : 'Healthcare', sub: lang === 'tr' ? 'Hasta ak\u0131\u015f\u0131, klinik kalite, enfeksiyon kontrol' : 'Patient flow, clinical quality, infection control', color: '#0d9488' },
              { img: '/images/construction.PNG', label: lang === 'tr' ? '\u0130n\u015faat & Proje' : 'Construction', sub: lang === 'tr' ? '\u015eantiye y\u00f6netimi, hakedi\u015f, i\u015f g\u00fcvenli\u011fi' : 'Site management, progress, HSE', color: '#06b6d4' },
              { img: '/images/HoReCa.PNG', label: lang === 'tr' ? 'Otel & Restoran' : 'Hotels & Restaurants', sub: lang === 'tr' ? 'Doluluk, servis h\u0131z\u0131, misafir memnuniyeti' : 'Occupancy, service speed, guest satisfaction', color: '#14b8a6' },
            ].map((item, i) => (
              <Reveal key={i} delay={i * 120}>
                <div className="group relative rounded-2xl overflow-hidden transition-all duration-700 hover:-translate-y-2 hover:shadow-2xl" style={{ border: '1px solid rgba(6,182,212,0.15)' }}>
                  <div className="relative h-56 overflow-hidden">
                    <img src={item.img} alt={item.label} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <p className="text-2xl font-bold text-white">{item.label}</p>
                    </div>
                    <div className="absolute top-3 right-3 w-3 h-3 rounded-full animate-pulse" style={{ background: item.color, boxShadow: `0 0 12px ${item.color}` }} />
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Secondary row - including new sectors */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[
              { img: '/images/fmcg.PNG', label: lang === 'tr' ? 'FMCG & H\u0131zl\u0131 T\u00fcketim' : 'FMCG & Consumer Goods', color: '#0891b2' },
              { img: '/images/retail.PNG', label: lang === 'tr' ? 'Perakende & Market' : 'Retail & Stores', color: '#0d9488' },
              { img: '/images/public_sector.PNG', label: lang === 'tr' ? 'Kamu & Belediye' : 'Government & Municipality', color: '#06b6d4' },
              { img: '/images/energy.PNG', label: lang === 'tr' ? 'Enerji' : 'Energy', color: '#f59e0b' },
            ].map((item, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="group relative rounded-2xl overflow-hidden transition-all duration-700 hover:-translate-y-2 hover:shadow-xl" style={{ border: '1px solid rgba(6,182,212,0.15)' }}>
                  <div className="relative h-44 overflow-hidden">
                    <img src={item.img} alt={item.label} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="text-xl font-bold text-white">{item.label}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Third row - new sectors */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            {[
              { img: '/images/finance.PNG', label: lang === 'tr' ? 'Finans & Bankac\u0131l\u0131k' : 'Finance & Banking', color: '#6366f1' },
              { img: '/images/information_technolgy.PNG', label: lang === 'tr' ? 'Bilgi Teknolojileri' : 'Information Technology', color: '#8b5cf6' },
              { img: '/images/media.PNG', label: lang === 'tr' ? 'Medya & \u0130leti\u015fim' : 'Media & Communication', color: '#ec4899' },
              { img: '/images/transportation.PNG', label: lang === 'tr' ? 'Ula\u015f\u0131m & Lojistik' : 'Transportation & Logistics', color: '#14b8a6' },
            ].map((item, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="group relative rounded-2xl overflow-hidden transition-all duration-700 hover:-translate-y-2 hover:shadow-xl" style={{ border: '1px solid rgba(6,182,212,0.15)' }}>
                  <div className="relative h-44 overflow-hidden">
                    <img src={item.img} alt={item.label} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="text-xl font-bold text-white">{item.label}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Scrolling photo banner - Row 1: left to right (all 14 images) */}
        <div className="w-full overflow-hidden mt-8">
          <div className="flex gap-4" style={{ width: 'max-content', animation: 'testimonialScroll 45s linear infinite' }}>
            {[...allImages, ...allImages].map((src, i) => (
              <div key={i} className="flex-shrink-0 w-72 h-44 rounded-xl overflow-hidden shadow-md" style={{ border: '1px solid rgba(6,182,212,0.15)' }}>
                <img src={src} alt="" className="w-full h-full object-cover hover:scale-110 transition-transform duration-700" loading="lazy" />
              </div>
            ))}
          </div>
        </div>

        {/* Scrolling photo banner - Row 2: right to left (all 14 images reversed) */}
        <div className="w-full overflow-hidden mt-4">
          <div className="flex gap-4" style={{ width: 'max-content', animation: 'testimonialScroll 50s linear infinite reverse' }}>
            {[...allImages].reverse().concat([...allImages].reverse()).map((src, i) => (
              <div key={i} className="flex-shrink-0 w-64 h-40 rounded-xl overflow-hidden shadow-md" style={{ border: '1px solid rgba(6,182,212,0.15)' }}>
                <img src={src} alt="" className="w-full h-full object-cover hover:scale-110 transition-transform duration-700" loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          8. HOW IT WORKS - enriched with connecting lines & icons
          ================================================================ */}
      <section className="relative z-10 w-full py-24">
        <div className="w-full px-6 lg:px-12 xl:px-20">
          <Reveal>
            <div className="text-center mb-16">
              <h2 className="font-extrabold tracking-tight" style={{ fontSize: 'clamp(42px, 5vw, 60px)', color: '#0f2b3d' }}>
                {t.howTitle}
              </h2>
            </div>
          </Reveal>

          <div className="relative max-w-6xl mx-auto">
            {/* Animated connecting SVG line */}
            <div className="hidden lg:block absolute top-24 left-[10%] right-[10%] h-20 pointer-events-none" style={{ zIndex: 0 }}>
              <svg viewBox="0 0 1000 40" fill="none" preserveAspectRatio="none" className="w-full h-full">
                <path
                  d="M 0 20 C 80 20, 120 5, 166 20 S 280 35, 333 20 S 450 5, 500 20 S 610 35, 666 20 S 790 5, 833 20 S 950 35, 1000 20"
                  stroke="url(#howGradient)"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray="8 4"
                  opacity="0.5"
                >
                  <animate attributeName="stroke-dashoffset" from="48" to="0" dur="3s" repeatCount="indefinite" />
                </path>
                <defs>
                  <linearGradient id="howGradient" x1="0" y1="0" x2="800" y2="0" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="50%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#14b8a6" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Progress indicator */}
            <div className="hidden md:flex justify-between max-w-md mx-auto mb-12">
              {[0, 1, 2, 3].map((idx) => (
                <div key={idx} className="flex items-center">
                  <div className="w-3 h-3 rounded-full" style={{ background: ['#06b6d4', '#22d3ee', '#14b8a6', '#059669'][idx], boxShadow: `0 0 10px ${['#06b6d4', '#22d3ee', '#14b8a6', '#059669'][idx]}50` }} />
                  {idx < 2 && <div className="w-24 h-0.5 mx-2" style={{ background: `linear-gradient(90deg, ${['#06b6d4', '#22d3ee'][idx]}, ${['#22d3ee', '#14b8a6'][idx]})`, opacity: 0.3 }} />}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative" style={{ zIndex: 1 }}>
              {[
                { num: '01', icon: Users, title: t.step1Title, body: t.step1Body, color: '#06b6d4', illustration: (
                  <svg viewBox="0 0 80 60" fill="none" className="w-16 h-12 mb-3 opacity-50">
                    <rect x="5" y="5" width="70" height="50" rx="6" stroke="#06b6d4" strokeWidth="1.5" fill="none" />
                    <rect x="12" y="15" width="20" height="4" rx="2" fill="#06b6d4" opacity="0.4" />
                    <rect x="12" y="23" width="30" height="4" rx="2" fill="#06b6d4" opacity="0.3" />
                    <rect x="12" y="31" width="15" height="4" rx="2" fill="#06b6d4" opacity="0.2" />
                    <circle cx="58" cy="30" r="12" stroke="#06b6d4" strokeWidth="1.5" fill="none" opacity="0.3" />
                    <path d="M55 30 L58 33 L64 27" stroke="#06b6d4" strokeWidth="1.5" fill="none" opacity="0.5" />
                  </svg>
                )},
                { num: '02', icon: Layers, title: t.step2Title, body: t.step2Body, color: '#22d3ee', illustration: (
                  <svg viewBox="0 0 80 60" fill="none" className="w-16 h-12 mb-3 opacity-50">
                    <path d="M40 10 L70 25 L40 40 L10 25 Z" stroke="#22d3ee" strokeWidth="1.5" fill="none" opacity="0.4" />
                    <path d="M10 32 L40 47 L70 32" stroke="#22d3ee" strokeWidth="1.5" fill="none" opacity="0.3" />
                    <path d="M10 39 L40 54 L70 39" stroke="#22d3ee" strokeWidth="1.5" fill="none" opacity="0.2" />
                    <circle cx="40" cy="25" r="3" fill="#22d3ee" opacity="0.6" />
                  </svg>
                )},
                { num: '03', icon: Zap, title: t.step3Title, body: t.step3Body, color: '#14b8a6', illustration: (
                  <svg viewBox="0 0 80 60" fill="none" className="w-16 h-12 mb-3 opacity-50">
                    <path d="M35 8 L28 30 L38 30 L32 52" stroke="#14b8a6" strokeWidth="2" fill="none" strokeLinecap="round" />
                    <circle cx="55" cy="20" r="6" stroke="#14b8a6" strokeWidth="1.5" fill="none" opacity="0.3" />
                    <circle cx="60" cy="40" r="8" stroke="#14b8a6" strokeWidth="1.5" fill="none" opacity="0.2" />
                    <path d="M50 20 L55 15 L60 20" stroke="#14b8a6" strokeWidth="1" fill="none" opacity="0.4" />
                  </svg>
                )},
                { num: '04', icon: ScanLine, title: t.step4Title, body: t.step4Body, color: '#059669', illustration: (
                  <svg viewBox="0 0 80 60" fill="none" className="w-16 h-12 mb-3 opacity-50">
                    <rect x="20" y="8" width="40" height="40" rx="5" stroke="#059669" strokeWidth="1.5" fill="none" />
                    <rect x="28" y="16" width="8" height="8" fill="#059669" opacity="0.3" />
                    <rect x="44" y="16" width="8" height="8" fill="#059669" opacity="0.2" />
                    <rect x="28" y="32" width="8" height="8" fill="#059669" opacity="0.2" />
                    <rect x="44" y="32" width="8" height="8" fill="#059669" opacity="0.3" />
                    <path d="M40 52 L40 58" stroke="#059669" strokeWidth="1" opacity="0.3" />
                    <circle cx="40" cy="58" r="2" fill="#059669" opacity="0.4" />
                  </svg>
                )},
              ].map((step, i) => (
                <Reveal key={i} delay={i * 200}>
                  <div
                    className="relative text-center rounded-2xl p-8 lg:p-10 transition-all duration-500 hover:-translate-y-2 h-full flex flex-col items-center justify-start"
                    style={{ background: 'rgba(255,255,255,0.6)', border: `1px solid ${step.color}20`, backdropFilter: 'blur(8px)' }}
                  >
                    {/* Illustration */}
                    <div className="flex justify-center">{step.illustration}</div>
                    {/* Step dot */}
                    <div
                      className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center relative flex-shrink-0"
                      style={{ background: `${step.color}15`, border: `2px solid ${step.color}40`, boxShadow: `0 0 40px ${step.color}20` }}
                    >
                      <step.icon size={30} style={{ color: step.color }} />
                      <span
                        className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold"
                        style={{ background: step.color, color: '#111d2e' }}
                      >
                        {step.num}
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold mb-3" style={{ color: '#0f2b3d' }}>{step.title}</h3>
                    <p className="text-base leading-relaxed flex-1" style={{ color: 'rgba(15,43,61,0.55)' }}>{step.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          9. PLATFORM GUIDE - light gradient, 2x2 grid with visual headers
          ================================================================ */}
      <section className="relative z-10 w-full py-24" style={{ background: 'linear-gradient(135deg, rgba(240,250,250,0.8), rgba(245,240,232,0.6), rgba(237,247,247,0.8))' }}>
        <div className="w-full px-6 lg:px-12 xl:px-20">
          <Reveal>
            <div className="text-center mb-16">
              <h2 className="font-extrabold tracking-tight" style={{ fontSize: 'clamp(42px, 5vw, 60px)', color: '#0f2b3d' }}>
                {t.guideTitle}
              </h2>
              <p className="text-xl mt-4 max-w-2xl mx-auto" style={{ color: 'rgba(15,43,61,0.55)' }}>
                {t.guideSubtitle}
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: Activity, title: t.guide1Title, body: t.guide1Body, color: '#6366f1',
                visual: (
                  <svg viewBox="0 0 200 80" fill="none" className="w-full h-full">
                    <rect x="10" y="10" width="40" height="25" rx="4" fill="#6366f1" opacity="0.15" />
                    <rect x="10" y="12" width="40" height="3" rx="1.5" fill="#6366f1" opacity="0.4" />
                    <rect x="55" y="10" width="40" height="25" rx="4" fill="#6366f1" opacity="0.1" />
                    <rect x="100" y="10" width="40" height="25" rx="4" fill="#6366f1" opacity="0.12" />
                    <rect x="145" y="10" width="45" height="25" rx="4" fill="#6366f1" opacity="0.08" />
                    <polyline fill="none" stroke="#6366f1" strokeWidth="2" points="15,60 50,48 85,55 120,40 155,50 185,38" opacity="0.5" />
                    <circle cx="50" cy="48" r="3" fill="#6366f1" opacity="0.6" />
                    <circle cx="120" cy="40" r="3" fill="#6366f1" opacity="0.6" />
                    <circle cx="185" cy="38" r="3" fill="#6366f1" opacity="0.6" />
                  </svg>
                ),
              },
              {
                icon: CheckCircle2, title: t.guide2Title, body: t.guide2Body, color: '#0d9488',
                visual: (
                  <svg viewBox="0 0 200 80" fill="none" className="w-full h-full">
                    {[0,1,2,3].map(j => (
                      <g key={j}>
                        <rect x="15" y={10 + j * 17} width="170" height="12" rx="4" fill="#0d9488" opacity={0.08 + j * 0.03} />
                        <circle cx="30" cy={16 + j * 17} r="4" stroke="#0d9488" strokeWidth="1.5" fill={j < 2 ? '#0d9488' : 'none'} opacity={j < 2 ? 0.5 : 0.2} />
                        <rect x="42" y={14 + j * 17} width={40 + j * 15} height="4" rx="2" fill="#0d9488" opacity={0.2 + j * 0.05} />
                      </g>
                    ))}
                  </svg>
                ),
              },
              {
                icon: BarChart3, title: t.guide3Title, body: t.guide3Body, color: '#8b5cf6',
                visual: (
                  <svg viewBox="0 0 200 80" fill="none" className="w-full h-full">
                    {[35, 55, 70, 45, 80, 60, 75, 50].map((h, j) => (
                      <rect key={j} x={15 + j * 23} y={75 - h * 0.8} width="16" height={h * 0.8} rx="3" fill="#8b5cf6" opacity={0.15 + j * 0.06} />
                    ))}
                    <line x1="10" y1="75" x2="195" y2="75" stroke="#8b5cf6" strokeWidth="1" opacity="0.2" />
                    <line x1="10" y1="55" x2="195" y2="55" stroke="#8b5cf6" strokeWidth="0.5" opacity="0.1" strokeDasharray="4 4" />
                    <line x1="10" y1="35" x2="195" y2="35" stroke="#8b5cf6" strokeWidth="0.5" opacity="0.1" strokeDasharray="4 4" />
                  </svg>
                ),
              },
              {
                icon: Zap, title: t.guide4Title, body: t.guide4Body, color: '#0891b2',
                visual: (
                  <svg viewBox="0 0 200 80" fill="none" className="w-full h-full">
                    <circle cx="100" cy="40" r="25" stroke="#0891b2" strokeWidth="1.5" fill="none" opacity="0.15" />
                    <circle cx="100" cy="40" r="15" stroke="#0891b2" strokeWidth="1.5" fill="none" opacity="0.25" />
                    <circle cx="100" cy="40" r="5" fill="#0891b2" opacity="0.4" />
                    <line x1="50" y1="25" x2="80" y2="35" stroke="#0891b2" strokeWidth="1" opacity="0.2" />
                    <line x1="45" y1="55" x2="78" y2="48" stroke="#0891b2" strokeWidth="1" opacity="0.2" />
                    <line x1="120" y1="32" x2="155" y2="20" stroke="#0891b2" strokeWidth="1" opacity="0.2" />
                    <line x1="122" y1="50" x2="160" y2="60" stroke="#0891b2" strokeWidth="1" opacity="0.2" />
                    <circle cx="45" cy="55" r="4" fill="#0891b2" opacity="0.2" />
                    <circle cx="50" cy="25" r="4" fill="#0891b2" opacity="0.2" />
                    <circle cx="155" cy="20" r="4" fill="#0891b2" opacity="0.2" />
                    <circle cx="160" cy="60" r="4" fill="#0891b2" opacity="0.2" />
                    <path d="M96 35 L100 28 L104 35" fill="#0891b2" opacity="0.5" />
                  </svg>
                ),
              },
              {
                icon: ScanLine, title: t.guide5Title, body: t.guide5Body, color: '#059669',
                visual: (
                  <svg viewBox="0 0 200 80" fill="none" className="w-full h-full">
                    <rect x="65" y="10" width="70" height="60" rx="6" stroke="#059669" strokeWidth="1.5" fill="none" opacity="0.2" />
                    <rect x="75" y="20" width="12" height="12" fill="#059669" opacity="0.3" />
                    <rect x="90" y="20" width="12" height="12" fill="#059669" opacity="0.15" />
                    <rect x="105" y="20" width="12" height="12" fill="#059669" opacity="0.3" />
                    <rect x="75" y="35" width="12" height="12" fill="#059669" opacity="0.15" />
                    <rect x="90" y="35" width="12" height="12" fill="#059669" opacity="0.3" />
                    <rect x="105" y="35" width="12" height="12" fill="#059669" opacity="0.15" />
                    <rect x="75" y="50" width="12" height="12" fill="#059669" opacity="0.3" />
                    <rect x="90" y="50" width="12" height="12" fill="#059669" opacity="0.15" />
                    <rect x="105" y="50" width="12" height="12" fill="#059669" opacity="0.3" />
                    <line x1="30" y1="40" x2="60" y2="40" stroke="#059669" strokeWidth="1" opacity="0.3" strokeDasharray="3 3" />
                    <line x1="140" y1="40" x2="170" y2="40" stroke="#059669" strokeWidth="1" opacity="0.3" strokeDasharray="3 3" />
                  </svg>
                ),
              },
              {
                icon: Map, title: t.guide6Title, body: t.guide6Body, color: '#2563eb',
                visual: (
                  <svg viewBox="0 0 200 80" fill="none" className="w-full h-full">
                    <rect x="20" y="10" width="160" height="55" rx="6" stroke="#2563eb" strokeWidth="1" fill="none" opacity="0.15" />
                    <rect x="30" y="18" width="40" height="20" rx="3" fill="#2563eb" opacity="0.1" />
                    <rect x="80" y="18" width="50" height="38" rx="3" fill="#2563eb" opacity="0.08" />
                    <rect x="140" y="18" width="30" height="15" rx="3" fill="#2563eb" opacity="0.12" />
                    <circle cx="50" cy="50" r="4" fill="#2563eb" opacity="0.3" />
                    <circle cx="105" cy="50" r="3" fill="#ef4444" opacity="0.4" />
                    <circle cx="155" cy="45" r="3" fill="#22c55e" opacity="0.4" />
                    <path d="M50 50 L105 50" stroke="#2563eb" strokeWidth="0.5" opacity="0.2" strokeDasharray="2 2" />
                  </svg>
                ),
              },
            ].map((module, i) => (
              <Reveal key={i} delay={i * 120}>
                <div
                  className="guide-card group rounded-2xl overflow-hidden transition-all duration-400 h-full flex flex-col"
                  style={{
                    background: 'rgba(255,255,255,0.85)',
                    border: `1px solid ${module.color}20`,
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  {/* Visual header area */}
                  <div className="h-36 px-6 pt-5" style={{ background: `linear-gradient(135deg, ${module.color}08, ${module.color}04)` }}>
                    {module.visual}
                  </div>
                  {/* Content */}
                  <div className="p-6 pt-5 flex-1 flex flex-col">
                    <div className="flex items-start gap-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${module.color}12`, border: `1px solid ${module.color}25` }}
                      >
                        <module.icon size={22} style={{ color: module.color }} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold mb-2" style={{ color: '#0f2b3d' }}>{module.title}</h3>
                        <p className="text-sm leading-relaxed" style={{ color: 'rgba(15,43,61,0.55)' }}>{module.body}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          10. TESTIMONIALS - 10 rotating customer reviews
          ================================================================ */}
      <section className="relative z-10 w-full py-24 overflow-hidden">
        <Reveal>
          <div className="text-center mb-12 px-6">
            <h2 className="font-extrabold tracking-tight" style={{ fontSize: 'clamp(42px, 5vw, 60px)', color: '#0f2b3d' }}>
              {lang === 'tr' ? 'M\u00fc\u015fterilerimiz Ne Diyor?' : 'What Our Clients Say'}
            </h2>
          </div>
        </Reveal>
        <div className="relative w-full">
          <div className="animate-testimonial-scroll flex gap-6" style={{ width: 'max-content' }}>
            {[
              { text: lang === 'tr' ? '23 departman\u0131n verisini tek ekranda g\u00f6rd\u00fck. Karar alma s\u00fcrecimiz %40 h\u0131zland\u0131.' : 'We saw data from 23 departments on one screen. Decision-making accelerated by 40%.', name: 'Mehmet K.', role: lang === 'tr' ? 'Operasyon Direkt\u00f6r\u00fc, \u00dcretim' : 'Operations Director, Manufacturing', init: 'MK', color: '#06b6d4' },
              { text: lang === 'tr' ? 'Saha ekiplerinin ger\u00e7ek zamanl\u0131 takibi sayesinde m\u00fc\u015fteriye hizmet s\u00fcresini %35 azaltt\u0131k.' : 'Real-time field tracking helped us reduce service time by 35%.', name: 'Ay\u015fe D.', role: lang === 'tr' ? 'GM, Lojistik' : 'GM, Logistics', init: 'AD', color: '#14b8a6' },
              { text: lang === 'tr' ? 'OperIQ analizleri bize ayl\u0131k 200.000 TL tasarruf sa\u011flayan aksiyonlar \u00f6nerdi.' : 'OperIQ analytics suggested actions that saved us 200K TL monthly.', name: 'Can S.', role: lang === 'tr' ? 'CFO, Enerji' : 'CFO, Energy', init: 'CS', color: '#0891b2' },
              { text: lang === 'tr' ? 'KPI \u015fablonlar\u0131 sayesinde 3 g\u00fcnl\u00fck kurulum s\u00fcresi 2 saate d\u00fc\u015ft\u00fc.' : 'KPI templates reduced 3-day setup time to just 2 hours.', name: 'Elif B.', role: lang === 'tr' ? 'IT Direkt\u00f6r\u00fc, Sa\u011fl\u0131k' : 'IT Director, Healthcare', init: 'EB', color: '#22d3ee' },
              { text: lang === 'tr' ? 'Ma\u011faza bazl\u0131 performans takibi ile zay\u0131f noktalar\u0131m\u0131z\u0131 hemen tespit ediyoruz.' : 'Store-level performance tracking lets us spot weak points instantly.', name: 'Burak T.', role: lang === 'tr' ? 'Perakende M\u00fcd\u00fcr\u00fc' : 'Retail Manager', init: 'BT', color: '#0d9488' },
              { text: lang === 'tr' ? '\u015eantiye raporlar\u0131n\u0131 mobil ile 5 dakikada olu\u015fturuyoruz, eskiden 2 saat s\u00fcr\u00fcyordu.' : 'Site reports take 5 minutes on mobile now, used to take 2 hours.', name: 'Hakan Y.', role: lang === 'tr' ? '\u015eantiye \u015eefi, \u0130n\u015faat' : 'Site Manager, Construction', init: 'HY', color: '#06b6d4' },
              { text: lang === 'tr' ? 'Distrib\u00fct\u00f6rlerin performans\u0131n\u0131 ger\u00e7ek zamanl\u0131 izleyerek OTIF oran\u0131n\u0131 %92\'ye \u00e7\u0131kard\u0131k.' : 'Monitoring distributor performance in real-time pushed our OTIF to 92%.', name: 'Zeynep A.', role: lang === 'tr' ? 'SCM Direkt\u00f6r\u00fc, FMCG' : 'SCM Director, FMCG', init: 'ZA', color: '#14b8a6' },
              { text: lang === 'tr' ? 'Vatanda\u015f \u015fikayet \u00e7\u00f6z\u00fcm s\u00fcremiz %50 azald\u0131, memnuniyet endeksi %30 artt\u0131.' : 'Citizen complaint resolution dropped 50%, satisfaction index up 30%.', name: 'Serkan M.', role: lang === 'tr' ? 'Ba\u015fkan Yard\u0131mc\u0131s\u0131, Belediye' : 'Deputy Mayor, Municipality', init: 'SM', color: '#0891b2' },
              { text: lang === 'tr' ? 'Otel doluluk oran\u0131n\u0131 gelir y\u00f6netimiyle optimum seviyeye ta\u015f\u0131d\u0131k.' : 'We optimized hotel occupancy to peak levels with revenue management.', name: 'Deniz K.', role: lang === 'tr' ? 'GM, HoReCa' : 'GM, HoReCa', init: 'DK', color: '#22d3ee' },
              { text: lang === 'tr' ? 'Sprint velocity ve deployment metrikleriyle m\u00fchendislik verimlili\u011fini %45 art\u0131rd\u0131k.' : 'Engineering efficiency up 45% with sprint velocity and deployment metrics.', name: 'Ali R.', role: lang === 'tr' ? 'CTO, Startup' : 'CTO, Startup', init: 'AR', color: '#0d9488' },
            ].concat([
              { text: lang === 'tr' ? '23 departman\u0131n verisini tek ekranda g\u00f6rd\u00fck.' : 'We saw data from 23 departments on one screen.', name: 'Mehmet K.', role: lang === 'tr' ? 'Operasyon Direkt\u00f6r\u00fc' : 'Operations Director', init: 'MK', color: '#06b6d4' },
              { text: lang === 'tr' ? 'Saha ekiplerinin ger\u00e7ek zamanl\u0131 takibi muhte\u015fem.' : 'Real-time field tracking is amazing.', name: 'Ay\u015fe D.', role: lang === 'tr' ? 'GM, Lojistik' : 'GM, Logistics', init: 'AD', color: '#14b8a6' },
              { text: lang === 'tr' ? 'OperIQ analizleri bize b\u00fcy\u00fck tasarruf sa\u011flad\u0131.' : 'OperIQ analytics gave us huge savings.', name: 'Can S.', role: 'CFO', init: 'CS', color: '#0891b2' },
              { text: lang === 'tr' ? 'KPI \u015fablonlar\u0131 kurulum s\u00fcrecini k\u0131saltt\u0131.' : 'KPI templates shortened setup time.', name: 'Elif B.', role: 'IT Director', init: 'EB', color: '#22d3ee' },
              { text: lang === 'tr' ? 'Ma\u011faza bazl\u0131 performans takibi harika.' : 'Store-level tracking is great.', name: 'Burak T.', role: lang === 'tr' ? 'Perakende M\u00fcd\u00fcr\u00fc' : 'Retail Manager', init: 'BT', color: '#0d9488' },
              { text: lang === 'tr' ? 'Canl\u0131 harita ile saha ekibinin konumunu an\u0131nda g\u00f6r\u00fcp acil ar\u0131zaya en yak\u0131n teknisyeni y\u00f6nlendirdik. M\u00fcdahale s\u00fcremiz 45 dakikadan 8 dakikaya d\u00fc\u015ft\u00fc.' : 'Live map let us see field crew instantly and route the nearest technician to an emergency. Response time dropped from 45 to 8 minutes.', name: 'Fatma \u00d6.', role: lang === 'tr' ? 'Operasyon M\u00fcd\u00fcr\u00fc, Enerji' : 'Operations Manager, Energy', init: 'F\u00d6', color: '#2563eb' },
              { text: lang === 'tr' ? 'Is\u0131 haritas\u0131 ile \u00fcretim hatt\u0131ndaki darbo\u011fazlar\u0131 g\u00f6rsel olarak tespit ettik. Hat 3\'teki kronik sorunu OperIQ \u00f6nceden tahmin etti.' : 'Heatmap visually identified production bottlenecks. OperIQ predicted the chronic issue on Line 3 before it escalated.', name: 'Kemal A.', role: lang === 'tr' ? 'Fabrika M\u00fcd\u00fcr\u00fc, Otomotiv' : 'Plant Manager, Automotive', init: 'KA', color: '#dc2626' },
              { text: lang === 'tr' ? 'OperIQ Mobil, teknisyenlerimize ad\u0131m ad\u0131m rehberlik ediyor. Foto\u011fraf y\u00fckleyip an\u0131nda analiz al\u0131yorlar, hata oran\u0131m\u0131z %60 azald\u0131.' : 'OperIQ Mobile guides our technicians step by step. They upload photos and get instant analysis - error rate dropped 60%.', name: 'Selin Y.', role: lang === 'tr' ? 'Bak\u0131m Koordinat\u00f6r\u00fc, G\u0131da' : 'Maintenance Coordinator, Food', init: 'SY', color: '#0d9488' },
              { text: lang === 'tr' ? '12.000 sat\u0131rl\u0131k envanter dosyam\u0131z\u0131 OperIQ ile 3 dakikada y\u00fckledik. S\u00fctun e\u015fle\u015ftirmesini yapay zeka yapt\u0131, s\u0131f\u0131r hata.' : 'We loaded our 12,000-row inventory file in 3 minutes with OperIQ. AI did the column mapping, zero errors.', name: 'Murat B.', role: lang === 'tr' ? 'IT M\u00fcd\u00fcr\u00fc, \u0130la\u00e7' : 'IT Manager, Pharma', init: 'MB', color: '#7c3aed' },
              { text: lang === 'tr' ? 'IoT sens\u00f6rlerimizin verisini ActLedger\'a ba\u011flad\u0131k. Makine ar\u0131zalar\u0131n\u0131 olmadan \u00f6nce tespit ediyoruz, bak\u0131m maliyetimiz %40 d\u00fc\u015ft\u00fc.' : 'We connected IoT sensor data to ActLedger. Now we detect machine failures before they happen - maintenance costs down 40%.', name: 'Ahmet G.', role: lang === 'tr' ? 'Teknik Direkt\u00f6r, Kimya' : 'Technical Director, Chemicals', init: 'AG', color: '#06b6d4' },
            ]).map((review, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-[380px] rounded-2xl p-7"
                style={{
                  background: 'rgba(255,255,255,0.7)',
                  border: `1px solid ${review.color}25`,
                  backdropFilter: 'blur(8px)',
                }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center mb-4" style={{ background: `${review.color}15` }}>
                  <span className="text-xl font-bold" style={{ color: review.color }}>"</span>
                </div>
                <p className="text-lg leading-relaxed mb-5" style={{ color: '#1a2e3b' }}>{review.text}</p>
                <div className="flex items-center gap-3 pt-4" style={{ borderTop: `1px solid ${review.color}15` }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg" style={{ background: `linear-gradient(135deg, ${review.color}, ${review.color}cc)`, color: '#fff' }}>
                    {review.init}
                  </div>
                  <div>
                    <p className="text-lg font-bold" style={{ color: '#0f2b3d' }}>{review.name}</p>
                    <p className="text-base" style={{ color: 'rgba(15,43,61,0.5)' }}>{review.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          OPERIQ INSIGHTS
          ================================================================ */}
      <section id="insights" className="relative z-10 w-full py-28 overflow-hidden">
        <div className="w-full px-4 lg:px-8 xl:px-12">
          <Reveal>
            <div className="text-center mb-14">
              <span className="inline-block px-4 py-1.5 rounded-full text-sm font-bold tracking-wider uppercase mb-4"
                style={{ background: 'rgba(6,182,212,0.1)', color: '#0891b2', border: '1px solid rgba(6,182,212,0.2)' }}>
                OperIQ
              </span>
              <h2 className="font-extrabold tracking-tight" style={{ fontSize: 'clamp(36px, 5vw, 56px)', color: '#0f2b3d' }}>
                {t.insightsTitle}
              </h2>
              <p className="text-xl mt-4 max-w-2xl mx-auto" style={{ color: 'rgba(15,43,61,0.55)' }}>
                {t.insightsSubtitle}
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mx-auto" style={{ maxWidth: '80%' }}>
            {(lang === 'tr' ? [
              { tag: 'Bak\u0131m', title: 'Hat 3 - Plans\u0131z Duru\u015f Art\u0131\u015f\u0131', body: 'Son 7 g\u00fcnde Hat 3\'te planlanmam\u0131\u015f duru\u015f s\u00fcresi %18 artt\u0131.', action: 'Bak\u0131m s\u0131kl\u0131\u011f\u0131n\u0131 g\u00f6zden ge\u00e7irin.' },
              { tag: '\u00dcretim', title: 'Fire Oran\u0131 Hedef \u00dcst\u00fcnde', body: '\u00dcretim hatt\u0131nda fire oran\u0131 hedef de\u011ferin \u00fczerine \u00e7\u0131kt\u0131.', action: 'Operat\u00f6r kaynakl\u0131 sapmalar\u0131 inceleyin.' },
              { tag: 'Ar\u0131za', title: '3 Tekrar Eden Ar\u0131za', body: 'Ayn\u0131 makinede son 48 saatte 3 tekrar eden ar\u0131za olu\u015ftu.', action: 'K\u00f6k neden analizi yap\u0131n.' },
              { tag: 'Lojistik', title: 'Sevkiyat Gecikmeleri', body: 'Gecikmelerin %62\'si depo i\u00e7i haz\u0131rl\u0131k s\u00fcre\u00e7lerinden kaynaklan\u0131yor.', action: 'Depo i\u00e7i s\u00fcre\u00e7leri optimize edin.' },
              { tag: 'Saha', title: 'G\u00f6rev Gecikme Yo\u011funla\u015fmas\u0131', body: 'Belirli b\u00f6lgede yo\u011funla\u015fan g\u00f6rev gecikmeleri tespit edildi.', action: 'Ekip da\u011f\u0131l\u0131m\u0131n\u0131 yeniden dengeleyin.' },
              { tag: 'Enerji', title: 'Anormal Enerji T\u00fcketimi', body: 'Belirli saat aral\u0131klar\u0131nda enerji t\u00fcketimi anormal y\u00fckseldi.', action: 'Ekipman verimlili\u011fini kontrol edin.' },
              { tag: 'KPI', title: 'D\u00fc\u015f\u00fck KPI - G\u00f6rev S\u00fcresi', body: 'KPI performans\u0131 d\u00fc\u015f\u00fck departmanlarda g\u00f6rev s\u00fcresi %25 ortalama \u00fcst\u00fc.', action: 'Performans iyile\u015ftirme plan\u0131 olu\u015fturun.' },
              { tag: 'E\u011fitim', title: 'Vardiya Performans Fark\u0131', body: 'Ayn\u0131 vardiyada \u00e7al\u0131\u015fan ekiplerde performans fark\u0131 tespit edildi.', action: 'E\u011fitim ihtiyac\u0131 de\u011ferlendirilmeli.' },
              { tag: 'Bak\u0131m', title: 'Bak\u0131m G\u00f6rev Gecikmeleri', body: 'Son 30 g\u00fcnde bak\u0131m g\u00f6revlerinin %40\'\u0131 planlanan s\u00fcreden ge\u00e7 tamamland\u0131.', action: 'Bak\u0131m planlama s\u00fcrecini g\u00f6zden ge\u00e7irin.' },
              { tag: 'IoT', title: 'Kritik Titre\u015fim Seviyeleri', body: 'IoT verilerine g\u00f6re belirli ekipmanlarda titre\u015fim kritik e\u015fi\u011fe yakla\u015ft\u0131.', action: 'Ekipman denetimi ba\u015flat\u0131lmal\u0131.' },
              { tag: 'G\u00f6rev', title: 'Kritik G\u00f6revler Beklemede', body: 'A\u00e7\u0131k g\u00f6revlerin %35\'i kritik \u00f6ncelikte ve hen\u00fcz aksiyon al\u0131nmam\u0131\u015f.', action: '\u00d6ncelikli g\u00f6revleri hemen atay\u0131n.' },
              { tag: 'Kalite', title: 'Tekrar Eden Kalite Hatalar\u0131', body: 'Ayn\u0131 lokasyonda tekrar eden kalite hatalar\u0131 tespit edildi.', action: 'Proses standardizasyonunu iyile\u015ftirin.' },
              { tag: '\u00dcretim', title: 'Kapasite Hedef Alt\u0131nda', body: '\u00dcretim kapasitesi hedefin %12 alt\u0131nda ger\u00e7ekle\u015fti. Darbo\u011faz: Hat 5.', action: 'Hat 5\'teki darbo\u011faz\u0131 \u00e7\u00f6z\u00fcn.' },
              { tag: 'Depo', title: 'Stok Say\u0131m Farklar\u0131', body: 'Depo operasyonlar\u0131nda stok say\u0131m farklar\u0131 art\u0131\u015f trendine girdi.', action: 'Envanter y\u00f6netim s\u00fcrecini denetleyin.' },
              { tag: 'M\u00fcdahale', title: 'Yava\u015f \u0130lk Aksiyon S\u00fcresi', body: 'G\u00f6rev atama sonras\u0131 ilk aksiyon s\u00fcresi ortalama 2 saati a\u015ft\u0131.', action: 'M\u00fcdahale s\u00fcresi iyile\u015ftirilmeli.' },
              { tag: 'Risk', title: 'Devams\u0131zl\u0131k Art\u0131\u015f\u0131', body: 'Son 14 g\u00fcnde belirli ekiplerde devams\u0131zl\u0131k oran\u0131 y\u00fckseldi.', action: 'Operasyonel risk de\u011ferlendirmesi yap\u0131n.' },
              { tag: 'S\u00fcre\u00e7', title: 'D\u00fc\u015f\u00fck Tamamlanma Oran\u0131', body: 'Belirli g\u00f6rev t\u00fcrlerinde tamamlanma oran\u0131 %60 seviyesinde kald\u0131.', action: 'S\u00fcreci yeniden de\u011ferlendirin.' },
              { tag: 'Operat\u00f6r', title: 'Operat\u00f6r Performans Fark\u0131', body: 'Ayn\u0131 makine grubunda operat\u00f6r bazl\u0131 performans fark\u0131 tespit edildi.', action: 'Operat\u00f6r e\u011fitim program\u0131 ba\u015flat\u0131n.' },
              { tag: 'Acil', title: 'Standart D\u0131\u015f\u0131 Sapmalar', body: 'Acil durum SOP\u0027lerinde standart d\u0131\u015f\u0131 sapmalar g\u00f6zlemlendi.', action: 'SOP uyumlulu\u011funu denetleyin.' },
              { tag: 'Harita', title: 'A\u015f\u0131r\u0131 Y\u00fcklenme B\u00f6lgesi', body: 'Operasyonel yo\u011funluk haritas\u0131nda belirli b\u00f6lgelerde a\u015f\u0131r\u0131 y\u00fcklenme g\u00f6r\u00fcld\u00fc.', action: 'Kaynak da\u011f\u0131l\u0131m\u0131n\u0131 optimize edin.' },
              { tag: 'AssetIQ', title: 'Stok T\u00fckenme Tahmini', body: 'Rulman sto\u011fu mevcut t\u00fcketim h\u0131z\u0131na g\u00f6re 5 g\u00fcn i\u00e7inde t\u00fckenecek.', action: 'Sat\u0131n alma talebi olu\u015fturun.' },
              { tag: 'QR', title: 'Anormal QR Hareket Yo\u011funlu\u011fu', body: 'Depo-3\'te son 24 saatte normalin 3 kat\u0131 stok \u00e7\u0131k\u0131\u015f\u0131 tespit edildi.', action: 'Depo sorumlusunu uyar\u0131n.' },
              { tag: 'Parti/Lot', title: 'SKT Yakla\u015fan Partiler', body: '12 parti/lot\u0027un son kullanma tarihi 7 g\u00fcn i\u00e7inde dolacak.', action: '\u00d6ncelikli kullan\u0131m plan\u0131 olu\u015fturun.' },
              { tag: 'Onay', title: 'Bekleyen Stok Onaylar\u0131', body: '8 stok i\u015flem talebi 24 saatten fazlad\u0131r onay bekliyor.', action: 'Onay zincirini h\u0131zland\u0131r\u0131n.' },
              { tag: 'IoT Cihaz', title: 'Cihaz Sorumlusu Uyar\u0131s\u0131', body: '3 IoT cihaz\u0131 kritik durumda ve sorumlu personel hen\u00fcz yan\u0131t vermedi.', action: 'Yedek sorumluyu devreye al\u0131n.' },
              { tag: 'Foto Analiz', title: 'Saha G\u00f6rsel Anomalisi', body: 'OperIQ foto\u011fraf analizi sahada potansiyel g\u00fcvenlik riski tespit etti.', action: 'Acil saha denetimi ba\u015flat\u0131n.' },
              { tag: 'Mesaj', title: 'Yan\u0131ts\u0131z Kritik Mesajlar', body: '5 kritik departman mesaj\u0131 24 saatten fazlad\u0131r yan\u0131ts\u0131z.', action: '\u0130lgili y\u00f6neticileri bilgilendirin.' },
              { tag: 'Tesis', title: 'Tesis Plan\u0131 Anomalisi', body: '2D/3D tesis haritas\u0131nda B\u00f6lge-7\u0027de anormal s\u0131cakl\u0131k da\u011f\u0131l\u0131m\u0131 tespit edildi.', action: 'HVAC sistemini kontrol edin.' },
            ] : [
              { tag: 'Maintenance', title: 'Line 3 - Unplanned Downtime', body: 'Unplanned downtime on Line 3 increased 18% in the last 7 days.', action: 'Review maintenance frequency.' },
              { tag: 'Production', title: 'Scrap Rate Above Target', body: 'Production line scrap rate exceeded target value.', action: 'Investigate operator-driven deviations.' },
              { tag: 'Failure', title: '3 Recurring Failures', body: '3 recurring failures on the same machine in 48 hours.', action: 'Perform root cause analysis.' },
              { tag: 'Logistics', title: 'Shipment Delays', body: '62% of delays originate from warehouse preparation processes.', action: 'Optimize warehouse workflows.' },
              { tag: 'Field', title: 'Task Delay Clustering', body: 'Task delays concentrated in a specific zone detected.', action: 'Rebalance team distribution.' },
              { tag: 'Energy', title: 'Abnormal Energy Consumption', body: 'Energy consumption spikes abnormally at certain hours.', action: 'Check equipment efficiency.' },
              { tag: 'KPI', title: 'Low KPI - Task Duration', body: 'Task duration 25% above average in low-KPI departments.', action: 'Create performance improvement plan.' },
              { tag: 'Training', title: 'Shift Performance Gap', body: 'Performance gap detected among same-shift teams.', action: 'Training needs assessment required.' },
              { tag: 'Maintenance', title: 'Maintenance Task Delays', body: '40% of maintenance tasks completed late in the last 30 days.', action: 'Review maintenance planning process.' },
              { tag: 'IoT', title: 'Critical Vibration Levels', body: 'IoT data shows vibration levels approaching critical threshold.', action: 'Initiate equipment inspection.' },
              { tag: 'Tasks', title: 'Critical Tasks Pending', body: '35% of open tasks are critical priority with no action taken.', action: 'Assign priority tasks immediately.' },
              { tag: 'Quality', title: 'Recurring Quality Errors', body: 'Recurring quality errors at the same location detected.', action: 'Improve process standardization.' },
              { tag: 'Production', title: 'Capacity Below Target', body: 'Production capacity 12% below target. Bottleneck: Line 5.', action: 'Resolve Line 5 bottleneck.' },
              { tag: 'Warehouse', title: 'Stock Count Discrepancies', body: 'Stock count discrepancies trending upward in warehouse ops.', action: 'Audit inventory management process.' },
              { tag: 'Response', title: 'Slow First Action Time', body: 'Average first action time exceeds 2 hours post-assignment.', action: 'Improve response time.' },
              { tag: 'Risk', title: 'Absenteeism Increase', body: 'Absenteeism rate rising in certain teams over 14 days.', action: 'Conduct operational risk assessment.' },
              { tag: 'Process', title: 'Low Completion Rate', body: 'Completion rate at 60% for certain task types.', action: 'Re-evaluate the process.' },
              { tag: 'Operator', title: 'Operator Performance Gap', body: 'Operator-level performance gap detected on same machine group.', action: 'Launch operator training program.' },
              { tag: 'Emergency', title: 'Non-Standard Deviations', body: 'Non-standard deviations observed in emergency procedures.', action: 'Audit procedure compliance.' },
              { tag: 'Heatmap', title: 'Overloaded Zone Detected', body: 'Operational density heatmap shows overloading in certain zones.', action: 'Optimize resource allocation.' },
              { tag: 'AssetIQ', title: 'Stock Depletion Forecast', body: 'Bearing stock will run out in 5 days at current consumption rate.', action: 'Create purchase request.' },
              { tag: 'QR', title: 'Abnormal QR Movement', body: '3x normal stock exits detected in Warehouse-3 in last 24 hours.', action: 'Alert warehouse manager.' },
              { tag: 'Batch/Lot', title: 'Expiring Batches', body: '12 batches/lots expiring within 7 days.', action: 'Create priority usage plan.' },
              { tag: 'Approval', title: 'Pending Stock Approvals', body: '8 stock action requests pending for over 24 hours.', action: 'Expedite approval chain.' },
              { tag: 'IoT Device', title: 'Device Responsible Alert', body: '3 IoT devices critical and responsible personnel not yet responded.', action: 'Activate backup responsible.' },
              { tag: 'Photo AI', title: 'Field Visual Anomaly', body: 'OperIQ photo analysis detected potential safety risk in field.', action: 'Initiate emergency field inspection.' },
              { tag: 'Message', title: 'Unanswered Critical Messages', body: '5 critical department messages unanswered for over 24 hours.', action: 'Notify relevant managers.' },
              { tag: 'Facility', title: 'Facility Plan Anomaly', body: 'Abnormal temperature distribution detected in Zone-7 on 2D/3D map.', action: 'Check HVAC system.' },
            ]).map((insight, i) => {
              const colors: Record<string, string> = {
                'Bak\u0131m': '#f59e0b', Maintenance: '#f59e0b',
                '\u00dcretim': '#ef4444', Production: '#ef4444',
                'Ar\u0131za': '#dc2626', Failure: '#dc2626',
                Lojistik: '#8b5cf6', Logistics: '#8b5cf6',
                Saha: '#06b6d4', Field: '#06b6d4',
                Enerji: '#f97316', Energy: '#f97316',
                KPI: '#0891b2', 'E\u011fitim': '#14b8a6', Training: '#14b8a6',
                IoT: '#6366f1', 'G\u00f6rev': '#0d9488', Tasks: '#0d9488',
                Kalite: '#e11d48', Quality: '#e11d48',
                Depo: '#7c3aed', Warehouse: '#7c3aed',
                'M\u00fcdahale': '#2563eb', Response: '#2563eb',
                Risk: '#dc2626', 'S\u00fcre\u00e7': '#0891b2', Process: '#0891b2',
                'Operat\u00f6r': '#8b5cf6', Acil: '#ef4444', Emergency: '#ef4444',
                Harita: '#06b6d4', Heatmap: '#06b6d4',
                AssetIQ: '#059669', QR: '#0d9488', 'Parti/Lot': '#7c3aed', 'Batch/Lot': '#7c3aed',
                Onay: '#f59e0b', Approval: '#f59e0b', 'IoT Cihaz': '#6366f1', 'IoT Device': '#6366f1',
                'Foto Analiz': '#e11d48', 'Photo AI': '#e11d48', Mesaj: '#0891b2', Message: '#0891b2',
                Tesis: '#2563eb', Facility: '#2563eb',
              }
              const c = colors[insight.tag] || '#06b6d4'
              return (
                <Reveal key={i} delay={i * 40}>
                  <div
                    className="rounded-xl p-6 h-full transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1"
                    style={{
                      background: 'rgba(255,255,255,0.8)',
                      border: `1px solid ${c}20`,
                      backdropFilter: 'blur(8px)',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                    }}
                  >
                    <span className="inline-block px-3 py-1 rounded-md text-sm font-bold uppercase tracking-wider mb-3"
                      style={{ background: `${c}15`, color: c }}>
                      {insight.tag}
                    </span>
                    <h4 className="text-lg font-bold mb-2" style={{ color: '#0f2b3d' }}>{insight.title}</h4>
                    <p className="text-[15px] mb-4 leading-relaxed" style={{ color: 'rgba(15,43,61,0.6)' }}>{insight.body}</p>
                    <div className="flex items-start gap-2 pt-3" style={{ borderTop: `1px solid ${c}10` }}>
                      <ArrowRight size={16} style={{ color: c, marginTop: '2px', flexShrink: 0 }} />
                      <p className="text-[15px] font-semibold" style={{ color: c }}>{insight.action}</p>
                    </div>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ================================================================
          BENCHMARK / COMPARISON TABLE
          ================================================================ */}
      <section className="relative z-10 w-full py-24 overflow-hidden" style={{ background: 'linear-gradient(180deg, rgba(15,43,61,0.02) 0%, rgba(6,182,212,0.04) 50%, rgba(15,43,61,0.02) 100%)' }}>
        <div className="w-full px-4 lg:px-8 xl:px-12">
          {/* Header */}
          <Reveal>
            <div className="text-center mb-4">
              <span className="inline-block px-4 py-1.5 rounded-full text-sm font-bold tracking-wider uppercase"
                style={{ background: 'rgba(6,182,212,0.1)', color: '#0891b2', border: '1px solid rgba(6,182,212,0.2)' }}>
                Benchmark
              </span>
            </div>
          </Reveal>
          <Reveal>
            <div className="text-center mb-4">
              <h2 className="font-extrabold tracking-tight" style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', color: '#0891b2' }}>
                {t.benchmarkSupra}
              </h2>
            </div>
          </Reveal>
          <Reveal>
            <div className="text-center mb-4">
              <h3 className="font-extrabold tracking-tight" style={{ fontSize: 'clamp(36px, 5vw, 60px)', color: '#0f2b3d' }}>
                {t.benchmarkTitle}
              </h3>
            </div>
          </Reveal>
          <Reveal>
            <div className="text-center mb-6">
              <p className="text-xl max-w-2xl mx-auto font-medium" style={{ color: 'rgba(15,43,61,0.55)' }}>
                {t.benchmarkSubtitle}
              </p>
            </div>
          </Reveal>
          <Reveal>
            <div className="text-center mb-14">
              <p className="text-lg max-w-3xl mx-auto" style={{ color: 'rgba(15,43,61,0.5)' }}>
                {t.benchmarkDesc}
              </p>
            </div>
          </Reveal>

          {/* Table */}
          <Reveal>
            <div className="rounded-2xl overflow-x-auto glow-pulse mx-auto"
              style={{
                maxWidth: 'min(95%, 900px)',
                background: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(6,182,212,0.15)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
              }}>
              {/* Table header */}
              <div className="grid grid-cols-12 gap-0" style={{ background: 'linear-gradient(135deg, #0f2b3d, #1a3a4f)', borderBottom: '2px solid rgba(6,182,212,0.3)', minWidth: '600px' }}>
                <div className="col-span-4 px-3 md:px-8 py-4 md:py-6">
                  <span className="text-sm md:text-lg font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {lang === 'tr' ? 'Kriter' : 'Criteria'}
                  </span>
                </div>
                <div className="col-span-4 px-3 md:px-8 py-4 md:py-6 text-center" style={{ background: 'rgba(6,182,212,0.15)', borderLeft: '1px solid rgba(6,182,212,0.2)', borderRight: '1px solid rgba(6,182,212,0.2)' }}>
                  <span className="text-sm md:text-lg font-extrabold tracking-wider" style={{ color: '#22d3ee' }}>
                    {t.benchmarkCol1}
                  </span>
                </div>
                <div className="col-span-4 px-3 md:px-8 py-4 md:py-6 text-center">
                  <span className="text-sm md:text-lg font-bold tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {t.benchmarkCol2}
                  </span>
                </div>
              </div>

              {/* Table rows */}
              {(lang === 'tr' ? [
                ['Sistem tipi', 'Operational OS (Operasyonel \u0130\u015fletim Sistemi)', 'Par\u00e7al\u0131 sistemler (ERP / bak\u0131m / IT ayr\u0131 ayr\u0131)'],
                ['Saha (Field) y\u00f6netimi', 'G\u00fc\u00e7l\u00fc ve ger\u00e7ek zamanl\u0131', 'S\u0131n\u0131rl\u0131 veya yok'],
                ['Mobil deneyim', 'Mobil-first, kullan\u0131c\u0131 dostu', 'K\u0131s\u0131tl\u0131 veya karma\u015f\u0131k'],
                ['Yapay zeka (AI)', 'Native AI (OperIQ)', 'S\u0131n\u0131rl\u0131 veya mod\u00fcl bazl\u0131'],
                ['Operasyonel AI asistan\u0131', 'Var (Guided AI - aksiyon ald\u0131r\u0131r)', 'Yok'],
                ['NLP ile veri g\u00f6rselle\u015ftirme', 'Var (do\u011fal dil ile dashboard olu\u015fturma)', 'Yok'],
                ['Canl\u0131 harita', 'Var (operasyon haritas\u0131)', 'Yok'],
                ['Is\u0131 haritas\u0131 (Heatmap)', 'Var', 'Yok'],
                ['IoT entegrasyonu', 'Native', 'Ek mod\u00fcl veya s\u0131n\u0131rl\u0131'],
                ['Stok ve envanter y\u00f6netimi', 'Var (depo/raf/lokasyon bazl\u0131, yedek par\u00e7a takibi)', 'S\u0131n\u0131rl\u0131'],
                ['AI ile veri y\u00fckleme (Excel/CSV/SQL)', 'Var (AI veri anlama ve otomatik y\u00fckleme)', 'Yok'],
                ['KPI y\u00f6netimi', 'Core feature (5 katmanl\u0131, 7800+ \u015fablon)', 'Ayr\u0131 mod\u00fcller'],
                ['Otomasyon motoru', 'Var (tetikleyici-ko\u015ful-aksiyon ile tam otomasyon)', 'S\u0131n\u0131rl\u0131 veya ek yaz\u0131l\u0131m gerektirir'],
                ['\u0130\u015f ak\u0131\u015f\u0131 olu\u015fturucu', 'Var (g\u00f6rsel s\u00fcr\u00fckle-b\u0131rak tasar\u0131mc\u0131)', 'Yok veya \u00e7ok karma\u015f\u0131k'],
                ['Dosya y\u00f6netimi', 'Var (rol bazl\u0131, platform i\u00e7i salt okunur g\u00f6r\u00fcnt\u00fcleme)', 'S\u0131n\u0131rl\u0131 (sadece y\u00fckleme/indirme)'],
                ['Mobil merkez & g\u00f6rev yay\u0131n\u0131', 'Var (anl\u0131k yay\u0131n, cihaz y\u00f6netimi)', 'Yok'],
                ['\u00c7ok tipli form \u015fablonlar\u0131', 'Var (6 tip, 11+ haz\u0131r \u015fablon)', 'S\u0131n\u0131rl\u0131 (tek tip)'],
                ['Acil durum eylem planlar\u0131', 'Var', 'Genellikle yok'],
                ['Teknik dok\u00fcman analizi', 'Var (AI destekli analiz)', 'Yok'],
                ['Mesajla\u015fma / ileti\u015fim', 'Var (operasyonel mesajla\u015fma)', 'Yok'],
                ['\u00c7ok departmanl\u0131 yap\u0131', '15+ sekt\u00f6r uyumlu', 'S\u0131n\u0131rl\u0131'],
                ['Kurulum s\u00fcresi', 'G\u00fcnler i\u00e7inde kurulum', 'Aylar s\u00fcren kurulum'],
                ['Fiyatland\u0131rma', '\u20ba5.900 / departman + \u20ba180 / mobil kullan\u0131c\u0131', 'Y\u00fcksek maliyetli'],
                ['Kullan\u0131m kolayl\u0131\u011f\u0131', '\u00c7ok kolay', '\u00d6\u011frenmesi zor'],
                ['Esneklik', '\u00c7ok y\u00fcksek', 'D\u00fc\u015f\u00fck veya s\u0131n\u0131rl\u0131'],
                ['QR kod stok y\u00f6netimi', 'Var (AssetIQ - mobil QR tarama)', 'Yok'],
                ['Parti/Lot & SKT takibi', 'Var (otomatik kontrol + uyar\u0131)', 'S\u0131n\u0131rl\u0131 veya yok'],
                ['Hiyerar\u015fik stok onay\u0131', 'Var (saha \u2192 m\u00fcd\u00fcr zinciri)', 'Yok'],
                ['Sat\u0131n alma bildirimi', 'Otomatik (dept m\u00fcd\u00fcr\u00fc + sat\u0131n alma)', 'Manuel'],
                ['IoT cihaz sorumlusu', 'Var (bildirim + rutin rapor)', 'Yok'],
                ['Tesis plan\u0131 2D/3D', 'Var (rotate, zoom, IoT yerle\u015ftirme)', 'Yok'],
                ['Mobil QR tarama & onay', 'Var (kamera + hiyerar\u015fik onay)', 'Yok'],
              ] : [
                ['System type', 'Operational OS', 'Fragmented systems (ERP / maintenance / IT separate)'],
                ['Field management', 'Powerful and real-time', 'Limited or none'],
                ['Mobile experience', 'Mobile-first, user-friendly', 'Limited or complex'],
                ['Artificial intelligence (AI)', 'Native AI (OperIQ)', 'Limited or module-based'],
                ['Operational AI assistant', 'Yes (Guided AI - drives actions)', 'No'],
                ['NLP data visualization', 'Yes (natural language dashboard creation)', 'No'],
                ['Live map', 'Yes (operations map)', 'No'],
                ['Heatmap', 'Yes', 'No'],
                ['IoT integration', 'Native', 'Add-on module or limited'],
                ['Stock & inventory management', 'Yes (warehouse/shelf/location-based, spare parts)', 'Limited'],
                ['AI data import (Excel/CSV/SQL)', 'Yes (AI data understanding & auto-import)', 'No'],
                ['KPI management', 'Core feature (5-layer, 7800+ templates)', 'Separate modules'],
                ['Automation engine', 'Yes (full trigger-condition-action automation)', 'Limited or requires extra software'],
                ['Workflow builder', 'Yes (visual drag-and-drop designer)', 'No or very complex'],
                ['File management', 'Yes (role-based, in-platform read-only viewing)', 'Limited (upload/download only)'],
                ['Mobile hub & task broadcast', 'Yes (instant broadcast, device management)', 'No'],
                ['Multi-type form templates', 'Yes (6 types, 11+ ready templates)', 'Limited (single type)'],
                ['Emergency action plans', 'Yes', 'Usually none'],
                ['Technical document analysis', 'Yes (AI-powered analysis)', 'No'],
                ['Messaging / communication', 'Yes (operational messaging)', 'No'],
                ['Multi-department structure', '15+ sector compatible', 'Limited'],
                ['Setup time', 'Days to setup', 'Months-long setup'],
                ['Pricing', '\u20ba5,900 / dept + \u20ba180 / mobile user', 'High cost'],
                ['Ease of use', 'Very easy', 'Hard to learn'],
                ['Flexibility', 'Very high', 'Low or limited'],
                ['QR code stock management', 'Yes (AssetIQ - mobile QR scan)', 'No'],
                ['Batch/Lot & expiry tracking', 'Yes (auto check + alerts)', 'Limited or none'],
                ['Hierarchical stock approval', 'Yes (field to manager chain)', 'No'],
                ['Purchase alerts', 'Automatic (dept manager + purchasing)', 'Manual'],
                ['IoT device responsible', 'Yes (alerts + routine reports)', 'No'],
                ['Facility plan 2D/3D', 'Yes (rotate, zoom, IoT placement)', 'No'],
                ['Mobile QR scan & approval', 'Yes (camera + hierarchical approval)', 'No'],
              ]).map((row, i) => {
                const isPrice = i === 22
                const actHas = !['Sinirli', 'Yok', 'Limited', 'No', 'None'].some(w => row[1].startsWith(w))
                const tradBad = ['Yok', 'Sinirli', 'No', 'Limited', 'Low', 'Dusuk', 'Kisitli', 'Parcali', 'Fragmented', 'Hard', 'Ogrenmesi', 'Aylar', 'Months', 'High', 'Yuksek', 'Usually', 'Genellikle', 'Ek modul', 'Add-on', 'Separate', 'Ayri'].some(w => row[2].includes(w))
                return (
                  <div
                    key={i}
                    className="benchmark-row benchmark-animate grid grid-cols-12 gap-0"
                    style={{
                      animationDelay: `${i * 0.04}s`,
                      background: isPrice ? 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(20,184,166,0.05))' : i % 2 === 0 ? 'transparent' : 'rgba(6,182,212,0.015)',
                      borderBottom: '1px solid rgba(6,182,212,0.06)',
                      minWidth: '600px',
                    }}
                  >
                    <div className="col-span-4 px-3 md:px-8 py-3 md:py-5 flex items-center">
                      <span className={`text-sm md:text-base font-semibold ${isPrice ? 'md:text-lg' : ''}`} style={{ color: isPrice ? '#0891b2' : '#0f2b3d' }}>
                        {row[0]}
                      </span>
                    </div>
                    <div className="col-span-4 px-3 md:px-8 py-3 md:py-5 flex items-center gap-2 justify-center text-center"
                      style={{ background: 'rgba(6,182,212,0.03)', borderLeft: '1px solid rgba(6,182,212,0.08)', borderRight: '1px solid rgba(6,182,212,0.08)' }}>
                      <span className="inline-block w-2.5 h-2.5 md:w-3 md:h-3 rounded-full flex-shrink-0" style={{ background: actHas ? '#06b6d4' : '#f59e0b' }} />
                      <span className={`text-sm md:text-base font-medium ${isPrice ? 'font-bold md:text-lg' : ''}`} style={{ color: isPrice ? '#0891b2' : '#1a2e3b' }}>
                        {row[1]}
                      </span>
                    </div>
                    <div className="col-span-4 px-3 md:px-8 py-3 md:py-5 flex items-center gap-2 justify-center text-center">
                      <span className="inline-block w-2.5 h-2.5 md:w-3 md:h-3 rounded-full flex-shrink-0" style={{ background: tradBad ? '#ef4444' : '#f59e0b' }} />
                      <span className="text-sm md:text-base" style={{ color: '#0f172a' }}>
                        {row[2]}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </Reveal>

          {/* CTA below table */}
          <Reveal>
            <div className="text-center mt-14">
              <p className="text-xl font-semibold mb-6" style={{ color: 'rgba(15,43,61,0.6)' }}>
                {t.benchmarkCta}
              </p>
              <button
                type="button"
                onClick={() => setContactOpen(true)}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                  color: '#fff',
                  boxShadow: '0 10px 40px rgba(6,182,212,0.3)',
                }}
              >
                {t.ctaDemo} <ArrowRight size={16} />
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================================================================
          MOBILE VIDEO - iPhone 17 Pro Max Mockup + TRY FOR FREE
          ================================================================ */}
      <section className="relative z-10 w-full overflow-hidden" style={{ background: '#0f172a' }}>
        {/* Decorative glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-20 blur-[120px] pointer-events-none"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full opacity-10 blur-[100px] pointer-events-none"
          style={{ background: 'radial-gradient(circle, #a78bfa 0%, transparent 70%)' }} />

        <div className="relative w-full py-20">
          {/* Try for Free animated text */}
          <Reveal>
            <div className="text-center mb-4">
              <button type="button" onClick={() => setContactOpen(true)} className="inline-block group cursor-pointer text-center">
                <h2
                  className="font-black tracking-tight bg-clip-text text-transparent animate-gradient-text"
                  style={{
                    fontSize: 'clamp(14px, 2vw, 24px)',
                    backgroundImage: 'linear-gradient(90deg, #06b6d4, #14b8a6, #a78bfa, #22d3ee, #06b6d4)',
                    backgroundSize: '400% 100%',
                    lineHeight: 1.2,
                  }}
                >
                  {t.tryFree}
                </h2>
                <div className="h-0.5 w-0 group-hover:w-2/3 mx-auto rounded-full transition-all duration-1000 mt-1.5"
                  style={{ background: 'linear-gradient(90deg, #06b6d4, #a78bfa, #14b8a6)' }} />
                <p className="text-[10px] mt-2 font-medium transition-all duration-500 group-hover:tracking-wider" style={{ color: 'rgba(148,163,184,0.8)' }}>
                  {lang === 'tr' ? '1 Ayl\u0131k \u00dccretsiz Deneme \u0130\u00e7in \u0130leti\u015fime Ge\u00e7in' : '1-Month Free Trial - Get in Touch'}
                </p>
              </button>
            </div>
          </Reveal>

          {/* iPhone Mockup */}
          <ScrollGrowIphone src="/images/ActLedger_Mobile_new.mov" />
        </div>
      </section>

      {/* ================================================================
          11. CTA SECTION
          ================================================================ */}
      <section className="relative z-10 w-full py-28">
        <div className="w-full px-6 lg:px-12 xl:px-20">
          <Reveal>
            <div
              className="relative max-w-5xl mx-auto text-center rounded-3xl p-12 lg:p-16 animate-pulsing-border overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(6,182,212,0.05), rgba(20,184,166,0.03))',
                border: '1px solid rgba(6,182,212,0.3)',
              }}
            >
              <div className="absolute inset-0 opacity-[0.06] pointer-events-none">
                <img src="/images/factory.PNG" alt="" className="absolute top-0 left-0 w-1/3 h-1/2 object-cover" />
                <img src="/images/warehouse.PNG" alt="" className="absolute top-0 right-0 w-1/3 h-1/2 object-cover" />
                <img src="/images/hospital.PNG" alt="" className="absolute bottom-0 left-1/3 w-1/3 h-1/2 object-cover" />
              </div>
              <h2 className="font-extrabold tracking-tight" style={{ fontSize: 'clamp(42px, 5vw, 60px)', color: '#0f2b3d' }}>
                {t.ctaTitle}
              </h2>
              <p className="text-xl mt-4 mx-auto whitespace-nowrap" style={{ color: 'rgba(15,43,61,0.55)' }}>
                {t.ctaSubtitle}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 mt-10">
                <button
                  type="button"
                  onClick={() => setContactOpen(true)}
                  className="flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                    color: '#0f2b3d',
                    boxShadow: '0 10px 40px rgba(6,182,212,0.3)',
                  }}
                >
                  {t.ctaDemo} <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================================================================
          CONTACT FORM MODAL
          ================================================================ */}
      {contactOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
          <div
            className="relative w-full max-w-lg rounded-2xl p-8 max-h-[90vh] overflow-y-auto"
            style={{
              background: 'linear-gradient(135deg, #0f172a, #1a2e3b)',
              border: '1px solid rgba(6,182,212,0.25)',
              boxShadow: '0 30px 80px rgba(0,0,0,0.5), 0 0 60px rgba(6,182,212,0.1)',
            }}
          >
            <button type="button" onClick={() => { setContactOpen(false); setContactResult(null) }}
              className="absolute top-4 right-4 p-2 rounded-lg transition-all duration-200 hover:scale-110"
              style={{ background: 'rgba(255,255,255,0.1)' }}>
              <X size={18} style={{ color: '#94a3b8' }} />
            </button>
            <h3 className="text-2xl font-extrabold mb-6" style={{ color: '#22d3ee' }}>{t.contactTitle}</h3>

            {contactResult === 'success' ? (
              <div className="text-center py-8">
                <CheckCircle2 size={48} style={{ color: '#22d3ee', margin: '0 auto 16px' }} />
                <p className="text-xl font-bold" style={{ color: '#e2e8f0' }}>{t.contactSuccess}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {([
                  { key: 'name', label: t.contactName, type: 'text' },
                  { key: 'email', label: t.contactEmail, type: 'email' },
                  { key: 'company', label: t.contactCompany, type: 'text' },
                  { key: 'sector', label: t.contactSector, type: 'text' },
                  { key: 'interest', label: t.contactInterest, type: 'text' },
                ] as const).map(({ key, label, type }) => (
                  <div key={key}>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color: 'rgba(226,232,240,0.7)' }}>{label}</label>
                    <input
                      type={type}
                      value={contactForm[key]}
                      onChange={e => setContactForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl text-base outline-none transition-all duration-200 focus:ring-2"
                      style={{
                        background: 'rgba(255,255,255,0.07)',
                        border: '1px solid rgba(6,182,212,0.2)',
                        color: '#e2e8f0',
                      }}
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: 'rgba(226,232,240,0.7)' }}>{t.contactMessage}</label>
                  <textarea
                    value={contactForm.message}
                    onChange={e => setContactForm(f => ({ ...f, message: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl text-base outline-none transition-all duration-200 resize-none focus:ring-2"
                    style={{
                      background: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(6,182,212,0.2)',
                      color: '#e2e8f0',
                    }}
                  />
                </div>
                {contactResult === 'error' && (
                  <p className="text-sm font-medium" style={{ color: '#f87171' }}>{t.contactError}</p>
                )}
                <button
                  type="button"
                  onClick={handleContact}
                  disabled={contactLoading || !contactForm.name || !contactForm.email}
                  className="w-full py-3.5 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-[1.02] disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                    color: '#fff',
                    boxShadow: '0 8px 30px rgba(6,182,212,0.3)',
                  }}
                >
                  {contactLoading ? <Loader2 size={20} className="animate-spin mx-auto" /> : t.contactSend}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================
          12. COOKIE CONSENT
          ================================================================ */}
      {cookieConsent === null && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 transition-all duration-500"
          style={{
            background: 'rgba(10,22,40,0.98)',
            borderTop: '1px solid rgba(6,182,212,0.2)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="w-full px-4 sm:px-6 lg:px-12 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <Cookie size={22} style={{ color: '#22d3ee' }} />
              <p className="text-lg font-bold" style={{ color: '#ffffff' }}>{t.cookieText}</p>
            </div>

            {/* Cookie categories */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {/* Zorunlu cerezler */}
              <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(6,182,212,0.15)' }}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-base font-bold" style={{ color: '#22d3ee' }}>{t.cookieNecessaryTitle}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(6,182,212,0.2)', color: '#22d3ee' }}>{t.cookieAlwaysOn}</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{t.cookieNecessaryDesc}</p>
              </div>
              {/* Opsiyonel cerezler */}
              <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(6,182,212,0.15)' }}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-base font-bold" style={{ color: '#22d3ee' }}>{t.cookieOptionalTitle}</p>
                  <button
                    type="button"
                    onClick={() => setOptionalCookies(!optionalCookies)}
                    className="relative w-10 h-5 rounded-full transition-all duration-300"
                    style={{ background: optionalCookies ? '#06b6d4' : 'rgba(255,255,255,0.15)' }}
                  >
                    <span
                      className="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-300"
                      style={{ background: '#ffffff', left: optionalCookies ? '22px' : '2px' }}
                    />
                  </button>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{t.cookieOptionalDesc}</p>
              </div>
            </div>

            {/* Policy detail */}
            <p className="text-xs mb-4 leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{t.cookiePolicyDetail}</p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => handleCookie(false)}
                className="px-5 py-2 rounded-lg font-bold text-base transition-all duration-300 hover:scale-105"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                {t.cookieDecline}
              </button>
              <button
                type="button"
                onClick={() => handleCookie(true, optionalCookies)}
                className="px-5 py-2 rounded-lg font-bold text-base transition-all duration-300 hover:scale-105"
                style={{ background: 'rgba(255,255,255,0.12)', color: '#ffffff', border: '1px solid rgba(6,182,212,0.3)' }}
              >
                {t.cookieAcceptSelected}
              </button>
              <button
                type="button"
                onClick={() => handleCookie(true, true)}
                className="px-5 py-2 rounded-lg font-bold text-base transition-all duration-300 hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)', color: '#ffffff' }}
              >
                {t.cookieAccept}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          13. FOOTER
          ================================================================ */}
      {/* ================================================================
          LOGIN MODAL
          ================================================================ */}
      {loginOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
          <div
            className="relative w-full max-w-md mx-4 rounded-2xl shadow-2xl overflow-hidden"
            style={{ background: '#ffffff', border: '1px solid rgba(6,182,212,0.2)' }}
          >
            {/* Header */}
            <div className="px-7 pt-7 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="px-3 py-1.5 rounded-lg" style={{ background: '#0f172a' }}>
                  <BrandMark size={28} />
                </div>
                <div>
                  <h2 className="text-xl font-bold" style={{ color: '#0f2b3d' }}>{lang === 'tr' ? 'Giris Yap' : 'Sign In'}</h2>
                  <p className="text-[12px]" style={{ color: 'rgba(15,43,61,0.5)' }}>ActLedger</p>
                </div>
              </div>
              <button type="button" onClick={() => { setLoginOpen(false); setLoginError(null); setLogin2fa(false); setLogin2faSent(false) }} className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors">
                <X size={18} style={{ color: '#64748b' }} />
              </button>
            </div>

            <div className="px-7 pb-7 space-y-4">
              {/* Email */}
              <div>
                <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#334155' }}>
                  {lang === 'tr' ? 'E-posta Adresi' : 'Email Address'}
                </label>
                <input
                  className="w-full px-4 py-3 rounded-xl text-[14px] border outline-none transition-all focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400"
                  style={{ borderColor: '#e2e8f0', background: '#f8fafc' }}
                  type="email"
                  placeholder="ornek@sirket.com"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  autoFocus
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#334155' }}>
                  {lang === 'tr' ? 'Sifre' : 'Password'}
                </label>
                <div className="relative">
                  <input
                    className="w-full px-4 py-3 pr-12 rounded-xl text-[14px] border outline-none transition-all focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400"
                    style={{ borderColor: '#e2e8f0', background: '#f8fafc' }}
                    type={loginShowPass ? 'text' : 'password'}
                    placeholder={lang === 'tr' ? 'Sifrenizi girin' : 'Enter your password'}
                    value={loginPass}
                    onChange={e => setLoginPass(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  />
                  <button type="button" onClick={() => setLoginShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors">
                    {loginShowPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* 2FA Code (if enabled and sent) */}
              {login2fa && login2faSent && (
                <div>
                  <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#334155' }}>
                    {lang === 'tr' ? 'Dogrulama Kodu' : 'Verification Code'}
                  </label>
                  <input
                    className="w-full px-4 py-3 rounded-xl text-[14px] border outline-none transition-all focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 text-center tracking-[0.3em] font-mono"
                    style={{ borderColor: '#e2e8f0', background: '#f8fafc' }}
                    placeholder="------"
                    maxLength={6}
                    value={login2faCode}
                    onChange={e => setLogin2faCode(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  />
                  <p className="text-[11px] mt-1.5" style={{ color: '#06b6d4' }}>
                    {lang === 'tr' ? `Dogrulama kodu ${loginEmail} adresine gonderildi.` : `Verification code sent to ${loginEmail}.`}
                  </p>
                </div>
              )}

              {/* Remember me + 2FA toggle */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={loginRemember}
                    onChange={e => setLoginRemember(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-300 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span className="text-[12px] font-medium" style={{ color: '#475569' }}>
                    {lang === 'tr' ? 'Beni Hatirla' : 'Remember Me'}
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={login2fa}
                    onChange={e => { setLogin2fa(e.target.checked); setLogin2faSent(false); setLogin2faCode('') }}
                    className="w-4 h-4 rounded border-zinc-300 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span className="text-[12px] font-medium" style={{ color: '#475569' }}>
                    {lang === 'tr' ? '2 Faktorlu Giris' : '2-Factor Auth'}
                  </span>
                </label>
              </div>

              {/* Error */}
              {loginError && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-medium" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
                  <Shield size={14} />
                  {loginError}
                </div>
              )}

              {/* Submit */}
              <button
                type="button"
                onClick={handleLogin}
                disabled={loginLoading || !loginEmail || !loginPass}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-bold text-[15px] transition-all duration-300 hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100"
                style={{
                  background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                  color: '#ffffff',
                  boxShadow: '0 4px 20px rgba(6,182,212,0.3)',
                }}
              >
                {loginLoading ? <Loader2 size={18} className="animate-spin" /> : (
                  <>
                    {login2fa && !login2faSent
                      ? (lang === 'tr' ? 'Kod Gonder' : 'Send Code')
                      : (lang === 'tr' ? 'Giris Yap' : 'Sign In')
                    }
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <p className="text-center text-[11px]" style={{ color: '#94a3b8' }}>
                {lang === 'tr' ? 'Hesabiniz yok mu? Yoneticinize basvurun.' : "Don't have an account? Contact your administrator."}
              </p>
            </div>
          </div>
        </div>
      )}

      <footer id="contact" className="relative z-10 w-full py-16" style={{ borderTop: '1px solid rgba(6,182,212,0.15)', background: 'linear-gradient(180deg, rgba(15,33,55,0.95), rgba(10,22,40,0.98))' }}>
        <div className="w-full px-6 lg:px-12 xl:px-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            <div>
              <BrandMark size={32} variant="dark" />
              <p className="text-lg mt-4 leading-relaxed" style={{ color: '#22d3ee' }}>
                {t.footerDev}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <MapPin size={14} style={{ color: '#22d3ee' }} />
                <p className="text-base" style={{ color: '#06b6d4' }}>
                  Bogazici Universitesi Teknopark
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-bold mb-4" style={{ color: '#22d3ee' }}>{t.navContact}</h4>
              <div className="space-y-3">
                <a href="mailto:support@strategythrust.com" className="flex items-center gap-2 text-lg transition-colors duration-300 hover:text-cyan-400" style={{ color: '#ffffff' }}>
                  <Mail size={14} style={{ color: '#22d3ee' }} />
                  support@strategythrust.com
                </a>
                <a href="tel:+905322013416" className="flex items-center gap-2 text-lg transition-colors duration-300 hover:text-cyan-400" style={{ color: '#ffffff' }}>
                  <Phone size={14} style={{ color: '#ffffff' }} />
                  +90 532 201 3416
                </a>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-bold mb-4" style={{ color: '#ffffff' }}>Links</h4>
              <div className="space-y-3">
                <Link to={`/privacy?lang=${lang}`} className="block text-lg transition-colors duration-300 hover:text-cyan-400" style={{ color: '#ffffff' }}>
                  {t.footerPrivacy}
                </Link>
                <Link to={`/terms?lang=${lang}`} className="block text-lg transition-colors duration-300 hover:text-cyan-400" style={{ color: '#ffffff' }}>
                  {t.footerTerms}
                </Link>
                <a href="https://www.ataolai.tech" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-lg transition-colors duration-300 hover:text-cyan-400" style={{ color: '#ffffff' }}>
                  <ExternalLink size={12} />
                  www.ataolai.tech
                </a>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-bold mb-4" style={{ color: '#ffffff' }}>Social</h4>
              <a
                href="https://www.linkedin.com/company/ataol-ai-techs"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-lg font-semibold transition-all duration-300 hover:scale-105"
                style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', color: '#ffffff' }}
              >
                <Linkedin size={16} />
                LinkedIn
              </a>
            </div>
          </div>

          <div className="mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: '1px solid rgba(6,182,212,0.08)' }}>
            <p className="text-base" style={{ color: 'rgba(255,255,255,0.6)' }}>
              &copy; 2026 ActLedger. {t.footerRights} {t.footerDev}
            </p>
            <p className="text-base" style={{ color: 'rgba(255,255,255,0.5)' }}>
              ATAOL AI Techs
            </p>
          </div>
        </div>
      </footer>

      {/* OperIQ Landing Chatbot */}
      <OperIQChatbot lang={lang} />
    </div>
  )
}
