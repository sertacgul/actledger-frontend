import { useState } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import clsx from 'clsx'
import { useAccountingReport } from '../../lib/erp-hooks'
import { useLanguage } from '../../context/LanguageContext'
import { TRY_FMT } from '../../types/erp'

type ReportType = 'income-expense' | 'balance-sheet' | 'sales-summary' | 'einvoice-summary' | 'tax-summary' | 'cash-flow'

const REPORT_TYPES: { id: ReportType; labelTr: string; labelEn: string }[] = [
  { id: 'income-expense',    labelTr: 'Gelir-Gider',       labelEn: 'Income/Expense' },
  { id: 'balance-sheet',     labelTr: 'Bilanco',           labelEn: 'Balance Sheet' },
  { id: 'sales-summary',     labelTr: 'Satis Ozeti',       labelEn: 'Sales Summary' },
  { id: 'einvoice-summary',  labelTr: 'E-Fatura Ozeti',    labelEn: 'E-Invoice Summary' },
  { id: 'tax-summary',       labelTr: 'KDV Ozeti',         labelEn: 'Tax Summary' },
  { id: 'cash-flow',         labelTr: 'Nakit Akisi',       labelEn: 'Cash Flow' },
]

export default function ReportsTab() {
  const { lang } = useLanguage()
  const tr = lang === 'tr'

  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const today = now.toISOString().slice(0, 10)

  const [reportType, setReportType] = useState<ReportType>('income-expense')
  const [dateFrom, setDateFrom] = useState(firstOfMonth)
  const [dateTo, setDateTo] = useState(today)

  const { report, loading, error } = useAccountingReport(reportType, dateFrom, dateTo)

  const renderIncomeExpense = (data: any) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <h3 className="font-semibold text-[var(--text-1)]">{tr ? 'Gelirler' : 'Income'}</h3>
          <span className="ml-auto text-lg font-mono font-bold text-emerald-600">{TRY_FMT(data.income?.total)}</span>
        </div>
        {data.income?.accounts?.map((a: any) => (
          <div key={a.code} className="flex justify-between text-sm py-1 border-b border-[var(--border)] last:border-0">
            <span className="text-[var(--text-2)]">{a.code} - {a.name}</span>
            <span className="font-mono text-[var(--text-1)]">{TRY_FMT(a.amount)}</span>
          </div>
        ))}
      </div>
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown className="w-4 h-4 text-red-500" />
          <h3 className="font-semibold text-[var(--text-1)]">{tr ? 'Giderler' : 'Expenses'}</h3>
          <span className="ml-auto text-lg font-mono font-bold text-red-600">{TRY_FMT(data.expense?.total)}</span>
        </div>
        {data.expense?.accounts?.map((a: any) => (
          <div key={a.code} className="flex justify-between text-sm py-1 border-b border-[var(--border)] last:border-0">
            <span className="text-[var(--text-2)]">{a.code} - {a.name}</span>
            <span className="font-mono text-[var(--text-1)]">{TRY_FMT(a.amount)}</span>
          </div>
        ))}
      </div>
      <div className="md:col-span-2 card p-4 flex items-center justify-between">
        <span className="font-semibold text-[var(--text-1)]">{tr ? 'Net Kar/Zarar' : 'Net Profit/Loss'}</span>
        <span className={clsx('text-2xl font-mono font-bold', (data.profit ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600')}>{TRY_FMT(data.profit)}</span>
      </div>
    </div>
  )

  const renderBalanceSheet = (data: any) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {['assets', 'liabilities', 'equity'].map(section => {
        const label = section === 'assets' ? (tr ? 'Varliklar' : 'Assets') : section === 'liabilities' ? (tr ? 'Yukumlulukler' : 'Liabilities') : (tr ? 'Ozkaynaklar' : 'Equity')
        return (
          <div key={section} className="card p-4">
            <h3 className="font-semibold text-[var(--text-1)] mb-3">{label}: <span className="font-mono">{TRY_FMT(data[section]?.total)}</span></h3>
            {data[section]?.accounts?.map((a: any) => (
              <div key={a.code} className="flex justify-between text-sm py-1 border-b border-[var(--border)] last:border-0">
                <span className="text-[var(--text-2)]">{a.name}</span>
                <span className="font-mono text-[var(--text-1)]">{TRY_FMT(a.balance)}</span>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )

  const renderGeneric = (data: any) => (
    <div className="card p-4">
      <pre className="text-sm text-[var(--text-2)] whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select className="select" value={reportType} onChange={e => setReportType(e.target.value as ReportType)}>
          {REPORT_TYPES.map(r => <option key={r.id} value={r.id}>{tr ? r.labelTr : r.labelEn}</option>)}
        </select>
        <input className="input" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <span className="text-[var(--text-3)]">-</span>
        <input className="input" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--text-3)]">{tr ? 'Rapor yukleniyor...' : 'Loading report...'}</div>
      ) : error ? (
        <div className="text-center py-12 text-red-500">{error}</div>
      ) : !report ? (
        <div className="text-center py-12 text-[var(--text-3)]">{tr ? 'Veri bulunamadi' : 'No data'}</div>
      ) : (
        <>
          {reportType === 'income-expense' && renderIncomeExpense(report)}
          {reportType === 'balance-sheet' && renderBalanceSheet(report)}
          {!['income-expense', 'balance-sheet'].includes(reportType) && renderGeneric(report)}
        </>
      )}
    </div>
  )
}
