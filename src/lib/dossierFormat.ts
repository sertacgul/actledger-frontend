// ── Dossier (Dashboard) Format Editor ───────────────────────────────────────
// Allows users to customize the visual appearance of dashboards:
// density, corner radius, shadow depth, background style, font scale, accent.

export type FormatDensity = 'compact' | 'comfortable' | 'spacious'
export type FormatRadius  = 'sharp'   | 'rounded'     | 'pill'
export type FormatShadow  = 'none'    | 'soft'        | 'strong'
export type FormatBg      = 'clean'   | 'pattern'     | 'gradient'
export type FormatFont    = 'small'   | 'normal'      | 'large'
export type FormatAccent  = 'indigo'  | 'blue'        | 'teal'   | 'amber' | 'rose' | 'slate'

export interface DossierFormat {
  density: FormatDensity
  radius:  FormatRadius
  shadow:  FormatShadow
  bg:      FormatBg
  font:    FormatFont
  accent:  FormatAccent
}

export const DEFAULT_FORMAT: DossierFormat = {
  density: 'comfortable',
  radius:  'rounded',
  shadow:  'soft',
  bg:      'clean',
  font:    'normal',
  accent:  'indigo',
}

export const ACCENT_COLORS: Record<FormatAccent, { name: string; hex: string }> = {
  indigo: { name: 'İndigo', hex: '#6366f1' },
  blue:   { name: 'Mavi',   hex: '#2563eb' },
  teal:   { name: 'Teal',   hex: '#0d9488' },
  amber:  { name: 'Amber',  hex: '#d97706' },
  rose:   { name: 'Gül',    hex: '#e11d48' },
  slate:  { name: 'Slate',  hex: '#475569' },
}

export const DENSITY_LABELS: Record<FormatDensity, string> = {
  compact:     'Sıkışık',
  comfortable: 'Rahat',
  spacious:    'Geniş',
}
export const RADIUS_LABELS: Record<FormatRadius, string> = {
  sharp:   'Köşeli',
  rounded: 'Yuvarlak',
  pill:    'Hap',
}
export const SHADOW_LABELS: Record<FormatShadow, string> = {
  none:   'Yok',
  soft:   'Yumuşak',
  strong: 'Belirgin',
}
export const BG_LABELS: Record<FormatBg, string> = {
  clean:    'Düz',
  pattern:  'Desenli',
  gradient: 'Gradyan',
}
export const FONT_LABELS: Record<FormatFont, string> = {
  small:  'Küçük',
  normal: 'Normal',
  large:  'Büyük',
}

// ── Storage ──────────────────────────────────────────────────────────────────
const LS_GLOBAL    = 'actledger:dossier_format'
const LS_PERBOARD  = 'actledger:dossier_format_per_board'

export function loadGlobalFormat(): DossierFormat {
  try {
    const raw = localStorage.getItem(LS_GLOBAL)
    if (raw) return { ...DEFAULT_FORMAT, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return DEFAULT_FORMAT
}

export function saveGlobalFormat(format: DossierFormat) {
  localStorage.setItem(LS_GLOBAL, JSON.stringify(format))
}

function loadPerBoardMap(): Record<string, DossierFormat> {
  try {
    const raw = localStorage.getItem(LS_PERBOARD)
    if (raw) return JSON.parse(raw) as Record<string, DossierFormat>
  } catch { /* ignore */ }
  return {}
}

function savePerBoardMap(map: Record<string, DossierFormat>) {
  localStorage.setItem(LS_PERBOARD, JSON.stringify(map))
}

export function loadBoardFormat(dashboardId: string): DossierFormat | undefined {
  return loadPerBoardMap()[dashboardId]
}

export function saveBoardFormat(dashboardId: string, format: DossierFormat) {
  const map = loadPerBoardMap()
  map[dashboardId] = format
  savePerBoardMap(map)
}

export function clearBoardFormat(dashboardId: string) {
  const map = loadPerBoardMap()
  delete map[dashboardId]
  savePerBoardMap(map)
}

/** Resolve the effective format for a dashboard: per-board override > global */
export function resolveFormat(dashboardId: string): DossierFormat {
  return loadBoardFormat(dashboardId) ?? loadGlobalFormat()
}
