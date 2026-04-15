import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Circle, Clock, Camera, Video, Send, Loader2 } from 'lucide-react'
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

        {/* Action buttons */}
        <div className="flex gap-2">
          {task.status === 'beklemede' && (
            <button
              type="button"
              onClick={() => handleStatusChange('DEVAM_EDIYOR')}
              className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm active:scale-[0.98]"
            >
              {t('m_task_start')}
            </button>
          )}
          {task.status === 'devam_ediyor' && (
            <button
              type="button"
              onClick={() => handleStatusChange('TAMAMLANDI')}
              className="flex-1 py-3 rounded-xl bg-green-600 text-white font-semibold text-sm active:scale-[0.98]"
            >
              {t('m_task_complete')}
            </button>
          )}
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

        {/* Photos section */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">{t('m_task_photos')}</p>
          <div className="flex gap-2">
            <label className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer active:bg-slate-50">
              <Camera size={22} className="text-slate-400" />
              <input type="file" accept="image/*" capture="environment" className="hidden" multiple />
            </label>
            <label className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer active:bg-slate-50">
              <Video size={22} className="text-slate-400" />
              <input type="file" accept="video/*" capture="environment" className="hidden" />
            </label>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">{t('m_task_max_photos')} / {t('m_task_max_video')}</p>
        </div>

        {/* Comment */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-end gap-2">
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder={t('m_task_comment')}
            rows={2}
            className="flex-1 text-sm border-none resize-none focus:outline-none text-slate-700 placeholder:text-slate-400"
          />
          <button
            type="button"
            disabled={!comment.trim()}
            className="p-2 rounded-lg bg-cyan-600 text-white disabled:opacity-30 active:scale-95"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
