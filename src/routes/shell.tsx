import { Outlet } from '@tanstack/react-router'
import { useAppliedTheme } from '@/lib/use-theme'

export function ShellRoute() {
  useAppliedTheme()

  return (
    <div className="min-h-svh bg-background text-foreground">
      <Outlet />
    </div>
  )
}
