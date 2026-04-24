import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { SessionType, Exercise, ExerciseLog, MovementPattern } from '@/types/app.types'

// Fetch all exercises from the database
export function useExercises() {
  return useQuery({
    queryKey: ['exercises'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('progression_level')
      if (error) throw error
      return data as Exercise[]
    },
    staleTime: 1000 * 60 * 10, // exercises rarely change
  })
}

// Fetch user's progression levels for all movement patterns
export function useProgression() {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['user_progression', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_progression')
        .select('*')
        .eq('user_id', user!.id)
      if (error) throw error
      // Return as a map: { push: 1, pull: 2, ... }
      const map: Record<MovementPattern, number> = {
        push: 1,
        pull: 1,
        squat: 1,
        core: 1,
        hinge: 1,
      }
      for (const row of data ?? []) {
        map[row.movement_pattern as MovementPattern] = row.current_level
      }
      return map
    },
    enabled: !!user,
  })
}

// Fetch user profile (for training_days, equipment, etc.)
export function useUserProfile() {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['user_profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profile')
        .select('*')
        .eq('user_id', user!.id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!user,
  })
}

// Fetch today's session if one already exists
export function useTodaySession() {
  const { user } = useAuthStore()
  const today = new Date().toISOString().split('T')[0]
  return useQuery({
    queryKey: ['today_session', user?.id, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', user!.id)
        .eq('date', today)
        .not('status', 'eq', 'skipped')
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!user,
  })
}

// Get the last exercise logs for progression decisions
export function useRecentLogs(exerciseId: string | null) {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['recent_logs', user?.id, exerciseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercise_logs')
        .select('reps, effort, created_at')
        .eq('user_id', user!.id)
        .eq('exercise_id', exerciseId!)
        .eq('skipped', false)
        .order('created_at', { ascending: false })
        .limit(12)
      if (error) throw error
      return data ?? []
    },
    enabled: !!user && !!exerciseId,
  })
}

// Create a new workout session row
export function useCreateSession() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: {
      session_type: SessionType
      time_available: 30 | 45 | 60
    }) => {
      const today = new Date().toISOString().split('T')[0]
      const { data: session, error } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: user!.id,
          date: today,
          session_type: data.session_type,
          time_available: data.time_available,
          status: 'in_progress',
        })
        .select()
        .single()
      if (error) throw error
      return session
    },
    onSuccess: () => {
      const today = new Date().toISOString().split('T')[0]
      queryClient.invalidateQueries({ queryKey: ['today_session', user?.id, today] })
    },
  })
}

// Log a set to Supabase
export function useLogSet() {
  const { user } = useAuthStore()
  return useMutation({
    mutationFn: async (
      log: Omit<ExerciseLog, 'id' | 'user_id' | 'created_at'>
    ) => {
      const { error } = await supabase
        .from('exercise_logs')
        .insert({ ...log, user_id: user!.id })
      if (error) throw error
    },
  })
}

// Complete a session
export function useCompleteSession() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: {
      sessionId: string
      totalSets: number
      totalReps: number
      exercisesCompleted: string[]
      painNote?: string
      painFlagged: boolean
    }) => {
      const { error } = await supabase
        .from('workout_sessions')
        .update({
          status: 'completed',
          total_sets: data.totalSets,
          total_reps: data.totalReps,
          exercises_completed: data.exercisesCompleted,
          pain_note: data.painNote ?? null,
          pain_flagged: data.painFlagged,
          completed_at: new Date().toISOString(),
        })
        .eq('id', data.sessionId)
      if (error) throw error
    },
    onSuccess: () => {
      const today = new Date().toISOString().split('T')[0]
      queryClient.invalidateQueries({ queryKey: ['today_session', user?.id, today] })
      queryClient.invalidateQueries({ queryKey: ['user_score', user?.id] })
    },
  })
}

// Update progression level after session
export function useUpdateProgression() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: {
      movement_pattern: MovementPattern
      new_level: number
      sessions_at_level: number
    }) => {
      const { error } = await supabase
        .from('user_progression')
        .update({
          current_level: data.new_level,
          sessions_at_level: data.sessions_at_level,
          last_updated: new Date().toISOString(),
        })
        .eq('user_id', user!.id)
        .eq('movement_pattern', data.movement_pattern)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_progression', user?.id] })
    },
  })
}
