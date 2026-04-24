import { useState } from 'react'
import { motion } from 'framer-motion'
import { CueCard } from '@/components/workout/CueCard'
import { Button } from '@/components/ui/Button'
import { PillButton } from '@/components/ui/PillButton'
import { sessionTypeLabel } from '@/lib/workoutEngine'
import type { Exercise, SessionType, TimeSlot } from '@/types/app.types'
import type { SessionConfig } from '@/lib/workoutEngine'

interface Props {
  sessionType: SessionType
  timeSlot: TimeSlot
  warmup: Exercise[]
  main: Exercise[]
  cooldown: Exercise[]
  config: SessionConfig
  onTimeChange: (t: TimeSlot) => void
  onStart: () => void
  isStarting: boolean
}

function ExerciseRow({
  exercise,
}: {
  exercise: Exercise
}) {
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
  warmupCount: number,
  mainCount: number,
  cooldownCount: number,
  sets: number,
  restSeconds: number
): number {
  const warmupTime = warmupCount * 60
  const cooldownTime = cooldownCount * 60
  const mainTime = mainCount * (sets * 45 + (sets - 1) * restSeconds + 30)
  return Math.round((warmupTime + cooldownTime + mainTime) / 60)
}

export function WorkoutPreview({
  sessionType,
  timeSlot,
  warmup,
  main,
  cooldown,
  config,
  onTimeChange,
  onStart,
  isStarting,
}: Props) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(
    { warmup: false, main: true, cooldown: false }
  )

  const toggle = (key: string) =>
    setExpandedSections((s) => ({ ...s, [key]: !s[key] }))

  const estimatedMins = estimateMinutes(
    warmup.length,
    main.length,
    cooldown.length,
    config.setsPerExercise,
    config.baseRestSeconds
  )

  const SectionHeader = ({
    label,
    count,
    sectionKey,
  }: {
    label: string
    count: number
    sectionKey: string
  }) => (
    <button
      onClick={() => toggle(sectionKey)}
      className="flex items-center justify-between w-full py-3"
    >
      <div className="flex items-center gap-2">
        <span className="text-text-secondary text-xs font-bold tracking-widest">
          {label}
        </span>
        <span className="text-text-disabled text-xs">({count})</span>
      </div>
      <span className="text-text-disabled text-sm">
        {expandedSections[sectionKey] ? '▲' : '▼'}
      </span>
    </button>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-4 pb-8"
    >
      {/* Session type heading */}
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
        <p className="text-text-secondary text-xs font-bold tracking-widest mb-3">
          TIME AVAILABLE
        </p>
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
        {/* Warmup */}
        <div className="border-b border-surface-raised">
          <SectionHeader label="WARM-UP" count={warmup.length} sectionKey="warmup" />
          {expandedSections.warmup && (
            <div className="flex flex-col divide-y divide-surface-raised pb-2">
              {warmup.map((ex) => (
                <ExerciseRow key={ex.id} exercise={ex} />
              ))}
            </div>
          )}
        </div>

        {/* Main */}
        <div className="border-b border-surface-raised">
          <SectionHeader label="MAIN" count={main.length} sectionKey="main" />
          {expandedSections.main && (
            <div className="flex flex-col divide-y divide-surface-raised pb-2">
              {main.map((ex) => (
                <ExerciseRow key={ex.id} exercise={ex} />
              ))}
            </div>
          )}
        </div>

        {/* Cooldown */}
        <div>
          <SectionHeader label="COOL-DOWN" count={cooldown.length} sectionKey="cooldown" />
          {expandedSections.cooldown && (
            <div className="flex flex-col divide-y divide-surface-raised pb-2">
              {cooldown.map((ex) => (
                <ExerciseRow key={ex.id} exercise={ex} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Start button */}
      <Button fullWidth size="lg" loading={isStarting} onClick={onStart}>
        START SESSION →
      </Button>
    </motion.div>
  )
}
