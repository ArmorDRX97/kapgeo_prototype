export type ReferenceValue = string | number | boolean | null
export type ReferenceField = {
  key: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'integer' | 'boolean' | 'json' | 'reference' | 'date' | 'color'
  required?: boolean
  maxLength?: number
  reference?: string
  labelKk?: string
  labelEn?: string
  showInList?: boolean
  defaultValue?: ReferenceValue
  min?: number | string
  max?: number | string
  pattern?: string
  unique?: boolean
  internal?: boolean
}
export type ReferenceDefinition = {
  id: string
  label: string
  kind: 'ordinary' | 'reff'
  fields: ReferenceField[]
  provisional?: boolean
  system?: boolean
  hierarchical?: boolean
  autoCode?: boolean
  schemaVersion?: number
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
  metadata?: Record<string, DictionaryMetadata>
  colors?: ReferenceColor[]
  activity?: ReferenceActivity[]
  lastImport?: { filename: string; result: ImportResult }
}

export type ImportIssue = { code: string; location: string; dictionary?: string; item?: string; message: string }
export type ImportResult = { rows: { dictionary: string; added: number; skipped: number }[]; errors: ImportIssue[] }

export type DictionaryMetadata = {
  name: string
  nameKk: string
  nameEn: string
  description: string
}

export type ReferenceColor = DictionaryMetadata & {
  id: string
  code: string
  hex: string
  deleted?: boolean
}

export type ReferenceActivity = {
  id: string
  action: string
  label: string
  actor: string
  occurredAt: string
  before?: DictionaryMetadata | ReferenceColor | null
  after?: DictionaryMetadata | ReferenceColor | null
}

export const referenceEntryLabel = (entry: ReferenceEntry) => String(entry.values.name_ru || entry.values.name || entry.values.chrono_name || entry.values.colortxt || entry.values.code || entry.id)

export function referenceDate(date = new Date()) {
  return new Intl.DateTimeFormat('sv-SE').format(date)
}

export function referenceNameKey(definition: ReferenceDefinition) {
  return definition.fields.find(field => ['name_ru', 'name', 'chrono_name', 'colortxt'].includes(field.key))?.key ?? 'name_ru'
}
