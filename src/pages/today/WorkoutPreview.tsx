import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CueCard } from '@/components/workout/CueCard'
import { Button } from '@/components/ui/Button'
import { PillButton } from '@/components/ui/PillButton'
import { sessionTypeLabel } from '@/lib/workoutEngine'
import type { Exercise, SessionType, TimeSlot } from '@/types/app.types'
import type { SessionConfig } from '@/lib/workoutEngine'

export type Readiness = 'great' | 'good' | 'tired'

interface Props {
  sessionType: SessionType
  timeSlot: TimeSlot
  warmup: Exercise[]
  main: Exercise[]
  cooldown: Exercise[]
  config: SessionConfig
  onTimeChange: (t: TimeSlot) => void
  onStart: (readiness: Readiness) => void
  isStarting: boolean
  isComeback?: boolean
  painFollowUp?: { note: string } | null
  onPainFollowUp?: (response: 'better' | 'same' | 'worse') => void
}

const mono: React.CSSProperties = {
  fontFamily: '"JetBrains Mono", ui-monospace, monospace',
  fontSize: 10,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
}

function ExerciseRow({ exercise, index }: { exercise: Exercise; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const num = String(index + 1).padStart(2, '0')
  const repsLabel = exercise.target_duration_seconds
    ? `${exercise.target_duration_seconds}s`
    : exercise.target_reps_min && exercise.target_reps_max
    ? `${exercise.target_reps_min}–${exercise.target_reps_max} reps`
    : ''
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid #242424' }}>
        <span style={{ ...mono, color: '#8a8a86', width: 18 }}>{num}</span>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif',
            fontWeight: 600, fontSize: 22, color: '#f4f4f3', letterSpacing: '0.01em',
          }}>{exercise.name}</div>
          <div style={{ ...mono, color: '#8a8a86', marginTop: 2 }}>{repsLabel}</div>
        </div>
        <button
          onClick={() => setExpanded(v => !v)}
          style={{
            ...mono, color: '#8a8a86', background: 'transparent',
            border: '1px solid #2e2e2e', padding: '6px 10px',
            borderRadius: 2, cursor: 'pointer', minHeight: 32,
          }}
        >
          {expanded ? 'HIDE' : 'TECH'}
        </button>
      </div>
      {expanded && <div style={{ paddingBottom: 12 }}><CueCard exercise={exercise} /></div>}
    </div>
  )
}

function estimateMinutes(warmupCount: number, mainCount: number, cooldownCount: number, sets: number, restSeconds: number): number {
  return Math.round((warmupCount * 60 + cooldownCount * 60 + mainCount * (sets * 45 + (sets - 1) * restSeconds + 30)) / 60)
}

const READINESS_OPTIONS: { value: Readiness; label: string; sub: string }[] = [
  { value: 'great', label: 'READY TO PUSH',  sub: 'All good' },
  { value: 'good',  label: 'FEELING GOOD',   sub: 'Normal session' },
  { value: 'tired', label: 'A BIT TIRED',    sub: 'Keep it manageable' },
]

export function WorkoutPreview({
  sessionType, timeSlot, warmup, main, cooldown, config,
  onTimeChange, onStart, isStarting, isComeback, painFollowUp, onPainFollowUp,
}: Props) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(
    { warmup: false, main: true, cooldown: false }
  )
  const [readiness, setReadiness] = useState<Readiness | null>(null)
  const [painAnswered, setPainAnswered] = useState(false)

  const toggle = (key: string) => setExpandedSections(s => ({ ...s, [key]: !s[key] }))

  const estimatedMins = estimateMinutes(warmup.length, main.length, cooldown.length, config.setsPerExercise, config.baseRestSeconds)
  const totalExercises = warmup.length + main.length + cooldown.length

  const handlePainResponse = (response: 'better' | 'same' | 'worse') => {
    onPainFollowUp?.(response)
    setPainAnswered(true)
  }

  const sessionLabel = sessionTypeLabel(sessionType).toUpperCase()

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 32, paddingBottom: 40 }}
    >
      {/* Comeback */}
      {isComeback && (
        <div style={{ padding: '14px 16px', border: '1px solid rgba(200,255,0,0.3)', background: 'rgba(200,255,0,0.04)', borderRadius: 2 }}>
          <div style={{ ...mono, color: '#c8ff00', marginBottom: 6 }}>WELCOME BACK</div>
          <div style={{ fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif', fontSize: 20, fontWeight: 600, color: '#f4f4f3' }}>
            It's been a few days. No stress.
          </div>
          <div style={{ ...mono, color: '#8a8a86', marginTop: 4, lineHeight: 1.6 }}>
            Session dialled back — build momentum, not fatigue.
          </div>
        </div>
      )}

      {/* Pain follow-up */}
      {painFollowUp && !painAnswered && (
        <div style={{ padding: '14px 16px', border: '1px solid rgba(255,176,46,0.3)', background: 'rgba(255,176,46,0.04)', borderRadius: 2 }}>
          <div style={{ ...mono, color: '#ffb02e', marginBottom: 6 }}>CHECKING IN</div>
          <div style={{ fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif', fontSize: 20, fontWeight: 600, color: '#f4f4f3', marginBottom: 8 }}>
            You flagged: <span style={{ color: '#ffb02e' }}>{painFollowUp.note}</span>
          </div>
          <div style={{ ...mono, color: '#8a8a86', marginBottom: 12 }}>How is it today?</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['better', 'same', 'worse'] as const).map(r => (
              <button key={r} onClick={() => handlePainResponse(r)}
                style={{
                  flex: 1, height: 40, background: 'transparent', border: '1px solid #2e2e2e',
                  ...mono, color: '#c9c9c7', cursor: 'pointer', borderRadius: 2,
                }}>{r}</button>
            ))}
          </div>
        </div>
      )}
      {painFollowUp && painAnswered && (
        <div style={{ ...mono, color: '#8a8a86' }}>✓ NOTED.</div>
      )}

      {/* Session heading */}
      <div>
        <div style={{ ...mono, color: '#8a8a86', marginBottom: 6 }}>{sessionLabel}</div>
        <div style={{
          fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif',
          fontWeight: 800, fontSize: 86, lineHeight: 0.88,
          letterSpacing: '-0.02em', color: '#f4f4f3',
        }}>
          {sessionLabel.split(' ')[0]}<br />
          <span style={{ color: '#c9c9c7', fontSize: 48, fontWeight: 500 }}>DAY.</span>
        </div>
        <div style={{ ...mono, color: '#8a8a86', marginTop: 14 }}>
          {estimatedMins} MIN · {totalExercises} LIFTS · {config.setsPerExercise} SETS
        </div>
      </div>

      {/* Time picker */}
      <div>
        <div style={{ ...mono, color: '#8a8a86', marginBottom: 12 }}>TIME AVAILABLE</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {([30, 45, 60, 'no_rush'] as const).map(t => (
            <PillButton
              key={t}
              label={t === 60 ? '60 MIN+' : t === 'no_rush' ? 'NO RUSH' : `${t} MIN`}
              selected={timeSlot === t}
              onClick={() => onTimeChange(t)}
            />
          ))}
        </div>
      </div>

      {/* Exercise list */}
      <div>
        <SectionHeader label="WARM-UP" count={warmup.length} open={expandedSections.warmup} onToggle={() => toggle('warmup')} />
        {expandedSections.warmup && warmup.map((ex, i) => <ExerciseRow key={ex.id} exercise={ex} index={i} />)}

        <SectionHeader label="MAIN" count={main.length} open={expandedSections.main} onToggle={() => toggle('main')} />
        {expandedSections.main && main.map((ex, i) => <ExerciseRow key={ex.id} exercise={ex} index={i} />)}

        <SectionHeader label="COOL-DOWN" count={cooldown.length} open={expandedSections.cooldown} onToggle={() => toggle('cooldown')} />
        {expandedSections.cooldown && cooldown.map((ex, i) => <ExerciseRow key={ex.id} exercise={ex} index={i} />)}
      </div>

      {/* Readiness */}
      <div>
        <div style={{ ...mono, color: '#8a8a86', marginBottom: 12 }}>READINESS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {READINESS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setReadiness(opt.value)}
              style={{
                width: '100%', height: 56,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 16px',
                border: readiness === opt.value ? '1px solid #c8ff00' : '1px solid #242424',
                background: readiness === opt.value ? '#c8ff00' : '#131313',
                borderRadius: 2, cursor: 'pointer', transition: 'all 0.1s',
              }}
            >
              <span style={{
                fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif',
                fontWeight: 700, fontSize: 22, letterSpacing: '0.04em',
                color: readiness === opt.value ? '#0a0a0a' : '#f4f4f3',
              }}>{opt.label}</span>
              <span style={{
                fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: readiness === opt.value ? 'rgba(10,10,10,0.6)' : '#8a8a86',
              }}>{opt.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* CTA */}
      <AnimatePresence>
        {readiness ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Button fullWidth size="lg" loading={isStarting} onClick={() => onStart(readiness)} sub="SESSION">
              BEGIN
            </Button>
          </motion.div>
        ) : (
          <div style={{ ...mono, color: '#5d5d5a', textAlign: 'center' }}>
            Select readiness to unlock
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function SectionHeader({ label, count, open, onToggle }: { label: string; count: number; open: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', padding: '14px 0', minHeight: 44,
        background: 'transparent', border: 'none', borderTop: '1px solid #242424',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8a8a86',
        }}>{label}</span>
        <span style={{
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontSize: 10, color: '#5d5d5a',
        }}>({count})</span>
      </div>
      <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 10, color: '#5d5d5a' }}>
        {open ? '▲' : '▼'}
      </span>
    </button>
  )
}
