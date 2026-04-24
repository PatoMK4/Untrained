import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { StepProps, SplitPreference } from '@/types/app.types'

const splits: {
  value: SplitPreference
  label: string
  description: string
  scienceNote: string
  icon: string
}[] = [
  {
    value: 'full_body',
    label: 'Full Body',
    description: 'Train everything each session. Best for beginners and busy schedules.',
    scienceNote: '2–4 sessions/week · Each muscle hit 2–4x',
    icon: '⚡',
  },
  {
    value: 'ppl',
    label: 'Push / Pull / Legs',
    description: 'Chest & shoulders one day, back & biceps the next, then legs.',
    scienceNote: '3 or 6 sessions/week · Each muscle hit 1–2x',
    icon: '🔄',
  },
  {
    value: 'upper_lower',
    label: 'Upper / Lower',
    description: 'Upper body one day, lower body the next. Efficient and balanced.',
    scienceNote: '4 sessions/week · Each muscle hit 2x',
    icon: '⬆️',
  },
  {
    value: 'bro_split',
    label: 'Muscle Group Split',
    description: 'One muscle group per session, high volume per day.',
    scienceNote: '5–6 sessions/week · Advanced users only',
    icon: '💪',
  },
]

export function SplitPreferenceStep({ onNext, onBack, data }: StepProps) {
  const [selected, setSelected] = useState<SplitPreference | null>(
    data.split_preference ?? null
  )

  const trainingDays = data.training_days ?? 3

  return (
    <div className="flex flex-col flex-1">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-text-primary leading-tight">
          How do you like to train?
        </h1>
        <p className="text-text-secondary text-sm mt-2">
          Pick the structure that fits your life. You can change this later.
        </p>
      </div>

      <div className="flex flex-col gap-3 flex-1">
        {splits.map((split) => {
          const isRecommended = split.value === 'full_body' && trainingDays <= 3
          const isWarning = split.value === 'bro_split' && trainingDays < 5
          const isSelected = selected === split.value

          return (
            <button
              key={split.value}
              onClick={() => setSelected(split.value)}
              className={cn(
                'w-full text-left rounded-card p-4 border-2 transition-all active:scale-[0.99]',
                isSelected
                  ? 'border-accent bg-surface'
                  : 'border-text-disabled bg-surface'
              )}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">{split.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={cn(
                      'font-bold text-sm tracking-wide',
                      isSelected ? 'text-accent' : 'text-text-primary'
                    )}>
                      {split.label}
                    </p>
                    {isRecommended && (
                      <span className="text-xs bg-accent text-navbar font-bold px-2 py-0.5 rounded-pill">
                        RECOMMENDED
                      </span>
                    )}
                    {isWarning && (
                      <span className="text-xs text-warning font-bold">
                        Best for 5+ days/week
                      </span>
                    )}
                  </div>
                  <p className="text-text-secondary text-sm mt-1 leading-snug">
                    {split.description}
                  </p>
                  <p className="text-text-disabled text-xs mt-1.5">
                    {split.scienceNote}
                  </p>
                </div>
                {isSelected && (
                  <span className="text-accent font-bold text-sm shrink-0">✓</span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex gap-3 mt-6">
        {onBack && (
          <Button variant="secondary" onClick={onBack} className="w-24">
            ← BACK
          </Button>
        )}
        <Button
          fullWidth
          disabled={!selected}
          onClick={() => selected && onNext({ split_preference: selected })}
        >
          CONTINUE →
        </Button>
      </div>
    </div>
  )
}