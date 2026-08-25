import type { WellConstructionData, WellConstructionVersion } from '../../entities/well-construction/model/types'
import type { WellPassportData, WellPassportVersion } from '../../entities/well-passport/model/types'
import type { Well } from '../../entities/well/model/types'
import { cloneDomainVersion, scientificContentHash, type AuditEvent, type DependencyRef, type DomainVersionStatus, type StalenessRecord } from '../../shared/domain/versioning'
import { createPoint, crsFromLegacy, sameCrs, toLegacyCrs, validateGeometry } from '../../shared/scientific/geometry'
import { GeologyRepositoryError, type DependencyImpact, type SaveWellPassportCommand, type SaveWellPassportResult, type VersionHistory, type WellPassportRepository, type WellPassportWorkspace } from '../contracts/geology'
import { getTechnicalData, resetTechnicalData, setTechnicalData } from '../data/wellTechnical'
import { wells } from '../data/wells'
import { demoDatabase, type DemoRecord, wellRecord } from './demoDatabase'

type StoreRecord = {
  passportHistory: WellPassportVersion[]
  constructionHistory: WellConstructionVersion[]
  dependencies: DependencyRef[]
  staleness: StalenessRecord[]
  idempotency: Map<string, SaveWellPassportResult>
}

const initialWells = structuredClone(wells)
const demoActor = { id: 'PERSON-R1-GEOLOGIST', name: 'Айгерим Садыкова · synthetic' }

function cloneWell(well: Well): Well {
  return structuredClone(well)
}

function passportDataFromWell(well: Well): WellPassportData {
  return {
    purpose: well.purpose,
    profile: well.profile,
    location: createPoint([well.coordinates.x, well.coordinates.y], crsFromLegacy(well.crs)),
    depth: well.depth,
    casingDiameter: well.casingDiameter,
  }
}

function current<T>(versions: Array<{ version: number } & T>): ({ version: number } & T) {
  const item = versions.at(-1)
  if (!item) throw new GeologyRepositoryError('NOT_FOUND', 'Версия агрегата не найдена.')
  return item
}

function cloneWorkspace(record: StoreRecord): WellPassportWorkspace {
  return {
    passport: cloneDomainVersion(current(record.passportHistory)),
    construction: cloneDomainVersion(current(record.constructionHistory)),
    dependencies: structuredClone(record.dependencies),
    staleness: structuredClone(record.staleness),
  }
}

function changedPassportFields(before: WellPassportData, after: WellPassportData): string[] {
  const fields: string[] = []
  if (before.purpose !== after.purpose) fields.push('purpose')
  if (before.profile !== after.profile) fields.push('profile')
  if (before.location.coordinates[0] !== after.location.coordinates[0] || before.location.coordinates[1] !== after.location.coordinates[1]) fields.push('coordinates')
  if (!sameCrs(before.location.crs, after.location.crs)) fields.push('crs')
  if (before.depth !== after.depth) fields.push('depth')
  if (before.casingDiameter !== after.casingDiameter) fields.push('casingDiameter')
  return fields
}

export class DemoWellPassportRepository implements WellPassportRepository {
  private readonly records = new Map<string, StoreRecord>()
  private sequence = 0

  async getWorkspace(wellId: string): Promise<WellPassportWorkspace> {
    await this.hydrate(wellId)
    return cloneWorkspace(this.ensureRecord(wellId))
  }

  async previewImpact(wellId: string, passport: WellPassportData, construction: WellConstructionData): Promise<DependencyImpact[]> {
    await this.hydrate(wellId)
    const record = this.ensureRecord(wellId)
    return this.calculateImpact(record, passport, construction)
  }

  async getHistory(wellId: string): Promise<VersionHistory> {
    await this.hydrate(wellId)
    const record = this.ensureRecord(wellId)
    return {
      passport: record.passportHistory.map(cloneDomainVersion),
      construction: record.constructionHistory.map(cloneDomainVersion),
    }
  }

  async save(command: SaveWellPassportCommand): Promise<SaveWellPassportResult> {
    await this.hydrate(command.wellId)
    const record = this.ensureRecord(command.wellId)
    const repeated = record.idempotency.get(command.idempotencyKey)
    if (repeated) return structuredClone(repeated)

    const passportBefore = current(record.passportHistory)
    const constructionBefore = current(record.constructionHistory)
    if (passportBefore.version !== command.expectedPassportVersion || constructionBefore.version !== command.expectedConstructionVersion) {
      throw new GeologyRepositoryError('VERSION_CONFLICT', 'Данные уже изменены в другой сессии. Перезагрузите версии и сравните изменения.', {
        expectedPassportVersion: command.expectedPassportVersion,
        currentPassportVersion: passportBefore.version,
        expectedConstructionVersion: command.expectedConstructionVersion,
        currentConstructionVersion: constructionBefore.version,
      })
    }

    const geometryIssues = validateGeometry(command.passport.location)
    const geometryErrors = geometryIssues.filter((issue) => issue.severity === 'error')
    if (geometryErrors.length > 0) {
      throw new GeologyRepositoryError('VALIDATION_ERROR', geometryErrors[0]!.message, { geometryIssues })
    }

    const passportChanged = scientificContentHash(passportBefore.data) !== scientificContentHash(command.passport)
    const constructionChanged = scientificContentHash(constructionBefore.data) !== scientificContentHash(command.construction)
    if (!passportChanged && !constructionChanged) {
      throw new GeologyRepositoryError('NO_CHANGES', 'Сохраняемые данные не отличаются от текущих версий.')
    }

    const impact = this.calculateImpact(record, command.passport, command.construction)
    if (impact.length > 0 && (command.reason?.trim().length ?? 0) < 10) {
      throw new GeologyRepositoryError('VALIDATION_ERROR', 'Для изменения данных с зависимостями укажите предметную причину не короче 10 символов.')
    }

    const timestamp = this.nextTimestamp()
    const requestId = `REQ-GEO-${String(this.sequence).padStart(4, '0')}`
    const auditEvents: AuditEvent[] = []
    let passportAfter = passportBefore
    let constructionAfter = constructionBefore

    if (passportChanged) {
      passportAfter = this.createPassportVersion(command.wellId, passportBefore, command.passport, command.reason, timestamp, record.dependencies)
      record.passportHistory.push(passportAfter)
      auditEvents.push(this.createAuditEvent(passportBefore, passportAfter, command.reason, timestamp, requestId))
    }
    if (constructionChanged) {
      constructionAfter = this.createConstructionVersion(command.wellId, constructionBefore, command.construction, command.reason, timestamp, record.dependencies)
      record.constructionHistory.push(constructionAfter)
      auditEvents.push(this.createAuditEvent(constructionBefore, constructionAfter, command.reason, timestamp, requestId))
    }

    const upstreamVersionId = passportChanged ? passportAfter.id : constructionAfter.id
    for (const item of impact) {
      record.staleness.unshift({
        id: `STALE-${String(this.sequence).padStart(4, '0')}-${item.dependency.downstreamObjectId}`,
        upstreamVersionId,
        replacedVersionId: item.dependency.upstreamVersionId,
        downstreamObjectId: item.dependency.downstreamObjectId,
        downstreamVersionId: item.dependency.downstreamVersionId,
        downstreamType: item.dependency.downstreamType,
        label: item.dependency.label,
        route: item.dependency.route,
        reason: `Изменены поля: ${item.changedFields.join(', ')}`,
        createdAt: timestamp,
        state: 'open',
      })
    }

    const well = this.findWell(command.wellId)
    Object.assign(well, {
      purpose: command.passport.purpose,
      profile: command.passport.profile,
      coordinates: { x: command.passport.location.coordinates[0], y: command.passport.location.coordinates[1] },
      crs: toLegacyCrs(command.passport.location.crs),
      depth: command.passport.depth,
      casingDiameter: command.passport.casingDiameter,
      version: Math.max(passportAfter.version, constructionAfter.version),
      status: 'На проверке',
      updatedAt: 'Только что',
      completeness: Math.max(well.completeness, 78),
    } satisfies Partial<Well>)
    const technical = getTechnicalData(well)
    setTechnicalData(well.id, { ...technical, construction: structuredClone(command.construction.intervals) })

    const result: SaveWellPassportResult = {
      well: cloneWell(well),
      workspace: cloneWorkspace(record),
      impact: structuredClone(impact),
      auditEvents: structuredClone(auditEvents),
      requestId,
    }
    record.idempotency.set(command.idempotencyKey, structuredClone(result))
    await this.persist(command.wellId, record, auditEvents)
    return result
  }

  async reset(): Promise<void> {
    this.records.clear()
    this.sequence = 0
    const restored = initialWells.map((snapshot) => {
      const existing = wells.find((well) => well.id === snapshot.id)
      if (!existing) return cloneWell(snapshot)
      Object.assign(existing, cloneWell(snapshot))
      return existing
    })
    wells.splice(0, wells.length, ...restored)
    resetTechnicalData()
    await demoDatabase.reset()
  }

  private async hydrate(wellId: string): Promise<void> {
    if (this.records.has(wellId)) return
    const persisted = await demoDatabase.get<DemoRecord<StoreRecord>>('records', `well-passport-state:${wellId}`)
    if (persisted) {
      this.records.set(wellId, persisted.data)
      return
    }
    const record = this.ensureRecord(wellId)
    await this.persist(wellId, record, [])
  }

  private async persist(wellId: string, record: StoreRecord, auditEvents: AuditEvent[]): Promise<void> {
    const well = this.findWell(wellId)
    await demoDatabase.transaction(['records', 'versions', 'relations', 'auditEvents'], async (transaction) => {
      await transaction.put('records', {
        id: `well-passport-state:${wellId}`,
        entityType: 'well-passport-state',
        objectId: wellId,
        scopeId: well.site,
        status: 'active',
        updatedAt: record.passportHistory.at(-1)?.createdAt ?? '2026-08-24T00:00:00.000Z',
        data: record,
      } satisfies DemoRecord<StoreRecord>)
      await transaction.put('records', wellRecord(well))
      for (const version of [...record.passportHistory, ...record.constructionHistory]) await transaction.put('versions', version)
      for (const relation of record.dependencies) await transaction.put('relations', relation)
      for (const stale of record.staleness) await transaction.put('relations', stale)
      for (const auditEvent of auditEvents) await transaction.put('auditEvents', auditEvent)
    })
  }
  private ensureRecord(wellId: string): StoreRecord {
    const existing = this.records.get(wellId)
    if (existing) return existing

    const well = this.findWell(wellId)
    const version = well.version ?? (well.updatedAt === 'Только что' ? 1 : 7)
    const status: DomainVersionStatus = version === 1 && well.updatedAt === 'Только что' ? 'draft' : 'published'
    const createdAt = '2026-08-20T08:00:00.000Z'
    const passportId = `WELL-PASSPORT-${well.id}-V${version}`
    const constructionId = `WELL-CONSTRUCTION-${well.id}-V${version}`
    const dependencies = this.createDependencies(well, passportId)
    const passportData = passportDataFromWell(well)
    const constructionData = { intervals: getTechnicalData(well).construction }

    const record: StoreRecord = {
      passportHistory: [{
        id: passportId,
        objectId: `WELL-PASSPORT-${well.id}`,
        version,
        status,
        createdAt,
        createdBy: demoActor,
        data: passportData,
        quality: { state: 'valid', issueCount: 0 },
        dependencies,
        contentHash: scientificContentHash(passportData),
      }],
      constructionHistory: [{
        id: constructionId,
        objectId: `WELL-CONSTRUCTION-${well.id}`,
        version,
        status,
        createdAt,
        createdBy: demoActor,
        data: constructionData,
        quality: { state: 'valid', issueCount: 0 },
        dependencies: dependencies.filter((item) => item.downstreamType === 'column'),
        contentHash: scientificContentHash(constructionData),
      }],
      dependencies,
      staleness: [],
      idempotency: new Map(),
    }
    this.records.set(wellId, record)
    return record
  }

  private findWell(wellId: string): Well {
    const well = wells.find((item) => item.id === wellId)
    if (!well) throw new GeologyRepositoryError('NOT_FOUND', `Скважина ${wellId} не найдена.`)
    return well
  }

  private calculateImpact(record: StoreRecord, passport: WellPassportData, construction: WellConstructionData): DependencyImpact[] {
    const passportBefore = current(record.passportHistory).data
    const constructionBefore = current(record.constructionHistory).data
    const fields = changedPassportFields(passportBefore, passport)
    if (scientificContentHash(constructionBefore) !== scientificContentHash(construction)) fields.push('construction')

    return record.dependencies.flatMap((dependency) => {
      const triggers = fields.filter((field) => dependency.triggerFields.includes(field))
      if (triggers.length === 0) return []
      return [{
        dependency: structuredClone(dependency),
        changedFields: triggers,
        severity: 'warning' as const,
        consequence: `${dependency.label} сохранит прежний input snapshot и будет помечен как устаревший.`,
      }]
    })
  }

  private createDependencies(well: Well, passportVersionId: string): DependencyRef[] {
    return [
      {
        id: `DEP-${well.id}-SECTION`,
        upstreamObjectId: `WELL-PASSPORT-${well.id}`,
        upstreamVersionId: passportVersionId,
        downstreamObjectId: `SECTION-${well.profile}`,
        downstreamVersionId: `SECTION-${well.profile}-V3`,
        downstreamType: 'section',
        label: `Разрез ${well.profile}`,
        route: '/geology/correlation',
        triggerFields: ['coordinates', 'depth', 'profile'],
      },
      {
        id: `DEP-${well.id}-MODEL`,
        upstreamObjectId: `WELL-PASSPORT-${well.id}`,
        upstreamVersionId: passportVersionId,
        downstreamObjectId: `MODEL-${well.site.toUpperCase()}-BASE`,
        downstreamVersionId: `MODEL-${well.site.toUpperCase()}-BASE-V5`,
        downstreamType: 'model',
        label: `Модель ${well.site} · базовая`,
        route: '/modeling',
        triggerFields: ['coordinates', 'depth', 'crs'],
      },
      {
        id: `DEP-${well.id}-COLUMN`,
        upstreamObjectId: `WELL-CONSTRUCTION-${well.id}`,
        upstreamVersionId: `WELL-CONSTRUCTION-${well.id}-V${well.version ?? 7}`,
        downstreamObjectId: `COLUMN-${well.id}`,
        downstreamVersionId: `COLUMN-${well.id}-V2`,
        downstreamType: 'column',
        label: `Геологическая колонка ${well.code}`,
        route: `/objects/wells/${well.id}?tab=lithology`,
        triggerFields: ['depth', 'casingDiameter', 'construction'],
      },
    ]
  }

  private createPassportVersion(wellId: string, before: WellPassportVersion, data: WellPassportData, reason: string | undefined, createdAt: string, dependencies: DependencyRef[]): WellPassportVersion {
    const version = before.version + 1
    const geometryIssues = validateGeometry(data.location)
    return {
      id: `WELL-PASSPORT-${wellId}-V${version}`,
      objectId: before.objectId,
      version,
      status: 'in_review',
      basedOnVersionId: before.id,
      createdAt,
      createdBy: demoActor,
      reason,
      data: structuredClone(data),
      quality: { state: geometryIssues.length > 0 ? 'warning' : 'valid', issueCount: geometryIssues.length },
      dependencies: structuredClone(dependencies),
      contentHash: scientificContentHash(data),
    }
  }

  private createConstructionVersion(wellId: string, before: WellConstructionVersion, data: WellConstructionData, reason: string | undefined, createdAt: string, dependencies: DependencyRef[]): WellConstructionVersion {
    const version = before.version + 1
    return {
      id: `WELL-CONSTRUCTION-${wellId}-V${version}`,
      objectId: before.objectId,
      version,
      status: 'in_review',
      basedOnVersionId: before.id,
      createdAt,
      createdBy: demoActor,
      reason,
      data: structuredClone(data),
      quality: { state: 'valid', issueCount: 0 },
      dependencies: structuredClone(dependencies.filter((item) => item.downstreamType === 'column')),
      contentHash: scientificContentHash(data),
    }
  }

  private createAuditEvent<T>(before: { objectId: string; contentHash: string } & T, after: { contentHash: string } & T, reason: string | undefined, occurredAt: string, requestId: string): AuditEvent {
    return {
      id: `AUD-${requestId}-${before.objectId}`,
      objectId: before.objectId,
      action: 'version.created',
      actor: demoActor,
      occurredAt,
      requestId,
      beforeHash: before.contentHash,
      afterHash: after.contentHash,
      reason,
    }
  }

  private nextTimestamp(): string {
    this.sequence += 1
    return new Date(Date.UTC(2026, 7, 20, 10, 0, this.sequence)).toISOString()
  }
}

export const demoWellPassportRepository = new DemoWellPassportRepository()
