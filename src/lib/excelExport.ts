import * as XLSX from 'xlsx'

export interface ExcelColumn<T> {
  /** Column header label */
  header: string
  /** Function that returns the cell value for a row */
  accessor: (row: T) => string | number | boolean | null | undefined
  /** Optional column width hint (in characters) */
  width?: number
}

/**
 * Export an array of objects to an .xlsx file and trigger a browser download.
 *
 * @example
 * exportToExcel({
 *   filename: 'gorevler.xlsx',
 *   sheetName: 'Görevler',
 *   columns: [
 *     { header: 'Başlık',     accessor: t => t.title },
 *     { header: 'Durum',      accessor: t => TASK_STATUS_LABELS[t.status] },
 *     { header: 'Bitiş',      accessor: t => new Date(t.dueDate).toLocaleDateString('tr-TR') },
 *   ],
 *   rows: tasks,
 * })
 */
export function exportToExcel<T>(opts: {
  filename:  string
  sheetName?: string
  columns:   ExcelColumn<T>[]
  rows:      T[]
}): void {
  const sheetName = (opts.sheetName ?? 'Sayfa1').slice(0, 31)

  // Header row + data rows as Array-of-Arrays so we can preserve column order
  const aoa: (string | number | boolean | null)[][] = []
  aoa.push(opts.columns.map(c => c.header))
  for (const row of opts.rows) {
    aoa.push(opts.columns.map(c => {
      const v = c.accessor(row)
      if (v === undefined || v === null) return ''
      if (typeof v === 'boolean') return v ? 'Evet' : 'Hayır'
      return v
    }))
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa)

  // Apply column widths if any provided
  ws['!cols'] = opts.columns.map(c => ({ wch: c.width ?? Math.max(12, c.header.length + 2) }))

  // Freeze the header row for easier scrolling
  ws['!freeze'] = { xSplit: 0, ySplit: 1 }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  // Force .xlsx extension
  const finalName = opts.filename.endsWith('.xlsx') ? opts.filename : `${opts.filename}.xlsx`
  XLSX.writeFile(wb, finalName)
}

// ── Multi-sheet export ──────────────────────────────────────────────────────

export interface SheetData<T = any> {
  sheetName: string
  columns: ExcelColumn<T>[]
  rows: T[]
}

export function exportMultiSheet(opts: {
  filename: string
  sheets: SheetData[]
}): void {
  const wb = XLSX.utils.book_new()

  for (const sheet of opts.sheets) {
    const name = sheet.sheetName.slice(0, 31)

    if (sheet.rows.length === 0) {
      const ws = XLSX.utils.aoa_to_sheet([sheet.columns.map(c => c.header)])
      XLSX.utils.book_append_sheet(wb, ws, name)
      continue
    }

    const headers = sheet.columns.map(c => c.header)
    const data = sheet.rows.map(row =>
      sheet.columns.map(c => {
        const val = c.accessor(row)
        if (val === undefined || val === null) return ''
        if (typeof val === 'boolean') return val ? 'Evet' : 'Hayir'
        return val
      })
    )

    const ws = XLSX.utils.aoa_to_sheet([headers, ...data])
    ws['!cols'] = sheet.columns.map(c => ({ wch: c.width ?? 16 }))
    ws['!freeze'] = { xSplit: 0, ySplit: 1 }

    XLSX.utils.book_append_sheet(wb, ws, name)
  }

  const finalName = opts.filename.endsWith('.xlsx') ? opts.filename : `${opts.filename}.xlsx`
  XLSX.writeFile(wb, finalName)
}

/** Quick CSV alternative without xlsx - kept for completeness */
export function exportToCSV<T>(opts: {
  filename: string
  columns:  ExcelColumn<T>[]
  rows:     T[]
}): void {
  const escape = (v: unknown) => {
    if (v === undefined || v === null) return ''
    const s = String(v)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }

  const lines: string[] = []
  lines.push(opts.columns.map(c => escape(c.header)).join(','))
  for (const row of opts.rows) {
    lines.push(opts.columns.map(c => escape(c.accessor(row))).join(','))
  }

  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = opts.filename.endsWith('.csv') ? opts.filename : `${opts.filename}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
