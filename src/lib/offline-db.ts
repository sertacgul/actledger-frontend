/**
 * IndexedDB wrapper for offline-first mobile PWA.
 * Database: actledger_mobile, version 1
 *
 * Stores: tasks, formTemplates, messages, notifications, syncOutbox, mediaQueue
 */

const DB_NAME = 'actledger_mobile'
const DB_VERSION = 1

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = () => {
      const db = req.result

      // Tasks
      if (!db.objectStoreNames.contains('tasks')) {
        const ts = db.createObjectStore('tasks', { keyPath: 'id' })
        ts.createIndex('status', 'status', { unique: false })
        ts.createIndex('updatedAt', 'updatedAt', { unique: false })
      }

      // Form templates
      if (!db.objectStoreNames.contains('formTemplates')) {
        db.createObjectStore('formTemplates', { keyPath: 'id' })
      }

      // Messages
      if (!db.objectStoreNames.contains('messages')) {
        const ms = db.createObjectStore('messages', { keyPath: 'id' })
        ms.createIndex('createdAt', 'createdAt', { unique: false })
      }

      // Notifications
      if (!db.objectStoreNames.contains('notifications')) {
        const ns = db.createObjectStore('notifications', { keyPath: 'id' })
        ns.createIndex('createdAt', 'createdAt', { unique: false })
      }

      // Sync outbox (pending offline changes)
      if (!db.objectStoreNames.contains('syncOutbox')) {
        const so = db.createObjectStore('syncOutbox', { keyPath: 'clientId' })
        so.createIndex('status', 'status', { unique: false })
        so.createIndex('createdAt', 'createdAt', { unique: false })
      }

      // Media queue (photos/videos awaiting upload)
      if (!db.objectStoreNames.contains('mediaQueue')) {
        db.createObjectStore('mediaQueue', { keyPath: 'clientId' })
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => { dbPromise = null; reject(req.error) }
  })
  return dbPromise
}

// ── Generic CRUD helpers ─────────────────────────────────────────────────────

export async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getById<T>(storeName: string, id: string): Promise<T | undefined> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const req = store.get(id)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function put<T>(storeName: string, item: T): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    store.put(item)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function putAll<T>(storeName: string, items: T[]): Promise<void> {
  if (items.length === 0) return
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    for (const item of items) store.put(item)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function remove(storeName: string, id: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    store.delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function clearStore(storeName: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    store.clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function count(storeName: string): Promise<number> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const req = store.count()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// ── Sync outbox helpers ──────────────────────────────────────────────────────

export interface SyncOutboxItem {
  clientId: string
  entity: 'task' | 'report' | 'checklist' | 'message' | 'form'
  action: 'CREATE' | 'UPDATE'
  payload: Record<string, unknown>
  clientTime: string
  status: 'pending' | 'synced' | 'failed'
  createdAt: string
}

export async function addToOutbox(item: Omit<SyncOutboxItem, 'clientId' | 'createdAt' | 'status'>): Promise<string> {
  const clientId = crypto.randomUUID()
  const record: SyncOutboxItem = {
    ...item,
    clientId,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
  await put('syncOutbox', record)
  return clientId
}

export async function getPendingOutbox(): Promise<SyncOutboxItem[]> {
  const all = await getAll<SyncOutboxItem>('syncOutbox')
  return all.filter(i => i.status === 'pending')
}

export async function markOutboxSynced(clientId: string): Promise<void> {
  const item = await getById<SyncOutboxItem>('syncOutbox', clientId)
  if (item) {
    item.status = 'synced'
    await put('syncOutbox', item)
  }
}

export async function markOutboxFailed(clientId: string): Promise<void> {
  const item = await getById<SyncOutboxItem>('syncOutbox', clientId)
  if (item) {
    item.status = 'failed'
    await put('syncOutbox', item)
  }
}

// ── Media queue helpers ──────────────────────────────────────────────────────

export interface MediaQueueItem {
  clientId: string
  taskId?: string
  blob: Blob
  fileName: string
  mimeType: string
  createdAt: string
}

export async function addToMediaQueue(item: Omit<MediaQueueItem, 'clientId' | 'createdAt'>): Promise<string> {
  const clientId = crypto.randomUUID()
  const record: MediaQueueItem = {
    ...item,
    clientId,
    createdAt: new Date().toISOString(),
  }
  await put('mediaQueue', record)
  return clientId
}

export async function getMediaQueue(): Promise<MediaQueueItem[]> {
  return getAll('mediaQueue')
}

export async function removeFromMediaQueue(clientId: string): Promise<void> {
  return remove('mediaQueue', clientId)
}

export const offlineDb = {
  getAll,
  getById,
  put,
  putAll,
  remove,
  clearStore,
  count,
  addToOutbox,
  getPendingOutbox,
  markOutboxSynced,
  markOutboxFailed,
  addToMediaQueue,
  getMediaQueue,
  removeFromMediaQueue,
}
