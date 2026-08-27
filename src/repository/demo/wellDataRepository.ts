import type { LabResult, LogRun, Sample, Well, WellGeologyData, WellTechnicalData } from '../../entities/well/model/types'
import { getGeologyData, setGeologyData } from '../data/wellGeology'
import { getWellLogs } from '../data/wellLogs'
import { getLabResults, setLabResults } from '../data/labResults'
import { getSamples, setSamples } from '../data/wellSamples'
import { getTechnicalData, setTechnicalData } from '../data/wellTechnical'
import { primaryWell, wells } from '../data/wells'
import { demoDatabase, type DemoRecord, wellRecord } from './demoDatabase'

type WellDataKind = 'well-technical' | 'well-geology' | 'well-samples' | 'well-lab-results' | 'well-logs'

function dataRecord<T>(kind: WellDataKind, well: Well, data: T): DemoRecord<T> {
  return {
    id: `${kind}:${well.id}`,
    entityType: kind,
    objectId: well.id,
    scopeId: well.site,
    status: 'active',
    updatedAt: '2026-08-24T00:00:00.000Z',
    data: structuredClone(data),
  }
}

export class DemoWellDataRepository {
  async listWells(): Promise<Well[]> {
    const records = await demoDatabase.getAll<DemoRecord<Well>>('records')
    const values = records
      .filter((record) => record.entityType === 'well')
      .map((record) => structuredClone(record.data))
    const fullTemplate = wells.find((item) => item.id === 'WELL-1010-FULL')
    const legacyFull = values.find((item) => item.id === 'WELL-1010-FULL' && !item.bgd)
    if (legacyFull && fullTemplate?.bgd) {
      legacyFull.bgd = structuredClone(fullTemplate.bgd)
      await demoDatabase.put('records', wellRecord(legacyFull, new Date().toISOString()))
    }
    return values
      .sort((left, right) => left.code.localeCompare(right.code))
  }

  async getWell(wellId: string): Promise<Well> {
    const record = await demoDatabase.get<DemoRecord<Well>>('records', `well:${wellId}`)
    if (!record) throw new Error(`Скважина ${wellId} не найдена.`)
    if (wellId === 'WELL-1010-FULL' && !record.data.bgd) {
      const template = wells.find((item) => item.id === 'WELL-1010-FULL')
      if (template?.bgd) {
        const completed = { ...structuredClone(record.data), bgd: structuredClone(template.bgd) }
        await demoDatabase.put('records', wellRecord(completed, new Date().toISOString()))
        return completed
      }
    }
    return structuredClone(record.data)
  }

  async createWell(well: Well): Promise<Well> {
    const existing = (await this.listWells()).some((item) => item.code.toLocaleLowerCase() === well.code.toLocaleLowerCase()
      && (item.bgd?.depositId ?? 'DEP-SARYTAU') === (well.bgd?.depositId ?? 'DEP-SARYTAU'))
    if (existing) throw new Error('Скважина с таким кодом уже существует в выбранной области.')
    const occurredAt = new Date().toISOString()
    await demoDatabase.transaction(['records', 'versions', 'auditEvents'], async (transaction) => {
      await transaction.put('records', wellRecord(well, occurredAt))
      await transaction.put('versions', { id: `VERSION:well:${well.id}:1`, objectId: well.id, version: 1, status: 'draft', createdAt: occurredAt, data: well })
      await transaction.put('auditEvents', wellAudit('well.created', well, occurredAt, 'Создана скважина в БГД.'))
    })
    wells.unshift(structuredClone(well))
    return structuredClone(well)
  }

  async updateWell(current: Well, nextValue: Well): Promise<Well> {
    const latest = await this.getWell(current.id)
    if ((latest.version ?? 1) !== (current.version ?? 1)) throw new Error('VERSION_CONFLICT: скважина изменена в другой вкладке.')
    const duplicate = (await this.listWells()).some((item) => item.id !== current.id
      && item.code.toLocaleLowerCase() === nextValue.code.toLocaleLowerCase()
      && (item.bgd?.depositId ?? 'DEP-SARYTAU') === (nextValue.bgd?.depositId ?? 'DEP-SARYTAU'))
    if (duplicate) throw new Error('Скважина с таким названием уже существует в выбранном месторождении.')
    const occurredAt = new Date().toISOString()
    const next: Well = { ...structuredClone(nextValue), id: latest.id, version: (latest.version ?? 1) + 1, updatedAt: 'Только что' }
    await demoDatabase.transaction(['records', 'versions', 'auditEvents'], async (transaction) => {
      await transaction.put('records', wellRecord(next, occurredAt))
      await transaction.put('versions', { id: `VERSION:well:${next.id}:${next.version}`, objectId: next.id, version: next.version, status: 'in_review', createdAt: occurredAt, data: next })
      await transaction.put('auditEvents', wellAudit('well.updated', next, occurredAt, 'Изменены сведения скважины в БГД.'))
    })
    const index = wells.findIndex((item) => item.id === next.id)
    if (index >= 0) wells[index] = structuredClone(next)
    return structuredClone(next)
  }

  async getTechnical(wellId: string): Promise<WellTechnicalData> {
    return this.getOrSeed('well-technical', wellId, (well) => getTechnicalData(well))
  }

  async saveTechnical(wellId: string, data: WellTechnicalData): Promise<WellTechnicalData> {
    setTechnicalData(wellId, data)
    return this.save('well-technical', wellId, data)
  }

  async getGeology(wellId: string): Promise<WellGeologyData> {
    return this.getOrSeed('well-geology', wellId, (well) => getGeologyData(well))
  }

  async saveGeology(wellId: string, data: WellGeologyData): Promise<WellGeologyData> {
    setGeologyData(wellId, data)
    return this.save('well-geology', wellId, data)
  }

  async getSamples(wellId: string): Promise<Sample[]> {
    return this.getOrSeed('well-samples', wellId, (well) => getSamples(well))
  }

  async saveSamples(wellId: string, data: Sample[]): Promise<Sample[]> {
    setSamples(wellId, data)
    return this.save('well-samples', wellId, data)
  }

  async getLogs(wellId: string): Promise<LogRun[]> {
    return this.getOrSeed('well-logs', wellId, (well) => getWellLogs(well.id))
  }

  async getLabResults(wellId: string): Promise<LabResult[]> {
    return this.getOrSeed('well-lab-results', wellId, (well) => getLabResults(well.id))
  }

  async saveLabResults(wellId: string, data: LabResult[]): Promise<LabResult[]> {
    setLabResults(wellId, data)
    return this.save('well-lab-results', wellId, data)
  }

  private async getOrSeed<T>(kind: WellDataKind, wellId: string, seed: (well: Well) => T): Promise<T> {
    const id = `${kind}:${wellId}`
    const existing = await demoDatabase.get<DemoRecord<T>>('records', id)
    if (existing) return structuredClone(existing.data)
    const well = await this.getWell(wellId).catch(() => structuredClone(primaryWell))
    const record = dataRecord(kind, well, seed(well))
    await demoDatabase.put('records', record)
    return structuredClone(record.data)
  }

  private async save<T>(kind: WellDataKind, wellId: string, data: T): Promise<T> {
    const well = await this.getWell(wellId)
    await demoDatabase.put('records', dataRecord(kind, well, data))
    return structuredClone(data)
  }
}

export const demoWellDataRepository = new DemoWellDataRepository()

function wellAudit(eventType: string, well: Well, occurredAt: string, reason: string) {
  return {
    id: `AUD-${eventType}-${well.id}-${occurredAt}`,
    eventType,
    entityType: 'well',
    entityId: well.id,
    actor: { id: 'PERSON-R1-GEOLOGIST', type: 'user', name: 'Ирина Иванова' },
    occurredAt,
    status: 'accepted',
    payload: { metadata: { reason, depositId: well.bgd?.depositId ?? 'DEP-SARYTAU', version: String(well.version ?? 1) } },
  }
}
