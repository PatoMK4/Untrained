import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { AppShell } from '@/components/layout/AppShell'
import { AuthPage } from '@/pages/AuthPage'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import TodayPage from '@/pages/today/TodayPage'
import ProgressPage from '@/pages/progress/ProgressPage'
import ProfilePage from '@/pages/profile/ProfilePage'
import ProgramPage from '@/pages/program/ProgramPage'
import CoachPage from '@/pages/coach/CoachPage'
import OnboardingFlow from '@/pages/onboarding/OnboardingFlow'
import { EmailConfirmedPage } from '@/pages/EmailConfirmedPage'

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <span className="text-2xl font-black tracking-widest text-text-primary">
        UNTR<span className="text-accent">A</span>INED
      </span>
    </div>
  )
}

function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine)
  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  if (!offline) return null
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-warning text-navbar text-xs font-bold text-center py-2 tracking-widest">
      NO CONNECTION — some features may not work
    </div>
  )
}

function useOnboardingGate() {
  const { user } = useAuthStore()
  const { data: profile, isLoading } = useQuery({
    queryKey: ['user_profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profile')
        .select('onboarding_complete')
        .eq('user_id', user!.id)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!user,
  })
  return {
    needsOnboarding: !isLoading && (!profile || !profile.onboarding_complete),
    isLoading,
  }
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()
  const { needsOnboarding, isLoading: profileLoading } = useOnboardingGate()
  if (loading || profileLoading) return <LoadingScreen />
  if (!user) return <Navigate to="/auth" replace />
  if (needsOnboarding) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

export default function App() {
  const { user, loading } = useAuthStore()
  if (loading) return <LoadingScreen />

  return (
    <ErrorBoundary>
      <OfflineBanner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/auth/confirmed" element={<EmailConfirmedPage />} />
          <Route
            path="/onboarding"
            element={user ? <OnboardingFlow /> : <Navigate to="/auth" replace />}
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<TodayPage />} />
            <Route path="program" element={<ProgramPage />} />
            <Route path="coach" element={<CoachPage />} />
            <Route path="progress" element={<ProgressPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}