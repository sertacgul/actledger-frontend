import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Smartphone, CheckSquare, MessageSquare, FileStack,
  Send, RefreshCw, WifiOff, Users, Plus, ChevronRight, X, Check, CheckCheck,
  BookUser, Search, Loader2, ArrowLeft, Reply,
} from 'lucide-react'
import clsx from 'clsx'
import { useTasks, useDepartments, useUsers, createTask } from '../lib/hooks'
import type { Task, Department, User } from '../types'
import { TASK_STATUS_LABELS } from '../types'
import DraggableModal from '../components/ui/DraggableModal'
import { useToolbarActions } from '../lib/useToolbarActions'
import { api } from '../lib/api'

/* ── Mock form templates (no backend endpoint yet) ── */
const FORM_TEMPLATES = [
  { id: 'f1', name: 'Günlük Üretim Formu',          fields: 8,  uses: 42, dept: 'Üretim',             required: true  },
  { id: 'f2', name: 'Makine Bakım Kontrol Formu',    fields: 12, uses: 18, dept: 'Bakım & Onarım',     required: true  },
  { id: 'f3', name: 'Kalite Kontrol Muayene Formu',  fields: 15, uses: 31, dept: 'Kalite Kontrol',     required: false },
  { id: 'f4', name: 'Depo Sayım Formu',              fields: 6,  uses: 9,  dept: 'Lojistik',           required: false },
  { id: 'f5', name: 'Olay / Kaza Bildirim Formu',    fields: 20, uses: 3,  dept: 'Tüm Departmanlar',  required: true  },
]

/* ── Message & contact types ── */
interface SentMessage {
  id: string
  senderId: string
  senderName: string
  receiverId?: string
  content: string
  isBroadcast: boolean
  receiverName?: string
  departmentName?: string
  createdAt: string
  readAt?: string | null
}

interface MsgContact {
  id: string
  name: string
  jobTitle: string
  isMobile: boolean
  department: string
}

interface ThreadMessage {
  id: string
  senderId: string
  senderName: string
  content: string
  createdAt: string
  readAt?: string | null
  replyToId?: string | null
}

type Tab = 'tasks' | 'forms' | 'messages' | 'devices'

function SyncBadge({ lastSync, isOnline }: { lastSync: string; isOnline: boolean }) {
  const diff = Math.floor((Date.now() - new Date(lastSync).getTime()) / 60000)
  const label = diff < 1 ? 'Az önce' : diff < 60 ? `${diff}dk önce` : `${Math.floor(diff / 60)}sa önce`
  return (
    <div className={clsx(
      'flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full',
      isOnline ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
               : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
    )}>
      {isOnline
        ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />{label}</>
        : <><WifiOff size={9} />{label}</>
      }
    </div>
  )
}

/* ── TAB: Task Broadcast ── */
function TaskBroadcast({ tasks, departments, users, onRefetch }: { tasks: Task[]; departments: Department[]; users: User[]; onRefetch: () => void }) {
  const activeTasks = tasks.filter(t => ['devam_ediyor', 'beklemede', 'gecikti'].includes(t.status))
  const [showBroadcast, setShowBroadcast] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-zinc-500">
          {activeTasks.length} görev mobil cihazlara yayınlanıyor
        </p>
        <button
          type="button"
          className="btn-primary btn-sm"
          onClick={() => setShowBroadcast(true)}
          data-help="Yeni görev oluşturup mobil saha personeline yayınla"
        >
          <Plus size={13} /> Görev Yayınla
        </button>
      </div>

      {showBroadcast && (
        <BroadcastTaskModal
          departments={departments}
          users={users}
          onClose={() => setShowBroadcast(false)}
          onCreated={() => { setShowBroadcast(false); onRefetch() }}
        />
      )}

      <div className="surface divide-y divide-zinc-100">
        {activeTasks.map(task => {
          const dept = departments.find(d => d.id === task.departmentId)
          const done = task.checklist.filter(c => c.completed).length
          const total = task.checklist.length

          return (
            <div key={task.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-zinc-50/60 transition-colors">
              <div className={clsx(
                'w-1.5 h-10 rounded-full flex-shrink-0',
                task.status === 'gecikti'      ? 'bg-red-500'  :
                task.status === 'devam_ediyor' ? 'bg-blue-500' : 'bg-zinc-300'
              )} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-zinc-900 truncate">{task.title}</p>
                <div className="flex items-center gap-3 mt-0.5 text-[11px] text-zinc-400">
                  {dept && <span>{dept.name}</span>}
                </div>
              </div>
              {total > 0 && (
                <div className="text-right flex-shrink-0">
                  <p className="text-[12px] font-semibold text-zinc-700">{done}/{total}</p>
                  <p className="text-[10px] text-zinc-400">kontrol</p>
                </div>
              )}
              <div className="flex-shrink-0">
                <span className="badge-neutral text-[10px]">{TASK_STATUS_LABELS[task.status]}</span>
              </div>
              <ChevronRight size={14} className="text-zinc-300 flex-shrink-0" />
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Broadcast task modal ── */
function BroadcastTaskModal({
  departments, users, onClose, onCreated,
}: {
  departments: Department[]
  users:       User[]
  onClose:     () => void
  onCreated:   () => void
}) {
  const [title,        setTitle]        = useState('')
  const [description,  setDescription]  = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [assigneeId,   setAssigneeId]   = useState('')
  const [priority,     setPriority]     = useState('normal')
  const [type,         setType]         = useState('standart')
  const [dueDate,      setDueDate]      = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10)
  })
  const [saving,       setSaving]       = useState(false)
  const [err,          setErr]          = useState<string | null>(null)

  // Filter users to those who belong to the selected department (for sane assignee list)
  const deptUsers = departmentId
    ? users.filter(u => u.departmentId === departmentId && u.active)
    : users.filter(u => u.active)

  const canSave = title.trim().length > 0 && departmentId && assigneeId

  const handleSave = async () => {
    setSaving(true); setErr(null)
    try {
      await createTask({
        title:       title.trim(),
        description: description.trim(),
        departmentId,
        assigneeId,
        priority,
        type,
        dueDate:     new Date(dueDate + 'T17:00:00').toISOString(),
      })
      onCreated()
    } catch (e: any) {
      setErr(e.message ?? 'Yayınlama başarısız')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DraggableModal title="Mobil Saha Yayını" icon={<Send size={13} />} onClose={onClose} width={500}>
      <div className="p-5 space-y-3">
        <div>
          <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Görev Başlığı *</label>
          <input className="input" placeholder="ör. Hat 3 günlük bakım kontrolü" value={title}
            onChange={e => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Açıklama</label>
          <textarea className="input resize-none" rows={3} placeholder="Saha personelinin bilmesi gerekenler..."
            value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Departman *</label>
            <select className="select" value={departmentId} onChange={e => { setDepartmentId(e.target.value); setAssigneeId('') }}>
              <option value="">Seçin</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Atanan Kişi *</label>
            <select className="select" value={assigneeId} onChange={e => setAssigneeId(e.target.value)} disabled={!departmentId}>
              <option value="">Seçin</option>
              {deptUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Öncelik</label>
            <select className="select" value={priority} onChange={e => setPriority(e.target.value)}>
              <option value="dusuk">Düşük</option>
              <option value="normal">Normal</option>
              <option value="yuksek">Yüksek</option>
              <option value="kritik">Kritik</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Tip</label>
            <select className="select" value={type} onChange={e => setType(e.target.value)}>
              <option value="standart">Standart</option>
              <option value="ozel">Özel</option>
              <option value="acil">Acil</option>
              <option value="periyodik">Periyodik</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Bitiş Tarihi</label>
            <input type="date" className="input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
        </div>
        {err && (
          <div className="px-3 py-2 rounded border border-red-200 bg-red-50 text-[11px] text-red-700">{err}</div>
        )}
        <div className="flex gap-2 pt-2 border-t border-zinc-100">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center text-[12px]">İptal</button>
          <button type="button" disabled={!canSave || saving} onClick={handleSave}
            className="btn-primary flex-1 justify-center text-[12px]">
            <Send size={12} /> {saving ? 'Yayınlanıyor...' : 'Mobil Cihazlara Yayınla'}
          </button>
        </div>
      </div>
    </DraggableModal>
  )
}

/* ── TAB: Form Templates ── */
type FormTemplate = { id: string; name: string; fields: number; uses: number; dept: string; required: boolean }
const LS_FORM_TEMPLATES = 'actledger:form_templates'

function loadFormTemplates(): FormTemplate[] {
  try {
    const raw = localStorage.getItem(LS_FORM_TEMPLATES)
    if (raw) return [...FORM_TEMPLATES, ...JSON.parse(raw)]
  } catch { /* ignore */ }
  return FORM_TEMPLATES
}

function saveFormTemplate(form: FormTemplate) {
  try {
    const raw = localStorage.getItem(LS_FORM_TEMPLATES)
    const list = raw ? JSON.parse(raw) : []
    list.push(form)
    localStorage.setItem(LS_FORM_TEMPLATES, JSON.stringify(list))
  } catch { /* ignore */ }
}

function FormTemplates({ departments }: { departments: Department[] }) {
  const [templates, setTemplates] = useState<FormTemplate[]>(() => loadFormTemplates())
  const [showCreate, setShowCreate] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-zinc-500">{templates.length} form şablonu tanımlı</p>
        <button
          type="button"
          className="btn-primary btn-sm"
          onClick={() => setShowCreate(true)}
          data-help="Yeni form şablonu oluştur"
        >
          <Plus size={13} /> Form Oluştur
        </button>
      </div>

      {showCreate && (
        <CreateFormTemplateModal
          departments={departments}
          onClose={() => setShowCreate(false)}
          onCreated={(form) => {
            saveFormTemplate(form)
            setTemplates(t => [...t, form])
            setShowCreate(false)
          }}
        />
      )}

      <div className="surface divide-y divide-zinc-100">
        {templates.map(f => (
          <div key={f.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-zinc-50/60 transition-colors cursor-pointer">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
              <FileStack size={16} className="text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-semibold text-zinc-900">{f.name}</p>
                {f.required && <span className="badge-danger text-[9px]">Zorunlu</span>}
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">{f.dept} · {f.fields} alan</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[12px] font-semibold text-zinc-700">{f.uses}</p>
              <p className="text-[10px] text-zinc-400">kullanım</p>
            </div>
            <ChevronRight size={14} className="text-zinc-300 flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Create form template modal ── */
function CreateFormTemplateModal({
  departments, onClose, onCreated,
}: {
  departments: Department[]
  onClose:     () => void
  onCreated:   (form: FormTemplate) => void
}) {
  const [name,     setName]     = useState('')
  const [dept,     setDept]     = useState('Tüm Departmanlar')
  const [fields,   setFields]   = useState(5)
  const [required, setRequired] = useState(false)

  const canSave = name.trim().length > 0

  const handleSave = () => {
    onCreated({
      id:       `f${Date.now()}`,
      name:     name.trim(),
      dept,
      fields,
      uses:     0,
      required,
    })
  }

  return (
    <DraggableModal title="Yeni Form Şablonu" icon={<FileStack size={13} />} onClose={onClose} width={460}>
      <div className="p-5 space-y-3">
        <div>
          <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Form Adı *</label>
          <input className="input" placeholder="ör. Günlük Vardiya Devir Formu" value={name}
            onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Departman</label>
          <select className="select" value={dept} onChange={e => setDept(e.target.value)}>
            <option value="Tüm Departmanlar">Tüm Departmanlar</option>
            {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Alan Sayısı</label>
          <input type="number" min={1} max={50} className="input" value={fields}
            onChange={e => setFields(Number(e.target.value))} />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)}
            className="rounded border-zinc-300 text-indigo-600" />
          <span className="text-[12px] text-zinc-700">Zorunlu form (her vardiyada doldurulur)</span>
        </label>
        <div className="flex gap-2 pt-2 border-t border-zinc-100">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center text-[12px]">İptal</button>
          <button type="button" disabled={!canSave} onClick={handleSave}
            className="btn-primary flex-1 justify-center text-[12px]">
            <Check size={12} /> Oluştur
          </button>
        </div>
      </div>
    </DraggableModal>
  )
}

/* ── Success Toast ── */
function SuccessToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-200/50 animate-fade-up">
      <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
        <Check size={14} className="text-white" />
      </div>
      <span className="text-[13px] font-medium">{message}</span>
    </div>
  )
}

/* ── Contact Picker Popover ── */
function ContactPicker({
  contacts,
  loading,
  search,
  onSearch,
  onSelect,
  onBroadcast,
  onClose,
}: {
  contacts: MsgContact[]
  loading: boolean
  search: string
  onSearch: (v: string) => void
  onSelect: (c: MsgContact) => void
  onBroadcast: () => void
  onClose: () => void
}) {
  const q = search.toLowerCase()
  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.jobTitle.toLowerCase().includes(q) ||
    c.department.toLowerCase().includes(q)
  )

  return (
    <div className="surface border border-zinc-200 rounded-xl shadow-xl absolute left-0 right-0 top-full mt-1 z-20 max-h-[340px] flex flex-col">
      {/* Search bar */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-zinc-100">
        <Search size={14} className="text-zinc-400 flex-shrink-0" />
        <input
          className="flex-1 bg-transparent text-[12px] text-zinc-800 placeholder:text-zinc-400 outline-none"
          placeholder="Kisi ara..."
          value={search}
          onChange={e => onSearch(e.target.value)}
          autoFocus
        />
        <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
          <X size={14} />
        </button>
      </div>

      {/* Broadcast option */}
      <button
        type="button"
        onClick={onBroadcast}
        className="flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50/60 transition-colors text-left border-b border-zinc-100"
      >
        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
          <Users size={13} className="text-blue-600" />
        </div>
        <div>
          <p className="text-[12px] font-semibold text-blue-700">Tum Saha Personeli</p>
          <p className="text-[10px] text-zinc-400">Genel duyuru gonder</p>
        </div>
      </button>

      {/* Contact list */}
      <div className="overflow-y-auto flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={18} className="animate-spin text-zinc-400" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-[11px] text-zinc-400 py-6">Sonuc bulunamadi</p>
        ) : (
          filtered.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c)}
              className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-zinc-50/60 transition-colors text-left"
            >
              <div className="relative flex-shrink-0">
                <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center">
                  <span className="text-white text-[9px] font-bold">
                    {c.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </span>
                </div>
                {c.isMobile && (
                  <Smartphone size={8} className="absolute -bottom-0.5 -right-0.5 text-blue-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-zinc-900 truncate">{c.name}</p>
                <p className="text-[10px] text-zinc-400 truncate">{c.jobTitle} - {c.department}</p>
              </div>
              {c.isMobile && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium border border-blue-100 flex-shrink-0">
                  Mobil
                </span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  )
}

/* ── Thread View (conversation with one person) ── */
function ThreadView({
  partnerId,
  partnerName,
  onBack,
  onSent,
}: {
  partnerId: string
  partnerName: string
  onBack: () => void
  onSent: () => void
}) {
  const [thread, setThread] = useState<ThreadMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const threadEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadThread = useCallback(() => {
    setLoading(true)
    api.get<any>(`/messages/thread/${partnerId}`)
      .then((res: any) => {
        const data = res.data ?? res
        const items = Array.isArray(data) ? data : []
        setThread(items.map((m: any) => ({
          id: m.id,
          senderId: m.senderId ?? m.sender?.id,
          senderName: m.sender?.name ?? 'Bilinmeyen',
          content: m.content,
          createdAt: m.createdAt,
          readAt: m.readAt ?? null,
          replyToId: m.replyToId ?? null,
        })))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [partnerId])

  useEffect(() => { loadThread() }, [loadThread])
  useEffect(() => { if (!loading && thread.length > 0) scrollToBottom() }, [loading, thread.length])

  const handleSendReply = async () => {
    if (!reply.trim() || sending) return
    setSending(true)
    try {
      const lastMsg = thread.length > 0 ? thread[thread.length - 1] : null
      const payload: any = {
        content: reply.trim(),
        receiverId: partnerId,
        isBroadcast: false,
      }
      if (lastMsg) payload.replyToId = lastMsg.id
      await api.post('/messages', payload)
      setReply('')
      loadThread()
      onSent()
    } catch { /* silently fail */ }
    finally { setSending(false) }
  }

  const formatThreadTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }) +
      ' ' + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="btn-default btn-sm"
        >
          <ArrowLeft size={14} /> Geri
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-[9px] font-bold">
              {partnerName.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </span>
          </div>
          <p className="text-[13px] font-semibold text-zinc-900">{partnerName}</p>
        </div>
      </div>

      {/* Thread messages */}
      <div className="surface divide-y divide-zinc-100 max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={18} className="animate-spin text-zinc-400" />
          </div>
        ) : thread.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-zinc-400">
            <MessageSquare size={28} className="mb-2 opacity-40" />
            <p className="text-[12px]">Bu kisiyle henuz mesaj yok</p>
          </div>
        ) : (
          <>
            {thread.map(m => {
              // Check if this message is from the partner (incoming) or from the current user (outgoing)
              const isPartner = m.senderId === partnerId
              return (
                <div key={m.id} className={clsx(
                  'px-4 py-3 transition-colors',
                  isPartner ? 'bg-zinc-50/40' : 'bg-white'
                )}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5">
                      {isPartner ? (
                        <Reply size={11} className="text-zinc-400" />
                      ) : (
                        <Send size={11} className="text-blue-400" />
                      )}
                      <p className="text-[11px] font-semibold text-zinc-700">
                        {m.senderName}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {!isPartner && (
                        m.readAt ? (
                          <CheckCheck size={12} className="text-blue-500" />
                        ) : (
                          <Check size={12} className="text-zinc-400" />
                        )
                      )}
                      <span className="text-[10px] text-zinc-400">{formatThreadTime(m.createdAt)}</span>
                    </div>
                  </div>
                  <p className="text-[12px] text-zinc-600 leading-snug pl-4">{m.content}</p>
                </div>
              )
            })}
            <div ref={threadEndRef} />
          </>
        )}
      </div>

      {/* Reply input */}
      <div className="surface p-3">
        <div className="flex gap-2">
          <textarea
            className="input flex-1 h-16 resize-none text-[12px]"
            placeholder="Cevap yazin..."
            value={reply}
            onChange={e => setReply(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendReply()
              }
            }}
          />
          <button
            type="button"
            className="btn-primary btn-sm self-end"
            disabled={!reply.trim() || sending}
            onClick={handleSendReply}
          >
            {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── TAB: Messaging ── */
function Messaging({ departments }: { departments: Department[] }) {
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [showToast, setShowToast] = useState(false)

  // Contact picker state
  const [contacts, setContacts] = useState<MsgContact[]>([])
  const [contactsLoading, setContactsLoading] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [contactSearch, setContactSearch] = useState('')
  const [selectedContact, setSelectedContact] = useState<MsgContact | null>(null)
  const [isBroadcast, setIsBroadcast] = useState(true)

  // Sent messages
  const [messages, setMessages] = useState<SentMessage[]>([])
  const [msgsLoading, setMsgsLoading] = useState(true)

  // Thread view state
  const [threadPartnerId, setThreadPartnerId] = useState<string | null>(null)
  const [threadPartnerName, setThreadPartnerName] = useState<string>('')

  const openThread = (partnerId: string, partnerName: string) => {
    setThreadPartnerId(partnerId)
    setThreadPartnerName(partnerName)
  }

  const closeThread = () => {
    setThreadPartnerId(null)
    setThreadPartnerName('')
  }

  const loadMessages = useCallback(() => {
    api.get<any>('/messages?pageSize=50')
      .then((res: any) => {
        const data = res.data ?? res
        const items = Array.isArray(data) ? data : []
        setMessages(items.map((m: any) => ({
          id: m.id,
          senderId: m.senderId ?? m.sender?.id,
          senderName: m.sender?.name ?? 'Bilinmeyen',
          receiverId: m.receiverId ?? m.receiver?.id ?? undefined,
          content: m.content,
          isBroadcast: m.isBroadcast,
          receiverName: m.receiver?.name ?? undefined,
          departmentName: m.department?.name ?? undefined,
          createdAt: m.createdAt,
          readAt: m.readAt ?? null,
        })))
      })
      .catch(() => {})
      .finally(() => setMsgsLoading(false))
  }, [])

  useEffect(() => { loadMessages() }, [loadMessages])

  // Preload contacts on mount (needed for thread partner resolution)
  const loadContacts = useCallback(() => {
    setContactsLoading(true)
    api.get<any>('/messages/contacts')
      .then((res: any) => {
        const data = res.data ?? res
        const items = Array.isArray(data) ? data : []
        setContacts(items.map((c: any) => ({
          id: c.id,
          name: c.name,
          jobTitle: c.jobTitle ?? '',
          isMobile: c.isMobile ?? false,
          department: c.department?.name ?? c.department ?? '',
        })))
      })
      .catch(() => {})
      .finally(() => setContactsLoading(false))
  }, [])

  useEffect(() => { loadContacts() }, [loadContacts])

  const openPicker = () => {
    setPickerOpen(true)
    setContactSearch('')
    loadContacts()
  }

  const handleSelectContact = (c: MsgContact) => {
    setSelectedContact(c)
    setIsBroadcast(false)
    setPickerOpen(false)
  }

  const handleSelectBroadcast = () => {
    setSelectedContact(null)
    setIsBroadcast(true)
    setPickerOpen(false)
  }

  const handleSend = async () => {
    if (!msg.trim() || sending) return
    setSending(true)
    try {
      const payload: any = { content: msg.trim(), isBroadcast }
      if (!isBroadcast && selectedContact) {
        payload.receiverId = selectedContact.id
      }
      await api.post('/messages', payload)
      setMsg('')
      setShowToast(true)
      loadMessages()
    } catch { /* silently fail */ }
    finally { setSending(false) }
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    if (diffMs < 86400000 && d.getDate() === now.getDate()) {
      return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    }
    if (diffMs < 172800000) return 'Dun'
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
  }

  const recipientLabel = isBroadcast
    ? 'Tum Saha Personeli'
    : selectedContact
      ? selectedContact.name
      : 'Alici secin...'

  const unreadCount = messages.filter(m => !m.readAt && !m.isBroadcast).length

  // If thread is open, show thread view instead of the message list
  if (threadPartnerId) {
    return (
      <div className="space-y-4">
        {showToast && <SuccessToast message="Mesaj Gonderildi" onDismiss={() => setShowToast(false)} />}
        <ThreadView
          partnerId={threadPartnerId}
          partnerName={threadPartnerName}
          onBack={closeThread}
          onSent={() => { setShowToast(true); loadMessages() }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {showToast && <SuccessToast message="Mesaj Gonderildi" onDismiss={() => setShowToast(false)} />}

      <div className="surface p-4">
        <p className="text-[12px] font-semibold text-zinc-700 mb-3">Yeni Mesaj / Duyuru</p>
        <div className="space-y-2.5">
          {/* Contact Picker Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={openPicker}
              className={clsx(
                'w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-[12px] transition-colors',
                'border-zinc-200 hover:border-zinc-300 bg-white',
              )}
            >
              <BookUser size={14} className="text-zinc-400 flex-shrink-0" />
              <span className={clsx(
                'flex-1 truncate',
                (isBroadcast || selectedContact) ? 'text-zinc-800 font-medium' : 'text-zinc-400'
              )}>
                {recipientLabel}
              </span>
              {isBroadcast && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium border border-blue-100">
                  Duyuru
                </span>
              )}
              {!isBroadcast && selectedContact?.isMobile && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium border border-blue-100">
                  Mobil
                </span>
              )}
            </button>

            {pickerOpen && (
              <ContactPicker
                contacts={contacts}
                loading={contactsLoading}
                search={contactSearch}
                onSearch={setContactSearch}
                onSelect={handleSelectContact}
                onBroadcast={handleSelectBroadcast}
                onClose={() => setPickerOpen(false)}
              />
            )}
          </div>

          <textarea
            className="input h-20 resize-none"
            placeholder="Mesajinizi yazin..."
            value={msg}
            onChange={e => setMsg(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-primary btn-sm"
              disabled={!msg.trim() || sending}
              onClick={handleSend}
            >
              {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              {sending ? 'Gonderiyor...' : 'Gonder'}
            </button>
          </div>
        </div>
      </div>

      {/* Sent messages list */}
      <div className="surface divide-y divide-zinc-100">
        {msgsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={18} className="animate-spin text-zinc-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-zinc-400">
            <MessageSquare size={28} className="mb-2 opacity-40" />
            <p className="text-[12px]">Henuz mesaj yok</p>
          </div>
        ) : (
          messages.map(m => {
            const canOpenThread = !m.isBroadcast
            const handleRowClick = () => {
              if (!canOpenThread) return
              // Use receiverId/receiverName if available (outgoing message)
              // Otherwise fall back to senderId/senderName (incoming message)
              if (m.receiverId && m.receiverName) {
                openThread(m.receiverId, m.receiverName)
              } else if (m.receiverName) {
                // receiverId missing - try to find from contacts
                const contact = contacts.find(c => c.name === m.receiverName)
                if (contact) openThread(contact.id, contact.name)
              } else if (m.senderId) {
                openThread(m.senderId, m.senderName)
              }
            }
            return (
              <div
                key={m.id}
                className={clsx(
                  'px-4 py-3.5 hover:bg-zinc-50/60 transition-colors cursor-pointer',
                  !m.readAt && !m.isBroadcast && 'bg-blue-50/30'
                )}
                onClick={handleRowClick}
              >
                <div className="flex items-start gap-3">
                  <div className={clsx(
                    'w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0',
                    m.readAt || m.isBroadcast ? 'bg-zinc-300' : 'bg-blue-500'
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="text-[12px] font-semibold text-zinc-900">
                        {m.senderName}{' '}
                        <span className="text-zinc-400 font-normal">
                          → {m.isBroadcast ? 'Tum Personel' : m.receiverName ?? m.departmentName ?? 'DM'}
                        </span>
                      </p>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Read receipt icons */}
                        {m.readAt ? (
                          <CheckCheck size={13} className="text-blue-500" />
                        ) : (
                          <Check size={13} className="text-zinc-400" />
                        )}
                        <span className="text-[10px] text-zinc-400">{formatTime(m.createdAt)}</span>
                      </div>
                    </div>
                    <p className="text-[12px] text-zinc-600 leading-snug truncate">{m.content}</p>
                  </div>
                  {canOpenThread && (
                    <Reply size={13} className="text-zinc-300 flex-shrink-0 mt-1" />
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

/* ── TAB: Devices ── */
function Devices({ users, departments }: { users: User[]; departments: Department[] }) {
  // Simulate sync metadata (no real device status endpoint yet)
  const mobileUsers = users
    .filter(u => ['supervizor', 'muhendis', 'teknisyen', 'isci'].includes(u.role))
    .map((u, i) => ({
      ...u,
      lastSync:     i === 0 ? new Date().toISOString()
                  : i === 1 ? new Date(Date.now() - 12 * 60000).toISOString()
                  :           new Date(Date.now() - 180 * 60000).toISOString(),
      pendingTasks: i % 3,
      appVersion:   i < 2 ? '1.2.0' : '1.1.4',
      isOnline:     i < 2,
    }))

  const onlineCount  = mobileUsers.filter(u => u.isOnline).length
  const offlineCount = mobileUsers.filter(u => !u.isOnline).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-zinc-500">
          {onlineCount} aktif · {offlineCount} çevrimdışı
        </p>
        <button type="button" className="btn-default btn-sm">
          <RefreshCw size={13} /> Tümünü Senkronize Et
        </button>
      </div>

      <div className="surface divide-y divide-zinc-100">
        {mobileUsers.map(u => {
          const dept = departments.find(d => d.id === u.departmentId)
          return (
            <div key={u.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-zinc-50/60 transition-colors">
              <div className="relative flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold">
                    {u.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                  </span>
                </div>
                <div className={clsx(
                  'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white',
                  u.isOnline ? 'bg-emerald-500' : 'bg-zinc-400'
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-zinc-900">{u.name}</p>
                <p className="text-[11px] text-zinc-400 truncate">{dept?.name}</p>
              </div>
              <div className="text-right flex-shrink-0 space-y-1">
                <SyncBadge lastSync={u.lastSync} isOnline={u.isOnline} />
                <p className="text-[9px] text-zinc-400">v{u.appVersion}</p>
              </div>
              {u.pendingTasks > 0 && (
                <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-[9px] font-bold">{u.pendingTasks}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Main Page ── */
export default function MobileHub() {
  const [activeTab, setActiveTab] = useState<Tab>('tasks')
  const [unreadMsgCount, setUnreadMsgCount] = useState(0)

  const { tasks,       loading: tasksLoading, refetch: refetchTasks } = useTasks()
  const { departments, loading: deptsLoading } = useDepartments()
  const { users,       loading: usersLoading } = useUsers()

  // Fetch unread message count for status bar & tab badge
  useEffect(() => {
    api.get<any>('/messages?pageSize=50')
      .then((res: any) => {
        const data = res.data ?? res
        const items = Array.isArray(data) ? data : []
        setUnreadMsgCount(items.filter((m: any) => !m.readAt && !m.isBroadcast).length)
      })
      .catch(() => {})
  }, [])

  // Toolbar refresh - reloads tasks (Mobile tasks tab) on demand
  useToolbarActions({
    onRefresh: () => refetchTasks(),
  })

  const activeTasks  = tasks.filter(t => t.status !== 'tamamlandi' && t.status !== 'iptal')
  const mobileUsersCount = users.filter(u =>
    ['supervizor', 'muhendis', 'teknisyen', 'isci'].includes(u.role)
  ).length

  const TABS: { key: Tab; icon: typeof CheckSquare; label: string; count?: number }[] = [
    { key: 'tasks',    icon: CheckSquare,   label: 'Görev Yayını',    count: activeTasks.length     },
    { key: 'forms',    icon: FileStack,     label: 'Form Şablonları', count: FORM_TEMPLATES.length  },
    { key: 'messages', icon: MessageSquare, label: 'Mesajlaşma',      count: unreadMsgCount         },
    { key: 'devices',  icon: Smartphone,    label: 'Cihazlar',        count: mobileUsersCount       },
  ]

  return (
    <div className="space-y-5">
      {/* Status bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Mobil Kullanıcı',        value: mobileUsersCount,      icon: Users,      color: 'text-blue-600',  bg: 'bg-blue-50'  },
          { label: 'Aktif Görev',            value: activeTasks.length,    icon: CheckSquare,color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Okunmamis Mesaj',        value: unreadMsgCount, icon: MessageSquare, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Aktif Form Şablonu',     value: FORM_TEMPLATES.length, icon: FileStack,  color: 'text-purple-600',  bg: 'bg-purple-50'  },
        ].map(item => (
          <div key={item.label} className="surface p-4">
            <div className="flex items-center gap-3">
              <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center', item.bg)}>
                <item.icon size={17} className={item.color} />
              </div>
              <div>
                <p className="text-[20px] font-bold text-zinc-900 leading-none">{item.value}</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">{item.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 surface w-fit rounded-xl">
        {TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium transition-all',
              activeTab === tab.key
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'
            )}
          >
            <tab.icon size={14} />
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={clsx(
                'text-[10px] px-1.5 py-0.5 rounded-full font-semibold',
                activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-600'
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="animate-fade-up">
        {activeTab === 'tasks' && (
          tasksLoading || deptsLoading || usersLoading
            ? <div className="surface h-40 animate-pulse" />
            : <TaskBroadcast tasks={tasks} departments={departments} users={users} onRefetch={refetchTasks} />
        )}
        {activeTab === 'forms'    && <FormTemplates departments={departments} />}
        {activeTab === 'messages' && <Messaging departments={departments} />}
        {activeTab === 'devices'  && (
          usersLoading || deptsLoading
            ? <div className="surface h-40 animate-pulse" />
            : <Devices users={users} departments={departments} />
        )}
      </div>
    </div>
  )
}
