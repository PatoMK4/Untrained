import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SetLogger } from '@/components/workout/SetLogger'
import { RestTimer } from '@/components/workout/RestTimer'
import { Button } from '@/components/ui/Button'
import { useSessionStore } from '@/stores/sessionStore'
import { useLogSet, useRecentLogs } from '@/hooks/useWorkout'
import { calculateRestSeconds } from '@/lib/workoutEngine'
import type { Effort, MovementPattern } from '@/types/app.types'
import { ChatPanel } from '@/components/chat/ChatPanel'

interface Props {
  onSessionEnd: () => void
}

export function ActiveSession({ onSessionEnd }: Props) {
  const {
    exercises,
    currentExerciseIndex,
    currentSetNumber,
    totalSets,
    timeSlot,
    showRestTimer,
    sessionId,
    logSet,
    nextSet,
    nextExercise,
    setShowRestTimer,
    lastEffortByExercise,
    consecutiveHardByExercise,
  } = useSessionStore()

  const logSetMutation = useLogSet()
  const currentExercise = exercises[currentExerciseIndex]
  const isLastExercise = currentExerciseIndex === exercises.length - 1

  // isLastSet: true when we have already logged the final set
  // currentSetNumber is incremented by nextSet() AFTER logging,
  // so when showRestTimer is true and currentSetNumber > totalSets
  // that means we just finished the last set.
  const isLastSet = currentSetNumber > totalSets

  const { data: recentLogs } = useRecentLogs(currentExercise?.id ?? null)
  const lastSessionReps = recentLogs && recentLogs.length > 0 ? recentLogs[0].reps : null

  const dynamicRestSeconds = useMemo(() => {
    if (!currentExercise) return 75
    const lastEffort = lastEffortByExercise[currentExercise.id] ?? null
    const consecutiveHard = consecutiveHardByExercise[currentExercise.id] ?? 0
    return calculateRestSeconds(
      currentExercise.muscle_group as MovementPattern,
      lastEffort,
      consecutiveHard,
      timeSlot
    )
  }, [currentExercise, lastEffortByExercise, consecutiveHardByExercise, timeSlot])

  const consecutiveHard = currentExercise
    ? (consecutiveHardByExercise[currentExercise.id] ?? 0)
    : 0
  const showRegressionWarning = consecutiveHard >= 3

  const getSectionLabel = () => {
    if (!currentExercise) return ''
    if (currentExercise.is_warmup) return 'WARM-UP'
    if (currentExercise.is_cooldown) return 'COOL-DOWN'
    return 'MAIN'
  }

  const handleLogSet = async (reps: number | null, duration: number | null, effort: Effort) => {
    if (!sessionId || !currentExercise) return

    const log = {
      exerciseId: currentExercise.id,
      setNumber: currentSetNumber,
      reps,
      durationSeconds: duration,
      effort,
      extraWeightKg: null,
      loggedVia: 'tap' as const,
    }

    logSet(log)

    await logSetMutation.mutateAsync({
      session_id: sessionId,
      exercise_id: currentExercise.id,
      set_number: currentSetNumber,
      reps,
      duration_seconds: duration,
      effort,
      extra_weight_kg: null,
      logged_via: 'tap',
      skipped: false,
      skip_reason: null,
    })

    // nextSet increments currentSetNumber and shows rest timer
    nextSet(effort, currentExercise.id)
  }

  // Dismiss rest timer — go back to set logger for next set
  const handleRestDone = () => {
    setShowRestTimer(false)
  }

  // Advance to next exercise — called explicitly by user after last set rest
  const handleNextExercise = () => {
    if (isLastExercise) {
      // All exercises done — end session
      onSessionEnd()
    } else {
      nextExercise()
    }
  }

  // Session fully complete (no more exercises)
  if (!currentExercise) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6">
        <p className="text-text-primary font-black text-2xl text-center">ALL DONE.</p>
        <Button fullWidth size="lg" onClick={onSessionEnd}>
          END SESSION →
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col pt-6 pb-8 min-h-[calc(100vh-6rem)]">
      {/* Progress bar */}
      <div className="w-full h-1 bg-surface rounded-full overflow-hidden mb-5">
        <div
          className="h-full bg-accent transition-all duration-500"
          style={{ width: `${(currentExerciseIndex / exercises.length) * 100}%` }}
        />
      </div>

      {/* Section + counter */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-accent text-xs font-bold tracking-widest">
          {getSectionLabel()}
        </span>
        <span className="text-text-disabled text-xs">
          {currentExerciseIndex + 1} / {exercises.length}
        </span>
      </div>

      {/* Exercise name */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentExercise.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-black text-text-primary leading-tight uppercase">
            {currentExercise.name}
          </h1>
          {lastSessionReps !== null && (
            <p className="text-text-disabled text-sm mt-2">
              Last session: {lastSessionReps} reps
            </p>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Regression warning */}
      {showRegressionWarning && !showRestTimer && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-4 bg-surface rounded-card p-3 border-l-4 border-warning"
        >
          <p className="text-warning text-xs font-bold">
            This exercise has been hard for {consecutiveHard} sets. Consider easier variation next session.
          </p>
        </motion.div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {showRestTimer ? (
            <motion.div
              key="rest"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center gap-6"
            >
              <RestTimer
                seconds={dynamicRestSeconds}
                onDismiss={handleRestDone}
                onComplete={handleRestDone}
              />

              <p className="text-text-disabled text-xs text-center">
                {dynamicRestSeconds}s rest
                {consecutiveHard >= 2 ? ' — extended for recovery' : ''}
              </p>

              {/* After last set: show advance button. During mid-set rest: show set progress */}
              {isLastSet ? (
                <Button fullWidth size="lg" onClick={handleNextExercise}>
                  {isLastExercise ? 'FINISH SESSION →' : 'NEXT EXERCISE →'}
                </Button>
              ) : (
                <p className="text-text-secondary text-sm text-center">
                  Set {currentSetNumber - 1} of {totalSets} done. Rest up.
                </p>
              )}
            </motion.div>
          ) : (
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
          )}
        </AnimatePresence>
      </div>

      <ChatPanel sessionId={sessionId} />

      {!showRestTimer && (
        <button
          onClick={onSessionEnd}
          className="text-text-disabled text-xs text-center py-3 mt-6"
        >
          End session early
        </button>
      )}
    </div>
  )
}
