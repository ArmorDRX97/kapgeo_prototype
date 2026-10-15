import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ArrowUpLeft, Search as SearchIcon, X } from 'lucide-react'
import type { KnowledgeIndex } from '../../entities/knowledge/model'
import { searchNodes } from '../../entities/knowledge/graph'
import { nodeLabels } from '../../entities/knowledge/labels'

export function Search({ index, onOpen }: { index: KnowledgeIndex; onOpen: (id: string) => void }) {
  const [query, setQuery] = useState(''), [open, setOpen] = useState(false), [cursor, setCursor] = useState(0)
  const ref = useRef<HTMLInputElement>(null)
  const listId = useId()
  const results = useMemo(() => searchNodes(index, query), [index, query])
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); ref.current?.focus(); setOpen(true) }
    }
    document.addEventListener('keydown', keydown)
    return () => document.removeEventListener('keydown', keydown)
  }, [])
  const choose = (id: string) => { onOpen(id); setQuery(''); setOpen(false); ref.current?.blur() }
  return <div className="global-search" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}>
    <SearchIcon size={18} /><input ref={ref} role="combobox" aria-label="Поиск по карте знаний" placeholder="Термин, процесс или специалист…" value={query} aria-autocomplete="list" aria-expanded={open && !!query} aria-controls={listId} aria-activedescendant={open && results[cursor] ? `${listId}-${cursor}` : undefined} onFocus={() => setOpen(true)} onChange={event => { setQuery(event.target.value); setCursor(0); setOpen(true) }} onKeyDown={event => {
      if (event.key === 'ArrowDown') { event.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)); setOpen(true) }
      if (event.key === 'ArrowUp') { event.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
      if (event.key === 'Enter' && open && results[cursor]) { event.preventDefault(); choose(results[cursor].id) }
      if (event.key === 'Escape') { setOpen(false); ref.current?.blur() }
    }} />
    {query ? <button className="search-clear" aria-label="Очистить поиск" onClick={() => { setQuery(''); ref.current?.focus() }}><X size={14} /></button> : <kbd>⌘ K</kbd>}
    {open && query.trim() && <div className="search-results" id={listId} role="listbox" aria-label="Результаты поиска"><div className="search-heading">Найдено: {results.length}{results.length === 12 ? '+' : ''}</div>{results.length ? results.map((node, i) => <button key={node.id} id={`${listId}-${i}`} role="option" aria-selected={i === cursor} className={i === cursor ? 'active' : ''} onMouseDown={event => event.preventDefault()} onClick={() => choose(node.id)} onMouseEnter={() => setCursor(i)}><span className={`type-dot type-${node.type}`} /><span><strong>{node.title}</strong><small>{nodeLabels[node.type]} · {index.byCategory.get(node.categoryId)?.shortTitle}</small></span><ArrowUpLeft size={15} /></button>) : <p className="search-empty">Ничего не найдено. Попробуйте «керн», «скважина» или «геолог».</p>}</div>}
  </div>
}
