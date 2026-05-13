import { useState } from 'react'
import { Plus, Search, Eye, Check, Send, X, Trash2, Settings, FileSpreadsheet } from 'lucide-react'
import clsx from 'clsx'
import {
  useEInvoices, useCustomers, createEInvoice, approveEInvoice, sendEInvoice, cancelEInvoice,
  useEInvoiceConfig, saveEInvoiceConfig,
} from '../../lib/erp-hooks'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import DraggableModal from '../ui/DraggableModal'
import type { EInvoice, EInvoiceType, EInvoiceStatus } from '../../types/erp'
import { EINVOICE_STATUS_LABELS, EINVOICE_STATUS_STYLES, EINVOICE_TYPE_LABELS, TRY_FMT, DATE_FMT, DATE_CELL, toISO } from '../../types/erp'
import { exportToExcel } from '../../lib/excelExport'

const MANAGER_ROLES = ['PLATFORM_ADMIN', 'SUPER_ADMIN', 'GENEL_MUDUR', 'GM_YARDIMCISI', 'DIREKTOR', 'MUDUR']

interface InvoiceLineForm { productName: string; unit: string; quantity: string; unitPrice: string; taxRate: string }
const EMPTY_LINE: InvoiceLineForm = { productName: '', unit: 'ADET', quantity: '1', unitPrice: '0', taxRate: '20' }

export default function EInvoiceTab() {
  const { user } = useAuth()
  const { lang } = useLanguage()
  const canManage = MANAGER_ROLES.includes(user?.role?.toUpperCase() ?? '')
  const tr = lang === 'tr'

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [directionFilter, setDirectionFilter] = useState<'' | 'GIDEN' | 'GELEN'>('')
  const { invoices, loading, refetch } = useEInvoices({ search: search || undefined, status: statusFilter || undefined, direction: directionFilter || undefined })
  const { customers } = useCustomers()
  const { config: einvoiceConfig, refetch: refetchConfig } = useEInvoiceConfig()

  const [creating, setCreating] = useState(false)
  const [viewing, setViewing] = useState<EInvoice | null>(null)
  const [configOpen, setConfigOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [invoiceDirection, setInvoiceDirection] = useState<'GIDEN' | 'GELEN'>('GIDEN')
  const [invoiceType, setInvoiceType] = useState<EInvoiceType>('SATIS')
  const [customerId, setCustomerId] = useState('')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [addToStock, setAddToStock] = useState(false)
  const [lines, setLines] = useState<InvoiceLineForm[]>([{ ...EMPTY_LINE }])

  // Filter customers based on direction
  const filteredCustomers = invoiceDirection === 'GELEN'
    ? customers.filter(c => ['TEDARIKCI', 'HER_IKISI'].includes(c.customerType))
    : customers

  const [cfgIntegrator, setCfgIntegrator] = useState('')
  const [cfgApiUrl, setCfgApiUrl] = useState('')
  const [cfgAlias, setCfgAlias] = useState('')
  const [cfgTestMode, setCfgTestMode] = useState(true)

  const addLine = () => setLines([...lines, { ...EMPTY_LINE }])
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i))
  const updateLine = (i: number, field: keyof InvoiceLineForm, value: string) => {
    const next = [...lines]
    next[i] = { ...next[i], [field]: value }
    setLines(next)
  }

  const handleCreate = async () => {
    setSaving(true)
    try {
      await createEInvoice({
        type: invoiceType,
        direction: invoiceDirection,
        customerId,
        issueDate: toISO(issueDate),
        notes: notes || undefined,
        lines: lines.filter(l => l.productName).map(l => ({
          productName: l.productName,
          unit: l.unit,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
          taxRate: Number(l.taxRate),
        })),
      })
      setCreating(false)
      setCustomerId('')
      setNotes('')
      setLines([{ ...EMPTY_LINE }])
      refetch()
    } catch (e: any) { alert(e.message) }
    finally { setSaving(false) }
  }

  const handleAction = async (inv: EInvoice, action: 'approve' | 'send' | 'cancel') => {
    try {
      if (action === 'approve') await approveEInvoice(inv.id)
      else if (action === 'send') await sendEInvoice(inv.id)
      else await cancelEInvoice(inv.id)
      setViewing(null)
      refetch()
    } catch (e: any) { alert(e.message) }
  }

  const openConfig = () => {
    setCfgIntegrator(einvoiceConfig?.integratorType ?? 'FORIBA')
    setCfgApiUrl(einvoiceConfig?.integratorApiUrl ?? '')
    setCfgAlias(einvoiceConfig?.senderAlias ?? '')
    setCfgTestMode(einvoiceConfig?.testMode ?? true)
    setConfigOpen(true)
  }

  const handleSaveConfig = async () => {
    try {
      await saveEInvoiceConfig({
        integratorType: cfgIntegrator,
        integratorApiUrl: cfgApiUrl || null,
        senderAlias: cfgAlias || null,
        testMode: cfgTestMode,
      })
      setConfigOpen(false)
      refetchConfig()
    } catch (e: any) { alert(e.message) }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-4)]" />
          <input className="input pl-9 w-full" placeholder={tr ? 'Fatura ara...' : 'Search invoices...'} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-0.5 p-0.5 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
          <button onClick={() => setDirectionFilter('')} className={clsx('px-3 py-1.5 rounded-md text-xs font-medium transition-colors', !directionFilter ? 'bg-emerald-500 text-white' : 'text-[var(--text-3)] hover:text-[var(--text-1)]')}>{tr ? 'Tumu' : 'All'}</button>
          <button onClick={() => setDirectionFilter('GIDEN')} className={clsx('px-3 py-1.5 rounded-md text-xs font-medium transition-colors', directionFilter === 'GIDEN' ? 'bg-blue-500 text-white' : 'text-[var(--text-3)] hover:text-[var(--text-1)]')}>{tr ? 'Giden' : 'Out'}</button>
          <button onClick={() => setDirectionFilter('GELEN')} className={clsx('px-3 py-1.5 rounded-md text-xs font-medium transition-colors', directionFilter === 'GELEN' ? 'bg-amber-500 text-white' : 'text-[var(--text-3)] hover:text-[var(--text-1)]')}>{tr ? 'Gelen' : 'In'}</button>
        </div>
        <select className="select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">{tr ? 'Tum Durumlar' : 'All'}</option>
          {Object.entries(EINVOICE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={() => exportToExcel({
          filename: `efaturalar_${new Date().toISOString().slice(0, 10)}.xlsx`,
          sheetName: 'E-Faturalar',
          columns: [
            { header: 'Fatura No', accessor: (i: any) => i.invoiceNumber, width: 16 },
            { header: 'Alici', accessor: (i: any) => i.receiverName, width: 24 },
            { header: 'Tip', accessor: (i: any) => EINVOICE_TYPE_LABELS[i.type as keyof typeof EINVOICE_TYPE_LABELS] ?? i.type, width: 12 },
            { header: 'Durum', accessor: (i: any) => EINVOICE_STATUS_LABELS[i.status as keyof typeof EINVOICE_STATUS_LABELS] ?? i.status, width: 14 },
            { header: 'Tutar', accessor: (i: any) => Number(i.totalAmount) || 0, width: 14 },
            { header: 'Tarih', accessor: (i: any) => DATE_CELL(i.issueDate), width: 12 },
          ],
          rows: invoices,
        })} className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface)] text-[var(--text-3)]" title="Excel">
          <FileSpreadsheet className="w-4 h-4" />
        </button>
        {canManage && (
          <>
            <button onClick={openConfig} className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface)] text-[var(--text-3)]">
              <Settings className="w-4 h-4" />
            </button>
            <button onClick={() => { setInvoiceDirection('GIDEN'); setCreating(true) }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600">
              <Plus className="w-4 h-4" />
              {tr ? 'Satis Faturasi' : 'Sales Invoice'}
            </button>
            <button onClick={() => { setInvoiceDirection('GELEN'); setAddToStock(false); setCreating(true) }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600">
              <Plus className="w-4 h-4" />
              {tr ? 'Alis Faturasi' : 'Purchase Invoice'}
            </button>
          </>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--text-3)]">{tr ? 'Yukleniyor...' : 'Loading...'}</div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-3)]">{tr ? 'Fatura bulunamadi' : 'No invoices found'}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Fatura No' : 'Invoice #'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Alici' : 'Receiver'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Tip' : 'Type'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Durum' : 'Status'}</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Tutar' : 'Total'}</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Tarih' : 'Date'}</th>
                <th className="text-right px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} className="border-b border-[var(--border)] hover:bg-[var(--surface)] cursor-pointer" onClick={() => setViewing(inv)}>
                  <td className="px-4 py-3 font-mono text-[var(--text-1)]">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3 text-[var(--text-2)]">{inv.receiverName}</td>
                  <td className="px-4 py-3 text-xs text-[var(--text-3)]">{EINVOICE_TYPE_LABELS[inv.type]}</td>
                  <td className="px-4 py-3"><span className={clsx('text-xs px-2 py-0.5 rounded-full border', EINVOICE_STATUS_STYLES[inv.status])}>{EINVOICE_STATUS_LABELS[inv.status]}</span></td>
                  <td className="px-4 py-3 text-right font-mono text-[var(--text-1)]">{TRY_FMT(inv.totalAmount)}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-3)]">{DATE_FMT(inv.issueDate)}</td>
                  <td className="px-4 py-3 text-right"><Eye className="w-4 h-4 text-[var(--text-4)]" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <DraggableModal
          title={invoiceDirection === 'GELEN' ? (tr ? 'Yeni Alis Faturasi' : 'New Purchase Invoice') : (tr ? 'Yeni Satis Faturasi' : 'New Sales Invoice')}
          onClose={() => setCreating(false)}
          width={680}
          footer={
            <div className="flex gap-2 justify-end">
              <button onClick={() => setCreating(false)} className="px-4 py-2 rounded-lg text-sm text-[var(--text-2)] hover:bg-[var(--surface)]">{tr ? 'Iptal' : 'Cancel'}</button>
              <button onClick={handleCreate} disabled={saving || !customerId} className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-50">
                {saving ? (tr ? 'Kaydediliyor...' : 'Saving...') : (tr ? 'Olustur' : 'Create')}
              </button>
            </div>
          }
        >
          <div className="space-y-4 px-5 py-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Fatura Tipi' : 'Type'}</label>
                <select className="select w-full" value={invoiceType} onChange={e => setInvoiceType(e.target.value as EInvoiceType)}>
                  {Object.entries(EINVOICE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{invoiceDirection === 'GELEN' ? (tr ? 'Tedarikci *' : 'Supplier *') : (tr ? 'Musteri *' : 'Customer *')}</label>
                <select className="select w-full" value={customerId} onChange={e => setCustomerId(e.target.value)}>
                  <option value="">{tr ? 'Sec...' : 'Select...'}</option>
                  {filteredCustomers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Fatura Tarihi' : 'Issue Date'}</label>
                <input className="input w-full" type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-[var(--text-2)]">{tr ? 'Kalemler' : 'Lines'}</label>
                <button onClick={addLine} className="text-xs text-emerald-500 font-medium">+ {tr ? 'Kalem Ekle' : 'Add Line'}</button>
              </div>
              <div className="space-y-2">
                {lines.map((l, i) => (
                  <div key={i} className="grid grid-cols-[1fr_70px_70px_70px_70px_32px] gap-2 items-end">
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
                      {i === 0 && <label className="text-[10px] text-[var(--text-3)] mb-0.5 block">KDV %</label>}
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
              <textarea className="input w-full h-14" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>
        </DraggableModal>
      )}

      {viewing && (
        <DraggableModal
          title={viewing.invoiceNumber}
          subtitle={viewing.receiverName}
          onClose={() => setViewing(null)}
          width={600}
          footer={
            canManage ? (
              <div className="flex gap-2 justify-end">
                {viewing.status === 'TASLAK' && (
                  <button onClick={() => handleAction(viewing, 'approve')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-sm hover:bg-blue-600">
                    <Check className="w-3.5 h-3.5" />{tr ? 'Onayla' : 'Approve'}
                  </button>
                )}
                {viewing.status === 'ONAYLANDI' && (
                  <button onClick={() => handleAction(viewing, 'send')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-sm hover:bg-indigo-600">
                    <Send className="w-3.5 h-3.5" />{tr ? 'Gonder' : 'Send'}
                  </button>
                )}
                {['TASLAK', 'ONAYLANDI'].includes(viewing.status) && (
                  <button onClick={() => handleAction(viewing, 'cancel')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm hover:bg-red-600">
                    <X className="w-3.5 h-3.5" />{tr ? 'Iptal' : 'Cancel'}
                  </button>
                )}
              </div>
            ) : undefined
          }
        >
          <div className="space-y-3 px-5 py-4">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className={clsx('px-2 py-0.5 rounded-full border text-xs', EINVOICE_STATUS_STYLES[viewing.status])}>{EINVOICE_STATUS_LABELS[viewing.status]}</span>
              <span className="text-[var(--text-3)]">{EINVOICE_TYPE_LABELS[viewing.type]}</span>
              <span className="text-[var(--text-3)]">{DATE_FMT(viewing.issueDate)}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-[var(--text-3)]">{tr ? 'Gonderen:' : 'From:'}</span> <span className="text-[var(--text-1)]">{viewing.senderName}</span></div>
              <div><span className="text-[var(--text-3)]">{tr ? 'Alici:' : 'To:'}</span> <span className="text-[var(--text-1)]">{viewing.receiverName}</span></div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
                    <th className="text-left px-3 py-2 text-xs font-medium text-[var(--text-3)]">{tr ? 'Urun' : 'Product'}</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-[var(--text-3)]">{tr ? 'Miktar' : 'Qty'}</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-[var(--text-3)]">{tr ? 'Fiyat' : 'Price'}</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-[var(--text-3)]">KDV</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-[var(--text-3)]">{tr ? 'Toplam' : 'Total'}</th>
                  </tr>
                </thead>
                <tbody>
                  {viewing.lines.map(l => (
                    <tr key={l.id} className="border-b border-[var(--border)]">
                      <td className="px-3 py-2">{l.productName}</td>
                      <td className="px-3 py-2 text-right">{l.quantity} {l.unit}</td>
                      <td className="px-3 py-2 text-right font-mono">{TRY_FMT(l.unitPrice)}</td>
                      <td className="px-3 py-2 text-right">%{l.taxRate}</td>
                      <td className="px-3 py-2 text-right font-mono font-medium">{TRY_FMT(l.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[var(--surface)]">
                    <td colSpan={3} />
                    <td className="px-3 py-1.5 text-right text-xs text-[var(--text-3)]">KDV</td>
                    <td className="px-3 py-1.5 text-right font-mono">{TRY_FMT(viewing.taxAmount)}</td>
                  </tr>
                  <tr className="bg-[var(--surface)] font-bold">
                    <td colSpan={3} />
                    <td className="px-3 py-1.5 text-right text-xs">{tr ? 'TOPLAM' : 'TOTAL'}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{TRY_FMT(viewing.totalAmount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </DraggableModal>
      )}

      {configOpen && (
        <DraggableModal
          title={tr ? 'E-Fatura Ayarlari' : 'E-Invoice Settings'}
          icon={<Settings className="w-5 h-5 text-emerald-500" />}
          onClose={() => setConfigOpen(false)}
          width={520}
          footer={
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfigOpen(false)} className="px-4 py-2 rounded-lg text-sm text-[var(--text-2)] hover:bg-[var(--surface)]">{tr ? 'Iptal' : 'Cancel'}</button>
              <button onClick={handleSaveConfig} className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600">{tr ? 'Kaydet' : 'Save'}</button>
            </div>
          }
        >
          <div className="space-y-3 px-5 py-4">
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Entegrator' : 'Integrator'}</label>
              <select className="select w-full" value={cfgIntegrator} onChange={e => setCfgIntegrator(e.target.value)}>
                <option value="FORIBA">Foriba</option>
                <option value="PARABUS">Parabus</option>
                <option value="LOGO">Logo</option>
                <option value="CUSTOM">Ozel</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">API URL</label>
              <input className="input w-full" value={cfgApiUrl} onChange={e => setCfgApiUrl(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Gonderici Alias' : 'Sender Alias'}</label>
              <input className="input w-full" value={cfgAlias} onChange={e => setCfgAlias(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={cfgTestMode} onChange={e => setCfgTestMode(e.target.checked)} className="rounded" />
              <span className="text-sm text-[var(--text-2)]">{tr ? 'Test Modu' : 'Test Mode'}</span>
            </label>
          </div>
        </DraggableModal>
      )}
    </div>
  )
}
