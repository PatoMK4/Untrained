// src/pages/onboarding/steps/PushupBenchmark.tsx

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { NumberPicker } from '@/components/ui/NumberPicker'
import { PillButton } from '@/components/ui/PillButton'
import type { StepProps, Effort } from '@/types/app.types'

const EFFORTS: { value: Effort; color: 'success' | 'accent' | 'danger' }[] = [
  { value: 'easy', color: 'success' },
  { value: 'medium', color: 'accent' },
  { value: 'hard', color: 'danger' },
]

export function PushupBenchmark({ onNext }: StepProps) {
  const [count, setCount] = useState(0)
  const [countTouched, setCountTouched] = useState(false)
  const [effort, setEffort] = useState<Effort | null>(null)

  const handleChange = (v: number) => {
    setCount(v)
    setCountTouched(true)
  }

  return (
    <div className="flex flex-col gap-8 flex-1">
      <div>
        <h1 className="text-3xl font-black text-text-primary leading-tight">
          Push-Ups
        </h1>
        <p className="text-text-secondary text-sm mt-2">
          Do as many as you can with good form, then enter your count.
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-10">
        <NumberPicker
          value={count}
          onChange={handleChange}
          min={0}
          max={100}
          label="Reps completed"
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
          effort && onNext({ pushup_benchmark: count, pushup_effort: effort })
        }
      >
        CONTINUE
      </Button>
    </div>
  )
}