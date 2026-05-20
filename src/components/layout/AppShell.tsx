import { Outlet } from 'react-router-dom'
import { TabBar } from './TabBar'

export function AppShell() {
  return (
    <div className="min-h-[100dvh] bg-background text-text-primary flex flex-col items-center">
      <main className="w-full max-w-md pb-32 px-6">
        <Outlet />
      </main>
      <TabBar />
    </div>
  )
}
