import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { StepProps } from '@/types/app.types'

export function LimitationsStep({ onNext }: StepProps) {
  const [hasLimitations, setHasLimitations] = useState<boolean | null>(null)
  const [text, setText] = useState('')

  const handleContinue = () => {
    onNext({
      limitations: hasLimitations && text.trim() ? text.trim() : undefined,
    })
  }

  return (
    <div className="flex flex-col gap-6 flex-1">
      <div>
        <h1 className="text-3xl font-black text-text-primary leading-tight">
          Any injuries or<br />limitations?
        </h1>
        <p className="text-text-secondary text-sm mt-2">
          We'll program around them.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={() => setHasLimitations(false)}
          className={`p-4 rounded-card border-2 text-left transition-all duration-150 active:scale-[0.98] ${
            hasLimitations === false
              ? 'border-accent bg-surface'
              : 'border-surface bg-surface'
          }`}
        >
          <p className={`font-bold text-base ${hasLimitations === false ? 'text-accent' : 'text-text-primary'}`}>
            No, all good
          </p>
          <p className="text-text-secondary text-sm mt-0.5">
            No pain, injuries, or restrictions
          </p>
        </button>

        <button
          onClick={() => setHasLimitations(true)}
          className={`p-4 rounded-card border-2 text-left transition-all duration-150 active:scale-[0.98] ${
            hasLimitations === true
              ? 'border-accent bg-surface'
              : 'border-surface bg-surface'
          }`}
        >
          <p className={`font-bold text-base ${hasLimitations === true ? 'text-accent' : 'text-text-primary'}`}>
            Yes, I have some
          </p>
          <p className="text-text-secondary text-sm mt-0.5">
            I'll describe them briefly
          </p>
        </button>
      </div>

      {hasLimitations === true && (
        <div className="flex flex-col gap-2">
          <p className="text-text-secondary text-sm">
            Describe briefly (e.g. "bad left knee", "shoulder impingement"):
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type here..."
            rows={3}
            className="w-full bg-surface rounded-card px-4 py-3 text-text-primary border border-text-disabled focus:border-accent outline-none resize-none text-sm"
          />
        </div>
      )}

      <div className="mt-auto">
        <Button
          fullWidth
          disabled={
            hasLimitations === null ||
            (hasLimitations === true && text.trim().length === 0)
          }
          onClick={handleContinue}
        >
          CONTINUE
        </Button>
      </div>
    </div>
  )
}
