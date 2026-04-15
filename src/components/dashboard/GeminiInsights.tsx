import { useState, useEffect, useRef, useCallback, type MouseEvent as ReactMouseEvent } from 'react'
import { ShieldAlert, AlertTriangle, Lightbulb, Info, ChevronDown, ChevronUp, RefreshCw, Cpu, Move, Anchor, X } from 'lucide-react'
import clsx from 'clsx'
import { useGeminiInsights, generateInsight } from '../../lib/hooks'
import { useLanguage } from '../../context/LanguageContext'
import type { GeminiInsight } from '../../types'
import type { TranslationKey } from '../../i18n/translations'

const TYPE_CONFIG: Record<string, { icon: typeof ShieldAlert; text: string; bg: string; border: string; labelKey: TranslationKey }> = {
  risk:   { icon: ShieldAlert,   text: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200',    labelKey: 'operiq_type_risk'       },
  uyari:  { icon: AlertTriangle, text: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200',  labelKey: 'operiq_type_warning'    },
  oneri:  { icon: Lightbulb,     text: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200',   labelKey: 'operiq_type_suggestion' },
  bilgi:  { icon: Info,          text: 'text-slate-500',  bg: 'bg-slate-50',  border: 'border-slate-200',  labelKey: 'operiq_type_info'       },
}

function renderBold(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <span key={i}>{part}</span>
  )
}

// ── Critical Alert Popup helpers ─────────────────────────────────────────────
const DISMISSED_KEY = 'actledger_dismissed_alerts'

function getDismissedAlerts(): string[] {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function dismissAlert(id: string) {
  const dismissed = getDismissedAlerts()
  if (!dismissed.includes(id)) {
    dismissed.push(id)
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed))
  }
}

function CriticalAlertPopup({ insight, onDismiss }: { insight: GeminiInsight; onDismiss: () => void }) {
  const { lang, t } = useLanguage()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Trigger slide-in animation after mount
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const handleDismiss = () => {
    setVisible(false)
    setTimeout(onDismiss, 250) // Wait for slide-out animation
  }

  const cfg = TYPE_CONFIG[insight.type]

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ backdropFilter: 'blur(4px)' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 transition-opacity duration-250"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={handleDismiss}
      />

      {/* Popup */}
      <div
        className="relative w-full max-w-md mx-4 rounded-xl overflow-hidden shadow-2xl border border-red-500/30 transition-all duration-250"
        style={{
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(32px) scale(0.95)',
          opacity: visible ? 1 : 0,
          background: 'linear-gradient(to bottom, #1c1917, #18181b)',
        }}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-red-500/20"
          style={{ background: 'linear-gradient(135deg, rgba(220,38,38,0.15), rgba(245,158,11,0.10))' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <ShieldAlert size={18} className="text-red-400" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-red-400 tracking-tight">
                {t('operiq_critical_alert_title')}
              </p>
              <p className="text-[10px] text-white/40 mt-0.5">OperIQ</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center gap-2">
            {cfg && <cfg.icon size={13} className="text-red-400 flex-shrink-0" />}
            <p className="text-[13px] font-semibold text-white leading-snug">{insight.title}</p>
          </div>

          <p className="text-[12px] text-zinc-300 leading-relaxed whitespace-pre-line">
            {renderBold(insight.content)}
          </p>

          {/* Suggested action - extracted from content if present */}
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1.5">
              {t('operiq_critical_alert_action')}
            </p>
            <p className="text-[11px] text-amber-200/80 leading-relaxed">
              {renderBold(insight.content)}
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-red-400">
              {t('operiq_high_priority')}
            </span>
            <span className="text-zinc-600 text-[10px]">-</span>
            <span className="text-[10px] text-zinc-500">
              {new Date(insight.createdAt).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', {
                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-1">
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full py-2.5 rounded-lg text-[13px] font-semibold text-white transition-all
              bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500
              shadow-lg shadow-red-500/20 hover:shadow-red-500/30 active:scale-[0.98]"
          >
            {t('operiq_critical_alert_dismiss')}
          </button>
        </div>
      </div>
    </div>
  )
}

function InsightRow({ insight }: { insight: GeminiInsight }) {
  const { lang, t } = useLanguage()
  const [open, setOpen] = useState(insight.priority === 'yuksek')
  const cfg  = TYPE_CONFIG[insight.type]
  const Icon = cfg.icon

  return (
    <div className={clsx('rounded border p-3.5 transition-all', cfg.bg, cfg.border)}>
      <div className="flex items-start gap-3">
        <Icon size={13} className={clsx('flex-shrink-0 mt-0.5', cfg.text)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[12px] font-semibold text-slate-900 leading-snug">{insight.title}</p>
            <button
              type="button"
              aria-label={open ? t('operiq_collapse') : t('operiq_expand')}
              onClick={() => setOpen(v => !v)}
              className="text-slate-400 hover:text-slate-600 flex-shrink-0 transition-colors"
            >
              {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>

          {open && (
            <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed whitespace-pre-line">
              {renderBold(insight.content)}
            </p>
          )}

          <div className="flex items-center gap-2 mt-2">
            <span className={clsx('text-[10px] font-semibold uppercase tracking-wide', cfg.text)}>
              {t(cfg.labelKey)}
            </span>
            <span className="text-slate-300 text-[10px]">·</span>
            <span className="text-[10px] text-slate-400">
              {new Date(insight.createdAt).toLocaleTimeString(lang === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
            {insight.priority === 'yuksek' && (
              <>
                <span className="text-slate-300 text-[10px]">·</span>
                <span className="text-[10px] font-semibold text-red-600">{t('operiq_high_priority')}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OperIQInsights() {
  const { lang, t } = useLanguage()
  const { insights, loading, refetch } = useGeminiInsights()
  const [generating, setGenerating] = useState(false)
  const [genError,   setGenError]   = useState<string | null>(null)

  // ── Critical Alert Popup state ────────────────────────────────────────────
  const [criticalAlert, setCriticalAlert] = useState<GeminiInsight | null>(null)

  const checkCriticalAlerts = useCallback((items: GeminiInsight[]) => {
    const dismissed = getDismissedAlerts()
    // Find the most recent high-priority insight that hasn't been dismissed
    const critical = items
      .filter(i => i.priority === 'yuksek' && !dismissed.includes(i.id))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    setCriticalAlert(critical ?? null)
  }, [])

  useEffect(() => {
    if (!loading && insights.length > 0) {
      checkCriticalAlerts(insights)
    }
  }, [insights, loading, checkCriticalAlerts])

  const handleDismissAlert = useCallback(() => {
    if (criticalAlert) {
      dismissAlert(criticalAlert.id)
      setCriticalAlert(null)
    }
  }, [criticalAlert])

  // ── Floating / draggable mode ─────────────────────────────────────────────
  const [floating, setFloating] = useState(false)
  const [pos,      setPos]      = useState({ x: 80, y: 80 })
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef<{ mx: number; my: number; px: number; py: number } | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const handleRefresh = async () => {
    setGenerating(true)
    setGenError(null)
    try {
      await generateInsight('GENEL_OZET')
      refetch()
    } catch (e: any) {
      setGenError(e.message ?? t('operiq_error_default'))
    } finally {
      setGenerating(false)
    }
  }

  const handleHeaderMouseDown = (e: ReactMouseEvent) => {
    if (!floating) return
    if ((e.target as HTMLElement).closest('button')) return
    e.preventDefault()
    dragRef.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y }
    setDragging(true)
  }

  useEffect(() => {
    if (!dragging) return

    const onMove = (e: globalThis.MouseEvent) => {
      if (!dragRef.current) return
      const dx = e.clientX - dragRef.current.mx
      const dy = e.clientY - dragRef.current.my
      const w  = panelRef.current?.offsetWidth  ?? 480
      const h  = panelRef.current?.offsetHeight ?? 400
      setPos({
        x: Math.max(0, Math.min(window.innerWidth  - w, dragRef.current.px + dx)),
        y: Math.max(0, Math.min(window.innerHeight - h, dragRef.current.py + dy)),
      })
    }
    const onUp = () => { setDragging(false); dragRef.current = null }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }
  }, [dragging])

  const handleUndock = () => {
    setPos({
      x: Math.max(20, window.innerWidth  / 2 - 240),
      y: Math.max(20, window.innerHeight / 2 - 250),
    })
    setFloating(true)
  }

  return (
    <>
    {criticalAlert && (
      <CriticalAlertPopup insight={criticalAlert} onDismiss={handleDismissAlert} />
    )}
    <div
      ref={panelRef}
      className={clsx('surface overflow-hidden w-full max-w-full', floating && 'shadow-2xl border-teal-300/50')}
      style={floating ? {
        position: 'fixed',
        left:     pos.x,
        top:      pos.y,
        width:    Math.min(480, window.innerWidth - 40),
        maxHeight:'80vh',
        overflowY:'auto',
        zIndex:   60,
        cursor:   dragging ? 'grabbing' : 'default',
      } : undefined}
    >
      {/* Header */}
      <div
        className="operiq-header px-5 py-4 flex items-center justify-between"
        style={floating ? { cursor: dragging ? 'grabbing' : 'grab' } : undefined}
        onMouseDown={handleHeaderMouseDown}
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
            <Cpu size={13} className="text-teal-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-semibold text-white tracking-tight">OperIQ</p>
              <span className="operiq-badge">{t('operiq_badge')}</span>
              {floating && (
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-teal-500/30 text-teal-200 border border-teal-400/30">
                  {t('operiq_floating')}
                </span>
              )}
            </div>
            <p className="text-[10px] text-white/40 mt-0.5">{t('operiq_subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => floating ? setFloating(false) : handleUndock()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-white/10 bg-white/8 hover:bg-white/15
              text-white/80 hover:text-white text-[11px] font-medium transition-colors"
            title={floating ? t('operiq_anchor_title') : t('operiq_undock_title')}
            data-help={floating ? t('operiq_anchor_help') : t('operiq_undock_help')}
          >
            {floating ? <Anchor size={11} /> : <Move size={11} />}
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={generating || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-white/10 bg-white/8 hover:bg-white/15
              text-white/80 hover:text-white text-[11px] font-medium transition-colors disabled:opacity-40"
          >
            <RefreshCw size={11} className={(generating || loading) ? 'animate-spin' : ''} />
            {generating ? t('operiq_analyzing') : t('operiq_refresh')}
          </button>
        </div>
      </div>

      {/* Error */}
      {genError && (
        <div className="mx-4 mt-3 px-3 py-2 rounded border border-red-200 bg-red-50 text-[11px] text-red-600">
          {genError}
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-2">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-12 rounded border border-slate-100 bg-slate-50 animate-pulse" />
          ))
        ) : insights.length === 0 ? (
          <div className="text-center py-8">
            <Cpu size={22} className="text-teal-400 mx-auto mb-2.5" />
            <p className="text-[12px] font-medium text-slate-600">{t('operiq_no_analysis')}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {t('operiq_no_analysis_hint')}
            </p>
          </div>
        ) : (
          insights.slice(0, 5).map(insight => <InsightRow key={insight.id} insight={insight} />)
        )}
      </div>

      <div className="px-5 pb-4 border-t border-slate-100 pt-3">
        <p className="text-[10px] text-slate-400">
          {t('operiq_footer')}
          {insights[0] && (
            <span className="ml-1 text-slate-400">
              · {t('operiq_last_update')}: {new Date(insights[0].createdAt).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', {
                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
              })}
            </span>
          )}
        </p>
      </div>
    </div>
    </>
  )
}
