// src/pages/onboarding/steps/EnvironmentStep.tsx

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { StepProps, Environment } from '@/types/app.types'

const OPTIONS: { value: Environment; label: string; desc: string }[] = [
  { value: 'home', label: 'Home', desc: 'No gym, training wherever I am' },
  { value: 'gym', label: 'Gym', desc: 'I have access to a full gym' },
  { value: 'both', label: 'Both', desc: 'Mix of home and gym sessions' },
  { value: 'outdoors', label: 'Outdoors', desc: 'Parks, outdoor spaces' },
]

export function EnvironmentStep({ onNext }: StepProps) {
  const [selected, setSelected] = useState<Environment | null>(null)

  return (
    <div className="flex flex-col gap-6 flex-1">
      <div>
        <h1 className="text-3xl font-black text-text-primary leading-tight">
          Where do you<br />train?
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
        onClick={() => selected && onNext({ environment: selected })}
      >
        CONTINUE
      </Button>
    </div>
  )
}