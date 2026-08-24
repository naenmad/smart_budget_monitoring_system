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
  X
} from 'lucide-react'

const DEFAULT_WIDTH = 250
const MIN_EXPANDED_WIDTH = 200
const MAX_WIDTH = 380
const COLLAPSED_WIDTH = 68
const SNAP_THRESHOLD = 140

const MENU_CONFIG = [
  { 
    group: null, 
    items: [
      { to: '/dashboard', label: 'Dashboard', roles: ['admin', 'manager'], icon: LayoutDashboard }
    ]
  },
  { 
    group: 'Master Data', 
    items: [
      { to: '/master/item-mapping', label: 'Item Mapping', roles: ['admin'], icon: Network },
      { to: '/classification', label: 'Model Klasifikasi', roles: ['admin', 'manager'], icon: Cpu }
    ]
  },
  { 
    group: 'Planning & Budget', 
    items: [
      { to: '/planning/upload', label: 'Upload Planning', roles: ['admin'], icon: UploadCloud },
      { to: '/planning/list', label: 'Planning List', roles: ['admin', 'manager'], icon: CalendarDays },
      { to: '/budget', label: 'Budget Monitoring', roles: ['admin'], icon: PieChart }
    ]
  },
  { 
    group: 'Purchase Requisition', 
    items: [
      { to: '/pr/upload', label: 'Upload PR', roles: ['admin'], icon: FileSpreadsheet },
      { to: '/pr/history', label: 'PR History', roles: ['admin', 'manager'], icon: History },
      { to: '/pr/result', label: 'Result Matching', roles: ['admin', 'manager'], icon: Layers },
      { to: '/pr/mapping-review', label: 'Mapping Review', roles: ['admin', 'manager'], icon: CheckSquare }
    ]
  },
  { 
    group: 'Pengaturan', 
    items: [
      { to: '/users', label: 'Kelola Pengguna', roles: ['admin'], icon: UserCog }
    ]
  }
]

export default function Sidebar({ mode = 'open', setMode, isMobileOpen, onMobileClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [showPwdModal, setShowPwdModal] = useState(false)
  const [openGroups, setOpenGroups] = useState({
    'Master Data': true,
    'Planning & Budget': true,
    'Purchase Requisition': true,
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
  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef(null)

  const isCollapsed = !isMobile && mode === 'icon'
  const isClosed = !isMobile && mode === 'close'

  // Auto expand the group that contains active link
  useEffect(() => {
    MENU_CONFIG.forEach(section => {
      if (section.group && section.items.some(it => it.to === location.pathname)) {
        setOpenGroups(prev => ({ ...prev, [section.group]: true }))
      }
    })
  }, [location.pathname])

  const toggleGroup = (group) => {
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }))
  }

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  // Resizing logic (desktop only)
  const startResizing = useCallback((e) => {
    if (isMobile) return
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
  }, [isMobile])

  const stopResizing = useCallback(() => {
    setIsResizing(false)
  }, [])

  const resize = useCallback((e) => {
    if (isResizing && !isMobile) {
      const clientX = e.clientX
      if (clientX < SNAP_THRESHOLD) {
        setMode?.('icon')
        localStorage.setItem('sbms_sidebar_mode', 'icon')
      } else {
        let newWidth = clientX
        if (newWidth < MIN_EXPANDED_WIDTH) newWidth = MIN_EXPANDED_WIDTH
        if (newWidth > MAX_WIDTH) newWidth = MAX_WIDTH
        setCustomWidth(newWidth)
        localStorage.setItem('sbms_sidebar_width', String(newWidth))
        setMode?.('open')
        localStorage.setItem('sbms_sidebar_mode', 'open')
      }
    }
  }, [isResizing, isMobile, setMode])

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize)
      window.addEventListener('mouseup', stopResizing)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    } else {
      window.removeEventListener('mousemove', resize)
      window.removeEventListener('mouseup', stopResizing)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    return () => {
      window.removeEventListener('mousemove', resize)
      window.removeEventListener('mouseup', stopResizing)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, resize, stopResizing])

  // Reset to default width on double click
  const handleDoubleClick = () => {
    if (isMobile) return
    if (isCollapsed || isClosed) {
      setMode?.('open')
      localStorage.setItem('sbms_sidebar_mode', 'open')
    } else {
      setMode?.('icon')
      localStorage.setItem('sbms_sidebar_mode', 'icon')
    }
  }

  // Determine effective width in desktop
  const getDesktopWidth = () => {
    if (isClosed) return 0
    if (isCollapsed) return COLLAPSED_WIDTH
    return customWidth
  }

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isMobile && isMobileOpen && (
        <div 
          className={s.backdrop} 
          onClick={onMobileClose} 
          aria-hidden="true"
        />
      )}

      <aside 
        ref={sidebarRef}
        className={`
          ${s.sidebar} 
          ${isMobile ? (isMobileOpen ? s.mobileOpen : s.mobileClosed) : ''}
          ${!isMobile && isClosed ? s.sidebarClosed : ''}
          ${!isMobile && isCollapsed ? s.collapsed : ''}
          ${isResizing ? s.resizing : ''}
        `}
        style={{
          width: !isMobile ? `${getDesktopWidth()}px` : undefined
        }}
      >
        {/* Brand / Logo Header — 100% Focused on Clean Brand Logo */}
        {isCollapsed && !isMobile ? (
          <div className={s.brandHeaderCollapsed} title="PT Summit Adyawinsa Indonesia">
            <img src={logo} alt="SAI Logo" className={s.logoImgCollapsed} />
          </div>
        ) : (
          <div className={s.brandHeader}>
            <div className={s.logoContainer} title="PT Summit Adyawinsa Indonesia">
              <img src={logo} alt="SAI Logo" className={s.logoImg} />
              <div className={s.brandDetails}>
                <span className={s.brandCompany}>PT Summit Adyawinsa</span>
                <span className={s.brandApp}>Smart Budget System</span>
              </div>
            </div>

            {/* Mobile close button only */}
            {isMobile && (
              <button 
                type="button" 
                className={s.closeMobileBtn} 
                onClick={onMobileClose}
                aria-label="Tutup menu"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}

        {/* Navigation Menu */}
        <nav className={s.navContainer}>
          {MENU_CONFIG.map((section, idx) => {
            const visibleItems = section.items.filter(item => item.roles.includes(user?.role))
            if (visibleItems.length === 0) return null

            const isGroupOpen = isCollapsed ? true : (section.group ? openGroups[section.group] : true)

            return (
              <div key={section.group || `root_${idx}`} className={s.navGroup}>
                {section.group && (!isCollapsed || isMobile) && (
                  <button 
                    type="button"
                    className={s.groupToggle} 
                    onClick={() => toggleGroup(section.group)}
                  >
                    <span className={s.groupTitle}>{section.group}</span>
                    <ChevronDown 
                      size={14} 
                      className={`${s.groupChevron} ${isGroupOpen ? s.groupChevronOpen : ''}`} 
                    />
                  </button>
                )}

                {section.group && isCollapsed && !isMobile && (
                  <div className={s.collapsedDivider} />
                )}

                {isGroupOpen && (
                  <div className={s.groupItems}>
                    {visibleItems.map(item => {
                      const Icon = item.icon
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          onClick={() => {
                            if (isMobile) {
                              onMobileClose?.()
                            }
                          }}
                          className={({ isActive }) =>
                            isActive ? `${s.navLink} ${s.navLinkActive}` : s.navLink
                          }
                        >
                          <Icon size={18} className={s.navIcon} />
                          {(!isCollapsed || isMobile) && <span className={s.navText}>{item.label}</span>}
                          {isCollapsed && !isMobile && (
                            <span className={s.navTooltip}>
                              {item.label}
                            </span>
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

        {/* User Card & Actions */}
        <div className={s.userCard}>
          {!isCollapsed || isMobile ? (
            <>
              <div className={s.userCardProfile}>
                <div className={s.userAvatarMini}>
                  <User size={15} />
                </div>
                <div className={s.userCardInfo}>
                  <span className={s.userCardName}>{user?.username || 'User'}</span>
                  <span className={`${s.roleBadge} ${user?.role === 'admin' ? s.roleAdmin : s.roleManager}`}>
                    <Shield size={10} style={{ display: 'inline', marginRight: 3 }} />
                    {user?.role === 'admin' ? 'Admin' : 'Manager'}
                  </span>
                </div>
              </div>

              <div className={s.userCardActions}>
                <button 
                  type="button" 
                  className={s.actionBtn}
                  onClick={() => setShowPwdModal(true)}
                  title="Ganti Password"
                >
                  <KeyRound size={13} />
                  <span>Password</span>
                </button>
                <button 
                  type="button" 
                  className={`${s.actionBtn} ${s.logoutBtn}`}
                  onClick={handleLogout}
                  title="Logout dari akun"
                >
                  <LogOut size={13} />
                  <span>Logout</span>
                </button>
              </div>
            </>
          ) : (
            <div className={s.userCardCollapsed}>
              <div className={s.tooltipWrapper}>
                <div className={s.userAvatarMini}>
                  <User size={16} />
                </div>
                <span className={s.navTooltip}>
                  {user?.username || 'User'} ({user?.role === 'admin' ? 'Admin' : 'Manager'})
                </span>
              </div>

              <div className={s.tooltipWrapper}>
                <button 
                  type="button" 
                  className={s.collapsedActionBtn}
                  onClick={() => setShowPwdModal(true)}
                  aria-label="Ganti Password"
                >
                  <KeyRound size={15} />
                </button>
                <span className={s.navTooltip}>Ganti Password</span>
              </div>

              <div className={s.tooltipWrapper}>
                <button 
                  type="button" 
                  className={`${s.collapsedActionBtn} ${s.logoutBtn}`}
                  onClick={handleLogout}
                  aria-label="Logout dari akun"
                >
                  <LogOut size={15} />
                </button>
                <span className={s.navTooltip}>Logout</span>
              </div>
            </div>
          )}
        </div>

        {/* Resizer Handle (Desktop Only when not closed) */}
        {!isMobile && !isClosed && (
          <div 
            className={s.resizer}
            onMouseDown={startResizing}
            onDoubleClick={handleDoubleClick}
            title={isCollapsed ? "Klik ganda untuk buka sidebar" : "Tarik untuk ubah ukuran • Tarik ke kiri untuk mode ikon"}
          >
            <div className={s.resizerKnob} />
          </div>
        )}
      </aside>

      {showPwdModal && (
        <ChangePasswordModal 
          userId={user?.id} 
          onClose={() => setShowPwdModal(false)} 
        />
      )}
    </>
  )
}