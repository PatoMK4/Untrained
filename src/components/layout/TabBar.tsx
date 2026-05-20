import { useLocation, useNavigate } from 'react-router-dom'

const C = { lime: '#c8ff00', mute: '#5d5d5a', line: '#242424' }
const F = { mono: '"JetBrains Mono",ui-monospace,monospace' }

function Glyph({ kind, active }: { kind: string; active: boolean }) {
  const s = active ? C.lime : C.mute
  const sw = 1.6
  const shapes: Record<string, React.ReactNode> = {
    bolt: <path d="M9 1L3 9h4l-1 6 6-8H8l1-6z" stroke={s} strokeWidth={sw} fill={active ? s : 'none'} strokeLinejoin="round"/>,
    grid: <><rect x="1" y="1" width="6" height="6" stroke={s} strokeWidth={sw} fill="none"/><rect x="9" y="1" width="6" height="6" stroke={s} strokeWidth={sw} fill="none"/><rect x="1" y="9" width="6" height="6" stroke={s} strokeWidth={sw} fill="none"/><rect x="9" y="9" width="6" height="6" stroke={s} strokeWidth={sw} fill="none"/></>,
    chat: <path d="M1 4a3 3 0 013-3h8a3 3 0 013 3v5a3 3 0 01-3 3H6l-4 3v-3a3 3 0 01-1-2V4z" stroke={s} strokeWidth={sw} fill="none" strokeLinejoin="round"/>,
    bars: <><rect x="1" y="9" width="3" height="6" fill={s}/><rect x="6.5" y="5" width="3" height="10" fill={s}/><rect x="12" y="1" width="3" height="14" fill={s}/></>,
    user: <><circle cx="8" cy="5" r="3" stroke={s} strokeWidth={sw} fill="none"/><path d="M2 15c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke={s} strokeWidth={sw} fill="none"/></>,
  }
  return <svg width={16} height={16} viewBox="0 0 16 16">{shapes[kind]}</svg>
}

const tabs = [
  { to: '/', label: 'TODAY', glyph: 'bolt' },
  { to: '/program', label: 'PROGRAM', glyph: 'grid' },
  { to: '/coach', label: 'COACH', glyph: 'chat' },
  { to: '/progress', label: 'PROGRESS', glyph: 'bars' },
  { to: '/profile', label: 'ME', glyph: 'user' },
]

export function TabBar() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50,
      paddingBottom: 30,
      background: 'linear-gradient(180deg, rgba(5,5,5,0) 0%, #050505 35%)',
      pointerEvents: 'none',
      display: 'flex', justifyContent: 'center',
    }}>
      <div style={{
        width: '100%', maxWidth: 402, margin: '0 16px', height: 54,
        borderTop: '1px solid ' + C.line,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 6px', pointerEvents: 'auto',
      }}>
        {tabs.map(({ to, label, glyph }) => {
          const on = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
          return (
            <button
              key={to}
              onClick={() => navigate(to)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 4, padding: '6px 0',
                background: 'transparent', border: 0, cursor: 'pointer',
              }}
            >
              <Glyph kind={glyph} active={on} />
              <span style={{
                fontFamily: F.mono, fontSize: 9, letterSpacing: '0.14em',
                color: on ? C.lime : C.mute, textTransform: 'uppercase',
              }}>{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
