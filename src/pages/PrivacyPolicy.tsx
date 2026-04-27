import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

interface Section {
  title: string
  body: string
  subsections?: { title: string; body: string }[]
  extra?: string
}

const CONTENT: Record<'tr' | 'en', { back: string; title: string; updated: string; langLabel: string; sections: Section[] }> = {
  tr: {
    back: 'Ana Sayfa',
    title: 'Gizlilik Politikas\u0131',
    updated: 'Son g\u00fcncelleme: Nisan 2026',
    langLabel: 'EN',
    sections: [
      {
        title: '1. Giri\u015f',
        body: 'ATAOL AI Techs ("biz", "bizim", "\u015firketimiz") ActLedger platformunu i\u015fletmektedir. Bu Gizlilik Politikas\u0131, platformumuzu kulland\u0131\u011f\u0131n\u0131zda bilgilerinizi nas\u0131l toplad\u0131\u011f\u0131m\u0131z\u0131, kulland\u0131\u011f\u0131m\u0131z\u0131, payla\u015ft\u0131\u011f\u0131m\u0131z\u0131 ve korudu\u011fumuzu a\u00e7\u0131klar.',
      },
      {
        title: '2. Toplad\u0131\u011f\u0131m\u0131z Bilgiler',
        body: 'Do\u011frudan sizin sa\u011flad\u0131\u011f\u0131n\u0131z bilgileri topluyoruz: ad, soyad, e-posta adresi, \u015firket bilgileri ve kullan\u0131m verileri. Ayr\u0131ca platforma girdi\u011finiz operasyonel verileri de topluyoruz: g\u00f6revler, raporlar, KPI de\u011ferleri, departman bilgileri ve saha foto\u011fraflar\u0131.',
      },
      {
        title: '3. Bilgilerinizi Nas\u0131l Kullan\u0131yoruz',
        body: 'Toplanan bilgileri platformu sa\u011flamak ve s\u00fcrd\u00fcrmek, kullan\u0131c\u0131 deneyimini iyile\u015ftirmek, OperIQ yapay zeka destekli analizler olu\u015fturmak, idari ileti\u015fimler g\u00f6ndermek ve yasal y\u00fck\u00fcml\u00fcl\u00fckleri yerine getirmek i\u00e7in kullan\u0131yoruz.',
      },
      {
        title: '4. Veri G\u00fcvenli\u011fi',
        body: '\u015eifreleme, eri\u015fim kontrolleri ve d\u00fczenli g\u00fcvenlik denetimleri dahil olmak \u00fczere end\u00fcstri standard\u0131 g\u00fcvenlik \u00f6nlemleri uyguluyoruz. T\u00fcm veriler aktar\u0131m s\u0131ras\u0131nda (TLS/SSL) ve depolama s\u0131ras\u0131nda (AES-256) \u015fifrelenir. Rol bazl\u0131 eri\u015fim kontrol\u00fc ile departman bazl\u0131 veri izolasyonu sa\u011flan\u0131r.',
      },
      {
        title: '5. Veri Saklama',
        body: 'Verilerinizi hesab\u0131n\u0131z aktif oldu\u011fu s\u00fcrece veya hizmetleri sa\u011flamak i\u00e7in gerekli oldu\u011fu s\u00fcrece sakl\u0131yoruz. Hesab\u0131n\u0131z\u0131 kapatt\u0131ktan sonra verileriniz 90 g\u00fcn i\u00e7inde silinir. Herhangi bir zamanda support@strategythrust.com adresine yazarak verilerinizin silinmesini talep edebilirsiniz.',
      },
      {
        title: '6. \u00c7erez Politikas\u0131',
        body: 'Platformumuz iki t\u00fcr \u00e7erez kullanmaktad\u0131r:',
        subsections: [
          {
            title: 'Zorunlu \u00c7erezler',
            body: 'Sitenin d\u00fczg\u00fcn \u00e7al\u0131\u015fmas\u0131 i\u00e7in gereklidir. Oturum y\u00f6netimi, g\u00fcvenlik tokenleri ve temel platform i\u015flevleri bu \u00e7erezlere ba\u011fl\u0131d\u0131r. Bu \u00e7erezler devre d\u0131\u015f\u0131 b\u0131rak\u0131lamaz.',
          },
          {
            title: '\u0130ste\u011fe Ba\u011fl\u0131 \u00c7erezler',
            body: 'Kullan\u0131c\u0131 deneyimini iyile\u015ftirmek, site kullan\u0131m istatistiklerini toplamak ve ki\u015fiselle\u015ftirilmi\u015f i\u00e7erik sunmak amac\u0131yla kullan\u0131l\u0131r. Bu \u00e7erezleri \u00e7erez banner\u0131 \u00fczerinden kabul veya reddetme hakk\u0131n\u0131z vard\u0131r. Tercihlerinizi istedi\u011finiz zaman de\u011fi\u015ftirebilirsiniz.',
          },
        ],
        extra: '\u00c7erezler hakk\u0131nda daha fazla bilgi i\u00e7in taray\u0131c\u0131n\u0131z\u0131n ayarlar\u0131ndan \u00e7erez tercihlerinizi y\u00f6netebilirsiniz. \u00c7erezleri tamamen devre d\u0131\u015f\u0131 b\u0131rakman\u0131z durumunda platformun baz\u0131 \u00f6zellikleri d\u00fczg\u00fcn \u00e7al\u0131\u015fmayabilir.',
      },
      {
        title: '7. \u00dc\u00e7\u00fcnc\u00fc Taraf Hizmetleri',
        body: 'Platformumuz operasyonel analitik i\u00e7in \u00fc\u00e7\u00fcnc\u00fc taraf yapay zeka hizmetlerini kullanabilir. \u00dc\u00e7\u00fcnc\u00fc taraf hizmetleri taraf\u0131ndan i\u015flenen t\u00fcm veriler, ilgili gizlilik politikalar\u0131na ve veri i\u015fleme s\u00f6zle\u015fmelerimize tabidir.',
      },
      {
        title: '8. Haklar\u0131n\u0131z (KVKK & GDPR)',
        body: 'Ki\u015fisel verilerinize eri\u015fme, d\u00fczeltme veya silme hakk\u0131n\u0131z vard\u0131r. Ayr\u0131ca i\u015flenmeye itiraz edebilir veya veri ta\u015f\u0131nabilirli\u011fini talep edebilirsiniz. 6698 say\u0131l\u0131 Ki\u015fisel Verilerin Korunmas\u0131 Kanunu (KVKK) ve AB Genel Veri Koruma T\u00fcz\u00fc\u011f\u00fc (GDPR) kapsam\u0131ndaki talepleriniz i\u00e7in support@strategythrust.com adresinden bize ula\u015f\u0131n.',
      },
      {
        title: '9. Politika De\u011fi\u015fiklikleri',
        body: 'Bu Gizlilik Politikas\u0131\u0027n\u0131 zaman zaman g\u00fcncelleyebiliriz. De\u011fi\u015fiklikler bu sayfada yay\u0131nlanacak ve \u00f6nemli de\u011fi\u015fiklikler i\u00e7in e-posta ile bildirim yap\u0131lacakt\u0131r.',
      },
      {
        title: '10. \u0130leti\u015fim',
        body: 'ATAOL AI Techs\nE-posta: support@strategythrust.com\nTelefon: +90 532 201 3416',
      },
    ],
  },
  en: {
    back: 'Home',
    title: 'Privacy Policy',
    updated: 'Last updated: April 2026',
    langLabel: 'TR',
    sections: [
      {
        title: '1. Introduction',
        body: 'ATAOL AI Techs ("we", "our", "us") operates the ActLedger platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.',
      },
      {
        title: '2. Information We Collect',
        body: 'We collect information you provide directly, including name, email address, company information, and usage data. We also collect operational data that you enter into the platform such as tasks, reports, KPIs, departmental information, and field photos.',
      },
      {
        title: '3. How We Use Your Information',
        body: 'We use collected information to provide and maintain the platform, improve user experience, generate AI-powered insights (OperIQ), send administrative communications, and comply with legal obligations.',
      },
      {
        title: '4. Data Security',
        body: 'We implement industry-standard security measures including encryption, access controls, and regular security audits. All data is encrypted in transit (TLS/SSL) and at rest (AES-256). Role-based access control ensures department-level data isolation.',
      },
      {
        title: '5. Data Retention',
        body: 'We retain your data for as long as your account is active or as needed to provide services. After account closure, your data is deleted within 90 days. You may request deletion of your data at any time by contacting support@strategythrust.com.',
      },
      {
        title: '6. Cookie Policy',
        body: 'Our platform uses two types of cookies:',
        subsections: [
          {
            title: 'Necessary Cookies',
            body: 'Required for the site to function properly. Session management, security tokens, and core platform features depend on these cookies. These cookies cannot be disabled.',
          },
          {
            title: 'Optional Cookies',
            body: 'Used to improve user experience, collect site usage statistics, and deliver personalized content. You have the right to accept or decline these cookies via the cookie banner. You can change your preferences at any time.',
          },
        ],
        extra: 'For more information about cookies, you can manage your cookie preferences through your browser settings. Disabling cookies entirely may cause some platform features to not function properly.',
      },
      {
        title: '7. Third-Party Services',
        body: 'Our platform may use third-party AI services for operational analytics. All data processed by third-party services is subject to their respective privacy policies and our data processing agreements.',
      },
      {
        title: '8. Your Rights (KVKK & GDPR)',
        body: 'You have the right to access, correct, or delete your personal data. You may also object to processing or request data portability. For KVKK (Turkish Data Protection Law) and GDPR requests, contact us at support@strategythrust.com.',
      },
      {
        title: '9. Policy Changes',
        body: 'We may update this Privacy Policy from time to time. Changes will be posted on this page and significant changes will be notified via email.',
      },
      {
        title: '10. Contact',
        body: 'ATAOL AI Techs\nEmail: support@strategythrust.com\nPhone: +90 532 201 3416',
      },
    ],
  },
}

export default function PrivacyPolicy() {
  const [searchParams] = useSearchParams()
  const initialLang = (searchParams.get('lang') === 'en' ? 'en' : 'tr') as 'tr' | 'en'
  const [lang, setLang] = useState<'tr' | 'en'>(initialLang)
  const c = CONTENT[lang]

  return (
    <div className="min-h-screen" style={{ background: '#0a1628' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm font-medium">
            <ArrowLeft size={16} /> {c.back}
          </Link>
          <button
            type="button"
            onClick={() => setLang(lang === 'tr' ? 'en' : 'tr')}
            className="px-3 py-1.5 rounded-lg text-sm font-bold transition-all duration-300 hover:scale-105"
            style={{ background: 'rgba(6,182,212,0.15)', color: '#22d3ee', border: '1px solid rgba(6,182,212,0.3)' }}
          >
            {c.langLabel}
          </button>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{c.title}</h1>
        <p className="text-sm text-slate-400 mb-10">{c.updated}</p>

        <div className="space-y-6 text-slate-300 leading-relaxed text-sm sm:text-base">
          {c.sections.map((section, i) => (
            <section key={i}>
              <h2 className="text-base sm:text-lg font-semibold text-white mt-8 mb-3">{section.title}</h2>
              <p className="whitespace-pre-line">{section.body}</p>
              {section.subsections && (
                <div className="mt-4 space-y-3 ml-4">
                  {section.subsections.map((sub, j) => (
                    <div key={j} className="rounded-lg p-4" style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)' }}>
                      <h3 className="text-sm sm:text-base font-bold mb-1" style={{ color: '#22d3ee' }}>{sub.title}</h3>
                      <p className="text-sm">{sub.body}</p>
                    </div>
                  ))}
                </div>
              )}
              {section.extra && (
                <p className="mt-3 text-sm" style={{ color: 'rgba(148,163,184,0.8)' }}>{section.extra}</p>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
