import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ConfirmProvider } from './context/ConfirmContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppShell from './components/AppShell'
import './index.css'

// Lazy-loaded pages for optimal bundle chunking and instant first load
const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Budget = lazy(() => import('./pages/Budget'))
const Classification = lazy(() => import('./pages/Classification'))
const Users = lazy(() => import('./pages/Users'))
const ItemMapping = lazy(() => import('./pages/ItemMapping'))
const Planning = lazy(() => import('./pages/Planning'))
const PrUpload = lazy(() => import('./pages/PrUpload'))
const PrHistory = lazy(() => import('./pages/PrHistory'))
const PrVerification = lazy(() => import('./pages/PrVerification'))
const EntertaintCost = lazy(() => import('./pages/EntertaintCost'))

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
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: {
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-lg)',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 500,
                fontFamily: 'Inter, -apple-system, sans-serif'
              },
              success: {
                iconTheme: {
                  primary: '#16a34a',
                  secondary: '#ffffff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#dc2626',
                  secondary: '#ffffff',
                },
              },
            }}
          />
          <ConfirmProvider>
            <AuthProvider>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                {/* public */}
                <Route path="/login" element={<Login />} />

                {/* protected — wrapped in sidebar shell */}
                <Route element={<AppShell />}>
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/budget" element={<ProtectedRoute roles={['admin']}><Budget /></ProtectedRoute>} />
                  <Route path="/classification" element={<ProtectedRoute><Classification /></ProtectedRoute>} />
                  <Route path="/users" element={<ProtectedRoute roles={['admin']}><Users /></ProtectedRoute>} />

                  {/* Master Data */}
                  <Route path="/master/item-mapping" element={<ProtectedRoute roles={['admin']}><ItemMapping /></ProtectedRoute>} />

                  {/* Planning */}
                  <Route path="/planning" element={<ProtectedRoute><Planning /></ProtectedRoute>} />
                  <Route path="/planning/upload" element={<Navigate to="/planning?tab=upload" replace />} />
                  <Route path="/planning/list" element={<Navigate to="/planning?tab=list" replace />} />

                  {/* PR */}
                  <Route path="/pr/upload" element={<ProtectedRoute roles={['admin']}><PrUpload /></ProtectedRoute>} />
                  <Route path="/pr/history" element={<ProtectedRoute><PrHistory /></ProtectedRoute>} />
                  <Route path="/pr/verification" element={<ProtectedRoute><PrVerification /></ProtectedRoute>} />
                  <Route path="/pr/result" element={<Navigate to="/pr/verification?tab=result" replace />} />
                  <Route path="/pr/mapping-review" element={<Navigate to="/pr/verification?tab=review" replace />} />
                  <Route path="/mapping/graph" element={<Navigate to="/pr/verification?tab=graph" replace />} />

                  {/* Operational QA / Expense Tracking */}
                  <Route path="/entertaint-cost" element={<ProtectedRoute><EntertaintCost /></ProtectedRoute>} />
                  <Route path="/entertaint" element={<Navigate to="/entertaint-cost" replace />} />
                  <Route path="/entertaint-analytics" element={<Navigate to="/entertaint-cost?tab=analytics" replace />} />
                </Route>

                {/* catch-all */}
                <Route path="*" element={<Navigate to="/dashboard" />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </ConfirmProvider>
      </BrowserRouter>
    </ThemeProvider>
  </QueryClientProvider>
)
}