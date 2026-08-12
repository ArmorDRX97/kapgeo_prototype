import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router'
import { ArrowUpDown, Map as MapIcon, Plus, Search } from 'lucide-react'
import { useMemo } from 'react'
import { defaultWellFilters, filterWells } from '../../entities/well/lib/filterWells'
import type { WellStatus } from '../../entities/well/model/types'
import { fetchWells } from '../../repository/api'
import { Badge } from '../../shared/ui/Badge'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'
import { WellFilterBar } from './components/WellFilterBar'
import { filtersToWellSearch, searchToWellFilters, type WellSearch } from './wellSearch'

const wellsRoute = getRouteApi('/geology/wells')

const statusTone: Record<WellStatus, 'success' | 'info' | 'neutral' | 'warning'> = {
  'Работает': 'success',
  'На проверке': 'info',
  'Отключена': 'neutral',
  'Требует внимания': 'warning',
}

const savedViews: Array<{ label: string; search: WellSearch }> = [
  { label: 'Все скважины', search: {} },
  { label: 'Требуют внимания', search: { status: 'Требует внимания' } },
  { label: 'Ожидают QC', search: { status: 'На проверке' } },
  { label: 'Проблемы качества', search: { quality: 'Есть проблемы' } },
]

export function WellsPage() {
  const { data = [], isLoading } = useQuery({ queryKey: ['wells'], queryFn: fetchWells })
  const search = wellsRoute.useSearch()
  const navigate = useNavigate({ from: '/geology/wells' })
  const filters = searchToWellFilters(search)
  const filtered = useMemo(() => filterWells(data, filters), [data, filters])
  const sites = useMemo(() => [...new Set(data.map((well) => well.site))], [data])

  const setSearch = (next: WellSearch) => void navigate({ search: next, replace: true })
  const updateFilters = (next: typeof filters) => setSearch(filtersToWellSearch(next))
  const currentSearch = JSON.stringify(filtersToWellSearch(filters))

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Геология · GEO-04"
        title="Реестр скважин"
        description="Фильтруемая объектная выборка с shareable URL и переходом в единую карточку."
        meta={<Badge tone="info">{filtered.length} из {data.length}</Badge>}
        actions={<><Link to="/geology/map" search={filtersToWellSearch(filters)} className="button button--secondary button--md"><MapIcon size={16} /> На карте</Link><Link to="/geology/wells/new" className="button button--primary button--md"><Plus size={17} /> Новая скважина</Link></>}
      />

      <div className="saved-views" aria-label="Сохранённые представления">
        <span>Представления:</span>
        {savedViews.map((view) => <button type="button" key={view.label} className={currentSearch === JSON.stringify(view.search) ? 'is-active' : ''} onClick={() => setSearch(view.search)}>{view.label}</button>)}
      </div>

      <WellFilterBar filters={filters} sites={sites} onChange={updateFilters} onReset={() => updateFilters(defaultWellFilters)} />

      <Panel className="registry-panel" title="Результаты" description={isLoading ? 'Загрузка…' : `${filtered.length} объектов · обновлено 10.08.2026 10:15`} action={<button type="button" className="table-sort"><ArrowUpDown size={14} /> Код: по возрастанию</button>}>
        <div className="well-table well-table--registry" role="table" aria-label="Реестр скважин">
          <div className="well-table__head" role="row"><span>Скважина</span><span>Статус</span><span>Участок / профиль</span><span>Блок / ячейка</span><span>Качество</span><span>Полнота</span></div>
          {isLoading && <div className="skeleton skeleton--list" />}
          {filtered.map((well) => (
            <Link key={well.id} to="/objects/wells/$wellId" params={{ wellId: well.id }} className="well-table__row" role="row">
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
