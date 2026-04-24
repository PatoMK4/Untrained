import { Outlet } from 'react-router-dom'
import { TabBar } from './TabBar'

export function AppShell() {
  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col items-center">
      <main className="w-full max-w-md pb-24 px-5">
        <Outlet />
      </main>
      <TabBar />
    </div>
  )
}