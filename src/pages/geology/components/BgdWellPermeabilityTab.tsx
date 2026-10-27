import { useState } from 'react'
import { Button } from '../../../shared/ui/Button'
import { Panel } from '../../../shared/ui/Panel'
import { useReportUnsavedChanges } from '../../../shared/lib/useReportUnsavedChanges'
import { createPermeabilityExample, firstPermeabilityGap, loadPermeabilityIntervals, permeabilityClasses, permeabilityCsv, permeabilityLabels, permeabilityRocks, permeabilitySources, permeabilityStorageKey, permeabilityTotals, validatePermeabilityIntervals, type PermeabilityInterval } from '../../../features/geobase/model/bgdWellPermeability'
import './bgd-permeability.css'

type Filter = 'all' | PermeabilityInterval['kind']
const number = (n: number) => n.toLocaleString('ru-RU', { maximumFractionDigits: 3 })

export function BgdWellPermeabilityTab({ wellId, wellCode, depth, canEdit, onDirtyChange }: { wellId: string; wellCode: string; depth: number; canEdit: boolean; onDirtyChange?: (dirty: boolean) => void }) {
  const [rows, setRows] = useState(() => loadPermeabilityIntervals(wellId, depth))
  const [baseline, setBaseline] = useState(rows), [selectedId, setSelectedId] = useState(rows[0]?.id ?? '')
  const [filter, setFilter] = useState<Filter>('all'), [source, setSource] = useState('all'), [notice, setNotice] = useState('')
  const selected = rows.find(r => r.id === selectedId), error = validatePermeabilityIntervals(rows, depth)
  const dirty = JSON.stringify(rows) !== JSON.stringify(baseline)
  const visible = rows.filter(r => (filter === 'all' || r.kind === filter) && (source === 'all' || r.source === source)).sort((a, b) => a.from - b.from)
  const { groups, undescribed } = permeabilityTotals(rows, depth), gap = firstPermeabilityGap(rows, depth)

  const save = () => {
    if (!canEdit || error) return false
    try { localStorage.setItem(permeabilityStorageKey(wellId), JSON.stringify(rows)); setBaseline(rows); setNotice('Интервалы проницаемости сохранены в этом браузере.'); return true }
    catch { setNotice('Не удалось сохранить интервалы: хранилище браузера недоступно.'); return false }
  }
  const discard = () => { setRows(baseline); setSelectedId(baseline[0]?.id ?? ''); setNotice('Изменения интервалов отменены.') }
  useReportUnsavedChanges(dirty, onDirtyChange, { save: async () => save(), discard })
  const patch = (values: Partial<PermeabilityInterval>) => { setRows(rows.map(r => r.id === selectedId ? { ...r, ...values } : r)); setNotice('') }
  const select = (id: string) => { setSelectedId(id); setNotice('') }
  const download = () => {
    const url = URL.createObjectURL(new Blob([permeabilityCsv(visible)], { type: 'text/csv;charset=utf-8' })), a = document.createElement('a')
    a.href = url; a.download = `${wellCode}-permeability.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const changeFilter = (next: Filter, nextSource = source) => {
    setFilter(next); setSource(nextSource)
    if (!rows.some(r => r.id === selectedId && (next === 'all' || r.kind === next) && (nextSource === 'all' || r.source === nextSource))) setSelectedId('')
  }

  return <div className="bgd-permeability">
    <Panel title="Проницаемые и непроницаемые породы" description={`${wellCode} · цифровые интервалы по глубине скважины. Классификация задаётся явно; отсутствие измерений не означает непроницаемость.`}>
      <div className="permeability-summary" aria-label="Сводка проницаемости по скважине">{permeabilityClasses.map(kind => <article key={kind} data-kind={kind}><span>{permeabilityLabels[kind]}</span><strong>{number(groups[kind].thickness)} <small>м</small></strong><small>Интервалов: {groups[kind].count}</small></article>)}</div>
      <div className="permeability-toolbar">
        <div className="permeability-filters" role="group" aria-label="Фильтр по проницаемости">{(['all', ...permeabilityClasses] as const).map(kind => <Button key={kind} size="sm" variant={filter === kind ? 'primary' : 'secondary'} aria-pressed={filter === kind} onClick={() => changeFilter(kind)}>{kind === 'all' ? 'Все интервалы' : permeabilityLabels[kind]}</Button>)}</div>
        <label>Источник<select aria-label="Источник интервалов проницаемости" value={source} onChange={e => changeFilter(filter, e.target.value)}><option value="all">Все источники</option>{permeabilitySources.map(s => <option key={s}>{s}</option>)}</select></label>
      </div>
      <div className="permeability-actions"><span role="status">Показано {visible.length} из {rows.length} · не описано {number(undescribed)} м</span><Button size="sm" variant="secondary" disabled={!visible.length || !!error} onClick={download}>Скачать таблицу CSV</Button>{canEdit && <Button size="sm" disabled={!gap || !!error} title={gap ? 'Заполнить свободный интервал' : 'Весь ствол описан. Чтобы уточнить породы, разделите выбранный интервал.'} onClick={() => { if (!gap) return; const r: PermeabilityInterval = { ...createPermeabilityExample(depth).at(-1)!, id: `PERM-${crypto.randomUUID()}`, ...gap, source: 'Ручное описание', note: '' }; setRows([...rows, r]); setSelectedId(r.id); setFilter('all'); setSource('all'); setNotice('') }}>Добавить интервал</Button>}</div>
      <div className="permeability-table-scroll" role="region" aria-label="Цифровая таблица проницаемости" tabIndex={0}><table>
        <caption>Интервалы пород · нажмите строку для редактирования</caption>
        <thead><tr>{['От, м', 'До, м', 'Мощность, м', 'Проницаемость', 'Порода', 'Кф, м/сут', 'ЛФТ', 'Источник'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
        <tbody>{visible.map(r => <tr key={r.id} className={selectedId === r.id ? 'is-selected' : ''} tabIndex={0} aria-current={selectedId === r.id ? 'true' : undefined} onClick={() => select(r.id)} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); select(r.id) } }}><td>{number(r.from)}</td><td>{number(r.to)}</td><td>{number(r.to - r.from)}</td><td><span className="permeability-kind" data-kind={r.kind}>{permeabilityLabels[r.kind]}</span></td><td>{r.rock}</td><td>{r.kf === null ? '—' : number(r.kf)}</td><td>{r.lft ?? '—'}</td><td>{r.source}</td></tr>)}</tbody>
      </table>{!visible.length && <div className="permeability-empty"><strong>Нет интервалов по выбранным условиям</strong><Button variant="secondary" size="sm" onClick={() => changeFilter('all', 'all')}>Сбросить фильтры</Button></div>}</div>
      <p className="permeability-note">Кф и ЛФТ можно оставить незаполненными. «Нет данных» — отдельное состояние; «не описано» обозначает глубины вне списка интервалов. Значения примера демонстрационные.</p>
    </Panel>

    {selected && <Panel title="Характеристики интервала проницаемости" description={`${number(selected.from)}–${number(selected.to)} м · мощность ${number(selected.to - selected.from)} м`}>
      <fieldset disabled={!canEdit} className="permeability-fields">
        {(['from', 'to', 'kf', 'lft'] as const).map((field, i) => <label key={field}>{['От, м', 'До, м', 'Кф, м/сут', 'ЛФТ'][i]}<input type="number" step={field === 'lft' ? 1 : 'any'} placeholder={i > 1 ? 'Нет измерений' : undefined} value={selected[field] !== null && Number.isFinite(selected[field]) ? selected[field] : ''} onChange={e => patch({ [field]: e.target.value === '' && i > 1 ? null : e.target.valueAsNumber })} /></label>)}
        <label>Проницаемость<select value={selected.kind} onChange={e => patch({ kind: e.target.value as PermeabilityInterval['kind'] })}>{permeabilityClasses.map(k => <option key={k} value={k}>{permeabilityLabels[k]}</option>)}</select></label>
        <label>Порода<select value={selected.rock} onChange={e => patch({ rock: e.target.value as PermeabilityInterval['rock'] })}>{permeabilityRocks.map(r => <option key={r}>{r}</option>)}</select></label>
        <label>Источник интервала<select value={selected.source} onChange={e => patch({ source: e.target.value as PermeabilityInterval['source'] })}>{permeabilitySources.map(s => <option key={s}>{s}</option>)}</select></label>
        <label className="permeability-note-field">Примечание<textarea aria-label="Примечание к интервалу проницаемости" rows={2} maxLength={500} value={selected.note} onChange={e => patch({ note: e.target.value })} /></label>
      </fieldset>
      {canEdit && <div className="permeability-actions"><Button variant="secondary" size="sm" disabled={!!error} onClick={() => { const middle = (selected.from + selected.to) / 2, next = { ...selected, id: `PERM-${crypto.randomUUID()}`, from: middle }; setRows(rows.flatMap(r => r.id === selectedId ? [{ ...r, to: middle }, next] : [r])); setSelectedId(next.id); setNotice('Интервал разделён пополам. Уточните породу и проницаемость каждой части, затем сохраните.'); }}>Разделить интервал</Button><Button variant="quiet" size="sm" onClick={() => { setRows(rows.filter(r => r.id !== selectedId)); setSelectedId(''); setNotice('Интервал удалён из списка. Сохраните изменения или отмените их.') }}>Удалить интервал</Button></div>}
    </Panel>}
    {error && <p role="alert" className="permeability-error">{error}</p>}
    {notice && <p role="status" className="permeability-note">{notice}</p>}
    <div className="permeability-save"><span>{dirty ? 'Есть несохранённые изменения проницаемости' : 'Нет несохранённых изменений проницаемости'}</span><Button variant="secondary" disabled={!dirty} onClick={discard}>Отменить изменения интервалов</Button><Button disabled={!canEdit || !dirty || !!error} onClick={save}>Сохранить проницаемость</Button></div>
  </div>
}
