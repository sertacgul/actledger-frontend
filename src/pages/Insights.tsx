import { useState } from 'react'
import { RefreshCw, ShieldAlert, AlertTriangle, Lightbulb, Info, Plus, Cpu, X } from 'lucide-react'
import clsx from 'clsx'
import { useGeminiInsights, generateInsight, useDepartments, type InsightAnalysisType } from '../lib/hooks'
import { useLanguage } from '../context/LanguageContext'
import type { TranslationKey } from '../i18n/translations'

const TYPE_CONFIG: Record<string, { icon: typeof ShieldAlert; text: string; bg: string; border: string; labelKey: TranslationKey }> = {
  risk:   { icon: ShieldAlert,   text: 'text-red-600',   bg: 'bg-red-50',   border: 'border-red-100',   labelKey: 'operiq_type_risk'       },
  uyari:  { icon: AlertTriangle, text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', labelKey: 'operiq_type_warning'    },
  oneri:  { icon: Lightbulb,     text: 'text-blue-600',  bg: 'bg-blue-50',  border: 'border-blue-100',  labelKey: 'operiq_type_suggestion' },
  bilgi:  { icon: Info,          text: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-100', labelKey: 'operiq_type_info'       },
}

const ANALYSIS_KEYS: { key: InsightAnalysisType; labelKey: TranslationKey; descKey: TranslationKey }[] = [
  { key: 'GENEL_OZET',            labelKey: 'operiq_at_general',    descKey: 'operiq_at_general_desc'    },
  { key: 'VERIMLILIK_ANALIZI',    labelKey: 'operiq_at_efficiency', descKey: 'operiq_at_efficiency_desc' },
  { key: 'RISK_DEGERLENDIRMESI',  labelKey: 'operiq_at_risk',       descKey: 'operiq_at_risk_desc'       },
  { key: 'GOREV_ONCELIKLENDIRME', labelKey: 'operiq_at_priority',   descKey: 'operiq_at_priority_desc'   },
  { key: 'DEPARTMAN_PERFORMANSI', labelKey: 'operiq_at_department', descKey: 'operiq_at_department_desc' },
  { key: 'ANORMALLIK_TESPITI',    labelKey: 'operiq_at_anomaly',    descKey: 'operiq_at_anomaly_desc'    },
]

const SEVERITY_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  KRITIK: { bg: 'bg-red-100 border-red-200', text: 'text-red-700', label: 'Kritik' },
  YUKSEK: { bg: 'bg-amber-100 border-amber-200', text: 'text-amber-700', label: 'Y\u00fcksek' },
  ORTA: { bg: 'bg-blue-100 border-blue-200', text: 'text-blue-700', label: 'Orta' },
  DUSUK: { bg: 'bg-zinc-100 border-zinc-200', text: 'text-zinc-600', label: 'D\u00fc\u015f\u00fck' },
}

function renderBold(text: string) {
  // Split by severity tags [KRITIK], [YUKSEK], [ORTA], [DUSUK] and bold **text**
  return text.split(/(\[(?:KRITIK|YUKSEK|ORTA|DUSUK)\]|\*\*[^*]+\*\*)/g).map((part, i) => {
    // Severity badge
    const sevMatch = part.match(/^\[(KRITIK|YUKSEK|ORTA|DUSUK)\]$/)
    if (sevMatch) {
      const s = SEVERITY_BADGE[sevMatch[1]]
      return <span key={i} className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border mr-1.5 ${s.bg} ${s.text}`}>{s.label}</span>
    }
    // Bold
    if (part.startsWith('**')) return <strong key={i} className="font-semibold text-slate-800">{part.slice(2, -2)}</strong>
    return <span key={i}>{part}</span>
  })
}

export default function Insights() {
  const { lang, t } = useLanguage()
  const [typeFilter,   setTypeFilter]   = useState<string>('tumu')
  const [generating,   setGenerating]   = useState(false)
  const [genError,     setGenError]     = useState<string | null>(null)
  const [showModal,    setShowModal]    = useState(false)
  const [genType,      setGenType]      = useState<InsightAnalysisType>('GENEL_OZET')
  const [genDeptId,    setGenDeptId]    = useState('')

  const { insights, loading, refetch } = useGeminiInsights()
  const { departments }                 = useDepartments()

  const filtered = typeFilter === 'tumu'
    ? insights
    : insights.filter(i => i.type === typeFilter)

  const handleGenerate = async () => {
    setGenerating(true)
    setGenError(null)
    try {
      await generateInsight(genType, genDeptId || undefined)
      refetch()
      setShowModal(false)
    } catch (e: any) {
      setGenError(e.message ?? t('operiq_error_default'))
    } finally {
      setGenerating(false)
    }
  }

  const PRIORITY_LABELS: Record<string, string> = {
    yuksek: t('operiq_priority_high'),
    orta:   t('operiq_priority_medium'),
    dusuk:  t('operiq_priority_low'),
  }

  return (
    <div className="max-w-3xl space-y-5">

      {/* OperIQ intro */}
      <div className="operiq-header rounded-lg p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-500/15 border border-teal-500/25 flex items-center justify-center flex-shrink-0">
            <Cpu size={18} className="text-teal-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold text-white tracking-tight">OperIQ</h2>
              <span className="operiq-badge">{t('operiq_engine_badge')}</span>
            </div>
            <p className="text-[11px] text-white/40 mt-0.5">
              {t('operiq_engine_subtitle')}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded border border-teal-500/30 bg-teal-500/15
            text-teal-300 hover:bg-teal-500/25 text-[12px] font-medium transition-colors flex-shrink-0"
        >
          <Plus size={13} /> {t('operiq_new_analysis')}
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-0.5 p-1 surface rounded-lg">
          {[
            { key: 'tumu',  labelKey: 'operiq_filter_all' as TranslationKey },
            { key: 'risk',  labelKey: 'operiq_type_risk' as TranslationKey },
            { key: 'uyari', labelKey: 'operiq_type_warning' as TranslationKey },
            { key: 'oneri', labelKey: 'operiq_type_suggestion' as TranslationKey },
            { key: 'bilgi', labelKey: 'operiq_type_info' as TranslationKey },
          ].map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setTypeFilter(tab.key)}
              className={clsx(
                'px-3 py-1.5 rounded text-[12px] font-medium transition-all',
                typeFilter === tab.key
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              )}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={refetch}
          disabled={loading}
          className="btn-default btn-sm"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          {t('operiq_tab_refresh')}
        </button>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {loading ? (
          [1, 2, 3, 4].map(i => (
            <div key={i} className="surface h-24 animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="surface p-12 text-center">
            <Cpu size={28} className="text-teal-400 mx-auto mb-3" />
            <p className="text-slate-600 font-medium text-[13px]">{t('operiq_no_analysis_page')}</p>
            <p className="text-slate-400 text-[12px] mt-1">
              {t('operiq_no_analysis_page_hint')}
            </p>
          </div>
        ) : (
          filtered.map(insight => {
            const cfg  = TYPE_CONFIG[insight.type]
            const Icon = cfg.icon

            return (
              <div key={insight.id} className="surface overflow-hidden">
                <div className={clsx('flex items-center gap-2.5 px-4 py-2.5 border-b', cfg.bg, cfg.border)}>
                  <Icon size={12} className={cfg.text} />
                  <span className={clsx('text-[11px] font-semibold uppercase tracking-wide', cfg.text)}>
                    {t(cfg.labelKey)}
                  </span>
                  {insight.priority === 'yuksek' && (
                    <span className="text-[10px] font-semibold text-red-600 px-1.5 py-0.5 rounded bg-red-50 border border-red-200">
                      {t('operiq_high_priority')}
                    </span>
                  )}
                  <span className="ml-auto text-[10px] text-slate-400">
                    {new Date(insight.createdAt).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="px-4 py-4">
                  <p className="text-[13px] font-semibold text-slate-900 mb-2">{insight.title}</p>
                  <p className="text-[12px] text-slate-600 leading-relaxed whitespace-pre-line">
                    {renderBold(insight.content)}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      <p className="text-[11px] text-slate-400 text-center pb-2">
        {t('operiq_footer_page')}
      </p>

      {/* Generate Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md animate-fade-in shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-teal-50 border border-teal-200 flex items-center justify-center">
                  <Cpu size={13} className="text-teal-600" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-slate-900">{t('operiq_modal_title')}</p>
                  <p className="text-[10px] text-slate-400">{t('operiq_modal_subtitle')}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setShowModal(false); setGenError(null) }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Analysis type */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  {t('operiq_analysis_type')}
                </label>
                <div className="space-y-1.5">
                  {ANALYSIS_KEYS.map(a => (
                    <button
                      key={a.key}
                      type="button"
                      onClick={() => setGenType(a.key)}
                      className={clsx(
                        'w-full text-left px-3.5 py-2.5 rounded border transition-all',
                        genType === a.key
                          ? 'border-teal-500 bg-teal-50 text-teal-900'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                      )}
                    >
                      <p className="text-[12px] font-semibold">{t(a.labelKey)}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{t(a.descKey)}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Department */}
              <div>
                <label htmlFor="gen-dept" className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  {t('operiq_scope')} <span className="text-slate-400 font-normal normal-case">- {t('operiq_scope_optional')}</span>
                </label>
                <select
                  id="gen-dept"
                  className="select"
                  value={genDeptId}
                  onChange={e => setGenDeptId(e.target.value)}
                >
                  <option value="">{t('operiq_scope_all')}</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              {genError && (
                <p className="text-[11px] text-red-600 bg-red-50 px-3 py-2 rounded border border-red-200">
                  {genError}
                </p>
              )}
            </div>

            <div className="flex gap-2 px-5 pb-5">
              <button
                type="button"
                onClick={() => { setShowModal(false); setGenError(null) }}
                className="btn-default flex-1 justify-center"
              >
                {t('common_cancel')}
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="btn-primary flex-1 justify-center"
              >
                {generating ? (
                  <><RefreshCw size={12} className="animate-spin" /> {t('operiq_analyzing')}</>
                ) : (
                  <><Cpu size={12} /> {t('operiq_start_analysis')}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
