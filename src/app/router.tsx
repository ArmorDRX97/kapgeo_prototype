import { createBrowserHistory, createHashHistory, createRootRoute, createRoute, createRouter, Navigate } from '@tanstack/react-router'
import { RootLayout } from './layout/RootLayout'
import { SignInPage } from '../pages/auth/SignInPage'
import { BgdNewWellPage, BgdWellPage } from '../pages/geology/BgdWellPage'
import { GeoBaseDepositPage } from '../pages/geology/GeoBaseDepositPage'
import { GeoBasePage } from '../pages/geology/GeoBasePage'
import { ProfilePage } from '../pages/profile/ProfilePage'
import { NotFoundPage } from '../pages/system/NotFoundPage'
import { validateBgdWellSectionSearch } from '../features/geobase/model/bgdWellSection'
import { validateDepositSectionSearch } from '../features/geobase/model/depositSection'

const rootRoute = createRootRoute({ component: RootLayout, notFoundComponent: NotFoundPage })
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: () => <Navigate to="/geology/bgd" /> })
const signInRoute = createRoute({ getParentRoute: () => rootRoute, path: '/auth/sign-in', component: SignInPage })
const geoBaseRoute = createRoute({ getParentRoute: () => rootRoute, path: '/geology/bgd', component: GeoBasePage })
const geoBaseDepositRoute = createRoute({ getParentRoute: () => rootRoute, path: '/geology/bgd/$depositId', validateSearch: validateDepositSectionSearch, component: GeoBaseDepositPage })
const bgdNewWellRoute = createRoute({ getParentRoute: () => rootRoute, path: '/geology/bgd/$depositId/wells/new', validateSearch: validateBgdWellSectionSearch, component: BgdNewWellPage })
const bgdWellRoute = createRoute({ getParentRoute: () => rootRoute, path: '/geology/bgd/$depositId/wells/$wellId', validateSearch: validateBgdWellSectionSearch, component: BgdWellPage })
const profileRoute = createRoute({ getParentRoute: () => rootRoute, path: '/profile', component: ProfilePage })

const routeTree = rootRoute.addChildren([
  indexRoute,
  signInRoute,
  geoBaseRoute,
  geoBaseDepositRoute,
  bgdNewWellRoute,
  bgdWellRoute,
  profileRoute,
])

const history = import.meta.env.PROD ? createHashHistory() : createBrowserHistory()

export const router = createRouter({ routeTree, history, defaultPreload: 'intent', scrollRestoration: true })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
