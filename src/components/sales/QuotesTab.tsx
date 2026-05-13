import { useState } from 'react'
import { Plus, Search, Eye, Send, Check, X, ShoppingCart, Trash2, FileSpreadsheet, FileText } from 'lucide-react'
import clsx from 'clsx'
import { useQuotes, useCustomers, createQuote, sendQuote, approveQuote, rejectQuote, quoteToOrder, deleteQuote } from '../../lib/erp-hooks'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import DraggableModal from '../ui/DraggableModal'
import { TRY_FMT, DATE_FMT, DATE_CELL, toISO } from '../../types/erp'
import { exportToExcel } from '../../lib/excelExport'

const MANAGER_ROLES = ['PLATFORM_ADMIN', 'SUPER_ADMIN', 'GENEL_MUDUR', 'GM_YARDIMCISI', 'DIREKTOR', 'MUDUR']

const STATUS_LABELS: Record<string, string> = {
  TASLAK: 'Taslak', GONDERILDI: 'Gonderildi', ONAYLANDI: 'Onaylandi',
  REDDEDILDI: 'Reddedildi', IPTAL: 'Iptal', SIPARISE_DONUSTU: 'Siparise Donustu',
}
const STATUS_STYLES: Record<string, string> = {
  TASLAK: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  GONDERILDI: 'bg-blue-50 text-blue-700 border-blue-200',
  ONAYLANDI: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REDDEDILDI: 'bg-red-50 text-red-700 border-red-200',
  IPTAL: 'bg-red-50 text-red-500 border-red-200',
  SIPARISE_DONUSTU: 'bg-indigo-50 text-indigo-700 border-indigo-200',
}

interface LineForm { productName: string; unit: string; quantity: string; unitPrice: string; discountPercent: string; taxRate: string }
const EMPTY_LINE: LineForm = { productName: '', unit: 'ADET', quantity: '1', unitPrice: '0', discountPercent: '0', taxRate: '20' }

export default function QuotesTab() {
  const { user } = useAuth()
  const { lang } = useLanguage()
  const canManage = MANAGER_ROLES.includes(user?.role?.toUpperCase() ?? '')
  const tr = lang === 'tr'

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const { quotes, loading, refetch } = useQuotes({ search: search || undefined, status: statusFilter || undefined })
  const { customers } = useCustomers()

  const [creating, setCreating] = useState(false)
  const [viewing, setViewing] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  const [customerId, setCustomerId] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<LineForm[]>([{ ...EMPTY_LINE }])

  const addLine = () => setLines([...lines, { ...EMPTY_LINE }])
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i))
  const updateLine = (i: number, field: keyof LineForm, value: string) => {
    const next = [...lines]; next[i] = { ...next[i], [field]: value }; setLines(next)
  }

  const lineTotal = (l: LineForm) => {
    const qty = Number(l.quantity) || 0, price = Number(l.unitPrice) || 0, disc = Number(l.discountPercent) || 0, tax = Number(l.taxRate) || 0
    const base = qty * price * (1 - disc / 100)
    return base + base * tax / 100
  }
  const total = lines.reduce((s, l) => s + lineTotal(l), 0)

  const handleCreate = async () => {
    setSaving(true)
    try {
      await createQuote({
        customerId, validUntil: validUntil ? toISO(validUntil) : undefined, notes: notes || undefined,
        lines: lines.filter(l => l.productName).map(l => ({
          productName: l.productName, unit: l.unit, quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice), discountPercent: Number(l.discountPercent) || 0, taxRate: Number(l.taxRate) || 20,
        })),
      })
      setCreating(false); setCustomerId(''); setNotes(''); setValidUntil(''); setLines([{ ...EMPTY_LINE }]); refetch()
    } catch (e: any) { alert(e.message) }
    finally { setSaving(false) }
  }

  const handleAction = async (id: string, action: string) => {
    try {
      if (action === 'send') await sendQuote(id)
      else if (action === 'approve') await approveQuote(id)
      else if (action === 'reject') await rejectQuote(id)
      else if (action === 'to-order') await quoteToOrder(id)
      else if (action === 'delete') { if (!confirm(tr ? 'Teklifi silmek istiyor musunuz?' : 'Delete this quote?')) return; await deleteQuote(id) }
      setViewing(null); refetch()
    } catch (e: any) { alert(e.message) }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-4)]" />
          <input className="input pl-9 w-full" placeholder={tr ? 'Teklif ara...' : 'Search quotes...'} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">{tr ? 'Tum Durumlar' : 'All'}</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={() => exportToExcel({
          filename: `teklifler_${new Date().toISOString().slice(0, 10)}.xlsx`, sheetName: 'Teklifler',
          columns: [
            { header: 'Teklif No', accessor: (q: any) => q.quoteNumber, width: 16 },
            { header: 'Musteri', accessor: (q: any) => q.customer?.name ?? '', width: 24 },
            { header: 'Durum', accessor: (q: any) => STATUS_LABELS[q.status] ?? q.status, width: 16 },
            { header: 'Tutar', accessor: (q: any) => Number(q.totalAmount) || 0, width: 14 },
            { header: 'Tarih', accessor: (q: any) => DATE_CELL(q.createdAt), width: 12 },
          ], rows: quotes,
        })} className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface)] text-[var(--text-3)]" title="Excel">
          <FileSpreadsheet className="w-4 h-4" />
        </button>
        {canManage && (
          <button onClick={() => setCreating(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600">
            <Plus className="w-4 h-4" />{tr ? 'Yeni Teklif' : 'New Quote'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--text-3)]">{tr ? 'Yukleniyor...' : 'Loading...'}</div>
      ) : quotes.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-3)]">{tr ? 'Teklif bulunamadi' : 'No quotes found'}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Teklif No' : 'Quote #'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Musteri' : 'Customer'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Durum' : 'Status'}</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Tutar' : 'Total'}</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Gecerlilik' : 'Valid Until'}</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Tarih' : 'Date'}</th>
                <th className="text-right px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {quotes.map((q: any) => (
                <tr key={q.id} className="border-b border-[var(--border)] hover:bg-[var(--surface)] cursor-pointer" onClick={() => setViewing(q)}>
                  <td className="px-4 py-3 font-mono text-[var(--text-1)]">{q.quoteNumber}</td>
                  <td className="px-4 py-3 text-[var(--text-2)]">{q.customer?.name ?? '-'}</td>
                  <td className="px-4 py-3"><span className={clsx('text-xs px-2 py-0.5 rounded-full border', STATUS_STYLES[q.status])}>{STATUS_LABELS[q.status]}</span></td>
                  <td className="px-4 py-3 text-right font-mono text-[var(--text-1)]">{TRY_FMT(q.totalAmount)}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-3)]">{DATE_FMT(q.validUntil)}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-3)]">{DATE_FMT(q.createdAt)}</td>
                  <td className="px-4 py-3 text-right"><Eye className="w-4 h-4 text-[var(--text-4)]" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {creating && (
        <DraggableModal title={tr ? 'Yeni Teklif' : 'New Quote'} icon={<FileText className="w-5 h-5 text-indigo-500" />} onClose={() => setCreating(false)} width={680}
          footer={
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-[var(--text-1)]">{tr ? 'Toplam' : 'Total'}: {TRY_FMT(total)}</div>
              <div className="flex gap-2">
                <button onClick={() => setCreating(false)} className="px-4 py-2 rounded-lg text-sm text-[var(--text-2)] hover:bg-[var(--surface)]">{tr ? 'Iptal' : 'Cancel'}</button>
                <button onClick={handleCreate} disabled={saving || !customerId || lines.every(l => !l.productName)} className="px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium disabled:opacity-50">
                  {saving ? (tr ? 'Kaydediliyor...' : 'Saving...') : (tr ? 'Olustur' : 'Create')}
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 px-5 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Musteri *' : 'Customer *'}</label>
                <select className="select w-full" value={customerId} onChange={e => setCustomerId(e.target.value)}>
                  <option value="">{tr ? 'Musteri secin...' : 'Select...'}</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Gecerlilik Tarihi' : 'Valid Until'}</label>
                <input className="input w-full" type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-[var(--text-2)]">{tr ? 'Kalemler' : 'Line Items'}</label>
                <button onClick={addLine} className="text-xs text-indigo-500 hover:text-indigo-600 font-medium">+ {tr ? 'Kalem Ekle' : 'Add Line'}</button>
              </div>
              <div className="space-y-2">
                {lines.map((l, i) => (
                  <div key={i} className="grid grid-cols-[1fr_70px_70px_70px_60px_60px_32px] gap-2 items-end">
                    <div>
                      {i === 0 && <label className="text-[10px] text-[var(--text-3)] mb-0.5 block">{tr ? 'Urun' : 'Product'}</label>}
                      <input className="input w-full" value={l.productName} onChange={e => updateLine(i, 'productName', e.target.value)} />
                    </div>
                    <div>
                      {i === 0 && <label className="text-[10px] text-[var(--text-3)] mb-0.5 block">{tr ? 'Birim' : 'Unit'}</label>}
                      <input className="input w-full" value={l.unit} onChange={e => updateLine(i, 'unit', e.target.value)} />
                    </div>
                    <div>
                      {i === 0 && <label className="text-[10px] text-[var(--text-3)] mb-0.5 block">{tr ? 'Adet' : 'Qty'}</label>}
                      <input className="input w-full" type="number" value={l.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)} />
                    </div>
                    <div>
                      {i === 0 && <label className="text-[10px] text-[var(--text-3)] mb-0.5 block">{tr ? 'Fiyat' : 'Price'}</label>}
                      <input className="input w-full" type="number" value={l.unitPrice} onChange={e => updateLine(i, 'unitPrice', e.target.value)} />
                    </div>
                    <div>
                      {i === 0 && <label className="text-[10px] text-[var(--text-3)] mb-0.5 block">{tr ? 'Isk%' : 'Disc%'}</label>}
                      <input className="input w-full" type="number" value={l.discountPercent} onChange={e => updateLine(i, 'discountPercent', e.target.value)} />
                    </div>
                    <div>
                      {i === 0 && <label className="text-[10px] text-[var(--text-3)] mb-0.5 block">KDV%</label>}
                      <input className="input w-full" type="number" value={l.taxRate} onChange={e => updateLine(i, 'taxRate', e.target.value)} />
                    </div>
                    <button onClick={() => removeLine(i)} className="p-1.5 rounded-md hover:bg-red-50 text-[var(--text-4)] hover:text-red-500" disabled={lines.length === 1}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Notlar' : 'Notes'}</label>
              <textarea className="input w-full h-16" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>
        </DraggableModal>
      )}

      {/* Detail Modal */}
      {viewing && (
        <DraggableModal title={viewing.quoteNumber} subtitle={viewing.customer?.name} icon={<FileText className="w-5 h-5 text-indigo-500" />} onClose={() => setViewing(null)} width={640}
          footer={
            canManage ? (
              <div className="flex gap-2 justify-end">
                {viewing.status === 'TASLAK' && (
                  <>
                    <button onClick={() => handleAction(viewing.id, 'send')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-sm hover:bg-blue-600">
                      <Send className="w-3.5 h-3.5" />{tr ? 'Gonder' : 'Send'}
                    </button>
                    <button onClick={() => handleAction(viewing.id, 'delete')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm hover:bg-red-600">
                      <Trash2 className="w-3.5 h-3.5" />{tr ? 'Sil' : 'Delete'}
                    </button>
                  </>
                )}
                {['TASLAK', 'GONDERILDI'].includes(viewing.status) && (
                  <>
                    <button onClick={() => handleAction(viewing.id, 'approve')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-sm hover:bg-emerald-600">
                      <Check className="w-3.5 h-3.5" />{tr ? 'Onayla' : 'Approve'}
                    </button>
                    <button onClick={() => handleAction(viewing.id, 'reject')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm hover:bg-red-600">
                      <X className="w-3.5 h-3.5" />{tr ? 'Reddet' : 'Reject'}
                    </button>
                  </>
                )}
                {['TASLAK', 'GONDERILDI', 'ONAYLANDI'].includes(viewing.status) && (
                  <button onClick={() => handleAction(viewing.id, 'to-order')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-sm hover:bg-indigo-600">
                    <ShoppingCart className="w-3.5 h-3.5" />{tr ? 'Siparise Donustur' : 'Convert to Order'}
                  </button>
                )}
              </div>
            ) : undefined
          }
        >
          <div className="space-y-4 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className={clsx('text-xs px-2 py-0.5 rounded-full border', STATUS_STYLES[viewing.status])}>{STATUS_LABELS[viewing.status]}</span>
              <span className="text-sm text-[var(--text-3)]">{DATE_FMT(viewing.createdAt)}</span>
              {viewing.validUntil && <span className="text-sm text-[var(--text-3)]">{tr ? 'Gecerlilik' : 'Valid'}: {DATE_FMT(viewing.validUntil)}</span>}
            </div>
            <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
                    <th className="text-left px-3 py-2 text-xs font-medium text-[var(--text-3)]">{tr ? 'Urun' : 'Product'}</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-[var(--text-3)]">{tr ? 'Miktar' : 'Qty'}</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-[var(--text-3)]">{tr ? 'Fiyat' : 'Price'}</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-[var(--text-3)]">{tr ? 'Toplam' : 'Total'}</th>
                  </tr>
                </thead>
                <tbody>
                  {viewing.lines?.map((l: any) => (
                    <tr key={l.id} className="border-b border-[var(--border)]">
                      <td className="px-3 py-2 text-[var(--text-1)]">{l.productName}</td>
                      <td className="px-3 py-2 text-right text-[var(--text-2)]">{l.quantity} {l.unit}</td>
                      <td className="px-3 py-2 text-right font-mono text-[var(--text-2)]">{TRY_FMT(l.unitPrice)}</td>
                      <td className="px-3 py-2 text-right font-mono text-[var(--text-1)]">{TRY_FMT(l.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[var(--surface)]">
                    <td colSpan={3} className="px-3 py-2 text-right font-medium">{tr ? 'Genel Toplam' : 'Total'}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-[var(--text-1)]">{TRY_FMT(viewing.totalAmount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {viewing.notes && <div><h4 className="text-xs font-medium text-[var(--text-2)] mb-1">{tr ? 'Notlar' : 'Notes'}</h4><p className="text-sm text-[var(--text-3)]">{viewing.notes}</p></div>}
          </div>
        </DraggableModal>
      )}
    </div>
  )
}
