import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ShieldAlert } from 'lucide-react'

/**
 * ProtectedRoute — guards routes behind authentication and optional role check.
 *
 * @param {Object}  props
 * @param {React.ReactNode} props.children    — the page to render
 * @param {string[]}        [props.roles]     — allowed roles (omit = any authenticated user)
 */
export default function ProtectedRoute({ children, roles }) {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" replace />

  if (roles && !roles.includes(user.role)) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', gap: 12, padding: 40,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: '#FEF2F2', display: 'flex', alignItems: 'center',
          justifyContent: 'center',
        }}>
          <ShieldAlert size={28} color="#ef4444" />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
          Akses Ditolak
        </h2>
        <p style={{ fontSize: 13, color: '#73726c', margin: 0, textAlign: 'center' }}>
          Anda tidak memiliki izin untuk mengakses halaman ini.
          <br />Silakan hubungi administrator.
        </p>
      </div>
    )
  }

  return children
}
