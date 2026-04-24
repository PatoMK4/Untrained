// src/pages/onboarding/steps/GoalStep.tsx

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { StepProps, Goal } from '@/types/app.types'

const OPTIONS: { value: Goal; label: string; desc: string }[] = [
  { value: 'strength', label: 'Strength', desc: 'Get stronger and more powerful' },
  { value: 'muscle', label: 'Build Muscle', desc: 'Increase size and definition' },
  { value: 'endurance', label: 'Endurance', desc: 'Train longer, fatigue less' },
  { value: 'weight_loss', label: 'Lose Weight', desc: 'Burn fat, lean out' },
  { value: 'overall', label: 'Overall Fitness', desc: 'Balanced health and movement' },
]

export function GoalStep({ onNext }: StepProps) {
  const [selected, setSelected] = useState<Goal | null>(null)

  return (
    <div className="flex flex-col gap-6 flex-1">
      <div>
        <h1 className="text-3xl font-black text-text-primary leading-tight">
          What's your<br />main goal?
        </h1>
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
        disabled={!selected}
        onClick={() => selected && onNext({ goal: selected })}
      >
        CONTINUE
      </Button>
    </div>
  )
}