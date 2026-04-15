import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, X, Check, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import clsx from 'clsx'
import {
  listAttributes, saveAttribute, deleteAttribute, emptyAttribute, emptyRule, emptyCondition,
  evaluateAttribute, FIELD_LABELS, OPERATOR_LABELS, isNumericField, isBooleanField,
} from '../../lib/attributesStore'
import type {
  CustomAttribute, AttributeRule, AttributeCondition, AttributeField, AttributeOperator,
  Task, TaskStatus, TaskPriority, TaskType,
} from '../../types'
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, TASK_TYPE_LABELS } from '../../types'
import DraggableModal from '../ui/DraggableModal'

const PRESET_COLORS = [
  '#6366f1', '#2563eb', '#0891b2', '#059669',
  '#ca8a04', '#ea580c', '#dc2626', '#9333ea',
  '#64748b', '#0f172a',
]

const FIELDS: AttributeField[] = [
  'status', 'priority', 'type', 'overdue', 'ageDays', 'dueInDays', 'tagContains',
]

const STRING_OPERATORS: AttributeOperator[] = ['eq', 'neq']
const NUMBER_OPERATORS: AttributeOperator[] = ['eq', 'neq', 'gt', 'lt', 'gte', 'lte']

/* ── Value input - adapts to selected field ── */
function ValueInput({
  field, value, onChange,
}: { field: AttributeField; value: string; onChange: (v: string) => void }) {
  if (isBooleanField(field)) {
    return (
      <select className="select text-[11px] flex-1" value={value} onChange={e => onChange(e.target.value)}>
        <option value="true">Evet</option>
        <option value="false">Hayır</option>
      </select>
    )
  }
  if (isNumericField(field)) {
    return (
      <input type="number" className="input text-[11px] flex-1" value={value}
        onChange={e => onChange(e.target.value)} placeholder="0" />
    )
  }
  if (field === 'status') {
    return (
      <select className="select text-[11px] flex-1" value={value} onChange={e => onChange(e.target.value)}>
        {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
    )
  }
  if (field === 'priority') {
    return (
      <select className="select text-[11px] flex-1" value={value} onChange={e => onChange(e.target.value)}>
        {Object.entries(TASK_PRIORITY_LABELS).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
    )
  }
  if (field === 'type') {
    return (
      <select className="select text-[11px] flex-1" value={value} onChange={e => onChange(e.target.value)}>
        {Object.entries(TASK_TYPE_LABELS).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
    )
  }
  return (
    <input type="text" className="input text-[11px] flex-1" value={value}
      onChange={e => onChange(e.target.value)} placeholder="metin…" />
  )
}

/* ── Condition row ── */
function ConditionRow({
  cond, onChange, onRemove,
}: { cond: AttributeCondition; onChange: (next: AttributeCondition) => void; onRemove: () => void }) {
  const operators = isNumericField(cond.field) ? NUMBER_OPERATORS : STRING_OPERATORS

  const handleFieldChange = (f: AttributeField) => {
    let nextValue = cond.value
    let nextOp: AttributeOperator = cond.operator
    if (isBooleanField(f)) nextValue = 'true'
    else if (isNumericField(f)) { if (Number.isNaN(Number(nextValue))) nextValue = '0' }
    else if (f === 'status') nextValue = 'beklemede'
    else if (f === 'priority') nextValue = 'kritik'
    else if (f === 'type') nextValue = 'standart'
    if (!isNumericField(f) && !STRING_OPERATORS.includes(nextOp)) nextOp = 'eq'
    onChange({ ...cond, field: f, operator: nextOp, value: nextValue })
  }

  return (
    <div className="flex items-center gap-1.5">
      <select className="select text-[11px] flex-1" value={cond.field}
        onChange={e => handleFieldChange(e.target.value as AttributeField)}>
        {FIELDS.map(f => <option key={f} value={f}>{FIELD_LABELS[f]}</option>)}
      </select>
      <select className="select text-[11px] w-12 flex-shrink-0" value={cond.operator}
        onChange={e => onChange({ ...cond, operator: e.target.value as AttributeOperator })}>
        {operators.map(o => <option key={o} value={o}>{OPERATOR_LABELS[o]}</option>)}
      </select>
      <ValueInput field={cond.field} value={cond.value}
        onChange={v => onChange({ ...cond, value: v })} />
      <button type="button" onClick={onRemove}
        className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0">
        <X size={11} />
      </button>
    </div>
  )
}

/* ── Rule editor ── */
function RuleEditor({
  rule, index, onChange, onRemove, onMoveUp, onMoveDown, canMoveUp, canMoveDown,
}: {
  rule: AttributeRule
  index: number
  onChange: (next: AttributeRule) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
}) {
  return (
    <div className="border border-zinc-200 rounded-lg p-3 bg-white space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold text-zinc-400 uppercase">Kural {index + 1}</span>
        <div className="flex-1" />
        <button type="button" disabled={!canMoveUp} onClick={onMoveUp}
          className="w-5 h-5 rounded text-zinc-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-zinc-400">
          <ChevronUp size={12} />
        </button>
        <button type="button" disabled={!canMoveDown} onClick={onMoveDown}
          className="w-5 h-5 rounded text-zinc-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-zinc-400">
          <ChevronDown size={12} />
        </button>
        <button type="button" onClick={onRemove}
          className="w-5 h-5 rounded text-zinc-400 hover:text-red-600">
          <Trash2 size={11} />
        </button>
      </div>

      {/* Conditions (joined with AND) */}
      <div className="space-y-1.5">
        {rule.conditions.map((c, i) => (
          <div key={c.id} className="space-y-1.5">
            {i > 0 && <div className="text-[9px] font-bold text-indigo-500 ml-1">VE</div>}
            <ConditionRow
              cond={c}
              onChange={next => onChange({ ...rule, conditions: rule.conditions.map(x => x.id === c.id ? next : x) })}
              onRemove={() => onChange({ ...rule, conditions: rule.conditions.filter(x => x.id !== c.id) })}
            />
          </div>
        ))}
        <button type="button"
          onClick={() => onChange({ ...rule, conditions: [...rule.conditions, emptyCondition()] })}
          className="text-[10px] text-indigo-600 hover:text-indigo-700 font-medium">
          + Koşul ekle
        </button>
      </div>

      {/* Output */}
      <div className="pt-2 border-t border-zinc-100 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-zinc-500 uppercase">Sonuç:</span>
          <input className="input text-[11px] flex-1" placeholder="Etiket adı…"
            value={rule.outputLabel}
            onChange={e => onChange({ ...rule, outputLabel: e.target.value })} />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {PRESET_COLORS.map(c => (
            <button key={c} type="button" onClick={() => onChange({ ...rule, outputColor: c })}
              className={clsx('w-5 h-5 rounded-full transition-transform',
                rule.outputColor === c ? 'ring-2 ring-offset-1 ring-indigo-500 scale-110' : 'hover:scale-110')}
              style={{ background: c }} />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Attribute form ── */
function AttributeForm({
  initial, allTasks, onSave, onCancel,
}: {
  initial: CustomAttribute
  allTasks: Task[]
  onSave: (attr: CustomAttribute) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<CustomAttribute>(initial)

  const updateRule = (id: string, next: AttributeRule) =>
    setDraft(d => ({ ...d, rules: d.rules.map(r => r.id === id ? next : r) }))
  const removeRule = (id: string) =>
    setDraft(d => ({ ...d, rules: d.rules.filter(r => r.id !== id) }))
  const moveRule = (id: string, dir: -1 | 1) =>
    setDraft(d => {
      const idx = d.rules.findIndex(r => r.id === id)
      if (idx < 0) return d
      const target = idx + dir
      if (target < 0 || target >= d.rules.length) return d
      const next = [...d.rules]
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return { ...d, rules: next }
    })

  // Live preview against first 50 tasks
  const previewSample = allTasks.slice(0, 50)
  const buckets: Record<string, { count: number; color: string }> = {}
  for (const t of previewSample) {
    const ev = evaluateAttribute(draft, t)
    if (!buckets[ev.label]) buckets[ev.label] = { count: 0, color: ev.color }
    buckets[ev.label].count += 1
  }
  const previewEntries = Object.entries(buckets).sort(([, a], [, b]) => b.count - a.count)

  const canSave = draft.name.trim().length > 0 && draft.rules.length > 0

  return (
    <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
      {/* Name + description */}
      <div>
        <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Özellik Adı *</label>
        <input className="input" placeholder="ör. Risk Bandı, Aciliyet Seviyesi…"
          value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
      </div>
      <div>
        <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Açıklama</label>
        <input className="input" placeholder="İsteğe bağlı…"
          value={draft.description ?? ''} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} />
      </div>

      {/* Rules */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Kurallar</label>
          <span className="text-[9px] text-zinc-400">İlk eşleşen kural geçerli</span>
        </div>
        <div className="space-y-2">
          {draft.rules.map((r, i) => (
            <RuleEditor
              key={r.id}
              rule={r}
              index={i}
              canMoveUp={i > 0}
              canMoveDown={i < draft.rules.length - 1}
              onChange={next => updateRule(r.id, next)}
              onRemove={() => removeRule(r.id)}
              onMoveUp={() => moveRule(r.id, -1)}
              onMoveDown={() => moveRule(r.id, 1)}
            />
          ))}
        </div>
        <button type="button"
          onClick={() => setDraft(d => ({ ...d, rules: [...d.rules, emptyRule()] }))}
          className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded border border-dashed border-zinc-300 text-[11px] font-medium text-zinc-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
          <Plus size={11} /> Kural ekle
        </button>
      </div>

      {/* Default */}
      <div className="border-t border-zinc-100 pt-3">
        <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
          Varsayılan (hiçbir kural eşleşmezse)
        </label>
        <div className="flex items-center gap-1.5 mb-2">
          <input className="input text-[11px] flex-1" placeholder="Diğer"
            value={draft.defaultLabel}
            onChange={e => setDraft(d => ({ ...d, defaultLabel: e.target.value }))} />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {PRESET_COLORS.map(c => (
            <button key={c} type="button" onClick={() => setDraft(d => ({ ...d, defaultColor: c }))}
              className={clsx('w-5 h-5 rounded-full transition-transform',
                draft.defaultColor === c ? 'ring-2 ring-offset-1 ring-indigo-500 scale-110' : 'hover:scale-110')}
              style={{ background: c }} />
          ))}
        </div>
      </div>

      {/* Preview */}
      {previewSample.length > 0 && (
        <div className="border-t border-zinc-100 pt-3">
          <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
            Önizleme ({previewSample.length} görev)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {previewEntries.map(([label, info]) => (
              <span key={label}
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                style={{ background: info.color }}>
                {label} · {info.count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-zinc-100">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1 justify-center text-[12px]">İptal</button>
        <button type="button" disabled={!canSave} onClick={() => onSave(draft)}
          className="btn-primary flex-1 justify-center text-[12px]">
          <Check size={12} /> Kaydet
        </button>
      </div>
    </div>
  )
}

/* ── Attribute row ── */
function AttributeRow({
  attr, onEdit, onDelete,
}: { attr: CustomAttribute; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors group">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: attr.defaultColor + '22', color: attr.defaultColor }}>
        <Sparkles size={13} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-zinc-800 truncate">{attr.name}</p>
        <p className="text-[11px] text-zinc-400 truncate">
          {attr.rules.length} kural · varsayılan: {attr.defaultLabel}
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button type="button" onClick={onEdit}
          className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
          <Pencil size={11} />
        </button>
        <button type="button" onClick={onDelete}
          className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors">
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  )
}

/* ── Main modal ── */
interface Props {
  onClose: () => void
  allTasks: Task[]
  onChange?: () => void
}

export default function AttributesManager({ onClose, allTasks, onChange }: Props) {
  const [attrs, setAttrs] = useState<CustomAttribute[]>([])
  const [editing, setEditing] = useState<CustomAttribute | null>(null)

  const reload = () => setAttrs(listAttributes())
  useEffect(() => { reload() }, [])

  const handleSave = (attr: CustomAttribute) => {
    saveAttribute(attr)
    reload()
    setEditing(null)
    onChange?.()
  }

  const handleDelete = (id: string) => {
    if (!confirm('Bu özelliği silmek istediğinizden emin misiniz?')) return
    deleteAttribute(id)
    reload()
    onChange?.()
  }

  return (
    <DraggableModal
      title="Özellikler"
      icon={<Sparkles size={13} />}
      onClose={onClose}
      width={520}
    >
      {editing ? (
        <AttributeForm
          initial={editing}
          allTasks={allTasks}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <div className="py-2">
          {attrs.length === 0 ? (
            <div className="text-center py-10">
              <Sparkles size={24} className="text-zinc-300 mx-auto mb-2" />
              <p className="text-[13px] text-zinc-500 font-medium">Henüz özellik yok</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">Görevlerinizi etiketlemek için kural-tabanlı özellikler oluşturun</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {attrs.map(a => (
                <AttributeRow
                  key={a.id}
                  attr={a}
                  onEdit={() => setEditing(a)}
                  onDelete={() => handleDelete(a.id)}
                />
              ))}
            </div>
          )}
          <div className="p-4 border-t border-zinc-100">
            <button type="button"
              onClick={() => setEditing(emptyAttribute())}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-zinc-300 text-[12px] font-medium text-zinc-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
              <Plus size={13} /> Yeni Özellik Oluştur
            </button>
          </div>
        </div>
      )}
    </DraggableModal>
  )
}

// Re-export so callers don't need a deep import
export { listAttributes, evaluateAttribute }
// Suppress unused-import warnings for type-only references kept for documentation
export type { TaskStatus, TaskPriority, TaskType }
