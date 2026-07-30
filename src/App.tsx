import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { SettingsProvider } from '@/contexts/SettingsContext'
import { AppLayout } from '@/components/layout/AppLayout'
import LoginPage from '@/pages/Login'
import DashboardPage from '@/pages/Dashboard'
import StudentsListPage from '@/pages/students/StudentsList'
import NewAdmissionPage from '@/pages/students/NewAdmission'
import StudentProfilePage from '@/pages/students/StudentProfile'
import CoursesPage from '@/pages/courses/CoursesPage'
import BatchesPage from '@/pages/batches/BatchesPage'
import FeesPage from '@/pages/fees/FeesPage'
import RecordPaymentPage from '@/pages/fees/RecordPayment'
import AttendancePage from '@/pages/attendance/AttendancePage'
import CertificatesPage from '@/pages/certificates/CertificatesPage'
import ReportsPage from '@/pages/reports/ReportsPage'
import SettingsPage from '@/pages/settings/SettingsPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SettingsProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<DashboardPage />} />

                {/* Students & Admissions */}
                <Route path="/admissions" element={<Navigate to="/admissions/new" replace />} />
                <Route path="/admissions/new" element={<NewAdmissionPage />} />
                <Route path="/students" element={<StudentsListPage />} />
                <Route path="/students/:id" element={<StudentProfilePage />} />
                <Route path="/students/:id/edit" element={<NewAdmissionPage />} />

                {/* Courses & Batches */}
                <Route path="/courses" element={<CoursesPage />} />
                <Route path="/batches" element={<BatchesPage />} />

                {/* Fees */}
                <Route path="/fees" element={<FeesPage />} />
                <Route path="/fees/pay/:studentId" element={<RecordPaymentPage />} />

                {/* Attendance */}
                <Route path="/attendance" element={<AttendancePage />} />

                {/* Certificates */}
                <Route path="/certificates" element={<CertificatesPage />} />

                {/* Reports */}
                <Route path="/reports" element={<ReportsPage />} />

                {/* Settings */}
                <Route path="/settings" element={<SettingsPage />} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>

          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              style: {
                fontFamily: 'Inter, sans-serif',
              },
            }}
          />
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
