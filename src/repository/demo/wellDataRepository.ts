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
    return records
      .filter((record) => record.entityType === 'well')
      .map((record) => structuredClone(record.data))
      .sort((left, right) => left.code.localeCompare(right.code))
  }

  async getWell(wellId: string): Promise<Well> {
    const record = await demoDatabase.get<DemoRecord<Well>>('records', `well:${wellId}`)
    if (!record) throw new Error(`Скважина ${wellId} не найдена.`)
    return structuredClone(record.data)
  }

  async createWell(well: Well): Promise<Well> {
    const existing = (await this.listWells()).some((item) => item.code.toLocaleLowerCase() === well.code.toLocaleLowerCase())
    if (existing) throw new Error('Скважина с таким кодом уже существует в выбранной области.')
    await demoDatabase.put('records', wellRecord(well, '2026-08-24T10:00:00.000Z'))
    wells.unshift(structuredClone(well))
    return structuredClone(well)
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
