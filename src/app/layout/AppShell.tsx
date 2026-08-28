import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { Bell, BookOpenText, Boxes, BriefcaseBusiness, ChartNoAxesCombined, ChevronDown, ChevronsUpDown, Database, Home, LogOut, MapPinned, Menu, Minimize2, Network, RotateCcw, Search, Settings2, UserRound, X } from 'lucide-react'
import { type PropsWithChildren, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { userPersonas } from '../../entities/session/model/personas'
import { useSession } from '../../entities/session/model/sessionContext'
import { hasPermission, type Permission } from '../../shared/auth/permissions'
import { fetchGeologicalMasterData, fetchPlatformPreferences, fetchWells, savePlatformPreferences } from '../../repository/api'
import { ScientificJobMonitor } from '../../features/scientific-jobs'
import { GeologyTour } from '../../features/geology-tour'
import { getDepositName } from '../../entities/geology-master/model/types'
import { resetDemoData } from '../../repository/demo/demoDataControl'

type StaticRoute = '/home' | '/work' | '/geology' | '/geology/bgd' | '/technology' | '/modeling' | '/analytics' | '/admin'

const navigation: Array<{ label: string; to: StaticRoute; icon: typeof Home; permission: Permission; badge?: string }> = [
  { label: 'Главная', to: '/home', icon: Home, permission: 'home.view' },
  { label: 'Мои задачи', to: '/work', icon: BriefcaseBusiness, permission: 'work.view', badge: '7' },
  { label: 'БГД', to: '/geology/bgd', icon: Database, permission: 'geology.view' },
  { label: 'Геология', to: '/geology', icon: MapPinned, permission: 'geology.view' },
  { label: 'Технология', to: '/technology', icon: Network, permission: 'technology.view' },
  { label: 'Моделирование', to: '/modeling', icon: Boxes, permission: 'modeling.view' },
  { label: 'Аналитика', to: '/analytics', icon: ChartNoAxesCombined, permission: 'analytics.view' },
  { label: 'Администрирование', to: '/admin', icon: Settings2, permission: 'administration.view' },
]

export function AppShell({ children }: PropsWithChildren) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [jobsOpen, setJobsOpen] = useState(false)
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { persona, signOut, switchPersona } = useSession()
  const { data: platformPreferences } = useQuery({ queryKey: ['platform-preferences'], queryFn: fetchPlatformPreferences, staleTime: 30_000 })
  const minimumMode = platformPreferences?.minimumMode ?? false
  const visibleNavigation = navigation.filter((item) => hasPermission(persona, item.permission) && (!minimumMode || item.to === '/geology/bgd'))
  const minimumModeMutation = useMutation({
    mutationFn: (enabled: boolean) => {
      if (!platformPreferences) throw new Error('Не удалось загрузить настройки интерфейса.')
      return savePlatformPreferences({ ...platformPreferences, minimumMode: enabled })
    },
    onSuccess: async (next) => {
      queryClient.setQueryData(['platform-preferences'], next)
      if (next.minimumMode) switchPersona('geo.ivanova')
      if (next.minimumMode && !pathname.startsWith('/geology/bgd')) await navigate({ to: '/geology/bgd', replace: true })
      window.location.reload()
    },
  })
  const resetDataMutation = useMutation({
    mutationFn: resetDemoData,
    onSuccess: () => window.location.reload(),
    onError: () => window.alert('Не удалось сбросить локальные данные. Закройте другие вкладки системы и повторите попытку.'),
  })
  const { data: persistedWells = [] } = useQuery({ queryKey: ['wells'], queryFn: fetchWells, staleTime: 30_000 })
  const { data: masterData } = useQuery({ queryKey: ['geology-master'], queryFn: fetchGeologicalMasterData, staleTime: 30_000 })
  const currentDeposit = masterData?.deposits.find((item) => item.id === platformPreferences?.currentDepositId)
    ?? masterData?.deposits.find((item) => !item.isHidden)
  const currentSites = masterData?.sites.filter((item) => item.depositId === currentDeposit?.id) ?? []
  const currentSite = currentSites.find((item) => persona?.scope.includes(item.name)) ?? currentSites[0]
  const contextLabel = currentDeposit
    ? `Казатомпром / ${getDepositName(currentDeposit, platformPreferences?.locale ?? 'ru')}${currentSite ? ` / ${currentSite.name}` : ''}`
    : 'Казатомпром / Месторождение не выбрано'

  useEffect(() => {
    if (!platformPreferences) return
    document.documentElement.lang = platformPreferences.locale
    document.documentElement.dataset.contrast = platformPreferences.contrast ? 'high' : 'normal'
    document.documentElement.dataset.motion = platformPreferences.reducedMotion ? 'reduced' : 'normal'
    document.documentElement.dataset.density = platformPreferences.density
  }, [platformPreferences])
  useEffect(() => {
    if (!minimumMode) return
    if (persona?.id !== 'geo.ivanova') switchPersona('geo.ivanova')
    if (!pathname.startsWith('/geology/bgd') && pathname !== '/profile') void navigate({ to: '/geology/bgd', replace: true })
  }, [minimumMode, navigate, pathname, persona?.id, switchPersona])
  const query = searchQuery.trim().toLowerCase()
  const searchResults = [
    ...persistedWells.map((well) => ({ id: well.id, title: well.code, detail: `${well.site} · ${well.block} · скважина`, kind: 'well' as const })),
    { id: 'BLK-07-12', title: 'BLK-07-12', detail: 'Северный · технологический блок', kind: 'route' as const, to: '/technology' as const },
    { id: 'REPORT-OP-DAY-03', title: 'OP-DAY-03 · суточный отчёт', detail: 'Технология · rev.2', kind: 'route' as const, to: '/technology/plan-fact' as const },
    { id: 'RESULT-07', title: 'RESULT-07 · модель', detail: 'BASE-01 · опубликованный результат', kind: 'route' as const, to: '/modeling/results/$projectId' as const },
  ].filter((item) => !query || `${item.title} ${item.detail}`.toLowerCase().includes(query)).slice(0, 6)

  const logout = () => {
    signOut()
    void navigate({ to: '/auth/sign-in' })
  }

  const resetData = () => {
    if (!window.confirm('Сбросить заполненные и изменённые данные? Все локальные изменения будут удалены, после перезагрузки восстановятся исходные значения.')) return
    setMobileOpen(false)
    resetDataMutation.mutate()
  }

  const openResult = (result: typeof searchResults[number]) => {
    setSearchOpen(false)
    setSearchQuery('')
    if (result.kind === 'well') void navigate({ to: '/objects/wells/$wellId', params: { wellId: result.id } })
    else if (result.to === '/modeling/results/$projectId') void navigate({ to: result.to, params: { projectId: 'MOD-PR-07' } })
    else void navigate({ to: result.to })
  }

  return (
    <div className={`app-frame${collapsed ? ' app-frame--collapsed' : ''}${mobileOpen ? ' app-frame--mobile-open' : ''}${minimumMode ? ' app-frame--minimum' : ''}`}>
      <a className="skip-link" href="#main-content">Перейти к содержимому</a>
      <aside className="sidebar">
        <div className="sidebar__brand">
          <Link to={minimumMode ? '/geology/bgd' : '/home'} className="brand"><span className="brand__mark"><span /></span><span className="brand__text"><strong>AI KAPGEO</strong><small>Digital subsurface</small></span></Link>
          <button type="button" className="sidebar__collapse" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Развернуть меню' : 'Свернуть меню'}><Menu size={18} /></button>
          <button type="button" className="sidebar__mobile-close" onClick={() => setMobileOpen(false)} aria-label="Закрыть меню"><X size={18} /></button>
        </div>
        <nav className="sidebar__nav" aria-label="Основная навигация">
          {!minimumMode && <p>Рабочее пространство</p>}
          <label className="sidebar-minimum">
            <Minimize2 size={18} />
            <span>Минимум</span>
            <input type="checkbox" role="switch" aria-label="Минимум" checked={minimumMode} disabled={!platformPreferences || minimumModeMutation.isPending} onChange={(event) => minimumModeMutation.mutate(event.target.checked)} />
            <i aria-hidden="true" />
          </label>
          {visibleNavigation.map((item) => {
            const Icon = item.icon
            const active = item.to === '/home' ? pathname === '/home' : item.to === '/geology' ? pathname === '/geology' || (pathname.startsWith('/geology/') && !pathname.startsWith('/geology/bgd')) : pathname.startsWith(item.to)
            return <Link key={item.to} to={item.to} className={active ? 'is-active' : ''} onClick={() => setMobileOpen(false)}><Icon size={19} /><span>{item.label}</span>{item.badge && <em>{item.badge}</em>}</Link>
          })}
        </nav>
        <div className="sidebar__bottom">
          <button type="button" className="sidebar__reset-data" onClick={resetData} disabled={resetDataMutation.isPending} title="Сбросить заполненные и изменённые данные"><RotateCcw size={18} /><span><strong>{resetDataMutation.isPending ? 'Сбрасываем данные…' : 'Сбросить демо данные'}</strong><small>Удалит заполненные и изменённые данные</small></span></button>
          {!minimumMode && <Link to="/help" className={pathname.startsWith('/help') ? 'is-active' : ''}><BookOpenText size={18} /><span>Справочный центр</span></Link>}
          <Link to="/profile" className={pathname.startsWith('/profile') ? 'is-active' : ''}><span className="avatar avatar--sm">{persona?.initials}</span><span className="sidebar__profile"><strong>{persona?.name}</strong><small>{persona?.position}</small></span><ChevronsUpDown size={15} /></Link>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <button className="topbar__mobile-menu" type="button" onClick={() => setMobileOpen(true)} aria-label="Открыть меню"><Menu size={19} /></button>
            {!minimumMode && <button className="context-selector" type="button"><span><small>Контекст</small><strong>{contextLabel}</strong></span><ChevronDown size={15} /></button>}
            {!minimumMode && <button className="as-of-selector" type="button"><small>На дату</small><strong>10 авг 2026</strong><ChevronDown size={14} /></button>}
            <div className={`global-search-wrap${searchOpen ? ' is-open' : ''}`}>
              <button className="global-search" type="button" disabled={minimumMode} onClick={() => setSearchOpen(true)} aria-expanded={minimumMode ? false : searchOpen} aria-controls="global-search-results"><Search size={17} /><span>{minimumMode ? 'Поиск недоступен' : 'Найти скважину, блок, отчёт…'}</span><kbd>Ctrl K</kbd></button>
              {searchOpen && !minimumMode && <div id="global-search-results" className="global-search-popover"><label><Search size={16} /><input autoFocus value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Введите код скважины, блок или отчёт" aria-label="Глобальный поиск" /></label><p>{query ? 'Результаты выборки' : 'Быстрый доступ'}</p>{searchResults.length ? <div>{searchResults.map((result) => <button type="button" key={result.id} onClick={() => openResult(result)}><strong>{result.title}</strong><span>{result.detail}</span></button>)}</div> : <small>По вашему запросу ничего не найдено.</small>}</div>}
            </div>

          <div className="topbar__actions">
              <button type="button" aria-label="Фоновые задачи" aria-disabled={minimumMode} aria-expanded={minimumMode ? false : jobsOpen} aria-controls="scientific-job-monitor" onClick={() => { if (!minimumMode) setJobsOpen((value) => !value) }}><Database size={18} /><span className="activity-pulse" /></button>
              {jobsOpen && !minimumMode && <ScientificJobMonitor onClose={() => setJobsOpen(false)} />}
              {minimumMode
                ? <button type="button" aria-label="Уведомления" aria-disabled="true"><Bell size={18} /><em>3</em></button>
                : <Link to="/notifications" aria-label="Уведомления"><Bell size={18} /><em>3</em></Link>}

            <div className="persona-control"><UserRound size={16} /><select value={persona?.id} disabled={minimumMode} onChange={(event) => switchPersona(event.target.value)} aria-label="Текущий профиль">{(minimumMode ? userPersonas.filter((item) => item.id === 'geo.ivanova') : userPersonas).map((item) => <option key={item.id} value={item.id}>{item.position}</option>)}</select></div>
            <button type="button" aria-disabled={minimumMode} onClick={() => { if (!minimumMode) logout() }} aria-label="Выйти"><LogOut size={18} /></button>
          </div>
        </header>
        <main id="main-content" className="content">{children}</main>
      </div>
      {mobileOpen && <button className="mobile-backdrop" type="button" aria-label="Закрыть меню" onClick={() => setMobileOpen(false)} />}
      {!minimumMode && <GeologyTour />}
    </div>
  )
}
