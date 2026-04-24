import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading,
      fullWidth,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const base =
      'inline-flex items-center justify-center font-bold tracking-wide rounded-pill transition-all duration-150 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed select-none'

    const variants = {
      primary: 'bg-accent text-navbar hover:brightness-110',
      secondary: 'bg-surface border border-text-disabled text-text-primary hover:border-accent',
      ghost: 'bg-transparent text-text-secondary hover:text-text-primary',
      danger: 'bg-danger text-white hover:brightness-110',
    }

    const sizes = {
      sm: 'h-9 px-4 text-sm',
      md: 'h-12 px-6 text-base',
      lg: 'h-14 px-8 text-lg',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          base,
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {loading && <span className="mr-2 animate-spin">◌</span>}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
