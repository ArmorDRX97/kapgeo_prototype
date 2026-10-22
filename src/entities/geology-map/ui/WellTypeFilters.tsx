import { wellTypes } from '../wellSymbols'
import type { MapObject } from '../model'
import './well-type-filters.css'

export function WellTypeFilters({ objects, hidden, onChange, compact = false }: { objects: MapObject[]; hidden: string[]; onChange: (hidden: string[]) => void; compact?: boolean }) {
  const counts = new Map<string, number>()
  for (const o of objects) if (o.kind === 'well') counts.set(o.attributes.type, (counts.get(o.attributes.type) ?? 0) + 1)
  const total = [...counts.values()].reduce((a, b) => a + b, 0), shown = [...counts].reduce((sum, [type, count]) => sum + (hidden.includes(type) ? 0 : count), 0)
  return <div className={`well-type-filters${compact ? ' well-type-filters--compact' : ''}`} aria-label={`Фильтр скважин по типу: показано ${shown} из ${total}`}><div className="well-type-filters__summary">{!compact && <strong>{shown.toLocaleString('ru-RU')} <small>из {total.toLocaleString('ru-RU')} скважин</small></strong>}{hidden.length > 0 && <button type="button" onClick={() => onChange([])}>Показать все</button>}</div><div className="well-type-filters__chips" role="group" aria-label="Типы скважин">{wellTypes.map(t => <button key={t.name} type="button" aria-pressed={!hidden.includes(t.name)} onClick={e => onChange(e.altKey ? wellTypes.filter(v => v.name !== t.name).map(v => v.name) : hidden.includes(t.name) ? hidden.filter(v => v !== t.name) : [...hidden, t.name])} title={`${t.name}: показать / скрыть. Alt + нажатие — только этот тип.`}><i style={{ borderColor: t.color, color: t.color }}>+</i><span>{t.name}</span><small>{(counts.get(t.name) ?? 0).toLocaleString('ru-RU')}</small></button>)}</div>{shown === 0 && <p role="status">Все типы скрыты. Нажмите «Показать все», чтобы вернуть скважины.</p>}</div>
}
