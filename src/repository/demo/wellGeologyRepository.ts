import type { GeologicalInterval, Well } from '../../entities/well/model/types'
import type { GeologyTrack, WellGeologyWorkspace } from '../../entities/well-geology/model/types'
import { getGeologyData } from '../data/wellGeology'
import { getLabResults } from '../data/labResults'
import { getSamples } from '../data/wellSamples'
import { demoDatabase, type DemoRecord } from './demoDatabase'

const now = () => new Date().toISOString()
const record = <T>(id: string, type: string, well: Well, data: T, status = 'active'): DemoRecord<T> => ({ id, entityType: type, objectId: well.id, scopeId: well.site, status, updatedAt: now(), data: structuredClone(data) })
const cloneTrack = (id: string, kind: GeologyTrack['kind'], label: string, source: GeologyTrack['source'], intervals: GeologicalInterval[]): GeologyTrack => ({ id, kind, label, source, intervals: structuredClone(intervals), version: 1, status: 'draft' })

function seed(well: Well): WellGeologyWorkspace {
  const core = getGeologyData(well).intervals
  const tracks = [cloneTrack(`TRACK-CORE-${well.id}`, 'core', 'Керн', 'Керн', core), cloneTrack(`TRACK-LOG-${well.id}`, 'log', 'ГИС', 'ГИС', core.map((item) => ({ ...item, id: `LOG-${item.id}`, source: 'ГИС' }))), cloneTrack(`TRACK-COMPOSITE-${well.id}`, 'composite', 'Composite', 'Composite', core.map((item) => ({ ...item, id: `COMP-${item.id}`, source: 'Ручное описание' }))), cloneTrack(`TRACK-STRAT-${well.id}`, 'stratigraphy', 'Стратиграфия', 'Ручное описание', core)]
  const samples = getSamples(well).map((item, index) => ({ ...item, linkedIntervals: item.linkedIntervalId ? [item.linkedIntervalId] : [], depthSource: index % 2 ? 'composite' as const : 'core' as const, workflow: item.status === 'Результат получен' ? 'result' as const : item.status === 'Отправлена в лабораторию' ? 'laboratory' as const : item.status === 'Зарегистрирована' ? 'requested' as const : 'collection' as const, version: 1 }))
  const dictionaries = [{ id: 'DICT-LITH-SAND', dictionary: 'lithology' as const, code: 'SANDSTONE', labels: { ru: 'Песчаник', kz: 'Құмтас', en: 'Sandstone' }, effectiveFrom: '2026-01-01', version: 1, status: 'active' as const }, { id: 'DICT-MIN-U', dictionary: 'mineralization' as const, code: 'U-MIN', labels: { ru: 'Урановая минерализация', kz: 'Уран минералдануы', en: 'Uranium mineralization' }, effectiveFrom: '2026-01-01', version: 1, status: 'active' as const }, { id: 'DICT-COLOR-GRAY', dictionary: 'color' as const, code: 'GRAY', labels: { ru: 'Серый', kz: 'Сұр', en: 'Gray' }, effectiveFrom: '2026-01-01', version: 1, status: 'active' as const }, { id: 'DICT-STR-K2', dictionary: 'stratigraphy' as const, code: 'K2', labels: { ru: 'Верхний мел', kz: 'Жоғарғы бор', en: 'Upper Cretaceous' }, effectiveFrom: '2026-01-01', version: 1, status: 'active' as const }]
  const granulometry = samples.slice(0, 1).map((sample) => ({ id: `GRAN-${sample.id}`, sampleId: sample.id, bins: [{ sizeMm: .1, massPercent: 12 }, { sizeMm: .4, massPercent: 46 }, { sizeMm: 1.2, massPercent: 42 }], sga: 0.42, d10: .1, d60: 1.2, method: 'Synthetic SGA/d60/d10', version: 1 }))
  return { wellId: well.id, tracks, dictionaries, overrides: [], samples, labResults: getLabResults(well.id), granulometry, lims: [], version: 1, updatedAt: '2026-08-24T00:00:00.000Z' }
}

export class DemoWellGeologyRepository {
  async get(well: Well) { const current = await demoDatabase.get<DemoRecord<WellGeologyWorkspace>>('records', `well-geology-v2:${well.id}`); if (current) return structuredClone(current.data); const value = seed(well); await this.persist(well, value, 'geology.seeded'); return value }
  async save(well: Well, current: WellGeologyWorkspace, next: WellGeologyWorkspace, eventType: string) { const latest = await this.get(well); if (latest.version !== current.version) throw new Error('VERSION_CONFLICT: геологический workspace изменён в другой вкладке.'); const value = { ...structuredClone(next), version: latest.version + 1, updatedAt: now() }; await this.persist(well, value, eventType); return value }
  private async persist(well: Well, value: WellGeologyWorkspace, eventType: string) {
    await demoDatabase.transaction(['records', 'versions', 'relations', 'auditEvents', 'jobs', 'artifacts'], async (tx) => {
      const jobId = `JOB-GEOLOGY-${well.id}-V${value.version}`
      await tx.put('records', record(`well-geology-v2:${well.id}`, 'well-geology-workspace', well, value))
      for (const track of value.tracks) await tx.put('records', record(`geological-track:${track.id}`, 'geological-track', well, track, track.status))
      for (const entry of value.dictionaries) await tx.put('records', record(`dictionary-entry:${entry.id}`, 'dictionary-entry', well, entry, entry.status))
      for (const override of value.overrides) { await tx.put('records', record(`description-override:${override.id}`, 'description-override', well, override)); await tx.put('relations', { id: `REL-OVERRIDE-${override.id}`, fromId: `description-override:${override.id}`, toId: `geological-track:${override.trackId}`, type: 'description-override-of', updatedAt: value.updatedAt }) }
      for (const sample of value.samples) { await tx.put('records', record(`sample:${sample.id}`, 'sample', well, sample, sample.workflow)); for (const intervalId of sample.linkedIntervals) await tx.put('relations', { id: `REL-SAMPLE-${sample.id}-${intervalId}`, fromId: `sample:${sample.id}`, toId: `geological-interval:${intervalId}`, type: 'sample-depth-link', updatedAt: value.updatedAt }) }
      for (const lab of value.labResults) await tx.put('records', record(`lab-result:${lab.id}`, 'lab-result', well, lab, lab.qaStatus))
      for (const run of value.granulometry) await tx.put('records', record(`granulometry-run:${run.id}`, 'granulometry-run', well, run))
      for (const stage of value.lims) await tx.put('records', record(`lims-staging:${stage.id}`, 'integration-staging', well, stage, stage.state))
      await tx.put('versions', { id: `WELL-GEOLOGY-V2-${well.id}-V${value.version}`, objectId: `well-geology-v2:${well.id}`, version: value.version, status: 'draft', createdAt: value.updatedAt, data: value })
      await tx.put('jobs', { id: jobId, kind: eventType.includes('lims') ? 'lims-reconciliation' : 'granulometry', status: 'succeeded', createdAt: value.updatedAt, completedAt: value.updatedAt, synthetic: true })
      await tx.put('artifacts', { id: `ART-GEOLOGY-${well.id}-V${value.version}`, kind: eventType.includes('batch') ? 'sample-labels' : 'granulometry-chart', name: `${well.code}-geology-v${value.version}`, createdAt: value.updatedAt, synthetic: true })
      await tx.put('auditEvents', { id: `AUD-${eventType}-${well.id}-V${value.version}`, eventType, entityType: 'well-geology', entityId: well.id, actor: { id: 'PERSON-R1-GEOLOGIST', type: 'user', name: 'Айгерим Садыкова · synthetic' }, occurredAt: value.updatedAt, status: 'accepted', payload: { metadata: { synthetic: true, jobId } } })
    })
  }
}
export const demoWellGeologyRepository = new DemoWellGeologyRepository()
