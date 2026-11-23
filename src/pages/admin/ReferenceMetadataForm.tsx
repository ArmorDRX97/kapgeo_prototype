import { useState } from 'react'
import { referenceAttributes } from '../../entities/reference-data/model/catalog'
import type { DictionaryMetadata, ReferenceDefinition } from '../../entities/reference-data/model/types'
import { Button } from '../../shared/ui/Button'
import { ReferenceDialog } from './ReferenceDialog'

export function ReferenceNames({ value, onChange, description = false, disabled = false }: {
  value: DictionaryMetadata
  onChange: (value: DictionaryMetadata) => void
  description?: boolean
  disabled?: boolean
}) {
  return <div className="reference-fields">
    <label className="field"><span className="field__label">Наименование на русском *</span><input required maxLength={255} disabled={disabled} value={value.name} onChange={event => onChange({ ...value, name: event.target.value })} /></label>
    <label className="field"><span className="field__label">Наименование на казахском</span><input maxLength={255} disabled={disabled} value={value.nameKk} onChange={event => onChange({ ...value, nameKk: event.target.value })} /></label>
    <label className="field"><span className="field__label">Наименование на английском</span><input maxLength={255} disabled={disabled} value={value.nameEn} onChange={event => onChange({ ...value, nameEn: event.target.value })} /></label>
    {description && <label className="field"><span className="field__label">Описание</span><textarea rows={3} maxLength={2000} disabled={disabled} value={value.description} onChange={event => onChange({ ...value, description: event.target.value })} /></label>}
  </div>
}

const fieldTypes = { text: 'Строка', textarea: 'Текст', integer: 'Целое', number: 'Число', boolean: 'Признак', date: 'Дата', reference: 'Ссылка на справочник', color: 'Цвет', json: 'JSON' }

export function ReferenceMetadataForm({ definition, initial, readOnly, pending, error, onClose, onSave }: {
  definition: ReferenceDefinition
  initial: DictionaryMetadata
  readOnly: boolean
  pending: boolean
  error?: string
  onClose: () => void
  onSave: (value: DictionaryMetadata) => void
}) {
  const [values, setValues] = useState(initial)
  const attributes = referenceAttributes(definition)
  const dirty = values !== initial
  return <ReferenceDialog title="Карточка справочника" pending={pending} wide dirty={dirty} onClose={onClose}>
    <form className="reference-modal-form" onSubmit={event => { event.preventDefault(); if (!readOnly) onSave(values) }}>
      <label className="field"><span className="field__label">Код справочника</span><input value={definition.id} readOnly /></label>
      <ReferenceNames value={values} onChange={setValues} description disabled={readOnly || pending} />
      <section><h3>Атрибуты</h3>{attributes.length ? <div className="reference-table-scroll"><table className="reference-table">
        <thead><tr><th>Имя и подпись</th><th>Тип</th><th>Ограничения</th><th>В списке</th></tr></thead>
        <tbody>{attributes.map(field => <tr key={field.key}>
          <td>{field.label}<small>{field.key === 'parent_id' ? 'parent' : field.key}</small>
            {field.labelKk && <small lang="kk">{field.labelKk}</small>}
            {field.labelEn && <small lang="en">{field.labelEn}</small>}
          </td>
          <td>{fieldTypes[field.type]}{field.reference && <small>{field.reference}</small>}</td>
          <td>{[field.required && 'Обязательный', field.maxLength && `До ${field.maxLength} символов`, field.min !== undefined && `От ${field.min}`, field.max !== undefined && `До ${field.max}`, field.unique && 'Уникальный', field.pattern && `Шаблон ${field.pattern}`, field.defaultValue != null && `По умолчанию ${String(field.defaultValue)}`].filter(Boolean).join(', ') || '—'}</td>
          <td>{field.showInList ? 'Да' : 'Нет'}</td>
        </tr>)}</tbody>
      </table></div> : <p>Дополнительных атрибутов нет.</p>}</section>
      {error && <p role="alert" className="form-alert form-alert--error">{error}</p>}
      <footer><Button variant="secondary" onClick={onClose} disabled={pending}>{readOnly ? 'Закрыть' : 'Отмена'}</Button>{!readOnly && <Button type="submit" disabled={pending || !dirty}>Сохранить</Button>}</footer>
    </form>
  </ReferenceDialog>
}
