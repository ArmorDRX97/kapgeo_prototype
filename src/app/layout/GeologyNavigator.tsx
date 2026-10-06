import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import {
  ChevronDown,
  ArrowLeft,
  ArrowRightLeft,
  History,
  Info,
  Layers3,
  Mountain,
  PanelLeftClose,
  PanelLeftOpen,
  PencilLine,
  Plus,
  RadioTower,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { getDepositName } from '../../entities/geology-master/model/types'
import { useSession } from '../../entities/session/model/sessionContext'
import { fetchGeologicalMasterData, fetchPlatformPreferences, fetchWells, savePlatformPreferences } from '../../repository/api'
import { hasPermission } from '../../shared/auth/permissions'
import type { DepositSection } from '../../features/geobase/model/depositSection'
import { validateBgdWellSectionSearch } from '../../features/geobase/model/bgdWellSection'

type WellFilter = 'all' | 'favorites' | 'attention'

const FAVORITE_WELLS_KEY = 'kapgeo.favorite-wells'

function readFavoriteWells() {
  try {
    const value = JSON.parse(window.localStorage.getItem(FAVORITE_WELLS_KEY) ?? '[]')
    return new Set<string>(Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [])
  } catch {
    return new Set<string>()
  }
}

export function GeologyNavigator({ mobileOpen, onClose, collapsed = false, onToggle }: { mobileOpen: boolean; onClose: () => void; collapsed?: boolean; onToggle?: () => void }) {
  const { persona } = useSession()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const location = useRouterState({ select: (state) => state.location })
  const [depositMenuExpanded, setDepositMenuOpen] = useState(false)
  const menuContext = `${location.pathname}:${JSON.stringify(location.search)}:${collapsed}`
  const [depositMenuContext, setDepositMenuContext] = useState(menuContext)
  const depositMenuOpen = depositMenuExpanded && depositMenuContext === menuContext
  const [depositMenuView, setDepositMenuView] = useState<'actions' | 'switch'>('actions')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<WellFilter>('all')
  const [favoriteWells, setFavoriteWells] = useState(readFavoriteWells)
  const panelRef = useRef<HTMLElement>(null)
  const focusReturn = useRef<HTMLElement | null>(null)
  const depositRef = useRef<HTMLElement>(null)
  const depositTriggerRef = useRef<HTMLButtonElement>(null)
  const depositMenuRef = useRef<HTMLDivElement>(null)
  const masterQuery = useQuery({ queryKey: ['geology-master'], queryFn: fetchGeologicalMasterData })
  const preferencesQuery = useQuery({ queryKey: ['platform-preferences'], queryFn: fetchPlatformPreferences })
  const wellsQuery = useQuery({ queryKey: ['wells'], queryFn: fetchWells })

  const routeDepositMatch = location.pathname.match(/^\/geology\/bgd\/([^/]+)/)
  const routeDepositId = routeDepositMatch?.[1] ? decodeURIComponent(routeDepositMatch[1]) : undefined
  const selectedWellId = location.pathname.match(/\/wells\/([^/]+)$/)?.[1]
  const selectedSection = (location.search as { section?: DepositSection }).section
  const deposits = useMemo(() => (masterQuery.data?.deposits ?? []).filter((item) => !item.isHidden), [masterQuery.data?.deposits])
  const currentDeposit = deposits.find((item) => item.id === routeDepositId)
    ?? deposits.find((item) => item.id === preferencesQuery.data?.currentDepositId)
    ?? deposits[0]

  const selectDepositMutation = useMutation({
    mutationFn: async (depositId: string) => {
      const preferences = preferencesQuery.data
      if (!preferences) throw new Error('Не удалось загрузить настройки интерфейса.')
      return savePlatformPreferences({
        locale: preferences.locale,
        density: preferences.density,
        contrast: preferences.contrast,
        reducedMotion: preferences.reducedMotion,
        currentDepositId: depositId,
      })
    },
    onSuccess: (next) => queryClient.setQueryData(['platform-preferences'], next),
  })

  useEffect(() => {
    window.localStorage.setItem(FAVORITE_WELLS_KEY, JSON.stringify([...favoriteWells]))
  }, [favoriteWells])

  useEffect(() => {
    if (!depositMenuOpen) return
    depositMenuRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true })
    const onPointerDown = (event: PointerEvent) => {
      if (!depositRef.current?.contains(event.target as Node)) setDepositMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [depositMenuOpen, depositMenuView])

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

  const sites = masterQuery.data?.sites.filter((item) => item.depositId === currentDeposit?.id) ?? []
  const siteIds = new Set(sites.map((item) => item.id))
  const relationCount = sites.length
    + (masterQuery.data?.lenses.filter((item) => siteIds.has(item.siteId)).length ?? 0)
    + (currentDeposit?.occurrences.length ?? 0)
  const conditionCount = masterQuery.data?.conditionSets.filter((item) => siteIds.has(item.siteId)).length ?? 0
  const depositWells = (wellsQuery.data ?? []).filter((well) => (well.bgd?.depositId ?? 'DEP-SARYTAU') === currentDeposit?.id)
  const normalizedQuery = query.trim().toLocaleLowerCase('ru')
  const visibleWells = depositWells.filter((well) => {
    if (filter === 'favorites' && !favoriteWells.has(well.id)) return false
    if (filter === 'attention' && well.status === 'Работает') return false
    return !normalizedQuery || `${well.code} ${well.type} ${well.profile} ${well.status}`.toLocaleLowerCase('ru').includes(normalizedQuery)
  })

  const chooseDeposit = (depositId: string) => {
    setDepositMenuOpen(false)
    selectDepositMutation.mutate(depositId)
    onClose()
    void navigate({ to: '/geology/bgd/$depositId', params: { depositId } })
  }

  const openSection = (section: DepositSection) => {
    if (!currentDeposit) return
    setDepositMenuOpen(false)
    onClose()
    void navigate({
      to: '/geology/bgd/$depositId',
      params: { depositId: currentDeposit.id },
      search: { section: section === 'overview' ? undefined : section },
    })
  }

  const openWell = (wellId: string) => {
    if (!currentDeposit) return
    onClose()
    const search = selectedWellId ? validateBgdWellSectionSearch(location.search) : {}
    void navigate({ to: '/geology/bgd/$depositId/wells/$wellId', params: { depositId: currentDeposit.id, wellId }, search, resetScroll: false })
  }

  const toggleFavorite = (wellId: string) => setFavoriteWells((current) => {
    const next = new Set(current)
    if (next.has(wellId)) next.delete(wellId)
    else next.add(wellId)
    return next
  })

  const sectionItems: Array<{ id: DepositSection; label: string; icon: typeof Info; count?: number }> = [
    { id: 'overview', label: 'Основные сведения', icon: Info },
    { id: 'relations', label: 'Участки и залежи', icon: Layers3, count: relationCount },
    { id: 'conditions', label: 'Кондиционные лимиты', icon: SlidersHorizontal, count: conditionCount },
  ]
  const utilitySections: Array<{ id: DepositSection; label: string; icon: typeof Info }> = [
    ...(hasPermission(persona, 'geology.bgd.update') ? [{ id: 'edit' as const, label: 'Редактирование', icon: PencilLine }] : []),
    ...(hasPermission(persona, 'geology.bgd.audit') ? [{ id: 'audit' as const, label: 'Аудит', icon: History }] : []),
  ]

  return <>
    <aside ref={panelRef} className={`geology-navigator${mobileOpen ? ' is-mobile-open' : ''}${collapsed ? ' is-collapsed' : ''}`} aria-label="Навигация модуля БГД">
      <button className="geology-navigator__close" type="button" onClick={onClose} aria-label="Закрыть навигацию"><X size={19} /></button>
      <header className="geology-navigator__header"><span>Месторождение и скважины</span>{onToggle && <button className="geology-navigator__collapse" type="button" onClick={onToggle} aria-expanded={!collapsed} aria-controls="bgd-well-context" aria-label={collapsed ? 'Развернуть список скважин' : 'Свернуть список скважин'} title={collapsed ? 'Развернуть список скважин' : 'Свернуть список скважин'}>{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button>}</header>
      {collapsed && <span className="geology-navigator__rail">Скважины</span>}
      <div id="bgd-well-context" className="geology-navigator__body">
      <section ref={depositRef} className="deposit-context-card">
        <button
          ref={depositTriggerRef}
          className="deposit-context-card__trigger"
          type="button"
          aria-expanded={depositMenuOpen}
          aria-controls="deposit-context-options"
          aria-haspopup="menu"
          aria-label={currentDeposit ? `Меню месторождения ${getDepositName(currentDeposit)}` : 'Меню месторождения'}
          onClick={() => { setDepositMenuContext(menuContext); setDepositMenuView('actions'); setDepositMenuOpen(!depositMenuOpen) }}
          onKeyDown={(event) => { if (event.key === 'ArrowDown') { event.preventDefault(); setDepositMenuContext(menuContext); setDepositMenuView('actions'); setDepositMenuOpen(true) } }}
        >
          <span className="deposit-context-card__icon"><Mountain size={22} /></span>
          <span><strong>{currentDeposit ? getDepositName(currentDeposit) : 'Месторождение не выбрано'}</strong><small>{currentDeposit ? `Месторождение № ${currentDeposit.code} · Текущее` : 'Выберите доступный объект'}</small></span>
          <ChevronDown size={17} />
        </button>
        {depositMenuOpen && <div ref={depositMenuRef} id="deposit-context-options" className="deposit-context-card__menu" role="menu" aria-label={depositMenuView === 'switch' ? 'Смена месторождения' : 'Действия месторождения'} onKeyDown={(event) => {
          if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setDepositMenuOpen(false); depositTriggerRef.current?.focus({ preventScroll: true }); return }
          if (event.key === 'Tab') { setDepositMenuOpen(false); depositTriggerRef.current?.focus({ preventScroll: true }); return }
          const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
          const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : event.key === 'ArrowDown' ? (index + 1) % buttons.length : event.key === 'ArrowUp' ? (index - 1 + buttons.length) % buttons.length : -1
          if (next >= 0) { event.preventDefault(); buttons[next]?.focus({ preventScroll: true }) }
        }}>
          {depositMenuView === 'switch' ? <>
            <button type="button" role="menuitem" onClick={() => setDepositMenuView('actions')}><ArrowLeft size={16} /><span>Назад к разделам</span></button>
            <div className="deposit-context-card__menu-label">Сменить месторождение</div>
            {deposits.map((deposit) => <button key={deposit.id} type="button" role="menuitemradio" aria-checked={deposit.id === currentDeposit?.id} disabled={selectDepositMutation.isPending} className={deposit.id === currentDeposit?.id ? 'is-current' : ''} onClick={() => chooseDeposit(deposit.id)}><Mountain size={16} /><span><strong>{getDepositName(deposit)}</strong><small>№ {deposit.code}{deposit.id === currentDeposit?.id ? ' · Текущее' : ''}</small></span></button>)}
            {!deposits.length && <span>Доступных месторождений пока нет.</span>}
          </> : <>
          <div className="deposit-context-card__menu-label">Разделы месторождения</div>
          {sectionItems.map((item) => {
            const Icon = item.icon
            const active = location.pathname === `/geology/bgd/${currentDeposit?.id}` && (selectedSection ?? 'overview') === item.id
            return <button key={item.id} type="button" role="menuitem" aria-current={active ? 'page' : undefined} className={active ? 'is-active' : ''} onClick={() => openSection(item.id)}><Icon size={17} /><span>{item.label}</span>{item.count !== undefined && <em>{item.count}</em>}</button>
          })}
          {utilitySections.length > 0 && <div className="deposit-context-card__menu-separator" role="separator" />}{utilitySections.map((item) => {
            const Icon = item.icon
            const active = location.pathname === `/geology/bgd/${currentDeposit?.id}` && selectedSection === item.id
            return <button key={item.id} type="button" role="menuitem" aria-current={active ? 'page' : undefined} className={active ? 'is-active' : ''} onClick={() => openSection(item.id)}><Icon size={17} /><span>{item.label}</span></button>
          })}
          <div className="deposit-context-card__menu-separator" role="separator" />
          <button type="button" role="menuitem" onClick={() => setDepositMenuView('switch')}><ArrowRightLeft size={17} /><span>Сменить месторождение</span><ChevronDown size={15} /></button>
          </>}
        </div>}
        {selectDepositMutation.isError && <p role="alert">{selectDepositMutation.error.message}</p>}
      </section>

      <section className="well-navigator">
        <header><div><strong>Скважины</strong><span>{depositWells.length}</span></div>{currentDeposit && hasPermission(persona, 'geology.bgd.well.create') && <button type="button" aria-label="Создать скважину" onClick={() => void navigate({ to: '/geology/bgd/$depositId/wells/new', params: { depositId: currentDeposit.id } })}><Plus size={18} /></button>}</header>
        <label className="well-navigator__search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по скважинам" aria-label="Поиск по скважинам" /></label>
        <div className="well-navigator__filters" aria-label="Фильтр скважин">
          <button type="button" className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>Все</button>
          <button type="button" className={filter === 'favorites' ? 'is-active' : ''} onClick={() => setFilter('favorites')}>Избранные</button>
          <button type="button" className={filter === 'attention' ? 'is-active' : ''} onClick={() => setFilter('attention')}>Требуют внимания</button>
        </div>
        <div className="well-navigator__list">
          {wellsQuery.isLoading && <span className="well-navigator__empty">Загружаем скважины…</span>}
          {!wellsQuery.isLoading && visibleWells.map((well) => <div key={well.id} className={`well-navigator__item${selectedWellId === well.id ? ' is-active' : ''}`}>
            <button type="button" className="well-navigator__open" aria-current={selectedWellId === well.id ? 'page' : undefined} onClick={() => openWell(well.id)}><RadioTower size={17} /><span><strong>WELL-{well.code.replace(/^WELL-/, '')}</strong><small>{well.type} · {well.depth.toLocaleString('ru-RU')} м</small><small className="well-navigator__status-text">{well.status}</small></span><i className={`well-status well-status--${well.status === 'Работает' ? 'ok' : well.status === 'Отключена' ? 'neutral' : 'attention'}`} title={well.status} /></button>
            <button type="button" className={`well-navigator__favorite${favoriteWells.has(well.id) ? ' is-active' : ''}`} onClick={() => toggleFavorite(well.id)} aria-label={favoriteWells.has(well.id) ? `Убрать ${well.code} из избранного` : `Добавить ${well.code} в избранное`}><Star size={15} fill={favoriteWells.has(well.id) ? 'currentColor' : 'none'} /></button>
          </div>)}
          {!wellsQuery.isLoading && !visibleWells.length && <span className="well-navigator__empty">Скважины по выбранным условиям не найдены.</span>}
        </div>
      </section>
      </div>
    </aside>
    {mobileOpen && <button type="button" className="geology-navigator-backdrop" aria-label="Закрыть навигацию" onClick={onClose} />}
  </>
}
