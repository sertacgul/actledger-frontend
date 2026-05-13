import { useState } from 'react'
import { Plus, Search, Pencil, Trash2, Phone, Mail, Building2, FileSpreadsheet } from 'lucide-react'
import clsx from 'clsx'
import { useCustomers, createCustomer, updateCustomer, deleteCustomer } from '../../lib/erp-hooks'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import DraggableModal from '../ui/DraggableModal'
import type { SalesCustomer, CustomerType } from '../../types/erp'
import { CUSTOMER_TYPE_LABELS, TRY_FMT, DATE_FMT } from '../../types/erp'
import { exportToExcel } from '../../lib/excelExport'

const MANAGER_ROLES = ['PLATFORM_ADMIN', 'SUPER_ADMIN', 'GENEL_MUDUR', 'GM_YARDIMCISI', 'DIREKTOR', 'MUDUR']

const EMPTY_FORM = {
  name: '', taxNumber: '', phone: '', email: '', address: '',
  customerType: 'PERAKENDE' as CustomerType, creditLimit: '', paymentTermDays: '30',
  isEInvoiceCustomer: false, notes: '',
}

export default function CustomersTab() {
  const { user } = useAuth()
  const { lang } = useLanguage()
  const canManage = MANAGER_ROLES.includes(user?.role?.toUpperCase() ?? '')

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const { customers, loading, refetch } = useCustomers({ search: search || undefined, customerType: typeFilter || undefined })

  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<SalesCustomer | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setCreating(true)
  }

  const openEdit = (c: SalesCustomer) => {
    setForm({
      name: c.name,
      taxNumber: c.taxNumber ?? '',
      phone: c.phone ?? '',
      email: c.email ?? '',
      address: c.address ?? '',
      customerType: c.customerType,
      creditLimit: c.creditLimit ? String(c.creditLimit) : '',
      paymentTermDays: String(c.paymentTermDays),
      isEInvoiceCustomer: c.isEInvoiceCustomer,
      notes: c.notes ?? '',
    })
    setEditing(c)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = {
        name: form.name,
        taxNumber: form.taxNumber || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
        customerType: form.customerType,
        creditLimit: form.creditLimit ? Number(form.creditLimit) : undefined,
        paymentTermDays: Number(form.paymentTermDays) || 30,
        isEInvoiceCustomer: form.isEInvoiceCustomer,
        notes: form.notes || undefined,
      }
      if (editing) {
        await updateCustomer(editing.id, body)
      } else {
        await createCustomer(body)
      }
      setCreating(false)
      setEditing(null)
      refetch()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (c: SalesCustomer) => {
    if (!confirm(`"${c.name}" musterisini silmek istediginizden emin misiniz?`)) return
    try {
      await deleteCustomer(c.id)
      refetch()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const tr = lang === 'tr'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-4)]" />
          <input
            className="input pl-9 w-full"
            placeholder={tr ? 'Musteri ara...' : 'Search customers...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">{tr ? 'Tum Tipler' : 'All Types'}</option>
          {Object.entries(CUSTOMER_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button onClick={() => exportToExcel({
          filename: `musteriler_${new Date().toISOString().slice(0, 10)}.xlsx`,
          sheetName: 'Musteriler',
          columns: [
            { header: 'Musteri Adi', accessor: (c: SalesCustomer) => c.name, width: 28 },
            { header: 'Tip', accessor: (c: SalesCustomer) => CUSTOMER_TYPE_LABELS[c.customerType], width: 14 },
            { header: 'Telefon', accessor: (c: SalesCustomer) => c.phone ?? '', width: 16 },
            { header: 'E-posta', accessor: (c: SalesCustomer) => c.email ?? '', width: 24 },
            { header: 'Vergi No', accessor: (c: SalesCustomer) => c.taxNumber ?? '', width: 14 },
            { header: 'Bakiye', accessor: (c: SalesCustomer) => Number(c.balance) || 0, width: 14 },
            { header: 'Tarih', accessor: (c: SalesCustomer) => c.createdAt?.slice(0, 10) ?? '', width: 12 },
          ],
          rows: customers,
        })} className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface)] text-[var(--text-3)]" title="Excel">
          <FileSpreadsheet className="w-4 h-4" />
        </button>
        {canManage && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-colors">
            <Plus className="w-4 h-4" />
            {tr ? 'Yeni Musteri' : 'New Customer'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--text-3)]">{tr ? 'Yukleniyor...' : 'Loading...'}</div>
      ) : customers.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-3)]">{tr ? 'Musteri bulunamadi' : 'No customers found'}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Musteri' : 'Customer'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Tip' : 'Type'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Iletisim' : 'Contact'}</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Bakiye' : 'Balance'}</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Kayit' : 'Created'}</th>
                {canManage && <th className="text-right px-4 py-3 font-medium text-[var(--text-2)]" />}
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id} className="border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--text-1)]">{c.name}</div>
                    {c.taxNumber && <div className="text-xs text-[var(--text-3)]">VKN: {c.taxNumber}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge-info text-xs px-2 py-0.5 rounded-full border">{CUSTOMER_TYPE_LABELS[c.customerType]}</span>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-3)]">
                    <div className="flex flex-col gap-0.5">
                      {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                      {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[var(--text-2)]">{TRY_FMT(c.balance)}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-3)]">{DATE_FMT(c.createdAt)}</td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded-md hover:bg-[var(--bg)] text-[var(--text-3)] hover:text-indigo-500 transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(c)} className="p-1.5 rounded-md hover:bg-[var(--bg)] text-[var(--text-3)] hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(creating || editing) && (
        <DraggableModal
          title={editing ? (tr ? 'Musteri Duzenle' : 'Edit Customer') : (tr ? 'Yeni Musteri' : 'New Customer')}
          subtitle={editing ? editing.name : undefined}
          icon={<Building2 className="w-5 h-5 text-indigo-500" />}
          onClose={() => { setCreating(false); setEditing(null) }}
          width={520}
          footer={
            <div className="flex justify-end gap-2">
              <button onClick={() => { setCreating(false); setEditing(null) }} className="px-4 py-2 rounded-lg text-sm text-[var(--text-2)] hover:bg-[var(--surface)] transition-colors">
                {tr ? 'Iptal' : 'Cancel'}
              </button>
              <button onClick={handleSave} disabled={saving || !form.name} className="px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 disabled:opacity-50 transition-colors">
                {saving ? (tr ? 'Kaydediliyor...' : 'Saving...') : (tr ? 'Kaydet' : 'Save')}
              </button>
            </div>
          }
        >
          <div className="space-y-3 p-1">
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Musteri Adi *' : 'Customer Name *'}</label>
              <input className="input w-full" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Vergi No' : 'Tax Number'}</label>
                <input className="input w-full" value={form.taxNumber} onChange={e => setForm({ ...form, taxNumber: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Musteri Tipi' : 'Customer Type'}</label>
                <select className="select w-full" value={form.customerType} onChange={e => setForm({ ...form, customerType: e.target.value as CustomerType })}>
                  {Object.entries(CUSTOMER_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Telefon' : 'Phone'}</label>
                <input className="input w-full" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">E-posta</label>
                <input className="input w-full" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Adres' : 'Address'}</label>
              <textarea className="input w-full h-16" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Kredi Limiti' : 'Credit Limit'}</label>
                <input className="input w-full" type="number" value={form.creditLimit} onChange={e => setForm({ ...form, creditLimit: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Vade (gun)' : 'Payment Terms (days)'}</label>
                <input className="input w-full" type="number" value={form.paymentTermDays} onChange={e => setForm({ ...form, paymentTermDays: e.target.value })} />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isEInvoiceCustomer} onChange={e => setForm({ ...form, isEInvoiceCustomer: e.target.checked })} className="rounded" />
              <span className="text-sm text-[var(--text-2)]">{tr ? 'E-Fatura Mukellifi' : 'E-Invoice Customer'}</span>
            </label>
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Notlar' : 'Notes'}</label>
              <textarea className="input w-full h-16" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
        </DraggableModal>
      )}
    </div>
  )
}
