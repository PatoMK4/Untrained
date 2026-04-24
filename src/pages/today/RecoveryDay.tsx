import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { useExercises, useProgression } from '@/hooks/useWorkout'
import { buildRecoverySession } from '@/lib/workoutEngine'
import type { MovementPattern, Exercise } from '@/types/app.types'

interface Props {
  // Parent creates the session and passes the ID + exercises down to start it
  onStartSession: (exercises: Exercise[], setsPerExercise: number) => void
  onFullRest: () => void
}

const options = [
  {
    key: 'active_recovery' as const,
    icon: '🏃',
    title: 'ACTIVE RECOVERY',
    description: 'Light movement, mobility, and core. 20–30 min.',
    sub: 'Keeps blood flowing without adding fatigue.',
  },
  {
    key: 'skill_practice' as const,
    icon: '🎯',
    title: 'SKILL PRACTICE',
    description: 'Technique work on your weakest movement.',
    sub: 'Low intensity — form focus only.',
  },
  {
    key: 'full_rest' as const,
    icon: '😴',
    title: 'FULL REST',
    description: 'Nothing today. Your body is rebuilding.',
    sub: 'Streak maintained. Come back tomorrow.',
  },
]

export function RecoveryDay({ onStartSession, onFullRest }: Props) {
  const [selected, setSelected] = useState<'active_recovery' | 'skill_practice' | 'full_rest' | null>(null)

  const { data: exercises } = useExercises()
  const { data: progressionMap } = useProgression()

  const handleConfirm = () => {
    if (!selected) return

    if (selected === 'full_rest') {
      onFullRest()
      return
    }

    if (!exercises || !progressionMap) return

    // Find weakest movement pattern for skill practice
    const patterns: MovementPattern[] = ['push', 'pull', 'squat', 'hinge', 'core']
    const weakest = patterns.reduce<MovementPattern>((min, pattern) => {
      const minLevel = progressionMap[min] ?? 1
      const currLevel = progressionMap[pattern] ?? 1
      return currLevel < minLevel ? pattern : min
    }, 'push')

    const { exercises: recoveryExercises, setsPerExercise } = buildRecoverySession(
      selected,
      weakest,
      progressionMap as Record<MovementPattern, number>,
      exercises as Exercise[]
    )

    onStartSession(recoveryExercises, setsPerExercise)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-6 pb-8"
    >
      {/* Header */}
      <div>
        <p className="text-accent text-xs font-bold tracking-widest mb-1">TODAY</p>
        <h1 className="text-4xl font-black text-text-primary leading-tight">
          RECOVERY DAY
        </h1>
        <p className="text-text-secondary text-sm mt-2">
          Rest is training too. Here's what your body can use today.
        </p>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-3">
        {options.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSelected(opt.key)}
            className={`w-full text-left rounded-card p-4 border-2 transition-all active:scale-[0.99]
              ${selected === opt.key ? 'border-accent bg-surface' : 'border-text-disabled bg-surface'}`}
          >
            <div className="flex items-start gap-4">
              <span className="text-2xl mt-0.5">{opt.icon}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className={`font-bold text-sm tracking-widest
                    ${selected === opt.key ? 'text-accent' : 'text-text-primary'}`}>
                    {opt.title}
                  </p>
                  {selected === opt.key && (
                    <span className="text-accent text-xs font-bold">✓</span>
                  )}
                </div>
                <p className="text-text-primary text-sm mt-1">{opt.description}</p>
                <p className="text-text-disabled text-xs mt-1">{opt.sub}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <Button
        fullWidth
        size="lg"
        disabled={!selected}
        onClick={handleConfirm}
      >
        {selected === 'full_rest'
          ? 'REST TODAY →'
          : selected
          ? 'START SESSION →'
          : 'SELECT AN OPTION'}
      </Button>

      <p className="text-text-disabled text-xs text-center leading-relaxed">
        Active recovery improves blood flow and reduces soreness without adding training stress.
      </p>
    </motion.div>
  )
}