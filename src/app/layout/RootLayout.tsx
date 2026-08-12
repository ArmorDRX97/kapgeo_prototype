import { Navigate, Outlet, useRouterState } from '@tanstack/react-router'
import { useSession } from '../../entities/session/model/sessionContext'
import { hasPermission, type Permission } from '../../shared/auth/permissions'
import { ForbiddenPage } from '../../pages/system/ForbiddenPage'
import { AppShell } from './AppShell'

const protectedAreas: Array<{ prefix: string; permission: Permission }> = [
  { prefix: '/admin', permission: 'administration.view' },
  { prefix: '/analytics', permission: 'analytics.view' },
  { prefix: '/modeling', permission: 'modeling.view' },
  { prefix: '/technology', permission: 'technology.view' },
  { prefix: '/geology', permission: 'geology.view' },
  { prefix: '/objects/wells', permission: 'geology.view' },
  { prefix: '/work', permission: 'work.view' },
  { prefix: '/home', permission: 'home.view' },
]

export function RootLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { status, persona } = useSession()
  const isAuthRoute = pathname.startsWith('/auth')

  if (!isAuthRoute && status !== 'authenticated') return <Navigate to="/auth/sign-in" />
  if (isAuthRoute) return <Outlet />

  const requiredPermission = protectedAreas.find(({ prefix }) => pathname.startsWith(prefix))?.permission
  if (requiredPermission && !hasPermission(persona, requiredPermission)) {
    return <AppShell><ForbiddenPage /></AppShell>
  }

  return <AppShell><Outlet /></AppShell>
}
