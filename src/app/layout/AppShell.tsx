import { Link, useRouterState } from '@tanstack/react-router'
import { Bell, Database, LogOut, Menu, RotateCcw, Search, UserRound, X } from 'lucide-react'
import { type PropsWithChildren, useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useSession } from '../../entities/session/model/sessionContext'
import { fetchPlatformPreferences } from '../../repository/api'
import { resetDemoData } from '../../repository/demo/demoDataControl'

export function AppShell({ children }: PropsWithChildren) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { persona } = useSession()
  const { data: platformPreferences } = useQuery({ queryKey: ['platform-preferences'], queryFn: fetchPlatformPreferences, staleTime: 30_000 })
  const resetDataMutation = useMutation({
    mutationFn: resetDemoData,
    onSuccess: () => window.location.reload(),
    onError: () => window.alert('Не удалось сбросить локальные данные. Закройте другие вкладки системы и повторите попытку.'),
  })

  useEffect(() => {
    if (!platformPreferences) return
    document.documentElement.lang = platformPreferences.locale
    document.documentElement.dataset.contrast = platformPreferences.contrast ? 'high' : 'normal'
    document.documentElement.dataset.motion = platformPreferences.reducedMotion ? 'reduced' : 'normal'
    document.documentElement.dataset.density = platformPreferences.density
  }, [platformPreferences])

  const resetData = () => {
    if (!window.confirm('Сбросить заполненные и изменённые данные? Все локальные изменения будут удалены, после перезагрузки восстановятся исходные значения.')) return
    setMobileOpen(false)
    resetDataMutation.mutate()
  }

  return (
    <div className={`app-frame app-frame--bgd${collapsed ? ' app-frame--collapsed' : ''}${mobileOpen ? ' app-frame--mobile-open' : ''}`}>
      <a className="skip-link" href="#main-content">Перейти к содержимому</a>
      <aside className="sidebar">
        <div className="sidebar__brand">
          <Link to="/geology/bgd" className="brand"><span className="brand__mark"><span /></span><span className="brand__text"><strong>AI KAPGEO</strong><small>Digital subsurface</small></span></Link>
          <button type="button" className="sidebar__collapse" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Развернуть меню' : 'Свернуть меню'}><Menu size={18} /></button>
          <button type="button" className="sidebar__mobile-close" onClick={() => setMobileOpen(false)} aria-label="Закрыть меню"><X size={18} /></button>
        </div>
        <nav className="sidebar__nav" aria-label="Основная навигация">
          <Link to="/geology/bgd" className={pathname.startsWith('/geology/bgd') ? 'is-active' : ''} onClick={() => setMobileOpen(false)}><Database size={19} /><span>БГД</span></Link>
        </nav>
        <div className="sidebar__bottom">
          <button type="button" className="sidebar__reset-data" onClick={resetData} disabled={resetDataMutation.isPending} title="Сбросить заполненные и изменённые данные"><RotateCcw size={18} /><span><strong>{resetDataMutation.isPending ? 'Сбрасываем данные…' : 'Сбросить демо данные'}</strong><small>Удалит заполненные и изменённые данные</small></span></button>
          <Link to="/profile" className={pathname.startsWith('/profile') ? 'is-active' : ''}><span className="avatar avatar--sm">{persona?.initials}</span><span className="sidebar__profile"><strong>{persona?.name}</strong><small>{persona?.position}</small></span></Link>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <button className="topbar__mobile-menu" type="button" onClick={() => setMobileOpen(true)} aria-label="Открыть меню"><Menu size={19} /></button>
          <div className="global-search-wrap">
            <button className="global-search" type="button" disabled aria-label="Поиск недоступен"><Search size={17} /><span>Поиск недоступен</span><kbd>Ctrl K</kbd></button>
          </div>
          <div className="topbar__actions">
            <button type="button" disabled aria-label="Фоновые задачи"><Database size={18} /><span className="activity-pulse" /></button>
            <button type="button" disabled aria-label="Уведомления"><Bell size={18} /><em>3</em></button>
            <div className="persona-control"><UserRound size={16} /><select value={persona?.id ?? ''} disabled aria-label="Текущий профиль"><option value={persona?.id ?? ''}>{persona?.position ?? 'Геолог'}</option></select></div>
            <button type="button" disabled aria-label="Выйти"><LogOut size={18} /></button>
          </div>
        </header>
        <main id="main-content" className="content">{children}</main>
      </div>
      {mobileOpen && <button className="mobile-backdrop" type="button" aria-label="Закрыть меню" onClick={() => setMobileOpen(false)} />}
    </div>
  )
}
