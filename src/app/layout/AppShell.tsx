import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { Bell, BookOpenText, Boxes, BriefcaseBusiness, ChartNoAxesCombined, ChevronDown, ChevronsUpDown, Database, Home, LogOut, MapPinned, Menu, Network, Search, Settings2, UserRound, X } from 'lucide-react'
import { type PropsWithChildren, useState } from 'react'
import { userPersonas } from '../../entities/session/model/personas'
import { useSession } from '../../entities/session/model/sessionContext'
import { hasPermission, type Permission } from '../../shared/auth/permissions'
import { wells } from '../../repository/data/wells'

type StaticRoute = '/home' | '/work' | '/geology' | '/technology' | '/modeling' | '/analytics' | '/admin'

const navigation: Array<{ label: string; to: StaticRoute; icon: typeof Home; permission: Permission; badge?: string }> = [
  { label: 'Главная', to: '/home', icon: Home, permission: 'home.view' },
  { label: 'Мои задачи', to: '/work', icon: BriefcaseBusiness, permission: 'work.view', badge: '7' },
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
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const navigate = useNavigate()
  const { persona, signOut, switchPersona } = useSession()
  const visibleNavigation = navigation.filter((item) => hasPermission(persona, item.permission))
  const query = searchQuery.trim().toLowerCase()
  const searchResults = [
    ...wells.map((well) => ({ id: well.id, title: well.code, detail: `${well.site} · ${well.block} · скважина`, kind: 'well' as const })),
    { id: 'BLK-07-12', title: 'BLK-07-12', detail: 'Северный · технологический блок', kind: 'route' as const, to: '/technology' as const },
    { id: 'REPORT-OP-DAY-03', title: 'OP-DAY-03 · суточный отчёт', detail: 'Технология · rev.2', kind: 'route' as const, to: '/technology/plan-fact' as const },
    { id: 'RESULT-07', title: 'RESULT-07 · модель', detail: 'BASE-01 · опубликованный результат', kind: 'route' as const, to: '/modeling/results/$projectId' as const },
  ].filter((item) => !query || `${item.title} ${item.detail}`.toLowerCase().includes(query)).slice(0, 6)

  const logout = () => {
    signOut()
    void navigate({ to: '/auth/sign-in' })
  }

  const openResult = (result: typeof searchResults[number]) => {
    setSearchOpen(false)
    setSearchQuery('')
    if (result.kind === 'well') void navigate({ to: '/objects/wells/$wellId', params: { wellId: result.id } })
    else if (result.to === '/modeling/results/$projectId') void navigate({ to: result.to, params: { projectId: 'MOD-PR-07' } })
    else void navigate({ to: result.to })
  }

  return (
    <div className={`app-frame${collapsed ? ' app-frame--collapsed' : ''}${mobileOpen ? ' app-frame--mobile-open' : ''}`}>
      <a className="skip-link" href="#main-content">Перейти к содержимому</a>
      <aside className="sidebar">
        <div className="sidebar__brand">
          <Link to="/home" className="brand"><span className="brand__mark"><span /></span><span className="brand__text"><strong>AI KAPGEO</strong><small>Digital subsurface</small></span></Link>
          <button type="button" className="sidebar__collapse" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Развернуть меню' : 'Свернуть меню'}><Menu size={18} /></button>
          <button type="button" className="sidebar__mobile-close" onClick={() => setMobileOpen(false)} aria-label="Закрыть меню"><X size={18} /></button>
        </div>
        <nav className="sidebar__nav" aria-label="Основная навигация">
          <p>Рабочее пространство</p>
          {visibleNavigation.map((item) => {
            const Icon = item.icon
            const active = item.to === '/home' ? pathname === '/home' : pathname.startsWith(item.to)
            return <Link key={item.to} to={item.to} className={active ? 'is-active' : ''} onClick={() => setMobileOpen(false)}><Icon size={19} /><span>{item.label}</span>{item.badge && <em>{item.badge}</em>}</Link>
          })}
        </nav>
        <div className="sidebar__bottom">
          <Link to="/help" className={pathname.startsWith('/help') ? 'is-active' : ''}><BookOpenText size={18} /><span>Справочный центр</span></Link>
          <Link to="/profile" className={pathname.startsWith('/profile') ? 'is-active' : ''}><span className="avatar avatar--sm">{persona?.initials}</span><span className="sidebar__profile"><strong>{persona?.name}</strong><small>{persona?.position}</small></span><ChevronsUpDown size={15} /></Link>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <button className="topbar__mobile-menu" type="button" onClick={() => setMobileOpen(true)} aria-label="Открыть меню"><Menu size={19} /></button>
          <button className="context-selector" type="button"><span><small>Контекст</small><strong>Казатомпром / Сарытау / Северный</strong></span><ChevronDown size={15} /></button>
          <button className="as-of-selector" type="button"><small>На дату</small><strong>10 авг 2026</strong><ChevronDown size={14} /></button>
          <div className={`global-search-wrap${searchOpen ? ' is-open' : ''}`}>
            <button className="global-search" type="button" onClick={() => setSearchOpen(true)} aria-expanded={searchOpen} aria-controls="global-search-results"><Search size={17} /><span>Найти скважину, блок, отчёт…</span><kbd>Ctrl K</kbd></button>
            {searchOpen && <div id="global-search-results" className="global-search-popover"><label><Search size={16} /><input autoFocus value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Введите код скважины, блок или отчёт" aria-label="Глобальный поиск" /></label><p>{query ? 'Результаты выборки' : 'Быстрый доступ'}</p>{searchResults.length ? <div>{searchResults.map((result) => <button type="button" key={result.id} onClick={() => openResult(result)}><strong>{result.title}</strong><span>{result.detail}</span></button>)}</div> : <small>По вашему запросу ничего не найдено.</small>}</div>}
          </div>
          <div className="topbar__actions">
            <button type="button" aria-label="Фоновые задачи"><Database size={18} /><span className="activity-pulse" /></button>
            <Link to="/notifications" aria-label="Уведомления"><Bell size={18} /><em>3</em></Link>
            <div className="persona-control"><UserRound size={16} /><select value={persona?.id} onChange={(event) => switchPersona(event.target.value)} aria-label="Текущий профиль">{userPersonas.map((item) => <option key={item.id} value={item.id}>{item.position}</option>)}</select></div>
            <button type="button" onClick={logout} aria-label="Выйти"><LogOut size={18} /></button>
          </div>
        </header>
        <main id="main-content" className="content">{children}</main>
      </div>
      {mobileOpen && <button className="mobile-backdrop" type="button" aria-label="Закрыть меню" onClick={() => setMobileOpen(false)} />}
    </div>
  )
}
