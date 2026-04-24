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
  onLog: (reps: number | null, duration: number | null, effort: Effort) => void
  isLogging?: boolean
}

export function SetLogger({
  setNumber,
  totalSets,
  targetRepsMin,
  targetRepsMax,
  targetDurationSeconds,
  onLog,
  isLogging = false,
}: Props) {
  const [reps, setReps] = useState<number>(targetRepsMin ?? 10)
  const [effort, setEffort] = useState<Effort | null>(null)

  const isDuration = targetDurationSeconds !== null && targetRepsMin === null
  const canLog = effort !== null

  const handleLog = () => {
    if (!effort) return
    if (isDuration) {
      onLog(null, targetDurationSeconds, effort)
    } else {
      onLog(reps, null, effort)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Set counter */}
      <p className="text-text-secondary text-xs font-bold tracking-widest text-center">
        SET {setNumber} OF {totalSets}
      </p>

      {/* Reps or Duration display */}
      {isDuration ? (
        <div className="flex flex-col items-center gap-1">
          <span className="text-6xl font-black text-text-primary">
            {targetDurationSeconds}
          </span>
          <span className="text-text-secondary text-sm">SECONDS</span>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={() => setReps((r) => Math.max(0, r - 1))}
            className="w-14 h-14 rounded-full bg-surface text-text-primary text-2xl font-bold active:bg-surface-raised active:scale-95 transition-all"
          >
            −
          </button>
          <div className="flex flex-col items-center">
            <span className="text-6xl font-black text-text-primary w-24 text-center">
              {reps}
            </span>
            <span className="text-text-secondary text-xs">REPS</span>
          </div>
          <button
            onClick={() => setReps((r) => r + 1)}
            className="w-14 h-14 rounded-full bg-surface text-text-primary text-2xl font-bold active:bg-surface-raised active:scale-95 transition-all"
          >
            +
          </button>
        </div>
      )}

      {/* Target hint */}
      {targetRepsMin !== null && targetRepsMax !== null && (
        <p className="text-text-disabled text-xs text-center tracking-wide">
          Target: {targetRepsMin}–{targetRepsMax} reps
        </p>
      )}

      {/* Effort picker */}
      <EffortPicker value={effort} onChange={setEffort} />

      {/* Log button */}
      <Button
        fullWidth
        disabled={!canLog}
        loading={isLogging}
        onClick={handleLog}
        size="lg"
      >
        LOG SET
      </Button>
    </div>
  )
}
