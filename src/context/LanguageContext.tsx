import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { translations, type TranslationKey, type Lang } from '../i18n/translations'

interface LanguageContextType {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
}

const STORAGE_KEY = 'actledger_lang'

const LanguageContext = createContext<LanguageContextType | null>(null)

const VALID_LANGS: Lang[] = ['tr', 'en', 'ru', 'de']

function detectInitial(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null
    if (saved && VALID_LANGS.includes(saved)) return saved
  } catch { /* SSR / disabled */ }
  if (typeof navigator !== 'undefined') {
    const bl = navigator.language?.toLowerCase()
    if (bl?.startsWith('en')) return 'en'
    if (bl?.startsWith('ru')) return 'ru'
    if (bl?.startsWith('de')) return 'de'
  }
  return 'tr'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => detectInitial())

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, lang) } catch { /* ignore */ }
    if (typeof document !== 'undefined') document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((next: Lang) => setLangState(next), [])

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => {
      const dict = (translations as any)[lang] ?? translations.tr
      let value = dict[key] ?? (translations as any).en[key] ?? (translations as any).tr[key] ?? key
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
        }
      }
      return value
    },
    [lang],
  )

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}

/** Convenience: pick the right side of a bilingual { tr, en } object. RU/DE fallback to EN. */
export function useBi() {
  const { lang } = useLanguage()
  return <T,>(value: { tr: T; en: T }): T => {
    if (lang === 'tr') return value.tr
    return value.en // EN, RU, DE all use English for bilingual content
  }
}
