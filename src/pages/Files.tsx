import { useEffect, useState, useRef, useCallback } from 'react'
import {
  FolderPlus, Folder, FileText, Trash2, Download, Upload, ChevronRight,
  Home, Lock, Building2, Loader2, AlertCircle, X, Check,
} from 'lucide-react'
import clsx from 'clsx'
import { api, API_BASE, tokenStore } from '../lib/api'
import { useDepartments } from '../lib/hooks'
import { useAuth } from '../context/AuthContext'
import DraggableModal from '../components/ui/DraggableModal'
import { ROLE_HIERARCHY, ROLE_LABELS, type UserRole } from '../types'
import { useToolbarActions } from '../lib/useToolbarActions'

// ── API types ───────────────────────────────────────────────────────────────
interface FolderRow {
  id:           string
  name:         string
  description?: string | null
  parentId:     string | null
  departmentId: string | null
  minRoleLevel: number
  createdAt:    string
  _count?:      { files: number; children: number }
  breadcrumb?:  { id: string; name: string }[]
}

interface StoredFileRow {
  id:           string
  name:         string
  originalName: string
  size:         number
  mimeType:     string
  createdAt:    string
  uploadedById: string
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function Files() {
  const { user } = useAuth()
  const { departments } = useDepartments()

  const [folders,    setFolders]    = useState<FolderRow[]>([])
  const [files,      setFiles]      = useState<StoredFileRow[]>([])
  const [currentId,  setCurrentId]  = useState<string | null>(null)  // null = root
  const [breadcrumb, setBreadcrumb] = useState<{ id: string; name: string }[]>([])
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [uploading,  setUploading]  = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Determine if current user can manage folders (MUDUR+ → role level >= 5)
  const userRoleLevel = user ? ROLE_HIERARCHY[user.role] : 0
  const canManageFolders = userRoleLevel >= 5

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const folderUrl = currentId ? `/folders?parentId=${currentId}` : '/folders'
      const folderList = await api.get<FolderRow[]>(folderUrl)
      setFolders(folderList)

      if (currentId) {
        const detail = await api.get<FolderRow>(`/folders/${currentId}`)
        setBreadcrumb([...(detail.breadcrumb ?? []), { id: detail.id, name: detail.name }])
        const fileList = await api.get<StoredFileRow[]>(`/folders/${currentId}/files`)
        setFiles(fileList)
      } else {
        setBreadcrumb([])
        setFiles([])
      }
    } catch (e: any) {
      setError(e.message ?? 'Yükleme hatası')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [currentId])

  const handleDeleteFolder = async (id: string, name: string) => {
    if (!confirm(`"${name}" klasörünü ve içindeki tüm dosyaları silmek istediğinizden emin misiniz?`)) return
    try { await api.delete(`/folders/${id}`); loadData() }
    catch (e: any) { setError(e.message) }
  }

  const handleDeleteFile = async (id: string, name: string) => {
    if (!confirm(`"${name}" dosyasını silmek istediğinizden emin misiniz?`)) return
    try { await api.delete(`/files/${id}`); loadData() }
    catch (e: any) { setError(e.message) }
  }

  const handleDownload = async (id: string, name: string) => {
    try {
      const token = tokenStore.get()
      const res = await fetch(`${API_BASE}/files/${id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      })
      if (!res.ok) throw new Error('İndirme başarısız')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e: any) {
      setError(e.message)
    }
  }

  const handleUpload = async (file: File) => {
    if (!currentId) {
      setError('Önce bir klasör seçin')
      return
    }
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const token = tokenStore.get()
      const res = await fetch(`${API_BASE}/folders/${currentId}/files`, {
        method: 'POST',
        body: fd,
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.message ?? 'Yükleme başarısız')
      loadData()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const fileSizeText = (b: number) => {
    if (b < 1024)         return `${b} B`
    if (b < 1024*1024)    return `${(b/1024).toFixed(1)} KB`
    if (b < 1024*1024*1024) return `${(b/1024/1024).toFixed(1)} MB`
    return `${(b/1024/1024/1024).toFixed(2)} GB`
  }

  const stableLoad = useCallback(loadData, [currentId])
  useToolbarActions({
    onNew:     () => canManageFolders && setShowCreate(true),
    onRefresh: stableLoad,
  })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-bold text-zinc-900 tracking-tight">Dosya Yöneticisi</h2>
          <p className="text-[12px] text-zinc-400 mt-0.5">Departman ve rol-bazlı erişimle yönetilen dosyalar</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canManageFolders && (
            <button
              onClick={() => setShowCreate(true)}
              className="btn-secondary"
              data-help="Yeni klasör oluştur - opsiyonel olarak departman ve minimum role kısıtlayabilirsin"
            >
              <FolderPlus size={14} /> Yeni Klasör
            </button>
          )}
          {currentId && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="btn-primary"
                data-help="Bu klasöre yeni dosya yükle"
              >
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                Dosya Yükle
              </button>
            </>
          )}
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[12px] flex-wrap">
        <button
          type="button"
          onClick={() => setCurrentId(null)}
          className={clsx(
            'flex items-center gap-1 px-2 py-1 rounded transition-colors',
            !currentId ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-zinc-500 hover:text-indigo-600 hover:bg-zinc-50'
          )}
        >
          <Home size={11} /> Kök
        </button>
        {breadcrumb.map((b, i) => (
          <div key={b.id} className="flex items-center gap-1.5">
            <ChevronRight size={11} className="text-zinc-300" />
            <button
              type="button"
              onClick={() => setCurrentId(b.id)}
              className={clsx(
                'px-2 py-1 rounded transition-colors',
                i === breadcrumb.length - 1 ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-zinc-500 hover:text-indigo-600 hover:bg-zinc-50'
              )}
            >
              {b.name}
            </button>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 px-3 py-2 rounded border border-red-200 bg-red-50 text-[12px] text-red-700">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="hover:text-red-900"><X size={12} /></button>
        </div>
      )}

      {/* Folder grid */}
      <div>
        <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
          Klasörler {folders.length > 0 && `(${folders.length})`}
        </h3>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="surface p-4 h-24 animate-pulse" />)}
          </div>
        ) : folders.length === 0 ? (
          <p className="text-[12px] text-zinc-400 text-center py-6">Bu klasörde alt klasör yok</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {folders.map(f => {
              const dept = departments.find(d => d.id === f.departmentId)
              return (
                <div
                  key={f.id}
                  className="surface p-4 hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
                  onClick={() => setCurrentId(f.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <Folder size={28} className="text-indigo-500" />
                    {canManageFolders && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteFolder(f.id, f.name) }}
                        className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-600 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  <p className="text-[13px] font-semibold text-zinc-900 truncate">{f.name}</p>
                  {f.description && <p className="text-[11px] text-zinc-400 truncate mt-0.5">{f.description}</p>}
                  <div className="flex items-center gap-2 mt-2 text-[10px] text-zinc-400">
                    <span>{f._count?.children ?? 0} klasör</span>
                    <span>·</span>
                    <span>{f._count?.files ?? 0} dosya</span>
                  </div>
                  <div className="flex items-center gap-1 mt-2 flex-wrap">
                    {dept && (
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full text-white" style={{ background: dept.color }}>
                        <Building2 size={8} className="inline mr-0.5" /> {dept.name}
                      </span>
                    )}
                    {f.minRoleLevel > 1 && (
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        <Lock size={8} className="inline mr-0.5" />
                        Min: {ROLE_LABELS[(Object.keys(ROLE_HIERARCHY) as UserRole[]).find(r => ROLE_HIERARCHY[r] === f.minRoleLevel) ?? 'isci']}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Files list */}
      {currentId && (
        <div>
          <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
            Dosyalar {files.length > 0 && `(${files.length})`}
          </h3>
          {files.length === 0 ? (
            <p className="text-[12px] text-zinc-400 text-center py-6">Bu klasörde dosya yok - yukarıdan yükleyin</p>
          ) : (
            <div className="surface divide-y divide-zinc-100">
              {files.map(f => (
                <div key={f.id} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors group">
                  <FileText size={18} className="text-zinc-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-zinc-800 truncate">{f.originalName}</p>
                    <p className="text-[10px] text-zinc-400">
                      {fileSizeText(f.size)} · {f.mimeType} · {new Date(f.createdAt).toLocaleString('tr-TR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleDownload(f.id, f.originalName)}
                      className="w-7 h-7 rounded flex items-center justify-center text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      data-help="Dosyayı indir"
                    >
                      <Download size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteFile(f.id, f.originalName)}
                      className="w-7 h-7 rounded flex items-center justify-center text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      data-help="Dosyayı kalıcı olarak sil"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create folder modal */}
      {showCreate && (
        <CreateFolderModal
          parentId={currentId}
          departments={departments}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadData() }}
        />
      )}
    </div>
  )
}

// ── Create folder modal ─────────────────────────────────────────────────────
function CreateFolderModal({
  parentId, departments, onClose, onCreated,
}: {
  parentId:    string | null
  departments: { id: string; name: string; color: string }[]
  onClose:     () => void
  onCreated:   () => void
}) {
  const [name,         setName]         = useState('')
  const [description,  setDescription]  = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [minRoleLevel, setMinRoleLevel] = useState<number>(1)
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true); setError(null)
    try {
      await api.post('/folders', {
        name:         name.trim(),
        description:  description.trim() || undefined,
        parentId:     parentId || undefined,
        departmentId: departmentId || undefined,
        minRoleLevel,
      })
      onCreated()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <DraggableModal title="Yeni Klasör" icon={<FolderPlus size={13} />} onClose={onClose} width={460}>
      <div className="p-5 space-y-3">
        <div>
          <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Klasör Adı *</label>
          <input className="input" placeholder="ör. Sözleşmeler, Kalite Belgeleri…" value={name}
            onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Açıklama</label>
          <input className="input" placeholder="İsteğe bağlı…" value={description}
            onChange={e => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
            Departman Kısıtı
          </label>
          <select className="select" value={departmentId} onChange={e => setDepartmentId(e.target.value)}>
            <option value="">Tüm departmanlar görebilir</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <p className="text-[10px] text-zinc-400 mt-1">Sadece seçilen departman üyeleri bu klasörü görebilir</p>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
            Minimum Rol Seviyesi
          </label>
          <select className="select" value={minRoleLevel} onChange={e => setMinRoleLevel(Number(e.target.value))}>
            {(Object.entries(ROLE_HIERARCHY) as [UserRole, number][])
              .sort(([,a],[,b]) => a - b)
              .map(([role, level]) => (
                <option key={role} value={level}>
                  Seviye {level} - {ROLE_LABELS[role]} ve üstü
                </option>
              ))}
          </select>
          <p className="text-[10px] text-zinc-400 mt-1">Bu role sahip ve üstü kullanıcılar erişebilir</p>
        </div>
        {error && (
          <div className="px-3 py-2 rounded border border-red-200 bg-red-50 text-[11px] text-red-700">
            {error}
          </div>
        )}
        <div className="flex gap-2 pt-2 border-t border-zinc-100">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center text-[12px]">İptal</button>
          <button
            type="button"
            disabled={!name.trim() || saving}
            onClick={handleSave}
            className="btn-primary flex-1 justify-center text-[12px]"
          >
            <Check size={12} /> {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </DraggableModal>
  )
}
