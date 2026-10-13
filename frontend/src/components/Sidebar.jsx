import { useState, useEffect, useRef, useCallback } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/SAI.webp'
import s from './Sidebar.module.css'
import ChangePasswordModal from './ChangePasswordModal'
import {
  LayoutDashboard,
  Network,
  Cpu,
  UploadCloud,
  CalendarDays,
  PieChart,
  FileSpreadsheet,
  History,
  Layers,
  CheckSquare,
  UserCog,
  ChevronDown,
  LogOut,
  KeyRound,
  Shield,
  User,
  Receipt,
  TrendingUp,
  AlertTriangle,
  X
} from 'lucide-react'

const DEFAULT_WIDTH = 250
const MIN_EXPANDED_WIDTH = 200
const MAX_WIDTH = 380
const COLLAPSED_WIDTH = 68
const SNAP_THRESHOLD = 140

// Toggle untuk menampilkan/menyembunyikan modul arsip (PR upload & AI verification)
// Ubah menjadi `true` jika sewaktu-waktu ingin memunculkan kembali ke menu sidebar
export const SHOW_LEGACY_MODULES = false

const CORE_MENU_CONFIG = [
  { 
    group: null, 
    items: [
      { to: '/dashboard', label: 'Dashboard', roles: ['admin', 'manager'], icon: LayoutDashboard }
    ]
  },
  { 
    group: 'Planning & Budget', 
    items: [
      { to: '/planning', label: 'Data & Kelola Planning', roles: ['admin', 'manager'], icon: CalendarDays },
      { to: '/out-of-plan', label: 'Out of Plan (OOP)', roles: ['admin', 'manager'], icon: AlertTriangle },
      { to: '/budget', label: 'Alokasi Budget (Setup)', roles: ['admin'], icon: PieChart }
    ]
  },
  { 
    group: 'Operasional QA', 
    items: [
      { to: '/entertaint-cost', label: 'Entertainment Budget (E-6)', roles: ['admin', 'manager'], icon: Receipt }
    ]
  },
  { 
    group: 'Pengaturan', 
    items: [
      { to: '/users', label: 'Kelola Pengguna', roles: ['admin'], icon: UserCog }
    ]
  }
]

const LEGACY_MENU_GROUPS = [
  { 
    group: 'Purchase Requisition', 
    items: [
      { to: '/pr/upload', label: 'Kelola File PR', roles: ['admin'], icon: FileSpreadsheet },
      { to: '/pr/history', label: 'PR History', roles: ['admin', 'manager'], icon: History },
      { to: '/pr/verification', label: 'Verifikasi & Hasil PR', roles: ['admin', 'manager'], icon: CheckSquare }
    ]
  },
  { 
    group: 'Master Data & AI', 
    items: [
      { to: '/master/item-mapping', label: 'Item Mapping', roles: ['admin'], icon: Network },
      { to: '/classification', label: 'Model Klasifikasi', roles: ['admin', 'manager'], icon: Cpu }
    ]
  }
]

const MENU_CONFIG = SHOW_LEGACY_MODULES 
  ? [...CORE_MENU_CONFIG.slice(0, 2), ...LEGACY_MENU_GROUPS, ...CORE_MENU_CONFIG.slice(2)]
  : CORE_MENU_CONFIG

export default function Sidebar({ mode = 'open', setMode, isMobileOpen, onMobileClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [showPwdModal, setShowPwdModal] = useState(false)
  const [openGroups, setOpenGroups] = useState({
    'Master Data': true,
    'Planning & Budget': true,
    'Purchase Requisition': true,
    'Operasional QA': true,
    'Pengaturan': true
  })

  // Detect mobile viewport (<= 768px)
  const [isMobile, setIsMobile] = useState(() => 
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  )

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Width persistence in localStorage for desktop expanded mode
  const [customWidth, setCustomWidth] = useState(() => {
    const saved = localStorage.getItem('sbms_sidebar_width')
    const parsed = parseInt(saved, 10)
    if (!isNaN(parsed) && parsed >= MIN_EXPANDED_WIDTH && parsed <= MAX_WIDTH) {
      return parsed
    }
    return DEFAULT_WIDTH
  })

  const isResizing = useRef(false)
  const sidebarRef = useRef(null)

  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    isResizing.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const handleMouseMove = (e) => {
      if (!isResizing.current) return
      const newWidth = e.clientX

      if (newWidth < SNAP_THRESHOLD) {
        setMode('collapsed')
        return
      }

      if (newWidth >= MIN_EXPANDED_WIDTH && newWidth <= MAX_WIDTH) {
        if (mode === 'collapsed') {
          setMode('open')
        }
        setCustomWidth(newWidth)
        localStorage.setItem('sbms_sidebar_width', newWidth)
      }
    }

    const handleMouseUp = () => {
      isResizing.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [mode, setMode])

  const toggleGroup = (group) => {
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }))
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isCollapsed = mode === 'collapsed' && !isMobile

  return (
    <>
      {isMobileOpen && isMobile && (
        <div className={s.mobileBackdrop} onClick={onMobileClose} />
      )}

      <aside
        ref={sidebarRef}
        className={`
          ${s.sidebar} 
          ${isCollapsed ? s.collapsed : s.open} 
          ${isMobile ? s.mobile : ''} 
          ${isMobileOpen ? s.mobileOpen : ''}
        `}
        style={!isMobile && !isCollapsed ? { width: `${customWidth}px` } : {}}
      >
        <div className={s.brand}>
          <img src={logo} alt="SAI Logo" className={s.logo} />
          {(!isCollapsed || isMobile) && (
            <div className={s.brandText}>
              <span className={s.brandTitle}>Smart Budget</span>
              <span className={s.brandSubtitle}>Monitoring System</span>
            </div>
          )}
          {isMobile && (
            <button className={s.closeMobileBtn} onClick={onMobileClose}>
              <X size={18} />
            </button>
          )}
        </div>

        <nav className={s.nav}>
          {MENU_CONFIG.map((groupObj, idx) => {
            const visibleItems = groupObj.items.filter(item => {
              if (!item.roles) return true
              return item.roles.includes(user?.role)
            })

            if (visibleItems.length === 0) return null

            return (
              <div key={idx} className={s.navGroup}>
                {groupObj.group && (!isCollapsed || isMobile) && (
                  <button
                    className={s.groupHeader}
                    onClick={() => toggleGroup(groupObj.group)}
                  >
                    <span>{groupObj.group}</span>
                    <ChevronDown
                      size={14}
                      className={`
                        ${s.groupChevron} 
                        ${openGroups[groupObj.group] ? s.chevronOpen : ''}
                      `}
                    />
                  </button>
                )}

                {(!groupObj.group || openGroups[groupObj.group] || isCollapsed) && (
                  <div className={s.groupItems}>
                    {visibleItems.map(item => {
                      const Icon = item.icon
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          onClick={() => isMobile && onMobileClose()}
                          className={({ isActive }) => `
                            ${s.navItem} 
                            ${isActive ? s.active : ''}
                          `}
                          title={isCollapsed && !isMobile ? item.label : undefined}
                        >
                          <Icon size={18} className={s.navIcon} />
                          {(!isCollapsed || isMobile) && (
                            <span className={s.navLabel}>{item.label}</span>
                          )}
                        </NavLink>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div className={s.userSection}>
          <div className={s.userInfo}>
            <div className={s.userAvatar}>
              <User size={16} />
            </div>
            {(!isCollapsed || isMobile) && (
              <div className={s.userDetails}>
                <span className={s.userName}>{user?.name || user?.username}</span>
                <span className={s.userRole}>{user?.role}</span>
              </div>
            )}
          </div>

          <div className={s.userActions}>
            <button
              onClick={() => setShowPwdModal(true)}
              className={s.actionBtn}
              title="Ganti Password"
            >
              <KeyRound size={16} />
            </button>
            <button
              onClick={handleLogout}
              className={s.actionBtn}
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {!isMobile && !isCollapsed && (
          <div className={s.resizer} onMouseDown={handleMouseDown} />
        )}
      </aside>

      {showPwdModal && (
        <ChangePasswordModal onClose={() => setShowPwdModal(false)} />
      )}
    </>
  )
}
