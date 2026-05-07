import { useMemo, useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SetLogger } from '@/components/workout/SetLogger'
import { Button } from '@/components/ui/Button'
import { useSessionStore } from '@/stores/sessionStore'
import { useLogSet, useRecentLogs, useExercises } from '@/hooks/useWorkout'
import { calculateRestSeconds } from '@/lib/workoutEngine'
import type { Effort, MovementPattern, Exercise } from '@/types/app.types'
import { ChatPanel } from '@/components/chat/ChatPanel'

interface Props {
  onSessionEnd: () => void
}

// Calorie burn: only counts actual exercise time, not rest or paused time
// ~8 kcal/min during bodyweight exercise (conservative estimate)
const KCAL_PER_ACTIVE_SECOND = 8 / 60

function useElapsedTime(startedAt: Date | null, isPaused: boolean, totalPausedMs: number): string {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!startedAt) return
    const interval = setInterval(() => {
      if (!isPaused) {
        setElapsed(Math.floor((Date.now() - startedAt.getTime() - totalPausedMs) / 1000))
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [startedAt, isPaused, totalPausedMs])
  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function CircularTimer({ seconds, total, onDismiss, onComplete }: {
  seconds: number
  total: number
  onDismiss: () => void
  onComplete: () => void
}) {
  const [remaining, setRemaining] = useState(seconds)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setRemaining(seconds)
  }, [seconds])

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(intervalRef.current!)
          onComplete()
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current!)
  }, [seconds, onComplete])

  const progress = remaining / total
  const circumference = 2 * Math.PI * 54
  const strokeDashoffset = circumference * (1 - progress)

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#242424" strokeWidth="8" />
          <circle
            cx="60" cy="60" r="54" fill="none"
            stroke="#C8FF00" strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-text-primary font-mono">
            {mins > 0 ? `${mins}:${secs.toString().padStart(2,'0')}` : `${secs}`}
          </span>
          <span className="text-text-disabled text-xs tracking-widest">REST</span>
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="h-10 px-6 bg-surface-raised rounded-pill text-text-secondary text-xs font-bold tracking-widest active:brightness-110"
      >
        SKIP REST
      </button>
    </div>
  )
}

export function ActiveSession({ onSessionEnd }: Props) {
  const {
    exercises, currentExerciseIndex, currentSetNumber, totalSets,
    timeSlot, showRestTimer, sessionId, logs, startedAt,
    isPaused, totalPausedMs, activeExerciseSeconds,
    logSet, nextSet, nextExercise, setShowRestTimer,
    lastEffortByExercise, consecutiveHardByExercise,
    pauseSession, resumeSession, addActiveSeconds,
  } = useSessionStore()

  const [showCue, setShowCue] = useState(false)
  const [showSwap, setShowSwap] = useState(false)
  const [swappedExercises, setSwappedExercises] = useState<Record<number, Exercise>>({})
  const [restTotal, setRestTotal] = useState(75)

  const logSetMutation = useLogSet()
  const { data: allExercises } = useExercises()
  const elapsedTime = useElapsedTime(startedAt, isPaused, totalPausedMs)

  // Track active exercise seconds for calorie counting (tick every second when not in rest and not paused)
  useEffect(() => {
    if (showRestTimer || isPaused || !startedAt) return
    const interval = setInterval(() => addActiveSeconds(1), 1000)
    return () => clearInterval(interval)
  }, [showRestTimer, isPaused, startedAt, addActiveSeconds])

  const estimatedCalories = Math.round(activeExerciseSeconds * KCAL_PER_ACTIVE_SECOND)

  const rawExercise = exercises[currentExerciseIndex]
  const currentExercise = swappedExercises[currentExerciseIndex] ?? rawExercise
  const nextExerciseItem = exercises[currentExerciseIndex + 1]

  const isLastExercise = currentExerciseIndex === exercises.length - 1
  const isLastSet = currentSetNumber > totalSets

  const { data: recentLogs } = useRecentLogs(currentExercise?.id ?? null)
  const lastSessionReps = recentLogs && recentLogs.length > 0 ? recentLogs[0].reps : null

  const dynamicRestSeconds = useMemo(() => {
    if (!currentExercise) return 75
    const lastEffort = lastEffortByExercise[currentExercise.id] ?? null
    const consecutiveHard = consecutiveHardByExercise[currentExercise.id] ?? 0
    return calculateRestSeconds(currentExercise.muscle_group as MovementPattern, lastEffort, consecutiveHard, timeSlot)
  }, [currentExercise, lastEffortByExercise, consecutiveHardByExercise, timeSlot])

  const consecutiveHard = currentExercise ? (consecutiveHardByExercise[currentExercise.id] ?? 0) : 0
  const currentExerciseLogs = logs.filter(l => l.exerciseId === currentExercise?.id)

  const swapCandidates = useMemo(() => {
    if (!allExercises || !rawExercise) return []
    const sessionIds = new Set(exercises.map(e => e.id))
    return allExercises.filter(e =>
      e.muscle_group === rawExercise.muscle_group &&
      e.equipment_required === rawExercise.equipment_required &&
      !sessionIds.has(e.id) &&
      e.progression_level === rawExercise.progression_level &&
      !e.is_warmup && !e.is_cooldown
    ).slice(0, 4)
  }, [allExercises, rawExercise, exercises])

  const getSectionLabel = () => {
    if (!currentExercise) return ''
    if (currentExercise.is_warmup) return 'WARM-UP'
    if (currentExercise.is_cooldown) return 'COOL-DOWN'
    return 'MAIN'
  }

  const handleLogSet = async (reps: number | null, duration: number | null, effort: Effort) => {
    if (!sessionId || !currentExercise) return
    logSet({ exerciseId: currentExercise.id, setNumber: currentSetNumber, reps, durationSeconds: duration, effort, extraWeightKg: null, loggedVia: 'tap' })
    await logSetMutation.mutateAsync({
      session_id: sessionId, exercise_id: currentExercise.id,
      set_number: currentSetNumber, reps, duration_seconds: duration,
      effort, extra_weight_kg: null, logged_via: 'tap', skipped: false, skip_reason: null,
    })
    setRestTotal(dynamicRestSeconds)
    nextSet(effort, currentExercise.id)
  }

  const handleRestComplete = () => {
    if (navigator.vibrate) navigator.vibrate([100, 50, 100])
    setShowRestTimer(false)
  }

  const handleSkipRest = () => {
    setShowRestTimer(false)
  }

  const handleBack = () => {
    // Go back to previous set (just hide rest timer if showing)
    if (showRestTimer) setShowRestTimer(false)
  }

  const handleSkipExercise = () => {
    setShowCue(false)
    setShowSwap(false)
    if (isLastExercise) onSessionEnd()
    else nextExercise()
  }

  const handleNextExercise = () => {
    setShowCue(false)
    setShowSwap(false)
    if (isLastExercise) onSessionEnd()
    else nextExercise()
  }

  const handleSwap = (replacement: Exercise) => {
    setSwappedExercises(prev => ({ ...prev, [currentExerciseIndex]: replacement }))
    setShowSwap(false)
  }

  const handlePauseToggle = () => {
    if (isPaused) resumeSession()
    else pauseSession()
  }

  if (!currentExercise) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6">
        <p className="text-text-primary font-black text-2xl">ALL DONE.</p>
        <Button fullWidth size="lg" onClick={onSessionEnd}>END SESSION →</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col pt-4 pb-36 min-h-[calc(100vh-6rem)]">
      {/* Top: progress bar + elapsed */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-1 bg-surface rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-500"
            style={{ width: `${(currentExerciseIndex / exercises.length) * 100}%` }}
          />
        </div>
        <span className="text-text-disabled text-xs font-mono">{elapsedTime}</span>
      </div>

      {/* Section label + counter */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-accent text-xs font-bold tracking-widest">{getSectionLabel()}</span>
        <span className="text-text-disabled text-xs">{currentExerciseIndex + 1} / {exercises.length}</span>
      </div>

      {/* CURRENT EXERCISE label + name */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentExerciseIndex}-${currentExercise.id}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="mb-4"
        >
          <div className="bg-surface rounded-card p-4">
            <p className="text-text-disabled text-xs font-bold tracking-widest mb-2">CURRENT EXERCISE</p>
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-3xl font-black text-text-primary leading-tight uppercase flex-1">
                {currentExercise.name}
              </h1>
              <div className="flex gap-1 flex-shrink-0 mt-1">
                <button
                  onClick={() => { setShowCue(v => !v); setShowSwap(false) }}
                  className="h-8 px-3 bg-surface-raised rounded-pill text-text-disabled text-xs font-bold"
                >
                  {showCue ? 'HIDE' : 'CUE'}
                </button>
                {!currentExercise.is_warmup && !currentExercise.is_cooldown && (
                  <button
                    onClick={() => { setShowSwap(v => !v); setShowCue(false) }}
                    className="h-8 px-3 bg-surface-raised rounded-pill text-text-disabled text-xs font-bold"
                  >
                    SWAP
                  </button>
                )}
              </div>
            </div>

            {lastSessionReps !== null && !showCue && !showSwap && (
              <p className="text-text-disabled text-xs mt-1">Last session: {lastSessionReps} reps</p>
            )}

            {/* Cue card */}
            <AnimatePresence>
              {showCue && currentExercise.cue_card?.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 flex flex-col gap-1"
                >
                  {currentExercise.cue_card.map((cue, i) => (
                    <p key={i} className="text-text-secondary text-xs leading-relaxed">• {cue}</p>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Swap panel */}
            <AnimatePresence>
              {showSwap && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 flex flex-col gap-2"
                >
                  <p className="text-text-disabled text-xs font-bold tracking-widest">SWAP WITH</p>
                  {swapCandidates.length === 0 ? (
                    <p className="text-text-secondary text-sm">No alternatives available.</p>
                  ) : (
                    swapCandidates.map(ex => (
                      <button key={ex.id} onClick={() => handleSwap(ex)}
                        className="h-12 bg-surface-raised rounded-card px-4 text-left text-text-primary text-sm font-bold active:brightness-110 transition-all"
                      >
                        {ex.name}
                      </button>
                    ))
                  )}
                  <button onClick={() => setShowSwap(false)} className="text-text-disabled text-xs text-center py-1">
                    Cancel
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Set history pills */}
      {currentExerciseLogs.length > 0 && !showSwap && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {currentExerciseLogs.map((l, i) => (
            <div key={i} className={`h-8 px-3 rounded-pill flex items-center gap-1 text-xs font-bold ${
              l.effort === 'easy' ? 'bg-success/20 text-success'
              : l.effort === 'hard' ? 'bg-warning/20 text-warning'
              : 'bg-surface text-text-secondary'
            }`}>
              <span>S{l.setNumber}</span>
              {l.reps !== null && <span>· {l.reps}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Regression warning */}
      {consecutiveHard >= 3 && !showRestTimer && !showSwap && (
        <div className="mb-4 bg-surface rounded-card p-3 border-l-4 border-warning">
          <p className="text-warning text-xs font-bold">
            {consecutiveHard} hard sets. Tap SWAP for an easier alternative.
          </p>
        </div>
      )}

      {/* Main content: rest timer or set logger */}
      <div className="flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {isPaused ? (
            <motion.div
              key="paused"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <p className="text-5xl">⏸</p>
              <p className="text-text-secondary font-bold text-lg">PAUSED</p>
              <p className="text-text-disabled text-sm">Tap resume to continue.</p>
            </motion.div>
          ) : showRestTimer ? (
            <motion.div
              key="rest"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center gap-6"
            >
              <CircularTimer
                seconds={restTotal}
                total={restTotal}
                onDismiss={handleSkipRest}
                onComplete={handleRestComplete}
              />
              {isLastSet && (
                <Button fullWidth size="lg" onClick={handleNextExercise}>
                  {isLastExercise ? 'FINISH SESSION →' : 'NEXT EXERCISE →'}
                </Button>
              )}
            </motion.div>
          ) : !showSwap ? (
            <motion.div
              key={`set-${currentExerciseIndex}-${currentSetNumber}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <SetLogger
                setNumber={currentSetNumber}
                totalSets={totalSets}
                targetRepsMin={currentExercise.target_reps_min}
                targetRepsMax={currentExercise.target_reps_max}
                targetDurationSeconds={currentExercise.target_duration_seconds}
                onLog={handleLogSet}
                isLogging={logSetMutation.isPending}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* UP NEXT card */}
      {nextExerciseItem && !showSwap && !isPaused && (
        <div className="mt-4 bg-surface rounded-card p-3 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-text-disabled text-xs font-bold tracking-widest">UP NEXT</p>
            <p className="text-text-primary font-bold text-sm">{nextExerciseItem.name}</p>
          </div>
          <span className="text-text-disabled text-lg">›</span>
        </div>
      )}

      {/* Bottom stats bar */}
      <div className="mt-4 flex items-center justify-between px-1">
        <div className="text-center">
          <p className="text-text-primary font-black text-lg">~{estimatedCalories}</p>
          <p className="text-text-disabled text-xs">CALORIES</p>
        </div>
        <div className="text-center">
          <p className="text-text-primary font-black text-lg">{elapsedTime}</p>
          <p className="text-text-disabled text-xs">ELAPSED</p>
        </div>
        <div className="text-center">
          <p className="text-text-primary font-black text-lg">{currentExerciseLogs.length}/{totalSets}</p>
          <p className="text-text-disabled text-xs">SETS</p>
        </div>
      </div>

      {/* Control bar: Back | Pause | Skip */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={handleBack}
          className="flex-1 h-12 bg-surface rounded-card text-text-secondary text-xs font-bold tracking-widest active:brightness-110 transition-all"
        >
          ◀ BACK
        </button>
        <button
          onClick={handlePauseToggle}
          className="flex-1 h-12 bg-accent rounded-card text-navbar text-xs font-black tracking-widest active:brightness-110 transition-all"
        >
          {isPaused ? '▶ RESUME' : '⏸ PAUSE'}
        </button>
        <button
          onClick={handleSkipExercise}
          className="flex-1 h-12 bg-surface rounded-card text-text-secondary text-xs font-bold tracking-widest active:brightness-110 transition-all"
        >
          SKIP ▶
        </button>
      </div>

      <ChatPanel sessionId={sessionId} />
    </div>
  )
}import { useMemo, useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SetLogger } from '@/components/workout/SetLogger'
import { Button } from '@/components/ui/Button'
import { useSessionStore } from '@/stores/sessionStore'
import { useLogSet, useRecentLogs, useExercises } from '@/hooks/useWorkout'
import { calculateRestSeconds } from '@/lib/workoutEngine'
import type { Effort, MovementPattern, Exercise } from '@/types/app.types'
import { ChatPanel } from '@/components/chat/ChatPanel'

interface Props {
  onSessionEnd: () => void
}

// Calorie burn: only counts actual exercise time, not rest or paused time
// ~8 kcal/min during bodyweight exercise (conservative estimate)
const KCAL_PER_ACTIVE_SECOND = 8 / 60

function useElapsedTime(startedAt: Date | null, isPaused: boolean, totalPausedMs: number): string {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!startedAt) return
    const interval = setInterval(() => {
      if (!isPaused) {
        setElapsed(Math.floor((Date.now() - startedAt.getTime() - totalPausedMs) / 1000))
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [startedAt, isPaused, totalPausedMs])
  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function CircularTimer({ seconds, total, onDismiss, onComplete }: {
  seconds: number
  total: number
  onDismiss: () => void
  onComplete: () => void
}) {
  const [remaining, setRemaining] = useState(seconds)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setRemaining(seconds)
  }, [seconds])

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(intervalRef.current!)
          onComplete()
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current!)
  }, [seconds, onComplete])

  const progress = remaining / total
  const circumference = 2 * Math.PI * 54
  const strokeDashoffset = circumference * (1 - progress)

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#242424" strokeWidth="8" />
          <circle
            cx="60" cy="60" r="54" fill="none"
            stroke="#C8FF00" strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-text-primary font-mono">
            {mins > 0 ? `${mins}:${secs.toString().padStart(2,'0')}` : `${secs}`}
          </span>
          <span className="text-text-disabled text-xs tracking-widest">REST</span>
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="h-10 px-6 bg-surface-raised rounded-pill text-text-secondary text-xs font-bold tracking-widest active:brightness-110"
      >
        SKIP REST
      </button>
    </div>
  )
}

export function ActiveSession({ onSessionEnd }: Props) {
  const {
    exercises, currentExerciseIndex, currentSetNumber, totalSets,
    timeSlot, showRestTimer, sessionId, logs, startedAt,
    isPaused, totalPausedMs, activeExerciseSeconds,
    logSet, nextSet, nextExercise, setShowRestTimer,
    lastEffortByExercise, consecutiveHardByExercise,
    pauseSession, resumeSession, addActiveSeconds,
  } = useSessionStore()

  const [showCue, setShowCue] = useState(false)
  const [showSwap, setShowSwap] = useState(false)
  const [swappedExercises, setSwappedExercises] = useState<Record<number, Exercise>>({})
  const [restTotal, setRestTotal] = useState(75)

  const logSetMutation = useLogSet()
  const { data: allExercises } = useExercises()
  const elapsedTime = useElapsedTime(startedAt, isPaused, totalPausedMs)

  // Track active exercise seconds for calorie counting (tick every second when not in rest and not paused)
  useEffect(() => {
    if (showRestTimer || isPaused || !startedAt) return
    const interval = setInterval(() => addActiveSeconds(1), 1000)
    return () => clearInterval(interval)
  }, [showRestTimer, isPaused, startedAt, addActiveSeconds])

  const estimatedCalories = Math.round(activeExerciseSeconds * KCAL_PER_ACTIVE_SECOND)

  const rawExercise = exercises[currentExerciseIndex]
  const currentExercise = swappedExercises[currentExerciseIndex] ?? rawExercise
  const nextExerciseItem = exercises[currentExerciseIndex + 1]

  const isLastExercise = currentExerciseIndex === exercises.length - 1
  const isLastSet = currentSetNumber > totalSets

  const { data: recentLogs } = useRecentLogs(currentExercise?.id ?? null)
  const lastSessionReps = recentLogs && recentLogs.length > 0 ? recentLogs[0].reps : null

  const dynamicRestSeconds = useMemo(() => {
    if (!currentExercise) return 75
    const lastEffort = lastEffortByExercise[currentExercise.id] ?? null
    const consecutiveHard = consecutiveHardByExercise[currentExercise.id] ?? 0
    return calculateRestSeconds(currentExercise.muscle_group as MovementPattern, lastEffort, consecutiveHard, timeSlot)
  }, [currentExercise, lastEffortByExercise, consecutiveHardByExercise, timeSlot])

  const consecutiveHard = currentExercise ? (consecutiveHardByExercise[currentExercise.id] ?? 0) : 0
  const currentExerciseLogs = logs.filter(l => l.exerciseId === currentExercise?.id)

  const swapCandidates = useMemo(() => {
    if (!allExercises || !rawExercise) return []
    const sessionIds = new Set(exercises.map(e => e.id))
    return allExercises.filter(e =>
      e.muscle_group === rawExercise.muscle_group &&
      e.equipment_required === rawExercise.equipment_required &&
      !sessionIds.has(e.id) &&
      e.progression_level === rawExercise.progression_level &&
      !e.is_warmup && !e.is_cooldown
    ).slice(0, 4)
  }, [allExercises, rawExercise, exercises])

  const getSectionLabel = () => {
    if (!currentExercise) return ''
    if (currentExercise.is_warmup) return 'WARM-UP'
    if (currentExercise.is_cooldown) return 'COOL-DOWN'
    return 'MAIN'
  }

  const handleLogSet = async (reps: number | null, duration: number | null, effort: Effort) => {
    if (!sessionId || !currentExercise) return
    logSet({ exerciseId: currentExercise.id, setNumber: currentSetNumber, reps, durationSeconds: duration, effort, extraWeightKg: null, loggedVia: 'tap' })
    await logSetMutation.mutateAsync({
      session_id: sessionId, exercise_id: currentExercise.id,
      set_number: currentSetNumber, reps, duration_seconds: duration,
      effort, extra_weight_kg: null, logged_via: 'tap', skipped: false, skip_reason: null,
    })
    setRestTotal(dynamicRestSeconds)
    nextSet(effort, currentExercise.id)
  }

  const handleRestComplete = () => {
    if (navigator.vibrate) navigator.vibrate([100, 50, 100])
    setShowRestTimer(false)
  }

  const handleSkipRest = () => {
    setShowRestTimer(false)
  }

  const handleBack = () => {
    // Go back to previous set (just hide rest timer if showing)
    if (showRestTimer) setShowRestTimer(false)
  }

  const handleSkipExercise = () => {
    setShowCue(false)
    setShowSwap(false)
    if (isLastExercise) onSessionEnd()
    else nextExercise()
  }

  const handleNextExercise = () => {
    setShowCue(false)
    setShowSwap(false)
    if (isLastExercise) onSessionEnd()
    else nextExercise()
  }

  const handleSwap = (replacement: Exercise) => {
    setSwappedExercises(prev => ({ ...prev, [currentExerciseIndex]: replacement }))
    setShowSwap(false)
  }

  const handlePauseToggle = () => {
    if (isPaused) resumeSession()
    else pauseSession()
  }

  if (!currentExercise) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6">
        <p className="text-text-primary font-black text-2xl">ALL DONE.</p>
        <Button fullWidth size="lg" onClick={onSessionEnd}>END SESSION →</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col pt-4 pb-36 min-h-[calc(100vh-6rem)]">
      {/* Top: progress bar + elapsed */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-1 bg-surface rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-500"
            style={{ width: `${(currentExerciseIndex / exercises.length) * 100}%` }}
          />
        </div>
        <span className="text-text-disabled text-xs font-mono">{elapsedTime}</span>
      </div>

      {/* Section label + counter */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-accent text-xs font-bold tracking-widest">{getSectionLabel()}</span>
        <span className="text-text-disabled text-xs">{currentExerciseIndex + 1} / {exercises.length}</span>
      </div>

      {/* CURRENT EXERCISE label + name */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentExerciseIndex}-${currentExercise.id}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="mb-4"
        >
          <div className="bg-surface rounded-card p-4">
            <p className="text-text-disabled text-xs font-bold tracking-widest mb-2">CURRENT EXERCISE</p>
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-3xl font-black text-text-primary leading-tight uppercase flex-1">
                {currentExercise.name}
              </h1>
              <div className="flex gap-1 flex-shrink-0 mt-1">
                <button
                  onClick={() => { setShowCue(v => !v); setShowSwap(false) }}
                  className="h-8 px-3 bg-surface-raised rounded-pill text-text-disabled text-xs font-bold"
                >
                  {showCue ? 'HIDE' : 'CUE'}
                </button>
                {!currentExercise.is_warmup && !currentExercise.is_cooldown && (
                  <button
                    onClick={() => { setShowSwap(v => !v); setShowCue(false) }}
                    className="h-8 px-3 bg-surface-raised rounded-pill text-text-disabled text-xs font-bold"
                  >
                    SWAP
                  </button>
                )}
              </div>
            </div>

            {lastSessionReps !== null && !showCue && !showSwap && (
              <p className="text-text-disabled text-xs mt-1">Last session: {lastSessionReps} reps</p>
            )}

            {/* Cue card */}
            <AnimatePresence>
              {showCue && currentExercise.cue_card?.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 flex flex-col gap-1"
                >
                  {currentExercise.cue_card.map((cue, i) => (
                    <p key={i} className="text-text-secondary text-xs leading-relaxed">• {cue}</p>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Swap panel */}
            <AnimatePresence>
              {showSwap && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 flex flex-col gap-2"
                >
                  <p className="text-text-disabled text-xs font-bold tracking-widest">SWAP WITH</p>
                  {swapCandidates.length === 0 ? (
                    <p className="text-text-secondary text-sm">No alternatives available.</p>
                  ) : (
                    swapCandidates.map(ex => (
                      <button key={ex.id} onClick={() => handleSwap(ex)}
                        className="h-12 bg-surface-raised rounded-card px-4 text-left text-text-primary text-sm font-bold active:brightness-110 transition-all"
                      >
                        {ex.name}
                      </button>
                    ))
                  )}
                  <button onClick={() => setShowSwap(false)} className="text-text-disabled text-xs text-center py-1">
                    Cancel
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Set history pills */}
      {currentExerciseLogs.length > 0 && !showSwap && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {currentExerciseLogs.map((l, i) => (
            <div key={i} className={`h-8 px-3 rounded-pill flex items-center gap-1 text-xs font-bold ${
              l.effort === 'easy' ? 'bg-success/20 text-success'
              : l.effort === 'hard' ? 'bg-warning/20 text-warning'
              : 'bg-surface text-text-secondary'
            }`}>
              <span>S{l.setNumber}</span>
              {l.reps !== null && <span>· {l.reps}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Regression warning */}
      {consecutiveHard >= 3 && !showRestTimer && !showSwap && (
        <div className="mb-4 bg-surface rounded-card p-3 border-l-4 border-warning">
          <p className="text-warning text-xs font-bold">
            {consecutiveHard} hard sets. Tap SWAP for an easier alternative.
          </p>
        </div>
      )}

      {/* Main content: rest timer or set logger */}
      <div className="flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {isPaused ? (
            <motion.div
              key="paused"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <p className="text-5xl">⏸</p>
              <p className="text-text-secondary font-bold text-lg">PAUSED</p>
              <p className="text-text-disabled text-sm">Tap resume to continue.</p>
            </motion.div>
          ) : showRestTimer ? (
            <motion.div
              key="rest"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center gap-6"
            >
              <CircularTimer
                seconds={restTotal}
                total={restTotal}
                onDismiss={handleSkipRest}
                onComplete={handleRestComplete}
              />
              {isLastSet && (
                <Button fullWidth size="lg" onClick={handleNextExercise}>
                  {isLastExercise ? 'FINISH SESSION →' : 'NEXT EXERCISE →'}
                </Button>
              )}
            </motion.div>
          ) : !showSwap ? (
            <motion.div
              key={`set-${currentExerciseIndex}-${currentSetNumber}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <SetLogger
                setNumber={currentSetNumber}
                totalSets={totalSets}
                targetRepsMin={currentExercise.target_reps_min}
                targetRepsMax={currentExercise.target_reps_max}
                targetDurationSeconds={currentExercise.target_duration_seconds}
                onLog={handleLogSet}
                isLogging={logSetMutation.isPending}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* UP NEXT card */}
      {nextExerciseItem && !showSwap && !isPaused && (
        <div className="mt-4 bg-surface rounded-card p-3 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-text-disabled text-xs font-bold tracking-widest">UP NEXT</p>
            <p className="text-text-primary font-bold text-sm">{nextExerciseItem.name}</p>
          </div>
          <span className="text-text-disabled text-lg">›</span>
        </div>
      )}

      {/* Bottom stats bar */}
      <div className="mt-4 flex items-center justify-between px-1">
        <div className="text-center">
          <p className="text-text-primary font-black text-lg">~{estimatedCalories}</p>
          <p className="text-text-disabled text-xs">CALORIES</p>
        </div>
        <div className="text-center">
          <p className="text-text-primary font-black text-lg">{elapsedTime}</p>
          <p className="text-text-disabled text-xs">ELAPSED</p>
        </div>
        <div className="text-center">
          <p className="text-text-primary font-black text-lg">{currentExerciseLogs.length}/{totalSets}</p>
          <p className="text-text-disabled text-xs">SETS</p>
        </div>
      </div>

      {/* Control bar: Back | Pause | Skip */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={handleBack}
          className="flex-1 h-12 bg-surface rounded-card text-text-secondary text-xs font-bold tracking-widest active:brightness-110 transition-all"
        >
          ◀ BACK
        </button>
        <button
          onClick={handlePauseToggle}
          className="flex-1 h-12 bg-accent rounded-card text-navbar text-xs font-black tracking-widest active:brightness-110 transition-all"
        >
          {isPaused ? '▶ RESUME' : '⏸ PAUSE'}
        </button>
        <button
          onClick={handleSkipExercise}
          className="flex-1 h-12 bg-surface rounded-card text-text-secondary text-xs font-bold tracking-widest active:brightness-110 transition-all"
        >
          SKIP ▶
        </button>
      </div>

      <ChatPanel sessionId={sessionId} />
    </div>
  )
}