import { useState } from 'react'
import { Plus, Search, Eye, Check, X, Package, Trash2, FileSpreadsheet } from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import clsx from 'clsx'
import {
  useOrders, useCustomers, createOrder, approveOrder, completeOrder, cancelOrder, createPayment,
} from '../../lib/erp-hooks'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import DraggableModal from '../ui/DraggableModal'
import type { SalesOrder, OrderStatus, PaymentMethod } from '../../types/erp'
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES, PAYMENT_METHOD_LABELS, TRY_FMT, DATE_FMT, DATE_CELL } from '../../types/erp'
import { exportToExcel } from '../../lib/excelExport'

const CHART_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#94a3b8']

const MANAGER_ROLES = ['PLATFORM_ADMIN', 'SUPER_ADMIN', 'GENEL_MUDUR', 'GM_YARDIMCISI', 'DIREKTOR', 'MUDUR']

interface OrderLineForm {
  productName: string; unit: string; quantity: string; unitPrice: string; discountPercent: string
}

const EMPTY_LINE: OrderLineForm = { productName: '', unit: 'ADET', quantity: '1', unitPrice: '0', discountPercent: '0' }

export default function OrdersTab() {
  const { user } = useAuth()
  const { lang } = useLanguage()
  const canManage = MANAGER_ROLES.includes(user?.role?.toUpperCase() ?? '')
  const tr = lang === 'tr'

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const { orders, loading, refetch } = useOrders({ search: search || undefined, status: statusFilter || undefined })
  const { customers } = useCustomers()

  const [creating, setCreating] = useState(false)
  const [viewing, setViewing] = useState<SalesOrder | null>(null)
  const [payingOrder, setPayingOrder] = useState<SalesOrder | null>(null)

  const [customerId, setCustomerId] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<OrderLineForm[]>([{ ...EMPTY_LINE }])
  const [saving, setSaving] = useState(false)

  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState<PaymentMethod>('NAKIT')
  const [payRef, setPayRef] = useState('')

  const addLine = () => setLines([...lines, { ...EMPTY_LINE }])
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i))
  const updateLine = (i: number, field: keyof OrderLineForm, value: string) => {
    const next = [...lines]
    next[i] = { ...next[i], [field]: value }
    setLines(next)
  }

  const lineTotal = (l: OrderLineForm) => {
    const qty = Number(l.quantity) || 0
    const price = Number(l.unitPrice) || 0
    const disc = Number(l.discountPercent) || 0
    return qty * price * (1 - disc / 100)
  }

  const orderTotal = lines.reduce((sum, l) => sum + lineTotal(l), 0)

  const handleCreate = async () => {
    setSaving(true)
    try {
      await createOrder({
        customerId,
        notes: notes || undefined,
        items: lines.filter(l => l.productName).map(l => ({
          productName: l.productName,
          unit: l.unit,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
          discountPercent: Number(l.discountPercent) || 0,
        })),
      })
      setCreating(false)
      setCustomerId('')
      setNotes('')
      setLines([{ ...EMPTY_LINE }])
      refetch()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  // Complete order state
  const [completingOrder, setCompletingOrder] = useState<SalesOrder | null>(null)
  const [completeMethod, setCompleteMethod] = useState<PaymentMethod>('NAKIT')
  const [completeAmount, setCompleteAmount] = useState('')

  const handleAction = async (order: SalesOrder, action: 'approve' | 'complete' | 'cancel') => {
    if (action === 'complete') {
      setCompletingOrder(order)
      setCompleteAmount(String(Number(order.totalAmount) || 0))
      setCompleteMethod('NAKIT')
      return
    }
    const confirmMsg = action === 'cancel' ? 'Siparisi iptal etmek istediginizden emin misiniz?' : undefined
    if (confirmMsg && !confirm(confirmMsg)) return
    try {
      if (action === 'approve') await approveOrder(order.id)
      else await cancelOrder(order.id)
      setViewing(null)
      refetch()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleCompleteOrder = async () => {
    if (!completingOrder) return
    try {
      await completeOrder(completingOrder.id, {
        paymentMethod: completeMethod,
        paymentAmount: Number(completeAmount) || 0,
      })
      setCompletingOrder(null)
      setViewing(null)
      refetch()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handlePay = async () => {
    if (!payingOrder) return
    try {
      await createPayment({
        orderId: payingOrder.id,
        amount: Number(payAmount),
        method: payMethod,
        reference: payRef || undefined,
      })
      setPayingOrder(null)
      setPayAmount('')
      setPayRef('')
      refetch()
    } catch (e: any) {
      alert(e.message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-4)]" />
          <input className="input pl-9 w-full" placeholder={tr ? 'Siparis ara...' : 'Search orders...'} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">{tr ? 'Tum Durumlar' : 'All Statuses'}</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={() => exportToExcel({
          filename: `siparisler_${new Date().toISOString().slice(0, 10)}.xlsx`,
          sheetName: 'Siparisler',
          columns: [
            { header: 'Siparis No', accessor: (o: any) => o.orderNumber, width: 16 },
            { header: 'Musteri', accessor: (o: any) => o.customer?.name ?? '', width: 24 },
            { header: 'Durum', accessor: (o: any) => ORDER_STATUS_LABELS[o.status as keyof typeof ORDER_STATUS_LABELS] ?? o.status, width: 14 },
            { header: 'Tutar', accessor: (o: any) => Number(o.totalAmount) || 0, width: 14 },
            { header: 'Tarih', accessor: (o: any) => DATE_CELL(o.createdAt), width: 12 },
          ],
          rows: orders,
        })} className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface)] text-[var(--text-3)]" title="Excel">
          <FileSpreadsheet className="w-4 h-4" />
        </button>
        {canManage && (
          <button onClick={() => setCreating(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-colors">
            <Plus className="w-4 h-4" />
            {tr ? 'Yeni Siparis' : 'New Order'}
          </button>
        )}
      </div>

      {orders.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-4">
            <h3 className="font-semibold text-[var(--text-1)] mb-3">{tr ? 'Siparis Durum Dagilimi' : 'Order Status Distribution'}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={Object.entries(orders.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc }, {} as Record<string, number>)).map(([name, value]) => ({ name: ORDER_STATUS_LABELS[name as keyof typeof ORDER_STATUS_LABELS] || name, value }))}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {Object.keys(orders.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc }, {} as Record<string, number>)).map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="card p-4">
            <h3 className="font-semibold text-[var(--text-1)] mb-3">{tr ? 'Aylik Siparis Toplami' : 'Monthly Order Totals'}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={Object.entries(orders.reduce((acc, o) => { const month = o.createdAt?.slice(0, 7) || 'N/A'; acc[month] = (acc[month] || 0) + (Number(o.totalAmount) || 0); return acc }, {} as Record<string, number>)).sort(([a], [b]) => a.localeCompare(b)).map(([month, total]) => ({ month, total }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => TRY_FMT(v)} />
                <Tooltip formatter={(value: number) => TRY_FMT(value)} />
                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-[var(--text-3)]">{tr ? 'Yukleniyor...' : 'Loading...'}</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-3)]">{tr ? 'Siparis bulunamadi' : 'No orders found'}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Siparis No' : 'Order #'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Musteri' : 'Customer'}</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Durum' : 'Status'}</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Tutar' : 'Total'}</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--text-2)]">{tr ? 'Tarih' : 'Date'}</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--text-2)]" />
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} className="border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors cursor-pointer" onClick={() => setViewing(o)}>
                  <td className="px-4 py-3 font-mono text-[var(--text-1)]">{o.orderNumber}</td>
                  <td className="px-4 py-3 text-[var(--text-2)]">{o.customer?.name ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className={clsx('text-xs px-2 py-0.5 rounded-full border', ORDER_STATUS_STYLES[o.status])}>{ORDER_STATUS_LABELS[o.status]}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[var(--text-1)]">{TRY_FMT(o.totalAmount)}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-3)]">{DATE_FMT(o.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="p-1.5 rounded-md hover:bg-[var(--bg)] text-[var(--text-3)] hover:text-indigo-500">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <DraggableModal
          title={tr ? 'Yeni Siparis' : 'New Order'}
          icon={<Package className="w-5 h-5 text-indigo-500" />}
          onClose={() => setCreating(false)}
          width={680}
          footer={
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-[var(--text-1)]">{tr ? 'Toplam' : 'Total'}: {TRY_FMT(orderTotal)}</div>
              <div className="flex gap-2">
                <button onClick={() => setCreating(false)} className="px-4 py-2 rounded-lg text-sm text-[var(--text-2)] hover:bg-[var(--surface)]">{tr ? 'Iptal' : 'Cancel'}</button>
                <button onClick={handleCreate} disabled={saving || !customerId || lines.every(l => !l.productName)} className="px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 disabled:opacity-50">
                  {saving ? (tr ? 'Kaydediliyor...' : 'Saving...') : (tr ? 'Olustur' : 'Create')}
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 px-5 py-4">
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Musteri *' : 'Customer *'}</label>
              <select className="select w-full" value={customerId} onChange={e => setCustomerId(e.target.value)}>
                <option value="">{tr ? 'Musteri secin...' : 'Select customer...'}</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-[var(--text-2)]">{tr ? 'Kalemler' : 'Line Items'}</label>
                <button onClick={addLine} className="text-xs text-indigo-500 hover:text-indigo-600 font-medium">+ {tr ? 'Kalem Ekle' : 'Add Line'}</button>
              </div>
              <div className="space-y-2">
                {lines.map((l, i) => (
                  <div key={i} className="grid grid-cols-[1fr_80px_80px_80px_80px_32px] gap-2 items-end">
                    <div>
                      {i === 0 && <label className="text-[10px] text-[var(--text-3)] mb-0.5 block">{tr ? 'Urun' : 'Product'}</label>}
                      <input className="input w-full" value={l.productName} onChange={e => updateLine(i, 'productName', e.target.value)} placeholder={tr ? 'Urun adi' : 'Product name'} />
                    </div>
                    <div>
                      {i === 0 && <label className="text-[10px] text-[var(--text-3)] mb-0.5 block">{tr ? 'Birim' : 'Unit'}</label>}
                      <input className="input w-full" value={l.unit} onChange={e => updateLine(i, 'unit', e.target.value)} />
                    </div>
                    <div>
                      {i === 0 && <label className="text-[10px] text-[var(--text-3)] mb-0.5 block">{tr ? 'Miktar' : 'Qty'}</label>}
                      <input className="input w-full" type="number" value={l.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)} />
                    </div>
                    <div>
                      {i === 0 && <label className="text-[10px] text-[var(--text-3)] mb-0.5 block">{tr ? 'Fiyat' : 'Price'}</label>}
                      <input className="input w-full" type="number" value={l.unitPrice} onChange={e => updateLine(i, 'unitPrice', e.target.value)} />
                    </div>
                    <div>
                      {i === 0 && <label className="text-[10px] text-[var(--text-3)] mb-0.5 block">{tr ? 'Isk %' : 'Disc %'}</label>}
                      <input className="input w-full" type="number" value={l.discountPercent} onChange={e => updateLine(i, 'discountPercent', e.target.value)} />
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

      {viewing && (
        <DraggableModal
          title={viewing.orderNumber}
          subtitle={viewing.customer?.name}
          icon={<Package className="w-5 h-5 text-indigo-500" />}
          onClose={() => setViewing(null)}
          width={640}
          footer={
            <div className="flex gap-2 justify-end">
              {viewing.status === 'TASLAK' && canManage && (
                <>
                  <button onClick={() => handleAction(viewing, 'approve')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-sm hover:bg-blue-600">
                    <Check className="w-3.5 h-3.5" />{tr ? 'Onayla' : 'Approve'}
                  </button>
                  <button onClick={() => handleAction(viewing, 'cancel')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm hover:bg-red-600">
                    <X className="w-3.5 h-3.5" />{tr ? 'Iptal Et' : 'Cancel'}
                  </button>
                </>
              )}
              {viewing.status === 'ONAYLANDI' && canManage && (
                <>
                  <button onClick={() => setPayingOrder(viewing)} className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-sm hover:bg-emerald-600">
                    {tr ? 'Odeme Al' : 'Add Payment'}
                  </button>
                  <button onClick={() => handleAction(viewing, 'complete')} className="px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-sm hover:bg-indigo-600">
                    {tr ? 'Tamamla' : 'Complete'}
                  </button>
                </>
              )}
            </div>
          }
        >
          <div className="space-y-4 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className={clsx('text-xs px-2 py-0.5 rounded-full border', ORDER_STATUS_STYLES[viewing.status])}>{ORDER_STATUS_LABELS[viewing.status]}</span>
              <span className="text-sm text-[var(--text-3)]">{DATE_FMT(viewing.createdAt)}</span>
            </div>
            <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
                    <th className="text-left px-3 py-2 text-xs font-medium text-[var(--text-3)]">{tr ? 'Urun' : 'Product'}</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-[var(--text-3)]">{tr ? 'Miktar' : 'Qty'}</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-[var(--text-3)]">{tr ? 'Birim Fiyat' : 'Unit Price'}</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-[var(--text-3)]">{tr ? 'Toplam' : 'Total'}</th>
                  </tr>
                </thead>
                <tbody>
                  {viewing.items.map(item => (
                    <tr key={item.id} className="border-b border-[var(--border)]">
                      <td className="px-3 py-2 text-[var(--text-1)]">{item.productName}</td>
                      <td className="px-3 py-2 text-right text-[var(--text-2)]">{item.quantity} {item.unit}</td>
                      <td className="px-3 py-2 text-right font-mono text-[var(--text-2)]">{TRY_FMT(item.unitPrice)}</td>
                      <td className="px-3 py-2 text-right font-mono text-[var(--text-1)]">{TRY_FMT(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[var(--surface)]">
                    <td colSpan={3} className="px-3 py-2 text-right font-medium text-[var(--text-1)]">{tr ? 'Genel Toplam' : 'Grand Total'}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-[var(--text-1)]">{TRY_FMT(viewing.totalAmount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {viewing.payments.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-[var(--text-2)] mb-2">{tr ? 'Odemeler' : 'Payments'}</h4>
                {viewing.payments.map(p => (
                  <div key={p.id} className="flex justify-between items-center py-1.5 text-sm">
                    <span className="text-[var(--text-2)]">{PAYMENT_METHOD_LABELS[p.method]} - {DATE_FMT(p.paidAt)}</span>
                    <span className="font-mono text-[var(--text-1)]">{TRY_FMT(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
            {viewing.notes && (
              <div>
                <h4 className="text-xs font-medium text-[var(--text-2)] mb-1">{tr ? 'Notlar' : 'Notes'}</h4>
                <p className="text-sm text-[var(--text-3)]">{viewing.notes}</p>
              </div>
            )}
          </div>
        </DraggableModal>
      )}

      {payingOrder && (
        <DraggableModal
          title={tr ? 'Odeme Al' : 'Add Payment'}
          subtitle={payingOrder.orderNumber}
          onClose={() => setPayingOrder(null)}
          width={420}
          footer={
            <div className="flex gap-2 justify-end">
              <button onClick={() => setPayingOrder(null)} className="px-4 py-2 rounded-lg text-sm text-[var(--text-2)] hover:bg-[var(--surface)]">{tr ? 'Iptal' : 'Cancel'}</button>
              <button onClick={handlePay} disabled={!payAmount} className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-50">
                {tr ? 'Odemeyi Kaydet' : 'Save Payment'}
              </button>
            </div>
          }
        >
          <div className="space-y-3 px-5 py-4">
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Tutar *' : 'Amount *'}</label>
              <input className="input w-full" type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Odeme Yontemi' : 'Payment Method'}</label>
              <select className="select w-full" value={payMethod} onChange={e => setPayMethod(e.target.value as PaymentMethod)}>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Referans' : 'Reference'}</label>
              <input className="input w-full" value={payRef} onChange={e => setPayRef(e.target.value)} />
            </div>
          </div>
        </DraggableModal>
      )}
      {/* Complete Order Modal */}
      {completingOrder && (
        <DraggableModal
          title={tr ? 'Siparisi Tamamla' : 'Complete Order'}
          subtitle={completingOrder.orderNumber}
          onClose={() => setCompletingOrder(null)}
          width={420}
          footer={
            <div className="flex gap-2 justify-end">
              <button onClick={() => setCompletingOrder(null)} className="px-4 py-2 rounded-lg text-sm text-[var(--text-2)] hover:bg-[var(--surface)]">{tr ? 'Iptal' : 'Cancel'}</button>
              <button onClick={handleCompleteOrder} disabled={!completeAmount} className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-50">
                {tr ? 'Tamamla' : 'Complete'}
              </button>
            </div>
          }
        >
          <div className="space-y-3 px-5 py-4">
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Odeme Yontemi *' : 'Payment Method *'}</label>
              <select className="select w-full" value={completeMethod} onChange={e => setCompleteMethod(e.target.value as PaymentMethod)}>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Odeme Tutari *' : 'Payment Amount *'}</label>
              <input className="input w-full" type="number" value={completeAmount} onChange={e => setCompleteAmount(e.target.value)} />
            </div>
          </div>
        </DraggableModal>
      )}
    </div>
  )
}
