import { useState } from 'react'
import type { MeasurementRecord } from '../../../entities/interpretation/model/alphaTypes'
import { SelectField } from './Fields'

export function RecordInspector({ records }: { records: MeasurementRecord[] }) {
  const [selected, setSelected] = useState(''), record = records.find(r => r.id === selected) ?? records[0]
  if (!record) return <p>Запись ГИС не выбрана.</p>
  return <><SelectField label="Сведения о записи" value={record.id} onChange={setSelected} options={records.map(r => [r.id, r.name])} /><dl className="alpha-record-facts">
    <dt>Метод / единица</dt><dd>{record.kind} · {record.unit}</dd><dt>Дата</dt><dd>{record.date}</dd>
    <dt>Прибор</dt><dd>{record.instrument}</dd><dt>Оператор</dt><dd>{record.operator}</dd>
    <dt>Этап</dt><dd>{{ primary: 'Первичная запись', expanded: 'После расширения', development: 'Освоение', repeat: 'Повторное измерение' }[record.stage]}</dd>
    <dt>Назначение</dt><dd>{record.role === 'control' ? 'Контрольное' : 'Основное'}</dd><dt>Ревизия</dt><dd>{record.revision}</dd>
    <dt>Точки</dt><dd>{record.depths.length} · пропусков {record.values.filter(v => v === null).length}</dd>
    <dt>Диапазон</dt><dd>{record.depths[0]}–{record.depths.at(-1)} м</dd>
  </dl>{record.parentId && <p>Производная исходного измерения {record.parentId}. Операции: {record.operations.join('; ')}</p>}</>
}
