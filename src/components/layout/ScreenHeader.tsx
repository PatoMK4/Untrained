import { cn } from '@/lib/utils'

interface ScreenHeaderProps {
  title: string
  subtitle?: string
  right?: React.ReactNode
  className?: string
}

export function ScreenHeader({ title, subtitle, right, className }: ScreenHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between pt-6 pb-2', className)}>
      <div className="flex flex-col gap-0.5">
        <h1 className="text-2xl font-black tracking-tight text-text-primary">{title}</h1>
        {subtitle && (
          <p className="text-sm text-text-secondary">{subtitle}</p>
        )}
      </div>
      {right && <div className="flex items-center">{right}</div>}
    </div>
  )
}
