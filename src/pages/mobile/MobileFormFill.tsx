import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, CheckCircle2, Camera } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { api } from '../../lib/api'

interface TemplateField {
  id: string
  fieldId: string
  label: string
  type: string
  required: boolean
  options: string[]
  placeholder?: string
  order: number
}

export default function MobileFormFill() {
  const { id } = useParams<{ id: string }>()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [fields, setFields] = useState<TemplateField[]>([])
  const [values, setValues] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!id) return
    api.get<any>(`/form-templates/${id}`).then((res: any) => {
      const data = res.data ?? res
      setName(data.name ?? '')
      setFields((data.fields ?? []).sort((a: any, b: any) => a.order - b.order))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  const setValue = (fieldId: string, val: any) => {
    setValues(prev => ({ ...prev, [fieldId]: val }))
  }

  const handleSubmit = () => {
    // TODO: Send to backend or save offline
    setSubmitted(true)
    setTimeout(() => navigate('/m/formlar', { replace: true }), 1500)
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-cyan-500 animate-spin" /></div>

  if (submitted) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <CheckCircle2 size={48} className="text-green-500 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">{t('m_form_submit')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-4">
      <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 z-10">
        <button type="button" onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <p className="text-sm font-bold text-slate-900 truncate">{name}</p>
      </div>

      <div className="p-4 space-y-4">
        {fields.map(field => (
          <div key={field.id}>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              {field.label}
              {field.required && <span className="text-red-500 ml-0.5">*</span>}
            </label>

            {field.type === 'TEXT' && (
              <input type="text" placeholder={field.placeholder} value={values[field.fieldId] ?? ''}
                onChange={e => setValue(field.fieldId, e.target.value)}
                className="w-full px-3 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-cyan-500" />
            )}
            {field.type === 'TEXTAREA' && (
              <textarea placeholder={field.placeholder} value={values[field.fieldId] ?? ''} rows={3}
                onChange={e => setValue(field.fieldId, e.target.value)}
                className="w-full px-3 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-cyan-500 resize-none" />
            )}
            {field.type === 'NUMBER' && (
              <input type="number" placeholder={field.placeholder} value={values[field.fieldId] ?? ''}
                onChange={e => setValue(field.fieldId, e.target.value)}
                className="w-full px-3 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-cyan-500" />
            )}
            {field.type === 'BOOLEAN' && (
              <button type="button" onClick={() => setValue(field.fieldId, !values[field.fieldId])}
                className={`w-14 h-8 rounded-full transition-colors ${values[field.fieldId] ? 'bg-cyan-500' : 'bg-slate-300'}`}>
                <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform ${values[field.fieldId] ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            )}
            {field.type === 'SELECT' && (
              <select value={values[field.fieldId] ?? ''} onChange={e => setValue(field.fieldId, e.target.value)}
                className="w-full px-3 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-cyan-500 bg-white">
                <option value="">{t('common_select')}</option>
                {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            )}
            {field.type === 'DATE' && (
              <input type="date" value={values[field.fieldId] ?? ''}
                onChange={e => setValue(field.fieldId, e.target.value)}
                className="w-full px-3 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-cyan-500" />
            )}
            {field.type === 'PHOTO' && (
              <label className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-slate-300 cursor-pointer active:bg-slate-50">
                <Camera size={18} className="text-slate-400" />
                <span className="text-sm text-slate-500">{t('m_task_add_photo')}</span>
                <input type="file" accept="image/*" capture="environment" className="hidden" />
              </label>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={handleSubmit}
          className="w-full py-3.5 rounded-xl bg-cyan-600 text-white font-semibold text-sm active:scale-[0.98]"
        >
          {t('m_form_submit')}
        </button>
      </div>
    </div>
  )
}
