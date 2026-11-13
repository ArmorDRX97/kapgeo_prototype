import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, ChevronRight, List, LockKeyhole, PanelLeftClose, PanelLeftOpen, Plus, Search, SlidersHorizontal, X } from 'lucide-react'
import type { SectionRegistryEntry } from '../model/registryEntries'
import { sectionRegistrySearch, type SectionSearch } from '../model/search'
import { sectionStageValues, stageNames } from '../../../entities/geology-section/model/stages'
import { Button } from '../../../shared/ui/Button'
import { FilterPopover } from '../../../shared/ui/FilterPopover'

export function SectionRegistry({ sections, sectionId, search, onSearch, catalog = false, missingDocument = false, collapsed = false, onToggle, onCreate }: {
  sections: SectionRegistryEntry[]; sectionId?: string; search: SectionSearch
  onSearch: (patch: Partial<SectionSearch>, replace?: boolean) => void
  catalog?: boolean; missingDocument?: boolean; collapsed?: boolean; onToggle?: () => void; onCreate?: () => void
}) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [open, setOpen] = useState(false)
  const closeFilters = useCallback(() => setOpen(false), [])
  const resetFilters = () => onSearch({ q: undefined, kind: undefined, stage: undefined, year: undefined, body: undefined, geoBlock: undefined, techBlock: undefined, sortBy: undefined, sortDirection: undefined, groupBy: undefined })
  const selectedLink = useRef<HTMLAnchorElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  useEffect(() => { selectedLink.current?.scrollIntoView?.({ block: 'nearest' }) }, [sectionId, collapsed])
  const active = [search.kind, search.stage, search.year, search.body, search.geoBlock, search.techBlock].filter(Boolean).length
  const filtered = sections.filter(s => `${s.title} ${s.id}`.toLocaleLowerCase('ru').includes((search.q ?? '').trim().toLocaleLowerCase('ru')) && (!search.kind || s.kind === search.kind) && (!search.stage || (s.stage ?? 'exploration') === search.stage) && (!search.year || s.year === search.year) && (!search.body || s.depositBody === search.body) && (!search.geoBlock || s.geoBlock === search.geoBlock) && (!search.techBlock || s.techBlock === search.techBlock)).sort((a, b) => {
    const direction = search.sortDirection === 'asc' ? 1 : -1
    return search.sortBy === 'title' ? direction * a.title.localeCompare(b.title, 'ru', { numeric: true }) : direction * a.createdOn.localeCompare(b.createdOn) || a.title.localeCompare(b.title, 'ru', { numeric: true })
  })
  const grouped = new Map<string, SectionRegistryEntry[]>()
  for (const section of filtered) { const key = search.groupBy === 'kind' ? section.kind === 'main' ? 'Основные' : 'Вспомогательные' : search.groupBy === 'body' ? section.depositBody : search.groupBy === 'stage' || !search.groupBy ? stageNames[section.stage ?? 'exploration'] : search.groupBy === 'geoBlock' ? section.geoBlock : search.groupBy === 'techBlock' ? section.techBlock : search.groupBy === 'date' ? section.createdOn : String(section.year); grouped.set(key, [...(grouped.get(key) ?? []), section]) }
  const catalogSearch = sectionRegistrySearch(search)
  const empty = <div className="section-registry__empty"><p>{sections.length ? 'Разрезы не найдены' : 'В каталоге пока нет разрезов'}</p>{sections.length > 0 && <Button variant="quiet" size="sm" onClick={resetFilters}>Сбросить поиск и фильтры</Button>}</div>
  const Container = catalog ? 'section' : 'aside'
  return <Container className={`section-registry${catalog ? ' section-registry--catalog' : ''}`} aria-label="Каталог разрезов">
    <header>{catalog ? <><h1>Каталог разрезов</h1>{onCreate && <Button onClick={onCreate}><Plus size={16} />Добавить разрез</Button>}</> : <>
      {!collapsed && <Link className="section-registry__catalog-link" to="/geology/sections" search={catalogSearch}><List size={16} aria-hidden="true" />Каталог разрезов</Link>}
      <Button variant="quiet" size="sm" onClick={() => { setOpen(false); onToggle?.() }} aria-expanded={!collapsed} aria-label={collapsed ? 'Развернуть реестр разрезов' : 'Свернуть реестр разрезов'} title={collapsed ? 'Развернуть реестр разрезов' : 'Свернуть реестр разрезов'}>{collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}</Button>
    </>}</header>
    {missingDocument && <p className="section-registry__missing" role="status">Разрез не найден. Выберите документ в каталоге.</p>}
    {!collapsed && <>
      <div className="section-registry__search-row">
        <label className="section-registry__search"><Search size={14} /><input aria-label="Поиск разреза" value={search.q ?? ''} maxLength={120} onChange={e => onSearch({ q: e.target.value || undefined }, true)} placeholder={catalog ? 'Название или номер разреза' : 'Поиск'} />{search.q && <button type="button" aria-label="Очистить поиск разрезов" onClick={() => onSearch({ q: undefined }, true)}><X size={14} /></button>}</label>
        <button ref={trigger} className="section-registry__filter-button" type="button" title="Фильтры разрезов" aria-label={`Фильтры разрезов${active ? `: ${active}` : ''}`} aria-expanded={open} aria-haspopup="dialog" data-active={active > 0} onClick={() => setOpen(!open)}><SlidersHorizontal size={16} />{catalog && <span>Фильтры{active > 0 ? ` · ${active}` : ''}</span>}</button>
      </div>
      {(active > 0 || search.q) && <div className="section-registry__summary"><span>Найдено {filtered.length} из {sections.length}</span><Button variant="quiet" size="sm" onClick={resetFilters}>Сбросить</Button></div>}
      {catalog ? <div className="section-registry__table-wrap">{filtered.length > 0 ? <table className="section-registry__table" aria-label="Список разрезов">
        <thead><tr><th scope="col">Разрез</th><th scope="col">Месторождение</th><th scope="col">Тип</th><th scope="col">Скважины</th><th scope="col">Статус</th><th scope="col">Год</th></tr></thead>
        {[...grouped].map(([title, items]) => <tbody key={title}>
          <tr className="section-registry__table-group"><th scope="rowgroup" colSpan={6}>{title} <span>{items.length}</span></th></tr>
          {items.map(s => <tr key={s.id}>
            <th scope="row"><Link to="/geology/sections/$sectionId" params={{ sectionId: s.id }} search={catalogSearch}><span>{s.title}<small>{s.id}</small></span><ArrowRight size={15} aria-hidden="true" /></Link></th>
            <td>{s.depositName}</td><td>{s.kind === 'main' ? 'Основной' : 'Вспомогательный'}</td><td>{s.wellCount}</td>
            <td><span className="section-registry__status">{s.status === 'locked' ? <><LockKeyhole size={13} />Зафиксирован</> : 'Черновик'}</span></td><td>{s.year}</td>
          </tr>)}
        </tbody>)}
      </table> : empty}</div> : <nav aria-label="Список разрезов">
        {[...grouped].map(([title, items]) => <details key={title}
          className={`section-registry-group${items.some(s => s.id === sectionId) ? ' has-selection' : ''}`}
          open={search.q ? true : expandedGroups[title] ?? items.some(s => s.id === sectionId)}>
          <summary aria-label={`${title}: ${items.length} разрезов`} onClick={e => {
            e.preventDefault()
            setExpandedGroups({ ...expandedGroups, [title]: !(expandedGroups[title] ?? items.some(s => s.id === sectionId)) })
          }}>
            <ChevronRight size={14} aria-hidden="true" /><span>{title}</span><small>{items.length}</small>
          </summary>
          <div className="section-registry-group__items" hidden={!(search.q || (expandedGroups[title] ?? items.some(s => s.id === sectionId)))}>
            {items.map(s => <Link key={s.id} ref={s.id === sectionId ? selectedLink : undefined} to="/geology/sections/$sectionId" params={{ sectionId: s.id }} search={{ ...catalogSearch, view: search.view, mode: search.mode }}
              aria-current={s.id === sectionId ? 'page' : undefined} title={s.title}>
              <span><strong>{s.title}</strong><small>{s.id} · {s.wellCount} скв.</small></span>{s.id === sectionId && <i className="section-registry__selected" aria-hidden="true" />}
              {s.status === 'locked' && <LockKeyhole size={13} aria-label="Зафиксирован" />}
            </Link>)}
          </div>
        </details>)}
        {!filtered.length && empty}
      </nav>}
      {!catalog && onCreate && <Button size="sm" variant="secondary" className="section-registry__add" onClick={onCreate}><Plus size={15} />Добавить разрез</Button>}
    </>}
    {open && <FilterPopover id="section-registry-filters" title="Фильтры разрезов" anchor={trigger} onClose={closeFilters} wide footer={<><p>Найдено {filtered.length} из {sections.length}. Фильтры применяются сразу.</p><Button variant="secondary" onClick={resetFilters}>Сбросить фильтры</Button></>}>
      <label className="section-filter">Тип<select value={search.kind ?? 'all'} onChange={e => onSearch({ kind: e.target.value === 'all' ? undefined : e.target.value as 'main' | 'auxiliary' })}><option value="all">Все разрезы</option><option value="main">Основные</option><option value="auxiliary">Вспомогательные</option></select></label>
      <label className="section-filter">Этап изучения<select value={search.stage ?? 'all'} onChange={e => onSearch({ stage: e.target.value === 'all' ? undefined : e.target.value as SectionSearch['stage'] })}><option value="all">Все этапы</option>{sectionStageValues.map(stage => <option key={stage} value={stage}>{stageNames[stage]}</option>)}</select></label>
      <label className="section-filter">Год<select value={search.year ?? 'all'} onChange={e => onSearch({ year: e.target.value === 'all' ? undefined : Number(e.target.value) })}><option value="all">Все годы</option>{[...new Set(sections.map(s => s.year))].sort((a, b) => b - a).map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="section-filter">Залежь<select value={search.body ?? ''} onChange={e => onSearch({ body: e.target.value || undefined })}><option value="">Все залежи</option>{[...new Set(sections.map(s => s.depositBody))].sort().map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="section-filter">Геологический блок<select value={search.geoBlock ?? ''} onChange={e => onSearch({ geoBlock: e.target.value || undefined })}><option value="">Все блоки</option>{[...new Set(sections.map(s => s.geoBlock))].sort((a, b) => a.localeCompare(b, 'ru')).map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="section-filter">Технологический блок<select value={search.techBlock ?? ''} onChange={e => onSearch({ techBlock: e.target.value || undefined })}><option value="">Все блоки</option>{[...new Set(sections.map(s => s.techBlock))].sort((a, b) => a.localeCompare(b, 'ru')).map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="section-filter">Сортировать по<select value={search.sortBy ?? 'date'} onChange={e => onSearch({ sortBy: e.target.value as SectionSearch['sortBy'] })}><option value="date">Дате создания</option><option value="title">Названию</option></select></label>
      <label className="section-filter">Направление сортировки<select value={search.sortDirection ?? 'desc'} onChange={e => onSearch({ sortDirection: e.target.value as SectionSearch['sortDirection'] })}><option value="desc">По убыванию</option><option value="asc">По возрастанию</option></select></label>
      <label className="section-filter">Группировать<select value={search.groupBy ?? 'stage'} onChange={e => onSearch({ groupBy: e.target.value as SectionSearch['groupBy'] })}><option value="stage">По этапу изучения</option><option value="year">По году</option><option value="date">По дате</option><option value="body">По залежи</option><option value="kind">По типу</option><option value="geoBlock">По геологическому блоку</option><option value="techBlock">По технологическому блоку</option></select></label>
    </FilterPopover>}
  </Container>
}
