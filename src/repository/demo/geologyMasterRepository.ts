import type {
  ConditionSet,
  CreateDepositInput,
  Deposit,
  DepositOccurrence,
  GeologicalMasterData,
  MasterStatus,
  UpdateDepositPatch,
} from '../../entities/geology-master/model/types'
import type { Well } from '../../entities/well/model/types'
import { buildConditionLimits, isValidConditionLimit } from '../../entities/geology-master/model/types'
import { DemoDatabase, demoDatabase, type DemoRecord, type DemoTransaction } from './demoDatabase'

const seedTimestamp = '2026-08-24T00:00:00.000Z'
const seedMarkerKey = 'geologyMasterSeeded'
const structureSeedMarkerKey = 'geologyMasterStructureSeeded'

const sarytauStructure: DepositOccurrence[] = [
  { id: 'SITE-NORTH', type: 'Участок', nameRu: 'Карасай', nameKk: 'Қарасай', nameEn: 'Karasai' },
  { id: 'SITE-CENTRAL', type: 'Участок', nameRu: 'Западный уступ', nameKk: 'Батыс кемері', nameEn: 'Western Bench' },
  { id: 'OCC-SARYTAU-03', type: 'Участок', nameRu: 'Каменный лог', nameKk: 'Тасты сай', nameEn: 'Stony Ravine' },
  { id: 'OCC-SARYTAU-01', legacyIds: ['LENS-PR07'], type: 'Рудная залежь', nameRu: 'КС-14', nameKk: 'КС-14', nameEn: 'KS-14' },
  { id: 'OCC-SARYTAU-02', legacyIds: ['LENS-CN02'], type: 'Рудная залежь', nameRu: 'ЗУ-21', nameKk: 'ЗУ-21', nameEn: 'ZB-21' },
  { id: 'OCC-SARYTAU-04', type: 'Рудная залежь', nameRu: 'КЛ-05', nameKk: 'КЛ-05', nameEn: 'SR-05' },
]

const oldSarytauNames = new Map([
  ['SITE-NORTH', 'Северный'],
  ['SITE-CENTRAL', 'Центральный'],
  ['OCC-SARYTAU-01', 'PR-07'],
  ['OCC-SARYTAU-02', 'CN-02'],
])

const seededOptionalConditionValues: Record<string, string> = {
  'section-top': '-420',
  'filter-top-addition': '2',
  'filter-bottom-addition': '6',
  'filter-top-percent': '20',
  'filter-bottom-percent': '20',
  'section-bottom': '-570',
  'effective-thickness-addition': '2',
  'gamma-barren': '100',
  'resistivity-impermeable': '24',
  'rare-earth-core': '0',
  'max-ore-thickness': '15',
  'min-zenith-angle': '4',
  'min-barren-thickness': '0.3',
  'min-impermeable-thickness': '0.3',
  'min-industrial-linear-reserve': '0.12',
  'min-core-recovery': '30',
  'min-linear-reserve': '0.08',
  'min-balanced-well-content': '0.0795',
  'min-balanced-intersection-content': '0.001',
  'min-offbalance-well-content': '0.0195',
  'data-start-year': '1960',
  'well-files-folder': 'Не задана',
  'rock-density': '1730',
  'true-azimuth-correction': '10',
  'magnetic-azimuth-correction': '5',
}

const seededConditionLimits = buildConditionLimits().map((limit) => ({
  ...limit,
  value: seededOptionalConditionValues[limit.id] ?? limit.value,
}))

const seed: GeologicalMasterData = {
  deposits: [
    {
      id: 'DEP-SARYTAU', code: 1, objectType: 'field', nameRu: 'Сарытау', nameKk: 'Сарытау', nameEn: 'Sarytau',
      descriptionRu: 'Урановое месторождение Сарытау.', descriptionKk: 'Сарытау уран кен орны.', descriptionEn: 'Sarytau uranium deposit.',
      coordinateSystem: 'WGS 84 / UTM zone 42N (EPSG:32642)', isHidden: false,
      occurrences: sarytauStructure,
      status: 'active', createdAt: seedTimestamp, createdBy: 'Ирина Иванова', updatedAt: seedTimestamp, updatedBy: 'Ирина Иванова',
    },
    {
      id: 'DEP-SEVERNOE', code: 2, objectType: 'field', nameRu: 'Северное', nameKk: 'Солтүстік', nameEn: 'Severnoye',
      descriptionRu: 'Месторождение северного производственного контура.', descriptionKk: 'Солтүстік өндірістік контурдың кен орны.', descriptionEn: 'Deposit of the northern production area.',
      coordinateSystem: 'Локальная система координат Северного участка', isHidden: false, occurrences: [],
      status: 'active', createdAt: seedTimestamp, createdBy: 'Ирина Иванова', updatedAt: seedTimestamp, updatedBy: 'Ирина Иванова',
    },
    {
      id: 'DEP-VOSTOCHNAYA', code: 4, objectType: 'area', nameRu: 'Восточная', nameKk: 'Шығыс', nameEn: 'Vostochnaya',
      descriptionRu: 'Восточная геологоразведочная площадь.', descriptionKk: 'Шығыс геологиялық барлау алаңы.', descriptionEn: 'Eastern exploration area.',
      coordinateSystem: 'WGS 84 / UTM zone 42N (EPSG:32642)', isHidden: true, occurrences: [], status: 'active',
      createdAt: seedTimestamp, createdBy: 'Ирина Иванова', updatedAt: seedTimestamp, updatedBy: 'Ирина Иванова',
    },
  ],
  conditionSets: [{ id: 'CONDITIONS-DEP-SARYTAU', depositId: 'DEP-SARYTAU', density: 2.71, balanceThreshold: 1.2, offBalanceThreshold: 0.6, azimuthCorrection: 0, geometryTolerance: 0.25, limits: seededConditionLimits }],
}

type MasterKind = 'deposit' | 'condition-set'
type LegacyConditionSet = Partial<ConditionSet> & { id: string; siteId?: string; status?: string }
type LegacySite = { id: string; depositId: string; code: string; name: string; status: MasterStatus }
type LegacyLens = { id: string; siteId: string; code: string; name: string; status: MasterStatus }

function record<T>(kind: MasterKind, value: T & { id: string }, status = 'active'): DemoRecord<T> {
  return {
    id: `${kind}:${value.id}`,
    entityType: kind,
    objectId: value.id,
    scopeId: kind === 'deposit' ? value.id : (value as unknown as { depositId: string }).depositId,
    status,
    updatedAt: new Date().toISOString(),
    data: structuredClone(value),
  }
}

type LegacyOccurrence = Partial<DepositOccurrence> & { name?: string }
type LegacyDeposit = Partial<Deposit> & {
  numericId?: number
  code?: number | string
  name?: string
  description?: string
  crs?: string
  coordinateSystemDescription?: string
}

function normalizeOccurrence(value: LegacyOccurrence, code: number, index: number): DepositOccurrence {
  const fallbackName = String(value.name ?? '').trim()
  return {
    id: value.id || `OCC-${code}-${String(index + 1).padStart(2, '0')}`,
    legacyIds: value.legacyIds?.filter((id) => typeof id === 'string'),
    status: value.status,
    type: String(value.type ?? '').trim(),
    nameRu: String(value.nameRu ?? fallbackName).trim(),
    nameKk: String(value.nameKk ?? fallbackName).trim(),
    nameEn: String(value.nameEn ?? fallbackName).trim(),
  }
}

function normalizeDeposit(value: LegacyDeposit, fallbackCode: number): Deposit {
  const legacyCode = typeof value.code === 'number' ? value.code : Number(value.numericId)
  const code = Number.isInteger(legacyCode) && legacyCode > 0 ? legacyCode : fallbackCode
  const legacyName = String(value.name ?? '').trim()
  const legacyDescription = String(value.description ?? '').trim()
  return {
    id: value.id ?? `DEP-${code}`,
    code,
    objectType: value.objectType ?? 'field',
    customType: value.customType?.trim() || undefined,
    nameRu: String(value.nameRu ?? (legacyName || `Месторождение ${code}`)).trim(),
    nameKk: String(value.nameKk ?? (legacyName || `Кен орны ${code}`)).trim(),
    nameEn: String(value.nameEn ?? (legacyName || `Deposit ${code}`)).trim(),
    descriptionRu: String(value.descriptionRu ?? legacyDescription).trim(),
    descriptionKk: String(value.descriptionKk ?? legacyDescription).trim(),
    descriptionEn: String(value.descriptionEn ?? legacyDescription).trim(),
    coordinateSystem: String(value.coordinateSystem ?? value.coordinateSystemDescription ?? value.crs ?? '').trim(),
    isHidden: Boolean(value.isHidden),
    occurrences: (value.occurrences ?? []).map((item, index) => normalizeOccurrence(item, code, index)),
    status: value.status ?? 'active',

    createdAt: value.createdAt ?? seedTimestamp,
    createdBy: value.createdBy ?? 'Ирина Иванова',
    updatedAt: value.updatedAt ?? seedTimestamp,
    updatedBy: value.updatedBy ?? value.createdBy ?? 'Ирина Иванова',
  }
}

function occurrenceKey(item: DepositOccurrence): string {
  return `${item.type.trim().toLocaleLowerCase('ru')}::${item.nameRu.trim().toLocaleLowerCase('ru')}`
}

function refreshStructureExamples(deposit: Deposit): void {
  const examplesById = new Map(sarytauStructure.map((item) => [item.id, item]))
  const occupiedKeys = new Set(deposit.occurrences.map(occurrenceKey))
  deposit.occurrences = deposit.occurrences.map((item) => {
    const example = examplesById.get(item.id)
    const oldName = oldSarytauNames.get(item.id)
    if (!example || !oldName || item.type !== example.type || item.status === 'archived'
      || item.nameRu !== oldName || item.nameKk !== oldName || item.nameEn !== oldName
      || occupiedKeys.has(occurrenceKey(example))) return item
    return { ...item, nameRu: example.nameRu, nameKk: example.nameKk, nameEn: example.nameEn,
      legacyIds: [...new Set([...(item.legacyIds ?? []), ...(example.legacyIds ?? [])])] }
  })
  for (const example of sarytauStructure) {
    if (!oldSarytauNames.has(example.id) && !occupiedKeys.has(occurrenceKey(example))
      && !deposit.occurrences.some((item) => item.id === example.id)) deposit.occurrences.push(example)
  }
  // Keep the examples in the same order as in a fresh demo, followed by added records.
  const exampleOrder = new Map(sarytauStructure.map((item, index) => [item.id, index]))
  deposit.occurrences.sort((left, right) => (exampleOrder.get(left.id) ?? exampleOrder.size) - (exampleOrder.get(right.id) ?? exampleOrder.size))
}

function validateDepositValues(value: Deposit, previous: DepositOccurrence[] = []): void {
  if (!value.nameRu.trim()) throw new Error('Укажите название месторождения на русском языке.')
  if (!value.nameKk.trim()) throw new Error('Укажите название месторождения на казахском языке.')
  if (!value.nameEn.trim()) throw new Error('Укажите название месторождения на английском языке.')
  if (value.objectType === 'custom' && !value.customType?.trim()) throw new Error('Для пользовательского типа укажите его наименование.')
  const previousKeys = new Map(previous.map((item) => [item.id, occurrenceKey(item)]))
  const keys = new Set(value.occurrences.filter((item) => previousKeys.get(item.id) === occurrenceKey(item)).map(occurrenceKey))
  for (const item of value.occurrences) {
    if (!item.type.trim() || !item.nameRu.trim() || !item.nameKk.trim() || !item.nameEn.trim()) throw new Error('Для каждого объекта укажите тип и названия на трёх языках.')
    const key = occurrenceKey(item)
    if (previousKeys.get(item.id) === key) continue
    if (keys.has(key)) throw new Error('Объект с таким типом и названием уже есть в списке (дубликат).')
    keys.add(key)
  }
}

function migrateConditionLimits(source: Partial<LegacyConditionSet>) {
  const limits = source.limits ?? []
  if (limits.length) {
    const oldWasteLimit = limits.find((limit) => limit.id === 'max-waste-thickness')
    if (oldWasteLimit && !limits.some((limit) => limit.id === 'max-waste-in-ore-interval')) {
      return [...limits, { ...oldWasteLimit, id: 'max-waste-in-ore-interval' }]
    }
    return limits
  }
  if (source.id === seed.conditionSets[0]?.id || source.id === 'CONDITIONS-NORTH-2026') return seededConditionLimits
  const density = source.density ?? 0
  return [
    { id: 'rock-density', parameter: '', value: density > 0 ? String(density < 100 ? density * 1000 : density) : '' },
    { id: 'true-azimuth-correction', parameter: '', value: String(source.azimuthCorrection ?? '') },
  ]
}

function normalizeConditionSet(source: Partial<LegacyConditionSet>, depositId: string): ConditionSet {
  return {
    id: `CONDITIONS-${depositId}`,
    depositId,
    density: source.density ?? 0,
    balanceThreshold: source.balanceThreshold ?? 0,
    offBalanceThreshold: source.offBalanceThreshold ?? 0,
    azimuthCorrection: source.azimuthCorrection ?? 0,
    geometryTolerance: source.geometryTolerance ?? 0,
    limits: buildConditionLimits(migrateConditionLimits(source).filter(isValidConditionLimit)),
  }
}

function validateConditionLimits(limits: ConditionSet['limits']) {
  if (!buildConditionLimits(limits, false).every(isValidConditionLimit)) {
    throw new Error('Заполните все обязательные кондиционные лимиты допустимыми значениями.')
  }
}

export class DemoGeologyMasterRepository {
  constructor(private readonly database: DemoDatabase = demoDatabase) {}

  async getMasterData(): Promise<GeologicalMasterData> {
    return this.database.transaction(['records', 'meta'], (transaction) => this.readMasterData(transaction))
  }

  private async readMasterData(transaction: DemoTransaction): Promise<GeologicalMasterData> {
    const records = await transaction.getAll<DemoRecord<unknown>>('records')
    const marker = await transaction.get<{ key: string; value: boolean }>('meta', seedMarkerKey)
    const depositRecords = records.filter((item) => item.entityType === 'deposit')
    const rawDeposits = depositRecords.map((item) => item.data as LegacyDeposit)
    if (rawDeposits.length === 0) {
      if (!marker?.value) {
        for (const deposit of seed.deposits) await transaction.put('records', record('deposit', deposit, deposit.status))
        for (const condition of seed.conditionSets) await transaction.put('records', record('condition-set', condition))
        await transaction.put('meta', { key: seedMarkerKey, value: true })
        await transaction.put('meta', { key: structureSeedMarkerKey, value: true })
        return this.readMasterData(transaction)
      }
      return { deposits: [], conditionSets: [] }
    }
    const deposits = rawDeposits
      .map((item, index) => normalizeDeposit(item, item.id === 'DEP-SARYTAU' ? 1 : index + 1))
      .sort((left, right) => left.nameRu.localeCompare(right.nameRu, 'ru') || left.code - right.code)
    const conditionRecords = records.filter((item) => item.entityType === 'condition-set') as DemoRecord<LegacyConditionSet>[]
    const depositsById = new Map(deposits.map((item) => [item.id, item]))
    const legacySiteRecords = records.filter((item) => item.entityType === 'site') as DemoRecord<LegacySite>[]
    const depositBySiteId = new Map(deposits.flatMap((deposit) => deposit.occurrences.map((item) => [item.id, deposit] as const)))
    const migratedSites = legacySiteRecords.filter(({ data }) => {
      const deposit = depositsById.get(data.depositId)
      if (!deposit) return false
      depositBySiteId.set(data.id, deposit)
      if (!deposit.occurrences.some((item) => item.id === data.id)) {
        deposit.occurrences.push(normalizeOccurrence({ id: data.id, type: 'Участок', name: data.name || data.code, status: data.status }, deposit.code, deposit.occurrences.length))
      }
      return true
    })
    // Move legacy site lenses into the deposit list, retaining old well identifiers as aliases.
    const legacyLensRecords = records.filter((item) => item.entityType === 'lens') as DemoRecord<LegacyLens>[]
    const migratedLenses = legacyLensRecords.filter(({ data }) => {
      const deposit = depositBySiteId.get(data.siteId)
      if (!deposit) return false
      const existing = deposit.occurrences.find((item) => item.id === data.id || item.legacyIds?.includes(data.id)
        || (item.type === 'Рудная залежь' && item.nameRu.toLocaleLowerCase('ru') === data.code.trim().toLocaleLowerCase('ru')))
      if (existing) existing.legacyIds = [...new Set([...(existing.legacyIds ?? []), data.id])]
      else deposit.occurrences.push({ id: data.id, type: 'Рудная залежь', nameRu: data.name, nameKk: data.name, nameEn: data.name, status: data.status })
      return true
    })
    const structureMarker = await transaction.get<{ key: string; value: boolean }>('meta', structureSeedMarkerKey)
    const sarytau = depositsById.get('DEP-SARYTAU')
    if (!structureMarker?.value && sarytau && sarytau.status !== 'archived') refreshStructureExamples(sarytau)
    // Prefer an existing deposit set, then the most recently edited legacy set.
    // Retain all replaced source records in meta so consolidation is recoverable.
    const conditionSets = deposits.flatMap((deposit) => {
      const candidates = conditionRecords.filter(({ data }) => (data.depositId ?? depositBySiteId.get(data.siteId ?? '')?.id) === deposit.id)
        .sort((left, right) => Number(Boolean(right.data.depositId)) - Number(Boolean(left.data.depositId))
          || right.updatedAt.localeCompare(left.updatedAt)
          || Number(right.data.status === 'draft') - Number(left.data.status === 'draft')
          || left.id.localeCompare(right.id))
      return candidates[0] ? [normalizeConditionSet(candidates[0].data, deposit.id)] : []
    })
    const needsMigration = rawDeposits.some((item) => typeof item.code !== 'number' || !item.nameRu || !item.nameKk || !item.nameEn)
    const needsConditionMigration = conditionRecords.some((item) => {
      const normalized = conditionSets.find((condition) => condition.id === item.data.id)
      return !normalized || JSON.stringify(normalized) !== JSON.stringify(item.data)
    })
    if (needsMigration || migratedSites.length || migratedLenses.length || (!structureMarker?.value && sarytau)) {
      for (const deposit of deposits) await transaction.put('records', record('deposit', deposit, deposit.status))
    }
    for (const previous of [...migratedSites, ...migratedLenses]) {
      const key = `legacy-${previous.entityType}:${previous.id}`
      if (!await transaction.get('meta', key)) await transaction.put('meta', { key, value: previous })
      await transaction.delete('records', previous.id)
    }
    if (needsConditionMigration) {
      for (const previous of conditionRecords) {
        const key = `legacy-condition-set:${previous.id}`
        if (!await transaction.get('meta', key)) await transaction.put('meta', { key, value: previous })
        await transaction.delete('records', previous.id)
      }
      for (const condition of conditionSets) await transaction.put('records', record('condition-set', condition))
    }
    if (!marker?.value) await transaction.put('meta', { key: seedMarkerKey, value: true })
    if (!structureMarker?.value) await transaction.put('meta', { key: structureSeedMarkerKey, value: true })
    return { deposits, conditionSets }
  }

  async createDeposit(input: CreateDepositInput): Promise<Deposit> {
    const data = await this.getMasterData()
    const code = Number(input.code)
    if (!Number.isInteger(code) || code <= 0) throw new Error('Код месторождения должен быть целым положительным числом.')
    if (data.deposits.some((item) => item.code === code)) throw new Error('Месторождение с таким кодом уже существует.')
    const now = new Date().toISOString()
    const occurrences = (input.occurrences ?? []).map((item, index) => normalizeOccurrence(item, code, index))
    const deposit: Deposit = {
      id: `DEP-${code}`,
      code,
      objectType: input.objectType ?? 'field',
      customType: input.customType?.trim() || undefined,
      nameRu: input.nameRu.trim(),
      nameKk: input.nameKk.trim(),
      nameEn: input.nameEn.trim(),
      descriptionRu: input.descriptionRu?.trim() ?? '',
      descriptionKk: input.descriptionKk?.trim() ?? '',
      descriptionEn: input.descriptionEn?.trim() ?? '',
      coordinateSystem: input.coordinateSystem?.trim() ?? '',
      isHidden: input.isHidden ?? false,
      occurrences,
      status: 'active',

      createdAt: now,
      createdBy: 'Ирина Иванова',
      updatedAt: now,
      updatedBy: 'Ирина Иванова',
    }
    validateDepositValues(deposit)
    const limits = input.conditionLimits
    if (limits) validateConditionLimits(limits)
    await this.database.transaction(['records', 'auditEvents'], async (transaction) => {
      if (await transaction.get('records', `deposit:${deposit.id}`)) throw new Error('Месторождение с таким кодом уже существует.')
      await transaction.put('records', record('deposit', deposit, deposit.status))
      if (limits) {
        const condition = normalizeConditionSet({ limits }, deposit.id)
        await transaction.put('records', record('condition-set', condition))
      }

      await transaction.put('auditEvents', this.audit('deposit.created', deposit.id, 'Создано месторождение в БГД.'))
    })
    return structuredClone(deposit)
  }

  async updateDeposit(current: Deposit, patch: UpdateDepositPatch): Promise<Deposit> {
    return this.changeDeposit(current.id, () => patch)
  }

  private async changeDeposit(id: string, getPatch: (latest: Deposit) => UpdateDepositPatch): Promise<Deposit> {
    return this.database.transaction(['records', 'auditEvents'], async (transaction) => {
      const latest = await this.requireDeposit(id, transaction)
      if (latest.status === 'archived') throw new Error('ARCHIVED_READ_ONLY: архивное месторождение доступно только для чтения.')
      return this.applyDepositPatch(latest, getPatch(latest), transaction)
    })
  }

  private async applyDepositPatch(latest: Deposit, patch: UpdateDepositPatch, transaction: DemoTransaction): Promise<Deposit> {
    const occurrences = (patch.occurrences ?? latest.occurrences).map((item, index) => normalizeOccurrence(item, latest.code, index))
    const removed = latest.occurrences.filter((item) => !occurrences.some((next) => next.id === item.id))
    if (removed.length) {
      const ids = new Set(removed.flatMap((item) => [item.id, ...(item.legacyIds ?? [])]))
      const wells = await transaction.getAll<DemoRecord<Well>>('records')
      if (wells.some((item) => item.entityType === 'well' && (item.data.bgd?.depositId ?? 'DEP-SARYTAU') === latest.id && ids.has(item.data.bgd?.lensId ?? ''))) {
        throw new Error('Объект используется скважинами. Измените их привязку перед удалением.')
      }
    }
    const next: Deposit = {
      ...latest,
      ...patch,
      customType: patch.objectType === 'custom' ? patch.customType?.trim() : undefined,
      nameRu: patch.nameRu.trim(),
      nameKk: patch.nameKk.trim(),
      nameEn: patch.nameEn.trim(),
      descriptionRu: patch.descriptionRu.trim(),
      descriptionKk: patch.descriptionKk.trim(),
      descriptionEn: patch.descriptionEn.trim(),
      coordinateSystem: patch.coordinateSystem.trim(),
      occurrences,

      updatedAt: new Date().toISOString(),
      updatedBy: 'Ирина Иванова',
    }
    validateDepositValues(next, latest.occurrences)
    await transaction.put('records', record('deposit', next, next.status))
    await transaction.put('auditEvents', this.audit('deposit.updated', next.id, 'Изменены сведения месторождения в БГД.'))
    return next
  }

  async deleteDeposit(current: Deposit): Promise<void> {
    const data = await this.getMasterData()
    await this.database.transaction(['records', 'auditEvents'], async (transaction) => {
      const latest = await this.requireDeposit(current.id, transaction)
      const conditions = data.conditionSets.filter((condition) => condition.depositId === latest.id)
      if (conditions.length || latest.occurrences.length) {
        throw new Error(`DEPENDENCY_WARNING: удаление отменено. Связанные данные: объекты структуры — ${latest.occurrences.length}, наборы кондиций — ${conditions.length}. Используйте «Скрыть» или сначала удалите связанные объекты.`)
      }
      await transaction.delete('records', `deposit:${latest.id}`)
      await transaction.put('auditEvents', this.audit('deposit.deleted', latest.id, 'Месторождение удалено из БГД после проверки зависимостей.'))
    })
  }

  async recordDepositViewed(depositId: string, actor: { id: string; name: string }): Promise<void> {
    await this.requireDeposit(depositId)
    const recent = await this.database.getAll<{ eventType: string; entityId: string; actor: { id: string }; occurredAt: string }>('auditEvents')
    const alreadyRecorded = recent.some((event) => event.eventType === 'deposit.viewed'
      && event.entityId === depositId
      && event.actor.id === actor.id
      && Date.now() - new Date(event.occurredAt).getTime() < 60_000)
    if (alreadyRecorded) return
    await this.database.put('auditEvents', this.audit('deposit.viewed', depositId, 'Открыта карточка месторождения.', actor))
  }

  async archiveDeposit(current: Deposit): Promise<Deposit> {
    await this.getMasterData()
    const latest = await this.requireDeposit(current.id)
    const activeSites = latest.occurrences.filter((item) => item.type === 'Участок' && item.status !== 'archived')
    if (activeSites.length > 0) throw new Error(`DEPENDENCY_WARNING: сначала архивируйте или перенесите ${activeSites.length} активных участк(а/ов).`)

    const next: Deposit = { ...latest, status: 'archived', updatedAt: new Date().toISOString() }
    await this.persistDeposit('deposit', next, 'deposit.archived', 'Объект переведён в архив без удаления истории.')
    return structuredClone(next)
  }

  async saveOccurrence(deposit: Deposit, input: Omit<DepositOccurrence, 'id'> & { id?: string }): Promise<Deposit> {
    return this.changeDeposit(deposit.id, (current) => {
      const existing = current.occurrences.find((item) => item.id === input.id)
      if (input.id && !existing) throw new Error('Объект не найден.')
      if (existing?.status === 'archived') throw new Error('Архивный объект доступен только для чтения.')
      const next: DepositOccurrence = { ...existing, ...input, id: existing?.id ?? `OCC-${crypto.randomUUID()}` }
      return { ...current, occurrences: existing
        ? current.occurrences.map((item) => item.id === existing.id ? next : item)
        : [...current.occurrences, next] }
    })
  }

  async deleteOccurrence(deposit: Deposit, occurrenceId: string): Promise<Deposit> {
    return this.changeDeposit(deposit.id, (current) => {
      if (!current.occurrences.some((item) => item.id === occurrenceId)) throw new Error('Объект не найден.')
      return { ...current, occurrences: current.occurrences.filter((item) => item.id !== occurrenceId) }
    })
  }

  async saveConditionSet(input: Omit<ConditionSet, 'id'>): Promise<ConditionSet> {
    validateConditionLimits(input.limits)
    await this.getMasterData()
    await this.requireDeposit(input.depositId)
    // A deterministic key makes saves an upsert: a deposit can never get a second set.
    const next = normalizeConditionSet({ ...input, id: `CONDITIONS-${input.depositId}` }, input.depositId)
    await this.database.put('records', record('condition-set', next))
    return structuredClone(next)
  }

  private async persistDeposit(kind: 'deposit', value: Deposit, action: string, reason: string): Promise<void> {
    await this.database.transaction(['records', 'auditEvents'], async (transaction) => {
      await transaction.put('records', record(kind, value, value.status))

      await transaction.put('auditEvents', this.audit(action, value.id, reason))
    })
  }

  private async requireDeposit(id: string, reader: Pick<DemoTransaction, 'get'> = this.database): Promise<Deposit> {
    const stored = await reader.get<DemoRecord<LegacyDeposit>>('records', `deposit:${id}`)
    if (!stored) throw new Error('Месторождение не найдено.')
    return normalizeDeposit(stored.data, 1)
  }

  private audit(action: string, entityId: string, reason: string, actor = { id: 'PERSON-R1-GEOLOGIST', name: 'Ирина Иванова' }) {
    const occurredAt = new Date().toISOString()
    return { id: `AUD-${action}-${entityId}-${occurredAt}`, eventType: action, entityType: 'other', entityId, actor: { ...actor, type: 'user' }, occurredAt, status: 'accepted', payload: { metadata: { reason } } }
  }
}

export const demoGeologyMasterRepository = new DemoGeologyMasterRepository()
