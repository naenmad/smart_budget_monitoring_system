import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import styles from './Breadcrumbs.module.css'

const ROUTE_MAP = {
  '/dashboard': [{ label: 'Dashboard', path: '/dashboard' }],
  '/budget': [{ label: 'Monitoring Budget', path: '/dashboard' }, { label: 'Alokasi Budget' }],
  '/classification': [{ label: 'Monitoring Budget', path: '/dashboard' }, { label: 'Klasifikasi PR' }],
  '/planning': [{ label: 'Perencanaan', path: '/planning' }, { label: 'Daftar Planning Budget' }],
  '/pr/upload': [{ label: 'Operasional PR', path: '/pr/history' }, { label: 'Upload Dokumen PR' }],
  '/pr/history': [{ label: 'Operasional PR', path: '/pr/history' }, { label: 'Riwayat Dokumen PR' }],
  '/pr/verification': [{ label: 'Operasional PR', path: '/pr/history' }, { label: 'Verifikasi & Matching' }],
  '/master/item-mapping': [{ label: 'Master Data' }, { label: 'Item Mapping AI' }],
  '/entertaint-cost': [{ label: 'Operasional QA' }, { label: 'Entertainment Cost' }],
  '/users': [{ label: 'Pengaturan' }, { label: 'Manajemen Pengguna' }],
}

export default function Breadcrumbs() {
  const location = useLocation()
  const currentPath = location.pathname

  const crumbs = ROUTE_MAP[currentPath] || [
    { label: 'Beranda', path: '/dashboard' },
    { label: currentPath.replace('/', '').toUpperCase() }
  ]

  return (
    <nav aria-label="Breadcrumb" className={styles.breadcrumbs}>
      <Link to="/dashboard" className={styles.item} title="Beranda">
        <Home size={12} />
      </Link>
      <span className={styles.separator}><ChevronRight size={11} /></span>

      {crumbs.map((crumb, idx) => {
        const isLast = idx === crumbs.length - 1
        return (
          <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {crumb.path && !isLast ? (
              <Link to={crumb.path} className={styles.item}>
                {crumb.label}
              </Link>
            ) : (
              <span className={`${styles.item} ${isLast ? styles.active : ''}`}>
                {crumb.label}
              </span>
            )}
            {!isLast && (
              <span className={styles.separator}><ChevronRight size={11} /></span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
