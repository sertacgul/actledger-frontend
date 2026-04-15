import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

const TR_DAYS   = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
const TR_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

function format(d: Date) {
  const hh  = String(d.getHours()).padStart(2, '0')
  const mm  = String(d.getMinutes()).padStart(2, '0')
  const ss  = String(d.getSeconds()).padStart(2, '0')
  const day = d.getDate()
  const mon = TR_MONTHS[d.getMonth()]
  const dow = TR_DAYS[d.getDay()]
  return { hh, mm, ss, day, mon, dow }
}

export default function LiveClock() {
  const [now, setNow] = useState<Date>(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const { hh, mm, ss, day, mon, dow } = format(now)

  return (
    <div
      className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md border"
      style={{ background: 'var(--border-subtle)', borderColor: 'var(--border)' }}
      title={`${dow}, ${day} ${mon}`}
    >
      <Clock size={12} style={{ color: 'var(--text-3)' }} />
      <div className="flex items-baseline gap-1.5">
        <span className="text-[12px] font-mono font-bold tabular-nums leading-none" style={{ color: 'var(--text-1)' }}>
          {hh}:{mm}
          <span className="text-[10px] opacity-60">:{ss}</span>
        </span>
        <span className="text-[10px] font-medium leading-none hidden lg:inline" style={{ color: 'var(--text-3)' }}>
          {day} {mon} · {dow.slice(0, 3)}
        </span>
      </div>
    </div>
  )
}
