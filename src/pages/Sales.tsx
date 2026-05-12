import { useState } from 'react'
import { ShoppingCart, Users, FileText, Monitor } from 'lucide-react'
import clsx from 'clsx'
import { useLanguage } from '../context/LanguageContext'
import CustomersTab from '../components/sales/CustomersTab'
import OrdersTab from '../components/sales/OrdersTab'
import POSTab from '../components/sales/POSTab'

type SalesTab = 'customers' | 'orders' | 'pos'

const TABS: { id: SalesTab; icon: typeof Users; labelTr: string; labelEn: string }[] = [
  { id: 'customers', icon: Users,    labelTr: 'Musteriler',  labelEn: 'Customers' },
  { id: 'orders',    icon: FileText, labelTr: 'Siparisler',  labelEn: 'Orders' },
  { id: 'pos',       icon: Monitor,  labelTr: 'POS',         labelEn: 'POS' },
]

export default function Sales() {
  const [tab, setTab] = useState<SalesTab>('customers')
  const { lang } = useLanguage()

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
          <ShoppingCart className="w-5 h-5 text-indigo-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--text-1)]">
            {lang === 'tr' ? 'Satis Yonetimi' : 'Sales Management'}
          </h1>
          <p className="text-sm text-[var(--text-3)]">
            {lang === 'tr' ? 'Musteri, siparis ve POS islemleri' : 'Customer, order and POS operations'}
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
                ? 'bg-indigo-500 text-white shadow-sm'
                : 'text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg)]'
            )}
          >
            <t.icon className="w-4 h-4" />
            {lang === 'tr' ? t.labelTr : t.labelEn}
          </button>
        ))}
      </div>

      {tab === 'customers' && <CustomersTab />}
      {tab === 'orders' && <OrdersTab />}
      {tab === 'pos' && <POSTab />}
    </div>
  )
}
