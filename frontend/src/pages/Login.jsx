import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AlertCircle, User, Lock, Eye, EyeOff, Loader2, HelpCircle, ShieldCheck, X, PhoneCall, Mail } from 'lucide-react'
import logo from '../assets/sai_logo.webp'
import s from './Login.module.css'

export default function Login() {
  const { user, login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)

  // already logged in → go to dashboard
  if (user) return <Navigate to="/dashboard" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const cleanUsername = username.trim().toLowerCase()
    if (!cleanUsername || !password.trim()) {
      setError('Username dan password wajib diisi')
      return
    }

    setLoading(true)

    try {
      const result = await login(cleanUsername, password)
      if (!result.success) setError(result.message || 'Username atau password salah')
    } catch {
      setError('Terjadi kesalahan koneksi ke server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={s.page}>
      <div className={s.container}>
        <div className={s.card}>
          {/* Logo & Header */}
          <div className={s.logoWrap}>
            <div className={s.logoBadge}>
              <img src={logo} alt="PT Summit Adyawinsa Indonesia" className={s.logoImg} />
            </div>
            <div className={s.systemBadge}>
              <ShieldCheck size={13} />
              <span>Smart Budget &amp; QC System</span>
            </div>
            <h1 className={s.title}>Selamat Datang</h1>
            <p className={s.subtitle}>
              PT Summit Adyawinsa Indonesia
            </p>
          </div>

          {/* Form */}
          <form className={s.form} onSubmit={handleSubmit} noValidate>
            <div className={s.field}>
              <label className={s.label} htmlFor="login-username">Username</label>
              <div className={s.inputWrap}>
                <span className={s.inputIcon}>
                  <User size={16} />
                </span>
                <input
                  id="login-username"
                  className={`${s.input} ${error ? s.inputError : ''}`}
                  type="text"
                  placeholder="Masukkan username"
                  autoComplete="username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className={s.field}>
              <div className={s.labelRow}>
                <label className={s.label} htmlFor="login-password">Password</label>
                <button
                  type="button"
                  className={s.forgotBtn}
                  onClick={() => setShowHelpModal(true)}
                  tabIndex="-1"
                >
                  Lupa password?
                </button>
              </div>
              <div className={s.inputWrap}>
                <span className={s.inputIcon}>
                  <Lock size={16} />
                </span>
                <input
                  id="login-password"
                  className={`${s.input} ${s.inputPassword} ${error ? s.inputError : ''}`}
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan password"
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
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
            </div>

            {error && (
              <div className={s.error}>
                <AlertCircle size={16} className={s.errorIcon} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className={s.submitBtn}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Memproses masuk...</span>
                </>
              ) : (
                <span>Masuk ke Sistem</span>
              )}
            </button>
          </form>

          {/* Footer Info */}
          <div className={s.footer}>
            <p className={s.footerText}>
              Budget Monitoring &amp; QC Classification System<br />
              &copy; {new Date().getFullYear()} PT Summit Adyawinsa Indonesia. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Modal Bantuan / Lupa Password */}
      {showHelpModal && (
        <div className={s.modalOverlay} onClick={() => setShowHelpModal(false)}>
          <div className={s.modalDialog} onClick={e => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <div className={s.modalHeaderLeft}>
                <div className={s.helpIconWrap}>
                  <HelpCircle size={20} />
                </div>
                <div>
                  <h3 className={s.modalTitle}>Bantuan Lupa Password</h3>
                  <p className={s.modalSub}>Prosedur reset akun &amp; akses sistem</p>
                </div>
              </div>
              <button
                className={s.modalCloseBtn}
                onClick={() => setShowHelpModal(false)}
                type="button"
                aria-label="Tutup dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className={s.modalBody}>
              <p className={s.modalText}>
                Untuk menjaga keamanan data dan kontrol anggaran perusahaan, penggantian atau reset password dilakukan terpusat oleh <strong>Administrator Sistem</strong>.
              </p>

              {/* Dinonaktifkan karena kontak belum pasti */}
              {/* <div className={s.contactCard}>
                <div className={s.contactRow}>
                  <PhoneCall size={16} className={s.contactIcon} />
                  <div>
                    <strong>IT Support / Administrator</strong>
                    <p>Ext. 104 / 105 (Internal PT SAI)</p>
                  </div>
                </div>
                <div className={s.contactRow}>
                  <Mail size={16} className={s.contactIcon} />
                  <div>
                    <strong>Email Helpdesk</strong>
                    <p>it.support@summitadyawinsa.co.id</p>
                  </div>
                </div>
              </div> */}

              <div className={s.noteBox}>
                Sampaikan nama lengkap, username akun, dan departemen Anda kepada Admin untuk proses reset password.
              </div>
            </div>

            <div className={s.modalFooter}>
              <button
                type="button"
                className="btn-primary"
                style={{ width: '100%' }}
                onClick={() => setShowHelpModal(false)}
              >
                Mengerti &amp; Kembali
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
