import { useState, useMemo, useEffect } from 'react'
import { Plus, Trash2, Search, ShoppingCart, Calculator, UserCog } from 'lucide-react'
import clsx from 'clsx'
import { useModuleAccess, grantModuleAccessKAM, revokeModuleAccessKAM } from '../../lib/erp-hooks'
import { api } from '../../lib/api'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'

const MODULES = [
  { code: 'SALES', labelTr: 'Satis', labelEn: 'Sales', icon: ShoppingCart, color: 'text-indigo-500' },
  { code: 'ACCOUNTING', labelTr: 'Muhasebe', labelEn: 'Accounting', icon: Calculator, color: 'text-emerald-500' },
  { code: 'HR', labelTr: 'Insan Kaynaklari', labelEn: 'HR', icon: UserCog, color: 'text-violet-500' },
]

export default function ModuleAccessTab() {
  const { lang } = useLanguage()
  const { user } = useAuth()
  const tr = lang === 'tr'

  const [selectedModule, setSelectedModule] = useState('SALES')
  const { accessList, loading, refetch } = useModuleAccess(selectedModule)

  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<{ id: string; name: string; email: string; role: string }[]>([])
  const [addingUserId, setAddingUserId] = useState('')

  useEffect(() => {
    api.get<any>('/users?pageSize=500').then((res: any) => {
      setUsers((res.data ?? res ?? []).map((u: any) => ({ id: u.id, name: u.name, email: u.email, role: u.role })))
    }).catch(() => {})
  }, [])

  const assignedUserIds = useMemo(() => new Set(accessList.map(a => a.userId)), [accessList])
  const availableUsers = useMemo(() =>
    users.filter(u => !assignedUserIds.has(u.id) && u.id !== user?.id),
  [users, assignedUserIds, user])

  const filteredAccess = useMemo(() => {
    if (!search) return accessList
    const s = search.toLowerCase()
    return accessList.filter(a => a.user.name.toLowerCase().includes(s) || a.user.email.toLowerCase().includes(s))
  }, [accessList, search])

  const handleGrant = async () => {
    if (!addingUserId) return
    try {
      await grantModuleAccessKAM(addingUserId, selectedModule)
      setAddingUserId('')
      refetch()
    } catch (e: any) { alert(e.message) }
  }

  const handleRevoke = async (id: string, userName: string) => {
    if (!confirm(`${userName} kullanicisinin ${selectedModule} modulune erisimini kaldirmak istiyor musunuz?`)) return
    try { await revokeModuleAccessKAM(id); refetch() }
    catch (e: any) { alert(e.message) }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--text-3)]">
        {tr ? 'ERP modullerine erisebilecek kullanicilari yonetin.' : 'Manage which users can access ERP modules.'}
      </p>

      <div className="flex gap-2">
        {MODULES.map(m => {
          const isLicensed = user?.modules?.includes(m.code)
          return (
            <button
              key={m.code}
              onClick={() => setSelectedModule(m.code)}
              disabled={!isLicensed}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border',
                selectedModule === m.code
                  ? 'bg-[var(--accent)] text-white border-transparent'
                  : isLicensed
                    ? 'border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--surface)]'
                    : 'border-[var(--border)] text-[var(--text-4)] opacity-50 cursor-not-allowed'
              )}
            >
              <m.icon className="w-4 h-4" />
              {tr ? m.labelTr : m.labelEn}
              {!isLicensed && <span className="text-[10px]">(lisans yok)</span>}
            </button>
          )
        })}
      </div>

      <div className="flex gap-2">
        <select className="select flex-1" value={addingUserId} onChange={e => setAddingUserId(e.target.value)}>
          <option value="">{tr ? 'Kullanici sec...' : 'Select user...'}</option>
          {availableUsers.map(u => (
            <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
          ))}
        </select>
        <button
          onClick={handleGrant}
          disabled={!addingUserId}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          {tr ? 'Yetki Ver' : 'Grant Access'}
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-4)]" />
        <input className="input pl-9 w-full" placeholder={tr ? 'Kullanici ara...' : 'Search users...'} value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="text-center py-8 text-[var(--text-3)]">{tr ? 'Yukleniyor...' : 'Loading...'}</div>
      ) : filteredAccess.length === 0 ? (
        <div className="text-center py-8 text-[var(--text-3)]">
          {tr ? 'Bu module henuz kimse yetkilendirilmemis.' : 'No users have access to this module yet.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Kullanici' : 'User'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Rol' : 'Role'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Yetki Veren' : 'Granted By'}</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Tarih' : 'Date'}</th>
                <th className="text-right px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filteredAccess.map(a => (
                <tr key={a.id} className="border-b border-[var(--border)] hover:bg-[var(--surface)]">
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--text-1)]">{a.user.name}</div>
                    <div className="text-xs text-[var(--text-3)]">{a.user.email}</div>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-2)] text-xs">{a.user.role}</td>
                  <td className="px-4 py-3 text-[var(--text-3)]">{a.grantedBy.name}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-3)]">{new Date(a.grantedAt).toLocaleDateString('tr-TR')}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleRevoke(a.id, a.user.name)} className="p-1.5 rounded-md hover:bg-red-50 text-[var(--text-3)] hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
