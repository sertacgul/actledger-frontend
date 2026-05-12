import { useState, useEffect } from 'react'
import { Download, Check, X, Send } from 'lucide-react'
import clsx from 'clsx'
import {
  useMyExportRequests,
  requestDataExport, approveExportRequest, rejectExportRequest, getExportDownloadUrl,
} from '../../lib/erp-hooks'
import { api } from '../../lib/api'
import { useDepartments } from '../../lib/hooks'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import { SERVER_BASE } from '../../lib/api'
import DraggableModal from '../ui/DraggableModal'

const STATUS_LABELS: Record<string, string> = {
  BEKLIYOR: 'Onay Bekliyor', ONAYLANDI: 'Onaylandi', REDDEDILDI: 'Reddedildi',
  HAZIRLANIYOR: 'Hazirlaniyor', TAMAMLANDI: 'Hazir', SURESI_DOLDU: 'Suresi Doldu',
}
const STATUS_STYLES: Record<string, string> = {
  BEKLIYOR: 'bg-amber-100 text-amber-700', ONAYLANDI: 'bg-blue-100 text-blue-700',
  REDDEDILDI: 'bg-red-100 text-red-700', HAZIRLANIYOR: 'bg-indigo-100 text-indigo-700',
  TAMAMLANDI: 'bg-emerald-100 text-emerald-700', SURESI_DOLDU: 'bg-zinc-100 text-zinc-500',
}

export default function DataExportTab() {
  const { lang } = useLanguage()
  const { user } = useAuth()
  const tr = lang === 'tr'
  const role = user?.role ?? ''
  const isGM = ['genel_mudur', 'super_admin', 'gm_yardimcisi'].includes(role)
  const isKAM = role === 'platform_admin'

  const { departments } = useDepartments()
  const { requests: myRequests, refetch: refetchMy } = useMyExportRequests()

  // Pending requests - fetch manually only for GM roles
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [pendingLoading, setPendingLoading] = useState(false)

  const fetchPending = () => {
    if (!isGM) return
    setPendingLoading(true)
    api.get<any>('/data-export/pending')
      .then((r: any) => {
        const list = Array.isArray(r) ? r : Array.isArray(r?.data) ? r.data : []
        setPendingRequests(list)
      })
      .catch(() => setPendingRequests([]))
      .finally(() => setPendingLoading(false))
  }

  useEffect(() => { fetchPending() }, [isGM])

  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const today = now.toISOString().slice(0, 10)

  const [dateFrom, setDateFrom] = useState(firstOfMonth)
  const [dateTo, setDateTo] = useState(today)
  const [departmentId, setDepartmentId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const handleRequest = async () => {
    setSubmitting(true)
    try {
      await requestDataExport({
        dateFrom: new Date(dateFrom + 'T00:00:00.000Z').toISOString(),
        dateTo: new Date(dateTo + 'T23:59:59.999Z').toISOString(),
        departmentId: departmentId || undefined,
      })
      refetchMy()
      alert(tr ? 'Export talebi olusturuldu. Genel Mudur onayladiktan sonra dosya hazirlanacak.' : 'Export request created.')
    } catch (e: any) { alert(e.message) }
    finally { setSubmitting(false) }
  }

  const handleApprove = async (id: string) => {
    try { await approveExportRequest(id); fetchPending(); refetchMy() }
    catch (e: any) { alert(e.message) }
  }

  const handleReject = async () => {
    if (!rejectingId) return
    try { await rejectExportRequest(rejectingId, rejectReason || undefined); setRejectingId(null); setRejectReason(''); fetchPending(); refetchMy() }
    catch (e: any) { alert(e.message) }
  }

  const handleDownload = async (id: string) => {
    try {
      const url = await getExportDownloadUrl(id)
      window.open(`${SERVER_BASE}${url}`, '_blank')
    } catch (e: any) { alert(e.message) }
  }

  return (
    <div className="space-y-5">
      {/* New Request Form (KAM only) */}
      {isKAM && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{tr ? 'Yeni Export Talebi' : 'New Export Request'}</h4>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>{tr ? 'Baslangic' : 'From'}</label>
              <input className="input" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>{tr ? 'Bitis' : 'To'}</label>
              <input className="input" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>{tr ? 'Departman' : 'Department'}</label>
              <select className="select" value={departmentId} onChange={e => setDepartmentId(e.target.value)}>
                <option value="">{tr ? 'Tum Departmanlar' : 'All'}</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <button onClick={handleRequest} disabled={submitting} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-500 disabled:opacity-50">
              <Send className="w-4 h-4" />
              {submitting ? (tr ? 'Gonderiliyor...' : 'Submitting...') : (tr ? 'Export Talep Et' : 'Request Export')}
            </button>
          </div>
        </div>
      )}

      {/* Pending Approvals (GM only) */}
      {isGM && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{tr ? 'Onay Bekleyen Talepler' : 'Pending Approvals'}</h4>
          {pendingLoading ? (
            <div className="text-center py-4 text-sm" style={{ color: 'var(--text-3)' }}>{tr ? 'Yukleniyor...' : 'Loading...'}</div>
          ) : pendingRequests.length === 0 ? (
            <div className="text-center py-4 text-sm" style={{ color: 'var(--text-3)' }}>{tr ? 'Onay bekleyen talep yok' : 'No pending requests'}</div>
          ) : (
            pendingRequests.map(r => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50">
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-800">{r.requestedBy?.name ?? 'KAM'}</div>
                  <div className="text-xs text-slate-500">
                    {new Date(r.dateFrom).toLocaleDateString('tr-TR')} - {new Date(r.dateTo).toLocaleDateString('tr-TR')}
                  </div>
                </div>
                <button onClick={() => handleApprove(r.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600">
                  <Check className="w-3.5 h-3.5" />{tr ? 'Onayla' : 'Approve'}
                </button>
                <button onClick={() => { setRejectingId(r.id); setRejectReason('') }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600">
                  <X className="w-3.5 h-3.5" />{tr ? 'Reddet' : 'Reject'}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Request History (both KAM and GM) */}
      {(isKAM || isGM) && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{tr ? 'Gecmis Talepler' : 'Request History'}</h4>
          {myRequests.length === 0 ? (
            <div className="text-center py-6 text-sm" style={{ color: 'var(--text-3)' }}>{tr ? 'Henuz export talebi yok' : 'No export requests yet'}</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                    <th className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--text-2)' }}>{tr ? 'Talep Eden' : 'Requested By'}</th>
                    <th className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--text-2)' }}>{tr ? 'Tarih Araligi' : 'Date Range'}</th>
                    <th className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--text-2)' }}>{tr ? 'Durum' : 'Status'}</th>
                    <th className="text-right px-4 py-2.5 font-medium" style={{ color: 'var(--text-2)' }} />
                  </tr>
                </thead>
                <tbody>
                  {myRequests.map(r => (
                    <tr key={r.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
                      <td className="px-4 py-2.5" style={{ color: 'var(--text-1)' }}>{r.requestedBy?.name ?? '-'}</td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--text-3)' }}>
                        {new Date(r.dateFrom).toLocaleDateString('tr-TR')} - {new Date(r.dateTo).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_STYLES[r.status])}>
                          {STATUS_LABELS[r.status]}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {r.status === 'TAMAMLANDI' && (
                          <button onClick={() => handleDownload(r.id)} className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-medium hover:bg-emerald-200">
                            <Download className="w-3.5 h-3.5" />{tr ? 'Indir' : 'Download'}
                          </button>
                        )}
                        {r.status === 'REDDEDILDI' && r.rejectedReason && (
                          <span className="text-xs text-red-500">{r.rejectedReason}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Reject Modal */}
      {rejectingId && (
        <DraggableModal title={tr ? 'Export Talebi Reddet' : 'Reject Export'} onClose={() => setRejectingId(null)} width={400}
          footer={
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRejectingId(null)} className="px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--text-2)' }}>{tr ? 'Iptal' : 'Cancel'}</button>
              <button onClick={handleReject} className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600">{tr ? 'Reddet' : 'Reject'}</button>
            </div>
          }
        >
          <div className="p-1">
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>{tr ? 'Red Nedeni' : 'Reason'}</label>
            <textarea className="input w-full h-20" value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder={tr ? 'Opsiyonel...' : 'Optional...'} />
          </div>
        </DraggableModal>
      )}
    </div>
  )
}
