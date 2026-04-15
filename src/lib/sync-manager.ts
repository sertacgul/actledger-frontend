/**
 * Two-way sync manager for mobile PWA offline support.
 *
 * Pull: GET /sync/pull -> IndexedDB
 * Push: IndexedDB syncOutbox -> POST /sync/push
 *
 * Triggers: app focus, network reconnect, manual, periodic (5 min)
 */

import { api, tokenStore } from './api'
import { offlineDb } from './offline-db'
import type { Task } from '../types'

const SYNC_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
const LS_LAST_SYNC = 'actledger_mobile_last_sync'

let syncTimer: ReturnType<typeof setInterval> | null = null
let syncing = false

// ── Pull: server -> client ───────────────────────────────────────────────────

async function pull(): Promise<void> {
  const since = localStorage.getItem(LS_LAST_SYNC) || ''
  const params = new URLSearchParams()
  if (since) params.set('since', since)
  params.set('entities', 'tasks,messages,notifications')

  try {
    const res = await api.get<any>(`/sync/pull?${params.toString()}`)
    const data = res.data ?? res

    // Upsert tasks
    if (data.tasks?.length) {
      await offlineDb.putAll('tasks', data.tasks)
    }

    // Upsert messages
    if (data.messages?.length) {
      await offlineDb.putAll('messages', data.messages)
    }

    // Upsert notifications
    if (data.notifications?.length) {
      await offlineDb.putAll('notifications', data.notifications)
    }

    // Update last sync timestamp
    const pulledAt = data.pulledAt ?? new Date().toISOString()
    localStorage.setItem(LS_LAST_SYNC, pulledAt)
  } catch {
    // Offline or server error - skip
  }
}

// ── Push: client -> server ───────────────────────────────────────────────────

async function push(): Promise<void> {
  const pending = await offlineDb.getPendingOutbox()
  if (pending.length === 0) return

  const items = pending.slice(0, 50).map(p => ({
    id: p.clientId,
    entity: p.entity,
    action: p.action,
    payload: p.payload,
    clientTime: p.clientTime,
  }))

  try {
    const res = await api.post<any>('/sync/push', items)
    const results = res.data?.results ?? res.results ?? []

    for (const r of results) {
      if (r.status === 'PROCESSED' || r.success) {
        await offlineDb.markOutboxSynced(r.id ?? r.clientId)
      } else {
        await offlineDb.markOutboxFailed(r.id ?? r.clientId)
      }
    }

    // Mark remaining as synced if no detailed results
    if (results.length === 0) {
      for (const item of pending.slice(0, 50)) {
        await offlineDb.markOutboxSynced(item.clientId)
      }
    }
  } catch {
    // Will retry on next sync cycle
  }
}

// ── Upload pending media ─────────────────────────────────────────────────────

async function uploadPendingMedia(): Promise<void> {
  const queue = await offlineDb.getMediaQueue()
  if (queue.length === 0) return

  const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3001/api/v1'

  for (const item of queue) {
    try {
      const fd = new FormData()
      fd.append('file', item.blob, item.fileName)

      const token = tokenStore.get()
      await fetch(`${API_BASE}/field-reports/upload${item.taskId ? `?taskId=${item.taskId}` : ''}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      })

      await offlineDb.removeFromMediaQueue(item.clientId)
    } catch {
      // Will retry next cycle
      break
    }
  }
}

// ── Full sync cycle ──────────────────────────────────────────────────────────

export async function syncNow(): Promise<void> {
  if (syncing || !navigator.onLine || !tokenStore.get()) return
  syncing = true
  try {
    await push()
    await uploadPendingMedia()
    await pull()
  } finally {
    syncing = false
  }
}

export function isSyncing(): boolean {
  return syncing
}

export function getLastSyncTime(): string | null {
  return localStorage.getItem(LS_LAST_SYNC)
}

// ── Lifecycle ────────────────────────────────────────────────────────────────

export function startSyncManager(): void {
  if (syncTimer) return

  // Initial sync
  syncNow()

  // Periodic
  syncTimer = setInterval(syncNow, SYNC_INTERVAL_MS)

  // On app focus
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncNow()
  })

  // On network reconnect
  window.addEventListener('online', () => {
    setTimeout(syncNow, 1000) // small delay for network stabilization
  })
}

export function stopSyncManager(): void {
  if (syncTimer) {
    clearInterval(syncTimer)
    syncTimer = null
  }
}
