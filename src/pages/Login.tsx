import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Eye, EyeOff, ArrowRight, AlertCircle, ExternalLink,
  Sparkles, TrendingUp, Activity, MapPin, CheckCircle2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCompany } from '../context/CompanyContext'
import { SECTORS } from '../data/sectors'
import BrandMark from '../components/ui/BrandMark'

const DEMO_USERS = [
  { email: 'admin@actledger.io',             name: 'Platform Admin', label: 'Admin (KAM)',  admin: true },
  { email: 'ahmet.kaya@yildizmetal.com',    name: 'Ahmet Kaya',    label: 'Genel Mudur',  admin: false },
  { email: 'fatma.demir@yildizmetal.com',   name: 'Fatma Demir',   label: 'Uretim Muduru', admin: false },
  { email: 'ayse.celik@yildizmetal.com',    name: 'Ayse Celik',    label: 'Supervizon',   admin: false },
  { email: 'ali.sahin@yildizmetal.com',     name: 'Ali Sahin',     label: 'Teknisyen',    admin: false },
]

const DEMO_PASSWORD = 'Actledger2024!'

/* ── Animated count-up ─────────────────────────────────────── */
function Counter({ to, suffix = '', duration = 1400 }: { to: number; suffix?: string; duration?: number }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setN(Math.round(to * eased))
      if (t < 1) requestAnimationFrame(tick)
    }
    const id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [to, duration])
  return <span>{n.toLocaleString('tr-TR')}{suffix}</span>
}

/* ── Animated dashboard mockup (right side of hero) ─────────── */
function DashboardMockup() {
  // Live ticking numbers for the mockup KPIs
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 2000)
    return () => clearInterval(id)
  }, [])

  // Bars that animate on tick
  const bars = [62, 84, 71, 95, 58, 78, 88]
  const offset = (tick * 7) % bars.length
  const animatedBars = [...bars.slice(offset), ...bars.slice(0, offset)]

  return (
    <div className="relative w-full">
      {/* Soft glow halo */}
      <div className="absolute inset-0 -z-10 blur-3xl opacity-50">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-cyan-300/30" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-indigo-300/30" />
      </div>

      {/* Main mockup card */}
      <div className="relative rounded-2xl border border-zinc-200 bg-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.18)] p-5 transform rotate-1 hover:rotate-0 transition-transform duration-700">
        {/* Header strip */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
              <Activity size={13} className="text-white" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-zinc-900">Kokpit</p>
              <p className="text-[9px] text-zinc-400">Üretim & İmalat</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-bold text-emerald-700">Canlı</span>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'Toplam',     value: <Counter to={248} key={`t-${tick}`} />, tone: 'text-zinc-900',     bg: 'bg-zinc-50'    },
            { label: 'Tamamlanan', value: <Counter to={186} key={`c-${tick}`} />, tone: 'text-emerald-600',  bg: 'bg-emerald-50' },
            { label: 'Geciken',    value: <Counter to={12}  key={`o-${tick}`} />, tone: 'text-red-600',      bg: 'bg-red-50'     },
          ].map(k => (
            <div key={k.label} className={`rounded-lg ${k.bg} p-2.5`}>
              <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">{k.label}</p>
              <p className={`text-[20px] font-extrabold leading-none mt-1 ${k.tone}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Mini bar chart */}
        <div className="mb-4">
          <div className="flex items-end gap-1.5 h-20">
            {animatedBars.map((h, i) => (
              <div
                key={`${tick}-${i}`}
                className="flex-1 rounded-t bg-gradient-to-t from-blue-500 to-cyan-400 transition-all duration-700 ease-out"
                style={{ height: `${h}%`, animationDelay: `${i * 60}ms` }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1.5">
            {['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'].map(d => (
              <span key={d} className="text-[8px] text-zinc-400 font-semibold">{d}</span>
            ))}
          </div>
        </div>

        {/* OperIQ insight row */}
        <div className="rounded-lg border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-cyan-50/60 p-2.5">
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-md bg-white border border-indigo-200 flex items-center justify-center flex-shrink-0">
              <Sparkles size={10} className="text-indigo-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold text-indigo-700 uppercase tracking-wider">OperIQ Önerisi</p>
              <p className="text-[10px] text-zinc-700 mt-0.5 leading-snug">
                Hat 2 yedek kapasitesi Hat 1'e yönlendirildiğinde günlük çıktı %18 artar.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating side card 1: trend pill */}
      <div className="absolute -top-4 -right-3 rounded-xl border border-zinc-200 bg-white shadow-lg px-3 py-2 flex items-center gap-2 animate-float-1">
        <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center">
          <TrendingUp size={13} className="text-emerald-600" />
        </div>
        <div>
          <p className="text-[9px] font-bold text-zinc-400 uppercase">Verimlilik</p>
          <p className="text-[14px] font-extrabold text-zinc-900 leading-none">+12.4%</p>
        </div>
      </div>

      {/* Floating side card 2: location pin */}
      <div className="absolute -bottom-3 -left-3 rounded-xl border border-zinc-200 bg-white shadow-lg px-3 py-2 flex items-center gap-2 animate-float-2">
        <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
          <MapPin size={13} className="text-blue-600" />
        </div>
        <div>
          <p className="text-[9px] font-bold text-zinc-400 uppercase">Aktif Saha</p>
          <p className="text-[14px] font-extrabold text-zinc-900 leading-none">23 nokta</p>
        </div>
      </div>
    </div>
  )
}

export default function Login() {
  const { login, error: authError } = useAuth()
  const { config } = useCompany()
  const navigate = useNavigate()

  const [email,       setEmail]       = useState(() => localStorage.getItem('actledger_remember_email') ?? DEMO_USERS[0].email)
  const [password,    setPassword]    = useState(DEMO_PASSWORD)
  const [showPass,    setShowPass]    = useState(false)
  const [rememberMe,  setRememberMe]  = useState(() => !!localStorage.getItem('actledger_remember_email'))
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [loading,     setLoading]     = useState(false)
  const [formError,   setFormError]   = useState<string | null>(null)

  const phrases = ['Sahadan kontrol odasına.', 'Veri konuşur, eylem doğar.', 'Operasyonun yeni katmanı.', 'Her departman, tek ekran.']
  const [phraseIdx, setPhraseIdx] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setPhraseIdx(i => (i + 1) % phrases.length), 3500)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDemoSelect = (idx: number) => {
    setSelectedIdx(idx)
    setEmail(DEMO_USERS[idx].email)
    setPassword(DEMO_PASSWORD)
    setFormError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setFormError(null)
    try {
      if (rememberMe) {
        localStorage.setItem('actledger_remember_email', email)
      } else {
        localStorage.removeItem('actledger_remember_email')
      }
      const loggedInUser = await login(email, password)
      navigate(loggedInUser?.role === 'platform_admin' ? '/admin' : '/panel')
    } catch (e: any) {
      setFormError(e.message ?? 'Giriş yapılamadı')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden text-zinc-900" style={{ background: '#FAF7F2' }}>

      {/* ── Pastel ambient blobs ───────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="light-blob light-blob-1" />
        <div className="light-blob light-blob-2" />
        <div className="light-blob light-blob-3" />
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.04) 1px, transparent 0)',
          backgroundSize: '36px 36px',
        }} />
      </div>

      {/* ── Top nav ──────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-6">
        <BrandMark size={36} variant="light" />
        <div className="hidden md:flex items-center gap-6 text-[13px] font-semibold text-zinc-600">
          <Link to="/" className="hover:text-zinc-900 transition-colors">Tanıtım</Link>
          <a href="#sektorler" className="hover:text-zinc-900 transition-colors">Sektörler</a>
        </div>
        <a
          href="#login"
          className="flex items-center gap-1.5 text-[12px] font-semibold text-zinc-600 hover:text-zinc-900"
        >
          Giriş <ExternalLink size={11} />
        </a>
      </nav>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 pt-8 pb-20">

        {/* ── HERO ROW: text on left, mockup on right ────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-20">

          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-200 bg-white/70 backdrop-blur-sm mb-7">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-700">
                Saha operasyonu için kontrol katmanı
              </span>
            </div>

            <h1 className="text-[52px] sm:text-[68px] xl:text-[84px] font-extrabold leading-[0.92] tracking-[-0.025em] text-zinc-900">
              Sahanın nabzı,
              <br />
              <span className="bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
                tek bakışta.
              </span>
            </h1>

            {/* Cycling phrase */}
            <div className="mt-6 h-7 overflow-hidden">
              <p key={phraseIdx} className="text-[18px] text-zinc-500 font-medium animate-phrase-cycle">
                {phrases[phraseIdx]}
              </p>
            </div>

            <p className="text-[15px] text-zinc-500 max-w-xl mt-4 leading-relaxed">
              Saha personelinden gelen her görev, her rapor, her fotoğraf{' '}
              <span className="text-zinc-900 font-semibold">OperIQ</span> tarafından anlamlandırılır,
              yöneticilere bir komuta ekranı netliğinde sunulur.
            </p>

            {/* Stats strip */}
            <div className="grid grid-cols-3 gap-8 mt-12 pt-10 border-t border-zinc-200/80 max-w-xl">
              <div>
                <p className="text-[34px] font-extrabold tracking-tight text-zinc-900">
                  <Counter to={13} suffix="+" />
                </p>
                <p className="text-[11px] text-zinc-500 font-medium mt-1">Sektör profili</p>
              </div>
              <div>
                <p className="text-[34px] font-extrabold tracking-tight text-zinc-900">
                  <Counter to={47} suffix="+" />
                </p>
                <p className="text-[11px] text-zinc-500 font-medium mt-1">Modül</p>
              </div>
              <div>
                <p className="text-[34px] font-extrabold tracking-tight text-zinc-900">24/7</p>
                <p className="text-[11px] text-zinc-500 font-medium mt-1">OperIQ izleme</p>
              </div>
            </div>
          </div>

          {/* Mockup column */}
          <div className="lg:col-span-5">
            <DashboardMockup />
          </div>
        </div>

        {/* ── LOGIN CARD (large) ──────────────────────────────────── */}
        <div id="login" className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-center">

          {/* Left side text */}
          <div className="lg:col-span-2">
            <div className="inline-flex items-center gap-2 mb-4">
              <CheckCircle2 size={14} className="text-cyan-500" />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                Demo erişimi açık
              </span>
            </div>
            <h2 className="text-[32px] sm:text-[42px] font-extrabold leading-[1.05] tracking-tight text-zinc-900">
              Kokpite giriş.
            </h2>
            <p className="text-[14px] text-zinc-500 mt-3 max-w-sm leading-relaxed">
              Demo rollerden birini seçin, hazır kullanıcılarla anında giriş yapın.
              Yetkilerinize göre platform sizi karşılayacak.
            </p>
          </div>

          {/* Login card */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-zinc-200 bg-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.12)] p-8 lg:p-10">
              <div className="mb-6">
                <h3 className="text-[22px] font-extrabold text-zinc-900 tracking-tight">
                  {config?.companyName ?? 'ActLedger'}
                </h3>
                <p className="text-[13px] text-zinc-500 mt-1">Hesabınıza erişin</p>
              </div>

              {/* Demo role selector */}
              <div className="mb-5 p-3 rounded-xl border border-cyan-100 bg-cyan-50/50">
                <p className="text-[10px] font-bold text-cyan-700 uppercase tracking-wider mb-2.5">
                  Demo modu - rol seçin
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {DEMO_USERS.map((du, idx) => (
                    <button
                      key={du.email}
                      type="button"
                      onClick={() => handleDemoSelect(idx)}
                      className={`text-left px-3 py-2 rounded-lg border text-[11px] transition-all ${
                        selectedIdx === idx
                          ? 'bg-white border-cyan-400 text-zinc-900 shadow-sm'
                          : 'border-zinc-200 bg-white/60 text-zinc-600 hover:border-zinc-300 hover:bg-white'
                      }`}
                    >
                      <p className="font-bold">{du.name.split(' ')[0]}</p>
                      <p className={`mt-0.5 text-[10px] ${selectedIdx === idx ? 'text-cyan-700' : 'text-zinc-400'}`}>
                        {du.label}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
                    E-posta
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setFormError(null) }}
                    placeholder="ad.soyad@sirket.com.tr"
                    className="w-full px-4 py-3 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-900 text-[14px] placeholder-zinc-400
                      focus:outline-none focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-100 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
                    Şifre
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setFormError(null) }}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 pr-11 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-900 text-[14px] placeholder-zinc-400
                        focus:outline-none focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-100 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors"
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Remember me */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-300 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span className="text-[12px] font-medium text-zinc-600">Beni Hatirla</span>
                </label>

                {(formError || authError) && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200">
                    <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                    <p className="text-[12px] text-red-700">{formError ?? authError}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3.5 mt-2 bg-zinc-900 text-white hover:bg-cyan-600 hover:scale-[1.01]
                    text-[14px] font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)]"
                >
                  {loading ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <> Giriş Yap <ArrowRight size={16} /> </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* ── Sectors marquee strip ───────────────────────────────── */}
        <div id="sektorler" className="mt-20 pt-10 border-t border-zinc-200/80">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.18em] text-center mb-5">
            Tek platform, sektörünüzün dilinde
          </p>
          <div className="marquee-mask-light">
            <div className="marquee-track">
              {[...SECTORS, ...SECTORS].map((s, i) => (
                <div
                  key={`${s.id}-${i}`}
                  className="flex items-center gap-2.5 px-4 py-2 rounded-full border border-zinc-200 bg-white text-[12px] font-semibold text-zinc-700 flex-shrink-0 shadow-sm"
                >
                  <span className="text-[15px]">{s.icon}</span>
                  <span>{s.shortName}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-zinc-400 mt-12">
          © {new Date().getFullYear()} ActLedger
        </p>
      </div>
    </div>
  )
}
