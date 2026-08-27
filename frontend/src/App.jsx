import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppShell from './components/AppShell'
import './index.css'

// Lazy-loaded pages for optimal bundle chunking and instant first load
const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Predict = lazy(() => import('./pages/Predict'))
const Budget = lazy(() => import('./pages/Budget'))
const Classification = lazy(() => import('./pages/Classification'))
const Users = lazy(() => import('./pages/Users'))
const ItemMapping = lazy(() => import('./pages/ItemMapping'))
const PlanningUpload = lazy(() => import('./pages/PlanningUpload'))
const PlanningList = lazy(() => import('./pages/PlanningList'))
const PrUpload = lazy(() => import('./pages/PrUpload'))
const PrHistory = lazy(() => import('./pages/PrHistory'))
const PrResult = lazy(() => import('./pages/PrResult'))
const MappingReview = lazy(() => import('./pages/MappingReview'))

function PageLoader() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '50vh',
      gap: 12,
      color: 'var(--text-muted)'
    }}>
      <Loader2 size={28} className="animate-spin" style={{ color: 'var(--primary)' }} />
      <span style={{ fontSize: '13px', fontWeight: 500 }}>Memuat halaman...</span>
    </div>
  )
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <Toaster position="top-right" />
          <AuthProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* public */}
                <Route path="/login" element={<Login />} />

                {/* protected — wrapped in sidebar shell */}
                <Route element={<AppShell />}>
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/predict" element={<ProtectedRoute roles={['admin']}><Predict /></ProtectedRoute>} />
                  <Route path="/budget" element={<ProtectedRoute roles={['admin']}><Budget /></ProtectedRoute>} />
                  <Route path="/classification" element={<ProtectedRoute><Classification /></ProtectedRoute>} />
                  <Route path="/users" element={<ProtectedRoute roles={['admin']}><Users /></ProtectedRoute>} />

                  {/* Master Data */}
                  <Route path="/master/item-mapping" element={<ProtectedRoute roles={['admin']}><ItemMapping /></ProtectedRoute>} />

                  {/* Planning */}
                  <Route path="/planning/upload" element={<ProtectedRoute roles={['admin']}><PlanningUpload /></ProtectedRoute>} />
                  <Route path="/planning/list" element={<ProtectedRoute><PlanningList /></ProtectedRoute>} />

                  {/* PR */}
                  <Route path="/pr/upload" element={<ProtectedRoute roles={['admin']}><PrUpload /></ProtectedRoute>} />
                  <Route path="/pr/history" element={<ProtectedRoute><PrHistory /></ProtectedRoute>} />
                  <Route path="/pr/result" element={<ProtectedRoute><PrResult /></ProtectedRoute>} />
                  <Route path="/pr/mapping-review" element={<ProtectedRoute><MappingReview /></ProtectedRoute>} />
                </Route>

                {/* catch-all */}
                <Route path="*" element={<Navigate to="/dashboard" />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  )
}