import { useNavigate } from 'react-router-dom'
import { LogOut, ChevronRight, Globe, MapPin, BookOpen } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import { FlagTR, FlagUS } from '../../components/ui/Flags'

export default function MobileProfile() {
  const { t, lang, setLang } = useLanguage()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [showGuide, setShowGuide] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/m/giris', { replace: true })
  }

  const rawEmail = user?.email ?? ''
  const displayEmail = rawEmail.endsWith('@mobile.actledger.local') ? '' : rawEmail

  const info = [
    { label: t('m_profile_department'), value: (user as any)?.departments?.[0]?.name ?? '-' },
    { label: lang === 'tr' ? 'Alt Birim' : 'Sub-unit', value: (user as any)?.subUnit ?? '-' },
    { label: t('m_profile_position'), value: (user as any)?.title ?? '-' },
    { label: lang === 'tr' ? 'Gorev Tanimi' : 'Job Title', value: (user as any)?.jobTitle ?? '-' },
    { label: 'E-posta', value: displayEmail || '-' },
    { label: t('admin_mobile_phone'), value: (user as any)?.phone ?? '-' },
  ]

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-bold text-slate-900">{t('m_profile_title')}</h1>

      {/* User card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-700 font-bold text-lg">
          {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="text-base font-bold text-slate-900">{user?.name}</p>
          <p className="text-xs text-slate-400 capitalize">{t(`role_${user?.role}` as any)}</p>
        </div>
      </div>

      {/* Info */}
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {info.map(item => (
          <div key={item.label} className="px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{item.label}</span>
            <span className="text-sm text-slate-700">{item.value}</span>
          </div>
        ))}
      </div>

      {/* Location */}
      <LocationCard lang={lang} />

      {/* Language */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-semibold text-slate-500 mb-3">{t('m_profile_language')}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setLang('tr')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${
              lang === 'tr' ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200'
            }`}
          >
            <FlagTR size={20} />
            <span className="text-sm font-bold">Turkce</span>
          </button>
          <button
            type="button"
            onClick={() => setLang('en')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${
              lang === 'en' ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200'
            }`}
          >
            <FlagUS size={20} />
            <span className="text-sm font-bold">English</span>
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className="w-full bg-cyan-50 rounded-xl border border-cyan-200 p-4 flex items-center justify-between active:bg-cyan-100"
        >
          <span className="text-sm font-semibold text-cyan-700 flex items-center gap-2"><BookOpen size={16} /> {lang === 'tr' ? 'Mobil Kullanim Kılavuzu' : 'Mobile User Guide'}</span>
          <ChevronRight size={16} className="text-cyan-300" />
        </button>

        <button
          type="button"
          onClick={() => navigate('/m/sifre-degistir')}
          className="w-full bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between active:bg-slate-50"
        >
          <span className="text-sm font-semibold text-slate-700">{t('m_profile_change_pass')}</span>
          <ChevronRight size={16} className="text-slate-300" />
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full bg-red-50 rounded-xl border border-red-200 p-4 flex items-center justify-center gap-2 active:bg-red-100"
        >
          <LogOut size={16} className="text-red-600" />
          <span className="text-sm font-bold text-red-600">{t('m_profile_logout')}</span>
        </button>
      </div>

      <p className="text-center text-[10px] text-slate-400">
        {t('m_profile_version')}: 1.0.0
      </p>

      {/* Mobile Guide Modal */}
      {showGuide && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-white w-full max-h-[85vh] rounded-t-2xl overflow-y-auto animate-slideUp">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between z-10">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2"><BookOpen size={18} className="text-cyan-600" /> {lang === 'tr' ? 'Mobil Kullanim Kılavuzu' : 'Mobile User Guide'}</h3>
              <button type="button" onClick={() => setShowGuide(false)} className="p-1 rounded-full bg-slate-100"><ChevronRight size={16} className="rotate-90 text-slate-500" /></button>
            </div>
            <div className="p-4 space-y-4 text-[13px] text-slate-700">
              <GuideSection title={lang === 'tr' ? 'Giris' : 'Login'} items={[
                lang === 'tr' ? 'Admin tarafindan verilen giris kodu (ACT-XXXXXX) ve gecici sifre ile giris yapin.' : 'Login with the code (ACT-XXXXXX) and temporary password from your admin.',
                lang === 'tr' ? 'Ilk giriste sifrenizi degistirmeniz istenir.' : 'You will be asked to change your password on first login.',
              ]} />
              <GuideSection title={lang === 'tr' ? 'Gorevler' : 'Tasks'} items={[
                lang === 'tr' ? 'Alt menudeki "Gorevler" sekmesinde size atanan tum gorevleri gorun.' : 'See all tasks assigned to you in the "Tasks" tab.',
                lang === 'tr' ? 'Gorev detayina girerek checklist maddelerini isaretleyin ve durumu güncelleyin.' : 'Enter task detail to check items and update status.',
                lang === 'tr' ? 'Geciken gorevler kirmizi ile isaretlenir.' : 'Overdue tasks are marked in red.',
              ]} />
              <GuideSection title={lang === 'tr' ? 'Formlar' : 'Forms'} items={[
                lang === 'tr' ? '"Formlar" sekmesinden atanan form sablonunu secin ve doldurun.' : 'Select and fill assigned form templates from "Forms" tab.',
                lang === 'tr' ? 'Gerekirse fotograf ekleyebilirsiniz.' : 'Add photos if needed.',
              ]} />
              <GuideSection title={lang === 'tr' ? 'OperIQ Asistan' : 'OperIQ Assistant'} items={[
                lang === 'tr' ? 'Alt menudeki OperIQ ikonuna tıklayin ve gorev/departman ile ilgili sorular sorun.' : 'Tap OperIQ icon and ask questions about tasks/department.',
                lang === 'tr' ? 'Fotoğraf analizi için kamera ikonunu kullanin (gunluk 5 limit).' : 'Use camera icon for photo analysis (5/day limit).',
                lang === 'tr' ? 'AI size gorev bazli rehberlik, checklist ve teknik dokuman referansi sunar.' : 'AI provides task guidance, checklists and technical references.',
              ]} />
              <GuideSection title={lang === 'tr' ? 'Konum Paylasimi' : 'Location Sharing'} items={[
                lang === 'tr' ? 'Konum izni verdikten sonra konumunuz her 60 saniyede platforma gonderilir.' : 'After granting permission, your location is sent every 60 seconds.',
                lang === 'tr' ? 'Profil sayfanizda mevcut konumunuzu gorebilirsiniz.' : 'You can see your current location on the profile page.',
                lang === 'tr' ? 'Yoneticiler canli harita üzerinden konumunuzu gorebilir.' : 'Managers can see your location on the live map.',
              ]} />
              <GuideSection title={lang === 'tr' ? 'Mesajlasma' : 'Messaging'} items={[
                lang === 'tr' ? 'Bildirimler sekmesinden gelen mesajlari gorun.' : 'See incoming messages in the notifications tab.',
                lang === 'tr' ? 'Platform ve mobil kullanicilar arasi mesajlasma desteklenir.' : 'Messaging between platform and mobile users is supported.',
              ]} />
              <GuideSection title={lang === 'tr' ? 'Cevrimdisi Calisma' : 'Offline Mode'} items={[
                lang === 'tr' ? 'Internet baglantisi kesildiginde veriler cihazda saklanir.' : 'Data is stored locally when offline.',
                lang === 'tr' ? 'Baglanti geri geldiginde otomatik senkronize edilir.' : 'Auto-syncs when connection is restored.',
              ]} />
            </div>
          </div>
          <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } } .animate-slideUp { animation: slideUp 0.3s ease-out; }`}</style>
        </div>
      )}
    </div>
  )
}

function LocationCard({ lang }: { lang: string }) {
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null)
  const [err, setErr] = useState(false)

  useEffect(() => {
    if (!navigator.geolocation) { setErr(true); return }
    navigator.geolocation.getCurrentPosition(
      pos => setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setErr(true),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }, [])

  const formatDMS = (deg: number, isLat: boolean) => {
    const abs = Math.abs(deg)
    const d = Math.floor(abs)
    const m = Math.floor((abs - d) * 60)
    const s = ((abs - d - m / 60) * 3600).toFixed(1)
    const dir = isLat ? (deg >= 0 ? 'N' : 'S') : (deg >= 0 ? 'E' : 'W')
    return `${d}° ${m}' ${s}" ${dir}`
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <MapPin size={14} className="text-cyan-600" />
        <p className="text-xs font-semibold text-slate-500">{lang === 'tr' ? 'Konumum' : 'My Location'}</p>
      </div>
      {err ? (
        <p className="text-xs text-slate-400">{lang === 'tr' ? 'Konum bilgisi alinamadi' : 'Location unavailable'}</p>
      ) : !loc ? (
        <p className="text-xs text-slate-400">{lang === 'tr' ? 'Konum aliniyor...' : 'Getting location...'}</p>
      ) : (
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <span className="text-[11px] text-slate-500">{lang === 'tr' ? 'Enlem' : 'Latitude'}</span>
            <span className="text-[11px] font-mono font-semibold text-slate-700">{formatDMS(loc.lat, true)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[11px] text-slate-500">{lang === 'tr' ? 'Boylam' : 'Longitude'}</span>
            <span className="text-[11px] font-mono font-semibold text-slate-700">{formatDMS(loc.lng, false)}</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-slate-100">
            <span className="text-[10px] text-slate-400">Decimal</span>
            <span className="text-[10px] font-mono text-slate-500">{loc.lat.toFixed(6)}, {loc.lng.toFixed(6)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function GuideSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <p className="text-sm font-bold text-slate-800 mb-2">{title}</p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-[12px] text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5 flex-shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
