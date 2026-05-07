import React, { useState, useEffect, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, Clock, ChevronRight, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { useLanguage } from '../../context/LanguageContext'
import { useTasks } from '../../lib/hooks'
import type { Task } from '../../types'

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  beklemede:     { color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200' },
  devam_ediyor:  { color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200'  },
  tamamlandi:    { color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200' },
  iptal:         { color: 'text-slate-400',  bg: 'bg-slate-50',  border: 'border-slate-200' },
  gecikti:       { color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200'   },
}

const PRIORITY_COLORS: Record<string, string> = {
  dusuk:  'bg-slate-100 text-slate-600',
  normal: 'bg-blue-100 text-blue-700',
  yuksek: 'bg-amber-100 text-amber-700',
  kritik: 'bg-red-100 text-red-700',
}

/* ---------- Memoized row ---------- */
const TaskRow = memo(function TaskRow({
  task,
  onClick,
  lang,
}: {
  task: Task
  onClick: (id: string) => void
  lang: string
}) {
  const { t } = useLanguage()
  const sc = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.beklemede
  const checkDone = task.checklist?.filter(c => c.completed).length ?? 0
  const checkTotal = task.checklist?.length ?? 0

  return (
    <button
      type="button"
      onClick={() => onClick(task.id)}
      className="w-full bg-white rounded-xl border border-slate-200 p-4 text-left active:scale-[0.98] transition-transform"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{task.title}</p>
          {task.department && (
            <p className="text-xs text-slate-400 mt-0.5">{task.department.name}</p>
          )}
        </div>
        <ChevronRight size={16} className="text-slate-300 flex-shrink-0 mt-1" />
      </div>

      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
        <span className={clsx('text-[10px] font-bold uppercase px-2 py-0.5 rounded-full', sc.bg, sc.color, sc.border, 'border')}>
          {t(`status_${task.status}` as any)}
        </span>
        <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-full', PRIORITY_COLORS[task.priority])}>
          {t(`priority_${task.priority}` as any)}
        </span>
        {checkTotal > 0 && (
          <span className="text-[10px] text-slate-500 font-medium flex items-center gap-0.5">
            <CheckCircle2 size={10} />
            {checkDone}/{checkTotal}
          </span>
        )}
        {task.dueDate && (
          <span className="text-[10px] text-slate-400 flex items-center gap-0.5 ml-auto">
            <Clock size={10} />
            {new Date(task.dueDate).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: 'short' })}
          </span>
        )}
      </div>
    </button>
  )
})

export default function MobileTasks() {
  const { t, lang } = useLanguage()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<string>('all')
  const { tasks, loading, refetch } = useTasks({
    status: filter === 'all' ? undefined : filter === 'active' ? 'devam_ediyor' : filter === 'pending' ? 'beklemede' : 'tamamlandi',
    pageSize: 50,
  })

  const filters = [
    { key: 'all',     label: t('m_tasks_all') },
    { key: 'pending', label: t('m_tasks_pending') },
    { key: 'active',  label: t('m_tasks_active') },
    { key: 'done',    label: t('m_tasks_done') },
  ]

  return (
    <div className="p-[var(--space-page)] space-y-3">
      <h1 className="text-lg font-bold text-slate-900">{t('m_tasks_title')}</h1>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
        {filters.map(f => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={clsx(
              'flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap min-h-[var(--touch-min)]',
              filter === f.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Task list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="text-cyan-500 animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardList size={36} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-medium">{t('m_tasks_empty')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              onClick={(id) => navigate(`/m/gorev/${id}`)}
              lang={lang}
            />
          ))}
        </div>
      )}
    </div>
  )
}
