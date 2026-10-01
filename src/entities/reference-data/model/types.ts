export type ReferenceValue = string | number | boolean | null
export type ReferenceField = {
  key: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'integer' | 'boolean' | 'json' | 'reference'
  required?: boolean
  maxLength?: number
  reference?: string
}
export type ReferenceDefinition = {
  id: string
  label: string
  kind: 'ordinary' | 'reff'
  fields: ReferenceField[]
  provisional?: boolean
}
export type ReferenceEntry = {
  id: string
  dictionaryId: string
  active: boolean
  values: Record<string, ReferenceValue>
  version: number
}
export type ReferenceChange = {
  id: string
  dictionaryId: string
  entryId: string
  operation: 'created' | 'updated' | 'activated' | 'deactivated' | 'deleted'
  actor: string
  occurredAt: string
  before: ReferenceEntry | null
  after: ReferenceEntry | null
}
export type ReferenceWorkspace = {
  entries: ReferenceEntry[]
  changes: ReferenceChange[]
  version: number
}
export const referenceEntryLabel = (entry: ReferenceEntry) => String(entry.values.name_ru || entry.values.name || entry.values.chrono_name || entry.values.colortxt || entry.values.code || entry.id)
