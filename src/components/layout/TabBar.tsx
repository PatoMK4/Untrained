import { NavLink } from 'react-router-dom'
import { Home, BarChart2, User } from 'lucide-react'

const tabs = [
  { to: '/', label: 'TODAY', Icon: Home },
  { to: '/progress', label: 'PROGRESS', Icon: BarChart2 },
  { to: '/profile', label: 'PROFILE', Icon: User },
]

export function TabBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center bg-navbar border-t border-surface">
      <div className="w-full max-w-md flex items-center h-safe">
        {tabs.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 flex-1 h-full
              ${isActive ? 'text-accent' : 'text-text-disabled'}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
                <span className="text-xs font-bold tracking-widest">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}