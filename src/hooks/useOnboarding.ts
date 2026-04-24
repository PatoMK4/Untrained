import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { OnboardingData } from '@/types/app.types'

export function useOnboarding() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submitOnboarding = async (data: OnboardingData) => {
    if (!user) return
    setLoading(true)
    setError(null)

    try {
      // 1. Write user profile
      // The row already exists (created during auth) — use UPDATE not upsert
      // to guarantee onboarding_complete is set on the correct row
      const profileData = {
        goal: data.goal ?? 'overall',
        training_days: data.training_days ?? 3,
        environment: data.environment ?? 'home',
        equipment: data.equipment ?? [],
        limitations: data.limitations ?? null,
        pushup_benchmark: data.pushup_benchmark ?? 0,
        pushup_effort: data.pushup_effort ?? 'medium',
        pullup_benchmark: data.pullup_benchmark ?? 0,
        pullup_effort: data.pullup_effort ?? 'medium',
        squat_benchmark: data.squat_benchmark ?? 0,
        squat_type: data.squat_type ?? 'jumps',
        squat_effort: data.squat_effort ?? 'medium',
        split_preference: data.split_preference ?? 'full_body',
        level_push:  data.level_push  ?? 1,
        level_pull:  data.level_pull  ?? 1,
        level_squat: data.level_squat ?? 1,
        level_hinge: data.level_hinge ?? 1,
        level_core:  data.level_core  ?? 1,
        onboarding_complete: true,
      }

      // Try UPDATE first — handles existing partial rows
      const { error: updateError, data: updatedRows } = await supabase
        .from('user_profile')
        .update(profileData)
        .eq('user_id', user.id)
        .select('id')

      // If nothing was updated, the row doesn't exist yet — insert it
      if (!updateError && (!updatedRows || updatedRows.length === 0)) {
        const { error: insertError } = await supabase
          .from('user_profile')
          .insert({ user_id: user.id, ...profileData })
        if (insertError) throw insertError
      } else if (updateError) {
        throw updateError
      }

      // 2. Initialize user score
      const { error: scoreError } = await supabase.from('user_score').upsert(
        {
          user_id: user.id,
          total_score: 0,
          weekly_score: 0,
          week_start: new Date().toISOString().split('T')[0],
          current_streak: 0,
          longest_streak: 0,
          total_sessions: 0,
          total_reps: 0,
        },
        { onConflict: 'user_id' }
      )
      if (scoreError) throw scoreError

      // 3. Initialize user settings
      const { error: settingsError } = await supabase.from('user_settings').upsert(
        {
          user_id: user.id,
          weight_unit: 'kg',
          ai_mode: 'smart',
          body_tracking_enabled: false,
          body_focus: 'maintain',
          body_tracking_prompt_count: 0,
        },
        { onConflict: 'user_id' }
      )
      if (settingsError) throw settingsError

      // 4. Initialize per-movement progression
      const { error: progressionError } = await supabase
        .from('user_progression')
        .upsert(
          [
            { user_id: user.id, movement_pattern: 'push',  current_level: data.level_push  ?? 1, sessions_at_level: 0, consecutive_easy: 0, consecutive_hard: 0 },
            { user_id: user.id, movement_pattern: 'pull',  current_level: data.level_pull  ?? 1, sessions_at_level: 0, consecutive_easy: 0, consecutive_hard: 0 },
            { user_id: user.id, movement_pattern: 'squat', current_level: data.level_squat ?? 1, sessions_at_level: 0, consecutive_easy: 0, consecutive_hard: 0 },
            { user_id: user.id, movement_pattern: 'hinge', current_level: data.level_hinge ?? 1, sessions_at_level: 0, consecutive_easy: 0, consecutive_hard: 0 },
            { user_id: user.id, movement_pattern: 'core',  current_level: data.level_core  ?? 1, sessions_at_level: 0, consecutive_easy: 0, consecutive_hard: 0 },
          ],
          { onConflict: 'user_id,movement_pattern' }
        )
      if (progressionError) throw progressionError

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Onboarding failed'
      setError(message)
      console.error('Onboarding error:', err)
      throw err // re-throw so OnboardingFlow doesn't navigate on failure
    } finally {
      setLoading(false)
    }
  }

  return { submitOnboarding, loading, error }
}