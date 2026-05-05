import { useState, useEffect, useCallback } from 'react'
import {
  Plus, ArrowLeft, ArrowRight, Clock, Send, Check, XCircle, RotateCcw,
  Loader2, AlertCircle, ListChecks, MessageSquare, Paperclip, Package,
  History, ChevronRight, FileText,
} from 'lucide-react'
import clsx from 'clsx'
import { api, mapWorkOrder } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { ROLE_HIERARCHY } from '../../types'
import type {
  WorkOrder, WorkOrderStatus, WorkOrderComment, TaskPriority, UserRole,
} from '../../types'

// ── Status color map ────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  taslak: 'bg-gray-100 text-gray-700',
  mudur_onay_bekliyor: 'bg-yellow-100 text-yellow-700',
  revize_istendi: 'bg-orange-100 text-orange-700',
  karsi_taraf_bekliyor: 'bg-blue-100 text-blue-700',
  reddedildi: 'bg-red-100 text-red-700',
  devam_ediyor: 'bg-cyan-100 text-cyan-700',
  tamamlandi_onay_bekliyor: 'bg-purple-100 text-purple-700',
  acan_onay_bekliyor: 'bg-indigo-100 text-indigo-700',
  kapandi: 'bg-green-100 text-green-700',
}

// ── Status labels TR/EN ─────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, { tr: string; en: string }> = {
  taslak: { tr: 'Taslak', en: 'Draft' },
  mudur_onay_bekliyor: { tr: 'Onay Bekliyor', en: 'Pending Approval' },
  revize_istendi: { tr: 'Revize', en: 'Revision' },
  karsi_taraf_bekliyor: { tr: 'Karsi Taraf', en: 'Pending Target' },
  reddedildi: { tr: 'Reddedildi', en: 'Rejected' },
  devam_ediyor: { tr: 'Devam Ediyor', en: 'In Progress' },
  tamamlandi_onay_bekliyor: { tr: 'Tamamlandi', en: 'Completed' },
  acan_onay_bekliyor: { tr: 'Acan Onay', en: 'Requester Approval' },
  kapandi: { tr: 'Kapandi', en: 'Closed' },
}

// ── Priority colors ─────────────────────────────────────────────────────────
const PRIORITY_COLORS: Record<string, string> = {
  dusuk: 'bg-slate-100 text-slate-600',
  normal: 'bg-blue-100 text-blue-700',
  yuksek: 'bg-orange-100 text-orange-700',
  kritik: 'bg-red-100 text-red-700',
}

const PRIORITY_LABELS: Record<string, { tr: string; en: string }> = {
  dusuk: { tr: 'Dusuk', en: 'Low' },
  normal: { tr: 'Normal', en: 'Normal' },
  yuksek: { tr: 'Yuksek', en: 'High' },
  kritik: { tr: 'Kritik', en: 'Critical' },
}

// ── Helper ──────────────────────────────────────────────────────────────────
function canCreate(role: UserRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY['supervizor']
}

function formatDate(d: string | null): string {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatShortDate(d: string | null): string {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })
}

function isOverdue(d: string | null): boolean {
  if (!d) return false
  return new Date(d) < new Date()
}

// ── Filter groups (simplified for mobile) ───────────────────────────────────
const FILTER_GROUPS: { key: string; statuses: string[]; tr: string; en: string }[] = [
  { key: 'all', statuses: [], tr: 'Tumu', en: 'All' },
  { key: 'draft', statuses: ['taslak'], tr: 'Taslak', en: 'Draft' },
  { key: 'pending', statuses: ['mudur_onay_bekliyor', 'karsi_taraf_bekliyor', 'tamamlandi_onay_bekliyor', 'acan_onay_bekliyor'], tr: 'Onay Bekliyor', en: 'Pending' },
  { key: 'active', statuses: ['devam_ediyor', 'revize_istendi'], tr: 'Devam Ediyor', en: 'Active' },
  { key: 'closed', statuses: ['kapandi'], tr: 'Kapandi', en: 'Closed' },
  { key: 'rejected', statuses: ['reddedildi'], tr: 'Reddedildi', en: 'Rejected' },
]

// ═══════════════════════════════════════════════════════════════════════════════
// ── Main Component ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export default function MobileWorkOrders() {
  const { user } = useAuth()
  const { lang } = useLanguage()
  const tr = lang === 'tr'

  const [screen, setScreen] = useState<'list' | 'detail' | 'create'>('list')
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [selected, setSelected] = useState<WorkOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])

  // Fetch departments once
  useEffect(() => {
    api.get<any>('/departments').then(r => {
      setDepartments((r?.data ?? r ?? []).map((d: any) => ({ id: d.id, name: d.name })))
    }).catch(() => {})
  }, [])

  // Fetch work orders
  const fetchWorkOrders = useCallback(async () => {
    setLoading(true)
    try {
      const group = FILTER_GROUPS.find(g => g.key === filter)
      const params = new URLSearchParams()
      if (group && group.statuses.length === 1) {
        params.set('status', group.statuses[0].toUpperCase())
      }
      const qs = params.toString()
      const res = await api.get<any>('/work-orders' + (qs ? `?${qs}` : ''))
      let items: WorkOrder[] = (res?.data ?? res ?? []).map(mapWorkOrder)

      // Client-side multi-status filter for groups with multiple statuses
      if (group && group.statuses.length > 1) {
        items = items.filter(wo => group.statuses.includes(wo.status))
      }

      setWorkOrders(items)
    } catch {
      setWorkOrders([])
    }
    setLoading(false)
  }, [filter])

  useEffect(() => { fetchWorkOrders() }, [fetchWorkOrders])

  // Select work order for detail
  const handleSelect = async (wo: WorkOrder) => {
    try {
      const detail = await api.get<any>(`/work-orders/${wo.id}`)
      setSelected(mapWorkOrder(detail))
    } catch {
      setSelected(wo)
    }
    setScreen('detail')
  }

  const handleRefetch = async () => {
    fetchWorkOrders()
    if (selected) {
      try {
        const d = await api.get<any>(`/work-orders/${selected.id}`)
        setSelected(mapWorkOrder(d))
      } catch {}
    }
  }

  // ── Render based on screen ──
  if (screen === 'create') {
    return (
      <CreateScreen
        tr={tr}
        lang={lang}
        departments={departments}
        userDeptId={user?.departmentId || ''}
        onBack={() => setScreen('list')}
        onCreated={() => { setScreen('list'); fetchWorkOrders() }}
      />
    )
  }

  if (screen === 'detail' && selected) {
    return (
      <DetailScreen
        workOrder={selected}
        tr={tr}
        lang={lang}
        userId={user?.id || ''}
        userRole={user?.role || 'isci'}
        userDeptId={user?.departmentId || ''}
        onBack={() => { setScreen('list'); setSelected(null) }}
        onRefetch={handleRefetch}
      />
    )
  }

  // ── List screen ──
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-3 flex-1 overflow-y-auto pb-24">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-900">
            {tr ? 'Is Siparisleri' : 'Work Orders'}
          </h1>
          {user && canCreate(user.role) && (
            <button
              onClick={() => setScreen('create')}
              className="px-3 py-2 text-xs font-semibold text-white rounded-lg bg-gradient-to-r from-green-500 to-cyan-500 flex items-center gap-1.5 active:scale-95 transition-transform"
            >
              <Plus size={14} /> {tr ? 'Yeni' : 'New'}
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
          {FILTER_GROUPS.map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={clsx(
                'flex-shrink-0 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap',
                filter === f.key
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500'
              )}
            >
              {f[lang as 'tr' | 'en']}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="text-cyan-500 animate-spin" />
          </div>
        ) : workOrders.length === 0 ? (
          <div className="text-center py-16">
            <FileText size={36} className="text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-medium">
              {tr ? 'Is siparisi bulunamadi' : 'No work orders found'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {workOrders.map(wo => (
              <button
                key={wo.id}
                type="button"
                onClick={() => handleSelect(wo)}
                className="w-full bg-white rounded-xl border border-slate-200 p-4 text-left active:scale-[0.98] transition-transform"
              >
                {/* Top: code + priority */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[11px] text-slate-400 font-mono">{wo.code}</span>
                  <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-full', PRIORITY_COLORS[wo.priority])}>
                    {PRIORITY_LABELS[wo.priority]?.[lang as 'tr' | 'en'] || wo.priority}
                  </span>
                </div>

                {/* Title */}
                <p className="text-sm font-semibold text-slate-900 truncate mb-1.5">{wo.title}</p>

                {/* Departments */}
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2.5">
                  <span className="truncate max-w-[120px]">{wo.requesterDept?.name || '-'}</span>
                  <ArrowRight size={12} className="text-slate-300 flex-shrink-0" />
                  <span className="truncate max-w-[120px]">{wo.targetDept?.name || '-'}</span>
                </div>

                {/* Bottom: status + due date */}
                <div className="flex items-center justify-between">
                  <span className={clsx('text-[10px] font-bold uppercase px-2 py-0.5 rounded-full', STATUS_COLORS[wo.status])}>
                    {STATUS_LABELS[wo.status]?.[lang as 'tr' | 'en'] || wo.status}
                  </span>
                  {wo.dueDate && (
                    <span className={clsx(
                      'text-[11px] flex items-center gap-1',
                      isOverdue(wo.dueDate) && wo.status !== 'kapandi' ? 'text-red-500 font-semibold' : 'text-slate-400'
                    )}>
                      <Clock size={11} />
                      {formatShortDate(wo.dueDate)}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Detail Screen ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function DetailScreen({
  workOrder, tr, lang, userId, userRole, userDeptId, onBack, onRefetch,
}: {
  workOrder: WorkOrder
  tr: boolean
  lang: string
  userId: string
  userRole: UserRole
  userDeptId: string
  onBack: () => void
  onRefetch: () => void
}) {
  const wo = workOrder
  const [activeTab, setActiveTab] = useState<'items' | 'comments' | 'attachments' | 'materials' | 'history'>('items')
  const [actionLoading, setActionLoading] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const [localComments, setLocalComments] = useState<WorkOrderComment[]>(wo.comments || [])
  const [rejectionNote, setRejectionNote] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)

  // Role checks
  const isRequesterDeptManager = userDeptId === wo.requesterDeptId && ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY['mudur']
  const isTargetDeptManager = userDeptId === wo.targetDeptId && ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY['mudur']
  const isTargetDeptSupervisor = userDeptId === wo.targetDeptId && ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY['supervizor']
  const isOwner = userId === wo.requesterUserId

  const performAction = async (action: string, extraBody?: any) => {
    setActionLoading(true)
    try {
      await api.post(`/work-orders/${wo.id}/transition`, { action, ...extraBody })
      onRefetch()
    } catch (e: any) {
      alert(e.message || (tr ? 'Islem basarisiz' : 'Action failed'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleSendComment = async () => {
    if (!commentText.trim()) return
    setSendingComment(true)
    try {
      const res = await api.post<any>(`/work-orders/${wo.id}/comments`, { content: commentText.trim() })
      setLocalComments(prev => [...prev, res])
      setCommentText('')
    } catch {}
    setSendingComment(false)
  }

  // Build action buttons
  const getActions = (): { label: string; action: string; color: string; icon: any; extraBody?: any }[] => {
    const status = wo.status
    const actions: { label: string; action: string; color: string; icon: any }[] = []

    if (status === 'taslak' && (isOwner || isRequesterDeptManager)) {
      actions.push({ label: tr ? 'Gonder' : 'Submit', action: 'submit', color: 'bg-blue-600', icon: Send })
    }

    if (status === 'mudur_onay_bekliyor' && isRequesterDeptManager) {
      actions.push(
        { label: tr ? 'Onayla' : 'Approve', action: 'approve', color: 'bg-green-600', icon: Check },
        { label: tr ? 'Revize' : 'Revise', action: 'request_revision', color: 'bg-orange-500', icon: RotateCcw },
      )
    }

    if (status === 'karsi_taraf_bekliyor' && (isTargetDeptManager || isTargetDeptSupervisor)) {
      actions.push(
        { label: tr ? 'Kabul Et' : 'Accept', action: 'accept', color: 'bg-green-600', icon: Check },
      )
    }

    if (status === 'devam_ediyor' && isTargetDeptManager) {
      actions.push({ label: tr ? 'Tamamla' : 'Complete', action: 'complete', color: 'bg-purple-600', icon: Check })
    }

    if (status === 'tamamlandi_onay_bekliyor' && isTargetDeptManager) {
      actions.push({ label: tr ? 'Onayla' : 'Approve', action: 'verify_completion', color: 'bg-green-600', icon: Check })
    }

    if (status === 'acan_onay_bekliyor' && isRequesterDeptManager) {
      actions.push(
        { label: tr ? 'Kapat' : 'Close', action: 'close', color: 'bg-green-600', icon: Check },
        { label: tr ? 'Revize' : 'Revise', action: 'request_revision', color: 'bg-orange-500', icon: RotateCcw },
      )
    }

    // Reject available for relevant statuses
    if (
      (status === 'mudur_onay_bekliyor' && isRequesterDeptManager) ||
      (status === 'karsi_taraf_bekliyor' && (isTargetDeptManager || isTargetDeptSupervisor))
    ) {
      actions.push({ label: tr ? 'Reddet' : 'Reject', action: 'reject', color: 'bg-red-600', icon: XCircle })
    }

    return actions
  }

  const actions = getActions()

  const tabs = [
    { key: 'items' as const, label: tr ? 'Kalemler' : 'Items', icon: ListChecks },
    { key: 'comments' as const, label: tr ? 'Yorumlar' : 'Comments', icon: MessageSquare },
    { key: 'attachments' as const, label: tr ? 'Ekler' : 'Files', icon: Paperclip },
    { key: 'materials' as const, label: tr ? 'Malzeme' : 'Materials', icon: Package },
    { key: 'history' as const, label: tr ? 'Gecmis' : 'History', icon: History },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-slate-800 px-4 py-3 flex items-center gap-3 safe-area-top">
        <button onClick={onBack} className="p-2 -ml-2 rounded-lg active:bg-slate-700 transition-colors">
          <ArrowLeft size={20} className="text-white" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate">{wo.code}</p>
        </div>
        <span className={clsx('text-[10px] font-bold px-2 py-1 rounded-full', STATUS_COLORS[wo.status])}>
          {STATUS_LABELS[wo.status]?.[lang as 'tr' | 'en'] || wo.status}
        </span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-28">
        <div className="p-4 space-y-4">
          {/* Title & description */}
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-1">{wo.title}</h2>
            {wo.description && (
              <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{wo.description}</p>
            )}
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-[11px] text-slate-400 mb-0.5">{tr ? 'Talep Eden' : 'Requester'}</p>
              <p className="text-slate-800 font-medium text-xs">{wo.requesterDept?.name || '-'}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-[11px] text-slate-400 mb-0.5">{tr ? 'Hedef' : 'Target'}</p>
              <p className="text-slate-800 font-medium text-xs">{wo.targetDept?.name || '-'}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-[11px] text-slate-400 mb-0.5">{tr ? 'Atanan' : 'Assignee'}</p>
              <p className="text-slate-800 font-medium text-xs">{wo.assigneeUser?.name || '-'}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-[11px] text-slate-400 mb-0.5">{tr ? 'Son Tarih' : 'Due Date'}</p>
              <p className={clsx('font-medium text-xs', wo.dueDate && isOverdue(wo.dueDate) && wo.status !== 'kapandi' ? 'text-red-600' : 'text-slate-800')}>
                {formatDate(wo.dueDate)}
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-[11px] text-slate-400 mb-0.5">{tr ? 'Tahmini Sure' : 'Est. Hours'}</p>
              <p className="text-slate-800 font-medium text-xs">{wo.estimatedHours ? `${wo.estimatedHours} ${tr ? 'saat' : 'h'}` : '-'}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-[11px] text-slate-400 mb-0.5">{tr ? 'Tahmini Maliyet' : 'Est. Cost'}</p>
              <p className="text-slate-800 font-medium text-xs">{wo.estimatedCost ? `${wo.estimatedCost} ${wo.currency || 'TRY'}` : '-'}</p>
            </div>
          </div>

          {/* Priority badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{tr ? 'Oncelik:' : 'Priority:'}</span>
            <span className={clsx('text-xs font-bold px-2.5 py-1 rounded-full', PRIORITY_COLORS[wo.priority])}>
              {PRIORITY_LABELS[wo.priority]?.[lang as 'tr' | 'en'] || wo.priority}
            </span>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto border-b border-slate-200 pb-0">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={clsx(
                    'flex-shrink-0 px-3 py-2.5 text-xs font-medium flex items-center gap-1.5 transition-colors border-b-2 -mb-px',
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-500'
                  )}
                >
                  <Icon size={13} /> {tab.label}
                </button>
              )
            })}
          </div>

          {/* Tab content */}
          <div className="min-h-[100px]">
            {activeTab === 'items' && (
              <div className="space-y-2">
                {(!wo.items || wo.items.length === 0) ? (
                  <p className="text-sm text-slate-400 italic py-4 text-center">{tr ? 'Is kalemi yok' : 'No work items'}</p>
                ) : (
                  wo.items.map(item => (
                    <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-50">
                      <div className={clsx(
                        'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0',
                        item.completed ? 'bg-green-500 border-green-500' : 'border-slate-300'
                      )}>
                        {item.completed && <Check size={12} className="text-white" />}
                      </div>
                      <span className={clsx('text-sm', item.completed ? 'text-slate-400 line-through' : 'text-slate-700')}>
                        {item.title}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'comments' && (
              <div className="space-y-3">
                {localComments.length === 0 && (
                  <p className="text-sm text-slate-400 italic py-4 text-center">{tr ? 'Henuz yorum yok' : 'No comments yet'}</p>
                )}
                {localComments.map(c => (
                  <div key={c.id} className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-700">{c.user?.name || '-'}</span>
                      <span className="text-[10px] text-slate-400">{formatDate(c.createdAt)}</span>
                    </div>
                    <p className="text-sm text-slate-600">{c.content}</p>
                  </div>
                ))}
                {/* Comment input */}
                <div className="flex gap-2 mt-3">
                  <input
                    type="text"
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSendComment() }}
                    placeholder={tr ? 'Yorum yaz...' : 'Write a comment...'}
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSendComment}
                    disabled={sendingComment || !commentText.trim()}
                    className="px-3 py-2.5 text-white bg-blue-600 rounded-lg disabled:opacity-50 active:scale-95 transition-transform min-w-[44px] flex items-center justify-center"
                  >
                    {sendingComment ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'attachments' && (
              <div className="space-y-2">
                {(!wo.attachments || wo.attachments.length === 0) ? (
                  <p className="text-sm text-slate-400 italic py-4 text-center">{tr ? 'Ek dosya yok' : 'No attachments'}</p>
                ) : (
                  wo.attachments.map(att => (
                    <div key={att.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-50">
                      <Paperclip size={14} className="text-slate-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-700 truncate">{att.fileName}</p>
                        <p className="text-[10px] text-slate-400">
                          {(att.fileSize / 1024).toFixed(1)} KB - {formatDate(att.createdAt)}
                        </p>
                      </div>
                      <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'materials' && (
              <div className="space-y-2">
                {(!wo.materials || wo.materials.length === 0) ? (
                  <p className="text-sm text-slate-400 italic py-4 text-center">{tr ? 'Malzeme yok' : 'No materials'}</p>
                ) : (
                  wo.materials.map(m => (
                    <div key={m.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-50">
                      <div>
                        <p className="text-sm text-slate-700 font-medium">{m.name}</p>
                        <p className="text-[11px] text-slate-400">{m.quantity} {m.unit}</p>
                      </div>
                      {m.unitCost !== null && (
                        <span className="text-xs text-slate-600 font-medium">{m.unitCost} TRY</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-0">
                {(!wo.history || wo.history.length === 0) ? (
                  <p className="text-sm text-slate-400 italic py-4 text-center">{tr ? 'Gecmis kaydi yok' : 'No history'}</p>
                ) : (
                  <div className="relative pl-5 py-2">
                    <div className="absolute left-2 top-4 bottom-4 w-px bg-slate-200" />
                    {wo.history.map(h => (
                      <div key={h.id} className="relative mb-4 last:mb-0">
                        <div className="absolute -left-3 top-1.5 w-2.5 h-2.5 rounded-full bg-blue-400 border-2 border-white" />
                        <div className="ml-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium text-slate-700">{h.user?.name || '-'}</span>
                            <span className="text-[10px] text-slate-400">{formatDate(h.createdAt)}</span>
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5">{h.action}</p>
                          {h.fromStatus && h.toStatus && (
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className={clsx('px-1.5 py-0.5 rounded text-[10px] font-medium', STATUS_COLORS[h.fromStatus] || 'bg-slate-100 text-slate-600')}>
                                {STATUS_LABELS[h.fromStatus]?.[lang as 'tr' | 'en'] || h.fromStatus}
                              </span>
                              <ArrowRight size={10} className="text-slate-400" />
                              <span className={clsx('px-1.5 py-0.5 rounded text-[10px] font-medium', STATUS_COLORS[h.toStatus] || 'bg-slate-100 text-slate-600')}>
                                {STATUS_LABELS[h.toStatus]?.[lang as 'tr' | 'en'] || h.toStatus}
                              </span>
                            </div>
                          )}
                          {h.note && <p className="text-[11px] text-slate-500 mt-1 italic">"{h.note}"</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reject confirmation */}
      {showRejectInput && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-4 space-y-3 safe-area-bottom">
            <p className="text-sm font-semibold text-slate-800">{tr ? 'Red Sebebi' : 'Rejection Reason'}</p>
            <input
              type="text"
              value={rejectionNote}
              onChange={e => setRejectionNote(e.target.value)}
              placeholder={tr ? 'Red sebebi (opsiyonel)...' : 'Rejection reason (optional)...'}
              className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-300"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => { performAction('reject', { note: rejectionNote || undefined }); setShowRejectInput(false) }}
                className="flex-1 py-3 text-sm font-semibold text-white bg-red-600 rounded-lg active:scale-95 transition-transform"
              >
                {tr ? 'Reddet' : 'Reject'}
              </button>
              <button
                onClick={() => setShowRejectInput(false)}
                className="flex-1 py-3 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg active:scale-95 transition-transform"
              >
                {tr ? 'Vazgec' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed bottom actions */}
      {actions.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 safe-area-bottom z-40">
          <div className="flex gap-2">
            {actions.map(act => {
              const Icon = act.icon
              if (act.action === 'reject') {
                return (
                  <button
                    key={act.action}
                    onClick={() => setShowRejectInput(true)}
                    disabled={actionLoading}
                    className={clsx(
                      'flex-1 py-3 text-sm font-semibold text-white rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50',
                      act.color
                    )}
                  >
                    <Icon size={16} /> {act.label}
                  </button>
                )
              }
              return (
                <button
                  key={act.action}
                  onClick={() => performAction(act.action)}
                  disabled={actionLoading}
                  className={clsx(
                    'flex-1 py-3 text-sm font-semibold text-white rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50',
                    act.color
                  )}
                >
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Icon size={16} />}
                  {act.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Create Screen ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function CreateScreen({
  tr, lang, departments, userDeptId, onBack, onCreated,
}: {
  tr: boolean
  lang: string
  departments: { id: string; name: string }[]
  userDeptId: string
  onBack: () => void
  onCreated: () => void
}) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    targetDeptId: '',
    requesterDeptId: userDeptId,
    priority: 'normal',
    dueDate: '',
    estimatedHours: '',
    estimatedCost: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (asDraft = false) => {
    if (!form.title.trim()) {
      setError(tr ? 'Baslik zorunludur' : 'Title is required')
      return
    }
    if (!form.targetDeptId) {
      setError(tr ? 'Hedef departman secilmelidir' : 'Target department is required')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const body: any = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        targetDeptId: form.targetDeptId,
        requesterDeptId: form.requesterDeptId || undefined,
        priority: form.priority.toUpperCase(),
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
        estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : undefined,
        estimatedCost: form.estimatedCost ? Number(form.estimatedCost) : undefined,
      }
      const wo = await api.post<any>('/work-orders', body)

      // If not draft, submit immediately
      if (!asDraft && wo?.id) {
        try {
          await api.post(`/work-orders/${wo.id}/transition`, { action: 'submit' })
        } catch {}
      }

      onCreated()
    } catch (e: any) {
      setError(e.message || (tr ? 'Bir hata olustu' : 'An error occurred'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-slate-800 px-4 py-3 flex items-center gap-3 safe-area-top">
        <button onClick={onBack} className="p-2 -ml-2 rounded-lg active:bg-slate-700 transition-colors">
          <ArrowLeft size={20} className="text-white" />
        </button>
        <h1 className="text-white text-sm font-semibold">
          {tr ? 'Yeni Is Siparisi' : 'New Work Order'}
        </h1>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-28">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2.5 text-sm flex items-center gap-2">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {/* Title */}
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">
            {tr ? 'Baslik' : 'Title'} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder={tr ? 'Is siparisi basligi' : 'Work order title'}
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">
            {tr ? 'Aciklama' : 'Description'}
          </label>
          <textarea
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            rows={4}
            className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
            placeholder={tr ? 'Detayli aciklama...' : 'Detailed description...'}
          />
        </div>

        {/* Target department */}
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">
            {tr ? 'Hedef Departman' : 'Target Dept'} <span className="text-red-500">*</span>
          </label>
          <select
            value={form.targetDeptId}
            onChange={e => setForm({ ...form, targetDeptId: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          >
            <option value="">{tr ? 'Departman sec...' : 'Select department...'}</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">
            {tr ? 'Oncelik' : 'Priority'}
          </label>
          <select
            value={form.priority}
            onChange={e => setForm({ ...form, priority: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          >
            <option value="dusuk">{tr ? 'Dusuk' : 'Low'}</option>
            <option value="normal">Normal</option>
            <option value="yuksek">{tr ? 'Yuksek' : 'High'}</option>
            <option value="kritik">{tr ? 'Kritik' : 'Critical'}</option>
          </select>
        </div>

        {/* Due date */}
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">
            {tr ? 'Son Tarih' : 'Due Date'}
          </label>
          <input
            type="date"
            value={form.dueDate}
            onChange={e => setForm({ ...form, dueDate: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        {/* Estimated hours + cost */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">
              {tr ? 'Tahmini Sure (saat)' : 'Est. Hours'}
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={form.estimatedHours}
              onChange={e => setForm({ ...form, estimatedHours: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">
              {tr ? 'Tahmini Maliyet' : 'Est. Cost'}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.estimatedCost}
              onChange={e => setForm({ ...form, estimatedCost: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      {/* Fixed bottom buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 safe-area-bottom z-40">
        <div className="flex gap-3">
          <button
            onClick={() => handleSubmit(true)}
            disabled={submitting}
            className="flex-1 py-3 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl active:scale-95 transition-transform disabled:opacity-50"
          >
            {tr ? 'Taslak Kaydet' : 'Save Draft'}
          </button>
          <button
            onClick={() => handleSubmit(false)}
            disabled={submitting}
            className="flex-1 py-3 text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-cyan-500 rounded-xl active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {tr ? 'Gonder' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}
