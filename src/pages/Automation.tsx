import { useState, useMemo } from 'react'
import {
  Zap, Plus, Search, Trash2, Play, Pause, Eye,
  CheckSquare, CheckCircle, Clock, AlertTriangle, TrendingDown,
  Radio, Package, AlertOctagon, Calendar,
  ArrowUpRight, Bell, MessageSquare, Cpu, RefreshCw, Flag,
  Loader2, ChevronRight, ChevronLeft, ToggleLeft, ToggleRight,
  Activity, Hash, Percent, ListChecks,
  Copy,
} from 'lucide-react'
import clsx from 'clsx'
import {
  useAutomationRules, useAutomationStats, useAutomationLogs,
  createAutomationRule, toggleAutomationRule, deleteAutomationRule,
} from '../lib/hooks'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import DraggableModal from '../components/ui/DraggableModal'

// ── Types ────────────────────────────────────────────────────────────────────

type Tab = 'rules' | 'new' | 'logs'

type TriggerType =
  | 'TASK_CREATED' | 'TASK_COMPLETED' | 'TASK_DELAYED' | 'TASK_STALE'
  | 'KPI_DEVIATION' | 'IOT_ALERT'
  | 'STOCK_BELOW_MIN' | 'STOCK_CRITICAL'
  | 'SCHEDULE'

type ActionType =
  | 'CREATE_TASK' | 'ESCALATE_TASK'
  | 'SEND_NOTIFICATION' | 'SEND_MESSAGE'
  | 'TRIGGER_OPERIQ'
  | 'UPDATE_TASK_STATUS' | 'UPDATE_TASK_PRIORITY'

interface WizardState {
  step: number
  triggerType: TriggerType | null
  triggerConfig: Record<string, any>
  actionType: ActionType | null
  actionConfig: Record<string, any>
  name: string
  description: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  cooldownMinutes: number
  active: boolean
}

const INITIAL_WIZARD: WizardState = {
  step: 1,
  triggerType: null,
  triggerConfig: {},
  actionType: null,
  actionConfig: {},
  name: '',
  description: '',
  priority: 'MEDIUM',
  cooldownMinutes: 15,
  active: true,
}

// ── Trigger config ───────────────────────────────────────────────────────────

const TRIGGERS: Record<TriggerType, { icon: typeof CheckSquare; label: string; color: string; bg: string; desc: string }> = {
  TASK_CREATED:    { icon: CheckSquare,    label: 'Gorev Olusturuldu',  color: 'text-blue-600',    bg: 'bg-blue-50',    desc: 'Yeni gorev olusturuldugunda tetiklenir' },
  TASK_COMPLETED:  { icon: CheckCircle,    label: 'Gorev Tamamlandi',   color: 'text-emerald-600', bg: 'bg-emerald-50', desc: 'Gorev tamamlandiginda tetiklenir' },
  TASK_DELAYED:    { icon: Clock,          label: 'Gorev Gecikti',      color: 'text-amber-600',   bg: 'bg-amber-50',   desc: 'Gorev son teslim tarihini gectiginde tetiklenir' },
  TASK_STALE:      { icon: AlertTriangle,  label: 'Gorev Guncel Degil', color: 'text-orange-600',  bg: 'bg-orange-50',  desc: 'Gorev belirli suredir guncellenmediginde tetiklenir' },
  KPI_DEVIATION:   { icon: TrendingDown,   label: 'KPI Sapmasi',        color: 'text-red-600',     bg: 'bg-red-50',     desc: 'KPI degeri hedeften saptiginda tetiklenir' },
  IOT_ALERT:       { icon: Radio,          label: 'IoT Alarmi',         color: 'text-purple-600',  bg: 'bg-purple-50',  desc: 'IoT sensoru alarm urettiginde tetiklenir' },
  STOCK_BELOW_MIN: { icon: Package,        label: 'Stok Minimum Alti',  color: 'text-amber-600',   bg: 'bg-amber-50',   desc: 'Stok miktari minimum seviyenin altina dustugunde tetiklenir' },
  STOCK_CRITICAL:  { icon: AlertOctagon,   label: 'Kritik Stok',        color: 'text-red-600',     bg: 'bg-red-50',     desc: 'Stok kritik seviyeye dustugunde tetiklenir' },
  SCHEDULE:        { icon: Calendar,       label: 'Zamanlanmis',        color: 'text-indigo-600',  bg: 'bg-indigo-50',  desc: 'Belirlenen zaman diliminde periyodik olarak calisir' },
}

// ── Action config ────────────────────────────────────────────────────────────

const ACTIONS: Record<ActionType, { icon: typeof Plus; label: string; color: string; bg: string; desc: string }> = {
  CREATE_TASK:           { icon: Plus,          label: 'Gorev Olustur',            color: 'text-blue-600',    bg: 'bg-blue-50',    desc: 'Otomatik olarak yeni gorev olusturur' },
  ESCALATE_TASK:         { icon: ArrowUpRight,  label: 'Gorevi Eskale Et',         color: 'text-orange-600',  bg: 'bg-orange-50',  desc: 'Gorevi ust yonetim kademesine iletir' },
  SEND_NOTIFICATION:     { icon: Bell,          label: 'Bildirim Gonder',          color: 'text-purple-600',  bg: 'bg-purple-50',  desc: 'Belirtilen kullanicilara bildirim gonderir' },
  SEND_MESSAGE:          { icon: MessageSquare, label: 'Mesaj Gonder',             color: 'text-emerald-600', bg: 'bg-emerald-50', desc: 'Dahili mesajlasma uzerinden mesaj gonderir' },
  TRIGGER_OPERIQ:        { icon: Cpu,           label: 'OperIQ Tetikle',           color: 'text-indigo-600',  bg: 'bg-indigo-50',  desc: 'OperIQ AI asistanini tetikleyerek analiz baslatir' },
  UPDATE_TASK_STATUS:    { icon: RefreshCw,     label: 'Gorev Durumu Guncelle',    color: 'text-cyan-600',    bg: 'bg-cyan-50',    desc: 'Gorev durumunu otomatik olarak gunceller' },
  UPDATE_TASK_PRIORITY:  { icon: Flag,          label: 'Gorev Onceligi Guncelle',  color: 'text-red-600',     bg: 'bg-red-50',     desc: 'Gorev onceligini otomatik olarak degistirir' },
}

// ── Priority config ──────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<string, string> = {
  LOW:      'bg-slate-50 text-slate-600 border-slate-200',
  MEDIUM:   'bg-blue-50 text-blue-700 border-blue-200',
  HIGH:     'bg-amber-50 text-amber-700 border-amber-200',
  CRITICAL: 'bg-red-50 text-red-700 border-red-200',
}

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Dusuk', MEDIUM: 'Orta', HIGH: 'Yuksek', CRITICAL: 'Kritik',
}

// ── Log status config ────────────────────────────────────────────────────────

const LOG_STATUS_STYLES: Record<string, string> = {
  SUCCESS:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  FAILURE:  'bg-red-50 text-red-700 border-red-200',
  RUNNING:  'bg-blue-50 text-blue-700 border-blue-200',
  SKIPPED:  'bg-zinc-50 text-zinc-600 border-zinc-200',
}

const LOG_STATUS_LABELS: Record<string, string> = {
  SUCCESS: 'Basarili', FAILURE: 'Hata', RUNNING: 'Calisiyor', SKIPPED: 'Atlandi',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string | Date | undefined) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function timeAgo(d: string | Date | undefined) {
  if (!d) return '-'
  const now = Date.now()
  const then = new Date(d).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'az once'
  if (mins < 60) return `${mins} dk once`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} saat once`
  const days = Math.floor(hrs / 24)
  return `${days} gun once`
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function Automation() {
  // hooks available for future i18n / role-based access
  useLanguage()
  useAuth()

  const [tab, setTab] = useState<Tab>('rules')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'passive'>('all')
  const [triggerFilter, setTriggerFilter] = useState<TriggerType | ''>('')
  const [showWizard, setShowWizard] = useState(false)
  const [wizard, setWizard] = useState<WizardState>(INITIAL_WIZARD)
  const [saving, setSaving] = useState(false)
  const [viewRule, setViewRule] = useState<any | null>(null)
  const [logSearch, setLogSearch] = useState('')
  const [logStatusFilter, setLogStatusFilter] = useState<string>('')

  // Data hooks
  const { data: rulesData, loading: rulesLoading, refetch: refetchRules } = useAutomationRules({
    ...(search ? { search } : {}),
    ...(statusFilter !== 'all' ? { active: statusFilter === 'active' ? 'true' : 'false' } : {}),
    ...(triggerFilter ? { triggerType: triggerFilter } : {}),
  })
  const { data: stats, loading: statsLoading } = useAutomationStats()
  const { data: logsData, loading: logsLoading, refetch: refetchLogs } = useAutomationLogs({
    ...(logSearch ? { search: logSearch } : {}),
    ...(logStatusFilter ? { status: logStatusFilter } : {}),
  })

  const rules = useMemo(() => rulesData?.data ?? [], [rulesData])
  const logs = useMemo(() => logsData?.data ?? [], [logsData])

  // ── Handlers ───────────────────────────────────────────────────────────────

  const openWizard = () => {
    setWizard({ ...INITIAL_WIZARD })
    setShowWizard(true)
  }

  const closeWizard = () => {
    setShowWizard(false)
    setWizard({ ...INITIAL_WIZARD })
  }

  const handleToggle = async (rule: any) => {
    try {
      await toggleAutomationRule(rule.id, !rule.active)
      refetchRules()
    } catch { /* ignore */ }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu otomasyon kuralini silmek istediginize emin misiniz? Bu islem geri alinamaz.')) return
    try {
      await deleteAutomationRule(id)
      refetchRules()
    } catch { /* ignore */ }
  }

  const handleDuplicate = (rule: any) => {
    setWizard({
      step: 5,
      triggerType: rule.triggerType,
      triggerConfig: rule.triggerConfig ?? {},
      actionType: rule.actionType,
      actionConfig: rule.actionConfig ?? {},
      name: `${rule.name} (Kopya)`,
      description: rule.description ?? '',
      priority: rule.priority ?? 'MEDIUM',
      cooldownMinutes: rule.cooldownMinutes ?? 15,
      active: false,
    })
    setShowWizard(true)
  }

  const handleSaveRule = async () => {
    if (!wizard.triggerType || !wizard.actionType || !wizard.name.trim()) return
    setSaving(true)
    const priorityMap: Record<string, number> = { LOW: 0, MEDIUM: 25, HIGH: 50, CRITICAL: 75 }
    try {
      await createAutomationRule({
        name: wizard.name.trim(),
        description: wizard.description.trim() || undefined,
        triggerType: wizard.triggerType,
        triggerCondition: wizard.triggerConfig,
        actionType: wizard.actionType,
        actionConfig: wizard.actionConfig,
        priority: priorityMap[wizard.priority] ?? 0,
        cooldownMinutes: wizard.cooldownMinutes,
        active: wizard.active,
      })
      closeWizard()
      refetchRules()
    } catch (err) {
      console.error('Automation rule create error:', err)
    }
    setSaving(false)
  }

  const nextStep = () => setWizard(w => ({ ...w, step: Math.min(w.step + 1, 5) }))
  const prevStep = () => setWizard(w => ({ ...w, step: Math.max(w.step - 1, 1) }))

  const canProceed = () => {
    switch (wizard.step) {
      case 1: return !!wizard.triggerType
      case 2: return true
      case 3: return !!wizard.actionType
      case 4: return true
      case 5: return !!wizard.name.trim()
      default: return false
    }
  }

  // ── Stats cards ────────────────────────────────────────────────────────────

  const renderStats = () => {
    const s = stats
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={ListChecks} label="Toplam Kural"
          value={s?.totalRules ?? 0}
          color="text-blue-600" bg="bg-blue-50"
        />
        <StatCard
          icon={Activity} label="Aktif Kural"
          value={s?.activeRules ?? 0}
          color="text-emerald-600" bg="bg-emerald-50"
        />
        <StatCard
          icon={Hash} label="Toplam Calisma"
          value={s?.totalExecutions ?? 0}
          color="text-indigo-600" bg="bg-indigo-50"
        />
        <StatCard
          icon={Percent} label="Basari Orani"
          value={s?.successRate != null ? `%${Math.round(s.successRate)}` : '-'}
          color="text-emerald-600" bg="bg-emerald-50"
        />
      </div>
    )
  }

  // ── TAB: Rules ─────────────────────────────────────────────────────────────

  const renderRules = () => (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Kural ara..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'active', 'passive'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                statusFilter === s
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50',
              )}
            >
              {s === 'all' ? 'Tumu' : s === 'active' ? 'Aktif' : 'Pasif'}
            </button>
          ))}
        </div>
        <select
          value={triggerFilter}
          onChange={e => setTriggerFilter(e.target.value as TriggerType | '')}
          className="px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">Tum Tetikleyiciler</option>
          {Object.entries(TRIGGERS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <button
          onClick={openWizard}
          className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> Yeni Kural
        </button>
      </div>

      {/* Rules list */}
      {rulesLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-zinc-400" size={24} /></div>
      ) : rules.length === 0 ? (
        <div className="text-center py-16">
          <Zap size={40} className="mx-auto text-zinc-300 mb-3" />
          <p className="text-sm text-zinc-400">Henuz otomasyon kurali olusturulmamis</p>
          <button
            onClick={openWizard}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} /> Ilk Kurali Olustur
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule: any) => {
            const trigger = TRIGGERS[rule.triggerType as TriggerType]
            const action = ACTIONS[rule.actionType as ActionType]
            const TriggerIcon = trigger?.icon ?? Zap
            const ActionIcon = action?.icon ?? Zap
            return (
              <div
                key={rule.id}
                className={clsx(
                  'bg-white rounded-xl border p-4 transition-all hover:shadow-sm',
                  rule.active ? 'border-zinc-200' : 'border-zinc-100 opacity-60',
                )}
              >
                <div className="flex items-start gap-4">
                  {/* Toggle */}
                  <button
                    onClick={() => handleToggle(rule)}
                    className="mt-0.5 flex-shrink-0"
                    title={rule.active ? 'Pasife al' : 'Aktif et'}
                  >
                    {rule.active ? (
                      <ToggleRight size={28} className="text-emerald-500" />
                    ) : (
                      <ToggleLeft size={28} className="text-zinc-300" />
                    )}
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-zinc-900 truncate">{rule.name}</h3>
                      <span className={clsx('px-2 py-0.5 rounded text-[10px] font-bold border', PRIORITY_STYLES[rule.priority] ?? PRIORITY_STYLES.MEDIUM)}>
                        {PRIORITY_LABELS[rule.priority] ?? rule.priority}
                      </span>
                      {rule.active ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Aktif</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-50 text-zinc-500 border border-zinc-200">Pasif</span>
                      )}
                    </div>
                    {rule.description && (
                      <p className="text-xs text-zinc-500 mb-2 line-clamp-1">{rule.description}</p>
                    )}
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Trigger badge */}
                      <div className={clsx('flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border', trigger?.bg ?? 'bg-zinc-50', trigger?.color ?? 'text-zinc-600', 'border-current/10')}>
                        <TriggerIcon size={13} />
                        {trigger?.label ?? rule.triggerType}
                      </div>
                      <ChevronRight size={14} className="text-zinc-300" />
                      {/* Action badge */}
                      <div className={clsx('flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border', action?.bg ?? 'bg-zinc-50', action?.color ?? 'text-zinc-600', 'border-current/10')}>
                        <ActionIcon size={13} />
                        {action?.label ?? rule.actionType}
                      </div>
                      {rule.cooldownMinutes > 0 && (
                        <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                          <Clock size={11} /> {rule.cooldownMinutes} dk bekleme
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Meta + actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-[10px] text-zinc-400 mr-2">{timeAgo(rule.createdAt)}</span>
                    <button
                      onClick={() => setViewRule(rule)}
                      title="Detay"
                      className="p-1.5 rounded hover:bg-blue-50 text-blue-500 transition-colors"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      onClick={() => handleDuplicate(rule)}
                      title="Kopyala"
                      className="p-1.5 rounded hover:bg-indigo-50 text-indigo-500 transition-colors"
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      title="Sil"
                      className="p-1.5 rounded hover:bg-red-50 text-red-500 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
          <div className="px-4 py-2.5 text-xs text-zinc-400">
            Toplam {rulesData?.meta?.total ?? rules.length} kural
          </div>
        </div>
      )}
    </div>
  )

  // ── TAB: Logs ──────────────────────────────────────────────────────────────

  const renderLogs = () => (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={logSearch}
            onChange={e => setLogSearch(e.target.value)}
            placeholder="Log ara..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
        <div className="flex gap-1.5">
          {['', 'SUCCESS', 'FAILURE', 'RUNNING', 'SKIPPED'].map(s => (
            <button
              key={s}
              onClick={() => setLogStatusFilter(s)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                logStatusFilter === s
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50',
              )}
            >
              {s === '' ? 'Tumu' : LOG_STATUS_LABELS[s] ?? s}
            </button>
          ))}
        </div>
        <button
          onClick={() => refetchLogs()}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
        >
          <RefreshCw size={14} /> Yenile
        </button>
      </div>

      {/* Logs table */}
      {logsLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-zinc-400" size={24} /></div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16">
          <Activity size={40} className="mx-auto text-zinc-300 mb-3" />
          <p className="text-sm text-zinc-400">Henuz calisma kaydi bulunmuyor</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="text-left px-4 py-3 font-semibold text-zinc-600">Kural</th>
                  <th className="text-left px-4 py-3 font-semibold text-zinc-600">Tetikleyici</th>
                  <th className="text-left px-4 py-3 font-semibold text-zinc-600">Aksiyon</th>
                  <th className="text-left px-4 py-3 font-semibold text-zinc-600">Durum</th>
                  <th className="text-left px-4 py-3 font-semibold text-zinc-600">Sure</th>
                  <th className="text-left px-4 py-3 font-semibold text-zinc-600">Tarih</th>
                  <th className="text-left px-4 py-3 font-semibold text-zinc-600">Detay</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any) => {
                  const trigger = TRIGGERS[log.triggerType as TriggerType]
                  const action = ACTIONS[log.actionType as ActionType]
                  const TriggerIcon = trigger?.icon ?? Zap
                  const ActionIcon = action?.icon ?? Zap
                  return (
                    <tr key={log.id} className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-zinc-900 text-xs">{log.ruleName ?? log.automationRule?.name ?? '-'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold', trigger?.bg ?? 'bg-zinc-50', trigger?.color ?? 'text-zinc-600')}>
                          <TriggerIcon size={11} />
                          {trigger?.label ?? log.triggerType}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold', action?.bg ?? 'bg-zinc-50', action?.color ?? 'text-zinc-600')}>
                          <ActionIcon size={11} />
                          {action?.label ?? log.actionType}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx('px-2 py-0.5 rounded text-[10px] font-bold border', LOG_STATUS_STYLES[log.status] ?? LOG_STATUS_STYLES.SKIPPED)}>
                          {LOG_STATUS_LABELS[log.status] ?? log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500 tabular-nums">
                        {log.durationMs != null ? `${log.durationMs}ms` : '-'}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">
                        {formatDate(log.executedAt ?? log.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500 max-w-[200px] truncate">
                        {log.error ?? log.result ?? '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-zinc-100 text-xs text-zinc-400">
            Toplam {logsData?.meta?.total ?? logs.length} kayit
          </div>
        </div>
      )}
    </div>
  )

  // ── Wizard: Step 1 - Select Trigger ────────────────────────────────────────

  const renderStep1 = () => (
    <div className="space-y-4 px-5 py-4">
      <div>
        <h3 className="text-sm font-semibold text-zinc-800 mb-1">Tetikleyici Sec</h3>
        <p className="text-xs text-zinc-500">Kuralun ne zaman calisacagini belirleyin</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {(Object.entries(TRIGGERS) as [TriggerType, typeof TRIGGERS[TriggerType]][]).map(([key, cfg]) => {
          const Icon = cfg.icon
          const selected = wizard.triggerType === key
          return (
            <button
              key={key}
              onClick={() => setWizard(w => ({ ...w, triggerType: key }))}
              className={clsx(
                'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center',
                selected
                  ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                  : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50',
              )}
            >
              <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center', cfg.bg)}>
                <Icon size={20} className={cfg.color} />
              </div>
              <span className={clsx('text-xs font-semibold', selected ? 'text-blue-700' : 'text-zinc-700')}>
                {cfg.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )

  // ── Wizard: Step 2 - Configure Trigger ─────────────────────────────────────

  const renderStep2 = () => {
    const triggerType = wizard.triggerType
    if (!triggerType) return null
    const cfg = TRIGGERS[triggerType]
    const Icon = cfg.icon

    return (
      <div className="space-y-4 px-5 py-4">
        <div className="flex items-center gap-3 mb-2">
          <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center', cfg.bg)}>
            <Icon size={18} className={cfg.color} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-800">{cfg.label}</h3>
            <p className="text-xs text-zinc-500">{cfg.desc}</p>
          </div>
        </div>

        {/* Dynamic config based on trigger type */}
        {(triggerType === 'TASK_CREATED' || triggerType === 'TASK_COMPLETED') && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">Departman Filtresi (opsiyonel)</label>
              <input
                value={wizard.triggerConfig.departmentFilter ?? ''}
                onChange={e => setWizard(w => ({ ...w, triggerConfig: { ...w.triggerConfig, departmentFilter: e.target.value } }))}
                placeholder="Tum departmanlar"
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">Oncelik Filtresi (opsiyonel)</label>
              <select
                value={wizard.triggerConfig.priorityFilter ?? ''}
                onChange={e => setWizard(w => ({ ...w, triggerConfig: { ...w.triggerConfig, priorityFilter: e.target.value } }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Tum onceklikler</option>
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
        )}

        {triggerType === 'TASK_DELAYED' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">Gecikme Suresi (dakika)</label>
              <input
                type="number"
                min="1"
                value={wizard.triggerConfig.delayMinutes ?? 60}
                onChange={e => setWizard(w => ({ ...w, triggerConfig: { ...w.triggerConfig, delayMinutes: Number(e.target.value) } }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        )}

        {triggerType === 'TASK_STALE' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">Guncellik Esigi (saat)</label>
              <input
                type="number"
                min="1"
                value={wizard.triggerConfig.staleHours ?? 24}
                onChange={e => setWizard(w => ({ ...w, triggerConfig: { ...w.triggerConfig, staleHours: Number(e.target.value) } }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        )}

        {triggerType === 'KPI_DEVIATION' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">Sapma Yuzde Esigi</label>
              <input
                type="number"
                min="1"
                max="100"
                value={wizard.triggerConfig.deviationPercent ?? 10}
                onChange={e => setWizard(w => ({ ...w, triggerConfig: { ...w.triggerConfig, deviationPercent: Number(e.target.value) } }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <p className="text-[10px] text-zinc-400 mt-1">KPI degeri hedeften bu yuzde kadar saptiginda tetiklenir</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">Sapma Yonu</label>
              <select
                value={wizard.triggerConfig.deviationDirection ?? 'BOTH'}
                onChange={e => setWizard(w => ({ ...w, triggerConfig: { ...w.triggerConfig, deviationDirection: e.target.value } }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="BOTH">Her iki yon</option>
                <option value="BELOW">Sadece altina dusme</option>
                <option value="ABOVE">Sadece ustuune cikma</option>
              </select>
            </div>
          </div>
        )}

        {triggerType === 'IOT_ALERT' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">Sensor Tipi (opsiyonel)</label>
              <input
                value={wizard.triggerConfig.sensorType ?? ''}
                onChange={e => setWizard(w => ({ ...w, triggerConfig: { ...w.triggerConfig, sensorType: e.target.value } }))}
                placeholder="Tum sensorler"
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">Alarm Seviyesi</label>
              <select
                value={wizard.triggerConfig.alertSeverity ?? ''}
                onChange={e => setWizard(w => ({ ...w, triggerConfig: { ...w.triggerConfig, alertSeverity: e.target.value } }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Tum seviyeler</option>
                <option value="LOW">Dusuk</option>
                <option value="MEDIUM">Orta</option>
                <option value="HIGH">Yuksek</option>
                <option value="CRITICAL">Kritik</option>
              </select>
            </div>
          </div>
        )}

        {(triggerType === 'STOCK_BELOW_MIN' || triggerType === 'STOCK_CRITICAL') && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">Kategori Filtresi (opsiyonel)</label>
              <select
                value={wizard.triggerConfig.stockCategory ?? ''}
                onChange={e => setWizard(w => ({ ...w, triggerConfig: { ...w.triggerConfig, stockCategory: e.target.value } }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Tum kategoriler</option>
                <option value="DEMIRBAS">Demirbas</option>
                <option value="SARF">Sarf Malzemesi</option>
                <option value="YEDEK_PARCA">Yedek Parca</option>
              </select>
            </div>
          </div>
        )}

        {triggerType === 'SCHEDULE' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">Calisma Zamani</label>
              <select
                value={wizard.triggerConfig.scheduleType ?? 'DAILY'}
                onChange={e => setWizard(w => ({ ...w, triggerConfig: { ...w.triggerConfig, scheduleType: e.target.value } }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="HOURLY">Her saat</option>
                <option value="DAILY">Her gun</option>
                <option value="WEEKLY">Her hafta</option>
                <option value="MONTHLY">Her ay</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">Saat</label>
              <input
                type="time"
                value={wizard.triggerConfig.scheduleTime ?? '09:00'}
                onChange={e => setWizard(w => ({ ...w, triggerConfig: { ...w.triggerConfig, scheduleTime: e.target.value } }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        )}

        {/* No special config for some types - show a note */}
        {!['TASK_CREATED', 'TASK_COMPLETED', 'TASK_DELAYED', 'TASK_STALE', 'KPI_DEVIATION', 'IOT_ALERT', 'STOCK_BELOW_MIN', 'STOCK_CRITICAL', 'SCHEDULE'].includes(triggerType) && (
          <div className="px-4 py-3 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-500">
            Bu tetikleyici icin ek yapilandirma gerekmiyor. Devam edebilirsiniz.
          </div>
        )}
      </div>
    )
  }

  // ── Wizard: Step 3 - Select Action ─────────────────────────────────────────

  const renderStep3 = () => (
    <div className="space-y-4 px-5 py-4">
      <div>
        <h3 className="text-sm font-semibold text-zinc-800 mb-1">Aksiyon Sec</h3>
        <p className="text-xs text-zinc-500">Tetiklendiginde ne yapilacagini belirleyin</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {(Object.entries(ACTIONS) as [ActionType, typeof ACTIONS[ActionType]][]).map(([key, cfg]) => {
          const Icon = cfg.icon
          const selected = wizard.actionType === key
          return (
            <button
              key={key}
              onClick={() => setWizard(w => ({ ...w, actionType: key }))}
              className={clsx(
                'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center',
                selected
                  ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                  : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50',
              )}
            >
              <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center', cfg.bg)}>
                <Icon size={20} className={cfg.color} />
              </div>
              <span className={clsx('text-xs font-semibold', selected ? 'text-blue-700' : 'text-zinc-700')}>
                {cfg.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )

  // ── Wizard: Step 4 - Configure Action ──────────────────────────────────────

  const renderStep4 = () => {
    const actionType = wizard.actionType
    if (!actionType) return null
    const cfg = ACTIONS[actionType]
    const Icon = cfg.icon

    return (
      <div className="space-y-4 px-5 py-4">
        <div className="flex items-center gap-3 mb-2">
          <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center', cfg.bg)}>
            <Icon size={18} className={cfg.color} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-800">{cfg.label}</h3>
            <p className="text-xs text-zinc-500">{cfg.desc}</p>
          </div>
        </div>

        {actionType === 'CREATE_TASK' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">Gorev Basligi *</label>
              <input
                value={wizard.actionConfig.taskTitle ?? ''}
                onChange={e => setWizard(w => ({ ...w, actionConfig: { ...w.actionConfig, taskTitle: e.target.value } }))}
                placeholder="Otomatik olusturulan gorev basligi"
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">Gorev Aciklamasi</label>
              <textarea
                rows={2}
                value={wizard.actionConfig.taskDescription ?? ''}
                onChange={e => setWizard(w => ({ ...w, actionConfig: { ...w.actionConfig, taskDescription: e.target.value } }))}
                placeholder="Gorev detaylari..."
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1">Oncelik</label>
                <select
                  value={wizard.actionConfig.taskPriority ?? 'MEDIUM'}
                  onChange={e => setWizard(w => ({ ...w, actionConfig: { ...w.actionConfig, taskPriority: e.target.value } }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1">Son Teslim (gun)</label>
                <input
                  type="number"
                  min="1"
                  value={wizard.actionConfig.dueDays ?? 3}
                  onChange={e => setWizard(w => ({ ...w, actionConfig: { ...w.actionConfig, dueDays: Number(e.target.value) } }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>
        )}

        {actionType === 'ESCALATE_TASK' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">Eskalasyon Seviyesi</label>
              <select
                value={wizard.actionConfig.escalationLevel ?? 1}
                onChange={e => setWizard(w => ({ ...w, actionConfig: { ...w.actionConfig, escalationLevel: Number(e.target.value) } }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value={1}>1 kademe yukariya</option>
                <option value={2}>2 kademe yukariya</option>
                <option value={3}>3 kademe yukariya</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">Eskalasyon Mesaji</label>
              <textarea
                rows={2}
                value={wizard.actionConfig.escalationMessage ?? ''}
                onChange={e => setWizard(w => ({ ...w, actionConfig: { ...w.actionConfig, escalationMessage: e.target.value } }))}
                placeholder="Ust yoneticiye iletilecek mesaj..."
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
              />
            </div>
          </div>
        )}

        {(actionType === 'SEND_NOTIFICATION' || actionType === 'SEND_MESSAGE') && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">Alici Hedefi</label>
              <select
                value={wizard.actionConfig.recipientTarget ?? 'ASSIGNEE'}
                onChange={e => setWizard(w => ({ ...w, actionConfig: { ...w.actionConfig, recipientTarget: e.target.value } }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="ASSIGNEE">Gorev atanani</option>
                <option value="CREATOR">Gorev olusturucusu</option>
                <option value="DEPARTMENT_HEAD">Departman yoneticisi</option>
                <option value="ALL_MANAGERS">Tum yoneticiler</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">
                {actionType === 'SEND_NOTIFICATION' ? 'Bildirim Metni' : 'Mesaj Icerigi'} *
              </label>
              <textarea
                rows={3}
                value={wizard.actionConfig.messageContent ?? ''}
                onChange={e => setWizard(w => ({ ...w, actionConfig: { ...w.actionConfig, messageContent: e.target.value } }))}
                placeholder="Mesaj icerigi... (degiskenler: {{taskTitle}}, {{assignee}}, {{department}})"
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
              />
              <p className="text-[10px] text-zinc-400 mt-1">Kullanilabilir degiskenler: {'{{taskTitle}}'}, {'{{assignee}}'}, {'{{department}}'}, {'{{dueDate}}'}</p>
            </div>
          </div>
        )}

        {actionType === 'TRIGGER_OPERIQ' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">Analiz Tipi</label>
              <select
                value={wizard.actionConfig.analysisType ?? 'FULL'}
                onChange={e => setWizard(w => ({ ...w, actionConfig: { ...w.actionConfig, analysisType: e.target.value } }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="FULL">Tam analiz</option>
                <option value="QUICK">Hizli tarama</option>
                <option value="SPECIFIC">Belirli alan</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">Ek Talimat (opsiyonel)</label>
              <textarea
                rows={2}
                value={wizard.actionConfig.operiqPrompt ?? ''}
                onChange={e => setWizard(w => ({ ...w, actionConfig: { ...w.actionConfig, operiqPrompt: e.target.value } }))}
                placeholder="OperIQ icin ozel yonergeler..."
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
              />
            </div>
          </div>
        )}

        {actionType === 'UPDATE_TASK_STATUS' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">Hedef Durum</label>
              <select
                value={wizard.actionConfig.targetStatus ?? 'IN_PROGRESS'}
                onChange={e => setWizard(w => ({ ...w, actionConfig: { ...w.actionConfig, targetStatus: e.target.value } }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="PENDING">Beklemede</option>
                <option value="IN_PROGRESS">Devam Ediyor</option>
                <option value="REVIEW">Inceleme</option>
                <option value="COMPLETED">Tamamlandi</option>
                <option value="CANCELLED">Iptal Edildi</option>
              </select>
            </div>
          </div>
        )}

        {actionType === 'UPDATE_TASK_PRIORITY' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">Hedef Oncelik</label>
              <select
                value={wizard.actionConfig.targetPriority ?? 'HIGH'}
                onChange={e => setWizard(w => ({ ...w, actionConfig: { ...w.actionConfig, targetPriority: e.target.value } }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Wizard: Step 5 - Name & Settings ───────────────────────────────────────

  const renderStep5 = () => {
    const trigger = wizard.triggerType ? TRIGGERS[wizard.triggerType] : null
    const action = wizard.actionType ? ACTIONS[wizard.actionType] : null
    const TriggerIcon = trigger?.icon ?? Zap
    const ActionIcon = action?.icon ?? Zap

    return (
      <div className="space-y-4 px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-800 mb-1">Kural Bilgileri</h3>
          <p className="text-xs text-zinc-500">Kurala ad verin ve son ayarlari yapin</p>
        </div>

        {/* Flow summary */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200">
          <div className={clsx('flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold', trigger?.bg, trigger?.color)}>
            <TriggerIcon size={13} />
            {trigger?.label ?? '-'}
          </div>
          <ChevronRight size={14} className="text-zinc-400" />
          <div className={clsx('flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold', action?.bg, action?.color)}>
            <ActionIcon size={13} />
            {action?.label ?? '-'}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-600 mb-1">Kural Adi *</label>
          <input
            value={wizard.name}
            onChange={e => setWizard(w => ({ ...w, name: e.target.value }))}
            placeholder="Orn: Geciken gorevleri eskale et"
            className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-600 mb-1">Aciklama (opsiyonel)</label>
          <textarea
            rows={2}
            value={wizard.description}
            onChange={e => setWizard(w => ({ ...w, description: e.target.value }))}
            placeholder="Kuralin ne yaptigini aciklayin..."
            className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-600 mb-1">Oncelik</label>
            <select
              value={wizard.priority}
              onChange={e => setWizard(w => ({ ...w, priority: e.target.value as WizardState['priority'] }))}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-600 mb-1">Bekleme Suresi (dk)</label>
            <input
              type="number"
              min="0"
              value={wizard.cooldownMinutes}
              onChange={e => setWizard(w => ({ ...w, cooldownMinutes: Number(e.target.value) }))}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <p className="text-[10px] text-zinc-400 mt-1">Ayni olay icin tekrar tetiklenmeden once bekleme suresi</p>
          </div>
        </div>
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200">
          <div>
            <p className="text-sm font-semibold text-zinc-700">Aktif Olarak Baslat</p>
            <p className="text-xs text-zinc-500">Kural hemen calismaya baslayacaktir</p>
          </div>
          <button
            type="button"
            onClick={() => setWizard(w => ({ ...w, active: !w.active }))}
          >
            {wizard.active ? (
              <ToggleRight size={32} className="text-emerald-500" />
            ) : (
              <ToggleLeft size={32} className="text-zinc-300" />
            )}
          </button>
        </div>
      </div>
    )
  }

  // ── Wizard Steps Array ─────────────────────────────────────────────────────

  const WIZARD_STEPS = [
    { num: 1, label: 'Tetikleyici', render: renderStep1 },
    { num: 2, label: 'Tetik Ayarlari', render: renderStep2 },
    { num: 3, label: 'Aksiyon', render: renderStep3 },
    { num: 4, label: 'Aksiyon Ayarlari', render: renderStep4 },
    { num: 5, label: 'Ad ve Ayarlar', render: renderStep5 },
  ]

  // ── Tabs ───────────────────────────────────────────────────────────────────

  const TABS: { key: Tab; label: string; icon: typeof Zap }[] = [
    { key: 'rules', label: 'Kurallar',         icon: ListChecks },
    { key: 'new',   label: 'Yeni Kural',       icon: Plus },
    { key: 'logs',  label: 'Calisma Gecmisi',  icon: Activity },
  ]

  // ── Main Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
            <Zap size={22} className="text-amber-500" />
            Otomasyon Motoru
          </h1>
          <p className="text-xs text-zinc-500 mt-1">Otomatik kurallar ile is sureclerinizi hizlandirin</p>
        </div>
        <button
          onClick={openWizard}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> Yeni Kural
        </button>
      </div>

      {/* Stats */}
      {renderStats()}

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-zinc-100 rounded-xl p-1">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => {
              if (t.key === 'new') {
                openWizard()
                return
              }
              setTab(t.key)
              if (t.key === 'logs') refetchLogs()
            }}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
              tab === t.key && t.key !== 'new'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700',
            )}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'rules' && renderRules()}
      {tab === 'logs'  && renderLogs()}

      {/* Create wizard modal */}
      {showWizard && (
        <DraggableModal title="Yeni Otomasyon Kurali" onClose={closeWizard} width={680}>
          {/* Step indicator */}
          <div className="flex items-center gap-1 px-5 pt-4 pb-2">
            {WIZARD_STEPS.map((s, i) => (
              <div key={s.num} className="flex items-center gap-1 flex-1">
                <button
                  onClick={() => {
                    // Only allow going back, not forward beyond validated steps
                    if (s.num < wizard.step) setWizard(w => ({ ...w, step: s.num }))
                  }}
                  className={clsx(
                    'flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-semibold transition-colors whitespace-nowrap',
                    wizard.step === s.num
                      ? 'bg-blue-50 text-blue-700'
                      : wizard.step > s.num
                        ? 'text-emerald-600 cursor-pointer hover:bg-emerald-50'
                        : 'text-zinc-400',
                  )}
                >
                  <span className={clsx(
                    'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                    wizard.step === s.num
                      ? 'bg-blue-600 text-white'
                      : wizard.step > s.num
                        ? 'bg-emerald-500 text-white'
                        : 'bg-zinc-200 text-zinc-500',
                  )}>
                    {wizard.step > s.num ? '\u2713' : s.num}
                  </span>
                  <span className="hidden md:inline">{s.label}</span>
                </button>
                {i < WIZARD_STEPS.length - 1 && (
                  <div className={clsx(
                    'flex-1 h-px mx-1',
                    wizard.step > s.num ? 'bg-emerald-300' : 'bg-zinc-200',
                  )} />
                )}
              </div>
            ))}
          </div>

          {/* Step content */}
          {WIZARD_STEPS.find(s => s.num === wizard.step)?.render()}

          {/* Navigation footer */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-zinc-200" style={{ borderTop: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={wizard.step === 1 ? closeWizard : prevStep}
              className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors"
            >
              <ChevronLeft size={16} />
              {wizard.step === 1 ? 'Iptal' : 'Geri'}
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Adim {wizard.step}/5</span>
              {wizard.step < 5 ? (
                <button
                  onClick={nextStep}
                  disabled={!canProceed()}
                  className={clsx(
                    'flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors',
                    canProceed()
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-zinc-200 text-zinc-400 cursor-not-allowed',
                  )}
                >
                  Devam <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  onClick={handleSaveRule}
                  disabled={!canProceed() || saving}
                  className={clsx(
                    'flex items-center gap-1 px-5 py-2 rounded-lg text-sm font-semibold transition-colors',
                    canProceed() && !saving
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-zinc-200 text-zinc-400 cursor-not-allowed',
                  )}
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                  {saving ? 'Kaydediliyor...' : 'Kurali Olustur'}
                </button>
              )}
            </div>
          </div>
        </DraggableModal>
      )}

      {/* Rule detail modal */}
      {viewRule && (
        <DraggableModal title={viewRule.name} onClose={() => setViewRule(null)} width={560}>
          <div className="space-y-4 px-5 py-4">
            {/* Status */}
            <div className="flex items-center gap-3">
              {viewRule.active ? (
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Aktif</span>
              ) : (
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-zinc-50 text-zinc-500 border border-zinc-200">Pasif</span>
              )}
              <span className={clsx('px-2.5 py-1 rounded-lg text-xs font-bold border', PRIORITY_STYLES[viewRule.priority] ?? PRIORITY_STYLES.MEDIUM)}>
                {PRIORITY_LABELS[viewRule.priority] ?? viewRule.priority}
              </span>
            </div>

            {/* Description */}
            {viewRule.description && (
              <p className="text-sm text-zinc-600 leading-relaxed">{viewRule.description}</p>
            )}

            {/* Flow */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Otomasyon Akisi</h4>
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200">
                {(() => {
                  const trigger = TRIGGERS[viewRule.triggerType as TriggerType]
                  const action = ACTIONS[viewRule.actionType as ActionType]
                  const TriggerIcon = trigger?.icon ?? Zap
                  const ActionIcon = action?.icon ?? Zap
                  return (
                    <>
                      <div className={clsx('flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold', trigger?.bg, trigger?.color)}>
                        <TriggerIcon size={13} />
                        {trigger?.label ?? viewRule.triggerType}
                      </div>
                      <ChevronRight size={14} className="text-zinc-400" />
                      <div className={clsx('flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold', action?.bg, action?.color)}>
                        <ActionIcon size={13} />
                        {action?.label ?? viewRule.actionType}
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>

            {/* Trigger config */}
            {viewRule.triggerConfig && Object.keys(viewRule.triggerConfig).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Tetik Ayarlari</h4>
                <div className="px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200">
                  {Object.entries(viewRule.triggerConfig).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between py-1">
                      <span className="text-xs text-zinc-500">{k}</span>
                      <span className="text-xs font-semibold text-zinc-700">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action config */}
            {viewRule.actionConfig && Object.keys(viewRule.actionConfig).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Aksiyon Ayarlari</h4>
                <div className="px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200">
                  {Object.entries(viewRule.actionConfig).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between py-1">
                      <span className="text-xs text-zinc-500">{k}</span>
                      <span className="text-xs font-semibold text-zinc-700">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Detaylar</h4>
              <div className="px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1">
                <div className="flex items-center justify-between py-1">
                  <span className="text-xs text-zinc-500">Bekleme Suresi</span>
                  <span className="text-xs font-semibold text-zinc-700">{viewRule.cooldownMinutes ?? 0} dakika</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-xs text-zinc-500">Olusturulma</span>
                  <span className="text-xs font-semibold text-zinc-700">{formatDate(viewRule.createdAt)}</span>
                </div>
                {viewRule.lastTriggeredAt && (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-xs text-zinc-500">Son Calisma</span>
                    <span className="text-xs font-semibold text-zinc-700">{formatDate(viewRule.lastTriggeredAt)}</span>
                  </div>
                )}
                {viewRule.executionCount != null && (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-xs text-zinc-500">Toplam Calisma</span>
                    <span className="text-xs font-semibold text-zinc-700">{viewRule.executionCount}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => { handleToggle(viewRule); setViewRule(null) }}
                className={clsx(
                  'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors',
                  viewRule.active
                    ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200',
                )}
              >
                {viewRule.active ? <><Pause size={14} /> Duraklat</> : <><Play size={14} /> Aktif Et</>}
              </button>
              <button
                onClick={() => { handleDuplicate(viewRule); setViewRule(null) }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-zinc-50 text-zinc-600 hover:bg-zinc-100 border border-zinc-200 transition-colors"
              >
                <Copy size={14} /> Kopyala
              </button>
              <button
                onClick={() => { handleDelete(viewRule.id); setViewRule(null) }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors ml-auto"
              >
                <Trash2 size={14} /> Sil
              </button>
            </div>
          </div>
        </DraggableModal>
      )}
    </div>
  )
}

// ── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color, bg }: {
  icon: typeof Zap; label: string; value: number | string; color: string; bg: string
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 transition-all">
      <div className="flex items-center gap-3">
        <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center', bg)}>
          <Icon size={20} className={color} />
        </div>
        <div>
          <p className="text-2xl font-bold text-zinc-900">
            {typeof value === 'number' ? value.toLocaleString('tr-TR') : value}
          </p>
          <p className="text-xs text-zinc-500 font-medium">{label}</p>
        </div>
      </div>
    </div>
  )
}
