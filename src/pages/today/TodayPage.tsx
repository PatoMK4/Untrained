import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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

const mono: React.CSSProperties = {
  fontFamily: '"JetBrains Mono", ui-monospace, monospace',
  fontSize: 10,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
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
    return (Date.now() - new Date(lastSessionData.date as string).getTime()) / 86400000 >= 4
  }, [lastSessionData])

  const painFollowUp = useMemo(() => {
    if (!lastSessionData) return null
    const rec = lastSessionData as Record<string, unknown>
    if (!rec.pain_flagged) return null
    return { note: typeof rec.pain_note === 'string' && rec.pain_note ? rec.pain_note : 'the discomfort you mentioned' }
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
    return getSessionType(profile.training_days, splitPreference, profile.created_at, completedSessionCount ?? 0)
  }, [profile, splitPreference, completedSessionCount])

  const isRestDay = sessionType === 'rest' || sessionType === 'active_recovery'

  const workout = useMemo(() => {
    if (!exercises || !profile || isRestDay) {
      return {
        warmup: [] as Exercise[], main: [] as Exercise[], cooldown: [] as Exercise[],
        config: { warmupCount: 3, cooldownCount: 3, setsPerExercise: 3, baseRestSeconds: 75, mainCount: 4, totalMinutes: 45 as number | null },
      }
    }
    const effectiveReadiness: Readiness | null = isComeback && !readiness ? 'tired' : readiness
    return buildWorkout(sessionType, timeSlot, effectiveProgressionMap, profile.equipment ?? [], exercises as Exercise[], effectiveReadiness)
  }, [exercises, effectiveProgressionMap, profile, sessionType, timeSlot, isRestDay, readiness, isComeback])

  const allExercises = useMemo(() => [...workout.warmup, ...workout.main, ...workout.cooldown], [workout])

  useEffect(() => {
    if (sessionJustCompleted || view === 'done') return
    if (todaySessionCompleted && view !== 'post') setView('done')
    else if (todaySession?.status === 'in_progress' && isActive && view !== 'active') setView('active')
    else if (isRestDay && view === 'preview') setView('recovery')
  }, [todaySession, todaySessionCompleted, isActive, isRestDay, sessionJustCompleted, view])

  const isLoading = loadingEx || loadingProg || loadingProfile || completedSessionCount === undefined

  if (isLoading) {
    return (
      <div style={{ minHeight: '100dvh', background: '#050505', padding: '68px 24px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#c8ff00' }} className="ut-pulse" />
        <div style={{ height: 64, width: 200, background: '#131313', borderRadius: 2 }} />
        <div style={{ height: 12, width: 140, background: '#131313', borderRadius: 2, marginTop: 4 }} />
        <div style={{ height: 160, background: '#131313', borderRadius: 2, marginTop: 16 }} />
        <div style={{ height: 220, background: '#131313', borderRadius: 2 }} />
      </div>
    )
  }

  const handleStartSession = async (selectedReadiness: Readiness) => {
    if (allExercises.length === 0) return
    setReadiness(selectedReadiness)
    const dbTime: 30 | 45 | 60 = timeSlot === 'no_rush' ? 60 : timeSlot
    try {
      const session = await createSession.mutateAsync({ session_type: sessionType, time_available: dbTime })
      try { await supabase.from('workout_sessions').update({ readiness_score: selectedReadiness }).eq('id', session.id) } catch { /* ok */ }
      sessionStorage.setItem('session_readiness', selectedReadiness)
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
    } catch { /* ok */ }
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

  return (
    <div style={{ minHeight: '100dvh', background: '#050505' }}>
      <AnimatePresence mode="wait">

        {view === 'done' && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ padding: '68px 24px 0' }}>
            <div style={{
              fontFamily: '"JetBrains Mono", ui-monospace, monospace',
              fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
              color: '#c8ff00', marginBottom: 8,
            }}>● SESSION COMPLETE</div>
            <div style={{
              fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif',
              fontWeight: 800, fontSize: 110, lineHeight: 0.85,
              letterSpacing: '-0.025em', color: '#f4f4f3',
            }}>DONE.</div>

            {todayRecap && (
              <>
                <div style={{ marginTop: 32, display: 'flex', borderTop: '1px solid #242424', borderBottom: '1px solid #242424' }}>
                  {[
                    ['TIME', `${Math.floor((todayRecap.total_sets || 0) * 2.5)}:00`, 'MIN'],
                    ['VOL', String(todayRecap.total_sets), 'SETS'],
                    ['SCORE', `+${todayRecap.score_awarded}`, 'PTS'],
                  ].map(([k, v, u], i, a) => (
                    <div key={k} style={{ flex: 1, padding: '20px 16px', borderRight: i < a.length - 1 ? '1px solid #242424' : 'none' }}>
                      <div style={{ ...mono, color: '#8a8a86' }}>{k}</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 8 }}>
                        <span style={{
                          fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif',
                          fontWeight: 700, fontSize: 34,
                          color: k === 'SCORE' ? '#c8ff00' : '#f4f4f3',
                          letterSpacing: '-0.01em',
                        }}>{v}</span>
                        <span style={{ ...mono, color: '#8a8a86' }}>{u}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {todayRecap.post_reflection && (
                  <div style={{ marginTop: 24 }}>
                    <div style={{ ...mono, color: '#8a8a86', marginBottom: 6 }}>FEELING</div>
                    <div style={{
                      fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif',
                      fontWeight: 600, fontSize: 28, color: '#f4f4f3', letterSpacing: '0.01em',
                    }}>{todayRecap.post_reflection.replace(/_/g, ' ').toUpperCase()}</div>
                  </div>
                )}
              </>
            )}

            <div style={{ fontFamily: '"JetBrains Mono",ui-monospace,monospace', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5d5d5a', marginTop: 40 }}>See you next session.</div>
            </div>
          </motion.div>
        )}

        {view === 'recovery' && (
          <motion.div key="recovery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ padding: '68px 24px 0' }}>
              <RecoveryDay onStartSession={handleStartRecoverySession} onFullRest={handleFullRest} />
            </div>
          </motion.div>
        )}

        {view === 'preview' && (
          <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {allExercises.length === 0 ? (
              <div style={{ padding: '68px 24px 0' }}>
                <div style={{ padding: 16, border: '1px solid #242424', background: '#131313', borderRadius: 2, marginTop: 16 }}>
                  <span style={{ fontFamily: '"JetBrains Mono",ui-monospace,monospace', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8a8a86' }}>No exercises found. Check Supabase exercise library.</span>
                </div>
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
            <div style={{ padding: '16px 24px 0' }}>
              <ActiveSession onSessionEnd={handleSessionEnd} />
            </div>
          </motion.div>
        )}

        {view === 'post' && (
          <motion.div key="post" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ padding: '68px 24px 0' }}>
              <PostWorkout onDone={handleDone} />
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}

