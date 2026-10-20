import { useEffect, useId, useState } from 'react'
import { Search, X, EyeOff, ArrowUpRight } from 'lucide-react'
import { kindNames, layerVisible, type MapObject, type MapProject } from '../../entities/geology-map/model'

export function PlanObjectSearch({ project, onSelect }: { project: MapProject; onSelect: (object: MapObject) => void }) {
  const id = useId()
  const [query, setQuery] = useState(''), [kind, setKind] = useState('all'), [open, setOpen] = useState(false), [active, setActive] = useState(-1)
  const normalized = query.trim().toLocaleLowerCase('ru')
  const matches = project.objects.filter(object => (kind === 'all' || object.kind === kind) && `${object.name} ${object.id}`.toLocaleLowerCase('ru').includes(normalized))
  const results = matches.slice(0, 20), expanded = open && (normalized.length > 0 || kind !== 'all')
  useEffect(() => { if (expanded && active >= 0) document.getElementById(`${id}-${active}`)?.scrollIntoView?.({ block: 'nearest' }) }, [active, expanded, id])
  const choose = (object: MapObject) => { setOpen(false); setQuery(''); setActive(-1); onSelect(object) }
  return <div className="map-find" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false) }}>
    <select aria-label="Тип искомого объекта" value={kind} onChange={event => { setKind(event.target.value); setActive(-1); setOpen(true) }}><option value="all">Все объекты</option>{Object.entries(kindNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
    <div className="map-find-input"><Search size={16} aria-hidden="true" /><input role="combobox" aria-label="Найти объект плана" aria-autocomplete="list" aria-expanded={expanded} aria-controls={expanded ? id : undefined} aria-activedescendant={expanded && active >= 0 ? `${id}-${active}` : undefined}
      placeholder="Скважина, профиль, блок или ID…" value={query} onClick={() => setOpen(true)} onFocus={() => setOpen(true)} onChange={event => { setQuery(event.target.value); setOpen(true); setActive(-1) }}
      onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); setActive(-1) }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); setActive(index => !results.length ? -1 : index < 0 ? event.key === 'ArrowDown' ? 0 : results.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length) }
        if (event.key === 'Enter' && expanded && results[active >= 0 ? active : 0]) { event.preventDefault(); choose(results[active >= 0 ? active : 0]!) }
      }} />
      {query && <button type="button" aria-label="Очистить поиск объектов" onClick={event => { setQuery(''); setActive(-1); event.currentTarget.parentElement?.querySelector('input')?.focus() }}><X size={15} /></button>}
    </div>
    {expanded && <div className="map-find-results"><header><span>{matches.length ? `Найдено: ${matches.length}` : 'Ничего не найдено'}</span><small>↑↓ выбор · Enter открыть · Esc закрыть</small></header>
      <div id={id} role="listbox" aria-label="Результаты поиска объектов">{results.map((object, index) => <button id={`${id}-${index}`} key={object.id} type="button" role="option" aria-selected={index === active} onPointerEnter={() => setActive(index)} onClick={() => choose(object)}><span><strong>{object.name}</strong><small>{kindNames[object.kind]} · {project.layers.find(layer => layer.id === object.layerId)?.name}{!layerVisible(project, object.layerId) && ' · слой скрыт'}</small></span>{layerVisible(project, object.layerId) ? <ArrowUpRight size={15} /> : <EyeOff size={15} />}</button>)}</div>
      {!results.length && <p className="map-find-empty">Попробуйте другое название или выберите «Все объекты».</p>}{matches.length > results.length && <footer>Показаны первые {results.length}. Уточните название объекта.</footer>}
    </div>}
  </div>
}
