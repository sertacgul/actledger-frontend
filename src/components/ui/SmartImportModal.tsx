import { useState, useRef, useCallback } from 'react'
import {
  Upload, FileSpreadsheet, Database, AlertTriangle, CheckCircle, X,
  Loader2, Sparkles, Pencil, Trash2, AlertCircle,
} from 'lucide-react'
import clsx from 'clsx'
import * as XLSX from 'xlsx'
import DraggableModal from './DraggableModal'
import { api } from '../../lib/api'

interface Props {
  title?: string
  /** 'inventory' or 'stock' - determines which backend endpoints to use */
  target: 'inventory' | 'stock'
  defaultType?: string
  onClose: () => void
  onSuccess: () => void
}

type Step = 'upload' | 'analyzing' | 'preview' | 'importing' | 'done'

interface AnalysisResult {
  mapping: Record<string, string>
  warnings: string[]
  preview: Record<string, any>[]
}

interface DataIssue {
  row: number
  col: string
  type: 'missing' | 'invalid' | 'warning'
  message: string
}

export default function SmartImportModal({ title, target, defaultType, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>('upload')
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [editableRows, setEditableRows] = useState<Record<string, any>[]>([])
  const [issues, setIssues] = useState<DataIssue[]>([])
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [sqlText, setSqlText] = useState('')
  const [inputMode, setInputMode] = useState<'file' | 'sql'>('file')
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Parse file (Excel / CSV) ──────────────────────────────────────────

  const parseFile = useCallback((file: File) => {
    setError(null)
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' })
        if (json.length === 0) { setError('Dosya bos'); return }
        const hdrs = Object.keys(json[0])
        const rows = json.map(row => {
          const out: Record<string, string> = {}
          for (const h of hdrs) out[h] = String(row[h] ?? '').trim()
          return out
        })
        setHeaders(hdrs)
        setRawRows(rows)
        analyzeWithOperIQ(rows)
      } catch {
        setError('Dosya okunamadi. Gecerli bir Excel veya CSV dosyasi yukleyin.')
      }
    }
    reader.readAsBinaryString(file)
  }, [])

  // ── Drag & drop handlers ──────────────────────────────────────────────

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) parseFile(file)
  }, [parseFile])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
  }

  // ── SQL/CSV paste parse ───────────────────────────────────────────────

  const parseSqlInput = () => {
    setError(null)
    const text = sqlText.trim()
    if (!text) { setError('Metin alani bos'); return }

    try {
      // INSERT INTO format
      const insertMatch = text.match(/INSERT\s+INTO\s+\w+\s*\(([^)]+)\)\s*VALUES\s*([\s\S]+)/i)
      if (insertMatch) {
        const cols = insertMatch[1].split(',').map(c => c.trim().replace(/["`[\]]/g, ''))
        const rowMatches = insertMatch[2].match(/\(([^)]+)\)/g)
        if (!rowMatches) { setError('VALUES ayrilamadi'); return }
        const rows = rowMatches.map(rm => {
          const vals = rm.slice(1, -1).split(',').map(v => v.trim().replace(/^['"]|['"]$/g, ''))
          const row: Record<string, string> = {}
          cols.forEach((c, i) => { row[c] = vals[i] ?? '' })
          return row
        })
        setHeaders(cols)
        setRawRows(rows)
        analyzeWithOperIQ(rows)
        return
      }

      // CSV/TSV
      const lines = text.split('\n').filter(l => l.trim())
      if (lines.length < 2) { setError('En az 2 satir gerekli (baslik + veri)'); return }
      const sep = lines[0].includes('\t') ? '\t' : ','
      const hdrs = lines[0].split(sep).map(h => h.trim().replace(/["`]/g, ''))
      const rows = lines.slice(1).map(line => {
        const vals = line.split(sep).map(v => v.trim().replace(/^['"]|['"]$/g, ''))
        const row: Record<string, string> = {}
        hdrs.forEach((h, i) => { row[h] = vals[i] ?? '' })
        return row
      })
      setHeaders(hdrs)
      setRawRows(rows)
      analyzeWithOperIQ(rows)
    } catch {
      setError('Veri ayrilamadi. Gecerli SQL INSERT veya CSV formatinda yapistirin.')
    }
  }

  // ── OperIQ analysis ───────────────────────────────────────────────────

  const analyzeWithOperIQ = async (rows: Record<string, any>[]) => {
    setStep('analyzing')
    setError(null)
    try {
      const endpoint = target === 'stock'
        ? '/stock-management/import/analyze'
        : '/inventory/import/analyze'
      const res = await api.post<any>(endpoint, { rows })
      const data = res?.data ?? res
      setAnalysis(data)

      // Validate rows and find issues
      const foundIssues: DataIssue[] = []
      const mapping = data.mapping ?? {}
      const nameField = Object.entries(mapping).find(([, v]) => v === 'name')?.[0]

      rows.forEach((row, idx) => {
        // Check required field: name
        if (nameField && (!row[nameField] || String(row[nameField]).trim() === '')) {
          foundIssues.push({ row: idx, col: nameField, type: 'missing', message: 'Ad alani zorunlu' })
        }
        // Check numeric fields for invalid data
        const qtyField = Object.entries(mapping).find(([, v]) => v === 'quantity')?.[0]
        if (qtyField && row[qtyField] && isNaN(Number(row[qtyField]))) {
          foundIssues.push({ row: idx, col: qtyField, type: 'invalid', message: 'Miktar sayi olmali' })
        }
        const costField = Object.entries(mapping).find(([, v]) => v === 'unitCost')?.[0]
        if (costField && row[costField] && isNaN(Number(String(row[costField]).replace(/[,.]/, '.')))) {
          foundIssues.push({ row: idx, col: costField, type: 'invalid', message: 'Maliyet sayi olmali' })
        }
      })

      setIssues(foundIssues)
      setEditableRows([...rows])
      setStep('preview')
    } catch (e: any) {
      setError(e.message ?? 'OperIQ analizi basarisiz oldu')
      setEditableRows([...rows])
      setStep('preview')
    }
  }

  // ── Execute import ────────────────────────────────────────────────────

  const executeImport = async () => {
    setStep('importing')
    setError(null)
    try {
      const mapping = analysis?.mapping ?? {}
      const endpoint = target === 'stock'
        ? '/stock-management/import/execute'
        : '/inventory/import/execute'
      const body = target === 'stock'
        ? { rows: editableRows, mapping, defaultCategory: 'SARF', defaultUnit: 'adet' }
        : { rows: editableRows, mapping, defaultType: defaultType ?? 'DEMIRBAS' }
      const res = await api.post<any>(endpoint, body)
      const data = res?.data ?? res
      setResult({ imported: data.imported ?? 0, skipped: data.skipped ?? 0 })
      setStep('done')
      onSuccess()
    } catch (e: any) {
      setError(e.message ?? 'Yukleme sirasinda hata olustu')
      setStep('preview')
    }
  }

  // ── Inline cell edit ──────────────────────────────────────────────────

  const updateCell = (rowIdx: number, col: string, value: string) => {
    setEditableRows(prev => {
      const next = [...prev]
      next[rowIdx] = { ...next[rowIdx], [col]: value }
      return next
    })
    // Remove issue for this cell
    setIssues(prev => prev.filter(i => !(i.row === rowIdx && i.col === col)))
  }

  const removeRow = (rowIdx: number) => {
    setEditableRows(prev => prev.filter((_, i) => i !== rowIdx))
    setIssues(prev => prev.filter(i => i.row !== rowIdx).map(i => i.row > rowIdx ? { ...i, row: i.row - 1 } : i))
  }

  // ── Cell issue check ──────────────────────────────────────────────────

  const getCellIssue = (rowIdx: number, col: string) =>
    issues.find(i => i.row === rowIdx && i.col === col)

  // ── Mapped field labels ───────────────────────────────────────────────

  const FIELD_LABELS: Record<string, string> = {
    name: 'Ad', code: 'Kod', category: 'Kategori', type: 'Tip',
    location: 'Konum', locationName: 'Konum', vendor: 'Tedarikci',
    quantity: 'Miktar', unit: 'Birim', unitCost: 'Maliyet',
    description: 'Aciklama', serialNumber: 'Seri No', barcode: 'Barkod',
    minLevel: 'Min Stok', maxLevel: 'Max Stok', criticalLevel: 'Kritik',
    notes: 'Not', status: 'Durum',
  }

  const mappedHeaders = analysis?.mapping
    ? headers.filter(h => analysis.mapping[h])
    : headers.slice(0, 8)

  const unmappedCount = analysis?.mapping
    ? headers.filter(h => !analysis.mapping[h]).length
    : 0

  return (
    <DraggableModal title={title ?? 'Akilli Veri Yukleme'} onClose={onClose} width={780} maxHeight="90vh">
      <div className="px-5 py-4 space-y-4">

        {/* ── STEP: Upload ─────────────────────────────────────────── */}
        {step === 'upload' && (
          <>
            {/* Mode tabs */}
            <div className="flex gap-1 p-1 rounded-lg bg-zinc-100">
              <button
                onClick={() => setInputMode('file')}
                className={clsx('flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold flex-1 justify-center transition-all',
                  inputMode === 'file' ? 'bg-white shadow text-zinc-900' : 'text-zinc-500 hover:text-zinc-700')}
              >
                <FileSpreadsheet size={14} /> Excel / CSV
              </button>
              <button
                onClick={() => setInputMode('sql')}
                className={clsx('flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold flex-1 justify-center transition-all',
                  inputMode === 'sql' ? 'bg-white shadow text-zinc-900' : 'text-zinc-500 hover:text-zinc-700')}
              >
                <Database size={14} /> SQL / CSV Yapistir
              </button>
            </div>

            {inputMode === 'file' ? (
              <>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} className="hidden" />
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                  className={clsx(
                    'w-full flex flex-col items-center gap-3 p-12 rounded-2xl border-2 border-dashed cursor-pointer transition-all',
                    dragOver
                      ? 'border-blue-500 bg-blue-50 scale-[1.01]'
                      : 'border-zinc-300 hover:border-blue-400 hover:bg-blue-50/30',
                  )}
                >
                  <div className={clsx('w-14 h-14 rounded-xl flex items-center justify-center transition-colors',
                    dragOver ? 'bg-blue-100' : 'bg-zinc-100')}>
                    <Upload size={28} className={dragOver ? 'text-blue-500' : 'text-zinc-400'} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-zinc-700">
                      {dragOver ? 'Dosyayi birakin...' : 'Dosyayi surukleyin veya tiklayin'}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">.xlsx, .xls, .csv</p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200">
                    <Sparkles size={12} className="text-teal-600" />
                    <span className="text-[11px] font-semibold text-teal-700">OperIQ otomatik analiz edecek</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <textarea
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-xs font-mono min-h-[160px] resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder={"INSERT INTO items (name, code, quantity) VALUES\n('Filtre', 'FLT-001', 50),\n('Conta', 'CNT-002', 200);\n\nveya CSV:\nname,code,quantity\nFiltre,FLT-001,50\nConta,CNT-002,200"}
                  value={sqlText}
                  onChange={e => setSqlText(e.target.value)}
                />
                <button
                  onClick={parseSqlInput}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800"
                >
                  <Sparkles size={13} /> Analiz Et
                </button>
              </div>
            )}
          </>
        )}

        {/* ── STEP: Analyzing ─────────────────────────────────────── */}
        {step === 'analyzing' && (
          <div className="flex flex-col items-center gap-4 py-12">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center">
              <Loader2 size={28} className="animate-spin text-teal-600" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-zinc-800">OperIQ veriyi analiz ediyor...</p>
              <p className="text-xs text-zinc-400 mt-1">Sutunlar eslestiriliyor, veri kalitesi kontrol ediliyor</p>
            </div>
          </div>
        )}

        {/* ── STEP: Preview ───────────────────────────────────────── */}
        {step === 'preview' && (
          <>
            {/* AI mapping summary */}
            {analysis && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-teal-50/70 border border-teal-200">
                <Sparkles size={16} className="text-teal-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-teal-800">
                    OperIQ {Object.keys(analysis.mapping).length} sutunu eslestirdi
                    {unmappedCount > 0 && <span className="text-teal-600"> ({unmappedCount} sutun atildi)</span>}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {Object.entries(analysis.mapping).map(([src, dest]) => (
                      <span key={src} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-white border border-teal-200 text-teal-800">
                        {src} <span className="text-teal-400">&rarr;</span> {FIELD_LABELS[dest] ?? dest}
                      </span>
                    ))}
                  </div>
                  {analysis.warnings.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {analysis.warnings.map((w, i) => (
                        <p key={i} className="text-[10px] text-amber-700 flex items-center gap-1">
                          <AlertTriangle size={10} /> {w}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Issue summary */}
            {issues.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                <AlertCircle size={14} className="text-amber-600" />
                <span className="text-xs font-medium text-amber-700">
                  {issues.length} sorun bulundu - kirmizi hucreler duzeltilmeli
                </span>
              </div>
            )}

            {/* Editable data table */}
            <div className="overflow-x-auto max-h-[340px] rounded-xl border border-zinc-200">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-zinc-50 border-b border-zinc-200">
                    <th className="px-2 py-2 text-center text-zinc-400 w-8">#</th>
                    {mappedHeaders.map(h => (
                      <th key={h} className="px-2 py-2 text-left font-semibold text-zinc-600">
                        <span>{h}</span>
                        {analysis?.mapping[h] && (
                          <span className="block text-[9px] font-normal text-teal-500">{FIELD_LABELS[analysis.mapping[h]] ?? analysis.mapping[h]}</span>
                        )}
                      </th>
                    ))}
                    <th className="px-2 py-2 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {editableRows.map((row, ri) => (
                    <tr key={ri} className="border-b border-zinc-100 hover:bg-zinc-50/50">
                      <td className="px-2 py-1.5 text-center text-zinc-300 text-[10px]">{ri + 1}</td>
                      {mappedHeaders.map(h => {
                        const issue = getCellIssue(ri, h)
                        return (
                          <td key={h} className="px-1 py-1">
                            <input
                              className={clsx(
                                'w-full px-1.5 py-1 rounded text-xs border transition-colors focus:outline-none focus:ring-1 focus:ring-blue-400',
                                issue?.type === 'missing' && 'border-red-300 bg-red-50',
                                issue?.type === 'invalid' && 'border-orange-300 bg-orange-50',
                                !issue && 'border-transparent hover:border-zinc-200 focus:border-blue-300',
                              )}
                              value={row[h] ?? ''}
                              onChange={e => updateCell(ri, h, e.target.value)}
                              title={issue?.message}
                            />
                          </td>
                        )
                      })}
                      <td className="px-1 py-1">
                        <button
                          onClick={() => removeRow(ri)}
                          className="p-1 rounded hover:bg-red-50 text-zinc-300 hover:text-red-500 transition-colors"
                          title="Satiri kaldir"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-xs text-zinc-400">
              {editableRows.length} satir yuklemeye hazir
              {issues.filter(i => i.type === 'missing').length > 0 &&
                ' - eksik alanlari doldurun veya satiri kaldirin'}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => { setStep('upload'); setRawRows([]); setAnalysis(null); setEditableRows([]); setIssues([]) }}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                Yeni Dosya
              </button>
              <div className="flex gap-2">
                <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors">
                  Iptal
                </button>
                <button
                  onClick={executeImport}
                  disabled={editableRows.length === 0}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Upload size={13} /> Yukle ({editableRows.length} satir)
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── STEP: Importing ─────────────────────────────────────── */}
        {step === 'importing' && (
          <div className="flex flex-col items-center gap-4 py-12">
            <Loader2 size={28} className="animate-spin text-blue-600" />
            <p className="text-sm font-semibold text-zinc-800">Veriler yukleniyor...</p>
          </div>
        )}

        {/* ── STEP: Done ──────────────────────────────────────────── */}
        {step === 'done' && result && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle size={28} className="text-emerald-600" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-zinc-900">{result.imported} kalem yuklendi</p>
              {result.skipped > 0 && (
                <p className="text-xs text-amber-600 mt-1">{result.skipped} satir atlandi</p>
              )}
              <p className="text-xs text-zinc-400 mt-2">Envanter ve Stok Yonetimi otomatik senkronize edildi</p>
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-zinc-900 text-white hover:bg-zinc-800 transition-colors"
            >
              Tamam
            </button>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
            <AlertTriangle size={14} /> {error}
          </div>
        )}
      </div>
    </DraggableModal>
  )
}
