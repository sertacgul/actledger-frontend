import { useState } from 'react'
import { UserCog, Users, Calendar, Banknote } from 'lucide-react'
import clsx from 'clsx'
import { useLanguage } from '../context/LanguageContext'
import EmployeesTab from '../components/hr/EmployeesTab'
import LeavesTab from '../components/hr/LeavesTab'
import PayrollTab from '../components/hr/PayrollTab'

type HRTab = 'employees' | 'leaves' | 'payroll'

const TABS: { id: HRTab; icon: typeof Users; labelTr: string; labelEn: string }[] = [
  { id: 'employees', icon: Users,    labelTr: 'Calisanlar',  labelEn: 'Employees' },
  { id: 'leaves',    icon: Calendar, labelTr: 'Izinler',     labelEn: 'Leaves' },
  { id: 'payroll',   icon: Banknote, labelTr: 'Bordro',      labelEn: 'Payroll' },
]

export default function HRPage() {
  const [tab, setTab] = useState<HRTab>('employees')
  const { lang } = useLanguage()

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
          <UserCog className="w-5 h-5 text-violet-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--text-1)]">
            {lang === 'tr' ? 'Insan Kaynaklari' : 'Human Resources'}
          </h1>
          <p className="text-sm text-[var(--text-3)]">
            {lang === 'tr' ? 'Calisan, izin ve bordro yonetimi' : 'Employee, leave and payroll management'}
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
                ? 'bg-violet-500 text-white shadow-sm'
                : 'text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg)]'
            )}
          >
            <t.icon className="w-4 h-4" />
            {lang === 'tr' ? t.labelTr : t.labelEn}
          </button>
        ))}
      </div>

      {tab === 'employees' && <EmployeesTab />}
      {tab === 'leaves' && <LeavesTab />}
      {tab === 'payroll' && <PayrollTab />}
    </div>
  )
}
