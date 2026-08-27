import type { CreateWellInput, LabResult, Sample, UpdateWellInput, Well, WellGeologyData, WellTechnicalData } from '../entities/well/model/types'
import type { SaveWellPassportCommand } from './contracts/geology'
import { demoWellPassportRepository } from './demo/wellPassportRepository'
import { demoWellDataRepository } from './demo/wellDataRepository'
import { createPoint, crsFromLegacy, validateGeometry } from '../shared/scientific/geometry'
import type { CreateScientificJobInput } from '../shared/scientific/jobs'
import { demoScientificJobRepository } from './demo/scientificJobRepository'
import { demoGeologyWorkflowRepository, type CompareResolution, type DeliveryDraft, type InterpretationDecision, type ReserveDraft } from './demo/geologyWorkflowRepository'
import { demoPreferencesRepository, type GeologyMapWorkspacePreferences, type PlatformPreferences, type WellRegistryPreferences } from './demo/demoPreferencesRepository'
import { demoGeologyPublicationRepository } from './demo/geologyPublicationRepository'
import type { GeologyPublicationWorkspace, PublicationConsumer } from '../entities/geology-publication/model/types'
import { demoMethodologyCenterRepository } from './demo/methodologyCenterRepository'
import type { MethodologyCenterWorkspace } from '../entities/methodology-center/model/types'
import { demoDatabase } from './demo/demoDatabase'
import { demoGeologyMasterRepository } from './demo/geologyMasterRepository'
import { demoWellMasterRepository } from './demo/wellMasterRepository'
import { demoWellTrajectoryRepository } from './demo/wellTrajectoryRepository'
import { demoWellGeologyRepository } from './demo/wellGeologyRepository'
import { demoWellLogRepository } from './demo/wellLogRepository'
import { demoWellInterpretationRepository } from './demo/wellInterpretationRepository'
import { demoWellOutputRepository } from './demo/wellOutputRepository'
import { demoSectionProjectRepository } from './demo/sectionProjectRepository'
import { demoReserveProjectRepository } from './demo/reserveProjectRepository'
import { demoGeologicalModelRepository } from './demo/geologicalModelRepository'
import { demoDgmRepository } from './demo/dgmRepository'
import type { WellGeologyWorkspace } from '../entities/well-geology/model/types'
import type { WellLogWorkspace } from '../entities/well-log/model/types'
import type { InterpretationWorkspace } from '../entities/well-interpretation/model/types'
import type { OutputWorkspace } from '../entities/well-output/model/types'
import type { SectionProjectWorkspace } from '../entities/section-project/model/types'
import type { ReserveProjectWorkspace } from '../entities/reserve-project/model/types'
import type { GeologicalModelWorkspace } from '../entities/geological-model/model/types'
import type { DgmWorkspace } from '../entities/dgm/model/types'
import type { WellTrajectoryWorkspace } from '../entities/well-trajectory/model/types'
import type { ConditionSet, CreateDepositInput, Deposit, GeologicalLens, GeologicalMasterData, GeologicalSite, UpdateDepositPatch } from '../entities/geology-master/model/types'
import type { WellAssignment, WellMasterAggregateData, WellMasterAggregateKind, WellMasterWorkspace } from '../entities/well-master/model/types'
import type { AuditEvent } from '../shared/audit'
import { demoGeologyTourRepository } from './demo/geologyTourRepository'
import type { GeologyTourProgress } from '../entities/geology-tour/model/types'

const wait = (duration = 280) => new Promise((resolve) => window.setTimeout(resolve, duration))

export async function fetchWells() {
  await wait()
  return demoWellDataRepository.listWells()
}

export async function fetchWell(wellId: string) {
  await wait(180)
  return demoWellDataRepository.getWell(wellId)
}

export async function createWell(input: CreateWellInput): Promise<Well> {
  await wait(420)
  const hasCoordinates = input.bgd
    ? input.bgd.geometry.headX !== null && input.bgd.geometry.headY !== null
    : true
  if (hasCoordinates) {
    const location = createPoint([input.coordinates.x, input.coordinates.y], crsFromLegacy(input.crs))
    const geometryError = validateGeometry(location).find((issue) => issue.severity === 'error')
    if (geometryError) throw new Error(`Координаты устья не прошли проверку: ${geometryError.message}`)
  }

  const existingWells = await demoWellDataRepository.listWells()
  const nearDuplicate = hasCoordinates ? existingWells.find((item) => (item.bgd?.depositId ?? 'DEP-SARYTAU') === (input.bgd?.depositId ?? input.depositId ?? 'DEP-SARYTAU')
    && Math.hypot(item.coordinates.x - input.coordinates.x, item.coordinates.y - input.coordinates.y) < 25) : undefined
  if (nearDuplicate) throw new Error('Пространственный duplicate-check: устье ближе 25 м к ' + nearDuplicate.code + '.')
  const numericCode = Number(input.code.replace(/\D/g, '')) || 1000
  const depositId = input.bgd?.depositId ?? input.depositId ?? 'DEP-SARYTAU'
  const wellId = input.bgd && depositId !== 'DEP-SARYTAU' ? `WELL-${numericCode}-${depositId.replace(/^DEP-/, '')}` : `WELL-${numericCode}`
  const well: Well = {
    ...input,
    id: wellId,
    code: input.bgd ? String(input.bgd.name) : input.code,
    status: input.bgd?.statusHistory.at(-1)?.status ?? 'На проверке',
    quality: 'Среднее',
    block: input.block ?? 'Не назначен',
    cell: input.cell ?? '—',
    mapPosition: { x: 18 + (numericCode * 17) % 68, y: 16 + (numericCode * 29) % 70 },
    updatedAt: 'Только что',
    completeness: 68,
    activeTask: 'Заполнить паспорт и проверить координаты',
    aiConflicts: 0,
    version: 1,
  }
  const created = await demoWellDataRepository.createWell(well)
  const workspace = await demoWellMasterRepository.getWorkspace(created)
  if (input.depositId || input.siteId || input.lensId || input.projectCode) {
    await demoWellMasterRepository.saveAssignment(created, workspace, { depositId: input.depositId ?? workspace.assignment.depositId, siteId: input.siteId ?? workspace.assignment.siteId, lensId: input.lensId ?? workspace.assignment.lensId, projectCode: input.projectCode ?? workspace.assignment.projectCode })
  }
  return created
}

export async function updateWell(input: UpdateWellInput): Promise<Well> {
  await wait(360)
  const { wellId, expectedVersion, ...data } = input
  const current = await demoWellDataRepository.getWell(wellId)
  if ((current.version ?? 1) !== expectedVersion) throw new Error('VERSION_CONFLICT: скважина изменена в другой вкладке.')
  const next: Well = {
    ...current,
    ...data,
    id: current.id,
    code: data.bgd ? String(data.bgd.name) : data.code,
    status: data.bgd?.statusHistory.at(-1)?.status ?? current.status,
    version: current.version,
  }
  return demoWellDataRepository.updateWell(current, next)
}
export async function fetchWellTechnicalData(wellId: string) {
  await wait(160)
  return demoWellDataRepository.getTechnical(wellId)
}

export async function fetchWellTrajectoryWorkspace(wellId: string) { const well = await demoWellDataRepository.getWell(wellId); await wait(160); return demoWellTrajectoryRepository.get(well) }
export async function selectWellTrajectorySurvey(wellId: string, current: WellTrajectoryWorkspace, surveyId: string) { const well = await demoWellDataRepository.getWell(wellId); await wait(240); return demoWellTrajectoryRepository.selectSurvey(well, current, surveyId) }
export async function importWellTrajectoryFixture(wellId: string, current: WellTrajectoryWorkspace) { const well = await demoWellDataRepository.getWell(wellId); await wait(320); return demoWellTrajectoryRepository.importFixture(well, current) }
export async function saveWellTrajectoryWorkspace(wellId: string, current: WellTrajectoryWorkspace, next: WellTrajectoryWorkspace, eventType: string) { const well = await demoWellDataRepository.getWell(wellId); await wait(280); return demoWellTrajectoryRepository.save(well, current, next, eventType) }
export async function fetchWellPassportWorkspace(wellId: string) {
  await wait(160)
  return demoWellPassportRepository.getWorkspace(wellId)
}

export async function fetchWellPassportHistory(wellId: string) {
  await wait(130)
  return demoWellPassportRepository.getHistory(wellId)
}

export async function previewWellPassportImpact(command: Pick<SaveWellPassportCommand, 'wellId' | 'passport' | 'construction'>) {
  await wait(80)
  return demoWellPassportRepository.previewImpact(command.wellId, command.passport, command.construction)
}

export async function saveWellPassport(command: SaveWellPassportCommand) {
  await wait(360)
  return demoWellPassportRepository.save(command)
}

export async function saveWellTechnicalData(wellId: string, data: WellTechnicalData) {
  await wait(340)
  return demoWellDataRepository.saveTechnical(wellId, data)
}

export async function fetchWellGeologyWorkspace(wellId: string) { const well = await demoWellDataRepository.getWell(wellId); await wait(180); return demoWellGeologyRepository.get(well) }
export async function saveWellGeologyWorkspace(wellId: string, current: WellGeologyWorkspace, next: WellGeologyWorkspace, eventType: string) { const well = await demoWellDataRepository.getWell(wellId); await wait(300); return demoWellGeologyRepository.save(well, current, next, eventType) }
export async function fetchWellGeologyData(wellId: string) {
  await wait(180)
  return demoWellDataRepository.getGeology(wellId)
}

export async function saveWellGeologyData(wellId: string, data: WellGeologyData) {
  await wait(360)
  return demoWellDataRepository.saveGeology(wellId, data)
}

export async function fetchWellSamples(wellId: string) {
  await wait(180)
  return demoWellDataRepository.getSamples(wellId)
}

export async function saveWellSamples(wellId: string, samples: Sample[]) {
  await wait(340)
  return demoWellDataRepository.saveSamples(wellId, samples)
}

export async function fetchLabResults(wellId: string) {
  await wait(180)
  return demoWellDataRepository.getLabResults(wellId)
}

export async function saveLabResults(wellId: string, results: LabResult[]) {
  await wait(340)
  return demoWellDataRepository.saveLabResults(wellId, results)
}

export async function fetchWellLogs(wellId: string) { await wait(180); return demoWellDataRepository.getLogs(wellId) }
export async function fetchWellInterpretationWorkspace(wellId: string) { const well = await demoWellDataRepository.getWell(wellId); await wait(180); return demoWellInterpretationRepository.get(well) }
export async function fetchWellOutputWorkspace(wellId: string) { const well = await demoWellDataRepository.getWell(wellId); await wait(180); return demoWellOutputRepository.get(well) }
export async function fetchSectionProjectWorkspace() { await wait(180); return demoSectionProjectRepository.get() }
export async function fetchReserveProjectWorkspace() { await wait(180); return demoReserveProjectRepository.get() }
export async function fetchGeologicalModelWorkspace() { await wait(180); return demoGeologicalModelRepository.get() }
export async function fetchDgmWorkspace() { await wait(180); return demoDgmRepository.get() }
export async function saveDgmWorkspace(current: DgmWorkspace, next: DgmWorkspace, eventType: string) { await wait(320); return demoDgmRepository.save(current, next, eventType) }
export async function saveGeologicalModelWorkspace(current: GeologicalModelWorkspace, next: GeologicalModelWorkspace, eventType: string) { await wait(300); return demoGeologicalModelRepository.save(current, next, eventType) }
export async function runGeologicalInterpolations(current: GeologicalModelWorkspace) { await wait(420); return demoGeologicalModelRepository.interpolate(current) }
export async function saveReserveProjectWorkspace(current: ReserveProjectWorkspace, next: ReserveProjectWorkspace, eventType: string) { await wait(300); return demoReserveProjectRepository.save(current, next, eventType) }
export async function runReserveMethods(current: ReserveProjectWorkspace) { await wait(420); return demoReserveProjectRepository.runAll(current) }
export async function saveSectionProjectWorkspace(current: SectionProjectWorkspace, next: SectionProjectWorkspace, eventType: string) { await wait(300); return demoSectionProjectRepository.save(current, next, eventType) }
export async function saveWellOutputWorkspace(wellId: string, current: OutputWorkspace, next: OutputWorkspace, eventType: string) { const well = await demoWellDataRepository.getWell(wellId); await wait(300); return demoWellOutputRepository.save(well, current, next, eventType) }
export async function saveWellInterpretationWorkspace(wellId: string, current: InterpretationWorkspace, next: InterpretationWorkspace, eventType: string) { const well = await demoWellDataRepository.getWell(wellId); await wait(300); return demoWellInterpretationRepository.save(well, current, next, eventType) }
export async function fetchWellLogWorkspace(wellId: string) { const well = await demoWellDataRepository.getWell(wellId); await wait(180); return demoWellLogRepository.get(well) }
export async function saveWellLogWorkspace(wellId: string, current: WellLogWorkspace, next: WellLogWorkspace, eventType: string) { const well = await demoWellDataRepository.getWell(wellId); await wait(280); return demoWellLogRepository.save(well, current, next, eventType) }
export async function beginWellLogImport(wellId: string, current: WellLogWorkspace, source: 'bundled fixture' | 'local demo fixture') { const well = await demoWellDataRepository.getWell(wellId); await wait(280); return demoWellLogRepository.beginImport(well, current, source) }
export async function applyWellLogImport(wellId: string, current: WellLogWorkspace) { const well = await demoWellDataRepository.getWell(wellId); await wait(340); return demoWellLogRepository.applyImport(well, current) }

export async function fetchScientificJobs() {
  await wait(80)
  return demoScientificJobRepository.list()
}

export async function createScientificJob(input: CreateScientificJobInput, idempotencyKey: string) {
  await wait(120)
  return demoScientificJobRepository.create(input, idempotencyKey)
}

export async function pollScientificJob(jobId: string) {
  await wait(100)
  return demoScientificJobRepository.poll(jobId)
}

export async function cancelScientificJob(jobId: string, reason?: string) {
  await wait(100)
  return demoScientificJobRepository.cancel(jobId, reason)
}

export async function retryScientificJob(jobId: string) {
  await wait(100)
  return demoScientificJobRepository.retry(jobId)
}

export async function fetchInterpretationDecision(interpretationId: string): Promise<InterpretationDecision> { return demoGeologyWorkflowRepository.getInterpretation(interpretationId) }
export async function saveInterpretationDecision(interpretationId: string, current: InterpretationDecision, resolution: CompareResolution, reason: string) { return demoGeologyWorkflowRepository.saveInterpretation(interpretationId, current, resolution, reason) }
export async function submitInterpretationDecision(interpretationId: string, current: InterpretationDecision) { return demoGeologyWorkflowRepository.submitInterpretation(interpretationId, current) }
export async function returnInterpretationDecision(interpretationId: string, current: InterpretationDecision) { return demoGeologyWorkflowRepository.returnInterpretation(interpretationId, current) }
export async function approveInterpretationDecision(interpretationId: string, current: InterpretationDecision) { return demoGeologyWorkflowRepository.approveInterpretation(interpretationId, current) }
export async function fetchReserveDraft(): Promise<ReserveDraft> { return demoGeologyWorkflowRepository.getReserves() }
export async function saveReserveDraft(current: ReserveDraft, next: Omit<ReserveDraft, 'revision'>) { return demoGeologyWorkflowRepository.saveReserves('RESERVE-PR-07', current, next) }
export async function fetchDeliveryDraft(): Promise<DeliveryDraft> { return demoGeologyWorkflowRepository.getDelivery() }
export async function saveDeliveryDraft(current: DeliveryDraft, next: Omit<DeliveryDraft, 'revision'>) { return demoGeologyWorkflowRepository.saveDelivery('GEO-PR07-2026-08', current, next) }
export async function fetchGeologyMapWorkspacePreferences(): Promise<GeologyMapWorkspacePreferences> { return demoPreferencesRepository.getGeologyMapWorkspace() }
export async function saveGeologyMapWorkspacePreferences(next: Omit<GeologyMapWorkspacePreferences, 'id' | 'updatedAt'>): Promise<GeologyMapWorkspacePreferences> { return demoPreferencesRepository.saveGeologyMapWorkspace(next) }
export async function fetchWellRegistryPreferences(): Promise<WellRegistryPreferences> { return demoPreferencesRepository.getWellRegistry() }
export async function saveWellRegistryPreferences(next: Omit<WellRegistryPreferences, 'id' | 'updatedAt'>): Promise<WellRegistryPreferences> { return demoPreferencesRepository.saveWellRegistry(next) }
export async function fetchPlatformPreferences(): Promise<PlatformPreferences> { return demoPreferencesRepository.getPlatform() }
export async function savePlatformPreferences(next: Omit<PlatformPreferences, 'id' | 'updatedAt'>): Promise<PlatformPreferences> { return demoPreferencesRepository.savePlatform(next) }
export async function fetchGeologyTourProgress(personaId: string): Promise<GeologyTourProgress> { return demoGeologyTourRepository.get(personaId) }
export async function saveGeologyTourProgress(personaId: string, next: Omit<GeologyTourProgress, 'id' | 'personaId' | 'updatedAt'>): Promise<GeologyTourProgress> { return demoGeologyTourRepository.save(personaId, next) }
export async function fetchGeologyPublicationWorkspace(): Promise<GeologyPublicationWorkspace> { return demoGeologyPublicationRepository.get() }
export async function saveGeologyPublicationWorkspace(current: GeologyPublicationWorkspace, next: GeologyPublicationWorkspace, eventType: string): Promise<GeologyPublicationWorkspace> { return demoGeologyPublicationRepository.save(current, next, eventType) }
export async function clearGeologyPublicationArtifacts(current: GeologyPublicationWorkspace): Promise<GeologyPublicationWorkspace> { return demoGeologyPublicationRepository.clearUserArtifacts(current) }
export async function fetchGeologyHandoffs(consumer: PublicationConsumer) { return demoGeologyPublicationRepository.listHandoffs(consumer) }
export async function fetchMethodologyCenterWorkspace(): Promise<MethodologyCenterWorkspace> { return demoMethodologyCenterRepository.get() }
export async function saveMethodologyCenterWorkspace(current: MethodologyCenterWorkspace, next: MethodologyCenterWorkspace, eventType: string): Promise<MethodologyCenterWorkspace> { return demoMethodologyCenterRepository.save(current, next, eventType) }
export async function fetchDemoAuditEvents(): Promise<AuditEvent[]> {
  const events = await demoDatabase.getAll<AuditEvent>('auditEvents')
  return events.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt) || right.id.localeCompare(left.id))
}

export async function fetchGeologicalMasterData(): Promise<GeologicalMasterData> { return demoGeologyMasterRepository.getMasterData() }
export async function createDeposit(input: CreateDepositInput): Promise<Deposit> { return demoGeologyMasterRepository.createDeposit(input) }
export async function updateDeposit(current: Deposit, patch: UpdateDepositPatch): Promise<Deposit> {
  return demoGeologyMasterRepository.updateDeposit(current, patch)
}
export async function deleteDeposit(current: Deposit): Promise<void> { return demoGeologyMasterRepository.deleteDeposit(current) }
export async function recordDepositViewed(depositId: string, actor: { id: string; name: string }): Promise<void> { return demoGeologyMasterRepository.recordDepositViewed(depositId, actor) }
export async function archiveDeposit(current: Deposit): Promise<Deposit> { return demoGeologyMasterRepository.archiveDeposit(current) }
export async function createSite(input: Pick<GeologicalSite, 'depositId' | 'code' | 'name'>): Promise<GeologicalSite> { return demoGeologyMasterRepository.createSite(input) }
export async function updateSite(current: GeologicalSite, patch: Pick<GeologicalSite, 'name'>): Promise<GeologicalSite> { return demoGeologyMasterRepository.updateSite(current, patch) }
export async function archiveSite(current: GeologicalSite): Promise<GeologicalSite> { return demoGeologyMasterRepository.archiveSite(current) }
export async function createLens(input: Pick<GeologicalLens, 'siteId' | 'code' | 'name'>): Promise<GeologicalLens> { return demoGeologyMasterRepository.createLens(input) }
export async function updateLens(current: GeologicalLens, patch: Pick<GeologicalLens, 'name'>): Promise<GeologicalLens> { return demoGeologyMasterRepository.updateLens(current, patch) }
export async function archiveLens(current: GeologicalLens): Promise<GeologicalLens> { return demoGeologyMasterRepository.archiveLens(current) }export async function createConditionSetVersion(source: ConditionSet): Promise<ConditionSet> { return demoGeologyMasterRepository.createConditionSetVersion(source) }
export async function saveConditionSet(current: ConditionSet, patch: Omit<ConditionSet, 'id' | 'siteId' | 'code' | 'version' | 'status'>): Promise<ConditionSet> { return demoGeologyMasterRepository.saveConditionSet(current, patch) }
export async function approveConditionSet(current: ConditionSet): Promise<ConditionSet> { return demoGeologyMasterRepository.approveConditionSet(current) }
export async function publishConditionSet(current: ConditionSet): Promise<ConditionSet> { return demoGeologyMasterRepository.publishConditionSet(current) }
export async function fetchWellMasterWorkspace(wellId: string): Promise<WellMasterWorkspace> { return demoWellMasterRepository.getWorkspace(await demoWellDataRepository.getWell(wellId)) }
export async function createWellMasterDraft(wellId: string, current: WellMasterWorkspace): Promise<WellMasterWorkspace> { return demoWellMasterRepository.createDraft(await demoWellDataRepository.getWell(wellId), current) }
export async function saveWellAssignment(wellId: string, current: WellMasterWorkspace, assignment: WellAssignment): Promise<WellMasterWorkspace> { return demoWellMasterRepository.saveAssignment(await demoWellDataRepository.getWell(wellId), current, assignment) }
export async function saveWellMasterAggregate(wellId: string, current: WellMasterWorkspace, kind: WellMasterAggregateKind, data: WellMasterAggregateData): Promise<WellMasterWorkspace> { return demoWellMasterRepository.saveAggregate(await demoWellDataRepository.getWell(wellId), current, kind, data) }
export async function transitionWellWorkflow(wellId: string, current: WellMasterWorkspace, action: 'submit' | 'return' | 'approve' | 'publish' | 'archive', reason?: string): Promise<WellMasterWorkspace> { return demoWellMasterRepository.transitionWorkflow(await demoWellDataRepository.getWell(wellId), current, action, reason) }
export async function fetchHomeSummary() {
  await wait(220)
  return {
    tasks: [
      { id: 'TASK-118', title: 'Разрешить расхождение AI', object: 'WELL-1042', due: 'Сегодня · 14:00', tone: 'warning' as const },
      { id: 'TASK-121', title: 'Проверить набор ГИС', object: 'WELL-1046', due: 'Сегодня · 17:30', tone: 'info' as const },
      { id: 'TASK-109', title: 'Дополнить литологический интервал', object: 'WELL-1019', due: 'Просрочено на 1 день', tone: 'danger' as const },
    ],
  }
}
