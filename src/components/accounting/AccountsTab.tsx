import { useState, useMemo } from 'react'
import { Plus, Search, Pencil, Trash2, ChevronRight, ChevronDown, Database } from 'lucide-react'
import clsx from 'clsx'
import { useAccounts, createAccount, updateAccount, deleteAccount, seedDefaultAccounts } from '../../lib/erp-hooks'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import DraggableModal from '../ui/DraggableModal'
import type { AccountingAccount, AccountType } from '../../types/erp'
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_STYLES } from '../../types/erp'

const MANAGER_ROLES = ['PLATFORM_ADMIN', 'SUPER_ADMIN', 'GENEL_MUDUR', 'GM_YARDIMCISI', 'DIREKTOR', 'MUDUR']

const EMPTY_FORM = { code: '', name: '', accountType: 'VARLIK' as AccountType, parentCode: '' }

export default function AccountsTab() {
  const { user } = useAuth()
  const { lang } = useLanguage()
  const canManage = MANAGER_ROLES.includes(user?.role?.toUpperCase() ?? '')
  const tr = lang === 'tr'

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const { accounts, loading, refetch } = useAccounts()

  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<AccountingAccount | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    let list = accounts
    if (search) list = list.filter(a => a.code.includes(search) || a.name.toLowerCase().includes(search.toLowerCase()))
    if (typeFilter) list = list.filter(a => a.accountType === typeFilter)
    return list.sort((a, b) => a.code.localeCompare(b.code))
  }, [accounts, search, typeFilter])

  const parentAccounts = useMemo(() => accounts.filter(a => !a.isLeaf), [accounts])

  const toggleExpand = (code: string) => {
    const next = new Set(expanded)
    if (next.has(code)) next.delete(code)
    else next.add(code)
    setExpanded(next)
  }

  const getLevel = (code: string) => {
    const parts = code.split('.')
    return parts.length - 1
  }

  const openCreate = () => { setForm(EMPTY_FORM); setCreating(true) }
  const openEdit = (a: AccountingAccount) => {
    setForm({ code: a.code, name: a.name, accountType: a.accountType, parentCode: a.parentCode ?? '' })
    setEditing(a)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = {
        code: form.code,
        name: form.name,
        accountType: form.accountType,
        parentCode: form.parentCode || undefined,
      }
      if (editing) await updateAccount(editing.code, { name: form.name, accountType: form.accountType })
      else await createAccount(body)
      setCreating(false)
      setEditing(null)
      refetch()
    } catch (e: any) { alert(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (a: AccountingAccount) => {
    if (!confirm(`"${a.code} - ${a.name}" hesabini silmek istediginizden emin misiniz?`)) return
    try { await deleteAccount(a.code); refetch() }
    catch (e: any) { alert(e.message) }
  }

  const handleSeedDefaults = async () => {
    if (!confirm(tr ? 'Varsayilan hesap planini olusturmak istiyor musunuz?' : 'Create default chart of accounts?')) return
    try { await seedDefaultAccounts(); refetch() }
    catch (e: any) { alert(e.message) }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-4)]" />
          <input className="input pl-9 w-full" placeholder={tr ? 'Hesap kodu veya adi...' : 'Account code or name...'} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">{tr ? 'Tum Tipler' : 'All Types'}</option>
          {Object.entries(ACCOUNT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {canManage && (
          <>
            {accounts.length === 0 && (
              <button onClick={handleSeedDefaults} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors">
                <Database className="w-4 h-4" />
                {tr ? 'Varsayilan Plan' : 'Seed Defaults'}
              </button>
            )}
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors">
              <Plus className="w-4 h-4" />
              {tr ? 'Yeni Hesap' : 'New Account'}
            </button>
          </>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--text-3)]">{tr ? 'Yukleniyor...' : 'Loading...'}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-3)]">{tr ? 'Hesap bulunamadi' : 'No accounts found'}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Hesap Kodu' : 'Code'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Hesap Adi' : 'Name'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Tip' : 'Type'}</th>
                {canManage && <th className="text-right px-4 py-3 font-medium text-[var(--text-2)]" />}
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => {
                const level = getLevel(a.code)
                return (
                  <tr key={a.code} className="border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1" style={{ paddingLeft: `${level * 16}px` }}>
                        {!a.isLeaf ? (
                          <button onClick={() => toggleExpand(a.code)} className="p-0.5 rounded hover:bg-[var(--bg)]">
                            {expanded.has(a.code) ? <ChevronDown className="w-3.5 h-3.5 text-[var(--text-3)]" /> : <ChevronRight className="w-3.5 h-3.5 text-[var(--text-3)]" />}
                          </button>
                        ) : <span className="w-4" />}
                        <span className="font-mono font-medium text-[var(--text-1)]">{a.code}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-[var(--text-2)]">{a.name}</td>
                    <td className="px-4 py-2.5">
                      <span className={clsx('text-xs px-2 py-0.5 rounded-full border', ACCOUNT_TYPE_STYLES[a.accountType])}>{ACCOUNT_TYPE_LABELS[a.accountType]}</span>
                    </td>
                    {canManage && (
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(a)} className="p-1.5 rounded-md hover:bg-[var(--bg)] text-[var(--text-3)] hover:text-emerald-500"><Pencil className="w-4 h-4" /></button>
                          {a.isLeaf && <button onClick={() => handleDelete(a)} className="p-1.5 rounded-md hover:bg-[var(--bg)] text-[var(--text-3)] hover:text-red-500"><Trash2 className="w-4 h-4" /></button>}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {(creating || editing) && (
        <DraggableModal
          title={editing ? (tr ? 'Hesap Duzenle' : 'Edit Account') : (tr ? 'Yeni Hesap' : 'New Account')}
          onClose={() => { setCreating(false); setEditing(null) }}
          width={460}
          footer={
            <div className="flex justify-end gap-2">
              <button onClick={() => { setCreating(false); setEditing(null) }} className="px-4 py-2 rounded-lg text-sm text-[var(--text-2)] hover:bg-[var(--surface)]">{tr ? 'Iptal' : 'Cancel'}</button>
              <button onClick={handleSave} disabled={saving || !form.code || !form.name} className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-50">
                {saving ? (tr ? 'Kaydediliyor...' : 'Saving...') : (tr ? 'Kaydet' : 'Save')}
              </button>
            </div>
          }
        >
          <div className="space-y-3 p-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Hesap Kodu *' : 'Account Code *'}</label>
                <input className="input w-full font-mono" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} disabled={!!editing} />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Hesap Tipi' : 'Account Type'}</label>
                <select className="select w-full" value={form.accountType} onChange={e => setForm({ ...form, accountType: e.target.value as AccountType })}>
                  {Object.entries(ACCOUNT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Hesap Adi *' : 'Account Name *'}</label>
              <input className="input w-full" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            {!editing && (
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Ust Hesap' : 'Parent Account'}</label>
                <select className="select w-full" value={form.parentCode} onChange={e => setForm({ ...form, parentCode: e.target.value })}>
                  <option value="">{tr ? 'Yok (Ana Hesap)' : 'None (Root)'}</option>
                  {parentAccounts.map(a => <option key={a.code} value={a.code}>{a.code} - {a.name}</option>)}
                </select>
              </div>
            )}
          </div>
        </DraggableModal>
      )}
    </div>
  )
}
