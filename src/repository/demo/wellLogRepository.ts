import type { Well } from '../../entities/well/model/types'
import type { LogCurve, LogImportStaging, LogRunV2, WellLogWorkspace } from '../../entities/well-log/model/types'
import { demoDatabase, type DemoRecord } from './demoDatabase'

const now = () => new Date().toISOString()
const rec = <T>(id: string, entityType: string, well: Well, data: T, status = 'active'): DemoRecord<T> => ({ id, entityType, objectId: well.id, scopeId: well.site, status, updatedAt: now(), data: structuredClone(data) })
const curves = (): LogCurve[] => [
  { id: 'CURVE-GR-01', code: 'GR', label: 'Gamma Ray', unit: 'API', scale: 'linear', color: '#138b7a', version: 1 },
  { id: 'CURVE-SP-01', code: 'SP', label: 'Self potential', unit: 'mV', scale: 'linear', color: '#3969c8', version: 1 },
  { id: 'CURVE-RES-01', code: 'RES', label: 'Resistivity', unit: 'Ωm', scale: 'log', color: '#aa6a17', version: 1 },
]
function seed(well: Well): WellLogWorkspace {
  const run: LogRunV2 = { id: `LOGV2-${well.id}-01`, name: 'ГК+ПС · апрель 2026', source: 'LAS', from: 0, to: well.depth, step: .2, status: 'qc_issues', version: 1, curves: curves(), rawArtifactId: `RAW-LOG-${well.id}-01`, parserProfile: 'LAS 2.0' }
  return { wellId: well.id, runs: [run], layouts: [{ id: `LAYOUT-${well.id}-01`, name: 'Стандартный каротаж', trackOrder: ['GR', 'SP', 'RES'], widths: { GR: 1, SP: 1, RES: 1 }, visibleRange: { from: 240, to: 460 }, selectedDepth: 418.2, overlay: false, version: 1 }], activeLayoutId: `LAYOUT-${well.id}-01`, markers: [{ id: 'MARK-GAP-01', depth: 281.6, label: 'Gap 1,4 м', kind: 'gap' }, { id: 'MARK-SPIKE-01', depth: 418.2, label: 'GR spike', kind: 'spike' }], version: 1, updatedAt: '2026-08-24T00:00:00.000Z' }
}
export class DemoWellLogRepository {
  async get(well: Well) { const existing = await demoDatabase.get<DemoRecord<WellLogWorkspace>>('records', `well-log-v2:${well.id}`); if (existing) return structuredClone(existing.data); const value = seed(well); await this.persist(well, value, 'log.seeded'); return value }
  async save(well: Well, current: WellLogWorkspace, next: WellLogWorkspace, eventType: string) { const latest = await this.get(well); if (latest.version !== current.version) throw new Error('VERSION_CONFLICT: набор ГИС изменён в другой вкладке.'); const value = { ...structuredClone(next), version: latest.version + 1, updatedAt: now() }; await this.persist(well, value, eventType); return value }
  async beginImport(well: Well, current: WellLogWorkspace, source: 'bundled fixture' | 'local demo fixture') {
    const staging: LogImportStaging = { id: `STAGING-LOG-${well.id}-${current.version + 1}`, fileName: source === 'bundled fixture' ? 'WELL-1042_QC_2026-08.LAS' : 'LOCAL_LOG_FIXTURE.DAT', sizeLabel: source === 'bundled fixture' ? '18,4 MB' : '2,1 MB', checksum: source === 'bundled fixture' ? 'sha256:demo-a41c' : 'sha256:demo-b993', source, parserProfile: source === 'bundled fixture' ? 'LAS 2.0' : 'DAT station', depthChannel: 'DEPT', depthUnit: 'м', nullValue: -999.25, mapping: [{ source: 'DEPT', target: 'ignore', unit: 'м' }, { source: 'GR', target: 'GR', unit: 'API' }, { source: 'SP', target: 'SP', unit: 'mV' }, { source: 'RES', target: 'RES', unit: 'Ωm' }], issues: [{ id: 'QC-GAP', severity: 'warning', text: 'Gap 281,6–283,0 м' }, { id: 'QC-SPIKE', severity: 'warning', text: 'Spike GR на 418,2 м' }], rejectedRows: 2, state: 'parsed' }
    return this.save(well, current, { ...current, staging }, 'log.fixture.selected')
  }
  async applyImport(well: Well, current: WellLogWorkspace) {
    const staging = current.staging
    if (!staging || staging.state !== 'qc_ready') throw new Error('Сначала подтвердите mapping и QC preview.')
    const run: LogRunV2 = { id: `LOGV2-${well.id}-${current.runs.length + 1}`, name: `${staging.fileName} · imported`, source: staging.fileName.endsWith('.DAT') ? 'DAT' : 'LAS', from: 0, to: well.depth, step: .2, status: staging.issues.some((issue) => issue.severity === 'error') ? 'qc_issues' : 'qc_passed', version: 1, curves: curves().map((curve) => ({ ...curve, id: `${curve.id}-I${current.runs.length + 1}` })), rawArtifactId: `RAW-${staging.id}`, parserProfile: staging.parserProfile }
    return this.save(well, current, { ...current, runs: [...current.runs, run], staging: { ...staging, state: 'applied' } }, 'log.import.applied')
  }
  private async persist(well: Well, value: WellLogWorkspace, eventType: string) {
    await demoDatabase.transaction(['records', 'versions', 'relations', 'auditEvents', 'jobs', 'artifacts', 'preferences'], async (tx) => {
      const jobId = `JOB-LOG-${well.id}-V${value.version}`
      await tx.put('records', rec(`well-log-v2:${well.id}`, 'well-log-workspace', well, value))
      for (const run of value.runs) { await tx.put('records', rec(`log-run:${run.id}`, 'log-run', well, run, run.status)); for (const curve of run.curves) await tx.put('records', rec(`log-curve:${curve.id}`, 'log-curve', well, curve)) }
      if (value.staging) await tx.put('records', rec(`log-staging:${value.staging.id}`, 'log-staging', well, value.staging, value.staging.state))
      for (const marker of value.markers) await tx.put('records', rec(`log-marker:${marker.id}`, 'log-marker', well, marker))
      const active = value.layouts.find((layout) => layout.id === value.activeLayoutId)
      if (active) await tx.put('preferences', { ...active, updatedAt: value.updatedAt })
      if (value.mainCurve) await tx.put('records', rec(`main-curve:${well.id}`, 'main-curve-selection', well, value.mainCurve, value.mainCurve.status))
      await tx.put('versions', { id: `LOG-WORKSPACE-${well.id}-V${value.version}`, objectId: `well-log-v2:${well.id}`, version: value.version, status: 'draft', createdAt: value.updatedAt, data: value })
      await tx.put('relations', { id: `REL-LOG-WELL-${well.id}`, fromId: `well-log-v2:${well.id}`, toId: `well:${well.id}`, type: 'logs-of', updatedAt: value.updatedAt })
      for (const run of value.runs) for (const curve of run.curves) for (const sourceCurveId of curve.sourceCurveIds ?? []) await tx.put('relations', { id: `REL-CURVE-${curve.id}-${sourceCurveId}`, fromId: `log-curve:${curve.id}`, toId: `log-curve:${sourceCurveId}`, type: 'derived-from', updatedAt: value.updatedAt })
      await tx.put('jobs', { id: jobId, kind: eventType.includes('transform') ? 'curve-transform' : eventType.includes('merge') ? 'curve-merge' : eventType.includes('import') || eventType.includes('fixture') ? 'log-import' : 'curve-viewer', status: 'succeeded', createdAt: value.updatedAt, completedAt: value.updatedAt, synthetic: true })
      await tx.put('artifacts', { id: `ART-LOG-${well.id}-V${value.version}`, kind: eventType.includes('import') || eventType.includes('fixture') ? 'raw-log-file' : eventType.includes('transform') ? 'derived-curve-preview' : 'curve-chunk', name: `${well.code}-logs-v${value.version}`, createdAt: value.updatedAt, synthetic: true })
      await tx.put('auditEvents', { id: `AUD-${eventType}-${well.id}-V${value.version}`, eventType, entityType: 'well-log', entityId: well.id, actor: { id: 'PERSON-R2-GEOPHYSICIST', type: 'user', name: 'Марат Омаров · synthetic' }, occurredAt: value.updatedAt, status: 'accepted', payload: { metadata: { synthetic: true, jobId } } })
    })
  }
}
export const demoWellLogRepository = new DemoWellLogRepository()
