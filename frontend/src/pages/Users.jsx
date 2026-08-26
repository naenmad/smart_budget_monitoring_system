import { useState, useEffect } from 'react'
import s from './Users.module.css'
import { userApi } from '../api/userApi'
import { useAuth } from '../context/AuthContext'
import { CheckCircle2, AlertCircle, Loader2, KeyRound, Eye, EyeOff, X } from 'lucide-react'

const USERNAME_REGEX = /^[a-z0-9_.-]{3,30}$/
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

  // Modal ubah password pengguna
  const [pwdModalUser, setPwdModalUser] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdError, setPwdError] = useState('')
  const [pwdFeedback, setPwdFeedback] = useState('')

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

  function handleUsernameChange(val) {
    // Otomatis lowercase dan hilangkan spasi
    const sanitized = val.toLowerCase().replace(/\s+/g, '')
    setForm(prev => ({ ...prev, username: sanitized }))
    
    if (errors.username) {
      setErrors(prev => ({ ...prev, username: '' }))
    }
  }

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  function validate() {
    const e = {}
    const trimmedUser = form.username.trim().toLowerCase()
    if (!trimmedUser) {
      e.username = 'Username wajib diisi'
    } else if (trimmedUser.length < 3) {
      e.username = 'Username minimal 3 karakter'
    } else if (trimmedUser.length > 30) {
      e.username = 'Username maksimal 30 karakter'
    } else if (!USERNAME_REGEX.test(trimmedUser)) {
      e.username = 'Hanya boleh huruf kecil, angka, titik (.), strip (-), atau underscore (_)'
    }

    if (!form.password.trim()) {
      e.password = 'Password wajib diisi'
    } else if (form.password.length < 6) {
      e.password = 'Password minimal 6 karakter'
    }
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
        username: form.username.trim().toLowerCase(),
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

  function openPasswordModal(u) {
    setPwdModalUser(u)
    setNewPassword('')
    setConfirmPassword('')
    setPwdError('')
    setPwdFeedback('')
    setShowNewPassword(false)
  }

  function closePasswordModal() {
    setPwdModalUser(null)
    setNewPassword('')
    setConfirmPassword('')
    setPwdError('')
    setPwdFeedback('')
  }

  async function handleSavePassword(e) {
    e.preventDefault()
    setPwdError('')
    setPwdFeedback('')

    if (!newPassword || newPassword.length < 6) {
      setPwdError('Password baru minimal 6 karakter')
      return
    }
    if (newPassword !== confirmPassword) {
      setPwdError('Konfirmasi password tidak cocok')
      return
    }

    setPwdSaving(true)
    try {
      const res = await userApi.update(pwdModalUser.id, {
        password: newPassword
      })
      if (res.success) {
        setPwdFeedback(`Password untuk "${pwdModalUser.username}" berhasil diubah!`)
        setTimeout(() => {
          closePasswordModal()
          setFeedback({ type: 'success', text: `Password untuk user "${pwdModalUser.username}" berhasil diperbarui.` })
        }, 900)
      } else {
        setPwdError(res.message || 'Gagal mengubah password')
      }
    } catch (err) {
      setPwdError(err.response?.data?.message || 'Gagal mengubah password')
    } finally {
      setPwdSaving(false)
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
              {feedback.type === 'success' ? (
                <CheckCircle2 size={15} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle', flexShrink: 0 }} />
              ) : (
                <AlertCircle size={15} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle', flexShrink: 0 }} />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          <form onSubmit={handleCreate} className={s.formGroup} noValidate>
            <div>
              <label className={s.label}>Username</label>
              <input
                className={`${s.input} ${errors.username ? s.inputError : ''}`}
                type="text"
                placeholder="contoh: budi_santoso"
                autoComplete="off"
                value={form.username}
                onChange={e => handleUsernameChange(e.target.value)}
              />
              <span className={s.helperText}>
                Huruf kecil, angka, dot, strip, atau underscore (3-30 karakter, tanpa spasi).
              </span>
              {errors.username && (
                <span className={s.errorText}>
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
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <span className={s.errorText}>
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
            <div className={s.loading}>
              <Loader2 size={16} className="animate-spin" style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
              Memuat...
            </div>
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
                    <th style={{ textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.id}>
                      <td style={{ color: 'var(--text-muted)', width: 28 }}>{i + 1}</td>
                      <td style={{ fontWeight: u.id === currentUser?.id ? 700 : 500, color: 'var(--text-main)' }}>
                        {u.username}
                        {u.id === currentUser?.id && (
                          <span style={{ fontSize: 10, color: 'var(--primary)', marginLeft: 6, fontWeight: 600 }}>
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
                        <div className={s.rowActions}>
                          <button
                            type="button"
                            className={s.pwdBtn}
                            onClick={() => openPasswordModal(u)}
                            title={`Ubah password ${u.username}`}
                          >
                            <KeyRound size={13} />
                            <span>Ubah Password</span>
                          </button>
                          <button
                            type="button"
                            className={s.deleteBtn}
                            onClick={() => handleDelete(u.id, u.username)}
                            disabled={deletingId === u.id || u.id === currentUser?.id}
                            title={u.id === currentUser?.id ? 'Tidak bisa menghapus akun sendiri' : 'Hapus user'}
                          >
                            {deletingId === u.id ? '...' : 'Hapus'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal Ubah Password Pengguna ── */}
      {pwdModalUser && (
        <div className={s.modalOverlay} onClick={closePasswordModal}>
          <div className={s.modalDialog} onClick={e => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <div>
                <h3 className={s.modalHeading}>Ubah Password Pengguna</h3>
                <p className={s.modalSub}>Reset password untuk akun <strong>{pwdModalUser.username}</strong> ({pwdModalUser.role})</p>
              </div>
              <button className={s.modalCloseBtn} onClick={closePasswordModal} type="button">
                <X size={18} />
              </button>
            </div>

            {pwdFeedback && (
              <div className={`${s.feedback} ${s.feedbackSuccess}`}>
                <CheckCircle2 size={15} />
                <span>{pwdFeedback}</span>
              </div>
            )}

            {pwdError && (
              <div className={`${s.feedback} ${s.feedbackError}`}>
                <AlertCircle size={15} />
                <span>{pwdError}</span>
              </div>
            )}

            <form onSubmit={handleSavePassword} className={s.modalForm}>
              <div>
                <label className={s.label}>Password Baru</label>
                <div className={s.passwordWrap}>
                  <input
                    className={s.input}
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Minimal 6 karakter"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    autoFocus
                  />
                  <button 
                    type="button" 
                    className={s.eyeBtn}
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    tabIndex="-1"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className={s.label}>Konfirmasi Password Baru</label>
                <input
                  className={s.input}
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Ulangi password baru"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
              </div>

              <div className={s.modalActions}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closePasswordModal}
                  disabled={pwdSaving}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={pwdSaving}
                >
                  {pwdSaving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    'Simpan Password'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
