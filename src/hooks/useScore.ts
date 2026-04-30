import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

export function useScore() {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['user_score', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_score')
        .select('*')
        .eq('user_id', user!.id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!user,
    staleTime: 1000 * 60,
  })
}

export function useSessionHistory() {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['session_history', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', user!.id)
        .eq('status', 'completed')
        .order('date', { ascending: false })
        .limit(30)
      if (error) throw error
      return data ?? []
    },
    enabled: !!user,
  })
}

export function useUserSettings() {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['user_settings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!user,
  })
}
