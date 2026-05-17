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

  const renderSalesSummary = (data: any) => (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs text-[var(--text-3)] mb-1">{tr ? 'Toplam Satis' : 'Total Sales'}</p>
          <p className="text-xl font-mono font-bold text-emerald-600">{TRY_FMT(data.totalSales)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-[var(--text-3)] mb-1">{tr ? 'Siparis Sayisi' : 'Order Count'}</p>
          <p className="text-xl font-mono font-bold text-[var(--text-1)]">{data.orderCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-[var(--text-3)] mb-1">{tr ? 'Ortalama Siparis' : 'Avg. Order'}</p>
          <p className="text-xl font-mono font-bold text-[var(--text-1)]">{TRY_FMT(data.averageOrderValue)}</p>
        </div>
      </div>
      {/* Payment breakdown */}
      {data.paymentBreakdown?.length > 0 && (
        <div className="card p-4">
          <h3 className="font-semibold text-[var(--text-1)] mb-3">{tr ? 'Odeme Yontemleri' : 'Payment Methods'}</h3>
          {data.paymentBreakdown.map((p: any) => (
            <div key={p.method} className="flex justify-between text-sm py-1.5 border-b border-[var(--border)] last:border-0">
              <span className="text-[var(--text-2)]">{p.method}</span>
              <span className="font-mono text-[var(--text-1)]">{TRY_FMT(p.total)} <span className="text-[var(--text-3)]">({p.count})</span></span>
            </div>
          ))}
        </div>
      )}
      {/* Top customers */}
      {data.topCustomers?.length > 0 && (
        <div className="card p-4">
          <h3 className="font-semibold text-[var(--text-1)] mb-3">{tr ? 'En Iyi Musteriler' : 'Top Customers'}</h3>
          {data.topCustomers.map((c: any, i: number) => (
            <div key={i} className="flex justify-between text-sm py-1.5 border-b border-[var(--border)] last:border-0">
              <span className="text-[var(--text-2)]">{c.name}</span>
              <span className="font-mono text-[var(--text-1)]">{TRY_FMT(c.total)} <span className="text-[var(--text-3)]">({c.orderCount} {tr ? 'siparis' : 'orders'})</span></span>
            </div>
          ))}
        </div>
      )}
      {/* Trend */}
      {data.trend?.length > 0 && (
        <div className="card p-4">
          <h3 className="font-semibold text-[var(--text-1)] mb-3">{tr ? 'Donem Trendi' : 'Period Trend'}</h3>
          {data.trend.map((t: any) => (
            <div key={t.period} className="flex justify-between text-sm py-1.5 border-b border-[var(--border)] last:border-0">
              <span className="text-[var(--text-2)]">{t.period}</span>
              <span className="font-mono text-[var(--text-1)]">{TRY_FMT(t.total)} <span className="text-[var(--text-3)]">({t.count})</span></span>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderEInvoiceSummary = (data: any) => (
    <div className="space-y-4">
      {/* Outgoing / Incoming */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <h3 className="font-semibold text-[var(--text-1)]">{tr ? 'Giden Faturalar' : 'Outgoing Invoices'}</h3>
          </div>
          <p className="text-lg font-mono font-bold text-emerald-600">{TRY_FMT(data.outgoing?.total)}</p>
          <p className="text-xs text-[var(--text-3)] mt-1">{data.outgoing?.count} {tr ? 'adet' : 'invoices'}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <h3 className="font-semibold text-[var(--text-1)]">{tr ? 'Gelen Faturalar' : 'Incoming Invoices'}</h3>
          </div>
          <p className="text-lg font-mono font-bold text-red-600">{TRY_FMT(data.incoming?.total)}</p>
          <p className="text-xs text-[var(--text-3)] mt-1">{data.incoming?.count} {tr ? 'adet' : 'invoices'}</p>
        </div>
      </div>
      {/* Status breakdown */}
      {data.statusBreakdown?.length > 0 && (
        <div className="card p-4">
          <h3 className="font-semibold text-[var(--text-1)] mb-3">{tr ? 'Durum Dagilimi' : 'Status Breakdown'}</h3>
          {data.statusBreakdown.map((s: any) => (
            <div key={s.status} className="flex justify-between text-sm py-1.5 border-b border-[var(--border)] last:border-0">
              <span className="text-[var(--text-2)]">{s.status}</span>
              <span className="font-mono text-[var(--text-1)]">{s.count} {tr ? 'adet' : 'pcs'}</span>
            </div>
          ))}
        </div>
      )}
      {/* Monthly trend */}
      {data.monthlyTrend?.length > 0 && (
        <div className="card p-4">
          <h3 className="font-semibold text-[var(--text-1)] mb-3">{tr ? 'Aylik Trend' : 'Monthly Trend'}</h3>
          {data.monthlyTrend.map((m: any) => (
            <div key={m.month} className="flex justify-between text-sm py-1.5 border-b border-[var(--border)] last:border-0">
              <span className="text-[var(--text-2)]">{m.month}</span>
              <div className="text-right font-mono text-[var(--text-1)]">
                <span className="text-emerald-600">{tr ? 'Giden' : 'Out'}: {m.outCount}</span>
                <span className="mx-2 text-[var(--text-3)]">|</span>
                <span className="text-red-600">{tr ? 'Gelen' : 'In'}: {m.inCount}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderTaxSummary = (data: any) => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs text-[var(--text-3)] mb-1">{tr ? 'Hesaplanan KDV' : 'Collected Tax'}</p>
          <p className="text-xl font-mono font-bold text-emerald-600">{TRY_FMT(data.collectedTax)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-[var(--text-3)] mb-1">{tr ? 'Indirilecek KDV' : 'Paid Tax'}</p>
          <p className="text-xl font-mono font-bold text-red-600">{TRY_FMT(data.paidTax)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-[var(--text-3)] mb-1">{data.description ?? (tr ? 'Net KDV' : 'Net Tax')}</p>
          <p className={clsx('text-xl font-mono font-bold', data.description === 'Odenecek KDV' ? 'text-red-600' : 'text-emerald-600')}>{TRY_FMT(data.netTax)}</p>
        </div>
      </div>
    </div>
  )

  const renderCashFlow = (data: any) => (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-[var(--text-3)] mb-1">{tr ? 'Acilis Bakiyesi' : 'Opening Balance'}</p>
          <p className="text-lg font-mono font-bold text-[var(--text-1)]">{TRY_FMT(data.openingBalance)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-[var(--text-3)] mb-1">{tr ? 'Toplam Giris' : 'Total Inflow'}</p>
          <p className="text-lg font-mono font-bold text-emerald-600">{TRY_FMT(data.totalInflow)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-[var(--text-3)] mb-1">{tr ? 'Toplam Cikis' : 'Total Outflow'}</p>
          <p className="text-lg font-mono font-bold text-red-600">{TRY_FMT(data.totalOutflow)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-[var(--text-3)] mb-1">{tr ? 'Kapanis Bakiyesi' : 'Closing Balance'}</p>
          <p className="text-lg font-mono font-bold text-[var(--text-1)]">{TRY_FMT(data.closingBalance)}</p>
        </div>
      </div>
      {/* Account details */}
      {data.accounts?.length > 0 && (
        <div className="card p-4">
          <h3 className="font-semibold text-[var(--text-1)] mb-3">{tr ? 'Hesap Detaylari' : 'Account Details'}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-3)] text-xs">
                  <th className="text-left py-2">{tr ? 'Hesap' : 'Account'}</th>
                  <th className="text-right py-2">{tr ? 'Acilis' : 'Opening'}</th>
                  <th className="text-right py-2">{tr ? 'Giris' : 'Inflow'}</th>
                  <th className="text-right py-2">{tr ? 'Cikis' : 'Outflow'}</th>
                  <th className="text-right py-2">{tr ? 'Kapanis' : 'Closing'}</th>
                </tr>
              </thead>
              <tbody>
                {data.accounts.map((a: any) => (
                  <tr key={a.code} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-2 text-[var(--text-2)]">{a.code} - {a.name}</td>
                    <td className="py-2 text-right font-mono text-[var(--text-1)]">{TRY_FMT(a.openingBalance)}</td>
                    <td className="py-2 text-right font-mono text-emerald-600">{TRY_FMT(a.inflow)}</td>
                    <td className="py-2 text-right font-mono text-red-600">{TRY_FMT(a.outflow)}</td>
                    <td className="py-2 text-right font-mono font-semibold text-[var(--text-1)]">{TRY_FMT(a.closingBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
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
          {reportType === 'sales-summary' && renderSalesSummary(report)}
          {reportType === 'einvoice-summary' && renderEInvoiceSummary(report)}
          {reportType === 'tax-summary' && renderTaxSummary(report)}
          {reportType === 'cash-flow' && renderCashFlow(report)}
        </>
      )}
    </div>
  )
}
