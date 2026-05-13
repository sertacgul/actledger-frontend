import { useState } from 'react'
import { Plus, Pencil, Trash2, Store, ChevronDown, ChevronRight, DoorOpen, DoorClosed } from 'lucide-react'
import clsx from 'clsx'
import { useBranches, useTills, createBranch, updateBranch, deleteBranch, createTill, openTill, closeTill } from '../../lib/erp-hooks'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import DraggableModal from '../ui/DraggableModal'
import { TRY_FMT } from '../../types/erp'

const MANAGER_ROLES = ['PLATFORM_ADMIN', 'SUPER_ADMIN', 'GENEL_MUDUR', 'GM_YARDIMCISI', 'DIREKTOR', 'MUDUR']

export default function BranchesTab() {
  const { user } = useAuth()
  const { lang } = useLanguage()
  const canManage = MANAGER_ROLES.includes(user?.role?.toUpperCase() ?? '')
  const tr = lang === 'tr'

  const { branches, loading, refetch } = useBranches()
  const [expandedBranch, setExpandedBranch] = useState<string | null>(null)

  // Branch form
  const [branchModal, setBranchModal] = useState(false)
  const [editingBranch, setEditingBranch] = useState<any>(null)
  const [branchForm, setBranchForm] = useState({ name: '', code: '', address: '', phone: '' })
  const [saving, setSaving] = useState(false)

  // Till form
  const [tillModal, setTillModal] = useState(false)
  const [tillBranchId, setTillBranchId] = useState('')
  const [tillName, setTillName] = useState('')

  // Open/Close till
  const [openingTillId, setOpeningTillId] = useState<string | null>(null)
  const [openingBalance, setOpeningBalance] = useState('')
  const [closingTillId, setClosingTillId] = useState<string | null>(null)
  const [closingBalance, setClosingBalance] = useState('')

  const openCreateBranch = () => {
    setBranchForm({ name: '', code: '', address: '', phone: '' })
    setEditingBranch(null)
    setBranchModal(true)
  }

  const openEditBranch = (b: any) => {
    setBranchForm({ name: b.name, code: b.code, address: b.address ?? '', phone: b.phone ?? '' })
    setEditingBranch(b)
    setBranchModal(true)
  }

  const handleSaveBranch = async () => {
    setSaving(true)
    try {
      if (editingBranch) {
        await updateBranch(editingBranch.id, { name: branchForm.name, address: branchForm.address || null, phone: branchForm.phone || null })
      } else {
        await createBranch({ name: branchForm.name, code: branchForm.code, address: branchForm.address || undefined, phone: branchForm.phone || undefined })
      }
      setBranchModal(false)
      refetch()
    } catch (e: any) { alert(e.message) }
    finally { setSaving(false) }
  }

  const handleDeleteBranch = async (b: any) => {
    if (!confirm(`"${b.name}" subesini silmek istediginizden emin misiniz?`)) return
    try { await deleteBranch(b.id); refetch() }
    catch (e: any) { alert(e.message) }
  }

  const handleCreateTill = async () => {
    if (!tillName || !tillBranchId) return
    try { await createTill({ branchId: tillBranchId, name: tillName }); setTillModal(false); setTillName(''); refetch() }
    catch (e: any) { alert(e.message) }
  }

  const handleOpenTill = async () => {
    if (!openingTillId) return
    try { await openTill(openingTillId, Number(openingBalance) || 0); setOpeningTillId(null); setOpeningBalance(''); refetch() }
    catch (e: any) { alert(e.message) }
  }

  const handleCloseTill = async () => {
    if (!closingTillId) return
    try { await closeTill(closingTillId, { closingBalance: Number(closingBalance) || 0 }); setClosingTillId(null); setClosingBalance(''); refetch() }
    catch (e: any) { alert(e.message) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {canManage && (
          <button onClick={openCreateBranch} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-colors">
            <Plus className="w-4 h-4" />
            {tr ? 'Yeni Sube' : 'New Branch'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--text-3)]">{tr ? 'Yukleniyor...' : 'Loading...'}</div>
      ) : branches.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-3)]">{tr ? 'Henuz sube tanimlanmamis' : 'No branches defined yet'}</div>
      ) : (
        <div className="space-y-3">
          {branches.map(branch => (
            <div key={branch.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
              {/* Branch header */}
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--bg)] transition-colors" onClick={() => setExpandedBranch(expandedBranch === branch.id ? null : branch.id)}>
                {expandedBranch === branch.id ? <ChevronDown className="w-4 h-4 text-[var(--text-3)]" /> : <ChevronRight className="w-4 h-4 text-[var(--text-3)]" />}
                <Store className="w-5 h-5 text-indigo-500" />
                <div className="flex-1">
                  <div className="font-medium text-[var(--text-1)]">{branch.name}</div>
                  <div className="text-xs text-[var(--text-3)]">{branch.code}{branch.phone ? ` - ${branch.phone}` : ''}{branch.address ? ` - ${branch.address}` : ''}</div>
                </div>
                <div className="text-xs text-[var(--text-3)]">{branch._count?.tills ?? 0} {tr ? 'kasa' : 'tills'}</div>
                {canManage && (
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEditBranch(branch)} className="p-1.5 rounded-md hover:bg-[var(--bg)] text-[var(--text-3)] hover:text-indigo-500"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteBranch(branch)} className="p-1.5 rounded-md hover:bg-[var(--bg)] text-[var(--text-3)] hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                )}
              </div>

              {/* Tills (expanded) */}
              {expandedBranch === branch.id && (
                <BranchTills
                  branchId={branch.id}
                  canManage={canManage}
                  tr={tr}
                  onAddTill={() => { setTillBranchId(branch.id); setTillName(''); setTillModal(true) }}
                  onOpenTill={(id) => { setOpeningTillId(id); setOpeningBalance('') }}
                  onCloseTill={(id) => { setClosingTillId(id); setClosingBalance('') }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Branch Modal */}
      {branchModal && (
        <DraggableModal
          title={editingBranch ? (tr ? 'Sube Duzenle' : 'Edit Branch') : (tr ? 'Yeni Sube' : 'New Branch')}
          icon={<Store className="w-5 h-5 text-indigo-500" />}
          onClose={() => setBranchModal(false)}
          width={520}
          footer={
            <div className="flex justify-end gap-2">
              <button onClick={() => setBranchModal(false)} className="px-4 py-2 rounded-lg text-sm text-[var(--text-2)] hover:bg-[var(--surface)]">{tr ? 'Iptal' : 'Cancel'}</button>
              <button onClick={handleSaveBranch} disabled={saving || !branchForm.name || (!editingBranch && !branchForm.code)} className="px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 disabled:opacity-50">
                {saving ? (tr ? 'Kaydediliyor...' : 'Saving...') : (tr ? 'Kaydet' : 'Save')}
              </button>
            </div>
          }
        >
          <div className="space-y-3 px-5 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Sube Adi *' : 'Branch Name *'}</label>
                <input className="input w-full" value={branchForm.name} onChange={e => setBranchForm({ ...branchForm, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Sube Kodu *' : 'Code *'}</label>
                <input className="input w-full" value={branchForm.code} onChange={e => setBranchForm({ ...branchForm, code: e.target.value })} disabled={!!editingBranch} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Adres' : 'Address'}</label>
              <input className="input w-full" value={branchForm.address} onChange={e => setBranchForm({ ...branchForm, address: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Telefon' : 'Phone'}</label>
              <input className="input w-full" value={branchForm.phone} onChange={e => setBranchForm({ ...branchForm, phone: e.target.value })} />
            </div>
          </div>
        </DraggableModal>
      )}

      {/* Till Modal */}
      {tillModal && (
        <DraggableModal title={tr ? 'Yeni Kasa' : 'New Till'} onClose={() => setTillModal(false)} width={420}
          footer={
            <div className="flex justify-end gap-2">
              <button onClick={() => setTillModal(false)} className="px-4 py-2 rounded-lg text-sm text-[var(--text-2)]">{tr ? 'Iptal' : 'Cancel'}</button>
              <button onClick={handleCreateTill} disabled={!tillName} className="px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium disabled:opacity-50">{tr ? 'Olustur' : 'Create'}</button>
            </div>
          }
        >
          <div className="px-5 py-4">
            <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Kasa Adi *' : 'Till Name *'}</label>
            <input className="input w-full" value={tillName} onChange={e => setTillName(e.target.value)} placeholder={tr ? 'Kasa 1' : 'Till 1'} />
          </div>
        </DraggableModal>
      )}

      {/* Open Till Modal */}
      {openingTillId && (
        <DraggableModal title={tr ? 'Kasa Ac' : 'Open Till'} onClose={() => setOpeningTillId(null)} width={420}
          footer={
            <div className="flex justify-end gap-2">
              <button onClick={() => setOpeningTillId(null)} className="px-4 py-2 rounded-lg text-sm text-[var(--text-2)]">{tr ? 'Iptal' : 'Cancel'}</button>
              <button onClick={handleOpenTill} className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium">{tr ? 'Kasa Ac' : 'Open'}</button>
            </div>
          }
        >
          <div className="px-5 py-4">
            <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Acilis Bakiyesi' : 'Opening Balance'}</label>
            <input className="input w-full" type="number" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} placeholder="0" />
          </div>
        </DraggableModal>
      )}

      {/* Close Till Modal */}
      {closingTillId && (
        <DraggableModal title={tr ? 'Kasa Kapat' : 'Close Till'} onClose={() => setClosingTillId(null)} width={420}
          footer={
            <div className="flex justify-end gap-2">
              <button onClick={() => setClosingTillId(null)} className="px-4 py-2 rounded-lg text-sm text-[var(--text-2)]">{tr ? 'Iptal' : 'Cancel'}</button>
              <button onClick={handleCloseTill} className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium">{tr ? 'Kasa Kapat' : 'Close'}</button>
            </div>
          }
        >
          <div className="px-5 py-4">
            <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Kapanis Bakiyesi' : 'Closing Balance'}</label>
            <input className="input w-full" type="number" value={closingBalance} onChange={e => setClosingBalance(e.target.value)} placeholder="0" />
          </div>
        </DraggableModal>
      )}
    </div>
  )
}

function BranchTills({ branchId, canManage, tr, onAddTill, onOpenTill, onCloseTill }: {
  branchId: string; canManage: boolean; tr: boolean
  onAddTill: () => void; onOpenTill: (id: string) => void; onCloseTill: (id: string) => void
}) {
  const { tills, loading } = useTills(branchId)

  if (loading) return <div className="px-4 py-3 text-sm text-[var(--text-3)]">{tr ? 'Yukleniyor...' : 'Loading...'}</div>

  return (
    <div className="border-t border-[var(--border)] px-4 py-3 space-y-2 bg-[var(--bg)]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--text-2)]">{tr ? 'Kasalar' : 'Tills'}</span>
        {canManage && (
          <button onClick={onAddTill} className="text-xs text-indigo-500 hover:text-indigo-600 font-medium">+ {tr ? 'Kasa Ekle' : 'Add Till'}</button>
        )}
      </div>
      {tills.length === 0 ? (
        <div className="text-xs text-[var(--text-3)]">{tr ? 'Henuz kasa yok' : 'No tills yet'}</div>
      ) : (
        tills.map(till => (
          <div key={till.id} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
            {till.status === 'ACIK' ? (
              <DoorOpen className="w-4 h-4 text-emerald-500" />
            ) : (
              <DoorClosed className="w-4 h-4 text-zinc-400" />
            )}
            <div className="flex-1">
              <div className="text-sm font-medium text-[var(--text-1)]">{till.name}</div>
              <div className="text-xs text-[var(--text-3)]">
                {till.status === 'ACIK' ? (tr ? 'Acik' : 'Open') : (tr ? 'Kapali' : 'Closed')}
                {till.currentSession && ` - ${TRY_FMT(till.currentSession.totalSales)} (${till.currentSession.totalTransactions} islem)`}
              </div>
            </div>
            {canManage && (
              till.status === 'KAPALI' ? (
                <button onClick={() => onOpenTill(till.id)} className="px-3 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-medium hover:bg-emerald-200">
                  {tr ? 'Ac' : 'Open'}
                </button>
              ) : (
                <button onClick={() => onCloseTill(till.id)} className="px-3 py-1 rounded-lg bg-red-100 text-red-700 text-xs font-medium hover:bg-red-200">
                  {tr ? 'Kapat' : 'Close'}
                </button>
              )
            )}
          </div>
        ))
      )}
    </div>
  )
}
