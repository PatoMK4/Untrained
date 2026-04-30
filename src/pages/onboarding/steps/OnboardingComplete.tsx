// src/pages/onboarding/steps/OnboardingComplete.tsx

import { Button } from '@/components/ui/Button'
import type { StepProps } from '@/types/app.types'

interface OnboardingCompleteProps extends StepProps {
  submitting?: boolean
  loading?: boolean
}

export function OnboardingComplete({ onNext, loading }: OnboardingCompleteProps) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-8 text-center">
      <div className="flex flex-col gap-4">
        <h1 className="text-5xl font-black text-text-primary leading-tight">
          YOU'RE SET.
        </h1>
        <p className="text-text-secondary text-base">
          Untrained is building your first session.
        </p>
      </div>
      <Button fullWidth loading={loading} onClick={() => onNext({})}>
        LET'S GO →
      </Button>
    </div>
  )
}