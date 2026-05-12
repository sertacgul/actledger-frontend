import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Search, Plus, Minus, Trash2, CreditCard,
  Settings as SettingsIcon, ShoppingCart, X, Camera, Check,
} from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import {
  useBranches, useTills, usePOSProducts, posCheckout,
  searchStockByBarcode, assignBarcodeToStockItem,
  useCustomers,
} from '../../lib/erp-hooks'
import type { POSCartItem, POSProduct, PaymentMethod } from '../../types/erp'
import { PAYMENT_METHOD_LABELS, TRY_FMT } from '../../types/erp'

type Screen = 'pos' | 'setup' | 'scanner' | 'receipt' | 'assign-barcode'

export default function MobilePOS() {
  const { lang } = useLanguage()
  const { user } = useAuth()
  const tr = lang === 'tr'

  // ── Setup (saved to localStorage) ──────────────────────────────────────
  const [branchId, setBranchId] = useState(() => localStorage.getItem('actledger_pos_branchId') ?? '')
  const [tillId, setTillId] = useState(() => localStorage.getItem('actledger_pos_tillId') ?? '')
  const { branches } = useBranches()
  const { tills } = useTills(branchId)

  const needsSetup = !branchId || !tillId
  const [screen, setScreen] = useState<Screen>(needsSetup ? 'setup' : 'pos')

  const saveSetup = () => {
    localStorage.setItem('actledger_pos_branchId', branchId)
    localStorage.setItem('actledger_pos_tillId', tillId)
    setScreen('pos')
  }

  // ── Cart ───────────────────────────────────────────────────────────────
  const [cart, setCart] = useState<POSCartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('NAKIT')
  const [processing, setProcessing] = useState(false)
  const [receiptData, setReceiptData] = useState<any>(null)

  const cartTotal = cart.reduce((sum, item) => sum + item.qty * item.unitPrice, 0)

  const addToCart = useCallback((product: POSProduct) => {
    setCart(prev => {
      const existing = prev.find(c => c.product.id === product.id)
      if (existing) {
        return prev.map(c => c.product.id === product.id ? { ...c, qty: c.qty + 1 } : c)
      }
      return [...prev, { product, qty: 1, unitPrice: Number(product.unitCost) }]
    })
  }, [])

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

  // ── Barcode (hidden input for external scanner) ────────────────────────
  const barcodeInputRef = useRef<HTMLInputElement>(null)
  const [barcodeValue, setBarcodeValue] = useState('')
  const [barcodeSearching, setBarcodeSearching] = useState(false)

  // Barcode assign state
  const [pendingBarcode, setPendingBarcode] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const { products: searchResults, loading: searchLoading } = usePOSProducts(productSearch || undefined)

  useEffect(() => {
    if (screen === 'pos' && barcodeInputRef.current) {
      barcodeInputRef.current.focus()
    }
  }, [screen])

  const handleBarcodeSubmit = useCallback(async (barcode: string) => {
    if (!barcode.trim()) return
    setBarcodeSearching(true)
    try {
      const stockItem = await searchStockByBarcode(barcode.trim())
      if (stockItem) {
        addToCart({
          id: stockItem.id,
          code: stockItem.code ?? stockItem.barcode ?? '',
          name: stockItem.name,
          unit: stockItem.unit ?? 'ADET',
          quantity: stockItem.quantity,
          unitCost: stockItem.unitCost ?? 0,
        })
      } else {
        setPendingBarcode(barcode.trim())
        setProductSearch('')
        setScreen('assign-barcode')
      }
    } catch {
      // Ignore
    } finally {
      setBarcodeSearching(false)
      setBarcodeValue('')
      if (barcodeInputRef.current) barcodeInputRef.current.focus()
    }
  }, [addToCart])

  const handleBarcodeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && barcodeValue) {
      e.preventDefault()
      handleBarcodeSubmit(barcodeValue)
    }
  }

  // ── Camera Scanner ─────────────────────────────────────────────────────
  const scannerRef = useRef<any>(null)

  const startCameraScanner = async () => {
    setScreen('scanner')
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      const scanner = new Html5Qrcode('mobile-pos-scanner')
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          stopCameraScanner()
          handleBarcodeSubmit(decodedText)
        },
        () => {},
      )
    } catch {
      setScreen('pos')
    }
  }

  const stopCameraScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {})
      scannerRef.current = null
    }
    setScreen('pos')
  }

  // ── Assign Barcode ─────────────────────────────────────────────────────
  const handleAssignBarcode = async (stockItem: any) => {
    try {
      await assignBarcodeToStockItem(stockItem.id, pendingBarcode)
      addToCart({
        id: stockItem.id,
        code: stockItem.code ?? pendingBarcode,
        name: stockItem.name,
        unit: stockItem.unit ?? 'ADET',
        quantity: stockItem.quantity,
        unitCost: stockItem.unitCost ?? 0,
      })
      setPendingBarcode('')
      setScreen('pos')
    } catch (e: any) {
      alert(e.message)
    }
  }

  // ── Checkout ───────────────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (cart.length === 0 || !tillId) return
    setProcessing(true)
    try {
      const result = await posCheckout({
        customerId: '',
        branchId,
        tillId,
        paymentMethod,
        items: cart.map(c => ({
          stockItemId: c.product.id,
          productName: c.product.name,
          unit: c.product.unit,
          quantity: c.qty,
          unitPrice: c.unitPrice,
        })),
      })
      setReceiptData(result.receiptData)
      setCart([])
      setScreen('receipt')
    } catch (e: any) {
      alert(e.message)
    } finally {
      setProcessing(false)
    }
  }

  // ── Setup Screen ───────────────────────────────────────────────────────
  if (screen === 'setup') {
    return (
      <div className="flex-1 p-4 space-y-4">
        <h2 className="text-lg font-bold text-slate-800">{tr ? 'POS Ayarlari' : 'POS Setup'}</h2>
        <p className="text-sm text-slate-500">{tr ? 'Sube ve kasa secin. Bu ayar cihaza kaydedilir.' : 'Select branch and till. Saved to this device.'}</p>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">{tr ? 'Sube' : 'Branch'}</label>
          <select className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white" value={branchId} onChange={e => { setBranchId(e.target.value); setTillId('') }}>
            <option value="">{tr ? 'Sube secin...' : 'Select branch...'}</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">{tr ? 'Kasa' : 'Till'}</label>
          <select className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white" value={tillId} onChange={e => setTillId(e.target.value)} disabled={!branchId}>
            <option value="">{tr ? 'Kasa secin...' : 'Select till...'}</option>
            {tills.map(t => <option key={t.id} value={t.id}>{t.name} ({t.status === 'ACIK' ? 'Acik' : 'Kapali'})</option>)}
          </select>
        </div>
        <button onClick={saveSetup} disabled={!branchId || !tillId} className="w-full py-3 rounded-xl bg-cyan-600 text-white font-semibold disabled:opacity-50">
          {tr ? 'Kaydet ve Basla' : 'Save & Start'}
        </button>
      </div>
    )
  }

  // ── Camera Scanner Screen ──────────────────────────────────────────────
  if (screen === 'scanner') {
    return (
      <div className="flex-1 flex flex-col bg-black">
        <div className="flex items-center justify-between p-4">
          <h2 className="text-white font-semibold">{tr ? 'Barkod Tara' : 'Scan Barcode'}</h2>
          <button onClick={stopCameraScanner} className="p-2 rounded-full bg-white/20 text-white"><X size={20} /></button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div id="mobile-pos-scanner" className="w-full max-w-sm" />
        </div>
      </div>
    )
  }

  // ── Assign Barcode Screen ──────────────────────────────────────────────
  if (screen === 'assign-barcode') {
    return (
      <div className="flex-1 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">{tr ? 'Urun Esle' : 'Match Product'}</h2>
          <button onClick={() => { setPendingBarcode(''); setScreen('pos') }} className="p-2 rounded-lg bg-slate-100"><X size={18} /></button>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
          <strong>Barkod: {pendingBarcode}</strong> - {tr ? 'Bu barkod henuz bir urune eslestirilmemis. Urunu secin, barkod otomatik kaydedilecek.' : 'This barcode is not assigned yet. Select a product to assign.'}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm" placeholder={tr ? 'Urun adi veya kodu...' : 'Product name or code...'} value={productSearch} onChange={e => setProductSearch(e.target.value)} autoFocus />
        </div>
        {searchLoading ? (
          <div className="text-center py-6 text-slate-400 text-sm">{tr ? 'Araniyor...' : 'Searching...'}</div>
        ) : searchResults.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-sm">{tr ? 'Urun bulunamadi' : 'No products found'}</div>
        ) : (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {searchResults.map(p => (
              <button key={p.id} onClick={() => handleAssignBarcode(p)} className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white active:bg-cyan-50 transition-colors text-left">
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-800">{p.name}</div>
                  <div className="text-xs text-slate-400">{p.code} - {p.unit} - Stok: {p.quantity}</div>
                </div>
                <div className="text-sm font-mono font-semibold text-cyan-600">{TRY_FMT(p.unitCost)}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Receipt Screen ─────────────────────────────────────────────────────
  if (screen === 'receipt' && receiptData) {
    return (
      <div className="flex-1 p-4 space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-2">
              <Check size={24} className="text-emerald-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">{tr ? 'Satis Tamamlandi' : 'Sale Complete'}</h2>
            <p className="text-xs text-slate-400 font-mono">{receiptData.orderNumber}</p>
          </div>
          <div className="border-t border-dashed border-slate-200 pt-3 font-mono text-sm space-y-1">
            {receiptData.items?.map((item: any, i: number) => (
              <div key={i} className="flex justify-between">
                <span className="text-slate-600">{item.qty}x {item.name}</span>
                <span className="text-slate-800">{TRY_FMT(item.total)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-dashed border-slate-200 pt-2 flex justify-between font-bold text-base">
            <span>{tr ? 'TOPLAM' : 'TOTAL'}</span>
            <span className="font-mono">{TRY_FMT(receiptData.total)}</span>
          </div>
          <div className="text-xs text-slate-400 text-center">
            {PAYMENT_METHOD_LABELS[receiptData.paymentMethod as PaymentMethod]}
            {receiptData.change > 0 && ` - ${tr ? 'Para Ustu' : 'Change'}: ${TRY_FMT(receiptData.change)}`}
          </div>
        </div>
        <button onClick={() => { setReceiptData(null); setScreen('pos') }} className="w-full py-3 rounded-xl bg-cyan-600 text-white font-semibold">
          {tr ? 'Yeni Satis' : 'New Sale'}
        </button>
      </div>
    )
  }

  // ── Main POS Screen ────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col">
      {/* Top bar */}
      <div className="p-3 bg-white border-b border-slate-100 space-y-2">
        <div className="flex items-center gap-2">
          <button onClick={startCameraScanner} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600 text-white text-sm font-medium">
            <Camera size={16} />
            {tr ? 'Tara' : 'Scan'}
          </button>
          <input
            ref={barcodeInputRef}
            value={barcodeValue}
            onChange={e => setBarcodeValue(e.target.value)}
            onKeyDown={handleBarcodeKeyDown}
            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm"
            placeholder={tr ? 'Barkod okut veya urun ara...' : 'Scan barcode or search...'}
          />
          <button onClick={() => setScreen('setup')} className="p-2 rounded-xl bg-slate-100 text-slate-500">
            <SettingsIcon size={16} />
          </button>
        </div>
        {barcodeSearching && (
          <div className="text-xs text-cyan-600 text-center animate-pulse">{tr ? 'Urun araniyor...' : 'Searching product...'}</div>
        )}
      </div>

      {/* Cart */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {cart.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <ShoppingCart size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">{tr ? 'Barkod tarayin veya urun arayin' : 'Scan a barcode or search for products'}</p>
          </div>
        ) : (
          cart.map(item => (
            <div key={item.product.id} className="flex items-center gap-2 p-3 rounded-xl bg-white border border-slate-100">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800 truncate">{item.product.name}</div>
                <div className="text-xs text-slate-400">{TRY_FMT(item.unitPrice)} x {item.qty}</div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => updateQty(item.product.id, -1)} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center"><Minus size={14} /></button>
                <span className="w-8 text-center text-sm font-semibold">{item.qty}</span>
                <button onClick={() => updateQty(item.product.id, 1)} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center"><Plus size={14} /></button>
              </div>
              <div className="w-20 text-right text-sm font-mono font-semibold text-slate-800">{TRY_FMT(item.qty * item.unitPrice)}</div>
              <button onClick={() => removeFromCart(item.product.id)} className="p-1.5 rounded-lg text-slate-300 active:text-red-500"><Trash2 size={14} /></button>
            </div>
          ))
        )}
      </div>

      {/* Bottom */}
      <div className="bg-white border-t border-slate-200 p-3 space-y-2" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <div className="flex justify-between items-center text-lg font-bold text-slate-800">
          <span>{tr ? 'Toplam' : 'Total'}</span>
          <span className="font-mono">{TRY_FMT(cartTotal)}</span>
        </div>
        <div className="flex gap-2">
          <select className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}>
            {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button
            onClick={handleCheckout}
            disabled={processing || cart.length === 0}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold disabled:opacity-50"
          >
            <CreditCard size={18} />
            {processing ? (tr ? 'Isleniyor...' : 'Processing...') : (tr ? 'Satis Yap' : 'Checkout')}
          </button>
        </div>
      </div>
    </div>
  )
}
