import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Smartphone, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import { FlagTR, FlagUS, FlagRU, FlagDE } from '../../components/ui/Flags'
import BrandMark from '../../components/ui/BrandMark'
import SplashScreen from '../../components/ui/SplashScreen'

export default function MobileLogin() {
  const { lang, setLang, t } = useLanguage()
  const { user, loading: authLoading, mobileLogin } = useAuth()
  const navigate = useNavigate()
  const autoLoginAttempted = useRef(false)

  const [showSplash, setShowSplash] = useState(() => {
    const seen = sessionStorage.getItem('actledger_mobile_splash_seen')
    return !seen
  })
  const [code, setCode] = useState(() => localStorage.getItem('actledger_mobile_code') ?? '')
  const [password, setPassword] = useState(() => localStorage.getItem('actledger_mobile_pass') ?? '')
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('actledger_mobile_code'))
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [autoLogging, setAutoLogging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Session already active (refresh token cookie worked) -> redirect ──
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/m/gorevler', { replace: true })
    }
  }, [authLoading, user, navigate])

  // ── Auto-login with saved credentials if refresh token failed ─────────
  useEffect(() => {
    if (authLoading || user || autoLoginAttempted.current) return
    const savedCode = localStorage.getItem('actledger_mobile_code')
    const savedPass = localStorage.getItem('actledger_mobile_pass')
    if (!savedCode || !savedPass) return

    autoLoginAttempted.current = true
    setAutoLogging(true)
    ;(async () => {
      try {
        const result = await mobileLogin(savedCode, savedPass)
        if (result.mustChangePassword) {
          navigate('/m/sifre-degistir', { replace: true })
        } else {
          navigate('/m/gorevler', { replace: true })
        }
      } catch {
        // Auto-login failed (password changed, account disabled, etc.)
        // Clear stale credentials and show login form
        localStorage.removeItem('actledger_mobile_code')
        localStorage.removeItem('actledger_mobile_pass')
        setCode('')
        setPassword('')
        setRememberMe(false)
        setAutoLogging(false)
      }
    })()
  }, [authLoading, user, mobileLogin, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim() || !password.trim()) return
    setLoading(true)
    setError(null)
    try {
      const result = await mobileLogin(code.trim(), password)
      // Save credentials if remember me is checked
      if (rememberMe) {
        localStorage.setItem('actledger_mobile_code', code.trim())
        localStorage.setItem('actledger_mobile_pass', password)
      } else {
        localStorage.removeItem('actledger_mobile_code')
        localStorage.removeItem('actledger_mobile_pass')
      }
      if (result.mustChangePassword) {
        navigate('/m/sifre-degistir', { replace: true })
      } else {
        navigate('/m/gorevler', { replace: true })
      }
    } catch (err: any) {
      setError(err.message ?? t('m_login_error'))
    } finally {
      setLoading(false)
    }
  }

  // Show splash, auth loading, or auto-login spinner
  if (showSplash) {
    return <SplashScreen onComplete={() => { sessionStorage.setItem('actledger_mobile_splash_seen', '1'); setShowSplash(false) }} />
  }

  if (authLoading || autoLogging) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-slate-900">
        <BrandMark size={36} />
        <Loader2 size={24} className="animate-spin text-cyan-400 mt-4" />
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-slate-900" style={{ maxWidth: 480, margin: '0 auto', overflowX: 'hidden' }}>
      {/* Header */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-2">
          <Smartphone size={28} className="text-cyan-400" />
          <BrandMark size={36} />
        </div>
        <p className="text-lg font-bold text-white tracking-tight mb-1">{t('m_brand')}</p>
        <p className="text-sm text-slate-400 mb-8">{t('m_login_title')}</p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          {/* Code */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              {t('m_login_code')}
            </label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder={t('m_login_code_placeholder')}
              autoComplete="off"
              className="w-full px-4 py-3.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-lg font-mono
                tracking-widest text-center placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              {t('m_login_password')}
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="********"
                className="w-full px-4 py-3.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-lg
                  placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1"
              >
                {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
            />
            <span className="text-sm text-slate-400">{lang === 'tr' ? 'Beni Hatirla' : 'Remember Me'}</span>
          </label>

          {/* Error */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-300 text-center">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !code.trim() || !password.trim()}
            className="w-full py-4 rounded-xl font-bold text-base text-white transition-all
              bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400
              active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> {t('common_loading')}</>
            ) : (
              t('m_login_button')
            )}
          </button>
        </form>
      </div>

      {/* Footer: language toggle */}
      <div className="flex items-center justify-center gap-3 pb-8">
        <button
          type="button"
          onClick={() => setLang('tr')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${
            lang === 'tr' ? 'bg-slate-700 text-white' : 'text-slate-500'
          }`}
        >
          <FlagTR size={18} />
          <span className="text-sm font-bold">TR</span>
        </button>
        <button
          type="button"
          onClick={() => setLang('en')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${
            lang === 'en' ? 'bg-slate-700 text-white' : 'text-slate-500'
          }`}
        >
          <FlagUS size={18} />
          <span className="text-sm font-bold">EN</span>
        </button>
      </div>
    </div>
  )
}
