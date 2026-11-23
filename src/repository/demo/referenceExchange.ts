import { referenceDefinition } from '../../entities/reference-data/model/catalog'
import { ExchangeError, readReferencePackage, wireField, type ExchangePackage } from '../../entities/reference-data/lib/exchange'
import { isReferenceDate, referenceValidationIndex, validateReferenceValues } from '../../entities/reference-data/lib/validation'
import { referenceDate, type ImportIssue, type ImportResult, type ReferenceColor, type ReferenceEntry, type ReferenceField, type ReferenceValue, type ReferenceWorkspace } from '../../entities/reference-data/model/types'
import type { UserPersona } from '../../entities/session/model/types'
import { referenceDataRepository, validatedColor } from './referenceDataRepository'

class InvalidPackage extends Error {
  constructor(readonly result: ImportResult) { super('В пакете есть ошибки.') }
}

const exchangePermission = 'adm.nsi.exchange'
const lower = (value: unknown) => String(value ?? '').toLocaleLowerCase('ru')
const identifier = (dictionary: string, code: unknown) => JSON.stringify([dictionary, lower(code)])
const asText = (value: unknown) => typeof value === 'string' ? value.trim() : ''

function readValue(raw: unknown, field: ReferenceField): ReferenceValue {
  if (raw === '' || raw === null || raw === undefined) return field.defaultValue ?? null
  if (field.type === 'number' || field.type === 'integer') {
    const number = typeof raw === 'number' ? raw : typeof raw === 'string' && /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?$/i.test(raw.trim()) ? Number(raw) : NaN
    if (field.type === 'integer' ? Number.isSafeInteger(number) : Number.isFinite(number)) return number
    throw new ExchangeError('NSI_IMP_TYPE', `Поле «${field.label}» должно содержать ${field.type === 'integer' ? 'целое число' : 'число'}.`)
  }
  if (field.type === 'boolean') {
    if (raw === true || raw === 'true') return true
    if (raw === false || raw === 'false') return false
    throw new ExchangeError('NSI_IMP_TYPE', `Поле «${field.label}» должно быть логическим значением.`)
  }
  if (typeof raw !== 'string') throw new ExchangeError('NSI_IMP_TYPE', `Поле «${field.label}» должно быть строкой.`)
  if (field.type === 'date' && !isReferenceDate(raw)) throw new ExchangeError('NSI_IMP_TYPE', `Поле «${field.label}» должно содержать дату ГГГГ-ММ-ДД.`)
  return raw.trim()
}

function applyPackage(data: ExchangePackage, workspace: ReferenceWorkspace, actor: string, filename: string) {
  const errors: ImportIssue[] = []
  const stats = new Map<string, ImportResult['rows'][number]>()
  const count = (dictionary: string, field: 'added' | 'skipped') => {
    const result = stats.get(dictionary) ?? { dictionary, added: 0, skipped: 0 }
    result[field]++
    stats.set(dictionary, result)
  }
  if (data.referenceItems.length + data.colors.length > 100_000) throw new ExchangeError('NSI_IMP_LIMIT', 'В пакете больше 100 000 значений.')

  const colors = new Map(workspace.colors?.map(color => [lower(color.code), color]))
  const newColors: ReferenceColor[] = []
  const seen = new Set<string>()
  for (const { values, location } of data.colors) {
    const code = asText(values.code)
    const name = asText(values.name)
    const hex = asText(values.hex)
    try {
      if (!code || !name || !hex) throw new ExchangeError('NSI_IMP_REQUIRED_FIELD', 'Для цвета обязательны код, наименование и HEX.')
      if (seen.has(lower(code))) throw new ExchangeError('NSI_IMP_DUPLICATE_CODE', `Код «${code}» повторяется в файле.`)
      seen.add(lower(code))
      if (colors.has(lower(code))) { count('colors', 'skipped'); continue }
      const color = validatedColor({ id: '', code, name, nameKk: asText(values.name_kk), nameEn: asText(values.name_en), hex, description: '' }, crypto.randomUUID())
      colors.set(lower(code), color)
      newColors.push(color)
      count('colors', 'added')
    } catch (error) {
      errors.push(issue(error, location, 'colors', code))
    }
  }
  workspace.colors = [...(workspace.colors ?? []), ...newColors]

  const targets = new Map(workspace.entries.map(entry => [identifier(entry.dictionaryId, entry.values.code), entry]))
  const reserved = new Set(targets.keys())
  for (const change of workspace.changes) {
    if (change.operation === 'deleted' && change.before) reserved.add(identifier(change.dictionaryId, change.before.values.code))
  }
  const pending: { row: ExchangePackage['referenceItems'][number]; entry: ReferenceEntry }[] = []
  seen.clear()
  for (const row of data.referenceItems) {
    const dictionary = asText(row.values.reference_type_code)
    const code = asText(row.values.code)
    try {
      const definition = referenceDefinition(dictionary)
      if (!definition) throw new ExchangeError('NSI_IMP_REFERENCE_NOT_FOUND', `Справочник «${dictionary}» не найден в системе.`)
      if (!code) throw new ExchangeError('NSI_IMP_REQUIRED_FIELD', 'Не заполнен код значения.')
      const key = identifier(dictionary, code)
      if (seen.has(key)) throw new ExchangeError('NSI_IMP_DUPLICATE_CODE', `Код «${code}» повторяется в файле.`)
      seen.add(key)
      if (definition.system || reserved.has(key)) { count(dictionary, 'skipped'); continue }
      const status = row.values.status || 'ACTIVE'
      if (status !== 'ACTIVE' && status !== 'INACTIVE') throw new ExchangeError('NSI_IMP_CONSTRAINT', 'Статус должен быть ACTIVE или INACTIVE.')
      const entry = { id: crypto.randomUUID(), dictionaryId: dictionary, values: { code } as ReferenceEntry['values'], active: status === 'ACTIVE', version: 1 }
      targets.set(key, entry)
      pending.push({ row, entry })
    } catch (error) {
      errors.push(issue(error, row.location, dictionary, code))
    }
  }
  for (const { row, entry } of pending) {
    const definition = referenceDefinition(entry.dictionaryId)!
    const allowed = new Set(['reference_type_code', 'status', ...definition.fields.map(field => wireField(definition, field.key))])
    for (const field of Object.keys(row.values)) {
      if (!allowed.has(field)) errors.push(issue(new ExchangeError('NSI_IMP_UNKNOWN_COLUMN', `Поле «${field}» не предусмотрено структурой.`), row.location, entry.dictionaryId, String(entry.values.code)))
    }
    for (const field of definition.fields) {
      if (field.key === 'is_active') { entry.values.is_active = entry.active; continue }
      try {
        const raw = row.values[wireField(definition, field.key)]
        let value = readValue(raw, field)
        if (field.key === 'valid_from' && !value) value = referenceDate()
        if (value && field.type === 'reference') {
          const target = targets.get(identifier(field.reference ?? '', value))
          if (target?.active === false || !target && reserved.has(identifier(field.reference ?? '', value))) throw new ExchangeError('NSI_IMP_LINK_INACTIVE', `Атрибут «${field.label}»: значение «${value}» недействующее или удалено.`)
          if (!target) throw new ExchangeError('NSI_IMP_LINK_NOT_FOUND', `Атрибут «${field.label}»: значение с кодом «${value}» не найдено.`)
          value = target.id
        }
        if (value && field.type === 'color') {
          const target = colors.get(lower(value))
          if (!target || target.deleted) throw new ExchangeError('NSI_IMP_COLOR_NOT_FOUND', `Цвет с кодом «${value}» не найден.`)
          value = target.id
        }
        entry.values[field.key] = value
      } catch (error) {
        errors.push(issue(error, row.location, entry.dictionaryId, String(entry.values.code)))
      }
    }
  }
  workspace.entries = [...workspace.entries, ...pending.map(({ entry }) => entry)]
  const validationIndex = referenceValidationIndex(workspace)
  for (const { row, entry } of pending) {
    const definition = referenceDefinition(entry.dictionaryId)!
    const validation = validateReferenceValues(entry.dictionaryId, entry.values, workspace, entry.id, validationIndex)
    for (const field of definition.fields) {
      if (field.type === 'reference' && field.key !== 'parent_id' && validationIndex.entries.get(String(entry.values[field.key]))?.values.is_group) validation[field.key] = 'Выберите значение внутри группы.'
    }
    for (const [field, message] of Object.entries(validation)) {
      const code = field === 'valid_to' ? 'NSI_IMP_PERIOD'
        : field === 'parent_id' && message.includes('Циклическая') ? 'NSI_IMP_PARENT_CYCLE'
          : message.includes('обязательное') ? (wireField(definition, field).startsWith('attr.') ? 'NSI_IMP_REQUIRED_ATTRIBUTE' : 'NSI_IMP_REQUIRED_FIELD') : 'NSI_IMP_CONSTRAINT'
      const label = definition.fields.find(item => item.key === field)?.label ?? field
      errors.push({ code, message: `«${label}». ${message}`, location: row.location, dictionary: entry.dictionaryId, item: String(entry.values.code) })
    }
    count(entry.dictionaryId, 'added')
  }
  if (errors.length) throw new InvalidPackage({ rows: [], errors })
  const occurredAt = new Date().toISOString()
  for (const { entry } of pending) workspace.changes.push({
    id: crypto.randomUUID(), dictionaryId: entry.dictionaryId, entryId: entry.id, operation: 'created',
    actor, occurredAt, before: null, after: entry,
  })
  const result: ImportResult = { rows: [...stats.values()], errors: [] }
  return {
    result,
    activities: [
      ...newColors.map(color => ({ action: 'NSI_COLOR_CREATE', label: color.name, before: null, after: color })),
      ...pending.map(({ entry }) => ({ action: 'NSI_ITEM_CREATE', label: `${entry.dictionaryId} · ${entry.values.code}` })),
      { action: 'NSI_IMPORT', label: `${filename} · добавлено ${result.rows.reduce((sum, row) => sum + row.added, 0)}` },
    ],
  }
}

function issue(error: unknown, location: string, dictionary?: string, item?: string): ImportIssue {
  return {
    code: error instanceof ExchangeError ? error.code : 'NSI_IMP_CONSTRAINT',
    message: error instanceof Error ? error.message : 'Не удалось проверить значение.',
    location: (error instanceof ExchangeError && error.location) || location,
    dictionary, item,
  }
}

let importing = false

export async function importReferences(file: File, fallback: string | undefined, persona: UserPersona): Promise<{ result: ImportResult; workspace?: ReferenceWorkspace }> {
  try { await referenceDataRepository.requirePermission(exchangePermission, persona) }
  catch { return { result: { rows: [], errors: [{ code: 'ACCESS_DENIED', location: file.name, message: 'Недостаточно прав для выполнения операции.' }] } } }
  const busy = () => ({ result: { rows: [], errors: [{ code: 'NSI_IMP_BUSY', location: file.name, message: 'Загружается другой пакет справочников. Повторите позже.' }] } })
  if (importing) return busy()
  importing = true
  try {
    if (navigator.locks) return await navigator.locks.request('kapgeo-reference-import', { ifAvailable: true }, lock => lock ? importPackage(file, fallback, persona) : busy())
    return await importPackage(file, fallback, persona)
  } finally {
    importing = false
  }
}

async function importPackage(file: File, fallback: string | undefined, persona: UserPersona) {
  try {
    const data = await readReferencePackage(file, fallback)
    let result: ImportResult = { rows: [], errors: [] }
    const workspace = await referenceDataRepository.changeWorkspace(exchangePermission, null, persona, current => {
      const applied = applyPackage(data, current, persona.name, file.name)
      result = applied.result
      current.lastImport = { filename: file.name, result }
      return applied.activities
    })
    return { result, workspace }
  } catch (error) {
    const result = error instanceof InvalidPackage ? error.result : { rows: [], errors: [
      error instanceof ExchangeError ? issue(error, file.name) : { code: 'NSI_IMP_SAVE_FAILED', location: file.name, message: 'Загрузка прервана. Ни одно значение не добавлено.' },
    ] }
    const workspace = await referenceDataRepository.changeWorkspace(exchangePermission, null, persona, current => {
      current.lastImport = { filename: file.name, result }
      return [{ action: 'NSI_IMPORT', label: `${file.name} · ошибок: ${result.errors.length}` }]
    }).catch(() => undefined)
    return { result, workspace }
  }
}
