import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import {
  Bell,
  BriefcaseBusiness,
  ChevronDown,
  CircleUserRound,
  CodeXml,
  Eye,
  LogOut,
  Menu,
  PanelsTopLeft,
} from 'lucide-react'
import { type PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from '../../entities/session/model/sessionContext'
import { fetchPlatformPreferences } from '../../repository/api'
import { GeologyNavigator } from './GeologyNavigator'
import { LanguageSwitcher } from './LanguageSwitcher'
import { ModuleNavigation } from './ModuleNavigation'
import { useUiLocale } from '../../shared/lib/useUiLocale'
import { BrandMark } from '../../shared/ui/BrandMark'

export function AppShell({ children }: PropsWithChildren) {
  const locale = useUiLocale()
  const { persona, signOut } = useSession()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const currentHref = useRouterState({ select: (state) => state.location.href })
  const preferencesQuery = useQuery({ queryKey: ['platform-preferences'], queryFn: fetchPlatformPreferences })
  const [profileOpen, setProfileOpen] = useState(false)
  const [geologyNavOpen, setGeologyNavOpen] = useState(false)
  const [geologyNavCollapsed, setGeologyNavCollapsed] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const isBgd = pathname.startsWith('/geology/bgd')
  const isGeology = pathname.startsWith('/geology') && !isBgd
  const closeGeologyNavigation = useCallback(() => setGeologyNavOpen(false), [])

  useEffect(() => {
    const media = window.matchMedia?.('(max-width: 1180px)')
    const closeOnDesktop = () => { if (!media?.matches) setGeologyNavOpen(false) }
    media?.addEventListener('change', closeOnDesktop)
    return () => media?.removeEventListener('change', closeOnDesktop)
  }, [])

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (!profileRef.current?.contains(target)) setProfileOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  useEffect(() => {
    const preferences = preferencesQuery.data
    if (!preferences) return
    document.documentElement.lang = locale
    document.documentElement.dataset.density = preferences.density
    document.documentElement.dataset.contrast = preferences.contrast ? 'high' : 'normal'
    document.documentElement.dataset.motion = preferences.reducedMotion ? 'reduced' : 'normal'
  }, [preferencesQuery.data, locale])

  const logOut = () => {
    signOut()
    void navigate({ to: '/auth/sign-in' })
  }

  return <div className={`app-frame app-frame--top-navigation${isBgd ? ' app-frame--bgd' : ''}${isGeology ? ' app-frame--geology' : ''}`}>
    <a className="skip-link" href="#main-content">Перейти к содержимому</a>
    <header className="topbar topbar--modules">
      <Link className="topbar-brand" to={persona?.homeRoute ?? '/geology/bgd'} aria-label="AI KAPGEO — рабочая область">
        <BrandMark />
        <span className="brand__text"><strong>AI KAPGEO</strong><small>Industrial intelligence</small></span>
      </Link>
      <span className="topbar__divider" aria-hidden="true" />
      <ModuleNavigation persona={persona} />
      {isBgd && <button className="topbar__geology-toggle" type="button" onClick={() => setGeologyNavOpen((value) => !value)} aria-expanded={geologyNavOpen} aria-label={geologyNavOpen ? 'Закрыть скважины' : 'Открыть скважины'}><Menu size={20} /><span>Скважины</span></button>}
      <div className="topbar__actions">
        <button type="button" aria-label="Фоновые процессы" aria-disabled="true" disabled title="Фоновые процессы: раздел пока не проработан"><BriefcaseBusiness size={19} /></button>
        <button type="button" aria-label="Уведомления" aria-disabled="true" disabled title="Уведомления: раздел пока не проработан"><Bell size={19} /></button>
      </div>
      <LanguageSwitcher />
      <div className="topbar-profile" ref={profileRef} onKeyDown={event => { if (event.key === 'Escape') { setProfileOpen(false); profileRef.current?.querySelector<HTMLButtonElement>('.topbar-profile__trigger')?.focus() } }}>
        <button className="topbar-profile__trigger" type="button" onClick={() => setProfileOpen((value) => !value)} aria-haspopup="menu" aria-expanded={profileOpen}>
          <span className="avatar avatar--sm">{persona?.initials}</span><span className="topbar-profile__copy"><strong>{persona?.name}</strong><small>{persona?.position}</small></span><ChevronDown size={15} />
        </button>
        {profileOpen && <div className="topbar-profile__menu" role="menu">
          <div className="topbar-profile__summary"><span className="avatar">{persona?.initials}</span><span><strong>{persona?.name}</strong><small>{persona?.scope}</small></span></div>
          <Link to="/profile" role="menuitem" onClick={() => setProfileOpen(false)}><CircleUserRound size={17} />Профиль и роли</Link>
          <div className="topbar-profile__separator" />
          <Link to="/team/knowledge-map" search={{ from: currentHref }} role="menuitem" className="topbar-profile__team-tool" onClick={() => setProfileOpen(false)}><CodeXml size={19} aria-hidden="true" /><span><strong>Карта взаимосвязей</strong><small>Для команды · разработка</small></span></Link>
          <Link to="/team/ui-kit" role="menuitem" className="topbar-profile__kit-tool" onClick={() => setProfileOpen(false)}><PanelsTopLeft size={19} aria-hidden="true" /><span><strong>UI Kit</strong><small>Компоненты и рабочие области</small></span></Link>
          <div className="topbar-profile__separator" />
          {pathname.startsWith('/geology/plans/') && <button type="button" role="menuitem" onClick={() => { setProfileOpen(false); window.dispatchEvent(new Event('kapgeo:open-plan-display')) }}><Eye size={17} />Отображение плана</button>}
          <button type="button" role="menuitem" onClick={logOut}><LogOut size={17} />Выйти</button>
        </div>}
      </div>
    </header>

    <div className={`app-workspace${isBgd ? ' app-workspace--bgd' : ''}`}>
      {isBgd && <GeologyNavigator mobileOpen={geologyNavOpen} collapsed={geologyNavCollapsed} onToggle={() => setGeologyNavCollapsed((value) => !value)} onClose={closeGeologyNavigation} />}
      <main id="main-content" className="app-workspace__content content" tabIndex={-1} inert={isBgd && geologyNavOpen}>{children}</main>
    </div>


  </div>
}
