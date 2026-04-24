interface WordmarkProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Wordmark({ size = 'md' }: WordmarkProps) {
  const sizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-5xl',
  }
  return (
    <span className={`font-black tracking-widest text-text-primary ${sizes[size]}`}>
      UNTR<span className="text-accent">A</span>INED
    </span>
  )
}
