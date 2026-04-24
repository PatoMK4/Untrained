import { useAuthStore } from '@/stores/authStore'

export function useAuth() {
  const { user, session, loading, signOut } = useAuthStore()
  return { user, session, loading, signOut, isAuthenticated: !!user }
}
