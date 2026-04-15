/**
 * Photo compression and video capture utilities for mobile PWA.
 *
 * - Photos: Canvas-based compression (max 1920px, quality 0.8)
 * - Video: MediaRecorder API, max 20 seconds
 * - Upload: FormData with token auth
 */

import { tokenStore } from './api'

const MAX_WIDTH = 1920
const JPEG_QUALITY = 0.8
const MAX_PHOTOS = 5
const MAX_VIDEO_DURATION_SEC = 20

// ── Photo compression ────────────────────────────────────────────────────────

export async function compressImage(file: File, maxWidth = MAX_WIDTH, quality = JPEG_QUALITY): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas context unavailable')); return }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Compression failed')),
        'image/jpeg',
        quality,
      )
    }
    img.onerror = () => reject(new Error('Image load failed'))
    img.src = URL.createObjectURL(file)
  })
}

// ── Photo validation ─────────────────────────────────────────────────────────

export function validatePhotos(files: FileList | File[]): { valid: File[]; error?: string } {
  const arr = Array.from(files)
  if (arr.length > MAX_PHOTOS) {
    return { valid: arr.slice(0, MAX_PHOTOS), error: `Max ${MAX_PHOTOS} photos` }
  }
  const images = arr.filter(f => f.type.startsWith('image/'))
  return { valid: images }
}

// ── Video validation ─────────────────────────────────────────────────────────

export async function validateVideo(file: File): Promise<{ valid: boolean; error?: string }> {
  return new Promise(resolve => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src)
      if (video.duration > MAX_VIDEO_DURATION_SEC) {
        resolve({ valid: false, error: `Video must be ${MAX_VIDEO_DURATION_SEC}s or less (${Math.round(video.duration)}s)` })
      } else {
        resolve({ valid: true })
      }
    }
    video.onerror = () => resolve({ valid: false, error: 'Invalid video file' })
    video.src = URL.createObjectURL(file)
  })
}

// ── Upload photos/video ──────────────────────────────────────────────────────

export async function uploadMedia(
  files: File[],
  taskId?: string,
): Promise<{ success: boolean; urls?: string[]; error?: string }> {
  const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3001/api/v1'

  try {
    const formData = new FormData()

    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const compressed = await compressImage(file)
        formData.append('photos', compressed, file.name.replace(/\.[^.]+$/, '.jpg'))
      } else if (file.type.startsWith('video/')) {
        formData.append('video', file, file.name)
      }
    }

    const token = tokenStore.get()
    const res = await fetch(
      `${API_BASE}/field-reports${taskId ? `?taskId=${taskId}` : ''}`,
      {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      },
    )

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return { success: false, error: body.message ?? `Upload failed (${res.status})` }
    }

    const body = await res.json()
    return { success: true, urls: body.data?.urls ?? [] }
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Upload failed' }
  }
}

export { MAX_PHOTOS, MAX_VIDEO_DURATION_SEC }
