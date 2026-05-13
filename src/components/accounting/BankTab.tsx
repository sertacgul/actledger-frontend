import { useState } from 'react'
import { Plus, Pencil, Trash2, Building2, ArrowUpRight, ArrowDownLeft, Check, FileSpreadsheet } from 'lucide-react'
import clsx from 'clsx'
import {
  useBankAccounts, useBankTransactions,
  createBankAccount, updateBankAccount, deleteBankAccount,
  createBankTransaction, reconcileTransaction,
} from '../../lib/erp-hooks'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import DraggableModal from '../ui/DraggableModal'
import { TRY_FMT, DATE_FMT, DATE_CELL, toISO } from '../../types/erp'
import { exportToExcel } from '../../lib/excelExport'

const MANAGER_ROLES = ['PLATFORM_ADMIN', 'SUPER_ADMIN', 'GENEL_MUDUR', 'GM_YARDIMCISI', 'DIREKTOR', 'MUDUR']

const CATEGORIES: Record<string, string> = {
  SATIS: 'Satis', ALIS: 'Alis', MAAS: 'Maas', VERGI: 'Vergi', KIRA: 'Kira', DIGER: 'Diger',
}

export default function BankTab() {
  const { user } = useAuth()
  const { lang } = useLanguage()
  const canManage = MANAGER_ROLES.includes(user?.role?.toUpperCase() ?? '')
  const tr = lang === 'tr'

  const { bankAccounts, loading, refetch } = useBankAccounts()
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const { transactions, refetch: refetchTx } = useBankTransactions(selectedAccountId)

  // Account modal
  const [accountModal, setAccountModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<any>(null)
  const [accountForm, setAccountForm] = useState({ name: '', bankName: '', accountNumber: '', iban: '', currency: 'TRY', accountCode: '' })
  const [saving, setSaving] = useState(false)

  // Transaction modal
  const [txModal, setTxModal] = useState(false)
  const [txForm, setTxForm] = useState({ type: 'GIRIS', amount: '', date: new Date().toISOString().slice(0, 10), description: '', reference: '', category: 'DIGER' })

  const selectedAccount = bankAccounts.find((a: any) => a.id === selectedAccountId)

  const openCreateAccount = () => {
    setAccountForm({ name: '', bankName: '', accountNumber: '', iban: '', currency: 'TRY', accountCode: '' })
    setEditingAccount(null); setAccountModal(true)
  }

  const openEditAccount = (a: any) => {
    setAccountForm({ name: a.name, bankName: a.bankName, accountNumber: a.accountNumber ?? '', iban: a.iban ?? '', currency: a.currency, accountCode: a.accountCode ?? '' })
    setEditingAccount(a); setAccountModal(true)
  }

  const handleSaveAccount = async () => {
    setSaving(true)
    try {
      const body = {
        name: accountForm.name, bankName: accountForm.bankName,
        accountNumber: accountForm.accountNumber || undefined, iban: accountForm.iban || undefined,
        currency: accountForm.currency, accountCode: accountForm.accountCode || undefined,
      }
      if (editingAccount) await updateBankAccount(editingAccount.id, body)
      else await createBankAccount(body)
      setAccountModal(false); refetch()
    } catch (e: any) { alert(e.message) }
    finally { setSaving(false) }
  }

  const handleDeleteAccount = async (id: string) => {
    if (!confirm(tr ? 'Hesabi silmek istiyor musunuz?' : 'Delete this account?')) return
    try { await deleteBankAccount(id); if (selectedAccountId === id) setSelectedAccountId(''); refetch() }
    catch (e: any) { alert(e.message) }
  }

  const handleCreateTx = async () => {
    if (!selectedAccountId) return
    setSaving(true)
    try {
      await createBankTransaction(selectedAccountId, {
        type: txForm.type, amount: Number(txForm.amount), date: toISO(txForm.date),
        description: txForm.description, reference: txForm.reference || undefined, category: txForm.category,
      })
      setTxModal(false); setTxForm({ type: 'GIRIS', amount: '', date: new Date().toISOString().slice(0, 10), description: '', reference: '', category: 'DIGER' })
      refetchTx(); refetch()
    } catch (e: any) { alert(e.message) }
    finally { setSaving(false) }
  }

  const handleReconcile = async (txId: string) => {
    try { await reconcileTransaction(txId); refetchTx() }
    catch (e: any) { alert(e.message) }
  }

  return (
    <div className="space-y-4">
      {/* Bank Accounts */}
      <div className="flex flex-wrap items-center gap-3">
        {canManage && (
          <button onClick={openCreateAccount} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600">
            <Plus className="w-4 h-4" />{tr ? 'Yeni Hesap' : 'New Account'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8 text-[var(--text-3)]">{tr ? 'Yukleniyor...' : 'Loading...'}</div>
      ) : bankAccounts.length === 0 ? (
        <div className="text-center py-8 text-[var(--text-3)]">{tr ? 'Henuz banka hesabi yok' : 'No bank accounts yet'}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {bankAccounts.map((a: any) => (
            <div key={a.id} onClick={() => setSelectedAccountId(a.id)}
              className={clsx('p-4 rounded-xl border cursor-pointer transition-all',
                selectedAccountId === a.id ? 'border-emerald-300 bg-emerald-50/50 shadow-sm' : 'border-[var(--border)] bg-[var(--surface)] hover:border-emerald-200'
              )}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-500" />
                  <span className="font-medium text-[var(--text-1)] text-sm">{a.name}</span>
                </div>
                {canManage && (
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEditAccount(a)} className="p-1 rounded hover:bg-[var(--bg)] text-[var(--text-4)]"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDeleteAccount(a.id)} className="p-1 rounded hover:bg-[var(--bg)] text-[var(--text-4)]"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>
              <div className="text-xs text-[var(--text-3)]">{a.bankName}</div>
              {a.iban && <div className="text-xs text-[var(--text-4)] font-mono mt-0.5">{a.iban}</div>}
              <div className="text-lg font-mono font-bold text-[var(--text-1)] mt-2">{TRY_FMT(a.balance)}</div>
              <div className="text-xs text-[var(--text-4)] mt-0.5">{a._count?.transactions ?? 0} {tr ? 'hareket' : 'transactions'}</div>
            </div>
          ))}
        </div>
      )}

      {/* Transactions */}
      {selectedAccountId && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[var(--text-1)]">{selectedAccount?.name} - {tr ? 'Hareketler' : 'Transactions'}</h3>
            <div className="flex gap-2">
              <button onClick={() => exportToExcel({
                filename: `banka_${selectedAccount?.name}_${new Date().toISOString().slice(0, 10)}.xlsx`, sheetName: 'Hareketler',
                columns: [
                  { header: 'Tarih', accessor: (t: any) => DATE_CELL(t.date), width: 12 },
                  { header: 'Tip', accessor: (t: any) => t.type === 'GIRIS' ? 'Giris' : 'Cikis', width: 8 },
                  { header: 'Tutar', accessor: (t: any) => Number(t.amount) || 0, width: 14 },
                  { header: 'Aciklama', accessor: (t: any) => t.description, width: 28 },
                  { header: 'Kategori', accessor: (t: any) => CATEGORIES[t.category] ?? t.category, width: 12 },
                  { header: 'Eslestirme', accessor: (t: any) => t.reconciled ? 'Evet' : 'Hayir', width: 10 },
                ], rows: transactions,
              })} className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface)] text-[var(--text-3)]" title="Excel">
                <FileSpreadsheet className="w-4 h-4" />
              </button>
              {canManage && (
                <button onClick={() => setTxModal(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600">
                  <Plus className="w-4 h-4" />{tr ? 'Hareket Ekle' : 'Add Transaction'}
                </button>
              )}
            </div>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-6 text-sm text-[var(--text-3)]">{tr ? 'Henuz hareket yok' : 'No transactions yet'}</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
                    <th className="text-left px-4 py-2.5 font-medium text-[var(--text-2)]">{tr ? 'Tarih' : 'Date'}</th>
                    <th className="text-left px-4 py-2.5 font-medium text-[var(--text-2)]">{tr ? 'Aciklama' : 'Description'}</th>
                    <th className="text-left px-4 py-2.5 font-medium text-[var(--text-2)]">{tr ? 'Kategori' : 'Category'}</th>
                    <th className="text-right px-4 py-2.5 font-medium text-[var(--text-2)]">{tr ? 'Tutar' : 'Amount'}</th>
                    <th className="text-center px-4 py-2.5 font-medium text-[var(--text-2)]">{tr ? 'Muhasebe' : 'Reconciled'}</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t: any) => (
                    <tr key={t.id} className="border-b border-[var(--border)] hover:bg-[var(--surface)]">
                      <td className="px-4 py-2.5 text-[var(--text-3)]">{DATE_FMT(t.date)}</td>
                      <td className="px-4 py-2.5 text-[var(--text-1)]">
                        <div className="flex items-center gap-1.5">
                          {t.type === 'GIRIS' ? <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" /> : <ArrowUpRight className="w-3.5 h-3.5 text-red-500" />}
                          {t.description}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-[var(--text-3)]">{CATEGORIES[t.category] ?? t.category}</td>
                      <td className={clsx('px-4 py-2.5 text-right font-mono font-medium', t.type === 'GIRIS' ? 'text-emerald-600' : 'text-red-600')}>
                        {t.type === 'GIRIS' ? '+' : '-'}{TRY_FMT(t.amount)}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {t.reconciled ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><Check className="w-3 h-3" />{tr ? 'Eslesti' : 'Yes'}</span>
                        ) : canManage ? (
                          <button onClick={() => handleReconcile(t.id)} className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200">
                            {tr ? 'Esle' : 'Reconcile'}
                          </button>
                        ) : (
                          <span className="text-xs text-[var(--text-4)]">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Account Modal */}
      {accountModal && (
        <DraggableModal title={editingAccount ? (tr ? 'Hesap Duzenle' : 'Edit Account') : (tr ? 'Yeni Banka Hesabi' : 'New Bank Account')} icon={<Building2 className="w-5 h-5 text-emerald-500" />} onClose={() => setAccountModal(false)} width={480}
          footer={<div className="flex justify-end gap-2">
            <button onClick={() => setAccountModal(false)} className="px-4 py-2 rounded-lg text-sm text-[var(--text-2)]">{tr ? 'Iptal' : 'Cancel'}</button>
            <button onClick={handleSaveAccount} disabled={saving || !accountForm.name || !accountForm.bankName} className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium disabled:opacity-50">{saving ? '...' : (tr ? 'Kaydet' : 'Save')}</button>
          </div>}
        >
          <div className="space-y-3 p-1">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Hesap Adi *' : 'Account Name *'}</label>
                <input className="input w-full" value={accountForm.name} onChange={e => setAccountForm({ ...accountForm, name: e.target.value })} placeholder={tr ? 'Ziraat TL' : 'Main Account'} /></div>
              <div><label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Banka *' : 'Bank *'}</label>
                <input className="input w-full" value={accountForm.bankName} onChange={e => setAccountForm({ ...accountForm, bankName: e.target.value })} placeholder={tr ? 'Ziraat Bankasi' : 'Bank Name'} /></div>
            </div>
            <div><label className="text-xs font-medium text-[var(--text-2)] mb-1 block">IBAN</label>
              <input className="input w-full font-mono" value={accountForm.iban} onChange={e => setAccountForm({ ...accountForm, iban: e.target.value })} placeholder="TR00 0000 0000 0000 0000 0000 00" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Hesap No' : 'Account #'}</label>
                <input className="input w-full" value={accountForm.accountNumber} onChange={e => setAccountForm({ ...accountForm, accountNumber: e.target.value })} /></div>
              <div><label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Muhasebe Kodu' : 'Account Code'}</label>
                <input className="input w-full font-mono" value={accountForm.accountCode} onChange={e => setAccountForm({ ...accountForm, accountCode: e.target.value })} placeholder="102" /></div>
            </div>
          </div>
        </DraggableModal>
      )}

      {/* Transaction Modal */}
      {txModal && (
        <DraggableModal title={tr ? 'Yeni Hareket' : 'New Transaction'} onClose={() => setTxModal(false)} width={520}
          footer={<div className="flex justify-end gap-2">
            <button onClick={() => setTxModal(false)} className="px-4 py-2 rounded-lg text-sm text-[var(--text-2)]">{tr ? 'Iptal' : 'Cancel'}</button>
            <button onClick={handleCreateTx} disabled={saving || !txForm.amount || !txForm.description} className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium disabled:opacity-50">{saving ? '...' : (tr ? 'Kaydet' : 'Save')}</button>
          </div>}
        >
          <div className="space-y-3 p-1">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Tip *' : 'Type *'}</label>
                <select className="select w-full" value={txForm.type} onChange={e => setTxForm({ ...txForm, type: e.target.value })}>
                  <option value="GIRIS">{tr ? 'Giris (Tahsilat)' : 'Income'}</option>
                  <option value="CIKIS">{tr ? 'Cikis (Odeme)' : 'Expense'}</option>
                </select></div>
              <div><label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Tutar *' : 'Amount *'}</label>
                <input className="input w-full" type="number" value={txForm.amount} onChange={e => setTxForm({ ...txForm, amount: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Tarih *' : 'Date *'}</label>
                <input className="input w-full" type="date" value={txForm.date} onChange={e => setTxForm({ ...txForm, date: e.target.value })} /></div>
              <div><label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Kategori' : 'Category'}</label>
                <select className="select w-full" value={txForm.category} onChange={e => setTxForm({ ...txForm, category: e.target.value })}>
                  {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
            </div>
            <div><label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Aciklama *' : 'Description *'}</label>
              <input className="input w-full" value={txForm.description} onChange={e => setTxForm({ ...txForm, description: e.target.value })} /></div>
            <div><label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Referans' : 'Reference'}</label>
              <input className="input w-full" value={txForm.reference} onChange={e => setTxForm({ ...txForm, reference: e.target.value })} /></div>
          </div>
        </DraggableModal>
      )}
    </div>
  )
}
