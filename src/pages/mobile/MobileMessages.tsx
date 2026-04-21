import { useState, useEffect, useCallback, useRef } from 'react'
import { MessageSquare, Send, Loader2, Check, CheckCheck, BookUser, X, Smartphone, ArrowLeft, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'

interface Message {
  id: string
  senderId: string
  senderName: string
  senderJobTitle?: string
  content: string
  isBroadcast: boolean
  departmentName?: string
  createdAt: string
  readAt?: string | null
  receiverId?: string | null
}

interface Contact {
  id: string
  name: string
  jobTitle: string
  isMobile: boolean
  department: string
  departmentId: string
}

const MSG_CACHE_KEY = 'actledger:mobile_messages'
const THREAD_CACHE_PREFIX = 'actledger:mobile_thread_'

function loadCachedMessages(): Message[] {
  try { return JSON.parse(localStorage.getItem(MSG_CACHE_KEY) || '[]') } catch { return [] }
}

function saveCachedMessages(msgs: Message[]) {
  try { localStorage.setItem(MSG_CACHE_KEY, JSON.stringify(msgs.slice(0, 200))) } catch {}
}

function loadCachedThread(partnerId: string): Message[] {
  try { return JSON.parse(localStorage.getItem(THREAD_CACHE_PREFIX + partnerId) || '[]') } catch { return [] }
}

function saveCachedThread(partnerId: string, msgs: Message[]) {
  try { localStorage.setItem(THREAD_CACHE_PREFIX + partnerId, JSON.stringify(msgs.slice(0, 100))) } catch {}
}

export default function MobileMessages() {
  const { t, lang } = useLanguage()
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>(() => loadCachedMessages())
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'broadcast' | 'department' | 'direct'>('broadcast')
  const [reply, setReply] = useState('')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactsOpen, setContactsOpen] = useState(false)
  const [contactsLoading, setContactsLoading] = useState(false)
  const [directReceiverId, setDirectReceiverId] = useState<string | null>(null)
  const [directReceiverName, setDirectReceiverName] = useState<string | null>(null)
  const [broadcastConfirmOpen, setBroadcastConfirmOpen] = useState(false)

  // Thread view state
  const [threadPartnerId, setThreadPartnerId] = useState<string | null>(null)
  const [threadPartnerName, setThreadPartnerName] = useState<string | null>(null)
  const [threadMessages, setThreadMessages] = useState<Message[]>([])
  const [threadLoading, setThreadLoading] = useState(false)
  const [threadReply, setThreadReply] = useState('')
  const [threadReplyToId, setThreadReplyToId] = useState<string | null>(null)
  const threadEndRef = useRef<HTMLDivElement>(null)

  // Long-press delete state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    api.get<any>(`/messages?pageSize=50`)
      .then((res: any) => {
        const data = res.data ?? res
        const items = Array.isArray(data) ? data : []
        const mapped = items.map((m: any) => ({
          id: m.id,
          senderId: m.senderId ?? m.sender?.id,
          senderName: m.sender?.name ?? 'Bilinmeyen',
          senderJobTitle: m.sender?.jobTitle ?? m.senderJobTitle ?? undefined,
          content: m.content,
          isBroadcast: m.isBroadcast,
          departmentName: m.department?.name,
          createdAt: m.createdAt,
          readAt: m.readAt ?? null,
          receiverId: m.receiverId ?? null,
        }))
        setMessages(mapped)
        saveCachedMessages(mapped)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Mark unread messages as read when they appear on screen
  useEffect(() => {
    if (!user?.id) return
    const unread = messages.filter(m => m.senderId !== user.id && !m.readAt && !m.isBroadcast)
    unread.forEach(m => {
      api.patch(`/messages/${m.id}/read`).catch(() => {})
    })
    if (unread.length > 0) {
      setMessages(prev => prev.map(m =>
        unread.some(u => u.id === m.id) ? { ...m, readAt: new Date().toISOString() } : m
      ))
    }
  }, [messages.length, user?.id])

  const loadContacts = useCallback(() => {
    setContactsLoading(true)
    api.get<any>('/messages/contacts')
      .then((res: any) => {
        const data = res.data ?? res
        const items = Array.isArray(data) ? data : []
        setContacts(items.map((c: any) => ({
          id: c.id,
          name: c.name,
          jobTitle: c.jobTitle ?? '',
          isMobile: c.isMobile ?? false,
          department: c.department?.name ?? c.department ?? '',
          departmentId: c.departmentId ?? '',
        })))
      })
      .catch(() => {})
      .finally(() => setContactsLoading(false))
  }, [])

  const filtered = messages.filter(m => {
    if (tab === 'broadcast') return m.isBroadcast
    if (tab === 'department') return !m.isBroadcast && m.departmentName
    return !m.isBroadcast && !m.departmentName
  })

  const tabs = [
    { key: 'broadcast' as const,  label: t('m_messages_broadcast') },
    { key: 'department' as const, label: t('m_messages_department') },
    { key: 'direct' as const,     label: t('m_messages_direct') },
  ]

  const doSendMessage = async () => {
    if (!reply.trim()) return
    try {
      const payload: any = { content: reply, isBroadcast: tab === 'broadcast' }
      if (tab === 'direct' && directReceiverId) {
        payload.receiverId = directReceiverId
      }
      await api.post('/messages', payload)
      setReply('')
      // Refetch messages
      const res: any = await api.get<any>('/messages?pageSize=50')
      const data = res.data ?? res
      const items = Array.isArray(data) ? data : []
      setMessages(items.map((m: any) => ({
        id: m.id,
        senderId: m.senderId ?? m.sender?.id,
        senderName: m.sender?.name ?? 'Bilinmeyen',
        senderJobTitle: m.sender?.jobTitle ?? m.senderJobTitle ?? undefined,
        content: m.content,
        isBroadcast: m.isBroadcast,
        departmentName: m.department?.name,
        createdAt: m.createdAt,
        readAt: m.readAt ?? null,
        receiverId: m.receiverId ?? null,
      })))
    } catch {}
  }

  const handleSend = async () => {
    if (!reply.trim()) return
    if (tab === 'broadcast') {
      setBroadcastConfirmOpen(true)
      return
    }
    await doSendMessage()
  }

  const confirmBroadcast = async () => {
    setBroadcastConfirmOpen(false)
    await doSendMessage()
  }

  const startDirectMessage = (contact: Contact) => {
    setDirectReceiverId(contact.id)
    setDirectReceiverName(contact.name)
    setTab('direct')
    setContactsOpen(false)
  }

  // Unread count
  const unreadCount = messages.filter(m => m.receiverId === user?.id && !m.readAt).length

  // Open thread view
  const openThread = useCallback(async (partnerId: string, partnerName: string, replyToMessageId?: string) => {
    setThreadPartnerId(partnerId)
    setThreadPartnerName(partnerName)
    setThreadReplyToId(replyToMessageId ?? null)
    setThreadLoading(true)
    try {
      const res: any = await api.get(`/messages/thread/${partnerId}`)
      const data = res.data ?? res
      const items = Array.isArray(data) ? data : []
      const mapped = items.map((m: any) => ({
        id: m.id,
        senderId: m.senderId ?? m.sender?.id,
        senderName: m.sender?.name ?? 'Bilinmeyen',
        senderJobTitle: m.sender?.jobTitle ?? m.senderJobTitle ?? undefined,
        content: m.content,
        isBroadcast: m.isBroadcast,
        departmentName: m.department?.name,
        createdAt: m.createdAt,
        readAt: m.readAt ?? null,
        receiverId: m.receiverId ?? null,
      }))
      setThreadMessages(mapped)
      // Mark unread messages in this thread as read
      const unread = mapped.filter((m: Message) => m.senderId !== user?.id && !m.readAt)
      for (const m of unread) {
        api.patch(`/messages/${m.id}/read`).catch(() => {})
      }
      if (unread.length > 0) {
        setThreadMessages(prev => prev.map(m =>
          unread.some((u: Message) => u.id === m.id) ? { ...m, readAt: new Date().toISOString() } : m
        ))
        // Also update main list
        setMessages(prev => prev.map(m =>
          unread.some((u: Message) => u.id === m.id) ? { ...m, readAt: new Date().toISOString() } : m
        ))
      }
    } catch {}
    setThreadLoading(false)
  }, [user?.id])

  // Auto-scroll thread to bottom
  useEffect(() => {
    if (threadPartnerId && threadEndRef.current) {
      threadEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [threadMessages.length, threadPartnerId])

  // Send reply in thread
  const sendThreadReply = async () => {
    if (!threadReply.trim() || !threadPartnerId) return
    try {
      const payload: any = { content: threadReply, receiverId: threadPartnerId }
      if (threadReplyToId) payload.replyToId = threadReplyToId
      await api.post('/messages', payload)
      setThreadReply('')
      // Refetch thread
      const res: any = await api.get(`/messages/thread/${threadPartnerId}`)
      const data = res.data ?? res
      const items = Array.isArray(data) ? data : []
      setThreadMessages(items.map((m: any) => ({
        id: m.id,
        senderId: m.senderId ?? m.sender?.id,
        senderName: m.sender?.name ?? 'Bilinmeyen',
        senderJobTitle: m.sender?.jobTitle ?? m.senderJobTitle ?? undefined,
        content: m.content,
        isBroadcast: m.isBroadcast,
        departmentName: m.department?.name,
        createdAt: m.createdAt,
        readAt: m.readAt ?? null,
        receiverId: m.receiverId ?? null,
      })))
      // Also refetch main message list
      const mainRes: any = await api.get('/messages?pageSize=50')
      const mainData = mainRes.data ?? mainRes
      const mainItems = Array.isArray(mainData) ? mainData : []
      setMessages(mainItems.map((m: any) => ({
        id: m.id,
        senderId: m.senderId ?? m.sender?.id,
        senderName: m.sender?.name ?? 'Bilinmeyen',
        senderJobTitle: m.sender?.jobTitle ?? m.senderJobTitle ?? undefined,
        content: m.content,
        isBroadcast: m.isBroadcast,
        departmentName: m.department?.name,
        createdAt: m.createdAt,
        readAt: m.readAt ?? null,
        receiverId: m.receiverId ?? null,
      })))
    } catch {}
  }

  // Close thread
  const closeThread = () => {
    setThreadPartnerId(null)
    setThreadPartnerName(null)
    setThreadMessages([])
    setThreadReply('')
    setThreadReplyToId(null)
  }

  // Delete message
  const deleteMessage = async (msgId: string) => {
    try {
      await api.delete(`/messages/${msgId}`)
      setMessages(prev => prev.filter(m => m.id !== msgId))
      setThreadMessages(prev => prev.filter(m => m.id !== msgId))
    } catch {}
    setDeleteTargetId(null)
  }

  // Long press handlers
  const handleLongPressStart = (msgId: string) => {
    longPressTimer.current = setTimeout(() => {
      setDeleteTargetId(msgId)
    }, 600)
  }

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  return (
    <div className="relative flex flex-col h-full">
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900">{t('m_messages_title')}</h1>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => { setContactsOpen(true); loadContacts() }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold active:scale-95 transition-all"
          >
            <BookUser size={14} />
            Rehber
          </button>
        </div>
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
          {tabs.map(tb => (
            <button
              key={tb.key}
              type="button"
              onClick={() => setTab(tb.key)}
              className={clsx(
                'flex-1 px-2 py-2 rounded-lg text-xs font-semibold transition-all',
                tab === tb.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              )}
            >
              {tb.label}
            </button>
          ))}
        </div>
        {tab === 'direct' && directReceiverName && (
          <div className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-cyan-50 border border-cyan-200 rounded-lg">
            <span className="text-xs text-cyan-700 font-medium flex-1">
              Alici: {directReceiverName}
            </span>
            <button
              type="button"
              onClick={() => { setDirectReceiverId(null); setDirectReceiverName(null) }}
              className="text-cyan-500 hover:text-cyan-700"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 space-y-2 py-2">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="text-cyan-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare size={36} className="text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">{t('m_messages_empty')}</p>
          </div>
        ) : (
          filtered.map(msg => {
            const isMe = msg.senderId === user?.id
            const msgDate = new Date(msg.createdAt)
            const today = new Date()
            const isToday = msgDate.toDateString() === today.toDateString()
            const dateStr = isToday ? '' : msgDate.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: '2-digit' })
            const timeStr = msgDate.toLocaleTimeString(
              lang === 'tr' ? 'tr-TR' : 'en-US',
              { hour: '2-digit', minute: '2-digit' }
            )
            // Tap on received direct messages to open thread
            const canReply = !isMe && !msg.isBroadcast && msg.senderId
            return (
              <div
                key={msg.id}
                className={clsx('flex', isMe ? 'justify-end' : 'justify-start')}
                onClick={() => canReply && openThread(msg.senderId, msg.senderName, msg.id)}
                onTouchStart={() => handleLongPressStart(msg.id)}
                onTouchEnd={handleLongPressEnd}
                onTouchCancel={handleLongPressEnd}
                onMouseDown={() => handleLongPressStart(msg.id)}
                onMouseUp={handleLongPressEnd}
                onMouseLeave={handleLongPressEnd}
              >
                <div className={clsx(
                  'max-w-[80%] rounded-2xl px-4 py-2.5',
                  isMe
                    ? 'bg-cyan-600 text-white rounded-br-md'
                    : 'bg-white border border-slate-200 text-slate-700 rounded-bl-md',
                  canReply && 'cursor-pointer active:opacity-80'
                )}>
                  {!isMe && (
                    <div className="mb-0.5">
                      <span className="text-[10px] font-semibold text-cyan-600">{msg.senderName}</span>
                      {msg.senderJobTitle && (
                        <span className="text-[9px] text-slate-400 ml-1">{msg.senderJobTitle}</span>
                      )}
                    </div>
                  )}
                  <p className="text-sm">{msg.content}</p>
                  <div className={clsx('flex items-center gap-1 mt-1', isMe ? 'justify-end' : 'justify-start')}>
                    {dateStr && <span className={clsx('text-[8px]', isMe ? 'text-white/40' : 'text-slate-300')}>{dateStr}</span>}
                    <span className={clsx('text-[9px]', isMe ? 'text-white/60' : 'text-slate-400')}>
                      {timeStr}
                    </span>
                    {isMe && (
                      msg.readAt
                        ? <CheckCheck size={12} className="text-cyan-200" />
                        : <Check size={12} className="text-white/50" />
                    )}
                    {canReply && (
                      <span className="text-[9px] text-cyan-500 ml-1">{lang === 'tr' ? 'Yan\u0131tla' : 'Reply'}</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Reply input */}
      <div className="p-3 border-t border-slate-200 bg-white flex items-end gap-2">
        <textarea
          value={reply}
          onChange={e => setReply(e.target.value)}
          placeholder={
            tab === 'direct' && directReceiverName
              ? `${directReceiverName} adresine mesaj...`
              : t('m_messages_reply')
          }
          rows={1}
          className="flex-1 px-3 py-2.5 rounded-xl border border-slate-300 text-sm resize-none focus:outline-none focus:border-cyan-500"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!reply.trim() || (tab === 'direct' && !directReceiverId)}
          className="p-2.5 rounded-xl bg-cyan-600 text-white disabled:opacity-30 active:scale-95"
        >
          <Send size={16} />
        </button>
      </div>

      {/* Contacts drawer */}
      {contactsOpen && (
        <div className="absolute inset-0 z-50 flex flex-col bg-white">
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-900">Rehber</h2>
            <button
              type="button"
              onClick={() => setContactsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {(() => {
              // Department tab: only same department, Direct tab: all users
              const filteredContacts = tab === 'department' && user?.departmentId
                ? contacts.filter(c => c.departmentId === user.departmentId && c.id !== user.id)
                : contacts.filter(c => c.id !== user?.id)
              return contactsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="text-cyan-500 animate-spin" />
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="text-center py-16">
                <BookUser size={36} className="text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">{tab === 'department' ? 'Departmaninizda baska kullanici bulunamadi' : 'Kullanici bulunamadi'}</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredContacts.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => startDirectMessage(c)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 active:bg-slate-100 text-left transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-cyan-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-cyan-700">
                        {c.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-slate-800 truncate">{c.name}</span>
                        {c.isMobile && (
                          <Smartphone size={12} className="text-cyan-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{c.jobTitle}</p>
                      {c.department && (
                        <p className="text-[10px] text-slate-400 truncate">{c.department}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )
            })()}
          </div>
        </div>
      )}

      {/* Broadcast confirmation popup */}
      {broadcastConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl mx-6 max-w-sm w-full p-5">
            <h3 className="text-base font-bold text-slate-900 mb-2">Genel Mesaj Onayi</h3>
            <p className="text-sm text-slate-600 mb-5">
              Bu mesaj sirketteki tum kullanicilara iletilecektir. Devam etmek istiyor musunuz?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setBroadcastConfirmOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-600 active:scale-95 transition-all"
              >
                Iptal
              </button>
              <button
                type="button"
                onClick={confirmBroadcast}
                className="flex-1 px-4 py-2.5 rounded-xl bg-cyan-600 text-white text-sm font-semibold active:scale-95 transition-all"
              >
                Evet, Gonder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thread / conversation view */}
      {threadPartnerId && (
        <div className="absolute inset-0 z-50 flex flex-col bg-slate-50">
          {/* Thread header */}
          <div className="flex items-center gap-3 p-4 bg-white border-b border-slate-200">
            <button
              type="button"
              onClick={closeThread}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 active:scale-95"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-cyan-700">
                {threadPartnerName?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-slate-900 truncate block">{threadPartnerName}</span>
              <span className="text-[10px] text-slate-400">Konusma</span>
            </div>
          </div>

          {/* Thread messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {threadLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="text-cyan-500 animate-spin" />
              </div>
            ) : threadMessages.length === 0 ? (
              <div className="text-center py-16">
                <MessageSquare size={36} className="text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">Henuz mesaj yok</p>
              </div>
            ) : (
              threadMessages.map(msg => {
                const isMe = msg.senderId === user?.id
                const msgDate = new Date(msg.createdAt)
                const todayT = new Date()
                const isTodayT = msgDate.toDateString() === todayT.toDateString()
                const dateStrT = isTodayT ? '' : msgDate.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: '2-digit' })
                const timeStr = msgDate.toLocaleTimeString(
                  lang === 'tr' ? 'tr-TR' : 'en-US',
                  { hour: '2-digit', minute: '2-digit' }
                )
                return (
                  <div
                    key={msg.id}
                    className={clsx('flex', isMe ? 'justify-end' : 'justify-start')}
                    onTouchStart={() => handleLongPressStart(msg.id)}
                    onTouchEnd={handleLongPressEnd}
                    onTouchCancel={handleLongPressEnd}
                    onMouseDown={() => handleLongPressStart(msg.id)}
                    onMouseUp={handleLongPressEnd}
                    onMouseLeave={handleLongPressEnd}
                  >
                    <div className={clsx(
                      'max-w-[80%] rounded-2xl px-4 py-2.5',
                      isMe
                        ? 'bg-cyan-600 text-white rounded-br-md'
                        : 'bg-white border border-slate-200 text-slate-700 rounded-bl-md'
                    )}>
                      {!isMe && (
                        <div className="mb-0.5">
                          <span className="text-[10px] font-semibold text-cyan-600">{msg.senderName}</span>
                        </div>
                      )}
                      <p className="text-sm">{msg.content}</p>
                      <div className={clsx('flex items-center gap-1 mt-1', isMe ? 'justify-end' : 'justify-start')}>
                        {dateStrT && <span className={clsx('text-[8px]', isMe ? 'text-white/40' : 'text-slate-300')}>{dateStrT}</span>}
                        <span className={clsx('text-[9px]', isMe ? 'text-white/60' : 'text-slate-400')}>
                          {timeStr}
                        </span>
                        {isMe && (
                          msg.readAt
                            ? <CheckCheck size={12} className="text-cyan-200" />
                            : <Check size={12} className="text-white/50" />
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={threadEndRef} />
          </div>

          {/* Thread reply input */}
          <div className="p-3 border-t border-slate-200 bg-white flex items-end gap-2">
            <textarea
              value={threadReply}
              onChange={e => setThreadReply(e.target.value)}
              placeholder={`${threadPartnerName} adresine yanit...`}
              rows={1}
              className="flex-1 px-3 py-2.5 rounded-xl border border-slate-300 text-sm resize-none focus:outline-none focus:border-cyan-500"
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendThreadReply()
                }
              }}
            />
            <button
              type="button"
              onClick={sendThreadReply}
              disabled={!threadReply.trim()}
              className="p-2.5 rounded-xl bg-cyan-600 text-white disabled:opacity-30 active:scale-95"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation popup */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl mx-6 max-w-sm w-full p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Mesaji Sil</h3>
            </div>
            <p className="text-sm text-slate-600 mb-5">
              Bu mesaji silmek istediginize emin misiniz?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-600 active:scale-95 transition-all"
              >
                Iptal
              </button>
              <button
                type="button"
                onClick={() => deleteMessage(deleteTargetId)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold active:scale-95 transition-all"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
