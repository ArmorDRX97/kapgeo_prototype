import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from '@tanstack/react-router'
import { LockKeyhole, PanelLeftClose, PanelLeftOpen, Plus, Search, SlidersHorizontal, X } from 'lucide-react'
import type { SectionRegistryEntry } from '../model/registryEntries'
import type { SectionSearch } from '../model/search'
import { Button } from '../../../shared/ui/Button'

export function SectionRegistry({ sections, sectionId, search, onSearch, collapsed, onToggle, onCreate }: {
  sections: SectionRegistryEntry[]; sectionId?: string; search: SectionSearch
  onSearch: (patch: Partial<SectionSearch>, replace?: boolean) => void
  collapsed: boolean; onToggle: () => void; onCreate?: () => void
}) {
  const [open, setOpen] = useState(false), [position, setPosition] = useState({ left: 0, top: 0 })
  const trigger = useRef<HTMLButtonElement>(null), panel = useRef<HTMLDivElement>(null)
  const active = [search.kind, search.year, search.body].filter(Boolean).length
  useEffect(() => {
    if (!open) return
    panel.current?.querySelector<HTMLSelectElement>('select')?.focus()
    const outside = (event: PointerEvent | FocusEvent) => { if (!panel.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); setOpen(false); trigger.current?.focus() } }
    const resize = () => { setOpen(false); trigger.current?.focus() }
    document.addEventListener('pointerdown', outside); document.addEventListener('focusin', outside); document.addEventListener('keydown', escape); window.addEventListener('resize', resize)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('focusin', outside); document.removeEventListener('keydown', escape); window.removeEventListener('resize', resize) }
  }, [open])
  const filtered = sections.filter(s => `${s.title} ${s.id}`.toLocaleLowerCase('ru').includes((search.q ?? '').trim().toLocaleLowerCase('ru')) && (!search.kind || s.kind === search.kind) && (!search.year || s.year === search.year) && (!search.body || s.depositBody === search.body)).sort((a, b) => b.year - a.year || a.title.localeCompare(b.title, 'ru', { numeric: true }))
  const grouped = new Map<string, SectionRegistryEntry[]>()
  for (const section of filtered) { const key = search.groupBy === 'kind' ? section.kind === 'main' ? 'Основные' : 'Вспомогательные' : search.groupBy === 'body' ? section.depositBody : String(section.year); grouped.set(key, [...(grouped.get(key) ?? []), section]) }
  return <aside className="section-registry" aria-label="Реестр разрезов">
    <header><Button variant="quiet" size="sm" onClick={() => { setOpen(false); onToggle() }} aria-expanded={!collapsed} aria-label={collapsed ? 'Развернуть реестр разрезов' : 'Свернуть реестр разрезов'}>{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</Button>{!collapsed && <strong>Разрезы</strong>}</header>
    {!collapsed && <>
      <div className="section-registry__search-row"><label className="section-registry__search"><Search size={16} /><input aria-label="Поиск разреза" value={search.q ?? ''} maxLength={120} onChange={e => onSearch({ q: e.target.value || undefined }, true)} placeholder="Быстрый поиск" />{search.q && <button type="button" aria-label="Очистить поиск разрезов" onClick={() => onSearch({ q: undefined }, true)}><X size={14} /></button>}</label><button ref={trigger} className="section-registry__filter-button" type="button" title="Фильтры разрезов" aria-label={`Фильтры разрезов${active ? `: ${active}` : ''}`} aria-expanded={open} aria-haspopup="dialog" onClick={() => {
        const rect = trigger.current!.getBoundingClientRect(), width = Math.min(300, window.innerWidth - 24)
        setPosition({ left: Math.max(12, Math.min(rect.right + 8, window.innerWidth - width - 12)), top: Math.max(12, Math.min(rect.top, window.innerHeight - 390)) }); setOpen(!open)
      }}><SlidersHorizontal size={17} />{active > 0 && <span>{active}</span>}</button></div>
      <div className="section-registry__summary"><span>Найдено {filtered.length} из {sections.length}</span>{onCreate && <Button variant="quiet" size="sm" onClick={onCreate}><Plus size={15} />Создать</Button>}</div>
      <nav aria-label="Список разрезов">{[...grouped].map(([title, items]) => <div key={title} className="section-registry-group"><strong>{title} · {items.length}</strong>{items.map(s => <Link key={s.id} to="/geology/sections/$sectionId" params={{ sectionId: s.id }} search={search} aria-current={s.id === sectionId ? 'page' : undefined} title={s.title}><span>{s.title}</span><small>{s.wellCount} скв.</small>{s.status === 'locked' && <LockKeyhole size={13} aria-label="Зафиксирован" />}</Link>)}</div>)}{!filtered.length && <div className="section-registry__empty"><p>Разрезы не найдены</p><Button variant="quiet" size="sm" onClick={() => onSearch({ q: undefined, kind: undefined, year: undefined, body: undefined })}>Сбросить поиск и фильтры</Button></div>}</nav>
    </>}
    {open && createPortal(<div ref={panel} role="dialog" aria-label="Фильтры разрезов" className="section-registry-filters" style={position}><header><strong>Фильтры разрезов</strong><Button variant="quiet" size="sm" aria-label="Закрыть фильтры разрезов" onClick={() => { setOpen(false); trigger.current?.focus() }}><X size={16} /></Button></header>
      <label className="section-filter">Тип<select value={search.kind ?? 'all'} onChange={e => onSearch({ kind: e.target.value === 'all' ? undefined : e.target.value as 'main' | 'auxiliary' })}><option value="all">Все разрезы</option><option value="main">Основные</option><option value="auxiliary">Вспомогательные</option></select></label>
      <label className="section-filter">Год<select value={search.year ?? 'all'} onChange={e => onSearch({ year: e.target.value === 'all' ? undefined : Number(e.target.value) })}><option value="all">Все годы</option>{[...new Set(sections.map(s => s.year))].sort((a, b) => b - a).map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="section-filter">Залежь<select value={search.body ?? ''} onChange={e => onSearch({ body: e.target.value || undefined })}><option value="">Все залежи</option>{[...new Set(sections.map(s => s.depositBody))].sort().map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="section-filter">Группировать<select value={search.groupBy ?? 'year'} onChange={e => onSearch({ groupBy: e.target.value as SectionSearch['groupBy'] })}><option value="year">По году</option><option value="body">По залежи</option><option value="kind">По типу</option></select></label>
      <p className="section-muted">Найдено {filtered.length} из {sections.length}. Фильтры применяются сразу.</p><Button variant="secondary" onClick={() => onSearch({ kind: undefined, year: undefined, body: undefined, groupBy: undefined })}>Сбросить фильтры</Button>
    </div>, document.body)}
  </aside>
}
