import { domainTokens } from '@kapgeo/geo-viz/tokens'
import { NoteEditor } from './NoteEditor'
import { useState } from 'react'
import type { CurveSpec, TrackSpec } from '@kapgeo/geo-viz/wellog'
import type { MeasurementRecord } from '../../../entities/interpretation/model/alphaTypes'
import { interpretationWells } from '../../../entities/interpretation/model/fixtures'
import { Button } from '../../../shared/ui/Button'
import { CheckField, NumberField, SelectField } from './Fields'
import { defaultAlphaView, type AlphaViewPreferences, type CurveAppearance } from './viewPreferences'

export function DisplaySettings({ wellId, depthLimit, tracks, records, value, onChange, compare }: { wellId: string; depthLimit: number; tracks: TrackSpec[]; records: MeasurementRecord[]; value: AlphaViewPreferences; onChange: (next: AlphaViewPreferences) => void; compare: boolean }) {
  const [selected, setSelected] = useState(''), [extra, setExtra] = useState('')
  const track = tracks.find(t => t.id === selected) ?? tracks[0]
  const reorder = (direction: -1 | 1) => {
    if (!track) return
    const ids = tracks.map(t => t.id), index = ids.indexOf(track.id), target = index + direction
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target]!, ids[index]!]
    onChange({ ...value, order: ids })
  }
  return <>
    <CheckField label="Сетка планшета" checked={value.grid} onChange={grid => onChange({ ...value, grid })} />
    <SelectField label="Колонка планшета" value={track?.id ?? ''} onChange={setSelected} options={tracks.map(t => [t.id, t.title])} />
    {track && <>
      <CheckField label="Показывать колонку" checked={!value.hidden.includes(track.id)} onChange={visible => onChange({ ...value, hidden: visible ? value.hidden.filter(id => id !== track.id) : [...value.hidden, track.id] })} />
      <SelectField label="Ширина колонки, px" value={String(track.width ?? 140)} onChange={width => onChange({ ...value, widths: { ...value.widths, [track.id]: Number(width) } })} options={[...new Set([90, 110, 140, 180, 210, 260, 310, 340, 420, 580, track.width ?? 140])].sort((a, b) => a - b).map(v => [String(v), String(v)])} />
      <div className="alpha-actions"><Button size="sm" variant="secondary" onClick={() => reorder(-1)}>Левее</Button><Button size="sm" variant="secondary" onClick={() => reorder(1)}>Правее</Button></div>
      {track.curves.map(c => <ScaleForm key={`${c.id}-${JSON.stringify([c.scale, c.color, c.lineWidth, c.dashed, c.markers, c.fill])}`} curve={c} depthLimit={depthLimit} onChange={(scale, appearance) => onChange({ ...value, scales: { ...value.scales, [c.id]: scale }, styles: { ...value.styles, [c.id]: appearance } })} />)}
      <NoteEditor key={`${track.id}-${JSON.stringify(value.notes)}`} trackId={track.id} depthLimit={depthLimit} notes={value.notes} onChange={notes => onChange({ ...value, notes })} />
    </>}
    <details className="alpha-group"><summary>Дополнительные записи</summary><div><SelectField label="Добавить запись на планшет" value={extra} onChange={setExtra} options={[["", "Выберите запись"], ...records.filter(r => !value.extra.includes(r.id)).map(r => [r.id, r.name] as const)]} /><Button size="sm" variant="secondary" disabled={!extra || value.extra.length >= 10} onClick={() => { onChange({ ...value, extra: [...value.extra, extra] }); setExtra('') }}>Добавить колонку</Button>{value.extra.map(id => <Button key={id} size="sm" variant="quiet" onClick={() => onChange({ ...value, extra: value.extra.filter(r => r !== id) })}>Убрать {records.find(r => r.id === id)?.name ?? id}</Button>)}</div></details>
    {compare && <details className="alpha-group"><summary>Соседняя скважина</summary><div><SelectField label="Скважина для сопоставления" value={value.comparisonWell} onChange={comparisonWell => onChange({ ...value, comparisonWell })} options={[["", "Не показывать"], ...interpretationWells.filter(w => w.id !== wellId && w.curves.length > 0).map(w => [w.id, w.code] as const)]} /><NumberField label="Визуальный сдвиг соседа, м" value={value.comparisonOffset} onChange={comparisonOffset => { if (Number.isFinite(comparisonOffset) && Math.abs(comparisonOffset) <= 100) onChange({ ...value, comparisonOffset }) }} /><p>Положительный сдвиг опускает соседние колонки. Данные соседней скважины не изменяются.</p></div></details>}
    <Button size="sm" variant="quiet" onClick={() => onChange(defaultAlphaView())}>Сбросить вид метода</Button>
    <p>Вид хранится отдельно по скважине и методу. Шкалы и порядок колонок не меняют расчёт.</p>
  </>
}
function ScaleForm({ curve, depthLimit, onChange }: { curve: CurveSpec; depthLimit: number; onChange: (scale: CurveSpec['scale'], appearance: CurveAppearance) => void }) {
  const [min, setMin] = useState(curve.scale.min), [max, setMax] = useState(curve.scale.max), [log, setLog] = useState(!!curve.scale.log), [error, setError] = useState('')
  const [color, setColor] = useState(curve.color ?? domainTokens.curves[curve.type]), [lineWidth, setLineWidth] = useState(curve.lineWidth ?? 1), [dashed, setDashed] = useState(!!curve.dashed), [markers, setMarkers] = useState(!!curve.markers)
  const [below, setBelow] = useState(!!curve.fill?.below), [filled, setFilled] = useState(!!curve.fill), [from, setFrom] = useState(curve.fill?.from ?? 112), [to, setTo] = useState(curve.fill?.to ?? 136), [baseline, setBaseline] = useState(curve.fill?.baseline ?? curve.scale.min)
  return <form onSubmit={event => {
    event.preventDefault()
    if (![min, max, lineWidth].every(Number.isFinite) || max <= min || log && min <= 0 || lineWidth < 0.5 || lineWidth > 4 || filled && (![from, to, baseline].every(Number.isFinite) || from < 0 || to > depthLimit || to <= from || log && baseline <= 0)) { setError('Проверьте шкалу, толщину 0,5…4 px и диапазон заливки; для log значения положительны.'); return }
    onChange({ min, max, log }, { color, lineWidth, dashed, markers, ...(filled ? { fill: { from, to, baseline, color, below } } : {}) }); setError('')
  }}><strong>{curve.name}</strong><div className="alpha-pair"><NumberField label={`${curve.name}: минимум шкалы`} value={min} onChange={setMin} /><NumberField label={`${curve.name}: максимум шкалы`} value={max} onChange={setMax} /></div><CheckField label={`${curve.name}: логарифмическая шкала`} checked={log} onChange={setLog} />
    <details className="alpha-group"><summary>Линия и заливка</summary><div><label className="alpha-field"><span>Цвет кривой</span><input type="color" value={color} onChange={e => setColor(e.target.value)} /></label><NumberField label="Толщина линии, px" value={lineWidth} onChange={setLineWidth} /><CheckField label="Пунктирная кривая" checked={dashed} onChange={setDashed} /><CheckField label="Точки измерений" checked={markers} onChange={setMarkers} /><CheckField label="Заливка аномалии" checked={filled} onChange={setFilled} />{filled && <><div className="alpha-pair"><NumberField label="Заливка: от, м" value={from} onChange={setFrom} /><NumberField label="Заливка: до, м" value={to} onChange={setTo} /></div><NumberField label="Базовое значение заливки" value={baseline} onChange={setBaseline} /><CheckField label="Заливка ниже базового значения" checked={below} onChange={setBelow} /></>}</div></details>
    <Button size="sm" type="submit" variant="secondary">Применить шкалу</Button>{error && <p role="alert">{error}</p>}</form>
}
