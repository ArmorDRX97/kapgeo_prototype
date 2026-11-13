import { useQuery } from '@tanstack/react-query'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { ArrowRightLeft, FileText, Filter, Map, Mountain, PanelLeftClose, PanelLeftOpen, Plus, Search, TextAlignStart } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FocusEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { bgdFieldWell, bgdFieldWells, filterBgdWells, useBgdFieldFilters } from '../../features/geobase/model/bgdField'
import { DepositPickerDialog } from '../../features/geobase/ui/DepositPickerDialog'
import { getDepositDescription, getDepositName } from '../../entities/geology-master/model/types'
import { wellTypes } from '../../entities/geology-map/wellSymbols'
import { useSession } from '../../entities/session/model/sessionContext'
import { fetchGeologicalMasterData, fetchPlatformPreferences, fetchWells } from '../../repository/api'
import { hasPermission } from '../../shared/auth/permissions'
import { validateBgdWellSectionSearch } from '../../features/geobase/model/bgdWellSection'
import { FilterPopover } from '../../shared/ui/FilterPopover'
import { Button } from '../../shared/ui/Button'
import { Tooltip } from '../../shared/ui/Tooltip'
import { useUiLocale } from '../../shared/lib/useUiLocale'

type WellStatusFilter = 'all' | 'Работает' | 'Требует внимания' | 'Отключена' | 'На проверке'
type DepositDropdown = 'actions' | 'description'

export function GeologyNavigator({ mobileOpen, onClose, collapsed = false, onToggle }: { mobileOpen: boolean; onClose: () => void; collapsed?: boolean; onToggle?: () => void }) {
  const { persona } = useSession()
  const locale = useUiLocale()
  const navigate = useNavigate()
  const location = useRouterState({ select: (state) => state.location })
  const [windowSize, setWindowSize] = useState({ key: '', count: 80 })
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [depositDropdown, setDepositDropdown] = useState<DepositDropdown | null>(null)
  const [switchOpen, setSwitchOpen] = useState(false)
  const infoTrigger = useRef<HTMLButtonElement>(null)
  const descriptionTrigger = useRef<HTMLButtonElement>(null)
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
    if (!depositDropdown) return
    const trigger = (depositDropdown === 'actions' ? infoTrigger : descriptionTrigger).current
    const group = trigger?.parentElement
    const dismiss = (event: PointerEvent) => {
      if (!group?.contains(event.target as Node)) setDepositDropdown(null)
    }
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      event.preventDefault()
      if (group?.contains(document.activeElement)) trigger?.focus()
      setDepositDropdown(null)
    }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', onEscape, true)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('keydown', onEscape, true)
    }
  }, [depositDropdown])

  useEffect(() => {
    if (!mobileOpen) return
    focusReturn.current = document.activeElement as HTMLElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.querySelector<HTMLButtonElement>('.geology-navigator__close')?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || document.querySelector('dialog[open]')) return
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
  const infoOpen = depositDropdown === 'actions'
  const descriptionOpen = depositDropdown === 'description'

  const dropdownEvents = (dropdown: DepositDropdown) => {
    const close = () => setDepositDropdown(open => open === dropdown ? null : open)
    const trigger = dropdown === 'actions' ? infoTrigger : descriptionTrigger
    return {
      onPointerEnter: (event: ReactPointerEvent<HTMLDivElement>) => {
        if (currentDeposit && event.pointerType === 'mouse') setDepositDropdown(dropdown)
      },
      onPointerLeave: (event: ReactPointerEvent<HTMLDivElement>) => {
        const focused = document.activeElement
        if (!event.currentTarget.contains(focused) || focused === trigger.current) close()
      },
      onBlur: (event: FocusEvent<HTMLDivElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close()
      },
    }
  }

  const closeNavigation = () => {
    setDepositDropdown(null)
    closeFilters()
    onClose()
  }

  const openDeposit = (depositId: string) => {
    closeNavigation()
    void navigate({ to: '/geology/bgd/$depositId', params: { depositId }, search: {} })
  }

  const openWell = (wellId: string) => {
    if (!currentDeposit) return
    closeNavigation()
    const search = selectedWellId ? validateBgdWellSectionSearch(location.search) : {}
    void navigate({ to: '/geology/bgd/$depositId/wells/$wellId', params: { depositId: currentDeposit.id, wellId }, search, resetScroll: false })
  }

  return <>
    <aside ref={panelRef} className={`geology-navigator${mobileOpen ? ' is-mobile-open' : ''}${collapsed ? ' is-collapsed' : ''}`} aria-label="Навигация модуля БГД">
      <header className="geology-navigator__header">
        <div className="geology-navigator__info" {...dropdownEvents('actions')}>
          <button ref={infoTrigger} className="geology-navigator__icon" type="button" aria-label="Информация" aria-expanded={infoOpen}
            aria-controls={infoOpen ? 'bgd-deposit-actions' : undefined} disabled={!currentDeposit} onClick={() => setDepositDropdown('actions')}>
            <Mountain size={20} />
          </button>
          {infoOpen && currentDeposit && <div id="bgd-deposit-actions" className="geology-navigator__dropdown-panel geology-navigator__info-panel">
            <button type="button" onClick={() => {
              infoTrigger.current?.focus()
              closeNavigation()
              void navigate({ to: '/geology/bgd/$depositId/conditions', params: { depositId: currentDeposit.id } })
            }}><FileText size={16} />Сведения о месторождении</button>
            <button type="button" onClick={() => {
              infoTrigger.current?.focus()
              setDepositDropdown(null)
              setSwitchOpen(true)
            }}><ArrowRightLeft size={16} />Сменить месторождение</button>
          </div>}
        </div>
        <div className="geology-navigator__map"><Tooltip content="Карта"><button className="geology-navigator__icon" type="button" disabled={!currentDeposit}
          aria-label="Карта" aria-current={location.pathname === `/geology/bgd/${currentDeposit?.id}` ? 'page' : undefined}
          onClick={() => { if (currentDeposit) openDeposit(currentDeposit.id) }}>
          <Map size={20} />
        </button></Tooltip></div>
        {onToggle && <Tooltip content={collapsed ? 'Развернуть список скважин' : 'Свернуть список скважин'}><button className="geology-navigator__icon geology-navigator__collapse" type="button"
          onClick={() => { setDepositDropdown(null); closeFilters(); onToggle() }} aria-expanded={!collapsed} aria-controls="bgd-well-context"
          aria-label={collapsed ? 'Развернуть список скважин' : 'Свернуть список скважин'}>{collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}</button></Tooltip>}
        <button className="geology-navigator__icon geology-navigator__close" type="button" onClick={closeNavigation} aria-label="Закрыть навигацию"><PanelLeftClose size={16} /></button>
      </header>
      <div id="bgd-well-context" className="geology-navigator__body">
      {currentDeposit && <div className="geology-navigator__deposit">
        <strong title={getDepositName(currentDeposit, locale)}>{getDepositName(currentDeposit, locale)}</strong>
        <div className="geology-navigator__description" {...dropdownEvents('description')}>
          <button ref={descriptionTrigger} className="geology-navigator__icon" type="button" aria-label="Описание месторождения" aria-expanded={descriptionOpen}
            aria-controls={descriptionOpen ? 'bgd-deposit-description' : undefined} onClick={() => setDepositDropdown('description')}>
            <TextAlignStart size={17} />
          </button>
          {descriptionOpen && <div id="bgd-deposit-description" className="geology-navigator__dropdown-panel geology-navigator__description-panel" role="region" aria-label="Описание месторождения" tabIndex={0}>
            {getDepositDescription(currentDeposit, locale) || 'Описание месторождения не заполнено'}
          </div>}
        </div>
      </div>}
      <section className="well-navigator">
        <div className="well-navigator__title">
          <span>Скважины</span>
          <span className="well-navigator__count" title="Всего скважин">{bgdFieldWells.length.toLocaleString('ru-RU')}</span>
        </div>
        <div className="well-navigator__search-row">
          <label className="well-navigator__search"><Search size={14} /><input disabled={!currentDeposit} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск" aria-label="Поиск по скважинам" /></label>
          {currentDeposit && hasPermission(persona, 'geology.bgd.well.create') && <Tooltip content="Добавить скважину">
            <button className="geology-navigator__icon" type="button" aria-label="Добавить скважину" onClick={() => {
              closeNavigation()
              void navigate({ to: '/geology/bgd/$depositId/wells/new', params: { depositId: currentDeposit.id } })
            }}><Plus size={16} /></button>
          </Tooltip>}
          <Tooltip content="Фильтр"><button ref={filterTrigger} type="button" className="geology-navigator__icon well-navigator__filter-button" aria-label="Фильтр"
            aria-expanded={filtersOpen} aria-haspopup="dialog" aria-controls={filtersOpen ? 'well-navigator-filters' : undefined}
            data-active={activeFilters > 0} onClick={() => setFiltersOpen((open) => !open)}><Filter size={15} /></button></Tooltip>
        </div>
        {filtersOpen && (!collapsed || mobileOpen) && <FilterPopover id="well-navigator-filters" title="Фильтры скважин" anchor={filterTrigger} onClose={closeFilters} footer={<><p>Найдено {foundCount} из {bgdFieldWells.length}. Фильтры применяются сразу.</p><Button variant="secondary" onClick={reset}>Сбросить фильтры</Button></>}><label>Статус скважины<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as WellStatusFilter)}><option value="all">Все статусы</option><option value="Работает">Работает</option><option value="Требует внимания">Требует внимания</option><option value="Отключена">Отключена</option><option value="На проверке">На проверке</option></select></label><fieldset className="bgd-type-choices"><legend>Типы скважин</legend>{wellTypes.map(t => <label key={t.name}><input type="checkbox" checked={!filters.hiddenTypes.includes(t.name)} onChange={() => setFilters({ hiddenTypes: filters.hiddenTypes.includes(t.name) ? filters.hiddenTypes.filter(v => v !== t.name) : [...filters.hiddenTypes, t.name] })} /><i style={{ background: t.color }} />{t.name}</label>)}</fieldset><label>Участок<select value={filters.site} onChange={e => setFilters({ site: e.target.value })}><option value="all">Все участки</option><option>Северный</option><option>Южный</option></select></label></FilterPopover>}
        <div className="well-navigator__list" onScroll={e => { const node = e.currentTarget; if (node.scrollHeight - node.scrollTop - node.clientHeight < 180 && limit < visibleWells.length) showMore() }}>
          {extraWells.map(well => <div key={well.id} className={`well-navigator__item${selectedWellId === well.id ? ' is-active' : ''}`}><button type="button" className="well-navigator__open" aria-current={selectedWellId === well.id ? 'page' : undefined} onClick={() => openWell(well.id)}><span><strong>WELL-{well.code.replace(/^WELL-/, '')}</strong></span>{selectedWellId === well.id && <span className="well-navigator__selected" aria-hidden="true" />}</button></div>)}
          {selectedCatalogueWell && !shown.includes(selectedCatalogueWell) && <div className="well-navigator__item is-active"><button type="button" className="well-navigator__open" aria-current="page" onClick={() => openWell(selectedCatalogueWell.id)}><span><strong>{selectedCatalogueWell.name}</strong></span><span className="well-navigator__selected" aria-hidden="true" /></button></div>}
          {shown.map(well => <div key={well.id} className={`well-navigator__item${selectedWellId === well.id ? ' is-active' : ''}`}><button type="button" className="well-navigator__open" aria-current={selectedWellId === well.id ? 'page' : undefined} onClick={() => openWell(well.id)}><span><strong>{well.name}</strong><small>{well.attributes.type}</small></span>{selectedWellId === well.id && <span className="well-navigator__selected" aria-hidden="true" />}</button></div>)}
          {shown.length < visibleWells.length && <button type="button" className="well-navigator__load-more" onClick={showMore}>Показать ещё {Math.min(80, visibleWells.length - shown.length)}</button>}
          {!visibleWells.length && !extraWells.length && <span className="well-navigator__empty">Скважины по выбранным условиям не найдены.</span>}
        </div>

      </section>
      </div>
    </aside>
    {mobileOpen && <button type="button" className="geology-navigator-backdrop" aria-label="Закрыть навигацию" tabIndex={-1} onClick={closeNavigation} />}
    {switchOpen && currentDeposit && <DepositPickerDialog deposits={deposits} currentId={currentDeposit.id} onClose={() => setSwitchOpen(false)}
      onSelect={depositId => { setSwitchOpen(false); openDeposit(depositId) }} />}
  </>
}
