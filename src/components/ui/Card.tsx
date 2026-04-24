import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  accent?: boolean
  onClick?: () => void
  as?: 'div' | 'button'
}

export function Card({
  children,
  className,
  accent,
  onClick,
  as: Tag = onClick ? 'button' : 'div',
}: CardProps) {
  return (
    <Tag
      onClick={onClick}
      className={cn(
        'bg-surface rounded-card p-4 w-full text-left',
        accent && 'border-l-4 border-accent',
        onClick && 'active:brightness-110 transition-all cursor-pointer',
        className
      )}
    >
      {children}
    </Tag>
  )
}
