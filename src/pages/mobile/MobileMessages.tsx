import { useState, useEffect, useCallback, useRef } from 'react'
import { MessageSquare, Send, Loader2, Check, CheckCheck, X, ArrowLeft, Users, Building2, Circle, ChevronRight, Plus, Image, Camera } from 'lucide-react'
import clsx from 'clsx'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { playMessageSound } from '../../lib/notification-sound'

interface Message {
  id: string; senderId: string; senderName: string; senderJobTitle?: string
  content: string; isBroadcast: boolean; departmentName?: string
  createdAt: string; readAt?: string | null; receiverId?: string | null
}

interface Contact {
  id: string; name: string; jobTitle: string; isMobile: boolean
  department: string; departmentId: string
}

interface Story {
  id: string; type: string; content?: string; imageUrl?: string; bgColor?: string
  expiresAt: string; createdBy: { id: string; name: string; avatarUrl?: string | null }
  _count: { views: number }
}

const MSG_CACHE = 'actledger:mobile_messages'
const loadCache = (): Message[] => { try { return JSON.parse(localStorage.getItem(MSG_CACHE) || '[]') } catch { return [] } }
const saveCache = (m: Message[]) => { try { localStorage.setItem(MSG_CACHE, JSON.stringify(m.slice(0, 200))) } catch {} }

const mapMsg = (m: any): Message => ({
  id: m.id, senderId: m.senderId ?? m.sender?.id, senderName: m.sender?.name ?? 'Bilinmeyen',
  senderJobTitle: m.sender?.jobTitle ?? m.senderJobTitle ?? undefined, content: m.content,
  isBroadcast: m.isBroadcast, departmentName: m.department?.name, createdAt: m.createdAt,
  readAt: m.readAt ?? null, receiverId: m.receiverId ?? null,
})

const timeFormat = (d: string, lang: string) => {
  const date = new Date(d)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const time = date.toLocaleTimeString(lang === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit' })
  if (isToday) return time
  const day = date.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: '2-digit' })
  return `${day} ${time}`
}

type Screen = 'chats' | 'conversation' | 'story'

export default function MobileMessages() {
  const { t, lang } = useLanguage()
  const { user } = useAuth()
  const tr = lang === 'tr'

  const [screen, setScreen] = useState<Screen>('chats')
  const [messages, setMessages] = useState<Message[]>(loadCache)
  const [loading, setLoading] = useState(true)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [stories, setStories] = useState<Story[]>([])

  // Active conversation
  const [chatTarget, setChatTarget] = useState<{ type: 'direct' | 'department' | 'broadcast'; id?: string; name: string; lastMsg?: Message; unread?: number } | null>(null)
  const [chatMessages, setChatMessages] = useState<Message[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Story viewer
  const [activeStory, setActiveStory] = useState<Story | null>(null)
  const [showContacts, setShowContacts] = useState(false)

  // ── Data loading ──────────────────────────────────────────────

  const loadAllMessages = useCallback(async () => {
    try {
      const deptId = user?.departmentId
      const [directRes, broadcastRes, deptRes] = await Promise.all([
        api.get<any>('/messages?pageSize=50'),
        api.get<any>('/messages?pageSize=50&isBroadcast=true'),
        deptId ? api.get<any>(`/messages?pageSize=50&departmentId=${deptId}`) : Promise.resolve({ data: [] }),
      ])
      const toArr = (r: any) => { const d = r?.data ?? r; return Array.isArray(d) ? d : [] }
      const all = [...toArr(directRes), ...toArr(broadcastRes), ...toArr(deptRes)]
      const seen = new Set<string>()
      const unique = all.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true })
      const mapped = unique.map(mapMsg).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setMessages(mapped)
      saveCache(mapped)
    } catch {}
    setLoading(false)
  }, [user?.departmentId])

  useEffect(() => { loadAllMessages() }, [loadAllMessages])

  // Poll for new messages + refresh active chat
  const chatTargetRef = useRef(chatTarget)
  chatTargetRef.current = chatTarget
  useEffect(() => {
    const interval = setInterval(async () => {
      await loadAllMessages()
      // Refresh active chat if open
      const ct = chatTargetRef.current
      if (ct && screen === 'conversation') {
        try {
          let res: any
          if (ct.type === 'broadcast') res = await api.get('/messages?pageSize=100&isBroadcast=true')
          else if (ct.type === 'department' && ct.id) res = await api.get(`/messages?pageSize=100&departmentId=${ct.id}`)
          else if (ct.type === 'direct' && ct.id) res = await api.get(`/messages/thread/${ct.id}`)
          const data = res?.data ?? res
          const sorted = (Array.isArray(data) ? data : []).map(mapMsg).sort((a: Message, b: Message) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          setChatMessages(prev => {
            if (sorted.length > prev.length) {
              const lastNew = sorted[sorted.length - 1]
              if (lastNew && lastNew.senderId !== user?.id) playMessageSound()
              return sorted
            }
            return prev
          })
        } catch {}
      }
    }, 4000)
    return () => clearInterval(interval)
  }, [user?.id, screen])

  useEffect(() => {
    api.get<any>('/messages/contacts').then((r: any) => {
      const d = r?.data ?? r
      setContacts((Array.isArray(d) ? d : []).map((c: any) => ({
        id: c.id, name: c.name, jobTitle: c.jobTitle ?? '', isMobile: c.isMobile ?? false,
        department: c.department?.name ?? c.department ?? '', departmentId: c.departmentId ?? '',
      })))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    api.get<any>('/messages/stories').then((r: any) => {
      setStories(Array.isArray(r) ? r : (r?.data ?? []))
    }).catch(() => {})
  }, [])

  // ── Chat conversations list ───────────────────────────────────

  // Build conversation list from messages (WhatsApp style)
  const conversations = (() => {
    const convMap = new Map<string, { type: 'direct' | 'department' | 'broadcast'; id?: string; name: string; lastMsg: Message; unread: number }>()

    // Broadcast group
    const broadcastMsgs = messages.filter(m => m.isBroadcast)
    if (broadcastMsgs.length > 0) {
      convMap.set('broadcast', {
        type: 'broadcast', name: tr ? 'Genel Duyuru' : 'General', lastMsg: broadcastMsgs[0],
        unread: broadcastMsgs.filter(m => m.senderId !== user?.id && !m.readAt).length,
      })
    }

    // Department group
    const deptMsgs = messages.filter(m => !m.isBroadcast && m.departmentName)
    if (deptMsgs.length > 0) {
      const deptName = deptMsgs[0].departmentName!
      convMap.set('dept', {
        type: 'department', id: user?.departmentId, name: deptName, lastMsg: deptMsgs[0],
        unread: deptMsgs.filter(m => m.senderId !== user?.id && !m.readAt).length,
      })
    }

    // Direct conversations
    const directMsgs = messages.filter(m => !m.isBroadcast && !m.departmentName)
    for (const msg of directMsgs) {
      const partnerId = msg.senderId === user?.id ? msg.receiverId : msg.senderId
      const partnerName = msg.senderId === user?.id ? (contacts.find(c => c.id === msg.receiverId)?.name ?? '...') : msg.senderName
      if (!partnerId) continue
      const key = `direct-${partnerId}`
      if (!convMap.has(key)) {
        convMap.set(key, {
          type: 'direct', id: partnerId, name: partnerName, lastMsg: msg,
          unread: msg.senderId !== user?.id && !msg.readAt ? 1 : 0,
        })
      } else if (msg.senderId !== user?.id && !msg.readAt) {
        convMap.get(key)!.unread++
      }
    }

    return Array.from(convMap.values()).sort((a, b) => new Date(b.lastMsg.createdAt).getTime() - new Date(a.lastMsg.createdAt).getTime())
  })()

  // ── Open conversation ─────────────────────────────────────────

  const openChat = async (conv: { type: 'direct' | 'department' | 'broadcast'; id?: string; name: string; lastMsg?: Message; unread?: number }) => {
    setChatTarget(conv)
    setScreen('conversation')
    setChatLoading(true)
    try {
      let res: any
      if (conv.type === 'broadcast') {
        res = await api.get('/messages?pageSize=100&isBroadcast=true')
      } else if (conv.type === 'department' && conv.id) {
        res = await api.get(`/messages?pageSize=100&departmentId=${conv.id}`)
      } else if (conv.type === 'direct' && conv.id) {
        res = await api.get(`/messages/thread/${conv.id}`)
      }
      const data = res?.data ?? res
      const items = (Array.isArray(data) ? data : []).map(mapMsg)
      setChatMessages(items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()))
      // Mark as read
      for (const m of items) {
        if (m.senderId !== user?.id && !m.readAt) {
          api.patch(`/messages/${m.id}/read`).catch(() => {})
        }
      }
    } catch {}
    setChatLoading(false)
  }

  const openDirectChat = (contact: Contact) => {
    openChat({ type: 'direct', id: contact.id, name: contact.name, lastMsg: {} as any, unread: 0 })
    setShowContacts(false)
  }

  useEffect(() => {
    if (screen === 'conversation') chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages.length, screen])

  // ── Send message ──────────────────────────────────────────────

  const sendMsg = async () => {
    if (!reply.trim() || !chatTarget) return
    setSending(true)
    try {
      const payload: any = { content: reply }
      if (chatTarget.type === 'broadcast') payload.isBroadcast = true
      else if (chatTarget.type === 'department') { payload.departmentId = chatTarget.id; payload.isBroadcast = false }
      else if (chatTarget.type === 'direct') payload.receiverId = chatTarget.id
      await api.post('/messages', payload)
      setReply('')
      // Re-fetch conversation
      await openChat(chatTarget)
      loadAllMessages()
    } catch {}
    setSending(false)
  }

  // ── Story view ────────────────────────────────────────────────

  const viewStory = (story: Story) => {
    setActiveStory(story)
    setScreen('story')
    api.post(`/messages/stories/${story.id}/view`).catch(() => {})
  }

  // ── RENDER ────────────────────────────────────────────────────

  // ── Story Viewer ──────────────────────────────────────────────
  if (screen === 'story' && activeStory) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: activeStory.bgColor || '#0f172a' }}>
        <button className="absolute top-4 right-4 p-2 text-white/70" onClick={() => { setActiveStory(null); setScreen('chats') }}><X size={24} /></button>
        <div className="absolute top-4 left-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold">
            {activeStory.createdBy.name.charAt(0)}
          </div>
          <div>
            <p className="text-white text-sm font-bold">{activeStory.createdBy.name}</p>
            <p className="text-white/50 text-[10px]">{timeFormat(activeStory.expiresAt, lang)}</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/20">
          <div className="h-full bg-white/70 animate-[storyProgress_5s_linear_forwards]" />
        </div>
        <div className="text-center px-8 max-w-sm">
          {activeStory.imageUrl && <img src={activeStory.imageUrl} alt="" className="max-h-[60vh] rounded-2xl mx-auto mb-4" />}
          {activeStory.content && <p className="text-white text-xl font-semibold leading-relaxed">{activeStory.content}</p>}
        </div>
        <style>{`@keyframes storyProgress { from { width: 0% } to { width: 100% } }`}</style>
      </div>
    )
  }

  // ── Conversation Screen ───────────────────────────────────────
  if (screen === 'conversation' && chatTarget) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-slate-50">
        {/* Header */}
        <div className="bg-slate-800 text-white px-3 py-2.5 flex items-center gap-3 flex-shrink-0">
          <button onClick={() => { setScreen('chats'); setChatTarget(null); loadAllMessages() }} className="p-1"><ArrowLeft size={20} /></button>
          <div className={clsx('w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
            chatTarget.type === 'broadcast' ? 'bg-emerald-500' : chatTarget.type === 'department' ? 'bg-blue-500' : 'bg-cyan-600'
          )}>
            {chatTarget.type === 'broadcast' ? <Users size={18} /> : chatTarget.type === 'department' ? <Building2 size={18} /> : chatTarget.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{chatTarget.name}</p>
            <p className="text-[10px] text-white/50">
              {chatTarget.type === 'broadcast' ? (tr ? 'Genel kanal' : 'General channel') :
               chatTarget.type === 'department' ? (tr ? 'Departman grubu' : 'Department group') :
               (tr ? 'Direkt mesaj' : 'Direct message')}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%2394a3b8\' fill-opacity=\'0.04\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}>
          {chatLoading ? (
            <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
          ) : chatMessages.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">{tr ? 'Hen\u00fcz mesaj yok' : 'No messages yet'}</div>
          ) : (
            chatMessages.map(msg => {
              const isMe = msg.senderId === user?.id
              return (
                <div key={msg.id} className={clsx('flex', isMe ? 'justify-end' : 'justify-start')}>
                  <div
                    className={clsx('max-w-[80%] rounded-2xl px-3.5 py-2 shadow-sm relative',
                      isMe ? 'bg-emerald-100 rounded-br-md' : 'bg-white rounded-bl-md'
                    )}
                    onContextMenu={isMe ? (e) => {
                      e.preventDefault()
                      const action = window.confirm(tr ? 'Mesaj\u0131 d\u00fczenlemek i\u00e7in Tamam, silmek i\u00e7in \u0130ptal' : 'OK to edit, Cancel to delete')
                      if (action) {
                        const newText = prompt(tr ? 'Yeni mesaj:' : 'New message:', msg.content)
                        if (newText && newText !== msg.content) api.patch(`/messages/${msg.id}/edit`, { content: newText }).then(() => openChat(chatTarget!)).catch(() => {})
                      } else {
                        api.delete(`/messages/${msg.id}`).then(() => openChat(chatTarget!)).catch(() => {})
                      }
                    } : undefined}
                  >
                    {!isMe && chatTarget?.type !== 'direct' && (
                      <p className="text-[10px] font-bold text-emerald-700 mb-0.5">{msg.senderName}</p>
                    )}
                    <p className="text-[13px] text-slate-800 leading-relaxed">{msg.content}</p>
                    <div className={clsx('flex items-center gap-1 mt-0.5', isMe ? 'justify-end' : 'justify-start')}>
                      <span className="text-[9px] text-slate-400">{timeFormat(msg.createdAt, lang)}</span>
                      {isMe && (msg.readAt
                        ? <CheckCheck size={13} className="text-blue-500" />
                        : <Check size={13} className="text-slate-400" />
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input bar */}
        <div className="bg-white border-t border-slate-200 px-3 py-2 flex items-end gap-2 flex-shrink-0" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
          <div className="flex-1 bg-slate-100 rounded-2xl px-4 py-2">
            <input
              value={reply} onChange={e => setReply(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMsg()}
              placeholder={tr ? 'Mesaj yaz\u0131n...' : 'Type a message...'}
              className="w-full bg-transparent outline-none text-sm text-slate-800"
            />
          </div>
          <button onClick={sendMsg} disabled={!reply.trim() || sending}
            className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 disabled:opacity-40 active:scale-95">
            {sending ? <Loader2 size={18} className="text-white animate-spin" /> : <Send size={18} className="text-white" />}
          </button>
        </div>
      </div>
    )
  }

  // ── Main Chat List (WhatsApp Home) ────────────────────────────
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-slate-800 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
        <h1 className="text-lg font-bold">{tr ? 'Mesajlar' : 'Messages'}</h1>
        <button onClick={() => { setShowContacts(true); api.get<any>('/messages/contacts').then((r: any) => { const d = r?.data ?? r; setContacts(Array.isArray(d) ? d.map((c: any) => ({ id: c.id, name: c.name, jobTitle: c.jobTitle ?? '', isMobile: c.isMobile ?? false, department: c.department?.name ?? c.department ?? '', departmentId: c.departmentId ?? '' })) : []) }).catch(() => {}) }}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"><Plus size={18} /></button>
      </div>

      {/* Stories bar */}
      {stories.length > 0 && (
        <div className="flex gap-3 px-4 py-3 border-b border-slate-100 overflow-x-auto flex-shrink-0">
          {stories.map(story => (
            <button key={story.id} onClick={() => viewStory(story)} className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="w-14 h-14 rounded-full p-0.5" style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2, #14b8a6)' }}>
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                  <span className="text-sm font-bold text-slate-700">{story.createdBy.name.charAt(0)}</span>
                </div>
              </div>
              <span className="text-[9px] text-slate-500 truncate max-w-[56px]">{story.createdBy.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      )}

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">{tr ? 'Hen\u00fcz sohbet yok' : 'No chats yet'}</div>
        ) : (
          conversations.map((conv, i) => (
            <button key={i} onClick={() => openChat(conv)}
              className="w-full flex items-center gap-3 px-4 py-3 border-b border-slate-100 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left">
              {/* Avatar */}
              <div className={clsx('w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0',
                conv.type === 'broadcast' ? 'bg-emerald-500' : conv.type === 'department' ? 'bg-blue-500' : 'bg-cyan-600'
              )}>
                {conv.type === 'broadcast' ? <Users size={20} /> : conv.type === 'department' ? <Building2 size={20} /> : conv.name.charAt(0).toUpperCase()}
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800 truncate">{conv.name}</p>
                  <span className="text-[10px] text-slate-400 flex-shrink-0">{timeFormat(conv.lastMsg.createdAt, lang)}</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-slate-500 truncate pr-4">
                    {conv.lastMsg.senderId === user?.id && (
                      conv.lastMsg.readAt
                        ? <CheckCheck size={13} className="inline text-blue-500 mr-1" />
                        : <Check size={13} className="inline text-slate-400 mr-1" />
                    )}
                    {conv.lastMsg.senderId !== user?.id && conv.type !== 'direct' && (
                      <span className="font-semibold">{conv.lastMsg.senderName}: </span>
                    )}
                    {conv.lastMsg.content}
                  </p>
                  {conv.unread > 0 && (
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                      {conv.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* New chat contacts modal */}
      {showContacts && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col" style={{ maxWidth: 480, margin: '0 auto' }}>
          <div className="bg-slate-800 text-white px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <button onClick={() => setShowContacts(false)} className="p-1"><ArrowLeft size={20} /></button>
            <h2 className="text-sm font-bold">{tr ? 'Yeni Sohbet' : 'New Chat'}</h2>
          </div>
          {/* Group shortcuts */}
          <button onClick={() => { openChat({ type: 'broadcast', name: tr ? 'Genel Duyuru' : 'General', lastMsg: {} as any, unread: 0 }); setShowContacts(false) }}
            className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 hover:bg-slate-50 active:bg-slate-100">
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center"><Users size={18} className="text-white" /></div>
            <span className="text-sm font-semibold text-slate-700">{tr ? 'Genel Duyuru' : 'General Announcement'}</span>
          </button>
          {user?.departmentId && (
            <button onClick={() => { openChat({ type: 'department', id: user.departmentId, name: tr ? 'Departman\u0131m' : 'My Department', lastMsg: {} as any, unread: 0 }); setShowContacts(false) }}
              className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 hover:bg-slate-50 active:bg-slate-100">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center"><Building2 size={18} className="text-white" /></div>
              <span className="text-sm font-semibold text-slate-700">{tr ? 'Departman\u0131m' : 'My Department'}</span>
            </button>
          )}
          {/* Contact list */}
          <div className="flex-1 overflow-y-auto">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-2">{tr ? 'Ki\u015filer' : 'Contacts'}</p>
            {contacts.filter(c => c.id !== user?.id).map(contact => (
              <button key={contact.id} onClick={() => openDirectChat(contact)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left">
                <div className="w-10 h-10 rounded-full bg-cyan-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {contact.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{contact.name}</p>
                  <p className="text-[10px] text-slate-400">{contact.jobTitle} - {contact.department}</p>
                </div>
                {contact.isMobile && <span className="text-[8px] px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-200 font-bold">MOB</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
