import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { useExercises, useProgression } from '@/hooks/useWorkout'
import { buildRecoverySession } from '@/lib/workoutEngine'
import type { MovementPattern, Exercise } from '@/types/app.types'

interface Props {
  onStartSession: (exercises: Exercise[], setsPerExercise: number) => void
  onFullRest: () => void
}

const mono: React.CSSProperties = {
  fontFamily: '"JetBrains Mono", ui-monospace, monospace',
  fontSize: 10,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
}

const options = [
  { key: 'active_recovery' as const, title: 'ACTIVE RECOVERY', description: 'Light movement, mobility, and core.', sub: 'Keeps blood flowing without adding fatigue.', duration: '20–30 MIN' },
  { key: 'skill_practice' as const, title: 'SKILL PRACTICE', description: 'Technique work on your weakest movement.', sub: 'Low intensity — form focus only.', duration: '15–20 MIN' },
  { key: 'full_rest' as const, title: 'FULL REST', description: 'Nothing today. Your body is rebuilding.', sub: 'Streak maintained. Come back tomorrow.', duration: null },
]

export function RecoveryDay({ onStartSession, onFullRest }: Props) {
  const [selected, setSelected] = useState<'active_recovery' | 'skill_practice' | 'full_rest' | null>(null)
  const { data: exercises } = useExercises()
  const { data: progressionMap } = useProgression()

  const handleConfirm = () => {
    if (!selected) return
    if (selected === 'full_rest') { onFullRest(); return }
    if (!exercises || !progressionMap) return
    const patterns: MovementPattern[] = ['push', 'pull', 'squat', 'hinge', 'core']
    const weakest = patterns.reduce<MovementPattern>((min, p) =>
      (progressionMap[p] ?? 1) < (progressionMap[min] ?? 1) ? p : min, 'push')
    const { exercises: recoveryExercises, setsPerExercise } = buildRecoverySession(
      selected, weakest, progressionMap as Record<MovementPattern, number>, exercises as Exercise[]
    )
    onStartSession(recoveryExercises, setsPerExercise)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 }}
    >
      <div>
        <div style={{ ...mono, color: '#8a8a86', marginBottom: 6 }}>TODAY</div>
        <div style={{
          fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif',
          fontWeight: 800, fontSize: 64, lineHeight: 0.9,
          letterSpacing: '-0.02em', color: '#f4f4f3',
        }}>RECOVERY<br />DAY.</div>
        <div style={{ ...mono, color: '#8a8a86', marginTop: 12 }}>Rest is training too.</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {options.map(opt => (
          <button
            key={opt.key}
            onClick={() => setSelected(opt.key)}
            style={{
              width: '100%', textAlign: 'left', padding: '16px 18px',
              border: `1px solid ${selected === opt.key ? '#c8ff00' : '#242424'}`,
              background: selected === opt.key ? 'rgba(200,255,0,0.05)' : '#131313',
              borderRadius: 2, cursor: 'pointer', transition: 'all 0.1s',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ ...mono, color: selected === opt.key ? '#c8ff00' : '#8a8a86' }}>{opt.title}</span>
                {opt.duration && <span style={{ ...mono, fontSize: 9, color: '#5d5d5a' }}>{opt.duration}</span>}
              </div>
              <div style={{ fontFamily: '"Barlow Condensed","Arial Narrow",sans-serif', fontSize: 20, fontWeight: 600, color: '#f4f4f3', letterSpacing: '0.005em' }}>
                {opt.description}
              </div>
              <div style={{ ...mono, color: '#5d5d5a', marginTop: 4, lineHeight: 1.5 }}>{opt.sub}</div>
            </div>
            <div style={{
              width: 16, height: 16, border: `1px solid ${selected === opt.key ? '#c8ff00' : '#2e2e2e'}`,
              background: selected === opt.key ? '#c8ff00' : 'transparent',
              flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {selected === opt.key && (
                <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                  <path d="M1 3.5L3 5.5L8 1" stroke="#0a0a0a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </button>
        ))}
      </div>

      <Button
        fullWidth size="lg"
        disabled={!selected}
        onClick={handleConfirm}
        sub={selected === 'full_rest' ? 'TODAY' : 'SESSION'}
      >
        {selected === 'full_rest' ? 'REST' : selected ? 'BEGIN' : 'SELECT AN OPTION'}
      </Button>
    </motion.div>
  )
}
