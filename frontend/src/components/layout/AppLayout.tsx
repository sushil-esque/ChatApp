import { Outlet } from 'react-router-dom'

export function AppLayout() {
  return (
    <div className="dark flex h-screen">
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}