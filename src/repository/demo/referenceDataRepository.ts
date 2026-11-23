import { referenceDefinitions, referenceDefinition } from '../../entities/reference-data/model/catalog'
import { referenceDate, referenceNameKey, type DictionaryMetadata, type ReferenceActivity, type ReferenceColor, type ReferenceDefinition, type ReferenceEntry, type ReferenceValue, type ReferenceWorkspace, type ReferenceChange } from '../../entities/reference-data/model/types'
import { colorUsage, referenceChildren, referenceDependents, validateReferenceValues } from '../../entities/reference-data/lib/validation'
import type { UserPersona } from '../../entities/session/model/types'
import { hasPermission, type Permission } from '../../shared/auth/permissions'
import { demoDatabase, type DemoRecord } from './demoDatabase'

const key = 'reference-data:standalone-workspace'
const initialColors: ReferenceColor[] = [
  { id: 'COLOR-SAND', code: 'SAND', name: 'Песочный', nameKk: 'Құм түсті', nameEn: 'Sand', hex: '#E9CB85', description: '' },
  { id: 'COLOR-CLAY', code: 'CLAY', name: 'Глинистый', nameKk: 'Саз түсті', nameEn: 'Clay', hex: '#A57863', description: '' },
  { id: 'COLOR-SILT', code: 'SILT', name: 'Серо-зелёный', nameKk: 'Сұр-жасыл', nameEn: 'Gray green', hex: '#809B8A', description: '' },
]
const initialNames: Record<string, readonly (readonly [string, string, string])[]> = {
  deposit_type: [['Пластовое', 'Қабаттық', 'Stratiform'], ['Гидротермальное', 'Гидротермалды', 'Hydrothermal'], ['Осадочное', 'Шөгінді', 'Sedimentary']],
  reff_colour: [['Серый', 'Сұр', 'Gray'], ['Жёлтый', 'Сары', 'Yellow'], ['Бурый', 'Қоңыр', 'Brown']],
  reff_rock_type: [['Пески и песчаники', 'Құмдар мен құмтастар', 'Sands and sandstones'], ['Песок мелкозернистый', 'Ұсақ түйірлі құм', 'Fine-grained sand'], ['Песчаник глинистый', 'Сазды құмтас', 'Clayey sandstone']],
}
export type ReferenceCommand = {
  operation: ReferenceChange['operation']
  dictionaryId: string
  entryId?: string
  values?: Record<string, ReferenceValue>
  active?: boolean
  endDate?: string | null
  expectedVersion: number
  expectedRevision?: number
  expectedSchemaVersion?: number
}

type ReferencePermission = Extract<Permission, `adm.nsi.${string}`>
const itemActions = {
  created: 'NSI_ITEM_CREATE', updated: 'NSI_ITEM_UPDATE', activated: 'NSI_ITEM_ACTIVATE',
  deactivated: 'NSI_ITEM_DEACTIVATE', deleted: 'NSI_ITEM_DELETE',
}

export function dictionaryMetadata(workspace: ReferenceWorkspace, definition: ReferenceDefinition): DictionaryMetadata {
  return workspace.metadata?.[definition.id] ?? {
    name: definition.label,
    nameKk: definition.id === 'reff_rock_type' ? 'Литотиптер анықтамалығы' : '',
    nameEn: definition.id === 'reff_rock_type' ? 'Rock types' : '',
    description: definition.id === 'reff_rock_type' ? 'Литотипы, используемые для описания геологического разреза.' : '',
  }
}

function seededDefaults(definition: ReferenceDefinition, entry: ReferenceEntry) {
  const index = Number(entry.id.match(/-(\d+)$/)?.[1]) || 1
  return {
    code: definition.autoCode ? String(index) : `REF-${index}`,
    valid_from: '2026-01-01',
    sort_order: 0,
    ...(definition.id === 'reff_rock_type' ? {
      is_group: index === 1,
      parent_id: index === 1 ? null : 'DEMO-reff_rock_type-1',
      color_id: index === 1 ? null : index === 2 ? 'COLOR-SAND' : 'COLOR-CLAY',
      st_nak_number: index === 1 ? null : index === 2 ? '01.02' : '01.03',
      description: ['Группа песков и песчаников для описания геологического разреза.', 'Рыхлый песок с преобладанием мелких зёрен.', 'Песчаник с заметной долей глинистого материала.'][index - 1] ?? null,
      ...(index === 3 ? { valid_to: '2026-09-30' } : {}),
    } : {}),
  }
}

function seed(): ReferenceWorkspace {
  const entries: ReferenceEntry[] = referenceDefinitions.flatMap((definition) => [1, 2, 3].map((index) => {
    const active = index !== 3
    const values: Record<string, ReferenceValue> = Object.fromEntries(definition.fields.map((field) => {
      let value: ReferenceValue
      if (field.type === 'reference' || field.type === 'date' || field.type === 'color') value = null
      else if (field.type === 'boolean') value = field.key === 'is_active' ? active : index === 1
      else if (field.type === 'integer') value = index
      else if (field.type === 'number') value = index / 10
      else if (field.type === 'json') value = JSON.stringify({ example: index })
      else if (field.key === 'code') value = `REF-${index}`
      else if (field.key === 'name_kk') value = `Жазба ${index}`
      else if (field.key === 'name_en') value = `Entry ${index}`
      else if (field.key === 'name_ru' || field.key === 'name' || field.key === 'chrono_name' || field.key === 'strat_name' || field.key === 'colortxt') value = `${definition.label} · ${index}`
      else if (field.type === 'textarea') value = `Описание записи ${index}. Не используется в других модулях.`
      else value = `Запись ${index}`
      if (typeof value === 'string' && field.maxLength) value = value.slice(0, field.maxLength)
      return [field.key, value]
    }))
    const names = initialNames[definition.id]?.[index - 1]
    if (names) { values[referenceNameKey(definition)] = names[0]; values.name_kk = names[1]; values.name_en = names[2] }
    if (definition.id === 'reff_grain_fraction') { values.size_from_mm = index / 10; values.size_to_mm = index }
    const prefix = definition.id === 'reff_device' ? 'REF-DEVICE' : definition.id === 'device_type' ? 'REF-DEVICE-TYPE' : definition.id === 'deposit_type' ? 'REF-DEPOSIT' : `DEMO-${definition.id}`
    const entry = { dictionaryId: definition.id, id: `${prefix}-${index}`, values, active, version: 1 }
    Object.assign(values, seededDefaults(definition, entry))
    return entry
  }))
  for (const entry of entries) {
    for (const field of referenceDefinition(entry.dictionaryId)!.fields) {
      if (field.type !== 'reference' || field.reference === entry.dictionaryId) continue
      entry.values[field.key] = entries.find((target) => target.dictionaryId === field.reference && target.active)?.id ?? null
    }
  }
  return { entries, changes: [], version: 1, metadata: {}, colors: structuredClone(initialColors), activity: [] }
}

/** Update only recognized default labels from earlier seeds; keep IDs and user edits. */
function currentLabels(input: ReferenceWorkspace): ReferenceWorkspace {
  const workspace = structuredClone(input)
  const legacy = !workspace.colors
  workspace.colors ??= structuredClone(initialColors)
  workspace.metadata ??= {}
  workspace.activity ??= []
  const defaults = seed()
  const normalizeEntry = (entry: ReferenceEntry | null) => {
    if (!entry) return
    const original = defaults.entries.find(item => item.id === entry.id && item.dictionaryId === entry.dictionaryId)
    const index = Number(entry.id.match(/-(\d+)$/)?.[1])
    const definition = referenceDefinition(entry.dictionaryId)!
    if (legacy) {
      const defaults: Record<string, ReferenceValue> = original ? seededDefaults(definition, entry) : { code: definition.autoCode ? String(index || entry.version) : entry.id, sort_order: 0, valid_from: '2026-01-01' }
      for (const [field, value] of Object.entries(defaults)) {
        if (!(field in entry.values) || (field === 'parent_id' && definition.id === 'reff_rock_type' && entry.version === 1 && entry.values[field] === null)) entry.values[field] = value
      }
    }
    if (!original) return
    for (const field of definition.fields) {
      if (field.type === 'reference' || typeof entry.values[field.key] !== 'string') continue
      let legacy: string | undefined
      if (field.type === 'json') legacy = JSON.stringify({ synthetic: true, example: index })
      else if (field.key === 'code') legacy = `DEMO-${index}`
      else if (field.key === 'name_kk') legacy = `Демо жазба ${index}`
      else if (field.key === 'name_en') legacy = `Demo entry ${index}`
      else if (['name_ru', 'name', 'chrono_name', 'strat_name', 'colortxt'].includes(field.key)) legacy = `${definition.label} · демо ${index}`
      else if (field.type === 'textarea') legacy = `Вымышленное описание записи ${index}. Не используется в других модулях.`
      else legacy = `Демо ${index}`
      if (field.maxLength) legacy = legacy.slice(0, field.maxLength)
      const generic = field.key === 'name_ru' ? `${definition.label} · ${index}` : field.key === 'name_kk' ? `Жазба ${index}` : field.key === 'name_en' ? `Entry ${index}` : undefined
      if (entry.values[field.key] === legacy || initialNames[definition.id] && entry.values[field.key] === generic) entry.values[field.key] = original.values[field.key]!
    }
  }
  workspace.entries.forEach(normalizeEntry)
  workspace.changes.forEach(change => { normalizeEntry(change.before); normalizeEntry(change.after) })
  return workspace
}

export class ReferenceDataRepository {
  async get(): Promise<ReferenceWorkspace> {
    return demoDatabase.transaction(['records'], async (transaction) => {
      const current = await transaction.get<DemoRecord<ReferenceWorkspace>>('records', key)
      if (current) return currentLabels(current.data)
      const data = seed()
      await transaction.put('records', { id: key, entityType: 'reference-workspace', objectId: key, scopeId: 'system', status: 'active', updatedAt: '2026-10-01T00:00:00Z', data } satisfies DemoRecord<ReferenceWorkspace>)
      return data
    })
  }

  async execute(command: ReferenceCommand, persona: UserPersona | null) {
    const actor = await this.requirePermission(command.operation === 'deleted' ? 'adm.nsi.delete' : 'adm.nsi.edit', persona)
    const definition = referenceDefinition(command.dictionaryId)
    if (!definition || definition.system) throw new Error('Справочник недоступен для изменения.')
    await this.get()
    return demoDatabase.transaction(['records', 'versions', 'auditEvents'], async (transaction) => {
      const stored = await transaction.get<DemoRecord<ReferenceWorkspace>>('records', key)
      const current = currentLabels(stored!.data)
      const before = current.entries.find((entry) => entry.id === command.entryId && entry.dictionaryId === command.dictionaryId) ?? null
      if (command.expectedSchemaVersion !== undefined && command.expectedSchemaVersion !== definition.schemaVersion) throw new Error('Структура справочника изменилась. Обновите форму.')
      if (command.expectedRevision !== undefined && before?.version !== command.expectedRevision) throw new Error('Значение изменено в другой вкладке. Обновите карточку и повторите изменение.')
      if (command.expectedRevision === undefined && current.version !== command.expectedVersion) throw new Error('Справочники изменены в другой вкладке. Обновите данные и повторите действие.')
      if (command.operation !== 'created' && !before) throw new Error('Элемент справочника не найден.')
      const id = before?.id ?? `REF-${command.dictionaryId}-${current.version + 1}`
      let after: ReferenceEntry | null = null
      if (command.operation !== 'deleted') {
        const values = { ...before?.values, ...command.values }
        if (definition.autoCode && !before) values.code = nextReferenceCode(current, definition.id)
        if (command.operation === 'deactivated') values.valid_to = command.endDate ?? referenceDate()
        if (command.operation === 'activated') values.valid_to = command.endDate ?? null
        if (command.operation === 'deactivated' && before && referenceChildren(current, before).some(item => item.active)) throw new Error('У значения есть действующие подчинённые значения.')
        for (const field of definition.fields) {
          if (values[field.key] === undefined) values[field.key] = field.key === 'valid_from' ? referenceDate() : field.defaultValue ?? null
          if (typeof values[field.key] === 'string') values[field.key] = (values[field.key] as string).trim()
        }
        const active = command.operation === 'activated' ? true : command.operation === 'deactivated' ? false : command.active ?? before?.active ?? true
        if (definition.fields.some(field => field.key === 'is_active')) values.is_active = active
        const errors = validateReferenceValues(command.dictionaryId, values, current, before?.id)
        if (Object.keys(errors).length) throw new Error(Object.entries(errors).map(([field, error]) => `${field}: ${error}`).join('\n'))
        after = { id, dictionaryId: command.dictionaryId, values, active, version: (before?.version ?? 0) + 1 }
      } else {
        if (referenceChildren(current, before!).length) throw new Error('У значения есть подчинённые значения.')
        const related = referenceDependents(current, before!)
        if (related.length) throw new Error(`Значение используется в данных (записей: ${related.length}) и не может быть удалено. Переведите его в недействующие.`)
      }
      const occurredAt = new Date().toISOString()
      const change: ReferenceChange = { id: `REF-CHANGE-${current.version + 1}`, dictionaryId: command.dictionaryId, entryId: id, operation: command.operation, actor: actor.name, occurredAt, before, after }
      const next = { ...current, entries: [...current.entries.filter((entry) => entry.id !== id), ...(after ? [after] : [])], changes: [...current.changes, change], version: current.version + 1 }
      await transaction.put('records', { ...stored!, data: next, updatedAt: occurredAt })
      await transaction.put('versions', { id: `REFERENCE-V${next.version}`, objectId: key, version: next.version, status: 'accepted', createdAt: occurredAt, data: next })
      await transaction.put('auditEvents', { id: change.id, eventType: itemActions[command.operation], entityType: 'reference-entry', entityId: id, actor: { id: actor.id, type: 'user', name: actor.name }, occurredAt, status: 'accepted', payload: { metadata: { synthetic: true, dictionaryId: command.dictionaryId }, before, after } })
      return next
    })
  }

  async updateDictionary(dictionaryId: string, metadata: DictionaryMetadata, expectedVersion: number, persona: UserPersona | null) {
    return this.changeWorkspace('adm.nsi.edit', expectedVersion, persona, workspace => {
      const definition = referenceDefinition(dictionaryId)
      if (!definition || definition.system) throw new Error('Справочник недоступен для изменения.')
      const after = validateMetadata(metadata)
      if (referenceDefinitions.some(item => item.id !== dictionaryId && dictionaryMetadata(workspace, item).name.toLocaleLowerCase('ru') === after.name.toLocaleLowerCase('ru'))) throw new Error('Справочник с таким наименованием уже существует.')
      const before = dictionaryMetadata(workspace, definition)
      workspace.metadata = { ...workspace.metadata, [dictionaryId]: after }
      return [{ action: 'NSI_TYPE_UPDATE', label: after.name, before, after }]
    })
  }

  async saveColor(draft: ReferenceColor, expectedVersion: number, persona: UserPersona | null) {
    return this.changeWorkspace('adm.nsi.edit', expectedVersion, persona, workspace => {
      const before = workspace.colors?.find(color => color.id === draft.id && !color.deleted)
      if (draft.id && !before) throw new Error('Цвет не найден.')
      const after = validatedColor(draft, before?.id ?? crypto.randomUUID(), before?.code)
      if (!before && workspace.colors?.some(color => color.code.toLowerCase() === after.code.toLowerCase())) throw new Error('Цвет с таким кодом уже существует.')
      workspace.colors = [...(workspace.colors ?? []).filter(color => color.id !== after.id), after]
      return [{ action: before ? 'NSI_COLOR_UPDATE' : 'NSI_COLOR_CREATE', label: after.name, before, after }]
    })
  }

  async deleteColor(colorId: string, expectedVersion: number, persona: UserPersona | null) {
    return this.changeWorkspace('adm.nsi.delete', expectedVersion, persona, workspace => {
      const before = workspace.colors?.find(color => color.id === colorId && !color.deleted)
      if (!before) throw new Error('Цвет не найден.')
      if (colorUsage(workspace, colorId)) throw new Error('Цвет используется. Удаление невозможно.')
      const after = { ...before, deleted: true }
      workspace.colors = workspace.colors?.map(color => color.id === colorId ? after : color)
      return [{ action: 'NSI_COLOR_DELETE', label: before.name, before, after }]
    })
  }

  async requirePermission(permission: ReferencePermission, persona: UserPersona | null) {
    if (persona && hasPermission(persona, permission)) return persona
    if (persona) {
      await this.get()
      await demoDatabase.transaction(['records', 'auditEvents'], async transaction => {
        const stored = (await transaction.get<DemoRecord<ReferenceWorkspace>>('records', key))!
        const activity: ReferenceActivity = { id: crypto.randomUUID(), action: 'ACCESS_DENIED', label: permission, actor: persona.name, occurredAt: new Date().toISOString() }
        await transaction.put('records', { ...stored, data: { ...stored.data, activity: [...(stored.data.activity ?? []), activity] } })
        await transaction.put('auditEvents', { id: activity.id, eventType: activity.action, entityType: 'reference-workspace', entityId: key, actor: { id: persona.id, type: 'user', name: persona.name }, occurredAt: activity.occurredAt, status: 'rejected', payload: { metadata: { synthetic: true, permission } } })
      }).catch(() => undefined)
    }
    throw new Error('Недостаточно прав для выполнения операции.')
  }

  async changeWorkspace(permission: ReferencePermission, expectedVersion: number | null, persona: UserPersona | null, change: (workspace: ReferenceWorkspace) => Omit<ReferenceActivity, 'id' | 'actor' | 'occurredAt'>[]) {
    const actor = await this.requirePermission(permission, persona)
    await this.get()
    return demoDatabase.transaction(['records', 'auditEvents'], async transaction => {
      const stored = (await transaction.get<DemoRecord<ReferenceWorkspace>>('records', key))!
      const workspace = currentLabels(stored.data)
      if (expectedVersion !== null && expectedVersion !== workspace.version) throw new Error('Данные изменены в другой вкладке. Обновите раздел и повторите действие.')
      const activities = change(workspace)
      const occurredAt = new Date().toISOString()
      const events = activities.map(activity => ({ ...activity, id: crypto.randomUUID(), actor: actor.name, occurredAt }))
      workspace.version += 1
      workspace.activity = [...(workspace.activity ?? []), ...events]
      await transaction.put('records', { ...stored, data: workspace, updatedAt: occurredAt })
      for (const event of events) {
        await transaction.put('auditEvents', { id: event.id, eventType: event.action, entityType: 'reference-workspace', entityId: key, actor: { id: actor.id, type: 'user', name: actor.name }, occurredAt, status: 'accepted', payload: { metadata: { synthetic: true, label: event.label }, before: event.before, after: event.after } })
      }
      return workspace
    })
  }
}

export function nextReferenceCode(workspace: ReferenceWorkspace, dictionaryId: string) {
  const entries = [...workspace.entries, ...workspace.changes.flatMap(change => change.before ? [change.before] : [])]
  const maximum = entries.reduce((max, entry) => {
    const code = Number(entry.values.code)
    return entry.dictionaryId === dictionaryId && Number.isSafeInteger(code) ? Math.max(max, code) : max
  }, 0)
  return String(maximum + 1)
}

function validateMetadata(draft: DictionaryMetadata): DictionaryMetadata {
  const metadata = { name: draft.name.trim(), nameKk: draft.nameKk.trim(), nameEn: draft.nameEn.trim(), description: draft.description.trim() }
  if (!metadata.name) throw new Error('Заполните наименование на русском языке.')
  if ([metadata.name, metadata.nameKk, metadata.nameEn].some(name => name.length > 255) || metadata.description.length > 2000) throw new Error('Проверьте длину наименований и описания.')
  return metadata
}

export function validatedColor(draft: ReferenceColor, id: string, originalCode?: string): ReferenceColor {
  const code = originalCode ?? draft.code.trim()
  if (!code || code.length > 255) throw new Error('Введите код цвета длиной до 255 символов.')
  if (!/^#[0-9a-f]{6}$/i.test(draft.hex)) throw new Error('Введите цвет в формате #RRGGBB.')
  return { ...validateMetadata(draft), id, code, hex: draft.hex.toUpperCase() }
}

export const referenceDataRepository = new ReferenceDataRepository()
export { referenceDefinitions }
