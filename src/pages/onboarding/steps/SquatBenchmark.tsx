// src/pages/onboarding/steps/SquatBenchmark.tsx

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { NumberPicker } from '@/components/ui/NumberPicker'
import { PillButton } from '@/components/ui/PillButton'
import type { StepProps, Effort } from '@/types/app.types'

type SquatType = 'hold' | 'jumps'

const EFFORTS: { value: Effort; color: 'success' | 'accent' | 'danger' }[] = [
  { value: 'easy', color: 'success' },
  { value: 'medium', color: 'accent' },
  { value: 'hard', color: 'danger' },
]

export function SquatBenchmark({ onNext }: StepProps) {
  const [squatType, setSquatType] = useState<SquatType>('jumps')
  const [count, setCount] = useState(0)
  const [countTouched, setCountTouched] = useState(false)
  const [effort, setEffort] = useState<Effort | null>(null)

  const handleTypeChange = (t: SquatType) => {
    setSquatType(t)
    setCount(0)
    setCountTouched(false)
    setEffort(null)
  }

  const handleChange = (v: number) => {
    setCount(v)
    setCountTouched(true)
  }

  return (
    <div className="flex flex-col gap-6 flex-1">
      <div>
        <h1 className="text-3xl font-black text-text-primary leading-tight">
          Squats
        </h1>
        <p className="text-text-secondary text-sm mt-2">
          Do as many as you can with good form, then enter your count.
        </p>
      </div>

      <div className="flex gap-2 justify-center">
        <div className="flex-1 max-w-[160px]">
          <PillButton
            label="JUMP SQUATS"
            selected={squatType === 'jumps'}
            onClick={() => handleTypeChange('jumps')}
          />
        </div>
        <div className="flex-1 max-w-[160px]">
          <PillButton
            label="SQUAT HOLD"
            selected={squatType === 'hold'}
            onClick={() => handleTypeChange('hold')}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-10">
        <NumberPicker
          value={count}
          onChange={handleChange}
          min={0}
          max={squatType === 'hold' ? 300 : 100}
          label={squatType === 'hold' ? 'Seconds held' : 'Reps completed'}
        />
        <div className="w-full flex flex-col items-center gap-3">
          <p className="text-text-secondary text-sm text-center">
            How did that feel?
          </p>
          <div className="flex gap-3 items-center justify-center">
            {EFFORTS.map((e) => (
              <PillButton
                key={e.value}
                label={e.value.toUpperCase()}
                selected={effort === e.value}
                onClick={() => setEffort(e.value)}
              />
            ))}
          </div>
        </div>
      </div>

      <Button
        fullWidth
        disabled={!countTouched || effort === null}
        onClick={() =>
          effort &&
          onNext({
            squat_benchmark: count,
            squat_type: squatType,
            squat_effort: effort,
          })
        }
      >
        CONTINUE
      </Button>
    </div>
  )
}