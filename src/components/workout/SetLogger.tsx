import { useState } from 'react'
import { EffortPicker } from './EffortPicker'
import { Button } from '@/components/ui/Button'
import type { Effort } from '@/types/app.types'

interface Props {
  setNumber: number
  totalSets: number
  targetRepsMin: number | null
  targetRepsMax: number | null
  targetDurationSeconds: number | null
  onLog: (reps: number | null, duration: number | null, effort: Effort, weightKg: number | null) => void
  isLogging?: boolean
}

export function SetLogger({
  setNumber, totalSets, targetRepsMin, targetRepsMax,
  targetDurationSeconds, onLog, isLogging = false,
}: Props) {
  const [reps, setReps] = useState<number>(targetRepsMin ?? 8)
  const [effort, setEffort] = useState<Effort>('medium') // default so LOG SET is always enabled
  const [showWeight, setShowWeight] = useState(false)
  const [weightKg, setWeightKg] = useState<string>('')

  const isDuration = targetDurationSeconds !== null && targetRepsMin === null

  // Guard: don't show if already past totalSets
  if (setNumber > totalSets) return null

  const handleLog = () => {
    const w = weightKg !== '' ? parseFloat(weightKg) : null
    if (isDuration) onLog(null, targetDurationSeconds, effort, w)
    else onLog(reps, null, effort, w)
  }

  const quickAdds = targetRepsMin
    ? [
        targetRepsMin,
        Math.round((targetRepsMin + (targetRepsMax ?? targetRepsMin + 4)) / 2),
        targetRepsMax ?? targetRepsMin + 4,
      ].filter((v, i, arr) => arr.indexOf(v) === i)
    : [6, 8, 10, 12]

  const inRange = targetRepsMin !== null && targetRepsMax !== null && reps >= targetRepsMin && reps <= targetRepsMax

  return (
    <div className="flex flex-col gap-5">
      <p className="text-text-secondary text-xs font-bold tracking-widest text-center">
        SET {setNumber} OF {totalSets}
      </p>

      {isDuration ? (
        <div className="flex flex-col items-center gap-1">
          <span className="text-6xl font-black text-text-primary">{targetDurationSeconds}</span>
          <span className="text-text-secondary text-sm">SECONDS</span>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => setReps(r => Math.max(0, r - 1))}
              className="w-14 h-14 rounded-full bg-surface text-text-primary text-2xl font-bold active:bg-surface-raised active:scale-95 transition-all"
            >
              −
            </button>
            <div className="flex flex-col items-center">
              <span className="text-6xl font-black text-text-primary w-24 text-center">{reps}</span>
              <span className="text-text-secondary text-xs">REPS</span>
            </div>
            <button
              onClick={() => setReps(r => r + 1)}
              className="w-14 h-14 rounded-full bg-surface text-text-primary text-2xl font-bold active:bg-surface-raised active:scale-95 transition-all"
            >
              +
            </button>
          </div>

          <div className="flex gap-2 justify-center">
            {quickAdds.map(n => (
              <button
                key={n}
                onClick={() => setReps(n)}
                className={`h-10 px-4 rounded-pill text-sm font-bold transition-all ${
                  reps === n ? 'bg-accent text-navbar' : 'bg-surface text-text-secondary'
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          {targetRepsMin !== null && targetRepsMax !== null && (
            <p className="text-text-disabled text-xs text-center">
              Target: {targetRepsMin}–{targetRepsMax} reps
              {inRange && <span className="text-accent ml-2">✓</span>}
            </p>
          )}
        </>
      )}

      {/* Effort picker — defaults to medium so button is always enabled */}
      <EffortPicker value={effort} onChange={setEffort} />

      {/* Optional weight input */}
      <button
        onClick={() => setShowWeight(v => !v)}
        className="text-text-disabled text-xs text-center underline"
      >
        {showWeight ? 'Remove weight' : '+ Add weight (kg/lbs)'}
      </button>
      {showWeight && (
        <div className="flex items-center gap-2 justify-center">
          <input
            type="number"
            value={weightKg}
            onChange={e => setWeightKg(e.target.value)}
            placeholder="0"
            className="w-24 h-10 bg-surface-raised rounded-card px-3 text-text-primary text-center text-lg font-bold border border-surface-raised focus:border-accent outline-none"
          />
          <span className="text-text-secondary text-sm font-bold">kg</span>
        </div>
      )}

      <Button fullWidth loading={isLogging} onClick={handleLog} size="lg">
        LOG SET
      </Button>
    </div>
  )
}