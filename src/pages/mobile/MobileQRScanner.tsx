import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ScanLine, Camera, Image, X, ArrowLeft, Package, ArrowRightLeft,
  ChevronRight, Check, Loader2, AlertTriangle, MapPin, Send,
} from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import { Html5Qrcode } from 'html5-qrcode'
import { api } from '../../lib/api'

const ACTION_TYPES = [
  { value: 'GIRIS', label: 'Stok Giri\u015fi', labelEn: 'Stock In', color: 'bg-emerald-500' },
  { value: 'CIKIS', label: 'Stok \u00c7\u0131k\u0131\u015f\u0131', labelEn: 'Stock Out', color: 'bg-red-500' },
  { value: 'KULLANIM', label: 'T\u00fcketim', labelEn: 'Consumption', color: 'bg-orange-500' },
  { value: 'TRANSFER', label: 'Transfer', labelEn: 'Transfer', color: 'bg-blue-500' },
  { value: 'FIRE', label: 'Fire / Kay\u0131p', labelEn: 'Waste / Loss', color: 'bg-rose-500' },
  { value: 'SAYIM', label: 'Say\u0131m', labelEn: 'Count', color: 'bg-violet-500' },
]

type Step = 'scan' | 'result' | 'action' | 'confirm' | 'done'

export default function MobileQRScanner() {
  const { lang } = useLanguage()
  const { user } = useAuth()
  const navigate = useNavigate()
  const tr = lang === 'tr'

  const [step, setStep] = useState<Step>('scan')
  const [scanning, setScanning] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [scanResult, setScanResult] = useState<any>(null)
  const [error, setError] = useState('')

  // Action form
  const [actionType, setActionType] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<any>(null)

  // Camera
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const videoRef = useRef<HTMLDivElement>(null)

  // ── QR Scanner ba\u015flat/durdur ────────────────────────────────────────

  const startScanner = useCallback(async () => {
    try {
      setError('')
      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner
      setScanning(true)

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          // QR okutuldu
          stopScanner()
          handleQrResult(decodedText)
        },
        () => {}, // ignore errors during scanning
      )
    } catch (err: any) {
      setError(tr
        ? 'Kamera eri\u015fimi reddedildi. L\u00fctfen taray\u0131c\u0131 ayarlar\u0131ndan kamera iznini verin.'
        : 'Camera access denied. Please enable camera permission in browser settings.')
      setScanning(false)
    }
  }, [tr])

  const stopScanner = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {})
      scannerRef.current = null
    }
    setScanning(false)
  }, [])

  useEffect(() => {
    return () => { stopScanner() }
  }, [stopScanner])

  // ── QR sonucunu i\u015fle ──────────────────────────────────────────────

  const handleQrResult = async (code: string) => {
    try {
      setError('')
      const result = await api.post<any>('/inventory-intelligence/qr/scan', { code: code.trim() })
      setScanResult(result)
      setStep('result')
    } catch (e: any) {
      setError(e.message || (tr ? 'QR kodu tan\u0131namad\u0131' : 'QR code not recognized'))
    }
  }

  const handleManualScan = () => {
    if (!manualCode.trim()) return
    handleQrResult(manualCode.trim())
  }

  // ── Stok i\u015flem talebi g\u00f6nder ──────────────────────────────────

  const handleSubmitAction = async () => {
    if (!actionType || !quantity || !scanResult) return
    setSubmitting(true)
    try {
      // Konum al
      let lat: number | undefined, lng: number | undefined
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 }),
        )
        lat = pos.coords.latitude
        lng = pos.coords.longitude
      } catch {}

      const body = {
        actionType,
        stockItemId: scanResult.entityData?.id || scanResult.qrEntity?.entityId,
        quantity: Number(quantity),
        description: description || undefined,
        qrEntityId: scanResult.qrEntity?.id,
        latitude: lat,
        longitude: lng,
      }

      const result = await api.post<any>('/inventory-intelligence/approvals', body)
      setSubmitResult(result)
      setStep('done')
    } catch (e: any) {
      setError(e.message || (tr ? '\u0130\u015flem g\u00f6nderilemedi' : 'Failed to submit'))
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    setStep('scan')
    setScanResult(null)
    setActionType('')
    setQuantity('1')
    setDescription('')
    setSubmitResult(null)
    setError('')
  }

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-slate-900 text-white px-4 py-3 flex items-center gap-3">
        <button onClick={() => step === 'scan' ? navigate(-1) : reset()} className="p-1">
          <ArrowLeft size={20} />
        </button>
        <ScanLine size={18} className="text-cyan-400" />
        <span className="text-sm font-bold">{tr ? 'QR Stok \u0130\u015flemi' : 'QR Stock Action'}</span>
      </div>

      <div className="p-4 space-y-4">
        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
            <AlertTriangle size={14} /> {error}
            <button onClick={() => setError('')} className="ml-auto"><X size={14} /></button>
          </div>
        )}

        {/* ── STEP 1: Scan ────────────────────────────────────────────── */}
        {step === 'scan' && (
          <>
            {/* Camera QR Scanner */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div id="qr-reader" ref={videoRef} className="w-full" style={{ minHeight: scanning ? 300 : 0 }} />
              {!scanning && (
                <div className="p-6 text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-cyan-50 flex items-center justify-center mx-auto">
                    <Camera size={28} className="text-cyan-600" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">
                    {tr ? 'QR Kodu Tarat\u0131n' : 'Scan QR Code'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {tr ? 'Kameray\u0131 kullanarak stok QR kodunu okutun' : 'Use camera to scan stock QR code'}
                  </p>
                  <button
                    onClick={startScanner}
                    className="w-full py-3 rounded-xl bg-cyan-600 text-white font-bold text-sm active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <Camera size={16} /> {tr ? 'Kameray\u0131 A\u00e7' : 'Open Camera'}
                  </button>
                </div>
              )}
              {scanning && (
                <div className="p-3 text-center">
                  <button onClick={stopScanner}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-white text-xs font-semibold">
                    {tr ? 'Kameray\u0131 Kapat' : 'Close Camera'}
                  </button>
                </div>
              )}
            </div>

            {/* Manual input */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {tr ? 'Manuel Giri\u015f' : 'Manual Entry'}
              </p>
              <div className="flex gap-2">
                <input
                  className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400"
                  placeholder={tr ? 'QR kodu yaz\u0131n...' : 'Type QR code...'}
                  value={manualCode}
                  onChange={e => setManualCode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleManualScan()}
                />
                <button onClick={handleManualScan}
                  className="px-4 rounded-xl bg-slate-800 text-white text-xs font-semibold active:scale-[0.98]">
                  {tr ? 'Ara' : 'Search'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── STEP 2: Result ──────────────────────────────────────────── */}
        {step === 'result' && scanResult && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <Package size={22} className="text-indigo-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800">{scanResult.entityData?.name || scanResult.qrEntity?.label || 'Bilinmeyen'}</p>
                  <p className="text-xs text-slate-400">{scanResult.qrEntity?.code}</p>
                </div>
              </div>

              {scanResult.entityData && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {scanResult.entityData.quantity !== undefined && (
                    <div className="p-2 rounded-lg bg-slate-50">
                      <span className="text-slate-400">{tr ? 'Mevcut' : 'Current'}</span>
                      <p className="font-bold text-slate-700">{scanResult.entityData.quantity} {scanResult.entityData.unit}</p>
                    </div>
                  )}
                  {scanResult.entityData.department && (
                    <div className="p-2 rounded-lg bg-slate-50">
                      <span className="text-slate-400">{tr ? 'Departman' : 'Department'}</span>
                      <p className="font-bold text-slate-700">{scanResult.entityData.department.name}</p>
                    </div>
                  )}
                  {scanResult.entityData.locationName && (
                    <div className="p-2 rounded-lg bg-slate-50">
                      <span className="text-slate-400">{tr ? 'Lokasyon' : 'Location'}</span>
                      <p className="font-bold text-slate-700">{scanResult.entityData.locationName}</p>
                    </div>
                  )}
                  {scanResult.entityData.category && (
                    <div className="p-2 rounded-lg bg-slate-50">
                      <span className="text-slate-400">{tr ? 'Kategori' : 'Category'}</span>
                      <p className="font-bold text-slate-700">{scanResult.entityData.category}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button onClick={() => setStep('action')}
              className="w-full py-3 rounded-xl bg-cyan-600 text-white font-bold text-sm active:scale-[0.98] flex items-center justify-center gap-2">
              <ArrowRightLeft size={16} /> {tr ? '\u0130\u015flem Ba\u015flat' : 'Start Action'}
            </button>

            <button onClick={reset}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold">
              {tr ? 'Yeni Tarama' : 'New Scan'}
            </button>
          </div>
        )}

        {/* ── STEP 3: Action selection ────────────────────────────────── */}
        {step === 'action' && (
          <div className="space-y-4">
            <p className="text-sm font-bold text-slate-700">{tr ? '\u0130\u015flem T\u00fcr\u00fc Se\u00e7in' : 'Select Action Type'}</p>
            <div className="grid grid-cols-2 gap-2">
              {ACTION_TYPES.map(a => (
                <button key={a.value}
                  onClick={() => setActionType(a.value)}
                  className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all active:scale-[0.97] ${
                    actionType === a.value
                      ? 'border-cyan-400 bg-cyan-50 text-cyan-700 ring-2 ring-cyan-200'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${a.color} mb-1.5`} />
                  {tr ? a.label : a.labelEn}
                </button>
              ))}
            </div>

            {actionType && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500">{tr ? 'Miktar' : 'Quantity'}</label>
                  <div className="flex gap-2 mt-1">
                    {[1, 5, 10].map(n => (
                      <button key={n} onClick={() => setQuantity(String(n))}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold ${
                          quantity === String(n) ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>{n}</button>
                    ))}
                    <input
                      type="number" min="1" value={quantity}
                      onChange={e => setQuantity(e.target.value)}
                      className="w-20 px-2 py-2 rounded-lg border border-slate-200 text-sm text-center font-bold"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">{tr ? 'A\u00e7\u0131klama' : 'Description'}</label>
                  <input value={description} onChange={e => setDescription(e.target.value)}
                    placeholder={tr ? '\u0130ste\u011fe ba\u011fl\u0131...' : 'Optional...'}
                    className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm" />
                </div>
              </div>
            )}

            {actionType && (
              <button onClick={() => setStep('confirm')}
                className="w-full py-3 rounded-xl bg-cyan-600 text-white font-bold text-sm active:scale-[0.98] flex items-center justify-center gap-2"
                disabled={!quantity || Number(quantity) <= 0}>
                <ChevronRight size={16} /> {tr ? 'Onayla' : 'Confirm'}
              </button>
            )}
          </div>
        )}

        {/* ── STEP 4: Confirm ─────────────────────────────────────────── */}
        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{tr ? 'Onay' : 'Confirmation'}</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-400">{tr ? '\u00dcr\u00fcn' : 'Item'}</span><span className="font-semibold text-slate-700">{scanResult?.entityData?.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">{tr ? '\u0130\u015flem' : 'Action'}</span><span className="font-semibold text-slate-700">{ACTION_TYPES.find(a => a.value === actionType)?.[tr ? 'label' : 'labelEn']}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">{tr ? 'Miktar' : 'Qty'}</span><span className="font-semibold text-slate-700">{quantity} {scanResult?.entityData?.unit}</span></div>
                {description && <div className="flex justify-between"><span className="text-slate-400">{tr ? 'Not' : 'Note'}</span><span className="text-slate-600">{description}</span></div>}
              </div>
              <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                {tr
                  ? 'Bu i\u015flem hiyerar\u015fik onay s\u00fcrecine g\u00f6nderilecektir. Departman m\u00fcd\u00fcr\u00fcn\u00fcze kadar onay zinciri ilerleyecektir.'
                  : 'This action will be sent through hierarchical approval. The approval chain will proceed up to your department manager.'}
              </div>
            </div>

            <button onClick={handleSubmitAction} disabled={submitting}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {tr ? 'Onaya G\u00f6nder' : 'Submit for Approval'}
            </button>

            <button onClick={() => setStep('action')}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold">
              {tr ? 'Geri' : 'Back'}
            </button>
          </div>
        )}

        {/* ── STEP 5: Done ────────────────────────────────────────────── */}
        {step === 'done' && (
          <div className="text-center space-y-4 py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
              <Check size={28} className="text-emerald-600" />
            </div>
            <p className="text-lg font-bold text-slate-800">
              {submitResult?.directExecution
                ? (tr ? '\u0130\u015flem Uyguland\u0131!' : 'Action Applied!')
                : (tr ? 'Onaya G\u00f6nderildi!' : 'Sent for Approval!')}
            </p>
            <p className="text-sm text-slate-500">
              {submitResult?.directExecution
                ? (tr ? 'Yetkiniz yeterli, i\u015flem direkt uyguland\u0131.' : 'Your authority is sufficient, action applied directly.')
                : (tr ? '\u0130\u015fleminiz onay zincirinde ilerliyor.' : 'Your request is progressing through approval chain.')}
            </p>
            <button onClick={reset}
              className="w-full py-3 rounded-xl bg-cyan-600 text-white font-bold text-sm active:scale-[0.98]">
              {tr ? 'Yeni Tarama' : 'New Scan'}
            </button>
            <button onClick={() => navigate('/m/gorevler')}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold">
              {tr ? 'G\u00f6revlere D\u00f6n' : 'Back to Tasks'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
