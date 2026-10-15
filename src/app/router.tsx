import { mapRepository } from '../repository/demo/mapRepository'
import { createBrowserHistory, createHashHistory, createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router'
import { RootLayout } from './layout/RootLayout'
import { SignInPage } from '../pages/auth/SignInPage'
import { BgdNewWellPage, BgdWellPage } from '../pages/geology/BgdWellPage'
import { GeoBaseDepositPage } from '../pages/geology/GeoBaseDepositPage'
import { GeoBaseDepositConditionsPage } from '../pages/geology/GeoBaseDepositConditionsPage'
import { GeoBasePage } from '../pages/geology/GeoBasePage'
import { ProfilePage } from '../pages/profile/ProfilePage'
import { NotFoundPage } from '../pages/system/NotFoundPage'
import { AccessDeniedPage, AnalyticsModulePage, ModelingModulePage, TechnologyModulePage } from '../pages/system/ModulePlaceholderPage'
import { InterpretationPage } from '../pages/geology/InterpretationPage'
import { AlphaInterpretationPage } from '../pages/geology/AlphaInterpretationPage'
import { validateAlphaSearch } from '../features/interpretation/alpha/search'
import { SectionsPage } from '../pages/geology/SectionsPage'
import { PlansPage } from '../pages/geology/PlansPage'
import { validatePlanSearch } from '../features/geology-plan/search'
import { validateSectionSearch } from '../features/geology-sections/model/search'
import { validateInterpretationSearch } from '../features/interpretation/model/search'
import { AdminPage } from '../pages/admin/AdminPage'
import { ReferenceDataPage } from '../pages/admin/ReferenceDataPage'
import { userPersonas } from '../entities/session/model/personas'
import { validateBgdWellSectionSearch } from '../features/geobase/model/bgdWellSection'
import { validateDepositSectionSearch } from '../features/geobase/model/depositSection'
import { KnowledgeMapPage } from '../pages/team/KnowledgeMapPage'
import { validateKnowledgeSearch } from '../internal/knowledge-map/integration/protocol'

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
const geologyRoute = createRoute({ getParentRoute: () => rootRoute, path: '/geology', validateSearch: validateInterpretationSearch, beforeLoad: async ({ search }) => {
  if (Object.values(search).some(value => value !== undefined)) throw redirect({ to: '/geology/interpretation', search, replace: true })
  let first: string|undefined
  try { first=(await mapRepository.list())[0]?.id } catch { /* The registry owns corrupt-storage recovery. */ }
  if(first)throw redirect({ to: '/geology/plans/$projectId', params: {projectId:first}, replace: true })
  throw redirect({to:'/geology/plans',replace:true})
} })
const interpretationRoute = createRoute({ getParentRoute: () => rootRoute, path: '/geology/interpretation', validateSearch: validateInterpretationSearch, beforeLoad: ({ search }) => {
  if (!search.mode) throw redirect({ to: '/geology/interpretation/$method', params: { method: 'gamma' }, search: { well: search.well, from: search.from, to: search.to }, replace: true })
}, component: InterpretationPage })
const alphaInterpretationRoute = createRoute({ getParentRoute: () => rootRoute, path: '/geology/interpretation/$method', validateSearch: validateAlphaSearch, component: AlphaInterpretationPage })
const sectionsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/geology/sections', component: SectionsPage })
const sectionRoute = createRoute({ getParentRoute: () => rootRoute, path: '/geology/sections/$sectionId', validateSearch: validateSectionSearch, component: SectionsPage })
const plansRoute = createRoute({ getParentRoute: () => rootRoute, path: '/geology/plans', component: PlansPage })
const planRoute = createRoute({ getParentRoute: () => rootRoute, path: '/geology/plans/$projectId', validateSearch: validatePlanSearch, component: PlansPage })
const geoBaseRoute = createRoute({ getParentRoute: () => rootRoute, path: '/geology/bgd', component: GeoBasePage })
const geoBaseDepositRoute = createRoute({ getParentRoute: () => rootRoute, path: '/geology/bgd/$depositId', validateSearch: validateDepositSectionSearch, beforeLoad: ({ params, search }) => {
  if (search.section === 'conditions') throw redirect({ to: '/geology/bgd/$depositId/conditions', params, replace: true })
}, component: GeoBaseDepositPage })
const geoBaseDepositConditionsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/geology/bgd/$depositId/conditions', component: GeoBaseDepositConditionsPage })
const bgdNewWellRoute = createRoute({ getParentRoute: () => rootRoute, path: '/geology/bgd/$depositId/wells/new', validateSearch: validateBgdWellSectionSearch, component: BgdNewWellPage })
const bgdWellRoute = createRoute({ getParentRoute: () => rootRoute, path: '/geology/bgd/$depositId/wells/$wellId', validateSearch: validateBgdWellSectionSearch, component: BgdWellPage })
const profileRoute = createRoute({ getParentRoute: () => rootRoute, path: '/profile', component: ProfilePage })
const knowledgeMapRoute = createRoute({ getParentRoute: () => rootRoute, path: '/team/knowledge-map', validateSearch: validateKnowledgeSearch, component: KnowledgeMapPage })
const technologyRoute = createRoute({ getParentRoute: () => rootRoute, path: '/technology', component: TechnologyModulePage })
const modelingRoute = createRoute({ getParentRoute: () => rootRoute, path: '/modeling', component: ModelingModulePage })
const analyticsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/analytics', component: AnalyticsModulePage })
const adminRoute = createRoute({ getParentRoute: () => rootRoute, path: '/admin', component: AdminPage })
const referencesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/admin/references', validateSearch: (search: Record<string, unknown>): { dictionary?: string; entry?: string } => ({ dictionary: typeof search.dictionary === 'string' ? search.dictionary : undefined, entry: typeof search.entry === 'string' ? search.entry : undefined }), component: ReferenceDataPage })
const forbiddenRoute = createRoute({ getParentRoute: () => rootRoute, path: '/forbidden', component: () => <AccessDeniedPage moduleName="выбранный раздел" /> })

const routeTree = rootRoute.addChildren([
  indexRoute,
  signInRoute,
  geologyRoute,
  interpretationRoute,
  alphaInterpretationRoute,
  sectionsRoute,
  sectionRoute,
  plansRoute,
  planRoute,
  geoBaseRoute,
  geoBaseDepositRoute,
  geoBaseDepositConditionsRoute,
  bgdNewWellRoute,
  bgdWellRoute,
  profileRoute,
  knowledgeMapRoute,
  technologyRoute,
  modelingRoute,
  analyticsRoute,
  adminRoute,
  referencesRoute,
  forbiddenRoute,
])

const history = import.meta.env.PROD ? createHashHistory() : createBrowserHistory()

export const router = createRouter({ routeTree, history, defaultPreload: 'intent', scrollRestoration: true })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
