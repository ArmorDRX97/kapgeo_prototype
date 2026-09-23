import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import {
  Bell,
  Boxes,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  ChevronDown,
  CircleUserRound,
  Database,
  Ellipsis,
  LogOut,
  Menu,
  Mountain,
  Network,
  RotateCcw,
  Search,
  Settings2,
  X,
} from 'lucide-react'
import { type PropsWithChildren, useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from '../../entities/session/model/sessionContext'
import { fetchPlatformPreferences, fetchWells } from '../../repository/api'
import { resetDemoData } from '../../repository/demo/demoDataControl'
import { hasPermission, type Permission } from '../../shared/auth/permissions'
import { GeologyNavigator } from './GeologyNavigator'

type ModuleRoute = '/geology/bgd' | '/geology' | '/technology' | '/modeling' | '/analytics' | '/admin'

const moduleNavigation: Array<{
  label: string
  to: ModuleRoute
  permission: Permission
  icon: typeof Mountain
}> = [
  { label: 'БГД', to: '/geology/bgd', permission: 'bgd.view', icon: Database },
  { label: 'Геология', to: '/geology', permission: 'geology.view', icon: Mountain },
  { label: 'Технология', to: '/technology', permission: 'technology.view', icon: Network },
  { label: 'Моделирование', to: '/modeling', permission: 'modeling.view', icon: Boxes },
  { label: 'Аналитика', to: '/analytics', permission: 'analytics.view', icon: ChartNoAxesCombined },
  { label: 'Администрирование', to: '/admin', permission: 'administration.view', icon: Settings2 },
]

export function AppShell({ children }: PropsWithChildren) {
  const { persona, signOut } = useSession()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const preferencesQuery = useQuery({ queryKey: ['platform-preferences'], queryFn: fetchPlatformPreferences })
  const wellsQuery = useQuery({ queryKey: ['wells'], queryFn: fetchWells })
  const [profileOpen, setProfileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [utilitiesOpen, setUtilitiesOpen] = useState(false)
  const [geologyNavOpen, setGeologyNavOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const utilitiesRef = useRef<HTMLDivElement>(null)
  const isBgd = pathname.startsWith('/geology/bgd')

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (!profileRef.current?.contains(target)) setProfileOpen(false)
      if (!searchRef.current?.contains(target)) setSearchOpen(false)
      if (!utilitiesRef.current?.contains(target)) setUtilitiesOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  useEffect(() => {
    const preferences = preferencesQuery.data
    if (!preferences) return
    document.documentElement.lang = preferences.locale
    document.documentElement.dataset.density = preferences.density
    document.documentElement.dataset.contrast = preferences.contrast ? 'high' : 'normal'
    document.documentElement.dataset.motion = preferences.reducedMotion ? 'reduced' : 'normal'
  }, [preferencesQuery.data])

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('ru')
    if (query.length < 2) return []
    return (wellsQuery.data ?? []).filter((well) => `${well.code} ${well.type} ${well.site} ${well.profile}`.toLocaleLowerCase('ru').includes(query)).slice(0, 7)
  }, [searchQuery, wellsQuery.data])

  const openWell = (wellId: string, depositId: string) => {
    setSearchOpen(false)
    setSearchQuery('')
    void navigate({ to: '/geology/bgd/$depositId/wells/$wellId', params: { depositId, wellId } })
  }

  const resetAndReload = async () => {
    if (!window.confirm('Сбросить все изменения и вернуть исходные демонстрационные данные?')) return
    setResetting(true)
    try {
      await resetDemoData()
      window.location.reload()
    } finally {
      setResetting(false)
    }
  }

  const logOut = () => {
    signOut()
    void navigate({ to: '/auth/sign-in' })
  }

  return <div className="app-frame app-frame--top-navigation">
    <a className="skip-link" href="#main-content">Перейти к содержимому</a>
    <header className="topbar topbar--modules">
      <Link className="topbar-brand" to={persona?.homeRoute ?? '/geology/bgd'} aria-label="AI KAPGEO — рабочая область">
        <span className="brand__mark"><span /></span>
        <span className="brand__text"><strong>AI KAPGEO</strong><small>Industrial intelligence</small></span>
      </Link>
      <span className="topbar__divider" aria-hidden="true" />
      <nav className="topbar__module-nav" aria-label="Модули системы">
        {moduleNavigation.filter((item) => hasPermission(persona, item.permission)).map((item) => {
          const Icon = item.icon
          const active = item.to === '/geology'
            ? pathname === '/geology'
            : pathname.startsWith(item.to)
          return <Link key={item.to} to={item.to} className={active ? 'is-active' : ''}><Icon size={17} /><span>{item.label}</span></Link>
        })}
      </nav>
      {isBgd && <button className="topbar__geology-toggle" type="button" onClick={() => setGeologyNavOpen((value) => !value)} aria-expanded={geologyNavOpen} aria-label="Открыть скважины"><Menu size={20} /><span>Скважины</span></button>}
      <div className="global-search-wrap" ref={searchRef}>
        <label className="global-search global-search--input"><Search size={17} /><input value={searchQuery} onFocus={() => setSearchOpen(true)} onChange={(event) => { setSearchQuery(event.target.value); setSearchOpen(true) }} placeholder="Поиск скважины" aria-label="Глобальный поиск скважины" />{searchQuery && <button type="button" onClick={() => setSearchQuery('')} aria-label="Очистить поиск"><X size={15} /></button>}</label>
        {searchOpen && searchQuery.trim().length >= 2 && <div className="global-search-results" role="listbox" aria-label="Результаты поиска">
          {searchResults.map((well) => <button key={well.id} type="button" role="option" aria-selected="false" onClick={() => openWell(well.id, well.bgd?.depositId ?? 'DEP-SARYTAU')}><Mountain size={16} /><span><strong>{well.code}</strong><small>{well.type} · {well.site}</small></span></button>)}
          {!wellsQuery.isLoading && !searchResults.length && <p>Скважины не найдены</p>}
        </div>}
      </div>
      <div className="topbar__actions">
        <button type="button" aria-label="Фоновые процессы" aria-disabled="true"><BriefcaseBusiness size={19} /><span className="activity-pulse" /></button>
        <button type="button" aria-label="Уведомления" aria-disabled="true"><Bell size={19} /></button>
      </div>
      <div className="topbar-profile" ref={profileRef}>
        <button className="topbar-profile__trigger" type="button" onClick={() => setProfileOpen((value) => !value)} aria-haspopup="menu" aria-expanded={profileOpen}>
          <span className="avatar avatar--sm">{persona?.initials}</span><span className="topbar-profile__copy"><strong>{persona?.name}</strong><small>{persona?.position}</small></span><ChevronDown size={15} />
        </button>
        {profileOpen && <div className="topbar-profile__menu" role="menu">
          <div className="topbar-profile__summary"><span className="avatar">{persona?.initials}</span><span><strong>{persona?.name}</strong><small>{persona?.scope}</small></span></div>
          <Link to="/profile" role="menuitem" onClick={() => setProfileOpen(false)}><CircleUserRound size={17} />Профиль и роли</Link>
          <div className="topbar-profile__separator" />
          <button type="button" role="menuitem" onClick={logOut}><LogOut size={17} />Выйти</button>
        </div>}
      </div>
    </header>

    <div className="app-workspace">
      {isBgd && <GeologyNavigator mobileOpen={geologyNavOpen} onClose={() => setGeologyNavOpen(false)} />}
      <main id="main-content" className="app-workspace__content content">{children}</main>
    </div>

    <div className={`utility-fab${utilitiesOpen ? ' is-open' : ''}`} ref={utilitiesRef}>
      {utilitiesOpen && <div id="prototype-utilities-menu" className="utility-fab__menu" role="menu"><p><strong>Демо-среда</strong><small>Служебные действия</small></p><button type="button" role="menuitem" disabled={resetting} onClick={() => void resetAndReload()}><span className="utility-fab__action-icon"><RotateCcw size={16} /></span><span><strong>{resetting ? 'Сбрасываем…' : 'Сбросить данные'}</strong><small>Вернуть исходное состояние</small></span></button></div>}
      <button className="utility-fab__trigger" type="button" onClick={() => setUtilitiesOpen((value) => !value)} aria-label={utilitiesOpen ? 'Закрыть инструменты прототипа' : 'Открыть инструменты прототипа'} aria-controls="prototype-utilities-menu" aria-expanded={utilitiesOpen} title="Инструменты прототипа">{utilitiesOpen ? <X size={21} strokeWidth={2.5} /> : <Ellipsis size={25} strokeWidth={2.8} />}</button>
    </div>
  </div>
}
