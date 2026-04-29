import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Circle, Clock, Camera, Send, Loader2, Image, X } from 'lucide-react'
import { API_BASE, tokenStore } from '../../lib/api'
import clsx from 'clsx'
import { useLanguage } from '../../context/LanguageContext'
import { api } from '../../lib/api'
import { updateTaskStatus, updateChecklistItem } from '../../lib/hooks'
import type { Task, ChecklistItem } from '../../types'

export default function MobileTaskDetail() {
  const { id } = useParams<{ id: string }>()
  const { t, lang } = useLanguage()
  const navigate = useNavigate()
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')
  const [sending, setSending] = useState(false)
  const [photos, setPhotos] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [comments, setComments] = useState<any[]>([])
  const [attachments, setAttachments] = useState<any[]>([])

  // Load comments & attachments
  useEffect(() => {
    if (!id) return
    api.get<any[]>(`/tasks/${id}/comments`).then(setComments).catch(() => {})
    api.get<any[]>(`/tasks/${id}/attachments`).then(setAttachments).catch(() => {})
  }, [id])

  const handleSendComment = async () => {
    if (!id || !comment.trim()) return
    setSending(true)
    try {
      const data = await api.post<any>(`/tasks/${id}/comments`, { content: comment.trim() })
      setComments(prev => [...prev, data])
      setComment('')
    } catch {} finally { setSending(false) }
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    setPhotos(prev => [...prev, ...Array.from(files)])
  }

  const handleUploadPhotos = async () => {
    if (!id || photos.length === 0) return
    setUploading(true)
    try {
      for (const photo of photos) {
        // Compress image before upload (max 1200px, 0.7 quality)
        const compressed = await compressImage(photo, 1200, 0.7)
        const fd = new FormData()
        fd.append('photo', compressed, photo.name || 'photo.jpg')
        const token = tokenStore.get()
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 60000)
        try {
          const res = await fetch(`${API_BASE}/tasks/${id}/attachments`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'include',
            body: fd,
            signal: controller.signal,
          })
          clearTimeout(timer)
          if (res.ok) {
            const body = await res.json()
            setAttachments(prev => [...prev, body.data])
          } else {
            alert(lang === 'tr' ? 'Fotograf yuklenemedi' : 'Photo upload failed')
          }
        } catch (err: any) {
          clearTimeout(timer)
          alert(err.name === 'AbortError'
            ? (lang === 'tr' ? 'Yukleme zaman asimina ugradi. Daha kucuk bir fotograf deneyin.' : 'Upload timed out. Try a smaller photo.')
            : (lang === 'tr' ? 'Yukleme basarisiz oldu' : 'Upload failed'))
        }
      }
      setPhotos([])
    } catch {} finally { setUploading(false) }
  }

  // Compress image to reduce upload size
  function compressImage(file: File, maxSize: number, quality: number): Promise<Blob> {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        canvas.toBlob(blob => resolve(blob || file), 'image/jpeg', quality)
        URL.revokeObjectURL(img.src)
      }
      img.onerror = () => resolve(file)
      img.src = URL.createObjectURL(file)
    })
  }

  useEffect(() => {
    if (!id) return
    api.get<any>(`/tasks/${id}`).then(data => {
      setTask(data as any)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  const handleChecklistToggle = async (item: ChecklistItem) => {
    if (!task) return
    try {
      await updateChecklistItem(task.id, item.id, !item.completed)
      setTask(prev => prev ? {
        ...prev,
        checklist: prev.checklist?.map(c => c.id === item.id ? { ...c, completed: !c.completed } : c)
      } : null)
    } catch {}
  }

  const handleStatusChange = async (status: string) => {
    if (!task) return
    try {
      await updateTaskStatus(task.id, status)
      setTask(prev => prev ? { ...prev, status: status as any } : null)

      // Task-based location tracking
      if (status === 'DEVAM_EDIYOR' || status === 'devam_ediyor') {
        // Task started -> start location tracking
        localStorage.setItem('actledger_tracking_task', task.id)
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            pos => {
              api.post('/locations/start-tracking', {
                taskId: task.id,
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              }).catch(() => {})
            },
            () => {},
            { enableHighAccuracy: true, timeout: 10000 }
          )
        }
      } else if (status === 'TAMAMLANDI' || status === 'tamamlandi' || status === 'IPTAL' || status === 'iptal') {
        // Task completed/cancelled -> stop location tracking
        localStorage.removeItem('actledger_tracking_task')
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            pos => {
              api.post('/locations/stop-tracking', {
                taskId: task.id,
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              }).catch(() => {})
            },
            () => {
              api.post('/locations/stop-tracking', { taskId: task.id }).catch(() => {})
            },
            { enableHighAccuracy: true, timeout: 5000 }
          )
        } else {
          api.post('/locations/stop-tracking', { taskId: task.id }).catch(() => {})
        }
      }
    } catch {}
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="text-cyan-500 animate-spin" />
      </div>
    )
  }

  if (!task) {
    return (
      <div className="p-4 text-center py-20">
        <p className="text-slate-500">Görev bulunamadı</p>
      </div>
    )
  }

  const checkDone = task.checklist?.filter(c => c.completed).length ?? 0
  const checkTotal = task.checklist?.length ?? 0

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 z-10">
        <button type="button" onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">{task.title}</p>
          <p className="text-xs text-slate-400">{task.department?.name}</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Description */}
        {task.description && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-700 leading-relaxed">{task.description}</p>
          </div>
        )}

        {/* Status + Due */}
        <div className="flex gap-2">
          {task.dueDate && (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-600">
              <Clock size={12} />
              {t('m_task_due')}: {new Date(task.dueDate).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US')}
            </div>
          )}
        </div>

        {/* Status selection */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">{lang === 'tr' ? 'Gorev Durumu' : 'Task Status'}</p>
          <div className="space-y-2">
            {([
              { value: 'BEKLEMEDE', label: lang === 'tr' ? 'Beklemede' : 'Pending', color: '#94a3b8', bg: '#f1f5f9' },
              { value: 'DEVAM_EDIYOR', label: lang === 'tr' ? 'Devam Ediyor' : 'In Progress', color: '#3b82f6', bg: '#eff6ff' },
              { value: 'GECIKTI', label: lang === 'tr' ? 'Gecikti' : 'Overdue', color: '#f59e0b', bg: '#fffbeb' },
              { value: 'TAMAMLANDI', label: lang === 'tr' ? 'Tamamlandi' : 'Completed', color: '#22c55e', bg: '#f0fdf4' },
            ] as const).map(s => {
              const current = task.status.toUpperCase() === s.value
              return (
                <button key={s.value} type="button" onClick={() => !current && handleStatusChange(s.value)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all active:scale-[0.98]"
                  style={{ borderColor: current ? s.color : '#e2e8f0', background: current ? s.bg : '#fff' }}>
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={{ borderColor: s.color, background: current ? s.color : 'transparent' }}>
                    {current && (
                      <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm font-semibold" style={{ color: current ? s.color : '#64748b' }}>{s.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Checklist */}
        {checkTotal > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('m_task_checklist')}</p>
              <span className="text-xs text-slate-400 font-medium">{checkDone}/{checkTotal}</span>
            </div>
            <div className="divide-y divide-slate-100">
              {task.checklist?.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleChecklistToggle(item)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left active:bg-slate-50 transition-colors"
                >
                  {item.completed
                    ? <CheckCircle2 size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
                    : <Circle size={20} className="text-slate-300 flex-shrink-0 mt-0.5" />
                  }
                  <span className={clsx(
                    'text-sm flex-1',
                    item.completed ? 'text-slate-400 line-through' : 'text-slate-700'
                  )}>
                    {item.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Existing attachments */}
        {attachments.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">{lang === 'tr' ? 'Eklenen Fotograflar' : 'Attached Photos'}</p>
            <div className="flex gap-2 flex-wrap">
              {attachments.map((att: any) => (
                <div key={att.id} className="relative">
                  <img src={`${API_BASE.replace('/api/v1', '')}${att.url}`} alt={att.originalName} className="w-16 h-16 rounded-xl object-cover border border-slate-200" />
                  <p className="text-[9px] text-slate-400 mt-0.5 truncate max-w-[64px]">{att.uploaderName}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Photo upload */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">{lang === 'tr' ? 'Fotoğraf Ekle' : 'Add Photo'}</p>
          <div className="flex gap-2 flex-wrap items-center">
            <label className="w-16 h-16 rounded-xl border-2 border-dashed border-cyan-300 flex items-center justify-center cursor-pointer active:bg-cyan-50 bg-cyan-50/50">
              <Camera size={22} className="text-cyan-500" />
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoSelect} />
            </label>
            <label className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer active:bg-slate-50">
              <Image size={22} className="text-slate-400" />
              <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} />
            </label>
            {photos.map((p, i) => (
              <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-cyan-200">
                <img src={URL.createObjectURL(p)} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                  className="absolute top-0.5 right-0.5 bg-black/50 rounded-full p-0.5"><X size={10} className="text-white" /></button>
              </div>
            ))}
          </div>
          {photos.length > 0 && (
            <button type="button" onClick={handleUploadPhotos} disabled={uploading}
              className="mt-3 w-full py-2 rounded-lg bg-cyan-600 text-white text-sm font-bold disabled:opacity-50 active:scale-[0.98]">
              {uploading ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null}
              {lang === 'tr' ? `${photos.length} Fotoğrafı Gönder` : `Send ${photos.length} Photo(s)`}
            </button>
          )}
        </div>

        {/* Comments list */}
        {comments.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">{lang === 'tr' ? 'Yorumlar' : 'Comments'}</p>
            <div className="space-y-2">
              {comments.map((c: any) => (
                <div key={c.id} className="p-2.5 rounded-lg bg-slate-50">
                  <p className="text-[11px] font-semibold text-slate-700">{c.userName}</p>
                  <p className="text-[12px] text-slate-600 mt-0.5">{c.content}</p>
                  <p className="text-[9px] text-slate-400 mt-1">{new Date(c.createdAt).toLocaleString('tr-TR')}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comment input */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-end gap-2">
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder={lang === 'tr' ? 'Yorum yazin...' : 'Write a comment...'}
            rows={2}
            className="flex-1 text-sm border-none resize-none focus:outline-none text-slate-700 placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={handleSendComment}
            disabled={!comment.trim() || sending}
            className="p-2 rounded-lg bg-cyan-600 text-white disabled:opacity-30 active:scale-95"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  )
}
