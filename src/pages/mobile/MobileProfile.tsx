import { useNavigate } from 'react-router-dom'
import { LogOut, ChevronRight, Globe } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import { FlagTR, FlagUS } from '../../components/ui/Flags'

export default function MobileProfile() {
  const { t, lang, setLang } = useLanguage()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/m/giris', { replace: true })
  }

  const info = [
    { label: t('m_profile_department'), value: (user as any)?.departments?.[0]?.name ?? '-' },
    { label: t('m_profile_position'), value: (user as any)?.title ?? '-' },
    { label: 'E-posta', value: user?.email ?? '-' },
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
    </div>
  )
}
