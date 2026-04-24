import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { estimateCalories } from '@/lib/workoutEngine'
import { useSessionStore } from '@/stores/sessionStore'
import { useCompleteSession } from '@/hooks/useWorkout'
import { awardSessionScore } from '@/lib/scoreEngine'
import { useAuthStore } from '@/stores/authStore'

interface Props {
  scoreAwarded: number
  onDone: () => void
}

export function PostWorkout({ scoreAwarded, onDone }: Props) {
  const { user } = useAuthStore()
  const { logs, painFlags, endSession } = useSessionStore()
  const completeSession = useCompleteSession()

  const [painResponse, setPainResponse] = useState<
    'none' | 'minor' | 'hurt' | null
  >(null)
  const [painNote, setPainNote] = useState('')
  const [isDone, setIsDone] = useState(false)

  const showPainCheck = painFlags.length > 0

  const totalSets = logs.length
  const totalReps = logs.reduce((sum, l) => sum + (l.reps ?? 0), 0)
  const avgReps = totalSets > 0 ? totalReps / totalSets : 0
  const estimatedCals = estimateCalories(totalSets, avgReps)

  const handleDone = async () => {
    setIsDone(true)
    try {
      const sessionId = useSessionStore.getState().sessionId
      if (sessionId && user) {
        const painFlagged = painResponse === 'hurt' || painResponse === 'minor'
        const exercisesCompleted = [
          ...new Set(logs.map((l) => l.exerciseId)),
        ]

        await completeSession.mutateAsync({
          sessionId,
          totalSets,
          totalReps,
          exercisesCompleted,
          painNote: painFlagged && painNote ? painNote : undefined,
          painFlagged,
        })

        await awardSessionScore(user.id, sessionId, {
          progressionUnlocked: false,
          fullBookends: true,
        })
      }
    } catch (err) {
      console.error('Error completing session:', err)
    } finally {
      endSession()
      onDone()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-6 pt-10 pb-8"
    >
      {/* Heading */}
      <div>
        <h1 className="text-4xl font-black text-text-primary">
          SESSION COMPLETE.
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          Every set counts. Good work.
        </p>
      </div>

      {/* Stats card */}
      <div className="bg-surface rounded-card p-5 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-text-disabled text-xs tracking-widest">
              TOTAL SETS
            </p>
            <p className="text-text-primary font-black text-3xl mt-1">
              {totalSets}
            </p>
          </div>
          <div>
            <p className="text-text-disabled text-xs tracking-widest">
              TOTAL REPS
            </p>
            <p className="text-text-primary font-black text-3xl mt-1">
              {totalReps}
            </p>
          </div>
          <div>
            <p className="text-text-disabled text-xs tracking-widest">
              EST. CALORIES
            </p>
            <p className="text-text-primary font-black text-3xl mt-1">
              ~{estimatedCals}
            </p>
          </div>
          <div>
            <p className="text-text-disabled text-xs tracking-widest">
              SCORE
            </p>
            <p className="text-accent font-black text-3xl mt-1">
              +{scoreAwarded}
            </p>
          </div>
        </div>
      </div>

      {/* Pain check — ONLY if pain was flagged during session */}
      {showPainCheck && painResponse === null && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface rounded-card p-4 border-l-4 border-warning"
        >
          <p className="text-text-primary font-bold text-base mb-3">
            Quick check — anything feel off during that session?
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setPainResponse('none')}
              className="h-12 bg-surface-raised rounded-card text-text-primary font-bold text-sm active:brightness-110 transition-all"
            >
              All good
            </button>
            <button
              onClick={() => setPainResponse('minor')}
              className="h-12 bg-surface-raised rounded-card text-warning font-bold text-sm active:brightness-110 transition-all"
            >
              Minor discomfort
            </button>
            <button
              onClick={() => setPainResponse('hurt')}
              className="h-12 bg-surface-raised rounded-card text-danger font-bold text-sm active:brightness-110 transition-all"
            >
              Something hurt
            </button>
          </div>
        </motion.div>
      )}

      {/* Pain note input */}
      {(painResponse === 'minor' || painResponse === 'hurt') && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-surface rounded-card p-4"
        >
          <p className="text-text-secondary text-sm mb-2">
            Where did you feel it?
          </p>
          <input
            type="text"
            value={painNote}
            onChange={(e) => setPainNote(e.target.value)}
            placeholder="e.g. left shoulder, lower back"
            className="w-full h-12 bg-surface-raised rounded-card px-4 text-text-primary text-sm border border-text-disabled focus:border-accent outline-none"
          />
          <p className="text-text-disabled text-xs mt-2">
            We'll keep this in mind for your next session.
          </p>
        </motion.div>
      )}

      {/* Confirmation if "all good" */}
      {painResponse === 'none' && (
        <p className="text-success text-sm text-center font-bold">
          ✓ Noted — nothing to flag.
        </p>
      )}

      {/* Done button */}
      {(painResponse !== null || !showPainCheck) && (
        <Button
          fullWidth
          size="lg"
          loading={isDone}
          onClick={handleDone}
        >
          DONE
        </Button>
      )}
    </motion.div>
  )
}
