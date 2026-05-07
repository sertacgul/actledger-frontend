import { useState, useEffect } from 'react'
import { X, Bell } from 'lucide-react'

interface PushBannerData {
  title: string
  message: string
  link?: string
}

let _showBanner: ((data: PushBannerData) => void) | null = null

export function triggerPushBanner(data: PushBannerData) {
  _showBanner?.(data)
}

export default function PushBanner({ onNavigate }: { onNavigate: (link: string) => void }) {
  const [banner, setBanner] = useState<PushBannerData | null>(null)

  useEffect(() => {
    _showBanner = (data) => {
      setBanner(data)
      setTimeout(() => setBanner(null), 4000)
    }
    return () => { _showBanner = null }
  }, [])

  if (!banner) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] mx-auto animate-slide-up"
      style={{ maxWidth: 'inherit', paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <button
        type="button"
        onClick={() => { if (banner.link) onNavigate(banner.link); setBanner(null) }}
        className="w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-lg px-4 py-3 flex items-start gap-3 text-left"
      >
        <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bell size={14} className="text-cyan-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-slate-800 truncate">{banner.title}</p>
          <p className="text-[12px] text-slate-500 truncate">{banner.message}</p>
        </div>
        <button type="button" onClick={e => { e.stopPropagation(); setBanner(null) }} className="p-1 text-slate-400">
          <X size={14} />
        </button>
      </button>
    </div>
  )
}
