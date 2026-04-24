import { useState, useEffect } from 'react'

interface Props {
  seconds: number
  onDismiss: () => void
  onComplete: () => void
}

export function RestTimer({ seconds, onDismiss, onComplete }: Props) {
  const [left, setLeft] = useState(seconds)

  useEffect(() => {
    if (left <= 0) {
      onComplete()
      return
    }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000)
    return () => clearTimeout(t)
  }, [left, onComplete])

  const circumference = 2 * Math.PI * 44 // r=44
  const progress = ((seconds - left) / seconds) * circumference

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="#1E1E1E"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="#C8FF00"
            strokeWidth="8"
            strokeDasharray={`${progress} ${circumference}`}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-3xl font-black text-text-primary">
          {left}
        </span>
      </div>
      <p className="text-text-secondary text-xs tracking-widest">REST</p>
      <button
        onClick={onDismiss}
        className="text-text-disabled text-xs underline py-2 px-4"
      >
        Skip rest
      </button>
    </div>
  )
}
