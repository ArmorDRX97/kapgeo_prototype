import type { WellCoreWorkspace } from '../../entities/well-core/model/types'
import type { Well } from '../../entities/well/model/types'
import { demoDatabase, type DemoRecord } from './demoDatabase'

const seededAt = '2026-08-24T10:20:00.000Z'

function seed(well: Well): WellCoreWorkspace {
  const base = Math.max(0, Math.min(112.4, well.depth - 8))
  const run1 = `CORE-RUN-${well.id}-01`
  const run2 = `CORE-RUN-${well.id}-02`
  return {
    wellId: well.id,
    runs: [
      {
        id: run1,
        number: '1',
        depthFrom: base,
        depthTo: base + 4,
        recoveredLength: 3.72,
        measurements: [{
          id: `CORE-MEASURE-${well.id}-01`,
          measurementDate: '2026-08-18T10:30',
          operator: 'Марат Омаров',
          note: 'Контрольный радиометрический промер после укладки керна.',
          columnType: 'DRILLING',
          intervals: [
            { id: `CORE-MEASURE-DEPTH-${well.id}-01`, depthFrom: base, depthTo: base + 0.1, doseRate: 18.4 },
            { id: `CORE-MEASURE-DEPTH-${well.id}-02`, depthFrom: base + 0.1, depthTo: base + 0.2, doseRate: null },
          ],
        }],
      },
      { id: run2, number: '2', depthFrom: base + 4, depthTo: base + 8, recoveredLength: 3.54, measurements: [] },
    ],
    samples: [
      {
        id: `CORE-SAMPLE-${well.id}-01`,
        number: `К-${well.code}-001`,
        sampleType: 'Керновая',
        samplingDate: '2026-08-19T09:15',
        performer: 'Айгерим Садыкова',
        laboratory: 'Лаборатория КАП',
        comment: 'Составная керновая проба.',
        intervals: [
          { id: `CORE-SAMPLE-DEPTH-${well.id}-01`, runId: run1, drillDepthFrom: base + 0.4, drillDepthTo: base + 0.8, adjustedDepthFrom: base + 0.42, adjustedDepthTo: base + 0.82 },
          { id: `CORE-SAMPLE-DEPTH-${well.id}-02`, runId: run1, drillDepthFrom: base + 1.2, drillDepthTo: base + 1.6, adjustedDepthFrom: base + 1.24, adjustedDepthTo: base + 1.64 },
        ],
        results: [
          { id: `CORE-SAMPLE-RESULT-${well.id}-01`, analyte: 'U', value: 0.001, qualifier: '<', unit: '%' },
          { id: `CORE-SAMPLE-RESULT-${well.id}-02`, analyte: 'Ra', value: 0, qualifier: '', unit: 'Бк/кг' },
          { id: `CORE-SAMPLE-RESULT-${well.id}-03`, analyte: 'Se', value: null, qualifier: '', unit: 'мг/кг' },
        ],
      },
    ],

    updatedAt: seededAt,
  }
}

function record(well: Well, value: WellCoreWorkspace): DemoRecord<WellCoreWorkspace> {
  return { id: `well-core:${well.id}`, entityType: 'well-core-workspace', objectId: well.id, scopeId: well.site, status: 'draft', updatedAt: value.updatedAt, data: structuredClone(value) }
}

export class DemoWellCoreRepository {
  constructor(private readonly database = demoDatabase) {}

  async get(well: Well) {
    const existing = await this.database.get<DemoRecord<WellCoreWorkspace>>('records', `well-core:${well.id}`)
    if (existing) {
      const data = structuredClone(existing.data)
      for (const run of data.runs) for (const measurement of run.measurements) measurement.operator = measurement.operator.replace(/ · synthetic$/, '')
      for (const sample of data.samples) {
        sample.performer = sample.performer.replace(/ · synthetic$/, '')
        sample.laboratory = sample.laboratory.replace(/ · synthetic$/, '')
        if (sample.comment === 'Составная керновая проба для демонстрационного прототипа.') sample.comment = 'Составная керновая проба.'
      }
      return data
    }
    const value = seed(well)
    await this.persist(well, value, 'well-core.seeded')
    return value
  }

  async save(well: Well, _current: WellCoreWorkspace, next: WellCoreWorkspace, eventType: string) {
    const value = { ...structuredClone(next), wellId: well.id, updatedAt: new Date().toISOString() }
    await this.persist(well, value, eventType)
    return value
  }

  private async persist(well: Well, value: WellCoreWorkspace, eventType: string) {
    await this.database.transaction(['records', 'auditEvents'], async (transaction) => {
      await transaction.put('records', record(well, value))

      await transaction.put('auditEvents', {
        id: `AUD-${eventType}-${well.id}-${crypto.randomUUID()}`,
        eventType,
        entityType: 'well-core',
        entityId: well.id,
        actor: { id: 'PERSON-R1-GEOLOGIST', type: 'user', name: 'Айгерим Садыкова' },
        occurredAt: value.updatedAt,
        status: 'accepted',
        payload: { metadata: { synthetic: true } },
      })
    })
  }
}

export const demoWellCoreRepository = new DemoWellCoreRepository()
