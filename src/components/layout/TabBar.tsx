import { useLocation, useNavigate } from 'react-router-dom'
import { Home, BarChart2, User } from 'lucide-react'
import { useSessionStore } from '@/stores/sessionStore'

const tabs = [
  { to: '/', label: 'TODAY', Icon: Home },
  { to: '/progress', label: 'PROGRESS', Icon: BarChart2 },
  { to: '/profile', label: 'PROFILE', Icon: User },
]

export function TabBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isActive } = useSessionStore()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center bg-navbar border-t border-surface">
      <div className="w-full max-w-md flex items-center h-safe">
        {tabs.map(({ to, label, Icon }) => {
          // Today is active if we're on '/' OR if there's an active workout session
          const isTabActive =
            to === '/'
              ? location.pathname === '/' || isActive
              : location.pathname.startsWith(to)

          return (
            <button
              key={to}
              onClick={() => navigate(to)}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full min-h-[56px] transition-colors ${
                isTabActive ? 'text-accent' : 'text-text-disabled'
              }`}
            >
              <Icon size={22} strokeWidth={isTabActive ? 2.5 : 1.5} />
              <span className="text-xs font-bold tracking-widest">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}