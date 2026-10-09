import type {
  ConditionSet,
  CreateDepositInput,
  Deposit,
  DepositOccurrence,
  GeologicalLens,
  GeologicalMasterData,
  GeologicalSite,
  UpdateDepositPatch,
} from '../../entities/geology-master/model/types'
import type { Well } from '../../entities/well/model/types'
import { buildConditionLimits } from '../../entities/geology-master/model/types'
import { DemoDatabase, demoDatabase, type DemoRecord } from './demoDatabase'

const seedTimestamp = '2026-08-24T00:00:00.000Z'
const seedMarkerKey = 'geologyMasterSeeded'

const seededConditionLimits = buildConditionLimits('', {
  'section-top': '-420',
  'filter-top-addition': '2',
  'filter-bottom-addition': '6',
  'filter-top-percent': '20',
  'filter-bottom-percent': '20',
  'section-bottom': '-570',
  'uranium-cutoff': '0.012',
  'effective-thickness-addition': '2',
  'gamma-barren': '100',
  'resistivity-impermeable': '24',
  'rare-earth-core': '0',
  'max-waste-thickness': '5',
  'max-ore-thickness': '15',
  'min-zenith-angle': '4',
  'min-barren-thickness': '0.3',
  'min-impermeable-thickness': '0.3',
  'min-industrial-linear-reserve': '0.12',
  'min-core-recovery': '30',
  'min-area-ore-factor': '0.75',
  'min-linear-reserve': '0.08',
  'min-balanced-well-content': '0.0795',
  'min-balanced-intersection-content': '0.001',
  'min-offbalance-well-content': '0.0195',
  'data-start-year': '1960',
  'well-files-folder': 'Не задана',
  'rock-density': '1730',
  'true-azimuth-correction': '10',
  'magnetic-azimuth-correction': '5',
})

const seed: GeologicalMasterData = {
  deposits: [
    {
      id: 'DEP-SARYTAU', code: 1, objectType: 'field', nameRu: 'Сарытау', nameKk: 'Сарытау', nameEn: 'Sarytau',
      descriptionRu: 'Урановое месторождение Сарытау.', descriptionKk: 'Сарытау уран кен орны.', descriptionEn: 'Sarytau uranium deposit.',
      coordinateSystem: 'WGS 84 / UTM zone 42N (EPSG:32642)', isHidden: false,
      occurrences: [
        { id: 'OCC-SARYTAU-01', type: 'Рудная залежь', nameRu: 'PR-07', nameKk: 'PR-07', nameEn: 'PR-07' },
        { id: 'OCC-SARYTAU-02', type: 'Рудная залежь', nameRu: 'CN-02', nameKk: 'CN-02', nameEn: 'CN-02' },
      ],
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
  sites: [
    { id: 'SITE-NORTH', depositId: 'DEP-SARYTAU', code: 'NORTH', name: 'Северный', status: 'active', },
    { id: 'SITE-CENTRAL', depositId: 'DEP-SARYTAU', code: 'CENTRAL', name: 'Центральный', status: 'active', },
  ],
  lenses: [
    { id: 'LENS-PR07', siteId: 'SITE-NORTH', code: 'PR-07', name: 'Залежь PR-07', status: 'active', },
    { id: 'LENS-CN02', siteId: 'SITE-CENTRAL', code: 'CN-02', name: 'Залежь CN-02', status: 'active', },
  ],
  conditionSets: [{ id: 'CONDITIONS-DEP-SARYTAU', depositId: 'DEP-SARYTAU', density: 2.71, balanceThreshold: 1.2, offBalanceThreshold: 0.6, azimuthCorrection: 0, geometryTolerance: 0.25, limits: seededConditionLimits }],
}

type MasterKind = 'deposit' | 'site' | 'lens' | 'condition-set'
type LegacyConditionSet = Partial<ConditionSet> & { id: string; siteId?: string; status?: string }

function record<T>(kind: MasterKind, value: T & { id: string }, status = 'active'): DemoRecord<T> {
  return {
    id: `${kind}:${value.id}`,
    entityType: kind,
    objectId: value.id,
    scopeId: kind === 'deposit' ? value.id : kind === 'condition-set' || kind === 'site' ? (value as unknown as { depositId: string }).depositId : 'DEP-SARYTAU',
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

function validateDepositValues(value: Pick<Deposit, 'nameRu' | 'nameKk' | 'nameEn' | 'objectType' | 'customType' | 'occurrences'>): void {
  if (!value.nameRu.trim()) throw new Error('Укажите название месторождения на русском языке.')
  if (!value.nameKk.trim()) throw new Error('Укажите название месторождения на казахском языке.')
  if (!value.nameEn.trim()) throw new Error('Укажите название месторождения на английском языке.')
  if (value.objectType === 'custom' && !value.customType?.trim()) throw new Error('Для пользовательского типа укажите его наименование.')
  const keys = new Set<string>()
  for (const occurrence of value.occurrences) {
    if (!occurrence.type.trim() || !occurrence.nameRu.trim() || !occurrence.nameKk.trim() || !occurrence.nameEn.trim()) throw new Error('Для каждой залежи укажите тип и названия на трёх языках.')
    const key = `${occurrence.type.trim().toLocaleLowerCase('ru')}::${occurrence.nameRu.trim().toLocaleLowerCase('ru')}`
    if (keys.has(key)) throw new Error('Список залежей содержит дубликат типа и названия.')
    keys.add(key)
  }
}

function migrateConditionLimits(condition: LegacyConditionSet) {
  const seededMatch = seed.conditionSets.find((item) => item.id === condition.id || condition.id === 'CONDITIONS-NORTH-2026')
  if (seededMatch?.limits) return seededMatch.limits.map((item) => ({ ...item }))
  return buildConditionLimits('', {
    'uranium-cutoff': String(condition.balanceThreshold ?? ''),
    'rock-density': (condition.density ?? 0) > 0 ? String(condition.density! < 100 ? condition.density! * 1000 : condition.density) : '',
    'true-azimuth-correction': String(condition.azimuthCorrection ?? ''),
  })
}

function normalizeConditionSet(source: LegacyConditionSet, depositId: string): ConditionSet {
  const limits = source.limits?.length ? source.limits : migrateConditionLimits(source)
  return {
    id: `CONDITIONS-${depositId}`,
    depositId,
    density: source.density ?? 0,
    balanceThreshold: source.balanceThreshold ?? 0,
    offBalanceThreshold: source.offBalanceThreshold ?? 0,
    azimuthCorrection: source.azimuthCorrection ?? 0,
    geometryTolerance: source.geometryTolerance ?? 0,
    limits: buildConditionLimits('', Object.fromEntries(limits.map((limit) => [limit.id, limit.value]))),
  }
}

export class DemoGeologyMasterRepository {
  constructor(private readonly database: DemoDatabase = demoDatabase) {}

  async getMasterData(): Promise<GeologicalMasterData> {
    const records = await this.database.getAll<DemoRecord<unknown>>('records')
    const depositRecords = records.filter((item) => item.entityType === 'deposit')
    const rawDeposits = depositRecords.map((item) => item.data as LegacyDeposit)
    if (rawDeposits.length === 0) {
      const marker = await this.database.get<{ key: string; value: boolean }>('meta', seedMarkerKey)
      if (!marker?.value) {
        await this.seed()
        return this.getMasterData()
      }
      return {
        deposits: [],
        sites: records.filter((item) => item.entityType === 'site').map((item) => structuredClone(item.data as GeologicalSite)),
        lenses: [],
        conditionSets: [],
      }
    }
    const deposits = rawDeposits
      .map((item, index) => normalizeDeposit(item, item.id === 'DEP-SARYTAU' ? 1 : index + 1))
      .sort((left, right) => left.nameRu.localeCompare(right.nameRu, 'ru') || left.code - right.code)
    const conditionRecords = records.filter((item) => item.entityType === 'condition-set') as DemoRecord<LegacyConditionSet>[]
    const sites = records.filter((item) => item.entityType === 'site').map((item) => item.data as GeologicalSite)
    // Move legacy site lenses into the deposit list, retaining old well identifiers as aliases.
    const legacyLensRecords = records.filter((item) => item.entityType === 'lens') as DemoRecord<GeologicalLens>[]
    const migratedLenses = legacyLensRecords.filter(({ data }) => {
      const deposit = deposits.find((item) => item.id === sites.find((site) => site.id === data.siteId)?.depositId)
      if (!deposit) return false
      const existing = deposit.occurrences.find((item) => item.id === data.id || item.legacyIds?.includes(data.id)
        || item.nameRu.trim().toLocaleLowerCase('ru') === data.code.trim().toLocaleLowerCase('ru'))
      if (existing) existing.legacyIds = [...new Set([...(existing.legacyIds ?? []), data.id])]
      else deposit.occurrences.push({ id: data.id, type: 'Рудная залежь', nameRu: data.name, nameKk: data.name, nameEn: data.name, status: data.status })
      return true
    })
    // Prefer an existing deposit set, then the most recently edited legacy set.
    // Retain all replaced source records in meta so consolidation is recoverable.
    const conditionSets = deposits.flatMap((deposit) => {
      const candidates = conditionRecords.filter(({ data }) => (data.depositId ?? sites.find((site) => site.id === data.siteId)?.depositId) === deposit.id)
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
    const marker = await this.database.get<{ key: string; value: boolean }>('meta', seedMarkerKey)
    if (needsMigration || needsConditionMigration || migratedLenses.length || !marker?.value) {
      await this.database.transaction(['records', 'meta'], async (transaction) => {
        for (const deposit of deposits) await transaction.put('records', record('deposit', deposit, deposit.status))
        for (const previous of migratedLenses) {
          await transaction.put('meta', { key: `legacy-lens:${previous.id}`, value: previous })
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
        await transaction.put('meta', { key: seedMarkerKey, value: true })
      })
    }
    return {
      deposits: deposits.map((item) => structuredClone(item)),
      sites: records.filter((item) => item.entityType === 'site').map((item) => structuredClone(item.data as GeologicalSite)),
      lenses: [],
      conditionSets: conditionSets.map((item) => structuredClone(item)),
    }
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
    await this.database.transaction(['records', 'auditEvents'], async (transaction) => {
      await transaction.put('records', record('deposit', deposit, deposit.status))

      await transaction.put('auditEvents', this.audit('deposit.created', deposit.id, 'Создано месторождение в БГД.'))
    })
    return structuredClone(deposit)
  }

  async updateDeposit(current: Deposit, patch: UpdateDepositPatch): Promise<Deposit> {
    const latest = await this.requireDeposit(current.id)

    if (latest.status === 'archived') throw new Error('ARCHIVED_READ_ONLY: архивное месторождение доступно только для чтения.')
    const occurrences = (patch.occurrences ?? latest.occurrences).map((item, index) => normalizeOccurrence(item, latest.code, index))
    const removed = latest.occurrences.filter((item) => !occurrences.some((next) => next.id === item.id))
    if (removed.length) {
      const ids = new Set(removed.flatMap((item) => [item.id, ...(item.legacyIds ?? [])]))
      const wells = await this.database.getAll<DemoRecord<Well>>('records')
      if (wells.some((item) => item.entityType === 'well' && (item.data.bgd?.depositId ?? 'DEP-SARYTAU') === latest.id && ids.has(item.data.bgd?.lensId ?? ''))) {
        throw new Error('Залежь используется скважинами. Измените их привязку перед удалением.')
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
    validateDepositValues(next)
    await this.persistDeposit('deposit', next, 'deposit.updated', 'Изменены сведения месторождения в БГД.')
    return structuredClone(next)
  }

  async deleteDeposit(current: Deposit): Promise<void> {
    const latest = await this.requireDeposit(current.id)

    const data = await this.getMasterData()
    const sites = data.sites.filter((site) => site.depositId === latest.id)
    const conditions = data.conditionSets.filter((condition) => condition.depositId === latest.id)
    if (sites.length || conditions.length || latest.occurrences.length) {
      throw new Error(`DEPENDENCY_WARNING: удаление отменено. Связанные данные: участки — ${sites.length}, залежи — ${latest.occurrences.length}, наборы кондиций — ${conditions.length}. Используйте «Скрыть» или сначала перенесите дочерние объекты.`)
    }
    await this.database.transaction(['records', 'auditEvents'], async (transaction) => {

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
    const data = await this.getMasterData()
    const activeSites = data.sites.filter((site) => site.depositId === current.id && site.status === 'active')
    if (activeSites.length > 0) throw new Error(`DEPENDENCY_WARNING: сначала архивируйте или перенесите ${activeSites.length} активных участк(а/ов).`)
    const latest = await this.requireDeposit(current.id)

    const next: Deposit = { ...latest, status: 'archived', updatedAt: new Date().toISOString() }
    await this.persistDeposit('deposit', next, 'deposit.archived', 'Объект переведён в архив без удаления истории.')
    return structuredClone(next)
  }

  async createSite(input: Pick<GeologicalSite, 'depositId' | 'code' | 'name'>): Promise<GeologicalSite> {
    const data = await this.getMasterData()
    const code = input.code.trim().toUpperCase()
    const deposit = await this.requireDeposit(input.depositId)
    if (deposit.status === 'archived') throw new Error('Архивное месторождение доступно только для чтения.')
    if (!code || !input.name.trim()) throw new Error('Укажите код и наименование участка.')
    if (data.sites.some((item) => item.depositId === input.depositId && item.code === code)) throw new Error('Участок с таким immutable code уже существует в месторождении.')
    const site: GeologicalSite = { id: `SITE-${input.depositId}-${code}`, depositId: input.depositId, code, name: input.name.trim(), status: 'active', }
    await this.persistHierarchy('site', site, 'site.created', 'Создан участок месторождения.')
    return structuredClone(site)
  }

  async updateSite(current: GeologicalSite, patch: Pick<GeologicalSite, 'name'>): Promise<GeologicalSite> {
    const latest = await this.requireSite(current.id)

    if (latest.status === 'archived') throw new Error('ARCHIVED_READ_ONLY: архивный участок доступен только для чтения.')
    const deposit = await this.requireDeposit(latest.depositId)
    if (deposit.status === 'archived') throw new Error('Архивное месторождение доступно только для чтения.')
    if (!patch.name.trim()) throw new Error('Укажите наименование участка.')
    const next = { ...latest, name: patch.name.trim(), }
    await this.persistHierarchy('site', next, 'site.updated', 'Изменено наименование участка.')
    return structuredClone(next)
  }

  async deleteSite(current: GeologicalSite): Promise<void> {
    await this.getMasterData()
    const latest = await this.requireSite(current.id)

    const deposit = await this.requireDeposit(latest.depositId)
    if (deposit.status === 'archived') throw new Error('Архивное месторождение доступно только для чтения.')
    await this.database.transaction(['records', 'meta', 'auditEvents'], async (transaction) => {
      await transaction.put('meta', { key: `deleted-site:${latest.id}`, value: latest })
      await transaction.delete('records', `site:${latest.id}`)
      await transaction.put('auditEvents', this.audit('site.deleted', deposit.id, `Удалён участок «${latest.name}».`))
    })
  }

  async saveOccurrence(deposit: Deposit, input: Omit<DepositOccurrence, 'id'> & { id?: string }): Promise<Deposit> {
    const current = await this.requireDeposit(deposit.id)
    if (input.id && !current.occurrences.some((item) => item.id === input.id)) throw new Error('Залежь не найдена.')
    const existing = current.occurrences.find((item) => item.id === input.id)
    const next: DepositOccurrence = { ...existing, ...input, id: existing?.id ?? `OCC-${crypto.randomUUID()}` }
    return this.updateDeposit(current, { ...current, occurrences: existing
      ? current.occurrences.map((item) => item.id === existing.id ? next : item)
      : [...current.occurrences, next] })
  }

  async deleteOccurrence(deposit: Deposit, occurrenceId: string): Promise<Deposit> {
    const current = await this.requireDeposit(deposit.id)
    if (!current.occurrences.some((item) => item.id === occurrenceId)) throw new Error('Залежь не найдена.')
    return this.updateDeposit(current, { ...current, occurrences: current.occurrences.filter((item) => item.id !== occurrenceId) })
  }

  async saveConditionSet(input: Omit<ConditionSet, 'id'>): Promise<ConditionSet> {
    await this.getMasterData()
    await this.requireDeposit(input.depositId)
    // A deterministic key makes saves an upsert: a deposit can never get a second set.
    const next = normalizeConditionSet({ ...input, id: `CONDITIONS-${input.depositId}` }, input.depositId)
    await this.database.put('records', record('condition-set', next))
    return structuredClone(next)
  }

  private async seed(): Promise<void> {
    await this.database.transaction(['records', 'meta'], async (transaction) => {
      for (const deposit of seed.deposits) {
        await transaction.put('records', record('deposit', deposit, deposit.status))

      }
      for (const site of seed.sites) await transaction.put('records', record('site', site, site.status))
      for (const lens of seed.lenses) await transaction.put('records', record('lens', lens, lens.status))
      for (const condition of seed.conditionSets) {
        await transaction.put('records', record('condition-set', condition))
      }
      await transaction.put('meta', { key: seedMarkerKey, value: true })
    })
  }

  private async persistDeposit(kind: 'deposit', value: Deposit, action: string, reason: string): Promise<void> {
    await this.database.transaction(['records', 'auditEvents'], async (transaction) => {
      await transaction.put('records', record(kind, value, value.status))

      await transaction.put('auditEvents', this.audit(action, value.id, reason))
    })
  }

  private async persistHierarchy(kind: 'site', value: GeologicalSite, action: string, reason: string): Promise<void> {
    await this.database.transaction(['records', 'auditEvents'], async (transaction) => {
      await transaction.put('records', record(kind, value, value.status))

      await transaction.put('auditEvents', this.audit(action, value.depositId, reason))
    })
  }

  private async requireSite(id: string): Promise<GeologicalSite> {
    const stored = await this.database.get<DemoRecord<GeologicalSite>>('records', `site:${id}`)
    if (!stored) throw new Error('Участок не найден.')
    return stored.data
  }

  private async requireDeposit(id: string): Promise<Deposit> {
    const stored = await this.database.get<DemoRecord<LegacyDeposit>>('records', `deposit:${id}`)
    if (!stored) throw new Error('Месторождение не найдено.')
    return normalizeDeposit(stored.data, 1)
  }

  private audit(action: string, entityId: string, reason: string, actor = { id: 'PERSON-R1-GEOLOGIST', name: 'Ирина Иванова' }) {
    const occurredAt = new Date().toISOString()
    return { id: `AUD-${action}-${entityId}-${occurredAt}`, eventType: action, entityType: 'other', entityId, actor: { ...actor, type: 'user' }, occurredAt, status: 'accepted', payload: { metadata: { reason } } }
  }
}

export const demoGeologyMasterRepository = new DemoGeologyMasterRepository()
