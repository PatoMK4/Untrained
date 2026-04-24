// src/components/ui/NumberPicker.tsx

import { useRef, useCallback } from 'react'

interface NumberPickerProps {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  label?: string
}

export function NumberPicker({
  value,
  onChange,
  min = 0,
  max = 100,
  label,
}: NumberPickerProps) {
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const speedRef = useRef(300)
  const valueRef = useRef(value)
  valueRef.current = value

  const stopHold = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    intervalRef.current = null
    timeoutRef.current = null
    speedRef.current = 300
  }, [])

  const startHold = useCallback(
    (direction: 1 | -1) => {
      // Tick function — fires on each interval
      const tick = () => {
        const next = Math.min(max, Math.max(min, valueRef.current + direction))
        onChange(next)
      }

      // Accelerating repeat: starts at 300ms, ramps to 50ms
      const scheduleNext = (delay: number) => {
        intervalRef.current = setTimeout(() => {
          tick()
          const nextDelay = Math.max(50, delay * 0.8)
          scheduleNext(nextDelay)
        }, delay)
      }

      // First tap fires immediately
      tick()
      // Then start accelerating holds after 400ms
      timeoutRef.current = setTimeout(() => {
        scheduleNext(300)
      }, 400)
    },
    [min, max, onChange]
  )

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {label && (
        <p className="text-text-secondary text-sm text-center">{label}</p>
      )}
      <div className="flex items-center justify-center gap-6 w-full">
        <button
          onPointerDown={() => startHold(-1)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          className="w-14 h-14 rounded-full bg-surface text-text-primary text-2xl font-bold active:bg-surface-raised active:scale-95 transition-all select-none touch-none"
        >
          −
        </button>
        <span className="text-6xl font-black text-text-primary w-20 text-center tabular-nums">
          {value}
        </span>
        <button
          onPointerDown={() => startHold(1)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          className="w-14 h-14 rounded-full bg-surface text-text-primary text-2xl font-bold active:bg-surface-raised active:scale-95 transition-all select-none touch-none"
        >
          +
        </button>
      </div>
    </div>
  )
}