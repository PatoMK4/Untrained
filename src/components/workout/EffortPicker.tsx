import type { Effort } from '@/types/app.types'

interface Props {
  value: Effort | null
  onChange: (e: Effort) => void
}

const opts: { value: Effort; label: string; cls: string }[] = [
  { value: 'easy', label: 'EASY', cls: 'border-success text-success' },
  { value: 'medium', label: 'MEDIUM', cls: 'border-accent text-accent' },
  { value: 'hard', label: 'HARD', cls: 'border-danger text-danger' },
]

export function EffortPicker({ value, onChange }: Props) {
  return (
    <div className="flex gap-2 w-full">
      {opts.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 h-12 rounded-pill border-2 font-bold text-xs tracking-widest transition-all active:scale-95
            ${value === o.value ? o.cls : 'border-text-disabled text-text-disabled'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
