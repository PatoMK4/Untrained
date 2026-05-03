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

export function useLastSession() {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['last_session', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('workout_sessions')
        .select('date, pain_flagged, pain_note')
        .eq('user_id', user!.id)
        .eq('status', 'completed')
        .order('date', { ascending: false })
        .limit(1)
        .single()
      return data
    },
    enabled: !!user,
  })
}

export function useLastWeekSummary() {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['last_week_summary', user?.id],
    queryFn: async () => {
      const now = new Date()
      const daysFromMonday = now.getDay() === 0 ? 6 : now.getDay() - 1
      const thisMonday = new Date(now)
      thisMonday.setDate(now.getDate() - daysFromMonday)
      const lastMonday = new Date(thisMonday)
      lastMonday.setDate(thisMonday.getDate() - 7)
      const { data } = await supabase
        .from('workout_sessions')
        .select('date, total_sets, total_reps, score_awarded, session_type')
        .eq('user_id', user!.id)
        .eq('status', 'completed')
        .gte('date', lastMonday.toISOString().split('T')[0])
        .lt('date', thisMonday.toISOString().split('T')[0])
      return data ?? []
    },
    enabled: !!user,
  })
}

export function useWeightHistory() {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['weight_history', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('body_logs')
        .select('weight, unit, logged_at')
        .eq('user_id', user!.id)
        .order('logged_at', { ascending: false })
        .limit(14)
      return (data ?? []) as { weight: number; unit: string; logged_at: string }[]
    },
    enabled: !!user,
  })
}