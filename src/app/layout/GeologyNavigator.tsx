import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import {
  ChevronDown,
  History,
  Info,
  Layers3,
  Mountain,
  PencilLine,
  Plus,
  RadioTower,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getDepositName } from '../../entities/geology-master/model/types'
import { useSession } from '../../entities/session/model/sessionContext'
import { fetchGeologicalMasterData, fetchPlatformPreferences, fetchWells, savePlatformPreferences } from '../../repository/api'
import { hasPermission } from '../../shared/auth/permissions'
import type { DepositSection } from '../../features/geobase/model/depositSection'

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

export function GeologyNavigator({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const { persona } = useSession()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const location = useRouterState({ select: (state) => state.location })
  const [depositMenuOpen, setDepositMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<WellFilter>('all')
  const [favoriteWells, setFavoriteWells] = useState(readFavoriteWells)
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

  if (!hasPermission(persona, 'geology.view')) return null

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
    void navigate({ to: '/geology/bgd/$depositId/wells/$wellId', params: { depositId: currentDeposit.id, wellId } })
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
    <aside className={`geology-navigator${mobileOpen ? ' is-mobile-open' : ''}`} aria-label="Навигация геологического модуля">
      <button className="geology-navigator__close" type="button" onClick={onClose} aria-label="Закрыть навигацию"><X size={19} /></button>

      <section className="deposit-context-card">
        <button
          className="deposit-context-card__trigger"
          type="button"
          aria-expanded={depositMenuOpen}
          aria-controls="deposit-context-options"
          onClick={() => setDepositMenuOpen((value) => !value)}
        >
          <span className="deposit-context-card__icon"><Mountain size={22} /></span>
          <span><strong>{currentDeposit ? getDepositName(currentDeposit) : 'Месторождение не выбрано'}</strong><small>{currentDeposit ? `Месторождение № ${currentDeposit.code} · Текущее` : 'Выберите доступный объект'}</small></span>
          <ChevronDown size={17} />
        </button>
        {depositMenuOpen && <div id="deposit-context-options" className="deposit-context-card__menu" role="menu">
          {deposits.map((deposit) => <button key={deposit.id} type="button" role="menuitem" className={deposit.id === currentDeposit?.id ? 'is-current' : ''} onClick={() => chooseDeposit(deposit.id)}><Mountain size={16} /><span><strong>{getDepositName(deposit)}</strong><small>№ {deposit.code}</small></span></button>)}
          {!deposits.length && <span>Доступных месторождений пока нет.</span>}
        </div>}
        <nav className="deposit-context-card__sections" aria-label="Разделы месторождения">
          {sectionItems.map((item) => {
            const Icon = item.icon
            const active = location.pathname === `/geology/bgd/${currentDeposit?.id}` && (selectedSection ?? 'overview') === item.id
            return <button key={item.id} type="button" className={active ? 'is-active' : ''} onClick={() => openSection(item.id)}><Icon size={17} /><span>{item.label}</span>{item.count !== undefined && <em>{item.count}</em>}</button>
          })}
          {utilitySections.length > 0 && <div className="deposit-context-card__utilities">{utilitySections.map((item) => {
            const Icon = item.icon
            const active = location.pathname === `/geology/bgd/${currentDeposit?.id}` && selectedSection === item.id
            return <button key={item.id} type="button" className={active ? 'is-active' : ''} onClick={() => openSection(item.id)}><Icon size={15} />{item.label}</button>
          })}</div>}
        </nav>
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
            <button type="button" className="well-navigator__open" onClick={() => openWell(well.id)}><RadioTower size={17} /><span><strong>WELL-{well.code.replace(/^WELL-/, '')}</strong><small>{well.type} · {well.depth.toLocaleString('ru-RU')} м</small></span><i className={`well-status well-status--${well.status === 'Работает' ? 'ok' : well.status === 'Отключена' ? 'neutral' : 'attention'}`} title={well.status} /></button>
            <button type="button" className={`well-navigator__favorite${favoriteWells.has(well.id) ? ' is-active' : ''}`} onClick={() => toggleFavorite(well.id)} aria-label={favoriteWells.has(well.id) ? `Убрать ${well.code} из избранного` : `Добавить ${well.code} в избранное`}><Star size={15} fill={favoriteWells.has(well.id) ? 'currentColor' : 'none'} /></button>
          </div>)}
          {!wellsQuery.isLoading && !visibleWells.length && <span className="well-navigator__empty">Скважины по выбранным условиям не найдены.</span>}
        </div>
      </section>
    </aside>
    {mobileOpen && <button type="button" className="geology-navigator-backdrop" aria-label="Закрыть навигацию" onClick={onClose} />}
  </>
}
