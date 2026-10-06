import { useState, type ReactNode } from 'react'
import type { CurveScale, CurveSpec } from '@kapgeo/geo-viz/wellog'
import type { CalculationParameters, InterpretationWell, LithologyInterval, Rock, TechnologyInterval } from '../../../entities/interpretation/model/types'
import { Button } from '../../../shared/ui/Button'
import { interpretationCopy as copy } from '../model/copy'
import { meanResistivity, mineralsOf } from '../../../entities/interpretation/lib/commands'

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="field"><span className="field__label">{label}</span>{children}{hint && <span className="field__hint">{hint}</span>}</label>
}
type Row = LithologyInterval | TechnologyInterval
export function IntervalEditor({ row, depth, disabled, isNew, onApply, onCancel, onPreview, onSplit, onDelete, onMerge, well, allowColor = true }:
  { row: Row; depth: number; disabled: boolean; isNew: boolean; onApply: (row: Row) => void; onCancel: () => void;
    onPreview: (row: Row) => void; onSplit?: (at: number) => void; onDelete?: () => void; onMerge?: (direction: 'above' | 'below') => void; well?: InterpretationWell; allowColor?: boolean }) {
  const [draft, setDraft] = useState(row)
  const [splitAt, setSplitAt] = useState(Math.round((row.from + row.to) * 5) / 10)
  const patch = (value: Partial<Row>) => { const next = { ...draft, ...value }; setDraft(next); onPreview(next) }
  const mean = well && meanResistivity(well, draft.from, draft.to)
  return <form onSubmit={event => { event.preventDefault(); onApply(draft) }}>
    <div className="interpretation-inspector__summary"><span>{isNew ? 'Новый интервал' : 'Выбранный интервал'}</span><strong>{row.from.toFixed(1)} — {row.to.toFixed(1)} м</strong></div>
    <fieldset disabled={disabled}>
      <div className="interpretation-fields-pair"><Field label="От, м"><input required type="number" min={0} max={depth} step="0.1" value={draft.from} onChange={e => patch({ from: e.target.value === '' ? Number.NaN : Number(e.target.value) })} /></Field>
        <Field label="До, м"><input required type="number" min={0} max={depth} step="0.1" value={draft.to} onChange={e => patch({ to: e.target.value === '' ? Number.NaN : Number(e.target.value) })} /></Field></div>
      <p className="interpretation-meta">Мощность: {Number.isFinite(draft.to - draft.from) ? (draft.to - draft.from).toFixed(1) : '—'} м</p>
      {'rock' in draft ? <>
        <Field label="Порода"><select value={draft.rock} onChange={e => patch({ rock: e.target.value as Rock })}>{Object.entries(copy.rocks).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
        <fieldset className="interpretation-minerals"><legend>Минерализации</legend>{['пирит', 'гематит', 'карбонаты', 'лимонит'].map(value => <label key={value}><input type="checkbox" checked={mineralsOf(draft).includes(value)} onChange={e => { const values = e.target.checked ? [...mineralsOf(draft), value] : mineralsOf(draft).filter(v => v !== value); patch({ minerals: values, mineralization: values.join(', ') }) }} />{value}</label>)}</fieldset>
        <Field label="Минерализация"><input value={draft.mineralization} onChange={e => patch({ mineralization: e.target.value, minerals: e.target.value.split(/[,;]/).map(v => v.trim()).filter(Boolean) })} placeholder="Через запятую" /></Field>
        {allowColor && <Field label="Цвет керна"><select value={draft.color ?? ''} onChange={e => patch({ color: e.target.value ? e.target.value as LithologyInterval['color'] : undefined })}><option value="">Без цвета</option>{Object.entries(copy.colors).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>}
        <Field label="Примечание"><textarea rows={3} value={draft.note} onChange={e => patch({ note: e.target.value })} /></Field>
      </> : <Field label="Тип интервала"><select value={draft.kind} onChange={e => patch({ kind: e.target.value as TechnologyInterval['kind'], source: 'manual' })}>{Object.entries(copy.technology).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>}
      <div className="interpretation-actions"><Button type="submit" size="sm">Применить</Button><Button variant="secondary" size="sm" onClick={onCancel}>Отменить ввод</Button></div>
      {!isNew && onSplit && <details className="interpretation-editor-details"><summary>Разделить интервал</summary><Field label="Глубина разделения, м"><input type="number" step="0.1" min={row.from + 0.1} max={row.to - 0.1} value={splitAt} onChange={e => setSplitAt(Number(e.target.value))} /></Field><Button size="sm" variant="secondary" onClick={() => onSplit(splitAt)}>Разделить</Button></details>}
      {!isNew && onDelete && <Button variant="quiet" className="interpretation-delete" size="sm" onClick={onDelete}>Удалить интервал</Button>}
      {!isNew && onMerge && <details className="interpretation-editor-details"><summary>Объединить с соседом</summary><p className="interpretation-note">Объединённый диапазон сохранит свойства выбранной разности.</p><div className="interpretation-actions"><Button size="sm" variant="secondary" onClick={() => onMerge('above')}>С верхним</Button><Button size="sm" variant="secondary" onClick={() => onMerge('below')}>С нижним</Button></div></details>}
    </fieldset>
    {disabled && <p className="interpretation-note">Исходная колонка или зафиксированный результат доступны только для просмотра.</p>}
    {mean && <p className="interpretation-note" role="status">Средний КС: {mean.mean === undefined ? 'нет данных' : `${mean.mean.toFixed(2)} Ом·м`} · покрытие {Math.round(mean.coverage * 100)}%. Усреднение по глубине без пропусков.</p>}
    {!disabled && <p className="interpretation-note">Изменение диапазона заменит перекрытые части соседних интервалов. Сохранение выполняется отдельно.</p>}
  </form>
}
export function CurveEditor({ curve, scale, onApply }: { curve: CurveSpec; scale: CurveScale; onApply: (scale: CurveScale) => void }) {
  const [min, setMin] = useState(scale.min), [max, setMax] = useState(scale.max), [log, setLog] = useState(scale.log ?? false)
  const [error, setError] = useState('')
  return <form onSubmit={event => { event.preventDefault(); if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min || (log && min <= 0)) { setError('Верхний предел должен превышать нижний. Для log нижний предел должен быть положительным.'); return } setError(''); onApply({ min, max, log }) }}>
    <div className="interpretation-inspector__summary"><span>Каротажная кривая</span><strong>{curve.name}</strong><small>{curve.unit} · {curve.data.depths.length} точек · шаг 0,1 м</small></div>
    <div className="interpretation-fields-pair"><Field label="Минимум шкалы"><input type="number" required step="any" value={min} onChange={e => setMin(Number(e.target.value))} /></Field><Field label="Максимум шкалы"><input type="number" required step="any" value={max} onChange={e => setMax(Number(e.target.value))} /></Field></div>
    <label className="interpretation-check"><input type="checkbox" checked={log} onChange={e => setLog(e.target.checked)} />Логарифмическая шкала</label>
    {error && <p role="alert" className="interpretation-error">{error}</p>}
    <div className="interpretation-actions"><Button size="sm" type="submit">Применить шкалу</Button><Button size="sm" variant="secondary" onClick={() => { setMin(curve.scale.min); setMax(curve.scale.max); setLog(curve.scale.log ?? false); onApply(curve.scale) }}>Авто</Button></div>
    <p className="interpretation-note">Шкала меняет отображение. Исходные числа и расчёт по КС сохраняются.</p>
  </form>
}
export function CalculationEditor({ well, parameters, onChange, onCalculate, disabled, stale, hasPreview }:
  { well: InterpretationWell; parameters: CalculationParameters; onChange: (parameters: CalculationParameters) => void; onCalculate: () => void; disabled: boolean; stale: boolean; hasPreview: boolean }) {
  const patch = (value: Partial<CalculationParameters>) => onChange({ ...parameters, ...value })
  return <form onSubmit={event => { event.preventDefault(); onCalculate() }}>
    <div className="interpretation-inspector__summary"><span>Расчёт по КС</span><strong>{parameters.method === 'gradient' ? 'Градиент-зонд' : 'Потенциал-зонд'}</strong></div>
    <fieldset disabled={disabled}>
      <Field label="Источник КС"><select value={parameters.curveId} onChange={e => patch({ curveId: e.target.value })}>{well.curves.filter(c => c.type === 'RS').map(c => <option key={c.id} value={c.id}>{c.name} · {c.id === 'rs-main' ? 'A' : 'B'}</option>)}</select></Field>
      <Field label="Метод КС"><select value={parameters.method ?? 'potential'} onChange={e => patch({ method: e.target.value as CalculationParameters['method'] })}><option value="potential">Потенциал-зонд</option><option value="gradient">Градиент-зонд</option></select></Field>
      <div className="interpretation-fields-pair"><Field label="Расчёт от, м"><input required type="number" min={0} max={well.depth} step="0.1" value={parameters.from} onChange={e => patch({ from: Number(e.target.value) })} /></Field><Field label="Расчёт до, м"><input required type="number" min={0} max={well.depth} step="0.1" value={parameters.to} onChange={e => patch({ to: Number(e.target.value) })} /></Field></div>
      <Field label="Порог КС, Ом·м"><input required type="number" min="0.1" step="0.1" value={parameters.threshold} onChange={e => patch({ threshold: Number(e.target.value) })} /></Field>
      <Field label="Минимум проницаемого, м"><input required type="number" min={0} step="0.1" value={parameters.minThickness} onChange={e => patch({ minThickness: Number(e.target.value) })} /></Field>
      <Field label="Минимум непроницаемого, м"><input required type="number" min={0} step="0.1" value={parameters.minImpermeable ?? parameters.minThickness} onChange={e => patch({ minImpermeable: Number(e.target.value) })} /></Field>
      <Field label="Направление расчёта"><select value={parameters.direction ?? 'down'} onChange={e => patch({ direction: e.target.value as CalculationParameters['direction'] })}><option value="down">Сверху вниз</option><option value="up">Снизу вверх</option></select></Field>
      <Field label="Округление глубины, м"><select value={parameters.rounding ?? 0.1} onChange={e => patch({ rounding: Number(e.target.value) })}>{[0.1, 0.2, 0.5, 1].map(value => <option key={value} value={value}>{value}</option>)}</select></Field>
      {parameters.method === 'gradient' && <label className="interpretation-check"><input type="checkbox" checked={parameters.continuePermeable ?? false} onChange={e => patch({ continuePermeable: e.target.checked })} />Продолжить последний проницаемый</label>}
      <div className="interpretation-actions"><Button size="sm" type="submit">{hasPreview ? 'Пересчитать' : 'Рассчитать'}</Button></div>
    </fieldset>
    {stale && <p role="status" className="interpretation-error">Параметры изменены. Пересчитайте предпросмотр.</p>}
    <p className="interpretation-note">Потенциал-зонд — пересечения порога; градиент-зонд — локальные минимумы ниже и максимумы выше порога. Тонкий прослой присоединяется к предыдущему по направлению расчёта. Пропуски КС остаются неизвестными.</p>
  </form>
}
