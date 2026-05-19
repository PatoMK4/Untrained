interface WordmarkProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Wordmark({ size = 'md' }: WordmarkProps) {
  const sizes = {
    sm: '2rem',
    md: '2.5rem',
    lg: '3.5rem',
    xl: '5rem',
  }
  return (
    <span
      style={{
        fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif',
        fontWeight: 800,
        fontSize: sizes[size],
        lineHeight: 1,
        letterSpacing: '-0.02em',
        color: '#f4f4f3',
      }}
    >
      UNTRAIN<span style={{ color: '#c8ff00' }}>E</span>D
    </span>
  )
}
