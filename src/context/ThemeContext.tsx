import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme:            Theme
  zoom:             number   // 70-200
  sidebarFontScale: number   // 50-200 (percentage)
  toggleTheme:      () => void
  zoomIn:           () => void
  zoomOut:          () => void
  resetZoom:        () => void
  setSidebarFontScale: (v: number) => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

const ZOOM_STEP = 10
const ZOOM_MIN  = 70
const ZOOM_MAX  = 200
const ZOOM_DEF  = 100

const SIDEBAR_SCALE_DEF = 100

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() =>
    (localStorage.getItem('al_theme') as Theme | null) ?? 'light'
  )
  const [zoom, setZoomState] = useState<number>(() =>
    parseInt(localStorage.getItem('al_zoom') ?? String(ZOOM_DEF), 10)
  )
  const [sidebarFontScale, setSidebarFontScaleState] = useState<number>(() =>
    parseInt(localStorage.getItem('al_sidebar_font_scale') ?? String(SIDEBAR_SCALE_DEF), 10)
  )

  // Apply theme attribute to <html> so CSS variables + Tailwind dark: variants activate
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('al_theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('al_zoom', String(zoom))
  }, [zoom])

  useEffect(() => {
    localStorage.setItem('al_sidebar_font_scale', String(sidebarFontScale))
    document.documentElement.style.setProperty('--sidebar-font-scale', String(sidebarFontScale / 100))
  }, [sidebarFontScale])

  const clamp = (v: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v))

  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'))
  const zoomIn      = () => setZoomState(z => clamp(z + ZOOM_STEP))
  const zoomOut     = () => setZoomState(z => clamp(z - ZOOM_STEP))
  const resetZoom   = () => setZoomState(ZOOM_DEF)
  const setSidebarFontScale = (v: number) => setSidebarFontScaleState(Math.min(200, Math.max(50, v)))

  return (
    <ThemeContext.Provider value={{ theme, zoom, sidebarFontScale, toggleTheme, zoomIn, zoomOut, resetZoom, setSidebarFontScale }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
