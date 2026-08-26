import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor — sisipkan token JWT ke tiap request kalau ada
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor for consistent error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'Terjadi kesalahan pada server'

    console.error('[API Error]', {
      url: error.config?.url,
      status: error.response?.status,
      message,
    })

    // Token invalid/kadaluarsa — bersihkan sesi dan lempar ke login,
    // daripada user lihat error mentah atau nyangkut di halaman protected
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      sessionStorage.removeItem('sai_qc_user')
      window.location.href = '/login'
    }

    return Promise.reject(error)
  },
)

export default api