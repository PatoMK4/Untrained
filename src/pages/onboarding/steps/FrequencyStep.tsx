// src/pages/onboarding/steps/FrequencyStep.tsx

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { StepProps } from '@/types/app.types'

const OPTIONS = [
  { value: 2, label: '2 days', desc: 'Light commitment, solid foundation' },
  { value: 3, label: '3 days', desc: 'The sweet spot for most people' },
  { value: 4, label: '4 days', desc: 'Serious about making progress' },
  { value: 5, label: '5 days', desc: 'High commitment, high return' },
]

export function FrequencyStep({ onNext }: StepProps) {
  const [selected, setSelected] = useState<number | null>(null)

  return (
    <div className="flex flex-col gap-6 flex-1">
      <div>
        <h1 className="text-3xl font-black text-text-primary leading-tight">
          How many days<br />per week?
        </h1>
        <p className="text-text-secondary text-sm mt-2">
          Be realistic. Consistent beats heroic.
        </p>
      </div>
      <div className="flex flex-col gap-3 flex-1">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            onClick={() => setSelected(o.value)}
            className={`p-4 rounded-card border-2 text-left transition-all duration-150 active:scale-[0.98] ${
              selected === o.value
                ? 'border-accent bg-surface'
                : 'border-surface bg-surface'
            }`}
          >
            <p
              className={`font-bold text-base ${
                selected === o.value ? 'text-accent' : 'text-text-primary'
              }`}
            >
              {o.label}
            </p>
            <p className="text-text-secondary text-sm mt-0.5">{o.desc}</p>
          </button>
        ))}
      </div>
      <Button
        fullWidth
        disabled={selected === null}
        onClick={() => selected !== null && onNext({ training_days: selected })}
      >
        CONTINUE
      </Button>
    </div>
  )
}