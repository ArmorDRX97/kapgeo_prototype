import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router'
import { ArrowUpDown, Map as MapIcon, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { defaultWellFilters, filterWells } from '../../entities/well/lib/filterWells'
import type { WellStatus } from '../../entities/well/model/types'
import { fetchWellRegistryPreferences, fetchWells, saveWellRegistryPreferences } from '../../repository/api'
import { Badge } from '../../shared/ui/Badge'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'
import { WellFilterBar } from './components/WellFilterBar'
import { filtersToWellSearch, searchToWellFilters, searchToWellWorkspace, type WellWorkspaceFocus, type WellSearch } from './wellSearch'

const wellsRoute = getRouteApi('/geology/wells')

const statusTone: Record<WellStatus, 'success' | 'info' | 'neutral' | 'warning'> = {
  'Работает': 'success',
  'На проверке': 'info',
  'Отключена': 'neutral',
  'Требует внимания': 'warning',
}

export function WellsPage() {
  const { data = [], isLoading } = useQuery({ queryKey: ['wells'], queryFn: fetchWells })
  const preferencesQuery = useQuery({ queryKey: ['well-registry-preferences'], queryFn: fetchWellRegistryPreferences })
  const queryClient = useQueryClient()
  const savePreferences = useMutation({ mutationFn: saveWellRegistryPreferences, onSuccess: (next) => queryClient.setQueryData(['well-registry-preferences'], next) })
  const search = wellsRoute.useSearch()
  const navigate = useNavigate({ from: '/geology/wells' })
  const filters = searchToWellFilters(search)
  const {
    selectedWellId: workspaceSelectedWellId,
    workspaceVersion,
    workspaceScenario,
    workspaceFocus: rawWorkspaceFocus,
  } = searchToWellWorkspace(search)
  const workspaceFocus = rawWorkspaceFocus ?? 'registry'
  const filtered = useMemo(() => filterWells(data, filters), [data, filters])
  const grouping = preferencesQuery.data?.grouping ?? 'site'
  const groupedFiltered = useMemo(() => [...filtered].sort((left, right) => (grouping === 'site' ? left.site.localeCompare(right.site) || left.code.localeCompare(right.code) : left.status.localeCompare(right.status) || left.code.localeCompare(right.code))), [filtered, grouping])
  const sites = useMemo(() => [...new Set(data.map((well) => well.site))], [data])
  const rowRefs = useRef<(HTMLAnchorElement | null)[]>([])

  const selected = workspaceSelectedWellId
    ? filtered.find((well) => well.id === workspaceSelectedWellId) ?? filtered[0]
    : filtered[0]

  const selectedIndex = selected ? filtered.findIndex((well) => well.id === selected.id) : -1

  const buildSearch = (overrides: {
    selectedWellId?: string
    workspaceFocus?: WellWorkspaceFocus
    filters?: typeof filters
  } = {}) => filtersToWellSearch(
    overrides.filters ?? filters,
    {
      selectedWellId: overrides.selectedWellId,
      workspaceVersion,
      workspaceScenario,
      workspaceFocus: overrides.workspaceFocus ?? workspaceFocus,
    },
  )

  const syncSelection = (selectedWellId: string, nextFocus: WellWorkspaceFocus = workspaceFocus) => {
    void navigate({ search: buildSearch({ selectedWellId, workspaceFocus: nextFocus }), replace: true })
  }

  const setSearch = (next: WellSearch) => void navigate({ search: next, replace: true })
  const updateFilters = (next: typeof filters) => setSearch(buildSearch({ selectedWellId: workspaceSelectedWellId, workspaceFocus, filters: next }))

  const onRowsKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (filtered.length === 0) {
      return
    }

    const hasUpDown = event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End'
    if (!hasUpDown) {
      return
    }

    event.preventDefault()

    const baseIndex = selectedIndex >= 0 ? selectedIndex : 0
    const lastIndex = filtered.length - 1
    const targetIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? lastIndex
          : event.key === 'ArrowUp'
            ? Math.max(0, baseIndex - 1)
            : Math.min(lastIndex, baseIndex + 1)

    const next = filtered[targetIndex]
    if (!next) {
      return
    }

    syncSelection(next.id, 'registry')
    rowRefs.current[targetIndex]?.focus()
  }

  useEffect(() => {
    const fallbackId = filtered[0]?.id
    if (isLoading) {
      return
    }

    if (!fallbackId) {
      if (workspaceSelectedWellId) {
        void navigate({ search: buildSearch({ selectedWellId: undefined, workspaceFocus }), replace: true })
      }
      return
    }

    if (!workspaceSelectedWellId || !filtered.some((well) => well.id === workspaceSelectedWellId)) {
      void navigate({
        search: buildSearch({
          selectedWellId: fallbackId,
          workspaceFocus: workspaceSelectedWellId ? workspaceFocus : 'registry',
        }),
        replace: true,
      })
    }
  }, [filtered, isLoading, workspaceSelectedWellId, workspaceFocus])

  useEffect(() => {
    if (selectedIndex >= 0) {
      rowRefs.current[selectedIndex]?.focus()
    }
  }, [selectedIndex])

  const currentFilters = JSON.stringify(filters)
  const savedViews = preferencesQuery.data?.savedViews ?? []
  const saveCurrentView = () => {
    const label = `Фильтр ${savedViews.length + 1}`
    savePreferences.mutate({ grouping, savedViews: [...savedViews, { id: `saved-${Date.now()}`, label, search: Object.fromEntries(Object.entries(filters).filter(([, value]) => value && value !== 'Все')) as Record<string, string> }] })
  }
  const changeGrouping = (next: 'site' | 'status') => savePreferences.mutate({ grouping: next, savedViews })

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Геология · GEO-04"
        title="Реестр скважин"
        description="Фильтруемая объектная выборка с shareable URL и переходом в единую карточку."
        meta={<Badge tone="info">{filtered.length} из {data.length}</Badge>}
        actions={<><Link to="/geology/map" search={buildSearch({ workspaceFocus: 'map' })} className="button button--secondary button--md"><MapIcon size={16} /> На карте</Link><Link to="/geology/wells/new" className="button button--primary button--md"><Plus size={17} /> Новая скважина</Link></>}
      />

      <div className="saved-views" aria-label="Сохранённые представления">
        <span>Представления:</span>
        {savedViews.map((view) => <button type="button" key={view.label} className={JSON.stringify(view.search) === currentFilters ? 'is-active' : ''} onClick={() => setSearch(buildSearch({ filters: { ...filters, ...view.search }, selectedWellId: workspaceSelectedWellId }))}>{view.label}</button>)}        <button type="button" onClick={saveCurrentView} disabled={savePreferences.isPending}>+ Сохранить фильтр</button>
        <label><span className="sr-only">Группировка</span><select value={grouping} onChange={(event) => changeGrouping(event.target.value as 'site' | 'status')}><option value="site">По участку</option><option value="status">По статусу</option></select></label>
      </div>

      <WellFilterBar filters={filters} sites={sites} onChange={updateFilters} onReset={() => updateFilters(defaultWellFilters)} />

      <Panel className="registry-panel" title="Результаты" description={isLoading ? 'Загрузка…' : `${filtered.length} объектов · обновлено 10.08.2026 10:15`} action={<button type="button" className="table-sort"><ArrowUpDown size={14} /> Код: по возрастанию</button>}>
        <div
          className="well-table well-table--registry"
          role="table"
          aria-label="Реестр скважин"
          onKeyDown={onRowsKeyDown}
        >
          <div className="well-table__head" role="row"><span>Скважина</span><span>Статус</span><span>Участок / профиль</span><span>Блок / ячейка</span><span>Качество</span><span>Полнота</span></div>
          {isLoading && <div className="skeleton skeleton--list" />}
          {groupedFiltered.map((well, index) => (
            <Link
              key={well.id}
              to="/objects/wells/$wellId"
              params={{ wellId: well.id }}
              search={buildSearch({ selectedWellId: well.id, workspaceFocus: 'registry' })}
              className="well-table__row"
              role="row"
              onFocus={() => syncSelection(well.id, 'registry')}
              aria-selected={selected?.id === well.id}
              tabIndex={selected?.id === well.id ? 0 : -1}
              ref={(element) => {
                rowRefs.current[index] = element
              }}
            >
              <span><strong>{well.code}</strong><small>{well.type} · {well.depth.toLocaleString('ru-RU')} м</small></span>
              <Badge tone={statusTone[well.status]} dot>{well.status}</Badge>
              <span>{well.site}<small>{well.profile}</small></span>
              <span>{well.block}<small>{well.cell}</small></span>
              <span><strong>{well.quality}</strong><small>{well.updatedAt}</small></span>
              <span className="completeness"><strong>{well.completeness}%</strong><i><b style={{ width: `${well.completeness}%` }} /></i></span>
            </Link>
          ))}
          {!isLoading && filtered.length === 0 && <div className="empty-result"><Search size={22} /><strong>Ничего не найдено</strong><span>Измените запрос или сбросьте фильтры.</span></div>}
        </div>
      </Panel>
    </div>
  )
}
