import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router'
import { ArrowRight, Check, Layers3, List, MapPinned, Ruler, ScanSearch } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { defaultWellFilters, filterWells } from '../../entities/well/lib/filterWells'
import type { Well } from '../../entities/well/model/types'
import { fetchGeologyMapWorkspacePreferences, fetchWells, saveGeologyMapWorkspacePreferences } from '../../repository/api'
import { Badge } from '../../shared/ui/Badge'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'
import { WellFilterBar } from './components/WellFilterBar'
import { WellMap } from './components/WellMap'
import { filtersToWellSearch, searchToWellFilters, searchToWellWorkspace, type WellSearch, type WellWorkspaceFocus } from './wellSearch'

const mapRoute = getRouteApi('/geology/map')

export function GeologyMapPage() {
  const { data = [], isLoading } = useQuery({ queryKey: ['wells'], queryFn: fetchWells })
  const preferencesQuery = useQuery({ queryKey: ['workspace-preferences', 'geology-map'], queryFn: fetchGeologyMapWorkspacePreferences })
  const queryClient = useQueryClient()
  const search = mapRoute.useSearch()
  const navigate = useNavigate({ from: '/geology/map' })
  const filters = searchToWellFilters(search)
  const {
    selectedWellId: workspaceSelectedWellId,
    workspaceVersion,
    workspaceScenario,
    workspaceFocus: rawWorkspaceFocus,
  } = searchToWellWorkspace(search)
  const workspaceFocus = rawWorkspaceFocus ?? 'map'
  const filtered = useMemo(() => filterWells(data, filters), [data, filters])
  const sites = useMemo(() => [...new Set(data.map((well) => well.site))], [data])
  const resultListRefs = useRef<(HTMLButtonElement | null)[]>([])

  const selected = useMemo(() => {
    const selectedFromWorkspace = workspaceSelectedWellId
      ? filtered.find((well) => well.id === workspaceSelectedWellId)
      : undefined

    return selectedFromWorkspace ?? filtered[0]
  }, [filtered, workspaceSelectedWellId])

  const selectedIndex = selected ? filtered.findIndex((well) => well.id === selected.id) : -1
  const [layers, setLayers] = useState({ labels: true, contours: true, quality: false })
  const savePreferences = useMutation({
    mutationFn: saveGeologyMapWorkspacePreferences,
    onSuccess: (preferences) => queryClient.setQueryData(['workspace-preferences', 'geology-map'], preferences),
  })

  const activeLayers = preferencesQuery.data
    ? { labels: preferencesQuery.data.labels, contours: preferencesQuery.data.contours, quality: preferencesQuery.data.quality }
    : layers

  const toggleLayer = (layer: keyof typeof layers) => {
    const next = { ...activeLayers, [layer]: !activeLayers[layer] }
    setLayers(next)
    savePreferences.mutate(next)
  }

  const buildSearch = (overrides: { selectedWellId?: string; workspaceFocus?: WellWorkspaceFocus; filters?: typeof filters } = {}) => filtersToWellSearch(
    overrides.filters ?? filters,
    {
      selectedWellId: overrides.selectedWellId,
      workspaceVersion,
      workspaceScenario,
      workspaceFocus: overrides.workspaceFocus ?? workspaceFocus,
    },
  )

  const updateSelection = (selectedWellId: string, nextFocus: WellWorkspaceFocus) => {
    void navigate({ search: buildSearch({ selectedWellId, workspaceFocus: nextFocus }), replace: true })
  }

  const updateFilters = (next: typeof filters) => void navigate({
    search: buildSearch({ selectedWellId: workspaceSelectedWellId, workspaceFocus, filters: next }),
    replace: true,
  })

  const onResultListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
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

    updateSelection(next.id, 'registry')
    resultListRefs.current[targetIndex]?.focus()
  }

  useEffect(() => {
    const fallbackId = filtered[0]?.id
    const hasWorkspaceSelection = selected && workspaceSelectedWellId
    if (isLoading) {
      return
    }

    if (!fallbackId) {
      if (workspaceSelectedWellId) {
        void navigate({ search: buildSearch({ selectedWellId: undefined, workspaceFocus }), replace: true })
      }
      return
    }

    if (!hasWorkspaceSelection || !filtered.some((well) => well.id === workspaceSelectedWellId)) {
      void navigate({
        search: buildSearch({
          selectedWellId: fallbackId,
          workspaceFocus: hasWorkspaceSelection ? workspaceFocus : 'map',
        }),
        replace: true,
      })
    }
  }, [filtered, isLoading, navigate, workspaceSelectedWellId, workspaceFocus])

  useEffect(() => {
    if (selectedIndex >= 0) {
      resultListRefs.current[selectedIndex]?.focus()
    }
  }, [selectedIndex])

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Геология · GEO-03"
        title="Карта скважин и объектов"
        description="Карта, выборка и инспектор используют один фильтр и одно selection-состояние."
        meta={<Badge tone="success" dot>На 10 августа 2026</Badge>}
        actions={<Link to="/geology/wells" search={buildSearch({ workspaceFocus: 'registry' })} className="button button--secondary button--md"><List size={16} /> Открыть реестр</Link>}
      />

      <WellFilterBar filters={filters} sites={sites} onChange={updateFilters} onReset={() => updateFilters(defaultWellFilters)} />

      <div className="map-workbench">
        <Panel
          className="map-workbench__canvas"
          title="План участка Северный"
          description={isLoading ? 'Загрузка слоя…' : `${filtered.length} из ${data.length} объектов`}
          action={<span className="view-label"><MapPinned size={15} /> EPSG:32642</span>}
        >
          <div className="map-layer-toolbar" aria-label="Слои карты">
            <span><Layers3 size={16} /> Слои</span>
            <button type="button" className={activeLayers.contours ? 'is-active' : ''} onClick={() => toggleLayer('contours')}>{activeLayers.contours && <Check size={13} />} Контуры блоков</button>
            <button type="button" className={activeLayers.labels ? 'is-active' : ''} onClick={() => toggleLayer('labels')}>{activeLayers.labels && <Check size={13} />} Подписи</button>
            <button type="button" className={activeLayers.quality ? 'is-active' : ''} onClick={() => toggleLayer('quality')}>{activeLayers.quality && <Check size={13} />} Цвет по качеству</button>
          </div>
          <WellMap wells={filtered} selectedId={selected?.id} onSelect={(well) => updateSelection(well.id, 'map')} showLabels={activeLayers.labels} showContours={activeLayers.contours} colorBy={activeLayers.quality ? 'quality' : 'status'} />
        </Panel>

        <aside className="map-workbench__inspector">
          <Panel title="Инспектор объекта" description="Cross-selection карты и списка">
            {selected ? <WellInspector well={selected} search={buildSearch({ workspaceFocus: 'map', selectedWellId: selected.id })} /> : <div className="empty-result"><ScanSearch size={23} /><strong>Нет объектов</strong><span>Измените условия фильтра.</span></div>}
          </Panel>
          <Panel title="Объекты в выборке" description="Нажмите строку, чтобы подсветить маркер">
            <div
              className="map-result-list"
              tabIndex={0}
              role="listbox"
              onKeyDown={onResultListKeyDown}
              aria-label="Список скважин в текущей выборке"
              aria-activedescendant={selected?.id}
            >
              {filtered.slice(0, 8).map((well, index) => (
                <button
                  type="button"
                  key={well.id}
                  id={well.id}
                  className={selected?.id === well.id ? 'is-active' : ''}
                  onClick={() => updateSelection(well.id, 'registry')}
                  ref={(element) => {
                    resultListRefs.current[index] = element
                  }}
                  role="option"
                  aria-selected={selected?.id === well.id}
                >
                  <span className={`legend-dot legend-dot--${well.status === 'Работает' ? 'success' : well.status === 'На проверке' ? 'info' : 'warning'}`} />
                  <span><strong>{well.code}</strong><small>{well.type} · {well.block}</small></span>
                  <Badge tone={well.aiConflicts ? 'ai' : well.completeness < 80 ? 'warning' : 'neutral'}>{well.aiConflicts ? `${well.aiConflicts} AI` : `${well.completeness}%`}</Badge>
                </button>
              ))}
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  )
}

function WellInspector({ well, search }: { well: Well; search: WellSearch }) {
  return (
    <div className="well-inspector">
      <div className="well-inspector__title"><span className="well-inspector__icon"><MapPinned size={20} /></span><div><strong>{well.code}</strong><span>{well.type} · {well.status}</span></div></div>
      <dl>
        <div><dt>Участок / профиль</dt><dd>{well.site} · {well.profile}</dd></div>
        <div><dt>Блок / ячейка</dt><dd>{well.block} · {well.cell}</dd></div>
        <div><dt>Координаты</dt><dd>{well.coordinates.x.toLocaleString('ru-RU')} / {well.coordinates.y.toLocaleString('ru-RU')}</dd></div>
        <div><dt>Глубина</dt><dd>{well.depth.toLocaleString('ru-RU')} м</dd></div>
      </dl>
      <div className="well-inspector__quality"><div><span>Полнота</span><strong>{well.completeness}%</strong></div><i><b style={{ width: `${well.completeness}%` }} /></i><small>Качество: {well.quality}</small></div>
      {well.activeTask && <div className="well-inspector__task"><Ruler size={16} /><span><small>Требуется действие</small><strong>{well.activeTask}</strong></span></div>}
      <Link to="/objects/wells/$wellId" params={{ wellId: well.id }} search={search} className="button button--secondary button--md">
        Открыть карточку <ArrowRight size={16} />
      </Link>
    </div>
  )
}
