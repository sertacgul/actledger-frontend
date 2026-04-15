import type {
  CustomAttribute,
  AttributeRule,
  AttributeCondition,
  AttributeField,
  AttributeOperator,
  Task,
} from '../types'

const KEY = 'actledger:attributes'

// ── Storage helpers ──────────────────────────────────────────────────────────
export function listAttributes(): CustomAttribute[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    return JSON.parse(raw) as CustomAttribute[]
  } catch {
    return []
  }
}

function persist(list: CustomAttribute[]) {
  localStorage.setItem(KEY, JSON.stringify(list))
}

export function getAttribute(id: string): CustomAttribute | undefined {
  return listAttributes().find(a => a.id === id)
}

export function saveAttribute(attr: CustomAttribute): void {
  const list = listAttributes()
  const idx = list.findIndex(a => a.id === attr.id)
  if (idx >= 0) list[idx] = attr
  else list.push(attr)
  persist(list)
}

export function deleteAttribute(id: string): void {
  persist(listAttributes().filter(a => a.id !== id))
}

// ── Constructors ─────────────────────────────────────────────────────────────
export function newAttributeId(): string {
  return `attr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

export function newRuleId(): string {
  return `rule_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

export function newConditionId(): string {
  return `cond_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

export function emptyCondition(): AttributeCondition {
  return { id: newConditionId(), field: 'priority', operator: 'eq', value: 'kritik' }
}

export function emptyRule(): AttributeRule {
  return {
    id: newRuleId(),
    conditions: [emptyCondition()],
    outputLabel: 'Etiket',
    outputColor: '#6366f1',
  }
}

export function emptyAttribute(): CustomAttribute {
  return {
    id: newAttributeId(),
    name: '',
    description: '',
    rules: [emptyRule()],
    defaultLabel: 'Diğer',
    defaultColor: '#a1a1aa',
    createdAt: new Date().toISOString(),
  }
}

// ── Field metadata ───────────────────────────────────────────────────────────
export const FIELD_LABELS: Record<AttributeField, string> = {
  status:       'Durum',
  priority:     'Öncelik',
  type:         'Tip',
  departmentId: 'Departman ID',
  assigneeId:   'Atanan Kişi ID',
  overdue:      'Gecikti mi?',
  ageDays:      'Oluşturulduğundan beri (gün)',
  dueInDays:    'Bitiş tarihine kadar (gün)',
  tagContains:  'Etiket içerir',
}

export const OPERATOR_LABELS: Record<AttributeOperator, string> = {
  eq:  '=',
  neq: '≠',
  gt:  '>',
  lt:  '<',
  gte: '≥',
  lte: '≤',
}

const NUMERIC_FIELDS: AttributeField[] = ['ageDays', 'dueInDays']
const BOOLEAN_FIELDS: AttributeField[] = ['overdue']

export function isNumericField(f: AttributeField): boolean {
  return NUMERIC_FIELDS.includes(f)
}
export function isBooleanField(f: AttributeField): boolean {
  return BOOLEAN_FIELDS.includes(f)
}

// ── Field value extractor ────────────────────────────────────────────────────
function extractFieldValue(task: Task, field: AttributeField): string | number | boolean {
  const now = Date.now()
  switch (field) {
    case 'status':       return task.status
    case 'priority':     return task.priority
    case 'type':         return task.type
    case 'departmentId': return task.departmentId
    case 'assigneeId':   return task.assigneeId
    case 'overdue': {
      if (task.status === 'tamamlandi') return false
      if (!task.dueDate) return false
      return new Date(task.dueDate).getTime() < now
    }
    case 'ageDays': {
      if (!task.createdAt) return 0
      return Math.floor((now - new Date(task.createdAt).getTime()) / 86400000)
    }
    case 'dueInDays': {
      if (!task.dueDate) return 0
      return Math.floor((new Date(task.dueDate).getTime() - now) / 86400000)
    }
    case 'tagContains':  return (task.tags ?? []).join(',').toLowerCase()
  }
}

// ── Single condition evaluator ───────────────────────────────────────────────
function evaluateCondition(task: Task, cond: AttributeCondition): boolean {
  const actual = extractFieldValue(task, cond.field)

  if (cond.field === 'tagContains') {
    const target = cond.value.toLowerCase()
    if (cond.operator === 'eq')  return String(actual).includes(target)
    if (cond.operator === 'neq') return !String(actual).includes(target)
    return false
  }

  if (isBooleanField(cond.field)) {
    const target = cond.value === 'true'
    if (cond.operator === 'eq')  return actual === target
    if (cond.operator === 'neq') return actual !== target
    return false
  }

  if (isNumericField(cond.field)) {
    const target = Number(cond.value)
    const a = Number(actual)
    if (Number.isNaN(target)) return false
    switch (cond.operator) {
      case 'eq':  return a === target
      case 'neq': return a !== target
      case 'gt':  return a > target
      case 'lt':  return a < target
      case 'gte': return a >= target
      case 'lte': return a <= target
    }
  }

  // String field
  switch (cond.operator) {
    case 'eq':  return String(actual) === cond.value
    case 'neq': return String(actual) !== cond.value
    default:    return false
  }
}

// ── Attribute evaluator ──────────────────────────────────────────────────────
export interface EvaluatedAttribute {
  attributeId: string
  attributeName: string
  label: string
  color: string
}

export function evaluateAttribute(attribute: CustomAttribute, task: Task): EvaluatedAttribute {
  for (const rule of attribute.rules) {
    if (rule.conditions.length === 0) continue
    const allMatch = rule.conditions.every(c => evaluateCondition(task, c))
    if (allMatch) {
      return {
        attributeId:   attribute.id,
        attributeName: attribute.name,
        label:         rule.outputLabel,
        color:         rule.outputColor,
      }
    }
  }
  return {
    attributeId:   attribute.id,
    attributeName: attribute.name,
    label:         attribute.defaultLabel,
    color:         attribute.defaultColor,
  }
}

export function evaluateAllAttributes(task: Task): EvaluatedAttribute[] {
  return listAttributes().map(a => evaluateAttribute(a, task))
}
