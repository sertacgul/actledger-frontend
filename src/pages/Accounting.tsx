import { useState } from 'react'
import { Calculator, List, BookOpen, FileText, BarChart3, Landmark } from 'lucide-react'
import clsx from 'clsx'
import { useLanguage } from '../context/LanguageContext'
import AccountsTab from '../components/accounting/AccountsTab'
import JournalTab from '../components/accounting/JournalTab'
import EInvoiceTab from '../components/accounting/EInvoiceTab'
import ReportsTab from '../components/accounting/ReportsTab'
import BankTab from '../components/accounting/BankTab'

type AccTab = 'accounts' | 'journal' | 'einvoice' | 'bank' | 'reports'

const TABS: { id: AccTab; icon: typeof List; labelTr: string; labelEn: string }[] = [
  { id: 'accounts', icon: List,      labelTr: 'Hesap Plani',  labelEn: 'Chart of Accounts' },
  { id: 'journal',  icon: BookOpen,  labelTr: 'Yevmiye',      labelEn: 'Journal' },
  { id: 'einvoice', icon: FileText,  labelTr: 'E-Fatura',     labelEn: 'E-Invoice' },
  { id: 'bank',     icon: Landmark,  labelTr: 'Banka',        labelEn: 'Bank' },
  { id: 'reports',  icon: BarChart3, labelTr: 'Raporlar',     labelEn: 'Reports' },
]

export default function Accounting() {
  const [tab, setTab] = useState<AccTab>('accounts')
  const { lang } = useLanguage()

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
          <Calculator className="w-5 h-5 text-emerald-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--text-1)]">
            {lang === 'tr' ? 'Muhasebe' : 'Accounting'}
          </h1>
          <p className="text-sm text-[var(--text-3)]">
            {lang === 'tr' ? 'Hesap plani, yevmiye, e-fatura ve raporlar' : 'Chart of accounts, journal, e-invoice and reports'}
          </p>
        </div>
      </div>

      <div className="flex gap-1 p-1 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
              tab === t.id
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg)]'
            )}
          >
            <t.icon className="w-4 h-4" />
            {lang === 'tr' ? t.labelTr : t.labelEn}
          </button>
        ))}
      </div>

      {tab === 'accounts' && <AccountsTab />}
      {tab === 'journal' && <JournalTab />}
      {tab === 'einvoice' && <EInvoiceTab />}
      {tab === 'bank' && <BankTab />}
      {tab === 'reports' && <ReportsTab />}
    </div>
  )
}
