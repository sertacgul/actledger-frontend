import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Search, CheckSquare, Calendar, Tag, AlertCircle, Layers, Sparkles, FileSpreadsheet, Camera, MessageSquare, Zap, Loader2, X, Cpu } from 'lucide-react'
import { api, API_BASE } from '../lib/api'
import clsx from 'clsx'
import { useTasks, useDepartments, useUsers, createTask, updateTaskStatus, updateChecklistItem } from '../lib/hooks'
import type { Task, TaskStatus, TaskPriority, CustomAttribute } from '../types'
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, TASK_TYPE_LABELS } from '../types'
import DraggableModal from '../components/ui/DraggableModal'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import TaskGroupsManager from '../components/tasks/TaskGroupsManager'
import AttributesManager from '../components/tasks/AttributesManager'
import { listAttributes, evaluateAttribute } from '../lib/attributesStore'
import { useShortcut } from '../context/ShortcutsContext'
import { exportToExcel } from '../lib/excelExport'
import { useToolbarActions } from '../lib/useToolbarActions'

const STATUS_STYLES: Record<TaskStatus, string> = {
  beklemede:    'badge-neutral',
  devam_ediyor: 'badge-info',
  tamamlandi:   'badge-success',
  gecikti:      'badge-danger',
  iptal:        'badge-neutral',
}

const PRIORITY_DOT: Record<TaskPriority, string> = {
  dusuk:  'bg-slate-400',
  normal: 'bg-blue-500',
  yuksek: 'bg-amber-500',
  kritik: 'bg-red-500',
}

// ── Task Card ──────────────────────────────────────────────────────────────────
function TaskCard({
  task, deptName, assigneeName, attributes, onSelect,
}: {
  task: Task; deptName?: string; assigneeName?: string
  attributes: CustomAttribute[]
  onSelect: (t: Task) => void
}) {
  const done     = task.checklist.filter(c => c.completed).length
  const total    = task.checklist.length
  const progress = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div
      onClick={() => onSelect(task)}
      className="card p-4 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className={clsx('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', PRIORITY_DOT[task.priority])} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 leading-snug">{task.title}</p>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{task.description}</p>
          </div>
        </div>
        <span className={STATUS_STYLES[task.status]}>{TASK_STATUS_LABELS[task.status]}</span>
      </div>

      {total > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-400">İlerleme</span>
            <span className="text-[10px] font-semibold text-slate-600">{done}/{total}</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={clsx('h-full rounded-full transition-all',
                progress === 100 ? 'bg-green-500' : progress > 50 ? 'bg-blue-500' : 'bg-amber-500'
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {deptName && (
            <span className="text-[10px] text-slate-500">{deptName}</span>
          )}
          {assigneeName && (
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                <span className="text-white text-[8px] font-semibold">{assigneeName[0]}</span>
              </div>
              <span className="text-[10px] text-slate-500">{assigneeName.split(' ')[0]}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-slate-400">
          <Calendar size={10} />
          {new Date(task.dueDate).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
        </div>
      </div>

      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {task.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{tag}</span>
          ))}
        </div>
      )}
      {task.groups && task.groups.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {task.groups.map(g => (
            <span key={g.id}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
              style={{ background: g.color }}>
              {g.name}
            </span>
          ))}
        </div>
      )}
      {attributes.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {attributes.map(attr => {
            const ev = evaluateAttribute(attr, task)
            return (
              <span key={attr.id}
                title={attr.name}
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white inline-flex items-center gap-1"
                style={{ background: ev.color }}>
                <Sparkles size={9} />
                {ev.label}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Detail Modal ───────────────────────────────────────────────────────────────
function TaskDetailModal({
  task, deptName, assigneeName, createdByName, onClose, onRefetch,
}: {
  task: Task; deptName?: string; assigneeName?: string; createdByName?: string
  onClose: () => void; onRefetch: () => void
}) {
  const { lang } = useLanguage()
  const selectedTask = task
  const [updatingItem, setUpdatingItem] = useState<string | null>(null)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [comments, setComments] = useState<any[]>([])
  const [attachments, setAttachments] = useState<any[]>([])
  const [photoPreview, setPhotoPreview] = useState<any>(null)
  const [photoAnalysis, setPhotoAnalysis] = useState<string | null>(null)
  const [photoAnalyzing, setPhotoAnalyzing] = useState(false)
  const [operiqResult, setOperiqResult] = useState<any>(null)
  const [operiqLoading, setOperiqLoading] = useState(false)

  const handleStatusUpdate = async (newStatus: string) => {
    setStatusUpdating(true)
    try {
      await updateTaskStatus(task.id, newStatus)
      onRefetch()
      if (newStatus === 'IPTAL' || newStatus === 'TAMAMLANDI') onClose()
    } catch {} finally { setStatusUpdating(false) }
  }

  useEffect(() => {
    api.get<any[]>(`/tasks/${task.id}/comments`).then(setComments).catch(() => {})
    api.get<any[]>(`/tasks/${task.id}/attachments`).then(setAttachments).catch(() => {})
  }, [task.id])

  const handleOperIQAnalyze = async () => {
    setOperiqLoading(true)
    setOperiqResult(null)
    try {
      const statusMap: Record<string, string> = { beklemede: 'Beklemede', devam_ediyor: 'Devam Ediyor', tamamlandi: 'Tamamlandi', gecikti: 'Gecikti', iptal: 'Iptal' }
      const priorityMap: Record<string, string> = { dusuk: 'Dusuk', normal: 'Normal', yuksek: 'Yuksek', kritik: 'Kritik' }
      const checklistInfo = task.checklist?.length > 0
        ? `Kontrol Listesi: ${task.checklist.filter((c: any) => c.completed).length}/${task.checklist.length} tamamlandi`
        : 'Kontrol listesi yok'
      const commentInfo = comments.length > 0
        ? `Yorumlar (${comments.length}): ${comments.slice(0, 5).map((c: any) => c.content).join(' | ')}`
        : 'Henuz yorum yok'

      const prompt = `Bu gorevi analiz et ve operasyonel icgoru uret.

GOREV DETAYLARI:
- Baslik: ${task.title}
- Aciklama: ${task.description || 'Belirtilmemis'}
- Durum: ${statusMap[task.status] || task.status}
- Oncelik: ${priorityMap[task.priority] || task.priority}
- Tur: ${task.type}
- Olusturulma: ${new Date(task.createdAt).toLocaleDateString('tr-TR')}
- Son Tarih: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString('tr-TR') : 'Belirtilmemis'}
- Atanan: ${task.assignee?.name || 'Belirtilmemis'}
- ${checklistInfo}
- Fotograf/Ek: ${attachments.length} adet
- ${commentInfo}

KURALLAR:
- SADECE bu gorev hakkinda analiz yap, genel sirket analizi YAPMA
- Gorev durumuna gore degerlendirme yap
- Gecikme riski varsa uyar
- Oncelik ve tur bazli oneriler sun
- En fazla 4-5 cumle ile ozet ver
- Veri yetersizse bunu belirt ve eldeki bilgiyle en iyi yorumu yap
- Em-dash veya en-dash kullanma, sadece kisa tire (-) kullan

JSON formatinda yanit ver:
{"ozet": "...", "risk": "dusuk|orta|yuksek", "oneriler": ["...", "..."]}`

      const result = await api.post<any>('/operiq-chat/message', { message: prompt.slice(0, 2000) })
      const aiText = result?.reply || result?.content || result?.message || ''
      // Try to parse JSON from AI response
      let parsed: any = null
      try {
        const jsonMatch = aiText.match(/\{[\s\S]*\}/)
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0])
      } catch {}
      setOperiqResult(parsed || { ozet: aiText })
    } catch (e: any) {
      setOperiqResult({ ozet: e.message || 'Analiz yapilamadi. Lutfen tekrar deneyin.' })
    } finally { setOperiqLoading(false) }
  }

  const handleChecklistToggle = async (itemId: string, completed: boolean) => {
    setUpdatingItem(itemId)
    try {
      await updateChecklistItem(task.id, itemId, completed)
      onRefetch()
    } catch { /* ignore */ } finally {
      setUpdatingItem(null)
    }
  }

  return (
    <DraggableModal
      title={task.title}
      subtitle={TASK_STATUS_LABELS[task.status]}
      icon={<CheckSquare size={13} />}
      onClose={onClose}
      width={540}
      maxHeight="88vh"
    >
      <div className="p-6 space-y-5">
        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={clsx('badge', `bg-${task.priority === 'kritik' ? 'red' : task.priority === 'yuksek' ? 'amber' : 'blue'}-100 text-${task.priority === 'kritik' ? 'red' : task.priority === 'yuksek' ? 'amber' : 'blue'}-700`)}>
            {TASK_PRIORITY_LABELS[task.priority]}
          </span>
          <span className={STATUS_STYLES[task.status]}>{TASK_STATUS_LABELS[task.status]}</span>
          <span className="badge-neutral">{TASK_TYPE_LABELS[task.type as keyof typeof TASK_TYPE_LABELS] ?? task.type}</span>
        </div>

        <p className="text-sm" style={{ color: 'var(--text-2)' }}>{task.description}</p>

        <div className="grid grid-cols-2 gap-3 text-xs">
          {[
            { label: 'Departman',  value: deptName       },
            { label: 'Atanan',     value: assigneeName   },
            { label: 'Oluşturan',  value: createdByName  },
            { label: 'Son Tarih',  value: new Date(task.dueDate).toLocaleString('tr-TR', { day:'2-digit', month:'long', hour:'2-digit', minute:'2-digit' }) },
          ].map(item => item.value && (
            <div key={item.label} className="rounded-lg p-3" style={{ background: 'var(--border-subtle)', border: '1px solid var(--border)' }}>
              <p className="mb-1" style={{ color: 'var(--text-3)' }}>{item.label}</p>
              <p className="font-medium" style={{ color: 'var(--text-1)' }}>{item.value}</p>
            </div>
          ))}
        </div>

        {task.checklist.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-1)' }}>
              Kontrol Listesi ({task.checklist.filter(c => c.completed).length}/{task.checklist.length})
            </h3>
            <ul className="space-y-2">
              {task.checklist.map(item => (
                <li
                  key={item.id}
                  onClick={() => handleChecklistToggle(item.id, !item.completed)}
                  className="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                  style={{
                    background: item.completed ? 'var(--success-bg)' : 'var(--border-subtle)',
                    border: '1px solid ' + (item.completed ? 'var(--success-border)' : 'var(--border)'),
                  }}
                  onMouseEnter={e => !item.completed && (e.currentTarget.style.filter = 'brightness(0.97)')}
                  onMouseLeave={e => (e.currentTarget.style.filter = '')}
                >
                  <div className={clsx(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all',
                    updatingItem === item.id ? 'opacity-50' :
                    item.completed ? 'bg-green-500 border-green-500' : 'border-slate-300'
                  )}>
                    {item.completed && (
                      <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={clsx('text-sm', item.completed ? 'line-through' : '')}
                      style={{ color: item.completed ? 'var(--text-3)' : 'var(--text-1)' }}>
                      {item.text}
                    </p>
                    {item.note && (
                      <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                        <AlertCircle size={11} /> {item.note}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {task.tags.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-1)' }}>
              <Tag size={14} /> Etiketler
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {task.tags.map(tag => <span key={tag} className="badge-neutral">{tag}</span>)}
            </div>
          </div>
        )}

        {/* Task management actions */}
        <div className="border-t pt-4" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-1)' }}>Gorev Yönetimi</h3>
          <div className="flex flex-wrap gap-2">
            {task.status !== 'tamamlandi' && task.status !== 'iptal' && (
              <>
                {task.status === 'beklemede' && (
                  <button type="button" onClick={() => handleStatusUpdate('DEVAM_EDIYOR')} disabled={statusUpdating}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold text-white disabled:opacity-50" style={{ background: '#3b82f6' }}>
                    Devam Ettir
                  </button>
                )}
                <button type="button" onClick={() => handleStatusUpdate('TAMAMLANDI')} disabled={statusUpdating}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold text-white disabled:opacity-50" style={{ background: '#22c55e' }}>
                  <CheckSquare size={13} /> Gorevi Kapat
                </button>
                <button type="button" onClick={() => handleStatusUpdate('BEKLEMEDE')} disabled={statusUpdating || task.status === 'beklemede'}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold disabled:opacity-50" style={{ background: 'var(--border-subtle)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
                  Revize Et (Beklet)
                </button>
                <button type="button" onClick={() => { if (window.confirm('Bu gorevi iptal etmek istediginize emin misiniz?')) handleStatusUpdate('IPTAL') }} disabled={statusUpdating}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold text-red-600 disabled:opacity-50" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                  Iptal Et
                </button>
              </>
            )}
            {(task.status === 'tamamlandi' || task.status === 'iptal') && (
              <button type="button" onClick={() => handleStatusUpdate('BEKLEMEDE')} disabled={statusUpdating}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold disabled:opacity-50" style={{ background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe' }}>
                Yeniden Ac
              </button>
            )}
          </div>
        </div>

        {/* Attachments (photos from mobile) */}
        {attachments.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-1)' }}>
              <Camera size={14} /> {lang === 'tr' ? 'Foto\u011fraflar' : 'Photos'} ({attachments.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {attachments.map((att: any) => (
                <div key={att.id} className="relative group">
                  <img
                    src={`${API_BASE.replace('/api/v1', '')}${att.url}`}
                    alt={att.originalName}
                    className="w-20 h-20 rounded-lg object-cover border cursor-pointer hover:shadow-lg transition-shadow"
                    style={{ borderColor: 'var(--border)' }}
                    onClick={() => setPhotoPreview(att)}
                  />
                  <p className="text-[9px] mt-0.5 truncate max-w-[80px]" style={{ color: 'var(--text-3)' }}>
                    {att.uploaderName} - {new Date(att.createdAt).toLocaleDateString('tr-TR')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Photo Preview + OperIQ Analysis Modal */}
        {photoPreview && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => { setPhotoPreview(null); setPhotoAnalysis(null) }}>
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>{photoPreview.originalName}</p>
                <button onClick={() => { setPhotoPreview(null); setPhotoAnalysis(null) }} className="p-1 rounded hover:bg-zinc-100">
                  <X size={16} />
                </button>
              </div>
              <div className="p-4">
                <img src={`${API_BASE.replace('/api/v1', '')}${photoPreview.url}`} alt="" className="w-full rounded-xl" />
              </div>
              <div className="p-4 border-t flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
                <button
                  onClick={async () => {
                    setPhotoAnalyzing(true)
                    try {
                      const imgUrl = `${API_BASE.replace('/api/v1', '')}${photoPreview.url}`
                      const resp = await fetch(imgUrl)
                      const blob = await resp.blob()
                      const reader = new FileReader()
                      reader.onload = async () => {
                        const base64 = (reader.result as string).split(',')[1]
                        const mimeType = blob.type || 'image/jpeg'
                        const res = await api.post<any>('/gemini/analyze-image', { image: base64, mimeType, context: `G\u00f6rev: ${selectedTask?.title}. ${selectedTask?.description || ''}` })
                        setPhotoAnalysis(res?.analysis || res?.data?.analysis || JSON.stringify(res))
                        setPhotoAnalyzing(false)
                      }
                      reader.readAsDataURL(blob)
                    } catch (e: any) {
                      setPhotoAnalysis(lang === 'tr' ? 'Analiz yap\u0131lamad\u0131: ' + e.message : 'Analysis failed: ' + e.message)
                      setPhotoAnalyzing(false)
                    }
                  }}
                  disabled={photoAnalyzing}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 flex items-center gap-2 disabled:opacity-50"
                >
                  {photoAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Cpu size={14} />}
                  OperIQ Guided AI {lang === 'tr' ? 'ile Analiz Et' : 'Analysis'}
                </button>
                <a href={`${API_BASE.replace('/api/v1', '')}${photoPreview.url}`} target="_blank" rel="noreferrer"
                  className="px-4 py-2 rounded-lg text-sm font-semibold border hover:bg-zinc-50" style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}>
                  {lang === 'tr' ? 'Orijinal A\u00e7' : 'Open Original'}
                </a>
              </div>
              {photoAnalysis && (
                <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
                  <h4 className="text-xs font-bold text-teal-700 mb-2 flex items-center gap-1.5">
                    <Cpu size={12} /> OperIQ Guided AI {lang === 'tr' ? 'Analiz Sonucu' : 'Analysis Result'}
                  </h4>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-2)' }}>
                    {photoAnalysis}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Comments */}
        {comments.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-1)' }}>
              <MessageSquare size={14} /> Yorumlar ({comments.length})
            </h3>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {comments.map((c: any) => (
                <div key={c.id} className="p-3 rounded-lg" style={{ background: 'var(--border-subtle)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[11px] font-bold" style={{ color: 'var(--text-1)' }}>{c.userName}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>{new Date(c.createdAt).toLocaleString('tr-TR')}</p>
                  </div>
                  <p className="text-[12px]" style={{ color: 'var(--text-2)' }}>{c.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* OperIQ Analysis button */}
        {(comments.length > 0 || attachments.length > 0) && (
          <button type="button" onClick={handleOperIQAnalyze} disabled={operiqLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[12px] font-bold transition-all"
            style={{ background: '#14b8a6', color: '#fff' }}>
            {operiqLoading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            OperIQ Analiz
          </button>
        )}

        {operiqResult && (
          <div className="p-3 rounded-lg text-[12px] space-y-2" style={{ background: 'var(--border-subtle)', border: '1px solid var(--border)' }}>
            <p className="font-bold flex items-center gap-1" style={{ color: '#14b8a6' }}><Zap size={12} /> OperIQ Gorev Analizi</p>
            <p style={{ color: 'var(--text-2)' }}>{operiqResult.ozet || operiqResult.content?.ozet || (typeof operiqResult.content === 'string' ? operiqResult.content : '-')}</p>
            {operiqResult.risk && (
              <p className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded" style={{
                  background: operiqResult.risk === 'yuksek' ? '#fef2f2' : operiqResult.risk === 'orta' ? '#fffbeb' : '#f0fdf4',
                  color: operiqResult.risk === 'yuksek' ? '#dc2626' : operiqResult.risk === 'orta' ? '#d97706' : '#16a34a',
                  border: `1px solid ${operiqResult.risk === 'yuksek' ? '#fecaca' : operiqResult.risk === 'orta' ? '#fde68a' : '#bbf7d0'}`,
                }}>Risk: {operiqResult.risk}</span>
              </p>
            )}
            {operiqResult.oneriler?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--text-3)' }}>Oneriler</p>
                <ul className="space-y-0.5">
                  {operiqResult.oneriler.map((o: string, i: number) => (
                    <li key={i} className="flex items-start gap-1.5" style={{ color: 'var(--text-2)' }}>
                      <span className="text-teal-500 mt-0.5">-</span> {o}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </DraggableModal>
  )
}

// Role level mapping for hierarchy checks
const ROLE_LEVEL: Record<string, number> = {
  super_admin: 10, platform_admin: 9, genel_mudur: 8, gm_yardimcisi: 7,
  direktor: 6, mudur: 5, supervizor: 4, muhendis: 3, teknisyen: 2, isci: 1,
}

// ── Create Modal ───────────────────────────────────────────────────────────────
function CreateTaskModal({
  departments, users, onClose, onCreated, currentUser,
}: {
  departments: import('../types').Department[]
  users: import('../types').User[]
  onClose: () => void
  onCreated: () => void
  currentUser: { role: string; departmentId?: string } | null
}) {
  const myLevel = ROLE_LEVEL[currentUser?.role ?? ''] ?? 0
  // MUDUR and below: only own department. DIREKTOR+: all departments
  const visibleDepts = myLevel >= ROLE_LEVEL.direktor
    ? departments
    : departments.filter(d => d.id === currentUser?.departmentId)

  const [form, setForm] = useState({
    title: '', description: '', departmentId: visibleDepts[0]?.id ?? '',
    assigneeId: '', priority: 'normal', type: 'standart', dueDate: '',
    latitude: '', longitude: '',
  })
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState<string | null>(null)

  // Filter users: same department (or all if "all" selected) + active + lower role level than creator
  const deptUsers = users.filter(u =>
    (form.departmentId === '__all__' ? true : u.departmentId === form.departmentId) &&
    u.active &&
    (ROLE_LEVEL[u.role] ?? 0) < myLevel
  )

  const handleSubmit = async () => {
    if (!form.title || !form.assigneeId || !form.dueDate) return
    setSaving(true)
    setErr(null)
    try {
      await createTask({
        title:        form.title,
        description:  form.description,
        departmentId: form.departmentId === '__all__'
          ? users.find(u => u.id === form.assigneeId)?.departmentId ?? ''
          : form.departmentId,
        assigneeId:   form.assigneeId,
        priority:     form.priority,
        type:         form.type,
        dueDate:      new Date(form.dueDate).toISOString(),
        latitude:     form.latitude  ? parseFloat(form.latitude)  : null,
        longitude:    form.longitude ? parseFloat(form.longitude) : null,
      })
      onCreated()
      onClose()
    } catch (e: any) {
      setErr(e.message ?? 'Görev oluşturulamadı')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DraggableModal
      title="Yeni Görev Oluştur"
      icon={<Plus size={13} />}
      onClose={onClose}
      width={540}
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">İptal</button>
          <button onClick={handleSubmit} className="btn-primary"
            disabled={saving || !form.title || !form.assigneeId || !form.dueDate}>
            <Plus size={15} /> {saving ? 'Oluşturuluyor...' : 'Görevi Oluştur'}
          </button>
        </>
      }
    >
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>Görev Başlığı *</label>
          <input className="input" placeholder="Görev başlığını girin..." value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>Açıklama</label>
          <textarea className="input h-20 resize-none" placeholder="Görev açıklaması..." value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="ct-dept" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>Departman</label>
            <select id="ct-dept" className="select" value={form.departmentId}
              onChange={e => setForm({ ...form, departmentId: e.target.value, assigneeId: '' })}>
              {visibleDepts.length > 1 && <option value="__all__">Tum Departmanlar</option>}
              {visibleDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="ct-assignee" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>Atanan Kişi *</label>
            <select id="ct-assignee" className="select" value={form.assigneeId}
              onChange={e => setForm({ ...form, assigneeId: e.target.value })}>
              <option value="">Seçin...</option>
              {deptUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="ct-priority" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>Öncelik</label>
            <select id="ct-priority" className="select" value={form.priority}
              onChange={e => setForm({ ...form, priority: e.target.value })}>
              {Object.entries(TASK_PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="ct-type" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>Tür</label>
            <select id="ct-type" className="select" value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value })}>
              {Object.entries(TASK_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="ct-duedate" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>Son Tarih *</label>
          <input id="ct-duedate" type="datetime-local" className="input" value={form.dueDate}
            onChange={e => setForm({ ...form, dueDate: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>
            Konum <span className="font-normal text-zinc-400">(isteğe bağlı)</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input className="input" placeholder="Enlem  (ör. 41.0082)" value={form.latitude}
              onChange={e => setForm({ ...form, latitude: e.target.value })} />
            <input className="input" placeholder="Boylam (ör. 28.9784)" value={form.longitude}
              onChange={e => setForm({ ...form, longitude: e.target.value })} />
          </div>
          <p className="text-[10px] text-zinc-400 mt-1">Google Maps'ten kopyalayabilirsiniz</p>
        </div>
        {err && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 text-red-500 text-xs border border-red-500/20">
            <AlertCircle size={13} /> {err}
          </div>
        )}
      </div>
    </DraggableModal>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function Tasks() {
  const [search,          setSearch]         = useState('')
  const [filterStatus,    setFilterStatus]   = useState('tumu')
  const [filterDept,      setFilterDept]     = useState('tumu')
  const [filterPriority,  setFilterPriority] = useState('tumu')
  const [selectedTask,    setSelectedTask]   = useState<Task | null>(null)
  const [showCreate,      setShowCreate]     = useState(false)
  const [showGroups,      setShowGroups]     = useState(false)
  const [showAttrs,       setShowAttrs]      = useState(false)
  const [attributes,      setAttributes]     = useState<CustomAttribute[]>(() => listAttributes())
  const searchRef = useRef<HTMLInputElement>(null)

  // Re-load attributes whenever the manager closes (after edits)
  useEffect(() => {
    if (!showAttrs) setAttributes(listAttributes())
  }, [showAttrs])

  // Page-specific shortcuts
  useShortcut({ keys: 'c', label: 'Yeni görev oluştur', category: 'Eylem',   handler: () => setShowCreate(true) })
  useShortcut({ keys: '/', label: 'Görev arama',         category: 'Eylem',   handler: () => searchRef.current?.focus() })
  useShortcut({ keys: 'a', label: 'Özellik yöneticisi',  category: 'Görünüm', handler: () => setShowAttrs(true) })
  useShortcut({ keys: 'l', label: 'Grup yöneticisi',     category: 'Görünüm', handler: () => setShowGroups(true) })

  const handleExportExcel = () => {
    exportToExcel({
      filename:  `gorevler_${new Date().toISOString().slice(0,10)}.xlsx`,
      sheetName: 'Görevler',
      columns: [
        { header: 'Başlık',     accessor: t => t.title,                                       width: 36 },
        { header: 'Açıklama',   accessor: t => t.description,                                 width: 50 },
        { header: 'Departman',  accessor: t => deptMap[t.departmentId] ?? '-',                width: 22 },
        { header: 'Atanan',     accessor: t => userMap[t.assigneeId] ?? '-',                  width: 22 },
        { header: 'Durum',      accessor: t => TASK_STATUS_LABELS[t.status],                  width: 14 },
        { header: 'Öncelik',    accessor: t => TASK_PRIORITY_LABELS[t.priority],              width: 12 },
        { header: 'Tip',        accessor: t => TASK_TYPE_LABELS[t.type],                      width: 12 },
        { header: 'Bitiş',      accessor: t => new Date(t.dueDate).toLocaleDateString('tr-TR'),width: 12 },
        { header: 'Oluşturma',  accessor: t => new Date(t.createdAt).toLocaleDateString('tr-TR'), width: 12 },
        { header: 'Etiketler',  accessor: t => (t.tags ?? []).join(', '),                     width: 24 },
      ],
      rows: tasks,
    })
  }

  const { tasks, loading, refetch } = useTasks({
    status:       filterStatus,
    priority:     filterPriority,
    departmentId: filterDept,
    search:       search || undefined,
  })

  const { user } = useAuth()
  const { departments } = useDepartments()
  const { users }       = useUsers({ active: 'aktif' })

  // Auto-refresh when tasks are updated via socket (mobile status changes, comments, photos)
  useEffect(() => {
    const handler = () => refetch()
    const events = ['task:updated', 'task:checklist:updated']
    const timer = setInterval(refetch, 30000) // Also poll every 30s
    // Listen for custom events from Header socket
    events.forEach(e => window.addEventListener(e, handler))
    return () => {
      clearInterval(timer)
      events.forEach(e => window.removeEventListener(e, handler))
    }
  }, [refetch])

  const statusCounts = tasks.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1; return acc
  }, {} as Record<string, number>)

  const deptMap  = Object.fromEntries(departments.map(d => [d.id, d.name]))
  const userMap  = Object.fromEntries(users.map(u => [u.id, u.name]))

  useToolbarActions({
    onNew:     () => setShowCreate(true),
    onSearch:  () => searchRef.current?.focus(),
    onRefresh: () => refetch(),
    onExport:  () => handleExportExcel(),
    onFilter:  () => searchRef.current?.focus(),
  })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-slate-500">
          {loading ? 'Yükleniyor…' : `${tasks.length} görev`}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportExcel}
            className="btn-secondary"
            data-help="Filtrelenmiş görev listesini Excel (.xlsx) dosyası olarak indirir"
          >
            <FileSpreadsheet size={14} /> Excel
          </button>
          <button onClick={() => setShowAttrs(true)} className="btn-secondary"
            data-help="Görevler için kural-tabanlı özel etiketler tanımlar (Risk Bandı, Aciliyet vb.)">
            <Sparkles size={14} /> Özellikler
          </button>
          <button onClick={() => setShowGroups(true)} className="btn-secondary"
            data-help="Görevleri renkli gruplar altında topla, dashboard'da filtrele">
            <Layers size={14} /> Gruplar
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary"
            data-help="Yeni görev oluşturma penceresini açar (kısayol: C)">
            <Plus size={16} /> Yeni Görev
          </button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { key: 'tumu',        label: 'Tümü',      count: tasks.length },
          { key: 'devam_ediyor', label: 'Devam Eden', count: statusCounts['devam_ediyor'] || 0 },
          { key: 'beklemede',   label: 'Beklemede', count: statusCounts['beklemede'] || 0 },
          { key: 'gecikti',     label: 'Gecikmiş',  count: statusCounts['gecikti'] || 0 },
          { key: 'tamamlandi',  label: 'Tamamlandı',count: statusCounts['tamamlandi'] || 0 },
        ].map(tab => (
          <button key={tab.key} onClick={() => setFilterStatus(tab.key)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
              filterStatus === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300'
            )}>
            {tab.label}
            <span className={clsx('text-xs px-1.5 py-0.5 rounded-full font-semibold',
              filterStatus === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600')}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input ref={searchRef} className="input pl-9 w-full" placeholder="Görev ara… ( / )" value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-3 sm:flex-shrink-0">
          <select aria-label="Departman filtresi" className="select w-full sm:w-44" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
            <option value="tumu">Tüm Departmanlar</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select aria-label="Öncelik filtresi" className="select w-full sm:w-36" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
            <option value="tumu">Tüm Öncelikler</option>
            {Object.entries(TASK_PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* Task Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="card h-36 animate-pulse" />)}
        </div>
      ) : tasks.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckSquare size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Görev bulunamadı</p>
          <p className="text-slate-400 text-sm mt-1">Filtreleri değiştirerek tekrar deneyin</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tasks.map(task => (
            <TaskCard
              key={task.id} task={task}
              deptName={deptMap[task.departmentId]}
              assigneeName={userMap[task.assigneeId]}
              attributes={attributes}
              onSelect={setSelectedTask}
            />
          ))}
        </div>
      )}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          deptName={deptMap[selectedTask.departmentId]}
          assigneeName={userMap[selectedTask.assigneeId]}
          createdByName={userMap[selectedTask.createdBy]}
          onClose={() => setSelectedTask(null)}
          onRefetch={refetch}
        />
      )}

      {showCreate && (
        <CreateTaskModal
          departments={departments}
          users={users}
          currentUser={user}
          onClose={() => setShowCreate(false)}
          onCreated={refetch}
        />
      )}

      {showGroups && (
        <TaskGroupsManager
          onClose={() => setShowGroups(false)}
          allTasks={tasks}
        />
      )}

      {showAttrs && (
        <AttributesManager
          onClose={() => setShowAttrs(false)}
          allTasks={tasks}
          onChange={() => setAttributes(listAttributes())}
        />
      )}
    </div>
  )
}
