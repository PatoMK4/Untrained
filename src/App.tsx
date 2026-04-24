import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { AppShell } from '@/components/layout/AppShell'
import { AuthPage } from '@/pages/AuthPage'
import TodayPage from '@/pages/today/TodayPage'
import { ProgressPlaceholder } from '@/pages/placeholders/ProgressPlaceholder'
import { ProfilePlaceholder } from '@/pages/placeholders/ProfilePlaceholder'
import { OnboardingFlow } from '@/pages/onboarding/OnboardingFlow'

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <span className="text-2xl font-black tracking-widest text-text-primary">
        UNTR<span className="text-accent">A</span>INED
      </span>
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
    needsOnboarding:
      !isLoading && (!profile || !profile.onboarding_complete),
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
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/onboarding"
          element={
            user ? <OnboardingFlow /> : <Navigate to="/auth" replace />
          }
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
          <Route path="progress" element={<ProgressPlaceholder />} />
          <Route path="profile" element={<ProfilePlaceholder />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
