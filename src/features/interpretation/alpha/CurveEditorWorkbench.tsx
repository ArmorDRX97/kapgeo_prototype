import { useState } from 'react'
import type { AlphaDocument, MeasurementRecord } from '../../../entities/interpretation/model/alphaTypes'
import type { InterpretationWell } from '../../../entities/interpretation/model/types'
import { Panel } from '../../../shared/ui/Panel'
import { CurveOperations } from './CurveOperations'
import { CurvePointEditor } from './CurvePointEditor'
import { RecordField } from './Fields'

export function CurveEditorWorkbench({ doc, records, recordId, well, disabled, tools, from, onChange, onRecord, onPending }: {
  doc: AlphaDocument; records: MeasurementRecord[]; recordId: string; well: InterpretationWell; disabled: boolean; tools: boolean; from: number
  onChange: (doc: AlphaDocument) => void; onRecord: (id: string) => void; onPending: (pending: boolean) => void
}) {
  const [pointPending, setPointPending] = useState(false), [operationPending, setOperationPending] = useState(false)
  const [focusDepth, setFocusDepth] = useState(from)
  const source = records.find(r => r.id === recordId)
  return <div className={`curve-workspace${tools ? '' : ' curve-workspace--wide'}`}>
    <Panel title="Графическая корректировка отсчётов" description="Выберите запись и отсчёт. Глубина и значение уточняются на графике или в числовых полях.">
      <fieldset className="alpha-parameters" disabled={pointPending || operationPending}><RecordField value={recordId} records={records} onChange={id => { setFocusDepth(from); onRecord(id) }} /></fieldset>
      {source ? <CurvePointEditor key={source.id} startDepth={focusDepth} well={well} doc={doc} record={source} disabled={disabled || operationPending} onChange={onChange} onRecord={(id, depth) => { setFocusDepth(depth ?? from); onRecord(id) }} onPending={value => { setPointPending(value); onPending(value || operationPending) }} /> : <p className="alpha-empty">Записей для этой скважины нет. Выберите другую скважину.</p>}
    </Panel>
    {tools && <aside className="curve-operations" aria-label="Операции с кривой"><Panel title="Обработка записи" description="Операции выполняются отдельно от корректировки выбранного отсчёта.">
      <CurveOperations doc={doc} records={records} recordId={recordId} well={well} disabled={disabled} pointPending={pointPending} onChange={onChange} onRecord={onRecord} onPending={value => { setOperationPending(value); onPending(value || pointPending) }} />
    </Panel></aside>}
  </div>
}
