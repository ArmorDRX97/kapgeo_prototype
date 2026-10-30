import { useQuery } from '@tanstack/react-query'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { Map, PanelLeftClose, PanelLeftOpen, Plus, Search, SlidersHorizontal, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { bgdFieldWell, bgdFieldWells, filterBgdWells, useBgdFieldFilters } from '../../features/geobase/model/bgdField'
import { wellTypes } from '../../entities/geology-map/wellSymbols'
import { useSession } from '../../entities/session/model/sessionContext'
import { fetchGeologicalMasterData, fetchPlatformPreferences, fetchWells } from '../../repository/api'
import { hasPermission } from '../../shared/auth/permissions'
import { validateBgdWellSectionSearch } from '../../features/geobase/model/bgdWellSection'
import { FilterPopover } from '../../shared/ui/FilterPopover'
import { Button } from '../../shared/ui/Button'

type WellStatusFilter = 'all' | 'Работает' | 'Требует внимания' | 'Отключена' | 'На проверке'

export function GeologyNavigator({ mobileOpen, onClose, collapsed = false, onToggle }: { mobileOpen: boolean; onClose: () => void; collapsed?: boolean; onToggle?: () => void }) {
  const { persona } = useSession()
  const navigate = useNavigate()
  const location = useRouterState({ select: (state) => state.location })
  const [windowSize, setWindowSize] = useState({ key: '', count: 80 })
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filterTrigger = useRef<HTMLButtonElement>(null)
  const closeFilters = useCallback(() => setFiltersOpen(false), [])
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

  const { filters, setFilters, reset } = useBgdFieldFilters(currentDeposit?.id ?? '')
  const query = filters.query, statusFilter = filters.status as WellStatusFilter
  const setQuery = (query: string) => setFilters({ query })
  const setStatusFilter = (status: string) => setFilters({ status })

  useEffect(() => {
    if (!mobileOpen) return
    focusReturn.current = document.activeElement as HTMLElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.querySelector<HTMLButtonElement>('.geology-navigator__close')?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose() }
      if (event.key !== 'Tab') return
      const selector = 'button:not(:disabled), input, select, [tabindex="0"]'
      const buttons = [...(panelRef.current?.querySelectorAll<HTMLElement>(selector) ?? []), ...(document.getElementById('well-navigator-filters')?.querySelectorAll<HTMLElement>(selector) ?? [])]
      const visible = buttons.filter((item) => item.getClientRects().length > 0)
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
  const visibleWells = filterBgdWells(filters), filterKey = `${currentDeposit?.id}:${JSON.stringify(filters)}`
  const limit = windowSize.key === filterKey ? windowSize.count : 80, shown = visibleWells.slice(0, limit)
  const selectedCatalogueWell = bgdFieldWell(selectedWellId)
  const extraWells = depositWells.filter(w => w.id === selectedWellId || normalizedQuery && `${w.code} ${w.type} ${w.profile} ${w.status}`.toLocaleLowerCase('ru').includes(normalizedQuery))
  const foundCount = visibleWells.length + extraWells.length
  const activeFilters = Number(statusFilter !== 'all') + Number(filters.hiddenTypes.length > 0) + Number(filters.site !== 'all')
  const showMore = () => setWindowSize({ key: filterKey, count: Math.min(visibleWells.length, limit + 80) })


  const openDeposit = () => {
    if (!currentDeposit) return
    closeFilters()
    onClose()
    void navigate({ to: '/geology/bgd/$depositId', params: { depositId: currentDeposit.id }, search: {} })
  }

  const openWell = (wellId: string) => {
    if (!currentDeposit) return
    closeFilters()
    onClose()
    const search = selectedWellId ? validateBgdWellSectionSearch(location.search) : {}
    void navigate({ to: '/geology/bgd/$depositId/wells/$wellId', params: { depositId: currentDeposit.id, wellId }, search, resetScroll: false })
  }

  return <>
    <aside ref={panelRef} className={`geology-navigator${mobileOpen ? ' is-mobile-open' : ''}${collapsed ? ' is-collapsed' : ''}`} aria-label="Навигация модуля БГД">
      <button className="geology-navigator__close" type="button" onClick={() => { closeFilters(); onClose() }} aria-label="Закрыть навигацию"><X size={19} /></button>
      <header className="geology-navigator__header">
        <button className="geology-navigator__deposit" type="button" disabled={!currentDeposit} onClick={openDeposit}
          aria-label={currentDeposit ? 'Главная' : 'Месторождение не выбрано'}
          aria-current={location.pathname === `/geology/bgd/${currentDeposit?.id}` ? 'page' : undefined}>
          <Map size={18} aria-hidden="true" />
          <span><strong>Главная</strong></span>
        </button>
        {onToggle && <button className="geology-navigator__collapse" type="button" onClick={() => { closeFilters(); onToggle() }} aria-expanded={!collapsed} aria-controls="bgd-well-context" aria-label={collapsed ? 'Развернуть список скважин' : 'Свернуть список скважин'} title={collapsed ? 'Развернуть список скважин' : 'Свернуть список скважин'}>{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button>}
      </header>
      {collapsed && <span className="geology-navigator__rail">Скважины</span>}
      <div id="bgd-well-context" className="geology-navigator__body">
      <section className="well-navigator">
        <header>
          <div className="well-navigator__title"><strong>Скважины</strong><span className="well-navigator__count" aria-label="Количество скважин">{bgdFieldWells.length.toLocaleString('ru-RU')}</span></div>
          <div className="well-navigator__actions">
            {currentDeposit && hasPermission(persona, 'geology.bgd.well.create') && <button className="well-navigator__add" type="button" aria-label="Добавить скважину" onClick={() => void navigate({ to: '/geology/bgd/$depositId/wells/new', params: { depositId: currentDeposit.id } })}><Plus size={18} aria-hidden="true" />Добавить</button>}
            <button ref={filterTrigger} type="button" className="well-navigator__filter-button" aria-expanded={filtersOpen} aria-haspopup="dialog" aria-controls={filtersOpen ? 'well-navigator-filters' : undefined} data-active={activeFilters > 0} onClick={() => setFiltersOpen((open) => !open)}><SlidersHorizontal size={17} aria-hidden="true" />Фильтр{activeFilters > 0 && <span aria-hidden="true">{activeFilters}</span>}</button>
          </div>
        </header>
        <div className="well-navigator__search-row">
          <label className="well-navigator__search"><Search size={17} /><input disabled={!currentDeposit} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по скважинам" aria-label="Поиск по скважинам" /></label>
        </div>
        {filtersOpen && !collapsed && <FilterPopover id="well-navigator-filters" title="Фильтры скважин" anchor={filterTrigger} onClose={closeFilters} footer={<><p>Найдено {foundCount} из {bgdFieldWells.length}. Фильтры применяются сразу.</p><Button variant="secondary" onClick={reset}>Сбросить фильтры</Button></>}><label>Статус скважины<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as WellStatusFilter)}><option value="all">Все статусы</option><option value="Работает">Работает</option><option value="Требует внимания">Требует внимания</option><option value="Отключена">Отключена</option><option value="На проверке">На проверке</option></select></label><fieldset className="bgd-type-choices"><legend>Типы скважин</legend>{wellTypes.map(t => <label key={t.name}><input type="checkbox" checked={!filters.hiddenTypes.includes(t.name)} onChange={() => setFilters({ hiddenTypes: filters.hiddenTypes.includes(t.name) ? filters.hiddenTypes.filter(v => v !== t.name) : [...filters.hiddenTypes, t.name] })} /><i style={{ background: t.color }} />{t.name}</label>)}</fieldset><label>Участок<select value={filters.site} onChange={e => setFilters({ site: e.target.value })}><option value="all">Все участки</option><option>Северный</option><option>Южный</option></select></label></FilterPopover>}
        <div className="bgd-well-list-meta"><span>Найдено {foundCount.toLocaleString('ru-RU')}</span><span>{Math.min(limit, visibleWells.length)} показано</span></div>
        <div className="well-navigator__list" onScroll={e => { const node = e.currentTarget; if (node.scrollHeight - node.scrollTop - node.clientHeight < 180 && limit < visibleWells.length) showMore() }}>
          {extraWells.map(well => <div key={well.id} className={`well-navigator__item${selectedWellId === well.id ? ' is-active' : ''}`}><button type="button" className="well-navigator__open" aria-current={selectedWellId === well.id ? 'page' : undefined} onClick={() => openWell(well.id)}><span><strong>WELL-{well.code.replace(/^WELL-/, '')}</strong></span>{selectedWellId === well.id && <span className="well-navigator__selected" aria-hidden="true" />}</button></div>)}
          {selectedCatalogueWell && !shown.includes(selectedCatalogueWell) && <div className="well-navigator__item is-active"><button type="button" className="well-navigator__open" aria-current="page" onClick={() => openWell(selectedCatalogueWell.id)}><span><small>Выбранная скважина</small><strong>{selectedCatalogueWell.name}</strong></span><span className="well-navigator__selected" aria-hidden="true" /></button></div>}
          {shown.map(well => <div key={well.id} className={`well-navigator__item${selectedWellId === well.id ? ' is-active' : ''}`}><button type="button" className="well-navigator__open" aria-current={selectedWellId === well.id ? 'page' : undefined} onClick={() => openWell(well.id)}><span><i className="bgd-well-type-dot" style={{ background: well.style.stroke }} /><strong>{well.name}</strong><small>{well.attributes.type}</small></span>{selectedWellId === well.id && <span className="well-navigator__selected" aria-hidden="true" />}</button></div>)}
          {shown.length < visibleWells.length && <button type="button" className="well-navigator__load-more" onClick={showMore}>Показать ещё {Math.min(80, visibleWells.length - shown.length)}</button>}
          {!visibleWells.length && !extraWells.length && <span className="well-navigator__empty">Скважины по выбранным условиям не найдены.</span>}
        </div>

      </section>
      </div>
    </aside>
    {mobileOpen && <button type="button" className="geology-navigator-backdrop" aria-label="Закрыть навигацию" onClick={() => { closeFilters(); onClose() }} />}
  </>
}
