import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { estimateCalories } from '@/lib/workoutEngine'
import { useSessionStore } from '@/stores/sessionStore'
import { useCompleteSession } from '@/hooks/useWorkout'
import { awardSessionScore } from '@/lib/scoreEngine'
import { runProgressionCheck } from '@/lib/progressionEngine'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'

interface Props { onDone: () => void }

const REFLECTION_OPTIONS = [
  { value: 'loved_it', label: '🔥 Loved it' },
  { value: 'good',     label: '💪 Good session' },
  { value: 'fine',     label: '👍 Fine' },
  { value: 'tough',    label: '😤 Tough' },
  { value: 'really_hard', label: '😮‍💨 Really hard' },
] as const

type Reflection = typeof REFLECTION_OPTIONS[number]['value']

export function PostWorkout({ onDone }: Props) {
  const { user } = useAuthStore()
  const { logs, painFlags, exercises, endSession } = useSessionStore()
  const completeSession = useCompleteSession()

  const [painResponse, setPainResponse] = useState<'none' | 'minor' | 'hurt' | null>(null)
  const [painNote, setPainNote] = useState('')
  const [reflection, setReflection] = useState<Reflection | null>(null)
  const [isDone, setIsDone] = useState(false)
  const [scoreAwarded, setScoreAwarded] = useState(0)
  const [saving, setSaving] = useState(false)
  const [progressionUnlocked, setProgressionUnlocked] = useState(false)

  const showPainCheck = painFlags.length > 0
  const totalSets = logs.length
  const totalReps = logs.reduce((sum, l) => sum + (l.reps ?? 0), 0)
  const avgReps = totalSets > 0 ? totalReps / totalSets : 0
  const estimatedCals = estimateCalories(totalSets, avgReps)

  // Effort breakdown
  const easyCount = logs.filter((l) => l.effort === 'easy').length
  const mediumCount = logs.filter((l) => l.effort === 'medium').length
  const hardCount = logs.filter((l) => l.effort === 'hard').length

  const hasWarmup = exercises.some((e) => e.is_warmup)
  const hasCooldown = exercises.some((e) => e.is_cooldown)
  const warmupLogged = hasWarmup && logs.some((l) => exercises.find((e) => e.id === l.exerciseId && e.is_warmup))
  const cooldownLogged = hasCooldown && logs.some((l) => exercises.find((e) => e.id === l.exerciseId && e.is_cooldown))
  const fullBookends = warmupLogged && cooldownLogged

  useEffect(() => {
    const saveSession = async () => {
      const sessionId = useSessionStore.getState().sessionId
      if (!sessionId || !user || saving) return
      setSaving(true)
      try {
        const exercisesCompleted = [...new Set(logs.map((l) => l.exerciseId))]
        await completeSession.mutateAsync({ sessionId, totalSets, totalReps, exercisesCompleted, painNote: undefined, painFlagged: false })
        const progressed = await runProgressionCheck(user.id, sessionId)
        setProgressionUnlocked(progressed)
        const points = await awardSessionScore(user.id, sessionId, { progressionUnlocked: progressed, fullBookends })
        setScoreAwarded(points)
      } catch (err) {
        console.error('Error saving session:', err)
      } finally {
        setSaving(false)
      }
    }
    saveSession()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDone = async () => {
    setIsDone(true)
    const sessionId = useSessionStore.getState().sessionId
    if (sessionId && user) {
      try {
        const updates: Record<string, unknown> = {}
        if (reflection) updates.post_reflection = reflection
        if (painFlags.length > 0 && painResponse !== null) {
          updates.pain_flagged = painResponse === 'minor' || painResponse === 'hurt'
          if ((painResponse === 'minor' || painResponse === 'hurt') && painNote) {
            updates.pain_note = painNote
          }
        }
        if (Object.keys(updates).length > 0) {
          await supabase.from('workout_sessions').update(updates).eq('id', sessionId)
        }
      } catch (err) { console.error('Error updating session:', err) }
    }
    endSession()
    onDone()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-6 pt-10 pb-8"
    >
      <div>
        <h1 className="text-4xl font-black text-text-primary">SESSION COMPLETE.</h1>
        <p className="text-text-secondary text-sm mt-1">Every set counts. Good work.</p>
      </div>

      {/* Stats */}
      <div className="bg-surface rounded-card p-5 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-text-disabled text-xs tracking-widest">TOTAL SETS</p>
            <p className="text-text-primary font-black text-3xl mt-1">{totalSets}</p>
          </div>
          <div>
            <p className="text-text-disabled text-xs tracking-widest">TOTAL REPS</p>
            <p className="text-text-primary font-black text-3xl mt-1">{totalReps}</p>
          </div>
          <div>
            <p className="text-text-disabled text-xs tracking-widest">EST. CALORIES</p>
            <p className="text-text-primary font-black text-3xl mt-1">~{estimatedCals}</p>
          </div>
          <div>
            <p className="text-text-disabled text-xs tracking-widest">SCORE</p>
            <p className="text-accent font-black text-3xl mt-1">{saving ? '...' : `+${scoreAwarded}`}</p>
          </div>
        </div>

        {/* Effort breakdown */}
        {totalSets > 0 && (
          <div className="flex gap-2 pt-1 border-t border-surface-raised">
            {easyCount > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-success" />
                <span className="text-text-disabled text-xs">{easyCount} easy</span>
              </div>
            )}
            {mediumCount > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-accent" />
                <span className="text-text-disabled text-xs">{mediumCount} solid</span>
              </div>
            )}
            {hardCount > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-warning" />
                <span className="text-text-disabled text-xs">{hardCount} hard</span>
              </div>
            )}
          </div>
        )}

        {fullBookends && <p className="text-accent text-xs font-bold">+5 BONUS — WARM-UP & COOL-DOWN COMPLETED</p>}
        {progressionUnlocked && <p className="text-accent text-xs font-bold">+25 BONUS — LEVEL UP</p>}
      </div>

      {/* Reflection */}
      <div className="bg-surface rounded-card p-4 flex flex-col gap-3">
        <p className="text-text-secondary text-xs font-bold tracking-widest">HOW WAS THAT?</p>
        <div className="flex flex-wrap gap-2">
          {REFLECTION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setReflection(opt.value)}
              className={`h-10 px-4 rounded-pill text-sm font-bold transition-all ${
                reflection === opt.value ? 'bg-accent text-navbar' : 'bg-surface-raised text-text-primary'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pain check */}
      {showPainCheck && painResponse === null && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface rounded-card p-4 border-l-4 border-warning"
        >
          <p className="text-text-primary font-bold text-base mb-3">
            Quick check — anything feel off?
          </p>
          <div className="flex flex-col gap-2">
            <button onClick={() => setPainResponse('none')}
              className="h-12 bg-surface-raised rounded-card text-text-primary font-bold text-sm active:brightness-110 transition-all">
              All good
            </button>
            <button onClick={() => setPainResponse('minor')}
              className="h-12 bg-surface-raised rounded-card text-warning font-bold text-sm active:brightness-110 transition-all">
              Minor discomfort
            </button>
            <button onClick={() => setPainResponse('hurt')}
              className="h-12 bg-surface-raised rounded-card text-danger font-bold text-sm active:brightness-110 transition-all">
              Something hurt
            </button>
          </div>
        </motion.div>
      )}

      {(painResponse === 'minor' || painResponse === 'hurt') && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          className="bg-surface rounded-card p-4"
        >
          <p className="text-text-secondary text-sm mb-2">Where did you feel it?</p>
          <input
            type="text" value={painNote} onChange={(e) => setPainNote(e.target.value)}
            placeholder="e.g. left shoulder, lower back"
            className="w-full h-12 bg-surface-raised rounded-card px-4 text-text-primary text-sm border border-text-disabled focus:border-accent outline-none"
          />
          <p className="text-text-disabled text-xs mt-2">We will keep this in mind for your next session.</p>
        </motion.div>
      )}

      {painResponse === 'none' && (
        <p className="text-success text-sm text-center font-bold">✓ Nothing to flag.</p>
      )}

      {(painResponse !== null || !showPainCheck) && (
        <Button fullWidth size="lg" loading={isDone || saving} onClick={handleDone}>
          DONE
        </Button>
      )}
    </motion.div>
  )
}