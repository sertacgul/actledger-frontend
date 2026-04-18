import { useState, useMemo } from 'react'
import {
  GitBranch, Plus, Search, Trash2, Pencil, Play, Square, CheckSquare,
  UserCheck, Bell, Cpu, Package, Clock, Loader2, Copy, X,
  BarChart3, Activity, Zap, Eye, XCircle, Layers,
} from 'lucide-react'
import clsx from 'clsx'
import {
  useWorkflows, useWorkflowStats, useWorkflowInstances, useWorkflowTemplates,
  createWorkflow, updateWorkflowStatus, deleteWorkflow,
  addWorkflowStep, updateWorkflowStep, deleteWorkflowStep,
  startWorkflowInstance, cancelWorkflowInstance, cloneWorkflowTemplate,
  useWorkflow,
} from '../lib/hooks'
import DraggableModal from '../components/ui/DraggableModal'

// ── Types ───────────────────────────────────────────────────────────────────

type Tab = 'list' | 'designer' | 'instances'

type WorkflowStatus = 'TASLAK' | 'AKTIF' | 'PASIF' | 'ARSIVLENDI'
type StepType = 'START' | 'TASK' | 'APPROVAL' | 'DECISION' | 'NOTIFICATION' | 'OPERIQ' | 'STOCK_ACTION' | 'DELAY' | 'END'
type InstanceStatus = 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'PAUSED'

interface WorkflowStep {
  id: string
  type: StepType
  name: string
  description?: string
  order: number
  config: Record<string, unknown>
  nextStepIds: string[]
}

interface Workflow {
  id: string
  name: string
  description?: string
  status: WorkflowStatus
  category?: string
  version: number
  triggerConfig: Record<string, unknown>
  steps: WorkflowStep[]
  createdBy?: { id: string; name: string }
  _count?: { instances: number }
  createdAt: string
  updatedAt: string
}

interface WorkflowInstance {
  id: string
  workflowId: string
  workflow?: { id: string; name: string; category?: string }
  startedBy?: { id: string; name: string }
  status: InstanceStatus
  currentStepId?: string
  errorMessage?: string
  startedAt: string
  completedAt?: string
  _count?: { stepInstances: number }
}

// ── Labels & Styles ─────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<WorkflowStatus, { label: string; bg: string; text: string; border: string; dot: string }> = {
  TASLAK:     { label: 'Taslak',     bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',  dot: 'bg-amber-500' },
  AKTIF:      { label: 'Aktif',      bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  PASIF:      { label: 'Pasif',      bg: 'bg-zinc-50',    text: 'text-zinc-600',    border: 'border-zinc-200',   dot: 'bg-zinc-400' },
  ARSIVLENDI: { label: 'Arsivlendi', bg: 'bg-slate-50',   text: 'text-slate-600',   border: 'border-slate-200',  dot: 'bg-slate-400' },
}

const STEP_CONFIG: Record<StepType, { label: string; icon: typeof Play; color: string; bg: string; border: string }> = {
  START:        { label: 'Baslangic',     icon: Play,       color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  TASK:         { label: 'Gorev',         icon: CheckSquare, color: 'text-blue-600',   bg: 'bg-blue-50',    border: 'border-blue-200' },
  APPROVAL:     { label: 'Onay',          icon: UserCheck,   color: 'text-amber-600',  bg: 'bg-amber-50',   border: 'border-amber-200' },
  DECISION:     { label: 'Karar',         icon: GitBranch,   color: 'text-purple-600', bg: 'bg-purple-50',  border: 'border-purple-200' },
  NOTIFICATION: { label: 'Bildirim',      icon: Bell,        color: 'text-indigo-600', bg: 'bg-indigo-50',  border: 'border-indigo-200' },
  OPERIQ:       { label: 'OperIQ',        icon: Cpu,         color: 'text-teal-600',   bg: 'bg-teal-50',    border: 'border-teal-200' },
  STOCK_ACTION: { label: 'Stok Aksiyonu', icon: Package,     color: 'text-orange-600', bg: 'bg-orange-50',  border: 'border-orange-200' },
  DELAY:        { label: 'Bekleme',       icon: Clock,       color: 'text-slate-600',  bg: 'bg-slate-50',   border: 'border-slate-200' },
  END:          { label: 'Bitis',         icon: Square,      color: 'text-red-600',    bg: 'bg-red-50',     border: 'border-red-200' },
}

const INSTANCE_CONFIG: Record<InstanceStatus, { label: string; bg: string; text: string; border: string; pulse?: boolean }> = {
  RUNNING:   { label: 'Calisiyor',   bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    pulse: true },
  COMPLETED: { label: 'Tamamlandi',  bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  FAILED:    { label: 'Basarisiz',   bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200' },
  CANCELLED: { label: 'Iptal',       bg: 'bg-zinc-50',    text: 'text-zinc-600',    border: 'border-zinc-200' },
  PAUSED:    { label: 'Duraklatildi', bg: 'bg-amber-50',  text: 'text-amber-700',   border: 'border-amber-200' },
}

const CATEGORY_LABELS: Record<string, string> = {
  bakim: 'Bakim',
  onay: 'Onay',
  iot: 'IoT',
  stok: 'Stok',
  genel: 'Genel',
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: WorkflowStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border', cfg.bg, cfg.text, cfg.border)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  )
}

function InstanceBadge({ status }: { status: InstanceStatus }) {
  const cfg = INSTANCE_CONFIG[status] ?? INSTANCE_CONFIG.RUNNING
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border', cfg.bg, cfg.text, cfg.border)}>
      {cfg.pulse && <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" /></span>}
      {cfg.label}
    </span>
  )
}

function StepBadge({ type }: { type: StepType }) {
  const cfg = STEP_CONFIG[type]
  if (!cfg) return <span className="text-xs text-zinc-400">{type}</span>
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border', cfg.bg, cfg.color, cfg.border)}>
      <cfg.icon size={12} />
      {cfg.label}
    </span>
  )
}

function SummaryCard({ icon: Icon, label, value, color, bg }: {
  icon: typeof BarChart3; label: string; value: number | string; color: string; bg: string
}) {
  return (
    <div className="surface rounded-xl p-4 flex items-center gap-3">
      <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', bg)}>
        <Icon size={18} className={color} />
      </div>
      <div>
        <p className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>{value}</p>
        <p className="text-xs" style={{ color: 'var(--text-3)' }}>{label}</p>
      </div>
    </div>
  )
}

function getStepConfigSummary(step: WorkflowStep): string {
  const c = step.config
  if (!c || Object.keys(c).length === 0) return ''
  if (step.type === 'TASK') return (c.title as string) || ''
  if (step.type === 'APPROVAL') return c.approverRole ? `Onaylayan: ${c.approverRole}` : ''
  if (step.type === 'NOTIFICATION') return (c.title as string) || ''
  if (step.type === 'OPERIQ') return (c.analysisType as string)?.replace(/_/g, ' ') || ''
  if (step.type === 'DELAY') return c.delayMinutes ? `${c.delayMinutes} dk` : ''
  if (step.type === 'STOCK_ACTION') return c.action ? `Islem: ${c.action}` : ''
  if (step.type === 'DECISION') return c.condition ? String(c.condition) : ''
  return step.description || ''
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDateTime(d: string | null | undefined): string {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function Workflows() {
  const [tab, setTab] = useState<Tab>('list')
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | ''>('')
  const [search, setSearch] = useState('')
  const [instanceStatusFilter, setInstanceStatusFilter] = useState<InstanceStatus | ''>('')

  // Modals
  const [creating, setCreating] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null)
  // Locally track workflows that were just started (instant UI feedback)
  const [justStartedIds, setJustStartedIds] = useState<Set<string>>(new Set())
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null)
  const [addingStep, setAddingStep] = useState(false)

  // Data
  const { data: workflowsData, loading: wfLoading, refetch: refetchWf } = useWorkflows({
    ...(statusFilter && { status: statusFilter }),
    ...(search && { search }),
  })
  const { data: stats, loading: statsLoading, refetch: refetchStats } = useWorkflowStats()
  const { data: instancesData, loading: instLoading, refetch: refetchInst } = useWorkflowInstances({
    ...(instanceStatusFilter && { status: instanceStatusFilter }),
  })
  const { data: templatesData, refetch: refetchTemplates } = useWorkflowTemplates()
  const { data: selectedWorkflow, loading: detailLoading, refetch: refetchDetail } = useWorkflow(selectedWorkflowId || '')

  const workflows: Workflow[] = workflowsData?.data ?? []
  const instances: WorkflowInstance[] = instancesData?.data ?? []
  const templates = (templatesData as any[]) ?? []

  // Track which workflows have running instances (from API + locally started)
  const runningWorkflowIds = useMemo(() => {
    const ids = new Set<string>(justStartedIds)
    for (const inst of instances) {
      if (inst.status === 'RUNNING') ids.add(inst.workflowId)
    }
    return ids
  }, [instances, justStartedIds])

  // Sorted steps for designer
  const sortedSteps: WorkflowStep[] = useMemo(() => {
    if (!selectedWorkflow?.steps) return []
    return [...selectedWorkflow.steps].sort((a: WorkflowStep, b: WorkflowStep) => a.order - b.order)
  }, [selectedWorkflow])

  // ── CRUD Handlers ─────────────────────────────────────────────────────────

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    try {
      await createWorkflow({
        name: fd.get('name'),
        description: fd.get('description') || undefined,
        category: fd.get('category') || undefined,
        triggerConfig: { type: fd.get('triggerType') || 'MANUAL' },
      })
      setCreating(false)
      refetchWf()
      refetchStats()
    } catch (err: any) {
      alert(err?.message || 'Is akisi olusturulamadi')
    }
  }

  const handleStatusChange = async (id: string, status: WorkflowStatus) => {
    await updateWorkflowStatus(id, status)
    refetchWf()
    refetchStats()
    if (selectedWorkflowId === id) refetchDetail()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu is akisini silmek istediginize emin misiniz? Bu islem geri alinamaz.')) return
    await deleteWorkflow(id)
    if (selectedWorkflowId === id) setSelectedWorkflowId(null)
    refetchWf()
    refetchStats()
  }

  const handleStartInstance = async (workflowId: string) => {
    try {
      await startWorkflowInstance(workflowId)
      setJustStartedIds(prev => new Set(prev).add(workflowId))
      refetchInst()
      refetchStats()
      refetchWf()
      setTab('instances')
    } catch { /* ignore */ }
  }

  const handleCancelInstance = async (instanceId: string) => {
    if (!confirm('Bu calisan akisi iptal etmek istediginize emin misiniz?')) return
    await cancelWorkflowInstance(instanceId)
    refetchInst()
    refetchStats()
  }

  const handleCloneTemplate = async (templateId: string) => {
    await cloneWorkflowTemplate(templateId)
    setShowTemplates(false)
    refetchWf()
    refetchStats()
  }

  const handleAddStep = async (e: React.FormEvent<HTMLFormElement>) => {
    if (!selectedWorkflowId) return
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const config: Record<string, unknown> = {}
    const configStr = (fd.get('config') as string) || ''
    if (configStr) {
      try { Object.assign(config, JSON.parse(configStr)) } catch { /* ignore */ }
    }
    await addWorkflowStep(selectedWorkflowId, {
      type: fd.get('type'),
      name: fd.get('name'),
      description: fd.get('description') || undefined,
      order: sortedSteps.length,
      config,
    })
    setAddingStep(false)
    refetchDetail()
    refetchWf()
  }

  const handleUpdateStep = async (e: React.FormEvent<HTMLFormElement>) => {
    if (!selectedWorkflowId || !editingStep) return
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const config: Record<string, unknown> = {}
    const configStr = (fd.get('config') as string) || ''
    if (configStr) {
      try { Object.assign(config, JSON.parse(configStr)) } catch { /* ignore */ }
    }
    await updateWorkflowStep(selectedWorkflowId, editingStep.id, {
      name: fd.get('name'),
      description: fd.get('description') || undefined,
      config,
    })
    setEditingStep(null)
    refetchDetail()
  }

  const handleDeleteStep = async (stepId: string) => {
    if (!selectedWorkflowId) return
    if (!confirm('Bu adimi silmek istediginize emin misiniz?')) return
    await deleteWorkflowStep(selectedWorkflowId, stepId)
    refetchDetail()
    refetchWf()
  }

  const openDesigner = (wf: Workflow) => {
    setSelectedWorkflowId(wf.id)
    setTab('designer')
  }

  // ── TAB 1: Workflow List ──────────────────────────────────────────────────

  const renderList = () => (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          icon={Layers}
          label="Toplam Is Akisi"
          value={stats?.totalWorkflows ?? 0}
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <SummaryCard
          icon={Zap}
          label="Aktif"
          value={stats?.activeWorkflows ?? 0}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
        <SummaryCard
          icon={Activity}
          label="Calisan"
          value={stats?.runningInstances ?? 0}
          color="text-indigo-600"
          bg="bg-indigo-50"
        />
        <SummaryCard
          icon={BarChart3}
          label="Tamamlanma Orani"
          value={stats?.completionRate != null ? `%${stats.completionRate}` : '-'}
          color="text-purple-600"
          bg="bg-purple-50"
        />
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Is akisi ara..."
            className="input w-full pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <div className="flex gap-1.5">
          {(['', 'TASLAK', 'AKTIF', 'PASIF', 'ARSIVLENDI'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s as WorkflowStatus | '')}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                statusFilter === s
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'surface border hover:opacity-80',
              )}
              style={statusFilter !== s ? { borderColor: 'var(--border)', color: 'var(--text-2)' } : undefined}
            >
              {s === '' ? 'Tumu' : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setShowTemplates(true)}
            className="btn-secondary flex items-center gap-1.5 px-3 py-2 text-sm"
          >
            <Copy size={15} /> Sablondan Olustur
          </button>
          <button
            onClick={() => setCreating(true)}
            className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm"
          >
            <Plus size={16} /> Yeni Is Akisi
          </button>
        </div>
      </div>

      {/* Workflow Cards */}
      {wfLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin" size={24} style={{ color: 'var(--text-3)' }} /></div>
      ) : workflows.length === 0 ? (
        <div className="text-center py-16 text-sm" style={{ color: 'var(--text-3)' }}>
          {search || statusFilter ? 'Filtreyle eslesen is akisi bulunamadi' : 'Henuz is akisi olusturulmamis'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {workflows.map((wf: Workflow) => (
            <div
              key={wf.id}
              className="surface rounded-xl p-5 hover:shadow-md transition-all cursor-pointer group"
              style={{ border: '1px solid var(--border)' }}
              onClick={() => openDesigner(wf)}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>
                    {wf.name}
                  </h3>
                  {wf.description && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-3)' }}>
                      {wf.description}
                    </p>
                  )}
                </div>
                <StatusBadge status={wf.status} />
              </div>

              {/* Meta */}
              <div className="flex items-center gap-3 mb-3">
                {wf.category && (
                  <span className="text-xs px-2 py-0.5 rounded-md surface" style={{ color: 'var(--text-2)', border: '1px solid var(--border)' }}>
                    {CATEGORY_LABELS[wf.category] ?? wf.category}
                  </span>
                )}
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                  {wf.steps?.length ?? 0} adim
                </span>
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                  {wf._count?.instances ?? 0} calisma
                </span>
              </div>

              {/* Step preview */}
              {wf.steps && wf.steps.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {wf.steps.slice(0, 5).map((s: WorkflowStep) => {
                    const cfg = STEP_CONFIG[s.type]
                    return cfg ? (
                      <span key={s.id} className={clsx('w-6 h-6 rounded flex items-center justify-center', cfg.bg)} title={s.name}>
                        <cfg.icon size={12} className={cfg.color} />
                      </span>
                    ) : null
                  })}
                  {wf.steps.length > 5 && (
                    <span className="w-6 h-6 rounded flex items-center justify-center bg-zinc-100 text-zinc-500 text-[10px] font-bold">
                      +{wf.steps.length - 5}
                    </span>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                  {wf.createdBy?.name || '-'} - {formatDate(wf.updatedAt)}
                </span>
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  {runningWorkflowIds.has(wf.id) ? (
                    <button
                      onClick={() => setTab('instances')}
                      title="Calisan akislari gor"
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-50 text-blue-600 border border-blue-200 text-[10px] font-semibold transition-colors hover:bg-blue-100"
                    >
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                      </span>
                      Calisiyor
                    </button>
                  ) : wf.status === 'AKTIF' ? (
                    <button
                      onClick={() => handleStartInstance(wf.id)}
                      title="Calistir"
                      className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Play size={14} />
                    </button>
                  ) : null}
                  <button
                    onClick={() => openDesigner(wf)}
                    title="Tasarimcida Ac"
                    className="p-1.5 rounded hover:bg-blue-50 text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(wf.id)}
                    title="Sil"
                    className="p-1.5 rounded hover:bg-red-50 text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Top workflows */}
      {stats?.topWorkflows?.length > 0 && (
        <div className="surface rounded-xl p-5" style={{ border: '1px solid var(--border)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-1)' }}>En Cok Kullanilan Is Akislari</h3>
          <div className="space-y-2">
            {stats.topWorkflows.map((tw: any) => (
              <div key={tw.id} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: 'var(--bg)' }}>
                <span className="text-sm font-medium flex-1 truncate" style={{ color: 'var(--text-1)' }}>{tw.name}</span>
                {tw.category && (
                  <span className="text-xs px-2 py-0.5 rounded surface" style={{ border: '1px solid var(--border)', color: 'var(--text-3)' }}>
                    {CATEGORY_LABELS[tw.category] ?? tw.category}
                  </span>
                )}
                <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--text-2)' }}>
                  {tw._count?.instances ?? 0} calisma
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  // ── TAB 2: Designer ───────────────────────────────────────────────────────

  const renderDesigner = () => {
    if (!selectedWorkflowId) {
      return (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <GitBranch size={28} className="text-blue-400" />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>
            Tasarimcida goruntulemek icin bir is akisi secin
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
            Is Akislari sekmesinden bir akisa tiklayarak baslayabilirsiniz
          </p>
          <button
            onClick={() => setTab('list')}
            className="btn-secondary mt-4 px-4 py-2 text-sm"
          >
            Is Akislarina Don
          </button>
        </div>
      )
    }

    if (detailLoading && !selectedWorkflow) {
      return (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin" size={24} style={{ color: 'var(--text-3)' }} />
        </div>
      )
    }

    if (!selectedWorkflow || !selectedWorkflow.name) {
      return (
        <div className="text-center py-20 text-sm" style={{ color: 'var(--text-3)' }}>
          Is akisi bulunamadi
        </div>
      )
    }

    const wf = selectedWorkflow as Workflow

    return (
      <div className="space-y-5">
        {/* Workflow header bar */}
        <div className="surface rounded-xl p-4 flex items-center justify-between gap-4" style={{ border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <GitBranch size={18} className="text-blue-600" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>{wf.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <StatusBadge status={wf.status} />
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>v{wf.version} - {sortedSteps.length} adim</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {wf.status === 'TASLAK' && (
              <button
                onClick={() => handleStatusChange(wf.id, 'AKTIF')}
                className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs"
              >
                <Zap size={13} /> Aktiflestir
              </button>
            )}
            {wf.status === 'AKTIF' && (
              <>
                {runningWorkflowIds.has(wf.id) ? (
                  <button
                    onClick={() => setTab('instances')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 text-xs font-semibold hover:bg-blue-100 transition-colors"
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                    </span>
                    Calisiyor
                  </button>
                ) : (
                  <button
                    onClick={() => handleStartInstance(wf.id)}
                    className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs"
                  >
                    <Play size={13} /> Calistir
                  </button>
                )}
                <button
                  onClick={() => handleStatusChange(wf.id, 'PASIF')}
                  className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs"
                >
                  Pasife Al
                </button>
              </>
            )}
            {wf.status === 'PASIF' && (
              <button
                onClick={() => handleStatusChange(wf.id, 'AKTIF')}
                className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs"
              >
                <Zap size={13} /> Tekrar Aktifle
              </button>
            )}
            <button
              onClick={() => { setSelectedWorkflowId(null); setTab('list') }}
              className="btn-ghost p-1.5"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Visual Flow */}
        <div className="flex justify-center">
          <div className="w-full max-w-lg">
            {sortedSteps.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>Henuz adim eklenmemis</p>
                <button
                  onClick={() => setAddingStep(true)}
                  className="btn-primary mt-3 flex items-center gap-1.5 px-4 py-2 text-sm mx-auto"
                >
                  <Plus size={15} /> Ilk Adimi Ekle
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                {sortedSteps.map((step, idx) => {
                  const cfg = STEP_CONFIG[step.type] ?? STEP_CONFIG.TASK
                  const Icon = cfg.icon
                  const summary = getStepConfigSummary(step)
                  const isFirst = idx === 0
                  const isLast = idx === sortedSteps.length - 1

                  return (
                    <div key={step.id} className="w-full flex flex-col items-center">
                      {/* Connector line */}
                      {!isFirst && (
                        <div className="w-px h-8" style={{ background: 'var(--border)' }}>
                          <div className="w-2 h-2 rounded-full mx-auto -translate-x-[3px] translate-y-[12px]" style={{ background: 'var(--border)' }} />
                        </div>
                      )}

                      {/* Step card */}
                      <div
                        className={clsx(
                          'w-full surface rounded-xl p-4 cursor-pointer hover:shadow-md transition-all group/step relative',
                          isFirst && 'ring-1 ring-emerald-200',
                          isLast && step.type === 'END' && 'ring-1 ring-red-200',
                        )}
                        style={{ border: `1px solid var(--border)` }}
                        onClick={() => setEditingStep(step)}
                      >
                        <div className="flex items-start gap-3">
                          {/* Icon */}
                          <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', cfg.bg)}>
                            <Icon size={18} className={cfg.color} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{step.name}</span>
                              <StepBadge type={step.type} />
                            </div>
                            {summary && (
                              <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>{summary}</p>
                            )}
                            {step.description && !summary && (
                              <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>{step.description}</p>
                            )}
                          </div>

                          {/* Order badge */}
                          <span className="text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded surface flex-shrink-0" style={{ color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                            #{idx + 1}
                          </span>
                        </div>

                        {/* Hover actions */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover/step:opacity-100 transition-opacity flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setEditingStep(step)}
                            title="Duzenle"
                            className="p-1 rounded hover:bg-blue-50 text-blue-600 transition-colors"
                          >
                            <Pencil size={12} />
                          </button>
                          {step.type !== 'START' && step.type !== 'END' && (
                            <button
                              onClick={() => handleDeleteStep(step.id)}
                              title="Sil"
                              className="p-1 rounded hover:bg-red-50 text-red-500 transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Add step button */}
                <div className="w-px h-8" style={{ background: 'var(--border)' }} />
                <button
                  onClick={() => setAddingStep(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:shadow-md surface"
                  style={{ border: '2px dashed var(--border)', color: 'var(--text-2)' }}
                >
                  <Plus size={16} /> Adim Ekle
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── TAB 3: Running Instances ──────────────────────────────────────────────

  const renderInstances = () => (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5">
          {(['', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'] as const).map(s => (
            <button
              key={s}
              onClick={() => setInstanceStatusFilter(s as InstanceStatus | '')}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                instanceStatusFilter === s
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'surface border hover:opacity-80',
              )}
              style={instanceStatusFilter !== s ? { borderColor: 'var(--border)', color: 'var(--text-2)' } : undefined}
            >
              {s === '' ? 'Tumu' : (INSTANCE_CONFIG[s]?.label ?? s)}
            </button>
          ))}
        </div>
        <button
          onClick={() => refetchInst()}
          className="btn-ghost ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs"
        >
          <Activity size={13} /> Yenile
        </button>
      </div>

      {/* Instances table */}
      {instLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin" size={24} style={{ color: 'var(--text-3)' }} /></div>
      ) : instances.length === 0 ? (
        <div className="text-center py-16 text-sm" style={{ color: 'var(--text-3)' }}>
          {instanceStatusFilter ? 'Filtreyle eslesen calisma bulunamadi' : 'Henuz calisma yok'}
        </div>
      ) : (
        <div className="surface rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-2)' }}>Is Akisi</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-2)' }}>Durum</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-2)' }}>Baslatan</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-2)' }}>Ilerleme</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-2)' }}>Baslangic</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-2)' }}>Bitis</th>
                  <th className="text-right px-4 py-3 font-semibold" style={{ color: 'var(--text-2)' }}>Islemler</th>
                </tr>
              </thead>
              <tbody>
                {instances.map((inst: WorkflowInstance) => {
                  const totalSteps = inst._count?.stepInstances ?? 0
                  return (
                    <tr key={inst.id} style={{ borderBottom: '1px solid var(--border)' }} className="hover:opacity-80 transition-opacity">
                      <td className="px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>
                            {inst.workflow?.name ?? '-'}
                          </p>
                          {inst.workflow?.category && (
                            <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                              {CATEGORY_LABELS[inst.workflow.category] ?? inst.workflow.category}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <InstanceBadge status={inst.status} />
                      </td>
                      <td className="px-4 py-3">
                        {inst.startedBy ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-[8px] font-bold">{inst.startedBy.name[0]}</span>
                            </div>
                            <span className="text-xs" style={{ color: 'var(--text-2)' }}>{inst.startedBy.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--text-3)' }}>Otomatik</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 min-w-[100px]">
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                            <div
                              className={clsx('h-full rounded-full transition-all', {
                                'bg-blue-500': inst.status === 'RUNNING',
                                'bg-emerald-500': inst.status === 'COMPLETED',
                                'bg-red-500': inst.status === 'FAILED',
                                'bg-zinc-400': inst.status === 'CANCELLED',
                                'bg-amber-500': inst.status === 'PAUSED',
                              })}
                              style={{ width: inst.status === 'COMPLETED' ? '100%' : totalSteps > 0 ? `${Math.max(10, Math.round((1 / totalSteps) * 100))}%` : '0%' }}
                            />
                          </div>
                          <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--text-2)' }}>
                            {totalSteps}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-3)' }}>
                        {formatDateTime(inst.startedAt)}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-3)' }}>
                        {formatDateTime(inst.completedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {inst.workflow?.id && (
                            <button
                              onClick={() => openDesigner({ id: inst.workflow!.id } as Workflow)}
                              title="Is Akisini Gor"
                              className="p-1.5 rounded hover:bg-blue-50 text-blue-600 transition-colors"
                            >
                              <Eye size={14} />
                            </button>
                          )}
                          {inst.status === 'RUNNING' && (
                            <button
                              onClick={() => handleCancelInstance(inst.id)}
                              title="Iptal Et"
                              className="p-1.5 rounded hover:bg-red-50 text-red-500 transition-colors"
                            >
                              <XCircle size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 text-xs" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-3)' }}>
            Toplam {instancesData?.meta?.total ?? instances.length} calisma
          </div>
        </div>
      )}

      {/* Error instances callout */}
      {instances.some((i: WorkflowInstance) => i.status === 'FAILED' && i.errorMessage) && (
        <div className="surface rounded-xl p-4" style={{ border: '1px solid var(--border)' }}>
          <h4 className="text-xs font-semibold mb-2 text-red-600">Hata Detaylari</h4>
          <div className="space-y-1.5">
            {instances
              .filter((i: WorkflowInstance) => i.status === 'FAILED' && i.errorMessage)
              .slice(0, 5)
              .map((i: WorkflowInstance) => (
                <div key={i.id} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-xs">
                  <XCircle size={13} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="font-medium text-red-700">{i.workflow?.name ?? 'Bilinmeyen'}</span>
                    <span className="text-red-600 ml-1">{i.errorMessage}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )

  // ── Step Form (shared between add & edit) ──────────────────────────────────

  const renderStepForm = (
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void,
    defaults?: WorkflowStep | null,
    isEdit?: boolean,
  ) => (
    <form onSubmit={onSubmit} className="space-y-4 px-5 py-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-2)' }}>Adim Adi *</label>
          <input
            name="name"
            defaultValue={defaults?.name}
            required
            className="input w-full px-3 py-2 text-sm"
            placeholder="Orn: Yonetici Onayi"
          />
        </div>
        {!isEdit && (
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-2)' }}>Adim Tipi *</label>
            <select name="type" defaultValue={defaults?.type ?? 'TASK'} required className="select w-full px-3 py-2 text-sm">
              {Object.entries(STEP_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div>
        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-2)' }}>Aciklama</label>
        <input
          name="description"
          defaultValue={defaults?.description ?? ''}
          className="input w-full px-3 py-2 text-sm"
          placeholder="Adim hakkinda kisa bilgi"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-2)' }}>
          Konfigurasyon (JSON)
        </label>
        <textarea
          name="config"
          rows={4}
          defaultValue={defaults?.config ? JSON.stringify(defaults.config, null, 2) : '{}'}
          className="input w-full px-3 py-2 text-sm font-mono resize-none"
          placeholder='{"key": "value"}'
        />
        <p className="text-[10px] mt-1" style={{ color: 'var(--text-3)' }}>
          JSON formati: Adim tipine gore degisir (orn. TASK icin title, priority; APPROVAL icin approverRole)
        </p>
      </div>
      {isEdit && defaults && (
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-3)' }}>Tip:</span>
          <StepBadge type={defaults.type} />
          <span className="text-xs ml-2" style={{ color: 'var(--text-3)' }}>Sira: {defaults.order}</span>
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={() => { setAddingStep(false); setEditingStep(null) }}
          className="btn-ghost px-4 py-2 text-sm"
        >
          Iptal
        </button>
        <button type="submit" className="btn-primary px-5 py-2 text-sm">
          {isEdit ? 'Guncelle' : 'Ekle'}
        </button>
      </div>
    </form>
  )

  // ── Tabs Config ───────────────────────────────────────────────────────────

  const TABS: { key: Tab; label: string; icon: typeof Layers }[] = [
    { key: 'list',      label: 'Is Akislari',    icon: Layers },
    { key: 'designer',  label: 'Tasarimci',      icon: GitBranch },
    { key: 'instances', label: 'Calisan Akislar', icon: Activity },
  ]

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-1)' }}>
          Is Akisi Yoneticisi
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
          Is sureclerinizi gorsel olarak tasarlayin, otomasyona alin ve takip edin
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: 'var(--bg)' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
              tab === t.key
                ? 'surface shadow-sm'
                : 'hover:opacity-80',
            )}
            style={tab === t.key ? { color: 'var(--text-1)' } : { color: 'var(--text-3)' }}
          >
            <t.icon size={16} />
            {t.label}
            {t.key === 'instances' && stats?.runningInstances ? (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-600">
                {stats.runningInstances}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'list' && renderList()}
      {tab === 'designer' && renderDesigner()}
      {tab === 'instances' && renderInstances()}

      {/* ── Create Workflow Modal ─────────────────────────────────────────── */}
      {creating && (
        <DraggableModal title="Yeni Is Akisi" onClose={() => setCreating(false)} width={520}>
          <form onSubmit={handleCreate} className="space-y-4 px-5 py-4">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-2)' }}>Is Akisi Adi *</label>
              <input
                name="name"
                required
                className="input w-full px-3 py-2 text-sm"
                placeholder="Orn: Bakim Is Akisi"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-2)' }}>Aciklama</label>
              <textarea
                name="description"
                rows={2}
                className="input w-full px-3 py-2 text-sm resize-none"
                placeholder="Is akisinin amaci ve kapsamini kisa anlatiniz"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-2)' }}>Kategori</label>
                <select name="category" className="select w-full px-3 py-2 text-sm">
                  <option value="">Secilmedi</option>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-2)' }}>Tetikleme</label>
                <select name="triggerType" className="select w-full px-3 py-2 text-sm">
                  <option value="MANUAL">Manuel</option>
                  <option value="IOT_ALERT">IoT Alert</option>
                  <option value="STOCK_CRITICAL">Stok Kritik</option>
                  <option value="SCHEDULED">Zamanlanmis</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setCreating(false)} className="btn-ghost px-4 py-2 text-sm">
                Iptal
              </button>
              <button type="submit" className="btn-primary px-5 py-2 text-sm">
                Olustur
              </button>
            </div>
          </form>
        </DraggableModal>
      )}

      {/* ── Templates Modal ──────────────────────────────────────────────── */}
      {showTemplates && (
        <DraggableModal title="Sablon Kutuphanesi" onClose={() => setShowTemplates(false)} width={640}>
          <div className="px-5 py-4 space-y-3">
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>
              Hazir bir sablondan is akisi olusturun. Sablonu klonladiktan sonra ihtiyaciniza gore duzenleme yapabilirsiniz.
            </p>
            {templates.length === 0 ? (
              <div className="text-center py-8 text-sm" style={{ color: 'var(--text-3)' }}>
                Sablon bulunamadi
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map((tpl: any) => (
                  <div
                    key={tpl.id}
                    className="surface rounded-xl p-4 hover:shadow-md transition-all"
                    style={{ border: '1px solid var(--border)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{tpl.name}</h4>
                        {tpl.description && (
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{tpl.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {tpl.category && (
                            <span className="text-[10px] px-2 py-0.5 rounded surface" style={{ border: '1px solid var(--border)', color: 'var(--text-3)' }}>
                              {CATEGORY_LABELS[tpl.category] ?? tpl.category}
                            </span>
                          )}
                          <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                            {tpl.steps?.length ?? 0} adim
                          </span>
                        </div>
                        {/* Step type preview */}
                        {tpl.steps && tpl.steps.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {tpl.steps.map((s: any, i: number) => {
                              const cfg = STEP_CONFIG[s.type as StepType]
                              return cfg ? (
                                <span key={i} className={clsx('w-5 h-5 rounded flex items-center justify-center', cfg.bg)} title={s.name}>
                                  <cfg.icon size={10} className={cfg.color} />
                                </span>
                              ) : null
                            })}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleCloneTemplate(tpl.id)}
                        className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs flex-shrink-0"
                      >
                        <Copy size={13} /> Klonla
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DraggableModal>
      )}

      {/* ── Add Step Modal ───────────────────────────────────────────────── */}
      {addingStep && (
        <DraggableModal title="Yeni Adim Ekle" onClose={() => setAddingStep(false)} width={520}>
          {renderStepForm(handleAddStep)}
        </DraggableModal>
      )}

      {/* ── Edit Step Modal ──────────────────────────────────────────────── */}
      {editingStep && (
        <DraggableModal title={`Adim Duzenle - ${editingStep.name}`} onClose={() => setEditingStep(null)} width={520}>
          {renderStepForm(handleUpdateStep, editingStep, true)}
        </DraggableModal>
      )}
    </div>
  )
}
