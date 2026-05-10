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

function ExerciseRow({ exercise }: { exercise: Exercise }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between py-2">
        <div className="flex-1">
          <p className="text-text-primary font-bold text-base">{exercise.name}</p>
          <p className="text-text-secondary text-xs mt-0.5">
            {exercise.target_duration_seconds
              ? `${exercise.target_duration_seconds}s`
              : exercise.target_reps_min && exercise.target_reps_max
              ? `${exercise.target_reps_min}–${exercise.target_reps_max} reps`
              : ''}
          </p>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-text-disabled text-xs font-bold tracking-widest bg-surface-raised px-2 py-1 rounded-pill ml-2"
        >
          {expanded ? 'HIDE' : 'TECHNIQUE'}
        </button>
      </div>
      {expanded && <CueCard exercise={exercise} />}
    </div>
  )
}

function estimateMinutes(
  warmupCount: number, mainCount: number, cooldownCount: number,
  sets: number, restSeconds: number
): number {
  return Math.round(
    (warmupCount * 60 + cooldownCount * 60 + mainCount * (sets * 45 + (sets - 1) * restSeconds + 30)) / 60
  )
}

const READINESS_OPTIONS: { value: Readiness; label: string; sub: string }[] = [
  { value: 'great', label: 'FEELING GREAT', sub: 'Ready to push' },
  { value: 'good',  label: 'FEELING GOOD',  sub: 'Normal session' },
  { value: 'tired', label: 'A BIT TIRED',   sub: 'Keep it manageable' },
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

  const toggle = (key: string) => setExpandedSections((s) => ({ ...s, [key]: !s[key] }))

  const estimatedMins = estimateMinutes(
    warmup.length, main.length, cooldown.length,
    config.setsPerExercise, config.baseRestSeconds
  )

  const handlePainResponse = (response: 'better' | 'same' | 'worse') => {
    onPainFollowUp?.(response)
    setPainAnswered(true)
  }

  const SectionHeader = ({ label, count, sectionKey }: { label: string; count: number; sectionKey: string }) => (
    <button onClick={() => toggle(sectionKey)} className="flex items-center justify-between w-full py-3">
      <div className="flex items-center gap-2">
        <span className="text-text-secondary text-xs font-bold tracking-widest">{label}</span>
        <span className="text-text-disabled text-xs">({count})</span>
      </div>
      <span className="text-text-disabled text-sm">{expandedSections[sectionKey] ? '▲' : '▼'}</span>
    </button>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-4 pb-8"
    >
      {/* Comeback card */}
      {isComeback && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-surface rounded-card p-4 border-l-4 border-accent"
        >
          <p className="text-accent text-xs font-bold tracking-widest mb-1">WELCOME BACK</p>
          <p className="text-text-primary font-bold">It's been a few days. No stress.</p>
          <p className="text-text-secondary text-sm mt-1">
            Today's session is dialled back — build momentum, not fatigue.
          </p>
        </motion.div>
      )}

      {/* Pain follow-up */}
      {painFollowUp && !painAnswered && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-surface rounded-card p-4 border-l-4 border-warning"
        >
          <p className="text-warning text-xs font-bold tracking-widest mb-1">CHECKING IN</p>
          <p className="text-text-primary font-bold mb-1">
            Last session you flagged: <span className="text-warning">{painFollowUp.note}</span>
          </p>
          <p className="text-text-secondary text-sm mb-3">How is it feeling today?</p>
          <div className="flex gap-2">
            {(['better', 'same', 'worse'] as const).map((r) => (
              <button key={r} onClick={() => handlePainResponse(r)}
                className="flex-1 h-10 bg-surface-raised rounded-card text-text-primary text-xs font-bold capitalize active:brightness-110 transition-all"
              >
                {r}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {painFollowUp && painAnswered && (
        <div className="bg-surface rounded-card p-3">
          <p className="text-text-secondary text-sm">✓ Noted — your PT will keep this in mind.</p>
        </div>
      )}

      {/* Session heading */}
      <div>
        <h1 className="text-4xl font-black text-text-primary leading-tight">
          {sessionTypeLabel(sessionType)}
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          {warmup.length + main.length + cooldown.length} exercises · {config.setsPerExercise} sets — ~{estimatedMins} min
        </p>
      </div>

      {/* Time picker */}
      <div className="bg-surface rounded-card p-4">
        <p className="text-text-secondary text-xs font-bold tracking-widest mb-3">TIME AVAILABLE</p>
        <div className="flex gap-2 flex-wrap">
          {([30, 45, 60, 'no_rush'] as const).map((t) => (
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
      <div className="bg-surface rounded-card p-4 flex flex-col">
        <div className="border-b border-surface-raised">
          <SectionHeader label="WARM-UP" count={warmup.length} sectionKey="warmup" />
          {expandedSections.warmup && (
            <div className="flex flex-col divide-y divide-surface-raised pb-2">
              {warmup.map((ex) => <ExerciseRow key={ex.id} exercise={ex} />)}
            </div>
          )}
        </div>
        <div className="border-b border-surface-raised">
          <SectionHeader label="MAIN" count={main.length} sectionKey="main" />
          {expandedSections.main && (
            <div className="flex flex-col divide-y divide-surface-raised pb-2">
              {main.map((ex) => <ExerciseRow key={ex.id} exercise={ex} />)}
            </div>
          )}
        </div>
        <div>
          <SectionHeader label="COOL-DOWN" count={cooldown.length} sectionKey="cooldown" />
          {expandedSections.cooldown && (
            <div className="flex flex-col divide-y divide-surface-raised pb-2">
              {cooldown.map((ex) => <ExerciseRow key={ex.id} exercise={ex} />)}
            </div>
          )}
        </div>
      </div>

      {/* Readiness check */}
      <div className="bg-surface rounded-card p-4 flex flex-col gap-3">
        <p className="text-text-secondary text-xs font-bold tracking-widest">HOW ARE YOU FEELING?</p>
        <div className="flex flex-col gap-2">
          {READINESS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setReadiness(opt.value)}
              className={`h-14 rounded-card flex items-center justify-between px-4 transition-all ${
                readiness === opt.value ? 'bg-accent' : 'bg-surface-raised'
              }`}
            >
              <span className={`font-bold text-sm ${readiness === opt.value ? 'text-navbar' : 'text-text-primary'}`}>
                {opt.label}
              </span>
              <span className={`text-xs ${readiness === opt.value ? 'text-navbar' : 'text-text-disabled'}`}>
                {opt.sub}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Start button — only after readiness selected */}
      <AnimatePresence>
        {readiness && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Button fullWidth size="lg" loading={isStarting} onClick={() => onStart(readiness)}>
              START SESSION →
            </Button>
          </motion.div>
        )}
        {!readiness && (
  <p className="text-text-disabled text-xs text-center animate-pulse">
    ↑ Select how you're feeling to unlock start
  </p>
)}
      </AnimatePresence>
    </motion.div>
  )
}