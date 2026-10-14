import { useState } from 'react'
import { flushSync } from 'react-dom'
import type { AlphaDocument, MeasurementRecord } from '../../../entities/interpretation/model/alphaTypes'
import type { InterpretationWell } from '../../../entities/interpretation/model/types'
import { applyCurveOperation, curveOperationNames, type CurveOperation } from '../../../entities/interpretation/lib/alphaCurveOperations'
import { Button } from '../../../shared/ui/Button'
import { NumberField, RecordField, SelectField } from './Fields'
export function CurveOperations({ doc, records, recordId, well, disabled, onChange, onRecord, onPending }: { doc: AlphaDocument; records: MeasurementRecord[]; recordId: string; well: InterpretationWell; disabled: boolean; onChange: (doc: AlphaDocument) => void; onRecord: (id: string) => void; onPending: (pending: boolean) => void }) {
  const [operation, setOperation] = useState<CurveOperation>('shift'), [value, setValue] = useState(0.1), [from, setFrom] = useState(112), [to, setTo] = useState(136), [error, setError] = useState(''), [dirty, setDirty] = useState(false)
  const source = records.find(r => r.id === recordId)
  const apply = (shortcut?: number) => {
    try {
      const next = applyCurveOperation(well, doc, recordId, { operation: shortcut === undefined ? operation : 'shift', from, to, value: shortcut ?? value })
      flushSync(() => { onChange(next.document); onPending(false); setDirty(false); setError('') }); onRecord(next.recordId)
    } catch (e) { setError((e as Error).message) }
  }
  const cancel = () => { setDirty(false); onPending(false); setError(''); setValue(0.1); setFrom(112); setTo(136); setOperation('shift') }
  return <>
    <fieldset disabled={dirty} className="alpha-parameters"><RecordField value={recordId} records={records} onChange={onRecord} /></fieldset>
    <form onChangeCapture={() => { setDirty(true); onPending(true) }} onSubmit={e => { e.preventDefault(); apply() }}>
      <fieldset disabled={disabled} className="alpha-parameters"><SelectField label="Операция с кривой" value={operation} onChange={v => setOperation(v as CurveOperation)} options={Object.entries(curveOperationNames)} />
        {operation !== 'shift' && <div className="alpha-pair"><NumberField label="Операция: от, м" value={from} onChange={setFrom} /><NumberField label="Операция: до, м" value={to} onChange={setTo} /></div>}
        {!['mask', 'clip'].includes(operation) && <NumberField label={operation === 'shift' ? 'Сдвиг, м' : operation === 'replace' ? 'Новое значение' : 'Константа'} value={value} onChange={setValue} />}
        <div className="alpha-actions"><Button size="sm" type="submit">{source?.parentId ? 'Применить к производной' : 'Создать производную запись'}</Button>{dirty && <Button size="sm" variant="quiet" onClick={cancel}>Отменить ввод операции</Button>}</div>
        <div className="alpha-actions"><Button size="sm" variant="secondary" disabled={dirty} onClick={() => apply(-0.1)}>Сдвиг −0,1 м</Button><Button size="sm" variant="secondary" disabled={dirty} onClick={() => apply(0.1)}>Сдвиг +0,1 м</Button></div>
      </fieldset>
    </form>
    <p>Исходник неизменяем. Обработка исходника создаёт новую производную; обработка производной повышает её ревизию. Выбор производной для расчёта — отдельное действие в параметрах метода.</p>
    {error && <p role="alert">{error}</p>}<details className="alpha-group"><summary>История обработки · {source?.operations.length ?? 0}</summary><ol>{source?.operations.map((o, i) => <li key={i}>{o}</li>)}</ol></details>
  </>
}
