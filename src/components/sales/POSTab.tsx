import { useState, useMemo } from 'react'
import { Search, Plus, Minus, ShoppingCart, Trash2, Receipt, CreditCard } from 'lucide-react'
import { usePOSProducts, useCustomers, useBranches, useTills, posCheckout } from '../../lib/erp-hooks'
import { useLanguage } from '../../context/LanguageContext'
import DraggableModal from '../ui/DraggableModal'
import type { POSCartItem, POSProduct, PaymentMethod, POSReceiptData } from '../../types/erp'
import { PAYMENT_METHOD_LABELS, TRY_FMT } from '../../types/erp'

export default function POSTab() {
  const { lang } = useLanguage()
  const tr = lang === 'tr'

  const [productSearch, setProductSearch] = useState('')
  const { products, loading: productsLoading } = usePOSProducts(productSearch || undefined)
  const { customers } = useCustomers()
  const { branches } = useBranches()

  const [branchId, setBranchId] = useState('')
  const [tillId, setTillId] = useState('')
  const { tills } = useTills(branchId)

  // Get selected till's session ID
  const selectedTill = tills.find(t => t.id === tillId)
  const tillSessionId = selectedTill?.currentSession?.id ?? ''
  const tillIsOpen = selectedTill?.status === 'ACIK' && !!tillSessionId

  const [customerId, setCustomerId] = useState('')
  const [cart, setCart] = useState<POSCartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('NAKIT')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [receipt, setReceipt] = useState<POSReceiptData | null>(null)
  const [processing, setProcessing] = useState(false)

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.qty * item.unitPrice, 0), [cart])

  const addToCart = (product: POSProduct) => {
    const existing = cart.find(c => c.product.id === product.id)
    if (existing) {
      setCart(cart.map(c => c.product.id === product.id ? { ...c, qty: c.qty + 1 } : c))
    } else {
      setCart([...cart, { product, qty: 1, unitPrice: Number(product.unitCost) }])
    }
  }

  const updateQty = (productId: string, delta: number) => {
    setCart(cart.map(c => {
      if (c.product.id !== productId) return c
      const newQty = c.qty + delta
      return newQty <= 0 ? c : { ...c, qty: newQty }
    }))
  }

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(c => c.product.id !== productId))
  }

  const handleCheckout = async () => {
    if (!tillSessionId || cart.length === 0) return
    setProcessing(true)
    try {
      const amount = paymentAmount ? Number(paymentAmount) : cartTotal
      const result = await posCheckout({
        tillSessionId,
        customerId: customerId || undefined,
        paymentMethod,
        paymentAmount: amount,
        items: cart.map(c => ({
          stockItemId: c.product.id,
          productName: c.product.name,
          quantity: c.qty,
          unitPrice: c.unitPrice,
        })),
      })
      setReceipt(result.receiptData)
      setCart([])
      setPaymentAmount('')
    } catch (e: any) {
      alert(e.message)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
      {/* Product Grid */}
      <div className="space-y-4">
        {/* POS Config Bar */}
        <div className="flex flex-wrap gap-3">
          <select className="select flex-1 min-w-[140px]" value={branchId} onChange={e => { setBranchId(e.target.value); setTillId('') }}>
            <option value="">{tr ? 'Sube secin' : 'Select branch'}</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select className="select flex-1 min-w-[140px]" value={tillId} onChange={e => setTillId(e.target.value)} disabled={!branchId}>
            <option value="">{tr ? 'Kasa secin' : 'Select till'}</option>
            {tills.map(t => <option key={t.id} value={t.id}>{t.name} ({t.status === 'ACIK' ? 'Acik' : 'Kapali'})</option>)}
          </select>
          <select className="select flex-1 min-w-[140px]" value={customerId} onChange={e => setCustomerId(e.target.value)}>
            <option value="">{tr ? 'Musteri (opsiyonel)' : 'Customer (optional)'}</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Till status warning */}
        {tillId && !tillIsOpen && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
            {tr ? 'Secilen kasa kapali. Once "Subeler & Kasalar" tab\'indan kasayi acin.' : 'Selected till is closed. Open it from "Branches & Tills" tab first.'}
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-4)]" />
          <input className="input pl-9 w-full" placeholder={tr ? 'Urun ara...' : 'Search products...'} value={productSearch} onChange={e => setProductSearch(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {productsLoading ? (
            <div className="col-span-full text-center py-8 text-[var(--text-3)]">{tr ? 'Yukleniyor...' : 'Loading...'}</div>
          ) : products.length === 0 ? (
            <div className="col-span-full text-center py-8 text-[var(--text-3)]">{tr ? 'Urun bulunamadi. Stok Yonetimi\'nden urun ekleyin.' : 'No products found. Add products from Stock Management.'}</div>
          ) : (
            products.map(p => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                disabled={!tillIsOpen}
                className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-indigo-300 hover:bg-indigo-50/50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="text-sm font-medium text-[var(--text-1)] truncate">{p.name}</div>
                <div className="text-xs text-[var(--text-3)] mt-0.5">{p.code} - {p.unit}</div>
                <div className="text-sm font-mono font-semibold text-indigo-600 mt-1">{TRY_FMT(p.unitCost)}</div>
                <div className="text-[10px] text-[var(--text-4)] mt-0.5">{tr ? 'Stok' : 'Stock'}: {p.quantity}</div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Cart Panel */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] flex flex-col h-fit lg:sticky lg:top-4">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
          <ShoppingCart className="w-5 h-5 text-indigo-500" />
          <span className="font-semibold text-[var(--text-1)]">{tr ? 'Sepet' : 'Cart'}</span>
          <span className="ml-auto text-xs text-[var(--text-3)]">{cart.length} {tr ? 'kalem' : 'items'}</span>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[400px] p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="text-center py-8 text-sm text-[var(--text-3)]">{tr ? 'Sepet bos' : 'Cart is empty'}</div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg)]">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--text-1)] truncate">{item.product.name}</div>
                  <div className="text-xs text-[var(--text-3)]">{TRY_FMT(item.unitPrice)} x {item.qty}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateQty(item.product.id, -1)} className="w-6 h-6 rounded-md bg-[var(--surface)] flex items-center justify-center hover:bg-zinc-200 transition-colors">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-8 text-center text-sm font-medium">{item.qty}</span>
                  <button onClick={() => updateQty(item.product.id, 1)} className="w-6 h-6 rounded-md bg-[var(--surface)] flex items-center justify-center hover:bg-zinc-200 transition-colors">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <div className="w-20 text-right text-sm font-mono font-medium text-[var(--text-1)]">{TRY_FMT(item.qty * item.unitPrice)}</div>
                <button onClick={() => removeFromCart(item.product.id)} className="p-1 rounded-md hover:bg-red-50 text-[var(--text-4)] hover:text-red-500">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-[var(--border)] p-4 space-y-3">
          <div className="flex justify-between text-lg font-bold text-[var(--text-1)]">
            <span>{tr ? 'Toplam' : 'Total'}</span>
            <span className="font-mono">{TRY_FMT(cartTotal)}</span>
          </div>

          <select className="select w-full" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}>
            {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>

          <div>
            <label className="text-xs font-medium text-[var(--text-2)] mb-1 block">{tr ? 'Odeme Tutari' : 'Payment Amount'}</label>
            <input
              className="input w-full"
              type="number"
              value={paymentAmount}
              onChange={e => setPaymentAmount(e.target.value)}
              placeholder={cartTotal > 0 ? String(cartTotal.toFixed(2)) : '0'}
            />
          </div>

          <button
            onClick={handleCheckout}
            disabled={processing || cart.length === 0 || !tillIsOpen}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 disabled:opacity-50 transition-colors"
          >
            <CreditCard className="w-5 h-5" />
            {processing ? (tr ? 'Isleniyor...' : 'Processing...') : (tr ? 'Odeme Al' : 'Checkout')}
          </button>
        </div>
      </div>

      {/* Receipt Modal */}
      {receipt && (
        <DraggableModal
          title={tr ? 'Satis Fisi' : 'Receipt'}
          subtitle={receipt.orderNumber}
          icon={<Receipt className="w-5 h-5 text-emerald-500" />}
          onClose={() => setReceipt(null)}
          width={360}
        >
          <div className="p-4 font-mono text-sm space-y-3">
            <div className="text-center">
              <div className="font-bold text-base">{receipt.branchName}</div>
              <div className="text-[var(--text-3)]">{receipt.tillName} - {receipt.cashierName}</div>
              <div className="text-xs text-[var(--text-4)]">{new Date(receipt.date).toLocaleString('tr-TR')}</div>
            </div>
            <div className="border-t border-dashed border-[var(--border)] pt-2">
              {receipt.items.map((item, i) => (
                <div key={i} className="flex justify-between py-0.5">
                  <span>{item.qty}x {item.name}</span>
                  <span>{TRY_FMT(item.total)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-dashed border-[var(--border)] pt-2 font-bold flex justify-between">
              <span>{tr ? 'TOPLAM' : 'TOTAL'}</span>
              <span>{TRY_FMT(receipt.total)}</span>
            </div>
            <div className="text-xs text-[var(--text-3)]">
              <div>{PAYMENT_METHOD_LABELS[receipt.paymentMethod as PaymentMethod]}: {TRY_FMT(receipt.paymentAmount)}</div>
              {receipt.change > 0 && <div>{tr ? 'Para Ustu' : 'Change'}: {TRY_FMT(receipt.change)}</div>}
            </div>
          </div>
        </DraggableModal>
      )}
    </div>
  )
}
