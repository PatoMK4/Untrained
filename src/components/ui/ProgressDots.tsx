// src/components/ui/ProgressDots.tsx

interface ProgressDotsProps {
  total: number
  current: number
}

export function ProgressDots({ total, current }: ProgressDotsProps) {
  return (
    <div className="flex gap-2 items-center justify-center">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === current
              ? 'w-6 h-2 bg-accent'
              : i < current
              ? 'w-2 h-2 bg-accent opacity-40'
              : 'w-2 h-2 bg-text-disabled'
          }`}
        />
      ))}
    </div>
  )
}