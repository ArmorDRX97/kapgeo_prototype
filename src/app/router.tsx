import { createBrowserHistory, createHashHistory, createRootRoute, createRoute, createRouter, Navigate } from '@tanstack/react-router'
import { RootLayout } from './layout/RootLayout'
import { AdminPage } from '../pages/admin/AdminPage'
import { AdminOperationsPage } from '../pages/admin/AdminOperationsPage'
import { AnalyticsPage } from '../pages/analytics/AnalyticsPage'
import { AnalyticsDecisionPage } from '../pages/analytics/AnalyticsDecisionPage'
import { AnalyticsReportPage } from '../pages/analytics/AnalyticsReportPage'
import { MfaPage } from '../pages/auth/MfaPage'
import { SignInPage } from '../pages/auth/SignInPage'
import { GeologyOverviewPage } from '../pages/geology/GeologyOverviewPage'
import { GeologyMapPage } from '../pages/geology/GeologyMapPage'
import { GeologyCorrelationPage } from '../pages/geology/GeologyCorrelationPage'
import { ReservesPage } from '../pages/geology/ReservesPage'
import { GeologyDeliveryPage } from '../pages/geology/GeologyDeliveryPage'
import { InterpretationComparePage } from '../pages/geology/InterpretationComparePage'
import { NewWellPage } from '../pages/geology/NewWellPage'
import { WellDetailsPage } from '../pages/geology/WellDetailsPage'
import { WellsPage } from '../pages/geology/WellsPage'
import { HomePage } from '../pages/home/HomePage'
import { AccessibilityPage } from '../pages/help/AccessibilityPage'
import { HelpFlowsPage, HelpHomePage, HelpModulePage, HelpModulesPage, HelpRolePage, HelpRolesPage, HelpStartPage, HelpVerificationPage } from '../help-center'
import { ModelingPage } from '../pages/modeling/ModelingPage'
import { ModelWorkspacePage } from '../pages/modeling/ModelWorkspacePage'
import { ModelRunPage } from '../pages/modeling/ModelRunPage'
import { ModelResultsPage } from '../pages/modeling/ModelResultsPage'
import { ScenarioComparePage } from '../pages/modeling/ScenarioComparePage'
import { NotificationsPage } from '../pages/notifications/NotificationsPage'
import { ProfilePage } from '../pages/profile/ProfilePage'
import { ForbiddenPage } from '../pages/system/ForbiddenPage'
import { NotFoundPage } from '../pages/system/NotFoundPage'
import { TechnologyPage } from '../pages/technology/TechnologyPage'
import { MeasurementsPage } from '../pages/technology/MeasurementsPage'
import { BalancePage } from '../pages/technology/BalancePage'
import { SolutionsPage } from '../pages/technology/SolutionsPage'
import { RvrPage } from '../pages/technology/RvrPage'
import { EquipmentPage } from '../pages/technology/EquipmentPage'
import { PlanFactPage } from '../pages/technology/PlanFactPage'
import { TechLogsPage } from '../pages/technology/TechLogsPage'
import { RecommendationsPage } from '../pages/technology/RecommendationsPage'
import { WorkPage } from '../pages/work/WorkPage'
import { WorkflowCenterPage } from '../pages/work/WorkflowCenterPage'
import { validateWellSearch } from '../pages/geology/wellSearch'
import { validateWellTabSearch } from '../pages/geology/wellTabSearch'

const rootRoute = createRootRoute({ component: RootLayout, notFoundComponent: NotFoundPage })
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: () => <Navigate to="/home" /> })
const signInRoute = createRoute({ getParentRoute: () => rootRoute, path: '/auth/sign-in', component: SignInPage })
const mfaRoute = createRoute({ getParentRoute: () => rootRoute, path: '/auth/mfa', component: MfaPage })
const homeRoute = createRoute({ getParentRoute: () => rootRoute, path: '/home', component: HomePage })
const workRoute = createRoute({ getParentRoute: () => rootRoute, path: '/work', component: WorkPage })
const workflowCenterRoute = createRoute({ getParentRoute: () => rootRoute, path: '/work/workflows', component: WorkflowCenterPage })
const geologyRoute = createRoute({ getParentRoute: () => rootRoute, path: '/geology', component: GeologyOverviewPage })
const geologyMapRoute = createRoute({ getParentRoute: () => rootRoute, path: '/geology/map', validateSearch: validateWellSearch, component: GeologyMapPage })
const geologyCorrelationRoute = createRoute({ getParentRoute: () => rootRoute, path: '/geology/correlation', component: GeologyCorrelationPage })
const reservesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/geology/reserves', component: ReservesPage })
const geologyDeliveryRoute = createRoute({ getParentRoute: () => rootRoute, path: '/geology/delivery', component: GeologyDeliveryPage })
const wellsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/geology/wells', validateSearch: validateWellSearch, component: WellsPage })
const newWellRoute = createRoute({ getParentRoute: () => rootRoute, path: '/geology/wells/new', component: NewWellPage })
const wellRoute = createRoute({ getParentRoute: () => rootRoute, path: '/objects/wells/$wellId', validateSearch: validateWellTabSearch, component: WellDetailsPage })
const compareRoute = createRoute({ getParentRoute: () => rootRoute, path: '/geology/interpretations/$interpretationId/compare', component: InterpretationComparePage })
const technologyRoute = createRoute({ getParentRoute: () => rootRoute, path: '/technology', component: TechnologyPage })
const technologyMeasurementsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/technology/measurements', component: MeasurementsPage })
const technologyBalanceRoute = createRoute({ getParentRoute: () => rootRoute, path: '/technology/balance', component: BalancePage })
const technologySolutionsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/technology/solutions', component: SolutionsPage })
const technologyRvrRoute = createRoute({ getParentRoute: () => rootRoute, path: '/technology/rvr/DEV-042', component: RvrPage })
const technologyEquipmentRoute = createRoute({ getParentRoute: () => rootRoute, path: '/technology/equipment', component: EquipmentPage })
const technologyPlanFactRoute = createRoute({ getParentRoute: () => rootRoute, path: '/technology/plan-fact', component: PlanFactPage })
const technologyLogsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/technology/logs', component: TechLogsPage })
const technologyRecommendationsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/technology/recommendations', component: RecommendationsPage })
const modelingRoute = createRoute({ getParentRoute: () => rootRoute, path: '/modeling', component: ModelingPage })
const modelingWorkspaceRoute = createRoute({ getParentRoute: () => rootRoute, path: '/modeling/workspace/$projectId', component: ModelWorkspacePage })
const modelingRunRoute = createRoute({ getParentRoute: () => rootRoute, path: '/modeling/run/$projectId', component: ModelRunPage })
const modelingResultsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/modeling/results/$projectId', component: ModelResultsPage })
const modelingCompareRoute = createRoute({ getParentRoute: () => rootRoute, path: '/modeling/compare', component: ScenarioComparePage })
const analyticsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/analytics', component: AnalyticsPage })
const analyticsDecisionRoute = createRoute({ getParentRoute: () => rootRoute, path: '/analytics/decision', component: AnalyticsDecisionPage })
const analyticsReportRoute = createRoute({ getParentRoute: () => rootRoute, path: '/analytics/report', component: AnalyticsReportPage })
const adminRoute = createRoute({ getParentRoute: () => rootRoute, path: '/admin', component: AdminPage })
const adminOperationsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/admin/operations', component: AdminOperationsPage })
const notificationsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/notifications', component: NotificationsPage })
const profileRoute = createRoute({ getParentRoute: () => rootRoute, path: '/profile', component: ProfilePage })
const helpRoute = createRoute({ getParentRoute: () => rootRoute, path: '/help', component: HelpHomePage })
const helpStartRoute = createRoute({ getParentRoute: () => rootRoute, path: '/help/start', component: HelpStartPage })
const helpRolesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/help/roles', component: HelpRolesPage })
const helpRoleRoute = createRoute({ getParentRoute: () => rootRoute, path: '/help/roles/$roleId', component: HelpRolePage })
const helpModulesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/help/modules', component: HelpModulesPage })
const helpModuleRoute = createRoute({ getParentRoute: () => rootRoute, path: '/help/modules/$moduleId', component: HelpModulePage })
const helpFlowsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/help/flows', component: HelpFlowsPage })
const helpVerificationRoute = createRoute({ getParentRoute: () => rootRoute, path: '/help/verification', component: HelpVerificationPage })
const accessibilityRoute = createRoute({ getParentRoute: () => rootRoute, path: '/help/accessibility', component: AccessibilityPage })
const forbiddenRoute = createRoute({ getParentRoute: () => rootRoute, path: '/forbidden', component: ForbiddenPage })

const routeTree = rootRoute.addChildren([
  indexRoute,
  signInRoute,
  mfaRoute,
  homeRoute,
  workRoute,
  workflowCenterRoute,
  geologyRoute,
  geologyMapRoute,
  geologyCorrelationRoute,
  reservesRoute,
  geologyDeliveryRoute,
  wellsRoute,
  newWellRoute,
  wellRoute,
  compareRoute,
  technologyRoute,
  technologyMeasurementsRoute,
  technologyBalanceRoute,
  technologySolutionsRoute,
  technologyRvrRoute,
  technologyEquipmentRoute,
  technologyPlanFactRoute,
  technologyLogsRoute,
  technologyRecommendationsRoute,
  modelingRoute,
  modelingWorkspaceRoute,
  modelingRunRoute,
  modelingResultsRoute,
  modelingCompareRoute,
  analyticsRoute,
  analyticsDecisionRoute,
  analyticsReportRoute,
  adminRoute,
  adminOperationsRoute,
  notificationsRoute,
  profileRoute,
  helpRoute,
  helpStartRoute,
  helpRolesRoute,
  helpRoleRoute,
  helpModulesRoute,
  helpModuleRoute,
  helpFlowsRoute,
  helpVerificationRoute,
  accessibilityRoute,
  forbiddenRoute,
])

const history = import.meta.env.PROD ? createHashHistory() : createBrowserHistory()

export const router = createRouter({ routeTree, history, defaultPreload: 'intent', scrollRestoration: true })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
