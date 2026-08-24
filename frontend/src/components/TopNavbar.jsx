import { useLocation } from 'react-router-dom'
import { 
  Menu, 
  PanelLeftClose, 
  PanelLeftOpen, 
  Sparkles,
  LayoutGrid
} from 'lucide-react'
import s from './TopNavbar.module.css'

const ROUTE_TITLES = {
  '/dashboard': { title: 'Dashboard Monitoring', category: 'Overview' },
  '/master/item-mapping': { title: 'Item Mapping Rules', category: 'Master Data' },
  '/classification': { title: 'Model Klasifikasi AI', category: 'Master Data' },
  '/planning/upload': { title: 'Upload Planning Anggaran', category: 'Planning & Budget' },
  '/planning/list': { title: 'Daftar Planning Anggaran', category: 'Planning & Budget' },
  '/budget': { title: 'Budget Monitoring', category: 'Planning & Budget' },
  '/pr/upload': { title: 'Upload Purchase Requisition', category: 'Purchase Requisition' },
  '/pr/history': { title: 'Riwayat PR / PO', category: 'Purchase Requisition' },
  '/pr/result': { title: 'Result Matching', category: 'Purchase Requisition' },
  '/pr/mapping-review': { title: 'Mapping Review & Validasi', category: 'Purchase Requisition' },
  '/users': { title: 'Kelola Pengguna', category: 'Pengaturan' }
}

export default function TopNavbar({ onToggleSidebar, sidebarMode, isMobileOpen }) {
  const location = useLocation()

  const currentRoute = ROUTE_TITLES[location.pathname] || {
    title: 'Smart Budget Monitoring',
    category: 'System'
  }

  // Get toggle tooltip and icon based on mode
  const getToggleInfo = () => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      return {
        icon: isMobileOpen ? <PanelLeftClose size={20} /> : <Menu size={20} />,
        title: isMobileOpen ? 'Tutup Menu' : 'Buka Menu'
      }
    }
    if (sidebarMode === 'open') {
      return {
        icon: <Menu size={20} />,
        title: 'Klik: Mode Ikon Saja'
      }
    }
    if (sidebarMode === 'icon') {
      return {
        icon: <LayoutGrid size={20} />,
        title: 'Klik: Tutup Sidebar Penuh'
      }
    }
    return {
      icon: <PanelLeftOpen size={20} />,
      title: 'Klik: Buka Sidebar Penuh'
    }
  }

  const { icon, title } = getToggleInfo()

  return (
    <header className={s.topbar}>
      <div className={s.leftSection}>
        <button 
          type="button"
          className={s.toggleBtn}
          onClick={onToggleSidebar}
          aria-label={title}
          title={title}
        >
          {icon}
        </button>

        <div className={s.breadcrumb}>
          <span className={s.categoryBadge}>{currentRoute.category}</span>
          <span className={s.divider}>/</span>
          <h1 className={s.pageTitle}>{currentRoute.title}</h1>
        </div>
      </div>

      <div className={s.rightSection}>
        <div className={s.systemTag}>
          <Sparkles size={13} className={s.sparkleIcon} />
          <span className={s.tagText}>SAI QC System</span>
        </div>
      </div>
    </header>
  )
}
