import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronRight, LockKeyhole, PanelLeftClose, PanelLeftOpen, Plus, Search, SlidersHorizontal, X } from 'lucide-react'
import type { SectionRegistryEntry } from '../model/registryEntries'
import type { SectionSearch } from '../model/search'
import { sectionStageValues, stageNames } from '../../../entities/geology-section/model/stages'
import { Button } from '../../../shared/ui/Button'
import { FilterPopover } from '../../../shared/ui/FilterPopover'

export function SectionRegistry({ sections, sectionId, search, onSearch, collapsed, onToggle, onCreate }: {
  sections: SectionRegistryEntry[]; sectionId?: string; search: SectionSearch
  onSearch: (patch: Partial<SectionSearch>, replace?: boolean) => void
  collapsed: boolean; onToggle: () => void; onCreate?: () => void
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
  return <aside className="section-registry" aria-label="Реестр разрезов">
    <header><Button variant="quiet" size="sm" onClick={() => { setOpen(false); onToggle() }} aria-expanded={!collapsed} aria-label={collapsed ? 'Развернуть реестр разрезов' : 'Свернуть реестр разрезов'}>{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</Button>{!collapsed && <strong>Разрезы</strong>}</header>
    {!collapsed && <>
      <div className="section-registry__commands">{onCreate && <Button size="sm" onClick={onCreate}><Plus size={15} />Создать разрез</Button>}<button ref={trigger} className="section-registry__filter-button" type="button" title="Фильтры разрезов" aria-label={`Фильтры разрезов${active ? `: ${active}` : ''}`} aria-expanded={open} aria-haspopup="dialog" onClick={() => {
        setOpen(!open)
      }}><SlidersHorizontal size={17} />{active > 0 && <span>{active}</span>}</button></div>
      <div className="section-registry__search-row"><label className="section-registry__search"><Search size={16} /><input aria-label="Поиск разреза" value={search.q ?? ''} maxLength={120} onChange={e => onSearch({ q: e.target.value || undefined }, true)} placeholder="Быстрый поиск" />{search.q && <button type="button" aria-label="Очистить поиск разрезов" onClick={() => onSearch({ q: undefined }, true)}><X size={14} /></button>}</label></div>
      <div className="section-registry__summary"><span>Найдено {filtered.length} из {sections.length}</span>{(active > 0 || search.q) && <Button variant="quiet" size="sm" onClick={resetFilters}>Сбросить</Button>}</div>
      <nav aria-label="Список разрезов">
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
            {items.map(s => <Link key={s.id} ref={s.id === sectionId ? selectedLink : undefined} to="/geology/sections/$sectionId" params={{ sectionId: s.id }} search={search}
              aria-current={s.id === sectionId ? 'page' : undefined} title={s.title}>
              <span><strong>{s.title}</strong><small>{s.id} · {s.wellCount} скв.</small></span>{s.id === sectionId && <i className="section-registry__selected" aria-hidden="true" />}
              {s.status === 'locked' && <LockKeyhole size={13} aria-label="Зафиксирован" />}
            </Link>)}
          </div>
        </details>)}
        {!filtered.length && <div className="section-registry__empty"><p>Разрезы не найдены</p><Button variant="quiet" size="sm" onClick={resetFilters}>Сбросить поиск и фильтры</Button></div>}
      </nav>
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
  </aside>
}
