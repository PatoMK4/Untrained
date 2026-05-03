import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wordmark } from '@/components/ui/Wordmark'
import { WorkoutPreview } from './WorkoutPreview'
import { ActiveSession } from './ActiveSession'
import { PostWorkout } from './PostWorkout'
import { RecoveryDay } from './RecoveryDay'
import {
  useExercises, useProgression, useUserProfile,
  useTodaySession, useCreateSession,
} from '@/hooks/useWorkout'
import { useLastSession } from '@/hooks/useScore'
import { useSessionStore } from '@/stores/sessionStore'
import { buildWorkout, getSessionType } from '@/lib/workoutEngine'
import type { TimeSlot, SplitPreference } from '@/lib/workoutEngine'
import type { MovementPattern, SessionType, Exercise, Readiness } from '@/types/app.types'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { useQuery, useQueryClient } from '@tanstack/react-query'

type View = 'preview' | 'active' | 'post' | 'recovery'

export default function TodayPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [view, setView] = useState<View>('preview')
  const [timeSlot, setTimeSlot] = useState<TimeSlot>(45)
  const [sessionJustCompleted, setSessionJustCompleted] = useState(false)

  const { data: exercises, isLoading: loadingEx } = useExercises()
  const { data: progressionMap, isLoading: loadingProg } = useProgression()
  const { data: profile, isLoading: loadingProfile } = useUserProfile()
  const { data: todaySession } = useTodaySession()
  const { data: lastSessionData } = useLastSession()
  const createSession = useCreateSession()
  const { startSession, isActive } = useSessionStore()

  const { data: completedSessionCount } = useQuery({
    queryKey: ['completed_session_count', user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('workout_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('status', 'completed')
      return count ?? 0
    },
    enabled: !!user,
  })

  // Comeback: 4+ days since last session
  const isComeback = useMemo(() => {
    if (!lastSessionData?.date) return false
    const daysDiff = (Date.now() - new Date(lastSessionData.date as string).getTime()) / 86400000
    return daysDiff >= 4
  }, [lastSessionData])

  // Pain follow-up: last session had pain flagged
  const painFollowUp = useMemo(() => {
    if (!lastSessionData) return null
    const rec = lastSessionData as Record<string, unknown>
    if (!rec.pain_flagged) return null
    const note = typeof rec.pain_note === 'string' && rec.pain_note
      ? rec.pain_note
      : 'the discomfort you mentioned'
    return { note }
  }, [lastSessionData])

  const splitPreference: SplitPreference = (profile?.split_preference as SplitPreference) ?? 'full_body'

  const effectiveProgressionMap = useMemo((): Record<MovementPattern, number> => {
    const p = profile as Record<string, number> | undefined
    return {
      push:  p?.level_push  ?? progressionMap?.push  ?? 1,
      pull:  p?.level_pull  ?? progressionMap?.pull  ?? 1,
      squat: p?.level_squat ?? progressionMap?.squat ?? 1,
      hinge: p?.level_hinge ?? progressionMap?.hinge ?? 1,
      core:  p?.level_core  ?? progressionMap?.core  ?? 1,
    }
  }, [profile, progressionMap])

  const sessionType: SessionType = useMemo(() => {
    if (!profile) return 'full_body'
    return getSessionType(
      profile.training_days, splitPreference,
      profile.created_at, completedSessionCount ?? 0
    )
  }, [profile, splitPreference, completedSessionCount])

  const isRestDay = sessionType === 'rest' || sessionType === 'active_recovery'

  const workout = useMemo(() => {
    if (!exercises || !profile || isRestDay) {
      return {
        warmup: [] as Exercise[], main: [] as Exercise[], cooldown: [] as Exercise[],
        config: { warmupCount: 3, cooldownCount: 3, setsPerExercise: 3, baseRestSeconds: 75, mainCount: 4, totalMinutes: 45 as number | null },
      }
    }
    return buildWorkout(
      sessionType, timeSlot, effectiveProgressionMap,
      profile.equipment ?? [], exercises as Exercise[]
    )
  }, [exercises, effectiveProgressionMap, profile, sessionType, timeSlot, isRestDay])

  const allExercises = useMemo(
    () => [...workout.warmup, ...workout.main, ...workout.cooldown],
    [workout]
  )

  useEffect(() => {
    if (sessionJustCompleted) return
    if (todaySession?.status === 'completed' && view !== 'post') setView('post')
    else if (todaySession?.status === 'in_progress' && isActive && view !== 'active') setView('active')
    else if (isRestDay && view === 'preview') setView('recovery')
  }, [todaySession, isActive, isRestDay, sessionJustCompleted])

  const isLoading = loadingEx || loadingProg || loadingProfile || completedSessionCount === undefined

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 pt-6">
        <Wordmark />
        <div className="flex flex-col gap-3 mt-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-surface rounded-card animate-pulse" />)}
        </div>
      </div>
    )
  }

  const handleStartSession = async (readiness: Readiness) => {
    if (allExercises.length === 0) return
    const dbTime: 30 | 45 | 60 = timeSlot === 'no_rush' ? 60 : timeSlot
    try {
      const session = await createSession.mutateAsync({ session_type: sessionType, time_available: dbTime })
      try {
        await supabase.from('workout_sessions').update({ readiness_score: readiness }).eq('id', session.id)
      } catch { /* column may not exist yet */ }
      startSession(session.id, allExercises, timeSlot, workout.config.setsPerExercise)
      setView('active')
    } catch (err) { console.error('Failed to create session:', err) }
  }

  const handleStartRecoverySession = async (recoveryExercises: Exercise[], setsPerExercise: number) => {
    try {
      const session = await createSession.mutateAsync({ session_type: 'active_recovery', time_available: 30 })
      startSession(session.id, recoveryExercises, 30, setsPerExercise)
      setView('active')
    } catch (err) { console.error('Failed to create recovery session:', err) }
  }

  const handleFullRest = async () => {
    if (user) {
      await supabase.from('workout_sessions').insert({
        user_id: user.id, date: new Date().toISOString().split('T')[0],
        session_type: 'rest', status: 'skipped', time_available: 30,
        total_sets: 0, total_reps: 0, pain_flagged: false, score_awarded: 0, exercises_completed: [],
      })
    }
    setSessionJustCompleted(true)
    setView('post')
  }

  const handlePainFollowUp = async (response: 'better' | 'same' | 'worse') => {
    if (!user || !lastSessionData) return
    try {
      const rec = lastSessionData as Record<string, unknown>
      await supabase.from('pain_logs').insert({
        user_id: user.id,
        session_id: null,
        pain_note: typeof rec.pain_note === 'string' ? rec.pain_note : 'unspecified',
        checkin_response: response,
        logged_at: new Date().toISOString(),
      })
      queryClient.invalidateQueries({ queryKey: ['last_session', user.id] })
    } catch { /* pain_logs table may not exist yet */ }
  }

  const handleSessionEnd = () => { setSessionJustCompleted(true); setView('post') }

  const handleDone = () => {
    setSessionJustCompleted(false)
    queryClient.invalidateQueries({ queryKey: ['last_session', user?.id] })
    queryClient.invalidateQueries({ queryKey: ['user_score', user?.id] })
    queryClient.invalidateQueries({ queryKey: ['session_history', user?.id] })
    setView(isRestDay ? 'recovery' : 'preview')
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'GOOD MORNING.' : hour < 17 ? 'GOOD AFTERNOON.' : 'GOOD EVENING.'

  return (
    <div className="flex flex-col pt-6">
      <AnimatePresence mode="wait">

        {view === 'recovery' && (
          <motion.div key="recovery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Wordmark />
            <h1 className="text-4xl font-black mt-2 mb-4">{greeting}</h1>
            <RecoveryDay onStartSession={handleStartRecoverySession} onFullRest={handleFullRest} />
          </motion.div>
        )}

        {view === 'preview' && (
          <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Wordmark />
            <h1 className="text-4xl font-black mt-2 mb-4">{greeting}</h1>
            {allExercises.length === 0 ? (
              <div className="bg-surface rounded-card p-5">
                <p className="text-text-secondary">No exercises found. Check Supabase exercise library.</p>
              </div>
            ) : (
              <WorkoutPreview
                sessionType={sessionType} timeSlot={timeSlot}
                warmup={workout.warmup} main={workout.main} cooldown={workout.cooldown}
                config={workout.config} onTimeChange={setTimeSlot}
                onStart={handleStartSession} isStarting={createSession.isPending}
                isComeback={isComeback} painFollowUp={painFollowUp}
                onPainFollowUp={handlePainFollowUp}
              />
            )}
          </motion.div>
        )}

        {view === 'active' && (
          <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ActiveSession onSessionEnd={handleSessionEnd} />
          </motion.div>
        )}

        {view === 'post' && (
          <motion.div key="post" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PostWorkout onDone={handleDone} />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}