import { useState, useMemo, useEffect } from 'react'
import { Search, ShoppingCart, Calculator, UserCog, Check, Plus } from 'lucide-react'
import clsx from 'clsx'
import { useModuleAccess, grantModuleAccessKAM, revokeModuleAccessKAM } from '../../lib/erp-hooks'
import { api } from '../../lib/api'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'

const MODULES = [
  { code: 'SALES', labelTr: 'Satis', labelEn: 'Sales', icon: ShoppingCart },
  { code: 'ACCOUNTING', labelTr: 'Muhasebe', labelEn: 'Accounting', icon: Calculator },
  { code: 'HR', labelTr: 'Insan Kaynaklari', labelEn: 'HR', icon: UserCog },
]

export default function ModuleAccessTab() {
  const { lang } = useLanguage()
  const { user } = useAuth()
  const tr = lang === 'tr'

  const [selectedModule, setSelectedModule] = useState('SALES')
  const { accessList, loading, refetch } = useModuleAccess(selectedModule)

  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<{ id: string; name: string; email: string; role: string }[]>([])
  const [usersLoading, setUsersLoading] = useState(true)

  useEffect(() => {
    setUsersLoading(true)
    api.get<any>('/users?pageSize=500').then((res: any) => {
      // api.get returns { data: [...], meta } for paginated, or array directly
      const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []
      setUsers(list.map((u: any) => ({ id: u.id, name: u.name ?? '', email: u.email ?? '', role: u.role ?? '' })))
    }).catch((e) => {
      console.error('[ModuleAccessTab] Failed to fetch users:', e)
    }).finally(() => setUsersLoading(false))
  }, [])

  const assignedIds = useMemo(() => new Set(accessList.map(a => a.userId)), [accessList])

  const filteredUsers = useMemo(() => {
    let list = users.filter(u => u.id !== user?.id)
    if (search) {
      const s = search.toLowerCase()
      list = list.filter(u => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s))
    }
    return list
  }, [users, search, user])

  const handleGrant = async (userId: string) => {
    try {
      await grantModuleAccessKAM(userId, selectedModule)
      refetch()
    } catch (e: any) { alert(e.message) }
  }

  const handleRevoke = async (userId: string) => {
    const access = accessList.find(a => a.userId === userId)
    if (!access) return
    try {
      await revokeModuleAccessKAM(access.id)
      refetch()
    } catch (e: any) { alert(e.message) }
  }

  return (
    <div className="space-y-4">
      {/* Module selector */}
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
                  ? 'bg-cyan-600 text-white border-cyan-500'
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

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-4)]" />
        <input className="input pl-9 w-full" placeholder={tr ? 'Kullanici ara...' : 'Search users...'} value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* User list with toggle */}
      {(loading || usersLoading) ? (
        <div className="text-center py-8 text-[var(--text-3)]">{tr ? 'Yukleniyor...' : 'Loading...'}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Kullanici' : 'User'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Rol' : 'Role'}</th>
                <th className="text-center px-4 py-3 font-medium text-[var(--text-2)]">{selectedModule}</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => {
                const hasAccess = assignedIds.has(u.id)
                return (
                  <tr key={u.id} className="border-b border-[var(--border)] hover:bg-[var(--surface)]">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-[var(--text-1)]">{u.name}</div>
                      <div className="text-xs text-[var(--text-3)]">{u.email}</div>
                    </td>
                    <td className="px-4 py-2.5 text-[var(--text-3)] text-xs">{u.role}</td>
                    <td className="px-4 py-2.5 text-center">
                      {hasAccess ? (
                        <button
                          onClick={() => handleRevoke(u.id)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium hover:bg-red-100 hover:text-red-700 transition-colors"
                        >
                          <Check className="w-3 h-3" /> {tr ? 'Yetkili' : 'Granted'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleGrant(u.id)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[var(--surface)] text-[var(--text-3)] text-xs font-medium hover:bg-cyan-100 hover:text-cyan-700 transition-colors border border-[var(--border)]"
                        >
                          <Plus className="w-3 h-3" /> {tr ? 'Yetki Ver' : 'Grant'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-xs text-[var(--text-3)]">
        {accessList.length} / {users.length} {tr ? 'kullanici yetkili' : 'users granted'}
      </div>
    </div>
  )
}
