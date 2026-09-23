import { createBrowserHistory, createHashHistory, createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router'
import { RootLayout } from './layout/RootLayout'
import { SignInPage } from '../pages/auth/SignInPage'
import { BgdNewWellPage, BgdWellPage } from '../pages/geology/BgdWellPage'
import { GeoBaseDepositPage } from '../pages/geology/GeoBaseDepositPage'
import { GeoBasePage } from '../pages/geology/GeoBasePage'
import { ProfilePage } from '../pages/profile/ProfilePage'
import { NotFoundPage } from '../pages/system/NotFoundPage'
import { AccessDeniedPage, AnalyticsModulePage, GeologyModulePage, ModelingModulePage, TechnologyModulePage } from '../pages/system/ModulePlaceholderPage'
import { AdminPage } from '../pages/admin/AdminPage'
import { userPersonas } from '../entities/session/model/personas'
import { validateBgdWellSectionSearch } from '../features/geobase/model/bgdWellSection'
import { validateDepositSectionSearch } from '../features/geobase/model/depositSection'

const SESSION_PERSONA_KEY = 'kapgeo.persona'

function getStoredPersona() {
  const personaId = window.sessionStorage.getItem(SESSION_PERSONA_KEY)
  return userPersonas.find((persona) => persona.id === personaId)
}

const rootRoute = createRootRoute({
  beforeLoad: ({ location }) => {
    if (!location.pathname.startsWith('/auth') && !getStoredPersona()) throw redirect({ to: '/auth/sign-in' })
  },
  component: RootLayout,
  notFoundComponent: NotFoundPage,
})
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: getStoredPersona()?.homeRoute ?? '/auth/sign-in' })
  },
})
const signInRoute = createRoute({ getParentRoute: () => rootRoute, path: '/auth/sign-in', component: SignInPage })
const geologyRoute = createRoute({ getParentRoute: () => rootRoute, path: '/geology', component: GeologyModulePage })
const geoBaseRoute = createRoute({ getParentRoute: () => rootRoute, path: '/geology/bgd', component: GeoBasePage })
const geoBaseDepositRoute = createRoute({ getParentRoute: () => rootRoute, path: '/geology/bgd/$depositId', validateSearch: validateDepositSectionSearch, component: GeoBaseDepositPage })
const bgdNewWellRoute = createRoute({ getParentRoute: () => rootRoute, path: '/geology/bgd/$depositId/wells/new', validateSearch: validateBgdWellSectionSearch, component: BgdNewWellPage })
const bgdWellRoute = createRoute({ getParentRoute: () => rootRoute, path: '/geology/bgd/$depositId/wells/$wellId', validateSearch: validateBgdWellSectionSearch, component: BgdWellPage })
const profileRoute = createRoute({ getParentRoute: () => rootRoute, path: '/profile', component: ProfilePage })
const technologyRoute = createRoute({ getParentRoute: () => rootRoute, path: '/technology', component: TechnologyModulePage })
const modelingRoute = createRoute({ getParentRoute: () => rootRoute, path: '/modeling', component: ModelingModulePage })
const analyticsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/analytics', component: AnalyticsModulePage })
const adminRoute = createRoute({ getParentRoute: () => rootRoute, path: '/admin', component: AdminPage })
const forbiddenRoute = createRoute({ getParentRoute: () => rootRoute, path: '/forbidden', component: () => <AccessDeniedPage moduleName="выбранный раздел" /> })

const routeTree = rootRoute.addChildren([
  indexRoute,
  signInRoute,
  geologyRoute,
  geoBaseRoute,
  geoBaseDepositRoute,
  bgdNewWellRoute,
  bgdWellRoute,
  profileRoute,
  technologyRoute,
  modelingRoute,
  analyticsRoute,
  adminRoute,
  forbiddenRoute,
])

const history = import.meta.env.PROD ? createHashHistory() : createBrowserHistory()

export const router = createRouter({ routeTree, history, defaultPreload: 'intent', scrollRestoration: true })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
