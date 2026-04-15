import { useState, useRef } from 'react'
import { Upload, FileSpreadsheet, Database, AlertTriangle, CheckCircle, X } from 'lucide-react'
import clsx from 'clsx'
import * as XLSX from 'xlsx'
import DraggableModal from './DraggableModal'
import { useLanguage } from '../../context/LanguageContext'

export interface ColumnMapping {
  /** The expected field name in the target system */
  field: string
  /** Display label for the user */
  label: string
  /** Whether this field is required */
  required?: boolean
}

interface Props {
  title: string
  columns: ColumnMapping[]
  onImport: (rows: Record<string, string>[]) => Promise<{ success: number; failed: number }>
  onClose: () => void
}

type Tab = 'excel' | 'sql'

export default function BulkImportModal({ title, columns, onImport, onClose }: Props) {
  const { t } = useLanguage()
  const [tab, setTab] = useState<Tab>('excel')
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [sqlText, setSqlText] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Excel parse ──────────────────────────────────────────────────────────────
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setResult(null)
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' })
        if (json.length === 0) { setError('Excel dosyasi bos'); return }
        const hdrs = Object.keys(json[0])
        setHeaders(hdrs)
        setParsedRows(json.map(row => {
          const out: Record<string, string> = {}
          for (const h of hdrs) out[h] = String(row[h] ?? '')
          return out
        }))
        // Auto-map columns by fuzzy match
        const autoMap: Record<string, string> = {}
        for (const col of columns) {
          const match = hdrs.find(h =>
            h.toLowerCase().replace(/[_\s-]/g, '') === col.field.toLowerCase().replace(/[_\s-]/g, '') ||
            h.toLowerCase().includes(col.field.toLowerCase()) ||
            h.toLowerCase().includes(col.label.toLowerCase())
          )
          if (match) autoMap[col.field] = match
        }
        setMapping(autoMap)
      } catch {
        setError('Excel dosyasi okunamadi')
      }
    }
    reader.readAsBinaryString(file)
  }

  // ── SQL parse ────────────────────────────────────────────────────────────────
  const parseSql = () => {
    setError(null)
    setResult(null)
    try {
      const text = sqlText.trim()
      if (!text) { setError('SQL metni bos'); return }

      // Support INSERT INTO ... VALUES (...), (...) format
      const insertMatch = text.match(/INSERT\s+INTO\s+\w+\s*\(([^)]+)\)\s*VALUES\s*([\s\S]+)/i)
      if (insertMatch) {
        const cols = insertMatch[1].split(',').map(c => c.trim().replace(/["`[\]]/g, ''))
        const valuesBlock = insertMatch[2]
        const rowMatches = valuesBlock.match(/\(([^)]+)\)/g)
        if (!rowMatches) { setError('VALUES bolumu ayrilamadi'); return }
        const rows = rowMatches.map(rm => {
          const vals = rm.slice(1, -1).split(',').map(v => v.trim().replace(/^['"]|['"]$/g, ''))
          const row: Record<string, string> = {}
          cols.forEach((c, i) => { row[c] = vals[i] ?? '' })
          return row
        })
        setHeaders(cols)
        setParsedRows(rows)
        const autoMap: Record<string, string> = {}
        for (const col of columns) {
          const match = cols.find(c => c.toLowerCase().replace(/[_\s-]/g, '') === col.field.toLowerCase().replace(/[_\s-]/g, ''))
          if (match) autoMap[col.field] = match
        }
        setMapping(autoMap)
        return
      }

      // Support CSV-like tab/comma separated with header row
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
      setParsedRows(rows)
      const autoMap: Record<string, string> = {}
      for (const col of columns) {
        const match = hdrs.find(h => h.toLowerCase().replace(/[_\s-]/g, '') === col.field.toLowerCase().replace(/[_\s-]/g, ''))
        if (match) autoMap[col.field] = match
      }
      setMapping(autoMap)
    } catch {
      setError('SQL/CSV ayrilamadi')
    }
  }

  // ── Import ───────────────────────────────────────────────────────────────────
  const handleImport = async () => {
    setError(null)
    // Map parsed rows to target fields
    const mapped = parsedRows.map(row => {
      const out: Record<string, string> = {}
      for (const col of columns) {
        const sourceCol = mapping[col.field]
        if (sourceCol && row[sourceCol] !== undefined) {
          out[col.field] = row[sourceCol]
        }
      }
      return out
    })
    // Validate required fields
    const missing = columns.filter(c => c.required && !mapping[c.field])
    if (missing.length > 0) {
      setError(`Zorunlu alanlar eslestirilmedi: ${missing.map(m => m.label).join(', ')}`)
      return
    }
    setImporting(true)
    try {
      const res = await onImport(mapped)
      setResult(res)
    } catch (e: any) {
      setError(e.message ?? 'Icerik aktarma hatasi')
    } finally {
      setImporting(false)
    }
  }

  const hasData = parsedRows.length > 0

  return (
    <DraggableModal title={title} onClose={onClose} width={640} maxHeight="85vh">
      <div className="p-5 space-y-4">
        {/* Tab selector */}
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--border-subtle)' }}>
          <button
            type="button"
            onClick={() => { setTab('excel'); setParsedRows([]); setHeaders([]); setError(null); setResult(null) }}
            className={clsx('flex items-center gap-2 px-4 py-2 rounded-md text-[12px] font-medium flex-1 justify-center transition-all',
              tab === 'excel' ? 'bg-white shadow text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'
            )}
          >
            <FileSpreadsheet size={14} /> Excel
          </button>
          <button
            type="button"
            onClick={() => { setTab('sql'); setParsedRows([]); setHeaders([]); setError(null); setResult(null) }}
            className={clsx('flex items-center gap-2 px-4 py-2 rounded-md text-[12px] font-medium flex-1 justify-center transition-all',
              tab === 'sql' ? 'bg-white shadow text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'
            )}
          >
            <Database size={14} /> SQL / CSV
          </button>
        </div>

        {/* Excel upload */}
        {tab === 'excel' && (
          <div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full flex flex-col items-center gap-2 p-8 rounded-xl border-2 border-dashed transition-colors hover:border-blue-400 hover:bg-blue-50/50"
              style={{ borderColor: 'var(--border)' }}
            >
              <Upload size={28} className="text-zinc-400" />
              <span className="text-[13px] font-medium" style={{ color: 'var(--text-2)' }}>
                Excel veya CSV dosyasi secin
              </span>
              <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>.xlsx, .xls, .csv</span>
            </button>
          </div>
        )}

        {/* SQL/CSV paste */}
        {tab === 'sql' && (
          <div className="space-y-2">
            <textarea
              className="input text-[11px] font-mono min-h-[140px] resize-y"
              placeholder={"INSERT INTO items (name, code, quantity) VALUES\n('Masa', 'TBL-001', 10),\n('Sandalye', 'CHR-002', 40);\n\nveya CSV:\nname,code,quantity\nMasa,TBL-001,10\nSandalye,CHR-002,40"}
              value={sqlText}
              onChange={e => setSqlText(e.target.value)}
            />
            <button type="button" className="btn-default btn-sm" onClick={parseSql}>
              <Database size={12} /> Ayristir
            </button>
          </div>
        )}

        {/* Preview + Column Mapping */}
        {hasData && (
          <div className="space-y-3">
            <p className="text-[12px] font-semibold" style={{ color: 'var(--text-1)' }}>
              {parsedRows.length} satir okundu - Kolon eslemesi:
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {columns.map(col => (
                <div key={col.field} className="flex items-center gap-2">
                  <label className="text-[11px] font-medium w-28 truncate" style={{ color: 'var(--text-2)' }}>
                    {col.label} {col.required && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    className="select text-[11px] flex-1"
                    value={mapping[col.field] ?? ''}
                    onChange={e => setMapping(prev => ({ ...prev, [col.field]: e.target.value }))}
                  >
                    <option value="">-- sec --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>

            {/* Data preview table */}
            <div className="overflow-x-auto max-h-40 rounded-lg border" style={{ borderColor: 'var(--border)' }}>
              <table className="w-full text-[10px]">
                <thead>
                  <tr style={{ background: 'var(--border-subtle)' }}>
                    {headers.slice(0, 6).map(h => (
                      <th key={h} className="px-2 py-1.5 text-left font-semibold" style={{ color: 'var(--text-3)' }}>{h}</th>
                    ))}
                    {headers.length > 6 && <th className="px-2 py-1.5" style={{ color: 'var(--text-3)' }}>...</th>}
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 5).map((row, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                      {headers.slice(0, 6).map(h => (
                        <td key={h} className="px-2 py-1" style={{ color: 'var(--text-2)' }}>{String(row[h] ?? '').slice(0, 30)}</td>
                      ))}
                      {headers.length > 6 && <td className="px-2 py-1" style={{ color: 'var(--text-3)' }}>...</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Error / Result */}
        {error && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-[12px] text-red-700 font-medium">
            <AlertTriangle size={14} /> {error}
          </div>
        )}
        {result && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[12px] text-emerald-700 font-medium">
            <CheckCircle size={14} /> {result.success} basarili, {result.failed} basarisiz
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-default btn-sm" onClick={onClose}>{t('common_cancel')}</button>
          <button
            type="button"
            className="btn-dark btn-sm"
            onClick={handleImport}
            disabled={!hasData || importing}
          >
            <Upload size={13} /> {importing ? t('common_loading') : `${t('common_apply')} (${parsedRows.length})`}
          </button>
        </div>
      </div>
    </DraggableModal>
  )
}
