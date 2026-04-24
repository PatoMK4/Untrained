// src/pages/onboarding/steps/BenchmarkIntro.tsx

import { Button } from '@/components/ui/Button'
import type { StepProps } from '@/types/app.types'

export function BenchmarkIntro({ onNext }: StepProps) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-8 text-center">
      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-black text-text-primary leading-tight">
          LET'S SEE<br />WHERE YOU ARE.
        </h1>
        <p className="text-text-secondary text-base max-w-xs mx-auto">
          No pressure. Be honest — this is your starting line, not your finish line.
        </p>
      </div>
      <Button fullWidth onClick={() => onNext({})}>
        START BENCHMARK →
      </Button>
    </div>
  )
}