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

const seed: GeologicalMasterData = {
  deposits: [
    {
      id: 'DEP-SARYTAU', numericId: 1, code: 'SARYTAU', objectType: 'field', name: 'Сарытау',
      description: 'Synthetic месторождение для кликабельного прототипа.', crs: 'EPSG:32642',
      coordinateSystemDescription: 'WGS 84 / UTM zone 42N · демонстрационная система координат', isHidden: false,
      occurrences: [
        { id: 'OCC-SARYTAU-01', type: 'рудная залежь', name: 'PR-07' },
        { id: 'OCC-SARYTAU-02', type: 'рудная залежь', name: 'CN-02' },
      ],
      status: 'active', version: 4, createdAt: seedTimestamp, updatedAt: seedTimestamp,
    },
    {
      id: 'DEP-SEVERNOE', numericId: 2, code: 'SEVERNOE', objectType: 'field', name: 'Северное',
      description: 'Synthetic месторождение без дочерних объектов для демонстрации CRUD.', crs: 'LOCAL:SEVERNOE',
      coordinateSystemDescription: 'Локальная система координат · условная', isHidden: false, occurrences: [],
      status: 'active', version: 1, createdAt: seedTimestamp, updatedAt: seedTimestamp,
    },
    {
      id: 'DEP-VOSTOCHNAYA', numericId: 4, code: 'VOSTOCHNAYA', objectType: 'area', name: 'Восточная',
      description: 'Скрытая synthetic площадь для проверки фильтра видимости.', crs: 'EPSG:32642',
      coordinateSystemDescription: '', isHidden: true, occurrences: [], status: 'active', version: 1,
      createdAt: seedTimestamp, updatedAt: seedTimestamp,
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

function normalizeOccurrence(value: Partial<DepositOccurrence>, code: string, index: number): DepositOccurrence {
  return {
    id: value.id || `OCC-${code}-${String(index + 1).padStart(2, '0')}`,
    type: String(value.type ?? '').trim(),
    name: String(value.name ?? '').trim(),
  }
}

function normalizeDeposit(value: Partial<Deposit>, fallbackNumericId: number): Deposit {
  const code = String(value.code ?? `FIELD-${fallbackNumericId}`).trim().toUpperCase()
  return {
    id: value.id ?? `DEP-${code}`,
    numericId: Number.isInteger(value.numericId) && Number(value.numericId) > 0 ? Number(value.numericId) : fallbackNumericId,
    code,
    objectType: value.objectType ?? 'field',
    customType: value.customType?.trim() || undefined,
    name: String(value.name ?? code).trim(),
    description: String(value.description ?? '').trim(),
    crs: String(value.crs ?? 'EPSG:32642').trim(),
    coordinateSystemDescription: String(value.coordinateSystemDescription ?? value.crs ?? '').trim(),
    isHidden: Boolean(value.isHidden),
    occurrences: (value.occurrences ?? []).map((item, index) => normalizeOccurrence(item, code, index)),
    status: value.status ?? 'active',
    version: Number(value.version ?? 1),
    createdAt: value.createdAt ?? seedTimestamp,
    updatedAt: value.updatedAt ?? seedTimestamp,
  }
}

function validateDepositValues(value: Pick<Deposit, 'name' | 'objectType' | 'customType' | 'crs' | 'occurrences'>): void {
  if (value.name.trim().length < 2) throw new Error('Название месторождения должно содержать минимум 2 символа.')
  if (!value.crs.trim()) throw new Error('Укажите код или наименование системы координат.')
  if (value.objectType === 'custom' && !value.customType?.trim()) throw new Error('Для пользовательского типа укажите его наименование.')
  const keys = new Set<string>()
  for (const occurrence of value.occurrences) {
    if (!occurrence.type.trim() || !occurrence.name.trim()) throw new Error('Для каждой залежи укажите тип и название.')
    const key = `${occurrence.type.trim().toLocaleLowerCase('ru')}::${occurrence.name.trim().toLocaleLowerCase('ru')}`
    if (keys.has(key)) throw new Error('Список залежей содержит дубликат типа и названия.')
    keys.add(key)
  }
}

export class DemoGeologyMasterRepository {
  constructor(private readonly database: DemoDatabase = demoDatabase) {}

  async getMasterData(): Promise<GeologicalMasterData> {
    const records = await this.database.getAll<DemoRecord<unknown>>('records')
    const rawDeposits = records.filter((item) => item.entityType === 'deposit').map((item) => item.data as Partial<Deposit>)
    if (rawDeposits.length === 0) {
      await this.seed()
      return this.getMasterData()
    }
    const deposits = rawDeposits
      .map((item, index) => normalizeDeposit(item, item.code === 'SARYTAU' ? 1 : index + 1))
      .sort((left, right) => left.numericId - right.numericId || left.name.localeCompare(right.name, 'ru'))
    return {
      deposits: deposits.map((item) => structuredClone(item)),
      sites: records.filter((item) => item.entityType === 'site').map((item) => structuredClone(item.data as GeologicalSite)),
      lenses: records.filter((item) => item.entityType === 'lens').map((item) => structuredClone(item.data as GeologicalLens)),
      conditionSets: records.filter((item) => item.entityType === 'condition-set').map((item) => structuredClone(item.data as ConditionSet)),
    }
  }

  async createDeposit(input: CreateDepositInput): Promise<Deposit> {
    const data = await this.getMasterData()
    const code = input.code.trim().toUpperCase()
    if (!/^[A-Z0-9-]{3,24}$/.test(code)) throw new Error('Код месторождения: 3–24 символа A–Z, цифры или дефис.')
    if (data.deposits.some((item) => item.code === code)) throw new Error('Месторождение с таким неизменяемым кодом уже существует.')
    const numericId = input.numericId ?? Math.max(0, ...data.deposits.map((item) => item.numericId)) + 1
    if (!Number.isInteger(numericId) || numericId <= 0) throw new Error('Числовой ID должен быть целым положительным числом.')
    if (data.deposits.some((item) => item.numericId === numericId)) throw new Error('Месторождение с таким числовым ID уже существует.')
    const now = new Date().toISOString()
    const occurrences = (input.occurrences ?? []).map((item, index) => normalizeOccurrence(item, code, index))
    const deposit: Deposit = {
      id: `DEP-${code}`,
      numericId,
      code,
      objectType: input.objectType ?? 'field',
      customType: input.customType?.trim() || undefined,
      name: input.name.trim(),
      description: input.description.trim(),
      crs: input.crs.trim(),
      coordinateSystemDescription: input.coordinateSystemDescription?.trim() ?? '',
      isHidden: input.isHidden ?? false,
      occurrences,
      status: 'active',
      version: 1,
      createdAt: now,
      updatedAt: now,
    }
    validateDepositValues(deposit)
    await this.database.transaction(['records', 'versions', 'auditEvents'], async (transaction) => {
      await transaction.put('records', record('deposit', deposit, deposit.status))
      await transaction.put('versions', { id: `VERSION:deposit:${deposit.id}:1`, objectId: deposit.id, version: 1, status: 'draft', createdAt: now, data: deposit })
      await transaction.put('auditEvents', this.audit('deposit.created', deposit.id, 'Создано synthetic месторождение в БГД.'))
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
      name: patch.name.trim(),
      description: patch.description.trim(),
      crs: patch.crs.trim(),
      coordinateSystemDescription: patch.coordinateSystemDescription.trim(),
      occurrences,
      version: latest.version + 1,
      updatedAt: new Date().toISOString(),
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
    if (sites.length || lenses.length || conditions.length) {
      throw new Error(`DEPENDENCY_WARNING: удаление отменено. Связанные данные: участки — ${sites.length}, залежи — ${lenses.length}, наборы кондиций — ${conditions.length}. Используйте «Скрыть» или сначала перенесите дочерние объекты.`)
    }
    await this.database.transaction(['records', 'versions', 'auditEvents'], async (transaction) => {
      const versions = await transaction.getAll<StoredVersion>('versions')
      for (const version of versions.filter((item) => item.objectId === latest.id)) await transaction.delete('versions', version.id)
      await transaction.delete('records', `deposit:${latest.id}`)
      await transaction.put('auditEvents', this.audit('deposit.deleted', latest.id, 'Synthetic месторождение удалено из БГД после проверки зависимостей.'))
    })
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
    await this.persistHierarchy('site', site, 'site.created', 'Создан synthetic участок.')
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
    await this.persistHierarchy('lens', lens, 'lens.created', 'Создана synthetic залежь.')
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
    await this.persistVersion('condition-set', next, 'draft', 'conditions.saved', 'Сохранён новый synthetic черновик кондиций.')
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
    await this.persistVersion('condition-set', next, 'approved', 'conditions.approved', 'Кондиции утверждены в synthetic workflow.')
    return structuredClone(next)
  }

  async publishConditionSet(current: ConditionSet): Promise<ConditionSet> {
    const latest = await this.requireConditionSet(current.id)
    if (latest.version !== current.version) throw new Error('VERSION_CONFLICT: набор кондиций изменён в другой вкладке.')
    if (latest.status !== 'approved') throw new Error('Опубликовать можно только утверждённый набор кондиций.')
    const next: ConditionSet = { ...latest, version: latest.version + 1, status: 'published' }
    await this.persistVersion('condition-set', next, 'published', 'conditions.published', 'Кондиции опубликованы для synthetic сценария.')
    return structuredClone(next)
  }

  private async seed(): Promise<void> {
    await this.database.transaction(['records', 'versions'], async (transaction) => {
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
    const stored = await this.database.get<DemoRecord<Partial<Deposit>>>('records', `deposit:${id}`)
    if (!stored) throw new Error('Месторождение не найдено.')
    return normalizeDeposit(stored.data, 1)
  }

  private async requireConditionSet(id: string): Promise<ConditionSet> {
    const stored = await this.database.get<DemoRecord<ConditionSet>>('records', `condition-set:${id}`)
    if (!stored) throw new Error('Набор кондиций не найден.')
    return stored.data
  }

  private audit(action: string, entityId: string, reason: string) {
    const occurredAt = new Date().toISOString()
    return { id: `AUD-${action}-${entityId}-${occurredAt}`, eventType: action, entityType: 'other', entityId, actor: { id: 'PERSON-R1-GEOLOGIST', type: 'user', name: 'Айгерим Садыкова · synthetic' }, occurredAt, status: 'accepted', payload: { metadata: { reason } } }
  }
}

export const demoGeologyMasterRepository = new DemoGeologyMasterRepository()
