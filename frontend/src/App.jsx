import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppShell from './components/AppShell'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Predict from './pages/Predict'
import Budget from './pages/Budget'
import Classification from './pages/Classification'
import Users from './pages/Users'
import ItemMapping from './pages/ItemMapping'
import PlanningUpload from './pages/PlanningUpload'
import PlanningList from './pages/PlanningList'
import PrUpload from './pages/PrUpload'
import PrHistory from './pages/PrHistory'
import PrResult from './pages/PrResult'
import MappingReview from './pages/MappingReview'
import './index.css'

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
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  )
}