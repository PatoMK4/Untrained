import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
  arrow?: boolean
  sub?: string
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading,
      fullWidth,
      arrow = true,
      sub,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const base =
      'inline-flex items-center justify-between transition-all duration-100 active:brightness-90 disabled:opacity-40 disabled:cursor-not-allowed select-none'

    const variants = {
      primary: 'bg-accent text-[#0a0a0a]',
      ghost: 'bg-transparent text-text-primary border border-line-2',
      danger: 'bg-danger text-white',
    }

    const sizes = {
      sm: 'h-10 px-4',
      md: 'h-12 px-5',
      lg: 'h-[58px] px-5',
    }

    const fontStyle = {
      fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif',
      fontWeight: 700,
      fontSize: size === 'lg' ? '1.5rem' : size === 'md' ? '1.25rem' : '1rem',
      letterSpacing: '0.04em',
      textTransform: 'uppercase' as const,
      borderRadius: 2,
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
        style={fontStyle}
        {...props}
      >
        <span className="flex items-center gap-3">
          {loading && (
            <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" />
          )}
          {children}
        </span>
        <span className="flex items-center gap-2">
          {sub && (
            <span
              style={{
                fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                fontWeight: 400,
                fontSize: '0.625rem',
                letterSpacing: '0.12em',
                opacity: 0.6,
                textTransform: 'uppercase',
              }}
            >
              {sub}
            </span>
          )}
          {arrow && (
            <svg width="22" height="14" viewBox="0 0 22 14" fill="none">
              <path d="M0 7h20M14 1l6 6-6 6" stroke="currentColor" strokeWidth="2" />
            </svg>
          )}
        </span>
      </button>
    )
  }
)

Button.displayName = 'Button'
