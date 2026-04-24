// src/pages/onboarding/steps/EquipmentStep.tsx

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { StepProps, Equipment } from '@/types/app.types'

const OPTIONS: { value: Equipment; label: string; desc: string }[] = [
  { value: 'none', label: 'Nothing', desc: 'Bodyweight only' },
  { value: 'pullup_bar', label: 'Pull-up bar', desc: 'Doorframe or mounted bar' },
  { value: 'rings', label: 'Gymnastic rings', desc: 'Suspended rings' },
  { value: 'gym', label: 'Full gym', desc: 'Barbells, machines, cables' },
]

export function EquipmentStep({ onNext }: StepProps) {
  const [selected, setSelected] = useState<Equipment[]>([])

  const toggle = (value: Equipment) => {
    setSelected((prev) => {
      if (value === 'none') return ['none']
      const withoutNone = prev.filter((v) => v !== 'none')
      return withoutNone.includes(value)
        ? withoutNone.filter((v) => v !== value)
        : [...withoutNone, value]
    })
  }

  return (
    <div className="flex flex-col gap-6 flex-1">
      <div>
        <h1 className="text-3xl font-black text-text-primary leading-tight">
          What equipment<br />do you have?
        </h1>
        <p className="text-text-secondary text-sm mt-2">
          Select all that apply.
        </p>
      </div>
      <div className="flex flex-col gap-3 flex-1">
        {OPTIONS.map((o) => {
          const isSelected = selected.includes(o.value)
          return (
            <button
              key={o.value}
              onClick={() => toggle(o.value)}
              className={`p-4 rounded-card border-2 text-left transition-all duration-150 active:scale-[0.98] ${
                isSelected
                  ? 'border-accent bg-surface'
                  : 'border-surface bg-surface'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={`font-bold text-base ${
                      isSelected ? 'text-accent' : 'text-text-primary'
                    }`}
                  >
                    {o.label}
                  </p>
                  <p className="text-text-secondary text-sm mt-0.5">{o.desc}</p>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    isSelected ? 'border-accent bg-accent' : 'border-text-disabled'
                  }`}
                >
                  {isSelected && (
                    <span className="text-navbar text-xs font-black">✓</span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
      <Button
        fullWidth
        disabled={selected.length === 0}
        onClick={() => onNext({ equipment: selected })}
      >
        CONTINUE
      </Button>
    </div>
  )
}