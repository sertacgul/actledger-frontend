import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, CheckCircle2, AlertTriangle, Send, MapPin } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { api } from '../../lib/api'
import { reportFieldAction } from '../../lib/hooks'

const SEVERITY_COLOR: Record<string, string> = {
  DUSUK: 'bg-zinc-100 text-zinc-600',
  ORTA: 'bg-blue-100 text-blue-700',
  YUKSEK: 'bg-amber-100 text-amber-700',
  KRITIK: 'bg-red-100 text-red-700',
}

export default function MobileReportAction() {
  const { id } = useParams<{ id: string }>()
  const { lang } = useLanguage()
  const tr = lang === 'tr'
  const navigate = useNavigate()
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [actionStatus, setActionStatus] = useState<'TAMAMLANDI' | 'SORUNLU'>('TAMAMLANDI')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!id) return
    api.get<any>(`/field-reports/${id}`)
      .then((res: any) => setReport(res.data ?? res))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      let gpsLatitude: number | undefined
      let gpsLongitude: number | undefined
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        )
        gpsLatitude = pos.coords.latitude
        gpsLongitude = pos.coords.longitude
      } catch {}

      await reportFieldAction(id!, {
        status: actionStatus,
        note: note.trim() || undefined,
        gpsLatitude,
        gpsLongitude,
      })
      setSubmitted(true)
      setTimeout(() => navigate('/m/formlar', { replace: true }), 1500)
    } catch (e: any) {
      setError(e?.message || (tr ? 'Islem gonderilemedi' : 'Failed to submit'))
    } finally { setSubmitting(false) }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-cyan-500 animate-spin" /></div>

  if (submitted) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <CheckCircle2 size={48} className="text-green-500 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">{tr ? 'Islem kaydedildi' : 'Action recorded'}</p>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="p-4">
        <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-cyan-600 font-medium mb-4">
          <ArrowLeft size={16} /> {tr ? 'Geri' : 'Back'}
        </button>
        <p className="text-sm text-slate-500">{tr ? 'Rapor bulunamadi' : 'Report not found'}</p>
      </div>
    )
  }

  return (
    <div className="p-4 pb-8 space-y-4">
      <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-cyan-600 font-medium">
        <ArrowLeft size={16} /> {tr ? 'Geri' : 'Back'}
      </button>

      {/* Report Info */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={16} className="text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900">{report.title}</p>
            {report.description && <p className="text-xs text-slate-500 mt-1">{report.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${SEVERITY_COLOR[report.severity] ?? SEVERITY_COLOR.ORTA}`}>
            {report.severity}
          </span>
          {report.department?.name && (
            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{report.department.name}</span>
          )}
          {report.author?.name && (
            <span className="text-[10px] text-slate-400">{tr ? 'Atayan' : 'By'}: {report.author.name}</span>
          )}
        </div>
      </div>

      {/* Action Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">{tr ? 'Islem Yap' : 'Take Action'}</p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActionStatus('TAMAMLANDI')}
            className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-colors ${
              actionStatus === 'TAMAMLANDI' ? 'bg-green-50 border-green-400 text-green-700' : 'border-slate-200 text-slate-500'
            }`}
          >
            <CheckCircle2 size={16} className="mx-auto mb-1" />
            {tr ? 'Tamamlandi' : 'Completed'}
          </button>
          <button
            type="button"
            onClick={() => setActionStatus('SORUNLU')}
            className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-colors ${
              actionStatus === 'SORUNLU' ? 'bg-red-50 border-red-400 text-red-700' : 'border-slate-200 text-slate-500'
            }`}
          >
            <AlertTriangle size={16} className="mx-auto mb-1" />
            {tr ? 'Sorun Var' : 'Issue Found'}
          </button>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            {tr ? 'Not / Aciklama' : 'Note / Description'}
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={tr ? 'Saha notunuzu yazin...' : 'Write your field note...'}
            className="w-full px-3 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-cyan-500 min-h-[80px]"
          />
        </div>

        {error && <p className="text-xs text-red-600 text-center">{error}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3.5 rounded-xl bg-cyan-600 text-white font-semibold text-sm active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <><Send size={14} /> {tr ? 'Gonder' : 'Submit'}</>}
        </button>
      </div>
    </div>
  )
}
