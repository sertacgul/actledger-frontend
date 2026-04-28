import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Smartphone, CheckSquare, MessageSquare, FileStack,
  Send, RefreshCw, WifiOff, Users, Plus, ChevronRight, X, Check, CheckCheck,
  BookUser, Search, Loader2, ArrowLeft, Reply, Calendar, Flag, Tag, ClipboardList,
  ListChecks, HelpCircle, ClipboardCheck, Hash, CircleDot, Layers, Sparkles, Copy,
} from 'lucide-react'
import clsx from 'clsx'
import { useTasks, useDepartments, useUsers, createTask } from '../lib/hooks'
import type { Task, Department, User } from '../types'
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, TASK_TYPE_LABELS } from '../types'
import DraggableModal from '../components/ui/DraggableModal'
import { useToolbarActions } from '../lib/useToolbarActions'
import { api } from '../lib/api'
import PlatformMessages from './PlatformMessages'

function PlatformMessagesEmbed() {
  return <div style={{ height: 'calc(100vh - 240px)' }}><PlatformMessages /></div>
}

/* ── Form types ── */
type FormType = 'checklist' | 'soru_cevap' | 'denetim' | 'sayisal' | 'coktan_secmeli' | 'serbest'
type FormTemplate = { id: string; name: string; formType: FormType; fields: number; uses: number; dept: string; required: boolean }

/* ── Mock form templates (no backend endpoint yet) ── */
const FORM_TEMPLATES: FormTemplate[] = []

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

type Tab = 'tasks' | 'forms' | 'devices' | 'platform_messages'

function SyncBadge({ lastSync, isOnline }: { lastSync: string; isOnline: boolean }) {
  const ts = lastSync ? new Date(lastSync).getTime() : 0
  const valid = ts > 0 && !isNaN(ts)
  const diff = valid ? Math.floor((Date.now() - ts) / 60000) : -1
  const label = !valid ? 'Henuz baglanti yok'
    : diff < 1 ? 'Az once'
    : diff < 60 ? `${diff}dk once`
    : diff < 1440 ? `${Math.floor(diff / 60)}sa once`
    : new Date(lastSync).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
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
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

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

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          departments={departments}
          users={users}
          onClose={() => setSelectedTask(null)}
        />
      )}

      <div className="surface divide-y divide-zinc-100">
        {activeTasks.map(task => {
          const dept = departments.find(d => d.id === task.departmentId)
          const done = task.checklist.filter(c => c.completed).length
          const total = task.checklist.length

          return (
            <div
              key={task.id}
              className="flex items-center gap-4 px-4 py-3.5 hover:bg-zinc-50/60 transition-colors cursor-pointer"
              onClick={() => setSelectedTask(task)}
            >
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

/* ── Task Detail Modal ── */
function TaskDetailModal({
  task, departments, users, onClose,
}: {
  task:        Task
  departments: Department[]
  users:       User[]
  onClose:     () => void
}) {
  const dept     = departments.find(d => d.id === task.departmentId)
  const assignee = users.find(u => u.id === task.assigneeId)
  const done     = task.checklist.filter(c => c.completed).length
  const total    = task.checklist.length
  const dueDate  = new Date(task.dueDate).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })

  const priorityColors: Record<string, string> = {
    dusuk:  'bg-zinc-100 text-zinc-600',
    normal: 'bg-blue-50 text-blue-700',
    yuksek: 'bg-amber-50 text-amber-700',
    kritik: 'bg-red-50 text-red-700',
  }

  const statusColors: Record<string, string> = {
    beklemede:    'bg-zinc-100 text-zinc-600',
    devam_ediyor: 'bg-blue-50 text-blue-700',
    gecikti:      'bg-red-50 text-red-700',
    tamamlandi:   'bg-emerald-50 text-emerald-700',
    iptal:        'bg-zinc-100 text-zinc-500',
  }

  return (
    <DraggableModal title="Gorev Detayi" icon={<ClipboardList size={13} />} onClose={onClose} width={520}>
      <div className="p-5 space-y-4">
        {/* Title & Status */}
        <div>
          <h3 className="text-[15px] font-bold text-zinc-900">{task.title}</h3>
          {task.description && (
            <p className="text-[12px] text-zinc-500 mt-1 leading-relaxed">{task.description}</p>
          )}
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-full', statusColors[task.status])}>
            {TASK_STATUS_LABELS[task.status]}
          </span>
          <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-full', priorityColors[task.priority])}>
            <Flag size={9} className="inline mr-0.5" />
            {TASK_PRIORITY_LABELS[task.priority]}
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
            <Tag size={9} className="inline mr-0.5" />
            {TASK_TYPE_LABELS[task.type]}
          </span>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="surface p-3 rounded-xl">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Departman</p>
            <p className="text-[13px] font-semibold text-zinc-800 mt-1">{dept?.name ?? '-'}</p>
          </div>
          <div className="surface p-3 rounded-xl">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Atanan Kisi</p>
            <p className="text-[13px] font-semibold text-zinc-800 mt-1">{assignee?.name ?? '-'}</p>
          </div>
          <div className="surface p-3 rounded-xl">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wider flex items-center gap-1">
              <Calendar size={10} /> Bitis Tarihi
            </p>
            <p className="text-[13px] font-semibold text-zinc-800 mt-1">{dueDate}</p>
          </div>
          <div className="surface p-3 rounded-xl">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Kontrol Listesi</p>
            <p className="text-[13px] font-semibold text-zinc-800 mt-1">
              {total > 0 ? `${done}/${total} tamamlandi` : 'Kontrol yok'}
            </p>
          </div>
        </div>

        {/* Checklist items */}
        {total > 0 && (
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Kontrol Listesi</p>
            <div className="space-y-1">
              {task.checklist.map(item => (
                <div key={item.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-50/60">
                  <div className={clsx(
                    'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                    item.completed ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-300'
                  )}>
                    {item.completed && <Check size={10} className="text-white" />}
                  </div>
                  <span className={clsx(
                    'text-[12px]',
                    item.completed ? 'text-zinc-400 line-through' : 'text-zinc-700'
                  )}>
                    {item.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t border-zinc-100">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center text-[12px]">Kapat</button>
        </div>
      </div>
    </DraggableModal>
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

const FORM_TYPE_META: Record<FormType, { label: string; description: string; icon: typeof ListChecks; color: string; bg: string }> = {
  checklist:      { label: 'Kontrol Listesi',   description: 'Evet/Hayir kontrol maddeleri',       icon: ListChecks,     color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
  soru_cevap:     { label: 'Soru-Cevap',        description: 'Acik uclu veya kisa metin sorulari', icon: HelpCircle,     color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-100' },
  denetim:        { label: 'Denetim/Muayene',   description: 'Gecti/Kaldi degerlendirme maddeleri', icon: ClipboardCheck, color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-100' },
  sayisal:        { label: 'Sayisal Veri',       description: 'Olcum, sicaklik, sayac vb. degerler',icon: Hash,           color: 'text-purple-600',  bg: 'bg-purple-50 border-purple-100' },
  coktan_secmeli: { label: 'Coktan Secmeli',    description: 'Secenekler arasindan secim yapilir', icon: CircleDot,      color: 'text-pink-600',    bg: 'bg-pink-50 border-pink-100' },
  serbest:        { label: 'Serbest Form',       description: 'Karisik alan tiplerinden olusan form',icon: Layers,        color: 'text-zinc-600',    bg: 'bg-zinc-50 border-zinc-200' },
}

/* ── TAB: Form Templates ── */
const LS_FORM_TEMPLATES = 'actledger:form_templates'

/* ── Default preset templates (per form type) ── */
interface FormPreset {
  name: string
  formType: FormType
  fields: number
  dept: string
  required: boolean
  description: string
}

const FORM_PRESETS: FormPreset[] = [
  { name: 'Gunluk Vardiya Kontrol Listesi',     formType: 'checklist',      fields: 12, dept: 'Tum Departmanlar', required: true,  description: 'Vardiya basinda ve sonunda yapilacak kontrollerin listesi' },
  { name: 'Arac Hareket Oncesi Kontrol',         formType: 'checklist',      fields: 8,  dept: 'Tum Departmanlar', required: true,  description: 'Arac cikisi oncesi guvenlik ve mekanik kontroller' },
  { name: 'ISG Saha Denetim Formu',              formType: 'denetim',        fields: 20, dept: 'Tum Departmanlar', required: true,  description: 'Is guvenligi saha denetim ve degerlendirme formu' },
  { name: 'Ekipman Muayene Formu',               formType: 'denetim',        fields: 15, dept: 'Tum Departmanlar', required: false, description: 'Ekipman ve makine periyodik muayene degerlendirmesi' },
  { name: 'Musteri Memnuniyet Anketi',            formType: 'soru_cevap',     fields: 10, dept: 'Tum Departmanlar', required: false, description: 'Musteri geri bildirim ve memnuniyet sorulari' },
  { name: 'Olay/Kaza Bildirim Formu',            formType: 'soru_cevap',     fields: 18, dept: 'Tum Departmanlar', required: true,  description: 'Is kazasi veya olay sonrasi detayli bildirim' },
  { name: 'Uretim Hatti Olcum Kaydi',            formType: 'sayisal',        fields: 10, dept: 'Tum Departmanlar', required: true,  description: 'Sicaklik, basinc, hiz gibi uretim parametreleri' },
  { name: 'Enerji Tuketim Takip Formu',          formType: 'sayisal',        fields: 6,  dept: 'Tum Departmanlar', required: false, description: 'Gunluk elektrik, su, dogalgaz sayac degerleri' },
  { name: 'Kalite Seviye Degerlendirmesi',        formType: 'coktan_secmeli', fields: 12, dept: 'Tum Departmanlar', required: false, description: 'Urun kalite seviyesi ve siniflandirma formu' },
  { name: 'Personel Gorev Degerlendirmesi',       formType: 'coktan_secmeli', fields: 8,  dept: 'Tum Departmanlar', required: false, description: 'Performans ve yetkinlik degerlendirme anketi' },
  { name: 'Genel Saha Rapor Formu',              formType: 'serbest',        fields: 10, dept: 'Tum Departmanlar', required: false, description: 'Metin, sayi ve seceneklerin bir arada oldugu rapor' },
]

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

function FormTemplates({ departments, users }: { departments: Department[]; users: User[] }) {
  const [templates, setTemplates] = useState<FormTemplate[]>(() => loadFormTemplates())
  const [showCreate, setShowCreate] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-zinc-500">{templates.length} form sablonu tanimli</p>
        <button
          type="button"
          className="btn-primary btn-sm"
          onClick={() => setShowCreate(true)}
          data-help="Yeni form sablonu oluştur"
        >
          <Plus size={13} /> Form Oluştur
        </button>
      </div>

      {showCreate && (
        <CreateFormTemplateModal
          departments={departments}
          users={users}
          onClose={() => setShowCreate(false)}
          onCreated={(form) => {
            saveFormTemplate(form)
            setTemplates(t => [...t, form])
            setShowCreate(false)
          }}
        />
      )}

      <div className="surface divide-y divide-zinc-100">
        {templates.map(f => {
          const meta = FORM_TYPE_META[f.formType] ?? FORM_TYPE_META.serbest
          const TypeIcon = meta.icon
          return (
            <div key={f.id}
              onClick={() => setSelectedTemplate(f)}
              className="flex items-center gap-4 px-4 py-3.5 hover:bg-zinc-50/60 transition-colors cursor-pointer">
              <div className={clsx('w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0', meta.bg)}>
                <TypeIcon size={16} className={meta.color} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-semibold text-zinc-900">{f.name}</p>
                  {f.required && <span className="badge-danger text-[9px]">Zorunlu</span>}
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">{f.dept} - {meta.label} - {f.fields} alan</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[12px] font-semibold text-zinc-700">{f.uses}</p>
                <p className="text-[10px] text-zinc-400">kullanim</p>
              </div>
              <ChevronRight size={14} className="text-zinc-300 flex-shrink-0" />
            </div>
          )
        })}
      </div>

      {/* Template detail modal */}
      {selectedTemplate && (() => {
        const meta = FORM_TYPE_META[selectedTemplate.formType] ?? FORM_TYPE_META.serbest
        const TypeIcon = meta.icon
        return (
          <DraggableModal title={selectedTemplate.name} icon={<TypeIcon size={13} />} onClose={() => setSelectedTemplate(null)} width={480}>
            <div className="p-5 space-y-4">
              {/* Form type badge */}
              <div className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold', meta.bg, meta.color)}>
                <TypeIcon size={12} /> {meta.label}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="surface p-3 rounded-xl text-center">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Departman</p>
                  <p className="text-[13px] font-semibold text-zinc-800 mt-1">{selectedTemplate.dept}</p>
                </div>
                <div className="surface p-3 rounded-xl text-center">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Alan Sayisi</p>
                  <p className="text-[13px] font-semibold text-zinc-800 mt-1">{selectedTemplate.fields}</p>
                </div>
                <div className="surface p-3 rounded-xl text-center">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Kullanim</p>
                  <p className="text-[13px] font-semibold text-zinc-800 mt-1">{selectedTemplate.uses}</p>
                </div>
                <div className="surface p-3 rounded-xl text-center">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Durum</p>
                  <p className="text-[13px] font-semibold mt-1">
                    {selectedTemplate.required
                      ? <span className="text-red-600">Zorunlu</span>
                      : <span className="text-emerald-600">Opsiyonel</span>}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 pt-2 border-t border-zinc-100">
                <button type="button" onClick={() => {
                  if (window.confirm(`"${selectedTemplate.name}" formunu silmek istediginize emin misiniz?`)) {
                    try {
                      const raw = localStorage.getItem(LS_FORM_TEMPLATES)
                      const list: FormTemplate[] = raw ? JSON.parse(raw) : []
                      localStorage.setItem(LS_FORM_TEMPLATES, JSON.stringify(list.filter(f => f.id !== selectedTemplate.id)))
                    } catch {}
                    setTemplates(t => t.filter(f => f.id !== selectedTemplate.id))
                    setSelectedTemplate(null)
                  }
                }} className="btn-danger flex-1 justify-center text-[12px]">Sil</button>
                <button type="button" onClick={() => setSelectedTemplate(null)} className="btn-secondary flex-1 justify-center text-[12px]">Kapat</button>
              </div>
            </div>
          </DraggableModal>
        )
      })()}
    </div>
  )
}

/* ── Create form template modal (2-step: type selection + customize) ── */
function CreateFormTemplateModal({
  departments, users, onClose, onCreated,
}: {
  departments: Department[]
  users:       User[]
  onClose:     () => void
  onCreated:   (form: FormTemplate) => void
}) {
  const [step,     setStep]     = useState<'type' | 'customize'>('type')
  const [formType, setFormType] = useState<FormType | null>(null)
  const [name,     setName]     = useState('')
  const [dept,     setDept]     = useState('Tum Departmanlar')
  const [fields,   setFields]   = useState(5)
  const [required, setRequired] = useState(false)
  const [assignMode, setAssignMode] = useState<'all' | 'select'>('all')
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())

  const MOBILE_ROLES = ['isci', 'teknisyen', 'muhendis', 'supervizor']
  const mobileUsers = users.filter(u => u.active && MOBILE_ROLES.includes(u.role))
  const platformUsers = users.filter(u => u.active && !MOBILE_ROLES.includes(u.role))

  const toggleUser = (id: string) => {
    setSelectedUserIds(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }
  const selectAllMobile = () => setSelectedUserIds(prev => {
    const s = new Set(prev); mobileUsers.forEach(u => s.add(u.id)); return s
  })
  const selectAllPlatform = () => setSelectedUserIds(prev => {
    const s = new Set(prev); platformUsers.forEach(u => s.add(u.id)); return s
  })
  const selectAll = () => setSelectedUserIds(new Set(users.filter(u => u.active).map(u => u.id)))
  const clearAll = () => setSelectedUserIds(new Set())

  const canSave = name.trim().length > 0 && formType

  const handleSelectType = (type: FormType) => {
    setFormType(type)
    setStep('customize')
  }

  const handleSelectPreset = (preset: FormPreset) => {
    setFormType(preset.formType)
    setName(preset.name)
    setDept(preset.dept)
    setFields(preset.fields)
    setRequired(preset.required)
    setStep('customize')
  }

  const handleSave = () => {
    if (!formType) return
    onCreated({
      id:       `f${Date.now()}`,
      name:     name.trim(),
      formType,
      dept,
      fields,
      uses:     0,
      required,
    })
  }

  const matchingPresets = formType ? FORM_PRESETS.filter(p => p.formType === formType) : []

  return (
    <DraggableModal title="Yeni Form Sablonu" icon={<FileStack size={13} />} onClose={onClose} width={step === 'type' ? 600 : 480}>
      <div className="p-5 space-y-4">
        {step === 'type' ? (
          <>
            {/* Step 1: Choose form type */}
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-3">Form Tipi Secin</p>
              <div className="grid grid-cols-2 gap-2.5">
                {(Object.entries(FORM_TYPE_META) as [FormType, typeof FORM_TYPE_META[FormType]][]).map(([key, meta]) => {
                  const Icon = meta.icon
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSelectType(key)}
                      className={clsx(
                        'flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all',
                        'hover:shadow-md hover:border-indigo-200 hover:bg-indigo-50/30',
                        'border-zinc-200 bg-white',
                      )}
                    >
                      <div className={clsx('w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 mt-0.5', meta.bg)}>
                        <Icon size={15} className={meta.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-zinc-900">{meta.label}</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5 leading-snug">{meta.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Preset templates */}
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                <Sparkles size={10} /> Hazir Sablonlar
              </p>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                {FORM_PRESETS.map((preset, i) => {
                  const meta = FORM_TYPE_META[preset.formType]
                  const Icon = meta.icon
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-zinc-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all text-left"
                    >
                      <div className={clsx('w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0', meta.bg)}>
                        <Icon size={13} className={meta.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-zinc-800 truncate">{preset.name}</p>
                        <p className="text-[10px] text-zinc-400 truncate">{preset.dept} - {meta.label} - {preset.fields} alan</p>
                      </div>
                      <Copy size={12} className="text-zinc-300 flex-shrink-0" />
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-zinc-100">
              <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center text-[12px]">Iptal</button>
            </div>
          </>
        ) : (
          <>
            {/* Step 2: Customize form details */}
            {formType && (() => {
              const meta = FORM_TYPE_META[formType]
              const Icon = meta.icon
              return (
                <div className={clsx('flex items-center gap-2 px-3 py-2 rounded-lg border', meta.bg)}>
                  <Icon size={14} className={meta.color} />
                  <span className={clsx('text-[12px] font-semibold', meta.color)}>{meta.label}</span>
                  <button
                    type="button"
                    onClick={() => { setStep('type'); setFormType(null); setName(''); setDept('Tum Departmanlar'); setFields(5); setRequired(false) }}
                    className="ml-auto text-zinc-400 hover:text-zinc-600"
                  >
                    <X size={12} />
                  </button>
                </div>
              )
            })()}

            {/* Matching presets for selected type */}
            {matchingPresets.length > 0 && !name && (
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Sparkles size={10} /> Bu tipe uygun hazir sablonlar
                </p>
                <div className="space-y-1">
                  {matchingPresets.map((preset, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all text-left"
                    >
                      <Copy size={11} className="text-zinc-400 flex-shrink-0" />
                      <span className="text-[11px] font-medium text-zinc-700 truncate">{preset.name}</span>
                      <span className="text-[10px] text-zinc-400 ml-auto flex-shrink-0">{preset.fields} alan</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Form Adi *</label>
              <input className="input" placeholder="or. Gunluk Vardiya Devir Formu" value={name}
                onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Departman</label>
              <select className="select" value={dept} onChange={e => setDept(e.target.value)}>
                <option value="Tum Departmanlar">Tum Departmanlar</option>
                {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Alan Sayisi</label>
              <input type="number" min={1} max={50} className="input" value={fields}
                onChange={e => setFields(Number(e.target.value))} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)}
                className="rounded border-zinc-300 text-indigo-600" />
              <span className="text-[12px] text-zinc-700">Zorunlu form (her vardiyada doldurulur)</span>
            </label>

            {/* Kullanici Atama */}
            <div>
              <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Form Atama</label>
              <div className="flex gap-2 mb-2">
                <button type="button" onClick={() => setAssignMode('all')}
                  className={clsx('px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors', assignMode === 'all' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'border-zinc-200 text-zinc-500')}>
                  Herkese
                </button>
                <button type="button" onClick={() => setAssignMode('select')}
                  className={clsx('px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors', assignMode === 'select' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'border-zinc-200 text-zinc-500')}>
                  Secili Kullanicilara
                </button>
              </div>
              {assignMode === 'select' && (
                <div className="border border-zinc-200 rounded-xl overflow-hidden max-h-[200px] overflow-y-auto">
                  <div className="flex gap-1.5 p-2 border-b border-zinc-100 bg-zinc-50">
                    <button type="button" onClick={selectAll} className="text-[10px] text-indigo-600 font-semibold hover:underline">Hepsini Sec</button>
                    <span className="text-zinc-300">|</span>
                    <button type="button" onClick={clearAll} className="text-[10px] text-zinc-500 font-semibold hover:underline">Temizle</button>
                  </div>
                  {mobileUsers.length > 0 && (
                    <>
                      <div className="flex items-center justify-between px-3 py-1.5 bg-cyan-50 border-b border-zinc-100">
                        <span className="text-[10px] font-bold text-cyan-700">Mobil Kullanicilar ({mobileUsers.length})</span>
                        <button type="button" onClick={selectAllMobile} className="text-[9px] text-cyan-600 font-semibold hover:underline">Tumunu Sec</button>
                      </div>
                      {mobileUsers.map(u => (
                        <label key={u.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-50 cursor-pointer">
                          <input type="checkbox" checked={selectedUserIds.has(u.id)} onChange={() => toggleUser(u.id)} className="rounded border-zinc-300 text-cyan-600" />
                          <span className="text-[11px] text-zinc-700 truncate">{u.name}</span>
                          <span className="text-[9px] text-zinc-400 ml-auto">{u.role}</span>
                        </label>
                      ))}
                    </>
                  )}
                  {platformUsers.length > 0 && (
                    <>
                      <div className="flex items-center justify-between px-3 py-1.5 bg-indigo-50 border-b border-zinc-100">
                        <span className="text-[10px] font-bold text-indigo-700">Platform Kullanicilari ({platformUsers.length})</span>
                        <button type="button" onClick={selectAllPlatform} className="text-[9px] text-indigo-600 font-semibold hover:underline">Tumunu Sec</button>
                      </div>
                      {platformUsers.map(u => (
                        <label key={u.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-50 cursor-pointer">
                          <input type="checkbox" checked={selectedUserIds.has(u.id)} onChange={() => toggleUser(u.id)} className="rounded border-zinc-300 text-indigo-600" />
                          <span className="text-[11px] text-zinc-700 truncate">{u.name}</span>
                          <span className="text-[9px] text-zinc-400 ml-auto">{u.role}</span>
                        </label>
                      ))}
                    </>
                  )}
                </div>
              )}
              {assignMode === 'select' && selectedUserIds.size > 0 && (
                <p className="text-[10px] text-zinc-500 mt-1">{selectedUserIds.size} kullanici secildi</p>
              )}
            </div>

            <div className="flex gap-2 pt-2 border-t border-zinc-100">
              <button type="button" onClick={() => { setStep('type'); setFormType(null); setName(''); setDept('Tum Departmanlar'); setFields(5); setRequired(false) }}
                className="btn-secondary flex-1 justify-center text-[12px]">
                <ArrowLeft size={12} /> Geri
              </button>
              <button type="button" disabled={!canSave} onClick={handleSave}
                className="btn-primary flex-1 justify-center text-[12px]">
                <Check size={12} /> Oluştur
              </button>
            </div>
          </>
        )}
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
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const token = localStorage.getItem('actledger_token')
    if (!token) return
    let sock: any
    import('socket.io-client').then(({ io }) => {
      const apiBase = import.meta.env.VITE_API_BASE ?? 'http://localhost:3001/api/v1'
      const serverBase = apiBase.replace(/\/api\/v1$/, '')
      sock = io(serverBase, { auth: { token }, transports: ['websocket', 'polling'], reconnection: true })
      sock.on('user:online', (data: { userId: string }) => {
        setOnlineIds(prev => new Set(prev).add(data.userId))
      })
      sock.on('user:offline', (data: { userId: string }) => {
        setOnlineIds(prev => { const s = new Set(prev); s.delete(data.userId); return s })
      })
    })
    return () => { if (sock) sock.disconnect() }
  }, [])

  const allUsers = users
    .filter(u => u.active)
    .map(u => ({
      ...u,
      lastSync: u.lastSyncAt || '',
      appVersion: u.mobileAppVersion || '',
      isOnline: onlineIds.has(u.id) || u.isOnline === true,
    }))

  const onlineCount  = allUsers.filter(u => u.isOnline).length
  const offlineCount = allUsers.filter(u => !u.isOnline).length

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
        {allUsers.map(u => {
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
                <div className="flex items-center gap-1.5">
                  <p className="text-[13px] font-semibold text-zinc-900">{u.name}</p>
                  {u.isMobileUser && (
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-700 border border-cyan-200 uppercase tracking-wider">Mobil</span>
                  )}
                </div>
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
  const { users,       loading: usersLoading } = useUsers({ includeMobile: true })

  // Fetch unread message count for status bar & tab badge
  useEffect(() => {
    api.get<any>('/messages/unread-count')
      .then((res: any) => {
        const data = res.data ?? res
        setUnreadMsgCount(data?.total ?? data?.direct ?? 0)
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
    { key: 'platform_messages', icon: MessageSquare, label: 'Mesajlar', count: unreadMsgCount },
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
                ? tab.key === 'platform_messages' ? 'bg-amber-700 text-white' : 'bg-zinc-900 text-white'
                : tab.key === 'platform_messages' ? 'text-amber-700 hover:text-amber-800 hover:bg-amber-50' : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'
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
        {activeTab === 'forms'    && <FormTemplates departments={departments} users={users} />}
        {activeTab === 'platform_messages' && <PlatformMessagesEmbed />}
        {activeTab === 'devices'  && (
          usersLoading || deptsLoading
            ? <div className="surface h-40 animate-pulse" />
            : <Devices users={users} departments={departments} />
        )}
      </div>
    </div>
  )
}
