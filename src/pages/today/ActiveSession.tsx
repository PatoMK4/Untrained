import { useMemo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SetLogger } from '@/components/workout/SetLogger'
import { RestTimer } from '@/components/workout/RestTimer'
import { Button } from '@/components/ui/Button'
import { useSessionStore } from '@/stores/sessionStore'
import { useLogSet, useRecentLogs, useExercises } from '@/hooks/useWorkout'
import { calculateRestSeconds } from '@/lib/workoutEngine'
import type { Effort, MovementPattern, Exercise } from '@/types/app.types'
import { ChatPanel } from '@/components/chat/ChatPanel'

interface Props {
  onSessionEnd: () => void
}

function useElapsedTime(startedAt: Date | null): string {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!startedAt) return
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [startedAt])
  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function ActiveSession({ onSessionEnd }: Props) {
  const {
    exercises, currentExerciseIndex, currentSetNumber, totalSets,
    timeSlot, showRestTimer, sessionId, logs, startedAt,
    logSet, nextSet, nextExercise, setShowRestTimer,
    lastEffortByExercise, consecutiveHardByExercise,
  } = useSessionStore()

  const [showCue, setShowCue] = useState(false)
  const [showSwap, setShowSwap] = useState(false)
  const [swappedExercises, setSwappedExercises] = useState<Record<number, Exercise>>({})

  const logSetMutation = useLogSet()
  const { data: allExercises } = useExercises()
  const elapsedTime = useElapsedTime(startedAt)

  // Use swapped exercise if one exists for this index
  const rawExercise = exercises[currentExerciseIndex]
  const currentExercise = swappedExercises[currentExerciseIndex] ?? rawExercise

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
  const showRegressionWarning = consecutiveHard >= 3

  const currentExerciseLogs = logs.filter((l) => l.exerciseId === currentExercise?.id)

  // Find swap candidates: same muscle group, same equipment, different exercise, not already in session
  const swapCandidates = useMemo(() => {
    if (!allExercises || !rawExercise) return []
    const sessionIds = new Set(exercises.map(e => e.id))
    return allExercises
      .filter(e =>
        e.muscle_group === rawExercise.muscle_group &&
        e.equipment_required === rawExercise.equipment_required &&
        !sessionIds.has(e.id) &&
        e.progression_level === rawExercise.progression_level &&
        !e.is_warmup && !e.is_cooldown
      )
      .slice(0, 4)
  }, [allExercises, rawExercise, exercises])

  const getSectionLabel = () => {
    if (!currentExercise) return ''
    if (currentExercise.is_warmup) return 'WARM-UP'
    if (currentExercise.is_cooldown) return 'COOL-DOWN'
    return 'MAIN'
  }

  const handleLogSet = async (reps: number | null, duration: number | null, effort: Effort) => {
    if (!sessionId || !currentExercise) return
    const log = {
      exerciseId: currentExercise.id, setNumber: currentSetNumber,
      reps, durationSeconds: duration, effort, extraWeightKg: null, loggedVia: 'tap' as const,
    }
    logSet(log)
    await logSetMutation.mutateAsync({
      session_id: sessionId, exercise_id: currentExercise.id,
      set_number: currentSetNumber, reps, duration_seconds: duration,
      effort, extra_weight_kg: null, logged_via: 'tap', skipped: false, skip_reason: null,
    })
    nextSet(effort, currentExercise.id)
  }

  const handleRestDone = () => {
    if (navigator.vibrate) navigator.vibrate([100, 50, 100])
    setShowRestTimer(false)
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

  if (!currentExercise) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6">
        <p className="text-text-primary font-black text-2xl text-center">ALL DONE.</p>
        <Button fullWidth size="lg" onClick={onSessionEnd}>END SESSION →</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col pt-6 pb-32 min-h-[calc(100vh-6rem)]">
      {/* Progress bar + elapsed */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-1 bg-surface rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-500"
            style={{ width: `${(currentExerciseIndex / exercises.length) * 100}%` }}
          />
        </div>
        <span className="text-text-disabled text-xs font-mono">{elapsedTime}</span>
      </div>

      {/* Section + counter */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-accent text-xs font-bold tracking-widest">{getSectionLabel()}</span>
        <span className="text-text-disabled text-xs">{currentExerciseIndex + 1} / {exercises.length}</span>
      </div>

      {/* Exercise name + controls */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentExerciseIndex}-${currentExercise.id}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="mb-6"
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <h1 className="text-4xl font-black text-text-primary leading-tight uppercase flex-1">
              {currentExercise.name}
            </h1>
            <div className="flex gap-1 flex-shrink-0 mt-1">
              <button
                onClick={() => { setShowCue(v => !v); setShowSwap(false) }}
                className="h-8 px-3 bg-surface rounded-pill text-text-disabled text-xs font-bold tracking-widest"
              >
                {showCue ? 'HIDE' : 'CUE'}
              </button>
              {!currentExercise.is_warmup && !currentExercise.is_cooldown && (
                <button
                  onClick={() => { setShowSwap(v => !v); setShowCue(false) }}
                  className="h-8 px-3 bg-surface rounded-pill text-text-disabled text-xs font-bold tracking-widest"
                >
                  SWAP
                </button>
              )}
            </div>
          </div>

          {lastSessionReps !== null && !showCue && !showSwap && (
            <p className="text-text-disabled text-sm">Last session: {lastSessionReps} reps</p>
          )}

          {/* Cue card */}
          <AnimatePresence>
            {showCue && currentExercise.cue_card?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 bg-surface rounded-card p-3 flex flex-col gap-1"
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
                  <p className="text-text-secondary text-sm">No alternatives available at this level.</p>
                ) : (
                  swapCandidates.map(ex => (
                    <button
                      key={ex.id}
                      onClick={() => handleSwap(ex)}
                      className="h-12 bg-surface rounded-card px-4 text-left text-text-primary text-sm font-bold active:brightness-110 transition-all"
                    >
                      {ex.name}
                    </button>
                  ))
                )}
                <button
                  onClick={() => setShowSwap(false)}
                  className="text-text-disabled text-xs text-center py-1"
                >
                  Cancel
                </button>
              </motion.div>
            )}
          </AnimatePresence>
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
      {showRegressionWarning && !showRestTimer && !showSwap && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-4 bg-surface rounded-card p-3 border-l-4 border-warning"
        >
          <p className="text-warning text-xs font-bold">
            {consecutiveHard} hard sets. Tap SWAP if you need an easier alternative.
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
              <RestTimer seconds={dynamicRestSeconds} onDismiss={handleRestDone} onComplete={handleRestDone} />
              <p className="text-text-disabled text-xs text-center">
                {dynamicRestSeconds}s rest{consecutiveHard >= 2 ? ' — extended for recovery' : ''}
              </p>
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

      <ChatPanel sessionId={sessionId} />

      {!showRestTimer && !showSwap && (
        <button onClick={onSessionEnd} className="text-text-disabled text-xs text-center py-3 mt-4">
          End session early
        </button>
      )}
    </div>
  )
}