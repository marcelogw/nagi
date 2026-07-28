import { Outlet } from '@tanstack/react-router'

export function ShellRoute() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <Outlet />
    </div>
  )
}
