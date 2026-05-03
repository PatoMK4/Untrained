import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { OnboardingData } from '@/types/app.types'

import { GoalStep } from './steps/GoalStep'
import { FrequencyStep } from './steps/FrequencyStep'
import { EnvironmentStep } from './steps/EnvironmentStep'
import { EquipmentStep } from './steps/EquipmentStep'
import { SplitPreferenceStep } from './steps/SplitPreferenceStep'
import { LimitationsStep } from './steps/LimitationsStep'
import { BenchmarkIntro } from './steps/BenchmarkIntro'
import { PushupBenchmark } from './steps/PushupBenchmark'
import { PullupBenchmark } from './steps/PullupBenchmark'
import { SquatBenchmark } from './steps/SquatBenchmark'
import { FitnessLevelStep } from './steps/FitnessLevelStep'
import { OnboardingComplete } from './steps/OnboardingComplete'

const NO_DOT_STEPS = new Set([6])
const TOTAL_DOTS = 11

export default function OnboardingFlow() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
  const [data, setData] = useState<OnboardingData>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const steps = [
    GoalStep, FrequencyStep, EnvironmentStep, EquipmentStep,
    SplitPreferenceStep, LimitationsStep, BenchmarkIntro,
    PushupBenchmark, PullupBenchmark, SquatBenchmark,
    FitnessLevelStep, OnboardingComplete,
  ]

  const handleNext = (stepData: Partial<OnboardingData>) => {
    const merged = { ...data, ...stepData }
    setData(merged)
    if (step === steps.length - 1) {
      handleSubmit(merged)
    } else {
      setStep(s => s + 1)
    }
  }

  const handleBack = () => { if (step > 0) setStep(s => s - 1) }

  const handleSubmit = async (finalData: OnboardingData) => {
    if (!user) return
    setSubmitting(true)
    setSubmitError(null)

    try {
      // 1. Save user profile
      const { error: profileError } = await supabase
        .from('user_profile')
        .upsert({
          user_id: user.id,
          goal: finalData.goal ?? 'overall',
          training_days: finalData.training_days ?? 3,
          environment: finalData.environment ?? 'home',
          equipment: finalData.equipment ?? [],
          limitations: finalData.limitations ?? null,
          pushup_benchmark: finalData.pushup_benchmark ?? 0,
          pushup_effort: finalData.pushup_effort ?? 'medium',
          pullup_benchmark: finalData.pullup_benchmark ?? 0,
          pullup_effort: finalData.pullup_effort ?? 'medium',
          squat_benchmark: finalData.squat_benchmark ?? 0,
          squat_type: finalData.squat_type ?? 'jumps',
          squat_effort: finalData.squat_effort ?? 'medium',
          split_preference: finalData.split_preference ?? 'full_body',
          level_push: finalData.level_push ?? 1,
          level_pull: finalData.level_pull ?? 1,
          level_squat: finalData.level_squat ?? 1,
          level_hinge: finalData.level_hinge ?? 1,
          level_core: finalData.level_core ?? 1,
          onboarding_complete: true,
        })
      if (profileError) throw profileError

      // 2. Initialise score row with all required columns
      // Try new column names first, fall back to old ones
      const { error: scoreError } = await supabase
        .from('user_score')
        .upsert({
          user_id: user.id,
          total_exp: 0,
          weekly_exp: 0,
          week_start: new Date().toISOString().split('T')[0],
          current_streak: 0,
          longest_streak: 0,
          total_sessions: 0,
          total_reps: 0,
          user_level: 1,
          user_level_title: 'Untrained',
        }, { onConflict: 'user_id' })

      // If new columns don't exist yet, fall back to old schema
      if (scoreError) {
        await supabase
          .from('user_score')
          .upsert({ user_id: user.id }, { onConflict: 'user_id' })
      }

      // 3. Initialise settings
      const { error: settingsError } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          weight_unit: 'kg',
          ai_mode: 'lite',
        }, { onConflict: 'user_id' })
      if (settingsError) console.error('Settings init error:', settingsError)

      // 4. Initialise progression for all 5 patterns
      const { error: progressionError } = await supabase
        .from('user_progression')
        .upsert(
          [
            { user_id: user.id, movement_pattern: 'push',  current_level: finalData.level_push  ?? 1, sessions_at_level: 0, consecutive_easy: 0, consecutive_hard: 0 },
            { user_id: user.id, movement_pattern: 'pull',  current_level: finalData.level_pull  ?? 1, sessions_at_level: 0, consecutive_easy: 0, consecutive_hard: 0 },
            { user_id: user.id, movement_pattern: 'squat', current_level: finalData.level_squat ?? 1, sessions_at_level: 0, consecutive_easy: 0, consecutive_hard: 0 },
            { user_id: user.id, movement_pattern: 'hinge', current_level: finalData.level_hinge ?? 1, sessions_at_level: 0, consecutive_easy: 0, consecutive_hard: 0 },
            { user_id: user.id, movement_pattern: 'core',  current_level: finalData.level_core  ?? 1, sessions_at_level: 0, consecutive_easy: 0, consecutive_hard: 0 },
          ],
          { onConflict: 'user_id,movement_pattern' }
        )
      if (progressionError) console.error('Progression init error:', progressionError)

      await queryClient.invalidateQueries({ queryKey: ['user_profile', user.id] })
      await queryClient.refetchQueries({ queryKey: ['user_profile', user.id] })

      navigate('/', { replace: true })
    } catch (err) {
      console.error('Onboarding submit failed:', err)
      setSubmitError('Something went wrong saving your profile. Please try again.')
      setSubmitting(false)
    }
  }

  const getDotIndex = () => {
    if (NO_DOT_STEPS.has(step)) return -1
    let dotIndex = step
    for (const noStep of NO_DOT_STEPS) {
      if (noStep < step) dotIndex--
    }
    return dotIndex
  }

  const dotIndex = getDotIndex()
  const CurrentStep = steps[step]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {!NO_DOT_STEPS.has(step) && (
        <div className="flex justify-center gap-1.5 pt-6 px-4">
          {Array.from({ length: TOTAL_DOTS }).map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === dotIndex ? 'w-6 bg-accent'
                : i < dotIndex ? 'w-3 bg-text-secondary'
                : 'w-3 bg-surface-raised'
              }`}
            />
          ))}
        </div>
      )}

      {submitError && (
        <div className="mx-4 mt-4 p-3 bg-surface border border-danger rounded-card">
          <p className="text-danger text-sm">{submitError}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <CurrentStep
          onNext={handleNext}
          onBack={step > 0 ? handleBack : undefined}
          data={data}
          submitting={submitting}
        />
      </div>
    </div>
  )
}