import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Search, Filter, Calendar, Clock, ArrowRight, X, Check, XCircle,
  RotateCcw, Send, AlertCircle, Loader2, ChevronDown, Trash2, MessageSquare,
  Paperclip, Package, History, ListChecks,
} from 'lucide-react'
import { api, mapWorkOrder, API_BASE, tokenStore } from '../lib/api'
import clsx from 'clsx'
import DraggableModal from '../components/ui/DraggableModal'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import type {
  WorkOrder, WorkOrderStatus, WorkOrderItem, WorkOrderComment,
  WorkOrderAttachment, WorkOrderMaterial, WorkOrderHistoryEntry,
  TaskPriority, UserRole,
} from '../types'
import { ROLE_HIERARCHY } from '../types'

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
  mudur_onay_bekliyor: { tr: 'Mudur Onayı Bekliyor', en: 'Pending Manager Approval' },
  revize_istendi: { tr: 'Revize İstendi', en: 'Revision Requested' },
  karsi_taraf_bekliyor: { tr: 'Karşı Taraf Bekliyor', en: 'Pending Target Approval' },
  reddedildi: { tr: 'Reddedildi', en: 'Rejected' },
  devam_ediyor: { tr: 'Devam Ediyor', en: 'In Progress' },
  tamamlandi_onay_bekliyor: { tr: 'Tamamlandı Onayı Bekliyor', en: 'Pending Completion Approval' },
  acan_onay_bekliyor: { tr: 'Açan Onayı Bekliyor', en: 'Pending Requester Approval' },
  kapandi: { tr: 'Kapandı', en: 'Closed' },
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

// ── Helper: check if user role >= supervizor ────────────────────────────────
function canCreate(role: UserRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY['supervizor']
}

// ── Format date ─────────────────────────────────────────────────────────────
function formatDate(d: string | null): string {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function isOverdue(d: string | null): boolean {
  if (!d) return false
  return new Date(d) < new Date()
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Create Modal ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function CreateWorkOrderModal({
  departments, userDeptId, lang, onClose, onCreated,
}: {
  departments: { id: string; name: string }[]
  userDeptId: string
  lang: string
  onClose: () => void
  onCreated: () => void
}) {
  const tr = lang === 'tr'
  const [form, setForm] = useState({
    title: '',
    description: '',
    targetDeptId: '',
    requesterDeptId: userDeptId,
    priority: 'normal' as string,
    dueDate: '',
    estimatedHours: '',
    estimatedCost: '',
  })
  const [items, setItems] = useState<{ title: string }[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const addItem = () => setItems([...items, { title: '' }])
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx))
  const updateItem = (idx: number, title: string) => {
    const copy = [...items]
    copy[idx] = { title }
    setItems(copy)
  }

  const handleSubmit = async () => {
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
        items: items.filter(i => i.title.trim()).map((i, idx) => ({ title: i.title.trim(), sortOrder: idx })),
      }
      await api.post('/work-orders', body)
      onCreated()
      onClose()
    } catch (e: any) {
      setError(e.message || (tr ? 'Bir hata olustu' : 'An error occurred'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DraggableModal
      title={tr ? 'Yeni Is Siparisi' : 'New Work Order'}
      onClose={onClose}
      width={600}
    >
      <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm flex items-center gap-2">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {/* Title */}
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">
            {tr ? 'Baslik' : 'Title'} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder={tr ? 'Is siparisi basligi' : 'Work order title'}
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">
            {tr ? 'Aciklama' : 'Description'}
          </label>
          <textarea
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
            placeholder={tr ? 'Detayli aciklama...' : 'Detailed description...'}
          />
        </div>

        {/* Departments row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              {tr ? 'Talep Eden Departman' : 'Requester Dept'}
            </label>
            <select
              value={form.requesterDeptId}
              onChange={e => setForm({ ...form, requesterDeptId: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">{tr ? 'Sec...' : 'Select...'}</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              {tr ? 'Hedef Departman' : 'Target Dept'} <span className="text-red-500">*</span>
            </label>
            <select
              value={form.targetDeptId}
              onChange={e => setForm({ ...form, targetDeptId: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">{tr ? 'Sec...' : 'Select...'}</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Priority + Due Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              {tr ? 'Oncelik' : 'Priority'}
            </label>
            <select
              value={form.priority}
              onChange={e => setForm({ ...form, priority: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="dusuk">{tr ? 'Dusuk' : 'Low'}</option>
              <option value="normal">Normal</option>
              <option value="yuksek">{tr ? 'Yuksek' : 'High'}</option>
              <option value="kritik">{tr ? 'Kritik' : 'Critical'}</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              {tr ? 'Son Tarih' : 'Due Date'}
            </label>
            <input
              type="date"
              value={form.dueDate}
              onChange={e => setForm({ ...form, dueDate: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Estimated hours + cost */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              {tr ? 'Tahmini Sure (saat)' : 'Estimated Hours'}
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={form.estimatedHours}
              onChange={e => setForm({ ...form, estimatedHours: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              {tr ? 'Tahmini Maliyet' : 'Estimated Cost'}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.estimatedCost}
              onChange={e => setForm({ ...form, estimatedCost: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Work items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-700">
              {tr ? 'Is Kalemleri' : 'Work Items'}
            </label>
            <button
              type="button"
              onClick={addItem}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              <Plus size={12} /> {tr ? 'Ekle' : 'Add'}
            </button>
          </div>
          {items.length === 0 && (
            <p className="text-xs text-slate-400 italic">
              {tr ? 'Henuz is kalemi eklenmedi' : 'No work items added yet'}
            </p>
          )}
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={item.title}
                  onChange={e => updateItem(idx, e.target.value)}
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder={`${tr ? 'Is kalemi' : 'Work item'} ${idx + 1}`}
                />
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="text-slate-400 hover:text-red-500 p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
        >
          {tr ? 'Iptal' : 'Cancel'}
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="px-5 py-2 text-sm font-medium text-white rounded-lg bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 disabled:opacity-50 flex items-center gap-2 transition-all"
        >
          {submitting && <Loader2 size={14} className="animate-spin" />}
          {tr ? 'Olustur' : 'Create'}
        </button>
      </div>
    </DraggableModal>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Detail Modal ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function WorkOrderDetailModal({
  workOrder, lang, userId, userRole, userDeptId, onClose, onRefetch,
}: {
  workOrder: WorkOrder
  lang: string
  userId: string
  userRole: UserRole
  userDeptId: string
  onClose: () => void
  onRefetch: () => void
}) {
  const tr = lang === 'tr'
  const wo = workOrder
  const [activeTab, setActiveTab] = useState<'items' | 'comments' | 'attachments' | 'materials' | 'history'>('items')
  const [actionLoading, setActionLoading] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const [localComments, setLocalComments] = useState<WorkOrderComment[]>(wo.comments || [])
  const [rejectionNote, setRejectionNote] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [showAssignInput, setShowAssignInput] = useState(false)
  const [assignUserId, setAssignUserId] = useState('')
  const [deptUsers, setDeptUsers] = useState<{ id: string; name: string; role: string }[]>([])

  // Fetch target dept users when assign panel opens
  useEffect(() => {
    if (!showAssignInput) return
    api.get<any>(`/users?departmentId=${wo.targetDeptId}&pageSize=100`).then((r: any) => {
      const users = (r?.data ?? r ?? []).map((u: any) => ({ id: u.id, name: u.name, role: u.role }))
      setDeptUsers(users)
    }).catch(() => {})
  }, [showAssignInput, wo.targetDeptId])

  // Determine what actions this user can take
  const isRequesterDeptManager = userDeptId === wo.requesterDeptId && ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY['mudur']
  const isTargetDeptManager = userDeptId === wo.targetDeptId && ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY['mudur']
  const isTargetDeptSupervisor = userDeptId === wo.targetDeptId && ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY['supervizor']
  const isOwner = userId === wo.requesterUserId

  const performAction = async (action: string, extraBody?: any) => {
    setActionLoading(true)
    try {
      const endpointMap: Record<string, string> = {
        submit: 'submit',
        approve: 'approve',
        reject: 'reject',
        request_revision: 'request-revision',
        accept: 'accept',
        complete: 'complete',
        verify_completion: 'approve-completion',
        close: 'close',
      }
      const endpoint = endpointMap[action] || action
      await api.post(`/work-orders/${wo.id}/${endpoint}`, extraBody || {})
      onRefetch()
      if (action === 'close' || action === 'reject') {
        onClose()
      }
    } catch (e: any) {
      alert(e.message || 'Islem basarisiz')
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

  // Action buttons based on status
  const renderActions = () => {
    const status = wo.status
    const btns: JSX.Element[] = []

    if (status === 'taslak' && (isOwner || isRequesterDeptManager)) {
      btns.push(
        <button key="submit" onClick={() => performAction('submit')} disabled={actionLoading}
          className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
          <Send size={14} /> {tr ? 'Gonder' : 'Submit'}
        </button>
      )
    }

    if (status === 'mudur_onay_bekliyor' && isRequesterDeptManager) {
      btns.push(
        <button key="approve" onClick={() => performAction('approve')} disabled={actionLoading}
          className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
          <Check size={14} /> {tr ? 'Onayla' : 'Approve'}
        </button>,
        <button key="revise" onClick={() => performAction('request_revision')} disabled={actionLoading}
          className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2">
          <RotateCcw size={14} /> {tr ? 'Revize Iste' : 'Request Revision'}
        </button>,
        <button key="reject" onClick={() => setShowRejectInput(true)} disabled={actionLoading}
          className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
          <XCircle size={14} /> {tr ? 'Reddet' : 'Reject'}
        </button>,
      )
    }

    if (status === 'karsi_taraf_bekliyor' && (isTargetDeptManager || isTargetDeptSupervisor)) {
      btns.push(
        <button key="accept" onClick={() => performAction('accept')} disabled={actionLoading}
          className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
          <Check size={14} /> {tr ? 'Kabul Et' : 'Accept'}
        </button>,
        <button key="reject" onClick={() => setShowRejectInput(true)} disabled={actionLoading}
          className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
          <XCircle size={14} /> {tr ? 'Reddet' : 'Reject'}
        </button>,
      )
    }

    if (status === 'devam_ediyor' && (isTargetDeptManager || isTargetDeptSupervisor)) {
      btns.push(
        <button key="assign" onClick={() => setShowAssignInput(true)} disabled={actionLoading}
          className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 flex items-center gap-2">
          <ArrowRight size={14} /> {tr ? 'Ata / Ilet' : 'Assign / Forward'}
        </button>
      )
    }
    if (status === 'devam_ediyor' && isTargetDeptManager) {
      btns.push(
        <button key="complete" onClick={() => performAction('complete')} disabled={actionLoading}
          className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2">
          <Check size={14} /> {tr ? 'Tamamla' : 'Complete'}
        </button>
      )
    }

    if (status === 'tamamlandi_onay_bekliyor' && isTargetDeptManager) {
      btns.push(
        <button key="verify" onClick={() => performAction('verify_completion')} disabled={actionLoading}
          className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
          <Check size={14} /> {tr ? 'Onayla' : 'Approve'}
        </button>
      )
    }

    if (status === 'acan_onay_bekliyor' && isRequesterDeptManager) {
      btns.push(
        <button key="close" onClick={() => performAction('close')} disabled={actionLoading}
          className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
          <Check size={14} /> {tr ? 'Kapat' : 'Close'}
        </button>,
        <button key="revise" onClick={() => performAction('request_revision')} disabled={actionLoading}
          className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2">
          <RotateCcw size={14} /> {tr ? 'Revize Iste' : 'Request Revision'}
        </button>,
      )
    }

    return btns
  }

  const tabs = [
    { key: 'items' as const, label: tr ? 'Is Kalemleri' : 'Items', icon: ListChecks },
    { key: 'comments' as const, label: tr ? 'Yorumlar' : 'Comments', icon: MessageSquare },
    { key: 'attachments' as const, label: tr ? 'Ekler' : 'Attachments', icon: Paperclip },
    { key: 'materials' as const, label: tr ? 'Malzemeler' : 'Materials', icon: Package },
    { key: 'history' as const, label: tr ? 'Gecmis' : 'History', icon: History },
  ]

  return (
    <DraggableModal
      title={`${wo.code} - ${wo.title}`}
      subtitle={STATUS_LABELS[wo.status]?.[lang as 'tr' | 'en'] || wo.status}
      onClose={onClose}
      width={700}
      maxHeight="90vh"
    >
      <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
        {/* Header badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={clsx('px-2.5 py-1 rounded-full text-xs font-medium', STATUS_COLORS[wo.status])}>
            {STATUS_LABELS[wo.status]?.[lang as 'tr' | 'en'] || wo.status}
          </span>
          <span className={clsx('px-2.5 py-1 rounded-full text-xs font-medium', PRIORITY_COLORS[wo.priority])}>
            {PRIORITY_LABELS[wo.priority]?.[lang as 'tr' | 'en'] || wo.priority}
          </span>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <span className="text-slate-500">{tr ? 'Talep Eden' : 'Requester'}:</span>
            <span className="ml-2 text-slate-800 font-medium">{wo.requesterDept?.name || '-'}</span>
          </div>
          <div>
            <span className="text-slate-500">{tr ? 'Hedef' : 'Target'}:</span>
            <span className="ml-2 text-slate-800 font-medium">{wo.targetDept?.name || '-'}</span>
          </div>
          <div>
            <span className="text-slate-500">{tr ? 'Talep Eden Kisi' : 'Requester'}:</span>
            <span className="ml-2 text-slate-800">{wo.requesterUser?.name || '-'}</span>
          </div>
          <div>
            <span className="text-slate-500">{tr ? 'Atanan' : 'Assignee'}:</span>
            <span className="ml-2 text-slate-800">{wo.assigneeUser?.name || '-'}</span>
          </div>
          <div>
            <span className="text-slate-500">{tr ? 'Son Tarih' : 'Due Date'}:</span>
            <span className={clsx('ml-2', wo.dueDate && isOverdue(wo.dueDate) && wo.status !== 'kapandi' ? 'text-red-600 font-medium' : 'text-slate-800')}>
              {formatDate(wo.dueDate)}
            </span>
          </div>
          <div>
            <span className="text-slate-500">{tr ? 'Olusturulma' : 'Created'}:</span>
            <span className="ml-2 text-slate-800">{formatDate(wo.createdAt)}</span>
          </div>
          <div>
            <span className="text-slate-500">{tr ? 'Tahmini Sure' : 'Est. Hours'}:</span>
            <span className="ml-2 text-slate-800">{wo.estimatedHours ? `${wo.estimatedHours} ${tr ? 'saat' : 'h'}` : '-'}</span>
          </div>
          <div>
            <span className="text-slate-500">{tr ? 'Gerceklesen Sure' : 'Actual Hours'}:</span>
            <span className="ml-2 text-slate-800">{wo.actualHours ? `${wo.actualHours} ${tr ? 'saat' : 'h'}` : '-'}</span>
          </div>
          <div>
            <span className="text-slate-500">{tr ? 'Tahmini Maliyet' : 'Est. Cost'}:</span>
            <span className="ml-2 text-slate-800">{wo.estimatedCost ? `${wo.estimatedCost} ${wo.currency || 'TRY'}` : '-'}</span>
          </div>
          <div>
            <span className="text-slate-500">{tr ? 'Gerceklesen Maliyet' : 'Actual Cost'}:</span>
            <span className="ml-2 text-slate-800">{wo.actualCost ? `${wo.actualCost} ${wo.currency || 'TRY'}` : '-'}</span>
          </div>
        </div>

        {/* Description */}
        {wo.description && (
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">{tr ? 'Aciklama' : 'Description'}</p>
            <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{wo.description}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {actionLoading && <Loader2 size={16} className="animate-spin text-slate-400" />}
          {renderActions()}
        </div>

        {/* Reject confirmation input */}
        {showRejectInput && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
            <input
              type="text"
              value={rejectionNote}
              onChange={e => setRejectionNote(e.target.value)}
              placeholder={tr ? 'Red sebebi (opsiyonel)...' : 'Rejection reason (optional)...'}
              className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-300"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { performAction('reject', { reason: rejectionNote || '-' }); setShowRejectInput(false) }}
                className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                {tr ? 'Onayla' : 'Confirm'}
              </button>
              <button
                onClick={() => setShowRejectInput(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
              >
                {tr ? 'Vazgec' : 'Cancel'}
              </button>
            </div>
          </div>
        )}

        {/* Assign input */}
        {showAssignInput && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-amber-700">{tr ? 'Kime atamak istiyorsunuz?' : 'Assign to whom?'}</p>
            <select
              value={assignUserId}
              onChange={e => setAssignUserId(e.target.value)}
              className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-300"
            >
              <option value="">{tr ? 'Kisi secin...' : 'Select person...'}</option>
              {deptUsers.filter(u => u.id !== userId).map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!assignUserId) return
                  try {
                    await api.post(`/work-orders/${wo.id}/assign`, { assigneeUserId: assignUserId })
                    setShowAssignInput(false)
                    setAssignUserId('')
                    onRefetch()
                  } catch (e: any) { alert(e.message || 'Atama basarisiz') }
                }}
                disabled={!assignUserId}
                className="px-3 py-1.5 text-xs font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-50"
              >
                {tr ? 'Ata' : 'Assign'}
              </button>
              <button
                onClick={() => { setShowAssignInput(false); setAssignUserId('') }}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
              >
                {tr ? 'Vazge\u00e7' : 'Cancel'}
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-slate-200">
          <div className="flex gap-1">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={clsx(
                    'px-3 py-2 text-xs font-medium rounded-t-lg flex items-center gap-1.5 transition-colors',
                    activeTab === tab.key
                      ? 'bg-white border border-b-0 border-slate-200 text-blue-600'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  )}
                >
                  <Icon size={13} /> {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab content */}
        <div className="min-h-[120px]">
          {activeTab === 'items' && (
            <div className="space-y-2">
              {(!wo.items || wo.items.length === 0) ? (
                <p className="text-sm text-slate-400 italic">{tr ? 'Is kalemi yok' : 'No work items'}</p>
              ) : (
                wo.items.map(item => (
                  <div key={item.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50">
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
                <p className="text-sm text-slate-400 italic">{tr ? 'Henuz yorum yok' : 'No comments yet'}</p>
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
              {/* Add comment */}
              <div className="flex gap-2 mt-3">
                <input
                  type="text"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSendComment() }}
                  placeholder={tr ? 'Yorum yaz...' : 'Write a comment...'}
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendComment}
                  disabled={sendingComment || !commentText.trim()}
                  className="px-3 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {sendingComment ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'attachments' && (
            <div className="space-y-3">
              {/* Upload button - requester can upload in request phase, target dept can upload in completion phase */}
              {(wo.requesterUserId === userId ||
                (userDeptId === wo.targetDeptId && ['devam_ediyor', 'tamamlandi_onay_bekliyor'].includes(wo.status))
              ) && (
                <label className="flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-slate-300 hover:border-cyan-400 cursor-pointer transition-colors bg-slate-50 hover:bg-cyan-50">
                  <Paperclip size={16} className="text-slate-400" />
                  <span className="text-sm text-slate-500">{tr ? 'Dosya yukle...' : 'Upload file...'}</span>
                  <input type="file" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const formData = new FormData()
                    formData.append('file', file)
                    const phase = wo.requesterUserId === userId ? 'request' : 'completion'
                    formData.append('phase', phase)
                    try {
                      await fetch(`${API_BASE}/work-orders/${wo.id}/attachments`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${tokenStore.get()}` },
                        body: formData,
                        credentials: 'include',
                      })
                      onRefetch()
                    } catch {}
                    e.target.value = ''
                  }} />
                </label>
              )}
              {(!wo.attachments || wo.attachments.length === 0) ? (
                <p className="text-sm text-slate-400 italic">{tr ? 'Ek dosya yok' : 'No attachments'}</p>
              ) : (
                wo.attachments.map(att => (
                  <div key={att.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50">
                    <Paperclip size={14} className="text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-700 truncate">{att.fileName}</p>
                      <p className="text-[10px] text-slate-400">
                        {att.phase === 'request' ? (tr ? 'Talep' : 'Request') : (tr ? 'Tamamlama' : 'Completion')} - {(att.fileSize / 1024).toFixed(1)} KB - {formatDate(att.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'materials' && (
            <div className="space-y-2">
              {(!wo.materials || wo.materials.length === 0) ? (
                <p className="text-sm text-slate-400 italic">{tr ? 'Malzeme yok' : 'No materials'}</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b">
                      <th className="pb-2">{tr ? 'Malzeme' : 'Material'}</th>
                      <th className="pb-2">{tr ? 'Miktar' : 'Qty'}</th>
                      <th className="pb-2">{tr ? 'Birim' : 'Unit'}</th>
                      <th className="pb-2">{tr ? 'Birim Maliyet' : 'Unit Cost'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wo.materials.map(m => (
                      <tr key={m.id} className="border-b border-slate-50">
                        <td className="py-1.5 text-slate-700">{m.name}</td>
                        <td className="py-1.5 text-slate-600">{m.quantity}</td>
                        <td className="py-1.5 text-slate-600">{m.unit}</td>
                        <td className="py-1.5 text-slate-600">{m.unitCost ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              {(!wo.history || wo.history.length === 0) ? (
                <p className="text-sm text-slate-400 italic">{tr ? 'Gecmis kaydi yok' : 'No history'}</p>
              ) : (
                <div className="relative pl-5">
                  <div className="absolute left-2 top-2 bottom-2 w-px bg-slate-200" />
                  {wo.history.map(h => (
                    <div key={h.id} className="relative mb-4 last:mb-0">
                      <div className="absolute -left-3 top-1.5 w-2.5 h-2.5 rounded-full bg-blue-400 border-2 border-white" />
                      <div className="ml-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-700">{h.user?.name || '-'}</span>
                          <span className="text-[10px] text-slate-400">{formatDate(h.createdAt)}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">{h.action}</p>
                        {h.fromStatus && h.toStatus && (
                          <div className="flex items-center gap-1.5 mt-1">
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
    </DraggableModal>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Main Page ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export default function WorkOrders() {
  const { user } = useAuth()
  const { lang } = useLanguage()
  const tr = lang === 'tr'

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<WorkOrder | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  // Filters
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [search, setSearch] = useState('')

  // Departments
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    api.get<any>('/departments?forWorkOrder=true').then(r => {
      setDepartments((r?.data ?? r ?? []).map((d: any) => ({ id: d.id, name: d.name })))
    }).catch(() => {})
  }, [])

  const fetchWorkOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter.toUpperCase())
      if (priorityFilter) params.set('priority', priorityFilter.toUpperCase())
      if (search) params.set('search', search)
      const qs = params.toString()
      const res = await api.get<any>('/work-orders' + (qs ? `?${qs}` : ''))
      const items = (res?.data ?? res ?? []).map(mapWorkOrder)
      setWorkOrders(items)
    } catch {}
    setLoading(false)
  }, [statusFilter, priorityFilter, search])

  useEffect(() => { fetchWorkOrders() }, [fetchWorkOrders])

  // When selecting a row, fetch latest detail
  const handleSelect = async (wo: WorkOrder) => {
    try {
      const detail = await api.get<any>(`/work-orders/${wo.id}`)
      setSelected(mapWorkOrder(detail))
    } catch {
      setSelected(wo)
    }
  }

  const handleRefetch = () => {
    fetchWorkOrders()
    if (selected) {
      api.get<any>(`/work-orders/${selected.id}`).then(d => setSelected(mapWorkOrder(d))).catch(() => {})
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">
          {tr ? 'Is Siparisleri' : 'Work Orders'}
        </h1>
        {user && canCreate(user.role) && (
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2.5 text-sm font-medium text-white rounded-xl bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 flex items-center gap-2 shadow-sm transition-all"
          >
            <Plus size={16} /> {tr ? 'Yeni Is Siparisi' : 'New Work Order'}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={tr ? 'Ara...' : 'Search...'}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        {/* Status filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm pr-8 appearance-none bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">{tr ? 'Tum Durumlar' : 'All Statuses'}</option>
            {Object.entries(STATUS_LABELS).map(([key, val]) => (
              <option key={key} value={key}>{val[lang as 'tr' | 'en']}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Priority filter */}
        <div className="relative">
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm pr-8 appearance-none bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">{tr ? 'Tum Oncelikler' : 'All Priorities'}</option>
            {Object.entries(PRIORITY_LABELS).map(([key, val]) => (
              <option key={key} value={key}>{val[lang as 'tr' | 'en']}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-slate-400" />
          </div>
        ) : workOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Filter size={32} className="mb-3 opacity-50" />
            <p className="text-sm">{tr ? 'Is siparisi bulunamadi' : 'No work orders found'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="px-4 py-3 font-medium text-slate-600 text-xs uppercase tracking-wider">
                    {tr ? 'Kod' : 'Code'}
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-600 text-xs uppercase tracking-wider">
                    {tr ? 'Baslik' : 'Title'}
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-600 text-xs uppercase tracking-wider">
                    {tr ? 'Talep Eden' : 'Requester'}
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-600 text-xs uppercase tracking-wider">
                    {tr ? 'Hedef' : 'Target'}
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-600 text-xs uppercase tracking-wider">
                    {tr ? 'Oncelik' : 'Priority'}
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-600 text-xs uppercase tracking-wider">
                    {tr ? 'Durum' : 'Status'}
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-600 text-xs uppercase tracking-wider">
                    {tr ? 'Son Tarih' : 'Due Date'}
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-600 text-xs uppercase tracking-wider">
                    {tr ? 'Tarih' : 'Date'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workOrders.map(wo => (
                  <tr
                    key={wo.id}
                    onClick={() => handleSelect(wo)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {wo.code}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <span className="text-slate-800 font-medium truncate block">{wo.title}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {wo.requesterDept?.name || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {wo.targetDept?.name || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', PRIORITY_COLORS[wo.priority])}>
                        {PRIORITY_LABELS[wo.priority]?.[lang as 'tr' | 'en'] || wo.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[wo.status])}>
                        {STATUS_LABELS[wo.status]?.[lang as 'tr' | 'en'] || wo.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx(
                        'text-xs',
                        wo.dueDate && isOverdue(wo.dueDate) && wo.status !== 'kapandi'
                          ? 'text-red-600 font-medium'
                          : 'text-slate-600'
                      )}>
                        {formatDate(wo.dueDate)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatDate(wo.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <CreateWorkOrderModal
          departments={departments}
          userDeptId={user?.departmentId || ''}
          lang={lang}
          onClose={() => setShowCreate(false)}
          onCreated={fetchWorkOrders}
        />
      )}

      {/* Detail Modal */}
      {selected && user && (
        <WorkOrderDetailModal
          workOrder={selected}
          lang={lang}
          userId={user.id}
          userRole={user.role}
          userDeptId={user.departmentId}
          onClose={() => setSelected(null)}
          onRefetch={handleRefetch}
        />
      )}
    </div>
  )
}
