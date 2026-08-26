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
import { DemoDatabase, demoDatabase, type DemoRecord } from './demoDatabase'

const seedTimestamp = '2026-08-24T00:00:00.000Z'
const seedMarkerKey = 'geologyMasterSeeded'

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
      status: 'active', version: 4, createdAt: seedTimestamp, createdBy: 'Ирина Иванова', updatedAt: seedTimestamp, updatedBy: 'Ирина Иванова',
    },
    {
      id: 'DEP-SEVERNOE', code: 2, objectType: 'field', nameRu: 'Северное', nameKk: 'Солтүстік', nameEn: 'Severnoye',
      descriptionRu: 'Месторождение северного производственного контура.', descriptionKk: 'Солтүстік өндірістік контурдың кен орны.', descriptionEn: 'Deposit of the northern production area.',
      coordinateSystem: 'Локальная система координат Северного участка', isHidden: false, occurrences: [],
      status: 'active', version: 1, createdAt: seedTimestamp, createdBy: 'Ирина Иванова', updatedAt: seedTimestamp, updatedBy: 'Ирина Иванова',
    },
    {
      id: 'DEP-VOSTOCHNAYA', code: 4, objectType: 'area', nameRu: 'Восточная', nameKk: 'Шығыс', nameEn: 'Vostochnaya',
      descriptionRu: 'Восточная геологоразведочная площадь.', descriptionKk: 'Шығыс геологиялық барлау алаңы.', descriptionEn: 'Eastern exploration area.',
      coordinateSystem: 'WGS 84 / UTM zone 42N (EPSG:32642)', isHidden: true, occurrences: [], status: 'active', version: 1,
      createdAt: seedTimestamp, createdBy: 'Ирина Иванова', updatedAt: seedTimestamp, updatedBy: 'Ирина Иванова',
    },
  ],
  sites: [
    { id: 'SITE-NORTH', depositId: 'DEP-SARYTAU', code: 'NORTH', name: 'Северный', status: 'active', version: 2 },
    { id: 'SITE-CENTRAL', depositId: 'DEP-SARYTAU', code: 'CENTRAL', name: 'Центральный', status: 'active', version: 1 },
  ],
  lenses: [
    { id: 'LENS-PR07', siteId: 'SITE-NORTH', code: 'PR-07', name: 'Залежь PR-07', status: 'active', version: 3 },
    { id: 'LENS-CN02', siteId: 'SITE-CENTRAL', code: 'CN-02', name: 'Залежь CN-02', status: 'active', version: 1 },
  ],
  conditionSets: [{ id: 'CONDITIONS-NORTH-2026', siteId: 'SITE-NORTH', code: 'COND-NORTH-2026', effectiveFrom: '2026-01-01', density: 2.71, balanceThreshold: 1.2, offBalanceThreshold: 0.6, azimuthCorrection: 0, geometryTolerance: 0.25, status: 'published', version: 3 }],
}

type MasterKind = 'deposit' | 'site' | 'lens' | 'condition-set'
type Versioned = Deposit | ConditionSet
type StoredVersion = { id: string; objectId: string }

function record<T>(kind: MasterKind, value: T & { id: string }, status = 'active'): DemoRecord<T> {
  return {
    id: `${kind}:${value.id}`,
    entityType: kind,
    objectId: value.id,
    scopeId: kind === 'deposit' ? value.id : 'DEP-SARYTAU',
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
    version: Number(value.version ?? 1),
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
        lenses: records.filter((item) => item.entityType === 'lens').map((item) => structuredClone(item.data as GeologicalLens)),
        conditionSets: records.filter((item) => item.entityType === 'condition-set').map((item) => structuredClone(item.data as ConditionSet)),
      }
    }
    const deposits = rawDeposits
      .map((item, index) => normalizeDeposit(item, item.id === 'DEP-SARYTAU' ? 1 : index + 1))
      .sort((left, right) => left.nameRu.localeCompare(right.nameRu, 'ru') || left.code - right.code)
    const needsMigration = rawDeposits.some((item) => typeof item.code !== 'number' || !item.nameRu || !item.nameKk || !item.nameEn)
    const marker = await this.database.get<{ key: string; value: boolean }>('meta', seedMarkerKey)
    if (needsMigration || !marker?.value) {
      await this.database.transaction(['records', 'meta'], async (transaction) => {
        for (const deposit of deposits) await transaction.put('records', record('deposit', deposit, deposit.status))
        await transaction.put('meta', { key: seedMarkerKey, value: true })
      })
    }
    return {
      deposits: deposits.map((item) => structuredClone(item)),
      sites: records.filter((item) => item.entityType === 'site').map((item) => structuredClone(item.data as GeologicalSite)),
      lenses: records.filter((item) => item.entityType === 'lens').map((item) => structuredClone(item.data as GeologicalLens)),
      conditionSets: records.filter((item) => item.entityType === 'condition-set').map((item) => structuredClone(item.data as ConditionSet)),
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
      version: 1,
      createdAt: now,
      createdBy: 'Ирина Иванова',
      updatedAt: now,
      updatedBy: 'Ирина Иванова',
    }
    validateDepositValues(deposit)
    await this.database.transaction(['records', 'versions', 'auditEvents'], async (transaction) => {
      await transaction.put('records', record('deposit', deposit, deposit.status))
      await transaction.put('versions', { id: `VERSION:deposit:${deposit.id}:1`, objectId: deposit.id, version: 1, status: 'draft', createdAt: now, data: deposit })
      await transaction.put('auditEvents', this.audit('deposit.created', deposit.id, 'Создано месторождение в БГД.'))
    })
    return structuredClone(deposit)
  }

  async updateDeposit(current: Deposit, patch: UpdateDepositPatch): Promise<Deposit> {
    const latest = await this.requireDeposit(current.id)
    if (latest.version !== current.version) throw new Error('VERSION_CONFLICT: месторождение изменено в другой вкладке.')
    if (latest.status === 'archived') throw new Error('ARCHIVED_READ_ONLY: архивное месторождение доступно только для чтения.')
    const occurrences = patch.occurrences.map((item, index) => normalizeOccurrence(item, latest.code, index))
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
      version: latest.version + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: 'Ирина Иванова',
    }
    validateDepositValues(next)
    await this.persistVersion('deposit', next, 'in_review', 'deposit.updated', 'Изменены сведения месторождения в БГД.')
    return structuredClone(next)
  }

  async deleteDeposit(current: Deposit): Promise<void> {
    const latest = await this.requireDeposit(current.id)
    if (latest.version !== current.version) throw new Error('VERSION_CONFLICT: месторождение изменено в другой вкладке.')
    const data = await this.getMasterData()
    const sites = data.sites.filter((site) => site.depositId === latest.id)
    const siteIds = new Set(sites.map((site) => site.id))
    const lenses = data.lenses.filter((lens) => siteIds.has(lens.siteId))
    const conditions = data.conditionSets.filter((condition) => siteIds.has(condition.siteId))
    if (sites.length || lenses.length || conditions.length || latest.occurrences.length) {
      throw new Error(`DEPENDENCY_WARNING: удаление отменено. Связанные данные: участки — ${sites.length}, залежи — ${lenses.length + latest.occurrences.length}, наборы кондиций — ${conditions.length}. Используйте «Скрыть» или сначала перенесите дочерние объекты.`)
    }
    await this.database.transaction(['records', 'versions', 'auditEvents'], async (transaction) => {
      const versions = await transaction.getAll<StoredVersion>('versions')
      for (const version of versions.filter((item) => item.objectId === latest.id)) await transaction.delete('versions', version.id)
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
    if (latest.version !== current.version) throw new Error('VERSION_CONFLICT: месторождение изменено в другой вкладке.')
    const next: Deposit = { ...latest, status: 'archived', version: latest.version + 1, updatedAt: new Date().toISOString() }
    await this.persistVersion('deposit', next, 'withdrawn', 'deposit.archived', 'Объект переведён в архив без удаления истории.')
    return structuredClone(next)
  }

  async createSite(input: Pick<GeologicalSite, 'depositId' | 'code' | 'name'>): Promise<GeologicalSite> {
    const data = await this.getMasterData()
    const code = input.code.trim().toUpperCase()
    if (!data.deposits.some((item) => item.id === input.depositId)) throw new Error('Сначала выберите существующее месторождение.')
    if (data.sites.some((item) => item.depositId === input.depositId && item.code === code)) throw new Error('Участок с таким immutable code уже существует в месторождении.')
    const site: GeologicalSite = { id: `SITE-${code}`, depositId: input.depositId, code, name: input.name.trim(), status: 'active', version: 1 }
    await this.persistHierarchy('site', site, 'site.created', 'Создан участок месторождения.')
    return structuredClone(site)
  }

  async updateSite(current: GeologicalSite, patch: Pick<GeologicalSite, 'name'>): Promise<GeologicalSite> {
    const latest = await this.requireSite(current.id)
    if (latest.version !== current.version) throw new Error('VERSION_CONFLICT: участок изменён в другой вкладке.')
    if (latest.status === 'archived') throw new Error('ARCHIVED_READ_ONLY: архивный участок доступен только для чтения.')
    const next = { ...latest, ...patch, version: latest.version + 1 }
    await this.persistHierarchy('site', next, 'site.updated', 'Изменено наименование участка.')
    return structuredClone(next)
  }

  async archiveSite(current: GeologicalSite): Promise<GeologicalSite> {
    const data = await this.getMasterData()
    if (data.lenses.some((item) => item.siteId === current.id && item.status === 'active')) throw new Error('DEPENDENCY_WARNING: сначала архивируйте или перенесите активные залежи участка.')
    const latest = await this.requireSite(current.id)
    if (latest.version !== current.version) throw new Error('VERSION_CONFLICT: участок изменён в другой вкладке.')
    const next = { ...latest, status: 'archived' as const, version: latest.version + 1 }
    await this.persistHierarchy('site', next, 'site.archived', 'Участок архивирован без удаления истории.')
    return structuredClone(next)
  }

  async createLens(input: Pick<GeologicalLens, 'siteId' | 'code' | 'name'>): Promise<GeologicalLens> {
    const data = await this.getMasterData()
    const code = input.code.trim().toUpperCase()
    if (!data.sites.some((item) => item.id === input.siteId && item.status === 'active')) throw new Error('Выберите активный участок для залежи.')
    if (data.lenses.some((item) => item.siteId === input.siteId && item.code === code)) throw new Error('Залежь с таким immutable code уже существует на участке.')
    const lens: GeologicalLens = { id: `LENS-${code}`, siteId: input.siteId, code, name: input.name.trim(), status: 'active', version: 1 }
    await this.persistHierarchy('lens', lens, 'lens.created', 'Создана залежь участка.')
    return structuredClone(lens)
  }

  async updateLens(current: GeologicalLens, patch: Pick<GeologicalLens, 'name'>): Promise<GeologicalLens> {
    const latest = await this.requireLens(current.id)
    if (latest.version !== current.version) throw new Error('VERSION_CONFLICT: залежь изменена в другой вкладке.')
    if (latest.status === 'archived') throw new Error('ARCHIVED_READ_ONLY: архивная залежь доступна только для чтения.')
    const next = { ...latest, ...patch, version: latest.version + 1 }
    await this.persistHierarchy('lens', next, 'lens.updated', 'Изменено наименование залежи.')
    return structuredClone(next)
  }

  async archiveLens(current: GeologicalLens): Promise<GeologicalLens> {
    const latest = await this.requireLens(current.id)
    if (latest.version !== current.version) throw new Error('VERSION_CONFLICT: залежь изменена в другой вкладке.')
    const next = { ...latest, status: 'archived' as const, version: latest.version + 1 }
    await this.persistHierarchy('lens', next, 'lens.archived', 'Залежь архивирована без удаления истории.')
    return structuredClone(next)
  }

  async saveConditionSet(current: ConditionSet, patch: Omit<ConditionSet, 'id' | 'siteId' | 'code' | 'version' | 'status'>): Promise<ConditionSet> {
    const latest = await this.requireConditionSet(current.id)
    if (latest.version !== current.version) throw new Error('VERSION_CONFLICT: набор кондиций изменён в другой вкладке.')
    if (latest.status === 'published') throw new Error('PUBLISHED_IMMUTABLE: создайте новую версию кондиций вместо изменения опубликованной.')
    const next: ConditionSet = { ...latest, ...patch, version: latest.version + 1, status: 'draft' }
    await this.persistVersion('condition-set', next, 'draft', 'conditions.saved', 'Сохранён новый черновик кондиций.')
    return structuredClone(next)
  }

  async createConditionSetVersion(source: ConditionSet): Promise<ConditionSet> {
    const next: ConditionSet = { ...source, id: `${source.id}-V${source.version + 1}`, code: `${source.code}-V${source.version + 1}`, status: 'draft', version: 1 }
    await this.persistVersion('condition-set', next, 'draft', 'conditions.version_created', 'Создана новая версия набора кондиций.')
    return structuredClone(next)
  }

  async approveConditionSet(current: ConditionSet): Promise<ConditionSet> {
    const latest = await this.requireConditionSet(current.id)
    if (latest.version !== current.version) throw new Error('VERSION_CONFLICT: набор кондиций изменён в другой вкладке.')
    if (latest.status !== 'draft') throw new Error('Утвердить можно только черновик кондиций.')
    const next: ConditionSet = { ...latest, version: latest.version + 1, status: 'approved' }
    await this.persistVersion('condition-set', next, 'approved', 'conditions.approved', 'Кондиции утверждены.')
    return structuredClone(next)
  }

  async publishConditionSet(current: ConditionSet): Promise<ConditionSet> {
    const latest = await this.requireConditionSet(current.id)
    if (latest.version !== current.version) throw new Error('VERSION_CONFLICT: набор кондиций изменён в другой вкладке.')
    if (latest.status !== 'approved') throw new Error('Опубликовать можно только утверждённый набор кондиций.')
    const next: ConditionSet = { ...latest, version: latest.version + 1, status: 'published' }
    await this.persistVersion('condition-set', next, 'published', 'conditions.published', 'Кондиции опубликованы.')
    return structuredClone(next)
  }

  private async seed(): Promise<void> {
    await this.database.transaction(['records', 'versions', 'meta'], async (transaction) => {
      for (const deposit of seed.deposits) {
        await transaction.put('records', record('deposit', deposit, deposit.status))
        await transaction.put('versions', { id: `VERSION:deposit:${deposit.id}:${deposit.version}`, objectId: deposit.id, version: deposit.version, status: 'published', createdAt: seedTimestamp, data: deposit })
      }
      for (const site of seed.sites) await transaction.put('records', record('site', site, site.status))
      for (const lens of seed.lenses) await transaction.put('records', record('lens', lens, lens.status))
      for (const condition of seed.conditionSets) {
        await transaction.put('records', record('condition-set', condition, condition.status))
        await transaction.put('versions', { id: `VERSION:condition-set:${condition.id}:${condition.version}`, objectId: condition.id, version: condition.version, status: condition.status, createdAt: seedTimestamp, data: condition })
      }
      await transaction.put('meta', { key: seedMarkerKey, value: true })
    })
  }

  private async persistVersion(kind: 'deposit' | 'condition-set', value: Versioned, status: string, action: string, reason: string): Promise<void> {
    await this.database.transaction(['records', 'versions', 'auditEvents'], async (transaction) => {
      await transaction.put('records', record(kind, value, value.status))
      await transaction.put('versions', { id: `VERSION:${kind}:${value.id}:${value.version}`, objectId: value.id, version: value.version, status, createdAt: new Date().toISOString(), data: value })
      await transaction.put('auditEvents', this.audit(action, value.id, reason))
    })
  }

  private async persistHierarchy(kind: 'site' | 'lens', value: GeologicalSite | GeologicalLens, action: string, reason: string): Promise<void> {
    await this.database.transaction(['records', 'versions', 'auditEvents'], async (transaction) => {
      await transaction.put('records', record(kind, value, value.status))
      await transaction.put('versions', { id: `VERSION:${kind}:${value.id}:${value.version}`, objectId: value.id, version: value.version, status: value.status === 'active' ? 'in_review' : 'withdrawn', createdAt: new Date().toISOString(), data: value })
      await transaction.put('auditEvents', this.audit(action, value.id, reason))
    })
  }

  private async requireSite(id: string): Promise<GeologicalSite> {
    const stored = await this.database.get<DemoRecord<GeologicalSite>>('records', `site:${id}`)
    if (!stored) throw new Error('Участок не найден.')
    return stored.data
  }

  private async requireLens(id: string): Promise<GeologicalLens> {
    const stored = await this.database.get<DemoRecord<GeologicalLens>>('records', `lens:${id}`)
    if (!stored) throw new Error('Залежь не найдена.')
    return stored.data
  }

  private async requireDeposit(id: string): Promise<Deposit> {
    const stored = await this.database.get<DemoRecord<LegacyDeposit>>('records', `deposit:${id}`)
    if (!stored) throw new Error('Месторождение не найдено.')
    return normalizeDeposit(stored.data, 1)
  }

  private async requireConditionSet(id: string): Promise<ConditionSet> {
    const stored = await this.database.get<DemoRecord<ConditionSet>>('records', `condition-set:${id}`)
    if (!stored) throw new Error('Набор кондиций не найден.')
    return stored.data
  }

  private audit(action: string, entityId: string, reason: string, actor = { id: 'PERSON-R1-GEOLOGIST', name: 'Ирина Иванова' }) {
    const occurredAt = new Date().toISOString()
    return { id: `AUD-${action}-${entityId}-${occurredAt}`, eventType: action, entityType: 'other', entityId, actor: { ...actor, type: 'user' }, occurredAt, status: 'accepted', payload: { metadata: { reason } } }
  }
}

export const demoGeologyMasterRepository = new DemoGeologyMasterRepository()
