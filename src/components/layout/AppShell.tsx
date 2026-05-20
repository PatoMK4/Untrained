import { Outlet } from 'react-router-dom'
import { TabBar } from './TabBar'

export function AppShell() {
  return (
    <div style={{ minHeight: '100dvh', background: '#050505', color: '#f4f4f3', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 402, position: 'relative', minHeight: '100dvh' }}>
        <Outlet />
      </div>
      <TabBar />
    </div>
  )
}
