import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/SAI.webp'
import s from './Sidebar.module.css'
import ChangePasswordModal from './ChangePasswordModal'

const ALL_LINKS = [
  { to: '/dashboard',           label: 'Dashboard',           roles: ['admin', 'manager'], group: null },
  // Master Data
  { to: '/master/item-mapping', label: 'Item Mapping',        roles: ['admin'],            group: 'Master Data' },
  { to: '/classification',      label: 'Model Klasifikasi',   roles: ['admin', 'manager'], group: 'Master Data' },
  // Planning & Budget
  { to: '/planning/upload',     label: 'Upload Planning',     roles: ['admin'],            group: 'Planning & Budget' },
  { to: '/planning/list',       label: 'Planning List',       roles: ['admin', 'manager'], group: 'Planning & Budget' },
  { to: '/budget',              label: 'Budget Monitoring',   roles: ['admin'],            group: 'Planning & Budget' },
  // PR
  { to: '/pr/upload',           label: 'Upload PR',           roles: ['admin'],            group: 'Purchase Requisition' },
  { to: '/pr/history',          label: 'History',             roles: ['admin', 'manager'], group: 'Purchase Requisition' },
  { to: '/pr/result',           label: 'Result Matching',     roles: ['admin', 'manager'], group: 'Purchase Requisition' },
  { to: '/pr/mapping-review',   label: 'Mapping Review',      roles: ['admin', 'manager'], group: 'Purchase Requisition' },
  // Lainnya
  { to: '/users',               label: 'Kelola Akun',         roles: ['admin'],            group: 'Pengaturan' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 768)
  const [open, setOpen] = useState(window.innerWidth > 768)
  const [showPwdModal, setShowPwdModal] = useState(false)
  const [openGroups, setOpenGroups] = useState({})

  const toggleGroup = (group) => {
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }))
  }

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth > 768;
      setIsDesktop(desktop)
      if (!desktop) {
        setOpen(false)
      } else {
        setOpen(true)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Auto-close on route change for mobile
  useEffect(() => {
    if (!isDesktop) setOpen(false)
  }, [location.pathname, isDesktop])

  const links = ALL_LINKS.filter(l => l.roles.includes(user?.role))

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      {/* Hamburger button always visible */}
      <button className={s.hamburger} onClick={() => setOpen(!open)}>☰</button>

      {/* Overlay only on mobile */}
      {!isDesktop && open && <div className={s.overlay} onClick={() => setOpen(false)} />}

      <aside className={`${s.sidebar} ${open ? s.sidebarOpen : s.sidebarClosed}`}>
        <div className={s.logoWrap}>
          <img src={logo} alt="PT Summit Adyawinsa Indonesia" className={s.logoImg} />
          <div className={s.logoName}>PT Summit Adyawinsa Indonesia</div>
        </div>

        <div style={{ height: 6 }} />

        {(() => {
          const groups = [...new Set(links.map(l => l.group))]
          return groups.map(group => {
            const isOpen = openGroups[group]
            return (
              <div key={group ?? '_root'} style={{ marginBottom: group ? '4px' : '0' }}>
                {group && (
                  <button 
                    className={s.groupLabel} 
                    onClick={() => toggleGroup(group)}
                  >
                    <span>{group}</span>
                    <span>{isOpen ? '▼' : '▶'}</span>
                  </button>
                )}
                {(!group || isOpen) && (
                  <div className={s.groupLinks}>
                    {links.filter(l => l.group === group).map(l => (
                      <NavLink
                        key={l.to}
                        to={l.to}
                        className={({ isActive }) =>
                          isActive ? `${s.link} ${s.linkActive}` : s.link
                        }
                      >
                        {l.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        })()}

        <div className={s.spacer} />

        <div className={s.footer}>
          <div className={s.footerTop}>
            <div>
              <div className={s.footerName}>{user?.displayName || 'User'}</div>
              <div className={s.footerSub}>
                <span className={`${s.roleBadge} ${user?.role === 'admin' ? s.roleAdmin : s.roleManager}`}>
                  {user?.role === 'admin' ? 'Admin' : 'Manager'}
                </span>
              </div>
            </div>
          </div>
          <div className={s.footerActions}>
            <button className={s.pwdBtn} onClick={() => setShowPwdModal(true)}>Ganti Password</button>
            <button className={s.logoutBtn} onClick={handleLogout}>Logout</button>
          </div>
        </div>
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