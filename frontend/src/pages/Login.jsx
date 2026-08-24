import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/sai_logo.webp'
import s from './Login.module.css'
export default function Login() {
  const { user, login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // already logged in → go to dashboard
  if (user) return <Navigate to="/dashboard" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!username.trim() || !password.trim()) {
      setError('Username dan password wajib diisi')
      return
    }

    setLoading(true)

    try {
      const result = await login(username.trim(), password)
      if (!result.success) setError(result.message)
    } catch {
      setError('Terjadi kesalahan saat login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={s.page}>
      <div className={s.card}>
        <div className={s.logoWrap}>
          <img src={logo} alt="PT Summit Adyawinsa Indonesia" className={s.logoImg} />
          <h1 className={s.title}>Smart Budget Monitoring System</h1>
          <p className={s.subtitle}>
            PT Summit Adyawinsa Indonesia
          </p>
        </div>


        <form className={s.form} onSubmit={handleSubmit}>
          <div className={s.field}>
            <label className={s.label} htmlFor="login-username">Username</label>
            <input
              id="login-username"
              className={`${s.input} ${error ? s.inputError : ''}`}
              type="text"
              placeholder="Masukkan username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>

          <div className={s.field}>
            <label className={s.label} htmlFor="login-password">Password</label>
            <div className={s.passwordWrap}>
              <input
                id="login-password"
                className={`${s.input} ${error ? s.inputError : ''}`}
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
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className={s.error}>
              <span className={s.errorIcon}>⚠</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            className={s.submitBtn}
            disabled={loading}
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>

        <div className={s.footer}>
          Budget Monitoring &amp; QC System<br />
          © 2026 PT Summit Adyawinsa Indonesia
        </div>
      </div>
    </div>
  )
}
