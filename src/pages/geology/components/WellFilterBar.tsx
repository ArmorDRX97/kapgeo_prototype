import { Filter, RotateCcw, Search, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { countActiveWellFilters } from '../../../entities/well/lib/filterWells'
import type { QualityState, WellFilters, WellStatus, WellType } from '../../../entities/well/model/types'
import { Badge } from '../../../shared/ui/Badge'
import { Button } from '../../../shared/ui/Button'

const statuses: Array<'Все' | WellStatus> = ['Все', 'Работает', 'На проверке', 'Отключена', 'Требует внимания']
const types: Array<'Все' | WellType> = ['Все', 'Откачная', 'Закачная', 'Наблюдательная', 'Разведочная']
const qualities: Array<'Все' | QualityState> = ['Все', 'Высокое', 'Среднее', 'Есть проблемы']

export function WellFilterBar({ filters, sites, onChange, onReset }: {
  filters: WellFilters
  sites: string[]
  onChange: (next: WellFilters) => void
  onReset: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const activeCount = countActiveWellFilters(filters)
  const set = <Key extends keyof WellFilters>(key: Key, value: WellFilters[Key]) => onChange({ ...filters, [key]: value })

  return (
    <div className={`well-filter-panel${expanded ? ' is-expanded' : ''}`}>
      <div className="filter-bar">
        <label className="search-field">
          <Search size={17} />
          <input value={filters.query} onChange={(event) => set('query', event.target.value)} placeholder="Код, блок, ячейка или профиль…" />
        </label>
        <label className="select-inline"><Filter size={16} /><span className="sr-only">Статус</span><select value={filters.status} onChange={(event) => set('status', event.target.value as WellFilters['status'])}>{statuses.map((value) => <option key={value}>{value}</option>)}</select></label>
        <Button variant="secondary" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}><SlidersHorizontal size={16} /> Фильтры {activeCount > 0 && <Badge tone="info">{activeCount}</Badge>}</Button>
        {activeCount > 0 && <Button variant="quiet" onClick={onReset}><RotateCcw size={16} /> Сбросить</Button>}
      </div>
      {expanded && (
        <div className="advanced-filters">
          <label><span>Тип скважины</span><select value={filters.type} onChange={(event) => set('type', event.target.value as WellFilters['type'])}>{types.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label><span>Качество данных</span><select value={filters.quality} onChange={(event) => set('quality', event.target.value as WellFilters['quality'])}>{qualities.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label><span>Участок</span><select value={filters.site} onChange={(event) => set('site', event.target.value)}><option>Все</option>{sites.map((value) => <option key={value}>{value}</option>)}</select></label>
          <div className="advanced-filters__summary"><strong>{activeCount || 'Нет'}</strong><span>активных условий</span></div>
        </div>
      )}
    </div>
  )
}
