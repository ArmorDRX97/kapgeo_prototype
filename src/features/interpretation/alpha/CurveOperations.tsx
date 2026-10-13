import { useState } from 'react'
import type { AlphaDocument, MeasurementRecord } from '../../../entities/interpretation/model/alphaTypes'
import { Button } from '../../../shared/ui/Button'
import { NumberField, RecordField, SelectField } from './Fields'
export function CurveOperations({ doc, records, recordId, depth, disabled, onChange, onRecord }: { doc: AlphaDocument; records: MeasurementRecord[]; recordId: string; depth: number; disabled: boolean; onChange: (doc: AlphaDocument) => void; onRecord: (id: string) => void }) {
  const [operation, setOperation] = useState('shift'), [value, setValue] = useState(0.1), [from, setFrom] = useState(112), [to, setTo] = useState(136), [replacement, setReplacement] = useState(0), [error, setError] = useState('')
  const apply = () => { try {
    const source = records.find(r => r.id === recordId); if (!source) throw new Error('Выберите исходную кривую.')
    if (![value, from, to, replacement].every(Number.isFinite) || from < 0 || to <= from || to > depth) throw new Error('Проверьте интервал и числовые параметры операции.')
    const next = structuredClone(source), parentId = source.parentId ?? source.id; next.id = `derived-${parentId}`; next.parentId = parentId; next.revision++; next.name = `${records.find(r => r.id === parentId)?.name ?? source.name} · правка`
    if (operation === 'shift') next.depths = next.depths.map(d => d + value)
    else if (operation === 'add' || operation === 'multiply') next.values = next.values.map((v, i) => v === null || next.depths[i]! < from || next.depths[i]! > to ? v : operation === 'add' ? v + value : v * value)
    else if (operation === 'replace' || operation === 'mask') next.values = next.values.map((v, i) => next.depths[i]! >= from && next.depths[i]! <= to ? operation === 'mask' ? null : replacement : v)
    else if (operation === 'clip') { const indices = next.depths.map((_, i) => i).filter(i => next.depths[i]! >= from && next.depths[i]! <= to); next.depths = indices.map(i => next.depths[i]!); next.values = indices.map(i => next.values[i]!) }
    const keep = next.depths.map((_, i) => i).filter(i => next.depths[i]! >= 0 && next.depths[i]! <= depth); next.depths = keep.map(i => next.depths[i]!); next.values = keep.map(i => next.values[i]!); if (next.depths.length < 2) throw new Error('Операция оставляет меньше двух точек.')
    next.operations.push(`${{ shift: 'Сдвиг', add: 'Прибавить', multiply: 'Умножить', replace: 'Заменить', mask: 'Вырезать', clip: 'Обрезать' }[operation as 'shift']} ${value}; интервал ${from}–${to}`)
    onChange({ ...doc, derived: [...doc.derived.filter(r => r.id !== next.id), next] }); onRecord(next.id); setError('')
  } catch (e) { setError((e as Error).message) } }
  const source = records.find(r => r.id === recordId)
  return <><RecordField value={recordId} records={records} onChange={onRecord} /><fieldset disabled={disabled} className="alpha-parameters"><SelectField label="Операция с кривой" value={operation} onChange={setOperation} options={[["shift", "Сдвиг по глубине"], ["add", "Прибавить константу"], ["multiply", "Умножить на константу"], ["replace", "Заменить значения"], ["mask", "Вырезать фрагмент (пропуск)"], ["clip", "Обрезать по интервалу"]]} />
    <div className="alpha-pair"><NumberField label="Операция: от, м" value={from} onChange={setFrom} /><NumberField label="Операция: до, м" value={to} onChange={setTo} /></div>{['shift', 'add', 'multiply'].includes(operation) && <NumberField label={operation === 'shift' ? 'Сдвиг, м' : 'Константа'} value={value} onChange={setValue} />}{operation === 'replace' && <NumberField label="Новое значение" value={replacement} onChange={setReplacement} />}
    <Button size="sm" onClick={apply}>Создать производную запись</Button>
  </fieldset><p>Исходная запись сохраняется. Для расчёта выберите производную запись в параметрах метода.</p>{error && <p role="alert">{error}</p>}<GroupHistory operations={source?.operations ?? []} /></>
}
function GroupHistory({ operations }: { operations: string[] }) { return <details className="alpha-group"><summary>История обработки · {operations.length}</summary><ol>{operations.map((o, i) => <li key={i}>{o}</li>)}</ol></details> }
