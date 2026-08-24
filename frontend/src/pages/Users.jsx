import { useState, useEffect } from 'react'
import s from './Users.module.css'
import { userApi } from '../api/userApi'
import { useAuth } from '../context/AuthContext'

const EMPTY_FORM = { username: '', password: '', role: 'admin' }

export default function Users() {
  const { user: currentUser } = useAuth()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [feedback, setFeedback] = useState({ type: '', text: '' })
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    setLoading(true)
    try {
      const res = await userApi.getAll()
      if (res.success) setUsers(res.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  function validate() {
    const e = {}
    if (!form.username.trim()) e.username = 'Username wajib diisi'
    else if (form.username.trim().length < 3) e.username = 'Minimal 3 karakter'
    if (!form.password.trim()) e.password = 'Password wajib diisi'
    else if (form.password.length < 6) e.password = 'Minimal 6 karakter'
    return e
  }

  async function handleCreate(e) {
    e.preventDefault()
    setFeedback({ type: '', text: '' })
    const e2 = validate()
    if (Object.keys(e2).length > 0) { setErrors(e2); return }

    setSaving(true)
    try {
      const res = await userApi.create({
        username: form.username.trim(),
        password: form.password,
        role: form.role,
      })

      if (res.success) {
        setFeedback({ type: 'success', text: `User "${res.data.username}" berhasil dibuat` })
        setForm(EMPTY_FORM)
        setErrors({})
        await fetchUsers()
      } else {
        setFeedback({ type: 'error', text: res.message || 'Gagal membuat user' })
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.response?.data?.message || 'Gagal membuat user' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id, username) {
    if (id === currentUser?.id) {
      setFeedback({ type: 'error', text: 'Tidak bisa menghapus akun sendiri' })
      return
    }
    if (!confirm(`Hapus user "${username}"? Tindakan ini tidak bisa dibatalkan.`)) return

    setDeletingId(id)
    try {
      const res = await userApi.delete(id)
      if (res.success) {
        setFeedback({ type: 'success', text: `User "${username}" berhasil dihapus` })
        await fetchUsers()
      } else {
        setFeedback({ type: 'error', text: res.message || 'Gagal menghapus user' })
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.response?.data?.message || 'Gagal menghapus user' })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1>Manajemen Akun</h1>
        <p>Buat dan kelola akun pengguna sistem</p>
      </div>

      <div className={s.grid}>
        {/* ── Create form ── */}
        <div className={s.card}>
          <div className={s.cardTitle}>Buat akun baru</div>

          {feedback.text && (
            <div className={`${s.feedback} ${feedback.type === 'success' ? s.feedbackSuccess : s.feedbackError}`}>
              {feedback.type === 'success' ? '✓' : '⚠'} {feedback.text}
            </div>
          )}

          <form onSubmit={handleCreate} className={s.formGroup} noValidate>
            <div>
              <label className={s.label}>Username</label>
              <input
                className={`${s.input} ${errors.username ? s.inputError : ''}`}
                type="text"
                placeholder="Contoh: budi.santoso"
                autoComplete="off"
                value={form.username}
                onChange={e => handleChange('username', e.target.value)}
              />
              {errors.username && (
                <span style={{ fontSize: 11, color: '#e85d3a', marginTop: 3, display: 'block' }}>
                  {errors.username}
                </span>
              )}
            </div>

            <div>
              <label className={s.label}>Password</label>
              <div className={s.passwordWrap}>
                <input
                  className={`${s.input} ${errors.password ? s.inputError : ''}`}
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimal 6 karakter"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={e => handleChange('password', e.target.value)}
                />
                <button 
                  type="button" 
                  className={s.eyeBtn}
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <span style={{ fontSize: 11, color: '#e85d3a', marginTop: 3, display: 'block' }}>
                  {errors.password}
                </span>
              )}
            </div>

            <div>
              <label className={s.label}>Role</label>
              <select
                className={s.select}
                value={form.role}
                onChange={e => handleChange('role', e.target.value)}
              >
                <option value="admin">Admin — Akses Penuh</option>
                <option value="manager">Manager — View + Klasifikasi</option>
              </select>
            </div>

            <div className={s.actions}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => { setForm(EMPTY_FORM); setErrors({}); setFeedback({ type: '', text: '' }) }}
              >
                Reset
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Menyimpan...' : '+ Buat akun'}
              </button>
            </div>
          </form>
        </div>

        {/* ── User list ── */}
        <div className={s.card}>
          <div className={s.cardTitle}>
            Daftar pengguna ({users.length})
          </div>

          {loading ? (
            <div className={s.loading}>⏳ Memuat...</div>
          ) : users.length === 0 ? (
            <div className={s.emptyState}>Belum ada pengguna</div>
          ) : (
            <div className={s.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.id}>
                      <td style={{ color: '#73726c', width: 28 }}>{i + 1}</td>
                      <td style={{ fontWeight: u.id === currentUser?.id ? 600 : 400 }}>
                        {u.username}
                        {u.id === currentUser?.id && (
                          <span style={{ fontSize: 10, color: '#73726c', marginLeft: 6, fontWeight: 400 }}>
                            (Anda)
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`${s.roleBadge} ${u.role === 'admin' ? s.roleAdmin : s.roleManager}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <span className={s.statusDot}>
                          <span className={`${s.dot} ${u.is_active ? s.dotActive : s.dotInactive}`} />
                          {u.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td>
                        <button
                          className={s.deleteBtn}
                          onClick={() => handleDelete(u.id, u.username)}
                          disabled={deletingId === u.id || u.id === currentUser?.id}
                          title={u.id === currentUser?.id ? 'Tidak bisa menghapus akun sendiri' : 'Hapus user'}
                        >
                          {deletingId === u.id ? '...' : 'Hapus'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
