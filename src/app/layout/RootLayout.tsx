import { Navigate, Outlet, useRouterState } from '@tanstack/react-router'
import { useSession } from '../../entities/session/model/sessionContext'
import { AppShell } from './AppShell'

export function RootLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { status } = useSession()
  const isAuthRoute = pathname.startsWith('/auth')

  if (!isAuthRoute && status !== 'authenticated') return <Navigate to="/auth/sign-in" />
  if (isAuthRoute) return <Outlet />

  return <AppShell><Outlet /></AppShell>
}
