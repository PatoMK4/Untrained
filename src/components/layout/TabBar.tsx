import { useLocation, useNavigate } from 'react-router-dom'
import { useSessionStore } from '@/stores/sessionStore'

function BoltIcon({ active }: { active: boolean }) {
  const c = active ? '#c8ff00' : '#5d5d5a'
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M9 1L3 9h4l-1 6 6-8H8l1-6z" stroke={c} strokeWidth="1.6" fill={active ? c : 'none'} strokeLinejoin="round" />
    </svg>
  )
}

function BarsIcon({ active }: { active: boolean }) {
  const c = active ? '#c8ff00' : '#5d5d5a'
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <rect x="1" y="9" width="3" height="6" fill={c} />
      <rect x="6.5" y="5" width="3" height="10" fill={c} />
      <rect x="12" y="1" width="3" height="14" fill={c} />
    </svg>
  )
}

function UserIcon({ active }: { active: boolean }) {
  const c = active ? '#c8ff00' : '#5d5d5a'
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <circle cx="8" cy="5" r="3" stroke={c} strokeWidth="1.6" fill="none" />
      <path d="M2 15c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke={c} strokeWidth="1.6" fill="none" />
    </svg>
  )
}

const tabs = [
  { to: '/', label: 'TODAY', Icon: BoltIcon },
  { to: '/progress', label: 'PROGRESS', Icon: BarsIcon },
  { to: '/profile', label: 'PROFILE', Icon: UserIcon },
]

export function TabBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isActive } = useSessionStore()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center"
      style={{
        background: 'linear-gradient(180deg, rgba(5,5,5,0) 0%, #050505 35%)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)',
      }}
    >
      <div
        className="w-full max-w-md flex items-center"
        style={{ borderTop: '1px solid #242424', height: 54, margin: '0 16px' }}
      >
        {tabs.map(({ to, label, Icon }) => {
          const on = to === '/' ? location.pathname === '/' || isActive : location.pathname.startsWith(to)
          return (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="flex flex-col items-center justify-center gap-1 flex-1 h-full min-h-[44px]"
            >
              <Icon active={on} />
              <span
                style={{
                  fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                  fontSize: 9,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: on ? '#c8ff00' : '#5d5d5a',
                }}
              >
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
