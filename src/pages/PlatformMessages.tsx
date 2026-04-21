import { useState, useEffect, useCallback, useRef } from 'react'
import { MessageSquare, Send, Check, CheckCheck, Users, Building2, Search, Plus, X, Loader2, ArrowLeft, Circle, Pencil, Trash2, MoreVertical } from 'lucide-react'
import clsx from 'clsx'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'

interface Message {
  id: string; senderId: string; senderName: string; senderAvatar?: string | null; senderJobTitle?: string
  content: string; isBroadcast: boolean; departmentName?: string; departmentId?: string | null
  createdAt: string; readAt?: string | null; receiverId?: string | null
}

interface Contact {
  id: string; name: string; jobTitle: string; isMobile: boolean; department: string; departmentId: string
}

const mapMsg = (m: any): Message => ({
  id: m.id, senderId: m.senderId ?? m.sender?.id, senderName: m.sender?.name ?? 'Bilinmeyen',
  senderAvatar: m.sender?.avatarUrl ?? null, senderJobTitle: m.sender?.jobTitle ?? m.senderJobTitle,
  content: m.content, isBroadcast: m.isBroadcast, departmentName: m.department?.name,
  departmentId: m.departmentId ?? m.department?.id, createdAt: m.createdAt,
  readAt: m.readAt ?? null, receiverId: m.receiverId ?? null,
})

const tf = (d: string, lang: string) => {
  const dt = new Date(d)
  const now = new Date()
  const isToday = dt.toDateString() === now.toDateString()
  const time = dt.toLocaleTimeString(lang === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit' })
  return isToday ? time : dt.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: '2-digit' }) + ' ' + time
}

interface Conv { type: 'direct' | 'department' | 'broadcast'; id?: string; name: string; lastMsg: Message; unread: number; avatar?: string | null; subtitle?: string }

export default function PlatformMessages() {
  const { lang } = useLanguage()
  const { user } = useAuth()
  const tr = lang === 'tr'

  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [search, setSearch] = useState('')
  const [showNewChat, setShowNewChat] = useState(false)

  // Active conversation
  const [activeConv, setActiveConv] = useState<Conv | null>(null)
  const [chatMessages, setChatMessages] = useState<Message[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Stories
  const [stories, setStories] = useState<any[]>([])
  const [storyForm, setStoryForm] = useState(false)
  const [storyContent, setStoryContent] = useState('')
  const [storyColor, setStoryColor] = useState('#0891b2')

  // Unread count
  const [unreadCount, setUnreadCount] = useState(0)

  // Load
  const loadAll = useCallback(async () => {
    try {
      const deptId = user?.departmentId
      const [d, b, dp] = await Promise.all([
        api.get<any>('/messages?pageSize=100'),
        api.get<any>('/messages?pageSize=100&isBroadcast=true'),
        deptId ? api.get<any>(`/messages?pageSize=100&departmentId=${deptId}`) : Promise.resolve({ data: [] }),
      ])
      const toArr = (r: any) => { const x = r?.data ?? r; return Array.isArray(x) ? x : [] }
      const all = [...toArr(d), ...toArr(b), ...toArr(dp)]
      const seen = new Set<string>()
      const unique = all.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true })
      setMessages(unique.map(mapMsg).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
    } catch {}
    setLoading(false)
  }, [user?.departmentId])

  useEffect(() => { loadAll() }, [loadAll])
  useEffect(() => {
    api.get<any>('/messages/contacts').then((r: any) => {
      const d = r?.data ?? r
      setContacts((Array.isArray(d) ? d : []).map((c: any) => ({
        id: c.id, name: c.name, jobTitle: c.jobTitle ?? '', isMobile: c.isMobile ?? false,
        department: c.department?.name ?? c.department ?? '', departmentId: c.departmentId ?? '',
      })))
    }).catch(() => {})
    api.get<any>('/messages/stories').then((r: any) => setStories(Array.isArray(r) ? r : (r?.data ?? []))).catch(() => {})
    api.get<any>('/messages/unread-count').then((r: any) => setUnreadCount(r?.total ?? 0)).catch(() => {})
  }, [])

  // Conversations
  const conversations: Conv[] = (() => {
    const m = new Map<string, Conv>()
    const bMsgs = messages.filter(x => x.isBroadcast)
    if (bMsgs.length > 0 || true) {
      m.set('broadcast', { type: 'broadcast', name: tr ? 'Genel Duyuru' : 'General', lastMsg: bMsgs[0] || { content: tr ? 'Hen\u00fcz mesaj yok' : 'No messages', createdAt: new Date().toISOString() } as any, unread: bMsgs.filter(x => x.senderId !== user?.id && !x.readAt).length, subtitle: tr ? 'T\u00fcm \u015firket' : 'All company' })
    }
    const dMsgs = messages.filter(x => !x.isBroadcast && x.departmentName)
    if (dMsgs.length > 0 || user?.departmentId) {
      m.set('dept', { type: 'department', id: user?.departmentId, name: dMsgs[0]?.departmentName || (tr ? 'Departman\u0131m' : 'My Dept'), lastMsg: dMsgs[0] || { content: '', createdAt: new Date().toISOString() } as any, unread: dMsgs.filter(x => x.senderId !== user?.id && !x.readAt).length, subtitle: tr ? 'Departman grubu' : 'Department group' })
    }
    const directs = messages.filter(x => !x.isBroadcast && !x.departmentName)
    for (const msg of directs) {
      const pid = msg.senderId === user?.id ? msg.receiverId : msg.senderId
      const pname = msg.senderId === user?.id ? (contacts.find(c => c.id === msg.receiverId)?.name ?? '...') : msg.senderName
      if (!pid) continue
      const k = `d-${pid}`
      if (!m.has(k)) {
        const c = contacts.find(ct => ct.id === pid)
        m.set(k, { type: 'direct', id: pid, name: pname, lastMsg: msg, unread: msg.senderId !== user?.id && !msg.readAt ? 1 : 0, subtitle: c?.jobTitle || '', avatar: null })
      } else if (msg.senderId !== user?.id && !msg.readAt) m.get(k)!.unread++
    }
    return Array.from(m.values()).sort((a, b) => new Date(b.lastMsg?.createdAt || 0).getTime() - new Date(a.lastMsg?.createdAt || 0).getTime())
  })()

  const filtered = search ? conversations.filter(c => c.name.toLowerCase().includes(search.toLowerCase())) : conversations

  // Open conversation
  const openConv = async (conv: Conv) => {
    setActiveConv(conv)
    setChatLoading(true)
    try {
      let res: any
      if (conv.type === 'broadcast') res = await api.get('/messages?pageSize=200&isBroadcast=true')
      else if (conv.type === 'department' && conv.id) res = await api.get(`/messages?pageSize=200&departmentId=${conv.id}`)
      else if (conv.type === 'direct' && conv.id) res = await api.get(`/messages/thread/${conv.id}`)
      const data = res?.data ?? res
      setChatMessages((Array.isArray(data) ? data : []).map(mapMsg).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()))
      // Mark read
      for (const x of (Array.isArray(data) ? data : [])) {
        if ((x.senderId ?? x.sender?.id) !== user?.id && !x.readAt) api.patch(`/messages/${x.id}/read`).catch(() => {})
      }
    } catch {}
    setChatLoading(false)
    // Refresh unread count after marking messages as read
    api.get<any>('/messages/unread-count').then((r: any) => setUnreadCount(r?.total ?? 0)).catch(() => {})
  }

  useEffect(() => { if (activeConv) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages.length])

  const sendMsg = async () => {
    if (!reply.trim() || !activeConv) return
    setSending(true)
    try {
      const p: any = { content: reply }
      if (activeConv.type === 'broadcast') p.isBroadcast = true
      else if (activeConv.type === 'department') { p.departmentId = activeConv.id; p.isBroadcast = false }
      else p.receiverId = activeConv.id
      await api.post('/messages', p)
      setReply('')
      await openConv(activeConv)
      loadAll()
    } catch {}
    setSending(false)
  }

  const createStory = async () => {
    if (!storyContent.trim()) return
    try {
      await api.post('/messages/stories', { type: 'TEXT', content: storyContent, bgColor: storyColor })
      setStoryForm(false); setStoryContent('')
      const r: any = await api.get('/messages/stories')
      setStories(Array.isArray(r) ? r : (r?.data ?? []))
    } catch (e: any) { alert(e.message) }
  }

  return (
    <div className="flex h-[calc(100vh-120px)] bg-white rounded-xl border border-zinc-200 overflow-hidden">
      {/* Left Panel - Conversations */}
      <div className="w-[360px] flex flex-col border-r border-zinc-200 flex-shrink-0">
        {/* Header */}
        <div className="px-4 py-3 border-b border-zinc-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-zinc-800">{tr ? 'Mesajlar' : 'Messages'}</h2>
            {unreadCount > 0 && <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-bold min-w-[18px] text-center">{unreadCount}</span>}
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setStoryForm(true)} className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100">Story</button>
            <button onClick={() => setShowNewChat(true)} className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center hover:bg-zinc-200"><Plus size={16} className="text-zinc-600" /></button>
          </div>
        </div>
        {/* Search */}
        <div className="px-3 py-2">
          <div className="flex items-center gap-2 bg-zinc-100 rounded-lg px-3 py-1.5">
            <Search size={14} className="text-zinc-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={tr ? 'Ara...' : 'Search...'}
              className="flex-1 bg-transparent outline-none text-sm text-zinc-700" />
          </div>
        </div>
        {/* Stories bar */}
        {stories.length > 0 && (
          <div className="flex gap-2 px-3 py-2 border-b border-zinc-100 overflow-x-auto flex-shrink-0">
            {stories.map(s => (
              <div key={s.id} className="flex flex-col items-center gap-0.5 cursor-pointer flex-shrink-0" onClick={() => alert(s.content)}>
                <div className="w-11 h-11 rounded-full p-0.5" style={{ background: 'linear-gradient(135deg, #06b6d4, #14b8a6)' }}>
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-zinc-600">{s.createdBy?.name?.charAt(0)}</div>
                </div>
                <span className="text-[8px] text-zinc-400 truncate max-w-[44px]">{s.createdBy?.name?.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        )}
        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.map((conv, i) => (
            <button key={i} onClick={() => openConv(conv)}
              className={clsx('w-full flex items-center gap-3 px-4 py-3 border-b border-zinc-50 hover:bg-zinc-50 transition-colors text-left',
                activeConv?.type === conv.type && activeConv?.id === conv.id && 'bg-zinc-100'
              )}>
              <div className={clsx('w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0',
                conv.type === 'broadcast' ? 'bg-emerald-500' : conv.type === 'department' ? 'bg-blue-500' : 'bg-cyan-600'
              )}>
                {conv.type === 'broadcast' ? <Users size={16} /> : conv.type === 'department' ? <Building2 size={16} /> : conv.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-semibold text-zinc-800 truncate">{conv.name}</p>
                  <span className="text-[9px] text-zinc-400 flex-shrink-0">{conv.lastMsg?.createdAt ? tf(conv.lastMsg.createdAt, lang) : ''}</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-[11px] text-zinc-500 truncate pr-2">
                    {conv.lastMsg?.senderId === user?.id && (conv.lastMsg?.readAt ? <CheckCheck size={12} className="inline text-blue-500 mr-0.5" /> : <Check size={12} className="inline text-zinc-400 mr-0.5" />)}
                    {conv.lastMsg?.senderId !== user?.id && conv.type !== 'direct' && conv.lastMsg?.senderName && <span className="font-semibold">{conv.lastMsg.senderName}: </span>}
                    {conv.lastMsg?.content || ''}
                  </p>
                  {conv.unread > 0 && <span className="w-4.5 h-4.5 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 min-w-[18px] px-1">{conv.unread}</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right Panel - Chat Area */}
      <div className="flex-1 flex flex-col bg-zinc-50">
        {!activeConv ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare size={48} className="mx-auto text-zinc-300 mb-4" />
              <p className="text-sm text-zinc-400">{tr ? 'Bir sohbet se\u00e7in' : 'Select a chat'}</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="px-5 py-3 border-b border-zinc-200 bg-white flex items-center gap-3">
              <div className={clsx('w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold',
                activeConv.type === 'broadcast' ? 'bg-emerald-500' : activeConv.type === 'department' ? 'bg-blue-500' : 'bg-cyan-600'
              )}>
                {activeConv.type === 'broadcast' ? <Users size={18} /> : activeConv.type === 'department' ? <Building2 size={18} /> : activeConv.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-800">{activeConv.name}</p>
                <p className="text-[10px] text-zinc-400">{activeConv.subtitle || (activeConv.type === 'direct' ? (tr ? 'Direkt mesaj' : 'Direct') : '')}</p>
              </div>
            </div>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%2394a3b8\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}>
              {chatLoading ? <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-zinc-400" /></div> : (
                chatMessages.map(msg => {
                  const isMe = msg.senderId === user?.id
                  return (
                    <div key={msg.id} className={clsx('flex group', isMe ? 'justify-end' : 'justify-start')}>
                      <div className="relative">
                        <div className={clsx('max-w-[420px] rounded-xl px-4 py-2.5 shadow-sm', isMe ? 'bg-emerald-100 rounded-br-sm' : 'bg-white rounded-bl-sm')}>
                          {!isMe && activeConv?.type !== 'direct' && <p className="text-[10px] font-bold text-emerald-700 mb-0.5">{msg.senderName}</p>}
                          <p className="text-[13px] text-zinc-800 leading-relaxed">{msg.content}</p>
                          <div className={clsx('flex items-center gap-1 mt-1', isMe ? 'justify-end' : 'justify-start')}>
                            <span className="text-[9px] text-zinc-400">{tf(msg.createdAt, lang)}</span>
                            {isMe && (msg.readAt ? <CheckCheck size={13} className="text-blue-500" /> : <Check size={13} className="text-zinc-400" />)}
                          </div>
                        </div>
                        {/* Edit/Delete actions on hover */}
                        {isMe && (
                          <div className="absolute top-0.5 right-1 hidden group-hover:flex items-center gap-0.5 bg-white/90 rounded-lg shadow-sm border border-zinc-100 px-1 py-0.5">
                            <button onClick={() => { const newText = prompt(tr ? 'Mesaj\u0131 d\u00fczenle:' : 'Edit message:', msg.content); if (newText && newText !== msg.content) { api.patch(`/messages/${msg.id}/edit`, { content: newText }).then(() => openConv(activeConv!)).catch(() => {}) } }}
                              className="p-1 rounded hover:bg-zinc-100" title={tr ? 'D\u00fczenle' : 'Edit'}><Pencil size={12} className="text-zinc-500" /></button>
                            <button onClick={() => { if (confirm(tr ? 'Mesaj silinsin mi?' : 'Delete message?')) { api.delete(`/messages/${msg.id}`).then(() => openConv(activeConv!)).catch(() => {}) } }}
                              className="p-1 rounded hover:bg-red-50" title={tr ? 'Sil' : 'Delete'}><Trash2 size={12} className="text-red-400" /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={chatEndRef} />
            </div>
            {/* Input */}
            <div className="px-5 py-3 border-t border-zinc-200 bg-white flex items-center gap-3">
              <div className="flex-1 bg-zinc-100 rounded-xl px-4 py-2.5">
                <input value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMsg()}
                  placeholder={tr ? 'Mesaj yaz\u0131n...' : 'Type a message...'}
                  className="w-full bg-transparent outline-none text-sm text-zinc-800" />
              </div>
              <button onClick={sendMsg} disabled={!reply.trim() || sending}
                className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center disabled:opacity-40 hover:bg-emerald-600 transition-colors">
                {sending ? <Loader2 size={18} className="text-white animate-spin" /> : <Send size={18} className="text-white" />}
              </button>
            </div>
          </>
        )}
      </div>

      {/* New chat contacts panel */}
      {showNewChat && (
        <div className="absolute inset-y-0 left-0 w-[360px] bg-white z-10 flex flex-col shadow-xl" style={{ maxHeight: '100%' }}>
          <div className="px-4 py-3 border-b border-zinc-200 flex items-center gap-3">
            <button onClick={() => setShowNewChat(false)}><ArrowLeft size={18} className="text-zinc-600" /></button>
            <h3 className="text-sm font-bold text-zinc-800">{tr ? 'Yeni Sohbet' : 'New Chat'}</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {contacts.filter(c => c.id !== user?.id).map(c => (
              <button key={c.id} onClick={() => { openConv({ type: 'direct', id: c.id, name: c.name, lastMsg: {} as any, unread: 0, subtitle: c.jobTitle }); setShowNewChat(false) }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 text-left border-b border-zinc-50">
                <div className="w-9 h-9 rounded-full bg-cyan-600 flex items-center justify-center text-white text-xs font-bold">{c.name.charAt(0).toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-zinc-800">{c.name}</p>
                  <p className="text-[10px] text-zinc-400">{c.jobTitle} - {c.department}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Story creation modal */}
      {storyForm && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center" onClick={() => setStoryForm(false)}>
          <div className="bg-white rounded-2xl w-[400px] p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-zinc-800 mb-4">{tr ? 'Story Olu\u015ftur' : 'Create Story'}</h3>
            <textarea value={storyContent} onChange={e => setStoryContent(e.target.value)} rows={3}
              placeholder={tr ? 'Story i\u00e7eri\u011fi...' : 'Story content...'}
              className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm text-zinc-800 resize-none outline-none focus:ring-2 focus:ring-emerald-200" />
            <div className="flex gap-2 mt-3">
              {['#0891b2', '#059669', '#2563eb', '#7c3aed', '#dc2626', '#ea580c'].map(c => (
                <button key={c} onClick={() => setStoryColor(c)}
                  className={clsx('w-8 h-8 rounded-full border-2', storyColor === c ? 'border-zinc-800 scale-110' : 'border-transparent')}
                  style={{ background: c }} />
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setStoryForm(false)} className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg">{tr ? '\u0130ptal' : 'Cancel'}</button>
              <button onClick={createStory} disabled={!storyContent.trim()}
                className="px-4 py-2 text-sm font-semibold bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-40">{tr ? 'Payla\u015f' : 'Share'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
