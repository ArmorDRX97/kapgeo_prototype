import { Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { referenceAttributes } from '../../entities/reference-data/model/catalog'
import { referenceChildren, referenceDependents, referenceTree, validateReferenceValues } from '../../entities/reference-data/lib/validation'
import { referenceDate, referenceEntryLabel, referenceNameKey, type ReferenceEntry, type ReferenceDefinition, type ReferenceField, type ReferenceValue, type ReferenceWorkspace } from '../../entities/reference-data/model/types'
import { useUiLocale } from '../../shared/lib/useUiLocale'
import { Button } from '../../shared/ui/Button'
import { ColorSample } from './ReferenceColors'
import { referenceMessage } from './reference-messages'

const languages = [{ id: 'ru', label: 'RU', name: 'Русский' }, { id: 'kk', label: 'KZ', name: 'Қазақша' }, { id: 'en', label: 'EN', name: 'English' }] as const

function ReferenceSwitch({ id, label, checked, disabled, errorId, onChange }: { id: string; label: string; checked: boolean; disabled: boolean; errorId?: string; onChange: (checked: boolean) => void }) {
  return <label className="reference-switch" htmlFor={id}><span className="reference-switch-label">{label}</span><span className="reference-switch-control"><input id={id} type="checkbox" role="switch" aria-label={label} aria-describedby={errorId} aria-invalid={Boolean(errorId)} checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} /><span className="reference-switch-track" aria-hidden="true" /><span className="reference-switch-value" aria-hidden="true">{checked ? 'Да' : 'Нет'}</span></span></label>
}

export function ReferenceEntryEditor({ definition, dictionaryName, entry, workspace, pending, error, readOnly, onDirty, onClose, onSave, onRefresh, onStatus, onDelete }: {
  definition: ReferenceDefinition
  dictionaryName: string
  entry?: ReferenceEntry
  workspace: ReferenceWorkspace
  pending: boolean
  error?: string
  readOnly: boolean
  onDirty: (dirty: boolean) => void
  onClose: () => void
  onSave: (values: Record<string, ReferenceValue>, expectedRevision?: number) => void
  onRefresh?: () => void
  onStatus?: () => void
  onDelete?: () => void
}) {
  const locale = useUiLocale()
  const [initialValues] = useState<Record<string, ReferenceValue>>(() => entry ? { ...entry.values } : Object.fromEntries(
    definition.fields.map(field => [field.key, field.key === 'valid_from' ? referenceDate() : field.defaultValue ?? (field.type === 'boolean' ? false : null)]),
  ))
  const [values, setValues] = useState(initialValues)
  const [expectedRevision] = useState(entry?.version)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [language, setLanguage] = useState<(typeof languages)[number]['id']>('ru')
  const primaryName = referenceNameKey(definition)
  const fieldLanguage = (field: ReferenceField) => field.key === primaryName ? 'ru' : languages.find(option => field.key.endsWith(`_${option.id}`))?.id
  const attributes = referenceAttributes(definition)
  const localized = definition.fields.filter(field => fieldLanguage(field) && !attributes.includes(field))
  const basic = definition.fields.filter(field => !field.internal && field.key !== 'is_active' && !fieldLanguage(field) && !attributes.includes(field))
  const modified = JSON.stringify(values) !== JSON.stringify(initialValues)
  const descendants = new Set(entry ? [entry.id, ...referenceChildren(workspace, entry).map(item => item.id)] : [])
  const lockedCode = definition.autoCode || Boolean(entry && referenceDependents(workspace, entry).length)
  useEffect(() => { onDirty(modified) }, [modified, onDirty])
  const setValue = (key: string, value: ReferenceValue) => { setValues(current => ({ ...current, [key]: value })); setErrors(current => ({ ...current, [key]: '' })) }
  const submit = () => {
    const normalized = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]))
    if (!entry && definition.autoCode) delete normalized.code
    const nextErrors = validateReferenceValues(definition.id, normalized, workspace, entry?.id)
    if (!entry && definition.autoCode) delete nextErrors.code
    setErrors(nextErrors)
    const firstInvalid = definition.fields.find(field => nextErrors[field.key])
    if (firstInvalid) {
      const nextLanguage = fieldLanguage(firstInvalid)
      if (nextLanguage) setLanguage(nextLanguage)
      requestAnimationFrame(() => document.getElementById(`reference-field-${firstInvalid.key}`)?.focus())
    } else if (!Object.keys(nextErrors).length) onSave(normalized, expectedRevision)
  }
  const renderField = (field: ReferenceField) => {
    const value = values[field.key], errorId = errors[field.key] ? `reference-error-${field.key}` : undefined
    const controlProps = { id: `reference-field-${field.key}`, disabled: pending || readOnly || field.key === 'code' && lockedCode, 'aria-invalid': Boolean(errorId), 'aria-describedby': errorId }
    const label = (locale === 'kk' ? field.labelKk : locale === 'en' ? field.labelEn : field.label) || field.label
    const isNumber = field.type === 'number' || field.type === 'integer'
    const currentColor = workspace.colors?.find(color => color.id === value && !color.deleted)
    const options = field.type === 'reference' ? referenceTree(workspace.entries.filter(item => item.dictionaryId === field.reference)) : []
    return <div className={`field${['textarea', 'json', 'boolean'].includes(field.type) || fieldLanguage(field) ? ' reference-field-wide' : ''}`} key={field.key}>
      {field.type === 'boolean' ? <ReferenceSwitch id={controlProps.id} label={label} checked={Boolean(value)} disabled={controlProps.disabled} errorId={errorId} onChange={checked => setValue(field.key, checked)} /> : <><label className="field__label" htmlFor={controlProps.id}>{label}{field.required && <span aria-label="обязательно"> *</span>}</label>
        {field.type === 'reference' ? <select {...controlProps} value={String(value ?? '')} onChange={event => setValue(field.key, event.target.value || null)}>
          <option value="">Не выбрано</option>{options.filter(({ entry: item }) => (item.active || item.id === value) &&
            (field.key !== 'parent_id' || !descendants.has(item.id))).map(({ entry: item, depth }) => <option key={item.id} value={item.id}
              disabled={field.key !== 'parent_id' && Boolean(item.values.is_group) && item.id !== value}>
              {depth > 0 ? `${'  '.repeat(Math.min(depth, 8))}↳ ` : ''}{referenceEntryLabel(item)}{item.active ? '' : ' · недействующее'}
            </option>)}
        </select> : field.type === 'color' ? <div className="reference-color-select">
          <select {...controlProps} value={String(value ?? '')} onChange={event => setValue(field.key, event.target.value || null)}>
            <option value="">Не выбрано</option>{workspace.colors?.filter(color => !color.deleted).map(color => <option key={color.id} value={color.id}>{color.name} · {color.hex}</option>)}
          </select>{currentColor && <ColorSample hex={currentColor.hex} />}
        </div> : field.type === 'json' || field.type === 'textarea' ? <textarea {...controlProps} rows={3} maxLength={field.maxLength} value={String(value ?? '')} onChange={event => setValue(field.key, event.target.value)} />
          : <input {...controlProps} type={isNumber ? 'number' : field.type === 'date' ? 'date' : 'text'} step={field.type === 'integer' ? 1 : 'any'} maxLength={field.maxLength} placeholder={field.key === 'code' && definition.autoCode ? 'Присваивается при сохранении' : undefined} value={String(value ?? '')} onChange={event => setValue(field.key, isNumber ? event.target.value === '' ? null : Number(event.target.value) : event.target.value)} />}
      </>}
      {errorId && <small id={errorId} className="reference-field-error">{referenceMessage(errors[field.key]!, locale)}</small>}
    </div>
  }
  return <form className="reference-entry-form" noValidate onSubmit={event => { event.preventDefault(); if (!readOnly && !pending) submit() }}>
    <div className="reference-form-body">
      {error && <div className="form-alert form-alert--error" role="alert">{referenceMessage(error, locale)}{onRefresh && <Button size="sm" variant="secondary" disabled={pending} onClick={onRefresh}>Обновить карточку</Button>}</div>}
      {Object.values(errors).some(Boolean) && <div className="form-alert form-alert--error" role="alert">Проверьте отмеченные поля. Значения сохранены в форме.</div>}
      <p className="reference-entry-context"><strong>{dictionaryName}</strong><span>{entry?.active === false ? 'Недействующее' : 'Действующее'}</span></p>
      {basic.length > 0 && <section className="reference-field-section"><h4>Основные сведения</h4><div className="reference-form-grid">{basic.map(renderField)}</div></section>}
      {localized.length > 0 && <section className="reference-field-section"><div className="reference-language-heading"><h4>Наименования</h4><fieldset className="reference-segmented reference-language-tabs"><legend className="sr-only">Язык полей</legend>{languages.map(option => <label key={option.id} title={option.name}><input type="radio" name="reference-field-language" aria-label={option.name} checked={language === option.id} onChange={() => setLanguage(option.id)} /><span>{option.label}{localized.some(field => fieldLanguage(field) === option.id && errors[field.key]) && <i className="reference-language-error" />}</span></label>)}</fieldset></div>{languages.map(option => <div className="reference-translation-panel" key={option.id} hidden={language !== option.id}>{localized.filter(field => fieldLanguage(field) === option.id).map(renderField)}</div>)}</section>}
      {attributes.length > 0 && <section className="reference-field-section"><h4>Атрибуты справочника</h4><div className="reference-form-grid">{attributes.map(renderField)}</div></section>}
    </div>
    <footer>{onDelete && <Button size="sm" variant="quiet" disabled={pending || modified} onClick={onDelete}>Удалить</Button>}
      {onStatus && <Button size="sm" variant="secondary" disabled={pending || modified} onClick={onStatus}>{entry?.active ? 'Перевести в недействующие' : 'Сделать действующим'}</Button>}
      <Button variant="secondary" disabled={pending} onClick={onClose}>{readOnly ? 'Закрыть' : 'Отмена'}</Button>
      {!readOnly && <Button type="submit" disabled={pending || Boolean(entry && !modified)}><Save size={15} />{pending ? 'Сохраняем…' : 'Сохранить'}</Button>}
    </footer>
  </form>
}
