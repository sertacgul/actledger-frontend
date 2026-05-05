import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CompanyProvider } from './context/CompanyContext'
import { ThemeProvider } from './context/ThemeContext'
import { LanguageProvider } from './context/LanguageContext'
import { ShortcutsProvider, useShortcut, useShortcutsContext } from './context/ShortcutsContext'
import SplashScreen from './components/ui/SplashScreen'
import ShortcutsHelpModal from './components/ui/ShortcutsHelpModal'
import HelpTooltips from './components/ui/HelpTooltips'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import Reports from './pages/Reports'
import Departments from './pages/Departments'
import Users from './pages/Users'
import MobileHub from './pages/MobileHub'
import Insights from './pages/Insights'
import Settings from './pages/Settings'
import Files from './pages/Files'
import Landing from './pages/Landing'
import Inventory from './pages/Inventory'
import IoTPage from './pages/IoT'
import LiveMap from './pages/LiveMap'
import AdminPanel from './pages/AdminPanel'
import KPIPanel from './pages/KPIPanel'
import StockManagement from './pages/StockManagement'
import SuperAdmin from './pages/SuperAdmin'
import Automation from './pages/Automation'
import Workflows from './pages/Workflows'
import WorkOrders from './pages/WorkOrders'
import InventoryIntelligence from './pages/InventoryIntelligence'
import UserGuide from './pages/UserGuide'
import PlatformMessages from './pages/PlatformMessages'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfUse from './pages/TermsOfUse'

// Mobile PWA pages
import MobileLayout from './components/layout/MobileLayout'
import MobileLogin from './pages/mobile/MobileLogin'
import MobileForcePasswordChange from './pages/mobile/MobileForcePasswordChange'
import MobileTasks from './pages/mobile/MobileTasks'
import MobileTaskDetail from './pages/mobile/MobileTaskDetail'
import MobileForms from './pages/mobile/MobileForms'
import MobileFormFill from './pages/mobile/MobileFormFill'
import MobileReportAction from './pages/mobile/MobileReportAction'
import MobileMessages from './pages/mobile/MobileMessages'
import MobileNotifications from './pages/mobile/MobileNotifications'
import MobileProfile from './pages/mobile/MobileProfile'
import MobileOperIQ from './pages/mobile/MobileOperIQ'
import MobileQRScanner from './pages/mobile/MobileQRScanner'
import MobileWorkOrders from './pages/mobile/MobileWorkOrders'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <svg className="animate-spin h-6 w-6 text-indigo-500" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  )
  if (!user) return <Navigate to="/" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <svg className="animate-spin h-6 w-6 text-indigo-500" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  )
  if (!user) return <Navigate to="/" replace />
  if (user.role !== 'platform_admin' && user.role !== 'super_admin') return <Navigate to="/panel" replace />
  return <>{children}</>
}

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <svg className="animate-spin h-6 w-6 text-indigo-500" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  )
  if (!user) return <Navigate to="/" replace />
  if (user.role !== 'super_admin') return <Navigate to="/panel" replace />
  return <>{children}</>
}

function GlobalShortcuts() {
  const navigate = useNavigate()
  const { setHelpOpen } = useShortcutsContext()

  // Help
  useShortcut({ id: 'help',           keys: '?',   label: 'Klavye kısayolları', category: 'Diğer',   handler: () => setHelpOpen(true) })

  // Navigation
  useShortcut({ id: 'nav_dashboard',  keys: 'g d', label: 'Panel',              category: 'Gezinme', handler: () => navigate('/panel') })
  useShortcut({ id: 'nav_tasks',      keys: 'g t', label: 'Görevler',           category: 'Gezinme', handler: () => navigate('/gorevler') })
  useShortcut({ id: 'nav_reports',    keys: 'g r', label: 'Raporlar',           category: 'Gezinme', handler: () => navigate('/raporlar') })
  useShortcut({ id: 'nav_depts',      keys: 'g p', label: 'Departmanlar',       category: 'Gezinme', handler: () => navigate('/departmanlar') })
  useShortcut({ id: 'nav_users',      keys: 'g u', label: 'Kullanıcılar',       category: 'Gezinme', handler: () => navigate('/kullanicilar') })
  useShortcut({ id: 'nav_insights',   keys: 'g i', label: 'OperIQ Analizleri',  category: 'Gezinme', handler: () => navigate('/analizler') })
  useShortcut({ id: 'nav_mobile',     keys: 'g m', label: 'Mobil Merkez',       category: 'Gezinme', handler: () => navigate('/mobil') })
  useShortcut({ id: 'nav_files',      keys: 'g f', label: 'Dosya Yöneticisi',   category: 'Gezinme', handler: () => navigate('/dosyalar') })
  useShortcut({ id: 'nav_inventory',  keys: 'g e', label: 'Envanter',           category: 'Gezinme', handler: () => navigate('/envanter') })
  useShortcut({ id: 'nav_iot',        keys: 'g o', label: 'IoT',               category: 'Gezinme', handler: () => navigate('/iot') })
  useShortcut({ id: 'nav_map',        keys: 'g h', label: 'Canli Harita',      category: 'Gezinme', handler: () => navigate('/harita') })
  useShortcut({ id: 'nav_stock',      keys: 'g q', label: 'Stok Yonetimi',     category: 'Gezinme', handler: () => navigate('/stok') })
  useShortcut({ id: 'nav_automation', keys: 'g a', label: 'Otomasyon',          category: 'Gezinme', handler: () => navigate('/otomasyon') })
  useShortcut({ id: 'nav_workflows',  keys: 'g w', label: 'Is Akislari',        category: 'Gezinme', handler: () => navigate('/is-akislari') })
  useShortcut({ id: 'nav_settings',   keys: 'g s', label: 'Ayarlar',            category: 'Gezinme', handler: () => navigate('/ayarlar') })

  return null
}

/** In standalone PWA / native app mode on mobile devices, redirect landing page to mobile login */
function StandaloneRedirect({ children }: { children: React.ReactNode }) {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
  const isNativeApp = !!(window as any).Capacitor?.isNativePlatform?.()
  const ua = navigator.userAgent || ''
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet|Kindle|Silk/i.test(ua)
  if ((isStandalone || isNativeApp) && isMobile) return <Navigate to="/m/giris" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <>
      <GlobalShortcuts />
      <ShortcutsHelpModal />
      <HelpTooltips />
      <Routes>
        <Route path="/"          element={<StandaloneRedirect><Landing /></StandaloneRedirect>} />
        <Route path="/giris"     element={<Navigate to="/" replace />} />
        <Route path="/privacy"   element={<PrivacyPolicy />} />
        <Route path="/terms"     element={<TermsOfUse />} />
        <Route path="/admin"     element={<AdminRoute><AdminPanel /></AdminRoute>} />
        <Route path="/super-admin" element={<SuperAdminRoute><SuperAdmin /></SuperAdminRoute>} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="panel"        element={<Dashboard />}   />
          <Route path="gorevler"     element={<Tasks />}       />
          <Route path="raporlar"     element={<Reports />}     />
          <Route path="departmanlar" element={<Departments />} />
          <Route path="kullanicilar" element={<Users />}       />
          <Route path="mobil"        element={<MobileHub />}   />
          <Route path="analizler"    element={<Insights />}    />
          <Route path="dosyalar"     element={<Files />}       />
          <Route path="envanter"     element={<Inventory />}   />
          <Route path="iot"          element={<IoTPage />}     />
          <Route path="harita"      element={<LiveMap />}     />
          <Route path="kpi-panel"    element={<KPIPanel />}    />
          <Route path="stok"         element={<StockManagement />} />
          <Route path="envanter-zeka" element={<InventoryIntelligence />} />
          <Route path="otomasyon"    element={<Automation />}  />
          <Route path="is-akislari"  element={<Workflows />}   />
          <Route path="is-siparisleri" element={<WorkOrders />} />
          <Route path="mesajlar"     element={<PlatformMessages />} />
          <Route path="ayarlar"      element={<Settings />}    />
          <Route path="manuel"       element={<UserGuide />}   />
        </Route>
        {/* ── Mobile PWA routes ──────────────────────────────────────────── */}
        <Route path="/m/giris"           element={<MobileLogin />} />
        <Route path="/m/sifre-degistir"  element={<MobileForcePasswordChange />} />
        <Route path="/m" element={<MobileLayout />}>
          <Route index                   element={<Navigate to="/m/gorevler" replace />} />
          <Route path="gorevler"         element={<MobileTasks />} />
          <Route path="gorev/:id"        element={<MobileTaskDetail />} />
          <Route path="formlar"          element={<MobileForms />} />
          <Route path="form/:id"         element={<MobileFormFill />} />
          <Route path="rapor/:id"       element={<MobileReportAction />} />
          <Route path="mesajlar"         element={<MobileMessages />} />
          <Route path="bildirimler"      element={<MobileNotifications />} />
          <Route path="profil"           element={<MobileProfile />} />
          <Route path="operiq"           element={<MobileOperIQ />} />
          <Route path="qr-tarama"       element={<MobileQRScanner />} />
          <Route path="is-siparisleri"  element={<MobileWorkOrders />} />
        </Route>

        <Route path="*" element={<StandaloneRedirect><Navigate to="/" replace /></StandaloneRedirect>} />
      </Routes>
    </>
  )
}

export default function App() {
  const [showSplash, setShowSplash] = useState(() => {
    const seen = sessionStorage.getItem('actledger_splash_seen')
    return !seen
  })

  const handleSplashComplete = () => {
    sessionStorage.setItem('actledger_splash_seen', '1')
    setShowSplash(false)
  }

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />
  }

  return (
    <LanguageProvider>
      <ThemeProvider>
        <CompanyProvider>
          <AuthProvider>
            <BrowserRouter>
              <ShortcutsProvider>
                <AppRoutes />
              </ShortcutsProvider>
            </BrowserRouter>
          </AuthProvider>
        </CompanyProvider>
      </ThemeProvider>
    </LanguageProvider>
  )
}
