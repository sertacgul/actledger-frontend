import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { getSector, type SectorPreset } from '../data/sectors'
import { api } from '../lib/api'

interface AppConfig {
  serverUrl: string
  deploymentMode: 'on-premise' | 'cloud'
  licenseType: string
  licenseKey: string
  companyName: string
  sector: string
  maxUsers: number
  maxDepartments: number
  appVersion: string
  features: Record<string, boolean>
}

interface CompanyContextType {
  config: AppConfig | null
  sector: SectorPreset | null
  isLoading: boolean
  updateSector: (sectorId: string) => void
  updateCompanyName: (name: string) => void
  /** Called after login to sync company info from backend */
  syncFromBackend: (company: { name?: string; sector?: string }) => void
}

const DEFAULT_CONFIG: AppConfig = {
  serverUrl: 'http://localhost:3001/api',
  deploymentMode: 'on-premise',
  licenseType: 'enterprise',
  licenseKey: '',
  companyName: 'Örnek Sanayi A.Ş.',
  sector: 'manufacturing',
  maxUsers: 150,
  maxDepartments: 20,
  appVersion: '0.9.1',
  features: {
    geminiAI: true,
    mobileApp: true,
    advancedReports: true,
    customForms: true,
    messaging: true,
  },
}

const CompanyContext = createContext<CompanyContextType | null>(null)

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Runtime config loading - on-prem instances replace /config.json with their own
    fetch('/config.json')
      .then(r => r.json())
      .then((data: AppConfig) => setConfig(data))
      .catch(() => setConfig(DEFAULT_CONFIG))
      .finally(() => setIsLoading(false))
  }, [])

  const updateSector = (sectorId: string) => {
    if (config) setConfig({ ...config, sector: sectorId })
    // Persist to backend
    api.patch('/companies/me', { sector: sectorId }).catch(() => {})
  }

  const updateCompanyName = (name: string) => {
    if (config) setConfig({ ...config, companyName: name })
  }

  // Sync sector & company name from backend /auth/me response
  const syncFromBackend = useCallback((company: { name?: string; sector?: string; licenseKey?: string; maxDepartments?: number; maxUsers?: number; maxMobileUsers?: number }) => {
    setConfig(prev => {
      if (!prev) return prev
      return {
        ...prev,
        ...(company.sector && { sector: company.sector }),
        ...(company.name && { companyName: company.name }),
        ...(company.licenseKey && { licenseKey: company.licenseKey }),
        ...(company.maxDepartments && { maxDepartments: company.maxDepartments }),
        ...(company.maxUsers && { maxUsers: company.maxUsers }),
      }
    })
  }, [])

  const sector = config ? getSector(config.sector) : null

  return (
    <CompanyContext.Provider value={{ config, sector, isLoading, updateSector, updateCompanyName, syncFromBackend }}>
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompany() {
  const ctx = useContext(CompanyContext)
  if (!ctx) throw new Error('useCompany must be used within CompanyProvider')
  return ctx
}
