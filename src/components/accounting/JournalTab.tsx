import { useState } from 'react'
import { Plus, Search, Eye, Check, X, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { useJournalEntries, useAccounts, createJournalEntry, approveJournalEntry, cancelJournalEntry } from '../../lib/erp-hooks'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import DraggableModal from '../ui/DraggableModal'
import type { JournalEntry, JournalStatus } from '../../types/erp'
import { JOURNAL_STATUS_LABELS, JOURNAL_STATUS_STYLES, TRY_FMT, DATE_FMT } from '../../types/erp'

const MANAGER_ROLES = ['PLATFORM_ADMIN', 'SUPER_ADMIN', 'GENEL_MUDUR', 'GM_YARDIMCISI', 'DIREKTOR', 'MUDUR']

interface JournalLineForm { accountCode: string; debit: string; credit: string; description: string }
const EMPTY_LINE: JournalLineForm = { accountCode: '', debit: '0', credit: '0', description: '' }

export default function JournalTab() {
  const { user } = useAuth()
  const { lang } = useLanguage()
  const canManage = MANAGER_ROLES.includes(user?.role?.toUpperCase() ?? '')
  const tr = lang === 'tr'

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const { entries, loading, refetch } = useJournalEntries({ search: search || undefined, status: statusFilter || undefined })
  const { accounts } = useAccounts()
  const leafAccounts = accounts.filter(a => a.isLeaf)

  const [creating, setCreating] = useState(false)
  const [viewing, setViewing] = useState<JournalEntry | null>(null)
  const [saving, setSaving] = useState(false)

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [lines, setLines] = useState<JournalLineForm[]>([{ ...EMPTY_LINE }, { ...EMPTY_LINE }])

  const addLine = () => setLines([...lines, { ...EMPTY_LINE }])
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i))
  const updateLine = (i: number, field: keyof JournalLineForm, value: string) => {
    const next = [...lines]
    next[i] = { ...next[i], [field]: value }
    setLines(next)
  }

  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0)
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0)
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01

  const handleCreate = async () => {
    if (!balanced) { alert(tr ? 'Borc ve alacak toplamlar esit olmali!' : 'Debit and credit totals must be equal!'); return }
    setSaving(true)
    try {
      await createJournalEntry({
        date, description,
        lines: lines.filter(l => l.accountCode).map(l => ({
          accountCode: l.accountCode,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
          description: l.description || undefined,
        })),
      })
      setCreating(false)
      setDescription('')
      setLines([{ ...EMPTY_LINE }, { ...EMPTY_LINE }])
      refetch()
    } catch (e: any) { alert(e.message) }
    finally { setSaving(false) }
  }

  const handleAction = async (entry: JournalEntry, action: 'approve' | 'cancel') => {
    try {
      if (action === 'approve') await approveJournalEntry(entry.id)
      else await cancelJournalEntry(entry.id)
      setViewing(null)
      refetch()
    } catch (e: any) { alert(e.message) }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-4)]" />
          <input className="input pl-9 w-full" placeholder={tr ? 'Yevmiye ara...' : 'Search entries...'} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">{tr ? 'Tum Durumlar' : 'All'}</option>
          {Object.entries(JOURNAL_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {canManage && (
          <button onClick={() => setCreating(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600">
            <Plus className="w-4 h-4" />
            {tr ? 'Yeni Yevmiye' : 'New Entry'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--text-3)]">{tr ? 'Yukleniyor...' : 'Loading...'}</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-3)]">{tr ? 'Kayit bulunamadi' : 'No entries found'}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Fis No' : 'Entry #'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Tarih' : 'Date'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Aciklama' : 'Description'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Durum' : 'Status'}</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Borc' : 'Debit'}</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Alacak' : 'Credit'}</th>
                <th className="text-right px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id} className="border-b border-[var(--border)] hover:bg-[var(--surface)] cursor-pointer" onClick={() => setViewing(e)}>
                  <td className="px-4 py-3 font-mono text-[var(--text-1)]">{e.entryNumber}</td>
                  <td className="px-4 py-3 text-[var(--text-2)]">{DATE_FMT(e.date)}</td>
                  <td className="px-4 py-3 text-[var(--text-2)] max-w-[200px] truncate">{e.description}</td>
                  <td className="px-4 py-3"><span className={clsx('text-xs px-2 py-0.5 rounded-full border', JOURNAL_STATUS_STYLES[e.status])}>{JOURNAL_STATUS_LABELS[e.status]}</span></td>
                  <td className="px-4 py-3 text-right font-mono text-[var(--text-1)]">{TRY_FMT(e.totalDebit)}</td>
                  <td className="px-4 py-3 text-right font-mono text-[var(--text-1)]">{TRY_FMT(e.totalCredit)}</td>
                  <td className="px-4 py-3 text-right"><Eye className="w-4 h-4 text-[var(--text-4)]" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <DraggableModal
          title={tr ? 'Yeni Yevmiye Fisi' : 'New Journal Entry'}
          onClose={() => setCreating(false)}
          width={720}
          footer={
            <div className="flex items-center justify-between">
              <div className="flex gap-4 text-sm">
                <span className="text-[var(--text-2)]">{tr ? 'Borc' : 'Debit'}: <span className="font-mono font-medium">{TRY_FMT(totalDebit)}</span></span>
                <span className="text-[var(--text-2)]">{tr ? 'Alacak' : 'Credit'}: <span className="font-mono font-medium">{TRY_FMT(totalCredit)}</span></span>
                {!balanced && <span className="text-red-500 text-xs">{tr ? 'Dengesiz!' : 'Unbalanced!'}</span>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setCreating(false)} className="px-4 py-2 rounded-lg text-sm text-[var(--text-2)] hover:bg-[var(--surface)]">{tr ? 'Iptal' : 'Cancel'}</button>
                <button onClick={handleCreate} disabled={saving || !description || !balanced} className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-50">
                  {saving ? (tr ? 'Kaydediliyor...' : 'Saving...') : (tr ? 'Kaydet' : 'Save')}
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 p-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Tarih *' : 'Date *'}</label>
                <input className="input w-full" type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Aciklama *' : 'Description *'}</label>
                <input className="input w-full" value={description} onChange={e => setDescription(e.target.value)} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-[var(--text-2)]">{tr ? 'Satirlar' : 'Lines'}</label>
                <button onClick={addLine} className="text-xs text-emerald-500 hover:text-emerald-600 font-medium">+ {tr ? 'Satir Ekle' : 'Add Line'}</button>
              </div>
              <div className="space-y-2">
                {lines.map((l, i) => (
                  <div key={i} className="grid grid-cols-[1fr_100px_100px_1fr_32px] gap-2 items-end">
                    <div>
                      {i === 0 && <label className="text-[10px] text-[var(--text-3)] mb-0.5 block">{tr ? 'Hesap' : 'Account'}</label>}
                      <select className="select w-full text-xs" value={l.accountCode} onChange={e => updateLine(i, 'accountCode', e.target.value)}>
                        <option value="">{tr ? 'Hesap sec...' : 'Select...'}</option>
                        {leafAccounts.map(a => <option key={a.code} value={a.code}>{a.code} - {a.name}</option>)}
                      </select>
                    </div>
                    <div>
                      {i === 0 && <label className="text-[10px] text-[var(--text-3)] mb-0.5 block">{tr ? 'Borc' : 'Debit'}</label>}
                      <input className="input w-full" type="number" value={l.debit} onChange={e => updateLine(i, 'debit', e.target.value)} />
                    </div>
                    <div>
                      {i === 0 && <label className="text-[10px] text-[var(--text-3)] mb-0.5 block">{tr ? 'Alacak' : 'Credit'}</label>}
                      <input className="input w-full" type="number" value={l.credit} onChange={e => updateLine(i, 'credit', e.target.value)} />
                    </div>
                    <div>
                      {i === 0 && <label className="text-[10px] text-[var(--text-3)] mb-0.5 block">{tr ? 'Aciklama' : 'Note'}</label>}
                      <input className="input w-full" value={l.description} onChange={e => updateLine(i, 'description', e.target.value)} />
                    </div>
                    <button onClick={() => removeLine(i)} className="p-1.5 rounded-md hover:bg-red-50 text-[var(--text-4)] hover:text-red-500" disabled={lines.length <= 2}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DraggableModal>
      )}

      {viewing && (
        <DraggableModal
          title={viewing.entryNumber}
          subtitle={viewing.description}
          onClose={() => setViewing(null)}
          width={640}
          footer={
            viewing.status === 'TASLAK' && canManage ? (
              <div className="flex gap-2 justify-end">
                <button onClick={() => handleAction(viewing, 'approve')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-sm hover:bg-emerald-600">
                  <Check className="w-3.5 h-3.5" />{tr ? 'Onayla' : 'Approve'}
                </button>
                <button onClick={() => handleAction(viewing, 'cancel')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm hover:bg-red-600">
                  <X className="w-3.5 h-3.5" />{tr ? 'Iptal Et' : 'Cancel'}
                </button>
              </div>
            ) : undefined
          }
        >
          <div className="space-y-3 p-1">
            <div className="flex items-center gap-3 text-sm">
              <span className={clsx('px-2 py-0.5 rounded-full border text-xs', JOURNAL_STATUS_STYLES[viewing.status])}>{JOURNAL_STATUS_LABELS[viewing.status]}</span>
              <span className="text-[var(--text-3)]">{DATE_FMT(viewing.date)}</span>
              {viewing.createdBy && <span className="text-[var(--text-3)]">{viewing.createdBy.name}</span>}
            </div>
            <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
                    <th className="text-left px-3 py-2 text-xs font-medium text-[var(--text-3)]">{tr ? 'Hesap' : 'Account'}</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-[var(--text-3)]">{tr ? 'Borc' : 'Debit'}</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-[var(--text-3)]">{tr ? 'Alacak' : 'Credit'}</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-[var(--text-3)]">{tr ? 'Aciklama' : 'Note'}</th>
                  </tr>
                </thead>
                <tbody>
                  {viewing.lines.map(l => (
                    <tr key={l.id} className="border-b border-[var(--border)]">
                      <td className="px-3 py-2"><span className="font-mono text-xs">{l.accountCode}</span> {l.account?.name}</td>
                      <td className="px-3 py-2 text-right font-mono">{Number(l.debit) > 0 ? TRY_FMT(l.debit) : '-'}</td>
                      <td className="px-3 py-2 text-right font-mono">{Number(l.credit) > 0 ? TRY_FMT(l.credit) : '-'}</td>
                      <td className="px-3 py-2 text-[var(--text-3)]">{l.description ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[var(--surface)] font-medium">
                    <td className="px-3 py-2">{tr ? 'Toplam' : 'Total'}</td>
                    <td className="px-3 py-2 text-right font-mono">{TRY_FMT(viewing.totalDebit)}</td>
                    <td className="px-3 py-2 text-right font-mono">{TRY_FMT(viewing.totalCredit)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </DraggableModal>
      )}
    </div>
  )
}
