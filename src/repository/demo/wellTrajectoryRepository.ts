import type { Well } from '../../entities/well/model/types'
import type { CoreRunV2, TrajectoryPoint, TrajectoryStation, WellTrajectoryWorkspace } from '../../entities/well-trajectory/model/types'
import { demoDatabase, type DemoRecord } from './demoDatabase'

const now = () => new Date().toISOString()
const rec = <T>(id: string, type: string, well: Well, data: T, status = 'active'): DemoRecord<T> => ({ id, entityType: type, objectId: well.id, scopeId: well.site, status, updatedAt: now(), data: structuredClone(data) })

function points(stations: TrajectoryStation[], correction: number): TrajectoryPoint[] {
  let previous = { md: 0, tvd: 0, northing: 0, easting: 0 }
  return stations.map((station) => {
    const delta = station.md - previous.md
    const radians = station.inclination * Math.PI / 180
    const azimuth = (station.azimuth + correction) * Math.PI / 180
    const point = { md: station.md, tvd: Number((previous.tvd + delta * Math.cos(radians)).toFixed(2)), northing: Number((previous.northing + delta * Math.sin(radians) * Math.cos(azimuth)).toFixed(2)), easting: Number((previous.easting + delta * Math.sin(radians) * Math.sin(azimuth)).toFixed(2)) }
    previous = point
    return point
  })
}

function seed(well: Well): WellTrajectoryWorkspace {
  const stations: TrajectoryStation[] = [0, 80, 180, 320, 460, well.depth].map((md, index) => ({ id: `ST-${well.id}-${index + 1}`, md, inclination: index === 0 ? 0 : Math.min(13, index * 2.3), azimuth: 132 + index * 4 }))
  const fallback: TrajectoryStation[] = [0, well.depth].map((md, index) => ({ id: `ST-V-${well.id}-${index}`, md, inclination: 0, azimuth: 0 }))
  const surveys = [
    { id: `SURVEY-${well.id}-A`, code: 'INC-2026-01', name: 'Инклинометрия · bundled fixture', source: 'bundled fixture' as const, method: 'mean-angle' as const, correction: 1.5, status: 'active' as const, version: 1, stations },
    { id: `SURVEY-${well.id}-V`, code: 'VERTICAL-DEMO', name: 'Вертикальный fallback', source: 'bundled fixture' as const, method: 'vertical fallback' as const, correction: 0, status: 'candidate' as const, version: 1, stations: fallback },
  ]
  const active = surveys[0]!
  const coreRuns: CoreRunV2[] = [
    { id: `CORE-${well.id}-01`, drillingFrom: 120, drillingTo: 220, interpretedFrom: 120, interpretedTo: 217.5, recovered: 91.2, state: 'core', version: 1 },
    { id: `CORE-${well.id}-02`, drillingFrom: 220, drillingTo: 305, interpretedFrom: 220, interpretedTo: 300.5, recovered: 88.4, state: 'core', version: 1 },
    { id: `CORE-${well.id}-03`, drillingFrom: 305, drillingTo: 345, interpretedFrom: 305, interpretedTo: 305, recovered: 0, state: 'no-core', version: 1 },
  ]
  return { wellId: well.id, selectedSurveyId: active.id, surveys, activeResult: { surveyId: active.id, version: 1, points: points(active.stations, active.correction), extrapolated: active.stations.at(-1)!.md < well.depth, generatedAt: '2026-08-24T00:00:00.000Z' }, coreRuns, measurements: [{ id: `BIN-${well.id}-01`, runId: coreRuns[0]!.id, from: 120, to: 130, sizeMm: 42, count: 14 }, { id: `BIN-${well.id}-02`, runId: coreRuns[1]!.id, from: 220, to: 230, missing: true }], boxes: [{ id: `BOX-${well.id}-01`, runId: coreRuns[0]!.id, barcode: `KAP-${well.code}-001`, from: 120, to: 134, storage: 'Кернохранилище A · стеллаж 14', photoLabel: 'synthetic-photo-01', version: 1 }], version: 1, updatedAt: '2026-08-24T00:00:00.000Z' }
}

export class DemoWellTrajectoryRepository {
  async get(well: Well) { const existing = await demoDatabase.get<DemoRecord<WellTrajectoryWorkspace>>('records', `well-trajectory:${well.id}`); if (existing) return structuredClone(existing.data); const value = seed(well); await this.persist(well, value, 'trajectory.seeded'); return value }
  async save(well: Well, current: WellTrajectoryWorkspace, next: WellTrajectoryWorkspace, eventType: string) {
    const latest = await this.get(well)
    if (latest.version !== current.version) throw new Error('VERSION_CONFLICT: траектория или керн изменены в другой вкладке.')
    const value = { ...structuredClone(next), version: latest.version + 1, updatedAt: now() }
    await this.persist(well, value, eventType)
    return value
  }
  async selectSurvey(well: Well, current: WellTrajectoryWorkspace, surveyId: string) {
    const survey = current.surveys.find((item) => item.id === surveyId)
    if (!survey) throw new Error('Набор инклинометрии не найден.')
    const next = { ...current, selectedSurveyId: surveyId, surveys: current.surveys.map((item) => ({ ...item, status: item.id === surveyId ? 'active' as const : item.status === 'active' ? 'candidate' as const : item.status })), activeResult: { surveyId, version: current.activeResult.version + 1, points: points(survey.stations, survey.correction), extrapolated: survey.stations.at(-1)!.md < well.depth, generatedAt: now() } }
    return this.save(well, current, next, 'trajectory.survey.selected')
  }
  async importFixture(well: Well, current: WellTrajectoryWorkspace) {
    const nextSurvey = { id: `SURVEY-${well.id}-LOCAL-${current.surveys.length + 1}`, code: `LOCAL-${current.surveys.length + 1}`, name: 'Локальный synthetic fixture', source: 'local demo fixture' as const, method: 'mean-angle' as const, correction: 0.8, status: 'candidate' as const, version: 1, stations: [0, 100, 250, well.depth].map((md, index) => ({ id: `LOCAL-ST-${index}`, md, inclination: index * 3.1, azimuth: 141 + index * 3 })) }
    return this.save(well, current, { ...current, surveys: [...current.surveys, nextSurvey] }, 'trajectory.fixture.imported')
  }
  private async persist(well: Well, value: WellTrajectoryWorkspace, eventType: string) {
    await demoDatabase.transaction(['records', 'versions', 'auditEvents', 'relations', 'jobs', 'artifacts', 'preferences'], async (tx) => {
      const jobId = `JOB-TRAJECTORY-${well.id}-V${value.version}`
      const artifactId = `ART-TRAJECTORY-${well.id}-V${value.version}`
      await tx.put('records', rec(`well-trajectory:${well.id}`, 'well-trajectory', well, value))
      await tx.put('records', rec(`trajectory-result:${well.id}`, 'trajectory-result', well, value.activeResult))
      await tx.put('records', rec(`validation-trajectory:${well.id}`, 'validation-report', well, { coreRuns: value.coreRuns.length, selectedSurveyId: value.selectedSurveyId }))
      for (const survey of value.surveys) await tx.put('records', rec(`trajectory-survey:${survey.id}`, 'trajectory-survey', well, survey, survey.status))
      for (const run of value.coreRuns) await tx.put('records', rec(`core-run:${run.id}`, 'core-run', well, run, run.state))
      for (const bin of value.measurements) await tx.put('records', rec(`core-measurement:${bin.id}`, 'core-measurement', well, bin, bin.missing ? 'missing' : 'active'))
      for (const box of value.boxes) await tx.put('records', rec(`core-box:${box.id}`, 'core-box', well, box))
      await tx.put('versions', { id: `TRAJECTORY-${well.id}-V${value.version}`, objectId: `trajectory:${well.id}`, version: value.version, status: 'draft', createdAt: value.updatedAt, data: value })
      await tx.put('relations', { id: `REL-TRAJECTORY-WELL-${well.id}`, fromId: `trajectory-result:${well.id}`, toId: `well:${well.id}`, type: 'trajectory-of', updatedAt: value.updatedAt })
      await tx.put('relations', { id: `REL-CORE-LITHOLOGY-${well.id}`, fromId: `well-trajectory:${well.id}`, toId: `well-geology:${well.id}`, type: 'core-depth-preview', updatedAt: value.updatedAt })
      await tx.put('relations', { id: `REL-CORE-SAMPLES-${well.id}`, fromId: `well-trajectory:${well.id}`, toId: `well-samples:${well.id}`, type: 'core-depth-preview', updatedAt: value.updatedAt })
      await tx.put('jobs', { id: jobId, kind: 'trajectory-calculation', status: 'succeeded', createdAt: value.updatedAt, completedAt: value.updatedAt, input: { surveyId: value.selectedSurveyId, method: value.surveys.find((item) => item.id === value.selectedSurveyId)?.method }, synthetic: true })
      await tx.put('artifacts', { id: artifactId, kind: eventType.includes('import') ? 'import-protocol' : 'trajectory-csv', name: `${well.code}-trajectory-v${value.version}.csv`, createdAt: value.updatedAt, synthetic: true, source: eventType.includes('import') ? 'mapping: MD/inclination/azimuth · replace diff: none' : 'mean-angle result' })
      await tx.put('preferences', { id: `workspace:trajectory:${well.id}`, selectedSurveyId: value.selectedSurveyId, view: 'table-plan-profile', updatedAt: value.updatedAt })
      await tx.put('auditEvents', { id: `AUD-${eventType}-${well.id}-V${value.version}`, eventType, entityType: 'well-trajectory', entityId: well.id, actor: { id: 'PERSON-R1-GEOLOGIST', type: 'user', name: 'Айгерим Садыкова · synthetic' }, occurredAt: value.updatedAt, status: 'accepted', payload: { metadata: { synthetic: true, jobId, artifactId } } })
    })
  }
}
export const demoWellTrajectoryRepository = new DemoWellTrajectoryRepository()
