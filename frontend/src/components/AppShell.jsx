import { useState, useEffect } from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Sidebar from './Sidebar'
import TopNavbar from './TopNavbar'
import Footer from './Footer'

/**
 * AppShell — layout wrapper that shows sidebar + top navbar + main content + footer.
 * Supports 3-state sidebar on Desktop: 'open' | 'icon' | 'close'
 * and 2-state on Mobile: 'open' | 'close'
 */
export default function AppShell() {
  const { user } = useAuth()
  const location = useLocation()
  
  // Desktop 3-state: 'open' | 'icon' | 'close'
  const [sidebarMode, setSidebarMode] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      return 'close'
    }
    const saved = localStorage.getItem('sbms_sidebar_mode')
    if (saved === 'open' || saved === 'icon' || saved === 'close') {
      return saved
    }
    return 'open'
  })

  // Mobile open/close state
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setIsMobileOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Auto close mobile drawer on route change
  useEffect(() => {
    if (window.innerWidth <= 768) {
      setIsMobileOpen(false)
    }
  }, [location.pathname])

  // Cycle 3-state on desktop: 'open' -> 'icon' -> 'close' -> 'open'
  const handleToggleSidebar = () => {
    if (window.innerWidth <= 768) {
      setIsMobileOpen(prev => !prev)
    } else {
      setSidebarMode(prev => {
        let nextMode
        if (prev === 'open') nextMode = 'icon'
        else if (prev === 'icon') nextMode = 'close'
        else nextMode = 'open'
        localStorage.setItem('sbms_sidebar_mode', nextMode)
        return nextMode
      })
    }
  }

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="app-shell">
      <Sidebar 
        mode={sidebarMode}
        setMode={setSidebarMode}
        isMobileOpen={isMobileOpen}
        onMobileClose={() => setIsMobileOpen(false)} 
      />
      <div className="app-main-container">
        <TopNavbar 
          onToggleSidebar={handleToggleSidebar} 
          sidebarMode={sidebarMode}
          isMobileOpen={isMobileOpen}
        />
        <main className="app-main">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  )
}
