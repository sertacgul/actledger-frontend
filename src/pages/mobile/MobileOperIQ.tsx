import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Cpu, Send, Camera, FileText, Loader2, Trash2, Pin, PinOff,
  ChevronRight, AlertTriangle, CheckSquare, X, Upload, Plus,
  Sparkles, Image as ImageIcon, BookOpen, MessageSquareText,
  ExternalLink, ArrowLeft, Clock,
} from 'lucide-react'
import clsx from 'clsx'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import { api, API_BASE, tokenStore } from '../../lib/api'

// ── Types ──────────────────────────────────────────────────────────────────

interface StructuredStep {
  adim: number
  metin: string
  kritik?: boolean
}

interface StructuredResponse {
  mesaj?: string
  muhtemelNedenler?: string[]
  yapilmasiGerekenler?: StructuredStep[]
  kritikNot?: string | null
  ilgiliGorevId?: string | null
  ilgiliManuel?: string | null
  checklistOluştur?: boolean
  onerilenSorular?: string[]
  fotografBulgulari?: string[]
  riskSeviyesi?: string
}

interface ChatMessage {
  id: string
  role: 'USER' | 'ASSISTANT'
  content: string
  structured?: StructuredResponse | null
  photoUrl?: string | null
  photoAnalysis?: string | null
  createdAt: string
}

interface Conversation {
  id: string
  title: string | null
  pinned: boolean
  createdAt: string
  updatedAt: string
  messages: { content: string; role: string; createdAt: string }[]
  _count: { messages: number }
}

interface Manual {
  id: string
  name: string
  originalName: string
  size: number
  createdAt: string
}

interface PhotoStatus {
  used: number
  limit: number
  remaining: number
}

type View = 'chat' | 'history'

// ── Component ──────────────────────────────────────────────────────────────

export default function MobileOperIQ() {
  const { lang } = useLanguage()
  const { user } = useAuth()

  // View state
  const [view, setView] = useState<View>('chat')

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])

  // Conversation history
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Photo state
  const [photoStatus, setPhotoStatus] = useState<PhotoStatus>({ used: 0, limit: 5, remaining: 5 })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Manual state
  const [manuals, setManuals] = useState<Manual[]>([])
  const [showManuals, setShowManuals] = useState(false)
  const [uploadingManual, setUploadingManual] = useState(false)
  const manualInputRef = useRef<HTMLInputElement>(null)

  // Checklist state
  const [activeChecklist, setActiveChecklist] = useState<{ items: StructuredStep[], checked: boolean[] } | null>(null)

  // Scroll
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  // ── Load initial data + last conversation ─────────────────────────────────

  useEffect(() => {
    // Load suggestions
    api.get<string[]>('/operiq-chat/suggestions')
      .then(data => { if (Array.isArray(data)) setSuggestions(data) })
      .catch(() => {})

    // Load photo status
    api.get<PhotoStatus>('/operiq-chat/photo-status')
      .then(data => { if (data) setPhotoStatus(data as PhotoStatus) })
      .catch(() => {})

    // Load manuals
    api.get<Manual[]>('/operiq-chat/manuals')
      .then(data => { if (Array.isArray(data)) setManuals(data) })
      .catch(() => {})

    // Load last conversation (most recent)
    api.get<any>('/operiq-chat/conversations?page=1&pageSize=1')
      .then(res => {
        const convs = Array.isArray(res) ? res : res?.data ?? []
        if (convs.length > 0) {
          loadConversation(convs[0].id)
        }
      })
      .catch(() => {})
  }, [])

  // ── Load a conversation's messages ────────────────────────────────────────

  const loadConversation = async (id: string) => {
    try {
      const res = await api.get<any>(`/operiq-chat/conversations/${id}?pageSize=100`)
      const data = res?.data ?? res
      const conv = data?.conversation ?? data
      const msgs = data?.messages ?? []

      setConversationId(id)
      setMessages(msgs.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        structured: m.structured,
        photoUrl: m.photoUrl,
        photoAnalysis: m.photoAnalysis,
        createdAt: m.createdAt,
      })))
      setView('chat')
      setActiveChecklist(null)
    } catch {
      // Conversation might have been deleted
    }
  }

  // ── Load conversation history ─────────────────────────────────────────────

  const loadHistory = async () => {
    setLoadingHistory(true)
    try {
      const res = await api.get<any>('/operiq-chat/conversations?page=1&pageSize=50')
      const convs = Array.isArray(res) ? res : res?.data ?? []
      setConversations(convs)
    } catch {
      setConversations([])
    } finally {
      setLoadingHistory(false)
    }
    setView('history')
  }

  // ── New conversation ──────────────────────────────────────────────────────

  const startNewConversation = () => {
    setMessages([])
    setConversationId(null)
    setActiveChecklist(null)
    setView('chat')
    api.get<string[]>('/operiq-chat/suggestions')
      .then(data => { if (Array.isArray(data)) setSuggestions(data) })
      .catch(() => {})
  }

  // ── Pin / Unpin ───────────────────────────────────────────────────────────

  const handleTogglePin = async (id: string) => {
    try {
      const res = await api.patch<any>(`/operiq-chat/conversations/${id}/pin`)
      const updated = res?.data ?? res
      setConversations(prev =>
        prev.map(c => c.id === id ? { ...c, pinned: updated?.pinned ?? !c.pinned } : c)
          .sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          })
      )
    } catch {}
  }

  // ── Delete conversation ───────────────────────────────────────────────────

  const handleDeleteConversation = async (id: string) => {
    try {
      await api.delete(`/operiq-chat/conversations/${id}`)
      setConversations(prev => prev.filter(c => c.id !== id))
      if (conversationId === id) {
        setMessages([])
        setConversationId(null)
      }
    } catch {}
  }

  // ── Send text message ─────────────────────────────────────────────────────

  const handleSend = async () => {
    const msg = input.trim()
    if (!msg || sending) return

    setInput('')
    setSending(true)

    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, {
      id: tempId,
      role: 'USER',
      content: msg,
      createdAt: new Date().toISOString(),
    }])

    try {
      const data = await api.post<any>('/operiq-chat/message', {
        message: msg,
        conversationId,
      })

      if (data.conversationId) setConversationId(data.conversationId)

      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== tempId)
        return [
          ...filtered,
          {
            id: data.userMessage.id,
            role: 'USER' as const,
            content: msg,
            createdAt: data.userMessage.createdAt,
          },
          {
            id: data.aiMessage.id,
            role: 'ASSISTANT' as const,
            content: data.aiMessage.content,
            structured: data.aiMessage.structured,
            createdAt: data.aiMessage.createdAt,
          },
        ]
      })

      if (data.aiMessage.structured?.onerilenSorular) {
        setSuggestions(data.aiMessage.structured.onerilenSorular)
      }
    } catch (err: any) {
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'ASSISTANT',
        content: err.message ?? 'Bir hata oluştu. Lütfen tekrar deneyin.',
        createdAt: new Date().toISOString(),
      }])
    } finally {
      setSending(false)
    }
  }

  // ── Send photo message ────────────────────────────────────────────────────

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (photoStatus.remaining <= 0) {
      setMessages(prev => [...prev, {
        id: `limit-${Date.now()}`,
        role: 'ASSISTANT',
        content: `Günlük fotoğraf yükleme limitine ulaştınız (${photoStatus.limit}/${photoStatus.limit}). Yarın tekrar deneyebilirsiniz.`,
        createdAt: new Date().toISOString(),
      }])
      return
    }

    setSending(true)
    const localUrl = URL.createObjectURL(file)
    const tempId = `temp-photo-${Date.now()}`
    setMessages(prev => [...prev, {
      id: tempId, role: 'USER', content: 'Foto yuklendi',
      photoUrl: localUrl, createdAt: new Date().toISOString(),
    }])

    try {
      const formData = new FormData()
      formData.append('photo', file)
      if (input.trim()) formData.append('message', input.trim())
      if (conversationId) formData.append('conversationId', conversationId)

      const token = tokenStore.get()
      const res = await fetch(`${API_BASE}/operiq-chat/photo`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include',
        body: formData,
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.message ?? 'Fotoğraf yüklenemedi')
      const data = body.data

      if (data.conversationId) setConversationId(data.conversationId)
      setPhotoStatus({
        used: data.dailyPhotoCount,
        limit: data.dailyPhotoLimit,
        remaining: data.dailyPhotoLimit - data.dailyPhotoCount,
      })

      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== tempId)
        return [...filtered,
          { id: data.userMessage.id, role: 'USER' as const, content: data.userMessage.content, photoUrl: data.userMessage.photoUrl, createdAt: data.userMessage.createdAt },
          { id: data.aiMessage.id, role: 'ASSISTANT' as const, content: data.aiMessage.content, structured: data.aiMessage.structured, photoAnalysis: data.aiMessage.photoAnalysis, createdAt: data.aiMessage.createdAt },
        ]
      })
      setInput('')
    } catch (err: any) {
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`, role: 'ASSISTANT',
        content: err.message ?? 'Fotoğraf yüklenemedi.',
        createdAt: new Date().toISOString(),
      }])
    } finally {
      setSending(false)
      URL.revokeObjectURL(localUrl)
    }
  }

  // ── Manual upload ─────────────────────────────────────────────────────────

  const handleManualUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploadingManual(true)
    try {
      const formData = new FormData()
      formData.append('manual', file)
      const token = tokenStore.get()
      const res = await fetch(`${API_BASE}/operiq-chat/manuals`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include',
        body: formData,
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.message ?? 'PDF yüklenemedi')
      setManuals(prev => [body.data, ...prev])
    } catch (err: any) {
      alert(err.message ?? 'PDF yüklenemedi')
    } finally {
      setUploadingManual(false)
    }
  }

  const handleDeleteManual = async (id: string) => {
    try {
      await api.delete(`/operiq-chat/manuals/${id}`)
      setManuals(prev => prev.filter(m => m.id !== id))
    } catch {}
  }

  // ── Checklist ─────────────────────────────────────────────────────────────

  const startChecklist = (steps: StructuredStep[]) => {
    setActiveChecklist({ items: steps, checked: steps.map(() => false) })
  }

  const toggleChecklistItem = (index: number) => {
    setActiveChecklist(prev => {
      if (!prev) return null
      const checked = [...prev.checked]
      checked[index] = !checked[index]
      return { ...prev, checked }
    })
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (d: string) => {
    const date = new Date(d)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'Az önce'
    if (diffMin < 60) return `${diffMin} dk önce`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr} saat önce`
    const diffDay = Math.floor(diffHr / 24)
    if (diffDay < 7) return `${diffDay} gün önce`
    return date.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short' })
  }

  // ── Render structured AI response ─────────────────────────────────────────

  const renderStructured = (msg: ChatMessage) => {
    const s = msg.structured
    if (!s) return <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

    return (
      <div className="space-y-3">
        {s.mesaj && <p className="text-sm">{s.mesaj}</p>}
        {!s.mesaj && msg.content && <p className="text-sm">{msg.content}</p>}

        {s.fotografBulgulari && s.fotografBulgulari.length > 0 && (
          <div className="bg-blue-50 rounded-lg p-2.5">
            <p className="text-xs font-semibold text-blue-700 mb-1.5 flex items-center gap-1">
              <ImageIcon size={12} /> Fotoğraf Bulguları
            </p>
            <ul className="space-y-1">
              {s.fotografBulgulari.map((b, i) => (
                <li key={i} className="text-xs text-blue-800 flex items-start gap-1.5">
                  <span className="text-blue-400 mt-0.5">-</span> {b}
                </li>
              ))}
            </ul>
          </div>
        )}

        {s.riskSeviyesi && (
          <div className={clsx('inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold', {
            'bg-green-100 text-green-700': s.riskSeviyesi === 'dusuk',
            'bg-yellow-100 text-yellow-700': s.riskSeviyesi === 'orta',
            'bg-orange-100 text-orange-700': s.riskSeviyesi === 'yuksek',
            'bg-red-100 text-red-700': s.riskSeviyesi === 'kritik',
          })}>
            <AlertTriangle size={11} />
            Risk: {s.riskSeviyesi.charAt(0).toUpperCase() + s.riskSeviyesi.slice(1)}
          </div>
        )}

        {s.muhtemelNedenler && s.muhtemelNedenler.length > 0 && (
          <div className="bg-amber-50 rounded-lg p-2.5">
            <p className="text-xs font-semibold text-amber-700 mb-1.5">Muhtemel Nedenler:</p>
            <ul className="space-y-1">
              {s.muhtemelNedenler.map((n, i) => (
                <li key={i} className="text-xs text-amber-800 flex items-start gap-1.5">
                  <span className="text-amber-400 mt-0.5">-</span> {n}
                </li>
              ))}
            </ul>
          </div>
        )}

        {s.yapilmasiGerekenler && s.yapilmasiGerekenler.length > 0 && (
          <div className="bg-slate-50 rounded-lg p-2.5">
            <p className="text-xs font-semibold text-slate-700 mb-1.5">Yapılması Gerekenler:</p>
            <ol className="space-y-1.5">
              {s.yapilmasiGerekenler.map((step, i) => (
                <li key={i} className={clsx('text-xs flex items-start gap-1.5', step.kritik ? 'text-red-700 font-semibold' : 'text-slate-700')}>
                  <span className={clsx('flex-shrink-0 w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5', step.kritik ? 'bg-red-100 text-red-600' : 'bg-cyan-100 text-cyan-600')}>
                    {step.adim}
                  </span>
                  <span>{step.metin}</span>
                  {step.kritik && <AlertTriangle size={11} className="text-red-500 flex-shrink-0 mt-0.5" />}
                </li>
              ))}
            </ol>
            <button type="button" onClick={() => startChecklist(s.yapilmasiGerekenler!)}
              className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-2 bg-cyan-600 text-white rounded-lg text-xs font-semibold active:scale-[0.98]">
              <CheckSquare size={13} /> Adımları Checklist Olarak Başlat
            </button>
          </div>
        )}

        {s.kritikNot && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 flex items-start gap-2">
            <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-red-700 mb-0.5">Kritik Nokta:</p>
              <p className="text-xs text-red-600">{s.kritikNot}</p>
            </div>
          </div>
        )}

        {s.ilgiliManuel && (
          <button type="button" className="flex items-center gap-2 text-xs text-cyan-700 bg-cyan-50 rounded-lg px-3 py-2 w-full active:bg-cyan-100">
            <FileText size={14} />
            <span>Teknik Doküman: <strong>{s.ilgiliManuel}</strong></span>
            <ExternalLink size={11} className="ml-auto" />
          </button>
        )}

        {s.ilgiliGorevId && (
          <a href={`/m/gorev/${s.ilgiliGorevId}`} className="flex items-center gap-2 text-xs text-indigo-700 bg-indigo-50 rounded-lg px-3 py-2 w-full active:bg-indigo-100">
            <CheckSquare size={14} />
            <span>İlgili Görevi Gör</span>
            <ChevronRight size={13} className="ml-auto" />
          </a>
        )}

        {s.onerilenSorular && s.onerilenSorular.length > 0 && (
          <div className="space-y-1.5 pt-1">
            {s.onerilenSorular.map((q, i) => (
              <button key={i} type="button" onClick={() => setInput(q)}
                className="w-full text-left text-xs text-cyan-700 bg-cyan-50/70 hover:bg-cyan-100 rounded-lg px-3 py-2 flex items-center gap-2 active:scale-[0.98]">
                <Sparkles size={11} className="text-cyan-500 flex-shrink-0" /> {q}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── HISTORY VIEW ──────────────────────────────────────────────────────────

  if (view === 'history') {
    return (
      <div className="flex flex-col h-full">
        {/* History header */}
        <div className="px-4 pt-4 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button type="button" onClick={() => setView('chat')} className="p-1 -ml-1 text-slate-500 active:text-slate-700">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-base font-bold text-slate-900">Sohbet Geçmişi</h1>
          </div>
          <button type="button" onClick={startNewConversation}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 text-white rounded-lg text-xs font-semibold active:scale-[0.97]">
            <Plus size={13} /> Yeni Sohbet
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {loadingHistory ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="text-cyan-500 animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-16 px-6">
              <MessageSquareText size={36} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500 mb-1">Henüz sohbet yok</p>
              <p className="text-xs text-slate-400">OperIQ'ya soru sorarak ilk sohbetinizi başlatın</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {conversations.map(conv => {
                const lastMsg = conv.messages[0]
                const preview = lastMsg?.content?.slice(0, 80) ?? ''
                return (
                  <div key={conv.id} className="relative">
                    <button
                      type="button"
                      onClick={() => loadConversation(conv.id)}
                      className={clsx(
                        'w-full text-left px-4 py-3 active:bg-slate-50 transition-colors',
                        conv.id === conversationId && 'bg-cyan-50/50'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={clsx(
                          'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5',
                          conv.pinned ? 'bg-amber-100' : 'bg-slate-100'
                        )}>
                          {conv.pinned
                            ? <Pin size={15} className="text-amber-600" />
                            : <Cpu size={15} className="text-slate-500" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <p className="text-sm font-semibold text-slate-800 truncate flex-1">
                              {conv.title ?? 'Sohbet'}
                            </p>
                            <span className="text-[10px] text-slate-400 flex-shrink-0">
                              {formatDate(conv.updatedAt)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 truncate">{preview || '...'}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{conv._count.messages} mesaj</p>
                        </div>
                      </div>
                    </button>

                    {/* Action buttons */}
                    <div className="absolute right-3 top-3 flex items-center gap-1">
                      <button type="button" onClick={(e) => { e.stopPropagation(); handleTogglePin(conv.id) }}
                        className={clsx('p-1.5 rounded-lg', conv.pinned ? 'text-amber-500 bg-amber-50' : 'text-slate-400 active:bg-slate-100')}>
                        {conv.pinned ? <PinOff size={13} /> : <Pin size={13} />}
                      </button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id) }}
                        className="p-1.5 rounded-lg text-slate-400 active:bg-red-50 active:text-red-500">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── CHAT VIEW ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
            <Cpu size={16} className="text-teal-300" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">OperIQ</h1>
            <p className="text-[10px] text-slate-500">Yapay Zeka Asistanı</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Photo counter */}
          <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-full">
            <Camera size={11} className="text-slate-500" />
            <span className="text-[10px] font-semibold text-slate-600">
              {photoStatus.remaining}/{photoStatus.limit}
            </span>
          </div>
          {/* Manuals */}
          <button type="button" onClick={() => setShowManuals(!showManuals)}
            className={clsx('p-1.5 rounded-lg transition-colors', showManuals ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-100 text-slate-600')}>
            <BookOpen size={16} />
          </button>
          {/* History */}
          <button type="button" onClick={loadHistory}
            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 active:bg-slate-200">
            <Clock size={16} />
          </button>
          {/* New chat */}
          <button type="button" onClick={startNewConversation}
            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 active:bg-slate-200">
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Manuals panel */}
      {showManuals && (
        <div className="mx-4 mb-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-700">Teknik Dokümanlar</p>
            <button type="button" onClick={() => manualInputRef.current?.click()} disabled={uploadingManual}
              className="flex items-center gap-1 text-[10px] font-semibold text-cyan-600 active:text-cyan-800">
              {uploadingManual ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />} PDF Yükle
            </button>
          </div>
          <input ref={manualInputRef} type="file" accept="application/pdf" onChange={handleManualUpload} className="hidden" />
          {manuals.length === 0 ? (
            <div className="py-6 text-center">
              <FileText size={24} className="text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Henüz doküman yüklenmemiş</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
              {manuals.map(m => (
                <div key={m.id} className="flex items-center gap-2.5 px-3 py-2">
                  <FileText size={16} className="text-red-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">{m.name}</p>
                    <p className="text-[10px] text-slate-400">{formatSize(m.size)}</p>
                  </div>
                  <button type="button" onClick={() => handleDeleteManual(m.id)} className="p-1 text-slate-400 hover:text-red-500">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Active checklist */}
      {activeChecklist && (
        <div className="mx-4 mb-2 bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-bold text-cyan-800 flex items-center gap-1.5">
              <CheckSquare size={13} /> Aktif Checklist
            </p>
            <button type="button" onClick={() => setActiveChecklist(null)} className="p-0.5 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          </div>
          <div className="space-y-2">
            {activeChecklist.items.map((item, i) => (
              <button key={i} type="button" onClick={() => toggleChecklistItem(i)}
                className={clsx('w-full flex items-start gap-2 text-left p-2 rounded-lg transition-all',
                  activeChecklist.checked[i] ? 'bg-green-50' : 'bg-white',
                  item.kritik && !activeChecklist.checked[i] ? 'border border-red-200' : 'border border-transparent')}>
                <div className={clsx('w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 border-2 transition-all',
                  activeChecklist.checked[i] ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300')}>
                  {activeChecklist.checked[i] && <CheckSquare size={12} />}
                </div>
                <div className="flex-1">
                  <p className={clsx('text-xs', activeChecklist.checked[i] ? 'text-slate-400 line-through' : 'text-slate-700',
                    item.kritik && !activeChecklist.checked[i] && 'font-semibold text-red-700')}>
                    {item.adim}. {item.metin}
                  </p>
                  {item.kritik && !activeChecklist.checked[i] && (
                    <p className="text-[10px] text-red-500 flex items-center gap-0.5 mt-0.5"><AlertTriangle size={9} /> Kritik adım</p>
                  )}
                </div>
              </button>
            ))}
          </div>
          {activeChecklist.checked.every(Boolean) && (
            <div className="mt-3 text-center">
              <p className="text-xs font-semibold text-green-600">Tüm adımlar tamamlandı!</p>
            </div>
          )}
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 space-y-3 py-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8">
            <div className="w-16 h-16 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center mb-4 shadow-lg">
              <Cpu size={28} className="text-teal-300" />
            </div>
            <h2 className="text-base font-bold text-slate-800 mb-1">OperIQ Mobil</h2>
            <p className="text-xs text-slate-500 text-center mb-6 px-6 leading-relaxed">
              Departmanınız, görevleriniz ve teknik dokümanlarınız hakkında sorular sorun.
            </p>

            {suggestions.length > 0 && (
              <div className="w-full space-y-2 px-2">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-1">
                  Önerilen Sorular
                </p>
                {suggestions.map((q, i) => (
                  <button key={i} type="button" onClick={() => setInput(q)}
                    className="w-full text-left text-xs text-slate-700 bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-2.5 active:bg-slate-50 active:scale-[0.98] shadow-sm">
                    <Sparkles size={14} className="text-cyan-500 flex-shrink-0" />
                    <span>{q}</span>
                    <ChevronRight size={13} className="text-slate-300 ml-auto flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={clsx('flex', msg.role === 'USER' ? 'justify-end' : 'justify-start')}>
              <div className={clsx('max-w-[88%] rounded-2xl px-3.5 py-2.5',
                msg.role === 'USER'
                  ? 'bg-cyan-600 text-white rounded-br-md'
                  : 'bg-white border border-slate-200 text-slate-700 rounded-bl-md shadow-sm')}>
                {msg.role === 'ASSISTANT' && (
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-4 h-4 rounded-md bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
                      <Cpu size={10} className="text-teal-300" />
                    </div>
                    <span className="text-[10px] font-semibold text-teal-600">OperIQ</span>
                  </div>
                )}
                {msg.photoUrl && (
                  <div className="mb-2 rounded-lg overflow-hidden">
                    <img src={msg.photoUrl.startsWith('blob:') ? msg.photoUrl : `http://localhost:3001${msg.photoUrl}`}
                      alt="Yüklenen fotoğraf" className="w-full max-h-48 object-cover rounded-lg" />
                  </div>
                )}
                {msg.role === 'ASSISTANT' ? renderStructured(msg) : <p className="text-sm">{msg.content}</p>}
                <p className={clsx('text-[9px] mt-1.5', msg.role === 'USER' ? 'text-white/60' : 'text-slate-400')}>
                  {new Date(msg.createdAt).toLocaleTimeString(lang === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        )}

        {sending && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-md bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
                  <Cpu size={10} className="text-teal-300" />
                </div>
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-3 border-t border-slate-200 bg-white">
        <div className="flex items-end gap-2">
          <button type="button" onClick={() => fileInputRef.current?.click()}
            disabled={sending || photoStatus.remaining <= 0}
            className={clsx('p-2.5 rounded-xl transition-colors',
              photoStatus.remaining > 0 ? 'bg-slate-100 text-slate-600 active:bg-slate-200' : 'bg-slate-50 text-slate-300')}>
            <Camera size={18} />
          </button>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment"
            onChange={handlePhotoUpload} className="hidden" />

          <div className="flex-1">
            <textarea value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder="OperIQ'ya sorun..." rows={1}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm resize-none focus:outline-none focus:border-cyan-500"
              style={{ maxHeight: 80 }} />
          </div>

          <button type="button" onClick={handleSend} disabled={!input.trim() || sending}
            className="p-2.5 rounded-xl bg-cyan-600 text-white disabled:opacity-30 active:scale-95 transition-all">
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  )
}
