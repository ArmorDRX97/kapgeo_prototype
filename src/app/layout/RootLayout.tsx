import { Outlet, useRouterState } from '@tanstack/react-router'
import { useSession } from '../../entities/session/model/sessionContext'
import { hasPermission, type Permission } from '../../shared/auth/permissions'
import { AccessDeniedPage } from '../../pages/system/ModulePlaceholderPage'
import { AppShell } from './AppShell'

export function RootLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { status, persona } = useSession()
  const isAuthRoute = pathname.startsWith('/auth')

  if (!isAuthRoute && status !== 'authenticated') return <div className="page-loading"><span /><p>Открываем вход в систему…</p></div>
  if (isAuthRoute) return <Outlet />

  const guardedModules: Array<{ prefix: string; permission: Permission; name: string }> = [
    { prefix: '/geology/bgd', permission: 'bgd.view', name: 'БГД' },
    { prefix: '/geology', permission: 'geology.view', name: 'Геология' },
    { prefix: '/technology', permission: 'technology.view', name: 'Технология' },
    { prefix: '/modeling', permission: 'modeling.view', name: 'Моделирование' },
    { prefix: '/analytics', permission: 'analytics.view', name: 'Аналитика' },
    { prefix: '/admin', permission: 'administration.view', name: 'Администрирование' },
  ]
  const requiredModule = guardedModules.find((item) => pathname.startsWith(item.prefix))
  if (requiredModule && !hasPermission(persona, requiredModule.permission)) {
    return <AppShell><AccessDeniedPage moduleName={requiredModule.name} /></AppShell>
  }

  return <AppShell><Outlet /></AppShell>
}
