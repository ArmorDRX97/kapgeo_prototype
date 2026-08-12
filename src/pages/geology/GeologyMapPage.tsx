import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router'
import { ArrowRight, Check, Layers3, List, MapPinned, Ruler, ScanSearch } from 'lucide-react'
import { useMemo, useState } from 'react'
import { defaultWellFilters, filterWells } from '../../entities/well/lib/filterWells'
import type { Well } from '../../entities/well/model/types'
import { fetchWells } from '../../repository/api'
import { Badge } from '../../shared/ui/Badge'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'
import { WellFilterBar } from './components/WellFilterBar'
import { WellMap } from './components/WellMap'
import { filtersToWellSearch, searchToWellFilters } from './wellSearch'

const mapRoute = getRouteApi('/geology/map')

export function GeologyMapPage() {
  const { data = [], isLoading } = useQuery({ queryKey: ['wells'], queryFn: fetchWells })
  const search = mapRoute.useSearch()
  const navigate = useNavigate({ from: '/geology/map' })
  const filters = searchToWellFilters(search)
  const filtered = useMemo(() => filterWells(data, filters), [data, filters])
  const sites = useMemo(() => [...new Set(data.map((well) => well.site))], [data])
  const [selectedId, setSelectedId] = useState('WELL-1042')
  const [layers, setLayers] = useState({ labels: true, contours: true, quality: false })
  const selected = filtered.find((well) => well.id === selectedId) ?? filtered[0]

  const updateFilters = (next: typeof filters) => void navigate({ search: filtersToWellSearch(next), replace: true })

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Геология · GEO-03"
        title="Карта скважин и объектов"
        description="Карта, выборка и инспектор используют один фильтр и одну дату состояния."
        meta={<Badge tone="success" dot>На 10 августа 2026</Badge>}
        actions={<Link to="/geology/wells" search={filtersToWellSearch(filters)} className="button button--secondary button--md"><List size={16} /> Открыть реестр</Link>}
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
            <button type="button" className={layers.contours ? 'is-active' : ''} onClick={() => setLayers((value) => ({ ...value, contours: !value.contours }))}>{layers.contours && <Check size={13} />} Контуры блоков</button>
            <button type="button" className={layers.labels ? 'is-active' : ''} onClick={() => setLayers((value) => ({ ...value, labels: !value.labels }))}>{layers.labels && <Check size={13} />} Подписи</button>
            <button type="button" className={layers.quality ? 'is-active' : ''} onClick={() => setLayers((value) => ({ ...value, quality: !value.quality }))}>{layers.quality && <Check size={13} />} Цвет по качеству</button>
          </div>
          <WellMap wells={filtered} selectedId={selected?.id} onSelect={(well) => setSelectedId(well.id)} showLabels={layers.labels} showContours={layers.contours} colorBy={layers.quality ? 'quality' : 'status'} />
        </Panel>

        <aside className="map-workbench__inspector">
          <Panel title="Инспектор объекта" description="Cross-selection карты и списка">
            {selected ? <WellInspector well={selected} /> : <div className="empty-result"><ScanSearch size={23} /><strong>Нет объектов</strong><span>Измените условия фильтра.</span></div>}
          </Panel>
          <Panel title="Объекты в выборке" description="Нажмите строку, чтобы подсветить маркер">
            <div className="map-result-list">
              {filtered.slice(0, 8).map((well) => (
                <button type="button" key={well.id} className={selected?.id === well.id ? 'is-active' : ''} onClick={() => setSelectedId(well.id)}>
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

function WellInspector({ well }: { well: Well }) {
  return (
    <div className="well-inspector">
      <div className="well-inspector__title"><span className="well-inspector__icon"><MapPinned size={20} /></span><div><strong>{well.code}</strong><span>{well.type} · {well.status}</span></div></div>
      <dl>
        <div><dt>Участок / профиль</dt><dd>{well.site} · {well.profile}</dd></div>
        <div><dt>Блок / ячейка</dt><dd>{well.block} · {well.cell}</dd></div>
        <div><dt>Координаты</dt><dd>{well.coordinates.x.toLocaleString('ru-RU')} / {well.coordinates.y.toLocaleString('ru-RU')}</dd></div>
        <div><dt>Глубина</dt><dd>{well.depth.toLocaleString('ru-RU')} м</dd></div>
      </dl>
      <div className="well-inspector__quality"><div><span>Полнота данных</span><strong>{well.completeness}%</strong></div><i><b style={{ width: `${well.completeness}%` }} /></i><small>Качество: {well.quality}</small></div>
      {well.activeTask && <div className="well-inspector__task"><Ruler size={16} /><span><small>Требуется действие</small><strong>{well.activeTask}</strong></span></div>}
      <Link to="/objects/wells/$wellId" params={{ wellId: well.id }} className="button button--primary button--md">Открыть карточку <ArrowRight size={16} /></Link>
    </div>
  )
}
