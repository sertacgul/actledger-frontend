import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileSpreadsheet, FileText, ChevronRight, Loader2, AlertTriangle } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { api } from '../../lib/api'

interface FormTemplate {
  id: string
  name: string
  description?: string
  fieldCount: number
  departmentName?: string
}

interface AssignedReport {
  id: string
  title: string
  description?: string
  severity: string
  departmentName?: string
  authorName?: string
  createdAt: string
}

const SEVERITY_COLOR: Record<string, string> = {
  DUSUK: 'bg-zinc-100 text-zinc-600',
  ORTA: 'bg-blue-100 text-blue-700',
  YUKSEK: 'bg-amber-100 text-amber-700',
  KRITIK: 'bg-red-100 text-red-700',
}

export default function MobileForms() {
  const { t, lang } = useLanguage()
  const tr = lang === 'tr'
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<FormTemplate[]>([])
  const [reports, setReports] = useState<AssignedReport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get<any>('/form-templates?active=true&pageSize=50').catch(() => ({ data: [] })),
      api.get<any>('/field-reports?assignedToMe=true&pageSize=50').catch(() => ({ data: [] })),
    ]).then(([formRes, reportRes]) => {
      const formData = formRes.data ?? formRes
      const formItems = Array.isArray(formData) ? formData : []
      setTemplates(formItems.map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        fieldCount: t.fields?.length ?? t._count?.fields ?? 0,
        departmentName: t.department?.name,
      })))

      const reportData = reportRes.data ?? reportRes
      const reportItems = Array.isArray(reportData) ? reportData : []
      setReports(reportItems.map((r: any) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        severity: r.severity,
        departmentName: r.department?.name,
        authorName: r.author?.name,
        createdAt: r.createdAt,
      })))
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-lg font-bold text-slate-900">{t('m_forms_title')}</h1>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="text-cyan-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* Assigned Reports */}
          {reports.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                {tr ? 'Atanan Raporlar' : 'Assigned Reports'}
              </p>
              {reports.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => navigate(`/m/rapor/${r.id}`)}
                  className="w-full bg-amber-50 rounded-xl border border-amber-200 p-4 text-left active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-amber-600 flex-shrink-0" />
                        <p className="text-sm font-semibold text-slate-900">Rapor: {r.title}</p>
                      </div>
                      {r.description && (
                        <p className="text-xs text-slate-500 mt-0.5 truncate ml-5">{r.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 ml-5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${SEVERITY_COLOR[r.severity] ?? SEVERITY_COLOR.ORTA}`}>
                          {r.severity}
                        </span>
                        {r.authorName && (
                          <span className="text-[10px] text-slate-400">{r.authorName}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-amber-400 flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Form Templates */}
          {templates.length > 0 && (
            <div className="space-y-2">
              {reports.length > 0 && (
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-4">
                  {tr ? 'Form Sablonlari' : 'Form Templates'}
                </p>
              )}
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
                          {tmpl.fieldCount} {tr ? 'alan' : 'fields'}
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

          {templates.length === 0 && reports.length === 0 && (
            <div className="text-center py-16">
              <FileSpreadsheet size={36} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500 font-medium">{t('m_forms_empty')}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
