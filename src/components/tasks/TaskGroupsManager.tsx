import { useState } from 'react'
import { Plus, Pencil, Trash2, X, Check, Tag, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import {
  useTaskGroups, createTaskGroup, updateTaskGroup,
  deleteTaskGroup, addTasksToGroup, removeTaskFromGroup,
} from '../../lib/hooks'
import type { TaskGroup, Task } from '../../types'
import DraggableModal from '../ui/DraggableModal'

const PRESET_COLORS = [
  '#6366f1', '#2563eb', '#0891b2', '#059669',
  '#ca8a04', '#ea580c', '#dc2626', '#9333ea',
  '#64748b', '#0f172a',
]

/* ── Group form ── */
function GroupForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: Partial<TaskGroup>
  onSave: (name: string, color: string, description: string) => void
  onCancel: () => void
  saving: boolean
}) {
  const [name, setName]   = useState(initial?.name ?? '')
  const [color, setColor] = useState(initial?.color ?? '#6366f1')
  const [desc,  setDesc]  = useState(initial?.description ?? '')

  return (
    <div className="space-y-3 p-4 bg-zinc-50 rounded-lg border border-zinc-200">
      <div>
        <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Grup Adı *</label>
        <input className="input" placeholder="ör. Kuzey Sahası, Q2 Hedefleri…" value={name}
          onChange={e => setName(e.target.value)} />
      </div>
      <div>
        <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Açıklama</label>
        <input className="input" placeholder="İsteğe bağlı…" value={desc}
          onChange={e => setDesc(e.target.value)} />
      </div>
      <div>
        <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Renk</label>
        <div className="flex items-center gap-1.5 flex-wrap">
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={clsx(
                'w-6 h-6 rounded-full transition-transform',
                color === c ? 'ring-2 ring-offset-1 ring-indigo-500 scale-110' : 'hover:scale-110'
              )}
              style={{ background: c }}
            />
          ))}
          <input type="color" value={color} onChange={e => setColor(e.target.value)}
            className="w-6 h-6 rounded-full border border-zinc-200 cursor-pointer overflow-hidden" />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1 justify-center text-[12px]">İptal</button>
        <button type="button" disabled={!name.trim() || saving}
          onClick={() => onSave(name.trim(), color, desc)}
          className="btn-primary flex-1 justify-center text-[12px]">
          <Check size={12} /> {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </div>
  )
}

/* ── Group row ── */
function GroupRow({
  group,
  onEdit,
  onDelete,
  onSelect,
}: {
  group: TaskGroup
  onEdit: () => void
  onDelete: () => void
  onSelect: () => void
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors group">
      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: group.color }} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-zinc-800 truncate">{group.name}</p>
        {group.description && (
          <p className="text-[11px] text-zinc-400 truncate">{group.description}</p>
        )}
      </div>
      <span className="text-[11px] text-zinc-400 flex-shrink-0">{group.taskCount} görev</span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button type="button" onClick={onEdit}
          className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
          <Pencil size={11} />
        </button>
        <button type="button" onClick={onDelete}
          className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors">
          <Trash2 size={11} />
        </button>
        <button type="button" onClick={onSelect}
          className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
          <ChevronRight size={11} />
        </button>
      </div>
    </div>
  )
}

/* ── Task assignment panel ── */
function GroupTaskPanel({
  group,
  allTasks,
  onClose,
  onRefresh,
}: {
  group: TaskGroup
  allTasks: Task[]
  onClose: () => void
  onRefresh: () => void
}) {
  const [saving, setSaving] = useState(false)

  const groupTaskIds = new Set(
    allTasks.filter(t => t.groups?.some(g => g.id === group.id)).map(t => t.id)
  )
  const [selected, setSelected] = useState<Set<string>>(new Set(groupTaskIds))

  const toggle = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const handleSave = async () => {
    setSaving(true)
    try {
      const toAdd    = [...selected].filter(id => !groupTaskIds.has(id))
      const toRemove = [...groupTaskIds].filter(id => !selected.has(id))
      if (toAdd.length)    await addTasksToGroup(group.id, toAdd)
      for (const id of toRemove) await removeTaskFromGroup(group.id, id)
      onRefresh()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-4 pt-2">
        <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
          <X size={14} />
        </button>
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: group.color }} />
        <p className="text-[13px] font-semibold text-zinc-800">{group.name} - Görev Ata</p>
      </div>
      <div className="max-h-72 overflow-y-auto divide-y divide-zinc-50">
        {allTasks.length === 0 ? (
          <p className="text-[12px] text-zinc-400 text-center py-6">Görev bulunamadı</p>
        ) : allTasks.map(t => (
          <label key={t.id}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 cursor-pointer">
            <input type="checkbox" className="rounded border-zinc-300 text-indigo-600"
              checked={selected.has(t.id)}
              onChange={() => toggle(t.id)} />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-zinc-800 truncate">{t.title}</p>
              <p className="text-[10px] text-zinc-400">{t.status} · {t.priority}</p>
            </div>
          </label>
        ))}
      </div>
      <div className="flex gap-2 px-4 pb-4">
        <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center text-[12px]">İptal</button>
        <button type="button" disabled={saving} onClick={handleSave}
          className="btn-primary flex-1 justify-center text-[12px]">
          <Check size={12} /> {saving ? 'Kaydediliyor…' : 'Uygula'}
        </button>
      </div>
    </div>
  )
}

/* ── Main modal ── */
interface Props {
  onClose: () => void
  allTasks: Task[]
}

export default function TaskGroupsManager({ onClose, allTasks }: Props) {
  const { groups, loading, refetch } = useTaskGroups()
  const [creating, setCreating]   = useState(false)
  const [editId,   setEditId]     = useState<string | null>(null)
  const [assignId, setAssignId]   = useState<string | null>(null)
  const [saving,   setSaving]     = useState(false)
  const [err,      setErr]        = useState<string | null>(null)

  const handleCreate = async (name: string, color: string, description: string) => {
    setSaving(true); setErr(null)
    try {
      await createTaskGroup({ name, color, description: description || undefined })
      refetch(); setCreating(false)
    } catch (e: any) { setErr(e.message) } finally { setSaving(false) }
  }

  const handleUpdate = async (id: string, name: string, color: string, description: string) => {
    setSaving(true); setErr(null)
    try {
      await updateTaskGroup(id, { name, color, description: description || undefined })
      refetch(); setEditId(null)
    } catch (e: any) { setErr(e.message) } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu grubu silmek istediğinizden emin misiniz?')) return
    try { await deleteTaskGroup(id); refetch() } catch (e: any) { setErr(e.message) }
  }

  const assignGroup = groups.find(g => g.id === assignId)

  return (
    <DraggableModal
      title="Gruplar"
      icon={<Tag size={13} />}
      onClose={onClose}
      width={480}
    >
      {assignGroup ? (
        <GroupTaskPanel
          group={assignGroup}
          allTasks={allTasks}
          onClose={() => setAssignId(null)}
          onRefresh={refetch}
        />
      ) : (
        <div className="py-2">
          {/* Error */}
          {err && (
            <div className="mx-4 mb-3 px-3 py-2 rounded border border-red-200 bg-red-50 text-[11px] text-red-600">{err}</div>
          )}

          {/* Group list */}
          {loading ? (
            <div className="p-4 space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-10 animate-pulse bg-zinc-100 rounded" />)}
            </div>
          ) : groups.length === 0 && !creating ? (
            <div className="text-center py-10">
              <Tag size={24} className="text-zinc-300 mx-auto mb-2" />
              <p className="text-[13px] text-zinc-500 font-medium">Henüz grup yok</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">Görevlerinizi organize etmek için grup oluşturun</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {groups.map(g => (
                editId === g.id ? (
                  <div key={g.id} className="p-4">
                    <GroupForm
                      initial={g}
                      onSave={(name, color, desc) => handleUpdate(g.id, name, color, desc)}
                      onCancel={() => setEditId(null)}
                      saving={saving}
                    />
                  </div>
                ) : (
                  <GroupRow
                    key={g.id}
                    group={g}
                    onEdit={() => { setEditId(g.id); setCreating(false) }}
                    onDelete={() => handleDelete(g.id)}
                    onSelect={() => setAssignId(g.id)}
                  />
                )
              ))}
            </div>
          )}

          {/* Create form */}
          {creating && (
            <div className="p-4 border-t border-zinc-100">
              <GroupForm
                onSave={handleCreate}
                onCancel={() => setCreating(false)}
                saving={saving}
              />
            </div>
          )}

          {/* Add button */}
          {!creating && (
            <div className="p-4 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => { setCreating(true); setEditId(null) }}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-zinc-300 text-[12px] font-medium text-zinc-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
              >
                <Plus size={13} /> Yeni Grup Oluştur
              </button>
            </div>
          )}
        </div>
      )}
    </DraggableModal>
  )
}
