import { useQuery } from '@tanstack/react-query'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { Mountain, PanelLeftClose, PanelLeftOpen, Plus, Search, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { getDepositName } from '../../entities/geology-master/model/types'
import { useSession } from '../../entities/session/model/sessionContext'
import { fetchGeologicalMasterData, fetchPlatformPreferences, fetchWells } from '../../repository/api'
import { hasPermission } from '../../shared/auth/permissions'
import { validateBgdWellSectionSearch } from '../../features/geobase/model/bgdWellSection'

type WellStatusFilter = 'all' | 'Работает' | 'Требует внимания' | 'Отключена' | 'На проверке'

export function GeologyNavigator({ mobileOpen, onClose, collapsed = false, onToggle }: { mobileOpen: boolean; onClose: () => void; collapsed?: boolean; onToggle?: () => void }) {
  const { persona } = useSession()
  const navigate = useNavigate()
  const location = useRouterState({ select: (state) => state.location })
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<WellStatusFilter>('all')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const panelRef = useRef<HTMLElement>(null)
  const focusReturn = useRef<HTMLElement | null>(null)
  const masterQuery = useQuery({ queryKey: ['geology-master'], queryFn: fetchGeologicalMasterData })
  const preferencesQuery = useQuery({ queryKey: ['platform-preferences'], queryFn: fetchPlatformPreferences })
  const wellsQuery = useQuery({ queryKey: ['wells'], queryFn: fetchWells })

  const routeDepositMatch = location.pathname.match(/^\/geology\/bgd\/([^/]+)/)
  const routeDepositId = routeDepositMatch?.[1] ? decodeURIComponent(routeDepositMatch[1]) : undefined
  const selectedWellId = location.pathname.match(/\/wells\/([^/]+)$/)?.[1]
  const deposits = (masterQuery.data?.deposits ?? []).filter((item) => !item.isHidden)
  const currentDeposit = deposits.find((item) => item.id === routeDepositId)
    ?? deposits.find((item) => item.id === preferencesQuery.data?.currentDepositId)
    ?? deposits[0]

  useEffect(() => {
    if (!mobileOpen) return
    focusReturn.current = document.activeElement as HTMLElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.querySelector<HTMLButtonElement>('.geology-navigator__close')?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose() }
      if (event.key !== 'Tab') return
      const buttons = panelRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, [tabindex="0"]')
      const visible = [...(buttons ?? [])].filter((item) => item.getClientRects().length > 0)
      const first = visible[0]; const last = visible.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown); document.body.style.overflow = previousOverflow; focusReturn.current?.focus({ preventScroll: true }) }
  }, [mobileOpen, onClose])

  if (!hasPermission(persona, 'bgd.view')) return null

  const depositWells = (wellsQuery.data ?? []).filter((well) => (well.bgd?.depositId ?? 'DEP-SARYTAU') === currentDeposit?.id)
  const normalizedQuery = query.trim().toLocaleLowerCase('ru')
  const visibleWells = depositWells.filter((well) => {
    if (statusFilter !== 'all' && well.status !== statusFilter) return false
    return !normalizedQuery || `${well.code} ${well.type} ${well.profile} ${well.status}`.toLocaleLowerCase('ru').includes(normalizedQuery)
  })

  const openDeposit = () => {
    if (!currentDeposit) return
    onClose()
    void navigate({ to: '/geology/bgd/$depositId', params: { depositId: currentDeposit.id }, search: {} })
  }

  const openWell = (wellId: string) => {
    if (!currentDeposit) return
    onClose()
    const search = selectedWellId ? validateBgdWellSectionSearch(location.search) : {}
    void navigate({ to: '/geology/bgd/$depositId/wells/$wellId', params: { depositId: currentDeposit.id, wellId }, search, resetScroll: false })
  }

  return <>
    <aside ref={panelRef} className={`geology-navigator${mobileOpen ? ' is-mobile-open' : ''}${collapsed ? ' is-collapsed' : ''}`} aria-label="Навигация модуля БГД">
      <button className="geology-navigator__close" type="button" onClick={onClose} aria-label="Закрыть навигацию"><X size={19} /></button>
      <header className="geology-navigator__header">
        <button className="geology-navigator__deposit" type="button" disabled={!currentDeposit} onClick={openDeposit}
          aria-label={currentDeposit ? `Открыть месторождение ${getDepositName(currentDeposit)}` : 'Месторождение не выбрано'}
          aria-current={location.pathname === `/geology/bgd/${currentDeposit?.id}` ? 'page' : undefined}>
          <span className="deposit-context-card__icon"><Mountain size={20} /></span>
          <span><strong>{currentDeposit ? getDepositName(currentDeposit) : 'Месторождение не выбрано'}</strong><small>{currentDeposit ? `Месторождение № ${currentDeposit.code}` : 'Нет доступных объектов'}</small></span>
        </button>
        {onToggle && <button className="geology-navigator__collapse" type="button" onClick={onToggle} aria-expanded={!collapsed} aria-controls="bgd-well-context" aria-label={collapsed ? 'Развернуть список скважин' : 'Свернуть список скважин'} title={collapsed ? 'Развернуть список скважин' : 'Свернуть список скважин'}>{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button>}
      </header>
      {collapsed && <span className="geology-navigator__rail">Скважины</span>}
      <div id="bgd-well-context" className="geology-navigator__body">
      <section className="well-navigator">
        <header><div><strong>Скважины</strong><span>{depositWells.length}</span></div>{currentDeposit && hasPermission(persona, 'geology.bgd.well.create') && <button type="button" aria-label="Добавить скважину" onClick={() => void navigate({ to: '/geology/bgd/$depositId/wells/new', params: { depositId: currentDeposit.id } })}><Plus size={18} aria-hidden="true" />Добавить</button>}</header>
        <div className="well-navigator__search-row">
          <label className="well-navigator__search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по скважинам" aria-label="Поиск по скважинам" /></label>
          <button type="button" className="well-navigator__filter-button" aria-expanded={filtersOpen} aria-controls="well-navigator-filters" onClick={() => setFiltersOpen((open) => !open)}><SlidersHorizontal size={17} aria-hidden="true" />Фильтр</button>
        </div>
        {filtersOpen && <div id="well-navigator-filters" className="well-navigator__filter-popover"><label htmlFor="well-status-filter">Статус скважины</label><select id="well-status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as WellStatusFilter)}><option value="all">Все статусы</option><option value="Работает">Работает</option><option value="Требует внимания">Требует внимания</option><option value="Отключена">Отключена</option><option value="На проверке">На проверке</option></select></div>}
        <div className="well-navigator__list">
          {wellsQuery.isLoading && <span className="well-navigator__empty">Загружаем скважины…</span>}
          {!wellsQuery.isLoading && visibleWells.map((well) => <div key={well.id} className={`well-navigator__item${selectedWellId === well.id ? ' is-active' : ''}`}>
            <button type="button" className="well-navigator__open" aria-current={selectedWellId === well.id ? 'page' : undefined} onClick={() => openWell(well.id)}><span><strong>WELL-{well.code.replace(/^WELL-/, '')}</strong></span></button>
          </div>)}
          {!wellsQuery.isLoading && !visibleWells.length && <span className="well-navigator__empty">Скважины по выбранным условиям не найдены.</span>}
        </div>
      </section>
      </div>
    </aside>
    {mobileOpen && <button type="button" className="geology-navigator-backdrop" aria-label="Закрыть навигацию" onClick={onClose} />}
  </>
}
