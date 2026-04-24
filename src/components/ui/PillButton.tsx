// src/components/ui/PillButton.tsx

import { cn } from '@/lib/utils'

interface PillButtonProps {
  label: string
  selected?: boolean
  onClick: () => void
  color?: 'accent' | 'success' | 'danger'
  fullWidth?: boolean
}

export function PillButton({
  label,
  selected,
  onClick,
  color = 'accent',
  fullWidth = false,
}: PillButtonProps) {
  const colors = {
    accent: 'border-accent text-accent',
    success: 'border-success text-success',
    danger: 'border-danger text-danger',
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'h-11 px-4 rounded-pill border-2 font-bold text-sm tracking-widest transition-all duration-150 active:scale-95',
        fullWidth ? 'w-full' : 'min-w-[90px]',
        selected ? colors[color] : 'border-text-disabled text-text-disabled'
      )}
    >
      {label}
    </button>
  )
}