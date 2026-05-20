interface PillButtonProps {
  label: string
  selected: boolean
  onClick: () => void
}

export function PillButton({ label, selected, onClick }: PillButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 36,
        padding: '0 12px',
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 11,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        borderRadius: 2,
        border: selected ? '1px solid #c8ff00' : '1px solid #2e2e2e',
        background: selected ? '#c8ff00' : 'transparent',
        color: selected ? '#0a0a0a' : '#c9c9c7',
        transition: 'all 0.1s',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}
