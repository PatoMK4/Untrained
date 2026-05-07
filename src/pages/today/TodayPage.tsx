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

type View = 'preview' | 'active' | 'post' | 'recovery' | 'done'

interface RecapRow {
  total_sets: number
  total_reps: number
  score_awarded: number
  session_type: string
  readiness_score: string | null
  post_reflection: string | null
  completed_at: string | null
}

export default function TodayPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [view, setView] = useState<View>('preview')
  const [timeSlot, setTimeSlot] = useState<TimeSlot>(45)
  const [sessionJustCompleted, setSessionJustCompleted] = useState(false)
  const [readiness, setReadiness] = useState<Readiness | null>(null)

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

  const todaySessionId = todaySession?.id ?? null
  const todaySessionCompleted = todaySession?.status === 'completed'

  const { data: todayRecap } = useQuery({
    queryKey: ['today_recap', user?.id, todaySessionId],
    queryFn: async () => {
      if (!todaySessionId) return null
      const { data } = await supabase
        .from('workout_sessions')
        .select('total_sets, total_reps, score_awarded, session_type, readiness_score, post_reflection, completed_at')
        .eq('id', todaySessionId)
        .single()
      return data as RecapRow | null
    },
    enabled: !!user && !!todaySessionId && todaySessionCompleted,
  })

  const isComeback = useMemo(() => {
    if (!lastSessionData?.date) return false
    const daysDiff = (Date.now() - new Date(lastSessionData.date as string).getTime()) / 86400000
    return daysDiff >= 4
  }, [lastSessionData])

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
        config: {
          warmupCount: 3, cooldownCount: 3, setsPerExercise: 3,
          baseRestSeconds: 75, mainCount: 4, totalMinutes: 45 as number | null,
        },
      }
    }
    const effectiveReadiness: Readiness | null = isComeback && !readiness ? 'tired' : readiness
    return buildWorkout(
      sessionType, timeSlot, effectiveProgressionMap,
      profile.equipment ?? [], exercises as Exercise[], effectiveReadiness
    )
  }, [exercises, effectiveProgressionMap, profile, sessionType, timeSlot, isRestDay, readiness, isComeback])

  const allExercises = useMemo(
    () => [...workout.warmup, ...workout.main, ...workout.cooldown],
    [workout]
  )

  useEffect(() => {
    if (sessionJustCompleted) return
    if (view === 'done') return
    if (todaySessionCompleted && view !== 'post' && view !== 'done') {
      setView('done')
    } else if (todaySession?.status === 'in_progress' && isActive && view !== 'active') {
      setView('active')
    } else if (isRestDay && view === 'preview') {
      setView('recovery')
    }
  }, [todaySession, todaySessionCompleted, isActive, isRestDay, sessionJustCompleted, view])

  const isLoading = loadingEx || loadingProg || loadingProfile || completedSessionCount === undefined

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 pt-6">
        <Wordmark />
        <div className="flex flex-col gap-3 mt-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-surface rounded-card animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const handleStartSession = async (selectedReadiness: Readiness) => {
    if (allExercises.length === 0) return
    setReadiness(selectedReadiness)
    const dbTime: 30 | 45 | 60 = timeSlot === 'no_rush' ? 60 : timeSlot
    try {
      const session = await createSession.mutateAsync({ session_type: sessionType, time_available: dbTime })
      try {
        await supabase
          .from('workout_sessions')
          .update({ readiness_score: selectedReadiness })
          .eq('id', session.id)
      } catch { /* column may not exist yet */ }
      sessionStorage.setItem('session_readiness', selectedReadiness)
      startSession(session.id, allExercises, timeSlot, workout.config.setsPerExercise)
      setView('active')
    } catch (err) { console.error('Failed to create session:', err) }
  }

  const handleStartRecoverySession = async (
    recoveryExercises: Exercise[],
    setsPerExercise: number
  ) => {
    try {
      const session = await createSession.mutateAsync({
        session_type: 'active_recovery', time_available: 30,
      })
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
    queryClient.invalidateQueries({ queryKey: ['today_session', user?.id] })
    setView('done')
  }

  const handlePainFollowUp = async (response: 'better' | 'same' | 'worse') => {
    if (!user || !lastSessionData) return
    try {
      const rec = lastSessionData as Record<string, unknown>
      await supabase.from('pain_logs').insert({
        user_id: user.id, session_id: null,
        pain_note: typeof rec.pain_note === 'string' ? rec.pain_note : 'unspecified',
        checkin_response: response, logged_at: new Date().toISOString(),
      })
      queryClient.invalidateQueries({ queryKey: ['last_session', user.id] })
    } catch { /* pain_logs may not exist yet */ }
  }

  const handleSessionEnd = () => { setSessionJustCompleted(true); setView('post') }

  const handleDone = () => {
    setSessionJustCompleted(true)
    setReadiness(null)
    sessionStorage.removeItem('session_readiness')
    queryClient.invalidateQueries({ queryKey: ['last_session', user?.id] })
    queryClient.invalidateQueries({ queryKey: ['user_score', user?.id] })
    queryClient.invalidateQueries({ queryKey: ['session_history', user?.id] })
    queryClient.invalidateQueries({ queryKey: ['completed_session_count', user?.id] })
    queryClient.invalidateQueries({ queryKey: ['today_recap', user?.id, todaySessionId] })
    setView('done')
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'GOOD MORNING.' : hour < 17 ? 'GOOD AFTERNOON.' : 'GOOD EVENING.'

  return (
    <div className="flex flex-col pt-6">
      <AnimatePresence mode="wait">

        {view === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-6"
          >
            <Wordmark />
            <div>
              <h1 className="text-4xl font-black text-text-primary">DONE FOR TODAY.</h1>
              <p className="text-text-secondary text-sm mt-1">Rest. Recover. Come back stronger.</p>
            </div>

            {todayRecap && (
              <div className="bg-surface rounded-card p-5 flex flex-col gap-4">
                <p className="text-text-disabled text-xs tracking-widest">TODAY'S SESSION</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-text-disabled text-xs">SETS</p>
                    <p className="text-text-primary font-black text-2xl">{todayRecap.total_sets}</p>
                  </div>
                  <div>
                    <p className="text-text-disabled text-xs">REPS</p>
                    <p className="text-text-primary font-black text-2xl">{todayRecap.total_reps}</p>
                  </div>
                  <div>
                    <p className="text-text-disabled text-xs">SCORE</p>
                    <p className="text-accent font-black text-2xl">+{todayRecap.score_awarded}</p>
                  </div>
                </div>
                {todayRecap.readiness_score && (
                  <p className="text-text-secondary text-sm">
                    Came in feeling{' '}
                    <span className="text-text-primary font-bold capitalize">
                      {todayRecap.readiness_score}
                    </span>
                  </p>
                )}
                {todayRecap.post_reflection && (
                  <p className="text-text-secondary text-sm">
                    Rated it{' '}
                    <span className="text-text-primary font-bold capitalize">
                      {todayRecap.post_reflection.replace(/_/g, ' ')}
                    </span>
                  </p>
                )}
              </div>
            )}

            <p className="text-text-disabled text-xs text-center">See you next session.</p>
          </motion.div>
        )}

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
                <p className="text-text-secondary">
                  No exercises found. Check Supabase exercise library.
                </p>
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