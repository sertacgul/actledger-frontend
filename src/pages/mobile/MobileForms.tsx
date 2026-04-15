import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileSpreadsheet, ChevronRight, Loader2 } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { api } from '../../lib/api'

interface FormTemplate {
  id: string
  name: string
  description?: string
  fieldCount: number
  departmentName?: string
}

export default function MobileForms() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<FormTemplate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<any>('/form-templates?active=true&pageSize=50')
      .then((res: any) => {
        const data = res.data ?? res
        const items = Array.isArray(data) ? data : []
        setTemplates(items.map((t: any) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          fieldCount: t.fields?.length ?? t._count?.fields ?? 0,
          departmentName: t.department?.name,
        })))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-lg font-bold text-slate-900">{t('m_forms_title')}</h1>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="text-cyan-500 animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16">
          <FileSpreadsheet size={36} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-medium">{t('m_forms_empty')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map(tmpl => (
            <button
              key={tmpl.id}
              type="button"
              onClick={() => navigate(`/m/form/${tmpl.id}`)}
              className="w-full bg-white rounded-xl border border-slate-200 p-4 text-left active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{tmpl.name}</p>
                  {tmpl.description && (
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{tmpl.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">
                      {tmpl.fieldCount} {t('m_nav_forms').toLowerCase()}
                    </span>
                    {tmpl.departmentName && (
                      <span className="text-[10px] text-slate-400">{tmpl.departmentName}</span>
                    )}
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
