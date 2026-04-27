import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const CONTENT: Record<'tr' | 'en', { back: string; title: string; updated: string; langLabel: string; sections: { title: string; body: string }[] }> = {
  tr: {
    back: 'Ana Sayfa',
    title: 'Kullan\u0131m \u015eartlar\u0131',
    updated: 'Son g\u00fcncelleme: Nisan 2026',
    langLabel: 'EN',
    sections: [
      {
        title: '1. \u015eartlar\u0131n Kabul\u00fc',
        body: 'ATAOL AI Techs taraf\u0131ndan sa\u011flanan ActLedger platformuna eri\u015ferek veya kullanarak bu Kullan\u0131m \u015eartlar\u0131\u0027na ba\u011fl\u0131 olmay\u0131 kabul edersiniz. Kabul etmiyorsan\u0131z platformu kullanmay\u0131n\u0131z.',
      },
      {
        title: '2. Lisans',
        body: 'ActLedger kurumsal abonelik bazl\u0131 olarak lisanslan\u0131r. Lisans\u0131n\u0131z, platformu yaln\u0131zca kurulu\u015funuzun dahili operasyonlar\u0131 i\u00e7in kullanman\u0131za y\u00f6nelik m\u00fcnhas\u0131r olmayan, devredilemez bir eri\u015fim hakk\u0131 sa\u011flar.',
      },
      {
        title: '3. Kullan\u0131c\u0131 Sorumluluklar\u0131',
        body: 'Hesap bilgilerinizin gizlili\u011fini korumak, kurulu\u015funuz i\u00e7inde yetkili kullan\u0131m\u0131 sa\u011flamak ve y\u00fcr\u00fcrl\u00fckteki yasa ve y\u00f6netmeliklere uymak sizin sorumlulu\u011funuzdad\u0131r.',
      },
      {
        title: '4. Veri M\u00fclkiyeti',
        body: 'Platforma girdi\u011finiz t\u00fcm verilerin m\u00fclkiyeti size aittir. ATAOL AI Techs, operasyonel verileriniz, KPI\u0027leriniz, raporlar\u0131n\u0131z veya olu\u015fturdu\u011funuz herhangi bir i\u00e7erik \u00fczerinde m\u00fclkiyet hakk\u0131 talep etmez.',
      },
      {
        title: '5. Yapay Zeka Destekli \u00d6zellikler',
        body: 'OperIQ mod\u00fcl\u00fc, operasyonel i\u00e7g\u00f6r\u00fcler \u00fcretmek i\u00e7in yapay zeka kullan\u0131r. Bu i\u00e7g\u00f6r\u00fcler yaln\u0131zca \u00f6neri niteli\u011findedir ve profesyonel de\u011ferlendirmenin yerini almamal\u0131d\u0131r. ATAOL AI Techs, yapay zeka taraf\u0131ndan \u00fcretilen i\u00e7g\u00f6r\u00fclere dayanarak al\u0131nan kararlardan sorumlu de\u011fildir.',
      },
      {
        title: '6. Hizmet Kullan\u0131labilirli\u011fi',
        body: 'Y\u00fcksek kullan\u0131labilirlik i\u00e7in \u00e7al\u0131\u015f\u0131yoruz ancak kesintisiz hizmet garantisi vermiyoruz. Yerinde (on-premise) kurulumlar i\u00e7in kullan\u0131labilirlik altyap\u0131n\u0131za ba\u011fl\u0131d\u0131r. Planl\u0131 bak\u0131m \u00e7al\u0131\u015fmalar\u0131 \u00f6nceden bildirilecektir.',
      },
      {
        title: '7. Sorumluluk S\u0131n\u0131rlamas\u0131',
        body: 'ATAOL AI Techs, platformun kullan\u0131m\u0131ndan kaynaklanan dolayl\u0131, ar\u0131zi, \u00f6zel veya sonu\u00e7sal zararlardan sorumlu tutulamaz. Toplam sorumlulu\u011fumuz, talebin \u00f6ncesindeki 12 ayda \u00f6denen \u00fccretleri a\u015famaz.',
      },
      {
        title: '8. Fesih',
        body: 'Taraflardan herhangi biri 30 g\u00fcn \u00f6nceden yaz\u0131l\u0131 bildirimde bulunarak lisans s\u00f6zle\u015fmesini feshedebilir. Fesih \u00fczerine verilerinizi 90 g\u00fcn i\u00e7inde d\u0131\u015fa aktarabilirsiniz. Bu s\u00fcreden sonra veriler kal\u0131c\u0131 olarak silinecektir.',
      },
      {
        title: '9. Uygulanacak Hukuk',
        body: 'Bu \u015fartlar T\u00fcrkiye Cumhuriyeti yasalar\u0131na tabidir. Herhangi bir uyu\u015fmazl\u0131k \u0130stanbul mahkemelerinde \u00e7\u00f6z\u00fcmlenecektir.',
      },
      {
        title: '10. \u0130leti\u015fim',
        body: 'ATAOL AI Techs\nE-posta: support@strategythrust.com\nWeb: www.ataolai.tech',
      },
    ],
  },
  en: {
    back: 'Home',
    title: 'Terms of Use',
    updated: 'Last updated: April 2026',
    langLabel: 'TR',
    sections: [
      {
        title: '1. Acceptance of Terms',
        body: 'By accessing or using the ActLedger platform provided by ATAOL AI Techs, you agree to be bound by these Terms of Use. If you do not agree, do not use the platform.',
      },
      {
        title: '2. License',
        body: 'ActLedger is licensed on an enterprise subscription basis. Your license grants non-exclusive, non-transferable access to use the platform for your organization\'s internal operations only.',
      },
      {
        title: '3. User Responsibilities',
        body: 'You are responsible for maintaining the confidentiality of your account credentials, ensuring authorized use within your organization, and complying with applicable laws and regulations.',
      },
      {
        title: '4. Data Ownership',
        body: 'You retain ownership of all data you enter into the platform. ATAOL AI Techs does not claim ownership of your operational data, KPIs, reports, or any content you create.',
      },
      {
        title: '5. AI-Powered Features',
        body: 'The OperIQ module uses artificial intelligence to generate operational insights. These insights are recommendations only and should not replace professional judgment. ATAOL AI Techs is not liable for decisions made based on AI-generated insights.',
      },
      {
        title: '6. Service Availability',
        body: 'We strive for high availability but do not guarantee uninterrupted service. For on-premise deployments, availability depends on your infrastructure. Scheduled maintenance will be communicated in advance.',
      },
      {
        title: '7. Limitation of Liability',
        body: 'ATAOL AI Techs shall not be liable for indirect, incidental, special, or consequential damages arising from the use of the platform. Our total liability shall not exceed the fees paid in the 12 months preceding the claim.',
      },
      {
        title: '8. Termination',
        body: 'Either party may terminate the license agreement with 30 days written notice. Upon termination, you may export your data within 90 days. After this period, data will be permanently deleted.',
      },
      {
        title: '9. Governing Law',
        body: 'These terms are governed by the laws of the Republic of Turkey. Any disputes shall be resolved in the courts of Istanbul.',
      },
      {
        title: '10. Contact',
        body: 'ATAOL AI Techs\nEmail: support@strategythrust.com\nWeb: www.ataolai.tech',
      },
    ],
  },
}

export default function TermsOfUse() {
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
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
