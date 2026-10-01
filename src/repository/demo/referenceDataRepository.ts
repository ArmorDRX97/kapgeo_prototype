import { referenceDefinitions, referenceDefinition } from '../../entities/reference-data/model/catalog'
import { type ReferenceEntry, type ReferenceValue, type ReferenceWorkspace, type ReferenceChange } from '../../entities/reference-data/model/types'
import { validateReferenceValues } from '../../entities/reference-data/lib/validation'
import type { UserPersona } from '../../entities/session/model/types'
import { hasPermission } from '../../shared/auth/permissions'
import { demoDatabase, type DemoRecord } from './demoDatabase'

const key = 'reference-data:standalone-workspace'
export type ReferenceCommand = {
  operation: ReferenceChange['operation']
  dictionaryId: string
  entryId?: string
  values?: Record<string, ReferenceValue>
  active?: boolean
  expectedVersion: number
}

function seed(): ReferenceWorkspace {
  const entries: ReferenceEntry[] = referenceDefinitions.flatMap((definition) => [1, 2, 3].map((index) => {
    const active = index !== 3
    const values: Record<string, ReferenceValue> = Object.fromEntries(definition.fields.map((field) => {
      let value: ReferenceValue
      if (field.type === 'reference') value = null
      else if (field.type === 'boolean') value = field.key === 'is_active' ? active : index === 1
      else if (field.type === 'integer') value = index
      else if (field.type === 'number') value = index / 10
      else if (field.type === 'json') value = JSON.stringify({ synthetic: true, example: index })
      else if (field.key === 'code') value = `DEMO-${index}`
      else if (field.key === 'name_kk') value = `Демо жазба ${index}`
      else if (field.key === 'name_en') value = `Demo entry ${index}`
      else if (field.key === 'name_ru' || field.key === 'name' || field.key === 'chrono_name' || field.key === 'strat_name' || field.key === 'colortxt') value = `${definition.label} · демо ${index}`
      else if (field.type === 'textarea') value = `Вымышленное описание записи ${index}. Не используется в других модулях.`
      else value = `Демо ${index}`
      if (typeof value === 'string' && field.maxLength) value = value.slice(0, field.maxLength)
      return [field.key, value]
    }))
    if (definition.id === 'reff_grain_fraction') { values.size_from_mm = index / 10; values.size_to_mm = index }
    const prefix = definition.id === 'reff_device' ? 'REF-DEVICE' : definition.id === 'device_type' ? 'REF-DEVICE-TYPE' : definition.id === 'deposit_type' ? 'REF-DEPOSIT' : `DEMO-${definition.id}`
    return { dictionaryId: definition.id, id: `${prefix}-${index}`, values, active, version: 1 }
  }))
  for (const entry of entries) {
    for (const field of referenceDefinition(entry.dictionaryId)!.fields) {
      if (field.type !== 'reference' || field.reference === entry.dictionaryId) continue
      entry.values[field.key] = entries.find((target) => target.dictionaryId === field.reference && target.active)?.id ?? null
    }
  }
  return { entries, changes: [], version: 1 }
}

export class ReferenceDataRepository {
  async get(): Promise<ReferenceWorkspace> {
    return demoDatabase.transaction(['records'], async (transaction) => {
      const current = await transaction.get<DemoRecord<ReferenceWorkspace>>('records', key)
      if (current) return current.data
      const data = seed()
      await transaction.put('records', { id: key, entityType: 'reference-workspace', objectId: key, scopeId: 'system', status: 'active', updatedAt: '2026-10-01T00:00:00Z', data } satisfies DemoRecord<ReferenceWorkspace>)
      return data
    })
  }

  async execute(command: ReferenceCommand, persona: UserPersona | null) {
    const permission = command.operation === 'created' ? 'administration.references.create' : command.operation === 'deleted' ? 'administration.references.delete' : command.operation === 'updated' ? 'administration.references.update' : 'administration.references.status'
    if (!hasPermission(persona, permission)) throw new Error('Недостаточно прав для изменения справочников.')
    if (!referenceDefinition(command.dictionaryId)) throw new Error('Справочник не найден.')
    await this.get()
    return demoDatabase.transaction(['records', 'versions', 'auditEvents'], async (transaction) => {
      const stored = await transaction.get<DemoRecord<ReferenceWorkspace>>('records', key)
      const current = stored!.data
      if (current.version !== command.expectedVersion) throw new Error('Справочники изменены в другой вкладке. Обновите данные и повторите действие.')
      const before = current.entries.find((entry) => entry.id === command.entryId && entry.dictionaryId === command.dictionaryId) ?? null
      if (command.operation !== 'created' && !before) throw new Error('Элемент справочника не найден.')
      if (command.active !== undefined && command.active !== (before?.active ?? true) && !hasPermission(persona, 'administration.references.status')) throw new Error('Недостаточно прав для изменения статуса.')
      const id = before?.id ?? `REF-${command.dictionaryId}-${current.version + 1}`
      let after: ReferenceEntry | null = null
      if (command.operation !== 'deleted') {
        const values = command.operation === 'created' || command.operation === 'updated' ? { ...command.values } : { ...before!.values }
        for (const field of referenceDefinition(command.dictionaryId)!.fields) if (values[field.key] === undefined) values[field.key] = null
        for (const field of referenceDefinition(command.dictionaryId)!.fields) if (typeof values[field.key] === 'string') values[field.key] = (values[field.key] as string).trim()
        const active = command.operation === 'activated' ? true : command.operation === 'deactivated' ? false : command.active ?? before?.active ?? true
        if (referenceDefinition(command.dictionaryId)!.fields.some((field) => field.key === 'is_active')) values.is_active = active
        const errors = validateReferenceValues(command.dictionaryId, values, current, before?.id)
        if (Object.keys(errors).length) throw new Error(Object.entries(errors).map(([field, error]) => `${field}: ${error}`).join('\n'))
        after = { id, dictionaryId: command.dictionaryId, values, active, version: (before?.version ?? 0) + 1 }
      } else {
        const related = current.entries.filter((entry) => referenceDefinition(entry.dictionaryId)!.fields.some((field) => field.type === 'reference' && field.reference === command.dictionaryId && entry.values[field.key] === id))
        if (related.length) throw new Error('Удаление элемента невозможно, поскольку элемент используется в записях других справочников этого демо-раздела. Деактивируйте его, чтобы сохранить связи.')
      }
      const occurredAt = new Date().toISOString()
      const change: ReferenceChange = { id: `REF-CHANGE-${current.version + 1}`, dictionaryId: command.dictionaryId, entryId: id, operation: command.operation, actor: persona!.name, occurredAt, before, after }
      const next = { entries: [...current.entries.filter((entry) => entry.id !== id), ...(after ? [after] : [])], changes: [...current.changes, change], version: current.version + 1 }
      await transaction.put('records', { ...stored!, data: next, updatedAt: occurredAt })
      await transaction.put('versions', { id: `REFERENCE-V${next.version}`, objectId: key, version: next.version, status: 'accepted', createdAt: occurredAt, data: next })
      await transaction.put('auditEvents', { id: change.id, eventType: `reference.${command.operation}`, entityType: 'reference-entry', entityId: id, actor: { id: persona!.id, type: 'user', name: persona!.name }, occurredAt, status: 'accepted', payload: { metadata: { synthetic: true, dictionaryId: command.dictionaryId }, before, after } })
      return next
    })
  }
}

export const referenceDataRepository = new ReferenceDataRepository()
export { referenceDefinitions }
