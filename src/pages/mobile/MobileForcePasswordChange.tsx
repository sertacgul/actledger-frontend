import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { api } from '../../lib/api'

export default function MobileForcePasswordChange() {
  const { t } = useLanguage()
  const navigate = useNavigate()

  const [newPass, setNewPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPass !== confirm) { setError(t('m_password_mismatch')); return }
    if (newPass.length < 8) { setError('Min 8 karakter'); return }

    setLoading(true)
    setError(null)
    try {
      const res = await api.post<{ accessToken: string }>('/mobile-auth/change-password', { newPassword: newPass })
      // Update token
      const { tokenStore } = await import('../../lib/api')
      tokenStore.set(res.accessToken)
      setSuccess(true)
      setTimeout(() => navigate('/m/gorevler', { replace: true }), 1500)
    } catch (err: any) {
      setError(err.message ?? 'Hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-900 px-6" style={{ maxWidth: 480, margin: '0 auto' }}>
        <div className="text-center">
          <CheckCircle2 size={48} className="text-green-400 mx-auto mb-4" />
          <p className="text-lg font-bold text-white">{t('m_password_updated')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-slate-900 px-6 relative" style={{ maxWidth: 480, margin: '0 auto' }}>
      {/* Geri butonu */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="absolute left-4 flex items-center gap-1.5 text-slate-400 active:text-white py-2 px-3 rounded-lg"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
      >
        <ArrowLeft size={18} />
        <span className="text-sm font-medium">Geri</span>
      </button>

      <div className="w-12 h-12 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center mb-4">
        <Lock size={22} className="text-cyan-400" />
      </div>
      <h1 className="text-xl font-bold text-white mb-1">{t('m_change_password')}</h1>
      <p className="text-sm text-slate-400 mb-8 text-center">{t('m_change_password_desc')}</p>

      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
            {t('m_new_password')}
          </label>
          <input
            type="password"
            value={newPass}
            onChange={e => setNewPass(e.target.value)}
            placeholder="********"
            className="w-full px-4 py-3.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-lg
              placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
            {t('m_confirm_password')}
          </label>
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="********"
            className="w-full px-4 py-3.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-lg
              placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-300 text-center">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !newPass || !confirm}
          className="w-full py-4 rounded-xl font-bold text-base text-white transition-all
            bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400
            active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : null}
          {t('m_change_password')}
        </button>
      </form>
    </div>
  )
}
