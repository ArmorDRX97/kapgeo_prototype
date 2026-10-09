import type { GeologicalInterval, Well } from '../../entities/well/model/types'
import type { GeologyTrack, WellGeologyWorkspace } from '../../entities/well-geology/model/types'
import { getGeologyData } from '../data/wellGeology'
import { getLabResults } from '../data/labResults'
import { getSamples } from '../data/wellSamples'
import { demoDatabase, type DemoRecord } from './demoDatabase'

const now = () => new Date().toISOString()
const record = <T>(id: string, type: string, well: Well, data: T, status = 'active'): DemoRecord<T> => ({ id, entityType: type, objectId: well.id, scopeId: well.site, status, updatedAt: now(), data: structuredClone(data) })
const cloneTrack = (id: string, kind: GeologyTrack['kind'], label: string, source: GeologyTrack['source'], intervals: GeologicalInterval[]): GeologyTrack => ({ id, kind, label, source, intervals: structuredClone(intervals), status: 'draft' })

function seed(well: Well): WellGeologyWorkspace {
  const core = getGeologyData(well).intervals
  const coreLithology = core.map((item) => ({ ...item, source: 'Керн' as const }))
  const logBoundaries = [[0, 118], [118, 284], [284, 326], [326, 454], [454, well.depth]]
  const compositeBoundaries = [[0, 120], [120, 282], [282, 330], [330, 452], [452, well.depth]]
  const log = core.map((item, index) => ({ ...item, id: `LOG-${item.id}`, from: logBoundaries[index]?.[0] ?? item.from, to: logBoundaries[index]?.[1] ?? item.to, description: `Интерпретация по каротажу. ${item.description}`, source: 'ГИС' as const }))
  const composite = core.map((item, index) => ({ ...item, id: `COMP-${item.id}`, from: compositeBoundaries[index]?.[0] ?? item.from, to: compositeBoundaries[index]?.[1] ?? item.to, description: `Согласованное сводное описание. ${item.description}`, source: 'Ручное описание' as const }))
  const tracks = [cloneTrack(`TRACK-CORE-${well.id}`, 'core', 'По керну', 'Керн', coreLithology), cloneTrack(`TRACK-LOG-${well.id}`, 'log', 'По каротажу', 'ГИС', log), cloneTrack(`TRACK-COMPOSITE-${well.id}`, 'composite', 'Сводная', 'Composite', composite), cloneTrack(`TRACK-STRAT-${well.id}`, 'stratigraphy', 'Стратиграфия', 'Ручное описание', core)]
  const samples = getSamples(well).map((item, index) => ({ ...item, linkedIntervals: item.linkedIntervalId ? [item.linkedIntervalId] : [], depthSource: index % 2 ? 'composite' as const : 'core' as const, workflow: item.status === 'Результат получен' ? 'result' as const : item.status === 'Отправлена в лабораторию' ? 'laboratory' as const : item.status === 'Зарегистрирована' ? 'requested' as const : 'collection' as const, }))
  const dictionaries = [{ id: 'DICT-LITH-SAND', dictionary: 'lithology' as const, code: 'SANDSTONE', labels: { ru: 'Песчаник', kz: 'Құмтас', en: 'Sandstone' }, effectiveFrom: '2026-01-01', status: 'active' as const }, { id: 'DICT-MIN-U', dictionary: 'mineralization' as const, code: 'U-MIN', labels: { ru: 'Урановая минерализация', kz: 'Уран минералдануы', en: 'Uranium mineralization' }, effectiveFrom: '2026-01-01', status: 'active' as const }, { id: 'DICT-COLOR-GRAY', dictionary: 'color' as const, code: 'GRAY', labels: { ru: 'Серый', kz: 'Сұр', en: 'Gray' }, effectiveFrom: '2026-01-01', status: 'active' as const }, { id: 'DICT-STR-K2', dictionary: 'stratigraphy' as const, code: 'K2', labels: { ru: 'Верхний мел', kz: 'Жоғарғы бор', en: 'Upper Cretaceous' }, effectiveFrom: '2026-01-01', status: 'active' as const }]
  const granulometry = samples.slice(0, 1).map((sample) => ({ id: `GRAN-${sample.id}`, sampleId: sample.id, bins: [{ sizeMm: .1, massPercent: 12 }, { sizeMm: .4, massPercent: 46 }, { sizeMm: 1.2, massPercent: 42 }], sga: 0.42, d10: .1, d60: 1.2, method: 'Synthetic SGA/d60/d10', }))
  return { wellId: well.id, tracks, dictionaries, overrides: [], samples, labResults: getLabResults(well.id), granulometry, lims: [], updatedAt: '2026-08-24T00:00:00.000Z' }
}

function hydrateBgdLithology(well: Well, current: WellGeologyWorkspace) {
  const template = seed(well)
  return {
    ...current,
    tracks: current.tracks.map((track) => {
      const templateTrack = template.tracks.find((item) => item.kind === track.kind)
      if (!templateTrack) return track
      return {
        ...track,
        label: templateTrack.label,
        intervals: track.intervals.map((interval) => {
          const templateInterval = templateTrack.intervals.find((item) => item.id === interval.id)
          if (!templateInterval) return interval
          return { ...interval, mineralization: interval.mineralization ?? templateInterval.mineralization, color: interval.color ?? templateInterval.color }
        }),
      }
    }),
  }
}

export class DemoWellGeologyRepository {
  async get(well: Well) { const current = await demoDatabase.get<DemoRecord<WellGeologyWorkspace>>('records', `well-geology-v2:${well.id}`); if (current) return structuredClone(hydrateBgdLithology(well, current.data)); const value = seed(well); await this.persist(well, value, 'geology.seeded'); return value }
  async save(well: Well, _current: WellGeologyWorkspace, next: WellGeologyWorkspace, eventType: string) { const value = { ...structuredClone(next), updatedAt: now() }; await this.persist(well, value, eventType); return value }
  private async persist(well: Well, value: WellGeologyWorkspace, eventType: string) {
    await demoDatabase.transaction(['records', 'relations', 'auditEvents', 'jobs', 'artifacts'], async (tx) => {
      const jobId = `JOB-GEOLOGY-${well.id}-${crypto.randomUUID()}`
      await tx.put('records', record(`well-geology-v2:${well.id}`, 'well-geology-workspace', well, value))
      for (const track of value.tracks) await tx.put('records', record(`geological-track:${track.id}`, 'geological-track', well, track, track.status))
      for (const entry of value.dictionaries) await tx.put('records', record(`dictionary-entry:${entry.id}`, 'dictionary-entry', well, entry, entry.status))
      for (const override of value.overrides) { await tx.put('records', record(`description-override:${override.id}`, 'description-override', well, override)); await tx.put('relations', { id: `REL-OVERRIDE-${override.id}`, fromId: `description-override:${override.id}`, toId: `geological-track:${override.trackId}`, type: 'description-override-of', updatedAt: value.updatedAt }) }
      for (const sample of value.samples) { await tx.put('records', record(`sample:${sample.id}`, 'sample', well, sample, sample.workflow)); for (const intervalId of sample.linkedIntervals) await tx.put('relations', { id: `REL-SAMPLE-${sample.id}-${intervalId}`, fromId: `sample:${sample.id}`, toId: `geological-interval:${intervalId}`, type: 'sample-depth-link', updatedAt: value.updatedAt }) }
      for (const lab of value.labResults) await tx.put('records', record(`lab-result:${lab.id}`, 'lab-result', well, lab, lab.qaStatus))
      for (const run of value.granulometry) await tx.put('records', record(`granulometry-run:${run.id}`, 'granulometry-run', well, run))
      for (const stage of value.lims) await tx.put('records', record(`lims-staging:${stage.id}`, 'integration-staging', well, stage, stage.state))

      await tx.put('jobs', { id: jobId, kind: eventType.includes('lims') ? 'lims-reconciliation' : 'granulometry', status: 'succeeded', createdAt: value.updatedAt, completedAt: value.updatedAt, synthetic: true })
      await tx.put('artifacts', { id: `ART-GEOLOGY-${well.id}-${crypto.randomUUID()}`, kind: eventType.includes('batch') ? 'sample-labels' : 'granulometry-chart', name: `${well.code}-geology`, createdAt: value.updatedAt, synthetic: true })
      await tx.put('auditEvents', { id: `AUD-${eventType}-${well.id}-${crypto.randomUUID()}`, eventType, entityType: 'well-geology', entityId: well.id, actor: { id: 'PERSON-R1-GEOLOGIST', type: 'user', name: 'Айгерим Садыкова' }, occurredAt: value.updatedAt, status: 'accepted', payload: { metadata: { synthetic: true, jobId } } })
    })
  }
}
export const demoWellGeologyRepository = new DemoWellGeologyRepository()
